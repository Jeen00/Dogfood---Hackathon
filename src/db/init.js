'use strict';
const path = require('path');
const fs   = require('fs');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR  = path.join(__dirname, '../../data');
const DB_PATH   = path.join(DATA_DIR, 'hackathon.sqlite');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

function initDb() {
  // Ensure data/ directory exists
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const db = new DatabaseSync(DB_PATH);

  // Enable WAL mode for better concurrency
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');

  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  db.exec(schema);

  // ─── Migrations ──────────────────────────────────────────────────────────
  // ALTER TABLE is idempotent via try/catch since SQLite has no IF NOT EXISTS for columns
  const migrations = [
    "ALTER TABLE teams ADD COLUMN leader_id TEXT",
    // ─── Gallery / project-detail columns ────────────────────────────────────
    "ALTER TABLE projects ADD COLUMN difficulty TEXT",
    "ALTER TABLE projects ADD COLUMN build_time TEXT",
    "ALTER TABLE projects ADD COLUMN open_source INTEGER DEFAULT 0",
    "ALTER TABLE projects ADD COLUMN license TEXT",
    "ALTER TABLE projects ADD COLUMN live_demo_url TEXT",
    "ALTER TABLE projects ADD COLUMN looking_for_contributors INTEGER DEFAULT 0",
    "ALTER TABLE projects ADD COLUMN problem_statement TEXT",
    "ALTER TABLE projects ADD COLUMN solution TEXT",
    "ALTER TABLE projects ADD COLUMN required_skills TEXT",
    "ALTER TABLE projects ADD COLUMN technologies TEXT",
    "ALTER TABLE projects ADD COLUMN tags TEXT",
    "ALTER TABLE projects ADD COLUMN thumbnail_url TEXT",
    "ALTER TABLE projects ADD COLUMN view_count INTEGER DEFAULT 0",
    "ALTER TABLE projects ADD COLUMN updated_at TEXT",
    // ─── Events enhancement columns ─────────────────────────────────────────
    "ALTER TABLE events ADD COLUMN description TEXT",
    "ALTER TABLE events ADD COLUMN status TEXT DEFAULT 'published'",
    "ALTER TABLE events ADD COLUMN is_published INTEGER DEFAULT 1",
    "ALTER TABLE events ADD COLUMN is_archived INTEGER DEFAULT 0",
    "ALTER TABLE events ADD COLUMN judging_open TEXT",
    "ALTER TABLE events ADD COLUMN judging_close TEXT",
    "ALTER TABLE events ADD COLUMN results_date TEXT",
    "ALTER TABLE events ADD COLUMN banner_url TEXT",
    "ALTER TABLE events ADD COLUMN about TEXT",
    "ALTER TABLE events ADD COLUMN problem_statement TEXT",
    "ALTER TABLE events ADD COLUMN rules TEXT",
    "ALTER TABLE events ADD COLUMN eligibility TEXT",
    "ALTER TABLE events ADD COLUMN prizes_summary TEXT",
    "ALTER TABLE events ADD COLUMN faqs TEXT",
    "ALTER TABLE events ADD COLUMN sponsors TEXT",
    "ALTER TABLE events ADD COLUMN partners TEXT",
    "ALTER TABLE events ADD COLUMN contact_email TEXT",
    "ALTER TABLE events ADD COLUMN website_url TEXT",
    // ─── User registration columns ──────────────────────────────────────────
    "ALTER TABLE users ADD COLUMN registration_status TEXT DEFAULT 'approved'",
    "ALTER TABLE users ADD COLUMN verification_status TEXT DEFAULT 'verified'",
    "ALTER TABLE users ADD COLUMN registered_at TEXT",
    "ALTER TABLE users ADD COLUMN registration_type TEXT DEFAULT 'individual'",
    "CREATE TABLE IF NOT EXISTS registration_settings (event_id TEXT PRIMARY KEY, form_fields TEXT, auto_approval TEXT, allowed_domains TEXT)",
  ];
  for (const m of migrations) {
    try { db.exec(m); } catch (_) { /* column already exists — skip */ }
  }

  db.close();
  console.log('[init] Schema applied to', DB_PATH);
}

module.exports = initDb;

// Allow direct execution: node src/db/init.js
if (require.main === module) {
  initDb();
}
