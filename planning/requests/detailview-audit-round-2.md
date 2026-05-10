---
status: planned
type: request
scope: src/extensions/admin · src/core/views/data
created: 2026-05-09
parent: detailview-audit-followups.md
---

# DetailView audit follow-ups, round 2 — issues raised after the round-1 build landed

The first follow-up batch ([`detailview-audit-followups.md`](detailview-audit-followups.md)) closed UserView's structural and behavioral gaps. A fresh manual walkthrough by the user against UserView, GroupView, IncidentView, ShortLinkView, FileView, and the LoginEvent model surfaced this batch.

The user has another LLM in mind to pick this up in a fresh session — capture state precisely so the next session has full context without depending on conversation memory.

## Context — what's already in place

A short reminder so the next session doesn't relitigate solved problems:

- `DetailView` + `DetailHeaderView` are the locked design language. Header is `auxFn` slot (right gutter, trusted HTML), `activeField` switch, context menu, close button. No primary buttons in the header gutter — primary actions live on `StatusPanel` or contextual section affordances; long-tail in the context menu.
- `ListView` (post-landing) supports `searchable`, `filterable`, `paginated`, `paginationMode: 'pages'|'more'|'none'`, `pageSize`, `clickAction: 'view'|fn`, `onItemClick`, `hideActivePillNames`, `toolbarButtons`, `showRefresh`, `itemTemplate`. UserView already uses these patterns.
- `FormView` with `autosaveModelField: true` drives `permissions.<perm>` dotted-key saves backed by Django's JSONField merge. UserView's Permissions section is the reference implementation.
- Mustache `{{.fieldName}}` is the leading-dot iteration item access; `{{#flag|bool}}` the boolean-cast section guard.
- The double-action-fire bug fixed in UserView came from `DetailHeaderView.onActionDefault` short-circuiting on `dest.element?.contains(target)`. That early-return was deleted. Every other DetailView consumer needs a regression check that no equivalent code path swallows actions.
- `DEFAULT_VARIANT = 'underline-all'` for `TabView`. `FormBuilder.renderTabsetField` reads from `TabView.VARIANT_CLASSES`.
- All section CSS lives in `core.css` (framework primitives) or `admin.css` (extension-specific). Inline styles in views are forbidden — see `feedback_no_inline_styles` memory.

## Items

### R1. UserView · Audit lists feel table-like and undifferentiated

**File:** `src/extensions/admin/account/users/UserView.js` — the three Audit-tab ListViews around `UserView.js:797`, `824`, `851`. Each uses `<div class="user-feed-row">` + an `itemTemplate` that lays out title / meta / timestamp in a horizontal strip.

**Symptom (paraphrased from the user):** "Hard to know where one list item ends and the next starts. Design isn't very clean — not sure what's being shown." The current rows read as table-row-without-borders. Visual rhythm is too uniform. No leading icon, no tonal eyebrow, no clear hierarchy between the primary action and its metadata.

**Expected:** modern feed-style, each item visually distinct. Reference patterns to consider:
- A leading **iconography column** (action-tone icon — green for create, blue for update, red for destroy/disable, slate for view/auth, etc.).
- Bolder primary line (the action / event description) with muted secondary line (object reference, actor, source).
- **Right-aligned relative timestamp** kept small; absolute time on hover via a `title=""` attr (or Bootstrap tooltip).
- Subtle row separator (`border-top: 1px solid var(--bs-border-color-translucent)`) instead of the current `.user-feed-row` flat treatment.
- Optional: a **tonal left-rail accent** (a 2-3px colored bar on the left edge keyed to event severity) — gives the list a "feed" feel without falling into card-stack heaviness.

**Fix candidate:** swap the `itemTemplate` for a 3-column flex layout with leading icon, title/subtitle stack, and right-aligned timestamp. Add `.user-audit-row` CSS (light + dark) in `admin.css` near the existing `.user-feed-row` block. Reuse the `levelTone` formatter that's already registered for the severity-color decision.

---

### R2. UserView · Logins should render as a timeline, not a feed

**File:** `src/extensions/admin/account/users/UserView.js` — the Logins ListView around `UserView.js:1199`.

**Symptom:** the Logins list uses the same `.user-feed-row` template as Audit, which is the wrong mental model. Login events are inherently chronological; the user reads them as "what happened in order." A timeline makes the chronology visible.

**Expected:** vertical timeline UI:
- A continuous left-rail line connecting circular nodes per event.
- Node color keyed to event success / failure / suspicious.
- Right-side card content: location chip (city · country), IP, user agent abbreviation, relative time.
- Day-grouping headers (Today, Yesterday, May 5) breaking up the timeline visually.

The framework already has a `Timeline` primitive at `src/core/views/components/Timeline.js`. It's used elsewhere (e.g. IncidentView). Either:
- (a) drive `Timeline` directly from the LoginEvent collection (reformulate the section around it), or
- (b) keep `ListView` but wrap rows with a CSS-only timeline: `::before` pseudo-element on `.user-login-row` for the rail, leading dot via `::after`. Cheap, no framework reach.

Recommendation: try (b) first. If day-grouping is desired and `ListView` doesn't support group rows yet, escalate to (a) with `Timeline`.

