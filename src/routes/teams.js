'use strict';
const express = require('express');
const { getDb } = require('../db/db');
const requireRole = require('../middleware/requireRole');
const { ACTIVE_EVENT_ID } = require('../lib/config');
const { getEventStatus } = require('../lib/event-status');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isHtmlForm(req) {
  const ct = req.headers['content-type'] || '';
  if (ct.includes('application/x-www-form-urlencoded')) return true;
  if (req.is('json')) return false;
  const accept = req.headers['accept'] || '';
  if (accept.includes('application/json')) return false;
  return Boolean(req.accepts('html'));
}

function redirect(res, path, type, msg) {
  return res.redirect(`${path}${path.includes('?') ? '&' : '?'}${type}=${encodeURIComponent(msg)}`);
}

/** Resolve a user by email or user ID string */
function resolveUser(db, emailOrId) {
  return db.prepare('SELECT * FROM users WHERE LOWER(email) = ? OR id = ?')
    .get((emailOrId || '').toLowerCase(), emailOrId || '');
}

/**
 * Helper to resolve currently active hackathon context for participant.
 */
function resolveSelectedParticipantEvent(db, req) {
  const eventId = req.query.event_id || req.session?.selectedParticipantEventId || ACTIVE_EVENT_ID;
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId) ||
                db.prepare('SELECT * FROM events ORDER BY id ASC LIMIT 1').get();
  if (req.session && event) {
    req.session.selectedParticipantEventId = event.id;
  }
  return event;
}

// ─── GET /team/events ── Hackathons Overview for Participant ──────────────────

/**
 * GET /team/events
 * Shows all hackathons for participant, countdowns, team status, and pending invites.
 * Clears active event context so participant is at the top level.
 */
router.get('/events', requireRole('participant'), (req, res) => {
  try {
    const db     = getDb();
    const userId = req.session.userId;

    if (req.session) {
      req.session.selectedParticipantEventId = null;
    }
    res.locals.selectedParticipantEvent = null;

    const rawEvents = db.prepare('SELECT * FROM events ORDER BY submissions_open DESC').all();

    const events = rawEvents.map(evt => {
      const statusInfo = getEventStatus(evt);
      const team = db.prepare(`
        SELECT t.*, u.name AS leader_name
        FROM teams t
        JOIN team_members tm ON tm.team_id = t.id
        LEFT JOIN users u ON u.id = t.leader_id
        WHERE tm.user_id = ? AND t.event_id = ?
      `).get(userId, evt.id);

      let memberCount = 0;
      let project = null;
      if (team) {
        memberCount = db.prepare('SELECT COUNT(*) AS c FROM team_members WHERE team_id = ?').get(team.id)?.c || 0;
        project = db.prepare('SELECT id, title, status FROM projects WHERE team_id = ? AND event_id = ?').get(team.id, evt.id);
      }

      const trackCount = db.prepare('SELECT COUNT(*) AS c FROM tracks WHERE event_id = ?').get(evt.id)?.c || 0;

      return {
        ...evt,
        statusInfo,
        userTeam: team ? {
          ...team,
          memberCount,
          isLeader: team.leader_id === userId,
          project
        } : null,
        trackCount
      };
    });

    const pendingInvites = db.prepare(`
      SELECT ti.*, t.name AS team_name, e.name AS event_name, e.id AS event_id,
             u.name AS inviter_name, u.email AS inviter_email
      FROM team_invitations ti
      JOIN teams t ON t.id = ti.team_id
      JOIN events e ON e.id = t.event_id
      JOIN users u ON u.id = ti.inviter_id
      WHERE ti.invitee_id = ? AND ti.status = 'pending'
      ORDER BY ti.created_at DESC
    `).all(userId);

    return res.render('participant/events', {
      events,
      pendingInvites,
      session: req.session,
      selectedParticipantEvent: null,
      error:   req.query.error   || null,
      success: req.query.success || null,
      info:    req.query.info    || null
    });
  } catch (err) {
    console.error('[participant:events] Error:', err.message);
    return res.status(500).render('error', { message: 'Failed to load hackathons.', session: req.session });
  }
});

