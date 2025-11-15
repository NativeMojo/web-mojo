/**
 * Map Extension Index
 * Exposes core map views and optional location helpers (client, plugin, dialogs).
 *
 * Nothing here is auto-registered. Consumers can import the specific pieces they need.
 * Example:
 *   import { MapView, registerLocationPlugin } from '@ext/map';
 *   registerLocationPlugin({ baseURL: '/api' });
 */

// Core map views
export { default as MapView } from './MapView.js';
export { default as MapLibreView } from './MapLibreView.js';

// Location API client and helpers
export { default as LocationClient } from './location/LocationClient.js';
export { default as useLocationAutocomplete } from './location/useLocationAutocomplete.js';
export { default as LocationDetailsView } from './location/LocationDetailsView.js';
export { showLocationDetailsDialog, showLocationPickerDialog } from './location/LocationDialogs.js';
export { registerLocationPlugin, LocationFormPlugin } from './location/LocationPlugin.js';

// Optional default namespace export for convenience
import MapViewNS from './MapView.js';
import MapLibreViewNS from './MapLibreView.js';
import LocationClientNS from './location/LocationClient.js';
import useLocationAutocompleteNS from './location/useLocationAutocomplete.js';
import LocationDetailsViewNS from './location/LocationDetailsView.js';
import * as LocationDialogsNS from './location/LocationDialogs.js';
import { registerLocationPlugin as registerLocationPluginNS, LocationFormPlugin as LocationFormPluginNS } from './location/LocationPlugin.js';

export default {
  MapView: MapViewNS,
  MapLibreView: MapLibreViewNS,
  LocationClient: LocationClientNS,
  useLocationAutocomplete: useLocationAutocompleteNS,
  LocationDetailsView: LocationDetailsViewNS,
  ...LocationDialogsNS,
  registerLocationPlugin: registerLocationPluginNS,
  LocationFormPlugin: LocationFormPluginNS
};