import { Page } from 'web-mojo';

/**
 * LocationExample — canonical demo of browser geolocation + tracking.
 *
 * Doc:    docs/web-mojo/extensions/Location.md
 * Route:  extensions/location
 *
 * Wraps `navigator.geolocation` in two flavours: one-shot
 * `getCurrentPosition()` for a single fix, and `watchPosition()` for live
 * updates. Permission denial, API absence, and timeouts all funnel through a
 * single `errorMessage` so the UI degrades cleanly. For server-side
 * geocoding / reverse-geocoding see `LocationClient` from `web-mojo/map`.
 */
class LocationExample extends Page {
    static pageName = 'extensions/location';
    static route = 'extensions/location';

    constructor(options = {}) {
        super({
            ...options,
            pageName: LocationExample.pageName,
            route: LocationExample.route,
            title: 'Location — browser geolocation',
            template: LocationExample.TEMPLATE,
        });
        this.position = null;
        this.errorMessage = null;
        this.watchId = null;
        this.updateCount = 0;
    }

    async onExit() {
        this._stopWatch();
        await super.onExit?.();
    }

    onActionRequestLocation() {
        if (!('geolocation' in navigator)) {
            this.errorMessage = 'Geolocation is not available in this browser.';
            this.render();
            return;
        }
        this.errorMessage = null;
        this.render();
        navigator.geolocation.getCurrentPosition(
            (pos) => this._handlePosition(pos),
            (err) => this._handleError(err),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    }

    onActionStartWatch() {
        if (!('geolocation' in navigator)) {
            this.errorMessage = 'Geolocation is not available in this browser.';
            this.render();
            return;
        }
        this._stopWatch();
        this.updateCount = 0;
        this.errorMessage = null;
        this.watchId = navigator.geolocation.watchPosition(
            (pos) => { this.updateCount += 1; this._handlePosition(pos); },
            (err) => this._handleError(err),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
        );
        this.render();
    }

    onActionStopWatch() { this._stopWatch(); this.render(); }

    _stopWatch() {
        if (this.watchId !== null && 'geolocation' in navigator) {
            navigator.geolocation.clearWatch(this.watchId);
        }
        this.watchId = null;
    }

    _handlePosition(pos) {
        const c = pos.coords;
        this.position = {
            lat: c.latitude.toFixed(6),
            lng: c.longitude.toFixed(6),
            accuracy: Math.round(c.accuracy),
            timestamp: new Date(pos.timestamp).toLocaleTimeString(),
        };
        this.render();
    }

    _handleError(err) {
        const map = { 1: 'Permission denied', 2: 'Position unavailable', 3: 'Timed out' };
        this.errorMessage = `${map[err.code] || 'Geolocation error'} — ${err.message || 'no details'}`;
        this.render();
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>Location</h1>
            <p class="example-summary">
                Browser geolocation: one-shot fix and live watch with permission-denial handling.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="https://github.com/NativeMojo/web-mojo/blob/main/docs/web-mojo/extensions/Location.md" target="_blank">
                    docs/web-mojo/extensions/Location.md
                </a>
            </p>

            <div class="card">
                <div class="card-body">
                    <div class="d-flex flex-wrap gap-2 mb-3">
                        <button class="btn btn-primary" data-action="request-location">
                            <i class="bi bi-geo-alt"></i> Request location
                        </button>
                        {{^watchId|bool}}
                            <button class="btn btn-outline-primary" data-action="start-watch">
                                <i class="bi bi-broadcast"></i> Start watch
                            </button>
                        {{/watchId|bool}}
                        {{#watchId|bool}}
                            <button class="btn btn-outline-danger" data-action="stop-watch">
                                <i class="bi bi-stop-circle"></i> Stop watch ({{updateCount}} updates)
                            </button>
                        {{/watchId|bool}}
                    </div>

                    {{#errorMessage|bool}}
                        <div class="alert alert-warning mb-3">{{errorMessage}}</div>
                    {{/errorMessage|bool}}

                    {{#position|bool}}
                        <dl class="row mb-0 small">
                            <dt class="col-sm-3">Latitude</dt>  <dd class="col-sm-9"><code>{{position.lat}}</code></dd>
                            <dt class="col-sm-3">Longitude</dt> <dd class="col-sm-9"><code>{{position.lng}}</code></dd>
                            <dt class="col-sm-3">Accuracy</dt>  <dd class="col-sm-9">±{{position.accuracy}} m</dd>
                            <dt class="col-sm-3">At</dt>        <dd class="col-sm-9">{{position.timestamp}}</dd>
                        </dl>
                    {{/position|bool}}
                    {{^position|bool}}
                        <p class="text-muted mb-0">Click <em>Request location</em> — your browser will prompt for permission.</p>
                    {{/position|bool}}
                </div>
            </div>
        </div>
    `;
}

export default LocationExample;
