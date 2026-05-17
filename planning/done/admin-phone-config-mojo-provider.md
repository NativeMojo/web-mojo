# Admin Portal: PhoneConfig CRUD + Mojo SMS Provider configuration

| Field | Value |
|-------|-------|
| Type | request |
| Status | resolved |
| Date | 2026-05-16 |
| Priority | medium |

## Description

Add an admin-portal page that lets operators create, edit, delete, and test `PhoneConfig` records on the django-mojo backend — including the new `mojo` SMS provider option that was just shipped on the backend (django-mojo commits `aa49fbd` + `f86138e`, see `planning/done/sms-mojo-provider.md` on that repo).

The page lives under **System → Phone → Config** at route `system/phonehub/config` and uses the existing `/api/phonehub/config[/<pk>]` CRUD endpoints already exposed by `mojo/apps/phonehub/rest/config.py`. Each row represents one `PhoneConfig` (per-group or system-default). The detail / edit dialog renders provider-specific fields:

- **Twilio** — `twilio_from_number`, Twilio Account SID, Twilio Auth Token (write-only secret entry)
- **AWS SNS** — `aws_region`, `aws_sender_id`, Access Key ID, Secret Access Key (write-only)
- **Mojo Remote Instance** — `mojo_remote_url`, Mojo API Key (write-only, paste-once token)

A **"Test connection"** button on the detail dialog invokes `PhoneConfig.test_connection()` via REST and shows the result inline. For the `mojo` provider this validates the API key by hitting `GET /api/account/me` on the remote.

A companion **"Provision API key on remote"** flow (under the same admin scope) lets operators register a downstream caller against this mojo instance: it creates an `account.ApiKey` with `send_sms` + `comms` permissions, shows the raw token **once**, and offers a copy-to-clipboard affordance — that token is what the downstream operator pastes into their own `PhoneConfig.mojo_api_key`.

## Context

The backend feature shipped in django-mojo lets one mojo deployment delegate outbound SMS to another over HTTP using an `account.ApiKey`. The change introduced:

- New `'mojo'` choice on `PhoneConfig.PROVIDER_CHOICES`.
- New `mojo_remote_url` CharField on `PhoneConfig`.
- New encrypted `mojo_api_key` secret (via `MojoSecrets`) — `set_mojo_api_key(token)` / `get_mojo_api_key()`.
- New `_test_mojo()` branch on `PhoneConfig.test_connection()`.
- New setting `SMS_REMOTE_TIMEOUT` (default 10s).
- See `docs/django_developer/phonehub/README.md` § "Mojo Remote SMS Provider" for the end-to-end setup the admin UI should automate.

