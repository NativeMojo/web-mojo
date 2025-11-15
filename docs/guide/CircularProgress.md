# CircularProgress

Modern circular progress indicator component with SVG rendering, animations, and extensive customization options.

## Overview

`CircularProgress` is a versatile component for displaying progress in a circular format. It supports single or multi-segment progress, real-time updates, animations, gradients, and interactive tooltips. Built with SVG for crisp rendering at any size.

## Component Anatomy

The CircularProgress component consists of three main parts:

### 1. Track
The **track** (or track circle) is the background circle that shows the full path or range. This is typically a light gray circle that represents 100% of the possible progress.

- Controlled by the `trackColor` option (default: `#e9ecef`)
- Always displays the full circle (or arc if using `gap`)
- Provides visual context for the progress amount

### 2. Progress Bar
The **progress bar** (or progress circle) is the colored circle or arc that shows the actual progress value. This is the animated portion that grows as progress increases.

- Controlled by the `color` option (default: `#0d6efd`)
- Can use solid colors, gradients, or variant colors
- Animates smoothly when value changes
- CSS class: `.circular-progress-bar`

### 3. Center Content
The **center content** is the text, icon, or custom HTML displayed in the middle of the circle.

- Can display: percentage value, custom formatted value, label text, icon, or custom HTML
- Controlled by `showValue`, `label`, `icon`, `labelHtml`, and `valueFormatter` options
- CSS classes: `.circular-progress-center`, `.circular-progress-value`, `.circular-progress-label`

```
┌─────────────────────────┐
│                         │
│    ╭───────────╮       │
│   ╱ ███████████ ╲      │  ← Progress Bar (colored arc)
│  │ █           █ │     │
│  │ █   75%     █ │     │  ← Center Content (value/label)
│  │ █           █ │     │
│   ╲ █████████████╱      │
│    ╰─────○─────╯       │  ← Track (background circle)
│                         │
└─────────────────────────┘
```

## Features

- **SVG-based rendering** - Scales perfectly from tiny to large
- **Size presets** - Pre-defined sizes (xs, sm, md, lg, xl) or custom pixel values
- **Color variants** - Bootstrap-themed variants (success, warning, danger, info)
- **Gradient support** - Smooth color gradients around the circle
- **Multi-segment mode** - Display multiple progress segments
- **Arc styles** - Create gauge-style indicators with gap angles
- **Rotation control** - Customize where progress starts
- **Center content** - Display value, label, or custom icon
- **Animations** - Smooth progress animations
- **Interactive** - Click events with Bootstrap popover tooltips
- **DataFormatter integration** - Format values using MOJO DataFormatter
- **Theme support** - Automatic dark/light theme integration

## Basic Usage

```javascript
import { CircularProgress } from '@mojo/charts';

// Simple percentage
const progress = new CircularProgress({
  value: 75
});

await progress.render();
document.getElementById('container').appendChild(progress.element);
```

## Configuration Options

### Core Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `value` | Number | `0` | Current progress value |
| `min` | Number | `0` | Minimum value |
| `max` | Number | `100` | Maximum value |

### Dimensions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `size` | String\|Number | `'md'` | Size preset (`'xs'`, `'sm'`, `'md'`, `'lg'`, `'xl'`) or custom pixel value |
| `strokeWidth` | Number\|String | `'auto'` | Thickness of the ring, or `'auto'` for size-based |

**Size presets:**
- `xs` - 40px (stroke: 4px)
- `sm` - 60px (stroke: 6px)
- `md` - 80px (stroke: 8px)
- `lg` - 120px (stroke: 12px)
- `xl` - 180px (stroke: 16px)

