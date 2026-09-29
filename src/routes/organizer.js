'use strict';
const express = require('express');
const { getDb } = require('../db/db');
const requireRole = require('../middleware/requireRole');
const { ACTIVE_EVENT_ID } = require('../lib/config');
const { getRubric } = require('../lib/rubric');
const { getEventStatus } = require('../lib/event-status');
const { createNotification } = require('../lib/notifications');

const router = express.Router();

/**
 * Helper to resolve the currently active hackathon context for organizer
 */
function resolveSelectedEvent(db, req) {
  const eventId = req.query.event_id || req.session?.selectedEventId || ACTIVE_EVENT_ID;
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId) ||
                db.prepare('SELECT * FROM events ORDER BY id ASC LIMIT 1').get();
  if (req.session && event) {
    req.session.selectedEventId = event.id;
  }
  return event;
}

/**
 * GET /organizer
 * Redirect to events overview.
 */
router.get('/', requireRole('organizer', 'admin'), (req, res) => {
  return res.redirect('/organizer/events');
});

/**
 * GET /organizer/events & GET /organizer/hackathons
 * Full Hackathons management center supporting all 13 sub-items:
 * All Hackathons, Create, Drafts, Active, Upcoming, Completed, Archived,
 * Overview, Event Details, Event Timeline, Event Settings, Publish/Unpublish, Duplicate
 */
function handleEventsRoute(req, res) {
  try {
    const db = getDb();
    const tab = req.query.tab || 'all';
    const eventId = req.query.event_id || req.session?.selectedEventId;
    let selectedEvent = null;

    if (eventId) {
      selectedEvent = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
    }
    if (!selectedEvent && (tab === 'overview' || tab === 'details' || tab === 'timeline' || tab === 'settings')) {
      selectedEvent = db.prepare('SELECT * FROM events ORDER BY submissions_open DESC LIMIT 1').get();
    }
    if (selectedEvent && req.session) {
      req.session.selectedEventId = selectedEvent.id;
    }
    res.locals.selectedEvent = selectedEvent;

    // Fetch all events with calculated metrics
    const rawEvents = db.prepare('SELECT * FROM events ORDER BY submissions_open DESC').all();
    const allEvents = rawEvents.map(evt => {
      const statusInfo = getEventStatus(evt);
      const projectCount = db.prepare("SELECT COUNT(*) AS c FROM projects WHERE event_id = ? AND status = 'submitted'").get(evt.id)?.c || 0;
      const trackCount = db.prepare("SELECT COUNT(*) AS c FROM tracks WHERE event_id = ?").get(evt.id)?.c || 0;
      const teamCount = db.prepare("SELECT COUNT(*) AS c FROM teams WHERE event_id = ?").get(evt.id)?.c || 0;
      const judgeCount = db.prepare("SELECT COUNT(DISTINCT judge_id) AS c FROM judge_assignments ja JOIN projects p ON p.id=ja.project_id WHERE p.event_id=?").get(evt.id)?.c || 0;

      let computedStatus = 'active';
      if (evt.is_archived) {
        computedStatus = 'archived';
      } else if (evt.status === 'draft' || evt.is_published === 0) {
        computedStatus = 'draft';
      } else if (statusInfo.status === 'upcoming') {
        computedStatus = 'upcoming';
      } else if (statusInfo.status === 'completed') {
        computedStatus = 'completed';
      }

      return {
        ...evt,
        statusInfo,
        computedStatus,
        project_count: projectCount,
        track_count: trackCount,
        team_count: teamCount,
        judge_count: judgeCount,
        is_published: evt.is_published === undefined ? 1 : evt.is_published,
        is_archived: evt.is_archived || 0
      };
    });

    // Counts for tabs
    const counts = {
      all: allEvents.length,
      drafts: allEvents.filter(e => e.computedStatus === 'draft').length,
      active: allEvents.filter(e => e.computedStatus === 'active').length,
      upcoming: allEvents.filter(e => e.computedStatus === 'upcoming').length,
      completed: allEvents.filter(e => e.computedStatus === 'completed').length,
      archived: allEvents.filter(e => e.is_archived == 1).length
    };

    // Filter list by tab if not showing detail tabs
    let displayEvents = allEvents;
    if (tab === 'drafts')    displayEvents = allEvents.filter(e => e.computedStatus === 'draft');
    if (tab === 'active')    displayEvents = allEvents.filter(e => e.computedStatus === 'active');
    if (tab === 'upcoming')  displayEvents = allEvents.filter(e => e.computedStatus === 'upcoming');
    if (tab === 'completed') displayEvents = allEvents.filter(e => e.computedStatus === 'completed');
    if (tab === 'archived')  displayEvents = allEvents.filter(e => e.is_archived == 1);

    // If viewing overview, details, timeline or settings of a selected event, load extra context
    let selectedEventTracks = [];
    let selectedEventPrizes = [];
    let selectedEventCriteria = [];
    let selectedEventJudges = [];
    if (selectedEvent) {
      selectedEventTracks = db.prepare('SELECT * FROM tracks WHERE event_id = ?').all(selectedEvent.id);
      selectedEventPrizes = db.prepare('SELECT * FROM prizes WHERE event_id = ?').all(selectedEvent.id);
      selectedEventCriteria = db.prepare('SELECT * FROM rubric_criteria WHERE event_id = ?').all(selectedEvent.id);
      selectedEventJudges = db.prepare(`
        SELECT DISTINCT u.id, u.name, u.email
        FROM judge_assignments ja
        JOIN projects p ON p.id = ja.project_id
        JOIN users u ON u.id = ja.judge_id
        WHERE p.event_id = ?
      `).all(selectedEvent.id);
    }

    if (req.baseUrl.startsWith('/api') || (!req.accepts('html') && req.accepts('json'))) {
      return res.json({ events: displayEvents, selectedEvent, counts });
    }

    return res.render('organizer/events', {
      events: displayEvents,
      allEvents,
      counts,
      tab,
      selectedEvent,
      selectedEventTracks,
      selectedEventPrizes,
      selectedEventCriteria,
      selectedEventJudges,
      session: req.session,
      success: req.query.success || null,
      error: req.query.error || null
    });
  } catch (err) {
    console.error('[organizer:events] Error:', err.message);
    return res.status(500).render('error', {
      message: 'Failed to load hackathons.',
      session: req.session
    });
  }
}

router.get('/events', requireRole('organizer', 'admin'), handleEventsRoute);
router.get('/hackathons', requireRole('organizer', 'admin'), handleEventsRoute);

// Dedicated route shortcuts for hackathon sub-items
router.get('/events/overview', requireRole('organizer', 'admin'), (req, res) => {
  req.query.tab = 'overview';
  return handleEventsRoute(req, res);
});
router.get('/events/details', requireRole('organizer', 'admin'), (req, res) => {
  req.query.tab = 'details';
  return handleEventsRoute(req, res);
});
router.get('/events/timeline', requireRole('organizer', 'admin'), (req, res) => {
  req.query.tab = 'timeline';
  return handleEventsRoute(req, res);
});
router.get('/event/settings', requireRole('organizer', 'admin'), (req, res) => {
  req.query.tab = 'settings';
  return handleEventsRoute(req, res);
});

/**
 * POST /organizer/events/publish
 * Toggle publish / unpublish status of a hackathon
 */
router.post('/events/publish', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const eventId = req.body.event_id || req.query.event_id;
    const evt = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
    if (!evt) return res.status(404).render('error', { message: 'Event not found', session: req.session });

    const newPub = (evt.is_published === 1) ? 0 : 1;
    const newStatus = (newPub === 1) ? 'published' : 'draft';
    db.prepare('UPDATE events SET is_published = ?, status = ? WHERE id = ?').run(newPub, newStatus, eventId);

    const now = new Date().toISOString();
    db.prepare('INSERT INTO audit_log (id, actor_id, action, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(`al_${Date.now()}`, req.session.userId, newPub ? 'event_published' : 'event_unpublished', eventId, evt.name, now);

    return res.redirect(`/organizer/events?event_id=${eventId}&tab=overview&success=${encodeURIComponent(newPub ? 'Hackathon published successfully' : 'Hackathon set to draft (unpublished)')}`);
  } catch (err) {
    console.error('[events:publish]', err.message);
    return res.status(500).render('error', { message: 'Failed to update publish state', session: req.session });
  }
});

/**
 * POST /organizer/events/duplicate
 * Duplicate hackathon with tracks and rubric criteria
 */
router.post('/events/duplicate', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const eventId = req.body.event_id || req.query.event_id;
    const src = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
    if (!src) return res.status(404).render('error', { message: 'Source event not found', session: req.session });

    const newId = `evt_${Date.now()}`;
    const newName = `${src.name} (Copy)`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO events (id, name, submissions_open, submissions_close, voting_open, voting_close, created_by, description, status, is_published, is_archived, judging_open, judging_close, results_date, banner_url, about, problem_statement, rules, eligibility, prizes_summary, faqs, sponsors, partners, contact_email, website_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', 0, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newId, newName, src.submissions_open, src.submissions_close, src.voting_open, src.voting_close, req.session.userId,
      src.description || '', src.judging_open || null, src.judging_close || null, src.results_date || null,
      src.banner_url || null, src.about || null, src.problem_statement || null, src.rules || null,
      src.eligibility || null, src.prizes_summary || null, src.faqs || null, src.sponsors || null,
      src.partners || null, src.contact_email || null, src.website_url || null
    );

    // Duplicate tracks
    const tracks = db.prepare('SELECT * FROM tracks WHERE event_id = ?').all(eventId);
    const insertTrack = db.prepare('INSERT INTO tracks (id, event_id, name) VALUES (?, ?, ?)');
    for (const t of tracks) {
      insertTrack.run(`trk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, newId, t.name);
    }

    // Duplicate rubric criteria
    const criteria = db.prepare('SELECT * FROM rubric_criteria WHERE event_id = ?').all(eventId);
    const insertCrit = db.prepare('INSERT INTO rubric_criteria (id, event_id, name, weight) VALUES (?, ?, ?, ?)');
    for (const c of criteria) {
      insertCrit.run(`crit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, newId, c.name, c.weight);
    }

    db.prepare('INSERT INTO audit_log (id, actor_id, action, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(`al_${Date.now()}`, req.session.userId, 'event_duplicated', newId, `Cloned from ${src.name}`, now);

    return res.redirect(`/organizer/events?event_id=${newId}&tab=overview&success=${encodeURIComponent('Hackathon duplicated successfully as draft')}`);
  } catch (err) {
    console.error('[events:duplicate]', err.message);
    return res.status(500).render('error', { message: 'Failed to duplicate event', session: req.session });
  }
});

/**
 * POST /organizer/events/archive
 * Toggle archive state of a hackathon
 */
router.post('/events/archive', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const eventId = req.body.event_id || req.query.event_id;
    const evt = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
    if (!evt) return res.status(404).render('error', { message: 'Event not found', session: req.session });

    const newArch = (evt.is_archived === 1) ? 0 : 1;
    db.prepare('UPDATE events SET is_archived = ? WHERE id = ?').run(newArch, eventId);

    const now = new Date().toISOString();
    db.prepare('INSERT INTO audit_log (id, actor_id, action, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(`al_${Date.now()}`, req.session.userId, newArch ? 'event_archived' : 'event_unarchived', eventId, evt.name, now);

    return res.redirect(`/organizer/events?tab=${newArch ? 'archived' : 'all'}&success=${encodeURIComponent(newArch ? 'Hackathon archived' : 'Hackathon restored from archive')}`);
  } catch (err) {
    console.error('[events:archive]', err.message);
    return res.status(500).render('error', { message: 'Failed to update archive state', session: req.session });
  }
});

/**
 * POST /organizer/events/details
 * Update event details
 */
