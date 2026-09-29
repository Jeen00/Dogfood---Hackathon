'use strict';
const http = require('http');

let pass = 0, fail = 0;

function check(name, cond) {
  if (cond) { console.log(`  ✅ ${name}`); pass++; }
  else       { console.log(`  ❌ ${name}`); fail++; }
}

function req(method, path, cookie, body) {
  return new Promise((resolve) => {
    const postData = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'localhost',
      port: 8080,
      path: path,
      method: method,
      headers: {
        'Cookie': cookie || '',
        'Content-Type': 'application/json'
      }
    };
    if (postData) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }
    const r = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (_) {}
        resolve({ status: res.statusCode, headers: res.headers, body: data, json });
      });
    });
    r.on('error', (err) => {
      resolve({ status: 500, error: err.message, body: '' });
    });
    if (postData) r.write(postData);
    r.end();
  });
}

async function runJourneyTest() {
  console.log('\n=== Testing End-to-End PUBLIC USER Flow ===\n');

  // STEP 1: Landing Page -> 3 Portals (Gallery, Tracks, Results)
  console.log('--- Step 1: Landing Page & 3 Public Portals ---');
  const landing = await req('GET', '/');
  check('Landing Page returns 200', landing.status === 200);
  check('Portal 1: Project Gallery link present', landing.body.includes('href="/projects"') && landing.body.includes('Project Gallery'));
  check('Portal 2: Tracks section / links present', landing.body.includes('tracks-section') && landing.body.includes('Hackathon Tracks'));
  check('Portal 3: Results & Leaderboard link present', landing.body.includes('href="/results"') && (landing.body.includes('Results') || landing.body.includes('Leaderboard')));

  // STEP 2: Tracks -> Filter Gallery
  console.log('\n--- Step 2: Tracks -> Filtered Gallery ---');
  const trackMatch = landing.body.match(/href="\/projects\?track=([^"]+)"/);
  const trackId = trackMatch ? trackMatch[1] : 'trk_01';
  const filteredGallery = await req('GET', `/projects?track=${trackId}`);
  check('Clicking track opens filtered gallery = 200', filteredGallery.status === 200);

  // STEP 3: Gallery Search / Filter -> Project Card
  console.log('\n--- Step 3: Gallery Search / Filter -> Project Cards ---');
  const searchGallery = await req('GET', '/projects?q=a&sort=votes');
  check('Search & Sort in Gallery returns 200', searchGallery.status === 200);
  check('Project cards rendered in Gallery', searchGallery.body.includes('project-card') || searchGallery.body.includes('class="project-card"'));

  // STEP 4: Project Card -> PROJECT DETAILS
  console.log('\n--- Step 4: Project Card -> PROJECT DETAILS ---');
  const detail = await req('GET', '/projects/prj_01');
  check('Project Details returns 200', detail.status === 200);
  check('Section: Demo (Live Demo / Video)', detail.body.includes('Live Demo') || detail.body.includes('Demo Video'));
  check('Section: GitHub', detail.body.includes('GitHub'));
  check('Section: Team (Name, Members, Roles, Size)', detail.body.includes('Team') && detail.body.includes('Team Size') && detail.body.includes('Team Members'));

  // STEP 5: Community (Vote & Comments)
  console.log('\n--- Step 5: Community (Vote & Comments) ---');
  check('Community: Vote action present', detail.body.includes('detailVoteBtn') || detail.body.includes('Vote'));
  check('Community: Discussions & Comments form present', detail.body.includes('commentForm') && detail.body.includes('Discussions'));

  // STEP 6: Voting Closes -> Enforce closed deadline & Results published
  console.log('\n--- Step 6: Voting Closes -> Results Published -> Leaderboard / Awards ---');
  const { getDb } = require('../src/db/db');
  const db = getDb();

  // Ensure evt_01 has closed voting to test voting closed lifecycle
  db.prepare("UPDATE events SET voting_close = datetime('now', '-1 day') WHERE id = 'evt_01'").run();
  const closedPrj = db.prepare("SELECT p.id, p.event_id, e.voting_close FROM projects p JOIN events e ON e.id = p.event_id WHERE e.id = 'evt_01' LIMIT 1").get();
  
  if (closedPrj) {
    const closedDetail = await req('GET', `/projects/${closedPrj.id}`);
    check('Closed Event Project Detail renders 200', closedDetail.status === 200);
    check('Shows Voting Closed state on project detail', closedDetail.body.includes('Voting Closed') || closedDetail.body.includes('Voting has Concluded'));
    check('Links from closed project to Results/Leaderboard', closedDetail.body.includes('href="/results"'));

    // Attempt to vote on closed event project
    db.prepare('INSERT OR REPLACE INTO sessions (id, user_id, role) VALUES (?, ?, ?)').run('sess_voter_test_closed', 'usr_voter_closed', 'participant');
    const closedVoteRes = await req('POST', `/projects/${closedPrj.id}/vote`, 'session=sess_voter_test_closed');
    check('Voting after voting closes returns 403 Forbidden', closedVoteRes.status === 403);
    check('Voting error message points to Leaderboard/Results', closedVoteRes.json?.error && closedVoteRes.json.error.includes('closed'));
  } else {
    console.log('  ⚠️ No closed event found to test closed voting directly, setting up test event');
  }

  // STEP 7: Results published -> Leaderboard / Awards
  console.log('\n--- Step 7: Results published -> Leaderboard / Awards ---');
  const results = await req('GET', '/results');
  check('GET /results returns 200', results.status === 200);
  check('Displays Top Winners Podium', results.body.includes('Grand Champion') || results.body.includes('Winners'));
  check('Displays Special Awards', results.body.includes('Special Awards') || results.body.includes('Award'));
  check('Displays Leaderboard & Published Scores', results.body.includes('Leaderboard') && results.body.includes('Published Scores'));

  console.log(`\n=== Public User Journey Test Results: ${pass} passed, ${fail} failed ===\n`);
}

runJourneyTest().catch(console.error);
