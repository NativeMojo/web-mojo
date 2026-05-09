/**
 * RunnerDetailsView - Job-runner inspector built on the DetailView primitive.
 *
 * Header + side-nav layout matching JobDetailsView. Sections:
 *   Overview · System · Channels · Active Jobs ·
 *   ──History── Job History · Logs ·
 *   ──Control── Actions
 *
 * Overview leads with a `StatusPanel` hero (`@core/views/data/StatusPanel`)
 * driven by the existing `/api/jobs/runners` state (alive + last_heartbeat)
 * — no separate heartbeat collection or sparkline. Below it sit four flat
 * KPIs (Uptime / Jobs processed / Failure rate / Active jobs).
 *
 * Active Jobs / Job History / Logs all use `TableView` over admin model
 * collections. The Channels and Actions sections are Mustache-templated
 * flat-row layouts. System uses `KnownFieldsCard` to promote the well-
 * known sysinfo keys with the raw blob accessible below.
 *
 * Open via `Modal.detail(new RunnerDetailsView({ model }))` — pair with
 * `viewDialogOptions: { header: false, noBodyPadding: true,
 * buttons: [] }` when wired through TableView. Inherits `size: 'lg'`
 * from `Modal.detail()`'s default.
 */

import View from '@core/View.js';
import DetailView from '@core/views/data/DetailView.js';
import StatusPanel from '@core/views/data/StatusPanel.js';
import KnownFieldsCard from '@core/views/data/KnownFieldsCard.js';
import TableView from '@core/views/table/TableView.js';
import Modal from '@core/views/feedback/Modal.js';
import MOJOUtils from '@core/utils/MOJOUtils.js';
import { JobRunner } from '@ext/admin/models/JobRunner.js';
import { JobList, JobLogList, ActiveJobsList } from '@ext/admin/models/Job.js';

const escapeHtml = MOJOUtils.escapeHtml;


// ── Time / size helpers (used by getters + auxFn — never inside templates) ─

function formatUptime(seconds) {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}

function formatUptimeShort(seconds) {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    if (d > 0) return `${d}d`;
    if (h > 0) return `${h}h`;
    return `${Math.floor((seconds % 3600) / 60)}m`;
}

function formatBytes(bytes) {
    if (bytes == null) return '—';
    if (bytes >= 1e9) return (bytes / 1e9).toFixed(2) + ' GB';
    if (bytes >= 1e6) return (bytes / 1e6).toFixed(2) + ' MB';
    if (bytes >= 1e3) return (bytes / 1e3).toFixed(2) + ' KB';
    return bytes + ' B';
}

function progressBarTone(pct) {
    if (pct == null) return 'secondary';
    if (pct >= 80) return 'danger';
    if (pct >= 60) return 'warning';
    return 'success';
}

function heartbeatAgeSec(isoString) {
    if (!isoString) return null;
    return (Date.now() - new Date(isoString).getTime()) / 1000;
}

function formatHeartbeatAge(ageSec) {
    if (ageSec == null) return 'never';
    if (ageSec < 60)   return `${Math.round(ageSec)}s ago`;
    if (ageSec < 3600) return `${Math.round(ageSec / 60)}m ago`;
    return `${Math.round(ageSec / 3600)}h ago`;
}

/**
 * Resolve a runner's high-level health state. Drives StatusPanel tone +
 * header chip + auxFn read-out.
 */
function runnerHealth(runner) {
    const alive = runner?.get?.('alive');
    if (!alive) return { key: 'down', label: 'Down', tone: 'danger' };

    const ageSec = heartbeatAgeSec(runner.get('last_heartbeat'));
    if (ageSec == null) return { key: 'stale', label: 'No heartbeat', tone: 'warning' };
    if (ageSec >= 120)  return { key: 'stale', label: 'Stale heartbeat', tone: 'warning' };
    if (ageSec >= 30)   return { key: 'stale', label: 'Slow heartbeat', tone: 'warning' };
    return { key: 'healthy', label: 'Healthy', tone: 'success' };
}


// ── Overview section ───────────────────────────────────────

class RunnerOverviewSection extends View {
    constructor(options = {}) {
        super({
            className: 'runner-overview-section',
            template: `
                <div data-container="runner-status"></div>
                <div class="detail-kpi-grid">
                    <div data-container="runner-kpi-uptime"></div>
                    <div data-container="runner-kpi-processed"></div>
                    <div data-container="runner-kpi-failure"></div>
                    <div data-container="runner-kpi-active"></div>
                </div>
            `,
            ...options
        });
        this._activeJobs = options.activeJobs || (() => []);
    }

    async onInit() {
        const m = this.model;

        // StatusPanel — function-valued options track current model state.
        this.statusPanel = new StatusPanel({
            containerId: 'runner-status',
            model: m,
            tone:     mm => runnerHealth(mm).tone,
            state:    mm => runnerHealth(mm).label,
            headline: mm => this._headline(mm),
            meta:     mm => this._meta(mm),
            actions:  mm => this._actions(mm)
        });
        this.addChild(this.statusPanel);

        // KPI cards — flat metric-card with optional tone left stripe.
        this.kpiUptime = this._kpi('runner-kpi-uptime', () => 'Uptime',
            mm => this._uptimeText(mm));
        this.kpiProcessed = this._kpi('runner-kpi-processed', () => 'Jobs processed',
            mm => (mm.get('jobs_processed') || 0).toLocaleString(),
            mm => (mm.get('jobs_processed') || 0) > 0 ? 'success' : null);
        this.kpiFailure = this._kpi('runner-kpi-failure', () => 'Failure rate',
            mm => this._failureText(mm),
            mm => this._failureTone(mm));
        this.kpiActive = this._kpi('runner-kpi-active', () => 'Active jobs',
            () => String((this._activeJobs() || []).length),
            () => ((this._activeJobs() || []).length > 0) ? 'info' : null);

        [this.kpiUptime, this.kpiProcessed, this.kpiFailure, this.kpiActive]
            .forEach(c => this.addChild(c));
    }

    // ── StatusPanel narrative resolvers ─────────────────────

