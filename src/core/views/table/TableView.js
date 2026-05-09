/**
 * TableView - Advanced data table component extending ListView
 *
 * Renders a Collection as a `<table>` with sortable headers, per-column
 * filters, footer totals, batch actions, fullscreen mode, and Add/Export
 * toolbar buttons. The toolbar shell, search input, filter dropdown +
 * active-pill bar, numbered pagination, page-size selector, refresh
 * button, custom toolbar buttons, title/eyebrow, and right-slot view
 * are all inherited from ListView — TableView only adds table-specific
 * machinery (columns, sortable headers, footer totals, batch panel,
 * fullscreen, Add/Export buttons).
 *
 * @example
 * const table = new TableView({
 *   collection: userCollection,
 *   columns: [
 *     { key: 'name', label: 'Name', sortable: true },
 *     { key: 'email', label: 'Email', visibility: 'md' },
 *     { key: 'phone', label: 'Phone', visibility: 'lg' },
 *     { key: 'created', label: 'Created', formatter: 'date', visibility: 'xl' }
 *   ],
 *   actions: ['view', 'edit', 'delete'],
 *   selectionMode: 'multiple'
 * });
 */

import ListView from '../list/ListView.js';
import TableRow from './TableRow.js';
import dataFormatter from '@core/utils/DataFormatter.js';
import { parseFilterKey } from '@core/utils/DjangoLookups.js';

class TableView extends ListView {
  constructor(options = {}) {
    // Set up table-specific defaults before calling super
    const tableOptions = {
      className: 'table-view-component',
      itemClass: options.itemClass || TableRow,
      selectionMode: options.selectable ? 'multiple' : 'none',
      emptyMessage: options.emptyMessage || 'No data available',
      addButtonIcon: options.addButtonIcon || 'bi bi-plus-circle',
      ...options
    };

    super(tableOptions);

    // Fullscreen state
    this.isFullscreen = false;

    // Table-specific properties
    this.columns = options.columns || [];
    this.actions = options.actions || null;
    this.contextMenu = options.contextMenu || null;
    this.batchActions = options.batchActions || null;

    // Restore TableView's "default true" semantics for these toolbar flags.
    // ListView treats them as opt-in (default false). TableView preserves its
    // historical defaults so existing usage is unchanged.
    this.searchable = options.searchable !== false;
    this.sortable = options.sortable !== false;
    this.filterable = options.filterable !== false;
    this.paginated = options.paginated !== false;

    // Numbered pagination is the convention for tables; "Show more" wouldn't
    // make sense with row-per-record column layouts. Override ListView's
    // default of 'more' (set when only `paginated: true` was passed).
    this.paginationMode = options.paginationMode || 'pages';

    // TableView clears selection on page change unless the caller opts in.
    // This preserves prior behavior where rows are torn down per page.
    this.persistSelection = options.persistSelection === true;

    this.clickAction = options.clickAction || 'view';
    this.fetchOnView = options.fetchOnView !== false;

    // Model operation configurations
    this.itemView = options.itemView;
    this.addForm = options.addForm;
    this.editForm = options.editForm;
    this.deleteTemplate = options.deleteTemplate;
    this.formDialogConfig = options.formDialogConfig || {};
    this.viewDialogOptions = options.viewDialogOptions || {};

    // Export configuration
    this.exportOptions = options.exportOptions || null;
    if (this.options.showExport && !this.exportOptions) {
      this.exportOptions = [
        { format: 'csv', label: 'Export as CSV', icon: 'bi bi-file-earmark-spreadsheet' },
        { format: 'json', label: 'Export as JSON', icon: 'bi bi-file-earmark-code' }
      ];
    }
    this.exportSource = options.exportSource || 'remote';

    // Filter configuration — TableView populates `this.filters` from columns
    // (see extractColumnFilters); ListView's filter API consumes that map.
    this.filters = {};
    this.additionalFilters = options.filters || [];
    this.hideActivePills = options.hideActivePills === true;
    this.hideActivePillNames = options.hideActivePillNames || [];
    this.rowAction = options.rowAction || 'row-click';
    this.batchBarLocation = options.batchBarLocation || 'bottom';

    this.options.addButtonLabel = options.addButtonLabel || 'Add';

    // Custom toolbar buttons
    this.toolbarButtons = options.toolbarButtons || [];
    this.toolbarRight = options.toolbarRight || null;

    // Title block on the toolbar's left side.
    this.title = options.title || null;
    this.eyebrow = options.eyebrow || null;

    // Toolbar chrome gates — defaults preserve existing behavior.
    this.showRefresh = options.showRefresh !== false;
    this.showFullscreen = options.showFullscreen !== false;

    // Table display options
    this.tableOptions = {
      striped: true,
      bordered: false,
      hover: true,
      responsive: false,
      size: null,
      ...options.tableOptions
    };

    // Search configuration
    this.searchPlacement = options.searchPlacement || 'toolbar';
    this.searchPlaceholder = options.searchPlaceholder || 'Search...';

    // Initialize column configuration BEFORE building template
    this.initializeColumns();

    // Extract filters from columns BEFORE building template
    this.extractColumnFilters();

    // Detect columns that need footer totals
    this.footerTotalColumns = this.columns.filter((col) => col.footer_total === true);
    this.hasFooterTotals = this.footerTotalColumns.length > 0;

    // Build template with Mustache variables
    this.template = this.buildTableTemplate();

    // Listen for collection changes to update totals
    this.setupCollectionListeners();
  }