router.post('/events/details', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const { event_id, name, description, about, problem_statement, rules, eligibility, banner_url, contact_email, website_url } = req.body;
    if (!event_id || !name) {
      return res.status(400).render('error', { message: 'Event ID and Name are required', session: req.session });
    }

    db.prepare(`
      UPDATE events
      SET name = ?, description = ?, about = ?, problem_statement = ?, rules = ?, eligibility = ?, banner_url = ?, contact_email = ?, website_url = ?
      WHERE id = ?
    `).run(name, description || '', about || '', problem_statement || '', rules || '', eligibility || '', banner_url || '', contact_email || '', website_url || '', event_id);

    const now = new Date().toISOString();
    db.prepare('INSERT INTO audit_log (id, actor_id, action, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(`al_${Date.now()}`, req.session.userId, 'event_details_updated', event_id, name, now);

    return res.redirect(`/organizer/events?event_id=${event_id}&tab=details&success=${encodeURIComponent('Event details updated successfully')}`);
  } catch (err) {
    console.error('[events:details]', err.message);
    return res.status(500).render('error', { message: 'Failed to update event details', session: req.session });
  }
});

/**
 * POST /organizer/events/timeline
 * Update event timeline milestone dates
 */
router.post('/events/timeline', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const { event_id, submissions_open, submissions_close, judging_open, judging_close, voting_open, voting_close, results_date } = req.body;
    if (!event_id) {
      return res.status(400).render('error', { message: 'Event ID is required', session: req.session });
    }

    db.prepare(`
      UPDATE events
      SET submissions_open = ?, submissions_close = ?, judging_open = ?, judging_close = ?, voting_open = ?, voting_close = ?, results_date = ?
      WHERE id = ?
    `).run(
      submissions_open || null, submissions_close || null,
      judging_open || null, judging_close || null,
      voting_open || null, voting_close || null,
      results_date || null, event_id
    );

    const now = new Date().toISOString();
    db.prepare('INSERT INTO audit_log (id, actor_id, action, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(`al_${Date.now()}`, req.session.userId, 'event_timeline_updated', event_id, 'Milestones updated', now);

    return res.redirect(`/organizer/events?event_id=${event_id}&tab=timeline&success=${encodeURIComponent('Event timeline milestones updated successfully')}`);
  } catch (err) {
    console.error('[events:timeline]', err.message);
    return res.status(500).render('error', { message: 'Failed to update event timeline', session: req.session });
  }
});

/**
 * POST /organizer/events/settings
 * Update event settings
 */
router.post('/events/settings', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const { event_id, prizes_summary, faqs, sponsors, partners } = req.body;
    if (!event_id) {
      return res.status(400).render('error', { message: 'Event ID is required', session: req.session });
    }

    db.prepare(`
      UPDATE events
      SET prizes_summary = ?, faqs = ?, sponsors = ?, partners = ?
      WHERE id = ?
    `).run(prizes_summary || '', faqs || '', sponsors || '', partners || '', event_id);

    const now = new Date().toISOString();
    db.prepare('INSERT INTO audit_log (id, actor_id, action, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(`al_${Date.now()}`, req.session.userId, 'event_settings_updated', event_id, 'Settings updated', now);

    return res.redirect(`/organizer/events?event_id=${event_id}&tab=settings&success=${encodeURIComponent('Event settings saved successfully')}`);
  } catch (err) {
    console.error('[events:settings]', err.message);
    return res.status(500).render('error', { message: 'Failed to update event settings', session: req.session });
  }
});

/**
 * GET /api/organizer/progress
 * Returns judge progress (assigned vs completed) and project coverage.
 */
router.get('/progress', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();

    // Judge progress
    const judgeProgress = db.prepare(`
      SELECT
        u.id         AS judge_id,
        u.name       AS judge_name,
        COUNT(ja.id) AS assigned,
        COUNT(s.id)  AS completed
      FROM users u
      LEFT JOIN judge_assignments ja ON ja.judge_id = u.id
      LEFT JOIN scores            s  ON s.judge_id  = u.id AND s.project_id = ja.project_id
      WHERE u.role = 'judge'
      GROUP BY u.id
      ORDER BY u.name
    `).all();

    // Project coverage
    const projectCoverage = db.prepare(`
      SELECT
        p.id           AS project_id,
        p.title        AS project_title,
        tr.name        AS track_name,
        COUNT(ja.id)   AS reviews_needed,
        COUNT(s.id)    AS reviews_received
      FROM projects p
      JOIN tracks tr ON tr.id = p.track_id
      LEFT JOIN judge_assignments ja ON ja.project_id = p.id
      LEFT JOIN scores            s  ON s.project_id  = p.id AND s.judge_id = ja.judge_id
      WHERE p.status = 'submitted'
      GROUP BY p.id
      ORDER BY reviews_received ASC
    `).all();

    return res.json({ judgeProgress, projectCoverage });
  } catch (err) {
    console.error('[organizer:progress] Error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/organizer/stats
 * Returns overall summary statistics for organizer dashboards.
 */
router.get('/stats', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const totalProjects = db.prepare("SELECT COUNT(*) AS count FROM projects WHERE status = 'submitted'").get().count;
    const activeJudges   = db.prepare("SELECT COUNT(DISTINCT id) AS count FROM users WHERE role = 'judge'").get().count;
    const scoresSubmitted = db.prepare("SELECT COUNT(*) AS count FROM scores").get().count;
    const totalAssignments = db.prepare("SELECT COUNT(*) AS count FROM judge_assignments").get().count;

    return res.json({
      totalProjects,
      activeJudges,
      scoresSubmitted,
      totalAssignments,
      completionRate: totalAssignments > 0 ? Math.round((scoresSubmitted / totalAssignments) * 100) : 0
    });
  } catch (err) {
    console.error('[organizer:stats] Error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/judge/assignments/auto

 * Re-runs auto-assignment: assigns judges to projects based on track matching.
 * Idempotent (INSERT OR IGNORE).
 */
router.post('/assignments/auto', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();

    const projects = db.prepare('SELECT * FROM projects WHERE status = ?').all('submitted');
    const judges   = db.prepare("SELECT id FROM users WHERE role = 'judge'").all();

    const insertAssignment = db.prepare(
      'INSERT OR IGNORE INTO judge_assignments (id, judge_id, project_id) VALUES (?, ?, ?)'
    );

    let added = 0;

    for (const proj of projects) {
      // Find judges whose track preferences include this project's track
      const matchingJudges = db.prepare(`
        SELECT DISTINCT jt.judge_id
        FROM judge_tracks jt
        WHERE jt.track_id = ?
      `).all(proj.track_id).map(r => r.judge_id);

      // If no track match, fall back to first 3 judges
      const assignees = matchingJudges.length > 0
        ? matchingJudges
        : judges.slice(0, 3).map(j => j.id);

      for (const judgeId of assignees) {
        const aId  = `asgn_auto_${judgeId}_${proj.id}`;
        const info = insertAssignment.run(aId, judgeId, proj.id);
        if (info.changes > 0) added++;
      }
    }

    return res.json({ message: `Auto-assignment complete. ${added} new assignments created.` });
  } catch (err) {
    console.error('[organizer:auto-assign] Error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


/**
 * GET /organizer/dashboard
 * Full organizer dashboard with all 8 sections.
 */
router.get('/dashboard', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const selectedEvent = resolveSelectedEvent(db, req);
    res.locals.selectedEvent = selectedEvent;
    const statusInfo = getEventStatus(selectedEvent);
    const eventId = selectedEvent.id;

    // ── 1. Overview stats ──────────────────────────────────────────────
    const totalTeams       = db.prepare('SELECT COUNT(*) AS c FROM teams WHERE event_id = ?').get(eventId).c;
    const totalParticipants= db.prepare('SELECT COUNT(DISTINCT tm.user_id) AS c FROM team_members tm JOIN teams t ON t.id=tm.team_id WHERE t.event_id=?').get(eventId).c;
    const totalJudges      = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role='judge'").get().c;
    const totalProjects    = db.prepare("SELECT COUNT(*) AS c FROM projects WHERE event_id=? AND status='submitted'").get(eventId).c;
    const totalAssignments = db.prepare('SELECT COUNT(*) AS c FROM judge_assignments ja JOIN projects p ON p.id=ja.project_id WHERE p.event_id=?').get(eventId).c;
    const totalScores      = db.prepare('SELECT COUNT(*) AS c FROM scores s JOIN projects p ON p.id=s.project_id WHERE p.event_id=?').get(eventId).c;
    const completionPct    = totalAssignments > 0 ? Math.round((totalScores / totalAssignments) * 100) : 0;
    // Use normalized_scores for average (has raw_weighted_score); fall back to 0
    const avgScoreRow      = db.prepare('SELECT ROUND(AVG(ns.raw_weighted_score),1) AS avg FROM normalized_scores ns JOIN projects p ON p.id=ns.project_id WHERE p.event_id=?').get(eventId);
    const avgScore         = (avgScoreRow && avgScoreRow.avg) ? avgScoreRow.avg : 0;

    // ── 2. Live Activity (last 15 audit entries) ───────────────────────
    const liveActivity = db.prepare(`
      SELECT al.action, al.detail, al.created_at, u.name AS actor_name
      FROM audit_log al
      LEFT JOIN users u ON u.id = al.actor_id
      ORDER BY al.created_at DESC LIMIT 15
    `).all();

    // ── 3. Registration Statistics ─────────────────────────────────────
    const teamsByDay = db.prepare(`
      SELECT DATE(submitted_at) AS day, COUNT(*) AS c
      FROM projects WHERE event_id=? GROUP BY day ORDER BY day ASC
    `).all(eventId);

    const participantsByRole = [
      { role: 'Participants', count: totalParticipants },
      { role: 'Judges',       count: totalJudges },
      { role: 'Teams',        count: totalTeams },
    ];

    // ── 4. Submission Statistics ───────────────────────────────────────
    const submissionsByTrack = db.prepare(`
      SELECT tr.name AS track, COUNT(*) AS c
      FROM projects p JOIN tracks tr ON tr.id=p.track_id
      WHERE p.event_id=? AND p.status='submitted'
      GROUP BY tr.id ORDER BY c DESC
    `).all(eventId);

    const submissionsByStatus = db.prepare(`
      SELECT status, COUNT(*) AS c FROM projects WHERE event_id=? GROUP BY status ORDER BY c DESC
    `).all(eventId);

    // ── 5. Judging Statistics ──────────────────────────────────────────
    const judgeProgress = db.prepare(`
      SELECT u.id AS judge_id, u.name AS judge_name,
        COUNT(ja.id) AS assigned,
        COUNT(s.id)  AS completed
      FROM users u
      LEFT JOIN judge_assignments ja ON ja.judge_id=u.id
      LEFT JOIN projects p  ON p.id=ja.project_id AND p.event_id=?
      LEFT JOIN scores s    ON s.judge_id=u.id AND s.project_id=ja.project_id
      WHERE u.role='judge' GROUP BY u.id ORDER BY completed DESC
    `).all(eventId);

    const scoresByTrack = db.prepare(`
      SELECT tr.name AS track,
        ROUND(AVG(ns.raw_weighted_score), 1) AS avg_score,
        COUNT(*) AS reviews
      FROM normalized_scores ns
      JOIN projects p ON p.id = ns.project_id
      JOIN tracks tr  ON tr.id = p.track_id
      WHERE p.event_id = ?
      GROUP BY tr.id
      ORDER BY avg_score DESC
    `).all(eventId);

    // ── 6. Event Timeline ──────────────────────────────────────────────
    const now = new Date().toISOString();
    const timeline = [
      { label: 'Submissions Open',  date: selectedEvent.submissions_open,  done: selectedEvent.submissions_open  && selectedEvent.submissions_open  <= now },
      { label: 'Submissions Close', date: selectedEvent.submissions_close, done: selectedEvent.submissions_close && selectedEvent.submissions_close <= now },
      { label: 'Judging Opens',     date: selectedEvent.judging_open,      done: selectedEvent.judging_open      && selectedEvent.judging_open      <= now },
      { label: 'Judging Closes',    date: selectedEvent.judging_close,     done: selectedEvent.judging_close     && selectedEvent.judging_close     <= now },
      { label: 'Voting Opens',      date: selectedEvent.voting_open,       done: selectedEvent.voting_open       && selectedEvent.voting_open       <= now },
      { label: 'Voting Closes',     date: selectedEvent.voting_close,      done: selectedEvent.voting_close      && selectedEvent.voting_close      <= now },
      { label: 'Results Published', date: selectedEvent.results_date,      done: selectedEvent.results_date      && selectedEvent.results_date      <= now },
    ].filter(t => t.date);

    // ── 7. Project Coverage (for coverage table + pending actions) ─────
    const projectCoverage = db.prepare(`
      SELECT p.id AS project_id, p.title AS project_title, tr.name AS track_name,
        COUNT(ja.id) AS reviews_needed, COUNT(s.id) AS reviews_received
      FROM projects p JOIN tracks tr ON tr.id=p.track_id
      LEFT JOIN judge_assignments ja ON ja.project_id=p.id
      LEFT JOIN scores s ON s.project_id=p.id AND s.judge_id=ja.judge_id
      WHERE p.status='submitted' AND p.event_id=?
      GROUP BY p.id ORDER BY reviews_received ASC
    `).all(eventId);

    // ── 8. Pending Actions ─────────────────────────────────────────────
    const pendingActions = [];
    const unassigned = projectCoverage.filter(p => p.reviews_needed === 0).length;
    if (unassigned > 0) pendingActions.push({ icon: '⚠️', label: `${unassigned} project(s) have no judge assigned`, href: '/organizer/assignments', action: 'Assign Judges' });
    const incompleteJudges = judgeProgress.filter(j => j.assigned > 0 && j.completed < j.assigned).length;
    if (incompleteJudges > 0) pendingActions.push({ icon: '⏳', label: `${incompleteJudges} judge(s) have incomplete evaluations`, href: '/organizer/assignments', action: 'View Progress' });
    if (completionPct < 100 && totalProjects > 0) pendingActions.push({ icon: '📊', label: `Judging is ${completionPct}% complete — run normalization when ready`, href: '/organizer/normalization', action: 'Normalize Scores' });
    if (totalProjects === 0) pendingActions.push({ icon: '📁', label: 'No projects submitted yet — check submission settings', href: '/organizer/event/settings', action: 'Event Settings' });

    return res.render('organizer/dashboard', {
      selectedEvent, statusInfo, session: req.session,
      // overview
      totalTeams, totalParticipants, totalJudges, totalProjects,
      totalAssignments, totalScores, completionPct, avgScore,
      // sections
      liveActivity, participantsByRole,
      submissionsByTrack, submissionsByStatus,
      judgeProgress, scoresByTrack,
      timeline, projectCoverage, pendingActions,
    });
  } catch (err) {
    console.error('[organizer:dashboard] Error:', err.message);
    return res.status(500).render('error', { message: 'Failed to load dashboard.', session: req.session });
  }
});


/**
 * GET /organizer/normalization
 * Render the normalization page.
 */
router.get('/normalization', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const selectedEvent = resolveSelectedEvent(db, req);
    res.locals.selectedEvent = selectedEvent;

    const results = db.prepare(`
      SELECT
        ns.judge_id,
        ns.project_id,
        ns.raw_weighted_score,
        ns.normalized_score,
        ns.method,
        ns.computed_at,
        u.name  AS judge_name,
        p.title AS project_title
      FROM normalized_scores ns
      JOIN users    u ON u.id = ns.judge_id
      JOIN projects p ON p.id = ns.project_id
      WHERE p.event_id = ?
      ORDER BY ns.normalized_score DESC
    `).all(selectedEvent.id);

    return res.render('organizer/normalization', {
      results,
      selectedEvent,
      session: req.session
    });
  } catch (err) {
    console.error('[organizer:normalization] Error:', err.message);
    return res.status(500).render('error', {
      message: 'Failed to load normalization page.',
      session: req.session
    });
  }
});

/**
 * GET /organizer/event/new
 * Render event creation form.
 */
router.get('/event/new', requireRole('organizer', 'admin'), (req, res) => {
  return res.render('organizer/event-create', {
    session: req.session,
    error: null
  });
});

/**
 * GET /organizer/rubric & GET /api/organizer/rubric
 * Render rubric management page or return JSON criteria.
 */
router.get('/rubric', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const selectedEvent = resolveSelectedEvent(db, req);
    res.locals.selectedEvent = selectedEvent;
    const criteria = getRubric(db, selectedEvent.id);

    if (req.baseUrl.startsWith('/api') || (!req.accepts('html') && req.accepts('json'))) {
      return res.json({ criteria });
    }

    return res.render('organizer/rubric', {
      criteria,
      selectedEvent,
      session: req.session
    });
  } catch (err) {
    console.error('[organizer:rubric GET] Error:', err.message);
    if (req.baseUrl.startsWith('/api') || !req.accepts('html')) {
      return res.status(500).json({ error: 'Internal server error' });
    }
    return res.status(500).render('error', {
      message: 'Failed to load rubric.',
      session: req.session
    });
  }
});