    _headline(model) {
        const m = model || this.model;
        const health = runnerHealth(m);
        const uptimeText = this._uptimeText(m);
        const ageSec = heartbeatAgeSec(m.get('last_heartbeat'));
        const heartbeatText = formatHeartbeatAge(ageSec);

        if (health.key === 'down') return `Down · last heartbeat ${heartbeatText}`;
        if (health.key === 'stale') return `${health.label} · last heartbeat ${heartbeatText}`;
        return `Up ${uptimeText} · heartbeat ${heartbeatText}`;
    }

    _meta(model) {
        // Trusted HTML — channels are runner config, escaped before interpolation.
        const m = model || this.model;
        const channels = m.get('channels') || [];
        const processed = m.get('jobs_processed') || 0;
        const failed = m.get('jobs_failed') || 0;

        const channelHtml = channels.length
            ? channels.map(c => `<code>${escapeHtml(String(c))}</code>`).join(', ')
            : '<span class="text-secondary">no channels</span>';

        const counts = `${processed.toLocaleString()} processed${failed > 0 ? ` · ${failed.toLocaleString()} failed` : ''}`;
        return `Channels: ${channelHtml} · ${counts}`;
    }

    _actions(model) {
        const m = model || this.model;
        const health = runnerHealth(m);
        if (health.key === 'down') return [];
        return [
            { label: 'Ping',     action: 'ping',     icon: 'bi-broadcast-pin', variant: 'outline-secondary' },
            { label: 'Drain',    action: 'drain',    icon: 'bi-pause-circle',  variant: 'outline-warning' },
            { label: 'Shutdown', action: 'shutdown', icon: 'bi-power',         variant: 'outline-danger' }
        ];
    }

    _uptimeText(model) {
        const m = model || this.model;
        const startedIso = m.get('started');
        if (!startedIso) return 'unknown';
        const sec = (Date.now() - new Date(startedIso).getTime()) / 1000;
        return sec >= 0 ? formatUptime(sec) : 'unknown';
    }

    _failureText(model) {
        const m = model || this.model;
        const processed = m.get('jobs_processed') || 0;
        const failed = m.get('jobs_failed') || 0;
        if (processed <= 0) return '—';
        return `${((failed / processed) * 100).toFixed(2)}%`;
    }

    _failureTone(model) {
        const m = model || this.model;
        const processed = m.get('jobs_processed') || 0;
        const failed = m.get('jobs_failed') || 0;
        if (processed <= 0) return null;
        const pct = (failed / processed) * 100;
        if (pct >= 5) return 'danger';
        if (pct >= 1) return 'warning';
        return 'success';
    }

    /** Re-resolve KPIs after a model / activeJobs change. */
    setActiveJobs(jobs) {
        // Re-render the section so KPI count updates.
        this._activeJobsCache = jobs;
        this._activeJobs = () => this._activeJobsCache || [];
        if (this.isMounted()) this.render().catch(() => {});
    }

    async refreshFromModel() {
        if (this.isMounted()) await this.render();
    }

    _kpi(containerId, labelFn, valueFn, toneFn = null) {
        const m = this.model;
        const tone = toneFn ? toneFn(m) : null;
        const view = new View({
            containerId,
            model: m,
            className: `metric-card${tone ? ` metric-card-tone-${tone}` : ''}`,
            template: `
                <div class="metric-card-label">{{kpiLabel}}</div>
                <div class="metric-card-value">{{kpiValue}}</div>
            `
        });
        view.kpiLabel = labelFn(m);
        view.kpiValue = valueFn(m);
        return view;
    }

    // ── StatusPanel action proxies ─────────────────────────

    async onActionPing()     { this.emit('action:ping'); }
    async onActionShutdown() { this.emit('action:shutdown'); }
    async onActionDrain()    { this.emit('action:drain'); }
}


// ── System section ─────────────────────────────────────────
//
// Sysinfo dump as flat-row groups (OS / CPU / Memory / Disk / Network)
// plus a KnownFieldsCard for the raw blob. No card wrappers.

