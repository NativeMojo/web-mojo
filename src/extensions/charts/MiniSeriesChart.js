/**
 * MiniSeriesChart - Lightweight SVG multi-series chart component
 * Renders line, bar, and area charts with labels, legend, and tooltips.
 * No Chart.js dependency — uses SVG for crisp, predictable sizing.
 */

import View from '@core/View.js';
import dataFormatter from '@core/utils/DataFormatter.js';

const SERIES_COLORS = [
    '#36A2EB', '#FF6384', '#FFCE56', '#4BC0C0', '#9966FF',
    '#FF9F40', '#66BB6A', '#EF5350', '#AB47BC', '#26C6DA'
];

const FILL_COLORS = [
    'rgba(54,162,235,0.15)', 'rgba(255,99,132,0.15)', 'rgba(255,206,86,0.15)',
    'rgba(75,192,192,0.15)', 'rgba(153,102,255,0.15)', 'rgba(255,159,64,0.15)',
    'rgba(102,187,106,0.15)', 'rgba(239,83,80,0.15)', 'rgba(171,71,188,0.15)',
    'rgba(38,198,218,0.15)'
];

export default class MiniSeriesChart extends View {
    constructor(options = {}) {
        super({
            className: 'mini-series-chart',
            ...options
        });

        // Chart type: 'line', 'bar', 'area'
        this.chartType = options.chartType || 'line';

        // Dimensions
        this.width = options.width || '100%';
        this.height = options.height || 200;

        // Padding inside the SVG (left for y-axis, bottom for x-axis labels)
        this.padTop = 10;
        this.padRight = 12;
        this.padBottom = 24;   // room for x-axis labels
        this.padLeft = 40;     // room for y-axis values

        // Line options
        this.strokeWidth = options.strokeWidth || 2;
        this.smoothing = options.smoothing || 0.3;
        this.showDots = options.showDots !== false;
        this.dotRadius = options.dotRadius || 3;
        this.fill = options.fill ?? (this.chartType === 'area');

        // Bar options
        this.barGap = options.barGap || 2;
        this.groupGap = options.groupGap || 6;

        // Grid
        this.showGrid = options.showGrid !== false;
        this.gridLines = options.gridLines || 5;

        // Legend
        this.showLegend = options.showLegend !== false;
        this.legendPosition = options.legendPosition || 'top';

        // Tooltip
        this.showTooltip = options.showTooltip !== false;

        // Colors
        this.colors = options.colors || SERIES_COLORS;
        this.fillColors = options.fillColors || FILL_COLORS;

        // Value formatting
        this.valueFormatter = options.valueFormatter || null;
        this.dataFormatter = dataFormatter;

        // Data — Chart.js format { labels, datasets: [{ label, data }] }
        this._rawData = options.data || null;
        this._labels = [];
        this._datasets = [];
    }

    // ── template ──────────────────────────────────────────────────────

    getTemplate() {
        const widthStyle = typeof this.width === 'number' ? `${this.width}px` : this.width;
        const heightStyle = typeof this.height === 'number' ? `${this.height}px` : this.height;

        return `
            <div class="mini-series-wrapper">
                ${this.showLegend ? '<div class="mini-series-legend"></div>' : ''}
                <div class="mini-series-svg-area" style="width:${widthStyle}; height:${heightStyle}; position:relative;">
                    <svg class="mini-series-svg" width="100%" height="100%"
                         preserveAspectRatio="none" style="display:block;">
                    </svg>
                    ${this.showTooltip ? '<div class="mini-series-tooltip" style="display:none;"></div>' : ''}
                </div>
            </div>
        `;
    }

    // ── lifecycle ─────────────────────────────────────────────────────

    async onAfterRender() {
        this.svg = this.element.querySelector('.mini-series-svg');
        this.tooltipEl = this.element.querySelector('.mini-series-tooltip');
        this.legendEl = this.element.querySelector('.mini-series-legend');

        this._updateDimensions();
        this._setupResizeObserver();

        if (this._rawData) {
            this._parseData(this._rawData);
            this._renderChart();
            this._renderLegend();
        }
    }

    // ── public API ────────────────────────────────────────────────────

