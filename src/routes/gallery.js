'use strict';
const express    = require('express');
const { getDb }  = require('../db/db');
const { v4: uuidv4 } = require('uuid');
const { checkRateLimit, logSuspiciousActivity, checkSpam, checkSelfVote } = require('../lib/safety');

const router = express.Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Safely parse a JSON column that may be null, undefined, or a string.
 * Returns the parsed value on success, or the `fallback` on any error.
 */
function parseJsonCol(raw, fallback = []) {
  if (raw == null) return fallback;
  if (Array.isArray(raw)) return raw;        // already parsed (future-proof)
  try { return JSON.parse(raw); } catch (_) { return fallback; }
}

/** Parse all JSON columns on a project row in-place. */
function hydrateProject(p) {
  if (!p) return p;
  p.technologies    = parseJsonCol(p.technologies);
  p.tags            = parseJsonCol(p.tags);
  p.required_skills = parseJsonCol(p.required_skills);
  p.screenshots     = parseJsonCol(p.screenshots);
  return p;
}

/**
 * Require an authenticated session for JSON API routes.
 * Returns 401 JSON if not logged in.
 */
function requireAuth(req, res, next) {
  if (!req.session) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  return next();
}

// ─── GET /projects ────────────────────────────────────────────────────────────
/**
 * Public project gallery with search, filtering, sorting, and pagination.
 *
 * Query params:
 *   q           – full-text search across title, summary, problem_statement,
 *                 solution, tags, technologies
 *   track       – filter by track_id
 *   difficulty  – beginner | intermediate | advanced
 *   status      – submitted | idea | in_development | completed | live |
 *                 open_for_contributors
 *   open_source – 1 | 0
 *   has_demo    – 1 (live_demo_url IS NOT NULL)
 *   contributors – 1 (looking_for_contributors = 1)
 *   sort        – newest | updated | views | votes | saves | trending
 *   page        – page number (default 1, 12 per page)
 */
