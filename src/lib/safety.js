'use strict';
const { v4: uuidv4 } = require('uuid');

// In-memory buckets for rate limiting
const rateLimits = new Map();

/**
 * Clean up old buckets periodically (every 5 minutes)
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimits.entries()) {
    if (now - record.startTime > 300000) {
      rateLimits.delete(key);
    }
  }
}, 300000);

/**
 * Check rate limit for an action
 * @param {string} key - unique identifier (e.g. `vote:${userId}` or `ip:${ip}`)
 * @param {number} maxRequests - maximum allowed requests within window
 * @param {number} windowMs - time window in milliseconds
 * @returns {{ allowed: boolean, remaining: number, retryAfterSec: number }}
 */
function checkRateLimit(key, maxRequests = 10, windowMs = 30000) {
  const now = Date.now();
  let record = rateLimits.get(key);

  if (!record || (now - record.startTime > windowMs)) {
    record = { count: 1, startTime: now };
    rateLimits.set(key, record);
    return { allowed: true, remaining: maxRequests - 1, retryAfterSec: 0 };
  }

  if (record.count >= maxRequests) {
    const retryAfterSec = Math.ceil((record.startTime + windowMs - now) / 1000);
    return { allowed: false, remaining: 0, retryAfterSec };
  }

  record.count += 1;
  return { allowed: true, remaining: maxRequests - record.count, retryAfterSec: 0 };
}

/**
 * Log suspicious activity to both `suspicious_activity` table and `audit_log`
 */
function logSuspiciousActivity(db, userId, ip, type, details) {
  try {
    const id = `susp_${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO suspicious_activity (id, user_id, ip, type, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, userId || null, ip || '127.0.0.1', type, details, now);

    db.prepare(`
      INSERT INTO audit_log (id, actor_id, action, target_id, detail, created_at)
      VALUES (?, ?, 'suspicious_activity', ?, ?, ?)
    `).run(`al_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, userId || 'anonymous', type, details, now);
  } catch (err) {
    console.error('[safety:logSuspiciousActivity] Error:', err.message);
  }
}

/**
 * Spam check for comments and messages
 * @param {string} content
 * @param {string} userId
 * @param {Object} db
 * @returns {{ isSpam: boolean, reason?: string }}
 */
function checkSpam(content, userId, db) {
  if (!content || typeof content !== 'string') {
    return { isSpam: true, reason: 'Empty content.' };
  }

  const trimmed = content.trim();
  if (trimmed.length < 2) {
    return { isSpam: true, reason: 'Content is too short (min 2 characters).' };
  }

  if (trimmed.length > 2000) {
    return { isSpam: true, reason: 'Content exceeds maximum allowed length (2000 characters).' };
  }

  // Detect repeated identical characters spam (e.g. "aaaaaaa", "!!!!!!!")
  if (/(.)\1{12,}/i.test(trimmed)) {
    return { isSpam: true, reason: 'Excessive repetitive characters detected.' };
  }

  // Check for duplicate comment recently posted by the same user within last 3 minutes
  if (userId && db) {
    try {
      const recentDuplicate = db.prepare(`
        SELECT id FROM project_comments
        WHERE user_id = ? AND content = ? AND created_at >= datetime('now', '-3 minutes')
        LIMIT 1
      `).get(userId, trimmed);

      if (recentDuplicate) {
        return { isSpam: true, reason: 'Duplicate comment detected. Please do not post identical comments repeatedly.' };
      }
    } catch (_) {}
  }

  return { isSpam: false };
}

/**
 * Check duplicate / self vote protection
 */
function checkSelfVote(db, projectId, userId) {
  if (!userId) return false;
  try {
    const isMember = db.prepare(`
      SELECT 1 FROM team_members tm
      JOIN projects p ON p.team_id = tm.team_id
      WHERE p.id = ? AND tm.user_id = ?
    `).get(projectId, userId);
    return !!isMember;
  } catch (_) {
    return false;
  }
}

module.exports = {
  checkRateLimit,
  logSuspiciousActivity,
  checkSpam,
  checkSelfVote
};
