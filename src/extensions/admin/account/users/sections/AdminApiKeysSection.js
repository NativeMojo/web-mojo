/**
 * AdminApiKeysSection - Admin view/manage of a user's API keys
 *
 * View existing keys, generate new keys on behalf of user, and revoke keys.
 * Uses standard CRUD endpoints with user filter.
 */
import View from '@core/View.js';
import Modal from '@core/views/feedback/Modal.js';
import rest from '@core/Rest.js';

export default class AdminApiKeysSection extends View {
    constructor(options = {}) {
        super({
            className: 'admin-api-keys-section',
            template: `
                <style>
                    .aak-list { border: 1px solid #e9ecef; border-radius: 8px; overflow: hidden; }
                    .aak-item { display: flex; align-items: center; padding: 0.75rem 1rem; border-bottom: 1px solid #f0f0f0; gap: 1rem; }
                    .aak-item:last-child { border-bottom: none; }
                    .aak-item-icon { color: #6c757d; font-size: 1.1rem; flex-shrink: 0; }
                    .aak-item-info { flex: 1; min-width: 0; }
                    .aak-item-name { font-weight: 600; font-size: 0.85rem; display: flex; align-items: center; gap: 0.5rem; }
                    .aak-item-meta { font-size: 0.75rem; color: #6c757d; display: flex; gap: 1rem; flex-wrap: wrap; margin-top: 0.15rem; }
                    .aak-item-meta i { margin-right: 0.2rem; }
                    .aak-empty { padding: 2rem; text-align: center; color: #6c757d; font-size: 0.85rem; }
                    .aak-empty i { font-size: 1.5rem; display: block; margin-bottom: 0.5rem; }
                    .aak-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
                    .aak-header h6 { margin: 0; font-weight: 600; }
                    .aak-result { padding: 1rem; background: #d1e7dd; border: 1px solid #badbcc; border-radius: 8px; margin-bottom: 1rem; }
                    .aak-result-label { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #0f5132; margin-bottom: 0.5rem; }
                    .aak-token-wrap { display: flex; gap: 0.5rem; align-items: center; }
                    .aak-token { flex: 1; font-family: monospace; font-size: 0.78rem; padding: 0.5rem 0.75rem; background: #fff; border: 1px solid #dee2e6; border-radius: 4px; word-break: break-all; max-height: 80px; overflow-y: auto; }
                    .aak-token-warning { font-size: 0.75rem; color: #dc3545; margin-top: 0.5rem; font-weight: 600; }
                </style>

                <div id="aak-new-token" style="display: none;">
                    <div class="aak-result">
                        <div class="aak-result-label">Generated API Key</div>
                        <div class="aak-token-wrap">
                            <div class="aak-token" id="aak-token-display"></div>
                            <button type="button" class="btn btn-outline-secondary btn-sm" data-action="copy-token" title="Copy">
                                <i class="bi bi-clipboard"></i>
                            </button>
                        </div>
                        <div class="aak-token-warning">
                            <i class="bi bi-exclamation-circle me-1"></i>This token will not be shown again. Copy it now.
                        </div>
                    </div>
                </div>

                <div class="aak-header">
                    <h6>API Keys</h6>
                    <button type="button" class="btn btn-primary btn-sm" data-action="generate-key">
                        <i class="bi bi-plus-lg me-1"></i>Generate Key
                    </button>
                </div>

                <div id="aak-keys-list"></div>
            `,
            ...options
        });
        this.apiKeys = [];
        this.generatedToken = null;
    }

    async onBeforeRender() {
        await this._loadKeys();
    }

    async _loadKeys() {
        try {
            const resp = await rest.GET('/api/account/api_keys', { user: this.model.id }, {}, { dataOnly: true });
            this.apiKeys = resp.success && Array.isArray(resp.data) ? resp.data : [];
        } catch (e) {
            this.apiKeys = [];
        }
    }

    onAfterRender() {
        this._renderKeysList();
    }

