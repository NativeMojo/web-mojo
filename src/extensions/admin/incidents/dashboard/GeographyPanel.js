/**
 * GeographyPanel — world map + country leaderboard with slug-family selector.
 *
 * Wraps MetricsCountryMapView with a 4-button selector that switches
 * which `category=` is plotted: Events / Incidents / Firewall / Logins.
 *
 * Country leaderboard is its own list rendered alongside the map; click
 * a country in the leaderboard to open a Country Detail drawer.
 */

import View from '@core/View.js';
import { MetricsCountryMapView } from '@ext/map/index.js';
import Modal from '@core/views/feedback/Modal.js';

const FAMILIES = [
    { key: 'events',   label: 'Events',    category: 'incident_events_by_country' },
    { key: 'incidents',label: 'Incidents', category: 'incidents_by_country' },
    { key: 'firewall', label: 'Firewall',  category: 'firewall_blocks_by_country' },
    { key: 'logins',   label: 'Logins',    category: 'logins' }
];

class GeographyPanel extends View {
    constructor(options = {}) {
        super({
            ...options,
            className: `sd-geography ${options.className || ''}`.trim()
        });
        this.activeFamily = options.family || 'events';
        this._reflectFamilies();
        // State for the leaderboard list, populated when the map fetches.
        this.leaderboard = [];
        this.leaderboardEmpty = true;
    }

    _reflectFamilies() {
        this.families = FAMILIES.map(f => ({ ...f, active: f.key === this.activeFamily }));
    }

    async getTemplate() {
        return `
            <div class="card sd-card">
                <div class="card-header bg-transparent border-0 d-flex justify-content-between align-items-start">
                    <div>
                        <h3 class="card-title sd-card-title mb-0">Geography</h3>
                        <span class="card-subtitle text-muted small">Activity by country, last 7 days</span>
                    </div>
                    <div class="btn-group btn-group-sm" role="group" aria-label="Slug family">
                        {{#families}}
                        <button type="button"
                                class="btn btn-outline-secondary {{#active|bool}}active{{/active|bool}}"
                                data-action="set-family"
                                data-family="{{key}}">{{label}}</button>
                        {{/families}}
                    </div>
                </div>
                <div class="card-body p-0">
                    <div class="sd-geo-grid">
                        <div class="sd-geo-map-cell" data-container="map"></div>
                        <ol class="sd-geo-leader list-unstyled mb-0">
                            {{#leaderboardEmpty|bool}}
                            <li class="px-3 py-3 text-muted small">No country activity in window.</li>
                            {{/leaderboardEmpty|bool}}
                            {{#leaderboard}}
                            <li class="sd-geo-leader-row" data-action="open-country" data-cc="{{cc}}" data-name="{{name}}" data-total="{{total}}">
                                <span class="sd-geo-cc sd-mono">{{cc}}</span>
                                <span class="sd-geo-name">{{name}}</span>
                                <span class="sd-geo-num sd-mono">{{total}}</span>
                            </li>
                            {{/leaderboard}}
                        </ol>
                    </div>
                </div>
            </div>
        `;
    }

    async onInit() {
        this.map = new MetricsCountryMapView({
            containerId: 'map',
            category: this._currentCategory(),
            account: 'incident',
            granularity: 'days',
            maxCountries: 20,
            metricLabel: this._currentLabel(),
            height: 360,
            mapStyle: 'dark'
        });
        this.addChild(this.map);
        await this._fetchLeaderboard();
    }

    async _fetchLeaderboard() {
        const rest = this.getApp()?.rest;
        if (!rest) {
            this.leaderboard = [];
            this.leaderboardEmpty = true;
            return;
        }
        try {
            const drStart = Math.floor((Date.now() - 7 * 86400000) / 1000);
            const resp = await rest.GET('/api/metrics/fetch', {
                category: this._currentCategory(),
                account: 'incident',
                granularity: 'days',
                with_labels: true,
                dr_start: drStart,
                _: Date.now()
            });
            const metrics = resp?.data?.data?.data || {};
            this.leaderboard = this._buildLeaderboard(metrics);
        } catch (err) {
            console.warn('[GeographyPanel] leaderboard fetch failed:', err);
            this.leaderboard = [];
        }
        this.leaderboardEmpty = this.leaderboard.length === 0;
    }

    _buildLeaderboard(metrics) {
        // Each metric key looks like 'incident_events:country:US'. Sum each
        // series, extract the trailing :CC, sort descending, take top 10.
        const rows = [];
        for (const [slug, series] of Object.entries(metrics)) {
            const cc = String(slug).split(':').pop()?.toUpperCase();
            if (!cc || cc.length !== 2) continue;
            const total = (Array.isArray(series) ? series : []).reduce((s, v) => s + (Number(v) || 0), 0);
            if (total <= 0) continue;
            rows.push({ cc, name: cc, total });
        }
        rows.sort((a, b) => b.total - a.total);
        return rows.slice(0, 10);
    }

    async onActionSetFamily(event, element) {
        const key = element.dataset.family;
        if (!key || key === this.activeFamily) return;
        this.activeFamily = key;
        this._reflectFamilies();
        this.map.category = this._currentCategory();
        this.map.metricLabel = this._currentLabel();
        await this._fetchLeaderboard();
        await this.render();
        await this.map.refresh();
    }

    async onActionOpenCountry(event, element) {
        const cc = element.dataset.cc;
        const name = element.dataset.name;
        const total = element.dataset.total;
        if (!cc) return;
        this.openCountryDrawer({ cc, name, total });
    }

    async refresh() {
        await this._fetchLeaderboard();
        if (this.isMounted()) await this.render();
        return this.map?.refresh();
    }

    _currentCategory() {
        return FAMILIES.find(f => f.key === this.activeFamily)?.category || FAMILIES[0].category;
    }

    _currentLabel() {
        return FAMILIES.find(f => f.key === this.activeFamily)?.label || FAMILIES[0].label;
    }

    /**
     * Convenience for opening the country drawer — kept for the parent
     * page to call if it gets a click event from the map. (The map view
     * doesn't currently emit one — leaderboard click is the click target.)
     */
    openCountryDrawer({ cc, name, total }) {
        const safeCc = this._esc(cc);
        Modal.drawer({
            eyebrow: 'Country Detail',
            title: `${cc} · ${name || cc}`,
            meta: [
                { icon: 'bi bi-graph-up', text: `${total ?? '—'} ${this._currentLabel().toLowerCase()} / 7d` }
            ],
            body: `
                <p class="small text-muted">
                    For a fuller breakdown of events from this country, open the Events
                    table filtered by country code.
                </p>
                <div class="mt-2">
                    <a href="?page=system/events&country_code=${encodeURIComponent(cc)}"
                       class="btn btn-sm btn-outline-primary">
                        <i class="bi bi-list-ul me-1"></i>Open Events from ${safeCc}
                    </a>
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

export default GeographyPanel;
