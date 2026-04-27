# Changelog

## Unreleased

### Improved — SeriesChart axis labels (nice numbers, formats, rotation)

- **Y-axis ticks** now snap to clean `1/2/5 × 10ⁿ` values via the Heckbert
  nice-number algorithm. The "API Metrics" chart and similar `MetricsChart`
  consumers now show `0, 25, 50, 75, 100` instead of `0, 28.77, 57.54,
  86.31, 115.08, 143.85`. `gridLines` becomes a target count; the algorithm
  picks the closest clean fit.
- **X-axis labels auto-rotate** `-45°` when they would overlap their slots.
  The chart's bottom padding expands automatically. No configuration
  required; rotation kicks in when labels collide.
- **`MetricsChart` defaults `xLabelFormat`** based on `granularity`:
  `minutes`/`hours` → `date:'HH:mm'` (`17:00`), `days`/`weeks` → `date:'MMM
  D'` (`Apr 26`), `months` → `date:'MMM YYYY'` (`Apr 2026`). Caller-supplied
  `tooltip.x` still wins. The default is re-applied when `setGranularity()`
  is called.
- Truncation cap raised from 10 → 24 chars (rotation handles long labels;
  truncation is the fallback for pathological cases like UUIDs).
- `_formatAxisValue` adds a `B` (billion) branch and step-aware decimal
  precision so very small or very large nice-tick ranges read cleanly.

### Docs — Phase 3 of taxonomy realignment (undocumented public exports)

- New doc pages in `docs/web-mojo/`:
  - `core/Router.md` — `Router` class: `?page=` URL handling, `navigate`, route patterns, `route:changed` / `route:notfound` events.
  - `components/ProgressView.md` — file-upload progress UI; `updateProgress`, `markCompleted`, etc.
  - `components/SimpleSearchView.md` — searchable list bound to a `Collection`; emits `item:selected`.
  - `utils/MustacheFormatter.md` — lower-level template renderer behind `View`; `registerFormatter` for custom pipes.
  - `mixins/FileDropMixin.md` — `applyFileDropMixin(ViewClass)` + `enableFileDrop({…})` + `onFileDrop(files, …)`.
- **Breaking**: `DataWrapper` named export removed from `src/index.js`. Triage found zero consumers (no `src/`, no `examples/`, no `test/` references). The class itself remains in `src/core/utils/MOJOUtils.js`; only the public re-export is gone.
- README + AGENT cross-links updated to surface the new pages.

### Added — Assistant: `assistant_text` event + chart-option passthrough

- **New `assistant_text` WS event** is now handled in `AssistantView`,
  `AssistantPanelView`, and `AssistantContextChat`. When the model writes
  prose alongside tool calls in the same turn, that intermediate text now
  renders as an assistant bubble before the tool-call status indicators.
  `assistant_response` remains the terminal signal that clears the thinking
  indicator and re-enables input. Conversations that don't emit
  `assistant_text` are unchanged.
- **`AssistantContextChat` gains a small `_adoptConversationId` helper** so
  all three assistant views handle new-conversation events uniformly. The
  adapter remains the canonical owner of `conversationId`.
- **Chart blocks now forward new `SeriesChart` / `PieChart` options** from
  the LLM into the chart constructor via a strict snake_case → camelCase
  allowlist. New block-level fields: `stacked`, `grouped`, `crosshair_tracking`,
  `cutout`, `show_labels`, `show_percentages`, `colors`, `show_legend`,
  `legend_position`. New per-series fields: `color`, `fill`, `smoothing`.
  Existing minimal chart blocks render identically.
- Stale doc comment in `AssistantMessageView._renderChartBlock` corrected
  (`MiniPieChart`/`MiniSeriesChart` → `PieChart`/`SeriesChart`).

### Docs — Phase 2 of taxonomy realignment

- New doc pages in `docs/web-mojo/`:
  - `extensions/Auth.md` — `mountAuth` + `createAuthClient` (`web-mojo/auth`).
  - `extensions/UserProfile.md` — `UserProfileView`, `PasskeySetupView`, the 11 section views (`web-mojo/user-profile`).
  - `extensions/DocIt.md` — `DocItApp` and the four documentation pages (`web-mojo/docit`).
  - `services/TokenManager.md` — JWT lifecycle, single-flight refresh, the auth gate.
  - `utils/DjangoLookups.md` — `field__lookup` syntax, `LOOKUPS` map, `parseFilterKey`, `formatFilterDisplay`.
  - `utils/ConsoleSilencer.md` — log-level filtering, URL/`localStorage` runtime overrides.
- `src/extensions/auth/README.md` deleted (the new `extensions/Auth.md` is canonical).
- `src/extensions/mojo-auth/mojo-auth.js` gets a `LEGACY shim` JSDoc header. No package entry, no internal callers; new code uses `web-mojo/auth`. File is kept for downstream apps still linking it directly.
- `docs/web-mojo/README.md`, `docs/web-mojo/AGENT.md`, and root `AGENT.md` cross-links updated to surface the new pages.
- `planning/notes/taxonomy-audit.md` notes that `src/core/utils/TemplateResolver.js` is orphaned (zero consumers, not exported) — tracked for a future cleanup pass.

