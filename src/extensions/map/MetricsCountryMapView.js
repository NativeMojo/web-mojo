import View from '@core/View.js';
import MapLibreView from './MapLibreView.js';
import { COUNTRY_CENTROIDS } from './countryCentroids.js';

class MetricsCountryMapView extends View {
    constructor(options = {}) {
        const mapHeight = options.height || 320;
        super({
            className: 'metrics-country-map-view',
            ...options
        });

        this.endpoint = options.endpoint || '/api/metrics/fetch';
        this.account = options.account || 'global';
        this.category = options.category || null;
        this.slugs = options.slugs || null;
        this.granularity = options.granularity || 'days';
        this.maxCountries = options.maxCountries || 12;
        this.metricLabel = options.metricLabel || 'Events';
        this.height = mapHeight;
        this.mapStyle = options.mapStyle || 'dark';
        this.mapOptions = options.mapOptions || {};
        this.showRoutes = options.showRoutes !== false;
        this.routeOrigin = options.routeOrigin || { lng: -77.346, lat: 38.958, name: 'Reston, VA' };
        this._refreshing = false;
    }

    async getTemplate() {
        return `
            <div class="metrics-country-map">
                <div class="map-container mb-3" data-container="${this.id}-map" style="height:${this.height}px"></div>
                <div class="map-legend small" data-region="legend"></div>
            </div>
        `;
    }

    async onInit() {
        this.statusEl = document.createElement('div');
        this.statusEl.className = 'text-muted small px-3 pb-2';
        this.element.appendChild(this.statusEl);

        this.mapView = new MapLibreView({
            containerId: `${this.id}-map`,
            height: this.height,
            style: this.mapStyle,
            zoom: this.mapOptions.zoom ?? 1.3,
            center: this.mapOptions.center || [10, 20],
            pitch: this.mapOptions.pitch ?? 20,
            bearing: this.mapOptions.bearing ?? 0,
            showNavigationControl: this.mapOptions.showNavigationControl ?? true,
            autoFitBounds: this.mapOptions.autoFitBounds ?? false
        });
        this.addChild(this.mapView);
        await this.refresh();
    }

    async refresh() {
        if (this._refreshing) return;
        this._refreshing = true;
        this.setStatus('Loading hotspots…');
        try {
        const metrics = await this.fetchMetrics();
        await this.applyMetrics(metrics);
            this.setStatus('');
        } catch (error) {
            console.error('MetricsCountryMapView refresh error', error);
            this.setStatus('Unable to load country metrics.');
        } finally {
            this._refreshing = false;
        }
    }

    async fetchMetrics() {
        const rest = this.getApp()?.rest;
        if (!rest) {
            throw new Error('REST client unavailable');
        }
        const params = {
            account: this.account,
            granularity: this.granularity,
            with_labels: true
        };
        if (this.category) params.category = this.category;
        if (this.slugs) {
            const slugsArray = Array.isArray(this.slugs) ? this.slugs : [this.slugs];
            params['slugs[]'] = slugsArray;
        }
        const response = await rest.GET(this.endpoint, params);
        if (!response.success || !response.data?.status) {
            throw new Error(response.data?.error || 'Metrics API error');
        }
        return response.data.data;
    }

