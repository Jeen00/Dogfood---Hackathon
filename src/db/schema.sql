-- DOGFOOD 2026 Hackathon Platform Schema
-- All tables use IF NOT EXISTS for idempotency

CREATE TABLE IF NOT EXISTS sessions (
  id      TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  role    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  role          TEXT NOT NULL,
  password_hash TEXT
);

CREATE TABLE IF NOT EXISTS events (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  submissions_open  TEXT,
  submissions_close TEXT,
  voting_open       TEXT,
  voting_close      TEXT,
  created_by        TEXT
);

CREATE TABLE IF NOT EXISTS tracks (
  id       TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  name     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS prizes (
  id          TEXT PRIMARY KEY,
  event_id    TEXT NOT NULL,
  track_id    TEXT,
  title       TEXT NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS rubric_criteria (
  id       TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  name     TEXT NOT NULL,
  weight   REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS teams (
  id          TEXT PRIMARY KEY,
  event_id    TEXT NOT NULL,
  name        TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS team_members (
  team_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  PRIMARY KEY (team_id, user_id)
);

CREATE TABLE IF NOT EXISTS projects (
  id           TEXT PRIMARY KEY,
  event_id     TEXT NOT NULL,
  team_id      TEXT NOT NULL,
  track_id     TEXT,
  title        TEXT NOT NULL,
  summary      TEXT,
  repo_url     TEXT,
  status       TEXT NOT NULL DEFAULT 'submitted',
  submitted_at TEXT,
  created_at   TEXT
);

CREATE TABLE IF NOT EXISTS judge_assignments (
  id         TEXT PRIMARY KEY,
  judge_id   TEXT NOT NULL,
  project_id TEXT NOT NULL,
  UNIQUE (judge_id, project_id)
);

-- Stores which tracks each judge is responsible for (seeded from fixtures)
CREATE TABLE IF NOT EXISTS judge_tracks (
  judge_id TEXT NOT NULL,
  track_id TEXT NOT NULL,
  PRIMARY KEY (judge_id, track_id)
);


CREATE TABLE IF NOT EXISTS scores (
  id              TEXT PRIMARY KEY,
  judge_id        TEXT NOT NULL,
  project_id      TEXT NOT NULL,
  criteria_scores TEXT NOT NULL,
  comment         TEXT,
  submitted_at    TEXT NOT NULL,
  UNIQUE (judge_id, project_id)
);

CREATE TABLE IF NOT EXISTS normalized_scores (
  judge_id           TEXT NOT NULL,
  project_id         TEXT NOT NULL,
  raw_weighted_score REAL,
  normalized_score   REAL,
  method             TEXT NOT NULL DEFAULT 'zscore',
  computed_at        TEXT,
  PRIMARY KEY (judge_id, project_id)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id         TEXT PRIMARY KEY,
  actor_id   TEXT,
  action     TEXT NOT NULL,
  target_id  TEXT,
  detail     TEXT,
  created_at TEXT NOT NULL
);
