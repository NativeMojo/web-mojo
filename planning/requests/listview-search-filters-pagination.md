# Advanced ListView — search, toolbar filters, pagination / show-more

| Field | Value |
|-------|-------|
| Type | request |
| Status | planned |
| Date | 2026-05-09 |
| Priority | medium |

## Description

Bring the toolbar feature set that `TableView` already has — search input, filter dropdown + active filter pills, refresh, sort affordance, and large-list paging — to plain `ListView` so visual lists (cards, tiles, feed rows) can be searched and filtered the same way data tables can. Add a "load more" mode in addition to numbered pagination, since classic page-number pagination is awkward for visual / chronological lists.

The goal is a single ListView that can power:

1. **Today's simple ListView use cases** (a small unfiltered list of cards) — no breaking changes.
2. **A "ListPanel" use case** — search box + filter pills + "Show more" button at the bottom, suitable for activity feeds, item galleries, navigation lists, conversation lists, picker dialogs, etc.
3. **A page-style use case** — the same shell with numbered pagination instead of "Show more", so a `ListPage` (paralleling `TablePage`) becomes possible later.

## Context

### What's there today

- `src/core/views/list/ListView.js` (~500 lines) renders a `Collection` as a stack of `ListViewItem` views. It supports selection (none / single / multiple), `fetchOnMount`, `defaultQuery`/`collectionParams`, `setItemTemplate`, and a fixed `loading | empty | items` shell. **No search, no filters, no toolbar, no pagination.**
- `src/core/views/table/TableView.js` (~2700 lines) extends `ListView` and bolts on a full-featured toolbar: title/eyebrow, refresh, fullscreen, add, export, custom toolbar buttons, search input, filter dropdown, active-filter-pills bar, server-side numbered pagination with page-size selector, batch actions, sortable column headers, footer totals. The toolbar logic and filter logic are **table-agnostic** — they all operate on `this.collection.params`, not on cells. That's why this request is feasible without forking.
- `src/core/pages/TablePage.js` wraps `TableView` and syncs the toolbar state (`start`, `size`, `sort`, `search`, filter params) to the URL. The same wrapper pattern would suit a `ListPage`.
- `src/core/views/navigation/SimpleSearchView.js` is a self-contained "search a Collection in a sidebar" widget. Useful as a reference for live-search debounce + scrollable results, but not the right base — it has its own template shell and selection model.
- `docs/web-mojo/forms/SearchFilterForms.md` documents the existing **out-of-band pattern**: build a sibling `FormView` and wire its `form:changed` event into `Collection.setParams()`. That works, but each consumer rebuilds the same toolbar by hand. This request would let consumers reach for one component instead.
- Spot-checks in the codebase show there is **no shared "Load more" / infinite-scroll primitive** today — the only `loadMore` button is hand-rolled inside `extensions/admin/assistant/AssistantConversationListView.js`.

### Why now

- Several near-term needs (activity feeds, content galleries, item pickers) want search + a few filter pills but should not look like a data table — they want cards/tiles, not rows.
- Re-implementing the toolbar per page is exactly the kind of duplication TableView was created to avoid.
- "Numbered pagination over a list of avatars" is a UX smell — modern visual lists overwhelmingly use **load-more / infinite-scroll**, while data tables stick with numbered pagination. A single component that supports both modes covers both shapes without a new fork.

### Pagination vs. "Show more" — recommendation

**Standard for large lists:**

| List shape | Conventional UX | Why |
|---|---|---|
| Visual cards / tiles / feed | **Load-more button** (or auto on scroll) | Order and adjacency carry meaning; users skim continuously. Numbered pages break that flow. |
| Activity / chronological feed | **Load-more button**, often "since"-cursor | Newest stays at top; older slides on. Numbered pages would re-shuffle. |
| Reference / data table | **Numbered pagination** | Users hunt for specific rows; jump-to-page is useful; "page 47 of 90" is reassuring. |
| Picker dialog (small N) | **No paging — just search** | Almost always paged on the server but feels paged-less. |
| Mass list, unsearchable | **Virtualization** | Out of scope for this request — call out as future work. |

