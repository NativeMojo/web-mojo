/**
 * ListView / TableView cross-feature interactions
 *
 * The four wave-1 opt-in features that landed on ListView/TableView each
 * have their own unit file (filterPresets WM-032, feedbackStates WM-033,
 * autoRefresh WM-034, rowExpand WM-036). This file locks in that they
 * COMPOSE correctly when combined on one view:
 *
 *   1. preset applied → zero rows → emptyState FILTERED variant + clear-all
 *      deactivates the preset and reverts empty semantics.
 *   2. all wave-1 options on one TableView — constructs + renders, each
 *      feature's markup / style block appears exactly once.
 *   3. showResultCount count line + preset segment coexist without
 *      clobbering each other's innerHTML re-render paths.
 *   4. autoRefresh tick while a row is expanded — no throw, expandedRows
 *      state stays consistent (vanished ids pruned on rebuild).
 *   5. rowExpand + selection + skeleton loading — skeleton mirrors the
 *      leading expand + selection cells.
 *   6. all-options-OFF control — a plain TableView carries none of the
 *      wave-1 markup or style (strongest opt-in guarantee).
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
    { key: 'level', label: 'Level' }
  ];

  const PRESETS = [
    { key: 'errors', label: 'Errors', icon: 'bi-exclamation-triangle', params: { level__gte: 4 } },
    { key: 'auth', label: 'Auth', params: { name__icontains: 'auth' } }
  ];

  const EMPTY_STATE = {
    icon: 'key',
    title: 'No records yet',
    message: 'Records show up here once created.',
    action: { label: 'Add the first record', action: 'add', icon: 'bi-plus-lg' }
  };

  function seeded(n = 3) {
    const rows = [];
    for (let i = 1; i <= n; i++) rows.push({ id: i, name: `Row ${i}`, level: i });
    return new Collection(rows);
  }

  // A REST-backed collection whose fetch is a spy — lets applyPreset /
  // applyFilters exercise the refetch path without hitting the network.
  function restEmpty() {
    const c = new Collection([]);
    c.restEnabled = true;
    c.lastFetchTime = Date.now();
    c.fetch = jest.fn(async () => ({ success: true, data: { status: 'ok' } }));
    return c;
  }

  function countOccurrences(hay, needle) {
    let count = 0;
    let idx = 0;
    while ((idx = hay.indexOf(needle, idx)) !== -1) { count++; idx += needle.length; }
    return count;
  }

  // Simulate a chevron click (matches TableView.rowExpand.test.js).
  async function clickChevron(tv, id) {
    const row = tv.itemViews.get(id);
    await row.onActionToggleExpand({ stopPropagation: () => {} }, null);
  }

  let host;
  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
  });
  afterEach(() => {
    if (host && host.parentNode) host.parentNode.removeChild(host);
  });

  // --------------------------------------------------------------
  // Scenario 1 — preset × emptyState (filtered variant + clear-all revert)
  // --------------------------------------------------------------
  describe('interactions — preset drives the filtered empty state', () => {
    it('preset params count as active filters → filtered-empty variant with Clear CTA', async () => {
      const listView = new ListView({
        collection: new Collection([]),
        itemTemplate: '<div>{{model.name}}</div>',
        filterPresets: PRESETS,
        emptyState: EMPTY_STATE
      });
      await listView.render();

      // No active filters yet → the truly-empty variant (with its Add CTA).
      let panel = listView.element.querySelector('.table-empty-state');
      expect(panel).not.toBeNull();
      expect(panel.querySelector('.empty-state-title').textContent).toContain('No records yet');
      expect(panel.querySelector('button[data-action="add"]')).not.toBeNull();

      // Apply a preset → its params land in collection.params (active filters).
      await listView.applyPreset('errors');
      expect(listView.getActivePreset()?.key).toBe('errors');
      expect(listView.collection.params.level__gte).toBe(4);

      // Still empty, but now FILTERED-empty: swaps title + offers Clear filters,
      // and drops the truly-empty Add CTA.
      panel = listView.element.querySelector('.table-empty-state');
      expect(panel.querySelector('.empty-state-title').textContent).toContain('No results match your filters');
      expect(panel.querySelector('button[data-action="clear-all-filters"]')).not.toBeNull();
      expect(panel.querySelector('button[data-action="add"]')).toBeNull();
    });

    it('clear-all deactivates the preset (derived) and reverts empty semantics', async () => {
      const listView = new ListView({
        collection: new Collection([]),
        itemTemplate: '<div>{{model.name}}</div>',
        filterPresets: PRESETS,
        emptyState: EMPTY_STATE
      });
      await listView.render();
      await listView.applyPreset('errors');
      expect(listView.getActivePreset()?.key).toBe('errors');

      // Invoke the same handler the Clear-filters CTA is wired to. It resets
      // params then fires a non-awaited this.render() (the codebase's
      // fire-and-forget pattern), so we let that in-flight render settle
      // rather than racing it with our own render() — which would no-op on
      // the View's `isRendering` guard.
      await listView.onActionClearAllFilters({}, null);

      // Preset param gone → derived active state is null (no stored field to drift).
      expect(listView.collection.params.level__gte).toBeUndefined();
      expect(listView.getActivePreset()).toBeNull();

      // Let the fire-and-forget render settle → non-filtered (truly-empty)
      // semantics + Add CTA.
      await new Promise((resolve) => setTimeout(resolve, 10));
      const panel = listView.element.querySelector('.table-empty-state');
      expect(panel.querySelector('.empty-state-title').textContent).toContain('No records yet');
      expect(panel.querySelector('button[data-action="add"]')).not.toBeNull();
      expect(panel.querySelector('button[data-action="clear-all-filters"]')).toBeNull();
    });
  });

  // --------------------------------------------------------------
  // Scenario 2 — every wave-1 option on one TableView
  // --------------------------------------------------------------
  describe('interactions — all wave-1 options enabled together', () => {
    it('constructs + renders, and each feature contributes exactly one markup/style block', async () => {
      const collection = seeded(3);
      collection.meta = { count: 120, start: 0, size: 10 };

      let tv;
      expect(() => {
        tv = new TableView({
          collection,
          columns: COLUMNS,
          filterPresets: PRESETS,
          emptyState: EMPTY_STATE,
          loadingStyle: 'skeleton',
          showResultCount: true,
          autoRefresh: 30,
          rowExpand: (m) => `<b>detail ${m.get('name')}</b>`
        });
      }).not.toThrow();

      // Mount into a connected host so onAfterMount fires (starts the
      // autoRefresh timer) — render() auto-mounts, so this also proves the
      // six features co-mount cleanly.
      await tv.render(true, host);

      const html = tv.element.innerHTML;

      // --- Feature markup renders exactly once (DOM-level counts) ---
      expect(tv.element.querySelectorAll('.preset-segment').length).toBe(1);
      expect(tv.element.querySelectorAll('.result-count-summary').length).toBe(1);
      expect(tv.element.querySelectorAll('thead th.col-expand').length).toBe(1);

      // --- Style blocks emitted exactly once (opt-in features share the wrapper) ---
      // feedback styles (WM-033), rowExpand styles (WM-036), preset styles (WM-032)
      expect(countOccurrences(html, '@keyframes mojo-skeleton-shimmer')).toBe(1);
      expect(countOccurrences(html, 'border-left: 3px solid var(--bs-primary)')).toBe(1);
      expect(countOccurrences(html, 'scrollbar-width: thin')).toBe(1);

      // --- autoRefresh normalized + timer started on mount (composes) ---
      expect(tv._autoRefreshMs).toBe(30000);
      expect(tv._autoRefreshTimer).not.toBeNull();

      // Skeleton + emptyState are conditional (loading / empty) so absent on a
      // populated, not-loading render — their STYLES are present, markup isn't.
      expect(tv.element.querySelector('.mojo-skeleton-row')).toBeNull();
      expect(tv.element.querySelector('.table-empty-state')).toBeNull();

      await tv.destroy(); // tear down the autoRefresh timer (no leak)
    });
  });

  // --------------------------------------------------------------
  // Scenario 3 — result count + preset segment share the toolbar cleanly
  // --------------------------------------------------------------
  describe('interactions — result count + preset segment coexist', () => {
    it('separate containers: updateFilterPills and renderFilterPresets never clobber each other', async () => {
      const collection = restEmpty();
      // Give it a known total + a couple rows so the count line renders.
      collection.reset([{ id: 1, name: 'A', level: 2 }, { id: 2, name: 'B', level: 5 }]);
      collection.meta = { count: 50, start: 0, size: 10 };

      const tv = new TableView({
        collection,
        columns: COLUMNS,
        filterPresets: PRESETS,
        showResultCount: true
      });
      await tv.render();

      // Both present after a normal render.
      expect(tv.element.querySelector('.result-count-summary')).not.toBeNull();
      expect(tv.element.querySelector('.preset-segment')).not.toBeNull();

      // Apply a preset — applyFilters() repaints the pills row (count) AND
      // renderFilterPresets() repaints the segment. Both survive.
      await tv.applyPreset('errors');
      expect(tv.getActivePreset()?.key).toBe('errors');
      expect(tv.element.querySelector('.result-count-summary')).not.toBeNull();
      const activeBtn = tv.element.querySelector('.preset-segment button.btn-primary[data-preset-key="errors"]');
      expect(activeBtn).not.toBeNull();

      // Repainting the pills row alone must not wipe the preset segment
      // (they target different data-container slots).
      tv.updateFilterPills();
      expect(tv.element.querySelector('.preset-segment')).not.toBeNull();
      expect(tv.element.querySelector('.preset-segment button.btn-primary[data-preset-key="errors"]')).not.toBeNull();

      // Repainting the preset segment alone must not wipe the count summary.
      tv.renderFilterPresets();
      expect(tv.element.querySelector('.result-count-summary')).not.toBeNull();
    });
  });

  // --------------------------------------------------------------
  // Scenario 4 — autoRefresh tick during an expanded row
  // --------------------------------------------------------------
  describe('interactions — autoRefresh tick while a row is expanded', () => {
    it('tick refetches without throwing and leaves expandedRows intact when ids persist', async () => {
      const collection = seeded(3);
      collection.restEnabled = true;
      collection.lastFetchTime = Date.now();
      const tv = new TableView({
        collection,
        columns: COLUMNS,
        autoRefresh: 10,
        rowExpand: (m) => `detail ${m.get('name')}`
      });
      await tv.render(true, host);
      expect(tv._autoRefreshTimer).not.toBeNull();

      await clickChevron(tv, 1);
      expect(tv.expandedRows.has(1)).toBe(true);

      const fetchSpy = jest.spyOn(collection, 'fetch').mockResolvedValue({ data: { data: [] } });

      // A tick with an open detail row must not be skipped (no edit / menu) and
      // must not throw. The mocked fetch keeps the same models, so the
      // expanded id survives.
      expect(() => tv._autoRefreshTick()).not.toThrow();
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(tv.expandedRows.has(1)).toBe(true);

      await tv.destroy();
    });

    it('a refetch that replaces the data prunes expanded ids whose rows vanished', async () => {
      const collection = seeded(3);
      collection.restEnabled = true;
      collection.lastFetchTime = Date.now();
      const tv = new TableView({
        collection,
        columns: COLUMNS,
        autoRefresh: 10,
        rowExpand: (m) => `detail ${m.get('name')}`
      });
      await tv.render(true, host);

      await clickChevron(tv, 1);
      expect(tv.expandedRows.has(1)).toBe(true);

      // A real autoRefresh fetch resolving with a fresh page emits reset →
      // rebuild → render → _renderExpandedRows(), which drops ids whose rows
      // are gone (WM-036). Simulate that data swap here.
      collection.reset([{ id: 10, name: 'Delta', level: 2 }, { id: 11, name: 'Epsilon', level: 4 }]);
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(tv.expandedRows.size).toBe(0);
      expect(tv.element.querySelector('tr.mojo-detail-row')).toBeNull();

      await tv.destroy();
    });

    // #297 — models mode exists precisely so the visible rows survive a
    // refresh: an open detail row must still be open (and still rendered)
    // after a tick that changed the row's data.
    it('models-mode tick leaves an open detail row open and flashes the changed row', async () => {
      const collection = seeded(3);
      collection.endpoint = '/api/thing';
      collection.restEnabled = true;
      collection.lastFetchTime = Date.now();
      collection.rest = {
        GET: jest.fn(async (_url, params) => {
          const wanted = String(params.id__in).split(',');
          const rows = [{ id: 1, name: 'Row 1', level: 99 }, { id: 2, name: 'Row 2', level: 2 }];
          return { success: true, data: { status: 'ok', data: rows.filter((r) => wanted.includes(String(r.id))) } };
        })
      };

      const tv = new TableView({
        collection,
        columns: COLUMNS,
        autoRefresh: { every: 10, mode: 'models' },
        rowExpand: (m) => `detail ${m.get('name')}`
      });
      await tv.render(true, host);

      await clickChevron(tv, 1);
      expect(tv.expandedRows.has(1)).toBe(true);

      tv._autoRefreshTick();
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(tv.expandedRows.has(1)).toBe(true);
      expect(tv.element.querySelector('tr.mojo-detail-row')).not.toBeNull();
      // Row 1's level changed → flash; row 2 came back identical → no flash.
      expect(tv.itemViews.get(1).element.classList.contains('mojo-row-flash')).toBe(true);
      expect(tv.itemViews.get(2).element.classList.contains('mojo-row-flash')).toBe(false);

      await tv.destroy();
    });
  });

  // --------------------------------------------------------------
  // Scenario 5 — rowExpand + selection + skeleton loading
  // --------------------------------------------------------------
  describe('interactions — skeleton mirrors expand + selection leading cells', () => {
    it('skeleton rows carry the leading expand cell and selection cell', async () => {
      const tv = new TableView({
        collection: seeded(3),
        columns: COLUMNS,
        selectable: true,
        batchActions: [{ action: 'archive', label: 'Archive', icon: 'bi bi-archive' }],
        loadingStyle: 'skeleton',
        rowExpand: (m) => `detail ${m.get('name')}`
      });
      await tv.render();
      expect(tv.isSelectable()).toBe(true);
      expect(tv.isRowExpandEnabled()).toBe(true);

      // Enter the loading state → skeleton silhouette.
      tv.collection.emit('fetch:start');
      await tv.render();

      const skelRow = tv.element.querySelector('.mojo-skeleton-row');
      expect(skelRow).not.toBeNull();

      // Leading expand col (1) + selection col (1) + data columns (2) = 4 cells.
      const cells = skelRow.querySelectorAll('td');
      expect(cells.length).toBe(COLUMNS.length + 2);
      // First cell is the expand cell; a selection cell follows.
      expect(cells[0].classList.contains('col-expand')).toBe(true);

      // The skeleton table header mirrors the same leading cells.
      const headerCells = tv.element.querySelectorAll('thead th');
      expect(headerCells.length).toBe(COLUMNS.length + 2);
      expect(headerCells[0].classList.contains('col-expand')).toBe(true);
    });
  });

  // --------------------------------------------------------------
  // Scenario 6 — all-options-OFF control (opt-in guarantee)
  // --------------------------------------------------------------
  describe('interactions — plain TableView carries no opt-in wave-1 delta', () => {
    it('no preset / count / empty-state / expand markup or styles; skeleton is the default loading visual', async () => {
      const tv = new TableView({ collection: seeded(3), columns: COLUMNS });
      await tv.render();

      const html = tv.element.innerHTML;

      // No wave-1 markup. (No skeleton ROWS either — a populated, not-loading
      // render never shows them regardless of loadingStyle.)
      expect(tv.element.querySelector('.preset-segment')).toBeNull();
      expect(tv.element.querySelector('.col-expand')).toBeNull();
      expect(tv.element.querySelector('.result-count-summary')).toBeNull();
      expect(tv.element.querySelector('.table-empty-state')).toBeNull();
      expect(tv.element.querySelector('.mojo-skeleton-row')).toBeNull();

      // Opt-in style blocks (rowExpand / preset) stay absent — these
      // non-loading assertions are unchanged. (result-count markup absence is
      // covered by the querySelector('.result-count-summary') check above; its
      // class name is a CSS selector inside the default skeleton <style> block,
      // so a raw string check would false-positive.)
      expect(html).not.toContain('mojo-detail-panel');
      expect(html).not.toContain('.preset-segment .btn');
      expect(html).not.toContain('mojo-row-flash'); // #297 flash CSS is gated too

      // LOADING-STATE change: skeleton is now the DEFAULT loading visual, so its
      // style block ships by default (it did not before). Only the loading
      // visual moved — the non-loading markup above is untouched.
      expect(html).toContain('@keyframes mojo-skeleton-shimmer');
      expect(html).toContain('skeleton-line');

      // No wave-1 state. loadingStyle now defaults to 'skeleton' (was 'default').
      expect(tv._autoRefreshMs).toBe(0);
      expect(tv._autoRefreshTimer).toBeNull();
      expect(tv.emptyState).toBeNull();
      expect(tv.loadingStyle).toBe('skeleton');
      expect(tv.showResultCount).toBe(false);
      expect(tv.isRowExpandEnabled()).toBe(false);
      expect(tv.filterPresets).toEqual([]);
    });
  });
};
