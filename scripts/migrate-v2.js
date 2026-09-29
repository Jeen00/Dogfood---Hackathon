'use strict';
const { getDb } = require('../src/db/db');
const db = getDb();

function addCol(table, col, def) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
  if (!cols.includes(col)) {
    console.log(`Adding ${col} to ${table}`);
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`).run();
  } else {
    console.log(`${col} already exists on ${table}`);
  }
}

addCol('projects', 'screenshots', "TEXT DEFAULT '[]'");
addCol('projects', 'demo_video_url', 'TEXT');
addCol('team_members', 'role', "TEXT DEFAULT 'Member'");
addCol('project_comments', 'parent_id', 'TEXT');

db.exec(`
CREATE TABLE IF NOT EXISTS project_reports (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  comment_id TEXT,
  user_id TEXT,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS suspicious_activity (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  ip TEXT,
  type TEXT NOT NULL,
  details TEXT,
  created_at TEXT NOT NULL
);
`);

// Populate team leader roles and member roles if needed
const teams = db.prepare('SELECT id, leader_id FROM teams').all();
for (const t of teams) {
  if (t.leader_id) {
    db.prepare('UPDATE team_members SET role = ? WHERE team_id = ? AND user_id = ?')
      .run('Team Leader', t.id, t.leader_id);
  }
}

// Ensure seeded projects have some sample screenshots or demo video if empty
const projects = db.prepare('SELECT id, title, screenshots, demo_video_url FROM projects').all();
for (const p of projects) {
  let updated = false;
  let screenshots = p.screenshots;
  let demoVideo = p.demo_video_url;

  if (!screenshots || screenshots === '[]') {
    screenshots = JSON.stringify([
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80'
    ]);
    updated = true;
  }
  if (!demoVideo) {
    demoVideo = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    updated = true;
  }
  if (updated) {
    db.prepare('UPDATE projects SET screenshots = ?, demo_video_url = ? WHERE id = ?')
      .run(screenshots, demoVideo, p.id);
  }
}

console.log('Migrations and seed updates applied successfully!');
