/** Read-only declared Upstream detail with one named retirement action. */

import View from '@core/View.js';
import DetailView from '@core/views/data/DetailView.js';
import Modal from '@core/views/feedback/Modal.js';
import {
    Upstream, classifyActionResponse, isLiteralSuperuser
} from '@ext/admin/models/Edge.js';

class UpstreamOverviewSection extends View {
    constructor(options = {}) {
        super({
            className: 'upstream-overview',
            template: `
                <div class="detail-section-eyebrow">Declared destination</div>
                <div class="detail-flat-row"><div class="detail-flat-row-label">Name</div>
                    <div class="detail-flat-row-value">{{model.name}}</div></div>
                <div class="detail-flat-row"><div class="detail-flat-row-label">Kind</div>
                    <div class="detail-flat-row-value">{{model.kind}}</div></div>
                <div class="detail-flat-row"><div class="detail-flat-row-label">Destination</div>
                    <div class="detail-flat-row-value font-monospace">{{destination}}</div></div>
                <div class="detail-flat-row"><div class="detail-flat-row-label">Scope</div>
                    <div class="detail-flat-row-value">{{scopeName}}</div></div>
                <div class="detail-flat-row"><div class="detail-flat-row-label">Status</div>
                    <div class="detail-flat-row-value">{{statusLabel}}</div></div>

                <div class="alert alert-light border small mt-4 mb-0">
                    Destinations are immutable after declaration. Retire this row and declare a
                    replacement to change where traffic may be sent.
                </div>
            `,
            ...options
        });
    }

    get destination() {
        if (this.model?.get?.('kind') === 'unix') return `unix:${this.model.get('socket_path') || '—'}`;
        const host = this.model?.get?.('host') || '—';
        const port = this.model?.get?.('port');
        return port ? `${host}:${port}` : host;
    }
    get scopeName() { return this.model?.get?.('group')?.name || 'Shared platform'; }
    get statusLabel() { return this.model?.get?.('is_enabled') ? 'Active' : 'Retired'; }
}

class UpstreamView extends DetailView {
    constructor(options = {}) {
        const model = options.model || new Upstream(options.data || {});
        const overviewSection = new UpstreamOverviewSection({ model });
        super({
            className: 'upstream-view',
            ...options,
            model,
            header: {
                icon: 'bi-diagram-3',
                titleField: 'name',
                subtitleFn: m => m.get('kind') === 'unix'
                    ? `unix:${m.get('socket_path') || '—'}`
                    : `${m.get('host') || '—'}:${m.get('port') || '—'}`,
                chips: [
                    { text: m => m.get('kind'), variant: 'info' },
                    {
                        text: m => m.get('is_enabled') ? 'Active' : 'Retired',
                        variant: m => m.get('is_enabled') ? 'success' : 'secondary'
                    }
                ],
                contextMenu: {
                    items: [{
                        label: 'Retire upstream', action: 'retire-upstream',
                        icon: 'bi-x-octagon', danger: true,
                        when: m => m.get('is_enabled') === true && isLiteralSuperuser(m._edgeApp)
                    }]
                }
            },
            sections: [{ key: 'Overview', label: 'Overview', icon: 'bi-grid-1x2', view: overviewSection }],
            activeSection: 'Overview'
        });
        this.overviewSection = overviewSection;
        this.collection = options.collection || model.collection || null;
    }

    async onActionRetireUpstream() {
        const app = this.getApp();
        if (!isLiteralSuperuser(app) || !this.model.get('is_enabled')) return true;
        const name = this.model.get('name');
        const confirmed = await app.confirm({
            title: 'Retire upstream',
            message: `Retire "${name}"? VHosts referencing it will stop serving until they are changed. `
                + 'The destination cannot be edited or restored in place.',
            confirmLabel: 'Retire upstream', confirmClass: 'btn-danger'
        });
        if (!confirmed) return true;

        app.showLoading?.();
        try {
            let response;
            try {
                response = await this.model.retire();
            } catch (error) {
                response = { success: false, error: error.message, status: error.status || 500 };
            }
            const verdict = classifyActionResponse(response, this.model);
            if (!verdict.ok) {
                Modal.showError(verdict.error || 'The upstream was not retired.');
                return true;
            }
            const refresh = await this.collection?.fetch?.();
            if (refresh && !classifyActionResponse(refresh, this.collection).ok) {
                Modal.showError('The upstream was retired, but the authoritative list could not be refreshed.');
                return true;
            }
            app.toast?.success('Upstream retired');
            this.emit('deleted', { model: this.model });
            const dialog = this.element?.closest('.modal');
            if (dialog) window.bootstrap?.Modal?.getInstance(dialog)?.hide();
        } finally {
            app.hideLoading?.();
        }
        return true;
    }
}

Upstream.VIEW_CLASS = UpstreamView;
UpstreamView.DIALOG_OPTIONS = { size: 'lg' };
export default UpstreamView;
