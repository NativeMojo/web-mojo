# GroupView — Auth Config Editor

| Field | Value |
|-------|-------|
| Type | request |
| Status | planned |
| Date | 2026-05-20 |
| Priority | medium |

## Description

Add a dedicated **Auth Config** section to the admin **GroupView** for editing a
group's `metadata.auth_config` — the structured object that controls how the
django-mojo–hosted login, registration, and passkey pages look and behave for
that group.

Today this object can only be edited as raw JSON through the generic Metadata
section, which stringifies nested values — error-prone and unfriendly. This
request replaces that with a proper form-based editor.

The section is a single **`FormView`** with a **`tabset`** field split into three
tabs:

- **Theme** — branding: app title, logo, favicon, hero image/headline/
  subheadline, "back to website" URL, terms URL, API base, success redirect,
  layout, custom CSS, custom CSS URL.
- **Login** — which login methods are offered (password / sms / passkey /
  magic / google / apple).
- **Registration** — signup enabled toggle, passkey-on-signup prompt policy,
  signup methods (password / google / apple), identity field, minimum age, and
  the registration field schema (`registration.fields`).

One form, one Save button. Empty fields show the group's *resolved* (inherited)
value as placeholder text so the admin sees exactly what they would be
overriding.

## Context

django-mojo shipped the server side of this feature. `auth_config` is a
per-group structured config resolved as: code defaults (`DEFAULT_AUTH_CONFIG`)
← the deployment-wide `AUTH_CONFIG` setting ← `group.metadata["auth_config"]`,
deep-merged down the group parent chain. It drives the framework-hosted
`/auth`, `/register`, and `/passkey` pages and the public
`GET /api/auth/config` endpoint.

The full schema — every key, type, default, and validation rule — is the
django-mojo doc `docs/django_developer/account/auth_config.md`. That file is
the source of truth; this editor must not invent keys or method tokens.

GroupView already has precedent for structured per-group config (the Identity →
Settings flat rows, the permission-gated Webhooks section), and `MemberView`
already embeds a `FormView` inside a `DetailView` section — so a first-class
"Auth Config" section fits the established pattern.

## Acceptance Criteria

- [ ] GroupView gains a new **Auth Config** section in the side nav (own key +
      icon), gated by the `manage_group` permission — hidden for users without
      it (matches the existing Webhooks section).
- [ ] The section is one `FormView` with a `tabset` of three tabs: Theme /
      Login / Registration. One Save button covers all three tabs.
- [ ] **Theme tab** — `text` inputs for `app_title`, `logo_url`, `favicon_url`,
      `hero_image_url`, `hero_headline`, `hero_subheadline`,
      `back_to_website_url`, `terms_url`, `api_base`, `success_redirect`,
      `custom_css_url`; a `select` for `layout` (card / fullscreen); a
      `textarea` for `custom_css`.
- [ ] **Login tab** — a `multiselect` (MultiSelectDropdown) bound directly to
      `login.methods`; options: password, sms, passkey, magic, google, apple.
      Cannot be saved empty (server rejects an empty `login.methods`; the field
      enforces at least one selection client-side too).
- [ ] **Registration tab** — a `toggle` for `enabled`; a `select` for
      `passkey_prompt` (off / optional / required); a `select` for
      `identity_field` (Auto / Email / Phone, where Auto = `""`); a `number`
      input for `min_age`; a `multiselect` for `methods` (password, google,
      apple).
- [ ] **Registration field schema** (`registration.fields`) is editable as a
      **fixed 6-row grid** — one row per canonical field (first_name,
      last_name, email, phone, dob, password): each row has an *include*
      toggle, a *required* toggle, and a *verify* select (None / Email / SMS).
      The `password` row is always included + required (server forces this) —
      render those controls locked.
- [ ] Every field carries `help:` text so the editor is self-documenting.
- [ ] Empty fields show the resolved/inherited value as **placeholder text**,
      fetched once on load from `GET /api/auth/config?group_uuid=<uuid>`.
