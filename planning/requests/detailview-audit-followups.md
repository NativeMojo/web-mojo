---
status: planned
type: request
scope: src/extensions/admin · src/core/utils
created: 2026-05-09
parent: detailview-design-audit.md
---

# DetailView audit follow-ups — structural issues flagged during the polish pass

The screen-by-screen design audit (see [`planning/done/detailview-design-audit.md`](../done/detailview-design-audit.md)) was strict polish only — CSS and template tweaks against the locked design language. The auditor correctly stayed in lane and flagged six structural / behavioral issues that warrant their own work. This request collects them.

Have the user manually go through each screen to add issues to this request as he has stated there are many.

## Items

### 1. UserView · OAuth section renders empty

**File:** `src/extensions/admin/account/users/UserView.js` (or wherever the OAuth section view is wired)

**Symptom:** clicking the **OAuth Accounts** entry in the side rail produces a blank section — no `.detail-section-eyebrow`, no flat rows, no empty-state placeholder. By comparison the `Personal` and `Security` sections show their headers + content even when empty.

**Expected:** even with zero linked OAuth providers, the section should render:
- A `.detail-section-eyebrow` ("LINKED ACCOUNTS" or similar)
- One of:
  - the muted "No linked accounts" placeholder pattern (matches `AdminConnectedSection.js`'s empty state), OR
  - if the section was intentionally pulled out of `UserProfileSection`, restore an explicit `UserOAuthSection` view that mounts `AdminConnectedSection` (the existing standalone OAuth section view).

**Fix candidate:** ~10–20 lines in UserView. Either delete the empty-section sidebar entry, or wire up a real section view (preferred — the OAuth fetch already exists in `UserProfileSection`).

---

### 2. UserView · Devices section opens the generic Item inspector

**File:** `src/extensions/admin/account/users/UserView.js` — `UserDevicesSection` TableView config.

**Symptom:** clicking a device row in the unified Browser/Push table opens the framework's default `Modal.data({ title: 'View Item #b:NNN', ... })` modal (raw fields, unformatted epoch dates) instead of opening `DeviceView` in a `Modal.detail`.

**Root cause:** one of the two:
- `UserDevicesSection`'s TableView doesn't set `clickAction: 'view'` (so TablePage falls through to `Modal.data`).
- OR `BrowserDevice.VIEW_CLASS` isn't pointing at `DeviceView` (so even with `clickAction: 'view'`, the dispatcher can't find the view class).

**Expected:** clicking either a browser device row or a push device row opens the relevant detail view at `lg` width, with the standard flat-row layout.

**Fix candidate:** verify `clickAction: 'view'` on the TableView config in `UserDevicesSection` AND verify `UserDevice.VIEW_CLASS = DeviceView` (and `PushDevice.VIEW_CLASS = …` if push has its own detail view).

---

### 3. IncidentView · Source section threat-flag grid feels scattered

**File:** `src/extensions/admin/incidents/IncidentView.js` — `IncidentSourceSection`'s threat-flag block.

**Symptom:** the "TOR / VPN / PROXY / DATACENTER / MOBILE / CLOUD / KNOWN ATTACKER / BLOCKED / WHITELISTED" rows render as a dense vertical stack of label/❌ rows. Visually scattered; doesn't match the rest of the section's flat-row rhythm. Feels like a `KnownFieldsCard` falling through to its raw-blob rendering rather than the structured threat-chip strip the rethink mockup envisioned.

**Expected:** either
- (a) a tight horizontal strip of tone-coded chips (only flags that fired, with negative flags hidden — matches the GeoIPView header chip pattern), OR
- (b) two columns of `.detail-flat-row`s with the matching threat-tone badge instead of ❌/✓ icons.

**Fix candidate:** restructure the threat-flag rendering to follow GeoIPView's header-chip approach (Wave 3 C5 already solved this for GeoIPView) — promote truthy flags to a chip strip, drop falsy ones. Likely 30–60 lines in `IncidentSourceSection`.

---

### 4. GroupView · header buttons louder than other views

**File:** `src/extensions/admin/account/groups/GroupView.js` — header `actions:[]` config.

**Symptom:** the `Edit` and `Invite` buttons in the GroupView header render at full Bootstrap btn-sm size with primary fills — louder than the other rethink-9 views which only have `auxFn` + the active toggle + context menu in the header right gutter.

**Expected:** consistent with the other DetailView headers — primary action(s) live on a StatusPanel or contextual section affordance; long-tail actions live in the context menu. The header right gutter stays quiet.

**Fix candidate:** move `Edit` and `Invite` to the context menu; if either is genuinely high-frequency for groups, keep one as a single ghost-styled `.dh-action` instead of a primary button.

