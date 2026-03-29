# Admin Portal Reorganization — Nav, Security, Jobs

**Type**: request
**Status**: open
**Date**: 2026-03-28

## Description
Full reorganization of the admin portal: restructure the left nav menu, build out the missing security/firewall/bouncer admin UI, and refactor the Jobs page from a wall-of-content into a SideNavView layout. Three workstreams in one request because the nav restructure touches all of them.

## Part 1: Admin Left Nav Reorganization

### Current menu (messy)
```
Dashboard
Jobs Management
Users
Groups
Incidents & Tickets ▸          ← security, but separate from "Security"
  Dashboard
  Incidents
  Tickets
  Events
  Rule Engine
Security ▸                     ← junk drawer
  Logs
  User Devices
  Device Locations
  GeoIP Cache
  Metrics Permissions
  API Keys
  Settings
Storage ▸
Push Notifications ▸
Email Admin ▸
AWS ▸                          ← 1 child (CloudWatch)
Phone Hub ▸
```

### Proposed menu
```
Dashboard                        top-level, always first
Users                            top-level, most used
Groups                           top-level, most used
Jobs                             top-level, SideNavView internally

Security ▸                       unified — absorbs "Incidents & Tickets"
  Dashboard                      enhanced with firewall + bouncer metric cards
  Incidents                      existing IncidentTablePage
  Tickets                        existing TicketTablePage
  Events                         existing EventTablePage
  Rule Engine                    existing RuleSetTablePage, handler builder enhancement
  Blocked IPs                    NEW — filtered GeoIP table (is_blocked=true)
  Firewall Log                   NEW — log table filtered to kind=firewall:*
  GeoIP                          existing GeoLocatedIPTablePage, enhanced
  Bouncer Signals                NEW — assessment audit trail
  Bouncer Devices                NEW — device reputation
  Bot Signatures                 NEW — signature CRUD

Email ▸                          renamed from "Email Admin"
  Domains
  Mailboxes
  Sent
  Templates

Push Notifications ▸             unchanged
  Dashboard
  Configurations
  Templates
  Deliveries
  Devices

Phone Hub ▸                      unchanged
  Numbers
  SMS

Storage ▸                        unchanged
  S3 Buckets
  Storage Backends
  Files

System ▸                         absorbs orphaned infra/ops/account items
  Logs                           moved from Security
  API Keys                       moved from Security
  User Devices                   moved from Security
  Device Locations               moved from Security
  Metrics Permissions            moved from Security
  Settings                       moved from Security
  CloudWatch                     moved from AWS (kills the 1-child group)
```

**Rationale:**
- Top-level = what you click 10x a day (Dashboard, Users, Groups, Jobs)
- Security = one group for the full threat pipeline (detection → events → rules → incidents → enforcement)
- System = operational/infra items you check occasionally
- AWS group killed — CloudWatch is monitoring, belongs in System
- "Incidents & Tickets" and old "Security" junk drawer both dissolved

### Cleanup done
- Deleted `TaskManagementPage.js`, `TaskDetailsView.js`, `RunnerDetailsView.js` — dead code, Task system no longer exists
- Removed all imports/exports from `admin.js` and `extensions/admin/index.js`

---

## Part 2: Jobs Page Refactor (SideNavView)

### Problem
JobsAdminPage is a ~990-line wall of content: stats cards, 2 charts, channel health, runners table, running/pending/scheduled/failed job tables, and an operations bar. You have to scroll through everything to find what you need. The "View All Jobs" table is hidden behind a modal.

