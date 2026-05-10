---
status: in-progress
type: request
scope: src/extensions/admin/account/{users,groups} · UserView · GroupView · MemberView
created: 2026-05-09
parent: detailview-audit-followups.md
---

## Status — 2026-05-10 (handoff for new session)

**Unblocked.** The previous pause-blocker [`listview-search-filters-pagination.md`](../done/listview-search-filters-pagination.md) shipped — toolbar / pagination / show-more is in `planning/done/`. The [DetailView audit round 2](../done/detailview-audit-round-2.md) also landed and incidentally swept several of the table-heavy surfaces this request was waiting on. **Phases 3 / 4 / 5 / 6 are still real work and ready to pick up.**

### Backend update — 2026-05-10 (django-mojo `9b0ac23`, `fc5e7c8`, `c3d9e1a`, `2e5ebcc`, `3f54b82`, `ad2b5c2`)

The disable lifecycle, throttle-read endpoint, five flow-mirroring POST_SAVE_ACTIONS, and a credential-permission relaxation landed in django-mojo. Before picking up Phase 3, read this delta.

**Permission tiers were unified (latest)**: `users` and `manage_users` are now treated as **equivalent** for every User admin operation. Deployments simplify away the `view_X` / `manage_X` split by holding only `users` for admin work; the framework honours both perms wherever it would honour either. Affected:

- `email` / `username` / `phone_number` (replace) field writes
- `is_email_verified` / `is_phone_verified` force-verify
- `requires_mfa` flip (was superuser-only)
- `is_active` direct write + disable / reactivate POST_SAVE_ACTIONS
- `org` / `org_id` assignment
- `new_password` admin-reset (no `current_password`)
- `permissions` grants for protected keys (`SYS_USER_PERMS_PROTECTION` now lists `["users", "manage_users"]`)
- `POST /api/auth/manage/clear_rate_limit` and `GET /api/auth/manage/throttle` REST endpoints

Self-acting users with only `owner` perm are still blocked from direct credential writes — they must use the dedicated change flows. **`is_dob_verified`, `is_superuser`, and `is_staff` remain superuser-only** (DOB compliance signal + privilege grants are the only superuser-gated controls).

For UI gating: a single boolean check `app.activeUser.has_permission(['users', 'manage_users'])` (or `is_superuser`) gates virtually every admin affordance on UserView. Phase 4's superuser-carveout shrinks to three fields: `is_dob_verified`, `is_superuser`, and `is_staff`.

**Identity-change auth endpoints remain self-service-only.** `POST /api/auth/email/change/{request,confirm,cancel}`, `POST /api/auth/phone/change/{request,confirm,cancel}`, and `POST /api/auth/username/change` all read `user = request.user` with no admin override. Same for the new `change_username` POST_SAVE_ACTION (it has a `is_request_user()` guard). These are designed to verify channel ownership via OTP/link — admins acting on behalf-of-other use the direct field write path described above instead.

→ **Phase 3 simplifies significantly.** Three paths for admin-on-behalf-of-other identity changes now:
1. **Direct field write via `POST /api/user/<id>`** — `users` / `manage_users` / `is_superuser` all work. Recommended path for admin UI.
2. **Send the user a self-service link** — admin clicks "Send magic-login link" / "Send Reset Link"; user completes flow themselves. Useful when admin shouldn't see the new value.
3. **Phone clear/first-set** — anyone with edit access can null out a phone or set one if none exists. Replacement now works for `users`/`manage_users`/`is_superuser` (relaxed from superuser-only).

See §"Phase 3 — REVISED" below for the simplified plan.

**New: five User POST_SAVE_ACTIONS** (commit `c3d9e1a`). All are self-only — same `is_request_user()` guard as the legacy endpoints they mirror. Useful for the **user-profile** track, not Admin UserView's admin-on-behalf-of-other use cases:

| Action body | Mirrors legacy endpoint | Behavior diff |
|---|---|---|
| `{"change_username": {"username": "...", "current_password": "..."}}` | `POST /api/auth/username/change` | None — same self-only contract |
| `{"revoke_sessions": {"current_password": "..."}}` | `POST /api/auth/sessions/revoke` | Returns status only, **not a fresh JWT**. Caller must re-auth. |
| `{"confirm_totp": {"code": "..."}}` | `POST /api/account/totp/confirm` | None |
| `{"regenerate_totp_codes": {"code": "..."}}` | `POST /api/account/totp/recovery-codes/regenerate` | None |
| `{"disable_totp": true}` | `DELETE /api/account/totp` | None |

**Throttle-read endpoint at `/api/auth/manage/throttle`** (not `/api/auth/throttle` — the original spec was wrong; treat the manage path as canonical going forward). Permission: admin tier (`users` / `manage_users` / `is_superuser`). Returns `{count, limit, window, retry_after_seconds}`. Pure read, doesn't modify Redis state. Pairs with the existing `clear_rate_limit` POST.