/**
 * POST /api/organizer/assignments
 * Manually assign a judge to a project.
 * Body: { judge_id, project_id }
 */
router.post('/assignments', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const { judge_id, project_id } = req.body;

    if (!judge_id || !project_id) {
      return res.status(400).json({ error: 'judge_id and project_id are required' });
    }

    const id = `asgn_man_${judge_id}_${project_id}`;
    const info = db.prepare(
      'INSERT OR IGNORE INTO judge_assignments (id, judge_id, project_id) VALUES (?, ?, ?)'
    ).run(id, judge_id, project_id);

    if (info.changes === 0) {
      return res.status(409).json({ message: 'Assignment already exists' });
    }

    const now = new Date().toISOString();
    db.prepare('INSERT INTO audit_log (id, actor_id, action, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(`al_${Date.now()}`, req.session.userId, 'judge_assigned', id, `${judge_id}->${project_id}`, now);

    return res.status(201).json({ message: 'Judge assigned successfully', id });
  } catch (err) {
    console.error('[organizer:assignments POST] Error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/organizer/assignments/:id
 * Remove a judge assignment.
 */
router.delete('/assignments/:id', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const id = req.params.id;

    const info = db.prepare('DELETE FROM judge_assignments WHERE id = ?').run(id);
    if (info.changes === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const now = new Date().toISOString();
    db.prepare('INSERT INTO audit_log (id, actor_id, action, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(`al_${Date.now()}`, req.session.userId, 'judge_unassigned', id, '', now);

    return res.json({ message: 'Assignment removed' });
  } catch (err) {
    console.error('[organizer:assignments DELETE] Error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /organizer/assignments
 * Render judge assignments page.
 */
router.get('/assignments', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const selectedEvent = resolveSelectedEvent(db, req);
    res.locals.selectedEvent = selectedEvent;

    const assignments = db.prepare(`
      SELECT ja.id, u.name AS judge_name, p.title AS project_title, tr.name AS track_name
      FROM judge_assignments ja
      JOIN users u    ON u.id  = ja.judge_id
      JOIN projects p ON p.id  = ja.project_id
      JOIN tracks tr  ON tr.id = p.track_id
      WHERE p.event_id = ?
      ORDER BY u.name, p.title
    `).all(selectedEvent.id);

    if (req.baseUrl.startsWith('/api') || (!req.accepts('html') && req.accepts('json'))) {
      return res.json({ assignments });
    }

    return res.render('organizer/assignments', {
      assignments,
      selectedEvent,
      session: req.session
    });
  } catch (err) {
    return res.status(500).render('error', {
      message: 'Failed to load assignments.',
      session: req.session
    });
  }
});


/**
 * GET /organizer/invite-judge
 * Render invite judge page.
 */
router.get('/invite-judge', requireRole('organizer', 'admin'), (req, res) => {
  return res.render('organizer/invite-judge', {
    session: req.session,
    error: null,
    success: null
  });
});

/**
 * POST /organizer/invite-judge
 * Create a new judge user and seed a fixed session for them.
 * Body: { name, email }
 */
router.post('/invite-judge', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const { name, email } = req.body;

    if (!name || !email) {
      return res.render('organizer/invite-judge', {
        session: req.session,
        error:   'Name and email are required.',
        success: null
      });
    }

    const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(email.toLowerCase());
    if (existing) {
      return res.render('organizer/invite-judge', {
        session: req.session,
        error:   'A user with that email already exists.',
        success: null
      });
    }

    const { v4: uuidv4 } = require('uuid');
    const userId    = `jdg_${uuidv4().slice(0, 8)}`;
    const sessionId = `jdg_${uuidv4().slice(0, 8)}`;
    const now       = new Date().toISOString();

    db.prepare('INSERT INTO users (id, name, email, role, password_hash) VALUES (?, ?, ?, ?, ?)')
      .run(userId, name, email, 'judge', null);

    db.prepare('INSERT INTO sessions (id, user_id, role) VALUES (?, ?, ?)')
      .run(sessionId, userId, 'judge');

    db.prepare('INSERT INTO audit_log (id, actor_id, action, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(`al_${Date.now()}`, req.session.userId, 'judge_invited', userId, email, now);

    return res.render('organizer/invite-judge', {
      session: req.session,
      error:   null,
      success: `Judge "${name}" created. Session cookie: session=${sessionId}`
    });
  } catch (err) {
    console.error('[organizer:invite-judge POST] Error:', err.message);
    return res.render('organizer/invite-judge', {
      session: req.session,
      error:   'An error occurred. Please try again.',
      success: null
    });
  }
});

/**
 * POST /organizer/rubric
 * Update rubric criteria weights for the event.
 * Body: { criteria: [{ id, weight }, ...] }
 */
router.post('/rubric', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    // Accept either JSON body (from React fetch) or form-encoded body
    const criteria = req.body.criteria;

    if (!criteria || !Array.isArray(criteria)) {
      return res.status(400).json({ error: 'criteria array is required' });
    }

    // Validate that weights sum to 1.0 (±0.01 tolerance)
    const total = criteria.reduce((s, c) => s + parseFloat(c.weight || 0), 0);
    if (Math.abs(total - 1.0) > 0.01) {
      return res.status(400).json({ error: `Weights must sum to 1.0 (got ${total.toFixed(4)})` });
    }

    const selectedEvent = resolveSelectedEvent(db, req);
    const update = db.prepare('UPDATE rubric_criteria SET weight = ? WHERE id = ? AND event_id = ?');
    for (const c of criteria) {
      update.run(parseFloat(c.weight), c.id, selectedEvent.id);
    }

    const now = new Date().toISOString();
    db.prepare('INSERT INTO audit_log (id, actor_id, action, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(`al_${Date.now()}`, req.session.userId, 'rubric_updated', selectedEvent.id, JSON.stringify(criteria), now);


    return res.json({ message: 'Rubric updated successfully' });
  } catch (err) {
    console.error('[organizer:rubric POST] Error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/organizer/results & GET /organizer/results
 * Returns final ranked hackathon leaderboard based on normalized scores.
 */
router.get('/results', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const selectedEvent = resolveSelectedEvent(db, req);
    res.locals.selectedEvent = selectedEvent;

    // Query aggregated normalized scores per project
    const results = db.prepare(`
      SELECT
        p.id AS project_id,
        p.title AS project_title,
        p.repo_url,
        t.name AS team_name,
        tr.name AS track_name,
        COUNT(ns.judge_id) AS reviews_count,
        ROUND(AVG(ns.raw_weighted_score), 2) AS avg_raw_score,
        ROUND(AVG(ns.normalized_score), 3) AS final_normalized_score
      FROM projects p
      JOIN teams t ON t.id = p.team_id
      JOIN tracks tr ON tr.id = p.track_id
      LEFT JOIN normalized_scores ns ON ns.project_id = p.id
      WHERE p.status = 'submitted' AND p.event_id = ?
      GROUP BY p.id
      ORDER BY final_normalized_score DESC, avg_raw_score DESC
    `).all(selectedEvent.id);

    // Assign sequential ranks (1, 2, 3...)
    const leaderboard = results.map((item, index) => ({
      rank: index + 1,
      ...item
    }));

    if (req.baseUrl.startsWith('/api') || (!req.accepts('html') && req.accepts('json'))) {
      return res.json({ leaderboard });
    }

    return res.render('organizer/results', {
      leaderboard,
      selectedEvent,
      session: req.session
    });
  } catch (err) {
    console.error('[organizer:results GET] Error:', err.message);
    if (req.baseUrl.startsWith('/api') || !req.accepts('html')) {
      return res.status(500).json({ error: 'Internal server error' });
    }
    return res.status(500).render('error', {
      message: 'Failed to load results leaderboard.',
      session: req.session
    });
  }
});

/**
 * GET /organizer/invites
 * Organizer manages judge invites for a selected event.
 */
router.get('/invites', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const selectedEvent = resolveSelectedEvent(db, req);
    res.locals.selectedEvent = selectedEvent;
    const statusInfo = getEventStatus(selectedEvent);

    // Check invite window
    const now = new Date();
    let canInvite = true;
    let inviteBlockReason = null;
    if (selectedEvent.submissions_open) {
      const open = new Date(selectedEvent.submissions_open);
      const sixHoursBefore = new Date(open.getTime() - 6 * 60 * 60 * 1000);
      if (now >= open) {
        canInvite = false;
        inviteBlockReason = 'The hackathon has already started. Judge invites are closed.';
      } else if (now >= sixHoursBefore) {
        canInvite = false;
        inviteBlockReason = 'Judge invites close 6 hours before the hackathon begins.';
      }
    }

    const invites = db.prepare(`
      SELECT ji.*, u.name AS judge_name
      FROM judge_invites ji
      LEFT JOIN users u ON u.id = ji.judge_id
      WHERE ji.event_id = ?
      ORDER BY ji.created_at DESC
    `).all(selectedEvent.id);

    const availableJudges = db.prepare("SELECT id, name, email FROM users WHERE role = 'judge' ORDER BY name ASC").all();

    return res.render('organizer/invites', {
      selectedEvent,
      statusInfo,
      invites,
      availableJudges,
      canInvite,
      inviteBlockReason,
      session: req.session,
      error: null,
      success: null
    });
  } catch (err) {
    console.error('[organizer:invites GET]', err.message);
    return res.status(500).render('error', { message: 'Failed to load invites.', session: req.session });
  }
});

// ─── New sidebar nav routes ────────────────────────────────────────────────

// ─── Module-specific data-rich routes ──────────────────────────────────────

/**
 * GET & POST /organizer/event-page
 */
router.get('/event-page', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const selectedEvent = resolveSelectedEvent(db, req);
    res.locals.selectedEvent = selectedEvent;
    res.locals._page = 'eventpage-basic';
    return res.render('organizer/event-page', {
      selectedEvent,
      session: req.session,
      success: req.query.success || null,
      error: req.query.error || null
    });
  } catch (err) {
    console.error('[organizer:event-page GET]', err.message);
    return res.status(500).render('error', { message: 'Failed to load event page builder', session: req.session });
  }
});

router.post('/event-page', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const {
      event_id, name, description, about, problem_statement, rules, eligibility,
      banner_url, contact_email, website_url, submissions_open, submissions_close,
      judging_open, judging_close, prizes_summary, faqs, sponsors, partners
    } = req.body;

    if (!event_id || !name) {
      return res.status(400).render('error', { message: 'Event ID and Name are required', session: req.session });
    }

    db.prepare(`
      UPDATE events
      SET name = ?, description = ?, about = ?, problem_statement = ?, rules = ?, eligibility = ?,
          banner_url = ?, contact_email = ?, website_url = ?, submissions_open = ?, submissions_close = ?,
          judging_open = ?, judging_close = ?, prizes_summary = ?, faqs = ?, sponsors = ?, partners = ?
      WHERE id = ?
    `).run(
      name, description || '', about || '', problem_statement || '', rules || '', eligibility || '',
      banner_url || '', contact_email || '', website_url || '',
      submissions_open || null, submissions_close || null,
      judging_open || null, judging_close || null,
      prizes_summary || '', faqs || '', sponsors || '', partners || '',
      event_id
    );

    const now = new Date().toISOString();
    db.prepare('INSERT INTO audit_log (id, actor_id, action, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(`al_${Date.now()}`, req.session.userId, 'event_page_updated', event_id, name, now);

    return res.redirect(`/organizer/event-page?event_id=${event_id}&success=${encodeURIComponent('Event page customized successfully')}`);
  } catch (err) {
    console.error('[organizer:event-page POST]', err.message);
    return res.status(500).render('error', { message: 'Failed to update event page', session: req.session });
  }
});