- [ ] Changes save to `group.metadata.auth_config` via standard model CRUD
      (`model.save(...)`). Only fields the admin actually changed are sent, so
      untouched fields keep inheriting and sibling `metadata` keys (timezone,
      domain, the `portal` URL, etc.) survive.
- [ ] Server-side 400 validation errors (e.g. `custom_css` containing `<` /
      `@import` / external URLs, `custom_css_url` not `https://`, unknown
      method tokens, empty `login.methods`, bad `registration.fields`) surface
      as readable inline field errors and/or a toast — never a raw 400. When
      the offending field is on a non-active tab, switch to that tab.
- [ ] The section renders correctly under both light and dark themes.

## Investigation

### What exists

- **`GroupView.js`** (`src/extensions/admin/account/groups/GroupView.js`, ~2200
  lines) — a sectioned `DetailView`. The `sections` array (~line 1240) lists
  section objects `{ key, label, icon, view, permissions? }` with `type:
  'divider'` separators. Sections support a `permissions` key — the Webhooks
  section uses `permissions: 'manage_group'`, Audit uses
  `permissions: 'view_logs'` — and are hidden when the active user lacks it.
- **`GroupIdentitySection`** (same file) edits individual `metadata.*` keys via
  per-row `Modal.form` / `Modal.prompt`, saving partials like
  `model.save({ metadata: { timezone: ... } })`. These shipped, working
  partial saves confirm the server merges `metadata` at the top level.
- **`AdminMetadataSection`** (`src/extensions/admin/shared/AdminMetadataSection.js`)
  — the generic key-value editor; today the only way to edit
  `metadata.auth_config`, as raw JSON.
- **`MemberView.js`** — `MemberPermissionsSection` is the canonical pattern: a
  `View` subclass that embeds a `FormView` child via `containerId`, bound to
  `this.model`.
- **`FormView`** (`src/core/forms/FormView.js`) natively supports:
  - the `tabset` field type — walks `field.tabs[].fields[]` to populate and
    extract values;
  - `multiselect` (MultiSelectDropdown), `toggle`/`switch`, `select`,
    `textarea`, `number`, `text` field types;
  - model-bound save — `saveModel()` → `getChangedData()` → `model.save(changes)`
    sends **only changed fields**;
  - `focusFirstError()` — on submit, activates the tab pane containing the
    first invalid field (client-side HTML5 validation);
  - server error display via `this.errors` / `displayErrors`.
- **django-mojo server side** (verified):
  - `Group.metadata` is a `JSONField`. `on_rest_update_jsonfield`
    (`mojo/models/rest.py`) **deep-merges** an incoming dict into the existing
    value via `objict.merge_dicts` (recursive) unless the field is in
    `JSON_REPLACE_FIELDS` or the payload carries `__replace: true`. So a
    partial `metadata` PATCH preserves every sibling key at every nesting
    level — but a key **cannot be removed** by omitting it.
  - `Group.on_rest_pre_save` calls `auth_config.validate_auth_config(...)`; a
    bad `metadata.auth_config` returns 400 at write time.
  - `GET /api/auth/config?group_uuid=<uuid>` → `public_auth_config(...)`
    returns the full resolved `theme` dict plus `registration` and `login` —
    suitable as the placeholder source for every field.
  - Canonical tokens (do not invent): login methods `password, sms, passkey,
    magic, google, apple`; registration methods `password, google, apple`;
    `passkey_prompt` ∈ `off, optional, required`; `layout` ∈ `card,
    fullscreen`; canonical `registration.fields` names `first_name, last_name,
    email, phone, dob, password`; field `verify` ∈ `null, "email", "sms"`.

### What changes

- **New file** `src/extensions/admin/account/groups/GroupAuthConfigSection.js`
  — a `View` subclass embedding one model-bound `FormView` (own file, given its
  size — do not inline it in `GroupView.js`).
