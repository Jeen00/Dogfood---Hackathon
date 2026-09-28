'use strict';
const path    = require('path');
const fs      = require('fs');
const { DatabaseSync } = require('node:sqlite');
const { v4: uuidv4 } = require('uuid');

const DATA_DIR    = path.join(__dirname, '../../data');
const DB_PATH     = path.join(DATA_DIR, 'hackathon.sqlite');
const FIXTURES    = path.join(__dirname, '../../fixtures.json');
const { ACTIVE_EVENT_ID } = require('../lib/config');

// Rubric criteria for active event
const RUBRIC_CRITERIA = [
  { id: 'crit_01', event_id: ACTIVE_EVENT_ID, name: 'functionality', weight: 0.5 },
  { id: 'crit_02', event_id: ACTIVE_EVENT_ID, name: 'quality',       weight: 0.3 },
  { id: 'crit_03', event_id: ACTIVE_EVENT_ID, name: 'presentation',  weight: 0.2 }
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
    DELETE FROM judge_tracks;
    DELETE FROM project_comments;
    DELETE FROM project_votes;
    DELETE FROM project_saves;
    DELETE FROM project_views;
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
  insertUser.run('usr_prt_b3f1', 'Demo Participant', 'demo2@example.org', 'participant', null);
  console.log('[seed] Special users created.');

  // ─── Fixed sessions ───────────────────────────────────────────────────────
  const insertSession = db.prepare(
    'INSERT INTO sessions (id, user_id, role) VALUES (?, ?, ?)'
  );
  insertSession.run('org_7f2a',    'usr_organizer', 'organizer');
  insertSession.run('jdg_a_91bc',  'jdg_01',        'judge');
  insertSession.run('jdg_b_44de',  'jdg_02',        'judge');
  insertSession.run('prt_2e88',    'usr_prt_2e88',  'participant');
  insertSession.run('prt_b3f1',    'usr_prt_b3f1',  'participant');
  console.log('[seed] Fixed sessions created.');

  // ─── Event ────────────────────────────────────────────────────────────────
  const evt = fixtures.event;
  const insertEvent = db.prepare(
    'INSERT INTO events (id, name, submissions_open, submissions_close, voting_open, voting_close, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  insertEvent.run(evt.id, evt.name, evt.submissions_open, evt.submissions_close, evt.voting_open, evt.voting_close, evt.created_by);
  
  // Running demonstration event (ends Sept 29, 2026)
  insertEvent.run(
    'evt_dogfood_2026',
    'DOGFOOD Hackathon 2026',
    '2026-09-26T18:00:00Z',
    '2026-09-29T18:00:00Z',
    '2026-09-29T18:00:00Z',
    '2026-09-30T18:00:00Z',
    'usr_organizer'
  );

  // Upcoming demonstration event (starts Nov 15, 2026)
  insertEvent.run(
    'evt_winter_2026',
    'Winter AI Sprint 2026',
    '2026-11-15T00:00:00Z',
    '2026-11-20T23:59:59Z',
    '2026-11-21T00:00:00Z',
    '2026-11-22T23:59:59Z',
    'usr_organizer'
  );
  console.log('[seed] Events seeded (Completed, Running, Upcoming).');

  // ─── Tracks ───────────────────────────────────────────────────────────────
  const insertTrack = db.prepare('INSERT INTO tracks (id, event_id, name) VALUES (?, ?, ?)');
  for (const t of fixtures.tracks) {
    insertTrack.run(t.id, t.event_id, t.name);
  }
  // Tracks for running event
  insertTrack.run('trk_df_01', 'evt_dogfood_2026', 'AI & Autonomous Agents');
  insertTrack.run('trk_df_02', 'evt_dogfood_2026', 'Developer Tools & Cloud');
  insertTrack.run('trk_df_03', 'evt_dogfood_2026', 'Open Hardware & IoT');

  // Tracks for upcoming event
  insertTrack.run('trk_w_01', 'evt_winter_2026', 'Foundational Models');
  insertTrack.run('trk_w_02', 'evt_winter_2026', 'Bio & Life Sciences');
  console.log('[seed] Tracks seeded across events.');

  // ─── Rubric criteria ──────────────────────────────────────────────────────
  const insertCrit = db.prepare('INSERT INTO rubric_criteria (id, event_id, name, weight) VALUES (?, ?, ?, ?)');
  for (const c of RUBRIC_CRITERIA) {
    insertCrit.run(c.id, c.event_id, c.name, c.weight);
  }
  insertCrit.run('crit_df_01', 'evt_dogfood_2026', 'functionality', 0.5);
  insertCrit.run('crit_df_02', 'evt_dogfood_2026', 'quality', 0.3);
  insertCrit.run('crit_df_03', 'evt_dogfood_2026', 'presentation', 0.2);
  insertCrit.run('crit_w_01', 'evt_winter_2026', 'functionality', 0.5);
  insertCrit.run('crit_w_02', 'evt_winter_2026', 'quality', 0.3);
  insertCrit.run('crit_w_03', 'evt_winter_2026', 'presentation', 0.2);
  console.log('[seed] Rubric criteria seeded across events.');


  // ─── Judges ───────────────────────────────────────────────────────────────
  // Build a map of judgeId -> track array for assignment later
  const judgeTrackMap = {}; // judgeId -> [trk_id, ...]
  const insertJudgeTrack = db.prepare(
    'INSERT OR IGNORE INTO judge_tracks (judge_id, track_id) VALUES (?, ?)'
  );

  for (const j of fixtures.judges) {
    insertUser.run(j.id, j.name, j.email, 'judge', null);
    judgeTrackMap[j.id] = j.tracks;
    // Persist track preferences so auto-assignment can use them without fixtures.json
    for (const trackId of j.tracks) {
      insertJudgeTrack.run(j.id, trackId);
    }
  }
  console.log('[seed] Judges seeded:', fixtures.judges.length);


  // ─── Teams & Members ─────────────────────────────────────────────────────
  const insertTeam   = db.prepare('INSERT INTO teams (id, event_id, name, invite_code, leader_id) VALUES (?, ?, ?, ?, ?)');
  const insertMember = db.prepare('INSERT INTO team_members (team_id, user_id) VALUES (?, ?)');

  for (const team of fixtures.teams) {
    // leader = first member's resolved user id (set after we process members)
    const firstMember = team.members[0];
    const existingFirst = db.prepare('SELECT id FROM users WHERE email = ?').get(firstMember.email);
    const leaderId = existingFirst ? existingFirst.id : firstMember.id;

    insertTeam.run(team.id, team.event_id, team.name, team.invite_code, leaderId);

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
  insertTeam.run('team_df_01', 'evt_dogfood_2026', 'CyberPioneers', 'code_df_1');
  insertTeam.run('team_df_02', 'evt_dogfood_2026', 'NeuralSync Labs', 'code_df_2');
  console.log('[seed] Teams seeded:', fixtures.teams.length + 2);

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
  insertProject.run(
    'proj_df_01', 'evt_dogfood_2026', 'team_df_01', 'trk_df_01',
    'Autonomous Multi-Agent Orchestrator', 'Next-gen agent workflows with local models',
    'https://github.com/cyberpioneers/agent-orch', 'submitted',
    '2026-09-27T10:00:00Z', '2026-09-27T10:00:00Z'
  );
  insertProject.run(
    'proj_df_02', 'evt_dogfood_2026', 'team_df_02', 'trk_df_02',
    'Edge Cloud Devbox', 'Zero-config local cloud developer platform',
    'https://github.com/neuralsync/edge-devbox', 'submitted',
    '2026-09-27T11:30:00Z', '2026-09-27T11:30:00Z'
  );
  console.log(`[seed] Projects seeded: ${projectsSeeded + 2}, skipped (duplicates): ${projectsSkipped}`);

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

  // ─── Gallery enrichment — add realistic metadata to each project ─────────
  const DIFFICULTIES  = ['beginner', 'intermediate', 'advanced'];
  const LICENSES      = ['MIT', 'Apache 2.0', 'GPL', 'BSD'];
  const BUILD_TIMES   = ['< 1 week', '1-4 weeks', '1-3 months', '3+ months'];
  const ALL_TECHS     = ['React','Node.js','Python','PostgreSQL','MongoDB','Docker','AWS','Flutter','Firebase','Vue.js','TypeScript'];
  const ALL_TAGS      = ['Education','Healthcare','FinTech','Productivity','Social','Environment','Entertainment','Security'];

  // Track-specific tag/tech mappings for realistic data
  const TRACK_TAG_MAP = {
    trk_01: ['Productivity', 'Security'],
    trk_02: ['Environment', 'FinTech'],
    trk_03: ['Social', 'Education'],
    trk_04: ['Security', 'FinTech'],
    trk_05: ['Environment', 'Healthcare'],
    trk_06: ['Healthcare', 'Social'],
    trk_07: ['Education', 'Social'],
    trk_08: ['Productivity', 'Entertainment'],
  };

  const PROBLEM_STATEMENTS = [
    'Developers waste hours debugging obscure configuration mismatches across environments.',
    'Researchers lack affordable real-time tools to monitor ecological change at scale.',
    'People with visual impairments encounter inaccessible web interfaces daily.',
    'Audit logs in microservice architectures are easy to tamper with and hard to query.',
    'Small businesses have no affordable way to measure and reduce their carbon footprint.',
    'Wearable health data is siloed and never synthesised into actionable wellness advice.',
    'Traditional classrooms struggle to adapt learning pace to each individual student.',
    'Hardware engineers spend days manually validating PCB specs against datasheets.',
  ];

  const SOLUTIONS = [
    'A unified dashboard that aggregates, visualises, and alerts on signals in real time.',
    'An automated ingestion and analytics platform that surfaces insights from sensor data.',
    'An AI-assisted audit tool that detects, explains, and scores accessibility issues.',
    'An append-only event store with cryptographic integrity proofs and a REST query API.',
    'An integration layer that pulls data from energy, logistics, and procurement sources.',
    'A correlation engine that blends wearable streams into personalised recommendations.',
    'An adaptive engine that continuously adjusts difficulty using spaced-repetition science.',
    'A toolkit that validates PCBs automatically and generates Bills of Materials instantly.',
  ];

  /**
   * Deterministically pick N items from an array given a seed index,
   * without importing crypto. Simple Fisher-Yates slice.
   */
  function pickN(arr, n, seed) {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = (seed * (i + 7) + 13) % (i + 1);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, n);
  }

  const updateProject = db.prepare(`
    UPDATE projects SET
      difficulty              = ?,
      build_time              = ?,
      open_source             = ?,
      license                 = ?,
      live_demo_url           = ?,
      looking_for_contributors= ?,
      problem_statement       = ?,
      solution                = ?,
      required_skills         = ?,
      technologies            = ?,
      tags                    = ?,
      view_count              = ?,
      updated_at              = ?
    WHERE id = ?
  `);

  const seededProjects = db.prepare('SELECT id, track_id, submitted_at FROM projects').all();
  let enriched = 0;

  seededProjects.forEach((proj, idx) => {
    const difficulty   = DIFFICULTIES[idx % 3];
    const buildTime    = BUILD_TIMES[idx % 4];
    const isOpenSource = (idx % 5 !== 0) ? 1 : 0;           // ~80% open source
    const license      = isOpenSource ? LICENSES[idx % 4] : null;
    const hasDemo      = (idx % 5 < 3);                      // ~60% have demo
    const liveDemoUrl  = hasDemo ? `https://demo.example.com/${proj.id}` : null;
    const wantsContrib = (idx % 10 < 3) ? 1 : 0;            // ~30% looking for contributors

    const problemIdx = idx % PROBLEM_STATEMENTS.length;
    const solutionIdx = idx % SOLUTIONS.length;

    // Pick 2-4 technologies deterministically
    const techCount    = 2 + (idx % 3);
    const technologies = pickN(ALL_TECHS, techCount, idx * 3 + 1);

    // Required skills roughly mirrors technologies
    const reqSkills    = pickN(ALL_TECHS, 2 + (idx % 2), idx * 7 + 2);

    // Pick 2-3 tags; bias toward the track's natural domain
    const trackTags    = TRACK_TAG_MAP[proj.track_id] || [];
    const extraTags    = ALL_TAGS.filter(t => !trackTags.includes(t));
    const tagCount     = 2 + (idx % 2);
    const tags         = [...new Set([...trackTags.slice(0, 1), ...pickN(extraTags, tagCount - 1, idx * 11)])];

    // updated_at is a few hours to days after submitted_at
    const submittedMs  = new Date(proj.submitted_at).getTime();
    const updatedAt    = new Date(submittedMs + (idx % 5 + 1) * 3_600_000 * 24).toISOString();

    // view_count between 10 and 500
    const viewCount    = 10 + ((idx * 73 + 37) % 491);

    updateProject.run(
      difficulty,
      buildTime,
      isOpenSource,
      license,
      liveDemoUrl,
      wantsContrib,
      PROBLEM_STATEMENTS[problemIdx],
      SOLUTIONS[solutionIdx],
      JSON.stringify(reqSkills),
      JSON.stringify(technologies),
      JSON.stringify(tags),
      viewCount,
      updatedAt,
      proj.id
    );
    enriched++;
  });
  console.log(`[seed] Projects enriched with gallery metadata: ${enriched}`);

  // ─── project_votes ────────────────────────────────────────────────────────
  // Use a mix of judge IDs and the known participant
  const VOTER_IDS = [
    'jdg_01','jdg_02','jdg_03','jdg_04','jdg_05',
    'jdg_06','jdg_07','jdg_08','jdg_09','jdg_10',
    'usr_prt_2e88',
  ];

  const insertVote = db.prepare(
    'INSERT OR IGNORE INTO project_votes (project_id, user_id, created_at) VALUES (?, ?, ?)'
  );

  // Give every 3rd project a cluster of votes
  seededProjects.forEach((proj, idx) => {
    const voterCount = 1 + (idx % 5);
    const voters = pickN(VOTER_IDS, Math.min(voterCount, VOTER_IDS.length), idx * 17);
    const baseDate = new Date(proj.submitted_at);
    voters.forEach((uid, vi) => {
      const voteDate = new Date(baseDate.getTime() + (vi + 1) * 86_400_000).toISOString();
      try { insertVote.run(proj.id, uid, voteDate); } catch (_) {}
    });
  });
  console.log('[seed] project_votes seeded.');

  // ─── project_saves ────────────────────────────────────────────────────────
  const SAVER_IDS = [
    'jdg_01','jdg_03','jdg_05','jdg_07','jdg_09',
    'usr_prt_2e88',
  ];

  const insertSave = db.prepare(
    'INSERT OR IGNORE INTO project_saves (project_id, user_id, created_at) VALUES (?, ?, ?)'
  );

  seededProjects.forEach((proj, idx) => {
    const saverCount = 1 + (idx % 3);
    const savers = pickN(SAVER_IDS, Math.min(saverCount, SAVER_IDS.length), idx * 31);
    const baseDate = new Date(proj.submitted_at);
    savers.forEach((uid, si) => {
      const saveDate = new Date(baseDate.getTime() + (si + 2) * 86_400_000).toISOString();
      try { insertSave.run(proj.id, uid, saveDate); } catch (_) {}
    });
  });
  console.log('[seed] project_saves seeded.');

  // ─── project_comments ────────────────────────────────────────────────────
  const SAMPLE_COMMENTS = [
    'Really impressive work — the real-time updates are buttery smooth!',
    'Love the clean UI. Did you consider adding dark mode?',
    'The performance benchmarks blew me away. Great engineering.',
    'This solves a real problem I face at work. Would love to contribute.',
    'Fantastic documentation. Makes it easy to get started quickly.',
    'The demo video is super clear. Nice presentation skills too.',
    'Have you thought about a mobile version of this?',
    'This is exactly what our team needs. Bookmarked!',
    'Great use of open data sources. The visualisations are top notch.',
    'The architecture diagram in the README is very helpful.',
  ];

  const COMMENTER_IDS = [
    'jdg_02','jdg_04','jdg_06','jdg_08','jdg_10',
    'usr_prt_2e88',
  ];

  const insertComment = db.prepare(
    'INSERT OR IGNORE INTO project_comments (id, project_id, user_id, content, created_at) VALUES (?, ?, ?, ?, ?)'
  );

  // Give every project 0-3 comments
  seededProjects.forEach((proj, idx) => {
    const commentCount = idx % 4;   // 0, 1, 2, or 3 comments
    const baseDate = new Date(proj.submitted_at);
    for (let ci = 0; ci < commentCount; ci++) {
      const commenterId = COMMENTER_IDS[(idx + ci) % COMMENTER_IDS.length];
      const content     = SAMPLE_COMMENTS[(idx * 3 + ci) % SAMPLE_COMMENTS.length];
      const commentDate = new Date(baseDate.getTime() + (ci + 3) * 86_400_000).toISOString();
      const cid         = `cmt_${proj.id}_${ci}`;
      try { insertComment.run(cid, proj.id, commenterId, content, commentDate); } catch (_) {}
    }
  });
  console.log('[seed] project_comments seeded.');

  db.exec('PRAGMA foreign_keys = ON');
  db.close();

  console.log('');
  console.log('Seed complete. Fixed session cookies:');
  console.log('  organizer     -> Cookie: session=org_7f2a');
  console.log('  judge_a       -> Cookie: session=jdg_a_91bc  (Tomas Varga / jdg_01)');
  console.log('  judge_b       -> Cookie: session=jdg_b_44de  (Wei Lindqvist / jdg_02)');
  console.log('  participant_a -> Cookie: session=prt_2e88    (Priya Sharma / usr_prt_2e88)');
  console.log('  participant_b -> Cookie: session=prt_b3f1    (Demo Participant / usr_prt_b3f1)');
}

module.exports = seedDb;

// Allow direct execution: node src/db/seed.js
if (require.main === module) {
  const initDb = require('./init');
  initDb();
  seedDb();
}