router.get('/', (req, res) => {
  try {
    const db = getDb();

    const PAGE_SIZE = 12;
    const q           = (req.query.q           || '').trim();
    const track       = (req.query.track       || '').trim();
    const difficulty  = (req.query.difficulty  || '').trim();
    const status      = (req.query.status      || '').trim();
    const openSource  = req.query.open_source;
    const hasDemo     = req.query.has_demo;
    const contributors = req.query.contributors;
    const sort        = (req.query.sort || 'newest').trim();
    const page        = Math.max(1, parseInt(req.query.page, 10) || 1);
    const userId      = req.session ? req.session.userId : null;

    const params = [];

    // ── Base SELECT with aggregates ────────────────────────────────────────
    let sql = `
      SELECT
        p.id,
        p.title,
        p.summary,
        p.repo_url,
        p.status,
        p.submitted_at,
        p.updated_at,
        p.difficulty,
        p.build_time,
        p.open_source,
        p.license,
        p.live_demo_url,
        p.looking_for_contributors,
        p.problem_statement,
        p.solution,
        p.technologies,
        p.tags,
        p.thumbnail_url,
        p.view_count,
        p.track_id,
        t.name  AS team_name,
        tr.name AS track_name,
        -- aggregate counts
        (SELECT COUNT(*) FROM project_votes    pv  WHERE pv.project_id  = p.id) AS vote_count,
        (SELECT COUNT(*) FROM project_saves    ps  WHERE ps.project_id  = p.id) AS save_count,
        (SELECT COUNT(*) FROM project_comments pc  WHERE pc.project_id  = p.id) AS comment_count,
        -- trending sub-scores (last 7 days)
        (SELECT COUNT(*) FROM project_views    pvw
          WHERE pvw.project_id = p.id
            AND pvw.created_at >= datetime('now', '-7 days')) AS views_7d,
        (SELECT COUNT(*) FROM project_votes    pv2
          WHERE pv2.project_id = p.id
            AND pv2.created_at >= datetime('now', '-7 days')) AS votes_7d,
        (SELECT COUNT(*) FROM project_saves    ps2
          WHERE ps2.project_id = p.id
            AND ps2.created_at >= datetime('now', '-7 days')) AS saves_7d,
        (SELECT COUNT(*) FROM project_comments pc2
          WHERE pc2.project_id = p.id
            AND pc2.created_at >= datetime('now', '-7 days')) AS comments_7d
    `;

    // Add user-specific voted/saved columns only when logged in
    if (userId) {
      sql += `,
        (SELECT COUNT(*) FROM project_votes pv3
          WHERE pv3.project_id = p.id AND pv3.user_id = ?) AS user_voted,
        (SELECT COUNT(*) FROM project_saves ps3
          WHERE ps3.project_id = p.id AND ps3.user_id = ?) AS user_saved
      `;
      params.push(userId, userId);
    } else {
      sql += `, 0 AS user_voted, 0 AS user_saved`;
    }

    sql += `
      FROM projects p
      JOIN teams  t  ON t.id  = p.team_id
      LEFT JOIN tracks tr ON tr.id = p.track_id
      WHERE 1=1
    `;

    // ── Filters ────────────────────────────────────────────────────────────
    if (q) {
      // Search across multiple text columns
      const like = `%${q.toLowerCase()}%`;
      sql += ` AND (
        LOWER(p.title)             LIKE ? OR
        LOWER(p.summary)           LIKE ? OR
        LOWER(COALESCE(p.problem_statement,'')) LIKE ? OR
        LOWER(COALESCE(p.solution,''))          LIKE ? OR
        LOWER(COALESCE(p.tags,''))              LIKE ? OR
        LOWER(COALESCE(p.technologies,''))      LIKE ?
      )`;
      params.push(like, like, like, like, like, like);
    }

    if (track) {
      sql += ` AND p.track_id = ?`;
      params.push(track);
    }

    if (difficulty) {
      sql += ` AND p.difficulty = ?`;
      params.push(difficulty);
    }

    const tech = (req.query.tech || '').trim();
    if (tech) {
      const likeTech = `%${tech.toLowerCase()}%`;
      sql += ` AND LOWER(COALESCE(p.technologies,'')) LIKE ?`;
      params.push(likeTech);
    }

    const tag = (req.query.tag || '').trim();
    if (tag) {
      const likeTag = `%${tag.toLowerCase()}%`;
      sql += ` AND LOWER(COALESCE(p.tags,'')) LIKE ?`;
      params.push(likeTag);
    }

    const teamSize = parseInt(req.query.team_size, 10);
    if (teamSize && teamSize > 0) {
      if (teamSize >= 4) {
        sql += ` AND (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = p.team_id) >= ?`;
        params.push(4);
      } else {
        sql += ` AND (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = p.team_id) = ?`;
        params.push(teamSize);
      }
    }

    // ── Sorting ────────────────────────────────────────────────────────────
    switch (sort) {
      case 'updated':
        sql += ` ORDER BY COALESCE(p.updated_at, p.submitted_at) DESC`;
        break;
      case 'views':
        sql += ` ORDER BY p.view_count DESC, p.submitted_at DESC`;
        break;
      case 'votes':
        sql += ` ORDER BY vote_count DESC, p.submitted_at DESC`;
        break;
      case 'saves':
        sql += ` ORDER BY save_count DESC, p.submitted_at DESC`;
        break;
      case 'trending':
        // score = views_7d*1 + votes_7d*3 + saves_7d*2 + comments_7d*2
        sql += ` ORDER BY (views_7d * 1 + votes_7d * 3 + saves_7d * 2 + comments_7d * 2) DESC, p.submitted_at DESC`;
        break;
      default: // newest
        sql += ` ORDER BY p.submitted_at DESC`;
    }

    // ── Count query (same WHERE, no ORDER/LIMIT) ───────────────────────────
    // We build a subquery for total count
    const countSql = `SELECT COUNT(*) AS total FROM (${sql})`;
    const totalRow = db.prepare(countSql).get(...params);
    const total    = totalRow ? totalRow.total : 0;
    const pages    = Math.max(1, Math.ceil(total / PAGE_SIZE));

    // ── Pagination ─────────────────────────────────────────────────────────
    sql += ` LIMIT ? OFFSET ?`;
    params.push(PAGE_SIZE, (page - 1) * PAGE_SIZE);

    const projects = db.prepare(sql).all(...params).map(hydrateProject);
    const tracks   = db.prepare('SELECT * FROM tracks ORDER BY id').all();

    return res.render('gallery', {
      projects,
      tracks,
      total,
      page,
      pages,
      q,
      track,
      difficulty,
      tech,
      tag,
      team_size: teamSize || '',
      sort,
      session: req.session,
    });
  } catch (err) {
    console.error('[gallery] Error:', err.message);
    return res.status(500).render('error', {
      message: 'Failed to load gallery.',
      session: req.session,
    });
  }
});

