/**
 * TablePage - Page component that manages a Table with URL parameter synchronization
 * Automatically syncs pagination, sorting, and filtering with URL parameters
 * Includes built-in refresh, add, export, and other common table operations
 */

import Page from '../core/Page.js';
import Table from './Table.js';

class TablePage extends Page {
  // Static template property pointing to external template file
  static template = '/src/components/TablePage.mst';

  constructor(options = {}) {
    // Handle both 'name' and 'pageName' properties
    if (options.name && !options.pageName) {
      options.pageName = options.name;
    }

    super(options);

    // Model configuration
    this.modelName = options.modelName || 'Item';
    this.modelNamePlural = options.modelNamePlural || `${this.modelName}s`;

    // Extract filters from columns
    const extractedFilters = {};
    if (options.columns) {
      options.columns.forEach(column => {
        if (column.filter) {
          extractedFilters[column.key] = column.filter;
        }
      });
    }

    // Table configuration
    this.tableConfig = {
      Collection: options.Collection || null,
      collection: options.collection || null,
      columns: options.columns || [],
      filters: { ...extractedFilters, ...(options.filters || {}) },
      collectionParams: options.collectionParams || {},
      groupFiltering: options.groupFiltering || false,
      listOptions: options.listOptions || {},
      view: options.view || 'table',
      selectable: options.selectable !== undefined ? options.selectable : false,
      searchable: options.searchable !== undefined ? options.searchable : true,
      sortable: options.sortable !== undefined ? options.sortable : true,
      filterable: options.filterable !== undefined ? options.filterable : true,
      paginated: options.paginated !== undefined ? options.paginated : true,
      responsive: options.responsive !== undefined ? options.responsive : true,
      striped: options.striped !== undefined ? options.striped : true,
      bordered: options.bordered !== undefined ? options.bordered : false,
      hover: options.hover !== undefined ? options.hover : true,
      preloaded: options.preloaded !== undefined ? options.preloaded : false,
      ...options.tableOptions
    };

    // URL parameter configuration
    this.urlConfig = {
      enabled: options.urlParamsEnabled !== undefined ? options.urlParamsEnabled : true,
      startParam: options.startParam || 'start',
      sizeParam: options.sizeParam || 'size',
      sortParam: options.sortParam || 'sort',
      searchParam: options.searchParam || 'search',
      filterPrefix: options.filterPrefix || 'filter_',
      ...options.urlConfig
    };

    // Refresh configuration
    this.refreshConfig = {
      enabled: options.refreshEnabled !== undefined ? options.refreshEnabled : true,
      interval: options.refreshInterval || null,
      onRefresh: options.onRefresh || null,
      ...options.refreshConfig
    };

    // Actions configuration - map directly to Table's actions
    this.showRefresh = options.showRefresh !== undefined ? options.showRefresh : true;
    this.showAdd = options.showAdd !== undefined ? options.showAdd : true;
    this.showExport = options.showExport !== undefined ? options.showExport : true;
    this.onRefresh = options.onRefresh || this.handleRefresh.bind(this);
    this.onAdd = options.onAdd || this.handleAdd.bind(this);
    this.onExport = options.onExport || this.handleExport.bind(this);

    // Loading state configuration
    this.loadingConfig = {
      showOverlay: options.showLoadingOverlay !== undefined ? options.showLoadingOverlay : true,
      loadingText: options.loadingText || 'Loading data...',
      ...options.loadingConfig
    };

    // Status display configuration
    this.statusConfig = {
      showStatus: options.showStatus !== undefined ? options.showStatus : true,
      showLastUpdated: options.showLastUpdated !== undefined ? options.showLastUpdated : true,
      showRecordCount: options.showRecordCount !== undefined ? options.showRecordCount : true,
      statusPosition: options.statusPosition || 'top', // 'top', 'bottom', 'both'
      ...options.statusConfig
    };

    // Template configuration
    this.useCustomTemplate = options.useCustomTemplate || false;

    // Set template - use imported template or custom one
    if (options.template) {
      this.template = options.template;
    }

    // State tracking
    this.currentState = {
      start: 0,
      size: options.size || options.defaultPageSize || 10,
      sort: null,
      dir: 'asc',
      search: '',
      filters: {}
    };

    // Status tracking
    this.lastUpdated = null;
    this.isLoading = false;
    this.loadError = null;

    // Debounce timer for search
    this.searchDebounceTimer = null;

    // Event handlers bound to this instance
    this.handleTablePageChange = this.handleTablePageChange.bind(this);
    this.handleTableSort = this.handleTableSort.bind(this);
    this.handleTableSearch = this.handleTableSearch.bind(this);
    this.handleTableFilter = this.handleTableFilter.bind(this);
    this.handleTableSizeChange = this.handleTableSizeChange.bind(this);

    // Action button handlers
    this.handleRefresh = this.handleRefresh.bind(this);
    this.handleAdd = this.handleAdd.bind(this);
    this.handleExport = this.handleExport.bind(this);
    this.handleImport = this.handleImport.bind(this);

    // Flag to prevent circular updates when table triggers URL change
    this._isUpdatingUrl = false;

    // Store custom toolbar actions
    this.customToolbarActions = {};

    // Store bulk actions
    this.bulkActions = [];
  }

