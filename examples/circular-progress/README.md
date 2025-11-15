# CircularProgress Examples

This directory contains comprehensive examples for the CircularProgress component.

## Examples

### 1. [index.html](./index.html) - Main Showcase
Complete showcase of all CircularProgress features:
- Basic progress indicators (0%, 25%, 50%, 75%, 100%)
- Size variants (xs, sm, md, lg, xl)
- Color variants (default, success, warning, danger, info)
- Gradient colors
- Custom value ranges (fraction, value, custom formatting)
- Arc styles with gap angles (45°, 90°, 180°)
- Rotation examples (0°, 90°, 180°, 270°)
- Icon displays (check, upload, download, heart)
- Labels with progress
- Interactive demo with controls

### 2. [segments.html](./segments.html) - Multi-Segment Progress
Examples of multi-segment circular progress:
- Task status tracking (completed, in progress, failed)
- Storage distribution by type
- Budget allocation visualization
- Arc-style gauges with segments
- Progress step indicators
- Segments with center labels

### 3. [realtime.html](./realtime.html) - Real-time Updates
Dynamic progress examples with simulated real-time updates:
- File upload simulation with controls (start, pause, cancel)
- System metrics monitoring (CPU, Memory, Disk, Network)
- Build & deploy pipeline progress
- Battery level indicators with draining
- Countdown timer (Pomodoro-style)

## Getting Started

1. Build the project:
   ```bash
   npm run build
   ```

2. Open any example file in a browser or use a local server:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js
   npx http-server -p 8000
   ```

3. Navigate to:
   - http://localhost:8000/examples/circular-progress/index.html
   - http://localhost:8000/examples/circular-progress/segments.html
   - http://localhost:8000/examples/circular-progress/realtime.html

## Key Features Demonstrated

### Size Control
- **Presets**: `xs` (40px), `sm` (60px), `md` (80px), `lg` (120px), `xl` (180px)
- **Custom**: Any pixel value

### Styling Options
- Bootstrap color variants
- Custom colors and gradients
- Drop shadows
- Rounded/square line caps

### Progress Types
- **Single**: Simple 0-100% progress
- **Multi-segment**: Multiple colored segments
- **Arc/Gauge**: Partial circles with gaps

### Customization
- Custom value formatting (percentage, fraction, value, DataFormatter)
- Center icons (Bootstrap Icons)
- Labels below values
- Custom HTML content

### Interaction
- Click events
- Bootstrap popover tooltips
- Real-time value updates
- Smooth animations

## Code Examples

### Basic Usage
```javascript
import { CircularProgress } from 'web-mojo/charts';

const progress = new CircularProgress({
  value: 75,
  size: 'md'
});

await progress.render();
document.getElementById('container').appendChild(progress.element);
```

### Multi-Segment
```javascript
const taskProgress = new CircularProgress({
  segments: [
    { value: 30, color: '#198754' }, // Completed
    { value: 45, color: '#ffc107' }, // In Progress
    { value: 10, color: '#dc3545' }  // Failed
  ],
  segmentGap: 3,
  size: 'xl'
});
```

### Real-time Updates
```javascript
const progress = new CircularProgress({ value: 0 });

setInterval(async () => {
  const data = await fetch('/api/progress').then(r => r.json());
  progress.setValue(data.percentage);
}, 500);
```

## Documentation

Full documentation available at: [docs/guide/CircularProgress.md](../../docs/guide/CircularProgress.md)

## Dependencies

- Bootstrap 5.3+ (for popover tooltips - optional)
- Bootstrap Icons (for icon examples - optional)
- Modern browser with SVG support

## Browser Support

- Chrome/Edge: Latest
- Firefox: Latest
- Safari: Latest
- Opera: Latest

## Tips

1. **Performance**: Disable animations for rapid updates using `setValue(value, false)`
2. **Accessibility**: Component includes reduced motion and high contrast support
3. **Theming**: Integrates with MOJO theme system (light/dark modes)
4. **Tooltips**: Requires Bootstrap 5 for popover functionality

## Related Components

- [MiniChart](../simple-charts.html) - Lightweight sparkline charts
- [PieChart](../simple-charts.html) - Full pie/doughnut charts
