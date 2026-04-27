# Migrate Legacy Dialog Callers to Modal

**Type**: request
**Status**: open
**Date**: 2026-04-26

## Description
Sweep the remaining `new Dialog(...)` and `Dialog.show*()` callers in `src/` over to the canonical `Modal.*` API. After the `ModalView` rewrite (`planning/requests/modalview-rewrite-dialog.md`), `Dialog.js` is a thin compatibility shim that routes everything through `Modal.*` — but ~24 direct instantiation sites and dozens of static-method calls still import `Dialog` directly. This request retires that shim usage so `Dialog.js` can eventually be deleted.

## Context
The ModalView rewrite intentionally kept `Dialog.js` as a compat shim to keep that PR reviewable. This is the deferred follow-up: a mechanical, file-by-file migration with no behavioral change.

### Direct `new Dialog(...)` sites (24)
- `src/core/forms/SectionedFormView.js:272`
- `src/core/views/navigation/Sidebar.js:204`
- `src/core/views/navigation/GroupSelectorButton.js:101`
- `src/extensions/admin/assistant/AssistantContextChat.js:638`
- `src/extensions/admin/account/devices/GeoIPView.js:579`
- `src/extensions/admin/messaging/sms/PhoneNumberView.js:212`
- `src/extensions/admin/incidents/TicketView.js:124`
- `src/extensions/admin/incidents/IncidentView.js:525`, `:963`, `:1029`
- `src/extensions/lightbox/ImageEditor.js:588`
- `src/extensions/lightbox/ImageFiltersView.js:756`
- `src/extensions/lightbox/ImageCropView.js:1186`
- `src/extensions/lightbox/PDFViewer.js:736`
- `src/extensions/lightbox/ImageTransformView.js:507`
- (plus the rest from `grep -rn "new Dialog(" src/`)

### Static-method callers
~40 files call `Dialog.alert / confirm / prompt / showDialog / showForm / showModelForm / showData / showCode / showHtmlPreview / showBusy / hideBusy / fixAllBackdropStacking` directly. Run `grep -rn "Dialog\." src/` for the full list.

## Acceptance Criteria
- [ ] Every `new Dialog({...})` in `src/` replaced with `Modal.dialog({...})` (or the more specific `Modal.show / form / modelForm` when the call shape matches).
- [ ] Every `Dialog.show*()` static call replaced with the matching `Modal.*` method (`showDialog → dialog`, `showForm → form`, `showModelForm → modelForm`, `showData → data`, `showCode → code`, `showHtmlPreview → htmlPreview`, `showBusy → showBusy` (alias kept), `hideBusy → hideBusy` (alias kept), `alert/confirm/prompt → alert/confirm/prompt`).
- [ ] Every `Dialog.fixAllBackdropStacking()` / `Dialog.getFullscreenAwareZIndex()` call replaced with `ModalView.*` equivalent (or a new `Modal.*` wrapper if cleaner).
- [ ] No remaining `import Dialog from '@core/views/feedback/Dialog.js'` statements in `src/` (excluding the shim file itself).
- [ ] `Dialog` export removed from `src/index.js` and `src/lite/index.js` once `src/` is clean (downstream consumers may still import it via deep-path; flagged as breaking in CHANGELOG).
- [ ] Optional final step: delete `src/core/views/feedback/Dialog.js` shim entirely. **Hold this for a separate PR** so the API removal is a clean, isolated commit.
- [ ] All tests pass (`npm test`), lint clean (`npm run lint`), both build targets pass (`npm run build`, `npm run build:lib`).

## Constraints
- Must not change behavior. Each migrated callsite should be functionally identical.
- Migrate by area (forms, navigation, lightbox, admin/incidents, admin/assistant, etc.) so each commit is small and reviewable.
- Watch for callers that rely on `dialog.on('action:foo', ...)` after `new Dialog(...)` + `dialog.show()` — `Modal.dialog({...})` returns a Promise rather than a Dialog instance, so those callsites may need to use the `buttons[].handler` callback form instead. See `SectionedFormView.showAsDialog` and `GroupSelectorButton.onActionShowSelector` — they're the trickiest because they wire post-show event listeners on the instance.
- Sidebar/GroupSelectorButton patterns (`new Dialog({ body: searchView, closeButton: true })` + `dialog.on('hidden', ...)` cleanup) need a `Modal.show(view, { ... })` mapping that preserves the close-on-item-selection flow.

## Notes
- This is mechanical work that benefits from a per-area cadence. Suggested commit slices:
  1. `src/core/forms/SectionedFormView.js` (wizard flow — needs care)
  2. `src/core/views/navigation/{Sidebar,GroupSelectorButton}.js` (search-view-as-body pattern)
  3. `src/extensions/lightbox/*` (5 sites, mostly similar shape)
  4. `src/extensions/admin/incidents/*` (3 sites in IncidentView + 1 in TicketView)
  5. `src/extensions/admin/assistant/AssistantContextChat.js` (1 site)
  6. `src/extensions/admin/{messaging,account/devices}/*` (2 sites)
  7. `Dialog.show*()` static-call sweep — group by extension area
  8. Remove `Dialog` from public exports + delete the shim
- Once the shim is gone, downstream apps that did `import { Dialog } from 'web-mojo'` will break. Coordinate with a CHANGELOG breaking note and a quick migration table (one-to-one mapping of every `Dialog.X` → `Modal.X`).
