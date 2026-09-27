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
const eventsRouter        = require('./routes/events');
const teamsRouter         = require('./routes/teams');
const submissionsRouter   = require('./routes/submissions');
const judgeRouter         = require('./routes/judge');
const organizerRouter     = require('./routes/organizer');
const exportRouter        = require('./routes/export');
const normalizationRouter = require('./routes/normalization');
const judgePagesRouter    = require('./routes/judge-pages');
const githubRouter        = require('./routes/github');

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

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/projects',              galleryRouter);
app.use('/auth',                  authRouter);
app.use('/events',                eventsRouter);
app.use('/api/events',            eventsRouter);
app.use('/team',                  teamsRouter);

app.use('/api/teams',             teamsRouter);
app.get('/invite', (req, res) => res.render('invite', { session: req.session, error: null }));
app.get('/invite/:code', (req, res) => res.redirect('/team/join/' + encodeURIComponent(req.params.code)));
app.use('/submissions',           submissionsRouter);

app.use('/api/submissions',       submissionsRouter);
app.use('/judge',                 judgePagesRouter);
app.use('/api/judge',             judgeRouter);
app.use('/organizer',             organizerRouter);
app.use('/api/organizer',         organizerRouter);
app.use('/api/export.csv',        exportRouter);
app.use('/api/normalization',     normalizationRouter);
app.use('/',                      githubRouter);

// ─── Login convenience route ──────────────────────────────────────────────
// /login renders the login page; actual form posts go to /auth/login
app.get('/login', (req, res) => {
  if (req.session) {
    if (req.session.role === 'judge')     return res.redirect('/judge/dashboard');
    if (req.session.role === 'organizer') return res.redirect('/organizer/dashboard');
    if (req.session.role === 'participant') return res.redirect('/team');
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