### Bug fixes — typed alerts now actually render their type

- `Dialog.alert(message, title, options)` (and `Modal.alert(...)`) silently
  dropped the second and third arguments — every typed alert rendered as
  `info` regardless of the `type` option. The signature is now correctly
  honored: `Modal.alert('Saved!', 'Done', { type: 'success' })` produces a
  success-styled alert. Object-form (`Modal.alert({ message, title, type })`)
  and single-string form (`Modal.alert('hi')`) continue to work unchanged.
- `WebApp.showError / showSuccess / showInfo / showWarning` were broken in
  the same way and rendered identically. They now produce visually distinct
  typed alerts and route through `Modal.alert` directly.
- `WebApp.confirm` also routes through `Modal.confirm` for consistency.

### API direction — Modal is the canonical modal/dialog surface

- `Modal.alert / Modal.confirm / Modal.prompt` are now the canonical
  implementations. `Dialog.alert / Dialog.confirm / Dialog.prompt` have been
  rewritten as thin pass-throughs that delegate to Modal — all existing
  `Dialog.*` callers continue to work unchanged, but new code should call
  `Modal.*` directly.
- `Dialog` itself (the underlying View class) is unchanged: the constructor,
  `Dialog.showDialog / showForm / showModelForm / showCode / showHtmlPreview`,
  z-index management, and `Dialog.showBusy / hideBusy` continue to live there.
  Only the three top-level helpers moved.
- `docs/web-mojo/components/Modal.md` is now the canonical doc; Dialog.md
  retains its deprecation banner with pass-through notes under each helper.

### UI / CSS — refreshed dialog chrome and typed-alert accents

- All dialogs share a refreshed chrome: rounded corners (14px), soft
  drop-shadow, gradient header tint, and a small offset circular close
  button anchored to the top-right corner.
- Typed alerts (`Modal.alert(... { type })`) now get a 6px colored hero
  band across the top of the modal card and a subtle tinted card background,
  so each type is visually distinct without relying on an icon alone. Color
  tokens: success=`#198754`, error=`#dc3545`, warning=`#ffc107`;
  info/default uses `--mojo-dialog-accent` (see below).
- New CSS variable `--mojo-dialog-accent`, defined at `:root` and defaulting
  to `var(--bs-primary)`. Drives the header gradient tint and the info-typed
  alert accent. Override at `:root` (or any scope) to set a custom brand
  color without touching `--bs-primary`.
- Dark-mode rules added under `prefers-color-scheme: dark`, mirroring the
  shape of the existing toast.css dark-mode block.
- Internal styling hook: typed alerts add `modal-alert modal-alert-{type}`
  to the modal root for downstream apps that want to override the look.

### Breaking — Admin models moved to a separate package entry

- 14 admin-coupled `Model` / `Collection` classes have moved out of `src/core/models/`
  into `src/extensions/admin/models/`. The affected models: `AWS`, `Assistant`,
  `Bouncer`, `Email`, `Incident`, `IPSet`, `Job`, `JobRunner`, `LoginEvent`,
  `PublicMessage`, `Push`, `Phonehub`, `ScheduledTask`, `Tickets`.
- 7 of those (`AWS`, `Email`, `Incident`, `Job`, `JobRunner`, `Push`, `Tickets`)
  were previously re-exported from the main `web-mojo` entry. They are no longer.
  **Migration**: switch to the new `web-mojo/admin-models` entry.
  ```js
  // before
  import { Job, JobList, Incident } from 'web-mojo';
  // after
  import { Job, JobList, Incident } from 'web-mojo/admin-models';
  ```
- New package entry `web-mojo/admin-models` ships the 14 admin models as **data
  only** — no DOM, Bootstrap, or template deps. Use this entry from a Node
  script, an API client, or any non-portal UI. The `web-mojo/admin` entry
  remains the way to get the admin **pages** (sidebar, dashboards, table pages).
- `Log` and `ShortLink` stay in `src/core/models/` because they have legitimate
  non-admin consumers (`FileView`'s share-link feature, `user-profile`'s
  activity section). The audit's "admin-only" classification was overzealous on
  those two; their import paths and main-entry export are unchanged.
- `docs/web-mojo/models/BuiltinModels.md` now covers only the 10 still-core
  models. Admin models documented in `docs/web-mojo/extensions/Admin.md`.
- 73 internal `@core/models/<X>.js` import statements rewritten to
  `@ext/admin/models/<X>.js` across the 58 admin files that consume them.

### Examples Portal — area-mismatch realignment

