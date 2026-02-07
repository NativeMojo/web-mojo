/**
 * MOJO Map Extension
 * 
 * Interactive map components using Leaflet
 * 
 * @module web-mojo/map
 * @example
 * import { MapView, registerLocationPlugin } from 'web-mojo/map';
 * registerLocationPlugin();
 */

// Map views
export { default as MapView } from './extensions/map/MapView.js';
export { default as MapLibreView } from './extensions/map/MapLibreView.js';
export { default as MetricsCountryMapView } from './extensions/map/MetricsCountryMapView.js';

// Location helpers (address suggestions + dialogs)
export { default as LocationClient } from './extensions/map/location/LocationClient.js';
export { useLocationAutocomplete } from './extensions/map/location/useLocationAutocomplete.js';
export { default as LocationDetailsView } from './extensions/map/location/LocationDetailsView.js';
export { showLocationDetailsDialog, showLocationPickerDialog } from './extensions/map/location/LocationDialogs.js';
export { registerLocationPlugin, LocationFormPlugin } from './extensions/map/location/LocationPlugin.js';

// Re-export core dependencies that might be needed
export { default as View } from './core/View.js';
export { default as Collection } from './core/Collection.js';
export { default as Model } from './core/Model.js';
