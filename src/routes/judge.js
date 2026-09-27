'use strict';
const express = require('express');
const { getDb } = require('../db/db');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

/**
 * GET /api/judge/assignments
 * Returns projects assigned to the current judge with scored status.
 */
router.get('/assignments', requireRole('judge'), (req, res) => {
  try {
    const db      = getDb();
    const judgeId = req.session.userId;

    const assignments = db.prepare(`
      SELECT
        p.id,
        p.title,
        p.summary,
        p.repo_url,
        p.submitted_at,
        tr.name AS track_name,
        t.name  AS team_name,
        CASE WHEN s.id IS NOT NULL THEN 1 ELSE 0 END AS scored
      FROM judge_assignments ja
      JOIN projects p  ON p.id  = ja.project_id
      JOIN tracks   tr ON tr.id = p.track_id
      JOIN teams    t  ON t.id  = p.team_id
      LEFT JOIN scores s ON s.judge_id = ja.judge_id AND s.project_id = ja.project_id
      WHERE ja.judge_id = ?
      ORDER BY p.submitted_at DESC
    `).all(judgeId);

    return res.json({ assignments });
  } catch (err) {
    console.error('[judge:assignments] Error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/judge/scores
 * Role-aware score retrieval:
 *   - judge:     own scores only (403 if ?judge= another judge)
 *   - organizer: all scores, or filtered by ?judge=
 */
router.get('/scores', (req, res) => {
  if (!req.session) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const db      = getDb();
  const role    = req.session.role;
  const userId  = req.session.userId;
  const qJudge  = req.query.judge || null;

  try {
    if (role === 'participant') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (role === 'judge') {
      // A judge may only see their own scores
      if (qJudge && qJudge !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      const scores = db.prepare(`
        SELECT s.*, p.title AS project_title, p.track_id
        FROM scores s
        JOIN projects p ON p.id = s.project_id
        WHERE s.judge_id = ?
        ORDER BY s.submitted_at DESC
      `).all(userId);

      const parsed = scores.map(s => ({
        ...s,
        criteria_scores: JSON.parse(s.criteria_scores)
      }));
      return res.json({ scores: parsed });
    }

    // organizer / admin
    if (qJudge) {
      const scores = db.prepare(`
        SELECT s.*, p.title AS project_title, u.name AS judge_name
        FROM scores s
        JOIN projects p ON p.id = s.project_id
        JOIN users    u ON u.id = s.judge_id
        WHERE s.judge_id = ?
        ORDER BY s.submitted_at DESC
      `).all(qJudge);

      const parsed = scores.map(s => ({
        ...s,
        criteria_scores: JSON.parse(s.criteria_scores)
      }));
      return res.json({ scores: parsed });
    }

    const scores = db.prepare(`
      SELECT s.*, p.title AS project_title, u.name AS judge_name
      FROM scores s
      JOIN projects p ON p.id = s.project_id
      JOIN users    u ON u.id = s.judge_id
      ORDER BY s.submitted_at DESC
    `).all();

    const parsed = scores.map(s => ({
      ...s,
      criteria_scores: JSON.parse(s.criteria_scores)
    }));
    return res.json({ scores: parsed });
  } catch (err) {
    console.error('[judge:scores GET] Error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/judge/scores
 * Submit or update a score for an assigned project.
 * Body: { project_id, criteria_scores: { functionality, quality, presentation }, comment }
 */
router.post('/scores', requireRole('judge'), (req, res) => {
  try {
    const db      = getDb();
    const judgeId = req.session.userId;
    const { project_id, criteria_scores, comment } = req.body;

    if (!project_id || !criteria_scores) {
      return res.status(400).json({ error: 'project_id and criteria_scores are required' });
    }

    // Verify the project is assigned to this judge
    const assignment = db.prepare(
      'SELECT id FROM judge_assignments WHERE judge_id = ? AND project_id = ?'
    ).get(judgeId, project_id);

    if (!assignment) {
      return res.status(403).json({ error: 'Project not assigned to this judge' });
    }

    // Validate criteria values (1-5)
    const allowedCriteria = ['functionality', 'quality', 'presentation'];
    for (const key of allowedCriteria) {
      const val = Number(criteria_scores[key]);
      if (!criteria_scores[key] || isNaN(val) || val < 1 || val > 5) {
        return res.status(400).json({ error: `Criterion '${key}' must be between 1 and 5` });
      }
    }

    const now        = new Date().toISOString();
    const scoreId    = `sc_${judgeId}_${project_id}`;
    const csJson     = JSON.stringify(criteria_scores);

    // Upsert
    db.prepare(`
      INSERT INTO scores (id, judge_id, project_id, criteria_scores, comment, submitted_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(judge_id, project_id) DO UPDATE SET
        criteria_scores = excluded.criteria_scores,
        comment         = excluded.comment,
        submitted_at    = excluded.submitted_at
    `).run(scoreId, judgeId, project_id, csJson, comment || '', now);

    // Audit log
    db.prepare(
      'INSERT INTO audit_log (id, actor_id, action, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(`al_${Date.now()}`, judgeId, 'score_submitted', project_id, csJson, now);

    return res.status(201).json({ message: 'Score submitted successfully' });
  } catch (err) {
    console.error('[judge:scores POST] Error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
