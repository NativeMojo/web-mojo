# Permissions Categories & Cleanup

**Type**: request
**Status**: resolved
**Date**: 2026-03-28

## Description
Reorganize `User.PERMISSIONS` to align with the backend's two-tier permission model (category permissions + fine-grained view/manage pairs) and surface that structure in the admin UserView as two separate sidenav sections.

Currently `User.PERMISSIONS` is a flat array of ~20 entries that mixes old permission names (e.g. `view_incidents`) with ones that don't match the backend (which uses `view_security`/`manage_security`). The backend has a clean two-tier model documented in `django-mojo/docs/django_developer/core/permissions.md`.

## Backend Permission Model (source of truth)

### Category Permissions (broad domain-level access)
Single-word permissions that grant full read+write to an entire domain (7 categories):
- `security` — incidents, events, rules, tickets, IPSets, bouncer, GeoIP, system logs
- `users` — user records, passkeys, TOTP, API keys, OAuth, devices, locations
- `groups` — groups, members, group API keys, settings
- `comms` — email, phone, SMS, push notifications, chat, notifications
- `jobs` — jobs, job events, job logs, runners, queue control, system stats
- `metrics` — metrics recording, fetching, categories, values, permissions
- `files` — file managers, files, renditions, vault files, vault data, S3 buckets

### Fine-Grained Permissions (scoped view/manage pairs)
- **Account**: `view_users`/`manage_users`, `view_groups`/`manage_groups`, `manage_group`, `view_members`, `manage_settings`
- **Communication**: `manage_chat`, `manage_aws`, `view_notifications`/`manage_notifications`, `send_notifications`, `view_devices`/`manage_devices`, `manage_push_config`, `view_phone_numbers`/`manage_phone_numbers`, `manage_phone_config`, `view_sms`/`manage_sms`, `send_sms`
- **Platform**: `view_security`/`manage_security`, `admin` (logit), `view_logs`/`manage_logs`, `view_jobs`/`manage_jobs`, `view_metrics`/`manage_metrics`/`write_metrics`, `view_fileman`/`manage_files`, `view_vault`/`manage_vault`, `manage_docit`, `manage_shortlinks`

## Proposed UI Structure

### UserView Sidenav — Two sections under "Access" divider:

**Permissions** (sidenav item) — broad domain toggles for quick role setup
- Tab: **System** — the 10 category permissions as switches
- Tab: **App** — consumer-defined category permissions (hidden when empty)

**Adv Permissions** (sidenav item) — fine-grained view/manage pairs for scoped access
- Tab: **Account** — users, groups, settings
- Tab: **Communication** — chat, email, phone, push, notifications
- Tab: **Platform** — security, logs, files, vault, docs, shortlinks
- Tab: **App** — consumer-defined granular permissions (hidden when empty)

### User.js Data Model

```javascript
// Category permissions — broad domain-level access
User.CATEGORY_PERMISSIONS = [
    { name: "security", label: "Security", tooltip: "..." },
    { name: "users", label: "Users", tooltip: "..." },
    { name: "groups", label: "Groups", tooltip: "..." },
    { name: "comms", label: "Communications", tooltip: "..." },
    { name: "jobs", label: "Jobs", tooltip: "..." },
    { name: "metrics", label: "Metrics", tooltip: "..." },
    { name: "files", label: "Files", tooltip: "..." },
];

// Fine-grained permissions grouped by tab
User.GRANULAR_PERMISSION_TABS = [
    {
        label: 'Account',
        permissions: [
            { name: "view_users", label: "View Users" },
            { name: "manage_users", label: "Manage Users" },
            { name: "view_groups", label: "View Groups" },
            { name: "manage_groups", label: "Manage Groups" },
            { name: "manage_group", label: "Manage Own Group" },
            { name: "view_members", label: "View Members" },
            { name: "manage_settings", label: "Manage Settings" },
        ]
    },
    {
        label: 'Communication',
        permissions: [
            { name: "manage_chat", label: "Manage Chat" },
            { name: "manage_aws", label: "Manage Email (AWS)" },
            { name: "view_notifications", label: "View Notifications" },
            { name: "manage_notifications", label: "Manage Notifications" },
            { name: "view_devices", label: "View Push Devices" },
            { name: "manage_devices", label: "Manage Push Devices" },
            { name: "manage_push_config", label: "Push Config" },
            { name: "view_phone_numbers", label: "View Phone Numbers" },
            { name: "manage_phone_numbers", label: "Manage Phone Numbers" },
            { name: "manage_phone_config", label: "Phone Config" },
            { name: "view_sms", label: "View SMS" },
            { name: "manage_sms", label: "Manage SMS" },
        ]
    },
    {
        label: 'Platform',
        permissions: [
            { name: "view_security", label: "View Security" },
            { name: "manage_security", label: "Manage Security" },
            { name: "view_logs", label: "View Logs" },
            { name: "manage_logs", label: "Manage Logs" },
            { name: "view_fileman", label: "View File Managers" },
            { name: "manage_files", label: "Manage Files" },
            { name: "view_vault", label: "View Vault" },
            { name: "manage_vault", label: "Manage Vault" },
            { name: "manage_docit", label: "Manage Docs" },
            { name: "manage_shortlinks", label: "Manage Shortlinks" },
        ]
    },
];

// App-level extension points (empty by default)
User.APP_CATEGORY_PERMISSIONS = [];
User.APP_GRANULAR_PERMISSIONS = [];

// Backwards-compatible flat list (auto-generated)
User.PERMISSIONS = [
    ...User.CATEGORY_PERMISSIONS,
    ...User.GRANULAR_PERMISSION_TABS.flatMap(tab => tab.permissions),
    ...User.APP_CATEGORY_PERMISSIONS,
    ...User.APP_GRANULAR_PERMISSIONS,
];
```

