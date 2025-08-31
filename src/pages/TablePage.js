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
import TableView from '../views/table/TableView.js';
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
      batchActions: options.batchActions || null,
      selectionMode: options.selectionMode || (options.selectable ? 'multiple' : 'none'),

      // Features
      searchable: options.searchable !== false,
      sortable: options.sortable !== false,
      filterable: options.filterable !== false,
      paginated: options.paginated !== false,

      // Filter configuration
      filters: options.filters || options.additionalFilters || [],
      hideActivePills: options.hideActivePills || false,
      hideActivePillNames: options.hideActivePillNames || [],
      searchPlacement: options.searchPlacement || 'toolbar',

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
      <div class="table-page-container">

        <div class="table-container" data-container="table"></div>

        {{#showStatus}}
          <div class="table-status-bar table-status-top">
            <div class="status-info">
              <div class="d-flex justify-content-between w-100">
                <span class="text-muted">
                  <i class="bi bi-clock me-1"></i>
                  Last updated: <span data-status="last-updated">{{lastUpdated}}</span>
                </span>
                <span class="text-muted">
                  <i class="bi bi-list-ol me-1"></i>
                  Total records: <span data-status="record-count">0</span>
                </span>
              </div>
            </div>
          </div>
        {{/showStatus}}

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

    // Apply URL query parameters to collection
    this.applyQueryToCollection();

    // Create TableView instance with proper configuration
    this.tableView = new TableView({
      collection: this.collection,
      containerId: 'table',
      columns: this.tableConfig.columns,
      actions: this.tableConfig.actions,
      contextMenu: this.tableConfig.contextMenu,
      batchActions: this.tableConfig.batchActions,
      selectionMode: this.tableConfig.selectionMode,
      searchable: this.tableConfig.searchable,
      sortable: this.tableConfig.sortable,
      filterable: this.tableConfig.filterable,
      paginated: this.tableConfig.paginated,
      filters: this.tableConfig.filters,
      hideActivePills: this.tableConfig.hideActivePills,
      hideActivePillNames: this.tableConfig.hideActivePillNames,
      searchPlacement: this.tableConfig.searchPlacement,
      tableOptions: this.tableConfig.tableOptions,
      emptyMessage: this.tableConfig.emptyMessage,
      searchPlaceholder: this.tableConfig.searchPlaceholder,
      showAdd: this.tableConfig.showAdd,
      showExport: this.tableConfig.showExport,
      formFields: this.tableConfig.formFields,
      formEdit: this.tableConfig.formEdit,
      onItemView: this.tableConfig.onItemView,
      onItemEdit: this.tableConfig.onItemEdit,
      onItemDelete: this.tableConfig.onItemDelete,
      onAdd: this.tableConfig.onAdd,
      onExport: this.tableConfig.onExport
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
      });

      this.collection.on('fetch:end', () => {
        this.isLoading = false;
        this.lastUpdated = new Date().toLocaleTimeString();
        this.updateStatusDisplay();
      });
    }

    // Listen for params-changed event from TableView to sync URL
    this.tableView.on('params-changed', () => {
      if (this.urlSyncEnabled) {
        this.syncUrl();
      }
    });

    // Listen for table events (these also emit params-changed, but keep for backwards compatibility)
    this.tableView.on('table:search', ({ searchTerm }) => {
      // params-changed will handle URL sync
    });

    this.tableView.on('table:sort', ({ field }) => {
      // params-changed will handle URL sync
    });

    this.tableView.on('table:page', ({ page }) => {
      // params-changed will handle URL sync
    });

    // Filter events - params-changed will handle URL sync
    this.tableView.on('filter:edit', async ({ key }) => {
      await this.handleFilterEdit(key);
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
   * Apply URL query parameters to collection
   */
  applyQueryToCollection() {
    const params = {};
    if (!this.query || Object.keys(this.query).length === 0) {
        return;
    }
    const query = this.query;
    // Pagination
    if (query.start !== undefined) params.start = parseInt(query.start) || 0;
    if (query.size !== undefined) params.size = parseInt(query.size) || 10;

    // Sorting
    if (query.sort !== undefined) params.sort = query.sort;

    // Search
    if (query.search !== undefined) params.search = query.search;

    // Process all other params as potential filters
    const reservedParams = ['start', 'size', 'sort', 'search', 'page'];
    Object.entries(query).forEach(([key, value]) => {
      if (!reservedParams.includes(key) && value !== undefined && value !== '') {
        // Parse value if it looks like JSON
        if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
          try {
            params[key] = JSON.parse(value);
          } catch (e) {
            params[key] = value;
          }
        } else {
          params[key] = value;
        }
      }
    });

    // Update collection params
    if (Object.keys(params).length > 0) {
      this.collection.setParams({
        ...this.collection.params,
        ...params
      });
    }
  }

  /**
   * Sync URL with current table state
   */
  syncUrl(force = true) {
    if (!this.urlSyncEnabled || !this.collection || !this.getApp()?.router) {
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
    if (collectionParams.start) {
      desiredParams.start = collectionParams.start;
    }
    if (collectionParams.size) {
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
      if (!['start', 'size', 'sort', 'search'].includes(key) && value !== undefined && value !== '') {
        // Stringify complex values for URL
        if (typeof value === 'object') {
          desiredParams[key] = JSON.stringify(value);
        } else {
          desiredParams[key] = value;
        }
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

    this.query = desiredParams;
    if (!hasChanges && !force) return;

    // Update URL
    this.updateBrowserUrl(desiredParams, true, false);
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

    this.applyQueryToCollection();

    // Refresh data if collection is REST-enabled
    if (this.collection && this.collection.restEnabled) {
      await this.collection.fetch();
    }

    // Ensure filter pills are shown if there are active filters from URL
    if (this.tableView && this.tableView.element) {
      setTimeout(() => {
        this.tableView.updateFilterPills();
        this.tableView.updateSortIcons();
      }, 100);
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
   * Handle filter edit dialog
   */
  async handleFilterEdit(filterKey) {
    const Dialog = await import('../core/Dialog.js').then(m => m.default);
    const filterConfig = this.tableView.getAllAvailableFilters().find(f => f.key === filterKey);
    const currentValue = this.collection.params[filterKey];

    if (!filterConfig) return;

    // Build form field for the filter
    const field = {
      name: 'filter_value',
      label: filterConfig.label || filterKey,
      value: currentValue,
      ...filterConfig.config
    };

    const result = await Dialog.showForm({
      title: `Edit ${field.label} Filter`,
      size: 'md',
      fields: [field]
    });

    if (result && result.filter_value !== undefined) {
      this.tableView.setFilter(filterKey, result.filter_value);

      if (this.collection.restEnabled) {
        await this.collection.fetch();
      }
      await this.tableView.render();
      this.syncUrl();
    }
  }

  /**
   * Clear all filters
   */
  clearAllFilters() {
    if (!this.collection) return;

    // Keep only pagination and sort params
    const { start, size, sort } = this.collection.params;
    this.collection.params = { start, size };
    if (sort) this.collection.params.sort = sort;

    this.syncUrl();

    if (this.collection.restEnabled) {
      this.collection.fetch();
    } else {
      this.tableView.render();
    }
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
      this.tableView.off('params-changed');
      this.tableView.off('table:search');
      this.tableView.off('table:sort');
      this.tableView.off('table:page');
      this.tableView.off('filter:edit');
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
    return this.options.showStatus === true;
  }

  /**
   * Static factory method
   */
  static create(options = {}) {
    return new this(options);
  }
}

export default TablePage;
