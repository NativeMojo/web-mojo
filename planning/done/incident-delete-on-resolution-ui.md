# Incident Delete-on-Resolution UI Controls

| Field | Value |
|-------|-------|
| Type | request |
| Status | done |
| Date | 2026-04-03 |
| Priority | high |

## Description

Add UI controls for the backend's incident auto-deletion system. Operators need to:
- Configure which RuleSets auto-delete their incidents on resolution
- Protect individual important incidents from deletion
- See at a glance which rules auto-clean and which incidents are protected

## Context

The backend supports two metadata flags that control incident lifecycle:
- **`RuleSet.metadata.delete_on_resolution: true`** — all incidents created by that rule are hard-deleted (CASCADE) when resolved or closed
- **`Incident.metadata.do_not_delete: true`** — per-incident override that survives resolution and 90-day pruning

These flags exist on the API but have no UI controls. Without visibility, operators may unknowingly resolve incidents that get permanently deleted, or fail to protect critical incidents from the 90-day prune.

## Acceptance Criteria

### 1. RuleSet forms — "Delete on Resolution" toggle
- [ ] Add a switch field to both `RuleSetForms.create` and `RuleSetForms.edit` in the General tab
- [ ] Field saves to `metadata.delete_on_resolution` (boolean)
- [ ] Label: "Delete on Resolution", help text explains the CASCADE behavior

### 2. RuleSetTablePage — auto-delete indicator column
- [ ] Add a column showing delete_on_resolution status (icon or badge)
- [ ] Visible at a glance which rules auto-clean

### 3. IncidentView QuickActionsBar — "Protect" toggle
- [ ] Add a "Protect" / "Unprotect" button to QuickActionsBar
- [ ] Saves `metadata.do_not_delete: true/false` on the incident
- [ ] Button appearance changes based on current protection state (e.g., shield icon filled vs outline)
- [ ] Show a visual indicator in the incident header when protected

### 4. IncidentView context menu — "Protect from Deletion"
- [ ] Add "Protect from Deletion" / "Remove Protection" to the context menu
- [ ] Mirrors the QuickActionsBar toggle

### 5. RuleEngineSection — auto-delete warning
- [ ] When the linked RuleSet has `metadata.delete_on_resolution: true`, show a warning alert
- [ ] Warning text: "This incident will be auto-deleted when resolved or closed"
- [ ] If incident also has `do_not_delete: true`, show info that it's protected despite the rule

### 6. IncidentTablePage — batch "Protect" action
- [ ] Add "Protect" batch action to the batch actions bar
- [ ] Sets `metadata.do_not_delete: true` on all selected incidents

## Investigation

### What exists

**RuleSetForms** (`src/core/models/Incident.js`):
- Create form (line 429): 4 tabs — General, Bundling, Thresholds, Handler
- Edit form (line 589): Same 4 tabs
- No metadata fields in either form currently
- Metadata is a JSON blob on the model, not exposed in forms

**RuleSetTablePage** (`src/extensions/admin/incidents/RuleSetTablePage.js`):
- 8 columns: ID, Active, Name, Category, Priority, Bundle By, Trigger, Handler
- 3 batch actions: Enable, Disable, Delete

**QuickActionsBar** (`src/extensions/admin/incidents/IncidentView.js` lines 288-374):
- Conditional buttons based on `isActive` / `isResolved` flags
- Actions: Resolve, Pause, Ignore, Escalate, Re-open, Create Ticket, LLM Analyze
- No protection/deletion controls

**IncidentView context menu** (lines 1197-1250):
- Sections: Status transitions, Edit/Priority, IP blocking, Ticket/Merge, LLM, Delete
- No protection controls

**RuleEngineSection** (lines 574-827):
- Shows linked RuleSet DataView with config fields
- No awareness of `delete_on_resolution` metadata

**IncidentTablePage** (`src/extensions/admin/incidents/IncidentTablePage.js`):
- 5 batch actions: Open, Resolve, Pause, Ignore, Merge

### What changes

| File | Change |
|------|--------|
| `src/core/models/Incident.js` — `RuleSetForms.create` | Add `metadata.delete_on_resolution` switch to General tab |
| `src/core/models/Incident.js` — `RuleSetForms.edit` | Add `metadata.delete_on_resolution` switch to General tab |
| `src/extensions/admin/incidents/RuleSetTablePage.js` | Add auto-delete indicator column |
| `src/extensions/admin/incidents/IncidentView.js` — `QuickActionsBar` | Add Protect/Unprotect toggle button |
| `src/extensions/admin/incidents/IncidentView.js` — `IncidentView._buildContextMenu` | Add "Protect from Deletion" menu item |
| `src/extensions/admin/incidents/IncidentView.js` — `RuleEngineSection` | Add auto-delete warning when `rulesetModel.get('metadata')?.delete_on_resolution` |
| `src/extensions/admin/incidents/IncidentView.js` — `IncidentView` header | Show protection badge when `model.get('metadata')?.do_not_delete` |
| `src/extensions/admin/incidents/IncidentTablePage.js` | Add "Protect" batch action |

