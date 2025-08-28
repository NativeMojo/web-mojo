/**
 * TablePage - Page component that manages a Table with URL parameter synchronization
 * Automatically syncs pagination, sorting, and filtering with URL parameters
 * Includes built-in refresh, add, export, and other common table operations
 */

import Page from '../core/Page.js';
import Table from './Table.js';
import { getTemplate, components_TablePage_mst } from '../templates.js';

class TablePage extends Page {
  // Static template property pointing to external template file

  constructor(options = {}) {
    // Handle both 'name' and 'pageName' properties
    if (options.name && !options.pageName) {
      options.pageName = options.name;
    }
    options.templates = getTemplate(components_TablePage_mst);

    super(options);

    // Model configuration
    this.modelName = options.modelName || 'Item';
    this.modelNamePlural = options.modelNamePlural || `${this.modelName}s`;
    this.tableContainerId = `table-container-${this.id}`;

    // Extract filters from columns
    const extractedFilters = {};
    if (options.columns) {
      options.columns.forEach(column => {
        if (column.filter) {
          extractedFilters[column.key] = column.filter;
        }
      });
    }

    this.config = {
        title: this.pageOptions.title || this.pageName,
        description: this.pageOptions.description,

        pageName: this.pageName,
    };

    // Table configuration
    this.tableConfig = {
      containerId: this.tableContainerId,
      Collection: options.Collection || null,
      collection: options.collection || null,
      columns: options.columns || [],
      contextMenu: options.contextMenu || null,
      actions: options.actions || null,
      filters: { ...extractedFilters, ...(options.filters || {}) },
      collectionParams: options.collectionParams || {},
      groupFiltering: options.groupFiltering || false,
      listOptions: options.listOptions || {},
      view: options.view || 'table',
      itemViewClass: options.itemViewClass || null,
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
      viewDialogOptions: options.viewDialogOptions || {},
      ...options.tableOptions
    };

    // URL synchronization
    this.urlSyncEnabled = options.urlSyncEnabled !== undefined ? options.urlSyncEnabled : true;

    // Page-level actions
    this.showAdd = options.showAdd !== undefined ? options.showAdd : true;
    this.showExport = options.showExport !== undefined ? options.showExport : true;

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

    // Status tracking
    this.lastUpdated = null;
    this.isLoading = false;
    this.loadError = null;

    // Page-level action handlers (View's event system handles binding)

    // Flag to prevent circular updates when table triggers URL change
    this._isUpdatingUrl = false;

    // Store custom toolbar actions
    this.customToolbarActions = {};

    // Store bulk actions
    this.bulkActions = [];
  }

  getTemplate() {
      return components_TablePage_mst;
  }

  /**
   * Initialize page - create Table as child view
   */
  onInit() {
    if (this.initialized) return;
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
      containerId: this.tableContainerId,
      formCreate: this.options.formCreate,
      formEdit: this.options.formEdit || this.options.formCreate,
      showRefresh: this.showRefresh,
      showAdd: this.showAdd,
      showExport: this.showExport,
      modelName: this.modelName,
      onRefresh: this.onRefresh,
      onAdd: this.onAdd,
      onExport: this.onExport,
      ...this.tableConfig
    });

    // Add table as a child view - framework will handle rendering
    this.addChild(this.table, 'table');

    // Listen for table parameter changes for URL synchronization
    this.table.on('params-changed', () => this.syncUrlWithTable());

    // Listen for data events for status updates
    this.table.on('data:loaded', () => {
      this.lastUpdated = new Date().toLocaleTimeString();
      this.updateStatusDisplay();
    });
    this.table.on('data:error', (error) => {
      this.loadError = error.message;
      this.updateStatusDisplay();
      this.showError('Failed to load data: ' + error.message);
    });
    this.initialized = true;
    console.log(`TablePage ${this.pageName} initialized with Table as child view`);
  }


  /**
   * Called when entering this page (before render)
   * Override this method for initialization logic
   */
  async onEnter() {
      super.onEnter();
      console.log("onEnter called");
      this.table.handleRefresh();
  }


  /**
   * Handle URL parameters when page is activated
   * @param {object} params - Route parameters
   * @param {object} query - Query string parameters
   */
  onParams(params = {}, query = {}) {
    if (!this.initialized) this.onInit();
    super.onParams(params, query);

    // Apply URL parameters to collection if not currently updating URL
    if (this.table.collection && !this._isUpdatingUrl) {
      this.applyUrlToCollection(query);
    }
  }

  /**
   * Apply URL parameters directly to collection params
   * @param {object} query - Query parameters
   */
  applyUrlToCollection(query) {
    // Simple direct mapping - no complex parsing needed
    const params = {
      start: parseInt(query.start) || 0,
      size: parseInt(query.size) || 10
    };

    if (query.sort) params.sort = query.sort;
    if (query.search) params.search = query.search;

    // Add any other query params as filters
    Object.entries(query).forEach(([key, value]) => {
      if (!['start', 'size', 'sort', 'search'].includes(key) && value) {
        params[key] = value;
      }
    });

    // Update collection params and trigger refresh
    this.table.collection.params = { ...this.table.collection.params, ...params };
    // this.refreshTable();
  }

  /**
   * Sync URL with current table state
   */
   syncUrlWithTable() {
     if (!this.urlSyncEnabled || !this.table.collection || !this.app?.router || this._isUpdatingUrl) return;

     // Check if URL params would actually change to prevent unnecessary updates
     const currentUrl = new URL(window.location);
     const currentParams = {};
     for (const [key, value] of currentUrl.searchParams) {
       if (key !== 'page') {
         currentParams[key] = value;
       }
     }

     // Get desired params from table collection
     const desiredParams = { ...this.table.collection.params };

     // Check if there are any changes needed (Router will clear unused params automatically)
     const hasChanges =
       Object.keys(desiredParams).some(key =>
         String(currentParams[key] || '') !== String(desiredParams[key] || '')
       ) ||
       Object.keys(currentParams).some(key =>
         !(key in desiredParams)
       );

     if (!hasChanges) return;

     // Router will clear all existing params and only keep the ones we pass
     this._isUpdatingUrl = true;
     this.app.router.updateUrl(desiredParams, { replace: true });
     setTimeout(() => { this._isUpdatingUrl = false; }, 100);
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
   * After render hook - bind action buttons
   */
  async onAfterRender() {
    await super.onAfterRender();

    // Bind action buttons
    // this.bindActionButtons();
  }

  /**
   * After mount hook - get collection reference and apply state
   */
  async onAfterMount() {
    await super.onAfterMount();

    // Apply initial state from URL if table is ready
    // if (this.table) {
    //   this.applyStateToTable(this.currentState);
    // }

    // Update initial status display
    this.updateStatusDisplay();
  }

  /**
   * Before destroy hook - cleanup
   */
  async onBeforeDestroy() {
    // Unbind action buttons
    // this.unbindActionButtons();

    // Clear debounce timer
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    // Remove event listeners from table
    if (this.table) {
      this.table.off('params-changed');
      this.table.off('data:loaded');
      this.table.off('data:error');
    }

    // Parent class will handle destroying child views (including table)
    await super.onBeforeDestroy();
  }

  /**
   * Refresh table data by delegating to Table component
   */
  async refreshTable() {
    if (this.table) {
      await this.table.refresh();
    }
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
