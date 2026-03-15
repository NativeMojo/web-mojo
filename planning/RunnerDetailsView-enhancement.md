# Plan: RunnerDetailsView Enhancement

## 1. Objective

Rewrite `RunnerDetailsView` as a clean, tabbed modal using `TabView` and the real
django-mojo jobs API. Each tab is a focused, self-contained view that loads its own
data lazily. No data is repeated across tabs. Light Bootstrap 5 styling, consistent
with the existing admin components.

**Visual reference:** `planning/mockups/RunnerDetailsView.html`

---

## 2. Scope

### In scope
- `src/extensions/admin/jobs/RunnerDetailsView.js` — full rewrite

### Out of scope
- All other files in `src/extensions/admin/jobs/`
- Backend changes
- Tests, examples, or docs

---

## 3. Context

### What's wrong with the current file
1. **Fake endpoints** — `loadRunnerMetrics()`, `loadCurrentTasks()`, `loadRunnerLogs()`
   all call `/api/runners/<hostname>/...` which does not exist.
2. **Action buttons use non-existent endpoints** — pause/restart/remove are not in
   the real API.
3. **One massive template, one massive re-render** — every refresh re-renders
   everything.
4. **No sysinfo** — `GET /api/jobs/runners/sysinfo/<runner_id>` is never called despite
   being the richest data source available.

### Real API endpoints

| Tab | Endpoint |
|---|---|
| Overview | Runner object passed in from caller |
| Sysinfo | `GET /api/jobs/runners/sysinfo/<runner_id>` |
| Running Jobs | `GET /api/jobs/job?runner_id=<runner_id>&status=running&size=50` |
| Logs | `GET /api/jobs/logs?job_id=<id>&sort=-created&size=20` per running job, then merge |
| Actions — Ping | `POST /api/jobs/runners/ping` `{ runner_id, timeout: 2.0 }` |
| Actions — Shutdown | `POST /api/jobs/runners/shutdown` `{ runner_id, graceful: true }` |
| Actions — Broadcast | `POST /api/jobs/runners/broadcast` `{ command, timeout }` |

### Runner object shape (passed in from caller)
Fields from `GET /api/jobs/runners`:
`runner_id`, `channels[]`, `jobs_processed`, `jobs_failed`, `started`, `last_heartbeat`, `alive`

### Sysinfo result shape (key fields under `data.result`)
```
os.{ system, hostname, release, processor, machine, version }
cpu.{ count, freq.{ current, min, max } }    (freq may be null)
cpu_load                                      overall %
cpus_load[]                                   per-core %
memory.{ total, used, available, percent }    bytes
disk.{ total, used, free, percent }           bytes
network.{ tcp_cons, bytes_sent, bytes_recv, packets_sent, packets_recv,
          errin, errout, dropin, dropout }
boot_time                                     unix timestamp
users[]
```
Sysinfo may return `status: "error"` with an `error` field (e.g. psutil not installed).
Always check `data.status` before reading `data.result`.

### Log API note
The logs API uses `kind` (not `level`): values are `debug`, `info`, `warn`, `error`.
Log filter buttons must use `warn` as the data-level value (displayed as "Warning").

---

## 4. Architecture

```
RunnerDetailsView (extends View)
  └── TabView (child view, containerId: 'runner-tabs')
        ├── RunnerOverviewTab    (View)
        ├── RunnerSysinfoTab    (View)  — loads on first onTabActivated()
        ├── RunnerJobsTab       (View)  — loads on first onTabActivated()
        ├── RunnerLogsTab       (View)  — loads on first onTabActivated()
        └── RunnerActionsTab    (View)
```

`RunnerDetailsView.show(runner)` creates the view and wraps it in `Dialog.showDialog()`.
Each tab view receives `runner` as a constructor option.

---

## 5. Implementation Steps

### Step 1 — RunnerDetailsView (shell)

Responsibilities: set up the TabView child, expose `static show()`.

