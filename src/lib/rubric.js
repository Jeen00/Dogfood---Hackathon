'use strict';
const { ACTIVE_EVENT_ID } = require('./config');

/**
 * Fetch rubric criteria for the given event from the DB.
 * Falls back to default criteria if none found in DB.
 */
function getRubric(db, eventId = ACTIVE_EVENT_ID) {
  const rows = db.prepare('SELECT id, name, weight FROM rubric_criteria WHERE event_id = ?').all(eventId);
  if (rows && rows.length > 0) {
    return rows;
  }
  return [
    { id: 'crit_01', name: 'functionality', weight: 0.5 },
    { id: 'crit_02', name: 'quality',       weight: 0.3 },
    { id: 'crit_03', name: 'presentation',  weight: 0.2 }
  ];
}

/**
 * Calculate weighted score given a criteria_scores object and rubric array.
 * @param {Object} criteriaScores - e.g. { functionality: 5, quality: 4, presentation: 3 }
 * @param {Array} rubric - e.g. [{ name: 'functionality', weight: 0.5 }, ...]
 * @returns {number}
 */
function computeWeightedScore(criteriaScores, rubric) {
  if (!criteriaScores) return 0;
  return rubric.reduce((sum, c) => sum + (Number(criteriaScores[c.name]) || 0) * c.weight, 0);
}

module.exports = {
  getRubric,
  computeWeightedScore
};
