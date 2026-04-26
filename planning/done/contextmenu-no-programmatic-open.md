# `ContextMenu` has no programmatic `open()` for right-click triggers

**Type**: bug
**Status**: done
**Date**: 2026-04-25

## Description

`ContextMenu` is built around a Bootstrap dropdown trigger button. To use the menu in a right-click pattern (where the menu opens at the cursor without a visible trigger), there's no first-class way — you have to:

1. Add a hidden trigger button to the DOM,
2. `document.addEventListener('contextmenu', ...)` on the row,
3. Look up the trigger's Bootstrap dropdown instance manually:
   ```js
   bootstrap.Dropdown.getOrCreateInstance(triggerEl).show()
   ```

This is a common pattern (file managers, table rows, etc.) and the example wires it by hand.

## Expected Behavior

Either:
- A `menu.openAt(x, y, contextItem)` method that handles the Bootstrap call internally, OR
- A documented helper like `ContextMenu.attachToRightClick(triggerEl, rowEl, contextItem)` that wires the event + opens the menu.

## Affected Area
- `src/core/views/feedback/ContextMenu.js`

## Surfaced By

Wave 2.5 `examples/portal/examples/components/ContextMenu/ContextMenuRowExample.js` — works, but only via the manual Bootstrap call. Worth a thin helper.

---
## Resolution
**Status**: done
**Date**: 2026-04-25

Added two first-class methods to `ContextMenu` so right-click patterns no longer have to hand-roll Bootstrap dropdown plumbing:

1. **`menu.openAt(x, y, contextItem)`** — positions the existing Bootstrap dropdown trigger button at viewport coordinates `(x, y)` with `position: fixed`, optionally updates `menu.context` so the handler/dispatch path sees the right row, then calls `bootstrap.Dropdown.getOrCreateInstance(trigger).show()`. Renders and (if the menu has no parent/container) appends to `document.body` automatically. Click-outside-to-close still works because Bootstrap remains in charge of the open/closed lifecycle.

2. **`ContextMenu.attachToRightClick(element, getContextItem, menuOptions)`** *(static)* — wires a `contextmenu` listener on `element` that calls `event.preventDefault()` and opens the menu at the cursor with the context returned from `getContextItem(event)`. Either reuses a pre-built menu via `{ menu: existingInstance }` or constructs a fresh one from the given options. Returns the ContextMenu instance; pair with `menu.detachRightClick()` for cleanup.

The trigger-button path (used by `FileManagerTablePage`, `IncidentView`, `BouncerSignalView`, etc.) is unchanged. The only behavior tweak in `onActionMenuItemClick` is an added `if (this.parent && this.parent.events)` guard so a parent-less menu opened via `attachToRightClick` doesn't throw when a click has neither an inline `handler` nor a parent dispatch target.

### Files changed
- `src/core/views/feedback/ContextMenu.js` — `openAt`, `attachToRightClick`, `detachRightClick`
- `docs/web-mojo/components/ContextMenu.md` — new "Right-click pattern" section under Common Patterns plus entries under Instance Methods
- `examples/portal/examples/components/ContextMenu/ContextMenuRowExample.js` — switched to `ContextMenu.attachToRightClick(...)`, dropped the manual `bootstrap.Dropdown.getOrCreateInstance(...)` plumbing
- `test/unit/ContextMenu.test.js` — 9 new unit tests covering both helpers
- `test/utils/simple-module-loader.js` — registered `ContextMenu` and added the missing `View` dependencies (`EventDelegate`, `MojoMustache`) so partial loads don't break Mustache-based View tests