// ─── GET /team ─────────────────────────────────────────────────────────────

/**
 * GET /team
 * Render the team management page for the current participant scoped to selected hackathon.
 */
router.get('/', requireRole('participant'), (req, res) => {
  try {
    const db     = getDb();
    const userId = req.session.userId;
    const selectedEvent = resolveSelectedParticipantEvent(db, req);
    res.locals.selectedParticipantEvent = selectedEvent;

    const eventId = selectedEvent ? selectedEvent.id : ACTIVE_EVENT_ID;
    const statusInfo = selectedEvent ? getEventStatus(selectedEvent) : null;

    // Teams the user is a member of for THIS event
    const teams = db.prepare(`
      SELECT t.*,
             u.name  AS leader_name,
             u.email AS leader_email
      FROM teams t
      JOIN team_members tm ON tm.team_id = t.id AND tm.user_id = ?
      LEFT JOIN users u ON u.id = t.leader_id
      WHERE t.event_id = ?
    `).all(userId, eventId);

    for (const team of teams) {
      team.members = db.prepare(`
        SELECT u.id, u.name, u.email
        FROM team_members tm
        JOIN users u ON u.id = tm.user_id
        WHERE tm.team_id = ?
      `).all(team.id);
      team.isLeader = team.leader_id === userId;

      // Pending invitations this user sent for this team
      team.pendingInvites = db.prepare(`
        SELECT ti.*, u.name AS invitee_name, u.email AS invitee_email
        FROM team_invitations ti
        JOIN users u ON u.id = ti.invitee_id
        WHERE ti.team_id = ? AND ti.inviter_id = ? AND ti.status = 'pending'
      `).all(team.id, userId);

      // Project submitted by this team in this event
      team.project = db.prepare(`
        SELECT p.*, tr.name AS track_name
        FROM projects p
        LEFT JOIN tracks tr ON tr.id = p.track_id
        WHERE p.team_id = ? AND p.event_id = ?
      `).get(team.id, eventId);
    }

    // Invitations waiting for this user to accept
    const myInvitations = db.prepare(`
      SELECT ti.*, t.name AS team_name, e.name AS event_name, e.id AS event_id,
             u.name AS inviter_name, u.email AS inviter_email
      FROM team_invitations ti
      JOIN teams t ON t.id = ti.team_id
      JOIN events e ON e.id = t.event_id
      JOIN users u ON u.id = ti.inviter_id
      WHERE ti.invitee_id = ? AND ti.status = 'pending'
      ORDER BY ti.created_at DESC
    `).all(userId);

    // All participant users (for invite dropdown/search)
    const allParticipants = db.prepare(
      "SELECT id, name, email FROM users WHERE role = 'participant' AND id != ?"
    ).all(userId);

    return res.render('team', {
      teams,
      myInvitations,
      allParticipants,
      eventId,
      selectedEvent,
      statusInfo,
      selectedParticipantEvent: selectedEvent,
      session: req.session,
      error:   req.query.error   || null,
      success: req.query.success || null,
      info:    req.query.info    || null
    });
  } catch (err) {
    console.error('[teams:page] Error:', err.message);
    return res.status(500).render('error', { message: 'Failed to load team page.', session: req.session });
  }
});

// ─── POST /team ── Create team ─────────────────────────────────────────────

/**
 * POST /team
 * Create a new team scoped to an event.
 */
