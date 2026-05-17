# EventView — DetailView Rewrite (sidebar sections, categorical breakouts, raw payload)

| Field | Value |
|-------|-------|
| Type | request |
| Status | planned |
| Date | 2026-05-16 |
| Priority | high |

## Description

Rewrite `src/extensions/admin/incidents/EventView.js` to match the cleaned-up
detail-view pattern already in use across the admin app
(`IncidentView`, `LoginEventView`, `RuleSetView`, `UserView`, …):

- Extend `DetailView` instead of `View` — flat header card on top, `SideNavView`
  rail down the left, content panel on the right.
- Replace the one-giant-flat `KnownFieldsCard` "Metadata" tab with several
  **categorical sections** that only appear when their data is present.
- Add a **Raw** section showing the full metadata JSON (the user explicitly
  asked for "one more for raw data").
- Header gets a tone-driven icon + summary **chips** (level, scope, category,
  country, triggered signals like `geo_vpn` / `geo_datacenter`) — same chip
  config style as `LoginEventView`.
- Modal envelope switches to `Modal.detail()` (xl, no body padding, no footer)
  via the `viewDialogOptions` on `EventTablePage`.

The five payload shapes the user supplied
(`security:bouncer:monitor`, `user_permission_denied`, `mojo_rest_error`,
`ossec:nginx-error`, `ossec:nginx-access-502`) should all read cleanly,
with the relevant sections lit up and the rest of the rail quiet.

## Context

EventView is the last detail view in `src/extensions/admin/` that still uses
the old `TabView` + single `KnownFieldsCard` layout. Every other sibling has
been migrated to `DetailView` + `SideNavView` + per-domain sections during
the wave-3 cleanup. The current Metadata tab dumps 20+ rows in one flat list,
which (per the screenshots) is hard to scan: HTTP fields, geo fields, related
model fields, OSSEC fields, and stack-trace-adjacent fields all share one
ungrouped grid. Different event categories surface very different metadata
keys — a single flat list serves none of them well.

Reference precedents:
- `IncidentView.js` — divider-grouped sidebar (`Overview · Events · ── Investigation ── Source · Request · Stack Trace · ── Response ── …`), conditional sections, `IncidentRequestSection` flat-row HTTP capture, `IncidentSourceSection` GeoIP + threat badges, `IncidentStackTraceSection` wrapping `StackTraceView`, `IncidentMetadataSection` wrapping `KnownFieldsCard`.
- `LoginEventView.js` — DetailView with KPI grid on Overview (`MetricCard`), flat-row identity grid, chip-laden header with tone-driven icon, audit-list section.
- Done request: [planning/done/incidentview-sidenav-rewrite.md](../done/incidentview-sidenav-rewrite.md) — exact pattern this request follows for EventView.

## Acceptance Criteria

- [ ] `EventView` extends `DetailView` instead of `View`.
- [ ] `EventTablePage.viewDialogOptions` switches to use `Modal.detail()` (xl, header:false handled by DetailView itself).
- [ ] Header config:
  - [ ] Tone-driven icon via `iconToneFn` (level >= 5 → danger, >= 4 → warning, >= 3 → info, otherwise secondary).
  - [ ] `titleFn` returns `model.get('title')` with a safe fallback (`'System Event'`).
  - [ ] `subtitleFn` returns `"<datetime> · from <source_ip>"` (or just datetime when no IP).
  - [ ] Chips (each filtered by a `when` predicate so they only render when data exists):
    - Level badge (`text: m => 'L' + level`, variant by tone).
    - Scope (`scope`, light variant).
    - Category (`category|capitalize`, light variant).
    - Country (`country_code` flag-ish, light variant).
    - `triggered_signals[]` — one chip per signal (e.g. `geo_vpn`, `geo_datacenter`), warning variant. Cap at ~4 chips with `+N more` if longer.
    - `model_name` + `model_id` chip (action: `view-model`) when both present, so the related-model jump is one click instead of buried in the context menu.
  - [ ] `contextMenu` carries the existing items: View Incident, View Related Model, Delete Event.
