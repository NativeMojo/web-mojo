/**
 * Unit tests for TablePage component
 */

module.exports = async function(describe, it, expect) {
  const { JSDOM } = require('jsdom');
  const moduleLoader = require('../utils/simple-module-loader');
  
  // Load modules
  const TablePage = await moduleLoader.loadModuleFromFile('src/components/TablePage.js');
  const Table = await moduleLoader.loadModuleFromFile('src/components/Table.js');
  
  let dom;
  let document;
  let window;
  let container;
  let originalWindow;
  let originalDocument;

  function beforeEach() {
    // Setup DOM environment
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <div id="app"></div>
        </body>
      </html>
    `, { 
      url: 'http://localhost:3000/',
      pretendToBeVisual: true,
      resources: 'usable'
    });

    document = dom.window.document;
    window = dom.window;
    container = document.getElementById('app');

    // Save original globals
    originalWindow = global.window;
    originalDocument = global.document;

    // Set globals
    global.window = window;
    global.document = document;
    global.history = window.history;
    global.location = window.location;
    global.URLSearchParams = window.URLSearchParams;

    // Mock MOJO router
    window.MOJO = {
      router: {
        navigate: () => {},
        getCurrentPath: () => '/',
        getCurrentQuery: () => ({})
      }
    };
  }

  function afterEach() {
    // Restore globals
    global.window = originalWindow;
    global.document = originalDocument;
    
    // Cleanup
    if (dom) {
      dom.window.close();
    }
  }

  describe('TablePage', () => {
    describe('Construction', () => {
      it('should create a TablePage instance with default options', () => {
        beforeEach();
        
        const page = new TablePage();
        
        expect(page).toBeInstanceOf(TablePage);
        expect(page.tableConfig).toBeDefined();
        expect(page.urlConfig).toBeDefined();
        expect(page.currentState).toBeDefined();
        expect(page.table).toBe(null);
        
        afterEach();
      });

      it('should accept custom table configuration', () => {
        beforeEach();
        
        const columns = [
          { key: 'id', label: 'ID' },
          { key: 'name', label: 'Name' }
        ];
        
        const page = new TablePage({
          columns: columns,
          itemsPerPage: 25,
          selectable: true
        });
        
        expect(page.tableConfig.columns).toEqual(columns);
        expect(page.currentState.perPage).toBe(25);
        expect(page.tableConfig.selectable).toBe(true);
        
        afterEach();
      });

      it('should accept custom URL configuration', () => {
        beforeEach();
        
        const page = new TablePage({
          urlOptions: {
            pageParam: 'p',
            sortParam: 's',
            updateUrl: false,
            debounceDelay: 500
          }
        });
        
        expect(page.urlConfig.pageParam).toBe('p');
        expect(page.urlConfig.sortParam).toBe('s');
        expect(page.urlConfig.updateUrl).toBe(false);
        expect(page.urlConfig.debounceDelay).toBe(500);
        
        afterEach();
      });
    });

    describe('URL Parameter Parsing', () => {
      it('should parse URL parameters correctly', () => {
        beforeEach();
        
        const page = new TablePage();
        
        const query = {
          page: '2',
          sort: 'name',
          dir: 'desc',
          search: 'test',
          per_page: '25',
          filter_status: 'active',
          filter_category: 'tech'
        };
        
        const state = page.parseUrlParams(query);
        
        expect(state.page).toBe(2);
        expect(state.sort).toBe('name');
        expect(state.dir).toBe('desc');
        expect(state.search).toBe('test');
        expect(state.perPage).toBe(25);
        expect(state.filters.status).toBe('active');
        expect(state.filters.category).toBe('tech');
        
        afterEach();
      });

      it('should use defaults for missing parameters', () => {
        beforeEach();
        
        const page = new TablePage({ itemsPerPage: 20 });
        
        const state = page.parseUrlParams({});
        
        expect(state.page).toBe(1);
        expect(state.sort).toBe(null);
        expect(state.dir).toBe('asc');
        expect(state.search).toBe('');
        expect(state.perPage).toBe(20);
        expect(Object.keys(state.filters).length).toBe(0);
        
        afterEach();
      });

      it('should handle custom parameter names', () => {
        beforeEach();
        
        const page = new TablePage({
          urlOptions: {
            pageParam: 'p',
            sortParam: 's',
            dirParam: 'd',
            searchParam: 'q',
            filterPrefix: 'f_'
          }
        });
        
        const query = {
          p: '3',
          s: 'email',
          d: 'asc',
          q: 'search term',
          f_type: 'user'
        };
        
        const state = page.parseUrlParams(query);
        
        expect(state.page).toBe(3);
        expect(state.sort).toBe('email');
        expect(state.dir).toBe('asc');
        expect(state.search).toBe('search term');
        expect(state.filters.type).toBe('user');
        
        afterEach();
      });
    });

    describe('URL Updates', () => {
      it('should update URL with new state', () => {
        beforeEach();
        
        // Mock history methods
        let pushedUrl = '';
        window.history.pushState = (state, title, url) => {
          pushedUrl = url;
        };
        
        const page = new TablePage({
          urlOptions: { updateUrl: true }
        });
        
        page.updateUrl({
          page: 2,
          sort: 'name',
          dir: 'desc'
        });
        
        expect(pushedUrl).toContain('page=2');
        expect(pushedUrl).toContain('sort=name');
        expect(pushedUrl).toContain('dir=desc');
        
        afterEach();
      });

      it('should not include default values in URL', () => {
        beforeEach();
        
        let pushedUrl = '';
        window.history.pushState = (state, title, url) => {
          pushedUrl = url;
        };
        
        const page = new TablePage({
          urlOptions: { updateUrl: true }
        });
        
        page.updateUrl({
          page: 1,
          sort: null,
          dir: 'asc',
          search: '',
          perPage: 10
        });
        
        expect(pushedUrl).not.toContain('page=1');
        expect(pushedUrl).not.toContain('sort=');
        expect(pushedUrl).not.toContain('search=');
        expect(pushedUrl).not.toContain('per_page=10');
        
        afterEach();
      });

      it('should use replaceState when configured', () => {
        beforeEach();
        
        let replaceCalled = false;
        let pushCalled = false;
        
        window.history.replaceState = () => {
          replaceCalled = true;
        };
        window.history.pushState = () => {
          pushCalled = true;
        };
        
        const page = new TablePage({
          urlOptions: { 
            updateUrl: true,
            replaceState: true 
          }
        });
        
        page.updateUrl({ page: 3 });
        
        expect(replaceCalled).toBe(true);
        expect(pushCalled).toBe(false);
        
        afterEach();
      });

      it('should not update URL when disabled', () => {
        beforeEach();
        
        let called = false;
        window.history.pushState = () => {
          called = true;
        };
        window.history.replaceState = () => {
          called = true;
        };
        
        const page = new TablePage({
          urlOptions: { updateUrl: false }
        });
        
        page.updateUrl({ page: 2 });
        
        expect(called).toBe(false);
        
        afterEach();
      });

      it('should handle filters in URL', () => {
        beforeEach();
        
        let pushedUrl = '';
        window.history.pushState = (state, title, url) => {
          pushedUrl = url;
        };
        
        const page = new TablePage({
          urlOptions: { updateUrl: true }
        });
        
        page.updateUrl({
          filters: {
            status: 'active',
            category: 'tech',
            empty: ''
          }
        });
        
        expect(pushedUrl).toContain('filter_status=active');
        expect(pushedUrl).toContain('filter_category=tech');
        expect(pushedUrl).not.toContain('filter_empty');
        
        afterEach();
      });
    });

    describe('Table State Application', () => {
      it('should apply state to table instance', () => {
        beforeEach();
        
        const page = new TablePage();
        
        // Create mock table
        let renderCalled = false;
        page.table = {
          currentPage: 1,
          itemsPerPage: 10,
          sortBy: null,
          sortDirection: 'asc',
          activeFilters: {},
          collection: null,
          render: () => { renderCalled = true; }
        };
        
        const state = {
          page: 3,
          perPage: 25,
          sort: 'name',
          dir: 'desc',
          search: 'test',
          filters: { status: 'active' }
        };
        
        page.applyStateToTable(state);
        
        expect(page.table.currentPage).toBe(3);
        expect(page.table.itemsPerPage).toBe(25);
        expect(page.table.sortBy).toBe('name');
        expect(page.table.sortDirection).toBe('desc');
        expect(page.table.activeFilters.search).toBe('test');
        expect(page.table.activeFilters.status).toBe('active');
        expect(renderCalled).toBe(true);
        
        afterEach();
      });

      it('should fetch data for REST-enabled collections', () => {
        beforeEach();
        
        const page = new TablePage();
        
        // Create mock table with REST collection
        let fetchCalled = false;
        let renderCalled = false;
        
        page.table = {
          currentPage: 1,
          itemsPerPage: 10,
          sortBy: null,
          sortDirection: 'asc',
          activeFilters: {},
          collection: { restEnabled: true },
          fetchWithCurrentFilters: () => { fetchCalled = true; },
          render: () => { renderCalled = true; }
        };
        
        const state = {
          page: 2,
          sort: 'name',
          dir: 'asc'
        };
        
        page.applyStateToTable(state);
        
        expect(fetchCalled).toBe(true);
        expect(renderCalled).toBe(false);
        
        afterEach();
      });

      it('should not apply state when table is null', () => {
        beforeEach();
        
        const page = new TablePage();
        page.table = null;
        
        // Should not throw
        let error = null;
        try {
          page.applyStateToTable({ page: 2 });
        } catch (e) {
          error = e;
        }
        
        expect(error).toBe(null);
        
        afterEach();
      });
    });

    describe('Event Handlers', () => {
      it('should handle page change events', () => {
        beforeEach();
        
        const page = new TablePage();
        let updateUrlCalled = false;
        let updateUrlArg = null;
        
        page.updateUrl = (arg) => {
          updateUrlCalled = true;
          updateUrlArg = arg;
        };
        
        page.table = { currentPage: 3 };
        
        const event = { detail: { page: 3 } };
        
        page.handleTablePageChange(event);
        
        expect(updateUrlCalled).toBe(true);
        expect(updateUrlArg.page).toBe(3);
        
        afterEach();
      });

      it('should handle sort change events', () => {
        beforeEach();
        
        const page = new TablePage();
        let updateUrlCalled = false;
        let updateUrlArg = null;
        
        page.updateUrl = (arg) => {
          updateUrlCalled = true;
          updateUrlArg = arg;
        };
        
        page.table = { sortBy: 'name', sortDirection: 'desc' };
        
        const event = { detail: { field: 'name', direction: 'desc' } };
        
        page.handleTableSort(event);
        
        expect(updateUrlCalled).toBe(true);
        expect(updateUrlArg.sort).toBe('name');
        expect(updateUrlArg.dir).toBe('desc');
        expect(updateUrlArg.page).toBe(1);
        
        afterEach();
      });

      it('should handle sort clear events', () => {
        beforeEach();
        
        const page = new TablePage();
        let updateUrlCalled = false;
        let updateUrlArg = null;
        
        page.updateUrl = (arg) => {
          updateUrlCalled = true;
          updateUrlArg = arg;
        };
        
        const event = { detail: { field: null, direction: 'none' } };
        
        page.handleTableSort(event);
        
        expect(updateUrlCalled).toBe(true);
        expect(updateUrlArg.sort).toBe(null);
        expect(updateUrlArg.dir).toBe('asc');
        expect(updateUrlArg.page).toBe(1);
        
        afterEach();
      });

      it('should handle filter change events', () => {
        beforeEach();
        
        const page = new TablePage();
        let updateUrlCalled = false;
        let updateUrlArg = null;
        
        page.updateUrl = (arg) => {
          updateUrlCalled = true;
          updateUrlArg = arg;
        };
        
        page.table = {
          activeFilters: {
            search: 'test',
            status: 'active',
            category: 'tech'
          }
        };
        
        const event = {
          detail: {
            filters: {
              search: 'test',
              status: 'active',
              category: 'tech'
            }
          }
        };
        
        page.handleTableFilter(event);
        
        expect(updateUrlCalled).toBe(true);
        expect(updateUrlArg.filters.status).toBe('active');
        expect(updateUrlArg.filters.category).toBe('tech');
        expect(updateUrlArg.search).toBe('test');
        expect(updateUrlArg.page).toBe(1);
        
        afterEach();
      });

      it('should handle per page change events', () => {
        beforeEach();
        
        const page = new TablePage();
        let updateUrlCalled = false;
        let updateUrlArg = null;
        
        page.updateUrl = (arg) => {
          updateUrlCalled = true;
          updateUrlArg = arg;
        };
        
        page.table = { itemsPerPage: 25 };
        
        const event = { detail: { perPage: 25 } };
        
        page.handleTablePerPageChange(event);
        
        expect(updateUrlCalled).toBe(true);
        expect(updateUrlArg.perPage).toBe(25);
        expect(updateUrlArg.page).toBe(1);
        
        afterEach();
      });
    });

    describe('Public Methods', () => {
      it('should get selected items', () => {
        beforeEach();
        
        const page = new TablePage();
        const selectedItems = [{ id: 1 }, { id: 2 }];
        
        page.table = {
          getSelectedItems: () => selectedItems
        };
        
        const result = page.getSelectedItems();
        
        expect(result).toEqual(selectedItems);
        
        afterEach();
      });

      it('should return empty array when table is null', () => {
        beforeEach();
        
        const page = new TablePage();
        page.table = null;
        
        const result = page.getSelectedItems();
        
        expect(result.length).toBe(0);
        
        afterEach();
      });

      it('should clear selection', () => {
        beforeEach();
        
        const page = new TablePage();
        let clearCalled = false;
        
        page.table = {
          clearSelection: () => { clearCalled = true; }
        };
        
        page.clearSelection();
        
        expect(clearCalled).toBe(true);
        
        afterEach();
      });

      it('should handle clearSelection when table is null', () => {
        beforeEach();
        
        const page = new TablePage();
        page.table = null;
        
        // Should not throw
        let error = null;
        try {
          page.clearSelection();
        } catch (e) {
          error = e;
        }
        
        expect(error).toBe(null);
        
        afterEach();
      });
    });

    describe('Static Methods', () => {
      it('should create instance with factory method', () => {
        beforeEach();
        
        const page = TablePage.create({
          columns: [{ key: 'test', label: 'Test' }]
        });
        
        expect(page).toBeInstanceOf(TablePage);
        expect(page.tableConfig.columns.length).toBe(1);
        expect(page.tableConfig.columns[0].key).toBe('test');
        
        afterEach();
      });
    });
  });
};