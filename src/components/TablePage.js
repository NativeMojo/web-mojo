/**
 * TablePage - Page component that manages a TableView with URL parameter synchronization
 *
 * A clean, simplified implementation using the new TableView component.
 * Automatically syncs pagination, sorting, and filtering with URL parameters.
 *
 * @example
 * const usersPage = new TablePage({
 *   pageName: 'users',
 *   title: 'User Management',
 *   collection: userCollection,
 *   columns: [
 *     { key: 'name', label: 'Name', sortable: true },
 *     { key: 'email', label: 'Email' },
 *     { key: 'role', label: 'Role', type: 'badge' }
 *   ],
 *   actions: ['view', 'edit', 'delete']
 * });
 */

import Page from '../core/Page.js';
import TableView from './TableView.js';
import Collection from '../core/Collection.js';

class TablePage extends Page {
  constructor(options = {}) {
    super({
      ...options,
      pageName: options.pageName || options.name || 'table'
    });

    // Page configuration
    this.title = options.title || this.pageName;
    this.description = options.description || '';

    // Collection setup
    this.Collection = options.Collection || null;
    this.collection = options.collection || null;

    // Table configuration
    this.tableConfig = {
      columns: options.columns || [],
      actions: options.actions || null,
      contextMenu: options.contextMenu || null,
      batchActions: options.batchActions || options.tableOptions?.batchActions || null,
      selectionMode: options.selectionMode || (options.selectable ? 'multiple' : 'none'),

      // Features
      searchable: options.searchable !== false,
      sortable: options.sortable !== false,
      filterable: options.filterable !== false,
      paginated: options.paginated !== false,

      // Display options
      tableOptions: {
        striped: true,
        bordered: false,
        hover: true,
        responsive: false,
        ...options.tableOptions
      },

      // Additional options
      emptyMessage: options.emptyMessage || 'No data available',
      searchPlaceholder: options.searchPlaceholder || 'Search...',
      showAdd: options.showAdd !== false,
      showExport: options.showExport !== false,

      // Form configurations
      formFields: options.formFields || options.formCreate || null,
      formEdit: options.formEdit || options.formFields || null,

      // Custom handlers
      onItemView: options.onItemView,
      onItemEdit: options.onItemEdit,
      onItemDelete: options.onItemDelete,
      onAdd: options.onAdd,
      onExport: options.onExport,

      ...options.tableViewOptions
    };

    // URL synchronization
    this.urlSyncEnabled = options.urlSyncEnabled !== false;
    this._isUpdatingUrl = false;

    // Status tracking
    this.lastUpdated = null;
    this.isLoading = false;

    // Set up template
    this.template = options.template || this.buildTemplate();
  }

  /**
   * Build the page template
   */
  buildTemplate() {
    return `
      <div class="table-page">
        {{#title}}
          <div class="page-header mb-4">
            <h1>{{title}}</h1>
            {{#description}}
              <p class="text-muted">{{description}}</p>
            {{/description}}
          </div>
        {{/title}}

        {{#showStatus}}
          <div class="page-status mb-3">
            <div class="row">
              <div class="col">
                <span class="text-muted">
                  <i class="bi bi-clock me-1"></i>
                  Last updated: <span data-status="last-updated">{{lastUpdated}}</span>
                </span>
              </div>
              <div class="col text-end">
                <span class="text-muted">
                  <i class="bi bi-list-ol me-1"></i>
                  Total records: <span data-status="record-count">0</span>
                </span>
              </div>
            </div>
          </div>
        {{/showStatus}}

        <div data-container="table"></div>
      </div>
    `;
  }

  /**
   * Initialize the page
   */
  async onInit() {
    await super.onInit();

    // Create collection if needed
    if (!this.collection) {
      if (this.Collection) {
        this.collection = new this.Collection();
      } else {
        this.collection = new Collection();
      }
    }

    // Create TableView instance
    this.tableView = new TableView({
      collection: this.collection,
      containerId: 'table',
      ...this.tableConfig
    });

    // Add as child view
    this.addChild(this.tableView);

    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Listen for collection changes to sync URL
    if (this.urlSyncEnabled && this.collection) {
      // Sync URL when collection params change
      this.collection.on('fetch:start', () => {
        this.isLoading = true;
        this.syncUrlWithTable();
      });

      this.collection.on('fetch:end', () => {
        this.isLoading = false;
        this.lastUpdated = new Date().toLocaleTimeString();
        this.updateStatusDisplay();
      });
    }

    // Listen for table events
    this.tableView.on('table:search', ({ searchTerm }) => {
      if (this.collection) {
        this.collection.setParams({
          ...this.collection.params,
          search: searchTerm || undefined
        });
        this.syncUrlWithTable();
      }
    });

    this.tableView.on('table:sort', ({ field }) => {
      this.syncUrlWithTable();
    });

    this.tableView.on('table:page', ({ page }) => {
      this.syncUrlWithTable();
    });

    // Row action events
    this.tableView.on('row:view', async ({ model }) => {
      if (this.tableConfig.onItemView) {
        await this.tableConfig.onItemView(model);
      }
    });

    this.tableView.on('row:edit', async ({ model }) => {
      if (this.tableConfig.onItemEdit) {
        await this.tableConfig.onItemEdit(model);
      }
    });

    this.tableView.on('row:delete', async ({ model }) => {
      if (this.tableConfig.onItemDelete) {
        await this.tableConfig.onItemDelete(model);
      }
    });

    // Table action events
    this.tableView.on('table:add', async () => {
      if (this.tableConfig.onAdd) {
        await this.tableConfig.onAdd();
      }
    });

    this.tableView.on('table:export', async ({ data }) => {
      if (this.tableConfig.onExport) {
        await this.tableConfig.onExport(data);
      }
    });
  }

