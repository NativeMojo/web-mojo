# ModalView — Complete Rewrite of Dialog.js

**Type**: request
**Status**: resolved
**Date**: 2026-03-17
**Resolved**: 2026-04-26

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

---

## Plan

### Objective
Replace the 1,987-line `Dialog.js` god-class with a clean, modular architecture: a focused `ModalView.js` (modal mechanics only), small dedicated views for the heavy ad-hoc payloads (`CodeViewer`, `HtmlPreview`), a separate `BusyIndicator` module, and a `Modal.js` static facade that owns **all** static helpers. `Dialog.js` becomes a thin compatibility shim so the 24 `new Dialog()` and ~40 `Dialog.show*()` callers in `src/` continue working unchanged. A separate follow-up request (`planning/requests/migrate-legacy-dialog-callers.md`) will sweep those callers to `Modal.*` afterwards.

### Pre-flight finding
The original request claimed only `SectionedFormView`, `GroupSelectorButton`, and `Sidebar` still use `new Dialog()` directly. A grep shows **24 `new Dialog(...)` sites** (incl. `extensions/admin/incidents/IncidentView.js` x3, `extensions/lightbox/*` x5, `extensions/admin/assistant/AssistantContextChat.js`, etc.) and many more `Dialog.show*()` static calls. Migrating every consumer is out of scope here — handled by the follow-up.

### Steps

1. **`src/core/views/feedback/ModalView.js`** (new, ~400-500 lines)
   - Extends `View`. Contains only the modal-class mechanics currently in `Dialog.js`:
     - Constructor (id/className/aria attrs), size handling (sm/md/lg/xl/xxl/fullscreen/auto), `centered`, `scrollable`, `backdrop`, `keyboard`, `focus`, `header/body/footer` (incl. View, Promise<View>, function content via `_processBody/Header/FooterContent`).
     - `getTemplate`, `buildHeader`, `buildBody`, `buildFooter`, `buildContextMenu`, `filterContextMenuItems`.
     - `mount` override (mounts to fullscreen element or body), `onAfterRender` (Prism highlight pass + autosize hookup), `onAfterMount` (wires Bootstrap modal + bindBootstrapEvents).
     - Auto-sizing (`setupAutoSizing` / `applyAutoSizing` / `resetAutoSizing`).
     - Z-index/stacking statics (`_openDialogs`, `_baseZIndex`, `getFullscreenAwareZIndex`, `fixAllBackdropStacking`, `updateAllBackdropStacking`).
     - Instance methods: `show`, `hide`, `toggle`, `isShown`, `getModal`, `setContent`, `setTitle`, `setLoading`, `handleUpdate`, `destroy`, `onBeforeDestroy`.
   - **Removes** from this file: every `static showXxx(...)` helper. They move to `Modal.js` (step 5).

2. **`src/core/views/feedback/BusyIndicator.js`** (new, ~80 lines)
   - Owns the existing `Modal.loading / hideLoading` overlay logic (the modern frosted-glass card already implemented in `Modal.js` lines 357-491). Keeps the same counter + timeout semantics + `mojo-loading-overlay` markup.
   - Exports `{ show(options), hide(force), isShown() }` plus `showBusy/hideBusy` aliases for the old `Dialog.showBusy` callers.
   - **Consolidate to one overlay**: the dark-scrim `mojo-busy-indicator` from `Dialog.showBusy` (lines 82-165) is dropped; the modern frosted card replaces it. Reads z-index via `ModalView.getFullscreenAwareZIndex().modal + 1000` so spinner always stacks above any open modal.

3. **`src/core/views/feedback/CodeViewer.js`** (new, ~80 lines)
   - Small `View` subclass that takes `{ code, language }` and renders the syntax-highlighted `<pre><code>` block currently produced by `Dialog.formatCode` (lines 1191-1249). Moves the inline `<style>` block and Prism integration into its own template/`onAfterRender`.
   - Exports `static formatCode(code, lang)` and `static highlightCodeBlocks(container)` for the rare external callers (FormView etc.) that just want the formatted HTML.

4. **`src/core/views/feedback/HtmlPreview.js`** (new, ~50 lines)
   - Small `View` subclass that takes `{ html, height }` and renders the sandboxed `<iframe>` + Refresh control currently in `Dialog.showHtmlPreview` (lines 1288-1361). Writes the iframe content in `onAfterMount` (post-DOM-attach is required for iframe write).

