# Enrich IncidentView for Security Operations

**Type**: request
**Status**: open
**Date**: 2026-04-01

## Description
Transform IncidentView from a basic detail view into a rich security operations investigation tool. Add proper action items, contextual help, status management, IP blocking, ticket creation, related incidents, and a more informative overview with quick-action capabilities.

## Context
- Target file: `src/extensions/admin/incidents/IncidentView.js`
- Pattern reference: `src/extensions/admin/account/devices/GeoIPView.js` (rich SideNavView with context menu actions)
- Models: Incident, IncidentEventList, GeoLocatedIP, Ticket, TicketList
- APIs: incident CRUD, GeoIP block/unblock/whitelist, ticket create, incident history

## Acceptance Criteria
- [ ] Richer header with priority severity indicator, status badge with color, event count, time context
- [ ] Enhanced GeoIP card with block status, action buttons (block/whitelist/view full)
- [ ] Expanded context menu: status transitions, priority change, block IP, create ticket, merge
- [ ] Overview section with incident summary stats and quick-action buttons
- [ ] Tickets tab showing related tickets with ability to create new
- [ ] Related Incidents tab (same source IP or category)
- [ ] Help tooltips explaining statuses, priorities, and available actions
- [ ] Events table with level severity coloring and better columns
- [ ] Metadata section with structured display for known fields

## Constraints
- Follow existing SideNavView + ContextMenu patterns from GeoIPView
- Use framework Model/View/Container pattern
- Bootstrap 5.3 + Bootstrap Icons only
- Fetch data in onInit() only
- data-action kebab-case convention

## Notes
- GeoIP block/unblock actions follow pattern in GeoIPView.onActionBlockIp()
- Ticket creation uses TicketForms.create with incident field pre-filled
- Status options: new, open, investigating, resolved, closed, paused, ignored
