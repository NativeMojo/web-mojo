/**
 * LocationDetailsView - Displays a formatted address and an optional map preview.
 *
 * Usage:
 *   new LocationDetailsView({
 *     details: {
 *       formatted_address: '1600 Amphitheatre Pkwy...',
 *       latitude: 37.422,
 *       longitude: -122.084,
 *       place_id: '...'
 *     },
 *     height: 260,
 *     tileLayer: 'osm'
 *   });
 */

import View from '@core/View.js';
import MapView from '../MapView.js';

export default class LocationDetailsView extends View {
  /**
   * @param {Object} options
   * @param {Object} [options.details] - Address details (formatted_address, latitude, longitude, place_id, etc.)
   * @param {number} [options.height=260] - Map height (px)
   * @param {string} [options.tileLayer='osm'] - Tile layer key for MapView
   */
  constructor({ details = {}, height = 260, tileLayer = 'osm' } = {}) {
    super({
      className: 'location-details-view'
    });

    this.details = details || {};
    this.height = Number.isFinite(height) ? height : 260;
    this.tileLayer = tileLayer || 'osm';

    // Expose flattened fields for Mustache (view is the template context)
    this.formatted_address = this.details.formatted_address || '';
    this.place_id = this.details.place_id || '';
    this.latitude =
      this._toNumber(this.details.latitude ?? this.details.lat ?? null);
    this.longitude =
      this._toNumber(this.details.longitude ?? this.details.lng ?? null);

    this.hasCoords = Number.isFinite(this.latitude) && Number.isFinite(this.longitude);

    // Keep a reference to child map view (if created)
    this._mapView = null;

    // Simple, framework-friendly template with a child container for the map
    this.template = `
      <div class="loc-details">
        {{#formatted_address}}
          <div class="mb-2 fw-semibold" style="word-break: break-word;">
            {{formatted_address}}
          </div>
        {{/formatted_address}}

        {{#place_id}}
          <div class="text-muted small mb-2">Place ID: {{place_id}}</div>
        {{/place_id}}

        {{^formatted_address}}
          <div class="text-muted small mb-2">No formatted address provided</div>
        {{/formatted_address}}

        {{#hasCoords}}
          <div data-container="map"></div>
        {{/hasCoords}}

        {{^hasCoords}}
          <div class="text-muted small" style="border: 1px dashed #e5e7eb; border-radius: 8px; padding: 12px;">
            No coordinates available for map preview
          </div>
        {{/hasCoords}}
      </div>
    `;
  }

  async onInit() {
    // Create child map view only if we have coordinates
    if (this.hasCoords) {
      const markers = [{
        lat: this.latitude,
        lng: this.longitude,
        popup: this.formatted_address || ''
      }];

      this._mapView = new MapView({
        markers,
        center: [this.latitude, this.longitude],
        zoom: 13,
        height: this.height,
        tileLayer: this.tileLayer,
        showLayerControl: true,
        containerId: 'map'
      });

      this.addChild(this._mapView);
    }
  }

  _toNumber(v) {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
}