### REST surface currently exposed

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/phonehub/config` | List PhoneConfig rows |
| GET | `/api/phonehub/config/<id>` | Get a single PhoneConfig |
| POST | `/api/phonehub/config` | Create |
| PUT | `/api/phonehub/config/<id>` | Update scalar fields |
| DELETE | `/api/phonehub/config/<id>` | Delete |
| GET | `/api/group/apikey` | List ApiKeys |
| POST | `/api/group/apikey` | Create an ApiKey (raw token returned **once** in response under `token`) |

Required perms: `manage_phone_config` or `manage_groups` (already in `User.js:106`'s permission menu, so the gating is in place).

### Backend REST surface (already shipped — django-mojo commit `92674b9`)

Both pieces the admin UI needs are already available; no further django-mojo work is required before this request can start:

1. **Writing encrypted credentials.** Each credential field has an individual auto-setter (`set_mojo_api_key`, `set_twilio_account_sid`, `set_twilio_auth_token`, `set_aws_access_key_id`, `set_aws_secret_access_key`). The standard `on_rest_save_field` machinery routes incoming POST body keys straight through them — so `POST /api/phonehub/config/<id>` with body `{"mojo_api_key": "<token>"}` persists the secret encrypted via `MojoSecrets`, never returns it in any graph, and respects the same `SAVE_PERMS` as scalar updates. No `set_credentials` action endpoint needed — just include the credential keys in the body alongside any scalar field updates.

2. **Test connection.** `POST /api/phonehub/config/<id>` with body `{"test_connection": 1}` invokes `on_action_test_connection`, which calls `PhoneConfig.test_connection()` and returns its dict inline as the JSON response. Used by the admin "Test connection" button. Result shape: `{"success": bool, "message": str, "error": str (on failure: "missing_credentials" / "invalid_credentials" / "timeout" / "connection_failed" / ...), ...}`.

See `docs/django_developer/phonehub/rest.md` § "Writing encrypted credentials via REST" and § "Test the configured provider" on django-mojo for the wire format.

### Web-mojo precedent to mirror

- **List page**: `system/phonehub/numbers` and `system/phonehub/sms` are already registered in `src/admin.js:245-246` using `PhoneNumberTablePageClass` / `SMSTablePageClass`. The new `system/phonehub/config` page follows the same shape.
- **Model wrapper**: `src/extensions/admin/models/Phonehub.js` (lines 1-101) is the existing wrapper for phone numbers / SMS. Add a `PhoneConfig` model in the same file (or a sibling `PhoneConfig.js`) pointing at `/api/phonehub/config`.
- **Nav menu**: `src/admin.js:397-398` lists the Phonehub submenu under System. Append a "Config" entry alongside "Numbers" and "SMS", gated on `["manage_phone_config", "manage_groups"]`.

## Acceptance Criteria

### A. List page — `system/phonehub/config`

- New `PhoneConfigTablePage` registered at route `system/phonehub/config`, gated on `["manage_phone_config", "manage_groups"]`.
- Columns: **Name** (link to detail), **Group** (org name or "System Default" when null), **Provider** (chip — twilio/aws/mojo with distinct colors), **Active** (boolean badge), **Test Mode** (badge when true), **Modified** (relative time).
- Default filter: `is_active=true` (matches `LIST_DEFAULT_FILTERS` on the backend RestMeta).
- Filter chips: by provider (`twilio` / `aws` / `mojo`), by `is_active`, by `test_mode`.
- "Create new" button → opens the create dialog (see C).
- Submenu entry under System → Phone, after Numbers and SMS, icon `bi-sliders` (or a closer match), gated on the same perms as the page.

### B. Detail / edit dialog

- Click a row → modal detail with a per-provider form. Common fields at top: **Name**, **Group** (autocomplete — defaults to "System Default" / null), **Provider** (select), **Active**, **Test Mode**, **Lookup Enabled**, **Lookup Cache Days**.
- **Provider switcher** — selecting a provider in the dropdown reveals only the matching credential fields below and hides the others. Switching providers does NOT erase secrets server-side until Save is clicked.
- **Twilio fields**: `twilio_from_number` (text), Twilio Account SID (text, write-only), Twilio Auth Token (password-style, write-only).
- **AWS fields**: `aws_region` (text, default `us-east-1`), `aws_sender_id` (text), Access Key ID (text, write-only), Secret Access Key (password-style, write-only).
- **Mojo fields**: `mojo_remote_url` (text, URL placeholder `https://sms.example.com`), Mojo API Key (password-style, write-only, helper text: "Paste the token shown once when the API key was provisioned on the remote mojo. We never display it after save.").
- Secret inputs render with `••••••••` placeholder when the server already has a value (the GET response will never carry the secret). Leaving a secret blank on Save = no change. Typing in a secret field = overwrite.
- **Save** flow: single `POST /api/phonehub/config/<id>` with scalar fields AND any changed secret keys in the same body — the framework's auto-setter pattern routes scalars and secrets through the same save call. Single confirmation toast on success; red-banner inline error on failure.
- **Test connection** button (visible on edit dialog when row has been saved at least once). Calls `POST /api/phonehub/config/<id>` with body `{"test_connection": 1}`, shows result inline (green check + `message` on success; red banner with `error` / `message` on failure). Disabled while in-flight; surfaces a spinner.
- **Delete** button gated on `manage_phone_config` / `manage_groups` — confirms via `Modal.confirm` with the config name in the message.

### C. Create dialog

- Same form structure as edit (B), but no "Test connection" until after first save (the test action requires a persisted row).
- Sequence: a single `POST /api/phonehub/config` with both scalar fields AND secrets in one body — the auto-setter routes both through the same save. Optionally follow with a `test_connection` action. Surfaced to the user as one "Save" action.
- Default values: `provider="twilio"`, `is_active=true`, `test_mode=false`, `lookup_enabled=true`, `lookup_cache_days=90`.