// ─── GET /projects/:id ────────────────────────────────────────────────────────
/**
 * Full project detail page.
 * Records a view and increments view_count.
 * Loads team members, vote/save/comment counts, and similar projects.
 */
router.get('/:id', (req, res) => {
  try {
    const db      = getDb();
    const userId  = req.session ? req.session.userId : null;
    const role    = req.session ? req.session.role   : null;

    // ── Load project ───────────────────────────────────────────────────────
    const project = db.prepare(`
      SELECT
        p.*,
        t.name  AS team_name,
        tr.name AS track_name,
        (SELECT COUNT(*) FROM project_votes pv WHERE pv.project_id = p.id)    AS vote_count,
        (SELECT COUNT(*) FROM project_saves ps WHERE ps.project_id = p.id)    AS save_count,
        (SELECT COUNT(*) FROM project_comments pc WHERE pc.project_id = p.id) AS comment_count
      FROM projects p
      JOIN teams  t  ON t.id  = p.team_id
      LEFT JOIN tracks tr ON tr.id = p.track_id
      WHERE p.id = ?
    `).get(req.params.id);

    if (!project) {
      return res.status(404).render('error', {
        message: 'Project not found.',
        session: req.session,
      });
    }

    hydrateProject(project);

    // ── User-specific vote/save state ──────────────────────────────────────
    project.user_voted = false;
    project.user_saved = false;
    if (userId) {
      project.user_voted = !!db.prepare(
        'SELECT 1 FROM project_votes WHERE project_id = ? AND user_id = ?'
      ).get(req.params.id, userId);
      project.user_saved = !!db.prepare(
        'SELECT 1 FROM project_saves WHERE project_id = ? AND user_id = ?'
      ).get(req.params.id, userId);
    }

    // ── Judge context: is this judge assigned to this project? ─────────────
    let judgeAssignment = null;
    let judgeScore      = null;
    let selectedJudgeEvent = null;

    if (role === 'judge' && userId) {
      judgeAssignment = db.prepare(
        'SELECT * FROM judge_assignments WHERE judge_id = ? AND project_id = ?'
      ).get(userId, req.params.id);

      if (judgeAssignment) {
        judgeScore = db.prepare(
          'SELECT * FROM scores WHERE judge_id = ? AND project_id = ?'
        ).get(userId, req.params.id);
        if (judgeScore && judgeScore.criteria_scores) {
          try { judgeScore.criteria_scores = JSON.parse(judgeScore.criteria_scores); } catch (_) {}
        }

        // Load the event for this project to set judge nav context
        selectedJudgeEvent = db.prepare('SELECT * FROM events WHERE id = ?').get(project.event_id) || null;
        if (req.session && selectedJudgeEvent) {
          req.session.selectedJudgeEventId = selectedJudgeEvent.id;
        }
        res.locals.selectedJudgeEvent = selectedJudgeEvent;

        // Auto-mark as in_progress when judge opens a pending project
        if (judgeAssignment.status === 'pending') {
          db.prepare("UPDATE judge_assignments SET status = 'in_progress', started_at = ? WHERE judge_id = ? AND project_id = ?")
            .run(new Date().toISOString(), userId, req.params.id);
          judgeAssignment.status = 'in_progress';
        }
      }
    }

    // ── Load event and voting state ────────────────────────────────────────
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(project.event_id) || null;
    const nowTime = Date.now();
    const votingOpenTime  = event && event.voting_open ? new Date(event.voting_open).getTime() : null;
    const votingCloseTime = event && event.voting_close ? new Date(event.voting_close).getTime() : null;

    const votingNotStarted = votingOpenTime ? (nowTime < votingOpenTime) : false;
    const votingClosed     = votingCloseTime ? (nowTime > votingCloseTime) : false;
    const votingOpen       = !votingNotStarted && !votingClosed;

    // ── Team members ───────────────────────────────────────────────────────
    const members = db.prepare(`
      SELECT
        u.id,
        u.name,
        u.email,
        COALESCE(NULLIF(tm.role, ''), CASE WHEN t.leader_id = u.id THEN 'Team Leader' ELSE 'Member' END) AS role
      FROM team_members tm
      JOIN teams t ON t.id = tm.team_id
      JOIN users u ON u.id = tm.user_id
      WHERE tm.team_id = ?
      ORDER BY CASE WHEN t.leader_id = u.id THEN 0 ELSE 1 END, u.name ASC
    `).all(project.team_id);

    // ── Comments & Replies (threaded) ──────────────────────────────────────
    const allComments = db.prepare(`
      SELECT
        c.id,
        c.content,
        c.parent_id,
        c.created_at,
        u.name AS author_name,
        u.id   AS author_id
      FROM project_comments c
      JOIN users u ON u.id = c.user_id
      WHERE c.project_id = ?
      ORDER BY c.created_at ASC
    `).all(req.params.id);

    const commentsMap = {};
    const topLevelComments = [];

    for (const c of allComments) {
      c.replies = [];
      commentsMap[c.id] = c;
      if (!c.parent_id) {
        topLevelComments.push(c);
      }
    }

    for (const c of allComments) {
      if (c.parent_id && commentsMap[c.parent_id]) {
        commentsMap[c.parent_id].replies.push(c);
      }
    }

    // Pass topLevelComments reverse sorted for latest discussion first
    const comments = topLevelComments.reverse();

    // ── Similar projects (same track OR overlapping tags/technologies) ─────
    // Use LIKE heuristic on the JSON columns; limit 4, exclude self
    const techLike = project.technologies.length
      ? `%${project.technologies[0]}%`
      : '%';
    const tagLike  = project.tags.length
      ? `%${project.tags[0]}%`
      : '%';

    const similar = db.prepare(`
      SELECT
        p.id, p.title, p.summary, p.thumbnail_url, p.difficulty,
        p.technologies, p.tags, tr.name AS track_name,
        (SELECT COUNT(*) FROM project_votes pv WHERE pv.project_id = p.id) AS vote_count
      FROM projects p
      LEFT JOIN tracks tr ON tr.id = p.track_id
      WHERE p.id != ?
        AND (
          p.track_id = ?
          OR LOWER(COALESCE(p.technologies,'')) LIKE ?
          OR LOWER(COALESCE(p.tags,''))         LIKE ?
        )
      ORDER BY p.submitted_at DESC
      LIMIT 4
    `).all(req.params.id, project.track_id, techLike.toLowerCase(), tagLike.toLowerCase())
      .map(hydrateProject);

    // ── Record view ────────────────────────────────────────────────────────
    const viewId = uuidv4();
    const now    = new Date().toISOString();
    db.prepare(
      'INSERT INTO project_views (id, project_id, user_id, created_at) VALUES (?, ?, ?, ?)'
    ).run(viewId, req.params.id, userId || null, now);

    // Increment cached view_count on the project row
    db.prepare(
      'UPDATE projects SET view_count = view_count + 1 WHERE id = ?'
    ).run(req.params.id);

    project.view_count = (project.view_count || 0) + 1;

    return res.render('project-detail', {
      project,
      event,
      votingClosed,
      votingOpen,
      votingNotStarted,
      members,
      comments,
      similar,
      judgeAssignment,
      judgeScore,
      selectedJudgeEvent,
      session: req.session,
    });
  } catch (err) {
    console.error('[gallery:detail] Error:', err.message);
    return res.status(500).render('error', {
      message: 'Failed to load project.',
      session: req.session,
    });
  }
});


