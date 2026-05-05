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

// ── Time parse / format ────────────────────────────────────────────

/**
 * Parse a time string into { hours, minutes } in 24h canonical form.
 * Accepts: "HH:MM", "H:MM", "h:mm am", "h:mm pm" (case-insensitive),
 * "HH:MM:SS" (seconds discarded), "HH:MM TZ" (TZ discarded).
 * Returns null on invalid input.
 */
export function parseTime(s) {
  if (s == null || s === '') return null;
  if (typeof s === 'object' && s !== null) {
    const h = parseInt(s.hours ?? s.h, 10);
    const mn = parseInt(s.minutes ?? s.m, 10);
    if (!Number.isFinite(h) || !Number.isFinite(mn)) return null;
    if (h < 0 || h > 23 || mn < 0 || mn > 59) return null;
    return { hours: h, minutes: mn };
  }
  const str = String(s).trim();
  // Strip a trailing IANA-ish TZ token after a space (e.g. "14:30 America/New_York")
  const firstSpace = str.indexOf(' ');
  const timePart = firstSpace > -1 ? str.slice(0, firstSpace) : str;
  const tail = firstSpace > -1 ? str.slice(firstSpace + 1).trim() : '';
  const ampmMatch = tail.match(/^(am|pm)$/i) || timePart.match(/(am|pm)$/i);
  const cleanTime = timePart.replace(/(am|pm)$/i, '').trim();
  const parts = cleanTime.split(':');
  if (parts.length < 2) return null;
  let h = parseInt(parts[0], 10);
  const mn = parseInt(parts[1], 10);
  if (!Number.isFinite(h) || !Number.isFinite(mn)) return null;
  if (mn < 0 || mn > 59) return null;
  if (ampmMatch) {
    const isPm = ampmMatch[1].toLowerCase() === 'pm';
    if (h < 1 || h > 12) return null;
    if (h === 12) h = isPm ? 12 : 0;
    else if (isPm) h += 12;
  }
  if (h < 0 || h > 23) return null;
  return { hours: h, minutes: mn };
}

/**
 * Format { hours, minutes } as either '24h' (default) or '12h'.
 * '24h' → "HH:MM"
 * '12h' → "H:MM AM" / "H:MM PM" (1..12)
 */
export function formatTime(t, format = '24h') {
  if (!t) return '';
  const h = t.hours;
  const mn = t.minutes;
  if (!Number.isFinite(h) || !Number.isFinite(mn)) return '';
  if (format === '12h') {
    const ampm = h >= 12 ? 'PM' : 'AM';
    let h12 = h % 12;
    if (h12 === 0) h12 = 12;
    return `${h12}:${pad2(mn)} ${ampm}`;
  }
  return `${pad2(h)}:${pad2(mn)}`;
}

/**
 * Compare two parsed times. Missing values compare as 0.
 */
export function compareTime(a, b) {
  if (!a || !b) return 0;
  if (a.hours !== b.hours) return a.hours < b.hours ? -1 : 1;
  if (a.minutes !== b.minutes) return a.minutes < b.minutes ? -1 : 1;
  return 0;
}

/**
 * Add `n` minutes to a parsed time, wrapping within 24h. Returns new object.
 */
export function addMinutes(t, n) {
  if (!t) return null;
  let total = t.hours * 60 + t.minutes + n;
  total = ((total % 1440) + 1440) % 1440;
  return { hours: Math.floor(total / 60), minutes: total % 60 };
}

// ── DateTime parse / format ────────────────────────────────────────

/**
 * Compute the UTC offset for a given IANA zone on a given date (DST-aware).
 * Returns a string like "+05:30" or "-07:00", or null if unavailable.
 *
 * The reference instant is required so DST is resolved correctly — pass
 * the date the time is meant to represent.
 */
export function ianaOffset(zone, refDate) {
  if (!zone) return null;
  try {
    const ref = refDate instanceof Date ? refDate : new Date();
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      timeZoneName: 'shortOffset',
    });
    const parts = fmt.formatToParts(ref);
    const tzPart = parts.find((p) => p.type === 'timeZoneName');
    if (!tzPart) return null;
    let s = tzPart.value;
    if (s === 'GMT' || s === 'UTC') return '+00:00';
    s = s.replace(/^(GMT|UTC)/, '');
    const m = s.match(/^([+-])(\d{1,2})(?::(\d{2}))?$/);
    if (!m) return null;
    const sign = m[1];
    const h = m[2].padStart(2, '0');
    const mins = m[3] || '00';
    return `${sign}${h}:${mins}`;
  } catch (_) {
    return null;
  }
}

