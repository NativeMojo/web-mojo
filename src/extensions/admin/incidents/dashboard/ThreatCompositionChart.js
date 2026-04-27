/**
 * ThreatCompositionChart — single stacked bar chart that condenses
 * incident_events / firewall:blocks / bouncer:blocks / auth:failures
 * into one daily-bucketed view.
 *
 * Replaces what would otherwise be 4 separate side-by-side mini charts.
 * Range toggle: 7D / 30D / 90D.
 *
 * Click any bar emits `composition:bar-click` with the bucket date —
 * the parent dashboard wires this to a Day Drill-Down drawer.
 */

import View from '@core/View.js';
import MetricsChart from '@ext/charts/MetricsChart.js';
import Modal from '@core/views/feedback/Modal.js';

const SLUGS = ['incident_events', 'firewall:blocks', 'bouncer:blocks', 'auth:failures'];

class ThreatCompositionChart extends View {
    constructor(options = {}) {
        super({
            ...options,
            className: `sd-composition ${options.className || ''}`.trim()
        });
        this.range = options.range || '30d';
    }

    async getTemplate() {
        return `
            <div class="card sd-card">
                <div class="card-header bg-transparent border-0 d-flex justify-content-between align-items-start">
                    <div>
                        <h3 class="card-title sd-card-title mb-0">Threat Composition</h3>
                        <span class="card-subtitle text-muted small">Daily, stacked · click any day to drill in</span>
                    </div>
                    <div class="btn-group btn-group-sm" role="group" aria-label="Time range">
                        <button type="button" class="btn btn-outline-secondary {{#is7d|bool}}active{{/is7d|bool}}" data-action="set-range" data-range="7d">7D</button>
                        <button type="button" class="btn btn-outline-secondary {{#is30d|bool}}active{{/is30d|bool}}" data-action="set-range" data-range="30d">30D</button>
                        <button type="button" class="btn btn-outline-secondary {{#is90d|bool}}active{{/is90d|bool}}" data-action="set-range" data-range="90d">90D</button>
                    </div>
                </div>
                <div class="card-body" data-container="chart-host"></div>
            </div>
        `;
    }

    async getViewData() {
        return {
            ...this.data,
            is7d:  this.range === '7d',
            is30d: this.range === '30d',
            is90d: this.range === '90d'
        };
    }

    async onInit() {
        this.chart = new MetricsChart({
            containerId: 'chart-host',
            slugs: SLUGS,
            account: 'incident',
            granularity: 'days',
            chartType: 'bar',          // SeriesChart defaults bar = stacked
            defaultDateRange: this.range,
            compactHeader: true,
            height: 280,
            yAxis: { label: 'Count', beginAtZero: true },
            tooltip: { y: 'number:0' },
            colors: [
                'rgba(13, 202, 240, 0.85)',  // events  — info blue
                'rgba(220, 53, 69, 0.85)',   // firewall — danger red
                'rgba(253, 126, 20, 0.85)',  // bouncer  — orange
                'rgba(179, 136, 255, 0.85)'  // auth     — purple
            ],
            title: ''
        });
        this.addChild(this.chart);

        // Re-emit bar clicks so the dashboard page can open a drawer.
        this.chart.on?.('chart:click', (data) => {
            this.emit?.('composition:bar-click', data);
            this._openDayDrawer(data);
        });
    }

    async onActionSetRange(event, element) {
        const range = element.dataset.range;
        if (!range || range === this.range) return;
        this.range = range;
        this.chart?.setQuickRange?.(range);
        await this.chart?.fetchData?.();
        await this.render();
    }

    async refresh() {
        return this.chart?.fetchData?.();
    }

    _openDayDrawer({ x, datasets } = {}) {
        // x is the label (e.g. "Apr 22") — the chart doesn't pass back the
        // raw date; we use the label as title context. Datasets carries
        // per-series values for that bucket.
        const title = x ? `Day Detail · ${x}` : 'Day Detail';
        const breakdown = (datasets || []).map(d =>
            `<div class="d-flex justify-content-between border-bottom py-1">
                <span class="text-muted small">${this._esc(d.label || '')}</span>
                <span class="sd-mono">${Number(d.value || 0).toLocaleString()}</span>
            </div>`
        ).join('');

        Modal.drawer({
            eyebrow: 'Composition',
            title,
            meta: [
                { icon: 'bi bi-bar-chart-line', text: SLUGS.length + ' series' }
            ],
            body: `
                <p class="small text-muted mb-2">Per-series totals for this bucket. To drill into the underlying events, open the Events table.</p>
                ${breakdown || '<div class="text-muted small">No breakdown available.</div>'}
                <div class="mt-3">
                    <a href="?page=system/events" class="btn btn-sm btn-outline-primary"><i class="bi bi-list-ul me-1"></i>Open Events</a>
                </div>
            `,
            size: 'md'
        });
    }

    _esc(s) {
        const d = document.createElement('div');
        d.textContent = String(s ?? '');
        return d.innerHTML;
    }
}

export default ThreatCompositionChart;
