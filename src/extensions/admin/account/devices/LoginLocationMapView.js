/**
 * LoginLocationMapView - Interactive map of login locations
 *
 * Plots country-level login count markers from the Login Events summary API,
 * with drill-down to region level on marker click.
 *
 * Usage:
 *   // System-wide
 *   new LoginLocationMapView({ height: 360, mapStyle: 'dark' })
 *
 *   // Per-user
 *   new LoginLocationMapView({ userId: 42, height: 300, mapStyle: 'dark' })
 */

import View from '@core/View.js';

class LoginLocationMapView extends View {
    constructor(options = {}) {
        super({
            className: 'login-location-map-view',
            ...options
        });

        this.userId = options.userId || null;
        this.height = options.height || 360;
        this.mapStyle = options.mapStyle || 'dark';
        this.drStart = options.drStart || null;
        this.drEnd = options.drEnd || null;

        // Drill-down state
        this._drillCountry = null;
        this._refreshing = false;
        this.mapView = null;
        this._mapAvailable = false;
    }

    async getTemplate() {
        return `
            <div class="login-location-map">
                <div class="d-none align-items-center gap-2 mb-2" data-region="drill-bar">
                    <button class="btn btn-sm btn-outline-secondary" data-action="reset-drill-down">
                        <i class="bi bi-arrow-left me-1"></i>All Countries
                    </button>
                    <span class="text-muted small" data-region="drill-label"></span>
                </div>
                <div data-container="map" style="height:${this.height}px;"></div>
                <div class="text-muted small px-1 pt-2" data-region="status"></div>
            </div>
        `;
    }

    async onInit() {
        try {
            const MapLibreView = (await import('@ext/map/MapLibreView.js')).default;
            this.mapView = new MapLibreView({
                containerId: 'map',
                height: this.height,
                style: this.mapStyle,
                zoom: 1.3,
                center: [10, 20],
                pitch: 15,
                bearing: 0,
                showNavigationControl: true,
                autoFitBounds: false
            });
            this.addChild(this.mapView);
            this._mapAvailable = true;
            await this.refresh();
        } catch (e) {
            this._mapAvailable = false;
            this._setStatus('Map extension not available.');
        }
    }

    // ── Data fetching ────────────────────────────────

    async refresh() {
        if (this._refreshing || !this._mapAvailable) return;
        this._refreshing = true;
        this._setStatus('Loading locations\u2026');
        try {
            const data = await this._fetchSummary();
            this._applyMarkers(data);
            this._setStatus('');
        } catch (error) {
            console.error('LoginLocationMapView refresh error', error);
            this._setStatus('Unable to load login locations.');
        } finally {
            this._refreshing = false;
        }
    }

    async _fetchSummary(countryCode = null) {
        const rest = this.getApp()?.rest;
        if (!rest) throw new Error('REST client unavailable');

        const params = {};
        if (this.drStart) params.dr_start = this.drStart;
        if (this.drEnd) params.dr_end = this.drEnd;

        let url;
        if (this.userId) {
            url = '/api/account/logins/user';
            params.user_id = this.userId;
        } else {
            url = '/api/account/logins/summary';
        }

        if (countryCode) {
            params.country_code = countryCode;
            params.region = true;
        }

        const response = await rest.GET(url, params);
        if (!response.success || !response.data?.status) {
            throw new Error(response.data?.error || 'Login summary API error');
        }
        return response.data.data || [];
    }

    // ── Marker rendering ─────────────────────────────

    _applyMarkers(entries) {
        if (!entries.length) {
            this.mapView.updateMarkers([]);
            this._setStatus('No login locations found.');
            return;
        }

        const maxCount = Math.max(...entries.map(e => e.count));

        const markers = entries
            .filter(e => e.latitude && e.longitude)
            .map(entry => {
                const intensity = entry.count / (maxCount || 1);
                const markerSize = Math.round(18 + intensity * 26);
                const isRegion = !!entry.region;
                const label = isRegion ? entry.region : entry.country_code;
                const newCount = isRegion ? (entry.new_region_count || 0) : (entry.new_country_count || 0);
                const newLabel = isRegion ? 'new region' : 'new country';

                const popup = `
                    <div class="text-center" style="min-width:120px;">
                        <div class="fw-semibold">${label}</div>
                        <div class="text-muted">${entry.count.toLocaleString()} login${entry.count !== 1 ? 's' : ''}</div>
                        ${newCount > 0 ? `<div><span class="badge bg-warning text-dark" style="font-size:0.65rem;">${newCount} ${newLabel}</span></div>` : ''}
                    </div>
                `;

                return {
                    lng: entry.longitude,
                    lat: entry.latitude,
                    size: markerSize,
                    color: this._getMarkerColor(intensity),
                    popup,
                    _countryCode: entry.country_code,
                    _isRegion: isRegion
                };
            });

        this.mapView.updateMarkers(markers);

        // Attach click handlers for drill-down (country → region)
        if (!this._drillCountry) {
            this._attachMarkerClicks(markers);
        }
    }

    _attachMarkerClicks(markers) {
        if (!this.mapView?.mapMarkers) return;
        this.mapView.mapMarkers.forEach((glMarker, i) => {
            const data = markers[i];
            if (!data || data._isRegion) return;
            const el = glMarker.getElement();
            if (el) {
                el.addEventListener('dblclick', (e) => {
                    e.stopPropagation();
                    this.drillDown(data._countryCode);
                });
            }
        });
    }

    _getMarkerColor(intensity) {
        const start = [32, 201, 151]; // teal
        const end = [255, 193, 7];    // amber
        const mix = start.map((s, i) => Math.round(s + (end[i] - s) * intensity));
        return `rgba(${mix[0]}, ${mix[1]}, ${mix[2]}, 0.9)`;
    }

    // ── Drill-down ───────────────────────────────────

    async drillDown(countryCode) {
        if (this._refreshing) return;
        this._drillCountry = countryCode;
        this._showDrillBar(countryCode);
        this._refreshing = true;
        this._setStatus('Loading regions\u2026');
        try {
            const data = await this._fetchSummary(countryCode);
            this._applyMarkers(data);
            this._setStatus('');
            // Fit to region markers
            if (this.mapView?.markers?.length > 1) {
                this.mapView.fitBounds();
            }
        } catch (error) {
            console.error('LoginLocationMapView drillDown error', error);
            this._setStatus('Unable to load region data.');
        } finally {
            this._refreshing = false;
        }
    }

    async onActionResetDrillDown() {
        this._drillCountry = null;
        this._hideDrillBar();
        await this.refresh();
    }

    _showDrillBar(countryCode) {
        const bar = this.element?.querySelector('[data-region="drill-bar"]');
        const label = this.element?.querySelector('[data-region="drill-label"]');
        if (bar) bar.classList.replace('d-none', 'd-flex');
        if (label) label.textContent = `Regions in ${countryCode}`;
    }

    _hideDrillBar() {
        const bar = this.element?.querySelector('[data-region="drill-bar"]');
        if (bar) bar.classList.replace('d-flex', 'd-none');
    }

    // ── Tab activation (for hidden-container resize) ─

    onTabActivated() {
        if (this.mapView?.map) {
            this.mapView.map.resize();
        }
    }

    // ── Helpers ──────────────────────────────────────

    _setStatus(message) {
        const el = this.element?.querySelector('[data-region="status"]');
        if (!el) return;
        el.textContent = message || '';
        el.style.display = message ? 'block' : 'none';
    }
}

export default LoginLocationMapView;
