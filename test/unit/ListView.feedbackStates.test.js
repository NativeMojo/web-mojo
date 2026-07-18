/**
 * ListView / TableView feedback states — WM-033
 *
 * Three opt-in body-render upgrades that share the ListView render path:
 *   1. `emptyState: {icon, title, message, action}` — rich empty panel with a
 *      truly-empty vs filtered-empty branch (filtered auto-offers Clear filters).
 *   2. `loadingStyle: 'skeleton'` — shimmer placeholder rows/cards during fetch.
 *   3. `showResultCount: true` — a "Showing N of M" line in the filter-pills row.
 *
 * Every feature is strictly opt-in — a page that sets none keeps the spinner,
 * the bare `emptyMessage`, and no count line. Tests assert both the enabled
 * behavior and the opt-out (no markup delta).
 */

module.exports = async function (testContext) {
  const { describe, it, expect } = testContext;
  const { testHelpers } = require('../utils/test-helpers');
  const { loadModule } = require('../utils/simple-module-loader');

  await testHelpers.setup();

  const Collection = loadModule('Collection');
  const ListView = loadModule('ListView');
  const TableView = loadModule('TableView');

  const COLUMNS = [
    { key: 'name', label: 'Name' },
    { key: 'type', label: 'Type' },
    { key: 'status', label: 'Status' },
    { key: 'created', label: 'Created' }
  ];

  const EMPTY_STATE = {
    icon: 'key',
    title: 'No API keys yet',
    message: 'API keys let scripts authenticate without a password.',
    action: { label: 'Add your first API key', action: 'add', icon: 'bi-plus-lg' }
  };

  function seeded(n = 3) {
    const rows = [];
    for (let i = 1; i <= n; i++) rows.push({ id: i, name: `Row ${i}`, type: 'webhook', status: 'ok', created: 1 });
    return new Collection(rows);
  }

  // --------------------------------------------------------------
  describe('WM-033 emptyState — truly-empty branch', () => {
    it('renders the configured icon chip, title, message + CTA (ListView)', async () => {
      const listView = new ListView({
        collection: new Collection([]),
        itemTemplate: '<div>{{model.name}}</div>',
        emptyState: EMPTY_STATE
      });
      await listView.render();

      const panel = listView.element.querySelector('.table-empty-state');
      expect(panel).not.toBeNull();
      expect(panel.querySelector('.empty-state-icon .bi-key')).not.toBeNull();
      expect(panel.querySelector('.empty-state-title').textContent).toContain('No API keys yet');
      expect(panel.querySelector('.empty-state-message').textContent).toContain('authenticate');

      // CTA button carries the configured data-action (wired to onActionAdd).
      const btn = panel.querySelector('button[data-action="add"]');
      expect(btn).not.toBeNull();
      expect(btn.textContent).toContain('Add your first API key');
      expect(btn.querySelector('.bi-plus-lg')).not.toBeNull();
      expect(typeof listView.onActionAdd).toBe('function');
    });

    it('renders the rich empty state inside a TableView too', async () => {
      const tv = new TableView({
        collection: new Collection([]),
        columns: COLUMNS,
        emptyState: EMPTY_STATE
      });
      await tv.render();

      expect(tv.element.querySelector('.table-empty-state')).not.toBeNull();
      // The bare `.table-empty` fallback is NOT used when emptyState is set.
      expect(tv.element.querySelector('.table-empty')).toBeNull();
    });
  });

  // --------------------------------------------------------------
  describe('WM-033 emptyState — filtered-empty branch', () => {
    it('swaps to "No results match your filters" + Clear filters when filters active', async () => {
      const collection = new Collection([]);
      collection.params.status = 'error';        // an active filter → filtered variant
      const listView = new ListView({
        collection,
        itemTemplate: '<div>{{model.name}}</div>',
        emptyState: EMPTY_STATE
      });
      await listView.render();

      const panel = listView.element.querySelector('.table-empty-state');
      expect(panel).not.toBeNull();
      expect(panel.querySelector('.empty-state-title').textContent).toContain('No results match your filters');
      expect(panel.querySelector('.empty-state-message').textContent).toContain('active filter');

      // Filtered variant auto-offers Clear filters (reuses onActionClearAllFilters).
      const btn = panel.querySelector('button[data-action="clear-all-filters"]');
      expect(btn).not.toBeNull();
      expect(btn.textContent).toContain('Clear filters');
      // The truly-empty CTA is NOT shown in the filtered variant.
      expect(panel.querySelector('button[data-action="add"]')).toBeNull();
    });

    it('search counts as an active filter (drives the filtered variant)', async () => {
      const collection = new Collection([]);
      collection.params.search = 'payment.failed';
      const listView = new ListView({
        collection,
        itemTemplate: '<div>{{model.name}}</div>',
        emptyState: EMPTY_STATE
      });
      await listView.render();

      const panel = listView.element.querySelector('.table-empty-state');
      expect(panel.querySelector('.empty-state-title').textContent).toContain('No results match your filters');
    });
  });

  // --------------------------------------------------------------
  describe('WM-033 emptyState — fallback preserved', () => {
    it('no emptyState → bare emptyMessage markup, no rich panel (ListView)', async () => {
      const listView = new ListView({
        collection: new Collection([]),
        itemTemplate: '<div>{{model.name}}</div>',
        emptyMessage: 'Nothing here yet'
      });
      await listView.render();

      expect(listView.element.querySelector('.table-empty-state')).toBeNull();
      const bare = listView.element.querySelector('.list-empty');
      expect(bare).not.toBeNull();
      expect(bare.textContent).toContain('Nothing here yet');
    });

    it('no emptyState → bare `table-empty` + emptyMessage (TableView)', async () => {
      const tv = new TableView({
        collection: new Collection([]),
        columns: COLUMNS,
        emptyMessage: 'No data available'
      });
      await tv.render();

      expect(tv.element.querySelector('.table-empty-state')).toBeNull();
      const bare = tv.element.querySelector('.table-empty');
      expect(bare).not.toBeNull();
      expect(bare.textContent).toContain('No data available');
    });
  });

  // --------------------------------------------------------------
  describe('WM-033 loadingStyle: skeleton', () => {
    it('renders shimmer rows during fetch:start and clears on fetch:end (TableView)', async () => {
      const tv = new TableView({
        collection: seeded(3),
        columns: COLUMNS,
        loadingStyle: 'skeleton'
      });
      await tv.render();

      // Not loading → real rows, no skeleton.
      expect(tv.element.querySelector('.mojo-skeleton-row')).toBeNull();

      tv.collection.emit('fetch:start');
      await tv.render();
      expect(tv.element.querySelectorAll('.mojo-skeleton-row').length).toBeGreaterThan(0);
      // Skeleton table echoes the real column layout (header present).
      expect(tv.element.querySelectorAll('thead th').length).toBe(COLUMNS.length);

      tv.collection.emit('fetch:end');
      await tv.render();
      expect(tv.element.querySelector('.mojo-skeleton-row')).toBeNull();
    });

    it('default (no loadingStyle) keeps the spinner during loading', async () => {
      const tv = new TableView({
        collection: seeded(3),
        columns: COLUMNS
      });
      await tv.render();

      tv.collection.emit('fetch:start');
      await tv.render();
      expect(tv.element.querySelector('.mojo-skeleton-row')).toBeNull();
      expect(tv.element.querySelector('.mojo-table-loading .spinner-border')).not.toBeNull();
    });

    it('skeleton row count = collection.params.size', async () => {
      const collection = seeded(2);
      collection.params.size = 3;
      const tv = new TableView({ collection, columns: COLUMNS, loadingStyle: 'skeleton' });
      await tv.render();

      tv.collection.emit('fetch:start');
      await tv.render();
      expect(tv.element.querySelectorAll('.mojo-skeleton-row').length).toBe(3);
    });

    it('skeleton row count is capped at 8', async () => {
      const collection = seeded(2);
      collection.params.size = 50;
      const tv = new TableView({ collection, columns: COLUMNS, loadingStyle: 'skeleton' });
      await tv.render();

      tv.collection.emit('fetch:start');
      await tv.render();
      expect(tv.element.querySelectorAll('.mojo-skeleton-row').length).toBe(8);
    });

    it('ListView skeleton renders card silhouettes', async () => {
      const collection = seeded(2);
      collection.params.size = 4;
      const listView = new ListView({
        collection,
        itemTemplate: '<div>{{model.name}}</div>',
        loadingStyle: 'skeleton'
      });
      await listView.render();

      listView.collection.emit('fetch:start');
      await listView.render();
      expect(listView.element.querySelectorAll('.list-skeleton-card').length).toBe(4);
    });
  });

  // --------------------------------------------------------------
  describe('WM-033 showResultCount', () => {
    it('renders "Showing N of M" from collection.meta (no filters → no suffix)', async () => {
      const collection = seeded(4);
      collection.meta = { count: 1204, start: 0, size: 10 };
      const tv = new TableView({
        collection,
        columns: COLUMNS,
        showResultCount: true
      });
      await tv.render();

      const summary = tv.element.querySelector('.result-count-summary');
      expect(summary).not.toBeNull();
      expect(summary.textContent).toContain('Showing');
      expect(summary.textContent).toContain((4).toLocaleString());
      expect(summary.textContent).toContain((1204).toLocaleString());
      // No active filters → no "· filtered" marker.
      expect(summary.querySelector('.count-filtered')).toBeNull();
    });

    it('appends "· filtered" when a filter is active', async () => {
      const collection = seeded(0);
      collection.meta = { count: 1204, start: 0, size: 10 };
      collection.params.status = 'error';
      const tv = new TableView({
        collection,
        columns: COLUMNS,
        showResultCount: true
      });
      await tv.render();

      const summary = tv.element.querySelector('.result-count-summary');
      expect(summary).not.toBeNull();
      expect(summary.querySelector('.count-filtered')).not.toBeNull();
      expect(summary.textContent).toContain('filtered');
    });

    it('renders nothing when the total count is unknown', async () => {
      const collection = seeded(4); // meta stays {} → no count
      const tv = new TableView({
        collection,
        columns: COLUMNS,
        showResultCount: true
      });
      await tv.render();
      expect(tv.element.querySelector('.result-count-summary')).toBeNull();
    });
  });

  // --------------------------------------------------------------
  describe('WM-033 opt-in guarantee — no options, no markup delta', () => {
    it('a plain TableView renders none of the feedback markup/styles', async () => {
      const tv = new TableView({
        collection: new Collection([]),
        columns: COLUMNS
      });
      await tv.render();

      const html = tv.element.innerHTML;
      expect(html).not.toContain('skeleton-line');
      expect(html).not.toContain('table-empty-state');
      expect(html).not.toContain('result-count-summary');
      expect(html).not.toContain('mojo-skeleton-shimmer');
    });

    it('a plain ListView renders none of the feedback markup/styles', async () => {
      const listView = new ListView({
        collection: seeded(3),
        itemTemplate: '<div>{{model.name}}</div>'
      });
      await listView.render();

      const html = listView.element.innerHTML;
      expect(html).not.toContain('skeleton-line');
      expect(html).not.toContain('empty-state-icon');
      expect(html).not.toContain('result-count-summary');
    });

    it('flags default off when the options are absent', async () => {
      const listView = new ListView({
        collection: seeded(1),
        itemTemplate: '<div>{{model.name}}</div>'
      });
      expect(listView.emptyState).toBeNull();
      expect(listView.loadingStyle).toBe('default');
      expect(listView.showResultCount).toBe(false);
    });
  });
};
