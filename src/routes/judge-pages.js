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
 * Enhanced judge dashboard: Overview, Progress, Deadline, Pending & Completed evaluations.
 */
router.get('/dashboard', requireRole('judge'), (req, res) => {
  try {
    const db = getDb();
    const judgeId = req.session.userId;
    const selectedEvent = resolveSelectedEvent(db, req);
    res.locals.selectedJudgeEvent = selectedEvent;
    const statusInfo = getEventStatus(selectedEvent);

    // Fetch all assignments for this event with rich status info
    const assignments = db.prepare(`
      SELECT
        p.id, p.title, p.summary, p.submitted_at, p.repo_url,
        p.event_id,
        tr.name AS track_name,
        t.name  AS team_name,
        ja.status AS assignment_status,
        ja.started_at,
        ja.flagged_at,
        CASE WHEN s.id IS NOT NULL THEN 1 ELSE 0 END AS scored,
        s.submitted_at AS scored_at,
        s.criteria_scores,
        s.comment
      FROM judge_assignments ja
      JOIN projects p  ON p.id  = ja.project_id
      JOIN tracks   tr ON tr.id = p.track_id
      JOIN teams    t  ON t.id  = p.team_id
      LEFT JOIN scores s ON s.judge_id = ja.judge_id AND s.project_id = ja.project_id
      WHERE ja.judge_id = ? AND p.event_id = ?
      ORDER BY ja.status ASC, p.submitted_at DESC
    `).all(judgeId, selectedEvent.id);

    // Compute stats
    const total     = assignments.length;
    const completed = assignments.filter(a => a.scored).length;
    const pending   = assignments.filter(a => !a.scored && a.assignment_status === 'pending').length;
    const inProg    = assignments.filter(a => !a.scored && a.assignment_status === 'in_progress').length;
    const flagged   = assignments.filter(a => a.assignment_status === 'needs_review').length;
    const progress  = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Deadline
    const deadline = selectedEvent.submissions_close || null;

    return res.render('judge/dashboard', {
      assignments,
      selectedEvent,
      statusInfo,
      stats: { total, completed, pending, inProg, flagged, progress },
      deadline,
      session: req.session
    });
  } catch (err) {
    console.error('[judge:dashboard]', err.message);
    return res.status(500).render('error', { message: 'Failed to load dashboard.', session: req.session });
  }
});

/**
 * GET /judge/assignments
 * My Assignments page: tabbed view of All / Pending / In Progress / Completed / Re-evaluation
 */
