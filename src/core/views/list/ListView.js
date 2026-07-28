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
 *   - 'list:add' - Emitted when the Add button is clicked
 *   - 'list:export' - Emitted when an export format is chosen
 *   - 'filter:remove' - Emitted when a filter pill is removed
 *   - 'filters:clear' - Emitted when "Clear All" is clicked
 *   - 'params-changed' - Emitted whenever sort/page/filter/search changes
 *   - 'preset:change' - Emitted when a filter preset is applied ({ key, params }) or cleared (null)
 *   - 'stat:change' - Emitted when a stat block is applied ({ key, params }) or cleared (null)
 *   - 'range:change' - Emitted when the day-range picker changes
 *   - 'row:click' / 'row:view' / 'row:edit' / 'row:delete' - Row lifecycle
 *
 * (There is deliberately no `filter:edit` event — ListView owns the pill-edit
 * dialog end-to-end; see the NOTE in `onActionEditFilter`.)
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
import Mustache from '@core/utils/mustache.js';
import FormView from '@core/forms/FormView.js';
import SegmentControl from '@core/views/navigation/SegmentControl.js';
import { parseFilterKey, formatFilterDisplay } from '@core/utils/DjangoLookups.js';
import ListViewItem from './ListViewItem.js';
import ListGroupHeaderView from './ListGroupHeaderView.js';

class ListView extends View {
  /**
   * Valid values for the `groupHeaderStyle` constructor option. Each maps
   * to a CSS modifier class — see `src/core/css/list-view.css`.
   */
  static GROUP_HEADER_STYLES = ['banner', 'mark', 'band', 'rule'];

  /**
   * Bootstrap variant tokens accepted by the `rowStripe` callback. A return
   * matching one of these maps to the canonical `list-row-stripe-<token>`
   * class (defined in list-view.css / table.css). Any other non-empty
   * string returned by the callback is treated as a consumer-defined
   * class name and passed through verbatim.
   */
  static ROW_STRIPE_TOKENS = ['danger', 'warning', 'success', 'info', 'primary', 'secondary'];

  /**
   * How long the `.mojo-row-flash` class stays on a changed row. Slightly
   * longer than the 1.2s CSS animation so the fade always finishes before the
   * class is stripped.
   */
  static ROW_FLASH_MS = 1400;

  /**
   * Hard client-side cap on the number of `stats:` bundles sent in one
   * aggregation request. Matches the backend's `MOJO_REST_AGG_STATS_CAP`
   * default (12) — over-cap is a 400 there, so we drop (with a warning)
   * before the wire rather than degrade the whole strip.
   */
  static STATS_MAX_BUNDLES = 12;

  /**
   * Track Model classes already warned about a minified `.name` so the
   * console doesn't spam — one warning per offending class per session.
   * @private
   */
  static _warnedMinifiedClasses = new WeakSet();

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

    // Day-range filter helper: opt-in `1d / 7d / 30d / 90d` SegmentControl
    // mounted to the left of `toolbarRight`. When enabled, ListView writes
    // `${field}__gte = nowEpoch - days*86400` to `collection.params` on each
    // change and refetches — same contract as `applyFilters`. Caller can
    // listen to the `range:change` event for side effects (eyebrow labels,
    // etc.). Boolean true → defaults; object form merges over defaults.
    this.dayRangeFilter = this._normalizeDayRangeFilter(options.dayRangeFilter);
    this.dayRangeControl = null;

    // Filter presets: opt-in `filterPresets:` array of author-defined
    // "common queries" rendered as a compact joined btn-group segment.
    // Each preset bundles a set of filter params applied in one click.
    // Mutual-exclusion + toggle-off only (no additive mode). Active state
    // is *derived* — a preset is active when every one of its resolved
    // params strictly matches getActiveFilters(). Empty / absent → the
    // whole feature is inert (byte-identical rendering & behavior).
    // See `docs/web-mojo/components/ListView.md` (Filter presets).
    this.filterPresets = this._normalizeFilterPresets(options.filterPresets);

    // Live stat strip (WM-037): opt-in `stats:` array of
    // `{ key, label, params, critical?, description? }` rendered as an inset
    // grouped track above the toolbar. Each block shows a LIVE count computed
    // by the server under the table's current filters (one batched
    // `_mode=count&_stats=…` request against the same list endpoint), and
    // clicking one applies its param bundle through the same rails as a
    // filter preset (mutual exclusion + toggle-off + derived active state).
    // Absent / empty → zero markup, zero requests, byte-identical render.
    // See `docs/web-mojo/components/TableView.md` (Live stat strip).
    this.stats = this._normalizeStats(options.stats);
    this._statCounts = {};        // { [stat.key]: number | null }
    this._statTotal = null;       // response's top-level `count` (the "All" chip)
    this._statsSupported = true;  // latched off when the server has no aggregation
    this._statsTimer = null;
    this._statsAbort = null;
    this._statsGeneration = 0;    // monotonic — the real stale-response guard
    this._statsWarned = false;    // one console.warn per instance, max
    this._statsSig = null;        // memo: last issued [baseParams, bundleMap]
    this._statsDebounceMs = 250;

    // Export configuration (gated by `showAdd` / `showExport` toolbar
    // options, which default to off on ListView). exportSource is 'remote'
    // (download from server via collection.download) or 'local' (pass
    // current data to options.onExport).
    this.exportOptions = options.exportOptions || null;
    this.exportSource = options.exportSource || 'remote';

    // Selection persistence across rebuilds (page change / fetchMore append).
    // Default: persist when in 'more' mode (rows aren't torn down anyway, and
    // users expect their selection to stay), clear when in 'pages' mode
    // (preserves existing TableView behavior unless caller opts in).
    this.persistSelection = options.persistSelection === undefined
      ? this.paginationMode === 'more'
      : options.persistSelection === true;

    // Click-anywhere-on-the-row pattern (parity with TableView's clickAction).
    // - `onItemClick(model, event)` — fired when the item's root element is
    //   clicked anywhere not handled by an inner `data-action` element.
    // - `clickable` — applies `.clickable` to each item (cursor: pointer +
    //   hover treatment). Implied true when `onItemClick` is set OR when
    //   `clickAction` is set to a non-'none' / non-'select' value.
    this.onItemClick = typeof options.onItemClick === 'function' ? options.onItemClick : null;

    // Model lifecycle (view / edit / delete / add) — same options
    // TableView ships. ListView defaults `clickAction: 'none'` (no
    // automatic dialog on row click) so existing usage is unchanged;
    // users opt in by setting clickAction + providing itemView / editForm
    // / etc. Subclasses override the default — TableView sets 'view'.
    this.clickAction = options.clickAction || 'none';
    this.itemView = options.itemView;
    this.addForm = options.addForm;
    this.editForm = options.editForm;
    this.deleteTemplate = options.deleteTemplate;
    this.formDialogConfig = options.formDialogConfig || {};
    this.viewDialogOptions = options.viewDialogOptions || {};
    this.fetchOnView = options.fetchOnView !== false;

    this.clickable = options.clickable === true
      || !!this.onItemClick
      || (this.clickAction && this.clickAction !== 'none');

    // -------- Row stripe (severity-coded left-edge color) --------
    // Optional per-row callback (model) => token | className | null.
    // Tokens in `ROW_STRIPE_TOKENS` map to `list-row-stripe-<token>`;
    // any other non-empty string is treated as a consumer-defined class
    // name and passed through. Null/undefined/empty = no stripe.
    //
    // The stripe re-applies automatically on every row render — and
    // since View binds `model:change → render()` in the base class,
    // a `model.set()` that flips the callback's input drives a stripe
    // refresh with no extra wiring. For stripes that depend on
    // external (non-model) state, call `refreshStripes()` from the
    // consumer's own event hook.
    this.rowStripe = typeof options.rowStripe === 'function' ? options.rowStripe : null;

    // -------- Grouped rows — opt-in via groupBy --------
    // `groupBy` is a function (model) => key OR a string (model field name).
    // When set, ListView inserts a synthetic header row before the first
    // item of each new group key (computed in render order). Headers are
    // ListGroupHeaderView instances — separate from the click-routing
    // machinery so they cannot fire item:click / row:click.
    //
    // Any falsy resolver return (null, undefined, '', 0, false) = no header
    // for that item ("ungrouped tail" — prior group's section continues
    // visually). If you genuinely want `0` or `''` as a group, return a
    // string ('zero', '__empty__', etc.) and format it in groupHeaderLabel.
    //
    // Note: `data-action` attributes inside a custom `groupHeaderTemplate`
    // will bubble to the parent ListView's EventDelegate and trigger the
    // matching `onAction*` handler. The default template emits non-interactive
    // markup (with `pointer-events: none` CSS), but if you supply a custom
    // template with buttons / links that have `data-action`, treat those as
    // first-class ListView actions and define handlers accordingly.
    this.groupBy = (typeof options.groupBy === 'function' || typeof options.groupBy === 'string')
      ? options.groupBy
      : null;
    this.groupHeaderTemplate = options.groupHeaderTemplate || null;
    this.groupHeaderLabel = typeof options.groupHeaderLabel === 'function' ? options.groupHeaderLabel : null;
    this.groupHeaderClass = options.groupHeaderClass || ListGroupHeaderView;
    // Visual style — selects the CSS modifier class on each header view.
    // Valid values: 'banner' (default — neutral full-width tint, label centered),
    // 'mark' (small accent square + bold label + fading hairline), 'band'
    // (neutral full-width tint, label left-aligned), 'rule' (editorial
    // fieldset-legend, label centered between rules). See list-view.css.
    this.groupHeaderStyle = ListView.GROUP_HEADER_STYLES.includes(options.groupHeaderStyle)
      ? options.groupHeaderStyle
      : 'banner';
    this.groupHeaderViews = new Map();
    this._renderOrder = [];

    // -------- WM-033 feedback states — all opt-in --------
    // Three independent upgrades that share the list body render path:
    //   1. `emptyState: {icon, title, message, action:{label, action, icon}}`
    //      — a rich empty panel (icon chip + title + message + optional CTA)
    //      replacing the bare `emptyMessage` string. A truly-empty list shows
    //      the configured content; a *filtered*-empty list (getActiveFilters()
    //      non-empty) auto-swaps to a "No results match your filters" panel
    //      with a Clear filters button (reuses onActionClearAllFilters).
    //      `emptyMessage` stays the untouched fallback when this is absent.
    //   2. `loadingStyle` — the loading visual during fetch. Skeleton shimmer
    //      rows/cards are the DEFAULT; pass `loadingStyle: 'spinner'` (or the
    //      `'default'` alias) to opt back into the classic spinner. This is the
    //      one feedback default that is NOT off — the skeleton is a deliberate,
    //      owner-approved upgrade to the loading visual only; non-loading
    //      renders are unchanged.
    //   3. `showResultCount: true` — a "Showing N of M" line rendered with the
    //      active-filter pills, "· filtered" when any filter is active.
    // `emptyState` and `showResultCount` default off; a page that sets neither
    // (and doesn't touch `loadingStyle`) renders unchanged apart from the
    // loading visual. See `docs/web-mojo/components/ListView.md` (Feedback states).
    this.emptyState = this._normalizeEmptyState(options.emptyState);
    this.loadingStyle = (options.loadingStyle === 'spinner' || options.loadingStyle === 'default')
      ? 'spinner'
      : 'skeleton';
    this.showResultCount = options.showResultCount === true;

    // -------- WM-034 auto-refresh — opt-in interval refetch --------
    // `autoRefresh: <seconds>` silently refetches the collection on an
    // interval (clamped to a 5s minimum), preserving the current
    // `collection.params` (filters / sort / paging). The tick is guarded:
    // it skips (without clearing the timer) while the tab is hidden or the
    // window is blurred, while a selection is active, and — for TableView —
    // while an inline cell edit or a row context menu is open. On regaining
    // focus the timer fires an immediate refetch then resumes normal cadence.
    // Absent → `_autoRefreshMs === 0`, so no timer and no listeners are ever
    // created (byte-identical behavior for pages that don't opt in).
    //
    // The object form `{ every, mode, indicator, flash }` selects the refresh
    // MODE. `mode: 'collection'` (the default, and what a bare number means)
    // is the full refetch above. `mode: 'models'` instead refreshes only the
    // rows already on screen via one batched `id__in` request merged in place —
    // no membership change, no pagination shift, no skeleton flash — and gives
    // rows whose data actually changed a brief highlight (`flash`, on by
    // default in models mode only). `every` is in **seconds**, like the bare
    // number; there is no `interval` alias (every `*Interval` in this repo is
    // milliseconds, so the name would lie).
    // See `docs/web-mojo/components/ListView.md` (Auto-refresh).
    this._autoRefreshMs = this._normalizeAutoRefresh(options.autoRefresh);
    this._autoRefreshMode = this._normalizeAutoRefreshMode(options.autoRefresh);
    this._autoRefreshFlash = this._normalizeAutoRefreshFlash(options.autoRefresh, this._autoRefreshMode);
    this._autoRefreshTimer = null;
    this._autoRefreshPaused = false;
    this._autoRefreshHandlers = null;
    this._autoRefreshAbort = null;
    this._autoRefreshInFlight = false;
    this._rowFlashTimers = new Map();
    // A quiet toolbar indicator (muted `bi-arrow-repeat`) is shown whenever
    // auto-refresh is active; pass `autoRefreshIndicator: false` to hide it.
    // The object form's `indicator` key wins when it's a boolean.
    // Off when auto-refresh is off, so it never adds toolbar markup by itself.
    this.autoRefreshIndicator = typeof options.autoRefresh?.indicator === 'boolean'
      ? options.autoRefresh.indicator
      : options.autoRefreshIndicator !== false;
    this._autoRefreshPulseTimer = null;

