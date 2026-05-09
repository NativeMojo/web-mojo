---
status: in-progress (paused — waiting on listview-search-filters-pagination)
type: request
scope: src/extensions/admin/account/{users,groups} · UserView · GroupView · MemberView
created: 2026-05-09
parent: detailview-audit-followups.md
blocked_by: listview-search-filters-pagination.md
---

## Status — 2026-05-09

**Phase 1 + Phase 2 shipped. Paused on Phase 3+ pending ListView toolbar/pagination work.**

Landed:
- `52c4712` — Phase 1 (I1 double-fire, I2 force-verify removal, I3 Change Avatar, I4 TOTP/SMS/Passkey rows) + this spec file.
- `7f37b68` — bonus: badges + KPI counts use `collection.meta.count` instead of fetched-page length.
- `d6dde92` — Phase 2 (disable lifecycle): reason-keyed status badge, optional reason+note form on toggle-off, silent reactivate on toggle-on, anonymized hides toggle, inactivity-warning row + Reset link, disable-history accordion, mock-backend POST_SAVE_ACTIONS support, seed users get is_active + populated disable blocks.

**Why paused:** the remaining table-heavy sections in UserView (Audit's three tabs, Devices, Locations, Groups membership) feel cramped inside the Modal.detail width. The right fix isn't more table columns — it's swapping those TableViews for ListView with toolbar + show-more pagination. That work is captured in [`listview-search-filters-pagination.md`](./listview-search-filters-pagination.md) and is already fully planned.

Resuming this request after ListView lands will likely look like: replace the table-shaped sections with toolbar-equipped ListViews, then continue with **Phase 3** (throttle badge + clear-rate-limit), **Phase 4** (identity-change cards), **Phase 5** (field-write protection gating + "Include disabled" toggle on TablePages), **Phase 6** (Group/Member spec quirks), **Phase 7** (security-events feed).

---

# Admin UserView/GroupView/MemberView — spec alignment

The `detailview-audit-followups` request fixed the polish + structural bugs the audit caught. This follow-up captures the **complete admin-UI spec** for users / groups / members the user provided on 2026-05-09 — the disable lifecycle, identity-change flows, MFA surface, throttling, field-write protections, and POST_SAVE_ACTIONS shape that admin views should be wired against.

It also captures four immediate UserView issues the user observed during walkthrough.

## Immediate issues (UserView)

### I1. Profile section: clicking edit pencils fires twice

**Symptom:** clicking the pencil icon on any Profile row (Display Name, First Name, Last Name, etc.) fires the corresponding `onActionEdit*` handler twice — the prompt opens, dismisses, opens again. Confirmed for Display Name, First Name, Last Name; assume same for the rest until tested.

**Likely cause:** double event delegation. Either:
- The action bubbles to both `UserProfileSection` AND `UserView`, both dispatching the same handler.
- Both `data-change-action` and `data-action` attributes are on the same element (one shouldn't be).
- The action emits via `this.emit('action:edit-...')` which gets caught by an `on(...)` listener AND the natural event-delegation dispatch fires the handler too.

**Fix candidate:** trace one click with `EventDelegate` debug enabled to confirm which two paths fire. Most likely the `emit('action:edit-personal')` pattern (UserView.js around line 505-516) is doubling up with the natural EventDelegate dispatch.

**Preference:** the user prefers **one-line edits at a time** (Modal.prompt for single fields), not multi-field forms. Keep current shape; just stop the double-fire.

### I2. Remove `force-verify-*` from the User context menu

**File:** [`UserView.js:1356-1361`](src/extensions/admin/account/users/UserView.js:1356) — the contextItems block.

Remove these three entries:
- `Send Email Verification` (`send-email-verification`)
- `Force Verify Email` (`force-verify-email`)
- `Force Verify Phone` (`force-verify-phone`)

**Reason:** per the spec below, `is_email_verified` / `is_phone_verified` are `SUPERUSER_ONLY_FIELDS` — most admins can't flip them and would get a 403. Email/phone verification belongs in the dedicated identity-change flows (`POST /api/auth/email/verify/send` etc.) wired through identity cards, not the kebab menu.

The corresponding `onActionForceVerifyEmail` / `onActionForceVerifyPhone` / `onActionSendEmailVerification` handlers can be removed too unless they're invoked elsewhere.

### I3. Avatar — both clear AND set

**Currently:** `Clear Avatar` exists in the context menu (UserView.js:1350); no "set/upload" action.

**Pattern to copy:** [`UserProfileView.onActionChangeAvatar`](src/extensions/user-profile/views/UserProfileView.js:156-171) uses `Modal.updateModelImage`:
```js
await Modal.updateModelImage(
    { model: this.model, field: 'avatar', title: 'Change Avatar', upload: true },
    { name: 'avatar', size: 'lg', imageSize: { width: 200, height: 200 }, placeholder: 'Upload your avatar' }
);
```

**Plan:**
- Add a `Change Avatar` entry to UserView's context menu pointing at a new `onActionChangeAvatar` handler that calls `Modal.updateModelImage` with the same shape (admin endpoint targets `/api/user/<id>` automatically since the model's endpoint is set there).
- Keep `Clear Avatar`.
- After save, re-render the header (icon and any chips that depend on avatar).

### I4. Missing TOTP info

**Symptom:** the Security section doesn't surface TOTP enrollment status. Per the spec, `UserTOTP.is_enabled` is the source of truth and should be visible alongside passkeys + SMS-MFA in any admin "MFA status" panel.

**Fix candidate:** in `AdminSecuritySection` (or wherever MFA lives in UserView's Profile/Security sections), add a TOTP row that:
- Shows enabled / disabled badge from `UserTOTP.is_enabled`.
- If enabled: offer "Disable TOTP" admin action (calls whatever the existing endpoint is — verify against backend during build; likely `POST /api/auth/totp/disable` with the user_id).
- If disabled: read-only line "User has not enrolled TOTP". (Admin can't enroll it on their behalf — TOTP enrollment is self-service and requires the user's authenticator app.)

Plus surface `has_passkey` (from the User `full` graph) and SMS-MFA eligibility (`phone_number` set + `is_phone_verified=true`) as a single coherent MFA status block. Don't fork into three separate sections.

---

## Spec — full reference (canonical, do not paraphrase)

The user provided the following as authoritative. Captured verbatim so future work has a single source.

### Disable lifecycle (User + Group)

**Truth field:** `is_active` (Bool). Everything else is observability.

**State block:** `metadata.protected.disable.*` — visible in default graphs, writable only via the actions below.

```jsonc
{
  "active": false,                 // mirror of !is_active
  "reason": "admin|inactive|anonymized|abuse|self",
  "at": "2026-05-09T...",
  "by_user_id": 42, "by_username": "alice",
  "note": "...",
  "exempt_from_auto_disable": false,
  "warning": { "sent_at": "...", "days_until_disable_at_send": 7 },  // present during warn phase
  "history": [ { ...prior cycle..., "reactivated_*": "..." } ]       // capped at 20
}
```

**Actions** (POST_SAVE_ACTIONS — body key IS the action name):

| Endpoint | Body | Perm |
|---|---|---|
| `POST /api/user/<id>` | `{"disable":{"reason":"admin","note":"..."}}` | `manage_users` |
| `POST /api/user/<id>` | `{"reactivate":{"note":"..."}}` | `manage_users` |
| `POST /api/group/<id>` | `{"disable":{...}}` / `{"reactivate":{...}}` | `manage_groups` |
| `GET /api/auth/throttle?user_id=N&key=login` | — returns `{count,limit,window,retry_after_seconds}` | `manage_users` |
| `POST /api/auth/manage/clear_rate_limit` | `{"key":"login","user_id":N}` | `manage_users` |

**UI rules:**
- `is_active=true` → green. `is_active=false` + `disable.reason` → render reason-specific badge: `admin` (red "Blocked"), `inactive` (yellow "Auto-disabled, idle 90+d"), `anonymized` (gray "Deleted, do not re-enable"), `abuse` (red "Banned"), `self` (gray "Self-deactivated").
- `disable.warning.sent_at` present + `is_active=true` → yellow "Inactivity warning sent, X days until disable". Show "Reset" button → calls reactivate (clears warning).
- `throttle.retry_after_seconds > 0` → "Login locked for Xs after failed attempts" badge alongside `is_active`. Independent state — a user can be both throttled AND active.
- Disable button always asks for `reason` (radio) + `note` (textarea). Reactivate asks for `note` only.
- Don't show reactivate when `disable.reason="anonymized"` — irreversible.
- `disable.history` is the audit timeline — render as collapsed accordion.

### ⚠️ Gotchas every admin UI hits

| | What |
|---|---|
| **List filters hide disabled by default** | `LIST_DEFAULT_FILTERS={"is_active":True}` on User/Group/GroupMember. To show disabled, pass `is_active=false` or `is_active=null` in query string. UI needs an "Include disabled" toggle. |
| **Owner perm auto-filters lists** | A user with only `owner` perm calling `GET /api/user` gets only themselves, not 403. Don't assume an empty list means no access. |
| **`metadata.protected.*` is visible, not secret** | All clients see it. The lock is on writes (only superuser or `PROTECTED_JSON_PERMS` / `manage_users`). Truly hidden data is on `MojoSecrets` fields, never serialized. |
| **`User.is_active` ≠ `GroupMember.is_active`** | Independent flags. Disabling a user does NOT flip their memberships. A "blocked" user may still appear as active in a group's member list. UI should compute "effective member" = `user.is_active && member.is_active`. |
| **`ChatMembership.status="banned"` is unrelated** | That's chat-room scope. Don't confuse with user/group disable. |
| **`auth_key` rotation = global logout** | `POST /api/auth/sessions/revoke` (with `current_password`) rotates it. Other JWTs become invalid instantly. Email and password changes also rotate it. |
| **Org assignment changes JWT TTLs** | `User.org.metadata.access_token_expiry`/`refresh_token_expiry` override defaults. Reflect this in any "session policy" UI. |
| **POST_SAVE_ACTIONS shape — body key IS the action** | `{"disable":{...}}` not `{"action":"disable","data":{...}}`. Each model exposes its own set; see below. |

### Field write protections

UI needs to gate input fields client-side to match these or it'll get 403s:

| Class | Fields | Rule |
|---|---|---|
| `NO_SAVE_FIELDS` | `auth_key`, `last_activity`, `is_dob_verified` | Never writable via REST (silently ignored) |
| `SUPERUSER_ONLY_FIELDS` | `is_email_verified`, `is_phone_verified`, `is_dob_verified`, `requires_mfa` | Only `is_superuser` can flip |
| `MANAGE_USERS_ONLY_FIELDS` | `is_active`, `org`, `org_id` | Requires `manage_users` |
| Permissions | `permissions.*` | Some keys are protected via `USER_PERMS_PROTECTION` — granting `manage_users`, `manage_groups`, etc. requires `manage_users` itself. UI: hide checkboxes the caller can't toggle. |

### POST_SAVE_ACTIONS by model

| Model | Actions | Body example |
|---|---|---|
| User | `send_invite`, `disable`, `reactivate` | `{"send_invite":true}` / `{"disable":{...}}` |
| Group | `realtime_message`, `disable`, `reactivate` | — |
| GroupMember | `resend_invite` | `{"resend_invite":true}` |
| UserAPIKey | `revoke` | `{"revoke":true}` |
| Notification | `mark_read` | `{"mark_read":true}` |
| GeoLocatedIP | `refresh`, `threat_analysis`, `block`, `unblock`, `whitelist`, `unwhitelist` | `{"block":{"ttl":3600,"reason":"..."}}` |

### Endpoints worth surfacing in admin UI

| Method | Path | Use |
|---|---|---|
| `GET/POST` | `/api/user[/<id>]` | CRUD; default graph includes `metadata` so `disable.*` is in payload |
| `GET` | `/api/user/me` | "Acting as" view |
| `POST` | `/api/auth/sessions/revoke` (auth+current_password) | Self log-out-everywhere |
| `GET` | `/api/account/security-events` | Per-user audit feed (login, password reset, MFA, email/phone/username change, sessions, oauth, passkey, magic_login, deactivate) — already permission-scoped to caller. Use this for "Activity" tab. |
| `POST` | `/api/account/deactivate` → `/confirm` | Self-anonymize (DESTRUCTIVE — confirms via emailed token; calls `pii_anonymize()`) |
| `GET/POST` | `/api/group[/<id>]` | CRUD |
| `GET/POST` | `/api/group/member[/<id>]` | CRUD memberships |
| `POST` | `/api/group/member/invite` (body: `email`, `group`) | Invite-flow with email |
| `GET` | `/api/group/<id>/member` | Member list scoped to one group |

### Group quirks for admin UI

- **Hierarchy:** `Group.parent` (FK self). Permission checks walk parents — `group.get_member_for_user(user, check_parents=True)`. Show parent breadcrumb in UI.
- **`Group.kind`** — string discriminator (default `"group"`). Different `kind` values typically render differently. Don't hardcode "group" in copy.
- **`auth_domain`** — white-label custom domain for auth pages. Unique. Setting it changes which login page that org's users see.
- **`org` on User** — points at a Group; not the same as memberships. It's the user's *default org*, used for token TTL config and push routing. A user is usually a member of `org` too but doesn't have to be.
- **Group's `PROTECTED_JSON_PERMS = ["admin_compliance", "admin_verify"]`** — different perms than User's. UI gating differs.

### GroupMember quirks

- **Per-group permissions** — `GroupMember.permissions` is a JSON dict scoped to that group. Distinct from `User.permissions` (system-wide).
- **`sys.` prefix on perm checks** — `member.has_permission("sys.foo")` checks `user.permissions.foo`, not member perms. UI building a "who has X" report must know which scope it's asking about.
- **Per-perm grant authority** — `MEMBER_PERMS_PROTECTION` setting controls which perms a non-`manage_groups` member can hand out. UI should fetch this once and gate checkboxes.
- **`CREATED_BY_OWNER_FIELD = 'created_by'`** — protects who created the membership. Don't expose as editable.
- **Member graph defaults to nesting `user:"default"` and `group:"basic"`** — list payloads are heavier than they look. Use `?graph=basic` if building a roster picker.

### Identity-change flows (don't reinvent)

All require `current_password` for auth users with passwords; OAuth/passkey-only users skip the password check:

| Flow | Endpoints |
|---|---|
| Email change | `POST /api/auth/email/change/{request,confirm,cancel}` — link or `method=code` (OTP). Notifies old address. Rotates `auth_key`. |
| Phone change | `POST /api/auth/phone/change/{request,confirm,cancel}` — OTP only. SMS to new + notice to old. |
| Username change | `POST /api/auth/username/change` — synchronous, returns new username. |
| Password reset | `POST /api/auth/forgot` (link or `method=code`) → `/api/auth/password/reset/{token,code}`. |
| Email verify | `POST /api/auth/email/verify/send` → `/verify`. |
| Magic login | `POST /api/auth/magic/{send,login}` (email or `method=sms`). |

UI should expose these as managed "Identity" cards rather than letting admins poke `email`/`phone_number`/`username` directly — direct writes to those fields are blocked by `on_rest_pre_save`.

### MFA

- `User.requires_mfa` — superuser-only flag.
- Methods: TOTP (`UserTOTP.is_enabled`), SMS (requires `phone_number` + `is_phone_verified`), Passkey (`Passkey.is_enabled`).
- Login response when MFA gate trips: `{mfa_required:true, mfa_token, mfa_methods:[...], expires_in}` instead of JWT. UI must detect this branch.
- `has_passkey` is a User extra in the `full` graph — handy for "MFA status" badge.

### Throttling vs blocking — separate axes

| Axis | Source of truth | UI signal |
|---|---|---|
| Account block | `User.is_active` + `disable.*` | Permanent until reactivate |
| Login lockout | Redis `srl:login:account:<pk>` | Temporary; `GET /api/auth/throttle` |
| IP block | `GeoLocatedIP.is_blocked` + `block_active` | Time-windowed; separate model with own actions |

A user can be `is_active=true` but throttled (recent failures), or `is_active=false` and not throttled (admin-blocked, no recent attempts). Render both independently.

### What lives in `metadata.protected` to be aware of

(These are visible — not secrets.)

| Key | Meaning |
|---|---|
| `disable.*` | New namespace (this request) |
| `disable_warned`, `disable_warn_date`, `no_disable` | Legacy keys — kept for one release for back-compat |
| `orig_webapp_url`, `last_webapp_url` | Multi-tenant URL tracking from login |
| `email_template` (Group) | Custom email template prefix |
| `timezone`, `short_name`, `domain` (Group) | Org config; surfaces via `Group.timezone`/`short_name` properties |

`MojoSecrets` keys (truly hidden, never in graphs): `password_reset_code`, `pending_email`, `pending_phone`, `email_change_otp`, `phone_change_otp`, `*_jti` token markers. UI cannot read these — only side-effect them via the identity-change endpoints above.

---

## Phased plan

Phase 1 is the four immediate UserView issues — small, can land today. Phases 2-4 break the spec into shippable units in order of user impact.

### Phase 1 — UserView immediate fixes (today)

1. **I1** Trace + fix the double-fire on Profile edit pencils.
2. **I2** Remove `send-email-verification` / `force-verify-email` / `force-verify-phone` from the User context menu and drop their handlers.
3. **I3** Add `Change Avatar` action mirroring `UserProfileView.onActionChangeAvatar`. Keep `Clear Avatar`.
4. **I4** TOTP row in the Security section with `UserTOTP.is_enabled` status + admin-disable action when enabled. Coalesce TOTP / SMS / Passkey into a single MFA status block.

### Phase 2 — Disable lifecycle (User + Group)

- Header + Overview: render the reason-specific status badge per the rules table (`admin`/`inactive`/`anonymized`/`abuse`/`self`).
- Inactivity-warning yellow badge when `disable.warning.sent_at && is_active`, with a "Reset" button calling `{"reactivate":{...}}`.
- Replace the existing on/off `is_active` toggle with a proper Disable / Reactivate flow:
  - Disable: modal asking for `reason` (radio: admin/abuse/inactive — `anonymized` and `self` are flow-specific, not admin-fired) + `note` (textarea). POST `{"disable":{"reason":"...","note":"..."}}`.
  - Reactivate: modal asking for `note`. POST `{"reactivate":{"note":"..."}}`. Hide entirely when `disable.reason="anonymized"`.
- Audit / disable.history accordion section.
- GroupView gets the same lifecycle wiring (reuse the same flows + components).
- Throttle badge: poll `/api/auth/throttle?user_id=N&key=login` on view open and on header re-render. Show "Login locked Xs" badge if `retry_after_seconds > 0`. Add "Clear rate limit" admin action calling `POST /api/auth/manage/clear_rate_limit`.

### Phase 3 — Identity-change cards

Replace direct edits of `email` / `phone_number` / `username` with managed "Identity" cards:
- Email card: shows current + verified badge + "Change" button. Change opens the same flow as `UserProfileView.onActionUpdateEmail` (request → code prompt → confirm). Email-verify-send is a separate small button on the same card.
- Phone card: same shape, OTP-only.
- Username card: synchronous change via `POST /api/auth/username/change`.
- Password card: "Send Reset Link" button calling `POST /api/auth/forgot`. Don't expose direct password edit.
- All four cards live in the existing Profile section, replacing the current pencil-icon edit-line approach for these specific fields. Display Name / First / Last keep the pencil-edit approach (no auth flow).

### Phase 4 — Field write protections + permission gating

- Wire client-side gating for `NO_SAVE_FIELDS` / `SUPERUSER_ONLY_FIELDS` / `MANAGE_USERS_ONLY_FIELDS` so admins don't see edit affordances they'd 403 on. Read the caller's perms from `app.activeUser` (or `/api/user/me`) and gate UI accordingly.
- Permissions section: hide checkboxes for keys protected by `USER_PERMS_PROTECTION` when caller lacks `manage_users`. Same gating for GroupMember's per-group perms via `MEMBER_PERMS_PROTECTION`.
- "Include disabled" toggle on UserTablePage / GroupTablePage / MemberTablePage to defeat the `is_active=true` default filter.

### Phase 5 — GroupView + MemberView spec alignment

- GroupView: parent breadcrumb (walk `Group.parent`). Don't hardcode "group" in copy — use `kind`-aware labels.
- GroupView: surface `auth_domain`, `email_template`, `timezone`, `short_name`, `domain` from `metadata.protected`.
- User → org link: show the org as a chip on UserView header + a clickable link to its GroupView.
- MemberView: distinguish per-group perms (`member.permissions`) from system perms (`user.permissions.x` via `sys.` prefix). Two separate panels.
- MemberView: gate per-perm grant authority by `MEMBER_PERMS_PROTECTION`.

### Phase 6 — Activity / Audit feed

- UserView Audit tab: replace the bespoke triple-tab (Activity/Events/Audit Log) with a single feed driven by `GET /api/account/security-events` (already permission-scoped). Categories from spec: `login, password_reset, mfa, email_change, phone_change, username_change, sessions, oauth, passkey, magic_login, deactivate`.

## Out of scope

- Backend changes (POST_SAVE_ACTIONS, NO_SAVE_FIELDS rules, etc.) — already implemented on backend per the spec.
- A full `?graph=basic` rewrite of TableViews — only do if the heavy nested-graph payloads cause a measurable problem.
- Notification / GeoLocatedIP / UserAPIKey actions outside what's already wired.

## See also

- [`detailview-audit-followups.md`](./detailview-audit-followups.md) — parent request, design polish + bug fixes.
- [`UserProfileView.js`](../../src/extensions/user-profile/views/UserProfileView.js) — reference implementation for avatar + identity flows, copy patterns from there.
