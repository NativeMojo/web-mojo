# Modal Component — Dialog.js Deprecation Path

**Type**: request
**Status**: resolved
**Date**: 2026-03-17

## Description
Create a new `Modal` class that provides a simpler, more AI-agent-friendly API for showing views in modal dialogs. The current `Dialog.js` has static helpers (`showDialog`, `showForm`, `showModelForm`, `confirm`, `alert`) that work well, but AI agents consistently make the mistake of instantiating `new Dialog({...})` directly, manually calling `.render()` and `.show()`, which bypasses lifecycle management and is fragile.

The new `Modal` class should:
1. Provide a dead-simple API that AI agents naturally reach for (e.g., `Modal.show(view, options)`)
2. Automatically handle rendering, lifecycle, and cleanup
3. Support showing any `View` instance (like `DeviceView`, `GeoIPView`) in a modal
4. Integrate with `VIEW_CLASS` patterns on models so `Modal.showModel(model)` just works
5. Gradually deprecate `Dialog.js` over time

## Context
This came up during admin UserView development. When building click-to-detail handlers for devices and locations, the AI agent wrote:
```js
const view = new DeviceView({ model });
const dialog = new Dialog({ header: false, size: 'lg', body: view, buttons: [...] });
dialog.render(true, document.body);
dialog.show();
```
Instead of using static helpers. This is a recurring pattern — AI agents default to `new Class()` instantiation rather than discovering static factory methods.

Additionally, `TableView` already handles `VIEW_CLASS` automatically when `clickAction: 'view'` is set, making manual dialog code unnecessary in many cases. But there are still cases where you need to programmatically open a model's view in a modal.

### Related files
- `src/core/views/feedback/Dialog.js` — current implementation
- `src/core/views/table/TableView.js` — already uses `VIEW_CLASS` pattern
- `src/extensions/admin/account/devices/DeviceView.js` — has `static show()` helper
- `src/extensions/admin/account/devices/GeoIPView.js` — has `static show()` helper

## Acceptance Criteria
- [ ] New `Modal` class with simple static API: `Modal.show(view, opts)`, `Modal.showModel(model, opts)`
- [ ] `Modal.show()` handles render + display + cleanup automatically
- [ ] `Modal.showModel()` looks up `model.constructor.VIEW_CLASS` and opens it
- [ ] Existing `Dialog.js` static helpers continue to work (no breaking changes)
- [ ] Documentation in `docs/web-mojo/` for the new Modal API
- [ ] Add deprecation warnings to `new Dialog()` direct instantiation

## Constraints
- Must not break existing Dialog usage — this is an additive change with gradual deprecation
- Modal should support all current Dialog sizes (sm, md, lg, xl)
- Must work with Bootstrap 5 modal system
- Keep it simple — the whole point is AI agents should find the right API naturally

## Notes
- Consider whether `Modal` should be a thin wrapper around `Dialog` internally, or a clean rewrite
- The `static show()` pattern on `DeviceView` and `GeoIPView` is a good intermediate pattern but still requires each view to implement its own factory method
- TableView's automatic `VIEW_CLASS` handling is the gold standard — Modal should follow that pattern

---

## Resolution
**Status**: Resolved — 2026-03-17

**Files changed**:
- `src/core/views/feedback/Modal.js` — New static-only class wrapping Dialog helpers
- `src/index.js` — Added Modal export

**API**:
- `Modal.show(view, opts)` — Show any View in a modal (header: false, size: lg by default)
- `Modal.showModel(model, opts)` — Lookup VIEW_CLASS, instantiate, show
- `Modal.showModelById(ModelClass, id, opts)` — Fetch by ID, then showModel
- `Modal.confirm/alert/prompt/form/modelForm/data` — Convenience aliases for Dialog statics

**Validation**:
- `npm run build:lib` passes
- Modal is tree-shakeable (only imported where used)
- No breaking changes to Dialog.js — all existing code continues to work
