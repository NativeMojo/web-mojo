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
        
        this.map = null;
        this.leafletMarkers = [];

        this.template = `
            <div class="map-container">
                <div id="map-{{viewId}}" style="height: {{height}}px; width: 100%; border-radius: 0.375rem; border: 1px solid #dee2e6;"></div>
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

        // Load Leaflet CSS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);

        // Load Leaflet JS
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    getTileLayerUrl() {
        const tileLayers = {
            osm: {
                url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                attribution: '© OpenStreetMap contributors'
            },
            satellite: {
                url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                attribution: '© Esri'
            },
            terrain: {
                url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
                attribution: '© OpenTopoMap contributors'
            }
        };

        return tileLayers[this.tileLayer] || tileLayers.osm;
    }

    async initializeMap() {
        const mapElement = this.element.querySelector(`#map-${this.viewId}`);
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

        // Add tile layer
        const tileConfig = this.getTileLayerUrl();
        window.L.tileLayer(tileConfig.url, {
            attribution: tileConfig.attribution,
            maxZoom: 19
        }).addTo(this.map);

        // Add markers
        this.addMarkers(this.markers);

        // Auto-fit bounds if multiple markers
        if (this.markers.length > 1) {
            this.fitBounds();
        }
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

    async onBeforeDestroy() {
        if (this.map) {
            this.map.remove();
            this.map = null;
        }
        await super.onBeforeDestroy();
    }
}

export default MapView;