    // -------- WM-035 view persistence — opt-in per-table saved view --------
    // `persistState: true` remembers how each user likes this list/table —
    // sort, page size, day-range value, and active filter params — in
    // localStorage under a stable identity (`persistKey`, or the page route +
    // collection endpoint). Restored on the next visit, with precedence
    // URL > saved > configured defaults (saved state only fills params the
    // current query didn't already set). Strictly opt-in: the storage layer
    // is lazily touched ONLY when this flag is on (privacy + zero side effects
    // otherwise). The persisted blob is versioned (`{ v: 1, ... }`); corrupt
    // or stale entries are discarded silently. TableView layers column
    // visibility onto the same entry.
    // See `docs/web-mojo/components/ListView.md` (View persistence).
    this.persistState = options.persistState === true;
    this.persistKey = options.persistKey || null;

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
    // Snapshot the params already on the passed-in collection BEFORE
    // `_initCollection` layers on configured defaults (pageSize / defaultQuery /
    // collectionParams). These pre-existing keys are "the query" — for a
    // TablePage they're the URL params it applied before constructing this
    // view. Saved state (WM-035) fills only the slots the query didn't set,
    // giving the precedence URL > saved > configured defaults.
    const queryKeys = (this.persistState && this.options.collection && this.options.collection.params)
      ? Object.keys(this.options.collection.params)
      : [];

    this._initCollection(this.options.collection || this.options.Collection);

    // WM-035 — rehydrate the saved view before the day-range control is built
    // and before the first fetch, so restored sort/size/filters/day-range feed
    // that initial request. No-op (and zero storage access) unless persistState
    // is set. Also attach the save-on-change listener.
    if (this.persistState) {
      this._restorePersistedState(queryKeys);
      this.on('params-changed', () => this._savePersistedState());
    }

    // Live stat strip — recount whenever the query context changes. The
    // SUBSCRIPTION belongs here (pre-mount is fine, nothing fires yet); the
    // first/seed count is scheduled from `onAfterMount()`, because `onInit`
    // runs before the element is connected and the tick's `isMounted()` guard
    // would self-terminate the seed on a slow or lazy mount.
    if (this.stats.length > 0) {
      this.on('params-changed', () => this._scheduleStatsRefresh());
    }