### Colors & Styling

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `color` | String | `'#0d6efd'` | Progress color (hex, rgb, or CSS color) |
| `trackColor` | String | `'#e9ecef'` | Background track color |
| `gradientColors` | Array\|null | `null` | Array of colors for gradient `['#0d6efd', '#00d4ff']` |
| `variant` | String | `'default'` | Bootstrap variant: `'default'`, `'success'`, `'warning'`, `'danger'`, `'info'` |
| `rounded` | Boolean | `true` | Rounded line caps |
| `shadow` | Boolean | `false` | Add drop shadow effect |

### Arc Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `rotation` | Number | `-90` | Start angle in degrees (`-90` = top, `0` = right, `90` = bottom, `180` = left) |
| `gap` | Number | `0` | Gap angle in degrees (creates arc instead of full circle) |

### Center Content

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `showValue` | Boolean | `true` | Show value in center |
| `valueFormat` | String | `'percentage'` | Format: `'percentage'`, `'fraction'`, `'value'`, or DataFormatter string |
| `valueFormatter` | Function\|null | `null` | Custom formatter: `(value, min, max) => string` |
| `label` | String\|null | `null` | Optional label below value |
| `labelHtml` | String\|null | `null` | Custom HTML content for center (overrides value/label) |
| `icon` | String\|null | `null` | Icon class (e.g., `'bi bi-check'`) - replaces value |

### Animation

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `animate` | Boolean | `true` | Animate progress on render |
| `animationDuration` | Number | `600` | Animation duration in milliseconds |
| `animationEasing` | String | `'ease-out'` | CSS easing function |

### Interaction

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `clickable` | Boolean | `false` | Enable click events |
| `tooltip` | String\|Function\|Object\|null | `null` | Tooltip content (requires `clickable: true`) |
| `tooltipPlacement` | String | `'top'` | Bootstrap popover placement |

### Multi-Segment Mode

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `segments` | Array\|null | `null` | Array of segment objects: `[{value: 30, color: '#198754'}, ...]` |
| `segmentGap` | Number | `2` | Gap between segments in degrees |

## Examples

### Basic Progress Indicators

```javascript
// Simple percentage (0-100)
const progress1 = new CircularProgress({
  value: 75,
  size: 'md'
});

// Custom range
const progress2 = new CircularProgress({
  value: 8,
  min: 0,
  max: 10,
  valueFormat: 'fraction' // Shows "8/10"
});

// Value only
const progress3 = new CircularProgress({
  value: 1500,
  min: 0,
  max: 5000,
  valueFormat: 'value' // Shows "1500"
});
```

### Size Variants

```javascript
// Preset sizes
const tiny = new CircularProgress({ value: 65, size: 'xs' });
const small = new CircularProgress({ value: 65, size: 'sm' });
const medium = new CircularProgress({ value: 65, size: 'md' });
const large = new CircularProgress({ value: 65, size: 'lg' });
const huge = new CircularProgress({ value: 65, size: 'xl' });

// Custom size
const custom = new CircularProgress({ 
  value: 65, 
  size: 150, // 150px diameter
  strokeWidth: 10 // Custom stroke
});
```

### Color Variants

```javascript
// Bootstrap variants
const success = new CircularProgress({ value: 90, variant: 'success' });
const warning = new CircularProgress({ value: 65, variant: 'warning' });
const danger = new CircularProgress({ value: 25, variant: 'danger' });
const info = new CircularProgress({ value: 50, variant: 'info' });

// Custom color
const custom = new CircularProgress({ 
  value: 75,
  color: '#ff6b6b',
  trackColor: 'rgba(255, 107, 107, 0.1)'
});

// Gradient
const gradient = new CircularProgress({
  value: 80,
  gradientColors: ['#0d6efd', '#6f42c1', '#d63384']
});
```

### Arc Styles (Gauges)

```javascript
// 3/4 circle (270°)
const gauge1 = new CircularProgress({
  value: 75,
  gap: 90, // 90° gap at top
  size: 'lg'
});

// Half circle (180°)
const gauge2 = new CircularProgress({
  value: 65,
  gap: 180,
  rotation: 180, // Start at left
  size: 'lg'
});

// Custom arc
const gauge3 = new CircularProgress({
  value: 80,
  gap: 45, // 315° arc
  rotation: -67.5, // Center the gap at top
  size: 'lg'
});
```

