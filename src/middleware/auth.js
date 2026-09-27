'use strict';
const { getDb } = require('../db/db');

/**
 * Auth middleware.
 * Reads the `session` cookie, looks it up in the sessions table,
 * and attaches req.session = { sessionId, userId, role } or null.
 * Always calls next() — use requireRole for route protection.
 */
function authMiddleware(req, res, next) {
  const sessionId = req.cookies && req.cookies.session;

  if (!sessionId) {
    req.session = null;
    return next();
  }

  try {
    const db  = getDb();
    const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);

    if (row) {
      req.session = {
        sessionId: row.id,
        userId:    row.user_id,
        role:      row.role
      };
    } else {
      req.session = null;
    }
  } catch (err) {
    console.error('[auth] Session lookup error:', err.message);
    req.session = null;
  }

  return next();
}

module.exports = authMiddleware;
