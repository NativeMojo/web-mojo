/**
 * DistributionStrip — three-card row of distributions:
 *   1. Incidents by Status (PieChart donut)
 *   2. Incidents by Priority bucket (HTML/CSS horizontal bars)
 *   3. Bouncer Funnel (HTML/CSS horizontal bars, descending)
 *
 * Funnel and priority-buckets render inline (no separate FunnelChart
 * class) — they're three bars each, simpler in markup than as a chart.
 *
 * Data: fetches a recent page of incidents and aggregates client-side.
 * No backend group_by required. Bouncer funnel reads three values from
 * /api/metrics/series.
 */

import View from '@core/View.js';
import PieChart from '@ext/charts/PieChart.js';
import { IncidentList } from '@ext/admin/models/Incident.js';
import Modal from '@core/views/feedback/Modal.js';

const STATUS_COLORS = {
    new:           'rgba(13, 202, 240, 0.85)',
    open:          'rgba(13, 110, 253, 0.85)',
    investigating: 'rgba(255, 193, 7, 0.85)',
    paused:        'rgba(108, 117, 125, 0.85)',
    resolved:      'rgba(25, 135, 84, 0.85)',
    closed:        'rgba(73, 80, 87, 0.85)',
    ignored:       'rgba(108, 117, 125, 0.6)',
    pending:       'rgba(173, 181, 189, 0.85)'
};

const PRIORITY_BUCKETS = [
    { key: 'critical', label: 'Critical', range: '12+',  color: 'rgba(220, 53, 69, 0.85)',  match: p => p >= 12 },
    { key: 'high',     label: 'High',     range: '8–11', color: 'rgba(253, 126, 20, 0.85)', match: p => p >= 8  && p < 12 },
    { key: 'warn',     label: 'Warn',     range: '4–7',  color: 'rgba(255, 193, 7, 0.85)',  match: p => p >= 4  && p < 8  },
    { key: 'info',     label: 'Info',     range: '0–3',  color: 'rgba(13, 202, 240, 0.85)', match: p => p < 4 }
];

class DistributionStrip extends View {
    constructor(options = {}) {
        super({
            ...options,
            className: `sd-distributions ${options.className || ''}`.trim()
        });
        // State on `this` for Mustache resolution.
        this._statusData = [];
        this.priorityRows = [];
        this.priorityEmpty = true;
        this.funnelRows = [];
        this.funnelEmpty = true;
    }