- [ ] Sidebar sections (each appears only when its data condition is met):
  - **Overview** (always) — small KPI strip (`Level`, `Scope`, `Category`, `When`) using `MetricCard`, then flat-row `Identity` block (event ID, incident ID, server, related model, details). No more 2-column DataView dump.
  - **Source** (when `metadata.source_ip` or `metadata.city` or `metadata.country_code`) — geolocation flat rows (City · Region, Country (cc), Timezone, Lat/Lon, Source IP, Request IP), with a "View GeoIP" action that opens `GeoIPView.show(source_ip)` when the IP is set. Mirror `IncidentSourceSection`'s shape but lighter — no threat-actions toolbar (events are immutable).
  - **Request** (when any `metadata.http_*` field or `metadata.request_data` is present) — reuses the same flat-row shape as `IncidentRequestSection` (Method · Status · Host · Path · URL · Protocol · Query string · User agent), plus a `Request data` block rendering `request_data` as pretty-printed JSON inside `<pre class="detail-payload-block">`.
  - **Stack Trace** (when `metadata.stack_trace`) — wrap `StackTraceView` (existing behavior, keep working).
  - **OSSEC Alert** (when `model.get('scope') === 'ossec'` OR `metadata.alert_id` is present) — flat-row block for `alert_id · rule_id · logfile · upstream · error_code · error_message`, then the raw `text` blob in `<pre class="detail-payload-block">`. This is the high-signal section for ossec events; everything else is supporting context.
  - **Bouncer** (when `metadata.decision` or `metadata.risk_score` is present) — flat-row block: Decision, Risk score (with progress-bar-style fill or muted bar), Page type, MUID, DUID. The `triggered_signals[]` array also renders here as chips so the section is self-contained even if the user clicked through from another part of the app.
  - **Permissions** (when `metadata.permission_keys` is present) — render `permission_keys` and `perms` as code blocks; small section, only shows for `user_permission_denied` and similar events.
  - **Divider: "Raw"** — section group label.
  - **Raw** (always, after the divider) — `KnownFieldsCard` with `knownKeys: []` and `rawCollapsed: false`, so the `<details>` raw-JSON dump is fully open and easy to copy. Drops the "known fields" grid the current EventView uses, since those fields are already promoted into proper sections above.
- [ ] Sidebar dividers: `Investigation` (above Source/Request/Stack Trace/OSSEC/Bouncer/Permissions), `Raw` (above the Raw section).
- [ ] Sections render correctly in both `[data-bs-theme="light"]` and `[data-bs-theme="dark"]` — no hex literals for surfaces; reuse `.detail-section-eyebrow`, `.detail-flat-row`, `.detail-payload-block`, `.detail-known-fields-*` classes that already adapt.
- [ ] Context menu actions still work: `view-incident`, `view-model`, `delete-event` (the `model:VIEW_CLASS` wiring at the bottom of the file stays).
- [ ] Sample render check against each of the five JSON payloads pasted in the original request (bouncer monitor, permission denied, mojo rest error, ossec nginx error, ossec nginx 502) — each should light up the right sections and leave the rest dim.

## Investigation

**What exists**
- `src/extensions/admin/incidents/EventView.js` (242 lines) — current implementation:
  - Custom `<div>` header template with icon + title + category + datetime + context-menu container.
  - `TabView` with 3 tabs: Overview (`DataView`), Stack Trace (`StackTraceView`, conditional), Metadata (`KnownFieldsCard`, conditional).
  - The `KnownFieldsCard` config lists ~30 known keys in one flat 2-column grid; raw JSON is collapsed at the bottom.
  - Action handlers: `onActionViewIncident`, `onActionViewModel` (uses `MODEL_REGISTRY`), `onActionDeleteEvent`.
  - `IncidentEvent.VIEW_CLASS = EventView` wired at the bottom.
- `src/extensions/admin/incidents/EventTablePage.js:32-35` — `viewDialogOptions: { header: false, size: 'lg' }` — needs to switch to `Modal.detail()` defaults (xl) once DetailView supplies its own header.
- `src/extensions/admin/incidents/IncidentView.js:1615+` — `IncidentView extends DetailView` reference implementation. Sections are independent View subclasses; the assembly happens in the `IncidentView` constructor.
- `src/extensions/admin/account/login_events/LoginEventView.js` — second DetailView reference, lighter weight, similar shape to what EventView wants.
- `src/core/views/data/DetailView.js` — base class.
- `src/core/views/data/KnownFieldsCard.js` — for the Raw section (set `knownKeys: []` and `rawCollapsed: false` to get just the JSON dump as an always-open `<details>`).
- `src/core/views/data/StackTraceView.js` — keep as-is, just wrap it in a section.
- `src/core/views/data/MetricCard.js` — for the Overview KPI strip.
- `src/core/views/data/DataView.js` — possibly used for sub-grids inside sections (`IncidentSourceSection` does this).

