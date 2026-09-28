'use strict';
const express = require('express');
const { getDb } = require('../db/db');
const requireRole = require('../middleware/requireRole');
const { ACTIVE_EVENT_ID } = require('../lib/config');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

/**
 * Helper to check if request came from an HTML form submission
 */
function isHtmlForm(req) {
  const ct = req.headers['content-type'] || '';
  return ct.includes('application/x-www-form-urlencoded') || (!req.is('json') && req.accepts('html'));
}

/**
 * POST /api/teams or POST /team
 * Create a new team for an event.
 */
router.post('/', requireRole('participant'), (req, res) => {
  try {
    const db = getDb();
    const name = (req.body.name || '').trim();
    const event_id = (req.body.event_id || ACTIVE_EVENT_ID).trim();

    if (!name) {
      if (isHtmlForm(req)) {
        return res.redirect('/team?error=' + encodeURIComponent('Team name is required'));
      }
      return res.status(400).json({ error: 'name is required' });
    }

    const id = `tm_${Date.now()}`;
    const invite_code = `INV-${uuidv4().slice(0, 8).toUpperCase()}`;

    db.prepare('INSERT INTO teams (id, event_id, name, invite_code) VALUES (?, ?, ?, ?)')
      .run(id, event_id, name, invite_code);

    // Add creator as member
    db.prepare('INSERT INTO team_members (team_id, user_id) VALUES (?, ?)')
      .run(id, req.session.userId);

    const now = new Date().toISOString();
    db.prepare('INSERT INTO audit_log (id, actor_id, action, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(`al_${Date.now()}`, req.session.userId, 'team_created', id, name, now);

    if (isHtmlForm(req)) {
      return res.redirect('/team?success=' + encodeURIComponent(`Team "${name}" created with code ${invite_code}!`));
    }

    return res.status(201).json({ message: 'Team created', id, invite_code });
  } catch (err) {
    console.error('[teams POST] Error:', err.message);
    if (isHtmlForm(req)) {
      return res.redirect('/team?error=' + encodeURIComponent('Failed to create team. Please try again.'));
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /team/join (from form submission)
 */
router.post('/join', requireRole('participant'), (req, res) => {
  const code = (req.body.code || '').trim().toUpperCase();
  if (!code) {
    return res.render('invite', { session: req.session, error: 'Please enter an invite code.' });
  }
  return handleJoinTeam(code, req, res);
});

/**
 * GET /team/join/:code or GET /invite/:code
 * Allows direct clicking of invite links
 */
router.get('/join/:code', requireRole('participant'), (req, res) => {
  const code = req.params.code.trim().toUpperCase();
  return handleJoinTeam(code, req, res);
});

/**
 * POST /api/teams/join/:code
 * Join a team using an invite code.
 */
router.post('/join/:code', requireRole('participant'), (req, res) => {
  const code = req.params.code.trim().toUpperCase();
  return handleJoinTeam(code, req, res);
});

function handleJoinTeam(code, req, res) {
  try {
    const db = getDb();
    const team = db.prepare('SELECT * FROM teams WHERE UPPER(invite_code) = ?').get(code);
    if (!team) {
      if (isHtmlForm(req)) {
        return res.render('invite', { session: req.session, error: `Invalid invite code: "${code}"` });
      }
      return res.status(404).json({ error: 'Invalid invite code' });
    }

    const userId = req.session.userId;
    const existing = db.prepare('SELECT 1 FROM team_members WHERE team_id = ? AND user_id = ?').get(team.id, userId);
    if (existing) {
      if (isHtmlForm(req)) {
        return res.redirect('/team?info=' + encodeURIComponent(`You are already a member of team "${team.name}".`));
      }
      return res.status(409).json({ error: 'You are already a member of this team' });
    }

    db.prepare('INSERT INTO team_members (team_id, user_id) VALUES (?, ?)').run(team.id, userId);

    const now = new Date().toISOString();
    db.prepare('INSERT INTO audit_log (id, actor_id, action, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(`al_${Date.now()}`, userId, 'team_joined', team.id, code, now);

    if (isHtmlForm(req)) {
      return res.redirect('/team?success=' + encodeURIComponent(`Successfully joined team "${team.name}"!`));
    }

    return res.status(200).json({ message: 'Joined team', team_id: team.id, team_name: team.name });
  } catch (err) {
    console.error('[teams:join] Error:', err.message);
    if (isHtmlForm(req)) {
      return res.render('invite', { session: req.session, error: 'Failed to join team. Please try again.' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /team or GET /api/teams
 * EJS render for HTML requests; JSON for API requests.
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

    const isJson = req.is('json') || (!req.accepts('html') && req.accepts('json')) || req.baseUrl.startsWith('/api');
    if (isJson) {
      return res.json({ teams });
    }

    return res.render('team', {
      teams,
      eventId: ACTIVE_EVENT_ID,
      session: req.session,
      error: req.query.error || null,
      success: req.query.success || null,
      info: req.query.info || null
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
 * GET /invite or GET /team/invite
 * Render the invite join page.
 */
router.get('/invite', (req, res) => {
  return res.render('invite', { session: req.session, error: null });
});

module.exports = router;