  /**
   * Setup collection event listeners for totals updates
   */
  setupCollectionListeners() {
    if (this.hasFooterTotals && this.collection) {
      this.collection.on('reset add remove change', () => {
        this.updateFooterTotals();
      });
    }
  }

  /**
   * Initialize column configuration
   */
  initializeColumns() {
    this.columns.forEach((column) => {
      if (!column.key && column.name) column.key = column.name;
      if (!column.label && !column.title) {
        column.label = column.key.charAt(0).toUpperCase() + column.key.slice(1);
      }
    });
  }

  /**
   * Get responsive CSS classes for column visibility
   * @param {string|object} visibility - Bootstrap breakpoint or config object
   *   - String: 'md' = show at md and up (hide below)
   *   - Object: { hide: 'md' } = hide at md and up (show below)
   *   - Object: { show: 'md', hide: 'lg' } = show from md to lg only
   * @returns {string} Bootstrap responsive display classes
   */
  getResponsiveClasses(visibility) {
    if (!visibility) return '';
    const validBreakpoints = ['sm', 'md', 'lg', 'xl', 'xxl'];

    if (typeof visibility === 'string') {
      if (!validBreakpoints.includes(visibility)) {
        console.warn(`Invalid visibility breakpoint: ${visibility}. Valid options are: ${validBreakpoints.join(', ')}`);
        return '';
      }
      return `d-none d-${visibility}-table-cell`;
    }

    if (typeof visibility === 'object') {
      const classes = [];
      if (visibility.hide) {
        if (!validBreakpoints.includes(visibility.hide)) {
          console.warn(`Invalid hide breakpoint: ${visibility.hide}. Valid options are: ${validBreakpoints.join(', ')}`);
          return '';
        }
        classes.push(`d-table-cell d-${visibility.hide}-none`);
      }
      if (visibility.show) {
        if (!validBreakpoints.includes(visibility.show)) {
          console.warn(`Invalid show breakpoint: ${visibility.show}. Valid options are: ${validBreakpoints.join(', ')}`);
          return '';
        }
        if (!visibility.hide) {
          classes.push(`d-none d-${visibility.show}-table-cell`);
        } else {
          classes.push(`d-${visibility.show}-table-cell`);
        }
      }
      return classes.join(' ');
    }
    return '';
  }

  /**
   * Get Bootstrap text-alignment class for a column.
   */
  getAlignClass(align) {
    if (!align) return '';
    const map = {
      left: 'text-start',
      start: 'text-start',
      center: 'text-center',
      right: 'text-end',
      end: 'text-end'
    };
    const cls = map[String(align).toLowerCase()];
    if (!cls) {
      console.warn(`Invalid column align: ${align}. Valid options are: left, center, right`);
      return '';
    }
    return cls;
  }

  /**
   * Extract column key and formatter from combined key (e.g., "sales_amount|currency")
   */
  parseColumnKey(key) {
    const parts = key.split('|');
    return {
      fieldKey: parts[0],
      formatter: parts[1] || null
    };
  }

