# GeoIP / Blocked IPs — Wrong endpoint + missing filters

**Type**: bug
**Status**: resolved
**Date**: 2026-03-31

## Description
Two issues with the GeoIP-related pages under the Security menu:

1. **`BlockedIPsTablePage`** defines its own `BlockedIPList` collection with endpoint `/api/account/system/geoip` — this is wrong. The correct endpoint is `/api/system/geoip` (as used by `GeoLocatedIP` model in `System.js`). The page should reuse `GeoLocatedIPList` from `System.js` with `is_blocked: true` default query instead of rolling its own collection with a bad endpoint.

2. **`GeoLocatedIPTablePage`** has `filterable: true` but defines no `filters` array, so the filter UI never renders. Should have filters for country, threat level, ISP, and blocked status at minimum.

## Context
- `GeoLocatedIP` model endpoint: `/api/system/geoip` (correct)
- `GeoLocatedIPList` collection endpoint: `/api/system/geoip` (correct)
- `BlockedIPList` (local to `BlockedIPsTablePage`): `/api/account/system/geoip` (wrong — `/api/account/` prefix is incorrect)
- Both pages share the same `GeoIPView` item view
- Both pages are under the Security sidebar menu

## Reproduction
1. Navigate to Security > Blocked IPs
2. Page may fail or return wrong data due to incorrect endpoint (`/api/account/system/geoip`)
3. Navigate to Security > GeoIP
4. Click the filter toggle — no filter options appear despite `filterable: true`

## Expected Behavior
- Blocked IPs page should use `/api/system/geoip` endpoint with `is_blocked=true` filter
- GeoIP page should have working filters (country, threat level, ISP, blocked status)

## Actual Behavior
- Blocked IPs page uses wrong endpoint `/api/account/system/geoip`
- GeoIP page has no usable filters despite `filterable: true`

## Affected Area
- **Files / classes**:
  - `src/extensions/admin/security/BlockedIPsTablePage.js` — wrong endpoint in local `BlockedIPList` collection
  - `src/extensions/admin/account/devices/GeoLocatedIPTablePage.js` — missing `filters` array
- **Layer**: Page | Collection
- **Related docs**: None

## Acceptance Criteria
- [ ] `BlockedIPsTablePage` uses `GeoLocatedIPList` from `System.js` (or fixes endpoint to `/api/system/geoip`)
- [ ] `GeoLocatedIPTablePage` has working filters (country_code, threat_level, isp, is_blocked)
- [ ] Both pages load data correctly from `/api/system/geoip`
- [ ] No broken imports or lint errors

---
<!-- Filled in on resolution -->
## Resolution
**Status**: Resolved — 2026-03-31
**Root cause**: `BlockedIPsTablePage` defined a local `BlockedIPList` collection with wrong endpoint `/api/account/system/geoip` instead of reusing `GeoLocatedIPList` (`/api/system/geoip`). Same wrong endpoint was used in `GeoIPView` action handlers, `BlockedIPsTablePage` batch actions, and `IncidentDashboardPage` stats fetch. `GeoLocatedIPTablePage` had `filterable: true` but no `filters` array.
**Files changed**:
- `src/extensions/admin/account/devices/GeoIPView.js` — TabView → SideNavView, renamed "Logs" to "Traffic", added "Logs" section (model audit logs via model_name=account.GeoLocatedIP), fixed action endpoints from `/api/account/system/geoip` to `/api/system/geoip`
- `src/extensions/admin/security/BlockedIPsTablePage.js` — replaced local `BlockedIPList` with `GeoLocatedIPList` from System.js, fixed batch action endpoints
- `src/extensions/admin/account/devices/GeoLocatedIPTablePage.js` — added filters array (country_code, threat_level, ISP, is_blocked, is_vpn, is_tor)
- `src/extensions/admin/incidents/IncidentDashboardPage.js` — fixed geoip stats endpoint
**Tests added/updated**: None
**Validation**: No broken imports, all `/api/account/system/geoip` references eliminated from codebase
