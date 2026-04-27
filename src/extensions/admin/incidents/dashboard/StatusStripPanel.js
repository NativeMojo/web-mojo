/**
 * StatusStripPanel — the top "pulse" row.
 *
 * Wraps KPIStrip with the dashboard's specific tile spec list. Six
 * metric tiles fed by /api/metrics/series?with_delta=true plus two
 * REST count tiles (open incidents, active firewall blocks).
 *
 * Tile click is wired to open a per-slug history modal; this panel
 * forwards `tile:click` events from the strip and lets the dashboard
 * page (or a parent) decide what to do.
 */

import View from '@core/View.js';
import KPIStrip from '@ext/charts/KPIStrip.js';
import Modal from '@core/views/feedback/Modal.js';
import MetricsChart from '@ext/charts/MetricsChart.js';

class StatusStripPanel extends View {
    constructor(options = {}) {
        super({
            ...options,
            className: `sd-status-strip-panel ${options.className || ''}`.trim()
        });
    }

    async getTemplate() {
        return `
            <div class="sd-section-head">
                <h2 class="sd-eyebrow">Pulse</h2>
                <span class="sd-section-meta text-muted small">Today · vs yesterday</span>
            </div>
            <div data-container="strip"></div>
        `;
    }

    async onInit() {
        this.strip = new KPIStrip({
            containerId: 'strip',
            account: 'incident',
            granularity: 'days',
            sparklineDays: 7,
            tiles: [
                {
                    rest: { endpoint: '/api/incident/incident', params: { status: 'new', _mode: 'count' } },
                    sparklineSlug: 'incidents',  // borrow the trail from the incidents metric series
                    key: 'new-incidents',
                    label: 'New Incidents',
                    severity: 'critical',
                    tone: 'bad'
                },
                { slug: 'auth:failures',     label: 'Failed Auth',         tone: 'bad', severity: 'warn' },
                { slug: 'incidents',         label: 'Incidents',           tone: 'bad' },
                { slug: 'incident_events',   label: 'Events',              tone: 'bad' },
                { slug: 'firewall:blocks',   label: 'Firewall Blocks',     tone: 'bad' },
                { slug: 'bouncer:blocks',    label: 'Bouncer Blocks',      tone: 'bad' },
                { slug: 'login:new_country', label: 'New-Country Logins',  tone: 'bad' },
                {
                    rest: { endpoint: '/api/system/geoip', params: { is_blocked: true, _mode: 'count' } },
                    key: 'active-blocks',
                    label: 'Active Blocks',
                    tone: 'bad'
                }
            ]
        });
        this.strip.on?.('tile:click', (data) => this._onTileClick(data));
        this.addChild(this.strip);
    }

    refresh() {
        return this.strip?.refresh();
    }

    _onTileClick({ slug, key }) {
        // REST-count tiles navigate to the matching filtered list page.
        // Metric tiles open a per-slug history-chart drawer.
        if (key === 'new-incidents') {
            this.getApp()?.showPage?.('system/incidents', { status: 'new' });
            return;
        }
        if (key === 'active-blocks') {
            // GeoLocatedIPTablePage at system/system/geoip is the canonical
            // "all blocked IPs" view. system/security/blocked-ips is a more
            // recent BlockedIPs table that focuses on firewall rules; use
            // the geoip page since the count is sourced from /api/system/geoip.
            this.getApp()?.showPage?.('system/system/geoip', { is_blocked: 'true' });
            return;
        }
        if (slug) {
            this._openHistoryDrawer(slug);
        }
    }

    _openHistoryDrawer(slug) {
        // Drawer owns the title + eyebrow + meta block. The chart is
        // pure data — suppress its own header (no "Metrics" h5, no cog,
        // no type switch) and hide the legend (single series would just
        // say "Default" or the raw slug).
        const chart = new MetricsChart({
            slugs: [slug],
            account: 'incident',
            granularity: 'days',
            defaultDateRange: '30d',
            chartType: 'line',
            compactHeader: true,
            showGranularity: false,
            showTypeSwitch: false,
            showDateRange: false,
            showLegend: false,
            height: 280
        });
        Modal.drawer({
            eyebrow: 'Metric History',
            title: this._humanizeSlug(slug),
            meta: [
                { icon: 'bi bi-calendar3', text: 'Last 30 days' },
                { icon: 'bi bi-bar-chart-line', text: 'Daily buckets' }
            ],
            view: chart,
            size: 'lg'
        });
    }

    _humanizeSlug(slug) {
        return String(slug)
            .split(/[:_]/)
            .map(p => p.charAt(0).toUpperCase() + p.slice(1))
            .join(' ');
    }
}

export default StatusStripPanel;
