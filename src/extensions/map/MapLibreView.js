/**
 * MapLibreView - Interactive vector map component using MapLibre GL JS
 * 
 * MapLibre GL is better for:
 * - Vector tiles and custom styling
 * - 3D terrain and buildings
 * - High-performance rendering
 * - Heat maps and data visualizations
 * - Complex animations
 * 
 * Use MapView (Leaflet) for simple marker maps.
 * Use MapLibreView for advanced visualizations.
 * 
 * @example
 * const mapView = new MapLibreView({
 *   markers: [
 *     { lng: -122.084, lat: 37.422, popup: 'Mountain View, CA' }
 *   ],
 *   style: 'streets', // 'streets', 'satellite', 'dark', 'light'
 *   zoom: 10,
 *   height: 400
 * });
 */

import View from '@core/View.js';

class MapLibreView extends View {
    constructor(options = {}) {
        super({
            className: 'maplibre-view',
            ...options
        });

        this.markers = options.markers || [];
        this.center = options.center || null;
        this.zoom = options.zoom || 13;
        this.height = options.height || 400;
        this.pitch = options.pitch || 0; // 0-60 degrees (3D tilt)
        this.bearing = options.bearing || 0; // 0-360 degrees (rotation)
        this.mapStyle = options.style || 'streets'; // 'streets', 'satellite', 'dark', 'light', 'terrain'
        this.showNavigationControl = options.showNavigationControl !== false;
        this.autoFitBounds = options.autoFitBounds !== false;
        
        this.map = null;
        this.mapMarkers = [];
        this.pendingMarkers = [...this.markers];
        this.lineSources = options.lineSources || [];
        this.pendingLineData = new Map();

        this.template = `
            <div class="maplibre-container">
                <div id="maplibre-{{id}}" style="height: {{height}}px; width: 100%; border-radius: 0.375rem; border: 1px solid #dee2e6;"></div>
            </div>
        `;
    }

    async onAfterRender() {
        await this.loadMapLibre();
        await this.initializeMap();
    }