### Proposed layout
```
┌──────────────────────────────────────────────────────────┐
│  Jobs                                        [⟳] [⚙]    │
│  Async job monitoring and runner management              │
│  Auto-refresh: 30s | Last updated: 3:42 PM              │
├──────────────────────────────────────────────────────────┤
│  [Pending: 12] [Running: 4] [Completed: 1.2k] [Failed: 3]  │  ← stats cards, always visible
├──────────┬───────────────────────────────────────────────┤
│          │                                               │
│ Overview │  (content changes based on selection)         │
│ Running  │                                               │
│ Pending  │                                               │
│ Scheduled│                                               │
│ Failed   │                                               │
│ All Jobs │                                               │
│ ──────── │                                               │
│ Runners  │                                               │
│ ──────── │                                               │
│ Ops      │                                               │
│          │                                               │
└──────────┴───────────────────────────────────────────────┘
```

### Sections

| Section | Content |
|---|---|
| **Overview** | Published/Failed trend charts + channel health grid |
| **Running** | Running jobs table (status=running) |
| **Pending** | Pending jobs queue (status=pending, no run_at) |
| **Scheduled** | Scheduled/delayed jobs (status=pending, has run_at) |
| **Failed** | Failed jobs table (status=failed) |
| **All Jobs** | Full searchable/filterable job table with all statuses — currently hidden in a modal, promoted to first-class section |
| **Runners** | Job runner status table with heartbeat, pause/restart actions |
| **Operations** | Clear stuck, purge old jobs, clear channel, cleanup consumers, broadcast command |

### Implementation
- Keep the page header + stats cards above the SideNavView (always visible)
- Stats cards auto-refresh and stay in sync regardless of which section is active
- Each section is a View child mounted lazily via SideNavView
- Reuse existing JobStatsView, JobHealthView, JobDetailsView, table configurations
- The existing ~990-line file gets split into focused section views

### Files
- `src/extensions/admin/jobs/JobsAdminPage.js` — refactored to header + SideNavView
- `src/extensions/admin/jobs/sections/JobOverviewSection.js` — NEW: charts + health
- `src/extensions/admin/jobs/sections/JobTableSection.js` — NEW: reusable filtered job table (used by Running, Pending, Scheduled, Failed, All)
- `src/extensions/admin/jobs/sections/JobRunnersSection.js` — NEW: runners management
- `src/extensions/admin/jobs/sections/JobOperationsSection.js` — NEW: management actions
- `src/extensions/admin/jobs/JobStatsView.js` — kept as-is (stats cards)
- `src/extensions/admin/jobs/JobHealthView.js` — kept as-is (channel health)
- `src/extensions/admin/jobs/JobDetailsView.js` — kept as-is (detail modal)

---

## Part 3: Security Admin — New Pages & Enhancements

### What Exists Today

| Route | Page | What it does |
|---|---|---|
| `system/incident-dashboard` | IncidentDashboardPage | Stats cards, trend charts, country map, new tickets/incidents tables |
| `system/incidents` | IncidentTablePage | Flat incident list |
| `system/events` | EventTablePage | Flat event list |
| `system/rulesets` | RuleSetTablePage | Flat ruleset list |
| `system/tickets` | TicketTablePage | Flat ticket list |
| `system/system/geoip` | GeoLocatedIPTablePage | GeoIP cache with IP lookup |
| `system/logs` | LogTablePage | System logs |

### Key Gaps

**Firewall — completely missing from the UI:**
- No way to block/unblock/whitelist IPs from the admin portal
- GeoIPView has no block/unblock/whitelist actions (API supports `POST /api/account/system/geoip/{id}` with action: block/unblock/whitelist/unwhitelist/threat_analysis)
- No firewall activity log view (API: `GET /api/logit/log?kind__startswith=firewall:`)
- No blocked IPs dashboard or active blocks table

**Incident Rules — handler UX is poor:**
- Handler field is plain text — admins must know the syntax (`block://?ttl=3600`, `email://perm@manage_security`, etc.)
- No guided builder or preset selection

**Event navigation is broken:**
- EventView "View Incident" and "View Related Model" are TODO stubs

**Ticket assignment not implemented:**
- TicketView "Assign User" shows "Coming Soon"

