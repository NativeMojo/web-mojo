/**
 * StatusPanel - Hero "current state" panel for record-detail views.
 *
 * The big colored panel that opens an Overview section with a
 * dot+state read-out, a primary headline, a secondary meta line, and
 * a row of action buttons. Used in JobDetailsView (job lifecycle),
 * IncidentView (incident triage), RunnerDetailsView (alive/dead),
 * and any other record where the operator's first question is
 * "what state is this in and what do I do next."
 *
 * Security note: `meta` is rendered as TRUSTED HTML so callers can
 * compose `<code>`, `<strong>`, etc. inline. The trust contract is
 * "the string was assembled in source code, not pulled from user
 * input." If you interpolate model fields or other user-controlled
 * data into `meta`, you MUST escape them yourself (e.g. via
 * `MOJOUtils.escapeHtml(...)`). `state`, `headline`, and action
 * `label` are escaped automatically.
 *
 * ┌───────────────────────────────────────────────────────────┐
 * │  ● State label                       [ primary ] [ alt ]  │
 * │  Headline line                                            │
 * │  Optional supporting meta line · with <code>fragments</code>
 * └───────────────────────────────────────────────────────────┘
 *
 * Each option may be a static value OR a function of `model` (the
 * standard DetailHeaderView pattern) so the panel re-renders with the
 * current model state.
 *
 * @example
 *   const panel = new StatusPanel({
 *       model,
 *       tone:     m => m.get('status') === 'failed' ? 'danger' : 'info',
 *       state:    m => m.get('status') === 'running' ? 'Running' : 'Idle',
 *       headline: m => `On ${m.get('runner_id') || '—'}`,
 *       meta:     m => `Last attempt ${m.get('attempt')} of ${m.get('max_retries')}`,
 *       actions:  m => [
 *           m.canRetry?.()  && { label: 'Retry now', action: 'retry-job',  icon: 'bi-arrow-clockwise', variant: 'primary' },
 *           m.canCancel?.() && { label: 'Cancel',    action: 'cancel-job', icon: 'bi-x-circle',        variant: 'outline-danger' }
 *       ].filter(Boolean)
 *   });
 *   parent.addChild(panel, { containerId: 'status' });
 *
 * Action buttons render with `data-action="<action>"` and dispatch via
 * the standard MOJO action pipeline — handlers live on whichever
 * ancestor wants to react (typically the parent section view or the
 * containing DetailView subclass).
 */

import View from '@core/View.js';

const VALID_TONES = new Set(['default', 'primary', 'success', 'info', 'warning', 'danger', 'secondary']);

class StatusPanel extends View {
    constructor(options = {}) {
        const {
            tone     = 'default',
            state    = '',
            headline = '',
            meta     = '',
            icon     = null,
            actions  = [],
            ...viewOptions
        } = options;

        super({
            tagName: 'div',
            className: 'detail-status-panel',
            ...viewOptions
        });

        this._toneOpt     = tone;
        this._stateOpt    = state;
        this._headlineOpt = headline;
        this._metaOpt     = meta;
        this._iconOpt     = icon;
        this._actionsOpt  = actions;

        this.template = () => this._buildTemplate();
    }

    // ── Resolvers ──────────────────────────────────────────────

    _resolve(opt, fallback = '') {
        if (typeof opt === 'function') return opt(this.model) ?? fallback;
        return opt ?? fallback;
    }

    _resolveTone() {
        const t = this._resolve(this._toneOpt, 'default');
        return VALID_TONES.has(t) ? t : 'default';
    }

    _resolveActions() {
        const arr = this._resolve(this._actionsOpt, []) || [];
        return Array.isArray(arr) ? arr.filter(Boolean) : [];
    }

    // ── Rendering ──────────────────────────────────────────────

    _buildTemplate() {
        const tone     = this._resolveTone();
        const state    = String(this._resolve(this._stateOpt, ''));
        const headline = String(this._resolve(this._headlineOpt, ''));
        const meta     = this._resolve(this._metaOpt, ''); // trusted HTML
        const icon     = this._resolve(this._iconOpt, null);
        const actions  = this._resolveActions();

        const iconHtml = icon
            ? `<i class="bi ${this.escapeHtml(String(icon))} detail-status-icon"></i>`
            : '<span class="detail-status-dot"></span>';

        const actionsHtml = actions.map(a => {
            const variant = a.variant || 'primary';
            const btnClass = variant.startsWith('outline-')
                ? `btn-${variant}`
                : `btn-${variant}`;
            const aIcon = a.icon ? `<i class="bi ${this.escapeHtml(a.icon)} me-1"></i>` : '';
            return `<button class="btn ${btnClass} btn-sm" data-action="${this.escapeHtml(a.action || '')}" type="button">${aIcon}${this.escapeHtml(a.label || '')}</button>`;
        }).join('');

        return `
            <div class="detail-status-headline">
                ${state ? `<div class="detail-status-state">${iconHtml}${this.escapeHtml(state)}</div>` : ''}
                ${headline ? `<div class="detail-status-line">${this.escapeHtml(headline)}</div>` : ''}
                ${meta ? `<div class="detail-status-meta">${meta}</div>` : ''}
            </div>
            ${actions.length ? `<div class="detail-status-actions">${actionsHtml}</div>` : ''}
        `.trim();
    }

    async onAfterRender() {
        await super.onAfterRender();
        if (!this.element) return;

        // Apply tone class fresh on every render (clear any stale tone-* class
        // first) so a state change that flips tone shows up correctly.
        VALID_TONES.forEach(t => this.element.classList.remove(`tone-${t}`));
        const tone = this._resolveTone();
        if (tone && tone !== 'default') {
            this.element.classList.add(`tone-${tone}`);
        }
    }
}

// Stylesheet for StatusPanel lives in src/core/css/core.css under "StatusPanel".

export default StatusPanel;
export { StatusPanel };