- `TabView` moved from `extensions/` → `components/` (source has always been at
  `src/core/views/navigation/TabView.js`). Routes change:
  `?page=extensions/tab-view` → `?page=components/tab-view`. Doc moves to
  `docs/web-mojo/components/TabView.md`.
- `TablePage` doc moved from `components/` → `pages/` (source is at
  `src/core/pages/TablePage.js`). Doc path:
  `docs/web-mojo/pages/TablePage.md`. Example folder unchanged (already at
  `examples/portal/examples/pages/TablePage/`).
- `FileUpload` moved from `extensions/` → `services/` (source is at
  `src/core/services/FileUpload.js`). Routes change:
  `?page=extensions/file-upload` → `?page=services/file-upload`. Doc moves to
  `docs/web-mojo/services/FileUpload.md`.
- `docs/web-mojo/extensions/metricsminichartwidget.md` renamed to
  `MetricsMiniChartWidget.md` to match sibling-doc casing.
- New `FormBuilder` example at
  `examples/portal/examples/forms/FormBuilder/FormBuilderExample.js`. Demos
  `buildFormHTML()` and `buildFieldsHTML()`. `FormBuilder` is now exported
  from the main `web-mojo` entry (was previously only available via
  `@core/forms/FormBuilder.js`).
- Dead `src/core/views/map/MapView.js` duplicate removed (canonical version
  is `src/extensions/map/MapView.js`, exported via `web-mojo/map`).
- `docs/web-mojo/forms/FORMS_DOCUMENTATION_PLAN.md` (an internal planning
  doc that snuck into published docs) moved to `planning/notes/`.

### Examples Portal — hub-and-spoke navigation

- Replaced the single 75-item sidebar with a hub menu plus four topic
  sub-sidebars: **Architecture**, **Components**, **Forms**, **Extensions**.
  The hub pins a curated **Start Here** path (View, Templates, Model, Page,
  WebApp). Each topic sub-sidebar ends with a "Back to Examples" item that
  returns to the hub, mirroring the existing admin "Exit Admin" pattern.
- Component variants (Dialog form / context-menu / custom-body, TableView
  batch-actions / custom-row / server-collection, …) now collapse under their
  parent in the sidebar instead of rendering as siblings. Routes are unchanged.
- `examples.registry.json` now exposes a `topics` tree (each topic → groups →
  items with optional one-level children), and every page record carries
  `topic` and `group` fields. The legacy `menu` array is kept for one cycle.
- `docs/web-mojo/examples.md` is regenerated under H2/H3 topic/group
  headings and now correctly links each variant row to its own source file.
- Sidebar widened from the framework default 250px to 300px in this portal
  (set via `--mojo-sidebar-width` CSS variable; framework default unchanged).
- No framework changes — `Sidebar` already supported multiple registered
  menus, route-driven menu switching, and per-item `handler` callbacks.

### Breaking — Charts extension rebuilt on native SVG

- **Chart.js dependency removed.** `BaseChart` previously injected
  `https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js` at runtime;
  that fetch no longer happens. `chart.js` was never in `package.json` and
  remains absent. ~2,400 LOC of source removed: `BaseChart.js` (1,329),
  the old Chart.js-backed `SeriesChart.js` (533), and the old `PieChart.js` (567).
- **`SeriesChart` rewritten as a native SVG component** (promoted from
  `MiniSeriesChart`). Multi-dataset line/bar/area, click-to-toggle legend,
  hover-isolated highlighting, animated `setData` updates (`animate: false`
  to opt out), built-in 10-color palette + golden-angle HSL fallback, and
  per-series `color` overrides.
- **Bar charts default to stacked.** `chartType: 'bar'` is stacked unless you
  pass `stacked: false` (or the alias `grouped: true`). `stacked: 'auto'` is
  the default and resolves to `true` for bar, `false` for line/area.
- **`PieChart` rewritten as a native SVG component** (promoted from
  `MiniPieChart`). Adds slice-edge labels, `chart:click` drill-down, animated
  slice tweens, and an optional `endpoint:` shim that auto-fetches via
  `app.rest.GET` in `onInit`.
- **`MetricsChart` rewritten on top of native `SeriesChart`.** Public API
  preserved: `endpoint`, `account`, `granularity`, `slugs`, `category`,
  `dateStart`/`dateEnd`, `defaultDateRange`, `quickRanges`, `availableMetrics`,
  `maxDatasets`, `groupRemainingLabel`, `chartType`, `title` (HTML), `height`,
  `yAxis`, `tooltip`, `showDateRange`, `showGranularity`. Methods unchanged:
  `fetchData`, `refresh`, `setGranularity`, `setDateRange`, `setMetrics`,
  `getStats`. Admin call sites (`AdminDashboardPage`, `CloudWatchChart`,
  `ShortLinkView`, `PushDashboardPage`) need no changes.