    _renderKeysList() {
        const container = this.element?.querySelector('#aak-keys-list');
        if (!container) return;

        if (!this.apiKeys.length) {
            container.innerHTML = `
                <div class="aak-list">
                    <div class="aak-empty">
                        <i class="bi bi-key"></i>
                        No API keys for this user
                    </div>
                </div>`;
            return;
        }

        const rows = this.apiKeys.map(key => {
            const name = key.name || 'API Key';
            const created = key.created ? new Date(key.created * 1000).toLocaleDateString() : '';
            const expires = key.expires ? new Date(key.expires * 1000).toLocaleDateString() : 'Never';
            const lastUsed = key.last_used ? new Date(key.last_used * 1000).toLocaleDateString() : 'Never';
            const ips = key.allowed_ips?.length ? key.allowed_ips.join(', ') : 'Any';
            const isActive = key.is_active !== false;
            const statusBadge = isActive
                ? '<span class="badge bg-success">Active</span>'
                : '<span class="badge bg-secondary">Inactive</span>';
            const tokenPreview = key.token_prefix ? `${key.token_prefix}...` : '••••••••';

            return `
                <div class="aak-item">
                    <div class="aak-item-icon"><i class="bi bi-key"></i></div>
                    <div class="aak-item-info">
                        <div class="aak-item-name">${name} ${statusBadge}</div>
                        <div class="aak-item-meta">
                            <span><i class="bi bi-code-square"></i>${tokenPreview}</span>
                            <span><i class="bi bi-calendar"></i>Created ${created}</span>
                            <span><i class="bi bi-clock"></i>Expires ${expires}</span>
                            <span><i class="bi bi-activity"></i>Last used ${lastUsed}</span>
                            <span><i class="bi bi-globe"></i>IPs: ${ips}</span>
                        </div>
                    </div>
                    <div>
                        <button type="button" class="btn btn-outline-danger btn-sm" data-action="revoke-key" data-id="${key.id}" title="Revoke">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>`;
        }).join('');

        container.innerHTML = `<div class="aak-list">${rows}</div>`;
    }

    async onActionGenerateKey() {
        const data = await Modal.form({
            title: `Generate API Key for ${this.model.get('display_name') || this.model.get('email')}`,
            icon: 'bi-key',
            fields: [
                {
                    name: 'name',
                    type: 'text',
                    label: 'Key Name',
                    placeholder: 'e.g., CI/CD Pipeline, Mobile App',
                    required: true,
                    help: 'A descriptive name to identify this key.'
                },
                {
                    name: 'allowed_ips',
                    type: 'text',
                    label: 'Allowed IPs',
                    placeholder: 'e.g., 203.0.113.0/24, 10.0.0.1',
                    help: 'Optional. Comma-separated IP addresses or CIDR ranges.'
                },
                {
                    name: 'expire_days',
                    type: 'select',
                    label: 'Expiration',
                    value: '90',
                    options: [
                        { value: '30', label: '30 days' },
                        { value: '60', label: '60 days' },
                        { value: '90', label: '90 days' },
                        { value: '180', label: '180 days' },
                        { value: '360', label: '360 days' }
                    ]
                }
            ]
        });
        if (!data) return true;

        const body = {
            uid: this.model.id,
            name: data.name,
            expire_days: parseInt(data.expire_days || '90', 10)
        };

        const ipsStr = (data.allowed_ips || '').trim();
        if (ipsStr) {
            body.allowed_ips = ipsStr.split(',').map(ip => ip.trim()).filter(Boolean);
        }

        const resp = await rest.POST('/api/auth/manage/generate_api_key', body, {}, { dataOnly: true });

        if (resp.success && resp.data?.token) {
            this.generatedToken = resp.data.token;
            const resultEl = this.element.querySelector('#aak-new-token');
            const tokenEl = this.element.querySelector('#aak-token-display');
            if (resultEl && tokenEl) {
                tokenEl.textContent = this.generatedToken;
                resultEl.style.display = 'block';
            }
            this.getApp()?.toast?.success('API key generated');
            await this._loadKeys();
            this._renderKeysList();
        } else {
            this.getApp()?.toast?.error(resp.message || 'Failed to generate API key');
        }
        return true;
    }

    async onActionRevokeKey(event, el) {
        const id = el.dataset.id;
        if (!id) return true;

        const confirmed = await Modal.confirm(
            'Revoke this API key? Any applications using it will lose access immediately.',
            'Revoke API Key'
        );
        if (!confirmed) return true;

        const resp = await rest.DELETE(`/api/account/api_keys/${id}`, {}, {}, { dataOnly: true });
        if (resp.success) {
            this.getApp()?.toast?.success('API key revoked');
            const resultEl = this.element?.querySelector('#aak-new-token');
            if (resultEl) resultEl.style.display = 'none';
            await this._loadKeys();
            this._renderKeysList();
        } else {
            this.getApp()?.toast?.error(resp.message || 'Failed to revoke API key');
        }
        return true;
    }

    async onActionCopyToken() {
        if (this.generatedToken) {
            try {
                await navigator.clipboard.writeText(this.generatedToken);
                this.getApp()?.toast?.success('Token copied to clipboard');
            } catch {
                this.getApp()?.toast?.error('Failed to copy token');
            }
        }
        return true;
    }
}
