/**
 * RunnerDetailsView - Job-runner inspector built on the DetailView primitive.
 *
 * Header + side-nav layout matching RuleSetView / JobDetailsView. Sections:
 *   Overview · System · Channels · Active Jobs ·
 *   ──History── Job History · Logs ·
 *   ──Control── Actions
 *
 * Overview leads with a StatusPanel hero (Healthy / Stale / Down) and four
 * KPIs (jobs processed / failed / success rate / uptime), then a two-card
 * row: System Resources (CPU / memory / disk progress bars + heartbeat
 * sparkline) and Active Jobs (timeline of up to 3 currently-running jobs).
 *
 * Open via `Modal.detail(new RunnerDetailsView({ model }))` — pair with
 * `viewDialogOptions: { header: false, noBodyPadding: true,
 * buttons: [] }` when wired through TableView. Inherits `size: 'lg'`
 * from `Modal.detail()`'s default.
 */

import View from '@core/View.js';
import DetailView from '@core/views/data/DetailView.js';
import TableView from '@core/views/table/TableView.js';
import Modal from '@core/views/feedback/Modal.js';
import { JobRunner } from '@ext/admin/models/JobRunner.js';
import { JobList } from '@ext/admin/models/Job.js';


// ── Helpers ────────────────────────────────────────────────

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

