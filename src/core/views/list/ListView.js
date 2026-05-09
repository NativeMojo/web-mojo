/**
 * ListView - Visual list component for Collections
 *
 * Manages a collection of ListViewItem views, each with its own model.
 * When a model changes, only its corresponding ListViewItem re-renders.
 *
 * As of the toolbar / filters / pagination upgrade, ListView also hosts an
 * optional toolbar (search, filter dropdown + active pills, refresh,
 * custom buttons, title/eyebrow, right-slot view), an optional sort
 * dropdown, and optional pagination — either numbered pages
 * (`paginationMode: 'pages'`) or "Show more" load-more
 * (`paginationMode: 'more'`). All toolbar features are opt-in; a plain
 * ListView with just `collection` + `itemTemplate` renders exactly as
 * before. TableView extends ListView and inherits the same toolbar /
 * filter / pagination machinery.
 *
 * Events:
 *   - 'item:click' - Emitted when any item is clicked
 *   - 'item:select' - Emitted when an item is selected
 *   - 'item:deselect' - Emitted when an item is deselected
 *   - 'selection:change' - Emitted when selection changes
 *   - 'list:empty' - Emitted when list becomes empty
 *   - 'list:loaded' - Emitted when list is populated
 *   - 'list:search' - Emitted when toolbar search applied
 *   - 'list:sort' - Emitted when toolbar sort changed
 *   - 'list:page' - Emitted when pagination page changed
 *   - 'list:pagesize' - Emitted when pagination page size changed
 *   - 'list:show-more' - Emitted when "Show more" button clicked
 *   - 'filter:edit' - Emitted when a filter pill is clicked to edit
 *   - 'filter:remove' - Emitted when a filter pill is removed
 *   - 'filters:clear' - Emitted when "Clear All" is clicked
 *   - 'params-changed' - Emitted whenever sort/page/filter/search changes
 *
 * @example
 * // Plain list, unchanged from prior behavior.
 * const listView = new ListView({
 *   collection: userCollection,
 *   itemTemplate: '<div class="user-item">{{name}} - {{email}}</div>',
 *   selectionMode: 'single'
 * });
 *
 * @example
 * // Visual list with search, a filter, and "Show more" paging.
 * const listView = new ListView({
 *   collection: new ArticleCollection(),
 *   itemTemplate: '<div class="card">{{title}} — {{author}}</div>',
 *   searchable: true,
 *   filterable: true,
 *   filters: [{ name: 'topic', label: 'Topic', type: 'select', options: ['ops', 'patterns'] }],
 *   paginated: true,
 *   paginationMode: 'more'
 * });
 */

import View from '@core/View.js';
import Collection from '@core/Collection.js';
import Modal from '@core/views/feedback/Modal.js';
import { parseFilterKey, formatFilterDisplay } from '@core/utils/DjangoLookups.js';
import ListViewItem from './ListViewItem.js';

class ListView extends View {
  constructor(options = {}) {
    super({
      className: options.className || 'list-view',
      ...options
    });

    // -------- Core list properties (unchanged) --------
    this.collection = null;
    this.itemViews = new Map(); // Map of model.id -> ListViewItem
    this.selectedItems = new Set(); // Set of selected item IDs

    this.itemTemplate = options.itemTemplate || null;
    this.itemClass = options.itemClass || ListViewItem;
    this.selectionMode = options.selectionMode || 'none';
    this.emptyMessage = options.emptyMessage || 'No items to display';
    this.loading = false;
    this.isEmpty = true;

    // -------- Toolbar / filters / pagination — all opt-in --------
    this.searchable = options.searchable === true;
    this.filterable = options.filterable === true;
    this.paginated = options.paginated === true;

    // 'pages' = numbered pagination; 'more' = load-more button; 'none' = off.
    // When `paginated: true` is set without an explicit mode, default to 'more'
    // (the convention for visual lists). Subclasses (TableView) override this.
    let mode = options.paginationMode;
    if (!mode) {
      mode = this.paginated ? 'more' : 'none';
    }
    this.paginationMode = mode;

    // Search
    this.searchPlacement = options.searchPlacement || 'toolbar'; // 'toolbar' | 'dropdown'
    this.searchPlaceholder = options.searchPlaceholder || 'Search...';

    // Sort dropdown — list-style alternative to TableView's column-header sort.
    // Each option: { key: 'created', label: 'Newest', dir: 'desc' }
    this.sortOptions = Array.isArray(options.sortOptions) ? options.sortOptions : [];

    // Filter configuration
    this.filters = {}; // populated from columns by TableView; empty for plain ListView
    this.additionalFilters = options.filters || [];
    this.hideActivePills = options.hideActivePills === true;
    this.hideActivePillNames = options.hideActivePillNames || [];

    // Toolbar chrome
    this.title = options.title || null;
    this.eyebrow = options.eyebrow || null;
    this.showRefresh = options.showRefresh !== false;
    this.toolbarButtons = options.toolbarButtons || [];
    this.toolbarRight = options.toolbarRight || null;
    this._toolbarRightMounted = false;

    // Selection persistence across rebuilds (page change / fetchMore append).
    // Default: persist when in 'more' mode (rows aren't torn down anyway, and
    // users expect their selection to stay), clear when in 'pages' mode
    // (preserves existing TableView behavior unless caller opts in).
    this.persistSelection = options.persistSelection === undefined
      ? this.paginationMode === 'more'
      : options.persistSelection === true;

    // "Show more" state
    this.loadingMore = false;

    // Build the template if any toolbar / pagination feature is enabled.
    // Plain ListView (no flags) keeps the lean default template untouched.
    if (this._isToolbarEnabled() || this.paginationMode !== 'none') {
      this.template = this.buildListTemplate();
    } else if (!this.template) {
      this.template = this._defaultBareTemplate();
    }
  }

