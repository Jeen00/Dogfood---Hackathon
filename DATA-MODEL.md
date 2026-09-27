# Data Model

## Schema Overview

The DOGFOOD 2026 platform uses a single SQLite database (`data/hackathon.sqlite`) with the following tables.

---

## Tables

### `sessions`
Stores server-side session tokens. Looked up on every request by `auth.js` middleware.

| Column   | Type | Description |
|----------|------|-------------|
| id       | TEXT PRIMARY KEY | Session token value (cookie value) |
| user_id  | TEXT | References `users.id` |
| role     | TEXT | Denormalized role for fast middleware access |

**Fixed seeded sessions:**
- `org_7f2a` -> `usr_organizer` (organizer)
- `jdg_a_91bc` -> `jdg_01` (judge)
- `jdg_b_44de` -> `jdg_02` (judge)
- `prt_2e88` -> `usr_prt_2e88` (participant)

---

### `users`
All platform users: organizers, judges, and participants.

| Column        | Type | Description |
|---------------|------|-------------|
| id            | TEXT PRIMARY KEY | e.g. `jdg_01`, `usr_organizer` |
| name          | TEXT | Display name |
| email         | TEXT UNIQUE | Used for login |
| role          | TEXT | `organizer`, `judge`, or `participant` |
| password_hash | TEXT | Nullable (demo: no real hashing) |

---

### `events`
Hackathon events. The seeded event is `evt_01` (Sample Hack 2026).

| Column            | Type | Description |
|-------------------|------|-------------|
| id                | TEXT PRIMARY KEY | e.g. `evt_01` |
| name              | TEXT | Event display name |
| submissions_open  | TEXT | ISO 8601 datetime |
| submissions_close | TEXT | ISO 8601 datetime (2026-03-01T18:00:00Z for evt_01) |
| voting_open       | TEXT | ISO 8601 datetime |
| voting_close      | TEXT | ISO 8601 datetime |
| created_by        | TEXT | References `users.id` |

---

### `tracks`
Competition tracks within an event.

| Column   | Type | Description |
|----------|------|-------------|
| id       | TEXT PRIMARY KEY | e.g. `trk_01` |
| event_id | TEXT | References `events.id` |
| name     | TEXT | Track name (e.g. "Developer tools") |

**8 tracks seeded:**
trk_01 Developer tools, trk_02 Data and analytics, trk_03 Accessibility, trk_04 Security, trk_05 Climate, trk_06 Health, trk_07 Education, trk_08 Open hardware.

---

### `prizes`
Awards associated with tracks.

| Column      | Type | Description |
|-------------|------|-------------|
| id          | TEXT PRIMARY KEY |  |
| event_id    | TEXT |  |
| track_id    | TEXT | Nullable (event-wide prize if null) |
| title       | TEXT |  |
| description | TEXT |  |

---

### `rubric_criteria`
Scoring criteria for an event's judging rubric.

| Column   | Type | Description |
|----------|------|-------------|
| id       | TEXT PRIMARY KEY | e.g. `crit_01` |
| event_id | TEXT |  |
| name     | TEXT | Criterion name (`functionality`, `quality`, `presentation`) |
| weight   | REAL | Weight as decimal (must sum to 1.0) |

**Seeded rubric for evt_01:**

| Criterion     | Weight |
|---------------|--------|
| functionality | 0.5    |
| quality       | 0.3    |
| presentation  | 0.2    |

---

### `teams`
Participant teams within an event.

| Column      | Type | Description |
|-------------|------|-------------|
| id          | TEXT PRIMARY KEY | e.g. `tm_01` |
| event_id    | TEXT |  |
| name        | TEXT | Team display name |
| invite_code | TEXT UNIQUE | Used for team join flow |

**40 teams seeded** (tm_01 through tm_40).

---

### `team_members`
Many-to-many: users to teams.

| Column  | Type | Description |
|---------|------|-------------|
| team_id | TEXT | References `teams.id` |
| user_id | TEXT | References `users.id` |
| PRIMARY KEY (team_id, user_id) | | Prevents duplicates |

---

### `projects`
Hackathon project submissions.

| Column      | Type | Description |
|-------------|------|-------------|
| id          | TEXT PRIMARY KEY | e.g. `prj_01` |
| event_id    | TEXT |  |
| team_id     | TEXT |  |
| track_id    | TEXT |  |
| title       | TEXT |  |
| summary     | TEXT |  |
| repo_url    | TEXT |  |
| status      | TEXT | `submitted` (default) |
| submitted_at | TEXT | ISO 8601 |
| created_at  | TEXT | ISO 8601 |

**40 projects seeded** (prj_01 through prj_40). prj_41 is a duplicate and skipped.

---

### `judge_assignments`
Which judge reviews which project.

| Column     | Type | Description |
|------------|------|-------------|
| id         | TEXT PRIMARY KEY |  |
| judge_id   | TEXT | References `users.id` |
| project_id | TEXT | References `projects.id` |
| UNIQUE (judge_id, project_id) | | One assignment per judge-project pair |

---

### `scores`
Judge scores for assigned projects.

| Column          | Type | Description |
|-----------------|------|-------------|
| id              | TEXT PRIMARY KEY |  |
| judge_id        | TEXT |  |
| project_id      | TEXT |  |
| criteria_scores | TEXT | JSON string: `{"functionality":4,"quality":3,"presentation":5}` |
| comment         | TEXT |  |
| submitted_at    | TEXT | ISO 8601 |
| UNIQUE (judge_id, project_id) | | One score per judge-project pair |

---

### `normalized_scores`
Z-score normalized scores computed by `POST /api/normalization/run`.

| Column             | Type | Description |
|--------------------|------|-------------|
| judge_id           | TEXT |  |
| project_id         | TEXT |  |
| raw_weighted_score | REAL | `sum(criterion * weight)` |
| normalized_score   | REAL | Z-score; 0 if judge stddev = 0 |
| method             | TEXT | Always `zscore` |
| computed_at        | TEXT | ISO 8601 |
| PRIMARY KEY (judge_id, project_id) |  |  |

---

### `audit_log`
Immutable action log for traceability.

| Column     | Type | Description |
|------------|------|-------------|
| id         | TEXT PRIMARY KEY |  |
| actor_id   | TEXT | User who performed the action |
| action     | TEXT | e.g. `score_submitted`, `project_submitted` |
| target_id  | TEXT | The affected resource ID |
| detail     | TEXT | JSON or string detail |
| created_at | TEXT | ISO 8601 |

---

## Data Flow

```
fixtures.json
     |
     v (seed.js reads and parses)
DELETE FROM + INSERT INTO all tables
     |
     v
data/hackathon.sqlite
     |
     +-- GET /projects     -> SELECT projects JOIN teams JOIN tracks
     +-- POST /api/judge/scores -> INSERT/UPDATE scores
     +-- POST /api/normalization/run -> SELECT scores -> INSERT normalized_scores
     |
     v
GET /api/export.csv -> SELECT scores JOIN projects JOIN teams JOIN tracks JOIN users
     |
     v
scores-export.csv (streamed to client)
```

---

## Duplicate Submission Edge Case

`prj_41` in `fixtures.json` is a duplicate submission: same team (`tm_07`) and same title (`Dry Harbour`) as `prj_07`. The seed script detects this before insertion:

```js
const key = `${p.team_id}::${p.title}`;
if (seenTeamTitle.has(key)) {
  console.warn(`[seed] Skipping duplicate project: ${p.id} ...`);
  continue;
}
```

Only `prj_07` is inserted. `prj_41` is skipped gracefully with a warning log. The de-duplication is team+title scoped (same team cannot submit the same title twice).
