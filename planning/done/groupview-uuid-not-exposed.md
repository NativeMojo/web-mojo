# GroupView and Group model don't expose `uuid` — can't see, copy, or edit it

| Field | Value |
|-------|-------|
| Type | bug |
| Status | done |
| Date | 2026-05-16 |
| Severity | medium |

## Description

`Group` records carry a server-side `uuid` (a stable, non-incrementing public identifier used by external integrations / API calls), but the admin UI gives the operator **no way to interact with it**:

- **View** — Nowhere in `GroupView` is `model.uuid` rendered. The Identity section displays the numeric `model.id` only.
- **Copy** — There is no copy-to-clipboard control on any identifier row in `GroupView` (not on `id`, not on `uuid`). Operators who need the UUID for a webhook, an API call, or a support ticket have to dig it out of the network panel.
- **Change** — None of the three `Group` form configs (`GroupForms.create`, `GroupForms.edit`, `GroupForms.detailed`) include a `uuid` field, and `GroupIdentitySection` has no `edit-uuid` action handler. The "Edit Group" modal opened from the context menu therefore cannot edit `uuid` either.

Net effect: from the admin UI, a Group's UUID is invisible and inert. If the backend permits the field to be set on create or rotated on edit, the UI is silently dropping that capability.

## Context

- **User flow**: Admin → open `GroupView` for any Group (`Modal.detail(new GroupView({ model }))`) → Identity section. The "ID" flat-row shows `model.id`. There is no "UUID" row, and no copy button anywhere.
- Related flow: context-menu **Edit Group** opens `Modal.modelForm` with `GroupForms.detailed` (`src/extensions/admin/account/groups/GroupView.js:1126`). That form config has no `uuid` field either.
- The bug exists at the **model layer and the view layer** — both need updating to fully fix it.

## Acceptance Criteria

- [ ] `GroupView`'s Identity section displays the Group's `uuid` (e.g. as a `<code>` flat-row alongside the existing `ID` row), with appropriate handling for the case where `uuid` is empty.
- [ ] Each identifier row (`ID`, `UUID`) has a copy-to-clipboard control that writes the raw value and confirms via toast — pattern consistent with the existing `data-action="copy-to-clipboard"` button used in `src/core/forms/FormBuilder.js:79` and the `Modal.code` copy flow in `src/core/views/feedback/Modal.js:810-823`.
- [ ] The decision about whether `uuid` is **editable** is made explicitly:
  - If the backend allows it (rotate / set), `GroupForms.edit` (and `GroupForms.detailed`) gain a `uuid` field, and `GroupIdentitySection` gets an `onActionEditUuid` row-edit handler mirroring the existing `onActionEditName` / `onActionEditDomain` pattern.
  - If the backend treats `uuid` as immutable, the UUID row is rendered read-only (copy-only) and the design doc notes that explicitly so this issue is not reopened.
- [ ] No regression to the Identity section's existing flat rows, computed getters, or per-row edit handlers.
- [ ] Behavior is visually correct under both `data-bs-theme="light"` and `data-bs-theme="dark"` (uses Bootstrap tokens, per `.claude/rules/theming.md`).

## Investigation

- **Likely root cause:** The `Group` model never declares `uuid` anywhere the UI looks for it:
  - `src/core/models/Group.js:15-21` — `Group` extends `Model` with `endpoint: '/api/group'` only; no schema, no field list.
  - `GroupForms.create` (lines 68-98), `GroupForms.edit` (100-148), `GroupForms.detailed` (150-291) — none include a `uuid` field.
  - `GroupView`'s Identity section template (`src/extensions/admin/account/groups/GroupView.js:345-470`) renders Profile / Settings / Dates flat-rows and an `ID` row (line 372-374), but no `UUID` row.
  - No `onActionEditUuid` handler exists on `GroupIdentitySection` (lines 521-658 enumerate every per-row edit handler — `Name`, `Kind`, `Timezone`, `EodHour`, `Domain`, `AuthDomain`, `ShortName`, `Portal`, `EmailTemplate`).
  - A repo-wide `grep -rni "uuid"` in `src/core/models/` and `src/extensions/admin/account/` returns **no hits** — the framework is currently UUID-blind for these models.

  The field exists on the backend `Group` record (it ships in the API response payload, so `this.model.get('uuid')` *would* return a value), but no view code asks for it and no form config declares it.

