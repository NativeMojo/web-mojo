/**
 * dateFns — narrow date utilities used by the Calendar / DatePicker engine.
 *
 * Local-date components only (year / month / day ints). All formatting and
 * comparison work in the browser's local timezone — never UTC offset — so
 * DST boundaries don't cause days to disappear.
 *
 * NOT a general-purpose date library. Add only what the picker needs.
 */

const MONTH_NAMES_FULL = ['January', 'February', 'March', 'April', 'May', 'June',
                          'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                           'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ── Parse / format ─────────────────────────────────────────────────

/** "YYYY" → { y } | null */
export function parseYear(s) {
  if (s == null || s === '') return null;
  const y = parseInt(String(s).slice(0, 4), 10);
  return Number.isFinite(y) ? { y } : null;
}

/** "YYYY-MM" → { y, m } | null */
export function parseYm(s) {
  if (s == null || s === '') return null;
  const parts = String(s).split('-');
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return null;
  return { y, m };
}

/** "YYYY-MM-DD" or Date → { y, m, d } | null */
export function parseYmd(s) {
  if (s == null || s === '') return null;
  if (s instanceof Date && !isNaN(s.getTime())) {
    return { y: s.getFullYear(), m: s.getMonth() + 1, d: s.getDate() };
  }
  const parts = String(s).split('-');
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return { y, m, d };
}

export function formatYear(value) {
  const p = typeof value === 'object' ? value : parseYear(value);
  return p ? String(p.y) : '';
}

export function formatYm(value) {
  const p = typeof value === 'object' ? value : parseYm(value);
  return p ? `${p.y}-${pad2(p.m)}` : '';
}

export function formatYmd(value) {
  const p = typeof value === 'object' ? value : parseYmd(value);
  return p ? `${p.y}-${pad2(p.m)}-${pad2(p.d)}` : '';
}

/** Format a parsed value (or string) by precision: 'year' | 'month' | 'day'. */
export function formatByPrecision(value, precision) {
  if (precision === 'year') return formatYear(value);
  if (precision === 'month') return formatYm(value);
  return formatYmd(value);
}

/** Parse a stored string by precision. */
export function parseByPrecision(s, precision) {
  if (precision === 'year') return parseYear(s);
  if (precision === 'month') return parseYm(s);
  return parseYmd(s);
}

// ── Display formatting ─────────────────────────────────────────────

const DISPLAY_TOKENS = /YYYY|YY|MMMM|MMM|MM|M|DD|D/g;

/**
 * Lightweight display formatter. Supports YYYY, YY, MMMM, MMM, MM, M, DD, D.
 * For tokens not relevant to the precision (e.g. DD when precision='month'),
 * the token is dropped — caller is responsible for picking a sensible format.
 */
export function formatForDisplay(parsed, format) {
  if (!parsed) return '';
  const y = parsed.y;
  const m = parsed.m;
  const d = parsed.d;
  return String(format).replace(DISPLAY_TOKENS, (tok) => {
    switch (tok) {
      case 'YYYY': return String(y);
      case 'YY': return String(y).slice(-2);
      case 'MMMM': return m ? MONTH_NAMES_FULL[m - 1] : '';
      case 'MMM': return m ? MONTH_NAMES_SHORT[m - 1] : '';
      case 'MM': return m ? pad2(m) : '';
      case 'M': return m ? String(m) : '';
      case 'DD': return d ? pad2(d) : '';
      case 'D': return d ? String(d) : '';
      default: return tok;
    }
  });
}

// ── Component math ─────────────────────────────────────────────────

export function daysInMonth(year, month) {
  // Last day of `month` is day 0 of `month+1`. month is 1-indexed.
  return new Date(year, month, 0).getDate();
}

/**
 * Weekday of a given Y-M-D, 0..6 with `firstDay` (0=Sun, 1=Mon, ...) as 0.
 */
export function weekdayWithFirstDay(year, month, day, firstDay = 1) {
  const d = new Date(year, month - 1, day).getDay(); // 0=Sun..6=Sat
  return ((d - firstDay) % 7 + 7) % 7;
}

/** Add `n` months to a {y,m} or {y,m,d}, returning the same shape clamped. */
export function addMonths(p, n) {
  if (!p) return null;
  let y = p.y;
  let m = p.m + n;
  while (m > 12) { m -= 12; y += 1; }
  while (m < 1) { m += 12; y -= 1; }
  if (p.d == null) return { y, m };
  const dim = daysInMonth(y, m);
  return { y, m, d: Math.min(p.d, dim) };
}

export function addYears(p, n) {
  if (!p) return null;
  if (p.m == null) return { y: p.y + n };
  if (p.d == null) return { y: p.y + n, m: p.m };
  const dim = daysInMonth(p.y + n, p.m);
  return { y: p.y + n, m: p.m, d: Math.min(p.d, dim) };
}

// ── Comparison ─────────────────────────────────────────────────────

/** -1 / 0 / 1 — compare two parsed values at day precision. Missing parts compared as 0. */
export function compareYmd(a, b) {
  if (!a || !b) return 0;
  if (a.y !== b.y) return a.y < b.y ? -1 : 1;
  if ((a.m || 0) !== (b.m || 0)) return (a.m || 0) < (b.m || 0) ? -1 : 1;
  if ((a.d || 0) !== (b.d || 0)) return (a.d || 0) < (b.d || 0) ? -1 : 1;
  return 0;
}

export function compareYm(a, b) {
  if (!a || !b) return 0;
  if (a.y !== b.y) return a.y < b.y ? -1 : 1;
  if ((a.m || 0) !== (b.m || 0)) return (a.m || 0) < (b.m || 0) ? -1 : 1;
  return 0;
}

export function compareYear(a, b) {
  if (!a || !b) return 0;
  return a.y === b.y ? 0 : (a.y < b.y ? -1 : 1);
}

export function compareByPrecision(a, b, precision) {
  if (precision === 'year') return compareYear(a, b);
  if (precision === 'month') return compareYm(a, b);
  return compareYmd(a, b);
}

export function isSameDay(a, b) {
  return compareYmd(a, b) === 0 && a && b && a.d === b.d;
}

export function isSameMonth(a, b) {
  return a && b && a.y === b.y && a.m === b.m;
}

export function isSameYear(a, b) {
  return a && b && a.y === b.y;
}

// ── Day count ──────────────────────────────────────────────────────

/** Inclusive day count between two parsed dates (1 if same day). */
export function daysBetweenInclusive(a, b) {
  if (!a || !b) return 0;
  const A = new Date(a.y, a.m - 1, a.d);
  const B = new Date(b.y, b.m - 1, b.d);
  return Math.round(Math.abs(B - A) / 86400000) + 1;
}

/** Inclusive month count. */
export function monthsBetweenInclusive(a, b) {
  if (!a || !b) return 0;
  return Math.abs((b.y - a.y) * 12 + (b.m - a.m)) + 1;
}

/** Inclusive year count. */
export function yearsBetweenInclusive(a, b) {
  if (!a || !b) return 0;
  return Math.abs(b.y - a.y) + 1;
}

export function unitsBetweenInclusive(a, b, precision) {
  if (precision === 'year') return yearsBetweenInclusive(a, b);
  if (precision === 'month') return monthsBetweenInclusive(a, b);
  return daysBetweenInclusive(a, b);
}

// ── Today (frozen-aware for tests) ─────────────────────────────────

let _frozenToday = null;
/** Test hook — set null to clear. */
export function _setFrozenToday(parsed) { _frozenToday = parsed; }

export function today() {
  if (_frozenToday) return { ..._frozenToday };
  const d = new Date();
  return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() };
}