  // ============================================================
  // Lifecycle
  // ============================================================

  async onInit() {
    this._initCollection(this.options.collection || this.options.Collection);
  }

  async onAfterMount() {
    await super.onAfterMount();
    if (this.collection && (this.options.fetchOnMount || !this.collection.lastFetchTime)) {
      this.collection.fetch();
    }
  }

  async onBeforeRender() {
    // Surface the live search value into the template context so the input
    // re-renders with the current value after a fetch.
    this.searchValue = this.getActiveFilters().search || '';
    // Show-more visibility derives from collection state at render time.
    this.hasMore = this._computeHasMore();
  }

  async onAfterRender() {
    await super.onAfterRender();

    // Mount the optional right-side toolbar slot (e.g. range picker).
    if (this.toolbarRight && !this._toolbarRightMounted) {
      this.toolbarRight.containerId = 'toolbar-right';
      this.addChild(this.toolbarRight);
      await this.toolbarRight.render();
      this._toolbarRightMounted = true;
    }
    // A render() may have replaced the toolbar markup — reset the flag if
    // the previous slot element is gone, so the next render re-mounts.
    if (this._toolbarRightMounted && this.toolbarRight && !this.element?.contains(this.toolbarRight.element)) {
      this._toolbarRightMounted = false;
    }

    // Numbered pagination: update status text + re-render the page list.
    if (this.paginated && this.paginationMode === 'pages' && this.collection) {
      const total = this.collection.meta?.count || this.collection.length();
      const start = this.collection.params?.start || 0;
      const size = this.collection.params?.size || 10;
      const end = Math.min(start + size, total);

      const startEl = this.element.querySelector('[data-value="start"]');
      const endEl = this.element.querySelector('[data-value="end"]');
      const totalEl = this.element.querySelector('[data-value="total"]');
      if (startEl) startEl.textContent = total === 0 ? 0 : start + 1;
      if (endEl) endEl.textContent = end;
      if (totalEl) totalEl.textContent = total;

      const pageSizeSelect = this.element.querySelector('[data-change-action="page-size"]');
      if (pageSizeSelect) pageSizeSelect.value = size;

      this.renderPagination();
    }

    // Filter pills + native search-clear listener wiring.
    if (this._isToolbarEnabled()) {
      this.updateFilterPills();
      this.setupSearchClearListener();
    }
  }

  // ============================================================
  // Templates
  // ============================================================

  /**
   * Bare "loading | empty | items" template used when no toolbar / pagination
   * features are enabled. Matches the historical ListView layout exactly so
   * the simple-case API is unchanged.
   * @private
   */
  _defaultBareTemplate() {
    return `
      <div class="list-view-container">
        {{#loading}}
          <div class="list-loading">
            <div class="spinner-border spinner-border-sm" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
            Loading...
          </div>
        {{/loading}}
        {{^loading}}
          {{#isEmpty}}
            <div class="list-empty">
              {{emptyMessage}}
            </div>
          {{/isEmpty}}
          {{^isEmpty}}
            <div class="list-items" data-container="items"></div>
          {{/isEmpty}}
        {{/loading}}
      </div>
    `;
  }

  /**
   * Toolbar / pagination template wrapper. Composes:
   *   [ toolbar? ]
   *   [ list body (loading | empty | items) ]
   *   [ show-more? ]
   *   [ pagination? ]
   *
   * Subclasses (TableView) override this to wrap the body in `<table>` markup.
   */
  buildListTemplate() {
    const toolbar = this.buildToolbarTemplate();
    const showMore = this.paginationMode === 'more' ? this.buildShowMoreTemplate() : '';
    const pagination = this.paginationMode === 'pages' ? this.buildPaginationTemplate() : '';

    return `
      <div class="list-view-wrapper">
        ${toolbar}
        <div class="list-view-container">
          {{#loading}}
            <div class="list-loading text-center py-4">
              <div class="spinner-border spinner-border-sm" role="status">
                <span class="visually-hidden">Loading...</span>
              </div>
              Loading...
            </div>
          {{/loading}}
          {{^loading}}
            {{#isEmpty}}
              <div class="list-empty text-center py-4 text-muted">
                {{emptyMessage}}
              </div>
            {{/isEmpty}}
            {{^isEmpty}}
              <div class="list-items" data-container="items"></div>
            {{/isEmpty}}
          {{/loading}}
        </div>
        ${showMore}
        ${pagination}
      </div>
    `;
  }

  /**
   * @returns {boolean} true when any toolbar feature is enabled.
   * @private
   */
  _isToolbarEnabled() {
    return !!(
      this.title ||
      this.eyebrow ||
      this.searchable ||
      (this.filterable && this._hasAnyFilters()) ||
      (this.sortOptions && this.sortOptions.length > 0) ||
      this.toolbarRight ||
      (this.toolbarButtons && this.toolbarButtons.length > 0) ||
      this.options.showAdd ||
      this.options.showExport
    );
  }

  _hasAnyFilters() {
    return (
      (this.filters && Object.keys(this.filters).length > 0) ||
      (this.additionalFilters && this.additionalFilters.length > 0)
    );
  }

