'use strict';
const express = require('express');
const { getDb } = require('../db/db');

const router = express.Router();

/**
 * Authentication middleware for participant pages.
 * Redirects to /login if unauthenticated for HTML requests, or returns 401 JSON.
 */
function requireParticipantAuth(req, res, next) {
  if (!req.session) {
    if (req.accepts('html') && !req.is('json') && !req.headers['accept']?.includes('application/json')) {
      return res.redirect('/login?error=' + encodeURIComponent('Please log in to view your profile.'));
    }
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (req.session.role !== 'participant') {
    if (req.session.role === 'judge') return res.redirect('/judge/profile');
    if (req.session.role === 'organizer' || req.session.role === 'admin') return res.redirect('/organizer/events');
    return res.status(403).render('error', { message: 'Access forbidden: Participant role required.', session: req.session });
  }

  return next();
}

/**
 * GET /participant/profile
 * Participant profile view displaying personal info, statistics, teams, projects, and activity.
 */
router.get('/profile', requireParticipantAuth, (req, res) => {
  try {
    const db = getDb();
    const userId = req.session.userId;

    const user = db.prepare(`
      SELECT id, name, email, role, bio, github_username, linkedin_url, website_url, skills, avatar_url
      FROM users
      WHERE id = ?
    `).get(userId);

    if (!user) {
      return res.status(404).render('error', { message: 'Participant profile not found.', session: req.session });
    }

    // Teams across all hackathons
    const teams = db.prepare(`
      SELECT t.id, t.name, t.invite_code, t.leader_id, t.event_id,
             e.name AS event_name, e.submissions_close, e.voting_close,
             tm.role AS member_role,
             p.id AS project_id, p.title AS project_title, p.status AS project_status, p.repo_url, p.live_demo_url,
             tr.name AS track_name
      FROM team_members tm
      JOIN teams t ON t.id = tm.team_id
      JOIN events e ON e.id = t.event_id
      LEFT JOIN projects p ON p.team_id = t.id AND p.event_id = e.id
      LEFT JOIN tracks tr ON tr.id = p.track_id
      WHERE tm.user_id = ?
      ORDER BY e.submissions_close DESC
    `).all(userId);

    // Teammates for each team
    for (const team of teams) {
      team.members = db.prepare(`
        SELECT u.id, u.name, u.email, tm.role, (u.id = ?) AS is_current_user
        FROM team_members tm
        JOIN users u ON u.id = tm.user_id
        WHERE tm.team_id = ?
      `).all(userId, team.id);
      team.isLeader = (team.leader_id === userId);
    }

    // Aggregate statistics
    const stats = {
      total_hackathons: db.prepare(`
        SELECT COUNT(DISTINCT t.event_id) AS c
        FROM team_members tm
        JOIN teams t ON t.id = tm.team_id
        WHERE tm.user_id = ?
      `).get(userId)?.c || 0,
      total_teams: teams.length,
      teams_led: teams.filter(t => t.isLeader).length,
      submitted_projects: teams.filter(t => t.project_id && t.project_status === 'submitted').length,
      community_votes: db.prepare(`
        SELECT COUNT(*) AS c FROM project_votes WHERE user_id = ?
      `).get(userId)?.c || 0,
      comments_count: db.prepare(`
        SELECT COUNT(*) AS c FROM project_comments WHERE user_id = ?
      `).get(userId)?.c || 0
    };

    // Recent votes
    const votedProjects = db.prepare(`
      SELECT p.id, p.title, e.name AS event_name, pv.created_at
      FROM project_votes pv
      JOIN projects p ON p.id = pv.project_id
      JOIN events e ON e.id = p.event_id
      WHERE pv.user_id = ?
      ORDER BY pv.created_at DESC
      LIMIT 5
    `).all(userId);

    // Recent comments
    const recentComments = db.prepare(`
      SELECT c.id, c.content, c.created_at, p.id AS project_id, p.title AS project_title
      FROM project_comments c
      JOIN projects p ON p.id = c.project_id
      WHERE c.user_id = ?
      ORDER BY c.created_at DESC
      LIMIT 5
    `).all(userId);

    // Pending team invitations
    const pendingInvites = db.prepare(`
      SELECT ti.*, t.name AS team_name, e.name AS event_name, u.name AS inviter_name
      FROM team_invitations ti
      JOIN teams t ON t.id = ti.team_id
      JOIN events e ON e.id = t.event_id
      JOIN users u ON u.id = ti.inviter_id
      WHERE ti.invitee_id = ? AND ti.status = 'pending'
      ORDER BY ti.created_at DESC
    `).all(userId);

    if (req.accepts('json') && !req.accepts('html')) {
      return res.json({
        user,
        stats,
        teams,
        votedProjects,
        recentComments,
        pendingInvites
      });
    }

    return res.render('participant/profile', {
      user,
      stats,
      teams,
      votedProjects,
      recentComments,
      pendingInvites,
      session: req.session,
      selectedParticipantEvent: null,
      success: req.query.success || null,
      error: req.query.error || null
    });
  } catch (err) {
    console.error('[participant:profile GET] Error:', err);
    if (req.accepts('json') && !req.accepts('html')) {
      return res.status(500).json({ error: 'Failed to load profile' });
    }
    return res.status(500).render('error', { message: 'Failed to load participant profile.', session: req.session });
  }
});

/**
 * POST /participant/profile
 * Update participant profile details (name, bio, github, linkedin, website, skills).
 */
router.post('/profile', requireParticipantAuth, (req, res) => {
  try {
    const db = getDb();
    const userId = req.session.userId;

    const name = (req.body.name || '').trim();
    const bio = (req.body.bio || '').trim();
    const github_username = (req.body.github_username || '').trim().replace(/^@/, '');
    const linkedin_url = (req.body.linkedin_url || '').trim();
    const website_url = (req.body.website_url || '').trim();
    const skills = (req.body.skills || '').trim();

    if (!name) {
      if (req.is('json') || req.headers['accept']?.includes('application/json')) {
        return res.status(400).json({ error: 'Name is required' });
      }
      return res.redirect('/participant/profile?error=' + encodeURIComponent('Full name is required.'));
    }

    db.prepare(`
      UPDATE users
      SET name = ?, bio = ?, github_username = ?, linkedin_url = ?, website_url = ?, skills = ?
      WHERE id = ?
    `).run(name, bio, github_username, linkedin_url, website_url, skills, userId);

    // Update name in session
    if (req.session) {
      req.session.name = name;
    }

    if (req.is('json') || req.headers['accept']?.includes('application/json')) {
      const updatedUser = db.prepare('SELECT id, name, email, role, bio, github_username, linkedin_url, website_url, skills FROM users WHERE id = ?').get(userId);
      return res.json({ success: true, message: 'Profile updated successfully', user: updatedUser });
    }

    return res.redirect('/participant/profile?success=' + encodeURIComponent('Profile updated successfully!'));
  } catch (err) {
    console.error('[participant:profile POST] Error:', err);
    if (req.is('json') || req.headers['accept']?.includes('application/json')) {
      return res.status(500).json({ error: 'Failed to update profile' });
    }
    return res.redirect('/participant/profile?error=' + encodeURIComponent('An error occurred while saving your profile.'));
  }
});

module.exports = router;
