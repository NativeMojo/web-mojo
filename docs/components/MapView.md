# MapView Component Guide

The **MapView** component provides an interactive map using Leaflet for displaying locations with markers and popups. It's ideal for simple marker-based maps like geolocation displays, store locators, and basic geographic visualizations.

## Table of Contents

- [Overview](#overview)
- [Basic Usage](#basic-usage)
- [Configuration Options](#configuration-options)
- [Map Styles](#map-styles)
- [Markers](#markers)
- [Methods](#methods)
- [Advanced Examples](#advanced-examples)
- [Best Practices](#best-practices)

## Overview

MapView uses Leaflet, a lightweight open-source JavaScript library for mobile-friendly interactive maps. It automatically loads Leaflet from CDN and provides a simple API for displaying maps with markers.

### Key Features

- **Simple Marker Maps**: Easy display of single or multiple markers
- **Multiple Tile Layers**: 8 different map styles including satellite, dark mode, and artistic styles
- **Auto-zoom**: Automatically fits bounds to show all markers
- **Popup Support**: Custom HTML popups for markers
- **Responsive**: Works in dialogs, tabs, and responsive layouts
- **CDN Loading**: No build dependencies, loads Leaflet on demand
- **Lightweight**: Perfect for simple marker-based maps

### When to Use MapView vs MapLibreView

- **Use MapView (Leaflet)** for:
  - Simple marker maps
  - Basic location displays
  - GeoIP visualization
  - Store locators
  - Contact maps

- **Use MapLibreView** for:
  - Vector tiles and custom styling
  - 3D terrain and buildings
  - Heat maps and data visualizations
  - Complex animations
  - High-performance rendering

## Basic Usage

### Single Marker Map

```js
import MapView from '@ext/map/MapView.js';

const mapView = new MapView({
    markers: [
        {
            lat: 37.7749,
            lng: -122.4194,
            popup: '<strong>San Francisco</strong><br>California, USA'
        }
    ],
    zoom: 12,
    height: 400
});

await mapView.render(document.getElementById('map-container'));
```

### Multiple Markers with Auto-zoom

```js
const mapView = new MapView({
    markers: [
        { lat: 37.7749, lng: -122.4194, popup: 'San Francisco' },
        { lat: 34.0522, lng: -118.2437, popup: 'Los Angeles' },
        { lat: 40.7128, lng: -74.0060, popup: 'New York' }
    ],
    height: 450
    // Auto-zooms to fit all markers
});

await mapView.render(container);
```

### In a Dialog with TabView

```js
import { Dialog } from '@core/Dialog.js';
import TabView from '@core/views/TabView.js';
import MapView from '@ext/map/MapView.js';

const mapView = new MapView({
    markers: [{ lat: 37.422, lng: -122.084, popup: 'Mountain View, CA' }],
    zoom: 13,
    height: 450,
    tileLayer: 'satellite'
});

const tabs = {
    'Location': someLocationView,
    'Map': mapView,
    'Details': someDetailsView
};

const tabView = new TabView({ tabs });

Dialog.show({
    title: 'Location Details',
    body: tabView,
    size: 'xl'
});
```

## Configuration Options

### Constructor Options

```js
const mapView = new MapView({
    // Markers array (required for auto-centering)
    markers: [],
    
    // Manual center point [lat, lng]
    center: null,
    
    // Initial zoom level (1-20)
    zoom: 13,
    
    // Map height in pixels
    height: 400,
    
    // Show zoom controls
    showZoomControl: true,
    
    // Tile layer style
    tileLayer: 'osm', // 'osm', 'satellite', 'dark', 'light', 'terrain', 'streets', 'watercolor', 'bw'
    
    // Standard View options
    className: 'map-view',
    containerId: 'map-container'
});
```

## Map Styles

MapView supports 8 different tile layer styles via the `tileLayer` option:

### Standard Styles

#### OSM (Default)
```js
tileLayer: 'osm'
```
Standard OpenStreetMap tiles with clear street labels and colors.

#### Streets
```js
tileLayer: 'streets'
```
CartoDB Voyager style with enhanced readability and modern styling.

### Imagery Styles

#### Satellite
```js
tileLayer: 'satellite'
```
Esri World Imagery satellite photos (no labels).

#### Terrain
```js
tileLayer: 'terrain'
```
OpenTopoMap with topographic details, elevation contours, and hiking trails.

### Theme Styles

#### Dark
```js
tileLayer: 'dark'
```
CartoDB dark theme - perfect for dark mode UIs and night viewing.

#### Light
```js
tileLayer: 'light'
```
CartoDB light theme - minimal, clean style with subtle colors.

#### Black & White
```js
tileLayer: 'bw'
```
Minimal black and white map without labels - great for data overlays.

### Artistic Styles

#### Watercolor
```js
tileLayer: 'watercolor'
```
Stamen watercolor artistic style - beautiful hand-painted appearance.

## Markers

### Marker Object Structure

```js
{
    lat: 37.7749,           // Latitude (required)
    lng: -122.4194,         // Longitude (required)
    popup: 'Text or HTML',  // Popup content (optional)
    icon: { ... }           // Custom Leaflet icon config (optional)
}
```

### Simple Marker

```js
markers: [
    { lat: 37.7749, lng: -122.4194 }
]
```

### Marker with Popup

```js
markers: [
    {
        lat: 37.7749,
        lng: -122.4194,
        popup: '<strong>San Francisco</strong><br>Population: 873,965'
    }
]
```

### Custom Icon

```js
markers: [
    {
        lat: 37.7749,
        lng: -122.4194,
        popup: 'Custom marker',
        icon: {
            iconUrl: '/images/custom-marker.png',
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32]
        }
    }
]
```

## Methods

### updateMarkers(newMarkers)

Update markers and refresh the map.

```js
const newMarkers = [
    { lat: 40.7128, lng: -74.0060, popup: 'New York' },
    { lat: 34.0522, lng: -118.2437, popup: 'Los Angeles' }
];

mapView.updateMarkers(newMarkers);
```

### addMarkers(markers)

Add additional markers to the existing map.

```js
mapView.addMarkers([
    { lat: 51.5074, lng: -0.1278, popup: 'London' }
]);
```

### clearMarkers()

Remove all markers from the map.

```js
mapView.clearMarkers();
```

### setView(lat, lng, zoom)

Pan and zoom to a specific location.

```js
mapView.setView(37.7749, -122.4194, 15);
```

### setZoom(zoom)

Change the zoom level.

```js
mapView.setZoom(10);
```

### fitBounds()

Automatically zoom to fit all markers.

```js
mapView.fitBounds();
```

## Advanced Examples

### Dynamic Marker Updates

```js
import MapView from '@ext/map/MapView.js';

class LocationTracker extends View {
    async onInit() {
        this.mapView = new MapView({
            markers: [],
            zoom: 10,
            height: 400,
            tileLayer: 'dark'
        });
        
        this.addChild('map', this.mapView);
    }
    
    async updateLocation(lat, lng, label) {
        const marker = {
            lat,
            lng,
            popup: `<strong>${label}</strong><br>${new Date().toLocaleTimeString()}`
        };
        
        this.mapView.updateMarkers([marker]);
    }
}
```

### GeoIP Visualization

```js
import MapView from '@ext/map/MapView.js';
import TabView from '@core/views/TabView.js';

class GeoIPView extends View {
    async onInit() {
        const ip = this.model.get('ip');
        const lat = this.model.get('latitude');
        const lng = this.model.get('longitude');
        const city = this.model.get('city');
        const country = this.model.get('country');
        
        const location = `${city}, ${country}`;
        
        this.mapView = new MapView({
            markers: [{
                lat,
                lng,
                popup: `<strong>${ip}</strong><br>${location}`
            }],
            zoom: 10,
            height: 450,
            tileLayer: 'satellite'
        });
        
        const tabs = {
            'Location': this.createLocationView(),
            'Map': this.mapView,
            'Metadata': this.createMetadataView()
        };
        
        this.tabView = new TabView({ tabs });
        this.addChild('tabs', this.tabView);
    }
    
    get template() {
        return '<div data-container="tabs"></div>';
    }
}
```

### Multiple Maps with Different Styles

```js
const maps = [
    { style: 'osm', title: 'Standard' },
    { style: 'satellite', title: 'Satellite' },
    { style: 'terrain', title: 'Terrain' },
    { style: 'dark', title: 'Dark Mode' }
];

const mapViews = maps.map(({ style, title }) => {
    return new MapView({
        markers: [{ lat: 37.7749, lng: -122.4194, popup: title }],
        zoom: 12,
        height: 300,
        tileLayer: style
    });
});

// Render side by side
const container = document.getElementById('map-grid');
container.style.display = 'grid';
container.style.gridTemplateColumns = 'repeat(2, 1fr)';
container.style.gap = '1rem';

for (const mapView of mapViews) {
    const div = document.createElement('div');
    container.appendChild(div);
    await mapView.render(div);
}
```

### Responsive Map in TablePage ItemView

```js
import MapView from '@ext/map/MapView.js';

class LocationTablePage extends TablePage {
    constructor() {
        super({
            title: 'Locations',
            ModelClass: Location,
            itemView: LocationMapView
        });
    }
}

class LocationMapView extends View {
    async onInit() {
        const lat = this.model.get('latitude');
        const lng = this.model.get('longitude');
        const name = this.model.get('name');
        
        this.mapView = new MapView({
            markers: [{
                lat,
                lng,
                popup: `<strong>${name}</strong>`
            }],
            zoom: 14,
            height: 400,
            tileLayer: 'streets'
        });
        
        this.addChild('map', this.mapView);
    }
    
    get template() {
        return `
            <div class="p-3">
                <h5>{{model.name}}</h5>
                <div data-container="map"></div>
            </div>
        `;
    }
}
```

## Best Practices

### 1. Choose the Right Style

Match the map style to your UI theme:
```js
// For dark mode UIs
tileLayer: 'dark'

// For location-focused apps
tileLayer: 'streets'

// For property/real estate
tileLayer: 'satellite'

// For outdoor/hiking apps
tileLayer: 'terrain'
```

### 2. Set Appropriate Heights

Maps need explicit heights. Use larger heights for primary maps:
```js
// Small preview map
height: 250

// Standard detail map
height: 400

// Full-feature map in dialog
height: 450

// Dashboard widget
height: 300
```

### 3. Use XL Size for Dialogs with Maps

```js
Dialog.show({
    title: 'Location Details',
    body: mapView,
    size: 'xl'  // Give maps room to breathe
});
```

### 4. Provide Informative Popups

```js
// Good - includes context
popup: `<strong>${name}</strong><br>${address}<br>${city}, ${state}`

// Better - add actions
popup: `
    <strong>${name}</strong><br>
    ${address}<br>
    <a href="/locations/${id}">View Details</a>
`
```

### 5. Let Auto-zoom Work

When showing multiple markers, omit the `zoom` option:
```js
// Good - auto-fits bounds
const mapView = new MapView({
    markers: multipleMarkers
    // No zoom specified
});

// Only set zoom for single markers
const mapView = new MapView({
    markers: [singleMarker],
    zoom: 14
});
```

### 6. Clean Up on Destroy

The component automatically cleans up, but if you need custom cleanup:
```js
class MyView extends View {
    async onBeforeDestroy() {
        if (this.mapView) {
            await this.mapView.destroy();
        }
        await super.onBeforeDestroy();
    }
}
```

### 7. Handle Missing Coordinates

```js
const lat = model.get('latitude');
const lng = model.get('longitude');

if (lat && lng) {
    this.mapView = new MapView({
        markers: [{ lat, lng, popup: 'Location' }],
        zoom: 12,
        height: 400
    });
} else {
    // Show fallback message
    this.element.innerHTML = '<p class="text-muted">No location data available</p>';
}
```

### 8. Consider Performance

For many markers (100+), consider using MapLibreView with clustering instead:
```js
// MapView is great for < 100 markers
// For more, use MapLibreView with clustering plugins
```

---

**Related Documentation:**
- [MapLibreView](./MapLibreView.md) - Advanced vector map component
- [TabView](../guide/TabView.md) - For organizing map with other data
- [Dialog](../guide/Dialog.md) - For showing maps in modals
