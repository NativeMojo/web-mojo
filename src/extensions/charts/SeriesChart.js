/**
 * SeriesChart — native SVG multi-dataset line/bar/area chart.
 *
 * Replaces the prior Chart.js-backed SeriesChart and the interim
 * MiniSeriesChart. No runtime Chart.js dependency.
 *
 * Highlights:
 *   - Multiple datasets on a shared X axis (line, bar, area).
 *   - Bar charts default to STACKED — pass `stacked: false` (or `grouped: true`)
 *     to opt out. `stacked: 'auto'` (default) → bar stacks, line/area don't.
 *   - Built-in palette + golden-angle HSL fallback. Per-series `color`
 *     and per-chart `colors` / `colorGenerator` always win.
 *   - Click-to-toggle legend, hover-isolated highlighting, animated `setData`.
 *   - Accepts three data shapes:
 *       1. { labels, datasets: [{ label, data, color?, fill?, smoothing? }] }
 *       2. { labels, series:   [{ name,  data, color?, fill?, smoothing? }] }
 *       3. [v0, v1, v2, ...]  (single-series shorthand)
 */

import View from '@core/View.js';
import dataFormatter from '@core/utils/DataFormatter.js';

const SERIES_COLORS = [
    '#36A2EB', '#FF6384', '#FFCE56', '#4BC0C0', '#9966FF',
    '#FF9F40', '#66BB6A', '#EF5350', '#AB47BC', '#26C6DA'
];

// Golden angle in degrees, gives visually distinct hues for any N.
const GOLDEN_ANGLE = 137.508;

const defaultColorGenerator = (i) =>
    `hsl(${((i * GOLDEN_ANGLE) % 360).toFixed(0)}, 65%, 52%)`;

class SeriesChart extends View {
    constructor(options = {}) {
        super({
            className: 'mini-series-chart',
            ...options
        });

        // Chart type
        this.chartType = options.chartType || 'line';

        // Stacking — 'auto' resolves to true for bar, false otherwise.
        // grouped:true is documented alias for stacked:false on bar charts.
        if (options.grouped === true) {
            this.stacked = false;
        } else if (options.stacked === undefined) {
            this.stacked = 'auto';
        } else {
            this.stacked = options.stacked;
        }

        // Dimensions
        this.width = options.width || '100%';
        this.height = options.height || 200;

        this.padTop = 10;
        this.padRight = 12;
        this.padBottom = 24;
        this.padLeft = 40;

        // Line / area
        this.strokeWidth = options.strokeWidth || 2;
        this.smoothing = options.smoothing ?? 0.3;
        this.showDots = options.showDots !== false;
        this.dotRadius = options.dotRadius || 3;
        this.fill = options.fill ?? (this.chartType === 'area');

        // Bar
        this.barGap = options.barGap ?? 2;
        this.groupGap = options.groupGap ?? 6;

        // Grid
        this.showGrid = options.showGrid !== false;
        this.gridLines = options.gridLines || 5;

        // Legend
        this.showLegend = options.showLegend !== false;
        this.legendPosition = options.legendPosition || 'top';

        // Tooltip
        this.showTooltip = options.showTooltip !== false;

        // Colors
        this.colors = Array.isArray(options.colors) && options.colors.length
            ? [...options.colors]
            : [...SERIES_COLORS];
        this.colorGenerator = options.colorGenerator || defaultColorGenerator;

        // Formatting
        this.valueFormatter = options.valueFormatter || null;
        this.xLabelFormat = options.xLabelFormat || null;
        this.xLabelFormatter = options.xLabelFormatter || null;
        this.dataFormatter = dataFormatter;

        // Animation
        this.animate = options.animate !== false;
        this.animationDuration = options.animationDuration || 300;

        // Data
        this._rawData = options.data || null;
        this._labels = [];
        this._datasets = [];
        this._hidden = new Set(); // indices of hidden datasets

        // Render bookkeeping
        this._tweenId = 0;
        this._currentGeometry = null; // last rendered geometry, used as tween source
    }

    // ── template ──────────────────────────────────────────────────────