// ─── POST /api/projects/:id/vote ─────────────────────────────────────────────
/**
 * Toggle vote for the authenticated user.
 * Includes Safety: Duplicate Vote Protection, Self-Vote Prevention, Rate Limiting & Suspicious Activity Tracking.
 * Returns JSON: { voted: bool, count: number }
 */
router.post('/:id/vote', requireAuth, (req, res) => {
  try {
    const db        = getDb();
    const projectId = req.params.id;
    const userId    = req.session.userId;
    const ip        = req.ip || req.connection?.remoteAddress || '127.0.0.1';
    const now       = new Date().toISOString();

    // Check event voting window (Voting closes -> Results published)
    const prj = db.prepare('SELECT event_id FROM projects WHERE id = ?').get(projectId);
    if (prj && prj.event_id) {
      const evt = db.prepare('SELECT * FROM events WHERE id = ?').get(prj.event_id);
      if (evt) {
        const nowMs = Date.now();
        if (evt.voting_close && nowMs > new Date(evt.voting_close).getTime()) {
          return res.status(403).json({ error: 'Voting has closed for this event. Check out the Leaderboard & Results!' });
        }
        if (evt.voting_open && nowMs < new Date(evt.voting_open).getTime()) {
          return res.status(403).json({ error: 'Voting has not opened yet for this event.' });
        }
      }
    }

    // 1. Rate Limiting Protection (Safety)
    const rateLimitKey = `vote:${userId || ip}`;
    const rateCheck = checkRateLimit(rateLimitKey, 10, 30000);
    if (!rateCheck.allowed) {
      logSuspiciousActivity(db, userId, ip, 'rate_limit_vote_exceeded', `Excessive voting attempts on project ${projectId}`);
      return res.status(429).json({ error: 'Voting too fast. Please wait a few seconds before voting again.' });
    }

    // 2. Duplicate / Self-Vote Protection (Safety)
    if (checkSelfVote(db, projectId, userId)) {
      logSuspiciousActivity(db, userId, ip, 'self_vote_attempt', `User ${userId} attempted to vote for own project ${projectId}`);
      return res.status(403).json({ error: 'Self-Vote Protection: You cannot vote for your own team’s project.' });
    }

    const existing = db.prepare(
      'SELECT 1 FROM project_votes WHERE project_id = ? AND user_id = ?'
    ).get(projectId, userId);

    let voted;
    if (existing) {
      db.prepare(
        'DELETE FROM project_votes WHERE project_id = ? AND user_id = ?'
      ).run(projectId, userId);
      voted = false;
    } else {
      db.prepare(
        'INSERT INTO project_votes (project_id, user_id, created_at) VALUES (?, ?, ?)'
      ).run(projectId, userId, now);
      voted = true;
    }

    const { count } = db.prepare(
      'SELECT COUNT(*) AS count FROM project_votes WHERE project_id = ?'
    ).get(projectId);

    return res.json({ voted, count });
  } catch (err) {
    console.error('[gallery:vote] Error:', err.message);
    return res.status(500).json({ error: 'Failed to toggle vote.' });
  }
});

