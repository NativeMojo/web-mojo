# Cross-Origin Auth Handoff Support

**Type**: request
**Status**: resolved
**Date**: 2026-04-27

## Description

The django-mojo backend now supports an authorization-code-style cross-origin auth handoff (released 2026-04-27 in `Unreleased (post v1.1.34)`). When the central auth page redirects to a different-origin app, it appends `?auth_code=<32-hex>` to the redirect URL. The consuming app must call `POST /api/auth/exchange` with that code to obtain access + refresh tokens — without that step, a portal/app deployed on a different origin from the auth server hits an infinite "no JWT → bounce to /login → no JWT" loop.

web-mojo currently has no handler for this. `AuthApp`, `PortalWebApp`, and `TokenManager` all assume tokens are minted in-app via `POST /api/login` (or recovered from `localStorage` on the same origin) and have no path that reads `?auth_code=` from the URL on bootstrap. We need a first-class hook so cross-origin deployments work out of the box.

## Context

**Backend contract (already shipped):**
- `POST /api/auth/handoff` — authenticated; mints a one-time code. Auth-page JS calls this; apps don't.
- `POST /api/auth/exchange` — public, single-use, rate-limited 20/min/IP, `requires_params("code")`. Returns the same shape as `/api/login`: `{ status, data: { access_token, refresh_token, expires_in, user } }`. Codes are 32-hex, valid for `AUTH_HANDOFF_CODE_TTL` (default 60 s), single-use via atomic Redis `GETDEL`.
- URL param convention: `?auth_code=<code>` on the consuming app's landing URL.
- Same-origin redirects do not include the param — `localStorage` is shared so no handoff is needed.

**Reference implementation (vanilla JS, in django-mojo):**
- `mojo/apps/account/static/account/mojo-auth.js` — `handleAuthCodeFromURL()`, `exchangeAuthCode(code)`, `requestHandoffCode()` (the last is for auth-side use; not relevant to web-mojo).
- `mojo/apps/account/templates/account/auth_base.html` — the auth-side `_mat.redirect` that appends the param.

**web-mojo files in scope:**
- `src/core/services/TokenManager.js` — owns token storage (`setTokens`), refresh flow, and the `auth:unauthorized` event. Adding `exchangeAuthCode(code)` here keeps the token-mutation API in one place.
- `src/core/PortalWebApp.js:170` (`_handleAuthFailure`) and `src/core/PortalWebApp.js:140` (`_handleLogout`) — the two entry points that redirect to `loginUrl`. Both need to be aware that an inbound `?auth_code=` should be redeemed *before* deciding the user is unauthenticated.
- `src/extensions/auth/AuthApp.js` — `setupAuthGuards` (line 164) is the natural place to detect and consume the param on bootstrap, before any route guard fires `auth_redirect` / navigates to `/login`.
- `src/extensions/auth/AuthManager.js` — currently the consumer of `TokenManager` for in-app login flows; should expose a thin `consumeAuthCode()` wrapper that mirrors `login()`.
- `src/extensions/mojo-auth/mojo-auth.js` — the bundled vanilla library; should also gain `handleAuthCodeFromURL` and `exchangeAuthCode` for parity with the django-mojo copy.

**Boot-order requirement:** the exchange must happen *before* route guards run, otherwise the user is bounced to `/login` and the param is lost from the URL. The right hook is in app construction, not in a page's `mounted`.

Reference docs (django-mojo side, all linked from web_developer):
- `docs/web_developer/account/auth_pages.md` — Cross-Origin Redirect Handoff section
- `docs/web_developer/account/authentication.md` — endpoint reference
- `docs/django_developer/account/auth.md` — service docs + security trade-offs

## Acceptance Criteria

