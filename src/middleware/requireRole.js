'use strict';

/**
 * Role guard middleware factory.
 * Usage: router.get('/route', requireRole('organizer', 'admin'), handler)
 *
 * Returns 401 if no session, 403 if role not in allowed list.
 */
function requireRole(...roles) {
  return function (req, res, next) {
    if (!req.session) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (!roles.includes(req.session.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return next();
  };
}

module.exports = requireRole;