  /**
   * Render the toolbar shell. Subclasses can override `buildActionButtonsTemplate`
   * to add Add/Export buttons (TableView does this).
   */
  buildToolbarTemplate() {
    if (!this._isToolbarEnabled()) return '';

    const titleBlock = this._buildTitleBlockTemplate();
    const rightSlot = this.toolbarRight ? `<div data-container="toolbar-right"></div>` : '';
    const sortDropdown = (this.sortOptions && this.sortOptions.length > 0) ? this.buildSortDropdownTemplate() : '';

    const rightGroup = `
      <div class="d-flex align-items-center gap-2 flex-wrap ${titleBlock ? 'ms-auto' : ''}">
        ${this.buildActionButtonsTemplate()}
        ${sortDropdown}
        ${this.filterable ? this.buildFilterDropdownTemplate() : ''}
        ${this.searchable && this.searchPlacement === 'toolbar' ? this.buildSearchTemplate() : ''}
        ${rightSlot}
      </div>
    `;

    return `
      <div class="table-action-buttons mb-3">
        <div class="d-flex align-items-center gap-3 flex-wrap">
          ${titleBlock}
          ${rightGroup}
        </div>
        <div data-container="filter-pills"></div>
      </div>
    `;
  }

  _buildTitleBlockTemplate() {
    if (!this.title && !this.eyebrow) return '';
    const eyebrow = this.eyebrow
      ? `<div class="text-body-secondary text-uppercase small fw-semibold rs-table-eyebrow" style="letter-spacing: 0.05em; line-height: 1.2;">${this.escapeHtml(this.eyebrow)}</div>`
      : '';
    const title = this.title
      ? `<h5 class="mb-0 rs-table-title">${this.escapeHtml(this.title)}</h5>`
      : '';
    return `<div class="rs-table-title-block">${eyebrow}${title}</div>`;
  }

  /**
   * Default action buttons: refresh + custom toolbarButtons.
   * Subclasses (TableView) override to inject Add/Export.
   */
  buildActionButtonsTemplate() {
    const buttons = [];

    if (this.showRefresh) {
      buttons.push(`
        <button class="btn btn-sm btn-outline-secondary btn-refresh"
                data-action="refresh"
                title="Refresh">
          <i class="bi bi-arrow-clockwise"></i>
        </button>
      `);
    }

    if (this.toolbarButtons && this.toolbarButtons.length > 0) {
      this.toolbarButtons.forEach((button, index) => {
        const {
          label = 'Button',
          icon = '',
          action = '',
          handler = null,
          variant = 'outline-secondary',
          title = label,
          className = '',
          permissions = null
        } = button;

        if (permissions && !this.checkPermissions(permissions)) return;

        const iconHtml = icon ? `<i class="${icon} me-1"></i>` : '';
        const labelHtml = `<span class="d-none d-lg-inline">${label}</span>`;

        let dataAttrs = '';
        if (handler) {
          dataAttrs = `data-action="custom-toolbar-button" data-button-index="${index}"`;
        } else if (action) {
          dataAttrs = `data-action="${action}"`;
        }

        const btnClass = `btn btn-sm btn-${variant} ${className}`.trim();

        buttons.push(`
          <button class="${btnClass}" ${dataAttrs} title="${title}">
            ${iconHtml}${labelHtml}
          </button>
        `);
      });
    }

    return buttons.join('');
  }

  buildSearchTemplate() {
    return `
      <div class="flex-grow-1" style="max-width: 400px;">
        <div class="input-group input-group-sm">
          <span class="input-group-text">
            <i class="bi bi-search"></i>
          </span>
          <input type="search"
                 class="form-control"
                 placeholder="${this.escapeHtml(this.searchPlaceholder)}"
                 data-filter="search"
                 data-change-action="apply-search"
                 value="{{searchValue}}"
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

  buildSortDropdownTemplate() {
    const currentSort = this.collection?.params?.sort || '';
    const items = this.sortOptions.map(opt => {
      const dir = opt.dir === 'desc' ? '-' : '';
      const value = `${dir}${opt.key}`;
      const isActive = currentSort === value;
      return `
        <li><a class="dropdown-item ${isActive ? 'active' : ''}" href="#"
               data-action="sort-option" data-sort="${this.escapeHtml(value)}">
          ${this.escapeHtml(opt.label || opt.key)}
        </a></li>
      `;
    }).join('');

    const clearItem = currentSort ? `
      <li><hr class="dropdown-divider"></li>
      <li><a class="dropdown-item" href="#" data-action="sort-option" data-sort="">
        <i class="bi bi-x-circle me-1"></i>Clear sort
      </a></li>
    ` : '';

    return `
      <div class="dropdown">
        <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button"
                data-bs-toggle="dropdown" aria-expanded="false">
          <i class="bi bi-sort-down me-1"></i>
          <span class="d-none d-lg-inline">Sort</span>
        </button>
        <ul class="dropdown-menu dropdown-menu-end">
          ${items}
          ${clearItem}
        </ul>
      </div>
    `;
  }

  buildFilterDropdownTemplate() {
    if (!this._hasAnyFilters()) return '';
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

  buildFilterList() {
    const allFilters = this.getAllAvailableFilters();
    const activeFilters = this.getActiveFilters();

    if (allFilters.length === 0) {
      return '<div class="dropdown-item-text text-muted">No filters available</div>';
    }

    const filterItems = allFilters.map(filter => {
      const isActive = Object.prototype.hasOwnProperty.call(activeFilters, filter.key);
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

  buildActivePills() {
    if (this.hideActivePills) return '';

    const activeFilters = this.getActiveFilters();
    const hasSearch = activeFilters.search && activeFilters.search.toString().trim() !== '';
    let filterEntries = Object.entries(activeFilters).filter(([key, value]) =>
      value && value.toString().trim() !== '' && key !== 'search'
    );

    if (this.hideActivePillNames && this.hideActivePillNames.length > 0) {
      filterEntries = filterEntries.filter(([key]) => !this.hideActivePillNames.includes(key));
    }

    if (filterEntries.length === 0 && !hasSearch) return '';

    const pills = filterEntries.map(([paramKey, value]) => {
      const { field } = parseFilterKey(paramKey);
      const label = this.getFilterLabel(field);
      const displayText = formatFilterDisplay(paramKey, value, label);
      const icon = 'filter';

      return `
        <span class="badge bg-primary me-1 mb-1 py-1 px-2 position-relative" style="font-size: 0.75rem;">
          <i class="bi bi-${icon} me-1" style="font-size: 0.65rem;"></i>

          <button type="button" class="btn btn-link text-white p-0 ms-1"
                  style="font-size: 0.65rem; line-height: 1;"
                  data-action="edit-filter"
                  data-filter="${paramKey}"
                  title="Edit filter">
            ${displayText}
          </button>

          <button type="button" class="btn-close btn-close-white ms-1"
                  style="font-size: 0.6rem; width: 0.5rem; height: 0.5rem;"
                  data-action="remove-filter"
                  data-filter="${paramKey}"
                  title="Remove filter">
          </button>
        </span>
      `;
    }).join('');

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

  buildPaginationTemplate() {
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
          <nav aria-label="List pagination">
            <ul class="pagination pagination-sm mb-0 justify-content-center" data-container="pagination"></ul>
          </nav>
        </div>
      </div>
    `;
  }

