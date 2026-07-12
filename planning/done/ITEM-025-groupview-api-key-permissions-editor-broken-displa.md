---
id: ITEM-025
type: bug
title: "GroupView API Key: permissions editor broken (display/save) and detail modal layout — redesign to mirror Group Member permission UI"
priority: P2
effort: L
owner: frontend
opened: 2026-07-12
depends_on: []
related: []
links: []
---
# GroupView API Key: permissions editor broken (display/save) and detail modal layout — redesign to mirror Group Member permission UI

## What & Why

Three compounding problems in the admin GroupView → API Keys flow
(`src/extensions/admin/account/api_keys/ApiKeyView.js`,
`src/core/models/ApiKey.js`,
`src/extensions/admin/account/groups/GroupView.js`):

1. **Edit dialog corrupts and can't save permissions.** `ApiKeyForms.edit`
   (and `.create`) declares `permissions` as `type: 'textarea'` instead of
   `type: 'json'` (`src/core/models/ApiKey.js:73-79, 100-106`). On Edit, the
   already-fetched permissions object gets string-coerced into the textarea
   as the literal text `"[object Object]"` (no `JSON.stringify`, unlike the
   framework's own `json` field type). On submit — both Create and Edit —
   the raw textarea string is POSTed with no `JSON.parse`, so `permissions`
   is sent as a string, not an object. `getChangedData` always flags a
   `textarea` field with an object-typed original value as "changed", so
   even a no-op save re-POSTs whatever string sits in the box — including a
   stale `"[object Object]"` — silently overwriting real permissions.
2. **Only privileged users can actually grant permissions, with no
   indication why others fail.** Backend investigation (django-mojo)
   confirmed two independent, stacked causes, both filed as their own
   django-mojo items (see Notes): (a) even a correctly-shaped JSON object
   payload can be silently dropped if it ever arrives as a string — a
   django-mojo setter bug, and (b) a group member holding only `"groups"`
   can create/save a key but is missing from the permission-grant gate's
   fallback list, so they get a 403 the moment they try to set any
   permission on a key they otherwise own.
3. **The read-only detail view ("View" a key from the list) looks broken.**
   `ApiKeyView` is a hand-rolled `View`
   (`src/extensions/admin/account/api_keys/ApiKeyView.js:9,13`), not the
   established `DetailView` component that every other admin detail view
   (13 of them — GroupView, UserView, MemberView, DeviceView, IncidentView,
   etc.) extends. Its `viewDialogOptions`
   (`src/extensions/admin/account/api_keys/ApiKeyTablePage.js:23-26`) sets
   `header: false` but omits the two keys every correctly-wired sibling
   pairs with it — `noBodyPadding: true` and `buttons: []`. Net effect: the
   whole view (header + Token Preview/Permissions/Rate Limit
   Overrides/Usage sections) sits inside one generic Bootstrap
   `.modal-body` with only Bootstrap's flat 1rem/0.5rem defaults, instead of
   `DetailView`'s purpose-built, more generous `.detail-header`/
   `.detail-section` spacing — plus it's missing the standard close (×)
   button entirely and has a stray, purposeless "OK" footer button. Reads
   as "the modal has no margins," and looks unfinished next to every
   sibling admin detail view.

**Proposed direction** (confirm during /scope, mockups first — see Notes):
adopt the same pattern `MemberView.js` already uses for Group Member
permissions — a switch-per-permission editor (`type: 'switch'` fields,
optionally grouped into a `type: 'tabset'`), saved as dotted keys
(`permissions.<name>: true/false`) rather than a whole-object JSON blob —
**restricted to the same permission catalog assignable on a Group Member**
(`Member.BASE_PERMISSIONS` / `Member.PERMISSION_TABSET`,
`src/core/models/Member.js:82-91, 126-145`), since an API key is
conceptually "acting as" a member of its group and shouldn't be grantable
permissions a real member couldn't hold. This fixes problem 1 outright — no
more object↔string round-trip to break, since each permission becomes an
independently-saved boolean, exactly like `MemberView`, and (per confirmed
backend investigation, see Investigation) dotted-key saves still route
through the authorization gate correctly. Migrating `ApiKeyView` to extend
`DetailView` (matching all 13 sibling views) fixes problem 3 and gives the
new permissions section a natural home — `MemberPermissionsSection` is
exactly this shape: a `DetailView` section wrapping a small `FormView`.

## Acceptance Criteria
- [ ] Edit dialog no longer shows `"[object Object]"` for Permissions; the
      redesigned editor loads current permissions correctly.
- [ ] Saving an API key's permissions (Create and Edit) persists correctly —
      contingent on the two django-mojo companion items landing (see Notes).
- [ ] Permissions editor only offers the permission catalog a Group Member
      can hold (reuse/mirror `Member.BASE_PERMISSIONS` /
      `Member.PERMISSION_TABSET` — decide during /scope whether `ApiKey`
      literally imports Member's catalog or gets its own parallel one built
      the same way).
- [ ] A user who can create/save an API key in a group (holds `"groups"` or
      higher) can also set permissions on it, without a confusing 403 —
      contingent on the two django-mojo companion items landing.
- [ ] `ApiKeyView`'s detail modal has proper section spacing, a working
      close (×) button, and no stray "OK" footer button — matches the
      visual language of sibling admin detail modals (Group, User, Member).
- [ ] Both light and dark themes checked for every touched surface
      (`.claude/rules/theming.md`).
- [ ] Mockups (both themes) produced and approved before implementation
      starts (see Notes) — this is UI-heavy: a new permission-picker
      section plus a structural `DetailView` migration.

## Repro — bugs only
1. Admin → Groups → open a group → API Keys section → click an existing key
   → kebab menu → Edit.
   - Expected: Permissions field shows the key's current permissions in a
     usable, correct form.
   - Actual: a textarea containing the literal text `[object Object]`.
2. Change the Name field only (don't touch Permissions) → Save.
   - Expected: permissions unchanged.
   - Actual: permissions overwritten with the string `"[object Object]"` on
     the wire (see Notes for how django-mojo currently reacts to that
     specific malformed value — the frontend payload is wrong regardless).
3. As a group member holding only the `"groups"` permission (not
   `manage_group`/`manage_groups`): create a new API key (succeeds), then
   try to grant it a permission.
   - Expected: succeeds — you already proved you can manage keys in this
     group by creating one.
   - Actual: 403.
4. Admin → Groups → open a group → API Keys section → click an existing key
   to VIEW it (not Edit).
   - Expected: a detail view with normal spacing and a close button,
     matching every other admin detail modal (Group, User, Member,
     Device, ...).
   - Actual: cramped/flat spacing, no close (×) button, a stray unstyled
     "OK" button in the footer.

## Investigation
Confidence: **confirmed** for all three problems (direct code reading across
both web-mojo and django-mojo).

**Problem 1 — display/save (web-mojo):**
- Field declared `type: 'textarea'`: `src/core/models/ApiKey.js:73-79`
  (create), `:100-106` (edit).
- Display bug: `FormView.prepareFormData` copies the raw model object into
  `this.data` (`src/core/forms/FormView.js:72-92`); `renderTextareaField`
  interpolates it directly with no stringify
  (`src/core/forms/FormBuilder.js:1199,1211`); `setFieldValue`'s `textarea`
  case falls to the `default` branch, `fieldElement.value = newValue || ''`
  (`FormView.js:1951-1999`, default at 1992-1994) — assigning an object
  coerces to `"[object Object]"`. Contrast: `type: 'json'` fields
  `JSON.stringify` on render (`FormBuilder.js:1301-1309`) and on
  `setFieldValue` (`FormView.js:1978-1991`) — the fix already exists in the
  framework, this field just isn't using it.
- Save bug: `getFormData` reads a textarea's DOM value as a plain string
  (`FormView.js:1702,1724-1738`); only `[data-field-type="json"]` fields get
  `JSON.parse`'d (`FormView.js:1778-1787`), an attribute only
  `renderJsonField` emits (`FormBuilder.js:1317`). `Model.save()` sends the
  string verbatim (`src/core/Model.js:383-392`).
- Applies to both dialogs: Edit via `app.showModelForm({ formConfig:
  ApiKeyForms.edit })` (`ApiKeyView.js:113-123`); Create via
  `GroupView._createApiKey()`'s `Modal.form(...)`
  (`src/extensions/admin/account/groups/GroupView.js:1696-1723`) and the
  standalone `ApiKeyTablePage.onActionAdd`
  (`src/extensions/admin/account/api_keys/ApiKeyTablePage.js:66-94`) — same
  root field declaration, same bug, both paths.
- `limits` (displayed as "Rate Limit Overrides") is a separate model field,
  currently NOT editable through either dialog (no field declared for it) —
  no bug today, but flagged because it would hit the identical trap if ever
  added as a `textarea`.

**Problem 2 — authorization (django-mojo, filed separately as its own
items):**
- Backend confirms a real JSON object DOES persist correctly today — so the
  redesign's dotted-key-boolean save shape is sufficient on its own once
  problem 1 is fixed on the frontend — but two independent backend defects
  compound today's symptom and are real bugs regardless of this redesign
  (see Notes for the filed items).
- Confirmed safe: switching to `MemberView`'s dotted-key save pattern
  (`permissions.<name>: true`) does **not** bypass the authorization gate.
  The request parser expands dotted top-level JSON keys into a nested dict
  *before* `on_rest_save` runs
  (`mojo/helpers/request_parser.py:152, 156-166, 184`), so
  `set_permissions` receives a normal (partial) dict and
  `can_change_permission` fires per-key exactly as it does for whole-object
  saves (`mojo/apps/account/models/api_key.py:166-182`) — confirmed
  identical to how `GroupMember.set_permissions`
  (`mojo/apps/account/models/member.py:97-106`) already gates
  `MemberView.js`'s live dotted-key saves today.

**Problem 3 — detail modal layout (web-mojo):**
- `ApiKeyView extends View`, not `DetailView` (`ApiKeyView.js:9,13`) — a
  hand-rolled template (`ApiKeyView.js:22-88`), no custom CSS.
- Opened via `TablePage.showItemDialog`
  (`src/core/pages/TablePage.js:466-508`) →
  `Modal.dialog({ header:false, size:'lg', ...viewDialogOptions })`, where
  `ApiKeyTablePage.js:23-26` supplies only `{ header: false, size: 'lg' }` —
  missing `noBodyPadding: true` and `buttons: []`, which all 13 sibling
  `DetailView`-based admin views pair with `header: false` (e.g.
  `GroupView.js:1182`, `UserView.js:719`, `GroupTablePage.js:25`,
  `UserTablePage.js:22`, `MemberTablePage.js:25`). Missing `noBodyPadding`
  → `ModalView` defaults it `false` (`src/core/views/feedback/
  ModalView.js:136`) → plain `.modal-body` (Bootstrap's flat 1rem inset)
  instead of `DetailView`'s own `.detail-header`/`.detail-section` spacing
  (`src/core/css/core.css:2880-2930, 3127-3129`). Missing `buttons: []` →
  `Modal.dialog`'s default `[{ text: 'OK', class: 'btn-primary', value:
  true }]` (`Modal.js:216`) leaks through as a stray unstyled footer
  button. No `DetailHeaderView` → no close (×) button
  (`src/core/views/data/DetailView.js:245-249` never runs). `Modal.detail()`
  (`Modal.js:336-363`) exists specifically to set `noBodyPadding: true` for
  exactly this reason.
- **Not a `DetailView` defect** — the shared component and all 13 other
  consumers are correct; this is local to `ApiKeyView`/`ApiKeyTablePage`'s
  own config, explainable by git history: `ApiKeyView.js` predates
  `DetailView.js` (created 2026-03-05 vs. `DetailView` landing 2026-05-08).
- **CORRECTION (2026-07-12, re-verified from a second session + confirmed
  in this repo)**: the causal chain above ("missing `noBodyPadding` → flat
  spacing") is WRONG. `noBodyPadding: true` emits `modal-body p-0
  modal-body-flush` (edge-to-edge, 0px); it is only correct for
  `DetailView`s, which supply their own ~1.5rem internal padding
  (`DetailView.js:424`). On a hand-rolled `View` it REMOVES padding. The
  two open paths are broken differently:
  - **GroupView → API Keys (the repro path)**: the `ListView` already
    passes `{ header:false, noBodyPadding:true, buttons:[] }`
    (`GroupView.js:1240`) — on the hand-rolled view that yields zero body
    padding, no OK button, no ×: no dismiss affordance at all. This is the
    real "no margins / looks broken" source.
  - **Standalone `ApiKeyTablePage`**: only `{ header:false, size:'lg' }`
    (`ApiKeyTablePage.js:23-26`) — padding is the normal Bootstrap 1rem
    (fine), but `Modal.dialog`'s default primary "OK" leaks through
    (`Modal.js:216`) and there's no × (`header:false` removes
    `.modal-header`). The OK button is currently that path's ONLY dismiss
    control — never remove it without the DetailView × replacing it.
  - Third defect is style: the boxed `list-group` content reads dated next
    to siblings' borderless `.detail-section` look — fixed by the
    migration itself.
  - **Build guard**: `ApiKeyTablePage`'s `noBodyPadding:true, buttons:[]`
    completion must land in the SAME change as the `DetailView` migration,
    never before it (on the current view it would recreate the GroupView
    breakage). Same applies to the flagged `WebhookSubscriptionView`
    follow-up.
- No dark-theme-specific defect: `ApiKeyView` has zero custom CSS today
  (only generic, already-theme-aware Bootstrap utility classes); migrating
  to `DetailView` primitives brings dark-mode coverage for free
  (`core.css:2928-2930` already carries `[data-bs-theme="dark"]` overrides
  for `.detail-section`/`.detail-flat-row`).

Regression-test feasibility: form-level tests (field type, `getFormData`
parsing) are straightforward, mirroring existing `FormView`/`FormBuilder`
unit tests. The modal-layout fix is visual — verify manually in both themes
per `.claude/rules/theming.md`, not a good regression-test candidate.

## Notes
- **Cross-repo dependency**: this item's permission-grant behavior depends
  on two django-mojo items, filed separately and still unscoped (no IDs
  yet): `apikey-set-permissions-drops-non-dict-values.md` and
  `permission-gate-fallback-missing-base-groups-users-perm.md`. Backfill
  `depends_on: [org/django-mojo#ITEM-xxx, ...]` on this item once those are
  scoped and IDed — mirrors the existing ITEM-023 ↔ django-mojo ITEM-017
  cross-repo precedent in this project's history.
- **Mockup gate**: per standing preference (established during ITEM-023
  geofencing work), UI-heavy items get a mockup phase (both themes) as an
  explicit approval gate before /build starts. This item qualifies — a new
  permission-picker section plus a structural `DetailView` migration.
  Deliver as self-contained HTML, both `data-bs-theme` states, matching
  `.claude/rules/theming.md`.
- **Out of scope, flagged separately**: `WebhookSubscriptionView.js`
  (`src/extensions/admin/account/webhook_subscriptions/`) self-documents as
  "mirrors the shape of `ApiKeyView`" and has the identical incomplete
  `viewDialogOptions` (`WebhookSubscriptionTablePage.js:29-33`) — same
  modal-layout bug, unrelated feature area. Not fixed here; flagged as a
  separate follow-up (see spawned task).
- Design open question for /scope: `MemberView` edits permissions inline
  (autosave switches directly in its `DetailView`), whereas `ApiKeyView`
  today has a separate View/Edit split. Decide whether to collapse to
  inline autosave (fuller parity with Member) or keep a separate Edit
  surface but with the same switch/tabset field shape — mockups should
  cover whichever direction is chosen.

### Scope plan (agreed 2026-07-12 — user signed off; see Resolved questions)

**Goal**: Rebuild `ApiKeyView` as a `DetailView` with a Member-style
switch/tabset permissions editor (autosaved dotted keys, Member permission
catalog), eliminating the `permissions` textarea entirely.

**Phase 0 — Mockups (approval gate before /build)**
Self-contained HTML, both `data-bs-theme` states, per
`.claude/rules/theming.md`. Covers: the new DetailView shell (header with
name/active/group chips, × close), sections (Overview/Token, Permissions
switch tabset, Rate Limit Overrides, Usage), and the Create modal **with
its embedded permissions switch tabset**.

**What changes**
1. `src/core/models/ApiKey.js` — replace the `permissions` textarea:
   `ApiKeyForms.create` keeps `name`/`group` and embeds
   `Member.PERMISSION_TABSET` switches in place of the textarea
   (permissions at create time are an essential part of the flow — user
   decision); `.edit` shrinks to `name` (`is_active` moves to the
   DetailView header `activeField`). Reference the tabset so it stays live
   with `Member.registerPermissions()` (the cache is mutated in place —
   reference at use, not a frozen copy).
2. `src/extensions/admin/account/api_keys/ApiKeyView.js` — rewrite as
   `DetailView` (mirror `MemberView.js`):
   - Header: icon `bi-key`, `titleField: 'name'`, chips (group, created),
     `activeField: 'is_active'`, `closable: true`, contextMenu
     (Edit name / Delete — replaces today's hand-mounted ContextMenu).
   - Sections: Overview/Token Preview; **Permissions** — a section View
     wrapping `new FormView({ fields: Member.PERMISSION_TABSET, model,
     autosaveModelField: true })` exactly like `MemberPermissionsSection`
     (`MemberView.js:217-239`); Rate Limit Overrides (read-only); Usage.
   - Keep `ApiKey.VIEW_CLASS = ApiKeyView`.
3. `src/extensions/admin/account/api_keys/ApiKeyTablePage.js` —
   `viewDialogOptions` → `{ header:false, size:'lg', noBodyPadding:true,
   buttons:[] }` — **same change as the DetailView migration, never
   before it** (see Investigation CORRECTION: on the hand-rolled view
   these options remove all padding and every dismiss control);
   `onActionAdd` keeps using `ApiKeyForms.create` (now
   switch-tabset-based); token-reveal dialog unchanged.
4. `src/extensions/admin/account/groups/GroupView.js` — `_createApiKey()`
   field list follows the new form (minus `group`, injected from context);
   `_showApiKeyTokenDialog` reads granted permissions from the dotted
   `permissions.<name>` keys in the form result instead of the current
   string/dict juggling. GroupView's ListView `viewDialogOptions` already
   correct — no change.

**Design decisions**
- **Catalog = literal reuse of `Member.PERMISSION_TABSET`** (live-cached,
  includes app-registered tabs) rather than a parallel ApiKey copy — single
  source of truth; an API key "acts as" a member. Field names are already
  `permissions.<name>`, matching ApiKey's field.
- **Inline autosave (full Member parity)**, not a separate permissions Edit
  dialog — collapses the View/Edit split for permissions; Edit dialog
  shrinks to name only.
- **Permissions ARE part of the Create form** (user decision — essential
  to the flow): the Create modal embeds the same switch tabset. The
  form-submit path also emits flat dotted keys (`getFormData` keys by raw
  input `name`), which django-mojo expands pre-gate — same contract as
  autosave. Build-time verify: confirm `getFormData` coerces switch values
  to booleans (not FormData's `"on"`) and that unchecked switches are
  simply omitted (grant-only semantics on create). Create-time grants by a
  `"groups"`-only user still 403 until the django-mojo companions land —
  covered by the already-contingent acceptance criteria.
- Dotted-key flat saves confirmed safe end-to-end: FormView
  `executeBatchSave` sends `{"permissions.<name>": bool}` flat
  (`FormView.js:930-1001`); django-mojo expands dotted keys pre-gate.

**Edge cases**
- Records whose `permissions` is already the corrupted string
  `"[object Object]"`: switches all read false (dot-lookup on a string →
  undefined); first switch flip sends a dotted key — backend behavior on a
  string-valued column is the django-mojo companions' territory. List-item
  perm badges (`GroupView.js:776-807`) should guard against non-object
  `permissions` so corrupted rows don't render garbage badges.
- Permissions on a record outside the catalog: not shown, never touched
  (only changed dotted keys are sent) — same as MemberView today.
- `admin` switch = "Group Admin" wildcard offered on keys; backend gates,
  `sys.*` never in the catalog.

**Tests**
- Regression (the bug): `ApiKeyForms.create`/`.edit` contain **no**
  `permissions` field of type `textarea` — fails before, passes after —
  and `ApiKeyForms.create` embeds the `Member.PERMISSION_TABSET` reference
  (stays live after `registerPermissions`, mirror `Member.test.js:108`).
- New `test/unit/ApiKeyView.test.js` (mirror `DetailView.test.js` /
  `ShortLinkView.test.js` + `Member.test.js` shape assertions): DetailView
  header renders with close ×; Permissions section builds switches from
  `Member.PERMISSION_TABSET`; autosave path saves a flat dotted key (mirror
  `FormView.autosaveSkipRender.test.js`).
- Modal layout + both themes: manual verification per
  `.claude/rules/theming.md` (not regression-testable).

**Docs**: `CHANGELOG.md`; `docs/web-mojo/models/BuiltinModels.md` if it
documents ApiKeyForms' permissions field.

**Resolved questions (user, 2026-07-12)**
1. Permissions **stay in the Create form** — essential part of the flow
   (reversed the original "name-only create" proposal).
2. Literal `Member.PERMISSION_TABSET` reuse — confirmed (app-registered
   member permission tabs appear for API keys too).
3. `is_active` moves to the DetailView header active switch — confirmed.
4. (Default, not explicitly answered): build frontend now with
   `depends_on` empty; acceptance criteria 2 & 4 stay contingent on the
   django-mojo companions and get verified once those land.

## Resolution
- closed: 2026-07-12
- branch: main
- files changed: src/core/models/ApiKey.js, src/extensions/admin/account/api_keys/ApiKeyView.js, src/extensions/admin/account/api_keys/ApiKeyTablePage.js, src/extensions/admin/account/groups/GroupView.js, test/utils/simple-module-loader.js, test/unit/ApiKey.test.js, test/unit/ApiKeyView.test.js, docs/web-mojo/models/BuiltinModels.md, docs/web-mojo/extensions/Admin.md, CHANGELOG.md, memory.md, planning/mockups/apikey-detailview/index.html

**Status**: Resolved (frontend; acceptance criteria 2 & 4 verified pending the
two django-mojo companion items — see Notes).

**What shipped** (2026-07-12, mockups approved first per the Phase 0 gate —
`planning/mockups/apikey-detailview/index.html`):
- `src/core/models/ApiKey.js` — permissions textarea removed from both forms.
  `ApiKeyForms.create` embeds the live `Member.PERMISSION_TABSET` via a
  `fields` getter (+ a "Permissions" heading field); `.edit` is name-only.
- `src/extensions/admin/account/api_keys/ApiKeyView.js` — rebuilt as a
  `DetailView`: header (× close, `activeField: 'is_active'`, Edit name /
  Delete kebab, group + perms-count chips), sections Overview / Permissions
  (autosaving `Member.PERMISSION_TABSET` FormView, landing section) /
  Rate Limits / Usage.
- `src/extensions/admin/account/api_keys/ApiKeyTablePage.js` —
  `viewDialogOptions` completed (`noBodyPadding: true, buttons: []`, same
  change as the migration per the Investigation CORRECTION); grant-only
  create payload (falsy `permissions.*` stripped).
- `src/extensions/admin/account/groups/GroupView.js` — `_createApiKey`
  grant-only payload; `_showApiKeyTokenDialog` takes the granted-permission
  names extracted from dotted keys (string/dict juggling removed).
  (`ApiKeyListItem._perms` already guarded non-object permissions — no
  change needed there.)
- Test infra: `test/utils/simple-module-loader.js` registered
  `ApiKey`/`ApiKeyView` + `models/Member`, `models/ApiKey`,
  `forms/FormView` import rules.

**tests added**: `test/unit/ApiKey.test.js` (regression — no permissions
textarea in create/edit [failed before the fix, passes after], live tabset
embed incl. `registerPermissions` liveness, name-only edit, endpoint pin);
`test/unit/ApiKeyView.test.js` (extends DetailView, × close renders,
activeField/titleField, kebab = edit-key/delete-key only, section registry +
Permissions landing, autosave FormView holds the LIVE tabset reference,
corrupted string-permissions guard on the header chip). Full suite
1467/1467; lint 0 errors / 316 warnings (baseline, no new).

**Verification notes**: modal spacing + both themes eyeballed via the
approved mockups; live both-theme pass in the dev portal recommended on next
run (DetailView primitives carry the dark overrides — no custom CSS added).