**Bouncer — completely missing from the UI:**
- No frontend models for bouncer admin APIs
- No views for devices, signals, or signatures
- Backend endpoints: `/api/account/bouncer/device`, `/api/account/bouncer/signal`, `/api/account/bouncer/signature`
- Bouncer metrics not surfaced anywhere
- Signature management has full CRUD API but no UI
- **Note:** Bouncer admin API docs may be incomplete — endpoint details from security README, may need refinement

### New Models

| Model | Endpoint | Key Fields |
|---|---|---|
| `BouncerDevice` | `/api/account/bouncer/device` | muid, duid, fingerprint_id, risk_tier, event_count, block_count, last_seen_ip, linked_muids |
| `BouncerSignal` | `/api/account/bouncer/signal` | muid, stage, ip_address, page_type, risk_score, decision, triggered_signals, raw_signals, server_signals |
| `BouncerSignature` | `/api/account/bouncer/signature` | sig_type, value, source, confidence, hit_count, block_count, is_active, expires_at, notes |

### New Pages

| Page | Route | Description |
|---|---|---|
| BlockedIPsTablePage | `system/security/blocked-ips` | Filtered GeoIP table (is_blocked=true) with unblock/whitelist actions |
| FirewallLogTablePage | `system/security/firewall-log` | Log table filtered to `kind__startswith=firewall:` |
| BouncerSignalTablePage | `system/security/bouncer-signals` | Assessment audit trail with decision, risk score, triggered signals |
| BouncerDeviceTablePage | `system/security/bouncer-devices` | Device reputation with risk tier, event/block counts |
| BotSignatureTablePage | `system/security/bot-signatures` | Signature management with full CRUD |

### New Views (opened in modals)

| View | Description |
|---|---|
| BouncerDeviceView | Device detail with signals + incidents tabs |
| BouncerSignalView | Signal detail with raw/server signals, linked device + GeoIP |
| HandlerBuilderView | Guided handler string builder for RuleSet rules |

### GeoIPView Enhancements
Add block/unblock/whitelist actions to context menu:
- **Block IP** — `POST /api/account/system/geoip/{id}` with `{action: "block", value: {reason, ttl}}`
- **Unblock IP** — `POST /api/account/system/geoip/{id}` with `{action: "unblock", value: reason}`
- **Whitelist IP** — `POST /api/account/system/geoip/{id}` with `{action: "whitelist", value: reason}`
- **Remove Whitelist** — `POST /api/account/system/geoip/{id}` with `{action: "unwhitelist"}`
- **Refresh Threat Data** — `POST /api/account/system/geoip/{id}` with `{action: "threat_analysis"}`

### RuleSet Handler Builder
Replace plain text handler input with guided builder:
- Dropdown to select handler type (Block IP, Email, SMS, Notify, Create Ticket, Run Job, LLM Triage)
- Per-type configuration fields:
  - **Block**: TTL picker (1h, 6h, 24h, 7d, 30d, permanent)
  - **Email/SMS/Notify**: Target selector (permission-based, protected key, specific user)
  - **Ticket**: Priority picker
  - **Job**: Module path input
  - **LLM**: No config needed (just `llm://`)
- Generates the handler string automatically
- Shows human-readable preview

### Fix Stubbed Actions
- EventView: Wire "View Incident" to open IncidentView in modal
- EventView: Wire "View Related Model" to open the model's VIEW_CLASS
- TicketView: Wire "Assign User" to a user selector

### Enhanced Dashboard Metrics
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

---

## Files Summary

### New Files
- `src/core/models/Bouncer.js` — BouncerDevice, BouncerSignal, BouncerSignature models + lists + forms
- `src/extensions/admin/security/BlockedIPsTablePage.js`
- `src/extensions/admin/security/FirewallLogTablePage.js`
- `src/extensions/admin/security/BouncerSignalTablePage.js`
- `src/extensions/admin/security/BouncerDeviceTablePage.js`
- `src/extensions/admin/security/BotSignatureTablePage.js`
- `src/extensions/admin/security/BouncerDeviceView.js`
- `src/extensions/admin/security/BouncerSignalView.js`
- `src/extensions/admin/security/HandlerBuilderView.js`
- `src/extensions/admin/jobs/sections/JobOverviewSection.js`
- `src/extensions/admin/jobs/sections/JobTableSection.js`
- `src/extensions/admin/jobs/sections/JobRunnersSection.js`
- `src/extensions/admin/jobs/sections/JobOperationsSection.js`

