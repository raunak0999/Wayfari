/**
 * tripUtils.js — Helpers for trip duration, dates, and expiry calculations.
 */

/**
 * Parses duration string (e.g. "7 days", "2 weeks", "1 month", "weekend") into number of days.
 */
export function parseDurationDays(duration) {
  if (!duration) return 7;
  if (typeof duration === 'number') return duration;
  const str = String(duration).toLowerCase().trim();
  const numMatch = str.match(/\d+/);
  const num = numMatch ? parseInt(numMatch[0], 10) : 7;

  if (str.includes('month')) {
    return num * 30;
  }
  if (str.includes('week')) {
    return num * 7;
  }
  if (str.includes('weekend')) {
    return 3;
  }
  return num || 7;
}

/**
 * Computes end date string 'YYYY-MM-DD' from departure date and duration.
 */
export function getTripEndDate(departureDate, duration) {
  if (!departureDate) return null;
  try {
    const d = new Date(departureDate + 'T00:00:00');
    if (isNaN(d.getTime())) return null;
    const days = parseDurationDays(duration);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  } catch {
    return null;
  }
}

/**
 * Checks if a trip is upcoming/active.
 * - If referenceDate is given (or defaults to today 'YYYY-MM-DD'):
 *   Returns true if the trip's end date has not passed yet.
 */
export function isTripUpcoming(departureDate, duration, referenceDate) {
  if (!departureDate) return false;
  const today = referenceDate || new Date().toISOString().split('T')[0];
  const endDate = getTripEndDate(departureDate, duration);
  if (!endDate) return false;
  // If trip already ended in the past -> false
  return endDate >= today;
}

/**
 * Checks if a trip matches user's preference date filter:
 * "only show if on their preference date anyone is travelling only their profile not everyone
 * like if a traveller traveled 5 days ago and their travel ended dont show them
 * only show upcoming travellers from the users preference date from that date to all other ahead"
 */
export function matchesPreferenceDate(departureDate, duration, preferenceDate) {
  if (!departureDate) return false;
  const today = new Date().toISOString().split('T')[0];
  const endDate = getTripEndDate(departureDate, duration);

  // If travel already ended relative to today -> never show!
  if (endDate && endDate < today) {
    return false;
  }

  // If user specified a preference date:
  if (preferenceDate) {
    // Show travellers departing on or after preference date,
    // OR travelling during the preference date (trip active on that date)
    const departsOnOrAfter = departureDate >= preferenceDate;
    const activeDuring = departureDate <= preferenceDate && endDate && endDate >= preferenceDate;
    return departsOnOrAfter || activeDuring;
  }

  // If no preference date specified, must be upcoming/active today onwards
  return endDate ? endDate >= today : departureDate >= today;
}

/**
 * User-friendly date formatter: '2026-07-15' -> 'Jul 15, 2026'
 */
export function formatTripDate(dateStr) {
  if (!dateStr) return 'Flexible Date';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}