// ── Locale-aware names ─────────────────────────────────────────────

let _cachedLocale = null;
let _cachedMonths = null;
let _cachedWeekdays = null;

/** Returns 12 short month names for the given locale. */
export function monthNames(locale = 'en-US', length = 'short') {
  // For default English, return our static list — cheap and deterministic in tests.
  if ((!locale || locale === 'en-US' || locale === 'en') && length === 'short') return MONTH_NAMES_SHORT.slice();
  if ((!locale || locale === 'en-US' || locale === 'en') && length === 'long') return MONTH_NAMES_FULL.slice();

  if (typeof Intl === 'undefined' || !Intl.DateTimeFormat) {
    return length === 'long' ? MONTH_NAMES_FULL.slice() : MONTH_NAMES_SHORT.slice();
  }
  if (_cachedLocale === locale + '/' + length && _cachedMonths) return _cachedMonths.slice();
  const fmt = new Intl.DateTimeFormat(locale, { month: length });
  const out = [];
  for (let m = 0; m < 12; m++) {
    out.push(fmt.format(new Date(2024, m, 15)));
  }
  _cachedLocale = locale + '/' + length;
  _cachedMonths = out;
  return out.slice();
}

/** Returns 7 short weekday names ordered by `firstDay` (0=Sun,1=Mon,...). */
export function weekdayNames(locale = 'en-US', firstDay = 1, length = 'short') {
  if (typeof Intl === 'undefined' || !Intl.DateTimeFormat) {
    const fallback = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return rotate(fallback, firstDay);
  }
  const cacheKey = locale + '/' + firstDay + '/' + length;
  if (_cachedLocale === cacheKey && _cachedWeekdays) return _cachedWeekdays.slice();
  const fmt = new Intl.DateTimeFormat(locale, { weekday: length });
  const base = [];
  for (let i = 0; i < 7; i++) {
    // 2024-01-07 was a Sunday; index 0=Sun..6=Sat
    base.push(fmt.format(new Date(2024, 0, 7 + i)));
  }
  const out = rotate(base, firstDay);
  _cachedLocale = cacheKey;
  _cachedWeekdays = out;
  return out.slice();
}

// ── Internal ───────────────────────────────────────────────────────

function pad2(n) { return n < 10 ? '0' + n : String(n); }

function rotate(arr, n) {
  const k = ((n % arr.length) + arr.length) % arr.length;
  return arr.slice(k).concat(arr.slice(0, k));
}

export const __MONTH_NAMES_FULL = MONTH_NAMES_FULL;
export const __MONTH_NAMES_SHORT = MONTH_NAMES_SHORT;

export default {
  parseYear, parseYm, parseYmd, parseByPrecision,
  formatYear, formatYm, formatYmd, formatByPrecision, formatForDisplay,
  daysInMonth, weekdayWithFirstDay,
  addMonths, addYears,
  compareYmd, compareYm, compareYear, compareByPrecision,
  isSameDay, isSameMonth, isSameYear,
  daysBetweenInclusive, monthsBetweenInclusive, yearsBetweenInclusive, unitsBetweenInclusive,
  today, _setFrozenToday,
  monthNames, weekdayNames,
};