class RunnerSystemSection extends View {
    constructor(options = {}) {
        const { sysinfo, sysinfoError, loading, ...rest } = options;
        super({
            className: 'runner-system-section',
            template: `
                <div class="detail-section-eyebrow">
                    <span>{{eyebrowText}}</span>
                    <button class="detail-section-action" data-action="refresh-sysinfo" type="button" title="Refresh sysinfo">
                        <i class="bi bi-arrow-clockwise"></i>
                    </button>
                </div>

                {{#hasError|bool}}
                <div class="alert alert-warning small mb-3">
                    <i class="bi bi-exclamation-triangle me-1"></i>{{errorText}}
                </div>
                {{/hasError|bool}}

                {{#isLoading|bool}}
                <div class="text-secondary small text-center py-4">
                    <span class="spinner-border spinner-border-sm me-1"></span>Loading system info…
                </div>
                {{/isLoading|bool}}

                {{#hasSysinfo|bool}}
                <div class="detail-section-eyebrow">Operating system</div>
                <div class="detail-flat-row"><div class="detail-flat-row-label">Hostname</div><div class="detail-flat-row-value"><code>{{osHostname}}</code></div></div>
                <div class="detail-flat-row"><div class="detail-flat-row-label">System</div><div class="detail-flat-row-value">{{osSystem}}</div></div>
                <div class="detail-flat-row"><div class="detail-flat-row-label">Release</div><div class="detail-flat-row-value"><code>{{osRelease}}</code></div></div>
                <div class="detail-flat-row"><div class="detail-flat-row-label">Machine</div><div class="detail-flat-row-value"><code>{{osMachine}}</code></div></div>
                {{#hasBootTime|bool}}<div class="detail-flat-row"><div class="detail-flat-row-label">Boot time</div><div class="detail-flat-row-value">{{bootTime}}</div></div>{{/hasBootTime|bool}}

                <div class="detail-section-eyebrow">CPU</div>
                <div class="detail-flat-row"><div class="detail-flat-row-label">Load</div><div class="detail-flat-row-value">{{{cpuMeterHtml}}}</div></div>
                <div class="detail-flat-row"><div class="detail-flat-row-label">Cores</div><div class="detail-flat-row-value">{{cpuCount}}</div></div>
                {{#hasCpuFreq|bool}}<div class="detail-flat-row"><div class="detail-flat-row-label">Frequency</div><div class="detail-flat-row-value">{{cpuFreqText}}</div></div>{{/hasCpuFreq|bool}}

                {{#hasMemory|bool}}
                <div class="detail-section-eyebrow">Memory</div>
                <div class="detail-flat-row"><div class="detail-flat-row-label">Usage</div><div class="detail-flat-row-value">{{{memMeterHtml}}}</div></div>
                <div class="detail-flat-row"><div class="detail-flat-row-label">Total</div><div class="detail-flat-row-value"><code>{{memTotal}}</code></div></div>
                <div class="detail-flat-row"><div class="detail-flat-row-label">Used</div><div class="detail-flat-row-value"><code>{{memUsed}}</code></div></div>
                <div class="detail-flat-row"><div class="detail-flat-row-label">Available</div><div class="detail-flat-row-value"><code class="text-success">{{memAvailable}}</code></div></div>
                {{/hasMemory|bool}}

                {{#hasDisk|bool}}
                <div class="detail-section-eyebrow">Disk (root)</div>
                <div class="detail-flat-row"><div class="detail-flat-row-label">Usage</div><div class="detail-flat-row-value">{{{diskMeterHtml}}}</div></div>
                <div class="detail-flat-row"><div class="detail-flat-row-label">Total</div><div class="detail-flat-row-value"><code>{{diskTotal}}</code></div></div>
                <div class="detail-flat-row"><div class="detail-flat-row-label">Used</div><div class="detail-flat-row-value"><code>{{diskUsed}}</code></div></div>
                <div class="detail-flat-row"><div class="detail-flat-row-label">Free</div><div class="detail-flat-row-value"><code class="text-success">{{diskFree}}</code></div></div>
                {{/hasDisk|bool}}

                {{#hasNetwork|bool}}
                <div class="detail-section-eyebrow">Network</div>
                <div class="detail-flat-row"><div class="detail-flat-row-label">Bytes recv</div><div class="detail-flat-row-value"><code>{{netBytesRecv}}</code></div></div>
                <div class="detail-flat-row"><div class="detail-flat-row-label">Bytes sent</div><div class="detail-flat-row-value"><code>{{netBytesSent}}</code></div></div>
                <div class="detail-flat-row"><div class="detail-flat-row-label">Packets in/out</div><div class="detail-flat-row-value"><code>{{netPacketsIn}}</code> / <code>{{netPacketsOut}}</code></div></div>
                <div class="detail-flat-row"><div class="detail-flat-row-label">Errors in/out</div><div class="detail-flat-row-value"><code class="{{netErrClass}}">{{netErrIn}}</code> / <code class="{{netErrClass}}">{{netErrOut}}</code></div></div>
                {{/hasNetwork|bool}}

                <div class="detail-section-eyebrow">Raw sysinfo</div>
                <div data-container="runner-sysinfo-raw"></div>
                {{/hasSysinfo|bool}}

                {{^hasSysinfo|bool}}{{^isLoading|bool}}{{^hasError|bool}}
                <div class="text-secondary small">No system info collected yet.</div>
                {{/hasError|bool}}{{/isLoading|bool}}{{/hasSysinfo|bool}}
            `,
            ...rest
        });
        this.sysinfoFn = sysinfo || (() => null);
        this.errorFn   = sysinfoError || (() => null);
        this.loadingFn = loading || (() => false);
    }

    async onInit() {
        // KnownFieldsCard for the raw sysinfo blob — collapsed by default
        this.rawCard = new KnownFieldsCard({
            containerId: 'runner-sysinfo-raw',
            model: this.model,
            data: () => this.sysinfoFn() || {},
            knownKeys: [],
            rawCollapsed: true,
            rawLabel: 'Raw sysinfo'
        });
        this.addChild(this.rawCard);
    }

    // ── Mustache context getters ───────────────────────────

    get _sysinfo()  { return this.sysinfoFn() || null; }
    get _err()      { return this.errorFn() || null; }
    get isLoading() { return this.loadingFn() === true; }
    get hasError()  { return !!this._err; }
    get hasSysinfo(){ return !!this._sysinfo && !this._err && !this.isLoading; }
    get errorText() { return String(this._err || ''); }

    get eyebrowText() {
        const sys = this._sysinfo;
        return sys?.datetime ? `Collected ${sys.datetime}` : 'System info';
    }

    // OS
    get osHostname() { return (this._sysinfo?.os?.hostname || '—'); }
    get osSystem()   { return (this._sysinfo?.os?.system   || '—'); }
    get osRelease()  { return (this._sysinfo?.os?.release  || '—'); }
    get osMachine()  { return (this._sysinfo?.os?.machine  || '—'); }
    get hasBootTime(){ return !!this._sysinfo?.boot_time; }
    get bootTime()   {
        const t = this._sysinfo?.boot_time;
        return t ? new Date(t * 1000).toLocaleString() : '';
    }

    // CPU
    get cpuPct()   { return this._sysinfo?.cpu_load ?? null; }
    get cpuCount() { return this._sysinfo?.cpu?.count ? String(this._sysinfo.cpu.count) : '—'; }
    get hasCpuFreq() { return !!this._sysinfo?.cpu?.freq; }
    get cpuFreqText() {
        const f = this._sysinfo?.cpu?.freq;
        if (!f) return '';
        return `${Math.round(f.current).toLocaleString()} MHz current · ${Math.round(f.max).toLocaleString()} MHz max`;
    }
    get cpuMeterHtml() {
        return _meterHtml(this.cpuPct);
    }

    // Memory
    get hasMemory() { return !!this._sysinfo?.memory; }
    get memMeterHtml() {
        const mem = this._sysinfo?.memory;
        return _meterHtml(mem?.percent, mem ? `${formatBytes(mem.used)} / ${formatBytes(mem.total)}` : '');
    }
    get memTotal()     { return formatBytes(this._sysinfo?.memory?.total); }
    get memUsed()      { return formatBytes(this._sysinfo?.memory?.used); }
    get memAvailable() { return formatBytes(this._sysinfo?.memory?.available); }

    // Disk
    get hasDisk() { return !!this._sysinfo?.disk; }
    get diskMeterHtml() {
        const d = this._sysinfo?.disk;
        return _meterHtml(d?.percent, d ? `${formatBytes(d.used)} / ${formatBytes(d.total)}` : '');
    }
    get diskTotal() { return formatBytes(this._sysinfo?.disk?.total); }
    get diskUsed()  { return formatBytes(this._sysinfo?.disk?.used); }
    get diskFree()  { return formatBytes(this._sysinfo?.disk?.free); }

