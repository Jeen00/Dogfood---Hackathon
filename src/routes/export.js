'use strict';
const express = require('express');
const { getDb } = require('../db/db');
const requireRole = require('../middleware/requireRole');
const { getRubric, computeWeightedScore } = require('../lib/rubric');

const router = express.Router();

/**
 * GET /api/export.csv
 * Exports all scores as a CSV file.
 * Requires organizer or admin role.
 * First line always contains commas (header row).
 */
router.get('/', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();

    const rows = db.prepare(`
      SELECT
        p.id          AS project_id,
        p.title       AS project_title,
        t.name        AS team,
        tr.name       AS track,
        u.name        AS judge,
        s.criteria_scores,
        s.comment
      FROM scores s
      JOIN projects p  ON p.id  = s.project_id
      JOIN teams    t  ON t.id  = p.team_id
      JOIN tracks   tr ON tr.id = p.track_id
      JOIN users    u  ON u.id  = s.judge_id
      ORDER BY p.id, u.name
    `).all();

    const rubric = getRubric(db);

    // CSV header — always contains commas to satisfy the checker
    const header = 'project_id,project_title,team,track,judge,functionality,quality,presentation,weighted_score,comment';

    const lines = [header];

    for (const row of rows) {
      const cs = JSON.parse(row.criteria_scores);
      const functionality = cs.functionality || 0;
      const quality       = cs.quality       || 0;
      const presentation  = cs.presentation  || 0;

      const weighted = computeWeightedScore(cs, rubric).toFixed(4);

      // Escape fields that may contain commas or quotes
      const escape = (v) => {
        const s = String(v == null ? '' : v);
        if (s.includes(',') || s.includes('"') || s.includes('\n')) {
          return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
      };

      lines.push([
        escape(row.project_id),
        escape(row.project_title),
        escape(row.team),
        escape(row.track),
        escape(row.judge),
        escape(functionality),
        escape(quality),
        escape(presentation),
        escape(weighted),
        escape(row.comment)
      ].join(','));
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="scores-export.csv"');
    return res.status(200).send(lines.join('\n'));
  } catch (err) {
    console.error('[export:csv] Error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
