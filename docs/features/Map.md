# Map Extension

**Interactive maps with markers, popups, and visualizations for web-mojo applications**

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
  - [Installation](#installation)
  - [Basic Map](#basic-map)
  - [Map with Multiple Markers](#map-with-multiple-markers)
- [Map Components](#map-components)
  - [MapView (Leaflet)](#mapview-leaflet)
  - [MapLibreView (MapLibre GL)](#maplibreview-maplibre-gl)
  - [MetricsCountryMapView](#metricscountrymapview)
- [API Reference](#api-reference)
  - [MapView](#mapview-api)
  - [MapLibreView](#maplibreview-api)
  - [MetricsCountryMapView](#metricscountrymapview-api)
- [Tile Layers](#tile-layers)
  - [MapView Tile Layers](#mapview-tile-layers)
  - [MapLibreView Styles](#maplibreview-styles)
- [Markers and Popups](#markers-and-popups)
  - [Marker Configuration](#marker-configuration)
  - [Custom Marker Icons](#custom-marker-icons)
  - [Popup Content](#popup-content)
- [Advanced Features](#advanced-features)
  - [Line Sources and Routes](#line-sources-and-routes)
  - [Heat Maps](#heat-maps)
  - [3D Maps and Terrain](#3d-maps-and-terrain)
  - [Custom Styling](#custom-styling)
- [Usage Patterns](#usage-patterns)
  - [Showing Maps in Dialogs](#showing-maps-in-dialogs)
  - [Dynamic Marker Updates](#dynamic-marker-updates)
  - [Integrating with Location Extension](#integrating-with-location-extension)
- [Performance](#performance)
- [Browser Compatibility](#browser-compatibility)
- [Troubleshooting](#troubleshooting)

---

## Overview

The Map extension provides interactive map components for MOJO applications. It includes two core map engines and a specialized metrics visualization component.

**Components:**

| Component | Engine | Best For |
|-----------|--------|----------|
| **MapView** | Leaflet | Simple marker maps, basic interactions |
| **MapLibreView** | MapLibre GL | Vector tiles, 3D terrain, data visualizations |
| **MetricsCountryMapView** | MapLibre GL | Geographic metrics visualization with heatmaps |

**Key Features:**
- Multiple tile layer options (OSM, satellite, terrain, dark, light, etc.)
- Marker clustering and auto-zoom
- Custom popup content with HTML
- Layer controls and navigation
- Integration with Location extension
- Dialog helpers for map selection
- Responsive and mobile-friendly

**Import Path:**
```javascript
import { MapView, MapLibreView, MetricsCountryMapView } from 'web-mojo/map';
```

---

## Quick Start

### Installation

The Map extension is part of the `web-mojo/map` module.

```javascript
import { MapView } from 'web-mojo/map';
```

### Basic Map

```javascript
const mapView = new MapView({
  markers: [
    {
      lat: 37.4224764,
      lng: -122.0842499,
      popup: '<strong>Googleplex</strong><br>1600 Amphitheatre Parkway'
    }
  ],
  zoom: 13,
  height: 400,
  tileLayer: 'osm'
});

await mapView.render(true, container);
```

### Map with Multiple Markers

```javascript
const mapView = new MapView({
  markers: [
    { lat: 37.7749, lng: -122.4194, popup: 'San Francisco' },
    { lat: 34.0522, lng: -118.2437, popup: 'Los Angeles' },
    { lat: 32.7157, lng: -117.1611, popup: 'San Diego' }
  ],
  height: 500,
  tileLayer: 'terrain'
});

await mapView.render(true, container);
// Auto-fits bounds to show all markers
```

---

## Map Components

### MapView (Leaflet)

**When to use:**
- Simple marker maps
- Basic interactions (click, popup)
- Standard tile layers
- Lightweight and fast

**Pros:**
- Smaller bundle size
- Widely supported
- Easy to learn
- Good for simple use cases

**Cons:**
- No 3D support
- Limited styling options
- Not optimized for large datasets

**Example:**
```javascript
import { MapView } from 'web-mojo/map';

const map = new MapView({
  markers: [
    { lat: 40.7128, lng: -74.0060, popup: 'New York City' }
  ],
  zoom: 10,
  height: 400,
  tileLayer: 'osm',
  showZoomControl: true,
  showLayerControl: true
});

await map.render(true, document.getElementById('map'));
```

### MapLibreView (MapLibre GL)

**When to use:**
- Vector tiles and custom styling
- 3D terrain and buildings
- Data visualizations (heat maps, choropleth)
- Complex animations
- High-performance rendering

**Pros:**
- Vector tiles (smooth zoom)
- 3D support (pitch, bearing, terrain)
- Better performance for large datasets
- Advanced styling capabilities
- WebGL acceleration

**Cons:**
- Larger bundle size
- More complex API
- Requires WebGL support

**Example:**
```javascript
import { MapLibreView } from 'web-mojo/map';

const map = new MapLibreView({
  markers: [
    {
      lng: -122.0842499,
      lat: 37.4224764,
      popup: 'Googleplex',
      color: '#3b82f6',
      size: 40
    }
  ],
  style: 'streets',
  zoom: 13,
  pitch: 45,        // 3D tilt
  bearing: 30,      // Rotation
  height: 500
});

await map.render(true, document.getElementById('map'));
```

**Note:** MapLibreView uses `[lng, lat]` order (GeoJSON standard), while MapView uses `[lat, lng]` (Google Maps convention).

### MetricsCountryMapView

**Purpose:** Visualize geographic metrics with markers and routes from an origin point.

**Use cases:**
- Traffic by country
- User engagement heatmaps
- Geographic sales data
- Server request origins

**Example:**
```javascript
import { MetricsCountryMapView } from 'web-mojo/map';

const metricsMap = new MetricsCountryMapView({
  endpoint: '/api/metrics/fetch',
  account: 'global',
  category: 'traffic',
  granularity: 'days',
  maxCountries: 12,
  metricLabel: 'Requests',
  height: 400,
  mapStyle: 'dark',
  showRoutes: true,
  routeOrigin: {
    lng: -77.346,
    lat: 38.958,
    name: 'Reston, VA'
  }
});

await metricsMap.render(true, document.getElementById('metrics-map'));
```

**Features:**
- Fetches metrics from API endpoint
- Displays top N countries by metric value
- Color-coded markers by intensity
- Routes from origin to destinations
- Interactive legend
- Auto-refresh capability

---

## API Reference

### MapView API

**Constructor:**

```javascript
new MapView(options)
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `markers` | Array | `[]` | Array of marker objects |
| `center` | Array | `null` | Center coordinates `[lat, lng]` (auto-calculated if null) |
| `zoom` | Number | `13` | Initial zoom level (1-20) |
| `height` | Number | `400` | Map height in pixels |
| `tileLayer` | String | `'osm'` | Tile layer key (see [Tile Layers](#tile-layers)) |
| `showZoomControl` | Boolean | `true` | Show zoom controls |
| `showLayerControl` | Boolean | `false` | Show tile layer selector dropdown |
| `showLeafletBranding` | Boolean | `false` | Show "Leaflet" text in attribution |
| `layerOptions` | Object | See below | Custom layer selector options |

**Default layerOptions:**
```javascript
{
  osm: 'OSM',
  satellite: 'Satellite',
  terrain: 'Terrain',
  dark: 'Dark',
  light: 'Light',
  watercolor: 'Watercolor',
  bw: 'B/W',
  streets: 'Streets'
}
```

**Methods:**

#### `addMarkers(markers)`
Add markers to the map.

```javascript
map.addMarkers([
  { lat: 40.7128, lng: -74.0060, popup: 'NYC' },
  { lat: 34.0522, lng: -118.2437, popup: 'LA' }
]);
```

#### `updateMarkers(markers)`
Replace all markers with new ones.

```javascript
map.updateMarkers([
  { lat: 51.5074, lng: -0.1278, popup: 'London' }
]);
```

#### `clearMarkers()`
Remove all markers from the map.

```javascript
map.clearMarkers();
```

#### `setView(lat, lng, zoom?)`
Pan/zoom to coordinates.

```javascript
map.setView(37.7749, -122.4194, 12);
```

#### `setZoom(zoom)`
Set zoom level.

```javascript
map.setZoom(15);
```

#### `setTileLayer(key)`
Change tile layer.

```javascript
map.setTileLayer('satellite');
```

#### `fitBounds()`
Auto-zoom to fit all markers.

```javascript
map.fitBounds();
```

#### `MapView.showAsDialog(options)`
Static method to show map in a dialog.

```javascript
await MapView.showAsDialog({
  markers: [{ lat: 40.7128, lng: -74.0060, popup: 'NYC' }],
  zoom: 10,
  height: 500,
  dialogOptions: {
    title: 'Location Map',
    size: 'lg'
  }
});
```

---

### MapLibreView API

**Constructor:**

```javascript
new MapLibreView(options)
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `markers` | Array | `[]` | Array of marker objects |
| `center` | Array | `null` | Center coordinates `[lng, lat]` (GeoJSON order) |
| `zoom` | Number | `13` | Initial zoom level (1-22) |
| `pitch` | Number | `0` | 3D tilt angle (0-60 degrees) |
| `bearing` | Number | `0` | Rotation angle (0-360 degrees) |
| `height` | Number | `400` | Map height in pixels |
| `style` | String | `'streets'` | Map style key (see [MapLibreView Styles](#maplibreview-styles)) |
| `showNavigationControl` | Boolean | `true` | Show zoom and rotation controls |
| `autoFitBounds` | Boolean | `true` | Auto-fit bounds to markers |
| `lineSources` | Array | `[]` | GeoJSON line sources for routes |

**Methods:**

#### `addMarkers(markers)`
Add markers to the map.

```javascript
map.addMarkers([
  { lng: -74.0060, lat: 40.7128, popup: 'NYC', color: '#ff0000' }
]);
```

#### `updateMarkers(markers)`
Replace all markers.

```javascript
map.updateMarkers([
  { lng: -0.1278, lat: 51.5074, popup: 'London' }
]);
```

#### `clearMarkers()`
Remove all markers.

```javascript
map.clearMarkers();
```

#### `setView(lng, lat, zoom?)`
Pan/zoom to coordinates (GeoJSON order: lng, lat).

```javascript
map.setView(-122.4194, 37.7749, 12);
```

#### `setZoom(zoom)`
Set zoom level.

```javascript
map.setZoom(15);
```

#### `setPitch(pitch)`
Set 3D tilt angle (0-60).

```javascript
map.setPitch(45);
```

#### `setBearing(bearing)`
Set rotation angle (0-360).

```javascript
map.setBearing(90);
```

#### `addLineSource({ id, data, paint, layout })`
Add a GeoJSON line source for routes/paths.

```javascript
map.addLineSource({
  id: 'route',
  data: {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: [
        [-122.4194, 37.7749],  // San Francisco
        [-118.2437, 34.0522]   // Los Angeles
      ]
    }
  },
  paint: {
    'line-color': '#3b82f6',
    'line-width': 3,
    'line-opacity': 0.8
  }
});
```

#### `updateLineSource(id, { data, paint, layout })`
Update existing line source.

```javascript
map.updateLineSource('route', {
  data: newGeoJSON,
  paint: { 'line-color': '#ef4444' }
});
```

#### `fitBounds()`
Auto-zoom to fit all markers.

```javascript
map.fitBounds();
```

---

### MetricsCountryMapView API

**Constructor:**

```javascript
new MetricsCountryMapView(options)
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `endpoint` | String | `'/api/metrics/fetch'` | API endpoint for metrics data |
| `account` | String | `'global'` | Account identifier |
| `category` | String | `null` | Metrics category filter |
| `slugs` | String/Array | `null` | Specific metric slugs to fetch |
| `granularity` | String | `'days'` | Time granularity ('hours', 'days', 'weeks') |
| `maxCountries` | Number | `12` | Maximum countries to display |
| `metricLabel` | String | `'Events'` | Label for metric values |
| `height` | Number | `320` | Map height in pixels |
| `mapStyle` | String | `'dark'` | MapLibre style key |
| `mapOptions` | Object | `{}` | Additional MapLibre options |
| `showRoutes` | Boolean | `true` | Show routes from origin to destinations |
| `routeOrigin` | Object | See below | Origin point configuration |

**Default routeOrigin:**
```javascript
{
  lng: -77.346,
  lat: 38.958,
  name: 'Reston, VA'
}
```

**Methods:**

#### `refresh()`
Fetch and update metrics data.

```javascript
await metricsMap.refresh();
```

#### `setStatus(message)`
Show/hide status message.

```javascript
metricsMap.setStatus('Loading...');
metricsMap.setStatus('');  // Hide
```

**Expected API Response:**

```json
{
  "success": true,
  "data": {
    "status": true,
    "data": {
      "data": {
        "US": [120, 135, 98, 142],
        "GB": [45, 52, 38, 60],
        "DE": [32, 28, 41, 35]
      },
      "labels": ["2024-01-01", "2024-01-02", "2024-01-03", "2024-01-04"]
    }
  }
}
```

---

## Tile Layers

### MapView Tile Layers

Available tile layer keys for MapView:

| Key | Provider | Description | Max Zoom |
|-----|----------|-------------|----------|
| `'osm'` | OpenStreetMap | Standard street map | 19 |
| `'satellite'` | Esri | Satellite imagery | 19 |
| `'terrain'` | OpenTopoMap | Topographic/terrain | 17 |
| `'dark'` | CARTO | Dark theme | 20 |
| `'light'` | CARTO | Light/minimal theme | 20 |
| `'watercolor'` | Stamen/Stadia | Artistic watercolor style | 16 |
| `'bw'` | CARTO | Black and white (no labels) | 20 |
| `'streets'` | CARTO | Streets with labels (Voyager) | 20 |

**Example:**

```javascript
const map = new MapView({
  tileLayer: 'satellite',
  markers: [{ lat: 36.1699, lng: -115.1398, popup: 'Las Vegas' }]
});
```

**Switching layers:**

```javascript
map.setTileLayer('terrain');
```

**Layer selector UI:**

```javascript
const map = new MapView({
  showLayerControl: true,
  layerOptions: {
    osm: 'Streets',
    satellite: 'Satellite',
    terrain: 'Topographic'
  }
});
// Shows dropdown in top-right corner
```

### MapLibreView Styles

Available style keys for MapLibreView:

| Key | Description |
|-----|-------------|
| `'streets'` | Standard street map (MapLibre demo tiles) |
| `'satellite'` | Satellite imagery (Esri) |
| `'terrain'` | Topographic terrain (OpenTopoMap) |
| `'dark'` | Dark theme (OSM raster) |
| `'light'` | Light theme (OSM raster) |

**Example:**

```javascript
const map = new MapLibreView({
  style: 'dark',
  markers: [{ lng: -0.1278, lat: 51.5074, popup: 'London' }]
});
```

**Custom styles:**

You can also provide a custom Mapbox/MapLibre style URL or object:

```javascript
const map = new MapLibreView({
  style: 'https://api.maptiler.com/maps/streets/style.json?key=YOUR_KEY'
});
```

---

## Markers and Popups

### Marker Configuration

**MapView markers:**

```javascript
{
  lat: 37.7749,           // Latitude (required)
  lng: -122.4194,         // Longitude (required)
  popup: 'San Francisco', // Popup HTML (optional)
  icon: {                 // Custom icon (optional)
    iconUrl: '/marker.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  }
}
```

**MapLibreView markers:**

```javascript
{
  lng: -122.4194,         // Longitude (required, GeoJSON order)
  lat: 37.7749,           // Latitude (required)
  popup: 'San Francisco', // Popup HTML (optional)
  color: '#3b82f6',       // Marker color (optional, default: '#3b82f6')
  size: 40,               // Marker size in pixels (optional, default: 30)
  icon: 'bi bi-star-fill' // Icon class (optional, for custom content)
}
```

### Custom Marker Icons

**MapView (Leaflet icons):**

```javascript
const map = new MapView({
  markers: [
    {
      lat: 40.7128,
      lng: -74.0060,
      popup: 'Custom Icon',
      icon: {
        iconUrl: '/assets/custom-marker.png',
        iconSize: [32, 45],
        iconAnchor: [16, 45],
        popupAnchor: [0, -45],
        shadowUrl: '/assets/marker-shadow.png',
        shadowSize: [41, 41]
      }
    }
  ]
});
```

**MapLibreView (styled divs):**

```javascript
const map = new MapLibreView({
  markers: [
    {
      lng: -74.0060,
      lat: 40.7128,
      popup: 'Star Marker',
      color: '#fbbf24',
      size: 40,
      icon: 'bi bi-star-fill'  // Bootstrap Icons class
    }
  ]
});
```

The `icon` property in MapLibreView adds an `<i>` element with the specified class inside the marker circle.

### Popup Content

Popups support HTML content:

**Simple text:**
```javascript
popup: 'San Francisco, CA'
```

**Formatted HTML:**
```javascript
popup: `
  <div style="text-align: center;">
    <strong>San Francisco</strong><br>
    <span style="color: #6b7280;">Population: 873,965</span><br>
    <a href="/city/sf" style="color: #3b82f6;">View Details</a>
  </div>
`
```

**With images:**
```javascript
popup: `
  <div style="min-width: 200px;">
    <img src="/images/sf.jpg" style="width: 100%; border-radius: 4px; margin-bottom: 8px;">
    <strong>San Francisco</strong><br>
    <span style="color: #6b7280;">The Golden Gate City</span>
  </div>
`
```

**Event handlers:**

For interactive popups, use delegated events:

```javascript
const map = new MapView({
  markers: [
    {
      lat: 40.7128,
      lng: -74.0060,
      popup: '<button class="btn btn-primary" data-action="view-details" data-city="nyc">View Details</button>'
    }
  ]
});

// Delegate events on the map container
map.element.addEventListener('click', (e) => {
  if (e.target.dataset.action === 'view-details') {
    const city = e.target.dataset.city;
    console.log('View details for:', city);
  }
});
```

---

## Advanced Features

### Line Sources and Routes

**MapLibreView** supports GeoJSON line sources for drawing routes, paths, and connections.

**Simple route:**

```javascript
const map = new MapLibreView({
  markers: [
    { lng: -122.4194, lat: 37.7749, popup: 'San Francisco' },
    { lng: -118.2437, lat: 34.0522, popup: 'Los Angeles' }
  ],
  style: 'streets',
  zoom: 6
});

await map.render(true, container);

// Add route line
map.addLineSource({
  id: 'sf-to-la',
  data: {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: [
        [-122.4194, 37.7749],
        [-118.2437, 34.0522]
      ]
    }
  },
  paint: {
    'line-color': '#3b82f6',
    'line-width': 3,
    'line-opacity': 0.7
  }
});
```

**Multiple routes:**

```javascript
const routes = [
  { from: [-77.346, 38.958], to: [-0.1278, 51.5074], color: '#ef4444' },
  { from: [-77.346, 38.958], to: [139.6917, 35.6895], color: '#10b981' },
  { from: [-77.346, 38.958], to: [151.2093, -33.8688], color: '#f59e0b' }
];

routes.forEach((route, i) => {
  map.addLineSource({
    id: `route-${i}`,
    data: {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [route.from, route.to]
      }
    },
    paint: {
      'line-color': route.color,
      'line-width': 2,
      'line-opacity': 0.6
    }
  });
});
```

**Animated routes:**

```javascript
map.addLineSource({
  id: 'animated-route',
  data: routeGeoJSON,
  paint: {
    'line-color': '#8b5cf6',
    'line-width': 4,
    'line-opacity': 0.8
  }
});

// Animate line width
let width = 2;
setInterval(() => {
  width = width === 2 ? 6 : 2;
  map.updateLineSource('animated-route', {
    data: routeGeoJSON,
    paint: { 'line-width': width }
  });
}, 500);
```

### Heat Maps

MapLibreView supports heat map layers via GeoJSON point data:

```javascript
const heatmapData = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', geometry: { type: 'Point', coordinates: [-122.4194, 37.7749] }, properties: { weight: 0.8 } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [-118.2437, 34.0522] }, properties: { weight: 0.6 } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [-117.1611, 32.7157] }, properties: { weight: 0.4 } }
  ]
};

// After map loads
map.map.on('load', () => {
  map.map.addSource('heatmap-source', {
    type: 'geojson',
    data: heatmapData
  });

  map.map.addLayer({
    id: 'heatmap-layer',
    type: 'heatmap',
    source: 'heatmap-source',
    paint: {
      'heatmap-weight': ['get', 'weight'],
      'heatmap-intensity': 1,
      'heatmap-radius': 50,
      'heatmap-opacity': 0.8
    }
  });
});
```

### 3D Maps and Terrain

MapLibreView supports 3D tilt and rotation:

**Basic 3D view:**

```javascript
const map = new MapLibreView({
  markers: [{ lng: -122.084, lat: 37.422, popup: 'Googleplex' }],
  style: 'satellite',
  zoom: 17,
  pitch: 60,        // 3D tilt (0-60)
  bearing: 45,      // Rotation (0-360)
  height: 500
});
```

**Interactive 3D controls:**

```javascript
// Users can interact with 3D view:
// - Right-click + drag: Rotate
// - Ctrl/Cmd + drag: Tilt
// - NavigationControl: Includes compass and pitch buttons
```

**Programmatic 3D animation:**

```javascript
let bearing = 0;
setInterval(() => {
  bearing = (bearing + 1) % 360;
  map.setBearing(bearing);
}, 50);
```

### Custom Styling

**MapView CSS customization:**

```css
/* Custom marker styles */
.leaflet-marker-icon {
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
}

/* Custom popup styles */
.leaflet-popup-content-wrapper {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 8px;
}

.leaflet-popup-tip {
  background: #764ba2;
}
```

**MapLibreView marker customization:**

```javascript
// Markers are created as divs, so you can style them fully
const map = new MapLibreView({
  markers: [
    {
      lng: -122.4194,
      lat: 37.7749,
      popup: 'Custom Styled',
      color: 'transparent',  // Transparent background
      size: 50,
      icon: 'bi bi-geo-alt-fill'  // Large icon
    }
  ]
});

// Add custom CSS
const style = document.createElement('style');
style.textContent = `
  .maplibre-marker {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
    border: 3px solid white !important;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
  }
  .maplibre-marker i {
    font-size: 24px;
  }
`;
document.head.appendChild(style);
```

---

## Usage Patterns

### Showing Maps in Dialogs

**MapView dialog helper:**

```javascript
import { MapView } from 'web-mojo/map';

await MapView.showAsDialog({
  markers: [
    { lat: 37.7749, lng: -122.4194, popup: 'San Francisco' }
  ],
  zoom: 12,
  height: 500,
  tileLayer: 'terrain',
  dialogOptions: {
    title: 'Location',
    size: 'lg',
    centered: true
  }
});
```

**Manual dialog creation:**

```javascript
import { MapLibreView } from 'web-mojo/map';
import Dialog from 'web-mojo/core/views/feedback/Dialog';

const map = new MapLibreView({
  markers: [{ lng: -0.1278, lat: 51.5074, popup: 'London' }],
  style: 'dark',
  height: 400
});

await Dialog.showDialog({
  title: 'Map View',
  body: map,
  size: 'xl',
  buttons: [
    { text: 'Close', class: 'btn-secondary', dismiss: true }
  ]
});
```

### Dynamic Marker Updates

**Real-time marker updates:**

```javascript
const map = new MapView({
  markers: [],
  zoom: 10,
  height: 400
});

await map.render(true, container);

// Update markers every 5 seconds
setInterval(async () => {
  const response = await fetch('/api/locations');
  const locations = await response.json();
  
  const markers = locations.map(loc => ({
    lat: loc.latitude,
    lng: loc.longitude,
    popup: `<strong>${loc.name}</strong><br>${loc.status}`
  }));
  
  map.updateMarkers(markers);
}, 5000);
```

**User interaction:**

```javascript
const map = new MapView({
  markers: [],
  zoom: 5,
  height: 500
});

await map.render(true, container);

// Click map to add marker
if (map.map) {
  map.map.on('click', (e) => {
    const { lat, lng } = e.latlng;
    
    map.markers.push({
      lat,
      lng,
      popup: `Coordinates:<br>${lat.toFixed(4)}, ${lng.toFixed(4)}`
    });
    
    map.updateMarkers(map.markers);
  });
}
```

### Integrating with Location Extension

**Map preview in location picker:**

```javascript
import { showLocationPickerDialog } from 'web-mojo/map';

const details = await showLocationPickerDialog({
  title: 'Select Location',
  height: 300,
  tileLayer: 'satellite'
});

if (details) {
  console.log('Selected:', details.formatted_address);
  console.log('Coords:', details.latitude, details.longitude);
}
```

**Show address on map:**

```javascript
import { showLocationDetailsDialog } from 'web-mojo/map';

await showLocationDetailsDialog({
  details: {
    formatted_address: '1600 Amphitheatre Pkwy, Mountain View, CA',
    latitude: 37.4224764,
    longitude: -122.0842499
  },
  height: 350,
  tileLayer: 'osm'
});
```

**Custom integration:**

```javascript
import { MapView, LocationClient } from 'web-mojo/map';

const client = new LocationClient();

// User enters address
const result = await client.geocode('1600 Amphitheatre Parkway, Mountain View, CA');

if (result.success) {
  // Show on map
  const map = new MapView({
    markers: [
      {
        lat: result.latitude,
        lng: result.longitude,
        popup: result.formatted_address
      }
    ],
    zoom: 15,
    height: 400
  });
  
  await map.render(true, container);
}
```

---

## Performance

### Best Practices

**For MapView (Leaflet):**
1. **Limit markers:** For >100 markers, consider clustering
2. **Debounce updates:** Don't update markers on every keystroke
3. **Lazy load:** Render map only when visible (intersection observer)
4. **Remove when hidden:** Call `onBeforeDestroy()` to free resources

**For MapLibreView:**
1. **Use vector tiles:** Better performance than raster at all zoom levels
2. **Disable 3D when not needed:** Set `pitch: 0` for 2D maps
3. **Limit line sources:** Each GeoJSON source has overhead
4. **Simplify geometries:** Reduce coordinates for complex shapes

### Marker Clustering

For maps with many markers, use Leaflet.markercluster:

```javascript
// Load marker cluster plugin
const script = document.createElement('script');
script.src = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js';
document.head.appendChild(script);

const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css';
document.head.appendChild(link);

// After MapView renders
const markers = L.markerClusterGroup();
map.markers.forEach(markerData => {
  const marker = L.marker([markerData.lat, markerData.lng]);
  if (markerData.popup) {
    marker.bindPopup(markerData.popup);
  }
  markers.addLayer(marker);
});
map.map.addLayer(markers);
```

### Memory Management

**Cleanup when done:**

```javascript
// MapView
await mapView.onBeforeDestroy();

// MapLibreView
await mapLibreView.onBeforeDestroy();

// Automatic cleanup in MOJO View lifecycle
```

---

## Browser Compatibility

**MapView (Leaflet):**
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

**MapLibreView (MapLibre GL):**
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+ (requires WebGL)
- Mobile browsers with WebGL support

**Required features:**
- ES6 modules
- `fetch` API
- CSS Grid
- WebGL (MapLibreView only)

**Fallback for older browsers:**

```javascript
// Check for WebGL support
const hasWebGL = (() => {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
  } catch {
    return false;
  }
})();

// Use appropriate map component
const MapComponent = hasWebGL ? MapLibreView : MapView;

const map = new MapComponent({
  markers: [{ lat: 37.7749, lng: -122.4194, popup: 'San Francisco' }]
});
```

---

## Troubleshooting

### Map doesn't appear

**Check:**
1. Container has height: `<div style="height: 400px;">`
2. Leaflet/MapLibre loaded successfully (check console)
3. Map initialized after container rendered
4. No CSS conflicts (z-index, overflow hidden on parent)

**Debug:**
```javascript
console.log('Map instance:', map.map);
console.log('Map element:', map.element);
```

### Tiles don't load

**Check:**
1. Network tab for tile request errors (404, CORS)
2. Attribution (some providers require it)
3. API key (if using paid tile provider)
4. Rate limits (some providers throttle requests)

**Test with basic OSM:**
```javascript
map.setTileLayer('osm');
```

### Markers not visible

**Check:**
1. Coordinates valid (lat: -90 to 90, lng: -180 to 180)
2. Zoom level appropriate for marker scale
3. Marker rendering (inspect DOM for marker elements)

**Debug:**
```javascript
console.log('Markers:', map.markers);
console.log('Leaflet markers:', map.leafletMarkers);
map.fitBounds();  // Force zoom to markers
```

### MapLibreView coordinate confusion

**Remember:** MapLibreView uses GeoJSON order `[lng, lat]`, not `[lat, lng]`.

```javascript
// CORRECT
{ lng: -122.4194, lat: 37.7749 }

// WRONG (will show in wrong location)
{ lat: -122.4194, lng: 37.7749 }
```

### Performance issues with many markers

**Solutions:**
1. Use marker clustering (Leaflet.markercluster)
2. Limit visible markers (filter by zoom level)
3. Use MapLibreView for better performance
4. Implement pagination/viewport filtering

### Map doesn't resize with container

**Solution:** Call `invalidateSize()` after resize:

```javascript
// MapView
window.addEventListener('resize', () => {
  map.map?.invalidateSize();
});

// MapLibreView
window.addEventListener('resize', () => {
  map.map?.resize();
});
```

### 3D view not working (MapLibreView)

**Check:**
1. WebGL support: `window.maplibregl.supported()`
2. Browser hardware acceleration enabled
3. `pitch` value in valid range (0-60)
4. GPU drivers up to date

---

## Related Documentation

- **[Location Extension](./Location.md)**: Address autocomplete and place details
- **[Location API](./Location_API.md)**: Server-side location API endpoints
- **[View System](./Views.md)**: MOJO View lifecycle and rendering
- **[Dialog System](./Dialogs.md)**: Dialog helpers and customization

---

## External Resources

**Leaflet:**
- Docs: https://leafletjs.com/reference.html
- Plugins: https://leafletjs.com/plugins.html
- Marker Cluster: https://github.com/Leaflet/Leaflet.markercluster

**MapLibre GL:**
- Docs: https://maplibre.org/maplibre-gl-js/docs/
- Style Spec: https://maplibre.org/maplibre-style-spec/
- Examples: https://maplibre.org/maplibre-gl-js/docs/examples/

**Tile Providers:**
- OpenStreetMap: https://www.openstreetmap.org/
- Stadia Maps: https://stadiamaps.com/
- Mapbox: https://www.mapbox.com/
- Maptiler: https://www.maptiler.com/
