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
 *     { key: 'email', label: 'Email', visibility: 'md' },  // Hidden on xs/sm, visible md+
 *     { key: 'phone', label: 'Phone', visibility: 'lg' },  // Visible only on lg+
 *     { key: 'created', label: 'Created', formatter: 'date', visibility: 'xl' }  // Visible only on xl+
 *   ],
 *   actions: ['view', 'edit', 'delete'],
 *   selectionMode: 'multiple'
 * });
 */

import ListView from '../list/ListView.js';
import TableRow from './TableRow.js';
import Mustache from '../../utils/mustache.js';
import Dialog from '../../core/Dialog.js';
import FormView from '../../forms/FormView.js';

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
    this.clickAction = options.clickAction || "view";

    // Model operation configurations
    this.itemView = options.itemView;
    this.addForm = options.addForm;
    this.editForm = options.editForm;
    this.deleteTemplate = options.deleteTemplate;
    this.formDialogConfig = options.formDialogConfig || {};
    this.viewDialogOptions = options.viewDialogOptions || {};

    // Filter configuration
    this.filters = {};
    this.additionalFilters = options.filters || [];
    this.hideActivePills = options.hideActivePills || false;
    this.hideActivePillNames = options.hideActivePillNames || [];
    this.rowAction = options.rowAction || "row-click";
    this.batchBarLocation = options.batchBarLocation || "bottom"; // "top" or "bottom"

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

    // Initialize column configuration BEFORE building template
    this.initializeColumns();

    // Extract filters from columns BEFORE building template
    this.extractColumnFilters();

    // Build template with Mustache variables
    this.template = this.buildTableTemplate();
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
   * Get responsive CSS classes for column visibility
   * @param {string} visibility - Bootstrap breakpoint (sm, md, lg, xl, xxl)
   * @returns {string} Bootstrap responsive display classes
   */
  getResponsiveClasses(visibility) {
    if (!visibility) return ''; // Always visible if no visibility specified

    const validBreakpoints = ['sm', 'md', 'lg', 'xl', 'xxl'];
    if (!validBreakpoints.includes(visibility)) {
      console.warn(`Invalid visibility breakpoint: ${visibility}. Valid options are: ${validBreakpoints.join(', ')}`);
      return '';
    }

    // Hide on smaller screens, show at breakpoint and up using table-cell display
    return `d-none d-${visibility}-table-cell`;
  }

  /**
   * Extract filters from column configuration
   */
  extractColumnFilters() {
    this.filters = {};
    this.columns.forEach(column => {
      if (column.filter) {
        this.filters[column.key] = column.filter;
      }
    });
  }

  /**
   * Override getTemplateData to provide dynamic values for Mustache
   */
  getTemplateData() {
    const data = super.getTemplateData();
    data.searchValue = this.getActiveFilters().search || '';
    return data;
  }

  /**
   * Build the complete table template
   */
  buildTableTemplate() {
    const batchPanelTop = this.batchBarLocation === 'top' ? this.buildBatchActionsPanel() : '';
    const batchPanelBottom = this.batchBarLocation === 'bottom' ? this.buildBatchActionsPanel() : '';

    return `
      <div class="mojo-table-wrapper">
        ${this.buildToolbarTemplate()}
        ${batchPanelTop}
        <div class="table-container">
          {{#loading}}
            <div class="mojo-table-loading d-flex justify-content-center align-items-center py-5">
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
        ${batchPanelBottom}
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
    if (this.tableOptions.background) classes.push(`table-${this.tableOptions.background}`);
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
      <div class="table-action-buttons mb-3">
        <div class="d-flex align-items-center gap-2">
          ${this.buildActionButtonsTemplate()}
          ${this.filterable ? this.buildFilterDropdownTemplate() : ''}
          ${this.searchable && this.searchPlacement === 'toolbar' ? this.buildSearchTemplate() : ''}

        </div>
        <div data-container="filter-pills"></div>
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
      <button class="btn btn-sm btn-outline-secondary btn-refresh"
              data-action="refresh"
              title="Refresh">
        <i class="bi bi-arrow-clockwise"></i>
      </button>
    `);

    // Custom action buttons from options
    if (this.options.showAdd) {
      buttons.push(`
        <button class="btn btn-sm btn-success btn-add"
                data-action="add"
                title="Add">
          <i class="bi bi-plus-circle me-1"></i>
          <span class="d-none d-lg-inline">Add</span>
        </button>
      `);
    }

    if (this.options.showExport) {
      buttons.push(`
        <button class="btn btn-sm btn-outline-secondary btn-export"
                data-action="export"
                title="Export">
          <i class="bi bi-download me-1"></i>
          <span class="d-none d-lg-inline">Export</span>
        </button>
      `);
    }

    // if (buttons.length > 0) {
    //   buttons.push(`<div class="vr mx-2"></div>`);
    // }

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
                 placeholder="{{searchPlaceholder}}"
                 data-filter="search"
                 data-change-action="apply-search"
                 value="{{collection.params.search}}"
                 aria-label="Search">
          {{#searchValue}}
            <button class="btn btn-outline-secondary" type="button"
                    data-action="clear-search"
                    title="Clear search">
              <i class="bi bi-x"></i>
            </button>
          {{/searchValue}}
        </div>
      </div>
    `;
  }

  /**
   * Build filter dropdown template
   */
  buildFilterDropdownTemplate() {
    const hasFilters = (this.filters && Object.keys(this.filters).length > 0) ||
                      (this.additionalFilters && this.additionalFilters.length > 0);

    if (!hasFilters) {
      return '';
    }

    return `
      <div class="dropdown">
        <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button"
                data-bs-toggle="dropdown" aria-expanded="false">
          <i class="bi bi-filter me-1"></i>
          <span class="d-none d-lg-inline">Add Filter</span>
        </button>
        <div class="dropdown-menu" style="min-width: 250px;">
          ${this.buildFilterList()}
        </div>
      </div>
    `;
  }

  /**
   * Build simple filter selection list
   */
  buildFilterList() {
    const allFilters = this.getAllAvailableFilters();
    const activeFilters = this.getActiveFilters();

    if (allFilters.length === 0) {
      return '<div class="dropdown-item-text text-muted">No filters available</div>';
    }

    const filterItems = allFilters.map(filter => {
      const isActive = activeFilters.hasOwnProperty(filter.key);
      const activeClass = isActive ? 'active' : '';
      const icon = this.getFilterIcon(filter.type || filter.config?.type);

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
      ${Object.keys(activeFilters).length > 0 ? `
        <div class="dropdown-divider"></div>
        <button class="dropdown-item text-danger" data-action="clear-all-filters">
          <i class="bi bi-x-circle me-2"></i>Clear All Filters
        </button>
      ` : ''}
    `;
  }

  /**
   * Update filter pills in the DOM
   */
  updateFilterPills() {
    const container = this.element?.querySelector('[data-container="filter-pills"]');

    if (!container) {
      return;
    }

    const activeFilters = this.getActiveFilters();

    const pillsHTML = this.buildActivePills();
    container.innerHTML = pillsHTML;
  }

  /**
   * Update search input value across all search inputs
   */
  updateSearchInputs(value) {
    const searchInputs = this.element?.querySelectorAll('[data-filter="search"]');
    if (searchInputs) {
      searchInputs.forEach(input => {
        input.value = value || '';
      });
    }
  }

  /**
   * Build active filter pills display
   */
  buildActivePills() {
    if (this.hideActivePills) {
      return '';
    }

    const activeFilters = this.getActiveFilters();
    const hasSearch = activeFilters.search && activeFilters.search.toString().trim() !== '';
    let filterEntries = Object.entries(activeFilters).filter(([key, value]) =>
      value && value.toString().trim() !== '' && key !== 'search'
    );

    // Hide specific pills based on configuration
    if (this.hideActivePillNames && this.hideActivePillNames.length > 0) {
      filterEntries = filterEntries.filter(([key]) =>
        !this.hideActivePillNames.includes(key)
      );
    }

    if (filterEntries.length === 0 && !hasSearch) {
      return '';
    }

    const pills = filterEntries.map(([key, value]) => {
      const label = this.getFilterLabel(key);
      const displayValue = this.getFilterDisplayValue(key, value);
      const icon = 'filter'; // search won't appear as pill anymore

      return `
        <span class="badge bg-primary me-1 mb-1 py-1 px-2 position-relative" style="font-size: 0.75rem;">
          <i class="bi bi-${icon} me-1" style="font-size: 0.65rem;"></i>
          <small>${label}: ${displayValue}</small>

          <button type="button" class="btn btn-link text-white p-0 ms-1"
                  style="font-size: 0.65rem; line-height: 1;"
                  data-action="edit-filter"
                  data-filter="${key}"
                  title="Edit filter">
            <i class="bi bi-pencil"></i>
          </button>

          <button type="button" class="btn-close btn-close-white ms-1"
                  style="font-size: 0.6rem; width: 0.5rem; height: 0.5rem;"
                  data-action="remove-filter"
                  data-filter="${key}"
                  title="Remove filter">
          </button>
        </span>
      `;
    }).join('');

    // Show Clear All if there are multiple filters, or any filter + search
    const showClearAll = filterEntries.length > 1 || (filterEntries.length > 0 && hasSearch) || (filterEntries.length === 0 && hasSearch);
    const clearAllButton = showClearAll ? `
      <button class="btn btn-sm btn-outline-secondary mb-1 py-0 px-2" style="font-size: 0.75rem;" data-action="clear-all-filters">
        <i class="bi bi-x-circle me-1" style="font-size: 0.7rem;"></i>
        <small>Clear All</small>
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
   * Build table header template
   */
  buildTableHeaderTemplate() {
    let headerCells = '';

    // Selection checkbox header
    if (this.batchActions && this.batchActions.length > 0) {
      headerCells += `
        <th style="width: 40px; padding: 0;">
          <div class="mojo-select-all-cell" data-action="select-all">
            <div class="mojo-checkbox">
              <i class="bi bi-check"></i>
            </div>
          </div>
        </th>
      `;
    }

    // Column headers
    this.columns.forEach(column => {
      const sortable = this.sortable && column.sortable !== false;
      const currentSort = this.getSortBy() === column.key ? this.getSortDirection() : null;
      const sortIcon = this.getSortIcon(currentSort);
      const label = column.label || column.title || column.key;
      const responsiveClasses = this.getResponsiveClasses(column.visibility);

      const sortDropdown = sortable ? `
        <div class="dropdown d-inline-block ms-2">
          <button class="btn btn-sm btn-link p-0 text-decoration-none" type="button"
                  data-bs-toggle="dropdown" aria-expanded="false"
                  data-column="${column.key}">
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

      headerCells += `
        <th class="${sortable ? 'sortable' : ''} ${responsiveClasses}">
          <div class="d-flex align-items-center">
            <span>${label}</span>
            ${sortDropdown}
          </div>
        </th>
      `;
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
   * Build batch actions panel
   */
  buildBatchActionsPanel() {
    if (!this.batchActions || this.batchActions.length === 0) {
      return '';
    }

    if (this.batchBarLocation === 'top') {
      // Toolbar-style batch actions for top placement
      let actionsHTML = '';
      this.batchActions.forEach(action => {
        actionsHTML += `
          <button class="btn btn-sm btn-outline-secondary" data-action="batch-${action.action}" title="${action.label}">
            <i class="${action.icon} me-1"></i>
            <span class="d-none d-lg-inline">${action.label}</span>
          </button>
        `;
      });

      return `
        <div class="batch-actions-panel-top alert alert-info d-none mb-3" role="alert">
          <div class="d-flex justify-content-between align-items-center">
            <div class="d-flex align-items-center">
              <strong class="me-2">
                <span class="batch-select-count">0</span> ${this.options.batchPanelTitle || 'items'} selected
              </strong>
            </div>
            <div class="d-flex gap-2 align-items-center">
              ${actionsHTML}
              <button class="btn btn-sm btn-outline-secondary" data-action="clear-selection" title="Clear Selection">
                <i class="bi bi-x-circle me-1"></i>
                <span class="d-none d-lg-inline">Clear</span>
              </button>
            </div>
          </div>
        </div>
      `;
    } else {
      // Original bottom panel style
      let actionsHTML = '';
      this.batchActions.forEach(action => {
        actionsHTML += `
          <div class="batch-select-action text-center px-2" data-action="batch-${action.action}">
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
                <div class="ps-2 batch-select-title">${this.options.batchPanelTitle || 'Rows'}</div>
              </div>
              <div class="col">
                <div class="batch-select-actions d-flex justify-content-end">
                  ${actionsHTML}
                </div>
              </div>
              <div class="col-auto">
                <div class="batch-select-end rounded-end"></div>
              </div>
            </div>
          </div>
        </div>
      `;
    }
  }

  /**
   * Build pagination template
   */
  buildPaginationTemplate() {
    if (!this.paginated) {
      return '';
    }

    return `
      <div class="table-status-bar mt-3">
        <div class="d-flex flex-column flex-lg-row justify-content-center justify-content-lg-between align-items-center gap-3">
          <div class="d-flex flex-column flex-sm-row align-items-center gap-2 gap-sm-3 text-center text-lg-start">
            <span class="text-muted">
              Showing <span data-value="start">0</span> to <span data-value="end">0</span>
              of <span data-value="total">0</span> entries
            </span>
            <div class="d-flex align-items-center">
              <label class="form-label me-2 mb-0">Show:</label>
              <select class="form-select form-select-sm" style="width: auto;" data-change-action="page-size">
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
          </div>
          <nav aria-label="Table pagination">
            <ul class="pagination pagination-sm mb-0 justify-content-center" data-container="pagination">
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
    itemView.on('item:select', (event) => {
      this._onItemSelect(event);
      this.updateBatchActionsPanel();
    });
    itemView.on('item:deselect', (event) => {
      this._onItemDeselect(event);
      this.updateBatchActionsPanel();
    });

    // Table-specific row events
    itemView.on('row:click', this._onRowClick.bind(this));
    itemView.on('row:view', this._onRowView.bind(this));
    itemView.on('row:edit', this._onRowEdit.bind(this));
    itemView.on('row:delete', this._onRowDelete.bind(this));

    return itemView;
  }

  /**
   * Override onMounted to ensure filter pills are shown on initial load
   */
  async onMounted() {
    await super.onMounted();
    const activeFilters = this.getActiveFilters();

    // Ensure filter pills are displayed if there are active filters from URL
    if (this.collection && Object.keys(activeFilters).length > 0) {
      this.updateFilterPills();
    }

    // Add listener for native search clear button
    this.setupSearchClearListener();
  }

  /**
   * Setup listener for native search clear (X) button
   */
  setupSearchClearListener() {
    if (!this.element) return;

    const searchInputs = this.element.querySelectorAll('input[type="search"][data-filter="search"]');
    searchInputs.forEach(input => {
      // Listen for input event to detect native clear
      input.addEventListener('input', (event) => {
        // If value is empty and we had a search before, it was cleared
        if (event.target.value === '' && this.getActiveFilters().search) {
          this.onActionClearSearch(event, event.target);
        }
      });
    });
  }

  /**
   * Handle row click event
   */
  _onRowClick(event) {
    this.emit('row:click', event);

    // Default behavior - show item details if configured
    if (this.options.onRowClick) {
      return this.options.onRowClick(event.model, event.event);
    }

    if (this.clickAction === 'view') {
      this._onRowView(event);
    } else if (this.clickAction === 'edit') {
      this._onRowEdit(event);
    }
  }

  /**
   * Get the Model class from collection or instance
   */
  getModelClass(model) {
    // Try to get from collection first
    if (this.collection?.ModelClass) return this.collection.ModelClass;
    if (this.collection?.model) return this.collection.model;

    // Try to get from a model instance
    if (model?.constructor) return model.constructor;

    // Return null if we can't determine
    return null;
  }

  /**
   * Get model name for display
   */
  getModelName(model) {
    const ModelClass = this.getModelClass(model);
    if (!ModelClass) return 'Item';

    return ModelClass.MODEL_NAME ||
           ModelClass.name.replace(/Model$/, '') ||
           'Item';
  }

  /**
   * Resolve item view class with fallbacks
   */
  getItemViewClass(model) {
    // Check instance options first
    if (this.itemView) return this.itemView;

    // Check Model class static property
    const ModelClass = this.getModelClass(model);
    if (ModelClass?.VIEW_CLASS) return ModelClass.VIEW_CLASS;

    return null; // Will use data view as fallback
  }

  /**
   * Resolve add form configuration with fallbacks
   */
  getAddFormConfig(ModelClass) {
    return this.addForm ||
           ModelClass?.ADD_FORM ||
           this.editForm ||
           ModelClass?.EDIT_FORM;
  }

  /**
   * Resolve edit form configuration with fallbacks
   */
  getEditFormConfig(ModelClass) {
    return this.editForm ||
           ModelClass?.EDIT_FORM ||
           this.addForm ||
           ModelClass?.ADD_FORM;
  }

  /**
   * Get form dialog configuration
   */
  getFormDialogConfig(ModelClass) {
    return {
      ...ModelClass?.FORM_DIALOG_CONFIG,
      ...this.formDialogConfig
    };
  }

  /**
   * Render a template string with model context
   */
  renderTemplateString(template, model) {
    if (!template) return '';

    // Use Mustache to render the template with the model as context
    return Mustache.render(template, model);
  }

  /**
   * Handle row view action
   */
  async _onRowView(event) {
    this.emit('row:view', event);

    // Check for custom handler first
    if (this.options.onItemView) {
      await this.options.onItemView(event.model, event.event);
      return;
    }

    const ViewClass = this.getItemViewClass(event.model);

    if (ViewClass) {
      // Use custom view class
      const viewInstance = new ViewClass({ model: event.model });
      await Dialog.showDialog({
        header: false,
        body: viewInstance,
        size: 'lg',
        centered: false,
        ...this.getFormDialogConfig(this.getModelClass(event.model)),
        ...this.viewDialogOptions
      });
    } else {
      // Fallback to data view
      await Dialog.showData({
        title: `View ${this.getModelName(event.model)} #${event.model.id}`,
        model: event.model
      });
    }
  }

  /**
   * Handle row edit action
   */
  async _onRowEdit(event) {
    this.emit('row:edit', event);

    // Check for custom handler first
    if (this.options.onItemEdit) {
      await this.options.onItemEdit(event.model, event.event);
      return;
    }

    const ModelClass = this.getModelClass(event.model);
    let formConfig = this.getEditFormConfig(ModelClass);

    if (formConfig) {
        if (!formConfig.fields) {
            formConfig = { title: `Edit ${this.getModelName(event.model)}`, fields: formConfig };
        }

      const result = await Dialog.showModelForm({
        model: event.model,
        ...formConfig,
        ...this.getFormDialogConfig(ModelClass)
      });

    } else {
      // Fallback to basic form if no config provided
      // Using statically imported FormView
      const result = await Dialog.showDialog({
        title: `Edit ${this.getModelName(event.model)} #${event.model.id}`,
        body: new FormView({
          model: event.model,
          fields: this.options.formFields || []
        })
      });

      if (result) {
        await event.model.save(result);
        await this.refresh();
      }
    }
  }

  /**
   * Handle row delete action
   */
  async _onRowDelete(event) {
    this.emit('row:delete', event);

    // Check for custom handler first
    if (this.options.onItemDelete) {
      await this.options.onItemDelete(event.model, event.event);
      return;
    }

    const ModelClass = this.getModelClass(event.model);

    // Get delete template from options, Model class, or use default
    const template = this.deleteTemplate ||
                    ModelClass?.DELETE_TEMPLATE ||
                    'Are you sure you want to delete this {{name||"item"}}?';

    // Render template with model context
    const message = this.renderTemplateString(template, event.model);

    const confirmed = await Dialog.confirm({
      message: message || 'Are you sure you want to delete this item?',
      title: 'Confirm Delete',
      confirmText: 'Delete',
      confirmClass: 'btn-danger'
    });

    if (confirmed) {
      await event.model.destroy();
      this.collection.remove(event.model);
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

    // Check for custom handler first
    if (this.options.onAdd) {
      await this.options.onAdd(event);
      return;
    }

    const ModelClass = this.getModelClass();
    if (!ModelClass) {
      console.warn('Cannot determine Model class for add operation');
      return;
    }

    let formConfig = this.getAddFormConfig(ModelClass);

    if (formConfig) {
      const model = new ModelClass();
      if (!formConfig.fields) {
          formConfig = { title: `Add ${this.getModelName()}`, fields: formConfig };
      }

      const result = await Dialog.showForm({
        model: model,
        ...formConfig,
        ...this.getFormDialogConfig(ModelClass)
      });

      if (result) {
        await model.save(result);
        if (this.collection) {
          this.collection.add(model);
        }
        await this.refresh();
      }
    } else {
      // Fallback to basic form if no config provided
      // Using statically imported FormView
      const model = new ModelClass();

      const result = await Dialog.showDialog({
        title: `Add ${this.getModelName()}`,
        body: new FormView({
          model: model,
          fields: this.options.formFields || []
        })
      });

      if (result) {
        await model.save(result);
        if (this.collection) {
          this.collection.add(model);
        }
        await this.refresh();
      }
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
   * Handle search action (Enter key triggers this via EventDelegate)
   */
  async onActionApplySearch(event, element) {
    const searchTerm = element.value.trim();

    if (this.collection) {
      this.setFilter('search', searchTerm);

      // Reset to first page when searching
      this.collection.params.start = 0;

      if (this.collection.restEnabled) {
        await this.collection.fetch();
      } else {
        // Client-side filtering
        this.render();
      }
    }

    // Update filter pills when search changes
    this.updateFilterPills();

    this.emit('table:search', { searchTerm, event });
    this.emit('params-changed');
  }

  /**
   * Handle clear search button
   */
  async onActionClearSearch(event, element) {
    // Clear the search filter
    this.setFilter('search', null);

    // Reset to first page
    if (this.collection) {
      this.collection.params.start = 0;

      if (this.collection.restEnabled) {
        await this.collection.fetch();
      }
    }

    // Render will rebuild the search input with empty value
    await this.render();
    this.updateFilterPills();

    this.emit('table:search', { searchTerm: '', event });
    this.emit('params-changed');
  }

  /**
   * Get current sort field
   */
  getSortBy() {
    const sort = this.collection?.params?.sort;
    if (!sort) return null;
    return sort.startsWith('-') ? sort.slice(1) : sort;
  }

  /**
   * Get current sort direction
   */
  getSortDirection() {
    const sort = this.collection?.params?.sort;
    if (!sort) return 'asc';
    return sort.startsWith('-') ? 'desc' : 'asc';
  }

  /**
   * Get sort icon based on current sort direction
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
   * Handle sort action
   */
  async onActionSort(event, element) {
    event.preventDefault();
    const field = element.getAttribute('data-field');
    const direction = element.getAttribute('data-direction');

    if (this.collection) {
      let newSort;

      if (direction === 'none') {
        newSort = undefined; // Remove sort
      } else if (direction === 'desc') {
        newSort = `-${field}`; // Descending sort
      } else {
        newSort = field; // Ascending sort
      }

      this.collection.setParams({
        ...this.collection.params,
        sort: newSort,
        start: 0 // Reset to first page when sorting changes
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

    // Update sort icons in the DOM
    this.updateSortIcons();

    this.emit('table:sort', { field, event });
    this.emit('params-changed');
  }

  /**
   * Update sort icons in all column headers
   */
  updateSortIcons() {
    if (!this.element) return;

    const currentSortField = this.getSortBy();
    const currentSortDir = this.getSortDirection();

    // Update all sort dropdown buttons
    this.columns.forEach(column => {
      if (this.sortable && column.sortable !== false) {
        const dropdown = this.element.querySelector(`[data-bs-toggle="dropdown"][data-column="${column.key}"]`);
        if (dropdown) {
          const isSorted = currentSortField === column.key;
          const sortIcon = this.getSortIcon(isSorted ? currentSortDir : null);
          dropdown.innerHTML = sortIcon;

          // Update dropdown menu items
          const dropdownMenu = dropdown.nextElementSibling;
          if (dropdownMenu) {
            const ascItem = dropdownMenu.querySelector(`[data-field="${column.key}"][data-direction="asc"]`);
            const descItem = dropdownMenu.querySelector(`[data-field="${column.key}"][data-direction="desc"]`);
            const noneItem = dropdownMenu.querySelector(`[data-field="${column.key}"][data-direction="none"]`);

            if (ascItem) {
              ascItem.classList.toggle('active', isSorted && currentSortDir === 'asc');
            }
            if (descItem) {
              descItem.classList.toggle('active', isSorted && currentSortDir === 'desc');
            }
            if (noneItem) {
              noneItem.classList.toggle('active', !isSorted || currentSortField !== column.key);
            }
          }
        }
      }
    });
  }

  /**
   * Handle select all action
   */
  async onActionSelectAll(event, element) {
    event.stopPropagation();
    const isCurrentlyAllSelected = this.itemViews.size > 0 &&
      Array.from(this.itemViews.values()).every(item => item.selected);

    if (!isCurrentlyAllSelected) {
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

    // Update select all checkbox visual state
    const selectAllCell = this.element?.querySelector('.mojo-select-all-cell');
    if (selectAllCell) {
      selectAllCell.classList.toggle('selected', !isCurrentlyAllSelected);
    }

    // Update batch actions panel
    this.updateBatchActionsPanel();
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

      // Update page size selector
      const pageSizeSelect = this.element.querySelector('[data-change-action="page-size"]');
      if (pageSizeSelect) {
        pageSizeSelect.value = size;
      }

      // Render pagination controls
      this.renderPagination();
    }

    // Update sort icons after render
    this.updateSortIcons();

    // Update filter pills after render - this is crucial for showing pills on page load
    this.updateFilterPills();

    // Re-setup search clear listener after render
    this.setupSearchClearListener();
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
    this.emit('params-changed');
  }

  /**
   * Handle page size change
   */
  async onChangePageSize(event, element) {
    const newSize = parseInt(element.value);

    if (this.collection) {
      // Reset to first page when changing page size
      this.collection.setParams({
        ...this.collection.params,
        start: 0,
        size: newSize
      });

      if (this.collection.restEnabled) {
        await this.collection.fetch();
      }
      this.render();
    }

    this.emit('table:pagesize', { size: newSize, event });
    this.emit('params-changed');
  }

  /**
   * Get active filters from collection params
   */
  getActiveFilters() {
    if (!this.collection?.params) {
      return {};
    }
    const { start, size, sort, ...filters } = this.collection.params;
    return filters;
  }

  /**
   * Set a filter value
   */
  setFilter(key, value) {
    if (!this.collection) return;

    if (value === null || value === undefined || value === '') {
      delete this.collection.params[key];
    } else {
      this.collection.params[key] = value;
    }
  }

  /**
   * Get all available filters
   */
  getAllAvailableFilters() {
    const filters = [];

    // Add column-based filters
    this.columns.forEach(column => {
      if (column.filter) {
        filters.push({
          key: column.key,
          label: column.filter.label || column.label || column.key,
          type: column.filter.type,
          config: column.filter
        });
      }
    });

    // Add additional filters
    if (this.additionalFilters && Array.isArray(this.additionalFilters)) {
      this.additionalFilters.forEach(filter => {
        filters.push({
          key: filter.name || filter.key,
          label: filter.label,
          type: filter.type,
          config: filter
        });
      });
    }

    return filters;
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
      const filter = this.additionalFilters.find(f => (f.name || f.key) === filterKey);
      if (filter) {
        return filter;
      }
    }

    return null;
  }

  /**
   * Get filter label
   */
  getFilterLabel(key) {
    if (key === 'search') return 'Search';

    const filter = this.filters[key];
    if (filter && filter.label) return filter.label;

    const additionalFilter = this.additionalFilters.find(f =>
      (f.name || f.key) === key
    );
    if (additionalFilter && additionalFilter.label) return additionalFilter.label;

    return key.charAt(0).toUpperCase() + key.slice(1);
  }

  /**
   * Get filter display value
   */
  getFilterDisplayValue(key, value) {
    if (key === 'search') return `"${value}"`;

    const filter = this.filters[key] ||
                  this.additionalFilters.find(f => (f.name || f.key) === key);

    if (filter && filter.type === 'select' && filter.options) {
      if (typeof filter.options[0] === 'object') {
        const option = filter.options.find(opt => opt.value === value);
        return option ? option.label : value;
      }
      return value;
    }

    return value;
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
      'number': '123',
      'boolean': 'toggle-on'
    };
    return icons[type] || 'filter';
  }

  /**
   * Handle add filter action
   */
  async onActionAddFilter(event, element) {
    const filterKey = element.getAttribute('data-filter-key');
    const filterConfig = this.getFilterConfig(filterKey);
    const currentValue = this.getActiveFilters()[filterKey];

    if (!filterConfig) {
      console.warn('No filter config found for key:', filterKey);
      return;
    }

    // Using statically imported Dialog

    // Show dialog for this specific filter
    const result = await Dialog.showForm({
      title: `${currentValue !== undefined && currentValue !== '' ? 'Edit' : 'Add'} ${this.getFilterLabel(filterKey)} Filter`,
      size: 'md',
      fields: [this.buildFilterDialogField(filterConfig, currentValue)]
    });

    if (result) {
      // Extract the new filter value
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
      value: currentValue,
      ...filterConfig
    };

    // Set current value appropriately based on filter type
    if (filterConfig.type === 'daterange') {
      // Handle daterange current values
      if (currentValue && typeof currentValue === 'object') {
        field.startDate = currentValue.start || '';
        field.endDate = currentValue.end || '';
      }
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

      const result = {
        start: formResult[startName],
        end: formResult[endName]
      };

      return result;
    }

    return formResult.filter_value;
  }

  /**
   * Apply filters to collection and refresh
   */
  async applyFilters() {
    // Reset to first page when filters change
    if (this.collection) {
      this.collection.params.start = 0;
    }

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

    // Update filter pills display
    this.updateFilterPills();

    // Emit params changed event for URL synchronization
    this.emit('params-changed');
  }

  /**
   * Handle edit filter action from pill
   */
  async onActionEditFilter(event, element) {
    const filterKey = element.getAttribute('data-filter');
    const filterConfig = this.getFilterConfig(filterKey);
    const currentValue = this.getActiveFilters()[filterKey];

    if (!filterConfig) {
      console.warn('No filter config found for key:', filterKey);
      return;
    }

    // Using statically imported Dialog

    // Show mini dialog for this specific filter
    const result = await Dialog.showForm({
      title: `Edit ${this.getFilterLabel(filterKey)} Filter`,
      size: 'md',
      fields: [this.buildFilterDialogField(filterConfig, currentValue)]
    });

    if (result) {
      // Extract the new filter value
      const newFilterValue = this.extractFilterValue(filterConfig, result);
      this.setFilter(filterKey, newFilterValue);
      await this.applyFilters();
    }
  }

  /**
   * Handle remove filter action
   */
  async onActionRemoveFilter(event, element) {
    const filterKey = element.getAttribute('data-filter');
    this.setFilter(filterKey, null);

    // If removing search filter, clear search inputs
    if (filterKey === 'search') {
      this.updateSearchInputs('');
    }

    if (this.collection.restEnabled) {
      await this.collection.fetch();
    }
    this.render();

    // Update filter pills after removing
    this.updateFilterPills();

    this.emit('filter:remove', { key: filterKey });
    this.emit('params-changed');
  }

  /**
   * Handle clear all filters action
   */
  async onActionClearAllFilters(event, element) {
    if (!this.collection) return;

    // Clear all filters except pagination and sorting
    const { start, size, sort } = this.collection.params;
    this.collection.params = { start, size };
    if (sort) this.collection.params.sort = sort;

    // Clear all search inputs
    this.updateSearchInputs('');

    if (this.collection.restEnabled) {
      await this.collection.fetch();
    }
    this.render();

    // Update filter pills after clearing
    this.updateFilterPills();

    this.emit('filters:clear');
    this.emit('params-changed');
  }

  /**
   * Update batch actions panel visibility and count
   */
  updateBatchActionsPanel() {
    if (!this.batchActions || this.batchActions.length === 0) return;

    const selectedCount = this.getSelectedItems().length;

    if (this.batchBarLocation === 'top') {
      // Handle top panel style
      const panel = this.element?.querySelector('.batch-actions-panel-top');
      const countEl = this.element?.querySelector('.batch-select-count');

      if (panel && countEl) {
        countEl.textContent = selectedCount;

        // Use Bootstrap's d-none class for cleaner show/hide
        if (selectedCount > 0) {
          panel.classList.remove('d-none');
        } else {
          panel.classList.add('d-none');
        }
      }
    } else {
      // Handle bottom panel style (original)
      const panel = this.element?.querySelector('.batch-actions-panel');
      const countEl = this.element?.querySelector('.batch-select-count');

      if (panel && countEl) {
        countEl.textContent = selectedCount;
        panel.style.display = selectedCount > 0 ? 'block' : 'none';
      }
    }

    // Update select all checkbox state
    const selectAllCell = this.element?.querySelector('.mojo-select-all-cell');
    if (selectAllCell) {
      const allSelected = this.itemViews.size > 0 &&
        Array.from(this.itemViews.values()).every(item => item.selected);
      const someSelected = Array.from(this.itemViews.values()).some(item => item.selected);

      selectAllCell.classList.toggle('selected', allSelected);
      selectAllCell.classList.toggle('indeterminate', !allSelected && someSelected);

      // Update icon for indeterminate state
      const icon = selectAllCell.querySelector('i');
      if (icon) {
        icon.className = !allSelected && someSelected ? 'bi bi-dash' : 'bi bi-check';
      }
    }
  }

  /**
   * Handle batch action clicks
   */
  async onActionBatch(event, element) {
    const batchAction = element.getAttribute('data-action').replace('batch-', '');
    const selectedItems = this.getSelectedItems();

    this.emit('batch:action', {
      action: batchAction,
      items: selectedItems,
      event
    });
  }

  /**
   * Handle clear selection action (for top batch bar)
   */
  async onActionClearSelection(event, element) {
    this.clearSelection();
    this.updateBatchActionsPanel();
  }
}

export default TableView;
