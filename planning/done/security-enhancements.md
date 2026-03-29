# Security Admin — Remaining Enhancements

**Type**: request
**Status**: open
**Date**: 2026-03-28

## Description
Remaining security admin enhancements that weren't completed in the nav reorganization. The pages and views exist but need functional enhancements: firewall actions, event/ticket navigation fixes, and dashboard metrics.

## GeoIPView Firewall Actions
Add block/unblock/whitelist actions to GeoIPView context menu / action buttons:
- **Block IP** — `POST /api/account/system/geoip/{id}` with `{action: "block", value: {reason, ttl}}`
- **Unblock IP** — `POST /api/account/system/geoip/{id}` with `{action: "unblock", value: reason}`
- **Whitelist IP** — `POST /api/account/system/geoip/{id}` with `{action: "whitelist", value: reason}`
- **Remove Whitelist** — `POST /api/account/system/geoip/{id}` with `{action: "unwhitelist"}`
- **Refresh Threat Data** — `POST /api/account/system/geoip/{id}` with `{action: "threat_analysis"}`

## Fix Stubbed Actions
- EventView: Wire "View Incident" to open IncidentView in modal
- EventView: Wire "View Related Model" to open the model's VIEW_CLASS
- TicketView: Wire "Assign User" to a user selector

## Enhanced Dashboard Metrics
Use existing metrics API (`GET /api/metrics/fetch`):
- `firewall:blocks` — firewall block trend chart
- `bouncer:blocks` — bouncer block trend chart
- `bouncer:pre_screen_blocks` — signature pre-screen effectiveness
- `incidents` — incident volume chart
- `incidents:resolved` — resolution rate

Overview cards (use `size=0` for counts):
- Active IP blocks: `GET /api/account/system/geoip?is_blocked=true&size=0`
- Blocked devices: `GET /api/account/bouncer/device?risk_tier=blocked&size=0`
- Active signatures: `GET /api/account/bouncer/signature?is_active=true&size=0`
- Open incidents: `GET /api/incident/incident?status=new&size=0`
- Open tickets: `GET /api/incident/ticket?status=new&size=0`
- Bouncer blocks today: `GET /api/account/bouncer/signal?decision=block&dr_start=today&size=0`

## Files to Modify
- `src/extensions/admin/account/devices/GeoIPView.js` — add firewall actions
- `src/extensions/admin/incidents/EventView.js` — fix TODO stubs
- `src/extensions/admin/incidents/TicketView.js` — wire user assignment
- `src/extensions/admin/incidents/IncidentDashboardPage.js` — enhanced metrics

## Acceptance Criteria

**Firewall:**
- [ ] GeoIPView: block/unblock/whitelist/threat_analysis actions
- [ ] BlockedIPsTablePage unblock/whitelist actions work
- [ ] IP lookup works

**Incidents & Rules:**
- [ ] EventView: "View Incident" and "View Related Model" work
- [ ] TicketView: user assignment works

**Dashboard:**
- [ ] Enhanced dashboard with firewall + bouncer metric cards
- [ ] Overview count cards (active blocks, blocked devices, open incidents, etc.)

## Open Questions
- Should firewall blocks show a confirmation with estimated impact (e.g., "This IP has had 3 sessions in the last 24h")?
- Bouncer admin API docs may be incomplete — need to verify full response shapes once docs are finalized