  /**
   * Update footer totals in the DOM without full re-render
   */
  updateFooterTotals() {
    if (!this.hasFooterTotals || !this.element) return;

    const totals = this.calculateFooterTotals();

    let totalColumnIndex = 0;
    this.columns.forEach((column) => {
      if (column.footer_total) {
        const safeKey = `col_${totalColumnIndex}`;
        const cell = this.element.querySelector(`[data-total-column="${safeKey}"]`);

        if (cell && totals[safeKey]) {
          const formatter = this.parseColumnKey(column.key).formatter || column.formatter;
          let displayValue;

          if (formatter && typeof formatter === 'string') {
            displayValue = this.formatValue(totals[safeKey].value, formatter);
          } else {
            displayValue = totals[safeKey].value;
          }
          cell.textContent = displayValue;
        }
        totalColumnIndex++;
      }
    });
  }

  /**
   * Format a value using DataFormatter
   */
  formatValue(value, formatter) {
    try {
      return dataFormatter.pipe(value, formatter);
    } catch (e) {
      console.warn('Error formatting value:', e);
      return value;
    }
  }

  /**
   * Calculate totals for footer columns
   */
  calculateFooterTotals() {
    if (!this.hasFooterTotals || !this.collection || this.collection.length === 0) {
      return {};
    }

    const totals = {};

    this.footerTotalColumns.forEach((column, totalColumnIndex) => {
      const { fieldKey, formatter } = this.parseColumnKey(column.key);
      let sum = 0;

      this.collection.forEach((model) => {
        const value = model.get ? model.get(fieldKey) : model[fieldKey];
        const numValue = parseFloat(value) || 0;
        sum += numValue;
      });

      const safeKey = `col_${totalColumnIndex}`;
      totals[safeKey] = {
        value: sum,
        formatter: formatter || column.formatter,
        fieldKey: fieldKey,
        originalKey: column.key
      };
    });

    return totals;
  }

  /**
   * Extract filters from column configuration. Folds the column's `label`
   * into the filter config as a fallback so ListView's getFilterLabel()
   * (which only reads from `this.filters[key].label`) preserves the
   * historical "filter label → column label → fieldKey" fallback chain.
   */
  extractColumnFilters() {
    this.filters = {};
    this.columns.forEach((column) => {
      if (column.filter) {
        const { fieldKey } = this.parseColumnKey(column.key);
        this.filters[fieldKey] = {
          ...column.filter,
          label: column.filter.label || column.label || fieldKey
        };
      }
    });
  }

  isSelectable() {
    return this.batchActions && this.batchActions.length > 0 && this.selectionMode === 'multiple';
  }