  /**
   * Initialize page - create Table as child view
   */
  onInit() {
    super.onInit();

    // Ensure pageName is set (from options.name or options.pageName)
    if (!this.pageName && this.options.name) {
      this.pageName = this.options.name;
    }

    // Generate table ID based on page name
    const tableId = `table-${this.pageName || 'default'}-container`;

    // Create table instance with all configuration
    this.table = new Table({
      id: tableId,  // Set the ID so it matches the template placeholder
      Collection: this.tableConfig.Collection,  // Pass the Collection class
      collection: this.tableConfig.collection,  // Or existing collection instance
      columns: this.tableConfig.columns,
      filters: this.tableConfig.filters,
      showRefresh: this.showRefresh,
      showAdd: this.showAdd,
      showExport: this.showExport,
      modelName: this.modelName,
      onRefresh: this.onRefresh,
      onAdd: this.onAdd,
      onExport: this.onExport,
      // Pass other table config options
      selectable: this.tableConfig.selectable,
      searchable: this.tableConfig.searchable,
      sortable: this.tableConfig.sortable,
      filterable: this.tableConfig.filterable,
      paginated: this.tableConfig.paginated,
      responsive: this.tableConfig.responsive,
      striped: this.tableConfig.striped,
      bordered: this.tableConfig.bordered,
      hover: this.tableConfig.hover,
      pageSizes: this.tableConfig.pageSizes,
      defaultPageSize: this.tableConfig.defaultPageSize,
      emptyMessage: this.tableConfig.emptyMessage,
      emptyIcon: this.tableConfig.emptyIcon
    });

    // Add table as a child view - framework will handle rendering
    this.addChild(this.table, 'table');

    // Listen for table events
    this.table.on('page:change', this.handleTablePageChange);
    this.table.on('sort:change', this.handleTableSort);
    this.table.on('search:change', this.handleTableSearch);
    this.table.on('filter:change', this.handleTableFilter);
    this.table.on('size:change', this.handleTableSizeChange);
    this.table.on('data:loaded', () => {
      this.lastUpdated = new Date().toLocaleTimeString();
      this.loadError = null;
      this.updateStatusDisplay();
    });
    this.table.on('data:error', (error) => {
      this.loadError = error?.message || 'Failed to load data';
      this.updateStatusDisplay();
    });

    console.log(`TablePage ${this.pageName} initialized with Table as child view`);
  }

  /**
   * Add a custom toolbar action
   * @param {string} key - Unique identifier for the action
   * @param {object} options - Action configuration
   */
  addToolbarAction(key, options = {}) {
    this.customToolbarActions[key] = {
      key,
      label: options.label || key,
      icon: options.icon || 'bi-gear',
      class: options.class || 'btn-outline-secondary',
      position: options.position || 'right',
      handler: options.handler || (() => console.log(`Toolbar action: ${key}`)),
      ...options
    };
  }

  /**
   * Set bulk actions for the table
   * @param {Array} actions - Array of bulk action configurations
   */
  setBulkActions(actions = []) {
    this.bulkActions = actions.map(action => ({
      label: action.label || 'Action',
      icon: action.icon || 'bi-gear',
      action: action.action || 'bulkAction',
      class: action.class || 'btn-outline-secondary',
      confirm: action.confirm || false,
      handler: action.handler || (() => console.log(`Bulk action: ${action.action}`)),
      ...action
    }));
  }