**Fix candidate:** new `.user-login-row` CSS block + CSS-only rail (`.user-login-row::before { content:''; position:absolute; left:1.25rem; top:0; bottom:0; width:2px; background: var(--bs-border-color); }` + a centered dot). Update the Logins `itemTemplate` to render the dot+content, drop the existing `.user-feed-row` reuse.

---

### R3. UserView · Mobile-width breaks the header layout

**File:** `src/core/views/data/DetailView.js` — `DetailHeaderView.getTemplate()` and the surrounding `core.css` rules around `.detail-header`, `.dh-aux`, `.dh-actions`.

**Symptom:** at narrow viewports (<= 480 px) the header right-gutter (`auxFn` content + active toggle + context menu trigger) wraps awkwardly. Title / subtitle on the left compete with the right gutter. Whole header becomes hard to read.

**Expected:** at narrow widths the header should stack:
- Row 1: avatar + title + subtitle (full width).
- Row 2: presence chip · Active toggle · context menu (right-aligned).
- "last active …" meta line tucked under row 2.

This is framework-level — every DetailView benefits.

**Fix candidate:** `core.css` media query `@media (max-width: 575.98px)` block under the existing `.detail-header` rules:
- `.detail-header { flex-direction: column; align-items: flex-start; gap: 0.75rem; }`
- `.detail-header .dh-aux { width: 100%; justify-content: space-between; }`
- Tighten avatar/title sizing slightly.
Eyeball every DetailView (User, Group, Incident, RuleSet, Job, Runner, Device, GeoIP, ShortLink, Member, File) at 375 px / 414 px to confirm none break. Light + dark.

---

### R4. UserView · Personal section needs row-level editing, not block

**File:** `src/extensions/admin/account/users/sections/AdminPersonalSection.js` — currently mounts a single Edit-Personal block that opens `Modal.form` covering all four fields (display name, first, last, …) at once.

**Symptom:** the user wants per-row pencil affordances that open a single-field prompt for each row, mirroring the round-1 pattern already in `AdminProfileSection` (`onActionEditDisplayName`, `onActionEditFirstName`, `onActionEditLastName`). Block-level editing makes a typo on display-name require re-confirming three fields the admin didn't touch.

**Expected:** every personal-info row gets a `<button class="detail-section-action" data-action="edit-<field>" data-bs-toggle="tooltip" title="Edit">` icon-button on the right; clicking it opens `Modal.prompt(this.model, field, label)` for that single field. Same Cancel-returns-`0` guard pattern (`typeof name === 'string' && name.trim()`) applies to every handler.

**Fix candidate:** mirror `AdminProfileSection` row-shape and handler pattern in `AdminPersonalSection`. Drop the block-edit modal entirely. ~50 lines changed.

---

### R5. Cross-DetailView regression audit — double-event bug

**Files:** every view extending `DetailView`:
- `src/extensions/admin/account/users/UserView.js` ✅ (verified)
- `src/extensions/admin/account/users/MemberView.js`
- `src/extensions/admin/account/groups/GroupView.js`
- `src/extensions/admin/account/devices/DeviceView.js`
- `src/extensions/admin/account/devices/GeoIPView.js`
- `src/extensions/admin/incidents/IncidentView.js`
- `src/extensions/admin/incidents/RuleSetView.js`
- `src/extensions/admin/jobs/JobDetailsView.js`
- `src/extensions/admin/jobs/RunnerDetailsView.js`
- `src/extensions/admin/shortlinks/ShortLinkView.js`
- `src/extensions/admin/security/IPSetView.js`
- `src/extensions/admin/security/HandlerBuilderView.js`
- `src/extensions/admin/security/BouncerSignalView.js`
- `src/extensions/admin/security/BouncerDeviceView.js`

**Symptom:** the round-1 build hit a bug where the header context menu silently no-op'd because `DetailHeaderView.onActionDefault` short-circuited on `dest.element?.contains(target)`. Fix landed; UserView verified. Every other DetailView consumer should be eyeballed for the same pattern — context menu, overflow actions, action handlers in section subclasses — to confirm no equivalent swallows still exist.

**Expected:** for each view, walk through:
- Click the kebab/overflow menu → does each item fire?
- Click any `data-action` button in a section → does it fire exactly once (not twice from a stray re-dispatch)?
- Toggle the active switch → optimistic update + revert-on-error works?

**Fix candidate:** treat as an audit task. The bug is fixed in the framework; the audit confirms there's no leftover view-specific surface that re-introduces the swallow. If found, file as a separate issue.

---

### R6. Cross-DetailView · convert cramped TableViews to ListViews

**Files:** any view that mounts a `TableView` inside a `Modal.detail`. From a quick grep, candidates include:
- `MemberView.js` — group membership tables, audit
- `GroupView.js` — member tables, audit
- `IncidentView.js` — events, related-incident lists
- `RuleSetView.js` — flow / object lists
- `DeviceView.js` — sessions, login history
- `JobDetailsView.js` / `RunnerDetailsView.js` — worker / job tables

**Symptom:** UserView found that `Modal.detail` width is the binding constraint, not column count — TableViews render cramped because the row width simply isn't enough for 5–7 columns. ListViews with feed/card item templates use the available width better and degrade more gracefully on narrow viewports.