### Modified Files
- `src/admin.js` — full menu restructure, new page registrations
- `src/extensions/admin/index.js` — export new components
- `src/extensions/admin/jobs/JobsAdminPage.js` — refactor to header + SideNavView
- `src/extensions/admin/account/devices/GeoIPView.js` — add firewall actions
- `src/extensions/admin/incidents/EventView.js` — fix TODO stubs
- `src/extensions/admin/incidents/TicketView.js` — wire user assignment
- `src/extensions/admin/incidents/RuleSetView.js` — integrate handler builder

### Deleted Files (done)
- ~~`src/extensions/admin/jobs/TaskManagementPage.js`~~ — deleted
- ~~`src/extensions/admin/jobs/TaskDetailsView.js`~~ — deleted
- ~~`src/extensions/admin/jobs/RunnerDetailsView.js`~~ — deleted

## Design Decisions

1. **Top-level items for daily-use pages** — Dashboard, Users, Groups, Jobs get one-click access
2. **Security as unified pipeline group** — absorbs incidents, tickets, events, rules, firewall, bouncer into one coherent group
3. **Jobs uses SideNavView** — keeps stats header visible, organizes sections without menu bloat
4. **Standard CRUD endpoints** — all firewall actions use existing `POST /api/account/system/geoip/{id}` with action param
5. **Handler builder is UI-only** — generates handler strings, RuleSet model still stores plain string
6. **Permission gated** — `view_security` for read, `manage_security` for write actions
7. **Keep existing pages** — existing table pages stay registered, just reorganized in the menu

## Open Questions
- For the handler builder, should we support chaining multiple handlers on one rule (e.g., block + notify)?
- Should firewall blocks show a confirmation with estimated impact (e.g., "This IP has had 3 sessions in the last 24h")?
- Bouncer admin API docs may be incomplete — need to verify full response shapes once docs are finalized

## Acceptance Criteria

**Nav Reorganization:**
- [ ] Menu restructured per proposed layout
- [ ] All existing pages still accessible at their routes
- [ ] AWS group removed, CloudWatch moved to System

**Jobs Refactor:**
- [ ] Stats cards visible above SideNavView at all times
- [ ] SideNavView with Overview, Running, Pending, Scheduled, Failed, All Jobs, Runners, Operations sections
- [ ] Auto-refresh works across all sections
- [ ] All existing job actions preserved (cancel, retry, clear stuck, purge, broadcast)
- [ ] "All Jobs" promoted from modal to first-class section with search + filters

**Security — Firewall:**
- [ ] GeoIPView: block/unblock/whitelist/threat_analysis actions in context menu
- [ ] BlockedIPsTablePage shows is_blocked=true with unblock/whitelist actions
- [ ] FirewallLogTablePage shows firewall:* logs
- [ ] IP lookup works

**Security — Bot Detection:**
- [ ] Bouncer models created (BouncerDevice, BouncerSignal, BouncerSignature)
- [ ] Bouncer signals table with decision, risk score, triggered signals
- [ ] Bouncer devices table with risk tier
- [ ] Bot signatures table with full CRUD
- [ ] Signal detail view shows raw_signals, server_signals, linked device + GeoIP
- [ ] Device detail view shows related signals and incidents

**Security — Incidents & Rules:**
- [ ] RuleSet handler field uses guided builder
- [ ] EventView: "View Incident" and "View Related Model" work
- [ ] TicketView: user assignment works

**Security — Dashboard:**
- [ ] Enhanced dashboard with firewall + bouncer metric cards
- [ ] Overview count cards (active blocks, blocked devices, open incidents, etc.)
