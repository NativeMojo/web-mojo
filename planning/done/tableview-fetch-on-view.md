# TableView: fetchOnView option

| Field | Value |
|-------|-------|
| Type | request |
| Status | open |
| Date | 2026-05-07 |
| Priority | medium |

## Description

Add a `fetchOnView` option to `TableView` (default: `true`) that automatically calls `model.fetch()` before opening the detail view dialog. This ensures the VIEW_CLASS always receives the latest server data — not just the subset returned by the collection's list endpoint.

When enabled, opening a row's view dialog fetches the full model from its detail endpoint (e.g. `GET /api/things/123`) before constructing the ViewClass instance and showing the modal. A loading indicator is shown during the fetch.

When set to `false`, the current behavior is preserved: the model is passed as-is from the table row.

## Context

Collection list endpoints typically return a compact subset of fields (enough to populate table columns). Detail views (VIEW_CLASS) often need richer data — nested relations, computed fields, full text blobs — that only the single-resource endpoint returns.

Today, every VIEW_CLASS that needs fresh data must call `model.fetch()` internally in its own `onInit()` or `onMounted()`. This is boilerplate that every detail view repeats. A table-level option eliminates that duplication and makes the "always show fresh data" behavior automatic.

## Acceptance Criteria

- New `fetchOnView` option on TableView, default `true`.
- When `true`, `_onRowView` calls `await event.model.fetch()` before constructing the ViewClass or showing Modal.data().
- A loading state is visible during the fetch (use `showLoading()` / `hideLoading()` or a spinner in the dialog).
- If the fetch fails, show an error via `Modal.showError()` and do not open the view dialog.
- When `false`, current behavior is unchanged — model passed as-is.
- The `onItemView` custom handler path is unaffected (fetch does not run when a custom handler is provided — the handler owns the flow).

## Investigation

- **What exists:** `_onRowView` (TableView.js:1172-1201) passes `event.model` directly to `new ViewClass({ model, collection })` without fetching. Model.fetch() is fully implemented with dedup, cancellation, and rate limiting. The `!== false` default-on pattern is already used for `searchable`, `sortable`, `filterable`, `paginated`.
- **What changes:** `TableView.js` — constructor (add option), `_onRowView` (add conditional fetch + loading).
- **Constraints:** Must not break the `onItemView` custom handler path. Must handle fetch errors gracefully. Must use existing `Model.fetch()` — no custom REST calls. Loading UX should match existing patterns (`showLoading()` / `hideLoading()`).
- **Related files:**
  - `src/core/views/table/TableView.js` — primary change
  - `src/core/Model.js` — `fetch()` method (no changes needed)
  - `docs/web-mojo/components/TableView.md` — update docs
- **Endpoints:** None new. Uses the model's existing detail endpoint via `model.fetch()`.
- **Tests required:** Unit test that `_onRowView` calls `model.fetch()` when `fetchOnView` is true (default) and skips it when false.
- **Out of scope:** Not adding `fetchOnEdit` (edit forms already save/refresh). Not changing `_onRowClick` or `_onRowDelete`. Not adding graph/params options for the fetch call (can be a follow-up).