/**
 * GET & POST /organizer/tracks
 */
router.get('/tracks', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const selectedEvent = resolveSelectedEvent(db, req);
    res.locals.selectedEvent = selectedEvent;
    res.locals._page = 'tracks-all';

    const tracks = db.prepare(`
      SELECT tr.*,
        (SELECT COUNT(*) FROM projects p WHERE p.track_id = tr.id AND p.status = 'submitted') AS project_count,
        (SELECT COUNT(DISTINCT ja.judge_id) FROM judge_assignments ja JOIN projects p ON p.id = ja.project_id WHERE p.track_id = tr.id) AS judge_count
      FROM tracks tr
      WHERE tr.event_id = ?
      ORDER BY tr.name
    `).all(selectedEvent.id);

    return res.render('organizer/tracks', { tracks, selectedEvent, session: req.session });
  } catch (err) {
    console.error('[organizer:tracks GET]', err.message);
    return res.status(500).render('error', { message: 'Failed to load tracks', session: req.session });
  }
});

router.post('/tracks', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const { event_id, name, description, prize_title, problem_statement } = req.body;
    if (!name) return res.status(400).render('error', { message: 'Track name is required', session: req.session });
    const eid = event_id || req.session?.selectedEventId || ACTIVE_EVENT_ID;
    const trackId = `trk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    db.prepare('INSERT INTO tracks (id, event_id, name, description, prize_title, problem_statement, status) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(trackId, eid, name.trim(), description || '', prize_title || '', problem_statement || '', 'active');
    const now = new Date().toISOString();
    db.prepare('INSERT INTO audit_log (id, actor_id, action, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(`al_${Date.now()}`, req.session.userId, 'track_created', trackId, name, now);

    return res.redirect(`/organizer/tracks?event_id=${eid}`);
  } catch (err) {
    console.error('[organizer:tracks POST]', err.message);
    return res.status(500).render('error', { message: 'Failed to create track', session: req.session });
  }
});

router.post('/tracks/update', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const { id, name, description, prize_title, problem_statement, status, event_id } = req.body;
    if (!id || !name) return res.status(400).render('error', { message: 'Track ID and name are required', session: req.session });
    const eid = event_id || req.session?.selectedEventId || ACTIVE_EVENT_ID;

    db.prepare(`
      UPDATE tracks
      SET name = ?, description = ?, prize_title = ?, problem_statement = ?, status = ?
      WHERE id = ?
    `).run(name.trim(), description || '', prize_title || '', problem_statement || '', status || 'active', id);

    db.prepare('INSERT INTO audit_log (id, actor_id, action, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(`al_${Date.now()}`, req.session.userId, 'track_updated', id, name, new Date().toISOString());

    return res.redirect(`/organizer/tracks?event_id=${eid}`);
  } catch (err) {
    console.error('[organizer:tracks/update POST]', err.message);
    return res.status(500).render('error', { message: 'Failed to update track', session: req.session });
  }
});

router.post('/tracks/delete', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const { id, event_id } = req.body;
    const eid = event_id || req.session?.selectedEventId || ACTIVE_EVENT_ID;

    db.prepare('DELETE FROM tracks WHERE id = ?').run(id);
    db.prepare('INSERT INTO audit_log (id, actor_id, action, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(`al_${Date.now()}`, req.session.userId, 'track_deleted', id, '', new Date().toISOString());

    return res.redirect(`/organizer/tracks?event_id=${eid}`);
  } catch (err) {
    console.error('[organizer:tracks/delete POST]', err.message);
    return res.status(500).render('error', { message: 'Failed to delete track', session: req.session });
  }
});

router.post('/tracks/duplicate', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const { id, event_id } = req.body;
    const eid = event_id || req.session?.selectedEventId || ACTIVE_EVENT_ID;
    const original = db.prepare('SELECT * FROM tracks WHERE id = ?').get(id);
    if (!original) return res.status(404).render('error', { message: 'Track not found', session: req.session });

    const newTrackId = `trk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    db.prepare('INSERT INTO tracks (id, event_id, name, description, prize_title, problem_statement, status) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(newTrackId, eid, `${original.name} (Copy)`, original.description || '', original.prize_title || '', original.problem_statement || '', 'active');

    db.prepare('INSERT INTO audit_log (id, actor_id, action, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(`al_${Date.now()}`, req.session.userId, 'track_duplicated', newTrackId, original.name, new Date().toISOString());

    return res.redirect(`/organizer/tracks?event_id=${eid}`);
  } catch (err) {
    console.error('[organizer:tracks/duplicate POST]', err.message);
    return res.status(500).render('error', { message: 'Failed to duplicate track', session: req.session });
  }
});

/**
 * GET /organizer/registrations
 * Full Registrations management supporting:
 * All Registrations, Pending, Approved, Rejected, Waitlisted, Individual, Team,
 * Search, Filters, Verification, Custom forms, Bulk actions, Import & Export.
 */
router.get('/registrations', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const selectedEvent = resolveSelectedEvent(db, req);
    res.locals.selectedEvent = selectedEvent;

    const statusFilter = req.query.status || '';
    const typeFilter   = req.query.type || '';
    const searchQuery  = (req.query.q || '').trim().toLowerCase();
    const tab          = req.query.tab || (statusFilter || typeFilter || 'all');
    res.locals._page   = 'registrations-' + tab;

    // Fetch all participants with team membership info
    const allParticipants = db.prepare(`
      SELECT u.id, u.name, u.email,
             COALESCE(u.registration_status, 'approved') AS registration_status,
             COALESCE(u.verification_status, 'verified') AS verification_status,
             u.registered_at,
             t.name AS team_name,
             t.id AS team_id,
             CASE WHEN tm.team_id IS NOT NULL THEN 'team' ELSE 'individual' END AS reg_type
      FROM users u
      LEFT JOIN team_members tm ON tm.user_id = u.id
      LEFT JOIN teams t ON t.id = tm.team_id
      WHERE u.role = 'participant'
      ORDER BY u.name ASC
    `).all();

    // Tab counts
    const counts = {
      all:         allParticipants.length,
      pending:     allParticipants.filter(p => p.registration_status === 'pending').length,
      approved:    allParticipants.filter(p => p.registration_status === 'approved').length,
      rejected:    allParticipants.filter(p => p.registration_status === 'rejected').length,
      waitlisted:  allParticipants.filter(p => p.registration_status === 'waitlisted').length,
      individual:  allParticipants.filter(p => p.reg_type === 'individual').length,
      team:        allParticipants.filter(p => p.reg_type === 'team').length,
    };

    // Filter display list
    let registrants = allParticipants;
    if (statusFilter) {
      registrants = registrants.filter(p => p.registration_status === statusFilter);
    }
    if (typeFilter) {
      registrants = registrants.filter(p => p.reg_type === typeFilter);
    }
    if (searchQuery) {
      registrants = registrants.filter(p =>
        (p.name && p.name.toLowerCase().includes(searchQuery)) ||
        (p.email && p.email.toLowerCase().includes(searchQuery)) ||
        (p.team_name && p.team_name.toLowerCase().includes(searchQuery))
      );
    }

    // Load custom settings
    let regSettings = db.prepare('SELECT * FROM registration_settings WHERE event_id = ?').get(selectedEvent.id);
    if (!regSettings) {
      regSettings = {
        event_id: selectedEvent.id,
        form_fields: JSON.stringify(['github', 'linkedin', 'tshirt']),
        auto_approval: 'auto',
        allowed_domains: ''
      };
    }

    return res.render('organizer/registrations', {
      registrants,
      counts,
      tab,
      statusFilter,
      typeFilter,
      searchQuery,
      regSettings,
      selectedEvent,
      session: req.session,
      success: req.query.success || null,
      error: req.query.error || null
    });
  } catch (err) {
    console.error('[organizer:registrations GET]', err.message);
    return res.status(500).render('error', { message: 'Failed to load registrations', session: req.session });
  }
});