- **PNG export moved out of charts into a standalone helper.**
  `MetricsChart.export(format)` removed. Use:
  `import { exportChartPng } from 'web-mojo/charts'; exportChartPng(chart);`
  Works on any view containing an `<svg>`.
- **`MiniSeriesChart` and `MiniPieChart` exports removed.** The dynamic imports
  in `AssistantMessageView` were updated to `SeriesChart`/`PieChart`. If any
  downstream code imported `MiniSeriesChart`/`MiniPieChart` directly, switch
  to `SeriesChart`/`PieChart`.
- **Removed at the chart level**: WebSocket integration, `autoRefresh`,
  `setEndpoint`, `setWebSocketUrl`, theme toggle, `chartOptions` passthrough,
  `dataTransform`. Pages own those concerns.
- New examples portal entries: `SeriesChartExample.js`, `PieChartExample.js`.
  `ChartsExample.js` continues to demo `MiniChart` (the dedicated single-series
  sparkline — kept as-is).
- `src/charts.js` bumped from 2.1.0 → 3.0.0.

### Added — Charts: floating crosshair tooltip on line charts

- **`SeriesChart` gains optional `crosshairTracking` mode** for line/area
  charts. With `crosshairTracking: true`, a transparent rect overlays the
  plot area; on `mousemove` the chart snaps to the nearest column and shows
  a vertical crosshair, a per-dataset ghost dot, and the existing multi-row
  tooltip. Off by default — bar charts ignore the flag.
- **Bootstrap-theme-aware** — the crosshair line uses
  `var(--bs-secondary-color)` via `currentColor` and auto-adapts under
  `data-bs-theme="dark"`. Pass `crosshairColor` for an explicit override
  (accepts CSS color strings or `var(--…)` references) and `crosshairWidth`
  for a thicker line.
- **`chart:click` semantics** — in tracking mode, click emits the column
  for the first visible dataset (matches Chart.js `mode: 'index'`). Per-
  dataset clicks remain available with `crosshairTracking: false`.
- New examples-portal demo card under
  `examples/portal/examples/extensions/Charts/SeriesChartExample.js`.

### Changed
- **Examples directory rewritten** — The previous `examples/portal/` (37 pages, 17 templates, ~13k LOC) and all standalone HTML demos have been moved to `examples/legacy/` (with git history preserved). The new `examples/portal/` is a single canonical [`PortalWebApp`](docs/web-mojo/core/PortalWebApp.md) shell whose taxonomy mirrors `docs/web-mojo/`. Each documented component has a folder under `examples/portal/examples/<area>/<Component>/` with a single-file canonical-and-demo `<Component>Example.js` (≤150 LOC, inline template, imports only from `web-mojo`) and an `example.json` manifest. The portal sidebar and route registration are generated by `examples/portal/scripts/build-registry.js` from those manifests, so adding an example never touches `app.js`. Coverage: **59 examples across 8 areas** (`core`, `pages`, `services`, `components`, `extensions`, `forms`, `forms/inputs`, `models`).
- **`docs/web-mojo/examples.md`** — Generated index of every example file, written by the registry generator. Linked from `docs/web-mojo/README.md`.
- **Per-doc cross-links** — Each component doc under `docs/web-mojo/` now ends with an `## Examples` section listing the runnable example file(s) for that component. Sections are managed by `examples/portal/scripts/cross-link-docs.js` and bracketed with `<!-- examples:cross-link begin/end -->` markers so reruns are idempotent.
- **`vite.config.js`** — Added `web-mojo/timeline` and `web-mojo/models` aliases so per-extension package imports resolve in dev.

### Added
- **`examples/auth/`** — Fresh standalone login flow built on `FormView` + `Rest`, posts to `/login` and redirects to `/examples/portal/` on success. Replaces the old multi-page auth example (now under `examples/legacy/auth/`).
- **`docs/web-mojo/components/ContextMenu.md`**, **`docs/web-mojo/forms/MultiStepWizard.md`**, **`docs/web-mojo/forms/SearchFilterForms.md`** — Three new doc pages covering components and patterns the legacy portal demonstrated but the docs hadn't.

