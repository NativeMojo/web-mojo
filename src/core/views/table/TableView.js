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
    // `rowContextMenu` is an accepted alias for `contextMenu` (the de-facto
    // key consumers use for per-row menus); explicit `contextMenu` wins.
    this.contextMenu = options.contextMenu || options.rowContextMenu || null;
    this.batchActions = options.batchActions || null;

    // -------- Expandable detail rows (opt-in via `rowExpand`) --------
    // `rowExpand: (model) => string | View` renders an inline full-width
    // detail row beneath its data row. A narrow chevron toggle cell becomes
    // the first column. State (which model ids are open) lives here so it
    // survives a pure re-render; `expandChildViews` tracks View-returning
    // payloads so they can be destroyed on collapse / rebuild.
    this.rowExpand = typeof options.rowExpand === 'function' ? options.rowExpand : null;
    this.rowExpandMultiple = options.rowExpandMultiple === true;
    this.expandedRows = new Set();       // model ids currently expanded
    this.expandChildViews = new Map();   // model id -> child View instance

    // -------- Column chooser (opt-in via `columnChooser`) — WM-035 --------
    // `columnChooser: true` adds an icon-only "Columns" toolbar dropdown whose
    // checkboxes show/hide columns. Visibility is VIEW STATE — `_hiddenColumns`
    // holds hidden column keys and the caller's `columns` config array is never
    // mutated. Columns marked `hideable: false` are locked (always shown). The
    // hidden set persists via the shared persistState mechanism iff that flag
    // is also on. See `docs/web-mojo/components/TableView.md` (Column chooser).
    this.columnChooser = options.columnChooser === true;
    this._hiddenColumns = new Set();     // column keys hidden from the table

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

    // Search configuration. `searchPlacement` is resolved by ListView's
    // constructor (`_normalizeSearchPlacement`) — do NOT re-assign it here or
    // TableView would bypass the fail-safe fallback and its warning.
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

  // ============================================================
  // Column chooser / visibility (WM-035)
  // ============================================================

  /**
   * Whether a column may be hidden via the chooser. Columns opt OUT with
   * `hideable: false` (e.g. an id or actions column) — everything else is
   * hideable by default.
   * @private
   */
  _isColumnHideable(column) {
    return column && column.hideable !== false;
  }

  /**
   * Whether a column is currently hidden. A locked (`hideable: false`) column
   * is never hidden regardless of any stale persisted key.
   * @private
   */
  _isColumnHidden(column) {
    if (!this.columnChooser) return false;
    if (!this._isColumnHideable(column)) return false;
    return this._hiddenColumns.has(column.key);
  }

  /**
   * The columns to actually render. Returns the caller's `columns` array
   * verbatim (same reference) when the chooser is off or nothing is hidden, so
   * the opt-out path is byte-identical. Never mutates `this.columns`.
   * @private
   */
  _getVisibleColumns() {
    if (!this.columnChooser || this._hiddenColumns.size === 0) return this.columns;
    return this.columns.filter((column) => !this._isColumnHidden(column));
  }

  /**
   * Hidden column keys for persistence (only genuinely-hideable ones). Read by
   * ListView's `_savePersistedState`.
   * @private
   */
  _getHiddenColumnKeys() {
    if (!this.columnChooser) return [];
    return this.columns
      .filter((column) => this._isColumnHideable(column) && this._hiddenColumns.has(column.key))
      .map((column) => column.key);
  }

  /**
   * Restore hidden columns from a persisted blob (called by ListView during
   * `_restorePersistedState`, before the first render). Rebuilds the baked
   * template + any already-built rows so the restored visibility takes effect.
   * @private
   */
  _restoreHiddenColumns(hidden) {
    if (!this.columnChooser || !Array.isArray(hidden) || hidden.length === 0) return;
    hidden.forEach((key) => {
      const column = this.columns.find((c) => c.key === key);
      if (column && this._isColumnHideable(column)) this._hiddenColumns.add(key);
    });
    if (this._hiddenColumns.size === 0) return;
    this.template = this.buildTableTemplate();
    this._templateCache = null;
    if (this.itemViews.size > 0) this._buildItems();
  }

  /**
   * ListView `clearPersistedState()` hook — reset visibility to defaults (all
   * columns shown) and repaint.
   * @private
   */
  _onClearPersistedState() {
    if (this._hiddenColumns.size === 0) return;
    this._hiddenColumns.clear();
    this._rebuildForColumnChange();
  }

  /**
   * Re-bake the table template (header/footer reflect the visible columns) and
   * rebuild the row views (TableRow re-generates its cells from the visible
   * column set), then re-render once. Returns the render promise so callers can
   * await a settled DOM. Used after any visibility change.
   * @private
   */
  _rebuildForColumnChange() {
    this.template = this.buildTableTemplate();
    this._templateCache = null;    // template is cached (cacheTemplate); invalidate it

    // Rebuild the row views against the new visible-column set. Mirrors
    // `_buildItems` minus its own fire-and-forget render so we drive a single
    // awaitable render below.
    this._clearItems();
    if (this.collection && !this.collection.isEmpty()) {
      this.isEmpty = false;
      this.collection.forEach((model, index) => this._createItemView(model, index));
      this._applyPersistedSelections();
      this._buildGroupHeaders();
    } else {
      this.isEmpty = true;
    }

    // Always re-render: in production the view is mounted (re-renders in
    // place); render() also repopulates innerHTML for a not-yet-connected view.
    return this.render();
  }

  /**
   * Toggle a data-action="toggle-column" checkbox. Ignores locked columns.
   * Persists the new hidden set when persistState is on.
   */
  async onActionToggleColumn(_event, element) {
    const key = element.getAttribute('data-column-key');
    const column = this.columns.find((c) => c.key === key);
    if (!column || !this._isColumnHideable(column)) return;

    if (this._hiddenColumns.has(key)) {
      this._hiddenColumns.delete(key);
    } else {
      this._hiddenColumns.add(key);
    }

    await this._rebuildForColumnChange();
    if (this.persistState) this._savePersistedState();
    this.emit('columns:change', { hidden: this._getHiddenColumnKeys() });
  }

  /**
   * "Reset to defaults" chooser entry — show every column again AND clear the
   * saved view (both column + view state share one storage entry).
   */
  async onActionColumnChooserReset(event, _element) {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    const hadHidden = this._hiddenColumns.size > 0;
    this._hiddenColumns.clear();
    // clearPersistedState() runs the _onClearPersistedState hook, but that only
    // rebuilds when something was hidden; when nothing was hidden we still want
    // the storage entry gone (sort/filter view state) without a needless render.
    this._clearPersistedStorage();
    if (hadHidden) await this._rebuildForColumnChange();
    this.emit('columns:reset');
  }

  /**
   * The icon-only "Columns" toolbar dropdown. Locked (`hideable: false`)
   * columns render as disabled, lock-marked rows; hideable columns are
   * whole-row-clickable checkboxes. The persistence footer only shows when
   * persistState is on. Returns '' when the chooser is off.
   * @private
   */
  _buildColumnChooserTemplate() {
    if (!this.columnChooser) return '';

    const items = this.columns.map((column) => {
      const label = this.escapeHtml(column.label || column.title || column.key);
      if (!this._isColumnHideable(column)) {
        return `
          <label class="column-chooser-item is-locked" title="Always shown">
            <input class="form-check-input" type="checkbox" checked disabled>
            <span class="form-check-label">${label}</span>
            <i class="bi bi-lock-fill column-chooser-lock" aria-hidden="true"></i>
          </label>`;
      }
      const checked = this._isColumnHidden(column) ? '' : 'checked';
      return `
        <label class="column-chooser-item">
          <input class="form-check-input" type="checkbox" ${checked}
                 data-action="toggle-column" data-column-key="${this.escapeHtml(column.key)}">
          <span class="form-check-label">${label}</span>
        </label>`;
    }).join('');

    const persistHint = this.persistState
      ? '<div class="column-chooser-persist"><i class="bi bi-check2-circle"></i>Saved for this table</div>'
      : '';

    return `
      <div class="dropdown">
        <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button"
                data-bs-toggle="dropdown" aria-expanded="false" title="Choose columns">
          <i class="bi bi-layout-three-columns"></i><span class="d-none d-xxl-inline ms-1">Columns</span>
        </button>
        <div class="dropdown-menu dropdown-menu-end column-chooser-menu" role="menu">
          <h6 class="dropdown-header">Show columns</h6>
          ${items}
          <li><hr class="dropdown-divider"></li>
          <a class="dropdown-item d-flex align-items-center" href="#" data-action="column-chooser-reset">
            <i class="bi bi-arrow-counterclockwise me-2"></i>Reset to defaults
          </a>
          ${persistHint}
        </div>
      </div>
    `;
  }

  /**
   * Scoped styles for the column-chooser dropdown. Token-first per
   * `.claude/rules/theming.md`; the one black-at-4% hover carries its
   * rgba(255,255,255) dark companion. Emitted once, only when the chooser is
   * enabled (opt-out path carries zero CSS).
   * @private
   */
  _buildColumnChooserStyles() {
    return `
      <style>
        .column-chooser-menu { min-width: 268px; }
        .column-chooser-menu .dropdown-header {
          color: var(--bs-secondary-color);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-size: 0.7rem;
          font-weight: 600;
        }
        .column-chooser-item {
          display: flex; align-items: center; gap: 0.5rem;
          margin: 0; padding: 0.35rem 1rem; cursor: pointer;
        }
        .column-chooser-item .form-check-input { margin-top: 0; flex: 0 0 auto; }
        .column-chooser-item .form-check-label { cursor: pointer; flex: 1 1 auto; color: var(--bs-body-color); }
        .column-chooser-item:hover { background: rgba(0, 0, 0, 0.04); }
        .column-chooser-item.is-locked { cursor: default; opacity: 0.72; }
        .column-chooser-item.is-locked:hover { background: transparent; }
        .column-chooser-item.is-locked .form-check-label { color: var(--bs-secondary-color); }
        .column-chooser-lock { color: var(--bs-secondary-color); font-size: 0.8rem; }
        .column-chooser-persist {
          padding: 0.4rem 1rem 0.15rem;
          color: var(--bs-secondary-color);
          font-size: 0.72rem;
          display: flex; align-items: center; gap: 0.35rem;
        }

        [data-bs-theme="dark"] .column-chooser-item:hover { background: var(--bs-secondary-bg); }
      </style>
    `;
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
   * Whether expandable detail rows are enabled (a `rowExpand` callback was
   * provided). Read by TableRow to decide whether to render the chevron cell.
   */
  isRowExpandEnabled() {
    return typeof this.rowExpand === 'function';
  }

  /**
   * Colspan for the full-width detail row: chevron col (+1 when enabled) +
   * selection col + data cols + actions col. Mirrors the group-header colspan
   * math (see `_groupHeaderViewOptions`).
   */
  _getRowExpandColspan() {
    const dataCols = this._getVisibleColumns().length || 0;
    const selectCol = this.isSelectable() ? 1 : 0;
    const actionsCol = (this.actions || this.contextMenu) ? 1 : 0;
    const expandCol = this.isRowExpandEnabled() ? 1 : 0;
    return Math.max(1, expandCol + selectCol + dataCols + actionsCol);
  }

  /**
   * Toggle the inline detail row for `model`. Called by TableRow's chevron
   * handler. Single-open by default (`rowExpandMultiple: true` allows several).
   */
  async toggleRowExpand(model, rowView) {
    if (!this.isRowExpandEnabled() || !model) return;
    const id = model.id;
    const isOpen = this.expandedRows.has(id);

    if (isOpen) {
      this._collapseRow(id);
    } else {
      if (!this.rowExpandMultiple) {
        Array.from(this.expandedRows).forEach((otherId) => this._collapseRow(otherId));
      }
      this.expandedRows.add(id);
      const rv = rowView || this.itemViews.get(id);
      if (rv && rv.element) {
        rv.element.classList.add('expanded');
        const toggle = rv.element.querySelector('.mojo-expand-toggle');
        if (toggle) toggle.setAttribute('aria-expanded', 'true');
      }
      await this._renderExpandedRow(id);
    }

    this.emit('row:expand:toggle', { model, expanded: this.expandedRows.has(id) });
  }

  /**
   * Collapse a single expanded row: drop it from state, remove its detail
   * `<tr>` from the DOM, destroy any View payload, and reset the chevron.
   * @private
   */
  _collapseRow(id) {
    this.expandedRows.delete(id);

    const detail = this.element?.querySelector(`tr.mojo-detail-row[data-detail-for="${id}"]`);
    if (detail) detail.remove();

    const child = this.expandChildViews.get(id);
    if (child) {
      this.removeChild(child);
      this.expandChildViews.delete(id);
    }

    const rv = this.itemViews.get(id);
    if (rv && rv.element) {
      rv.element.classList.remove('expanded');
      const toggle = rv.element.querySelector('.mojo-expand-toggle');
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
    }
  }

  /**
   * Build and insert the detail `<tr>` for an expanded model directly after
   * its data row. String payloads template into the panel; View payloads are
   * mounted via `addChild()` + an explicit `render()` (the Dynamic Children
   * pattern for children added after the parent has already rendered).
   * @private
   */
  async _renderExpandedRow(id) {
    const rowView = this.itemViews.get(id);
    if (!rowView || !rowView.element || !rowView.element.parentNode) return;

    // Never leave a stale detail row behind.
    const existing = this.element?.querySelector(`tr.mojo-detail-row[data-detail-for="${id}"]`);
    if (existing) existing.remove();

    const model = rowView.model;
    let content;
    try {
      content = this.rowExpand(model);
    } catch (error) {
      console.error('TableView rowExpand() threw for model', id, error);
      return;
    }

    const colspan = this._getRowExpandColspan();
    const detailRow = document.createElement('tr');
    detailRow.className = 'mojo-detail-row';
    detailRow.setAttribute('data-detail-for', id);

    const isView = content && typeof content === 'object' && typeof content.render === 'function';

    if (isView) {
      const containerId = `row-expand-${id}`;
      detailRow.innerHTML =
        `<td colspan="${colspan}"><div class="mojo-detail-panel">` +
        `<div data-container="${containerId}"></div></div></td>`;
      rowView.element.after(detailRow);

      this.addChild(content, { containerId });
      this.expandChildViews.set(id, content);
      await content.render();
    } else {
      const html = content == null ? '' : String(content);
      detailRow.innerHTML =
        `<td colspan="${colspan}"><div class="mojo-detail-panel">${html}</div></td>`;
      rowView.element.after(detailRow);
    }
  }

  /**
   * Re-materialize every expanded detail row after a full re-render (which
   * wipes `innerHTML`, detaching detail rows and any View payload elements).
   * Rows whose model is no longer present — e.g. after a page change — are
   * collapsed, satisfying "page change collapses all".
   * @private
   */
  async _renderExpandedRows() {
    if (!this.isRowExpandEnabled()) return;

    // Drop expanded ids whose row is gone (page change / filter refetch).
    Array.from(this.expandedRows).forEach((id) => {
      if (!this.itemViews.has(id)) this._collapseRow(id);
    });

    if (this.expandedRows.size === 0) return;

    // Tear down stale View payloads whose elements were detached by the
    // parent's innerHTML wipe, then rebuild each surviving detail row fresh.
    this.expandChildViews.forEach((child) => this.removeChild(child));
    this.expandChildViews.clear();

    // Each detail row targets an independent data row, so rebuild in parallel.
    await Promise.all(Array.from(this.expandedRows, (id) => this._renderExpandedRow(id)));
  }

  /**
   * Scoped inline styles for the chevron cell + detail panel. Emitted only
   * when `rowExpand` is enabled so the opt-out path has zero markup/CSS delta.
   * Light defaults first; the literal-tint dark companions are clustered at
   * the bottom (per .claude/rules/theming.md).
   * @private
   */
  _buildRowExpandStyles() {
    return `
      <style>
        .table-view-component .col-expand { width: 2.4rem; padding: 0 !important; }
        .table-view-component .mojo-expand-toggle {
          display: flex; align-items: center; justify-content: center;
          width: 100%; height: 100%; padding: 0.4rem 0;
          cursor: pointer; color: var(--bs-secondary-color);
          background: transparent; border: 0;
        }
        .table-view-component .mojo-expand-toggle:hover { color: var(--bs-emphasis-color); }
        .table-view-component .mojo-expand-toggle .bi {
          transition: transform 0.18s ease; font-size: 0.95rem; line-height: 1;
        }
        .table-view-component .table-row.expanded .mojo-expand-toggle .bi { transform: rotate(90deg); }
        .table-view-component .table-row.expanded .mojo-expand-toggle { color: var(--bs-primary); }

        .table-view-component tr.mojo-detail-row > td {
          padding: 0 !important;
          border-bottom: 1px solid var(--bs-border-color) !important;
          background: rgba(0, 0, 0, 0.02);
        }
        .table-view-component .mojo-detail-panel {
          margin: 0.6rem 0.85rem 0.9rem 3rem;
          background: var(--bs-tertiary-bg);
          border: 1px solid var(--bs-border-color);
          border-left: 3px solid var(--bs-primary);
          border-radius: 0.5rem;
          padding: 0.95rem 1.1rem;
        }

        [data-bs-theme="dark"] .table-view-component tr.mojo-detail-row > td {
          background: rgba(255, 255, 255, 0.015);
        }
      </style>
    `;
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
        ${this.isRowExpandEnabled() ? this._buildRowExpandStyles() : ''}
        ${this.columnChooser ? this._buildColumnChooserStyles() : ''}
        ${this._hasFeedbackFeature() ? this._buildFeedbackStyles() : ''}
        ${this._rowFlashEnabled() ? this._buildRowFlashStyles() : ''}
        ${this.buildToolbarTemplate()}
        ${batchPanelTop}
        <div class="table-container"${fontSize}>
          {{#loading}}
            ${this._loadingContent(`<div class="mojo-table-loading d-flex justify-content-center align-items-center py-5">
              <div class="spinner-border" role="status">
                <span class="visually-hidden">Loading...</span>
              </div>
            </div>`)}
          {{/loading}}
          {{^loading}}
            {{#isEmpty}}
              ${this._emptyContent(`<div class="table-empty text-center py-5">
                <i class="bi bi-inbox fa-2x mb-2 text-muted"></i>
                <p class="text-muted">{{emptyMessage}}</p>
              </div>`)}
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
   * TableView skeleton (WM-033) — a full `<table>` whose header matches the
   * real column layout and whose body is N shimmer rows (N from
   * `_skeletonRowCount()`). Cell widths echo the real columns via cycled
   * `skeleton-line w-*` classes; leading (expand / selection) and trailing
   * (actions) cells mirror the row structure so the silhouette lines up.
   * Overrides the ListView card-silhouette version.
   * @private
   */
  _buildSkeletonHtml() {
    const rowCount = this._skeletonRowCount();
    const widths = ['w-90', 'w-75', 'w-60', 'w-40', 'w-25'];

    const lead =
      (this.isRowExpandEnabled() ? '<td class="col-expand"></td>' : '') +
      (this.isSelectable() ? '<td></td>' : '');
    const trail = (this.actions || this.contextMenu)
      ? '<td class="text-end"><span class="skeleton-line w-40 ms-auto"></span></td>'
      : '';

    const cells = this._getVisibleColumns().map((column, i) => {
      const alignClass = this.getAlignClass(column.align);
      const w = widths[i % widths.length];
      return `<td class="${alignClass}"><span class="skeleton-line ${w}"></span></td>`;
    }).join('');

    let body = '';
    for (let i = 0; i < rowCount; i++) {
      body += `<tr class="mojo-skeleton-row" aria-hidden="true">${lead}${cells}${trail}</tr>`;
    }

    return `<table class="${this.buildTableClasses()}">${this.buildTableHeaderTemplate()}<tbody>${body}</tbody></table>`;
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

    // Column chooser dropdown — icon-only, sits alongside Sort / Add Filter.
    if (this.columnChooser) {
      baseButtons += this._buildColumnChooserTemplate();
    }

    return baseButtons;
  }

  /**
   * Build table header template
   */
  buildTableHeaderTemplate() {
    let headerCells = '';

    // Expand chevron header (empty, narrow) — first column when enabled.
    if (this.isRowExpandEnabled()) {
      headerCells += '<th class="col-expand mojo-expand-cell"></th>';
    }

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
    this._getVisibleColumns().forEach((column) => {
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

    if (this.isRowExpandEnabled()) {
      footerCells += '<td></td>';
    }

    if (this.isSelectable()) {
      footerCells += '<td></td>';
    }

    // Iterate visible columns so the footer column count matches the header;
    // total cells stay keyed by the column's absolute index in
    // `footerTotalColumns` so the `col_N` keys line up with
    // calculateFooterTotals / updateFooterTotals regardless of visibility.
    this._getVisibleColumns().forEach((column, index) => {
      const responsiveClasses = this.getResponsiveClasses(column.visibility);
      const alignClass = this.getAlignClass(column.align);

      if (column.footer_total) {
        const safeKey = `col_${this.footerTotalColumns.indexOf(column)}`;
        const formatter = this.parseColumnKey(column.key).formatter || column.formatter;
        let cellContent;
        if (formatter && typeof formatter === 'string') {
          cellContent = `{{{footerTotals.${safeKey}.value|${formatter}}}}`;
        } else {
          cellContent = `{{footerTotals.${safeKey}.value}}`;
        }

        footerCells += `<td class="table-footer-total ${responsiveClasses} ${alignClass}" data-total-column="${safeKey}">${cellContent}</td>`;
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
      columns: this._getVisibleColumns(),
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
    itemView.on('cell:save:error', this._onCellSaveError.bind(this));
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
    await this._renderExpandedRows();
  }

  // -------- Cell-editing events (table-only) --------
  // Each re-emits the row's payload verbatim so consumers can listen once on
  // the table instead of wiring every TableRow. `cell:save:error` fires when
  // `model.save()` rejects; the row stays in edit mode.
  _onCellEdit(event) { this.emit('cell:edit', event); }
  async _onCellSave(event) { this.emit('cell:save', event); }
  _onCellSaveError(event) { this.emit('cell:save:error', event); }
  _onCellCancel(event) { this.emit('cell:cancel', event); }

  /**
   * WM-034 — extend ListView's auto-refresh pause predicate with the two
   * table-only cases: an in-progress inline cell edit (any TableRow with a
   * non-empty `editingCells` set) or an open row context menu / dropdown
   * (cheap `.dropdown-menu.show` DOM check). A silent refetch mid-edit would
   * discard the editor; mid-menu it would close the menu under the user.
   * @protected
   */
  _autoRefreshShouldSkip() {
    if (super._autoRefreshShouldSkip()) return true;
    for (const row of this.itemViews.values()) {
      if (row && row.editingCells && row.editingCells.size > 0) return true;
    }
    if (this.element && this.element.querySelector('.dropdown-menu.show')) return true;
    return false;
  }

  // ============================================================
  // Grouped rows (TableView-aware overrides)
  //
  // ListView's grouping primitive emits a `<div class="list-group-header">`
  // by default. That shape is invalid inside a `<tbody>` (browsers will
  // hoist the `<div>` out of the table). TableView overrides the outer
  // element to a `<tr class="list-group-header-row">` and the inner
  // template to a `<th colspan="N">…</th>` cell so the header sits in
  // the table grid and spans the full row.
  // ============================================================

  /**
   * Default group-header inner template for TableView. Wrapped by the
   * `<tr>` outer element from `_groupHeaderViewOptions` below.
   * @protected
   */
  _defaultGroupHeaderTemplate() {
    return '<th colspan="{{colspan}}" class="list-group-header-cell">{{key}}</th>';
  }

  /**
   * Inject TableView-specific constructor options on the header view.
   * `tagName: 'tr'` makes the outer element legal inside `<tbody>`;
   * `colspan` covers the selection checkbox col + data cols + actions col.
   * @protected
   */
  _groupHeaderViewOptions(_model, _key, _index) {
    const dataCols = this._getVisibleColumns().length || 0;
    const selectCol = this.isSelectable() ? 1 : 0;
    const actionsCol = (this.actions || this.contextMenu) ? 1 : 0;
    const expandCol = this.isRowExpandEnabled() ? 1 : 0;
    return {
      tagName: 'tr',
      className: `list-group-header-row list-group-header-row--${this.groupHeaderStyle}`,
      colspan: Math.max(1, expandCol + dataCols + selectCol + actionsCol)
    };
  }

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
