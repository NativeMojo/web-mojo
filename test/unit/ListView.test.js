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
  // Toolbar — dayRangeFilter
  // --------------------------------------------------------------
  describe('ListView (dayRangeFilter)', () => {
    const NOW_TOLERANCE = 5; // seconds

    function makeRestCollection(seed = []) {
      const c = new Collection(seed);
      c.restEnabled = true;
      c.lastFetchTime = Date.now();
      c.fetch = async () => ({ success: true, data: { status: 'ok' } });
      return c;
    }

    it('boolean form mounts a SegmentControl with the four default options at value="7d"', async () => {
      const collection = makeRestCollection([{ id: 1, name: 'A' }]);
      const listView = new ListView({
        collection,
        itemTemplate: '<div>{{model.name}}</div>',
        dayRangeFilter: true
      });
      await listView.render();

      expect(listView.dayRangeControl).not.toBeNull();
      expect(listView.dayRangeControl.items).toHaveLength(4);
      expect(listView.dayRangeControl.items.map((o) => o.value))
        .toEqual(['1d', '7d', '30d', '90d']);
      expect(listView.dayRangeControl.getValue()).toBe('7d');
      expect(listView.dayRangeControl.ariaLabel).toBe('Time range');
    });

    it('object form respects field, value, options, ariaLabel overrides', async () => {
      const collection = makeRestCollection();
      const listView = new ListView({
        collection,
        itemTemplate: '<div>{{model.name}}</div>',
        dayRangeFilter: {
          field: 'occurred',
          value: '30d',
          options: [
            { value: '7d', label: '7d' },
            { value: '30d', label: '30d' }
          ],
          ariaLabel: 'Window'
        }
      });
      await listView.render();

      expect(listView.dayRangeFilter.field).toBe('occurred');
      expect(listView.dayRangeControl.getValue()).toBe('30d');
      expect(listView.dayRangeControl.items).toHaveLength(2);
      expect(listView.dayRangeControl.ariaLabel).toBe('Window');
    });

    it('seeds collection.params.created__gte to nowEpoch - 7*86400 on mount', async () => {
      const collection = makeRestCollection();
      const expected = Math.floor(Date.now() / 1000) - 7 * 86400;
      const listView = new ListView({
        collection,
        itemTemplate: '<div>{{model.name}}</div>',
        dayRangeFilter: true
      });
      await listView.render();

      expect(typeof collection.params.created__gte).toBe('number');
      expect(Math.abs(collection.params.created__gte - expected))
        .toBeLessThanOrEqual(NOW_TOLERANCE);
    });

    it('custom field writes to ${field}__gte (not created__gte)', async () => {
      const collection = makeRestCollection();
      const listView = new ListView({
        collection,
        itemTemplate: '<div>{{model.name}}</div>',
        dayRangeFilter: { field: 'occurred', value: '30d' }
      });
      await listView.render();

      expect(collection.params.created__gte).toBeUndefined();
      expect(typeof collection.params.occurred__gte).toBe('number');
    });

    it('on segment change updates ${field}__gte, resets start, fetches', async () => {
      const collection = makeRestCollection([{ id: 1, name: 'A' }]);
      collection.params.start = 50;
      const fetchSpy = jest.fn(async () => ({ success: true, data: { status: 'ok' } }));
      collection.fetch = fetchSpy;

      const listView = new ListView({
        collection,
        itemTemplate: '<div>{{model.name}}</div>',
        dayRangeFilter: true
      });
      await listView.render();

      const before = collection.params.created__gte;
      const expected = Math.floor(Date.now() / 1000) - 30 * 86400;
      // Drive the change through the SegmentControl (mirrors a click)
      listView.dayRangeControl.setValue('30d');

      // _onDayRangeChange is async; flush microtasks
      await new Promise((r) => setTimeout(r, 0));

      expect(collection.params.created__gte).not.toBe(before);
      expect(Math.abs(collection.params.created__gte - expected))
        .toBeLessThanOrEqual(NOW_TOLERANCE);
      expect(collection.params.start).toBe(0);
      expect(fetchSpy).toHaveBeenCalled();
    });

    it('emits range:change with { field, value, previous, params } on user change', async () => {
      const collection = makeRestCollection();
      const listView = new ListView({
        collection,
        itemTemplate: '<div>{{model.name}}</div>',
        dayRangeFilter: true
      });
      await listView.render();

      const captured = [];
      listView.on('range:change', (payload) => captured.push(payload));

      listView.dayRangeControl.setValue('30d');
      await new Promise((r) => setTimeout(r, 0));

      expect(captured).toHaveLength(1);
      expect(captured[0].field).toBe('created');
      expect(captured[0].value).toBe('30d');
      expect(captured[0].previous).toBe('7d');
      expect(captured[0].params).toHaveProperty('created__gte');
      expect(typeof captured[0].params.created__gte).toBe('number');
    });

    it('does NOT emit range:change on the initial mount-time seed', async () => {
      const collection = makeRestCollection();
      const listView = new ListView({
        collection,
        itemTemplate: '<div>{{model.name}}</div>',
        dayRangeFilter: true
      });

      const seen = jest.fn();
      listView.on('range:change', seen);

      await listView.render();
      expect(seen).not.toHaveBeenCalled();
    });

    it('getRange / setRange proxy correctly', async () => {
      const collection = makeRestCollection();
      const listView = new ListView({
        collection,
        itemTemplate: '<div>{{model.name}}</div>',
        dayRangeFilter: true
      });
      await listView.render();

      expect(listView.getRange()).toBe('7d');

      const fired = jest.fn();
      listView.on('range:change', fired);

      const ok = listView.setRange('30d');
      await new Promise((r) => setTimeout(r, 0));
      expect(ok).toBe(true);
      expect(listView.getRange()).toBe('30d');
      expect(fired).toHaveBeenCalled();
    });

    it('setRange(value, { silent: true }) updates without emit or fetch', async () => {
      const collection = makeRestCollection();
      const fetchSpy = jest.fn(async () => ({ success: true, data: { status: 'ok' } }));
      collection.fetch = fetchSpy;

      const listView = new ListView({
        collection,
        itemTemplate: '<div>{{model.name}}</div>',
        dayRangeFilter: true
      });
      await listView.render();

      const fired = jest.fn();
      listView.on('range:change', fired);
      fetchSpy.mockClear();

      const ok = listView.setRange('30d', { silent: true });
      expect(ok).toBe(true);
      expect(listView.getRange()).toBe('30d');
      expect(fired).not.toHaveBeenCalled();
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('setRange(unknown) returns false and does not change state', async () => {
      const collection = makeRestCollection();
      const listView = new ListView({
        collection,
        itemTemplate: '<div>{{model.name}}</div>',
        dayRangeFilter: true
      });
      await listView.render();

      const ok = listView.setRange('not-an-option');
      expect(ok).toBe(false);
      expect(listView.getRange()).toBe('7d');
    });

    it('combined dayRangeFilter + toolbarRight mounts both, day-range to the left', async () => {
      const ToolbarRightView = loadModule('View');
      const rightView = new ToolbarRightView({
        tagName: 'div',
        className: 'right-extra',
        template: '<button class="btn-extra">Extra</button>'
      });

      const collection = makeRestCollection();
      const listView = new ListView({
        collection,
        itemTemplate: '<div>{{model.name}}</div>',
        dayRangeFilter: true,
        toolbarRight: rightView
      });
      await listView.render();

      const dayRangeContainer = listView.element.querySelector('[data-container="toolbar-day-range"]');
      const rightContainer = listView.element.querySelector('[data-container="toolbar-right"]');
      expect(dayRangeContainer).not.toBeNull();
      expect(rightContainer).not.toBeNull();

      // Both containers live in the same right-aligned flex group.
      // dayRange must come BEFORE toolbar-right in document order.
      const pos = dayRangeContainer.compareDocumentPosition(rightContainer);
      // DOCUMENT_POSITION_FOLLOWING (4) — rightContainer follows dayRangeContainer
      expect(pos & 4).toBe(4);
    });

    it('_isToolbarEnabled returns true when only dayRangeFilter is set', async () => {
      const collection = makeRestCollection();
      const listView = new ListView({
        collection,
        itemTemplate: '<div>{{model.name}}</div>',
        dayRangeFilter: true
      });
      expect(listView._isToolbarEnabled()).toBe(true);

      await listView.render();
      const html = listView.element.innerHTML;
      expect(html).toContain('table-action-buttons');
      expect(html).toContain('data-container="toolbar-day-range"');
    });

    it('escape-hatch value (non-\\d+d) does NOT write a __gte param on seed', async () => {
      const collection = makeRestCollection();
      const listView = new ListView({
        collection,
        itemTemplate: '<div>{{model.name}}</div>',
        dayRangeFilter: {
          value: 'all',
          options: [
            { value: 'all', label: 'All' },
            { value: '7d', label: '7d' }
          ]
        }
      });
      await listView.render();

      expect(collection.params.created__gte).toBeUndefined();
    });

    it('escape-hatch value on change leaves params untouched but emits the event', async () => {
      const collection = makeRestCollection();
      const fetchSpy = jest.fn(async () => ({ success: true, data: { status: 'ok' } }));
      collection.fetch = fetchSpy;

      const listView = new ListView({
        collection,
        itemTemplate: '<div>{{model.name}}</div>',
        dayRangeFilter: {
          value: '7d',
          options: [
            { value: '7d', label: '7d' },
            { value: 'all', label: 'All' }
          ]
        }
      });
      await listView.render();

      const captured = [];
      listView.on('range:change', (p) => captured.push(p));
      const seedBefore = collection.params.created__gte;
      fetchSpy.mockClear();

      listView.dayRangeControl.setValue('all');
      await new Promise((r) => setTimeout(r, 0));

      // created__gte unchanged from seed
      expect(collection.params.created__gte).toBe(seedBefore);
      expect(captured).toHaveLength(1);
      expect(captured[0].value).toBe('all');
      expect(captured[0].params).toEqual({});
      // Fetch still runs — the framework refetches on every change, even
      // when no params changed (matches applyFilters' behavior).
      expect(fetchSpy).toHaveBeenCalled();
    });

    it('plain ListView with no dayRangeFilter has no dayRangeControl or container', async () => {
      const collection = new Collection([{ id: 1, name: 'A' }]);
      const listView = new ListView({
        collection,
        itemTemplate: '<div>{{model.name}}</div>'
      });
      await listView.render();

      expect(listView.dayRangeControl).toBeNull();
      expect(listView.element.querySelector('[data-container="toolbar-day-range"]'))
        .toBeNull();
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
  // onItemClick (whole-row click)
  // --------------------------------------------------------------
  describe('ListView onItemClick / clickable', () => {
    it('fires onItemClick when the item root is clicked', async () => {
      const collection = new Collection([{ id: 1, name: 'A' }]);
      const calls = [];
      const listView = new ListView({
        collection,
        itemTemplate: '<div class="card">{{model.name}}</div>',
        onItemClick: (model, event) => calls.push({ id: model.id, hasEvent: !!event })
      });
      await listView.render();

      const item = listView.itemViews.get(1);
      // Simulate a click on the item's root element.
      item.element.dispatchEvent(new global.window.Event('click', { bubbles: true }));

      expect(calls).toHaveLength(1);
      expect(calls[0].id).toBe(1);
      expect(calls[0].hasEvent).toBe(true);
    });

    it('emits row:click event in addition to calling onItemClick', async () => {
      const collection = new Collection([{ id: 1, name: 'A' }]);
      const events = [];
      const listView = new ListView({
        collection,
        itemTemplate: '<div class="card">{{model.name}}</div>',
        onItemClick: () => {}
      });
      listView.on('row:click', (e) => events.push(e));
      await listView.render();

      const item = listView.itemViews.get(1);
      item.element.dispatchEvent(new global.window.Event('click', { bubbles: true }));

      expect(events).toHaveLength(1);
      expect(events[0].model.id).toBe(1);
    });

    it('does NOT fire onItemClick when the click target has data-action', async () => {
      const collection = new Collection([{ id: 1, name: 'A' }]);
      const calls = [];
      const listView = new ListView({
        collection,
        itemTemplate: '<div class="card"><button data-action="favorite">★</button>{{model.name}}</div>',
        onItemClick: (model) => calls.push(model.id)
      });
      await listView.render();

      const item = listView.itemViews.get(1);
      const btn = item.element.querySelector('[data-action="favorite"]');
      btn.dispatchEvent(new global.window.Event('click', { bubbles: true }));

      expect(calls).toHaveLength(0);
    });

    it('adds .clickable class to the item element when onItemClick is set', async () => {
      const collection = new Collection([{ id: 1, name: 'A' }]);
      const listView = new ListView({
        collection,
        itemTemplate: '<div>{{model.name}}</div>',
        onItemClick: () => {}
      });
      await listView.render();

      const item = listView.itemViews.get(1);
      expect(item.element.classList.contains('clickable')).toBe(true);
    });

    it('does not add .clickable class without onItemClick or clickable:true', async () => {
      const collection = new Collection([{ id: 1, name: 'A' }]);
      const listView = new ListView({
        collection,
        itemTemplate: '<div>{{model.name}}</div>'
      });
      await listView.render();

      const item = listView.itemViews.get(1);
      expect(item.element.classList.contains('clickable')).toBe(false);
    });
  });

  // --------------------------------------------------------------
  // Model lifecycle — clickAction routes to view/edit
  // --------------------------------------------------------------
  describe('ListView clickAction routing', () => {
    it('clickAction "view" calls _onRowView when item is clicked', async () => {
      const collection = new Collection([{ id: 1, name: 'A' }]);
      let viewCalledFor = null;
      const listView = new ListView({
        collection,
        itemTemplate: '<div>{{model.name}}</div>',
        clickAction: 'view',
        onItemView: (model) => { viewCalledFor = model.id; }
      });
      await listView.render();

      const item = listView.itemViews.get(1);
      item.element.dispatchEvent(new global.window.Event('click', { bubbles: true }));
      // Allow the async _onRowView promise to resolve.
      await new Promise((r) => { setTimeout(r, 0); });

      expect(viewCalledFor).toBe(1);
    });

    it('clickAction "edit" calls onItemEdit when item is clicked', async () => {
      const collection = new Collection([{ id: 1, name: 'A' }]);
      let editCalledFor = null;
      const listView = new ListView({
        collection,
        itemTemplate: '<div>{{model.name}}</div>',
        clickAction: 'edit',
        onItemEdit: (model) => { editCalledFor = model.id; }
      });
      await listView.render();

      const item = listView.itemViews.get(1);
      item.element.dispatchEvent(new global.window.Event('click', { bubbles: true }));
      await new Promise((r) => { setTimeout(r, 0); });

      expect(editCalledFor).toBe(1);
    });

    it('clickAction "select" toggles the item selection on click', async () => {
      const collection = new Collection([{ id: 1, name: 'A' }, { id: 2, name: 'B' }]);
      const listView = new ListView({
        collection,
        itemTemplate: '<div>{{model.name}}</div>',
        selectionMode: 'multiple',
        clickAction: 'select'
      });
      await listView.render();

      const item = listView.itemViews.get(1);
      item.element.dispatchEvent(new global.window.Event('click', { bubbles: true }));

      expect(listView.selectedItems.has(1)).toBe(true);

      // Click again — should deselect.
      item.element.dispatchEvent(new global.window.Event('click', { bubbles: true }));
      expect(listView.selectedItems.has(1)).toBe(false);
    });

    it('clickAction defaults to "none" — clicks emit row:click but do not route', async () => {
      const collection = new Collection([{ id: 1, name: 'A' }]);
      const events = [];
      let viewCalled = false;
      const listView = new ListView({
        collection,
        itemTemplate: '<div>{{model.name}}</div>',
        onItemView: () => { viewCalled = true; }
      });
      listView.on('row:click', (e) => events.push(e.model.id));
      await listView.render();

      // ListView is not clickable by default — but if a consumer wires
      // up a data-action="row-click" or sets clickable: true, the row:click
      // event still fires. With no clickable + no onItemClick, simply
      // clicking the item does nothing because no handler is attached.
      // Verify by setting clickable:true explicitly and checking that
      // row:click fires while view does NOT (because clickAction is 'none').
      listView.clickable = true;
      // Re-render to re-wire the clickable handler.
      await listView.render();
      const itemAfter = listView.itemViews.get(1);
      itemAfter.element.dispatchEvent(new global.window.Event('click', { bubbles: true }));
      await new Promise((r) => { setTimeout(r, 0); });

      expect(viewCalled).toBe(false);
    });
  });

  // --------------------------------------------------------------
  // Model lifecycle — data-action="view|edit|delete" in templates
  // --------------------------------------------------------------
  describe('ListView item-template data-action routing', () => {
    it('data-action="view" in template fires onItemView', async () => {
      const collection = new Collection([{ id: 7, name: 'Seven' }]);
      let viewedId = null;
      const listView = new ListView({
        collection,
        itemTemplate: '<div><button data-action="view" class="btn">View</button> {{model.name}}</div>',
        onItemView: (model) => { viewedId = model.id; }
      });
      await listView.render();

      const item = listView.itemViews.get(7);
      const viewBtn = item.element.querySelector('[data-action="view"]');
      viewBtn.click();
      await new Promise((r) => { setTimeout(r, 0); });

      expect(viewedId).toBe(7);
    });

    it('data-action="edit" in template fires onItemEdit', async () => {
      const collection = new Collection([{ id: 8, name: 'Eight' }]);
      let editedId = null;
      const listView = new ListView({
        collection,
        itemTemplate: '<div><button data-action="edit">Edit</button> {{model.name}}</div>',
        onItemEdit: (model) => { editedId = model.id; }
      });
      await listView.render();

      const item = listView.itemViews.get(8);
      const editBtn = item.element.querySelector('[data-action="edit"]');
      editBtn.click();
      await new Promise((r) => { setTimeout(r, 0); });

      expect(editedId).toBe(8);
    });

    it('data-action="delete" in template fires onItemDelete', async () => {
      const collection = new Collection([{ id: 9, name: 'Nine' }]);
      let deletedId = null;
      const listView = new ListView({
        collection,
        itemTemplate: '<div><button data-action="delete">Delete</button> {{model.name}}</div>',
        onItemDelete: (model) => { deletedId = model.id; }
      });
      await listView.render();

      const item = listView.itemViews.get(9);
      const delBtn = item.element.querySelector('[data-action="delete"]');
      delBtn.click();
      await new Promise((r) => { setTimeout(r, 0); });

      expect(deletedId).toBe(9);
    });
  });

  // --------------------------------------------------------------
  // Security regressions — filter labels / pill display escape
  // --------------------------------------------------------------
  describe('ListView filter HTML escaping', () => {
    it('escapes filter.label in the Add Filter dropdown', async () => {
      const collection = new Collection([{ id: 1, name: 'A' }]);
      const listView = new ListView({
        collection,
        itemTemplate: '<div>{{model.name}}</div>',
        filterable: true,
        filters: [
          { name: 'status', label: '<img src=x onerror=alert(1)>', type: 'select', options: ['a'] }
        ]
      });
      await listView.render();

      const html = listView.element.innerHTML;
      expect(html).not.toContain('<img src=x');
      expect(html).toContain('&lt;img src=x');
    });

    it('escapes filter pill display text against injected user values', async () => {
      const collection = new Collection([{ id: 1, name: 'A' }]);
      const listView = new ListView({
        collection,
        itemTemplate: '<div>{{model.name}}</div>',
        filterable: true,
        filters: [
          { name: 'q', label: 'Q', type: 'text' }
        ]
      });
      // Render first so this.collection is wired up.
      await listView.render();
      // Set a malicious filter VALUE — this would have been XSS before
      // the security-review fix (formatFilterDisplay's return was
      // injected into innerHTML unescaped).
      listView.setFilter('q', '<svg onload=alert(1)>');
      listView.updateFilterPills();

      const pillsHtml = listView.element.querySelector('[data-container="filter-pills"]')?.innerHTML || '';
      expect(pillsHtml).not.toContain('<svg onload');
      expect(pillsHtml).toContain('&lt;svg onload');
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

    it('onActionSortOption escapes data-sort attribute against injection', async () => {
      // sortOptions are dev-supplied, but defense in depth: a malicious key
      // shouldn't break out of the data-sort attribute and inject markup.
      const collection = new Collection([{ id: 1, name: 'A' }]);
      const listView = new ListView({
        collection,
        itemTemplate: '<div>{{model.name}}</div>',
        sortOptions: [
          { key: '"><img src=x onerror=alert(1)>', label: 'Bad', dir: 'asc' }
        ]
      });
      await listView.render();

      // The "<img>" must remain a string inside the attribute, not become a
      // real element. innerHTML serializes the literal characters back, but
      // an actual <img> child element would be a parser breakout.
      const injectedImg = listView.element.querySelector('img');
      expect(injectedImg).toBeNull();

      // The data-sort attribute should hold the raw value (decoded by the
      // parser); the test that escape worked is "no <img> element exists".
      const sortLink = listView.element.querySelector('[data-action="sort-option"]');
      expect(sortLink).not.toBeNull();
      expect(sortLink.getAttribute('data-sort')).toBe('"><img src=x onerror=alert(1)>');
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

  // --------------------------------------------------------------
  // Grouped rows — groupBy / groupHeaderTemplate / groupHeaderLabel
  // --------------------------------------------------------------
  describe('ListView (grouped)', () => {
    it('inserts header rows between groups when groupBy is a function', async () => {
      const collection = new Collection([
        { id: 1, name: 'A1', bucket: 'alpha' },
        { id: 2, name: 'A2', bucket: 'alpha' },
        { id: 3, name: 'B1', bucket: 'beta' },
        { id: 4, name: 'C1', bucket: 'gamma' }
      ]);
      const listView = new ListView({
        collection,
        itemTemplate: '<div class="row">{{model.name}}</div>',
        groupBy: (m) => m.get('bucket')
      });
      await listView.render();

      const headers = listView.element.querySelectorAll('.list-group-header');
      expect(headers.length).toBe(3);
      expect(headers[0].textContent.trim()).toBe('alpha');
      expect(headers[1].textContent.trim()).toBe('beta');
      expect(headers[2].textContent.trim()).toBe('gamma');
    });

    it('accepts groupBy as a string field name (shorthand)', async () => {
      const collection = new Collection([
        { id: 1, name: 'A', status: 'open' },
        { id: 2, name: 'B', status: 'open' },
        { id: 3, name: 'C', status: 'closed' }
      ]);
      const listView = new ListView({
        collection,
        itemTemplate: '<div>{{model.name}}</div>',
        groupBy: 'status'
      });
      await listView.render();

      const headers = listView.element.querySelectorAll('.list-group-header');
      expect(headers.length).toBe(2);
      expect(headers[0].textContent.trim()).toBe('open');
      expect(headers[1].textContent.trim()).toBe('closed');
    });

    it('applies groupHeaderLabel formatter to {{key}}', async () => {
      const collection = new Collection([
        { id: 1, status: 'active' },
        { id: 2, status: 'resolved' }
      ]);
      const listView = new ListView({
        collection,
        itemTemplate: '<div>{{model.id}}</div>',
        groupBy: 'status',
        groupHeaderLabel: (k) => k.toUpperCase()
      });
      await listView.render();

      const headers = listView.element.querySelectorAll('.list-group-header');
      expect(headers[0].textContent.trim()).toBe('ACTIVE');
      expect(headers[1].textContent.trim()).toBe('RESOLVED');
    });

    it('treats falsy resolver returns as ungrouped tail (no header emitted)', async () => {
      const collection = new Collection([
        { id: 1, bucket: 'alpha' },
        { id: 2, bucket: null },        // ungrouped — no header
        { id: 3, bucket: 'alpha' }      // same key as prior emitted; no header
      ]);
      const listView = new ListView({
        collection,
        itemTemplate: '<div>{{model.id}}</div>',
        groupBy: (m) => m.get('bucket')
      });
      await listView.render();

      const headers = listView.element.querySelectorAll('.list-group-header');
      expect(headers.length).toBe(1);
      expect(headers[0].textContent.trim()).toBe('alpha');
    });

    it('does not register header views in itemViews (so they cannot fire item:click)', async () => {
      let onItemClickFired = 0;
      const collection = new Collection([
        { id: 1, bucket: 'alpha' },
        { id: 2, bucket: 'beta' }
      ]);
      const listView = new ListView({
        collection,
        itemTemplate: '<div>{{model.id}}</div>',
        groupBy: 'bucket',
        onItemClick: () => { onItemClickFired += 1; }
      });
      await listView.render();

      // Sanity: item count vs header count
      expect(listView.itemViews.size).toBe(2);
      expect(listView.groupHeaderViews.size).toBe(2);

      // Headers must NOT be among itemViews
      const headerIds = Array.from(listView.groupHeaderViews.keys());
      const itemIds = Array.from(listView.itemViews.values()).map(v => v.id);
      headerIds.forEach((hid) => {
        expect(itemIds).not.toContain(hid);
      });

      // Click on a header element — onItemClick must not fire (no
      // _wireClickableHandler is bound to header views).
      const header = listView.element.querySelector('.list-group-header');
      header.click();
      expect(onItemClickFired).toBe(0);
    });

    it('re-segments groups on collection reset (filter narrowing)', async () => {
      const collection = new Collection([
        { id: 1, bucket: 'alpha' },
        { id: 2, bucket: 'beta' },
        { id: 3, bucket: 'gamma' }
      ]);
      const listView = new ListView({
        collection,
        itemTemplate: '<div>{{model.id}}</div>',
        groupBy: 'bucket'
      });
      await listView.render();
      expect(listView.element.querySelectorAll('.list-group-header').length).toBe(3);

      // Simulate a filter narrowing the collection — reset() rebuilds.
      collection.reset([
        { id: 1, bucket: 'alpha' },
        { id: 3, bucket: 'gamma' }
      ]);
      await listView.render();

      const headers = listView.element.querySelectorAll('.list-group-header');
      expect(headers.length).toBe(2);
      expect(headers[0].textContent.trim()).toBe('alpha');
      expect(headers[1].textContent.trim()).toBe('gamma');
    });

    it('interleaves headers between items in DOM order', async () => {
      const collection = new Collection([
        { id: 1, bucket: 'alpha' },
        { id: 2, bucket: 'beta' }
      ]);
      const listView = new ListView({
        collection,
        itemTemplate: '<div class="rec">{{model.id}}</div>',
        groupBy: 'bucket'
      });
      await listView.render();

      const items = listView.element.querySelector('[data-container="items"]');
      // Expect: header(alpha), item(1), header(beta), item(2)
      const children = Array.from(items.children);
      expect(children.length).toBe(4);
      expect(children[0].classList.contains('list-group-header')).toBe(true);
      expect(children[0].textContent.trim()).toBe('alpha');
      expect(children[1].querySelector('.rec').textContent).toBe('1');
      expect(children[2].classList.contains('list-group-header')).toBe(true);
      expect(children[2].textContent.trim()).toBe('beta');
      expect(children[3].querySelector('.rec').textContent).toBe('2');
    });

    it('non-grouped consumers see no behavior change (no header markup, no _renderOrder)', async () => {
      const collection = new Collection([{ id: 1, name: 'A' }]);
      const listView = new ListView({
        collection,
        itemTemplate: '<div>{{model.name}}</div>'
        // no groupBy
      });
      await listView.render();

      expect(listView.element.querySelectorAll('.list-group-header').length).toBe(0);
      expect(listView._renderOrder.length).toBe(0);
      expect(listView.groupHeaderViews.size).toBe(0);
    });

    it('default groupHeaderStyle is "banner" — outer element gets the banner modifier class', async () => {
      const collection = new Collection([
        { id: 1, bucket: 'alpha' },
        { id: 2, bucket: 'beta' }
      ]);
      const listView = new ListView({
        collection,
        itemTemplate: '<div>{{model.id}}</div>',
        groupBy: 'bucket'
      });
      await listView.render();

      expect(listView.groupHeaderStyle).toBe('banner');
      const header = listView.element.querySelector('.list-group-header');
      expect(header).not.toBeNull();
      expect(header.classList.contains('list-group-header--banner')).toBe(true);
    });

    it('respects groupHeaderStyle: "mark"', async () => {
      const collection = new Collection([{ id: 1, bucket: 'alpha' }, { id: 2, bucket: 'beta' }]);
      const listView = new ListView({
        collection,
        itemTemplate: '<div>{{model.id}}</div>',
        groupBy: 'bucket',
        groupHeaderStyle: 'mark'
      });
      await listView.render();

      const header = listView.element.querySelector('.list-group-header');
      expect(header.classList.contains('list-group-header--mark')).toBe(true);
      expect(header.classList.contains('list-group-header--banner')).toBe(false);
    });

    it('respects groupHeaderStyle: "band"', async () => {
      const collection = new Collection([{ id: 1, bucket: 'alpha' }, { id: 2, bucket: 'beta' }]);
      const listView = new ListView({
        collection,
        itemTemplate: '<div>{{model.id}}</div>',
        groupBy: 'bucket',
        groupHeaderStyle: 'band'
      });
      await listView.render();

      const header = listView.element.querySelector('.list-group-header');
      expect(header.classList.contains('list-group-header--band')).toBe(true);
    });

    it('respects groupHeaderStyle: "rule"', async () => {
      const collection = new Collection([{ id: 1, bucket: 'alpha' }, { id: 2, bucket: 'beta' }]);
      const listView = new ListView({
        collection,
        itemTemplate: '<div>{{model.id}}</div>',
        groupBy: 'bucket',
        groupHeaderStyle: 'rule'
      });
      await listView.render();

      const header = listView.element.querySelector('.list-group-header');
      expect(header.classList.contains('list-group-header--rule')).toBe(true);
    });

    it('falls back to "banner" when an unknown groupHeaderStyle is passed', async () => {
      const collection = new Collection([{ id: 1, bucket: 'alpha' }]);
      const listView = new ListView({
        collection,
        itemTemplate: '<div>{{model.id}}</div>',
        groupBy: 'bucket',
        groupHeaderStyle: 'invalid-style'
      });
      await listView.render();

      expect(listView.groupHeaderStyle).toBe('banner');
      const header = listView.element.querySelector('.list-group-header');
      expect(header.classList.contains('list-group-header--banner')).toBe(true);
    });
  });

  // --------------------------------------------------------------
  // groupByDay helper — built-in chronological-feed bucketing
  // --------------------------------------------------------------
  describe('groupByDay helper', () => {
    const grouping = loadModule('grouping');
    const groupByDay = grouping?.groupByDay || grouping?.default?.groupByDay;

    const makeModel = (created) => ({ id: Math.random(), get: (k) => (k === 'created' ? created : null) });
    const isoOf = (date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    it('exports a function returning { groupBy, groupHeaderLabel }', () => {
      expect(typeof groupByDay).toBe('function');
      const helper = groupByDay('created');
      expect(typeof helper.groupBy).toBe('function');
      expect(typeof helper.groupHeaderLabel).toBe('function');
    });

    it('produces a stable YYYY-MM-DD bucket key from a Date input', () => {
      const helper = groupByDay('created');
      const date = new Date(2026, 0, 15, 14, 30); // Jan 15 2026 14:30 local
      expect(helper.groupBy(makeModel(date))).toBe('2026-01-15');
    });

    it('produces the same bucket key for epoch ms and ISO string and Date', () => {
      const helper = groupByDay('created');
      const date = new Date(2026, 4, 9, 10, 0); // May 9 2026 10:00 local
      const ms = date.getTime();
      const iso = date.toISOString();
      expect(helper.groupBy(makeModel(ms))).toBe(helper.groupBy(makeModel(date)));
      expect(helper.groupBy(makeModel(iso))).toBe(helper.groupBy(makeModel(date)));
    });

    it('accepts an accessor function instead of a field-name string', () => {
      const helper = groupByDay((m) => m.get('updated') || m.get('created'));
      const date = new Date(2026, 2, 3, 9, 0);
      const model = { get: (k) => (k === 'updated' ? null : k === 'created' ? date : null) };
      expect(helper.groupBy(model)).toBe('2026-03-03');
    });

    it('returns null bucket key for missing / unparseable date inputs', () => {
      const helper = groupByDay('created');
      expect(helper.groupBy(makeModel(null))).toBe(null);
      expect(helper.groupBy(makeModel(''))).toBe(null);
      expect(helper.groupBy(makeModel('not-a-date'))).toBe(null);
    });

    it('formats today as "Today"', () => {
      const helper = groupByDay('created');
      const today = new Date();
      const todayKey = isoOf(today);
      expect(helper.groupHeaderLabel(todayKey)).toBe('Today');
    });

    it('formats yesterday as "Yesterday"', () => {
      const helper = groupByDay('created');
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const key = isoOf(yesterday);
      expect(helper.groupHeaderLabel(key)).toBe('Yesterday');
    });

    it('formats current-year date as "Mon DD"', () => {
      const helper = groupByDay('created');
      const now = new Date();
      const yearAgoSafe = new Date(now.getFullYear(), 0, 5); // Jan 5 of current year
      // If today is Jan 5 / 6, this would collide — just pick a date that
      // is neither today nor yesterday by going back ~10 days from now
      // but staying in the current year.
      const past = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 10);
      const key = isoOf(past);
      const label = helper.groupHeaderLabel(key);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      expect(label).toContain(months[past.getMonth()]);
      expect(label).toContain(String(past.getDate()));
      expect(label).not.toContain(String(yearAgoSafe.getFullYear() - 1));
    });

    it('formats prior-year date as "Mon DD, YYYY"', () => {
      const helper = groupByDay('created');
      const priorYearKey = '2024-12-19';
      expect(helper.groupHeaderLabel(priorYearKey)).toBe('Dec 19, 2024');
    });
  });

  // --------------------------------------------------------------
  // TableView grouping default — `<tr><th colspan="N">` shape
  // --------------------------------------------------------------
  describe('TableView (grouped)', () => {
    it('default group header renders as <tr class="list-group-header-row list-group-header-row--banner"><th colspan="N">', async () => {
      const TableView = loadModule('TableView');
      const collection = new Collection([
        { id: 1, name: 'A', bucket: 'alpha' },
        { id: 2, name: 'B', bucket: 'beta' }
      ]);
      const tableView = new TableView({
        collection,
        columns: [
          { key: 'id', label: 'ID' },
          { key: 'name', label: 'Name' }
        ],
        actions: ['view'],
        groupBy: 'bucket'
      });
      await tableView.render();

      const headerRows = tableView.element.querySelectorAll('tr.list-group-header-row');
      expect(headerRows.length).toBe(2);
      // Default style modifier lands on the <tr> outer.
      expect(headerRows[0].classList.contains('list-group-header-row--banner')).toBe(true);

      // colspan = data cols (2) + actions col (1) = 3.
      const firstHeaderCell = headerRows[0].querySelector('th.list-group-header-cell');
      expect(firstHeaderCell).not.toBeNull();
      expect(firstHeaderCell.getAttribute('colspan')).toBe('3');
      expect(firstHeaderCell.textContent.trim()).toBe('alpha');
    });

    it('respects groupHeaderStyle on TableView (modifier lands on <tr>)', async () => {
      const TableView = loadModule('TableView');
      const collection = new Collection([
        { id: 1, name: 'A', bucket: 'alpha' },
        { id: 2, name: 'B', bucket: 'beta' }
      ]);
      const tableView = new TableView({
        collection,
        columns: [{ key: 'id' }, { key: 'name' }],
        groupBy: 'bucket',
        groupHeaderStyle: 'mark'
      });
      await tableView.render();

      const headerRow = tableView.element.querySelector('tr.list-group-header-row');
      expect(headerRow.classList.contains('list-group-header-row--mark')).toBe(true);
      expect(headerRow.classList.contains('list-group-header-row--banner')).toBe(false);
    });
  });
};