```js
constructor(options = {}) {
  super({ className: 'runner-details-view', ...options });
  this.runner = options.runner || null;
}

async onInit() {
  const r = this.runner;
  const tabView = new TabView({
    containerId: 'runner-tabs',
    tabs: {
      'Overview':    new RunnerOverviewTab({ runner: r }),
      'System Info': new RunnerSysinfoTab({ runner: r }),
      'Running Jobs': new RunnerJobsTab({ runner: r }),
      'Logs':        new RunnerLogsTab({ runner: r }),
      'Actions':     new RunnerActionsTab({ runner: r })
    }
  });
  this.addChild(tabView);
}

// Template: single div, just the container
get template() {
  return `<div data-container="runner-tabs"></div>`;
}
```

### Step 2 — static show(runner, options = {})

```js
static async show(runner, options = {}) {
  const view = new RunnerDetailsView({ runner });

  return await Dialog.showDialog({
    title: `<i class="bi bi-cpu me-2"></i>${runner.runner_id}`,
    body: view,
    size: 'xl',
    scrollable: true,
    buttons: [
      { text: 'Close', class: 'btn-secondary', dismiss: true }
    ],
    ...options
  });
}
```

No action buttons in the Dialog footer — all operational controls live in the
Actions tab where they have context and descriptions.

---

### Step 3 — RunnerOverviewTab

**What it shows:** Runner identity, alive status, channels, worker utilization,
jobs processed/failed totals, uptime. A brief "→ System Info tab for resource
detail" nudge if sysinfo has not been loaded yet. No resource bars here — that
is Sysinfo's job.

**Data source:** `this.runner` only (already available, no fetch needed).

**Derived fields to compute in `onInit()`:**
- `this.uptimeText` — from `runner.started` to now via `formatUptime()`
- `this.heartbeatAgeText` — seconds since `runner.last_heartbeat`
- `this.heartbeatClass` — `text-success` < 30s, `text-warning` < 120s, `text-danger` otherwise
- `this.errorRate` — `(jobs_failed / jobs_processed * 100).toFixed(2)` guarded for zero
- `this.workerCount` — count `runner.channels` length as a proxy (no direct worker data
  from heartbeat; show channels count instead)

**Template structure:**
```
card border-0 shadow-sm
  card-header: runner_id (monospace), alive badge, heartbeat age
  card-body row g-3:
    col-md-6: KV table (started, uptime, heartbeat, status)
    col-md-6: channels badges + jobs_processed + jobs_failed + error rate
```

Keep it to one card. No stat tiles grid, no resource bars.

---

### Step 4 — RunnerSysinfoTab

**What it shows:** Full sysinfo — OS details, CPU (overall + per-core tiles),
memory bar + breakdown, disk bar + breakdown, network 9-tile grid, users.

**Loading:**
```js
async onTabActivated() {
  if (this.loaded) return;
  this.loading = true;
  await this.render();
  await this.loadSysinfo();
  this.loading = false;
  this.loaded = true;
  await this.render();
}

async loadSysinfo() {
  try {
    const resp = await this.getApp().rest.GET(
      `/api/jobs/runners/sysinfo/${this.runner.runner_id}`
    );
    if (resp.success && resp.data.status === 'success') {
      this.sysinfo = resp.data.data.result;
      this.enrichSysinfo();
    } else {
      this.sysinfoError = resp.data.error
        || (resp.data.data && resp.data.data.error)
        || 'Could not load system info.';
    }
  } catch (e) {
    this.sysinfoError = e.message;
  }
}
```

**enrichSysinfo()** — adds human-readable fields onto `this.sysinfo` before render:
- `memory.totalGb`, `memory.usedGb`, `memory.availableGb` via `formatBytes()`
- `disk.totalGb`, `disk.usedGb`, `disk.freeGb` via `formatBytes()`
- `network.bytesRecvFmt`, `network.bytesSentFmt` via `formatBytes()`
- `cpu.freqMhz` — `cpu.freq ? Math.round(cpu.freq.current) + ' MHz' : 'N/A'`
- `cpuCores[]` — map `cpus_load` to `[{ index, pct, barClass }]`
- `barClass` per resource: `bg-success` < 60%, `bg-warning` < 80%, `bg-danger` >= 80%
- `bootDatetime` — human-readable from `boot_time` unix timestamp

