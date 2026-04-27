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
                        <div class="card-body">
                            {{#priorityEmpty|bool}}
                            <div class="text-muted small">No incidents in window.</div>
                            {{/priorityEmpty|bool}}
                            {{^priorityEmpty|bool}}
                            <ul class="list-unstyled mb-0 sd-bucket-list">
                                {{#priorityRows}}
                                <li class="sd-bucket-row" data-action="open-priority" data-bucket="{{key}}">
                                    <span class="sd-bucket-label" style="color:{{color}};">
                                        {{label}}<span class="sd-bucket-range">{{range}}</span>
                                    </span>
                                    <span class="sd-bucket-bar"><span style="width:{{percent}}%; background:{{color}};"></span></span>
                                    <span class="sd-bucket-num sd-mono">{{value}}</span>
                                </li>
                                {{/priorityRows}}
                            </ul>
                            {{/priorityEmpty|bool}}
                        </div>
                    </div>
                </div>
                <div class="col-lg-4">
                    <div class="card sd-card h-100">
                        <div class="card-header bg-transparent border-0">
                            <h3 class="card-title sd-card-title mb-0">Bouncer Funnel</h3>
                            <span class="card-subtitle text-muted small">Last 7 days</span>
                        </div>
                        <div class="card-body">
                            <div class="sd-funnel">
                                {{#funnelRows}}
                                <div class="sd-funnel-row">
                                    <div class="sd-funnel-bar">
                                        <span class="sd-funnel-fill" style="width:{{percent}}%; background:{{color}};">{{label}}</span>
                                    </div>
                                    <span class="sd-funnel-num sd-mono">{{value}}</span>
                                </div>
                                {{/funnelRows}}
                            </div>
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
        // Buckets always render (showing 0 against each tier is useful at-
        // a-glance — confirms there are no Critical/High right now). Only
        // hide the rows when the API didn't return ANY incidents to bucket.
        this.priorityEmpty = incidents.length === 0;

        // Bouncer funnel — sum the last 7 days of each stage so the
        // funnel reflects cumulative activity, not just today's bucket.
        // /api/metrics/series returns the current bucket only, which
        // shows zeros if there's been no bouncer traffic today even
        // when the week has plenty.
        try {
            const drStart = Math.floor((Date.now() - 7 * 86400000) / 1000);
            const resp = await rest.GET('/api/metrics/fetch', {
                slug: 'bouncer:assessments,bouncer:monitors,bouncer:blocks',
                account: 'incident',
                granularity: 'days',
                with_labels: true,
                dr_start: drStart,
                _: Date.now()
            });
            // /api/metrics/fetch nests one level deeper than /series:
            //   resp.data = { status, data: { labels:[], data: { slug: [...values] } } }
            const seriesData = resp?.data?.data?.data || {};
            const sums = {};
            for (const [slug, values] of Object.entries(seriesData)) {
                sums[slug] = (Array.isArray(values) ? values : []).reduce((s, v) => s + (Number(v) || 0), 0);
            }
            this.funnelRows = this._buildFunnel(sums);
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
            { key: 'bouncer:assessments', label: 'Assessments', color: 'rgba(76, 201, 240, 0.95)' },
            { key: 'bouncer:monitors',    label: 'Monitors',    color: 'rgba(245, 165, 36, 0.95)' },
            { key: 'bouncer:blocks',      label: 'Blocks',      color: 'rgba(255, 90, 90, 0.95)' }
        ];
        const values = stages.map(s => ({ ...s, value: Number(seriesData[s.key] ?? 0) }));
        // If all zero, return empty so the empty-state message renders cleanly
        // (instead of three 0-width bars with vertically-wrapped labels).
        if (values.every(v => v.value === 0)) return [];
        const max = Math.max(1, ...values.map(s => s.value));
        return values.map(s => ({
            ...s,
            value: s.value.toLocaleString(),  // thousand separators
            percent: Math.max(12, Math.round((s.value / max) * 100))  // floor 12% so labels don't squish
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