**Expected:** for each candidate, evaluate whether the inner table conveys quick-glance info (good for ListView) or is the primary deep-dive surface (keep TableView). If the user opens the Modal.detail and immediately drills into a row, ListView wins. If they read columns side-by-side, TableView wins.

**Fix candidate:** view-by-view review. Use UserView's audit/devices/logins/groups conversion as the playbook. `paginationMode: 'pages'` + `pageSize: 5` for quick-glance, `'more'` for "scroll-while-reading" sections. Add `clickAction: 'view'` so rows open the proper detail modal automatically.

---

### R7. GroupView · header cleanup

**File:** `src/extensions/admin/account/groups/GroupView.js`

Multiple issues:

**R7.1 — Drop `Edit` and `Invite` from the header right gutter.** Already flagged as audit Item #4. `Edit` belongs in the context menu via `onActionEditGroup` opening `Modal.modelForm(this.model)` (Group.EDIT_FORM should already exist; verify). `Invite` either becomes a context-menu item OR a section affordance inside the Members section — confirm with user.

**R7.2 — `last activity` should sit below the Active switch + context menu**, not on the same horizontal line. Mirror UserView's "row 1: presence + active toggle, row 2: muted meta line" pattern from round-1.

**R7.3 — Group `kind` is rendered twice.** Once as a header pill/badge and once as a row below the group name. Pick one. Recommend keeping the pill in the auxFn slot (right gutter) and dropping the duplicate row from the subtitle / overview block. Verify the source: `_buildHeaderAux` and the subtitle string composition.

**Fix candidate:** ~20 lines in GroupView.js mirroring UserView's header structure.

---

### R8. GroupView · Identity row-level editing

**File:** `src/extensions/admin/account/groups/GroupView.js` — Identity / Personal-equivalent section.

**Symptom:** like UserView R4, currently uses block editing instead of row-level pencil affordances.

**Expected:** mirror UserView's `AdminProfileSection` row pattern — every identity row (name, slug, kind, …) gets its own pencil button → single-field prompt.

**Fix candidate:** same playbook as R4. ~50 lines.

---

### R9. IncidentView · header cleanup

**File:** `src/extensions/admin/incidents/IncidentView.js`

Multiple issues:

**R9.1 — Drop `Whitelist` and `Block` buttons from the header right gutter.** Pattern violation — primary actions belong on `StatusPanel` or contextual section affordances. Move both to either:
- `StatusPanel.actions` on the threat-summary panel, or
- the context menu, or
- the Source section as section affordances.

**R9.2 — Restore the previous header icon row.** The user remembers the old IncidentView having a wonderful row of icons in the header with tooltips that surfaced critical info at a glance (TOR / VPN / proxy / datacenter / mobile / cloud / known-attacker / blocked / whitelisted state). The current header dropped that strip. Bring it back as the auxFn slot output:
- Tonal-coded chips for flags that fired (red for known-attacker, orange for tor/vpn/proxy, neutral for mobile/datacenter/cloud) — matches GeoIPView's header chip pattern.
- Hidden flags don't render.
- Bootstrap tooltips on each chip with a one-line description.
- This complements (not duplicates) audit Item #3 which is the Source section's threat-flag grid rework — header chips give the at-a-glance read; section grid gives the full scrollable list.

**Fix candidate:** ~30-50 lines in IncidentView's `_buildHeaderAux` + `_buildHeaderActions`. Reuse the threat-tone vocabulary already established in `IncidentSourceSection`.

---

### R10. ShortLinkView · original URL display

**File:** `src/extensions/admin/shortlinks/ShortLinkView.js`

**R10.1 — Header / overview row showing the full untruncated original URL is bad UX.** Many of these URLs are 100s of characters. The full URL pushes the layout sideways and forces horizontal scrolling.

**Expected:** truncate with `text-overflow: ellipsis`, max-width: ~480px, full URL on hover (`title=""` attr or Bootstrap tooltip). Click-to-copy via the `clipboard` formatter so the admin can grab the full string.

**R10.2 — Configuration section's `Original URL` row goes off into the void.** Same root cause; the row's value column doesn't wrap.

**Expected:** `word-break: break-all` (or `overflow-wrap: anywhere`) on the `.detail-flat-row` value cell when its content is a URL. Add a `.detail-flat-row--url` modifier to opt in.

**Fix candidate:** ~10 lines CSS in `core.css` (the `.detail-flat-row--url` modifier) + template tweaks in ShortLinkView to apply the modifier where appropriate.

---

### R11. FileView · migrate to new DetailView

**File:** the file does not yet exist as a `DetailView` consumer. `src/extensions/admin/storage/` currently has `FileTablePage.js`, `FileManagerTablePage.js`, `S3BucketTablePage.js` but no `FileView.js`.

**Symptom:** the user notes `FileView` "needs updating to the new DetailView" — implying a previous file-detail surface exists somewhere outside the admin extension (or as a generic data view) and needs to be migrated to the locked DetailView design language.

**Action:** locate the existing file-detail surface (search for `Modal.data` calls on file rows in `FileTablePage.js`, plus any standalone `FileView.js` / `FilePage.js` outside admin). Build a new `src/extensions/admin/storage/FileView.js` using:
- `DetailView` base class.
- Sections: Overview (filename, type, size, MIME), Storage (bucket, path, URL), Permissions (visibility, ACL), Audit (uploads, downloads).
- Header avatar = file type icon. Subtitle = uploader + time.
- Wire `File.VIEW_CLASS = FileView` and `clickAction: 'view'` on the relevant TableViews/ListViews.