**Template structure:**
```
{{#loading|bool}}  → spinner card
{{/loading|bool}}

{{#sysinfoError|bool}}  → alert-warning with error message + Retry button
{{/sysinfoError|bool}}

{{#sysinfo}}
  <!-- OS card: hostname, OS, release, machine, version -->
  <!-- CPU card: overall bar, freq sub-line, per-core grid (4 cols) -->
  <!-- Memory card: progress bar, 4-field row (total/used/available/%) -->
  <!-- Disk card: progress bar, 4-field row -->
  <!-- Network card: 3-col grid of 9 net tiles -->
  <!-- Users card: list or empty state -->
{{/sysinfo}}
```

**Refresh button** in a `d-flex justify-content-end mb-3` row above the cards:
```html
<button class="btn btn-sm btn-outline-secondary" data-action="refresh-sysinfo">
  <i class="bi bi-arrow-clockwise me-1"></i>Refresh
</button>
```

```js
async onActionRefreshSysinfo() {
  this.loaded = false;
  this.sysinfo = null;
  this.sysinfoError = null;
  await this.onTabActivated();
}
```

---

### Step 5 — RunnerJobsTab

**What it shows:** Table of currently executing jobs on this runner. No totals or
aggregate stats — that is the Overview tab's job.

**Loading:** lazy, same pattern as Sysinfo.

```js
async loadJobs() {
  const resp = await this.getApp().rest.GET(
    `/api/jobs/job?runner_id=${this.runner.runner_id}&status=running&size=50`
  );
  if (resp.success && resp.data.status) {
    this.jobs = resp.data.data.map(job => ({
      ...job,
      durationText: this.formatDuration(
        (Date.now() / 1000) - new Date(job.started_at).getTime() / 1000
      ),
      attemptClass: job.attempt > 1
        ? 'bg-danger-subtle text-danger'
        : 'bg-warning-subtle text-warning',
      funcDisplay: job.func   // full path; template truncates with |truncate(40)
    }));
  } else {
    this.jobs = [];
  }
}
```

**Template structure:**
```
refresh button (top right)

{{#jobs.length}}
  card border-0 shadow-sm > table-responsive
    table table-sm table-hover align-middle
      thead table-light: Job ID | Function | Channel | Started | Duration | Attempt | Actions
      tbody: {{#jobs}} row with view + cancel buttons {{/jobs}}
{{/jobs.length}}

{{^jobs.length}}
  text-center text-muted py-5 (empty state)
{{/jobs.length}}
```

**Action handlers:**
```js
async onActionViewJob(event, element) {
  const jobId = element.dataset.jobId;
  this.emit('job:view', { jobId });
}

async onActionCancelJob(event, element) {
  const jobId = element.dataset.jobId;
  const ok = await Dialog.confirm(
    'Cancel this job? The runner will receive a cooperative cancel signal.',
    'Cancel Job'
  );
  if (!ok) return;
  const resp = await this.getApp().rest.POST(
    `/api/jobs/job/${jobId}`, { cancel_request: true }
  );
  if (resp.success && resp.data.status) {
    this.showSuccess('Cancel signal sent.');
    this.loaded = false;
    await this.onTabActivated();
  } else {
    this.showError(resp.data.error || 'Could not cancel job.');
  }
}

async onActionRefreshJobs() {
  this.loaded = false;
  await this.onTabActivated();
}
```

---

### Step 6 — RunnerLogsTab

**What it shows:** Aggregated log stream from all jobs currently running on this
runner. Filter bar for level. Max 50 entries sorted by `created` desc.

