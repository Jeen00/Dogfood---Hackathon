'use strict';
const express = require('express');
const { getDb } = require('../db/db');
const requireRole = require('../middleware/requireRole');
const { ACTIVE_EVENT_ID } = require('../lib/config');
const { getRubric } = require('../lib/rubric');
const { getEventStatus } = require('../lib/event-status');

const router = express.Router();

/**
 * Helper to resolve the currently active hackathon context for organizer
 */
function resolveSelectedEvent(db, req) {
  const eventId = req.query.event_id || req.session?.selectedEventId || ACTIVE_EVENT_ID;
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId) ||
                db.prepare('SELECT * FROM events ORDER BY id ASC LIMIT 1').get();
  if (req.session && event) {
    req.session.selectedEventId = event.id;
  }
  return event;
}

/**
 * GET /organizer
 * Redirect to events overview.
 */
router.get('/', requireRole('organizer', 'admin'), (req, res) => {
  return res.redirect('/organizer/events');
});

/**
 * GET /organizer/events & GET /api/organizer/events
 * Shows all hackathons overview page.
 * Clears active selected hackathon context so navbar shows All Hackathons and Gallery.
 */
router.get('/events', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    if (req.session) {
      req.session.selectedEventId = null;
    }
    res.locals.selectedEvent = null;

    const rawEvents = db.prepare('SELECT * FROM events ORDER BY submissions_open DESC').all();
    const events = rawEvents.map(evt => {
      const statusInfo = getEventStatus(evt);
      const projectCount = db.prepare("SELECT COUNT(*) AS c FROM projects WHERE event_id = ? AND status = 'submitted'").get(evt.id)?.c || 0;
      const trackCount = db.prepare("SELECT COUNT(*) AS c FROM tracks WHERE event_id = ?").get(evt.id)?.c || 0;
      return {
        ...evt,
        statusInfo,
        project_count: projectCount,
        track_count: trackCount
      };
    });

    if (req.baseUrl.startsWith('/api') || (!req.accepts('html') && req.accepts('json'))) {
      return res.json({ events });
    }

    return res.render('organizer/events', {
      events,
      session: req.session,
      selectedEvent: null
    });
  } catch (err) {
    console.error('[organizer:events] Error:', err.message);
    return res.status(500).render('error', {
      message: 'Failed to load hackathons.',
      session: req.session
    });
  }
});
/**
 * GET /api/organizer/progress
 * Returns judge progress (assigned vs completed) and project coverage.
 */
