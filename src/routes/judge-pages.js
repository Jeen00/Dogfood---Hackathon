'use strict';
const express = require('express');
const requireRole = require('../middleware/requireRole');
const { getDb } = require('../db/db');
const { getRubric } = require('../lib/rubric');
const { getEventStatus } = require('../lib/event-status');
const { ACTIVE_EVENT_ID } = require('../lib/config');
const { getNotifications, getUnreadCount } = require('../lib/notifications');

const router = express.Router();

/**
 * Helper: resolves the currently active event context for the judge.
 * Uses ?event_id= query param first, then session, then ACTIVE_EVENT_ID.
 */
function resolveSelectedEvent(db, req) {
  const eventId = req.query.event_id || req.session?.selectedJudgeEventId || ACTIVE_EVENT_ID;
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId) ||
                db.prepare('SELECT * FROM events ORDER BY id ASC LIMIT 1').get();
  if (req.session && event) {
    req.session.selectedJudgeEventId = event.id;
  }
  return event;
}

/**
 * GET /judge
 * Redirect to judge events overview.
 */
router.get('/', requireRole('judge'), (req, res) => {
  return res.redirect('/judge/events');
});

/**
 * GET /judge/events
 * All hackathons overview for the judge.
 * Shows events where the judge has assignments, plus other events without assignments.
 * Clears the selected event context (judge is at the "top level").
 */
router.get('/events', requireRole('judge'), (req, res) => {
  try {
    const db = getDb();
    const judgeId = req.session.userId;

    // Clear selected event so nav shows correct links
    if (req.session) {
      req.session.selectedJudgeEventId = null;
    }

    // All events with judge's assignment/score counts per event
    const allEvents = db.prepare('SELECT * FROM events ORDER BY submissions_open DESC').all();

    const events = [];       // Events where judge has assignments
    const otherEvents = [];  // Events where judge has no assignments

    for (const evt of allEvents) {
      const statusInfo = getEventStatus(evt);

      const assignedCount = db.prepare(`
        SELECT COUNT(*) AS c
        FROM judge_assignments ja
        JOIN projects p ON p.id = ja.project_id
        WHERE ja.judge_id = ? AND p.event_id = ?
      `).get(judgeId, evt.id)?.c || 0;

      const scoredCount = db.prepare(`
        SELECT COUNT(*) AS c
        FROM judge_assignments ja
        JOIN projects p ON p.id = ja.project_id
        JOIN scores s ON s.judge_id = ja.judge_id AND s.project_id = ja.project_id
        WHERE ja.judge_id = ? AND p.event_id = ?
      `).get(judgeId, evt.id)?.c || 0;

      const evtData = {
        ...evt,
        statusInfo,
        assigned_count: assignedCount,
        scored_count: scoredCount,
        pending_count: assignedCount - scoredCount
      };

      if (assignedCount > 0) {
        events.push(evtData);
      } else {
        otherEvents.push(evtData);
      }
    }

    const judgeEmail = db.prepare('SELECT email FROM users WHERE id = ?').get(judgeId)?.email?.toLowerCase();
    const pendingInvites = db.prepare(`
      SELECT ji.*,
        e.name AS event_name,
        e.submissions_open,
        e.submissions_close,
        COALESCE(u.name, 'Organizer') AS organizer_name
      FROM judge_invites ji
      JOIN events e ON e.id = ji.event_id
      LEFT JOIN users  u ON u.id = ji.organizer_id
      WHERE ji.status = 'pending' AND (
        ji.judge_id = ?
        OR LOWER(ji.judge_email) = ?
        OR LOWER(REPLACE(ji.judge_email, 'h', '')) = LOWER(REPLACE(?, 'h', ''))
      )
      ORDER BY ji.created_at DESC
    `).all(judgeId, judgeEmail || '', judgeEmail || '');

    return res.render('judge/events', {
      events,
      otherEvents,
      pendingInvites,
      session: req.session,
      selectedJudgeEvent: null
    });
  } catch (err) {
    console.error('[judge:events] Error:', err.message);
    return res.status(500).render('error', {
      message: 'Failed to load events.',
      session: req.session
    });
  }
});

/**
 * GET /judge/dashboard
 * Server-rendered judge dashboard listing assigned projects and scoring status.
 * Scoped to a specific event if event_id is provided.
 */