### Rotation

```javascript
// Start at different positions
const top = new CircularProgress({ value: 75, rotation: -90 }); // Top (default)
const right = new CircularProgress({ value: 75, rotation: 0 }); // Right
const bottom = new CircularProgress({ value: 75, rotation: 90 }); // Bottom
const left = new CircularProgress({ value: 75, rotation: 180 }); // Left
```

### With Icons

```javascript
// Complete indicator
const complete = new CircularProgress({
  value: 100,
  icon: 'bi bi-check-lg',
  variant: 'success',
  size: 'lg'
});

// Upload progress
const upload = new CircularProgress({
  value: 65,
  icon: 'bi bi-cloud-upload',
  variant: 'info',
  size: 'lg'
});

// Download progress
const download = new CircularProgress({
  value: 45,
  icon: 'bi bi-cloud-download',
  variant: 'warning',
  size: 'lg'
});
```

### With Labels

```javascript
// Percentage with label
const labeled1 = new CircularProgress({
  value: 75,
  label: 'UPLOAD',
  size: 'lg'
});

// Fraction with label
const labeled2 = new CircularProgress({
  value: 8,
  min: 0,
  max: 10,
  valueFormat: 'fraction',
  label: 'TASKS',
  variant: 'success',
  size: 'lg'
});

// Custom formatter with label
const labeled3 = new CircularProgress({
  value: 42.5,
  valueFormatter: (v) => `${v.toFixed(1)}°C`,
  label: 'TEMP',
  variant: 'warning',
  size: 'lg'
});
```

### Multi-Segment Progress

```javascript
// Task status
const taskStatus = new CircularProgress({
  size: 'lg',
  segments: [
    { value: 30, color: '#198754' }, // Completed
    { value: 45, color: '#ffc107' }, // In Progress
    { value: 10, color: '#dc3545' }  // Failed
  ],
  segmentGap: 3,
  label: 'TASKS',
  valueFormatter: () => '85%' // Total
});

// Storage distribution
const storage = new CircularProgress({
  size: 'lg',
  segments: [
    { value: 25, color: '#0d6efd' }, // Documents
    { value: 30, color: '#6f42c1' }, // Images
    { value: 20, color: '#d63384' }  // Videos
  ],
  segmentGap: 2,
  label: 'USED',
  valueFormatter: () => '75%'
});

// With custom center content
const custom = new CircularProgress({
  size: 'lg',
  segments: [
    { value: 45, color: '#0d6efd' },
    { value: 25, color: '#198754' }
  ],
  segmentGap: 2,
  labelHtml: '<div style="font-size: 1.5rem;">⭐</div><div style="font-size: 0.75rem;">70%</div>'
});
```

### Interactive with Tooltips

```javascript
// Click to show tooltip
const interactive = new CircularProgress({
  value: 75,
  size: 'lg',
  clickable: true,
  tooltip: 'Upload progress: 75%'
});

// Function-based tooltip
const dynamic = new CircularProgress({
  value: 65,
  clickable: true,
  tooltip: (value, { percentage }) => {
    return `Progress: ${percentage.toFixed(1)}%<br>Value: ${value}`;
  }
});

// Object-based tooltip with title
const detailed = new CircularProgress({
  value: 80,
  clickable: true,
  tooltip: {
    title: 'Upload Status',
    content: 'Processing large file...',
    html: '<strong>80%</strong> complete'
  }
});

// Listen to click events
interactive.on('progress:clicked', (data) => {
  console.log('Clicked:', data.value, data.percentage);
});
```

### Custom Formatting with DataFormatter

