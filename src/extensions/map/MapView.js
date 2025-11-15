/**
 * MapView - Interactive map component using Leaflet
 *
 * Features:
 * - Display single or multiple markers
 * - Auto-zoom to fit markers
 * - Customizable marker popups
 * - Support for different tile layers
 *
 * @example
 * const mapView = new MapView({
 *   markers: [
 *     { lat: 37.422, lng: -122.084, popup: 'Mountain View, CA' }
 *   ],
 *   zoom: 10,
 *   height: 400
 * });
 */

import View from '@core/View.js';

class MapView extends View {
    constructor(options = {}) {
        super({
            className: 'map-view',
            ...options
        });

        this.markers = options.markers || [];
        this.center = options.center || null;
        this.zoom = options.zoom || 13;
        this.height = options.height || 400;
        this.showZoomControl = options.showZoomControl !== false;
        this.tileLayer = options.tileLayer || 'osm'; // 'osm', 'satellite', 'terrain'
        this.showLeafletBranding = options.showLeafletBranding === true;
        this.showLayerControl = options.showLayerControl === true;
        this.layerOptions = options.layerOptions || {
            osm: 'OSM',
            satellite: 'Satellite',
            terrain: 'Terrain',
            dark: 'Dark',
            light: 'Light',
            watercolor: 'Watercolor',
            bw: 'B/W',
            streets: 'Streets'
        };

        this.map = null;
        this.leafletMarkers = [];
        this._tileLayer = null;

        this.template = `
            <div class="map-container">
                <div id="map-{{id}}" style="height: {{height}}px; width: 100%; border-radius: 0.375rem; border: 1px solid #dee2e6;"></div>
            </div>
        `;
    }

    async onAfterRender() {
        await this.loadLeaflet();
        await this.initializeMap();
    }

    async loadLeaflet() {
        // Check if Leaflet is already loaded
        if (window.L) return;

        // Load Leaflet CSS and wait for it
        const cssLoaded = new Promise((resolve) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            link.onload = resolve;
            link.onerror = resolve; // Continue even if CSS fails
            document.head.appendChild(link);
        });