  /**
   * Build the complete table template
   */
  buildTableTemplate() {
    const batchPanelTop = this.batchBarLocation === 'top' ? this.buildBatchActionsPanel() : '';
    const batchPanelBottom = this.batchBarLocation === 'bottom' ? this.buildBatchActionsPanel() : '';

    const fontSize = (() => {
      const __fs = (this.tableOptions && this.tableOptions.fontSize != null)
        ? this.tableOptions.fontSize
        : (this.options && this.options.fontSize);
      const __val = __fs === 'sm' ? '0.9rem' : (__fs === 'xs' ? '0.8rem' : (__fs ? String(__fs) : null));
      return __val ? ` style="font-size: ${__val};"` : '';
    })();

    return `
      <div class="mojo-table-wrapper">
        ${this.buildToolbarTemplate()}
        ${batchPanelTop}
        <div class="table-container"${fontSize}>
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
                ${this.hasFooterTotals ? this.buildTableFooterTemplate() : ''}
              </table>
            {{/isEmpty}}
          {{/loading}}
        </div>
        ${batchPanelBottom}
        ${this.paginated ? this.buildPaginationTemplate() : ''}
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
   * Override buildActionButtonsTemplate to inject the Fullscreen button.
   * Refresh / Add / Export / custom toolbarButtons all come from the
   * inherited ListView implementation. Fullscreen is table-only because
   * full-screening a list of cards isn't a meaningful UX (it would
   * already use the full viewport).
   */
  buildActionButtonsTemplate() {
    let baseButtons = super.buildActionButtonsTemplate();

    if (this.showFullscreen && this.isFullscreenSupported()) {
      const fullscreenBtn = `
        <button class="btn btn-sm btn-outline-secondary btn-fullscreen"
                data-action="toggle-fullscreen"
                title="Toggle Fullscreen">
          <i class="bi bi-fullscreen"></i>
        </button>
      `;
      // Insert after the refresh button (if present) so the visual order
      // matches the historical TableView layout: refresh, fullscreen, add,
      // export, custom.
      const refreshIdx = baseButtons.indexOf('data-action="refresh"');
      if (refreshIdx !== -1) {
        const closingTagEnd = baseButtons.indexOf('</button>', refreshIdx) + '</button>'.length;
        baseButtons = baseButtons.slice(0, closingTagEnd) + fullscreenBtn + baseButtons.slice(closingTagEnd);
      } else {
        baseButtons = fullscreenBtn + baseButtons;
      }
    }

    return baseButtons;
  }

  /**
   * Build table header template
   */
  buildTableHeaderTemplate() {
    let headerCells = '';

    // Selection checkbox header
    if (this.isSelectable()) {
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
    this.columns.forEach((column) => {
      const { fieldKey } = this.parseColumnKey(column.key);

      const sortable = this.sortable && column.sortable !== false;
      const currentSort = this.getSortBy() === fieldKey ? this.getSortDirection() : null;
      const sortIcon = this.getSortIcon(currentSort);
      const label = column.label || column.title || fieldKey;
      const responsiveClasses = this.getResponsiveClasses(column.visibility);

      const sortDropdown = sortable ? `
        <div class="dropdown d-inline-block ms-2">
          <button class="btn btn-sm btn-link p-0 text-decoration-none" type="button"
                  data-bs-toggle="dropdown" aria-expanded="false"
                  data-column="${fieldKey}">
            ${sortIcon}
          </button>
          <ul class="dropdown-menu dropdown-menu-end">
            <li><a class="dropdown-item ${currentSort === 'asc' ? 'active' : ''}"
                   data-action="sort" data-field="${fieldKey}" data-direction="asc">
                <i class="bi bi-sort-alpha-down me-2"></i>Sort A-Z
                </a></li>
            <li><a class="dropdown-item ${currentSort === 'desc' ? 'active' : ''}"
                   data-action="sort" data-field="${fieldKey}" data-direction="desc">
                <i class="bi bi-sort-alpha-down-alt me-2"></i>Sort Z-A
                </a></li>
            <li><a class="dropdown-item ${currentSort === null ? 'active' : ''}"
                   data-action="sort" data-field="${fieldKey}" data-direction="none">
                <i class="bi bi-x-circle me-2"></i>No Sort
                </a></li>
          </ul>
        </div>
      ` : '';

      const alignClass = this.getAlignClass(column.align);
      const headerJustify = alignClass === 'text-center'
        ? 'justify-content-center'
        : alignClass === 'text-end'
          ? 'justify-content-end'
          : '';

      headerCells += `
        <th class="${sortable ? 'sortable' : ''} ${responsiveClasses} ${alignClass}">
          <div class="d-flex align-items-center ${headerJustify}">
            <span>${label}</span>
            ${sortDropdown}
          </div>
        </th>
      `;
    });

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
   * Build table footer template with totals
   */
  buildTableFooterTemplate() {
    let footerCells = '';

    if (this.isSelectable()) {
      footerCells += '<td></td>';
    }

    let totalColumnIndex = 0;
    this.columns.forEach((column, index) => {
      const responsiveClasses = this.getResponsiveClasses(column.visibility);
      const alignClass = this.getAlignClass(column.align);

      if (column.footer_total) {
        const safeKey = `col_${totalColumnIndex}`;
        const formatter = this.parseColumnKey(column.key).formatter || column.formatter;
        let cellContent;
        if (formatter && typeof formatter === 'string') {
          cellContent = `{{{footerTotals.${safeKey}.value|${formatter}}}}`;
        } else {
          cellContent = `{{footerTotals.${safeKey}.value}}`;
        }

        footerCells += `<td class="table-footer-total ${responsiveClasses} ${alignClass}" data-total-column="${safeKey}">${cellContent}</td>`;
        totalColumnIndex++;
      } else if (index === 0) {
        footerCells += `<td class="table-footer-label ${responsiveClasses} ${alignClass}"><strong>Totals</strong></td>`;
      } else {
        footerCells += `<td class="${responsiveClasses} ${alignClass}"></td>`;
      }
    });

    if (this.actions) {
      footerCells += '<td></td>';
    } else if (this.contextMenu) {
      footerCells += '<td></td>';
    }

    return `
      <tfoot>
        <tr class="table-totals-row">
          ${footerCells}
        </tr>
      </tfoot>
    `;
  }

  /**
   * Build batch actions panel
   */
  buildBatchActionsPanel() {
    if (!this.batchActions || this.batchActions.length === 0) return '';

    if (this.batchBarLocation === 'top') {
      let actionsHTML = '';
      this.batchActions.forEach((action) => {
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
      let actionsHTML = '';
      this.batchActions.forEach((action) => {
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
   * Override _createItemView to pass table-specific options (columns,
   * actions, contextMenu, batchActions). Routes through the inherited
   * `_wireItemViewListeners` for the standard select / click / view /
   * edit / delete event wiring, then layers on the table-only events
   * (cell:edit/save/cancel) and the batch-actions select hook.
   */
  _createItemView(model, index) {
    if (this.itemViews.has(model.id)) return this.itemViews.get(model.id);

    const itemView = new this.itemClass({
      model: model,
      index: index,
      listView: this,
      tableView: this,
      template: this.itemTemplate,
      columns: this.columns,
      actions: this.actions,
      contextMenu: this.contextMenu,
      batchActions: this.batchActions,
      containerId: 'items'
    });

    this.itemViews.set(model.id, itemView);

    // Standard select / click / row:view/edit/delete listeners.
    this._wireItemViewListeners(itemView);

    // Batch-actions panel must update on every selection toggle —
    // augment the base select handlers (the parent already wired its
    // own _onItemSelect / _onItemDeselect; we add the panel update on top).
    itemView.on('item:select', () => this.updateBatchActionsPanel());
    itemView.on('item:deselect', () => this.updateBatchActionsPanel());

    // Table-only inline cell editing events.
    itemView.on('cell:edit', this._onCellEdit.bind(this));
    itemView.on('cell:save', this._onCellSave.bind(this));
    itemView.on('cell:cancel', this._onCellCancel.bind(this));

    return itemView;
  }

  /**
   * Override onBeforeRender to surface footerTotals into the template context
   * (still calls super for searchValue + hasMore).
   */
  async onBeforeRender() {
    await super.onBeforeRender();
    this.footerTotals = this.calculateFooterTotals();
  }

  /**
   * Override onAfterRender to also update footer totals + sort icons after
   * the inherited toolbar / pagination / pills update.
   */
  async onAfterRender() {
    await super.onAfterRender();

    if (this.hasFooterTotals) this.updateFooterTotals();
    this.updateSortIcons();
  }

  // -------- Cell-editing events (table-only) --------
  _onCellEdit(event) { this.emit('cell:edit', event); }
  async _onCellSave(event) { this.emit('cell:save', event); }
  _onCellCancel(event) { this.emit('cell:cancel', event); }

  // ============================================================
  // Fullscreen
  // ============================================================

  isFullscreenSupported() {
    return !!(
      document.fullscreenEnabled ||
      document.mozFullScreenEnabled ||
      document.webkitFullscreenEnabled ||
      document.msFullscreenEnabled
    );
  }

  async onActionToggleFullscreen(_event, _element) {
    if (this.isFullscreen) {
      await this.exitFullscreen();
    } else {
      await this.enterFullscreen();
    }
  }

  async enterFullscreen() {
    try {
      if (this.element.requestFullscreen) {
        await this.element.requestFullscreen();
      } else if (this.element.mozRequestFullScreen) {
        await this.element.mozRequestFullScreen();
      } else if (this.element.webkitRequestFullscreen) {
        await this.element.webkitRequestFullscreen();
      } else if (this.element.msRequestFullscreen) {
        await this.element.msRequestFullscreen();
      }

      this.isFullscreen = true;
      this.element.classList.add('table-fullscreen');
      this.updateFullscreenButton();

      this.setupFullscreenListeners();
      this.emit('table:fullscreen:enter');
    } catch (error) {
      console.warn('Could not enter fullscreen:', error);
    }
  }

  async exitFullscreen() {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (document.mozCancelFullScreen) {
        await document.mozCancelFullScreen();
      } else if (document.webkitExitFullscreen) {
        await document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        await document.msExitFullscreen();
      }

      this.isFullscreen = false;
      this.element.classList.remove('table-fullscreen');
      this.updateFullscreenButton();

      this.emit('table:fullscreen:exit');
    } catch (error) {
      console.warn('Could not exit fullscreen:', error);
    }
  }

  updateFullscreenButton() {
    const button = this.element?.querySelector('.btn-fullscreen');
    const icon = button?.querySelector('i');

    if (button && icon) {
      if (this.isFullscreen) {
        icon.className = 'bi bi-fullscreen-exit';
        button.title = 'Exit Fullscreen';
      } else {
        icon.className = 'bi bi-fullscreen';
        button.title = 'Enter Fullscreen';
      }
    }
  }

  setupFullscreenListeners() {
    if (this._fullscreenHandler) return;

    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        document.mozFullScreenElement ||
        document.webkitFullscreenElement ||
        document.msFullscreenElement
      );

      if (!isCurrentlyFullscreen && this.isFullscreen) {
        this.isFullscreen = false;
        this.element.classList.remove('table-fullscreen');
        this.updateFullscreenButton();
        this.emit('table:fullscreen:exit');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    this._fullscreenHandler = handleFullscreenChange;
  }

  cleanupFullscreenListeners() {
    if (this._fullscreenHandler) {
      document.removeEventListener('fullscreenchange', this._fullscreenHandler);
      document.removeEventListener('mozfullscreenchange', this._fullscreenHandler);
      document.removeEventListener('webkitfullscreenchange', this._fullscreenHandler);
      document.removeEventListener('msfullscreenchange', this._fullscreenHandler);
      this._fullscreenHandler = null;
    }
  }

  /**
   * Override destroy to cleanup fullscreen listeners
   */
  destroy() {
    this.cleanupFullscreenListeners();
    super.destroy();
  }

  // ============================================================
  // Add / Export — backwards-compat event names
  //
  // The model lifecycle (Add dialog, Export download) lives on ListView
  // now. TableView keeps thin overrides solely to preserve the
  // historical `table:add` / `table:export` event names that
  // TablePage and other consumers listen for.
  // ============================================================

  async onActionAdd(event, element) {
    this.emit('table:add', { event });
    return super.onActionAdd(event, element);
  }

  async onActionExport(event, element) {
    const format = element.getAttribute('data-format') || 'json';
    this.emit('table:export', { format, source: this.exportSource, event });
    return super.onActionExport(event, element);
  }

  // ============================================================
  // Column-header sort (TableView-specific; ListView has its own
  // toolbar `sortOptions` dropdown via `onActionSortOption`)
  // ============================================================

  getSortBy() {
    const sort = this.collection?.params?.sort;
    if (!sort) return null;
    return sort.startsWith('-') ? sort.slice(1) : sort;
  }

  getSortDirection() {
    const sort = this.collection?.params?.sort;
    if (!sort) return 'asc';
    return sort.startsWith('-') ? 'desc' : 'asc';
  }

  getSortIcon(direction) {
    if (direction === 'asc') {
      return '<i class="bi bi-sort-alpha-down text-primary"></i>';
    } else if (direction === 'desc') {
      return '<i class="bi bi-sort-alpha-down-alt text-primary"></i>';
    }
    return '<i class="bi bi-three-dots-vertical text-muted"></i>';
  }

  async onActionSort(event, element) {
    event.preventDefault();
    const field = element.getAttribute('data-field');
    const direction = element.getAttribute('data-direction');

    if (this.collection) {
      let newSort;

      if (direction === 'none') {
        newSort = undefined;
      } else if (direction === 'desc') {
        newSort = `-${field}`;
      } else {
        newSort = field;
      }

      this.collection.setParams({
        ...this.collection.params,
        sort: newSort,
        start: 0
      });

      if (this.collection.restEnabled) {
        await this.collection.fetch();
      } else {
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

    this.updateSortIcons();
    this.emit('table:sort', { field, event });
    this.emit('params-changed');
  }

  updateSortIcons() {
    if (!this.element) return;

    const currentSortField = this.getSortBy();
    const currentSortDir = this.getSortDirection();

    this.columns.forEach((column) => {
      if (this.sortable && column.sortable !== false) {
        const { fieldKey } = this.parseColumnKey(column.key);

        const dropdown = this.element.querySelector(`[data-bs-toggle="dropdown"][data-column="${fieldKey}"]`);
        if (dropdown) {
          const isSorted = currentSortField === fieldKey;
          const sortIcon = this.getSortIcon(isSorted ? currentSortDir : null);
          dropdown.innerHTML = sortIcon;

          const dropdownMenu = dropdown.nextElementSibling;
          if (dropdownMenu) {
            const ascItem = dropdownMenu.querySelector(`[data-field="${fieldKey}"][data-direction="asc"]`);
            const descItem = dropdownMenu.querySelector(`[data-field="${fieldKey}"][data-direction="desc"]`);
            const noneItem = dropdownMenu.querySelector(`[data-field="${fieldKey}"][data-direction="none"]`);

            if (ascItem) ascItem.classList.toggle('active', isSorted && currentSortDir === 'asc');
            if (descItem) descItem.classList.toggle('active', isSorted && currentSortDir === 'desc');
            if (noneItem) noneItem.classList.toggle('active', !isSorted || currentSortField !== fieldKey);
          }
        }
      }
    });
  }

  // ============================================================
  // Batch actions / select-all
  // ============================================================

  async onActionSelectAll(event, _element) {
    event.stopPropagation();
    const isCurrentlyAllSelected = this.itemViews.size > 0 &&
      Array.from(this.itemViews.values()).every((item) => item.selected);

    if (!isCurrentlyAllSelected) {
      this.forEachItem((itemView) => {
        if (!itemView.selected) itemView.select();
      });
    } else {
      this.clearSelection();
    }

    const selectAllCell = this.element?.querySelector('.mojo-select-all-cell');
    if (selectAllCell) selectAllCell.classList.toggle('selected', !isCurrentlyAllSelected);

    this.updateBatchActionsPanel();
  }

  updateBatchActionsPanel() {
    if (!this.batchActions || this.batchActions.length === 0) return;

    const selectedCount = this.getSelectedItems().length;

    if (this.batchBarLocation === 'top') {
      const panel = this.element?.querySelector('.batch-actions-panel-top');
      const countEl = this.element?.querySelector('.batch-select-count');

      if (panel && countEl) {
        countEl.textContent = selectedCount;
        if (selectedCount > 0) {
          panel.classList.remove('d-none');
        } else {
          panel.classList.add('d-none');
        }
      }
    } else {
      const panel = this.element?.querySelector('.batch-actions-panel');
      const countEl = this.element?.querySelector('.batch-select-count');

      if (panel && countEl) {
        countEl.textContent = selectedCount;
        panel.style.display = selectedCount > 0 ? 'block' : 'none';
      }
    }

    const selectAllCell = this.element?.querySelector('.mojo-select-all-cell');
    if (selectAllCell) {
      const allSelected = this.itemViews.size > 0 &&
        Array.from(this.itemViews.values()).every((item) => item.selected);
      const someSelected = Array.from(this.itemViews.values()).some((item) => item.selected);

      selectAllCell.classList.toggle('selected', allSelected);
      selectAllCell.classList.toggle('indeterminate', !allSelected && someSelected);

      const icon = selectAllCell.querySelector('i');
      if (icon) icon.className = !allSelected && someSelected ? 'bi bi-dash' : 'bi bi-check';
    }
  }

  async onActionBatch(event, element) {
    const batchAction = element.getAttribute('data-action').replace('batch-', '');
    const selectedItems = this.getSelectedItems();

    this.emit('batch:action', {
      action: batchAction,
      items: selectedItems,
      event
    });
  }

  async onActionClearSelection(_event, _element) {
    this.clearSelection();
    this.updateBatchActionsPanel();
  }

  // ============================================================
  // Lookup / parse helpers (kept for any external consumers that
  // imported them from TableView's namespace)
  // ============================================================

  /**
   * Re-export for callers that called this on a TableView instance.
   * (ListView's getActiveFilters reads `this.collection.params` and is fully
   * equivalent — we re-resolve via super.)
   */
  getFilterDisplayValue(key, value) {
    if (key === 'search') return `"${value}"`;

    const filter = this.filters[key] ||
                  this.additionalFilters.find((f) => (f.name || f.key) === key);

    if (filter && filter.type === 'daterange' && typeof value === 'object') {
      const start = value.start || '';
      const end = value.end || '';
      return `${start} to ${end}`;
    }

    if (filter && filter.type === 'select' && filter.options) {
      if (typeof filter.options[0] === 'object') {
        const option = filter.options.find((opt) => opt.value === value);
        return option ? option.label : value;
      }
      return value;
    }

    return value;
  }
}

// Re-export parseFilterKey so any module that imported it from this file
// (legacy import path) continues to work.
export { parseFilterKey };

export default TableView;
