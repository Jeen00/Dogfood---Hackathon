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
const invitesRouter       = require('./routes/invites');
const participantRouter   = require('./routes/participant');

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
app.use('/participant',           participantRouter);
app.use('/api/participant',       participantRouter);

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
app.use('/api',                   invitesRouter);
app.use('/',                      githubRouter);

// ─── Profile shortcut route ────────────────────────────────────────────────
app.get('/profile', (req, res) => {
  if (!req.session) {
    if (req.accepts('html') && !req.is('json') && !req.headers['accept']?.includes('application/json')) {
      return res.redirect('/login?error=' + encodeURIComponent('Please log in to view your profile.'));
    }
    return res.status(401).json({ error: 'Not authenticated' });
  }
  if (req.session.role === 'participant') return res.redirect('/participant/profile');
  if (req.session.role === 'judge') return res.redirect('/judge/profile');
  if (req.session.role === 'organizer' || req.session.role === 'admin') return res.redirect('/organizer/events');
  return res.redirect('/');
});

// ─── Login convenience route ──────────────────────────────────────────────
// /login renders the login page; actual form posts go to /auth/login
app.get('/login', (req, res) => {
  if (req.session) {
    if (req.session.role === 'judge')     return res.redirect('/judge/events');
    if (req.session.role === 'organizer') return res.redirect('/organizer/events');
    if (req.session.role === 'participant') return res.redirect('/team/events');
    return res.redirect('/projects');
  }
  return res.render('login', { session: null, error: req.query.error || null });
});


// ─── Static content pages ─────────────────────────────────────────────────────
app.get('/tos', (req, res) => res.render('tos', { session: req.session }));
app.get('/privacy', (req, res) => res.render('privacy', { session: req.session }));

// ─── Root redirect ────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  try {
    const db = require('./db/db').getDb();
    
    // Find the most relevant event (one that is currently open, or the next upcoming one)
    let event = db.prepare(`
      SELECT * FROM events 
      WHERE datetime(submissions_close) > datetime('now')
      ORDER BY submissions_close ASC
      LIMIT 1
    `).get();

    // If no active/upcoming events, just get the most recently created one
    if (!event) {
      event = db.prepare(`SELECT * FROM events ORDER BY id DESC LIMIT 1`).get();
    }

    let tracks = [];
    let stats = { projects: 0, participants: 0, judges: 0 };

    if (event) {
      tracks = db.prepare('SELECT * FROM tracks WHERE event_id = ?').all(event.id);
      
      stats.projects = db.prepare('SELECT COUNT(*) AS c FROM projects WHERE event_id = ?').get(event.id)?.c || 0;
      
      // Participants: count distinct users in teams that have projects in this event, or just count all participants in teams formed for this event
      // Assuming teams don't have an explicit event_id but projects do, or we just count all users with role 'participant'. Let's do a simple count.
      stats.participants = db.prepare(`
        SELECT COUNT(DISTINCT tm.user_id) AS c 
        FROM team_members tm
        JOIN teams t ON t.id = tm.team_id
        JOIN projects p ON p.team_id = t.id
        WHERE p.event_id = ?
      `).get(event.id)?.c || 0;

      // Judges assigned to this event's tracks
      stats.judges = db.prepare(`
        SELECT COUNT(DISTINCT jt.judge_id) AS c 
        FROM judge_tracks jt
        JOIN tracks tr ON tr.id = jt.track_id
        WHERE tr.event_id = ?
      `).get(event.id)?.c || 0;
    }

    const nowMs = Date.now();
    const votingCloseMs = event && event.voting_close ? new Date(event.voting_close).getTime() : null;
    const votingOpenMs  = event && event.voting_open ? new Date(event.voting_open).getTime() : null;
    const votingClosed  = votingCloseMs ? nowMs > votingCloseMs : false;
    const votingOpen    = (!votingOpenMs || nowMs >= votingOpenMs) && !votingClosed;

    res.render('landing', {
      session: req.session,
      event,
      tracks,
      stats,
      votingClosed,
      votingOpen
    });
  } catch (err) {
    console.error('Landing page error:', err);
    res.status(500).send('Internal Server Error');
  }
});