    getTemplate() {
        const widthStyle = typeof this.width === 'number' ? `${this.width}px` : this.width;
        const heightStyle = typeof this.height === 'number' ? `${this.height}px` : this.height;

        return `
            <div class="mini-series-wrapper mini-series-legend-${this.legendPosition}">
                ${this.showLegend ? '<div class="mini-series-legend"></div>' : ''}
                <div class="mini-series-svg-area" style="width:${widthStyle}; height:${heightStyle};">
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
            this._renderChart({ animate: false });
            this._renderLegend();
        }
    }

    async onBeforeDestroy() {
        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
            this._resizeObserver = null;
        }
        this._tweenId++;
        await super.onBeforeDestroy();
    }

    // ── public API ────────────────────────────────────────────────────

    setData(data, options = {}) {
        this._rawData = data;
        this._parseData(data);
        if (this.svg) {
            const animate = options.animate ?? this.animate;
            this._renderChart({ animate });
            this._renderLegend();
        }
    }

    setChartType(newType) {
        if (newType === this.chartType) return;
        this.chartType = newType;
        if (this.fill === undefined) this.fill = (newType === 'area');
        if (this.svg) {
            this._renderChart({ animate: false });
            this._renderLegend();
        }
    }

    toggleSeries(index) {
        if (this._hidden.has(index)) this._hidden.delete(index);
        else this._hidden.add(index);
        if (this.svg) {
            this._renderChart({ animate: this.animate });
            this._renderLegend();
        }
        this.emit?.('chart:series-toggled', {
            chart: this, index, hidden: this._hidden.has(index)
        });
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
            if (this._datasets.length > 0) this._renderChart({ animate: false });
        });
        if (this.svg) this._resizeObserver.observe(this.svg);
    }

    // ── data normalisation ────────────────────────────────────────────

    _parseData(data) {
        if (!data) { this._labels = []; this._datasets = []; return; }

        let labels = [];
        let datasets = [];

        if (Array.isArray(data)) {
            // [v0, v1, ...] single-series shorthand
            labels = data.map((_, i) => String(i + 1));
            datasets = [{ label: 'Series 1', data: [...data] }];
        } else if (data.labels && data.datasets) {
            labels = data.labels;
            datasets = data.datasets.map((ds, i) => ({
                label: ds.label || `Series ${i + 1}`,
                data: ds.data || [],
                color: ds.color || ds.borderColor,
                fill: ds.fill,
                smoothing: ds.smoothing,
                fillColor: ds.backgroundColor || ds.fillColor
            }));
        } else if (data.labels && data.series) {
            labels = data.labels;
            datasets = data.series.map((s, i) => ({
                label: s.name || s.label || `Series ${i + 1}`,
                data: s.data || [],
                color: s.color || s.borderColor,
                fill: s.fill,
                smoothing: s.smoothing,
                fillColor: s.backgroundColor || s.fillColor
            }));
        }

        // Resolve color and fill once, here.
        this._labels = labels;
        this._datasets = datasets.map((ds, i) => {
            const color = ds.color || this.colors[i] || this.colorGenerator(i);
            const fill = ds.fill ?? (this.chartType === 'area' ? true : (this.chartType === 'bar' ? true : this.fill));
            const fillColor = ds.fillColor || this._toRgba(color, this.chartType === 'bar' ? 0.85 : 0.18);
            return {
                label: ds.label,
                data: ds.data,
                color,
                fillColor,
                fill,
                smoothing: ds.smoothing ?? this.smoothing
            };
        });

        // Trim hidden indices that no longer exist.
        if (this._hidden.size) {
            this._hidden = new Set([...this._hidden].filter(i => i < this._datasets.length));
        }
    }

    _isStacked() {
        if (this.stacked === 'auto') return this.chartType === 'bar';
        return !!this.stacked;
    }

    _visibleDatasets() {
        return this._datasets
            .map((ds, i) => ({ ds, i }))
            .filter(({ i }) => !this._hidden.has(i));
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
        const visible = this._visibleDatasets();

        if (this._isStacked() && this.chartType === 'bar') {
            const count = this._labels.length || (visible[0]?.ds.data.length || 0);
            for (let i = 0; i < count; i++) {
                let pos = 0, neg = 0;
                for (const { ds } of visible) {
                    const v = +ds.data[i] || 0;
                    if (v >= 0) pos += v; else neg += v;
                }
                if (pos > max) max = pos;
                if (neg < min) min = neg;
            }
            if (!isFinite(min)) min = 0;
            if (!isFinite(max)) max = 1;
        } else {
            for (const { ds } of visible) {
                for (const v of ds.data) {
                    if (v < min) min = v;
                    if (v > max) max = v;
                }
            }
        }

        if (!isFinite(min)) { min = 0; max = 1; }
        if (min === max) { min -= 1; max += 1; }
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

    _renderChart({ animate = false } = {}) {
        if (!this.svg) return;
        this._updateDimensions();

        // Cancel any in-flight tween.
        this._tweenId++;
        const tweenId = this._tweenId;

        if (this._datasets.length === 0) {
            this.svg.innerHTML = '';
            this._currentGeometry = null;
            return;
        }

        const { min, max } = this._calcBounds();
        const count = this._labels.length || (this._datasets[0]?.data.length || 0);

        const targetGeometry = this._buildGeometry(min, max, count);

        const previous = this._currentGeometry;
        const canTween = animate && previous
            && previous.chartType === targetGeometry.chartType
            && this.animationDuration > 0
            && typeof requestAnimationFrame !== 'undefined';

        if (!canTween) {
            this._paintFrame(targetGeometry);
            this._currentGeometry = targetGeometry;
            return;
        }

        // Tween from previous geometry → target geometry.
        const start = performance.now();
        const duration = this.animationDuration;
        const ease = (t) => 1 - Math.pow(1 - t, 3); // easeOutCubic

        const step = (now) => {
            if (this._tweenId !== tweenId) return; // cancelled
            const t = Math.min(1, (now - start) / duration);
            const k = ease(t);
            const interp = this._interpolateGeometry(previous, targetGeometry, k);
            this._paintFrame(interp);
            if (t < 1) requestAnimationFrame(step);
            else this._currentGeometry = targetGeometry;
        };
        requestAnimationFrame(step);
    }

    _buildGeometry(min, max, count) {
        const baseline = this._yToPixel(Math.max(min, Math.min(0, max)), min, max);
        const visible = this._visibleDatasets();

        const geom = {
            chartType: this.chartType,
            min, max, count, baseline,
            grid: [],
            yLabels: [],
            xLabels: [],
            lines: [],   // [{ color, fillColor, fill, points: [{x,y}], smoothing }]
            bars: []     // [{ color, fillColor, x, y, w, h, dsIdx, dataIdx, value, label }]
        };

        // Grid + Y-axis labels
        if (this.showGrid || true) {
            const steps = this.gridLines;
            for (let i = 0; i <= steps; i++) {
                const y = this._plotTop + (i / steps) * this._plotH;
                geom.grid.push({ x1: this._plotLeft, y1: y, x2: this._plotRight, y2: y });
                const value = max - (i / steps) * (max - min);
                geom.yLabels.push({ x: this._plotLeft - 4, y: y + 3, text: this._formatAxisValue(value) });
            }
        }

        // X-axis labels
        const maxXLabels = Math.max(2, Math.floor(this._plotW / 60));
        const stepX = Math.max(1, Math.ceil(count / maxXLabels));
        for (let i = 0; i < count; i += stepX) {
            const x = (this.chartType === 'bar')
                ? this._barSlotCenter(i, count)
                : this._xToPixel(i, count);
            const raw = this._labels[i] !== undefined ? this._labels[i] : '';
            const formatted = this._formatXLabel(raw);
            geom.xLabels.push({ x, y: this._plotBottom + 14, text: this._truncateLabel(formatted) });
        }

        if (this.chartType === 'bar') {
            this._buildBars(geom, visible, min, max, count);
        } else {
            this._buildLines(geom, visible, min, max, count);
        }

        return geom;
    }

    _barSlotCenter(i, count) {
        if (count <= 0) return this._plotLeft;
        const slotW = this._plotW / count;
        return this._plotLeft + i * slotW + slotW / 2;
    }

    _buildBars(geom, visible, min, max, count) {
        const stacked = this._isStacked();
        const slotW = this._plotW / Math.max(count, 1);
        const groupW = Math.max(2, slotW - this.groupGap);

        if (stacked) {
            const barW = groupW;
            for (let i = 0; i < count; i++) {
                let posCum = 0, negCum = 0;
                for (const { ds, i: dsIdx } of visible) {
                    const v = +ds.data[i] || 0;
                    if (v === 0) continue;
                    let yTop, yBottom;
                    if (v >= 0) {
                        yTop = this._yToPixel(posCum + v, min, max);
                        yBottom = this._yToPixel(posCum, min, max);
                        posCum += v;
                    } else {
                        yTop = this._yToPixel(negCum, min, max);
                        yBottom = this._yToPixel(negCum + v, min, max);
                        negCum += v;
                    }
                    const x = this._plotLeft + i * slotW + (slotW - barW) / 2;
                    geom.bars.push({
                        x, y: Math.min(yTop, yBottom),
                        w: barW,
                        h: Math.max(0.5, Math.abs(yBottom - yTop)),
                        color: ds.color, fillColor: ds.fillColor,
                        dsIdx, dataIdx: i, value: v, label: this._labels[i]
                    });
                }
            }
        } else {
            const numSeries = visible.length || 1;
            const barW = Math.max(1, (groupW - (numSeries - 1) * this.barGap) / numSeries);
            for (let s = 0; s < numSeries; s++) {
                const { ds, i: dsIdx } = visible[s];
                for (let i = 0; i < count; i++) {
                    const v = +ds.data[i] || 0;
                    const slotX = this._plotLeft + i * slotW + (slotW - groupW) / 2;
                    const x = slotX + s * (barW + this.barGap);
                    const y = this._yToPixel(v, min, max);
                    const h = Math.abs(geom.baseline - y);
                    geom.bars.push({
                        x, y: Math.min(y, geom.baseline),
                        w: barW, h: Math.max(h, 0.5),
                        color: ds.color, fillColor: ds.fillColor,
                        dsIdx, dataIdx: i, value: v, label: this._labels[i]
                    });
                }
            }
        }
    }

    _buildLines(geom, visible, min, max, count) {
        for (const { ds, i: dsIdx } of visible) {
            const points = ds.data.map((v, i) => ({
                x: this._xToPixel(i, count),
                y: this._yToPixel(+v || 0, min, max),
                value: +v || 0,
                index: i,
                label: this._labels[i]
            }));
            geom.lines.push({
                dsIdx,
                color: ds.color,
                fillColor: ds.fillColor,
                fill: ds.fill,
                smoothing: ds.smoothing ?? this.smoothing,
                points
            });
        }
    }

    _paintFrame(geom) {
        if (!this.svg) return;
        this.svg.innerHTML = '';

        // Grid
        if (this.showGrid) {
            for (const g of geom.grid) {
                this.svg.appendChild(this._svgEl('line', {
                    x1: g.x1, y1: g.y1, x2: g.x2, y2: g.y2,
                    stroke: 'var(--bs-border-color, #dee2e6)',
                    'stroke-width': 0.5,
                    'stroke-dasharray': '3,3'
                }));
            }
        }

        // Y-axis labels
        for (const l of geom.yLabels) {
            const t = this._svgEl('text', {
                x: l.x, y: l.y, 'text-anchor': 'end',
                'font-size': '10', fill: 'var(--bs-secondary-color, #6c757d)'
            });
            t.textContent = l.text;
            this.svg.appendChild(t);
        }

        // X-axis labels
        for (const l of geom.xLabels) {
            const t = this._svgEl('text', {
                x: l.x, y: l.y, 'text-anchor': 'middle',
                'font-size': '10', fill: 'var(--bs-secondary-color, #6c757d)'
            });
            t.textContent = l.text;
            this.svg.appendChild(t);
        }

        if (geom.chartType === 'bar') {
            this._paintBars(geom);
        } else {
            this._paintLines(geom);
        }

        this._attachHoverListeners();
    }

    _paintLines(geom) {
        for (const line of geom.lines) {
            // Area fill
            if (line.fill && line.points.length > 1) {
                const path = this._buildLinePath(line.points, line.smoothing)
                    + ` L ${line.points[line.points.length - 1].x},${this._plotBottom}`
                    + ` L ${line.points[0].x},${this._plotBottom} Z`;
                this.svg.appendChild(this._svgEl('path', {
                    d: path, fill: line.fillColor, stroke: 'none',
                    class: `mini-series-area mini-series-ds-${line.dsIdx}`
                }));
            }
            // Line
            if (line.points.length > 1) {
                this.svg.appendChild(this._svgEl('path', {
                    d: this._buildLinePath(line.points, line.smoothing),
                    fill: 'none',
                    stroke: line.color,
                    'stroke-width': this.strokeWidth,
                    'stroke-linecap': 'round',
                    'stroke-linejoin': 'round',
                    class: `mini-series-line mini-series-ds-${line.dsIdx}`
                }));
            }
            // Dots
            if (this.showDots) {
                for (const p of line.points) {
                    this.svg.appendChild(this._svgEl('circle', {
                        cx: p.x, cy: p.y, r: this.dotRadius,
                        fill: line.color,
                        class: `mini-series-dot mini-series-ds-${line.dsIdx}`,
                        'data-ds': line.dsIdx,
                        'data-col': p.index
                    }));
                }
            }
        }
    }

    _paintBars(geom) {
        for (const b of geom.bars) {
            this.svg.appendChild(this._svgEl('rect', {
                x: b.x, y: b.y, width: b.w, height: b.h,
                fill: b.fillColor || b.color,
                rx: 1,
                class: `mini-series-bar mini-series-ds-${b.dsIdx}`,
                'data-ds': b.dsIdx,
                'data-col': b.dataIdx
            }));
        }
    }

    _buildLinePath(points, smoothing) {
        if (!points || points.length === 0) return '';
        if (smoothing > 0 && points.length >= 2) {
            let d = `M ${points[0].x},${points[0].y}`;
            for (let i = 0; i < points.length - 1; i++) {
                const cur = points[i], nxt = points[i + 1];
                const cp1x = cur.x + (nxt.x - cur.x) * smoothing;
                const cp2x = nxt.x - (nxt.x - cur.x) * smoothing;
                d += ` C ${cp1x},${cur.y} ${cp2x},${nxt.y} ${nxt.x},${nxt.y}`;
            }
            return d;
        }
        return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');
    }

    // ── tween helpers ─────────────────────────────────────────────────

    _interpolateGeometry(a, b, k) {
        // Use shape of `b` (target) as the canonical structure; tween numeric
        // fields from the matching entry in `a` where one exists.
        const lerp = (x, y) => x + (y - x) * k;
        const out = {
            chartType: b.chartType,
            min: b.min, max: b.max, count: b.count, baseline: b.baseline,
            grid: b.grid,
            yLabels: b.yLabels,
            xLabels: b.xLabels,
            lines: [],
            bars: []
        };

        if (b.chartType === 'bar') {
            out.bars = b.bars.map((tb) => {
                const sb = a.bars.find(s => s.dsIdx === tb.dsIdx && s.dataIdx === tb.dataIdx);
                if (!sb) {
                    // Animate in from baseline.
                    return { ...tb, y: lerp(a.baseline, tb.y), h: lerp(0, tb.h) };
                }
                return {
                    ...tb,
                    x: lerp(sb.x, tb.x),
                    y: lerp(sb.y, tb.y),
                    w: lerp(sb.w, tb.w),
                    h: lerp(sb.h, tb.h)
                };
            });
        } else {
            out.lines = b.lines.map((tl) => {
                const sl = a.lines.find(s => s.dsIdx === tl.dsIdx);
                const points = tl.points.map((tp, i) => {
                    const sp = sl && sl.points[i];
                    if (!sp) return { ...tp, y: lerp(a.baseline, tp.y) };
                    return { ...tp, x: lerp(sp.x, tp.x), y: lerp(sp.y, tp.y) };
                });
                return { ...tl, points };
            });
        }
        return out;
    }

    // ── tooltip / hover ───────────────────────────────────────────────

    _attachHoverListeners() {
        if (!this.svg) return;

        const els = this.svg.querySelectorAll('.mini-series-bar, .mini-series-dot');
        els.forEach(el => {
            const col = parseInt(el.getAttribute('data-col'), 10);
            const dsIdx = parseInt(el.getAttribute('data-ds'), 10);
            if (isNaN(col) || isNaN(dsIdx)) return;

            el.addEventListener('mouseenter', (e) => {
                if (this.showTooltip) this._showTooltip(col, e);
                this._fadeOtherSeries(dsIdx);
            });
            el.addEventListener('mousemove', (e) => {
                if (this.showTooltip) this._moveTooltip(e);
            });
            el.addEventListener('mouseleave', () => {
                this._hideTooltip();
                this._clearFade();
            });
            el.addEventListener('click', () => {
                const value = this._datasets[dsIdx]?.data[col];
                this.emit?.('chart:click', {
                    chart: this,
                    datasetIndex: dsIdx,
                    index: col,
                    value,
                    label: this._labels[col]
                });
            });
        });
    }

    _fadeOtherSeries(activeDsIdx) {
        if (!this.svg) return;
        const all = this.svg.querySelectorAll('[class*="mini-series-ds-"]');
        all.forEach(el => {
            const m = el.getAttribute('class').match(/mini-series-ds-(\d+)/);
            if (!m) return;
            const idx = parseInt(m[1], 10);
            if (idx !== activeDsIdx) el.classList.add('mini-series-faded');
            else el.classList.remove('mini-series-faded');
        });
    }

    _clearFade() {
        if (!this.svg) return;
        this.svg.querySelectorAll('.mini-series-faded')
            .forEach(el => el.classList.remove('mini-series-faded'));
    }

    _showTooltip(index, event) {
        if (!this.tooltipEl) return;
        const label = this._labels[index] !== undefined ? this._labels[index] : `#${index + 1}`;
        let html = `<div class="mini-series-tooltip-label">${this._esc(String(this._formatXLabel(label)))}</div>`;

        for (let i = 0; i < this._datasets.length; i++) {
            if (this._hidden.has(i)) continue;
            const ds = this._datasets[i];
            const v = ds.data[index];
            html += `<div class="mini-series-tooltip-row">
                <span class="mini-series-tooltip-swatch" style="background:${ds.color}"></span>
                <span>${this._esc(ds.label)}:</span>
                <strong>${this._esc(this._formatValue(v))}</strong>
            </div>`;
        }

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

        this.tooltipEl.style.left = '0px';
        this.tooltipEl.style.top = '0px';
        this.tooltipEl.style.transform = 'none';
        const tw = this.tooltipEl.offsetWidth;
        const th = this.tooltipEl.offsetHeight;
        const aw = areaRect.width;
        const ah = areaRect.height;

        let left = x - tw / 2;
        let top = y - th - 8;
        if (left < 0) left = 0;
        if (left + tw > aw) left = aw - tw;
        if (top < 0) top = y + 12;
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

        this._datasets.forEach((ds, i) => {
            const item = document.createElement('span');
            item.className = 'mini-series-legend-item';
            if (this._hidden.has(i)) item.classList.add('mini-series-legend-hidden');
            item.setAttribute('role', 'button');
            item.setAttribute('data-ds', String(i));
            item.innerHTML = `
                <span class="mini-series-legend-swatch" style="background:${ds.color};"></span>
                <span class="mini-series-legend-label">${this._esc(ds.label)}</span>
            `;
            item.addEventListener('click', () => this.toggleSeries(i));
            this.legendEl.appendChild(item);
        });
    }