- **`GroupView.js`** — import the new section, instantiate it (`new
  GroupAuthConfigSection({ model })`), and add a `sections` entry with
  `permissions: 'manage_group'` (suggested placement: near Identity, or in the
  "Detail" group beside Metadata; suggested icon `bi-box-arrow-in-right` or
  `bi-shield-lock`).

### Constraints

- web-mojo conventions: `this.model`, a section `View` subclass, `addChild()`
  with `containerId`, `data-action="kebab-case"`, Bootstrap 5.3, light + dark
  theming from day one.
- Save via standard CRUD — `model.save({ metadata: { auth_config: {...} } })`.
  No new or admin-scoped endpoints.
- **Inheritance / minimal-diff save:** the editor must send *only changed*
  fields. The native `FormView` fields (Theme inputs, the two method
  `multiselect`s, the Registration scalars) are bound to dotted paths
  (`metadata.auth_config.theme.app_title`, etc.) so `FormView.getChangedData()`
  handles this for free — untouched fields are never sent and keep inheriting.
  Sending `""` for every blank field would convert every field into an
  override and defeat the placeholder/inheritance design — avoid that.
- **`registration.fields` glue:** the fixed 6-row grid is the one part that is
  not a native `FormView` model-bound field (it serializes to an array, not a
  dotted scalar path). The section must (a) seed the grid from the group's own
  `metadata.auth_config.registration.fields` on load, (b) on Save, only if the
  grid was modified, assemble the canonical `[{name, required, verify}]` array
  and include it in the single `model.save(...)` payload alongside
  `FormView`'s diffed data. Still one Save button — the section orchestrates.
- Schema and allowed values must match django-mojo
  `docs/django_developer/account/auth_config.md` exactly.
- `metadata.auth_config` is the only key this feature touches. The pre-existing
  `metadata.portal` "Default Portal URL" field is unrelated — leave it alone.
- Client-side validation can constrain the bounded fields (`layout`,
  `passkey_prompt`, `identity_field` selects; method `multiselect`s limited to
  valid options; `login.methods` min 1). Content rules for `custom_css` /
  `custom_css_url` are server-authoritative — rely on the 400 → error-display
  path rather than reimplementing them.

### Related files

- `src/extensions/admin/account/groups/GroupView.js` — sections array, section
  classes, `manage_group` precedent.
- `src/extensions/admin/shared/AdminMetadataSection.js` — current raw-JSON
  editor (the thing being superseded for `auth_config`).
- `src/extensions/admin/account/users/MemberView.js` — `MemberPermissionsSection`,
  the embed-a-FormView-in-a-section pattern.
- `src/core/forms/FormView.js` — `tabset` handling, `getChangedData`,
  `focusFirstError`, error display.
- `src/core/models/Group.js` — Group model (endpoint `/api/group`).
- `docs/web-mojo/forms/FormView.md`, `forms/FormBuilder.md`,
  `forms/inputs/MultiSelectDropdown.md`, `forms/FieldTypes.md` — form docs.
- django-mojo `docs/django_developer/account/auth_config.md` — schema source of
  truth; `mojo/apps/account/services/auth_config.py` and
  `register_schema.py` — server defaults and validators.

### Endpoints

- **Modified:** none. Saves use the existing `PATCH /api/group/<id>` standard
  CRUD endpoint.
- **Read:** `GET /api/auth/config?group_uuid=<uuid>` — existing public
  endpoint, called once on section load to populate placeholder text with the
  resolved (inherited) config.

### Tests required

- Unit coverage for the testable pure helpers: the `registration.fields`
  array-assembly (grid state → canonical `[{name, required, verify}]`,
  including the password-always-required rule) and the inverse seed
  (existing array → grid state).
- Full section rendering / FormView integration is integration-test territory;
  cover with a manual verification pass (light + dark theme, save, server-error
  surfacing) rather than a brittle DOM test unless an integration harness fits.

### Out of scope

- A "Clear all auth config overrides" / reset-to-inherited affordance. Because
  the server deep-merges, a previously-saved override key cannot be cleared by
  blanking a field; a dedicated reset (metadata-level `__replace`) is a
  documented follow-up, not v1.
