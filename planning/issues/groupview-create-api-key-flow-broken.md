# GroupView "Create Key" flow is broken: prompts for Group ID and never shows the token

| Field | Value |
|-------|-------|
| Type | bug |
| Status | planned |
| Date | 2026-05-16 |
| Severity | high |

## Description

In the admin extension's `GroupView`, the **Create Key** button in the **API Keys** section is fundamentally broken in two compounding ways:

1. The form asks the operator to type a numeric **Group ID** — but the current group is already known from context.
2. After save, the newly-created key's one-time **token is never displayed to the user**. The whole point of creating an API key is to capture the token; without it the key is useless.

The flow needs to be reworked end-to-end so the UX is solid: no manual ID entry, the key is scoped to the current group, and the raw token is surfaced once for the operator to copy.

## Context

- **User flow**: Admin → open `GroupView` → side-nav → **API Keys** → click **Create Key** in the toolbar.
- The dedicated global page `ApiKeyTablePage` already implements the right UX (form → save → show one-time token alert) at `src/extensions/admin/account/api_keys/ApiKeyTablePage.js:66-94`. That behavior is missing from the in-`GroupView` flow.
- The backend always returns the raw token in the create response. From `django-mojo/mojo/apps/account/models/api_key.py`:
  - `on_rest_created` (line 241-245) generates the token after the row is created.
  - The `default` GRAPH (line 50-62) exposes it via `"extra": [("get_token", "token")]`.
  - So `POST /api/group/apikey` returns `resp.data.data.token` populated. The token is shown only at creation time.
- This makes the missing token-display in `GroupView` a real user-blocking bug — not a polish issue. A user who creates a key from `GroupView` cannot use the key they just made.

## Reproduction

1. Open the admin portal and navigate into any group via `GroupView` (e.g. `Modal.detail(new GroupView({ model }))`).
2. Click the **API Keys** section in the sidebar.
3. Click **Create Key** in the table toolbar.
4. Observe: the form contains a required **Group ID** number field that the operator must fill in by hand.
5. Fill it in and submit. Observe: the table refreshes with a new row, but **no token is shown anywhere**. The raw token is gone.

## Expected Behavior

Inside `GroupView`'s API Keys section, the **Create Key** flow should:

- **Not** ask the operator for a Group ID — that ID is already `this.model.id`.
- Persist the key scoped to the current group automatically.
- After a successful save, surface the one-time token (from `resp.data.data.token`) in a modal alert — same UX as `ApiKeyTablePage.onActionAdd` at `src/extensions/admin/account/api_keys/ApiKeyTablePage.js:81-90`:
  - title: "API Key Created — Save Your Token"
  - body: the token plus a clear "copy this now, it will not be shown again" warning
  - "warning" styling so it reads as important
- Make the token easy to copy (a clear monospaced field; a copy-to-clipboard button is a nice-to-have).
- Then refresh the API Keys table so the new row appears.

## Actual Behavior

- The form shown is the unmodified `ApiKeyForms.create` (defined at `src/core/models/ApiKey.js:51-81`), including the `group` field at line 64-71 ("Group ID", type: number, required).
- A typo or copy-paste from a different group silently scopes the new key to the wrong group — no warning, no validation.
- After save, the framework's default `ListView.onActionAdd` (`src/core/views/list/ListView.js:1638-1705`) inserts the model into the collection and calls `refresh()`. It **never inspects `resp.data.data.token`**, so the token is dropped on the floor.

## Affected Area

- **Files / classes**:
  - `src/extensions/admin/account/groups/GroupView.js:860-885` — API Keys `TableView` section (the broken spot)
  - `src/core/models/ApiKey.js:51-81` — `ApiKeyForms.create` (defines the global `group` field)
  - `src/extensions/admin/account/api_keys/ApiKeyTablePage.js:10-11,66-94` — sets `ApiKey.ADD_FORM` globally and has the correct token-display UX
  - `src/extensions/admin/account/api_keys/ApiKeyView.js` — reference for the detail view (does not handle creation)
  - `src/core/views/list/ListView.js:1638-1705,1760-1765` — generic add flow + `getAddFormConfig`
  - `src/core/views/table/TableView.js:77,888-891` — option wiring (`addForm`, not `addFormConfig`)
