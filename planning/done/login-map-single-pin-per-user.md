# Locations tab: map shows only one login pin per user

**Type**: bug
**Status**: open
**Date**: 2026-05-10

## Description

On the **UserView → Locations → Map** tab, the `LoginLocationMapView` renders only a single map marker instead of one marker per unique login location for the user.

## Context

`LoginLocationMapView` has two operating modes: system-wide (no `userId`) and per-user (`userId` passed in). The system-wide path calls `/api/account/logins/summary`, which returns aggregated country-level rows with `count`, `latitude`, `longitude`, and `country_code`. The per-user path calls `/api/account/logins/user`, a different endpoint that appears to return raw login event records rather than an aggregated geographic summary, so `_applyMarkers()` either receives a single-element array or records missing the `count`/`latitude`/`longitude` fields the method depends on.

The `memory.md` convention is explicit: _"All API access uses the same CRUD endpoints; admins filter with query params (e.g., `/api/account/api_keys?user=123`). Never create or assume separate admin-scoped endpoints."_ The per-user map path violates this by routing to a separate endpoint instead of passing `user=<userId>` to the existing summary endpoint.

## Reproduction

1. Open **Admin → Users → [any user]**.
2. Navigate to the **Locations** section in the sidebar.
3. The **Map** tab is the default; observe the map.
4. **Expected**: one pin per distinct login location (country or region).
5. **Actual**: only one pin is visible regardless of how many locations the user has logged in from.

## Expected Behavior

The map plots one sized, colored marker per unique login location for the selected user, identical in structure to the system-wide map but filtered to that user's logins.

## Actual Behavior

Only one marker appears. All other login locations are missing from the map.

## Affected Area

- **Files / classes**:
  - `src/extensions/admin/account/devices/LoginLocationMapView.js` — `_fetchSummary()` method (L93–115)
  - `src/extensions/admin/account/users/UserView.js` — `loginMapView` instantiation (L1283–1287), passes `userId`
- **Layer**: Extension / View
- **Related docs**: `docs/web-mojo/core/View.md`, `docs/web-mojo/services/Rest.md`

## Investigation

- **Likely root cause:** `_fetchSummary()` branches on `this.userId` and calls `/api/account/logins/user` with a `user_id` param. That endpoint returns raw login events, not the aggregated geographic summary that `_applyMarkers()` expects (`count`, `latitude`, `longitude`, `country_code`). The fix is to always call `/api/account/logins/summary` and pass `user: this.userId` as a query param — consistent with how `loginsCollection` filters by user (`params: { user: userId, size: 10 }`).
- **Confidence:** high
- **Code path:**
  - `LoginLocationMapView.onInit()` → `this.refresh()` → `this._fetchSummary()` (L93–115 in `LoginLocationMapView.js`)
  - Wrong branch: `url = '/api/account/logins/user'; params.user_id = this.userId;`
  - Correct intent: `url = '/api/account/logins/summary'; params.user = this.userId;`
  - Drill-down path (`countryCode` argument) is unaffected by this fix — it only adds `country_code` and `region` params on top of the base call.
- **Regression test:** A unit test mocking `rest.GET` can assert that when `userId` is set, `_fetchSummary()` calls `/api/account/logins/summary` with `{ user: userId }` rather than `/api/account/logins/user`.
- **Related files:**
  - `src/extensions/admin/account/devices/LoginLocationMapView.js`
  - `src/extensions/admin/account/users/UserView.js`
  - `src/extensions/admin/account/devices/UserDeviceLocationTablePage.js` (system-wide usage — no `userId`, unaffected)

## Acceptance Criteria

- [ ] `_fetchSummary()` always calls `/api/account/logins/summary`; per-user filtering uses `params.user = this.userId`
- [ ] All historic login locations appear as distinct sized markers on the per-user map
- [ ] Drill-down (country → region) still works for the per-user map
- [ ] System-wide map (no `userId`) is unaffected
- [ ] Regression test added covering the corrected endpoint selection

---
## Resolution
**Status**: Resolved — 2026-05-10
**Root cause:** `_fetchSummary()` branched to `/api/account/logins/user` with `user_id=` for per-user mode. That endpoint returns raw login events, not the aggregated geo-summary (`count`, `latitude`, `longitude`, `country_code`) that `_applyMarkers()` requires. Fixed by always calling `/api/account/logins/summary` and passing `user: this.userId` as a query param.
**Files changed:**
- `src/extensions/admin/account/devices/LoginLocationMapView.js` — removed per-user URL branch in `_fetchSummary()`
- `test/unit/LoginLocationMapView.test.js` — new regression test (6 cases)
- `CHANGELOG.md` — unreleased Fixed entry added by docs-updater agent
**Tests added/updated:** `test/unit/LoginLocationMapView.test.js` — 6/6 pass
**Validation:** Full unit suite 1105/1112 pass. The 7 failures are pre-existing `IncidentView` / `ListView is not a constructor` errors unrelated to this change.
**Security note (backend action required):** Security review flagged that the fix assumes the backend applies `user=<id>` as a proper row-level filter on `GET /api/account/logins/summary`. Before shipping, verify: (1) the backend enforces the `user=` filter and does not return system-wide data; (2) access-control on `/summary?user=<id>` is at least as strict as the old `/logins/user` endpoint.