- **Confidence:** high. The omission is mechanical: no template binding, no getter, no form field, no action handler, no copy control.

- **Code path:**
  - `src/core/models/Group.js:15-21` — model definition (no `uuid` declared).
  - `src/core/models/Group.js:68-291` — three form configs (`create`, `edit`, `detailed`); none mention `uuid`.
  - `src/extensions/admin/account/groups/GroupView.js:345-470` — `GroupIdentitySection` template (renders `ID` only).
  - `src/extensions/admin/account/groups/GroupView.js:521-658` — per-row edit handlers (no `onActionEditUuid`).
  - `src/extensions/admin/account/groups/GroupView.js:1121-1132` — context-menu "Edit Group" routes through `GroupForms.detailed`, which also has no `uuid` field.
  - Reference for copy-to-clipboard: `src/core/forms/FormBuilder.js:79`, `src/core/views/feedback/Modal.js:810-823`, `src/core/View.js:828-832`.
  - Reference for per-row edit handler shape: `onActionEditName` at `GroupView.js:523-532` (uses `Modal.prompt` + `_saveField`).

- **Regression test:** Not feasible in the current unit-test harness. The bug is composed of: a model that omits a field, a view template that doesn't bind it, and missing handler methods. A meaningful unit assertion would be tautological ("the template string does not contain the substring 'uuid'"). Manual verification is the practical check: open any Group in admin → Identity → confirm UUID row is visible, copyable, and (if applicable) editable.

- **Related files:**
  - `src/core/models/Group.js`
  - `src/extensions/admin/account/groups/GroupView.js`
  - `src/extensions/admin/shared/AdminMetadataSection.js` (for reference — used as Metadata tab)
  - `src/core/forms/FormBuilder.js` (existing copy-to-clipboard pattern)
  - `src/core/views/feedback/Modal.js` (existing copy-to-clipboard pattern)
  - Backend reference (read-only): the Django Group model definition — confirm whether `uuid` is editable / rotatable before deciding the edit-vs-readonly question in the design phase.

## Plan

### Objective

Make `Group.uuid` first-class in `GroupView`: visible as a flat-row in the Identity section, copyable via the framework's built-in clipboard primitive, editable via a per-row pencil handler, generatable when missing, and editable through the context-menu **Edit Group** modal. Also add a copy button to the existing **ID** row for consistency.

**Backend note (resolved):** The Django `Group` model now ships `uuid` in all graphs (`simple`, `basic`, `default`), so no frontend graph-aware refetch is needed — `this.model.get('uuid')` returns the value directly.

### Steps

1. **`src/extensions/admin/account/groups/GroupView.js` — `GroupIdentitySection` template (lines 345–470).** Add a **UUID** flat-row directly under the existing **ID** row (line 372–374). Use trusted-HTML interpolation (`{{{ }}}`) so the row body is built by computed getters that emit the `clipboard` pipe output when a value is present, and a "Not set" + Generate button when empty. Also retrofit the existing **ID** row to include a copy button using the same pattern.
   - ID row body → `{{{idClipboard}}}` (existing `<code>{{model.id}}</code>` + copy button via `dataFormatter.clipboard(String(this.model.id), 'icon-only')`).
   - UUID row body → `{{{uuidClipboard}}}` (either `<code>{{uuid}}</code>` + copy button when present, or italic "Not set" when empty).
   - UUID row action cell → pencil button (`data-action="edit-uuid"`) always; plus a Generate button (`data-action="generate-uuid"`) when uuid is empty.

2. **`GroupIdentitySection` — computed getters (lines 475–514).** Add:
   - `hasUuid` → truthy check on `this.model.get('uuid')` (matches `hasDomain` / `hasAuthDomain` style at lines 497–500).
   - `uuid` → raw string value (or `''`).
   - `uuidClipboard` → trusted HTML. When `hasUuid`, returns `dataFormatter.clipboard(uuid, 'text')` output. Otherwise returns the "Not set" italic span.
   - `idClipboard` → trusted HTML wrapping `model.id` the same way.
   - `dataFormatter` is already imported at line 33.

