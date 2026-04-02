/**
 * MiniPieChart - Lightweight SVG pie chart component
 * Renders pie/doughnut charts with legend, no Chart.js dependency.
 * Uses SVG for crisp rendering at any size — perfect for inline/embedded use.
 */

import View from '@core/View.js';
import dataFormatter from '@core/utils/DataFormatter.js';

const DEFAULT_COLORS = [
    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
    '#FF9F40', '#C9CBCF', '#66BB6A', '#EF5350', '#AB47BC'
];

export default class MiniPieChart extends View {
    constructor(options = {}) {
        super({
            className: 'mini-pie-chart',
            ...options
        });

        // Dimensions
        this.width = options.width || 200;
        this.height = options.height || 200;

        // Doughnut: 0 = solid pie, 0–1 = fraction of radius for hole
        this.cutout = options.cutout || 0;

        // Colors
        this.colors = options.colors || DEFAULT_COLORS;

        // Legend
        this.showLegend = options.showLegend !== false;
        this.legendPosition = options.legendPosition || 'right'; // 'right', 'bottom'

        // Data — accepts Chart.js format { labels, datasets } or simple [{label,value}]
        this._rawData = options.data || null;

        // Tooltip
        this.showTooltip = options.showTooltip !== false;

        // Value formatting
        this.valueFormatter = options.valueFormatter || null;
        this.dataFormatter = dataFormatter;

        // Internals
        this._segments = [];
    }

    // ── template ──────────────────────────────────────────────────────

    getTemplate() {
        const layoutClass = this.legendPosition === 'bottom'
            ? 'mini-pie-layout-bottom'
            : 'mini-pie-layout-right';

        return `
            <div class="mini-pie-wrapper ${layoutClass}">
                <div class="mini-pie-svg-area" style="width:${this.width}px; height:${this.height}px;">
                    <svg class="mini-pie-svg" viewBox="0 0 ${this.width} ${this.height}"
                         width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
                    </svg>
                    ${this.showTooltip ? '<div class="mini-pie-tooltip" style="display:none;"></div>' : ''}
                </div>
                ${this.showLegend ? '<div class="mini-pie-legend"></div>' : ''}
            </div>
        `;
    }

    // ── lifecycle ─────────────────────────────────────────────────────

    async onAfterRender() {
        this.svg = this.element.querySelector('.mini-pie-svg');
        this.tooltipEl = this.element.querySelector('.mini-pie-tooltip');
        this.legendEl = this.element.querySelector('.mini-pie-legend');

        if (this._rawData) {
            this._parseData(this._rawData);
            this._renderPie();
            this._renderLegend();
        }
    }

    // ── public API ────────────────────────────────────────────────────

    setData(data) {
        this._rawData = data;
        this._parseData(data);
        if (this.svg) {
            this._renderPie();
            this._renderLegend();
        }
    }

    // ── data normalisation ────────────────────────────────────────────

    _parseData(data) {
        let labels = [];
        let values = [];

        if (Array.isArray(data)) {
            // [{label, value}, ...]
            labels = data.map(d => d.label);
            values = data.map(d => d.value);
        } else if (data && data.labels && data.datasets) {
            // Chart.js style { labels, datasets: [{ data }] }
            labels = data.labels;
            values = data.datasets[0]?.data || [];
        } else if (data && typeof data === 'object') {
            // { A: 10, B: 20 }
            labels = Object.keys(data);
            values = Object.values(data);
        }

        const total = values.reduce((s, v) => s + (v || 0), 0);
        this._segments = labels.map((label, i) => ({
            label,
            value: values[i] || 0,
            pct: total > 0 ? ((values[i] || 0) / total * 100) : 0,
            color: this.colors[i % this.colors.length]
        }));
    }

    // ── SVG rendering ─────────────────────────────────────────────────