    async loadMapLibre() {
        // Check if MapLibre is already loaded
        if (window.maplibregl) return;

        // Load MapLibre CSS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css';
        document.head.appendChild(link);

        // Load MapLibre JS
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    getMapStyle() {
        const styles = {
            streets: 'https://demotiles.maplibre.org/style.json',
            dark: {
                version: 8,
                sources: {
                    osm: {
                        type: 'raster',
                        tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
                        tileSize: 256,
                        attribution: '© OpenStreetMap contributors'
                    }
                },
                layers: [{
                    id: 'osm',
                    type: 'raster',
                    source: 'osm'
                }],
                glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf'
            },
            light: {
                version: 8,
                sources: {
                    osm: {
                        type: 'raster',
                        tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
                        tileSize: 256,
                        attribution: '© OpenStreetMap contributors'
                    }
                },
                layers: [{
                    id: 'osm',
                    type: 'raster',
                    source: 'osm'
                }],
                glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf'
            },
            satellite: {
                version: 8,
                sources: {
                    satellite: {
                        type: 'raster',
                        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
                        tileSize: 256,
                        attribution: '© Esri'
                    }
                },
                layers: [{
                    id: 'satellite',
                    type: 'raster',
                    source: 'satellite'
                }],
                glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf'
            },
            terrain: {
                version: 8,
                sources: {
                    terrain: {
                        type: 'raster',
                        tiles: ['https://a.tile.opentopomap.org/{z}/{x}/{y}.png'],
                        tileSize: 256,
                        attribution: '© OpenTopoMap contributors'
                    }
                },
                layers: [{
                    id: 'terrain',
                    type: 'raster',
                    source: 'terrain'
                }],
                glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf'
            }
        };

        return styles[this.mapStyle] || styles.streets;
    }

    async initializeMap() {
        const mapElement = this.element.querySelector(`#maplibre-${this.id}`);
        if (!mapElement || !window.maplibregl) return;

        // Determine map center
        let mapCenter = this.center;
        if (!mapCenter && this.markers.length > 0) {
            // Use first marker as center (MapLibre uses [lng, lat])
            mapCenter = [this.markers[0].lng, this.markers[0].lat];
        }
        if (!mapCenter) {
            // Default to world view
            mapCenter = [0, 0];
        }

        // Create map
        this.map = new window.maplibregl.Map({
            container: mapElement,
            style: this.getMapStyle(),
            center: mapCenter,
            zoom: this.zoom,
            pitch: this.pitch,
            bearing: this.bearing
        });

        // Add navigation control
        if (this.showNavigationControl) {
            this.map.addControl(new window.maplibregl.NavigationControl(), 'top-right');
        }

        // Wait for map to load before adding markers
        this.map.on('load', () => {
            const initialMarkers = this.pendingMarkers.length ? this.pendingMarkers : this.markers;
            this.updateMarkers(initialMarkers);
            this.lineSources.forEach(source => this.addLineSource(source));
            this.pendingLineData.forEach(source => this.addLineSource(source));
            this.pendingLineData.clear();
        });
    }

    addMarkers(markers) {
        if (!this.map || !Array.isArray(markers)) {
            this.pendingMarkers = Array.isArray(markers) ? markers : [];
            return;
        }

        markers.forEach(markerData => {
            const { lng, lat, popup, color, icon, size } = markerData;
            
            if (!lng || !lat) return;

            // Create marker element
            const el = document.createElement('div');
            el.className = 'maplibre-marker';
            const markerSize = Number(size) || 30;
            el.style.width = `${markerSize}px`;
            el.style.height = `${markerSize}px`;
            el.style.borderRadius = '50%';
            el.style.backgroundColor = color || '#3b82f6';
            el.style.border = '3px solid white';
            el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
            el.style.cursor = 'pointer';
            el.style.display = 'flex';
            el.style.alignItems = 'center';
            el.style.justifyContent = 'center';

            // Optional icon
            if (icon) {
                el.innerHTML = `<i class="${icon}" style="color: white;"></i>`;
            }

            // Create marker
            const marker = new window.maplibregl.Marker({ element: el })
                .setLngLat([lng, lat])
                .addTo(this.map);

            // Add popup if provided
            if (popup) {
                const mapPopup = new window.maplibregl.Popup({ offset: 25 })
                    .setHTML(popup);
                marker.setPopup(mapPopup);
            }

            this.mapMarkers.push(marker);
        });
    }

    fitBounds() {
        if (!this.map || this.markers.length === 0) return;

        const bounds = new window.maplibregl.LngLatBounds();
        
        this.markers.forEach(marker => {
            bounds.extend([marker.lng, marker.lat]);
        });

        this.map.fitBounds(bounds, {
            padding: 50,
            maxZoom: 15
        });
    }

    updateMarkers(newMarkers) {
        const markers = Array.isArray(newMarkers) ? newMarkers : [];
        this.markers = markers;
        this.pendingMarkers = markers;
        if (!this.map) return;

        this.clearMarkers();
        this.addMarkers(markers);

        if (this.autoFitBounds && markers.length > 1) {
            this.fitBounds();
        } else if (markers.length === 1 && this.map) {
            this.map.flyTo({
                center: [markers[0].lng, markers[0].lat],
                zoom: this.zoom
            });
        }
    }

    clearMarkers() {
        this.mapMarkers.forEach(marker => {
            marker.remove();
        });
        this.mapMarkers = [];
    }

    addLineSource({ id, data, paint, layout }) {
        if (!id || !data) return;

        const sourceId = `${id}-source`;

        if (!this.map) {
            this.pendingLineData.set(id, { id, data, paint, layout });
            return;
        }

        if (this.map.getLayer(id)) {
            this.map.removeLayer(id);
        }
        if (this.map.getSource(sourceId)) {
            this.map.removeSource(sourceId);
        }

        this.map.addSource(sourceId, {
            type: 'geojson',
            data
        });

        this.map.addLayer({
            id,
            type: 'line',
            source: sourceId,
            paint: {
                'line-color': '#3b82f6',
                'line-width': 2,
                'line-opacity': 0.6,
                ...paint
            },
            layout: {
                'line-cap': 'round',
                'line-join': 'round',
                ...layout
            }
        });
    }

    updateLineSource(id, { data, paint, layout } = {}) {
        if (!id || !data) return;
        const sourceId = `${id}-source`;
        if (!this.map) {
            this.pendingLineData.set(id, { id, data, paint, layout });
            return;
        }
        if (this.map.getSource(sourceId)) {
            this.map.getSource(sourceId).setData(data);
            if (paint || layout) {
                if (paint) {
                    Object.entries(paint).forEach(([key, value]) => {
                        this.map.setPaintProperty(id, key, value);
                    });
                }
                if (layout) {
                    Object.entries(layout).forEach(([key, value]) => {
                        this.map.setLayoutProperty(id, key, value);
                    });
                }
            }
        } else {
            this.addLineSource({ id, data, paint, layout });
        }
    }

    setView(lng, lat, zoom = null) {
        if (!this.map) return;
        this.map.flyTo({
            center: [lng, lat],
            zoom: zoom || this.zoom
        });
    }

    setZoom(zoom) {
        if (!this.map) return;
        this.map.setZoom(zoom);
    }

    setPitch(pitch) {
        if (!this.map) return;
        this.map.setPitch(pitch);
    }

    setBearing(bearing) {
        if (!this.map) return;
        this.map.setBearing(bearing);
    }

    async onBeforeDestroy() {
        if (this.map) {
            this.map.remove();
            this.map = null;
        }
        await super.onBeforeDestroy();
    }
}

export default MapLibreView;