    // Network
    get hasNetwork()    { return !!this._sysinfo?.network; }
    get netBytesRecv()  { return formatBytes(this._sysinfo?.network?.bytes_recv); }
    get netBytesSent()  { return formatBytes(this._sysinfo?.network?.bytes_sent); }
    get netPacketsIn()  { return String(this._sysinfo?.network?.packets_recv ?? 0); }
    get netPacketsOut() { return String(this._sysinfo?.network?.packets_sent ?? 0); }
    get netErrIn()      { return String(this._sysinfo?.network?.errin  ?? 0); }
    get netErrOut()     { return String(this._sysinfo?.network?.errout ?? 0); }
    get netErrClass() {
        const n = this._sysinfo?.network;
        return (n && (n.errin > 0 || n.errout > 0)) ? 'text-danger fw-bold' : '';
    }

    async onActionRefreshSysinfo() {
        this.emit('action:refresh-sysinfo');
    }
}

/** Inline progress meter — trusted HTML emitted from a getter. */
function _meterHtml(pct, label = '') {
    if (pct == null) {
        return `
            <div style="width: 100%;">
                <div class="d-flex justify-content-between mb-1">
                    <span class="text-secondary small">${label ? escapeHtml(label) : ''}</span>
                    <span class="text-secondary small">—</span>
                </div>
                <div class="progress" role="progressbar" style="height: 6px;"><div class="progress-bar bg-secondary" style="width: 0%"></div></div>
            </div>
        `;
    }
    const tone = progressBarTone(pct);
    return `
        <div style="width: 100%;">
            <div class="d-flex justify-content-between mb-1">
                <span class="text-secondary small">${label ? escapeHtml(label) : ''}</span>
                <span class="small fw-bold">${pct.toFixed(0)}%</span>
            </div>
            <div class="progress" role="progressbar" style="height: 6px;">
                <div class="progress-bar bg-${tone}" style="width: ${pct.toFixed(0)}%;"></div>
            </div>
        </div>
    `;
}


// ── Channels section ───────────────────────────────────────
//
// Per-channel flat-row group with a count of jobs currently running on
// that channel for this runner. No card wrappers.

class RunnerChannelsSection extends View {
    constructor(options = {}) {
        const { activeJobs, ...rest } = options;
        super({
            className: 'runner-channels-section',
            template: `
                <div class="detail-section-eyebrow">{{channelsEyebrow}}</div>
                {{#hasChannels|bool}}
                {{{channelRowsHtml}}}
                {{/hasChannels|bool}}
                {{^hasChannels|bool}}
                <div class="text-secondary small py-3">
                    This runner serves no channels — it will not receive any jobs.
                </div>
                {{/hasChannels|bool}}
            `,
            ...rest
        });
        this.activeJobsFn = activeJobs || (() => []);
    }

    get _channels() { return this.model.get('channels') || []; }
    get hasChannels() { return this._channels.length > 0; }
    get channelsEyebrow() {
        const n = this._channels.length;
        return `${n} channel${n === 1 ? '' : 's'}`;
    }
    get channelRowsHtml() {
        const active = this.activeJobsFn() || [];
        return this._channels.map(channel => {
            const count = active.filter(j => j.channel === channel).length;
            const tone = count > 0 ? 'info' : 'secondary';
            return `
                <div class="detail-flat-row">
                    <div class="detail-flat-row-label"><i class="bi bi-broadcast me-1"></i>Channel</div>
                    <div class="detail-flat-row-value"><code>${escapeHtml(String(channel))}</code></div>
                    <div class="detail-flat-row-action"><span class="badge text-bg-${tone}">${count} active</span></div>
                </div>
            `;
        }).join('');
    }
}


// ── Actions section ────────────────────────────────────────
//
// Flat layout: control eyebrows + flat-row buttons. No card stacking.

class RunnerActionsSection extends View {
    constructor(options = {}) {
        super({
            className: 'runner-actions-section',
            template: `
                <div class="detail-section-eyebrow">Operates on <code>{{model.runner_id|default:'unknown'}}</code></div>

                <div class="detail-flat-row">
                    <div class="detail-flat-row-label"><i class="bi bi-broadcast-pin me-1"></i>Ping</div>
                    <div class="detail-flat-row-value">
                        <span class="text-secondary small">Verify the runner is responsive — fire-and-forget.</span>
                        {{#pingResult|bool}}<div class="small mt-1">{{{pingResult}}}</div>{{/pingResult|bool}}
                    </div>
                    <div class="detail-flat-row-action">
                        <button class="btn btn-sm btn-outline-success" data-action="ping" type="button">
                            <i class="bi bi-broadcast-pin me-1"></i>Ping now
                        </button>
                    </div>
                </div>

                <div class="detail-flat-row">
                    <div class="detail-flat-row-label"><i class="bi bi-pause-circle me-1"></i>Drain</div>
                    <div class="detail-flat-row-value">
                        <span class="text-secondary small">Stop accepting new jobs; finish in-flight work.</span>
                    </div>
                    <div class="detail-flat-row-action">
                        <button class="btn btn-sm btn-outline-warning" data-action="drain" type="button">
                            <i class="bi bi-pause-circle me-1"></i>Drain
                        </button>
                    </div>
                </div>

                <div class="detail-flat-row">
                    <div class="detail-flat-row-label"><i class="bi bi-arrow-clockwise me-1"></i>Restart</div>
                    <div class="detail-flat-row-value">
                        <span class="text-secondary small">Graceful shutdown then restart on the same host.</span>
                    </div>
                    <div class="detail-flat-row-action">
                        <button class="btn btn-sm btn-outline-primary" data-action="restart" type="button">
                            <i class="bi bi-arrow-clockwise me-1"></i>Restart
                        </button>
                    </div>
                </div>

                <div class="detail-flat-row">
                    <div class="detail-flat-row-label"><i class="bi bi-power me-1"></i>Shutdown</div>
                    <div class="detail-flat-row-value">
                        <span class="text-secondary small">Finish current job then exit. Fire-and-forget.</span>
                    </div>
                    <div class="detail-flat-row-action">
                        <button class="btn btn-sm btn-outline-danger" data-action="shutdown" type="button">
                            <i class="bi bi-power me-1"></i>Shutdown
                        </button>
                    </div>
                </div>

                <div class="detail-flat-row">
                    <div class="detail-flat-row-label"><i class="bi bi-download me-1"></i>Export</div>
                    <div class="detail-flat-row-value">
                        <span class="text-secondary small">Download runner identity data as a JSON file.</span>
                    </div>
                    <div class="detail-flat-row-action">
                        <button class="btn btn-sm btn-outline-secondary" data-action="export" type="button">
                            <i class="bi bi-download me-1"></i>Export
                        </button>
                    </div>
                </div>

                <div class="detail-section-eyebrow">Broadcast command</div>
                <p class="text-secondary small mb-3">
                    Send a command to <strong>all active runners</strong> simultaneously and collect replies within the timeout window.
                </p>
                <div class="row g-2 align-items-end">
                    <div class="col-md-4">
                        <label class="form-label small text-secondary mb-1">Command</label>
                        <select class="form-select form-select-sm" data-field="broadcast-command">
                            <option value="status">status</option>
                            <option value="pause">pause</option>
                            <option value="resume">resume</option>
                            <option value="reload">reload</option>
                            <option value="shutdown">shutdown</option>
                        </select>
                    </div>
                    <div class="col-md-3">
                        <label class="form-label small text-secondary mb-1">Timeout (s)</label>
                        <input type="number" class="form-control form-control-sm" data-field="broadcast-timeout" value="2.0" min="0.5" step="0.5">
                    </div>
                    <div class="col-md-5">
                        <button class="btn btn-primary btn-sm w-100" data-action="broadcast" type="button">
                            <i class="bi bi-megaphone me-1"></i>Broadcast to all runners
                        </button>
                    </div>
                </div>
            `,
            ...options
        });
        this.pingResult = '';
    }

