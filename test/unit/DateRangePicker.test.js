/**
 * DateRangePicker unit tests
 */

const { testHelpers } = require('../utils/test-helpers');
const { loadModule } = require('../utils/simple-module-loader');

module.exports = async function (testContext) {
  const { describe, it, expect, beforeEach, afterEach } = testContext;

  await testHelpers.setup();
  const DateRangePicker = loadModule('DateRangePicker');
  const dateFns = loadModule('dateFns');
  const { _setFrozenToday } = dateFns;

  describe('DateRangePicker', () => {
    beforeEach(() => {
      _setFrozenToday({ y: 2026, m: 5, d: 4 });
      document.body.innerHTML = '<div id="host"></div>';
    });
    afterEach(() => {
      _setFrozenToday(null);
      document.body.innerHTML = '';
    });

    async function mountPicker(opts = {}) {
      const dp = new DateRangePicker(opts);
      document.getElementById('host').appendChild(dp.element);
      await dp.render();
      return dp;
    }

    it('renders an existing day-precision range in the trigger', async () => {
      const dp = await mountPicker({ name: 'r', startDate: '2026-05-06', endDate: '2026-05-22' });
      const trigger = dp.element.querySelector('[data-trigger-text]');
      expect(trigger.textContent).toBe('May 06, 2026 – May 22, 2026');
    });

    it('writes start/end hidden inputs with derived field names', async () => {
      const dp = await mountPicker({ name: 'period', startDate: '2026-05-06', endDate: '2026-05-22' });
      const start = dp.element.querySelector('[data-start-value]');
      const end = dp.element.querySelector('[data-end-value]');
      expect(start.name).toBe('period_start');
      expect(end.name).toBe('period_end');
      expect(start.value).toBe('2026-05-06');
      expect(end.value).toBe('2026-05-22');
    });

    it('accepts explicit startName / endName', async () => {
      const dp = await mountPicker({
        name: 'period',
        startName: 'created_after',
        endName: 'created_before',
        startDate: '2026-05-06', endDate: '2026-05-22',
      });
      expect(dp.element.querySelector('[name="created_after"]').value).toBe('2026-05-06');
      expect(dp.element.querySelector('[name="created_before"]').value).toBe('2026-05-22');
    });

    it('precision=month formats range as YYYY-MM', async () => {
      const dp = await mountPicker({
        name: 'period', precision: 'month',
        startDate: '2026-03', endDate: '2026-08',
      });
      expect(dp.getStartDate()).toBe('2026-03');
      expect(dp.getEndDate()).toBe('2026-08');
      expect(dp.element.querySelector('[data-trigger-text]').textContent).toBe('Mar 2026 – Aug 2026');
    });

    it('precision=year formats range as YYYY', async () => {
      const dp = await mountPicker({
        name: 'period', precision: 'year',
        startDate: '2020', endDate: '2026',
      });
      expect(dp.getStartDate()).toBe('2020');
      expect(dp.getEndDate()).toBe('2026');
      expect(dp.element.querySelector('[data-trigger-text]').textContent).toBe('2020 – 2026');
    });

    it('emits change with combined value and formatted text', async () => {
      const dp = await mountPicker({ name: 'r' });
      const handler = jest.fn();
      dp.on('change', handler);
      dp.setRange('2026-05-06', '2026-05-22');
      expect(handler).toHaveBeenCalledTimes(1);
      const args = handler.mock.calls[0][0];
      expect(args.startDate).toBe('2026-05-06');
      expect(args.endDate).toBe('2026-05-22');
      expect(args.formatted).toBe('May 06, 2026 – May 22, 2026');
    });

    it('clear empties both start and end', async () => {
      const dp = await mountPicker({ name: 'r', startDate: '2026-05-06', endDate: '2026-05-22' });
      dp.element.querySelector('[data-clear]').click();
      expect(dp.getStartDate()).toBe('');
      expect(dp.getEndDate()).toBe('');
    });

    it('outputFormat=string returns combined string', async () => {
      const dp = await mountPicker({
        name: 'r', outputFormat: 'string',
        startDate: '2026-05-06', endDate: '2026-05-22',
      });
      expect(dp.getCombinedValue()).toBe('2026-05-06 – 2026-05-22');
    });

    it('months default to 2 for day precision, 1 for month/year', async () => {
      const dpDay = await mountPicker({ name: 'd' });
      const dpMonth = await mountPicker({ name: 'm', precision: 'month' });
      const dpYear = await mountPicker({ name: 'y', precision: 'year' });
      expect(dpDay.months).toBe(2);
      expect(dpMonth.months).toBe(1);
      expect(dpYear.months).toBe(1);
    });

    it('FormBuilder integration: setFormValue accepts {start,end} object', async () => {
      const dp = await mountPicker({ name: 'r' });
      await dp.setFormValue({ start: '2026-05-06', end: '2026-05-22' });
      expect(dp.getStartDate()).toBe('2026-05-06');
      expect(dp.getEndDate()).toBe('2026-05-22');
    });
  });
};