/**
 * POST /organizer/registrations/status
 * Update single participant status (approved, rejected, waitlisted, pending)
 */
router.post('/registrations/status', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const { user_id, status, verification_status } = req.body;
    if (!user_id || !status) {
      return res.status(400).render('error', { message: 'Missing user_id or status', session: req.session });
    }

    const ver = verification_status || (status === 'rejected' ? 'unverified' : 'verified');
    db.prepare('UPDATE users SET registration_status = ?, verification_status = ? WHERE id = ?').run(status, ver, user_id);

    const now = new Date().toISOString();
    db.prepare('INSERT INTO audit_log (id, actor_id, action, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(`al_${Date.now()}`, req.session.userId, 'registration_status_changed', user_id, `Status updated to ${status}`, now);

    return res.redirect(req.headers.referer || '/organizer/registrations');
  } catch (err) {
    console.error('[registrations:status POST]', err.message);
    return res.status(500).render('error', { message: 'Failed to update registration status', session: req.session });
  }
});

/**
 * POST /organizer/registrations/bulk
 * Bulk approve / waitlist / reject
 */
router.post('/registrations/bulk', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const { action, user_ids } = req.body;
    let ids = [];
    if (Array.isArray(user_ids)) ids = user_ids;
    else if (typeof user_ids === 'string') ids = user_ids.split(',').map(s => s.trim()).filter(Boolean);

    if (ids.length === 0) {
      return res.redirect(req.headers.referer || '/organizer/registrations');
    }

    let newStatus = 'approved';
    let newVer = 'verified';
    if (action === 'reject') { newStatus = 'rejected'; newVer = 'unverified'; }
    else if (action === 'waitlist') { newStatus = 'waitlisted'; newVer = 'verified'; }
    else if (action === 'approve') { newStatus = 'approved'; newVer = 'verified'; }

    const updateStmt = db.prepare('UPDATE users SET registration_status = ?, verification_status = ? WHERE id = ?');
    const now = new Date().toISOString();
    const auditStmt = db.prepare('INSERT INTO audit_log (id, actor_id, action, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)');

    for (const uid of ids) {
      updateStmt.run(newStatus, newVer, uid);
    }
    auditStmt.run(`al_${Date.now()}`, req.session.userId, 'registration_bulk_update', `${ids.length} users`, `Bulk action: ${action}`, now);

    return res.redirect(`/organizer/registrations?success=${encodeURIComponent(`Updated ${ids.length} participants to ${newStatus}`)}`);
  } catch (err) {
    console.error('[registrations:bulk POST]', err.message);
    return res.status(500).render('error', { message: 'Failed to perform bulk registration update', session: req.session });
  }
});

/**
 * POST /organizer/registrations/forms
 * Save custom registration questionnaire settings
 */
router.post('/registrations/forms', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const { event_id, form_fields } = req.body;
    const eid = event_id || req.session?.selectedEventId || ACTIVE_EVENT_ID;
    const fieldsStr = Array.isArray(form_fields) ? JSON.stringify(form_fields) : JSON.stringify([form_fields].filter(Boolean));

    db.prepare(`
      INSERT INTO registration_settings (event_id, form_fields, auto_approval, allowed_domains)
      VALUES (?, ?, 'auto', '')
      ON CONFLICT(event_id) DO UPDATE SET form_fields = excluded.form_fields
    `).run(eid, fieldsStr);

    return res.redirect(`/organizer/registrations?event_id=${eid}&success=${encodeURIComponent('Registration form configuration saved successfully')}`);
  } catch (err) {
    console.error('[registrations:forms POST]', err.message);
    return res.status(500).render('error', { message: 'Failed to save registration form fields', session: req.session });
  }
});

/**
 * POST /organizer/registrations/verification
 * Save verification & auto-approval rules
 */
router.post('/registrations/verification', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const { event_id, auto_approval, allowed_domains } = req.body;
    const eid = event_id || req.session?.selectedEventId || ACTIVE_EVENT_ID;

    db.prepare(`
      INSERT INTO registration_settings (event_id, form_fields, auto_approval, allowed_domains)
      VALUES (?, '[]', ?, ?)
      ON CONFLICT(event_id) DO UPDATE SET auto_approval = excluded.auto_approval, allowed_domains = excluded.allowed_domains
    `).run(eid, auto_approval || 'auto', allowed_domains || '');

    return res.redirect(`/organizer/registrations?event_id=${eid}&success=${encodeURIComponent('Eligibility verification rules updated')}`);
  } catch (err) {
    console.error('[registrations:verification POST]', err.message);
    return res.status(500).render('error', { message: 'Failed to save verification rules', session: req.session });
  }
});

/**
 * POST /organizer/registrations/import
 * Bulk import participants from CSV text or input
 */
