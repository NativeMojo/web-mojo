# MapLibreView Component Guide

The **MapLibreView** component provides an advanced interactive map using MapLibre GL JS for vector tiles, 3D visualization, and high-performance rendering. It's ideal for complex data visualizations, custom styling, and advanced geographic features.

## Table of Contents

- [Overview](#overview)
- [Basic Usage](#basic-usage)
- [Configuration Options](#configuration-options)
- [Map Styles](#map-styles)
- [Markers](#markers)
- [3D Features](#3d-features)
- [Methods](#methods)
- [Advanced Examples](#advanced-examples)
- [Best Practices](#best-practices)

## Overview

MapLibreView uses MapLibre GL JS, a powerful open-source library for vector tile rendering with WebGL. It provides advanced features like 3D terrain, custom styling, and high-performance rendering for complex visualizations.

### Key Features

- **Vector Tiles**: Smooth rendering at any zoom level
- **3D Support**: Pitch and bearing for terrain and building visualization
- **High Performance**: WebGL-accelerated rendering
- **Custom Styling**: Full control over map appearance
- **Advanced Features**: Heat maps, data layers, animations
- **CDN Loading**: No build dependencies, loads MapLibre on demand
- **Modern API**: Uses lng/lat order (GeoJSON standard)

### When to Use MapLibreView vs MapView

- **Use MapLibreView (MapLibre GL)** for:
  - Vector tiles and custom styling
  - 3D terrain and buildings
  - Heat maps and data visualizations
  - Complex animations
  - High-performance rendering with many features

- **Use MapView (Leaflet)** for:
  - Simple marker maps
  - Basic location displays
  - GeoIP visualization
  - Store locators
  - Quick prototypes

## Basic Usage

### Simple Map

```js
import MapLibreView from '@ext/map/MapLibreView.js';

const mapView = new MapLibreView({
    markers: [
        {
            lng: -122.4194,  // Note: lng first (GeoJSON standard)
            lat: 37.7749,
            popup: '<strong>San Francisco</strong><br>California, USA'
        }
    ],
    zoom: 12,
    height: 400,
    style: 'streets'
});

await mapView.render(document.getElementById('map-container'));
```

### 3D Tilted Map

```js
const mapView = new MapLibreView({
    markers: [
        { lng: -122.4194, lat: 37.7749, popup: 'San Francisco' }
    ],
    zoom: 15,
    pitch: 45,      // Tilt angle (0-60 degrees)
    bearing: -17.6, // Rotation angle (0-360 degrees)
    height: 500,
    style: 'satellite'
});

await mapView.render(container);
```

### Multiple Markers with Custom Colors

```js
const mapView = new MapLibreView({
    markers: [
        {
            lng: -122.4194,
            lat: 37.7749,
            popup: 'San Francisco',
            color: '#3b82f6'  // Blue
        },
        {
            lng: -118.2437,
            lat: 34.0522,
            popup: 'Los Angeles',
            color: '#ef4444'  // Red
        },
        {
            lng: -74.0060,
            lat: 40.7128,
            popup: 'New York',
            color: '#22c55e'  // Green
        }
    ],
    height: 450,
    style: 'dark'
});

await mapView.render(container);
```

## Configuration Options

### Constructor Options

```js
const mapView = new MapLibreView({
    // Markers array (required for auto-centering)
    markers: [],
    
    // Manual center point [lng, lat] - Note: longitude first!
    center: null,
    
    // Initial zoom level (1-20)
    zoom: 13,
    
    // Map height in pixels
    height: 400,
    
    // 3D tilt angle (0-60 degrees)
    pitch: 0,
    
    // Rotation angle (0-360 degrees)
    bearing: 0,
    
    // Map style
    style: 'streets', // 'streets', 'satellite', 'dark', 'light', 'terrain'
    
    // Show navigation controls
    showNavigationControl: true,
    
    // Standard View options
    className: 'maplibre-view',
    containerId: 'map-container'
});
```

## Map Styles

MapLibreView supports 5 different map styles via the `style` option:

### Streets (Default)
```js
style: 'streets'
```
Vector tile streets with full styling and labels from MapLibre demo tiles.

### Satellite
```js
style: 'satellite'
```
Esri World Imagery satellite photos (raster tiles).

### Dark
```js
style: 'dark'
```
Dark theme with OpenStreetMap tiles - perfect for dark mode UIs.

### Light
```js
style: 'light'
```
Light theme with OpenStreetMap tiles - minimal, clean style.

### Terrain
```js
style: 'terrain'
```
OpenTopoMap with topographic details and elevation contours.

## Markers

### Marker Object Structure

**Important**: MapLibre uses `lng, lat` order (GeoJSON standard), not `lat, lng`!

```js
{
    lng: -122.4194,         // Longitude (required) - Note: lng first!
    lat: 37.7749,           // Latitude (required)
    popup: 'Text or HTML',  // Popup content (optional)
    color: '#3b82f6',       // Marker color (optional, default: #3b82f6)
    icon: 'fa fa-star'      // Icon class (optional)
}
```

### Simple Marker

```js
markers: [
    { lng: -122.4194, lat: 37.7749 }
]
```

### Marker with Popup

```js
markers: [
    {
        lng: -122.4194,
        lat: 37.7749,
        popup: '<strong>San Francisco</strong><br>Population: 873,965'
    }
]
```

### Colored Marker

```js
markers: [
    {
        lng: -122.4194,
        lat: 37.7749,
        popup: 'San Francisco',
        color: '#ef4444'  // Red marker
    }
]
```

### Marker with Icon

```js
markers: [
    {
        lng: -122.4194,
        lat: 37.7749,
        popup: 'Important Location',
        color: '#f59e0b',
        icon: 'fa fa-star'  // FontAwesome icon
    }
]
```

## 3D Features

MapLibre GL supports 3D visualization through pitch and bearing:

### Pitch (Tilt)

Tilt the map to view terrain and buildings in 3D (0-60 degrees):

```js
const mapView = new MapLibreView({
    markers: [{ lng: -74.0060, lat: 40.7128, popup: 'NYC' }],
    zoom: 16,
    pitch: 60,  // Maximum tilt for 3D effect
    style: 'streets'
});
```

### Bearing (Rotation)

Rotate the map for better orientation (0-360 degrees):

```js
const mapView = new MapLibreView({
    markers: [{ lng: -74.0060, lat: 40.7128, popup: 'NYC' }],
    zoom: 16,
    bearing: 45,  // Rotate 45 degrees
    style: 'streets'
});
```

### Combined 3D View

```js
const mapView = new MapLibreView({
    markers: [{ lng: -122.4194, lat: 37.7749, popup: 'San Francisco' }],
    zoom: 17,
    pitch: 50,      // Tilt for 3D buildings
    bearing: -17.6, // Rotate for better angle
    height: 500,
    style: 'streets'
});
```

### Dynamic 3D Controls

```js
// Change pitch dynamically
mapView.setPitch(45);

// Change bearing dynamically
mapView.setBearing(90);

// Smooth animation to new view
mapView.setView(-122.4194, 37.7749, 16);
```

## Methods

### updateMarkers(newMarkers)

Update markers and refresh the map with smooth animation.

```js
const newMarkers = [
    { lng: -74.0060, lat: 40.7128, popup: 'New York', color: '#3b82f6' },
    { lng: -118.2437, lat: 34.0522, popup: 'Los Angeles', color: '#ef4444' }
];

mapView.updateMarkers(newMarkers);
```

### addMarkers(markers)

Add additional markers to the existing map.

```js
mapView.addMarkers([
    { lng: -0.1278, lat: 51.5074, popup: 'London', color: '#22c55e' }
]);
```

### clearMarkers()

Remove all markers from the map.

```js
mapView.clearMarkers();
```

### setView(lng, lat, zoom)

Smoothly fly to a specific location.

```js
mapView.setView(-122.4194, 37.7749, 15);
```

### setZoom(zoom)

Change the zoom level.

```js
mapView.setZoom(10);
```

### setPitch(pitch)

Change the 3D tilt angle (0-60 degrees).

```js
mapView.setPitch(45);
```

### setBearing(bearing)

Change the rotation angle (0-360 degrees).

```js
mapView.setBearing(180);
```

### fitBounds()

Automatically zoom to fit all markers.

```js
mapView.fitBounds();
```

## Advanced Examples

### Real-time Location Tracking with 3D

```js
import MapLibreView from '@ext/map/MapLibreView.js';

class LocationTracker extends View {
    async onInit() {
        this.mapView = new MapLibreView({
            markers: [],
            zoom: 16,
            pitch: 50,
            height: 500,
            style: 'streets'
        });
        
        this.addChild('map', this.mapView);
        this.startTracking();
    }
    
    async startTracking() {
        setInterval(() => {
            this.updateLocation();
        }, 5000);
    }
    
    async updateLocation() {
        // Get current location
        const { lng, lat } = await this.getCurrentPosition();
        
        const marker = {
            lng,
            lat,
            popup: `<strong>Current Location</strong><br>${new Date().toLocaleString()}`,
            color: '#3b82f6'
        };
        
        this.mapView.updateMarkers([marker]);
        
        // Smoothly fly to new location
        this.mapView.setView(lng, lat);
    }
}
```

### Heat Map Visualization

```js
class DataHeatMap extends View {
    async onInit() {
        const dataPoints = await this.fetchDataPoints();
        
        // Convert data points to markers with color coding
        const markers = dataPoints.map(point => {
            const intensity = point.value / 100;
            const color = this.getColorForIntensity(intensity);
            
            return {
                lng: point.longitude,
                lat: point.latitude,
                popup: `<strong>${point.name}</strong><br>Value: ${point.value}`,
                color: color
            };
        });
        
        this.mapView = new MapLibreView({
            markers,
            height: 500,
            style: 'dark'
        });
        
        this.addChild('map', this.mapView);
    }
    
    getColorForIntensity(intensity) {
        // Green -> Yellow -> Red gradient
        if (intensity < 0.33) return '#22c55e';
        if (intensity < 0.67) return '#f59e0b';
        return '#ef4444';
    }
}
```

### Interactive 3D Building Explorer

```js
class BuildingExplorer extends View {
    async onInit() {
        this.mapView = new MapLibreView({
            markers: [
                { lng: -74.0060, lat: 40.7128, popup: 'New York', color: '#3b82f6' }
            ],
            zoom: 17,
            pitch: 60,
            bearing: 0,
            height: 600,
            style: 'streets'
        });
        
        this.addChild('map', this.mapView);
        this.addRotationControls();
    }
    
    addRotationControls() {
        this.element.querySelector('.rotate-left').addEventListener('click', () => {
            const currentBearing = this.mapView.map.getBearing();
            this.mapView.setBearing(currentBearing - 45);
        });
        
        this.element.querySelector('.rotate-right').addEventListener('click', () => {
            const currentBearing = this.mapView.map.getBearing();
            this.mapView.setBearing(currentBearing + 45);
        });
        
        this.element.querySelector('.tilt-up').addEventListener('click', () => {
            const currentPitch = this.mapView.map.getPitch();
            this.mapView.setPitch(Math.min(60, currentPitch + 10));
        });
        
        this.element.querySelector('.tilt-down').addEventListener('click', () => {
            const currentPitch = this.mapView.map.getPitch();
            this.mapView.setPitch(Math.max(0, currentPitch - 10));
        });
    }
    
    get template() {
        return `
            <div>
                <div class="mb-2 btn-group">
                    <button class="btn btn-sm btn-outline-secondary rotate-left">↶ Rotate Left</button>
                    <button class="btn btn-sm btn-outline-secondary rotate-right">Rotate Right ↷</button>
                    <button class="btn btn-sm btn-outline-secondary tilt-up">Tilt Up ↑</button>
                    <button class="btn btn-sm btn-outline-secondary tilt-down">Tilt Down ↓</button>
                </div>
                <div data-container="map"></div>
            </div>
        `;
    }
}
```

### Multi-location Route Display

```js
class RouteView extends View {
    async onInit() {
        const route = [
            { lng: -122.4194, lat: 37.7749, name: 'Start: San Francisco' },
            { lng: -119.4179, lat: 36.7783, name: 'Waypoint: Fresno' },
            { lng: -118.2437, lat: 34.0522, name: 'End: Los Angeles' }
        ];
        
        const markers = route.map((point, index) => ({
            lng: point.lng,
            lat: point.lat,
            popup: point.name,
            color: index === 0 ? '#22c55e' : index === route.length - 1 ? '#ef4444' : '#f59e0b'
        }));
        
        this.mapView = new MapLibreView({
            markers,
            height: 450,
            style: 'streets'
        });
        
        this.addChild('map', this.mapView);
    }
}
```

### Comparison View (Side-by-side Maps)

```js
class MapComparison extends View {
    async onInit() {
        const location = { lng: -122.4194, lat: 37.7749 };
        
        this.map2D = new MapLibreView({
            markers: [{ ...location, popup: '2D View' }],
            zoom: 15,
            height: 400,
            style: 'streets'
        });
        
        this.map3D = new MapLibreView({
            markers: [{ ...location, popup: '3D View' }],
            zoom: 16,
            pitch: 60,
            bearing: -17.6,
            height: 400,
            style: 'streets'
        });
        
        this.addChild('map2d', this.map2D);
        this.addChild('map3d', this.map3D);
    }
    
    get template() {
        return `
            <div class="row">
                <div class="col-md-6">
                    <h5>2D Map</h5>
                    <div data-container="map2d"></div>
                </div>
                <div class="col-md-6">
                    <h5>3D Map</h5>
                    <div data-container="map3d"></div>
                </div>
            </div>
        `;
    }
}
```

## Best Practices

### 1. Use lng, lat Order

MapLibre follows GeoJSON standard with longitude first:
```js
// Correct
{ lng: -122.4194, lat: 37.7749 }

// Wrong (this is Leaflet/MapView order)
{ lat: 37.7749, lng: -122.4194 }
```

### 2. Choose Appropriate Pitch for Use Case

```js
// Flat map for data visualization
pitch: 0

// Slight tilt for context
pitch: 30

// Maximum tilt for 3D buildings
pitch: 60
```

### 3. Use Color Coding for Categorical Data

```js
const markers = locations.map(loc => ({
    lng: loc.longitude,
    lat: loc.latitude,
    popup: loc.name,
    color: loc.status === 'active' ? '#22c55e' : '#ef4444'
}));
```

### 4. Provide Enough Height for 3D Views

3D views need more vertical space:
```js
// 2D map
height: 400

// 3D map with pitch
height: 500  // Give it more room
```

### 5. Use Dark Style for Dark Mode UIs

```js
// Match your app theme
const mapStyle = isDarkMode ? 'dark' : 'light';

const mapView = new MapLibreView({
    markers: locations,
    style: mapStyle
});
```

### 6. Limit Markers for Performance

MapLibre handles many markers well, but consider clustering for 1000+:
```js
// Good performance up to ~1000 markers
// For more, consider clustering or filtering
```

### 7. Clean Up Properly

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

### 8. Handle Coordinate Conversion

If you have lat/lng data (MapView format), convert it:
```js
// Convert from MapView format
const mapViewMarkers = [
    { lat: 37.7749, lng: -122.4194 }
];

// To MapLibreView format
const mapLibreMarkers = mapViewMarkers.map(m => ({
    lng: m.lng,  // Swap order
    lat: m.lat,
    popup: m.popup,
    color: m.color
}));
```

### 9. Use Navigation Controls for 3D Maps

3D maps benefit from navigation controls:
```js
const mapView = new MapLibreView({
    markers: locations,
    pitch: 50,
    showNavigationControl: true  // Default, but explicit is good
});
```

### 10. Consider Browser Compatibility

MapLibre GL requires WebGL support:
```js
if (!maplibregl.supported()) {
    console.warn('MapLibre GL not supported, falling back to MapView');
    // Use MapView as fallback
}
```

---

**Related Documentation:**
- [MapView](./MapView.md) - Simple Leaflet-based map component
- [TabView](../guide/TabView.md) - For organizing maps with other data
- [Dialog](../guide/Dialog.md) - For showing maps in modals
- [MapLibre GL JS Documentation](https://maplibre.org/maplibre-gl-js-docs/api/) - Official MapLibre docs