**Loading strategy:**
1. Fetch running jobs (same endpoint as Jobs tab, size=50, just need IDs)
2. For each job_id, `GET /api/jobs/logs?job_id=<id>&sort=-created&size=20`
3. Merge all results, sort by `created` desc, take top 50
4. Map each log: add `levelBadgeClass` via `getLogLevelClass(log.kind)`

```js
getLogLevelClass(kind) {
  return {
    debug:   'bg-secondary-subtle text-secondary',
    info:    'bg-primary-subtle text-primary',
    warn:    'bg-warning-subtle text-warning',
    error:   'bg-danger-subtle text-danger'
  }[kind] || 'bg-secondary-subtle text-secondary';
}
```

**State:**
- `this.logs = []`
- `this.logFilter = 'all'`
- `this.filteredLogs` — computed in `onBeforeRender()` by filtering `this.logs`

```js
async onBeforeRender() {
  this.filteredLogs = this.logFilter === 'all'
    ? this.logs
    : this.logs.filter(l => l.kind === this.logFilter);
}
```

**Filter buttons** use `data-action="filter-logs" data-kind="all|debug|info|warn|error"`.
The handler just sets `this.logFilter` and calls `this.render()` — no re-fetch.

**Template structure:**
```
card border-0 shadow-sm
  card-header: filter buttons (All/Debug/Info/Warning/Error) + refresh button (ms-auto)
  div style="max-height:400px;overflow-y:auto;"
    {{#filteredLogs}} log lines {{/filteredLogs}}
    {{^filteredLogs}} empty state {{/filteredLogs}}
```

Each log line:
```html
<div class="d-flex align-items-start gap-2 px-3 py-2 border-bottom font-monospace small">
  <span class="text-muted flex-shrink-0">{{.created|time}}</span>
  <span class="badge {{.levelBadgeClass}} flex-shrink-0">{{.kind|uppercase}}</span>
  <span class="flex-grow-1 text-break">{{.message}}</span>
</div>
```

Note: `kind` value `warn` renders as badge label `WARN` (via `|uppercase`). The
filter button label can read "Warning" while `data-kind="warn"`.

---

### Step 7 — RunnerActionsTab

**What it shows:** Three operational action cards (Ping, Shutdown, Broadcast) plus
Export. No data display — results appear as toasts or inline within each card.

This tab has no async data to load. No `onTabActivated()` needed.

**Ping card:**
```js
async onActionPing() {
  const resp = await this.getApp().rest.POST('/api/jobs/runners/ping', {
    runner_id: this.runner.runner_id,
    timeout: 2.0
  });
  if (resp.success && resp.data.status) {
    this.pingResult = resp.data.responsive
      ? '<span class="text-success"><i class="bi bi-check-circle me-1"></i>Runner is responsive</span>'
      : '<span class="text-warning"><i class="bi bi-exclamation-triangle me-1"></i>Runner did not respond within 2s</span>';
  } else {
    this.pingResult = '<span class="text-danger">Ping failed</span>';
  }
  await this.render();
}
```

Template shows `{{{pingResult}}}` (triple braces — HTML) below the Ping button if set.

**Shutdown card:**
```js
async onActionShutdown() {
  const ok = await Dialog.confirm(
    `Send graceful shutdown to ${this.runner.runner_id}? ` +
    'The runner will finish its current job then exit. This is fire-and-forget.',
    'Shutdown Runner',
    { confirmText: 'Shutdown', confirmClass: 'btn-danger' }
  );
  if (!ok) return;
  const resp = await this.getApp().rest.POST('/api/jobs/runners/shutdown', {
    runner_id: this.runner.runner_id,
    graceful: true
  });
  if (resp.success && resp.data.status) {
    this.showSuccess('Shutdown command sent.');
  } else {
    this.showError(resp.data.error || 'Shutdown command failed.');
  }
}
```

**Broadcast card:**
- `<select>` with options: status / pause / resume / reload / shutdown
- Timeout `<input type="number">` defaulting to 2.0
- Read values from `this.element.querySelector('[data-field="broadcast-command"]').value`
  and `[data-field="broadcast-timeout"]`.value before POST.