Reference: UserView, MemberView, GroupView for section structure; DeviceView for icon-led header.

---

### R12. LoginEvent · needs a view

**File:** `src/extensions/admin/models/LoginEvent.js` exists; no corresponding view.

**Action:** build `src/extensions/admin/account/login_events/LoginEventView.js` (or wherever the file structure dictates):
- `DetailView` subclass.
- Sections: Overview (who, when, success/failure, source), Source (IP, user agent, geolocation), Device (linked browser/push device if any), Audit (related events on same IP / same UA cluster).
- Wire `LoginEvent.VIEW_CLASS = LoginEventView`.
- UserView's Logins ListView (and any other LoginEvent list surface) gets `clickAction: 'view'` so rows open this detail.

This and R11 unblock R6's review of the corresponding TableView pages.

---

## Suggested order

Dependencies and risk-shape suggest:

1. **R5 — cross-DetailView regression audit** first. Cheap, surfaces any latent bug fast, quick-wins.
2. **R7 — GroupView header cleanup** + **R9 — IncidentView header cleanup**. Small, formulaic, mirror UserView round-1 patterns. Confidence-builders.
3. **R10 — ShortLinkView URL display**. Tiny CSS+template tweak. Low risk.
4. **R3 — mobile-width header polish**. Framework CSS, affects every DetailView. Land before deeper visual work so all the new layouts get tested under both widths.
5. **R1 — UserView Audit redesign** + **R2 — UserView Logins timeline**. Visual rework; user wants distinct, modern, timeline feel. Build them together so the visual vocabulary stays consistent.
6. **R4 — UserView Personal row-level editing** + **R8 — GroupView Identity row-level editing**. Same playbook, build together.
7. **R6 — cross-view table → ListView sweep**. View-by-view; can spread across multiple sessions. Treat as ongoing work after R1/R2 establish the modern list patterns.
8. **R11 — FileView migration** + **R12 — LoginEventView**. New views; size them after R6 to ensure the patterns they should follow are settled.

## Out of scope

- Anything covered in the resolved [`detailview-audit-followups.md`](detailview-audit-followups.md) round 1.
- Spec-alignment work in [`admin-users-spec-alignment.md`](admin-users-spec-alignment.md) Phases 3+ (throttle, identity-change cards, field-write protections, GroupView/MemberView spec quirks, security-events feed). That request stays paused for separate prioritization.
- Framework `Modal._renderAndAwait` dismiss-button-resolves-to-`0` patch — still tracked separately, lower priority since the caller-side guard handles it.

## See also

- [`planning/requests/detailview-audit-followups.md`](detailview-audit-followups.md) — round 1, resolved.
- [`planning/requests/admin-users-spec-alignment.md`](admin-users-spec-alignment.md) — backend spec alignment, paused.
- [`planning/requests/listview-grouped-rows.md`](listview-grouped-rows.md) — framework primitive deferred out of R2 (day-grouping headers).
- [`planning/done/detailview-design-audit.md`](../done/detailview-design-audit.md) — the original screen-by-screen audit that started this thread.
- [`planning/done/detailview-migration-rethink.md`](../done/detailview-migration-rethink.md) — the parent rethink that introduced the locked design language.

---

## Plan

### Objective

Land round-2 of the DetailView audit follow-ups: distinct visual treatment for UserView's audit/login feeds, mobile-width header polish, row-level editing parity for UserView/GroupView, header cleanups for GroupView/GeoIPView, threat-flag header chips on IncidentView, ShortLinkView URL truncation, two new DetailView consumers (FileView migration + LoginEventView), plus two cross-DetailView audits (regression check, table-to-list sweep).

### Steps

#### R1. UserView · Audit feed redesign — `src/extensions/admin/account/users/UserView.js` (lines 787–875) + `src/extensions/admin/css/admin.css`

- Replace the three `user-feed-row` `itemTemplate` strings (Activity ~L797, Events ~L824, Audit Log ~L851) with a 3-column flex layout:
  ```
  [tonal icon column]  [primary line + muted secondary line]  [right-aligned relative time]
  ```
- Reuse the existing `levelTone` formatter for severity → tone mapping; pick icon per `level` (`bi-pencil-square` for update/info, `bi-exclamation-triangle` for warning, `bi-shield-x` for error/critical, `bi-eye` for view/auth). Wrap the existing `{{model.created|datetime}}` text into a `title="…"` attr; use `{{model.created|relative}}` as the visible value.
- Add `.user-audit-row` CSS in `admin.css` immediately after the existing `.user-feed-row` block (line ~3008): leading-icon column, bolder primary line, muted secondary line, right-aligned timestamp, tonal left-rail accent (`border-left: 3px solid var(--bs-tone-color)`), separator via `border-top: 1px solid var(--bs-border-color-translucent)` so the last row has no extra border. Mirror the existing `[data-bs-theme="dark"]` companion block.
- Leave the Logins ListView's `user-feed-row` reuse alone — R2 replaces it.

#### R2. UserView · Logins timeline — `src/extensions/admin/account/users/UserView.js:1189–1214` + `admin.css`