    setPingResult(html) {
        this.pingResult = html || '';
        if (this.isMounted()) this.render().catch(() => {});
    }

    async onActionPing()      { this.emit('action:ping'); }
    async onActionShutdown()  { this.emit('action:shutdown'); }
    async onActionDrain()     { this.emit('action:drain'); }
    async onActionRestart()   { this.emit('action:restart'); }
    async onActionExport()    { this.emit('action:export'); }
    async onActionBroadcast() {
        const cmdEl = this.element?.querySelector('[data-field="broadcast-command"]');
        const tEl   = this.element?.querySelector('[data-field="broadcast-timeout"]');
        const command = cmdEl ? cmdEl.value : 'status';
        const timeout = tEl ? (parseFloat(tEl.value) || 2.0) : 2.0;
        this.emit('action:broadcast', { command, timeout });
    }
}


// ── RunnerDetailsView (assembly) ───────────────────────────

class RunnerDetailsView extends DetailView {
    constructor(options = {}) {
        const model = options.model instanceof JobRunner
            ? options.model
            : new JobRunner(options.model || options.data || {});
        const runnerId = model.get('runner_id');

        // Shared collections
        const activeJobsCollection = new ActiveJobsList({
            runnerId,
            params: { size: 25, sort: '-started_at' }
        });
        const jobHistoryCollection = new JobList({
            params: { runner_id: runnerId, status: 'completed', size: 25, sort: '-created' }
        });
        const logsCollection = new JobLogList({
            params: { runner_id: runnerId, size: 50, sort: '-created' }
        });

        // Section view instances
        const overviewSection = new RunnerOverviewSection({
            model,
            activeJobs: () => activeJobsCollection.models?.map(m => m.attributes || m) || []
        });

        const systemSection = new RunnerSystemSection({
            model,
            sysinfo:      () => model.attributes._sysinfo,
            sysinfoError: () => model.attributes._sysinfoError,
            loading:      () => model.attributes._sysinfoLoading
        });

        const channelsSection = new RunnerChannelsSection({
            model,
            activeJobs: () => activeJobsCollection.models?.map(m => m.attributes || m) || []
        });

        // Active Jobs — TableView over ActiveJobsList
        const activeJobsSection = new TableView({
            collection: activeJobsCollection,
            title: 'Active jobs',
            eyebrow: 'Section · Active jobs',
            showFullscreen: false,
            searchable: false,
            hideActivePillNames: ['runner_id', 'status'],
            clickAction: 'view',
            viewDialogOptions: {
                header: false,
                noBodyPadding: true,
                buttons: []
            },
            columns: [
                {
                    key: 'id', label: 'Job',
                    template: `
                        <div class="fw-semibold font-monospace small">{{model.id|truncate_middle(16)}}</div>
                        <div class="text-secondary small">{{model.func|default:'—'}}</div>
                    `
                },
                { key: 'channel', label: 'Channel', formatter: 'badge', width: '110px' },
                { key: 'started_at', label: 'Started', formatter: 'relative', sortable: true, width: '140px' },
                { key: 'attempt', label: 'Attempt', width: '80px' }
            ]
        });

        // Job History — TableView (recent completed)
        const jobHistorySection = new TableView({
            collection: jobHistoryCollection,
            title: 'Job history',
            eyebrow: 'Section · Recent completed jobs',
            showFullscreen: false,
            searchable: false,
            hideActivePillNames: ['runner_id', 'status'],
            clickAction: 'view',
            viewDialogOptions: {
                header: false,
                noBodyPadding: true,
                buttons: []
            },
            columns: [
                {
                    key: 'id', label: 'Job',
                    template: `
                        <div class="fw-semibold font-monospace small">{{model.id|truncate_middle(16)}}</div>
                        <div class="text-secondary small">{{model.func|default:'—'}}</div>
                    `
                },
                { key: 'channel', label: 'Channel', formatter: 'badge', width: '110px' },
                {
                    key: 'status', label: 'Status', width: '110px',
                    formatter: (value) => {
                        const map = {
                            completed: 'success', failed: 'danger',
                            canceled: 'secondary', cancelled: 'secondary', expired: 'warning'
                        };
                        const tone = map[value] || 'secondary';
                        return `<span class="badge text-bg-${tone}">${MOJOUtils.escapeHtml(String(value || 'unknown').toUpperCase())}</span>`;
                    }
                },
                { key: 'created', label: 'Finished', formatter: 'relative', sortable: true, width: '140px' },
                { key: 'duration_ms', label: 'Duration', formatter: 'duration', width: '110px' }
            ]
        });

        // Logs — TableView over JobLogList filtered by runner_id
        const logsSection = new TableView({
            collection: logsCollection,
            title: 'Logs',
            eyebrow: 'Section · Recent logs from this runner',
            showFullscreen: false,
            searchable: false,
            hideActivePillNames: ['runner_id'],
            columns: [
                { key: 'created', label: 'Timestamp', formatter: 'datetime', sortable: true, width: '180px' },
                { key: 'kind', label: 'Kind', formatter: 'badge', width: '100px' },
                { key: 'job_id', label: 'Job',
                  formatter: (v) => v
                      ? `<code class="small">${MOJOUtils.escapeHtml(String(v).slice(0, 12))}</code>`
                      : '<span class="text-secondary">—</span>',
                  width: '130px' },
                { key: 'message', label: 'Message' }
            ]
        });

        const actionsSection = new RunnerActionsSection({ model });

        const sections = [
            { key: 'Overview',     label: 'Overview',     icon: 'bi-grid-1x2',         view: overviewSection },
            { key: 'System',       label: 'System',       icon: 'bi-cpu',              view: systemSection },
            { key: 'Channels',     label: 'Channels',     icon: 'bi-broadcast',        view: channelsSection },
            { key: 'Active Jobs',  label: 'Active Jobs',  icon: 'bi-hourglass-split',  view: activeJobsSection },
            { type: 'divider', label: 'History' },
            { key: 'Job History',  label: 'Job History',  icon: 'bi-clock-history',    view: jobHistorySection },
            { key: 'Logs',         label: 'Logs',         icon: 'bi-code-square',      view: logsSection },
            { type: 'divider', label: 'Control' },
            { key: 'Actions',      label: 'Actions',      icon: 'bi-power',            view: actionsSection }
        ];

        // Header chips — compact state indicators.
        const chips = [
            { icon: 'bi-broadcast-pin',
              text: m => runnerHealth(m).label,
              variant: m => {
                  const t = runnerHealth(m).tone;
                  return t === 'danger' ? 'danger' : (t === 'warning' ? 'warning' : 'success');
              } },
            { icon: 'bi-tag', text: m => m.get('version') ? `v${m.get('version')}` : null, variant: 'light',
              when: m => !!m.get('version') },
            { icon: 'bi-broadcast', text: m => {
                const ch = m.get('channels') || [];
                return ch.length ? `channels: ${ch.join(' · ')}` : null;
            }, variant: 'info', when: m => (m.get('channels') || []).length > 0 },
            { icon: 'bi-pc-display', text: m => {
                const sys = m.attributes._sysinfo;
                if (!sys?.os) return null;
                return `${sys.os.system || ''}${sys.os.machine ? ` · ${sys.os.machine}` : ''}`.trim() || null;
            }, variant: 'light' }
        ];

        // Chips support `variant` as a function or string — DetailHeaderView
        // only resolves text functions for variant. Pre-evaluate the
        // health-driven variant at construction; the parent re-renders the
        // header on model change so a freshly-evaluated variant takes over.
        if (typeof chips[0].variant === 'function') {
            chips[0].variant = chips[0].variant(model);
        }

        // Context menu — Ping / Broadcast / Drain / Restart / Shutdown / Export
        const contextItems = [
            { label: 'Ping runner',          action: 'ping',                icon: 'bi-broadcast-pin' },
            { label: 'Broadcast command…',   action: 'broadcast-prompt',    icon: 'bi-megaphone' },
            { label: 'Drain mode',           action: 'drain',               icon: 'bi-pause-circle' },
            { label: 'Restart',              action: 'restart',             icon: 'bi-arrow-clockwise' },
            { type: 'divider' },
            { label: 'Shutdown',             action: 'shutdown',            icon: 'bi-power', danger: true },
            { type: 'divider' },
            { label: 'Export snapshot',      action: 'export',              icon: 'bi-download' }
        ];

        super({
            className: 'runner-details-view',
            ...options,
            model,
            header: {
                icon: 'bi-cpu',
                iconToneFn: m => runnerHealth(m).tone,
                titleFn: m => m.get('runner_id') || 'unknown',
                chips,
                // auxFn — state-aware right-gutter readout.
                auxFn: m => _buildHeaderAux(m),
                actions: [], // primary actions live on the StatusPanel; header keeps overflow + close
                contextMenu: { items: contextItems }
            },
            sections,
            activeSection: 'Overview'
        });

        // Stash references for action handlers + cross-section wiring
        this.activeJobsCollection = activeJobsCollection;
        this.jobHistoryCollection = jobHistoryCollection;
        this.logsCollection       = logsCollection;
        this.overviewSection      = overviewSection;
        this.systemSection        = systemSection;
        this.channelsSection      = channelsSection;
        this.activeJobsSection    = activeJobsSection;
        this.jobHistorySection    = jobHistorySection;
        this.logsSection          = logsSection;
        this.actionsSection       = actionsSection;
    }

