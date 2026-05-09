/**
 * ListView Unit Tests
 *
 * Covers the toolbar / search / filters / pagination / show-more upgrade.
 * Plain ListView (no toolbar features) is also covered to lock the
 * "no behavior change for default callers" contract.
 */

module.exports = async function (testContext) {
  const { describe, it, expect, beforeEach } = testContext;
  const { testHelpers } = require('../utils/test-helpers');
  const { loadModule } = require('../utils/simple-module-loader');

  await testHelpers.setup();

  const Collection = loadModule('Collection');
  const ListView = loadModule('ListView');

  // --------------------------------------------------------------
  // Plain ListView — no toolbar / pagination features enabled.
  // --------------------------------------------------------------
  describe('ListView (default — no toolbar)', () => {
    let collection;
    let listView;

    beforeEach(async () => {
      collection = new Collection([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
        { id: 3, name: 'Charlie' }
      ]);
      listView = new ListView({
        collection,
        itemTemplate: '<div class="item">{{model.name}}</div>'
      });
      await listView.render();
    });

    it('does not render toolbar markup', () => {
      const html = listView.element.innerHTML;
      expect(html).not.toContain('table-action-buttons');
      expect(html).not.toContain('data-action="refresh"');
      expect(html).not.toContain('data-filter="search"');
    });

    it('does not render pagination footer', () => {
      const html = listView.element.innerHTML;
      expect(html).not.toContain('table-status-bar');
      expect(html).not.toContain('data-container="pagination"');
    });

    it('does not render show-more button', () => {
      const html = listView.element.innerHTML;
      expect(html).not.toContain('list-show-more-row');
      expect(html).not.toContain('data-action="show-more"');
    });

    it('renders list items from the collection', () => {
      // _renderChildren appends each itemView's element to the items
      // container. The collection seed has 3 models; expect 3 item nodes.
      expect(listView.itemViews.size).toBe(3);
    });
  });

  // --------------------------------------------------------------
  // Toolbar — searchable
  // --------------------------------------------------------------
  describe('ListView (searchable)', () => {
    let collection;
    let listView;

    beforeEach(async () => {
      collection = new Collection([{ id: 1, name: 'A' }]);
      listView = new ListView({
        collection,
        itemTemplate: '<div>{{model.name}}</div>',
        searchable: true,
        searchPlaceholder: 'Find…'
      });
      await listView.render();
    });

    it('renders the search input with placeholder', () => {
      const input = listView.element.querySelector('input[type="search"][data-filter="search"]');
      expect(input).not.toBeNull();
      expect(input.getAttribute('placeholder')).toBe('Find…');
    });

    it('updates collection.params.search via setFilter()', () => {
      listView.setFilter('search', 'alpha');
      expect(collection.params.search).toBe('alpha');
    });

    it('clears search via setFilter(search, null)', () => {
      listView.setFilter('search', 'foo');
      expect(collection.params.search).toBe('foo');
      listView.setFilter('search', null);
      expect(collection.params.search).toBeUndefined();
    });
  });

  // --------------------------------------------------------------
  // Toolbar — filterable + filters
  // --------------------------------------------------------------
  describe('ListView (filterable)', () => {
    let collection;
    let listView;

    beforeEach(async () => {
      collection = new Collection([{ id: 1, name: 'A' }]);
      listView = new ListView({
        collection,
        itemTemplate: '<div>{{model.name}}</div>',
        filterable: true,
        filters: [
          {
            name: 'status',
            label: 'Status',
            type: 'select',
            options: ['active', 'inactive']
          }
        ]
      });
      await listView.render();
    });

    it('renders the Add Filter dropdown', () => {
      const html = listView.element.innerHTML;
      expect(html).toContain('Add Filter');
      expect(html).toContain('data-action="add-filter"');
      expect(html).toContain('data-filter-key="status"');
    });

    it('renders an active pill when a filter is set', () => {
      listView.setFilter('status', 'active');
      listView.updateFilterPills();

      const pills = listView.element.querySelectorAll('[data-action="edit-filter"]');
      expect(pills.length).toBeGreaterThanOrEqual(1);

      const removeBtn = listView.element.querySelector('[data-action="remove-filter"][data-filter="status"]');
      expect(removeBtn).not.toBeNull();
    });

    it('getActiveFilters returns the active filter (excluding pagination)', () => {
      listView.setFilter('status', 'active');
      const filters = listView.getActiveFilters();
      expect(filters.status).toBe('active');
      expect(filters.start).toBeUndefined();
      expect(filters.size).toBeUndefined();
    });
  });

  // --------------------------------------------------------------
  // Numbered pagination
  // --------------------------------------------------------------
  describe("ListView (paginationMode: 'pages')", () => {
    let collection;
    let listView;

    beforeEach(async () => {
      collection = new Collection([{ id: 1, name: 'A' }]);
      // Fake "server" pagination: meta.count = 50, page size 10.
      collection.meta = { count: 50 };
      collection.params = { start: 0, size: 10 };
      collection.restEnabled = true;
      collection.lastFetchTime = Date.now();
      collection.fetch = async () => ({ success: true, data: { status: 'ok' } });

      listView = new ListView({
        collection,
        itemTemplate: '<div>{{model.name}}</div>',
        paginated: true,
        paginationMode: 'pages'
      });
      await listView.render();
    });

    it('renders the numbered pagination footer', () => {
      const html = listView.element.innerHTML;
      expect(html).toContain('table-status-bar');
      expect(html).toContain('data-container="pagination"');
      expect(html).toContain('data-change-action="page-size"');
    });

    it('onActionPage(page=2) advances start by size', async () => {
      const fakeEvent = { preventDefault: () => {} };
      const fakeEl = { getAttribute: (k) => (k === 'data-page' ? '2' : null) };
      await listView.onActionPage(fakeEvent, fakeEl);
      expect(collection.params.start).toBe(10);
    });

    it('onChangePageSize updates size and resets start to 0', async () => {
      collection.params.start = 20;
      const fakeEl = { value: '25' };
      await listView.onChangePageSize({}, fakeEl);
      expect(collection.params.size).toBe(25);
      expect(collection.params.start).toBe(0);
    });
  });

  // --------------------------------------------------------------
  // Show-more pagination
  // --------------------------------------------------------------
  describe("ListView (paginationMode: 'more')", () => {
    let collection;
    let listView;

    beforeEach(async () => {
      collection = new Collection([{ id: 1, name: 'A' }, { id: 2, name: 'B' }]);
      collection.meta = { count: 4 };
      collection.params = { start: 0, size: 2 };
      collection.restEnabled = true;
      collection.lastFetchTime = Date.now();

      listView = new ListView({
        collection,
        itemTemplate: '<div>{{model.name}}</div>',
        paginated: true,
        paginationMode: 'more'
      });
      await listView.render();
    });

    it('renders Show More button while length < meta.count', () => {
      const btn = listView.element.querySelector('[data-action="show-more"]');
      expect(btn).not.toBeNull();
    });

    it('appends new models on Show More (via fetchMore)', async () => {
      // Stub fetchMore to simulate appending two more models.
      collection.fetchMore = async () => {
        collection.add([{ id: 3, name: 'C' }, { id: 4, name: 'D' }]);
        collection.params.start = 2;
        return { success: true };
      };

      await listView.onActionShowMore({}, {});

      expect(collection.length()).toBe(4);
      expect(listView.itemViews.size).toBe(4);
    });

    it('hides Show More once collection.length() >= meta.count', async () => {
      collection.add([{ id: 3, name: 'C' }, { id: 4, name: 'D' }]);
      // hasMore is computed in onBeforeRender.
      await listView.render();
      const btn = listView.element.querySelector('[data-action="show-more"]');
      expect(btn).toBeNull();
    });

    it('defaults persistSelection to true in "more" mode', () => {
      expect(listView.persistSelection).toBe(true);
    });
  });

  // --------------------------------------------------------------
  // persistSelection across rebuilds
  // --------------------------------------------------------------
  describe('ListView persistSelection', () => {
    it('preserves selection across page rebuild when persistSelection: true', async () => {
      const collection = new Collection([
        { id: 1, name: 'A' },
        { id: 2, name: 'B' }
      ]);
      const listView = new ListView({
        collection,
        itemTemplate: '<div data-action="select">{{model.name}}</div>',
        selectionMode: 'multiple',
        persistSelection: true
      });
      await listView.render();

      // Simulate selection of model #1.
      listView.selectItem(1);
      expect(listView.selectedItems.has(1)).toBe(true);

      // Simulate a page-rebuild (collection reset to a new set).
      collection.reset([
        { id: 1, name: 'A' }, // same id — should remain marked selected
        { id: 3, name: 'C' }
      ]);

      expect(listView.selectedItems.has(1)).toBe(true);
      const itemA = listView.itemViews.get(1);
      expect(itemA?.selected).toBe(true);
    });

    it('clears selection on page rebuild when persistSelection: false (default for pages)', async () => {
      const collection = new Collection([{ id: 1, name: 'A' }]);
      collection.meta = { count: 4 };
      collection.params = { start: 0, size: 2 };

      const listView = new ListView({
        collection,
        itemTemplate: '<div data-action="select">{{model.name}}</div>',
        selectionMode: 'multiple',
        paginated: true,
        paginationMode: 'pages'
      });
      await listView.render();

      listView.selectItem(1);
      expect(listView.selectedItems.has(1)).toBe(true);

      collection.reset([{ id: 2, name: 'B' }]);
      expect(listView.selectedItems.size).toBe(0);
    });
  });

  // --------------------------------------------------------------
  // Sort dropdown
  // --------------------------------------------------------------
  describe('ListView sortOptions', () => {
    it('renders the sort dropdown when sortOptions are provided', async () => {
      const collection = new Collection([{ id: 1, name: 'A' }]);
      const listView = new ListView({
        collection,
        itemTemplate: '<div>{{model.name}}</div>',
        sortOptions: [
          { key: 'created', label: 'Newest', dir: 'desc' },
          { key: 'name', label: 'A-Z', dir: 'asc' }
        ]
      });
      await listView.render();

      const html = listView.element.innerHTML;
      expect(html).toContain('data-action="sort-option"');
      expect(html).toContain('data-sort="-created"');
      expect(html).toContain('data-sort="name"');
    });

    it('onActionSortOption sets collection.params.sort and resets start', async () => {
      const collection = new Collection([{ id: 1, name: 'A' }]);
      collection.params.start = 30;
      const listView = new ListView({
        collection,
        itemTemplate: '<div>{{model.name}}</div>',
        sortOptions: [{ key: 'created', label: 'Newest', dir: 'desc' }]
      });
      await listView.render();

      const fakeEvent = { preventDefault: () => {} };
      const fakeEl = { getAttribute: () => '-created' };
      await listView.onActionSortOption(fakeEvent, fakeEl);

      expect(collection.params.sort).toBe('-created');
      expect(collection.params.start).toBe(0);
    });
  });
};
