/**
 * ProfileConnectedSection - OAuth connected accounts tab
 *
 * Lists OAuth provider connections (Google, GitHub, etc.).
 * Users can unlink connections with lockout guard protection.
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

export default class ProfileConnectedSection extends View {
    constructor(options = {}) {
        super({
            className: 'profile-connected-section',
            template: `
                {{#connections}}
                    <div class="pc-row">
                        <div class="pc-icon"><i class="bi {{.icon}}"></i></div>
                        <div class="pc-info">
                            <div class="pc-provider">{{.provider}}</div>
                            <div class="pc-meta">{{.email}} &middot; Connected {{.created|relative}}</div>
                        </div>
                        <div class="pc-actions">
                            <button type="button" class="btn btn-outline-danger" data-action="unlink" data-id="{{.id}}" title="Unlink"><i class="bi bi-x-lg me-1"></i>Unlink</button>
                        </div>
                    </div>
                {{/connections}}
                {{^connections|bool}}
                    <div class="pc-empty">
                        <i class="bi bi-plug"></i>
                        No connected accounts
                        <div style="font-size: 0.78rem; margin-top: 0.5rem;">
                            Connect a social account by signing in with a provider while logged in.
                        </div>
                    </div>
                {{/connections|bool}}
            `,
            ...options
        });
        this.connections = [];
    }

    async onBeforeRender() {
        try {
            const resp = await rest.GET('/api/account/oauth_connection');
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
            `Unlink ${provider}? You won't be able to sign in with this provider anymore.`,
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
