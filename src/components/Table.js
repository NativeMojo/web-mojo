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

class Table {
  constructor(options = {}) {
    // Core properties from design doc
    this.Collection = options.Collection || null;
    this.columns = options.columns || [];
    this.filters = options.filters || {};
    this.collection_params = options.collection_params || {};
    this.group_filtering = options.group_filtering || false;
    this.list_options = options.list_options || {};
    this.view = options.view || 'table';
    
    // Internal state
    this.container = options.container || null;
    this.collection = options.collection || null;
    

    this.loading = false;
    this.currentPage = 1;
    this.itemsPerPage = 10;
    this.sortBy = null;
    this.sortDirection = 'asc';
    this.activeFilters = {};
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
      ...options
    };

    
    // Event listeners
    this.listeners = {};
    
    // Initialize
    this.init();
  }

  /**
   * Cleanup method to clear timeouts and unbind events
   */
  destroy() {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = null;
    }
    this._eventsBound = false;
  }

  /**
   * Initialize the table component
   */
  init() {
    // Only create collection if we don't already have one (preserve preloaded collections)
    if (this.Collection && !this.collection) {
      this.collection = new this.Collection();
      
      // Set up collection event listeners
      this.collection.on('update', () => {
        console.log('🔍 [DEBUG] Collection update event triggered, calling render()');
        this.render();
      });
      
      this.collection.on('add', () => {
        this.render();
      });
      
      this.collection.on('remove', () => {
        this.render();
      });
    }
    
    // Apply default list options
    this.applyListOptions();
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
          const params = {
            ...this.collection_params,
            ...this.buildQueryParams()
          };
          
          console.log('🔍 [DEBUG] About to fetch in initializeData():', {
              hasData,
              preloaded: this.options.preloaded,
              params: params
          });
          await this.collection.fetch({ params });
          console.log('🔍 [DEBUG] Fetch completed in initializeData(), new length:', this.collection?.models?.length);
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
    if (this.list_options.itemsPerPage) {
      this.itemsPerPage = this.list_options.itemsPerPage;
    }
    
    if (this.list_options.defaultSort) {
      this.sortBy = this.list_options.defaultSort.field;
      this.sortDirection = this.list_options.defaultSort.direction || 'asc';
    }
    
    if (this.list_options.defaultFilters) {
      this.activeFilters = { ...this.list_options.defaultFilters };
    }
  }

  /**
   * Render the table
   * @param {HTMLElement} container - Container element
   * @returns {Promise} Promise that resolves when table is rendered
   */
  async render(container = null) {
    const renderCallStack = new Error().stack.split('\n').slice(1, 4).join('\n');
    console.log('🔍 [DEBUG] Table.render() called from:', renderCallStack);
    console.log('🔍 [DEBUG] Collection state:', {
        hasCollection: !!this.collection,
        collectionLength: this.collection?.models?.length,
        collectionEndpoint: this.collection?.endpoint
    });

    if (container) {
      this.container = container;
    }
    
    if (!this.container) {
      console.warn('Table: No container specified, creating fallback container');
      // Create a fallback container and append to body
      this.container = document.createElement('div');
      this.container.className = 'mojo-table-fallback-container m-3';
      this.container.innerHTML = `
        <div class="alert alert-info mb-2">
          <small><i class="bi bi-info-circle me-1"></i>Table rendered in fallback container</small>
        </div>
      `;
      // Safely append to body if available
      if (document.body) {
        document.body.appendChild(this.container);
      } else {
        console.error('Table: Cannot create fallback container - document.body not available');
        throw new Error('No container available and cannot create fallback');
      }
    }
    
    // Handle case where container is a selector string
    if (typeof this.container === 'string') {
      const element = document.querySelector(this.container);
      if (!element) {
        console.warn(`Table: Container "${this.container}" not found, creating fallback`);
        this.container = document.createElement('div');
        this.container.className = 'mojo-table-fallback-container m-3';
        this.container.innerHTML = `
          <div class="alert alert-warning mb-2">
            <small><i class="bi bi-exclamation-triangle me-1"></i>Original container "${this.container}" not found</small>
          </div>
        `;
        // Safely append to body if available
        if (document.body) {
          document.body.appendChild(this.container);
        } else {
          console.error('Table: Cannot create fallback container - document.body not available');
          throw new Error('No container available and cannot create fallback');
        }
      } else {
        this.container = element;
        // Add instance identifier to container for debugging
        this.container.setAttribute('data-table-instance', this._instanceId);
      }
    }

    this.loading = true;
    this.updateLoadingState();

    let hasData = false;
    let errorMessage = null;

    try {
      // Create collection if we don't have one but have a Collection class
      if (!this.collection && this.Collection) {
        try {
          this.collection = new this.Collection();
          // Collection created - data initialization is now explicit via initializeData()
        } catch (collectionError) {
          errorMessage = `Failed to create collection: ${collectionError.message}`;
          console.warn('Table: Collection creation failed:', collectionError);
        }
      }

      // Check if we have a collection with data
      if (this.collection && this.collection.models && this.collection.models.length > 0) {
        hasData = true;
      }

    } catch (setupError) {
      errorMessage = `Table setup failed: ${setupError.message}`;
      console.error('Table: Setup error:', setupError);
    }

    // Always try to render something, even if there are errors
    try {
      // Preserve focus state
      const focusedElement = this.container.querySelector(':focus');
      const focusedValue = focusedElement?.value;
      const focusedSelectionStart = focusedElement?.selectionStart;
      const focusedSelectionEnd = focusedElement?.selectionEnd;
      const focusedAction = focusedElement?.getAttribute('data-action');
      
      // Reset event binding flag before rebuilding HTML
      this._eventsBound = false;
      
      this.container.innerHTML = this.buildTableHTML();
      this._eventsBound = false; // Reset event binding flag
      this.bindEvents();
      
      // Restore focus if it was on search input
      if (focusedAction === 'search-input') {
        const newSearchInput = this.container.querySelector('[data-action="search-input"]');
        if (newSearchInput) {
          newSearchInput.value = focusedValue;
          newSearchInput.focus();
          if (focusedSelectionStart !== undefined) {
            newSearchInput.setSelectionRange(focusedSelectionStart, focusedSelectionEnd);
          }
        }
      }
      
      // Show error message if there was one, but still show the table
      if (errorMessage) {
        this.showErrorBanner(errorMessage);
      }
      
    } catch (renderError) {
      console.error('Table: Critical render error:', renderError);
      // Last resort: render a basic error state
      this.renderFallbackError(`Critical error: ${renderError.message}`);
    }

    this.loading = false;
    this.updateLoadingState();
  }

  /**
   * Build query parameters for API requests
   * @returns {object} Query parameters
   */
  buildQueryParams() {
    const params = {};
    
    // Pagination
    if (this.options.paginated) {
      params.page = this.currentPage;
      params.per_page = this.itemsPerPage;
    }
    
    // Sorting - use single sort parameter with prefix format for REST APIs
    if (this.sortBy) {
      params.sort = this.sortDirection === 'desc' ? `-${this.sortBy}` : this.sortBy;
    }
    
    // Filters - use simple fieldname=value format
    Object.entries(this.activeFilters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params[key] = value;
      }
    });
    
    console.log('🔍 [DEBUG] buildQueryParams result:', {
      sortBy: this.sortBy,
      sortDirection: this.sortDirection,
      activeFilters: this.activeFilters,
      builtParams: params
    });
    
    return params;
  }

  /**
   * Build table HTML structure
   * @returns {string} Table HTML
   */
  buildTableHTML() {
    const tableClasses = this.buildTableClasses();
    const data = this.collection ? this.collection.models : [];
    
    console.log('🔍 [DEBUG] buildTableHTML - Data extraction:', {
      hasCollection: !!this.collection,
      collectionModels: this.collection?.models,
      dataLength: data?.length,
      firstItem: data?.[0]
    });
    
    return `
      <style>
        .mojo-select-cell, .mojo-select-all-cell {
          background-color: #f8f9fa;
          cursor: pointer;
          transition: background-color 0.2s ease;
          text-align: center;
          vertical-align: middle;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .mojo-select-cell.selected, .mojo-select-all-cell.selected {
          background-color: var(--bs-primary);
        }
        .mojo-select-cell:hover, .mojo-select-all-cell:hover {
          background-color: var(--bs-primary);
        }
        .mojo-checkbox {
          width: 16px;
          height: 16px;
          border: 2px solid #dee2e6;
          border-radius: 3px;
          background-color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        .mojo-select-cell.selected .mojo-checkbox, .mojo-select-all-cell.selected .mojo-checkbox {
          border-color: white;
          background-color: white;
        }
        .mojo-select-cell:hover .mojo-checkbox, .mojo-select-all-cell:hover .mojo-checkbox {
          border-color: white;
          background-color: white;
        }
        .mojo-checkbox i {
          font-size: 10px;
          color: var(--bs-primary);
          opacity: 0;
          transition: opacity 0.2s ease;
        }
        .mojo-select-cell.selected .mojo-checkbox i, .mojo-select-all-cell.selected .mojo-checkbox i {
          opacity: 1;
        }
        .mojo-select-all-cell.indeterminate .mojo-checkbox {
          border-color: var(--bs-primary);
          background-color: var(--bs-primary);
        }
        .mojo-select-all-cell.indeterminate .mojo-checkbox i {
          opacity: 1;
          color: white;
        }
      </style>
      <div class="mojo-table-wrapper">
        ${this.buildToolbar()}
        <div class="table-responsive">
          <table class="${tableClasses}">
            ${this.buildTableHeader()}
            ${this.buildTableBody(data)}
          </table>
        </div>
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
    if (this.options.showRefresh !== false) {
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
                 data-filter="search" value="${this.activeFilters.search || ''}">
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
                 data-filter="search" value="${this.activeFilters.search || ''}">
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
            <select class="form-select form-select-sm" data-filter="${key}" data-action="apply-filter">
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
                   value="${value}" data-action="apply-filter">
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
    const searchInputs = this.container.querySelectorAll('[data-filter="search"]');
    searchInputs.forEach(input => {
      input.value = value || '';
    });
  }

  closeFilterDropdown() {
    const dropdown = this.container.querySelector('.dropdown-toggle[data-bs-toggle="dropdown"]');
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
    
    const selectAllCell = this.options.selectable ? 
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
          <th>Actions</th>
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
    
    console.log('🔍 [DEBUG] buildTableBody - Before processData:', {
      rawDataLength: data?.length,
      rawData: data,
      firstItem: data?.[0]
    });
    
    // Apply client-side filtering, sorting, and pagination
    data = this.processData(data || []);
    
    console.log('🔍 [DEBUG] buildTableBody - After processData:', {
      processedDataLength: data?.length,
      processedData: data,
      firstProcessedItem: data?.[0]
    });
    
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
      // REST collections: Server handles pagination, use metadata total
      this.totalFilteredItems = this.collection.meta?.total || processedData.length;
      // Don't slice data - server already sent the right page
    } else {
      // Local collections: Apply client-side pagination
      this.totalFilteredItems = processedData.length;
      if (this.options.paginated) {
        const startIndex = ((this.currentPage - 1) * this.itemsPerPage);
        const endIndex = startIndex + this.itemsPerPage;
        processedData = processedData.slice(startIndex, endIndex);
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
    const selectCell = this.options.selectable ? 
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
    
    // Apply column formatting
    if (column.format && typeof column.format === 'function') {
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
    const actions = this.list_options.actions || ['view', 'edit', 'delete'];
    
    const actionButtons = actions.map(action => {
      switch (action) {
        case 'view':
          return `<button class="btn btn-sm btn-outline-primary" data-action="item-clicked" data-id="${this.getCellValue(item, {key: 'id'})}">
            <i class="bi bi-eye"></i>
          </button>`;
        
        case 'edit':
          return `<button class="btn btn-sm btn-outline-secondary" data-action="item-dlg" data-id="${this.getCellValue(item, {key: 'id'})}" data-mode="edit">
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
    
    // Use appropriate total based on collection type
    const totalItems = this.collection?.restEnabled 
      ? (this.collection?.meta?.total || 0)
      : (this.totalFilteredItems || this.collection?.models?.length || 0);
    const totalPages = Math.ceil(totalItems / this.itemsPerPage);
    const currentPage = this.currentPage;
    
    if (totalItems === 0) {
      return '';
    }
    

    
    const startItem = ((currentPage - 1) * this.itemsPerPage) + 1;
    const endItem = Math.min(currentPage * this.itemsPerPage, this.collection?.models?.length || 0);
    
    return `
      <div class="d-flex justify-content-between align-items-center mt-3">
        <div class="d-flex align-items-center">
          <span class="text-muted me-3">
            Showing ${startItem} to ${endItem} of ${totalItems} entries
          </span>
          <div class="d-flex align-items-center">
            <label class="form-label me-2 mb-0">Show:</label>
            <select class="form-select form-select-sm" style="width: auto;" data-action="page-size">
              <option value="10" ${this.itemsPerPage === 10 ? 'selected' : ''}>10</option>
              <option value="25" ${this.itemsPerPage === 25 ? 'selected' : ''}>25</option>
              <option value="50" ${this.itemsPerPage === 50 ? 'selected' : ''}>50</option>
              <option value="100" ${this.itemsPerPage === 100 ? 'selected' : ''}>100</option>
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
   * Bind event listeners
   */
  bindEvents() {
    if (!this.container) return;

    // Prevent duplicate event listeners
    if (this._eventsBound) return;
    this._eventsBound = true;
    
    // Store references to bound functions for cleanup
    if (!this._boundEventHandlers) {
      this._boundEventHandlers = {};
    }

    // Remove existing click listener if it exists
    if (this._boundEventHandlers.click) {
      this.container.removeEventListener('click', this._boundEventHandlers.click);
    }
    
    // Create bound click handler
    this._boundEventHandlers.click = (e) => {
      console.log('🔍 [DEBUG] Click detected:', {
        target: e.target.tagName,
        action: e.target.getAttribute('data-action'),
        dataPage: e.target.getAttribute('data-page'),
        closest: e.target.closest('[data-action]')?.getAttribute('data-action')
      });

      const action = e.target.getAttribute('data-action');
      const closestAction = e.target.closest('[data-action]')?.getAttribute('data-action');
      const actualAction = action || closestAction;
      
      console.log('🔍 [DEBUG] Actual action determined:', actualAction);

      // Prevent default action for all data-action elements (especially pagination links)
      if (actualAction) {
        e.preventDefault();
        e.stopPropagation();
      }

      // Handle specific actions
      switch (actualAction) {
        case 'apply-search':
          this.handleSearchInput(e);
          setTimeout(() => this.closeFilterDropdown(), 100);
          break;
        case 'apply-filter':
          if (e.target.tagName === 'BUTTON') {
            this.handleFilterFromDropdown(e);
            setTimeout(() => this.closeFilterDropdown(), 100);
          }
          break;
        case 'refresh':
          this.handleRefresh(e);
          break;
        case 'add':
          this.handleAdd(e);
          break;
        case 'export':
          this.handleExport(e);
          break;

        case 'remove-filter':
          this.handleRemoveFilter(e);
          break;

        case 'clear-all-filters':
          this.handleClearAllFilters(e);
          break;

        case 'select-all':
          e.stopPropagation();
          const isCurrentlyAllSelected = this.isAllSelected();
          this.handleSelectAll(!isCurrentlyAllSelected);
          break;

        case 'select-item':
          e.stopPropagation();
          const itemId = e.target.closest('[data-id]')?.getAttribute('data-id');
          if (itemId) {
            const isCurrentlySelected = this.selectedItems.has(itemId);
            this.handleSelectItem(itemId, !isCurrentlySelected);
          }
          break;

        default:
          // Handle other actions (page, sort, delete, etc.)
          if (actualAction && !['page-size'].includes(actualAction)) {
            this.handleAction(actualAction, e, e.target.closest('[data-action]') || e.target);
          }
          break;
      }

      // Prevent dropdown from closing for clicks inside dropdown menu
      // but allow form elements to work normally
      const dropdownMenu = e.target.closest('.dropdown-menu');
      if (dropdownMenu) {
        // Don't prevent default browser behavior for form elements
        if (!e.target.matches('select, option, input[type="text"], input[type="date"], button')) {
          e.stopPropagation();
        }
      }
    };
    
    // Use event delegation with a single click listener
    this.container.addEventListener('click', this._boundEventHandlers.click);

    // Remove existing change listener if it exists
    if (this._boundEventHandlers.change) {
      this.container.removeEventListener('change', this._boundEventHandlers.change);
    }
    
    // Create bound change handler
    this._boundEventHandlers.change = async (e) => {
      const action = e.target.getAttribute('data-action');
      
      if (action === 'apply-filter') {
        this.handleFilterFromDropdown(e);
      } else if (action === 'page-size') {
        await this.handlePageSizeChange(parseInt(e.target.value));
      }
    };
    
    // Handle change events for form elements
    this.container.addEventListener('change', this._boundEventHandlers.change);

    // Remove existing keydown listener if it exists
    if (this._boundEventHandlers.keydown) {
      this.container.removeEventListener('keydown', this._boundEventHandlers.keydown);
    }
    
    // Create bound keydown handler
    this._boundEventHandlers.keydown = (e) => {
      if (e.key === 'Enter' && e.target.matches('[data-filter="search"]')) {
        e.preventDefault();
        this.handleSearchInput(e);
        setTimeout(() => this.closeFilterDropdown(), 100);
      }
    };
    
    // Handle Enter key in search inputs
    this.container.addEventListener('keydown', this._boundEventHandlers.keydown);
  }

  /**
   * Handle action events
   * @param {string} action - Action name
   * @param {Event} event - DOM event
   * @param {HTMLElement} target - Target element
   */
  async handleAction(action, event, target) {
    console.log('🔍 [DEBUG] handleAction called:', {
      action,
      dataPage: target?.getAttribute('data-page'),
      targetTag: target?.tagName
    });

    if (!target) {
      console.warn('handleAction called with no target element');
      return;
    }
    
    const itemId = target.getAttribute('data-id');
    const item = itemId ? this.collection?.get(itemId) : null;
    
    switch (action) {
      case 'item-clicked':
        await this.on_item_clicked(item, event, target);
        break;
      
      case 'item-dlg':
        const mode = target.getAttribute('data-mode') || 'view';
        await this.on_item_dlg(item, mode, event, target);
        break;
      
      case 'sort':
        const field = target.getAttribute('data-field');
        const direction = target.getAttribute('data-direction');
        this.handleSort(field, direction);
        break;
      
      case 'page':
        // Ensure we prevent navigation for pagination links
        if (event) {
          event.preventDefault();
          event.stopPropagation();
        }
        const page = parseInt(target.getAttribute('data-page'));
        await this.handlePageChange(page);
        break;
        
      case 'page-size':
        const newSize = parseInt(target.value);
        await this.handlePageSizeChange(newSize);
        break;
        

        
      case 'delete-item':
        if (confirm('Are you sure you want to delete this item?')) {
          await this.handleDeleteItem(item);
        }
        break;
    }
  }

  /**
   * Handle item clicked - from design doc
   * @param {object} item - Clicked item
   * @param {Event} event - DOM event
   * @param {HTMLElement} target - Target element
   */
  async on_item_clicked(item, event, target) {
    console.log('Item clicked:', item);
    // Default implementation - can be overridden
    
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
  async on_item_dlg(item, mode = 'view', event, target) {
    console.log('Item dialog:', item, mode);
    // Default implementation - can be overridden
    
    // Emit event for external handlers
    this.emit('item-dialog', { item, mode, event, target });
  }

  /**
   * Handle column sorting
   * @param {string} field - Field to sort by
   * @param {string} direction - Sort direction ('asc', 'desc', 'none')
   */
  handleSort(field, direction) {
    if (direction === 'none') {
      this.sortBy = null;
      this.sortDirection = 'asc';
    } else {
      this.sortBy = field;
      this.sortDirection = direction || 'asc';
    }
    
    this.currentPage = 1;
    
    // Dispatch sort change event
    if (this.container) {
      const event = new CustomEvent('sort:change', {
        bubbles: true,
        detail: { field: this.sortBy, direction: this.sortDirection }
      });
      this.container.dispatchEvent(event);
    }
    
    // For REST collections, re-fetch data with new sorting
    if (this.collection?.restEnabled) {
      this.fetchWithCurrentFilters();
    } else {
      this.render();
    }
  }

  /**
   * Handle page change
   * @param {number} page - Target page number
   */
  async handlePageChange(page) {
    console.log('🔍 [DEBUG] handlePageChange called with page:', page);
    console.log('🔍 [DEBUG] Collection state before page change:', {
      collectionLength: this.collection?.models?.length,
      metaTotal: this.collection?.meta?.total,
      currentPage: this.currentPage
    });

    const totalItems = this.collection?.restEnabled 
      ? (this.collection?.meta?.total || 0)
      : (this.totalFilteredItems || this.collection?.models?.length || 0);
    const totalPages = Math.ceil(totalItems / this.itemsPerPage);
    
    console.log('🔍 [DEBUG] Wrap-around pagination check:', {
      requestedPage: page,
      totalItems,
      totalPages,
      itemsPerPage: this.itemsPerPage,
      restEnabled: this.collection?.restEnabled,
      totalFilteredItems: this.totalFilteredItems,
      collectionLength: this.collection?.models?.length
    });
    
    // Handle wrap-around pagination
    const originalPage = page;
    if (page < 1) {
      page = totalPages; // Wrap to last page
      console.log('🔄 [DEBUG] Wrapped to last page:', page);
    } else if (page > totalPages) {
      page = 1; // Wrap to first page
      console.log('🔄 [DEBUG] Wrapped to first page:', page);
    } else {
      console.log('🔍 [DEBUG] No wrap needed, staying on page:', page);
    }
    
    this.currentPage = page;
    
    // Check if this collection uses REST for data fetching
    if (this.collection?.restEnabled) {
      // Server-side pagination: fetch new data from API
      const start = (page - 1) * this.itemsPerPage;
      
      try {
        console.log('🔍 [DEBUG] About to fetch in handlePageChange:', { page, start });
        
        // Build sort parameter for API
        const fetchParams = {
          page: page,
          per_page: this.itemsPerPage,
          size: this.itemsPerPage,
          start: start
        };
        
        // Add sort parameter if sorting is active
        if (this.sortBy) {
          fetchParams.sort = this.sortDirection === 'desc' ? `-${this.sortBy}` : this.sortBy;
        }
        
        // Add current filters
        Object.entries(this.activeFilters).forEach(([key, value]) => {
          if (value !== null && value !== undefined && value !== '') {
            fetchParams[key] = value;
          }
        });
        
        console.log('🔍 [DEBUG] handlePageChange final fetch params:', fetchParams);
        await this.collection.fetch({ params: fetchParams });
        console.log('🔍 [DEBUG] handlePageChange fetch completed, new length:', this.collection?.models?.length);
      } catch (error) {
        console.error('Failed to fetch page data:', error);
      }
    }
    
    // Dispatch page change event
    if (this.container) {
      const event = new CustomEvent('page:change', {
        bubbles: true,
        detail: { page: this.currentPage }
      });
      this.container.dispatchEvent(event);
    }
    
    // Always re-render after page change (REST gets new data, local re-slices existing data)
    this.render();
    
    // Dispatch page change event for external listeners (e.g., TablePage)
    if (this.container) {
      this.container.dispatchEvent(new CustomEvent('page:change', {
        bubbles: true,
        detail: { page: this.currentPage }
      }));
    }
  }

  /**
   * Handle page size change
   * @param {number} newSize - New page size
   */
  async handlePageSizeChange(newSize) {
    this.itemsPerPage = newSize;
    this.currentPage = 1;
    
    // Check if this collection uses REST for data fetching
    if (this.collection?.restEnabled) {
      // Server-side pagination: fetch new data from API with new page size
      
      try {
        // Build sort parameter for API
        const fetchParams = {
          page: 1,
          per_page: newSize,
          size: newSize,
          start: 0
        };
        
        // Add sort parameter if sorting is active
        if (this.sortBy) {
          fetchParams.sort = this.sortDirection === 'desc' ? `-${this.sortBy}` : this.sortBy;
        }
        
        // Add current filters
        Object.entries(this.activeFilters).forEach(([key, value]) => {
          if (value !== null && value !== undefined && value !== '') {
            fetchParams[key] = value;
          }
        });
        
        console.log('🔍 [DEBUG] handlePageSizeChange final fetch params:', fetchParams);
        await this.collection.fetch({ params: fetchParams });
      } catch (error) {
        console.error('Failed to fetch data with new page size:', error);
      }
    }
    
    this.render();
    
    // Dispatch per page change event for external listeners
    if (this.container) {
      this.container.dispatchEvent(new CustomEvent('perpage:change', {
        bubbles: true,
        detail: { perPage: this.itemsPerPage }
      }));
    }
  }

  /**
   * Handle select all action
   * @param {boolean} checked - Whether to select all
   */
  handleSelectAll(checked) {

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
 handleSearchInput(e) {
   let searchInput;
   if (e.target.matches('[data-filter="search"]')) {
     searchInput = e.target;
   } else {
     searchInput = e.target.closest('.input-group').querySelector('input[data-filter="search"]');
   }
   
   const searchValue = searchInput.value.trim();
   
   if (searchValue) {
     this.activeFilters.search = searchValue;
   } else {
     delete this.activeFilters.search;
   }
   
   // Update all search inputs to keep them in sync
   this.updateSearchInputs(searchValue);
   
   this.currentPage = 1;
    
   // Dispatch search change event
   if (this.container) {
     const event = new CustomEvent('search:change', {
       bubbles: true,
       detail: { search: searchValue }
     });
     this.container.dispatchEvent(event);
   }
    
   // Fetch new data or re-render
   if (this.collection?.restEnabled) {
     this.fetchWithCurrentFilters();
   } else {
     this.render();
   }
 }

 /**
  * Handle refresh action
  * @param {Event} e - Click event
  */
 handleRefresh(e) {
   e?.preventDefault();
   
   // Emit refresh event
   if (this.container) {
     const event = new CustomEvent('table:refresh', {
       bubbles: true,
       detail: { table: this }
     });
     this.container.dispatchEvent(event);
   }
   
   // If we have a collection with REST enabled, fetch fresh data
   if (this.collection?.restEnabled) {
     this.fetchWithCurrentFilters();
   } else if (this.options.onRefresh) {
     // Call custom refresh handler if provided
     this.options.onRefresh();
   } else {
     // Just re-render
     this.render();
   }
 }

 /**
  * Handle add action
  * @param {Event} e - Click event
  */
 handleAdd(e) {
   e?.preventDefault();
   
   // Emit add event
   if (this.container) {
     const event = new CustomEvent('table:add', {
       bubbles: true,
       detail: { table: this }
     });
     this.container.dispatchEvent(event);
   }
   
   // Call custom add handler if provided
   if (this.options.onAdd) {
     this.options.onAdd();
   }
 }

 /**
  * Handle export action
  * @param {Event} e - Click event
  */
 handleExport(e) {
   e?.preventDefault();
   
   // Emit export event
   if (this.container) {
     const event = new CustomEvent('table:export', {
       bubbles: true,
       detail: { 
         table: this,
         data: this.collection?.models || []
       }
     });
     this.container.dispatchEvent(event);
   }
   
   // Call custom export handler if provided
   if (this.options.onExport) {
     this.options.onExport(this.collection?.models || []);
   }
 }

 handleFilterFromDropdown(e) {
   const filterElement = e.target.closest('[data-filter]');
   if (!filterElement) return;
   
   const filterKey = filterElement.getAttribute('data-filter');
   const filterValue = filterElement.value.trim();
   
   if (filterValue) {
     this.activeFilters[filterKey] = filterValue;
   } else {
     delete this.activeFilters[filterKey];
   }
  
   this.currentPage = 1;
  
   // Dispatch filter change event
   if (this.container) {
     const event = new CustomEvent('filter:change', {
       bubbles: true,
       detail: { filters: this.activeFilters }
     });
     this.container.dispatchEvent(event);
   }
  
  // For REST collections, re-fetch data with new filters
  if (this.collection?.restEnabled) {
    this.fetchWithCurrentFilters();
  } else {
    this.render();
  }
  

}

 handleRemoveFilter(e) {
   const filterKey = e.target.getAttribute('data-filter');
   delete this.activeFilters[filterKey];
   
   // If removing search filter, clear all search inputs
   if (filterKey === 'search') {
     this.updateSearchInputs('');
   }
    
   this.currentPage = 1;
    
   // Dispatch filter change event
   if (this.container) {
     const event = new CustomEvent('filter:change', {
       bubbles: true,
       detail: { filters: { ...this.activeFilters } }
     });
     this.container.dispatchEvent(event);
   }
    
   // For REST collections, re-fetch data with new filters
   if (this.collection?.restEnabled) {
     this.fetchWithCurrentFilters();
   } else {
     this.render();
   }
 }

 handleClearAllFilters(e) {
   this.activeFilters = {};
   
   // Clear all search inputs
   this.updateSearchInputs('');
   
   this.currentPage = 1;
   
   // Dispatch filter change event
   if (this.container) {
     const event = new CustomEvent('filter:change', {
       bubbles: true,
       detail: { filters: {} }
     });
     this.container.dispatchEvent(event);
   }
   
   // For REST collections, re-fetch data with new search
   if (this.collection?.restEnabled) {
     this.fetchWithCurrentFilters();
   } else {
     this.render();
   }
 }



  /**
   * Fetch data with current filters and sorting for REST collections
   */
  async fetchWithCurrentFilters() {
    if (!this.collection?.restEnabled) return;
    
    try {
      const start = (this.currentPage - 1) * this.itemsPerPage;
      
      // Build fetch parameters
      const fetchParams = {
        page: this.currentPage,
        per_page: this.itemsPerPage,
        size: this.itemsPerPage,
        start: start
      };
      
      // Add sort parameter with proper formatting
      if (this.sortBy) {
        fetchParams.sort = this.sortDirection === 'desc' ? `-${this.sortBy}` : this.sortBy;
      }
      
      // Add current filters directly as parameters
      Object.entries(this.activeFilters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          fetchParams[key] = value;
        }
      });
      
      console.log('🔍 [DEBUG] fetchWithCurrentFilters final fetch params:', fetchParams);
      await this.collection.fetch({ params: fetchParams });
    } catch (error) {
      console.error('Failed to fetch filtered data:', error);
      // Fallback to render with existing data
      this.render();
    }
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
   * Update loading state display
   */
  updateLoadingState() {
    if (!this.container) return;
    
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
      this.container.appendChild(overlay);
    } else {
      const overlay = this.container.querySelector('.mojo-table-loading');
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
    const selectCells = this.container.querySelectorAll('.mojo-select-cell');

    selectCells.forEach(cell => {
      const itemId = cell.getAttribute('data-id');
      const isSelected = this.selectedItems.has(itemId);
      

      // Update cell class (this controls the checkmark visibility via CSS)
      cell.classList.toggle('selected', isSelected);
    });
    
    // Update select all cell
    const selectAllCell = this.container.querySelector('.mojo-select-all-cell');
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
    const rows = this.container.querySelectorAll('tbody tr[data-id]');
    rows.forEach(row => {
      const itemId = row.getAttribute('data-id');
      row.classList.toggle('selected', this.selectedItems.has(itemId));
    });
  }

  /**
   * Show error message
   * @param {string} message - Error message
   */
  showError(message) {
    console.error('Table error:', message);
    
    // Display error in container if table failed to render completely
    this.container.innerHTML = `
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
    const existingBanner = this.container.querySelector('.mojo-table-error-banner');
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
    
    this.container.insertBefore(banner, this.container.firstChild);
  }

  /**
   * Render fallback error state when everything fails
   * @param {string} message - Error message
   */
  renderFallbackError(message) {
    console.error('Table critical error:', message);
    
    this.container.innerHTML = `
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
    this.activeFilters = {};
    this.eventHandlers = {};
    this._eventsBound = false;
    this.collection = null;
  }
}

export default Table;