### Changed (legacy)
- **FileView consolidated** — The three overlapping file components (`src/core/views/data/FileView.js` legacy, `src/extensions/admin/storage/FileView.js` admin, and the small `FilePreviewView` chat card) have been reduced to one canonical `FileView` at `src/core/views/data/FileView.js`, exported from both `web-mojo` and `web-mojo/admin`. The new component uses a `SideNavView` layout (Preview / Details / Renditions / Metadata) and drives its Preview section from the backend `category` field (`image`, `video`, `audio`, `pdf`, `document`, `spreadsheet`, `presentation`, `archive`, `other`) — each category gets a purpose-built preview (inline `<video>`/`<audio>`, lightbox gallery, PDF viewer, or download-focused card). `LightboxGallery` and `PDFViewer` are accessed optionally via `window.MOJO.plugins.*` and fall back to `window.open` when the lightbox extension isn't loaded. Metadata section is hidden when empty. `FilePreviewView` (chat attachment card) is unchanged.
- **FileView handles async renditions** — The backend now generates renditions asynchronously: `upload_status` flips to `completed` immediately while thumbnails/transcodes run on a background worker. FileView now shows a "Renditions are being generated" placeholder in the Renditions section (with a manual Refresh button) when `File.isRenditionsProcessing()` returns true, and kicks off an automatic background poll (`model.fetch()` every 5s, up to 5 minutes) that stops as soon as the renditions map populates. The poll is cancelled in `onBeforeDestroy`. Preview and Renditions sections listen for `change` on the model and re-render in place as the new URLs arrive, so video posters and rendition rows appear without a manual refresh.
- **`File` model helpers** — Added `getCategory()` (with content_type fallback), `hasRenditions()`, `isRenditionsProcessing()`, `getRenditions()`, `getBestImageRendition()`, `getThumbnailUrl()`, and `regenerateRenditions(roles?)` to the `File` model.

### Added
- **"Regenerate Previews" action** — New `regenerate-renditions` ContextMenu item in `FileView`. Confirms, then POSTs `{ action: 'regenerate_renditions' }` to `/api/fileman/file/<id>` via `File.regenerateRenditions(roles?)` and (re)starts the rendition poll. Matches the new backend endpoint described in django-mojo fileman docs.

### Breaking
- **FileView constructor** — Removed options `file` (URL string input), `size: 'xs'..'xl'`, `showActions`, `showMetadata`, `showRenditions`, and the `updateFile()` method. Pass a `File` model via `model`, or raw data via `data` (wrapped internally). The legacy options described a different component that no longer exists.

### Removed
- **`src/extensions/admin/storage/FileView.js`** — Deleted. Logic moved into the canonical core `FileView`. `src/admin.js` still exports `FileView` for backward compatibility — it now re-exports the core component.