router.post('/registrations/import', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const { csv_data, event_id } = req.body;
    if (!csv_data || !csv_data.trim()) {
      return res.status(400).render('error', { message: 'CSV data is required', session: req.session });
    }

    const lines = csv_data.trim().split(/[\r\n]+/).filter(Boolean);
    const insertUser = db.prepare(`
      INSERT OR IGNORE INTO users (id, name, email, role, registration_status, verification_status, registered_at)
      VALUES (?, ?, ?, 'participant', 'approved', 'verified', ?)
    `);

    let imported = 0;
    const now = new Date().toISOString();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // Skip header line if present
      if (i === 0 && line.toLowerCase().includes('email')) continue;

      const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      if (cols.length >= 2) {
        const name = cols[0];
        const email = cols[1].toLowerCase();
        if (name && email.includes('@')) {
          const userId = `usr_imp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
          const res = insertUser.run(userId, name, email, now);
          if (res.changes > 0) imported++;
        }
      }
    }

    const eid = event_id || req.session?.selectedEventId || ACTIVE_EVENT_ID;
    return res.redirect(`/organizer/registrations?event_id=${eid}&success=${encodeURIComponent(`Successfully imported ${imported} new participant(s)!`)}`);
  } catch (err) {
    console.error('[registrations:import POST]', err.message);
    return res.status(500).render('error', { message: 'Failed to import participants: ' + err.message, session: req.session });
  }
});

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * TEAMS MANAGEMENT
 * ─────────────────────────────────────────────────────────────────────────────
 */
router.get('/teams', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const selectedEvent = resolveSelectedEvent(db, req);
    res.locals.selectedEvent = selectedEvent;
    res.locals._page = 'teams-all';

    const filter = req.query.filter || 'all';
    const q = (req.query.q || '').trim();

    let sql = `
      SELECT t.id, t.name, t.invite_code, t.status AS team_status, t.track_id,
        u.name AS leader_name, u.email AS leader_email,
        (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.id) AS member_count,
        (SELECT title FROM projects p WHERE p.team_id = t.id LIMIT 1) AS project_title,
        (SELECT status FROM projects p WHERE p.team_id = t.id LIMIT 1) AS project_status
      FROM teams t
      LEFT JOIN users u ON u.id = t.leader_id
      WHERE t.event_id = ?
    `;
    const params = [selectedEvent.id];

    if (q) {
      sql += ` AND (t.name LIKE ? OR t.invite_code LIKE ? OR u.name LIKE ?)`;
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    if (filter === 'incomplete') {
      sql += ` AND (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.id) < 2`;
    } else if (filter === 'disqualified') {
      sql += ` AND t.status = 'disqualified'`;
    } else if (filter === 'eligible') {
      sql += ` AND (t.status IS NULL OR t.status != 'disqualified') AND (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.id) >= 1`;
    } else if (filter === 'leaders') {
      sql += ` AND t.leader_id IS NOT NULL`;
    }

    if (filter === 'size') {
      sql += ` ORDER BY member_count DESC, t.name ASC`;
    } else {
      sql += ` ORDER BY t.name ASC`;
    }

    const teamList = db.prepare(sql).all(...params);

    // Compute team stats for header KPIs
    const allTeams = db.prepare(`
      SELECT t.status, (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.id) AS member_count,
        (SELECT COUNT(*) FROM projects p WHERE p.team_id = t.id AND p.status = 'submitted') AS has_sub
      FROM teams t WHERE t.event_id = ?
    `).all(selectedEvent.id);

    const teamStats = {
      total: allTeams.length,
      solo: allTeams.filter(t => t.member_count === 1).length,
      complete: allTeams.filter(t => t.member_count >= 2).length,
      disqualified: allTeams.filter(t => t.status === 'disqualified').length,
      withSubmissions: allTeams.filter(t => t.has_sub > 0).length
    };

    return res.render('organizer/teams', { teamList, teamStats, currentFilter: filter, q, selectedEvent, session: req.session });
  } catch (err) {
    console.error('[organizer:teams GET]', err.message);
    return res.status(500).render('error', { message: 'Failed to load teams', session: req.session });
  }
});

router.post('/teams/create', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const { name, event_id, track_id } = req.body;
    if (!name) return res.status(400).render('error', { message: 'Team name is required', session: req.session });
    const eid = event_id || req.session?.selectedEventId || ACTIVE_EVENT_ID;
    const teamId = `tm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const inviteCode = `INV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    db.prepare('INSERT INTO teams (id, event_id, name, invite_code, status, track_id) VALUES (?, ?, ?, ?, ?, ?)')
      .run(teamId, eid, name.trim(), inviteCode, 'active', track_id || null);

    db.prepare('INSERT INTO audit_log (id, actor_id, action, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(`al_${Date.now()}`, req.session.userId, 'team_created', teamId, name, new Date().toISOString());

    return res.redirect(`/organizer/teams?event_id=${eid}`);
  } catch (err) {
    console.error('[organizer:teams/create POST]', err.message);
    return res.status(500).render('error', { message: 'Failed to create team', session: req.session });
  }
});

router.post('/teams/status', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const { team_id, status, event_id } = req.body;
    const eid = event_id || req.session?.selectedEventId || ACTIVE_EVENT_ID;

    db.prepare('UPDATE teams SET status = ? WHERE id = ?').run(status || 'active', team_id);
    db.prepare('INSERT INTO audit_log (id, actor_id, action, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(`al_${Date.now()}`, req.session.userId, 'team_status_updated', team_id, `Status: ${status}`, new Date().toISOString());

    return res.redirect(`/organizer/teams?event_id=${eid}`);
  } catch (err) {
    console.error('[organizer:teams/status POST]', err.message);
    return res.status(500).render('error', { message: 'Failed to update team status', session: req.session });
  }
});

router.post('/teams/delete', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const { team_id, event_id } = req.body;
    const eid = event_id || req.session?.selectedEventId || ACTIVE_EVENT_ID;

    db.prepare('DELETE FROM team_members WHERE team_id = ?').run(team_id);
    db.prepare('DELETE FROM teams WHERE id = ?').run(team_id);

    db.prepare('INSERT INTO audit_log (id, actor_id, action, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(`al_${Date.now()}`, req.session.userId, 'team_deleted', team_id, '', new Date().toISOString());

    return res.redirect(`/organizer/teams?event_id=${eid}`);
  } catch (err) {
    console.error('[organizer:teams/delete POST]', err.message);
    return res.status(500).render('error', { message: 'Failed to delete team', session: req.session });
  }
});

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * PROJECTS MANAGEMENT
 * ─────────────────────────────────────────────────────────────────────────────
 */
router.get('/projects', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const selectedEvent = resolveSelectedEvent(db, req);
    res.locals.selectedEvent = selectedEvent;
    res.locals._page = 'projects-all';

    const statusFilter = req.query.status || 'all';
    const trackFilter = req.query.track || '';
    const q = (req.query.q || '').trim();

    let sql = `
      SELECT p.*, t.name AS team_name, tr.name AS track_name,
        (SELECT COUNT(*) FROM scores s WHERE s.project_id = p.id) AS review_count
      FROM projects p
      LEFT JOIN teams t ON t.id = p.team_id
      LEFT JOIN tracks tr ON tr.id = p.track_id
      WHERE p.event_id = ?
    `;
    const params = [selectedEvent.id];

    if (q) {
      sql += ` AND (p.title LIKE ? OR t.name LIKE ? OR p.summary LIKE ?)`;
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    if (statusFilter === 'shortlisted') {
      sql += ` AND (p.is_shortlisted = 1 OR p.status = 'shortlisted')`;
    } else if (statusFilter === 'submitted') {
      sql += ` AND p.status = 'submitted'`;
    } else if (statusFilter === 'late') {
      sql += ` AND p.status = 'late'`;
    } else if (statusFilter === 'draft') {
      sql += ` AND (p.status = 'draft' OR p.status = 'idea')`;
    } else if (statusFilter === 'rejected') {
      sql += ` AND p.status = 'rejected'`;
    }

    if (trackFilter) {
      sql += ` AND p.track_id = ?`;
      params.push(trackFilter);
    }

    sql += ` ORDER BY p.title ASC`;
    const projectList = db.prepare(sql).all(...params);

    const allProjects = db.prepare('SELECT status, is_shortlisted FROM projects WHERE event_id = ?').all(selectedEvent.id);
    const projectStats = {
      total: allProjects.length,
      submitted: allProjects.filter(p => p.status === 'submitted').length,
      shortlisted: allProjects.filter(p => p.is_shortlisted === 1 || p.status === 'shortlisted').length,
      late: allProjects.filter(p => p.status === 'late').length
    };

    const tracks = db.prepare('SELECT id, name FROM tracks WHERE event_id = ? ORDER BY name ASC').all(selectedEvent.id);

    return res.render('organizer/projects', {
      projectList, projectStats, tracks, currentStatus: statusFilter, currentTrack: trackFilter, q, selectedEvent, session: req.session
    });
  } catch (err) {
    console.error('[organizer:projects GET]', err.message);
    return res.status(500).render('error', { message: 'Failed to load projects', session: req.session });
  }
});

router.post('/projects/status', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const { project_id, status, event_id } = req.body;
    const eid = event_id || req.session?.selectedEventId || ACTIVE_EVENT_ID;

    const isShortlisted = status === 'shortlisted' ? 1 : 0;
    db.prepare('UPDATE projects SET status = ?, is_shortlisted = ? WHERE id = ?').run(status, isShortlisted, project_id);

    db.prepare('INSERT INTO audit_log (id, actor_id, action, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(`al_${Date.now()}`, req.session.userId, 'project_status_updated', project_id, `Status: ${status}`, new Date().toISOString());

    return res.redirect(`/organizer/projects?event_id=${eid}`);
  } catch (err) {
    console.error('[organizer:projects/status POST]', err.message);
    return res.status(500).render('error', { message: 'Failed to update project status', session: req.session });
  }
});

router.post('/projects/bulk', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const { action, event_id } = req.body;
    let projectIds = req.body.project_ids;
    if (typeof projectIds === 'string') {
      projectIds = projectIds.split(',').map(s => s.trim()).filter(Boolean);
    } else if (!Array.isArray(projectIds)) {
      projectIds = [];
    }
    const eid = event_id || req.session?.selectedEventId || ACTIVE_EVENT_ID;

    if (action === 'shortlist') {
      for (const pid of projectIds) {
        db.prepare("UPDATE projects SET is_shortlisted = 1, status = 'shortlisted' WHERE id = ?").run(pid);
      }
    } else if (action === 'reject') {
      for (const pid of projectIds) {
        db.prepare("UPDATE projects SET status = 'rejected', is_shortlisted = 0 WHERE id = ?").run(pid);
      }
    } else if (action === 'restore') {
      for (const pid of projectIds) {
        db.prepare("UPDATE projects SET status = 'submitted', is_shortlisted = 0 WHERE id = ?").run(pid);
      }
    }

    db.prepare('INSERT INTO audit_log (id, actor_id, action, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(`al_${Date.now()}`, req.session.userId, `projects_bulk_${action}`, `${projectIds.length} projects`, JSON.stringify(projectIds), new Date().toISOString());

    return res.redirect(`/organizer/projects?event_id=${eid}`);
  } catch (err) {
    console.error('[organizer:projects/bulk POST]', err.message);
    return res.status(500).render('error', { message: 'Failed to perform bulk action', session: req.session });
  }
});

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * JUDGES & CONFLICTS MANAGEMENT
 * ─────────────────────────────────────────────────────────────────────────────
 */
router.get('/judges', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const selectedEvent = resolveSelectedEvent(db, req);
    res.locals.selectedEvent = selectedEvent;
    res.locals._page = 'judges-all';

    const judgeList = db.prepare(`
      SELECT u.id, u.name, u.email, u.expertise, u.is_active,
        (SELECT COUNT(*) FROM judge_assignments ja JOIN projects p ON p.id = ja.project_id WHERE ja.judge_id = u.id AND p.event_id = ?) AS assigned,
        (SELECT COUNT(*) FROM scores s JOIN projects p ON p.id = s.project_id WHERE s.judge_id = u.id AND p.event_id = ?) AS completed
      FROM users u
      WHERE u.role = 'judge'
      ORDER BY u.name ASC
    `).all(selectedEvent.id, selectedEvent.id);

    const totalAssigned = judgeList.reduce((acc, j) => acc + (j.assigned || 0), 0);
    const totalCompleted = judgeList.reduce((acc, j) => acc + (j.completed || 0), 0);
    const judgeStats = {
      total: judgeList.length,
      assignments: totalAssigned,
      avgWorkload: judgeList.length ? (totalAssigned / judgeList.length).toFixed(1) : 0,
      responseRate: totalAssigned ? Math.round((totalCompleted / totalAssigned) * 100) : 0
    };

    return res.render('organizer/judges', { judgeList, judgeStats, selectedEvent, session: req.session });
  } catch (err) {
    console.error('[organizer:judges GET]', err.message);
    return res.status(500).render('error', { message: 'Failed to load judges', session: req.session });
  }
});

router.post('/judges/status', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const { judge_id, is_active, event_id } = req.body;
    const eid = event_id || req.session?.selectedEventId || ACTIVE_EVENT_ID;

    db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(is_active ? 1 : 0, judge_id);
    db.prepare('INSERT INTO audit_log (id, actor_id, action, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(`al_${Date.now()}`, req.session.userId, 'judge_status_updated', judge_id, `Active: ${is_active}`, new Date().toISOString());

    return res.redirect(`/organizer/judges?event_id=${eid}`);
  } catch (err) {
    console.error('[organizer:judges/status POST]', err.message);
    return res.status(500).render('error', { message: 'Failed to update judge status', session: req.session });
  }
});

router.get('/judges/conflicts', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const selectedEvent = resolveSelectedEvent(db, req);
    res.locals.selectedEvent = selectedEvent;
    res.locals._page = 'judges-conflicts';

    const conflictsList = db.prepare(`
      SELECT jc.*, u.name AS judge_name, u.email AS judge_email, p.title AS project_title, t.name AS team_name
      FROM judge_conflicts jc
      LEFT JOIN users u ON u.id = jc.judge_id
      LEFT JOIN projects p ON p.id = jc.project_id
      LEFT JOIN teams t ON t.id = p.team_id
      ORDER BY jc.created_at DESC
    `).all();

    const judges = db.prepare("SELECT id, name FROM users WHERE role = 'judge' ORDER BY name ASC").all();
    const projects = db.prepare('SELECT id, title FROM projects WHERE event_id = ? ORDER BY title ASC').all(selectedEvent.id);

    return res.render('organizer/conflicts', { conflictsList, judges, projects, selectedEvent, session: req.session });
  } catch (err) {
    console.error('[organizer:conflicts GET]', err.message);
    return res.status(500).render('error', { message: 'Failed to load conflicts', session: req.session });
  }
});

router.post('/judges/conflicts', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const { judge_id, project_id, reason, event_id } = req.body;
    const eid = event_id || req.session?.selectedEventId || ACTIVE_EVENT_ID;

    const conflictId = `cf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    db.prepare('INSERT INTO judge_conflicts (id, judge_id, project_id, reason, status, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(conflictId, judge_id, project_id, reason || 'Declared Conflict of Interest', 'flagged', new Date().toISOString());

    // Automatically remove any judge assignment between this judge and project
    db.prepare('DELETE FROM judge_assignments WHERE judge_id = ? AND project_id = ?').run(judge_id, project_id);

    db.prepare('INSERT INTO audit_log (id, actor_id, action, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(`al_${Date.now()}`, req.session.userId, 'judge_conflict_recorded', conflictId, reason, new Date().toISOString());

    return res.redirect(`/organizer/judges/conflicts?event_id=${eid}`);
  } catch (err) {
    console.error('[organizer:conflicts POST]', err.message);
    return res.status(500).render('error', { message: 'Failed to record conflict', session: req.session });
  }
});

router.post('/judges/conflicts/resolve', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const { conflict_id, event_id } = req.body;
    const eid = event_id || req.session?.selectedEventId || ACTIVE_EVENT_ID;

    db.prepare("UPDATE judge_conflicts SET status = 'resolved' WHERE id = ?").run(conflict_id);
    db.prepare('INSERT INTO audit_log (id, actor_id, action, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(`al_${Date.now()}`, req.session.userId, 'judge_conflict_resolved', conflict_id, '', new Date().toISOString());

    return res.redirect(`/organizer/judges/conflicts?event_id=${eid}`);
  } catch (err) {
    console.error('[organizer:conflicts/resolve POST]', err.message);
    return res.status(500).render('error', { message: 'Failed to resolve conflict', session: req.session });
  }
});

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * JUDGING CENTER, RUBRIC, INTEGRITY & RE-EVALUATION
 * ─────────────────────────────────────────────────────────────────────────────
 */
router.get('/judging', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const selectedEvent = resolveSelectedEvent(db, req);
    res.locals.selectedEvent = selectedEvent;
    res.locals._page = 'judging-overview';

    const rubricCriteria = db.prepare('SELECT * FROM rubric_criteria WHERE event_id = ? ORDER BY id ASC').all(selectedEvent.id);
    const totalRubrics = rubricCriteria.length;

    const totalJudges = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'judge'").get().c || 0;
    const assignmentsCount = db.prepare(`
      SELECT COUNT(*) AS c FROM judge_assignments ja
      JOIN projects p ON p.id = ja.project_id
      WHERE p.event_id = ?
    `).get(selectedEvent.id).c || 0;

    const completedReviews = db.prepare(`
      SELECT COUNT(*) AS c FROM scores s
      JOIN projects p ON p.id = s.project_id
      WHERE p.event_id = ?
    `).get(selectedEvent.id).c || 0;

    const pendingReviews = Math.max(0, assignmentsCount - completedReviews);

    const judgeStats = {
      totalJudges,
      assignmentsCount,
      completedReviews,
      pendingReviews
    };

    const recentReviews = db.prepare(`
      SELECT s.*, u.name AS judge_name, p.title AS project_title, t.name AS team_name
      FROM scores s
      JOIN users u ON u.id = s.judge_id
      JOIN projects p ON p.id = s.project_id
      LEFT JOIN teams t ON t.id = p.team_id
      WHERE p.event_id = ?
      ORDER BY s.submitted_at DESC
      LIMIT 10
    `).all(selectedEvent.id);

    // Platform settings for judging
    const settingsRows = db.prepare('SELECT key, value FROM platform_settings').all();
    const settings = {};
    for (const r of settingsRows) settings[r.key] = r.value;

    return res.render('organizer/judging', {
      rubricCriteria, totalRubrics, judgeStats, recentReviews, settings, selectedEvent, session: req.session
    });
  } catch (err) {
    console.error('[organizer:judging GET]', err.message);
    return res.status(500).render('error', { message: 'Failed to load judging center', session: req.session });
  }
});