- **Backend reference**: `django-mojo/mojo/apps/account/models/api_key.py:50-62,237-245`
- **Layer**: Extension (admin) + View
- **Related docs**: `docs/web-mojo/components/TableView.md`, `docs/web-mojo/components/TablePage.md`, `docs/web-mojo/forms/README.md`

## Acceptance Criteria

- [ ] Inside `GroupView`, the **Create Key** form has no Group ID field.
- [ ] The newly created key is scoped to the current group (server receives `group === this.model.id`).
- [ ] On a successful save, a dialog opens with the raw token from `resp.data.data.token`, a copy button with success-flash feedback, a permissions preview, and a "this will not be shown again" warning.
- [ ] The token dialog cannot be dismissed by clicking the backdrop or pressing Esc (static backdrop).
- [ ] After the dialog closes, the API Keys table refreshes and the new row appears at the top (newest-first sort).
- [ ] The API Keys table shows a **Last used** column (sortable). For a never-used key it reads "Never"; for a recently-used key it reads in relative time (e.g. "3 hours ago").
- [ ] Each row has an inline **Delete** trash icon; clicking it opens the framework's standard confirm dialog and, on confirm, removes the key and refreshes the table.
- [ ] Clicking a row (anywhere outside the Delete icon) opens `ApiKeyView` in a detail modal (already happens via `VIEW_CLASS`; now wired explicitly via `itemView`).
- [ ] Empty state reads "No API keys yet. Click 'Create Key' to add one."
- [ ] The global `ApiKeyTablePage` flow is unchanged — its `Group ID` field still appears and its token alert still works.
- [ ] No regression to other `GroupView` sections (Members invite, Sub-Groups add, etc.).

## Investigation

- **Likely root cause:** Three compounding issues.

  1. **Wrong option name silently dropped.** `GroupView` passes `addFormConfig: { ...ApiKeyForms.create, defaults: { group: groupId } }` (line 870–873), but the framework reads the option as `addForm`, not `addFormConfig` (`src/core/views/table/TableView.js:77`, `src/core/views/list/ListView.js:174`). The custom config is silently dropped. The framework then falls through to `ApiKey.ADD_FORM` via `getAddFormConfig` (`ListView.js:1760-1765`), which `ApiKeyTablePage.js:10` set globally to the unmodified `ApiKeyForms.create`. This is why the operator sees the global form.

  2. **Custom `defaults` is not a recognized convention.** Even if `addForm` had been wired correctly, the `defaults` key embedded in the form config isn't read by `ListView.onActionAdd`. The closest existing knob is `addFormDefaults` (line 1674), but it would only pre-fill the visible field — not hide it. The `group` field would still be visible (just pre-filled) unless explicitly stripped.

  3. **No token surfacing in the generic flow.** `ListView.onActionAdd` (line 1677) calls `model.save(result)`, checks `resp?.data.status`, then adds the model and refreshes. It never inspects `resp.data.data.token`. That logic exists only in `ApiKeyTablePage.onActionAdd` (lines 81-90). `GroupView`'s API Keys section never overrides `onActionAdd`, so the token is irretrievable from the UI.

- **Confidence:** high. The fall-through path is mechanically traceable; the user-visible symptom matches the unmodified `ApiKeyForms.create` definition; the missing token alert is straightforwardly explained by the absence of an override.

- **Code path:**
  - `GroupView.js:860-885` — passes `addFormConfig` (silently ignored).
  - `TableView.js:888-891` → `super.onActionAdd` → `ListView.js:1638`.
  - `ListView.js:1653` → `getAddFormConfig(ApiKey)` → returns `ApiKey.ADD_FORM` (set globally at `ApiKeyTablePage.js:10` = `ApiKeyForms.create`).
  - Form rendered = `ApiKeyForms.create`, which includes the `group` field at `ApiKey.js:64-71`.
  - On submit, `ListView.js:1677` saves and refreshes; `resp.data.data.token` is discarded.
  - Backend response shape confirmed by `django-mojo/mojo/apps/account/models/api_key.py:50-62,237-245`.