---

### 5. UserView · `Joined` row is empty

**File:** `src/extensions/admin/account/users/UserView.js` — `UserProfileSection` (or wherever the Account subsection is wired).

**Symptom:** the `Joined` row in the Profile section's Account subsection renders as empty — no date, no fallback `—`.

**Root cause:** template binds to a non-existent field. The User model carries `created` (or `created_on` / `date_joined`); the template uses something like `{{model.joined}}`.

**Expected:** the row shows the user's created/joined date formatted via DataFormatter pipe (e.g. `{{model.created|datetime}}` or `{{model.date_joined|date}}`), with `|default:'—'` fallback.

**Fix candidate:** one-line template fix once you confirm the actual model field name. Look at `Member.created` for the convention — likely `model.date_joined` or `model.created`.

---

### 6. Migrate 17 call sites off the alt `dataFormatter.apply(value, [...])` signature

**File:** the design audit added a compat branch in `src/core/utils/DataFormatter.js`'s `apply()` to handle the alt signature `apply(value, [pipeNames])`. 17 call sites in `UserView.js`, `GroupView.js`, `MemberView.js` (and possibly a few others) use that form.

**Tech debt:** the compat branch works, but the documented signature is `apply(name, value, ...args)`. Long-term we want to:
- Migrate every alt-signature call site to either `dataFormatter.pipe(value, 'relative')` (multi-pipe) or `dataFormatter.apply('relative', value)` (single).
- Remove the compat branch from `apply()`.

**Fix candidate:** one targeted grep + sed-style migration pass. Roughly:
```
grep -rn "dataFormatter\.apply(.*\[" src/extensions/admin/
```
Each match → swap to the canonical form. Run `npm run test:unit` after — the 824/834+ tests cover the hot paths.

After all call sites migrate, delete the compat branch. Add a doc note in `docs/web-mojo/core/DataFormatter.md` calling out the canonical signatures.

---

## Suggested order

If addressed individually, recommended order:

1. **#5 (Joined row)** — one-line bug fix, immediate user-visible value. Do first.
2. **#2 (Devices clickAction)** — small wiring fix, restores the proper DeviceView modal flow.
3. **#1 (OAuth empty section)** — small fix, removes a visible "is this broken?" surface.
4. **#4 (GroupView header buttons)** — design polish, ~30 minutes.
5. **#6 (DataFormatter alt-API)** — tech debt cleanup, batchable, no UI impact.
6. **#3 (IncidentView Source threat-grid)** — biggest of the six, structural rework, save for last.

---

## UserView — additional issues (added 2026-05-09)

After the auditor's six items, manual walkthrough of UserView surfaced these. Scope of the immediate Plan section below narrows to **UserView only** (items 1, 2, 5 from the original list plus everything below); the remaining audit items (#3 IncidentView, #4 GroupView, GroupView/MemberView portion of #6) move to the **Deferred** section after the Plan.

### U1. Header right gutter — wrong layout

**File:** `src/extensions/admin/account/users/UserView.js` — `_buildHeaderAux` (line 1858) + the header config's `activeField: 'is_active'` (line 1384).

**Symptom:** Currently the `auxFn` outputs `[🟢 Online] / [active 4m ago]` stacked vertically, then the framework appends the `Active/Inactive` switch as a sibling on the same horizontal line as the presence dot. End result reads as three loose elements with no relationship: `Online` | `Active toggle` | (and meta line tucked under).

**Expected:** top line shows presence (`🟢 Online`) and the active-state toggle side-by-side with generous space between them; the muted "last active 4m ago" sits on its own line below both.

**Root cause:** the framework's DetailHeaderView puts `auxHtml` and `switchHtml` as inline siblings; we can't reshape the layout without either touching the framework (out of scope) or moving the active-toggle INTO the auxFn output.

### U2. Email click should copy, not open mail client

**File:** `UserView.js` — every place email is rendered as `<a href="mailto:{{model.email}}">{{model.email}}</a>` (Overview line 141, subtitle, etc.).

**Symptom:** clicking the email opens the OS mail app — almost never what the admin wants. Admin wants to copy the email to paste into another tool.

**Expected:** click-to-copy. The framework already has the `clipboard` formatter (`src/core/utils/DataFormatter.js:175`) and a built-in `onActionCopyToClipboard` handler in View base (`src/core/View.js:822`). Use them.

### U3. Profile sections — too much vertical space

**File:** `src/core/css/core.css` — `.detail-flat-row` (line 2651, padding `0.85rem 0`) and `.detail-section-eyebrow:not(:first-child)` (line 2631, margin-top `2rem`).

**Symptom:** rows are too tall and section eyebrows have too much air above them. Hard to scan; wastes vertical space.

