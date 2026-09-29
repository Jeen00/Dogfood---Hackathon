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

async function runTests() {
  console.log('\n=== Testing PROJECT DETAILS, TEAM, COMMUNITY, SAFETY, RESULTS & SHARING ===\n');

  // 1. PROJECT DETAILS & TEAM & SHARING
  console.log('--- 1. Project Details, Team, Media & Sharing ---');
  const prjRes = await req('GET', '/projects/prj_01');
  check('GET /projects/prj_01 returns 200', prjRes.status === 200);
  check('Renders Description & Problem', prjRes.body.includes('Description') && prjRes.body.includes('Problem'));
  check('Renders Solution & Tech Stack', prjRes.body.includes('Solution') && prjRes.body.includes('Technologies'));
  check('Renders Screenshots section', prjRes.body.includes('Screenshots') || prjRes.body.includes('screenshot-card'));
  check('Renders Demo Video', prjRes.body.includes('Demo Video'));
  check('Renders GitHub and Live Demo', prjRes.body.includes('GitHub') && prjRes.body.includes('Live Demo'));
  check('Renders Team Name & Team Size', prjRes.body.includes('Team Size') && prjRes.body.includes('Team:'));
  check('Renders Member Roles', prjRes.body.includes('Team Leader') || prjRes.body.includes('Member'));
  check('Renders Sharing (Copy Link, QR, Social Share)', 
    prjRes.body.includes('Copy Link') && 
    prjRes.body.includes('QR Code') && 
    prjRes.body.includes('Share on X') && 
    prjRes.body.includes('LinkedIn') &&
    prjRes.body.includes('WhatsApp') &&
    prjRes.body.includes('Facebook'));

  // 2. COMMUNITY: Voting & Self-Vote / Duplicate Vote Protection
  console.log('\n--- 2. Community: Voting & Safety Protections ---');
  
  // Find which team owns prj_01 and who the member is
  const { getDb } = require('../src/db/db');
  const db = getDb();
  
  // Ensure voting is currently open for the test project's event
  db.prepare("UPDATE events SET voting_open = datetime('now', '-1 day'), voting_close = datetime('now', '+2 days') WHERE id = (SELECT event_id FROM projects WHERE id = 'prj_01')").run();

  const prj = db.prepare("SELECT p.id, p.team_id, tm.user_id FROM projects p JOIN team_members tm ON tm.team_id = p.team_id WHERE p.id = 'prj_01'").get();

  // Create or set a session for this owner to test self-vote protection
  const ownerUserId = prj.user_id;
  db.prepare('INSERT OR REPLACE INTO sessions (id, user_id, role) VALUES (?, ?, ?)').run('test_owner_sess', ownerUserId, 'participant');

  const selfVoteRes = await req('POST', '/projects/prj_01/vote', 'session=test_owner_sess');
  check('Self-Vote Protection returns 403 Forbidden', selfVoteRes.status === 403);
  check('Self-Vote Protection error message returned', selfVoteRes.json && selfVoteRes.json.error && selfVoteRes.json.error.includes('Protection'));

  // Test successful vote by an independent user
  db.prepare('INSERT OR REPLACE INTO sessions (id, user_id, role) VALUES (?, ?, ?)').run('test_voter_sess', 'usr_indep_voter', 'participant');
  db.prepare('INSERT OR IGNORE INTO users (id, name, email, role) VALUES (?, ?, ?, ?)').run('usr_indep_voter', 'Voter User', 'voter@example.com', 'participant');

  const voteRes = await req('POST', '/projects/prj_01/vote', 'session=test_voter_sess');
  check('Independent Vote returns 200', voteRes.status === 200);
  check('Vote response returns voted boolean and count', typeof voteRes.json?.voted === 'boolean' && typeof voteRes.json?.count === 'number');

  // 3. COMMUNITY: Comments & Threaded Replies
  console.log('\n--- 3. Community: Comments & Threaded Replies ---');
  const commentText = 'Fabulous project and execution! ' + Date.now();
  const commentRes = await req('POST', '/projects/prj_01/comment', 'session=test_voter_sess', { content: commentText });
  check('POST top-level comment returns 201', commentRes.status === 201);
  check('Comment created with author and ID', commentRes.json && commentRes.json.id && commentRes.json.author);

  const parentCommentId = commentRes.json?.id;
  const replyText = 'Thanks for the feedback! ' + Date.now();
  const replyRes = await req('POST', '/projects/prj_01/comment', 'session=test_owner_sess', {
    content: replyText,
    parent_id: parentCommentId
  });
  check('POST comment reply returns 201', replyRes.status === 201);
  check('Reply records parent_id correctly', replyRes.json && replyRes.json.parent_id === parentCommentId);

  // 4. SAFETY: Spam Protection & Rate Limiting
  console.log('\n--- 4. Safety: Spam Protection, Rate Limiting & Suspicious Activity ---');
  
  // Test repetitive spam
  const spamRes = await req('POST', '/projects/prj_01/comment', 'session=test_voter_sess', { content: 'aaaaaaaaaaaaaaaaaaaaaaaa' });
  check('Repetitive spam blocked with 400', spamRes.status === 400);
  check('Spam error specifies reason', spamRes.json && spamRes.json.error && spamRes.json.error.includes('repetitive'));

  // Test duplicate comment spam
  const dupSpamRes = await req('POST', '/projects/prj_01/comment', 'session=test_voter_sess', { content: commentText });
  check('Duplicate comment blocked with 400', dupSpamRes.status === 400);

  // Test Community Report
  const reportRes = await req('POST', '/projects/prj_01/report', 'session=test_voter_sess', {
    reason: 'Inappropriate Content',
    details: 'Testing safety report system'
  });
  check('POST report returns 201', reportRes.status === 201);
  check('Report recorded in database', db.prepare("SELECT COUNT(*) AS c FROM project_reports WHERE project_id = 'prj_01'").get().c > 0);

  // Test Rate Limiting
  db.prepare('INSERT OR REPLACE INTO sessions (id, user_id, role) VALUES (?, ?, ?)').run('test_spammer_sess', 'usr_spammer_test', 'participant');
  let rateLimited = false;
  for (let i = 0; i < 15; i++) {
    const r = await req('POST', '/projects/prj_01/vote', 'session=test_spammer_sess');
    if (r.status === 429) {
      rateLimited = true;
      break;
    }
  }
  check('Excessive rapid voting triggers 429 Rate Limit', rateLimited);

  // Verify suspicious activity table logged entries
  const suspCount = db.prepare('SELECT COUNT(*) AS c FROM suspicious_activity').get().c;
  check('Suspicious activity logged in database table', suspCount > 0);

  // 5. RESULTS & LEADERBOARD
  console.log('\n--- 5. Results: Leaderboard, Winners, Awards & Published Scores ---');
  const resultsRes = await req('GET', '/results');
  check('GET /results returns 200', resultsRes.status === 200);
  check('Renders Leaderboard Table', resultsRes.body.includes('Full Leaderboard') || resultsRes.body.includes('leaderboard-table'));
  check('Renders Winners section', resultsRes.body.includes('Winners') || resultsRes.body.includes('Grand Champion'));
  check('Renders Special Awards (Community Choice / Track Winners)', resultsRes.body.includes('Special Awards') || resultsRes.body.includes('Award'));
  check('Renders Published Scores', resultsRes.body.includes('Published Scores') || resultsRes.body.includes('Normalized Score'));

  const ldbRes = await req('GET', '/leaderboard');
  check('GET /leaderboard alias returns 200', ldbRes.status === 200);

  console.log(`\n=== Final Test Results: ${pass} passed, ${fail} failed ===\n`);
}

runTests().catch(console.error);
