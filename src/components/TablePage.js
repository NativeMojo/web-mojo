/**
 * TablePage - Page component that manages a Table with URL parameter synchronization
 * Automatically syncs pagination, sorting, and filtering with URL parameters
 * Includes built-in refresh, add, export, and other common table operations
 */

import Page from '../core/Page.js';
import Table from './Table.js';
// Template for TablePage component
const tablePageTemplate = `<div class="table-page-container">
  <!-- Header Section -->
  <div class="table-page-header mb-3">
    {{#title}}
    <h2 class="page-title mb-2">{{title}}</h2>
    {{/title}}
    {{#description}}
    <p class="page-description text-muted">{{description}}</p>
    {{/description}}
  </div>

  <!-- Table Container -->
  <div id="{{tableContainerId}}"
       class="table-container"
       data-table-page="{{page_name}}">
    <!-- Table will be rendered here by Table component with its own toolbar -->
  </div>

  <!-- Simple Status Bar -->
  {{#showStatus}}
  <div class="table-status-bar mt-3">
    <div class="d-flex align-items-center justify-content-between">
      <div class="status-info d-flex align-items-center gap-3">
        {{#showRecordCount}}
        <small class="text-muted">
          <i class="bi bi-database me-1"></i>
          <span data-status="record-count">{{recordCount}}</span> records
        </small>
        {{/showRecordCount}}

        {{#showLastUpdated}}
        <small class="text-muted">
          <i class="bi bi-clock-history me-1"></i>
          Updated: <span data-status="last-updated">{{lastUpdated}}</span>
        </small>
        {{/showLastUpdated}}
      </div>

      {{#loadError}}
      <span class="error-indicator text-danger" data-status="error">
        <i class="bi bi-exclamation-triangle me-1"></i>
        {{loadError}}
      </span>
      {{/loadError}}
    </div>
  </div>
  {{/showStatus}}
</div>

<!-- TablePage Styles -->
<style>
  .table-page-container {
    position: relative;
  }

  .table-container {
    position: relative;
    min-height: 200px;
  }

  .table-status-bar {
    border-top: 1px solid #dee2e6;
    padding-top: 0.75rem;
  }

  .status-info {
    flex-wrap: wrap;
  }

  /* Error state styles */
  .error-indicator {
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.6;
    }
  }
</style>`;

class TablePage extends Page {
  constructor(options = {}) {
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
      pageParam: options.pageParam || 'page',
      sortParam: options.sortParam || 'sort',
      searchParam: options.searchParam || 'search',
      perPageParam: options.perPageParam || 'per_page',
      filterPrefix: options.filterPrefix || 'filter_',
      updateUrl: options.updateUrl !== undefined ? options.updateUrl : true,
      replaceState: options.replaceState !== undefined ? options.replaceState : false,
      debounceDelay: options.debounceDelay || 300,
      ...options.urlOptions
    };
    
    // Action buttons configuration
    this.actionButtons = {
      showRefresh: options.showRefresh !== undefined ? options.showRefresh : true,
      showAdd: options.showAdd !== undefined ? options.showAdd : true,
      showExport: options.showExport !== undefined ? options.showExport : false,
      showImport: options.showImport !== undefined ? options.showImport : false,
      showViewOptions: options.showViewOptions !== undefined ? options.showViewOptions : false,
      refreshText: options.refreshText || 'Refresh',
      refreshIcon: options.refreshIcon || 'bi-arrow-clockwise',
      addText: options.addText || `Add ${this.modelName}`,
      addIcon: options.addIcon || 'bi-plus-circle',
      exportText: options.exportText || 'Export',
      exportIcon: options.exportIcon || 'bi-download',
      importText: options.importText || 'Import',
      importIcon: options.importIcon || 'bi-upload',
      onAdd: options.onAdd || null, // Custom add handler
      onExport: options.onExport || null, // Custom export handler
      onImport: options.onImport || null, // Custom import handler
      additionalButtons: options.additionalButtons || [], // Array of custom buttons
      position: options.actionButtonPosition || 'top', // 'top', 'bottom', 'both'
      ...options.actionButtons
    };
    
