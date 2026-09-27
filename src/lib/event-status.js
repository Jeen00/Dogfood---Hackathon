'use strict';

/**
 * Calculates current status and remaining time for a hackathon event.
 * @param {Object} event - Event record from DB
 * @returns {Object} { status: 'running'|'upcoming'|'completed', label, badgeClass, timeText }
 */
function getEventStatus(event) {
  const now = new Date();
  const open = event.submissions_open ? new Date(event.submissions_open) : null;
  const close = event.submissions_close ? new Date(event.submissions_close) : null;

  // 1. Upcoming: Submissions have not opened yet
  if (open && now < open) {
    const diffMs = open.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
    const timeText = diffDays > 0
      ? `Starts in ${diffDays}d ${diffHours}h`
      : `Starts in ${diffHours}h`;

    return {
      status: 'upcoming',
      label: 'Upcoming',
      badgeClass: 'badge-upcoming',
      timeText
    };
  }

  // 2. Completed: Submissions deadline has passed
  if (close && now > close) {
    const closeDateStr = close.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return {
      status: 'completed',
      label: 'Completed',
      badgeClass: 'badge-completed',
      timeText: `Ended on ${closeDateStr}`
    };
  }

  // 3. Running: Event is currently active
  if (close) {
    const diffMs = close.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
    const diffMins = Math.floor((diffMs / (1000 * 60)) % 60);

    const timeText = diffDays > 0
      ? `${diffDays}d ${diffHours}h remaining`
      : `${diffHours}h ${diffMins}m remaining`;

    return {
      status: 'running',
      label: 'Running',
      badgeClass: 'badge-running',
      timeText
    };
  }

  return {
    status: 'running',
    label: 'Running',
    badgeClass: 'badge-running',
    timeText: 'Open'
  };
}

module.exports = {
  getEventStatus
};
