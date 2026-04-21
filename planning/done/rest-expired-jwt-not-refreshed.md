# REST calls sent with expired JWT instead of refreshing first

| Field | Value |
|-------|-------|
| Type | bug |
| Status | resolved |
| Date | 2026-04-20 |
| Severity | high |

## Description

`Rest` sends requests using whatever `Authorization` header was installed by the last `setAuthToken()` call. It does not check the JWT's `exp` before dispatching the request. If the access token has expired between the last auto-refresh tick and the outgoing call, the request fails with `401`. A burst of 401s is exactly what the backend security system uses to decide the user is abusive and block them.

The fix direction the user has asked for:

1. Before every REST call, verify the access token is not expired.
2. If it is expired, refresh it using the refresh token, then send the request with the new token.
3. If the refresh token is also expired (or the refresh endpoint rejects), throw / emit unauthorized so the call is not sent.
4. Only one refresh may be in flight at a time. Concurrent callers must `await` the same refresh promise — never fire `/api/token/refresh` N times.

## Context

Auth flow today:

- `TokenManager.startAutoRefresh()` sets a **60-second interval** that calls `checkAndRefreshTokens()`.
- `PortalApp` also calls `checkAndRefreshTokens()` on `browser:focus`.
- Both paths install a new Bearer token via `app.rest.setAuthToken(access_token)` on success.

Why this leaks expired tokens:

- Between interval ticks (up to ~60s), the stored `Authorization` header can go stale. Any request during that window ships with an expired JWT.
- After wake-from-sleep / long idle / tab backgrounding, `setInterval` callbacks may be coalesced or delayed; the first REST call after waking frequently precedes the refresh tick.
- On initial boot, `checkAuthStatus()` does refresh before loading the user — but any code path that fires `rest.*` before `start()` completes, or any call triggered during a pending refresh, bypasses the check.
- There is **no pre-request interceptor** wired up in `PortalApp`/`WebApp` to gate requests on token validity. `Rest.addInterceptor('request', ...)` exists ([Rest.js:96](src/core/Rest.js:96)) but is unused for auth.

Concurrency problem in the refresh itself:

- [TokenManager.refreshToken()](src/core/services/TokenManager.js:412) has no in-flight guard. If two requests both notice an expired token, they both enter `refreshToken()` and both POST `/api/token/refresh`. One winner, one loser — the loser's `response.data.data` destructure may throw, it writes stale tokens, or the backend rejects the second (already-rotated) refresh token and forces a logout.

## Acceptance Criteria

- REST calls must not be sent with an expired access-token JWT. Before dispatch, an expired access token triggers a refresh and the retried call uses the new token.
- If the refresh token is missing, invalid, or expired, the REST call is rejected (thrown or surfaced as an unauthorized response) **without** hitting the network, and `auth:unauthorized` is emitted.
- Concurrent REST calls that arrive while the token is expired share a single refresh attempt — exactly one `POST /api/token/refresh` is in flight at any moment.
- If a refresh is already in progress, new REST calls wait on the same promise and then proceed with the refreshed token (or fail together if the refresh fails).
- Auth-endpoint calls themselves (login, refresh) must not be intercepted by this gate — otherwise refresh recurses.
- Existing auto-refresh interval and `browser:focus` paths continue to work and do not double-refresh when the per-request gate also triggers.

## Investigation

- **Likely root cause:** No per-request token-validity check in `Rest.request()` and no single-flight guard in `TokenManager.refreshToken()`. The framework relies entirely on a 60s interval and `browser:focus` — both of which are after-the-fact and neither blocks the call that's already going out.
- **Confidence:** high (confirmed by reading the code — there is no call site that validates the token before `fetch()`).
- **Code path:**
  - [src/core/Rest.js:341](src/core/Rest.js:341) — `request()` goes straight from interceptors to `fetch()` with no token check.
  - [src/core/Rest.js:96](src/core/Rest.js:96) — `addInterceptor('request', ...)` is available but unused by `PortalApp`.
  - [src/core/Rest.js:776](src/core/Rest.js:776) — `setAuthToken()` just rewrites a header; no expiry awareness.
  - [src/core/services/TokenManager.js:398](src/core/services/TokenManager.js:398) — `startAutoRefresh()` sets 60s interval (only proactive check).
  - [src/core/services/TokenManager.js:412](src/core/services/TokenManager.js:412) — `refreshToken()` has no mutex / single-flight promise.
  - [src/core/services/TokenManager.js:333](src/core/services/TokenManager.js:333) — `checkTokenStatus()` already knows how to distinguish `refresh` vs `logout`; this logic can be reused by the gate.
  - [src/core/PortalApp.js:97-100](src/core/PortalApp.js:97) — `browser:focus` handler refreshes, but does not block in-flight requests.
