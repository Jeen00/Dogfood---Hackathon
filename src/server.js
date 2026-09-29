'use strict';
try { require('dotenv').config(); } catch (e) {}
const express      = require('express');

const cookieParser = require('cookie-parser');
const path         = require('path');

const initDb  = require('./db/init');
const seedDb  = require('./db/seed');
const auth    = require('./middleware/auth');

const galleryRouter       = require('./routes/gallery');
const authRouter          = require('./routes/auth');
const contactRouter       = require('./routes/contact');
const eventsRouter        = require('./routes/events');
const teamsRouter         = require('./routes/teams');
const submissionsRouter   = require('./routes/submissions');
const judgeRouter         = require('./routes/judge');
const organizerRouter     = require('./routes/organizer');
const exportRouter        = require('./routes/export');
const normalizationRouter = require('./routes/normalization');
const githubRouter        = require('./routes/github');
const invitesRouter       = require('./routes/invites');

const app  = express();
const PORT = process.env.PORT || 8080;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(auth);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/projects',              galleryRouter);
app.use('/auth',                  authRouter);
app.use('/api/contact',           contactRouter);
app.use('/events',                eventsRouter);
app.use('/api/events',            eventsRouter);
app.use('/team',                  teamsRouter);

app.use('/api/teams',             teamsRouter);
app.get('/api/reviews', (req, res) => { try { res.json({ reviews: require('./db/db').getDb().prepare('SELECT * FROM reviews ORDER BY id').all() }) } catch (e) { res.status(500).json({ error: e.message }) } });
app.get('/invite', (req, res) => res.redirect('http://localhost:5173/login'));
app.get('/invite/:code', (req, res) => res.redirect('http://localhost:5173/participant/dashboard?code=' + encodeURIComponent(req.params.code)));
app.use('/submissions',           submissionsRouter);

app.use('/api/submissions',       submissionsRouter);
app.use('/api/judge',             judgeRouter);
app.use('/organizer',             organizerRouter);
app.use('/api/organizer',         organizerRouter);
app.use('/api/export.csv',        exportRouter);
app.use('/api/normalization',     normalizationRouter);
app.use('/api',                   invitesRouter);
app.use('/',                      githubRouter);

// ─── Login convenience route ──────────────────────────────────────────────
app.get('/login', (req, res) => {
  res.redirect('http://localhost:5173/login');
});

// ─── Root redirect ────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.redirect('http://localhost:5173/projects'));

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error: `API route not found: ${req.path}`
  });
});

// ─── Error handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[server] Unhandled error:', err);
  res.status(500).json({
    error: err.message || 'Internal server error'
  });
});

// ─── Startup ─────────────────────────────────────────────────────────────────
initDb();
seedDb();

app.listen(PORT, () => {
  console.log(`[server] DOGFOOD 2026 backend running on http://localhost:${PORT}`);
});

module.exports = app;


