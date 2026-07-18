/**
 * TableView column chooser — WM-035 (`columnChooser:`)
 *
 * `columnChooser: true` adds an icon-only "Columns" toolbar dropdown whose
 * checkboxes show/hide columns. Visibility is VIEW STATE — the caller's
 * `columns` config array is never mutated. `hideable: false` columns are
 * locked (always shown). The hidden set + table/skeleton/colspan all respect
 * visibility, and the set persists via the shared persistState mechanism iff
 * that flag is also on.
 */

module.exports = async function (testContext) {
  const { describe, it, expect, beforeEach, afterEach } = testContext;
  const { testHelpers } = require('../utils/test-helpers');
  const { loadModule } = require('../utils/simple-module-loader');

  await testHelpers.setup();
  const jest = global.jest;

  const Collection = loadModule('Collection');
  const TableView = loadModule('TableView');

  // First column is locked (hideable:false).
  const COLUMNS = [
    { key: 'id', label: 'ID', hideable: false },
    { key: 'name', label: 'Name' },
    { key: 'level', label: 'Level' },
    { key: 'status', label: 'Status' }
  ];

  function seeded(n = 3) {
    const rows = [];
    for (let i = 1; i <= n; i++) rows.push({ id: i, name: `Row ${i}`, level: i, status: 'ok' });
    return new Collection(rows);
  }

  // Labels rendered in the actual table header (excludes the chooser dropdown).
  function headerTexts(tv) {
    return Array.from(tv.element.querySelectorAll('thead th'))
      .map((th) => th.textContent.replace(/\s+/g, ' ').trim());
  }

  // A minimal element stub for a toggle checkbox carrying a column key.
  const el = (key) => ({ getAttribute: () => key });

  function makeStorage() {
    const map = new Map();
    return {
      getItem: (k) => (map.has(k) ? map.get(k) : null),
      setItem: (k, v) => { map.set(k, String(v)); },
      removeItem: (k) => { map.delete(k); },
      clear: () => map.clear()
    };
  }

  let savedLSDescriptor;
  beforeEach(() => {
    savedLSDescriptor = Object.getOwnPropertyDescriptor(global, 'localStorage');
    Object.defineProperty(global, 'localStorage', {
      value: makeStorage(), configurable: true, writable: true
    });
  });
  afterEach(() => {
    if (savedLSDescriptor) Object.defineProperty(global, 'localStorage', savedLSDescriptor);
    else { try { delete global.localStorage; } catch (e) { /* ignore */ } }
  });

  // --------------------------------------------------------------
  describe('WM-035 columnChooser — renders only when enabled', () => {
    it('no dropdown / icon when columnChooser is off', async () => {
      const tv = new TableView({ collection: seeded(3), columns: COLUMNS });
      await tv.render();
      expect(tv.element.querySelector('.column-chooser-menu')).toBeNull();
      expect(tv.element.innerHTML).not.toContain('bi-layout-three-columns');
      expect(tv.element.innerHTML).not.toContain('column-chooser-item');
    });

    it('renders an icon-only Columns dropdown when enabled (label gated to xxl)', async () => {
      const tv = new TableView({ collection: seeded(3), columns: COLUMNS, columnChooser: true });
      await tv.render();

      const btn = tv.element.querySelector('button[title="Choose columns"]');
      expect(btn).not.toBeNull();
      expect(btn.querySelector('.bi-layout-three-columns')).not.toBeNull();
      // Icon-only: the text label only shows at xxl.
      expect(btn.querySelector('span').className).toContain('d-xxl-inline');

      const menu = tv.element.querySelector('.column-chooser-menu');
      expect(menu).not.toBeNull();
      expect(menu.querySelector('.dropdown-header').textContent).toContain('Show columns');
      // One row per column.
      expect(menu.querySelectorAll('.column-chooser-item').length).toBe(COLUMNS.length);
    });
  });

  // --------------------------------------------------------------
  describe('WM-035 columnChooser — locked (hideable:false) columns', () => {
    it('renders locked columns disabled + lock-marked and refuses to hide them', async () => {
      const tv = new TableView({ collection: seeded(3), columns: COLUMNS, columnChooser: true });
      await tv.render();

      const rows = Array.from(tv.element.querySelectorAll('.column-chooser-item'));
      const idRow = rows.find((r) => r.textContent.includes('ID'));
      expect(idRow.classList.contains('is-locked')).toBe(true);
      expect(idRow.querySelector('input').disabled).toBe(true);
      expect(idRow.querySelector('.bi-lock-fill')).not.toBeNull();
      // No toggle wiring on a locked row.
      expect(idRow.querySelector('[data-action="toggle-column"]')).toBeNull();

      // Even a direct toggle call can't hide a locked column.
      await tv.onActionToggleColumn({}, el('id'));
      expect(tv._hiddenColumns.has('id')).toBe(false);
      expect(headerTexts(tv).some((h) => h.includes('ID'))).toBe(true);
    });
  });

  // --------------------------------------------------------------
  describe('WM-035 columnChooser — hiding updates table / colspan / skeleton', () => {
    it('removes the column from header + rows, and shrinks colspan', async () => {
      const tv = new TableView({
        collection: seeded(3), columns: COLUMNS, columnChooser: true,
        actions: ['view'], rowExpand: (m) => `detail ${m.get('name')}`
      });
      await tv.render();

      const beforeHeaderCount = tv.element.querySelectorAll('thead th').length;
      // expand + 4 data + actions
      expect(tv._getRowExpandColspan()).toBe(1 + 4 + 1);

      await tv.onActionToggleColumn({}, el('status'));
      expect(tv._hiddenColumns.has('status')).toBe(true);

      // Header lost Status.
      expect(headerTexts(tv).some((h) => h.includes('Status'))).toBe(false);
      expect(tv.element.querySelectorAll('thead th').length).toBe(beforeHeaderCount - 1);

      // Rows lost the Status cell but kept the others.
      const row = tv.element.querySelector('tbody tr.table-row');
      expect(row.querySelector('[data-column="status"]')).toBeNull();
      expect(row.querySelector('[data-column="name"]')).not.toBeNull();

      // Colspan reflects the now-3 visible data columns.
      expect(tv._getRowExpandColspan()).toBe(1 + 3 + 1);
    });

    it('the skeleton mirrors the visible column count', async () => {
      const tv = new TableView({
        collection: seeded(3), columns: COLUMNS, columnChooser: true, loadingStyle: 'skeleton'
      });
      await tv.render();

      await tv.onActionToggleColumn({}, el('level'));
      expect(tv._hiddenColumns.has('level')).toBe(true);

      // Enter the loading state → skeleton table.
      tv.collection.emit('fetch:start');
      await tv.render();

      // 3 visible data columns; no leading/trailing cells here.
      const skelRow = tv.element.querySelector('.mojo-skeleton-row');
      expect(skelRow.querySelectorAll('td').length).toBe(3);
      // The skeleton header matches too.
      expect(tv.element.querySelectorAll('thead th').length).toBe(3);
    });
  });

  // --------------------------------------------------------------
  describe('WM-035 columnChooser — never mutates the caller columns array', () => {
    it('hiding is view-state only; the config array is untouched', async () => {
      const cols = [
        { key: 'id', label: 'ID', hideable: false },
        { key: 'name', label: 'Name' },
        { key: 'level', label: 'Level' }
      ];
      const tv = new TableView({ collection: seeded(2), columns: cols, columnChooser: true });
      await tv.render();

      await tv.onActionToggleColumn({}, el('level'));

      expect(cols.length).toBe(3);
      expect(cols.map((c) => c.key)).toEqual(['id', 'name', 'level']);
      expect(tv.columns).toBe(cols); // same reference, unmodified
      // The hidden state lives on the view, not the config.
      expect(tv._hiddenColumns.has('level')).toBe(true);
    });
  });

  // --------------------------------------------------------------
  describe('WM-035 columnChooser — reset restores defaults + clears storage', () => {
    it('Reset re-shows every column and removes the saved entry', async () => {
      const tv = new TableView({
        collection: seeded(2), columns: COLUMNS, columnChooser: true,
        persistState: true, persistKey: 'cc-reset'
      });
      await tv.render();

      await tv.onActionToggleColumn({}, el('level'));
      expect(tv._hiddenColumns.has('level')).toBe(true);
      expect(localStorage.getItem('mojo:tableview:cc-reset')).not.toBeNull();

      await tv.onActionColumnChooserReset({ preventDefault() {} }, null);
      expect(tv._hiddenColumns.size).toBe(0);
      expect(headerTexts(tv).some((h) => h.includes('Level'))).toBe(true);
      expect(localStorage.getItem('mojo:tableview:cc-reset')).toBeNull();
    });
  });

  // --------------------------------------------------------------
  describe('WM-035 columnChooser — persists hidden set iff persistState', () => {
    it('does NOT write storage when persistState is off', async () => {
      const setSpy = jest.spyOn(localStorage, 'setItem');
      const tv = new TableView({ collection: seeded(2), columns: COLUMNS, columnChooser: true });
      await tv.render();

      await tv.onActionToggleColumn({}, el('level'));
      expect(tv._hiddenColumns.has('level')).toBe(true);

      const wrote = setSpy.mock.calls.some((args) => String(args[0]).startsWith('mojo:tableview:'));
      expect(wrote).toBe(false);
      setSpy.mockRestore();
    });

    it('persists the hidden set and restores it on the next visit when persistState is on', async () => {
      const tv1 = new TableView({
        collection: new Collection([]), columns: COLUMNS, columnChooser: true,
        persistState: true, persistKey: 'cc-persist'
      });
      await tv1.render();
      await tv1.onActionToggleColumn({}, el('level'));

      const blob = JSON.parse(localStorage.getItem('mojo:tableview:cc-persist'));
      expect(blob.hidden).toContain('level');

      const tv2 = new TableView({
        collection: new Collection([]), columns: COLUMNS, columnChooser: true,
        persistState: true, persistKey: 'cc-persist'
      });
      await tv2.render();

      expect(tv2._hiddenColumns.has('level')).toBe(true);
      expect(headerTexts(tv2).some((h) => h.includes('Level'))).toBe(false);
    });

    it('persistHint footer shows only when persistState is on', async () => {
      const withPersist = new TableView({
        collection: seeded(1), columns: COLUMNS, columnChooser: true, persistState: true, persistKey: 'cc-hint'
      });
      await withPersist.render();
      expect(withPersist.element.querySelector('.column-chooser-persist')).not.toBeNull();

      const withoutPersist = new TableView({
        collection: seeded(1), columns: COLUMNS, columnChooser: true
      });
      await withoutPersist.render();
      expect(withoutPersist.element.querySelector('.column-chooser-persist')).toBeNull();
    });
  });
};