// ─── Hackathon Overview ────────────────────────────────────────────────────────
app.get('/overview', (req, res) => {
  try {
    const db = require('./db/db').getDb();
    
    // Get the most relevant event
    let event = db.prepare(`
      SELECT * FROM events 
      WHERE datetime(submissions_close) > datetime('now')
      ORDER BY submissions_close ASC
      LIMIT 1
    `).get();

    if (!event) {
      event = db.prepare(`SELECT * FROM events ORDER BY id DESC LIMIT 1`).get();
    }

    let tracks = [];
    if (event) {
      tracks = db.prepare('SELECT * FROM tracks WHERE event_id = ?').all(event.id);
    }

    res.render('overview', {
      session: req.session,
      event,
      tracks,
      selectedEvent: undefined,
      selectedJudgeEvent: undefined,
      selectedParticipantEvent: undefined
    });
  } catch (err) {
    console.error('Overview page error:', err);
    res.status(500).send('Internal Server Error');
  }
});

// ─── Public Results & Leaderboard (Hackathon-wise) ─────────────────────────────
app.get(['/results', '/leaderboard'], (req, res) => {
  try {
    const db = require('./db/db').getDb();

    // Query all events with their project count and score count
    const allEvents = db.prepare(`
      SELECT e.*,
        (SELECT COUNT(*) FROM projects p WHERE p.event_id = e.id) AS project_count,
        (SELECT COUNT(*) FROM scores s JOIN projects p ON p.id = s.project_id WHERE p.event_id = e.id) AS score_count
      FROM events e
      ORDER BY e.submissions_close DESC
    `).all();

    const requestedEventId = (req.query.event_id || '').trim();
    let event = null;

    if (requestedEventId) {
      event = allEvents.find(e => e.id === requestedEventId) || db.prepare('SELECT * FROM events WHERE id = ?').get(requestedEventId);
    }

    if (!event) {
      // Prioritize the event with published scores or past submission close
      event = allEvents.find(e => e.score_count > 0) || allEvents.find(e => new Date(e.submissions_close) <= new Date()) || allEvents[0] || null;
    }

    let leaderboard = [];
    let communityFavorite = null;
    let trackWinners = [];

    if (event) {
      // Query aggregated normalized scores per project
      const results = db.prepare(`
        SELECT
          p.id AS project_id,
          p.title AS project_title,
          p.repo_url,
          p.track_id,
          t.name AS team_name,
          tr.name AS track_name,
          COUNT(ns.judge_id) AS reviews_count,
          ROUND(AVG(ns.raw_weighted_score), 2) AS avg_raw_score,
          ROUND(AVG(ns.normalized_score), 3) AS final_normalized_score
        FROM projects p
        JOIN teams t ON t.id = p.team_id
        LEFT JOIN tracks tr ON tr.id = p.track_id
        LEFT JOIN normalized_scores ns ON ns.project_id = p.id
        WHERE p.status = 'submitted' AND p.event_id = ?
        GROUP BY p.id
        HAVING COUNT(ns.judge_id) > 0
        ORDER BY final_normalized_score DESC, avg_raw_score DESC
      `).all(event.id);

      leaderboard = results.map((item, index) => ({
        rank: index + 1,
        ...item
      }));

      // Community Choice (most voted project in this event)
      communityFavorite = db.prepare(`
        SELECT p.id, p.title, t.name AS team_name, COUNT(pv.user_id) AS vote_count
        FROM projects p
        JOIN teams t ON t.id = p.team_id
        LEFT JOIN project_votes pv ON pv.project_id = p.id
        WHERE p.event_id = ?
        GROUP BY p.id
        HAVING vote_count > 0
        ORDER BY vote_count DESC
        LIMIT 1
      `).get(event.id) || null;

      // Track winners: top project in each track
      const tracks = db.prepare('SELECT id, name FROM tracks WHERE event_id = ?').all(event.id);
      for (const tr of tracks) {
        const bestInTrack = leaderboard.find(l => l.track_id === tr.id);
        if (bestInTrack) {
          trackWinners.push(bestInTrack);
        }
      }
    }

    if (req.accepts('json') && !req.accepts('html')) {
      return res.json({ leaderboard, communityFavorite, trackWinners, event, allEvents });
    }

    res.render('results', {
      session: req.session,
      event,
      allEvents,
      leaderboard,
      communityFavorite,
      trackWinners,
      selectedEvent: undefined,
      selectedJudgeEvent: undefined,
      selectedParticipantEvent: undefined
    });
  } catch (err) {
    console.error('Results page error:', err);
    res.status(500).send('Internal Server Error');
  }
});

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
