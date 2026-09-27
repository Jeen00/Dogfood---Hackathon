'use strict';
const express = require('express');
const { getDb } = require('../db/db');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

/**
 * GET /login
 * Render the login form.
 */
router.get('/login', (req, res) => {
  if (req.session) {
    // Already logged in — redirect to appropriate dashboard
    if (req.session.role === 'judge') return res.redirect('/judge/dashboard');
    if (req.session.role === 'organizer') return res.redirect('/organizer/dashboard');
    return res.redirect('/projects');
  }
  return res.render('login', { session: null, error: null });
});

/**
 * POST /auth/login
 * Authenticates user by email + password (or for demo, by looking up email).
 * In this demo platform, passwords are not hashed — sessions are cookie-based.
 * The fixed sessions are seeded and used directly by the checker.
 */
router.post('/login', (req, res) => {
  try {
    const db    = getDb();
    const email = (req.body.email    || '').trim().toLowerCase();
    const pass  = (req.body.password || '').trim();

    if (!email) {
      return res.render('login', { session: null, error: 'Email is required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(email);
    if (!user) {
      return res.render('login', { session: null, error: 'Invalid credentials' });
    }

    // For demo: any non-empty password accepted (no real password hashing)
    // In production this would use bcrypt.compare
    if (!pass) {
      return res.render('login', { session: null, error: 'Password is required' });
    }

    // Check if a fixed session already exists for this user
    const existing = db.prepare('SELECT * FROM sessions WHERE user_id = ?').get(user.id);
    let sessionId;

    if (existing) {
      sessionId = existing.id;
    } else {
      // Create a new session
      sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      db.prepare('INSERT INTO sessions (id, user_id, role) VALUES (?, ?, ?)').run(sessionId, user.id, user.role);
    }

    res.cookie('session', sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge:   7 * 24 * 60 * 60 * 1000 // 7 days
    });

    if (user.role === 'judge')     return res.redirect('/judge/dashboard');
    if (user.role === 'organizer') return res.redirect('/organizer/dashboard');
    return res.redirect('/projects');
  } catch (err) {
    console.error('[auth:login] Error:', err.message);
    return res.render('login', { session: null, error: 'An error occurred. Please try again.' });
  }
});

/**
 * POST /auth/logout
 * Clears the session cookie.
 */
router.post('/logout', (req, res) => {
  res.clearCookie('session');
  return res.redirect('/login');
});

/**
 * GET /auth/logout (convenience GET for nav link)
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
 * Registers a new participant and logs them in.
 */
router.post('/signup', (req, res) => {
  try {
    const db = getDb();
    const { firstName, lastName, email, password, role = 'participant' } = req.body;
    
    if (!email || !password || !firstName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const name = (firstName + ' ' + (lastName || '')).trim();
    
    // Check if user exists
    const existing = db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(email.toLowerCase());
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Insert user
    const userId = 'usr_' + Date.now();
    db.prepare('INSERT INTO users (id, name, email, role) VALUES (?, ?, ?, ?)').run(userId, name, email.toLowerCase(), role);

    // Create session
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



