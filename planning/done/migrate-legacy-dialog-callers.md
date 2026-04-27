# Migrate Legacy Dialog Callers to Modal

**Type**: request
**Status**: planned
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

---

## Plan

### Objective
Sweep every in-`src/` `Dialog.*` caller (60 files) over to the canonical `Modal.*` static API and `new ModalView({...})` instance API. The `Dialog.js` shim and the public `Dialog` re-exports in `src/index.js` / `src/lite/index.js` stay in place this PR — those removals are deferred to a separate breaking-change PR. After this sweep, `src/` (excluding the shim itself) contains zero `Dialog` references.

### Pre-flight findings
- **Pre-existing bug**: `src/extensions/admin/jobs/JobHealthView.js:206` calls `Dialog.showAlert(...)` — `showAlert` was never wired on the shim (only `showConfirm` is). Currently throws on the System Settings button click. Folding the fix into this sweep (`Modal.alert(...)`).
- **Total scope**: 60 source files importing `Dialog`, ~150 static-method call sites, 18 `new Dialog(...)` sites.
- **Static return-value compat**: `GeoIPView.show()` and `PhoneNumberView.show()` currently `return dialog` from their static helpers. Greps show no caller uses the returned instance — safe to switch to `Modal.show(view, opts)` (Promise return).

### Steps

#### 1. Static-only files (47 files, mechanical 1:1 rename)
Replace `import Dialog from '@core/views/feedback/Dialog.js'` with `import Modal from '@core/views/feedback/Modal.js'`, then mechanically swap every `Dialog.METHOD(...)` for the matching `Modal.METHOD(...)`:

| Old | New |
|---|---|
| `Dialog.alert(...)` | `Modal.alert(...)` |
| `Dialog.confirm(...)` | `Modal.confirm(...)` |
| `Dialog.showConfirm(...)` | `Modal.confirm(...)` |
| `Dialog.prompt(...)` | `Modal.prompt(...)` |
| `Dialog.showAlert(...)` | `Modal.alert(...)` *(1 site, also fixes pre-existing bug)* |
| `Dialog.showDialog(...)` | `Modal.dialog(...)` |
| `Dialog.showForm(...)` | `Modal.form(...)` |
| `Dialog.showModelForm(...)` | `Modal.modelForm(...)` |
| `Dialog.showData(...)` | `Modal.data(...)` |
| `Dialog.showCode(...)` | `Modal.code(...)` |
| `Dialog.showModelView(...)` | `Modal.showModelView(...)` |
| `Dialog.updateModelImage(...)` | `Modal.updateModelImage(...)` |
| `Dialog.showBusy(...)` | `Modal.showBusy(...)` |
| `Dialog.hideBusy(...)` | `Modal.hideBusy(...)` |

Static-only file list:
- `src/core/views/data/FileView.js`
- `src/extensions/admin/assistant/{AssistantConversationListView,AssistantConversationTablePage,AssistantConversationView,AssistantMemoryPage,AssistantSkillView}.js`
- `src/extensions/admin/security/{IPSetTablePage,IPSetView}.js`
- `src/extensions/admin/storage/FileManagerTablePage.js`
- `src/extensions/admin/jobs/{JobDetailsView,JobHealthView,RunnerDetailsView}.js` + `sections/JobOperationsSection.js`
- `src/extensions/admin/account/groups/GroupView.js`
- `src/extensions/admin/account/users/{UserTablePage,UserView}.js` + `sections/{AdminApiKeysSection,AdminConnectedSection,AdminPersonalSection,AdminProfileSection,AdminSecuritySection}.js`
- `src/extensions/admin/account/devices/{DeviceView,UserDeviceLocationView}.js`
- `src/extensions/admin/aws/CloudWatchResourceView.js`
- `src/extensions/admin/monitoring/{LogView,MetricsPermissionsView}.js`
- `src/extensions/admin/shortlinks/{ShortLinkTablePage,ShortLinkView}.js`
- `src/extensions/admin/messaging/email/{EmailDomainTablePage,EmailMailboxTablePage}.js`
- `src/extensions/admin/messaging/sms/SMSView.js`
- `src/extensions/admin/incidents/{EventView,RuleSetView}.js`
- `src/extensions/admin/shared/AdminMetadataSection.js`
- `src/extensions/charts/MetricsChart.js`
- `src/extensions/lightbox/ImageViewer.js`
- `src/extensions/map/location/LocationDialogs.js`
- `src/extensions/user-profile/views/{ProfileApiKeysSection,ProfileConnectedSection,ProfileDevicesSection,ProfileOverviewSection,ProfilePersonalSection,ProfileSecuritySection,ProfileSessionsSection,UserProfileView,PasskeySetupView}.js`

