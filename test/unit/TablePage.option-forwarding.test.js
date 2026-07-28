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

    it('forwards `rowStripe` callback', () => {
      const fn = (model) => (model.get('level') >= 5 ? 'danger' : null);
      const page = fixturePage({ rowStripe: fn });
      expect(page.tableViewConfig.rowStripe).toBe(fn);
    });

    it('forwards `filterPresets`', () => {
      const presets = [{ key: 'errors', label: 'Errors', params: { level__gte: 4 } }];
      const page = fixturePage({ filterPresets: presets });
      expect(page.tableViewConfig.filterPresets).toBe(presets);
    });

    it('forwards `rowExpand` + `rowExpandMultiple`', () => {
      const fn = (model) => `<div>${model.get('id')}</div>`;
      const page = fixturePage({ rowExpand: fn, rowExpandMultiple: true });
      expect(page.tableViewConfig.rowExpand).toBe(fn);
      expect(page.tableViewConfig.rowExpandMultiple).toBe(true);
    });

    it('forwards `emptyState`', () => {
      const es = { icon: 'inbox', title: 'None' };
      expect(fixturePage({ emptyState: es }).tableViewConfig.emptyState).toBe(es);
    });

    it('forwards `loadingStyle`', () => {
      expect(fixturePage({ loadingStyle: 'skeleton' }).tableViewConfig.loadingStyle).toBe('skeleton');
    });

    it('forwards `showResultCount`', () => {
      expect(fixturePage({ showResultCount: true }).tableViewConfig.showResultCount).toBe(true);
    });

    it('forwards `autoRefresh`', () => {
      expect(fixturePage({ autoRefresh: 30 }).tableViewConfig.autoRefresh).toBe(30);
      // #297 — the object form rides the SAME key and must pass through by
      // reference: TablePage neither normalizes nor clones it, so `mode`,
      // `flash` and `indicator` reach ListView untouched.
      const cfg = { every: 30, mode: 'models', flash: false, indicator: false };
      expect(fixturePage({ autoRefresh: cfg }).tableViewConfig.autoRefresh).toBe(cfg);
    });

    it('forwards `persistState` + `persistKey`', () => {
      const page = fixturePage({ persistState: true, persistKey: 'k' });
      expect(page.tableViewConfig.persistState).toBe(true);
      expect(page.tableViewConfig.persistKey).toBe('k');
    });

    it('forwards `columnChooser`', () => {
      expect(fixturePage({ columnChooser: true }).tableViewConfig.columnChooser).toBe(true);
    });

    it('omitting these options leaves them undefined (no defaults)', () => {
      const page = fixturePage();
      expect(page.tableViewConfig.dayRangeFilter).toBeUndefined();
      expect(page.tableViewConfig.groupBy).toBeUndefined();
      expect(page.tableViewConfig.groupHeaderTemplate).toBeUndefined();
      expect(page.tableViewConfig.groupHeaderLabel).toBeUndefined();
      expect(page.tableViewConfig.groupHeaderStyle).toBeUndefined();
      expect(page.tableViewConfig.rowStripe).toBeUndefined();
      expect(page.tableViewConfig.filterPresets).toBeUndefined();
      expect(page.tableViewConfig.rowExpand).toBeUndefined();
      expect(page.tableViewConfig.rowExpandMultiple).toBeUndefined();
      expect(page.tableViewConfig.emptyState).toBeUndefined();
      expect(page.tableViewConfig.loadingStyle).toBeUndefined();
      expect(page.tableViewConfig.showResultCount).toBeUndefined();
      expect(page.tableViewConfig.autoRefresh).toBeUndefined();
      expect(page.tableViewConfig.persistState).toBeUndefined();
      expect(page.tableViewConfig.persistKey).toBeUndefined();
      expect(page.tableViewConfig.columnChooser).toBeUndefined();
      expect(page.tableViewConfig.toolbarButtons).toBeUndefined();
      expect(page.tableViewConfig.toolbarRight).toBeUndefined();
    });

    // ListView has always supported `toolbarButtons`, but TablePage did not
    // forward it, so passing it to a TablePage silently did nothing — and
    // assigning to `page.tableView.toolbarButtons` after construction does not
    // work either, because the action bar is painted once and later renders do
    // not repaint it. Forwarded so the documented option behaves the same on a
    // TablePage as on a bare TableView (#394).
    it('forwards `toolbarButtons`', () => {
      const buttons = [{ label: 'Buy a domain', action: 'buy-domain', permissions: ['manage_dns'] }];
      const page = fixturePage({ toolbarButtons: buttons });
      expect(page.tableViewConfig.toolbarButtons).toBe(buttons);
    });

    it('forwards `toolbarButtons` with their permission gates intact', () => {
      const page = fixturePage({
        toolbarButtons: [{ label: 'Adopt', action: 'adopt', permissions: ['manage_dns', 'security'] }]
      });
      expect(page.tableViewConfig.toolbarButtons[0].permissions).toEqual(['manage_dns', 'security']);
    });

    it('forwards `toolbarRight`', () => {
      const view = { fake: 'view' };
      const page = fixturePage({ toolbarRight: view });
      expect(page.tableViewConfig.toolbarRight).toBe(view);
    });
  });
};