    if (this.dayRangeFilter) {
      this._seedDayRangeParams();
      this.dayRangeControl = new SegmentControl({
        containerId: 'toolbar-day-range',
        options: this.dayRangeFilter.options,
        value: this.dayRangeFilter.value,
        ariaLabel: this.dayRangeFilter.ariaLabel
      });
      this.dayRangeControl.on('change', this._onDayRangeChange, this);
      this.addChild(this.dayRangeControl);
    }
  }

  async onAfterMount() {
    await super.onAfterMount();
    if (this.collection && (this.options.fetchOnMount || !this.collection.lastFetchTime)) {
      this.collection.fetch();
    }
    // Start the opt-in auto-refresh timer now the view is live. Fires on
    // first mount and on every cached-page re-entry (the page re-mounts its
    // children). No-op when `autoRefresh` wasn't set, and idempotent so a
    // re-entry never stacks a second interval.
    this._startAutoRefresh();
    // Seed the stat counts now the element is connected — `onInit` runs
    // pre-mount, so a timer started there could self-terminate before the
    // view ever reaches the DOM and latch the strip at em-dashes. Firing here
    // also gives a cached page a free recount on every re-entry.
    if (this.stats.length > 0) this._scheduleStatsRefresh();
  }

  async onBeforeUnmount() {
    await super.onBeforeUnmount();
    this._stopStatsRefresh();
    // Tear the timer + listeners down when a standalone view unmounts. (For
    // a TableView hosted inside a cached Page this hook doesn't fire on the
    // child — the parent only unbinds child events — so `_autoRefreshTick`
    // self-terminates on its next tick when it finds itself detached.)
    this._stopAutoRefresh();
  }

  async onBeforeRender() {
    // Surface the live search value into the template context so the input
    // re-renders with the current value after a fetch.
    this.searchValue = this.getActiveFilters().search || '';
    // Show-more visibility derives from collection state at render time.
    this.hasMore = this._computeHasMore();

    // WM-033 feedback states — build the skeleton / rich-empty markup for
    // the current render pass (unescaped `{{{…}}}` template slots). Both are
    // empty strings on the default paths, so no-option pages keep the
    // spinner + `emptyMessage` markup exactly.
    this.skeletonHtml = (this.loadingStyle === 'skeleton' && this.loading)
      ? this._buildSkeletonHtml()
      : '';
    this.emptyStateHtml = (this.emptyState && this.isEmpty && !this.loading)
      ? this._buildEmptyStateHtml()
      : '';
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
      this.renderFilterPresets();
      this.renderStatStrip();
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
      ${this._hasFeedbackFeature() ? this._buildFeedbackStyles() : ''}
      ${this._rowFlashEnabled() ? this._buildRowFlashStyles() : ''}
      <div class="list-view-container">
        {{#loading}}
          ${this._loadingContent(`<div class="list-loading">
            <div class="spinner-border spinner-border-sm" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
            Loading...
          </div>`)}
        {{/loading}}
        {{^loading}}
          {{#isEmpty}}
            ${this._emptyContent(`<div class="list-empty">
              {{emptyMessage}}
            </div>`)}
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
        ${this._hasFeedbackFeature() ? this._buildFeedbackStyles() : ''}
        ${this._rowFlashEnabled() ? this._buildRowFlashStyles() : ''}
        ${toolbar}
        <div class="list-view-container">
          {{#loading}}
            ${this._loadingContent(`<div class="list-loading text-center py-4">
              <div class="spinner-border spinner-border-sm" role="status">
                <span class="visually-hidden">Loading...</span>
              </div>
              Loading...
            </div>`)}
          {{/loading}}
          {{^loading}}
            {{#isEmpty}}
              ${this._emptyContent(`<div class="list-empty text-center py-4 text-muted">
                {{emptyMessage}}
              </div>`)}
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
      this.dayRangeFilter ||
      (this.filterPresets && this.filterPresets.length > 0) ||
      (this.stats && this.stats.length > 0) ||
      (this.toolbarButtons && this.toolbarButtons.length > 0) ||
      this._autoRefreshIndicatorEnabled() ||
      this.options.showAdd ||
      this.options.showExport
    );
  }

  /**
   * @returns {boolean} true when the auto-refresh toolbar indicator should
   * render — auto-refresh is active and it wasn't opted out. Gates both the
   * toolbar slot and its style block (off → zero markup, byte-identical).
   * @private
   */
  _autoRefreshIndicatorEnabled() {
    return this._autoRefreshMs > 0 && this.autoRefreshIndicator !== false;
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
    const dayRangeSlot = this.dayRangeFilter ? `<div data-container="toolbar-day-range"></div>` : '';
    const sortDropdown = (this.sortOptions && this.sortOptions.length > 0) ? this.buildSortDropdownTemplate() : '';

    // Filter presets: ≤4 → inline in the right-group (sibling of day-range);
    // 5+ → its own scrollable row above the filter pills. The container is
    // filled at render time by `renderFilterPresets()` so the derived active
    // state repaints on every fetch (like `updateFilterPills`).
    const hasPresets = this.filterPresets && this.filterPresets.length > 0;
    const presetsInline = hasPresets && this._presetsInline();
    const presetInlineSlot = presetsInline ? `<div data-container="filter-presets" class="preset-segment-slot"></div>` : '';
    const presetRowSlot = (hasPresets && !presetsInline) ? `<div data-container="filter-presets" class="preset-scroll mt-3"></div>` : '';
    const presetStyle = hasPresets ? this._buildPresetStyle() : '';

    // Auto-refresh indicator: a quiet muted icon near the action buttons,
    // gated on the option (off → no slot, no style — byte-identical render).
    const showIndicator = this._autoRefreshIndicatorEnabled();
    const indicatorSlot = showIndicator ? this._buildAutoRefreshIndicatorSlot() : '';
    const indicatorStyle = showIndicator ? this._buildAutoRefreshIndicatorStyle() : '';

    // Live stat strip (WM-037) — its own container above the action bar,
    // filled at render time by `renderStatStrip()`. Both the slot and the
    // style block are gated, and `_buildStatStripStyle()` is PURE: `super()`
    // means this method runs twice while a TableView is constructed and the
    // first result is thrown away.
    const hasStats = this.stats && this.stats.length > 0;
    const statStripSlot = hasStats ? `<div data-container="stat-strip" class="mojo-stat-strip-slot mb-3"></div>` : '';
    const statStripStyle = hasStats ? this._buildStatStripStyle() : '';

    const rightGroup = `
      <div class="d-flex align-items-center gap-2 flex-wrap ${titleBlock ? 'ms-auto' : ''}">
        ${this.buildActionButtonsTemplate()}
        ${indicatorSlot}
        ${sortDropdown}
        ${this.filterable ? this.buildFilterDropdownTemplate() : ''}
        ${this.searchable && this.searchPlacement === 'toolbar' ? this.buildSearchTemplate() : ''}
        ${presetInlineSlot}
        ${dayRangeSlot}
        ${rightSlot}
      </div>
    `;

    return `
      ${statStripStyle}
      ${statStripSlot}
      <div class="table-action-buttons mb-3">
        ${presetStyle}
        ${indicatorStyle}
        <div class="d-flex align-items-center gap-3 flex-wrap">
          ${titleBlock}
          ${rightGroup}
        </div>
        ${presetRowSlot}
        <div data-container="filter-pills"></div>
      </div>
    `;
  }

  _buildTitleBlockTemplate() {
    if (!this.title && !this.eyebrow) return '';
    // Use Mustache `{{eyebrow}}` / `{{title}}` so setEyebrow / setTitle
    // (and any other code path that mutates these props) survive a
    // re-render — the value is read from the view context at render
    // time, not baked at construction time.
    const eyebrow = `{{#eyebrow}}<div class="text-body-secondary text-uppercase small fw-semibold rs-table-eyebrow" style="letter-spacing: 0.05em; line-height: 1.2;">{{eyebrow}}</div>{{/eyebrow}}`;
    const title = `{{#title}}<h5 class="mb-0 rs-table-title">{{title}}</h5>{{/title}}`;
    return `<div class="rs-table-title-block">${eyebrow}${title}</div>`;
  }

  /**
   * Default action buttons: refresh + Add + Export + custom toolbarButtons.
   * Subclasses (TableView) override to inject Fullscreen.
   *
   * Add/Export are gated by `showAdd` / `showExport` and the Add button
   * uses `addForm` / Model.ADD_FORM via `onActionAdd`. Export calls
   * `collection.download(format)` which works on any REST-backed Collection.
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

    if (this.options.showAdd) {
      const addLabel = this.escapeHtml(this.options.addButtonLabel || 'Add');
      const addIcon = this.escapeHtml(this.options.addButtonIcon || 'bi bi-plus-circle');
      buttons.push(`
        <button class="btn btn-sm btn-success btn-add"
                data-action="add"
                title="${addLabel}">
          <i class="${addIcon} me-1"></i>
          <span class="d-none d-lg-inline">${addLabel}</span>
        </button>
      `);
    }

    if (this.options.showExport) {
      const exportOptions = this.exportOptions || [
        { format: 'csv', label: 'Export as CSV', icon: 'bi bi-file-earmark-spreadsheet' },
        { format: 'json', label: 'Export as JSON', icon: 'bi bi-file-earmark-code' }
      ];
      if (exportOptions.length > 1) {
        const dropdownItems = exportOptions.map((opt) => `
          <li>
            <a class="dropdown-item" href="#" data-action="export"
               data-format="${this.escapeHtml(opt.format)}">
              <i class="${this.escapeHtml(opt.icon || 'bi bi-file-earmark-arrow-down')} me-2"></i>
              ${this.escapeHtml(opt.label)}
            </a>
          </li>
        `).join('');
        buttons.push(`
          <div class="dropdown">
            <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button"
                    data-bs-toggle="dropdown" aria-expanded="false" title="Export">
              <i class="bi bi-download me-1"></i>
              <span class="d-none d-lg-inline">Export</span>
            </button>
            <ul class="dropdown-menu">${dropdownItems}</ul>
          </div>
        `);
      } else {
        const format = exportOptions.length === 1 ? exportOptions[0].format : 'json';
        buttons.push(`
          <button class="btn btn-sm btn-outline-secondary btn-export"
                  data-action="export"
                  data-format="${this.escapeHtml(format)}"
                  title="Export">
            <i class="bi bi-download me-1"></i>
            <span class="d-none d-lg-inline">Export</span>
          </button>
        `);
      }
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

        // Escape every dev-supplied field that flows into HTML / attributes —
        // defense in depth. `label` and `title` may legitimately contain
        // text, but never markup; the icon/variant/className/action fields
        // similarly should never carry an attribute-escaping vector.
        const safeIcon = this.escapeHtml(icon);
        const safeLabel = this.escapeHtml(label);
        const safeTitle = this.escapeHtml(title);
        const safeVariant = this.escapeHtml(variant);
        const safeClassName = this.escapeHtml(className);
        const safeAction = this.escapeHtml(action);

        const iconHtml = icon ? `<i class="${safeIcon} me-1"></i>` : '';
        const labelHtml = `<span class="d-none d-lg-inline">${safeLabel}</span>`;

        let dataAttrs = '';
        if (handler) {
          dataAttrs = `data-action="custom-toolbar-button" data-button-index="${index}"`;
        } else if (action) {
          dataAttrs = `data-action="${safeAction}"`;
        }

        const btnClass = `btn btn-sm btn-${safeVariant} ${safeClassName}`.trim();

        buttons.push(`
          <button class="${btnClass}" ${dataAttrs} title="${safeTitle}">
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
                data-filter-key="${this.escapeHtml(filter.key)}">
          <i class="bi bi-${this.escapeHtml(icon)} me-2"></i>
          ${this.escapeHtml(filter.label || filter.key)}
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
    // WM-033: the result-count summary rides in the filter-pills row, before
    // the pills. It's '' when showResultCount is off, so the pills markup is
    // byte-identical for pages that don't opt in.
    const countHtml = this.showResultCount ? this._buildResultCountSummary() : '';

    if (this.hideActivePills) {
      return countHtml ? this._wrapPillRow(countHtml) : '';
    }

    const activeFilters = this.getActiveFilters();
    const hasSearch = activeFilters.search && activeFilters.search.toString().trim() !== '';
    let filterEntries = Object.entries(activeFilters).filter(([key, value]) =>
      value && value.toString().trim() !== '' && key !== 'search'
    );

    if (this.hideActivePillNames && this.hideActivePillNames.length > 0) {
      filterEntries = filterEntries.filter(([key]) => !this.hideActivePillNames.includes(key));
    }

    if (filterEntries.length === 0 && !hasSearch) {
      return countHtml ? this._wrapPillRow(countHtml) : '';
    }

    const pills = filterEntries.map(([paramKey, value]) => {
      const { field } = parseFilterKey(paramKey);
      const label = this.getFilterLabel(field);
      // formatFilterDisplay interpolates the user's raw filter value, so
      // escape its return before injecting into innerHTML. paramKey is
      // attribute-escaped because it ends up in `data-filter`.
      const displayText = this.escapeHtml(formatFilterDisplay(paramKey, value, label));
      const safeParamKey = this.escapeHtml(paramKey);
      const icon = 'filter';

      // The framework's `.badge.bg-primary` is a subtle pill (light bg
      // + emphasis-text color) — `text-white` and `btn-close-white`
      // would render invisible. Use plain `btn-link` which inherits the
      // badge's own foreground color, and the default `.btn-close`
      // (no -white modifier) which renders dark on the light pill.
      return `
        <span class="badge bg-primary me-1 mb-1 py-1 px-2 position-relative" style="font-size: 0.75rem;">
          <i class="bi bi-${icon} me-1" style="font-size: 0.65rem;"></i>

          <button type="button" class="btn btn-link p-0 ms-1 list-filter-pill-text"
                  style="font-size: 0.65rem; line-height: 1; text-decoration: none;"
                  data-action="edit-filter"
                  data-filter="${safeParamKey}"
                  title="Edit filter">
            ${displayText}
          </button>

          <button type="button" class="btn-close ms-1"
                  style="font-size: 0.6rem; width: 0.5rem; height: 0.5rem;"
                  data-action="remove-filter"
                  data-filter="${safeParamKey}"
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
            ${countHtml}${pills}
            ${clearAllButton}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Wrap arbitrary inner markup in the standard active-pills row shell. Used
   * for the count-only case (WM-033) where the result-count summary renders
   * without any filter pills.
   * @private
   */
  _wrapPillRow(inner) {
    return `
      <div class="row mt-2">
        <div class="col-12">
          <div class="d-flex flex-wrap align-items-center">
            ${inner}
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
  // Feedback states (WM-033) — rich empty, skeletons, result count
  // ============================================================

  /**
   * Normalize the `emptyState:` option into `{ icon, title, message, action }`
   * or null when absent. `action` is `{ label, action, icon }` where `action`
   * is a kebab-case `data-action` name (routed like any toolbar action, e.g.
   * `'add'` → onActionAdd). Returns null for a non-object so the feature stays
   * inert and `emptyMessage` remains the fallback.
   * @private
   */
  _normalizeEmptyState(raw) {
    if (!raw || typeof raw !== 'object') return null;
    let action = null;
    if (raw.action && typeof raw.action === 'object' && raw.action.action) {
      action = {
        label: raw.action.label || 'Action',
        action: raw.action.action,
        icon: raw.action.icon || null
      };
    }
    return {
      icon: raw.icon || 'inbox',
      title: raw.title || null,
      message: raw.message || null,
      action
    };
  }

  /**
   * True when any of the three opt-in feedback features is enabled. Gates the
   * one-time `<style>` block emission so opt-out pages carry zero extra CSS.
   * @private
   */
  _hasFeedbackFeature() {
    return !!this.emptyState || this.loadingStyle === 'skeleton' || this.showResultCount;
  }

  /**
   * Loading-block content for the body template. Returns the unescaped
   * skeleton slot when `loadingStyle: 'skeleton'`, otherwise the caller's
   * default spinner markup verbatim (byte-identical opt-out).
   * @private
   */
  _loadingContent(defaultMarkup) {
    return this.loadingStyle === 'skeleton' ? '{{{skeletonHtml}}}' : defaultMarkup;
  }

  /**
   * Empty-block content for the body template. Returns the unescaped rich
   * empty-state slot when `emptyState` is configured, otherwise the caller's
   * default `emptyMessage` markup verbatim (byte-identical opt-out).
   * @private
   */
  _emptyContent(defaultMarkup) {
    return this.emptyState ? '{{{emptyStateHtml}}}' : defaultMarkup;
  }

  /**
   * Skeleton row count: `collection.params.size` capped at 8, defaulting to 5
   * when size isn't set. Shared by the ListView (card) and TableView (row)
   * skeleton builders.
   * @private
   */
  _skeletonRowCount() {
    const size = this.collection?.params?.size;
    const n = (typeof size === 'number' && size > 0) ? size : 5;
    return Math.min(n, 8);
  }

  /**
   * ListView skeleton — stacked card silhouettes. TableView overrides this to
   * emit a column-matched `<table>`. Called from onBeforeRender only while
   * loading + `loadingStyle: 'skeleton'`.
   * @private
   */
  _buildSkeletonHtml() {
    const rows = this._skeletonRowCount();
    let cards = '';
    for (let i = 0; i < rows; i++) {
      cards += '<div class="list-skeleton-card">'
        + '<span class="skeleton-line w-40"></span>'
        + '<span class="skeleton-line w-90"></span>'
        + '<span class="skeleton-line w-60"></span>'
        + '</div>';
    }
    return `<div class="list-skeleton" aria-hidden="true">${cards}</div>`;
  }

  /**
   * Build the rich empty-state panel. Branches on `getActiveFilters()`:
   * non-empty → the filtered variant ("No results match your filters" +
   * Clear filters button reusing onActionClearAllFilters); empty → the
   * configured truly-empty content with its optional CTA. Search counts as
   * an active filter. Returns '' when `emptyState` isn't configured.
   * @private
   */
  _buildEmptyStateHtml() {
    const es = this.emptyState;
    if (!es) return '';

    const activeCount = Object.keys(this.getActiveFilters()).length;
    const isFiltered = activeCount > 0;

    let icon;
    let title;
    let message;
    let buttonHtml;

    if (isFiltered) {
      icon = 'funnel';
      title = 'No results match your filters';
      const plural = activeCount === 1 ? 'filter' : 'filters';
      message = `No items match the ${activeCount} active ${plural}. Try widening or removing a filter.`;
      buttonHtml = '<button class="btn btn-outline-primary" data-action="clear-all-filters">'
        + '<i class="bi bi-x-circle me-1"></i>Clear filters</button>';
    } else {
      icon = es.icon || 'inbox';
      title = es.title || this.emptyMessage;
      message = es.message || '';
      if (es.action) {
        const iconHtml = es.action.icon
          ? `<i class="bi ${this.escapeHtml(es.action.icon)} me-1"></i>`
          : '';
        buttonHtml = `<button class="btn btn-primary" data-action="${this.escapeHtml(es.action.action)}">`
          + `${iconHtml}${this.escapeHtml(es.action.label)}</button>`;
      } else {
        buttonHtml = '';
      }
    }

    const titleHtml = title ? `<div class="empty-state-title h6">${this.escapeHtml(title)}</div>` : '';
    const messageHtml = message ? `<p class="empty-state-message">${this.escapeHtml(message)}</p>` : '';

    return `
      <div class="table-empty-state">
        <span class="empty-state-icon"><i class="bi bi-${this.escapeHtml(icon)}"></i></span>
        ${titleHtml}
        ${messageHtml}
        ${buttonHtml}
      </div>
    `;
  }

  /**
   * Build the "Showing N of M" result-count summary from `collection.meta`
   * (`count`) and the current loaded length. Appends a "· filtered" marker
   * when any filter is active. Returns '' when `showResultCount` is off or the
   * total count isn't known yet. Rendered inside the filter-pills row by
   * `buildActivePills`.
   * @private
   */
  _buildResultCountSummary() {
    if (!this.showResultCount || !this.collection) return '';
    const meta = this.collection.meta || {};
    const total = typeof meta.count === 'number' ? meta.count : null;
    if (total === null) return '';

    const shown = this.collection.length();
    const isFiltered = Object.keys(this.getActiveFilters()).length > 0;
    const fmt = (n) => Number(n).toLocaleString();
    const filteredSuffix = isFiltered
      ? ' <span class="count-filtered">· filtered</span>'
      : '';

    return `<span class="result-count-summary me-2 mb-1">`
      + `Showing <strong>${fmt(shown)}</strong> of <strong>${fmt(total)}</strong>${filteredSuffix}</span>`;
  }

  /**
   * One-time `<style>` block for the three feedback features (skeleton
   * shimmer, empty-state chip, result-count summary). Token-based so both
   * themes track automatically; the shimmer's moving band is a component tint
   * (black-on-light) with its rgba(255,255,255) dark companion, and the
   * animation is disabled under prefers-reduced-motion. Emitted once per
   * template, only when `_hasFeedbackFeature()`.
   * @private
   */
  _buildFeedbackStyles() {
    return `
      <style>
        .table-empty-state { text-align: center; padding: 3rem 1.5rem; }
        .table-empty-state .empty-state-icon {
          display: inline-flex; align-items: center; justify-content: center;
          width: 4rem; height: 4rem; border-radius: 50%;
          margin-bottom: 1rem; font-size: 1.75rem;
          background: var(--bs-secondary-bg);
          color: var(--bs-secondary-color);
          border: 1px solid var(--bs-border-color);
        }
        .table-empty-state .empty-state-title {
          font-weight: 600; color: var(--bs-emphasis-color); margin-bottom: 0.35rem;
        }
        .table-empty-state .empty-state-message {
          color: var(--bs-secondary-color); max-width: 26rem; margin: 0 auto 1.25rem;
        }

        .skeleton-line {
          display: block; height: 0.85rem; border-radius: 0.35rem;
          background-color: var(--bs-secondary-bg);
          background-image: linear-gradient(90deg,
            rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.06) 50%, rgba(0, 0, 0, 0) 100%);
          background-size: 200% 100%; background-repeat: no-repeat;
          animation: mojo-skeleton-shimmer 1.4s ease-in-out infinite;
        }
        [data-bs-theme="dark"] .skeleton-line {
          background-image: linear-gradient(90deg,
            rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.07) 50%, rgba(255, 255, 255, 0) 100%);
        }
        .skeleton-line.w-90 { width: 90%; }
        .skeleton-line.w-75 { width: 75%; }
        .skeleton-line.w-60 { width: 60%; }
        .skeleton-line.w-40 { width: 40%; }
        .skeleton-line.w-25 { width: 25%; }
        .skeleton-line.skeleton-pill { height: 1.35rem; width: 4rem; border-radius: 999px; }
        .list-skeleton-card {
          display: flex; flex-direction: column; gap: 0.5rem;
          padding: 0.85rem 1rem; margin-bottom: 0.5rem;
          border: 1px solid var(--bs-border-color-translucent);
          border-radius: 0.5rem;
        }
        @keyframes mojo-skeleton-shimmer {
          0% { background-position: 150% 0; }
          100% { background-position: -50% 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .skeleton-line { animation: none; }
        }

        .result-count-summary { font-size: 0.8rem; color: var(--bs-secondary-color); }
        .result-count-summary strong { color: var(--bs-emphasis-color); font-weight: 600; }
        .result-count-summary .count-filtered { color: var(--bs-primary); }
      </style>
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

  // ============================================================
  // Day-range filter helper
  // ============================================================

  _normalizeDayRangeFilter(raw) {
    if (!raw) return null;
    const defaults = {
      field: 'created',
      value: '7d',
      options: [
        { value: '1d', label: '1d' },
        { value: '7d', label: '7d' },
        { value: '30d', label: '30d' },
        { value: '90d', label: '90d' }
      ],
      ariaLabel: 'Time range'
    };
    if (raw === true) return defaults;
    return { ...defaults, ...raw };
  }

  _dayRangeDays(value) {
    const m = /^(\d+)d$/.exec(String(value || ''));
    return m ? parseInt(m[1], 10) : null;
  }

  _seedDayRangeParams() {
    if (!this.dayRangeFilter || !this.collection) return;
    const days = this._dayRangeDays(this.dayRangeFilter.value);
    if (days == null) return;
    const epoch = Math.floor(Date.now() / 1000) - days * 86400;
    this.collection.params[`${this.dayRangeFilter.field}__gte`] = epoch;
  }

  async _onDayRangeChange({ value, previous }) {
    const field = this.dayRangeFilter?.field || 'created';
    const days = this._dayRangeDays(value);
    let params = {};

    if (days != null && this.collection) {
      const epoch = Math.floor(Date.now() / 1000) - days * 86400;
      this.collection.params[`${field}__gte`] = epoch;
      this.collection.params.start = 0;
      params = { [`${field}__gte`]: epoch };
    }

    this.emit('range:change', { field, value, previous, params });
    this.emit('params-changed');

    if (this.collection?.restEnabled) {
      try {
        // fetch:end already triggers a render via _onFetchEnd, so no
        // trailing render() here — calling one would revert any
        // setEyebrow / setTitle updates a `range:change` listener made
        // (the toolbar template is baked at construction time).
        await this.collection.fetch();
      } catch (err) {
        console.error('Failed to fetch day-range data:', err);
        await this.render();
      }
    } else {
      await this.render();
    }
  }

  /**
   * Get the currently-selected day-range value, or null when the helper
   * is disabled / not yet initialized.
   * @returns {string|null}
   */
  getRange() {
    return this.dayRangeControl?.getValue() ?? null;
  }

  /**
   * Programmatically set the day-range value. Returns false when the helper
   * is disabled or the value isn't a known option. Pass `silent: true` to
   * suppress the `range:change` event and the refetch.
   * @param {string} value
   * @param {{ silent?: boolean }} opts
   * @returns {boolean}
   */
  setRange(value, { silent = false } = {}) {
    if (!this.dayRangeControl) return false;
    const previous = this.dayRangeControl.getValue();
    const ok = this.dayRangeControl.setValue(value, { silent: true });
    if (!ok) return false;
    if (!silent) this._onDayRangeChange({ value, previous });
    return true;
  }

  // ============================================================
  // Filter presets (compact joined btn-group segment)
  //
  // Author-defined "common queries" bundled behind a toolbar segment.
  // Mutual-exclusion + toggle-off only; active state is derived from
  // strict param matching against getActiveFilters(). The `'@me'` token
  // in a preset's params resolves to the active user's id at apply AND
  // match time (skipped when no active user).
  // ============================================================

  /**
   * Normalize the `filterPresets:` option into a clean array of
   * `{ key, label, icon, params, description }`. Drops entries without a
   * `key`, warns on (and drops) duplicate keys. Returns `[]` when the
   * option is absent / empty so the whole feature stays inert.
   * @private
   */
  _normalizeFilterPresets(raw) {
    if (!Array.isArray(raw) || raw.length === 0) return [];
    const seen = new Set();
    const presets = [];
    raw.forEach((p) => {
      if (!p || !p.key) return;
      if (seen.has(p.key)) {
        console.warn(`ListView: duplicate filterPresets key '${p.key}' — ignoring the later one.`);
        return;
      }
      seen.add(p.key);
      presets.push({
        key: p.key,
        label: p.label || p.key,
        icon: p.icon || null,
        params: (p.params && typeof p.params === 'object') ? p.params : {},
        description: p.description || null
      });
    });
    return presets;
  }

  /**
   * Placement branch: ≤4 presets render inline (sibling of the day-range
   * segment); 5+ get their own scrollable row above the filter pills.
   * @private
   */
  _presetsInline() {
    return this.filterPresets.length <= 4;
  }

  _getPreset(key) {
    return this.filterPresets.find((p) => p.key === key) || null;
  }

  /**
   * Resolve a preset's raw params into concrete filter values. The `'@me'`
   * token resolves to the active user's id; when no active user can be
   * resolved that param is skipped (both at apply and match time so the
   * derived active state stays consistent).
   * @private
   */
  _resolvePresetParams(preset) {
    const out = {};
    const raw = preset?.params || {};
    Object.keys(raw).forEach((key) => {
      const value = raw[key];
      if (value === '@me') {
        const uid = this.getApp()?.activeUser?.id;
        if (uid === undefined || uid === null) return; // skip — no active user
        out[key] = uid;
      } else {
        out[key] = value;
      }
    });
    return out;
  }

  /**
   * A preset is active when every one of its resolved params strictly
   * matches the current active filters. Matching goes through
   * getActiveFilters() (not raw collection.params) so `__in` collapsing is
   * honored. A preset whose params all resolve away (e.g. only `'@me'`
   * with no active user) never matches.
   * @private
   */
  _presetMatches(preset) {
    const resolved = this._resolvePresetParams(preset);
    const keys = Object.keys(resolved);
    if (keys.length === 0) return false;
    const active = this.getActiveFilters();
    return keys.every((key) => {
      const value = resolved[key];
      if (Array.isArray(value)) {
        if (value.length === 0) return true;
        const { field } = parseFilterKey(key);
        if (value.length === 1) {
          return active[field] !== undefined && String(active[field]) === String(value[0]);
        }
        const inVal = active[`${field}__in`];
        return inVal !== undefined && String(inVal) === value.join(',');
      }
      return active[key] !== undefined && String(active[key]) === String(value);
    });
  }

  /**
   * Null out every resolved param key belonging to a preset (used by
   * toggle-off and by mutual-exclusion when switching presets).
   * @private
   */
  _clearPresetParams(preset) {
    const resolved = this._resolvePresetParams(preset);
    Object.keys(resolved).forEach((key) => this.setFilter(key, null));
  }

  /**
   * Get the currently-active preset's full config object, or null. Active
   * state is derived — no stored "active preset" field to drift.
   *
   * Most-specific-match-wins: when several presets match at once (e.g. one
   * preset's params are a strict subset of another's — Errors `{level__gte:4}`
   * ⊂ Auth `{path__icontains:'/auth', level__gte:4}`), the one with the MOST
   * resolved param keys is returned so the correct (narrower) chip highlights
   * and mutual-exclusion/toggle logic reads it. Ties resolve to the first
   * matching preset in array order.
   * @returns {object|null}
   */
  getActivePreset() {
    return this._getActiveBundle(this.filterPresets);
  }

  /**
   * Most-specific-match-wins resolution over any list of param bundles
   * (`filterPresets` or `stats` — both carry `{ key, params }`). Shared so a
   * stat chip derives its active state by exactly the same rule as a preset.
   * @param {Array<object>} list
   * @returns {object|null}
   * @private
   */
  _getActiveBundle(list) {
    if (!list || list.length === 0) return null;
    let best = null;
    let bestCount = -1;
    for (const bundle of list) {
      if (!this._presetMatches(bundle)) continue;
      const count = Object.keys(this._resolvePresetParams(bundle)).length;
      if (count > bestCount) {   // strict `>` → ties keep the earlier bundle
        best = bundle;
        bestCount = count;
      }
    }
    return best;
  }

  /**
   * Apply a preset by key. Toggles off if it's already the active preset;
   * otherwise clears the previously-active preset's params (mutual
   * exclusion), applies the new bundle, refetches, and repaints.
   * @param {string} key
   * @returns {Promise<boolean>} false when the key is unknown.
   */
  async applyPreset(key) {
    const preset = this._getPreset(key);
    if (!preset) return false;

    const active = this.getActivePreset();

    // Toggle-off: re-clicking the active preset clears it.
    if (active && active.key === preset.key) {
      await this.clearPreset();
      return true;
    }

    // Mutual exclusion: drop the previously-active preset's params first.
    if (active) this._clearPresetParams(active);

    const resolved = this._resolvePresetParams(preset);
    Object.keys(resolved).forEach((k) => this.setFilter(k, resolved[k]));

    await this.applyFilters();       // start = 0 + fetch + pills + params-changed
    this.renderFilterPresets();      // repaint derived active state
    this.emit('preset:change', { key: preset.key, params: resolved });
    return true;
  }

  /**
   * Clear the active preset (removes its params). No-op when nothing is
   * active, but still repaints and emits `preset:change` with null.
   * @returns {Promise<void>}
   */
  async clearPreset() {
    const active = this.getActivePreset();
    if (active) {
      this._clearPresetParams(active);
      await this.applyFilters();
    }
    this.renderFilterPresets();
    this.emit('preset:change', null);
  }

  /**
   * Toolbar action — apply/toggle a preset from its segment button.
   */
  async onActionApplyPreset(event, element) {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    const key = element?.getAttribute('data-preset-key');
    if (!key) return;
    await this.applyPreset(key);
  }

  /**
   * Fill the `filter-presets` container with the joined segment, painting
   * the derived-active button as `btn-primary`. innerHTML re-render pattern
   * mirroring `updateFilterPills`. No-op when presets aren't configured or
   * the container isn't in the DOM yet.
   */
  renderFilterPresets() {
    if (!this.filterPresets || this.filterPresets.length === 0) return;
    const container = this.element?.querySelector('[data-container="filter-presets"]');
    if (!container) return;
    container.innerHTML = this._buildPresetSegment();
  }

  /**
   * Build the joined `btn-group btn-sm preset-segment` markup with the
   * active button styled `btn-primary` (derived from param matching).
   * @private
   */
  _buildPresetSegment() {
    const active = this.getActivePreset();
    const activeKey = active ? active.key : null;

    const buttons = this.filterPresets.map((preset) => {
      const isActive = preset.key === activeKey;
      const cls = isActive ? 'btn btn-primary' : 'btn btn-outline-secondary';
      const icon = preset.icon ? `<i class="bi ${this.escapeHtml(preset.icon)}"></i> ` : '';
      const titleAttr = preset.description ? ` title="${this.escapeHtml(preset.description)}"` : '';
      return `<button type="button"
                      class="${cls}"
                      data-action="apply-preset"
                      data-preset-key="${this.escapeHtml(preset.key)}"
                      aria-pressed="${isActive ? 'true' : 'false'}"${titleAttr}>${icon}${this.escapeHtml(preset.label)}</button>`;
    }).join('');

    return `<div class="btn-group btn-group-sm preset-segment" role="group" aria-label="Filter presets">${buttons}</div>`;
  }

  /**
   * Inline `<style>` for the preset segment. Token-based (auto-tracks both
   * themes); the single scrollbar-thumb literal carries its dark companion.
   * Emitted once from the toolbar template (only when presets exist).
   * @private
   */
  _buildPresetStyle() {
    return `
      <style>
        .preset-segment .btn {
          --bs-btn-padding-y: 0.25rem;
          --bs-btn-padding-x: 0.6rem;
          font-size: 0.8125rem;
          font-weight: 500;
        }
        .preset-segment .btn .bi { font-size: 0.8rem; }

        /* Touch: bump the tap target only on coarse pointers — desktop stays compact. */
        @media (pointer: coarse) {
          .preset-segment .btn {
            --bs-btn-padding-y: 0.5rem;
            --bs-btn-padding-x: 0.85rem;
          }
        }

        /* 5+ presets: own row, scroll horizontally instead of wrapping. */
        .preset-scroll {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: thin;
          padding-bottom: 0.2rem;
        }
        .preset-scroll .btn-group { flex-wrap: nowrap; }
        .preset-scroll .btn { white-space: nowrap; }
        .preset-scroll::-webkit-scrollbar { height: 6px; }
        .preset-scroll::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.15);
          border-radius: 999px;
        }
        [data-bs-theme="dark"] .preset-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.12);
        }
      </style>
    `;
  }

  // ============================================================
  // Live stat strip (WM-037)
  //
  // `stats: [{ key, label, params, critical?, description? }]` renders an
  // inset grouped track above the toolbar. Each block carries a live count
  // computed SERVER-SIDE under the table's current filters, and clicking one
  // applies its param bundle through the same rails as a filter preset
  // (mutual exclusion, toggle-off, derived active state, `'@me'` resolution).
  //
  // Wire contract (django-mojo DM-051): one batched GET against the list
  // endpoint with the current filter params plus `_mode=count` and
  // `_stats=<json {key: params}>`. The response body is FLAT —
  // `resp.data.{count, stats, took_ms}` — with NO `.data.data` nesting; that
  // path returns `JsonResponse(body)` rather than `response.success(data)`,
  // so `.claude/rules/api.md`'s "commonly at resp.data.data" does not apply.
  // ============================================================

  /**
   * Normalize the `stats:` option into a clean array of
   * `{ key, label, params, critical, description }`. Drops entries without a
   * `key`; warns on (and drops) duplicate keys, entries past
   * `STATS_MAX_BUNDLES`, and a second `critical` flag. Returns `[]` when the
   * option is absent / empty so the whole feature stays inert.
   * @private
   */
  _normalizeStats(raw) {
    if (!Array.isArray(raw) || raw.length === 0) return [];
    const seen = new Set();
    const stats = [];
    let criticalTaken = false;
    raw.forEach((s) => {
      if (!s || !s.key) return;
      if (seen.has(s.key)) {
        console.warn(`ListView: duplicate stats key '${s.key}' — ignoring the later one.`);
        return;
      }
      if (stats.length >= ListView.STATS_MAX_BUNDLES) {
        console.warn(`ListView: stats is capped at ${ListView.STATS_MAX_BUNDLES} bundles — dropping '${s.key}'.`);
        return;
      }
      seen.add(s.key);
      let critical = s.critical === true;
      if (critical && criticalTaken) {
        console.warn(`ListView: only one stats entry may be 'critical' — dropping the flag on '${s.key}'.`);
        critical = false;
      }
      if (critical) criticalTaken = true;
      stats.push({
        key: s.key,
        label: s.label || s.key,
        params: (s.params && typeof s.params === 'object') ? s.params : {},
        critical,
        description: s.description || null
      });
    });
    return stats;
  }

  /** @private */
  _getStat(key) {
    return this.stats.find((s) => s.key === key) || null;
  }

  /**
   * The currently-active stat, or null. Derived by the same
   * most-specific-match rule as `getActivePreset()`. A stat with an empty
   * bundle (the "All" chip) can never match — it paints active precisely
   * when this returns null.
   * @returns {object|null}
   */
  getActiveStat() {
    return this._getActiveBundle(this.stats);
  }

  /**
   * Delete every param key a bundle owns from a plain params object,
   * mirroring BOTH branches of `setFilter()` — the daterange branch
   * (`dr_start` / `dr_end` / `dr_field`) and the plain-key branch
   * (`key` / `field` / `field__in`).
   *
   * This has to agree with `setFilter` exactly: `_clearPresetParams()` goes
   * *through* `setFilter`, so a bundle keyed on a registered daterange filter
   * clears the `dr_*` triple on click. If the base params for the count
   * request dropped only the plain triple, the chip's count and the
   * post-click table count would disagree for exactly that case.
   * @private
   */
  _deleteBundleKeys(target, bundle) {
    const resolved = this._resolvePresetParams(bundle);
    Object.keys(resolved).forEach((key) => {
      const filterConfig = this.getFilterConfig(key);
      if (filterConfig && filterConfig.type === 'daterange') {
        delete target[filterConfig.startName || 'dr_start'];
        delete target[filterConfig.endName || 'dr_end'];
        delete target[filterConfig.fieldName || 'dr_field'];
      } else {
        const { field } = parseFilterKey(key);
        delete target[key];
        delete target[field];
        delete target[`${field}__in`];
      }
    });
  }

  /**
   * Params every bundle's count is computed under: the collection's raw
   * params minus paging/sort, minus the ACTIVE stat's own keys.
   *
   * The exclusion is what makes "a chip's count equals the row count you get
   * after clicking it" true. The server ANDs each bundle onto the base query,
   * but the UI applies bundles with mutual exclusion — clicking `high` first
   * clears `open`. Leaving `status=open` in the base would advertise
   * `open AND high` for a click that yields `high` alone.
   *
   * Raw `collection.params` on purpose, not `getActiveFilters()` — the latter
   * synthesizes a `{key: {start, end}}` object for dateranges, which is not a
   * wire param.
   * @private
   */
  _statsBaseParams() {
    const params = { ...(this.collection?.params || {}) };
    delete params.start;
    delete params.size;
    delete params.sort;
    const active = this.getActiveStat();
    if (active) this._deleteBundleKeys(params, active);
    return params;
  }

  /**
   * `{ [stat.key]: resolvedParams }` — the `_stats` payload. Built through
   * `_resolvePresetParams` so `'@me'` behaves identically in a count and in
   * the click that applies the same bundle.
   * @private
   */
  _buildStatsBundleMap() {
    const map = {};
    this.stats.forEach((stat) => { map[stat.key] = this._resolvePresetParams(stat); });
    return map;
  }

  /**
   * Debounced recount. Collapses a burst of `params-changed` events into one
   * request. The timer self-terminates when the view is no longer mounted
   * (cached-page `unmount()` never reaches a child's `onBeforeUnmount`).
   * @param {{force?: boolean}} [options] `force` bypasses the signature memo —
   *   used by auto-refresh, which wants a recount on unchanged params.
   * @private
   */
  _scheduleStatsRefresh(options = {}) {
    if (!this.stats || this.stats.length === 0) return;
    if (!this._statsSupported) return;
    if (this._statsTimer) clearTimeout(this._statsTimer);
    this._statsTimer = setTimeout(() => {
      this._statsTimer = null;
      if (!this.isMounted()) { this._stopStatsRefresh(); return; }
      this._fetchStatCounts(options);
    }, this._statsDebounceMs);
  }

  /** Cancel any pending recount and abort an in-flight one. @private */
  _stopStatsRefresh() {
    if (this._statsTimer) {
      clearTimeout(this._statsTimer);
      this._statsTimer = null;
    }
    if (this._statsAbort) {
      try { this._statsAbort.abort(); } catch { /* already aborted */ }
      this._statsAbort = null;
    }
  }

  /**
   * Issue one batched count request and paint the result.
   *
   * Superseded responses are dropped by a monotonic generation counter — the
   * `AbortController` is best-effort only (`Rest` merges the external signal
   * with its timeout signal via `AbortSignal.any`, and falls back to the
   * TIMEOUT signal where that isn't implemented).
   * @private
   */
  async _fetchStatCounts(options = {}) {
    if (!this.stats || this.stats.length === 0) return;
    if (!this._statsSupported) return;
    const collection = this.collection;
    if (!collection || !collection.restEnabled || !collection.rest) return;

    const base = this._statsBaseParams();
    const bundles = this._buildStatsBundleMap();
    const signature = JSON.stringify([base, bundles]);

    // Signature memo: `params-changed` also fires for page / page-size / sort
    // changes, and those mutate only the keys `_statsBaseParams()` strips —
    // the request would be byte-identical while costing the server one COUNT
    // per bundle. Checked BEFORE the generation bump so a memo hit can never
    // invalidate an in-flight seed request.
    if (!options.force && signature === this._statsSig) {
      this.renderStatStrip();
      return;
    }

    const generation = ++this._statsGeneration;
    if (this._statsAbort) {
      try { this._statsAbort.abort(); } catch { /* already aborted */ }
    }
    const controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    this._statsAbort = controller;
    this._statsSig = signature;

    let response;
    try {
      response = await collection.rest.GET(collection.buildUrl(), {
        ...base,
        size: 1,           // insurance on a pre-aggregation server; inert on a current one
        _mode: 'count',
        _stats: JSON.stringify(bundles)
      }, { signal: controller?.signal });
    } catch (err) {
      if (this._statsAbort === controller) this._statsAbort = null;
      if (generation !== this._statsGeneration) return;   // superseded / aborted
      this._degradeStats({ warn: err });
      return;
    }
    if (this._statsAbort === controller) this._statsAbort = null;
    if (generation !== this._statsGeneration) return;      // superseded

    const body = response ? response.data : null;

    // No aggregation route at all — latch off, silently.
    if (response && response.status === 404) {
      this._statsSupported = false;
      this._degradeStats();
      return;
    }
    if (!response || response.success === false) {
      this._degradeStats({ warn: response });
      return;
    }
    // A pre-aggregation server does NOT error on `_mode` / `_stats` — unknown
    // filter keys are silently dropped, so it answers 200 with an ordinary
    // list page and no `stats` key. Without this latch every filter change
    // would pull a full row page forever.
    if (!body || typeof body !== 'object' || !body.stats || typeof body.stats !== 'object') {
      this._statsSupported = false;
      this._degradeStats();
      return;
    }

    this._statCounts = { ...body.stats };
    this._statTotal = typeof body.count === 'number' ? body.count : null;
    this.renderStatStrip();
  }

  /**
   * Drop the counts back to "unknown" and repaint. `warn` (when given) logs
   * at most once per view instance — a failing endpoint must not spam the
   * console once per filter change.
   * @private
   */
  _degradeStats({ warn } = {}) {
    this._statCounts = {};
    this._statTotal = null;
    if (warn !== undefined) {
      this._statsSig = null;   // a transient failure may retry on the next change
      if (!this._statsWarned) {
        this._statsWarned = true;
        console.warn('ListView stats: live count request failed — showing em-dashes.', warn);
      }
    }
    this.renderStatStrip();
  }

  /**
   * Count to display for one stat: a number, or null for "unknown" (renders
   * as an em-dash). `0` is information and renders as `0`.
   * @private
   */
  _statCountFor(stat) {
    const isAllChip = Object.keys(this._resolvePresetParams(stat)).length === 0;
    if (isAllChip && typeof this._statTotal === 'number') return this._statTotal;
    const value = this._statCounts ? this._statCounts[stat.key] : undefined;
    return typeof value === 'number' ? value : null;
  }

  /**
   * Apply a stat's bundle by key. An empty bundle is the "All" chip and
   * clears instead; re-clicking the active stat toggles it off. Otherwise the
   * previously-active stat's params are dropped first (mutual exclusion).
   * @param {string} key
   * @returns {Promise<boolean>} false when the key is unknown.
   */
  async applyStat(key) {
    const stat = this._getStat(key);
    if (!stat) return false;

    const resolved = this._resolvePresetParams(stat);

    // The "All" chip — an empty bundle means "no stat scoping".
    if (Object.keys(resolved).length === 0) {
      await this.clearStat();
      return true;
    }

    const active = this.getActiveStat();
    if (active && active.key === stat.key) {
      await this.clearStat();
      return true;
    }

    if (active) this._clearPresetParams(active);
    Object.keys(resolved).forEach((k) => this.setFilter(k, resolved[k]));

    await this.applyFilters();       // start = 0 + fetch + pills + params-changed
    this.renderStatStrip();          // repaint derived active state
    this.emit('stat:change', { key: stat.key, params: resolved });
    return true;
  }

  /**
   * Clear the active stat's params. No-op when nothing is active, but still
   * repaints and emits `stat:change` with null.
   * @returns {Promise<void>}
   */
  async clearStat() {
    const active = this.getActiveStat();
    if (active) {
      this._clearPresetParams(active);
      await this.applyFilters();
    }
    this.renderStatStrip();
    this.emit('stat:change', null);
  }

  /** Toolbar action — apply/toggle a stat from its block. */
  async onActionApplyStat(event, element) {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    const key = element?.getAttribute('data-stat-key');
    if (!key) return;
    await this.applyStat(key);
  }

  /**
   * Fill the `stat-strip` container with the current counts + derived active
   * state. Repaints ONLY its own container (the composition contract every
   * toolbar sub-feature follows) and no-ops when stats aren't configured or
   * the container isn't in the DOM yet.
   */
  renderStatStrip() {
    if (!this.stats || this.stats.length === 0) return;
    const container = this.element?.querySelector('[data-container="stat-strip"]');
    if (!container) return;
    container.innerHTML = this._buildStatStrip();
  }

  /**
   * Variant B (approved): an inset grouped track; the active stat is a raised
   * NEUTRAL pill, never a colored fill. A degraded block is a `<div>`, not a
   * `<button>` — inert without needing a disabled handler.
   * @private
   */
  _buildStatStrip() {
    const active = this.getActiveStat();
    const activeKey = active ? active.key : null;

    const blocks = this.stats.map((stat) => {
      const count = this._statCountFor(stat);
      const degraded = count === null;
      const isAllChip = Object.keys(this._resolvePresetParams(stat)).length === 0;
      const isActive = isAllChip ? activeKey === null : stat.key === activeKey;
      const titleAttr = stat.description ? ` title="${this.escapeHtml(stat.description)}"` : '';
      // The entire color budget: one 6px dot on the single critical stat, and
      // only while it actually has something in it.
      const dot = (stat.critical && typeof count === 'number' && count > 0)
        ? '<span class="mojo-stat-dot"></span>'
        : '';
      const value = degraded ? '&mdash;' : this.escapeHtml(String(count));
      const label = `<span class="mojo-stat-block__label">${dot}${this.escapeHtml(stat.label)}</span>`;
      const countHtml = `<span class="mojo-stat-block__count">${value}</span>`;

      if (degraded) {
        return `<div class="mojo-stat-block mojo-stat-block--degraded"
                     data-stat-key="${this.escapeHtml(stat.key)}"
                     aria-disabled="true"
                     title="Live count unavailable">${countHtml}${label}</div>`;
      }
      return `<button type="button"
                      class="mojo-stat-block${isActive ? ' is-active' : ''}"
                      data-action="apply-stat"
                      data-stat-key="${this.escapeHtml(stat.key)}"
                      aria-pressed="${isActive ? 'true' : 'false'}"${titleAttr}>${countHtml}${label}</button>`;
    }).join('');

    return `<div class="mojo-stat-strip" role="group" aria-label="Stat filters">${blocks}</div>`;
  }

  /**
   * Inline `<style>` for the stat strip. Token-based so both themes track
   * automatically; the few literals (hover tints, the active pill's shadow,
   * the dark dot) carry explicit `[data-bs-theme="dark"]` companions, all
   * clustered at the end per `.claude/rules/theming.md`.
   *
   * NOTE: deliberately no `scrollbar-width` declaration — the preset segment
   * owns the single `scrollbar-width: thin` in this file and a composition
   * test pins that count. The rail styles its scrollbar with
   * `scrollbar-color` + the `::-webkit-scrollbar` rules instead.
   *
   * Pure: `super()` runs `buildToolbarTemplate()` twice while a TableView is
   * being constructed and discards the first result.
   * @private
   */
  _buildStatStripStyle() {
    return `
      <style>
        .mojo-stat-strip {
          display: flex;
          align-items: stretch;
          overflow-x: auto;
          white-space: nowrap;
          gap: 0.25rem;
          padding: 0.375rem;
          background: var(--bs-tertiary-bg);
          border: 1px solid var(--bs-border-color-translucent);
          border-radius: 0.875rem;
          scrollbar-color: var(--bs-border-color) transparent;
        }
        .mojo-stat-strip::-webkit-scrollbar { height: 6px; }
        .mojo-stat-strip::-webkit-scrollbar-thumb {
          background: var(--bs-border-color);
          border-radius: 3px;
        }

        .mojo-stat-block {
          flex: 0 0 auto;
          display: inline-flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 0.125rem;
          padding: 0.5rem 1.375rem;
          background: transparent;
          border: 0;
          border-radius: 0.5rem;
          color: var(--bs-body-color);
          text-align: left;
          cursor: pointer;
          user-select: none;
          transition: background-color .18s ease, box-shadow .18s ease, color .18s ease;
        }
        .mojo-stat-block:focus-visible {
          outline: 2px solid var(--bs-primary);
          outline-offset: -2px;
        }

        /* Typography carries the hierarchy — no boxes, borders or fills. */
        .mojo-stat-block__count {
          font-size: 1.4375rem;
          font-weight: 600;
          line-height: 1.15;
          letter-spacing: -0.02em;
          font-variant-numeric: tabular-nums;
          color: var(--bs-emphasis-color);
        }
        .mojo-stat-block__label {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          font-size: 0.8125rem;
          font-weight: 400;
          line-height: 1.2;
          color: var(--bs-secondary-color);
        }

        /* The whole color budget: one status dot on the critical stat. */
        .mojo-stat-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--bs-danger);
          flex: 0 0 auto;
        }

        /* Active = a raised NEUTRAL pill lifting off the rail, never color. */
        .mojo-stat-strip .mojo-stat-block:hover:not(.is-active):not(.mojo-stat-block--degraded) {
          background: rgba(0, 0, 0, 0.035);
        }
        .mojo-stat-strip .mojo-stat-block.is-active {
          background: var(--bs-body-bg);
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.10), 0 0 0 0.5px rgba(0, 0, 0, 0.05);
        }

        /* Count unavailable → muted em-dash, non-interactive. */
        .mojo-stat-block--degraded { cursor: default; opacity: 0.6; }
        .mojo-stat-block--degraded .mojo-stat-block__count {
          color: var(--bs-secondary-color);
          font-weight: 500;
        }

        @media (prefers-reduced-motion: reduce) {
          .mojo-stat-block { transition: none; }
        }

        /* ---- dark theme ---- */
        [data-bs-theme="dark"] .mojo-stat-dot { background: #ff6b7d; }
        [data-bs-theme="dark"] .mojo-stat-strip .mojo-stat-block:hover:not(.is-active):not(.mojo-stat-block--degraded) {
          background: rgba(255, 255, 255, 0.03);
        }
        [data-bs-theme="dark"] .mojo-stat-strip .mojo-stat-block.is-active {
          background: var(--bs-secondary-bg);
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.55), inset 0 0 0 0.5px rgba(255, 255, 255, 0.05);
        }
      </style>
    `;
  }

  /**
   * Compact, quiet auto-refresh indicator for the toolbar right-group: a
   * muted `bi-arrow-repeat` icon with no button chrome and no text label. The
   * icon is `aria-hidden`; a visually-hidden span carries the text
   * alternative for assistive tech. `_pulseAutoRefreshIndicator()` adds the
   * `is-refreshing` class on each successful tick to fire a brief spin.
   * @private
   */
  _buildAutoRefreshIndicatorSlot() {
    const secs = Math.round(this._autoRefreshMs / 1000);
    const label = `Auto-refresh: ${secs}s`;
    return `<span class="mojo-autorefresh-indicator" data-autorefresh-indicator title="${this.escapeHtml(label)}">
              <i class="bi bi-arrow-repeat" aria-hidden="true"></i>
              <span class="visually-hidden">${this.escapeHtml(label)}</span>
            </span>`;
  }

  /**
   * Inline `<style>` for the auto-refresh indicator. Muted via
   * `--bs-secondary-color` (auto-tracks both themes — no literals). The spin
   * animation only plays while `is-refreshing` is set and is suppressed under
   * `prefers-reduced-motion`. Emitted once, only when the indicator renders.
   * @private
   */
  _buildAutoRefreshIndicatorStyle() {
    return `
      <style>
        .mojo-autorefresh-indicator {
          display: inline-flex;
          align-items: center;
          color: var(--bs-secondary-color);
          font-size: 0.9rem;
          line-height: 1;
        }
        .mojo-autorefresh-indicator .bi { display: block; }
        .mojo-autorefresh-indicator.is-refreshing .bi {
          animation: mojo-autorefresh-spin 0.6s ease;
        }
        @keyframes mojo-autorefresh-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .mojo-autorefresh-indicator.is-refreshing .bi { animation: none; }
        }
      </style>
    `;
  }

  /**
   * Flash the toolbar auto-refresh indicator: add the `is-refreshing` class
   * (fires the CSS spin) and strip it after ~600ms. Coalesces rapid ticks by
   * resetting its own timer; a no-op when the indicator isn't in the DOM.
   * @private
   */
  _pulseAutoRefreshIndicator() {
    const el = this.element?.querySelector('[data-autorefresh-indicator]');
    if (!el) return;
    el.classList.add('is-refreshing');
    if (this._autoRefreshPulseTimer) clearTimeout(this._autoRefreshPulseTimer);
    this._autoRefreshPulseTimer = setTimeout(() => {
      el.classList.remove('is-refreshing');
      this._autoRefreshPulseTimer = null;
    }, 600);
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
    // Render each item synchronously so its onAfterRender (which wires
    // the clickable handler, etc.) has fully run by the time the parent's
    // render() resolves. Items are kept in the `itemViews` Map, not the
    // standard child registry, so we drive their render directly.
    //
    // When grouping is configured, walk the precomputed `_renderOrder` to
    // interleave header views with item views in the correct DOM order.
    // Otherwise, fall through to the lighter forEachItem walk (zero
    // behavior change for non-grouped consumers).
    const renders = [];
    if (this._renderOrder.length > 0) {
      for (const entry of this._renderOrder) {
        itemsContainer.appendChild(entry.view.element);
        renders.push(Promise.resolve(entry.view.render(false)).catch(() => {}));
      }
    } else {
      this.forEachItem((item) => {
        itemsContainer.appendChild(item.element);
        renders.push(Promise.resolve(item.render(false)).catch(() => {}));
      });
    }
    await Promise.all(renders);
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
    this._buildGroupHeaders();

    this.emit('list:loaded', { count: this.collection.length() });

    if (this.isMounted()) {
      this.render();
    }
  }

  /**
   * Walk the collection in render order, run `groupBy`, and build the
   * `_renderOrder` array of `{ type: 'item' | 'header', view }` entries.
   *
   * No-op when `groupBy` isn't configured — `_renderChildren` falls back to
   * the lighter `forEachItem` walk for non-grouped consumers.
   *
   * Falsy resolver returns are treated as "ungrouped tail" — the item is
   * pushed without emitting a header, so the prior group's section
   * continues visually.
   *
   * @private
   */
  _buildGroupHeaders() {
    this.groupHeaderViews.forEach((headerView) => this.removeChild(headerView.id));
    this.groupHeaderViews.clear();
    this._renderOrder.length = 0;

    if (!this.groupBy || !this.collection || this.collection.isEmpty()) return;

    const resolver = typeof this.groupBy === 'function'
      ? this.groupBy
      : (model) => model.get(this.groupBy);

    let prevKey;
    let prevKeySet = false;

    this.collection.forEach((model, index) => {
      const itemView = this.itemViews.get(model.id);
      if (!itemView) return;

      let rawKey;
      try {
        rawKey = resolver(model);
      } catch (err) {
        console.warn('ListView: groupBy resolver threw — treating as ungrouped tail', err);
        rawKey = null;
      }

      if (rawKey && (!prevKeySet || rawKey !== prevKey)) {
        const headerView = this._createGroupHeaderView(model, rawKey, index);
        this._renderOrder.push({ type: 'header', view: headerView });
        prevKey = rawKey;
        prevKeySet = true;
      }
      this._renderOrder.push({ type: 'item', view: itemView });
    });
  }

  /**
   * Build (or rebuild) the group-header markers. Public-ish hook called by
   * `_onModelsAdded` after Show More appends, so the appended page's first
   * item gets (or doesn't get) a header against the prior tail correctly.
   * @private
   */
  _rebuildGroupHeaders() {
    this._buildGroupHeaders();
  }

  /**
   * Create a ListGroupHeaderView for the given trigger model and raw key.
   * Subclasses (TableView) override to inject `tagName: 'tr'` + `colspan`.
   * @private
   */
  _createGroupHeaderView(model, key, index) {
    const displayKey = this.groupHeaderLabel ? this.groupHeaderLabel(key) : key;
    const headerView = new this.groupHeaderClass({
      template: this.groupHeaderTemplate || this._defaultGroupHeaderTemplate(),
      model,
      key: displayKey,
      index,
      ...this._groupHeaderViewOptions(model, key, index)
    });
    this.groupHeaderViews.set(headerView.id, headerView);
    return headerView;
  }

  /**
   * Subclass hook for extra constructor options on the header view (TableView
   * uses this to set `tagName: 'tr'`, `colspan`, and the table-shape modifier
   * className). Default: applies the `.list-group-header--<style>` modifier
   * for the configured `groupHeaderStyle`.
   * @protected
   */
  _groupHeaderViewOptions(_model, _key, _index) {
    return {
      className: `list-group-header list-group-header--${this.groupHeaderStyle}`
    };
  }

  /**
   * Default Mustache template used when the consumer doesn't pass
   * `groupHeaderTemplate`. ListView default is the bare display key — the
   * outer `<div class="list-group-header">` wrapper comes from
   * ListGroupHeaderView's tagName + className. TableView overrides to emit
   * a `<th colspan="...">` cell so the framework-provided `<tr>` is full-width.
   * @protected
   */
  _defaultGroupHeaderTemplate() {
    return '{{key}}';
  }

  _createItemView(model, index) {
    if (this.itemViews.has(model.id)) return this.itemViews.get(model.id);

    const itemView = new this.itemClass({
      model: model,
      index: index,
      listView: this,
      template: this.itemTemplate,
      clickable: this.clickable
    });

    this.itemViews.set(model.id, itemView);
    this._wireItemViewListeners(itemView);

    return itemView;
  }

  /**
   * Wire the standard event listeners (select, click, view/edit/delete)
   * on a freshly-created item view. Factored out so subclasses (TableView)
   * can call this from their own _createItemView override.
   *
   * Two event names funnel into the same routing logic:
   *   - `item:click` with action 'row-click' (from ListViewItem's
   *     whole-row click handler) — re-emitted as `row:click` on the
   *     parent ListView.
   *   - `row:click` (from TableRow's `data-action="row-click"` handler,
   *     which already emits the event on `this` directly) — NOT
   *     re-emitted here, just routed.
   *
   * @protected
   */
  _wireItemViewListeners(itemView) {
    itemView.on('item:select', this._onItemSelect.bind(this));
    itemView.on('item:deselect', this._onItemDeselect.bind(this));

    itemView.on('item:click', (event) => {
      // ListViewItem.onActionDefault also emits `item:click` for any
      // unhandled `data-action`. Ignore those — only the whole-row click
      // flagged with action 'row-click' should route to the click flow.
      if (event.action !== 'row-click') return;
      this.emit('row:click', event);
      this._dispatchRowClick(event);
    });

    itemView.on('row:click', (event) => {
      // TableRow already emits row:click on `this` (the listView/tableView)
      // directly — don't double-emit, just route.
      this._dispatchRowClick(event);
    });

    // Model-lifecycle row events fired from data-action="view|edit|delete"
    // buttons inside the item template (and TableRow's own action buttons).
    itemView.on('row:view', this._onRowView.bind(this));
    itemView.on('row:edit', this._onRowEdit.bind(this));
    itemView.on('row:delete', this._onRowDelete.bind(this));
  }

  /**
   * Routing logic for a whole-row click. Order:
   *   1. options.onRowClick(model, event) — full override
   *   2. clickAction is a function — call it
   *   3. onItemClick(model, event) — callback shorthand
   *   4. clickAction === 'view' — open view dialog
   *   5. clickAction === 'edit' — open edit dialog
   *   6. clickAction === 'select' — toggle selection
   *   7. 'none' (default) — no-op (event was already emitted by caller)
   * @private
   */
  _dispatchRowClick(event) {
    if (typeof this.options.onRowClick === 'function') {
      return this.options.onRowClick(event.model, event.event);
    }

    if (typeof this.clickAction === 'function') {
      return this.clickAction(event.model, event.event);
    }

    if (this.onItemClick) {
      return this.onItemClick(event.model, event.event);
    }

    if (this.clickAction === 'view') {
      return this._onRowView(event);
    }
    if (this.clickAction === 'edit') {
      return this._onRowEdit(event);
    }
    if (this.clickAction === 'select') {
      if (this.selectedItems.has(event.model.id)) {
        this.deselectItem(event.model.id);
      } else {
        this.selectItem(event.model.id);
      }
    }
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
    this.groupHeaderViews.forEach((headerView) => this.removeChild(headerView.id));
    this.groupHeaderViews.clear();
    this._renderOrder.length = 0;
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
    // Rebuild the grouping pass against the now-larger collection so the
    // appended page's first item gets (or doesn't get) a header against
    // the prior tail correctly. No-op for non-grouped consumers.
    if (this.groupBy) this._rebuildGroupHeaders();

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
    // During a Show More fetch, onActionShowMore owns the render lifecycle
    // (it renders to show "Loading…" on the button and again after the
    // fetch resolves). Rendering here would replace the existing items
    // with the full-list spinner AND race with the post-fetch render —
    // canRender() drops the second one as a no-op, leaving the button
    // stuck on "Loading…".
    if (this.loadingMore) return;
    if (this.isMounted()) this.render();
  }

  _onFetchEnd() {
    this.loading = false;
    if (this.loadingMore) return;
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
  // Row stripe (severity-coded left-edge color)
  // ============================================================

  /**
   * Resolve the row-stripe class for a given model. Returns null when no
   * `rowStripe` callback is set, when the callback returns falsy/empty,
   * or when it throws. Bootstrap variant tokens in
   * `ListView.ROW_STRIPE_TOKENS` map to `list-row-stripe-<token>`; any
   * other non-empty string passes through as a class name.
   *
   * @private
   */
  _stripeClassFor(model) {
    if (!this.rowStripe || !model) return null;
    let raw;
    try {
      raw = this.rowStripe(model);
    } catch (err) {
      console.warn('ListView: rowStripe callback threw — treating as no stripe', err);
      return null;
    }
    if (raw === null || raw === undefined || raw === '') return null;
    if (typeof raw !== 'string') return null;
    if (ListView.ROW_STRIPE_TOKENS.includes(raw)) {
      return `list-row-stripe-${raw}`;
    }
    return raw;
  }

  /**
   * Strip any existing `list-row-stripe*` class from the itemView's
   * element, then apply the freshly-resolved class (if any). Called from
   * ListViewItem.onAfterRender so the stripe re-evaluates on every row
   * render — including the implicit re-renders View triggers when the
   * model emits `change`.
   *
   * @private
   */
  _applyRowStripe(itemView) {
    if (!itemView || !itemView.element) return;
    const classes = itemView.element.classList;
    // Remove any prior stripe class so the row reflects current state
    // even when the level/decision downgrades.
    for (const cls of Array.from(classes)) {
      if (cls.startsWith('list-row-stripe')) classes.remove(cls);
    }
    const next = this._stripeClassFor(itemView.model);
    if (next) {
      try {
        classes.add(next);
      } catch (err) {
        // DOMException for invalid class names (e.g. strings containing
        // whitespace). Don't break the render — just skip the stripe.
        console.warn('ListView: rowStripe returned an invalid class name, skipping', next, err);
      }
    }
  }

  /**
   * Re-evaluate the row stripe for every current itemView. Useful when
   * the callback depends on state outside the model (parent filter,
   * threshold, etc.) — call this from the consumer's own event hook
   * after the external state changes.
   *
   * No-op when no `rowStripe` callback is configured.
   */
  refreshStripes() {
    if (!this.rowStripe) return this;
    this.forEachItem((itemView) => this._applyRowStripe(itemView));
    return this;
  }

  // ============================================================
  // Row change flash — per-row feedback for `autoRefresh: { mode: 'models' }`
  // ============================================================

  /**
   * True when changed rows should flash. Requires auto-refresh to be on, so a
   * list that never refreshes carries none of this CSS.
   * @private
   */
  _rowFlashEnabled() {
    return this._autoRefreshMs > 0 && this._autoRefreshFlash === true;
  }

  /**
   * One-time `<style>` block for the changed-row flash. Emitted only when
   * `_rowFlashEnabled()`.
   *
   * The tint animates **`background-image`**, not `background-color` and not
   * `box-shadow`:
   *   - Bootstrap paints table cells with `background-color` plus an
   *     `inset 0 0 0 9999px` box-shadow for striped/hover, so a plain
   *     `background-color` on the `<tr>` never shows through;
   *   - `box-shadow` is already owned by the `rowStripe` severity bar
   *     (`inset 4px 0 0` on `td:first-child`), and keyframes sit in the
   *     animation cascade origin — which outranks normal author declarations —
   *     so animating it would erase the severity bar for the whole flash.
   * A `background-image` gradient paints under the inset shadow, so both
   * features coexist. The element-level rule covers the non-table ListView case
   * (whose stripes use `border-left`, unaffected either way).
   *
   * `prefers-reduced-motion` drops the animation entirely — no feedback rather
   * than motion, the same trade the auto-refresh indicator already makes.
   * @private
   */
  _buildRowFlashStyles() {
    return `
      <style>
        .mojo-row-flash,
        .mojo-row-flash > td,
        .mojo-row-flash > th { animation: mojo-row-flash-fade 1.2s ease-out; }
        @keyframes mojo-row-flash-fade {
          0%   { background-image: linear-gradient(rgba(var(--bs-primary-rgb), 0.18), rgba(var(--bs-primary-rgb), 0.18)); }
          100% { background-image: linear-gradient(rgba(var(--bs-primary-rgb), 0), rgba(var(--bs-primary-rgb), 0)); }
        }
        [data-bs-theme="dark"] .mojo-row-flash,
        [data-bs-theme="dark"] .mojo-row-flash > td,
        [data-bs-theme="dark"] .mojo-row-flash > th { animation-name: mojo-row-flash-fade-dark; }
        @keyframes mojo-row-flash-fade-dark {
          0%   { background-image: linear-gradient(rgba(var(--bs-primary-rgb), 0.30), rgba(var(--bs-primary-rgb), 0.30)); }
          100% { background-image: linear-gradient(rgba(var(--bs-primary-rgb), 0), rgba(var(--bs-primary-rgb), 0)); }
        }
        @media (prefers-reduced-motion: reduce) {
          .mojo-row-flash,
          .mojo-row-flash > td,
          .mojo-row-flash > th { animation: none; }
        }
      </style>
    `;
  }

  /**
   * Flash one row by id. Removing the class and forcing a reflow before
   * re-adding it restarts the animation, so a row that changes again inside
   * its own flash window re-fires instead of sitting still. The removal timer
   * is tracked per id (re-armed on repeat) and cleared by `_stopAutoRefresh`.
   * @private
   */
  _flashRow(id) {
    if (!this._rowFlashEnabled()) return;
    const itemView = this.itemViews.get(id);
    const el = itemView && itemView.element;
    if (!el) return;

    el.classList.remove('mojo-row-flash');
    void el.offsetWidth; // force reflow so the animation restarts
    el.classList.add('mojo-row-flash');

    const existing = this._rowFlashTimers.get(id);
    if (existing) clearTimeout(existing);
    this._rowFlashTimers.set(id, setTimeout(() => {
      el.classList.remove('mojo-row-flash');
      this._rowFlashTimers.delete(id);
    }, ListView.ROW_FLASH_MS));
  }

  /**
   * Flash every row reported as changed by `Collection.refreshModels()`.
   * @param {Map<*, string[]>} changed - model id → changed attribute names.
   * @private
   */
  _flashChangedRows(changed) {
    if (!this._rowFlashEnabled() || !changed || changed.size === 0) return;
    changed.forEach((_keys, id) => this._flashRow(id));
  }

  // ============================================================
  // Model lifecycle (view / edit / delete / add)
  //
  // Inherited by TableView. Generic across list and table — none of
  // these methods touch columns, cells, or rows. They open the
  // standard MOJO Modal dialogs based on the model class's static
  // VIEW_CLASS / ADD_FORM / EDIT_FORM / DELETE_TEMPLATE / FORM_DIALOG_CONFIG
  // (with per-instance overrides via this.itemView / this.addForm /
  // this.editForm / this.deleteTemplate / this.formDialogConfig).
  //
  // The view dialog also honors a static DIALOG_OPTIONS on the
  // VIEW_CLASS itself, so a detail View can declare its own modal
  // size/presentation once instead of every page repeating it.
  // ============================================================

  /**
   * Handle the view action for a row/item.
   * Fires `row:view` event then opens the view dialog (or runs a custom
   * `onItemView(model, event)` override). Wired automatically when
   * clickAction: 'view' or when the item template has data-action="view".
   */
  async _onRowView(event) {
    this.emit('row:view', event);

    if (this.options.onItemView) {
      await this.options.onItemView(event.model, event.event);
      return;
    }

    if (this.fetchOnView) {
      try {
        Modal.loading();
        await event.model.fetch();
      } catch (error) {
        Modal.hideLoading(true);
        Modal.showError(error?.data?.error || error?.message || 'Failed to load item details');
        return;
      } finally {
        Modal.hideLoading(true);
      }
    }

    const ViewClass = this.getItemViewClass(event.model);

    if (ViewClass) {
      const viewInstance = new ViewClass({ model: event.model, collection: this.collection });
      await Modal.dialog({
        header: false,
        body: viewInstance,
        size: 'lg',
        centered: false,
        ...this.getFormDialogConfig(this.getModelClass(event.model)),
        // View class declares its own modal presentation (size, centered,
        // scrollable, …) via a static DIALOG_OPTIONS. Page-level
        // viewDialogOptions still wins as the final override.
        ...ViewClass.DIALOG_OPTIONS,
        ...this.viewDialogOptions
      });
    } else {
      await Modal.data({
        title: `View ${this.getModelName(event.model)} #${event.model.id}`,
        model: event.model
      });
    }
  }

  /**
   * Handle the edit action for a row/item.
   */
  async _onRowEdit(event) {
    this.emit('row:edit', event);

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

      const result = await Modal.modelForm({
        model: event.model,
        ...formConfig,
        ...this.getFormDialogConfig(ModelClass)
      });

      if (!result) return;

      if (!result.success || !result?.result?.data.status) {
        Modal.showError(result?.result?.data?.error || result?.result?.message || 'An error occurred');
        return;
      }
    } else {
      const result = await Modal.dialog({
        title: `Edit ${this.getModelName(event.model)} #${event.model.id}`,
        body: new FormView({
          model: event.model,
          fields: this.options.formFields || []
        })
      });

      if (result) {
        const resp = await event.model.save(result);
        if (!resp.data?.status) {
          Modal.showError(resp.data.error || 'An error occurred');
          return;
        }
        await this.refresh();
      }
    }
  }

  /**
   * Handle the delete action for a row/item.
   */
  async _onRowDelete(event) {
    this.emit('row:delete', event);

    if (this.options.onItemDelete) {
      await this.options.onItemDelete(event.model, event.event);
      return;
    }

    const ModelClass = this.getModelClass(event.model);
    const template = this.deleteTemplate ||
                    ModelClass?.DELETE_TEMPLATE ||
                    'Are you sure you want to delete this {{name||"item"}}?';

    const message = this.renderTemplateString(template, event.model);

    const confirmed = await Modal.confirm({
      message: message || 'Are you sure you want to delete this item?',
      title: 'Confirm Delete',
      confirmText: 'Delete',
      confirmClass: 'btn-danger'
    });

    if (confirmed) {
      await event.model.destroy();
      if (this.collection?.restEnabled) {
        this.collection.fetch();
      } else {
        this._buildItems();
      }
    }
  }

  /**
   * Handle the Add toolbar action — opens an Add dialog using addForm /
   * Model.ADD_FORM and saves the new model into the collection.
   */
  async onActionAdd(event, _element) {
    if (this.options.onAdd) {
      this.emit('list:add', { event });
      await this.options.onAdd(event);
      return;
    }

    this.emit('list:add', { event });

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

      const result = await Modal.form({
        model: model,
        ...formConfig,
        ...this.getFormDialogConfig(ModelClass)
      });

      if (result) {
        if (this.options.addRequiresActiveGroup) {
          result.group = this.getApp().activeGroup.id;
        }
        if (this.options.addRequiresActiveUser) {
          result.user = this.getApp().activeUser.id;
        }
        if (this.options.addFormDefaults) {
          Object.assign(result, this.options.addFormDefaults);
        }
        const resp = await model.save(result);
        if (!resp?.data.status) {
          Modal.showError(resp?.data.error || 'An error occurred');
          return;
        }
        if (this.collection) this.collection.add(model);
        await this.refresh();
      }
    } else {
      const model = new ModelClass();
      const result = await Modal.dialog({
        title: `Add ${this.getModelName()}`,
        body: new FormView({
          model: model,
          fields: this.options.formFields || []
        })
      });

      if (result) {
        const resp = await model.save(result);
        if (!resp?.data.status) {
          Modal.showError(resp.data.error || 'An error occurred');
          return;
        }
        if (this.collection) this.collection.add(model);
        await this.refresh();
      }
    }
  }

  /**
   * Handle Export — emits `list:export` and either downloads from the
   * server (`exportSource: 'remote'`) or passes the current data to
   * `options.onExport(data, format)` (`exportSource: 'local'`).
   */
  async onActionExport(event, element) {
    const format = element.getAttribute('data-format') || 'json';

    this.emit('list:export', {
      format,
      source: this.exportSource,
      event
    });

    if (this.exportSource === 'remote') {
      if (this.collection) {
        await this.collection.download(format);
      } else {
        console.warn('ListView: Cannot export from remote without a collection.');
      }
    } else {
      if (this.options.onExport) {
        await this.options.onExport(this.collection?.toJSON() || [], format);
      } else {
        console.warn('ListView: onExport handler not implemented for local export.');
      }
    }
  }

  // -------- Model-resolution helpers --------

  getModelClass(model) {
    if (this.collection?.ModelClass) return this.collection.ModelClass;
    if (this.collection?.model) return this.collection.model;
    if (model?.constructor) return model.constructor;
    return null;
  }

  getModelName(model) {
    const ModelClass = this.getModelClass(model);
    if (!ModelClass) return 'Item';
    if (ModelClass.MODEL_NAME) return ModelClass.MODEL_NAME;
    // Production minifiers (Vite/esbuild) mangle class identifiers into short
    // strings like 'ys' or 'a'. `ModelClass.name` is therefore unsafe as a
    // user-facing label without an explicit MODEL_NAME. Only accept names
    // that look like a hand-written PascalCase identifier; otherwise fall
    // back to 'Item' and warn once per class so the dev knows to set
    // MODEL_NAME.
    const rawName = (ModelClass.name || '').replace(/Model$/, '');
    if (/^[A-Z][A-Za-z0-9]{2,}$/.test(rawName)) return rawName;
    if (!ListView._warnedMinifiedClasses.has(ModelClass)) {
      ListView._warnedMinifiedClasses.add(ModelClass);
      console.warn(
        `ListView.getModelName: class name '${rawName}' looks minified — ` +
        `set a static MODEL_NAME on the model class for user-facing dialog ` +
        `titles. Falling back to 'Item'.`
      );
    }
    return 'Item';
  }

  getItemViewClass(model) {
    if (this.itemView) return this.itemView;
    const ModelClass = this.getModelClass(model);
    if (ModelClass?.VIEW_CLASS) return ModelClass.VIEW_CLASS;
    return null;
  }

  getAddFormConfig(ModelClass) {
    return this.addForm ||
           ModelClass?.ADD_FORM ||
           this.editForm ||
           ModelClass?.EDIT_FORM;
  }

  getEditFormConfig(ModelClass) {
    return this.editForm ||
           ModelClass?.EDIT_FORM ||
           this.addForm ||
           ModelClass?.ADD_FORM;
  }

  getFormDialogConfig(ModelClass) {
    return {
      ...ModelClass?.FORM_DIALOG_CONFIG,
      ...this.formDialogConfig
    };
  }

  renderTemplateString(template, model) {
    if (!template) return '';
    return Mustache.render(template, model);
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

    const filterConfig = this.getFilterConfig(field) || this.getFilterConfig(filterKey);

    const activeFilters = this.getActiveFilters();
    const currentValue = activeFilters[filterKey] || activeFilters[field];

    if (!filterConfig) {
      console.warn('No filter config found for key:', filterKey, 'or field:', field);
      return;
    }

    const formData = { filter_value: currentValue };
    if (filterConfig.type === 'daterange' && currentValue && typeof currentValue === 'object') {
      const startName = filterConfig.startName || 'dr_start';
      const endName = filterConfig.endName || 'dr_end';
      formData[startName] = currentValue.start || '';
      formData[endName] = currentValue.end || '';
    }

    // NOTE: do NOT emit `filter:edit` here. ListView owns the edit dialog
    // flow end-to-end — emitting would also cause TablePage's legacy
    // handleFilterEdit handler to open a SECOND modal racing this one.
    // External listeners that want to know a filter was edited can listen
    // for `params-changed` after applyFilters() runs.

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
    } else if (
      filterConfig.type === 'boolean' ||
      filterConfig.type === 'switch' ||
      filterConfig.type === 'toggle'
    ) {
      // Boolean filters render as a True / False select in the edit dialog.
      // FormBuilder doesn't have a `boolean` field type, and a switch/toggle
      // is awkward in a one-field filter dialog (no clear "submit" affordance
      // and ambiguous off-state). Select with two options is URL-friendly,
      // explicit, and easy to read in the active-pill bar.
      field.type = 'select';
      // Stringify the (current OR default) value so the <option value="...">
      // match works. Filter params are strings on the wire —
      // Collection.params['foo'] = 'true'. When the dialog is opened fresh
      // (Add Filter) and the config has `defaultValue`, honor it as the
      // pre-selected option.
      const initial = currentValue !== undefined && currentValue !== null && currentValue !== ''
        ? currentValue
        : filterConfig.defaultValue;
      const stringValue = initial === true ? 'true'
        : initial === false ? 'false'
          : initial == null ? '' : String(initial);
      field.value = stringValue;
      // Allow caller to override the labels (e.g. `trueLabel: 'Active'`,
      // `falseLabel: 'Inactive'`); fall back to plain True / False.
      const trueLabel = filterConfig.trueLabel || 'True';
      const falseLabel = filterConfig.falseLabel || 'False';
      field.options = [
        { value: 'true', text: trueLabel },
        { value: 'false', text: falseLabel }
      ];
      if (!field.placeholder && !field.placeHolder) {
        field.placeholder = filterConfig.label
          ? `Filter by ${filterConfig.label}…`
          : 'Select…';
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
  // `_buildTitleBlockTemplate` emits `{{title}}` / `{{eyebrow}}` Mustache
  // vars (resolved at render time from `this.title` / `this.eyebrow`),
  // so setters update the instance prop and patch the live DOM node;
  // the next render() picks up the value automatically.
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

  // `toolbarButtons[].permissions` gating uses View#checkPermissions
  // (fail-closed against app.activeUser). Subclasses/apps can still
  // override to integrate their own ACL.

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
  // Auto-refresh (WM-034) — opt-in interval refetch with smart pause
  // ============================================================

  /**
   * True for the object form of `autoRefresh:` (`{ every, mode, … }`) — a
   * plain object, not an array / null / Date / function.
   * @private
   */
  _isAutoRefreshConfig(raw) {
    return !!raw && typeof raw === 'object' && !Array.isArray(raw);
  }

  /**
   * Normalize the `autoRefresh:` option into an interval in milliseconds.
   * Accepts a positive number of seconds — or the object form's `every` key,
   * same unit — clamped to a 5s floor to prevent hammering the API. Anything
   * else (absent / non-number / ≤0) → 0, which disables the feature entirely
   * (no timer, no listeners).
   * @private
   */
  _normalizeAutoRefresh(raw) {
    const secs = this._isAutoRefreshConfig(raw) ? raw.every : raw;
    if (typeof secs !== 'number' || !isFinite(secs) || secs <= 0) return 0;
    return Math.max(5, secs) * 1000;
  }

  /**
   * Which refresh strategy a tick uses. `'models'` only when explicitly
   * requested via the object form; everything else (including the bare number)
   * is the historical `'collection'` full refetch.
   * @private
   */
  _normalizeAutoRefreshMode(raw) {
    return (this._isAutoRefreshConfig(raw) && raw.mode === 'models') ? 'models' : 'collection';
  }

  /**
   * Whether changed rows get the highlight flash. A models-mode-only option:
   * defaults ON there (a brand-new mode, so there's no prior behavior to
   * preserve) and an explicit `flash: false` opts out.
   *
   * Collection mode always resolves to `false`, `flash` key or not — a refetch
   * resets the collection, which rebuilds every item view, so no row element
   * survives for a highlight to land on. Honoring `flash: true` there would
   * ship two keyframe definitions that can never fire and imply a feature that
   * doesn't exist.
   * @private
   */
  _normalizeAutoRefreshFlash(raw, mode) {
    if (mode !== 'models') return false;
    if (this._isAutoRefreshConfig(raw) && typeof raw.flash === 'boolean') return raw.flash;
    return true;
  }

  /**
   * Start the auto-refresh interval + focus/visibility listeners. No-op when
   * `autoRefresh` wasn't configured, and idempotent — a second call while a
   * timer is already live returns immediately, so cached-page re-entries
   * (which re-fire onAfterMount) never stack a second interval.
   * @private
   */
  _startAutoRefresh() {
    if (!this._autoRefreshMs) return;
    if (this._autoRefreshTimer) return;
    this._autoRefreshPaused = this._autoRefreshDocHidden();
    this._bindAutoRefreshListeners();
    this._autoRefreshTimer = setInterval(() => this._autoRefreshTick(), this._autoRefreshMs);
  }

  /**
   * Fully tear down the timer and its focus/visibility listeners. Safe to
   * call when nothing is running.
   * @private
   */
  _stopAutoRefresh() {
    if (this._autoRefreshTimer) {
      clearInterval(this._autoRefreshTimer);
      this._autoRefreshTimer = null;
    }
    if (this._autoRefreshPulseTimer) {
      clearTimeout(this._autoRefreshPulseTimer);
      this._autoRefreshPulseTimer = null;
    }
    // Abort an in-flight models refresh and drop every pending flash timer so
    // nothing fires against a detached (or reused) element.
    if (this._autoRefreshAbort) {
      try { this._autoRefreshAbort.abort(); } catch { /* already aborted */ }
      this._autoRefreshAbort = null;
    }
    this._autoRefreshInFlight = false;
    if (this._rowFlashTimers) {
      this._rowFlashTimers.forEach((timer) => clearTimeout(timer));
      this._rowFlashTimers.clear();
    }
    this._unbindAutoRefreshListeners();
    this._autoRefreshPaused = false;
  }

  /**
   * Bind window focus/blur + document visibilitychange listeners so the
   * timer can pause while the tab is backgrounded and resume (with an
   * immediate refetch) when the user returns. Idempotent.
   * @private
   */
  _bindAutoRefreshListeners() {
    if (this._autoRefreshHandlers) return;
    const onBlur = () => { this._autoRefreshPaused = true; };
    const onFocus = () => { this._autoRefreshPaused = false; this._autoRefreshResume(); };
    const onVisibility = () => {
      const hidden = this._autoRefreshDocHidden();
      this._autoRefreshPaused = hidden;
      if (!hidden) this._autoRefreshResume();
    };
    this._autoRefreshHandlers = { onBlur, onFocus, onVisibility };
    if (typeof window !== 'undefined') {
      window.addEventListener('blur', onBlur);
      window.addEventListener('focus', onFocus);
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility);
    }
  }

  /** @private */
  _unbindAutoRefreshListeners() {
    const h = this._autoRefreshHandlers;
    if (!h) return;
    if (typeof window !== 'undefined') {
      window.removeEventListener('blur', h.onBlur);
      window.removeEventListener('focus', h.onFocus);
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', h.onVisibility);
    }
    this._autoRefreshHandlers = null;
  }

  /** @private */
  _autoRefreshDocHidden() {
    return typeof document !== 'undefined'
      && (document.visibilityState === 'hidden' || document.hidden === true);
  }

  /**
   * Regaining focus / visibility fires an immediate guarded refetch, then the
   * existing interval carries on at its normal cadence. No-op when no timer
   * is live (so a stray focus event after teardown can't refetch).
   * @private
   */
  _autoRefreshResume() {
    if (!this._autoRefreshTimer) return;
    this._autoRefreshTick();
  }

  /**
   * One interval tick. Self-terminates if the view is no longer mounted
   * (covers a cached Page that exited without an unmount hook reaching this
   * child). Otherwise skips silently while any pause condition holds, then
   * issues a silent `collection.fetch()` that preserves current params —
   * Collection's own dedup/cancel machinery handles overlap.
   * @private
   */
  _autoRefreshTick() {
    if (!this.isMounted()) { this._stopAutoRefresh(); return; }
    if (this._autoRefreshShouldSkip()) return;
    if (!this.collection || !this.collection.restEnabled) return;
    // Mode branch sits AFTER the guards so every pause condition and the
    // self-terminating detached-tick guarantee apply to both modes.
    if (this._autoRefreshMode === 'models') return this._autoRefreshTickModels();
    Promise.resolve(this.collection.fetch())
      .then(() => {
        this._pulseAutoRefreshIndicator();
        // Counts track the rows: a watched table's stats must move with the
        // data even though the params didn't change — hence memo-bypassed.
        this._scheduleStatsRefresh({ force: true });
      })
      .catch((err) => {
        console.warn('ListView autoRefresh: fetch failed', err);
      });
  }

  /**
   * `mode: 'models'` tick — refresh only the rows already on screen.
   *
   * One batched `collection.refreshModels(ids)` request under the current
   * params, merged into the existing model instances. Membership, order,
   * pagination and `meta` are untouched, and nothing flips `loading`, so the
   * list never blinks to its skeleton. Rows whose data actually changed
   * re-render through the ordinary model-`change` path and (unless
   * `flash: false`) get a brief highlight.
   *
   * Overlapping ticks are dropped by an in-flight flag (Rest's 30s default
   * timeout means a hung request self-heals). A response that lands after the
   * user changed a filter/sort is discarded: `refreshModels` runs on this
   * view's own AbortController, so `collection.fetch()` cannot cancel it, and
   * merging old-filter values into freshly fetched models would both corrupt
   * the rows and fire a spurious flash.
   * @private
   */
  _autoRefreshTickModels() {
    if (this._autoRefreshInFlight) return;
    const ids = this.collection.models.map((model) => model.id);
    if (ids.length === 0) return;

    this._autoRefreshInFlight = true;
    const fetchStamp = this.collection.lastFetchTime;
    const controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    this._autoRefreshAbort = controller;

    Promise.resolve(this.collection.refreshModels(ids, { signal: controller?.signal }))
      .then((result) => {
        // Stale-response guard — a full fetch completed while we were away.
        if (this.collection.lastFetchTime !== fetchStamp) return;
        this._pulseAutoRefreshIndicator();
        if (result && result.changed) this._flashChangedRows(result.changed);
        // Same reasoning as the collection branch — a models tick changes row
        // data, so the counts above the table have to follow it.
        this._scheduleStatsRefresh({ force: true });
      })
      .catch((err) => {
        console.warn('ListView autoRefresh: models refresh failed', err);
      })
      .finally(() => {
        this._autoRefreshInFlight = false;
        if (this._autoRefreshAbort === controller) this._autoRefreshAbort = null;
      });
  }

  /**
   * Pause predicate evaluated at tick time. Base ListView pauses while the
   * tab is hidden/blurred or a selection is active. TableView overrides this
   * to also pause during an inline cell edit or an open row context menu.
   * @protected
   * @returns {boolean} true → skip this tick (do not clear the timer).
   */
  _autoRefreshShouldSkip() {
    if (this._autoRefreshPaused) return true;
    if (this._autoRefreshDocHidden()) return true;
    if (this.selectedItems && this.selectedItems.size > 0) return true;
    return false;
  }

  // ============================================================
  // View persistence (WM-035) — opt-in per-table saved view
  //
  // Persisted blob shape (versioned): `{ v: 1, sort?, size?, dayRange?,
  // filters?: {…raw params…}, hidden?: [columnKey] }`. `filters` is the raw
  // `collection.params` set MINUS start/size/sort and the day-range field
  // param (which is re-derived from `dayRange`), so `field__in` collapsed keys
  // and `dr_*` daterange triplets round-trip verbatim (preset matching depends
  // on it). `hidden` is written by TableView's column chooser.
  // ============================================================

  /**
   * The localStorage key for this view's saved state. Uses the explicit
   * `persistKey` when supplied, else a stable identity of page route +
   * collection endpoint (`<pathname>::<endpoint>`), namespaced under
   * `mojo:tableview:`.
   * @private
   */
  _persistStorageKey() {
    const id = this.persistKey || this._defaultPersistKey();
    return `mojo:tableview:${id}`;
  }

  /** @private */
  _defaultPersistKey() {
    const route = (typeof window !== 'undefined' && window.location && window.location.pathname) || '';
    const endpoint = (this.collection && this.collection.endpoint) || '';
    return `${route}::${endpoint}`;
  }

  /**
   * Resolve the localStorage backing object, or null when it's unavailable
   * (SSR / privacy mode / access throws). All storage access funnels through
   * here so the feature degrades to a no-op rather than throwing.
   * @private
   */
  _persistStorage() {
    try {
      const ls = (typeof globalThis !== 'undefined') ? globalThis.localStorage : null;
      if (ls && typeof ls.getItem === 'function') return ls;
    } catch (e) { /* access denied */ }
    return null;
  }

  /**
   * Read + validate the saved blob. Discards (and clears) anything that isn't
   * this schema version or won't parse, returning null.
   * @private
   */
  _readPersistedState() {
    const store = this._persistStorage();
    if (!store) return null;
    let raw;
    try { raw = store.getItem(this._persistStorageKey()); } catch (e) { return null; }
    if (!raw) return null;
    let parsed;
    try { parsed = JSON.parse(raw); } catch (e) { this._clearPersistedStorage(); return null; }
    if (!parsed || typeof parsed !== 'object' || parsed.v !== 1) {
      this._clearPersistedStorage();
      return null;
    }
    return parsed;
  }

  /** @private */
  _writePersistedState(state) {
    const store = this._persistStorage();
    if (!store) return;
    try { store.setItem(this._persistStorageKey(), JSON.stringify(state)); } catch (e) { /* quota / denied */ }
  }

  /** @private */
  _clearPersistedStorage() {
    const store = this._persistStorage();
    if (!store) return;
    try { store.removeItem(this._persistStorageKey()); } catch (e) { /* denied */ }
  }

  /**
   * Rehydrate the collection params from the saved blob. Fills only slots the
   * current query didn't already set (URL > saved), so a shared link always
   * wins. The day-range value is restored onto `this.dayRangeFilter` so the
   * subsequent seed/control build uses it. Column visibility is delegated to
   * the TableView hook. No-op unless persistState is on.
   * @private
   */
  _restorePersistedState(queryKeys = []) {
    if (!this.persistState || !this.collection) return;
    const saved = this._readPersistedState();
    if (!saved) return;

    const params = this.collection.params || (this.collection.params = {});
    // `start`/`size` are structural paging defaults every Collection carries
    // from construction, so they can't signal a real URL query. Drop them from
    // the query set: `sort`, filters, and the day-range field strictly honor
    // URL > saved (they only appear when a query set them), while page `size`
    // is treated as a per-user viewing preference — saved size is restored over
    // the paging default (and a URL-provided size, since TablePage always
    // round-trips size through the URL). Documented in TableView.md.
    const fromQuery = new Set(queryKeys);
    fromQuery.delete('start');
    fromQuery.delete('size');

    if (saved.sort !== undefined && !fromQuery.has('sort')) params.sort = saved.sort;
    if (saved.size !== undefined) params.size = saved.size;

    // Day-range: restore the selected value (re-seeded to a fresh epoch by the
    // day-range block) unless the query already carried the field param.
    if (saved.dayRange !== undefined && this.dayRangeFilter) {
      const field = this.dayRangeFilter.field || 'created';
      if (!fromQuery.has(`${field}__gte`)) {
        this.dayRangeFilter.value = saved.dayRange;
      }
    }

    // Filters — restore each key the query didn't set, verbatim (field__in /
    // dr_* triplets preserved so preset matching still works).
    if (saved.filters && typeof saved.filters === 'object') {
      Object.keys(saved.filters).forEach((key) => {
        if (!fromQuery.has(key)) params[key] = saved.filters[key];
      });
    }

    // Column visibility (TableView only).
    if (typeof this._restoreHiddenColumns === 'function') {
      this._restoreHiddenColumns(saved.hidden);
    }
  }

  /**
   * Serialize the current view state to localStorage. Called on every
   * `params-changed` (and by TableView on a column toggle). No-op unless
   * persistState is on.
   * @private
   */
  _savePersistedState() {
    if (!this.persistState) return;
    const params = (this.collection && this.collection.params) || {};
    const dayRangeGteKey = this.dayRangeFilter ? `${this.dayRangeFilter.field || 'created'}__gte` : null;

    const filters = {};
    Object.keys(params).forEach((key) => {
      if (key === 'start' || key === 'size' || key === 'sort') return;
      if (dayRangeGteKey && key === dayRangeGteKey) return; // re-derived from dayRange
      const value = params[key];
      if (value === undefined || value === null || value === '') return;
      filters[key] = value;
    });

    const state = { v: 1 };
    if (params.sort !== undefined) state.sort = params.sort;
    if (params.size !== undefined) state.size = params.size;
    if (this.dayRangeControl && typeof this.dayRangeControl.getValue === 'function') {
      state.dayRange = this.dayRangeControl.getValue();
    } else if (this.dayRangeFilter) {
      state.dayRange = this.dayRangeFilter.value;
    }
    if (Object.keys(filters).length > 0) state.filters = filters;
    if (typeof this._getHiddenColumnKeys === 'function') {
      const hidden = this._getHiddenColumnKeys();
      if (hidden && hidden.length > 0) state.hidden = hidden;
    }

    this._writePersistedState(state);
  }

  /**
   * Public escape hatch — forget this table's saved view (both the view state
   * and, via the TableView hook, any hidden columns), reverting to defaults.
   */
  clearPersistedState() {
    this._clearPersistedStorage();
    if (typeof this._onClearPersistedState === 'function') this._onClearPersistedState();
  }

  // ============================================================
  // Cleanup
  // ============================================================

  async destroy() {
    this._stopAutoRefresh();
    this._stopStatsRefresh();
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