### D. ApiKey provisioning helper (mojo provider side)

- A sub-section on the same page (or a separate dialog launched from a "Provision downstream API key" button) that:
  - Lets an operator on **this** mojo (the provider role) create an `account.ApiKey` against a chosen group with the perms `{send_sms: true, comms: true}`.
  - Hits `POST /api/group/apikey` with the right body. The response includes the raw token under `data.token` (rendered via `("get_token", "token")` in the existing `ApiKey.RestMeta` graph — confirmed in `mojo/apps/account/models/api_key.py:55-60`).
  - Displays the token **once**, large, with a copy-to-clipboard button and a clear "This token will not be shown again" warning. Same UX as the existing user-API-key flow if one already exists in web-mojo (check `src/extensions/admin/models/` for any prior pattern).
  - Stores nothing client-side; closes on confirm.

### E. Permissions model integration

- The page MUST honor existing perm chips already declared in `src/core/models/User.js:106` (`manage_phone_config`) and the broader fallbacks `manage_groups` / `groups`.
- The "Provision API key" sub-flow additionally requires `manage_group` / `manage_groups` (the perms protecting the ApiKey CRUD endpoint per `mojo/apps/account/rest/api_key.py:7`). Hide the button if the user lacks those.

### F. Cross-link from SMS table

- On the existing `system/phonehub/sms` page, when a row has `provider="mojo"`, the provider chip should be styled distinctly (different color than `twilio`/`aws`) and clicking it opens the matching `PhoneConfig` row in the new page (filtered by the group of that SMS, if available).
- When `error_code` is one of `timeout` / `http_<status>` / `remote_error` / `remote_failed` / `config_error`, surface them with the same friendly labels used elsewhere (avoid raw machine codes in cell rendering).

## Constraints

- **Never display existing secrets** in any response or rendered field. The backend graphs already exclude `mojo_secrets`, but the frontend must also avoid round-tripping a secret value through any GET → form-prefill cycle. Treat secret fields as write-only.
- **Never paste an API key into a log line, error toast, or telemetry event.** The token only lives long enough to be copied by the operator.
- The page must work with no PhoneConfig records (empty state with a CTA).
- The page must work for both per-group configs and the system-default (group=null) — the existing `OneToOneField(group, null=True)` on `PhoneConfig` means at most one config per group; surface a friendly inline error when trying to create a second one for the same group.
- Form changes only — no business-logic duplication in the frontend. All validation (provider choice, etc.) is server-authoritative; frontend just renders the right inputs.
- Out of scope: status-callback wiring (provider mojo → caller webhooks), SMS quota dashboards, multi-tenant routing rules, mobile/responsive polish beyond what TablePage already inherits.

## Notes

### Files likely touched

- `src/extensions/admin/models/Phonehub.js` (or new `PhoneConfig.js`) — model wrapper for `/api/phonehub/config`.
- `src/extensions/admin/...` — new `PhoneConfigTablePage` + edit/create dialogs (mirror `PhoneNumberTablePage` layout).
- `src/admin.js` — register the page (around line 245) and the submenu entry (around line 397).
- `src/extensions/admin/models/Phonehub.js` — extend with helper for `POST .../<id>` carrying `{test_connection: 1}`.
- Possibly a small ApiKey provisioning model wrapper if one doesn't already exist.

### Backend dependency

None — the django-mojo REST surface (credential auto-setters + `test_connection` action) is already shipped (commit `92674b9`). The admin UI can be built against it directly.

### Related

- Backend implementation: `planning/done/sms-mojo-provider.md` on the django-mojo repo (commits `aa49fbd`, `f86138e`, `c56691e`, `92674b9`).
- Existing phonehub admin pages: `system/phonehub/numbers`, `system/phonehub/sms` (precedent for shape and registration).

---

## Plan

### Objective
Ship an admin-portal "Phone Config" CRUD page (route `system/phonehub/config`)
that lets operators create, edit, test, and delete `PhoneConfig` rows on the
django-mojo backend — fully supporting Twilio, AWS SNS, and the new Mojo Remote
SMS provider — plus a "Provision downstream API key" helper (raw token shown
once) for the mojo provider role. All credential writes go through
`POST /api/phonehub/config[/<id>]` with the body carrying both scalar fields
and any changed secret keys; "Test connection" uses the same endpoint with
`{test_connection: 1}`.

