'use strict';
const { getDb } = require('./db');

const db = getDb();

const migrations = [
  { sql: "ALTER TABLE judge_assignments ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'", label: 'status' },
  { sql: "ALTER TABLE judge_assignments ADD COLUMN started_at TEXT", label: 'started_at' },
  { sql: "ALTER TABLE judge_assignments ADD COLUMN flagged_at TEXT", label: 'flagged_at' }
];

for (const m of migrations) {
  try {
    db.exec(m.sql);
    console.log(`[migrate] Added column: ${m.label}`);
  } catch (e) {
    console.log(`[migrate] Column '${m.label}' already exists (skipped): ${e.message}`);
  }
}

// Sync status for assignments that already have scores
const synced = db.prepare(`
  UPDATE judge_assignments
  SET status = 'completed'
  WHERE (judge_id, project_id) IN (
    SELECT judge_id, project_id FROM scores
  ) AND status = 'pending'
`).run();
console.log(`[migrate] Synced ${synced.changes} existing scored assignments to 'completed'.`);

console.log('[migrate] Done.');