router.get('/assignments', requireRole('judge'), (req, res) => {
  try {
    const db = getDb();
    const judgeId = req.session.userId;
    const selectedEvent = resolveSelectedEvent(db, req);
    res.locals.selectedJudgeEvent = selectedEvent;
    const statusInfo = getEventStatus(selectedEvent);

    const tab = req.query.tab || 'all'; // all | pending | in_progress | completed | needs_review

    // Build WHERE clause for tab filtering
    let tabFilter = '';
    if (tab === 'pending')    tabFilter = "AND ja.status = 'pending'";
    if (tab === 'in_progress') tabFilter = "AND ja.status = 'in_progress'";
    if (tab === 'completed')  tabFilter = "AND s.id IS NOT NULL AND ja.status != 'conflict'";
    if (tab === 'needs_review') tabFilter = "AND ja.status = 'needs_review'";
    if (tab === 'conflict') tabFilter = "AND ja.status = 'conflict'";

    const assignments = db.prepare(`
      SELECT
        p.id, p.title, p.summary, p.submitted_at, p.repo_url,
        p.event_id,
        tr.name AS track_name,
        t.name  AS team_name,
        ja.status AS assignment_status,
        ja.started_at,
        ja.flagged_at,
        CASE WHEN s.id IS NOT NULL THEN 1 ELSE 0 END AS scored,
        s.submitted_at AS scored_at,
        s.criteria_scores,
        s.comment
      FROM judge_assignments ja
      JOIN projects p  ON p.id  = ja.project_id
      LEFT JOIN tracks   tr ON tr.id = p.track_id
      JOIN teams    t  ON t.id  = p.team_id
      LEFT JOIN scores s ON s.judge_id = ja.judge_id AND s.project_id = ja.project_id
      WHERE ja.judge_id = ? AND p.event_id = ?
      ${tabFilter}
      ORDER BY
        CASE ja.status
          WHEN 'in_progress' THEN 0
          WHEN 'needs_review' THEN 1
          WHEN 'pending'      THEN 2
          WHEN 'conflict'     THEN 3
          ELSE                     4
        END,
        p.submitted_at DESC
    `).all(judgeId, selectedEvent.id);

    // Tab counts
    const all         = db.prepare(`SELECT COUNT(*) AS c FROM judge_assignments ja JOIN projects p ON p.id = ja.project_id WHERE ja.judge_id = ? AND p.event_id = ?`).get(judgeId, selectedEvent.id)?.c || 0;
    const cntPending  = db.prepare(`SELECT COUNT(*) AS c FROM judge_assignments ja JOIN projects p ON p.id = ja.project_id WHERE ja.judge_id = ? AND p.event_id = ? AND ja.status = 'pending'`).get(judgeId, selectedEvent.id)?.c || 0;
    const cntInProg   = db.prepare(`SELECT COUNT(*) AS c FROM judge_assignments ja JOIN projects p ON p.id = ja.project_id WHERE ja.judge_id = ? AND p.event_id = ? AND ja.status = 'in_progress'`).get(judgeId, selectedEvent.id)?.c || 0;
    const cntDone     = db.prepare(`SELECT COUNT(*) AS c FROM judge_assignments ja JOIN projects p ON p.id = ja.project_id JOIN scores s ON s.judge_id = ja.judge_id AND s.project_id = ja.project_id WHERE ja.judge_id = ? AND p.event_id = ? AND ja.status != 'conflict'`).get(judgeId, selectedEvent.id)?.c || 0;
    const cntFlagged  = db.prepare(`SELECT COUNT(*) AS c FROM judge_assignments ja JOIN projects p ON p.id = ja.project_id WHERE ja.judge_id = ? AND p.event_id = ? AND ja.status = 'needs_review'`).get(judgeId, selectedEvent.id)?.c || 0;
    const cntConflict = db.prepare(`SELECT COUNT(*) AS c FROM judge_assignments ja JOIN projects p ON p.id = ja.project_id WHERE ja.judge_id = ? AND p.event_id = ? AND ja.status = 'conflict'`).get(judgeId, selectedEvent.id)?.c || 0;

    return res.render('judge/assignments', {
      assignments,
      selectedEvent,
      statusInfo,
      tab,
      tabCounts: { all, pending: cntPending, in_progress: cntInProg, completed: cntDone, needs_review: cntFlagged, conflict: cntConflict },
      session: req.session
    });
  } catch (err) {
    console.error('[judge:assignments-page]', err.message);
    return res.status(500).render('error', { message: 'Failed to load assignments.', session: req.session });
  }
});

/**
 * POST /judge/assignments/:project_id/start
 * Mark an assignment as "in_progress" (judge opened the project to review).
 */