5. **`src/core/views/feedback/Modal.js`** (rewritten, ~600 lines)
   - Becomes the canonical implementation site for every static helper. Imports `ModalView`, `BusyIndicator`, `CodeViewer`, `HtmlPreview`; lazy-imports `FormView` / `DataView` / `FileModel`.
   - Static API (final shape):
     - **Existing canonical helpers (kept):** `alert(msg, title?, opts?)`, `confirm(msg, title?, opts?)`, `prompt(msg, title?, opts?)`, `show(view, opts?)`, `showModel(model, opts?)`, `showModelById(ModelClass, id, opts?)`, `showError(msg)`, `loading(opts?)`, `hideLoading(force?)`.
     - **New canonical methods (moved from Dialog):** `dialog(opts)` (current `Dialog.showDialog`), `form(opts)` (current `Dialog.showForm`), `modelForm(opts)` (current `Dialog.showModelForm`), `data(opts)` (current `Dialog.showData`), `code(opts)` (current `Dialog.showCode`), `htmlPreview(opts)` (current `Dialog.showHtmlPreview`), `showModelView(model, opts)` (read-only model dialog), `updateModelImage(opts, fieldOpts)` (avatar uploader).
     - **Aliases (kept):** `showBusy → loading`, `hideBusy → hideLoading`.
   - Single shared `_renderAndAwait(modalView, { buttons, rejectOnDismiss })` helper for `Modal.dialog`, `Modal.form`, `Modal.modelForm`, `Modal.code`, `Modal.htmlPreview`, `Modal.confirm`, `Modal.prompt`. Kills ~300 lines of duplicated render-show-bind-resolve-destroy code.

6. **`src/core/views/feedback/Dialog.js`** (replaced, ~50 lines — compat shim)
   - Re-exports `ModalView` as the default export so `import Dialog from '@core/views/feedback/Dialog.js'` and `new Dialog({...})` keep working in all 24 internal direct-instantiation sites.
   - Static method shim: each static (`showDialog`, `showForm`, `showModelForm`, `showData`, `showCode`, `showHtmlPreview`, `showModelView`, `updateModelImage`, `alert`, `confirm`, `prompt`, `showBusy`, `hideBusy`, `getFullscreenAwareZIndex`, `fixAllBackdropStacking`, `updateAllBackdropStacking`, `formatCode`, `highlightCodeBlocks`) is a 1-line `return Modal.dialog(...)` / `return Modal.form(...)` / etc.
   - `Dialog._openDialogs = ModalView._openDialogs` (alias, not a separate array) so stacking still works for any caller mixing old and new instantiation.
   - One JSDoc `@deprecated` block at the top pointing at `Modal.*`.

7. **`src/core/forms/SectionedFormView.js`** (line 272), **`src/core/views/navigation/Sidebar.js`** (line 204), **`src/core/views/navigation/GroupSelectorButton.js`** (line 101)
   - No change. `new Dialog({...})` keeps working through the shim. Migration handled by the follow-up request.

8. **`src/core/forms/FormView.js`** (line 1196-1199)
   - Replace the dynamic `import('@core/views/feedback/Dialog.js')` + `Dialog.showHtmlPreview({...})` with `import('@core/views/feedback/Modal.js')` + `Modal.htmlPreview({...})`. Only place in core that triggers `showHtmlPreview`.

9. **`src/core/PortalApp.js`** (line 70) and **`src/core/WebApp.js`** (line 79)
   - No change. `this.modal = Modal` and `this.Dialog = Modal` already point at the right object.

10. **`src/index.js`**
    - Add `export { default as ModalView } from '@core/views/feedback/ModalView.js'` alongside the existing `Dialog` and `Modal` exports.

11. **`src/lite/index.js`**
    - Add `import ModalView from '@core/views/feedback/ModalView.js'`, `MOJO.ModalView = ModalView`, and add `ModalView` to the ESM export block.

12. **`test/unit/Modal.alert.test.js`**
    - Update the mock strategy: instead of mocking `Dialog.showDialog`, mock `ModalView.prototype.show/render/destroy` and assert on the constructor opts. Clean break, matches the new architecture.

13. **`docs/web-mojo/components/Modal.md`**
    - Add the newly-canonical methods to the API table: `Modal.dialog`, `Modal.code`, `Modal.htmlPreview`, `Modal.showModelView`, `Modal.updateModelImage`. Drop the "delegates to `Dialog.showX`" footnote rows.