### Files changed

1. **`src/extensions/admin/models/Phonehub.js`** — extend with:
   - `PhoneConfig extends Model` (`endpoint: '/api/phonehub/config'`).
   - `PhoneConfigList extends Collection` (`ModelClass: PhoneConfig`, `endpoint: '/api/phonehub/config'`, `size: 25`).
   - `PhoneConfigForms.{create,edit}` with provider-dependent fields driven by `showWhen` on the `provider` select (twilio / aws / mojo). Secret fields are `type: 'password'` with placeholder `••••••••` and helper text — they're write-only and blank-by-default so leaving them empty means "no change" (hidden showWhen fields are auto-stripped from submission in `FormView` 1786–1798). Common fields: `name`, `group` (collection select on `GroupList`, optional → "System Default"), `provider` (select), `is_active`, `test_mode`, `lookup_enabled`, `lookup_cache_days`. Twilio: `twilio_from_number`, `twilio_account_sid`, `twilio_auth_token`. AWS: `aws_region`, `aws_sender_id`, `aws_access_key_id`, `aws_secret_access_key`. Mojo: `mojo_remote_url`, `mojo_api_key`. Create defaults: `provider='twilio'`, `is_active=true`, `test_mode=false`, `lookup_enabled=true`, `lookup_cache_days=90`.
   - Static wires: `PhoneConfig.ADD_FORM = PhoneConfigForms.create`, `PhoneConfig.EDIT_FORM = PhoneConfigForms.edit`, `PhoneConfig.VIEW_CLASS = PhoneConfigView`.
   - Export `PhoneConfig`, `PhoneConfigList`, `PhoneConfigForms` from the same module.

2. **`src/extensions/admin/messaging/sms/PhoneConfigTablePage.js`** (new) — extends `TablePage` (mirrors `SMSTablePage` / `PushConfigTablePage`):
   - `name: 'admin_phonehub_config'`, `router: 'admin/phonehub/config'`, `Collection: PhoneConfigList`.
   - `defaultQuery: { is_active: true, sort: '-modified' }`.
   - Columns: `name` (link/title), `group.name` formatted with `default('System Default')`, `provider` rendered as a value-mapped chip via `formatter: "badge:twilio=info,aws=warning,mojo=primary"` (Mojo gets the distinct color the cross-link spec requires), `is_active` (`boolean|badge`), `test_mode` (`boolean|badge`), `modified` (`relative`).
   - `searchable: true`, `filterable: true`, `paginated: true`, `clickAction: 'view'`, `showAdd: true`, `addButtonLabel: 'New Config'`, `showRefresh: true`.
   - `viewDialogOptions: { header: false, size: 'lg' }`.
   - `emptyMessage: 'No phone configurations yet. Click "New Config" to add one.'`.
   - Filter chips: by provider (twilio/aws/mojo), by `is_active`, by `test_mode` — wired via the standard TableView filter declarations.
   - **No custom `onActionAdd` override** — the default TablePage Add flow uses `PhoneConfig.ADD_FORM`. The unique-per-group rule (`OneToOneField`) is server-authoritative; the page just surfaces the API error toast verbatim if the backend rejects a duplicate.