3. **`GroupIdentitySection` — per-row handlers (lines 521–658).** Add:
   - `onActionEditUuid()` — mirrors `onActionEditName`. `Modal.prompt('UUID:', 'Edit UUID', { defaultValue: this.model.get('uuid') || '', placeholder: '32-character hex string' })`. On non-empty trimmed input, calls `this._saveField({ uuid: input.trim() }, 'UUID')`.
   - `onActionGenerateUuid()` — generates `crypto.randomUUID().replace(/-/g, '')` to match the backend's `uuid.uuid4().hex` shape (32 lowercase hex chars, no hyphens). Wraps in `Modal.confirm`; on confirm calls `this._saveField({ uuid: generated }, 'UUID')`. Fallback to `crypto.getRandomValues(new Uint8Array(16))` + hex-stringify when `crypto.randomUUID` is unavailable; toast an error if neither exists.

4. **`src/core/models/Group.js` — `GroupForms.edit` (lines 100–148) and `GroupForms.detailed` (lines 150–291).** Add a `uuid` text field:
   - In `edit`: between `name` and `kind`. Shape: `{ name: 'uuid', type: 'text', label: 'UUID', placeholder: '32-character hex string' }` (not `required`).
   - In `detailed`: inside the existing "Profile Details" `group` block, after `name` and before `kind`, with `columns: 12`.
   - Leave `GroupForms.create` alone — backend lazy-inits via `get_uuid()`.

5. **No changes to `GroupView`'s context-menu wiring.** The existing **Edit Group** entry already opens `Modal.modelForm` with `GroupForms.detailed`; once that config includes `uuid`, the modal picks it up automatically.

### Design Decisions

- **Use the built-in `clipboard` pipe formatter** (`DataFormatter.js:175`) — emits a `<span>` with monospace text + `btn-outline-secondary` button carrying `data-clipboard="<value>"`. The `View.onActionCopyToClipboard` handler (`View.js:822`) is inherited by every View — handles the write, falls back to `execCommand` in non-secure contexts, and swaps the icon to a check for 1s. Zero new code for copy mechanics, full theme safety via Bootstrap tokens.
- **Per-row edit uses `Modal.prompt`**, matching every other free-text edit handler in the section (`Name`, `Domain`, `AuthDomain`, `ShortName`, `Portal`, `EmailTemplate`).
- **Generate output = `uuid4().hex`** (32 lowercase hex chars, no hyphens) to match `django-mojo/mojo/apps/account/models/group.py:132-136`.
- **Read-write, no extra perm gate.** Backend declares `uuid` as a plain CharField; standard `SAVE_PERMS` already gates writes.
- **Add copy to ID row.** Treating UUID specially while leaving ID copy-less would feel inconsistent.
- **Don't add `uuid` to `GroupForms.create`.** Backend lazy-inits on first read — create-time field would be friction with no benefit.

### Edge Cases

- `uuid` is `null` / `''` / `undefined` → "Not set" + Generate button; edit pencil still works with empty `defaultValue`.
- Edit / Generate dialog cancelled → no-op, return `true` (matches existing handlers).
- Backend save 4xx → `_saveField` already toasts the error.
- `crypto.randomUUID` unavailable → fall back to `crypto.getRandomValues(new Uint8Array(16))` + hex map. If even that's missing, toast "UUID generation not supported in this browser".
- Re-render after save → `_saveField` already calls `await this.render()`; new getters re-evaluate.
- Context-menu Edit Group modal → already triggers `_fullRefresh()` after save.
- Duplicate uuid server-side → backend doesn't enforce unique constraint; error toast path covers any future tightening.
- Both themes → `clipboard` pipe + "Not set" span use only Bootstrap tokens. No dark-override CSS needed.

### Testing

- Manual smoke (primary): `npm run dev` → admin Groups → open any group → confirm UUID row, copy buttons (ID + UUID), edit pencil, Generate flow (on a uuid-less group), Edit Group dialog includes UUID field. Toggle Light / Dark theme.
- `npm run lint` — no new issues in the two edited files.
- `npm run test:unit` — existing assertions still pass. No new unit tests (issue documents the bug surface as not unit-testable without harness changes).

### Docs Impact

- `CHANGELOG.md` — single-line admin-extension entry: "Group: UUID is now visible, copyable, editable, and generatable in `GroupView` Identity section + the Edit Group modal."
- `docs/web-mojo/` — no public-API doc changes. Constructor / endpoint unchanged; form configs are admin-internal.

### Out of Scope