  buildShowMoreTemplate() {
    return `
      {{#hasMore}}
        <div class="list-show-more-row text-center mt-3">
          <button class="btn btn-outline-secondary btn-sm" data-action="show-more"
                  {{#loadingMore}}disabled{{/loadingMore}}>
            {{#loadingMore}}
              <span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
              Loading…
            {{/loadingMore}}
            {{^loadingMore}}
              <i class="bi bi-arrow-down-circle me-1"></i>Show more
            {{/loadingMore}}
          </button>
        </div>
      {{/hasMore}}
    `;
  }

  // ============================================================
  // Collection wiring (existing + persistSelection-aware)
  // ============================================================

  _initCollection(collectionOrClass) {
    if (!collectionOrClass) {
      console.log('Collection not provided');
      return;
    }
    if (collectionOrClass instanceof Collection) {
      this.setCollection(collectionOrClass);
    } else if (typeof collectionOrClass === 'function') {
      const collection = new collectionOrClass();
      this.setCollection(collection);
    } else if (Array.isArray(collectionOrClass)) {
      const collection = new Collection(collectionOrClass);
      this.setCollection(collection);
    }
  }

  setCollection(collection) {
    if (this.collection === collection) return this;

    if (this.collection) {
      this.collection.off('add', this._onModelsAdded, this);
      this.collection.off('remove', this._onModelsRemoved, this);
      this.collection.off('reset', this._onCollectionReset, this);
      this.collection.off('fetch:start', this._onFetchStart, this);
      this.collection.off('fetch:end', this._onFetchEnd, this);
    }

    this.collection = collection;

    if (this.options.defaultQuery && !this.options.collectionParams) {
      this.collection.params = { ...this.collection.params, ...this.options.defaultQuery };
    }
    if (this.options.collectionParams) {
      this.collection.params = { ...this.collection.params, ...this.options.collectionParams };
    }
    if (this.options.pageSize && this.collection) {
      this.collection.params = { ...this.collection.params, size: this.options.pageSize };
    }

    if (this.collection) {
      this.collection.on('add', this._onModelsAdded, this);
      this.collection.on('remove', this._onModelsRemoved, this);
      this.collection.on('reset', this._onCollectionReset, this);
      this.collection.on('fetch:start', this._onFetchStart, this);
      this.collection.on('fetch:end', this._onFetchEnd, this);

      if (this.collection.restEnabled && !this.collection.lastFetchTime && !this.collection.options?.preloaded) {
        this.loading = true;
      } else {
        this._buildItems();
      }
    }

    return this;
  }

  async _renderChildren() {
    await super._renderChildren();
    const itemsContainer = this.getChildElement('items');
    if (!itemsContainer) return;
    this.forEachItem((item) => {
      itemsContainer.appendChild(item.element);
      item.render(false);
    });
  }

  _buildItems() {
    this._clearItems();

    if (!this.collection || this.collection.isEmpty()) {
      this.isEmpty = true;
      this.emit('list:empty');
      return;
    }

    this.isEmpty = false;
    this.collection.forEach((model, index) => {
      this._createItemView(model, index);
    });
    this._applyPersistedSelections();

    this.emit('list:loaded', { count: this.collection.length() });

    if (this.isMounted()) {
      this.render();
    }
  }

  _createItemView(model, index) {
    if (this.itemViews.has(model.id)) return this.itemViews.get(model.id);

    const itemView = new this.itemClass({
      model: model,
      index: index,
      listView: this,
      template: this.itemTemplate
    });

    this.itemViews.set(model.id, itemView);

    itemView.on('item:select', this._onItemSelect.bind(this));
    itemView.on('item:deselect', this._onItemDeselect.bind(this));

    return itemView;
  }