```javascript
// Currency
const revenue = new CircularProgress({
  value: 85000,
  min: 0,
  max: 100000,
  valueFormat: 'currency:USD',
  label: 'REVENUE',
  size: 'lg'
});

// Number with decimals
const precise = new CircularProgress({
  value: 1500,
  min: 0,
  max: 5000,
  valueFormat: 'number:decimal',
  label: 'POINTS',
  size: 'lg'
});

// Date/Time
const timer = new CircularProgress({
  value: 3600,
  min: 0,
  max: 7200,
  valueFormat: 'duration:seconds',
  label: 'TIME',
  size: 'lg'
});
```

## Public API Methods

### Value Management

```javascript
const progress = new CircularProgress({ value: 0 });

// Set value (with animation by default)
progress.setValue(75);
progress.setValue(75, false); // Without animation

// Set range
progress.setRange(0, 200);

// Increment/decrement
progress.increment(10); // Add 10
progress.decrement(5);  // Subtract 5

// Get current value
const current = progress.getValue(); // Returns number

// Get percentage (0-100)
const percentage = progress.getPercentageValue(); // Returns percentage
```

### Styling

```javascript
// Change color
progress.setColor('#ff6b6b');

// Set gradient
progress.setGradient(['#0d6efd', '#00d4ff', '#6f42c1']);

// Change size
progress.setSize('xl'); // Preset
progress.setSize(150);  // Custom pixels
```

### Animation

```javascript
// Animate to target value
progress.animateTo(100, 2000); // Animate to 100 over 2 seconds

// Pulse effect
progress.pulse(); // Quick scale animation

// Complete with success styling
progress.complete(); // Sets to max, applies success variant, and pulses
```

### State Management

```javascript
// Reset to minimum
progress.reset();

// Show/hide
progress.hide();
progress.show();
```

## Events

CircularProgress emits the following events:

### `progress:clicked`

Fired when a clickable progress indicator is clicked.

```javascript
progress.on('progress:clicked', (data) => {
  console.log(data.value);      // Current value
  console.log(data.percentage); // Percentage (0-100)
  console.log(data.min);        // Min value
  console.log(data.max);        // Max value
});
```

## Real-time Updates

### Simple Polling

```javascript
const progress = new CircularProgress({ value: 0 });

// Update every 500ms
setInterval(async () => {
  const response = await fetch('/api/upload-progress');
  const data = await response.json();
  progress.setValue(data.progress);
}, 500);
```

### With Upload Progress

```javascript
const uploadProgress = new CircularProgress({
  value: 0,
  size: 'xl',
  label: 'UPLOAD'
});

await uploadProgress.render();
document.getElementById('container').appendChild(uploadProgress.element);

const xhr = new XMLHttpRequest();
xhr.upload.addEventListener('progress', (e) => {
  if (e.lengthComputable) {
    const percentage = (e.loaded / e.total) * 100;
    uploadProgress.setValue(percentage, false);
  }
});

xhr.open('POST', '/api/upload');
xhr.send(formData);
```

### Animated Progress Simulation

```javascript
const progress = new CircularProgress({ value: 0 });

// Simulate loading
let currentValue = 0;
const interval = setInterval(() => {
  currentValue += Math.random() * 5;
  
  if (currentValue >= 100) {
    progress.complete();
    clearInterval(interval);
  } else {
    progress.setValue(currentValue);
  }
}, 200);
```

## Styling & Theming

### CSS Custom Properties

CircularProgress uses CSS custom properties for theming:

```css
:root {
  --chart-text: #212529;
  --chart-text-muted: #6c757d;
}

[data-theme="dark"] {
  --chart-text: #ffffff;
  --chart-text-muted: #adb5bd;
}
```

### Custom Styling

```css
/* Override hover effect */
.circular-progress-clickable .circular-progress-container:hover {
  transform: scale(1.1);
  filter: brightness(1.2);
}

/* Custom value styling */
.circular-progress-value {
  font-family: 'Courier New', monospace;
  font-weight: 900;
}

/* Custom label styling */
.circular-progress-label {
  letter-spacing: 0.1em;
}
```