- Backend changes (already done — uuid ships in all Group graphs).
- Exposing UUID on other models (Member, User, ApiKey).
- Adding UUID to `GroupForms.create`.
- Replacing the existing copy/clipboard primitive.

## Resolution

Implemented per the plan. Commit `ab9cdf8` (`feat(admin): expose Group.uuid in GroupView (view + copy + edit + generate)`).

### Files Changed

- **`src/extensions/admin/account/groups/GroupView.js`** — `GroupIdentitySection`:
  - Template: `ID` row body switched to `{{{idClipboard}}}`; new `UUID` flat-row with `{{{uuidClipboard}}}` body + action cell (always-on pencil, plus a `bi-shuffle` Generate button shown only when `!hasUuid`).
  - Computed getters: `hasUuid`, `uuid`, `idClipboard`, `uuidClipboard` (idClipboard / uuidClipboard emit trusted HTML — `<code>` + the framework's `dataFormatter.clipboard(value, 'icon-only')` button).
  - Handlers: `onActionEditUuid` (Modal.prompt, mirrors `onActionEditName`), `onActionGenerateUuid` (Modal.confirm → save), `_generateUuidHex` (`crypto.randomUUID().replace(/-/g, '')` with `crypto.getRandomValues` fallback).
- **`src/core/models/Group.js`** — `uuid` text field added to `GroupForms.edit` (between `name` and `kind`) and `GroupForms.detailed` (Profile Details group, after `name`). `GroupForms.create` intentionally unchanged.
- **`CHANGELOG.md`** — new admin-extension entry under `## Unreleased`.
- **`docs/web-mojo/models/BuiltinModels.md`** — inline field-list comments on `GroupForms.edit` / `GroupForms.detailed` updated to mention `uuid` (committed separately with the planning move).

### Validation

- **Lint** — `npx eslint src/extensions/admin/account/groups/GroupView.js src/core/models/Group.js`: zero errors, zero warnings on the edited files. (The 16 errors / 55 warnings reported by `npm run lint` are all pre-existing in unrelated files.)
- **Preview dev server** — `npm run dev` started clean. No Vite/build errors, no browser console errors. Full admin click-through requires authenticated backend (out of scope for the framework-source dev server, which is a sign-in landing page only).
- **Unit + build suites** (test-runner agent) — `1255 / 1262` passed. The 7 failures are all pre-existing in `test/unit/IncidentView.test.js` (StatusPanel / Timeline / KnownFieldsCard / sections / header / auxFn / RelatedIncidentsList — none touch Group, GroupView, DataFormatter, or clipboard). **Zero new regressions attributable to this commit.**

### Agent Findings

- **test-runner** — Zero new failures. The 7 unit failures are pre-existing in IncidentView and unrelated.
- **docs-updater** — Edited `docs/web-mojo/models/BuiltinModels.md` to add `uuid` to the inline field-list comments for `GroupForms.edit` and `GroupForms.detailed`. `docs/web-mojo/extensions/Admin.md` only imports `GroupView` and doesn't enumerate its fields, so no edit needed. AGENT.md and the docs index didn't require changes.
- **security-review** — **Low severity**, one optional UX-improvement finding and three "clean" informational notes:
  - XSS in `idClipboard` / `uuidClipboard`: clean — both call `escapeHtml()` before `<code>` interpolation.
  - XSS in the Generate `Modal.confirm` message: clean — `escapeHtml(generated)` is called even though `crypto.randomUUID().replace(/-/g, '')` is hex-only by construction.
  - Entropy: adequate — CSPRNG-backed, 122/128 bits, more than sufficient for an identifier.
  - **Low**: `onActionEditUuid` does not client-side-validate the hex shape of user input before `_saveField`. The agent recommended adding a `/^[0-9a-f]{32}$/i` guard.
    **Deferred — not adopted.** Rationale: the backend `Group.uuid` is declared as `models.CharField(max_length=200)` (no DB-level format constraint), so hard-validating a 32-char hex format would be more restrictive on the client than on the server. The toast-on-server-error path already covers malformed input, and every other per-row edit handler in `GroupIdentitySection` (Name, Domain, AuthDomain, Portal, etc.) similarly defers shape validation to the backend. If shape enforcement is wanted later, both the backend `Group.uuid` field and this client validator should tighten in lockstep.

### Follow-ups

None required. The bug is closed; the deferred client-side hex validator is a possible future enhancement, not a regression risk.