- A live visual preview of the themed login/register page.
- Editing the deployment-wide `AUTH_CONFIG` default — this UI is per-group only.
- A drag-and-drop / reorderable / add-arbitrary-row field builder (the fixed
  6-row grid is the v1 scope for `registration.fields`).
- Any change to the django-mojo server side.

## Plan

### Objective

Add an **Auth Config** section to the admin `GroupView` — a single `FormView`
with a 3-tab `tabset` (Theme / Login / Registration) that edits
`group.metadata.auth_config` through standard model CRUD, gated by
`manage_group`. Empty fields show resolved/inherited values; untouched fields
keep inheriting; sibling `metadata` keys survive.

### Critical findings (drive the design)

- **`Model.save()` sends the payload verbatim**, and the django REST layer
  (`mojo/models/rest.py` `on_rest_save_field`) resolves each top-level key via
  `get_model_field()` — a dotted key like `metadata.auth_config.theme.app_title`
  returns `None` and is **silently dropped**. The recursive deep-merge
  (`on_rest_update_jsonfield` → `objict.merge_dicts`) only fires when the
  top-level key is exactly `metadata`. ⇒ the save payload **must** be a properly
  nested `{ metadata: { auth_config: {...} } }`; FormView's native model-save
  (which emits flat dotted keys) cannot be used.
- **Server validation errors are a single message string** — django's
  `MojoException` handler returns `{ error, code, status: false }`, not a
  field-keyed dict. ⇒ surface errors as a toast, not inline per field.

### Steps

1. **New file `src/extensions/admin/account/groups/GroupAuthConfigSection.js`**
   — `class GroupAuthConfigSection extends View`.
   - **Module constants:** `LOGIN_METHODS` (`password,sms,passkey,magic,google,
     apple`), `REGISTRATION_METHODS` (`password,google,apple`), `PASSKEY_PROMPTS`
     (`off,optional,required`), `LAYOUTS` (`card,fullscreen`),
     `CANONICAL_REG_FIELDS` (`first_name,last_name,email,phone,dob,password`),
     `VERIFY_OPTS` (`'' , email, sms`), `DEFAULT_REG_FIELDS` (register_schema's
     documented default: first_name/last_name optional, email
     required+verify:email, password required). A **`FIELD_MAP`** — ordered
     descriptors `{ formName, path, kind }` mapping each form field to its
     dotted path under `auth_config`; single source of truth for load + save.
   - **Template:** `<div data-container="auth-config-form">` plus a footer with
     **Save** (`data-action="save-auth-config"`) and **Reset changes**
     (`data-action="reset-auth-config"`) buttons and one self-documenting intro
     line. Inline `<style>` with light + dark (`[data-bs-theme="dark"]`) rules.
   - **`onInit()` (async):** read the group's own override
     `this.model.get('metadata')?.auth_config`; fetch the **resolved** config via
     `app.rest.GET('/api/auth/config', { group_uuid: this.model.get('uuid') })`
     (unwrap `resp.data?.data ?? resp.data`); compute the **baseline** per field
     = own-override value if present, else resolved value; build the `tabset`
     field config with `data` = baseline and resolved values as `placeholder:`
     on text fields; construct the `FormView` (**no `model:`**, `containerId:
     'auth-config-form'`, no `submitButton`); `addChild(formView)`. Stash
     `this._baseline`, `this._resolved`.
   - **`onActionSaveAuthConfig()`:** `formView.validate()` → on fail
     `focusFirstError()` + return; explicit guard that `login.methods` is
     non-empty; `getFormData()`; diff each `FIELD_MAP` entry vs `_baseline`
     (scalars by trimmed string, method arrays order-insensitive, `min_age`
     number/null); assemble `registration.fields` from the 18 grid inputs
     (canonical order, `password` forced `required:true,verify:null`), include
     only if changed; build nested `{ metadata: { auth_config: {…changed…} } }`;
     empty → toast "No changes" + return; `showLoading()` →
     `await this.model.save(payload)` → `hideLoading()`; on `resp.status === 200`
     toast success, recompute baseline, repopulate; else toast the error string.
   - **`onActionResetAuthConfig()`:** repopulate the FormView from `_baseline`.
   - **Helpers:** `_buildFields()`, `_assembleRegFields(formData)`,
     `_seedRegGrid(fieldsArray)`, `_diffPayload(formData)`, a small
     `_setPath(obj,'a.b.c',val)` unflatten helper.

