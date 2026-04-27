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
                    <div data-container="map"></div>
                </div>
            </div>
        `;
    }

    async getViewData() {
        return {
            ...this.data,
            families: FAMILIES.map(f => ({ ...f, active: f.key === this.activeFamily }))
        };
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
    }

    async onActionSetFamily(event, element) {
        const key = element.dataset.family;
        if (!key || key === this.activeFamily) return;
        this.activeFamily = key;
        this.map.category = this._currentCategory();
        this.map.metricLabel = this._currentLabel();
        await this.render();
        await this.map.refresh();
    }

    async refresh() {
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
                        <i class="bi bi-list-ul me-1"></i>Open Events from ${cc}
                    </a>
                </div>
            `,
            size: 'md'
        });
    }
}

export default GeographyPanel;