### Constraints

- **Metadata is a JSON blob** — `delete_on_resolution` and `do_not_delete` live inside `metadata`, not as top-level model fields. The form field must use `name: 'metadata.delete_on_resolution'` or the save handler must merge into metadata manually.
- **Saving metadata fields** — Need to verify how the backend handles partial metadata updates. If `PATCH` with `{ metadata: { delete_on_resolution: true } }` replaces the entire metadata object, the save must merge with existing metadata first: `{ metadata: { ...existing, delete_on_resolution: true } }`.
- **CASCADE delete is destructive** — the warning in RuleEngineSection should be visually prominent (Bootstrap `alert-warning` or `alert-danger`)
- **RuleSet metadata may not be available on incident list** — the `do_not_delete` flag is on the incident itself (accessible), but `delete_on_resolution` is on the RuleSet (only available in IncidentView after fetching the RuleSet in RuleEngineSection)
- **Form metadata field pattern** — RuleSetForms currently has no metadata fields; need to check if the form system supports nested `metadata.key` field names or if a custom save handler is needed

### Related files
- `src/core/models/Incident.js` — RuleSetForms create/edit, IncidentForms
- `src/extensions/admin/incidents/IncidentTablePage.js` — batch actions
- `src/extensions/admin/incidents/IncidentView.js` — QuickActionsBar, RuleEngineSection, context menu, header
- `src/extensions/admin/incidents/RuleSetTablePage.js` — columns
- `src/extensions/admin/incidents/RuleSetView.js` — DataView config fields
- `docs/web-mojo/forms/README.md` — form field conventions for metadata nesting

### Endpoints
- No new endpoints — all changes use existing CRUD
- `PATCH /api/incident/event/ruleset/{id}` with `{ metadata: { delete_on_resolution: true } }`
- `PATCH /api/incident/incident/{id}` with `{ metadata: { do_not_delete: true } }`

### Tests required
- None required — extension UI code, no public framework API changes

### Out of scope
- Backend implementation of the delete-on-resolution logic (already done)
- 90-day pruning UI or configuration
- Undo/recovery after hard delete
- Audit log for deletions

## Plan

### Objective
Add UI controls for the incident delete-on-resolution system: RuleSet toggle, incident protection, auto-delete warnings, and batch protection.

### Steps

**1. `src/core/models/Incident.js` — Add `metadata.delete_on_resolution` switch to RuleSetForms**

- Add a switch field after `is_active` in both `RuleSetForms.create` (line ~450, General tab) and `RuleSetForms.edit` (line ~608, General tab):
  - `name: 'metadata.delete_on_resolution'`, `type: 'switch'`, `label: 'Delete on Resolution'`
  - `help: 'Incidents from this rule are permanently deleted when resolved or closed (CASCADE — events and history are also removed)'`
  - `value: false` (create only), `columns: 4`
- The form system's dot notation support handles reading/writing `metadata.delete_on_resolution` automatically. Backend auto-merges JSONFields, so partial metadata updates are safe.

**2. `src/extensions/admin/incidents/RuleSetTablePage.js` — Add auto-delete column**

- Add a column after `is_active` (line ~38):
  - `key: 'metadata.delete_on_resolution'`, `label: 'Auto-Delete'`, `width: '90px'`
  - `formatter: 'yesnoicon'` — matches the existing `is_active` column pattern

**3. `src/extensions/admin/incidents/IncidentView.js` — QuickActionsBar protect toggle**

- In constructor (line ~295): Add `this.isProtected = !!(this.incident.get('metadata')?.do_not_delete)`
- In template (line ~323, right-side button group), before the Ticket button:
  - When protected: `btn-warning btn-sm` with `bi-shield-fill-check`, text "Protected", action `quick-unprotect`
  - When not protected: `btn-outline-secondary btn-sm` with `bi-shield`, action `quick-protect`
  - Use `{{#isProtected|bool}}` / `{{^isProtected|bool}}` conditional
- Add handlers:
  - `onActionQuickProtect()`: `model.save({ metadata: { do_not_delete: true } })`, toast, emit `incident:updated`
  - `onActionQuickUnprotect()`: `model.save({ metadata: { do_not_delete: false } })`, toast, emit `incident:updated`
- Backend auto-merges metadata, so no client-side spread needed.

**4. `src/extensions/admin/incidents/IncidentView.js` — Incident header protection badge**

- In constructor (line ~993): Add `this.isProtected = !!(this.model.get('metadata')?.do_not_delete)`
- In template badges area (line ~1017, after category badge):
  - `{{#isProtected|bool}}<span class="badge bg-warning text-dark"><i class="bi bi-shield-fill-check me-1"></i>Protected</span>{{/isProtected|bool}}`

**5. `src/extensions/admin/incidents/IncidentView.js` — Context menu protect item**

