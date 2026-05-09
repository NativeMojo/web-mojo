# Changelog

## Unreleased

### Admin models — new section-driven Collections

- **Added** `SimilarJobsList` (`@ext/admin/models/Job.js`) — thin `JobList` subclass with default `params: { ordering: '-created' }` plus optional `func` constructor arg. Backs JobDetailsView's "Similar Jobs" section. Endpoint: `GET /api/jobs/job?func=<name>&ordering=-created`.
- **Added** `ActiveJobsList` (`@ext/admin/models/Job.js`) — thin `JobList` subclass defaulting to `?status=running`, with optional `runnerId` constructor arg. Backs RunnerDetailsView's "Active Jobs" section. Endpoint: `GET /api/jobs/job?runner_id=<id>&status=running`.
- **Added** `RelatedIncidentsList` (`@ext/admin/models/Incident.js`) — thin `IncidentList` subclass accepting any subset of `sourceIp`, `ruleSet`, `group`, `hostname`, `category`, `status` constructor args; emits the matching `?source_ip=`, `?rule_set=`, etc. filters. Backs IncidentView's "Related Incidents" section. Note: Incident has no `user` FK — only `group` — and the constructor reflects that.
- **Note:** `IncidentEventList` (already at `/api/incident/event`), `IncidentHistoryList` (already at `/api/incident/incident/history`), and `ShortLinkClickList` (already at `/api/shortlink/history`) already cover the remaining new-section data needs. No new collection classes for those — consumer views just call `fetch({ incident: id })` etc. on the existing collections.
- **No backend HTTP API changes.** Every endpoint and filter referenced is verified to exist.

### KnownFieldsCard — new `@core` primitive

- **Added:** `src/core/views/data/KnownFieldsCard.js` — "promote known JSON keys, keep the raw blob accessible" pattern. Promotes selected keys to a 2-column label/value grid (using the `.detail-flat-row` family) with the raw JSON in a collapsible `<details>` block underneath. Constructor: `data` (object OR `(model) => object`), `knownKeys` (array OR `(model) => array`), `rawCollapsed`, `rawLabel`, `showRaw`, `emptyText`. Each known-key spec is `{ key, label, formatter?, hideEmpty? }`. `formatter` may be a `DataFormatter` pipe name (string) or a `(value, key, data) => htmlString` function — both treat output as trusted HTML. Dotted-path keys (`os.family`, `user_agent.major`) work for nested objects. Missing values render the muted "—" placeholder unless `hideEmpty: true` is set.
- **Moved:** the `.detail-section`, `.detail-section-eyebrow`, `.detail-section-action`, `.detail-flat-row*` rules from `admin.css` into `core.css`. They're framework-wide primitives — `KnownFieldsCard` uses them, and Wave 3's per-view sweeps will use them across admin views.
- **Added** `KnownFieldsCard` CSS (`.detail-known-fields-card`, `.detail-known-fields-grid`, `.detail-known-fields-raw*`) to core.css. Raw block uses native `<details>` for accessibility — no JS, no listeners.
- **Tests:** `test/unit/KnownFieldsCard.test.js` adds twelve cases — known-key rendering, missing "—" placeholder, `hideEmpty`, function formatter, dotted-path lookup, raw block default-collapsed and explicit-open, `showRaw: false`, empty-data fallback, function-valued data + knownKeys re-resolving, nested-object JSON fragment, escape policy.
- **Docs:** new `docs/web-mojo/components/KnownFieldsCard.md` covers quick-start, full options, the spec shape, and three common patterns (incident metadata, device info, IP intel).

### FlowStrip — new `@core` primitive

