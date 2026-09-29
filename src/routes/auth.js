'use strict';
const express = require('express');
const { getDb } = require('../db/db');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const mailer = require('../utils/mailer');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

function checkPasswordStrength(password) {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
  return regex.test(password);
}

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

    if (!email || !pass) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.auth_provider !== 'local') {
      return res.status(400).json({ error: `Email used with ${user.auth_provider}` });
    }

    if (!user.password_hash || !bcrypt.compareSync(pass, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.isVerified === 0) {
      return res.status(403).json({ error: 'Please verify your email.' });
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

    return res.json({ success: true, role: user.role, profileComplete: user.profileComplete === 1 });

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
    const db = getDb();
    const user = db.prepare('SELECT name, profileComplete FROM users WHERE id = ?').get(req.session.userId);
    return res.json({ 
      loggedIn: true, 
      role: req.session.role,
      name: user ? user.name : '',
      profileComplete: user ? user.profileComplete === 1 : false
    });
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

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (!checkPasswordStrength(password)) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.' });
    }

    const name = (firstName + ' ' + (lastName || '')).trim();
    const emailLower = email.trim().toLowerCase();
    
    const existing = db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(emailLower);
    if (existing) {
      if (existing.auth_provider !== 'local') {
        return res.status(400).json({ error: `Email used with ${existing.auth_provider}` });
      }
      return res.status(400).json({ error: 'Email already registered' });
    }

    const userId = 'usr_' + Date.now();
    const password_hash = bcrypt.hashSync(password, 10);
    const verification_token = uuidv4();
    const verification_expiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    db.prepare(`
      INSERT INTO users (id, name, email, role, password_hash, isVerified, verification_token, verification_expiry, auth_provider) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, name, emailLower, role, password_hash, 0, verification_token, verification_expiry, 'local');

    mailer.sendVerificationEmail(emailLower, verification_token);

    return res.json({ success: true, message: 'Signup successful. Please verify your email.' });
  } catch (err) {
    console.error('[auth:signup] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/verify-email', (req, res) => {
  try {
    const token = req.query.token;
    if (!token) {
      return res.status(400).send('Token is required');
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE verification_token = ?').get(token);
    if (!user) {
      return res.status(400).send('Invalid or expired token');
    }

    if (new Date() > new Date(user.verification_expiry)) {
      return res.status(400).send('Invalid or expired token');
    }

    db.prepare('UPDATE users SET isVerified = 1, verification_token = NULL, verification_expiry = NULL WHERE id = ?').run(user.id);

    return res.redirect('/login');
  } catch (err) {
    console.error('[auth:verify] Error:', err);
    return res.status(500).send('Internal server error');
  }
});

router.post('/resend-verification', (req, res) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(email);
    if (!user || user.isVerified === 1 || user.auth_provider !== 'local') {
      return res.json({ success: true, message: 'If this email needs verification, we sent a link.' });
    }

    const verification_token = uuidv4();
    const verification_expiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    db.prepare('UPDATE users SET verification_token = ?, verification_expiry = ? WHERE id = ?').run(verification_token, verification_expiry, user.id);

    mailer.sendVerificationEmail(email, verification_token);

    return res.json({ success: true, message: 'If this email needs verification, we sent a link.' });
  } catch (err) {
    console.error('[auth:resend] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/forgot-password', (req, res) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(email);
    if (!user || user.auth_provider !== 'local') {
      return res.json({ success: true, message: 'If this email exists, we sent a link.' });
    }

    const reset_token = uuidv4();
    const reset_expiry = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    db.prepare('UPDATE users SET reset_token = ?, reset_expiry = ? WHERE id = ?').run(reset_token, reset_expiry, user.id);

    mailer.sendPasswordResetEmail(email, reset_token);

    return res.json({ success: true, message: 'If this email exists, we sent a link.' });
  } catch (err) {
    console.error('[auth:forgot] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/reset-password', (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    if (!checkPasswordStrength(newPassword)) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.' });
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE reset_token = ?').get(token);
    
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    if (new Date() > new Date(user.reset_expiry)) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    const password_hash = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE users SET password_hash = ?, reset_token = NULL, reset_expiry = NULL WHERE id = ?').run(password_hash, user.id);

    return res.json({ success: true, message: 'Password reset successful.' });
  } catch (err) {
    console.error('[auth:reset] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/google', async (req, res) => {
  try {
    const { access_token } = req.body;
    if (!access_token) return res.status(400).json({ error: 'No access token provided' });

    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    
    if (!userRes.ok) return res.status(400).json({ error: 'Invalid access token' });

    const googleUser = await userRes.json();
    let email = googleUser.email;
    if (!email) return res.status(400).json({ error: 'No email returned from Google' });
    email = email.toLowerCase();
    const name = googleUser.name;

    const db = getDb();
    let user = db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(email);

    if (!user) {
      const userId = 'usr_' + Date.now();
      db.prepare(`
        INSERT INTO users (id, name, email, role, auth_provider, isVerified, profileComplete)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(userId, name, email, 'participant', 'google', 1, 0);
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    } else {
      if (user.auth_provider !== 'google') {
        return res.status(400).json({ error: `Email used with ${user.auth_provider}` });
      }
    }

    let existing = db.prepare('SELECT * FROM sessions WHERE user_id = ?').get(user.id);
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

    return res.json({ success: true, profileComplete: user.profileComplete === 1, role: user.role });
  } catch (err) {
    console.error('[auth:google] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/complete-profile', (req, res) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { role, name, college, phone, organization, expertise } = req.body;
    const db = getDb();
    
    db.prepare(`
      UPDATE users 
      SET role = ?, name = ?, college = ?, phone = ?, organization = ?, expertise = ?, profileComplete = 1
      WHERE id = ?
    `).run(role || 'participant', name || 'Unknown', college || null, phone || null, organization || null, expertise || null, req.session.userId);

    db.prepare('UPDATE sessions SET role = ? WHERE id = ?').run(role || 'participant', req.session.sessionId);
    
    return res.json({ success: true, role: role || 'participant' });
  } catch (err) {
    console.error('[auth:complete-profile] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