// ─── POST /api/projects/:id/save ─────────────────────────────────────────────
/**
 * Toggle save for the authenticated user.
 * Returns JSON: { saved: bool, count: number }
 */
router.post('/:id/save', requireAuth, (req, res) => {
  try {
    const db        = getDb();
    const projectId = req.params.id;
    const userId    = req.session.userId;
    const now       = new Date().toISOString();

    const existing = db.prepare(
      'SELECT 1 FROM project_saves WHERE project_id = ? AND user_id = ?'
    ).get(projectId, userId);

    let saved;
    if (existing) {
      db.prepare(
        'DELETE FROM project_saves WHERE project_id = ? AND user_id = ?'
      ).run(projectId, userId);
      saved = false;
    } else {
      db.prepare(
        'INSERT INTO project_saves (project_id, user_id, created_at) VALUES (?, ?, ?)'
      ).run(projectId, userId, now);
      saved = true;
    }

    const { count } = db.prepare(
      'SELECT COUNT(*) AS count FROM project_saves WHERE project_id = ?'
    ).get(projectId);

    return res.json({ saved, count });
  } catch (err) {
    console.error('[gallery:save] Error:', err.message);
    return res.status(500).json({ error: 'Failed to toggle save.' });
  }
});

// ─── POST /api/projects/:id/comment ──────────────────────────────────────────
/**
 * Add a comment or reply on a project for the authenticated user.
 * Body: { content: string, parent_id?: string }
 * Includes Safety: Spam Protection, Rate Limiting & Suspicious Activity Tracking.
 * Returns JSON: { id, content, author, created_at, parent_id }
 */
