# `ContextMenu` has no programmatic `open()` for right-click triggers

**Type**: bug
**Status**: open
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
**Status**: open
