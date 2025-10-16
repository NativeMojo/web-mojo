/**
 * MOJO Map Extension
 * 
 * Interactive map components using Leaflet
 * 
 * @module web-mojo/map
 * @example
 * import { MapView } from 'web-mojo/map';
 * import 'web-mojo/map/style.css';
 */

// Export map components
export { default as MapView } from './extensions/map/MapView.js';

// Re-export core dependencies that might be needed
export { default as View } from './core/View.js';
export { default as Collection } from './core/Collection.js';
export { default as Model } from './core/Model.js';