router.post('/judging/settings', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const { score_scale, normalization_method, require_feedback, min_reviews, event_id } = req.body;
    const eid = event_id || req.session?.selectedEventId || ACTIVE_EVENT_ID;

    const upsert = db.prepare(`
      INSERT INTO platform_settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);
    upsert.run('judging_score_scale', score_scale || '1-10');
    upsert.run('judging_normalization_method', normalization_method || 'z-score');
    upsert.run('judging_require_feedback', require_feedback ? '1' : '0');
    upsert.run('judging_min_reviews', min_reviews || '3');

    db.prepare('INSERT INTO audit_log (id, actor_id, action, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(`al_${Date.now()}`, req.session.userId, 'judging_settings_updated', eid, 'Saved judging configuration', new Date().toISOString());

    return res.redirect(`/organizer/judging?event_id=${eid}&saved=true`);
  } catch (err) {
    console.error('[organizer:judging/settings POST]', err.message);
    return res.status(500).render('error', { message: 'Failed to save judging settings', session: req.session });
  }
});

router.get('/integrity', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const selectedEvent = resolveSelectedEvent(db, req);
    res.locals.selectedEvent = selectedEvent;
    res.locals._page = 'judging-integrity';

    // Find score anomalies where a judge's score strongly deviates from the project average
    const projectScores = db.prepare(`
      SELECT s.project_id, p.title AS project_title, s.judge_id, u.name AS judge_name, s.comment,
        s.criteria_scores, s.submitted_at
      FROM scores s
      JOIN projects p ON p.id = s.project_id
      JOIN users u ON u.id = s.judge_id
      WHERE p.event_id = ?
    `).all(selectedEvent.id);

    // Group scores by project
    const byProject = {};
    for (const row of projectScores) {
      if (!byProject[row.project_id]) byProject[row.project_id] = [];
      const parsed = JSON.parse(row.criteria_scores || '{}');
      const vals = Object.values(parsed).filter(v => typeof v === 'number');
      const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      byProject[row.project_id].push({ ...row, avgScore: avg });
    }

    const anomalies = [];
    for (const [pid, list] of Object.entries(byProject)) {
      if (list.length >= 2) {
        const mean = list.reduce((a, b) => a + b.avgScore, 0) / list.length;
        for (const item of list) {
          const diff = Math.abs(item.avgScore - mean);
          if (diff >= 2.0) {
            anomalies.push({
              project_title: item.project_title,
              judge_name: item.judge_name,
              score: item.avgScore.toFixed(2),
              mean: mean.toFixed(2),
              diff: diff.toFixed(2),
              submitted_at: item.submitted_at,
              comment: item.comment || 'No comment provided'
            });
          }
        }
      }
    }

    // Check judge scoring bias
    const judgeBiases = db.prepare(`
      SELECT u.name AS judge_name, u.email,
        COUNT(s.id) AS total_reviews,
        ROUND(AVG(
          (SELECT AVG(value) FROM json_each(s.criteria_scores))
        ), 2) AS avg_given_score
      FROM scores s
      JOIN users u ON u.id = s.judge_id
      JOIN projects p ON p.id = s.project_id
      WHERE p.event_id = ?
      GROUP BY s.judge_id
      HAVING total_reviews >= 3
      ORDER BY avg_given_score DESC
    `).all(selectedEvent.id);

    return res.render('organizer/integrity', { anomalies, judgeBiases, selectedEvent, session: req.session });
  } catch (err) {
    console.error('[organizer:integrity GET]', err.message);
    return res.status(500).render('error', { message: 'Failed to load integrity analysis', session: req.session });
  }
});

router.get('/reevaluation', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const selectedEvent = resolveSelectedEvent(db, req);
    res.locals.selectedEvent = selectedEvent;
    res.locals._page = 'judging-reeval';

    const requestsList = db.prepare(`
      SELECT rr.*, p.title AS project_title, t.name AS team_name, u.name AS judge_name
      FROM reevaluation_requests rr
      JOIN projects p ON p.id = rr.project_id
      LEFT JOIN teams t ON t.id = p.team_id
      LEFT JOIN users u ON u.id = rr.judge_id
      WHERE p.event_id = ?
      ORDER BY rr.created_at DESC
    `).all(selectedEvent.id);

    const projectsList = db.prepare('SELECT id, title FROM projects WHERE event_id = ? ORDER BY title ASC').all(selectedEvent.id);
    const judgesList = db.prepare("SELECT id, name FROM users WHERE role = 'judge' ORDER BY name ASC").all();

    return res.render('organizer/reevaluation', { requestsList, projectsList, judgesList, selectedEvent, session: req.session });
  } catch (err) {
    console.error('[organizer:reevaluation GET]', err.message);
    return res.status(500).render('error', { message: 'Failed to load re-evaluations', session: req.session });
  }
});

router.post('/reevaluation/request', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const { project_id, judge_id, reason, event_id } = req.body;
    const eid = event_id || req.session?.selectedEventId || ACTIVE_EVENT_ID;

    const reqId = `re_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    db.prepare(`
      INSERT INTO reevaluation_requests (id, project_id, judge_id, reason, requested_by, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'pending', ?)
    `).run(reqId, project_id, judge_id || null, reason || 'Organizer requested re-evaluation', req.session.userId, new Date().toISOString());

    if (judge_id) {
      db.prepare('DELETE FROM scores WHERE project_id = ? AND judge_id = ?').run(project_id, judge_id);
    }

    db.prepare('INSERT INTO audit_log (id, actor_id, action, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(`al_${Date.now()}`, req.session.userId, 'reevaluation_requested', reqId, reason, new Date().toISOString());

    return res.redirect(`/organizer/reevaluation?event_id=${eid}`);
  } catch (err) {
    console.error('[organizer:reevaluation/request POST]', err.message);
    return res.status(500).render('error', { message: 'Failed to request re-evaluation', session: req.session });
  }
});

router.post('/reevaluation/resolve', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const { request_id, event_id } = req.body;
    const eid = event_id || req.session?.selectedEventId || ACTIVE_EVENT_ID;

    db.prepare("UPDATE reevaluation_requests SET status = 'resolved', resolved_at = ? WHERE id = ?")
      .run(new Date().toISOString(), request_id);

    db.prepare('INSERT INTO audit_log (id, actor_id, action, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(`al_${Date.now()}`, req.session.userId, 'reevaluation_resolved', request_id, '', new Date().toISOString());

    return res.redirect(`/organizer/reevaluation?event_id=${eid}`);
  } catch (err) {
    console.error('[organizer:reevaluation/resolve POST]', err.message);
    return res.status(500).render('error', { message: 'Failed to resolve re-evaluation', session: req.session });
  }
});

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * ANALYTICS & REPORTING
 * ─────────────────────────────────────────────────────────────────────────────
 */
router.get('/analytics', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const selectedEvent = resolveSelectedEvent(db, req);
    res.locals.selectedEvent = selectedEvent;
    res.locals._page = 'analytics-overview';

    const totalParticipants = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'participant'").get().c || 0;
    const totalTeams = db.prepare('SELECT COUNT(*) AS c FROM teams WHERE event_id = ?').get(selectedEvent.id).c || 0;
    const totalSubmissions = db.prepare("SELECT COUNT(*) AS c FROM projects WHERE event_id = ? AND status = 'submitted'").get(selectedEvent.id).c || 0;
    const totalViews = db.prepare('SELECT COALESCE(SUM(view_count), 0) AS c FROM projects WHERE event_id = ?').get(selectedEvent.id).c || 0;
    const totalVotes = db.prepare(`
      SELECT COUNT(*) AS c FROM project_votes pv
      JOIN projects p ON p.id = pv.project_id
      WHERE p.event_id = ?
    `).get(selectedEvent.id).c || 0;

    const trackBreakdown = db.prepare(`
      SELECT tr.name, COUNT(p.id) AS count
      FROM tracks tr
      LEFT JOIN projects p ON p.track_id = tr.id AND p.event_id = ?
      WHERE tr.event_id = ?
      GROUP BY tr.id
      ORDER BY count DESC
    `).all(selectedEvent.id, selectedEvent.id);

    const totalAssignments = db.prepare(`
      SELECT COUNT(*) AS c FROM judge_assignments ja
      JOIN projects p ON p.id = ja.project_id
      WHERE p.event_id = ?
    `).get(selectedEvent.id).c || 0;

    const completedReviews = db.prepare(`
      SELECT COUNT(*) AS c FROM scores s
      JOIN projects p ON p.id = s.project_id
      WHERE p.event_id = ?
    `).get(selectedEvent.id).c || 0;

    const conversionRate = totalTeams > 0 ? ((totalSubmissions / totalTeams) * 100).toFixed(1) : 0;
    const judgingRate = totalAssignments > 0 ? Math.round((completedReviews / totalAssignments) * 100) : 0;

    const analyticsData = {
      totalParticipants,
      totalTeams,
      totalSubmissions,
      totalViews,
      totalVotes,
      conversionRate,
      totalAssignments,
      completedReviews,
      pendingReviews: Math.max(0, totalAssignments - completedReviews),
      judgingRate,
      trackBreakdown
    };

    return res.render('organizer/analytics', { stats: analyticsData, selectedEvent, session: req.session });
  } catch (err) {
    console.error('[organizer:analytics GET]', err.message);
    return res.status(500).render('error', { message: 'Failed to load analytics', session: req.session });
  }
});

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * RESULTS & PUBLISH / HIDE
 * ─────────────────────────────────────────────────────────────────────────────
 */
router.post('/results/publish', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const eid = req.body.event_id || req.session?.selectedEventId || ACTIVE_EVENT_ID;

    db.prepare('UPDATE events SET results_published = 1 WHERE id = ?').run(eid);
    db.prepare('INSERT INTO audit_log (id, actor_id, action, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(`al_${Date.now()}`, req.session.userId, 'results_published', eid, 'Published official results', new Date().toISOString());

    return res.redirect(`/organizer/results?event_id=${eid}&published=true`);
  } catch (err) {
    console.error('[organizer:results/publish POST]', err.message);
    return res.status(500).render('error', { message: 'Failed to publish results', session: req.session });
  }
});

router.post('/results/hide', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const eid = req.body.event_id || req.session?.selectedEventId || ACTIVE_EVENT_ID;

    db.prepare('UPDATE events SET results_published = 0 WHERE id = ?').run(eid);
    db.prepare('INSERT INTO audit_log (id, actor_id, action, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(`al_${Date.now()}`, req.session.userId, 'results_hidden', eid, 'Hid results from public view', new Date().toISOString());

    return res.redirect(`/organizer/results?event_id=${eid}&hidden=true`);
  } catch (err) {
    console.error('[organizer:results/hide POST]', err.message);
    return res.status(500).render('error', { message: 'Failed to hide results', session: req.session });
  }
});

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * COMMUNITY VOTING
 * ─────────────────────────────────────────────────────────────────────────────
 */
router.get('/voting', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const selectedEvent = resolveSelectedEvent(db, req);
    res.locals.selectedEvent = selectedEvent;
    res.locals._page = 'voting-overview';

    const totalVotes = db.prepare(`
      SELECT COUNT(*) AS c FROM project_votes pv
      JOIN projects p ON p.id = pv.project_id
      WHERE p.event_id = ?
    `).get(selectedEvent.id).c || 0;

    const uniqueVoters = db.prepare(`
      SELECT COUNT(DISTINCT pv.user_id) AS c FROM project_votes pv
      JOIN projects p ON p.id = pv.project_id
      WHERE p.event_id = ?
    `).get(selectedEvent.id).c || 0;

    const publicComments = db.prepare(`
      SELECT COUNT(*) AS c FROM project_comments pc
      JOIN projects p ON p.id = pc.project_id
      WHERE p.event_id = ?
    `).get(selectedEvent.id).c || 0;

    const topVotedProjects = db.prepare(`
      SELECT p.id, p.title, t.name AS team_name, tr.name AS track_name, COUNT(pv.user_id) AS vote_count
      FROM projects p
      LEFT JOIN teams t ON t.id = p.team_id
      LEFT JOIN tracks tr ON tr.id = p.track_id
      LEFT JOIN project_votes pv ON pv.project_id = p.id
      WHERE p.event_id = ?
      GROUP BY p.id
      ORDER BY vote_count DESC
      LIMIT 10
    `).all(selectedEvent.id);

    const votingStats = {
      totalVotes,
      uniqueVoters,
      flaggedAnomalies: 0,
      publicComments
    };

    return res.render('organizer/voting', { votingStats, topVotedProjects, selectedEvent, session: req.session });
  } catch (err) {
    console.error('[organizer:voting GET]', err.message);
    return res.status(500).render('error', { message: 'Failed to load voting', session: req.session });
  }
});

