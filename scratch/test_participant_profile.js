// scratch/test_participant_profile.js
const http = require('http');
const assert = require('assert');

function request(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 8080,
      ...options
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runTests() {
  console.log('=== Testing Participant Profile & Authentication Guard ===\n');

  // Test 1: Unauthenticated HTML access to /participant/profile -> redirects to /login
  console.log('1. Testing unauthenticated HTML access to /participant/profile...');
  const resNoAuthHtml = await request({
    path: '/participant/profile',
    method: 'GET',
    headers: { 'Accept': 'text/html' }
  });
  assert.strictEqual(resNoAuthHtml.statusCode, 302, 'Should redirect unauthenticated HTML user with 302');
  assert(resNoAuthHtml.headers.location.includes('/login'), 'Redirect location should be /login');
  assert(resNoAuthHtml.headers.location.includes('error='), 'Redirect should include error message');
  console.log('  ✅ Unauthenticated HTML access redirects to /login with error query');

  // Test 2: Unauthenticated JSON access to /participant/profile -> returns 401
  console.log('2. Testing unauthenticated JSON access to /participant/profile...');
  const resNoAuthJson = await request({
    path: '/participant/profile',
    method: 'GET',
    headers: { 'Accept': 'application/json' }
  });
  assert.strictEqual(resNoAuthJson.statusCode, 401, 'Should return 401 for unauthenticated JSON request');
  const noAuthData = JSON.parse(resNoAuthJson.body);
  assert.strictEqual(noAuthData.error, 'Not authenticated');
  console.log('  ✅ Unauthenticated API access returns 401 Not authenticated');

  // Test 3: Unauthenticated access to shortcut /profile -> redirects to /login
  console.log('3. Testing unauthenticated access to shortcut /profile...');
  const resProfileNoAuth = await request({
    path: '/profile',
    method: 'GET',
    headers: { 'Accept': 'text/html' }
  });
  assert.strictEqual(resProfileNoAuth.statusCode, 302, 'Should redirect /profile with 302');
  assert(resProfileNoAuth.headers.location.includes('/login'), 'Location should point to /login');
  console.log('  ✅ Unauthenticated /profile redirects to /login');

  // Test 4: Authenticated participant access to /participant/profile
  console.log('4. Testing authenticated participant access to /participant/profile...');
  const resAuthHtml = await request({
    path: '/participant/profile',
    method: 'GET',
    headers: {
      'Cookie': 'session=prt_2e88',
      'Accept': 'text/html'
    }
  });
  assert.strictEqual(resAuthHtml.statusCode, 200, 'Authenticated participant should get 200 OK');
  assert(resAuthHtml.body.includes('Priya Sharma'), 'Should display participant name Priya Sharma');
  assert(resAuthHtml.body.includes('Participant'), 'Should display Participant role badge');
  assert(resAuthHtml.body.includes('My Teams & Projects'), 'Should display My Teams & Projects section');
  assert(resAuthHtml.body.includes('Edit Profile'), 'Should display Edit Profile form');
  assert(resAuthHtml.body.includes('/participant/profile'), 'Header should include Profile link');
  console.log('  ✅ Authenticated participant successfully sees full profile with teams, stats, and navbar Profile link');

  // Test 5: Authenticated participant access to /profile shortcut -> redirects to /participant/profile
  console.log('5. Testing authenticated participant access to shortcut /profile...');
  const resShortcutAuth = await request({
    path: '/profile',
    method: 'GET',
    headers: { 'Cookie': 'session=prt_2e88' }
  });
  assert.strictEqual(resShortcutAuth.statusCode, 302, 'Should redirect 302');
  assert.strictEqual(resShortcutAuth.headers.location, '/participant/profile', 'Should redirect to /participant/profile');
  console.log('  ✅ Authenticated /profile redirects participant to /participant/profile');

  // Test 6: Authenticated JSON API fetch
  console.log('6. Testing authenticated participant JSON API fetch...');
  const resAuthJson = await request({
    path: '/participant/profile',
    method: 'GET',
    headers: {
      'Cookie': 'session=prt_2e88',
      'Accept': 'application/json'
    }
  });
  assert.strictEqual(resAuthJson.statusCode, 200, 'Should return 200 for JSON API');
  const profileJson = JSON.parse(resAuthJson.body);
  assert.strictEqual(profileJson.user.email, 'priya1@example.org', 'Should return correct participant email');
  assert(profileJson.stats.total_hackathons !== undefined, 'Should include stats');
  assert(Array.isArray(profileJson.teams), 'Should include teams array');
  console.log(`  ✅ JSON API returns participant data with ${profileJson.teams.length} teams and stats`);

  // Test 7: Updating profile details via POST /participant/profile
  console.log('7. Testing updating profile details via POST /participant/profile...');
  const updatePayload = JSON.stringify({
    name: 'Priya Sharma Updated',
    bio: 'Passionate full-stack developer & open source enthusiast.',
    skills: 'React, Node.js, TypeScript, GraphQL, Python',
    github_username: 'priyasharma',
    linkedin_url: 'https://linkedin.com/in/priyasharma',
    website_url: 'https://priyasharma.tech'
  });
  const resUpdate = await request({
    path: '/participant/profile',
    method: 'POST',
    headers: {
      'Cookie': 'session=prt_2e88',
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  }, updatePayload);

  assert.strictEqual(resUpdate.statusCode, 200, 'Update should return 200');
  const updateResData = JSON.parse(resUpdate.body);
  assert.strictEqual(updateResData.success, true);
  assert.strictEqual(updateResData.user.name, 'Priya Sharma Updated');
  assert.strictEqual(updateResData.user.github_username, 'priyasharma');
  assert(updateResData.user.skills.includes('GraphQL'));
  console.log('  ✅ Profile successfully updated via POST /participant/profile');

  // Test 8: Re-verifying GET /participant/profile shows updated details
  console.log('8. Verifying updated details on GET /participant/profile...');
  const resReverify = await request({
    path: '/participant/profile',
    method: 'GET',
    headers: {
      'Cookie': 'session=prt_2e88',
      'Accept': 'text/html'
    }
  });
  assert(resReverify.body.includes('Priya Sharma Updated'), 'Should display updated name');
  assert(resReverify.body.includes('Passionate full-stack developer'), 'Should display updated bio');
  assert(resReverify.body.includes('GraphQL'), 'Should render updated skills pill');
  assert(resReverify.body.includes('priyasharma.tech'), 'Should render updated website link');
  console.log('  ✅ GET /participant/profile renders updated bio, skills, and portfolio links');

  // Test 9: Judge visiting /profile redirects to /judge/profile
  console.log('9. Verifying judge accessing /profile redirects to /judge/profile...');
  const resJudgeProfile = await request({
    path: '/profile',
    method: 'GET',
    headers: { 'Cookie': 'session=jdg_a_91bc' }
  });
  assert.strictEqual(resJudgeProfile.statusCode, 302);
  assert.strictEqual(resJudgeProfile.headers.location, '/judge/profile');
  console.log('  ✅ Judge accessing /profile correctly routes to /judge/profile');

  console.log('\n=== All Participant Profile Tests Passed! (9/9) 🚀 ===\n');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
