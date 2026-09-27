'use strict';
const express = require('express');
const { getDb } = require('../db/db');
const requireRole = require('../middleware/requireRole');
const { getRubric, computeWeightedScore } = require('../lib/rubric');

const router = express.Router();

/**
 * POST /api/normalization/run
 * Computes Z-score normalization for all judges and saves to normalized_scores.
 * Edge case: if a judge's stddev is 0, their z-score is set to 0.
 */
router.post('/run', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db     = getDb();
    const rubric = getRubric(db);

    // Load all scores
    const allScores = db.prepare('SELECT * FROM scores').all();

    if (allScores.length === 0) {
      return res.status(400).json({ error: 'No scores to normalize' });
    }

    // Group scores by judge
    const byJudge = {};
    for (const s of allScores) {
      const cs = JSON.parse(s.criteria_scores);
      const ws = computeWeightedScore(cs, rubric);
      if (!byJudge[s.judge_id]) byJudge[s.judge_id] = [];
      byJudge[s.judge_id].push({ project_id: s.project_id, ws });
    }


    const now     = new Date().toISOString();
    const results = [];

    // Clear previous results
    db.prepare('DELETE FROM normalized_scores').run();

    const insertNorm = db.prepare(`
      INSERT INTO normalized_scores (judge_id, project_id, raw_weighted_score, normalized_score, method, computed_at)
      VALUES (?, ?, ?, ?, 'zscore', ?)
    `);

    for (const [judgeId, entries] of Object.entries(byJudge)) {
      const scores   = entries.map(e => e.ws);
      const n        = scores.length;
      const mean     = scores.reduce((a, b) => a + b, 0) / n;
      const variance = scores.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
      const stddev   = Math.sqrt(variance);

      for (const entry of entries) {
        // If stddev is 0 (all identical scores), z-score is 0 to avoid division by zero
        const zScore = stddev === 0 ? 0 : (entry.ws - mean) / stddev;

        insertNorm.run(judgeId, entry.project_id, entry.ws, zScore, now);

        results.push({
          judge_id:           judgeId,
          project_id:         entry.project_id,
          raw_weighted_score: entry.ws,
          normalized_score:   zScore,
          stddev_was_zero:    stddev === 0
        });
      }
    }

    return res.json({
      message: `Normalization complete. Processed ${results.length} score entries across ${Object.keys(byJudge).length} judges.`,
      results
    });
  } catch (err) {
    console.error('[normalization:run] Error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


/**
 * GET /api/normalization/results
 * Returns all normalized scores joined with judge names and project titles.
 */
router.get('/results', requireRole('organizer', 'admin'), (req, res) => {
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
        u.name AS judge_name,
        p.title AS project_title
      FROM normalized_scores ns
      JOIN users    u ON u.id = ns.judge_id
      JOIN projects p ON p.id = ns.project_id
      ORDER BY ns.normalized_score DESC
    `).all();

    return res.json({ results });
  } catch (err) {
    console.error('[normalization:results] Error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