    async onAfterBuild() {
        // StatusPanel actions (inside Overview) bubble to this view
        this.overviewSection.on('action:ping',     () => this.onActionPing());
        this.overviewSection.on('action:shutdown', () => this.onActionShutdown());
        this.overviewSection.on('action:drain',    () => this.onActionDrain());

        // System section refresh button
        this.systemSection.on('action:refresh-sysinfo', () => this._loadSysinfo({ force: true }));

        // Actions section bubble-up
        this.actionsSection.on('action:ping',      () => this.onActionPing());
        this.actionsSection.on('action:shutdown',  () => this.onActionShutdown());
        this.actionsSection.on('action:drain',     () => this.onActionDrain());
        this.actionsSection.on('action:restart',   () => this.onActionRestart());
        this.actionsSection.on('action:export',    () => this.onActionExport());
        this.actionsSection.on('action:broadcast', ({ command, timeout }) => this.onActionBroadcastWith(command, timeout));

        // Sidebar badges
        this._updateChannelsBadge();
        this._updateActiveJobsBadge();
        this._updateJobHistoryBadge();

        this.activeJobsCollection.on?.('fetch:success', () => {
            this._updateActiveJobsBadge();
            this._refreshOverviewActiveCount();
            // Channel counts depend on active jobs.
            if (this.channelsSection?.isMounted()) this.channelsSection.render().catch(() => {});
        }, this);
        this.jobHistoryCollection.on?.('fetch:success', () => this._updateJobHistoryBadge(), this);

        // Initial fetches — fire-and-forget
        this.activeJobsCollection.fetch().catch(() => {});
        this.jobHistoryCollection.fetch().catch(() => {});
        this.logsCollection.fetch().catch(() => {});

        // Initial sysinfo load
        this._loadSysinfo();

        // Live polling — every 15s refresh sysinfo + active jobs + heartbeat age.
        this._pollHandle = setInterval(() => {
            this._loadSysinfo({ silent: true });
            this.activeJobsCollection.fetch().catch(() => {});
            // Re-resolve the StatusPanel + KPI uptime so the heartbeat age line ticks.
            if (this.overviewSection?.isMounted()) this.overviewSection.refreshFromModel().catch(() => {});
            if (this.headerView?.isMounted()) this.headerView.render().catch(() => {});
        }, 15000);
    }

