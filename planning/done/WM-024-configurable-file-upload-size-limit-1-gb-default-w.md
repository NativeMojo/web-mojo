---
id: WM-024
type: feature
title: Configurable file upload size limit — 1 GB default, WebApp override
priority: P2
effort: S
owner: ian
opened: 2026-07-09
depends_on: []
related: []
links: []
---

# Configurable file upload size limit — 1 GB default, WebApp override

## What & Why
Uploading a 142.93 MB file on Admin › Storage (`system/files`) fails with
"File size (142.93 MB) exceeds maximum (100 MB)". The 100 MB cap is a
client-side constant hardcoded **twice** in `FileTablePage` — consuming apps
cannot change it without forking the page. The client check is a UX guard,
not security (real enforcement is server-side; the upload service imposes no
client limit), so the framework default should be permissive (1 GB) and the
consuming app should be able to set its own ceiling globally via WebApp
config, with a per-page option as the most specific override.

## Acceptance Criteria
- [x] `FileTablePage` resolves its upload limit in **one place**, with
      precedence: `this.options.maxFileSize` → `this.getApp()?.config?.max_upload_size`
      → default `1024 * 1024 * 1024` (1 GB). No duplicated size constants remain.
- [x] Both upload paths honor the resolved limit: drag-drop (`enableFileDrop`
      config, validated by `FileDropMixin`) and file-picker (`handleFileUpload`).
- [x] An app constructed with `new WebApp({ max_upload_size: N })` (incl.
      `PortalApp` / `PortalWebApp` — same `this.config`) caps storage uploads
      at N with no page-level changes.
- [x] A registration-level page option still wins over app config:
      `app.registerPage('system/files', FileTablePage, { maxFileSize: N, ... })`.
- [x] The error dialog reports the **effective** limit (existing
      `_formatFileSize` interpolation).
- [x] Other upload surfaces unchanged: `FileDropMixin` default stays 10 MB;
      `FormView` image fields, `ChatInputView`, and `ImageUploadView` keep
      their current 10 MB behavior.
- [x] Test coverage for the resolution order (page option > app config > 1 GB
      default).
- [x] Docs updated: `docs/web-mojo/core/WebApp.md` constructor-options table
      (new config key), `docs/web-mojo/mixins/FileDropMixin.md` (resolver),
      `docs/web-mojo/extensions/Admin.md` (storage page);
      `CHANGELOG.md` entry under `## Unreleased`.

## Investigation
**What exists**
- The 100 MB cap is hardcoded twice in
  `src/extensions/admin/storage/FileTablePage.js`:
  - `:115` — `maxFileSize: 100 * 1024 * 1024` in the `enableFileDrop({...})`
    call (drag-drop path; size validated by `FileDropMixin.js:264`).
  - `:144-146` — `const maxSize = 100 * 1024 * 1024` in `handleFileUpload()`
    (file-picker path; produces the reported error dialog at `:146`).
- Options already flow end-to-end: `registerPage('system/files',
  FileTablePageClass, {...})` at `src/admin.js:231` → `constructorOptions`
  (`WebApp.js:229`, merged at `:292-296`) → `this.options` (`View.js:44`).
  `FileTablePage` already reads `this.options.requiresGroup` and
  `this.getApp()` inside these same handlers (`:154`).
- App-level config precedent to mirror: `WebApp` stores its constructor arg
  as `this.config` (`WebApp.js:30`); components read global defaults via
  `app?.config?.shortlink_base_url || fallback` (`FileView.js:1174`,
  `ShortLinkView.js:60`). No other app-level default reads exist.
- No client-side limit exists beyond these UI checks: `File.upload()`
  (`src/core/models/Files.js:428`) → `FileUpload` service
  (`src/core/services/FileUpload.js`) is a single presigned XHR with no size
  guard and no chunking. `FileDropMixin.md:29` already frames `maxFileSize`
  as a UX hint, not security.

**What changes (file-level)**
- `src/extensions/admin/storage/FileTablePage.js` — a single resolution
  point (small helper/getter) used by both `:115` and `:144`.
- `docs/web-mojo/core/WebApp.md`, `docs/web-mojo/extensions/Admin.md`,
  `CHANGELOG.md`.

**Constraints**
- Do **not** change `FileDropMixin`'s 10 MB default (`FileDropMixin.js:15`) —
  `ChatInputView` (uses default) and `FormView` (`FormView.js:243`) depend on
  it; raising it globally is silent behavior creep.
- Naming: app config keys follow snake_case (`shortlink_base_url`
  precedent) → `max_upload_size`; the page option stays camelCase
  `maxFileSize` (matches the existing `FileDropMixin` config key).
- Raising the client default to 1 GB does **not** mean the backend accepts
  1 GB — nginx/django body limits and presign policies still apply.
  Deployments needing a lower ceiling set `max_upload_size` in app config.
- `FileUpload` is single-shot XHR; very large uploads ride on its existing
  timeout handling (`FileUpload.js:256`). Chunking is out of scope.

## Notes
**Agreed plan (scoped 2026-07-09, user-approved):**

Scope decision: `app.config.max_upload_size` governs the **storage page only**.
`ChatInputView`, `FormView` image fields, and `ImageUploadView` keep current
10 MB behavior untouched (mixin default line unchanged). Key naming settled:
app config `max_upload_size` (snake_case, `shortlink_base_url` precedent);
page option `maxFileSize` (camelCase, matches mixin config key).

