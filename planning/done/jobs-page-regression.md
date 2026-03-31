# Jobs Page — RunnerDetailsView lost, SideNavView is wrong pattern

**Type**: bug
**Status**: resolved
**Date**: 2026-03-30

## Description
The Jobs admin page was refactored into a SideNavView layout (commit `3809164`, March 28 2026). During this refactor, `RunnerDetailsView.js` (1,190 lines) was deleted. This was the comprehensive runner inspector dialog with 5 tabs: Overview, System Info, Running Jobs, Logs, and Actions. Clicking a runner row no longer opens any detail view — the entire drill-down capability is gone.

Additionally, the SideNavView pattern is the wrong architecture for this page. The admin portal already has a left sidebar menu with collapsible child items (Security, Email, Push Notifications, etc.). Jobs should follow that same pattern — separate pages under a "Jobs" parent menu — rather than embedding a second sidebar-within-a-sidebar via SideNavView.

## Context
- `RunnerDetailsView.js` is recoverable from git: `git show 3809164~1:src/extensions/admin/jobs/RunnerDetailsView.js`
- `TaskDetailsView.js` and `TaskManagementPage.js` were also deleted in the same commit but are not needed (confirmed as junk)
- The current `JobRunnersSection.js` is a 64-line flat table with no row click actions
- The sidebar menu pattern for child pages is established in `src/admin.js` (see Security, Email, Push Notifications, Storage, System sections)
- Planning request `planning/done/jobs-sidenav-refactor.md` drove this refactor

## Reproduction
1. Navigate to Job Engine page in admin portal
2. See a SideNavView with Overview, Runners, Running, Pending, Scheduled, Failed, All Jobs, Operations sections
3. Click on a runner row in the Runners section
4. **Nothing happens** — no detail view opens

## Expected Behavior
- Clicking a runner row should open `RunnerDetailsView` in a dialog showing: identity, system info (OS/CPU/memory/disk/network), running jobs, logs, and actions (ping/shutdown/broadcast)
- Jobs should be organized as separate pages under a "Jobs" parent menu in the sidebar, consistent with every other admin section

## Actual Behavior
- `RunnerDetailsView.js` was deleted — no runner drill-down exists
- Jobs page uses SideNavView (sidebar-within-a-sidebar) instead of the standard child menu pattern
- `JobRunnersSection.js` is a bare read-only table

## Affected Area
- **Files / classes**:
  - `src/extensions/admin/jobs/RunnerDetailsView.js` — DELETED, must recover from git
  - `src/extensions/admin/jobs/JobsAdminPage.js` — SideNavView monolith, needs to be split into separate pages
  - `src/extensions/admin/jobs/sections/JobRunnersSection.js` — missing row click → detail view
  - `src/extensions/admin/jobs/sections/JobOverviewSection.js` — will become its own page
  - `src/extensions/admin/jobs/sections/JobTableSection.js` — will become its own page
  - `src/extensions/admin/jobs/sections/JobOperationsSection.js` — will become its own page
  - `src/admin.js` — needs "Jobs" parent menu with child pages registered
- **Layer**: Page | View | Extension
- **Related docs**: `planning/done/jobs-sidenav-refactor.md`

## Acceptance Criteria
- [ ] `RunnerDetailsView.js` recovered from git and restored
- [ ] Runner table has click-to-open detail view (opens `RunnerDetailsView` in dialog)
- [ ] SideNavView removed — Jobs split into separate pages:
  - Dashboard (overview stats + charts + health)
  - Runners (table with click → RunnerDetailsView)
  - Jobs (all jobs table, filterable by status)
  - Operations (admin actions)
- [ ] Pages registered in `admin.js` with child menu under "Jobs" parent (matching Security/Email/etc pattern)
- [ ] Existing functionality preserved: stats cards, auto-refresh, channel health, job tables, operations
- [ ] `JobRunner.VIEW_CLASS = RunnerDetailsView` re-established

---
<!-- Filled in on resolution -->
## Resolution
**Status**: Resolved — 2026-03-31
**Root cause**: Commit `3809164` deleted `RunnerDetailsView.js` and replaced the jobs page with a SideNavView monolith, losing the runner drill-down and using the wrong navigation pattern.
**Files changed**:
- `src/extensions/admin/jobs/RunnerDetailsView.js` — recovered from git (`3809164~1`)
- `src/extensions/admin/jobs/JobDashboardPage.js` — new (stats + charts + health + operations + auto-refresh)
- `src/extensions/admin/jobs/JobRunnersPage.js` — new (runners table with click → RunnerDetailsView)
- `src/extensions/admin/jobs/JobsTablePage.js` — new (all jobs, filterable)
- `src/extensions/admin/jobs/sections/JobRunnersSection.js` — added itemView: RunnerDetailsView
- `src/admin.js` — 3 child page registrations, parent menu with children
- `src/extensions/admin/index.js` — updated exports
- `src/extensions/admin/jobs/JobsAdminPage.js` — deleted
**Tests added/updated**: None
**Validation**: Build passes, no broken imports, all existing section views reused without modification