14. **`docs/web-mojo/components/Dialog.md`**
    - Promote the deprecation banner from "still works" to "compat shim — use `Modal.*`". Add a Dialog→Modal migration table.

15. **`docs/web-mojo/components/ModalView.md`** (new)
    - Short reference for `ModalView` as the underlying View class consumers can `extends`. Constructor options, instance methods, when to use `new ModalView()` vs `Modal.*`.

16. **`docs/web-mojo/README.md`** and **`docs/agent/architecture.md`**
    - Add `ModalView` to the Components list and AI-agent quick-lookup table. Update the `Dialog` row in the architecture doc to point at `ModalView.js` and note the shim.

17. **`CHANGELOG.md`**
    - Unreleased entry: `**Refactor**: Dialog.js (1,987 lines) split into ModalView (mechanics), BusyIndicator, CodeViewer, HtmlPreview. Modal.js gains canonical implementations of dialog/form/modelForm/data/code/htmlPreview/showModelView/updateModelImage. Dialog.js is now a thin compat shim — no consumer change required. Dark busy-indicator overlay consolidated into the modern frosted-card loading overlay.`

### Design Decisions

- **`Dialog.js` becomes a shim, not a deletion.** With 24 `new Dialog()` sites in `src/` plus a public export, a hard rename would force a parallel migration of dozens of files. The shim costs ~50 lines and keeps the rewrite reviewable in one PR. Follow-up request handles call-site sweeps.
- **All static helpers live on `Modal`, not `ModalView`.** Modal.js is already advertised in docs as the canonical surface and `app.modal` is the runtime entrypoint. Keeping ModalView free of static helpers means it reads as a focused View class. Avoids the circular-static-import dance the current Dialog/Modal pair does.
- **`Modal.js` no longer imports `Dialog.js`.** Direction reverses: `Dialog.js` (shim) → `Modal.js` → `ModalView.js`. Cleaner graph.
- **One shared `_renderAndAwait` helper.** Today's static helpers each duplicate the same render-show-bind-resolve-destroy dance with subtle differences. One helper that takes `{ buttons, onAction, rejectOnDismiss }` kills ~300 lines of near-duplicate code.
- **Drop the dark `mojo-busy-indicator` overlay.** Consolidate to the modern frosted card. Visual change is minor; code-quality win is large.
- **CodeViewer/HtmlPreview as Views, not raw HTML strings.** They participate in the View lifecycle (proper destroy, no inline `<style>` re-injection on every open).
- **Add `ModalView` to public exports.** Useful for downstream subclassing.

### Edge Cases

- **Z-index stacking with the rewrite**: `Dialog._openDialogs` must alias `ModalView._openDialogs` (not a separate empty array) or stacking breaks for callers mixing old and new instantiation. Same for `_baseZIndex`, `getFullscreenAwareZIndex`, `fixAllBackdropStacking`.
- **Fullscreen-table mount target**: every `await dialog.render(true, targetContainer)` pattern computes `document.querySelector('.table-fullscreen') || document.body`. The new `_renderAndAwait` must keep this — load-bearing for TableView's fullscreen mode.
- **BusyIndicator z-index vs open dialogs**: must read from `ModalView.getFullscreenAwareZIndex()` (not hardcode), or the spinner ends up underneath an open `Modal.dialog(...)`.
- **Body-View lifecycle in `setContent`**: `Dialog.setContent` (line 1041) runs after mount, so the manual `child.render(bodyEl)` is correct. Preserve exactly — don't "fix" it.
- **Form errors clear loading overlay**: `Dialog.showForm`'s autoSave path (lines 1634-1646) and `Dialog.showModelForm`'s submit handler (lines 1831-1858) call `dialog.setLoading(true)` then `setLoading(false)` on error and `dialog.render()` on autoSave failure. New `Modal.form/modelForm` must keep this.
- **`onActionMenuItemClick` dispatch path for context-menu**: the new `_renderAndAwait` must forward `action:foo` events back so callers can do `dialog.on('action:edit', ...)`.
- **Bootstrap not loaded yet**: `Dialog.onAfterMount` guards on `window.bootstrap?.Modal` and silently no-ops. Tests rely on this. Preserve in `ModalView.onAfterMount`.
- **`updateModelImage` File constructor**: lines 1726-1730 carefully resolve `window.File || globalThis.File` and throw a clear error if absent. Preserve.