router.post(['/:id/comment', '/:id/comments'], requireAuth, (req, res) => {
  try {
    const db        = getDb();
    const projectId = req.params.id;
    const userId    = req.session.userId;
    const ip        = req.ip || req.connection?.remoteAddress || '127.0.0.1';
    const content   = (req.body.content || '').trim();
    const parentId  = req.body.parent_id ? String(req.body.parent_id).trim() : null;

    // 1. Rate Limiting Protection (Safety)
    const rateCheck = checkRateLimit(`comment:${userId || ip}`, 6, 60000);
    if (!rateCheck.allowed) {
      logSuspiciousActivity(db, userId, ip, 'rate_limit_comment_exceeded', `Excessive comments on project ${projectId}`);
      return res.status(429).json({ error: 'Posting comments too rapidly. Please wait a moment.' });
    }

    // 2. Spam Protection (Safety)
    const spamResult = checkSpam(content, userId, db);
    if (spamResult.isSpam) {
      logSuspiciousActivity(db, userId, ip, 'spam_comment_blocked', spamResult.reason);
      return res.status(400).json({ error: spamResult.reason });
    }

    // Ensure the project exists
    const exists = db.prepare('SELECT 1 FROM projects WHERE id = ?').get(projectId);
    if (!exists) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    // If replying, ensure the parent comment exists and belongs to this project
    if (parentId) {
      const parentComment = db.prepare('SELECT id FROM project_comments WHERE id = ? AND project_id = ?').get(parentId, projectId);
      if (!parentComment) {
        return res.status(400).json({ error: 'Parent comment not found.' });
      }
    }

    const id  = uuidv4();
    const now = new Date().toISOString();

    db.prepare(
      'INSERT INTO project_comments (id, project_id, user_id, parent_id, content, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, projectId, userId, parentId, content, now);

    // Fetch author name to return in response
    const user = db.prepare('SELECT name FROM users WHERE id = ?').get(userId);

    return res.status(201).json({
      id,
      content,
      parent_id: parentId,
      author:    user ? user.name : 'Unknown',
      created_at: now,
    });
  } catch (err) {
    console.error('[gallery:comment] Error:', err.message);
    return res.status(500).json({ error: 'Failed to post comment.' });
  }
});

// ─── POST /api/projects/:id/report ───────────────────────────────────────────
/**
 * Report a project or comment for community safety and moderation.
 * Body: { reason: string, details?: string, comment_id?: string }
 */
router.post(['/:id/report', '/:id/reports'], requireAuth, (req, res) => {
  try {
    const db        = getDb();
    const projectId = req.params.id;
    const userId    = req.session.userId;
    const ip        = req.ip || req.connection?.remoteAddress || '127.0.0.1';
    const reason    = (req.body.reason || '').trim();
    const details   = (req.body.details || '').trim();
    const commentId = req.body.comment_id ? String(req.body.comment_id).trim() : null;

    if (!reason) {
      return res.status(400).json({ error: 'Please choose or provide a reason for reporting.' });
    }

    // Rate Limiting (Safety)
    const rateCheck = checkRateLimit(`report:${userId || ip}`, 4, 60000);
    if (!rateCheck.allowed) {
      logSuspiciousActivity(db, userId, ip, 'rate_limit_report_exceeded', `Excessive reports filed`);
      return res.status(429).json({ error: 'Too many reports submitted. Please wait a minute.' });
    }

    const id  = `rep_${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO project_reports (id, project_id, comment_id, user_id, reason, details, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
    `).run(id, projectId, commentId, userId, reason, details, now);

    return res.status(201).json({
      message: 'Report submitted successfully. Our team will review this project promptly.',
      reportId: id
    });
  } catch (err) {
    console.error('[gallery:report] Error:', err.message);
    return res.status(500).json({ error: 'Failed to submit report.' });
  }
});

module.exports = router;
