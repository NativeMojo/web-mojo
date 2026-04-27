/**
 * GeographyPanel — country leaderboard with slug-family selector.
 *
 * Default render is COMPACT — only the leaderboard list shows, plus a
 * "View Map" toolbar button that opens MetricsCountryMapView in an XL
 * modal. The map is a heavy widget that competes for screen real
 * estate; keeping it modal-on-demand cleans up the dashboard.
 *
 * Pass `inlineMap: true` to render the map in the card itself (legacy
 * behavior).
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
        this.inlineMap = options.inlineMap === true;
        this._reflectFamilies();
        // State for the leaderboard list, populated when the map fetches.
        this.leaderboard = [];
        this.leaderboardEmpty = true;
    }

    _reflectFamilies() {
        this.families = FAMILIES.map(f => ({ ...f, active: f.key === this.activeFamily }));
    }

    async getTemplate() {
        // Inline-map mode: original side-by-side layout with the map in
        // the card. Compact mode (default): leaderboard only + a toolbar
        // button that opens the map in an XL modal.
        const inlineMapHtml = this.inlineMap ? `
                    <div class="sd-geo-grid">
                        <div class="sd-geo-map-cell" data-container="inline-map"></div>
                        ${this._leaderboardHtml()}
                    </div>` : `
                    ${this._leaderboardHtml()}`;

        return `
            <div class="card sd-card h-100">
                <div class="card-header bg-transparent border-0 d-flex justify-content-between align-items-start">
                    <div>
                        <h3 class="card-title sd-card-title mb-0">Geography</h3>
                        <span class="card-subtitle text-muted small">Activity by country, last 7 days</span>
                    </div>
                    <div class="d-flex align-items-center gap-2">
                        <div class="btn-group btn-group-sm" role="group" aria-label="Slug family">
                            {{#families}}
                            <button type="button"
                                    class="btn btn-outline-secondary {{#active|bool}}active{{/active|bool}}"
                                    data-action="set-family"
                                    data-family="{{key}}">{{label}}</button>
                            {{/families}}
                        </div>
                        ${this.inlineMap ? '' : `
                        <button type="button" class="btn btn-sm btn-outline-secondary" data-action="show-map" title="Show map">
                            <i class="bi bi-globe-americas"></i>
                        </button>`}
                    </div>
                </div>
                <div class="card-body p-0">
                    ${inlineMapHtml}
                </div>
            </div>
        `;
    }

    _leaderboardHtml() {
        return `
            <ol class="sd-geo-leader sd-geo-leader-full list-unstyled mb-0">
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
        `;
    }

    async onInit() {
        // Inline map only when explicitly opted in. Compact mode mounts
        // the map lazily inside the modal when "Show map" is clicked.
        if (this.inlineMap) {
            this.map = new MetricsCountryMapView({
                containerId: 'inline-map',
                category: this._currentCategory(),
                account: 'incident',
                granularity: 'days',
                maxCountries: 20,
                metricLabel: this._currentLabel(),
                height: 360,
                mapStyle: 'dark',
                mapOptions: { interactive: false }
            });
            this.addChild(this.map);
        }
        await this._fetchLeaderboard();
    }

    /**
     * Open the world map in an XL modal. Built fresh each time so the
     * MapLibre canvas always sizes correctly to the modal viewport
     * (the lib doesn't always re-measure cleanly when the host
     * container resizes).
     */
    async onActionShowMap() {
        const map = new MetricsCountryMapView({
            category: this._currentCategory(),
            account: 'incident',
            granularity: 'days',
            maxCountries: 30,
            metricLabel: this._currentLabel(),
            height: 560,
            mapStyle: 'dark',
            // Allow interaction in the modal — the map is the focal
            // point there, not a thumbnail next to other widgets.
            mapOptions: { interactive: true }
        });
        await Modal.drawer({
            eyebrow: 'Geography',
            title: this._currentLabel() + ' by Country',
            meta: [
                { icon: 'bi bi-calendar3', text: 'Last 7 days' },
                { icon: 'bi bi-cursor', text: 'Drag, zoom, click markers' }
            ],
            view: map,
            size: 'xl'
        });
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
        if (this.map) {
            this.map.category = this._currentCategory();
            this.map.metricLabel = this._currentLabel();
        }
        await this._fetchLeaderboard();
        await this.render();
        if (this.map) await this.map.refresh();
    }

    async refresh() {
        await this._fetchLeaderboard();
        if (this.isMounted()) await this.render();
        if (this.map) return this.map.refresh();
    }

    async onActionOpenCountry(event, element) {
        const cc = element.dataset.cc;
        const name = element.dataset.name;
        const total = element.dataset.total;
        if (!cc) return;
        this.openCountryDrawer({ cc, name, total });
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
