'use strict';
const path    = require('path');
const fs      = require('fs');
const { DatabaseSync } = require('node:sqlite');
const { v4: uuidv4 } = require('uuid');

const DATA_DIR    = path.join(__dirname, '../../data');
const DB_PATH     = path.join(DATA_DIR, 'hackathon.sqlite');
const FIXTURES    = path.join(__dirname, '../../fixtures.json');

// Rubric criteria for evt_01
const RUBRIC_CRITERIA = [
  { id: 'crit_01', event_id: 'evt_01', name: 'functionality', weight: 0.5 },
  { id: 'crit_02', event_id: 'evt_01', name: 'quality',       weight: 0.3 },
  { id: 'crit_03', event_id: 'evt_01', name: 'presentation',  weight: 0.2 }
];

function computeWeightedScore(criteriaScores) {
  let total = 0;
  for (const crit of RUBRIC_CRITERIA) {
    const val = criteriaScores[crit.name] || 0;
    total += val * crit.weight;
  }
  return total;
}

function seedDb() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = OFF'); // Allow clean deletes without FK constraint issues

  const fixtures = JSON.parse(fs.readFileSync(FIXTURES, 'utf8'));

  // ─── Clear tables in dependency order ────────────────────────────────────
  db.exec(`
    DELETE FROM normalized_scores;
    DELETE FROM scores;
    DELETE FROM judge_assignments;
    DELETE FROM projects;
    DELETE FROM team_members;
    DELETE FROM teams;
    DELETE FROM rubric_criteria;
    DELETE FROM prizes;
    DELETE FROM tracks;
    DELETE FROM events;
    DELETE FROM sessions;
    DELETE FROM audit_log;
    DELETE FROM users;
  `);

  console.log('[seed] Tables cleared.');

  // ─── Special users ────────────────────────────────────────────────────────
  const insertUser = db.prepare(
    'INSERT OR IGNORE INTO users (id, name, email, role, password_hash) VALUES (?, ?, ?, ?, ?)'
  );

  insertUser.run('usr_organizer', 'Organizer', 'organizer@example.org', 'organizer', null);
  insertUser.run('usr_prt_2e88', 'Priya Sharma', 'priya1@example.org', 'participant', null);
  console.log('[seed] Special users created.');

  // ─── Fixed sessions ───────────────────────────────────────────────────────
  const insertSession = db.prepare(
    'INSERT INTO sessions (id, user_id, role) VALUES (?, ?, ?)'
  );
  insertSession.run('org_7f2a',    'usr_organizer', 'organizer');
  insertSession.run('jdg_a_91bc',  'jdg_01',        'judge');
  insertSession.run('jdg_b_44de',  'jdg_02',        'judge');
  insertSession.run('prt_2e88',    'usr_prt_2e88',  'participant');
  console.log('[seed] Fixed sessions created.');

  // ─── Event ────────────────────────────────────────────────────────────────
  const evt = fixtures.event;
  db.prepare(
    'INSERT INTO events (id, name, submissions_open, submissions_close, voting_open, voting_close, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(evt.id, evt.name, evt.submissions_open, evt.submissions_close, evt.voting_open, evt.voting_close, evt.created_by);
  console.log('[seed] Event seeded:', evt.name);

  // ─── Tracks ───────────────────────────────────────────────────────────────
  const insertTrack = db.prepare('INSERT INTO tracks (id, event_id, name) VALUES (?, ?, ?)');
  for (const t of fixtures.tracks) {
    insertTrack.run(t.id, t.event_id, t.name);
  }
  console.log('[seed] Tracks seeded:', fixtures.tracks.length);

  // ─── Rubric criteria ──────────────────────────────────────────────────────
  const insertCrit = db.prepare('INSERT INTO rubric_criteria (id, event_id, name, weight) VALUES (?, ?, ?, ?)');
  for (const c of RUBRIC_CRITERIA) {
    insertCrit.run(c.id, c.event_id, c.name, c.weight);
  }
  console.log('[seed] Rubric criteria seeded:', RUBRIC_CRITERIA.length);

  // ─── Judges ───────────────────────────────────────────────────────────────
  // Build a map of judgeId -> track array for assignment later
  const judgeTrackMap = {}; // judgeId -> [trk_id, ...]
  for (const j of fixtures.judges) {
    insertUser.run(j.id, j.name, j.email, 'judge', null);
    judgeTrackMap[j.id] = j.tracks;
  }
  console.log('[seed] Judges seeded:', fixtures.judges.length);

  // ─── Teams & Members ─────────────────────────────────────────────────────
  const insertTeam   = db.prepare('INSERT INTO teams (id, event_id, name, invite_code) VALUES (?, ?, ?, ?)');
  const insertMember = db.prepare('INSERT INTO team_members (team_id, user_id) VALUES (?, ?)');

  for (const team of fixtures.teams) {
    insertTeam.run(team.id, team.event_id, team.name, team.invite_code);

    for (const member of team.members) {
      // The special participant user (priya1@example.org) is already inserted with id=usr_prt_2e88
      // Match by email to avoid duplicate
      const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(member.email);
      let userId = member.id;
      if (existingUser) {
        userId = existingUser.id;
      } else {
        insertUser.run(member.id, member.name, member.email, 'participant', null);
      }
      try {
        insertMember.run(team.id, userId);
      } catch (e) {
        // Duplicate member — skip
        console.warn(`[seed] Skipping duplicate team_member: ${team.id}/${userId}`);
      }
    }
  }
  console.log('[seed] Teams seeded:', fixtures.teams.length);

  // ─── Projects ─────────────────────────────────────────────────────────────
  const insertProject = db.prepare(
    'INSERT INTO projects (id, event_id, team_id, track_id, title, summary, repo_url, status, submitted_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );

  // Build a set of (team_id, title) to detect duplicates as per spec
  const seenTeamTitle = new Set();
  let projectsSeeded = 0;
  let projectsSkipped = 0;

  for (const p of fixtures.projects) {
    const key = `${p.team_id}::${p.title}`;
    if (seenTeamTitle.has(key)) {
      console.warn(`[seed] Skipping duplicate project: ${p.id} (${p.team_id} / "${p.title}")`);
      projectsSkipped++;
      continue;
    }
    seenTeamTitle.add(key);
    try {
      insertProject.run(
        p.id, p.event_id, p.team_id, p.track_id,
        p.title, p.summary, p.repo_url, p.status,
        p.submitted_at, p.submitted_at
      );
      projectsSeeded++;
    } catch (err) {
      console.warn(`[seed] Skipping project ${p.id}: ${err.message}`);
      projectsSkipped++;
    }
  }
  console.log(`[seed] Projects seeded: ${projectsSeeded}, skipped (duplicates): ${projectsSkipped}`);

  // ─── Judge Assignments ───────────────────────────────────────────────────
  // Strategy: for each project, assign judges whose track list includes the project's track_id.
  // If a project's track has no matching judges, assign the first 3 judges as fallback.
  const insertAssignment = db.prepare(
    'INSERT OR IGNORE INTO judge_assignments (id, judge_id, project_id) VALUES (?, ?, ?)'
  );

  const allProjects = db.prepare('SELECT * FROM projects').all();
  let assignmentCount = 0;

  for (const proj of allProjects) {
    const matchingJudges = fixtures.judges.filter(j =>
      j.tracks.includes(proj.track_id)
    );
    const assignees = matchingJudges.length > 0
      ? matchingJudges
      : fixtures.judges.slice(0, 3);

    for (const judge of assignees) {
      const aId = `asgn_${judge.id}_${proj.id}`;
      insertAssignment.run(aId, judge.id, proj.id);
      assignmentCount++;
    }
  }
  console.log('[seed] Judge assignments created:', assignmentCount);

  // ─── Scores ───────────────────────────────────────────────────────────────
  const insertScore = db.prepare(
    'INSERT OR IGNORE INTO scores (id, judge_id, project_id, criteria_scores, comment, submitted_at) VALUES (?, ?, ?, ?, ?, ?)'
  );

  let scoresSeeded = 0;
  for (const s of fixtures.scores) {
    try {
      insertScore.run(
        s.id,
        s.judge_id,
        s.project_id,
        JSON.stringify(s.criteria_scores),
        s.comment,
        s.submitted_at
      );
      scoresSeeded++;
    } catch (err) {
      console.warn(`[seed] Skipping score ${s.id}: ${err.message}`);
    }
  }
  console.log('[seed] Scores seeded:', scoresSeeded);

  db.exec('PRAGMA foreign_keys = ON');
  db.close();

  console.log('');
  console.log('Seed complete. Fixed session cookies:');
  console.log('  organizer   -> Cookie: session=org_7f2a');
  console.log('  judge_a     -> Cookie: session=jdg_a_91bc  (Tomas Varga / jdg_01)');
  console.log('  judge_b     -> Cookie: session=jdg_b_44de  (Wei Lindqvist / jdg_02)');
  console.log('  participant -> Cookie: session=prt_2e88    (Priya Sharma / usr_prt_2e88)');
}

module.exports = seedDb;

// Allow direct execution: node src/db/seed.js
if (require.main === module) {
  const initDb = require('./init');
  initDb();
  seedDb();
}