2. **`src/extensions/admin/account/groups/GroupView.js`** — `import
   GroupAuthConfigSection from './GroupAuthConfigSection.js';`; instantiate
   `const authConfigSection = new GroupAuthConfigSection({ model });`; add a
   `sections` entry in the **Detail** group, before Metadata: `{ key:
   'AuthConfig', label: 'Auth Config', icon: 'bi-box-arrow-in-right', view:
   authConfigSection, permissions: 'manage_group' }`; stash
   `this.authConfigSection`.

3. **`CHANGELOG.md`** — add an `### Admin · Group Auth Config editor` entry under
   Unreleased. **`docs/web-mojo/extensions/Admin.md`** — add a short subsection
   documenting the new GroupView section (mirroring the Webhooks subsection).

### Design Decisions

- **FormView as renderer only; the section owns load/save** — forced by the
  critical findings above. The section builds the nested
  `{ metadata: { auth_config: {…} } }` payload itself; FormView is constructed
  without `model:` and without a `submitButton`.
- **One `FormView` + `tabset`** — `{ type:'tabset', tabs:[Theme, Login,
  Registration] }`. FormView natively populates/extracts tabset fields and
  `focusFirstError()` auto-switches to the tab holding the first invalid field.
  - **Theme tab:** `text` for `app_title, logo_url, favicon_url,
    hero_image_url, hero_headline, hero_subheadline, back_to_website_url,
    terms_url, api_base, success_redirect, custom_css_url`; `select` `layout`;
    `textarea` `custom_css`. Every field carries `help:` text.
  - **Login tab:** one `multiselect` → `login.methods` (6 options).
  - **Registration tab:** `toggle` `enabled`; `select` `passkey_prompt`;
    `select` `identity_field` (Auto=`''`/Email/Phone); `number` `min_age`;
    `multiselect` `methods` (3 options); then the **fixed 6-row field-schema
    grid** — one FormBuilder `group` per canonical field (title = field label)
    holding an *include* `toggle`, a *required* `toggle`, and a *verify*
    `select`. The `password` group renders include + required `disabled`.
- **Baseline rule (unified):** each field is populated with
  own-override-if-present-else-resolved; the diff compares against that same
  baseline. Untouched fields are never sent → keep inheriting; django's
  recursive `metadata` deep-merge preserves sibling keys. Text fields show the
  resolved value as `placeholder` (cosmetic inherit cue).
- **Server errors → toast** — single `error` message string from django;
  surfaced via `app.toast.error(...)`, mirroring `GroupView._saveField`.
- **`manage_group` gate** on the section entry, matching the existing Webhooks
  section precedent (hidden when the user lacks the permission).

### Edge Cases

- Group has no `uuid` → skip the resolved fetch; baseline falls back to
  own-override + static documented `DEFAULT_AUTH_CONFIG` values for placeholders.
- `/api/auth/config` fetch fails → degrade gracefully (own-override baseline +
  static defaults), no hard error.
- Resolved `registration.fields` is `null` (the default) → seed the grid from
  `DEFAULT_REG_FIELDS`.
- Empty `login.methods` → blocked client-side (explicit guard) and server-side;
  toast either way.
- No changes on Save → toast "No changes", no request.
- Clearing a previously-saved field writes `""` (deep-merge can't delete a
  key) — accepted v1 limitation; a true "Clear overrides" reset is out of scope.
- After a successful save → recompute baseline from refreshed `model`
  attributes so subsequent diffs are correct.
