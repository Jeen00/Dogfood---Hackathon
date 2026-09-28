'use strict';
const express = require('express');
const { getDb } = require('../db/db');
const requireRole = require('../middleware/requireRole');
const { createNotification, getUnreadCount, getNotifications } = require('../lib/notifications');

const router = express.Router();

/* ─────────────────────────────────────────────────────────────
   NOTIFICATION ENDPOINTS (all roles)
   ───────────────────────────────────────────────────────────── */

/**
 * GET /api/notifications
 * Returns the current user's notifications.
 */
router.get('/notifications', (req, res) => {
  if (!req.session?.userId) return res.status(401).json({ error: 'Unauthorized' });
  const notifications = getNotifications(req.session.userId);
  const unread = notifications.filter(n => !n.read).length;
  return res.json({ notifications, unread });
});

/**
 * POST /api/notifications/:id/read
 * Marks a notification as read.
 */
router.post('/notifications/:id/read', (req, res) => {
  if (!req.session?.userId) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const db = getDb();
    db.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?')
      .run(req.params.id, req.session.userId);
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/notifications/read-all
 * Marks all notifications as read for current user.
 */
router.post('/notifications/read-all', (req, res) => {
  if (!req.session?.userId) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const db = getDb();
    db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(req.session.userId);
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/notifications/poll
 * Lightweight poll endpoint — returns unread count.
 * Used by the bell icon to check for new notifications every few seconds.
 */
router.get('/notifications/poll', (req, res) => {
  if (!req.session?.userId) return res.json({ unread: 0 });
  const unread = getUnreadCount(req.session.userId);
  return res.json({ unread });
});

/* ─────────────────────────────────────────────────────────────
   ORGANIZER: INVITE JUDGES
   ───────────────────────────────────────────────────────────── */

/**
 * POST /api/invites
 * Organizer sends a judge invite by email.
 * Body: { event_id, judge_email }
 *
 * Rules:
 *  - Only works up to 6 hours BEFORE the event's submissions_open
 *  - Cannot invite after submissions_open has passed
 */
router.post('/invites', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const { event_id, judge_email } = req.body;

    if (!event_id || !judge_email) {
      return res.status(400).json({ error: 'event_id and judge_email are required' });
    }

    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(event_id);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    // Timing gate: can only invite up to 6h before submissions_open, and NOT after it starts
    const now = new Date();
    if (event.submissions_open) {
      const open = new Date(event.submissions_open);
      const sixHoursBefore = new Date(open.getTime() - 6 * 60 * 60 * 1000);
      if (now >= open) {
        return res.status(400).json({ error: 'Cannot invite judges after the hackathon has started.' });
      }
      if (now >= sixHoursBefore) {
        return res.status(400).json({ error: 'Judge invites can only be sent up to 6 hours before the hackathon begins.' });
      }
    }

    const normalizedEmail = judge_email.trim().toLowerCase();

    // 1. Look up user by exact email
    let judgeUser = db.prepare("SELECT * FROM users WHERE LOWER(email) = ?").get(normalizedEmail);

    // 2. If not found, fuzzy match against existing judges (e.g. thomas.varga vs tomas.varga)
    if (!judgeUser) {
      const cleanInput = normalizedEmail.split('@')[0].replace(/[^a-z0-9]/g, '');
      const judges = db.prepare("SELECT * FROM users WHERE role = 'judge'").all();
      for (const j of judges) {
        const jClean = j.email.toLowerCase().split('@')[0].replace(/[^a-z0-9]/g, '');
        const jNameClean = j.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (
          jClean === cleanInput ||
          jClean.replace(/h/g, '') === cleanInput.replace(/h/g, '') ||
          jNameClean.replace(/\s+/g, '') === cleanInput ||
          jNameClean.replace(/[\s+h]/g, '') === cleanInput.replace(/h/g, '')
        ) {
          judgeUser = j;
          break;
        }
      }
    }

    // 3. If still not found, auto-create a judge account so they can log in and view invites
    if (!judgeUser) {
      const newJudgeId = `jdg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const defaultName = normalizedEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      db.prepare("INSERT INTO users (id, name, email, role, password_hash) VALUES (?, ?, ?, 'judge', NULL)")
        .run(newJudgeId, defaultName, normalizedEmail);
      judgeUser = db.prepare("SELECT * FROM users WHERE id = ?").get(newJudgeId);
    }

    // The effective email to associate
    const targetEmail = judgeUser ? judgeUser.email.toLowerCase() : normalizedEmail;

    // Check for duplicate invite
    const existing = db.prepare('SELECT * FROM judge_invites WHERE event_id = ? AND (LOWER(judge_email) = ? OR judge_id = ?)')
      .get(event_id, targetEmail, judgeUser?.id || '');

    if (existing) {
      if (existing.status === 'rejected') {
        // Allow re-invite if previously rejected
        db.prepare("UPDATE judge_invites SET status = 'pending', responded_at = NULL, judge_id = ?, judge_email = ? WHERE id = ?")
          .run(judgeUser.id, targetEmail, existing.id);
      } else {
        return res.status(409).json({ error: `An invite for ${judgeUser.name} (${targetEmail}) already exists (status: ${existing.status}).` });
      }
    } else {
      const inviteId = `inv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const nowStr = now.toISOString();
      db.prepare(
        'INSERT INTO judge_invites (id, event_id, organizer_id, judge_email, judge_id, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(inviteId, event_id, req.session.userId, targetEmail, judgeUser.id, 'pending', nowStr);
    }

    // Always create notification for the judge
    const organizer = db.prepare('SELECT name FROM users WHERE id = ?').get(req.session.userId);
    createNotification(
      judgeUser.id,
      'judge_invite',
      `Invite: ${event.name}`,
      `${organizer?.name || 'An organizer'} has invited you to judge "${event.name}".`,
      { event_id, event_name: event.name, organizer_name: organizer?.name }
    );

    return res.status(201).json({
      message: `Invite sent to ${judgeUser.name} (${targetEmail})`,
      judge_found: true
    });
  } catch (err) {
    console.error('[invites POST] Error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/invites?event_id=
 * Organizer views all invites for an event.
 */
router.get('/invites', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const { event_id } = req.query;
    if (!event_id) return res.status(400).json({ error: 'event_id is required' });

    const invites = db.prepare(`
      SELECT ji.*,
        u.name AS judge_name
      FROM judge_invites ji
      LEFT JOIN users u ON u.id = ji.judge_id
      WHERE ji.event_id = ?
      ORDER BY ji.created_at DESC
    `).all(event_id);

    return res.json({ invites });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/invites/:id
 * Organizer cancels a pending invite.
 */
router.delete('/invites/:id', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const invite = db.prepare('SELECT * FROM judge_invites WHERE id = ?').get(req.params.id);
    if (!invite) return res.status(404).json({ error: 'Invite not found' });
    if (invite.organizer_id !== req.session.userId) return res.status(403).json({ error: 'Forbidden' });
    db.prepare('DELETE FROM judge_invites WHERE id = ?').run(req.params.id);
    return res.json({ message: 'Invite cancelled' });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/* ─────────────────────────────────────────────────────────────
   JUDGE: VIEW & RESPOND TO INVITES
   ───────────────────────────────────────────────────────────── */

/**
 * GET /api/judge-invites
 * Judge views all their pending invites.
 */
router.get('/judge-invites', requireRole('judge'), (req, res) => {
  try {
    const db = getDb();
    const judgeId = req.session.userId;
    const judgeEmail = db.prepare('SELECT email FROM users WHERE id = ?').get(judgeId)?.email?.toLowerCase();

    const invites = db.prepare(`
      SELECT ji.*,
        e.name AS event_name,
        e.submissions_open,
        e.submissions_close,
        COALESCE(u.name, 'Organizer') AS organizer_name
      FROM judge_invites ji
      JOIN events e ON e.id = ji.event_id
      LEFT JOIN users  u ON u.id = ji.organizer_id
      WHERE (
        ji.judge_id = ?
        OR LOWER(ji.judge_email) = ?
        OR LOWER(REPLACE(ji.judge_email, 'h', '')) = LOWER(REPLACE(?, 'h', ''))
      )
      ORDER BY ji.created_at DESC
    `).all(judgeId, judgeEmail || '', judgeEmail || '');

    return res.json({ invites });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/judge-invites/:id/accept
 * Judge accepts an invite.
 */
router.post('/judge-invites/:id/accept', requireRole('judge'), (req, res) => {
  try {
    const db = getDb();
    const judgeId = req.session.userId;
    const judgeEmail = db.prepare('SELECT email FROM users WHERE id = ?').get(judgeId)?.email?.toLowerCase();

    const invite = db.prepare(`
      SELECT ji.*, e.name AS event_name, COALESCE(u.name, 'Organizer') AS organizer_name
      FROM judge_invites ji
      JOIN events e ON e.id = ji.event_id
      LEFT JOIN users  u ON u.id = ji.organizer_id
      WHERE ji.id = ? AND (
        ji.judge_id = ?
        OR LOWER(ji.judge_email) = ?
        OR LOWER(REPLACE(ji.judge_email, 'h', '')) = LOWER(REPLACE(?, 'h', ''))
      )
    `).get(req.params.id, judgeId, judgeEmail || '', judgeEmail || '');

    if (!invite) return res.status(404).json({ error: 'Invite not found' });
    if (invite.status !== 'pending') return res.status(409).json({ error: `Invite already ${invite.status}` });

    const now = new Date().toISOString();
    db.prepare("UPDATE judge_invites SET status = 'accepted', judge_id = ?, responded_at = ? WHERE id = ?")
      .run(judgeId, now, invite.id);

    // Link judge_email to judge user if not already
    db.prepare("UPDATE judge_invites SET judge_id = ? WHERE id = ?").run(judgeId, invite.id);

    // Add judge to judge_tracks for the event if any tracks exist
    const tracks = db.prepare('SELECT id FROM tracks WHERE event_id = ?').all(invite.event_id);
    const insertJT = db.prepare('INSERT OR IGNORE INTO judge_tracks (judge_id, track_id) VALUES (?, ?)');
    for (const t of tracks) insertJT.run(judgeId, t.id);

    const judge = db.prepare('SELECT name FROM users WHERE id = ?').get(judgeId);

    // Notify organizer
    createNotification(
      invite.organizer_id,
      'invite_accepted',
      `Judge Accepted: ${invite.event_name}`,
      `${judge?.name || 'A judge'} accepted your invite to judge "${invite.event_name}".`,
      { event_id: invite.event_id, judge_name: judge?.name, event_name: invite.event_name }
    );

    return res.json({ message: 'Invite accepted' });
  } catch (err) {
    console.error('[judge-invites:accept] Error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/judge-invites/:id/reject
 * Judge rejects an invite.
 */
router.post('/judge-invites/:id/reject', requireRole('judge'), (req, res) => {
  try {
    const db = getDb();
    const judgeId = req.session.userId;
    const judgeEmail = db.prepare('SELECT email FROM users WHERE id = ?').get(judgeId)?.email?.toLowerCase();

    const invite = db.prepare(`
      SELECT ji.*, e.name AS event_name, COALESCE(u.name, 'Organizer') AS organizer_name
      FROM judge_invites ji
      JOIN events e ON e.id = ji.event_id
      LEFT JOIN users  u ON u.id = ji.organizer_id
      WHERE ji.id = ? AND (
        ji.judge_id = ?
        OR LOWER(ji.judge_email) = ?
        OR LOWER(REPLACE(ji.judge_email, 'h', '')) = LOWER(REPLACE(?, 'h', ''))
      )
    `).get(req.params.id, judgeId, judgeEmail || '', judgeEmail || '');

    if (!invite) return res.status(404).json({ error: 'Invite not found' });
    if (invite.status !== 'pending') return res.status(409).json({ error: `Invite already ${invite.status}` });

    const now = new Date().toISOString();
    db.prepare("UPDATE judge_invites SET status = 'rejected', responded_at = ? WHERE id = ?")
      .run(now, invite.id);

    const judge = db.prepare('SELECT name FROM users WHERE id = ?').get(judgeId);

    // Notify organizer
    createNotification(
      invite.organizer_id,
      'invite_rejected',
      `Judge Declined: ${invite.event_name}`,
      `${judge?.name || 'A judge'} declined your invite to judge "${invite.event_name}".`,
      { event_id: invite.event_id, judge_name: judge?.name, event_name: invite.event_name }
    );

    return res.json({ message: 'Invite rejected' });
  } catch (err) {
    console.error('[judge-invites:reject] Error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