- Replace the Logins `itemTemplate` with a `.user-login-row` template: leading dot column (`<span class="login-dot login-dot-{{toneClass}}"></span>`), main content column (city · country, IP `<code>`, user-agent abbreviation), right-aligned `{{model.created|relative}}`. Compute `toneClass` via a small helper (`success_login` → `success`, `failed_login` → `danger`, `mfa_required`/`suspicious` → `warning`, default `secondary`).
- Add `.user-login-row` CSS in `admin.css` adjacent to `.user-feed-row`: `position: relative; padding-left: 2.25rem;`, `::before` pseudo-element for the continuous rail (`left: 1.1rem; top: 0; bottom: 0; width: 2px; background: var(--bs-border-color);`), `.login-dot` absolutely positioned at `left: 0.6rem` with tone-keyed background using `var(--bs-success)` / `--bs-danger` / `--bs-warning` / `--bs-secondary`. Dark-theme rail uses `var(--bs-border-color-translucent)`.
- **Day-grouping headers are out of scope** — no group-row API on `ListView` today. Filed as standalone framework request in [`listview-grouped-rows.md`](listview-grouped-rows.md). Once that primitive lands, R2 reopens with a one-liner `groupBy` addition; the CSS-only rail from this round stays as-is.

#### R3. Mobile header polish — `src/core/css/core.css` (lines 3118–3145, the existing `.detail-header` block + the `@media (max-width: 540px)` block at L3135)

- Tighten the existing 540px breakpoint and broaden it to `@media (max-width: 575.98px)` (Bootstrap `sm` breakpoint), so the stacked layout kicks in across iPhone-class widths. The current rule already drops `.dh-actions` to static + zeros `.dh-meta` padding-right; extend it to:
  - `.detail-header { flex-direction: column; align-items: flex-start; gap: 0.75rem; }`
  - `.detail-header .dh-aux { width: 100%; justify-content: space-between; align-items: flex-start; }`
  - `.detail-header .dh-aux .dh-aux-top { flex-wrap: wrap; gap: 0.5rem; row-gap: 0.25rem; }`
  - Reduce `.dh-icon` to `width:36px; height:36px; font-size:1.1rem;`
  - Reduce `.dh-name` to `font-size: 1.1rem;`
- No JS changes; pure CSS. Verify across UserView, GroupView, IncidentView, RuleSetView, JobDetailsView, RunnerDetailsView, DeviceView, GeoIPView, ShortLinkView, MemberView, FileView at 375 px and 414 px in both themes.

#### R4. UserView · AdminPersonalSection row-level editing — `src/extensions/admin/account/users/sections/AdminPersonalSection.js`

- This file already implements per-row pencils for Display / First / Last / DOB / Timezone / Address (verified — `onActionEditDisplayName`, `onActionEditFirstName`, `onActionEditLastName`, `onActionEditDob`, `onActionEditTimezone`, `onActionEditAddress` are present at lines 154–254). **R4 is effectively done in code.** The remaining gap is whatever block-edit affordance the user is observing.
- Audit pass: confirm there is no surviving "Edit Personal" block-form button in either AdminPersonalSection's template OR the UserView header context menu / actions. If found, delete it. If clean, mark R4 resolved without code changes.

#### R5. Cross-DetailView regression audit — read-only sweep across all 14 listed DetailView consumers

- For each file, `grep -n "onActionDefault\|dest.element\|contains(target)\|stopPropagation"` to confirm no view-specific re-introduction of the round-1 swallow pattern.
- For each file with a context menu config, sanity-walk the action list against the handlers (action strings on context items must each have a matching `onActionXxx` somewhere in the file — view, section, or framework default).
- No code changes expected. Findings either (a) file a separate issue for any view that needs a fix, or (b) tick R5 as clean. Output a one-paragraph audit summary in this request file's `## Audit Findings` block before close.

#### R6. Cross-DetailView TableView → ListView sweep — view-by-view review of MemberView.js, GroupView.js, IncidentView.js, RuleSetView.js, DeviceView.js, JobDetailsView.js, RunnerDetailsView.js

- Per view, classify each in-modal `TableView` as either *quick-glance* (convert to ListView with feed/card itemTemplate, `paginationMode: 'pages'`, `pageSize: 5`, `clickAction: 'view'`) or *primary-deep-dive* (keep TableView).
- **Out of scope for this round:** the actual conversions — only the inventory + classification. Treat R6 as planning output that lands as a follow-up request file `planning/requests/detailview-listview-sweep.md` with the per-view decisions. The user can prioritize the conversions individually.

#### R7. GroupView header cleanup — `src/extensions/admin/account/groups/GroupView.js:799-806` + `_buildHeaderAux` at L1051

- **R7.1**: Remove `Invite` and `Edit` action buttons from `header.actions` (line 799–802). `Edit` is already on the context menu via `onActionEditGroup`. Add `Invite` to the context menu items list (~L774) above the `Add Sub-Group` entry. The existing `onActionInviteMember` handler stays as-is.
- **R7.2**: `last_activity` display already lives inside the auxFn (line 1051–1074) returning the `dh-aux-presence` + `dh-aux-meta` two-row block, which renders below the active toggle. Verify visually against UserView's two-row aux pattern; no code change expected if it already mirrors UserView.
- **R7.3**: Group `kind` is currently in two places — header chip (line 747) and Identity section's Profile row (line 358–363) and Overview section row (line 102–107). The header chip carries the kind icon-tone tie-in via `iconForKind`, so keep it. Remove the Overview's `Kind` flat-row (lines 101–107) since the chip already conveys this above. Identity section's Kind row stays — that's the dedicated identity surface.
- After R7.1 changes, header config becomes `actions: []` mirroring UserView.