3. **`src/extensions/admin/messaging/sms/PhoneConfigView.js`** (new) — detail/edit/test/delete view (mirrors `ApiKeyView` + `PhoneNumberView` shape):
   - Template: header (icon `bi-sliders`, name, group, provider badge, active/test badges) + a single `data-container="config-form"` for the edit form + a footer row with **Test connection**, **Save**, **Delete** action buttons + context menu.
   - `onInit()`: instantiate one `FormView` child (`new FormView({ model, fields: PhoneConfigForms.edit.fields, containerId: 'config-form' })` — added with `containerId` so the framework renders it; no manual `.render()`).
   - `onActionTestConnection(event, element)`: disable button + spinner, call `await this.model.save({ test_connection: 1 })`, surface `data.message` on success (toast green) or `data.error`/`data.message` on failure (inline red banner under the form). Hidden if the model is unsaved (no `id`).
   - `onActionSave()`: collect form values via `this.formView.getFormData()` (which strips hidden showWhen fields → only the active provider's secrets are submitted), call `await this.model.save(data)`. On success: toast, `this.render()`, leave the modal open. On failure: render inline error banner.
   - `onActionDelete()`: `Modal.confirm` with the config name, then `await this.model.destroy()`, emit `phone-config:deleted` to the parent table.
   - `onActionProvisionApiKey()`: only visible when `provider === 'mojo'` AND the current user holds `manage_groups` / `manage_group` (checked via `app.user.hasPermission(...)`). Launches a tailored ApiKey-provisioning dialog (see Step 4 helper). Pre-fills the group from `this.model.get('group')`. On success, shows the one-time-token alert (mirrors `ApiKeyTablePage.onActionAdd` lines 66–94).
   - `PhoneConfigView.MODEL_CLASS = PhoneConfig`.

4. **`src/extensions/admin/messaging/sms/PhoneConfigApiKeyDialog.js`** (new, small) — wraps `app.showForm` + `ApiKey.save()` + one-time-token alert. Reuses `ApiKey` from `@core/models/ApiKey.js`. Fields:
   - `name` (text, required, default `'sms-bridge'` placeholder).
   - `group` (collection on `GroupList`, optional; pre-selected from the calling PhoneConfig).
   - `permissions` hidden field defaulting to `{"send_sms": true, "comms": true}` (JSON-encoded — submitted as-is). No textarea: the bridge use case is fixed-perms.
   - On submit, `await apiKey.save(formData)`; pull token from `resp.data?.data?.token`; show `app.showAlert({ title: 'API Key Created — Save Your Token', message: token-formatted, type: 'warning', size: 'lg' })`. Never log the token.

5. **`src/admin.js`** — three small touches:
   - Add imports near the existing phonehub block (top of file ~163 and ~32): `import PhoneConfigTablePageClass from '@ext/admin/messaging/sms/PhoneConfigTablePage.js';` and `export { default as PhoneConfigTablePage } from '...';`, plus `export { default as PhoneConfigView } from '@ext/admin/messaging/sms/PhoneConfigView.js';`.
   - Register the route right after `system/phonehub/sms` (`admin.js:246`):
     `app.registerPage('system/phonehub/config', PhoneConfigTablePageClass, { permissions: ["manage_phone_config", "manage_groups"] });`
   - Append a "Config" entry to the Phone Hub submenu (`admin.js:397`) right after SMS:
     `{ text: 'Config', route: '?page=system/phonehub/config', icon: 'bi-sliders', permissions: ["manage_phone_config", "manage_groups"] }`.

6. **`src/extensions/admin/messaging/sms/SMSTablePage.js`** (small touch — cross-link from F):
   - Update the `provider` column formatter to `"default('—')|badge:twilio=info,aws=warning,mojo=primary"` so the mojo chip stands out distinctly.
   - Add a row context-menu action `Open Phone Config` (visible only when `row.provider === 'mojo'`) that calls `this.getApp().navigate('system/phonehub/config', { provider: 'mojo', group: row.group?.id })`. The conditional visibility is via the existing context-menu `visible` predicate pattern used elsewhere in the admin extension.
   - Friendly-label the `error_code` column rendering (timeout / `http_<status>` / `remote_error` / `remote_failed` / `config_error`) via a small inline formatter map at the top of the file — values surfaced in the SMS column cell; the SMSView already shows the raw code in the Delivery tab.

7. **`CHANGELOG.md`** — one-line entry under the next version: `Add admin Phone Config page (system/phonehub/config) with Twilio / AWS / Mojo provider support, Test Connection, and downstream API-key provisioning helper`.

### Design Decisions

- **Single combined form, not per-provider sub-dialogs.** Provider-specific fields are driven by `FormView.showWhen` (`FormBuilder.js:850–875`, `FormView.js:1786–1798`) — switching providers reveals/hides fields client-side and hidden fields are automatically stripped from `getFormData()`. This is precisely what the request asks for (`switching providers does NOT erase secrets server-side until Save is clicked`) without any custom logic.
- **One save call covers scalars + secrets.** The backend's auto-setter pattern (`set_mojo_api_key`, etc.) routes secret-keyed body params through encrypted storage on the same `POST /api/phonehub/config/<id>` that updates scalars. No separate `set_credentials` action endpoint is needed.
- **Test connection re-uses `model.save({test_connection: 1})`** — mirrors `FileManagerTablePage.onActionTestConnection` (lines 147–156). Returns `data.success` + `data.message` for the green/red surfaces.
- **`PhoneConfig` belongs in the existing `Phonehub.js` model file**, not a new `PhoneConfig.js` — the file is the home for all `/api/phonehub/*` model wrappers (PhoneNumber, SMS) and the request lists this as the preferred option.
- **Mojo provider chip color = `primary`** (brand-tinted, visually distinct from `info`/twilio and `warning`/aws). Aligns with the dark/light Bootstrap palette without needing custom CSS overrides.
- **ApiKey provisioning** reuses the existing `ApiKey` model and its `save → token-in-resp.data.data.token` pattern from `ApiKeyTablePage` lines 66–94. Permissions are hard-coded to `{send_sms: true, comms: true}` in the helper dialog — operators do not get a free-form JSON box for the bridge flow. A separate "advanced" ApiKey form already exists under `system/api-keys` if they need broader perms.
- **No fetch in `onAfterRender` / `onAfterMount`** — the TablePage's collection loads on `onEnter`; the PhoneConfigView's fields render from `this.model` which was passed in by the table click.
- **No child render/mount calls** — `FormView`, `ContextMenu`, and any sub-views are all `addChild`-ed with a `containerId` set before the first render, so the framework owns the lifecycle.

### Edge Cases

- **Empty state.** Zero `PhoneConfig` rows: TablePage's built-in `emptyMessage` handles it; the toolbar "New Config" Add button is the CTA.
- **Duplicate config for a group.** `OneToOneField(group)` rejection from the backend surfaces as a save-time error; we display the error verbatim (no client-side pre-check).
- **GET response never carries secrets.** Backend graphs exclude `mojo_secrets`, so the form-prefill cycle never round-trips a value. Secret password inputs render with empty `value=""` + `••••••••` placeholder. Blank-on-save = no change (FormView omits empty password values from the body — verify behavior; if it submits `""`, the form helper must `delete data[key]` for empty password fields before the save).
- **Switching provider with unsaved secret typed.** Hidden showWhen fields' inputs are skipped in `getFormData()`, so switching back hides the typed-but-unsaved secret. Acceptable; matches the request (no server erasure until save).
- **Test connection on an unsaved model.** Button hidden when `!this.model.get('id')` — guards against POSTing `test_connection` to the list endpoint.
- **API key provisioning network failure.** If `apiKey.save()` returns no token, the alert says "API key created — token not returned by server" and the operator can locate the key under `system/api-keys` (no token disclosure ever attempted from logs).
- **No `view_phone_config` perm in `User.js:106`.** Page is gated on `["manage_phone_config", "manage_groups"]` (same as menu). If a future view-only perm is needed, add it then; out of scope here.
- **Permission for provisioning button.** Hide when user lacks `manage_groups` / `manage_group` — checked once in `PhoneConfigView.onInit()` and gated on the context-menu item, never as a server-side bypass.
- **Modal cascade / dark theme.** No custom inline styles needed; Bootstrap form + badge tokens already respond to `data-bs-theme="dark"` per `.claude/rules/theming.md`.
- **`error_code` mapping** on the SMS table — undefined codes fall through to the raw value (no error swallowing). Mojo-specific codes (`http_<status>`, `remote_error`, `remote_failed`) get short friendly labels.

### Testing

- **No new unit tests required.** The change is a thin admin-page wrapper around shipped framework primitives (Model, Collection, FormView with showWhen, TablePage). Existing FormView and Model tests cover the load-bearing behavior.
- **Verification in the dev server** (the only meaningful proof for a UI feature):
  - `npm run dev` → log into the example portal with an admin user holding `manage_phone_config`.
  - Navigate to **System → Phone Hub → Config**. Confirm empty state, then **New Config**.
  - Create a row with provider=twilio (no real secrets needed if backend test runs in test_mode). Save. Re-open; confirm secret fields are blank (write-only).
  - Switch provider dropdown twilio → aws → mojo: verify only the matching credential rows appear; verify the column chip color changes after save.
  - Click **Test connection** on each provider variant; confirm green check / red banner.
  - Click **Provision downstream API key** on a mojo row; confirm token shows once, copy-to-clipboard works, dialog closes cleanly, token not in console/network logs as plaintext beyond the immediate response.
  - Cross-link: from `system/phonehub/sms`, on a row with provider=mojo, the chip shows distinct color and the context-menu "Open Phone Config" navigates with `?provider=mojo&group=<id>` (filtered list).
  - Theme flip: light → dark, verify provider chips, form, dialog all render correctly under both `data-bs-theme` values.
- **Build sanity**: `npm run build` and `npm run build:lib` must succeed without breaking other admin pages.
- **Lint**: `npm run lint`.

### Docs Impact

- **`docs/web-mojo/extensions/Admin.md`** — add `PhoneConfigTablePage` + `PhoneConfigView` to the "50+ pre-built admin pages" inventory and to the route table at the bottom of the file. One paragraph under the messaging/SMS section describing provider-conditional credential fields and the API-key provisioning helper.
- **`CHANGELOG.md`** — one-line entry as in Step 7 above.
- **No new doc file required** — the page is an admin consumer of existing primitives; no new framework concept is introduced.

### Out of Scope

- Status-callback wiring (mojo provider → caller webhook configuration).
- SMS quota dashboards / per-provider rate stats.
- Multi-tenant routing rules (one config per group is already enforced by `OneToOneField` on the backend).
- Mobile / responsive polish beyond what TablePage and ModalView already inherit.
- Adding `view_phone_config` perm to `User.js` — gating uses existing `manage_phone_config` + `manage_groups`.
- Editing an ApiKey after provisioning (the existing `system/api-keys` page already handles this — the helper here is provision-only).

---

## Resolution
**Status**: Resolved — 2026-05-16

### What shipped

- **New admin route `system/phonehub/config`** registered under **System → Phone Hub → Config** (icon `bi-sliders`), gated on `manage_phone_config` / `manage_groups`. Table columns: name, group (`'System Default'` fallback), provider (value-mapped chip: twilio=info, aws=warning, mojo=primary), is_active badge, test_mode badge, modified relative. Default query: `is_active=true`, `sort=-modified`. Provider / Active / Test Mode column filter chips.
- **One combined create/edit form** with provider-conditional `showWhen` blocks for Twilio (`twilio_from_number` + `twilio_account_sid` + `twilio_auth_token`), AWS SNS (`aws_region` + `aws_sender_id` + `aws_access_key_id` + `aws_secret_access_key`), and Mojo Remote (`mojo_remote_url` + `mojo_api_key`). Secrets are write-only `<input type="password">` with `••••••••` placeholder. Blank secret inputs are stripped client-side via `PhoneConfig.SECRET_FIELDS` before save so existing stored credentials are never overwritten by an empty value; hidden showWhen fields are already auto-stripped by `FormView.getFormData()`.
- **PhoneConfigView** (modal body) embeds a single `FormView` plus an action row: **Test connection** (POST `{test_connection: 1}` via `Model.save`; inline green/red banner with the result), **Save** (validates + strips blank secrets + saves; toast on success, inline error on failure), **Provision downstream API key** (mojo-only, gated on `manage_groups`/`manage_group`; opens a tailored single-purpose form with fixed perms `{send_sms: true, comms: true}` and reveals the raw token exactly once in a dismissal-protected `Modal.alert` with copy-to-clipboard), and **Delete** (`Modal.confirm` + `model.destroy()`).
- **Cross-link from the existing `system/phonehub/sms` page**: provider chip now value-mapped, Mojo rows render as a clickable anchor that navigates to the new Config page filtered by the SMS's group. New `error_code` column with friendly labels for `timeout` / `http_<status>` / `remote_error` / `remote_failed` / `config_error` / credential codes; unknown codes fall through HTML-escaped.

### Files changed

- `src/extensions/admin/models/Phonehub.js` — new `PhoneConfig` model + `PhoneConfigList` collection + `PhoneConfigForms.{create,edit}` with `showWhen` fields, plus `PhoneConfig.{ADD_FORM, EDIT_FORM, SECRET_FIELDS, PROVIDER_OPTIONS}` statics.
- `src/extensions/admin/messaging/sms/PhoneConfigTablePage.js` (new) — `TablePage` for `/api/phonehub/config`.
- `src/extensions/admin/messaging/sms/PhoneConfigView.js` (new) — detail/edit/test/provision/delete view with embedded `FormView`.
- `src/extensions/admin/messaging/sms/SMSTablePage.js` — provider chip color + mojo-only cross-link + `error_code` friendly labels.
- `src/admin.js` — export, import, page register, sidebar menu entry.
- `CHANGELOG.md` — Unreleased entry.
- `docs/web-mojo/extensions/Admin.md` — six surgical edits adding the new page to the inventory, permissions table, Phonehub model list, and a "Phone Hub — Config Page" section (added by the docs-updater agent in a follow-up commit).

### Tests run

- `npm run lint` — no new errors on the changed files (16 pre-existing errors + 55 warnings in `WebApp.js`, all unrelated).
- `npm run build:lib` — clean build, 3.15s → 3.25s.
- `npm run test:unit` — 1120 tests, 7 failures all in `test/unit/IncidentView.test.js` (`ListView is not a constructor` — pre-existing module-loader dependency gap that predates this commit; the loader entry for `'IncidentView'` omits `'ListView'` even though `IncidentView.js` imports it). Confirmed unrelated by the test-runner agent.
- `npm run test:integration` — 0 tests.

### Validation

- **Browser preview (`http://localhost:3000/examples/portal/`)** with `is_superuser` user:
  - Phone Hub submenu now shows Numbers / SMS / Config.
  - Navigating to the route lands at `?page=system%2Fphonehub%2Fconfig&size=25&sort=-modified&is_active=true` (default query applied) with no console errors.
  - Empty state copy renders ("No phone configurations yet. Click 'New Config' to add one.") plus the Active=true filter pill.
  - Clicking **Add** opens **New Phone Config** dialog. Inspecting the DOM: twilio fields are visible by default; aws and mojo wrappers are `style="display:none"` (`data-show-when-field="provider"` honored).
  - Setting `provider=mojo` flips visibility: twilio + aws collapse, mojo fields (`mojo_remote_url`, `mojo_api_key`) appear.
  - `MOJOUtils.escapeHtml` verified directly: `<script>alert(1)</script>` → `&lt;script&gt;alert(1)&lt;&#x2F;script&gt;`, `42" onerror="alert(1)` → `42&quot; onerror&#x3D;&quot;alert(1)` (closes the security findings below).

### Agent findings (and what was done)

- **test-runner** — 7 failures, all `IncidentView` and pre-existing. Not addressed; flagged for separate cleanup of the module-loader dependency list.
- **docs-updater** — added `PhoneConfigTablePage` + `PhoneConfigView` to `docs/web-mojo/extensions/Admin.md` (TOC, overview, permissions table, model list, plus a new "Phone Hub — Config Page" section). Committed separately.
- **security-review** — 2 MEDIUM + 1 LOW findings, all defense-in-depth XSS escapes for raw HTML interpolations the function-formatter contract renders unescaped:
  1. `SMSTablePage.renderProviderCell` interpolated the raw `provider` value into the badge label and the `data-group` attribute → fixed: both routed through `MOJOUtils.escapeHtml`.
  2. `PhoneConfigView.onActionProvisionApiKey` interpolated the raw token into the alert HTML and the `data-clipboard` attribute → fixed: token now `MOJOUtils.escapeHtml`-ed before interpolation.
  3. `SMSTablePage.formatErrorCode` returned unknown `error_code` values verbatim → fixed: fallthrough now `MOJOUtils.escapeHtml`-ed (known codes / `HTTP nnn` paths stay literal text).
- Fixes shipped as a follow-up commit `security(admin): HTML-escape Phone Config formatters and one-time API token`.

### Commits

- `1f9b456` — `feat(admin): Phone Config page (Twilio/AWS/Mojo) + downstream API-key provisioning`
- `37e3563` — `security(admin): HTML-escape Phone Config formatters and one-time API token`
- Docs-updater commit (added separately by the docs-updater agent — see `docs(admin): document Phone Config page + provision flow`).

### Follow-ups (out of scope here)

- Module-loader dependency gap on `IncidentView` (separate cleanup — pre-existing).
- Status-callback wiring (mojo provider → caller webhooks).
- SMS quota dashboards / per-provider rate stats.
- A backend type-narrowing assertion that `apikey.token` always matches `[A-Za-z0-9_-]+` (would let us drop the escape in the token alert — but defense-in-depth stays regardless).