router.post('/assignments/:project_id/start', requireRole('judge'), (req, res) => {
  try {
    const db = getDb();
    const judgeId   = req.session.userId;
    const projectId = req.params.project_id;

    const assignment = db.prepare('SELECT * FROM judge_assignments WHERE judge_id = ? AND project_id = ?').get(judgeId, projectId);
    if (!assignment) return res.status(403).json({ error: 'Not assigned' });
    if (assignment.status !== 'pending') return res.json({ message: 'Already started', status: assignment.status });

    db.prepare("UPDATE judge_assignments SET status = 'in_progress', started_at = ? WHERE judge_id = ? AND project_id = ?")
      .run(new Date().toISOString(), judgeId, projectId);

    return res.json({ message: 'Marked as in progress', status: 'in_progress' });
  } catch (err) {
    console.error('[judge:assignments/start]', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /judge/assignments/:project_id/conflict
 * Declare a conflict of interest on an assignment.
 */
router.post('/assignments/:project_id/conflict', requireRole('judge'), (req, res) => {
  try {
    const db = getDb();
    const judgeId   = req.session.userId;
    const projectId = req.params.project_id;
    const { reason } = req.body;

    const assignment = db.prepare('SELECT * FROM judge_assignments WHERE judge_id = ? AND project_id = ?').get(judgeId, projectId);
    if (!assignment) return res.status(403).json({ error: 'Not assigned' });

    db.prepare("UPDATE judge_assignments SET status = 'conflict', conflict_reason = ? WHERE judge_id = ? AND project_id = ?")
      .run(reason || 'No reason provided', judgeId, projectId);

    return res.json({ message: 'Conflict declared', status: 'conflict' });
  } catch (err) {
    console.error('[judge:assignments/conflict]', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /judge/assignments/:project_id/notes
 * Save private notes on an assignment.
 */
router.post('/assignments/:project_id/notes', requireRole('judge'), (req, res) => {
  try {
    const db = getDb();
    const judgeId   = req.session.userId;
    const projectId = req.params.project_id;
    const { notes } = req.body;

    const assignment = db.prepare('SELECT * FROM judge_assignments WHERE judge_id = ? AND project_id = ?').get(judgeId, projectId);
    if (!assignment) return res.status(403).json({ error: 'Not assigned' });

    db.prepare("UPDATE judge_assignments SET notes = ? WHERE judge_id = ? AND project_id = ?")
      .run(notes || '', judgeId, projectId);

    return res.json({ message: 'Notes saved' });
  } catch (err) {
    console.error('[judge:assignments/notes]', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /judge/assignments/:project_id/flag
 * Flag a completed (scored) assignment for re-evaluation.
 */
router.post('/assignments/:project_id/flag', requireRole('judge'), (req, res) => {
  try {
    const db = getDb();
    const judgeId   = req.session.userId;
    const projectId = req.params.project_id;

    const assignment = db.prepare('SELECT * FROM judge_assignments WHERE judge_id = ? AND project_id = ?').get(judgeId, projectId);
    if (!assignment) return res.status(403).json({ error: 'Not assigned' });

    db.prepare("UPDATE judge_assignments SET status = 'needs_review', flagged_at = ? WHERE judge_id = ? AND project_id = ?")
      .run(new Date().toISOString(), judgeId, projectId);

    return res.json({ message: 'Flagged for re-evaluation', status: 'needs_review' });
  } catch (err) {
    console.error('[judge:assignments/flag]', err.message);
    return res.status(500).json({ error: 'Internal server error' });
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
      'SELECT id, status FROM judge_assignments WHERE judge_id = ? AND project_id = ?'
    ).get(judgeId, projectId);

    if (!assignment) {
      return res.status(403).render('error', { message: 'Project not assigned to you.', session: req.session });
    }
    if (assignment.status === 'conflict') {
      return res.status(403).render('error', { message: 'You have declared a conflict of interest for this project. Scoring is disabled.', session: req.session });
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

/**
 * GET /judge/profile
 * Simple judge profile and settings page.
 */
router.get('/profile', requireRole('judge'), (req, res) => {
  try {
    const db = getDb();
    const judgeId = req.session.userId;

    const judge = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(judgeId);
    if (!judge) return res.status(404).render('error', { message: 'Judge not found.', session: req.session });

    // Find all tracks this judge is assigned to across all events
    const tracks = db.prepare(`
      SELECT e.name AS event_name, t.name AS track_name
      FROM judge_tracks jt
      JOIN tracks t ON t.id = jt.track_id
      JOIN events e ON e.id = t.event_id
      WHERE jt.judge_id = ?
    `).all(judgeId);

    // Calculate overall stats
    const stats = db.prepare(`
      SELECT
        COUNT(*) AS total_assignments,
        SUM(CASE WHEN s.id IS NOT NULL THEN 1 ELSE 0 END) AS completed_evaluations,
        SUM(CASE WHEN ja.status = 'conflict' THEN 1 ELSE 0 END) AS conflicts_declared
      FROM judge_assignments ja
      LEFT JOIN scores s ON s.judge_id = ja.judge_id AND s.project_id = ja.project_id
      WHERE ja.judge_id = ?
    `).get(judgeId);

    return res.render('judge/profile', {
      judge,
      tracks,
      stats,
      session: req.session,
      selectedJudgeEvent: null // No specific event selected in profile
    });
  } catch (err) {
    console.error('[judge:profile-page]', err.message);
    return res.status(500).render('error', { message: 'Failed to load profile.', session: req.session });
  }
});

module.exports = router;
