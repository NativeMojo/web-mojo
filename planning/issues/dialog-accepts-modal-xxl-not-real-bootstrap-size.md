# Dialog accepts `size: 'xxl'` but Bootstrap 5 has no `.modal-xxl` class

**Type**: bug
**Status**: open
**Date**: 2026-04-25

## Description

`src/core/views/feedback/Dialog.js` (line 376) treats `xxl` as a valid size and emits a `modal-xxl` class on the `.modal-dialog` element. Bootstrap 5 (5.3.x) does not ship a `.modal-xxl` rule — only `.modal-sm`, `.modal-lg`, and `.modal-xl`. Passing `size: 'xxl'` therefore renders the same as the default size, silently.

## Affected Area
- `src/core/views/feedback/Dialog.js:376`
- Any consumer that uses `Modal.show(view, { size: 'xxl' })` or `Dialog.showDialog({ size: 'xxl' })`.

## Expected Behavior

Either:
- Drop `'xxl'` from the valid-size list so consumers get a clearer signal (or a console warn) that it isn't supported, OR
- Ship a `.modal-xxl` rule in `src/core/css/core.css` (or wherever modal styles live) that defines an xxl breakpoint — e.g. `.modal-xxl { --bs-modal-width: 1320px; }` matching Bootstrap's other size-class pattern.

## Surfaced By

Wave 2.5 ModalExample listed `xxl` as a clickable size; verifying it in the browser showed it rendering identically to the default.

---
## Resolution
**Status**: open
