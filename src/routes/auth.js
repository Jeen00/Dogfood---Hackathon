'use strict';
const express = require('express');
const { getDb } = require('../db/db');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

/**
 * GET /login
 * Redirects to the frontend login.
 */
router.get('/login', (req, res) => {
  return res.redirect('/login');
});

/**
 * POST /auth/login
 * Authenticates user by email + password. Returns JSON.
 */
router.post('/login', (req, res) => {
  try {
    const db    = getDb();
    const email = (req.body.email    || '').trim().toLowerCase();
    const pass  = (req.body.password || '').trim();

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!pass) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const existing = db.prepare('SELECT * FROM sessions WHERE user_id = ?').get(user.id);
    let sessionId;

    if (existing) {
      sessionId = existing.id;
    } else {
      sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      db.prepare('INSERT INTO sessions (id, user_id, role) VALUES (?, ?, ?)').run(sessionId, user.id, user.role);
    }

    res.cookie('session', sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge:   7 * 24 * 60 * 60 * 1000 // 7 days
    });

    return res.json({ success: true, role: user.role });

  } catch (err) {
    console.error('[auth:login] Error:', err.message);
    return res.status(500).json({ error: 'An error occurred.' });
  }
});

/**
 * POST /auth/logout
 */
router.post('/logout', (req, res) => {
  res.clearCookie('session');
  return res.redirect('/login');
});

/**
 * GET /auth/logout
 */
router.get('/logout', (req, res) => {
  res.clearCookie('session');
  return res.redirect('/login');
});

router.get('/me', (req, res) => {
  if (req.session) {
    return res.json({ loggedIn: true, role: req.session.role });
  }
  return res.json({ loggedIn: false });
});

/**
 * POST /auth/signup
 */
router.post('/signup', (req, res) => {
  try {
    const db = getDb();
    const { firstName, lastName, email, password, role = 'participant' } = req.body;
    
    if (!email || !password || !firstName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const name = (firstName + ' ' + (lastName || '')).trim();
    
    const existing = db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(email.toLowerCase());
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const userId = 'usr_' + Date.now();
    db.prepare('INSERT INTO users (id, name, email, role) VALUES (?, ?, ?, ?)').run(userId, name, email.toLowerCase(), role);

    const sessionId = 'sess_' + Date.now();
    db.prepare('INSERT INTO sessions (id, user_id, role) VALUES (?, ?, ?)').run(sessionId, userId, role);

    res.cookie('session', sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.json({ success: true, role });
  } catch (err) {
    console.error('[auth:signup] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
module.exports = router;
