/**
 * DateTimePicker unit tests
 */

const { testHelpers } = require('../utils/test-helpers');
const { loadModule } = require('../utils/simple-module-loader');

module.exports = async function (testContext) {
  const { describe, it, expect, beforeEach, afterEach } = testContext;

  await testHelpers.setup();
  const DateTimePicker = loadModule('DateTimePicker');
  const dateFns = loadModule('dateFns');
  const { _setFrozenToday } = dateFns;

  describe('DateTimePicker', () => {
    beforeEach(() => {
      _setFrozenToday({ y: 2026, m: 5, d: 4 });
      document.body.innerHTML = '<div id="host"></div>';
    });
    afterEach(() => {
      _setFrozenToday(null);
      document.body.innerHTML = '';
    });

    async function mount(opts = {}) {
      const dtp = new DateTimePicker(opts);
      document.getElementById('host').appendChild(dtp.element);
      await dtp.render();
      return dtp;
    }

    it('parses string value into date + time', async () => {
      const dtp = await mount({ name: 'dt', value: '2026-05-04 14:30' });
      expect(dtp.currentDate).toEqual({ y: 2026, m: 5, d: 4 });
      expect(dtp.currentTime).toEqual({ hours: 14, minutes: 30 });
      // Default outputFormat is 'iso' — without timezone, no offset suffix
      expect(dtp.getValue()).toBe('2026-05-04T14:30:00');
    });

    it('parses ISO string with offset', async () => {
      const dtp = await mount({ name: 'dt', value: '2026-05-04T14:30:00-07:00', timezone: true });
      expect(dtp.currentDate).toEqual({ y: 2026, m: 5, d: 4 });
      expect(dtp.currentTime).toEqual({ hours: 14, minutes: 30 });
      // IANA-name unknown — round-tripped via offset string
      expect(dtp.currentTimezone).toBe('-07:00');
    });

    it('display text uses displayFormat + timeFormat', async () => {
      const dtp = await mount({
        name: 'dt',
        value: '2026-05-04 14:30',
        displayFormat: 'MMM D, YYYY',
        timeFormat: '12h',
      });
      const triggerText = dtp.element.querySelector('[data-trigger-text]');
      expect(triggerText.textContent).toBe('May 4, 2026 2:30 PM');
    });

    it('storage is canonical 24h regardless of timeFormat', async () => {
      const dtp = await mount({
        name: 'dt',
        value: '2026-05-04 14:30',
        timeFormat: '12h',
      });
      expect(dtp.getValue()).toBe('2026-05-04T14:30:00');
    });

    it('hidden input mirrors serialized value (ISO default)', async () => {
      const dtp = await mount({ name: 'event', value: '2026-05-04 09:00' });
      const hidden = dtp.element.querySelector('[data-hidden-value]');
      expect(hidden.name).toBe('event');
      expect(hidden.value).toBe('2026-05-04T09:00:00');
    });

    it('setValue updates date + time and emits change', async () => {
      const dtp = await mount({ name: 'dt' });
      const handler = jest.fn();
      dtp.on('change', handler);
      dtp.setValue('2026-06-15 10:30');
      expect(dtp.getValue()).toBe('2026-06-15T10:30:00');
      expect(handler).toHaveBeenCalled();
    });

    it('clear empties both date and time', async () => {
      const dtp = await mount({ name: 'dt', value: '2026-05-04 14:30' });
      dtp.clear();
      expect(dtp.getValue()).toBe('');
      expect(dtp.currentDate).toBeNull();
      expect(dtp.currentTime).toBeNull();
    });

    it('object outputFormat returns { date, time }', async () => {
      const dtp = await mount({
        name: 'dt',
        value: '2026-05-04 14:30',
        outputFormat: 'object',
      });
      expect(dtp.getValue()).toEqual({
        date: '2026-05-04',
        time: '14:30',
      });
    });

    it('timezone enabled defaults to ISO 8601 with offset', async () => {
      const dtp = await mount({
        name: 'dt',
        timezone: true,
        timezones: ['UTC'],
        value: '2026-05-04 14:30 UTC',
      });
      // UTC offset is stable — no DST, always +00:00
      expect(dtp.getValue()).toBe('2026-05-04T14:30:00+00:00');
    });

    it('outputFormat=iana keeps legacy IANA-name string form', async () => {
      const dtp = await mount({
        name: 'dt',
        timezone: true,
        timezones: ['UTC', 'America/New_York'],
        outputFormat: 'iana',
        value: '2026-05-04 14:30 America/New_York',
      });
      expect(dtp.getValue()).toBe('2026-05-04 14:30 America/New_York');
    });

    it('object outputFormat with timezone includes timezone field', async () => {
      const dtp = await mount({
        name: 'dt',
        timezone: true,
        timezones: ['UTC', 'America/New_York'],
        outputFormat: 'object',
        value: '2026-05-04 14:30 America/New_York',
      });
      expect(dtp.getValue()).toEqual({
        date: '2026-05-04',
        time: '14:30',
        timezone: 'America/New_York',
      });
    });
  });
};