    // Loading state configuration
    this.loadingConfig = {
      showSpinner: options.showLoadingSpinner !== undefined ? options.showLoadingSpinner : true,
      showOverlay: options.showLoadingOverlay !== undefined ? options.showLoadingOverlay : false,
      loadingText: options.loadingText || 'Loading...',
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
    if (!options.template && !this.useCustomTemplate) {
      this.template = tablePageTemplate;
    } else if (options.template) {
      this.template = options.template;
    }
    
    // Table instance
    this.table = null;
    
    // State tracking
    this.currentState = {
      page: 1,
      sort: null,
      dir: 'asc',
      search: '',
      perPage: options.itemsPerPage || 10,
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
    this.handleTablePerPageChange = this.handleTablePerPageChange.bind(this);
    
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
   * Initialize the page
   */
  onInit() {
    super.onInit();
    console.log(`TablePage ${this.pageName} initialized`);
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
      page: parseInt(query[this.urlConfig.pageParam]) || 1,
      sort: sort,
      dir: dir,
      search: query[this.urlConfig.searchParam] || '',
      perPage: parseInt(query[this.urlConfig.perPageParam]) || this.currentState.perPage,
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
   * Apply state to the table
   * @param {object} state - Table state
   */
  applyStateToTable(state) {
    if (!this.table) return;
    
    // Apply pagination
    this.table.currentPage = state.page;
    this.table.itemsPerPage = state.perPage;
    
    // Apply sorting
    this.table.sortBy = state.sort;
    this.table.sortDirection = state.dir;
    
    // Apply search
    if (state.search) {
      this.table.activeFilters.search = state.search;
    } else {
      delete this.table.activeFilters.search;
    }
    
    // Apply filters
    Object.keys(state.filters).forEach(key => {
      this.table.activeFilters[key] = state.filters[key];
    });
    
    // Re-render table with new state
    if (this.table.collection?.restEnabled) {
      this.table.fetchWithCurrentFilters();
    } else {
      this.table.render();
    }
  }

  /**
   * Update URL with current table state
   * @param {object} newState - New state values to merge
   */
  updateUrl(newState = {}) {
    if (!this.urlConfig.updateUrl) return;
    
    // Set flag to prevent circular updates
    this._isUpdatingUrl = true;
    
    // Merge with current state
    this.currentState = { ...this.currentState, ...newState };
    
    // Build query parameters
    const params = new URLSearchParams();
    
    // Add pagination
    if (this.currentState.page > 1) {
      params.set(this.urlConfig.pageParam, this.currentState.page);
    }
    
    // Add sorting using REST API convention:
    // - Ascending: ?sort=fieldname
    // - Descending: ?sort=-fieldname (with '-' prefix)
    if (this.currentState.sort) {
      const sortValue = this.currentState.dir === 'desc' 
        ? `-${this.currentState.sort}` 
        : this.currentState.sort;
      params.set(this.urlConfig.sortParam, sortValue);
    }
    
    // Add search
    if (this.currentState.search) {
      params.set(this.urlConfig.searchParam, this.currentState.search);
    }
    
    // Add items per page if not default
    if (this.currentState.perPage !== 10) {
      params.set(this.urlConfig.perPageParam, this.currentState.perPage);
    }
    
    // Add filters
    Object.keys(this.currentState.filters).forEach(key => {
      const value = this.currentState.filters[key];
      if (value !== null && value !== undefined && value !== '') {
        params.set(this.urlConfig.filterPrefix + key, value);
      }
    });
    
    // Get current URL
    const url = new URL(window.location.href);
    
    // Preserve page parameter for router
    const currentPage = url.searchParams.get('page');
    if (currentPage) {
      params.set('page', currentPage);
    }
    
    // Update URL
    const newUrl = params.toString() ? `${url.pathname}?${params.toString()}` : url.pathname;
    
    if (this.urlConfig.replaceState) {
      window.history.replaceState({}, '', newUrl);
    } else {
      window.history.pushState({}, '', newUrl);
    }
    
    // Reset flag after a microtask to allow URL update to complete
    Promise.resolve().then(() => {
      this._isUpdatingUrl = false;
    });
  }

  /**
   * Handle table page change
   * @param {Event} event - Event object
   */
  handleTablePageChange(event) {
    const page = event.detail?.page || this.table.currentPage;
    this.updateUrl({ page });
  }

  /**
   * Handle table sort change
   * @param {Event} event - Event object
   */
  handleTableSort(event) {
    const sort = event.detail?.field || this.table.sortBy;
    const dir = event.detail?.direction || this.table.sortDirection;
    
    if (!sort || dir === 'none') {
      this.updateUrl({ sort: null, dir: 'asc', page: 1 });
    } else {
      this.updateUrl({ sort, dir, page: 1 });
    }
  }

  /**
   * Handle table search with debouncing
   * @param {Event} event - Event object
   */
  handleTableSearch(event) {
    const search = event.detail?.search || this.table.activeFilters.search || '';
    
    // Clear existing debounce timer
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    
    // Debounce search updates to URL
    this.searchDebounceTimer = setTimeout(() => {
      this.updateUrl({ search, page: 1 });
    }, this.urlConfig.debounceDelay);
  }

  /**
   * Handle table filter change
   * @param {Event} event - Event object
   */
  handleTableFilter(event) {
    const filters = event.detail?.filters || this.table.activeFilters || {};
    
    // Separate search from other filters
    const { search, ...otherFilters } = filters;
    
    this.updateUrl({ 
      filters: otherFilters, 
      search: search || '',
      page: 1 
    });
  }

  /**
   * Handle items per page change
   * @param {Event} event - Event object
   */
  handleTablePerPageChange(event) {
    const perPage = event.detail?.perPage || this.table.itemsPerPage;
    this.updateUrl({ perPage, page: 1 });
  }

  /**
   * Handle refresh button click - Built-in implementation
   */
  async handleRefresh(e) {
    if (e) {
      e.preventDefault();
    }
    
    // Set loading state
    this.setLoadingState(true);
    
    try {
      // Clear any errors
      this.loadError = null;
      
      // Refresh the table data
      if (this.table) {
        if (this.table.collection && this.table.collection.restEnabled) {
          // For REST-enabled collections, re-fetch with current filters
          await this.table.fetchWithCurrentFilters();
        } else if (this.table.collection && typeof this.table.collection.fetch === 'function') {
          // For collections with fetch method
          await this.table.collection.fetch();
          this.table.render();
        } else {
          // For static data, just re-render
          this.table.render();
        }
        
        // Update last updated time
        this.lastUpdated = new Date().toLocaleTimeString();
        
        // Update status display
        this.updateStatusDisplay();
        
        // Dispatch refresh event
        if (this.container) {
          this.container.dispatchEvent(new CustomEvent('tablepage:refresh', {
            bubbles: true,
            detail: { 
              timestamp: this.lastUpdated,
              recordCount: this.table.collection?.length || 0
            }
          }));
        }
      }
    } catch (error) {
      console.error('TablePage: Refresh failed:', error);
      this.loadError = 'Failed to refresh data';
      this.updateStatusDisplay();
    } finally {
      // Clear loading state
      this.setLoadingState(false);
    }
  }

  /**
   * Handle add button click - Can be overridden
   */
  async handleAdd(e) {
    if (e) {
      e.preventDefault();
    }
    
    // If custom handler provided, use it
    if (this.actionButtons.onAdd) {
      await this.actionButtons.onAdd.call(this);
    } else {
      // Default behavior - dispatch event for app to handle
      if (this.container) {
        this.container.dispatchEvent(new CustomEvent('tablepage:add', {
          bubbles: true,
          detail: { 
            modelName: this.modelName,
            collection: this.table?.collection
          }
        }));
      }
      
      // Log for development
      console.log(`TablePage: Add ${this.modelName} - Implement onAdd handler or listen for 'tablepage:add' event`);
    }
  }

  /**
   * Handle export button click
   */
  async handleExport(e) {
    if (e) {
      e.preventDefault();
    }
    
    if (this.actionButtons.onExport) {
      await this.actionButtons.onExport.call(this);
    } else {
      // Default export to CSV
      this.exportToCSV();
    }
  }

  /**
   * Handle import button click
   */
  async handleImport(e) {
    if (e) {
      e.preventDefault();
    }
    
    if (this.actionButtons.onImport) {
      await this.actionButtons.onImport.call(this);
    } else {
      console.log('TablePage: Import - Implement onImport handler');
    }
  }

  /**
   * Export table data to CSV
   */
  exportToCSV() {
    if (!this.table || !this.table.collection || this.table.collection.length === 0) {
      console.warn('TablePage: No data to export');
      return;
    }
    
    // Get column headers
    const headers = this.tableConfig.columns
      .filter(col => !col.hidden)
      .map(col => col.title || col.key);
    
    // Get data rows
    const rows = this.table.collection.models.map(model => {
      return this.tableConfig.columns
        .filter(col => !col.hidden)
        .map(col => {
          const value = model.get(col.key);
          // Handle nested values
          if (col.key.includes('.')) {
            const keys = col.key.split('.');
            let val = model.get(keys[0]);
            for (let i = 1; i < keys.length; i++) {
              val = val?.[keys[i]];
            }
            return val || '';
          }
          // Strip HTML tags if present
          if (typeof value === 'string' && value.includes('<')) {
            const tmp = document.createElement('div');
            tmp.innerHTML = value;
            return tmp.textContent || tmp.innerText || '';
          }
          return value || '';
        });
    });
    
    // Convert to CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.modelNamePlural.toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Set loading state and update UI
   */
  setLoadingState(isLoading) {
    this.isLoading = isLoading;
    
    if (this.element) {
      // Update button states
      const refreshBtn = this.element.querySelector('[data-action="refresh"]');
      if (refreshBtn) {
        refreshBtn.disabled = isLoading;
        const icon = refreshBtn.querySelector('i');
        if (icon) {
          if (isLoading) {
            icon.classList.add('bi-spin');
          } else {
            icon.classList.remove('bi-spin');
          }
        }
      }
      
      // Update container loading state
      const container = this.element.querySelector(`#table-${this.pageName || 'default'}-container`);
      if (container) {
        if (isLoading) {
          container.classList.add('is-loading');
        } else {
          container.classList.remove('is-loading');
        }
      }
      
      // Show/hide loading overlay if configured
      if (this.loadingConfig.showOverlay) {
        let overlay = this.element.querySelector('.table-loading-overlay');
        if (!overlay && isLoading) {
          // Create overlay if it doesn't exist
          overlay = document.createElement('div');
          overlay.className = 'table-loading-overlay';
          overlay.innerHTML = `
            <div class="loading-content text-center">
              <div class="spinner-border text-primary mb-3" role="status">
                <span class="visually-hidden">Loading...</span>
              </div>
              <div class="loading-message">${this.loadingConfig.loadingText}</div>
            </div>
          `;
          container?.appendChild(overlay);
        } else if (overlay && !isLoading) {
          overlay.remove();
        }
      }
    }
  }

  /**
   * Update status display elements
   */
  updateStatusDisplay() {
    if (!this.element) return;
    
    // Update record count
    const recordCountEls = this.element.querySelectorAll('[data-status="record-count"]');
    recordCountEls.forEach(el => {
      if (this.table) {
        const count = this.table.collection?.meta?.total || this.table.collection?.length || 0;
        el.textContent = count;
      }
    });
    
    // Update last updated time
    const lastUpdatedEls = this.element.querySelectorAll('[data-status="last-updated"]');
    lastUpdatedEls.forEach(el => {
      el.textContent = this.lastUpdated || 'Never';
    });
    
    // Update error display
    const errorEls = this.element.querySelectorAll('[data-status="error"]');
    errorEls.forEach(el => {
      if (this.loadError) {
        el.style.display = 'inline-block';
        el.innerHTML = `<i class="bi bi-exclamation-triangle me-1"></i>${this.loadError}`;
      } else {
        el.style.display = 'none';
      }
    });
  }

  /**
   * Bind table events
   */
  bindTableEvents() {
    if (!this.table || !this.table.container) return;
    
    const container = this.table.container;
    
    // Bind pagination events
    container.addEventListener('page:change', this.handleTablePageChange);
    container.addEventListener('table:page:change', this.handleTablePageChange);
    
    // Bind sort events
    container.addEventListener('sort:change', this.handleTableSort);
    container.addEventListener('table:sort', this.handleTableSort);
    
    // Bind search events
    container.addEventListener('search:change', this.handleTableSearch);
    container.addEventListener('table:search', this.handleTableSearch);
    
    // Bind filter events
    container.addEventListener('filter:change', this.handleTableFilter);
    container.addEventListener('table:filter', this.handleTableFilter);
    
    // Bind per page change events
    container.addEventListener('perpage:change', this.handleTablePerPageChange);
    container.addEventListener('table:perpage', this.handleTablePerPageChange);
  }

  /**
   * Unbind table events
   */
  unbindTableEvents() {
    if (!this.table || !this.table.container) return;
    
    const container = this.table.container;
    
    container.removeEventListener('page:change', this.handleTablePageChange);
    container.removeEventListener('table:page:change', this.handleTablePageChange);
    container.removeEventListener('sort:change', this.handleTableSort);
    container.removeEventListener('table:sort', this.handleTableSort);
    container.removeEventListener('search:change', this.handleTableSearch);
    container.removeEventListener('table:search', this.handleTableSearch);
    container.removeEventListener('filter:change', this.handleTableFilter);
    container.removeEventListener('table:filter', this.handleTableFilter);
    container.removeEventListener('perpage:change', this.handleTablePerPageChange);
    container.removeEventListener('table:perpage', this.handleTablePerPageChange);
  }

  /**
   * Bind action button events
   */
  bindActionButtons() {
    if (!this.element) return;
    
    // Bind all action buttons
    this.element.querySelectorAll('[data-action]').forEach(button => {
      const action = button.getAttribute('data-action');
      
      switch (action) {
        case 'refresh':
          button.addEventListener('click', this.handleRefresh);
          break;
        case 'add':
          button.addEventListener('click', this.handleAdd);
          break;
        case 'export':
          button.addEventListener('click', this.handleExport);
          break;
        case 'import':
          button.addEventListener('click', this.handleImport);
          break;
        default:
          // Check for custom button handlers
          if (this.actionButtons.additionalButtons) {
            const customButton = this.actionButtons.additionalButtons.find(btn => btn.action === action);
            if (customButton && customButton.handler) {
              button.addEventListener('click', (e) => customButton.handler.call(this, e));
            }
          }
      }
    });
  }

  /**
   * Unbind action button events
   */
  unbindActionButtons() {
    if (!this.element) return;
    
    // Unbind all action buttons
    this.element.querySelectorAll('[data-action]').forEach(button => {
      const action = button.getAttribute('data-action');
      
      switch (action) {
        case 'refresh':
          button.removeEventListener('click', this.handleRefresh);
          break;
        case 'add':
          button.removeEventListener('click', this.handleAdd);
          break;
        case 'export':
          button.removeEventListener('click', this.handleExport);
          break;
        case 'import':
          button.removeEventListener('click', this.handleImport);
          break;
      }
    });
  }

  /**
   * Override getTemplate to provide table container template
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
   * After render hook - create and initialize table
   */
  async onAfterRender() {
    await super.onAfterRender();
    
    // Find table container
    const containerId = `table-${this.pageName || 'default'}-container`;
    const container = this.element.querySelector(`#${containerId}`);
    
    if (!container) {
      console.error('Table container not found:', containerId);
      return;
    }
    
    // Create table instance with action buttons config
    this.table = new Table({
      ...this.tableConfig,
      container: container,
      showRefresh: this.showRefresh,
      showAdd: this.showAdd,
      showExport: this.showExport,
      modelName: this.modelName,
      onRefresh: this.onRefresh,
      onAdd: this.onAdd,
      onExport: this.onExport
    });
    
    // Listen for table events
    if (this.table.container) {
      // Listen for data loaded
      this.table.container.addEventListener('table:data:loaded', () => {
        this.lastUpdated = new Date().toLocaleTimeString();
        this.loadError = null;
        this.updateStatusDisplay();
      });
      
      // Listen for data errors
      this.table.container.addEventListener('table:data:error', (e) => {
        this.loadError = e.detail?.message || 'Failed to load data';
        this.updateStatusDisplay();
      });
    }
    
    // Apply initial state from URL
    this.applyStateToTable(this.currentState);
    
    // Bind event listeners
    this.bindTableEvents();
    this.bindActionButtons();
    
    // Update initial status
    this.updateStatusDisplay();
  }

  /**
   * Before destroy hook - cleanup
   */
  async onBeforeDestroy() {
    // Unbind event listeners
    this.unbindTableEvents();
    this.unbindActionButtons();
    
    // Clear debounce timer
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    
    // Destroy table
    if (this.table && typeof this.table.destroy === 'function') {
      this.table.destroy();
    }
    
    this.table = null;
    
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
   * Static factory method for easy creation
   * @param {object} options - Configuration options
   * @returns {TablePage} New TablePage instance
   */
  static create(options = {}) {
    return new TablePage(options);
  }
}

export default TablePage;