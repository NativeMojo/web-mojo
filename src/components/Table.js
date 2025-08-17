/**
 * Table - Advanced data table component for MOJO framework
 * Displays collections with filtering, sorting, pagination, and actions
 *
 * Usage Examples:
 *
 * // Preloaded Data (no REST fetching)
 * const collection = new MyCollection();
 * collection.add(new MyModel({...}));
 * const table = new Table({
 *   collection: collection,
 *   options: { preloaded: true },
 *   // ... other config
 * });
 *
 * // REST Data (fetch from API)
 * const table = new Table({
 *   Collection: MyModelClass,
 *   options: { preloaded: false }, // default
 *   // ... other config
 * });
 */

import dataFormatter from '../utils/DataFormatter.js';
import View from '../core/View.js';
import Dialog from './Dialog.js';


class Table extends View {
  constructor(options = {}) {
    // Call parent constructor
    super({
      ...options,
      tagName: 'div',
      className: 'table-component'
    });

    // Core properties from design doc
    // Initialize with defaults that might be overridden
    this.Collection = options.Collection || null;
    this.columns = options.columns || [];
    this.filters = options.filters || {};
    this.collectionParams = options.collectionParams || {};
    this.groupFiltering = options.groupFiltering || false;
    this.listOptions = options.listOptions || {};
    this.view = options.view || 'table';
    this.batchActions = options.batchActions || null;
    if (options.actions === undefined) options.actions = ['view', 'edit', 'delete'];
    this.actions = options.actions || null;

    // Internal state
    this.collection = options.collection || null;


    this.loading = false;

    // Total items available (kept for local filtering)
    this.count = 0;
    this.selectedItems = new Set();

    // Configuration
    this.options = {
      selectable: false,
      searchable: true,
      searchPlacement: 'toolbar', // 'dropdown' or 'toolbar'
      sortable: true,
      filterable: true,
      paginated: true,
      responsive: true,
      striped: true,
      bordered: false,
      hover: true,
      preloaded: false,  // Skip REST fetching when true
      batchPanelTitle: "Rows",
      ...options
    };


    // Event listeners
    this.listeners = {};
    this.rowActions = options.rowActions || [];

    this.initCollection();
  }

  // Getters and setters that proxy to collection.params as single source of truth
  get start() {
    return this.collection?.params?.start || 0;
  }

  set start(value) {
    if (this.collection) {
      this.collection.params.start = value;
    }
  }

  get size() {
    return this.collection?.params?.size || this.options.size || 10;
  }

  set size(value) {
    if (this.collection) {
      this.collection.params.size = value;
    }
  }

  /**
   * Set start index with proper event handling and validation
   * @param {number} value - Start index
   * @param {boolean} emit - Whether to emit params-changed event (default: true)
   */
  setStart(value, emit = true) {
    if (!this.collection) return;

    const newStart = Math.max(0, parseInt(value) || 0);
    if (this.collection.params.start !== newStart) {
      this.collection.params.start = newStart;
      if (emit) {
        this.emit('params-changed');
      }
    }
  }

  /**
   * Set page size with proper event handling and validation
   * @param {number} value - Page size
   * @param {boolean} emit - Whether to emit params-changed event (default: true)
   */
  setSize(value, emit = true) {
    if (!this.collection) return;

    const newSize = Math.max(1, parseInt(value) || 10);
    if (this.collection.params.size !== newSize) {
      this.collection.params.size = newSize;
      if (emit) {
        this.emit('params-changed');
      }
    }
  }

  get sortBy() {
    const sort = this.collection?.params?.sort;
    if (!sort) return null;
    return sort.startsWith('-') ? sort.slice(1) : sort;
  }

  get sortDirection() {
    const sort = this.collection?.params?.sort;
    if (!sort) return 'asc';
    return sort.startsWith('-') ? 'desc' : 'asc';
  }

  setSort(field, direction = 'asc') {
    if (this.collection) {
      this.collection.params.sort = direction === 'desc' ? `-${field}` : field;
    }
  }

  get activeFilters() {
    if (!this.collection?.params) return {};
    const { start, size, sort, ...filters } = this.collection.params;
    return filters;
  }

  setFilter(key, value) {
    if (this.collection) {
      if (value === null || value === undefined || value === '') {
        delete this.collection.params[key];
      } else {
        this.collection.params[key] = value;
      }
    }
  }

  /**
   * Cleanup method - override View's destroy
   */
  async destroy() {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = null;
    }

