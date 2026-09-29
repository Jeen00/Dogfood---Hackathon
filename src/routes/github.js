'use strict';
const express = require('express');
const router  = express.Router();
const { getDb } = require('../db/db');

const CLIENT_ID     = process.env.GITHUB_CLIENT_ID;
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const REDIRECT_URI  = 'http://localhost:8080/auth/github/callback';
const FRONTEND_URL  = 'http://localhost:5173';

// Step 1: Redirect user to GitHub authorization page
router.get('/auth/github', (req, res) => {
  const params = new URLSearchParams({
    client_id:    CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope:        'read:user user:email',
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

// Step 2: GitHub redirects back here with a code
router.get('/auth/github/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.redirect(`${FRONTEND_URL}/login?error=no_code`);

  try {
    // Exchange code for access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, code, redirect_uri: REDIRECT_URI }),
    });
    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) return res.redirect(`${FRONTEND_URL}/login?error=token_failed`);

    // Fetch GitHub user profile
    const userRes = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'DOGFOOD-2026' },
    });
    const githubUser = await userRes.json();

    let email = githubUser.email;
    if (!email) {
      // Fetch emails
      const emailsRes = await fetch('https://api.github.com/user/emails', {
        headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'DOGFOOD-2026' }
      });
      const emails = await emailsRes.json();
      const primaryEmail = emails.find(e => e.primary);
      if (primaryEmail) email = primaryEmail.email;
      else if (emails.length > 0) email = emails[0].email;
    }

    if (!email) return res.redirect(`${FRONTEND_URL}/login?error=no_email`);
    email = email.toLowerCase();
    const name = githubUser.name || githubUser.login;

    const db = getDb();
    let user = db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(email);

    if (!user) {
      // create user
      const userId = 'usr_' + Date.now();
      db.prepare(`
        INSERT INTO users (id, name, email, role, auth_provider, isVerified, profileComplete)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(userId, name, email, 'participant', 'github', 1, 0);
      
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    } else {
      if (user.auth_provider !== 'github') {
        return res.redirect(`${FRONTEND_URL}/login?error=email_exists`);
      }
    }

    // create session
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

    if (user.profileComplete === 1) {
      if (user.role === 'judge') return res.redirect(`${FRONTEND_URL}/judge/dashboard`);
      else if (user.role === 'organizer') return res.redirect(`${FRONTEND_URL}/organizer/events`);
      else return res.redirect(`${FRONTEND_URL}/participant/dashboard`);
    } else {
      return res.redirect(`${FRONTEND_URL}/complete-profile`);
    }
  } catch (err) {
    console.error('GitHub OAuth error:', err);
    res.redirect(`${FRONTEND_URL}/login?error=server_error`);
  }
});

module.exports = router;