    _renderPie() {
        if (!this.svg) return;
        this.svg.innerHTML = '';

        const cx = this.width / 2;
        const cy = this.height / 2;
        const outerR = Math.min(cx, cy) - 4; // 4px breathing room
        const innerR = this.cutout > 0 ? outerR * this.cutout : 0;

        if (this._segments.length === 0) return;

        // Single-segment edge case
        if (this._segments.length === 1) {
            const seg = this._segments[0];
            if (innerR > 0) {
                // Doughnut ring
                const ring = this._svgEl('circle', {
                    cx, cy, r: (outerR + innerR) / 2,
                    fill: 'none',
                    stroke: seg.color,
                    'stroke-width': outerR - innerR
                });
                this.svg.appendChild(ring);
            } else {
                const circle = this._svgEl('circle', {
                    cx, cy, r: outerR, fill: seg.color
                });
                this.svg.appendChild(circle);
            }
            this._setupHover();
            return;
        }

        let angle = -Math.PI / 2; // start at 12 o'clock

        this._segments.forEach((seg, i) => {
            const sliceAngle = (seg.pct / 100) * Math.PI * 2;
            if (sliceAngle <= 0) return;

            const startAngle = angle;
            const endAngle = angle + sliceAngle;
            const largeArc = sliceAngle > Math.PI ? 1 : 0;

            const x1Outer = cx + outerR * Math.cos(startAngle);
            const y1Outer = cy + outerR * Math.sin(startAngle);
            const x2Outer = cx + outerR * Math.cos(endAngle);
            const y2Outer = cy + outerR * Math.sin(endAngle);

            let d;
            if (innerR > 0) {
                const x1Inner = cx + innerR * Math.cos(endAngle);
                const y1Inner = cy + innerR * Math.sin(endAngle);
                const x2Inner = cx + innerR * Math.cos(startAngle);
                const y2Inner = cy + innerR * Math.sin(startAngle);

                d = [
                    `M ${x1Outer} ${y1Outer}`,
                    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2Outer} ${y2Outer}`,
                    `L ${x1Inner} ${y1Inner}`,
                    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${x2Inner} ${y2Inner}`,
                    'Z'
                ].join(' ');
            } else {
                d = [
                    `M ${cx} ${cy}`,
                    `L ${x1Outer} ${y1Outer}`,
                    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2Outer} ${y2Outer}`,
                    'Z'
                ].join(' ');
            }

            const path = this._svgEl('path', {
                d,
                fill: seg.color,
                stroke: 'var(--bs-body-bg, #fff)',
                'stroke-width': 1.5,
                'data-index': i,
                class: 'mini-pie-segment'
            });

            this.svg.appendChild(path);
            angle = endAngle;
        });

        this._setupHover();
    }

    _setupHover() {
        if (!this.showTooltip || !this.svg || !this.tooltipEl) return;

        const paths = this.svg.querySelectorAll('path, circle');
        paths.forEach((el, idx) => {
            el.addEventListener('mouseenter', (e) => this._showTooltip(idx, e));
            el.addEventListener('mousemove', (e) => this._moveTooltip(e));
            el.addEventListener('mouseleave', () => this._hideTooltip());
        });
    }

    _showTooltip(index, event) {
        const seg = this._segments[index] || this._segments[0];
        if (!seg || !this.tooltipEl) return;

        let displayValue = seg.value;
        if (this.valueFormatter) {
            displayValue = this.dataFormatter.pipe(seg.value, this.valueFormatter);
        } else {
            displayValue = typeof seg.value === 'number' ? seg.value.toLocaleString() : seg.value;
        }

        this.tooltipEl.innerHTML = `
            <strong>${this._esc(seg.label)}</strong><br>
            ${displayValue} (${seg.pct.toFixed(1)}%)
        `;
        this.tooltipEl.style.display = 'block';
        this._moveTooltip(event);
    }

    _moveTooltip(event) {
        if (!this.tooltipEl || this.tooltipEl.style.display === 'none') return;
        const area = this.element.querySelector('.mini-pie-svg-area');
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

        this._segments.forEach(seg => {
            const item = document.createElement('div');
            item.className = 'mini-pie-legend-item';
            item.innerHTML = `
                <span class="mini-pie-legend-swatch" style="background:${seg.color};"></span>
                <span class="mini-pie-legend-label">${this._esc(seg.label)}</span>
                <span class="mini-pie-legend-value">${seg.pct.toFixed(1)}%</span>
            `;
            this.legendEl.appendChild(item);
        });
    }

    // ── helpers ───────────────────────────────────────────────────────

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