- In `_buildContextMenu()` (line ~1217, after "Change Priority"): Add protect/unprotect item:
  - If `metadata?.do_not_delete`: `{ label: 'Remove Protection', action: 'remove-protection', icon: 'bi-shield' }`
  - Else: `{ label: 'Protect from Deletion', action: 'protect-incident', icon: 'bi-shield-fill-check' }`
- Add handlers `onActionProtectIncident()` and `onActionRemoveProtection()` using same save pattern as QuickActionsBar

**6. `src/extensions/admin/incidents/IncidentView.js` — RuleEngineSection auto-delete warning**

- In constructor: Add `this.incidentProtected = !!(this.incident.get('metadata')?.do_not_delete)`
- In template, inside `{{#hasRuleset|bool}}` block (before the header div):
  - `{{#autoDeleteEnabled|bool}}` warning block:
    - If NOT protected: `alert-warning` — "This incident will be permanently deleted when resolved or closed. Events and history will also be removed."
    - If protected: `alert-info` — "Auto-delete is enabled on this rule, but this incident is protected."
  - `{{/autoDeleteEnabled|bool}}`
- In `onInit()` (after fetching rulesetModel, line ~634): Set `this.autoDeleteEnabled = !!(this.rulesetModel?.get('metadata')?.delete_on_resolution)`, then re-render if true

**7. `src/extensions/admin/incidents/IncidentTablePage.js` — Batch "Protect" action**

- Add to `batchActions` array (line ~131): `{ label: "Protect", icon: "bi bi-shield-fill-check", action: "protect" }`
- Add handler `onActionBatchProtect()`: confirm, save `{ metadata: { do_not_delete: true } }` on each selected, re-fetch

### Design Decisions

- **No client-side metadata merge needed** — Backend auto-merges JSONFields, so `model.save({ metadata: { do_not_delete: true } })` preserves existing keys. Simpler than the spread pattern in AdminMetadataSection.
- **Form dot notation for RuleSet** — `name: 'metadata.delete_on_resolution'` leverages built-in `_setNestedAttribute()`. Backend merge ensures safety.
- **`yesnoicon` formatter** — Matches `is_active` column pattern in same table.
- **Protect button always visible** — Not status-gated. Operators protect at any point, including for 90-day prune protection on resolved incidents.
- **RuleEngineSection re-render** — `autoDeleteEnabled` only known after async RuleSet fetch. Set flag in `onInit()` and re-render to show warning.

### Edge Cases

- **Metadata is null** — `model.get('metadata')?.do_not_delete` handles null safely with optional chaining.
- **RuleSet not yet fetched** — `autoDeleteEnabled` defaults false, updated after fetch + re-render.
- **Batch protect on mixed selection** — Idempotent; re-saving `do_not_delete: true` is harmless.
- **Re-render after protect** — `incident:updated` event triggers IncidentView refresh, which rebuilds QuickActionsBar and header with updated state.

### Testing

- `npm run lint` — verify no syntax errors
- Manual: Create/edit RuleSet, toggle "Delete on Resolution", verify metadata saved
- Manual: Open incident with auto-delete RuleSet, verify warning appears
- Manual: Click Protect, verify badge in header, verify metadata saved
- Manual: Batch select incidents, Protect, verify all updated

### Docs Impact

- No framework docs changes — extension code only
- `CHANGELOG.md` — entries for RuleSet auto-delete toggle, incident protection, auto-delete warning

## Resolution

### What was implemented
All 7 plan steps completed:
1. **Incident.js** — `metadata.delete_on_resolution` switch added to RuleSetForms create + edit (General tab)
2. **RuleSetTablePage** — Auto-Delete column with `yesnoicon` formatter after Active column
3. **QuickActionsBar** — Protect/Unprotect toggle with shield icons, saves `metadata.do_not_delete`
4. **Incident header** — Protected badge (bg-warning) when `do_not_delete` is set
5. **Context menu** — "Protect from Deletion" / "Remove Protection" items with handlers
6. **RuleEngineSection** — Auto-delete warning alert (alert-warning when unprotected, alert-info when protected)
7. **IncidentTablePage** — Batch "Protect" action

### Files changed
- `src/core/models/Incident.js` — RuleSetForms create/edit
- `src/extensions/admin/incidents/RuleSetTablePage.js` — auto-delete column
- `src/extensions/admin/incidents/IncidentView.js` — QuickActionsBar, header, context menu, RuleEngineSection
- `src/extensions/admin/incidents/IncidentTablePage.js` — batch protect

### Commits
- `ff2475a` — Full implementation

### Tests run
- `npm run lint` — 0 errors (10 pre-existing warnings)
- `npm test` — all failures pre-existing (alias resolution, ESM/CJS, missing files)

### Agent findings
- **docs-updater** — CHANGELOG.md updated with 7 new entries
- **security-review** — 2 warnings (permission gate — already admin-gated; metadata clobber — backend auto-merges JSONFields so not applicable), 2 info (pre-existing LLM triple-brace, unbounded batch parallel)