    async getTemplate() {
        return `
            <div class="row g-3">
                <div class="col-lg-4">
                    <div class="card sd-card h-100">
                        <div class="card-header bg-transparent border-0">
                            <h3 class="card-title sd-card-title mb-0">Incidents by Status</h3>
                        </div>
                        <div class="card-body" data-container="status-donut"></div>
                    </div>
                </div>
                <div class="col-lg-4">
                    <div class="card sd-card h-100">
                        <div class="card-header bg-transparent border-0">
                            <h3 class="card-title sd-card-title mb-0">Priority Buckets</h3>
                        </div>
                        <div class="card-body sd-bucket-host">
                            {{#priorityRows}}
                            <div class="sd-bucket-row mb-2" data-action="open-priority" data-bucket="{{key}}">
                                <div class="d-flex justify-content-between small mb-1">
                                    <span class="fw-semibold">{{label}} <span class="text-muted">{{range}}</span></span>
                                    <span class="sd-mono">{{value}}</span>
                                </div>
                                <div class="progress sd-progress" style="height:8px;">
                                    <div class="progress-bar"
                                         role="progressbar"
                                         style="width:{{percent}}%; background:{{color}};"
                                         aria-valuenow="{{percent}}" aria-valuemin="0" aria-valuemax="100"></div>
                                </div>
                            </div>
                            {{/priorityRows}}
                            {{#priorityEmpty|bool}}
                            <div class="text-muted small">No incidents in window.</div>
                            {{/priorityEmpty|bool}}
                        </div>
                    </div>
                </div>
                <div class="col-lg-4">
                    <div class="card sd-card h-100">
                        <div class="card-header bg-transparent border-0">
                            <h3 class="card-title sd-card-title mb-0">Bouncer Funnel</h3>
                        </div>
                        <div class="card-body">
                            {{#funnelRows}}
                            <div class="d-flex justify-content-between align-items-center mb-2 sd-funnel-row">
                                <div class="sd-funnel-bar" style="width:100%; background:rgba(255,255,255,0.04); border-radius:6px; overflow:hidden; min-height:30px; position:relative;">
                                    <div style="width:{{percent}}%; min-width:fit-content; background:{{color}}; padding:6px 10px; color:#fff; font-weight:600; font-size:11px; border-radius:6px; white-space:nowrap;">
                                        {{label}}
                                    </div>
                                </div>
                                <span class="sd-mono small ms-2">{{value}}</span>
                            </div>
                            {{/funnelRows}}
                            {{#funnelEmpty|bool}}
                            <div class="text-muted small">No bouncer activity in window.</div>
                            {{/funnelEmpty|bool}}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async onInit() {
        this.statusDonut = new PieChart({
            containerId: 'status-donut',
            data: [],
            cutout: 0.6,
            width: 200,
            height: 200,
            legendPosition: 'right',
            centerLabel: ({ total }) => total,
            centerSubLabel: 'TOTAL'
        });
        this.statusDonut.on?.('chart:click', ({ slice }) => this._openStatusDrawer(slice));
        this.addChild(this.statusDonut);

        // Fetch BEFORE first render so {{priorityRows}} / {{funnelRows}}
        // resolve from this on the first template pass.
        await this._fetch();
    }

    async _fetch() {
        const rest = this.getApp()?.rest;
        if (!rest) return;

        // Aggregate from a recent page — works without backend group_by.
        let incidents = [];
        try {
            const list = new IncidentList({ params: { sort: '-created', size: 200 } });
            await list.fetch();
            incidents = list.models || [];
        } catch (err) {
            console.warn('[DistributionStrip] incidents fetch failed:', err);
        }

        this._statusData = this._aggregateByStatus(incidents);
        this.priorityRows = this._aggregateByPriority(incidents);
        this.priorityEmpty = this.priorityRows.length === 0 || this.priorityRows.every(r => r.value === 0);

        // Bouncer funnel from /api/metrics/series
        try {
            const resp = await rest.GET('/api/metrics/series', {
                'slugs[]': ['bouncer:assessments', 'bouncer:monitors', 'bouncer:blocks'],
                account: 'incident',
                granularity: 'days',
                _: Date.now()
            });
            const data = resp?.data?.data || {};
            this.funnelRows = this._buildFunnel(data);
        } catch (err) {
            console.warn('[DistributionStrip] bouncer fetch failed:', err);
            this.funnelRows = [];
        }
        this.funnelEmpty = this.funnelRows.length === 0 || this.funnelRows.every(r => r.value === 0);

        // Donut updates directly via setData (no need to wait for render).
        this.statusDonut?.setData(this._statusData);
    }

    async refresh() {
        await this._fetch();
        if (this.isMounted()) await this.render();
    }

    _aggregateByStatus(incidents) {
        const counts = {};
        for (const inc of incidents) {
            const s = (inc.get('status') || 'new').toLowerCase();
            counts[s] = (counts[s] || 0) + 1;
        }
        return Object.entries(counts).map(([label, value]) => ({
            label: label.charAt(0).toUpperCase() + label.slice(1),
            value,
            color: STATUS_COLORS[label] || 'rgba(108, 117, 125, 0.6)'
        })).sort((a, b) => b.value - a.value);
    }

    _aggregateByPriority(incidents) {
        const buckets = PRIORITY_BUCKETS.map(b => ({ ...b, value: 0 }));
        for (const inc of incidents) {
            const p = parseInt(inc.get('priority'), 10) || 0;
            const bucket = buckets.find(b => b.match(p));
            if (bucket) bucket.value += 1;
        }
        const max = Math.max(1, ...buckets.map(b => b.value));
        return buckets.map(b => ({
            key: b.key,
            label: b.label,
            range: b.range,
            color: b.color,
            value: b.value,
            percent: Math.round((b.value / max) * 100)
        }));
    }

    _buildFunnel(seriesData) {
        const stages = [
            { key: 'bouncer:assessments', label: 'Assessments', color: 'rgba(13, 202, 240, 0.85)' },
            { key: 'bouncer:monitors',    label: 'Monitors',    color: 'rgba(255, 193, 7, 0.85)' },
            { key: 'bouncer:blocks',      label: 'Blocks',      color: 'rgba(220, 53, 69, 0.85)' }
        ];
        const values = stages.map(s => ({ ...s, value: Number(seriesData[s.key] ?? 0) }));
        // If all zero, return empty so the empty-state message renders cleanly
        // (instead of three 0-width bars with vertically-wrapped labels).
        if (values.every(v => v.value === 0)) return [];
        const max = Math.max(1, ...values.map(s => s.value));
        return values.map(s => ({
            ...s,
            percent: Math.round((s.value / max) * 100)
        }));
    }

    _openStatusDrawer(slice) {
        if (!slice) return;
        const status = String(slice.label).toLowerCase();
        const safeLabel = this._esc(slice.label);
        Modal.drawer({
            eyebrow: 'Status Filter',
            title: `Incidents · ${slice.label}`,
            meta: [
                { icon: 'bi bi-pie-chart', text: `${slice.value} (${slice.pct.toFixed(1)}%)` }
            ],
            body: `
                <p class="small text-muted">View the full incident list filtered by this status.</p>
                <a href="?page=system/incidents&status=${encodeURIComponent(status)}" class="btn btn-sm btn-outline-primary">
                    <i class="bi bi-list-ul me-1"></i>Open Incidents (${safeLabel})
                </a>
            `,
            size: 'md'
        });
    }

    _esc(s) {
        const d = document.createElement('div');
        d.textContent = String(s ?? '');
        return d.innerHTML;
    }

    async onActionOpenPriority(event, element) {
        const bucket = element.dataset.bucket;
        if (!bucket) return;
        const def = PRIORITY_BUCKETS.find(b => b.key === bucket);
        if (!def) return;
        // Build the ?priority__gte=...&priority__lte=... filter from the bucket range.
        const [lo, hi] = def.range === '12+' ? [12, null] : def.range.split('–').map(Number);
        const params = `priority__gte=${lo}` + (hi != null ? `&priority__lte=${hi}` : '');
        Modal.drawer({
            eyebrow: 'Priority Bucket',
            title: `Incidents · ${def.label} (${def.range})`,
            view: null,
            body: `
                <p class="small text-muted">View the full incident list filtered by priority.</p>
                <a href="?page=system/incidents&${params}" class="btn btn-sm btn-outline-primary">
                    <i class="bi bi-list-ul me-1"></i>Open Incidents
                </a>
            `,
            size: 'sm'
        });
    }
}

export default DistributionStrip;