    async applyMetrics(data) {
        const metrics = data?.data || {};
        const labels = data?.labels || [];
        const entries = [];

        Object.entries(metrics).forEach(([iso, series]) => {
            const total = series.reduce((sum, value) => sum + (Number(value) || 0), 0);
            if (!total) return;
            const centroid = COUNTRY_CENTROIDS[iso.toUpperCase()];
            if (!centroid) return;
            entries.push({
                code: iso.toUpperCase(),
                total,
                values: series,
                centroid
            });
        });

        if (!entries.length) {
            this.mapView.updateMarkers([]);
            this.renderLegend([]);
            this.setStatus('No country data available for the selected range.');
            return;
        }

        entries.sort((a, b) => b.total - a.total);
        const topEntries = entries.slice(0, this.maxCountries);
        const maxValue = topEntries[0]?.total || 1;

        const markers = topEntries.map(entry => {
            const intensity = entry.total / maxValue;
            const markerSize = Math.round(18 + intensity * 24);
            return {
                lng: entry.centroid.lng,
                lat: entry.centroid.lat,
                size: markerSize,
                color: this.getMarkerColor(intensity),
                popup: `
                    <div class="text-center">
                        <strong>${entry.centroid.name}</strong><br/>
                        <span class="text-muted">${entry.total.toLocaleString()} ${this.metricLabel}</span>
                    </div>
                `
            };
        });

        if (this.showRoutes && this.routeOrigin?.lng && this.routeOrigin?.lat) {
            markers.push({
                lng: this.routeOrigin.lng,
                lat: this.routeOrigin.lat,
                size: 26,
                color: '#0d6efd',
                icon: 'bi bi-broadcast-pin',
                popup: `
                    <div class="text-center">
                        <strong>${this.routeOrigin.name || 'Operations Hub'}</strong><br/>
                        <span class="text-muted">Origin</span>
                    </div>
                `
            });
        }

        this.mapView.updateMarkers(markers);
        this.renderLegend(topEntries, labels);
        if (this.showRoutes) {
            this.renderRoutes(topEntries, maxValue);
        }
    }

    getMarkerColor(intensity) {
        const start = [32, 201, 151]; // teal
        const end = [255, 193, 7];    // amber
        const mix = start.map((value, idx) =>
            Math.round(value + (end[idx] - value) * intensity)
        );
        return `rgba(${mix[0]}, ${mix[1]}, ${mix[2]}, 0.9)`;
    }

    renderLegend(entries) {
        const legendEl = this.element.querySelector('[data-region="legend"]');
        if (!legendEl) return;
        if (!entries.length) {
            legendEl.innerHTML = '';
            return;
        }

        const maxValue = entries[0]?.total || 1;
        const rows = entries.map(entry => {
            const percent = ((entry.total / maxValue) * 100).toFixed(0);
            return `
                <div class="d-flex justify-content-between align-items-center py-1 border-top">
                    <div>
                        <span class="fw-semibold">${entry.centroid.name}</span>
                        <span class="text-muted ms-1">(${entry.code})</span>
                    </div>
                    <div class="text-end">
                        <div class="fw-semibold">${entry.total.toLocaleString()}</div>
                        <small class="text-muted">${percent}% of top</small>
                    </div>
                </div>
            `;
        }).join('');

        legendEl.innerHTML = rows;
    }

    renderRoutes(entries, maxValue) {
        const origin = this.routeOrigin || null;
        if (!origin || !origin.lng || !origin.lat || !this.mapView) return;

        const features = entries.map(entry => ({
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: [
                    [origin.lng, origin.lat],
                    [entry.centroid.lng, entry.centroid.lat]
                ]
            },
            properties: {
                total: entry.total,
                intensity: entry.total / maxValue
            }
        }));

        const geojson = {
            type: 'FeatureCollection',
            features
        };

        const paint = {
            'line-color': [
                'interpolate',
                ['linear'],
                ['get', 'intensity'],
                0,
                'rgba(32, 201, 151, 0.2)',
                1,
                'rgba(255, 193, 7, 0.85)'
            ],
            'line-width': [
                'interpolate',
                ['linear'],
                ['get', 'intensity'],
                0,
                1,
                1,
                5
            ],
            'line-opacity': [
                'interpolate',
                ['linear'],
                ['get', 'intensity'],
                0,
                0.2,
                1,
                0.9
            ]
        };

        this.mapView.lineSources = this.mapView.lineSources.filter(src => src.id !== `${this.id}-routes`);
        this.mapView.updateLineSource(`${this.id}-routes`, {
            data: geojson,
            paint
        });
    }

    setStatus(message) {
        if (!this.statusEl) return;
        this.statusEl.textContent = message || '';
        this.statusEl.style.display = message ? 'block' : 'none';
    }
}

export default MetricsCountryMapView;