  /**
   * If `persistSelection` is on, restore the `selected` flag on item views
   * whose model.id is in the `selectedItems` Set. Used after rebuilds (page
   * change) and after `_onModelsAdded` (Show More appends).
   * @private
   */
  _applyPersistedSelections() {
    if (!this.persistSelection || this.selectedItems.size === 0) return;
    this.itemViews.forEach((itemView, id) => {
      if (this.selectedItems.has(id) && !itemView.selected) {
        itemView.selected = true;
        if (itemView.element) itemView.addClass('selected');
      }
    });
  }

  _clearItems() {
    this.forEachItem((itemView) => {
      this.removeChild(itemView.id);
    });
    this.itemViews.clear();
    if (!this.persistSelection) {
      this.selectedItems.clear();
    }
  }

  _onModelsAdded(event) {
    const { models } = event;
    models.forEach((model) => {
      const index = this.collection.models.indexOf(model);
      this._createItemView(model, index);
    });
    this._applyPersistedSelections();

    this.isEmpty = this.collection.isEmpty();

    if (!this.loading && this.isMounted()) {
      this.render();
    }
  }

  _onModelsRemoved(event) {
    const { models } = event;
    models.forEach((model) => {
      const itemView = this.itemViews.get(model.id);
      if (itemView) {
        this.removeChild(itemView.id);
        this.itemViews.delete(model.id);
        this.selectedItems.delete(model.id);
      }
    });

    this.isEmpty = this.collection.isEmpty();
    if (!this.loading && this.isMounted()) {
      this.render();
    }
    if (this.isEmpty) this.emit('list:empty');
  }

  _onCollectionReset(_event) {
    this._buildItems();
  }

  _onFetchStart() {
    this.loading = true;
    if (this.isMounted()) this.render();
  }

  _onFetchEnd() {
    this.loading = false;
    if (this.isMounted()) this.render();
  }

  _onItemSelect(event) {
    const { model, item } = event;

    if (this.selectionMode === 'none') {
      item.deselect();
      return;
    }

    if (this.selectionMode === 'single') {
      this.itemViews.forEach((view, id) => {
        if (id !== model.id && view.selected) view.deselect();
      });
      this.selectedItems.clear();
    }

    this.selectedItems.add(model.id);

    this.emit('selection:change', {
      selected: Array.from(this.selectedItems),
      item, model
    });
  }

  _onItemDeselect(event) {
    const { model } = event;
    this.selectedItems.delete(model.id);

    this.emit('selection:change', {
      selected: Array.from(this.selectedItems),
      item: event.item, model
    });
  }

  // ============================================================
  // Selection API (unchanged)
  // ============================================================

  getSelectedItems() {
    const selected = [];
    this.selectedItems.forEach((id) => {
      const itemView = this.itemViews.get(id);
      if (itemView) {
        selected.push({
          view: itemView,
          model: itemView.model,
          data: itemView.model?.toJSON ? itemView.model.toJSON() : itemView.model
        });
      }
    });
    return selected;
  }

  forEachItem(callback, thisArg) {
    if (typeof callback !== 'function') {
      throw new TypeError('Callback must be a function');
    }
    let index = 0;
    this.itemViews.forEach((itemView) => {
      callback.call(thisArg, itemView, itemView.model, index++);
    });
    return this;
  }

  clearSelection() {
    this.forEachItem((itemView) => {
      if (itemView.selected) itemView.deselect();
    });
    this.selectedItems.clear();
    this.emit('selection:change', { selected: [] });
  }

  selectItem(modelId) {
    const itemView = this.itemViews.get(modelId);
    if (itemView) itemView.select();
    return this;
  }

  deselectItem(modelId) {
    const itemView = this.itemViews.get(modelId);
    if (itemView) itemView.deselect();
    return this;
  }

  setItemTemplate(template, rerender = false) {
    this.itemTemplate = template;
    if (rerender && this.itemViews.size > 0) {
      this.forEachItem((itemView) => {
        itemView.setTemplate(template);
        if (itemView.isMounted()) itemView.render();
      });
    }
    return this;
  }

  async refresh() {
    if (this.collection && this.collection.restEnabled) {
      return await this.collection.fetch();
    }
    this._buildItems();
  }

  // ============================================================
  // Toolbar action handlers
  // ============================================================

  async onActionRefresh(_event, _element) {
    await this.refresh();
  }

  async onActionApplySearch(_event, element) {
    const searchTerm = element.value.trim();
    if (this.collection) {
      this.setFilter('search', searchTerm);
      this.collection.params.start = 0;
      if (this.collection.restEnabled) {
        await this.collection.fetch();
      } else {
        await this.render();
      }
    }
    this.updateFilterPills();
    this.emit('list:search', { searchTerm });
    this.emit('params-changed');
  }

  async onActionClearSearch(_event, _element) {
    this.setFilter('search', null);
    if (this.collection) {
      this.collection.params.start = 0;
      if (this.collection.restEnabled) await this.collection.fetch();
    }
    await this.render();
    this.updateFilterPills();
    this.emit('list:search', { searchTerm: '' });
    this.emit('params-changed');
  }

  setupSearchClearListener() {
    if (!this.element) return;
    const searchInputs = this.element.querySelectorAll('input[type="search"][data-filter="search"]');
    searchInputs.forEach((input) => {
      input.addEventListener('input', (event) => {
        if (event.target.value === '' && this.getActiveFilters().search) {
          this.onActionClearSearch(event, event.target);
        }
      });
    });
  }

