/**
 * MOJO Charts Extension — Entry (3.0.0)
 *
 * Native SVG charts. No Chart.js dependency at runtime.
 */

import '@ext/charts/css/charts.css';

export { default as SeriesChart } from '@ext/charts/SeriesChart.js';
export { default as PieChart } from '@ext/charts/PieChart.js';
export { default as MetricsChart } from '@ext/charts/MetricsChart.js';
export { default as MiniChart } from '@ext/charts/MiniChart.js';
export { default as MetricsMiniChart } from '@ext/charts/MetricsMiniChart.js';
export { default as MetricsMiniChartWidget } from '@ext/charts/MetricsMiniChartWidget.js';
export { default as CircularProgress } from '@ext/charts/CircularProgress.js';
export { exportChartPng } from '@ext/charts/exportChart.js';

// Convenience
export { default as WebApp } from '@core/WebApp.js';

// Version info passthrough
export {
    VERSION_INFO,
    VERSION,
    VERSION_MAJOR,
    VERSION_MINOR,
    VERSION_REVISION,
    BUILD_TIME
} from './version.js';