#### R8. GroupView Identity row-level editing — `src/extensions/admin/account/groups/GroupView.js:347–483` (`GroupIdentitySection`)

- The current Identity section is read-only (no `data-action` attributes on rows). Add per-row pencil affordances mirroring `AdminProfileSection`:
  - Profile rows: Name, Kind, Status (read-only, status flipped via header toggle), Parent (read-only, link-only)
  - Settings rows: Timezone, EOD hour, Domain, Portal, Email template
- Add `<div class="detail-flat-row-action">` cells with `data-action="edit-name"` / `edit-kind` / `edit-timezone` / `edit-eod-hour` / `edit-domain` / `edit-portal` / `edit-email-template` buttons.
- Add the matching `onActionEditXxx` handlers on `GroupIdentitySection` using `Modal.prompt` (single-string fields) or `Modal.form` (kind dropdown + EOD-hour numeric + email-template select). Save via `model.save({...})` through the same `_saveField` pattern AdminProfileSection uses.
- Kind options come from `Group.GroupKinds` (already imported). EOD hour is integer 0–23.
- Empty-row affordance: when a Settings field is unset, show "Not set" placeholder (Mustache handles via `{{^hasXxx|bool}}…{{/hasXxx|bool}}`); the pencil button is always present, opens a prompt with empty default.

#### R9. Header cleanup for GeoIPView (R9.1) + IncidentView threat-flag chips (R9.2)

##### R9.1 — GeoIPView · drop `Block` / `Whitelist` / `Refresh geo` from header gutter — `src/extensions/admin/account/devices/GeoIPView.js:902-906`

The header config defines `headerActions` with three `dh-action` ghost buttons. All three duplicate primary surfaces:

| Action | Header gutter | StatusPanel | Section affordance | Context menu |
|---|---|---|---|---|
| Block | ✓ (L903) | ✓ (L306) | ✓ (L556) | ✓ (L917) |
| Whitelist | ✓ (L904) | ✓ (L311) | ✓ (L597) | ✓ (L919) |
| Refresh geo | ✓ (L905) | — | — | ✓ (L909) |

Pattern violation per the locked design language — primary actions belong on `StatusPanel` or section affordances, long-tail in the context menu, never in the header right gutter.

**Fix:** delete the `headerActions` array (lines 902–906) and pass `actions: []` in the header config (line 935). Refresh geo stays in the context menu where it already lives. Block/Whitelist users now flow through the StatusPanel (the natural primary surface for active-status records) or the dedicated Block & Whitelist section's eyebrow pencils. ~5 lines removed.

##### R9.2 — IncidentView · restore the threat-flag header chip strip — `src/extensions/admin/incidents/IncidentView.js:1711-1734`

Current chips are priority/status/category/scope/hostname/event-count/protected. Add tonal threat-flag chips driven by the source IP's geo data — TOR / VPN / Proxy / Datacenter / Mobile / Cloud / Known attacker / Blocked / Whitelisted.

The geo data is fetched async by `IncidentSourceSection`. Two paths:

- (i) If the backend echoes the flags onto `incident.metadata.source_geo`, drive the chips' `when:` callbacks directly off the model. Verify by checking `src/extensions/admin/models/Incident.js` for what's plumbed through.
- (ii) Otherwise, in `IncidentView.onAfterBuild`, fire `GeoLocatedIP.lookup(sourceIP)` (already done by `IncidentSourceSection` — share the result), stash on `this._sourceGeo`, then trigger a header re-render. Chips' `when:` callbacks read `this._sourceGeo` instead of the model.

Re-use GeoIPView's chip variants verbatim: `bi-shield-lock` Tor → danger, `bi-shield-shaded` VPN → warning, `bi-diagram-3` Proxy → warning, `bi-hdd-stack` Datacenter → warning, `bi-cloud-fill` Cloud → info, `bi-phone` Mobile → light, `bi-bug-fill` Known attacker → danger, `bi-slash-circle` Blocked → danger, `bi-shield-check` Whitelisted → success.

**Optional framework primitive change** (recommended): extend `DetailHeaderView._buildTemplate` chip rendering at `src/core/views/data/DetailView.js:169-172` to honor `chip.tooltip` and emit `data-bs-toggle="tooltip" title="…"`. `enableTooltips: true` is already on at `DetailView.js:105`, so Bootstrap tooltips auto-init. Document on `docs/web-mojo/components/DetailView.md`. ~4 lines added; purely additive — no existing consumer passes `chip.tooltip`.

#### R10. ShortLinkView URL display — `src/extensions/admin/shortlinks/ShortLinkView.js:273-278` (Configuration section) + `src/core/css/core.css`