- [ ] `TokenManager.exchangeAuthCode(code)` POSTs `/api/auth/exchange`, stores both tokens via the existing `setTokens()` path, and returns the user dict on success. Single-use semantics are server-enforced; the client just calls once.
- [ ] `TokenManager.handleAuthCodeFromURL()` reads `?auth_code=` from `window.location.search`, scrubs the param via `history.replaceState` *before* any network call (so a slow exchange can't leak the code to third-party scripts running between page load and redemption), and resolves to `null` if no code is present.
- [ ] `AuthApp` calls `handleAuthCodeFromURL()` once at construction time, before `setupAuthGuards()` registers `route:changed` listeners. The route guard at `AuthApp.js:174` must see `isAuthenticated === true` after a successful exchange.
- [ ] `PortalWebApp` calls `handleAuthCodeFromURL()` before deciding whether to invoke `_handleAuthFailure()`. A user landing on a protected page with `?auth_code=…` must not see the "Authentication Required" countdown.
- [ ] On exchange failure (invalid/expired code, 401, 403, network), the URL is still scrubbed (already done in step 2), the failure is emitted as `auth:exchange:failed` with the underlying error, and the existing unauthenticated flow continues — i.e. the user is treated as logged out and routed to `/login` per current behaviour. No silent retry.
- [ ] `MojoAuth.handleAuthCodeFromURL()` and `MojoAuth.exchangeAuthCode(code)` are exposed from `src/extensions/mojo-auth/mojo-auth.js` with the same signatures as the django-mojo copy, so apps that script-load that bundle directly get parity.
- [ ] Existing same-origin auth flows are unchanged — no `?auth_code=` means `handleAuthCodeFromURL()` resolves `null` immediately, no network call, no event.
- [ ] Tests: a Vitest unit covering (a) the param-scrubbing happens before the fetch, (b) successful exchange stores tokens and emits `auth:login`, (c) failed exchange clears the param and emits `auth:exchange:failed`, (d) absence of the param is a fast no-op.
- [ ] Docs updated in `docs/web_developer/auth/` (or wherever auth lives — confirm during implementation) and `CHANGELOG.md`.

## Constraints

- **No backend changes.** The django-mojo contract is fixed. If a gap is discovered, raise it as a separate request — don't paper over it client-side.
- **Param name is `auth_code` exactly** — must not collide with the existing OAuth `?code=&state=` flow handled at `mojo-auth.js:494` (`completeOAuthLogin`). Both can coexist on the same page; `auth_code` takes precedence if both are present *but the OAuth path is on the auth domain, not the consuming app*, so in practice they don't collide.
- **Scrub the URL before the fetch.** This is a security bullet from the django-mojo review. A 60-second TTL is short, but third-party analytics scripts loaded synchronously on the landing page can read `location.search` before an async exchange resolves. `history.replaceState({}, '', cleanUrl)` is synchronous — call it first, hold the code in a local variable, then `await` the exchange.
- **Single in-flight guard.** Mirror the `_refreshPromise` pattern in `TokenManager.js:198` — if `handleAuthCodeFromURL()` is called twice (e.g. PortalWebApp boot + AuthApp boot), the second call must reuse the first call's promise rather than POST a now-consumed code and 401.
- **No allowlist on the destination origin.** Out of scope here; that's a deployment decision the auth domain enforces (it doesn't, currently, by design — see django-mojo's `auth.md`).
- **Don't introduce a new storage key.** Use the existing `setTokens()` path so persistent vs. session storage rules and the `tokenInstance` reset stay consistent.

## Notes

- Suggested implementation order: TokenManager method → AuthManager passthrough → AuthApp boot hook → PortalWebApp boot hook → mojo-auth bundle → tests → docs.
- The reference vanilla implementation in django-mojo is short (~30 lines for both helpers, see `mojo/apps/account/static/account/mojo-auth.js`); the web-mojo version should be similar in size, with the addition of the in-flight guard and the event emission.
- The `auth:exchange:failed` event is new — add it to whatever auth-event registry the framework documents (search for `auth:login` listeners to find sibling events).
- `PortalWebApp._handleAuthFailure` currently shows a countdown then navigates. The handoff hook should run *before* that. A clean place is `PortalWebApp` constructor or its `start()` (whichever runs before route resolution) — confirm during implementation.
- Worth a quick test run against a multi-origin local setup: auth on `localhost:9009`, portal on `127.0.0.1:8023`, `?redirect=http://127.0.0.1:8023/` on the auth URL, and verify the portal loads authenticated without a login bounce.

---

## Resolution
**Status**: Resolved — 2026-04-27

**Commits**:
- `4d6b40d` — TokenManager: cross-origin auth handoff (?auth_code= → /api/auth/exchange)
- `740d198` — TokenManager/auth: harden exchange path from security review

**Files changed**:
- `src/core/services/TokenManager.js` — `handleAuthCodeFromURL(app)`, `exchangeAuthCode(app, code)`, `_doExchange(app, code)` plus `authCodeKey` and `_exchangePromise` in the constructor. Single-flight guard mirrors `_refreshPromise`. URL-scrub is synchronous and precedes the network call. `_doExchange` tolerates `{data:{data}}` / `{data}` / flat response wrappers (hardening from security review) and throws with a clear message if `access_token` is missing.
- `src/core/PortalApp.js` — one-line hook in `checkAuthStatus()` that runs `await this.tokenManager.handleAuthCodeFromURL(this)` before `checkTokenStatus()`. Covers both `PortalApp` and `PortalWebApp` boot paths.
- `src/extensions/mojo-auth/mojo-auth.js` — vanilla parity: `MojoAuth.exchangeAuthCode(code)` and `MojoAuth.handleAuthCodeFromURL()` with the same scrub-before-network shape; new `exchangeAuthCode` endpoint default.
- `src/extensions/auth/index.js` — `createAuthClient` parity: `auth.exchangeAuthCode(code)` and `auth.handleAuthCodeFromURL()`. Added closure-scoped `_exchangePromise` single-flight guard and `typeof window` guard (security review hardening).
- `test/unit/TokenManager.test.js` — five new `it()` blocks: scrub-before-POST ordering, success path (token storage + `auth:login`), failure path (`auth:exchange:failed` + tokens not stored + URL still scrubbed), absent-param fast no-op, concurrent single-flight.
- `docs/web-mojo/services/TokenManager.md` — new "Cross-Origin Auth Handoff" section, new methods rows, `auth:login` and `auth:exchange:failed` in the Events table.
- `docs/web-mojo/extensions/Auth.md` — new methods rows, new endpoint row, new "Cross-Origin Auth Handoff" section.
- `docs/web-mojo/core/PortalApp.md` — boot-flow diagram updated with the handoff hook; events table grew `auth:login` + `auth:exchange:failed` rows (added by docs-updater agent).
- `docs/web-mojo/core/PortalWebApp.md` — startup-lifecycle diagram updated to mention the handoff (added by docs-updater agent).
- `CHANGELOG.md` — `## Unreleased` entry under "Feature — Cross-origin auth handoff".

**Skipped (deprecated, flagged in plan)**: `src/extensions/auth/AuthApp.js` and `src/extensions/auth/AuthManager.js` — `AuthManager`'s constructor throws `DEPRECATION_MESSAGE`, `AuthApp` is broken at construction, neither is exported from the package barrel, no consumers in `src/` or `examples/`. Adding handoff hooks to dead code would be wasted surface area.

**Tests run**:
- `npm run test:unit` — 535/536 passed. The five new `TokenManager` tests all pass. The remaining failure (`includes granularity, account, slugs, date range`) is a pre-existing metrics test on `main` and is unrelated.
- `npm run lint` — 71 problems (16 errors, 55 warnings) — exactly the pre-existing baseline; this change introduced zero new lint issues.
- Test-runner agent confirmed: `test:integration` and `test:build` failures are all pre-existing infrastructure issues (missing `src/mojo.js`, missing `app.json`, etc.) and unrelated to this commit.

**Docs updated**:
- `docs/web-mojo/services/TokenManager.md`
- `docs/web-mojo/extensions/Auth.md`
- `docs/web-mojo/core/PortalApp.md` (via docs-updater agent)
- `docs/web-mojo/core/PortalWebApp.md` (via docs-updater agent)
- `CHANGELOG.md`

**Agent findings**:
- **test-runner**: all clean — no new regressions; lint baseline unchanged at 71 problems.
- **docs-updater**: added handoff hook to `PortalApp.md` boot-flow diagram and Events table; added handoff bullet to `PortalWebApp.md` startup lifecycle. `Events.md` correctly skipped (it documents DOM event delegation, not `app.events`). README index unchanged (existing entries already cover the new feature).
- **security-review**: no critical issues. Confirmed-pass: scrub-before-await ordering in all three implementations (TokenManager, mojo-auth, createAuthClient); single-flight guard correct in TokenManager; no log statements expose code or tokens; failure path is safe. Two warnings — both addressed in commit `740d198`: (1) `createAuthClient.exchangeAuthCode` was missing the single-flight guard; now has a closure-scoped `_exchangePromise`. (2) `_doExchange` was hard-destructuring `response.data.data` and would emit a misleading TypeError if the server returned a flat or single-`data`-wrapped response; now uses the same defensive unwrap pattern as `parseResponse` in `createAuthClient` and throws a clear message if `access_token` is absent.

**Validation**:
- All five new TokenManager unit tests pass and assert the security-critical ordering (URL scrub before POST), the success path (`setTokens` + `auth:login`), the failure path (`auth:exchange:failed` + no tokens stored + URL still scrubbed), the absent-param no-op, and the single-flight guarantee.
- Manual multi-origin smoke test (auth on `localhost:9009`, portal on `127.0.0.1:8023`) — not yet run on this branch; flagged for the user. Per the request's notes, the verification is: `?redirect=http://127.0.0.1:8023/` on the auth URL, sign in, confirm the portal lands authenticated with `auth_code` stripped from the URL.

---

## Plan

### Objective

Add first-class support for the `?auth_code=<32-hex>` cross-origin auth handoff so that a portal (or other consuming app) deployed on a different origin from the django-mojo auth server can be redirected back with a code, exchange it for tokens via `POST /api/auth/exchange`, and boot fully authenticated — without bouncing through the `/login` redirect. Existing same-origin flows must be byte-identical.

### Steps

**1. `src/core/services/TokenManager.js` — new core methods (the only place that can mint tokens via `setTokens()`)**

Add (constructor):
- `this.authCodeKey = 'auth_code';` — the URL param name (single source of truth, override-friendly).
- `this._exchangePromise = null;` — single-flight guard, mirrors `_refreshPromise` at line 198.

Add three methods near `refreshToken()` (lines 428–496):

- `async exchangeAuthCode(app, code)` — POSTs `/api/auth/exchange` with `{ code }`, parses `resp.data.data` (matches the `/api/login` shape per the API rules), calls `this.setTokens(access_token, refresh_token)`, calls `app.rest.setAuthToken(access_token)`, emits `app.events.emit('auth:login', user)` on success, emits `app.events.emit('auth:exchange:failed', { error })` on any failure, and resolves to the user dict (success) or `null` (failure). Single-flight via `_exchangePromise` mirroring `refreshToken()`. Never throws.
- `async handleAuthCodeFromURL(app)` — synchronously reads `auth_code` from `new URLSearchParams(window.location.search)`; if absent resolves `null` immediately (no work). If present, **synchronously** scrubs the param via `history.replaceState({}, '', cleanUrl)` while preserving `pathname`, remaining query, and `hash`; then awaits `exchangeAuthCode(app, code)` and returns its result. Param read and URL scrub happen before any `await` — the request's security bullet.
- A small private `_doExchange(app, code)` helper to keep the single-flight wrapper symmetrical with `_doRefresh`.

Why these and not a `consumeAuthCode()` on AuthManager: `AuthManager` is the deprecation stub at `src/extensions/auth/AuthManager.js` — its constructor throws `DEPRECATION_MESSAGE`. Adding methods there is dead weight. `TokenManager` is the framework's only live token-mutation surface and is owned by both `PortalApp` and `PortalWebApp`.

**2. `src/core/PortalApp.js` — boot hook (one line)**

In `checkAuthStatus()` (line 126) insert as the very first statement:

```
await this.tokenManager.handleAuthCodeFromURL(this);
```

Reason for placing it here, not in each `start()`:
- `PortalApp.start()` (line 79) and `PortalWebApp.start()` (line 69) **both** call `this.checkAuthStatus()` before any route-resolution work. Hooking it once in `checkAuthStatus` covers both classes and avoids drift.
- After the await, the existing `checkTokenStatus()` line correctly observes the freshly-stored tokens from a successful exchange and falls into the normal "load `User`" path — `_handleAuthFailure` and the countdown only fire when the exchange was missing or failed, which is the desired behavior for the third acceptance criterion.

No edits needed in `PortalWebApp._handleAuthFailure` (line 170) or `_handleLogout` (line 140) — the boot hook in `checkAuthStatus` covers both code paths the request flagged: the AuthFailure branch now sees `isAuthenticated === true` after a successful exchange, and a logged-out user re-arriving via handoff hits `checkAuthStatus` again on the next boot.

**3. `src/extensions/mojo-auth/mojo-auth.js` — vanilla parity**

Add to `DEFAULT_ENDPOINTS` (line 51):
```
exchangeAuthCode: '/api/auth/exchange',
```

Add two methods after `completeOAuthLogin` (around line 462):

- `exchangeAuthCode: function (code)` — `post(ep('exchangeAuthCode'), { code }).then(saveTokens)`. Returns the parsed data (matches `login()` shape).
- `handleAuthCodeFromURL: function ()` — mirrors the existing `handleMagicTokenFromURL` (line 271) shape exactly: read `auth_code` from URL, return `Promise.resolve(null)` if absent, otherwise scrub via `history.replaceState` **before** the network call, then `return MojoAuth.exchangeAuthCode(token)`. Module-level singleton — no in-flight guard needed (the user controls when they call it; if they call twice the second one gets a single-use 401 from the server, identical to the magic-link analogue).

**4. `src/extensions/auth/index.js` — `createAuthClient` parity (small, optional but symmetric)**

Add to `EP` defaults (line 43):
```
exchange: '/auth/exchange',
```

Add two methods to the returned object (around line 113, next to `logout`):
- `exchangeAuthCode(code)` — `post(EP.exchange, { code })` then `saveAuthData(resp)`, returns `parseResponse(resp)`. Why include this even though the request scoped only `mojo-auth`: `createAuthClient` is the active replacement for the deprecated `AuthManager.consumeAuthCode()` mentioned in the request. Without it, vanilla apps on the new API have no way to redeem a handoff code.
- `handleAuthCodeFromURL()` — same shape as the `mojo-auth.js` version. No external state, no singleton concerns.

The `mountAuth` UI function does not need a hook: `mountAuth` is the **auth-page** (login screen) UI; the handoff is *received* on the consuming app's bootstrap, not on the auth page.

**5. Tests — `test/unit/TokenManager.test.js`**

Note: the request says "Vitest" but this repo uses a custom Jest-style runner (`test/test-runner.js`). Translating to that runner — add four `it()` blocks to the existing file:

- `'scrubs ?auth_code= from URL before issuing the exchange POST'` — set `window.history.replaceState` to a `jest.fn()` capture; install `window.location` with `?auth_code=abc`; invoke `handleAuthCodeFromURL(app)`; assert `replaceState` was called *before* `app.rest.POST` (use call-order assertion via `mock.calls.length` snapshots).
- `'stores tokens via setTokens() and emits auth:login on success'` — happy path with a stubbed `app.rest.POST` returning the standard `{data:{data:{access_token, refresh_token, user}}}` shape; assert `tm.getToken()` is the new access token and `app.events.emitted` contains `auth:login`.
- `'emits auth:exchange:failed and clears the URL on POST failure'` — `app.rest.POST` rejects with a 401; assert `tm.getToken()` is still null, the URL was scrubbed (replaceState was called), and the emitted event list contains `auth:exchange:failed`.
- `'no-ops without a network call when ?auth_code= is absent'` — `window.location.search = ''`; assert `app.postCalls` length is 0 and the resolved value is `null`.

Reuse the existing `freshManager()`, `makeApp()`, `makeEvents()` helpers in the file. The test file already includes a `makeStorage` shim that satisfies `setTokens`'s `localStorage` writes.

The test file's header comment claims tests run concurrently within a file, but `.claude/rules/testing.md` says they run sequentially. Follow the file's existing isolation pattern (unique storage keys per test) regardless — it's already correct under both interpretations.

Run command: `npm run test:unit`.

**6. Docs**

- `docs/web-mojo/services/TokenManager.md` — add a row to the "Refresh methods" table (or a new "Cross-origin handoff" mini-section) documenting `exchangeAuthCode(app, code)` and `handleAuthCodeFromURL(app)`. Add `auth:login` and `auth:exchange:failed` to the Events table.
- `docs/web-mojo/extensions/Auth.md` — short subsection under "createAuthClient API" describing `exchangeAuthCode(code)` and `handleAuthCodeFromURL()` plus a one-paragraph note pointing at the django-mojo `auth_pages.md` for the upstream contract.
- `CHANGELOG.md` — entry under `## Unreleased`:
  > **Feature — Cross-origin auth handoff**: `TokenManager.handleAuthCodeFromURL()` and `exchangeAuthCode(code)` (matched in `mojo-auth.js` and `web-mojo/auth`'s `createAuthClient`) redeem a `?auth_code=` URL param against `POST /api/auth/exchange` on bootstrap. `PortalApp.checkAuthStatus()` runs the redemption before deciding the user is unauthenticated, so portals deployed on a different origin from the auth server boot directly into the authenticated state. New event: `auth:exchange:failed`.

### Design Decisions

- **Hook in `PortalApp.checkAuthStatus()`, not each `start()`** — covers both `PortalApp` and `PortalWebApp` with one line, runs before any route guard or `_handleAuthFailure` dispatch, and the existing single-flight guard tolerates the case where `PortalWebApp.start()` later calls `checkAuthStatus` again.
- **Single-flight `_exchangePromise` mirrors `_refreshPromise`** — same rationale as the constraint requires (PortalWebApp boot + AuthApp boot would otherwise race a now-consumed code into a 401).
- **URL scrub is synchronous and unconditional, before the await** — the `auth_code` is held in a closure local; analytics scripts that read `location.search` between page-load and the resolved promise see the cleaned URL.
- **Reuse `setTokens()`** — keeps persistent vs. session storage rules and `tokenInstance` reset consistent with all other token sources, per the request's storage constraint.
- **Skip `AuthApp` and `AuthManager` modifications** — the `AuthManager` constructor throws `DEPRECATION_MESSAGE`, so `AuthApp` (which calls `new AuthManager(...)` at line 64) is itself broken; both are not exported from the package barrel and have no consumers in `src/` or `examples/`. Adding handoff hooks to dead code is wasted surface area; flagged as a separate cleanup ticket if the user wants the file removed.
- **Endpoint path** — `/api/auth/exchange` for `TokenManager` and `mojo-auth.js` (consistent with their `/api/login`, `/api/token/refresh` conventions); `/auth/exchange` (no `/api` prefix) for `createAuthClient`, matching its existing `/login` / `/auth/forgot` defaults so a single `baseURL` like `https://api.example.com/api` works without surprises.

### Edge Cases

- **Handoff code arrives but exchange returns 401/403** — `_doExchange` catches, emits `auth:exchange:failed`, no tokens stored. URL is already scrubbed. Subsequent `checkTokenStatus()` returns `logout`, the existing `auth:unauthorized` flow runs, user lands on `/login`. No silent retry per the acceptance criteria.
- **Handoff code arrives while the user already has valid tokens in storage** — Acceptable: the exchange succeeds, `setTokens` overwrites with the new pair, `app.rest.setAuthToken` is updated, `auth:login` fires. No special-case logic needed.
- **Two parallel boot paths both call `handleAuthCodeFromURL`** — `_exchangePromise` guard means the second call awaits the first's result; the code is only POSTed once.
- **Network failure (offline / 5xx)** — same path as 401: emit `auth:exchange:failed`, treat as unauthenticated. Matches refresh failure behavior.
- **`window.location.search` includes both `?auth_code=…` and an OAuth `?code=&state=`** — they don't collide because the OAuth callback runs on the auth domain, not the consuming app, but the URL-scrub only deletes `auth_code` and preserves the rest, so a hypothetical co-occurrence still works.
- **`#hash` in the landing URL** — the rebuild uses `${pathname}?${remaining}${hash}` so deep-link hashes survive the scrub.
- **Empty `_exchangePromise` reset** — `.finally(() => { this._exchangePromise = null; })` clears state regardless of fulfillment or rejection, so a later code (e.g. user logged out and the auth page re-redirected) can still be exchanged.

### Testing

- `npm run test:unit` — runs the new TokenManager tests.
- `npm run lint` — covers the `src/` edits.
- Manual smoke (matching the request's "Notes"): auth on `localhost:9009`, portal on `127.0.0.1:8023`, hit `http://localhost:9009/login?redirect=http://127.0.0.1:8023/`, sign in, confirm the portal lands authenticated with the URL stripped of `auth_code`. Document the manual step in the Resolution section after `/build`.

### Docs Impact

- `docs/web-mojo/services/TokenManager.md` — yes (new methods, new event).
- `docs/web-mojo/extensions/Auth.md` — yes (new `createAuthClient` methods).
- `mojo-auth.js` — inline JSDoc only (no separate doc file).
- `CHANGELOG.md` — yes, under `## Unreleased`.

### Out of Scope

- Backend changes (frozen by the request's constraints).
- An allowlist on the destination origin (deployment concern, per request).
- Removing the deprecated `AuthApp.js` / `AuthManager.js` shims — flagged as a follow-up.
- Renaming the `auth_code` URL param.