  updateFilterPills() {
    const container = this.element?.querySelector('[data-container="filter-pills"]');
    if (!container) return;
    container.innerHTML = this.buildActivePills();
  }

  updateSearchInputs(value) {
    const inputs = this.element?.querySelectorAll('[data-filter="search"]');
    if (inputs) inputs.forEach((input) => { input.value = value || ''; });
  }

  // -------- Pagination handlers --------
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

    const prevPage = currentPage > 1 ? currentPage - 1 : totalPages;
    const nextPage = currentPage < totalPages ? currentPage + 1 : 1;

    const pages = [];
    pages.push(`
      <li class="page-item">
        <a class="page-link" href="#" data-action="page" data-page="${prevPage}">
          <i class="bi bi-chevron-left"></i>
        </a>
      </li>
    `);

    const neighbors = 1;
    const visibleSet = new Set([1, totalPages]);
    for (let i = currentPage - neighbors; i <= currentPage + neighbors; i++) {
      if (i >= 1 && i <= totalPages) visibleSet.add(i);
    }
    const visible = Array.from(visibleSet).sort((a, b) => a - b);

    let last = 0;
    for (const p of visible) {
      if (last && p - last > 1) {
        pages.push('<li class="page-item disabled"><span class="page-link">…</span></li>');
      }
      pages.push(`
        <li class="page-item ${p === currentPage ? 'active' : ''}">
          <a class="page-link" href="#" data-action="page" data-page="${p}">${p}</a>
        </li>
      `);
      last = p;
    }

    pages.push(`
      <li class="page-item">
        <a class="page-link" href="#" data-action="page" data-page="${nextPage}">
          <i class="bi bi-chevron-right"></i>
        </a>
      </li>
    `);