**What changes**
- `src/extensions/admin/incidents/EventView.js` — wholesale rewrite from `View`+`TabView` to `DetailView`+`SideNavView` sections.
- `src/extensions/admin/incidents/EventTablePage.js:32-35` — drop `header: false`, raise size to `xl`, or just remove `viewDialogOptions` entirely if `Modal.detail()` defaults are fine. (Modal envelope is supplied by `Modal.detail()` automatically once the view is a DetailView.)
- Possibly add new module-scoped helpers inside `EventView.js` for the per-domain section classes (`EventOverviewSection`, `EventSourceSection`, `EventRequestSection`, `EventStackTraceSection`, `EventOssecSection`, `EventBouncerSection`, `EventPermissionsSection`, `EventRawSection`). Match the in-file class-organization style of `IncidentView.js` so the whole story for one event view stays in one file.

**Constraints**
- Follow `.claude/rules/views.md`: `this.model` is the data object, child views use `containerId`, `data-action` is kebab-case, dark theme works from day one via Bootstrap tokens.
- Follow `.claude/rules/theming.md`: every surface uses `var(--bs-...)` tokens or has a paired `[data-bs-theme="dark"]` override. No raw hex literals for surface colors.
- The framework `Modal.detail()` already supplies the modal shell; DetailView owns the header, so the existing custom header template is removed.
- Sections pull values via `model.get('metadata.<field>')` (most http/geo/ossec fields live under `metadata`) and `model.get('<field>')` (top-level: level, title, category, scope, details, source_ip). `Model.get()` supports dot notation and pipe formatters natively (`model.get('metadata.http_method')`, `model.get('created|datetime')`) — don't unwrap `metadata` manually. Mustache mirrors the same shape: `{{model.metadata.http_method}}` / `{{model.metadata.country_code|upper}}`. The conditional section predicates (`hasRequest`, `hasOssec`, etc.) are simple getters built from the same dotted gets.
- The "Raw" `<details>` block should default open (`rawCollapsed: false`) so the user can copy without an extra click — they asked for raw data prominently.
- No new REST endpoints. Standard CRUD only. (None of the new sections need data the model doesn't already carry.)
- Keep `IncidentEvent.VIEW_CLASS = EventView` + `IncidentEvent.MODEL_REF = 'incident.Event'` registrations.
- Don't refactor `IncidentView`, `LoginEventView`, or `StackTraceView` while doing this. Pattern-mirror only.

**Related files**
- `src/extensions/admin/incidents/EventView.js`
- `src/extensions/admin/incidents/EventTablePage.js`
- `src/extensions/admin/incidents/IncidentView.js` (reference — do not modify)
- `src/extensions/admin/account/login_events/LoginEventView.js` (reference — do not modify)
- `src/core/views/data/DetailView.js`
- `src/core/views/data/KnownFieldsCard.js`
- `src/core/views/data/StackTraceView.js`
- `src/core/views/data/MetricCard.js`
- `src/core/views/data/DataView.js`
- `src/core/views/navigation/SideNavView.js`
- `docs/web-mojo/components/DetailView.md` (constructor reference)
- `docs/web-mojo/components/KnownFieldsCard.md`
- `planning/done/incidentview-sidenav-rewrite.md` (the precedent done request — same shape, on the parent view)

**Endpoints**
- None added. All sections render from data already on the `IncidentEvent` model (`metadata.*` blob + top-level fields).
- Source section's optional "View GeoIP" action uses the existing `GeoIPView.show(ip)` flow, which already calls `/api/account/system/geoip` under the hood.

**Tests required**
- No regression test required — this is a structural UI rewrite, not a bug fix. Behavior is "view renders correctly across N sample event payloads", which is verified visually.
- Chrome UI smoke test (per `.claude/rules/testing.md`): open the admin events table, click into one event per category (bouncer, permission denied, rest error, ossec) and confirm the right sections light up, every section is keyboard-navigable via the SideNavView rail, dark theme reads correctly, "View Related Model" / "View Incident" / "Delete Event" still work, Raw JSON is visible and selectable.

**Out of scope**
- No changes to the events list (`EventTablePage`) other than `viewDialogOptions`.
- No new model fields, no new REST endpoints, no API/server changes.
- No GeoIP enrichment fetching inside EventView (Source section just shows what's on `metadata`; full GeoIP details still come from clicking through to `GeoIPView`).
- No bulk actions, no edit flow on events. Events remain an immutable audit feed.
- No changes to `IncidentView`, `LoginEventView`, `StackTraceView`, `KnownFieldsCard`, `DetailView`, `SideNavView`, or any framework primitive. Reuse only.
- No CSS additions to `core.css` or `admin.css` — every class needed (`.detail-section-eyebrow`, `.detail-flat-row*`, `.detail-payload-block`, `.detail-kpi-grid`, `.detail-known-fields-*`) already exists.
- Doc updates: no doc changes required (no new public API).
- `CHANGELOG.md`: not required (internal admin extension reskin, no published-API change).

## Notes

- The user explicitly asked for "more tabs ... maybe break out the metadata into category tabs ... like if stack trace detected". The DetailView pattern lands the same idea as a left-rail sidebar, which is what the rest of the admin app has converged on. If a horizontal TabView is preferred for any reason, every section class in this design is independently usable inside a `TabView` config too — but pattern consistency with `IncidentView` / `LoginEventView` is the win here.
- The bouncer monitor sample data contains a `triggered_signals: ['geo_vpn', 'geo_datacenter']` array that's perfect chip material — the user is already thinking in terms of "if X detected, surface it". Honor that intent: each section is a "lit-up-when-relevant" affordance, not a fixed shelf of empty slots.
- The OSSEC `text` field is a multiline blob already pre-formatted by the upstream alerter. Just render it inside `<pre class="detail-payload-block">` — don't try to parse it.
- Two of the five samples are `scope: 'ossec'` and would benefit most from the dedicated OSSEC section since their `metadata.text` is the actual signal. The current flat-grid does not handle this at all (`text` isn't in the `knownKeys` list).
- `request_data` (in the `mojo_rest_error` sample) is a nested object — render via `JSON.stringify(value, null, 2)` inside a `<pre>` so the user can copy.
- Keep the file in the ~200-line range; the goal is *reskin to match siblings*, not introduce a deeper abstraction.

## Plan

### Objective
Migrate `src/extensions/admin/incidents/EventView.js` from `View`+`TabView`+single-flat-`KnownFieldsCard` to `DetailView`+`SideNavView`+per-domain sections (`Overview`, `Source`, `Request`, `Stack Trace`, `OSSEC`, `Bouncer`, `Permissions`, `Raw`). Sections only appear when their data is present. Modal envelope switches to `Modal.detail()`-style via `EventTablePage.viewDialogOptions`.

### Steps
1. `src/extensions/admin/incidents/EventView.js` — wholesale rewrite (~300–400 lines, in-file section classes, mirroring `IncidentView.js` organization):
   - Imports: add `DetailView`, `MetricCard`, `dataFormatter`. Drop `TabView`, `DataView`.
   - Helpers: keep `_iconForLevel` but return `{ icon, tone }` (tone strings: `danger`/`warning`/`info`/`secondary`); add `_signalChipVariant(signal)` for `triggered_signals` chips; add `_isOssec(model)`.
   - `EventOverviewSection` — `.detail-kpi-grid` with 4 `MetricCard` slots (Level / Scope / Category / When), then `Identity` eyebrow + flat rows for Event ID, Incident, Related model, Server, Details.
   - `EventSourceSection` — when any of `source_ip`/`metadata.city`/`metadata.country_code`/`metadata.region` is set. Flat rows: Source IP (clickable `data-action="view-geoip"`), Request IP, City · Region, Country (cc), Timezone, Lat/Lon.
   - `EventRequestSection` — when any `metadata.http_*` or `metadata.request_data` is set. Mirror `IncidentRequestSection` (`IncidentView.js:1007`) shape; append `Request data` eyebrow + `<pre class="detail-payload-block">` for `request_data` JSON.
   - `EventStackTraceSection` — copy `IncidentStackTraceSection` (`IncidentView.js:1121`); wraps `StackTraceView`.
   - `EventOssecSection` — when `_isOssec(model)`. Flat rows for Alert ID / Rule ID / Logfile / Upstream / Error code / Error message, then `Raw alert` eyebrow + `<pre class="detail-payload-block">` for `metadata.text`.
   - `EventBouncerSection` — when `metadata.decision` or `metadata.risk_score != null` or non-empty `metadata.triggered_signals`. Flat rows for Decision (variant badge), Risk score, Page type, MUID, DUID; below, an eyebrow `Triggered signals` + chip-row built from `triggered_signals`.
   - `EventPermissionsSection` — when `metadata.permission_keys` or `metadata.perms`. Flat rows with code-wrapped per-item values.
   - `EventRawSection` — always present. `KnownFieldsCard` with `knownKeys: []`, `rawCollapsed: false`, `rawLabel: 'Raw metadata'`, `emptyText: 'No metadata recorded on this event.'`.
   - `EventView extends DetailView` (bottom): tone-driven `iconToneFn`, `titleFn` falling back to `'System Event'`, `subtitleFn` for `<datetime> · from <source_ip>`, chips for Level / Scope / Category / Country / per-signal (cap at 4 + `+N more`) / Related-model (with `action: 'view-model'`), `contextMenu` with existing View Incident / View Related Model / Delete Event items. Sections array conditionally pushed; `Investigation` divider only if any of Source/Request/StackTrace/OSSEC/Bouncer/Permissions is included; `Raw` divider before the Raw section. `activeSection: 'Overview'`.
   - Keep `onActionViewIncident`, `onActionViewModel`, `onActionDeleteEvent` verbatim.
   - Bottom: keep `IncidentEvent.VIEW_CLASS = EventView`, `IncidentEvent.MODEL_REF = 'incident.Event'`; add `EventView.VIEW_CLASS = EventView`; export named section classes too.
2. `src/extensions/admin/incidents/EventTablePage.js:32-35` — change `viewDialogOptions` to `{ header: false, noBodyPadding: true, buttons: [] }` (drops `size: 'lg'` — lg is default; adds `noBodyPadding` + empty `buttons` so the new DetailView sits flush, no footer).
3. No new CSS. All required classes (`.detail-section-eyebrow`, `.detail-flat-row*`, `.detail-payload-block`, `.detail-kpi-grid`, `.metric-card*`, `.detail-known-fields-*`) already live in `src/core/css/core.css`.

### Design Decisions
- Dotted `model.get('metadata.field')` everywhere (per saved memory) — symmetric with `{{model.metadata.field}}` in templates; no manual unwrapping.
- In-file section classes match `IncidentView.js` organization (one file tells the whole story of one detail view).
- Conditional `sections.push(...)` (rail itself stays quiet when only Overview/Raw apply) — same pattern as `IncidentView.js:1677-1697`.
- `iconToneFn` for the header (`LoginEventView.js:278` pattern) so a level upgrade re-tones without a hard re-render.
- `triggered_signals` chip overflow at 4 — full array still visible in the Bouncer section.
- Country chip uses `text: m => m.get('metadata.country_code')` rather than `textPath` (avoids depending on whether `DetailHeaderView` traverses dotted paths in `textPath`).
- `KnownFieldsCard` with `knownKeys: []` and `rawCollapsed: false` gives a clean always-open JSON dump — reuse the existing primitive unmodified.

### Edge Cases
- No metadata at all → sidebar = Overview + Raw divider + Raw section (with empty-text). Header chips fall away via `when`.
- `triggered_signals` not an array → coerce to `[]`; Bouncer signals block hides when empty.
- `request_data` is a string → render as-is (don't double-stringify).
- `metadata.stack_trace` empty string → falsy `when`, section is skipped. Fallback `<pre>` if `StackTraceView` throws.
- OSSEC event without `text` blob → raw-alert pre is conditional; flat rows still render whatever subset is present.
- `source_ip` set but no GeoIP — IP row renders; geo rows are individually conditional. `view-geoip` action lazy-imports `GeoIPView`; if unavailable, toast warning rather than crash.
- Long `details` field — flat-row value wraps via existing `.detail-flat-row-value` styles (`white-space: pre-wrap`).
- Dark theme — no new hex literals; audit signal `grep "background:\s*#\|color:\s*#"` against new file should return 0 hits.

### Testing
- `npm run lint` (file is under the lint glob).
- Chrome smoke test per `.claude/rules/testing.md`:
  - `npm run dev`; open `admin/events`; click into one event per category (bouncer monitor, permission denied, mojo rest error, ossec nginx error, ossec nginx 502).
  - Verify per payload: header icon tone, chip set, sidebar contains only relevant sections, Raw section is open and selectable, View Incident / View Related Model / Delete Event still work, View GeoIP opens the modal.
  - Verify both `[data-bs-theme="light"]` and `[data-bs-theme="dark"]` read correctly.
- No unit tests added (structural UI rewrite; behavior is "renders correctly across N payloads").

### Docs Impact
- No `docs/web-mojo/` updates (admin extension internal reskin, no framework-primitive change).
- No `CHANGELOG.md` entry (no published-API change).
