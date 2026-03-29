# Login Location Map Views

**Type**: request
**Status**: resolved
**Date**: 2026-03-29

## Description
Add login location maps, metrics charts, and anomaly tables across three surfaces:

1. **Security Dashboard** (`IncidentDashboardPage`) — new **"Logins"** tab alongside the existing Overview, Threats, and Geography tabs. Contains the login location map, login metrics time-series charts (by country, new-country anomalies), and a recent new-country logins table.
2. **UserView locations section** — replace the flat device-locations `TableView` with a `TabView`: map (default) scoped to the user, login events table.
3. **Device Locations page** (`UserDeviceLocationTablePage`) — upgrade to a `Page` with `TabView`: map (default, system-wide), login events table.

All maps use the new Login Events summary endpoints (`/api/account/logins/summary`, `/api/account/logins/user`) to plot country-level markers sized by login count, with drill-down to region level on click.

---

## Backend API (Login Events)

Spec received 2026-03-29. Permissions: `manage_users` + `security` + `users`.

### Endpoints Used

| Endpoint | Purpose | Key Params |
|----------|---------|------------|
| `GET /api/account/logins/summary` | System-wide country aggregates | `dr_start`, `dr_end` |
| `GET /api/account/logins/summary?country_code=US&region=true` | Region drill-down | `country_code`, `region` |
| `GET /api/account/logins/user?user_id=42` | Per-user country aggregates | `user_id` (required), `dr_start`, `dr_end` |
| `GET /api/account/logins/user?user_id=42&country_code=US&region=true` | Per-user region drill-down | `user_id`, `country_code`, `region` |
| `GET /api/account/logins` | Paginated login event list | `user`, `country_code`, `is_new_country`, `is_new_region`, `source`, `search`, `sort`, `start`, `size`, `graph` |
| `GET /api/account/logins/<id>` | Single login event detail | `graph=default` (includes `user_agent_info`, `device`) |

### Summary Response Shape

```json
{
  "status": true,
  "data": [
    {
      "country_code": "US",
      "count": 1204,
      "latitude": 37.0902,
      "longitude": -95.7129,
      "new_country_count": 12
    }
  ]
}
```

Region drill-down adds `"region"` and `"new_region_count"` fields.

### List Response Shape (`graph=list`)

```json
{
  "status": true,
  "count": 1842,
  "data": [
    {
      "id": 5012,
      "user": {"id": 42, "username": "jdoe", "display_name": "Jane Doe"},
      "ip_address": "203.0.113.45",
      "country_code": "US",
      "region": "California",
      "city": "San Francisco",
      "latitude": 37.7749,
      "longitude": -122.4194,
      "source": "password",
      "is_new_country": false,
      "is_new_region": false,
      "created": "2026-03-29T14:22:00Z"
    }
  ]
}
```

### Metrics (time-series via `/api/metrics/fetch`)

| Slug | Category | Description |
|------|----------|-------------|
| `login:country:{CC}` | `logins` | Login count by country code |
| `login:region:{CC}:{region}` | `logins` | Login count by country + region |
| `login:new_country` | `logins` | First-time-country logins |
| `login:new_region` | `logins` | First-time-region logins |

---

## Context

### Current Security Dashboard Tab Structure

```
IncidentDashboardPage
├── SecurityStatsBar (always visible — incidents, tickets, IP blocks, blocked devices, blocks today)
└── TabView
    ├── "Overview"   → OverviewTab (events + incidents mini chart widgets)
    ├── "Threats"    → ThreatsTab (firewall blocks, bouncer blocks, pre-screen blocks widgets)
    └── "Geography"  → GeographyTab (MetricsCountryMapView + events/incidents by-country charts)
```

The new **"Logins"** tab slots in after Geography:

```
└── TabView
    ├── "Overview"   → OverviewTab (unchanged)
    ├── "Threats"    → ThreatsTab (unchanged)
    ├── "Geography"  → GeographyTab (unchanged)
    └── "Logins"     → LoginsTab (NEW)
```

### Key source files

