'use strict';
const express = require('express');
const { getDb } = require('../db/db');

const router = express.Router();

/**
 * GET /projects
 * Public project gallery. Server-rendered EJS.
 * Supports ?q=title-search and ?track=trk_XX
 */
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const q     = (req.query.q     || '').trim();
    const track = (req.query.track || '').trim();

    let sql = `
      SELECT
        p.id,
        p.title,
        p.summary,
        p.repo_url,
        p.submitted_at,
        p.status,
        t.name  AS team_name,
        tr.id   AS track_id,
        tr.name AS track_name
      FROM projects p
      JOIN teams  t  ON t.id  = p.team_id
      JOIN tracks tr ON tr.id = p.track_id
      WHERE p.status = 'submitted'
    `;

    const params = [];

    if (q) {
      sql += ` AND LOWER(p.title) LIKE ?`;
      params.push(`%${q.toLowerCase()}%`);
    }

    if (track) {
      sql += ` AND p.track_id = ?`;
      params.push(track);
    }

    sql += ` ORDER BY p.submitted_at DESC`;

    const projects = db.prepare(sql).all(...params);
    const tracks   = db.prepare('SELECT * FROM tracks ORDER BY id').all();

    return res.render('gallery', {
      projects,
      tracks,
      q,
      track,
      session: req.session
    });
  } catch (err) {
    console.error('[gallery] Error:', err.message);
    return res.status(500).render('error', {
      message: 'Failed to load gallery.',
      session: req.session
    });
  }
});

router.get('/api', (req, res) => {
  try {
    const db = getDb();
    const projects = db.prepare(`
      SELECT p.*, t.name AS team_name, tr.name AS track_name 
      FROM projects p 
      JOIN teams t ON t.id = p.team_id 
      JOIN tracks tr ON tr.id = p.track_id 
      WHERE p.status = 'submitted' 
      ORDER BY p.submitted_at DESC
    `).all();
    return res.json({ projects });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load projects' });
  }
});

/**
 * GET /projects/:id
 * Individual project detail page.
 */
router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const project = db.prepare(`
      SELECT
        p.*,
        t.name  AS team_name,
        tr.name AS track_name
      FROM projects p
      JOIN teams  t  ON t.id  = p.team_id
      JOIN tracks tr ON tr.id = p.track_id
      WHERE p.id = ?
    `).get(req.params.id);

    if (!project) {
      return res.status(404).render('error', {
        message: 'Project not found.',
        session: req.session
      });
    }

    return res.render('project-detail', {
      project,
      session: req.session
    });
  } catch (err) {
    console.error('[gallery:detail] Error:', err.message);
    return res.status(500).render('error', {
      message: 'Failed to load project.',
      session: req.session
    });
  }
});

module.exports = router;
