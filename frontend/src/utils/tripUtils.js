/**
 * tripUtils.js — Helpers for trip duration, dates, and expiry calculations.
 */

/**
 * Parses duration string (e.g. "7 days", "2 weeks", "1 month", "weekend") into number of days.
 * Safely unwraps JSON-encoded duration metadata if present.
 */
export function parseDurationDays(duration) {
  if (!duration) return 7;
  if (typeof duration === 'number') return duration;
  let str = String(duration).trim();

  if (str.startsWith('{') || str.startsWith('[')) {
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed)) {
        str = String(parsed[0]?.duration || '7 days');
      } else if (parsed && typeof parsed === 'object') {
        str = String(parsed.duration || '7 days');
      }
    } catch {
      return 7;
    }
  }

  str = str.toLowerCase().trim();
  if (str.includes('weekend')) {
    return 3;
  }

  const numMatch = str.match(/\d+/);
  const num = numMatch ? parseInt(numMatch[0], 10) : null;

  if (str.includes('month')) {
    return (num || 1) * 30;
  }
  if (str.includes('week')) {
    return (num || 1) * 7;
  }
  return num || 7;
}

/**
 * Computes end date string 'YYYY-MM-DD' from departure date and duration using UTC arithmetic
 * so positive timezone offsets (e.g. IST UTC+5:30) never shift the date backwards by 1 day.
 */
export function getTripEndDate(departureDate, duration) {
  if (!departureDate) return null;
  try {
    const cleanDate = String(departureDate).trim().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) return null;
    const d = new Date(cleanDate + 'T00:00:00Z');
    if (isNaN(d.getTime())) return null;
    const days = parseDurationDays(duration);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().split('T')[0];
  } catch {
    return null;
  }
}

/**
 * Checks if a trip is upcoming/active.
 * - If departureDate is not set (flexible date), the trip is considered active/upcoming.
 * - If referenceDate is given (or defaults to today 'YYYY-MM-DD'):
 *   Returns true if the trip's end date has not passed yet.
 */
export function isTripUpcoming(departureDate, duration, referenceDate) {
  if (!departureDate) return true;
  const cleanDep = String(departureDate).trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDep)) return true;
  const today = referenceDate || new Date().toISOString().split('T')[0];
  const endDate = getTripEndDate(cleanDep, duration);
  if (!endDate) return cleanDep >= today;
  return endDate >= today;
}

/**
 * Checks if a trip matches user's preference date filter:
 * - Never shows trips that have already ended relative to today.
 * - If departureDate is flexible/null, shows in default feed (!preferenceDate).
 * - If preferenceDate is specified, shows trips departing on/after preferenceDate
 *   or currently active during preferenceDate.
 */
export function matchesPreferenceDate(departureDate, duration, preferenceDate) {
  if (!departureDate) return !preferenceDate;
  const cleanDep = String(departureDate).trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDep)) return !preferenceDate;

  const today = new Date().toISOString().split('T')[0];
  const endDate = getTripEndDate(cleanDep, duration);

  // If travel already ended relative to today -> never show!
  if (endDate && endDate < today) {
    return false;
  }

  // If user specified a preference date:
  if (preferenceDate) {
    const cleanPref = String(preferenceDate).trim().slice(0, 10);
    const departsOnOrAfter = cleanDep >= cleanPref;
    const activeDuring = cleanDep <= cleanPref && endDate && endDate >= cleanPref;
    return departsOnOrAfter || activeDuring;
  }

  // If no preference date specified, must be upcoming/active today onwards
  return endDate ? endDate >= today : cleanDep >= today;
}

/**
 * User-friendly date formatter: '2026-07-15' -> 'Jul 15, 2026'
 */
export function formatTripDate(dateStr) {
  if (!dateStr || dateStr === 'Flexible') return 'Flexible Date';
  try {
    const cleanDate = String(dateStr).trim().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
      const [y, m, day] = cleanDate.split('-').map(Number);
      const d = new Date(y, m - 1, day);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      }
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return String(dateStr);
  }
}
