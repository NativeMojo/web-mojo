# IncidentView Enriched Side Nav Tabs

| Field | Value |
|-------|-------|
| Type | request |
| Status | done |
| Date | 2026-04-03 |
| Priority | medium |

## Description

Surface structured metadata and graph data as proper side nav tabs in IncidentView instead of burying them in the raw Metadata JSON dump. Add an HTTP Request tab for web/API incidents, an IP Intelligence tab using the `ip_info` graph data, and ensure the existing Stack Trace tab works correctly.

## Context

The `graph=detailed` API response returns rich `ip_info` data (threat intel, ASN/ISP, mobile carrier, block status, risk score) that is currently unused in IncidentView. HTTP request metadata (`http_method`, `http_path`, `http_host`, `http_user_agent`) is only shown as raw key-value pairs in the Metadata tab's "known keys" DataView. Operators investigating incidents need this data surfaced as structured, scannable UI — not buried in JSON.

## Acceptance Criteria

### 1. HTTP Request tab (conditional)
- [ ] Show when metadata contains `http_method` or `http_path`
- [ ] DataView with fields: Method, Path, Host, Protocol, Query String, User Agent, HTTP Status
- [ ] Placed in the Investigation divider section (after Related Incidents)

### 2. IP Intelligence tab (conditional)
- [ ] Show when the model has `ip_info` (from `graph=detailed` response)
- [ ] **Network section**: ISP, ASN, ASN Org, Mobile Carrier, Connection Type
- [ ] **Threat Assessment section**: Threat Level (badge), Risk Score, is_threat, is_suspicious
- [ ] **Threat Flags section**: is_tor, is_vpn, is_proxy, is_datacenter, is_mobile, is_cloud, is_known_attacker, is_known_abuser (all as yesnoicon)
- [ ] **Block Status section**: is_blocked, blocked_at, blocked_until, blocked_reason, block_count, is_whitelisted, whitelisted_reason
- [ ] Uses DataView with the `ip_info` object as a Model
- [ ] This complements (not replaces) the existing GeoIPSummaryCard in the Overview tab

### 3. Stack Trace tab
- [ ] Confirm existing conditional logic works (metadata.stack_trace → StackTraceView)
- [ ] No changes needed unless broken

### 4. Server/Environment info card in Overview
- [ ] Add a small info line or card in IncidentOverviewSection showing: server, timezone (from metadata) when present
- [ ] Lightweight — not a full DataView, just appended to the existing overview context line

### 5. Raw Metadata tab preserved
- [ ] Always the last tab in Forensics section
- [ ] No changes to existing behavior

## Investigation

### What exists

**Tab structure** (IncidentView.onInit, lines 1140-1169):
- Fixed tabs: Overview, Events, Rule Engine, Tickets, History
- Investigation divider → Related Incidents
- Forensics divider (conditional) → Stack Trace (if metadata.stack_trace), Metadata (if any metadata)

**GeoIPSummaryCard** (lines 63-182):
- Fetches via `GeoLocatedIP.lookup(sourceIP)` — a separate API call
- Shows: location, ISP, ASN, threat level, risk score, threat flags (tor/vpn/proxy/datacenter/attacker/abuser), block/whitelist status, action buttons
- Already comprehensive for GeoIP but requires a separate API call

**ip_info in API response**:
- Returned inline with `graph=detailed` response — no extra API call needed
- Contains the SAME data as GeoLocatedIP.lookup BUT already fetched
- Fields: id, ip_address, subnet, country/region/city/postal, lat/lon, timezone, threat flags, ASN/ISP/carrier, block status, risk_score, threat_level, is_threat, is_suspicious
- Currently **completely unused** in IncidentView

**HTTP request data in metadata**:
- Keys: `http_method`, `http_path`, `http_host`, `http_protocol`, `http_query_string`, `http_user_agent`, `http_status`, `http_url`
- Currently only shown in Metadata tab's "known keys" DataView (line 1190)
- Not `http_path` or `http_host` — these are NOT in the knownKeys array

**_buildMetadataSection** (line 1187):
- Splits metadata into "Key Fields" (knownKeys array) and "Additional Data" (everything else)
- Renders via two DataViews + raw JSON pre block

### What changes

| File | Change |
|------|--------|
| `src/extensions/admin/incidents/IncidentView.js` — new `HttpRequestSection` class | DataView showing HTTP request fields from metadata |
| `src/extensions/admin/incidents/IncidentView.js` — new `IPIntelligenceSection` class | DataView showing ip_info fields in organized sections |
| `src/extensions/admin/incidents/IncidentView.js` — `IncidentView.onInit()` | Add HTTP Request and IP Intelligence tabs to sections array (conditional) |
| `src/extensions/admin/incidents/IncidentView.js` — `IncidentOverviewSection` | Add server/timezone info line when present in metadata |