- **Likely fix shape (for design phase, not prescriptive):**
  - Add an `onActionAdd` override on the API Keys `TableView` inside `GroupView` (or pass an `onAdd` handler — see `ListView.js:1639-1643`) that:
    1. Opens `Modal.form` with `ApiKeyForms.create.fields` filtered to drop `group` (mirroring the SubGroups pattern at `GroupView.js:1167`).
    2. Calls `model.save({ ...data, group: this.model.id })`.
    3. Reads `resp.data?.data?.token` and shows the same one-time-token alert as `ApiKeyTablePage`.
    4. Refreshes `apiKeysCollection`.
  - Alternative: introduce `ApiKeyForms.createInGroup` (no `group` field) in `src/core/models/ApiKey.js` so both call sites can be declarative. This is a small public-shape change — needs a CHANGELOG entry.

- **Regression test:** Not feasible in the current unit-test harness — the affected behavior is the composition of `TableView` + `ApiKeyForms` + the `ListView.onActionAdd` modal flow inside a `Modal.detail` dialog plus the post-save token alert. The existing unit suite does not exercise modal form rendering. Manual reproduction per the steps above is the practical check. A lightweight unit-level assertion is feasible later (e.g. "GroupView's API Keys section configures an add flow that does not expose a `group` field and surfaces the token after save").

- **Related files:**
  - `src/extensions/admin/account/groups/GroupView.js`
  - `src/core/models/ApiKey.js`
  - `src/extensions/admin/account/api_keys/ApiKeyTablePage.js`
  - `src/extensions/admin/account/api_keys/ApiKeyView.js`
  - `src/core/views/list/ListView.js`
  - `src/core/views/table/TableView.js`
  - `django-mojo/mojo/apps/account/models/api_key.py` (backend reference, read-only)

---

## Plan

### Objective

Fix the broken **Create Key** flow inside the admin `GroupView` → **API Keys** section AND bring the section's operational UX up to the same bar as the rest of `GroupView`. After this change:

1. The create form does not prompt for a Group ID — the current group is used automatically.
2. After save, the one-time API token is surfaced in a copy-friendly, dismissal-protected dialog (the current flow drops the token on the floor).
3. The table shows the operational signals an admin actually needs: **Name / Status / Permissions / Last used / Created** — adding `Last used` (sortable) so dormant keys can be found at a glance.
4. Rows expose a one-click **Delete** action; click-through still opens the full `ApiKeyView` for everything else (edit, activate/deactivate, etc).
5. Newest keys appear first; empty state is informative.
6. The standalone `ApiKeyTablePage` flow is untouched.

### Files Touched

| File | Action |
|------|--------|
| `src/extensions/admin/account/groups/GroupView.js` | Replace dead `addFormConfig` wiring with an `onAdd` handler; add `_createApiKey` + `_showApiKeyTokenDialog` methods; add `ApiKey` to the import line |
| `CHANGELOG.md` | One bullet describing the user-visible fix |

No framework-level changes. No backend changes. No new public API surface.

### Steps

1. **`src/extensions/admin/account/groups/GroupView.js:36`** — extend the existing import to bring in the `ApiKey` class, and add a new import for `ApiKeyView`:
   ```
   import { ApiKey, ApiKeyList, ApiKeyForms } from '@core/models/ApiKey.js';
   import ApiKeyView from '../api_keys/ApiKeyView.js';
   ```
   `ApiKey` is needed for the create flow; `ApiKeyView` is needed for the new explicit `itemView` wiring (see step 2).

