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

  db.close();
  console.log('[init] Schema applied to', DB_PATH);
}

module.exports = initDb;

// Allow direct execution: node src/db/init.js
if (require.main === module) {
  initDb();
}