- Configuration section already has `text-truncate` on `Original URL` row (line 274). Verify visually under Modal.detail width — if it's still overflowing, add an explicit `max-width` on the value cell and a Bootstrap tooltip (`data-bs-toggle="tooltip" title="{{model.url}}"`) to surface the full URL on hover.
- Add a new CSS modifier `.detail-flat-row-value--url { word-break: break-all; max-width: 480px; }` in `core.css` near the existing `.detail-flat-row-value` rules (~L2937). Use it in `<div class="detail-flat-row-value detail-flat-row-value--url text-truncate">`.
- Wrap the URL in the Configuration's value cell in a `clipboard` pipe (`{{{model.url|clipboard}}}`) so admins can copy without selecting — DataFormatter has the formatter already.
- Header-level untruncated URL: ShortLinkView's title is the short URL, not the destination — verified at line 667 (`titleFn: m => m.get('short_link') || …`). Subtitle `→ ${url}` (line 668-671) is the destination URL, which is what gets long. Update the `subtitleFn` to truncate at ~80 chars with ellipsis, and rely on the row in the Configuration section for the click-to-copy full version.

#### R11. FileView migration to DetailView — `src/core/views/data/FileView.js` (existing, ~600 lines)

- This file already exists and has its own header + SideNavView assembly. Refactor it to extend `DetailView`:
  - Replace the View-based shell with `class FileView extends DetailView`.
  - Keep the existing section classes (`FilePreviewSection`, `FileDetailsSection`, `FileRenditionsSection`, `FileMetadataSection`) as-is — they slot directly into the `sections: []` config.
  - Move the existing header markup into a `header: { icon, iconToneFn, titleField: 'name', subtitleFn, chips, contextMenu }` config. Header icon comes from `getCategoryConfig(model).icon`.
  - Existing context-menu actions (View / Download / Edit / Make Public/Private / Copy URL / Delete) move into `header.contextMenu.items`.
  - Drop the parallel `parent.element` workaround comment block (line 60–62) — DetailHeaderView's re-dispatch now lives in framework code.
- Wire `File.VIEW_CLASS = FileView` (already done if existing, else add). Confirm `FileTablePage.js` `clickAction: 'view'` triggers it.
- **Keep the file in core**, not admin/storage — `File` is a core model, and the viewer is generic. The request hinted at admin/storage but core is the cleaner home and matches the model.

#### R12. LoginEventView — new file `src/extensions/admin/account/login_events/LoginEventView.js`

- New `DetailView` subclass following UserView/MemberView shape:
  - Header: `bi-box-arrow-in-right` icon, title = "Login from `{{ip_address}}`", subtitle = `{{user.display_name}} · {{model.created|datetime}}`. Tone via `iconToneFn` keyed on `event_type` (success → primary, failure → danger, suspicious → warning).
  - Chips: source (`{{model.source}}`), `bi-flag {{model.country_code}}`, MFA badge if `requires_mfa`, suspicious badge if `is_suspicious`.
  - Active toggle: none.
  - Sections: `Overview` (KPIs: success/failure, source, country, ASN), `Source` (IP + GeoIP — reuse the GeoIPView pattern's section-level layout), `Device` (linked browser/push device if any), `Audit` (related events on same IP / same user-agent — `LogList` filtered by `ip_address`).
- Wire `LoginEvent.VIEW_CLASS = LoginEventView` at the bottom of the new view file (matches `UserView.VIEW_CLASS = UserView` at `UserView.js:end`).
- After this lands, set `clickAction: 'view'` on UserView's Logins ListView (line 1196 already has it — confirm `viewDialogOptions: { header: false, noBodyPadding: true, buttons: [] }` is added once VIEW_CLASS is wired).

### Design Decisions

- **Reuse the existing CSS primitives**: `.detail-section-eyebrow`, `.detail-flat-row*`, `dh-aux*`, `snv-*` are the locked vocabulary. New row patterns (`.user-audit-row`, `.user-login-row`, `.detail-flat-row-value--url`) are component-local and live next to their existing siblings, with matching dark-theme overrides. **No inline styles in views.**
- **Framework changes are scoped and additive.** Only one optional change (chip `tooltip` support in `DetailHeaderView`, R9.2) — existing consumers unaffected. The day-grouping primitive is a separate request, not bundled here.
- **R6 is a planning artifact, not a build artifact**: the per-view inventory belongs in a follow-up request file. Trying to convert all of them in one pass would balloon the PR and miss the point of "view-by-view review."
- **R5 + R6 produce text deliverables, not code.** Treat as audit tasks; their output is appended to this request file under a `## Audit Findings` section before close.
- **FileView stays in core** — File is a core model, no admin-specific needs.
- **Mobile breakpoint moves to `575.98px`** (Bootstrap `sm`) — header reflow should match the framework's responsive grain.

### Edge Cases

- **R1 / R2 visual rework**: Modal.detail width is the binding constraint; verify under both `sm`-breakpoint stacking (R3 must land first) and the default `lg` modal width.
- **R2 tone resolution**: LoginEvent's success/failure field name varies by backend — look for `event_type`, `is_success`, or `status` before assuming. Default to `secondary` tone for unknown values.
- **R3 across all 11 DetailView consumers**: a few have unusually long titles (RuleSet names, JobDetails titles) that must wrap not truncate at sm widths — `.dh-name` should not gain a `text-overflow: ellipsis` even when stacked.
- **R5 audit**: the Wave-1 swallow bug came from `dest.element?.contains(target)` short-circuiting in `DetailHeaderView.onActionDefault`. The framework fix removed it; section subclasses can re-introduce equivalents. Specifically scan section-level `onActionDefault` overrides.
- **R7.3 kind dedupe**: confirm the Overview Kind row remove doesn't break any badge KPI logic (it doesn't — chip and Identity row carry it).
- **R8 GroupIdentitySection edits**: timezone field today is read-only string; an unconstrained text prompt risks invalid IANA names. Use the same select option list AdminPersonalSection uses for timezone (lines 213–226) — copy the array verbatim into a shared module if duplication grows beyond two callers.
- **R9.1 GeoIPView**: the StatusPanel's `_statusActions` already covers Block/Whitelist for active-status records, but the StatusPanel may not be visually present for all states. Verify Block/Whitelist remain reachable from at least one always-visible surface (the GeoIPBlockSection's eyebrow buttons — yes, they always render).
- **R9.2 chip `tooltip` framework change**: existing consumers don't pass `chip.tooltip`, so behavior is purely additive. Bootstrap tooltip auto-init is gated by `enableTooltips: true` on `DetailHeaderView` (already on). Confirm by adding one to a UserView chip and watching for double-init warnings.
- **R11 FileView refactor**: existing file has its own context-menu mounting in `onAfterRender` (parallels DetailHeaderView). Removing the duplicated mount is the migration's main risk — confirm the section views still receive their action events through the `parent` chain that DetailView wires.
- **R12 LoginEventView**: opens recursively (LoginEvent → User → … → LoginEvent). Modal.detail stacking already used elsewhere (GroupView opens nested GroupView). No new framework risk.