2. **`src/extensions/admin/account/groups/GroupView.js:860-885`** — rebuild the API Keys `TableView` config:
   - **Delete** the dead `addFormConfig: { ...ApiKeyForms.create, defaults: { group: groupId } }` block (silently ignored today — framework reads `addForm`, not `addFormConfig`).
   - **Add `itemView: ApiKeyView`** — explicit dependency. Currently relies on the side-effect import `ApiKey.VIEW_CLASS = ApiKeyView` at `ApiKeyView.js:181` (only loaded because `ApiKeyTablePage` happens to import it). Mirror the SubGroups pattern at `GroupView.js:845`. Requires importing `ApiKeyView` from `'../api_keys/ApiKeyView.js'`.
   - **Add `actions: ['delete']`** — inline trash icon per row. Framework handles the entire flow via `ListView._onRowDelete` (`src/core/views/list/ListView.js:1602-1632`): confirm → `model.destroy()` → collection refresh. Zero extra code needed in `GroupView`.
   - **Replace `emptyMessage`** with `'No API keys yet. Click "Create Key" to add one.'`.
   - **Update `columns`** to:
     - `{ key: 'name', label: 'Name', sortable: true }` *(unchanged)*
     - Status template column *(unchanged)*
     - `{ key: 'permissions|keys|badge', label: 'Permissions' }` *(unchanged)*
     - **NEW** `{ key: 'last_used', label: 'Last used', formatter: "relative|default:'Never'", sortable: true, width: '140px' }` — `relative` (DataFormatter.md line 306-318) handles ISO datetime strings; `default:'Never'` (DataFormatter.md line 1068-1077) provides the fallback when the key has never been used.
     - `{ key: 'created', label: 'Created', formatter: 'datetime', sortable: true }` *(unchanged)*
   - **Set the collection's initial sort** by adding `sort: '-created'` to the `apiKeysCollection` `params` at `GroupView.js:796-798` (matches the `eventsCollection` / `auditCollection` pattern at lines 800-804).
   - The `onAdd` hook is wired in `onAfterBuild` (step 3) because `this` does not exist before `super()`.

3. **`src/extensions/admin/account/groups/GroupView.js:1027-1071` (`onAfterBuild`)** — add one line near the existing event wiring:
   ```
   this.apiKeysSection.options.onAdd = (event) => this._createApiKey(event);
   ```
   This makes `ListView.onActionAdd` (`src/core/views/list/ListView.js:1639-1643`) short-circuit its generic flow and call ours.

4. **`src/extensions/admin/account/groups/GroupView.js`** — add new `_createApiKey(event)` method on `GroupView`, modelled on the existing `onActionAddChildGroup` (`GroupView.js:1163-1181`):
   - `event?.preventDefault?.(); event?.stopPropagation?.();`
   - `Modal.form({ title: 'Create API Key', size: 'md', fields: ApiKeyForms.create.fields.filter(f => f.name !== 'group') })`.
   - If user cancels (`data == null`): return.
   - `const newKey = new ApiKey({ ...data, group: this.model.id });`
   - `const resp = await newKey.save();`
   - On failure (`!resp?.data?.status` or `resp?.status >= 400`): `this.getApp()?.toast?.error(resp?.data?.error || resp?.message || 'Failed to create API key')` and return — **do NOT** show the token dialog and **do NOT** refresh the collection.
   - Pull `const token = resp?.data?.data?.token` (shape verified against `django-mojo/mojo/apps/account/models/api_key.py:50-62,241-245`).
   - `await this._showApiKeyTokenDialog(token, newKey.get('name'));`
   - `await this.apiKeysCollection.fetch().catch(() => {});` (refresh failure should not block the dialog that already showed the token).

