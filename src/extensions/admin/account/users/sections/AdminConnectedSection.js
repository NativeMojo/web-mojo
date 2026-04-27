/**
 * AdminConnectedSection - Admin view of a user's OAuth connections
 *
 * View linked providers and unlink on behalf of user.
 * Uses admin-scoped endpoints.
 */
import View from '@core/View.js';
import Modal from '@core/views/feedback/Modal.js';
import rest from '@core/Rest.js';

const PROVIDER_ICONS = {
    google: 'bi-google',
    github: 'bi-github',
    microsoft: 'bi-microsoft',
    apple: 'bi-apple',
    facebook: 'bi-facebook',
    twitter: 'bi-twitter-x',
    linkedin: 'bi-linkedin'
};

export default class AdminConnectedSection extends View {
    constructor(options = {}) {
        super({
            className: 'admin-connected-section',
            template: `
                <style>
                    .ac-row { display: flex; align-items: center; gap: 0.85rem; padding: 0.85rem 1rem; border: 1px solid #f0f0f0; border-radius: 8px; margin-bottom: 0.5rem; }
                    .ac-icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1rem; flex-shrink: 0; background: #f0f0f0; color: #495057; }
                    .ac-info { flex: 1; min-width: 0; }
                    .ac-provider { font-weight: 600; font-size: 0.88rem; text-transform: capitalize; }
                    .ac-meta { font-size: 0.78rem; color: #6c757d; }
                    .ac-actions .btn { font-size: 0.75rem; padding: 0.25rem 0.5rem; }
                    .ac-empty { text-align: center; padding: 2rem 1rem; color: #6c757d; }
                    .ac-empty i { font-size: 2rem; color: #ced4da; display: block; margin-bottom: 0.5rem; }
                </style>

                {{#connections}}
                    <div class="ac-row">
                        <div class="ac-icon"><i class="bi {{.icon}}"></i></div>
                        <div class="ac-info">
                            <div class="ac-provider">{{.provider}}</div>
                            <div class="ac-meta">{{.email}} &middot; Connected {{.created|relative}}</div>
                        </div>
                        <div class="ac-actions">
                            <button type="button" class="btn btn-outline-danger" data-action="unlink" data-id="{{.id}}" title="Unlink"><i class="bi bi-x-lg me-1"></i>Unlink</button>
                        </div>
                    </div>
                {{/connections}}
                {{^connections|bool}}
                    <div class="ac-empty">
                        <i class="bi bi-plug"></i>
                        No connected accounts
                    </div>
                {{/connections|bool}}
            `,
            ...options
        });
        this.connections = [];
    }

    async onBeforeRender() {
        try {
            const resp = await rest.GET('/api/account/oauth_connection', { user: this.model.id });
            const results = resp?.data?.results || resp?.data || [];
            this.connections = results.map(c => ({
                ...c,
                icon: PROVIDER_ICONS[c.provider] || 'bi-link-45deg'
            }));
        } catch (e) {
            this.connections = [];
        }
    }

    async onActionUnlink(event, el) {
        const id = el.dataset.id;
        const connection = this.connections.find(c => String(c.id) === String(id));
        const provider = connection?.provider || 'this account';

        const confirmed = await Modal.confirm(
            `Unlink ${provider} for this user?`,
            'Unlink Account'
        );
        if (!confirmed) return true;

        const resp = await rest.DELETE(`/api/account/oauth_connection/${id}`);
        if (resp.success) {
            this.getApp()?.toast?.success(`${provider} account unlinked`);
            await this.render();
        } else {
            this.getApp()?.toast?.error(resp.message || 'Failed to unlink account');
        }
        return true;
    }
}
