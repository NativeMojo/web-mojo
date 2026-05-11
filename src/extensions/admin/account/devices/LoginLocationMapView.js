/**
 * LoginLocationMapView - Interactive map of login locations
 *
 * Two data modes (toggle in the toolbar):
 *   summary — one sized pin per country (or region after drill-down), using
 *             the server-aggregated summary endpoint. Drill-down is available:
 *             double-click a country marker to zoom into its regions.
 *   list    — one small dot per individual login event (up to 500, last 30d),
 *             colored by event type (green = success, red = failed, amber = suspicious).
 *
 * Usage:
 *   // System-wide
 *   new LoginLocationMapView({ height: 360, mapStyle: 'dark' })
 *
 *   // Per-user
 *   new LoginLocationMapView({ userId: 42, height: 300, mapStyle: 'dark' })
 *
 * Endpoints used:
 *   summary / global  : GET /api/account/logins/summary
 *   summary / per-user: GET /api/account/logins/user?user_id=<id>
 *   list    / global  : GET /api/account/logins?graph=list&size=500
 *   list    / per-user: GET /api/account/logins?user=<id>&graph=list&size=500
 */

import View from '@core/View.js';
import MapLibreView from '@ext/map/MapLibreView.js';
import Modal from '@core/views/feedback/Modal.js';
import { User } from '@core/models/User.js';

// Event-type → marker color (matches the login tone palette in the Logins tab)
const EVENT_COLORS = {
    success_login: 'rgba(32, 201, 151, 0.85)',
    success:       'rgba(32, 201, 151, 0.85)',
    login:         'rgba(32, 201, 151, 0.85)',
    failed_login:  'rgba(220, 53, 69, 0.85)',
    failure:       'rgba(220, 53, 69, 0.85)',
    failed:        'rgba(220, 53, 69, 0.85)',
    suspicious:    'rgba(255, 193, 7, 0.85)',
    mfa_required:  'rgba(255, 193, 7, 0.85)',
    mfa:           'rgba(255, 193, 7, 0.85)'
};

class LoginLocationMapView extends View {
    constructor(options = {}) {
        super({
            className: 'login-location-map-view',
            ...options
        });

        this.userId    = options.userId    || null;
        this.height    = options.height    || 360;
        this.mapStyle  = options.mapStyle  || 'dark';
        this.drStart   = options.drStart   || null;
        this.drEnd     = options.drEnd     || null;
        this.viewMode  = options.viewMode  || 'summary'; // 'summary' | 'list'

        // Drill-down state (summary mode only)
        this._drillCountry = null;
        this._refreshing   = false;
        this.mapView       = null;
        this._mapAvailable = false;
    }

    async getTemplate() {
        const summaryActive = this.viewMode === 'summary' ? 'active' : '';
        const listActive    = this.viewMode === 'list'    ? 'active' : '';
        return `
            <div class="login-location-map">
                <div class="d-flex align-items-center gap-2 mb-2">
                    <div class="d-none align-items-center gap-2" data-region="drill-bar">
                        <button class="btn btn-sm btn-outline-secondary" data-action="reset-drill-down">
                            <i class="bi bi-arrow-left me-1"></i>All Countries
                        </button>
                        <span class="text-muted small" data-region="drill-label"></span>
                    </div>
                    <div class="ms-auto btn-group btn-group-sm" role="group">
                        <button class="btn btn-sm btn-outline-secondary ${summaryActive}"
                                data-action="set-mode" data-mode="summary"
                                title="Aggregated by country">
                            <i class="bi bi-globe-americas"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-secondary ${listActive}"
                                data-action="set-mode" data-mode="list"
                                title="Every login">
                            <i class="bi bi-pin-map"></i>
                        </button>
                    </div>
                </div>
                <div data-container="map" style="height:${this.height}px;"></div>
                <div class="text-muted small px-1 pt-2" data-region="status"></div>
            </div>
        `;
    }

