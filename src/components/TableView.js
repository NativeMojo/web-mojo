/**
 * TableView - Advanced data table component extending ListView
 *
 * Leverages ListView's view management system for efficient row rendering.
 * Each row is a separate TableRow view that only re-renders when its model changes.
 *
 * @example
 * const table = new TableView({
 *   collection: userCollection,
 *   columns: [
 *     { key: 'name', label: 'Name', sortable: true },
 *     { key: 'email', label: 'Email' },
 *     { key: 'created', label: 'Created', formatter: 'date' }
 *   ],
 *   actions: ['view', 'edit', 'delete'],
 *   selectionMode: 'multiple'
 * });
 */

import ListView from './ListView.js';
import TableRow from './TableRow.js';
import dataFormatter from '../utils/DataFormatter.js';

class TableView extends ListView {
  constructor(options = {}) {
    // Set up table-specific defaults before calling super
    const tableOptions = {
      className: 'table-view-component',
      itemClass: options.itemClass || TableRow,
      selectionMode: options.selectable ? 'multiple' : 'none',
      emptyMessage: options.emptyMessage || 'No data available',
      ...options
    };

    super(tableOptions);

    // Table-specific properties
    this.columns = options.columns || [];
    this.actions = options.actions || null;
    this.contextMenu = options.contextMenu || null;
    this.batchActions = options.batchActions || null;
    this.searchable = options.searchable !== false;
    this.sortable = options.sortable !== false;
    this.filterable = options.filterable !== false;
    this.paginated = options.paginated !== false;
    this.rowAction = options.rowAction || "row-click";

    // Table display options
    this.tableOptions = {
      striped: true,
      bordered: false,
      hover: true,
      responsive: false,
      size: null, // null, 'sm', 'lg'
      ...options.tableOptions
    };

    // Search configuration
    this.searchPlacement = options.searchPlacement || 'toolbar'; // 'toolbar' or 'dropdown'
    this.searchPlaceholder = options.searchPlaceholder || 'Search...';

    // Override template to use table structure
    this.template = this.buildTableTemplate();

    // Initialize column configuration
    this.initializeColumns();
  }

  /**
   * Initialize column configuration
   */
  initializeColumns() {
    this.columns.forEach(column => {
      // Ensure each column has a key
      if (!column.key && column.name) {
        column.key = column.name;
      }

      // Set default label if not provided
      if (!column.label && !column.title) {
        column.label = column.key.charAt(0).toUpperCase() + column.key.slice(1);
      }
    });
  }

  /**
   * Build the complete table template
   */
  buildTableTemplate() {
    return `
      <div class="table-view-wrapper">
        ${this.buildToolbarTemplate()}
        <div class="table-container">
          {{#loading}}
            <div class="table-loading d-flex justify-content-center align-items-center py-5">
              <div class="spinner-border" role="status">
                <span class="visually-hidden">Loading...</span>
              </div>
            </div>
          {{/loading}}
          {{^loading}}
            {{#isEmpty}}
              <div class="table-empty text-center py-5">
                <i class="bi bi-inbox fa-2x mb-2 text-muted"></i>
                <p class="text-muted">{{emptyMessage}}</p>
              </div>
            {{/isEmpty}}
            {{^isEmpty}}
              <table class="${this.buildTableClasses()}">
                ${this.buildTableHeaderTemplate()}
                <tbody data-container="items"></tbody>
              </table>
            {{/isEmpty}}
          {{/loading}}
        </div>
        ${this.buildPaginationTemplate()}
      </div>
    `;
  }

  /**
   * Build table CSS classes
   */
  buildTableClasses() {
    let classes = ['table'];

    if (this.tableOptions.striped) classes.push('table-striped');
    if (this.tableOptions.bordered) classes.push('table-bordered');
    if (this.tableOptions.hover) classes.push('table-hover');
    if (this.tableOptions.responsive) classes.push('table-responsive');
    if (this.tableOptions.size === 'sm') classes.push('table-sm');
    if (this.tableOptions.size === 'lg') classes.push('table-lg');

    return classes.join(' ');
  }

