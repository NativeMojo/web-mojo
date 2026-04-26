import { Page } from 'web-mojo';
import { MapView } from 'web-mojo/map';

/**
 * MapViewExample — canonical demo of the MapView extension.
 *
 * Doc:    docs/web-mojo/extensions/MapView.md
 * Route:  extensions/map-view
 *
 * MapView wraps Leaflet (loaded from CDN — no API key required) for simple
 * marker-based maps. Pass `markers: [...]`, drop a `<div data-container>` slot,
 * and the framework auto-fits the bounds. The buttons below switch the
 * underlying tile layer at runtime via `setTileLayer()`.
 *
 * Copy-paste recipe: instantiate MapView with `markers` + `containerId`,
 * `addChild()` it into the page, and call `setMarkers()` / `setTileLayer()`
 * for live updates.
 */
class MapViewExample extends Page {
    static pageName = 'extensions/map-view';
    static route = 'extensions/map-view';

    constructor(options = {}) {
        super({
            ...options,
            pageName: MapViewExample.pageName,
            route: MapViewExample.route,
            title: 'MapView — Leaflet markers',
            template: MapViewExample.TEMPLATE,
        });
    }

    async onInit() {
        await super.onInit();

        this.map = new MapView({
            containerId: 'map-slot',
            markers: [
                { lat: 37.7749, lng: -122.4194, popup: '<strong>San Francisco</strong>' },
                { lat: 34.0522, lng: -118.2437, popup: '<strong>Los Angeles</strong>' },
                { lat: 40.7128, lng: -74.0060, popup: '<strong>New York</strong>' },
                { lat: 41.8781, lng: -87.6298, popup: '<strong>Chicago</strong>' },
            ],
            zoom: 4,
            height: 480,
            tileLayer: 'osm',
        });
        this.addChild(this.map);
    }

    onActionSetTiles(event, element) {
        const layer = element.getAttribute('data-layer');
        if (this.map && typeof this.map.setTileLayer === 'function') {
            this.map.setTileLayer(layer);
        }
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>MapView</h1>
            <p class="example-summary">
                Leaflet-backed marker map. CDN-loaded, no API key. Auto-zooms to fit all markers.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/extensions/MapView.md">
                    docs/web-mojo/extensions/MapView.md
                </a>
            </p>

            <div class="card">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <span>US cities</span>
                    <div class="btn-group btn-group-sm" role="group">
                        <button class="btn btn-outline-secondary" data-action="set-tiles" data-layer="osm">
                            Streets
                        </button>
                        <button class="btn btn-outline-secondary" data-action="set-tiles" data-layer="satellite">
                            Satellite
                        </button>
                        <button class="btn btn-outline-secondary" data-action="set-tiles" data-layer="dark">
                            Dark
                        </button>
                    </div>
                </div>
                <div class="card-body p-0">
                    <div data-container="map-slot"></div>
                </div>
            </div>
        </div>
    `;
}

export default MapViewExample;