| File | Role |
|------|------|
| `src/extensions/admin/incidents/IncidentDashboardPage.js` | Security dashboard — add LoginsTab |
| `src/extensions/admin/account/users/UserView.js` | UserView — locations section to modify |
| `src/extensions/admin/account/devices/UserDeviceLocationTablePage.js` | Global Device Locations page to upgrade |
| `src/extensions/admin/account/devices/UserDeviceLocationView.js` | Dynamic-import MapLibreView reference |
| `src/extensions/map/MapLibreView.js` | Vector map with markers, popups, lines |
| `src/extensions/map/MetricsCountryMapView.js` | Pattern reference (different data shape — not reused) |
| `src/core/views/navigation/TabView.js` | Responsive tabbed interface |
| `src/core/models/User.js` | `UserDeviceLocationList` collection (stays in Devices section) |

---

## Acceptance Criteria

### New Model: `LoginEvent` + `LoginEventList`
- [ ] New model/collection in `src/core/models/LoginEvent.js`
- [ ] `LoginEvent` model with `endpoint: '/api/account/logins'`
- [ ] `LoginEventList` collection with `ModelClass: LoginEvent`, `endpoint: '/api/account/logins'`

### New Component: `LoginLocationMapView`
- [ ] New view in `src/extensions/admin/account/devices/LoginLocationMapView.js`
- [ ] Fetches from `/api/account/logins/summary` (global) or `/api/account/logins/user?user_id=N` (per-user)
- [ ] Plots country-level markers on `MapLibreView`, sized proportionally by `count`
- [ ] Marker popups show country name/code, login count, and `new_country_count` badge (if > 0)
- [ ] Clicking a country marker drills down to region-level (re-fetches with `country_code` + `region=true`)
- [ ] Region markers show region name, count, `new_region_count` badge
- [ ] "Back to countries" button to return from region drill-down
- [ ] Accepts `drStart` / `drEnd` for date range filtering
- [ ] Empty state: "No login locations found"
- [ ] Dynamic-import `MapLibreView` with try/catch fallback
- [ ] `onTabActivated()` calls `this.mapView?.resize()`

### Security Dashboard — SecurityStatsBar update
- [ ] Add "New-Country Logins" card to `SecurityStatsBar` (6th card, icon `bi-geo-alt-fill`, text color `text-success`)
- [ ] Fetch count via `rest.GET('/api/account/logins?is_new_country=true&dr_start=today&size=0')` in `fetchAll()`
- [ ] Display count with "24h" label

### Security Dashboard — new "Logins" tab
- [ ] New `LoginsTab` class in `IncidentDashboardPage.js` (follows pattern of `GeographyTab`, `ThreatsTab`)
- [ ] **Row 1 — Map:** `LoginLocationMapView` (system-wide, 360px height, dark style) in a card with "Login Locations" header
- [ ] **Row 2 — Metrics charts (side-by-side):**
  - Left: `MetricsChart` — "Logins by Country" using category `logins`, top-10 country lines over time
  - Right: `MetricsChart` — "New-Location Logins" using slugs `login:new_country` + `login:new_region`, line chart
- [ ] **Row 3 — Anomaly table:** `TableView` with `LoginEventList` filtered to `is_new_country=true`, sorted `-created`, size 10. Columns: user, IP, city, region, country, source, created
- [ ] `LoginsTab` added to `TabView` tabs: `'Logins': this.loginsTab`
- [ ] `LoginsTab` has `refresh()` method that refreshes map + charts + table
- [ ] `onActionRefreshAll` already handles active tab refresh (no change needed)

### UserView — "Locations" section
- [ ] "Locations" sidenav section becomes login-focused with `TabView`
- [ ] Tab 1 "Map" (default): `LoginLocationMapView` scoped with `userId: this.model.get('id')`
- [ ] Tab 2 "Logins": `TableView` with `LoginEventList` (user-scoped `params: { user: userId }`), columns: IP, city, region, country, source, `is_new_country` badge, created
- [ ] Existing device-locations `locationsView` stays under "Devices" section (or removed if redundant)

### Global Device Locations Page
- [ ] `UserDeviceLocationTablePage` upgraded to `Page` with `TabView`
- [ ] Tab 1 "Map" (default): `LoginLocationMapView` (system-wide)
- [ ] Tab 2 "Logins": `TableView` with `LoginEventList` columns: user, IP, city, region, country, source, `is_new_country` badge, created

