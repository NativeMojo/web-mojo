# `EventDelegate` only forwards input keystrokes when `data-filter="live-search"` is set

**Type**: bug
**Status**: open
**Date**: 2026-04-25

## Description

The natural pattern for a live-filter input is:

```html
<input type="search" data-action="filter" />
```

Plus an `onActionFilter(event)` handler on the parent View. This works for `click` and `submit`, but **does not** fire on keystrokes — `EventDelegate` only forwards `input` events when the element also carries `data-filter="live-search"`. The combo is non-obvious and undocumented.

## Reproduction

```html
<!-- Does NOT fire onActionFilter on keystroke -->
<input data-action="filter" />

<!-- DOES fire — requires both data-change-action AND data-filter="live-search" -->
<input data-change-action="filter" data-filter="live-search" data-filter-debounce="300" />
```

## Expected Behavior

Either:
- `<input data-action="filter">` fires `onActionFilter` on `input` events the same way it does for `click` on a button (the handler can choose what to do with the event type), OR
- The current combo is documented prominently in `docs/web-mojo/views.md` (project rules) and `docs/web-mojo/core/View.md` with a "live filter" recipe.

## Affected Area
- `src/core/mixins/EventDelegate.js`
- `.claude/rules/views.md`
- `docs/web-mojo/core/View.md`, `core/ViewChildViews.md`

## Surfaced By

Wave 2 search/filter example tried `data-action="filter"` first, found it didn't fire, then traced the source. Multiple agents independently hit this.

---
## Resolution
**Status**: open
