/**
 * SegmentControl - Horizontal pill-button group for one-of-N selection.
 *
 * A small standalone view that renders a Bootstrap btn-group and emits a
 * `change` event when the user picks a different option. Use for
 * range pickers (7d / 30d / 90d), view modes, or any compact toggle.
 *
 * Not a FormView input — caller is responsible for applying the value
 * (e.g., updating a Collection's params and re-fetching).
 *
 * Example:
 *   const segments = new SegmentControl({
 *       options: [
 *           { value: '7d',  label: '7d' },
 *           { value: '30d', label: '30d' },
 *           { value: '90d', label: '90d' },
 *       ],
 *       value: '30d',
 *       size: 'sm',
 *       ariaLabel: 'Time range'
 *   });
 *   segments.on('change', ({ value }) => collection.fetch({ range: value }));
 *   this.addChild(segments, { containerId: 'range' });
 */

import View from '@core/View.js';

class SegmentControl extends View {
    constructor(options = {}) {
        const {
            options: items = [],
            value,
            size = 'sm',
            ariaLabel = 'Segment control',
            ...viewOptions
        } = options;

        super({
            tagName: 'div',
            className: 'segment-control',
            ...viewOptions
        });

        this.items = items;
        this.value = value !== undefined ? value : (items[0] && items[0].value);
        this.size = size === 'md' ? '' : 'sm';
        this.ariaLabel = ariaLabel;

        this.template = () => this._buildTemplate();
    }

    _buildTemplate() {
        const sizeClass = this.size ? `btn-group-${this.size}` : '';
        const buttons = this.items.map(item => {
            const isActive = item.value === this.value;
            const cls = isActive ? 'btn btn-primary' : 'btn btn-outline-secondary';
            const icon = item.icon ? `<i class="bi ${this.escapeHtml(item.icon)} me-1"></i>` : '';
            return `<button type="button"
                            class="${cls}"
                            data-action="select"
                            data-value="${this.escapeHtml(String(item.value))}"
                            ${isActive ? 'aria-pressed="true"' : 'aria-pressed="false"'}>${icon}${this.escapeHtml(item.label)}</button>`;
        }).join('');

        return `<div class="btn-group ${sizeClass}" role="group" aria-label="${this.escapeHtml(this.ariaLabel)}">${buttons}</div>`;
    }

    async onActionSelect(event, element) {
        const next = element.dataset.value;
        if (next === this.value) return;
        const previous = this.value;
        this.value = next;
        this._paintActive();
        this.emit('change', { value: next, previous });
    }

    /**
     * Update the active button styling without a full re-render.
     * @private
     */
    _paintActive() {
        if (!this.element) return;
        this.element.querySelectorAll('button[data-value]').forEach(btn => {
            const isActive = btn.dataset.value === String(this.value);
            btn.classList.toggle('btn-primary', isActive);
            btn.classList.toggle('btn-outline-secondary', !isActive);
            btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
    }

    /**
     * Programmatically set the value.
     * @param {*} value - The new value to select
     * @param {object} opts - { silent: boolean } — suppress the change event
     * @returns {boolean} true if the value matched a known option and was applied
     */
    setValue(value, { silent = false } = {}) {
        const match = this.items.find(item => String(item.value) === String(value));
        if (!match) return false;
        const previous = this.value;
        if (match.value === previous) return true;
        this.value = match.value;
        this._paintActive();
        if (!silent) this.emit('change', { value: this.value, previous });
        return true;
    }

    getValue() {
        return this.value;
    }
}

export default SegmentControl;
