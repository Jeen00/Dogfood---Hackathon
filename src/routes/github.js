'use strict';
const express = require('express');
const router  = express.Router();

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
    const user = await userRes.json();

    // For demo: set a simple session cookie and redirect to dashboard
    // In production, you'd look up/create the user in the DB here
    res.cookie('github_user', JSON.stringify({ id: user.id, login: user.login, avatar: user.avatar_url }), {
      httpOnly: false,
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    // Redirect to frontend dashboard
    res.redirect(`${FRONTEND_URL}/judge/dashboard?github=success&user=${encodeURIComponent(user.login)}`);

  } catch (err) {
    console.error('GitHub OAuth error:', err);
    res.redirect(`${FRONTEND_URL}/login?error=server_error`);
  }
});

module.exports = router;
