# Jobs Admin Redesign Mockups

High-level wireframes for the proposed async-jobs experience. Each block shows layout zones, suggested components, and UX notes so we can translate into actual views (`Page`, `View`, `TableView`, etc.).

---

## 1. Jobs Overview (`/admin/jobs/overview`)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Header: "Async Jobs Overview"  | subtitle: "Job queues & runner activity" │
│ Buttons: Refresh ▸ Auto Refresh (15s) ▸ Manage Jobs ▸ Service Health      │
└──────────────────────────────────────────────────────────────────────────┘

┌────────────┬────────────┬────────────┬────────────┐   MetricsMiniChartWidget row
│ Completed  │ Failed     │ In-Flight  │ Queue Depth│   (line/area, days granularity,
│ 24h spark  │ 24h spark  │ duration   │ backlog    │    show settings/trending)       │
└────────────┴────────────┴────────────┴────────────┘

┌───────────────────────────────┬──────────────────────────────────────────┐
│ Job Service Health            │ Runner Pulse timeline                    │
│ ─ status pill (OK / Warning)  │ ─ sparkline of heartbeat latencies       │
│ ─ Broker/Redis connectivity   │ ─ "Last heartbeat: 32s ago"              │
│ ─ Active runners count        │ ─ CTA: View Runners page                 │
│ ─ CTA: Open Service Logs      │                                          │
└───────────────────────────────┴──────────────────────────────────────────┘

┌───────────────────────────────┬──────────────────────────────────────────┐
│ Channel Backlogs (Top 5)      │ Hot Issues                              │
│ channel badge + queued count  │ list of failed/stuck alerts with CTA    │
│ small progress bar + SLA      │ (e.g., "Email channel failing - clear") │
│ quick action buttons          │                                          │
└───────────────────────────────┴──────────────────────────────────────────┘

┌──────────────┬──────────────┬──────────────┬──────────────┬──────────────┐
│ Snapshot Cards (compact data pills)                                           │
│ • Scheduled Jobs today    • Longest running job   • Retries in last hour      │
│ • Job Map / country heat (optional, reuse MetricsCountryMapView mini version) │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Notes**
- Use the existing `MetricsMiniChartWidget` for the KPI strip (enable settings toggle so ops can switch granularity).
- Service Health card pulls runner heartbeats + broker checks from `/api/job/health`.
- Backlog list can be a `TableView` with a custom row template (channel icon, queued, oldest job age, action buttons).
- No large line chart; rely on KPIs and micro sparklines.

---

## 2. Runners Console (`/admin/jobs/runners`)

```
Header: "Runner Fleet"
Filters: [All | Region] [Status dropdown] [Search runner id]
Actions: ▸ Broadcast Config ▸ Add Runner ▸ Cleanup

┌──────────────────────────────────────────────────────────────────────────┐
│ Grid of Runner Cards (2 or 3 per row)                                    │
│ ┌───────────────┬───────────────┬───────────────┐                        │
│ │ Runner ID     │ Status badge  │ Last heartbeat │                       │
│ │ Region / host │ Uptime        │ Active jobs    │                       │
│ │ Channels: chips + counts      │ Buttons: Drain ▸ Restart ▸ Logs        │
│ └───────────────┴───────────────┴───────────────┘                        │
│ ...                                                                    ...│
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│ Channel Capacity Table (optional)                                        │
│ Columns: Channel ▸ Assigned Runners ▸ Max Concurrency ▸ Queued ▸ Actions │
└──────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────┬──────────────────────────────────────────┐
│ Runner Events (table w/ latest logs)                                     │
│  time ▸ runner ▸ message ▸ severity                                      │
└───────────────────────────────┴──────────────────────────────────────────┘
```

**Notes**
- Cards reuse `View` templates; each card subscribes to runner updates without re-rendering the whole grid.
- Provide bulk actions (select multiple runners -> action bar).
- Expose context menu per runner linking into existing `JobDetailsView` for the currently executing job list.

---

## 3. Job Operations (`/admin/jobs/manage`)