### Added
- **PublicMessage admin (Contact Messages)** — New `PublicMessage` model + `PublicMessageList` collection wired to `/api/account/public_message`, plus `PublicMessageTablePage` and `PublicMessageView` for reviewing visitor-submitted contact and support messages (bouncer-gated `/contact` submissions). Table supports filtering by status/kind, batch "Mark Closed", and row-click detail view. Detail view renders submitter info, generic key/value metadata (friendly labels for known keys like `company`, `category`, `severity`, UTM tags; humanized fallback for unknown keys), full message body (auto-escaped), and a one-click status toggle via `model.save({ status })`. Registered at `system/messaging/public-messages` with `view_support`/`support`/`security` permissions. Sidebar "Email" block renamed to "Messaging" with a new "Contact Messages" child entry.
- **PortalWebApp** — New opinionated base class extending `PortalApp` with auth-gated lifecycle, automatic WebSocket setup, and clean events. Auth is checked before the router starts; if it fails, a configurable countdown redirect is shown. WebSocket connects automatically after auth using `WebSocketClient.deriveURL()`. New events: `user:ready`, `user:logout`, `ws:ready`, `ws:lost`, `ws:reconnecting`. Config-driven: `auth: { loginUrl }` (default `/login`), `ws: true/false` (default `true`). Overridable `onAuthFailed(error)` hook. Exported from `src/index.js`.
- **Admin Assistant** — Fullscreen modal chat interface for LLM-powered admin queries. Triggered via `registerAssistant(app)` which adds a `bi-robot` icon to the topbar (requires `view_admin` permission). Two-panel layout: conversation list (left, REST-backed) + real-time chat area (right, WebSocket). Supports structured response blocks rendered inline: `table` blocks as `TableView`, `chart` blocks as `SeriesChart`/`PieChart`, and `stat` blocks as Bootstrap stat cards.
- **AssistantView** — New view exported from `web-mojo/admin`. Manages WebSocket subscriptions for `assistant_thinking`, `assistant_tool_call`, `assistant_response`, and `assistant_error` events. Unsubscribes on destroy to prevent leaks.
- **AssistantConversation & AssistantConversationList** — New models exported from `web-mojo/models`. Endpoint `/api/assistant/conversation`. Conversation history loaded via REST; messages sent via WebSocket.
- **IPSetTablePage & IPSetView** — New admin pages/views for managing kernel-level IP blocking sets (country blocks, AbuseIPDB feeds, datacenter ranges, custom CIDR lists). Route: `system/security/ipsets`. Registered automatically by `registerSystemPages()`.
- **IP Sets menu entry** — Added "IP Sets" (`bi-shield-shaded`) to the Security section of the admin sidebar, requiring `view_security` permission.
- **ChatView: `showThinking(text?)`** — Appends an animated bouncing-dots thinking indicator to the messages area. Subsequent calls update the text without adding a second indicator.
- **ChatView: `hideThinking()`** — Removes the thinking indicator.
- **ChatView: `setInputEnabled(enabled)`** — Enables or disables the chat textarea and send button.
- **ChatView: `messageViewClass` option** — Constructor option (default `ChatMessageView`) allowing consumers to supply a custom message view class.
- **ChatView: `showFileInput` option** — Constructor option (default `true`). When `false`, hides the file drop zone and disables the `FileDropMixin` in `ChatInputView`.
- **ChatInputView: `setEnabled(enabled)`** — Disables or re-enables the textarea and send button. Distinct from `setBusy()` (which shows a spinner).
- **ChatMessageView: `role` support** — Applies `message-assistant` or `message-user` CSS class based on `message.role`. Assistant messages display a `bi-robot` icon/avatar instead of user initials.
- **ChatMessageView: `blocks` container** — Renders a `data-container="blocks-{id}"` slot after message text for attaching block child views (used by `AssistantMessageView`).
- **ChatMessageView: `tool_calls` display** — If `message.tool_calls` is present, renders a collapsible Bootstrap collapse section showing tool names as badges.
- **FormBuilder: `showWhen` field option** — Conditionally shows/hides a field based on another field's value. Hidden fields are excluded from form submission data and their `required` attributes are suppressed during validation.
- **IncidentView RuleEngine: OSSEC smart rule creation** — When creating a new RuleSet from an OSSEC incident that carries a `rule_id` in its metadata, a matching rule condition (`field_name=rule_id`, `comparator==`, `value_type=int`) is auto-created and linked. Toast confirms whether auto-creation succeeded or fell back to manual.
- **IncidentView RuleEngine: "Create New Rule" button** — New `create-rule-from-incident` action button added alongside "View Full Details" in the RuleEngine section header.
- **IncidentView events table: compact two-line columns** — Date column now shows datetime + category badge stacked; Source column now shows hostname + IP stacked. Standalone Category and Host columns removed to reduce horizontal clutter.
- **RuleSet form: `Delete on Resolution` toggle** — New switch field (`metadata.delete_on_resolution`) added to both the create and edit RuleSet forms. When enabled, incidents produced by this rule are permanently deleted (cascade to events and history) when resolved or closed.
- **RuleSetTablePage: Auto-Delete column** — New `Auto-Delete` column (`metadata.delete_on_resolution`, `yesnoicon` formatter) shows at a glance which rules cascade-delete incidents on resolution.
- **IncidentView: Protect / Unprotect quick actions** — `QuickActionsBar` now shows a `Protect` button (outline) or a `Protected` button (warning/filled) based on `metadata.do_not_delete`. Clicking either saves the flag and emits `incident:updated` to refresh the view.
- **IncidentView: Protect / Remove Protection context menu items** — The incident context menu now includes "Protect from Deletion" or "Remove Protection" depending on current state, wired to `onActionProtectIncident` / `onActionRemoveProtection`.
- **IncidentView header: Protected badge** — A `bg-warning` Bootstrap badge with a shield icon is shown alongside the category badge when `metadata.do_not_delete` is set on the incident.
- **IncidentView RuleEngine: auto-delete warning** — When the linked RuleSet has `delete_on_resolution` enabled and the incident is not protected, a warning alert is shown. If the incident is also protected, an info alert notes that auto-delete is enabled but overridden.
- **IncidentTablePage: batch Protect action** — "Protect" added to the batch-action bar. Confirms via dialog, then saves `metadata.do_not_delete: true` on all selected incidents and refreshes the table.
- **IncidentView: HTTP Request tab** — A new "HTTP Request" tab (`bi-globe2`) is conditionally shown when the incident's metadata includes `http_method` or `http_path`. Displays method, status code, host, path, URL, protocol, query string, and user agent via `DataView`.
- **IncidentView: IP Intelligence tab** — A new "IP Intel" tab (`bi-shield-lock`) is conditionally shown when the incident carries `ip_info`. The tab is divided into four `DataView` subsections: Network (IP address, subnet, ISP, ASN, connection type), Threat Assessment (level, risk score, is_threat, is_suspicious), Threat Flags (TOR, VPN, proxy, datacenter, mobile, cloud, known attacker/abuser), and Block Status (blocked/whitelisted state, reason, timestamps).
- **IncidentView overview: server/timezone info** — If the incident metadata contains `server` or `timezone`, a combined info line is shown beneath the GeoIP summary card in the Overview tab.

