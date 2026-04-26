import { Page } from 'web-mojo';
import { MapLibreView } from 'web-mojo/map';

/**
 * MapLibreViewExample — canonical demo of the MapLibreView extension.
 *
 * Doc:    docs/web-mojo/extensions/MapLibreView.md
 * Route:  extensions/map-libre-view
 *
 * MapLibreView wraps MapLibre GL JS (loaded from CDN — no API key required)
 * for vector-tile, WebGL-rendered maps with 3D pitch / bearing support. Pass
 * `markers` (note: lng before lat — GeoJSON order), `style:`, and optional
 * `pitch:` / `bearing:`. The buttons below toggle a flat top-down view and a
 * 3D tilted view.
 *
 * Copy-paste recipe: instantiate MapLibreView with `markers` + `containerId`,
 * `addChild()` into the page, and use `setPitch()` / `setBearing()` to drive it.
 */
class MapLibreViewExample extends Page {
    static pageName = 'extensions/map-libre-view';
    static route = 'extensions/map-libre-view';

    constructor(options = {}) {
        super({
            ...options,
            pageName: MapLibreViewExample.pageName,
            route: MapLibreViewExample.route,
            title: 'MapLibreView — vector tiles',
            template: MapLibreViewExample.TEMPLATE,
        });
    }

    async onInit() {
        await super.onInit();

        this.map = new MapLibreView({
            containerId: 'map-slot',
            markers: [
                { lng: -122.4194, lat: 37.7749, popup: '<strong>San Francisco</strong>', color: '#0d6efd' },
                { lng: -118.2437, lat: 34.0522, popup: '<strong>Los Angeles</strong>',  color: '#dc3545' },
                { lng: -74.0060,  lat: 40.7128, popup: '<strong>New York</strong>',     color: '#198754' },
            ],
            zoom: 3.5,
            pitch: 0,
            bearing: 0,
            height: 480,
            style: 'streets',
        });
        this.addChild(this.map);
    }

    onActionSetView(event, element) {
        const mode = element.getAttribute('data-mode');
        if (!this.map || typeof this.map.setPitch !== 'function') return;
        if (mode === '3d') {
            this.map.setPitch(55);
            this.map.setBearing(-20);
        } else {
            this.map.setPitch(0);
            this.map.setBearing(0);
        }
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>MapLibreView</h1>
            <p class="example-summary">
                Vector-tile map with 3D pitch + bearing support. CDN-loaded, no API key.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/extensions/MapLibreView.md">
                    docs/web-mojo/extensions/MapLibreView.md
                </a>
            </p>

            <div class="card">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <span>Coast-to-coast</span>
                    <div class="btn-group btn-group-sm" role="group">
                        <button class="btn btn-outline-secondary" data-action="set-view" data-mode="flat">
                            Flat
                        </button>
                        <button class="btn btn-outline-secondary" data-action="set-view" data-mode="3d">
                            3D tilt
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

export default MapLibreViewExample;