```
Header: "Job Operations Center"
Intro: concise copy about dangerous actions, link to docs.

┌──────────────────────┬──────────────────────┬──────────────────────┐
│ Action Tiles (3 cols)                                                     │
│ □ Run Simple Job    | form modal (function + payload)                     │
│ □ Run Test Batch    | quick trigger                                       │
│ □ Broadcast to Runners | send command                                     │
│ □ Clear Stuck Jobs  | channel selector + preview count                    │
│ □ Purge Channel     | confirm dialog + stats                              │
│ □ Cleanup Consumers | summary + exec button                               │
└──────────────────────┴──────────────────────┴──────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│ Recent Maintenance Activity                                              │
│ mini table (timestamp ▸ action ▸ operator ▸ affected channel/count)      │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│ Job Lookup                                                                │
│ - Search bar (job id / correlation id)                                    │
│ - Quick link: open `JobDetailsView` modal                                 │
└──────────────────────────────────────────────────────────────────────────┘
```

**Notes**
- Each tile is a `Card` with icon, description, and CTA button. Use consistent color coding (danger for destructive, info for diagnostics).
- Keep auto-refresh off here; rely on user-triggered executions.
- Centralize success/error toasts so operators know what changed.

---

## A. Compact Jobs Dashboard (single-page version)

> Mirrors current Pending/Running/Scheduled/Completed/Failed header while modernizing the body.

```
Header: "Jobs Dashboard" (buttons: Refresh ▸ Auto (15s) ▸ Manage Jobs ▸ View All Jobs)

┌──────────────────────────────────────────────────────────────────────────┐
│ Service Counters (5 cards)                                               │
│ [Pending] [Running] [Scheduled] [Completed] [Failed]                      │
│  each: count + small trend arrow/day change                              │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│ Mini KPI Chart (MetricsMiniChartWidget)                                  │
│  title: "Jobs Published"  (slugs: jobs.published, account: jobs)         │
│  height ~70px, show settings, click -> open full MetricsChart modal      │
└──────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────┬──────────────────────────────────────────┐
│ Live Jobs (Queued + Running)  │ Recent Failures                          │
│  Table (10 rows)              │  Table (10 rows)                         │
│  Columns:                                                         │
│   • ID + Channel (stacked)       • ID + Function (stacked)                │
│   • Function                     • Channel (badge)                        │
│   • Status badge                 • Error snippet                          │
│   • Duration / queued age        • Action button -> JobDetails            │
└───────────────────────────────┴──────────────────────────────────────────┘

┌───────────────────────────────┬──────────────────────────────────────────┐
│ Scheduled Jobs (next 10)      │ Job Runners (mini table)                 │
│  Columns: when ▸ job ▸ channel│  Columns: runner id ▸ heartbeat ▸ jobs  │
│  CTA: "Open Scheduler"        │  Row click -> Runner detail drawer       │
└───────────────────────────────┴──────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│ Operations Panel                                                        │
│  Buttons: Run Simple ▸ Run Tests ▸ Clear Stuck ▸ Purge Channel           │
│  Secondary link: “Launch Job Table” (routes to TablePage)               │
└──────────────────────────────────────────────────────────────────────────┘
```

**Implementation Notes**
- Stats strip becomes its own `View` so refreshes update counts without re-rendering the page.
- Mini chart click handler opens a `Dialog` hosting the detailed `MetricsChart` (category `jobs_channels`).
- Each table is a `TableView` with custom cell templates to keep rows compact; on row click open `JobDetailsView`.
- Runner mini table pulls aggregated runner info; clicking drives a small `RunnerDetailsView` modal instead of a separate page.
- Operations panel wraps existing action handlers so destructive tasks stay visible but contained.

---

## 4. Optional: Platform Status (`/admin/system-status`)

```
Combines high-level components from AdminDashboardPage + new health widgets:
Header ▸ KPI strip (API latency, Jobs health, Incidents, Webhooks)
Service Matrix table (component ▸ status ▸ last incident ▸ link)
Alert feed / timeline.
```

**Implementation Next Steps**
1. Create new `Page` classes for the three routes and move existing logic into focused child views.
2. Reuse `MetricsMiniChartWidget` + `MetricsCountryMapView` for KPI visuals.
3. Build runner card view + channel backlog table row templates.
4. Slowly migrate actions from current JobsAdminPage into the new Operations Center, then retire the old page once parity is confirmed.
