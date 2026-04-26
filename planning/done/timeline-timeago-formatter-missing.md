# TimelineViewItem references unregistered `timeago` formatter

**Type**: bug
**Status**: open
**Date**: 2026-04-25

## Description

`TimelineViewItem` (the timeline extension's item view) calls `dataFormatter.pipe(date, 'timeago')`. No formatter named `timeago` is registered in `DataFormatter`. The pipe call falls back silently and emits a `Formatter 'timeago' not found` warning to the console for every rendered timeline item.

## Reproduction

Open the new portal at `?page=extensions/timeline-view`. Each rendered event triggers one warning.

## Expected Behavior

Either (a) register a `timeago` formatter (likely as an alias of the existing `relative` / `fromNow` formatters), or (b) update `TimelineViewItem` to use the actual registered name (`relative` or `fromNow`).

## Actual Behavior

- `src/core/utils/DataFormatter.js` registers `relative`, `fromNow` (alias of `relative`), and `relative_short`. No `timeago`.
- `src/extensions/timeline/TimelineViewItem.js:105` calls `'timeago'`.

The mismatch means the formatter no-ops every time and pollutes the console.

## Affected Area
- **Files**: `src/extensions/timeline/TimelineViewItem.js:105`, `src/core/utils/DataFormatter.js:43-45`
- **Layer**: Extension + Util
- **Related docs**: `docs/web-mojo/extensions/TimelineView.md`, `docs/web-mojo/core/DataFormatter.md`

## Acceptance Criteria

- [ ] No `Formatter 'timeago' not found` warning when rendering a TimelineView.
- [ ] Either `timeago` registered (preferred — it's a common name developers expect) or TimelineViewItem updated to use a registered name.

## Surfaced By

Wave 2 `examples/portal/examples/extensions/TimelineView/TimelineViewExample.js` rendered cleanly in the browser but flooded the console with the warning.

---
## Resolution
**Status**: Resolved — 2026-04-25
**Files changed**: `src/core/utils/DataFormatter.js`
**Fix**: Registered `timeago` as an alias of `relative` next to the existing `fromNow` alias. TimelineViewItem's call site continues to work; the warning no longer fires.
