---
id: WM-023
type: feature
title: "Admin › Security › Geofencing — rules editor, simulator, blocks log (legal/business audience)"
priority: P1
effort: L
owner: frontend
opened: 2026-07-07
depends_on: []
related: [django-mojo#ITEM-017]
links:
  - django-mojo docs/web_developer/account/geofence.md (the REST contract, written for this UI)
---
# Admin › Security › Geofencing — rules editor, simulator, blocks log (legal/business audience)

## What & Why

The backend admin plane **landed**: **django-mojo#ITEM-017** (closed
2026-07-08, ships in **v1.2.42**) delivered the full REST contract this UI
consumes, documented — purpose-written for this section — in
`docs/web_developer/account/geofence.md`: `GET/POST/DELETE /api/geo/rules`
(effective config incl. `enforced_endpoints`, per-scope posture,
`system.source`), `POST /api/geo/simulate` (what-if, incl. `would_block` for
exempted IPs), `GET/POST /api/geo/allowlist` (CIDR exemptions with
reason/`until` expiry), per-IP whitelist with TTL via the `system/geoip`
whitelist action, and `GET /api/geo/bypass_holders`. Config writes are
audited as `geofence_config` incident events — that stream IS the change
history. **No UI anywhere shows or edits any of it.** Two products need it
now (MojoVerify: payment-processor compliance evidence — enforcement already
live via MVERIFY-API-014; WMX: 13-state sweepstakes deny list), and per
owner ruling (2026-07-07) the rules will be maintained by **legal/business
staff in the portal, not engineers editing settings files**. That makes this
framework admin UI — every consumer portal inherits it, the same ownership
call as the group API-key/webhook UI.

Audience constraint (drives the whole design): a compliance officer must be
able to read, edit, verify, and screenshot the rules without engineering
help. Plain language everywhere — US states picked by name from a
multiselect, countries by name, anonymizer policy as labeled toggles
(VPN / Tor / proxy / datacenter). **Raw JSON editing is not an acceptable
interface** (a validated "advanced" JSON view may exist behind a toggle).

## Description

New admin section under the existing `src/extensions/admin/security/`:

1. **Posture header** — from `GET /api/geo/rules`: enabled, **per-scope**
   fail posture (payments fail-closed / auth fail-open), cache TTL,
   `system.source` badge (`setting` = editable DB row · `conf` = deploy
   file · `none`), the `enforced_endpoints` list (which endpoints/scopes
   are gated), and last config change from the `geofence_config` event
   stream. The at-a-glance "is geofencing active" answer.
2. **System rules editor** — the platform floor via `POST /api/geo/rules`
   (server-validated; human-readable errors inline): country allow/deny,
   US-state (region) deny multiselect, abuse toggles. When `system.source`
   is `conf`, make the override semantics explicit — saving creates the DB
   Setting that takes precedence over the deploy file. **Change history**
   rendered from `GET /api/incident/event?category=geofence_config`.
3. **Per-group panel on GroupView** — the group's tightening rules rendered
   *merged over* a read-only system floor, so an operator sees the effective
   policy, never just the fragment they can edit.
