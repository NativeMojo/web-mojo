/**
 * MetricCard - At-a-glance KPI card.
 *
 * A compact label / value / hint card with an optional icon and
 * an optional left-border tone accent. Designed to compose in a
 * row of 3-4 cards for "overview" sections (RuleSetView Overview,
 * IncidentView Overview, security dashboard).
 *
 * Example:
 *   const card = new MetricCard({
 *       label: 'Incidents (30d)',
 *       value: 42,
 *       icon: 'bi-shield-exclamation',
 *       tone: 'warning',
 *       hint: '14 minutes ago',
 *       action: 'view-incidents'   // optional — emits via parent's onActionViewIncidents
 *   });
 *   this.addChild(card, { containerId: 'kpi-1' });
 *
 * Tones map to Bootstrap CSS variables — `default` | `success` |
 * `warning` | `danger` | `info`. Theme-aware via tokens.
 */

import View from '@core/View.js';

const VALID_TONES = new Set(['default', 'success', 'warning', 'danger', 'info', 'primary']);

class MetricCard extends View {
    constructor(options = {}) {
        const {
            label,
            value,
            icon = null,
            valueIcon = null,
            tone = 'default',
            hint = null,
            action = null,
            ...viewOptions
        } = options;

        super({
            tagName: action ? 'button' : 'div',
            className: 'metric-card',
            ...viewOptions
        });

        this.label = label || '';
        this.value = value;
        this.icon = icon;
        this.valueIcon = valueIcon;  // optional Bootstrap Icons class shown left of value
        this.tone = VALID_TONES.has(tone) ? tone : 'default';
        this.hint = hint;
        this.action = action;

        this.template = () => this._buildTemplate();
    }

    _buildTemplate() {
        const valueText = this._renderValue();
        const iconHtml = this.icon
            ? `<i class="bi ${this.escapeHtml(this.icon)} metric-card-icon"></i>`
            : '';
        const valueIconHtml = this.valueIcon
            ? `<i class="bi ${this.escapeHtml(this.valueIcon)} metric-card-value-icon"></i>`
            : '';
        const hintHtml = this.hint
            ? `<div class="metric-card-hint">${this.escapeHtml(String(this.hint))}</div>`
            : '';

        // Outer element styling is handled by `className` + the tone class on the root.
        // We toggle the tone via classList in onAfterRender to avoid stomping
        // the user's className override.
        // Stylesheet is injected once at module load (see bottom of file) so
        // multiple MetricCard instances don't duplicate `<style>` blocks that
        // would fight in the cascade.
        return `
            <div class="metric-card-label">${iconHtml}<span>${this.escapeHtml(this.label)}</span></div>
            <div class="metric-card-value">${valueIconHtml}<span>${valueText}</span></div>
            ${hintHtml}
        `.trim();
    }

    _renderValue() {
        const v = this.value;
        if (v === null || v === undefined) return '<span class="text-muted">—</span>';
        if (typeof v === 'object' && v !== null && 'text' in v) {
            return this.escapeHtml(String(v.text));
        }
        return this.escapeHtml(String(v));
    }

    async onAfterRender() {
        await super.onAfterRender();
        if (!this.element) return;
        // Apply the tone class
        VALID_TONES.forEach(t => this.element.classList.remove(`metric-card-tone-${t}`));
        if (this.tone && this.tone !== 'default') {
            this.element.classList.add(`metric-card-tone-${this.tone}`);
        }
        // Apply data-action / type="button" on the root when this is a clickable card
        if (this.action) {
            this.element.setAttribute('data-action', this.action);
            if (this.element.tagName === 'BUTTON' && !this.element.hasAttribute('type')) {
                this.element.setAttribute('type', 'button');
            }
        }
    }

    /**
     * Update the displayed value without a full re-render.
     * @param {*} value - New value (string|number|{text})
     */
    setValue(value) {
        this.value = value;
        if (!this.element) return;
        // Update only the text span; preserve the optional valueIcon.
        const valueEl = this.element.querySelector('.metric-card-value');
        if (!valueEl) return;
        const span = valueEl.querySelector(':scope > span');
        if (span) {
            span.innerHTML = this._renderValue();
        } else {
            valueEl.innerHTML = `<span>${this._renderValue()}</span>`;
        }
    }

    /**
     * Update the hint line without re-render.
     * @param {string|null} hint
     */
    setHint(hint) {
        this.hint = hint;
        if (!this.element) return;
        let slot = this.element.querySelector('.metric-card-hint');
        if (hint) {
            if (slot) {
                slot.textContent = String(hint);
            } else {
                slot = document.createElement('div');
                slot.className = 'metric-card-hint';
                slot.textContent = String(hint);
                this.element.appendChild(slot);
            }
        } else if (slot) {
            slot.remove();
        }
    }
}

// Stylesheet for MetricCard lives in src/core/css/core.css under "MetricCard".

export default MetricCard;