router.get('/dashboard', requireRole('judge'), (req, res) => {
  try {
    const db = getDb();
    const judgeId = req.session.userId;
    const selectedEvent = resolveSelectedEvent(db, req);
    res.locals.selectedJudgeEvent = selectedEvent;
    const statusInfo = getEventStatus(selectedEvent);

    const assignments = db.prepare(`
      SELECT
        p.id, p.title, p.summary, p.submitted_at,
        p.event_id,
        tr.name AS track_name,
        t.name  AS team_name,
        CASE WHEN s.id IS NOT NULL THEN 1 ELSE 0 END AS scored
      FROM judge_assignments ja
      JOIN projects p  ON p.id  = ja.project_id
      JOIN tracks   tr ON tr.id = p.track_id
      JOIN teams    t  ON t.id  = p.team_id
      LEFT JOIN scores s ON s.judge_id = ja.judge_id AND s.project_id = ja.project_id
      WHERE ja.judge_id = ? AND p.event_id = ?
      ORDER BY scored ASC, p.submitted_at DESC
    `).all(judgeId, selectedEvent.id);

    return res.render('judge/dashboard', {
      assignments,
      selectedEvent,
      statusInfo,
      session: req.session
    });
  } catch (err) {
    console.error('[judge:dashboard]', err.message);
    return res.status(500).render('error', { message: 'Failed to load dashboard.', session: req.session });
  }
});

/**
 * GET /judge/score/:project_id
 * Server-rendered scoring form for an assigned project.
 */
router.get('/score/:project_id', requireRole('judge'), (req, res) => {
  try {
    const db = getDb();
    const judgeId = req.session.userId;
    const projectId = req.params.project_id;

    const assignment = db.prepare(
      'SELECT id FROM judge_assignments WHERE judge_id = ? AND project_id = ?'
    ).get(judgeId, projectId);

    if (!assignment) {
      return res.status(403).render('error', { message: 'Project not assigned to you.', session: req.session });
    }

    const project = db.prepare(`
      SELECT p.*, t.name AS team_name, tr.name AS track_name
      FROM projects p
      JOIN teams  t  ON t.id  = p.team_id
      JOIN tracks tr ON tr.id = p.track_id
      WHERE p.id = ?
    `).get(projectId);

    // Resolve which event this project belongs to for context
    const selectedEvent = db.prepare('SELECT * FROM events WHERE id = ?').get(project.event_id) || null;
    if (req.session && selectedEvent) {
      req.session.selectedJudgeEventId = selectedEvent.id;
    }
    res.locals.selectedJudgeEvent = selectedEvent;

    const existing = db.prepare(
      'SELECT * FROM scores WHERE judge_id = ? AND project_id = ?'
    ).get(judgeId, projectId);

    const existingScores = existing
      ? JSON.parse(existing.criteria_scores)
      : {};

    const criteria = getRubric(db, project.event_id);

    return res.render('judge/score', {
      project,
      criteria,
      existingScores,
      existingComment: existing ? existing.comment : '',
      selectedEvent,
      session: req.session
    });
  } catch (err) {
    console.error('[judge:score]', err.message);
    return res.status(500).render('error', { message: 'Failed to load scoring form.', session: req.session });
  }
});

/**
 * GET /judge/scores
 * Server-rendered page showing judge's past submitted scores.
 * Optionally scoped to event_id.
 */
router.get('/scores', requireRole('judge'), (req, res) => {
  try {
    const db = getDb();
    const judgeId = req.session.userId;

    // If event_id is given, scope to that event and set context
    let selectedEvent = null;
    if (req.query.event_id) {
      selectedEvent = db.prepare('SELECT * FROM events WHERE id = ?').get(req.query.event_id) || null;
      if (req.session && selectedEvent) {
        req.session.selectedJudgeEventId = selectedEvent.id;
      }
    } else if (req.session?.selectedJudgeEventId) {
      selectedEvent = db.prepare('SELECT * FROM events WHERE id = ?').get(req.session.selectedJudgeEventId) || null;
    }
    res.locals.selectedJudgeEvent = selectedEvent;

    let query = `
      SELECT s.*, p.title AS project_title, tr.name AS track_name, p.event_id
      FROM scores s
      JOIN projects p  ON p.id  = s.project_id
      JOIN tracks   tr ON tr.id = p.track_id
      WHERE s.judge_id = ?
    `;
    const params = [judgeId];

    if (selectedEvent) {
      query += ' AND p.event_id = ? ';
      params.push(selectedEvent.id);
    }
    query += ' ORDER BY s.submitted_at DESC ';

    const scores = db.prepare(query).all(...params);

    const parsed = scores.map(s => ({
      ...s,
      criteria_scores: JSON.parse(s.criteria_scores)
    }));

    return res.render('judge/my-scores', { scores: parsed, selectedEvent, session: req.session });
  } catch (err) {
    console.error('[judge:my-scores]', err.message);
    return res.status(500).render('error', { message: 'Failed to load scores.', session: req.session });
  }
});

/**
 * GET /judge/invites
 * Shows judge's pending/past hackathon invites.
 */
router.get('/invites', requireRole('judge'), (req, res) => {
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

    return res.render('judge/invites', {
      invites,
      session: req.session,
      selectedJudgeEvent: null
    });
  } catch (err) {
    console.error('[judge:invites]', err.message);
    return res.status(500).render('error', { message: 'Failed to load invites.', session: req.session });
  }
});

module.exports = router;
