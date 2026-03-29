# Jobs Page Refactor (SideNavView)

**Type**: request
**Status**: open
**Date**: 2026-03-28

## Description
Refactor JobsAdminPage from a ~990-line wall of content into a SideNavView layout. Stats cards stay visible above the nav, content sections are organized into sidebar tabs.

## Problem
JobsAdminPage renders everything at once: stats cards, 2 charts, channel health, runners table, running/pending/scheduled/failed job tables, and an operations bar. You have to scroll through everything to find what you need. The "View All Jobs" table is hidden behind a modal.

## Proposed Layout
```
+----------------------------------------------------------+
|  Jobs                                        [Refresh] [Gear]  |
|  Async job monitoring and runner management              |
|  Auto-refresh: 30s | Last updated: 3:42 PM              |
+----------------------------------------------------------+
|  [Pending: 12] [Running: 4] [Completed: 1.2k] [Failed: 3]  |
+----------+-----------------------------------------------+
|          |                                               |
| Overview |  (content changes based on selection)         |
| Running  |                                               |
| Pending  |                                               |
| Scheduled|                                               |
| Failed   |                                               |
| All Jobs |                                               |
| -------- |                                               |
| Runners  |                                               |
| -------- |                                               |
| Ops      |                                               |
|          |                                               |
+----------+-----------------------------------------------+
```

## Sections

| Section | Content |
|---|---|
| **Overview** | Published/Failed trend charts + channel health grid |
| **Running** | Running jobs table (status=running) |
| **Pending** | Pending jobs queue (status=pending, no run_at) |
| **Scheduled** | Scheduled/delayed jobs (status=pending, has run_at) |
| **Failed** | Failed jobs table (status=failed) |
| **All Jobs** | Full searchable/filterable job table with all statuses — promoted from modal to first-class section |
| **Runners** | Job runner status table with heartbeat, pause/restart actions |
| **Operations** | Clear stuck, purge old jobs, clear channel, cleanup consumers, broadcast command |

## Implementation
- Keep the page header + stats cards above the SideNavView (always visible)
- Stats cards auto-refresh and stay in sync regardless of which section is active
- Each section is a View child mounted lazily via SideNavView
- Reuse existing JobStatsView, JobHealthView, JobDetailsView, table configurations
- The existing ~990-line file gets split into focused section views

## Files
- `src/extensions/admin/jobs/JobsAdminPage.js` — refactored to header + SideNavView
- `src/extensions/admin/jobs/sections/JobOverviewSection.js` — NEW: charts + health
- `src/extensions/admin/jobs/sections/JobTableSection.js` — NEW: reusable filtered job table (used by Running, Pending, Scheduled, Failed, All)
- `src/extensions/admin/jobs/sections/JobRunnersSection.js` — NEW: runners management
- `src/extensions/admin/jobs/sections/JobOperationsSection.js` — NEW: management actions
- `src/extensions/admin/jobs/JobStatsView.js` — kept as-is (stats cards)
- `src/extensions/admin/jobs/JobHealthView.js` — kept as-is (channel health)
- `src/extensions/admin/jobs/JobDetailsView.js` — kept as-is (detail modal)

## Acceptance Criteria
- [ ] Stats cards visible above SideNavView at all times
- [ ] SideNavView with Overview, Running, Pending, Scheduled, Failed, All Jobs, Runners, Operations sections
- [ ] Auto-refresh works across all sections
- [ ] All existing job actions preserved (cancel, retry, clear stuck, purge, broadcast)
- [ ] "All Jobs" promoted from modal to first-class section with search + filters

## Constraints
- Reuse existing view components where possible
- No backend API changes
- Permission gated with `view_jobs` / `manage_jobs`