    paginationContainer.innerHTML = pages.join('');
  }

  async onActionPage(event, element) {
    event.preventDefault();
    const rawPage = parseInt(element.getAttribute('data-page'), 10);
    const size = this.collection.params?.size || 10;
    const total = this.collection.meta?.count || this.collection.length();
    const totalPages = Math.max(1, Math.ceil(total / size));

    let page = isNaN(rawPage) ? 1 : rawPage;
    if (page < 1) page = totalPages;
    if (page > totalPages) page = 1;

    this.collection.setParams({
      ...this.collection.params,
      start: (page - 1) * size
    });

    if (this.collection.restEnabled) {
      await this.collection.fetch();
    } else {
      this.render();
    }

    this.emit('list:page', { page, event });
    this.emit('params-changed');
  }

  async onChangePageSize(_event, element) {
    const newSize = parseInt(element.value, 10);
    if (this.collection) {
      this.collection.setParams({
        ...this.collection.params,
        start: 0,
        size: newSize
      });
      if (this.collection.restEnabled) await this.collection.fetch();
      this.render();
    }
    this.emit('list:pagesize', { size: newSize });
    this.emit('params-changed');
  }

  // -------- Show more --------
  _computeHasMore() {
    if (this.paginationMode !== 'more') return false;
    if (!this.collection) return false;
    const total = this.collection.meta?.count;
    if (typeof total !== 'number') return false;
    return this.collection.length() < total;
  }

  async onActionShowMore(_event, _element) {
    if (this.loadingMore) return;
    if (!this.collection || typeof this.collection.fetchMore !== 'function') {
      console.warn('ListView: collection does not support fetchMore()');
      return;
    }
    this.loadingMore = true;
    if (this.isMounted()) await this.render();
    try {
      const response = await this.collection.fetchMore();
      this.emit('list:show-more', { response });
    } catch (err) {
      console.error('ListView: fetchMore failed', err);
    } finally {
      this.loadingMore = false;
      if (this.isMounted()) await this.render();
    }
  }

  // -------- Sort dropdown handler --------
  async onActionSortOption(event, element) {
    event.preventDefault();
    const sort = element.getAttribute('data-sort');

    if (this.collection) {
      this.collection.setParams({
        ...this.collection.params,
        sort: sort || undefined,
        start: 0
      });
      if (this.collection.restEnabled) {
        await this.collection.fetch();
      } else {
        this.render();
      }
    }
    this.emit('list:sort', { sort });
    this.emit('params-changed');
  }

  // -------- Custom toolbar button --------
  async onActionCustomToolbarButton(event, element) {
    const idx = parseInt(element.getAttribute('data-button-index'), 10);
    const button = this.toolbarButtons[idx];
    if (button && typeof button.handler === 'function') {
      await button.handler.call(this, event, element);
    }
  }

  // -------- Filter handlers --------
  async onActionAddFilter(_event, element) {
    const filterKey = element.getAttribute('data-filter-key');
    const filterConfig = this.getFilterConfig(filterKey);
    const currentValue = this.getActiveFilters()[filterKey];

    if (!filterConfig) {
      console.warn('No filter config found for key:', filterKey);
      return;
    }

    const result = await Modal.form({
      title: `${currentValue !== undefined && currentValue !== '' ? 'Edit' : 'Add'} ${this.getFilterLabel(filterKey)} Filter`,
      size: 'md',
      fields: [this.buildFilterDialogField(filterConfig, currentValue, filterKey)]
    });

    if (result) {
      const newFilterValue = this.extractFilterValue(filterConfig, result);
      this.setFilter(filterKey, newFilterValue);
      await this.applyFilters();
    }
  }

  async onActionEditFilter(_event, element) {
    const filterKey = element.getAttribute('data-filter');
    const { field } = parseFilterKey(filterKey);

    let filterConfig = this.getFilterConfig(field) || this.getFilterConfig(filterKey);

    const activeFilters = this.getActiveFilters();
    const currentValue = activeFilters[filterKey] || activeFilters[field];

    if (!filterConfig) {
      console.warn('No filter config found for key:', filterKey, 'or field:', field);
      this.emit('filter:edit', { key: filterKey });
      return;
    }

    const formData = { filter_value: currentValue };
    if (filterConfig.type === 'daterange' && currentValue && typeof currentValue === 'object') {
      const startName = filterConfig.startName || 'dr_start';
      const endName = filterConfig.endName || 'dr_end';
      formData[startName] = currentValue.start || '';
      formData[endName] = currentValue.end || '';
    }

    this.emit('filter:edit', { key: filterKey });

    const result = await Modal.form({
      title: `Edit ${this.getFilterLabel(field)} Filter`,
      size: 'md',
      data: formData,
      fields: [this.buildFilterDialogField(filterConfig, currentValue, field)]
    });

    if (result) {
      const newFilterValue = this.extractFilterValue(filterConfig, result);
      this.setFilter(filterKey, newFilterValue);
      await this.applyFilters();
    }
  }

  async onActionRemoveFilter(_event, element) {
    const filterKey = element.getAttribute('data-filter');
    const { field } = parseFilterKey(filterKey);

    this.setFilter(filterKey, null);
    if (filterKey === 'search') this.updateSearchInputs('');

    if (this.collection?.restEnabled) await this.collection.fetch();
    this.render();
    this.updateFilterPills();

    this.emit('filter:remove', { key: filterKey, field });
    this.emit('params-changed');
  }

  async onActionClearAllFilters(_event, _element) {
    if (!this.collection) return;

    const { start, size, sort } = this.collection.params;
    const preserved = { start, size };
    if (sort) preserved.sort = sort;

    if (Array.isArray(this.hideActivePillNames) && this.hideActivePillNames.length > 0) {
      this.hideActivePillNames.forEach((key) => {
        if (this.collection.params[key] !== undefined) preserved[key] = this.collection.params[key];

        const filterConfig = this.getFilterConfig(key);
        if (filterConfig && filterConfig.type === 'daterange') {
          const startName = filterConfig.startName || 'dr_start';
          const endName = filterConfig.endName || 'dr_end';
          const fieldName = filterConfig.fieldName || 'dr_field';
          if (this.collection.params[startName] !== undefined) preserved[startName] = this.collection.params[startName];
          if (this.collection.params[endName] !== undefined) preserved[endName] = this.collection.params[endName];
          if (this.collection.params[fieldName] !== undefined) preserved[fieldName] = this.collection.params[fieldName];
        }
      });
    }

    this.collection.params = preserved;
    this.updateSearchInputs('');

    if (this.collection.restEnabled) await this.collection.fetch();
    this.render();
    this.updateFilterPills();

    this.emit('filters:clear');
    this.emit('params-changed');
  }

  async applyFilters() {
    if (this.collection) this.collection.params.start = 0;

    if (this.collection?.restEnabled) {
      try {
        await this.collection.fetch();
        await this.render();
      } catch (err) {
        console.error('Failed to fetch filtered data:', err);
        await this.render();
      }
    } else {
      await this.render();
    }

    this.updateFilterPills();
    this.emit('params-changed');
  }

  // ============================================================
  // Filter API (params-driven, identical semantics to TableView)
  // ============================================================

  getActiveFilters() {
    if (!this.collection?.params) return {};
    const { start: _start, size: _size, sort: _sort, ...allParams } = this.collection.params;
    const filters = {};

    const processedKeys = new Set();
    const allFilterConfigs = this.getAllAvailableFilters();

    allFilterConfigs.forEach((filterDef) => {
      if (filterDef.config?.type === 'daterange') {
        const key = filterDef.key;
        const startName = filterDef.config.startName || 'dr_start';
        const endName = filterDef.config.endName || 'dr_end';
        const fieldName = filterDef.config.fieldName || 'dr_field';

        if (allParams[fieldName] === key && (allParams[startName] || allParams[endName])) {
          filters[key] = {
            start: allParams[startName] || '',
            end: allParams[endName] || ''
          };
          processedKeys.add(startName);
          processedKeys.add(endName);
          processedKeys.add(fieldName);
        }
      }
    });

    Object.keys(allParams).forEach((paramKey) => {
      if (!processedKeys.has(paramKey)) filters[paramKey] = allParams[paramKey];
    });

    Object.keys(filters).forEach((key) => {
      const inKey = `${key}__in`;
      if (Object.prototype.hasOwnProperty.call(filters, inKey)) {
        delete filters[key];
      }
    });

    return filters;
  }

  setFilter(key, value) {
    if (!this.collection) return;

    const filterConfig = this.getFilterConfig(key);

    if (filterConfig && filterConfig.type === 'daterange') {
      const startName = filterConfig.startName || 'dr_start';
      const endName = filterConfig.endName || 'dr_end';
      const fieldName = filterConfig.fieldName || 'dr_field';

      delete this.collection.params[startName];
      delete this.collection.params[endName];
      delete this.collection.params[fieldName];

      if (value && typeof value === 'object' && (value.start || value.end)) {
        if (value.start) this.collection.params[startName] = value.start;
        if (value.end) this.collection.params[endName] = value.end;
        this.collection.params[fieldName] = key;
      }
    } else {
      const { field } = parseFilterKey(key);

      delete this.collection.params[key];
      delete this.collection.params[field];
      delete this.collection.params[`${field}__in`];

      if (!value || (Array.isArray(value) && value.length === 0)) return;

      if (Array.isArray(value)) {
        if (value.length === 1) {
          this.collection.params[field] = value[0];
        } else {
          this.collection.params[`${field}__in`] = value.join(',');
        }
      } else {
        this.collection.params[key] = value;
      }
    }
  }

  getAllAvailableFilters() {
    const filters = [];

    // Column-based filters (populated by TableView via extractColumnFilters).
    Object.entries(this.filters || {}).forEach(([fieldKey, config]) => {
      filters.push({
        key: fieldKey,
        label: config.label || fieldKey,
        type: config.type,
        config
      });
    });

    if (this.additionalFilters && Array.isArray(this.additionalFilters)) {
      this.additionalFilters.forEach((filter) => {
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

  getFilterConfig(filterKey) {
    if (this.filters && this.filters[filterKey]) return this.filters[filterKey];
    if (this.additionalFilters && Array.isArray(this.additionalFilters)) {
      const filter = this.additionalFilters.find((f) => (f.name || f.key) === filterKey);
      if (filter) return filter;
    }
    return null;
  }

  getFilterLabel(key) {
    if (key === 'search') return 'Search';
    const f = this.filters?.[key];
    if (f && f.label) return f.label;
    const af = this.additionalFilters?.find((x) => (x.name || x.key) === key);
    if (af && af.label) return af.label;
    return key.charAt(0).toUpperCase() + key.slice(1);
  }

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

  buildFilterDialogField(filterConfig, currentValue, _filterKey) {
    const { name: _filterName, value: _filterValue, ...rest } = filterConfig;
    const field = {
      ...rest,
      name: 'filter_value',
      label: rest.label,
      value: currentValue,
      placeholder: rest.placeholder || rest.placeHolder
    };

    if (filterConfig.type === 'daterange') {
      field.startName = field.startName || 'dr_start';
      field.endName = field.endName || 'dr_end';
      field.fieldName = field.fieldName || 'dr_field';
      field.format = field.format || 'YYYY-MM-DD';
      field.displayFormat = field.displayFormat || 'MMM DD, YYYY';
      field.separator = field.separator || ' to ';
      field.label = field.label || 'Date Range';

      if (currentValue && typeof currentValue === 'object') {
        const normalizeDateValue = (val) => {
          if (!val && val !== 0) return '';
          if (val instanceof Date && !isNaN(val)) return val.toISOString().slice(0, 10);
          const str = String(val).trim();
          if (!str) return '';
          if (/^-?\d+$/.test(str)) {
            const num = Number(str);
            const ms = str.length <= 10 ? num * 1000 : num;
            const date = new Date(ms);
            if (!isNaN(date)) return date.toISOString().slice(0, 10);
          }
          const date = new Date(str);
          if (!isNaN(date)) return date.toISOString().slice(0, 10);
          return str;
        };

        field.startDate = normalizeDateValue(currentValue.start || currentValue.from || currentValue.begin || '');
        field.endDate = normalizeDateValue(currentValue.end || currentValue.to || currentValue.finish || '');
      }
    } else if (filterConfig.type === 'multiselect') {
      let valueArray = [];
      if (currentValue) {
        if (Array.isArray(currentValue)) {
          valueArray = currentValue;
        } else if (typeof currentValue === 'string') {
          valueArray = currentValue.split(',').map((v) => v.trim()).filter((v) => v);
        }
      }
      field.value = valueArray;
      if (!field.placeholder && !field.placeHolder) {
        if (filterConfig.placeholder || filterConfig.placeHolder) {
          field.placeholder = filterConfig.placeholder || filterConfig.placeHolder;
        } else if (filterConfig.label) {
          field.placeholder = `Select ${filterConfig.label}...`;
        }
      }
    }

    return field;
  }

  extractFilterValue(filterConfig, formResult) {
    if (filterConfig.type === 'daterange') {
      const startName = filterConfig.startName || 'dr_start';
      const endName = filterConfig.endName || 'dr_end';
      return { start: formResult[startName], end: formResult[endName] };
    }
    if (filterConfig.type === 'multiselect') return formResult.filter_value;
    return formResult.filter_value;
  }

  // -------- Toolbar text mutators --------
  setTitle(value) {
    this.title = value || null;
    const el = this.element?.querySelector('.rs-table-title');
    if (el) el.textContent = this.title || '';
  }

  setEyebrow(value) {
    this.eyebrow = value || null;
    const el = this.element?.querySelector('.rs-table-eyebrow');
    if (el) el.textContent = this.eyebrow || '';
  }

  // -------- Hooks called from action handlers (subclassable) --------

  /**
   * Permission check used by `toolbarButtons[].permissions`. Default: allow.
   * TableView and apps can override to integrate with their own ACL.
   */
  checkPermissions(_permissions) {
    return true;
  }

  /** Light HTML-escape for inline template strings. */
  escapeHtml(value) {
    if (value == null) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ============================================================
  // Cleanup
  // ============================================================

  async destroy() {
    if (this.collection) {
      this.collection.off('add', this._onModelsAdded, this);
      this.collection.off('remove', this._onModelsRemoved, this);
      this.collection.off('reset', this._onCollectionReset, this);
      this.collection.off('fetch:start', this._onFetchStart, this);
      this.collection.off('fetch:end', this._onFetchEnd, this);
    }
    this._clearItems();
    await super.destroy();
  }
}

export default ListView;