    // ── formatters ────────────────────────────────────────────────────

    _formatValue(value) {
        if (value === null || value === undefined) return '';
        if (this.valueFormatter) {
            if (typeof this.valueFormatter === 'function') return this.valueFormatter(value);
            return this.dataFormatter.pipe(value, this.valueFormatter);
        }
        if (typeof value === 'number') return value.toLocaleString();
        return String(value);
    }

    _formatXLabel(label) {
        if (label === null || label === undefined) return '';
        if (this.xLabelFormatter) return this.xLabelFormatter(label);
        if (this.xLabelFormat) return this.dataFormatter.pipe(label, this.xLabelFormat);
        return String(label);
    }

    _formatAxisValue(value) {
        if (this.valueFormatter) {
            if (typeof this.valueFormatter === 'function') return this.valueFormatter(value);
            return this.dataFormatter.pipe(value, this.valueFormatter);
        }
        if (Math.abs(value) >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M';
        if (Math.abs(value) >= 1_000) return (value / 1_000).toFixed(1) + 'K';
        if (Number.isInteger(value)) return String(value);
        return value.toFixed(1);
    }

    _truncateLabel(text) {
        const s = String(text);
        return s.length > 10 ? s.substring(0, 9) + '…' : s;
    }

    // ── color helpers ─────────────────────────────────────────────────

    _toRgba(color, alpha) {
        if (!color) return color;
        const s = String(color).trim();

        if (s.startsWith('#')) {
            let hex = s.slice(1);
            if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
            if (hex.length === 6) {
                const r = parseInt(hex.slice(0, 2), 16);
                const g = parseInt(hex.slice(2, 4), 16);
                const b = parseInt(hex.slice(4, 6), 16);
                return `rgba(${r},${g},${b},${alpha})`;
            }
            return s;
        }

        let m = s.match(/^rgba?\(([^)]+)\)$/i);
        if (m) {
            const parts = m[1].split(',').map(p => p.trim());
            return `rgba(${parts[0]},${parts[1]},${parts[2]},${alpha})`;
        }

        m = s.match(/^hsla?\(([^)]+)\)$/i);
        if (m) {
            const parts = m[1].split(',').map(p => p.trim());
            return `hsla(${parts[0]},${parts[1]},${parts[2]},${alpha})`;
        }

        // Named or unknown — return as-is. Fill won't get alpha; documented.
        return s;
    }

    // ── DOM helpers ───────────────────────────────────────────────────

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
}

export default SeriesChart;