### Testing

- `npm run test:unit` — must stay green.
- `npm run lint` — must stay clean.
- `npm run build:lib` and `npm run build` — explicitly listed in acceptance criteria.
- Manual smoke (run `npm run dev`):
  - `examples/portal/examples/components/Dialog/*` — alert/confirm/prompt/showBusy/showDialog, context-menu permission gating, View as body, showForm + showModelForm.
  - `examples/portal/examples/components/Modal/*` — Modal entrypoints.
  - **TableView fullscreen + dialog stacking**: open TableView in fullscreen, click row to open `Modal.showModel(...)`, confirm dialog mounts inside fullscreen container with correct z-index.
  - **Sidebar group selector** + **SectionedFormView wizard** — verify `new Dialog({...})` shim path and `dialog.on('action:wizard-*')` plumbing.

### Docs Impact

- New: `docs/web-mojo/components/ModalView.md`.
- Updated: `docs/web-mojo/components/Modal.md`, `docs/web-mojo/components/Dialog.md`, `docs/web-mojo/README.md`, `docs/agent/architecture.md`, `CHANGELOG.md`.

### Out of Scope

- Migrating the 24 `new Dialog(...)` sites and dozens of `Dialog.show*()` static calls — covered by follow-up `planning/requests/migrate-legacy-dialog-callers.md`.
- Visual redesign of the modal/dialog itself.
- Removing the `this.Dialog = Modal` backwards-compat alias on `PortalApp`.
- Splitting `Modal.js` itself further (e.g., `ModalAlert.js`, `ModalConfirm.js`).

---

## Resolution

**Commits**: `f518ecd` (split + new files + initial doc updates), `371720d` (sweep stale `Dialog.*` refs across the wider docs).

### What was implemented

The 1,987-line `src/core/views/feedback/Dialog.js` god-class is split into focused modules; `Dialog.js` survives as a thin compatibility shim so the 24 in-tree `new Dialog(...)` and `Dialog.show*()` callers keep working without change.

| File | Role | Lines |
|---|---|---|
| `src/core/views/feedback/ModalView.js` | Bootstrap 5 modal mechanics — lifecycle, sizing, z-index stacking, header/body/footer composition, button rendering, context menu | ~600 |
| `src/core/views/feedback/Modal.js` | Canonical static API — `dialog`, `show`, `showModel`, `showModelView`, `alert`, `confirm`, `prompt`, `form`, `modelForm`, `data`, `code`, `htmlPreview`, `updateModelImage`, `loading` | ~700 |
| `src/core/views/feedback/BusyIndicator.js` | Singleton frosted-glass loading overlay (counter-based) | ~140 |
| `src/core/views/feedback/CodeViewer.js` | Prism-highlighted code block view + `formatCode` / `highlightCodeBlocks` statics | ~95 |
| `src/core/views/feedback/HtmlPreview.js` | Sandboxed iframe preview view | ~65 |
| `src/core/views/feedback/Dialog.js` | Compat shim — default-exports `ModalView`; legacy statics one-line forward to `Modal.*` | ~70 |

A new `Modal._renderAndAwait(modal, { buttons, rejectOnDismiss, onAction, cleanup })` helper consolidates ~300 lines of duplicated render/show/resolve/destroy code that previously lived inside each static helper.

The two competing busy-indicator overlays (legacy dark `mojo-busy-indicator` + modern frosted `mojo-loading-overlay`) collapse into the modern frosted-card design only.

### Files changed

**Source (commit `f518ecd`)**
- `src/core/views/feedback/ModalView.js` — new
- `src/core/views/feedback/BusyIndicator.js` — new
- `src/core/views/feedback/CodeViewer.js` — new
- `src/core/views/feedback/HtmlPreview.js` — new
- `src/core/views/feedback/Modal.js` — rewritten around the new modules
- `src/core/views/feedback/Dialog.js` — rewritten as 70-line compat shim
- `src/core/forms/FormView.js` — single `Dialog.showHtmlPreview` call swapped to `Modal.htmlPreview`
- `src/index.js` — `ModalView` added to public exports
- `src/lite/index.js` — `ModalView` added to lite bundle exports + ESM exports