5. **`src/extensions/admin/account/groups/GroupView.js`** — add new `_showApiKeyTokenDialog(token, name)` method.

   **If `!token`** (legacy/unexpected backend response):
   - `this.getApp()?.toast?.success('API key created');` and return. The new row will still appear after the collection refresh.

   **Otherwise**, open `Modal.dialog` with the following shape:

   - **Modal options**:
     - `title: 'API Key Created — Save Your Token'`
     - `size: 'lg'` (so a 48-char token fits without wrapping)
     - `backdrop: 'static'` and `keyboard: false` (verified supported at `ModalView.js:119-120,499-503`) — only way out is an explicit button. Protects the show-once secret from accidental Esc / backdrop dismissal.

   - **Body** (HTML string, caller-controlled fields escaped via `MOJOUtils.escapeHtml`):
     1. **Success line** confirming what was created: `<div class="mb-3 fs-6"><i class="bi bi-check-circle-fill text-success me-2"></i>API key <strong>${escapeHtml(name)}</strong> created.</div>`
     2. **Warning banner** (Bootstrap-native, theme-aware): `<div class="alert alert-warning d-flex align-items-center mb-3" role="alert"><i class="bi bi-exclamation-triangle-fill me-2"></i><div>Save this token now — it will not be shown again.</div></div>`
     3. **Token block** — full-width monospace, single-click selects whole token (`user-select-all`), themed via Bootstrap tokens (light + dark from day one per `.claude/rules/theming.md`):
        ```
        <div class="p-3 rounded font-monospace text-break user-select-all"
             style="background: var(--bs-tertiary-bg);
                    border: 1px solid var(--bs-border-color);
                    font-size: 0.95rem; line-height: 1.4;
                    overflow-x: auto;"
             aria-label="API token">${escapeHtml(token)}</div>
        ```
     4. **Permissions preview** (so the operator can verify what was just granted): pulls `newKey.get('permissions')`, which may be a dict, a JSON string (form passes the textarea value through verbatim), or empty.
        - If empty / falsy / `{}`: `<div class="small text-secondary mt-3"><i class="bi bi-info-circle me-1"></i>No permissions granted — this key has read access only to public endpoints.</div>`
        - Otherwise: render the permission keys (after `JSON.parse` if string) as inline badges: `<div class="small mt-3"><span class="text-secondary me-2">Permissions:</span>${keys.map(k => `<code class="badge text-bg-light border me-1">${escapeHtml(k)}</code>`).join('')}</div>`
        - Wrap the parse in `try/catch` — if the textarea contained invalid JSON, fall through to the "no permissions" line (the backend coerces it to `{}` anyway per `api_key.py:85-86`).
     5. **Footnote** (small, muted): `<div class="small text-secondary mt-3">Treat this token like a password. Anyone with it can call this group's API on your behalf.</div>`

   - **Buttons**:
     - Primary "Copy token" `{ text: 'Copy token', icon: 'bi-clipboard', class: 'btn-primary', handler: async ({ dialog, button }) => { ... } }`:
       - If `!navigator.clipboard`: `this.getApp()?.toast?.warning('Clipboard unavailable — select and copy the token manually');` return `false` (keep open).
       - Otherwise: `await navigator.clipboard.writeText(token);` then run the same flash pattern as `Modal._showCopySuccess` (`Modal.js:822-836`) inline — swap the button's innerHTML to `<i class="bi bi-check me-1"></i>Copied!`, swap classes from `btn-primary` to `btn-success`, disable for ~2s, then restore. Return `false` (stay open).
       - On clipboard failure: `console.error(...)`; return `false`. The token remains visible — user can copy manually.
     - Secondary "Done" `{ text: 'Done', class: 'btn-secondary', dismiss: true }`. Bootstrap's primary-button focus default focuses **Copy token** when the dialog opens, so the operator can press Enter immediately.

6. **`CHANGELOG.md`** — add one bullet under the unreleased / next-version section:
   > **Admin (GroupView API Keys)** — fixed the Create API Key flow (no more Group ID prompt; one-time token now revealed in a copy-friendly dialog). Added a **Last used** column, inline row Delete, newest-first default sort, and an informative empty state.

### Design Decisions

- **Use `onAdd` not a subclass.** `ListView.onActionAdd` short-circuits to `options.onAdd` (`ListView.js:1639-1643`). That is the documented extension point and matches `GroupView`'s philosophy of composing built-in views rather than subclassing.
- **Filter the `group` field at the call site, not at the model.** SubGroups does the same in this file (`GroupView.js:1167`). Avoids adding `ApiKeyForms.createInGroup` for one consumer.
- **Custom `Modal.dialog` body, not `Modal.code` or `Modal.alert`.** `Modal.code` renders in a dark IDE theme that reads wrong for a token; `Modal.alert` has no place for a copy button. `Modal.dialog` with a custom body + button `handler` (documented pattern, see `_renderAndAwait` at `Modal.js:91-158`) gives warning + copy + Done with full control.
- **`backdrop: 'static'` + `keyboard: false`.** For a show-once secret, the cost of accidental dismissal is total loss of the token. Forcing an explicit button click is the GitHub / Stripe idiom for the same UX.
- **`user-select-all` over a "click to select" JS handler.** It's a one-line CSS class that ships in modern browsers and degrades to the same behaviour the user already gets (manual selection) on older ones. No JS needed.
- **No "did you save it?" double-confirm.** The static backdrop, warning banner, and obvious Copy button are the friction. Adding a second confirm is paternalistic.
- **Token reveal lives on the view, not in `Modal`.** Premature to add `Modal.tokenReveal()` — one caller today. Extract if/when `ApiKeyTablePage` adopts it.
- **Mirror existing patterns.** `_createApiKey` shape is a direct twin of `onActionAddChildGroup`. `_showApiKeyTokenDialog` button flash mirrors `Modal._showCopySuccess`. Keeps the file feeling consistent.