**Schema corrections** for the disable lifecycle (vs. the spec block at line 141 below):
- **No `disable.active` mirror field.** `is_active` is the single source of truth; the spec's `"active": false` line in the `metadata.protected.disable` block is not in the actual shipped schema. Drop any UI that reads it; use `is_active` directly.
- **Group disable/reactivate requires `manage_groups` ONLY** (not `manage_groups` + `groups`). Tightened in `fc5e7c8` after security review — disabling a group is destructive and stricter than the rest of Group's `SAVE_PERMS`.
- **Reason enums split between REST and server.** REST callers can pass `admin` or `abuse` for User and `admin` / `abuse` / `archived` for Group. `inactive`, `anonymized`, `self` are server-only and rejected with 400 from REST. The disable-modal's reason radio should not offer these three.
- **Legacy keys still readable for one release.** `metadata.protected.{disable_warned, disable_warn_date, no_disable}` remain populated on existing users until the next release of django-mojo. The data migration `0041_disable_lifecycle_migrate` rewrites them under the new namespace but leaves originals in place. Phase 4's "Include disabled" toggle and any code reading exemption flags should consult **either** the new `disable.exempt_from_auto_disable` or the legacy `no_disable`.
- **Anonymize keeps a history entry.** When `pii_anonymize()` runs on a user with a non-empty live disable block, the prior block is pushed to `disable.history` with `reactivated_at: null` and `reactivated_note: "Anonymized; not reactivated"`. UI rendering history should not assume `reactivated_at` is always set.

**No change** to the Phase 1 / Phase 2 wiring — confirmed in sync with what django-mojo ships (disable/reactivate POST_SAVE_ACTIONS, reason-keyed badges, history accordion, throttle badge).



### What's already shipped (don't redo)

**Phase 1** — UserView immediate fixes (commit `52c4712`)
- I1 double-fire on Profile edit pencils — fixed
- I2 `send-email-verification` / `force-verify-email` / `force-verify-phone` removed from context menu and handlers
- I3 `Change Avatar` action wired via `Modal.updateModelImage`
- I4 TOTP / SMS / Passkey rows in the Security MFA block

**Phase 2** — Disable lifecycle (commit `d6dde92`)
- Reason-keyed status badge (`admin` / `inactive` / `anonymized` / `abuse` / `self`)
- Optional `reason + note` form on toggle-off, silent reactivate on toggle-on
- `anonymized` hides the toggle entirely (irreversible per spec)
- Inactivity-warning row in `auxFn` + "Reset" link calling `{"reactivate":{}}`
- Disable-history accordion section
- Mock-backend POST_SAVE_ACTIONS support; seed users get `is_active` + populated `disable` blocks

**Plus from round-2** — moved adjacent surfaces forward (visually, not spec-wise):
- UserView's Audit / Devices / Locations / Groups TableViews → ListView with `paginationMode: 'pages'`, `pageSize: 5`, `clickAction: 'view'`, `viewDialogOptions: { header: false, noBodyPadding: true, buttons: [] }`
- Day-grouped headers on chronological feeds via the new `groupByDay('created')` primitive (`@core/views/list/grouping.js`)
- `LoginEventView` created at `src/extensions/admin/account/login_events/LoginEventView.js`
- `FileView` migrated to extend `DetailView`
- Visual primitives `.user-audit-row` (3-col flex with leading tonal icon) and `.user-login-row` (CSS-only vertical-rail timeline) — Phase 6's unified feed should reuse these

### What's still pending — Phase order matters

**Phase 3 — Identity-change cards** (recommended starting point, see § Phase 3 — REVISED below for the corrected plan)
Restructure the email / phone / username / password rows in UserView's Profile section into managed `.admin-security-item` cards. **[updated 2026-05-10]** Per the backend perm relaxation, admins write credentials via direct field write on `POST /api/user/<id>` — not through `/api/auth/{email,phone,username}/change/*` (those stay self-service-only). The card visual restructure + `Send Reset Link` / `Send Magic Link` affordances are unchanged from the original plan. Display Name / First Name / Last Name keep the pencil approach.

**Phase 4 — Field-write protections + permission gating** *(simplified per 2026-05-10 backend changes)*
The permission gate collapsed to one tier: `app.activeUser.has_permission(['users','manage_users']) || is_superuser`. Almost every admin affordance hides/shows on this single boolean. Phase 4 work:
- Read caller perms from `app.activeUser` (or `/api/user/me`).
- Wire the admin-tier gate around: `is_active` toggle, disable/reactivate, `org` chip, force-verify icons (`is_email_verified` / `is_phone_verified`), `requires_mfa` toggle, `email`/`username`/`phone` pencils, password-reset card, throttle badge + clear, permission grants for protected keys.
- Superuser-only carve-out (3 fields): `is_dob_verified` (silently ignored — `NO_SAVE_FIELDS`), `is_superuser`, `is_staff`. Most admin UIs won't surface these anyway.
- "Include disabled" toggle on `UserTablePage` / `GroupTablePage` / `MemberTablePage` to defeat the `is_active=true` default filter.

**Phase 5 — GroupView + MemberView spec quirks**
- GroupView: parent breadcrumb (walk `Group.parent`), kind-aware copy
- GroupView: surface `auth_domain`, `email_template`, `timezone`, `short_name`, `domain` from `metadata.protected`
- User → org chip on UserView header + click-through to that GroupView
- MemberView: per-group `member.permissions` vs system `user.permissions.*` split (two panels)
- MemberView: `MEMBER_PERMS_PROTECTION` gating

Note: round-2 already added per-row pencils to `GroupIdentitySection` (commit `d314ce9`) for `name` / `kind` / `timezone` / `eod_hour` / `domain` / `portal` / `email_template`. Phase 5 builds on that — add the remaining `auth_domain` / `short_name` rows and the parent breadcrumb.

