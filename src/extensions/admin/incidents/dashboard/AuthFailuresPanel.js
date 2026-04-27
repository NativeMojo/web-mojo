/**
 * AuthFailuresPanel — auth:failures aggregate slug chart + 4 sub-tiles.
 *
 * Uses the backend's auth:failures aggregate slug directly (no
 * client-side composition). Chart is a 30-day MetricsChart in compact
 * header mode. Sub-tiles below the chart show 24-hour counts for four
 * specific event categories.
 */

import View from '@core/View.js';
import MetricsChart from '@ext/charts/MetricsChart.js';
import Modal from '@core/views/feedback/Modal.js';

const SUB_TILE_CATEGORIES = [
    { key: 'password_reset',     label: 'Password Resets' },
    { key: 'totp:login_failed',  label: 'TOTP Failures' },
    { key: 'sessions:revoked',   label: 'Sessions Revoked' },
    { key: 'account:deactivated',label: 'Accounts Deactivated' }
];

class AuthFailuresPanel extends View {
    constructor(options = {}) {
        super({
            ...options,
            className: `sd-auth-failures ${options.className || ''}`.trim()
        });
        this._subCounts = SUB_TILE_CATEGORIES.map(c => ({ ...c, value: null }));
    }

    async getTemplate() {
        return `
            <div class="card sd-card">
                <div class="card-header bg-transparent border-0">
                    <h3 class="card-title sd-card-title mb-0">Auth Failures</h3>
                    <span class="card-subtitle text-muted small">Aggregate slug <code>auth:failures</code> · last 30 days</span>
                </div>
                <div class="card-body">
                    <div data-container="chart-host" class="mb-3"></div>
                    <div class="row g-2">
                        {{#tiles}}
                        <div class="col-6 col-lg-3">
                            <button type="button"
                                    class="card w-100 text-start border sd-auth-tile"
                                    data-action="open-sub-tile"
                                    data-category="{{key}}">
                                <div class="card-body py-2 px-3">
                                    <div class="text-muted small text-uppercase fw-semibold" style="letter-spacing:0.06em;">{{label}} <small class="opacity-75 ms-1">24h</small></div>
                                    <div class="sd-mono fs-4">{{display}}</div>
                                </div>
                            </button>
                        </div>
                        {{/tiles}}
                    </div>
                </div>
            </div>
        `;
    }

    async getViewData() {
        return {
            ...this.data,
            tiles: this._subCounts.map(t => ({ ...t, display: t.value == null ? '—' : String(t.value) }))
        };
    }

    async onInit() {
        this.chart = new MetricsChart({
            containerId: 'chart-host',
            slugs: ['auth:failures'],
            account: 'incident',
            granularity: 'days',
            defaultDateRange: '30d',
            chartType: 'bar',
            compactHeader: true,
            showDateRange: false,
            height: 200,
            colors: ['rgba(179, 136, 255, 0.85)'],
            yAxis: { label: 'Failures', beginAtZero: true },
            tooltip: { y: 'number:0' },
            title: ''
        });
        this.addChild(this.chart);
    }

    async onAfterRender() {
        if (!this._fetchedSubs) {
            this._fetchedSubs = true;
            await this._fetchSubTiles();
            await this.render();
        }
    }

    async refresh() {
        await Promise.allSettled([
            this.chart?.fetchData?.(),
            this._fetchSubTiles()
        ]);
        await this.render();
    }

    async _fetchSubTiles() {
        const rest = this.getApp()?.rest;
        if (!rest) return;
        const drStart = Math.floor((Date.now() - 86400000) / 1000);

        await Promise.all(this._subCounts.map(async (tile, i) => {
            try {
                const resp = await rest.GET('/api/incident/event', {
                    category: tile.key,
                    dr_start: drStart,
                    size: 1,
                    _: Date.now()
                });
                const count = resp?.data?.count ?? resp?.data?.data?.count ?? null;
                this._subCounts[i] = { ...tile, value: typeof count === 'number' ? count : 0 };
            } catch (_e) {
                this._subCounts[i] = { ...tile, value: null };
            }
        }));
    }

    async onActionOpenSubTile(event, element) {
        const cat = element.dataset.category;
        if (!cat) return;
        Modal.drawer({
            eyebrow: 'Auth Failure Category',
            title: cat,
            meta: [{ icon: 'bi bi-clock', text: 'Last 24 hours' }],
            body: `
                <p class="small text-muted">Open the events table filtered by this category.</p>
                <a href="?page=system/events&category=${encodeURIComponent(cat)}" class="btn btn-sm btn-outline-primary">
                    <i class="bi bi-list-ul me-1"></i>Open Events · ${cat}
                </a>
            `,
            size: 'sm'
        });
    }
}

export default AuthFailuresPanel;