**Expected:** keep the visual cluster grouping (eyebrow + its rows) but tighten everything ~30 %. Group separation should still read clearly — just less wasteful.

### U4. Tooltips — Bootstrap-instant, not native delay

**File:** `UserView.js` headers + `AdminPersonalSection.js` action buttons (e.g. `<button class="detail-section-action" data-action="edit-display-name" title="Edit">`).

**Symptom:** every `<button>` uses plain `title="..."` which gets the OS native delayed tooltip. Hover delay is ~1 s.

**Expected:** Bootstrap tooltips with `data-bs-toggle="tooltip"` so the framework's `enableTooltips` view option (`View.js:41`) initializes them — instant + themed.

### U5. Bug — `edit-display-name` throws `TypeError: name.trim is not a function`

**File:** `src/extensions/admin/account/users/sections/AdminPersonalSection.js:159`.

**Symptom:**
```
TypeError: name.trim is not a function
    at AdminPersonalSection.onActionEditDisplayName (AdminPersonalSection.js:159:35)
```

**Root cause:** `Modal.prompt(...)` returns the **action string `'ok'`** when the input is intercepted ambiguously, **`null`** when dismissed via X / backdrop, **`""`** (empty string) when OK is clicked with empty input, and — critically — **`0`** when the **Cancel** button is clicked, because `Modal._renderAndAwait` falls through to the "no handler" branch with `defaultValue = cfg.action ?? index = 0` for buttons that have `dismiss: true` and no `action` (`Modal.js:155-156`). The caller's guard `if (name !== null && name.trim())` lets `name === 0` slip past the null check, then `0.trim()` throws.

The same `if (name !== null) { ... name.trim() }` shape exists in `onActionEditFirstName` (line 171), `onActionEditLastName` (line 183) — same crash on Cancel.

**Two-part fix:**
- **Caller (this request):** swap `name !== null` → `typeof name === 'string'` in all three handlers (lines 159, 171, 183).
- **Framework (separate follow-up):** make `_renderAndAwait` resolve dismiss-buttons with `null`, not the index. Tracked as a separate item, see Deferred below.

### U6. OAuth section is blank

**File:** `src/extensions/admin/account/users/sections/AdminConnectedSection.js`.

Already covered by audit Item #1 (missing `.detail-section-eyebrow`). Confirmed during this walkthrough — fix is the same one-line addition.

### U7. Permissions section is broken

**File:** `UserView.js` — `PermissionsTabBody` class (lines ~540-682) and `_renderGroup` (line 620).

**Symptoms:**
- The Advanced tab renders permissions one-per-row → endless scroll. It used to be 2-per-row.
- Clicking the **label text** of a switch does **not** toggle the switch. UX bug. The current markup (line 622-642) renders the label as a sibling `<div class="detail-perm-name">` rather than as `<label class="form-check-label" for="<id>">`, so the standard Bootstrap label-clicks-toggle behavior is broken.
- The user wants the FormView feel — toggle a switch and it auto-saves with a status indicator. Currently the bespoke `onActionTogglePerm` (line 661) does save but without FormView's batch-save + per-field status + revert-on-error UX.

**Root cause:** Permissions data is a flat `{ perm_name: true }` object on the model. FormView's native `autosaveModelField: true` would PUT `{ "permissions.x": true }` (literal dotted key) which the API doesn't understand — so we can't drop FormView in unmodified for the data layer. But we CAN copy FormView's switch markup pattern (`form-check form-switch` with `<label for="<id>">`) and 2-col grid to fix the visible UX, while keeping the existing `onActionTogglePerm` handler for the data layer.

