/**
 * ListView / TableView auto-refresh `mode: 'models'` — #297
 *
 * The object form of `autoRefresh` (`{ every, mode, indicator, flash }`) plus
 * the models-mode tick, which refreshes only the rows already on screen via
 * `collection.refreshModels()` and flashes the ones whose data changed.
 *
 * Covered here:
 *   - object-form normalization (`every` in seconds, 5s floor, mode default)
 *   - a models tick calls refreshModels — never collection.fetch()
 *   - no loading flip, no itemView rebuild (the point of the mode)
 *   - changed rows flash, unchanged rows don't, `flash: false` opts out
 *   - a bare-number autoRefresh never flashes (back-compat)
 *   - every WM-034 pause condition skips a models tick too
 *   - teardown aborts in-flight + clears flash timers; a detached tick
 *     self-terminates
 *   - the flash style block is gated and emitted exactly once
 *   - rowStripe composition: the flash must not reach for `box-shadow`, which
 *     the severity bar owns (`td:first-child`)
 *
 * There are no fake timers in this harness, so ticks are driven directly.
 */

module.exports = async function (testContext) {
  const { describe, it, expect, beforeEach, afterEach } = testContext;
  const { testHelpers } = require('../utils/test-helpers');
  const { loadModule } = require('../utils/simple-module-loader');

  await testHelpers.setup();
  const jest = global.jest;

  const Collection = loadModule('Collection');
  const ListView = loadModule('ListView');
  const TableView = loadModule('TableView');

  const COLUMNS = [
    { key: 'name', label: 'Name' },
    { key: 'status', label: 'Status' }
  ];

  /**
   * REST-ish collection over `rows`, whose transport answers with
   * `serverRows` (defaults to the same data → nothing changed).
   */
  function seeded(rows, serverRows = null) {
    const collection = new Collection(rows.map((r) => ({ ...r })));
    collection.endpoint = '/api/thing';
    collection.restEnabled = true;
    collection.lastFetchTime = Date.now(); // suppress the onAfterMount fetch
    const answers = serverRows || rows;
    collection.rest = {
      GET: jest.fn(async (_url, params) => {
        const wanted = String(params.id__in).split(',');
        return {
          success: true,
          data: { status: 'ok', data: answers.filter((r) => wanted.includes(String(r.id))) }
        };
      })
    };
    return collection;
  }

  function threeRows() {
    return [
      { id: 1, name: 'Row 1', status: 'ok' },
      { id: 2, name: 'Row 2', status: 'ok' },
      { id: 3, name: 'Row 3', status: 'ok' }
    ];
  }

  // Let the tick's promise chain (refreshModels → then → finally) settle.
  const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

  let host;
  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
  });
  afterEach(() => {
    if (host && host.parentNode) host.parentNode.removeChild(host);
  });

  async function mountInto(view) {
    await view.render(true, host);
    return view;
  }

  // --------------------------------------------------------------
  describe('#297 object-form normalization', () => {
    it('{ every: 30 } is 30s and defaults to collection mode', () => {
      const tv = new TableView({ collection: seeded(threeRows()), columns: COLUMNS, autoRefresh: { every: 30 } });
      expect(tv._autoRefreshMs).toBe(30000);
      expect(tv._autoRefreshMode).toBe('collection');
      expect(tv._autoRefreshFlash).toBe(false);
    });

    it('{ every: 30, mode: "models" } selects models mode and flashes by default', () => {
      const tv = new TableView({
        collection: seeded(threeRows()),
        columns: COLUMNS,
        autoRefresh: { every: 30, mode: 'models' }
      });
      expect(tv._autoRefreshMode).toBe('models');
      expect(tv._autoRefreshFlash).toBe(true);
    });

    it('the 5s floor and the off-switch apply to the object form too', () => {
      const make = (autoRefresh) => new TableView({ collection: seeded(threeRows()), columns: COLUMNS, autoRefresh });
      expect(make({ every: 2, mode: 'models' })._autoRefreshMs).toBe(5000);
      expect(make({ every: 0, mode: 'models' })._autoRefreshMs).toBe(0);
      expect(make({ mode: 'models' })._autoRefreshMs).toBe(0);
      expect(make({ every: 'x' })._autoRefreshMs).toBe(0);
      // `indicator` on the object form wins over the standalone option.
      expect(make({ every: 30, indicator: false }).autoRefreshIndicator).toBe(false);
      expect(make({ every: 30 }).autoRefreshIndicator).toBe(true);
    });
  });

  // --------------------------------------------------------------
  describe('#297 models tick', () => {
    it('calls refreshModels with the current ids and never collection.fetch()', async () => {
      const collection = seeded(threeRows());
      const tv = new TableView({
        collection,
        columns: COLUMNS,
        autoRefresh: { every: 10, mode: 'models' }
      });
      await mountInto(tv);

      const fetchSpy = jest.spyOn(collection, 'fetch').mockResolvedValue({});
      const refreshSpy = jest.spyOn(collection, 'refreshModels');

      tv._autoRefreshTick();
      await settle();

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(refreshSpy).toHaveBeenCalledTimes(1);
      expect(refreshSpy.mock.calls[0][0]).toEqual([1, 2, 3]);

      await tv.destroy();
    });

    it('does not flip loading and does not rebuild the item views', async () => {
      const rows = threeRows();
      const updated = rows.map((r) => (r.id === 2 ? { ...r, status: 'error' } : { ...r }));
      const collection = seeded(rows, updated);
      const tv = new TableView({
        collection,
        columns: COLUMNS,
        autoRefresh: { every: 10, mode: 'models' }
      });
      await mountInto(tv);

      const before = [1, 2, 3].map((id) => tv.itemViews.get(id));

      tv._autoRefreshTick();
      await settle();

      expect(tv.loading).toBeFalsy();
      expect(collection.loading).toBeFalsy();
      expect([1, 2, 3].map((id) => tv.itemViews.get(id))).toEqual(before);
      expect(collection.models.length).toBe(3);
      // The merge landed on the existing instance.
      expect(collection.get(2).get('status')).toBe('error');

      await tv.destroy();
    });

    it('overlapping ticks are dropped while one is in flight', async () => {
      const collection = seeded(threeRows());
      const tv = new TableView({
        collection,
        columns: COLUMNS,
        autoRefresh: { every: 10, mode: 'models' }
      });
      await mountInto(tv);

      const refreshSpy = jest.spyOn(collection, 'refreshModels');
      tv._autoRefreshTick();
      tv._autoRefreshTick();
      expect(refreshSpy).toHaveBeenCalledTimes(1);

      await settle();
      tv._autoRefreshTick();
      expect(refreshSpy).toHaveBeenCalledTimes(2);

      await tv.destroy();
    });

    it('discards a response that lands after a full fetch changed the context', async () => {
      const rows = threeRows();
      const updated = rows.map((r) => ({ ...r, status: 'stale-context' }));
      const collection = seeded(rows, updated);
      const tv = new TableView({
        collection,
        columns: COLUMNS,
        autoRefresh: { every: 10, mode: 'models' }
      });
      await mountInto(tv);

      tv._autoRefreshTick();
      // The user changes a filter mid-tick → collection.fetch() stamps a new
      // lastFetchTime before our response lands.
      collection.lastFetchTime = Date.now() + 1000;
      await settle();

      // The merge itself still happened (Collection owns that), but the view
      // must not flash rows against a context that no longer exists.
      expect(tv.element.querySelectorAll('.mojo-row-flash').length).toBe(0);

      await tv.destroy();
    });
  });

  // --------------------------------------------------------------
  describe('#297 changed-row flash', () => {
    it('flashes only the rows whose data actually changed', async () => {
      const rows = threeRows();
      const updated = rows.map((r) => (r.id === 2 ? { ...r, status: 'error' } : { ...r }));
      const collection = seeded(rows, updated);
      const tv = new TableView({
        collection,
        columns: COLUMNS,
        autoRefresh: { every: 10, mode: 'models' }
      });
      await mountInto(tv);

      tv._autoRefreshTick();
      await settle();

      expect(tv.itemViews.get(2).element.classList.contains('mojo-row-flash')).toBe(true);
      expect(tv.itemViews.get(1).element.classList.contains('mojo-row-flash')).toBe(false);
      expect(tv.itemViews.get(3).element.classList.contains('mojo-row-flash')).toBe(false);

      await tv.destroy();
    });

    it('flash: false suppresses the highlight while the merge still happens', async () => {
      const rows = threeRows();
      const updated = rows.map((r) => ({ ...r, status: 'error' }));
      const collection = seeded(rows, updated);
      const tv = new TableView({
        collection,
        columns: COLUMNS,
        autoRefresh: { every: 10, mode: 'models', flash: false }
      });
      await mountInto(tv);
      expect(tv._autoRefreshFlash).toBe(false);

      tv._autoRefreshTick();
      await settle();

      expect(tv.element.querySelectorAll('.mojo-row-flash').length).toBe(0);
      expect(collection.get(1).get('status')).toBe('error');

      await tv.destroy();
    });

    it('flash is ignored in collection mode — no flag, no CSS', async () => {
      // The collection-mode flash cannot exist: a refetch resets the collection,
      // which rebuilds every item view, so no row element survives to flash.
      // `flash: true` there must therefore ship neither the flag nor the CSS.
      const tv = new TableView({
        collection: seeded(threeRows()),
        columns: COLUMNS,
        autoRefresh: { every: 30, mode: 'collection', flash: true }
      });
      await mountInto(tv);

      expect(tv._autoRefreshFlash).toBe(false);
      expect(tv._rowFlashEnabled()).toBe(false);
      expect(tv.element.innerHTML).not.toContain('mojo-row-flash');

      await tv.destroy();
    });

    it('a bare-number autoRefresh never flashes (back-compat)', async () => {
      const tv = new TableView({ collection: seeded(threeRows()), columns: COLUMNS, autoRefresh: 30 });
      await mountInto(tv);

      expect(tv._autoRefreshMode).toBe('collection');
      expect(tv._autoRefreshFlash).toBe(false);
      expect(tv._rowFlashEnabled()).toBe(false);
      expect(tv.element.innerHTML).not.toContain('mojo-row-flash');

      await tv.destroy();
    });

    it('composes with rowStripe — the severity bar survives the flash', async () => {
      const rows = [{ id: 1, name: 'Row 1', status: 'ok', level: 5 }];
      const updated = [{ id: 1, name: 'Row 1', status: 'error', level: 5 }];
      const collection = seeded(rows, updated);
      const tv = new TableView({
        collection,
        columns: COLUMNS,
        autoRefresh: { every: 10, mode: 'models' },
        rowStripe: (model) => (model.get('level') >= 5 ? 'danger' : null)
      });
      await mountInto(tv);

      const row = tv.itemViews.get(1).element;
      expect(row.classList.contains('list-row-stripe-danger')).toBe(true);

      tv._autoRefreshTick();
      await settle();

      // Both classes coexist…
      expect(row.classList.contains('mojo-row-flash')).toBe(true);
      expect(row.classList.contains('list-row-stripe-danger')).toBe(true);
      // …and the flash animates background-image, NOT box-shadow: keyframes sit
      // in the animation cascade origin, so a box-shadow flash would erase the
      // `inset 4px 0 0` severity bar on td:first-child for its whole duration.
      const styles = tv._buildRowFlashStyles();
      expect(styles).not.toContain('box-shadow');
      expect(styles).toContain('background-image');

      await tv.destroy();
    });
  });

  // --------------------------------------------------------------
  describe('#297 pause conditions apply to models ticks', () => {
    it('blurred / selection / inline edit / open dropdown all skip the tick', async () => {
      const collection = seeded(threeRows());
      const tv = new TableView({
        collection,
        columns: COLUMNS,
        autoRefresh: { every: 10, mode: 'models' },
        selectable: true
      });
      await mountInto(tv);
      const refreshSpy = jest.spyOn(collection, 'refreshModels');

      // 1. blurred
      window.dispatchEvent(new window.Event('blur'));
      tv._autoRefreshTick();
      expect(refreshSpy).not.toHaveBeenCalled();
      window.dispatchEvent(new window.Event('focus'));
      await settle();
      expect(refreshSpy).toHaveBeenCalledTimes(1); // focus resumes immediately
      refreshSpy.mockClear();

      // 2. active selection
      tv.selectedItems.add(1);
      tv._autoRefreshTick();
      expect(refreshSpy).not.toHaveBeenCalled();
      tv.selectedItems.clear();

      // 3. inline cell edit
      tv.itemViews.get(1).editingCells.add('name');
      tv._autoRefreshTick();
      expect(refreshSpy).not.toHaveBeenCalled();
      tv.itemViews.get(1).editingCells.clear();

      // 4. open row dropdown
      const menu = document.createElement('div');
      menu.className = 'dropdown-menu show';
      tv.element.appendChild(menu);
      tv._autoRefreshTick();
      expect(refreshSpy).not.toHaveBeenCalled();
      menu.remove();

      // Nothing pending → the next tick goes through.
      tv._autoRefreshTick();
      await settle();
      expect(refreshSpy).toHaveBeenCalledTimes(1);

      await tv.destroy();
    });

    it('a detached models tick self-terminates the timer', async () => {
      const collection = seeded(threeRows());
      const tv = new TableView({
        collection,
        columns: COLUMNS,
        autoRefresh: { every: 10, mode: 'models' }
      });
      await mountInto(tv);
      expect(tv._autoRefreshTimer).not.toBeNull();
      const refreshSpy = jest.spyOn(collection, 'refreshModels');

      tv.element.remove();
      expect(tv.isMounted()).toBeFalsy();

      tv._autoRefreshTick();
      expect(refreshSpy).not.toHaveBeenCalled();
      expect(tv._autoRefreshTimer).toBeNull();
      expect(tv._autoRefreshHandlers).toBeNull();
    });
  });

  // --------------------------------------------------------------
  describe('#297 teardown', () => {
    it('aborts a still-in-flight models refresh', async () => {
      const collection = seeded(threeRows());
      const tv = new TableView({
        collection,
        columns: COLUMNS,
        autoRefresh: { every: 10, mode: 'models' }
      });
      await mountInto(tv);

      // A request that never answers — exactly the case teardown must cancel.
      collection.refreshModels = () => new Promise(() => {});

      tv._autoRefreshTick();
      expect(tv._autoRefreshInFlight).toBe(true);
      const controller = tv._autoRefreshAbort;
      expect(controller).not.toBeNull();

      await tv.unmount();
      expect(controller.signal.aborted).toBe(true);
      expect(tv._autoRefreshAbort).toBeNull();
      expect(tv._autoRefreshInFlight).toBe(false);
      expect(tv._autoRefreshTimer).toBeNull();
    });

    it('clears pending flash timers so nothing fires against a detached row', async () => {
      const rows = threeRows();
      const updated = rows.map((r) => ({ ...r, status: 'error' }));
      const collection = seeded(rows, updated);
      const tv = new TableView({
        collection,
        columns: COLUMNS,
        autoRefresh: { every: 10, mode: 'models' }
      });
      await mountInto(tv);

      tv._autoRefreshTick();
      await settle();
      expect(tv._rowFlashTimers.size).toBe(3);

      await tv.unmount();
      expect(tv._rowFlashTimers.size).toBe(0);
    });
  });

  // --------------------------------------------------------------
  describe('#297 style block gating', () => {
    it('emitted exactly once when the flash is on, absent when it is off', async () => {
      const on = new TableView({
        collection: seeded(threeRows()),
        columns: COLUMNS,
        autoRefresh: { every: 10, mode: 'models' }
      });
      await mountInto(on);
      const html = on.element.innerHTML;
      let count = 0;
      let idx = 0;
      while ((idx = html.indexOf('@keyframes mojo-row-flash-fade', idx)) !== -1) { count++; idx += 1; }
      // The base keyframes + its dark companion, each exactly once.
      expect(count).toBe(2);
      expect(html).toContain('[data-bs-theme="dark"] .mojo-row-flash');
      expect(html).toContain('prefers-reduced-motion');
      await on.destroy();

      const off = new TableView({ collection: seeded(threeRows()), columns: COLUMNS });
      await mountInto(off);
      expect(off.element.innerHTML).not.toContain('mojo-row-flash');
      await off.destroy();
    });

    it('plain ListView (non-table) gets the same gated block', async () => {
      const lv = new ListView({
        collection: seeded(threeRows()),
        itemTemplate: '<div>{{model.name}}</div>',
        autoRefresh: { every: 10, mode: 'models' }
      });
      await mountInto(lv);
      expect(lv._rowFlashEnabled()).toBe(true);
      expect(lv.element.innerHTML).toContain('@keyframes mojo-row-flash-fade');
      await lv.destroy();
    });
  });
};