  /**
   * Handle URL parameters when page is activated
   * @param {object} params - Route parameters
   * @param {object} query - Query string parameters
   */
  onParams(params = {}, query = {}) {
    super.onParams(params, query);

    // Extract table state from URL parameters
    this.currentState = this.parseUrlParams(query);

    // Don't apply state if we're updating the URL from a table event
    // The table has already updated itself and fetched the data
    if (this.table && !this._isUpdatingUrl) {
      this.applyStateToTable(this.currentState);
    }
  }

  /**
   * Parse URL parameters into table state
   * @param {object} query - Query parameters
   * @returns {object} Table state
   */
  parseUrlParams(query) {
    // Parse sort parameter - if it starts with '-', it's descending
    let sort = query[this.urlConfig.sortParam] || null;
    let dir = 'asc';
    if (sort && sort.startsWith('-')) {
      sort = sort.substring(1);
      dir = 'desc';
    }

    const state = {
      start: parseInt(query[this.urlConfig.startParam]) || 0,
      size: parseInt(query[this.urlConfig.sizeParam]) || this.currentState.size,
      sort: sort,
      dir: dir,
      search: query[this.urlConfig.searchParam] || '',
      filters: {}
    };

    // Extract filters with prefix
    Object.keys(query).forEach(key => {
      if (key.startsWith(this.urlConfig.filterPrefix)) {
        const filterName = key.substring(this.urlConfig.filterPrefix.length);
        state.filters[filterName] = query[key];
      }
    });

    return state;
  }

  /**
   * Apply state from URL to table
   * @param {object} state - Table state
   */
  applyStateToTable(state) {
    if (!this.table) return;

    // Apply pagination
    if (state.start !== undefined && this.table.start !== state.start) {
      this.table.start = state.start;
    }

    // Apply sorting
    if (state.sort) {
      this.table.sortBy = state.sort;
      this.table.sortDirection = state.dir;
    } else {
      this.table.sortBy = null;
      this.table.sortDirection = 'asc';
    }

    // Apply search
    if (state.search !== undefined && this.table.searchQuery !== state.search) {
      this.table.searchQuery = state.search;
    }

    // Apply page size
    if (state.size && this.table.size !== state.size) {
      this.table.size = state.size;
    }

    // Apply filters
    this.table.activeFilters = {};
    Object.keys(state.filters).forEach(key => {
      this.table.activeFilters[key] = state.filters[key];
    });

    // Re-render table with new state
    if (this.table.collection?.restEnabled) {
      this.table.fetchWithCurrentFilters();
    } else if (this.table.rendered) {
      this.table.render();
    }
  }

  /**
   * Update URL with current table state
   * @param {object} newState - New state values to merge
   */
  updateUrl(newState = null) {
    if (!this.urlConfig.enabled) return;

    const state = newState || this.currentState;

    // Build query parameters
    const params = new URLSearchParams();

    // Add start parameter
    if (state.start > 0) {
      params.set(this.urlConfig.startParam, state.start);
    }

    // Add sort parameter (prefix with - for descending)
    if (state.sort) {
      const sortValue = state.dir === 'desc' ? `-${state.sort}` : state.sort;
      params.set(this.urlConfig.sortParam, sortValue);
    }

    // Add search parameter
    if (state.search) {
      params.set(this.urlConfig.searchParam, state.search);
    }

    // Add size parameter if not default
    if (state.size && state.size !== 10) {
      params.set(this.urlConfig.sizeParam, state.size);
    }

    // Add filter parameters
    Object.keys(state.filters).forEach(key => {
      if (state.filters[key]) {
        params.set(this.urlConfig.filterPrefix + key, state.filters[key]);
      }
    });

    // Get the query string
    const queryString = params.toString();
    const newUrl = queryString ? `?${queryString}` : window.location.pathname;

    // Only update if URL has changed
    if (newUrl !== window.location.search) {
      // Set flag to prevent circular updates
      this._isUpdatingUrl = true;

      // Use replace state to avoid creating history entries for each filter/page change
      window.history.replaceState(
        { page: this.pageName, state: state },
        '',
        newUrl
      );

      // Reset flag after a small delay
      setTimeout(() => {
        this._isUpdatingUrl = false;
      }, 100);
    }
  }

