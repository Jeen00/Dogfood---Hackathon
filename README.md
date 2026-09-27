# DOGFOOD 2026 Hackathon Platform

A self-hosted hackathon submission and judging platform with:
- Weighted rubric scoring
- Backend-enforced role isolation (organizer / judge / participant)
- Z-score cross-judge normalization
- Server-rendered EJS pages (no client-side framework)
- SQLite persistence via better-sqlite3
- Single Docker container deployment

---

## Quick Start

```bash
git clone https://github.com/your-org/dogfood-2026.git
cd dogfood-2026
docker compose up --build
```

Visit: [http://localhost:8080](http://localhost:8080)

The database is seeded automatically on first start. The seed script runs every time the server starts and is idempotent (safe to re-run).

---

## Running Without Docker

```bash
npm install
npm start
```

Requires Node.js 18 or higher.

---

## How the Checker Works

The `.dogfood.toml` file configures the external checker that validates this platform. The checker hits real HTTP endpoints using the fixed session cookies listed below.

### Fixed Session Credentials

| Role        | Cookie Header                        | User           |
|-------------|--------------------------------------|----------------|
| Organizer   | `Cookie: session=org_7f2a`           | organizer@example.org |
| Judge A     | `Cookie: session=jdg_a_91bc`         | Tomas Varga (jdg_01) |
| Judge B     | `Cookie: session=jdg_b_44de`         | Wei Lindqvist (jdg_02) |
| Participant | `Cookie: session=prt_2e88`           | priya1@example.org |

These session IDs are hard-coded into the seed script and will always be present after startup.

### Key Checker Routes

| Check | Route |
|-------|-------|
| Gallery (public, HTML) | `GET /projects` |
| Create submission | `POST /api/submissions` |
| Submit score (judge) | `POST /api/judge/scores` |
| View own scores (judge) | `GET /api/judge/scores` |
| View peer scores (403) | `GET /api/judge/scores?judge=jdg_01` |
| Export CSV (organizer) | `GET /api/export.csv` |

---

## Submission Deadline Behavior

The fixture event (`evt_01`) has `submissions_close = 2026-03-01T18:00:00Z`, which is in the past. Any `POST /api/submissions` will return:

```json
{ "error": "Submissions closed" }
```

with HTTP 400. This is by design and expected by the checker.

---

## Honest Limitations

- **No real authentication:** Passwords are not hashed. The platform uses fixed session cookies for the checker. In production, replace with bcrypt + proper session management.
- **No rate limiting:** API endpoints have no rate limiting or brute-force protection.
- **Single event:** The platform is pre-configured for one event (`evt_01`). Multi-event support requires UI additions.
- **No file uploads:** Project submissions accept URLs only, not binary files.
- **SQLite concurrency:** SQLite with WAL mode handles moderate concurrency. Not suitable for high-traffic production use without migration to PostgreSQL.

---

## Demo Video

[Placeholder: insert a screen recording link here]

---

## Project Structure

```
src/
  server.js           Express entry point
  db/
    schema.sql        SQLite schema
    init.js           Schema runner
    seed.js           Fixture seeder
    db.js             Singleton DB connection
  middleware/
    auth.js           Cookie session lookup
    requireRole.js    Role guard factory
  routes/
    gallery.js        GET /projects (server-rendered)
    auth.js           Login / logout
    events.js         Event CRUD
    teams.js          Team creation / join
    submissions.js    Project submission
    judge.js          Scoring API
    organizer.js      Dashboard + admin
    export.js         CSV export
    normalization.js  Z-score normalization
  views/              EJS templates
  public/css/         main.css
fixtures.json         Seed data
.dogfood.toml         Checker config
```
