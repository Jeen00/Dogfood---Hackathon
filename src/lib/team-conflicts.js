'use strict';

/**
 * Checks whether two events overlap in time.
 * Overlap occurs if [openA, closeA] and [openB, closeB] intersect:
 * openA < closeB && openB < closeA
 */
function eventsOverlap(evtA, evtB) {
  if (!evtA || !evtB) return false;
  const idA = evtA.id || evtA.event_id;
  const idB = evtB.id || evtB.event_id;
  if (idA && idB && idA === idB) return true;

  const openA = evtA.submissions_open ? new Date(evtA.submissions_open).getTime() : null;
  const closeA = evtA.submissions_close ? new Date(evtA.submissions_close).getTime() : null;
  const openB = evtB.submissions_open ? new Date(evtB.submissions_open).getTime() : null;
  const closeB = evtB.submissions_close ? new Date(evtB.submissions_close).getTime() : null;

  if (!openA || !closeA || !openB || !closeB) return false;

  return openA < closeB && openB < closeA;
}

/**
 * Checks if a user has a participation conflict with a target event.
 * Conflicts occur if:
 * 1. User is already in a team for targetEventId (limit: 1 team per hackathon)
 * 2. User is in a team for another hackathon that runs at the same time (overlapping dates)
 *
 * @param {Object} db - Database instance
 * @param {string} userId - User ID
 * @param {string} targetEventId - Event to participate in
 * @returns {Object} Conflict descriptor
 */
function checkUserEventConflict(db, userId, targetEventId) {
  const targetEvent = db.prepare('SELECT * FROM events WHERE id = ?').get(targetEventId);
  if (!targetEvent) return { conflict: false };

  const userTeams = db.prepare(`
    SELECT
      t.id AS team_id,
      t.name AS team_name,
      e.id AS event_id,
      e.name AS event_name,
      e.submissions_open,
      e.submissions_close
    FROM team_members tm
    JOIN teams t ON t.id = tm.team_id
    JOIN events e ON e.id = t.event_id
    WHERE tm.user_id = ?
  `).all(userId);

  for (const item of userTeams) {
    // 1. Same event check
    if (item.event_id === targetEvent.id) {
      return {
        conflict: true,
        reason: 'same_event',
        conflictingEvent: {
          id: item.event_id,
          name: item.event_name,
          submissions_open: item.submissions_open,
          submissions_close: item.submissions_close
        },
        teamName: item.team_name,
        message: `You are already a member of team "${item.team_name}" in "${item.event_name}". Only 1 team per participant is allowed in each hackathon.`
      };
    }

    // 2. Overlapping dates check
    if (eventsOverlap(targetEvent, item)) {
      return {
        conflict: true,
        reason: 'overlapping_event',
        conflictingEvent: {
          id: item.event_id,
          name: item.event_name,
          submissions_open: item.submissions_open,
          submissions_close: item.submissions_close
        },
        teamName: item.team_name,
        message: `Cannot participate in "${targetEvent.name}" because it runs at the same time as "${item.event_name}" (where you are in team "${item.team_name}"). You can only participate in one hackathon at a time.`
      };
    }
  }

  return { conflict: false };
}

module.exports = {
  eventsOverlap,
  checkUserEventConflict
};
