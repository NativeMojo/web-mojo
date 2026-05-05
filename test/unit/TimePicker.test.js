/**
 * TimePicker unit tests
 */

const { testHelpers } = require('../utils/test-helpers');
const { loadModule } = require('../utils/simple-module-loader');

module.exports = async function (testContext) {
  const { describe, it, expect, beforeEach, afterEach } = testContext;

  await testHelpers.setup();
  const TimePicker = loadModule('TimePicker');

  describe('TimePicker', () => {
    beforeEach(() => {
      document.body.innerHTML = '<div id="host"></div>';
    });
    afterEach(() => {
      document.body.innerHTML = '';
    });

    async function mount(opts = {}) {
      const tp = new TimePicker(opts);
      document.getElementById('host').appendChild(tp.element);
      await tp.render();
      return tp;
    }

    it('parses initial 24h value and serializes back', async () => {
      const tp = await mount({ name: 't', value: '14:30' });
      expect(tp.currentTime).toEqual({ hours: 14, minutes: 30 });
      expect(tp.getValue()).toBe('14:30');
    });

    it('display format 12h shows AM/PM in trigger', async () => {
      const tp = await mount({ name: 't', value: '14:30', format: '12h' });
      const triggerText = tp.element.querySelector('[data-trigger-text]');
      expect(triggerText.textContent).toBe('2:30 PM');
      // storage stays 24h canonical
      expect(tp.getValue()).toBe('14:30');
    });

    it('hidden input mirrors current value', async () => {
      const tp = await mount({ name: 'meeting', value: '09:00' });
      const hidden = tp.element.querySelector('[data-hidden-value]');
      expect(hidden.name).toBe('meeting');
      expect(hidden.value).toBe('09:00');
      tp.setValue('17:30');
      expect(hidden.value).toBe('17:30');
    });

    it('clear empties the value and emits change', async () => {
      const tp = await mount({ name: 't', value: '14:30' });
      const handler = jest.fn();
      tp.on('change', handler);
      tp.clear();
      expect(tp.getValue()).toBe('');
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].oldValue).toBe('14:30');
    });

    it('setValue updates display and emits change', async () => {
      const tp = await mount({ name: 't' });
      const handler = jest.fn();
      tp.on('change', handler);
      tp.setValue('10:15');
      expect(tp.getValue()).toBe('10:15');
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].value).toBe('10:15');
    });

    it('timezone enabled defaults to ISO HH:MM±HH:MM string', async () => {
      const tp = await mount({
        name: 't',
        timezone: true,
        timezones: ['UTC'],
        value: '14:30 UTC',
      });
      expect(tp.timezone).toBe(true);
      // UTC offset is +00:00 — stable across DST
      expect(tp.getValue()).toBe('14:30+00:00');
    });

    it('timezone with outputFormat=iana keeps legacy IANA-string form', async () => {
      const tp = await mount({
        name: 't',
        timezone: true,
        timezones: ['UTC', 'America/New_York'],
        outputFormat: 'iana',
        value: '14:30 America/New_York',
      });
      expect(tp.getValue()).toBe('14:30 America/New_York');
    });

    it('timezone with outputFormat=object returns object with IANA name', async () => {
      const tp = await mount({
        name: 't',
        timezone: true,
        timezones: ['UTC', 'America/New_York'],
        outputFormat: 'object',
        value: '14:30 America/New_York',
      });
      expect(tp.getValue()).toEqual({
        time: '14:30',
        timezone: 'America/New_York',
      });
    });

    it('parses ISO time-with-offset values', async () => {
      const tp = await mount({
        name: 't',
        timezone: true,
        value: '14:30+00:00',
      });
      expect(tp.currentTime).toEqual({ hours: 14, minutes: 30 });
      expect(tp.currentTimezone).toBe('+00:00');
    });

    it('clamps to bounds', async () => {
      const tp = await mount({ name: 't', min: '09:00', max: '17:00', value: '06:00' });
      // value below min — _clampToBounds is exposed via setValue path, but
      // min is enforced when stepping/typing. Direct setValue keeps the input
      // value as parsed; bounds apply on stepper interaction.
      tp.currentTime = { hours: 6, minutes: 0 };
      const clamped = tp._clampToBounds({ hours: 6, minutes: 0 });
      expect(clamped).toEqual({ hours: 9, minutes: 0 });
      const clampedHigh = tp._clampToBounds({ hours: 20, minutes: 0 });
      expect(clampedHigh).toEqual({ hours: 17, minutes: 0 });
    });

    it('clear button is hidden when required', async () => {
      const tp = await mount({ name: 't', required: true, value: '09:00' });
      expect(tp.element.querySelector('[data-clear]')).toBeNull();
    });
  });
};
