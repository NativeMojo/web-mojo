---
id:
type: feature
title: "UserView — Impersonate (view as user) via one-time handoff code, session-isolated"
priority: P2
effort: TBD
owner: TBD
opened: 2026-07-16
depends_on: [nativemojo/django-mojo#admin-impersonation-handoff-code]
related: [WM-027]
links: []
---
# UserView — Impersonate (view as user) via one-time handoff code

## What & Why

Admins supporting users want to see the portal exactly as a specific user
sees it — their permissions, group scoping, menus, data. UserView shipped
an `onActionImpersonate` handler, but it called a REST endpoint
(`/api/auth/impersonate`) that never existed on the backend, was never
wired to any `data-action`, and is being deleted as dead code in WM-027.
This item is the real feature, sitting on top of the django-mojo backend
item `planning/inbox/admin-impersonation-handoff-code.md` (update
`depends_on` above to its `DM-xxx` once django-mojo /scope assigns one).

**Why the old approach could never work, even with a backend:** web-mojo
stores the JWT in `localStorage` (per-origin, shared across all tabs).
Swapping in the target user's token + `window.location.reload()` — what
the dead handler did — would replace the admin's own session in every tab,
and "exiting" impersonation would mean logging in again. JS also cannot
open incognito windows (browser-privileged), so true isolation must come
from a one-time code redeemed in a separate context.

**v1 design (Ian-approved direction, 2026-07-16 — copy-link-to-private-window):**
1. Kebab item "Impersonate" (admin-gated, `manage_users` global) calls the
   new backend endpoint (suggested `POST /api/auth/manage/impersonate`,
   `{ user_id }`) and receives a single-use, short-lived (≤60s) handoff
   code for the target user.
2. Frontend builds a link — `<portal origin>/?auth_code=<code>` — copies
   it to the clipboard, and shows a dialog instructing the admin to open
   it in a **private/incognito window** (with the ≤60s / single-use
   caveat spelled out).
3. Nothing else: the existing `?auth_code=` bootstrap
   (`src/core/PortalApp.js:127`, `src/core/services/TokenManager.js:502-582`
   → `POST /api/auth/exchange`) already redeems the code and signs the
   private window in as the target user. Zero new token plumbing.

**v2 (explicitly out of scope here — separate future item if wanted):**
one-click "open impersonated tab" using a sessionStorage-scoped token
(teach `TokenManager`/`Rest` to prefer a per-tab session token) + a
persistent "Viewing as <user> — Exit" banner. Touches core auth plumbing;
v1 ships without it.

## Acceptance Criteria

- [ ] UserView kebab shows "Impersonate" only to callers with global
      `manage_users` / superuser (same `isAdminCaller` gate as other
      destructive kebab items).
- [ ] Clicking it confirms intent, calls the backend impersonate endpoint,
      copies the `?auth_code=` link to the clipboard, and shows clear
      instructions (private window, single-use, expires in ~60s).
- [ ] Opening the link in a private window signs that window in as the
      target user via the existing auth_code bootstrap — the admin's own
      session (localStorage) is untouched.
- [ ] Backend refusals (ineligible target, no permission, expired code)
      surface as error toasts with the backend message.
- [ ] Impersonated sessions are visibly marked if the backend exposes the
      `impersonated_by` claim in `/api/user/me` context (nice-to-have in
      v1; hard requirement deferred to v2's banner).
- [ ] Docs: CHANGELOG entry; admin-extension behavior noted where the
      other UserView kebab actions are documented (if anywhere).

## Repro — bugs only

n/a (feature)

## Notes

- Origin of this item: WM-027 scoping (see its `## Notes`), where the
  dead `onActionImpersonate` handler was removed and Ian chose to pursue
  impersonation properly as a cross-repo pair.
- Clipboard write: reuse the `navigator.clipboard.writeText` pattern from
  `UserApiKeysSection.onActionCopyToken` (`UserView.js:1179-1188`).
- Do NOT store the impersonated JWT in localStorage from the admin tab
  under any circumstances — that is the exact failure mode this design
  avoids.

## Resolution
- closed: YYYY-MM-DD
- branch:
- files changed:
- tests added:
