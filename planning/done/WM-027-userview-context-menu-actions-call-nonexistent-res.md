---
id: WM-027
type: bug
title: "UserView admin account actions — fix 404 endpoints (reset/magic/revoke) and expose the missing actions (SMS variants, resend invite, reset MFA, send email verification)"
priority: P1
effort: L
owner: frontend
opened: 2026-07-16
depends_on: []
related: []
links: []
---
# UserView context-menu actions call nonexistent REST endpoints (404)

## What & Why

Several admin actions on `UserView` (Profile card buttons + kebab menu)
hardcode REST paths that don't exist on the django-mojo backend, so they
404 instead of working. This is a critical-path admin tool — resetting a
locked-out user's password or sending them a magic login link are exactly
the actions support staff reach for first. All four are hardcoded path
strings that were never cross-checked against the backend's actual routes
(`mojo/apps/account/rest/user.py`), and in one case (`send-magic-link`) the
*correct* endpoint constant already exists elsewhere in this same
repo (`src/extensions/mojo-auth/mojo-auth.js`) — it just isn't the one
`UserView.js` calls.

## Acceptance Criteria

- [ ] "Send Reset Link" (`onActionResetPassword`) successfully sends a
      password-reset link and shows the success toast, verified against a
      running django-mojo backend (or documented request/response contract).
- [ ] "Send Magic Login Link" (`onActionSendMagicLink`) successfully sends
      a magic login link.
- [ ] "Revoke All Sessions" (`onActionRevokeAllSessions`) successfully
      revokes the target user's sessions.
- [ ] "Impersonate" (`onActionImpersonate`) either works end-to-end against
      a real backend endpoint, or the button is removed/hidden pending a
      decision on whether impersonation is even a supported feature (see
      Investigation — no backend route exists for it at all).
- [ ] No other `data-action` handler in `UserView.js` (or the section files
      it delegates to — `AdminSecuritySection.js`, `AdminPersonalSection.js`,
      `AdminConnectedSection.js`) hits a hardcoded path that doesn't match
      `mojo/apps/account/rest/user.py`'s registered routes.

