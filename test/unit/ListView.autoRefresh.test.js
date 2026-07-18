/**
 * ListView / TableView auto-refresh — WM-034
 *
 * `autoRefresh: <seconds>` enables a guarded interval refetch of the
 * collection. Covered here:
 *   - option normalization + 5s minimum clamp
 *   - timer created only on mount and only when the option is set
 *   - tick issues collection.fetch() preserving current params
 *   - tick skips (without clearing) while blurred / selected
 *   - regaining focus fires an immediate refetch (resume)
 *   - teardown on unmount clears the timer + listeners
 *   - a detached (cached-page-exit) tick self-terminates — no leak
 *   - omitted option → no timer, no listeners
 *
 * There are no fake timers in this harness, so we drive `_autoRefreshTick()`
 * and the focus/blur listeners directly rather than waiting real seconds.
 */

module.exports = async function (testContext) {
  const { describe, it, expect, beforeEach, afterEach } = testContext;
  const { testHelpers } = require('../utils/test-helpers');
  const { loadModule } = require('../utils/simple-module-loader');

  await testHelpers.setup();
  // `jest` is installed as a global by testHelpers.setup().
  const jest = global.jest;

  const Collection = loadModule('Collection');
  const ListView = loadModule('ListView');
  const TableView = loadModule('TableView');

  const COLUMNS = [
    { key: 'name', label: 'Name' },
    { key: 'status', label: 'Status' }
  ];

  function seeded(n = 3) {
    const rows = [];
    for (let i = 1; i <= n; i++) rows.push({ id: i, name: `Row ${i}`, status: 'ok' });
    const c = new Collection(rows);
    c.restEnabled = true;         // pretend REST-backed so ticks call fetch()
    c.lastFetchTime = Date.now(); // suppress the onAfterMount auto-fetch (real REST)
    return c;
  }

  let host;
  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
  });
  afterEach(() => {
    if (host && host.parentNode) host.parentNode.removeChild(host);
  });

  // Mount a view INTO a connected host so isMounted() is true and
  // onAfterMount fires (which starts the timer).
  async function mountInto(view) {
    await view.render(true, host);
    return view;
  }

  // --------------------------------------------------------------
  describe('WM-034 option normalization + clamp', () => {
    it('a plain number of seconds becomes milliseconds', () => {
      const tv = new TableView({ collection: seeded(1), columns: COLUMNS, autoRefresh: 30 });
      expect(tv._autoRefreshMs).toBe(30000);
    });

    it('enforces a 5s minimum (2 → 5000ms)', () => {
      const tv = new TableView({ collection: seeded(1), columns: COLUMNS, autoRefresh: 2 });
      expect(tv._autoRefreshMs).toBe(5000);
    });

    it('non-number / ≤0 / absent disables the feature (0ms)', () => {
      expect(new TableView({ collection: seeded(1), columns: COLUMNS })._autoRefreshMs).toBe(0);
      expect(new TableView({ collection: seeded(1), columns: COLUMNS, autoRefresh: 0 })._autoRefreshMs).toBe(0);
      expect(new TableView({ collection: seeded(1), columns: COLUMNS, autoRefresh: -5 })._autoRefreshMs).toBe(0);
      expect(new TableView({ collection: seeded(1), columns: COLUMNS, autoRefresh: 'x' })._autoRefreshMs).toBe(0);
    });
  });

  // --------------------------------------------------------------
  describe('WM-034 timer lifecycle', () => {
    it('creates the interval on mount when autoRefresh is set', async () => {
      const tv = new TableView({ collection: seeded(2), columns: COLUMNS, autoRefresh: 10 });
      expect(tv._autoRefreshTimer).toBeNull(); // not started before mount
      await mountInto(tv);
      expect(tv._autoRefreshTimer).not.toBeNull();
      expect(tv._autoRefreshHandlers).not.toBeNull();
      await tv.destroy();
    });

    it('omitted option → no timer, no listeners after mount', async () => {
      const tv = new TableView({ collection: seeded(2), columns: COLUMNS });
      await mountInto(tv);
      expect(tv._autoRefreshTimer).toBeNull();
      expect(tv._autoRefreshHandlers).toBeNull();
      await tv.destroy();
    });

    it('unmount tears down the timer + listeners', async () => {
      const tv = new TableView({ collection: seeded(2), columns: COLUMNS, autoRefresh: 10 });
      await mountInto(tv);
      expect(tv._autoRefreshTimer).not.toBeNull();
      await tv.unmount();
      expect(tv._autoRefreshTimer).toBeNull();
      expect(tv._autoRefreshHandlers).toBeNull();
    });

    it('re-mount does not stack a second interval (single-timer guarantee)', async () => {
      const tv = new TableView({ collection: seeded(2), columns: COLUMNS, autoRefresh: 10 });
      await mountInto(tv);
      const first = tv._autoRefreshTimer;
      // Simulate a cached-page re-entry: onAfterMount fires again while the
      // timer is still live. It must be a no-op (same timer id).
      await tv.onAfterMount();
      expect(tv._autoRefreshTimer).toBe(first);
      await tv.destroy();
    });
  });

  // --------------------------------------------------------------
  describe('WM-034 tick behavior', () => {
    it('fetches on tick, preserving current params', async () => {
      const collection = seeded(2);
      collection.params = { start: 0, size: 25, status: 'error', sort: '-created' };
      const tv = new TableView({ collection, columns: COLUMNS, autoRefresh: 10 });
      await mountInto(tv);

      const snapshot = JSON.parse(JSON.stringify(collection.params));
      const fetchSpy = jest.spyOn(collection, 'fetch').mockResolvedValue({ data: { data: [] } });

      tv._autoRefreshTick();
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      // Silent refetch — params must be untouched (no reset of filters/sort/paging).
      expect(collection.params).toEqual(snapshot);

      await tv.destroy();
    });

    it('does not fetch when the collection is not REST-backed', async () => {
      const collection = new Collection([{ id: 1, name: 'A', status: 'ok' }]);
      collection.restEnabled = false;
      collection.lastFetchTime = Date.now();
      const tv = new TableView({ collection, columns: COLUMNS, autoRefresh: 10 });
      await mountInto(tv);
      const fetchSpy = jest.spyOn(collection, 'fetch').mockResolvedValue({});
      tv._autoRefreshTick();
      expect(fetchSpy).not.toHaveBeenCalled();
      await tv.destroy();
    });
  });

  // --------------------------------------------------------------
  describe('WM-034 pause conditions', () => {
    it('skips the tick while the window is blurred, resumes with an immediate refetch on focus', async () => {
      const collection = seeded(2);
      const tv = new TableView({ collection, columns: COLUMNS, autoRefresh: 10 });
      await mountInto(tv);
      const fetchSpy = jest.spyOn(collection, 'fetch').mockResolvedValue({});

      // Blur → paused → tick is a no-op.
      window.dispatchEvent(new window.Event('blur'));
      expect(tv._autoRefreshPaused).toBe(true);
      tv._autoRefreshTick();
      expect(fetchSpy).not.toHaveBeenCalled();

      // Focus → un-paused + an immediate refetch (resume).
      window.dispatchEvent(new window.Event('focus'));
      expect(tv._autoRefreshPaused).toBe(false);
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      await tv.destroy();
    });

    it('skips the tick while a selection is active', async () => {
      const collection = seeded(3);
      const tv = new TableView({ collection, columns: COLUMNS, autoRefresh: 10, selectable: true });
      await mountInto(tv);
      const fetchSpy = jest.spyOn(collection, 'fetch').mockResolvedValue({});

      tv.selectedItems.add(1); // active batch-action selection
      tv._autoRefreshTick();
      expect(fetchSpy).not.toHaveBeenCalled();

      // Clearing the selection lets the next tick through.
      tv.selectedItems.clear();
      tv._autoRefreshTick();
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      await tv.destroy();
    });

    it('skips the tick while a TableRow inline cell edit is active', async () => {
      const collection = seeded(2);
      const tv = new TableView({ collection, columns: COLUMNS, autoRefresh: 10 });
      await mountInto(tv);
      const fetchSpy = jest.spyOn(collection, 'fetch').mockResolvedValue({});

      const row = tv.itemViews.get(1);
      expect(row).toBeDefined();
      row.editingCells.add('name'); // simulate an open inline editor
      tv._autoRefreshTick();
      expect(fetchSpy).not.toHaveBeenCalled();

      row.editingCells.clear();
      tv._autoRefreshTick();
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      await tv.destroy();
    });
  });

  // --------------------------------------------------------------
  describe('WM-034 no leaked timers across cached-page revisits', () => {
    it('a tick on a detached view self-terminates the timer', async () => {
      const collection = seeded(2);
      const tv = new TableView({ collection, columns: COLUMNS, autoRefresh: 10 });
      await mountInto(tv);
      expect(tv._autoRefreshTimer).not.toBeNull();
      const fetchSpy = jest.spyOn(collection, 'fetch').mockResolvedValue({});

      // Simulate a cached Page exit: the child element is detached but the
      // child never received an unmount hook (parent only unbinds events).
      tv.element.remove();
      expect(tv.isMounted()).toBeFalsy();

      tv._autoRefreshTick();
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(tv._autoRefreshTimer).toBeNull();     // self-terminated
      expect(tv._autoRefreshHandlers).toBeNull();  // listeners removed too
    });
  });

  // --------------------------------------------------------------
  describe('WM-034 ListView (non-table) parity', () => {
    it('starts / tears down the timer around mount + unmount', async () => {
      const listView = new ListView({
        collection: seeded(2),
        itemTemplate: '<div>{{model.name}}</div>',
        autoRefresh: 15
      });
      await mountInto(listView);
      expect(listView._autoRefreshMs).toBe(15000);
      expect(listView._autoRefreshTimer).not.toBeNull();
      await listView.unmount();
      expect(listView._autoRefreshTimer).toBeNull();
    });
  });
};