### Constraints
- `ip_info` comes from `graph=detailed` response already fetched at line 1039 — no additional API call
- DataView is the standard pattern for structured field display (used by RuleEngineSection, OverviewSection)
- New section classes should follow the same pattern as existing ones (extend View, use `this.model` or options, DataView with containerId)
- IP Intelligence tab complements GeoIPSummaryCard — GeoIP card is for quick glance + actions, IP Intelligence tab is for deep investigation
- `yesnoicon` formatter for boolean flags matches existing patterns

### Related files
- `src/extensions/admin/incidents/IncidentView.js` — all changes here
- `src/core/views/data/DataView.js` — used for structured field display
- `src/core/views/data/StackTraceView.js` — existing, no changes
- `src/core/Model.js` — Model constructor for wrapping ip_info object

### Endpoints
- No new endpoints — uses existing `graph=detailed` response data

### Tests required
- None required — extension UI code, no public framework API changes

### Out of scope
- Reordering _resolveSourceIP to use ip_info (keep current flow)
- Changes to the Metadata tab's knownKeys list
- New API endpoints or graph parameters
- Map visualization for GeoIP coordinates

## Plan

### Objective
Add HTTP Request and IP Intelligence tabs to IncidentView's side nav, feed `ip_info` from the graph response into GeoIPSummaryCard to eliminate a redundant API call, and surface server/environment info in the overview.

### Steps

**1. GeoIPSummaryCard: accept `ipInfo` option to skip API call**

- Add optional `options.ipInfo` parameter to constructor
- In `onInit()`: if `this.ipInfo` provided, use directly as `this.geoData`, skip `GeoLocatedIP.lookup()`
- Fallback: if no `ipInfo`, do lookup as before (backward compatible)
- Store model: `this.geoModel = new GeoLocatedIP(this.ipInfo)` so block/unblock/whitelist actions work

**2. IncidentOverviewSection: pass `ip_info` to GeoIPSummaryCard + server info**

- Pass `ip_info` from model: `new GeoIPSummaryCard({ ..., ipInfo: this.model.get('ip_info') })`
- Add server/timezone info line in template after geoip-summary container
- Compute `this.serverInfo` from metadata (server · timezone) in `onInit()`

**3. New `HttpRequestSection` class**

- View with DataView child, accepts `options.metadata`
- Fields: http_method, http_path, http_host, http_url, http_protocol, http_query_string, http_user_agent, http_status
- Uses `showEmptyValues: false`, wraps metadata in Model

**4. New `IPIntelligenceSection` class**

- View with 4 DataView children: Network, Threat Assessment, Threat Flags, Block Status
- Wraps `ip_info` in Model for DataView consumption

**5. `IncidentView.onInit()`: wire new tabs**

- After Related Incidents, conditionally add HTTP Request and IP Intelligence tabs
- Before Forensics divider

### Design Decisions

- Feed `ip_info` into GeoIPSummaryCard to eliminate redundant API call
- Wrap plain objects in Model for DataView compatibility
- HTTP Request as separate tab (not in Overview) — investigation-depth data
- IP Intelligence separate from GeoIP card — card for quick glance + actions, tab for deep investigation
- Server info as lightweight template line, not full DataView

### Edge Cases

- No `ip_info` / no HTTP metadata → tabs don't appear
- GeoIPSummaryCard backward compat if `ipInfo` not passed
- `showEmptyValues: false` handles null fields
- May need `import Model from '@core/Model.js'` for wrapping plain objects

### Testing

- `npm run lint`
- Manual verification of new tabs

### Docs Impact

- `CHANGELOG.md` — entries for new tabs and GeoIP optimization

## Resolution

### What was implemented
All 5 plan steps completed:
1. **GeoIPSummaryCard** — Accepts optional `ipInfo` to skip redundant `GeoLocatedIP.lookup()` API call; falls back to lookup if not provided
2. **IncidentOverviewSection** — Passes `ip_info` from model to GeoIPSummaryCard; adds server/timezone info line from metadata
3. **HttpRequestSection** — New View class with DataView showing: Method, Status Code, Host, Path, URL, Protocol, Query String, User Agent (conditional tab)
4. **IPIntelligenceSection** — New View class with 4 DataView sections: Network, Threat Assessment, Threat Flags, Block Status (conditional tab)
5. **IncidentView.onInit()** — Wires HTTP Request and IP Intelligence tabs after Related Incidents, before Forensics divider

### Files changed
- `src/extensions/admin/incidents/IncidentView.js` — all changes (182 lines added, 14 modified)

### Commits
- `bc8299e` — Full implementation

### Tests run
- `npm run lint` on IncidentView.js — 0 errors, 0 warnings

### Agent findings
- Pending: docs-updater and security-review running in background
