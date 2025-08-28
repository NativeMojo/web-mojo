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
import Collection from '../core/Collection.js';
import Dialog from './Dialog.js';
import FormView from '../forms/FormView.js';


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
    this.filters = {}; // Column-based filters only
    this.additionalFilters = options.filters || []; // Additional filters from options
    this.collectionParams = options.collectionParams || {};
    this.groupFiltering = options.groupFiltering || false;
    this.listOptions = options.listOptions || {};
    this.view = options.view || 'table';
    this.batchActions = options.batchActions || null;
    // if (options.actions === undefined) options.actions = ['view', 'edit', 'delete'];
    this.actions = options.actions || null;
    this.contextMenu = options.contextMenu || null;
    this.itemViewClass = options.itemViewClass || null;

    // Internal state
    this.collection = options.collection || null;

    if (options.data && !this.collection && !this.Collection) {
        this.collection = new Collection(options.data);
    }

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
      responsive: false,
      striped: true,
      bordered: false,
      hover: true,
      preloaded: false,  // Skip REST fetching when true
      batchPanelTitle: "Rows",
      hideActivePills: false, // Hide active filter pills when true
      hideActivePillNames: [], // Array of filter names to hide from pills
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
    if (!this.collection) return;

    // Get filter configuration to handle special cases
    const filterConfig = this.getFilterConfig(key);

    if (value === null || value === undefined || value === '') {
      // Clear filter
      if (filterConfig && filterConfig.type === 'daterange') {
        // Clear daterange filter - remove start/end params
        const startName = filterConfig.startName || `${key}_start`;
        const endName = filterConfig.endName || `${key}_end`;
        const fieldName = filterConfig.fieldName;
        delete this.collection.params[startName];
        delete this.collection.params[endName];
        if (fieldName) {
          delete this.collection.params[fieldName];
        }
        delete this.collection.params[key]; // Also clear main key if it exists
      } else {
        delete this.collection.params[key];
      }
    } else {
      // Set filter value
      if (filterConfig && filterConfig.type === 'daterange' && typeof value === 'object') {
        // Handle daterange filter - set individual start/end params
        const startName = filterConfig.startName || `${key}_start`;
        const endName = filterConfig.endName || `${key}_end`;
        const fieldName = filterConfig.fieldName;

        if (value.start) {
          this.collection.params[startName] = value.start;
        }
        if (value.end) {
          this.collection.params[endName] = value.end;
        }
        if (fieldName && value.fieldName) {
          this.collection.params[fieldName] = value.fieldName;
        }

        // Don't set the main key for daterange filters
      } else {
        // Regular filter
        this.collection.params[key] = value;
      }
    }
  }

  /**
   * Get filter configuration for a key
   */
  getFilterConfig(filterKey) {
    // Check column filters first
    const column = this.columns.find(col => col.key === filterKey);
    if (column && column.filter) {
      return column.filter;
    }

    // Check additional filters
    if (this.additionalFilters && Array.isArray(this.additionalFilters)) {
      const filter = this.additionalFilters.find(f => f.name === filterKey);
      if (filter) {
        return filter;
      }
    }

    return null;
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

    // Extract filters from columns
    this.filters = {};
    this.columns.forEach(column => {
      if (column.name && !column.key) {
        column.key = column.name;
      }
      if (column.filter) {
        this.filters[column.key] = column.filter;
      }
    });
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

    this.collection.on('fetch:start', () => {
      this.loading = true;
      if (this.isMounted() && !this.isRendering) {
        this.updateLoadingState();
      }
    });

    this.collection.on('fetch:error', (evt) => {
      this.loading = false;
      this.error = evt;
      if (this.isMounted() && !this.isRendering) {
        this.updateLoadingState();
      }
    });

    this.collection.on('fetch:success', () => {
      this.loading = false;
      this.error = null;
      if (this.isMounted() && !this.isRendering) {
        this.updateLoadingState();
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
        <div>
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

    return `
      <div class="dropdown">
        <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button"
                data-bs-toggle="dropdown" aria-expanded="false">
          <i class="bi bi-filter me-1"></i>
          <span class="d-none d-sm-inline">Add Filter</span>
        </button>
        <div class="dropdown-menu" style="min-width: 250px;">
          ${this.buildFilterList()}
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
    if (this.options.hideActivePills) {
      return '';
    }

    let activeFilters = Object.entries(this.activeFilters).filter(([key, value]) =>
      value && value.toString().trim() !== ''
    );

    // Selectively hide pills based on the hideActivePillNames option
    if (this.options.hideActivePillNames && this.options.hideActivePillNames.length > 0) {
      const hiddenNames = this.options.hideActivePillNames;
      activeFilters = activeFilters.filter(([key]) => !hiddenNames.includes(key));
    }

    if (activeFilters.length === 0) {
      return '';
    }

    // Group filters and handle daterange combinations
    const processedFilters = this.groupDateRangeFilters(activeFilters);

    const pills = processedFilters.map((filterInfo) => {
      const { key, label, displayValue, isDateRange } = filterInfo;
      const icon = key === 'search' ? 'search' : (isDateRange ? 'calendar-range' : 'filter');

      return `
        <span class="badge bg-primary me-2 mb-2 fs-6 py-2 px-3 position-relative">
          <i class="bi bi-${icon} me-1"></i>
          ${label}: ${displayValue}

          <!-- Edit button -->
          <button type="button" class="btn btn-link text-white p-0 ms-1 me-1"
                  style="font-size: 0.75em;"
                  data-action="edit-filter"
                  data-filter="${key}"
                  title="Edit filter">
            <i class="bi bi-pencil"></i>
          </button>

          <!-- Remove button -->
          <button type="button" class="btn-close btn-close-white ms-1"
                  style="font-size: 0.75em;"
                  data-action="remove-filter"
                  data-filter="${key}"
                  title="Remove filter">
          </button>
        </span>
      `;
    }).join('');

    const clearAllButton = processedFilters.length > 1 ? `
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

  /**
   * Group daterange filters into single entries
   */
  groupDateRangeFilters(activeFilters) {
    const processed = [];
    const usedKeys = new Set();

    // Process each active filter
    activeFilters.forEach(([key, value]) => {
      if (usedKeys.has(key)) return;

      // Check if this is part of a daterange filter
      const dateRangeInfo = this.findDateRangeForKey(key);

      if (dateRangeInfo) {
        // This is a daterange filter component
        const { baseKey, filterConfig, startName, endName, fieldName } = dateRangeInfo;
        const startValue = this.activeFilters[startName];
        const endValue = this.activeFilters[endName];

        if (startValue || endValue) {
          // Create combined daterange display
          const separator = filterConfig.separator || ' - ';
          let displayValue = '';

          if (startValue && endValue) {
            displayValue = `${startValue}${separator}${endValue}`;
          } else if (startValue) {
            displayValue = `From ${startValue}`;
          } else if (endValue) {
            displayValue = `Until ${endValue}`;
          }

          processed.push({
            key: baseKey,
            label: filterConfig.label || this.getFilterLabel(baseKey),
            displayValue: displayValue,
            isDateRange: true
          });

          // Mark all keys as used
          usedKeys.add(startName);
          usedKeys.add(endName);
          if (fieldName) {
            usedKeys.add(fieldName);
          }
        }
      } else {
        // Regular filter
        processed.push({
          key: key,
          label: this.getFilterLabel(key),
          displayValue: this.getFilterDisplayValue(key, value),
          isDateRange: false
        });
        usedKeys.add(key);
      }
    });

    return processed;
  }

  /**
   * Find daterange configuration for a given key
   */
  findDateRangeForKey(key) {
    // Check all available filters for daterange types
    const allFilters = this.getAllAvailableFilters();

    for (const filterInfo of allFilters) {
      if (filterInfo.type === 'daterange') {
        const config = filterInfo.config;
        const startName = config.startName || `${filterInfo.key}_start`;
        const endName = config.endName || `${filterInfo.key}_end`;
        const fieldName = config.fieldName;

        if (key === startName || key === endName || (fieldName && key === fieldName)) {
          return {
            baseKey: filterInfo.key,
            filterConfig: config,
            startName: startName,
            endName: endName,
            fieldName: fieldName
          };
        }
      }
    }

    return null;
  }

  getFilterDisplayValue(key, value) {
    if (key === 'search') {
      return `"${value}"`;
    }

    const filter = this.filters[key];

    // Handle daterange filters
    if (filter && filter.type === 'daterange' && value && typeof value === 'object') {
      if (value.combined) {
        return value.combined;
      }
      if (value.start && value.end) {
        const separator = filter.separator || ' - ';
        return `${value.start}${separator}${value.end}`;
      }
      if (value.start) {
        return `From ${value.start}`;
      }
      if (value.end) {
        return `Until ${value.end}`;
      }
    }

    if (filter && filter.type === 'select' && filter.options) {
      // Handle array of objects: [{ value: 'info', label: 'Info' }]
      if (typeof filter.options[0] === 'object') {
        const option = filter.options.find(opt => opt.value === value);
        return option ? option.label : value;
      }
      // Handle array of strings: ["org", "iso", "group", "test"]
      else {
        return filter.options.includes(value) ? value : value;
      }
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
    if (this.actions) {
      actionHeaderCell = '<th>Actions</th>';
    } else if (this.contextMenu) {
      actionHeaderCell = '<th style="width: 1px;"></th>';
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
            <span>${column.title || column.label || column.key}</span>
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

    const colspan = this.columns.length + (this.options.selectable ? 1 : 0) + 1;
    if (this.error) {
        return `
          <tbody>
            <tr>
              <td colspan="${colspan}" class="text-center py-4">
                <div class="text-danger">
                  <i class="bi bi-exclamation-triangle-fill fa-2x mb-2"></i>
                  <p>${this.error.message}</p>
                </div>
              </td>
            </tr>
          </tbody>
        `;
    }

    // Apply client-side filtering, sorting, and pagination
    data = this.processData(data || []);

    if (!data || data.length === 0) {
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
            <i class="bi bi-check"></i>
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

    const classes = column.class || column.className || '';

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
    // If context menu is provided, use that instead of action buttons
    if (this.contextMenu) {
      return this.buildContextMenuCell(item);
    }

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

    // Check if itemViewClass is explicitly set
    if (this.itemViewClass) {
      const viewInstance = new this.itemViewClass({ model: item });
      await Dialog.showDialog({
        title: `${item.constructor.name || 'Item'} Details`,
        body: viewInstance,
        size: 'lg',
        ...this.options.viewDialogOptions
      });
    }
    // Check if item has a VIEW property
    else if (item.constructor.VIEW) {
      const viewConfig = item.constructor.VIEW;

      // Check if VIEW is a View class (has prototype.render or extends View)
      if (typeof viewConfig === 'function' &&
          (viewConfig.prototype?.render || viewConfig.prototype?.constructor?.name?.includes('View'))) {
        // It's a View class
        const viewInstance = new viewConfig({ model: item });
        await Dialog.showDialog({
          title: `${item.constructor.name || 'Item'} Details`,
          body: viewInstance,
          size: 'lg'
        });
      }
      // It's a plain configuration object
      else if (typeof viewConfig === 'object') {
        await Dialog.showData({
          ...viewConfig,
          title: viewConfig.title || `#${item.id} ${this.options.modelName}`,
          model: item
        });
      }
    }
    // Fallback - emit event for external handlers
    else {
    await Dialog.showData({
        title: `#${item.id} ${this.options.modelName}`,
        model: item
    });
      this.emit('item-clicked', { item, event, target });
    }
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
    const resp = await Dialog.showModelForm({
        title: `EDIT - #${item.id} ${this.options.modelName}`,
        model: item,
        formConfig: frmConfig,
    });
    if (resp) {
        this.render();
    }
    // Emit event for external handlers
    this.emit('item-dialog', { item, mode, event, target });
  }

  async onItemAdd(event) {
    console.log('Item add:', event);
    try {
      // Default implementation - can be overridden
      const data = await Dialog.showForm({
        title: `Create ${this.options.modelName}`,
        formConfig: this.options.formCreate || this.options.formEdit,
      });

      if (!data) {
        // User cancelled
        return this.emit('item-add', { event, cancelled: true });
      }

      const model = new this.collection.ModelClass();
      const resp = await model.save(data);

      // HTTP/network level error
      if (!resp?.success) {
        this.getApp()?.toast?.error(resp?.message || resp?.error || 'Network error creating item');
        return this.emit('item-add', { event, error: resp });
      }

      // Server application-level error
      if (resp?.data && resp.data.status === false) {
        this.getApp()?.toast?.error(resp.data.error || 'Failed to create item');
        return this.emit('item-add', { event, error: resp.data });
      }

      // Success - refresh table data
      await this.collection.fetch();
      this.emit('item-add', { event, model });

    } catch (err) {
      console.error('Item add failed:', err);
      this.getApp()?.toast?.error(err?.message || 'Failed to create item');
      this.emit('item-add', { event, error: err });
    }
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
  * Handle clear all filters action
  */
 async onActionClearAllFilters(event, element) {
   await this.handleClearAllFilters(event);
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

    // Initialize Bootstrap dropdowns for context menus
    if (this.contextMenu && typeof bootstrap !== 'undefined') {
      const dropdownElements = this.element.querySelectorAll('[data-bs-toggle="dropdown"]');
      dropdownElements.forEach(element => {
        new bootstrap.Dropdown(element);
      });
    }

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
        if (icon) icon.className = 'bi bi-check';
      } else if (hasSelected) {
        // Some selected - show minus on blue background (indeterminate)
        selectAllCell.classList.remove('selected');
        selectAllCell.classList.add('indeterminate');
        if (icon) icon.className = 'bi bi-dash';
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

  buildContextMenuCell(item) {
    if (!this.contextMenu || this.contextMenu.length === 0) return '';

    const itemId = this.getCellValue(item, {key: 'id'});
    const dropdownId = `context-menu-${itemId}`;

    const menuItems = this.contextMenu.map(menuItem => {
      // Handle separators
      if (menuItem.separator) {
        return '<li><hr class="dropdown-divider"></li>';
      }

      // Check permissions if specified
      if (menuItem.permissions && !this.checkPermission(menuItem.permissions)) {
        return '';
      }

      // Determine item class for styling (e.g., danger for delete actions)
      let itemClass = 'dropdown-item';
      if (menuItem.action === 'item-delete' || menuItem.action === 'delete' || menuItem.danger) {
        itemClass += ' text-danger';
      }
      if (menuItem.disabled) {
        itemClass += ' disabled';
      }

      return `
        <li>
          <a class="${itemClass}" href="#"
             data-action="context-menu-item"
             data-menu-action="${menuItem.action}"
             data-id="${itemId}"
             ${menuItem.disabled ? 'aria-disabled="true" tabindex="-1"' : ''}>
            ${menuItem.icon ? `<i class="${menuItem.icon} me-2" style="width: 1rem;"></i>` : '<span class="me-2" style="width: 1rem; display: inline-block;"></span>'}
            ${menuItem.label}
          </a>
        </li>
      `;
    }).filter(item => item).join('');

    return `
      <td class="text-end" style="width: 1px;">
        <div class="dropdown">
          <button class="btn btn-sm btn-link border-0"
                  type="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                  data-action="toggle-context-menu"
                  data-id="${itemId}"
                  style="color: #6c757d;">
            <i class="bi bi-three-dots-vertical"></i>
          </button>
          <ul class="dropdown-menu dropdown-menu-end shadow-sm" id="${dropdownId}">
            ${menuItems}
          </ul>
        </div>
      </td>
    `;
  }

  checkPermission(permission) {
    // Default implementation - override this method to implement actual permission checking
    // You can access the app via this.getApp() and check user permissions
    const app = this.getApp();
    if (app && app.user && app.user.hasPermission) {
      return app.user.hasPermission(permission);
    }
    // If no permission system is available, allow access
    return true;
  }

  async onTabActivated() {
    // Default implementation - override this method to implement tab activation logic
    // You can access the app via this.getApp() and perform actions when the tab is activated
      await this.initializeData();
      await this.collection.fetch();
      await this.render();
  }

  async handleActionContextMenuItem(event, element) {
    event.preventDefault();

    // Close the dropdown
    const dropdownMenu = element.closest('.dropdown-menu');
    if (dropdownMenu && typeof bootstrap !== 'undefined') {
      const dropdownToggle = dropdownMenu.previousElementSibling;
      if (dropdownToggle && dropdownToggle.hasAttribute('data-bs-toggle')) {
        const dropdownInstance = bootstrap.Dropdown.getInstance(dropdownToggle);
        if (dropdownInstance) {
          dropdownInstance.hide();
        }
      }
    }

    // Check if the item is disabled
    if (element.classList.contains('disabled') || element.getAttribute('aria-disabled') === 'true') {
      return;
    }

    const itemId = element.getAttribute('data-id');
    const menuAction = element.getAttribute('data-menu-action');

    try {
      const item = this.collection?.get(itemId) || this.collection?.find(i => String(this.getCellValue(i, {key: 'id'})) === String(itemId));

      if (!item) {
        console.warn('Table context menu: Item not found for ID:', itemId);
        return;
      }

      // Find the menu item configuration
      const menuItem = this.contextMenu.find(m => m.action === menuAction);
      if (!menuItem) {
        console.warn('Table context menu: Menu item configuration not found for action:', menuAction);
        return;
      }

      // Check permissions again at runtime
      if (menuItem.permissions && !this.checkPermission(menuItem.permissions)) {
        console.warn('Table context menu: Permission denied for action:', menuAction, 'permission:', menuItem.permissions);
        return;
      }

      // Check if there's a custom handler
      if (menuItem.handler && typeof menuItem.handler === 'function') {
        await menuItem.handler(item, event, element);
        return;
      }

      // Default handlers for common actions
      switch (menuAction) {
        case 'item-view':
          await this.onItemClicked(item, event);
          break;
        case 'item-edit':
          await this.onItemEdit(item, event);
          break;
        case 'item-delete':
          await this.onItemDelete(item, event);
          break;
        default:
          // Emit a custom event with the action
          this.emit(menuAction, item, event, element);
          break;
      }
    } catch (error) {
      console.error('Table context menu error:', error);
      const app = this.getApp();
      if (app && app.showError) {
        app.showError('Action failed: ' + error.message);
      }
    }
  }

  async handleActionToggleContextMenu(event, element) {
    // This is handled by Bootstrap's dropdown functionality
    // We can add custom logic here if needed
  }

  /**
   * Build simple filter selection list
   */
  buildFilterList() {
    const allFilters = this.getAllAvailableFilters();

    if (allFilters.length === 0) {
      return '<div class="dropdown-item-text text-muted">No filters available</div>';
    }

    const filterItems = allFilters.map(filter => {
      const isActive = this.activeFilters.hasOwnProperty(filter.key);
      const activeClass = isActive ? 'active' : '';
      const icon = this.getFilterIcon(filter.type);

      return `
        <button class="dropdown-item ${activeClass}"
                data-action="add-filter"
                data-filter-key="${filter.key}">
          <i class="bi bi-${icon} me-2"></i>
          ${filter.label}
          ${isActive ? '<i class="bi bi-check-circle ms-auto"></i>' : ''}
        </button>
      `;
    }).join('');

    return `
      ${filterItems}
      ${Object.keys(this.activeFilters).length > 0 ? `
        <div class="dropdown-divider"></div>
        <button class="dropdown-item text-danger" data-action="clear-all-filters">
          <i class="bi bi-x-circle me-2"></i>Clear All Filters
        </button>
      ` : ''}
    `;
  }

  /**
   * Get all available filters (column + additional)
   */
  getAllAvailableFilters() {
    const filters = [];

    // Add column-based filters
    this.columns.forEach(column => {
      if (column.filter) {
        filters.push({
          key: column.key,
          label: column.filter.label || column.label,
          type: column.filter.type,
          config: column.filter
        });
      }
    });

    // Add additional filters
    if (this.additionalFilters && Array.isArray(this.additionalFilters)) {
      this.additionalFilters.forEach(filter => {
        filters.push({
          key: filter.name,
          label: filter.label,
          type: filter.type,
          config: filter
        });
      });
    }

    return filters;
  }

  /**
   * Get icon for filter type
   */
  getFilterIcon(type) {
    const icons = {
      'text': 'search',
      'select': 'funnel',
      'date': 'calendar',
      'daterange': 'calendar-range',
      'datepicker': 'calendar3',
      'form': 'gear',
      'tags': 'tags',
      'number': '123'
    };
    return icons[type] || 'filter';
  }

  /**
   * Handle add filter action
   */
  async onActionAddFilter(event, element) {
    const filterKey = element.getAttribute('data-filter-key');
    const filterConfig = this.getFilterConfig(filterKey);
    const currentValue = this.activeFilters[filterKey];

    if (!filterConfig) {
      console.warn('No filter config found for key:', filterKey);
      return;
    }

    // Show dialog for this specific filter
    const result = await Dialog.showForm({
      title: `${currentValue ? 'Edit' : 'Add'} ${this.getFilterLabel(filterKey)} Filter`,
      size: 'md',
      fields: [this.buildFilterDialogField(filterConfig, currentValue)],
      formConfig: {
        options: {
          submitButton: false,
          resetButton: false
        }
      }
    });

    if (result) {
      // Extract the new filter value(s)
      const newFilterValue = this.extractFilterValue(filterConfig, result);
      this.setFilter(filterKey, newFilterValue);
      await this.applyFilters();
    }
  }

  /**
   * Handle edit filter action from pill
   */
  async onActionEditFilter(event, element) {
    const filterKey = element.getAttribute('data-filter');
    const filterConfig = this.getFilterConfig(filterKey);
    const currentValue = this.activeFilters[filterKey];

    if (!filterConfig) {
      console.warn('No filter config found for key:', filterKey);
      return;
    }

    // Show mini dialog for this specific filter
    const result = await Dialog.showForm({
      title: `Edit ${this.getFilterLabel(filterKey)} Filter`,
      size: 'md',
      fields: [this.buildFilterDialogField(filterConfig, currentValue)],
      formConfig: {
        options: {
          submitButton: false,
          resetButton: false
        }
      }
    });

    if (result) {
      // Extract the new filter value(s)
      const newFilterValue = this.extractFilterValue(filterConfig, result);
      this.setFilter(filterKey, newFilterValue);
      await this.applyFilters();
    }
  }

  /**
   * Build filter dialog field configuration
   */
  buildFilterDialogField(filterConfig, currentValue) {
    const field = {
      name: 'filter_value',
      label: filterConfig.label,
      ...filterConfig
    };

    // Set current value appropriately based on filter type
    if (filterConfig.type === 'daterange') {
      // Handle daterange current values
      if (currentValue && typeof currentValue === 'object') {
        field.startDate = currentValue.start || '';
        field.endDate = currentValue.end || '';
      }
    } else {
      field.value = currentValue;
    }

    return field;
  }

  /**
   * Extract filter value from form result
   */
  extractFilterValue(filterConfig, formResult) {
    if (filterConfig.type === 'daterange') {
      // Extract start/end values based on naming convention
      const startName = filterConfig.startName || 'filter_value_start';
      const endName = filterConfig.endName || 'filter_value_end';
      const fieldName = filterConfig.fieldName;

      const result = {
        start: formResult[startName],
        end: formResult[endName],
        combined: formResult.filter_value // Display value
      };

      // Include fieldName value if specified
      if (fieldName && formResult[fieldName]) {
        result.fieldName = formResult[fieldName];
      }

      return result;
    }

    return formResult.filter_value;
  }



  /**
   * Apply filters to collection and refresh
   */
  async applyFilters() {
    this.setStart(0, false);  // Reset to beginning when filter changes

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



}

export default Table;