#### 2. Pure fire-and-forget `new Dialog(...)` sites (4 files, 7 sites)
Pattern: `new Dialog({header: false, size: 'xl', body: view, buttons: [{text: 'Close', class: 'btn-secondary', dismiss: true}]}) → render+show → discard`. No `dialog.on()`, no `setLoading`, no `element` access. Replace with `Modal.show(view, { size, header, title })`.

- `src/extensions/admin/incidents/IncidentView.js:525, :963, :1029` — three `RuleSetView` previews → `Modal.show(view, { size: 'xl', header: false })`.
- `src/extensions/admin/incidents/TicketView.js:124` — same shape.
- `src/extensions/admin/account/devices/GeoIPView.js:579` — `static show(ip)` returns dialog; switch to `Modal.show(view, { size: 'lg', header: false })` and **drop the `return dialog`** (no caller uses the returned value — verified by grep).
- `src/extensions/admin/messaging/sms/PhoneNumberView.js:212` — same pattern, same `return dialog` drop.
- `src/extensions/admin/assistant/AssistantContextChat.js:638` — has `header: true, title: 'AI Assistant'`. Use `Modal.show(view, { size: 'xl', title: 'AI Assistant' })` (which auto-sets `header: true` when `title` is passed).

#### 3. Instance-pattern `new Dialog(...)` sites (8 files, 11 sites)
The instance is needed for `dialog.on('action:foo')`, `dialog.setLoading()`, `dialog.element.querySelector()`, `dialog.hide()`, `dialog.isShown()`, `dialog.destroy()`. Replace `Dialog` import with `ModalView` import; literal `s/new Dialog(/new ModalView(/`. **No behavioral change** — `ModalView` is the canonical instance class that `Dialog` already aliased.

- `src/core/forms/SectionedFormView.js:272` — wizard/form (`setLoading`, `element`, `hide`, `isShown`, multiple `on('action:*')` listeners).
- `src/core/views/navigation/Sidebar.js:204` — `groupSelectorDialog` (`.hide()`, `.on('hidden')`, `.destroy()`, `.render()`, `.show()`).
- `src/core/views/navigation/GroupSelectorButton.js:101` — same pattern as Sidebar.
- `src/extensions/lightbox/ImageEditor.js:588` — `dialog.on('action:cancel'/'action:export-close'/'hidden')`, `dialog.hide()`.
- `src/extensions/lightbox/ImageFiltersView.js:756` — same shape (`apply-filters` action).
- `src/extensions/lightbox/ImageCropView.js:1186` — same shape (`apply-crop` action).
- `src/extensions/lightbox/PDFViewer.js:736` — uses unusual `await dialog.render() + document.body.appendChild(dialog.element) + await dialog.mount() + dialog.show()` chain; preserve verbatim (works on `ModalView` identically).
- `src/extensions/lightbox/ImageTransformView.js:507` — same shape (`apply-transform` action).

#### 4. Mixed (instance + static) files (5 files)
Need BOTH `import Modal` AND `import ModalView`:
- `src/core/views/navigation/Sidebar.js` — instance + `Dialog.confirm` + `Dialog.showDialog`.
- `src/extensions/admin/account/devices/GeoIPView.js` — fire-and-forget (Step 2) + many static calls. Only `Modal` import needed (no `new ModalView`).
- `src/extensions/admin/messaging/sms/PhoneNumberView.js` — same as GeoIPView (Step 2 + statics; only `Modal`).
- `src/extensions/admin/incidents/TicketView.js` — fire-and-forget + many statics. Only `Modal`.
- `src/extensions/admin/incidents/IncidentView.js` — fire-and-forget × 3 + many statics. Only `Modal`.

#### 5. CHANGELOG.md
Add under `## Unreleased`:

> **Refactor** — All in-`src/` callers migrated from the deprecated `Dialog.*` API to the canonical `Modal.*` / `ModalView` API. The `Dialog.js` shim and public `Dialog` re-exports in `src/index.js` / `src/lite/index.js` remain for downstream consumers — their removal is a separate breaking-change PR. Also fixes a pre-existing bug in `JobHealthView` where the System Settings button called the missing `Dialog.showAlert`.

### Design Decisions