/**
 * Parse various datetime strings into { date, time, timezone? }.
 *
 * Accepted forms:
 *   ISO with offset:   "2026-05-04T14:30:00-07:00"  (offset becomes timezone)
 *   ISO no offset:     "2026-05-04T14:30"           (no timezone)
 *   Space + IANA:      "2026-05-04 14:30 America/New_York"
 *   Space, no tz:      "2026-05-04 14:30"
 *   Date only:         "2026-05-04"                 (time defaults to 00:00)
 *
 * For ISO-with-offset inputs, `timezone` holds the offset string (e.g.
 * "-07:00" or "Z"). Callers that need an IANA name should pass an object
 * `{ date, time, timezone }` directly.
 */
export function parseDateTime(s) {
  if (s == null || s === '') return null;
  if (typeof s === 'object' && !Array.isArray(s) && !(s instanceof Date)) {
    const date = s.date ? parseYmd(s.date) : null;
    const time = s.time ? parseTime(s.time) : null;
    if (!date) return null;
    return { date, time: time || { hours: 0, minutes: 0 }, timezone: s.timezone || null };
  }
  let str = String(s).trim();
  // Strip seconds (".sss" too) for our HH:MM-only model — preserve sign for offset
  // but tolerant of the seconds portion.
  // Try ISO with offset first: YYYY-MM-DDTHH:MM(:SS)?(Z|±HH:MM)
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/);
  if (isoMatch) {
    const [, yy, mm, dd, hh, mn, off] = isoMatch;
    let timezone = null;
    if (off) {
      if (off === 'Z') timezone = '+00:00';
      else if (/^[+-]\d{4}$/.test(off)) timezone = `${off.slice(0, 3)}:${off.slice(3)}`;
      else timezone = off;
    }
    return {
      date: { y: +yy, m: +mm, d: +dd },
      time: { hours: +hh, minutes: +mn },
      timezone,
    };
  }
  // Space-separated forms with optional IANA tz at the end. The separator
  // between date and time is either 'T' at position 10 (after YYYY-MM-DD)
  // or a space — never a 'T' that lives inside a tz token like "UTC".
  let datePart;
  let rest;
  if (str.length >= 11 && str.charAt(10) === 'T') {
    datePart = str.slice(0, 10);
    rest = str.slice(11);
  } else {
    const sp = str.indexOf(' ');
    if (sp === -1) {
      const date = parseYmd(str);
      return date ? { date, time: { hours: 0, minutes: 0 }, timezone: null } : null;
    }
    datePart = str.slice(0, sp);
    rest = str.slice(sp + 1);
  }
  const date = parseYmd(datePart);
  if (!date) return null;
  const restTrim = rest.trim();
  let timezone = null;
  let timeStr = restTrim;
  // IANA tz suffix: "Region/City" | "UTC" | "GMT"
  const tzMatch = restTrim.match(/\s+([A-Za-z][A-Za-z_+\-]*\/[A-Za-z][A-Za-z_+\-]*|UTC|GMT)$/);
  if (tzMatch) {
    timezone = tzMatch[1];
    timeStr = restTrim.slice(0, tzMatch.index).trim();
  }
  const time = parseTime(timeStr);
  if (!time) return null;
  return { date, time, timezone };
}

/**
 * Format a parsed datetime for display.
 * `displayFormat` uses the same tokens as formatForDisplay for the date part.
 * `timeFormat` is '24h' or '12h' for the time part.
 * If timezone is present, it is appended after the time with a space.
 */
export function formatDateTimeForDisplay(parsed, displayFormat, timeFormat = '24h') {
  if (!parsed) return '';
  const datePart = formatForDisplay(parsed.date, displayFormat);
  const timePart = formatTime(parsed.time, timeFormat);
  let out = `${datePart} ${timePart}`.trim();
  if (parsed.timezone) out += ` ${parsed.timezone}`;
  return out;
}

/**
 * Canonical 24h string: "YYYY-MM-DD HH:MM" or "YYYY-MM-DD HH:MM TZ".
 */
export function formatDateTime(parsed) {
  if (!parsed || !parsed.date) return '';
  const d = formatYmd(parsed.date);
  const t = parsed.time ? formatTime(parsed.time, '24h') : '00:00';
  let out = `${d} ${t}`;
  if (parsed.timezone) out += ` ${parsed.timezone}`;
  return out;
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
  parseTime, formatTime, compareTime, addMinutes,
  parseDateTime, formatDateTime, formatDateTimeForDisplay,
  ianaOffset,
  today, _setFrozenToday,
  monthNames, weekdayNames,
};
