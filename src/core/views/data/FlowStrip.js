/**
 * FlowStrip - Horizontal "STEP 1 → STEP 2 → STEP 3" flow primitive.
 *
 * Used for records that describe a process — RuleSet triggering
 * (Match → Bundle → Threshold → Re-trigger), incident triage flow,
 * job lifecycle, anywhere a sequence of stages reads better as a
 * left-to-right strip than a flat field list.
 *
 * ┌──────────┬──────────┬──────────┬──────────┐
 * │ STEP 1   │ STEP 2   │ STEP 3   │ STEP 4   │
 * │ Match    │ Bundle   │ Threshold│ Re-trigger│
 * │ value    │ value    │ value    │ value    │
 * │ hint     │ hint     │ hint     │ hint     │
 * └──────────┴──────────┴──────────┴──────────┘
 *
 * @example
 *   const flow = new FlowStrip({
 *       model,
 *       steps: m => [
 *           { num: 'STEP 1', title: 'Match',     value: matchByLabel(m.get('match_by')),
 *             hint: 'Each condition under "Conditions" must match the event.',
 *             action: 'edit-step', actionData: { tab: 'general' } },
 *           { num: 'STEP 2', title: 'Bundle',    value: bundleLabel(m),
 *             hint: 'Group events from the same source.' },
 *           { num: 'STEP 3', title: 'Threshold', value: thresholdLabel(m),
 *             empty: !m.get('trigger_count'),
 *             hint: 'Counted within the trigger window.' },
 *           { num: 'STEP 4', title: 'Re-trigger', value: retriggerLabel(m),
 *             empty: m.get('retrigger_every') == null,
 *             hint: 'Re-fires the handler chain.' }
 *       ]
 *   });
 *
 * `steps` accepts a static array OR a function of model. Each step:
 *
 *   {
 *       num:        'STEP 1',          // small uppercase eyebrow (escaped)
 *       title:      'Match',           // step heading (escaped)
 *       value:      'category=auth',   // primary value — trusted HTML
 *       hint:       'Each condition…', // small descriptor — trusted HTML
 *       empty:      false,             // when true, value is rendered with the
 *                                      //   `.flow-strip-empty` muted italic style
 *       action:     'edit-step',       // optional pencil button data-action
 *       actionIcon: 'bi-pencil',       // override default pencil icon
 *       actionData: { tab: 'general' } // extra data-* attributes on the pencil
 *   }
 */

import View from '@core/View.js';

class FlowStrip extends View {
    constructor(options = {}) {
        const {
            steps = [],
            ...viewOptions
        } = options;

        super({
            tagName: 'div',
            className: 'detail-flow-strip',
            ...viewOptions
        });

        this._stepsOpt = steps;

        this.template = () => this._buildTemplate();
    }

    // ── Resolvers ──────────────────────────────────────────────

    _resolveSteps() {
        const raw = (typeof this._stepsOpt === 'function')
            ? this._stepsOpt(this.model)
            : this._stepsOpt;
        if (!Array.isArray(raw)) return [];
        return raw.filter(Boolean);
    }

    // ── Rendering ──────────────────────────────────────────────

    _buildTemplate() {
        const steps = this._resolveSteps();
        if (!steps.length) {
            return '';
        }

        return steps.map((s, i) => this._renderStep(s, i)).join('');
    }

    _renderStep(step, index) {
        const num     = step.num != null ? String(step.num) : `STEP ${index + 1}`;
        const title   = String(step.title ?? '');
        const value   = step.value != null ? String(step.value) : '';   // trusted HTML
        const hint    = step.hint  != null ? String(step.hint)  : '';   // trusted HTML
        const isEmpty = !!step.empty;

        // Optional action button (pencil-style edit affordance).
        let actionHtml = '';
        if (step.action) {
            const icon = step.actionIcon || 'bi-pencil';
            const dataAttrs = step.actionData
                ? Object.entries(step.actionData)
                    .map(([k, v]) => ` data-${this.escapeHtml(k)}="${this.escapeHtml(String(v))}"`)
                    .join('')
                : '';
            actionHtml = `<button type="button" class="btn btn-link p-0 text-body-secondary flow-strip-action" data-action="${this.escapeHtml(step.action)}"${dataAttrs}><i class="bi ${this.escapeHtml(icon)}"></i></button>`;
        }

        const valueClass = isEmpty ? 'flow-strip-value flow-strip-empty' : 'flow-strip-value';

        return `
            <div class="flow-strip-step">
                <div class="flow-strip-num">${this.escapeHtml(num)}</div>
                <div class="flow-strip-title">${this.escapeHtml(title)}${actionHtml}</div>
                <div class="${valueClass}">${value}</div>
                ${hint ? `<div class="flow-strip-hint">${hint}</div>` : ''}
            </div>
        `;
    }

    /**
     * Replace the steps source and re-render. Accepts the same shape as
     * the constructor's `steps` option (array or function).
     */
    setSteps(steps) {
        this._stepsOpt = steps ?? [];
        if (this.element) {
            return this.render();
        }
    }
}

// Stylesheet for FlowStrip lives in src/core/css/core.css under "FlowStrip".

export default FlowStrip;
export { FlowStrip };