router.post('/voting/toggle', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const eid = req.body.event_id || req.session?.selectedEventId || ACTIVE_EVENT_ID;

    const current = db.prepare('SELECT voting_enabled FROM events WHERE id = ?').get(eid)?.voting_enabled || 0;
    const next = current ? 0 : 1;

    db.prepare('UPDATE events SET voting_enabled = ? WHERE id = ?').run(next, eid);
    db.prepare('INSERT INTO audit_log (id, actor_id, action, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(`al_${Date.now()}`, req.session.userId, 'voting_toggled', eid, `Voting: ${next ? 'enabled' : 'disabled'}`, new Date().toISOString());

    return res.redirect(`/organizer/voting?event_id=${eid}`);
  } catch (err) {
    console.error('[organizer:voting/toggle POST]', err.message);
    return res.status(500).render('error', { message: 'Failed to toggle voting', session: req.session });
  }
});

router.post('/voting/settings', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const { voting_open, voting_close, eligibility, event_id } = req.body;
    const eid = event_id || req.session?.selectedEventId || ACTIVE_EVENT_ID;

    db.prepare('UPDATE events SET voting_open = ?, voting_close = ? WHERE id = ?').run(voting_open || null, voting_close || null, eid);

    if (eligibility) {
      db.prepare(`
        INSERT INTO platform_settings (key, value) VALUES ('voting_eligibility', ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `).run(eligibility);
    }

    db.prepare('INSERT INTO audit_log (id, actor_id, action, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(`al_${Date.now()}`, req.session.userId, 'voting_settings_updated', eid, 'Saved voting schedule', new Date().toISOString());

    return res.redirect(`/organizer/voting?event_id=${eid}&saved=true`);
  } catch (err) {
    console.error('[organizer:voting/settings POST]', err.message);
    return res.status(500).render('error', { message: 'Failed to update voting settings', session: req.session });
  }
});

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * COMMUNICATIONS & ANNOUNCEMENTS
 * ─────────────────────────────────────────────────────────────────────────────
 */
router.get('/communications', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const selectedEvent = resolveSelectedEvent(db, req);
    res.locals.selectedEvent = selectedEvent;
    res.locals._page = 'communications-announcements';

    const announcements = db.prepare(`
      SELECT * FROM announcements WHERE event_id = ? ORDER BY created_at DESC
    `).all(selectedEvent.id);

    return res.render('organizer/communications', { announcements, selectedEvent, session: req.session });
  } catch (err) {
    console.error('[organizer:communications GET]', err.message);
    return res.status(500).render('error', { message: 'Failed to load communications', session: req.session });
  }
});

router.post('/communications/announcements', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const { title, content, audience, event_id } = req.body;
    if (!title || !content) return res.status(400).render('error', { message: 'Title and content are required', session: req.session });
    const eid = event_id || req.session?.selectedEventId || ACTIVE_EVENT_ID;

    const annId = `ann_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    db.prepare('INSERT INTO announcements (id, event_id, title, content, audience, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(annId, eid, title.trim(), content.trim(), audience || 'all', new Date().toISOString());

    db.prepare('INSERT INTO audit_log (id, actor_id, action, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(`al_${Date.now()}`, req.session.userId, 'announcement_created', annId, title, new Date().toISOString());

    return res.redirect(`/organizer/communications?event_id=${eid}`);
  } catch (err) {
    console.error('[organizer:announcements POST]', err.message);
    return res.status(500).render('error', { message: 'Failed to create announcement', session: req.session });
  }
});

router.post('/communications/campaign', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const { segment, subject, body, channel, event_id } = req.body;
    const eid = event_id || req.session?.selectedEventId || ACTIVE_EVENT_ID;

    db.prepare('INSERT INTO audit_log (id, actor_id, action, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(`al_${Date.now()}`, req.session.userId, `campaign_sent_${channel || 'email'}`, segment || 'participants', subject || 'Broadcast Alert', new Date().toISOString());

    return res.redirect(`/organizer/communications?event_id=${eid}&sent=true`);
  } catch (err) {
    console.error('[organizer:campaign POST]', err.message);
    return res.status(500).render('error', { message: 'Failed to send campaign', session: req.session });
  }
});

router.get('/notifications', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const selectedEvent = resolveSelectedEvent(db, req);
    res.locals.selectedEvent = selectedEvent;
    res.locals._page = 'notifications';

    const notifications = db.prepare(`
      SELECT al.id, al.action AS type, al.detail AS message, al.created_at, u.name AS actor
      FROM audit_log al
      LEFT JOIN users u ON u.id = al.actor_id
      ORDER BY al.created_at DESC
      LIMIT 50
    `).all();

    return res.render('organizer/notifications', { notifications, selectedEvent, session: req.session });
  } catch (err) {
    return res.status(500).render('error', { message: 'Failed to load notifications', session: req.session });
  }
});

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * AUDIT LOG
 * ─────────────────────────────────────────────────────────────────────────────
 */
router.get('/audit', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const selectedEvent = resolveSelectedEvent(db, req);
    res.locals.selectedEvent = selectedEvent;
    res.locals._page = 'audit-all';

    const action = req.query.action || 'all';
    const q = (req.query.q || '').trim();

    let sql = `
      SELECT al.*, u.name AS actor_name, u.email AS actor_email
      FROM audit_log al
      LEFT JOIN users u ON u.id = al.actor_id
      WHERE 1=1
    `;
    const params = [];

    if (action !== 'all') {
      sql += ' AND al.action = ?';
      params.push(action);
    }
    if (q) {
      sql += ' AND (al.detail LIKE ? OR al.action LIKE ? OR u.name LIKE ?)';
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    sql += ' ORDER BY al.created_at DESC LIMIT 200';
    const auditLogs = db.prepare(sql).all(...params);

    const actions = db.prepare('SELECT DISTINCT action FROM audit_log ORDER BY action ASC').all().map(r => r.action);

    return res.render('organizer/audit', { auditLogs, actions, currentAction: action, q, selectedEvent, session: req.session });
  } catch (err) {
    console.error('[organizer:audit GET]', err.message);
    return res.status(500).render('error', { message: 'Failed to load audit log', session: req.session });
  }
});

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * CERTIFICATES & CREDENTIALS
 * ─────────────────────────────────────────────────────────────────────────────
 */
router.get('/certificates', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const selectedEvent = resolveSelectedEvent(db, req);
    res.locals.selectedEvent = selectedEvent;
    res.locals._page = 'certificates-templates';

    const certificates = db.prepare(`
      SELECT c.*, p.title AS project_title, t.name AS team_name
      FROM certificates c
      LEFT JOIN projects p ON p.id = c.project_id
      LEFT JOIN teams t ON t.id = c.team_id
      WHERE c.event_id = ?
      ORDER BY c.issue_date DESC
    `).all(selectedEvent.id);

    const certStats = {
      total: certificates.length,
      participation: certificates.filter(c => c.type === 'participation').length,
      finalist: certificates.filter(c => c.type === 'finalist').length,
      winner: certificates.filter(c => c.type === 'winner').length,
      special: certificates.filter(c => c.type === 'special').length
    };

    return res.render('organizer/certificates', { certificates, certStats, selectedEvent, session: req.session });
  } catch (err) {
    console.error('[organizer:certificates GET]', err.message);
    return res.status(500).render('error', { message: 'Failed to load certificates', session: req.session });
  }
});

router.post('/certificates/generate', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const { type, event_id } = req.body;
    const eid = event_id || req.session?.selectedEventId || ACTIVE_EVENT_ID;
    const now = new Date().toISOString().slice(0, 10);

    let generatedCount = 0;

    if (type === 'participation' || type === 'all') {
      const eligibleUsers = db.prepare(`
        SELECT DISTINCT u.id, u.name, t.id AS team_id, p.id AS project_id
        FROM users u
        JOIN team_members tm ON tm.user_id = u.id
        JOIN teams t ON t.id = tm.team_id
        JOIN projects p ON p.team_id = t.id
        WHERE p.event_id = ? AND p.status = 'submitted'
      `).all(eid);

      for (const u of eligibleUsers) {
        const certCode = `CERT-2026-DGF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const certId = `crt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        db.prepare(`
          INSERT OR IGNORE INTO certificates (id, event_id, user_id, team_id, project_id, recipient_name, type, title, issue_date, cert_code)
          VALUES (?, ?, ?, ?, ?, ?, 'participation', 'Certificate of Participation', ?, ?)
        `).run(certId, eid, u.id, u.team_id, u.project_id, u.name, now, certCode);
        generatedCount++;
      }
    }

    if (type === 'winner' || type === 'all') {
      // Top 3 projects
      const winners = db.prepare(`
        SELECT p.id, p.title, t.id AS team_id, t.name AS team_name
        FROM projects p
        JOIN teams t ON t.id = p.team_id
        WHERE p.event_id = ? AND p.status = 'submitted'
        LIMIT 3
      `).all(eid);

      const medals = ['1st Place Grand Winner', '2nd Place Runner-Up', '3rd Place Bronze Winner'];
      winners.forEach((w, idx) => {
        const certCode = `CERT-2026-WIN-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const certId = `crt_win_${Date.now()}_${idx}`;
        db.prepare(`
          INSERT OR IGNORE INTO certificates (id, event_id, user_id, team_id, project_id, recipient_name, type, title, issue_date, cert_code)
          VALUES (?, ?, NULL, ?, ?, ?, 'winner', ?, ?, ?)
        `).run(certId, eid, w.team_id, w.id, w.team_name, medals[idx] || 'Winner', now, certCode);
        generatedCount++;
      });
    }

    db.prepare('INSERT INTO audit_log (id, actor_id, action, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(`al_${Date.now()}`, req.session.userId, 'certificates_generated', eid, `Type: ${type}, Generated: ${generatedCount}`, new Date().toISOString());

    return res.redirect(`/organizer/certificates?event_id=${eid}&generated=true`);
  } catch (err) {
    console.error('[organizer:certificates/generate POST]', err.message);
    return res.status(500).render('error', { message: 'Failed to generate certificates', session: req.session });
  }
});

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * EXPORT CENTER & SETTINGS
 * ─────────────────────────────────────────────────────────────────────────────
 */
router.get('/export', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const selectedEvent = resolveSelectedEvent(db, req);
    res.locals.selectedEvent = selectedEvent;
    res.locals._page = 'export-all';
    return res.render('organizer/export', { selectedEvent, session: req.session });
  } catch (err) {
    console.error('[organizer:export GET]', err.message);
    return res.status(500).render('error', { message: 'Failed to load export center', session: req.session });
  }
});

router.get('/settings', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const selectedEvent = resolveSelectedEvent(db, req);
    res.locals.selectedEvent = selectedEvent;
    res.locals._page = 'settings-general';

    const rows = db.prepare('SELECT key, value FROM platform_settings').all();
    const settings = {};
    for (const r of rows) settings[r.key] = r.value;

    return res.render('organizer/settings', { settings, selectedEvent, session: req.session });
  } catch (err) {
    console.error('[organizer:settings GET]', err.message);
    return res.status(500).render('error', { message: 'Failed to load settings', session: req.session });
  }
});

router.post('/settings', requireRole('organizer', 'admin'), (req, res) => {
  try {
    const db = getDb();
    const eid = req.body.event_id || req.session?.selectedEventId || ACTIVE_EVENT_ID;

    const upsert = db.prepare(`
      INSERT INTO platform_settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);

    for (const [k, v] of Object.entries(req.body)) {
      if (k !== 'event_id') {
        upsert.run(k, String(v));
      }
    }

    db.prepare('INSERT INTO audit_log (id, actor_id, action, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(`al_${Date.now()}`, req.session.userId, 'platform_settings_updated', eid, 'Saved global settings', new Date().toISOString());

    return res.redirect(`/organizer/settings?event_id=${eid}&saved=true`);
  } catch (err) {
    console.error('[organizer:settings POST]', err.message);
    return res.status(500).render('error', { message: 'Failed to save settings', session: req.session });
  }
});

module.exports = router;