## Acceptance Criteria
- [x] `User.CATEGORY_PERMISSIONS` defines the 7 broad domain permissions (security, users, groups, comms, jobs, metrics, files)
- [x] `User.GRANULAR_PERMISSION_TABS` defines fine-grained perms grouped by tab (Account 7, Communication 14, Platform 16)
- [x] `User.APP_CATEGORY_PERMISSIONS` and `User.APP_GRANULAR_PERMISSIONS` — empty extension points
- [x] `User.PERMISSIONS` auto-generated flat list (backwards compatible)
- [x] `User.PERMISSION_FIELDS` auto-generated flat switch fields (backwards compatible)
- [x] UserView "Permissions" sidenav section — tabset with System tab (+ App tab when non-empty)
- [x] UserView "Adv Permissions" sidenav section — tabset with Account, Communication, Platform tabs (+ App tab when non-empty)
- [x] Permission names align with backend (`view_security`/`manage_security` not `view_incidents`/`manage_incidents`)
- [x] Consumer projects can extend at both levels by pushing to the App arrays
- [x] `admin.js` page registrations and menu items updated (jobs → view_jobs/manage_jobs, metrics → manage_metrics)
- [x] FormBuilder tooltip support on all field types, FormView auto-initializes Bootstrap tooltips

## Constraints
- Must be backwards compatible — `User.PERMISSIONS` stays as a flat list
- Categories are a UI/organizational concern, not a security model change
- No backend API changes required
- Consumer apps extend via `User.APP_CATEGORY_PERMISSIONS` and `User.APP_GRANULAR_PERMISSIONS`

## Notes
- `is_superuser` bypasses all permission checks — no need for a "system_admin" category
- The backend doc at `django-mojo/docs/django_developer/core/permissions.md` is the source of truth for permission names
- Old permission names in the current `User.PERMISSIONS` (e.g. `view_incidents`, `manage_incidents`, `view_tickets`, `manage_tickets`, `view_jobs`, `manage_jobs`, `view_metrics`, `manage_metrics`, `file_vault`, `view_admin`, `view_global`, `force_single_session`) need to be removed or mapped to the correct backend names

---

## Resolution
**Status**: Resolved — 2026-03-29

**Files changed**:
- `src/core/models/User.js` — two-tier permission model (7 categories, 3 granular tabs), tooltips, extension points
- `src/extensions/admin/account/users/UserView.js` — Permissions + Adv Permissions sidenav sections
- `src/core/forms/FormBuilder.js` — tooltip support on all field types
- `src/core/forms/FormView.js` — enableTooltips option
- `src/admin.js` — page registrations and menu items updated to new permission names

**Validation**:
- Verified in Chrome: category permissions render as System tab, granular permissions render as Account/Communication/Platform tabs
- Tooltips display on hover for category permission switches
- Admin menu items properly gated by updated permission names