**Recommendation for this request:** support both — a single `paginationMode` option (`'pages' | 'more' | 'none'`). Default to `'more'` (load-more) for ListView since that's the conventional choice for visual lists. TableView keeps `'pages'` as its default so its UX is unchanged. Auto-on-scroll (true infinite scroll, no button) can be a follow-up; it has accessibility caveats (screen-reader "where am I" loss, focus management, no foot-of-page) that are worth resolving deliberately.

### Approach options

**A. Add toolbar + pagination directly to `ListView` (with feature flags off by default).**
Pros: TableView gets it for free (it already extends ListView). One source of truth. Existing simple `ListView` callers aren't affected if the flags default to off. Matches the KISS/"match existing patterns" rule the way the codebase already works.
Cons: Pushes ~600–900 lines of toolbar code into ListView. Most of that code is already in TableView and would need to migrate up the inheritance chain.

**B. Introduce a middle class (e.g. `ToolbarListView` or `ListPanel`) between `ListView` and `TableView`.**
Pros: Keeps plain `ListView` lean. Clear opt-in.
Cons: Adds a layer; documentation and class hierarchy become busier. TableView would need to be re-parented (mechanical but invasive given TableView is 2700 lines and battle-tested).

**C. Extract the toolbar/filter/pagination logic into a mixin (e.g. `applyCollectionToolbarMixin(View)`) and apply it to ListView and TableView independently.**
Pros: No reparenting; minimal changes to TableView; ListView opts in by adopting the mixin. Aligns with the existing `applyFileDropMixin` style in the codebase.
Cons: Mixins are slightly less discoverable than explicit base classes.

**Lean recommendation:** Approach **A** with the toolbar markup and behavior moved up from TableView to ListView, gated on `searchable`, `filterable`, `paginated`, `paginationMode`, etc. TableView then drops its now-redundant copies. This is the smallest API surface for consumers and the cleanest doc story, and it's a one-time refactor of a class that is already designed to be subclassed. Open for discussion at design time — this is the largest design call in this request.

## Acceptance Criteria

- A `ListView` configured with `searchable: true` renders a search input above the list, debounces typing, and updates `collection.params.search` exactly the way `TableView` does today.
- A `ListView` configured with `filters: [...]` (or column-style filters via a new analog) shows the same "Add Filter" dropdown + active-pill bar + edit-in-modal flow that TableView already has, driving `collection.params`.
- A `ListView` configured with `paginated: true, paginationMode: 'pages'` renders numbered pagination + page-size selector identical to TableView's footer (visually distinct from the table footer, but same behavior).
- A `ListView` configured with `paginated: true, paginationMode: 'more'` renders a single "Show more" button at the bottom that **appends** the next page's models into the existing list (does not replace), and hides itself when `start + items.length >= meta.count`. A loading state is shown while fetching.
- The default for plain `ListView` (no flags set) renders **identical** to today's ListView — no toolbar, no pagination footer, no behavior change.
- `TableView` continues to behave identically: same defaults (`searchable: true`, `filterable: true`, `paginated: true`, numbered pagination), same toolbar, same tests pass without modification.
- A new `ListPage` (paralleling `TablePage`) is **not** required for this request, but the design must leave a clean seam for one — i.e. the same `params-changed` event surface that `TablePage` listens to.
- Active selection (`selectionMode: 'single' | 'multiple'`) keeps working across pages / "Show more" appends — selecting on page 2, going back to page 1 should not lose the selection set.
- No regressions in any existing example portal page that uses `ListView` or `TableView`.

## Investigation

### What exists