  /**
   * Build toolbar template
   */
  buildToolbarTemplate() {
    if (!this.searchable && !this.filterable) {
      return '';
    }

    return `
      <div class="table-toolbar mb-3">
        <div class="d-flex align-items-center gap-2">
          ${this.buildActionButtonsTemplate()}
          ${this.searchable && this.searchPlacement === 'toolbar' ? this.buildSearchTemplate() : ''}
          ${this.filterable ? this.buildFilterDropdownTemplate() : ''}
        </div>
      </div>
    `;
  }

  /**
   * Build action buttons template
   */
  buildActionButtonsTemplate() {
    let buttons = [];

    // Refresh button
    buttons.push(`
      <button class="btn btn-sm btn-outline-secondary"
              data-action="refresh"
              title="Refresh">
        <i class="bi bi-arrow-clockwise"></i>
      </button>
    `);

    // Custom action buttons from options
    if (this.options.showAdd) {
      buttons.push(`
        <button class="btn btn-sm btn-success"
                data-action="add"
                title="Add">
          <i class="bi bi-plus-circle me-1"></i>
          <span class="d-none d-sm-inline">Add</span>
        </button>
      `);
    }

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

    if (buttons.length > 0) {
      buttons.push(`<div class="vr mx-2"></div>`);
    }

    return buttons.join('');
  }

  /**
   * Build search template
   */
  buildSearchTemplate() {
    return `
      <div class="flex-grow-1" style="max-width: 400px;">
        <div class="input-group input-group-sm">
          <span class="input-group-text">
            <i class="bi bi-search"></i>
          </span>
          <input type="search"
                 class="form-control"
                 placeholder="${this.searchPlaceholder}"
                 data-action="search"
                 value=""
                 aria-label="Search">
        </div>
      </div>
    `;
  }

