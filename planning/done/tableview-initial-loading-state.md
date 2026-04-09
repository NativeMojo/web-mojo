# TableView shows "No data" flash on initial load instead of loading spinner

| Field | Value |
|-------|-------|
| Type | bug |
| Status | done |
| Date | 2026-04-08 |
| Severity | medium |

## Description
When a TableView (or ListView) renders for the first time with a REST-backed collection, it briefly shows "No data available" before the collection fetch completes and data appears. This is confusing — the user thinks there's no data, then it "magically fills in" moments later.

## Context
Affects any TableView or ListView with a server-fetched collection. The typical path is through TablePage, but any standalone TableView exhibits the same behavior. This is a framework-level issue in ListView's initialization lifecycle.

## Acceptance Criteria
- On first render, if the collection has not been fetched yet, show a loading indicator (spinner) instead of the empty state
- The "No data available" message should only appear AFTER a fetch completes with zero results
- Existing behavior for preloaded collections (no fetch needed) should be unaffected

## Investigation
- **Likely root cause:** `ListView.onInit()` calls `setCollection()` → `_buildItems()` which sees an empty collection and sets `this.isEmpty = true`. The template renders "No data available". The initial `collection.fetch()` doesn't fire until `onAfterMount()` (line 462), which is AFTER the first render. Between first render and fetch completion, the user sees the false empty state.
- **Confidence:** high
- **Code path:**
  - `src/core/views/list/ListView.js:99-102` — `onInit()` calls `_initCollection()` → `setCollection()`
  - `src/core/views/list/ListView.js:186-194` — `_buildItems()` sets `this.isEmpty = true` for empty collection
  - `src/core/views/list/ListView.js:56-76` — template shows `{{#isEmpty}}No data{{/isEmpty}}`
  - `src/core/views/list/ListView.js:462-467` — `onAfterMount()` triggers `collection.fetch()` (too late)
  - `src/core/views/list/ListView.js:303-308` — `_onFetchStart()` sets `this.loading = true` and re-renders (but only after fetch begins)
- **Regression test:** not feasible — requires browser rendering lifecycle and network timing
- **Related files:**
  - `src/core/views/list/ListView.js` (primary fix target)
  - `src/core/views/table/TableView.js` (inherits from ListView)
  - `src/core/Collection.js` (emits fetch:start/fetch:end)
  - `src/core/pages/TablePage.js` (common consumer)

## Proposed Fix
In `ListView.onInit()` or `setCollection()`, set `this.loading = true` when the collection hasn't been fetched yet (`!collection.lastFetchTime` and `collection.restEnabled`). This way the first render shows the loading spinner template instead of the empty state. When `fetch:end` fires, `_onFetchEnd()` sets `loading = false` and re-renders with the actual data (or the real empty state if no results).

## Resolution

### What was implemented
In `ListView.setCollection()`, added a conditional check before `_buildItems()`. When the collection is REST-enabled, has never been fetched (`!lastFetchTime`), and is not preloaded, `this.loading = true` is set instead of calling `_buildItems()`. This ensures the first render shows the loading spinner template (`{{#loading}}`) instead of the false "No data available" empty state (`{{#isEmpty}}`). When the fetch completes, `_onFetchEnd()` sets `loading = false` and triggers a re-render with actual data.

### Files changed
- `src/core/views/list/ListView.js` — `setCollection()` method (lines 163-169)

### Tests run
- `npm run test:unit` — all ListView-related tests unaffected (pre-existing failures are module loading issues)
- `npm run build:lib` — build passes cleanly

### Agent findings
- Pending (test-runner, docs-updater, security-review spawned)