### Testing

- `npm run lint` after each item; any framework change runs `npm run test:unit`.
- After R3 (mobile header CSS), spot-check at 375 px / 414 px in both themes, with each of the 11 DetailView consumers loaded via the example portal.
- After R1 / R2, screenshot the new feed/timeline rows in both themes and confirm separator visibility, tonal accents, and right-aligned timestamp alignment.
- After R8, exercise each new pencil → prompt → save round-trip; confirm Cancel returns the dialog without firing a save (the AdminPersonalSection guard `typeof name === 'string' && name.trim()` is the reference).
- After R9.1, confirm the GeoIPView header right gutter is empty (just the active-toggle placeholder + group separator + context menu + close) and that Block/Whitelist remain reachable via StatusPanel + Block section + context menu.
- After R9.2 (if the framework chip-tooltip change lands), confirm Bootstrap tooltips render under both themes and dispose when the modal closes.
- After R11, exercise FileTablePage row click → FileView modal → context-menu actions → close.
- After R12, exercise UserView Logins row click → LoginEventView modal.
- **No automated tests required** — these are visual / behavioral changes to view assembly, well below the framework-primitive bar that warrants a unit test.

### Docs Impact

- `docs/web-mojo/components/DetailView.md` — document the new optional `chip.tooltip` field if R9.2 lands the framework change.
- `CHANGELOG.md` — add a "DetailView audit follow-ups round 2" entry summarizing: UserView audit/login row redesign, mobile header reflow at sm-breakpoint, GroupView identity row-level edits, GeoIPView header gutter cleanup, IncidentView threat-flag header chips, ShortLinkView URL truncation, FileView migration to DetailView, new LoginEventView. One short line each.
- No other doc updates required — the rest are view-internal changes.

### Suggested order

Land in this order to surface integration risk early and keep the visual vocabulary consistent:

1. **R5 — regression audit** (read-only, no code)
2. **R7 — GroupView header** + **R9.1 — GeoIPView header gutter cleanup** (small, formulaic)
3. **R10 — ShortLinkView URL** (small CSS+template tweak)
4. **R3 — mobile header polish** (framework CSS, lands before deeper visual work)
5. **R1 — UserView Audit redesign** + **R2 — UserView Logins timeline** (visual rework, build together)
6. **R4 — UserView Personal verify** + **R8 — GroupView Identity row edits** (mirror playbook)
7. **R9.2 — IncidentView threat-flag chips** (optional framework chip-tooltip primitive)
8. **R6 — table → list sweep planning artifact** (text deliverable, not code)
9. **R11 — FileView migration** + **R12 — LoginEventView** (new DetailView consumers, follow established patterns)

## Audit Findings

### R5 — Cross-DetailView regression audit (2026-05-09)

Swept all 14 DetailView consumers for the round-1 swallow pattern (`onActionDefault` short-circuiting on `dest.element?.contains(target)`):

`UserView.js`, `MemberView.js`, `GroupView.js`, `DeviceView.js`, `GeoIPView.js`, `IncidentView.js`, `RuleSetView.js`, `JobDetailsView.js`, `RunnerDetailsView.js`, `ShortLinkView.js`, `IPSetView.js`, `HandlerBuilderView.js`, `BouncerSignalView.js`, `BouncerDeviceView.js`.

The only match for `onActionDefault|dest.element|contains(target)|stopPropagation` across all 14 files is `GroupView.js:915` — a standard `event.stopPropagation()` inside `onActionInviteMember` for the (now-removed) header Invite button. That's intentional event handling, not the swallow pattern.

**Result: clean.** No view-specific surface re-introduces the round-1 bug. R5 closed without code changes.