- On success: show `Dialog.showCode(JSON.stringify(resp.data, null, 2), 'json', { title: 'Broadcast Response' })`

**Export card:**
```js
async onActionExport() {
  // Collect what's already been loaded in sibling tabs
  // Access sibling tab views via parent TabView
  const exportData = {
    runner: this.runner,
    exported_at: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), {
    href: url,
    download: `runner-${this.runner.runner_id}-${Date.now()}.json`
  });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  this.showSuccess('Runner data exported.');
}
```

---

### Step 8 — Shared helpers (methods on each tab base or a shared module)

```js
formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

formatDuration(seconds) {
  if (seconds < 60)   return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${Math.round(seconds / 3600)}h`;
}

formatBytes(bytes) {
  if (bytes >= 1e9) return (bytes / 1e9).toFixed(2) + ' GB';
  if (bytes >= 1e6) return (bytes / 1e6).toFixed(2) + ' MB';
  if (bytes >= 1e3) return (bytes / 1e3).toFixed(2) + ' KB';
  return bytes + ' B';
}
```

Define these as plain methods on each tab view that needs them, or as a small
helper object at the top of the file exported as a const.

---

## 6. Styling Rules

- **No custom dark-theme CSS.** Use Bootstrap 5 only.
- Cards: `card border-0 shadow-sm` (matches `JobStatsView`, `JobHealthView`).
- Card headers: `card-header bg-white border-bottom py-2` with `h6 fw-semibold`.
- Badges: `bg-*-subtle text-*` pattern (matches existing admin views).
- Monospace: Bootstrap's `font-monospace` class.
- Progress bars: `progress` / `progress-bar bg-success|warning|danger`.
- Buttons: standard Bootstrap `btn btn-sm btn-outline-*`.
- Empty states: `text-center text-muted py-5` with `bi fs-2 d-block mb-2 opacity-50`.
- Loading spinners: `<div class="text-center py-5"><div class="spinner-border text-primary">`.

---

## 7. Edge Cases

| Scenario | Handling |
|---|---|
| psutil not installed | Sysinfo tab shows `alert alert-warning` with the error message from `data.data.error` and a Retry button |
| Runner does not respond to sysinfo (404) | Same error card — `resp.data.error` |
| `cpu.freq` is null | Omit freq line from CPU card entirely (guard with `{{#sysinfo.cpu.freqMhz}}`) |
| `cpus_load` is empty | Skip per-core grid; only show overall bar |
| No running jobs | Jobs tab shows empty state; Logs tab will have no job IDs to query, sets `this.logs = []` immediately |
| `jobs_processed === 0` | Guard division: `errorRate = jobs_processed > 0 ? ... : '0.00'` |
| `last_heartbeat` is ISO string | Parse: `(Date.now() - new Date(runner.last_heartbeat).getTime()) / 1000` |
| Cancel signal on terminal job | API returns `status: false, error: "Cannot cancel..."` → `this.showError(resp.data.error)`, no reload |
| Broadcast returns 0 responses | `resp.data.responses_count === 0` → show code dialog with message "No runners responded" |
| Sysinfo tab re-entered after error | `this.loaded` stays false on error path, so next activation retries automatically |

---

## 8. Deliverable

The implementing agent must produce:

1. `src/extensions/admin/jobs/RunnerDetailsView.js` — single file, complete rewrite.
   All tab view classes can live in the same file (they are internal to this module).
2. Brief summary: what changed, what was removed, what endpoints are now used.
3. Verification steps:
   - Open a runner from the jobs admin page
   - Overview tab renders immediately with runner identity and channels
   - Clicking System Info tab triggers a fetch and renders OS/CPU/memory/disk/network
   - Clicking Running Jobs shows the jobs table (empty state if none)
   - Clicking Logs aggregates logs from running jobs
   - Actions tab: Ping shows inline result; Shutdown prompts confirmation; Broadcast
     opens a code dialog with the API response; Export downloads JSON
   - No data is duplicated across tabs