- **Regression test:** not feasible with the current harness without new scaffolding. `Rest` uses global `fetch` and `TokenManager` uses `localStorage`/`sessionStorage`; there is no existing mock layer for either in `test/unit/`. The design step should add a focused unit test once a gate is introduced — e.g. install a request interceptor with a stubbed `fetch` and assert (a) no `fetch` call is made with an expired token, (b) N parallel calls produce exactly one `/api/token/refresh` call, (c) expired-refresh-token path rejects without `fetch`.
- **Related files:**
  - [src/core/Rest.js](src/core/Rest.js)
  - [src/core/services/TokenManager.js](src/core/services/TokenManager.js)
  - [src/core/PortalApp.js](src/core/PortalApp.js)
  - [src/core/PortalWebApp.js](src/core/PortalWebApp.js)
  - [src/extensions/docit/DocItApp.js](src/extensions/docit/DocItApp.js) (also calls `setAuthToken`)
  - [docs/web-mojo/services/Rest.md](docs/web-mojo/services/Rest.md) (docs update likely when public behavior changes)

## Plan

### Objective
Gate every outgoing REST call on a valid access JWT. Refresh before dispatch when the access token is expired. When the refresh token is also expired/invalid, reject the call without touching the network and emit `auth:unauthorized`. Guarantee a single refresh is in flight regardless of how many concurrent callers notice the expiry.

### Steps

1. **`src/core/services/TokenManager.js`** — Single-flight refresh + auth gate helper.
   - Add a named `AuthRequiredError` class at the top of the file (`name = 'AuthRequiredError'`, `reason = 'unauthorized'`); export it.
   - Constructor: `this._refreshPromise = null`.
   - Rewrite `refreshToken(app)`: if `_refreshPromise` exists, return it; otherwise build a promise that does today's logic, resolves `true` on success / `false` on any failure (never throws), and clears `_refreshPromise` in `.finally()`.
   - Add `async ensureValidToken(app)`:
     - `checkTokenStatus().action === 'logout'` → emit `auth:unauthorized`, `stopAutoRefresh`, throw `AuthRequiredError('Both access and refresh tokens are invalid')`.
     - `action === 'refresh'` → `await refreshToken(app)`; if `false` throw `AuthRequiredError('Refresh failed')`.
     - Otherwise return.
   - Leave `checkAndRefreshTokens`, `startAutoRefresh`, `browser:focus` behavior untouched — they now transparently benefit from single-flight.

2. **`src/core/Rest.js`** — Recognize `AuthRequiredError` from a request interceptor.
   - In the top-level catch of `request()` (line 433), before `categorizeError`, if `error.name === 'AuthRequiredError'` return:
     `{ success: false, status: 401, statusText: 'Unauthorized', headers: {}, data: null, errors: { auth: error.message }, message: error.message || 'Authentication required', reason: 'unauthorized' }`
   - Do not call response interceptors for this path — request never hit the network.

3. **`src/core/PortalApp.js`** — Install the pre-request auth gate interceptor.
   - In the constructor, right after `this.tokenManager = new TokenManager();`, register a request interceptor on `this.rest`:
     - Parse `request.url` pathname. If it starts with `/api/token/` → bypass.
     - If `this.tokenManager.getToken()` is null → bypass.
     - Else `await this.tokenManager.ensureValidToken(this)`; on throw, let it propagate (Rest turns it into the 401 response from step 2).
     - After the await, overwrite `request.headers['Authorization']` with `this.tokenManager.getAuthHeader()` — the header was snapshotted before the interceptor ran at Rest.js:346.
   - `PortalWebApp` and `DocItApp` inherit this via `extends PortalApp`.

4. **`test/unit/TokenManager.test.js`** (new).
   - JWT helper (`header.payload.sig`, chosen `exp`), stubbed `localStorage`/`sessionStorage`, fake app with `events: new EventBus()` and `rest: { POST: jest.fn(), setAuthToken: jest.fn() }`.
   - Cases: two parallel `refreshToken` ⇒ one `POST`; `ensureValidToken` valid ⇒ no POST, no throw; expired access + valid refresh ⇒ one POST, resolves; both expired ⇒ no POST, throws `AuthRequiredError`, emits `auth:unauthorized`.

5. **`test/unit/Rest.test.js`** — Extend.
   - Install a request interceptor that throws `new AuthRequiredError(...)`. Assert `fetch` not called; return is `{ success: false, status: 401, reason: 'unauthorized' }`.

6. **`docs/web-mojo/services/Rest.md`** — Under "Authentication" add "Automatic JWT refresh (PortalApp)" — gate behavior, single-flight, hard-fail to 401 + `auth:unauthorized`, `/api/token/` bypass.

7. **`CHANGELOG.md`** — Bullet: outgoing API calls block on JWT refresh when the access token is expired; concurrent callers share one `/api/token/refresh`; missing/expired refresh token short-circuits to 401 + `auth:unauthorized`.