- `src/core/views/list/ListView.js` — render shell only. Has `loading`, `isEmpty`, `emptyMessage`. No toolbar.
- `src/core/views/list/ListViewItem.js` — per-item View. Unaffected by this request.
- `src/core/views/table/TableView.js` — owns `buildToolbarTemplate()`, `buildSearchTemplate()`, `buildFilterDropdownTemplate()`, `buildActivePills()`, `buildPaginationTemplate()`, `renderPagination()`, `getActiveFilters()`, `setFilter()`, `getAllAvailableFilters()`, `onActionApplySearch()`, `onActionClearSearch()`, `onActionAddFilter()`, `onActionPage()`, `onChangePageSize()`, `updateFilterPills()`, `updateSearchInputs()`. **All of these are collection-level concerns, not table-cell concerns.**
- `src/core/pages/TablePage.js` — listens to `params-changed`, syncs to URL via `updateBrowserUrl`, applies `query` → `collection.params` via `applyQueryToCollection()`. Reusable seam for a future `ListPage`.
- `src/core/Collection.js` — already supports `setParams(newParams, autoFetch, debounceMs)`, `meta.count`, `start`/`size` paging, sort, and arbitrary filter params. **No new Collection methods are required for this request.** "Show more" appends rows, which can be done via `Collection.append()` (verify exists) or via `collection.add(models)` after fetching the next page with the right `start`.
- `src/core/views/navigation/SimpleSearchView.js` — independent component, not in scope to change.
- `docs/web-mojo/components/ListView.md`, `docs/web-mojo/components/TableView.md`, `docs/web-mojo/forms/SearchFilterForms.md` — all need updates if this lands.

### What changes

- `src/core/views/list/ListView.js` — gains toolbar markup, search/filter/pagination behavior, "Show more" mode. New options: `searchable`, `searchPlacement`, `searchPlaceholder`, `filterable`, `filters`, `hideActivePills`, `hideActivePillNames`, `paginated`, `paginationMode` (`'pages' | 'more' | 'none'`), `pageSize`, `showRefresh`, `toolbarButtons`, `toolbarRight`, `title`, `eyebrow` — i.e. the toolbar surface that TableView exposes today, minus the column-specific bits.
- `src/core/views/table/TableView.js` — toolbar/filter/pagination methods moved up; TableView keeps only column/sort/footer-totals/batch behavior. Defaults stay the same so existing usage does not change.
- `src/core/views/list/list-view.css` (new) or addition to `src/styles/` — small CSS for the "Show more" button row (centered, `mt-3`, mirroring pagination-row spacing). Bootstrap-token-based per `.claude/rules/theming.md` so dark theme works automatically.
- `docs/web-mojo/components/ListView.md` — new sections for "Toolbar", "Search", "Filters", "Pagination & Show More", "Common Patterns / Picker dialog / Activity feed". Add ⚠️ pitfalls section for the cache-on-pagination case (see Notes below).
- `docs/web-mojo/components/TableView.md` — small note that toolbar config now lives on ListView; everything still works.
- `docs/web-mojo/forms/SearchFilterForms.md` — section update: prefer ListView's built-in toolbar for simple search/filter/pagination; the FormView pattern is still the right choice for **rich** filter sidebars (sliders, switches, grouped sections).
- `examples/portal/examples/components/ListView/` — add `ListViewToolbarExample.js` (search + 1–2 filter pills + Show More) and `ListViewPaginatedExample.js` (numbered pagination over a Collection).
- `CHANGELOG.md` — entry under next minor version.

### Constraints