    setData(data) {
        this._rawData = data;
        this._parseData(data);
        if (this.svg) {
            this._renderChart();
            this._renderLegend();
        }
    }

    // ── dimensions ────────────────────────────────────────────────────

    _updateDimensions() {
        if (!this.svg) return;
        const rect = this.svg.getBoundingClientRect();
        this._w = rect.width || 300;
        this._h = rect.height || (typeof this.height === 'number' ? this.height : 200);
        this.svg.setAttribute('viewBox', `0 0 ${this._w} ${this._h}`);
    }

    _setupResizeObserver() {
        if (typeof ResizeObserver === 'undefined') return;
        this._resizeObserver = new ResizeObserver(() => {
            this._updateDimensions();
            if (this._datasets.length > 0) this._renderChart();
        });
        if (this.svg) this._resizeObserver.observe(this.svg);
    }

    // ── data normalisation ────────────────────────────────────────────

    _parseData(data) {
        if (!data) { this._labels = []; this._datasets = []; return; }

        if (data.labels && data.datasets) {
            this._labels = data.labels || [];
            this._datasets = data.datasets.map((ds, i) => ({
                label: ds.label || `Series ${i + 1}`,
                data: ds.data || [],
                color: ds.borderColor || ds.color || this.colors[i % this.colors.length],
                fillColor: ds.backgroundColor || this.fillColors[i % this.fillColors.length]
            }));
        } else {
            this._labels = [];
            this._datasets = [];
        }
    }

    // ── chart area helpers ────────────────────────────────────────────

    get _plotLeft() { return this.padLeft; }
    get _plotTop() { return this.padTop; }
    get _plotRight() { return this._w - this.padRight; }
    get _plotBottom() { return this._h - this.padBottom; }
    get _plotW() { return this._plotRight - this._plotLeft; }
    get _plotH() { return this._plotBottom - this._plotTop; }

    _calcBounds() {
        let min = Infinity, max = -Infinity;
        for (const ds of this._datasets) {
            for (const v of ds.data) {
                if (v < min) min = v;
                if (v > max) max = v;
            }
        }
        if (!isFinite(min)) { min = 0; max = 1; }
        if (min === max) { min -= 1; max += 1; }
        // Add 5% padding on top
        const range = max - min;
        max += range * 0.05;
        if (min > 0) min = Math.max(0, min - range * 0.05);
        return { min, max };
    }

    _yToPixel(value, min, max) {
        return this._plotBottom - ((value - min) / (max - min)) * this._plotH;
    }

    _xToPixel(index, count) {
        if (count <= 1) return this._plotLeft + this._plotW / 2;
        return this._plotLeft + (index / (count - 1)) * this._plotW;
    }

    // ── render ────────────────────────────────────────────────────────

    _renderChart() {
        if (!this.svg) return;
        this._updateDimensions();
        this.svg.innerHTML = '';

        if (this._datasets.length === 0) return;

        const { min, max } = this._calcBounds();
        const count = this._labels.length || (this._datasets[0]?.data.length || 0);

        this._renderGrid(min, max);
        this._renderAxes(min, max, count);

        if (this.chartType === 'bar') {
            this._renderBars(min, max, count);
        } else {
            this._renderLines(min, max, count);
        }

        this._attachHoverListeners();
    }

    _renderGrid(min, max) {
        if (!this.showGrid) return;

        const steps = this.gridLines;
        for (let i = 0; i <= steps; i++) {
            const y = this._plotTop + (i / steps) * this._plotH;
            const line = this._svgEl('line', {
                x1: this._plotLeft, y1: y,
                x2: this._plotRight, y2: y,
                stroke: 'var(--bs-border-color, #dee2e6)',
                'stroke-width': 0.5,
                'stroke-dasharray': '3,3'
            });
            this.svg.appendChild(line);
        }
    }

