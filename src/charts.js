/**
 * MOJO Charts Package - Chart components using Chart.js
 * Package: web-mojo/charts
 */

// Import charts CSS
import './css/charts.css';

// Export chart components
export { default as BaseChart } from './charts/BaseChart.js';
export { default as SeriesChart } from './charts/SeriesChart.js';
export { default as PieChart } from './charts/PieChart.js';

// Export WebSocket utility (used by charts)
export { default as WebSocketClient } from './utils/WebSocket.js';

// Package metadata
export const CHARTS_PACKAGE_NAME = 'web-mojo/charts';
export const CHARTS_VERSION = '1.0.0';