Folded in during scoping (Ian, 2026-07-16 — "this is the admin portal
where we are supposed to have all the options"). Feature additions in the
same file/patterns:

- [ ] Reset + magic-link dialogs offer every backend-supported delivery
      variant, including SMS (options gated on what's on file).
- [ ] **Resend Invite** kebab action (admin-gated; shown when email on
      file and `last_login` is null) fires `POST /api/user/<id>`
      `{ send_invite: true }` with confirm + toast.
- [ ] **Reset MFA** kebab action (admin-gated; shown when `requires_mfa`)
      fires `{ disable_totp: true }`, with an explicit checkbox deciding
      the `requires_mfa` flag in the same dialog.
- [ ] **Send verification email** action (admin caller, unverified email)
      posts `/api/auth/email/verify/send` with `{ email }`; stale
      "can't be admin-targeted" comment in `AdminSecuritySection.js`
      corrected.

## Repro

1. Open Admin → Users → any user with an email on file → Profile section.
2. Click "Send Reset Link" (or the kebab menu's "Send Magic Login Link").
   - Expected: success toast, email/link actually sent.
   - Actual: request 404s against `api/auth/password/reset` (or
     `api/auth/magic-link`); UI shows the generic failure toast.
3. Kebab menu → "Revoke All Sessions" → same pattern, 404 on
   `api/user/<id>/sessions/revoke`.
4. Kebab menu → "Impersonate" → 404 on `api/auth/impersonate` — this route
   does not exist anywhere in the django-mojo backend at all (see below).

## Investigation

Confirmed by reading `mojo/apps/account/rest/user.py`'s route decorators
directly (not just docs) in the sibling `django-mojo` repo, cross-referenced
against `docs/web_developer/account/authentication.md`,
`docs/web_developer/account/magic_login.md`, and `docs/web_developer/account/user.md`.

**Confidence: confirmed** for the first three; the backend route decorators
were read directly, not inferred from docs.

| Action | `UserView.js` handler | Wrong path called | Correct path (confirmed via `user.py` `@md.POST(...)`) |
|---|---|---|---|
| Send Reset Link | `onActionResetPassword` (`UserView.js:1634`, POST at `:1646`) | `POST /api/auth/password/reset` | `POST /api/auth/forgot` with `{ email, method: 'link' }` (`user.py:687`) |
| Send Magic Login Link | `onActionSendMagicLink` (`UserView.js:1613`, POST at `:1625`) | `POST /api/auth/magic-link` | `POST /api/auth/magic/send` with `{ email }` (`user.py:825`) |
| Revoke All Sessions | `onActionRevokeAllSessions` (`UserView.js:2023`, POST at `:2029`) | `POST /api/user/<id>/sessions/revoke` (no such nested route registered) | `POST /api/user/<id>` body `{ "revoke_sessions": {} }` — `revoke_sessions` is a `POST_SAVE_ACTIONS` entry on the `User` model (`mojo/apps/account/models/user.py:143-147`), same pattern as `disable`/`reactivate` |
| Impersonate | `onActionImpersonate` (`UserView.js:2127`, POST at `:2133`) | `POST /api/auth/impersonate` | **No route exists.** `grep -rn "impersonat" mojo/` across the entire django-mojo backend returns nothing. This isn't a wrong-path bug — the feature was never built server-side. |

**Reuse note (Send Reset Link / Magic Link fix):** the correct endpoint
constants already exist in this repo at
`src/extensions/mojo-auth/mojo-auth.js:54-58`
(`forgotPassword: '/api/auth/forgot'`, `magicSend: '/api/auth/magic/send'`),
proving these were correctly wired elsewhere and just never reused in
`UserView.js`. `UserView.js`'s own `onActionToggleActive` already calls
`POST /api/user/${id}` with a `{ disable: {...} }` / `{ reactivate: {} }`
POST_SAVE_ACTION body (`UserView.js:1933`, `:1942`) — `revoke_sessions` is
the same pattern, just not used yet for that action.

**Verified correct (no change needed)** — cross-checked the same way, listed
so the fix doesn't accidentally touch them:
- `onActionClearRateLimit` → `POST /api/auth/manage/clear_rate_limit` ✓
- `_refreshThrottle` → `GET /api/auth/manage/throttle` ✓
- `UserApiKeysSection.onActionGenerateKey` → `POST /api/auth/manage/generate_api_key` ✓
- `onActionToggleActive` → `POST /api/user/<id>` `{disable|reactivate}` ✓
- `onActionChangePassword` → `model.save({ new_password })` → `POST /api/user/<id>` ✓ (matches "Admin Password Reset" in `authentication.md`)
- `onActionDeleteUser` / OAuth-connection unlink / passkey CRUD — standard `Model`/`Rest` CRUD, no hardcoded custom paths.

**Regression-test feasibility:** these are `rest.POST(...)` calls with no
existing REST/Model test coverage in `UserView.js`. A unit test can assert
the outgoing URL string per action (mock `rest.POST`/`app.rest`, assert
call args) without needing a live backend — narrow and directly catches
this class of bug (wrong hardcoded path) on future regressions.

**Open question for /scope:** Impersonate has no backend implementation to
target at all — this is a separate, larger question (new django-mojo route
+ auth/session semantics for "become this user"), not a one-line path fix.
/scope should decide: (a) fix the three confirmed path bugs now and file a
follow-up feature request for impersonation (cross-repo `depends_on` on a
new django-mojo item once scoped there), or (b) hide/disable the
"Impersonate" kebab item until that backend work exists, so it doesn't look
like a working feature that silently 404s.

→ Resolved during /scope (2026-07-16): option (a) + delete the dead handler.
See `## Notes` for the agreed plan.

## Notes

**Agreed plan (scoped 2026-07-16, user-approved):**

All changes in `src/extensions/admin/account/users/UserView.js` + one
regression test + CHANGELOG entry.

1. **`onActionSendMagicLink` (`:1613-1632`)** — replace the wrong POST
   (and the bare `Modal.confirm`) with a delivery-choice dialog +
   `rest.POST('/api/auth/magic/send', ...)`. Options built from what's
   on file (backend-confirmed `user.py:825-860`):
   - **Email link** (requires `email`) → `{ email }`
   - **SMS link** (requires `phone_number`) → `{ email, method: 'sms' }`
     (or `{ phone_number, method: 'sms' }` when no email —
     `User.lookup_from_request` accepts either identifier)
   When only one channel is on file, a simple confirm for that channel
   is fine (no fake choice). Handler gate widens from email-only to
   email-or-phone.

2. **`onActionResetPassword` (`:1634-1653`)** — replace the bare
   `Modal.confirm` with a `Modal.form` choice dialog +
   `rest.POST('/api/auth/forgot', ...)`. Options built from what's on
   file (backend-confirmed `user.py:687-764`):
   - **Email link** (default; requires `email`) → `{ email, method: 'link' }`
   - **Email 6-digit code** (requires `email`) → `{ email, method: 'code' }`
   - **SMS 6-digit code** (requires `phone_number`) →
     `{ email, method: 'code', channel: 'sms' }` (identifier falls back
     to `phone_number` when no email)
   Note: there is **no SMS link variant for reset** — backend comment at
   `user.py:700-701`: "link mode is email-only". Handler gate widens
   from email-only to email-or-phone; the Profile "Password" row's
   `{{#hasEmail|bool}}` gating (`:517-519`) widens to match, with copy
   adjusted ("Send a reset link or code to …").

3. **`onActionRevokeAllSessions` (`:2029`)** — change
   `rest.POST('/api/user/<id>/sessions/revoke')` →
   `rest.POST(`/api/user/${this.model.id}`, { revoke_sessions: {} })`.
   `revoke_sessions` is a `POST_SAVE_ACTIONS` entry
   (`models/user.py:143-147`, handler `:1005`); the comment at `:962-964`
   explicitly authorizes POST_SAVE_ACTIONS for "an admin with
   users/manage_users" acting on another user. Same pattern as
   `disable`/`reactivate` already used in this file (`:1933`, `:1942`).

4. **Delete `onActionImpersonate` (`:2127-2141`)** — dead code (no
   `data-action="impersonate"` exists anywhere in the UI) targeting a
   nonexistent endpoint (`grep -rn impersonat` across django-mojo returns
   nothing). Real impersonation is filed as a cross-repo feature pair:
   django-mojo `planning/inbox/admin-impersonation-handoff-code.md`
   (backend, one-time handoff-code design) and web-mojo
   `planning/inbox/userview-impersonate-view-as-user.md` (UI,
   `depends_on` the django-mojo item).

*Items 5–7 are the folded-in missing admin actions (feature additions;
the bug-mode regression-first discipline applies to items 1–3 only —
these three get plain URL/payload unit coverage):*

5. **Resend Invite** — new kebab item (ADMIN_PERMS), shown when the user
   has an email **and** `last_login` is null (never logged in — the
   invite scenario). Confirm dialog →
   `rest.POST(`/api/user/${this.model.id}`, { send_invite: true })` →
   toast. Backend: `send_invite` POST_SAVE_ACTION
   (`models/user.py:143-147`, handler `:928`, impl `:1210`). web-mojo
   already fires this at creation (`UserTablePage.js:246`) — same body,
   new re-send affordance.

6. **Reset MFA (disable TOTP)** — new kebab item (ADMIN_PERMS), shown
   when `requires_mfa` is true (`has_totp` is NOT in the model graph —
   only `has_passkey`, `models/user.py:230,239` — so `requires_mfa` is
   the best available signal; the backend action no-ops gracefully when
   no TOTP rows exist: `filter().update()`, returns `{status: true}`,
   `user.py:1058-1062`). Dialog: confirm + checkbox **"Also stop
   requiring MFA for this account"** (default UNCHECKED). POST
   `/api/user/<id>` `{ disable_totp: true }`; when checked also send
   `requires_mfa: false` (same body; if combining a field write with a
   POST_SAVE_ACTION misbehaves, fall back to two sequential saves).
   Safety semantics verified: login with `requires_mfa` and NO enabled
   MFA methods proceeds without a challenge (`rest/user.py:199-202` +
   `get_mfa_methods` `:561-574`) — so keeping `requires_mfa` on never
   locks the user out; they re-enroll TOTP or fall back to verified-SMS
   / passkey MFA. That's why unchecked is the right default.

7. **Send verification email** — restore the action for admin callers
   when `hasEmail && !is_email_verified`: icon button in the Profile
   email row (next to Force verify, `:465-475`) and/or the kebab.
   Confirm → `rest.POST('/api/auth/email/verify/send', { email })` →
   toast. **Path trap (verified in source):** there are TWO routes —
   `/api/auth/email/verify/send` (`rest/user.py:885`) is
   `@md.public_endpoint()` and accepts `username`/`email` (admin-
   targetable, anti-enumeration; short-circuits "already verified");
   `/api/auth/verify/email/send` (`rest/verify.py:34`) is
   `@md.requires_auth()` self-only (`request.user`). Use the FIRST.
   The docs table (`docs/web_developer/account/user.md:22`) lists the
   self-only one — source wins. Also fix the stale Phase-3 comment at
   `AdminSecuritySection.js:179-182`: its rationale was correct for the
   `verify.py` route (and remains correct for phone verification,
   `verify.py:129` — genuinely self-only, still not added), but wrong
   as a blanket claim because the `user.py:885` route is targetable.

**Design decisions:**
- Reset uses `/api/auth/forgot` (initiation endpoint); the
  `/api/auth/password/reset/{code,token}` routes are for the *user
  completing* the flow, never called by admin UI. Admin direct-set
  already exists separately as `onActionChangePassword` (correct).
- Revoke uses the POST_SAVE_ACTION body pattern, not a nested path —
  consistent with `.claude/rules/api.md` (no ad-hoc admin-scoped
  endpoints) and this file's own `disable`/`reactivate` calls.
- No shared endpoint-constants refactor — KISS, three literals corrected
  in place.

**Edge cases:**
- `revoke_sessions` runs `_require_fresh_auth()` — with
  `FRESH_AUTH_WINDOW` enabled a stale admin session gets HTTP 440
  `reauth_required`; the existing error toast surfaces `resp.message`,
  no special handling.
- `/api/auth/forgot` and `/api/auth/magic/send` always return success
  (anti-enumeration) — success toast can't distinguish "no such
  account"; acceptable since the admin is viewing a real user record.
- Revoke response is `{status, message}` (no user payload) — handler
  only checks `resp.success`, still fine.
- Both send endpoints carry `@md.strict_rate_limit` (5 per IP / 5 min:
  `auth_forgot` at `user.py:688`, `magic_login_send` at `:826`) — an
  admin bulk-resetting several users back-to-back can hit 429; existing
  error toast surfaces it, no special handling.
- `magic/send` runs `auth_config.assert_login_method("magic", ...)`
  (`user.py:832`) — a group that disables magic login refuses the
  request; error toast surfaces the backend message.
- SMS options are only offered when `phone_number` is on file — the
  backend **silently no-ops** an SMS send to a phone-less user
  (`user.py:723-750` performs the secret writes but skips dispatch),
  so offering it blind would toast success while sending nothing.
- Identifier preference: `email` when present, else `phone_number` —
  `User.lookup_from_request(phone_as_username=True)` accepts either.

**Tests (regression — must fail before fix, pass after):**
- New unit test mocking `rest.POST` (jest.spyOn on the Rest singleton)
  and `Modal.confirm`/`Modal.form`; invoke the handlers with a model
  having `id`/`email`/`phone_number`; assert the exact URL + payload
  per variant: magic email, magic SMS, reset link, reset email code,
  reset SMS code (`channel: 'sms'`), revoke (`{revoke_sessions: {}}`),
  plus the no-email/phone-only identifier fallback.
- Same-harness coverage for the folded-in actions: resend invite
  (`{send_invite: true}`), reset MFA (`{disable_totp: true}` and the
  `requires_mfa: false` checked-variant), send verification email
  (`/api/auth/email/verify/send` + `{email}` — the path-trap assertion
  is the whole point).
- Fallback if `simple-module-loader` can't load UserView's `@ext`
  import graph: invoke the handlers against a stub `this` (they only
  touch `this.model`, `this.getApp()`, `rest`, `Modal`). If genuinely
  untestable in this harness, /build must say so explicitly.

**Verified correctly absent — do NOT add (saves future sweeps):**
- Send phone-verification SMS: `auth/verify/phone/send` is genuinely
  self-only (`request.user`, `rest/verify.py:129-152`).
- Confirm TOTP / regenerate recovery codes: both require the user's own
  valid TOTP code (`models/user.py:1017-1056`) — effectively self-only.
- Everything else admin-capable is exposed by this item or already
  works (disable/reactivate, direct password set, throttle read/clear,
  API keys) or is filed (impersonation cross-repo pair).

**Docs:** `CHANGELOG.md` entry (fixes + the new admin actions). No
`docs/web-mojo/` page documents these admin-action endpoints
(extensions/Auth.md covers the separate, already-correct auth
extension) — no doc edits.

## Resolution
- closed: 2026-07-16
- branch: main
- files changed: .claude/skills/build/SKILL.md,.claude/skills/scope/SKILL.md,AI_DEV.md,CLAUDE.md,memory.md,planning/.config,planning/.next_id,planning/README.md,planning/_template.md,planning/done/WM-015-groupauthconfigsection-edit-registration-extra-fie.md,planning/done/WM-016-inline-formview-autosave-rerenders-parent-view-and.md,planning/done/WM-017-fix-the-9-pre-existing-unit-test-failures-incident.md,planning/done/WM-018-write-docs-web-mojo-forms-autosave-md-dangling-lin.md,planning/done/WM-019-admin-full-access-permission-is-mislabeled-log-adm.md,planning/done/WM-020-tableview-gating-never-runs-checkpermissions-is-a-.md,planning/done/WM-021-epoch-formatter-mangles-iso-8601-date-strings.md,planning/done/WM-022-detailview-header-chips-evaluate-variant-and-icon-.md,planning/done/WM-023-admin-security-geofencing-rules-editor-simulator-b.md,planning/done/WM-024-configurable-file-upload-size-limit-1-gb-default-w.md,planning/done/WM-025-groupview-api-key-permissions-editor-broken-displa.md,planning/done/WM-026-memberview-widen-audit-gate-to-loglist-view-perms-.md,planning/done/WM-028-adopt-config-driven-item-id-prefixes-wm-from-the-u.md,planning/in_progress/.gitkeep,scripts/board.sh,scripts/close.sh,scripts/intake.sh,scripts/ready.sh,scripts/start.sh
  - `src/extensions/admin/account/users/UserView.js` — endpoints fixed (`/api/auth/forgot`, `/api/auth/magic/send`, `/api/user/<id>` `{revoke_sessions:{}}`), delivery-choice dialogs with SMS variants, new `onActionResendInvite` / `onActionResetMfa` / `onActionSendVerificationEmail`, kebab items with `when` gating, dead `onActionImpersonate` deleted, Profile Password row widened to email-or-phone
  - `src/core/views/feedback/ContextMenu.js` — `visibleItems()`: `permissions` (fail-closed) + `when(context)` gating, divider collapse, dispatch guard
  - `src/core/views/feedback/ModalView.js` — `when` support in `filterContextMenuItems`
  - `src/extensions/admin/account/users/sections/AdminSecuritySection.js` — stale Phase-3 comment corrected
  - `test/utils/simple-module-loader.js` — UserView registry entry + model-import stub mappings
  - `docs/web-mojo/components/ContextMenu.md`, `docs/web-mojo/components/DetailView.md`, `CHANGELOG.md`
- tests added:
  - `test/unit/UserView.actions.test.js` — 22 regression tests (URL + payload per action variant: magic email/SMS, reset link/email-code/SMS-code + option gating + identifier fallback, revoke_sessions, send_invite, disable_totp ±requires_mfa, email/verify/send path trap, impersonate removal, kebab `when`/`permissions` config). Confirmed failing (24 incl. ContextMenu) before the fix, passing after.
  - `test/unit/ContextMenu.test.js` — +6 gating tests (fail-closed permissions, any-of, live `when` re-evaluation, divider collapse, empty render, filtered-dispatch guard)
- validation: `npm test` 1503/1503 (unit 1361, build 142); lint 0 errors / 316 warnings byte-identical to pre-change baseline (stash-verified); security review clean (XSS traced through FormBuilder select-option escaping; gating strictly tightens)