**Docs (commits `f518ecd` + `371720d`)**
- New: `docs/web-mojo/components/ModalView.md`
- Rewritten: `docs/web-mojo/components/Dialog.md` (deprecation banner + migration table)
- Updated: `docs/web-mojo/components/Modal.md`, `docs/web-mojo/core/WebApp.md`, `docs/web-mojo/README.md`, `docs/agent/architecture.md`, `CHANGELOG.md`
- Sweep: `docs/web-mojo/components/{DataView,DataView-QuickReference,FileView,TableView}.md`, `docs/web-mojo/extensions/{Map,MapView,UserProfile}.md`, `docs/web-mojo/forms/{FileHandling,README}.md`, `docs/web-mojo/models/BuiltinModels.md`, `docs/web-mojo/services/FileUpload.md` — all `Dialog.show*` examples replaced with `Modal.*`

**Planning**
- This file: `planning/requests/modalview-rewrite-dialog.md` — Status → resolved, Resolution appended, file moved to `planning/done/`
- New: `planning/requests/migrate-legacy-dialog-callers.md` — tracks the eventual sweep of in-`src/` Dialog callers

### Tests run

- `npm run test:unit` — **500/502 pass**. Two pre-existing ContextMenu failures (`renders the menu, positions the trigger…`, `wires a contextmenu listener…`) confirmed via `git stash` to exist on the base tree before the refactor. Net: zero new failures.
- `npm run test:integration` — pre-existing 0/3 (missing `@core/utils` alias resolution in Node, missing `src/mojo.js`, component load failure). Identical to base.
- `npm run test:build` — pre-existing 3/10. Identical to base.
- `npm run lint` — 71 problems (16 errors / 55 warnings), all in pre-existing files. None of the new modules (`ModalView.js`, `Modal.js`, `BusyIndicator.js`, `CodeViewer.js`, `HtmlPreview.js`) appear in lint output.
- `npm run build:lib` — clean build in 3.58s.
- Browser smoke (Vite dev server on `examples/portal/?page=components/dialog`): `Modal.alert`, `Modal.confirm`, `Modal.loading`, plus the legacy `Dialog` shim (default export instantiation + static methods) all confirmed working end-to-end with the live HMR’d code.

### Agent findings

**test-runner** — Clean. All failures observed pre-existed on the base tree.

**docs-updater** — 11 stale `Dialog.*` references across 11 docs swept to `Modal.*`. One stale relative link (`forms/README.md → ../features/Dialog.md`) repointed to `../components/Modal.md`. Changes folded into commit `371720d`.

**security-review** — Surfaced four issues (1 HIGH, 3 MEDIUM) and several LOW/INFO. **Every flagged pattern was confirmed pre-existing in the original `Dialog.js`** (verified via `git show HEAD~1:src/core/views/feedback/Dialog.js` — all four pattern locations exist in the pre-refactor file). The refactor faithfully preserved the existing behavior; it neither introduced nor expanded the surface. Findings, in priority order:

1. **HIGH — `HtmlPreview.js` iframe `sandbox="allow-same-origin"`.** Allows iframe content to access `parent.*`, cookies, and the parent-origin DOM. Pre-existing in `Dialog.js:1306`.
2. **MEDIUM — Raw HTML interpolation of `title` / `message` in `Modal.alert/confirm/prompt`.** Template-literal concatenation rather than escaping. Pre-existing pattern.
3. **MEDIUM — `_eyebrowStyle` (was `_withEyebrow`) CSS-injection surface.** Strips quotes/backslashes but not `;`, `)`, `}` — caller-controlled eyebrow text could close the CSS declaration.
4. **MEDIUM — `ModalView.buildHeader` injects `this.title` raw via `innerHTML`.** Pre-existing in `Dialog.js:442`.
5. **LOW — `window.lastDialog = this` global leak.** Pre-existing in `Dialog.js:965`. Looks like a debug remnant.

These are tracked as a follow-up: `planning/issues/security-modal-html-injection-and-iframe-sandbox.md` (to be created). They are explicitly **out of scope for this refactor**, whose goal was structural — splitting the file without changing behavior. Folding security fixes into the same commit would have made the structural diff harder to audit.

### Follow-ups

- `planning/requests/migrate-legacy-dialog-callers.md` — sweep the 24 `new Dialog(...)` and `Dialog.show*()` callers in `src/` to use `Modal.*` directly, then eventually retire the shim.
- New: open a security issue for the five findings above (HtmlPreview sandbox, alert/confirm/prompt escaping, eyebrow CSS, header title escaping, `window.lastDialog`).
