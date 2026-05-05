/**
 * Calendar unit tests
 *
 * Loads via the simple-module-loader so @core/... aliases resolve
 * the same as in production.
 */

const { testHelpers } = require('../utils/test-helpers');
const { loadModule } = require('../utils/simple-module-loader');

module.exports = async function (testContext) {
  const { describe, it, expect, beforeEach, afterEach } = testContext;

  await testHelpers.setup();
  const Calendar = loadModule('Calendar');
  const dateFns = loadModule('dateFns');
  const { _setFrozenToday } = dateFns;

  describe('Calendar', () => {
    beforeEach(() => {
      _setFrozenToday({ y: 2026, m: 5, d: 4 });
      document.body.innerHTML = '<div id="cal-host"></div>';
    });

    afterEach(() => {
      _setFrozenToday(null);
      document.body.innerHTML = '';
    });

    async function mountCalendar(opts = {}) {
      const cal = new Calendar(opts);
      document.getElementById('cal-host').appendChild(cal.element);
      await cal.render();
      return cal;
    }

    describe('day precision · single mode', () => {
      it('renders a 7-column day grid for the default month', async () => {
        const cal = await mountCalendar({ precision: 'day', value: '2026-05-13' });
        const days = cal.element.querySelectorAll('.mojo-calendar-cell:not(.mojo-calendar-cell-blank)');
        expect(days.length).toBe(31);
        const selected = cal.element.querySelector('.mojo-calendar-cell-selected');
        expect(selected).not.toBeNull();
        expect(selected.dataset.ymd).toBe('2026-05-13');
      });

      it('marks today (frozen to 2026-05-04)', async () => {
        const cal = await mountCalendar({ precision: 'day' });
        const todayCell = cal.element.querySelector('.mojo-calendar-cell-today');
        expect(todayCell).not.toBeNull();
        expect(todayCell.dataset.ymd).toBe('2026-05-04');
      });

      it('emits select on day click and updates selected state', async () => {
        const cal = await mountCalendar({ precision: 'day' });
        const handler = jest.fn();
        cal.on('select', handler);

        const cell = cal.element.querySelector('[data-ymd="2026-05-13"]');
        cell.click();

        expect(handler).toHaveBeenCalledTimes(1);
        const args = handler.mock.calls[0][0];
        expect(args.value).toBe('2026-05-13');
        expect(cal.element.querySelector('.mojo-calendar-cell-selected').dataset.ymd).toBe('2026-05-13');
      });

      it('disables cells outside min/max', async () => {
        const cal = await mountCalendar({
          precision: 'day',
          min: '2026-05-10',
          max: '2026-05-20',
        });
        const cell5 = cal.element.querySelector('[data-ymd="2026-05-05"]');
        const cell15 = cal.element.querySelector('[data-ymd="2026-05-15"]');
        const cell25 = cal.element.querySelector('[data-ymd="2026-05-25"]');
        expect(cell5.classList.contains('mojo-calendar-cell-disabled')).toBe(true);
        expect(cell15.classList.contains('mojo-calendar-cell-disabled')).toBe(false);
        expect(cell25.classList.contains('mojo-calendar-cell-disabled')).toBe(true);
      });

      it('navigates to next month on click of next button', async () => {
        const cal = await mountCalendar({ precision: 'day', value: '2026-05-13' });
        cal.element.querySelector('[data-action="nav-next"]').click();
        const head = cal.element.querySelector('.mojo-calendar-head-label');
        expect(head.textContent).toMatch(/June/);
      });
    });

    describe('day precision · range mode', () => {
      it('renders existing range with anchor + fill', async () => {
        const cal = await mountCalendar({
          precision: 'day', mode: 'range',
          startValue: '2026-05-06', endValue: '2026-05-22',
        });
        const start = cal.element.querySelector('[data-ymd="2026-05-06"]');
        const end = cal.element.querySelector('[data-ymd="2026-05-22"]');
        const middle = cal.element.querySelector('[data-ymd="2026-05-13"]');
        expect(start.classList.contains('mojo-calendar-cell-anchor-start')).toBe(true);
        expect(end.classList.contains('mojo-calendar-cell-anchor-end')).toBe(true);
        expect(middle.classList.contains('mojo-calendar-cell-in-range')).toBe(true);
      });

      it('two-click selection commits a range', async () => {
        const cal = await mountCalendar({ precision: 'day', mode: 'range' });
        const onStart = jest.fn();
        const onSelect = jest.fn();
        cal.on('range:start', onStart);
        cal.on('range:select', onSelect);

        cal.element.querySelector('[data-ymd="2026-05-06"]').click();
        cal.element.querySelector('[data-ymd="2026-05-22"]').click();

        expect(onStart).toHaveBeenCalledTimes(1);
        expect(onSelect).toHaveBeenCalledTimes(1);
        const args = onSelect.mock.calls[0][0];
        expect(args.start).toBe('2026-05-06');
        expect(args.end).toBe('2026-05-22');
      });

      it('backwards selection auto-swaps start and end', async () => {
        const cal = await mountCalendar({ precision: 'day', mode: 'range' });
        const onSelect = jest.fn();
        cal.on('range:select', onSelect);

        cal.element.querySelector('[data-ymd="2026-05-22"]').click();
        cal.element.querySelector('[data-ymd="2026-05-06"]').click();

        const args = onSelect.mock.calls[0][0];
        expect(args.start).toBe('2026-05-06');
        expect(args.end).toBe('2026-05-22');
      });

      it('cross-page anchor persistence — start in May, end in June', async () => {
        const cal = await mountCalendar({ precision: 'day', mode: 'range' });
        const onSelect = jest.fn();
        cal.on('range:select', onSelect);

        cal.element.querySelector('[data-ymd="2026-05-06"]').click();
        cal.element.querySelector('[data-action="nav-next"]').click();

        expect(cal._anchor).toEqual({ y: 2026, m: 5, d: 6 });

        cal.element.querySelector('[data-ymd="2026-06-12"]').click();

        expect(onSelect).toHaveBeenCalledTimes(1);
        const args = onSelect.mock.calls[0][0];
        expect(args.start).toBe('2026-05-06');
        expect(args.end).toBe('2026-06-12');
      });

      it('Escape clears in-progress anchor', async () => {
        const cal = await mountCalendar({ precision: 'day', mode: 'range' });
        cal.element.querySelector('[data-ymd="2026-05-06"]').click();
        expect(cal._anchor).not.toBeNull();

        const ev = new globalThis.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
        cal.element.dispatchEvent(ev);

        expect(cal._anchor).toBeNull();
      });
    });

    describe('month precision', () => {
      it('renders a 4×3 month grid by default', async () => {
        const cal = await mountCalendar({ precision: 'month', value: '2026-05' });
        const cells = cal.element.querySelectorAll('[data-ym]');
        expect(cells.length).toBe(12);
        const selected = cal.element.querySelector('.mojo-calendar-cell-selected');
        expect(selected.dataset.ym).toBe('2026-05');
      });

      it('emits select on month tile click', async () => {
        const cal = await mountCalendar({ precision: 'month' });
        const handler = jest.fn();
        cal.on('select', handler);

        cal.element.querySelector('[data-ym="2026-08"]').click();
        expect(handler.mock.calls[0][0].value).toBe('2026-08');
      });

      it('range at month precision renders anchor cells', async () => {
        const cal = await mountCalendar({
          precision: 'month', mode: 'range',
          startValue: '2026-03', endValue: '2026-08',
        });
        const start = cal.element.querySelector('[data-ym="2026-03"]');
        const end = cal.element.querySelector('[data-ym="2026-08"]');
        const middle = cal.element.querySelector('[data-ym="2026-05"]');
        expect(start.classList.contains('mojo-calendar-cell-anchor-start')).toBe(true);
        expect(end.classList.contains('mojo-calendar-cell-anchor-end')).toBe(true);
        expect(middle.classList.contains('mojo-calendar-cell-in-range')).toBe(true);
      });
    });

    describe('year precision', () => {
      it('renders a 12-cell decade grid', async () => {
        const cal = await mountCalendar({ precision: 'year', value: '2026' });
        const cells = cal.element.querySelectorAll('[data-year]');
        expect(cells.length).toBe(12);
        const selected = cal.element.querySelector('.mojo-calendar-cell-selected');
        expect(selected.dataset.year).toBe('2026');
      });

      it('range at year precision', async () => {
        const cal = await mountCalendar({
          precision: 'year', mode: 'range',
          startValue: '2020', endValue: '2026',
        });
        expect(cal.element.querySelector('[data-year="2020"]').classList.contains('mojo-calendar-cell-anchor-start')).toBe(true);
        expect(cal.element.querySelector('[data-year="2026"]').classList.contains('mojo-calendar-cell-anchor-end')).toBe(true);
        expect(cal.element.querySelector('[data-year="2023"]').classList.contains('mojo-calendar-cell-in-range')).toBe(true);
      });
    });

    describe('PageUp / PageDown navigation', () => {
      it('PageDown advances one page', async () => {
        const cal = await mountCalendar({ precision: 'day', value: '2026-05-13' });
        const ev = new globalThis.window.KeyboardEvent('keydown', { key: 'PageDown', bubbles: true });
        cal.element.dispatchEvent(ev);
        expect(cal.pageM).toBe(6);
      });
      it('PageUp pages back one', async () => {
        const cal = await mountCalendar({ precision: 'day', value: '2026-05-13' });
        const ev = new globalThis.window.KeyboardEvent('keydown', { key: 'PageUp', bubbles: true });
        cal.element.dispatchEvent(ev);
        expect(cal.pageM).toBe(4);
      });
    });
  });
};