- **AI Assistant context chat for TicketView and IncidentView** — Both `TicketView` and `IncidentView` now have an "Ask AI" button that opens a single-conversation assistant chat scoped to the specific model instance. On first open, `POST /api/assistant/context` is called with `{ model, pk }` to create a conversation; the returned `conversation_id` is persisted to `metadata.assistant_conversation_id` so subsequent opens resume the same thread. The chat renders in an `xl` Dialog (not fullscreen) so the underlying view remains visible. Supports real-time streaming via WebSocket with the same event flow as `AssistantView` (`assistant_thinking`, `assistant_tool_call`, `assistant_response`, `assistant_error`), structured response blocks (table, chart, stat) via `AssistantMessageView`, and markdown rendering. Falls back to `POST /api/assistant` when WebSocket is unavailable. `IncidentView` also exposes "Ask AI" in the context menu.
- **AssistantContextChat module** (`src/extensions/admin/assistant/AssistantContextChat.js`) — New self-contained module exporting `AssistantContextAdapter`, `AssistantContextChat`, and the `openAssistantChat(view, modelName)` helper. Any view with a `this.model` that has an `id` and `metadata` can call `openAssistantChat(this, 'app.ModelName')` to launch a context-scoped assistant chat with one line of code.
- **User permissions: AI Assistant category** — Added `assistant` permission category (`view_admin`-gated) to `User.CATEGORY_PERMISSIONS`.
- **Assistant `file` block type** — `AssistantMessageView` now renders `file` blocks as downloadable inline attachment cards. Each card shows a format-aware Bootstrap Icon (`csv`, `xlsx`, `pdf`, `json`, or generic), the filename, and optional metadata (file size, row count, expiry). Clicking the card triggers a browser download. URL scheme validation rejects any URL that does not begin with `https?://` or `/`, preventing `javascript:` XSS. Supported block fields: `filename` (required), `url` (required), `format`, `size`, `row_count`, `expires_in`.
- **Sidebar: auto group settings footer link** — Group-kind menus now automatically append a "Settings" nav link at the bottom of the footer for users with `manage_groups` or `manage_group` permission. Clicking the link opens a `GroupView` dialog for the active group. No configuration is required; the link is invisible to users without the relevant permission.
- **AssistantPanelView** — New chat-only sidebar panel for the Admin Assistant. Shows a compact header bar (hamburger history toggle, conversation title, new-conversation button, close button), welcome screen with quick-start suggestions, auto-resizing textarea, and connection status indicator. A hamburger toggle switches between chat and a conversation history list (`AssistantConversationListView` with search and pagination). Emits `panel:close` when the close button is clicked. Supports full WebSocket streaming (thinking, tool call, response, error, plan, plan_update events) with the same patterns as `AssistantView`. Falls back to `POST /api/assistant` when WebSocket is unavailable.
- **AssistantConversationListView: search and pagination** — The conversation list now includes a debounced search input (300 ms) at the top. Typing filters via `collection.params.search` and re-fetches. A "Load more" button appears at the bottom when `collection.hasMore` is true and appends the next page without clearing existing items. Both additions work in the fullscreen modal's left sidebar and in the panel history toggle.
- **registerAssistant(): responsive display mode** — The topbar assistant button now auto-selects display mode based on viewport width: `>= 1000px` opens a right sidebar panel (`AssistantPanelView`); `< 1000px` opens the existing fullscreen modal. Clicking the button while the sidebar is open closes it. If the viewport drops below 1000 px while the sidebar is open, a debounced resize listener closes the sidebar and opens the fullscreen modal (conversation ID preserved via `app._assistantConversationId`).
- **Shortlinks admin** — New `manage_shortlinks`-gated admin section for managing django-mojo shortlinks. Registered automatically by `registerSystemPages(app)`. Includes two pages (`ShortLinkTablePage` at `system/shortlinks/links` for full CRUD + detail modal with Details / Preview / Metadata / Click History / Metrics tabs, and `ShortLinkClickTablePage` at `system/shortlinks/clicks` for read-only global click history) and one composable view (`ShortLinkView`). All three are exported from `web-mojo/admin`. OG/Twitter metadata is exposed as flat form fields and collapsed into the API's `metadata` map on save; when no OG fields are provided, `metadata` is omitted so the backend auto-scrape runs.
- **ShortLink & ShortLinkClick models** — New models exported from `web-mojo/models`. `ShortLink` and `ShortLinkList` use endpoint `/api/shortlink/link`; `ShortLinkClick` and `ShortLinkClickList` use `/api/shortlink/history` (read-only). `ShortLinkForms` ships `create` and `edit` configs. Three metadata helpers are also exported: `flattenShortLinkMetadata` (metadata object → flat form fields), `buildShortLinkMetadata` (flat form fields → colon-keyed metadata object), and `extractShortLinkPayload` (strips OG/Twitter fields from form data and folds them into `metadata` before a REST save).