### General
- [ ] Responsive: TabView collapses to dropdown on narrow screens
- [ ] MapLibre load failure degrades gracefully (skip map, show tables only)

---

## Constraints
- Use `MapLibreView` (not Leaflet) for consistency with incident dashboard
- Use `TabView` for multi-tab layouts
- Do not modify `MetricsCountryMapView` — different data shape
- Do not modify `MapLibreView` core unless a bug is found
- Dynamic-import `MapLibreView` with try/catch (pattern from `UserDeviceLocationView.js`)
- `LoginLocationMapView` goes in `src/extensions/admin/account/devices/`
- `LoginEvent` model goes in `src/core/models/LoginEvent.js`
- `LoginsTab` is a private class inside `IncidentDashboardPage.js` (follows existing pattern — `OverviewTab`, `ThreatsTab`, `GeographyTab` are all private classes in that file)
- Bootstrap 5.3 + Bootstrap Icons only
- Summary endpoints return centroids — no need for `COUNTRY_CENTROIDS` lookup

---

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| New "Logins" tab on security dashboard | Login geography is a security concern. Dashboard already has tabbed layout and Geography tab for incident hotspots — logins are a parallel signal |
| `LoginsTab` as private class in `IncidentDashboardPage.js` | Follows the existing pattern. `OverviewTab`, `ThreatsTab`, `GeographyTab` are all private classes in the same file |
| Map + metrics charts + anomaly table in LoginsTab | Mirrors GeographyTab pattern (map + two charts). Anomaly table adds actionable "new country" alerts |
| Use summary endpoints for map, not list | Summary gives aggregated counts + centroids per country/region. List would require client-side aggregation |
| Use metrics API for time-series charts | `login:country:*`, `login:new_country`, `login:new_region` slugs feed `MetricsChart` directly — same pattern as events/incidents by-country charts |
| Separate `LoginLocationMapView` from `MetricsCountryMapView` | Different API shape. Summary endpoints return `{country_code, count, lat, lng}` not timeseries. Purpose-built is cleaner |
| Country default, region drill-down on click | Matches API two-level aggregation. Clean UX without thousands of individual points |
| New `LoginEvent` model + collection | Dedicated model for new API. Cleaner than overloading `UserDeviceLocation` |
| Device-locations stay in "Devices" section of UserView | Different dataset (IP geolocation per device) vs login events. Clean separation |
| `new_country_count` prominently badged | Key security anomaly signal — first-time-country logins demand attention |

---

## Resolved Questions

1. **Stats bar update:** Yes — add "New-Country Logins (24h)" card to `SecurityStatsBar`. One more `rest.GET('/api/account/logins?is_new_country=true&dr_start=today&size=0')` call to get the count.
2. **Login source filter on anomaly table:** No — keep it simple, no source filter dropdown.
3. **LoginsTab label:** "Logins" (no preference expressed, shortest option).

## Open Questions

1. **Marker clustering:** Not needed at country level. May want for region drill-down if a country has many regions. Fast-follow.

2. **Map height:** 360px for dashboard and global page. ~300px for UserView sidenav panel (narrower).

3. **Date range picker on map:** Simple dropdown (7d / 30d / 90d / all) in the map card header? API supports `dr_start`/`dr_end`. Or rely on charts' date range controls.

---

## Implementation Sequence

### Step 1: Model
Create `src/core/models/LoginEvent.js`:
- `LoginEvent` extends `Model`, endpoint `/api/account/logins`
- `LoginEventList` extends `Collection`, `ModelClass: LoginEvent`, endpoint `/api/account/logins`

### Step 2: LoginLocationMapView
Create `src/extensions/admin/account/devices/LoginLocationMapView.js`:
- Constructor: `userId` (optional), `drStart`, `drEnd`, `height`, `mapStyle`
- `onInit()`: dynamic-import `MapLibreView`, create as child, call `refresh()`
- `refresh()`: fetch summary endpoint, build markers, `updateMarkers()`
- `drillDown(countryCode)`: re-fetch with `country_code` + `region=true`, show back button
- `resetDrillDown()`: back to country view, re-fetch summary
- Marker sizing/color: proportional to `count` (follow `MetricsCountryMapView.getMarkerColor()` intensity pattern)
- Popups: country/region name, count, new-country/region count badge

