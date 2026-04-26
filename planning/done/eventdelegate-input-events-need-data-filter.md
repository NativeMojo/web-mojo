# `EventDelegate` only forwards input keystrokes when `data-filter="live-search"` is set

**Type**: bug
**Status**: resolved
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
**Status**: resolved
**Date**: 2026-04-25

`EventDelegate` now treats `data-action` on form controls (`<input>`, `<textarea>`, `<select>`) as a first-class input/change handler, not just a click handler. `<input data-action="filter">` dispatches `onActionFilter` on every keystroke — no `data-change-action` + `data-filter="live-search"` combo needed.

### Changes
- `src/core/mixins/EventDelegate.js`:
  - `onChange` now falls back to `data-action` on form controls when no `data-change-action` is in scope.
  - `onInput` adds a parallel branch for `data-action` on form controls; the existing `data-change-action` + `data-filter="live-search"` path still wins when both are present.
  - New `data-action-debounce="<ms>"` attribute (opt-in) debounces input dispatch on a per-action / per-`data-container` scope. Default: no debounce.
  - Added an `isFormControl(el)` helper.
- `docs/web-mojo/core/Events.md`: documented the new behavior on `data-action`, the new `data-action-debounce` attribute, and the updated input-event section.
- `.claude/rules/views.md`: hard-rule entry under "Actions and Containers" so future agents pick the right pattern first.
- `test/unit/EventDelegate.test.js`: 8 regression tests covering input/change dispatch on `<input>`/`<select>`/`<textarea>`, the non-form-control non-firing case, click parity, debounce, change-action precedence, and that `onChange*` is not invoked when only `data-action` is set.

### Verification
- `node test/test-runner.js --suite unit` → 423/423 passed.

### Follow-ups (not done in this task)
- `examples/portal/examples/components/ListView/ListViewLiveFilterExample.js` can now drop the `data-change-action` + `data-filter="live-search"` + `data-filter-debounce="0"` combo and use plain `<input data-action="update-search">` (with `data-action-debounce` if desired). Left as a separate cleanup.