  /**
   * Handle page parameters
   */
  onParams(params = {}, query = {}) {
    super.onParams(params, query);

    // Apply URL parameters to collection if not currently updating URL
    if (this.collection && !this._isUpdatingUrl) {
      this.applyUrlToCollection(query);
    }
  }

  /**
   * Apply URL parameters to collection
   */
  applyUrlToCollection(query) {
    const params = {};

    // Pagination
    if (query.start !== undefined) params.start = parseInt(query.start) || 0;
    if (query.size !== undefined) params.size = parseInt(query.size) || 10;

    // Sorting
    if (query.sort !== undefined) params.sort = query.sort;

    // Search
    if (query.search !== undefined) params.search = query.search;

    // All other params are filters
    Object.entries(query).forEach(([key, value]) => {
      if (!['start', 'size', 'sort', 'search', 'page'].includes(key) && value) {
        params[key] = value;
      }
    });

    // Update collection params
    if (Object.keys(params).length > 0) {
      this.collection.setParams({
        ...this.collection.params,
        ...params
      });

      // Fetch if REST enabled
      if (this.collection.restEnabled) {
        this.collection.fetch();
      } else {
        // Re-render for local collections
        this.tableView.render();
      }
    }
  }

  /**
   * Sync URL with current table state
   */
  syncUrlWithTable() {
    if (!this.urlSyncEnabled || !this.collection || !this.app?.router || this._isUpdatingUrl) {
      return;
    }

    // Get current URL params
    const currentUrl = new URL(window.location);
    const currentParams = {};
    for (const [key, value] of currentUrl.searchParams) {
      if (key !== 'page') {
        currentParams[key] = value;
      }
    }

    // Get desired params from collection
    const desiredParams = {};
    const collectionParams = this.collection.params || {};

    // Only include non-default values
    if (collectionParams.start && collectionParams.start !== 0) {
      desiredParams.start = collectionParams.start;
    }
    if (collectionParams.size && collectionParams.size !== 10) {
      desiredParams.size = collectionParams.size;
    }
    if (collectionParams.sort) {
      desiredParams.sort = collectionParams.sort;
    }
    if (collectionParams.search) {
      desiredParams.search = collectionParams.search;
    }

    // Include other filters
    Object.entries(collectionParams).forEach(([key, value]) => {
      if (!['start', 'size', 'sort', 'search'].includes(key) && value) {
        desiredParams[key] = value;
      }
    });

    // Check if there are any changes
    const hasChanges =
      Object.keys(desiredParams).some(key =>
        String(currentParams[key] || '') !== String(desiredParams[key] || '')
      ) ||
      Object.keys(currentParams).some(key =>
        !(key in desiredParams)
      );

    if (!hasChanges) return;

    // Update URL
    this._isUpdatingUrl = true;
    this.app.router.updateUrl(desiredParams, { replace: true });
    setTimeout(() => { this._isUpdatingUrl = false; }, 100);
  }

  /**
   * Update status display
   */
  updateStatusDisplay() {
    if (!this.element) return;

    // Update last updated time
    const updatedElement = this.element.querySelector('[data-status="last-updated"]');
    if (updatedElement) {
      updatedElement.textContent = this.lastUpdated || 'Never';
    }

    // Update record count
    const countElement = this.element.querySelector('[data-status="record-count"]');
    if (countElement && this.collection) {
      const count = this.collection.meta?.count || this.collection.length();
      countElement.textContent = count;
    }
  }

  /**
   * Called when entering this page
   */
  async onEnter() {
    await super.onEnter();

    // Refresh data if collection is REST-enabled
    if (this.collection && this.collection.restEnabled) {
      await this.collection.fetch();
    }
  }

  /**
   * Public method to refresh the table
   */
  async refresh() {
    await this.tableView.refresh();
  }

  /**
   * Public method to get selected items
   */
  getSelectedItems() {
    return this.tableView.getSelectedItems();
  }

  /**
   * Public method to clear selection
   */
  clearSelection() {
    this.tableView.clearSelection();
  }

  /**
   * Cleanup on destroy
   */
  async onBeforeDestroy() {
    // Remove event listeners
    if (this.collection) {
      this.collection.off('fetch:start');
      this.collection.off('fetch:end');
    }

    if (this.tableView) {
      this.tableView.off('table:search');
      this.tableView.off('table:sort');
      this.tableView.off('table:page');
      this.tableView.off('row:view');
      this.tableView.off('row:edit');
      this.tableView.off('row:delete');
      this.tableView.off('table:add');
      this.tableView.off('table:export');
    }

    await super.onBeforeDestroy();
  }

  /**
   * Show/hide status display
   */
  get showStatus() {
    return this.options.showStatus !== false;
  }

  /**
   * Static factory method
   */
  static create(options = {}) {
    return new this(options);
  }
}

export default TablePage;