    _renderAxes(min, max, count) {
        // Y-axis labels
        const steps = this.gridLines;
        for (let i = 0; i <= steps; i++) {
            const value = max - (i / steps) * (max - min);
            const y = this._plotTop + (i / steps) * this._plotH;
            const label = this._formatAxisValue(value);
            const text = this._svgEl('text', {
                x: this._plotLeft - 4,
                y: y + 3,
                'text-anchor': 'end',
                'font-size': '10',
                fill: 'var(--bs-secondary-color, #6c757d)'
            });
            text.textContent = label;
            this.svg.appendChild(text);
        }

        // X-axis labels — show a reasonable subset to avoid overlap
        const maxXLabels = Math.floor(this._plotW / 50);
        const step = Math.max(1, Math.ceil(count / maxXLabels));
        for (let i = 0; i < count; i += step) {
            const x = this._xToPixel(i, count);
            const text = this._svgEl('text', {
                x,
                y: this._plotBottom + 14,
                'text-anchor': 'middle',
                'font-size': '10',
                fill: 'var(--bs-secondary-color, #6c757d)'
            });
            const rawLabel = this._labels[i] || '';
            // Truncate long labels
            text.textContent = String(rawLabel).length > 10
                ? String(rawLabel).substring(0, 9) + '…'
                : rawLabel;
            this.svg.appendChild(text);
        }
    }

    _renderLines(min, max, count) {
        this._datasets.forEach((ds, dsIdx) => {
            const points = ds.data.map((v, i) => ({
                x: this._xToPixel(i, count),
                y: this._yToPixel(v, min, max)
            }));

            // Area fill
            if (this.fill && points.length > 1) {
                const areaPath = this._buildLinePath(points)
                    + ` L ${points[points.length - 1].x},${this._plotBottom}`
                    + ` L ${points[0].x},${this._plotBottom} Z`;
                const area = this._svgEl('path', {
                    d: areaPath,
                    fill: ds.fillColor,
                    stroke: 'none'
                });
                this.svg.appendChild(area);
            }

            // Line
            if (points.length > 1) {
                const path = this._svgEl('path', {
                    d: this._buildLinePath(points),
                    fill: 'none',
                    stroke: ds.color,
                    'stroke-width': this.strokeWidth,
                    'stroke-linecap': 'round',
                    'stroke-linejoin': 'round'
                });
                this.svg.appendChild(path);
            }

            // Dots
            if (this.showDots) {
                points.forEach((p, i) => {
                    const dot = this._svgEl('circle', {
                        cx: p.x, cy: p.y, r: this.dotRadius,
                        fill: ds.color,
                        class: 'mini-series-dot',
                        'data-col': i
                    });
                    this.svg.appendChild(dot);
                });
            }
        });
    }

    _renderBars(min, max, count) {
        const numSeries = this._datasets.length;
        const slotW = this._plotW / count;
        const groupW = slotW - this.groupGap;
        const barW = Math.max(1, (groupW - (numSeries - 1) * this.barGap) / numSeries);
        const baseline = this._yToPixel(Math.max(0, min), min, max);

        this._datasets.forEach((ds, dsIdx) => {
            ds.data.forEach((v, i) => {
                const slotX = this._plotLeft + i * slotW + this.groupGap / 2;
                const x = slotX + dsIdx * (barW + this.barGap);
                const y = this._yToPixel(v, min, max);
                const h = Math.abs(baseline - y);

                const bar = this._svgEl('rect', {
                    x, y: Math.min(y, baseline),
                    width: barW, height: Math.max(h, 0.5),
                    fill: ds.color,
                    rx: 1,
                    class: 'mini-series-bar',
                    'data-col': i
                });
                this.svg.appendChild(bar);
            });
        });
    }

    _buildLinePath(points) {
        if (points.length === 0) return '';
        if (this.smoothing > 0 && points.length >= 2) {
            let d = `M ${points[0].x},${points[0].y}`;
            for (let i = 0; i < points.length - 1; i++) {
                const cur = points[i], nxt = points[i + 1];
                const cp1x = cur.x + (nxt.x - cur.x) * this.smoothing;
                const cp2x = nxt.x - (nxt.x - cur.x) * this.smoothing;
                d += ` C ${cp1x},${cur.y} ${cp2x},${nxt.y} ${nxt.x},${nxt.y}`;
            }
            return d;
        }
        return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');
    }

    // ── tooltip hit areas ─────────────────────────────────────────────