  /**
   * Handle table page change
   * @param {object} detail - Event detail with page number
   */
  handleTablePageChange(detail) {
    // Convert page to start index
    const page = detail.page || 1;
    this.currentState.start = (page - 1) * this.currentState.size;
    this.updateUrl(this.currentState);
  }

  /**
   * Handle table sort change
   * @param {object} detail - Event detail with sort field and direction
   */
  handleTableSort(detail) {
    this.currentState.sort = detail.field || null;
    this.currentState.dir = detail.direction || 'asc';
    this.currentState.page = 1; // Reset to first page when sorting
    this.updateUrl(this.currentState);
  }

  /**
   * Handle table search change
   * @param {object} detail - Event detail with search query
   */
  handleTableSearch(detail) {
    // Clear existing timer
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    // Debounce search updates
    this.searchDebounceTimer = setTimeout(() => {
      this.currentState.search = detail.query || '';
      this.currentState.page = 1; // Reset to first page when searching
      this.updateUrl(this.currentState);
    }, 300);
  }

  /**
   * Handle table filter change
   * @param {object} detail - Event detail with filter key and value
   */
  handleTableFilter(detail) {
    if (detail.value) {
      this.currentState.filters[detail.key] = detail.value;
    } else {
      delete this.currentState.filters[detail.key];
    }
    this.currentState.start = 0; // Reset to beginning when filtering
    this.updateUrl(this.currentState);
  }

  /**
   * Handle table page size change
   * @param {object} detail - Event detail with size value
   */
  handleTableSizeChange(detail) {
    this.currentState.size = detail.size || 10;
    this.currentState.start = 0; // Reset to beginning when changing page size
    this.updateUrl(this.currentState);
  }

  /**
   * Handle refresh action
   */
  async handleRefresh() {
    console.log('Refreshing table data...');
    this.setLoadingState(true);

    try {
      if (this.refreshConfig.onRefresh) {
        // Custom refresh handler
        await this.refreshConfig.onRefresh();
      } else if (this.table) {
        // Default: refresh table data
        // Ensure we have the collection reference
        if (!this.collection && this.table.collection) {
          this.collection = this.table.collection;
        }

        if (this.collection) {
          // For REST collections, fetch from server
          if (this.collection.rest?.enabled) {
            await this.collection.fetch();
          } else if (typeof this.collection.load === 'function') {
            // For custom collections with load method
            await this.collection.load();
          }

          // Re-render table with updated collection data
          await this.table.render();
        }
      }

      this.lastUpdated = new Date().toLocaleTimeString();
      this.loadError = null;
      this.updateStatusDisplay();
      this.showSuccess('Data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing data:', error);
      this.loadError = error.message || 'Failed to refresh data';
      this.updateStatusDisplay();
      this.showError('Failed to refresh data: ' + error.message);
    } finally {
      this.setLoadingState(false);
    }
  }

  /**
   * Handle add action
   */
  async handleAdd() {
    console.log('Add new item action triggered');

    // Default implementation - override in subclass
    this.showInfo(`Add new ${this.modelName} - implement in subclass`);

    // Emit event for custom handling
    this.emit('table:add', {
      modelName: this.modelName,
      collection: this.table?.collection
    });
  }