Changes:
1. `src/core/mixins/FileDropMixin.js` — add mixin method
   `resolveMaxUploadSize(explicit, fallback)`: first **positive finite
   number** among `explicit`, `this.getApp()?.config?.max_upload_size`,
   `fallback`. No change to existing 10 MB default or validation; zero
   behavior change for current consumers.
2. `src/extensions/admin/storage/FileTablePage.js` — constructor resolves
   once: `this.maxUploadSize = this.resolveMaxUploadSize(
   this.options.maxFileSize, 1024 * 1024 * 1024)`; used by both the
   `enableFileDrop` config (was `:115`) and `handleFileUpload` (was `:144`).
   Both 100 MB literals deleted. Construction order is safe: mixin applied at
   module scope (`:247`); `this.options` / `this.app` set by `super()` before
   `enableFileDrop()` runs.

Design decisions:
- Resolver on FileDropMixin (owns the `maxFileSize` concept; other surfaces
  can adopt later without being forced now).
- Snapshot-once in constructor — app config is a constructor arg, doesn't
  mutate at runtime; keeps drop + picker paths guaranteed-consistent.
- No "0 = unlimited": non-positive/garbage values fall through to next tier.
- No mockup gate — zero visual change; both error messages already
  interpolate the effective limit.

Tests (feasibility verified — real FileTablePage cannot load under the
custom runner: unregistered in simple-module-loader, `@core` aliases
unresolvable in Node ESM, module-scope `File.VIEW_CLASS` throws with
stubbed imports):
- Behavioral resolver test (CJS): load FileDropMixin (add loader registry
  entry if needed), apply to a dummy class, call resolver on stub `this` —
  pattern of `TablePage.batchAction.test.js:84`. Cases: explicit wins; app
  config when no explicit; 1 GB when neither; junk values skipped; no app →
  fallback.
- Source-shape pin for FileTablePage wiring à la
  `WebhookSubscriptionTablePage.test.js`: no `100 * 1024 * 1024` literal
  remains; both call sites go through the resolver.

Docs: `docs/web-mojo/core/WebApp.md` (new `max_upload_size` row, Constructor
Options table ~:75-90), `docs/web-mojo/mixins/FileDropMixin.md` (resolver +
precedence), `docs/web-mojo/extensions/Admin.md` (storage page note),
`CHANGELOG.md` under `## Unreleased` (WM-024).

Constraints carried from investigation: client check is UX-only — server
body limits still govern (deployments needing lower ceilings set
`max_upload_size`); 1 GB single-shot XHR rides existing `FileUpload`
timeout handling; chunking out of scope.

## Resolution
- closed: 2026-07-09
- branch: main
- files changed: .eslintrc.json,CHANGELOG.md,docs/web-mojo/components/DetailView.md,docs/web-mojo/components/SideNavView.md,docs/web-mojo/extensions/Admin.md,memory.md,package.json,planning/.next_id,planning/done/WM-022-detailview-header-chips-evaluate-variant-and-icon-.md,planning/done/WM-023-admin-security-geofencing-rules-editor-simulator-b.md,planning/mockups/geofencing/index.html,src/admin.js,src/core/Model.js,src/core/PortalApp.js,src/core/WebApp.js,src/core/forms/FormView.js,src/core/forms/inputs/index.js,src/core/models/index.js,src/core/utils/DataFormatter.js,src/core/views/data/DetailView.js,src/core/views/feedback/Modal.js,src/core/views/navigation/GroupSelectorButton.js,src/core/views/navigation/SideNavView.js,src/core/views/navigation/TopNav.js,src/extensions/admin/account/groups/GroupGeofenceSection.js,src/extensions/admin/account/groups/GroupView.js,src/extensions/admin/css/admin.css,src/extensions/admin/incidents/TicketPanelView.js,src/extensions/admin/messaging/email/EmailDomainTablePage.js,src/extensions/admin/models/index.js,src/extensions/admin/security/geofence/GeofenceBlocksView.js,src/extensions/admin/security/geofence/GeofenceExemptionsView.js,src/extensions/admin/security/geofence/GeofencePostureHeader.js,src/extensions/admin/security/geofence/GeofenceRuleForm.js,src/extensions/admin/security/geofence/GeofenceRulesView.js,src/extensions/admin/security/geofence/GeofenceSimulatorView.js,src/extensions/admin/security/geofence/GeofencingPage.js,src/extensions/admin/security/geofence/geofenceData.js,src/extensions/docit/pages/DocEditPage.js,src/extensions/docit/pages/DocPage.js,src/extensions/mojo-auth/mojo-auth.js,src/templates.js,src/version.js,test/unit/DetailView.test.js,test/unit/GeofenceData.test.js,test/unit/Mustache-piped-sections.test.js,test/unit/SideNavView.permissions.test.js
- tests added: test/unit/FileDropMixin.resolveMaxUploadSize.test.js (8 behavioral precedence tests via loadModuleFromFile + stub `this`), test/unit/FileTablePage.uploadLimit.test.js (7 source-shape pins: no 100MB literal, single resolution point, both paths wired, mixin 10MB default untouched)