### Edge Cases

- **Save fails** (`!resp?.data?.status` or `resp?.status >= 400`): toast `resp?.data?.error || resp?.message || 'Failed to create API key'`. No dialog. No refresh.
- **Save succeeds, no token in response** (unexpected): success toast, refresh, skip dialog. User still sees the new row.
- **User cancels the form**: return without side effects.
- **`permissions` left blank**: pass through. Backend (`api_key.py:79-89`) tolerates missing / empty.
- **`permissions` invalid JSON**: backend currently silently coerces to `{}` (`api_key.py:85-86`). Separate UX concern, out of scope.
- **Clipboard API unavailable** (insecure context, very old browser): warning toast; dialog stays open; `user-select-all` keeps manual copy easy.
- **User dismisses via Done without copying**: their choice. The static-backdrop + warning are the safeguard; we trust the warning.
- **Theme**: `alert-warning` is Bootstrap-native and reads in both themes. Token block uses `var(--bs-tertiary-bg)` / `var(--bs-border-color)` — also auto-adapting per `.claude/rules/theming.md`.
- **`apiKeysCollection.fetch()` failure**: `.catch(() => {})` so the dialog isn't blocked by a transient network error. Next refresh will pick up the row.
- **Re-entrancy**: `Modal.form` is single-instance per call; nothing extra needed.
- **Long tokens**: `text-break` + `overflow-x: auto` on the token block handles tokens longer than the dialog width.
- **`permissions` field returned as a string vs dict**: when the user types JSON into the create form's textarea, `Modal.form` returns the string verbatim. The token-dialog's permissions preview must `try/catch` the `JSON.parse`. If it fails, render the "no permissions granted" fallback (matches backend coercion at `api_key.py:85-86`).
- **Row delete confirm message**: the framework default ("Are you sure you want to delete this {{name||'item'}}?") works because `ApiKey` has a `name` field. No custom `deleteTemplate` needed.
- **`last_used` sortable but mixed null/value**: backend sort handling is the same as for other nullable timestamps in the codebase; the column relies on the backend's `?sort=-last_used` semantics (Django REST handles null ordering). No client-side workaround needed.
- **Click target conflict between row click and inline Delete icon**: the framework's `_onRowDelete` wiring intercepts `data-action="delete"` on the delete button via event delegation before the row's `clickAction: 'view'` fires; this is the same dual-affordance pattern other admin tables use (e.g. any TableView with both `clickAction: 'view'` and `actions: ['delete']`).

### Testing

- **No automated regression test.** Per `.claude/rules/testing.md`, the custom test harness does not exercise `Modal.form` / `Modal.dialog` / Bootstrap modal lifecycle. Calling this out explicitly per the bug rule "If the bug is not testable with current harnesses, say so explicitly."

- **Manual verification (golden path — create + reveal)**:
  1. `npm run dev`, open admin portal, navigate into any group via `GroupView`.
  2. Sidebar → **API Keys** → **Create Key**.
  3. Verify the form shows only **Name** and **Permissions (JSON)** — no Group ID.
  4. Enter a name and a valid permissions JSON (e.g. `{"view_orders": true}`), submit.
  5. Verify the **API Key Created — Save Your Token** dialog opens with: success line, warning banner, monospace token block, permissions preview ("Permissions: view_orders"), and copy/done buttons.
  6. Press Esc and click the backdrop — both should be **ignored** (static).
  7. Click **Copy token**; verify clipboard contents by pasting into another app.
  8. Verify the button flashes "Copied!" then resets after ~2s.
  9. Click the token block once — verify the entire token is selected (`user-select-all`).
  10. Click **Done**; verify the table refreshes with the new row at the **top** (newest-first sort).