  /**
   * Build filter dropdown template
   */
  buildFilterDropdownTemplate() {
    return `
      <div class="dropdown">
        <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button"
                data-bs-toggle="dropdown" aria-expanded="false">
          <i class="bi bi-filter me-1"></i>
          <span class="d-none d-sm-inline">Filters</span>
        </button>
        <div class="dropdown-menu" style="min-width: 250px;">
          <div class="p-3">
            <!-- Filter content will be added dynamically -->
            <div data-container="filters"></div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Build table header template
   */
  buildTableHeaderTemplate() {
    let headerCells = '';

    // Selection checkbox header
    if (this.batchActions && this.batchActions.length > 0) {
      headerCells += `
        <th style="width: 40px;">
          <div class="form-check">
            <input class="form-check-input" type="checkbox" data-action="select-all">
          </div>
        </th>
      `;
    }

    // Column headers
    this.columns.forEach(column => {
      const sortable = this.sortable && column.sortable !== false;
      const label = column.label || column.title || column.key;

      if (sortable) {
        headerCells += `
          <th class="sortable">
            <div class="d-flex align-items-center">
              <span>${label}</span>
              <button class="btn btn-sm btn-link p-0 ms-2"
                      data-action="sort"
                      data-field="${column.key}">
                <i class="bi bi-arrow-down-up"></i>
              </button>
            </div>
          </th>
        `;
      } else {
        headerCells += `<th>${label}</th>`;
      }
    });

    // Actions header
    if (this.actions) {
      headerCells += '<th>Actions</th>';
    } else if (this.contextMenu) {
      headerCells += '<th style="width: 1px;"></th>';
    }

    return `
      <thead>
        <tr>
          ${headerCells}
        </tr>
      </thead>
    `;
  }

  /**
   * Build pagination template
   */
  buildPaginationTemplate() {
    if (!this.paginated) {
      return '';
    }

    return `
      <div class="table-pagination mt-3">
        <div class="d-flex justify-content-between align-items-center">
          <div class="pagination-info">
            <span class="text-muted">
              Showing <span data-value="start">0</span> to <span data-value="end">0</span>
              of <span data-value="total">0</span> entries
            </span>
          </div>
          <nav aria-label="Table pagination">
            <ul class="pagination pagination-sm mb-0" data-container="pagination">
              <!-- Pagination will be rendered here -->
            </ul>
          </nav>
        </div>
      </div>
    `;
  }

  /**
   * Override _createItemView to pass table-specific options
   */
  _createItemView(model, index) {
    const itemView = new this.itemClass({
      model: model,
      index: index,
      listView: this,
      tableView: this, // Also pass as tableView for clarity
      template: this.itemTemplate,
      columns: this.columns,
      actions: this.actions,
      contextMenu: this.contextMenu,
      batchActions: this.batchActions,
      containerId: 'items'
    });

    // Store the item view
    this.itemViews.set(model.id, itemView);

    // Set up item event listeners
    itemView.on('item:select', this._onItemSelect.bind(this));
    itemView.on('item:deselect', this._onItemDeselect.bind(this));

    // Table-specific row events
    itemView.on('row:click', this._onRowClick.bind(this));
    itemView.on('row:view', this._onRowView.bind(this));
    itemView.on('row:edit', this._onRowEdit.bind(this));
    itemView.on('row:delete', this._onRowDelete.bind(this));

    return itemView;
  }

  /**
   * Handle row click event
   */
  _onRowClick(event) {
    this.emit('row:click', event);

    // Default behavior - show item details if configured
    if (this.options.onRowClick) {
      this.options.onRowClick(event.model, event.event);
    }
  }

  /**
   * Handle row view action
   */
  async _onRowView(event) {
    this.emit('row:view', event);

    // Default behavior
    if (this.options.onItemView) {
      await this.options.onItemView(event.model, event.event);
    } else {
      // Show default view dialog
      const Dialog = await import('./Dialog.js').then(m => m.default);
      await Dialog.showData({
        title: `View Item #${event.model.id}`,
        model: event.model
      });
    }
  }

  /**
   * Handle row edit action
   */
  async _onRowEdit(event) {
    this.emit('row:edit', event);

    // Default behavior
    if (this.options.onItemEdit) {
      await this.options.onItemEdit(event.model, event.event);
    } else {
      // Show default edit dialog
      const Dialog = await import('./Dialog.js').then(m => m.default);
      const FormView = await import('../forms/FormView.js').then(m => m.default);

      const result = await Dialog.showDialog({
        title: `Edit Item #${event.model.id}`,
        body: new FormView({
          model: event.model,
          fields: this.options.formFields || []
        })
      });

      if (result) {
        await event.model.save(result);
        this.refresh();
      }
    }
  }

  /**
   * Handle row delete action
   */
  async _onRowDelete(event) {
    this.emit('row:delete', event);

    // Default behavior
    if (this.options.onItemDelete) {
      await this.options.onItemDelete(event.model, event.event);
    } else {
      // Show confirmation dialog
      const Dialog = await import('./Dialog.js').then(m => m.default);
      const confirmed = await Dialog.confirm(
        'Are you sure you want to delete this item?',
        'Confirm Delete'
      );

      if (confirmed) {
        await event.model.destroy();
        this.collection.remove(event.model);
      }
    }
  }

  /**
   * Handle refresh action
   */
  async onActionRefresh(event, element) {
    await this.refresh();
  }

  /**
   * Handle add action
   */
  async onActionAdd(event, element) {
    this.emit('table:add', { event });

    if (this.options.onAdd) {
      await this.options.onAdd(event);
    }
  }

  /**
   * Handle export action
   */
  async onActionExport(event, element) {
    this.emit('table:export', {
      data: this.collection?.toJSON() || [],
      event
    });

    if (this.options.onExport) {
      await this.options.onExport(this.collection?.toJSON() || []);
    }
  }

  /**
   * Handle search action
   */
  async onActionSearch(event, element) {
    const searchTerm = element.value.trim();

    if (this.collection) {
      this.collection.setParams({
        ...this.collection.params,
        search: searchTerm || undefined
      });

      if (this.collection.restEnabled) {
        await this.collection.fetch();
      } else {
        // Client-side filtering
        this.render();
      }
    }

    this.emit('table:search', { searchTerm, event });
  }

  /**
   * Handle sort action
   */
  async onActionSort(event, element) {
    const field = element.getAttribute('data-field');

    if (this.collection) {
      const currentSort = this.collection.params.sort;
      let newSort;

      if (currentSort === field) {
        newSort = `-${field}`; // Reverse sort
      } else if (currentSort === `-${field}`) {
        newSort = undefined; // Remove sort
      } else {
        newSort = field; // New sort
      }

      this.collection.setParams({
        ...this.collection.params,
        sort: newSort
      });

      if (this.collection.restEnabled) {
        await this.collection.fetch();
      } else {
        // Client-side sorting
        if (newSort) {
          const desc = newSort.startsWith('-');
          const sortField = desc ? newSort.slice(1) : newSort;

          this.collection.sort((a, b) => {
            const aVal = a.get(sortField);
            const bVal = b.get(sortField);

            if (aVal < bVal) return desc ? 1 : -1;
            if (aVal > bVal) return desc ? -1 : 1;
            return 0;
          });
        }

        this.render();
      }
    }

    this.emit('table:sort', { field, event });
  }

  /**
   * Handle select all action
   */
  async onActionSelectAll(event, element) {
    if (element.checked) {
      // Select all visible items
      this.forEachItem(itemView => {
        if (!itemView.selected) {
          itemView.select();
        }
      });
    } else {
      // Deselect all
      this.clearSelection();
    }
  }

  /**
   * Override onAfterRender to update pagination info
   */
  async onAfterRender() {
    await super.onAfterRender();

    // Update pagination info
    if (this.paginated && this.collection) {
      const total = this.collection.meta?.count || this.collection.length();
      const start = this.collection.params?.start || 0;
      const size = this.collection.params?.size || 10;
      const end = Math.min(start + size, total);

      const startEl = this.element.querySelector('[data-value="start"]');
      const endEl = this.element.querySelector('[data-value="end"]');
      const totalEl = this.element.querySelector('[data-value="total"]');

      if (startEl) startEl.textContent = start + 1;
      if (endEl) endEl.textContent = end;
      if (totalEl) totalEl.textContent = total;

      // Render pagination controls
      this.renderPagination();
    }
  }

  /**
   * Render pagination controls
   */
  renderPagination() {
    const paginationContainer = this.element.querySelector('[data-container="pagination"]');
    if (!paginationContainer || !this.collection) return;

    const total = this.collection.meta?.count || this.collection.length();
    const size = this.collection.params?.size || 10;
    const start = this.collection.params?.start || 0;
    const currentPage = Math.floor(start / size) + 1;
    const totalPages = Math.ceil(total / size);

    if (totalPages <= 1) {
      paginationContainer.innerHTML = '';
      return;
    }

    let pages = [];

    // Previous button
    pages.push(`
      <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" data-action="page" data-page="${currentPage - 1}">
          <i class="bi bi-chevron-left"></i>
        </a>
      </li>
    `);

    // Page numbers
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

    // Next button
    pages.push(`
      <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
        <a class="page-link" href="#" data-action="page" data-page="${currentPage + 1}">
          <i class="bi bi-chevron-right"></i>
        </a>
      </li>
    `);

    paginationContainer.innerHTML = pages.join('');
  }

  /**
   * Handle page change
   */
  async onActionPage(event, element) {
    event.preventDefault();

    const page = parseInt(element.getAttribute('data-page'));
    const size = this.collection.params?.size || 10;

    this.collection.setParams({
      ...this.collection.params,
      start: (page - 1) * size
    });

    if (this.collection.restEnabled) {
      await this.collection.fetch();
    } else {
      this.render();
    }

    this.emit('table:page', { page, event });
  }
}

export default TableView;
