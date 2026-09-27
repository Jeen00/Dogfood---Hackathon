'use strict';
const express = require('express');
const { getDb } = require('../db/db');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

/**
 * GET /events/new
 * Render event creation form.
 */
router.get('/new', requireRole('organizer', 'admin'), (req, res) => {
  return res.render('organizer/event-create', {
    session: req.session,
    error: null
  });
});

/**
 * POST /api/events
 * Create a new event.
 */
router.post('/', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const { name, submissions_open, submissions_close, voting_open, voting_close } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const id  = `evt_${Date.now()}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO events (id, name, submissions_open, submissions_close, voting_open, voting_close, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, submissions_open || null, submissions_close || null, voting_open || null, voting_close || null, req.session.userId);

    db.prepare('INSERT INTO audit_log (id, actor_id, action, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(`al_${Date.now()}`, req.session.userId, 'event_created', id, name, now);

    return res.status(201).json({ message: 'Event created', id });
  } catch (err) {
    console.error('[events POST] Error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/events
 * List all events.
 */
router.get('/', (req, res) => {
  try {
    const db     = getDb();
    const events = db.prepare('SELECT * FROM events ORDER BY submissions_open DESC').all();
    return res.json({ events });
  } catch (err) {
    console.error('[events GET] Error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
