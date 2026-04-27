/**
 * KPITile — compact dashboard tile: small label, big tabular-numerals value,
 * color-coded delta badge, embedded MiniChart sparkline.
 *
 * Difference from MetricsMiniChartWidget: KPITile is presentation-only
 * (no fetch, no settings menu, no icon, no colored background). It renders
 * pre-fetched data passed in via constructor or `setData()`. This makes it
 * ideal for compact "pulse" rows where one parent fetches once and feeds
 * many tiles — see KPIStrip.
 *
 * For richer single-tile widgets with their own fetch + settings menu,
 * use MetricsMiniChartWidget.
 *
 * Click emits `tile:click` with `{ tile, slug }`.
 *
 * Delta rendering:
 *   - `deltaPct` present and finite → "+12%" / "−8%"
 *   - `deltaPct` absent (e.g. prev was 0) and `delta` present → "+4" absolute
 *   - both null → no badge.
 *   Never renders Infinity%.
 *
 * `severity` (optional): 'critical' | 'high' | 'warn' | 'info' | 'good'.
 *   Adds a left-stripe accent. Use for tiles that ARE the alert.
 *
 * `tone` (optional): 'good' | 'bad' | null. Decides whether a rising
 *   delta colors green or red. For blocks/incidents/failures, rising
 *   is bad (`tone: 'bad'`). For resolved counts, rising is good
 *   (`tone: 'good'`). Default null = neutral grey.
 */

import View from '@core/View.js';
import MiniChart from './MiniChart.js';

class KPITile extends View {
    constructor(options = {}) {
        super({
            tagName: 'button',
            ...options,
            className: `mojo-kpi-tile ${options.severity ? 'mojo-kpi-tile-' + options.severity : ''} ${options.className || ''}`.trim()
        });

        this.slug = options.slug || null;
        this.label = options.label || '';
        this.value = options.value ?? null;
        this.delta = options.delta ?? null;
        this.deltaPct = options.deltaPct ?? null;
        this.severity = options.severity || null;
        this.tone = options.tone || null;
        this.sparklineValues = Array.isArray(options.sparkline) ? options.sparkline.slice() : [];
        this.sparklineColor = options.sparklineColor || null;
        this.sparklineHeight = options.sparklineHeight || 36;
        this.formatter = typeof options.formatter === 'function' ? options.formatter : null;

        // type=button so it doesn't submit any wrapping form
        this.element.setAttribute('type', 'button');
    }

    async onInit() {
        // Embed MiniChart for the sparkline (smoothed line + faint fill).
        // height stays small; width is 100% of container.
        this.sparkline = new MiniChart({
            containerId: 'spark',
            chartType: 'line',
            data: this.sparklineValues,
            color: this.sparklineColor || this._defaultSparkColor(),
            fillColor: this._fillColorFor(this.sparklineColor || this._defaultSparkColor()),
            fill: true,
            smoothing: 0.3,
            height: this.sparklineHeight,
            width: '100%',
            showTooltip: false,
            showCrosshair: false,
            showXAxis: false,
            animate: false,
            padding: 2
        });
        this.addChild(this.sparkline);
    }

    async getTemplate() {
        const valueDisplay = this._formatValue(this.value);
        const deltaHtml = this._renderDelta();
        return `
            <span class="mojo-kpi-tile-label">${this.escapeHtml(this.label)}</span>
            <span class="mojo-kpi-tile-value">${this.escapeHtml(valueDisplay)}</span>
            ${deltaHtml}
            <div data-container="spark" class="mojo-kpi-tile-spark"></div>
        `;
    }

    async onAfterRender() {
        if (!this._clickBound) {
            this.element.addEventListener('click', () => {
                this.emit?.('tile:click', { tile: this, slug: this.slug });
            });
            this._clickBound = true;
        }
    }

    /**
     * Update tile data without recreating the view. Used by KPIStrip after
     * a refresh fetch.
     */
    setData({ value, delta, deltaPct, sparkline } = {}) {
        if (value !== undefined) this.value = value;
        if (delta !== undefined) this.delta = delta;
        if (deltaPct !== undefined) this.deltaPct = deltaPct;
        if (sparkline !== undefined) {
            this.sparklineValues = Array.isArray(sparkline) ? sparkline.slice() : [];
            this.sparkline?.setData(this.sparklineValues);
        }
        if (this.isMounted()) this.render();
    }

    _defaultSparkColor() {
        const map = {
            critical: 'rgba(220, 53, 69, 1)',   // bs-danger
            high:     'rgba(253, 126, 20, 1)',  // bs-orange
            warn:     'rgba(255, 193, 7, 1)',   // bs-warning
            info:     'rgba(13, 202, 240, 1)',  // bs-info
            good:     'rgba(25, 135, 84, 1)'    // bs-success
        };
        return map[this.severity] || 'rgba(108, 117, 125, 1)'; // bs-secondary
    }

    _fillColorFor(stroke) {
        // Convert "rgba(r,g,b,1)" → faint "rgba(r,g,b,0.12)" for the area fill.
        const m = String(stroke).match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
        if (m) return `rgba(${m[1]}, ${m[2]}, ${m[3]}, 0.12)`;
        return 'rgba(108, 117, 125, 0.12)';
    }

    _formatValue(v) {
        if (v == null) return '—';
        if (this.formatter) return this.formatter(v);
        if (typeof v === 'number') return v.toLocaleString();
        return String(v);
    }

    _renderDelta() {
        if (this.deltaPct == null && this.delta == null) return '';

        let label, sign;
        if (this.deltaPct != null && Number.isFinite(this.deltaPct)) {
            const rounded = Math.abs(this.deltaPct) >= 10
                ? Math.round(this.deltaPct)
                : Math.round(this.deltaPct * 10) / 10;
            sign = rounded > 0 ? '+' : (rounded < 0 ? '−' : '±');
            label = `${sign}${Math.abs(rounded)}%`;
        } else if (this.delta != null) {
            // No percent (prev was 0) — show absolute delta. Never Infinity%.
            sign = this.delta > 0 ? '+' : (this.delta < 0 ? '−' : '±');
            label = `${sign}${Math.abs(this.delta)}`;
        } else {
            return '';
        }

        let cls = 'mojo-kpi-tile-delta';
        if (sign === '±') {
            cls += ' mojo-kpi-tile-delta-flat';
        } else if (this.tone === 'bad') {
            cls += sign === '+' ? ' mojo-kpi-tile-delta-bad' : ' mojo-kpi-tile-delta-good';
        } else if (this.tone === 'good') {
            cls += sign === '+' ? ' mojo-kpi-tile-delta-good' : ' mojo-kpi-tile-delta-bad';
        } else {
            cls += ' mojo-kpi-tile-delta-neutral';
        }

        return `<span class="${cls}">${this.escapeHtml(label)}</span>`;
    }
}

export default KPITile;