- Light + dark theme verified for the section's `<style>` block.

### Testing

- `npm run lint`.
- `npm run test:unit` — if the assemble/diff helpers are extracted as pure
  functions, add a small unit file covering grid→array assembly (`password`
  always required) and the payload diff; otherwise verify manually.
- Manual: `npm run dev` → portal → open a Group → **Auth Config** — edit fields
  across all three tabs, Save, confirm `metadata.auth_config` persisted and
  `metadata.portal` / `timezone` / `domain` survive; confirm untouched fields
  are not sent; trigger a 400 (bad `custom_css`) and confirm the toast; flip
  light/dark; confirm the section is hidden without `manage_group`.

### Docs Impact

- `CHANGELOG.md` — new Unreleased entry (release-facing admin feature).
- `docs/web-mojo/extensions/Admin.md` — new GroupView "Auth Config" subsection.
- No core framework docs change (no public API added).

## Resolution

**Status:** done · Commit `cc440a0`

### What was implemented

A new **Auth Config** section in the admin `GroupView` for editing a group's
`metadata.auth_config` through a form instead of raw JSON.

- **`GroupAuthConfigSection`** — a `View` embedding one `FormView` with a 3-tab
  `tabset` (Theme / Login / Registration). FormView is used as a pure
  renderer; the section owns load and save.
- **Load:** reads the group's own `metadata.auth_config` override and fetches
  the resolved/inherited config from `GET /api/auth/config?group_uuid=<uuid>`
  (falls back to documented `STATIC_DEFAULTS` if the fetch fails or the group
  has no UUID). Each field is seeded with the own-override value if present,
  else the resolved value; text/number fields show the resolved value as
  placeholder.
- **Save:** diffs the form against that baseline and writes only changed keys
  as a nested `{ metadata: { auth_config: {…} } }` via `model.save()` —
  django deep-merges the `metadata` JSONField, so sibling keys survive and
  untouched fields keep inheriting. `login.methods` is guarded non-empty
  client-side; server validation errors surface as a toast.
- **Registration field schema** is a fixed 6-row grid (include / required /
  verify per canonical field; the `password` row is locked on).
- Wired into `GroupView` as a `manage_group`-gated section under the **Detail**
  divider, before **Metadata**.

### Files changed

- `src/extensions/admin/account/groups/GroupAuthConfigSection.js` — new (~470 lines).
- `src/extensions/admin/account/groups/GroupView.js` — import, instantiate, add
  the `AuthConfig` section entry, stash the reference.
- `CHANGELOG.md` — Unreleased entry.
- `docs/web-mojo/extensions/Admin.md` — new "Auth Config — per-group editor"
  subsection.

### Tests run

- `npx eslint` on both changed `src/` files — clean (0 errors, 0 warnings).
- `npm run test:unit` — 1162/1169 passed. The 7 failures are pre-existing
  Incident-area tests (`ListView is not a constructor`); verified identical on
  the clean baseline via `git stash` — no regressions.
- `npm test` (via test-runner agent) — 1304/1311 passed; same 7 pre-existing
  Incident failures, zero new regressions.

### Agent findings

- **test-runner:** zero regressions; the 7 Incident failures are pre-existing
  and unrelated.
- **docs-updater:** no further docs needed — `CHANGELOG.md` and `Admin.md`
  cover the change fully; `GroupAuthConfigSection` is internal to `GroupView`,
  not a standalone export.
- **security-review:** no exploitable issues. Permission gate correct and
  consistent; resolved-config values are used only as placeholder text and
  form initial values (never `innerHTML` / triple-brace); the one `type:'html'`
  field is a hardcoded literal with no interpolation; no secrets.

### Follow-ups (out of scope, as planned)

- A "Clear overrides" / reset-to-inherited affordance — django's recursive
  deep-merge cannot delete a key, so clearing a previously-saved field writes
  an explicit `""`. A true un-set would need a metadata-level `__replace`.
- Live preview of the themed login page; editing the deployment-wide
  `AUTH_CONFIG`.
