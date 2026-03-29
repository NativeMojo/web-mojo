# Admin UserView — Rich Section Components

**Type**: request
**Status**: open
**Date**: 2026-03-17

## Description
Build admin-specific section components for the admin UserView to match (and exceed) the user-profile self-service sections. Admin sections use admin REST endpoints (`/api/user/<id>`, `model.save()`) rather than self-service `/api/account/` endpoints.

## Sections to Build

### 1. Profile (Personal + Verifications)
Combined section showing personal info with inline edit + verification overrides.
- **Display**: name fields, DOB, timezone, address, email, phone
- **Edit**: Dialog-based editing for all personal fields via `model.save()`
- **Verification overrides**: Force-verify/unverify email and phone, resend verification, change email/phone directly (bypass user confirmation flow)
- API: `POST /api/user/<id>` (model.save), admin verification endpoints

### 2. Security
Admin-level security management for any user.
- Force password reset (send reset email or set temporary password)
- Enable/disable MFA requirement (`requires_mfa` flag)
- Revoke all sessions
- View/delete passkeys
- View/regenerate recovery codes
- API: admin user endpoints, session management endpoints

### 3. Connected (OAuth)
View and manage a user's OAuth connections.
- Display linked providers with icons
- Unlink any provider on behalf of user
- API: admin-scoped OAuth connection endpoints

### 4. Notifications
View and edit a user's notification preferences.
- Per-kind, per-channel (in-app/email/push) toggle grid
- Same structure as self-service but using admin endpoints
- API: admin-scoped notification preference endpoints

### 5. API Keys
View and revoke a user's API keys (no generation — that's user-only).
- Table of keys: name, prefix, created, expires, last_used, allowed_ips, status
- Revoke/delete action
- API: admin-scoped API key endpoints

## Context
- Admin sections live in `src/extensions/admin/account/users/sections/`
- Each section is a View that receives the user model
- Wired into UserView's SideNavView (built in previous request)
- Pattern reference: `src/extensions/user-profile/views/Profile*Section.js`
- Admin UserView: `src/extensions/admin/account/users/UserView.js`

## Acceptance Criteria
- [ ] `AdminProfileSection` — personal info display + edit + verification overrides
- [ ] `AdminSecuritySection` — password reset, MFA, sessions, passkeys
- [ ] `AdminConnectedSection` — OAuth connections view + unlink
- [ ] `AdminNotificationsSection` — notification preference grid
- [ ] `AdminApiKeysSection` — API key table + revoke
- [ ] All sections wired into UserView SideNavView
- [ ] Build passes (`npm run build:lib`)

## Constraints
- Use admin REST endpoints, not self-service `/api/account/` endpoints
- Follow existing admin extension patterns
- Each section is a standalone View with `model` passed in
- Bootstrap 5.3 + Bootstrap Icons
- No manual DOM manipulation — use templates and child views

## Notes
- Build order: Profile → Security → Connected → Notifications → API Keys
- Profile section replaces the current DataView-based profile tab
- Existing tabs (Permissions, Groups, Events, Activity Log, Object Logs, Devices, Locations, Push Devices) remain unchanged

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
