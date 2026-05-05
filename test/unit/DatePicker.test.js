/**
 * DatePicker unit tests
 */

const { testHelpers } = require('../utils/test-helpers');
const { loadModule } = require('../utils/simple-module-loader');

module.exports = async function (testContext) {
  const { describe, it, expect, beforeEach, afterEach } = testContext;

  await testHelpers.setup();
  const DatePicker = loadModule('DatePicker');
  const dateFns = loadModule('dateFns');
  const { _setFrozenToday } = dateFns;

  describe('DatePicker', () => {
    beforeEach(() => {
      _setFrozenToday({ y: 2026, m: 5, d: 4 });
      document.body.innerHTML = '<div id="host"></div>';
    });
    afterEach(() => {
      _setFrozenToday(null);
      document.body.innerHTML = '';
    });

    async function mountPicker(opts = {}) {
      const dp = new DatePicker(opts);
      document.getElementById('host').appendChild(dp.element);
      await dp.render();
      return dp;
    }

    it('default precision is day, formats display value', async () => {
      const dp = await mountPicker({ name: 'birth_date', value: '2026-05-04' });
      expect(dp.precision).toBe('day');
      const trigger = dp.element.querySelector('[data-trigger-text]');
      expect(trigger.textContent).toBe('May 04, 2026');
    });

    it('precision=month formats and stores YYYY-MM', async () => {
      const dp = await mountPicker({ name: 'period', precision: 'month', value: '2026-05' });
      expect(dp.getValue()).toBe('2026-05');
      expect(dp.element.querySelector('[data-trigger-text]').textContent).toBe('May 2026');
    });

    it('precision=year formats and stores YYYY', async () => {
      const dp = await mountPicker({ name: 'fiscal', precision: 'year', value: '2026' });
      expect(dp.getValue()).toBe('2026');
      expect(dp.element.querySelector('[data-trigger-text]').textContent).toBe('2026');
    });

    it('clear button empties the value', async () => {
      const dp = await mountPicker({ name: 'd', value: '2026-05-04' });
      const clear = dp.element.querySelector('[data-clear]');
      clear.click();
      expect(dp.getValue()).toBe('');
    });

    it('emits change event with value + formatted', async () => {
      const dp = await mountPicker({ name: 'd' });
      const handler = jest.fn();
      dp.on('change', handler);
      dp.setValue('2026-05-13');
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].value).toBe('2026-05-13');
      expect(handler.mock.calls[0][0].formatted).toBe('May 13, 2026');
    });

    it('hidden input mirrors current value', async () => {
      const dp = await mountPicker({ name: 'event_date', value: '2026-05-04' });
      const hidden = dp.element.querySelector('[data-hidden-value]');
      expect(hidden.name).toBe('event_date');
      expect(hidden.value).toBe('2026-05-04');
      dp.setValue('2026-05-13');
      expect(hidden.value).toBe('2026-05-13');
    });

    it('inline mode renders the calendar without a trigger', async () => {
      const dp = await mountPicker({ name: 'd', inline: true, value: '2026-05-13' });
      expect(dp.element.querySelector('[data-trigger]')).toBeNull();
      expect(dp.element.querySelector('[data-cal-host]')).not.toBeNull();
      expect(dp.element.querySelector('.mojo-calendar')).not.toBeNull();
    });

    it('FormBuilder integration: getFormValue / setFormValue', async () => {
      const dp = await mountPicker({ name: 'd' });
      await dp.setFormValue('2026-05-13');
      expect(dp.getFormValue()).toBe('2026-05-13');
    });
  });
};
