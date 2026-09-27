'use strict';
const express = require('express');
const requireRole = require('../middleware/requireRole');
const { getDb } = require('../db/db');
const { getRubric } = require('../lib/rubric');

const router = express.Router();



/**
 * GET /judge/dashboard
 * Server-rendered judge dashboard listing assigned projects and scoring status.
 */
router.get('/dashboard', requireRole('judge'), (req, res) => {
  try {
    const db = getDb();
    const judgeId = req.session.userId;

    const assignments = db.prepare(`
      SELECT
        p.id, p.title, p.summary, p.submitted_at,
        tr.name AS track_name,
        t.name  AS team_name,
        CASE WHEN s.id IS NOT NULL THEN 1 ELSE 0 END AS scored
      FROM judge_assignments ja
      JOIN projects p  ON p.id  = ja.project_id
      JOIN tracks   tr ON tr.id = p.track_id
      JOIN teams    t  ON t.id  = p.team_id
      LEFT JOIN scores s ON s.judge_id = ja.judge_id AND s.project_id = ja.project_id
      WHERE ja.judge_id = ?
      ORDER BY scored ASC, p.submitted_at DESC
    `).all(judgeId);

    return res.render('judge/dashboard', { assignments, session: req.session });
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

    const existing = db.prepare(
      'SELECT * FROM scores WHERE judge_id = ? AND project_id = ?'
    ).get(judgeId, projectId);

    const existingScores = existing
      ? JSON.parse(existing.criteria_scores)
      : {};

    const criteria = getRubric(db);


    return res.render('judge/score', {
      project,
      criteria,
      existingScores,
      existingComment: existing ? existing.comment : '',
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
 */
router.get('/scores', requireRole('judge'), (req, res) => {
  try {
    const db = getDb();
    const judgeId = req.session.userId;

    const scores = db.prepare(`
      SELECT s.*, p.title AS project_title, tr.name AS track_name
      FROM scores s
      JOIN projects p  ON p.id  = s.project_id
      JOIN tracks   tr ON tr.id = p.track_id
      WHERE s.judge_id = ?
      ORDER BY s.submitted_at DESC
    `).all(judgeId);

    const parsed = scores.map(s => ({
      ...s,
      criteria_scores: JSON.parse(s.criteria_scores)
    }));

    return res.render('judge/my-scores', { scores: parsed, session: req.session });
  } catch (err) {
    console.error('[judge:my-scores]', err.message);
    return res.status(500).render('error', { message: 'Failed to load scores.', session: req.session });
  }
});

module.exports = router;