4. **Simulator** — pick a country/state or paste an IP → live decision with
   plain-language reason ("Blocked — Washington is on the platform deny
   list"), via `POST /api/geo/simulate`. For exempted IPs surface
   `would_block`/`would_block_reason` ("allowed by exemption — would
   otherwise block: country_not_allowed"). This is how a non-engineer
   self-verifies an edit and how evidence screenshots get made.
5. **Blocks log** — table over incident Events (`category=geofence_block`):
   time, `geofence_scope`, country/region, reason, rule level; filterable.
6. **Exemptions** — the surface for "our developers are in France":
   (a) CIDR allowlist viewer/editor (`GET/POST /api/geo/allowlist` —
   entries `{cidr, reason, until}`; expired entries render as inactive,
   not hidden); (b) per-IP whitelist with reason + TTL/until via the
   `system/geoip` whitelist action; (c) read-only `bypass_geofence`
   holders (`GET /api/geo/bypass_holders`, capped at 200,
   permission-vs-superuser source shown). Exemptions are
   compliance-sensitive: always shown with reason and expiry, never buried.

## Acceptance Criteria

- [ ] Section reachable under admin Security, gated by the shipped keys:
      `view_geofence` (read-only render — editor/actions hidden or disabled)
      vs `manage_geofence` / `security` (writes). These are **global
      user-level grants** — member/group grants do NOT apply (platform-wide
      config); the UI must not imply a brand admin can edit system rules.
- [ ] Exemptions round-trip: add/edit/remove CIDR allowlist entries with
      reason + expiry; expired entries visibly inactive; per-IP whitelist
      action works with TTL; bypass-holders list renders with source.
- [ ] System rules round-trip: edit → validate → save → posture header and
      effective-rules display update; invalid input surfaces the backend's
      message inline, nothing saves.
- [ ] GroupView geofencing panel shows effective (merged) rules and edits
      only the group layer; the system floor is visibly read-only.
- [ ] Simulator returns and renders a full decision, including the blocked
      case, without caching side effects.
- [ ] Blocks log pages/filters against incident Events; empty state explains
      "no blocks recorded" vs "evidence plane not enabled."
- [ ] No raw `<form>` tags; FormView/DIALOG conventions per framework norms.

## Plan
<!-- Approved by owner 2026-07-08 ("build it", after mockup v3). -->


### Goal
Ship the admin geofencing surface — a `system/security/geofencing` page
(posture header + Rules / Simulator / Blocks log / Exemptions tabs) plus a
GroupView "Geofencing" section — consuming the django-mojo#ITEM-017 REST
contract, gated by global geofence perms, plain-language-first, with mockups
approved before any code.

### Phase 0 — Mockups (HARD GATE before any /build code)
Self-contained HTML mockups, Bootstrap 5.3 look, BOTH `data-bs-theme` light
and dark, one per surface:
1. Page shell — nav placement (Network Security › Geofencing), posture
   header (chips: enabled, `system.source`, per-scope fail posture, cache
   TTL, last change), tab bar.
2. System rules editor — country policy (mode + by-name multiselect),
   US-state deny multiselect, abuse toggles, conf-override banner,
   advanced-JSON toggle, inline server-error state, change-history table.
3. Simulator — Location|IP input modes, group + scope options, decision card
   (allowed / blocked / exempt-with-`would_block`), engine-disabled notice.
4. Blocks log — activity strip (KPI tiles + blocks-over-time chart with PNG
   export), columns, filters, level striping, both empty states.
5. Exemptions — CIDR allowlist editor (expired = visibly inactive), per-IP
   whitelist list + add flow, bypass holders (source badge, capped notice).
6. GroupView Geofencing section — read-only system floor + editable group
   layer + effective (merged) result.
Iterate to approval; record approval + mockup location in ## Notes. /build
MUST refuse to write implementation code while mockups are unapproved.

### Context — what exists (recon verified 2026-07-08)
- Registration: `src/admin.js` — import/export page classes (admin.js:48-53,
  183-188); `registerSystemPages` → `app.registerPage('system/security/<slug>',
  Cls, {permissions})` (admin.js:260-266); Security menu = System Security /
  Network Security / Bouncer groups (admin.js:316-355); deep link is
  `?page=<registration key>` (Router.js:150-151; WebApp.js:213-252).
- Permissions: menu parents/children honor `permissions` arrays, any-of
  (Sidebar.js:903-951; User.js:15-17); page guard via registerPage perms →
  `Page.canEnter` (Page.js:80-91); **`sys.`-prefixed keys check the User
  record only, skipping member/group grants** (User.js:20-39; precedent
  `GROUP_AUTH_PERMS = ['sys.groups','sys.manage_groups']`, GroupView.js:1351)
  — matches this item's "global grants only"; superuser always passes
  (User.js:14). In-view gating fail-closed via `View#checkPermissions`
  (View.js:694) on toolbar buttons (ListView.js:566), menu items
  (TableRow.js:286), DetailView sections, FormView fields.
- Templates to mirror: `EventTablePage.js` (IncidentEventList + fixed
  `defaultQuery`, metadata.* dotted columns/filters, level `rowStripe`,
  :38-193); `BlockedIPsTablePage.js` (fixed-filter table + magic-field
  actions, :36-124); `GeoIPView.js` (per-record REST actions via
  `model.save({whitelist:{reason,ttl}})` + refetch/re-render, :1134-1202;
  scoped embedded event tables with `hideActivePillNames`, :745-779).
- GroupView (`account/groups/GroupView.js`): DetailView `sections[]` with
  optional `permissions` (:1292-1306) + header kebab. **GroupAuthConfigSection**
  (`GroupAuthConfigSection.js`) is the proven metadata-editor recipe:
  embedded FormView (tabset/select/multiselect/toggle/tags), diff-only nested
  payload → `model.save({metadata:{auth_config: diff}})` (:559),
  `_onModelChange` no-op guard (:227-229), 400 → inline status + toast via
  `_fail(resp?.message || resp?.data?.error)` (:577-597), resolved-config via
  `app.rest.GET('/api/auth/config',{group_uuid})` (:234-248).
- Data plumbing: `IncidentEvent`/`IncidentEventList` → `/api/incident/event`
  (admin/models/Incident.js:18-35); `GeoLocatedIP(.lookup)`/`GeoLocatedIPList`
  → `/api/system/geoip` (core/models/System.js:70-103); `rest.GET/POST/DELETE`
  with payload at `resp.data.data`, human 400 message at
  `resp.data?.error || resp.message` (Rest.js:280-317, 495-551). **No new
  Model classes needed** ⇒ no `npm run generate:models`.
- Building blocks: FormBuilder types incl. `select`, `multiselect`
  (MultiSelectDropdown, {value,label} options, change event, not searchable),
  `toggle/switch`, `json`, `datetimepicker`, `collection`
  (FormBuilder.js:700-838); TabView + variants (navigation/TabView.js:39-47;
  IPSetView.js:170-177); `DetailHeaderView` exported standalone for Pages,
  chips accept function `variant`/`icon` (DetailView.js:66-83, 178-205);
  StatusPanel/DataView for read-only panels; `Modal.confirm/form/modelForm`
  canon (Modal.js:485,576,659); showLoading try/finally
  (GroupAuthConfigSection.js:556-563).
- **Greenfield**: no geofence code in src/; **no country or US-state option
  lists exist anywhere** — nearest is `@ext/map/countryCentroids.js`
  (`COUNTRY_CENTROIDS`: ISO2 → {name,lat,lng}); admin already imports from
  `@ext/map` (GeoIPView.js:30).
- REST contract (django-mojo `docs/web_developer/account/geofence.md`,
  v1.2.42): GET/POST/DELETE `/api/geo/rules` (effective config incl.
  `system.source`, posture, `enforced_endpoints`; POST full-replace,
  readable 400s); POST `/api/geo/simulate` (`ip` XOR `geo`
  `{country_code, region_code:'US-WA', is_tor,…}`, optional
  group_uuid/scope; full GeoDecision incl. `would_block`); GET/POST
  `/api/geo/allowlist` (POST full replace; first bad entry named in 400);
  GET `/api/geo/bypass_holders` ({id, username, is_active, source, value},
  cap 200); per-IP whitelist via geoip action `{whitelist:{reason,ttl|until}}`;
  group rules via standard group REST `metadata.geofence` (merge semantics,
  `__replace` to clear); history/evidence via `/api/incident/event`
  categories `geofence_config` / `geofence_block` (need `view_security`).

### Changes — files

NEW under `src/extensions/admin/security/geofence/`:
1. `geofenceData.js` — hand-authored `US_STATES` (51 × {value:'US-WA',
   label:'Washington'}); `COUNTRIES` derived from `@ext/map/countryCentroids.js`
   sorted by name; `REASON_TEXT` (all 15 reason codes → plain sentences with
   country/state names substituted); `describeRule(rule)` → clause list for
   read-only display; `ruleToForm(rule)` / `formToRule(fields)` /
   `isAdvancedRule(rule)` (detects shapes the friendly editor can't
   represent). Pure functions — unit-testable.
2. `GeofencingPage.js` — `extends Page`; fetch `GET /api/geo/rules` (+ latest
   `geofence_config` event for "last change", when permitted) in `onEnter()`;
   posture header + TabView (Rules | Simulator | Blocks log | Exemptions);
   degrade path for backend without geofence REST.
3. `GeofencePostureHeader.js` — read-only header (chips style per mockups):
   enabled, source badge, per-scope fail posture, cache TTL, allowlist
   summary, last change, collapsible `enforced_endpoints`.
4. `GeofenceRulesView.js` — Rules tab: effective display (`describeRule`);
   editor via shared `GeofenceRuleForm`; conf-override banner when
   `source:'conf'`; "Remove DB override" (Modal.confirm → DELETE) when
   `'setting'`; advanced-JSON toggle; save → `POST /api/geo/rules {rule}`;
   400 inline (auth-config `_fail` pattern); success → refetch → posture +
   display update; change history (IncidentEventList
   `params:{category:'geofence_config'}`, `hideActivePillNames:['category']`,
   gated `sys.view_security`).
5. `GeofenceRuleForm.js` — shared FormView field defs (country mode
   select + multiselect, US-state deny multiselect, abuse toggles ×4) wired
   to `ruleToForm`/`formToRule`; used by system editor AND group section.
6. `GeofenceSimulatorView.js` — segment Location|IP; country/state selects or
   IP text; abuse toggles (geo mode); optional group (`collection` field over
   GroupList) + scope select (derived from `enforced_endpoints` scopes);
   POST `/api/geo/simulate`; decision card (allowed/blocked/exempt tones,
   REASON_TEXT sentence, `would_block` line, engine-disabled notice);
   showLoading around the call.
7. `GeofenceBlocksView.js` — activity strip on top: 2× `MetricsMiniChartWidget`
   (slugs `geofence:blocks`, `geofence:exempt` — recorded by the backend on
   every block incl. deduped ones) + `MetricsChart` blocks-over-time with
   `exportChartPng` (evidence screenshots); mirror AdminDashboardPage.js:71-95
   (widget config) and :343-362 (MetricsChart config), imports from
   `@ext/charts/index.js`. Below it, embedded TableView over IncidentEventList
   `params:{category:'geofence_block', sort:'-created'}`; columns
   created|datetime, reason (metadata.reason → REASON_TEXT), scope
   (metadata.scope), source_ip, country/region (metadata.country_code /
   region_code), level badge + rowStripe (EventTablePage:188-193 pattern);
   dayRangeFilter + country/reason/level filters;
   `hideActivePillNames:['category']`; row click → EventView (bind
   `IncidentEvent.VIEW_CLASS` defensively); emptyMessage covering "no blocks
   recorded" vs "evidence plane requires backend ≥ v1.2.42".
8. `GeofenceExemptionsView.js` — three panels: (a) CIDR allowlist list
   (reason/until/active; expired muted + badge) with add/edit/remove via
   `Modal.form` ({cidr, reason, until datetimepicker}) → full-replace
   `POST /api/geo/allowlist {entries}` (400 names the bad entry, shown
   inline); (b) per-IP whitelist rows from GET `geoip` + "Whitelist an IP…"
   (Modal.form: ip/reason/ttl|until → `GeoLocatedIP.lookup` then
   `save({whitelist:{…}})`), per-row unwhitelist (confirm →
   `save({unwhitelist:1})`), link to the IPs page; (c) bypass holders
   read-only table (username, is_active, source badge, value) + capped
   notice. Write actions gated `['sys.manage_geofence','sys.security']`.
9. `GroupGeofenceSection.js` (in `src/extensions/admin/account/groups/`) —
   GroupView section cloning GroupAuthConfigSection mechanics: fetch
   `GET /api/geo/rules?group_uuid=` (floor + group + merged); system floor
   read-only + effective result; edit group layer via shared
   GeofenceRuleForm; save `model.save({metadata:{geofence: …}})` with
   `__replace` semantics so cleared constraints actually clear;
   `_onModelChange` no-op; 400 inline + toast.

MODIFIED:
10. `src/admin.js` — import/export blocks;
    `app.registerPage('system/security/geofencing', GeofencingPage,
    {permissions:['sys.view_geofence','sys.manage_geofence','sys.security']})`;
    menu child under **Network Security** {text:'Geofencing',
    route:'?page=system/security/geofencing', icon:'bi-globe-americas',
    same permissions} (:336-341).
11. `src/extensions/admin/account/groups/GroupView.js` — import +
    `sections[]` entry {key:'Geofencing', view: GroupGeofenceSection,
    permissions: same triple} (:1292-1306).
12. `src/extensions/admin/css/admin.css` — only if custom styles needed;
    dark overrides clustered at the bottom per theming.md.
13. Docs + CHANGELOG (below).

### Design decisions
- **One composite Page + TabView, not five routed pages** — Security menu was
  just decongested (admin-menu-security-too-many-children); a single child
  under Network Security keeps it that way, and the posture header must frame
  every surface. Rejected: a new top-level menu group (menu bloat).
- **`sys.`-prefixed perm gating** — contract requires GLOBAL grants;
  `sys.<key>` skips member/group grants (GroupView `sys.groups` precedent).
  Read/write split: page+menu on the any-of triple; every write control
  additionally `['sys.manage_geofence','sys.security']`.
- **No new Models** — geo endpoints are one-off `app.rest` calls; events and
  geoip reuse existing classes. UI writes rules ONLY via `POST /api/geo/rules`
  (per Notes: the generic Settings surface bypasses validation).
- **Friendly-editor-first with `isAdvancedRule` guard** — the form is a lossy
  projection of the DSL; unrepresentable rules flip to validated
  advanced-JSON mode with a notice, never silently rewritten.
- **Replace-semantics editing** — form always submits the complete assembled
  rule (POST is full replace); no client-side merging.
- **Shared GeofenceRuleForm + geofenceData** — one rule↔form mapping to test;
  same plain language on system editor, group panel, simulator, blocks log.
- **GroupView panel as permission-gated sidebar section** (not kebab modal
  like auth-config) — compliance users must find it; discoverability wins.
- **Countries from `@ext/map/countryCentroids.js`, states hand-authored** —
  admin→map import precedent exists (GeoIPView); 51 states is trivial.
- **Endpoint scopes are deployment-defined strings, never hardcoded** (owner
  flag 2026-07-08): django-mojo core ships only `scope="auth"`; "payments"
  exists only where a product API decorates its own endpoints (mverify_api
  MVERIFY-API-014) and the deployment lists it in
  `GEOFENCE_FAIL_CLOSED_SCOPES`. The UI derives the scope set from
  `enforced_endpoints ∪ posture.fail_closed_scopes`, renders one posture chip
  per scope, and builds the simulator's endpoint-type options from the same
  set — with a small friendly-label map for known scopes (auth → "Sign-in")
  and the raw scope name as fallback. No scoped endpoints ⇒ no scope chips
  and the simulator scope select is hidden.
- **Charts: inline activity strip on the Blocks tab — no separate dashboard
  page, no popup charts** (owner direction 2026-07-08). The compliance job is
  evidence screenshots: trend + log must share one frame; popups can't be
  captured together and a second page re-bloats the Security menu. Uses the
  house widgets (MetricsMiniChartWidget/MetricsChart per AdminDashboardPage)
  over already-recorded slugs. Top blocked countries/states (slugs
  `geofence:blocks:country:*` / `:region:*`) deferred — needs slug discovery
  or a bounded slug list; builder checks the metrics API and, if cheap, adds
  a top-5 list as a fast-follow, otherwise files it separately.

### Edge cases
- Unrepresentable rule shapes (e.g. `country:{eq}`, region allow-lists) →
  advanced mode + warning; round-trip must be lossless (tested).
- Group `metadata.geofence` merges on REST write — plain saves resurrect
  deleted constraints; the group payload builder must use `__replace`
  semantics (verify exact shape against django docs; regression-test it).
- Holder of geofence perms without `view_security` → history/blocks fetches
  403: gate those subviews on `sys.view_security` and show a quiet "requires
  security-events access" note; posture header omits last-change chip.
- Backend < v1.2.42 (`/api/geo/rules` 404) → explanatory panel, not a crash.
- `enabled:false` and/or empty `enforced_endpoints` → posture must read
  clearly ("staged rules, not enforcing").
- Unknown/exotic scope strings render by raw name; empty scope set hides
  scope chips + simulator scope select (framework installs vary).
- Simulator geo-dict mode doesn't consult the allowlist (contract) — label
  results accordingly.
- Allowlist POST full-replace clobbers concurrent edits — refetch after every
  write so the UI never edits stale state.
- `bypass_holders.capped:true` → "showing first 200" notice.
- Empty change history → "No changes recorded".
- Metrics may be empty/absent (evidence plane new, or older backend) —
  KPI tiles and chart must render a quiet zero state, never break the tab;
  builder verifies the metrics `account`/`category` params against how
  `geofence:*` slugs are recorded (category "geofence", account "global").
- Both themes from day one (theming.md): decision-card tones, stripes, badges
  via Bootstrap tokens; dark overrides clustered.

### Tests needed
Unit (`npm run test:unit`; new views use trailing `export default X;` so the
test loader can instantiate them):
- `geofenceData`: `formToRule`/`ruleToForm` round-trips (country allow,
  country deny, state deny, abuse toggles, combinations); `isAdvancedRule`
  flags eq/region-allow/unknown-op shapes; `describeRule` output;
  `REASON_TEXT` covers all 15 codes + safe fallback for unknown codes.
- Group payload builder emits `__replace` semantics (removed constraints
  clear).
- Simulator request builder: `ip` XOR `geo`, optional group_uuid/scope.
Manual/Chrome verification (both themes, testing.md protocol): nav gating
with/without perms, rules round-trip incl. server-400 inline display,
simulator blocked + exempt cases, exemptions round-trip incl. expiry,
group panel merged view.

### Docs affected
- `docs/web-mojo/extensions/Admin.md` — add Geofencing to the security pages
  list + note the GroupView section.
- `CHANGELOG.md` — feature entry (public admin surface).
- No core component docs (no new primitives).

### Open questions (recommendations baked in)
1. Menu home: Network Security child (**recommended**) vs new top-level group.
2. GroupView placement: sidebar section (**recommended**) vs kebab-modal like
   auth-config.
3. Abuse-rule DSL value shape (`{abuse:{vpn:false}}`?) — builder resolves from
   the django-developer geofence doc at build start; affects only the form
   mapping, not the plan structure.
4. Mockup delivery: static HTML artifact pages, both themes (**recommended**).

## Notes

- **Build (2026-07-08)**: implemented per plan. Approved mockup (v3) committed
  to `planning/mockups/geofencing/index.html`. Verified in the examples portal
  (Vite dev + preview browser) against the live :9009 backend (unauthenticated
  → real 403s): posture loading/error/success states, dynamic scope chips incl.
  the conf-source variant, guided↔JSON editor round-trip carrying unsaved
  edits, save → real server error surfaced inline, simulator POST + decision
  cards (blocked / exempt-with-would_block / engine-off), blocks activity strip
  + table + both empty states, exemptions panels + empty states, page revisit
  lifecycle, and both themes (body `#fff` ↔ `#0a0d11`, chips/tints swap).
  NOT verifiable without credentials: authenticated 200 round-trips (rules
  save, allowlist write, per-IP whitelist) and the GroupView section against
  live group data — that logic is unit-tested; eyeball on a logged-in
  deployment at first opportunity.
- **Bugs found & fixed during browser verification**: (1) a Page `onEnter`
  override MUST call `super.onEnter()` — the isActive/_wasExited render guard
  otherwise blanks the page on every revisit; (2) `onEnter` must not await
  fetches — `showPage` renders only after `onEnter` returns, so an awaited
  call blanks the page while the API answers; (3) FormBuilder `json` fields
  return a parsed OBJECT (not a string) from `getFormData` when the content is
  valid JSON — `coerceRuleInput()` accepts both; (4) MojoMustache inverted
  sections ignore pipes (`{{^x|bool}}` renders nothing even when empty)
  despite Templates.md documenting the form — these templates use plain
  `{{^x}}`, and the framework fix is filed as a follow-up task chip.
- **Post-build security review (2026-07-08)**: two CRITICALs found and fixed —
  (1) XSS: TableView function-formatter output lands in `cell.innerHTML` raw
  and formatterless columns render triple-brace; the blocks-log and
  change-history columns now escape every request-derived field (reason,
  country/region codes, source_ip, username, title) via `MOJOUtils.escapeHtml`,
  mirroring IncidentView's source_ip pattern. (2) permission gap: the Blocks
  tab fetched incident events without the SECURITY_EVENTS_PERMS gate the Rules
  history already had — a sys.view_geofence-only user reached the event table
  UI (backend still 403s the data); the tab now gates identically with an
  explanatory placeholder. WARNING hardened: `buildGroupRulePayload` now
  ALLOWLISTS sub-keys (in/not_in/eq; the 4 abuse flags) so advanced-JSON input
  can't smuggle nested `__replace`/`protected` keys into the group metadata
  PATCH (+2 regression tests). INFO defensives applied: Modal.confirm
  interpolations of cidr/ip escaped. INFO noted, not changed: group rules
  riding the standard group REST is the established metadata pattern
  (auth_config precedent); SideNavView `_hasPermission` fails OPEN on error
  (pre-existing, framework-wide) — filed as a follow-up chip since it's the
  enforcement behind section visibility. Suite after fixes: 1285/1285.
- **Mockups gate (owner, 2026-07-08)**: visual mockups of each surface
  (posture header, system rules editor, simulator, blocks log, exemptions,
  GroupView panel) must be produced and approved **before any /build work
  starts**. The plan carries this as Phase 0 — an explicit approval gate;
  /build must refuse to start implementation while mockups are unapproved.
  - Mockup v1 delivered 2026-07-08 (single self-contained HTML, both themes,
    all six surfaces; interactive tab/surface/theme switching) — session
    scratchpad `geofencing-mockups.html`, shared in-chat. Owner: "looks
    really great." Mockup v2 same day adds the Blocks-tab activity strip
    (2 KPI tiles + blocks-over-time chart w/ PNG export) per owner ask for
    charts; separate-dashboard/popup options considered and rejected in
    Design decisions. Mockup v3 same day: owner flagged the "Payment
    endpoints fail closed" chip — default header now shows framework-truth
    (auth-only scope chips; payments demoted to a labeled MojoVerify
    deployment variant in the annotations; payments scope tags scrubbed
    from default example data). **APPROVED 2026-07-08** — owner: "build it"
    (v3). Phase 0 gate cleared; plan approved in the same message. Artifact
    hosting was down at delivery; mockup lives in session scratchpad
    `geofencing-mockups.html` (shared in-chat) — publish/commit a durable
    copy if wanted later.
- **Backend dependency SATISFIED**: django-mojo#ITEM-017 closed 2026-07-08,
  in v1.2.42. The REST contract is live and documented in
  `docs/web_developer/account/geofence.md` — build against that doc, not
  guesses. mverify_api (MVERIFY-API-014, also done) already enforces in
  prod, so this UI lands into a system with real rules and real
  `geofence_block` events to render.
- **Write path discipline**: django-mojo has a follow-up inbox item
  (`geofence settings write-validation gap`, filed from the mverify security
  review) — raw Setting writes can bypass rule validation. This UI must
  ONLY write rules through `POST /api/geo/rules` (validated), never through
  a generic Setting editor surface.
- Request refreshed 2026-07-08 against the landed backend (endpoints,
  permission keys, exemptions surface incl. allowlist/`whitelisted_until`
  — the France-devs use case; original text assumed a proposed contract).
- Product layers on top (not this item): MojoVerify portal compliance page +
  printable evidence report (mverify_portal inbox); WMX five-touchpoint
  board (wmx_api inbox `geofence-five-touchpoints-and-loader.md`).

## Resolution
- tests added: test/unit/GeofenceData.test.js (34 tests — rule↔form
  round-trips for every representable combination; isAdvancedRule detection
  (eq / multi-op / region allow-lists / non-US regions / require-flags /
  unknown keys); describeDecision covering all 15 reason codes + safe unknown
  fallback; describeWouldBlock shadow outcomes; merge-safe
  buildGroupRulePayload null-diffs incl. operator-flip staleness and
  __replace-never-emitted plus advanced-editor smuggle-drop (nested
  __replace/protected/unknown keys); buildSimulateBody ip-XOR-geo +
  is_<flag> keys; coerceRuleInput object/string/empty/invalid;
  collectScopes/scopeLabel/regionName/US_STATES data integrity —
  36 tests total after the security-review hardening)
- closed: 2026-07-08
- branch: main
- files changed: src/extensions/admin/security/geofence/{geofenceData,
  GeofenceRuleForm,GeofencePostureHeader,GeofencingPage,GeofenceRulesView,
  GeofenceSimulatorView,GeofenceBlocksView,GeofenceExemptionsView}.js (new),
  src/extensions/admin/account/groups/GroupGeofenceSection.js (new),
  src/extensions/admin/account/groups/GroupView.js, src/admin.js,
  src/extensions/admin/css/admin.css, test/unit/GeofenceData.test.js (new),
  docs/web-mojo/extensions/Admin.md, docs/web-mojo/components/SideNavView.md,
  CHANGELOG.md, planning/mockups/geofencing/index.html (approved mockup v3).
  Landed alongside (same session, own CHANGELOG entries): DataFormatter
  empty-array pipe fix + test/unit/Mustache-piped-sections.test.js; lint-glob
  fix (package.json, .eslintrc.json) + surfaced-bug fixes in
  EmailDomainTablePage, forms/inputs/index, GroupSelectorButton,
  TicketPanelView, FormView + lazy-import annotations in core.