- **Added:** `src/core/views/data/FlowStrip.js` — horizontal "STEP 1 → STEP 2 → STEP 3" flow primitive (extracted from `RuleSetTriggeringSection`'s Match → Bundle → Threshold → Re-trigger layout). Each step is `{ num, title, value, hint, empty?, action?, actionIcon?, actionData? }`. `value` and `hint` are trusted HTML (for `<code>` / `<strong>` interpolation); `num` and `title` are escaped. `empty: true` renders the muted-italic `.flow-strip-empty` style for "Fires immediately" / "No bundling" sentinels. Optional pencil action with arbitrary `data-*` attributes for routing edit forms to a specific tab. Steps may be a static array OR `(model) => array`. `setSteps(steps)` replaces the source and re-renders. CSS variable `--flow-strip-cols` overrides the default 4-column layout per instance.
- **Tests:** `test/unit/FlowStrip.test.js` adds nine smoke cases — render shape, missing-hint omission, num fallback, empty modifier, action button + `data-*` attrs, function-valued steps re-resolving, escape policy, empty-array no-op, `setSteps`.
- **Docs:** new `docs/web-mojo/components/FlowStrip.md` covers quick-start, state-driven flows, full step shape, the RuleSet triggering example, and column-count overrides.
- **Migration note:** the legacy `.rs-flow*` CSS in `admin.css` still backs `RuleSetView`'s current implementation. `RuleSetView` will switch to `FlowStrip` in a later wave; the old CSS will be removed at that point. New code should use `FlowStrip` directly.

### Timeline — new `@core` primitive

- **Added:** `src/core/views/data/Timeline.js` — vertical event-feed primitive (the `<ol>` with hairline connector and tone-colored dots used for incident history, job lifecycle events, recent-activity overviews, audit trails). Constructor: `items` (array OR `(model) => array`), `emptyText`, `limit`, `model`. Each item is `{ headline, detail?, when?, tone? }`. Falsy entries are filtered. Function-valued `items` re-resolve on every `render()` so the feed reflects the latest model state. Empty list renders a single `.detail-timeline-empty` placeholder so the rail still draws. `setItems(items)` replaces the source and re-renders.
- **Moved:** the `.detail-timeline*` and `.tone-*::before` CSS rules from `src/extensions/admin/css/admin.css` into `src/core/css/core.css`. Added a `tone-secondary` variant matching StatusPanel's palette and a `.detail-timeline-empty` rule for the empty-state fallback.
- **Tests:** `test/unit/Timeline.test.js` adds eight smoke cases — `<ol>` root, per-item tone class, optional detail/when omission, empty-state fallback, function-valued items resolving and re-resolving, the `limit` option, HTML-escaping of headline/when, and `setItems`.
- **Docs:** new `docs/web-mojo/components/Timeline.md` covers quick-start, options, item shape, common patterns (Job Lifecycle card, Recent activity), and the trusted-HTML rules for `detail`.

### StatusPanel — new `@core` primitive

- **Added:** `src/core/views/data/StatusPanel.js` — hero "current state" panel for record-detail views (the dot+state read-out / headline / meta line / action buttons that opens the Overview section in JobDetailsView, IncidentView, RunnerDetailsView, etc.). Constructor options `tone`, `state`, `headline`, `meta`, `icon`, `actions[]` each accept either a static value **or** `(model) => value` so the panel re-resolves on model state changes. Action buttons render with `data-action="<action>"` and dispatch via the standard MOJO action pipeline — handlers live on whichever ancestor reacts. Tones (`primary`, `success`, `info`, `warning`, `danger`, `secondary`) tint background + border via Bootstrap CSS variables; dark theme works automatically.
- **Moved:** the `.detail-status-panel` / `.detail-status-headline` / `.detail-status-state` / `.detail-status-line` / `.detail-status-meta` / `.detail-status-actions` / `.tone-*` CSS rules from `src/extensions/admin/css/admin.css` into `src/core/css/core.css` (the JS class is `@core`-level, so the styles must travel with it). Added `.detail-status-icon` for the optional Bootstrap-Icons-driven state icon, and a `tone-secondary` variant for inactive/cancelled records.
- **Tests:** `test/unit/StatusPanel.test.js` adds six smoke cases — render shape, dot vs icon, action row, function-valued options re-resolving, empty actions omission, HTML escaping of state / headline / labels.
- **Docs:** new `docs/web-mojo/components/StatusPanel.md` covering quick start, function-valued options, all constructor options, tones, and common patterns.

### DetailView — `auxFn` right-gutter slot + flat-row primitives

- **Added — `header.auxFn(model) -> htmlString`:** new optional slot on `DetailHeaderView` for inline state read-outs that don't fit the chip / badge model — presence dots, "Last seen 4m ago" lines, attempt counters, etc. Renders left of the active switch in the right-side action cluster. Returning falsy omits the wrapper. The output is **trusted HTML** (caller is in source code, not user input). Re-renders along with the rest of the header on `model.set(...)`. Framework ships `.dh-aux-presence`, `.dh-aux-dot` (`.is-online` modifier), and `.dh-aux-meta` defaults in `core.css`.
- **Added — flat-row primitives in `admin.css`:** `.detail-section`, `.detail-section-eyebrow`, `.detail-section-action`, `.detail-flat-row`, `.detail-flat-row-label`, `.detail-flat-row-value`, `.detail-flat-row-action`. The minimalist "labeled section eyebrow + flat field rows" pattern that section views in admin DetailView subclasses should default to going forward. Replaces stacked `.detail-field-card` blocks.
- **Deprecated:** `.detail-field-card`, `.detail-field-card-header`, `.detail-field-card-body`. Existing call-sites will be migrated off as part of the DetailView migration rethink (see `planning/requests/detailview-migration-rethink.md`). Don't add new uses.
- **Tests:** `test/unit/DetailView.test.js` adds three `auxFn` cases — wrapper present when truthy, omitted when falsy, re-rendered after `model.set`.

### Modal.detail() — default size flipped from `'xl'` to `'lg'`

- **Behavior change:** `Modal.detail(view)` now defaults to `size: 'lg'` instead of `size: 'xl'`. The previous width was too generous for typical record-detail content and ran wide of the reference layout. Pass `Modal.detail(view, { size: 'xl' })` (or `'xxl'`) when content genuinely needs more room — dense charts, multi-column dashboards, etc. RuleSetView and other in-tree DetailView callers fit comfortably at `'lg'`.

### EventDelegate — fix async double-dispatch across nested Views

- **Fixed:** when a click landed on a `[data-action]` element inside a nested View hierarchy, ancestor delegates could double-dispatch the same action — the inner delegate's post-`await` `event.stopPropagation()` was a no-op because the browser had already finished bubbling. Now each delegate publishes its in-flight dispatch on `event._mojoDispatch` synchronously at handler entry; ancestor delegates await it before their own `shouldHandle` check, so an inner truthy `onAction*` / `handleAction*` reliably stops the parent. Sync handlers benefit from the same fix (they raced too, just over a shorter window).
- **Contract preserved:** `onAction*` returning falsy still delegates the event up to ancestor Views; `onPassThruAction*` still never consumes; `handleAction*` still always consumes. No public API changes — the documented behavior just now works for async handlers as it always claimed to.
- **Tests:** `test/unit/EventDelegate.test.js` adds a `nested delegate isolation` block covering sync/async truthy consume, falsy delegate-up, `handleAction*`, `onPassThruAction*`, parent-only, and three-level nesting.

### RuleSetView — full redesign + supporting framework primitives

- **Redesigned:** `src/extensions/admin/incidents/RuleSetView.js` replaces the 2-tab `TabView` (Configuration / Rules) with a header card + `SideNavView`. Sections in operator-priority order: **Overview** (4 KPI cards + summary panels), **Conditions** (rule conditions table), **Triggering** (Match → Bundle → Threshold → Re-trigger as a 4-step visual flow with friendly empty-state copy in place of `—`), **Handler** (parsed handler chain rendered as icon cards with tone accents), **Agent Prompt** (new, see below), **Incidents** (`IncidentList` filtered by `rule_set` with a 7d/30d/90d range picker), **Metadata** (known fields + raw JSON, hidden when empty).
- **Added — `metadata.agent_prompt`:** new editable LLM agent prompt persisted on the RuleSet's metadata. The Agent Prompt section in `RuleSetView` shows a contextual hint based on whether `llm://` is in the handler chain. Saved via partial dotted-path `model.save({ 'metadata.agent_prompt': value })` (backend auto-merges JSONFields).
- **Form updates** in `src/extensions/admin/models/Incident.js`: `RuleSetForms.create` and `RuleSetForms.edit` gain an "Agent" tab with a `metadata.agent_prompt` textarea. The Thresholds tab is restructured from a cramped 3-across `columns: 4` row into a numbered step layout — each threshold field is full-width with its own inline label.
- **Header card** surfaces `metadata.reasoning` as the subtitle, an `assistant_proposed` indicator, an inline Active toggle (saves immediately, reverts on error), and a context menu including new actions `edit-agent-prompt` and `view-incidents`.

### SideNavView — badge support + dark-theme migration

- **Added:** Section configs accept an optional `badge` field — `number`, `string`, or `{ text, variant }`. Variants: `'muted'` (default), `'primary'`, `'success'`, `'warning'`, `'danger'`. The active section's `muted` badge automatically inverts to white-on-primary so it stays readable. Falsy values render no badge.
- **Added:** new instance method `sideNav.setBadge(key, value)` updates a section's badge dynamically without re-rendering the whole nav. Critical for live counts (Incidents, Conditions) populated after the section fetches.
- **Fixed (long-standing):** the inline `<style>` block was hardcoded light-theme hex literals (`#f8f9fc`, `#0d6efd`, etc.) with zero `[data-bs-theme="dark"]` overrides — the doc had claimed dark support that didn't exist. Migrated to Bootstrap tokens (`var(--bs-tertiary-bg)`, `var(--bs-body-color)`, `var(--bs-secondary-bg)`, `var(--bs-border-color)`, `var(--bs-primary)`) and added the missing dark-mode rules clustered at the bottom of the style block per `.claude/rules/theming.md`. Existing callers see no behavior change in light mode; dark-mode rendering now matches the documented behavior.

### SegmentControl — new component

- **Added:** `src/core/views/navigation/SegmentControl.js` — a small horizontal pill-button group bound to a single value. Constructor accepts `options: [{ value, label, icon? }, …]`, `value`, `size: 'sm'|'md'`, `ariaLabel`. Emits `change` with `{ value, previous }` on selection. Public API: `getValue()`, `setValue(value, { silent })`. Themed via Bootstrap `btn-primary` + `btn-outline-secondary` so dark-mode is automatic. Smoke tests in `test/unit/SegmentControl.test.js`.

### MetricCard — new component

- **Added:** `src/core/views/data/MetricCard.js` — at-a-glance KPI card (label / big value / optional icon / optional hint / optional tone left-border accent). Constructor accepts `label`, `value`, `icon`, `tone: 'default'|'success'|'warning'|'danger'|'info'|'primary'`, `hint`, `action`. When `action` is set the root renders as a `<button data-action="…">` so clicks flow through the standard MOJO action pipeline. Public API: `setValue(value)`, `setHint(hint)`. Themed via `var(--bs-tertiary-bg)`, `var(--bs-border-color)`, and `var(--bs-{tone})` so dark-mode is automatic. Smoke tests in `test/unit/MetricCard.test.js`.

### MOJOUtils — security: harden dot-path lookup against prototype-chain keys

- **Hardened:** `MOJOUtils.getNestedValue` and `DataWrapper.getContextValue` now return `undefined` for any path segment matching `__proto__`, `constructor`, or `prototype` (at every depth). The no-dot fast path no longer auto-invokes `Object.prototype` builtins (`toString`, `valueOf`, `hasOwnProperty`, `propertyIsEnumerable`, `isPrototypeOf`, `toLocaleString`) — calls are skipped when the function is reference-equal to the inherited builtin. The depth-≥1 inherited-method invocation branch was removed; nested inherited functions (e.g. `{{a.b.toString}}`) now resolve to `undefined` instead of auto-calling.
- **Robustness:** the walker uses `Object.prototype.hasOwnProperty.call(...)` so payloads with a shadowed `hasOwnProperty` field (e.g. `{ hasOwnProperty: 1, name: 'A' }` from an API) no longer break.
- **Custom methods unaffected:** view methods like `getStatus()` defined on a class subclass — own functions on a context literal — and user-overridden `toString` (different function reference than the builtin) all continue to auto-invoke at the top level. Existing `MOJOUtils.test.js` and `View-get.test.js` cases pass unchanged.
- **Follow-up landed:** the residual surface in `Mustache.Context.lookup` is now also closed (see entry below).

### Mustache — security: close residual prototype surface in `Context.lookup`

- **Hardened:** `Context.lookup` now blocks `__proto__` / `constructor` / `prototype` segments at the entry of the function (covering both the dot-prefix and non-prefix branches in one check). The dot-prefix single-segment fallback and the post-loop function-invocation now skip `Object.prototype` builtins via reference equality (`value === Object.prototype[lastSegment]`), so `{{toString}}` / `{{valueOf}}` / `{{hasOwnProperty}}` no longer auto-invoke and leak `"[object Object]"`-style data. The post-loop wraps the function call in `try`/`catch` that swallows **only** `TypeError: Class constructor X cannot be invoked without 'new'` — legitimate view-method exceptions still propagate to the caller (matches the `View-get.test.js:181` contract).
- **Before / after:** `Mustache.render('|{{__proto__}}|{{toString}}|', { name: 'A' })` was `'|[object Object]|[object Object]|'`, is now `'|||'`. `Mustache.render('|{{constructor}}|', { name: 'A' })` previously crashed with `TypeError: Class constructor DataWrapper cannot be invoked without 'new'`, now resolves to `'||'`. Pipes and pipe-stripped paths handled: `{{constructor|upper}}` is rejected the same as `{{constructor}}`.
- **Custom methods unaffected:** user-overridden `toString` (different function reference than `Object.prototype.toString`), class-defined view methods like `getStatus()`, and own functions on a context literal continue to auto-invoke. Eleven new test cases in `test/unit/MOJOUtils.getNestedValue.test.js` and `test/unit/Mustache-dot-prefix.test.js` lock in the safe behavior.

### Mustache — fix: dot-prefixed multi-segment paths inside iteration

- **Fixed:** `{{.foo.bar}}` (dot-prefix with two or more dotted segments) inside `{{#items}} ... {{/items}}` now resolves to the current iteration item's nested property. Previously the dot-prefix lookup branch did a single-key access on the joined name (`view['foo.bar']`), which always returned `undefined` for plain-object iteration items, so templates like `{{#merchants}}{{.group.name}}{{/merchants}}` rendered empty cells. The single-segment form `{{.rank}}` and the bare form `{{group.name}}` were already correct; only the dot-prefixed multi-segment form was broken. The fix delegates nested walks in the dot-prefix branch to the existing `MOJOUtils.getNestedValue` helper while keeping the walk scoped strictly to the current view (no parent-chain climb), so the leading-dot semantic is preserved.

### MetricsMiniChartWidget — fix: `{{now_value}}` showed yesterday's value when `trendOffset > 0`

- **Fixed:** `{{now_value}}` in the subtitle template now always reads from the latest bucket, independent of `trendOffset`. Previously it was shifted back by `trendOffset` buckets — so a widget with `trendOffset: 1` and a subtitle like `'{{now_value}} Today'` rendered yesterday's value next to the static "Today" label. The chart's tooltip on the rightmost bar showed the correct (today's) value, exposing the mismatch.
- **Behavior change for callers using `trendOffset > 0`:** `{{now_value}}` now jumps from "N back" to the latest bucket. Migration: callers who genuinely want the offset-shifted windowed sum should switch to `{{lastValue}}` (already documented; already respects `trendOffset` and `trendRange`). Callers using the default `trendOffset: 0` see no change.
- **Unchanged:** `trendOffset` still shifts the trending comparison window (`lastValue`, `prevValue`, `trendingPercent`) — that's its remaining purpose, and the original use case (skip an incomplete current bucket in trending math) still works.

### Charts — `apiParams` passthrough on metrics-aware components

- **Added:** `MetricsChart` and `MetricsMiniChart` accept an `apiParams: object` constructor option — a passthrough map for arbitrary `/api/metrics/fetch` query params the framework doesn't yet promote to first-class options. `MetricsMiniChartWidget` forwards the option through `chartOptions` to its inner mini chart.
- **Added:** `MetricsChart.setApiParams(next)` and `MetricsMiniChart.setApiParams(next)` runtime setters that replace (not merge) the map and refetch. Callers wanting a merge do `chart.setApiParams({ ...chart.apiParams, key: value })` explicitly.
- **Added:** `MetricsChart.getStats()` now reports `apiParams` (defensive copy).
- **Precedence:** `apiParams` is spread *first* into `buildApiParams`; hardcoded options (`granularity`, `account`, `slugs`, `category`, `dateStart`/`End`, `withDelta`, `childKind`, `breakdown`) overwrite anything that overlaps. The `_` cache-buster always wins. Empty / omitted `apiParams` produces query strings byte-identical to today — no impact on existing callers. Use `apiParams` as a base layer for forward-compatible / experimental keys, not as an override surface.
- **Note:** `apiParams` is purely a query-string mechanic. Constructor options with non-URL side effects (e.g. `withDelta: true` switches the default endpoint to `/api/metrics/series`) require the first-class option.
- **Trust boundary:** `apiParams` values land directly in the URL — treat as developer-controlled (same convention as `title:`). Never pipe user input through it without sanitizing at the call site.

### Charts — group fan-out (parent rollup + per-child breakdown)

- **Added:** `MetricsChart` accepts `childKind: string` and `breakdown: boolean` constructor options that drive Modes 2 and 3 of `/api/metrics/fetch`. With `childKind` set on a `account: 'group-<id>'` chart, the backend sums the metric across all active descendants of that kind (Mode 2 — same response shape as Mode 1). Add `breakdown: true` and the backend returns one series per child group plus a `groups` map (name → child id) for drill-in (Mode 3 — single slug only).
- **Added:** `MetricsChart.setChildKind(kind)` and `setBreakdown(flag)` runtime setters that refetch (mirroring `setGranularity` / `setMetrics`). `getStats()` now reports `childKind` and `breakdown`.
- **Added:** the `metrics:data-loaded` event payload now includes a `groups` field — `null` in Modes 1 and 2, populated in Mode 3. The map is also cached as `this._lastGroups`. In breakdown mode the chart uses raw response keys (e.g. `Downtown` / `Downtown#15` for collisions) verbatim — no slug-style title-casing.
- **Added:** `MetricsMiniChart` and `MetricsMiniChartWidget` accept the same `childKind` option for Mode 2 rollups. Mode 3 (`breakdown`) is intentionally not supported on the mini variant — sparklines are single-series; for a per-child breakdown use a row of mini charts or a `KPIStrip`.
- **Docs:** new "Group fan-out" subsection in `docs/web-mojo/extensions/Charts.md`; option entry added to `docs/web-mojo/extensions/MetricsMiniChartWidget.md`. The `MetricsChartExample` portal page now demonstrates Mode 2 and Mode 3 with stubbed data so the patterns are interactive without a backend.

### TableView — `fetchOnView` auto-refreshes model before detail dialog

- **Added:** `fetchOnView` option (default `true`). When enabled, TableView calls `model.fetch()` before opening the view dialog, ensuring the detail view always has the latest server data. Set to `false` to use the row data as-is. Skipped when a custom `onItemView` handler is provided.

### Ticket panel — app-shell slide-over with action blocks

- **Added:** `registerTicketPanel(app)` — new registration helper that attaches `app.openTicketPanel(modelOrId)` and `app.closeTicketPanel()` to the running app instance. The panel (`TicketPanelView`) mounts as a flex child of `.portal-layout` (like `AssistantPanelView`) and persists across page navigation. `openTicketPanel` accepts either a Ticket model instance OR an id; the table passes the model directly so the panel and table share the same instance and updates propagate without a re-fetch.
- **Changed:** `TicketTablePage` now delegates to `app.openTicketPanel(model)` instead of managing the panel internally. This moves the panel to the app-shell level so it survives route changes. The table also got mockup-style styling — colored status pills, severity-colored priority chips, category dot+label, monospace IDs, single hairline borders — via custom function formatters and scoped CSS in `buildTemplate()`.
- **Changed:** `TicketPanelView` panel UI cleaned up — the AI-enable toggle was removed from the panel header and moved to the ticket edit form (`TicketForms`). The kebab `⋯` menu item changed from "Close Ticket" (which prompted a status change to `closed`) to "Close Window" (which dismisses the panel). The panel no longer shows a standalone close button in the header. The kebab menu now also includes "Ask AI" which opens an Assistant chat scoped to the current ticket.
- **Added:** `TicketPanelView` — 460 px slide-over detail view. Supports switching between tickets without closing the panel. Header has inline-editable status / priority / category / assignee / group dropdowns (each picks unique action ids — `pick-0`, `pick-1`, ... — so `ContextMenu`'s `find()`-by-action correctly resolves the clicked item). Saves go through `_saveAndSync()` which `save()` + `fetch()`-es the model and refreshes notes (so backend-side `metadata.type === 'status_change'` notes appear immediately).
- **Added:** Description chip in the panel header. Tickets with a description show "Description" — click to view rendered markdown with `Edit` / `Close` buttons. Tickets without a description show "Add description" — click jumps straight to edit. The edit modal is a large textarea with markdown shortcuts (`Cmd/Ctrl+B` bold, `Cmd/Ctrl+I` italic, `Shift+Enter` continues lists, ``` ``` ``` opens a code fence, bracket auto-pairing). Description was removed from `TicketForms.edit.fields` since it now has its own editor.
- **Added:** `ActionCardView` — renders LLM agent action blocks from ticket notes inline directly under each note. Approval-type blocks show Approve / Deny buttons; resolved blocks render a compact one-line chip (label + Approved/Denied badge + chevron) that expands per-note on click to show the full card with reference links; context-type blocks show clickable model-reference links. Emits `action:respond` when the user responds; `TicketPanelView` writes the response back as a new note via `TicketNoteAdapter.addActionResponse`.
- **Changed:** `TicketNoteAdapter.transform` now also detects `metadata.type === 'status_change'` and renders the note as a muted system-event row with colored badges for `old_status` → `new_status`. System-event content skips the markdown-render pass so the badge HTML isn't escaped. `ChatMessageView`'s system-event template uses `{{{message.content}}}` (unescaped) so pre-rendered HTML lands intact.
- **Added:** `TicketNoteAdapter.addActionResponse(actionNote, action)` — convenience method that posts an approve/deny response note with the correct metadata shape.

### TableRow — `editable + formatter` cells now work

- **Changed:** `TableRow.buildCellTemplate` adds the `cell-content` class to the wrapper span when a column is `editable: true` — even when a `formatter` (string or function) or `template` is set. Previously these branches skipped the wrapper, so `enterEditMode()`'s `querySelector('.cell-content')` came back empty and silently no-op'd. Tables can now combine custom rendering (e.g. status pills) with inline editing.

### ChatMessageView — cleaner re-renders

- **Fixed:** the attachments container is cleared and prior `FilePreviewView` children are removed before re-rendering, so files no longer multiply on each re-render of a message.
- **Changed:** the `system_event` body uses `{{{message.content}}}` (unescaped) so callers can inject pre-rendered HTML (e.g. status-change badges).

### WebApp — MODEL_REF registry (`registerModelRef` / `getModelByRef`)

- **Added:** `app.registerModelRef(ref, ModelClass)` and `app.getModelByRef(ref)` — a registry that maps backend dotted-type strings (e.g. `'incident.Incident'`) to frontend Model classes.
- **Added:** `MODEL_REF` static property convention on Model classes — the string that identifies the class in the backend type system (analogous to `VIEW_CLASS`).
- **Changed:** `registerAdminPages` now calls `app.registerModelRef` for `Incident`, `IncidentEvent`, `RuleSet`, `Ticket`, and `GeoLocatedIP` automatically. Consumer apps do not need extra wiring for these types.

### Sidebar & TopNav — `iconHtml` field on nav items

- **Added:** `iconHtml` field on Sidebar and TopNav item configs. When set, the raw HTML string is rendered (triple-brace, unescaped) in place of the `icon` Bootstrap Icon. This allows custom SVG images or other HTML in sidebar/topbar item icons. `icon` remains the preferred option for Bootstrap Icons.

### Admin Assistant — context reference blocks in chat messages

- **Added:** `AssistantMessageView` now renders `block.type === 'context'` blocks as clickable model-reference chips inline in chat messages. Each reference in the block's `references` array renders as a compact chip with the model label and instance display name. If the referenced model is registered via `app.registerModelRef` and declares a `VIEW_CLASS`, clicking the chip opens the detail dialog (`Modal.showModel`). Unregistered or unknown model types render as plain text. All user-controlled fields are HTML-escaped; the `pk` value is validated against `/^\d+$/` before use to prevent XSS.

### Admin Assistant — renamed to "Mojo"

- **Changed:** The AI assistant is now displayed as "Mojo" throughout the admin extension — `AssistantPanelView`, `AssistantView`, `AssistantContextChat`, `AssistantConversationView`, `ChatMessageView`, and `AssistantMemoryPage` all use "Mojo" as the author name and panel title. The permission label in `User.CATEGORY_PERMISSIONS` changed from "AI Assistant" to "Mojo". The `assistant` permission key is unchanged.
- **Changed:** Assistant avatar in `ChatMessageView` and the welcome icon in `AssistantPanelView` / `AssistantView` changed from the `bi-robot` Bootstrap Icon to the Mojo logo image.

### MetricsChart / MetricsMiniChartWidget — granularity in stats header

- The stats modal now shows the granularity and bucket count above the
  table (e.g. "Hourly · 24 points"). Makes it clear what window the
  stats are computed over without having to look back at the chart.

### MetricsChart — collapsible secondary toolbar

- **Changed:** the secondary toolbar (gear, type switch, stats, data, refresh)
  now collapses behind a kebab `⋯` trigger and slides into view on hover or
  focus-within of the cluster. The granularity toggle stays visible since
  it's the primary control. Reduces visual clutter when the chart isn't
  being interacted with.
- The kebab uses `btn-link` styling (transparent border / background) so
  it reads as a quiet trigger rather than a button.
- Pure CSS — `max-width` + `opacity` transition, no JS. Touch-friendly:
  tapping the kebab focuses it, `:focus-within` reveals the cluster, and
  the cluster stays visible while focus remains inside (e.g. while a
  modal opened from a cluster button is interacted with).

### MetricsChart / MetricsMiniChartWidget — stats modal + data table modal

- **Added:** stats modal — click the `bi-info-circle` toolbar button to
  open a modal showing `Latest / Min / Max / Avg / Median / Sum / Count`
  over the chart's currently-loaded data. `MetricsChart` shows one row
  per dataset; `MetricsMiniChartWidget` shows a single set since it's
  one series.
- **Added:** data table modal — click the `bi-table` toolbar button to
  open a modal with the chart's labels and values as a sortable table,
  plus a "Download CSV" button. Filename is `<title-slug>-<YYYY-MM-DD>.csv`.
- Both opt-out via `showStats: false` / `showDataTable: false`. Default
  on; auto-suppressed in `MetricsChart`'s `compactHeader` mode.
- `MetricsChart` now caches the most recent processed payload
  (`{labels, datasets}`) on `_lastChartData` so the stats and data-table
  modals can read it without reaching into the SeriesChart child's
  private state.

### MetricsChart — inline granularity toggle

- **Changed:** granularity selection moved out of the gear dropdown into
  an inline Yahoo-style toggle (`MIN HR DAY WK MO`) in the chart header.
  Quiet styling — text-only buttons with subtle hover/active background,
  selected option in `--bs-body-color` and bold weight. One click instead
  of two.
- **Responsive:** below 560px container width (CSS container query), the
  inline toggle automatically swaps to a compact native `<select>` styled
  to match the toolbar's `btn-sm` height (31px). Same granularity values,
  same action wiring; the two surfaces stay in sync. Zero JS — the
  breakpoint is container-aware (not viewport-aware), so charts in narrow
  dashboard columns get the dropdown even on a wide screen.
- The gear menu now contains only the Date Range section (quick ranges +
  Custom Range dialog). It's auto-suppressed when no items remain.
- **Added:** `inlineGranularity` option (default `true`). Pass `false`
  to revert to the old gear-menu-only flow.
- **Added:** `shortLabel` field on `granularityOptions`. Defaults:
  `minutes → MIN`, `hours → HR`, `days → DAY`, `weeks → WK`, `months → MO`.
  Override per option to customize.
- `compactHeader` mode disables the inline toggle automatically (it was
  already suppressing the rest of the toolbar).

### MetricsChart / SeriesChart — refresh button + x-axis label fallback

- **Added:** `MetricsChart` now renders a refresh button in its header
  toolbar by default, matching the convention from `MetricsMiniChartWidget`.
  Opt-out with `showRefresh: false`. Suppressed automatically in
  `compactHeader` mode.
- **Fixed:** `SeriesChart` x-axis labels disappeared when the backend
  returned pre-formatted strings (e.g. `"16:00"`) and `xLabelFormat`
  was set to a `time:`/`date:` pipe. The DataFormatter pipe couldn't
  parse the already-formatted string, returned empty, and every tick
  rendered blank. `_formatXLabel` now falls back to the raw label when
  the formatter produces an empty result. This unblocks the
  `MetricsChart` defaults for `granularity: 'hours'` and `'minutes'`.

### MiniChart — bar charts baseline at zero

- **Fixed:** bar charts now baseline at zero so minimum-value bars are
  always visible. Previously a series like `[3,3,4,3,4]` rendered every
  value-3 bar with `height=0` because the auto-calculated bounds used the
  data minimum as the baseline. Negative-only and mixed-sign series are
  now also handled correctly (bars hang from / grow up from a zero line).
- **Fixed:** when every value is zero, the chart renders a thin dashed
  baseline at the chart bottom in the chart color (low opacity) instead of
  rendering nothing, so the card communicates "alive, just zero" rather
  than looking broken. Suppressed when any of `minValue`/`maxValue`/
  `softMin`/`softMax` is set.
- **Fixed:** out-of-range bars (caller-supplied `maxValue` smaller than
  `dataMax`, etc.) are clamped to the drawable area instead of producing
  negative or off-canvas heights.
- **Added:** `softMin` / `softMax` options on `MiniChart` (and pass-through
  on `MetricsMiniChartWidget`). Soft bounds: bars normalize to the soft
  target, but the bounds expand if data exceeds it. Distinct from
  `minValue`/`maxValue`, which are hard crops. Bar charts only.
- Caller-supplied `minValue` continues to behave as a hard crop —
  callers who explicitly cropped to a non-zero floor still get that.
- No changes to line charts, animation, tooltips, or x-axis.

### TimePicker / DateTimePicker — completes the picker rebuild

- New `timepicker` field type — HH:MM stepper with hour and minute
  columns, `▲`/`▼` buttons, and direct numeric typing on the value.
  Supports `format: '24h' | '12h'` (AM/PM toggle in 12h mode),
  `step` (minute increment, e.g. `15`), and `min`/`max` clamping.
- New `datetimepicker` field type — Calendar on the left, time
  stepper on the right, optional IANA timezone stacked full-width
  below in one popover. Single field type with `timezone: false |
  true` toggle (locked mockup variant A — single field type, the
  TZ slot is part of the picker, not a separate field).
- Optional IANA timezone selector built on the existing `ComboBox`,
  populated from `Intl.supportedValuesOf('timeZone')` with a curated
  ~50-zone fallback. Default value is the user's local zone via
  `Intl.DateTimeFormat().resolvedOptions().timeZone`. Inner field
  name defaults to `'timezone'` so it lines up with backend
  expectations.
- Time is **always stored as 24h canonical `'HH:MM'`** regardless of
  display format. With timezone, the default storage is ISO-style
  `'HH:MM±HH:MM'` (e.g. `'14:30-07:00'`); legacy `'HH:MM IANA/Zone'`
  is opt-in via `outputFormat: 'iana'`; `outputFormat: 'object'`
  yields `{ time, timezone }`.
- DateTime defaults to **ISO 8601** — `'2026-05-04T14:30:00'` without
  timezone, `'2026-05-04T14:30:00-07:00'` with timezone. Backends
  expecting JSON / Postgres-style timestamps handle this directly.
  `outputFormat: 'iana'` falls back to `'YYYY-MM-DD HH:MM IANA/Zone'`,
  and `outputFormat: 'object'` yields `{ date, time, timezone? }`.
- New `ianaOffset(zone, refDate)` helper resolves an IANA zone to its
  current `±HH:MM` offset (DST-aware via `Intl.DateTimeFormat`).
- `parseDateTime` now also accepts ISO 8601 strings with offset
  (`'2026-05-04T14:30:00-07:00'`, `'…Z'`, `'…+05:30'`) and round-trips
  the offset back through the picker.
- New utilities in `dateFns.js`: `parseTime`, `formatTime`,
  `compareTime`, `addMinutes`, `parseDateTime`, `formatDateTime`,
  `formatDateTimeForDisplay`.
- Reuses `CalendarPopover` so the popover portal-mounts to
  `document.body` and escapes clipping containers (modals,
  overflow:hidden tables).
- Bootstrap-tokened theming. Light + dark from day one.
- Docs: new `docs/web-mojo/forms/inputs/TimePicker.md` and
  `DateTimePicker.md`. Field-type tables and basic-types pointer
  notes refreshed.
- Examples: new `TimePicker` and `DateTimePicker` example pages, and
  the `DateTimeSuite` showcase grew two new cards covering the new
  components.

### DatePicker / DateRangePicker — in-house Calendar engine

- Replaced the prior Easepick-based pickers with an in-house `Calendar`
  view that supports day, month, and year precision via a single
  `precision` option. Same engine, three precisions — drill-down zoom
  is the precision system (header click → month grid → year grid).
- New field-type aliases: `monthpicker`, `yearpicker`, `monthrange`,
  `yearrange`. Existing `datepicker` and `daterange` configs keep
  working unchanged with `precision` defaulting to `'day'`.
- DateRangePicker — best-in-class range selection: continuous range
  fill, inward chevron anchors on start/end day cells, hover preview
  between anchor and cursor, and **cross-page anchor persistence**
  (click start in May, page to June, click end — no anchor loss).
  Backwards selection auto-swaps start/end. Two-month side-by-side
  default at day precision.
- Optional Stripe-style **preset sidebar** via `presets: 'default'`
  with sensible defaults per precision (Today, Last 7 / 30 / 90 days,
  This month, YTD, Last 12 months, etc.) or a custom array.
- No runtime CDN dependency, no native HTML5 fallback branch,
  uniform behavior across all modern browsers.
- Bootstrap-tokened theming. Light + dark themes from day one — the
  calendar reads `[data-bs-theme]` from the document root.
- New low-level utilities: `src/core/utils/dateFns.js` (parse / format
  / compare / span counts at all three precisions; not a general-
  purpose date library).

### TableView — Column `align` property

- New `align` property on column definitions: `'left'`, `'center'`,
  or `'right'` (with `'start'`/`'end'` aliases). Applied to the
  header `<th>`, body `<td>`, and footer total cell in lockstep so
  the column reads as a single visual unit.
- Footer cells now default to **left** alignment (previously hard-
  coded right). Set `align: 'right'` on numeric `footer_total`
  columns to restore the old right-aligned look.

### Charts — `MetricsMiniChartWidget.setAccount(account)` (and `MetricsMiniChart.setAccount`)

- New `setAccount(account)` method on both `MetricsMiniChartWidget`
  and the inner `MetricsMiniChart`. Mutates the account context AND
  triggers a refetch in one call — callers no longer have to
  remember to call `refresh()` after assigning a new account.
  Returns the underlying fetch promise so
  `await widget.setAccount(...)` works.
- Aligns with the existing `setGranularity` / `setDateRange` /
  `setMetrics` shape on `MetricsMiniChart`.
- **Bug fix:** `MetricsMiniChartWidget.refresh()` and
  `onActionRefreshChart()` previously gated account propagation on
  `this.account`, which is never set (the constructor stores it as
  `this.chartOptions.account`). They now read from
  `this.chartOptions.account`, so manual refreshes correctly carry
  the most recent account assignment.

### CSS — UserProfile extension: dark theme coverage + consolidated stylesheet

- Every view in the `user-profile` extension (`UserProfileView`, the
  12 `Profile*Section` views, and `PasskeySetupView`) now renders
  correctly under `[data-bs-theme="dark"]`. Previously the dialog
  rendered against hardcoded white surfaces (~99 hex declarations
  across 14 files, zero dark overrides) — the extension predated the
  framework's dark-theme cleanup.
- **New stylesheet:** `src/extensions/user-profile/css/user-profile.css`
  consolidates the 12 inline `<style>` blocks previously emitted from
  each view's `getTemplate()`. Light-theme values are byte-identical
  to before. A `[data-bs-theme="dark"]` cluster at the bottom adds
  dark companions following the chat.css / portal.css / admin.css
  convention. Auto-imported from `src/extensions/user-profile/index.js`.
- **Inline `style="…"` attributes** that paint surfaces (icon tints,
  hero gradient circles, helper paragraphs, the TOTP secret-key code
  block, the QR border, the Sessions/Devices "label: value" detail
  rows) are now class-based so the same surfaces can carry light +
  dark variants without `!important`. New shared utility classes:
  `.up-hero-circle-primary`, `.up-hero-circle-success`,
  `.up-help-text`, `.up-help-text-bottom`, `.up-secret-code`,
  `.up-qr-image`, `.up-qr-hint`, `.up-detail-row`, `.up-detail-label`,
  `.up-detail-value`, `.ps-icon-purple`, `.ps-icon-danger`,
  `.po-danger-zone`.
- **Selector names preserved verbatim** — apps that override the
  extension's CSS continue to work. No public API changes.
- **Light theme is byte-identical.** No template-structure changes,
  no JS behavior changes.
- **Known-deferred:** the `--bs-{warning,success,danger,info,primary}-bg-subtle`
  tokens are still leaking light-mode values into dark theme via
  `core.css`'s unscoped base `:root` block (separate issue). Status
  pills (`*-badge-warn` / `*-badge-ok` / `pak-warning` / `rc-warning`
  / `pak-result` etc.) in this fix use hand-tuned `rgba()` literals
  rather than reaching for those subtle tokens. Once the leak is
  fixed, those literals are good candidates for a follow-up cleanup.

### Feature — TopNav: `theme: 'auto'` follows the global dark/light preference live

- New value `'auto'` for `TopNav`'s `theme` and `shadow` constructor
  options. With `theme: 'auto'`, the navbar resolves to `'light'` or
  `'dark'` at construction time by reading `<html data-bs-theme>`
  (default `'light'` if unset), then installs a `MutationObserver` on
  `<html>` so subsequent `data-bs-theme` flips swap the
  `navbar-light` / `navbar-dark` / `topnav-light` / `topnav-dark`
  class tokens live. `shadow: 'auto'` follows the same rule for
  `topnav-shadow-light` / `topnav-shadow-dark`.
- The class swap is surgical — only the framework-managed theme
  tokens are removed/added, so any consumer-supplied classes on the
  navbar element are preserved.
- The observer is disconnected automatically in `onBeforeDestroy()`.
- `'clean'` and `'gradient'` remain static themes — `'auto'` only
  resolves to `'light'` or `'dark'`. Apps that want a clean-style
  topbar that follows dark mode should build it with custom CSS.
- **Migration:** apps that were syncing the topbar theme by hand
  (reading `<html data-bs-theme>` at boot + installing their own
  `MutationObserver` to swap `navbar-light`/`navbar-dark` etc.) can
  drop that helper and pass `theme: 'auto'` / `shadow: 'auto'`
  instead.

### Behavior — PortalApp: collapsed theme menu into a single `Theme settings` entry

- The auto-injected topbar usermenu used to add **three rows** (Theme:
  Light / Theme: Dark / Theme: System) and re-render the topbar on
  every preference change to keep the active mark in sync. It's now a
  **single row** — `Theme settings` (icon `bi-palette`, action
  `theme-settings`) — that opens a small dialog with the three radios
  wired to `app.setTheme()`. The dialog is the same shape consumers
  were already building by hand (see the previous example portal's
  `openDisplaySettings()` helper).
- **New public method:** `app.showThemeSettings()` returns the
  underlying `Modal.dialog` promise. Wired to the auto-injected
  menu item, but also callable from any consumer hook (sidebar gear
  icon, slash command, etc.).
- **Backward compat:** the legacy `theme-light` / `theme-dark` /
  `theme-system` `portal:action` cases still work — apps that wired
  their own buttons to those actions don't need to change. The
  framework's auto-injected menu just no longer emits them.
- **Opt-out unchanged:** set `topbar.themeToggle: false` to skip the
  auto-inject entirely.
- **Removed:** the private `_refreshThemeToggleActiveState()` helper
  and the `theme:changed` topbar re-render listener (a single item
  has no active mark to track).
- The example portal (`examples/portal/app.js`) was updated to remove
  its own `Settings` userMenu row and `bi-sliders` topbar gear, both
  of which duplicated the framework's auto-injected entry.

### Feature — Extensible `User` permission registry

Two related fixes that make the `User` permission registry behave correctly when apps extend it. Both bugs had the same root cause: framework-only state computed once at module load with no recompute path, so app-level mutations after import had no effect on the UI or the gate-checker.

**1. `User.registerCategoryMap()` — app categories implicitly satisfy app granular gates**

The user-permission gate already falls back from a granular permission to its parent *category* via `User.GRANULAR_TO_CATEGORY` — so a user holding `permissions.security` automatically satisfies a page gated `permissions: ["view_security"]`. But `GRANULAR_TO_CATEGORY` was built once from the framework-only `User.CATEGORY_GRANULAR_MAP` with no extension point, so app categories registered through `User.APP_CATEGORY_PERMISSIONS` could never satisfy app granular gates. Apps had to list both names in every gate array.

- **New** `User.registerCategoryMap(map)` — apps register their own category → granular relationships. Pass an object of the same shape as `CATEGORY_GRANULAR_MAP`:
  ```js
  User.registerCategoryMap({ app_cat: ['view_app_thing', 'manage_app_thing'] });
  ```
  Merges into `User.CATEGORY_GRANULAR_MAP` (extending existing categories without dropping prior entries) and triggers `rebuildPermissions()`. After registration, a user with `permissions.app_cat === true` passes a gate of `permissions: ["view_app_thing"]` automatically.
- No change to `User.hasPermission` / `_hasPermission` — they already consult `GRANULAR_TO_CATEGORY`.
- `Member.hasPermission` still does literal-only matching (no category fallback) — pre-existing, separate.

**2. `User.rebuildPermissions()` — UI picks up extended permission tabs and "App" tabset**

`User.PERMISSIONS`, `User.PERMISSION_FIELDS`, `User.CATEGORY_PERMISSION_FIELDS`, and `User.GRANULAR_PERMISSION_FIELDS` were computed by IIFEs at module-load time and never re-read their source arrays. Apps documented to extend `User.GRANULAR_PERMISSION_TABS.push(...)` / `User.APP_CATEGORY_PERMISSIONS.push(...)` / `User.CATEGORY_GRANULAR_MAP.x = [...]` after import saw no change in the rendered "Permissions" or "Adv Permissions" forms — the cached field arrays were already frozen.

- **New** `User.rebuildPermissions()` — recomputes every cached structure from the live source arrays. Idempotent. Apps call it once after their registry edits:
  ```js
  User.GRANULAR_PERMISSION_TABS.push({
      label: 'Custom',
      permissions: [
          { name: 'view_app_thing',   label: 'View App Thing' },
          { name: 'manage_app_thing', label: 'Manage App Thing' }
      ]
  });
  User.APP_CATEGORY_PERMISSIONS.push({ name: 'app_cat', label: 'App Category' });
  User.CATEGORY_GRANULAR_MAP.app_cat = ['view_app_thing', 'manage_app_thing'];

  User.rebuildPermissions();
  ```
- **Mutates caches in place** so existing references stay live. `UserForms.permissions.fields` (which captures `User.PERMISSION_FIELDS` at module-load) reflects post-rebuild updates without re-import.
- Replaces the previous IIFE-built initial state — there's now a single `User.rebuildPermissions()` call at the bottom of `User.js` instead. Initial behavior is identical to before.
- `User.registerCategoryMap()` calls `rebuildPermissions()` automatically; apps mutating `CATEGORY_GRANULAR_MAP` directly should call it themselves.

**3. `User.registerPermissions()` — atomic one-shot extension API**

Higher-level wrapper for apps that want to declare every extension in a single call rather than push to four separate arrays:

```js
User.registerPermissions({
    categories:           [{ name: 'app_cat', label: 'App Category' }],
    granularPermissions:  [{ name: 'app_perm', label: 'App Perm' }],
    granularTabs:         [{
        label: 'Custom',
        permissions: [{ name: 'view_app_thing', label: 'View App Thing' }]
    }],
    categoryGranularMap:  { app_cat: ['view_app_thing'] }
});
```

All four keys are optional. Arrays append, the map merges + dedupes, then `rebuildPermissions()` runs once. Equivalent to the imperative pattern but with no chance of forgetting the rebuild.

**4. `User._permSwitch` — exposed field builder**

The internal `_permSwitch(p) → { name: 'permissions.<p.name>', type: 'switch', ... }` helper is now `User._permSwitch` so apps building custom permission forms can use it directly and stay aligned with the framework's switch-field shape (no copy-paste drift if the shape evolves).

### Feature — `Member` permission registry parity

`Member.PERMISSIONS` had no extension point and was a literal source array — apps wanting custom member permissions had to redefine it themselves, breaking on every framework update that added new entries. Mirroring the `User` treatment:

- **New** `Member.BASE_PERMISSIONS` — the framework-defined list (renamed from the old `Member.PERMISSIONS` source).
- **New** `Member.APP_PERMISSIONS` — empty array; apps push their own entries here.
- **New** `Member.rebuildPermissions()` — recomputes `Member.PERMISSIONS` and `Member.PERMISSION_FIELDS` from `BASE_PERMISSIONS + APP_PERMISSIONS`. Idempotent. Mutates caches in place so cached references (e.g. forms holding `Member.PERMISSION_FIELDS`) stay current.
- `Member.PERMISSIONS` and `Member.PERMISSION_FIELDS` are now live caches; reading them works exactly as before. Any code that *wrote* directly to `Member.PERMISSIONS` should switch to `APP_PERMISSIONS` (or `BASE_PERMISSIONS` for framework-level edits).
- `Member.hasPermission` is unchanged — still does literal-only matching with no category fallback (Member has no category concept; this matches existing behavior).

**Tests / loader**

- New `test/unit/User.test.js` (17 tests) covers: granular→category fallback, `registerCategoryMap` merge semantics + array-form gates + superuser bypass, `rebuildPermissions` picking up extended granular tabs, the "App" tabset appearing when `APP_CATEGORY_PERMISSIONS` is non-empty, `CATEGORY_GRANULAR_MAP` updates flowing through to `GRANULAR_TO_CATEGORY`, idempotency, in-place mutation preserving held references, and `registerPermissions` atomic registration end-to-end (including the gate-check round-trip).
- New `test/unit/Member.test.js` (6 tests) covers: initial `BASE_PERMISSIONS` exposure through the live cache, switch-field shape, `APP_PERMISSIONS` pickup, in-place mutation invariant, idempotency, and the literal-matching contract for `Member.hasPermission`.
- `test/utils/simple-module-loader.js` gained `User` and `Member` entries with fallback returns, and now handles aliased named imports (`import { X as Y } from ...`) and unresolved relative named imports (declaring locals as `undefined` so module-load doesn't ReferenceError when names appear only in metadata literals).

### Feature — Examples: landing page, legacy removal, automated example tests

- **`examples/index.html` (new)** — visiting `http://localhost:3000/examples/` is no longer a blank page. A static landing card-grid links to the **Examples Portal** (canonical demos) and the standalone **Auth** login flow. No JS, no module imports — works even if the framework build is broken.
- **`examples/legacy/` removed** — the previous portal and one-off HTML demos (frozen on 2026-04-25) are deleted from the working tree. Git history preserves blame; there's nothing to port from. References in `examples/portal/README.md` are gone; references in `planning/done/*.md` and historical CHANGELOG entries are intentionally left as-is (historical record).
- **Static import-symbol check (`test/build/examples-imports.test.js`)** — runs in `npm test` and `npm run test:build`. For every `*Example.js` under `examples/portal/examples/`, it parses the `import` statements and verifies each named symbol from `'web-mojo'` / `'web-mojo/<sub>'` is actually exported by the corresponding source-tree entry. Catches "this example imports a symbol that no longer exists" without booting a browser.
- **Headless smoke runner (`scripts/test-examples-smoke.js`, `npm run test:examples`)** — opt-in, NOT wired into the default test run. Boots Vite on an ephemeral port, launches Chromium via Playwright, visits every registry route, and fails on `pageerror` or unhandled rejections. One-time setup: `npx playwright install chromium`. `playwright` is now a `devDependency`.

### Feature — Modal chrome: stripe + outline icon + tint (typed alerts only)

Pivoted away from the eyebrow band entirely. The 28px colored slab + uppercase tracking-letterspaced label was a 2015-2018 dev-tool aesthetic that aged poorly; modern reference apps (Linear, Stripe, Notion, Vercel, Apple HIG, Material 3) use minimal default chrome and reserve type signaling for typed alerts only.

**New design — see [`planning/mockups/modals/10-stripe-icon-tint.html`](planning/mockups/modals/10-stripe-icon-tint.html):**

- **Default modals** (`Modal.dialog`, `Modal.show`, `Modal.confirm`, `Modal.prompt`, `Modal.form`, `Modal.modelForm`, `Modal.showModel*`) — stock Bootstrap 5 cards. No stripe, no tint, no extra chrome. Header/footer dividers were already removed.
- **Typed alerts only** (`Modal.alert` with `type: 'info' | 'success' | 'warning' | 'error'`) get three layered cues, all driven by `--mojo-current-accent`:
  1. **4px top accent stripe** in the type color (Stripe-style; hugs the card's inner radius).
  2. **Outline leading icon** — `bi-info-circle` / `bi-check-circle` / `bi-exclamation-triangle` / `bi-x-circle` — sitting next to the title in the header. Color follows the type accent.
  3. **Soft full-card tint** — 5% type color in light mode, 10% in dark, applied as a top-to-bottom gradient.
- New `Modal.alert` option: `icon: 'bi-...'` to override the default icon, or `icon: null` to suppress it.
- Type-colored primary button preserved (red band → red OK button, etc.).

**Removed plumbing (was unreleased — no migration required):**

- `ModalView` constructor option `eyebrow` (string / `false` / `null`) — gone.
- `Modal.setEyebrowEnabled(boolean)` / `Modal.isEyebrowEnabled()` static helpers — gone.
- CSS classes `modal-bandless` and `mojo-no-eyebrow` — gone.
- Internal helpers `Modal._eyebrowStyle`, `Modal._resolveEyebrow`, `Modal._suppressDuplicateTitle` — gone.
- `eyebrow` parameter on `Modal.dialog` / `Modal.alert` / `Modal.confirm` / `Modal.prompt` / `Modal.form` / `Modal.modelForm` / `Modal.show` / `Modal.showModelView` — gone.
- CSS variables `--mojo-eyebrow`, `--mojo-current-eyebrow-fg`, `--mojo-current-tint` — gone (the band's `::before` content var, the eyebrow text color, and the separate tint var).
- The 28px band-clearance padding rules for `.modal-header` and `.modal-body:first-child` — gone (no band to clear).

`Modal.drawer` keeps its own `eyebrow` option — that's a separate concept (a small uppercase label inside the drawer's custom header markup, unrelated to the band).

### CSS — Sidebar group selector: clean stock card

- `Sidebar.showGroupSearchDialog()` no longer passes an `eyebrow` to its `ModalView`. The selector renders as a clean Bootstrap card with the search header, group rows, and footer count — same as before, just without the band.

### CSS — User profile dialog: drop the hardcoded blue gradient strip

- `UserProfileView` had its own `.up-accent` element painting a blue 4px linear gradient at the top of the dialog (independent of the framework's modal chrome). Removed — the user profile now reads as a clean default modal, consistent with the new design system.

### Feature — Examples portal: simplified display settings

- The Display settings dialog drops the "Show eyebrow band" toggle (no eyebrow to toggle anymore). Theme picker (Light / Dark / System) is unchanged. The `examples-portal:eyebrow` localStorage key is no longer read or written.

### Mockups — `planning/mockups/modals/`

- **08-stripe-minimal.html** — 4px stripe only, no icon, no tint.
- **09-stripe-and-icon.html** — 4px stripe + leading icon, no tint.
- **10-stripe-icon-tint.html** — full pattern (stripe + outline icon + tint). **Implemented.**
- **11-icon-only.html** — Apple HIG / Material 3 icon-badge alternative.
- Each mockup demos the same five scenarios side-by-side in light + dark: a custom-body modal (Alice Adams), a default confirm, and the four typed alerts.

### Feature — Modal eyebrow band: redesign + global controls

- `ModalView` now accepts an `eyebrow` constructor option directly:
  - `eyebrow: 'TEXT'` sets the band's label via the `--mojo-eyebrow` CSS
    custom property (no need to drop down to inline `style`).
  - `eyebrow: false` / `eyebrow: null` adds `modal-bandless` to the
    modal root, suppressing the colored slab entirely.
  - `eyebrow: undefined` keeps the default behavior (band visible,
    label whatever the helper supplied).
- New global toggles on `Modal`:
  - `Modal.setEyebrowEnabled(boolean)` — adds/removes the
    `mojo-no-eyebrow` class on `<html>`. SSR-safe (no-op when
    `document` is undefined).
  - `Modal.isEyebrowEnabled()` — reads the current state.
  - The CSS-only path is still equivalent — set `class="mojo-no-eyebrow"`
    on `<html>` or `<body>` directly if you prefer.
- Per-modal `eyebrow` and `modal-bandless` overrides still win when
  the global toggle is on, so individual dialogs can opt back in.
- Bug fix in `Modal.confirm()`: clicking **Confirm** previously
  resolved to `false` because the inner `onAction` returned literal
  `true`, which `_renderAndAwait` interpreted as "use the button's
  default action string" and substituted `'confirm'`. Final equality
  check `result === true` then always failed. Removed the wrapper and
  compare against the action string directly. Cancel/dismiss still
  resolves to `false`.

### CSS — Modal chrome: stock Bootstrap 5 look, custom eyebrow only

- Stripped the custom `.modal-content` overrides (14px radius, custom
  border, custom shadow stack) and the bespoke `.modal-header` /
  `.modal-footer` / `.modal-body` padding rules. The card now reads as
  a stock Bootstrap 5 modal driven by `--bs-modal-*` tokens (border
  radius, padding, border, header/footer dividers).
- The eyebrow band's top corners use
  `var(--bs-modal-inner-border-radius)` so they always track Bootstrap's
  card radius — no hardcoded `14px` left.
- Removed `border-bottom` on `.modal-header` and `border-top` on
  `.modal-footer`. The eyebrow band already separates header from body,
  and the footer's button cluster anchors itself.
- Default eyebrow is now neutral and theme-aware:
  `--mojo-current-accent: var(--bs-secondary-bg)` and
  `--mojo-current-eyebrow-fg: var(--bs-secondary-color)`. Quiet gray
  band in light mode, dark slab in dark mode.
- Typed alerts (`.modal-alert.modal-alert-{success|warning|error}`)
  override `--mojo-current-accent`, `--mojo-current-tint`, and
  `--mojo-current-eyebrow-fg` at higher specificity, so they keep their
  vivid colored bands. Untyped alerts (`Modal.alert` without a `type`)
  fall back to `--mojo-dialog-accent`.
- Default modals now use a flat `--bs-modal-bg` surface — no background
  tint. Earlier iterations tinted the whole card or just the top ~96px,
  but a body view with its own opaque chrome (e.g. a custom user-detail
  view) inevitably exposed the gradient as a thin colored strip between
  the band and the view's surface. The eyebrow band already carries the
  structural signal; the card itself stays clean.
- Typed alerts (`.modal-alert.*`) keep the full-height tint — their
  bodies are short text and benefit from full-surface brand presence.
  `--mojo-current-tint` is set per type to drive the gradient.
- Eyebrow text color uses `var(--bs-emphasis-color)` (high-contrast)
  by default rather than `var(--bs-secondary-color)` (muted) so the
  uppercase label stays legible on the neutral band in both themes.
  Typed alerts continue to render white text on their colored bands.
- New `.modal-body.modal-body-flush:last-child` rule: edge-to-edge
  bodies (e.g. `noBodyPadding: true` with no footer) clip their
  bottom corners to `var(--bs-modal-inner-border-radius)` so content
  doesn't square off against the rounded card. `overflow: hidden` is
  scoped to the body — descendant popovers from `.modal-content`
  (dropdowns, MultiSelectDropdown, ContextMenu) still escape the card.
- Eyebrow-disabled modes (`.modal-bandless` and the global
  `.mojo-no-eyebrow`) now reset the close X back to Bootstrap's
  default flex-positioned button: `position: static`, `1em` size,
  cleared filter (with `[data-bs-theme="dark"]` restoring the white
  filter via `var(--bs-btn-close-white-filter)`). The band-anchored
  white close X is now scoped to `.modal.modal-alert` only.
- Dark-mode modal box-shadow: Bootstrap ships none by default, so the
  card vanished against the dark backdrop. Added a soft white inner
  halo (`rgba(255, 255, 255, 0.08)`) plus a deep drop shadow so the
  card edge reads and the elevation still feels lifted.

### Fix — `ModalView.buildBody`: `noBodyPadding` consistency

- The `bodyView` branch was emitting `px-0 pt-4 pb-3` (Bootstrap
  utilities, all `!important`), while the string branch emitted `p-0`.
  The View-branch values clobbered the band-clearance CSS rules and
  the bottom-padding default, leaving headerless body-views stuck
  under the eyebrow band and a wide empty gap above the bottom edge.
  Both branches now emit a single `modal-body-flush` class, with all
  spacing/clipping handled by CSS (band-aware top reserve, edge-to-edge
  sides, rounded bottom corners).

### Fix — `SimpleSearchView`: theme-aware sticky header & footer

- Replaced the hardcoded `bg-light` Bootstrap utility (which paints
  `#f8f9fa` regardless of theme) with `bg-body-tertiary` on the
  sticky search header, the empty-state footer, and the result-count
  footer. Dark mode no longer flashes white slabs at the top and
  bottom of the search view.

### CSS — TopNav responsive collapse

- When `nav.navbar.navbar-expand-lg` collapses below `992px` and the
  hamburger is opened, `.navbar-collapse > .navbar-nav` items now lay
  out as a horizontal row instead of Bootstrap's default vertical
  stack: `flex-direction: row`, right-justified for `.ms-auto`,
  tighter `nav-link` padding, and dropdowns kept `position: absolute`
  so menus float instead of expanding inline. Reads as a clean
  horizontal continuation of the topbar instead of full-width links
  cascading down the screen.

### Feature — Examples portal: display settings panel

- New "Display settings" right-item in the topbar (sliders icon)
  opens a small modal exposing:
  - **Theme** — Light / Dark / System radio group wired to
    `app.setTheme()` (the existing `ThemeManager`).
  - **Modal chrome** — `Show eyebrow band` toggle wired to
    `Modal.setEyebrowEnabled()`. Choice is persisted to
    `localStorage` under `examples-portal:eyebrow` and restored at
    app boot before any modal renders.

### Docs — Modal & ModalView

- `docs/web-mojo/components/ModalView.md` — added `eyebrow` to the
  options table, clarified `title` vs `eyebrow` vs `header`
  distinctions, and added a **Hero Band & Eyebrow** section with
  examples.
- `docs/web-mojo/components/Modal.md` — added a **Hero Band & Eyebrow**
  section covering per-modal override, empty-text, and full
  suppression patterns; documented the global `Modal.setEyebrowEnabled`
  helper and the `mojo-no-eyebrow` CSS class; noted that the close
  button reverts to Bootstrap's default automatically when the band
  is suppressed.

### Feature — Cross-origin auth handoff

- `TokenManager.handleAuthCodeFromURL(app)` and `TokenManager.exchangeAuthCode(app, code)` redeem a `?auth_code=<32-hex>` URL param against `POST /api/auth/exchange` on bootstrap. The URL is scrubbed via `history.replaceState` before the network call (security bullet from the django-mojo review) and concurrent callers share one in-flight POST via the same single-flight pattern as `refreshToken()`.
- `PortalApp.checkAuthStatus()` calls `handleAuthCodeFromURL` before deciding the user is unauthenticated, so portals deployed on a different origin from the auth server boot directly into the authenticated state — no `/login` bounce, no countdown.
- Parity helpers added to the standalone auth surfaces: `MojoAuth.handleAuthCodeFromURL()` / `MojoAuth.exchangeAuthCode(code)` in `src/extensions/mojo-auth/mojo-auth.js`, and `auth.handleAuthCodeFromURL()` / `auth.exchangeAuthCode(code)` on the object returned by `createAuthClient` in `web-mojo/auth`.
- New event: `auth:exchange:failed` with `{ error }` payload. Existing `auth:login` is now also emitted by `TokenManager` on a successful exchange. Same-origin auth flows are unchanged — when no `?auth_code=` is present, `handleAuthCodeFromURL` is a synchronous no-op with no network call and no event.

### CSS — Admin assistant panel: dark theme coverage

- The Admin extension's AI Assistant panel (`AssistantPanelView` + the
  modal-fullscreen `AssistantView`) now honors `[data-bs-theme="dark"]`.
  Previously the panel header, empty-state hero, suggestion chips,
  composer input, history rail, conversation search, and thinking
  indicator all rendered against hardcoded `#fff` / `#f7f7f8` surfaces —
  loud against the framework's dark portal page (and especially loud
  against the new `#0a0d11` mission-control palette). Each surface now
  picks up `--bs-body-bg` / `--bs-tertiary-bg` / `--bs-secondary-bg`
  under the dark theme. Hover/active states on conversation rows and
  panel header buttons swap their `rgba(0, 0, 0, ...)` tints for the
  matching `rgba(255, 255, 255, ...)` values. Light theme is unchanged;
  no `!important`.

### Feature — Map: disable scroll/zoom interaction at construction time

- New constructor options on `MapView`, `MapLibreView`, and (via
  `mapOptions`) `MetricsCountryMapView`:
  - `interactive` (default `true`) — master switch; `false` freezes all
    user interaction (pan, zoom, keyboard, rotate).
  - `scrollZoom`, `dragPan`, `doubleClickZoom`, `keyboard`, `touchZoom`
    (all default `true`) — granular per-handler toggles.
- Cross-cutting names are translated per backend: `scrollZoom` →
  Leaflet `scrollWheelZoom`, `dragPan` → Leaflet `dragging`, `touchZoom`
  → MapLibre `touchZoomRotate`. Both views accept the same wrapper API.
- Defaults preserve today's fully-interactive behavior; existing call
  sites are unchanged.
- `showZoomControl` / `showNavigationControl` remain independent — UI
  buttons can still be shown on a non-interactive map.
- Programmatic camera changes (`setView()`, `setZoom()`, `flyTo()`,
  `setPitch()`, `setBearing()`) are unaffected; the flags only gate
  user input.
- Portal example pages (`extensions/map-view`, `extensions/map-libre-view`)
  show both modes side-by-side.

### CSS — Dark theme: deeper mission-control surface as default

- The framework's `[data-bs-theme="dark"]` palette now uses the deep
  near-black surfaces previously scoped to `SecurityDashboardPage`:
  page `#0a0d11`, card/tertiary `#11161d`, secondary `#161b22`, border
  `#1f2630`, emphasis text `#e6ecf3`, muted text `#8a96a6`. Every
  dark-mode page in consuming apps will look noticeably deeper and
  more contrasty on upgrade.
- **Light theme is unchanged.**
- **Opt out:** apps that want the previous Bootstrap defaults can
  override `--bs-body-bg`, `--bs-tertiary-bg`, etc. in their own CSS
  under `[data-bs-theme="dark"]` — the framework block uses no
  `!important`, so any later/higher-specificity rule wins.
- **Removed:** the `SecurityDashboardPage`-scoped overrides in
  `charts.css` (`.portal-layout:has(.security-dashboard-page)`,
  `.security-dashboard-page`, and the defensive `.page-container` /
  `.portal-content` fall-throughs). The dashboard now inherits the
  global palette seamlessly — no visual change.
- **Removed:** the `KPITile` `[data-bs-theme="dark"]` `--mojo-kpi-tile-*`
  variable block. The tile component already falls back through
  `--bs-tertiary-bg` / `--bs-emphasis-color` / `--bs-secondary-color` /
  `--bs-border-color`, which now match the original dashboard values
  1:1, so the dedicated overrides became redundant. The
  delta-badge and hover tints are kept since they don't map to a
  Bootstrap token.
- **`--mojo-sidebar-dark-bg`** now drops to `#0d1117` under
  `[data-bs-theme="dark"]` so `topnav-dark` and `sidebar-dark` sit
  one tier above the page (`#0a0d11`) and one tier below cards
  (`#11161d`) — portal chrome reads as a band rather than a raised
  tile. The light-mode default (`#343a40`) is unchanged.
- **`[data-bs-theme="dark"] .sidebar-light`** now uses
  `var(--bs-secondary-bg)` instead of a hardcoded `#2a2f36`, so the
  rail stays one step above the page automatically and tracks any
  future palette tweak.
- **Topbar default unchanged:** `--mojo-topnav-bg` still resolves to
  `var(--bs-primary)` (brand-blue topbar) when no `topnav-*` class is
  set. Consumers who want a deep mission-control topbar should use
  `topnav-dark`, which now picks up the new `#0d1117`.

### Changed — Admin sidebar Security menu restructured

- **Security Dashboard** is now a top-level sidebar item, placed directly
  below the system **Dashboard** (route `?page=system/incident-dashboard`,
  icon `bi-shield-check`).
- The single 12-child **Security** group has been split into three smaller
  groups: **System Security** (Tickets, Incidents, Events, Rules),
  **Network Security** (IPs, IP Sets, Blocked, Firewall Log), and
  **Bouncer** (Signals, Devices, Bots).
- Labels were tightened: `Rule Engine` → `Rules`, `GeoIP` → `IPs`,
  `Blocked IPs` → `Blocked`, `Bouncer Signals` → `Signals`,
  `Bouncer Devices` → `Devices`, `Bot Signatures` → `Bots`.
- Routes and per-item permissions are unchanged. Pure menu-config edit in
  `src/admin.js`; no page registrations or framework APIs changed.

### Feature — SeriesChart axis label visibility

- New `showXLabels` / `showYLabels` options (default `true`) hide the X /
  Y text labels independently. Gridlines (`showGrid`) are unaffected.
- When labels are hidden, the plot area grows into the freed padding
  (`padBottom` 24→8 with `showXLabels: false`, `padLeft` 40→8 with
  `showYLabels: false`). The X-label auto-rotation extra-padding path is
  skipped when X labels are hidden.
- Plumbed through `MetricsChart` so dashboard panels can hide axis text
  for compact tile-style displays.

### Behavior — SeriesChart hover-dim is now opt-in

- New `highlightOnHover` option on SeriesChart (default `false`). Hovering
  a bar or dot no longer dims the other series — the dim effect was
  visually noisy on stacked-bar charts and distracting in dashboard
  contexts.
- Pass `highlightOnHover: true` to restore the earlier always-on behavior.
- Plumbed through `MetricsChart`.

### Behavior — SeriesChart legend default is now top-left

- New `legendJustify: 'start' | 'center' | 'end'` option (default
  `'start'`). Combined with the existing `legendPosition: 'top'` default,
  the SeriesChart legend now sits **top-left** instead of top-center.
- `legendJustify` maps to CSS `justify-content` for both the horizontal
  flex (top/bottom legends) and the column flex (left/right legends).
- Invalid values fall back to `'start'` with a `console.warn`.
- To restore the prior top-center look, pass `legendJustify: 'center'`.
- Plumbed through `MetricsChart` (and via that, every dashboard chart
  built on the metrics fetch path).

### Fixed — Modal: descendant dropdowns/popovers no longer clipped at the card edge

- `.modal-content` had `overflow: hidden` (added with the hero-band redesign in
  `ff27795`) which clipped any absolutely-positioned descendant — `MultiSelectDropdown`,
  `ComboBox`, `CollectionMultiSelect`, plain Bootstrap `.dropdown-menu`, and any
  context menu rendered inside a modal body.
- The hero band's `::before` pseudo-element already declares its own matching
  `border-radius: 14px 14px 0 0`, so the ancestor clip was unnecessary for the
  rounded chrome. Removing `overflow: hidden` restores Bootstrap's default
  modal behavior — popovers can escape the card edge.
- No JS or component changes; the fix is a single CSS-rule removal in
  `src/core/css/core.css`.

### Feature — Security Dashboard rebuild + new framework primitives

- **`SecurityDashboardPage`** replaces the older tabbed
  `IncidentDashboardPage` with a single scrolling mission-control page.
  Route stays `system/incident-dashboard`. Seven sections answer the
  one question a sysadmin actually asks: *what should I be doing right
  now?*
  - **Pulse** — 8 KPI tiles via one batched
    `/api/metrics/series?with_delta=true` + parallel REST counts. Tiles
    track NEW incidents (untriaged), not OPEN (already claimed).
  - **Needs Attention** — list of priority>=8, status=new incidents.
    Click row opens the existing `IncidentView` modal. Hover-revealed
    inline resolve/pause actions for users with `manage_security`.
  - **Threat Composition** — single 30-day stacked bar chart that
    condenses `incident_events` / `firewall:blocks` / `bouncer:blocks`
    / `auth:failures` into one view. 7D / 30D / 90D toggle.
  - **Geography** — `MetricsCountryMapView` with slug-family selector
    (Events / Incidents / Firewall / Logins).
  - **Distributions** — three cards: status donut, priority bucket bars,
    bouncer funnel (assessments → monitors → blocks).
  - **Top Sources** — top IPs + top categories (last 7d). Tries
    server-side `group_by` first; falls back to client-side aggregation
    of recent 500 events when unsupported, with a fallback note in the
    card subtitle.
  - **Auth Failures** — uses the new `auth:failures` aggregate slug
    directly (no client-side composition); 4 sub-tiles for password
    resets / TOTP failures / sessions revoked / accounts deactivated.
  - **System Health** — single `/api/incident/health/summary` call,
    one row per discovered category, color dot from `level`, click row
    drills into the linked incident.
  - Sections 3-7 use **lazy mount** so they don't fetch until scrolled
    into view.
  - Refresh tiers via `Page.scheduleRefresh`: 60s for pulse +
    needs-attention; 5min for everything else; manual refresh button
    fires all tiers.
  - Drill-downs use `Modal.drawer` for day / country / status-filter /
    priority-bucket / IP / category / auth sub-tile clicks.

- **New framework primitives** (charts):
  - **`KPITile`** (`web-mojo/charts`) — compact presentation-only tile:
    label, big tabular value, color-coded delta badge, embedded
    `MiniChart` sparkline. Renders pre-fetched data via constructor or
    `setData()`. Click emits `tile:click`. Sits between `MiniChart`
    (sparkline only) and `MetricsMiniChartWidget` (rich self-fetching
    card). Delta rendering rules:
    - `deltaPct` present → "+12%" / "−8%"
    - `deltaPct` omitted (prev=0) + `delta` present → "+4" absolute
    - both null → no badge
    - never renders `Infinity%`
    - `severity` (critical/high/warn/info/good) adds left-stripe accent
    - `tone` ('bad' or 'good') decides whether rising = red or green
  - **`KPIStrip`** (`web-mojo/charts`) — orchestrator for N `KPITile`s.
    Single batched `/api/metrics/series?with_delta=true` call populates
    all metric tiles, parallel REST count calls populate tiles defined
    with `rest:` config, and one batched `/api/metrics/fetch` populates
    sparklines for all metric tiles.

- **Extensions to existing components:**
  - **`PieChart`** — new `centerLabel` and `centerSubLabel` options
    render text in the donut center (when `cutout > 0`). Accept either
    a static string or a function called with `({ total, segments })`.
  - **`MetricsChart`** — new `withDelta` flag passes through to the
    series endpoint; new `compactHeader` mode hides the gear menu and
    shrinks the range toggle for use inside dashboard panels.
  - **`Modal.drawer({ eyebrow, title, meta, view })`** — standardised
    drill-down modal header (eyebrow tag, title, meta row of icon-
    prefixed spans). Accepts a `View` instance OR raw HTML body.
  - **`Page.scheduleRefresh(handler, intervalMs, { tier, immediate })`**
    — registers a recurring handler that auto-clears in `onExit`.
    Replaces the `setInterval`/`clearInterval` boilerplate in every
    dashboard. `runScheduledRefreshes(tier?)` fires all (or one tier).
  - **`View.addChild(child, { lazyMount: true })`** — defers the
    child's render until its container scrolls into viewport via
    `IntersectionObserver`. Container gets a 1px placeholder min-height
    so the observer can detect 0-content placeholders. Disconnects on
    destroy. Falls back to immediate render when IO isn't available.

- **Examples portal:**
  - New `KPIStripExample` at `extensions/charts/kpi-strip` —
    demonstrates standalone `KPITile`s (delta rules) and `KPIStrip`
    (batched fetch).
  - `PieChartExample` updated to show the new doughnut center label.

### Feature — App-level theme management

- **`WebApp` now owns the user's light/dark theme.** New public API:
  - `app.setTheme('light' | 'dark' | 'system')` — persists the preference,
    applies `data-bs-theme` to `<html>`, emits `'theme:changed'` on
    `app.events` with `{ theme, resolved }`.
  - `app.getTheme()` — returns the stored preference.
  - `app.getResolvedTheme()` — returns the currently applied
    `'light' | 'dark'` (resolves `'system'` via `prefers-color-scheme`).
- **Default preference is `'system'`** — first-time visitors automatically
  get the theme that matches their OS. The `prefers-color-scheme` media
  listener tracks OS theme changes live while the preference is `'system'`.
- **Storage:** the preference is persisted to `localStorage` under
  `${appName}:theme` (mirrors the existing PortalApp sidebar-state
  pattern). All reads/writes are wrapped in try/catch — private mode and
  disabled storage degrade gracefully.
- **No flash:** the manager runs in the WebApp constructor so
  `data-bs-theme` is set before the first view renders.
- **PortalApp auto-injects a topbar theme toggle** into the usermenu:
  Light / Dark / System items with `bi-sun`, `bi-moon-stars`,
  `bi-circle-half` icons. The currently selected option is marked
  active. Opt out with `topbar.themeToggle: false`.
- **TopNav dropdown items now honor an `active: true` flag** — the
  template renders `class="dropdown-item active"` for selected items
  (used by the new theme toggle and available to any caller).
- **`examples/portal/app.js` simplified** — the manual `theme-light` /
  `theme-dark` action handlers are gone; the framework toggle handles
  them.
- **New module:** `src/core/utils/ThemeManager.js`.

### CSS — Dark-theme coverage for sidebar treatments, SideNavView, ChatView, TimelineView

- **`sidebar-light` under `data-bs-theme="dark"`** now renders against a
  softer dark surface (`#2a2f36`) instead of bright white. Hover, active,
  group-header, and muted-text selectors all adapt to the dark palette.
  Treatment classes remain independent of the global theme — devs can
  still mix `sidebar-light` / `sidebar-dark` with either.
- **`sidebar-dark` under `data-bs-theme="dark"`** got a sanity-pass hover
  override so the active state remains distinguishable from the base.
- **`SideNavView`** now has dark-theme overrides in `portal.css` covering
  the rail bg, active accent, hover, group-label, and dropdown-collapse
  mode. Base inline styles in the component template are unchanged.
- **`ChatView` (`chat.css`)** picks up dark-theme rules for the
  container, message bubbles (left), input area, attachment states,
  file-attachment overlay, and the WebKit scrollbar. Bubble `right`
  keeps `--bs-primary` from the base rule (theme-aware).
- **`TimelineView`** ships its own `src/extensions/timeline/timeline.css`
  for the first time — class-based base styles for the connector line,
  marker, dot, content card, and meta surfaces, plus `data-bs-theme="dark"`
  overrides where Bootstrap tokens aren't enough on their own.
  Auto-imported from `TimelineView.js`.

### Refactor — In-`src/` callers migrated from Dialog.* to Modal.* / ModalView

- **All in-`src/` callers** migrated from the deprecated `Dialog.*` API
  to the canonical `Modal.*` (static API) / `ModalView` (instance class)
  surface. 60 files touched across `src/core/`, `src/extensions/admin/*`,
  `src/extensions/lightbox/*`, `src/extensions/charts/*`,
  `src/extensions/map/*`, `src/extensions/user-profile/*`.
  - **Pure fire-and-forget `new Dialog({...})` sites** (7) collapsed to
    one-line `Modal.show(view, { size, header, title })` calls.
  - **Instance-handle `new Dialog({...})` sites** (11) now use
    `new ModalView({...})` — same instance API (`on('action:*')`,
    `setLoading`, `element`, `hide()`, `destroy()`) since `Dialog`
    already re-exported `ModalView` under the hood.
  - **`Dialog.show*()` static calls** mechanically renamed: `showDialog
    → dialog`, `showForm → form`, `showModelForm → modelForm`, `showData
    → data`, `showCode → code`, `showModelView → showModelView`,
    `updateModelImage → updateModelImage`, `showBusy/hideBusy` (alias
    preserved on `Modal.*`), `alert/confirm/prompt` (identical signatures).
  - **`WebApp.showLoading/hideLoading/showModelView/showModelForm/showForm/
    showDialog/showAlert`** internal lazy imports now resolve `Modal.js`
    instead of `Dialog.js`.
- **Pre-existing bug fixed**: `JobHealthView.onActionSystemSettings()`
  called `Dialog.showAlert(...)` — `showAlert` was never wired on the
  shim. The System Settings button now resolves through `Modal.alert`.
- **`Model.showError()`** also migrated from a (broken, unimported)
  `Dialog.alert(...)` global reference to a dynamic `Modal.alert`
  import, matching the lazy-import pattern WebApp uses.
- **Public surface unchanged**: the `Dialog.js` shim and the public
  `Dialog` re-exports in `src/index.js` / `src/lite/index.js` remain in
  place for downstream consumers. Their removal is a separate breaking
  change PR.

### Refactor — Dialog.js split into ModalView + Modal + focused helpers

- **`Dialog.js` (1,987 lines) split** into focused modules in
  `src/core/views/feedback/`:
  - **`ModalView.js`** — the underlying `View` class. Owns Bootstrap 5
    modal mechanics (lifecycle, sizing, z-index stacking, header/body/
    footer composition, button rendering, context menu).
  - **`Modal.js`** — canonical static API: `dialog`, `show`, `showModel`,
    `showModelView`, `alert`, `confirm`, `prompt`, `form`, `modelForm`,
    `data`, `code`, `htmlPreview`, `updateModelImage`, `loading`. A new
    `_renderAndAwait` helper consolidates ~300 lines of duplicated
    render/show/resolve/destroy code.
  - **`BusyIndicator.js`** — singleton frosted-glass loading overlay.
  - **`CodeViewer.js`** — Prism-highlighted code block view + statics.
  - **`HtmlPreview.js`** — sandboxed iframe preview view.
  - **`Dialog.js`** — thin compatibility shim. Default-exports
    `ModalView`; every legacy static (`Dialog.alert`, `Dialog.showForm`,
    `Dialog.showBusy`, …) is a one-line forward to the matching
    `Modal.*` method. Existing `new Dialog({...})` and `Dialog.show*()`
    callers continue to work unchanged.
- **Busy-indicator overlays consolidated**. The legacy dark
  `mojo-busy-indicator` is gone; only the modern frosted-card
  `mojo-loading-overlay` remains. `Modal.loading()` / `Modal.showBusy()`
  / `Dialog.showBusy()` all route through the same singleton.
- **`ModalView` is now a public export** (`src/index.js`,
  `src/lite/index.js`) — use it directly when you need a long-lived
  modal handle (streaming `setContent`, external event wiring,
  subclassing). Most callers should still prefer the static `Modal.*`
  API.
- **No consumer change required.** The 24 `new Dialog({...})` and
  `Dialog.show*()` sites already in `src/` continue to work via the
  shim. A separate request (`planning/requests/migrate-legacy-dialog-callers.md`)
  tracks the eventual sweep.
- New docs: `docs/web-mojo/components/ModalView.md`. Updated:
  `components/Modal.md`, `components/Dialog.md` (now a deprecation
  notice + migration table), `README.md`, `docs/agent/architecture.md`.

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