router.get('/progress', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();

    // Judge progress
    const judgeProgress = db.prepare(`
      SELECT
        u.id         AS judge_id,
        u.name       AS judge_name,
        COUNT(ja.id) AS assigned,
        COUNT(s.id)  AS completed
      FROM users u
      LEFT JOIN judge_assignments ja ON ja.judge_id = u.id
      LEFT JOIN scores            s  ON s.judge_id  = u.id AND s.project_id = ja.project_id
      WHERE u.role = 'judge'
      GROUP BY u.id
      ORDER BY u.name
    `).all();

    // Project coverage
    const projectCoverage = db.prepare(`
      SELECT
        p.id           AS project_id,
        p.title        AS project_title,
          t.name         AS team_name,
          tr.name        AS track_name,
        COUNT(ja.id)   AS reviews_needed,
        COUNT(s.id)    AS reviews_received
      FROM projects p
        JOIN tracks tr ON tr.id = p.track_id
        JOIN teams t ON t.id = p.team_id
      LEFT JOIN judge_assignments ja ON ja.project_id = p.id
      LEFT JOIN scores            s  ON s.project_id  = p.id AND s.judge_id = ja.judge_id
      WHERE p.status = 'submitted'
      GROUP BY p.id
      ORDER BY reviews_received ASC
    `).all();

    return res.json({ judgeProgress, projectCoverage });
  } catch (err) {
    console.error('[organizer:progress] Error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/organizer/stats
 * Returns overall summary statistics for organizer dashboards.
 */
router.get('/stats', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const totalProjects = db.prepare("SELECT COUNT(*) AS count FROM projects WHERE status = 'submitted'").get().count;
    const activeJudges   = db.prepare("SELECT COUNT(DISTINCT id) AS count FROM users WHERE role = 'judge'").get().count;
    const scoresSubmitted = db.prepare("SELECT COUNT(*) AS count FROM scores").get().count;
    const totalAssignments = db.prepare("SELECT COUNT(*) AS count FROM judge_assignments").get().count;

    return res.json({
      totalProjects,
      activeJudges,
      scoresSubmitted,
      totalAssignments,
      completionRate: totalAssignments > 0 ? Math.round((scoresSubmitted / totalAssignments) * 100) : 0
    });
  } catch (err) {
    console.error('[organizer:stats] Error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/judge/assignments/auto

 * Re-runs auto-assignment: assigns judges to projects based on track matching.
 * Idempotent (INSERT OR IGNORE).
 */
router.post('/assignments/auto', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();

    const projects = db.prepare('SELECT * FROM projects WHERE status = ?').all('submitted');
    const judges   = db.prepare("SELECT id FROM users WHERE role = 'judge'").all();

    const insertAssignment = db.prepare(
      'INSERT OR IGNORE INTO judge_assignments (id, judge_id, project_id) VALUES (?, ?, ?)'
    );

    let added = 0;

    for (const proj of projects) {
      // Find judges whose track preferences include this project's track
      const matchingJudges = db.prepare(`
        SELECT DISTINCT jt.judge_id
        FROM judge_tracks jt
        WHERE jt.track_id = ?
      `).all(proj.track_id).map(r => r.judge_id);

      // If no track match, fall back to first 3 judges
      const assignees = matchingJudges.length > 0
        ? matchingJudges
        : judges.slice(0, 3).map(j => j.id);

      for (const judgeId of assignees) {
        const aId  = `asgn_auto_${judgeId}_${proj.id}`;
        const info = insertAssignment.run(aId, judgeId, proj.id);
        if (info.changes > 0) added++;
      }
    }

    return res.json({ message: `Auto-assignment complete. ${added} new assignments created.` });
  } catch (err) {
    console.error('[organizer:auto-assign] Error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


/**
 * GET /organizer/dashboard
 * Render the organizer dashboard page for the selected hackathon.
 */
router.get('/dashboard', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const selectedEvent = resolveSelectedEvent(db, req);
    res.locals.selectedEvent = selectedEvent;
    const statusInfo = getEventStatus(selectedEvent);

    const judgeProgress = db.prepare(`
      SELECT
        u.id         AS judge_id,
        u.name       AS judge_name,
        COUNT(ja.id) AS assigned,
        COUNT(s.id)  AS completed
      FROM users u
      LEFT JOIN judge_assignments ja ON ja.judge_id = u.id
      LEFT JOIN projects          p  ON p.id = ja.project_id AND p.event_id = ?
      LEFT JOIN scores            s  ON s.judge_id  = u.id AND s.project_id = ja.project_id
      WHERE u.role = 'judge'
      GROUP BY u.id
      ORDER BY u.name
    `).all(selectedEvent.id);

    const projectCoverage = db.prepare(`
      SELECT
        p.id           AS project_id,
        p.title        AS project_title,
          t.name         AS team_name,
          tr.name        AS track_name,
        COUNT(ja.id)   AS reviews_needed,
        COUNT(s.id)    AS reviews_received
      FROM projects p
        JOIN tracks tr ON tr.id = p.track_id
        JOIN teams t ON t.id = p.team_id
      LEFT JOIN judge_assignments ja ON ja.project_id = p.id
      LEFT JOIN scores            s  ON s.project_id  = p.id AND s.judge_id = ja.judge_id
      WHERE p.status = 'submitted' AND p.event_id = ?
      GROUP BY p.id
      ORDER BY reviews_received ASC
    `).all(selectedEvent.id);

    return res.render('organizer/dashboard', {
      judgeProgress,
      projectCoverage,
      selectedEvent,
      statusInfo,
      session: req.session
    });
  } catch (err) {
    console.error('[organizer:dashboard] Error:', err.message);
    return res.status(500).render('error', {
      message: 'Failed to load dashboard.',
      session: req.session
    });
  }
});

/**
 * GET /organizer/normalization
 * Render the normalization page.
 */
router.get('/normalization', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const selectedEvent = resolveSelectedEvent(db, req);
    res.locals.selectedEvent = selectedEvent;

    const results = db.prepare(`
      SELECT
        ns.judge_id,
        ns.project_id,
        ns.raw_weighted_score,
        ns.normalized_score,
        ns.method,
        ns.computed_at,
        u.name  AS judge_name,
        p.title AS project_title
      FROM normalized_scores ns
      JOIN users    u ON u.id = ns.judge_id
      JOIN projects p ON p.id = ns.project_id
      WHERE p.event_id = ?
      ORDER BY ns.normalized_score DESC
    `).all(selectedEvent.id);

    return res.render('organizer/normalization', {
      results,
      selectedEvent,
      session: req.session
    });
  } catch (err) {
    console.error('[organizer:normalization] Error:', err.message);
    return res.status(500).render('error', {
      message: 'Failed to load normalization page.',
      session: req.session
    });
  }
});

/**
 * GET /organizer/event/new
 * Render event creation form.
 */
router.get('/event/new', requireRole('organizer', 'admin'), (req, res) => {
  return res.render('organizer/event-create', {
    session: req.session,
    error: null
  });
});

/**
 * GET /organizer/rubric & GET /api/organizer/rubric
 * Render rubric management page or return JSON criteria.
 */
router.get('/rubric', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const selectedEvent = resolveSelectedEvent(db, req);
    res.locals.selectedEvent = selectedEvent;
    const criteria = getRubric(db, selectedEvent.id);

    if (req.baseUrl.startsWith('/api') || (!req.accepts('html') && req.accepts('json'))) {
      return res.json({ criteria });
    }

    return res.render('organizer/rubric', {
      criteria,
      selectedEvent,
      session: req.session
    });
  } catch (err) {
    console.error('[organizer:rubric GET] Error:', err.message);
    if (req.baseUrl.startsWith('/api') || !req.accepts('html')) {
      return res.status(500).json({ error: 'Internal server error' });
    }
    return res.status(500).render('error', {
      message: 'Failed to load rubric.',
      session: req.session
    });
  }
});