    async onInit() {
        try {
            this.mapView = new MapLibreView({
                containerId: 'map',
                height: this.height,
                style: this.mapStyle,
                zoom: 3.3,
                center: [-98.58, 39.83], // contiguous US centroid
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

    // ── Mode toggle ──────────────────────────────────

    async onActionSetMode(event, element) {
        const mode = element?.dataset?.mode;
        if (!mode || mode === this.viewMode) return;
        this.viewMode = mode;
        // Reset drill-down when leaving summary mode
        this._drillCountry = null;
        this._hideDrillBar();
        // Update button active states in-place (avoids re-mounting the MapLibre canvas)
        this.element?.querySelectorAll('[data-action="set-mode"]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === this.viewMode);
        });
        await this.refresh();
    }

    // ── Data fetching ────────────────────────────────

    async refresh() {
        if (this._refreshing || !this._mapAvailable) return;
        this._refreshing = true;
        this._setStatus('Loading locations\u2026');
        try {
            if (this.viewMode === 'list') {
                const events = await this._fetchList();
                this._applyListMarkers(events);
            } else {
                const data = await this._fetchSummary();
                this._applyMarkers(data);
            }
            this._setStatus('');
        } catch (error) {
            console.error('LoginLocationMapView refresh error', error);
            this._setStatus('Unable to load login locations.');
        } finally {
            this._refreshing = false;
        }
    }

    /**
     * Aggregated summary — one row per country (or region when drilling down).
     * Per-user: /api/account/logins/user?user_id=<id>
     * Global:   /api/account/logins/summary
     */
    async _fetchSummary(countryCode = null) {
        const rest = this.getApp()?.rest;
        if (!rest) throw new Error('REST client unavailable');

        const params = {};
        if (this.drStart) params.dr_start = this.drStart;
        if (this.drEnd)   params.dr_end   = this.drEnd;

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

    /**
     * Raw login events for the "every login" mode.
     * Per-user: /api/account/logins?user=<id>&graph=list&size=500
     * Global:   /api/account/logins?graph=list&size=500
     */
    async _fetchList() {
        const rest = this.getApp()?.rest;
        if (!rest) throw new Error('REST client unavailable');

        const params = { graph: 'list', size: 1000, sort: '-created' };
        if (this.drStart) params.dr_start = this.drStart;
        if (this.drEnd)   params.dr_end   = this.drEnd;
        if (this.userId)  params.user      = this.userId;

        const response = await rest.GET('/api/account/logins', params);
        if (!response.success || !response.data?.status) {
            throw new Error(response.data?.error || 'Login events API error');
        }
        return response.data.data || [];
    }

    // ── Summary-mode marker rendering ────────────────

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
                const intensity  = entry.count / (maxCount || 1);
                const markerSize = Math.round(18 + intensity * 26);
                const isRegion   = !!entry.region;
                const label      = isRegion ? entry.region : entry.country_code;
                const newCount   = isRegion ? (entry.new_region_count || 0) : (entry.new_country_count || 0);
                const newLabel   = isRegion ? 'new region' : 'new country';

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

        // Attach drill-down handlers only in summary mode
        if (!this._drillCountry && this.viewMode === 'summary') {
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
        const end   = [255, 193, 7];  // amber
        const mix   = start.map((s, i) => Math.round(s + (end[i] - s) * intensity));
        return `rgba(${mix[0]}, ${mix[1]}, ${mix[2]}, 0.9)`;
    }

    // ── List-mode marker rendering ───────────────────

    _applyListMarkers(events) {
        const plottable = events.filter(ev => ev.latitude && ev.longitude);
        if (!plottable.length) {
            this.mapView.updateMarkers([]);
            this._setStatus('No login events with location data found.');
            return;
        }

        const markers = plottable.map(ev => {
            const loc  = [ev.city, ev.region, ev.country_code].filter(Boolean).join(', ');
            const date = ev.created
                ? new Date(ev.created * 1000).toLocaleString()
                : '\u2014';

            // Show a "View User" link in the popup when we have user data and
            // are in system-wide mode (per-user context already shows that user).
            const userLink = (!this.userId && ev.user?.id)
                ? `<button class="btn btn-outline-primary mt-2 w-100"
                          style="font-size:0.7rem;padding:2px 8px;"
                          data-action="open-user"
                          data-user-id="${ev.user.id}">
                       <i class="bi bi-person me-1"></i>${ev.user.display_name || ev.user.username || 'View User'}
                   </button>`
                : '';

            const popup = `
                <div style="min-width:160px;">
                    <div class="fw-semibold">${loc || '\u2014'}</div>
                    <div class="text-muted small"><code>${ev.ip_address || ''}</code></div>
                    <div class="text-muted small">${date}</div>
                    ${ev.source ? `<div class="text-muted small">via ${ev.source}</div>` : ''}
                    ${userLink}
                </div>
            `;
            return {
                lng:   ev.longitude,
                lat:   ev.latitude,
                size:  10,
                color: this._getEventColor(ev.event_type),
                popup
            };
        });

        this.mapView.updateMarkers(markers);
        this._setStatus(`${markers.length.toLocaleString()} login${markers.length !== 1 ? 's' : ''} plotted`);
    }

    async onActionOpenUser(event, element) {
        const userId = Number(element?.dataset?.userId);
        if (!userId) return;

        // USER_VIEW_CLASS is registered by UserView.js at load time.
        // Same pattern as DeviceView.onActionViewUser().
        const ViewClass = User.VIEW_CLASS;
        if (!ViewClass) {
            console.warn('LoginLocationMapView: User.VIEW_CLASS not registered');
            return;
        }
        try {
            await Modal.showModelById(User, userId);
        } catch (err) {
            console.error('LoginLocationMapView: failed to open user', err);
        }
    }

    _getEventColor(eventType) {
        return EVENT_COLORS[String(eventType || '').toLowerCase()]
            || 'rgba(108, 117, 125, 0.85)';
    }

    // ── Drill-down (summary mode only) ───────────────

    async drillDown(countryCode) {
        if (this._refreshing || this.viewMode !== 'summary') return;
        this._drillCountry = countryCode;
        this._showDrillBar(countryCode);
        this._refreshing = true;
        this._setStatus('Loading regions\u2026');
        try {
            const data = await this._fetchSummary(countryCode);
            this._applyMarkers(data);
            this._setStatus('');
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
        const bar   = this.element?.querySelector('[data-region="drill-bar"]');
        const label = this.element?.querySelector('[data-region="drill-label"]');
        if (bar)   bar.classList.replace('d-none', 'd-flex');
        if (label) label.textContent = `Regions in ${countryCode}`;
    }

    _hideDrillBar() {
        const bar = this.element?.querySelector('[data-region="drill-bar"]');
        if (bar) bar.classList.replace('d-flex', 'd-none');
    }

    // ── Tab activation (resize + refresh) ────────────

    async onTabActivated() {
        if (this.mapView?.map) {
            this.mapView.map.resize();
        }
        await this.refresh();
    }

    // ── Helpers ──────────────────────────────────────

    _setStatus(message) {
        const el = this.element?.querySelector('[data-region="status"]');
        if (!el) return;
        el.textContent    = message || '';
        el.style.display  = message ? 'block' : 'none';
    }
}

export default LoginLocationMapView;
