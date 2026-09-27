'use strict';
const express      = require('express');
const cookieParser = require('cookie-parser');
const path         = require('path');

const initDb  = require('./db/init');
const seedDb  = require('./db/seed');
const auth    = require('./middleware/auth');

const galleryRouter       = require('./routes/gallery');
const authRouter          = require('./routes/auth');
const eventsRouter        = require('./routes/events');
const teamsRouter         = require('./routes/teams');
const submissionsRouter   = require('./routes/submissions');
const judgeRouter         = require('./routes/judge');
const organizerRouter     = require('./routes/organizer');
const exportRouter        = require('./routes/export');
const normalizationRouter = require('./routes/normalization');

const app  = express();
const PORT = process.env.PORT || 8080;

// ─── View engine ─────────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(auth);

// ─── Judge page routes (server-rendered) ─────────────────────────────────────
const requireRole = require('./middleware/requireRole');
const { getDb }   = require('./db/db');

app.get('/judge/dashboard', requireRole('judge'), (req, res) => {
  try {
    const db      = getDb();
    const judgeId = req.session.userId;

    const assignments = db.prepare(`
      SELECT
        p.id, p.title, p.summary, p.submitted_at,
        tr.name AS track_name,
        t.name  AS team_name,
        CASE WHEN s.id IS NOT NULL THEN 1 ELSE 0 END AS scored
      FROM judge_assignments ja
      JOIN projects p  ON p.id  = ja.project_id
      JOIN tracks   tr ON tr.id = p.track_id
      JOIN teams    t  ON t.id  = p.team_id
      LEFT JOIN scores s ON s.judge_id = ja.judge_id AND s.project_id = ja.project_id
      WHERE ja.judge_id = ?
      ORDER BY scored ASC, p.submitted_at DESC
    `).all(judgeId);

    return res.render('judge/dashboard', { assignments, session: req.session });
  } catch (err) {
    console.error('[judge:dashboard]', err.message);
    return res.status(500).render('error', { message: 'Failed to load dashboard.', session: req.session });
  }
});

app.get('/judge/score/:project_id', requireRole('judge'), (req, res) => {
  try {
    const db        = getDb();
    const judgeId   = req.session.userId;
    const projectId = req.params.project_id;

    const assignment = db.prepare(
      'SELECT id FROM judge_assignments WHERE judge_id = ? AND project_id = ?'
    ).get(judgeId, projectId);

    if (!assignment) {
      return res.status(403).render('error', { message: 'Project not assigned to you.', session: req.session });
    }

    const project = db.prepare(`
      SELECT p.*, t.name AS team_name, tr.name AS track_name
      FROM projects p
      JOIN teams  t  ON t.id  = p.team_id
      JOIN tracks tr ON tr.id = p.track_id
      WHERE p.id = ?
    `).get(projectId);

    const existing = db.prepare(
      'SELECT * FROM scores WHERE judge_id = ? AND project_id = ?'
    ).get(judgeId, projectId);

    const existingScores = existing
      ? JSON.parse(existing.criteria_scores)
      : {};

    const criteria = db.prepare('SELECT * FROM rubric_criteria WHERE event_id = ?').all('evt_01');

    return res.render('judge/score', {
      project,
      criteria,
      existingScores,
      existingComment: existing ? existing.comment : '',
      session: req.session
    });
  } catch (err) {
    console.error('[judge:score]', err.message);
    return res.status(500).render('error', { message: 'Failed to load scoring form.', session: req.session });
  }
});

app.get('/judge/scores', requireRole('judge'), (req, res) => {
  try {
    const db      = getDb();
    const judgeId = req.session.userId;

    const scores = db.prepare(`
      SELECT s.*, p.title AS project_title, tr.name AS track_name
      FROM scores s
      JOIN projects p  ON p.id  = s.project_id
      JOIN tracks   tr ON tr.id = p.track_id
      WHERE s.judge_id = ?
      ORDER BY s.submitted_at DESC
    `).all(judgeId);

    const parsed = scores.map(s => ({
      ...s,
      criteria_scores: JSON.parse(s.criteria_scores)
    }));

    return res.render('judge/my-scores', { scores: parsed, session: req.session });
  } catch (err) {
    console.error('[judge:my-scores]', err.message);
    return res.status(500).render('error', { message: 'Failed to load scores.', session: req.session });
  }
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/projects',              galleryRouter);
app.use('/auth',                  authRouter);
app.use('/events',                eventsRouter);
app.use('/team',                  teamsRouter);
app.use('/invite',                teamsRouter);
app.use('/submissions',           submissionsRouter);
app.use('/api/submissions',       submissionsRouter);
app.use('/api/judge',             judgeRouter);
app.use('/organizer',             organizerRouter);
app.use('/api/organizer',         organizerRouter);
app.use('/api/export.csv',        exportRouter);
app.use('/api/normalization',     normalizationRouter);

// ─── Login convenience route ──────────────────────────────────────────────
// /login renders the login page; actual form posts go to /auth/login
app.get('/login', (req, res) => {
  if (req.session) {
    if (req.session.role === 'judge')     return res.redirect('/judge/dashboard');
    if (req.session.role === 'organizer') return res.redirect('/organizer/dashboard');
    return res.redirect('/projects');
  }
  return res.render('login', { session: null, error: null });
});


// ─── Static content pages ─────────────────────────────────────────────────────
app.get('/tos', (req, res) => res.render('tos', { session: req.session }));
app.get('/privacy', (req, res) => res.render('privacy', { session: req.session }));

// ─── Root redirect ────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.redirect('/projects'));

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).render('error', {
    message: `Page not found: ${req.path}`,
    session: req.session
  });
});

// ─── Error handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[server] Unhandled error:', err);
  res.status(500).render('error', {
    message: err.message || 'Internal server error',
    session: req.session || null
  });
});

// ─── Startup ─────────────────────────────────────────────────────────────────
initDb();
seedDb();

app.listen(PORT, () => {
  console.log(`[server] DOGFOOD 2026 running on http://localhost:${PORT}`);
});

module.exports = app;
