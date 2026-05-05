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
  });
};
