# Jobs Page — Split into Child Pages + Recover RunnerDetailsView

**Type**: request
**Status**: resolved
**Date**: 2026-03-30
**Related**: `planning/issues/jobs-page-regression.md`

## Description
Remove the SideNavView from JobsAdminPage and split into separate child pages under a "Jobs" parent menu, matching the pattern used by Security, Email, Push Notifications, etc. Recover the deleted `RunnerDetailsView.js` from git and wire it back into the runners table.

## Current State
```
Jobs (single SideNavView page)
├── SideNavView
│   ├── Overview (charts + health)
│   ├── Runners (flat table, no click action)
│   ├── Running / Pending / Scheduled / Failed / All Jobs (filtered tables)
│   └── Operations (admin buttons)
```

## Target State
```
Sidebar Menu:
  Job Engine
  ├── Dashboard    → JobDashboardPage (stats + charts + health + operations buttons)
  ├── Runners      → JobRunnersPage (runners table → click opens RunnerDetailsView)
  └── Jobs         → JobsTablePage (all jobs table, filterable by status)
```

## What Gets Reused (no changes needed)
| Existing file | Reused as |
|---------------|-----------|
| `JobStatsView.js` | Stats cards on Dashboard page |
| `sections/JobOverviewSection.js` | Content of Dashboard page (charts + health) |
| `sections/JobTableSection.js` | Content of Jobs table page (already has status filters, column configs, batch actions) |
| `sections/JobOperationsSection.js` | Content of Operations page |
| `JobDetailsView.js` | Job detail dialog (already wired via `itemView` in JobTableSection) |
| `JobHealthView.js` | Channel health grid (used by JobOverviewSection) |

## What Changes

### 1. Recover `RunnerDetailsView.js`
- `git show 3809164~1:src/extensions/admin/jobs/RunnerDetailsView.js` → restore to `src/extensions/admin/jobs/RunnerDetailsView.js`
- Re-establish `JobRunner.VIEW_CLASS = RunnerDetailsView`
- Verify imports still resolve (View, Dialog, TabView, JobRunner)

### 2. New pages (thin wrappers around existing section views)

**`JobDashboardPage.js`** — Stats + charts + health + operations
```
Page header + refresh button + auto-refresh
├── JobStatsView (stats cards)
├── JobOverviewSection (charts + health)
└── JobOperationsSection (admin action buttons)
```
- Keeps auto-refresh logic from current JobsAdminPage
- Operations buttons live at the bottom — admin actions while looking at health data
- Route: `system/jobs/dashboard`

**`JobRunnersPage.js`** — Runners table with click → detail
```
Page header
└── JobRunnersSection (with clickAction: 'view' wired to RunnerDetailsView)
```
- Modify `JobRunnersSection` to add `clickAction: 'view'` and `itemView: RunnerDetailsView`
- Route: `system/jobs/runners`

**`JobsTablePage.js`** — All jobs, filterable
```
Page header
└── JobTableSection (status=null, all columns, filters, search)
```
- Route: `system/jobs/list`

### 3. Update `admin.js`
- Remove single `system/jobs` page registration
- Add 3 new page registrations under `system/jobs/*`
- Replace "Job Engine" flat menu item with parent + children:
```javascript
{
    text: 'Job Engine',
    route: null,
    icon: 'bi-gear-wide-connected',
    permissions: ["view_jobs", "manage_jobs"],
    children: [
        { text: 'Dashboard', route: '?page=system/jobs/dashboard', icon: 'bi-bar-chart-line', permissions: ["view_jobs"] },
        { text: 'Runners', route: '?page=system/jobs/runners', icon: 'bi-cpu', permissions: ["view_jobs"] },
        { text: 'Jobs', route: '?page=system/jobs/list', icon: 'bi-list-task', permissions: ["view_jobs"] },
    ]
}
```

### 4. Delete
- `JobsAdminPage.js` — replaced by 3 separate pages

### 5. Export updates in `admin.js`
- Add exports for new pages and `RunnerDetailsView`
- Remove `JobsAdminPage` export

## Files Summary

| Action | File |
|--------|------|
| **Recover** | `src/extensions/admin/jobs/RunnerDetailsView.js` (from git) |
| **Create** | `src/extensions/admin/jobs/JobDashboardPage.js` |
| **Create** | `src/extensions/admin/jobs/JobRunnersPage.js` |
| **Create** | `src/extensions/admin/jobs/JobsTablePage.js` |
| **Modify** | `src/extensions/admin/jobs/sections/JobRunnersSection.js` (add click → detail) |
| **Modify** | `src/admin.js` (registrations + menu + exports) |
| **Delete** | `src/extensions/admin/jobs/JobsAdminPage.js` (replaced) |

## Acceptance Criteria
- [ ] `RunnerDetailsView.js` recovered and functional — click runner row opens 5-tab inspector dialog
- [ ] 3 separate pages under `system/jobs/*` routes
- [ ] Sidebar menu shows "Job Engine" with Dashboard, Runners, Jobs children
- [ ] Dashboard has stats cards + charts + channel health + operations buttons + auto-refresh
- [ ] Runners page shows table with click → `RunnerDetailsView` dialog
- [ ] Jobs page shows full filterable/searchable job table with status filters
- [ ] `JobsAdminPage.js` deleted
- [ ] No broken imports or lint errors

## Constraints
- Reuse existing section views — don't rewrite them, just wrap them in pages
- Keep auto-refresh on dashboard page
- Preserve all existing job/runner actions
- Follow the Security/Email/Push child menu pattern exactly

---

<!-- Fill in when the request is resolved, then move the file to planning/done/ -->
## Resolution
**Status**: Resolved — 2026-03-31

**Files changed**:
- `src/extensions/admin/jobs/RunnerDetailsView.js` — recovered from git (`3809164~1`)
- `src/extensions/admin/jobs/JobDashboardPage.js` — created
- `src/extensions/admin/jobs/JobRunnersPage.js` — created
- `src/extensions/admin/jobs/JobsTablePage.js` — created
- `src/extensions/admin/jobs/sections/JobRunnersSection.js` — added itemView: RunnerDetailsView
- `src/admin.js` — 3 child page registrations under `system/jobs/*`, parent menu with children
- `src/extensions/admin/index.js` — updated exports
- `src/extensions/admin/jobs/JobsAdminPage.js` — deleted

**Tests run**:
- `vite build` — passes, no import errors

**Docs updated**:
- None

**Validation**:
- Build clean, no broken imports
- All existing section views reused as-is (JobOverviewSection, JobTableSection, JobOperationsSection, JobRunnersSection, JobStatsView)
- RunnerDetailsView restored with all 5 tabs and `JobRunner.VIEW_CLASS` re-established
- Sidebar menu follows Security/Email/Push child pattern
