/**
 * TablePage option-forwarding regression tests.
 *
 * TablePage builds `this.tableViewConfig` by mapping a whitelist of
 * known options from its constructor input. Anything not in that list
 * gets dropped silently — which is exactly the bug that landed during
 * the admin TablePages UX sweep: `dayRangeFilter` and `groupByDay`
 * were configured on every audit feed but TablePage's whitelist
 * didn't include them, so nothing happened at runtime.
 *
 * These tests lock down the forwarding for the options TableView
 * documents as supported, so a future refactor can't silently drop
 * them again.
 *
 * Strategy: instantiate a minimal TablePage with a fixture collection,
 * inspect the resulting `tableViewConfig` (the object passed to the
 * inner TableView). Don't mount, don't render — the constructor
 * itself does the option-mapping work.
 */

const { testHelpers } = require('../utils/test-helpers');
const { loadModule } = require('../utils/simple-module-loader');

module.exports = async function (testContext) {
  const { describe, it, expect } = testContext;

  await testHelpers.setup();

  const Collection = loadModule('Collection');
  const TablePage = loadModule('TablePage');

  function fixturePage(options = {}) {
    return new TablePage({
      pageName: 'fixture',
      collection: new Collection([]),
      columns: [{ key: 'id', label: 'ID' }],
      ...options
    });
  }

  describe('TablePage forwards day-range + grouping options to tableViewConfig', () => {
    it('forwards `dayRangeFilter: true`', () => {
      const page = fixturePage({ dayRangeFilter: true });
      expect(page.tableViewConfig.dayRangeFilter).toBe(true);
    });

    it('forwards `dayRangeFilter` object form', () => {
      const cfg = { field: 'last_seen', value: '30d' };
      const page = fixturePage({ dayRangeFilter: cfg });
      expect(page.tableViewConfig.dayRangeFilter).toEqual(cfg);
    });

    it('forwards `groupBy` (string field-name shorthand)', () => {
      const page = fixturePage({ groupBy: 'status' });
      expect(page.tableViewConfig.groupBy).toBe('status');
    });

    it('forwards `groupBy` (function form)', () => {
      const fn = (model) => model.get('status');
      const page = fixturePage({ groupBy: fn });
      expect(page.tableViewConfig.groupBy).toBe(fn);
    });

    it('forwards `groupHeaderTemplate`', () => {
      const tpl = '<th colspan="99">{{key}}</th>';
      const page = fixturePage({ groupHeaderTemplate: tpl });
      expect(page.tableViewConfig.groupHeaderTemplate).toBe(tpl);
    });

    it('forwards `groupHeaderLabel`', () => {
      const fn = (key) => key.toUpperCase();
      const page = fixturePage({ groupHeaderLabel: fn });
      expect(page.tableViewConfig.groupHeaderLabel).toBe(fn);
    });

    it('forwards `groupHeaderStyle`', () => {
      const page = fixturePage({ groupHeaderStyle: 'mark' });
      expect(page.tableViewConfig.groupHeaderStyle).toBe('mark');
    });

    it('forwards `groupByDay` spread (groupBy + groupHeaderLabel together)', () => {
      // Mimic `...groupByDay('created')` — the helper returns
      // `{ groupBy, groupHeaderLabel }`. Both halves must round-trip.
      const groupBy = () => '2026-05-10';
      const groupHeaderLabel = () => 'Today';
      const page = fixturePage({ groupBy, groupHeaderLabel });
      expect(page.tableViewConfig.groupBy).toBe(groupBy);
      expect(page.tableViewConfig.groupHeaderLabel).toBe(groupHeaderLabel);
    });

    it('omitting these options leaves them undefined (no defaults)', () => {
      const page = fixturePage();
      expect(page.tableViewConfig.dayRangeFilter).toBeUndefined();
      expect(page.tableViewConfig.groupBy).toBeUndefined();
      expect(page.tableViewConfig.groupHeaderTemplate).toBeUndefined();
      expect(page.tableViewConfig.groupHeaderLabel).toBeUndefined();
      expect(page.tableViewConfig.groupHeaderStyle).toBeUndefined();
    });
  });
};
