/**
 * Table - Advanced data table component for MOJO framework
 * Displays collections with filtering, sorting, pagination, and actions
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
    this.container = null;
    this.collection = null;
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
      sortable: true,
      filterable: true,
      paginated: true,
      responsive: true,
      striped: true,
      bordered: false,
      hover: true,
      ...options
    };
    
    // Event listeners
    this.listeners = {};
    
    // Initialize
    this.init();
  }

  /**
   * Initialize the table component
   */
  init() {
    if (this.Collection) {
      this.collection = new this.Collection();
      
      // Set up collection event listeners
      this.collection.on('update', () => {
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
    if (container) {
      this.container = container;
    }
    
    if (!this.container) {
      throw new Error('No container specified for table rendering');
    }

    this.loading = true;
    this.updateLoadingState();

    try {
      // Fetch data if collection exists
      if (this.collection) {
        const params = {
          ...this.collection_params,
          ...this.buildQueryParams()
        };
        
        await this.collection.fetch({ params });
      }

      // Render table HTML
      this.container.innerHTML = this.buildTableHTML();
      
      // Bind events
      this.bindEvents();
      
      this.loading = false;
      this.updateLoadingState();
      
    } catch (error) {
      this.loading = false;
      this.showError(`Failed to load table data: ${error.message}`);
    }
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
    
    // Sorting
    if (this.sortBy) {
      params.sort_by = this.sortBy;
      params.sort_direction = this.sortDirection;
    }
    
    // Filters
    Object.entries(this.activeFilters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params[`filter_${key}`] = value;
      }
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
    
    return `
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
        <div class="row">
          ${this.options.searchable ? this.buildSearchBox() : ''}
          ${this.options.filterable ? this.buildFilters() : ''}
        </div>
      </div>
    `;
  }

  /**
   * Build search box
   * @returns {string} Search box HTML
   */
  buildSearchBox() {
    return `
      <div class="col-md-6">
        <div class="input-group">
          <input type="text" class="form-control" placeholder="Search..." 
                 data-action="search" value="${this.activeFilters.search || ''}">
          <button class="btn btn-outline-secondary" type="button" data-action="search">
            <i class="fas fa-search"></i>
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Build filter controls
   * @returns {string} Filters HTML
   */
  buildFilters() {
    if (!this.filters || Object.keys(this.filters).length === 0) {
      return '';
    }
    
    const filterControls = Object.entries(this.filters).map(([key, filter]) => {
      return this.buildFilterControl(key, filter);
    }).join('');
    
    return `
      <div class="col-md-6">
        <div class="row">
          ${filterControls}
        </div>
      </div>
    `;
  }

  /**
   * Build individual filter control
   * @param {string} key - Filter key
   * @param {object} filter - Filter configuration
   * @returns {string} Filter control HTML
   */
  buildFilterControl(key, filter) {
    const value = this.activeFilters[key] || '';
    
    switch (filter.type) {
      case 'select':
        return `
          <div class="col-auto">
            <select class="form-select" data-filter="${key}">
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
          <div class="col-auto">
            <input type="date" class="form-control" data-filter="${key}" 
                   value="${value}" placeholder="${filter.placeholder || ''}">
          </div>
        `;
      
      default:
        return `
          <div class="col-auto">
            <input type="text" class="form-control" data-filter="${key}" 
                   value="${value}" placeholder="${filter.placeholder || ''}">
          </div>
        `;
    }
  }

  /**
   * Build table header
   * @returns {string} Table header HTML
   */
  buildTableHeader() {
    const headerCells = this.columns.map(column => {
      const sortable = this.options.sortable && column.sortable !== false;
      const sortClass = this.getSortClass(column.key);
      
      return `
        <th class="${sortable ? 'sortable' : ''} ${sortClass}"
            ${sortable ? `data-action="sort" data-field="${column.key}"` : ''}>
          ${column.title || column.key}
          ${sortable ? '<i class="fas fa-sort sort-icon"></i>' : ''}
        </th>
      `;
    }).join('');
    
    const selectAllCell = this.options.selectable ? 
      '<th><input type="checkbox" data-action="select-all"></th>' : '';
    
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
   * Build table body
   * @param {array} data - Table data
   * @returns {string} Table body HTML
   */
  buildTableBody(data) {
    if (!data || data.length === 0) {
      const colspan = this.columns.length + (this.options.selectable ? 1 : 0) + 1;
      return `
        <tbody>
          <tr>
            <td colspan="${colspan}" class="text-center py-4">
              <div class="text-muted">
                <i class="fas fa-inbox fa-2x mb-2"></i>
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
   * Build individual table row
   * @param {object} item - Data item
   * @param {number} index - Row index
   * @returns {string} Table row HTML
   */
  buildTableRow(item, index) {
    const cells = this.columns.map(column => {
      return this.buildTableCell(item, column);
    }).join('');
    
    const selectCell = this.options.selectable ? 
      `<td>
        <input type="checkbox" data-action="select-item" data-id="${item.id}" 
               ${this.selectedItems.has(item.id) ? 'checked' : ''}>
      </td>` : '';
    
    const actionCell = this.buildActionCell(item);
    
    return `
      <tr data-id="${item.id}" class="${this.selectedItems.has(item.id) ? 'selected' : ''}">
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
    if (typeof item.get === 'function') {
      return item.get(column.key);
    }
    
    // Support nested properties
    const keys = column.key.split('.');
    let value = item;
    
    for (const key of keys) {
      value = value?.[key];
      if (value === undefined || value === null) break;
    }
    
    return value;
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
          return `<button class="btn btn-sm btn-outline-primary" data-action="item-clicked" data-id="${item.id}">
            <i class="fas fa-eye"></i>
          </button>`;
        
        case 'edit':
          return `<button class="btn btn-sm btn-outline-secondary" data-action="item-dlg" data-id="${item.id}" data-mode="edit">
            <i class="fas fa-edit"></i>
          </button>`;
        
        case 'delete':
          return `<button class="btn btn-sm btn-outline-danger" data-action="delete-item" data-id="${item.id}">
            <i class="fas fa-trash"></i>
          </button>`;
        
        default:
          if (typeof action === 'object') {
            return `<button class="btn btn-sm ${action.class || 'btn-outline-primary'}" 
                      data-action="${action.action}" data-id="${item.id}">
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
   * Build pagination controls
   * @returns {string} Pagination HTML
   */
  buildPagination() {
    if (!this.options.paginated || !this.collection?.meta) {
      return '';
    }
    
    const meta = this.collection.meta;
    const totalPages = meta.total_pages || 1;
    const currentPage = meta.page || 1;
    
    if (totalPages <= 1) {
      return '';
    }
    
    return `
      <nav aria-label="Table pagination">
        <ul class="pagination justify-content-center">
          <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" data-action="page" data-page="${currentPage - 1}">Previous</a>
          </li>
          ${this.buildPaginationPages(currentPage, totalPages)}
          <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" data-action="page" data-page="${currentPage + 1}">Next</a>
          </li>
        </ul>
      </nav>
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
    
    // Item clicked handler
    this.container.addEventListener('click', (e) => {
      const target = e.target.closest('[data-action]');
      if (!target) return;
      
      e.preventDefault();
      const action = target.getAttribute('data-action');
      
      this.handleAction(action, e, target);
    });
    
    // Filter change handlers
    this.container.addEventListener('input', (e) => {
      if (e.target.hasAttribute('data-filter')) {
        this.handleFilterChange(e.target);
      }
    });
    
    this.container.addEventListener('change', (e) => {
      if (e.target.hasAttribute('data-filter')) {
        this.handleFilterChange(e.target);
      }
    });
  }

  /**
   * Handle action events
   * @param {string} action - Action name
   * @param {Event} event - DOM event
   * @param {HTMLElement} target - Target element
   */
  async handleAction(action, event, target) {
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
        this.handleSort(field);
        break;
      
      case 'page':
        const page = parseInt(target.getAttribute('data-page'));
        this.handlePageChange(page);
        break;
      
      case 'search':
        this.handleSearch();
        break;
      
      case 'select-all':
        this.handleSelectAll(target.checked);
        break;
      
      case 'select-item':
        this.handleSelectItem(itemId, target.checked);
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
   */
  handleSort(field) {
    if (this.sortBy === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = field;
      this.sortDirection = 'asc';
    }
    
    this.currentPage = 1;
    this.render();
  }

  /**
   * Handle page change
   * @param {number} page - Target page number
   */
  handlePageChange(page) {
    if (page < 1 || (this.collection?.meta?.total_pages && page > this.collection.meta.total_pages)) {
      return;
    }
    
    this.currentPage = page;
    this.render();
  }

  /**
   * Handle search
   */
  handleSearch() {
    const searchInput = this.container.querySelector('[data-action="search"]');
    if (searchInput) {
      this.activeFilters.search = searchInput.value;
      this.currentPage = 1;
      this.render();
    }
  }

  /**
   * Handle filter changes
   * @param {HTMLElement} filterElement - Filter input element
   */
  handleFilterChange(filterElement) {
    const filterKey = filterElement.getAttribute('data-filter');
    const filterValue = filterElement.value;
    
    if (filterValue) {
      this.activeFilters[filterKey] = filterValue;
    } else {
      delete this.activeFilters[filterKey];
    }
    
    this.currentPage = 1;
    this.render();
  }

  /**
   * Handle select all checkbox
   * @param {boolean} checked - Checkbox state
   */
  handleSelectAll(checked) {
    if (checked) {
      this.collection?.models.forEach(item => {
        this.selectedItems.add(item.id);
      });
    } else {
      this.selectedItems.clear();
    }
    
    this.updateSelectionDisplay();
  }

  /**
   * Handle individual item selection
   * @param {string} itemId - Item ID
   * @param {boolean} checked - Checkbox state
   */
  handleSelectItem(itemId, checked) {
    if (checked) {
      this.selectedItems.add(itemId);
    } else {
      this.selectedItems.delete(itemId);
    }
    
    this.updateSelectionDisplay();
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
    // Update checkboxes
    const checkboxes = this.container.querySelectorAll('[data-action="select-item"]');
    checkboxes.forEach(checkbox => {
      const itemId = checkbox.getAttribute('data-id');
      checkbox.checked = this.selectedItems.has(itemId);
    });
    
    // Update select all checkbox
    const selectAllCheckbox = this.container.querySelector('[data-action="select-all"]');
    if (selectAllCheckbox) {
      const totalItems = this.collection?.models.length || 0;
      selectAllCheckbox.checked = totalItems > 0 && this.selectedItems.size === totalItems;
      selectAllCheckbox.indeterminate = this.selectedItems.size > 0 && this.selectedItems.size < totalItems;
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
    // Could be enhanced with toast notifications
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
    if (this.container) {
      this.container.innerHTML = '';
    }
    
    this.selectedItems.clear();
    this.listeners = {};
    this.collection = null;
  }
}

export default Table;