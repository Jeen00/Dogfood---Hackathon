'use strict';
const express = require('express');
const { getDb } = require('../db/db');
const requireRole = require('../middleware/requireRole');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

/**
 * POST /api/teams
 * Create a new team for an event.
 */
router.post('/', requireRole('participant'), (req, res) => {
  try {
    const db  = getDb();
    const { name, event_id } = req.body;

    if (!name || !event_id) {
      return res.status(400).json({ error: 'name and event_id are required' });
    }

    const id          = `tm_${Date.now()}`;
    const invite_code = `INV-${uuidv4().slice(0, 8).toUpperCase()}`;

    db.prepare('INSERT INTO teams (id, event_id, name, invite_code) VALUES (?, ?, ?, ?)')
      .run(id, event_id, name, invite_code);

    // Add creator as member
    db.prepare('INSERT INTO team_members (team_id, user_id) VALUES (?, ?)')
      .run(id, req.session.userId);

    const now = new Date().toISOString();
    db.prepare('INSERT INTO audit_log (id, actor_id, action, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(`al_${Date.now()}`, req.session.userId, 'team_created', id, name, now);

    return res.status(201).json({ message: 'Team created', id, invite_code });
  } catch (err) {
    console.error('[teams POST] Error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/teams/join/:code
 * Join a team using an invite code.
 */
router.post('/join/:code', requireRole('participant'), (req, res) => {
  try {
    const db   = getDb();
    const code = req.params.code;

    const team = db.prepare('SELECT * FROM teams WHERE invite_code = ?').get(code);
    if (!team) {
      return res.status(404).json({ error: 'Invalid invite code' });
    }

    const userId   = req.session.userId;
    const existing = db.prepare('SELECT 1 FROM team_members WHERE team_id = ? AND user_id = ?').get(team.id, userId);
    if (existing) {
      return res.status(409).json({ error: 'You are already a member of this team' });
    }

    db.prepare('INSERT INTO team_members (team_id, user_id) VALUES (?, ?)').run(team.id, userId);

    const now = new Date().toISOString();
    db.prepare('INSERT INTO audit_log (id, actor_id, action, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(`al_${Date.now()}`, userId, 'team_joined', team.id, code, now);

    return res.status(200).json({ message: 'Joined team', team_id: team.id, team_name: team.name });
  } catch (err) {
    console.error('[teams:join] Error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /team
 * Render team management page for current participant.
 */
router.get('/', requireRole('participant'), (req, res) => {
  try {
    const db = getDb();
    const userId = req.session.userId;

    const teams = db.prepare(`
      SELECT t.*, COUNT(tm2.user_id) AS member_count
      FROM teams t
      JOIN team_members tm ON tm.team_id = t.id AND tm.user_id = ?
      LEFT JOIN team_members tm2 ON tm2.team_id = t.id
      GROUP BY t.id
    `).all(userId);

    return res.render('team', {
      teams,
      session: req.session
    });
  } catch (err) {
    console.error('[teams:page] Error:', err.message);
    return res.status(500).render('error', {
      message: 'Failed to load team page.',
      session: req.session
    });
  }
});

/**
 * GET /invite
 * Render the invite join page.
 */
router.get('/invite', (req, res) => {
  return res.render('invite', { session: req.session, error: null });
});

module.exports = router;
