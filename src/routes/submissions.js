'use strict';
const express = require('express');
const { getDb } = require('../db/db');
const requireRole = require('../middleware/requireRole');
const { ACTIVE_EVENT_ID } = require('../lib/config');

const router = express.Router();

/**
 * GET /submissions/new
 * Render the submission form (participant only).
 */
router.get('/new', requireRole('participant'), (req, res) => {
  try {
    const db = getDb();
    const eventId = req.query.event_id || req.session?.selectedParticipantEventId || ACTIVE_EVENT_ID;
    const event  = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId) ||
                   db.prepare('SELECT * FROM events WHERE id = ?').get(ACTIVE_EVENT_ID);

    if (req.session && event) {
      req.session.selectedParticipantEventId = event.id;
    }
    res.locals.selectedParticipantEvent = event;

    let tracks = db.prepare('SELECT * FROM tracks WHERE event_id = ? ORDER BY id').all(event.id);
    if (!tracks || tracks.length === 0) {
      tracks = db.prepare('SELECT * FROM tracks ORDER BY id').all();
    }

    const closed = event && event.submissions_close && new Date() > new Date(event.submissions_close);

    const userTeams = db.prepare(`
      SELECT t.id, t.name
      FROM teams t
      JOIN team_members tm ON tm.team_id = t.id
      WHERE tm.user_id = ? AND t.event_id = ?
    `).all(req.session.userId, event.id);

    return res.render('submit', {
      event,
      tracks,
      userTeams,
      closed,
      session: req.session,
      selectedParticipantEvent: event,
      error: null
    });

  } catch (err) {
    console.error('[submissions:new] Error:', err.message);
    return res.status(500).render('error', {
      message: 'Failed to load submission form.',
      session: req.session
    });
  }
});

/**
 * POST /api/submissions
 * Create a new project submission.
 */
router.post('/', requireRole('participant'), (req, res) => {
  try {
    const db = getDb();
    const eventId = (req.body.event_id || req.session?.selectedParticipantEventId || ACTIVE_EVENT_ID).trim();
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);

    if (!event) {
      return res.status(400).json({ error: 'Event not found' });
    }

    // Deadline check — this will always be true for the fixture event (closed 2026-03-01)
    if (event.submissions_close && new Date() > new Date(event.submissions_close)) {
      return res.status(400).json({ error: 'Submissions closed' });
    }

    const { title, summary, repo_url, track_id, team_id } = req.body;

    if (!title || !track_id || !team_id) {
      return res.status(400).json({ error: 'title, track_id, and team_id are required' });
    }

    // Verify user is member of the given team
    const userId    = req.session.userId;
    const membership = db.prepare(
      'SELECT 1 FROM team_members WHERE team_id = ? AND user_id = ?'
    ).get(team_id, userId);

    if (!membership) {
      return res.status(403).json({ error: 'You are not a member of this team' });
    }

    const now = new Date().toISOString();
    const id  = `prj_${Date.now()}`;

    db.prepare(`
      INSERT INTO projects (id, event_id, team_id, track_id, title, summary, repo_url, status, submitted_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'submitted', ?, ?)
    `).run(id, event.id, team_id, track_id, title, summary || '', repo_url || '', now, now);

    // Audit log
    db.prepare(
      'INSERT INTO audit_log (id, actor_id, action, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(`al_${Date.now()}`, userId, 'project_submitted', id, title, now);

    const isHtml = req.headers['content-type']?.includes('application/x-www-form-urlencoded') || (!req.is('json') && req.accepts('html'));
    if (isHtml) {
      return res.redirect(`/projects/${id}`);
    }

    return res.status(201).json({ message: 'Project submitted', id });
  } catch (err) {
    console.error('[submissions POST] Error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/submissions/:id
 * Update an existing submission.
 */
router.patch('/:id', requireRole('participant'), (req, res) => {
  try {
    const db = getDb();
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(ACTIVE_EVENT_ID);


    if (!event) {
      return res.status(400).json({ error: 'Event not found' });
    }

    if (new Date() > new Date(event.submissions_close)) {
      return res.status(400).json({ error: 'Submissions closed' });
    }

    const projectId = req.params.id;
    const project   = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Verify user is member of the project's team
    const userId = req.session.userId;
    const membership = db.prepare(
      'SELECT 1 FROM team_members WHERE team_id = ? AND user_id = ?'
    ).get(project.team_id, userId);

    if (!membership) {
      return res.status(403).json({ error: 'You are not a member of this project team' });
    }

    const { title, summary, repo_url, track_id } = req.body;
    const updates = {};
    if (title    !== undefined) updates.title    = title;
    if (summary  !== undefined) updates.summary  = summary;
    if (repo_url !== undefined) updates.repo_url = repo_url;
    if (track_id !== undefined) updates.track_id = track_id;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No updatable fields provided' });
    }

    const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    const values     = [...Object.values(updates), projectId];
    db.prepare(`UPDATE projects SET ${setClauses} WHERE id = ?`).run(...values);

    const now = new Date().toISOString();
    db.prepare(
      'INSERT INTO audit_log (id, actor_id, action, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(`al_${Date.now()}`, userId, 'project_updated', projectId, JSON.stringify(updates), now);

    return res.status(200).json({ message: 'Project updated' });
  } catch (err) {
    console.error('[submissions PATCH] Error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