- **Manual verification (section UX)**:
  - Verify the table columns are: Name / Status / Permissions / **Last used** / Created.
  - For a freshly created key, **Last used** reads "Never".
  - After making one authenticated request with the new key (e.g. via `curl` against any group-scoped endpoint), refresh and verify **Last used** reads in relative time.
  - Click the **Last used** column header to sort ascending; verify "Never" entries group together.
  - Hover a row — verify the inline **Delete** trash icon is visible at the row's end.
  - Click **Delete**; verify the framework confirm dialog opens, click Confirm, verify the row disappears.
  - Click a row body (anywhere outside the trash icon); verify `ApiKeyView` opens in a modal.
  - Empty the group of keys; verify the empty state reads "No API keys yet. Click 'Create Key' to add one."

- **Manual verification (token-dialog permissions preview edge cases)**:
  - Submit with empty permissions field → reveal dialog shows "No permissions granted — this key has read access only to public endpoints."
  - Submit with `{"all": true}` → reveal dialog shows badge `all`.
  - Submit with invalid JSON (e.g. `not json`) → reveal dialog falls back to "No permissions granted" line; save still succeeds (backend coerces to `{}`).

- **Manual verification (regressions)**:
  - Admin → top-level **API Keys** page (`ApiKeyTablePage`). Click **New API Key**. The Group ID field MUST still appear; the existing `app.showAlert` token reveal MUST still work.
  - `GroupView` → **Sub-Groups** → **Add Group**: unchanged.
  - `GroupView` → **Members** → **Invite**: unchanged.
  - Toggle light/dark via the topbar Theme dropdown; reopen the token dialog; verify warning banner and token block read in both themes.

- **Permissions smoke-test**: confirm the **Create Key** button is hidden for non-admin callers (existing `TableView` showAdd + admin perm gating — out of scope but worth a glance).

- **Narrowest validation command**: `npm run lint` (single-file change). No targeted test suite applies.

### Docs Impact

- **No `docs/web-mojo/` changes.** `GroupView` is an admin-extension view, not a documented framework primitive. The framework's `addForm` / `onAdd` contract is already documented at `docs/web-mojo/components/TableView.md` and `docs/web-mojo/components/ListView.md`; this fix conforms to it.
- **`CHANGELOG.md`** — one bullet (see step 6).

### Out of Scope

- **Upgrading `ApiKeyTablePage.onActionAdd` to use the same token reveal + same column set (Last used, row Delete).** Worth a follow-up request once this lands — would unify the two surfaces. Not bundled here to keep blast radius small.
- **Adding `Modal.tokenReveal()` to the framework.** Premature with one caller.
- **Adding `ApiKeyForms.createInGroup`** in `src/core/models/ApiKey.js`. Filtering at the call site matches the existing SubGroups pattern in the same file.
- **Replacing the free-form `permissions` JSON textarea** with a structured permissions picker. Separate UX concern.
- **`expires_at` column / expiry-set UI**. Field exists in the backend (`api_key.py:41`) and is in the GRAPH (`api_key.py:55`), but there is no form to set or edit expiry. Adding the column alone would just always show "Never" (clutter). Bundle column + edit-form together in a separate request.
- **Per-row Activate/Deactivate in the kebab.** `TableView.contextMenu` is a static flat array (`TableView.js:52`, `TableRow.js:144`) — no per-row conditional, so we'd have to show both unconditionally. Keep activate/deactivate inside `ApiKeyView` (one click away). Row-level Delete handles the most common destructive op.
- **Backend changes.** None needed — `POST /api/group/apikey` already returns `resp.data.data.token` and `last_used` is in the default GRAPH.
- **Adding a framework-level alias of `addFormConfig` → `addForm`.** Would entrench the typo. Better to delete the dead config.

### Open Questions

None. The backend contract is verified (`django-mojo/mojo/apps/account/models/api_key.py:50-62,237-245`); the framework's `onAdd` hook is verified (`src/core/views/list/ListView.js:1639-1643`); the Modal API surface used is documented and verified (`Modal.js:199-233,91-158,822-836`, `ModalView.js:119-120,499-503`); and the file's existing patterns (`onActionAddChildGroup`, `onActionInviteMember`) provide concrete templates to mirror.

