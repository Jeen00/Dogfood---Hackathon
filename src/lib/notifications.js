'use strict';
const { getDb } = require('../db/db');

/**
 * Creates a notification for a user.
 * @param {string} userId
 * @param {string} type   - e.g. 'judge_invite', 'invite_accepted', 'invite_rejected'
 * @param {string} title
 * @param {string} body
 * @param {Object} [data] - extra JSON data
 */
function createNotification(userId, type, title, body, data = null) {
  try {
    const db = getDb();
    const id = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();
    db.prepare(
      'INSERT INTO notifications (id, user_id, type, title, body, data, read, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?)'
    ).run(id, userId, type, title, body, data ? JSON.stringify(data) : null, now);
    return id;
  } catch (err) {
    console.error('[notifications] Failed to create notification:', err.message);
  }
}

/**
 * Gets unread notifications count for a user.
 */
function getUnreadCount(userId) {
  try {
    const db = getDb();
    return db.prepare("SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND read = 0").get(userId)?.c || 0;
  } catch {
    return 0;
  }
}

/**
 * Gets all notifications for a user (newest first).
 */
function getNotifications(userId, limit = 50) {
  try {
    const db = getDb();
    return db.prepare(
      "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?"
    ).all(userId, limit).map(n => ({
      ...n,
      data: n.data ? JSON.parse(n.data) : null
    }));
  } catch {
    return [];
  }
}

module.exports = { createNotification, getUnreadCount, getNotifications };