    _updateActiveJobsBadge() {
        const n = this.activeJobsCollection.totalCount ?? this.activeJobsCollection.models?.length ?? 0;
        this.setBadge?.('Active Jobs', n > 0 ? { text: String(n), variant: 'muted' } : null);
    }

    _updateChannelsBadge() {
        const n = (this.model.get('channels') || []).length;
        this.setBadge?.('Channels', n > 0 ? { text: String(n), variant: 'muted' } : null);
    }

    _updateJobHistoryBadge() {
        const n = this.jobHistoryCollection.totalCount ?? this.jobHistoryCollection.models?.length ?? 0;
        this.setBadge?.('Job History', n > 0 ? { text: String(n), variant: 'muted' } : null);
    }

    _refreshOverviewActiveCount() {
        const jobs = this.activeJobsCollection.models?.map(m => m.attributes || m) || [];
        this.overviewSection.setActiveJobs?.(jobs);
    }

    /** Fetch /api/jobs/runners/sysinfo/<id> and propagate to sections. */
    async _loadSysinfo({ force = false, silent = false } = {}) {
        const m = this.model;
        if (!silent) {
            m.attributes._sysinfoLoading = true;
            m.attributes._sysinfoError = null;
            if (this.systemSection?.isMounted()) this.systemSection.render().catch(() => {});
        }
        try {
            const resp = await this.getApp().rest.GET(
                `/api/jobs/runners/sysinfo/${encodeURIComponent(m.get('runner_id'))}`
            );
            if (resp.success && resp.data) {
                const payload = resp.data.data || resp.data;
                if (payload && payload.status === 'error') {
                    m.attributes._sysinfo = null;
                    m.attributes._sysinfoError = payload.error || 'Runner reported an error collecting sysinfo.';
                } else if (!resp.data.status && !payload?.cpu_load && !payload?.memory) {
                    m.attributes._sysinfo = null;
                    m.attributes._sysinfoError = resp.data.error || 'Could not load system info.';
                } else {
                    const sysinfo = payload.result || payload;
                    m.attributes._sysinfo = sysinfo;
                    m.attributes._sysinfoError = null;
                }
            } else {
                m.attributes._sysinfo = null;
                m.attributes._sysinfoError = 'Could not load system info.';
            }
        } catch (e) {
            m.attributes._sysinfo = null;
            m.attributes._sysinfoError = e.message || 'Request failed.';
        } finally {
            m.attributes._sysinfoLoading = false;
            if (this.systemSection?.isMounted()) this.systemSection.render().catch(() => {});
            if (this.headerView?.isMounted()) this.headerView.render().catch(() => {}); // OS chip
        }
        if (force) {
            this.getApp()?.toast?.info('Sysinfo refreshed');
        }
    }

    // ── Actions ────────────────────────────────────────────

    async onActionPing() {
        try {
            const resp = await this.getApp().rest.POST('/api/jobs/runners/ping', {
                runner_id: this.model.get('runner_id'),
                timeout: 2.0
            });
            let html;
            if (resp.success && resp.data) {
                html = resp.data.responsive
                    ? '<span class="text-success"><i class="bi bi-check-circle-fill me-1"></i>Runner is responsive</span>'
                    : '<span class="text-warning"><i class="bi bi-exclamation-triangle-fill me-1"></i>Runner did not respond within 2s</span>';
            } else {
                html = '<span class="text-danger"><i class="bi bi-x-circle-fill me-1"></i>Ping request failed</span>';
            }
            this.actionsSection.setPingResult(html);
            this.getApp()?.toast?.info('Ping complete');
        } catch (e) {
            this.actionsSection.setPingResult(`<span class="text-danger"><i class="bi bi-x-circle-fill me-1"></i>${escapeHtml(e.message || 'Ping failed')}</span>`);
        }
    }

    async onActionShutdown() {
        const ok = await Modal.confirm(
            `Send a graceful shutdown to <strong class="font-monospace">${escapeHtml(this.model.get('runner_id') || '')}</strong>?`
                + '<br><br>The runner will finish its current job then exit. This is fire-and-forget.',
            'Shutdown Runner',
            { confirmText: 'Shutdown', confirmClass: 'btn-danger' }
        );
        if (!ok) return;

        try {
            const resp = await this.getApp().rest.POST('/api/jobs/runners/shutdown', {
                runner_id: this.model.get('runner_id'),
                graceful: true
            });
            if (resp.success && resp.data && resp.data.status) {
                this.showSuccess?.('Shutdown command sent to runner.');
                this.emit('runner:shutdown', { runner: this.model });
            } else {
                this.showError?.((resp.data && resp.data.error) || 'Shutdown command failed.');
            }
        } catch (e) {
            this.showError?.('Shutdown failed: ' + e.message);
        }
    }

