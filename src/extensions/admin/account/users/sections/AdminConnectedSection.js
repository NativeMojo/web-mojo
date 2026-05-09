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
                {{#connections}}
                    <div class="admin-connected-row">
                        <div class="admin-connected-icon"><i class="bi {{.icon}}"></i></div>
                        <div class="admin-connected-info">
                            <div class="admin-connected-provider">{{.provider}}</div>
                            <div class="admin-connected-meta text-secondary">{{.email}} &middot; Connected {{.created|relative}}</div>
                        </div>
                        <div class="admin-connected-actions">
                            <button type="button" class="btn btn-sm btn-outline-danger" data-action="unlink" data-id="{{.id}}" title="Unlink"><i class="bi bi-x-lg me-1"></i>Unlink</button>
                        </div>
                    </div>
                {{/connections}}
                {{^connections|bool}}
                    <div class="admin-connected-empty text-secondary">
                        <i class="bi bi-plug"></i>
                        <div>No connected accounts</div>
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