### Design Decisions
- **Single-flight via an in-flight promise** on `TokenManager` — idiomatic JS, no external mutex.
- **Boolean from `refreshToken`, throw from `ensureValidToken`** — preserves fire-and-forget callers (`startAutoRefresh`, `browser:focus`) while giving the interceptor a typed error.
- **Bypass by URL prefix `/api/token/` plus no-token fallback** — covers refresh recursion and pre-login / public traffic.
- **`AuthRequiredError` crosses Rest↔TokenManager** — Rest only needs `error.name`; no import coupling.
- **Interceptor in `PortalApp.constructor`** — earliest safe point. `WebApp` (no auth) is untouched.
- **Re-read `Authorization` inside the interceptor after refresh** — mandatory because `request.headers` is snapshotted at Rest.js:346.

### Edge Cases
- Refresh POST 401/403 → existing unauthorized handling; Rest returns clean 401 envelope.
- Network error during refresh → stricter than today (now short-circuits to 401), which is correct: sending a known-expired token is exactly what triggers the security-system block.
- **Multi-tab** — each tab has its own in-flight promise; two tabs can still race on `POST /api/token/refresh`. Cross-tab coordination is **out of scope**.
- Clock skew — harmless early refresh.
- `download()` / `downloadBlob()` / XHR `upload()` bypass interceptors entirely → **out of scope** (note in CHANGELOG).
- `uploadMultipart` routes through `POST` → covered.

### Testing
- `npm run test:unit` for new/extended unit tests.
- Manual: sleep past access-token TTL + fire a call → transparent refresh; 5 parallel fetches with expired token → one `/api/token/refresh`; tamper both tokens → no network call, redirect.

### Docs Impact
- `docs/web-mojo/services/Rest.md` new subsection.
- `CHANGELOG.md` release bullet.

### Out of Scope
- `download()` / `downloadBlob()` / raw XHR `upload()` bypass (separate follow-up).
- Cross-tab refresh coordination.
- Changing the 60s interval or 10-minute expiring-soon threshold.

## Resolution

**Status:** Resolved — 2026-04-21
**Commits:** 58cb683 (core fix + tests + docs), 4bb65b1 (security-review tightening)

### What was implemented
- `TokenManager.refreshToken()` is now single-flight via an `_refreshPromise` field — concurrent callers share one `POST /api/token/refresh`. The inner `_doRefresh()` always resolves to `true`/`false` and never throws, preserving the fire-and-forget callers (`startAutoRefresh` interval, `browser:focus`).
- `TokenManager.ensureValidToken(app)` wraps `checkTokenStatus()` and throws an `AuthRequiredError` (new named export) when the access token is expired and no refresh path is available. Valid tokens pass through without network.
- `PortalApp._installAuthGate()` registers a request interceptor in the constructor. It awaits `ensureValidToken()` before every outgoing REST call and, after a refresh, overwrites the pre-snapshotted `Authorization` header with the current one. `PortalWebApp` and `DocItApp` inherit this via `extends PortalApp`.
- `Rest.request()` catches `AuthRequiredError` thrown from a request interceptor and returns `{ success: false, status: 401, reason: 'unauthorized' }` without calling `fetch` or the response-interceptor chain.
- Post-review tightening: the bypass path was narrowed from `startsWith('/api/token/')` to the exact `/api/token/refresh` URL, and the public `message` on the synthetic 401 was normalized to the generic `"Authentication required"` (internal reason is retained on `errors.auth`).

### Files changed
- `src/core/services/TokenManager.js` — AuthRequiredError, single-flight, ensureValidToken.
- `src/core/Rest.js` — AuthRequiredError short-circuit wrapping `processRequestInterceptors`.
- `src/core/PortalApp.js` — `_installAuthGate()` method, called from the constructor.
- `test/unit/TokenManager.test.js` (new) — 10 tests covering export, single-flight, ensureValidToken.
- `test/unit/RestAuthGate.test.js` (new) — 1 test verifying `fetch` is not called and the 401 short-circuit.
- `docs/web-mojo/services/Rest.md` — new "Automatic JWT refresh (PortalApp)" subsection.
- `CHANGELOG.md` — Fixed bullet.

### Tests
- `npm run test:unit` — 11 new tests pass. Total went from 53/182 (pre-commit) to 64/193 (post-commit). No previously-passing test regressed. Pre-existing harness issues (ES-import failures, `new Rest()` on a singleton, concurrent-test race conditions) are unrelated and out of scope.

### Agent findings
- **test-runner:** 64/193 pass, 11 new tests green, zero regressions.
- **docs-updater:** Rest.md and CHANGELOG.md updates are accurate and sufficient. No separate `TokenManager.md` is expected.
- **security-review (pre-tightening):** flagged (1) overly-broad `/api/token/` prefix bypass, (2) internal failure reason surfacing in the public `message` field. Both addressed in commit 4bb65b1.

### Follow-ups (not done, flagged)
- `rest.download()` / `rest.downloadBlob()` / raw-XHR `rest.upload()` call `fetch`/`XMLHttpRequest` directly and bypass interceptors — still unguarded by this gate.
- Cross-tab refresh coordination (two tabs can still race on `/api/token/refresh`).
- The broader test harness is in a pre-existing broken state (ES-import test files can't load, `Rest.test.js` calls `new Rest()` on a singleton, tests run concurrently causing race conditions). Worth a dedicated cleanup pass.