    async onActionDrain() {
        const ok = await Modal.confirm(
            `Place <strong class="font-monospace">${escapeHtml(this.model.get('runner_id') || '')}</strong> in drain mode?`
                + '<br><br>The runner stops accepting new jobs but finishes its current ones.',
            'Drain Mode',
            { confirmText: 'Drain', confirmClass: 'btn-warning' }
        );
        if (!ok) return;
        // Drain is implemented via broadcast `pause` to this runner's channel set,
        // or a future per-runner endpoint. For now we surface it as a no-op toast
        // so the UX is wired and the backend hook is the only blocker.
        this.getApp()?.toast?.info('Drain mode requested (backend integration pending).');
    }

    async onActionRestart() {
        const ok = await Modal.confirm(
            `Restart <strong class="font-monospace">${escapeHtml(this.model.get('runner_id') || '')}</strong>?`
                + '<br><br>The runner will gracefully shut down then relaunch on the same host.',
            'Restart Runner',
            { confirmText: 'Restart', confirmClass: 'btn-primary' }
        );
        if (!ok) return;
        // Restart is a future per-runner endpoint. For now surface it as
        // a no-op toast so the UX is wired and the backend hook is the only blocker.
        this.getApp()?.toast?.info('Restart requested (backend integration pending).');
    }

    /** Context-menu "Broadcast command…" — open a small form */
    async onActionBroadcastPrompt() {
        const result = await Modal.form({
            title: 'Broadcast Command',
            size: 'md',
            fields: [
                {
                    name: 'command', type: 'select', label: 'Command', required: true,
                    options: [
                        { value: 'status',   label: 'Status check' },
                        { value: 'pause',    label: 'Pause processing' },
                        { value: 'resume',   label: 'Resume processing' },
                        { value: 'reload',   label: 'Reload configuration' },
                        { value: 'shutdown', label: 'Shutdown all runners' }
                    ]
                },
                {
                    name: 'timeout', type: 'number', label: 'Timeout (s)',
                    value: 2.0, min: 0.5, step: 0.5
                }
            ],
            submitText: 'Broadcast',
            cancelText: 'Cancel'
        });
        if (!result) return;
        await this.onActionBroadcastWith(result.command, parseFloat(result.timeout) || 2.0);
    }

    /** Shared broadcast path for both the in-section form and the context-menu prompt */
    async onActionBroadcastWith(command, timeout) {
        Modal.showBusy({ message: `Broadcasting "${command}" to all runners…` });
        try {
            const resp = await this.getApp().rest.POST('/api/jobs/runners/broadcast', {
                command, timeout
            });
            Modal.hideBusy();
            if (resp.success && resp.data) {
                await Modal.code({
                    code: JSON.stringify(resp.data, null, 2),
                    language: 'json',
                    title: `Broadcast Response — ${command}`,
                    size: 'lg'
                });
            } else {
                this.showError?.((resp.data && resp.data.error) || 'Broadcast failed.');
            }
        } catch (e) {
            Modal.hideBusy();
            this.showError?.('Broadcast failed: ' + e.message);
        }
    }

    async onActionExport() {
        try {
            const exportData = {
                runner: this.model.toJSON ? this.model.toJSON() : this.model.attributes,
                exported_at: new Date().toISOString()
            };
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = Object.assign(document.createElement('a'), {
                href: url,
                download: `runner-${this.model.get('runner_id')}-${Date.now()}.json`
            });
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            this.showSuccess?.('Runner data exported.');
        } catch (e) {
            this.showError?.('Export failed: ' + e.message);
        }
    }

    /**
     * Stop polling when the view is unmounted (modal closed). The framework
     * calls onUnmount when the parent removes the view — we hook there.
     */
    async onUnmount() {
        if (this._pollHandle) {
            clearInterval(this._pollHandle);
            this._pollHandle = null;
        }
        if (super.onUnmount) await super.onUnmount();
    }

    /**
     * Open this view in a Dialog. Preserved for direct callers
     * (extensions/admin/jobs/JobRunnersPage.js, etc.) — wraps `Modal.detail`.
     */
    static async show(runner, options = {}) {
        const model = runner instanceof JobRunner ? runner : new JobRunner(runner);
        const view = new RunnerDetailsView({ model });
        return await Modal.detail(view, options);
    }
}


// ── Header aux helper ──────────────────────────────────────

/**
 * Aux block right-gutter readout — drives "Up 3d 14h · 0.4% failure",
 * "Stale heartbeat 12m", or "Down" depending on health state.
 *
 * Trusted HTML — caller-controlled fields (runner_id, version) are
 * escaped before interpolation here.
 */
function _buildHeaderAux(m) {
    if (!m) return '';
    const health = runnerHealth(m);
    const startedIso = m.get('started');
    const uptimeSec = startedIso
        ? (Date.now() - new Date(startedIso).getTime()) / 1000
        : null;
    const ageSec = heartbeatAgeSec(m.get('last_heartbeat'));
    const processed = m.get('jobs_processed') || 0;
    const failed = m.get('jobs_failed') || 0;
    const failurePct = processed > 0
        ? `${((failed / processed) * 100).toFixed(2)}%`
        : '0%';

    let main, sub;
    if (health.key === 'down') {
        main = 'Down';
        sub = ageSec != null ? `last heartbeat ${formatHeartbeatAge(ageSec)}` : '';
    } else if (health.key === 'stale') {
        main = health.label;
        sub = ageSec != null ? formatHeartbeatAge(ageSec) : '';
    } else {
        const upText = uptimeSec != null ? `Up ${formatUptimeShort(uptimeSec)}` : 'Up';
        main = `${upText} · ${failurePct} failure`;
        sub = ageSec != null ? `heartbeat ${formatHeartbeatAge(ageSec)}` : '';
    }

    if (!main) return '';

    const dotCls = health.tone && health.tone !== 'default' ? ` dh-aux-dot-${health.tone}` : '';
    return `
        <span class="dh-aux-dot${dotCls}"></span>
        <span class="dh-aux-meta">
            <span>${escapeHtml(main)}</span>
            ${sub ? `<span class="text-secondary small">${escapeHtml(sub)}</span>` : ''}
        </span>
    `;
}

RunnerDetailsView.VIEW_CLASS = RunnerDetailsView;
JobRunner.VIEW_CLASS = RunnerDetailsView;
JobRunner.MODEL_REF = 'jobs.JobRunner';

export default RunnerDetailsView;
export {
    RunnerDetailsView,
    RunnerOverviewSection,
    RunnerSystemSection,
    RunnerChannelsSection,
    RunnerActionsSection
};