    // Call parent destroy
    await super.destroy();
  }

  /**
   * Get the table template
   */
  async getTemplate() {
    // Load data if needed
    // await this.loadDataIfNeeded();

    // Return the table HTML
    return this.buildTableHTML();
  }

  /**
   * Load data if needed
   */
  async loadDataIfNeeded() {
    let hasData = false;
    let errorMessage = null;

    // Load data if not preloaded
    if (!this.options.preloaded) {
      try {
        if (this.collection && typeof this.collection.fetch === 'function') {
          await this.collection.fetch();
          hasData = this.collection.length > 0;
        }
      } catch (error) {
        console.error('Table: Error fetching data:', error);
        errorMessage = `Failed to load data: ${error.message}`;
        hasData = false;
      }
    } else {
      // For preloaded data, just check if we have any
      hasData = this.collection && this.collection.length > 0;
    }

    this.hasData = hasData;
    this.errorMessage = errorMessage;
  }

  /**
   * Initialize table with data
   * @returns {Promise} Promise that resolves when initialization is complete
   */
  async initializeData() {
    if (!this.collection) return;

    // Check if we have data already
    const hasData = this.collection.models && this.collection.models.length > 0;

    // Only fetch if we don't have data and preloaded is false
    if (!hasData && !this.options.preloaded) {
      try {
        // Only attempt fetch if Rest client is available
        if (this.collection.constructor.Rest) {
          await this.collection.fetch();
        } else {
          console.info('Table: No REST client available, using existing data or empty table');
        }
      } catch (fetchError) {
        console.warn('Table: Initial data fetch failed:', fetchError);
        throw fetchError; // Re-throw so caller can handle
      }
    } else if (this.options.preloaded) {
      console.info('Table: Using preloaded data, skipping fetch');
    }
  }

  /**
   * Apply list options configuration
   */
  applyListOptions() {
    if (this.listOptions.size) {
      this.size = this.listOptions.size;
    }

    if (this.listOptions.defaultSort) {
      this.sortBy = this.listOptions.defaultSort.field;
      this.sortDirection = this.listOptions.defaultSort.direction || 'asc';
    }

    if (this.listOptions.defaultFilters) {
      this.activeFilters = { ...this.listOptions.defaultFilters };
    }
  }

  /**
   * Render the table
   * @param {HTMLElement} container - Container element
   * Called after initialization
   */
  async onInit() {
    // Initialize size from options
    if (this.options.size) {
      this.size = this.options.size;
    } else if (this.options.tableOptions?.size) {
      this.size = this.options.tableOptions.size;
    } else if (this.options.tableOptions?.defaultPageSize) {
      this.size = this.options.tableOptions.defaultPageSize;
    }

    // Extract filters from columns if not explicitly provided
    if (!this.filters || Object.keys(this.filters).length === 0) {
      this.filters = {};
      this.columns.forEach(column => {
        if (column.filter) {
          this.filters[column.key] = '';
        }
      });
    }
  }

  initTableListeners() {
    // Set up collection event listeners with render loop protection
    this.collection.on('update', () => {
      // Only re-render if we're mounted and not already rendering
      console.log("Table:collection:update event");
      if (this.isMounted() && !this.isRendering) {
        this.render();
      }
    });

    // this.collection.on('add', () => {
    //   // Only re-render if we're mounted and not already rendering
    //   // Skip during initial collection load
    //   if (this.rendered && this.mounted && !this.isRendering && !this.collection.loading) {
    //     this.render();
    //   }
    // });

    this.collection.on('remove', () => {
      // Only re-render if we're mounted and not already rendering
      if (this.rendered && this.mounted && !this.isRendering) {
        this.render();
      }
    });
  }

  initCollection() {
    // Only create collection if we don't already have one (preserve preloaded collections)
    if (this.Collection && !this.collection) {
      this.collection = new this.Collection(this.Collection.Model || Object, {
        size: this.options.size || 10,
        params: {
          start: 0,
          size: this.options.size || 10,
          ...this.collectionParams
        },
        preloaded: this.options.preloaded,
        restEnabled: !this.options.preloaded
      });
    }

    if (this.collection) {
        this.initTableListeners();
    }
  }

  /**
   * Called before rendering
   */
  async onBeforeRender() {
    // Preserve focus state for restoration after render
    if (this.element) {
      const focusedElement = this.element.querySelector(':focus');
      if (focusedElement) {
        this.focusState = {
          action: focusedElement.getAttribute('data-action'),
          value: focusedElement.value,
          selectionStart: focusedElement.selectionStart,
          selectionEnd: focusedElement.selectionEnd
        };
      }
    }

    this.loading = true;
  }

  /**
   * Build query parameters for API requests
   * @returns {object} Query parameters
   */


  /**
   * Build table HTML structure
   * @returns {string} Table HTML
   */
  buildTableHTML() {
    const tableClasses = this.buildTableClasses();
    const data = this.collection ? this.collection.models : [];

    return `
      <div class="mojo-table-wrapper">
        ${this.buildToolbar()}
        <div class="table-responsive">
          <table class="${tableClasses}">
            ${this.buildTableHeader()}
            ${this.buildTableBody(data)}
          </table>
        </div>
        ${this.buildBatchActionsPanel()}
        ${this.buildPagination()}
      </div>
    `;
  }

  /**
   * Build table CSS classes
   * @returns {string} CSS classes
   */
  buildTableClasses() {
    let classes = ['table'];

    if (this.options.striped) classes.push('table-striped');
    if (this.options.bordered) classes.push('table-bordered');
    if (this.options.hover) classes.push('table-hover');
    if (this.options.responsive) classes.push('table-responsive');

    return classes.join(' ');
  }

  /**
   * Build toolbar with search and filters
   * @returns {string} Toolbar HTML
   */
  buildToolbar() {
    if (!this.options.searchable && !this.options.filterable) {
      return '';
    }

    return `
      <div class="mojo-table-toolbar mb-3">
        <div class="d-flex align-items-center gap-2">
          ${this.buildActionButtons()}
          ${this.options.searchable && this.options.searchPlacement === 'toolbar' ? this.buildToolbarSearch() : ''}
          ${this.buildFilterDropdown()}
        </div>
        ${this.buildActivePills()}
      </div>
    `;
  }

  /**
   * Build action buttons (refresh, add, export) for toolbar
   * @returns {string} Action buttons HTML
   */
  buildActionButtons() {

    let buttons = [];

    // Refresh button (always shown if enabled)
    if ((this.options.showRefresh !== false)) {
      buttons.push(`
        <button class="btn btn-sm btn-outline-secondary"
                data-action="refresh"
                title="Refresh">
          <i class="bi bi-arrow-clockwise"></i>
        </button>
      `);
    }

    // Add button (optional)
    if (this.options.showAdd) {
      buttons.push(`
        <button class="btn btn-sm btn-success"
                data-action="add"
                title="Add ${this.options.modelName || 'Item'}">
          <i class="bi bi-plus-circle me-1"></i>
          <span class="d-none d-sm-inline">Add</span>
        </button>
      `);
    }

    // Export button (optional)
    if (this.options.showExport) {
      buttons.push(`
        <button class="btn btn-sm btn-outline-secondary"
                data-action="export"
                title="Export">
          <i class="bi bi-download me-1"></i>
          <span class="d-none d-sm-inline">Export</span>
        </button>
      `);
    }

    // Add separator if we have buttons and search/filter will follow
    if (buttons.length > 0 && (this.options.searchable || this.filters)) {
      buttons.push(`<div class="vr mx-2"></div>`);
    }

    return buttons.join('');
  }

  /**
   * Build filter dropdown for toolbar
   * @returns {string} Filter dropdown HTML
   */
  buildFilterDropdown() {
    // Show dropdown if we have filters, or if search is in dropdown mode
    const showDropdown = (this.filters && Object.keys(this.filters).length > 0) ||
                         (this.options.searchable && this.options.searchPlacement === 'dropdown');

    if (!showDropdown) {
      return '';
    }

    const hasFilters = this.filters && Object.keys(this.filters).length > 0;

    return `
      <div class="dropdown">
        <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button"
                data-bs-toggle="dropdown" aria-expanded="false">
          <i class="bi bi-filter me-1"></i>
          <span class="d-none d-sm-inline">Add Filter</span>
        </button>
        <div class="dropdown-menu p-3" style="min-width: 300px;">
          ${this.options.searchable && this.options.searchPlacement === 'dropdown' ? this.buildSearchInDropdown() : ''}
          ${hasFilters ? this.buildFiltersInDropdown() : ''}
        </div>
      </div>
    `;
  }

  /**
   * Build search box for toolbar
   * @returns {string} Search box HTML
   */
  buildToolbarSearch() {
    const searchValue = this.activeFilters.search || '';

   return `
     <div class="flex-grow-1" style="max-width: 400px;">
       <div class="input-group input-group-sm">
         <span class="input-group-text">
           <i class="bi bi-search"></i>
         </span>
         <input type="search"
                class="form-control"
                placeholder="Search ${this.options.searchPlaceholder || '...'}"
                data-filter="search"
                data-change-action="apply-search"
                value="${searchValue}"
                aria-label="Search">
       </div>
     </div>
   `;
 }

  /**
   * Build filter controls
   * @returns {string} Filters HTML
   */
  buildSearchInDropdown() {
    return `
      <div class="mb-3">
        <label class="form-label fw-bold small">Search</label>
        <div class="input-group input-group-sm">
          <input type="text" class="form-control" placeholder="Search..."
                 data-filter="search" data-change-action="apply-search" value="${this.activeFilters.search || ''}">
          <button class="btn btn-primary" type="button" data-action="apply-search">
            <i class="bi bi-search"></i>
          </button>
        </div>
      </div>
      ${Object.keys(this.filters || {}).length > 0 ? '<hr class="my-2">' : ''}
    `;
  }

  buildToolbarSearch() {
    return `
      <div class="col-auto">
        <div class="input-group input-group-sm" style="width: 250px;">
          <input type="text" class="form-control" placeholder="Search..."
                 data-filter="search" data-change-action="apply-search" value="${this.activeFilters.search || ''}">
          <button class="btn btn-outline-secondary" type="button" data-action="apply-search">
            <i class="bi bi-search"></i>
          </button>
        </div>
      </div>
    `;
  }

  buildFiltersInDropdown() {
    if (!this.filters || Object.keys(this.filters).length === 0) {
      return '';
    }

    return Object.entries(this.filters).map(([key, filter]) => {
      return this.buildFilterInDropdown(key, filter);
    }).join('');
  }

  buildFilterInDropdown(key, filter) {
    const value = this.activeFilters[key] || '';
    const label = filter.label || key.charAt(0).toUpperCase() + key.slice(1);

    switch (filter.type) {
      case 'select':
        return `
          <div class="mb-3">
            <label class="form-label fw-bold small">${label}</label>
            <select class="form-select form-select-sm" data-filter="${key}" data-change-action="apply-filter">
              <option value="">${filter.placeholder || 'All'}</option>
              ${filter.options.map(opt =>
                `<option value="${opt.value}" ${value === opt.value ? 'selected' : ''}>
                  ${opt.label}
                </option>`
              ).join('')}
            </select>
          </div>
        `;

      case 'date':
        return `
          <div class="mb-3">
            <label class="form-label fw-bold small">${label}</label>
            <input type="date" class="form-control form-control-sm" data-filter="${key}"
                   value="${value}" data-change-action="apply-filter">
          </div>
        `;

      default:
        return `
          <div class="mb-3">
            <label class="form-label fw-bold small">${label}</label>
            <div class="input-group input-group-sm">
              <input type="text" class="form-control" data-filter="${key}"
                     value="${value}" placeholder="${filter.placeholder || ''}">
              <button class="btn btn-primary" type="button" data-action="apply-filter">
                Apply
              </button>
            </div>
          </div>
        `;
    }
  }

  buildActivePills() {
    const activeFilters = Object.entries(this.activeFilters).filter(([key, value]) =>
      value && value.toString().trim() !== ''
    );

    if (activeFilters.length === 0) {
      return '';
    }

    const pills = activeFilters.map(([key, value]) => {
      const displayValue = this.getFilterDisplayValue(key, value);
      const label = this.getFilterLabel(key);

      return `
        <span class="badge bg-primary me-2 mb-2 fs-6 py-2 px-3">
          <i class="bi bi-${key === 'search' ? 'search' : 'filter'} me-1"></i>
          ${label}: ${displayValue}
          <button type="button" class="btn-close btn-close-white ms-2"
                  style="font-size: 0.75em;" data-action="remove-filter"
                  data-filter="${key}" aria-label="Remove filter"></button>
        </span>
      `;
    }).join('');

    const clearAllButton = activeFilters.length > 1 ? `
      <button class="btn btn-sm btn-outline-secondary mb-2" data-action="clear-all-filters">
        <i class="bi bi-x-circle me-1"></i>
        Clear All
      </button>
    ` : '';

    return `
      <div class="row mt-2">
        <div class="col-12">
          <div class="d-flex flex-wrap align-items-center">
            ${pills}
            ${clearAllButton}
          </div>
        </div>
      </div>
    `;
  }

  getFilterDisplayValue(key, value) {
    if (key === 'search') {
      return `"${value}"`;
    }

    const filter = this.filters[key];
    if (filter && filter.type === 'select' && filter.options) {
      const option = filter.options.find(opt => opt.value === value);
      return option ? option.label : value;
    }

    return value;
  }

  getFilterLabel(key) {
    if (key === 'search') {
      return 'Search';
    }

    const filter = this.filters[key];
    if (filter && filter.label) {
      return filter.label;
    }

    return key.charAt(0).toUpperCase() + key.slice(1);
  }

  /**
   * Update search input values across both toolbar and dropdown
   * @param {string} value - Search value to set
   */
  updateSearchInputs(value) {
    const searchInputs = this.element.querySelectorAll('[data-filter="search"]');
    searchInputs.forEach(input => {
      input.value = value || '';
    });
  }

  closeFilterDropdown() {
    const dropdown = this.element.querySelector('.dropdown-toggle[data-bs-toggle="dropdown"]');
    if (dropdown && window.bootstrap && window.bootstrap.Dropdown) {
      const dropdownInstance = window.bootstrap.Dropdown.getInstance(dropdown);
      if (dropdownInstance) {
        dropdownInstance.hide();
      }
    }
  }

  /**
   * Build table header
   * @returns {string} Table header HTML
   */
  buildTableHeader() {
    let actionHeaderCell = '';
    if (this.options.actions) {
      actionHeaderCell = '<th>Actions</th>';
    }

    const headerCells = this.columns.map(column => {
      const sortable = this.options.sortable && column.sortable !== false;
      const currentSort = this.sortBy === column.key ? this.sortDirection : null;
      const sortIcon = this.getSortIcon(currentSort);

      const sortDropdown = sortable ? `
        <div class="dropdown d-inline-block ms-2">
          <button class="btn btn-sm btn-link p-0 text-decoration-none" type="button"
                  data-bs-toggle="dropdown" aria-expanded="false">
            ${sortIcon}
          </button>
          <ul class="dropdown-menu dropdown-menu-end">
            <li><a class="dropdown-item ${currentSort === 'asc' ? 'active' : ''}"
                   data-action="sort" data-field="${column.key}" data-direction="asc">
                <i class="bi bi-sort-alpha-down me-2"></i>Sort A-Z
                </a></li>
            <li><a class="dropdown-item ${currentSort === 'desc' ? 'active' : ''}"
                   data-action="sort" data-field="${column.key}" data-direction="desc">
                <i class="bi bi-sort-alpha-down-alt me-2"></i>Sort Z-A
                </a></li>
            <li><a class="dropdown-item ${currentSort === null ? 'active' : ''}"
                   data-action="sort" data-field="${column.key}" data-direction="none">
                <i class="bi bi-x-circle me-2"></i>No Sort
                </a></li>
          </ul>
        </div>
      ` : '';

      return `
        <th class="${sortable ? 'sortable' : ''}">
          <div class="d-flex align-items-center">
            <span>${column.title || column.key}</span>
            ${sortDropdown}
          </div>
        </th>
      `;
    }).join('');

    const selectAllCell = (this.batchActions && this.batchActions.length > 0) ?
      `<th style="width: 40px; padding: 0;">
        <div class="mojo-select-all-cell ${this.isAllSelected() ? 'selected' : ''}"
             data-action="select-all" data-table-instance="${this._instanceId}">
          <div class="mojo-checkbox">
            <i class="bi bi-check"></i>
          </div>
        </div>
      </th>` : '';

    return `
      <thead>
        <tr>
          ${selectAllCell}
          ${headerCells}
          ${actionHeaderCell}
        </tr>
      </thead>
    `;
  }

  /**
   * Get sort icon based on current sort direction
   * @param {string|null} direction - Current sort direction
   * @returns {string} Sort icon HTML
   */
  getSortIcon(direction) {
    if (direction === 'asc') {
      return '<i class="bi bi-sort-alpha-down text-primary"></i>';
    } else if (direction === 'desc') {
      return '<i class="bi bi-sort-alpha-down-alt text-primary"></i>';
    } else {
      return '<i class="bi bi-three-dots-vertical text-muted"></i>';
    }
  }

  /**
   * Build table body
   * @param {array} data - Table data
   * @returns {string} Table body HTML
   */
  buildTableBody(data) {
    // Get data from collection if not provided
    if (!data && this.collection) {
      data = this.collection.models || [];
    }

    // Apply client-side filtering, sorting, and pagination
    data = this.processData(data || []);

    if (!data || data.length === 0) {
      const colspan = this.columns.length + (this.options.selectable ? 1 : 0) + 1;
      return `
        <tbody>
          <tr>
            <td colspan="${colspan}" class="text-center py-4">
              <div class="text-muted">
                <i class="bi bi-inbox fa-2x mb-2"></i>
                <p>No data available</p>
              </div>
            </td>
          </tr>
        </tbody>
      `;
    }

    const rows = data.map((item, index) => this.buildTableRow(item, index)).join('');

    return `<tbody>${rows}</tbody>`;
  }

  /**
   * Process data with filtering, sorting, and pagination
   * @param {array} data - Raw data
   * @returns {array} Processed data
   */
  processData(data) {
    let processedData = [...data];

    // For REST collections, server handles filtering and sorting
    // For local collections, apply client-side filtering and sorting
    if (!this.collection?.restEnabled) {
      // Apply search filter
      if (this.activeFilters.search) {
        const searchTerm = this.activeFilters.search.toLowerCase();
        processedData = processedData.filter(item => {
          return this.columns.some(column => {
            const value = this.getCellValue(item, column);
            return String(value || '').toLowerCase().includes(searchTerm);
          });
        });
      }

      // Apply other filters
      Object.entries(this.activeFilters).forEach(([key, value]) => {
        if (key !== 'search' && value && value !== '') {
          processedData = processedData.filter(item => {
            const itemValue = this.getCellValue(item, {key});
            return itemValue === value;
          });
        }
      });

      // Apply sorting
      if (this.sortBy) {
        processedData.sort((a, b) => {
          const aValue = this.getCellValue(a, {key: this.sortBy}) || '';
          const bValue = this.getCellValue(b, {key: this.sortBy}) || '';

          let comparison = 0;
          if (aValue < bValue) comparison = -1;
          if (aValue > bValue) comparison = 1;

          return this.sortDirection === 'desc' ? -comparison : comparison;
        });
      }
    }

    // Handle pagination based on collection type
    if (this.collection?.restEnabled) {
      // REST collections: Server handles pagination, use metadata with standard properties
      this.count = this.collection.meta?.count || processedData.length;
      this.size = this.collection.meta?.size || this.size;
      this.start = this.collection.meta?.start || this.start;
      // Don't slice data - server already sent the right page
    } else {
      // Local collections: Client-side pagination
      this.count = processedData.length;

      if (this.options.paginated) {
        const end = this.start + this.size;
        processedData = processedData.slice(this.start, end);
      }
    }

    return processedData;
  }

  /**
   * Get visible items (current page)
   * @returns {array} Visible items
   */
  getVisibleItems() {
    const data = this.collection?.models || [];
    return this.processData(data);
  }

  /**
   * Build individual table row
   * @param {object} item - Data item
   * @param {number} index - Row index
   * @returns {string} Table row HTML
   */
  buildTableRow(item, index) {
    const cells = this.columns.map(column => {
      return this.buildTableCell(item, column);
    }).join('');

    const itemId = String(this.getCellValue(item, {key: 'id'}));
    const selectCell = (this.batchActions && this.batchActions.length > 0) ?
      `<td style="padding: 0;">
        <div class="mojo-select-cell ${this.selectedItems.has(itemId) ? 'selected' : ''}"
             data-action="select-item" data-id="${itemId}" data-table-instance="${this._instanceId}">
          <div class="mojo-checkbox">
            <i class="bi bi-check fs-3"></i>
          </div>
        </div>
      </td>` : '';

    const actionCell = this.buildActionCell(item);

    return `
      <tr data-id="${itemId}" class="${this.selectedItems.has(itemId) ? 'selected' : ''}" style="cursor: pointer;">
        ${selectCell}
        ${cells}
        ${actionCell}
      </tr>
    `;
  }

  /**
   * Build individual table cell
   * @param {object} item - Data item
   * @param {object} column - Column configuration
   * @returns {string} Table cell HTML
   */
  buildTableCell(item, column) {
    let value = this.getCellValue(item, column);

    // Apply column formatter (new DataFormatter support)
    if (column.formatter) {
      value = this.applyFormatter(column.formatter, value, item, column);
    }
    // Legacy support for column.format
    else if (column.format && typeof column.format === 'function') {
      value = column.format(value, item);
    } else if (column.type) {
      value = this.formatCellValue(value, column.type, column.options);
    }

    // Apply column template
    if (column.template) {
      if (typeof column.template === 'function') {
        value = column.template(value, item);
      } else if (typeof column.template === 'string') {
        // Simple template substitution
        value = column.template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
          return this.getCellValue(item, { key }) || '';
        });
      }
    }

    const classes = column.class || '';

    return `<td class="${classes}" data-action="item-clicked" data-id="${item.id}">${value}</td>`;
  }

  /**
   * Apply formatter to a cell value
   * @param {string|function|object} formatter - Formatter configuration
   * @param {*} value - Cell value
   * @param {object} row - Row data
   * @param {object} column - Column configuration
   * @returns {string} Formatted value
   */
  applyFormatter(formatter, value, row, column) {
    // Function formatter
    if (typeof formatter === 'function') {
      const context = {
        value,
        row,
        column,
        table: this,
        index: this.collection?.models?.indexOf(row) ?? -1
      };
      return formatter(value, context);
    }

    // String formatter (could be a formatter key or pipe string)
    if (typeof formatter === 'string') {
      // Check if it's a pipe string
      if (formatter.includes('|') || formatter.includes('(')) {
        return dataFormatter.pipe(value, formatter);
      }
      // Simple formatter key
      return dataFormatter.apply(formatter, value);
    }

    // Object formatter with configuration
    if (typeof formatter === 'object' && formatter !== null) {
      if (formatter.formatter) {
        // Nested formatter with args/options
        const formatterFn = typeof formatter.formatter === 'string'
          ? (v) => dataFormatter.apply(formatter.formatter, v, ...(formatter.args || []))
          : formatter.formatter;

        if (typeof formatterFn === 'function') {
          const context = {
            value,
            row,
            column,
            table: this,
            index: this.collection?.models?.indexOf(row) ?? -1,
            options: formatter.options || {}
          };
          return formatterFn(value, context);
        }
      } else if (formatter.name) {
        // Object with name and args
        return dataFormatter.apply(formatter.name, value, ...(formatter.args || []));
      }
    }

    return value;
  }

  /**
   * Get cell value from item
   * @param {object} item - Data item
   * @param {object} column - Column configuration
   * @returns {*} Cell value
   */
  getCellValue(item, column) {
    try {
      // Handle RestModel instances with get() method
      if (typeof item.get === 'function') {
        return item.get(column.key);
      }

      // Check if item has a data property (RestModel structure)
      const dataSource = item.data || item;

      // Support nested properties
      const keys = column.key.split('.');
      let value = dataSource;
      for (const key of keys) {
        value = value?.[key];
      }

      return value;
    } catch (error) {
      console.warn(`Table: Error getting cell value for column ${column.key}:`, error);
      return `[Error: ${error.message}]`;
    }
  }

  /**
   * Format cell value based on type
   * @param {*} value - Raw value
   * @param {string} type - Format type
   * @param {object} options - Format options
   * @returns {string} Formatted value
   */
  formatCellValue(value, type, options = {}) {
    if (value === null || value === undefined) {
      return '';
    }

    switch (type) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: options.currency || 'USD'
        }).format(value);

      case 'date':
        const date = new Date(value);
        return date.toLocaleDateString(options.locale || 'en-US', options.dateFormat);

      case 'datetime':
        const datetime = new Date(value);
        return datetime.toLocaleString(options.locale || 'en-US');

      case 'number':
        return new Intl.NumberFormat('en-US', options).format(value);

      case 'boolean':
        return value ?
          '<i class="fas fa-check text-success"></i>' :
          '<i class="fas fa-times text-danger"></i>';

      case 'badge':
        const badgeClass = options.class || 'bg-primary';
        return `<span class="badge ${badgeClass}">${value}</span>`;

      case 'image':
        return `<img src="${value}" alt="" class="img-thumbnail" style="max-width: 50px; max-height: 50px;">`;

      case 'link':
        const href = options.href ? options.href.replace('{id}', this.getCellValue(item, {key: 'id'})) : '#';
        return `<a href="${href}" class="${options.class || ''}">${value}</a>`;

      default:
        return String(value);
    }
  }

  /**
   * Build action cell
   * @param {object} item - Data item
   * @returns {string} Action cell HTML
   */
  buildActionCell(item) {
    if (!this.actions) return '';
    const actions = this.actions;

    const actionButtons = actions.map(action => {
      switch (action) {
        case 'view':
          return `<button class="btn btn-sm btn-outline-primary" data-action="item-clicked" data-id="${this.getCellValue(item, {key: 'id'})}">
            <i class="bi bi-eye"></i>
          </button>`;

        case 'edit':
          return `<button class="btn btn-sm btn-outline-secondary" data-action="item-edit" data-id="${this.getCellValue(item, {key: 'id'})}" data-mode="edit">
            <i class="bi bi-pencil"></i>
          </button>`;

        case 'delete':
          return `<button class="btn btn-sm btn-outline-danger" data-action="delete-item" data-id="${this.getCellValue(item, {key: 'id'})}">
            <i class="bi bi-trash"></i>
          </button>`;

        default:
          if (typeof action === 'object') {
            return `<button class="btn btn-sm ${action.class || 'btn-outline-primary'}"
                      data-action="${action.action}" data-id="${this.getCellValue(item, {key: 'id'})}">
              ${action.icon ? `<i class="${action.icon}"></i>` : ''}
              ${action.label || ''}
            </button>`;
          }
          return '';
      }
    }).join(' ');

    return `<td><div class="btn-group">${actionButtons}</div></td>`;
  }

  /**
   * Build pagination controls with page size selection
   * @returns {string} Pagination HTML
   */
  buildPagination() {
    if (!this.options.paginated) {
      return '';
    }

    // Use count for total items (from collection meta or local count)
    const totalItems = this.collection?.restEnabled
      ? (this.collection?.meta?.count || 0)
      : (this.count || this.collection?.models?.length || 0);
    const totalPages = Math.ceil(totalItems / this.size);
    const currentPage = Math.floor(this.start / this.size) + 1;

    if (totalItems === 0) {
      return '';
    }

    const startItem = this.start + 1;
    const endItem = Math.min(this.start + this.size, totalItems);

    return `
      <div class="d-flex justify-content-between align-items-center mt-3">
        <div class="d-flex align-items-center">
          <span class="text-muted me-3">
            Showing ${startItem} to ${endItem} of ${totalItems} entries
          </span>
          <div class="d-flex align-items-center">
            <label class="form-label me-2 mb-0">Show:</label>
            <select class="form-select form-select-sm" style="width: auto;" data-change-action="page-size">
              <option value="5" ${this.size === 5 ? 'selected' : ''}>5</option>
              <option value="10" ${this.size === 10 ? 'selected' : ''}>10</option>
              <option value="25" ${this.size === 25 ? 'selected' : ''}>25</option>
              <option value="50" ${this.size === 50 ? 'selected' : ''}>50</option>
              <option value="100" ${this.size === 100 ? 'selected' : ''}>100</option>
            </select>
          </div>
        </div>
        ${totalPages > 1 ? `
          <nav aria-label="Table pagination">
            <ul class="pagination pagination-sm mb-0">
              <li class="page-item">
                <a class="page-link" href="#" data-action="page" data-page="${currentPage - 1}">
                  <i class="bi bi-chevron-left"></i>
                </a>
              </li>
              ${this.buildPaginationPages(currentPage, totalPages)}
              <li class="page-item">
                <a class="page-link" href="#" data-action="page" data-page="${currentPage + 1}">
                  <i class="bi bi-chevron-right"></i>
                </a>
              </li>
            </ul>
          </nav>
        ` : ''}
      </div>
    `;
  }

  /**
   * Build pagination page numbers
   * @param {number} currentPage - Current page
   * @param {number} totalPages - Total pages
   * @returns {string} Pagination pages HTML
   */
  buildPaginationPages(currentPage, totalPages) {
    const pages = [];
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(`
        <li class="page-item ${i === currentPage ? 'active' : ''}">
          <a class="page-link" href="#" data-action="page" data-page="${i}">${i}</a>
        </li>
      `);
    }

    return pages.join('');
  }

  /**
   * Get sort CSS class for column
   * @param {string} field - Field name
   * @returns {string} Sort CSS class
   */
  getSortClass(field) {
    if (this.sortBy !== field) {
      return '';
    }

    return this.sortDirection === 'asc' ? 'sort-asc' : 'sort-desc';
  }



  /**
   * Handle action events
   * @param {string} action - Action name
   * @param {Event} event - DOM event
   * @param {HTMLElement} target - Target element
   */
  async handleAction(action, event, target) {
    if (!target) {
      console.warn('handleAction called with no target element');
      return false;
    }

    try {
      // Use the new handleAction method pattern that View expects
      const methodName = `handleAction${action.charAt(0).toUpperCase() + action.slice(1).replace(/-([a-z])/g, (g) => g[1].toUpperCase())}`;

      if (typeof this[methodName] === 'function') {
        await this[methodName](event, target);
        return true;
      }

      return false; // Action not handled
    } catch (error) {
      console.error(`Error handling action ${action}:`, error);
      return true; // Handled with error
    }
  }

  // Action handler methods following the new naming convention
  async handleActionSort(event, element) {
    const field = element.getAttribute('data-field');
    const direction = element.getAttribute('data-direction');
    await this.handleSort(field, direction);
  }

  async handleActionPage(event, element) {
      // event.preventDefault();
    const page = parseInt(element.getAttribute('data-page'));
    await this.handlePageChange(page);
  }

  async handleActionPageSize(event, element) {
    // Only handle on 'change' events, not clicks
    if (event.type === 'click') return;
    const newSize = parseInt(element.value);
    await this.handlePageSizeChange(newSize);
  }

  async handleActionRefresh(event, element) {
    await this.handleRefresh(event);
  }

  async handleActionAdd(event, element) {
      await this.onItemAdd(event);
  }

  async handleActionExport(event, element) {
    this.handleExport(event);
  }



  async handleActionApplyFilter(event, element) {
    await this.handleFilterFromDropdown(event);

    // Only close dropdown for button clicks, not for select/input changes
    if (element.tagName === 'BUTTON') {
      setTimeout(() => this.closeFilterDropdown(), 100);
    }
  }

  async handleActionApplySearch(event, element) {
    await this.handleSearchInput(event);

    // Close dropdown for search in dropdown mode
    if (this.options.searchPlacement === 'dropdown') {
      setTimeout(() => this.closeFilterDropdown(), 100);
    }
  }

  async handleActionRemoveFilter(event, element) {
    await this.handleRemoveFilter(event);
  }

  async handleActionClearAllFilters(event, element) {
    await this.handleClearAllFilters(event);
  }

  async handleActionSelectAll(event, element) {
    event.stopPropagation();
    const isCurrentlyAllSelected = this.isAllSelected();
    this.handleSelectAll(!isCurrentlyAllSelected);
  }

  async handleActionSelectItem(event, element) {
    event.stopPropagation();
    const itemId = element.closest('[data-id]')?.getAttribute('data-id');
    if (itemId) {
      const isCurrentlySelected = this.selectedItems.has(itemId);
      this.handleSelectItem(itemId, !isCurrentlySelected);
    }
  }

  async handleActionItemClicked(event, element) {
    const itemId = element.getAttribute('data-id');
    const item = itemId ? this.collection?.get(itemId) : null;
    await this.onItemClicked(item, event, element);
  }

  async handleActionItemEdit(event, element) {
    const itemId = element.getAttribute('data-id');
    const item = itemId ? this.collection?.get(itemId) : null;
    const mode = element.getAttribute('data-mode') || 'view';
    await this.onItemEdit(item, mode, event, element);
  }

  async handleActionDeleteItem(event, element) {
    const itemId = element.getAttribute('data-id');
    const item = itemId ? this.collection?.get(itemId) : null;
    if (item) {
        this.onItemDelete(item, event);
    }
  }

  /**
   * Handle item clicked - from design doc
   * @param {object} item - Clicked item
   * @param {Event} event - DOM event
   * @param {HTMLElement} target - Target element
   */
  async onItemClicked(item, event, target) {
    console.log('Item clicked:', item);
    // Default implementation - can be overridden
    const dialogPromise = Dialog.showData({
      title: `#${item.id} ${this.options.modelName}`,
      model: item
    });

    // Emit event for external handlers
    this.emit('item-clicked', { item, event, target });
  }

  /**
   * Handle item dialog - from design doc
   * @param {object} item - Item to show in dialog
   * @param {string} mode - Dialog mode ('view', 'edit', etc.)
   * @param {Event} event - DOM event
   * @param {HTMLElement} target - Target element
   */
  async onItemEdit(item, mode = 'view', event, target) {
    console.log('Item dialog:', item, mode);
    // Default implementation - can be overridden
    let frmConfig = this.options.formEdit || this.options.formCreate;
    const data = await Dialog.showForm({
        title: `EDIT - #${item.id} ${this.options.modelName}`,
        model: item,
        formConfig: frmConfig,
    });
    if (data) {
        // let model = new this.collection.ModelClass();
        await item.save(data);
        // await this.collection.fetch();
        this.render();
    }
    // Emit event for external handlers
    this.emit('item-dialog', { item, mode, event, target });
  }

  async onItemAdd(event) {
    console.log('Item add:', event);
    // Default implementation - can be overridden
    const data = await Dialog.showForm({
        title: `Create ${this.options.modelName}`,
        formConfig: this.options.formCreate || this.options.formEdit,
    });
    if (data) {
        let model = new this.collection.ModelClass();
        await model.save(data);
        await this.collection.fetch();
    }
    // Emit event for external handlers
    this.emit('item-add', { event });
  }

  async onItemDelete(item, event) {
    console.log('Item delete:', event);
    // Default implementation - can be overridden
    const confirmed = await Dialog.confirm(
      'Are you sure you want to delete this item?',
      'Confirm Action'
    );

    if (confirmed) {
        await item.destroy();
        await this.collection.fetch();
        // Emit event for external handlers
        this.emit('item-delete', { event });
    }

  }

  /**
   * Handle column sorting
   * @param {string} field - Field to sort by
   * @param {string} direction - Sort direction ('asc', 'desc', 'none')
   */
  async handleSort(field, direction) {
    if (direction === 'none') {
      if (this.collection) {
        delete this.collection.params.sort;
      }
    } else {
      this.setSort(field, direction || 'asc');
    }

    this.setStart(0, false);  // Reset to beginning when sorting changes (don't emit - handleSort already does)

    // For REST collections, fetch data with new sorting
    if (this.collection?.restEnabled) {
      try {
        await this.collection.fetch();
        this.render();
      } catch (error) {
        console.error('Failed to fetch sorted data:', error);
        this.render(); // Render with existing data
      }
    } else {
      this.render();
    }

    // Emit params changed event for URL synchronization
    this.emit('params-changed');
  }

  /**
   * Handle page change
   * @param {number} page - Target page number
   */
  async handlePageChange(page) {
    const totalItems = this.collection?.restEnabled
      ? (this.collection?.meta?.count || 0)
      : (this.count || this.collection?.models?.length || 0);
    const totalPages = Math.ceil(totalItems / this.size);

    // Handle wrap-around pagination
    const originalPage = page;
    if (page < 1) {
      page = totalPages; // Wrap to last page
    } else if (page > totalPages) {
      page = 1; // Wrap to first page
    }

    // Update start index with proper event handling
    this.setStart((page - 1) * this.size);

    // For REST collections, fetch data with new page
    if (this.collection?.restEnabled) {
      try {
        await this.collection.fetch();
        this.render();
      } catch (error) {
        console.error('Failed to fetch page data:', error);
        this.render(); // Render with existing data
      }
    } else {
      this.render();
    }
  }

  /**
   * Handle page size change
   * @param {number} newSize - New page size
   */
  async handlePageSizeChange(newSize) {
    // Update size and reset to beginning with proper event handling
    this.setSize(newSize, false);  // Don't emit yet
    this.setStart(0);              // This will emit params-changed
    this.emit('params-changed');
    // For REST collections, fetch data with new page size
    if (this.collection?.restEnabled) {
      try {
        await this.collection.fetch();
        this.render();
      } catch (error) {
        console.error('Failed to fetch data with new page size:', error);
        this.render(); // Render with existing data
      }
    } else {
      this.render();
    }
  }

  /**
   * Handle select all action
   * @param {boolean} checked - Whether to select all
   */
  handleSelectAll(checked) {
    // Only allow selection if batch actions are enabled
    if (!this.batchActions || this.batchActions.length === 0) {
      return;
    }

    this.selectedItems.clear();

    if (checked) {
      const visibleItems = this.getVisibleItems();

      visibleItems.forEach(item => {
        const itemId = String(this.getCellValue(item, {key: 'id'}));
        this.selectedItems.add(itemId);
      });
    }


    this.updateSelectionDisplay();
    this.emit('selection-changed', Array.from(this.selectedItems));
  }

  /**
   * Handle individual item selection
   * @param {string} itemId - Item ID
   * @param {boolean} checked - Whether to select the item
   */
  handleSelectItem(itemId, checked) {
    // Only allow selection if batch actions are enabled
    if (!this.batchActions || this.batchActions.length === 0) {
      return;
    }

    if (checked) {
      this.selectedItems.add(itemId);
    } else {
      this.selectedItems.delete(itemId);
    }


    this.updateSelectionDisplay();
    this.emit('selection-changed', Array.from(this.selectedItems));
  }

 /**
  * Check if all visible items are selected
  * @returns {boolean} True if all visible items are selected
  */
 isAllSelected() {
   if (this.selectedItems.size === 0) return false;

   const visibleItems = this.getVisibleItems();
   if (visibleItems.length === 0) return false;

   return visibleItems.every(item => {
     const itemId = String(this.getCellValue(item, {key: 'id'}));
     return this.selectedItems.has(itemId);
   });
 }

 /**
  * Handle filter changes
  * @param {HTMLElement} filterElement - Filter input element
  */
 async handleSearchInput(e) {
   let searchInput;
   if (e.target.matches('[data-filter="search"]')) {
     searchInput = e.target;
   } else {
     searchInput = e.target.closest('.input-group').querySelector('input[data-filter="search"]');
   }

   const searchValue = searchInput.value.trim();

   this.setFilter('search', searchValue);

   this.setStart(0, false); // Reset to beginning when filtering (don't emit - method already does)
   // Update all search inputs to keep them in sync
   this.updateSearchInputs(searchValue);

   // Fetch new data or re-render
   if (this.collection?.restEnabled) {
     try {
       await this.collection.fetch();
       this.render();
     } catch (error) {
       console.error('Failed to fetch search results:', error);
       this.render();
     }
   } else {
     this.render();
   }

   // Emit params changed event for URL synchronization
   this.emit('params-changed');
 }

 /**
  * Handle refresh action
  * @param {Event} e - Click event
  */
 async handleRefresh(e) {
   e?.preventDefault();

   // Emit refresh event
   if (this.element) {
     const event = new CustomEvent('table:refresh', {
       bubbles: true,
       detail: { table: this }
     });
     this.element.dispatchEvent(event);
   }

   // If we have a collection with REST enabled, fetch fresh data
   if (this.collection?.restEnabled) {
     try {
       await this.collection.fetch();
       this.render();
     } catch (error) {
       console.error('Failed to refresh data:', error);
       this.render();
     }
   } else if (this.options.onRefresh) {
     // Call custom refresh handler if provided
     this.options.onRefresh();
   } else {
     // Just re-render
     this.render();
   }
 }

 /**
  * Handle export action
  * @param {Event} e - Click event
  */
 handleExport(e) {
   e?.preventDefault();

   // Emit export event
   if (this.element) {
     const event = new CustomEvent('table:export', {
       bubbles: true,
       detail: {
         table: this,
         data: this.collection?.models || []
       }
     });
     this.element.dispatchEvent(event);
   }

   // Call custom export handler if provided
   if (this.options.onExport) {
     this.options.onExport(this.collection?.models || []);
   }
 }

 async handleFilterFromDropdown(e) {
   const filterElement = e.target.closest('[data-filter]');
   if (!filterElement) return;

   const filterKey = filterElement.getAttribute('data-filter');
   const filterValue = filterElement.value ? filterElement.value.trim() : '';

   this.setFilter(filterKey, filterValue);

   this.setStart(0, false);  // Reset to beginning when filter changes (don't emit - method already does)

   // For REST collections, fetch data with new filters
   if (this.collection?.restEnabled) {
     try {
       await this.collection.fetch();
       this.render();
     } catch (error) {
       console.error('Failed to fetch filtered data:', error);
       this.render();
     }
   } else {
     this.render();
   }

   // Emit params changed event for URL synchronization
   this.emit('params-changed');


}

 async handleRemoveFilter(e) {
   const filterKey = e.target.getAttribute('data-filter');
     this.setFilter(filterKey, null);

     // If removing search filter, clear all search inputs
     if (filterKey === 'search') {
       this.updateSearchInputs('');
     }

     this.setStart(0, false);  // Reset to beginning when removing filter (don't emit - method already does)

     // For REST collections, re-fetch data with new filters
     if (this.collection?.restEnabled) {
       try {
         await this.collection.fetch();
         this.render();
       } catch (error) {
         console.error('Failed to fetch filtered data:', error);
         this.render();
       }
     } else {
       this.render();
     }

     // Emit params changed event for URL synchronization
     this.emit('params-changed');
 }

 async handleClearAllFilters(e) {
   if (this.collection) {
     // Clear all filters except start, size, and sort
     const { start, size, sort } = this.collection.params;
     this.collection.params = { start, size };
     if (sort) this.collection.params.sort = sort;
   }

   // Clear all search inputs
   this.updateSearchInputs('');

   this.setStart(0, false);  // Reset to beginning when clearing filters (don't emit - method already does)

   // For REST collections, re-fetch data with new filters
   if (this.collection?.restEnabled) {
     try {
       await this.collection.fetch();
       this.render();
     } catch (error) {
       console.error('Failed to fetch filtered data:', error);
       this.render();
     }
   } else {
     this.render();
   }

   // Emit params changed event for URL synchronization
   this.emit('params-changed');
 }

  /**
   * Handle item deletion
   * @param {object} item - Item to delete
   */
  async handleDeleteItem(item) {
    try {
      await item.destroy();
      this.showSuccess('Item deleted successfully');
      this.render();
    } catch (error) {
      this.showError(`Failed to delete item: ${error.message}`);
    }
  }

  /**
   * Called after rendering
   */
  async onAfterRender() {
    // Restore focus if it was on search input
    if (this.focusState && this.focusState.action === 'search-input') {
      const newSearchInput = this.element.querySelector('[data-action="search-input"]');
      if (newSearchInput) {
        newSearchInput.value = this.focusState.value;
        newSearchInput.focus();
        if (this.focusState.selectionStart !== undefined) {
          newSearchInput.setSelectionRange(this.focusState.selectionStart, this.focusState.selectionEnd);
        }
      }
    }

    // Clear focus state
    this.focusState = null;

    // Show error message if there was one
    if (this.errorMessage) {
      this.showErrorBanner(this.errorMessage);
    }

    this.loading = false;
    this.updateLoadingState();
  }

  /**
   * Update loading state in UI
   */
  updateLoadingState() {
    if (!this.element) return;

    if (this.loading) {
      const overlay = document.createElement('div');
      overlay.className = 'mojo-table-loading';
      overlay.innerHTML = `
        <div class="d-flex justify-content-center align-items-center h-100">
          <div class="spinner-border" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
        </div>
      `;
      this.element.appendChild(overlay);
    } else {
      const overlay = this.element.querySelector('.mojo-table-loading');
      if (overlay) {
        overlay.remove();
      }
    }
  }

  /**
   * Update selection display
   */
  updateSelectionDisplay() {

    // Update individual selection cells
    const selectCells = this.element.querySelectorAll('.mojo-select-cell');

    selectCells.forEach(cell => {
      const itemId = cell.getAttribute('data-id');
      const isSelected = this.selectedItems.has(itemId);


      // Update cell class (this controls the checkmark visibility via CSS)
      cell.classList.toggle('selected', isSelected);
    });

    // Update select all cell
    const selectAllCell = this.element.querySelector('.mojo-select-all-cell');
    if (selectAllCell) {
      const allSelected = this.isAllSelected();
      const hasSelected = this.selectedItems.size > 0;
      const icon = selectAllCell.querySelector('i');


      // Update cell class and icon based on state
      if (allSelected) {
        // All selected - show checkmark on blue background
        selectAllCell.classList.add('selected');
        selectAllCell.classList.remove('indeterminate');
        if (icon) icon.className = 'bi bi-check fs-3';
      } else if (hasSelected) {
        // Some selected - show minus on blue background (indeterminate)
        selectAllCell.classList.remove('selected');
        selectAllCell.classList.add('indeterminate');
        if (icon) icon.className = 'bi bi-dash fs-3';
      } else {
        // None selected - show empty checkbox on gray background
        selectAllCell.classList.remove('selected', 'indeterminate');
        if (icon) icon.className = 'bi bi-check';
      }
    }

    // Update row classes
    const rows = this.element.querySelectorAll('tbody tr[data-id]');
    rows.forEach(row => {
      const itemId = row.getAttribute('data-id');
      row.classList.toggle('selected', this.selectedItems.has(itemId));
    });

    // Update batch actions panel if batch actions are enabled
    if (this.batchActions && this.batchActions.length > 0) {
      const batchPanel = this.element.querySelector('.batch-actions-panel');
      const batchCount = this.element.querySelector('.batch-select-count');

      if (batchPanel && batchCount) {
        const selectedCount = this.selectedItems.size;

        // Update count display
        batchCount.textContent = selectedCount;

        // Show/hide panel based on selection
        batchPanel.style.display = selectedCount > 0 ? 'block' : 'none';
      }
    }
  }

  /**
   * Show error message
   * @param {string} message - Error message
   */
  showError(message) {
    console.error('Table error:', message);

    // Display error in element if table failed to render completely
    this.element.innerHTML = `
      <div class="alert alert-danger" role="alert">
        <h6><i class="bi bi-exclamation-triangle me-2"></i>Table Error</h6>
        <p class="mb-0">${message}</p>
        <hr>
        <small class="text-muted">Check the console for more details.</small>
      </div>
    `;
  }

  /**
   * Show error banner while keeping table visible
   * @param {string} message - Error message
   */
  showErrorBanner(message) {
    console.warn('Table warning:', message);

    // Add error banner above the table
    const existingBanner = this.element.querySelector('.mojo-table-error-banner');
    if (existingBanner) {
      existingBanner.remove();
    }

    const banner = document.createElement('div');
    banner.className = 'alert alert-warning mojo-table-error-banner mb-2';
    banner.innerHTML = `
      <div class="d-flex align-items-center">
        <i class="bi bi-exclamation-triangle me-2"></i>
        <span class="flex-grow-1">${message}</span>
        <button type="button" class="btn-close" onclick="this.parentElement.parentElement.remove()"></button>
      </div>
    `;

    this.element.insertBefore(banner, this.element.firstChild);
  }

  /**
   * Render fallback error state when everything fails
   * @param {string} message - Error message
   */
  renderFallbackError(message) {
    console.error('Table critical error:', message);

    this.element.innerHTML = `
      <div class="card border-danger">
        <div class="card-header bg-danger text-white">
          <h6 class="mb-0"><i class="bi bi-exclamation-circle me-2"></i>Table Unavailable</h6>
        </div>
        <div class="card-body">
          <p class="card-text">${message}</p>
          <p class="text-muted small mb-0">
            The table component encountered a critical error and cannot be displayed.
            Please check your data configuration and try again.
          </p>
        </div>
      </div>
    `;
  }

  /**
   * Show success message
   * @param {string} message - Success message
   */
  showSuccess(message) {
    console.log('Table success:', message);
    // Could be enhanced with toast notifications
  }

  /**
   * Emit custom event
   * @param {string} event - Event name
   * @param {object} data - Event data
   */
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  /**
   * Add event listener
   * @param {string} event - Event name
   * @param {function} callback - Event callback
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {function} callback - Event callback
   */
  off(event, callback) {
    if (this.listeners[event]) {
      const index = this.listeners[event].indexOf(callback);
      if (index !== -1) {
        this.listeners[event].splice(index, 1);
      }
    }
  }

  /**
   * Get selected items
   * @returns {array} Array of selected items
   */
  getSelectedItems() {
    if (!this.collection) return [];

    return this.collection.models.filter(item =>
      this.selectedItems.has(item.id)
    );
  }

  /**
   * Clear selection
   */
  clearSelection() {
    this.selectedItems.clear();
    this.updateSelectionDisplay();
  }

  /**
   * Refresh table data
   */
  async refresh() {
    await this.render();
  }

  /**
   * Destroy table component
   */
  destroy() {
    // Clear any timeouts
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    // Clear container
    if (this.container) {
      this.container.innerHTML = '';
    }

    // Reset state
    this.selectedItems.clear();
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

  buildBatchActionsPanel() {
      if (!this.batchActions || this.batchActions.length === 0) {
          return '';
      }

      let actionsHTML = '';
      this.batchActions.forEach(action => {
          actionsHTML += `
              <div class="batch-select-action text-center px-2" data-action="${action.action}">
                  <div class="batch-action-icon fs-3">
                      <i class="${action.icon}"></i>
                  </div>
                  <div class="batch-action-title small">${action.label}</div>
              </div>
          `;
      });

      return `
          <div class="batch-actions-panel rounded-start rounded-end" style="display: none;">
              <div class="batch-select-panel rounded-start rounded-end">
                  <div class="row g-0">
                      <div class="col-auto">
                          <div class="batch-select-count rounded-start">0</div>
                      </div>
                      <div class="col">
                          <div class="ps-2 batch-select-title">${this.options.batchPanelTitle}</div>
                      </div>
                      <div class="col">
                          <div class="batch-select-actions d-flex justify-content-end">
                              ${actionsHTML}
                          </div>
                      </div>
                      <div class="col-auto">
                          <div class="batch-select-end rounded-end">

                          </div>
                      </div>
                  </div>
              </div>
          </div>
      `;
  }

}

export default Table;
