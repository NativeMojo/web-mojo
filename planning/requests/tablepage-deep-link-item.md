# TablePage Deep Link to Item Dialog

**Type**: request
**Status**: open
**Date**: 2026-03-28

## Description
When a user clicks a row in a TablePage, the item's ModelView opens in a Modal/Dialog but the URL doesn't change. This means the user can't share a direct link to that specific item view — they can only share the table URL.

Add `_item=MODEL_ID` URL param support so that:
1. Opening an item dialog appends `_item=ID` to the URL
2. Loading a TablePage with `_item=ID` in the URL auto-opens that item's dialog
3. Closing the dialog removes `_item` from the URL

## Context
- `src/core/pages/TablePage.js` — already has URL sync via `syncUrl()` and `updateBrowserUrl()`
- `src/core/views/table/TableView.js` — handles row clicks via `_onRowView()`, opens dialog via `Modal.dialog()`
- The dialog returns a Promise that resolves when closed (backdrop, ESC, or button click)
- TablePage already reserves `_item` as a URL param (alongside `start`, `size`, `sort`, `search`)

## Acceptance Criteria
- [ ] Clicking a row in TablePage adds `_item=MODEL_ID` to the URL
- [ ] Loading a TablePage URL with `_item=ID` fetches that model and opens the item dialog
- [ ] Closing the dialog (any method) removes `_item` from the URL
- [ ] Direct-linked item dialog works even if the item isn't in the current table page
- [ ] Works with both `itemView` (custom ViewClass) and fallback `Modal.data()` patterns
- [ ] No change to TableView standalone behavior (only TablePage adds URL tracking)

## Constraints
- Keep changes in TablePage only — don't modify TableView's core row click behavior
- Use existing `updateBrowserUrl()` for URL manipulation
- `_item` param name chosen to avoid collisions with model field names

## Notes
- TableView emits `row:view` before opening the dialog, and the dialog is `await`ed — TablePage can hook into this flow
- The collection may need a way to fetch a single model by ID if the item isn't loaded in the current page
