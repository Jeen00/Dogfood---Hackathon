# Architecture

## Overview

DOGFOOD 2026 is a monolithic Node.js web application using the following stack:

| Layer       | Technology           |
|-------------|----------------------|
| Runtime     | Node.js 18           |
| Web server  | Express 4            |
| Templating  | EJS (server-rendered)|
| Database    | SQLite via better-sqlite3 |
| Container   | Docker (single container) |
| Styles      | Plain CSS, no build tool |

---

## System Components

```
Client Browser
     |
     | HTTP
     v
Express App (port 8080)
     |
     +-- cookie-parser middleware  (parse Cookie header)
     +-- auth middleware           (session lookup in SQLite)
     |
     +-- routes/gallery.js         GET /projects -> res.render('gallery')
     +-- routes/auth.js            GET/POST /auth/login, /auth/logout
     +-- routes/judge.js           GET/POST /api/judge/scores, /api/judge/assignments
     +-- routes/submissions.js     POST /api/submissions, PATCH /api/submissions/:id
     +-- routes/organizer.js       GET /organizer/dashboard, /organizer/normalization
     +-- routes/export.js          GET /api/export.csv
     +-- routes/normalization.js   POST /api/normalization/run, GET /api/normalization/results
     +-- routes/teams.js           POST /api/teams, POST /api/teams/join/:code
     +-- routes/events.js          GET/POST /api/events
     |
     v
better-sqlite3 (synchronous)
     |
     v
data/hackathon.sqlite (SQLite WAL)
```

---

## Request Lifecycle

1. Browser sends HTTP request with optional `Cookie: session=<id>` header.
2. **cookie-parser** parses the cookie into `req.cookies`.
3. **auth middleware** (`src/middleware/auth.js`) looks up `req.cookies.session` in the `sessions` table. If found, sets `req.session = { sessionId, userId, role }`. Always calls `next()`.
4. Route handler runs. If the route is protected, it calls **requireRole** middleware first, which returns 401/403 if the session is missing or has the wrong role.
5. Route handler queries SQLite via `getDb()` (singleton connection), performs business logic, and calls `res.render()` (for HTML pages) or `res.json()` (for API routes).
6. EJS renders the template, including header/footer partials.
7. Response sent to client.

---

## Auth Mechanism

Authentication is cookie-based with server-side session storage.

- **No JWT.** No client-side tokens.
- Sessions are stored in the `sessions` table as `(id, user_id, role)`.
- The session cookie value is the session ID. It is HTTP-only and SameSite=lax.
- **Fixed sessions** are seeded at startup for the checker:
  - `org_7f2a` -> organizer
  - `jdg_a_91bc` -> jdg_01 (judge)
  - `jdg_b_44de` -> jdg_02 (judge)
  - `prt_2e88` -> participant

The `requireRole()` middleware factory checks `req.session.role` against allowed roles. API routes return JSON 401/403. Page routes redirect to `/login`.

---

## Role Model

| Role        | Can do |
|-------------|--------|
| organizer   | View all scores, export CSV, run normalization, manage events, assignments |
| judge       | View own assigned projects, submit scores, view own scores only |
| participant | Submit projects, join/create teams, view gallery |
| (none)      | View public gallery only |

**Cross-judge score isolation:** A judge hitting `GET /api/judge/scores?judge=<other-id>` receives HTTP 403. Only organizers can query another judge's scores.

---

## Why SQLite

- **Zero infrastructure:** No separate database process to manage.
- **WAL mode:** Write-ahead logging enables concurrent reads without blocking.
- **better-sqlite3:** Synchronous API matches Express's single-threaded model naturally. No async/await complexity for DB calls.
- **Sufficient throughput:** SQLite handles hundreds of concurrent reads and tens of writes per second — more than adequate for a hackathon platform with dozens to hundreds of users.

---

## Docker Setup

The platform runs as a single container. The SQLite database file is stored in `/app/data/hackathon.sqlite`, mounted as a named volume (`db_data`) so data persists across container restarts.

```
Dockerfile:
  FROM node:18-alpine
  RUN apk add python3 make g++   # for better-sqlite3 native compilation
  COPY . .
  EXPOSE 8080
  CMD ["node", "src/server.js"]
```

On startup, `src/server.js` calls `initDb()` (applies schema) then `seedDb()` (inserts fixture data), then starts listening. Both operations are idempotent.

---

## Startup Sequence

```js
// src/server.js
initDb();   // CREATE TABLE IF NOT EXISTS ...
seedDb();   // DELETE FROM + INSERT (clears and re-seeds every start)
app.listen(PORT);
```

The re-seed on every start ensures the fixed session cookies are always present, which is required for the checker.