### Fixed
- **Rest + TokenManager: expired JWTs no longer leak into outgoing requests** — `PortalApp` (and its subclasses `PortalWebApp`, `DocItApp`) now install a pre-request auth gate that refreshes an expired access token before the call goes out. Concurrent callers share a single `POST /api/token/refresh` (single-flight). If the refresh token is also expired/invalid, the call returns `{ success: false, status: 401, reason: 'unauthorized' }` without hitting the network and `auth:unauthorized` is emitted. URLs under `/api/token/` bypass the gate to prevent refresh recursion. `rest.download()` / `rest.downloadBlob()` / raw-XHR `rest.upload()` still bypass interceptors and are not yet covered.
- **Admin AssistantConversationView: wrong author and missing post-processing** — User messages now show the actual conversation user's name and avatar instead of "You" (the admin). Internal tool calls are collapsed and legacy block formats are parsed, matching the user-facing `AssistantView` rendering.
- **AssistantView: stuck "Waiting for response" state** — Fixed a bug where `AssistantView` would remain locked in the waiting state after a WebSocket reconnection, requiring a page reload to recover.
- **ListView: no empty-state flash on initial load** — `setCollection()` now sets `loading = true` immediately when the collection is REST-enabled and has never been fetched, preventing the "No data available" message from appearing briefly before the first fetch completes.
- **GeoIPSummaryCard: eliminated redundant API call** — The card now accepts an `ipInfo` option. When `ip_info` is already present on the incident graph response, the card uses it directly and skips the `GeoLocatedIP.lookup()` call. Falls back to the API lookup when `ip_info` is absent.
- **GeoIPView block/unblock/whitelist actions** — Converted from ad hoc `rest.POST` calls to `model.save()` with action payloads; added optional chaining on `toast` calls to avoid errors in non-portal contexts.
- **IncidentView RuleEngine: `rule_set` field name** — Fixed stale field reference (`ruleset` → `rule_set`) when reading and saving the linked rule set on an incident. Handles both plain ID and nested object responses.
- **IncidentView: detailed graph fetch** — `IncidentView.onInit()` now fetches the incident with `graph=detailed` so nested relations (e.g. `rule_set`) are available before child sections render.

## [Previous]
- **User Profile Extension** (`web-mojo/user-profile`) — Moved all user profile views from `src/core/views/user/` into a standalone extension at `src/extensions/user-profile/`. Available as `import { ... } from 'web-mojo/user-profile'` or via `@ext/user-profile/index.js` internally.
- **ProfilePersonalSection** — Editable first/last name, display name, DOB (with verified/unverified badge), timezone, and address (stored in `user.metadata`)
- **ProfileConnectedSection** — Lists OAuth provider connections (Google, GitHub, Microsoft, etc.) with unlink capability and lockout guard
- **ProfileSecurityEventsSection** — TableView of auth events (logins, failed attempts, password changes) with color-coded severity badges and custom `SecurityEventRow`
- **ProfileNotificationsSection** — Per-kind, per-channel toggle grid for notification preferences (in-app, email, push)
- **ProfileApiKeysSection** — Generate, list, copy, and delete personal API keys with IP restriction and expiration options; token shown once with copy-to-clipboard
- **Recovery Codes** in ProfileSecuritySection — View masked codes, regenerate with TOTP verification, copy-all support
- **Revoke All Sessions** in ProfileSecuritySection — Password-confirmed session revocation with automatic token refresh
- **Passkey model centralization** — `Passkey.register(friendlyName)` and `Passkey.suggestName()` static methods on the Passkey model, shared by both `PasskeySetupView` and `ProfileSecuritySection`
- **Rich passkey dialogs** — Passkey registration uses polished dialogs for name input (with auto-suggested device name), success confirmation, and error display instead of toasts
- **UserProfileView nav** updated to 11 sections across 3 groups: Profile, Personal, Security, Connected | Sessions, Devices, Security Events | Notifications, API Keys, Groups, Permissions

### Changed
- **ProfileSessionsSection** — Rewritten with TableView (paginated, size 10) and custom `SessionRow` with rich two-line column templates: browser + device on top, location + IP + threat flags below
- **ProfileDevicesSection** — Rewritten with TableView (paginated, size 10) and custom `DeviceRow` with rich two-line column templates: device name + model on top, browser + OS + IP below
- **ProfileOverviewSection** — Removed personal fields (moved to Personal section), removed username edit (read-only), added account deactivation, relaxed phone number format placeholder
- **PortalApp** — Dynamic imports updated from `@core/views/user/index.js` to `@ext/user-profile/index.js`; removed duplicate `onActionChangePassword` handler that caused double dialog
- `src/core/views/user/index.js` now re-exports from extension for backward compatibility (marked `@deprecated`)

### Fixed
- **Passkey registration flow** — Name is now collected before the WebAuthn API call (was previously asking after OS biometric prompt)
- **Passkey REST calls** — Added `dataOnly: true` to prevent double-wrapped response (`resp.data.data`) causing "Failed to start" errors
- **Double password dialog** — Removed duplicate `onActionChangePassword` from `UserProfileView` that conflicted with `ProfileSecuritySection`'s handler
- **Phone number format** — Changed placeholder from E.164 format (`+14155550123`) to friendly format (`(415) 555-0123`) since backend normalizes
- **MetricsChart gear dropdown** — Chart type toggle now returns `true` from action handlers for EventDelegate auto-close; chart type moved back to SeriesChart's built-in switcher
