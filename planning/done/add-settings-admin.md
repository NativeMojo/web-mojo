# Add Secure Settings Admin Extension

**Type**: request
**Status**: open
**Date**: 2026-03-17

## Description
Add a Settings management section to the admin portal — Model, TablePage, and View — for the Secure Settings REST API (`/api/settings`). This allows admins with `manage_settings` permission to create, view, edit, and delete global and group-scoped configuration settings (including secrets).

## Context
The django-mojo backend exposes a Secure Settings API at `/api/settings` with full CRUD. Secret values are masked in responses (`display_value: "******"`). Settings can be global or scoped to a group. The admin portal already has patterns for this kind of page (see ApiKey, Log, Incident extensions). The new extension follows the same Model + TablePage + View pattern.

Relevant files:
- `src/core/models/ApiKey.js` — model pattern to follow
- `src/extensions/admin/account/api_keys/ApiKeyTablePage.js` — TablePage pattern
- `src/extensions/admin/account/api_keys/ApiKeyView.js` — View pattern
- `src/admin.js` — registration and menu config

## Acceptance Criteria
- [ ] `Setting` model and `SettingList` collection targeting `/api/settings`
- [ ] `SettingForms` with create and edit form configs (key, value, group, is_secret)
- [ ] `SettingTablePage` with columns: id, key, display_value, group, is_secret badge, created
- [ ] `SettingView` with detail display and context menu (edit, delete)
- [ ] Registered in `src/admin.js` with `manage_settings` permission
- [ ] Added to admin sidebar menu
- [ ] Model index regenerated
- [ ] Build passes

## Constraints
- Follow existing admin extension patterns exactly
- Secret values should show masked `display_value` in table and view
- Permission: `manage_settings`
- Bootstrap 5.3 + Bootstrap Icons

## Notes
- API reference: Settings endpoints support `search` and `sort` query params
- `is_secret=true` means `display_value` is masked — treat as write-only in UI

---

<!-- Fill in when the request is resolved, then move the file to planning/done/ -->
## Resolution
**Status**: Resolved — YYYY-MM-DD

**Files changed**:
- `src/...`

**Tests run**:
- `npm run ...`

**Docs updated**:
- `docs/...`
- `CHANGELOG.md` (if applicable)

**Validation**:
[How the final behavior was verified]