## Accessibility

CircularProgress includes built-in accessibility features:

- **Reduced motion support** - Respects `prefers-reduced-motion` media query
- **High contrast mode** - Enhanced outlines in high contrast mode
- **Keyboard focus** - Visible focus indicators for clickable instances
- **Print-friendly** - Optimized for printing

## Browser Support

- Modern browsers with SVG support
- Requires Bootstrap 5.x for popover tooltips (optional)
- Graceful degradation for older browsers

## Performance Tips

1. **Disable animations** for rapid updates:
   ```javascript
   progress.setValue(newValue, false); // No animation
   ```

2. **Throttle updates** when updating frequently:
   ```javascript
   let lastUpdate = 0;
   function updateProgress(value) {
     const now = Date.now();
     if (now - lastUpdate > 100) { // Max 10 updates per second
       progress.setValue(value, false);
       lastUpdate = now;
     }
   }
   ```

3. **Use size presets** instead of custom sizes when possible for better performance.

## Common Patterns

### Upload Progress with Status

```javascript
const progress = new CircularProgress({
  value: 0,
  size: 'xl',
  color: '#0d6efd',
  label: 'UPLOAD',
  clickable: true
});

const uploadFile = async (file) => {
  const xhr = new XMLHttpRequest();
  
  xhr.upload.addEventListener('progress', (e) => {
    if (e.lengthComputable) {
      const pct = (e.loaded / e.total) * 100;
      progress.setValue(pct, false);
      progress.tooltip = `Uploaded: ${(e.loaded / 1024 / 1024).toFixed(1)} MB / ${(e.total / 1024 / 1024).toFixed(1)} MB`;
    }
  });
  
  xhr.addEventListener('load', () => {
    if (xhr.status === 200) {
      progress.complete();
    } else {
      progress.variant = 'danger';
      progress.setValue(progress.getValue());
    }
  });
  
  xhr.open('POST', '/api/upload');
  xhr.send(formData);
};
```

### System Resource Monitor

```javascript
const cpuUsage = new CircularProgress({
  value: 0,
  size: 'md',
  variant: 'info',
  label: 'CPU'
});

setInterval(async () => {
  const stats = await fetch('/api/system/stats').then(r => r.json());
  
  cpuUsage.setValue(stats.cpu);
  
  // Change color based on usage
  if (stats.cpu > 80) {
    cpuUsage.variant = 'danger';
  } else if (stats.cpu > 50) {
    cpuUsage.variant = 'warning';
  } else {
    cpuUsage.variant = 'success';
  }
  
  cpuUsage.applyVariant();
  cpuUsage.renderProgress();
}, 1000);
```

### Multi-Step Process

```javascript
const steps = ['Install', 'Build', 'Test', 'Deploy'];
let currentStep = 0;

const progress = new CircularProgress({
  value: 0,
  size: 'xl',
  segments: [],
  valueFormatter: () => `${currentStep}/${steps.length}`,
  label: 'STEPS'
});

const completeStep = () => {
  if (currentStep < steps.length) {
    const segments = [];
    for (let i = 0; i <= currentStep; i++) {
      segments.push({
        value: 100 / steps.length,
        color: i === currentStep ? '#0dcaf0' : '#198754'
      });
    }
    progress.segments = segments;
    progress.renderProgress();
    progress.renderCenterContent();
    currentStep++;
  }
};
```

## Related Components

- [BaseChart](./BaseChart.md) - Base chart component
- [PieChart](./PieChart.md) - Pie/doughnut charts with segments
- [MiniChart](./MiniChart.md) - Lightweight sparkline charts
- [MetricsMiniChart](./MetricsMiniChart.md) - Compact metrics display

## See Also

- [Examples: CircularProgress](../../examples/circular-progress/index.html)
- [Examples: Multi-Segment](../../examples/circular-progress/segments.html)
- [Examples: Real-time](../../examples/circular-progress/realtime.html)