**Expected:**
- Each row: `<label class="form-check-label" for="<id>">{label}</label>` properly tied to the input by `id`/`for` so clicking the label toggles.
- Advanced tab: 2-column CSS grid (1-column on Common since the category list is short).
- Optional polish: per-row "saving / saved / error" badge (FormView's status-manager pattern) so the toggle visibly confirms the save round-trip. Achievable as a small inline `<span>` next to the switch flipped on the existing `onActionTogglePerm` handler — no FormView dependency.

### U8. Audit tab labels — "Incidents" is wrong

**File:** `UserView.js` — `UserAuditSection.onInit` (line 894), specifically the `tabs:` block at line 962-966.

**Symptom:** the second tab is labeled "Incidents" but its `eventsCollection` is `IncidentEventList` — events emitted *by* the incident pipeline, not incident records themselves. "Incidents" implies the incident records list (which is a different thing entirely).

**Expected:** rename tab to **"Events"**. The collection variable is already `eventsCollection` — just the label is wrong.

### U9. Audit tab — "Object changes" is unclear

**File:** `UserView.js` — `UserAuditSection.onInit` line 965.

**Symptom:** label "Object changes" is jargon. The underlying `objectLogsCollection` is a `LogList` filtered to this user-as-record — i.e., audit-log entries showing changes to the User row.

**Expected:** rename tab to **"Audit Log"** (or "Record Changes" if "Audit Log" sounds redundant given the section is already called "Audit"). User to confirm preferred label during build.

### U10. Context menu does nothing

**File:** `UserView.js` — `contextItems` (lines 1348-1362). Two items reference handlers that don't exist:
- `edit-user` action → `onActionEditUser` is **NOT defined** anywhere on UserView (grep `onActionEditUser` returns 0 hits).
- `send-email-verification` action → `onActionSendEmailVerification` is **NOT defined**.

**Symptom:** the user reports "context menu doesn't work at all". The dispatch chain (ContextMenu → DetailHeaderView.events → onActionDefault → re-dispatch to parent UserView) is wired correctly per the framework, but the missing handlers mean the click silently no-ops. Other items (`reset-password`, `send-magic-link`, `revoke-all-sessions`, `clear-avatar`, `force-verify-email`, `force-verify-phone`) DO have handlers and should fire.

**Expected:**
- Add `onActionEditUser` (opens `Modal.modelForm(this.model, User.EDIT_FORM)` — the User model already has `User.EDIT_FORM` set at `User.js:557`).
- Add `onActionSendEmailVerification` (POST to `/api/account/email/verification` or whatever the existing endpoint is — verify in build phase).
- During build, walk through every context-menu item and confirm each one fires correctly (the report "doesn't work at all" suggests the user has not been able to confirm any item works — there may be a deeper bubble-path issue worth verifying).

## Out of scope

- Fixture data wiring so the audit's deferred views (RunnerDetailsView, GeoIPView, MemberView, full DeviceView) can be visually verified end-to-end. That's a separate "test data" request.
- Anything beyond the six items listed.

## See also

- [`planning/done/detailview-design-audit.md`](../done/detailview-design-audit.md) — the audit that flagged these.
- [`planning/done/detailview-migration-rethink.md`](../done/detailview-migration-rethink.md) — the parent rethink (moved to done alongside this request).

---

## Plan

### Objective
**Fix UserView completely** so it matches the previous (loved) implementation in look + feel + correctness, then move on. Scope: the six audit items that touch UserView (#1, #2, #5) plus the ten new walkthrough items (U1–U10). Out of scope: IncidentView (#3), GroupView (#4), GroupView/MemberView portion of #6 — these move to Deferred.

### Steps

Order is dependency-friendly: bug fixes first (so subsequent UI walkthroughs aren't blocked by crashes), then layout / wiring, then cleanup.

**1. U5 — Fix `Modal.prompt` Cancel-returns-`0` crash in AdminPersonalSection**

- `src/extensions/admin/account/users/sections/AdminPersonalSection.js:159, 171, 183`: replace `if (name !== null && name.trim())` and `if (name !== null)` with `if (typeof name === 'string' && name.trim())` for `onActionEditDisplayName`, `onActionEditFirstName`, `onActionEditLastName`. Same defensive check.
- Verify any other `Modal.prompt` callers in `UserView.js` and the user/profile/admin tree apply the same guard. Quick grep: `grep -rn "Modal.prompt" src/extensions/admin/`.

**2. U10 — Add missing context-menu handlers**

- `UserView.js`: add `onActionEditUser()` that opens `Modal.modelForm(this.model)` (User.EDIT_FORM is already wired at `User.js:557`). Pattern to copy from: the inline `Modal.form` calls in the existing edit handlers (e.g. `onActionEditPersonal` line 1563).
- `UserView.js`: add `onActionSendEmailVerification()` — POSTs the same admin endpoint used elsewhere for sending verification mail; verify exact path during build (likely `/api/account/email/verify` with `{ user: this.model.id }` or similar). On 200 → `toast.success('Verification email sent')`; on error → `toast.error(...)`.
- Manually verify EVERY context-menu action fires after these are added: `edit-user`, `clear-avatar`, `reset-password`, `send-magic-link`, `revoke-all-sessions`, `send-email-verification`, `force-verify-email`, `force-verify-phone`. If any silently no-op despite the handler existing, capture the dispatch path (`ContextMenu.DEBUG = true` from console — `ContextMenu.js:50`) and treat as a separate framework-bubble bug.

**3. U1 — Header right-gutter layout (presence + active toggle on top, "last active …" below)**

- Drop `activeField: 'is_active'` from the header config (`UserView.js:1384`). The framework's auto-rendered switch goes away.
- Rebuild `_buildHeaderAux` (`UserView.js:1858`) so it emits the entire right-gutter block: a 2-row layout where row 1 is `[presence-dot Online] [generous gap] [Active/Inactive switch]` and row 2 is `[last active 4m ago]` (muted small).
  - The toggle is a `<label class="dh-active-switch">…<input type="checkbox" data-action="toggle-active" {checked}>…</label>` — same markup the framework currently emits at `DetailView.js:175-181`, just relocated.
  - Add `onActionToggleActive(event, element)` to UserView that does the optimistic-save + revert-on-error dance copied verbatim from `DetailHeaderView.onActionToggleActive` (DetailView.js:290).
- New small CSS block in `src/core/css/core.css` near the existing `.dh-aux` rules (~line 3010): a `.dh-aux--two-row` modifier (or just relax the existing `.dh-aux` flex-direction to allow the inner top row of presence+switch). Concrete:
  ```css
  .detail-header .dh-aux .dh-aux-top { display: flex; align-items: center; gap: 1rem; }
  .detail-header .dh-aux .dh-aux-meta { margin-top: 0.15rem; }
  ```
  No theme-token regressions — `.dh-aux` already uses `var(--bs-secondary-color)` etc.

**4. U2 — Email click-to-copy (drop the `mailto:`)**

- Locate every `<a href="mailto:{{model.email}}">{{model.email}}</a>` occurrence in UserView.js and the AdminProfile/UserProfile sections. The Overview section uses one at line 141. The header subtitle uses model fields directly (line 1505 — string composition, no `<a>`).
- Replace the anchor with the framework's clipboard formatter: `{{{model.email|clipboard}}}` (triple-brace because the formatter emits HTML — `DataFormatter.js:175`). Renders `<span>email</span> <button data-action="copy-to-clipboard" data-clipboard="email">📋</button>`. The framework's base `View.onActionCopyToClipboard` (`View.js:822`) handles the click + visual feedback (icon flips to checkmark for 1 s).
- Verify the copy button works inside a Modal context (no nested click swallowing). If the user prefers click-the-email-text-itself rather than a separate copy button, swap to a one-liner inline span: `<span data-action="copy-to-clipboard" data-clipboard="{{model.email}}" role="button" class="user-copy-text">{{model.email}}</span>` and add a `.user-copy-text` hover style that hints at the copy affordance. Confirm with user during build.

**5. U7 — Permissions section UX**

- `UserView.js:_renderGroup` (line 620): restructure each row's HTML to use a proper `<label class="form-check-label" for="<id>">`. Concrete shape (per-row):
  ```html
  <div class="detail-perm-row form-check form-switch">
      <input class="form-check-input" type="checkbox" role="switch"
             id="perm-{{permName}}"
             data-change-action="toggle-perm" data-perm="{{permName}}"
             {{#checked}}checked{{/checked}} {{#disabled}}disabled{{/disabled}}>
      <label class="form-check-label" for="perm-{{permName}}">
          {{label}}
          <span class="detail-perm-hint">{{tooltip}}{{#inheritedFrom}} · inherited from <code>{{inheritedFrom}}</code>{{/inheritedFrom}}</span>
      </label>
  </div>
  ```
  Generate a stable per-row id using `MOJOUtils.generateId('perm-')` or `${this.id}-${permName}` so multiple PermissionsTabBody instances on the same page don't collide.
- Wrap the rows for **Advanced** and **Effective** modes in a `display: grid; grid-template-columns: repeat(2, 1fr); gap: 0 1.5rem;` container. Common stays single-column. Add the CSS to `src/extensions/admin/css/admin.css` under a `.detail-perm-grid--two-col` selector (or similar — match local convention).
- Keep the existing `onActionTogglePerm` handler (`UserView.js:661`) — the data layer is correct (clones `permissions`, mutates the one key, calls `model.save({ permissions: current })`). FormView's `autosaveModelField` would PUT `{ "permissions.x": true }` literally and break.
- Optional polish: a tiny inline status `<span>` next to each row that shows "saving…" then "saved" (auto-fade after 1 s) on the existing handler. Mirrors FormView's per-field status-manager UX without requiring FormView. **Defer to confirmation** — keep step minimal first, add status pill if user wants it.

**6. U6 / Item #1 — OAuth section header**

- `src/extensions/admin/account/users/sections/AdminConnectedSection.js:25`: prepend `<div class="detail-section-eyebrow">Linked accounts</div>` at the top of the template, outside both `{{#connections}}` and `{{^connections|bool}}` blocks. The empty state already exists (line 39-42); only the eyebrow is missing.

**7. Item #5 — `Joined` row fallback**

- `UserView.js:158` (UserOverviewSection): `{{model.date_joined|date}}` → `{{model.date_joined|date|default:'—'}}`.
- `UserView.js:421` (UserProfileSection · Account block): same swap, keep the `<code>` wrapper.
- If during the live walkthrough `model.date_joined` is genuinely absent from the API response, swap to whichever field actually populates (`created`, etc.) — but keep the default fallback either way.

**8. U8 + U9 — Audit tab labels**

- `UserView.js:962-966`: rename `'Incidents'` → `'Events'`, and `'Object changes'` → `'Audit Log'` (or whatever the user confirms during build). Single-character-class diff.

**9. U3 — Tighten profile spacing (framework CSS)**

- `src/core/css/core.css:2655` — `.detail-flat-row` `padding: 0.85rem 0` → `padding: 0.55rem 0`.
- `src/core/css/core.css:2632` — `.detail-section-eyebrow:not(:first-child)` `margin-top: 2rem` → `margin-top: 1.25rem`.
- `src/core/css/core.css:2620` — `.detail-section-eyebrow` `margin: 0 0 0.5rem` → `margin: 0 0 0.4rem`.
- These are framework-wide so they affect every DetailView (UserView, GroupView, IncidentView, RuleSetView, etc.). That matches the user's intent — the rethink uniformly added too much air.
- Eyeball every detail view in light + dark after the change to confirm nothing breaks: User, Group, Incident, RuleSet, Job, Runner, Device, GeoIP, ShortLink, Member, File.

**10. U4 — Bootstrap tooltips on all detail-section action buttons**

- Two-part fix:
  - **DetailView's section-action buttons:** the `<button class="detail-section-action" title="...">` pattern is used everywhere (AdminPersonalSection, UserProfileSection, etc.). Add `data-bs-toggle="tooltip"` to every one. Quick grep: `grep -rn 'class="detail-section-action"' src/extensions/admin/` — touch each.
  - **Activate them in the views that emit them:** add `enableTooltips: true` to the View constructor options of every section that emits these buttons (AdminPersonalSection, UserProfileSection, AdminSecuritySection, AdminConnectedSection, …). The framework's `View.initializeTooltips` (`View.js:714`) auto-discovers `[data-bs-toggle="tooltip"]` after render.
  - For the header buttons themselves (`dh-action`), the framework already sets `data-bs-toggle="tooltip"` on the active-toggle (`DetailView.js:176`) but NOT on the regular `actionsHtml` buttons (line 185) or the `dh-close` button. Add `data-bs-toggle="tooltip"` there too. Then enable tooltips on `DetailHeaderView` itself by passing `enableTooltips: true` in the constructor (line 81-104) — small framework change but isolated to DetailHeaderView.

**11. Item #2 — Devices section: open the proper detail view**

- `UserView.js:744-797` (`UserDevicesSection.onInit`'s TableView): rows are synthetic plain objects (line 832-865), so `clickAction: 'view'` alone won't dispatch — `getModelClass()` would fail. Add an `onRowClick` callback that:
  - splits the synthetic row id (`b:<id>` / `p:<id>`),
  - looks up the real `UserDevice` / `PushDevice` model from the source collection,
  - opens `Modal.detail(new DeviceView({ model }))` for browser rows and `Modal.detail(new PushDeviceView({ model }))` for push rows.
- New imports at the top of `UserView.js`: `import DeviceView from '../devices/DeviceView.js';` and `import PushDeviceView from '../../messaging/push/PushDeviceView.js';`.
- `src/extensions/admin/models/Push.js`: add `import PushDeviceView from '@ext/admin/messaging/push/PushDeviceView.js';` and `PushDevice.VIEW_CLASS = PushDeviceView;` after the class definitions. Net cost: 2 lines + 1 import.

**12. UserView portion of #6 — Migrate 10 `dataFormatter.apply(value, [...])` call sites**

- Migrate UserView.js sites only at this stage (10 of 17): `UserView.js:260, 289, 301, 313, 325, 1508, 1618, 1673, 1676, 1862`.
  - `dataFormatter.apply(v, ['relative'])` → `dataFormatter.apply('relative', v)`.
  - `dataFormatter.apply(v, ['epoch', 'relative'])` → `dataFormatter.pipe(v, 'epoch|relative')`.
- **Do not** delete the compat branch in DataFormatter.js yet — GroupView and MemberView still depend on it (4 + 3 sites). Compat-branch removal happens after those views land in the deferred follow-up.

### Design Decisions

- **Move the active-toggle into `auxFn` rather than re-architect DetailHeaderView.** Reshaping `.dh-actions` into a 2-row layout would touch every DetailView in the framework. Instead, `auxFn` already gets a trusted-HTML escape hatch — emit the full top-row + meta block from there. The price: UserView re-implements `onActionToggleActive` (8 lines copied from DetailView). The benefit: zero framework risk, exact layout under the user's control.
- **Permissions UX upgrade ≠ adopting FormView.** Switching to `FormView` with `autosaveModelField` would break the data layer (it'd PUT `{ "permissions.x": true }` literally, not `{ permissions: { x: true } }`). What the user actually needs from FormView is the **markup pattern** (`<label class="form-check-label" for="<id>">` so clicking the label toggles, two-column grid). Copy the markup, keep the existing `onActionTogglePerm` data layer.
- **Profile-spacing fix lives in framework CSS, not UserView CSS.** The complaint applies to every DetailView. Tightening `.detail-flat-row` and `.detail-section-eyebrow` once propagates the fix correctly. If any specific view needs more space, it can override locally — but the right default is tight.
- **Tooltips: turn them on view-by-view rather than globally.** `enableTooltips` defaults to `false` for performance reasons (`View.js:41`). Enabling it on the small set of section views that actually emit `[data-bs-toggle="tooltip"]` keeps the change scoped.
- **`Modal.prompt` Cancel-returns-`0` is a framework bug, but the fix lands in the caller for now.** Patching `Modal._renderAndAwait` to resolve dismiss-buttons with `null` is the *correct* fix — but it would change the resolved value of every existing dismiss button across the codebase. Risk surface beyond this task. Caller-side `typeof === 'string'` guard is the minimum-risk path; tracker entry under Deferred for the framework patch.
- **`Modal.modelForm(model)` for Edit User** because `User.EDIT_FORM` is already wired (`User.js:557`) — no field-list duplication.
- **Devices dispatcher uses `onRowClick` (custom hook) rather than `clickAction: 'view'`** because the synthetic rows aren't Model instances — `getItemViewClass()` (`TableView.js:1172-1181`) requires a real `ModelClass.VIEW_CLASS`. Dispatching by row `kind` and looking up the underlying model from the source collection is the minimum diff that produces the right modal.
- **`PushDevice.VIEW_CLASS` is wired separately** because the pattern is repo-wide convention — useful any future place a TableView surfaces PushDevice rows.
- **Step ordering — bug fixes before UX, UX before cosmetic.** U5 (the crash) blocks any walkthrough that touches the Personal section, so it's first. U10 (context menu handlers) blocks half the admin actions. After those, U1/U2/U7 are the high-impact UX repairs the user explicitly cited. U3/U4 are framework-wide cosmetic tweaks landed last so QA can compare side-by-side.

### Edge Cases

- **`Modal.prompt` returning `""` (empty input)** — after the U5 fix, `typeof "" === 'string'` is true, but `"".trim()` is falsy, so the `if` guard skips the save. Behavior matches user expectation (empty input = no-op).
- **Active toggle save fails** — copy DetailView's optimistic-update + revert pattern verbatim: `model.set(field, checked)` first, then `model.save(...)` async; on error, `model.set(field, !checked)` so the switch bounces back. No toast — the bounce is the feedback.
- **Email click-to-copy on insecure context** — `navigator.clipboard.writeText` throws on `http://` (non-HTTPS). The framework's `View.onActionCopyToClipboard` (`View.js:828`) has a `document.execCommand('copy')` fallback already. No extra work needed.
- **Permissions row IDs** — generating an `id="perm-<name>"` string per row works only because permission names are unique within a tab. Confirm uniqueness across `User.CATEGORY_PERMISSIONS` and `User.GRANULAR_PERMISSION_TABS`. If two tabs surface the same permission, scope the id with the tab key (`id="perm-${tab}-${name}"`).
- **Profile-spacing change visible in IncidentView and other unrelated views** — intentional; the user said this affects every DetailView. During build, eyeball Incident, RuleSet, Job, Runner, Device, GeoIP, ShortLink, Member, File detail views to confirm none break. If one view needs the old larger spacing for a specific reason, that view scopes its own override.
- **Tooltips on dynamically-rendered elements** — `View.initializeTooltips` runs in `bindEvents` after each render. If a permission row toggle re-renders the section, the new tooltips initialize correctly. Verify by toggling several perms in a row and hovering the section-action buttons.
- **OAuth eyebrow** — always shown, even before `onBeforeRender`'s fetch completes. Mid-flight fetch shows the eyebrow + empty-state placeholder briefly — acceptable.
- **Devices clickAction** — when a synthetic row's underlying model is removed from its collection between render and click (race), the lookup returns `undefined`; the handler silently no-ops rather than crashing. PushDeviceView is currently a thin DataView wrapper, not a full DetailView — it'll render but won't have the locked DetailView header. Out of scope to upgrade.
- **DataFormatter migration in UserView only** — the compat branch in DataFormatter.js stays alive until GroupView/MemberView migration lands in the deferred follow-up. No removal in this batch.

### Testing

- `npm run test:unit` after each of: U5 (defensive guard — no test change), U10 (handler additions — no test change), U7 (markup change — existing PermissionsTabBody tests if any), U1 (handler relocation), U11/Item #2 (TableView click dispatch). Existing 824+ tests cover the framework primitives we're touching; no new tests strictly required.
- Manual verification: `npm run dev`, open a User detail in the example portal, walk through every UserView screen and confirm:
  - **Personal section**: clicking each pencil-icon → prompt opens; pressing Cancel → no crash; pressing OK without changes → no crash; pressing OK with a value → row updates and toast fires.
  - **Header right gutter**: presence chip + Active toggle on the same top line with visible space between them; "last active …" line below; toggling Active flips the chip and saves; on simulated save failure the switch bounces back.
  - **Email row** (Overview): single click copies to clipboard, icon flips to checkmark for 1 s, no mail-app launch.
  - **Profile rows**: row height visibly tighter than before; section eyebrows visibly closer to their following rows; clusters still read as ownership groups.
  - **Action button tooltips**: hover the pencil/patch-check icons in Personal, Profile, Security sections — Bootstrap tooltip shows instantly (no 1 s OS delay).
  - **OAuth section**: eyebrow "Linked accounts" visible; empty-state placeholder visible when no connections.
  - **Permissions section**:
    - Common tab still single column; Advanced and Effective in 2 columns.
    - Click the **label text** of a switch → switch toggles.
    - Toggle a permission → save round-trips; on simulated 500 the switch reverts.
  - **Audit section tabs**: labels read **Activity / Events / Audit Log** (or whatever U9 lands on).
  - **Joined row**: shows date if present, `—` if not.
  - **Devices section**: click a browser row → DeviceView modal opens; click a push row → PushDeviceView modal opens.
  - **Context menu**: click each item — `Edit User`, `Clear Avatar`, `Send Password Reset`, `Send Magic Login Link`, `Revoke All Sessions`, `Send Email Verification` (when unverified), `Force Verify Email`, `Force Verify Phone`. Each fires the corresponding flow. None silently no-op.
- Cross-check under both `[data-bs-theme="light"]` and `[data-bs-theme="dark"]`.
- After the framework CSS tightening (U3) lands, also eyeball: GroupView, IncidentView, RuleSetView, JobDetailsView, RunnerDetailsView, DeviceView, GeoIPView, ShortLinkView, MemberView, FileView. Light + dark.

### Docs Impact

- **No public-API changes** in this batch — every fix is either a bug fix or a layout/markup change within the admin extension and small framework CSS tweaks. So no `docs/web-mojo/` changes required for this Plan.
- **CHANGELOG.md** — single bullet: *"UserView: header right-gutter layout (presence + active toggle on top, last-active below), email rows now click-to-copy, Personal section edit handlers no longer crash on Cancel, context menu edit-user / send-email-verification handlers, Permissions section uses proper `<label for>` and 2-column grid for Advanced/Effective tabs, OAuth section gets its eyebrow, Devices rows open DeviceView / PushDeviceView, Audit tabs renamed Events / Audit Log, Joined row gets `—` fallback. Framework CSS: tighter `.detail-flat-row` and `.detail-section-eyebrow` spacing affects every DetailView."*

### Out of Scope (for this Plan)

Original audit items deferred to a follow-up after UserView lands and the user can confirm the patterns work:

- **#3 IncidentView Source threat-flag grid rework** — separate request, structural change in IncidentSourceSection.
- **#4 GroupView header buttons** — small fix, but waits until UserView's `auxFn` + active-toggle pattern is proven (so GroupView can copy it cleanly).
- **GroupView + MemberView portion of #6 (`dataFormatter.apply` migration)** — 7 of 17 sites. Removal of the compat branch in `DataFormatter.js` happens at the end of that follow-up, not in this batch.
- **Framework: `Modal._renderAndAwait` dismiss-button-resolves-to-`0` bug.** A separate framework patch — risk surface beyond UserView. To track, we should either file a bug under `planning/issues/` or list it in this request's Deferred section. Suggest filing as `planning/issues/modal-prompt-cancel-returns-zero.md` so it's discoverable independently.
- **Framework: turning on `enableTooltips` repo-wide.** Out of scope — narrow to just the views we touch.
- **DeviceView replacing PushDeviceView's thin shape.** Already deferred; PushDeviceView stays a DataView wrapper for now.
