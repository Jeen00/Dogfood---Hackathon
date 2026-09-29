// scratch/test_hackathon_results.js
const http = require('http');
const assert = require('assert');

function get(path, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 8080,
      path,
      method: 'GET',
      headers
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
    req.end();
  });
}

async function runTests() {
  console.log('--- Testing Hackathon-wise Results & Leaderboard ---');

  // 1. Default GET /results
  const resDefault = await get('/results');
  assert.strictEqual(resDefault.statusCode, 200, 'GET /results should return 200');
  assert(resDefault.body.includes('Hackathon Results & Leaderboard'), 'Should include results title');
  assert(resDefault.body.includes('Select Hackathon'), 'Should include hackathon selector');
  assert(resDefault.body.includes('Sample Hack 2026'), 'Should list Sample Hack 2026 in selector');
  assert(resDefault.body.includes('DOGFOOD Hackathon 2026'), 'Should list DOGFOOD Hackathon in selector');
  console.log('✓ 1. Default GET /results renders successfully with selector');

  // 2. GET /results?event_id=evt_01 (completed with scores)
  const resEvt01 = await get('/results?event_id=evt_01');
  assert.strictEqual(resEvt01.statusCode, 200, 'GET /results?event_id=evt_01 should return 200');
  assert(resEvt01.body.includes('Sample Hack 2026'), 'Should show Sample Hack 2026 banner');
  assert(resEvt01.body.includes('Top Winners'), 'Should show Top Winners podium');
  assert(resEvt01.body.includes('1st Place — Grand Champion'), 'Should show 1st place champion');
  assert(resEvt01.body.includes('Full Leaderboard & Published Scores'), 'Should show full leaderboard');
  assert(resEvt01.body.includes('Reviews'), 'Should show review counts');
  console.log('✓ 2. GET /results?event_id=evt_01 renders champion, podium, and full leaderboard');

  // 3. GET /results?event_id=evt_dogfood_2026 (in-progress judging)
  const resDogfood = await get('/results?event_id=evt_dogfood_2026');
  assert.strictEqual(resDogfood.statusCode, 200, 'GET /results?event_id=evt_dogfood_2026 should return 200');
  assert(resDogfood.body.includes('DOGFOOD Hackathon 2026'), 'Should show DOGFOOD Hackathon 2026');
  assert(resDogfood.body.includes('Results Not Yet Published'), 'Should show results not yet published message');
  assert(resDogfood.body.includes('View Completed Results for Sample Hack 2026'), 'Should offer quick link to completed hackathons');
  console.log('✓ 3. GET /results?event_id=evt_dogfood_2026 cleanly displays judging in progress state and link to completed hackathon');

  // 4. GET /results?event_id=evt_winter_2026 (upcoming)
  const resWinter = await get('/results?event_id=evt_winter_2026');
  assert.strictEqual(resWinter.statusCode, 200, 'GET /results?event_id=evt_winter_2026 should return 200');
  assert(resWinter.body.includes('Winter AI Sprint 2026'), 'Should show Winter AI Sprint 2026');
  assert(resWinter.body.includes('Results Not Yet Published'), 'Should show empty results state');
  console.log('✓ 4. GET /results?event_id=evt_winter_2026 renders upcoming hackathon state');

  // 5. JSON API support with ?event_id=evt_01
  const resJson = await get('/results?event_id=evt_01', { Accept: 'application/json' });
  assert.strictEqual(resJson.statusCode, 200, 'JSON request should return 200');
  const data = JSON.parse(resJson.body);
  assert(Array.isArray(data.leaderboard), 'data.leaderboard should be array');
  assert(data.leaderboard.length > 0, 'leaderboard should not be empty');
  assert(Array.isArray(data.allEvents), 'data.allEvents should be array');
  assert.strictEqual(data.event.id, 'evt_01', 'Selected event should be evt_01');
  assert(data.leaderboard[0].rank === 1, 'First item should have rank 1');
  assert(data.leaderboard[0].final_normalized_score !== undefined, 'Should have normalized score');
  console.log(`✓ 5. JSON API returns ${data.leaderboard.length} ranked entries and ${data.allEvents.length} hackathons`);

  // 6. JSON API for in-progress hackathon
  const resDogfoodJson = await get('/results?event_id=evt_dogfood_2026', { Accept: 'application/json' });
  const dataDogfood = JSON.parse(resDogfoodJson.body);
  assert.strictEqual(dataDogfood.event.id, 'evt_dogfood_2026');
  assert.strictEqual(dataDogfood.leaderboard.length, 0, 'Leaderboard should be empty for unjudged event');
  console.log('✓ 6. JSON API returns empty leaderboard for event without published scores');

  console.log('\nAll Hackathon Results tests passed successfully! 🚀');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