- **No breaking changes to public API.** A `new ListView({ collection, itemTemplate })` with no other options must behave exactly as today. Adding options must be additive.
- **No new admin endpoints.** Pagination, filters, search all use the standard `Collection.params` (`start`, `size`, `sort`, `search`, plus arbitrary filter keys). Per `.claude/rules/api.md`: never propose admin-scoped endpoints; admins filter via query params.
- **Theme-correct from day one.** Any new `<style>` block or external CSS must include `[data-bs-theme="dark"]` overrides per `.claude/rules/theming.md`.
- **Keep it KISS.** Do not introduce virtualization, cursor pagination, optimistic appends, or a separate "feed" abstraction in this request — those are deliberate follow-ups.
- **Selection across pages must persist.** TableView today loses selection on page change because the row Views are torn down. The "Show more" mode does not have this problem (rows aren't torn down), but numbered pagination still does. Acceptance criterion above commits to fixing it; in TableView this is currently ambiguous behavior — the design must clarify and document.
- **Match existing toolbar markup.** Don't redesign the toolbar visuals — reuse TableView's exact buttons, dropdowns, and active-pill bar so the two components feel like one family.

### Related files

- `src/core/views/list/ListView.js`
- `src/core/views/list/ListViewItem.js`
- `src/core/views/table/TableView.js`
- `src/core/views/table/TableRow.js`
- `src/core/pages/TablePage.js`
- `src/core/Collection.js`
- `src/core/utils/DjangoLookups.js` (filter-key parsing — reused as-is)
- `src/core/views/feedback/Modal.js` (filter edit dialog — reused as-is)
- `src/core/views/navigation/SimpleSearchView.js` (reference only; not modified)
- `docs/web-mojo/components/ListView.md`
- `docs/web-mojo/components/TableView.md`
- `docs/web-mojo/forms/SearchFilterForms.md`
- `docs/web-mojo/pages/TablePage.md` (link to future ListPage)

### Endpoints

- **None new.** Existing collection endpoints continue to handle `start`, `size`, `sort`, `search`, and arbitrary filter params. The "Show more" flow uses the same endpoints as numbered pagination — only the UI differs.

### Tests required

- `test/unit/ListView.test.js` (extend or create):
  - Default render unchanged — no toolbar, no pagination footer.
  - `searchable: true` renders search input; typing debounces and sets `collection.params.search`; clear-button removes it.
  - `filterable: true, filters: [...]` renders Add Filter dropdown and active-pill bar after a filter is set.
  - `paginated: true, paginationMode: 'pages'` renders numbered pagination, clicking page 2 sets `start = size`.
  - `paginated: true, paginationMode: 'more'` renders a Show More button; clicking it sets `start = size` and **appends** new rows; button hides when all rows are loaded.
  - `selectionMode: 'multiple'` selection persists across a "Show more" append.
- `test/unit/TableView.test.js` — verify no regressions: toolbar, search, filter pills, numbered pagination still behave identically.
- One example-portal smoke test (manual) for both new examples.

### Out of scope

- **True infinite scroll** (auto-load on intersection-observer) — call out as a follow-up so we can address screen-reader / focus-management properly.
- **Virtualized rendering** for very large lists (10k+ items in DOM). The "Show more" mode caps DOM growth at user pace, which is sufficient for the immediate use cases.
- **Cursor-based pagination** (`?after=<id>`). Server contracts today are offset-based; cursor pagination is a separate, larger conversation.
- **A new `ListPage` page-class.** This request only commits to leaving the `params-changed` seam intact so a `ListPage` can be added cleanly later.
- **Reorganizing the inheritance hierarchy.** Whether to extract a mixin (Approach C) or move logic into ListView (Approach A) is a design decision deferred to `/design`.
- **Replacing `SimpleSearchView`.** It serves a different shape (sidebar picker) and stays as-is.

## Notes

- **Picker shape.** Once this lands, `SimpleSearchView`'s common job (search + scrollable list + click-to-pick) can be re-expressed as a ListView with `searchable: true, paginationMode: 'more', selectionMode: 'single'`. Worth a follow-up to consolidate, but explicitly **not** in scope here — `SimpleSearchView` has bespoke header / exit-button / footer affordances that we shouldn't fold in without a separate review.
- **Cache pitfall.** Pages are cached in WEB-MOJO. If a `ListPage` is built later, "Show more" state has to be reset on `onEnter()` — otherwise revisiting a page shows stale appended rows. Document this when the time comes.
- **`Collection.append` vs `add`.** Confirm at design time whether `Collection` already exposes a clean "fetch next page and append" helper, or whether ListView needs to do `setParams({ start: oldStart + size })` + `fetch()` + observe `reset` (replace) vs `add` (append). Recommendation: add a small `Collection.fetchMore()` helper if one doesn't exist — single, well-tested method beats every consumer rolling its own.
- **Sort surface.** ListView doesn't have column headers, so sort needs a different affordance — a small "Sort by" dropdown in the toolbar, accepting an option list (e.g. `sortOptions: [{ key: 'created', label: 'Newest', dir: 'desc' }, ...]`). This is small enough to include in the same request; flag for the design pass.
- **Bundle scope.** Per the "bundle related requests" feedback, this single request covers toolbar + search + filters + pagination + show-more + sort dropdown — they all serve one feature and would be artificial to split. The `ListPage`, virtualization, and infinite-scroll-on-intersection items are deliberately broken out.

---

## Plan

### Objective

Lift the toolbar / filter / pagination machinery from `TableView` into `ListView` so visual lists (cards, tiles, feed rows) can be searched and filtered with the same affordances as data tables, and add a "Show more" pagination mode appropriate for visual lists. Plain `ListView` usage is unchanged; `TableView` behavior is unchanged.

### Steps

**1. `src/core/Collection.js` — add `fetchMore()` helper.**

The current `fetch()` at line 113 always resets the collection because the conditional at line 202 (`if (this.options.reset || additionalParams.reset !== false)`) short-circuits to `true` when `this.options.reset` is `true` (its default). That means we can't append-on-fetch from the call site alone — the per-call `reset: false` override is dead code. Add:

- `async fetchMore({ pageDelta = 1 } = {})` — advances `start` by `pageDelta * size`, fetches with append semantics. Fix `_performFetch` to honor `additionalParams.reset === false` so the per-call override actually works (the existing conditional is buggy). Returns the same response shape as `fetch()`.
- Emits a new `fetch:more` event in addition to `fetch:start`/`fetch:end` so ListView can distinguish reset-vs-append if needed (it shouldn't need to — `add` already only fires for new rows).

This is the only Collection change. No new endpoints, no params shape changes.

**2. `src/core/views/list/ListView.js` — host the toolbar, search, filters, pagination, and show-more.**

Major surgery, all additive. New options (each defaults to a no-op so today's `new ListView({ collection, itemTemplate })` renders identical):

- `searchable: false` — opt-in. When `true`, render the same search-input HTML and behavior as TableView (`buildSearchTemplate`, `searchPlacement`, `searchPlaceholder`, `data-change-action="apply-search"`, debounce via `data-filter-debounce`).
- `filterable: false` — opt-in. When `true` and `filters: [...]` is non-empty, render the Add Filter dropdown + active-pills bar.
- `filters: []` — additional-filter definitions (same shape as TableView's `additionalFilters`).
- `hideActivePills`, `hideActivePillNames` — same semantics as TableView.
- `paginated: false` — opt-in. When `true`, render the pagination footer.
- `paginationMode: 'pages' | 'more' | 'none'` — default `'more'` when `paginated: true` and the caller did not override; `'none'` is equivalent to `paginated: false`.
- `pageSize` — convenience that seeds `collection.params.size` if not already set.
- `sortOptions: []` — list of `{ key, label, dir }` rendered as a single "Sort by" dropdown in the toolbar. Different surface from TableView's column-header dropdowns; both can coexist.
- `showRefresh`, `toolbarButtons`, `toolbarRight`, `title`, `eyebrow` — verbatim port from TableView.
- `persistSelection` — `true` when `paginationMode === 'more'`, `false` otherwise. Controls whether `selectedItems` survives a `_clearItems()` rebuild. Documented as the behavior difference between modes.

Methods to move from TableView to ListView (verbatim where possible — they don't touch columns/rows):

- `buildToolbarTemplate`, `buildSearchTemplate`, `buildFilterDropdownTemplate`, `buildFilterList`, `buildActivePills`, `_buildTitleBlockTemplate`, `buildPaginationTemplate`, `renderPagination`
- `getActiveFilters`, `setFilter`, `getAllAvailableFilters`, `getFilterConfig`, `getFilterLabel`, `getFilterDisplayValue`, `getFilterIcon`, `applyFilters`, `updateFilterPills`, `updateSearchInputs`, `buildFilterDialogField`, `extractFilterValue`
- Action handlers: `onActionApplySearch`, `onActionClearSearch`, `onActionAddFilter`, `onActionEditFilter`, `onActionRemoveFilter`, `onActionClearAllFilters`, `onActionPage`, `onChangePageSize`, `onActionRefresh`, `onActionCustomToolbarButton`
- Hooks: `onBeforeRender` (sets `searchValue`), `onAfterRender` (mounts `toolbarRight`, updates pagination info, runs `setupSearchClearListener`, `updateFilterPills`), `setTitle`, `setEyebrow`, `setupSearchClearListener`

Keep `buildActionButtonsTemplate` overridable in TableView so it can inject Add/Export buttons that depend on TableView-specific config.

ListView's existing template (`loading | empty | items`) gets wrapped by the toolbar + footer as in TableView's `buildTableTemplate`, but with `<div class="list-view-container">…<div data-container="items"></div>…</div>` instead of a `<table>`. Build conditionally: omit toolbar markup when no toolbar features are enabled (matches TableView's `buildToolbarTemplate` early-return).

New action handler:

- `onActionShowMore(event, element)` — calls `collection.fetchMore()`. Does NOT call `this.render()` on the whole view — `_onModelsAdded` already appends the new rows via `_renderChildren`'s `appendChild` loop. After the fetch completes, refresh the show-more row visibility (button hides when `collection.length() >= meta.count`).

Show-more template:

```html
<div class="list-show-more-row text-center mt-3">
  <button class="btn btn-outline-secondary btn-sm" data-action="show-more">
    <i class="bi bi-arrow-down-circle me-1"></i> Show more
  </button>
</div>
```

`onAfterRender` updates this row to hide the button when no more data is available, and disables / shows a spinner during a fetch (subscribe to `fetch:start` / `fetch:end` already wired).

Selection persistence:

- `_clearItems()` becomes `_clearItems({ keepSelection = false } = {})`. When `keepSelection` is true, only the `itemViews` Map is cleared, not `selectedItems`.
- `_createItemView()` checks `if (this.selectedItems.has(model.id)) itemView.selected = true; itemView.addClass('selected')` after creation.
- `_onCollectionReset()` passes `keepSelection: persistSelection`.
- On `paginationMode: 'more'` rows aren't torn down anyway, so selection is naturally persistent.

**3. `src/core/views/table/TableView.js` — drop methods that moved up; keep table-specific overrides.**

Delete the methods listed above from TableView. Keep:

- `initializeColumns`, `extractColumnFilters`, `getResponsiveClasses`, `getAlignClass`, `parseColumnKey`, `formatValue`, `calculateFooterTotals`, `updateFooterTotals`, `buildTableTemplate`, `buildTableClasses`, `buildTableHeaderTemplate`, `buildTableFooterTemplate`, `buildBatchActionsPanel`, `getSortBy`, `getSortDirection`, `getSortIcon`, `onActionSort`, `updateSortIcons`, `onActionSelectAll`, batch handlers, fullscreen handlers, Add/Export action handlers, `_createItemView` override (passes columns/actions/contextMenu/batchActions to TableRow), `setupCollectionListeners` (footer-totals listener), `buildActionButtonsTemplate` (TableView-specific Add/Export logic).

TableView's constructor preserves its existing defaults: `searchable: true`, `filterable: true`, `paginated: true`, `paginationMode: 'pages'`, `persistSelection: false`. Nothing changes for TableView callers.

**4. `src/core/views/list/list-view.css` (new file) — small CSS block for show-more row + toolbar polish.**

Tokens-based per `.claude/rules/theming.md`. Includes `[data-bs-theme="dark"]` overrides if any literals are needed. Hooked into the existing core CSS bundle (verify the import location — likely `src/core/css/core.css` or via the build entry).

**5. `examples/portal/examples/components/ListView/` — two new examples.**

- `ListViewToolbarExample.js` — visual ListView with search input, two filter pills, "Show more" button. Uses the existing seeded UserList collection or a small local Collection.
- `ListViewPaginatedExample.js` — same shape but with `paginationMode: 'pages'` for parity demonstration.

Add both to `example.json` so they appear in the portal nav. Keep example titles ≤25 chars per the short-sidebar-labels memory.

**6. `test/unit/ListView.test.js` (new) — unit coverage for the new flows.**

Use the CommonJS shape per `.claude/rules/testing.md`:

- Default `new ListView({ collection: [...], itemTemplate })` does not render toolbar markup, does not render pagination markup.
- `searchable: true` renders search input; setting input value + dispatching `change` updates `collection.params.search`.
- `filterable: true, filters: [{ name: 'status', type: 'select', options: [...] }]` renders Add Filter dropdown; `setFilter('status', 'active')` makes a pill appear.
- `paginated: true, paginationMode: 'pages'` renders numbered pagination; `onActionPage` with `page=2` sets `start = size`.
- `paginated: true, paginationMode: 'more'` renders Show More button; calling `onActionShowMore` with a stubbed Collection+Rest appends models without resetting; button hides when `length >= meta.count`.
- `persistSelection: true` (default for `'more'`) — selection survives an `_onModelsAdded` round-trip.
- `persistSelection: false` (default for `'pages'`) — selection cleared on page change.

**7. `test/unit/Collection.test.js` — extend.**

- `fetchMore()` calls `_performFetch` with `start += size`, passes `reset: false`, does NOT call `this.reset()` even when `this.options.reset` is true (regression test for the line-202 bug fix).

**8. Docs updates.**

- `docs/web-mojo/components/ListView.md` — new sections: Toolbar, Search, Filters, Pagination & Show More, Sort, Common Patterns (picker dialog, activity feed, paginated list). Cross-link to TableView for tabular needs.
- `docs/web-mojo/components/TableView.md` — note that toolbar/filter/pagination options now come from ListView (no behavior change).
- `docs/web-mojo/forms/SearchFilterForms.md` — small section update: prefer ListView's built-in toolbar when filters are simple; the FormView pattern is for **rich** sidebar filter forms.
- `docs/web-mojo/core/Collection.md` — add `fetchMore()` to the methods table; mention in pagination section.
- `CHANGELOG.md` — entry under the next minor version.

### Design Decisions

- **Approach A (push up into ListView), not B (middle class) or C (mixin).** TableView already extends ListView; pushing toolbar logic up is the smallest API surface. Mixins are less discoverable in this codebase (only `applyFileDropMixin` exists today). A middle class would re-parent TableView, which is invasive for a 2700-line battle-tested file. The methods being moved are all collection-level, not row-level — they don't reach into column/cell concerns, so the move is mostly mechanical.
- **`paginationMode: 'more'` is the ListView default when `paginated: true`.** Visual lists conventionally use load-more, not numbered pagination. Numbered remains the TableView default. `'none'` equals `paginated: false`.
- **Add `Collection.fetchMore()` rather than tweaking each consumer.** Single, well-tested method; also fixes a latent bug in `_performFetch`'s reset conditional. Aligns with the existing `setParams(autoFetch, debounceMs)` API style.
- **`persistSelection` defaults differ by mode.** In `'more'` mode rows are not torn down — selection persists naturally and users expect it. In `'pages'` mode, preserving existing TableView behavior matters more than the request's stated criterion; expose the flag so callers can opt in. Documented as a design choice rather than implicitly changing TableView behavior.
- **No `ListPage`.** Out of scope per the request. The `params-changed` event is the seam — it already works because we're moving (not removing) the existing emit.
- **`sortOptions` is a separate dropdown, not a takeover of column-header sort.** TableView keeps column-header sort dropdowns; ListView adds a single toolbar "Sort by" dropdown driven by `sortOptions`. Both ultimately set `collection.params.sort`.
- **No virtualization, no intersection-observer infinite scroll, no cursor pagination.** Out of scope per the request — flag as future work in the doc.

### Edge Cases

- **`fetchMore()` while a `fetch()` is in flight.** Collection already cancels the previous request when params change. `fetchMore` advances `start` so the request key differs — the in-flight reset request is cancelled, but the cancellation might leave the user mid-page. Document that callers should disable the Show More button while loading (we'll do this via the `fetch:start` listener).
- **`fetchMore()` past the end.** Guard in ListView: don't render the button when `collection.length() >= meta.count`. Defensive guard in Collection: if requested `start >= meta.count`, return early with the existing toJSON result.
- **Filter / search change while in `'more'` mode.** Resetting filters or search must reset `start` to 0 and replace, not append. `applyFilters()` already sets `start = 0`; the existing `_onCollectionReset()` rebuilds items. Selection is cleared because the dataset semantically changed (regardless of `persistSelection`). Document this.
- **Selection of a since-removed model in `persistSelection: true`.** When an item was selected, then a refresh removes it, `selectedItems` retains the orphan ID. Existing `_onModelsRemoved` already deletes from `selectedItems`. Verify that path covers `'more'` mode too.
- **Pagination footer with `'more'` mode and footer totals.** Footer totals are TableView-only — no concern for ListView. TableView keeps its own footer.
- **Toolbar with no filters and no search but `toolbarRight` set.** Existing TableView logic already renders the toolbar shell when `toolbarRight` is set — preserve that behavior.
- **Search input clearing via the native X button.** TableView wires `setupSearchClearListener()` on every render. Move that as-is.
- **Daterange filters with a hidden pill name.** TableView's `clearAllFilters` already preserves the `dr_*` trio for hidden daterange filters. Move the logic intact — don't re-derive.
- **Plain ListView with raw array collection (no REST).** `paginationMode: 'pages'` and `'more'` are no-ops without `meta.count`. Default to `'none'` when collection is not REST-backed; print a one-time `console.warn` if the caller explicitly asked for paging on a non-REST collection.

### Testing

- `npm run test:unit` — fastest feedback for the new ListView test file and the Collection.fetchMore additions.
- `npm run lint` — code style.
- `npm run dev` — manual verification under both `[data-bs-theme="light"]` and `[data-bs-theme="dark"]`:
  - the new ListView toolbar example
  - the new ListView paginated example
  - any existing TablePage in the example portal (regression check — sort, filter pills, search, numbered pagination)
  - any existing plain ListView example (regression check — no toolbar, no footer)
- Skip `npm run test:integration` and `npm run test:build` unless the unit run flushes anything build-touching.

### Docs Impact

Yes:

- `docs/web-mojo/components/ListView.md` — major expansion (new sections for toolbar / search / filters / pagination / show-more / sort / patterns)
- `docs/web-mojo/components/TableView.md` — small note that toolbar config lives on ListView
- `docs/web-mojo/forms/SearchFilterForms.md` — small steerage update
- `docs/web-mojo/core/Collection.md` — `fetchMore()` entry
- `CHANGELOG.md` — entry under next minor version