**Phase 6 — Unified security-events audit feed**
Replace UserView Audit tab's triple-tab (Activity / Events / Audit Log) with a single feed driven by `GET /api/account/security-events`. Categories per spec: `login, password_reset, mfa, email_change, phone_change, username_change, sessions, oauth, passkey, magic_login, deactivate`. Reuse the `.user-audit-row` template + `groupByDay('created')` already in place on the existing tabs.

### Where to start

A new session picking this up should:
1. Read this Status block + the `## Spec — full reference` section below (the spec is canonical, do not paraphrase from memory).
2. Pick a phase. **Phase 3 (identity cards) is the highest-impact and self-contained** — doesn't depend on Phase 4/5/6.
3. Run `/design planning/requests/admin-users-spec-alignment.md` if a fuller plan section is wanted before building, or `/build` directly if the phase descriptions in this file are enough.
4. Reference impl for identity flows: `src/extensions/user-profile/views/UserProfileView.js`.
5. The previously-mentioned "Phase 7" was a numbering glitch in the original status note — Phase 6 is the last phase per the plan below.

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

## Spec — full reference

Originally captured verbatim from the 2026-05-09 conversation. Cells annotated **[updated 2026-05-10]** reflect changes shipped in django-mojo since then. Use this as the canonical reference; the "Backend update" block at the top of this file lists the commits.

### Disable lifecycle (User + Group)

**Truth field:** `is_active` (Bool). Everything else is observability.

**State block:** `metadata.protected.disable.*` — visible in default graphs, writable only via the actions below.

```jsonc
{
  "reason": "admin|inactive|anonymized|abuse|archived|self",   // [updated 2026-05-10] no `active` mirror; `archived` for Group only
  "at": "2026-05-09T...",
  "by_user_id": 42, "by_username": "alice",
  "note": "...",
  "exempt_from_auto_disable": false,
  "warning": { "sent_at": "...", "days_until_disable_at_send": 7 },  // present during warn phase
  "history": [ { ...prior cycle..., "reactivated_*": "..." } ]       // capped at 20; reactivated_at can be null (anonymize)
}
```

**Actions** (POST_SAVE_ACTIONS — body key IS the action name):

| Endpoint | Body | Perm |
|---|---|---|
| `POST /api/user/<id>` | `{"disable":{"reason":"admin\|abuse","note":"..."}}` | admin tier (`users` / `manage_users`) **[updated 2026-05-10]** |
| `POST /api/user/<id>` | `{"reactivate":{"note":"..."}}` | admin tier (`users` / `manage_users`) **[updated 2026-05-10]** |
| `POST /api/group/<id>` | `{"disable":{"reason":"admin\|abuse\|archived",...}}` / `{"reactivate":{...}}` | `manage_groups` (stricter than rest of Group SAVE_PERMS) |
| `GET /api/auth/manage/throttle?user_id=N&key=login` | — returns `{count,limit,window,retry_after_seconds}` | admin tier **[updated 2026-05-10 — path was `/api/auth/throttle`, now `/api/auth/manage/throttle`]** |
| `POST /api/auth/manage/clear_rate_limit` | `{"key":"login","user_id":N}` | admin tier **[updated 2026-05-10]** |

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

**[updated 2026-05-10]** — `users` and `manage_users` are now treated as equivalent for User admin operations. The UI gating is one boolean: `app.activeUser.has_permission(['users','manage_users']) || app.activeUser.is_superuser`. The superuser-only carve-out is small (3 fields).

| Class | Fields | Rule |
|---|---|---|
| `NO_SAVE_FIELDS` | `auth_key`, `last_activity`, `is_dob_verified` | Never writable via REST (silently ignored — does NOT 403, just no-op) |
| `SUPERUSER_ONLY_FIELDS` | `is_dob_verified` (also in NO_SAVE_FIELDS), `is_superuser`, `is_staff` (via setters) | Only `is_superuser` can flip |
| `ADMIN_ONLY_FIELDS` | `is_email_verified`, `is_phone_verified`, `requires_mfa`, `is_active`, `org`, `org_id` | Admin tier (`users` / `manage_users` / `is_superuser`). `MANAGE_USERS_ONLY_FIELDS` is now an alias for `ADMIN_ONLY_FIELDS`. |
| Credential changes | `email`, `username`, `phone_number` (replace) | Admin tier — same gate as ADMIN_ONLY_FIELDS. Self-acting users with only `owner` perm must use the change flows. |
| Phone clear / first-set | `phone_number` (null or first value) | Anyone with edit access |
| `new_password` (admin reset, no `current_password`) | — | Admin tier |
| Permissions | `permissions.*` | Most keys protected via `USER_PERMS_PROTECTION`; defaults now accept `users` or `manage_users`. UI: hide checkboxes the caller can't toggle. |

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

These flows are **self-service only** — they read `user = request.user` and have no admin override. All require `current_password` for auth users with passwords; OAuth/passkey-only users skip the password check.