router.post('/', requireRole('participant'), (req, res) => {
  try {
    const db      = getDb();
    const name    = (req.body.name || '').trim();
    const eventId = (req.body.event_id || req.session?.selectedParticipantEventId || ACTIVE_EVENT_ID).trim();

    if (!name) {
      if (isHtmlForm(req)) return redirect(res, `/team?event_id=${eventId}`, 'error', 'Team name is required');
      return res.status(400).json({ error: 'name is required' });
    }

    const id          = `tm_${Date.now()}`;
    const invite_code = `INV-${uuidv4().slice(0, 8).toUpperCase()}`;
    const userId      = req.session.userId;

    db.prepare('INSERT INTO teams (id, event_id, name, invite_code, leader_id) VALUES (?, ?, ?, ?, ?)')
      .run(id, eventId, name, invite_code, userId);
    db.prepare('INSERT INTO team_members (team_id, user_id) VALUES (?, ?)').run(id, userId);

    const now = new Date().toISOString();
    db.prepare('INSERT INTO audit_log (id, actor_id, action, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(`al_${Date.now()}`, userId, 'team_created', id, name, now);

    if (isHtmlForm(req)) return redirect(res, `/team?event_id=${eventId}`, 'success', `Team "${name}" created! Invite code: ${invite_code}`);
    return res.status(201).json({ message: 'Team created', id, invite_code, event_id: eventId });
  } catch (err) {
    console.error('[teams POST] Error:', err.message);
    if (isHtmlForm(req)) return redirect(res, '/team', 'error', 'Failed to create team.');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Invite member ──────────────────────────────────────────────────────────

/**
 * POST /team/:teamId/invite
 * Leader invites a participant by email. Creates a pending invitation.
 */
router.post('/:teamId/invite', requireRole('participant'), (req, res) => {
  try {
    const db     = getDb();
    const userId = req.session.userId;
    const { teamId } = req.params;
    const email  = (req.body.email || '').trim().toLowerCase();

    const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId);
    if (!team) {
      if (isHtmlForm(req)) return redirect(res, '/team', 'error', 'Team not found.');
      return res.status(404).json({ error: 'Team not found' });
    }
    if (team.leader_id !== userId) {
      if (isHtmlForm(req)) return redirect(res, `/team?event_id=${team.event_id}`, 'error', 'Only the team leader can invite members.');
      return res.status(403).json({ error: 'Only the team leader can invite members' });
    }

    const invitee = db.prepare("SELECT * FROM users WHERE LOWER(email) = ? AND role = 'participant'").get(email);
    if (!invitee) {
      if (isHtmlForm(req)) return redirect(res, `/team?event_id=${team.event_id}`, 'error', `No participant found with email "${email}".`);
      return res.status(404).json({ error: 'Participant not found' });
    }

    const alreadyMember = db.prepare('SELECT 1 FROM team_members WHERE team_id = ? AND user_id = ?').get(teamId, invitee.id);
    if (alreadyMember) {
      if (isHtmlForm(req)) return redirect(res, `/team?event_id=${team.event_id}`, 'info', `${invitee.name} is already a member.`);
      return res.status(409).json({ error: 'Already a member' });
    }

    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO team_invitations (id, team_id, invitee_id, inviter_id, status, created_at)
      VALUES (?, ?, ?, ?, 'pending', ?)
      ON CONFLICT(team_id, invitee_id) DO UPDATE SET status='pending', inviter_id=excluded.inviter_id, created_at=excluded.created_at
    `).run(`inv_${Date.now()}`, teamId, invitee.id, userId, now);

    db.prepare('INSERT INTO audit_log (id, actor_id, action, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(`al_${Date.now()}`, userId, 'member_invited', teamId, invitee.email, now);

    if (isHtmlForm(req)) return redirect(res, `/team?event_id=${team.event_id}`, 'success', `Invitation sent to ${invitee.name} (${invitee.email}).`);
    return res.status(200).json({ message: 'Invitation sent', invitee_id: invitee.id });
  } catch (err) {
    console.error('[teams:invite] Error:', err.message);
    if (isHtmlForm(req)) return redirect(res, '/team', 'error', 'Failed to send invitation.');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Accept invitation ──────────────────────────────────────────────────────

/**
 * POST /team/invitation/:invitationId/accept
 * Invitee accepts a pending invitation and joins the team.
 */
router.post('/invitation/:invitationId/accept', requireRole('participant'), (req, res) => {
  try {
    const db     = getDb();
    const userId = req.session.userId;
    const { invitationId } = req.params;

    const inv = db.prepare('SELECT * FROM team_invitations WHERE id = ?').get(invitationId);
    if (!inv || inv.invitee_id !== userId) {
      if (isHtmlForm(req)) return redirect(res, '/team', 'error', 'Invitation not found.');
      return res.status(404).json({ error: 'Invitation not found' });
    }
    if (inv.status !== 'pending') {
      if (isHtmlForm(req)) return redirect(res, '/team', 'info', 'This invitation has already been actioned.');
      return res.status(409).json({ error: 'Invitation already actioned' });
    }

    db.prepare("UPDATE team_invitations SET status = 'accepted' WHERE id = ?").run(invitationId);

    try {
      db.prepare('INSERT INTO team_members (team_id, user_id) VALUES (?, ?)').run(inv.team_id, userId);
    } catch (_) { /* already a member */ }

    const now = new Date().toISOString();
    db.prepare('INSERT INTO audit_log (id, actor_id, action, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(`al_${Date.now()}`, userId, 'invitation_accepted', inv.team_id, invitationId, now);

    const team = db.prepare('SELECT name, event_id FROM teams WHERE id = ?').get(inv.team_id);
    if (isHtmlForm(req)) return redirect(res, `/team?event_id=${team ? team.event_id : ''}`, 'success', `You joined team "${team ? team.name : inv.team_id}"!`);
    return res.status(200).json({ message: 'Joined team', team_id: inv.team_id, event_id: team ? team.event_id : '' });
  } catch (err) {
    console.error('[teams:accept] Error:', err.message);
    if (isHtmlForm(req)) return redirect(res, '/team', 'error', 'Failed to accept invitation.');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Decline invitation ─────────────────────────────────────────────────────

/**
 * POST /team/invitation/:invitationId/decline
 */
router.post('/invitation/:invitationId/decline', requireRole('participant'), (req, res) => {
  try {
    const db     = getDb();
    const userId = req.session.userId;
    const { invitationId } = req.params;

    const inv = db.prepare('SELECT * FROM team_invitations WHERE id = ?').get(invitationId);
    if (!inv || inv.invitee_id !== userId) {
      if (isHtmlForm(req)) return redirect(res, '/team', 'error', 'Invitation not found.');
      return res.status(404).json({ error: 'Invitation not found' });
    }

    db.prepare("UPDATE team_invitations SET status = 'declined' WHERE id = ?").run(invitationId);

    if (isHtmlForm(req)) return redirect(res, '/team/events', 'info', 'Invitation declined.');
    return res.status(200).json({ message: 'Invitation declined' });
  } catch (err) {
    console.error('[teams:decline] Error:', err.message);
    if (isHtmlForm(req)) return redirect(res, '/team', 'error', 'Failed to decline invitation.');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Remove member ──────────────────────────────────────────────────────────

/**
 * POST /team/:teamId/remove/:memberId
 * Leader removes a member (cannot remove self).
 */
router.post('/:teamId/remove/:memberId', requireRole('participant'), (req, res) => {
  try {
    const db     = getDb();
    const userId = req.session.userId;
    const { teamId, memberId } = req.params;

    const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId);
    if (!team) {
      if (isHtmlForm(req)) return redirect(res, '/team', 'error', 'Team not found.');
      return res.status(404).json({ error: 'Team not found' });
    }
    if (team.leader_id !== userId) {
      if (isHtmlForm(req)) return redirect(res, `/team?event_id=${team.event_id}`, 'error', 'Only the team leader can remove members.');
      return res.status(403).json({ error: 'Only the team leader can remove members' });
    }
    if (memberId === userId) {
      if (isHtmlForm(req)) return redirect(res, `/team?event_id=${team.event_id}`, 'error', 'You cannot remove yourself. Use "Leave Team" instead.');
      return res.status(400).json({ error: 'Cannot remove yourself' });
    }

    const result = db.prepare('DELETE FROM team_members WHERE team_id = ? AND user_id = ?').run(teamId, memberId);
    if (result.changes === 0) {
      if (isHtmlForm(req)) return redirect(res, `/team?event_id=${team.event_id}`, 'error', 'Member not found in this team.');
      return res.status(404).json({ error: 'Member not found' });
    }

    const now = new Date().toISOString();
    db.prepare('INSERT INTO audit_log (id, actor_id, action, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(`al_${Date.now()}`, userId, 'member_removed', teamId, memberId, now);

    if (isHtmlForm(req)) return redirect(res, `/team?event_id=${team.event_id}`, 'success', 'Member removed from team.');
    return res.status(200).json({ message: 'Member removed' });
  } catch (err) {
    console.error('[teams:remove] Error:', err.message);
    if (isHtmlForm(req)) return redirect(res, '/team', 'error', 'Failed to remove member.');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Change team leader ─────────────────────────────────────────────────────

/**
 * POST /team/:teamId/leader
 * Current leader transfers leadership to another member.
 */
router.post('/:teamId/leader', requireRole('participant'), (req, res) => {
  try {
    const db       = getDb();
    const userId   = req.session.userId;
    const { teamId } = req.params;
    const newLeaderId = (req.body.new_leader_id || '').trim();

    const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId);
    if (!team) {
      if (isHtmlForm(req)) return redirect(res, '/team', 'error', 'Team not found.');
      return res.status(404).json({ error: 'Team not found' });
    }
    if (team.leader_id !== userId) {
      if (isHtmlForm(req)) return redirect(res, `/team?event_id=${team.event_id}`, 'error', 'Only the current leader can transfer leadership.');
      return res.status(403).json({ error: 'Only the current leader can transfer leadership' });
    }
    if (!newLeaderId || newLeaderId === userId) {
      if (isHtmlForm(req)) return redirect(res, `/team?event_id=${team.event_id}`, 'error', 'Please select a different member to become leader.');
      return res.status(400).json({ error: 'Invalid new leader' });
    }

    const isMember = db.prepare('SELECT 1 FROM team_members WHERE team_id = ? AND user_id = ?').get(teamId, newLeaderId);
    if (!isMember) {
      if (isHtmlForm(req)) return redirect(res, `/team?event_id=${team.event_id}`, 'error', 'That user is not a member of this team.');
      return res.status(400).json({ error: 'User is not a team member' });
    }

    db.prepare('UPDATE teams SET leader_id = ? WHERE id = ?').run(newLeaderId, teamId);

    const now = new Date().toISOString();
    db.prepare('INSERT INTO audit_log (id, actor_id, action, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(`al_${Date.now()}`, userId, 'leader_changed', teamId, newLeaderId, now);

    const newLeader = db.prepare('SELECT name FROM users WHERE id = ?').get(newLeaderId);
    if (isHtmlForm(req)) return redirect(res, `/team?event_id=${team.event_id}`, 'success', `Leadership transferred to ${newLeader ? newLeader.name : newLeaderId}.`);
    return res.status(200).json({ message: 'Leadership transferred', new_leader_id: newLeaderId });
  } catch (err) {
    console.error('[teams:leader] Error:', err.message);
    if (isHtmlForm(req)) return redirect(res, '/team', 'error', 'Failed to change team leader.');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Leave team ─────────────────────────────────────────────────────────────

/**
 * POST /team/:teamId/leave
 * Current user leaves the team. If they are the leader, leadership is auto-transferred
 * to another member (alphabetically by name). If last member, team is deleted.
 */
router.post('/:teamId/leave', requireRole('participant'), (req, res) => {
  try {
    const db     = getDb();
    const userId = req.session.userId;
    const { teamId } = req.params;

    const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId);
    if (!team) {
      if (isHtmlForm(req)) return redirect(res, '/team', 'error', 'Team not found.');
      return res.status(404).json({ error: 'Team not found' });
    }

    const isMember = db.prepare('SELECT 1 FROM team_members WHERE team_id = ? AND user_id = ?').get(teamId, userId);
    if (!isMember) {
      if (isHtmlForm(req)) return redirect(res, `/team?event_id=${team.event_id}`, 'error', 'You are not a member of this team.');
      return res.status(400).json({ error: 'Not a member of this team' });
    }

    db.prepare('DELETE FROM team_members WHERE team_id = ? AND user_id = ?').run(teamId, userId);

    const remaining = db.prepare(`
      SELECT tm.user_id FROM team_members tm
      JOIN users u ON u.id = tm.user_id
      WHERE tm.team_id = ?
      ORDER BY u.name ASC
    `).all(teamId);

    const now = new Date().toISOString();

    if (remaining.length === 0) {
      // No one left — delete the team
      db.prepare('DELETE FROM teams WHERE id = ?').run(teamId);
      db.prepare('INSERT INTO audit_log (id, actor_id, action, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(`al_${Date.now()}`, userId, 'team_deleted', teamId, 'last member left', now);
      if (isHtmlForm(req)) return redirect(res, `/team?event_id=${team.event_id}`, 'info', `You left and team "${team.name}" was disbanded (no members left).`);
      return res.status(200).json({ message: 'Left team; team disbanded' });
    }

    // If the leaver was the leader, auto-transfer to first remaining member
    if (team.leader_id === userId) {
      const newLeaderId = remaining[0].user_id;
      db.prepare('UPDATE teams SET leader_id = ? WHERE id = ?').run(newLeaderId, teamId);
      db.prepare('INSERT INTO audit_log (id, actor_id, action, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(`al_${Date.now()}`, userId, 'leader_auto_changed', teamId, newLeaderId, now);
    }

    db.prepare('INSERT INTO audit_log (id, actor_id, action, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(`al_${Date.now()}`, userId, 'team_left', teamId, team.name, now);

    if (isHtmlForm(req)) return redirect(res, `/team?event_id=${team.event_id}`, 'success', `You left team "${team.name}".`);
    return res.status(200).json({ message: 'Left team' });
  } catch (err) {
    console.error('[teams:leave] Error:', err.message);
    if (isHtmlForm(req)) return redirect(res, '/team', 'error', 'Failed to leave team.');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Join via invite code ────────────────────────────────────────────────────

router.get('/invite', (req, res) => res.render('invite', { session: req.session, error: null }));

router.post('/join', requireRole('participant'), (req, res) => {
  const code = (req.body.code || '').trim().toUpperCase();
  if (!code) return res.render('invite', { session: req.session, error: 'Please enter an invite code.' });
  return handleJoinTeam(code, req, res);
});

router.get('/join/:code', requireRole('participant'), (req, res) => {
  return handleJoinTeam(req.params.code.trim().toUpperCase(), req, res);
});

router.post('/join/:code', requireRole('participant'), (req, res) => {
  return handleJoinTeam(req.params.code.trim().toUpperCase(), req, res);
});

function handleJoinTeam(code, req, res) {
  try {
    const db   = getDb();
    const team = db.prepare('SELECT * FROM teams WHERE UPPER(invite_code) = ?').get(code);
    if (!team) {
      if (isHtmlForm(req)) return res.render('invite', { session: req.session, error: `Invalid invite code: "${code}"` });
      return res.status(404).json({ error: 'Invalid invite code' });
    }

    const userId  = req.session.userId;
    const existing = db.prepare('SELECT 1 FROM team_members WHERE team_id = ? AND user_id = ?').get(team.id, userId);
    if (existing) {
      if (isHtmlForm(req)) return redirect(res, `/team?event_id=${team.event_id}`, 'info', `You are already a member of "${team.name}".`);
      return res.status(409).json({ error: 'Already a member of this team' });
    }

    db.prepare('INSERT INTO team_members (team_id, user_id) VALUES (?, ?)').run(team.id, userId);

    const now = new Date().toISOString();
    db.prepare('INSERT INTO audit_log (id, actor_id, action, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(`al_${Date.now()}`, userId, 'team_joined', team.id, code, now);

    if (isHtmlForm(req)) return redirect(res, `/team?event_id=${team.event_id}`, 'success', `Successfully joined team "${team.name}"!`);
    return res.status(200).json({ message: 'Joined team', team_id: team.id, team_name: team.name });
  } catch (err) {
    console.error('[teams:join] Error:', err.message);
    if (isHtmlForm(req)) return res.render('invite', { session: req.session, error: 'Failed to join team.' });
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = router;