/**
 * POST /api/organizer/assignments
 * Manually assign a judge to a project.
 * Body: { judge_id, project_id }
 */
router.post('/assignments', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const { judge_id, project_id } = req.body;

    if (!judge_id || !project_id) {
      return res.status(400).json({ error: 'judge_id and project_id are required' });
    }

    const id = `asgn_man_${judge_id}_${project_id}`;
    const info = db.prepare(
      'INSERT OR IGNORE INTO judge_assignments (id, judge_id, project_id) VALUES (?, ?, ?)'
    ).run(id, judge_id, project_id);

    if (info.changes === 0) {
      return res.status(409).json({ message: 'Assignment already exists' });
    }

    const now = new Date().toISOString();
    db.prepare('INSERT INTO audit_log (id, actor_id, action, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(`al_${Date.now()}`, req.session.userId, 'judge_assigned', id, `${judge_id}->${project_id}`, now);

    return res.status(201).json({ message: 'Judge assigned successfully', id });
  } catch (err) {
    console.error('[organizer:assignments POST] Error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/organizer/assignments/:id
 * Remove a judge assignment.
 */
router.delete('/assignments/:id', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const id = req.params.id;

    const info = db.prepare('DELETE FROM judge_assignments WHERE id = ?').run(id);
    if (info.changes === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const now = new Date().toISOString();
    db.prepare('INSERT INTO audit_log (id, actor_id, action, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(`al_${Date.now()}`, req.session.userId, 'judge_unassigned', id, '', now);

    return res.json({ message: 'Assignment removed' });
  } catch (err) {
    console.error('[organizer:assignments DELETE] Error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /organizer/assignments
 * Render judge assignments page.
 */
router.get('/assignments', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const selectedEvent = resolveSelectedEvent(db, req);
    res.locals.selectedEvent = selectedEvent;

    const assignments = db.prepare(`
      SELECT ja.id, u.name AS judge_name, p.title AS project_title, tr.name AS track_name
      FROM judge_assignments ja
      JOIN users u    ON u.id  = ja.judge_id
      JOIN projects p ON p.id  = ja.project_id
      JOIN tracks tr  ON tr.id = p.track_id
      WHERE p.event_id = ?
      ORDER BY u.name, p.title
    `).all(selectedEvent.id);

    if (req.baseUrl.startsWith('/api') || (!req.accepts('html') && req.accepts('json'))) {
      return res.json({ assignments });
    }

    return res.render('organizer/assignments', {
      assignments,
      selectedEvent,
      session: req.session
    });
  } catch (err) {
    return res.status(500).render('error', {
      message: 'Failed to load assignments.',
      session: req.session
    });
  }
});


/**
 * GET /organizer/invite-judge
 * Render invite judge page.
 */
router.get('/invite-judge', requireRole('organizer', 'admin'), (req, res) => {
  return res.render('organizer/invite-judge', {
    session: req.session,
    error: null,
    success: null
  });
});

/**
 * POST /organizer/invite-judge
 * Create a new judge user and seed a fixed session for them.
 * Body: { name, email }
 */
router.post('/invite-judge', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const { name, email } = req.body;
    const isJson = req.is('json') || req.headers.accept?.includes('application/json');

    if (!name || !email) {
      if (isJson) return res.status(400).json({ error: 'Name and email are required.' });
      return res.render('organizer/invite-judge', {
        session: req.session,
        error:   'Name and email are required.',
        success: null
      });
    }

    const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(email.toLowerCase());
    if (existing) {
      if (isJson) return res.status(409).json({ error: 'A user with that email already exists.' });
      return res.render('organizer/invite-judge', {
        session: req.session,
        error:   'A user with that email already exists.',
        success: null
      });
    }

    const { v4: uuidv4 } = require('uuid');
    const userId    = `jdg_${uuidv4().slice(0, 8)}`;
    const sessionId = `jdg_${uuidv4().slice(0, 8)}`;
    const now       = new Date().toISOString();

    db.prepare('INSERT INTO users (id, name, email, role, password_hash) VALUES (?, ?, ?, ?, ?)')
      .run(userId, name, email, 'judge', null);

    db.prepare('INSERT INTO sessions (id, user_id, role) VALUES (?, ?, ?)')
      .run(sessionId, userId, 'judge');

    db.prepare('INSERT INTO audit_log (id, actor_id, action, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(`al_${Date.now()}`, req.session.userId, 'judge_invited', userId, email, now);

    const successMsg = `Judge "${name}" created. Session cookie: session=${sessionId}`;
    if (isJson) return res.json({ success: successMsg, userId, sessionId });

    return res.render('organizer/invite-judge', {
      session: req.session,
      error:   null,
      success: successMsg
    });
  } catch (err) {
    console.error('[organizer:invite-judge POST] Error:', err.message);
    if (req.is('json')) return res.status(500).json({ error: 'An error occurred. Please try again.' });
    return res.render('organizer/invite-judge', {
      session: req.session,
      error:   'An error occurred. Please try again.',
      success: null
    });
  }
});

/**
 * POST /organizer/rubric
 * Update rubric criteria weights for the event.
 * Body: { criteria: [{ id, weight }, ...] }
 */
router.post('/rubric', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    // Accept either JSON body (from React fetch) or form-encoded body
    const criteria = req.body.criteria;

    if (!criteria || !Array.isArray(criteria)) {
      return res.status(400).json({ error: 'criteria array is required' });
    }

    // Validate that weights sum to 1.0 (±0.01 tolerance)
    const total = criteria.reduce((s, c) => s + parseFloat(c.weight || 0), 0);
    if (Math.abs(total - 1.0) > 0.01) {
      return res.status(400).json({ error: `Weights must sum to 1.0 (got ${total.toFixed(4)})` });
    }

    const selectedEvent = resolveSelectedEvent(db, req);
    const update = db.prepare('UPDATE rubric_criteria SET weight = ? WHERE id = ? AND event_id = ?');
    for (const c of criteria) {
      update.run(parseFloat(c.weight), c.id, selectedEvent.id);
    }

    const now = new Date().toISOString();
    db.prepare('INSERT INTO audit_log (id, actor_id, action, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(`al_${Date.now()}`, req.session.userId, 'rubric_updated', selectedEvent.id, JSON.stringify(criteria), now);


    return res.json({ message: 'Rubric updated successfully' });
  } catch (err) {
    console.error('[organizer:rubric POST] Error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/organizer/results & GET /organizer/results
 * Returns final ranked hackathon leaderboard based on normalized scores.
 */
router.get('/results', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const selectedEvent = resolveSelectedEvent(db, req);
    res.locals.selectedEvent = selectedEvent;

    // Query aggregated normalized scores per project
    const results = db.prepare(`
      SELECT
        p.id AS project_id,
        p.title AS project_title,
        p.repo_url,
        t.name AS team_name,
        tr.name AS track_name,
        COUNT(ns.judge_id) AS reviews_count,
        ROUND(AVG(ns.raw_weighted_score), 2) AS avg_raw_score,
        ROUND(AVG(ns.normalized_score), 3) AS final_normalized_score
      FROM projects p
      JOIN teams t ON t.id = p.team_id
      JOIN tracks tr ON tr.id = p.track_id
      LEFT JOIN normalized_scores ns ON ns.project_id = p.id
      WHERE p.status = 'submitted' AND p.event_id = ?
      GROUP BY p.id
      ORDER BY final_normalized_score DESC, avg_raw_score DESC
    `).all(selectedEvent.id);

    // Assign sequential ranks (1, 2, 3...)
    const leaderboard = results.map((item, index) => ({
      rank: index + 1,
      ...item
    }));

    if (req.baseUrl.startsWith('/api') || (!req.accepts('html') && req.accepts('json'))) {
      return res.json({ leaderboard });
    }

    return res.render('organizer/results', {
      leaderboard,
      selectedEvent,
      session: req.session
    });
  } catch (err) {
    console.error('[organizer:results GET] Error:', err.message);
    if (req.baseUrl.startsWith('/api') || !req.accepts('html')) {
      return res.status(500).json({ error: 'Internal server error' });
    }
    return res.status(500).render('error', {
      message: 'Failed to load results leaderboard.',
      session: req.session
    });
  }
});

module.exports = router;