- **Two replacement targets, picked by call shape**: pure fire-and-forget → `Modal.show(view, opts)` (Promise-based, idiomatic). Instance with `.on()` / `.setLoading()` / `.element` access → `new ModalView({...})` (preserves the existing handle pattern verbatim — `ModalView` is already a public export from the prior refactor). This minimizes diff and behavioral risk.
- **No conversion of `dialog.on('action:foo')` to `buttons[].handler` callbacks**. The `_renderAndAwait` handler form is more idiomatic but the per-button control flow (`return null` to keep open vs `dialog.setLoading + return` mid-action) is subtly different. Keeping `new ModalView(...)` for these sites is a true behavior-preserving rename.
- **Drop the unused `return dialog`** from `GeoIPView.show()` and `PhoneNumberView.show()` since `Modal.show()` returns a `Promise<value>`, not the dialog. Confirmed via grep that no callers use the returned value.
- **Don't remove the public `Dialog` exports yet**. Acceptance criteria flags this as a breaking change for downstream consumers. Per the request file's own "Hold this for a separate PR" note for the shim deletion, defer the export removal too so the breaking-change diff is isolated and reviewable.
- **One commit, area-grouped**. The sweep is mechanical and large; one commit with a body listing the sub-groups keeps history clean. Rolling back is `git revert HEAD` if anything regresses.

### Edge Cases

- **Files that need both imports**: lint-validated. The plan only adds `ModalView` where `new Dialog(...)` exists; only adds `Modal` where any `Dialog.METHOD(...)` exists. If any import becomes unused after the sweep, eslint flags it.
- **`PDFViewer.js`'s unusual `render() + appendChild + mount() + show()` chain**: preserved verbatim — `ModalView.render()` and `ModalView.mount()` work identically since `Dialog` was already re-exporting `ModalView`.
- **`Modal.show(view, opts)` header behavior**: when `opts.title` is defined, it auto-sets `header: true`; when undefined, `header: false`. Step-2 sites that explicitly pass `header: false` get correct behavior either way; the AssistantContextChat site that needs `header: true, title: 'AI Assistant'` gets it via passing `title`.
- **`Dialog.alert({type: 'warning'})` in GeoIPView/PhoneNumberView** preserves the warning alert chrome via `Modal.alert({message, type: 'warning'})` — same options shape.
- **`GroupSelectorButton.js` line 100 comment** ("Create dialog directly (not using showDialog helper to avoid promise issues)") becomes stale — update wording to reflect the `ModalView` rename.
- **No file-deletion side effects**: the `Dialog.js` shim, public exports, and `Dialog.md` doc all stay in place this PR.

### Testing
- `npm run build:lib` — must pass (every import resolves).
- `npm run lint` — must show no new warnings/errors vs base. Catches unused imports.
- `npm run test:unit` — must show no new failures vs the 2 pre-existing ContextMenu failures.
- Browser smoke in `examples/portal/`: exercise (a) a SectionedFormView wizard if the portal exposes one, (b) a lightbox modal (`/components/lightbox` page), (c) the Sidebar group selector if PortalApp has groups configured. If a smoke target is unreachable from the example portal, verify the migrated file's call shape against the pre-refactor `git show` of the same line and call it out in the resolution.
- No new tests required: this is a pure rename; `Modal.alert` / `Modal.confirm` etc. are already covered by `test/unit/Modal.alert.test.js`.

### Docs Impact
- **CHANGELOG.md** — Unreleased entry per Step 5.
- `docs/web-mojo/components/Dialog.md` already carries the deprecation banner from the prior refactor; its in-progress link to `planning/requests/migrate-legacy-dialog-callers.md` becomes a `planning/done/...` link as part of the build skill's move-to-done step. **Update this link** in the Resolution step.
- No other docs change — the public API surface (`Modal`, `ModalView`, `Dialog` shim) is unchanged this PR.

### Out of Scope
- Removing the public `Dialog` re-export from `src/index.js` and `src/lite/index.js` (breaking change for downstream consumers — separate PR).
- Deleting `src/core/views/feedback/Dialog.js` shim (separate PR).
- Removing `this.Dialog = Modal` backwards-compat alias on `PortalApp`.
- Migrating `dialog.on('action:foo')` patterns to `buttons[].handler` callbacks (true behavior-preserving rename only).
- Updating `docs/web-mojo/AGENT.md` (already cleaned in the prior refactor).
- Any test additions — this is a rename-only change.
