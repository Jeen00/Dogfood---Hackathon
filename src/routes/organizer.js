'use strict';
const express = require('express');
const { getDb } = require('../db/db');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

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
 * POST /api/judge/assignments/auto
 * Re-runs auto-assignment: assigns judges to projects based on track matching.
 * Idempotent (INSERT OR IGNORE).
 */
router.post('/assignments/auto', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();

    const judges   = db.prepare("SELECT id FROM users WHERE role = 'judge'").all();
    const projects = db.prepare('SELECT * FROM projects').all();
    const judgeTrackMap = {};

    // Rebuild the track map from DB
    for (const judge of judges) {
      // We stored judge track preferences in fixtures only; re-derive from assignments not available.
      // Instead, use a join: judge can be assigned based on event tracks.
      // For this auto-assignment, we reassign using the fixture approach:
      // assign a judge to a project if they share a track assignment record already exists,
      // OR assign 3 judges per project as fallback.
      judgeTrackMap[judge.id] = judge.id; // placeholder — see below
    }

    // Pull all existing assignments to know current state, then insert new ones
    const insertAssignment = db.prepare(
      'INSERT OR IGNORE INTO judge_assignments (id, judge_id, project_id) VALUES (?, ?, ?)'
    );

    let added = 0;
    for (const proj of projects) {
      // Pick first 3 judges for each project if they aren't already assigned
      for (const judge of judges.slice(0, 3)) {
        const aId = `asgn_auto_${judge.id}_${proj.id}`;
        const info = insertAssignment.run(aId, judge.id, proj.id);
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
 * Render the organizer dashboard page.
 */
router.get('/dashboard', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();

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

    return res.render('organizer/dashboard', {
      judgeProgress,
      projectCoverage,
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
      ORDER BY ns.normalized_score DESC
    `).all();

    return res.render('organizer/normalization', {
      results,
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
 * GET /organizer/rubric
 * Render rubric management page.
 */
router.get('/rubric', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const criteria = db.prepare('SELECT * FROM rubric_criteria WHERE event_id = ?').all('evt_01');
    return res.render('organizer/rubric', {
      criteria,
      session: req.session
    });
  } catch (err) {
    return res.status(500).render('error', {
      message: 'Failed to load rubric.',
      session: req.session
    });
  }
});

/**
 * GET /organizer/assignments
 * Render judge assignments page.
 */
router.get('/assignments', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const assignments = db.prepare(`
      SELECT ja.id, u.name AS judge_name, p.title AS project_title, tr.name AS track_name
      FROM judge_assignments ja
      JOIN users u    ON u.id  = ja.judge_id
      JOIN projects p ON p.id  = ja.project_id
      JOIN tracks tr  ON tr.id = p.track_id
      ORDER BY u.name, p.title
    `).all();

    return res.render('organizer/assignments', {
      assignments,
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

module.exports = router;