        // Load Leaflet JS
        const jsLoaded = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });

        // Wait for both CSS and JS to load
        await Promise.all([cssLoaded, jsLoaded]);
    }

    getTileLayerUrl() {
        const tileLayers = {
            // Standard street maps
            osm: {
                url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19
            },

            // Satellite imagery
            satellite: {
                url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                attribution: '© Esri',
                maxZoom: 19
            },

            // Terrain and topographic
            terrain: {
                url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
                attribution: '© OpenTopoMap contributors',
                maxZoom: 17
            },

            // Dark mode styles
            dark: {
                url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
                attribution: '© OpenStreetMap contributors © CARTO',
                maxZoom: 20
            },

            // Light/minimal styles
            light: {
                url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
                attribution: '© OpenStreetMap contributors © CARTO',
                maxZoom: 20
            },

            // Watercolor artistic style
            watercolor: {
                url: 'https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.jpg',
                attribution: '© Stadia Maps © Stamen Design © OpenStreetMap contributors',
                maxZoom: 16
            },

            // Black and white
            bw: {
                url: 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png',
                attribution: '© OpenStreetMap contributors © CARTO',
                maxZoom: 20
            },

            // Streets with labels
            streets: {
                url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
                attribution: '© OpenStreetMap contributors © CARTO',
                maxZoom: 20
            }
        };

        return tileLayers[this.tileLayer] || tileLayers.osm;
    }

    async initializeMap() {
        const mapElement = this.element.querySelector(`#map-${this.id}`);
        if (!mapElement || !window.L) return;

        // Determine map center
        let mapCenter = this.center;
        if (!mapCenter && this.markers.length > 0) {
            // Use first marker as center
            mapCenter = [this.markers[0].lat, this.markers[0].lng];
        }
        if (!mapCenter) {
            // Default to world view
            mapCenter = [0, 0];
        }

        // Create map
        this.map = window.L.map(mapElement, {
            center: mapCenter,
            zoom: this.zoom,
            zoomControl: this.showZoomControl
        });
        // Optionally hide Leaflet branding/prefix (removes Leaflet link/flag in attribution control)
        if (this.map && this.map.attributionControl && this.showLeafletBranding === false) {
            try { this.map.attributionControl.setPrefix(''); } catch (e) {}
        }

        // Add tile layer
        const tileConfig = this.getTileLayerUrl();
        this._tileLayer = window.L.tileLayer(tileConfig.url, {
            attribution: tileConfig.attribution,
            maxZoom: tileConfig.maxZoom
        }).addTo(this.map);

        // Optional built-in tile layer selector UI
        if (this.showLayerControl) {
            const container = mapElement.parentElement || this.element.querySelector('.map-container');
            if (container) {
                container.style.position = container.style.position || 'relative';
                const selector = document.createElement('select');
                selector.className = 'form-select form-select-sm';
                selector.style.position = 'absolute';
                selector.style.top = '8px';
                selector.style.right = '8px';
                selector.style.zIndex = '1000';
                selector.style.maxWidth = '180px';
                selector.setAttribute('aria-label', 'Map tile layer');

                // Populate options
                Object.entries(this.layerOptions || {}).forEach(([key, label]) => {
                    const opt = document.createElement('option');
                    opt.value = key;
                    opt.textContent = label;
                    if (key === this.tileLayer) opt.selected = true;
                    selector.appendChild(opt);
                });

                selector.addEventListener('change', () => this.setTileLayer(selector.value));
                container.appendChild(selector);
            }
        }

        // Add markers
        this.addMarkers(this.markers);

        // Auto-fit bounds if multiple markers
        if (this.markers.length > 1) {
            this.fitBounds();
        }

        // Fix tile rendering issues by invalidating size after a delay
        // This ensures the container has proper dimensions and CSS is applied
        setTimeout(() => {
            if (this.map) {
                this.map.invalidateSize();
            }
        }, 300);
    }

    addMarkers(markers) {
        if (!this.map || !Array.isArray(markers)) return;

        markers.forEach(markerData => {
            const { lat, lng, popup, icon } = markerData;

            if (!lat || !lng) return;

            const markerOptions = {};

            // Custom icon if provided
            if (icon) {
                markerOptions.icon = window.L.icon(icon);
            }

            const marker = window.L.marker([lat, lng], markerOptions).addTo(this.map);

            // Add popup if provided
            if (popup) {
                marker.bindPopup(popup);
            }

            this.leafletMarkers.push(marker);
        });
    }

    fitBounds() {
        if (!this.map || this.leafletMarkers.length === 0) return;

        const group = new window.L.featureGroup(this.leafletMarkers);
        this.map.fitBounds(group.getBounds().pad(0.1));
    }

    updateMarkers(newMarkers) {
        // Clear existing markers
        this.clearMarkers();

        // Add new markers
        this.markers = newMarkers;
        this.addMarkers(newMarkers);

        // Fit bounds if multiple markers
        if (newMarkers.length > 1) {
            this.fitBounds();
        } else if (newMarkers.length === 1) {
            this.map.setView([newMarkers[0].lat, newMarkers[0].lng], this.zoom);
        }
    }

    clearMarkers() {
        this.leafletMarkers.forEach(marker => {
            this.map.removeLayer(marker);
        });
        this.leafletMarkers = [];
    }

    setView(lat, lng, zoom = null) {
        if (!this.map) return;
        this.map.setView([lat, lng], zoom || this.zoom);
    }

    setZoom(zoom) {
        if (!this.map) return;
        this.map.setZoom(zoom);
    }

    setTileLayer(key) {
        if (!this.map) return;
        // Resolve tile layer config using the same logic as getTileLayerUrl
        const original = this.tileLayer;
        this.tileLayer = key || this.tileLayer;
        const tileConfig = this.getTileLayerUrl();
        try {
            if (this._tileLayer) {
                this.map.removeLayer(this._tileLayer);
            }
        } catch (e) {
            // ignore if layer already removed
        }
        this._tileLayer = window.L.tileLayer(tileConfig.url, {
            attribution: tileConfig.attribution,
            maxZoom: tileConfig.maxZoom
        }).addTo(this.map);
        // Keep property in sync
        this.tileLayer = key || original;

        // Nudge map to ensure proper redraw
        setTimeout(() => {
            try { this.map.invalidateSize(); } catch (e) {}
        }, 150);
    }

    async onBeforeDestroy() {
        if (this.map) {
            this.map.remove();
            this.map = null;
        }
        await super.onBeforeDestroy();
    }

    static async showAsDialog(options = {}) {
        const view = new MapView(options);
        const dopts = options.dialogOptions || {};
        const dialogOptions = {
            title: "Map View",
            header: true,
            body: view,
            size: 'lg',
            centered: false,
            ...dopts
        }
        await view.init();
        await view.getApp().showDialog(dialogOptions);
    }
}

export default MapView;
