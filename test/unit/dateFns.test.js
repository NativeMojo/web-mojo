/**
 * dateFns unit tests
 *
 * Pure utility module — exercises parsers, formatters, math, comparison,
 * span counts, and the frozen-today hook used in Calendar / DatePicker tests.
 */

const { loadModule } = require('../utils/simple-module-loader');

module.exports = async function (testContext) {
  const { describe, it, expect, afterEach } = testContext;

  const dateFns = loadModule('dateFns');
  const {
    parseYear, parseYm, parseYmd, parseByPrecision,
    formatYmd, formatYm, formatByPrecision, formatForDisplay,
    daysInMonth, weekdayWithFirstDay,
    addMonths, addYears,
    compareYmd, compareByPrecision,
    daysBetweenInclusive, monthsBetweenInclusive, yearsBetweenInclusive,
    unitsBetweenInclusive,
    today, _setFrozenToday,
    monthNames, weekdayNames,
  } = dateFns;

  describe('dateFns', () => {
    describe('parsers', () => {
      it('parses YYYY-MM-DD', () => {
        expect(parseYmd('2026-05-04')).toEqual({ y: 2026, m: 5, d: 4 });
      });
      it('parses YYYY-MM', () => {
        expect(parseYm('2026-05')).toEqual({ y: 2026, m: 5 });
      });
      it('parses YYYY', () => {
        expect(parseYear('2026')).toEqual({ y: 2026 });
      });
      it('parses by precision', () => {
        expect(parseByPrecision('2026-05-04', 'day')).toEqual({ y: 2026, m: 5, d: 4 });
        expect(parseByPrecision('2026-05', 'month')).toEqual({ y: 2026, m: 5 });
        expect(parseByPrecision('2026', 'year')).toEqual({ y: 2026 });
      });
      it('returns null for empty / invalid', () => {
        expect(parseYmd('')).toBeNull();
        expect(parseYmd(null)).toBeNull();
        expect(parseYmd('not-a-date')).toBeNull();
        expect(parseYm('2026-13')).toBeNull();
      });
      it('parses Date instances', () => {
        const d = new Date(2026, 4, 4);
        expect(parseYmd(d)).toEqual({ y: 2026, m: 5, d: 4 });
      });
    });

    describe('formatters', () => {
      it('formats by precision', () => {
        expect(formatByPrecision({ y: 2026, m: 5, d: 4 }, 'day')).toBe('2026-05-04');
        expect(formatByPrecision({ y: 2026, m: 5 }, 'month')).toBe('2026-05');
        expect(formatByPrecision({ y: 2026 }, 'year')).toBe('2026');
      });
      it('zero-pads month and day', () => {
        expect(formatYmd({ y: 2026, m: 1, d: 9 })).toBe('2026-01-09');
        expect(formatYm({ y: 2026, m: 3 })).toBe('2026-03');
      });
      it('formats for display', () => {
        expect(formatForDisplay({ y: 2026, m: 5, d: 4 }, 'YYYY-MM-DD')).toBe('2026-05-04');
        expect(formatForDisplay({ y: 2026, m: 5, d: 4 }, 'MMM DD, YYYY')).toBe('May 04, 2026');
        expect(formatForDisplay({ y: 2026, m: 5 }, 'MMM YYYY')).toBe('May 2026');
        expect(formatForDisplay({ y: 2026 }, 'YYYY')).toBe('2026');
      });
    });

    describe('component math', () => {
      it('returns days in month, including leap February', () => {
        expect(daysInMonth(2024, 2)).toBe(29);
        expect(daysInMonth(2025, 2)).toBe(28);
        expect(daysInMonth(2026, 1)).toBe(31);
        expect(daysInMonth(2026, 4)).toBe(30);
      });
      it('weekday with Monday-first', () => {
        expect(weekdayWithFirstDay(2026, 5, 4, 1)).toBe(0);
      });
      it('addMonths wraps year boundary forward and backward', () => {
        expect(addMonths({ y: 2026, m: 11 }, 3)).toEqual({ y: 2027, m: 2 });
        expect(addMonths({ y: 2026, m: 2 }, -3)).toEqual({ y: 2025, m: 11 });
      });
      it('addMonths clamps day-of-month when target month is shorter', () => {
        expect(addMonths({ y: 2026, m: 1, d: 31 }, 1)).toEqual({ y: 2026, m: 2, d: 28 });
      });
      it('addYears clamps to leap day boundary', () => {
        expect(addYears({ y: 2024, m: 2, d: 29 }, 1)).toEqual({ y: 2025, m: 2, d: 28 });
      });
    });

    describe('comparison', () => {
      it('compareYmd is signed correctly', () => {
        expect(compareYmd({ y: 2026, m: 1, d: 1 }, { y: 2026, m: 1, d: 2 })).toBe(-1);
        expect(compareYmd({ y: 2026, m: 1, d: 2 }, { y: 2026, m: 1, d: 1 })).toBe(1);
        expect(compareYmd({ y: 2026, m: 1, d: 1 }, { y: 2026, m: 1, d: 1 })).toBe(0);
      });
      it('compareByPrecision matches level', () => {
        expect(compareByPrecision({ y: 2026, m: 1, d: 1 }, { y: 2026, m: 1, d: 31 }, 'month')).toBe(0);
        expect(compareByPrecision({ y: 2026, m: 1, d: 1 }, { y: 2027, m: 1, d: 1 }, 'year')).toBe(-1);
      });
    });

    describe('span counts', () => {
      it('inclusive day count', () => {
        expect(daysBetweenInclusive({ y: 2026, m: 5, d: 6 }, { y: 2026, m: 5, d: 22 })).toBe(17);
        expect(daysBetweenInclusive({ y: 2026, m: 5, d: 6 }, { y: 2026, m: 5, d: 6 })).toBe(1);
      });
      it('inclusive month count, swapped order', () => {
        expect(monthsBetweenInclusive({ y: 2026, m: 8 }, { y: 2026, m: 3 })).toBe(6);
      });
      it('inclusive year count', () => {
        expect(yearsBetweenInclusive({ y: 2020 }, { y: 2026 })).toBe(7);
      });
      it('unitsBetweenInclusive routes by precision', () => {
        expect(unitsBetweenInclusive({ y: 2026, m: 5, d: 6 }, { y: 2026, m: 5, d: 22 }, 'day')).toBe(17);
        expect(unitsBetweenInclusive({ y: 2026, m: 3 }, { y: 2026, m: 8 }, 'month')).toBe(6);
        expect(unitsBetweenInclusive({ y: 2020 }, { y: 2026 }, 'year')).toBe(7);
      });
    });

    describe('today() with frozen hook', () => {
      afterEach(() => _setFrozenToday(null));
      it('returns frozen value when set', () => {
        _setFrozenToday({ y: 2026, m: 5, d: 4 });
        expect(today()).toEqual({ y: 2026, m: 5, d: 4 });
      });
      it('returns live date when not frozen', () => {
        const t = today();
        expect(t).toHaveProperty('y');
        expect(t).toHaveProperty('m');
        expect(t).toHaveProperty('d');
      });
    });

    describe('locale-aware names', () => {
      it('returns 12 short month names', () => {
        const names = monthNames('en-US', 'short');
        expect(names).toHaveLength(12);
        expect(names[0]).toBe('Jan');
        expect(names[11]).toBe('Dec');
      });
      it('returns 7 weekday names rotated by firstDay', () => {
        const wd = weekdayNames('en-US', 1, 'short');
        expect(wd).toHaveLength(7);
        expect(wd[0].toLowerCase()).toMatch(/^mon/);
      });
    });

    describe('time parsers / formatters', () => {
      const { parseTime, formatTime, addMinutes, compareTime, parseDateTime, formatDateTime } = dateFns;

      it('parses HH:MM 24h', () => {
        expect(parseTime('14:30')).toEqual({ hours: 14, minutes: 30 });
        expect(parseTime('09:05')).toEqual({ hours: 9, minutes: 5 });
        expect(parseTime('00:00')).toEqual({ hours: 0, minutes: 0 });
      });

      it('parses 12h with am/pm', () => {
        expect(parseTime('2:30 pm')).toEqual({ hours: 14, minutes: 30 });
        expect(parseTime('12:00 AM')).toEqual({ hours: 0, minutes: 0 });
        expect(parseTime('12:00 PM')).toEqual({ hours: 12, minutes: 0 });
        expect(parseTime('11:59 PM')).toEqual({ hours: 23, minutes: 59 });
      });

      it('returns null for invalid time', () => {
        expect(parseTime('')).toBeNull();
        expect(parseTime('25:00')).toBeNull();
        expect(parseTime('14:99')).toBeNull();
        expect(parseTime('not a time')).toBeNull();
      });

      it('strips trailing TZ token', () => {
        expect(parseTime('14:30 America/New_York')).toEqual({ hours: 14, minutes: 30 });
      });

      it('formats time in 24h and 12h', () => {
        const t = { hours: 14, minutes: 30 };
        expect(formatTime(t, '24h')).toBe('14:30');
        expect(formatTime(t, '12h')).toBe('2:30 PM');
        expect(formatTime({ hours: 0, minutes: 0 }, '12h')).toBe('12:00 AM');
        expect(formatTime({ hours: 12, minutes: 0 }, '12h')).toBe('12:00 PM');
      });

      it('addMinutes wraps within 24h', () => {
        expect(addMinutes({ hours: 23, minutes: 59 }, 1)).toEqual({ hours: 0, minutes: 0 });
        expect(addMinutes({ hours: 0, minutes: 0 }, -1)).toEqual({ hours: 23, minutes: 59 });
        expect(addMinutes({ hours: 9, minutes: 0 }, 30)).toEqual({ hours: 9, minutes: 30 });
      });

      it('compareTime', () => {
        expect(compareTime({ hours: 9, minutes: 0 }, { hours: 17, minutes: 0 })).toBe(-1);
        expect(compareTime({ hours: 17, minutes: 0 }, { hours: 9, minutes: 0 })).toBe(1);
        expect(compareTime({ hours: 9, minutes: 0 }, { hours: 9, minutes: 0 })).toBe(0);
      });

      it('parses datetime with optional timezone', () => {
        expect(parseDateTime('2026-05-04 14:30')).toEqual({
          date: { y: 2026, m: 5, d: 4 },
          time: { hours: 14, minutes: 30 },
          timezone: null,
        });
        expect(parseDateTime('2026-05-04 14:30 America/New_York')).toEqual({
          date: { y: 2026, m: 5, d: 4 },
          time: { hours: 14, minutes: 30 },
          timezone: 'America/New_York',
        });
        // ISO with T separator, no offset
        expect(parseDateTime('2026-05-04T14:30')).toEqual({
          date: { y: 2026, m: 5, d: 4 },
          time: { hours: 14, minutes: 30 },
          timezone: null,
        });
      });

      it('parses ISO 8601 with offset', () => {
        expect(parseDateTime('2026-05-04T14:30:00-07:00')).toEqual({
          date: { y: 2026, m: 5, d: 4 },
          time: { hours: 14, minutes: 30 },
          timezone: '-07:00',
        });
        expect(parseDateTime('2026-05-04T14:30:00Z')).toEqual({
          date: { y: 2026, m: 5, d: 4 },
          time: { hours: 14, minutes: 30 },
          timezone: '+00:00',
        });
        expect(parseDateTime('2026-05-04T14:30:00+05:30')).toEqual({
          date: { y: 2026, m: 5, d: 4 },
          time: { hours: 14, minutes: 30 },
          timezone: '+05:30',
        });
      });

      it('formatDateTime stringifies canonical form', () => {
        expect(formatDateTime({
          date: { y: 2026, m: 5, d: 4 },
          time: { hours: 14, minutes: 30 },
        })).toBe('2026-05-04 14:30');
        expect(formatDateTime({
          date: { y: 2026, m: 5, d: 4 },
          time: { hours: 14, minutes: 30 },
          timezone: 'America/New_York',
        })).toBe('2026-05-04 14:30 America/New_York');
      });
    });
  });
};
