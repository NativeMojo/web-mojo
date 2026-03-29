# ModalView — Complete Rewrite of Dialog.js

**Type**: request
**Status**: open
**Date**: 2026-03-17

## Description
Rewrite `Dialog.js` (2,100+ lines) as a clean, modern `ModalView.js` class. The current `Dialog.js` has grown organically and contains:
- Bootstrap 5 modal lifecycle management
- Static helper methods (alert, confirm, prompt, showForm, showModelForm, showData, showCode, etc.)
- Auto-sizing logic
- Z-index stacking management for nested modals
- Busy/loading indicator (global singleton)
- Code display with Prism.js syntax highlighting
- HTML preview with sandboxed iframes
- Context menu header integration
- Button system with promise-based resolution

The rewrite should produce a cleaner, more maintainable class that separates concerns and is easier for both humans and AI agents to understand.

## Context
We've already created `Modal.js` as a thin static wrapper around Dialog. This means the rewrite has minimal impact:
1. `Modal.js` is the public API — all consumer code uses `Modal.*` or `app.modal.*`
2. `ModalView.js` replaces `Dialog.js` internally — `Modal.js` just updates its import
3. No consumer code needs to change
4. The `this.Dialog = Modal` assignment in PortalApp provides backwards compatibility

### Current architecture
```
Consumer Code → Modal.js (static API) → Dialog.js (implementation)
TableView     → Modal.js              → Dialog.js
PortalApp     → Modal.js              → Dialog.js
```

### Target architecture
```
Consumer Code → Modal.js (static API) → ModalView.js (clean implementation)
```

## Acceptance Criteria
- [ ] New `ModalView.js` replaces `Dialog.js` as the implementation behind `Modal.js`
- [ ] All static helpers work identically (alert, confirm, prompt, form, modelForm, data, code, htmlPreview)
- [ ] Bootstrap 5 modal lifecycle correctly managed (show, hide, destroy, stacking)
- [ ] Auto-sizing works for dynamic content
- [ ] Z-index stacking works for nested modals
- [ ] Busy indicator (showBusy/hideBusy) works
- [ ] Button system with promise-based resolution works
- [ ] Context menu in header works
- [ ] Code display with syntax highlighting works
- [ ] All existing tests pass
- [ ] `npm run build:lib` passes
- [ ] No consumer code changes required (Modal.js API unchanged)

## Constraints
- Must maintain 100% API compatibility through Modal.js
- Must work with Bootstrap 5 modal system
- Must support all current sizes (sm, md, lg, xl, xxl, fullscreen, auto)
- Must handle fullscreen-aware z-index (for TableView fullscreen mode)
- `SectionedFormView.js`, `GroupSelectorButton.js`, and `Sidebar.js` still use `new Dialog()` directly — these need migration path or `ModalView` must support direct instantiation for those cases

## Design Considerations
- **Separate concerns**: Split busy indicator, code display, and HTML preview into their own modules
- **Cleaner lifecycle**: Use View lifecycle hooks consistently (onInit, onMount, onDestroy)
- **Simpler template**: The 200+ line template string should be broken into composable parts
- **Better JSDoc**: Every method should have clear documentation
- **Smaller surface area**: Some rarely-used features could be lazy-loaded

## Related Files
- `src/core/views/feedback/Dialog.js` — Current implementation (2,106 lines)
- `src/core/views/feedback/Modal.js` — Static wrapper (stays as-is, just updates import)
- `src/core/views/table/TableView.js` — Already migrated to Modal
- `src/core/pages/TablePage.js` — Already migrated to Modal
- `src/core/PortalApp.js` — Already migrated to Modal
- `src/core/forms/SectionedFormView.js` — Still uses `new Dialog()` directly
- `src/core/views/navigation/GroupSelectorButton.js` — Still uses `new Dialog()` directly
- `src/core/views/navigation/Sidebar.js` — Still uses `new Dialog()` directly

## Notes
- This is a large refactor — plan for incremental migration
- The `new Dialog()` instances in SectionedFormView, GroupSelectorButton, and Sidebar need to be addressed first (either migrate to Modal API or ensure ModalView supports direct instantiation)
- Consider splitting into: `ModalView.js` (core modal), `BusyIndicator.js` (loading), `CodeViewer.js` (syntax highlighting), `HtmlPreview.js` (sandboxed iframe)
- The static methods could live on ModalView itself or remain on Modal.js — TBD based on circular dep implications
