# IncidentView — SideNavView Rewrite

**Type**: request
**Status**: implemented
**Date**: 2026-03-28

## Description
Convert IncidentView from TabView to SideNavView layout for a better security investigation workflow. Add inline GeoIP summary to the Overview section with a clickable IP that opens GeoIPView in a dialog.

## Context
- `src/extensions/admin/incidents/IncidentView.js` — current TabView with: Overview, Events, History & Comments, Stack Trace (conditional), Metadata (conditional)
- `src/extensions/admin/account/devices/GeoIPView.js` — full GeoIP detail view with location, network, risk, events, logs, map tabs
- `src/core/models/Incident.js` — Incident model, IncidentEvent has `source_ip` field
- SideNavView pattern already used in JobsAdminPage — left sidebar nav, content panel, dividers

## Current IncidentView Tabs
1. Overview — DataView with id, state, priority, category, model_name, model_id, details
2. Events — TableView of related IncidentEvents
3. History & Comments — ChatView with IncidentHistoryAdapter
4. Stack Trace — conditional, if metadata.stack_trace exists
5. Metadata — conditional, if metadata has keys

## Proposed SideNavView Layout

### Overview (default landing section)
- Incident header stays as-is (state icon, #ID, category, created, state badge, priority, context menu)
- DataView with core incident fields
- **GeoIP Summary card** — if the incident has a source IP (from first event or incident metadata):
  - Show: IP address (clickable), country flag + country, city, ISP, threat level badge, risk score
  - Click IP → opens GeoIPView in xl dialog (fetch GeoIP by IP filter)
  - If no IP available, hide the card

### Events
- Same IncidentEventList table, paginated

### History
- Same ChatView with IncidentHistoryAdapter

### --- Divider: "Forensics" ---

### Stack Trace
- Conditional section (only show in nav if metadata.stack_trace exists)
- Pre-formatted code block

### Metadata
- Conditional section (only show if metadata has keys)
- DataView of raw metadata

## Acceptance Criteria
- [ ] IncidentView uses SideNavView instead of TabView
- [ ] Overview section shows inline GeoIP summary when source IP is available
- [ ] Clicking IP in GeoIP summary opens GeoIPView in xl dialog
- [ ] GeoIP lookup uses standard CRUD: `/api/account/system/geoip?ip={source_ip}`
- [ ] Stack Trace and Metadata sections only appear in nav when data exists
- [ ] "Forensics" divider separates investigation sections from raw data sections
- [ ] Context menu actions (Edit, Resolve, Delete) still work
- [ ] No render errors on page load or section navigation
- [ ] Chrome UI smoke test passes (all sections clickable, no console errors)

## Constraints
- Use `SideNavView` sections array format: `{ key, label, icon, view }` with `{ type: 'divider', label }`
- GeoIPView opened in dialog, not inline — it's a full detail view with its own tabs
- Standard REST pattern for GeoIP lookup (filter param, not admin endpoint)
- Run Chrome smoke test after implementation per `prompts/testing.md`

## Notes
- The GeoIP summary card is the key UX improvement — security admins want IP context immediately without clicking away
- IncidentEvents have `source_ip` — use the first event's IP or a dedicated `source_ip` on the incident model if available
- Consider showing network type icons (TOR, VPN, proxy) in the summary card — same pattern as GeoIPView header
- Related: GeoIPView already has firewall actions (block, unblock, whitelist) in context menu