| Flow | Endpoints |
|---|---|
| Email change | `POST /api/auth/email/change/{request,confirm,cancel}` — link or `method=code` (OTP). Notifies old address. Rotates `auth_key`. |
| Phone change | `POST /api/auth/phone/change/{request,confirm,cancel}` — OTP only. SMS to new + notice to old. |
| Username change | `POST /api/auth/username/change` — synchronous, returns new username. |
| Password reset | `POST /api/auth/forgot` (link or `method=code`) → `/api/auth/password/reset/{token,code}`. |
| Email verify | `POST /api/auth/email/verify/send` → `/verify`. |
| Magic login | `POST /api/auth/magic/{send,login}` (email or `method=sms`). |

**[updated 2026-05-10]** Admins acting on behalf of another user **do not call these endpoints**. They use direct field writes on `POST /api/user/<id>` instead — `_handle_existing_user_pre_save` accepts `users` / `manage_users` / `is_superuser`. The auth/change/* endpoints stay reserved for user-driven flows that prove channel ownership via OTP/link.

### MFA

- `User.requires_mfa` — **[updated 2026-05-10]** admin-tier flag (`users` / `manage_users` / `is_superuser`); was previously superuser-only.
- Methods: TOTP (`UserTOTP.is_enabled`), SMS (requires `phone_number` + `is_phone_verified`), Passkey (`Passkey.is_enabled`).
- Login response when MFA gate trips: `{mfa_required:true, mfa_token, mfa_methods:[...], expires_in}` instead of JWT. UI must detect this branch.
- `has_passkey` is a User extra in the `full` graph — handy for "MFA status" badge.

### Throttling vs blocking — separate axes

| Axis | Source of truth | UI signal |
|---|---|---|
| Account block | `User.is_active` + `disable.*` | Permanent until reactivate |
| Login lockout | Redis `srl:login:account:<pk>` | Temporary; `GET /api/auth/manage/throttle` **[updated 2026-05-10 — was `/api/auth/throttle`]** |
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
- Throttle badge: poll `/api/auth/manage/throttle?user_id=N&key=login` on view open and on header re-render. Show "Login locked Xs" badge if `retry_after_seconds > 0`. Add "Clear rate limit" admin action calling `POST /api/auth/manage/clear_rate_limit`.

### Phase 3 — Identity-change cards

Replace direct edits of `email` / `phone_number` / `username` with managed "Identity" cards:
- Email card: shows current + verified badge + "Change" button. Change opens the same flow as `UserProfileView.onActionUpdateEmail` (request → code prompt → confirm). Email-verify-send is a separate small button on the same card.
- Phone card: same shape, OTP-only.
- Username card: synchronous change via `POST /api/auth/username/change`.
- Password card: "Send Reset Link" button calling `POST /api/auth/forgot`. Don't expose direct password edit.
- All four cards live in the existing Profile section, replacing the current pencil-icon edit-line approach for these specific fields. Display Name / First / Last keep the pencil-edit approach (no auth flow).

### Phase 4 — Field write protections + permission gating

- Wire client-side gating against `NO_SAVE_FIELDS` / `SUPERUSER_ONLY_FIELDS` / `ADMIN_ONLY_FIELDS` (the latter formerly known as `MANAGE_USERS_ONLY_FIELDS`, retained as an alias). Single boolean for the admin tier: `app.activeUser.has_permission(['users','manage_users']) || is_superuser`. Superuser-only carve-out is `is_dob_verified` + `is_superuser` + `is_staff` only.
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

---

## Plan — Phase 3 (identity-change cards)

Designed 2026-05-10. Phases 4-6 will each get their own design pass.

### Audit summary — what's already wired

A read-through of [`UserView.js`](../../src/extensions/admin/account/users/UserView.js) shows Phase 3's surface is mostly already in place; the gap is narrower than the original Phase notes suggested:

- `UserProfileSection` template (lines 420-587) already renders Personal / Account / Linked-accounts / 2-factor with pencil-edit rows for Display name / Username / Email / Phone, including force-verify / unverify icon-buttons on the Email and Phone rows.
- `onActionEditUsername` (1547), `onActionChangeEmail` (1558), `onActionChangePhone` (1569) all exist — they just call `_savePersonalField` → `model.save()` direct (which the spec says is blocked by `on_rest_pre_save`).
- `onActionResetPassword` (1513) already POSTs `/api/auth/password/reset` — correct flow, just not surfaced on the Profile section.
- `onActionSendMagicLink` (1492) already wired correctly.
- `onActionSendEmailVerification` already exists in [`AdminSecuritySection.js:183`](../../src/extensions/admin/account/users/sections/AdminSecuritySection.js:183).
- Force-verify / unverify of email/phone (UserView 1837 / 1853 / 1873 / 1877) — present and orthogonal; perm-gating those affordances is Phase 4.
- `_fullRefresh` (1976) is the post-save path — re-renders header + overview + profile.
- Phase 1 (avatar, kebab cleanup, TOTP/SMS/Passkey block) and Phase 2 (disable lifecycle, history accordion) — confirmed shipped.

### What's missing for Phase 3

1. The three direct-save handlers must be replaced with the auth-endpoint flows from [`UserProfileView.onActionUpdateEmail`](../../src/extensions/user-profile/views/UserProfileView.js:183) / `onActionUpdatePhone` (240) / a new synchronous `onActionUpdateUsername`.
2. The Profile section needs a Password row firing `reset-password` (handler exists) and a sub-action on the Email row firing `send-email-verification` (handler exists in `AdminSecuritySection`; needs a UserView-level mirror so it fires from the Profile card).
3. The "Set Password" affordance in `AdminSecuritySection` (template lines 49-56 + handler `onActionSetPassword` at line 221) must be **removed** — spec line 250 says "Don't expose direct password edit".
4. Duplicated handlers between UserView and `AdminSecuritySection` — `onActionSendPasswordReset` and `onActionSendMagicLink` exist in both. Consolidate to UserView and let the section's actions bubble.
5. Visual restructure of the four identity rows is **optional polish**, not flow-critical. Leaving them as pencil-edit rows works; promoting them to `.admin-security-item` cards (matching the Security section's visual language) is the spec intent. Recommend yes — small diff, big consistency win.

### Open question (resolve before / during build)

~~Do `/api/auth/email/change/{request,confirm}`, `/api/auth/phone/change/{request,confirm}`, and `/api/auth/username/change` accept an admin `user_id` body param when the caller has `manage_users`, and skip the `current_password` check in that case?~~

**RESOLVED 2026-05-10: NO** — but the underlying problem is solved a different way. The auth endpoints stay self-service-only, but `_handle_existing_user_pre_save` was relaxed to allow `users` / `manage_users` admins to direct-write `email` / `username` / `phone_number` (replace) via `POST /api/user/<id>` without needing superuser. Admin UI should use the direct field write path; the auth endpoints stay reserved for user-driven flows that verify channel ownership.

**The original Phase 3 build plan below mostly works** — just don't call `/api/auth/{email,phone,username}/change/*`. Instead, do `model.save({email: new})` (or the equivalent direct POST). See §"Phase 3 — REVISED" below for the corrected version.

### Steps

1. **[`src/extensions/admin/account/users/UserView.js`](../../src/extensions/admin/account/users/UserView.js)** — replace the body of `onActionChangeEmail` (1558) by porting [`UserProfileView.onActionUpdateEmail`](../../src/extensions/user-profile/views/UserProfileView.js:183). Diffs from the reference:
   - Both `request` and `confirm` POST bodies add `user_id: this.model.id`.
   - Drop the `app.auth?.setTokens?.(confirmResp.data)` branch — admin's own tokens must not move.
   - On success: `await this._fullRefresh()` (replaces the local `model.fetch + render`).
   - Rename to `onActionUpdateEmail` and update the `data-action` in the section template (Step 4) to match.

2. **Same file** — replace `onActionChangePhone` (1569) by porting [`UserProfileView.onActionUpdatePhone`](../../src/extensions/user-profile/views/UserProfileView.js:240). Same three diffs (`user_id` in body, no token write, `_fullRefresh`). Rename to `onActionUpdatePhone`.

3. **Same file** — replace `onActionEditUsername` (1547) with a synchronous flow: `Modal.prompt` for the new username (default = current) → `POST /api/auth/username/change` body `{user_id: this.model.id, username: <new>}`. On success: toast + `_fullRefresh`. On failure: surface `resp.message`. Rename to `onActionUpdateUsername`.

4. **Same file, `UserProfileSection` template (lines 420-587)** — restructure the Personal block:
   - Username, Email, Phone rows → swap from pencil-row markup to `.admin-security-item` card markup (same shape as [`AdminSecuritySection.js:20-36`](../../src/extensions/admin/account/users/sections/AdminSecuritySection.js:20)). Each card: leading tonal icon + primary line (current value + verified badge) + secondary description + trailing pill button "Change" (firing `update-username` / `update-email` / `update-phone`).
   - Email card: when `!is_email_verified`, add a small inline secondary action firing `send-email-verification`.
   - Email/Phone cards keep the existing force-verify / unverify icon-buttons (orthogonal to identity change; Phase 4 will gate them by perms).
   - Add a new **Password card** firing `reset-password` (the handler at UserView 1513 already does the right thing).
   - Display name, First / Last name (if present), and the rest of the Account block — leave untouched.
   - Drop the dropped-name `data-action` values: `change-email`, `change-phone`, `edit-username` (replaced by the renames above).

5. **Same file** — `_savePersonalField` (1580) is now used only by `onActionEditDisplayName`. Either keep as-is (one extra helper, low cost) or fold the two-line save into the handler. Recommend keep — it leaves a clean extension point if first-name / last-name pencil edits move to UserView in the future.

6. **[`src/extensions/admin/account/users/sections/AdminSecuritySection.js`](../../src/extensions/admin/account/users/sections/AdminSecuritySection.js)** — delete:
   - The "Set Password" template row (lines 49-56) and its handler `onActionSetPassword` (221-245). Spec: "Don't expose direct password edit."
   - Section-level `onActionSendPasswordReset` (164-181) and `onActionSendMagicLink` (202-219). The `data-action="send-password-reset"` and `data-action="send-magic-link"` attributes on the template rows stay; events bubble to UserView's existing `onActionResetPassword` (1513) and `onActionSendMagicLink` (1492).
   - `data-action="send-password-reset"` resolves via UserView's `onActionResetPassword` only if the action name matches the handler. **Either** rename UserView's handler to `onActionSendPasswordReset` and update the kebab item from `reset-password` to `send-password-reset` (cleaner — three call sites converge on one name) **or** rename the section's `data-action` from `send-password-reset` to `reset-password` to match the existing UserView handler. Recommend the rename of UserView's handler (one canonical name across kebab + Profile card + Security section).

7. **[`CHANGELOG.md`](../../CHANGELOG.md)** — `Unreleased` entry: "Admin UserView Profile section now uses managed identity cards routing through `/api/auth/{email,phone,username}/change` instead of direct field edits — admins can no longer trigger 403s by poking protected fields. Direct password-set affordance removed; admins use the Send Reset Link flow."

### Design Decisions

- **Cards reuse `.admin-security-item` markup/CSS**, already dark-mode-audited (admin.css:2935+). No new CSS class, no new component.
- **Single canonical handler per action** — kebab + Profile card + Security section all dispatch through the same UserView-level handler. Section-level duplicates are deleted.
- **`user_id` in body** for admin auth-flow calls — matches the only admin-targeting auth precedent in the spec (`/api/auth/manage/clear_rate_limit`).
- **No JWT writeback for admin email change** — dropping `app.auth.setTokens` is the only behaviour difference vs. the user-profile reference impl.
- **Force-verify / unverify icons stay** on the Email / Phone cards as small secondary affordances. They are SUPERUSER_ONLY_FIELDS but the perm gating is Phase 4 — leaving them visible matches today's behaviour.
- **Display Name keeps the pencil pattern.** No auth flow involved; spec line 314 explicitly excludes it from the card treatment.
- **Dead code**: [`src/extensions/admin/account/users/sections/AdminProfileSection.js`](../../src/extensions/admin/account/users/sections/AdminProfileSection.js) is unused (not imported anywhere) and overlaps Phase 3's territory. **Out of scope for this build** — flag as a follow-up cleanup task. Removing it now bloats the diff and risks a "we'll need it again" objection.

### Edge Cases

- **OTP prompt cancelled** — `Modal.prompt` returns `null`/`undefined`; early-return without toast (mirrors UserProfileView).
- **Wrong / expired OTP** — backend returns `{success: false, message}`; toast `resp.message || 'Invalid or expired code'`.
- **Backend rejects admin `user_id`** — toast the backend error, no client-side fallback. This is the open-question failure mode; surface, don't silently ignore.
- **Username collision** — backend 4xx; surface `resp.message`.
- **`_fullRefresh` after phone/email change** — pulls the model fresh; `is_email_verified` / `is_phone_verified` reflect whatever the backend now holds. Don't pre-emptively flip client-side.
- **Auth_key rotation cascade** (spec line 184) — affects the *target* user's other sessions; admin's own session unaffected. No client-side handling needed.
- **No email on file when "Send Reset Link" fired** — handler at UserView 1513 already guards (`'User has no email on file'` toast).
- **Dialog dismissal mid-flow** — request-step success but confirm-step dialog closed: backend OTP expires in its own time; nothing to clean up client-side.

### Testing

- **Manual primary**: `npm run dev`, open the example portal admin Users table, drill into a user, exercise each card under both light + dark themes:
  - Update email → OTP prompt → confirm. Verify the request body includes `user_id`.
  - Update phone → same.
  - Update username → synchronous; new username renders in header + chips after `_fullRefresh`.
  - Send Reset Link from the Password card → toast on success.
  - Email card with unverified state → "Send verification" sub-action fires.
  - Force-verify / unverify icon-buttons still work.
- **Lint + unit**: `npm run lint && npm run test:unit` to catch unrelated breakage. No new framework primitive → no new unit test required.
- **Regression sweep**: `AdminSecuritySection` template still renders correctly minus the Set-Password and Send-Reset / Send-Magic rows (the latter two stay in template; only handlers removed).

### Docs Impact

- `CHANGELOG.md` — yes (Step 7).
- `docs/web-mojo/` — no. Feature work in `src/extensions/admin/`, no public framework primitive change.
- In-file comments — minimal; one-line note on each ported handler that the diffs from `UserProfileView` are `user_id` body + no token writeback + `_fullRefresh` instead of local re-render.

### Out of scope

- Phases 4-6 — design separately.
- Removing dead [`sections/AdminProfileSection.js`](../../src/extensions/admin/account/users/sections/AdminProfileSection.js) — follow-up cleanup task.
- Throttle badge / `clear_rate_limit` — Phase 2 spec but not in file yet; flagged as a Phase 2 gap to address separately, **out of scope here**.
- ~~Backend admin-auth endpoint shape — captured as Open Question; resolve during build.~~ Resolved — see top-of-file backend update.
- `onActionImpersonate` (UserView:1896) — handler exists but no kebab item; orphan, leave alone.

---

## Phase 3 — REVISED (2026-05-10)

The credential-change permission was relaxed in django-mojo: any caller with `users` / `manage_users` / `is_superuser` can direct-write `email` / `username` / `phone_number` (replace) on another user's record. The original Phase 3 plan's pencil-edit affordances therefore work for the full admin tier, not just superusers.

### Working principle

**Admins direct-edit another user's email/phone/username via `POST /api/user/<id>` field writes.** The dedicated `/api/auth/{email,phone,username}/change/*` endpoints stay self-service — they exist for user-driven flows that verify channel ownership via OTP/link. Admin UI uses the field-write path.

### Plan delta vs. the original Phase 3

The original plan steps **stand**, with these substitutions:

- **Steps 1, 2, 3** (port `onActionUpdateEmail` / `onActionUpdatePhone` / `onActionUpdateUsername` from `UserProfileView`) — DON'T port the auth-endpoint flow with `user_id` body. Use direct field write instead:

  ```js
  await this.model.save({ email: newEmail });   // or username, or phone_number
  await this._fullRefresh();
  ```

  No OTP prompt needed. The backend rotates `auth_key` on credential change, invalidating the target user's other sessions automatically. Toast on success / error.

- **Step 4** (`UserProfileSection` template restructure to `.admin-security-item` cards) — unchanged. Cards make discoverability cleaner regardless of the underlying handler shape.

- **Step 5** (`_savePersonalField` cleanup) — unchanged.

- **Step 6** (delete `AdminSecuritySection` Set-Password row + duplicate handlers) — unchanged. Spec still says "no direct password edit" — admins use Send Reset Link / Send Magic Link instead.

- **Step 7** (CHANGELOG entry) — new wording: "Admin UserView Profile section now uses managed identity cards routing through `POST /api/user/<id>` field writes for email / phone / username changes. `users` / `manage_users` / superuser callers can edit; the dedicated `/api/auth/{email,phone,username}/change` endpoints remain reserved for user-driven self-service flows."

### Permission gating on the cards

One boolean gate: `isAdmin = app.activeUser.has_permission(['users','manage_users']) || app.activeUser.is_superuser`.

- `isAdmin === true`: pencil-edit visible, works for email / username / phone-replace, force-verify icons, password reset.
- Otherwise: render read-only row + "Send magic-login link" sub-action so the user can complete the change themselves via the self-service flows.

That's the Phase 4 split, but worth implementing the gate now since it's a one-line check. **Don't** gate on `is_superuser` alone for these cards — the backend was relaxed (commit `2e5ebcc`+) so admins with `users` / `manage_users` can do everything except `is_dob_verified`, `is_superuser`, and `is_staff` flips.

### Force-verify / unverify icons

`is_email_verified` / `is_phone_verified` are now in `ADMIN_ONLY_FIELDS` (relaxed from superuser-only in commit `3f54b82`). Show the icon-buttons whenever `isAdmin === true`. No need for a Phase 4 carve-out specifically for these.

### Edge cases unchanged from the original

The original plan's Edge Cases section mostly still applies — the OTP / dialog-cancel paths are gone (no more two-step flow), but the `auth_key` rotation cascade, `_fullRefresh`, and the "no email on file" guard for password reset all stay valid.

### Open questions resolved

The plan's "Open question" block is now fully answered: don't call `/api/auth/{email,phone,username}/change`. Use direct field write. No backend admin-auth variants needed.

---

## Plan — Phase 3 (post-relaxation build, 2026-05-10)

This is the **canonical, ready-to-build** plan. It supersedes the original `## Plan — Phase 3` and the `## Phase 3 — REVISED` sketch above. Both prior sections kept as design history.

### Scope (read first)

**This plan changes `UserView` (admin) only.** `UserProfileView` (self-service) is referenced for visual style; no flow or file in `src/extensions/user-profile/` is being modified.

| File | Touched? | Why |
|---|---|---|
| [`src/extensions/admin/account/users/UserView.js`](../../src/extensions/admin/account/users/UserView.js) | YES — main change | Template restructure + admin-tier gating + two new phone handlers |
| [`src/extensions/admin/account/users/sections/AdminSecuritySection.js`](../../src/extensions/admin/account/users/sections/AdminSecuritySection.js) | YES — cleanup | Delete broken Send-Email-Verification + duplicate handlers; rename one data-action |
| [`src/extensions/user-profile/views/UserProfileView.js`](../../src/extensions/user-profile/views/UserProfileView.js) | NO | Self-service flow; not Phase 3's concern |
| [`src/extensions/admin/account/users/sections/AdminProfileSection.js`](../../src/extensions/admin/account/users/sections/AdminProfileSection.js) | NO | Already dead code; follow-up cleanup task |
| `CHANGELOG.md` | YES | One-line `Unreleased` entry |

### Objective

Restructure UserView's Profile section so Username / Email / Phone / Password render as managed `.admin-security-item` cards. Admin-tier callers (`users` / `manage_users` / `is_superuser`) get direct-edit affordances on email/username/phone via the relaxed `POST /api/user/<id>` field-write path. Non-admin callers see read-only rows with "Send magic-login link" so the user can self-service via `UserProfileView`. Remove the broken Send-Email-Verification affordance from `AdminSecuritySection`. Dedupe overlapping handlers. **Keep** "Set Password" — operationally required, backend-audited.

### Steps

**File: [`src/extensions/admin/account/users/UserView.js`](../../src/extensions/admin/account/users/UserView.js)** (Steps 1-5)

1. **Add `isAdminCaller` getter** to the inline `UserProfileSection` (around the existing computed properties, line 558). Reads from `app.activeUser`:
   ```
   get isAdminCaller() { ... return is_superuser || hasPermission(['users','manage_users']); }
   ```
   Mustache binds via `{{#isAdminCaller|bool}}` / `{{^isAdminCaller|bool}}`.

2. **Restructure `UserProfileSection` template** (the Personal block, lines 426-482). Replace the four existing identity rows with four stacked `.admin-security-item` cards (Display name keeps its existing pencil row; Account block stays untouched).

   Affordance table per card:

   | Card | Admin-tier caller | Non-admin caller |
   |---|---|---|
   | Username | Pencil → `edit-username` | Read-only + "Send magic-login link" → `send-magic-link` |
   | Email | Pencil → `change-email`; force-verify / unverify icon-buttons (existing) | Read-only + "Send magic-login link" |
   | Phone (no value) | "Set phone" → `set-phone` (new) | "Send magic-login link" |
   | Phone (has value) | Pencil → `change-phone`; "Clear phone" → `remove-phone` (new); force-verify / unverify | Read-only + "Send magic-login link" |
   | Password | "Send Reset Link" → `reset-password` (existing) | "Send Reset Link" → same handler |

   The existing handlers `onActionEditUsername` / `onActionChangeEmail` / `onActionChangePhone` (lines 1547/1558/1569) keep their `model.save()` direct-write bodies — backend now accepts these for admin-tier per the relaxation.

3. **Add `onActionSetPhone` and `onActionRemovePhone`** to UserView (alongside the existing pencil handlers around line 1547-1588):
   - `onActionSetPhone` — `Modal.prompt` for phone → `model.save({phone_number: trimmed})` → `_fullRefresh`.
   - `onActionRemovePhone` — `Modal.confirm` "Remove phone?" → `model.save({phone_number: null})` → `_fullRefresh`.

4. **No new identity-flow handlers, no auth-endpoint POSTs.** The relaxation makes direct field writes the canonical admin path; auth/change/* endpoints stay self-service-only.

5. **`_savePersonalField` (1580) stays as-is.** Used by all four pencil handlers.

**File: [`src/extensions/admin/account/users/sections/AdminSecuritySection.js`](../../src/extensions/admin/account/users/sections/AdminSecuritySection.js)** (Step 6)

6. **KEEP "Set Password" row + handler** (lines 49-56 + 221-245). Operationally required and backend-audited. **Verify during build:** the existing handler at line 238 does `model.save({ password: data.password })`, but the request file's relaxation note (line 24) calls the field `new_password` for admin-tier writes. Test against the backend — if `password` works, leave alone; if not, change to `new_password`. One-line fix either way.

   **DELETE:**
   - "Send Email Verification" template row (38-47) and `onActionSendEmailVerification` handler (183-200). JWT-scoped endpoint can't be admin-targeted at the right user.
   - Duplicate `onActionSendPasswordReset` handler (164-181). **Rename** the template row's `data-action="send-password-reset"` → `reset-password` so it bubbles to UserView's existing `onActionResetPassword` (1513).
   - Duplicate `onActionSendMagicLink` handler (202-219). Template row already uses `data-action="send-magic-link"` (matches UserView's handler name); just delete the section copy.

   Net delete ≈ 70 lines.

**File: [`CHANGELOG.md`](../../CHANGELOG.md)** (Step 7)

7. Add `Unreleased` entry: "Admin UserView Profile section now renders identity fields as managed cards. Admin-tier callers (`users` / `manage_users` / superuser) can direct-edit Username / Email / Phone via `POST /api/user/<id>`; non-admin callers see read-only rows with a 'Send magic-login link' affordance. New Password card with 'Send Reset Link'. Removed a broken 'Send Email Verification' affordance from the Security section (was self-scoped, didn't target the user). Deduplicated handler definitions."

### What this plan FIXES

1. Non-admin callers no longer see pencils that 4xx (template gating).
2. Profile section gets a Password card — Send Reset Link is now discoverable inline.
3. Removes broken "Send Email Verification" row from Security section.
4. Eliminates duplicate handlers between UserView and AdminSecuritySection.
5. Visual consistency: identity rows match the Security section's `.admin-security-item` card language.

### What this plan does NOT change

- "Set Password" row in Security section — KEPT per operational requirement.
- All existing UserView handlers (`onActionChangeEmail` / `onActionChangePhone` / `onActionEditUsername` / `onActionResetPassword` / `onActionSendMagicLink` / `onActionForceVerify*` / `onActionUnverify*`) — bodies unchanged.
- `UserProfileView` self-service flow — not touched.
- Avatar / disable lifecycle / audit feed / kebab menu — untouched.

### What this plan REMOVES

- "Send Email Verification" affordance — was already broken (self-scoped, sent to admin's pending state). Replacement: admin sends "Send magic-login link", user verifies their own email after logging in.

### Edge Cases

- `app.activeUser` not yet loaded → `isAdminCaller` returns `false` → non-admin affordances. Re-renders pick up correct value once activeUser settles.
- Phone empty-string vs. null → explicit `!model.get('phone_number')` check.
- No email on file when "Send Reset Link" or "Send magic-login link" fires → existing UserView handlers (1492, 1513) already guard with toast.
- Admin viewing their own user record → same gating applies; if they're admin-tier they see direct-edit, otherwise send-link to themselves (harmless no-op).
- Set-Password field-name (`password` vs. `new_password`) → one-line fix during build if needed.

### Testing

- `npm run lint && npm run test:unit` — catch unrelated breakage. No new framework primitive → no new unit test required.
- Manual: open admin Users page; drill into a user; verify all four cards render and act per the affordance table for both admin and non-admin sessions; light + dark themes.

### Docs Impact

- `CHANGELOG.md` — yes (Step 7).
- `docs/web-mojo/` — no.

### Out of scope

- Phases 4-6 — design separately.
- Removing dead `sections/AdminProfileSection.js` — follow-up cleanup task.
- Phase 2 throttle badge / `clear_rate_limit` — separate task.
- `UserProfileView` (self-service) — not touched.

---

Status: **planned** — ready to build.