function formatDuration(seconds) {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m ${Math.round(seconds % 60)}s`;
    return `${Math.round(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`;
}

function formatBytes(bytes) {
    if (bytes == null) return 'N/A';
    if (bytes >= 1e9) return (bytes / 1e9).toFixed(2) + ' GB';
    if (bytes >= 1e6) return (bytes / 1e6).toFixed(2) + ' MB';
    if (bytes >= 1e3) return (bytes / 1e3).toFixed(2) + ' KB';
    return bytes + ' B';
}

function progressBarTone(pct) {
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
 * Resolve a runner's high-level health state. Returns
 * `{ key, label, tone }` where key ∈ healthy | stale | down.
 */
function runnerHealth(runner) {
    const alive = runner.get('alive');
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
            className: 'runner-overview-section p-3',
            ...options
        });
        this.template = () => this._buildTemplate();
    }

    _buildTemplate() {
        return `
            <div data-container="runner-overview-status"></div>
            <div class="detail-kpi-grid">
                <div data-container="runner-kpi-processed"></div>
                <div data-container="runner-kpi-failed"></div>
                <div data-container="runner-kpi-success"></div>
                <div data-container="runner-kpi-uptime"></div>
            </div>
            <div class="detail-pair">
                <div data-container="runner-overview-resources"></div>
                <div data-container="runner-overview-active"></div>
            </div>
        `;
    }

    async onInit() {
        const m = this.model;

        // Status panel (hero)
        this.statusPanel = new RunnerStatusPanel({
            containerId: 'runner-overview-status',
            model: m
        });
        this.statusPanel.on('action:ping',     () => this.emit('action:ping'));
        this.statusPanel.on('action:shutdown', () => this.emit('action:shutdown'));
        this.statusPanel.on('action:drain',    () => this.emit('action:drain'));
        this.addChild(this.statusPanel);

        // KPI cards
        this._refreshKpis();

        // Resources card
        this.resourcesCard = new RunnerResourcesCard({
            containerId: 'runner-overview-resources',
            model: m,
            sysinfo: () => this._sysinfo,
            sysinfoError: () => this._sysinfoError
        });
        this.addChild(this.resourcesCard);

        // Active jobs card (timeline of up to 3)
        this.activeCard = new RunnerActiveJobsCard({
            containerId: 'runner-overview-active',
            model: m,
            jobs: () => this._activeJobs,
            jobsLoading: () => this._activeJobsLoading,
            onViewAll: () => this.emit('navigate', 'Active Jobs')
        });
        this.addChild(this.activeCard);
    }

    _refreshKpis() {
        const m = this.model;
        const processed = m.get('jobs_processed') || 0;
        const failed = m.get('jobs_failed') || 0;
        const successRate = processed > 0
            ? `${(((processed - failed) / processed) * 100).toFixed(1)}`
            : '—';
        const failureRate = processed > 0
            ? `${((failed / processed) * 100).toFixed(2)}%`
            : '0%';

        const startedIso = m.get('started');
        const uptimeSec = startedIso
            ? (Date.now() - new Date(startedIso).getTime()) / 1000
            : null;
        const uptimeText = uptimeSec != null ? formatUptime(uptimeSec) : 'N/A';

        this.kpiProcessed = this._kpi('runner-kpi-processed', 'Jobs processed',
            processed.toLocaleString(), processed > 0 ? 'success' : null);
        this.kpiFailed = this._kpi('runner-kpi-failed', 'Failed',
            `${failed.toLocaleString()} <span class="text-secondary fs-6 fw-normal">${failureRate}</span>`,
            failed > 0 ? 'warning' : null, true);
        this.kpiSuccess = this._kpi('runner-kpi-success', 'Success rate',
            successRate === '—' ? '—' : `${successRate} <span class="text-secondary fs-6 fw-normal">%</span>`,
            successRate !== '—' && parseFloat(successRate) >= 99 ? 'success' : null, true);
        this.kpiUptime = this._kpi('runner-kpi-uptime', 'Uptime', uptimeText);

        [this.kpiProcessed, this.kpiFailed, this.kpiSuccess, this.kpiUptime].forEach(c => this.addChild(c));
    }

    _kpi(containerId, label, value, tone = null, html = false) {
        const escape = (s) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
        const valueHtml = html ? value : escape(String(value));
        return new View({
            containerId,
            className: `metric-card metric-card-lg${tone ? ` metric-card-tone-${tone}` : ''}`,
            template: `
                <div class="metric-card-label">${escape(label)}</div>
                <div class="metric-card-value">${valueHtml}</div>
            `
        });
    }

    /** Called by parent when sysinfo / active-jobs / model change. */
    setSysinfo(sysinfo, error = null) {
        this._sysinfo = sysinfo;
        this._sysinfoError = error;
        if (this.resourcesCard?.isMounted()) this.resourcesCard.render().catch(() => {});
    }

    setActiveJobs(jobs, { loading = false } = {}) {
        this._activeJobs = jobs;
        this._activeJobsLoading = loading;
        if (this.activeCard?.isMounted()) this.activeCard.render().catch(() => {});
    }

    /** Re-render KPIs + StatusPanel after a model refresh. */
    async refreshFromModel() {
        if (this.statusPanel?.isMounted()) await this.statusPanel.render();
        // Rebuild KPI values in place
        const m = this.model;
        const processed = m.get('jobs_processed') || 0;
        const failed = m.get('jobs_failed') || 0;
        const successRate = processed > 0
            ? `${(((processed - failed) / processed) * 100).toFixed(1)}`
            : '—';
        const failureRate = processed > 0
            ? `${((failed / processed) * 100).toFixed(2)}%`
            : '0%';
        const startedIso = m.get('started');
        const uptimeSec = startedIso ? (Date.now() - new Date(startedIso).getTime()) / 1000 : null;
        const uptimeText = uptimeSec != null ? formatUptime(uptimeSec) : 'N/A';

        this.kpiProcessed?.element?.querySelector('.metric-card-value')
            && (this.kpiProcessed.element.querySelector('.metric-card-value').textContent = processed.toLocaleString());
        if (this.kpiFailed?.element) {
            const v = this.kpiFailed.element.querySelector('.metric-card-value');
            if (v) v.innerHTML = `${failed.toLocaleString()} <span class="text-secondary fs-6 fw-normal">${failureRate}</span>`;
        }
        if (this.kpiSuccess?.element) {
            const v = this.kpiSuccess.element.querySelector('.metric-card-value');
            if (v) v.innerHTML = successRate === '—' ? '—' : `${successRate} <span class="text-secondary fs-6 fw-normal">%</span>`;
        }
        if (this.kpiUptime?.element) {
            const v = this.kpiUptime.element.querySelector('.metric-card-value');
            if (v) v.textContent = uptimeText;
        }
    }
}


// ── Status panel (Overview hero) ───────────────────────────

class RunnerStatusPanel extends View {
    constructor(options = {}) {
        super({ ...options });
        this.template = () => this._buildTemplate();
    }

    _buildTemplate() {
        const m = this.model;
        const health = runnerHealth(m);
        const startedIso = m.get('started');
        const uptimeSec = startedIso
            ? (Date.now() - new Date(startedIso).getTime()) / 1000
            : null;
        const uptimeText = uptimeSec != null ? formatUptime(uptimeSec) : 'unknown';
        const ageSec = heartbeatAgeSec(m.get('last_heartbeat'));
        const heartbeatText = formatHeartbeatAge(ageSec);

        const processed = m.get('jobs_processed') || 0;
        const failed = m.get('jobs_failed') || 0;
        const channels = m.get('channels') || [];

        let headline;
        if (health.key === 'down') {
            headline = `Down · last heartbeat ${heartbeatText}`;
        } else if (health.key === 'stale') {
            headline = `${health.label} · last heartbeat ${heartbeatText}`;
        } else {
            headline = `Up ${uptimeText} · ${heartbeatText} since last heartbeat`;
        }

        const channelList = channels.length
            ? channels.map(c => `<code>${this.escapeHtml(c)}</code>`).join(', ')
            : '<span class="text-secondary">no channels</span>';

        const meta = `Channels: ${channelList} · ${processed.toLocaleString()} processed lifetime${failed > 0 ? ` · ${failed.toLocaleString()} failed` : ''}`;

        const actions = [];
        if (health.key !== 'down') {
            actions.push(`<button class="btn btn-outline-secondary btn-sm" data-action="ping"><i class="bi bi-broadcast-pin me-1"></i>Ping</button>`);
            actions.push(`<button class="btn btn-outline-warning btn-sm" data-action="shutdown"><i class="bi bi-power me-1"></i>Shutdown</button>`);
        }

        return `
            <div class="detail-status-panel tone-${health.tone}">
                <div class="detail-status-headline">
                    <div class="detail-status-state"><span class="detail-status-dot"></span>${this.escapeHtml(health.label)}</div>
                    <div class="detail-status-line">${this.escapeHtml(headline)}</div>
                    <div class="detail-status-meta">${meta}</div>
                </div>
                ${actions.length ? `<div class="detail-status-actions">${actions.join('')}</div>` : ''}
            </div>
        `;
    }

    async onActionPing()     { this.emit('action:ping'); }
    async onActionShutdown() { this.emit('action:shutdown'); }
    async onActionDrain()    { this.emit('action:drain'); }
}


// ── Resources card (left of Overview pair) ─────────────────

class RunnerResourcesCard extends View {
    constructor(options = {}) {
        super({ ...options });
        this.sysinfoFn = options.sysinfo || (() => null);
        this.errorFn = options.sysinfoError || (() => null);
        this.template = () => this._buildTemplate();
    }

    _buildTemplate() {
        const m = this.model;
        const sysinfo = this.sysinfoFn();
        const err = this.errorFn();

        const cpuPct = sysinfo?.cpu_load ?? null;
        const memPct = sysinfo?.memory?.percent ?? null;
        const diskPct = sysinfo?.disk?.percent ?? null;

        const heartbeats = sysinfo?._heartbeatSeries || [];
        const ageSec = heartbeatAgeSec(m.get('last_heartbeat'));
        const heartbeatStable = ageSec != null && ageSec < 30;
        const sparklinePoints = this._buildSparklinePoints(heartbeats);

        const startedIso = m.get('started');
        const startedText = startedIso ? new Date(startedIso).toLocaleString() : '—';
        const osText = sysinfo?.os
            ? `${sysinfo.os.system || ''} ${sysinfo.os.release || ''}`.trim() || '—'
            : '—';

        const meterRow = (label, pct, suffix = '') => {
            if (pct == null) {
                return `
                    <div class="small mb-3">
                        <div class="d-flex justify-content-between mb-1"><span class="text-secondary">${this.escapeHtml(label)}</span><span class="text-secondary">—</span></div>
                        <div class="progress" role="progressbar" style="height: 6px;"><div class="progress-bar bg-secondary" style="width: 0%"></div></div>
                    </div>
                `;
            }
            const tone = progressBarTone(pct);
            return `
                <div class="small mb-3">
                    <div class="d-flex justify-content-between mb-1">
                        <span class="text-secondary">${this.escapeHtml(label)}</span>
                        <span>${pct.toFixed(0)}%${suffix ? ` <span class="text-secondary">${suffix}</span>` : ''}</span>
                    </div>
                    <div class="progress" role="progressbar" style="height: 6px;">
                        <div class="progress-bar bg-${tone}" style="width: ${pct.toFixed(0)}%"></div>
                    </div>
                </div>
            `;
        };

        const cpuSuffix = sysinfo?.cpu?.count ? `· ${sysinfo.cpu.count} cores` : '';
        const memSuffix = sysinfo?.memory
            ? `· ${formatBytes(sysinfo.memory.used)} / ${formatBytes(sysinfo.memory.total)}`
            : '';

        const errorBlock = err
            ? `<div class="alert alert-warning small mb-2"><i class="bi bi-exclamation-triangle me-1"></i>${this.escapeHtml(err)}</div>`
            : '';

        const loadingBlock = (!sysinfo && !err)
            ? `<div class="text-secondary small text-center py-2"><span class="spinner-border spinner-border-sm me-1"></span>Loading sysinfo…</div>`
            : '';

        return `
            <div class="card">
                <div class="card-body">
                    <div class="card-title"><i class="bi bi-cpu"></i>System resources</div>
                    ${errorBlock}
                    ${loadingBlock}
                    ${meterRow('CPU', cpuPct, cpuSuffix)}
                    ${meterRow('Memory', memPct, memSuffix)}
                    ${meterRow('Disk', diskPct, '')}
                    <div class="small mb-2">
                        <div class="d-flex justify-content-between mb-1">
                            <span class="text-secondary">Heartbeat (recent)</span>
                            <span class="${heartbeatStable ? 'text-success' : 'text-warning'}">${heartbeatStable ? 'stable' : (ageSec != null ? `${Math.round(ageSec)}s ago` : 'unknown')}</span>
                        </div>
                        <svg viewBox="0 0 200 24" preserveAspectRatio="none" style="width: 100%; height: 24px;">
                            <polyline fill="none" stroke="var(--bs-${heartbeatStable ? 'success' : 'warning'})" stroke-width="1.5"
                                points="${sparklinePoints}"></polyline>
                        </svg>
                    </div>
                    <ul class="list-unstyled mb-0 small">
                        <li class="d-flex justify-content-between border-top border-opacity-25 pt-2"><span class="text-secondary">OS</span><span>${this.escapeHtml(osText)}</span></li>
                        <li class="d-flex justify-content-between border-top border-opacity-25 pt-1"><span class="text-secondary">Started</span><code>${this.escapeHtml(startedText)}</code></li>
                    </ul>
                </div>
            </div>
        `;
    }

    /**
     * Build polyline points from a heartbeat-age history. If we don't have a
     * series yet (no recent fetches), draw a single horizontal line so the
     * sparkline still renders as a visual placeholder.
     */
    _buildSparklinePoints(series) {
        const samples = series.length ? series : [12, 12, 11, 12, 11, 12];
        const max = Math.max(...samples, 12);
        const min = Math.min(...samples, 0);
        const range = Math.max(max - min, 1);
        const w = 200, h = 24;
        const step = samples.length > 1 ? w / (samples.length - 1) : w;
        return samples.map((v, i) => {
            const x = Math.round(i * step);
            const y = Math.round(h - ((v - min) / range) * (h - 4) - 2);
            return `${x},${y}`;
        }).join(' ');
    }
}


// ── Active Jobs card (right of Overview pair) ──────────────

class RunnerActiveJobsCard extends View {
    constructor(options = {}) {
        super({ ...options });
        this.jobsFn = options.jobs || (() => []);
        this.loadingFn = options.jobsLoading || (() => false);
        this.onViewAll = options.onViewAll || (() => {});
        this.template = () => this._buildTemplate();
    }

    _buildTemplate() {
        const jobs = this.jobsFn() || [];
        const loading = this.loadingFn();
        const count = jobs.length;

        if (loading) {
            return `
                <div class="card">
                    <div class="card-body">
                        <div class="card-title"><i class="bi bi-hourglass-split"></i>Active jobs</div>
                        <div class="text-secondary small text-center py-3">
                            <span class="spinner-border spinner-border-sm me-1"></span>Loading…
                        </div>
                    </div>
                </div>
            `;
        }

        if (!count) {
            return `
                <div class="card">
                    <div class="card-body">
                        <div class="card-title"><i class="bi bi-hourglass-split"></i>Active jobs · 0</div>
                        <div class="text-secondary small">No jobs currently executing on this runner.</div>
                    </div>
                </div>
            `;
        }

        const items = jobs.slice(0, 3).map(job => {
            const startedAt = job.started_at ? new Date(job.started_at).getTime() / 1000 : null;
            const runtime = startedAt ? formatDuration((Date.now() / 1000) - startedAt) : '—';
            return `
                <li class="detail-timeline-item tone-info">
                    <div>
                        <div class="detail-timeline-headline"><code>${this.escapeHtml(job.func || 'unknown')}</code></div>
                        <div class="detail-timeline-detail">attempt ${this.escapeHtml(String(job.attempt ?? 1))} · running ${this.escapeHtml(runtime)} · channel <code>${this.escapeHtml(job.channel || '?')}</code></div>
                    </div>
                    <span class="detail-timeline-when">${this.escapeHtml(runtime)}</span>
                </li>
            `;
        }).join('');

        const overflow = count > 3
            ? `<div class="small text-secondary mt-2"><i class="bi bi-info-circle me-1"></i>${count - 3} more · <a href="#" data-action="view-all">view all</a></div>`
            : '';

        return `
            <div class="card">
                <div class="card-body">
                    <div class="card-title"><i class="bi bi-hourglass-split"></i>Active jobs · ${count}</div>
                    <ol class="detail-timeline">${items}</ol>
                    ${overflow}
                </div>
            </div>
        `;
    }

    async onActionViewAll(event) {
        event?.preventDefault?.();
        this.onViewAll();
    }
}


// ── System section ─────────────────────────────────────────
//
// Full sysinfo dump using detail-field-card blocks. Refreshes when the
// parent fetches sysinfo via /api/jobs/runners/sysinfo/<id>.

class RunnerSystemSection extends View {
    constructor(options = {}) {
        super({
            className: 'runner-system-section p-3',
            ...options
        });
        this.sysinfoFn = options.sysinfo || (() => null);
        this.errorFn = options.sysinfoError || (() => null);
        this.loadingFn = options.loading || (() => false);
        this.template = () => this._buildTemplate();
    }

    _buildTemplate() {
        const sysinfo = this.sysinfoFn();
        const err = this.errorFn();
        const loading = this.loadingFn();

        const header = `
            <div class="d-flex justify-content-between align-items-baseline mb-3">
                <div>
                    <div class="text-body-secondary text-uppercase small fw-semibold" style="letter-spacing: 0.05em;">${sysinfo?.datetime ? `Collected ${this.escapeHtml(sysinfo.datetime)}` : 'System info'}</div>
                    <h5 class="mb-0">System</h5>
                </div>
                <button class="btn btn-outline-secondary btn-sm" data-action="refresh-sysinfo"${loading ? ' disabled' : ''}>
                    <i class="bi bi-arrow-clockwise me-1"></i>${loading ? 'Loading…' : 'Refresh'}
                </button>
            </div>
        `;

        if (loading && !sysinfo) {
            return `${header}
                <div class="text-center py-4 text-secondary">
                    <div class="spinner-border text-primary"></div>
                    <div class="mt-2 small">Loading system info…</div>
                </div>
            `;
        }

        if (err) {
            return `${header}
                <div class="alert alert-warning d-flex align-items-start gap-2">
                    <i class="bi bi-exclamation-triangle flex-shrink-0 mt-1"></i>
                    <div>
                        <strong>Could not load system info</strong><br>
                        <span class="small">${this.escapeHtml(err)}</span>
                    </div>
                </div>
            `;
        }

        if (!sysinfo) {
            return `${header}
                <div class="text-secondary small">No system info collected yet.</div>
            `;
        }

        return `${header}
            ${this._osCard(sysinfo)}
            ${this._cpuCard(sysinfo)}
            ${this._memoryCard(sysinfo)}
            ${this._diskCard(sysinfo)}
            ${this._networkCard(sysinfo)}
            ${this._usersCard(sysinfo)}
        `;
    }

    _row(label, valueHtml) {
        return `
            <div class="detail-field-row">
                <div class="detail-field-label">${this.escapeHtml(label)}</div>
                <div class="detail-field-value">${valueHtml}</div>
            </div>
        `;
    }

    _osCard(sysinfo) {
        const os = sysinfo.os || {};
        const bootText = sysinfo.boot_time
            ? new Date(sysinfo.boot_time * 1000).toLocaleString()
            : null;
        const rows = [
            this._row('Hostname', `<code>${this.escapeHtml(os.hostname || '—')}</code>`),
            this._row('System',   this.escapeHtml(os.system || '—')),
            this._row('Release',  `<code>${this.escapeHtml(os.release || '—')}</code>`),
            this._row('Machine',  `<code>${this.escapeHtml(os.machine || '—')}</code>`),
            os.version ? this._row('Version', `<code class="small">${this.escapeHtml(os.version)}</code>`) : '',
            bootText ? this._row('Boot time', this.escapeHtml(bootText)) : ''
        ].filter(Boolean).join('');

        return `
            <div class="detail-field-card">
                <div class="detail-field-card-header"><h4><i class="bi bi-hdd-rack"></i>Operating System</h4></div>
                <div class="detail-field-card-body">${rows}</div>
            </div>
        `;
    }

    _cpuCard(sysinfo) {
        const cpuPct = sysinfo.cpu_load ?? 0;
        const tone = progressBarTone(cpuPct);
        const cpu = sysinfo.cpu || {};
        const freqText = cpu.freq
            ? `${Math.round(cpu.freq.current).toLocaleString()} MHz current · ${Math.round(cpu.freq.max).toLocaleString()} MHz max`
            : null;
        const cores = (sysinfo.cpus_load || []).map((pct, i) => `
            <div class="col-6 col-md-3">
                <div class="border rounded p-2 text-center">
                    <div class="text-secondary small text-uppercase mb-1" style="font-size: 0.65rem;">Core ${i}</div>
                    <div class="fw-bold small">${pct.toFixed(1)}%</div>
                    <div class="progress mt-1" style="height: 4px;">
                        <div class="progress-bar bg-${progressBarTone(pct)}" style="width: ${pct.toFixed(0)}%;"></div>
                    </div>
                </div>
            </div>
        `).join('');

        return `
            <div class="detail-field-card">
                <div class="detail-field-card-header">
                    <h4><i class="bi bi-cpu"></i>CPU</h4>
                    <span class="badge text-bg-${tone}">${cpuPct.toFixed(0)}% overall</span>
                </div>
                <div class="detail-field-card-body">
                    ${this._row('Overall load', `
                        <div>
                            <div class="d-flex justify-content-between mb-1"><span class="small text-secondary">${cpu.count ? `${cpu.count} logical cores` : ''}${freqText ? ` · ${this.escapeHtml(freqText)}` : ''}</span><span class="small fw-bold">${cpuPct.toFixed(0)}%</span></div>
                            <div class="progress" role="progressbar" style="height: 6px;"><div class="progress-bar bg-${tone}" style="width: ${cpuPct.toFixed(0)}%;"></div></div>
                        </div>
                    `)}
                    ${cores ? `<div class="row g-2 mt-2 px-1 pb-1">${cores}</div>` : ''}
                </div>
            </div>
        `;
    }

    _memoryCard(sysinfo) {
        const mem = sysinfo.memory;
        if (!mem) return '';
        const tone = progressBarTone(mem.percent);
        return `
            <div class="detail-field-card">
                <div class="detail-field-card-header">
                    <h4><i class="bi bi-memory"></i>Memory</h4>
                    <span class="badge text-bg-${tone}">${mem.percent}% used</span>
                </div>
                <div class="detail-field-card-body">
                    ${this._row('Usage', `
                        <div>
                            <div class="d-flex justify-content-between mb-1"><span class="small text-secondary">${this.escapeHtml(formatBytes(mem.used))} / ${this.escapeHtml(formatBytes(mem.total))}</span><span class="small fw-bold">${mem.percent}%</span></div>
                            <div class="progress" role="progressbar" style="height: 6px;"><div class="progress-bar bg-${tone}" style="width: ${mem.percent}%;"></div></div>
                        </div>
                    `)}
                    ${this._row('Total',     `<code>${this.escapeHtml(formatBytes(mem.total))}</code>`)}
                    ${this._row('Used',      `<code>${this.escapeHtml(formatBytes(mem.used))}</code>`)}
                    ${this._row('Available', `<code class="text-success">${this.escapeHtml(formatBytes(mem.available))}</code>`)}
                </div>
            </div>
        `;
    }

    _diskCard(sysinfo) {
        const disk = sysinfo.disk;
        if (!disk) return '';
        const tone = progressBarTone(disk.percent);
        return `
            <div class="detail-field-card">
                <div class="detail-field-card-header">
                    <h4><i class="bi bi-hdd"></i>Disk (root)</h4>
                    <span class="badge text-bg-${tone}">${disk.percent}% used</span>
                </div>
                <div class="detail-field-card-body">
                    ${this._row('Usage', `
                        <div>
                            <div class="d-flex justify-content-between mb-1"><span class="small text-secondary">${this.escapeHtml(formatBytes(disk.used))} / ${this.escapeHtml(formatBytes(disk.total))}</span><span class="small fw-bold">${disk.percent}%</span></div>
                            <div class="progress" role="progressbar" style="height: 6px;"><div class="progress-bar bg-${tone}" style="width: ${disk.percent}%;"></div></div>
                        </div>
                    `)}
                    ${this._row('Total', `<code>${this.escapeHtml(formatBytes(disk.total))}</code>`)}
                    ${this._row('Used',  `<code>${this.escapeHtml(formatBytes(disk.used))}</code>`)}
                    ${this._row('Free',  `<code class="text-success">${this.escapeHtml(formatBytes(disk.free))}</code>`)}
                </div>
            </div>
        `;
    }

    _networkCard(sysinfo) {
        const n = sysinfo.network;
        if (!n) return '';
        const errClass  = (n.errin > 0 || n.errout > 0) ? 'text-danger fw-bold' : '';
        const dropClass = (n.dropin > 0 || n.dropout > 0) ? 'text-warning fw-bold' : '';
        return `
            <div class="detail-field-card">
                <div class="detail-field-card-header"><h4><i class="bi bi-diagram-3"></i>Network</h4></div>
                <div class="detail-field-card-body">
                    ${this._row('Bytes received', `<code>${this.escapeHtml(formatBytes(n.bytes_recv))}</code>`)}
                    ${this._row('Bytes sent',     `<code>${this.escapeHtml(formatBytes(n.bytes_sent))}</code>`)}
                    ${this._row('Packets in/out', `<code>${this.escapeHtml(String(n.packets_recv ?? 0))}</code> / <code>${this.escapeHtml(String(n.packets_sent ?? 0))}</code>`)}
                    ${this._row('Errors in/out',  `<code class="${errClass}">${this.escapeHtml(String(n.errin ?? 0))}</code> / <code class="${errClass}">${this.escapeHtml(String(n.errout ?? 0))}</code>`)}
                    ${this._row('Drops in/out',   `<code class="${dropClass}">${this.escapeHtml(String(n.dropin ?? 0))}</code> / <code class="${dropClass}">${this.escapeHtml(String(n.dropout ?? 0))}</code>`)}
                    ${n.tcp_cons != null ? this._row('TCP connections', `<code>${this.escapeHtml(String(n.tcp_cons))}</code>`) : ''}
                </div>
            </div>
        `;
    }

    _usersCard(sysinfo) {
        const users = sysinfo.users || [];
        if (!users.length) {
            return `
                <div class="detail-field-card">
                    <div class="detail-field-card-header"><h4><i class="bi bi-person-badge"></i>Logged-in users</h4></div>
                    <div class="detail-field-card-body">
                        <div class="text-secondary small py-2">No users currently logged in.</div>
                    </div>
                </div>
            `;
        }
        const rows = users.map(u => this._row(
            u.name || 'unknown',
            u.terminal ? `<code class="text-secondary">${this.escapeHtml(u.terminal)}</code>` : '<span class="text-secondary">—</span>'
        )).join('');
        return `
            <div class="detail-field-card">
                <div class="detail-field-card-header"><h4><i class="bi bi-person-badge"></i>Logged-in users</h4></div>
                <div class="detail-field-card-body">${rows}</div>
            </div>
        `;
    }

    async onActionRefreshSysinfo() {
        this.emit('action:refresh-sysinfo');
    }
}


// ── Channels section ───────────────────────────────────────
//
// Renders a detail-field-card per channel served by this runner. Pulls
// queue depth from the parent's active-jobs list as a best-effort hint.

class RunnerChannelsSection extends View {
    constructor(options = {}) {
        super({
            className: 'runner-channels-section p-3',
            ...options
        });
        this.activeJobsFn = options.activeJobs || (() => []);
        this.template = () => this._buildTemplate();
    }

    _buildTemplate() {
        const m = this.model;
        const channels = m.get('channels') || [];
        const activeJobs = this.activeJobsFn() || [];

        const header = `
            <div class="d-flex justify-content-between align-items-baseline mb-3">
                <div>
                    <div class="text-body-secondary text-uppercase small fw-semibold" style="letter-spacing: 0.05em;">${channels.length} channel${channels.length === 1 ? '' : 's'}</div>
                    <h5 class="mb-0">Channels</h5>
                </div>
            </div>
        `;

        if (!channels.length) {
            return `${header}
                <div class="text-center text-secondary py-4 border rounded">
                    <i class="bi bi-broadcast fs-1 d-block mb-2"></i>
                    <p class="mb-0 small">This runner serves no channels — it will not receive any jobs.</p>
                </div>
            `;
        }

        const cards = channels.map(channel => {
            const activeOnChannel = activeJobs.filter(j => j.channel === channel).length;
            return `
                <div class="detail-field-card">
                    <div class="detail-field-card-header">
                        <h4><i class="bi bi-broadcast"></i><code>${this.escapeHtml(channel)}</code></h4>
                        <span class="badge text-bg-${activeOnChannel > 0 ? 'info' : 'secondary'}">${activeOnChannel} active</span>
                    </div>
                    <div class="detail-field-card-body">
                        <div class="detail-field-row">
                            <div class="detail-field-label">Channel</div>
                            <div class="detail-field-value"><code>${this.escapeHtml(channel)}</code></div>
                        </div>
                        <div class="detail-field-row">
                            <div class="detail-field-label">Active on this runner</div>
                            <div class="detail-field-value">${activeOnChannel}</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        return `${header}${cards}`;
    }
}


// ── Active Jobs section ────────────────────────────────────
//
// Direct-fetch table (the legacy API surface uses POST /api/jobs/job?...)
// — we match the original behaviour rather than re-routing through a
// Collection so cancel-job stays inline.

class RunnerActiveJobsSection extends View {
    constructor(options = {}) {
        super({
            className: 'runner-active-jobs-section p-3',
            ...options
        });
        this.jobs = [];
        this.loading = false;
        this.loaded = false;
        this.template = () => this._buildTemplate();
    }

    _buildTemplate() {
        return `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <div>
                    <div class="text-body-secondary text-uppercase small fw-semibold" style="letter-spacing: 0.05em;">${this.jobs.length} job${this.jobs.length === 1 ? '' : 's'} executing</div>
                    <h5 class="mb-0">Active jobs</h5>
                </div>
                <button class="btn btn-sm btn-outline-secondary" data-action="refresh-jobs"${this.loading ? ' disabled' : ''}>
                    <i class="bi bi-arrow-clockwise me-1"></i>${this.loading ? 'Loading…' : 'Refresh'}
                </button>
            </div>
            ${this._tableHtml()}
        `;
    }

    _tableHtml() {
        if (this.loading && !this.jobs.length) {
            return `
                <div class="text-center py-4 text-secondary">
                    <div class="spinner-border text-primary"></div>
                    <div class="mt-2 small">Loading running jobs…</div>
                </div>
            `;
        }

        if (!this.jobs.length) {
            return `
                <div class="text-center text-secondary py-5 border rounded">
                    <i class="bi bi-list-task fs-2 d-block mb-2"></i>
                    <div class="small">No jobs currently executing on this runner.</div>
                </div>
            `;
        }

        const rows = this.jobs.map(j => {
            const startedSec = j.started_at ? new Date(j.started_at).getTime() / 1000 : null;
            const runtime = startedSec ? formatDuration((Date.now() / 1000) - startedSec) : '—';
            const startedText = j.started_at ? new Date(j.started_at).toLocaleTimeString() : '—';
            const attemptTone = j.attempt > 1 ? 'danger' : 'warning';
            return `
                <tr>
                    <td class="ps-3"><span class="font-monospace text-primary small" title="${this.escapeHtml(j.id || '')}">${this.escapeHtml((j.id || '').slice(0, 12))}</span></td>
                    <td><span class="font-monospace text-secondary small">${this.escapeHtml((j.func || '').slice(0, 42))}</span></td>
                    <td><span class="badge text-bg-info">${this.escapeHtml(j.channel || '?')}</span></td>
                    <td><small class="text-secondary">${this.escapeHtml(startedText)}</small></td>
                    <td><span class="badge text-bg-light">${this.escapeHtml(runtime)}</span></td>
                    <td><span class="badge text-bg-${attemptTone}">${this.escapeHtml(String(j.attempt ?? 1))}</span></td>
                    <td class="text-end pe-3">
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-primary btn-sm" data-action="view-job" data-job-id="${this.escapeHtml(j.id || '')}" title="View job details"><i class="bi bi-eye"></i></button>
                            <button class="btn btn-outline-warning btn-sm" data-action="cancel-job" data-job-id="${this.escapeHtml(j.id || '')}" title="Cancel job"><i class="bi bi-x-circle"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        return `
            <div class="table-responsive border rounded">
                <table class="table table-sm table-hover align-middle mb-0">
                    <thead class="table-light">
                        <tr>
                            <th class="ps-3 border-0 small text-secondary text-uppercase">Job ID</th>
                            <th class="border-0 small text-secondary text-uppercase">Function</th>
                            <th class="border-0 small text-secondary text-uppercase">Channel</th>
                            <th class="border-0 small text-secondary text-uppercase">Started</th>
                            <th class="border-0 small text-secondary text-uppercase">Duration</th>
                            <th class="border-0 small text-secondary text-uppercase">Attempt</th>
                            <th class="border-0 small text-end pe-3 text-secondary text-uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
    }

    async ensureLoaded() {
        if (this.loaded) return;
        await this.loadJobs();
    }

    async loadJobs() {
        this.loading = true;
        if (this.isMounted()) await this.render();
        try {
            const resp = await this.getApp().rest.GET(
                `/api/jobs/job?runner_id=${encodeURIComponent(this.model.get('runner_id'))}&status=running&size=50`
            );
            if (resp.success && resp.data && resp.data.status) {
                this.jobs = resp.data.data || [];
            } else {
                this.jobs = [];
            }
            this.loaded = true;
        } catch (e) {
            this.jobs = [];
            this.showError('Could not load running jobs: ' + e.message);
        } finally {
            this.loading = false;
            if (this.isMounted()) await this.render();
            this.emit('jobs:updated', this.jobs);
        }
    }

    async onActionRefreshJobs() {
        await this.loadJobs();
    }

    async onActionViewJob(event, element) {
        const jobId = element.dataset.jobId;
        this.emit('job:view', { jobId, runner: this.model });
    }

    async onActionCancelJob(event, element) {
        const jobId = element.dataset.jobId;
        const ok = await Modal.confirm(
            'Cancel this job? The runner will receive a cooperative cancel signal.',
            'Cancel Job',
            { confirmText: 'Cancel Job', confirmClass: 'btn-warning' }
        );
        if (!ok) return;

        try {
            const resp = await this.getApp().rest.POST(
                `/api/jobs/job/${jobId}`, { cancel_request: true }
            );
            if (resp.success && resp.data && resp.data.status) {
                this.showSuccess('Cancel signal sent.');
                await this.loadJobs();
            } else {
                this.showError((resp.data && resp.data.error) || 'Could not cancel job.');
            }
        } catch (e) {
            this.showError('Could not cancel job: ' + e.message);
        }
    }
}


// ── Logs section ───────────────────────────────────────────
//
// Aggregated logs across this runner's currently-running jobs, with a
// kind filter (all / debug / info / warn / error). Preserves the legacy
// fetch path: /api/jobs/job?runner_id=&status=running, then per-job logs
// from /api/jobs/logs?job_id=… in parallel (capped at 5 jobs).

class RunnerLogsSection extends View {
    constructor(options = {}) {
        super({
            className: 'runner-logs-section p-3',
            ...options
        });
        this.logs = [];
        this.logFilter = 'all';
        this.loading = false;
        this.loaded = false;
        this.template = () => this._buildTemplate();
    }

    _buildTemplate() {
        const filtered = this.logFilter === 'all'
            ? this.logs
            : this.logs.filter(l => l.kind === this.logFilter);

        const filterBtn = (kind, label, activeClass) => {
            const isActive = this.logFilter === kind;
            return `<button class="btn btn-sm ${isActive ? activeClass : 'btn-outline-secondary'}" data-action="filter-logs" data-kind="${kind}">${this.escapeHtml(label)}</button>`;
        };

        const header = `
            <div class="d-flex justify-content-between align-items-baseline mb-3">
                <div>
                    <div class="text-body-secondary text-uppercase small fw-semibold" style="letter-spacing: 0.05em;">${filtered.length} ${filtered.length === 1 ? 'entry' : 'entries'}${this.logFilter !== 'all' ? ` (filter: ${this.escapeHtml(this.logFilter)})` : ''}</div>
                    <h5 class="mb-0">Logs</h5>
                </div>
                <button class="btn btn-sm btn-outline-secondary" data-action="refresh-logs"${this.loading ? ' disabled' : ''}>
                    <i class="bi bi-arrow-clockwise me-1"></i>${this.loading ? 'Loading…' : 'Refresh'}
                </button>
            </div>
            <div class="d-flex flex-wrap gap-1 mb-3">
                ${filterBtn('all', 'All', 'btn-primary')}
                ${filterBtn('debug', 'Debug', 'btn-secondary')}
                ${filterBtn('info', 'Info', 'btn-primary')}
                ${filterBtn('warn', 'Warning', 'btn-warning')}
                ${filterBtn('error', 'Error', 'btn-danger')}
            </div>
        `;

        if (this.loading && !this.logs.length) {
            return `${header}
                <div class="text-center py-4 text-secondary">
                    <div class="spinner-border text-primary"></div>
                    <div class="mt-2 small">Loading logs…</div>
                </div>
            `;
        }

        if (!filtered.length) {
            return `${header}
                <div class="text-center text-secondary py-5 border rounded">
                    <i class="bi bi-journal fs-2 d-block mb-2"></i>
                    <div class="small">No log entries${this.logFilter !== 'all' ? ` at level ${this.escapeHtml(this.logFilter)}` : ''}.</div>
                </div>
            `;
        }

        const lines = filtered.map(log => {
            const tone = this._levelTone(log.kind);
            const timeText = log.created ? new Date(log.created).toLocaleTimeString() : '—';
            return `
                <div class="d-flex align-items-start gap-2 px-3 py-2 border-bottom font-monospace" style="font-size: 0.78rem;">
                    <span class="text-secondary flex-shrink-0 pt-1" style="min-width: 70px;">${this.escapeHtml(timeText)}</span>
                    <span class="badge text-bg-${tone} flex-shrink-0" style="margin-top: 1px;">${this.escapeHtml((log.kind || 'info').toUpperCase())}</span>
                    <span class="flex-grow-1 text-break">${this.escapeHtml(log.message || '')}</span>
                </div>
            `;
        }).join('');

        return `${header}
            <div class="border rounded" style="max-height: 480px; overflow-y: auto;">
                ${lines}
            </div>
        `;
    }

    _levelTone(kind) {
        const map = { debug: 'secondary', info: 'primary', warn: 'warning', error: 'danger' };
        return map[kind] || 'secondary';
    }

    async ensureLoaded() {
        if (this.loaded) return;
        await this.loadLogs();
    }

    async loadLogs() {
        this.loading = true;
        if (this.isMounted()) await this.render();
        try {
            const jobsResp = await this.getApp().rest.GET(
                `/api/jobs/job?runner_id=${encodeURIComponent(this.model.get('runner_id'))}&status=running&size=50`
            );
            const jobIds = (jobsResp.success && jobsResp.data && jobsResp.data.status)
                ? (jobsResp.data.data || []).map(j => j.id)
                : [];

            if (!jobIds.length) {
                this.logs = [];
                this.loaded = true;
                return;
            }

            const promises = jobIds.slice(0, 5).map(id =>
                this.getApp().rest.GET(`/api/jobs/logs?job_id=${encodeURIComponent(id)}&sort=-created&size=20`)
                    .then(r => (r.success && r.data && r.data.status) ? (r.data.data || []) : [])
                    .catch(() => [])
            );
            const results = await Promise.all(promises);
            const all = [].concat(...results);
            all.sort((a, b) => new Date(b.created) - new Date(a.created));
            this.logs = all.slice(0, 50);
            this.loaded = true;
        } catch (e) {
            this.logs = [];
            this.showError('Could not load logs: ' + e.message);
        } finally {
            this.loading = false;
            if (this.isMounted()) await this.render();
        }
    }

    async onActionFilterLogs(event, element) {
        this.logFilter = element.dataset.kind || 'all';
        if (this.isMounted()) await this.render();
    }

    async onActionRefreshLogs() {
        await this.loadLogs();
    }
}


// ── Actions section ────────────────────────────────────────
//
// Dedicated control panel: ping, shutdown, drain, broadcast, export.

class RunnerActionsSection extends View {
    constructor(options = {}) {
        super({
            className: 'runner-actions-section p-3',
            ...options
        });
        this.pingResult = null;
        this.template = () => this._buildTemplate();
    }

    _buildTemplate() {
        const runnerId = this.model.get('runner_id');
        return `
            <div class="d-flex justify-content-between align-items-baseline mb-3">
                <div>
                    <div class="text-body-secondary text-uppercase small fw-semibold" style="letter-spacing: 0.05em;">Operates on <code>${this.escapeHtml(runnerId || '')}</code></div>
                    <h5 class="mb-0">Control</h5>
                </div>
            </div>

            <div class="row g-3 mb-4">
                ${this._actionCard('Ping runner', 'Verify this runner is truly responsive, not just alive on paper.', 'bi-broadcast-pin', 'success', `
                    ${this.pingResult ? `<div class="small mb-2">${this.pingResult}</div>` : ''}
                    <button class="btn btn-sm btn-outline-success mt-auto" data-action="ping"><i class="bi bi-broadcast-pin me-1"></i>Ping now</button>
                `)}
                ${this._actionCard('Graceful shutdown', 'Runner finishes its current job then exits. Fire-and-forget.', 'bi-power', 'danger', `
                    <button class="btn btn-sm btn-outline-danger mt-auto" data-action="shutdown"><i class="bi bi-power me-1"></i>Shutdown</button>
                `)}
                ${this._actionCard('Export snapshot', 'Download runner identity data as a JSON file.', 'bi-download', 'secondary', `
                    <button class="btn btn-sm btn-outline-secondary mt-auto" data-action="export"><i class="bi bi-download me-1"></i>Export JSON</button>
                `)}
            </div>

            <div class="d-flex align-items-center gap-2 mb-3">
                <span class="text-secondary small fw-semibold text-uppercase" style="letter-spacing: 0.09em; white-space: nowrap;">Broadcast command</span>
                <hr class="flex-grow-1 my-0">
            </div>

            <div class="card">
                <div class="card-body">
                    <p class="text-secondary small mb-3">
                        Send a command to <strong>all active runners</strong> simultaneously and collect replies within the timeout window.
                    </p>
                    <div class="row g-2 align-items-end">
                        <div class="col-md-4">
                            <label class="form-label fw-semibold small text-secondary mb-1">Command</label>
                            <select class="form-select form-select-sm" data-field="broadcast-command">
                                <option value="status">status</option>
                                <option value="pause">pause</option>
                                <option value="resume">resume</option>
                                <option value="reload">reload</option>
                                <option value="shutdown">shutdown</option>
                            </select>
                        </div>
                        <div class="col-md-3">
                            <label class="form-label fw-semibold small text-secondary mb-1">Timeout (s)</label>
                            <input type="number" class="form-control form-control-sm" data-field="broadcast-timeout" value="2.0" min="0.5" step="0.5">
                        </div>
                        <div class="col-md-5">
                            <button class="btn btn-primary btn-sm w-100" data-action="broadcast"><i class="bi bi-megaphone me-1"></i>Broadcast to all runners</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    _actionCard(title, body, icon, tone, footerHtml) {
        return `
            <div class="col-md-4">
                <div class="card h-100">
                    <div class="card-body d-flex flex-column gap-3">
                        <div class="d-flex gap-3 align-items-start">
                            <div class="d-flex align-items-center justify-content-center rounded bg-${tone}-subtle text-${tone} flex-shrink-0" style="width: 40px; height: 40px; font-size: 1.1rem;">
                                <i class="bi ${icon}"></i>
                            </div>
                            <div>
                                <div class="fw-semibold mb-1">${this.escapeHtml(title)}</div>
                                <div class="text-secondary small">${this.escapeHtml(body)}</div>
                            </div>
                        </div>
                        ${footerHtml}
                    </div>
                </div>
            </div>
        `;
    }

    setPingResult(html) {
        this.pingResult = html;
        if (this.isMounted()) this.render().catch(() => {});
    }

    async onActionPing()      { this.emit('action:ping'); }
    async onActionShutdown()  { this.emit('action:shutdown'); }
    async onActionExport()    { this.emit('action:export'); }
    async onActionBroadcast() {
        const commandEl = this.element?.querySelector('[data-field="broadcast-command"]');
        const timeoutEl = this.element?.querySelector('[data-field="broadcast-timeout"]');
        const command = commandEl ? commandEl.value : 'status';
        const timeout = timeoutEl ? (parseFloat(timeoutEl.value) || 2.0) : 2.0;
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

        // Shared collections — fire-and-forget initial fetch in onAfterBuild
        const jobHistoryCollection = new JobList({
            params: { runner_id: runnerId, status: 'completed', size: 25, sort: '-created' }
        });

        // Section view instances
        const overviewSection      = new RunnerOverviewSection({ model });
        const systemSection        = new RunnerSystemSection({
            model,
            sysinfo: () => model.attributes._sysinfo,
            sysinfoError: () => model.attributes._sysinfoError,
            loading: () => model.attributes._sysinfoLoading
        });
        const channelsSection      = new RunnerChannelsSection({
            model,
            activeJobs: () => model.attributes._activeJobs || []
        });
        const activeJobsSection    = new RunnerActiveJobsSection({ model });
        const jobHistorySection    = new TableView({
            collection: jobHistoryCollection,
            title: 'Job history',
            eyebrow: 'Recent completed jobs by this runner',
            showFullscreen: false,
            searchable: false,
            hideActivePillNames: ['runner_id', 'status'],
            columns: [
                {
                    key: 'id', label: 'Job',
                    template: `
                        <div class="fw-semibold font-monospace small">{{model.id|truncate_middle(16)}}</div>
                        <div class="text-secondary small">{{model.func}}</div>
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
                        return `<span class="badge text-bg-${tone}">${(value || 'unknown').toUpperCase()}</span>`;
                    }
                },
                { key: 'created', label: 'Finished', formatter: 'relative', sortable: true, width: '140px' },
                { key: 'duration_ms', label: 'Duration', formatter: 'duration', width: '110px' }
            ]
        });
        const logsSection          = new RunnerLogsSection({ model });
        const actionsSection       = new RunnerActionsSection({ model });

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

        // Header: tone the dh-icon by health, plus a pulse dot when alive.
        // The tone is driven by the new iconToneFn primitive; the pulse dot
        // is appended in onAfterBuild since it's a runner-specific embellishment.
        const health = runnerHealth(model);

        const chips = [
            { icon: 'bi-broadcast-pin', text: m => {
                const h = runnerHealth(m);
                return h.label;
            }, variant: m => {
                const h = runnerHealth(m);
                return h.tone === 'danger' ? 'danger' : (h.tone === 'warning' ? 'warning' : 'success');
            } },
            { icon: 'bi-tag', text: m => m.get('version') ? `v${m.get('version')}` : null, variant: 'light',
              when: m => !!m.get('version') },
            { icon: 'bi-broadcast', text: m => {
                const ch = m.get('channels') || [];
                return ch.length ? `channels: ${ch.join(' · ')}` : null;
            }, variant: 'info', when: m => (m.get('channels') || []).length > 0 },
            { icon: 'bi-hourglass-split', text: m => {
                const n = (m.attributes._activeJobs || []).length;
                return n > 0 ? `${n} active` : null;
            }, variant: 'light' },
            { icon: 'bi-pc-display', text: m => {
                const sys = m.attributes._sysinfo;
                if (!sys?.os) return null;
                return `${sys.os.system || ''}${sys.os.machine ? ` · ${sys.os.machine}` : ''}`.trim() || null;
            }, variant: 'light' }
        ];

        // Chips support `variant` as a function or string — but DetailHeaderView
        // only resolves text functions. We pre-evaluate variant at render-time
        // by patching the chip definitions at construction time (the parent
        // view will re-render the header on model change). Simpler approach:
        // freeze each chip's variant from the *initial* health for the first
        // paint, and refresh the entire header on health change in onAfterBuild.
        chips[0].variant = chips[0].variant(model); // collapse to a string up front

        // Context menu — Ping / Broadcast / Drain / Shutdown / Export
        const contextItems = [
            { label: 'Ping runner',          action: 'ping',                icon: 'bi-broadcast-pin' },
            { label: 'Broadcast command…',   action: 'broadcast-prompt',    icon: 'bi-megaphone' },
            { label: 'Drain mode',           action: 'drain',               icon: 'bi-pause-circle' },
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
                subtitlePath: '_subtitle',
                chips,
                actions: [
                    { label: 'Ping',     icon: 'bi-broadcast-pin', action: 'ping',     title: 'Ping runner' },
                    { label: 'Shutdown', icon: 'bi-power',         action: 'shutdown', title: 'Graceful shutdown' }
                ],
                contextMenu: { items: contextItems }
            },
            sections,
            activeSection: 'Overview'
        });

        // Stash references for action handlers + cross-section wiring
        this.jobHistoryCollection = jobHistoryCollection;
        this.overviewSection      = overviewSection;
        this.systemSection        = systemSection;
        this.channelsSection      = channelsSection;
        this.activeJobsSection    = activeJobsSection;
        this.jobHistorySection    = jobHistorySection;
        this.logsSection          = logsSection;
        this.actionsSection       = actionsSection;

        this._healthKey = health.key;

        // Pre-compute synthetic subtitle the header reads via subtitlePath
        this._refreshComputedFields();
    }

    async onAfterBuild() {
        // Patch dh-icon with health-tinted background + pulse dot (mockup precedent)
        this._applyHeaderIconAccent();

        // StatusPanel actions (inside Overview) bubble to this view
        this.overviewSection.on('action:ping',     () => this.onActionPing());
        this.overviewSection.on('action:shutdown', () => this.onActionShutdown());
        this.overviewSection.on('action:drain',    () => this.onActionDrain());

        // Cross-section navigate
        const navHandler = (key) => this.showSection(key);
        this.overviewSection.on('navigate', navHandler);

        // System section refresh button
        this.systemSection.on('action:refresh-sysinfo', () => this._loadSysinfo({ force: true }));

        // Active Jobs section emits "job:view" / "jobs:updated"
        this.activeJobsSection.on('jobs:updated', (jobs) => {
            this.model.attributes._activeJobs = jobs;
            this.overviewSection.setActiveJobs(jobs);
            this._refreshHeaderForActiveJobsChange();
            // Re-render channels so per-channel "active" counts update
            if (this.channelsSection?.isMounted()) this.channelsSection.render().catch(() => {});
        });
        this.activeJobsSection.on('job:view', (payload) => this.emit('job:view', payload));

        // Actions section bubble-up
        this.actionsSection.on('action:ping',      () => this.onActionPing());
        this.actionsSection.on('action:shutdown',  () => this.onActionShutdown());
        this.actionsSection.on('action:export',    () => this.onActionExport());
        this.actionsSection.on('action:broadcast', ({ command, timeout }) => this.onActionBroadcastWith(command, timeout));

        // Sidebar badges
        this._updateActiveJobsBadge();
        this._updateJobHistoryBadge();

        this.jobHistoryCollection.on('fetch:success', () => this._updateJobHistoryBadge(), this);
        this.jobHistoryCollection.fetch().catch(() => { /* fail silent */ });

        // Initial sysinfo + active jobs fetch
        this._loadSysinfo();
        this.activeJobsSection.loadJobs().catch(() => {});

        // Live polling — every 15s refresh sysinfo + active jobs + heartbeat age.
        // Stored on the view so we can clear it during teardown.
        this._pollHandle = setInterval(() => {
            this._loadSysinfo({ silent: true });
            this.activeJobsSection.loadJobs().catch(() => {});
            // Re-render the StatusPanel + KPI uptime so the heartbeat age line ticks
            if (this.overviewSection?.isMounted()) this.overviewSection.refreshFromModel().catch(() => {});
        }, 15000);
    }

    /**
     * Append a pulse dot to the dh-icon when the runner is healthy.
     * (The icon's tone+background is handled by the iconToneFn primitive;
     * the pulse dot is a runner-specific embellishment that needs DOM access.)
     */
    _applyHeaderIconAccent() {
        const iconEl = this.headerView?.element?.querySelector('.dh-icon');
        if (!iconEl) return;
        iconEl.style.position = 'relative';
        const existing = iconEl.querySelector('.runner-pulse-dot');
        if (this._healthKey === 'healthy') {
            if (!existing) {
                const dot = document.createElement('span');
                dot.className = 'runner-pulse-dot';
                dot.setAttribute('style',
                    'position: absolute; top: 4px; right: 4px; width: 8px; height: 8px; ' +
                    'background: var(--bs-success); border-radius: 999px; ' +
                    'box-shadow: 0 0 8px var(--bs-success); animation: mojo-pulse 2s infinite;'
                );
                iconEl.appendChild(dot);
            }
        } else if (existing) {
            existing.remove();
        }
    }

    _refreshComputedFields() {
        const m = this.model;
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

        const parts = [];
        if (uptimeSec != null) parts.push(`Up ${formatUptimeShort(uptimeSec)}`);
        parts.push(`processed ${processed.toLocaleString()} jobs`);
        parts.push(`${failurePct} failure`);
        if (ageSec != null) parts.push(`heartbeat ${formatHeartbeatAge(ageSec)}`);

        m.attributes._subtitle = parts.join(' · ');
    }

    _updateActiveJobsBadge() {
        const n = (this.model.attributes._activeJobs || []).length;
        this.setBadge('Active Jobs', n > 0 ? { text: String(n), variant: 'muted' } : null);
        this.setBadge('Channels', (this.model.get('channels') || []).length > 0
            ? { text: String((this.model.get('channels') || []).length), variant: 'muted' }
            : null);
    }

    _updateJobHistoryBadge() {
        const n = this.jobHistoryCollection.totalCount ?? this.jobHistoryCollection.models?.length ?? 0;
        this.setBadge('Job History', n > 0 ? { text: String(n), variant: 'muted' } : null);
    }

    _refreshHeaderForActiveJobsChange() {
        this._updateActiveJobsBadge();
        this._refreshComputedFields();
        if (this.headerView?.isMounted()) this.headerView.render().then(() => this._applyHeaderIconAccent()).catch(() => {});
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
                    // Preserve heartbeat history series across polls so the sparkline animates
                    const prev = m.attributes._sysinfo?._heartbeatSeries || [];
                    const ageSec = heartbeatAgeSec(m.get('last_heartbeat'));
                    const next = ageSec != null ? [...prev, ageSec].slice(-20) : prev;
                    sysinfo._heartbeatSeries = next;
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
            this.overviewSection.setSysinfo(m.attributes._sysinfo, m.attributes._sysinfoError);
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
            this.actionsSection.setPingResult(`<span class="text-danger"><i class="bi bi-x-circle-fill me-1"></i>${this.escapeHtml(e.message || 'Ping failed')}</span>`);
        }
    }

    async onActionShutdown() {
        const ok = await Modal.confirm(
            `Send a graceful shutdown to <strong class="font-monospace">${this.escapeHtml(this.model.get('runner_id') || '')}</strong>?`
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
                this.showSuccess('Shutdown command sent to runner.');
                this.emit('runner:shutdown', { runner: this.model });
            } else {
                this.showError((resp.data && resp.data.error) || 'Shutdown command failed.');
            }
        } catch (e) {
            this.showError('Shutdown failed: ' + e.message);
        }
    }

    async onActionDrain() {
        const ok = await Modal.confirm(
            `Place <strong class="font-monospace">${this.escapeHtml(this.model.get('runner_id') || '')}</strong> in drain mode?`
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
                this.showError((resp.data && resp.data.error) || 'Broadcast failed.');
            }
        } catch (e) {
            Modal.hideBusy();
            this.showError('Broadcast failed: ' + e.message);
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
            this.showSuccess('Runner data exported.');
        } catch (e) {
            this.showError('Export failed: ' + e.message);
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

RunnerDetailsView.VIEW_CLASS = RunnerDetailsView;
JobRunner.VIEW_CLASS = RunnerDetailsView;
JobRunner.MODEL_REF = 'jobs.JobRunner';

export default RunnerDetailsView;