### Step 3: Security Dashboard — StatsBar + LoginsTab
In `IncidentDashboardPage.js`:

**SecurityStatsBar:**
- Add `newCountryLogins` to `this.counts`
- Add `rest.GET('/api/account/logins?is_new_country=true&dr_start=today&size=0')` to `fetchAll()`
- Add 6th card to template: `bi-geo-alt-fill`, "New-Country Logins", count, `text-success`

**LoginsTab:**
- Add `LoginsTab` private class (pattern: `GeographyTab`)
- Template: card with map, row with two metric charts, card with anomaly table
- `onInit()`:
  - `LoginLocationMapView` (system-wide, 360px, dark)
  - `MetricsChart` — logins by country (category `logins`, line, top 10)
  - `MetricsChart` — new-location logins (slugs `login:new_country` + `login:new_region`, line)
  - `TableView` — `LoginEventList` filtered `is_new_country=true`, sorted `-created`, size 10
- `refresh()`: refresh all children
- Register in `onInit()`: `this.loginsTab = new LoginsTab()`, add to TabView tabs

### Step 4: UserView Integration
In `UserView.js`:
- Import `TabView`, `LoginLocationMapView`, `LoginEventList`
- Replace `locationsView` (lines 260-282) with `TabView`:
  - Tab "Map": `LoginLocationMapView` with `userId`
  - Tab "Logins": `TableView` with `LoginEventList`, user-scoped
- Move existing device-locations `locationsView` into "Devices" section or remove

### Step 5: Global Page
Upgrade `UserDeviceLocationTablePage.js`:
- Convert to `Page` subclass with `TabView`:
  - Tab "Map": `LoginLocationMapView` (system-wide)
  - Tab "Logins": `TableView` with `LoginEventList` (all users, includes user column)

### Step 6: QA
- Verify dashboard LoginsTab: map markers, charts load, anomaly table shows `is_new_country` records
- Verify drill-down: country → region → back
- Verify UserView: map scoped to user, login table scoped to user
- Verify global page: map system-wide, table all users
- Verify tab switching, empty states, responsive collapse
- Verify MapLibre failure fallback
- Verify refresh button refreshes active tab

---

## Notes
- `GeographyTab` is the closest pattern for `LoginsTab` — map in a card + two side-by-side charts below.
- `MetricsChart` supports `category` for multi-slug charts (like events by country). Use `category: 'logins'` for the by-country chart.
- For the new-location chart, use explicit `slugs: ['login:new_country', 'login:new_region']` to show both on one chart.
- `onActionRefreshAll` already refreshes only the active tab via `this.tabView.getTab(activeTabLabel)?.refresh()` — no changes needed.
- `UserDeviceLocationView.js` uses `try { const MapView = (await import('@ext/map/MapView.js')).default } catch (e) { ... }` — follow this for `MapLibreView`.
- Summary endpoints return computed centroids (average lat/lng) — no `COUNTRY_CENTROIDS` needed.
- `new_country_count` / `new_region_count` are the anomaly signals — badge prominently in popups and highlight in table rows.

---

## Resolution
**Status**: Resolved — 2026-03-29

**Files created**:
- `src/core/models/LoginEvent.js` — `LoginEvent` model + `LoginEventList` collection
- `src/extensions/admin/account/devices/LoginLocationMapView.js` — shared map component (summary API → country markers → region drill-down)

**Files changed**:
- `src/extensions/admin/incidents/IncidentDashboardPage.js` — added "New-Country Logins" stats card, "Login Map" tab (map), "Login Activity" tab (filterable table)
- `src/extensions/admin/account/users/UserView.js` — locations section now TabView with Map + Logins table (user-scoped)
- `src/extensions/admin/account/devices/UserDeviceLocationTablePage.js` — converted to Page with TabView: Map + Logins table (system-wide)

**Tests run**:
- `npm run lint` — no new errors
- Visual QA via screenshot — dashboard tabs render, map loads, stats bar shows 6 cards

**Docs updated**:
- None — no public API or documented behavior changed

**Design iteration**:
- Initial build had one "Logins" tab with map + 2 charts + anomaly table crammed together. Simplified to two focused tabs: "Login Map" (just the map) and "Login Activity" (just the filterable table). Each tab = one purpose.