  /**
   * Handle export action
   */
  async handleExport() {
    console.log('Export table data action triggered');

    try {
      if (this.table && this.table.collection) {
        const data = this.table.collection.models.map(model => model.attributes);
        this.exportToCSV(data);
        this.showSuccess('Data exported successfully');
      } else {
        this.showWarning('No data to export');
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      this.showError('Failed to export data: ' + error.message);
    }
  }

  /**
   * Handle import action
   */
  async handleImport() {
    console.log('Import data action triggered');

    // Default implementation - override in subclass
    this.showInfo(`Import ${this.modelNamePlural} - implement in subclass`);

    // Emit event for custom handling
    this.emit('table:import', {
      modelName: this.modelName,
      collection: this.table?.collection
    });
  }

  /**
   * Export data to CSV
   */
  exportToCSV(data) {
    if (!data || data.length === 0) {
      console.warn('No data to export');
      return;
    }

    // Get headers from first item or columns config
    const headers = this.tableConfig.columns.length > 0
      ? this.tableConfig.columns.map(col => col.label || col.key)
      : Object.keys(data[0]);

    const keys = this.tableConfig.columns.length > 0
      ? this.tableConfig.columns.map(col => col.key)
      : Object.keys(data[0]);

    // Build CSV content
    let csv = headers.join(',') + '\n';

    data.forEach(item => {
      const row = keys.map(key => {
        const value = item[key];
        // Escape values that contain commas or quotes
        if (value === null || value === undefined) {
          return '';
        }
        const strValue = String(value);
        if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
          return `"${strValue.replace(/"/g, '""')}"`;
        }
        return strValue;
      });
      csv += row.join(',') + '\n';
    });

    // Create download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${this.modelNamePlural.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Set loading state
   */
  setLoadingState(isLoading) {
    this.isLoading = isLoading;

    if (!this.element) return;

    const container = this.element.querySelector('.table-container');
    if (container) {
      if (isLoading) {
        container.classList.add('is-loading');

        // Add loading overlay if configured
        if (this.loadingConfig.showOverlay) {
          const existingOverlay = container.querySelector('.table-loading-overlay');
          if (!existingOverlay) {
            const overlay = document.createElement('div');
            overlay.className = 'table-loading-overlay';
            overlay.innerHTML = `
              <div class="loading-content">
                <div class="spinner-border text-primary" role="status">
                  <span class="visually-hidden">Loading...</span>
                </div>
                <div class="loading-message">${this.loadingConfig.loadingText}</div>
              </div>
            `;
            container.appendChild(overlay);
          }
        }
      } else {
        container.classList.remove('is-loading');

        // Remove loading overlay
        const overlay = container.querySelector('.table-loading-overlay');
        if (overlay) {
          overlay.remove();
        }
      }
    }
  }

  /**
   * Update status display
   */
  updateStatusDisplay() {
    if (!this.element || !this.statusConfig.showStatus) return;

    // Update record count
    if (this.statusConfig.showRecordCount) {
      const countElement = this.element.querySelector('[data-status="record-count"]');
      if (countElement) {
        const count = this.table?.collection?.length || 0;
        countElement.textContent = count;
      }
    }

    // Update last updated time
    if (this.statusConfig.showLastUpdated) {
      const updatedElement = this.element.querySelector('[data-status="last-updated"]');
      if (updatedElement) {
        updatedElement.textContent = this.lastUpdated || 'Never';
      }
    }

    // Update error display
    const errorElement = this.element.querySelector('[data-status="error"]');
    if (errorElement) {
      if (this.loadError) {
        errorElement.style.display = '';
        const textElement = errorElement.querySelector('.error-text');
        if (textElement) {
          textElement.textContent = this.loadError;
        }
      } else {
        errorElement.style.display = 'none';
      }
    }
  }

  /**
   * Bind action buttons
   */
  bindActionButtons() {
    if (!this.element) return;

    // Bind refresh button
    const refreshBtns = this.element.querySelectorAll('[data-action="refresh"]');
    refreshBtns.forEach(btn => {
      btn.addEventListener('click', this.handleRefresh);
    });

    // Bind add button
    const addBtns = this.element.querySelectorAll('[data-action="add"]');
    addBtns.forEach(btn => {
      btn.addEventListener('click', this.handleAdd);
    });

    // Bind export button
    const exportBtns = this.element.querySelectorAll('[data-action="export"]');
    exportBtns.forEach(btn => {
      btn.addEventListener('click', this.handleExport);
    });

    // Bind import button
    const importBtns = this.element.querySelectorAll('[data-action="import"]');
    importBtns.forEach(btn => {
      btn.addEventListener('click', this.handleImport);
    });

    // Bind custom toolbar actions
    Object.values(this.customToolbarActions).forEach(action => {
      const btns = this.element.querySelectorAll(`[data-action="${action.key}"]`);
      btns.forEach(btn => {
        btn.addEventListener('click', action.handler);
      });
    });
  }

  /**
   * Unbind action buttons
   */
  unbindActionButtons() {
    if (!this.element) return;

    // Unbind all action buttons
    const actionBtns = this.element.querySelectorAll('[data-action]');
    actionBtns.forEach(btn => {
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
    });
  }

  /**
   * Get template - can be disabled for custom rendering
   */
  async getTemplate() {
    // If useCustomTemplate is true, return empty string (no template)
    if (this.useCustomTemplate) {
      return '';
    }

    // Otherwise use the parent View's getTemplate which will use this.template
    return super.getTemplate();
  }

  /**
   * Get view data for template
   */
  async getViewData() {
    const baseData = await super.getViewData();

    const recordCount = this.table?.collection?.length || 0;

    return {
      ...baseData,
      title: this.pageOptions.title || this.pageName,
      description: this.pageOptions.description,
      tableContainerId: `table-${this.pageName || 'default'}-container`,
      pageName: this.pageName,

      // Simple status data
      showStatus: this.statusConfig.showStatus,
      showRecordCount: this.statusConfig.showRecordCount,
      recordCount: recordCount,
      showLastUpdated: this.statusConfig.showLastUpdated,
      lastUpdated: this.lastUpdated || 'Never',
      loadError: this.loadError
    };
  }

  /**
   * After render hook - bind action buttons
   */
  async onAfterRender() {
    await super.onAfterRender();

    // Bind action buttons
    this.bindActionButtons();
  }

  /**
   * After mount hook - get collection reference and apply state
   */
  async onAfterMount() {
    await super.onAfterMount();

    // Get reference to the collection created by Table
    if (this.table && this.table.collection) {
      this.collection = this.table.collection;
    }

    // Apply initial state from URL if table is ready
    if (this.table) {
      this.applyStateToTable(this.currentState);
    }

    // Update initial status display
    this.updateStatusDisplay();
  }

  /**
   * Before destroy hook - cleanup
   */
  async onBeforeDestroy() {
    // Unbind action buttons
    this.unbindActionButtons();

    // Clear debounce timer
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    // Remove event listeners from table
    if (this.table) {
      this.table.off('page:change', this.handleTablePageChange);
      this.table.off('sort:change', this.handleTableSort);
      this.table.off('search:change', this.handleTableSearch);
      this.table.off('filter:change', this.handleTableFilter);
      this.table.off('size:change', this.handleTableSizeChange);
      this.table.off('data:loaded');
      this.table.off('data:error');
    }

    // Parent class will handle destroying child views (including table)
    await super.onBeforeDestroy();
  }

  /**
   * Public method to refresh table data
   */
  async refreshTable() {
    await this.handleRefresh();
  }

  /**
   * Public method to get selected items
   */
  getSelectedItems() {
    if (this.table && typeof this.table.getSelectedItems === 'function') {
      return this.table.getSelectedItems();
    }
    return [];
  }

  /**
   * Public method to clear selection
   */
  clearSelection() {
    if (this.table && typeof this.table.clearSelection === 'function') {
      this.table.clearSelection();
    }
  }

  /**
   * Public method to get current table data
   */
  getTableData() {
    if (this.table && this.table.collection) {
      return this.table.collection.models.map(model => model.attributes);
    }
    return [];
  }

  /**
   * Public method to set table data
   */
  setTableData(data) {
    if (this.table && this.table.collection) {
      this.table.collection.reset();
      this.table.collection.add(data);
      this.table.render();
      this.updateStatusDisplay();
    }
  }

  /**
   * Public method to get current filters
   */
  getFilters() {
    return { ...this.currentState.filters, search: this.currentState.search };
  }

  /**
   * Public method to set filters
   */
  setFilters(filters) {
    const { search, ...otherFilters } = filters;
    this.currentState.filters = otherFilters;
    this.currentState.search = search || '';
    this.currentState.page = 1;

    if (this.table) {
      this.applyStateToTable(this.currentState);
    }

    this.updateUrl(this.currentState);
  }

  /**
   * Public method to get current sort
   */
  getSort() {
    return {
      field: this.currentState.sort,
      direction: this.currentState.dir
    };
  }

  /**
   * Public method to set sort
   */
  setSort(field, direction = 'asc') {
    this.currentState.sort = field;
    this.currentState.dir = direction;
    this.currentState.page = 1;

    if (this.table) {
      this.applyStateToTable(this.currentState);
    }

    this.updateUrl(this.currentState);
  }

  /**
   * Static factory method
   */
  static create(options = {}) {
    return new this(options);
  }
}

export default TablePage;