    _attachHoverListeners() {
        if (!this.showTooltip || !this.svg) return;

        this.svg.querySelectorAll('.mini-series-bar, .mini-series-dot').forEach(el => {
            const col = parseInt(el.getAttribute('data-col'), 10);
            if (isNaN(col)) return;
            el.addEventListener('mouseenter', (e) => this._showTooltip(col, e));
            el.addEventListener('mousemove', (e) => this._moveTooltip(e));
            el.addEventListener('mouseleave', () => this._hideTooltip());
        });
    }

    _showTooltip(index, event) {
        if (!this.tooltipEl) return;

        const label = this._labels[index] || `#${index + 1}`;
        let html = `<div class="mini-series-tooltip-label">${this._esc(String(label))}</div>`;

        this._datasets.forEach(ds => {
            const v = ds.data[index];
            let displayValue = v;
            if (this.valueFormatter) {
                displayValue = this.dataFormatter.pipe(v, this.valueFormatter);
            } else if (typeof v === 'number') {
                displayValue = v.toLocaleString();
            }
            html += `<div class="mini-series-tooltip-row">
                <span class="mini-series-tooltip-swatch" style="background:${ds.color}"></span>
                <span>${this._esc(ds.label)}:</span>
                <strong>${displayValue}</strong>
            </div>`;
        });

        this.tooltipEl.innerHTML = html;
        this.tooltipEl.style.display = 'block';
        this._moveTooltip(event);
    }

    _moveTooltip(event) {
        if (!this.tooltipEl || this.tooltipEl.style.display === 'none') return;
        const area = this.element.querySelector('.mini-series-svg-area');
        if (!area) return;
        const areaRect = area.getBoundingClientRect();
        const x = event.clientX - areaRect.left;
        const y = event.clientY - areaRect.top;

        // Render once to measure, then clamp within container
        this.tooltipEl.style.left = '0px';
        this.tooltipEl.style.top = '0px';
        this.tooltipEl.style.transform = 'none';
        const tw = this.tooltipEl.offsetWidth;
        const th = this.tooltipEl.offsetHeight;
        const aw = areaRect.width;
        const ah = areaRect.height;

        let left = x - tw / 2;
        let top = y - th - 8;
        // Clamp horizontally
        if (left < 0) left = 0;
        if (left + tw > aw) left = aw - tw;
        // Flip below cursor if too close to top
        if (top < 0) top = y + 12;
        // Clamp bottom
        if (top + th > ah) top = ah - th;

        this.tooltipEl.style.left = `${left}px`;
        this.tooltipEl.style.top = `${top}px`;
    }

    _hideTooltip() {
        if (this.tooltipEl) this.tooltipEl.style.display = 'none';
    }

    // ── legend ────────────────────────────────────────────────────────

    _renderLegend() {
        if (!this.showLegend || !this.legendEl) return;
        this.legendEl.innerHTML = '';

        this._datasets.forEach(ds => {
            const item = document.createElement('span');
            item.className = 'mini-series-legend-item';
            item.innerHTML = `
                <span class="mini-series-legend-swatch" style="background:${ds.color};"></span>
                <span class="mini-series-legend-label">${this._esc(ds.label)}</span>
            `;
            this.legendEl.appendChild(item);
        });
    }

    // ── helpers ───────────────────────────────────────────────────────

    _formatAxisValue(value) {
        if (this.valueFormatter) {
            return this.dataFormatter.pipe(value, this.valueFormatter);
        }
        if (Math.abs(value) >= 1000000) return (value / 1000000).toFixed(1) + 'M';
        if (Math.abs(value) >= 1000) return (value / 1000).toFixed(1) + 'K';
        if (Number.isInteger(value)) return String(value);
        return value.toFixed(1);
    }

    _svgEl(tag, attrs = {}) {
        const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
        for (const [k, v] of Object.entries(attrs)) {
            el.setAttribute(k, String(v));
        }
        return el;
    }

    _esc(text) {
        const d = document.createElement('div');
        d.textContent = text;
        return d.innerHTML;
    }

    async onBeforeDestroy() {
        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
            this._resizeObserver = null;
        }
        await super.onBeforeDestroy();
    }
}
