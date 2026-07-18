/**
 * TableView / ListView view persistence — WM-035 (`persistState:`)
 *
 * `persistState: true` remembers a table's view — sort, page size, day-range
 * value, and active filter params — in localStorage under a stable identity
 * (`persistKey`, else `<route>::<endpoint>`). Restored on the next visit with
 * precedence URL > saved > configured defaults. Strictly opt-in: the storage
 * layer is touched ONLY when the flag is set. The blob is versioned (`{v:1}`);
 * corrupt / stale entries are discarded silently.
 *
 * The runner executes test FILES sequentially, so swapping `global.localStorage`
 * in beforeEach/afterEach is safe (see testing.md).
 */

module.exports = async function (testContext) {
  const { describe, it, expect, beforeEach, afterEach } = testContext;
  const { testHelpers } = require('../utils/test-helpers');
  const { loadModule } = require('../utils/simple-module-loader');

  await testHelpers.setup();
  const jest = global.jest;

  const Collection = loadModule('Collection');
  const TableView = loadModule('TableView');

  const COLUMNS = [
    { key: 'name', label: 'Name' },
    { key: 'level', label: 'Level' },
    { key: 'status', label: 'Status' }
  ];

  // In-memory localStorage stub (mirrors the TokenManager.test pattern).
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
    if (savedLSDescriptor) {
      Object.defineProperty(global, 'localStorage', savedLSDescriptor);
    } else {
      try { delete global.localStorage; } catch (e) { /* ignore */ }
    }
  });

  // --------------------------------------------------------------
  describe('WM-035 persistState — save / restore round-trip', () => {
    it('saves sort/size/filters (incl field__in and dr_* triplets) and restores them verbatim', async () => {
      const key = 'mojo:tableview:rt-1';

      const c1 = new Collection([]);
      const tv1 = new TableView({ collection: c1, columns: COLUMNS, persistState: true, persistKey: 'rt-1' });
      await tv1.render();

      // Simulate a user having applied sort + size + a full raw filter set,
      // including a collapsed `__in` key and a daterange triplet.
      c1.params = {
        start: 20, size: 25, sort: '-created',
        level__in: '3,4',
        dr_field: 'created', dr_start: '2026-01-01', dr_end: '2026-02-01',
        status: 'open'
      };
      tv1.emit('params-changed'); // fires the save listener

      const blob = JSON.parse(localStorage.getItem(key));
      expect(blob.v).toBe(1);
      expect(blob.sort).toBe('-created');
      expect(blob.size).toBe(25);
      // start (page position) is intentionally NOT persisted.
      expect(blob.filters.start).toBeUndefined();
      // field__in + dr_* round-trip verbatim (preset matching depends on it).
      expect(blob.filters.level__in).toBe('3,4');
      expect(blob.filters.dr_field).toBe('created');
      expect(blob.filters.dr_start).toBe('2026-01-01');
      expect(blob.filters.dr_end).toBe('2026-02-01');
      expect(blob.filters.status).toBe('open');

      // A fresh table with the same key rehydrates the params before first fetch.
      const c2 = new Collection([]);
      const tv2 = new TableView({ collection: c2, columns: COLUMNS, persistState: true, persistKey: 'rt-1' });
      await tv2.render();

      expect(c2.params.sort).toBe('-created');
      expect(c2.params.size).toBe(25);
      expect(c2.params.level__in).toBe('3,4');
      expect(c2.params.dr_field).toBe('created');
      expect(c2.params.dr_start).toBe('2026-01-01');
      expect(c2.params.dr_end).toBe('2026-02-01');
      expect(c2.params.status).toBe('open');
      // start is not restored (never saved).
      expect(c2.params.start).toBe(0);
    });

    it('round-trips the day-range selection as a value, re-seeded to a fresh epoch', async () => {
      const c1 = new Collection([]);
      const tv1 = new TableView({
        collection: c1, columns: COLUMNS, persistState: true, persistKey: 'dr-1', dayRangeFilter: true
      });
      await tv1.render();

      tv1.setRange('30d'); // → params-changed → save

      const blob = JSON.parse(localStorage.getItem('mojo:tableview:dr-1'));
      expect(blob.dayRange).toBe('30d');
      // The derived `created__gte` is NOT stored as a filter (re-seeded on restore).
      expect(blob.filters && blob.filters.created__gte).toBeUndefined();

      const c2 = new Collection([]);
      const tv2 = new TableView({
        collection: c2, columns: COLUMNS, persistState: true, persistKey: 'dr-1', dayRangeFilter: true
      });
      await tv2.render();

      expect(tv2.getRange()).toBe('30d');
      expect(c2.params.created__gte).toBeDefined(); // reseeded fresh from the value
    });
  });

  // --------------------------------------------------------------
  describe('WM-035 persistState — precedence URL > saved', () => {
    it('does not override params the incoming query already set (sort + filter)', async () => {
      localStorage.setItem('mojo:tableview:url-1', JSON.stringify({
        v: 1, sort: '-created', size: 25, filters: { status: 'open' }
      }));

      // Collection arrives with URL params already applied (TablePage flow).
      const c = new Collection([]);
      c.params = { sort: 'name', status: 'closed' }; // URL said name + closed
      const tv = new TableView({ collection: c, columns: COLUMNS, persistState: true, persistKey: 'url-1' });
      await tv.render();

      expect(c.params.sort).toBe('name');     // URL wins over saved '-created'
      expect(c.params.status).toBe('closed'); // URL wins over saved 'open'
      expect(c.params.size).toBe(25);         // saved fills the slot the query didn't
    });
  });

  // --------------------------------------------------------------
  describe('WM-035 persistState — key scheme', () => {
    it('falls back to <route>::<endpoint> when persistKey is omitted', async () => {
      const c = new Collection([]);
      c.endpoint = '/api/events';
      const tv = new TableView({ collection: c, columns: COLUMNS, persistState: true });
      await tv.render();

      expect(tv._persistStorageKey()).toBe(`mojo:tableview:${window.location.pathname}::/api/events`);
    });

    it('uses the explicit persistKey when provided', async () => {
      const tv = new TableView({ collection: new Collection([]), columns: COLUMNS, persistState: true, persistKey: 'my-key' });
      await tv.render();
      expect(tv._persistStorageKey()).toBe('mojo:tableview:my-key');
    });
  });

  // --------------------------------------------------------------
  describe('WM-035 persistState — versioned schema discard', () => {
    it('discards an unparseable entry and restores nothing', async () => {
      localStorage.setItem('mojo:tableview:corrupt', '{ not valid json');
      const c = new Collection([]);
      const tv = new TableView({ collection: c, columns: COLUMNS, persistState: true, persistKey: 'corrupt' });
      await tv.render();

      expect(c.params.sort).toBeUndefined();
      expect(localStorage.getItem('mojo:tableview:corrupt')).toBeNull(); // cleared
    });

    it('discards a wrong-version entry', async () => {
      localStorage.setItem('mojo:tableview:v99', JSON.stringify({ v: 99, sort: '-created' }));
      const c = new Collection([]);
      const tv = new TableView({ collection: c, columns: COLUMNS, persistState: true, persistKey: 'v99' });
      await tv.render();

      expect(c.params.sort).toBeUndefined();
      expect(localStorage.getItem('mojo:tableview:v99')).toBeNull();
    });
  });

  // --------------------------------------------------------------
  describe('WM-035 persistState — opt-out guarantee (no storage access)', () => {
    it('touches no persistence storage when persistState is off', async () => {
      const getSpy = jest.spyOn(localStorage, 'getItem');
      const setSpy = jest.spyOn(localStorage, 'setItem');

      const tv = new TableView({
        collection: new Collection([{ id: 1, name: 'a', level: 1, status: 'ok' }]),
        columns: COLUMNS
      });
      await tv.render();
      tv.emit('params-changed'); // no listener attached → no save

      const touched = (spy) => spy.mock.calls.some((args) => String(args[0]).startsWith('mojo:tableview:'));
      expect(touched(getSpy)).toBe(false);
      expect(touched(setSpy)).toBe(false);

      getSpy.mockRestore();
      setSpy.mockRestore();
    });
  });

  // --------------------------------------------------------------
  describe('WM-035 persistState — clearPersistedState()', () => {
    it('removes the saved entry', async () => {
      localStorage.setItem('mojo:tableview:clr', JSON.stringify({ v: 1, sort: '-created' }));
      const c = new Collection([]);
      const tv = new TableView({ collection: c, columns: COLUMNS, persistState: true, persistKey: 'clr' });
      await tv.render();
      expect(c.params.sort).toBe('-created'); // restored

      tv.clearPersistedState();
      expect(localStorage.getItem('mojo:tableview:clr')).toBeNull();
    });
  });
};
