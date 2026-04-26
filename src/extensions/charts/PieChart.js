/**
 * PieChart — native SVG pie / doughnut.
 *
 * Replaces the prior Chart.js-backed PieChart and the interim MiniPieChart.
 * No runtime Chart.js dependency.
 *
 * Accepts three data shapes:
 *   1. [{ label, value, color? }]
 *   2. { labels: [...], datasets: [{ data: [...] }] }     (Chart.js shape)
 *   3. { A: 10, B: 20 }                                    (object map)
 *
 * Optional `endpoint:` triggers a REST GET in onInit() and feeds the response
 * into setData — keeps simple admin call sites (no manual fetch) working.
 */

import View from '@core/View.js';
import dataFormatter from '@core/utils/DataFormatter.js';

const DEFAULT_COLORS = [
    '#36A2EB', '#FF6384', '#FFCE56', '#4BC0C0', '#9966FF',
    '#FF9F40', '#66BB6A', '#EF5350', '#AB47BC', '#26C6DA'
];

const GOLDEN_ANGLE = 137.508;
const defaultColorGenerator = (i) =>
    `hsl(${((i * GOLDEN_ANGLE) % 360).toFixed(0)}, 65%, 52%)`;

class PieChart extends View {
    constructor(options = {}) {
        super({
            className: 'mini-pie-chart',
            ...options
        });

        this.width = options.width || 200;
        this.height = options.height || 200;

        // 0 = solid pie; 0..1 fraction of outer radius for inner hole.
        this.cutout = options.cutout || 0;

        this.colors = Array.isArray(options.colors) && options.colors.length
            ? [...options.colors]
            : [...DEFAULT_COLORS];
        this.colorGenerator = options.colorGenerator || defaultColorGenerator;

        // Legend
        this.showLegend = options.showLegend !== false;
        this.legendPosition = options.legendPosition || 'right'; // 'right' | 'bottom' | 'none'
        if (this.legendPosition === 'none') this.showLegend = false;

        // Slice labels
        this.showLabels = options.showLabels === true;
        this.showPercentages = options.showPercentages !== false;

        // Tooltip
        this.showTooltip = options.showTooltip !== false;

        // Animation
        this.animate = options.animate !== false;
        this.animationDuration = options.animationDuration || 300;

        // Formatting
        this.valueFormatter = options.valueFormatter || null;
        this.dataFormatter = dataFormatter;

        // REST integration
        this.endpoint = options.endpoint || null;

        // Data
        this._rawData = options.data || null;
        this._segments = [];
        this._currentSegments = null; // last painted, for tween source
        this._tweenId = 0;
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

    async onInit() {
        if (this.endpoint) {
            try {
                const rest = this.getApp()?.rest;
                if (rest) {
                    const resp = await rest.GET(this.endpoint);
                    if (resp?.success) {
                        this._rawData = resp.data?.data ?? resp.data ?? this._rawData;
                    }
                }
            } catch (err) {
                console.error('PieChart endpoint fetch failed:', err);
            }
        }
    }

    async onAfterRender() {
        this.svg = this.element.querySelector('.mini-pie-svg');
        this.tooltipEl = this.element.querySelector('.mini-pie-tooltip');
        this.legendEl = this.element.querySelector('.mini-pie-legend');

        if (this._rawData) {
            this._parseData(this._rawData);
            this._renderPie({ animate: false });
            this._renderLegend();
        }
    }

    async onBeforeDestroy() {
        this._tweenId++;
        await super.onBeforeDestroy();
    }

    // ── public API ────────────────────────────────────────────────────

    setData(data, options = {}) {
        this._rawData = data;
        this._parseData(data);
        if (this.svg) {
            const animate = options.animate ?? this.animate;
            this._renderPie({ animate });
            this._renderLegend();
        }
    }

    async refresh() {
        if (!this.endpoint) return;
        const rest = this.getApp()?.rest;
        if (!rest) return;
        try {
            const resp = await rest.GET(this.endpoint);
            if (resp?.success) {
                const next = resp.data?.data ?? resp.data;
                if (next) this.setData(next);
            }
        } catch (err) {
            console.error('PieChart refresh failed:', err);
        }
    }

    // ── data normalisation ────────────────────────────────────────────

    _parseData(data) {
        let labels = [];
        let values = [];
        let perItemColors = [];

        if (Array.isArray(data)) {
            for (const d of data) {
                labels.push(d.label);
                values.push(+d.value || 0);
                perItemColors.push(d.color || null);
            }
        } else if (data && data.labels && data.datasets) {
            labels = data.labels;
            values = (data.datasets[0]?.data || []).map(v => +v || 0);
            const bg = data.datasets[0]?.backgroundColor;
            if (Array.isArray(bg)) perItemColors = bg;
        } else if (data && typeof data === 'object') {
            labels = Object.keys(data);
            values = Object.values(data).map(v => +v || 0);
        }

        const total = values.reduce((s, v) => s + v, 0);
        this._segments = labels.map((label, i) => ({
            label,
            value: values[i] || 0,
            pct: total > 0 ? ((values[i] || 0) / total * 100) : 0,
            color: perItemColors[i] || this.colors[i] || this.colorGenerator(i)
        }));
    }

    // ── render ────────────────────────────────────────────────────────

    _renderPie({ animate = false } = {}) {
        if (!this.svg) return;
        this._tweenId++;
        const tweenId = this._tweenId;

        const target = this._buildSegmentGeometry(this._segments);
        const previous = this._currentSegments;

        const canTween = animate && previous && this.animationDuration > 0
            && typeof requestAnimationFrame !== 'undefined';

        if (!canTween) {
            this._paintPie(target);
            this._currentSegments = target;
            return;
        }

        // Build a label-keyed source matched against target so animations
        // come/go from a 0-arc instead of scrambling positions.
        const start = performance.now();
        const duration = this.animationDuration;
        const ease = (t) => 1 - Math.pow(1 - t, 3);

        const step = (now) => {
            if (this._tweenId !== tweenId) return;
            const t = Math.min(1, (now - start) / duration);
            const k = ease(t);
            const interp = this._interpolateSegments(previous, target, k);
            this._paintPie(interp);
            if (t < 1) requestAnimationFrame(step);
            else this._currentSegments = target;
        };
        requestAnimationFrame(step);
    }

    _buildSegmentGeometry(segments) {
        const result = [];
        let angle = -Math.PI / 2; // start at 12 o'clock
        for (const seg of segments) {
            const slice = (seg.pct / 100) * Math.PI * 2;
            result.push({
                ...seg,
                startAngle: angle,
                endAngle: angle + slice
            });
            angle += slice;
        }
        return result;
    }

    _interpolateSegments(prev, target, k) {
        const lerp = (a, b) => a + (b - a) * k;
        const prevByLabel = new Map();
        for (const p of prev) prevByLabel.set(p.label, p);

        return target.map(t => {
            const p = prevByLabel.get(t.label);
            if (!p) {
                // New slice — animate from 0-arc at its target start.
                return {
                    ...t,
                    startAngle: t.startAngle,
                    endAngle: lerp(t.startAngle, t.endAngle)
                };
            }
            return {
                ...t,
                startAngle: lerp(p.startAngle, t.startAngle),
                endAngle: lerp(p.endAngle, t.endAngle)
            };
        });
    }

    _paintPie(segments) {
        if (!this.svg) return;
        this.svg.innerHTML = '';

        if (!segments || segments.length === 0) return;

        const cx = this.width / 2;
        const cy = this.height / 2;
        const outerR = Math.min(cx, cy) - 4;
        const innerR = this.cutout > 0 ? outerR * this.cutout : 0;

        // Single-segment edge case (full circle)
        const visible = segments.filter(s => Math.abs(s.endAngle - s.startAngle) > 1e-6);
        if (visible.length === 1 && Math.abs(Math.abs(visible[0].endAngle - visible[0].startAngle) - Math.PI * 2) < 1e-3) {
            const seg = visible[0];
            if (innerR > 0) {
                this.svg.appendChild(this._svgEl('circle', {
                    cx, cy, r: (outerR + innerR) / 2,
                    fill: 'none', stroke: seg.color, 'stroke-width': outerR - innerR
                }));
            } else {
                this.svg.appendChild(this._svgEl('circle', {
                    cx, cy, r: outerR, fill: seg.color
                }));
            }
            this._setupHover();
            return;
        }

        for (let i = 0; i < segments.length; i++) {
            const seg = segments[i];
            const sliceAngle = seg.endAngle - seg.startAngle;
            if (sliceAngle <= 0) continue;

            const startAngle = seg.startAngle;
            const endAngle = seg.endAngle;
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

            this.svg.appendChild(this._svgEl('path', {
                d,
                fill: seg.color,
                stroke: 'var(--bs-body-bg, #fff)',
                'stroke-width': 1.5,
                'data-index': i,
                class: 'mini-pie-segment'
            }));

            // Optional slice-edge label
            if (this.showLabels && sliceAngle > 0.05) {
                const mid = (startAngle + endAngle) / 2;
                const labelR = outerR + 12;
                const lx = cx + labelR * Math.cos(mid);
                const ly = cy + labelR * Math.sin(mid);
                const t = this._svgEl('text', {
                    x: lx, y: ly,
                    'text-anchor': lx < cx ? 'end' : 'start',
                    'font-size': '10',
                    fill: 'var(--bs-body-color, #212529)'
                });
                t.textContent = this.showPercentages
                    ? `${seg.label} (${seg.pct.toFixed(1)}%)`
                    : seg.label;
                this.svg.appendChild(t);
            }
        }

        this._setupHover();
    }

    // ── tooltip / hover / click ───────────────────────────────────────

    _setupHover() {
        if (!this.svg) return;
        const paths = this.svg.querySelectorAll('.mini-pie-segment, circle');
        paths.forEach((el, idx) => {
            const sliceIdx = el.hasAttribute('data-index')
                ? parseInt(el.getAttribute('data-index'), 10)
                : idx;

            el.addEventListener('mouseenter', (e) => {
                if (this.showTooltip) this._showTooltip(sliceIdx, e);
            });
            el.addEventListener('mousemove', (e) => {
                if (this.showTooltip) this._moveTooltip(e);
            });
            el.addEventListener('mouseleave', () => this._hideTooltip());
            el.addEventListener('click', () => {
                const seg = this._segments[sliceIdx];
                if (!seg) return;
                this.emit?.('chart:click', {
                    chart: this,
                    slice: seg,
                    index: sliceIdx,
                    value: seg.value,
                    label: seg.label
                });
            });
        });
    }

    _showTooltip(index, event) {
        const seg = this._segments[index];
        if (!seg || !this.tooltipEl) return;

        let displayValue = seg.value;
        if (this.valueFormatter) {
            if (typeof this.valueFormatter === 'function') {
                displayValue = this.valueFormatter(seg.value);
            } else {
                displayValue = this.dataFormatter.pipe(seg.value, this.valueFormatter);
            }
        } else if (typeof seg.value === 'number') {
            displayValue = seg.value.toLocaleString();
        }

        this.tooltipEl.innerHTML = `
            <strong>${this._esc(seg.label)}</strong><br>
            ${this._esc(displayValue)} (${seg.pct.toFixed(1)}%)
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

        for (const seg of this._segments) {
            const item = document.createElement('div');
            item.className = 'mini-pie-legend-item';

            // Set the swatch background as a DOM property — the color value
            // can come from the API, so we never interpolate it into a `style`
            // attribute string.
            const swatch = document.createElement('span');
            swatch.className = 'mini-pie-legend-swatch';
            swatch.style.background = seg.color;
            item.appendChild(swatch);

            const labelEl = document.createElement('span');
            labelEl.className = 'mini-pie-legend-label';
            labelEl.textContent = seg.label;
            item.appendChild(labelEl);

            const valueEl = document.createElement('span');
            valueEl.className = 'mini-pie-legend-value';
            valueEl.textContent = `${seg.pct.toFixed(1)}%`;
            item.appendChild(valueEl);

            this.legendEl.appendChild(item);
        }
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

export default PieChart;
