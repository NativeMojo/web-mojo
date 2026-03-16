/**
 * ProfileApiKeysSection - Personal API key generation
 *
 * Generate IP-restricted long-lived JWT for programmatic access.
 * Token is shown only once after generation.
 */
import View from '@core/View.js';
import Dialog from '@core/views/feedback/Dialog.js';
import rest from '@core/Rest.js';

export default class ProfileApiKeysSection extends View {
    constructor(options = {}) {
        super({
            className: 'profile-api-keys-section',
            template: `
                <style>
                    .pak-warning { padding: 0.85rem 1rem; background: #fff3cd; border: 1px solid #ffecb5; border-radius: 8px; margin-bottom: 1.25rem; font-size: 0.82rem; color: #664d03; display: flex; align-items: flex-start; gap: 0.6rem; }
                    .pak-warning i { font-size: 1rem; flex-shrink: 0; margin-top: 0.1rem; }
                    .pak-form-label { font-size: 0.8rem; font-weight: 600; color: #495057; margin-bottom: 0.35rem; }
                    .pak-help { font-size: 0.73rem; color: #6c757d; margin-top: 0.25rem; }
                    .pak-field { margin-bottom: 1rem; }
                    .pak-generate { margin-top: 0.5rem; }
                    .pak-result { padding: 1rem; background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; margin-top: 1.25rem; }
                    .pak-result-label { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #0f5132; margin-bottom: 0.5rem; }
                    .pak-token-wrap { display: flex; gap: 0.5rem; align-items: center; }
                    .pak-token { flex: 1; font-family: monospace; font-size: 0.78rem; padding: 0.5rem 0.75rem; background: #fff; border: 1px solid #dee2e6; border-radius: 4px; word-break: break-all; max-height: 80px; overflow-y: auto; }
                    .pak-token-warning { font-size: 0.75rem; color: #dc3545; margin-top: 0.5rem; font-weight: 600; }
                </style>

                <div class="pak-warning">
                    <i class="bi bi-exclamation-triangle-fill"></i>
                    <div>
                        <strong>Treat API keys like passwords.</strong> They carry your full account permissions.
                        Store them securely and never expose them in client-side code.
                    </div>
                </div>

                <div class="pak-field">
                    <div class="pak-form-label">Allowed IPs</div>
                    <input type="text" id="pak-allowed-ips" class="form-control form-control-sm"
                        placeholder="e.g., 203.0.113.0/24, 10.0.0.1" />
                    <div class="pak-help">Optional. Comma-separated IP addresses or CIDR ranges to restrict access.</div>
                </div>

                <div class="pak-field">
                    <div class="pak-form-label">Expiration</div>
                    <select id="pak-expire-days" class="form-select form-select-sm" style="max-width: 200px;">
                        <option value="30">30 days</option>
                        <option value="60">60 days</option>
                        <option value="90" selected>90 days</option>
                        <option value="180">180 days</option>
                        <option value="360">360 days</option>
                    </select>
                </div>

                <button type="button" class="btn btn-primary btn-sm pak-generate" data-action="generate-key">
                    <i class="bi bi-key me-1"></i>Generate API Key
                </button>

                <div id="pak-result" style="display: none;">
                    <div class="pak-result">
                        <div class="pak-result-label">Your API Key</div>
                        <div class="pak-token-wrap">
                            <div class="pak-token" id="pak-token-display"></div>
                            <button type="button" class="btn btn-outline-secondary btn-sm" data-action="copy-token" title="Copy">
                                <i class="bi bi-clipboard"></i>
                            </button>
                        </div>
                        <div class="pak-token-warning">
                            <i class="bi bi-exclamation-circle me-1"></i>This token will not be shown again. Copy it now.
                        </div>
                    </div>
                </div>
            `,
            ...options
        });
        this.generatedToken = null;
    }

    async onActionGenerateKey() {
        const ipsInput = this.element.querySelector('#pak-allowed-ips')?.value?.trim();
        const allowed_ips = ipsInput
            ? ipsInput.split(',').map(ip => ip.trim()).filter(Boolean)
            : [];

        const expireDays = parseInt(this.element.querySelector('#pak-expire-days')?.value || '90', 10);

        const confirmed = await Dialog.confirm(
            'Generate a new API key? This key will have full access to your account.' +
            (allowed_ips.length ? '' : ' No IP restrictions will be applied.'),
            'Generate API Key'
        );
        if (!confirmed) return true;

        const body = { expire_days: expireDays };
        if (allowed_ips.length) body.allowed_ips = allowed_ips;

        const resp = await rest.POST('/api/auth/generate_api_key', body, {}, { dataOnly: true });

        if (resp.success && resp.data?.token) {
            this.generatedToken = resp.data.token;
            const resultEl = this.element.querySelector('#pak-result');
            const tokenEl = this.element.querySelector('#pak-token-display');
            if (resultEl && tokenEl) {
                tokenEl.textContent = this.generatedToken;
                resultEl.style.display = 'block';
            }
            this.getApp()?.toast?.success('API key generated');
        } else {
            this.getApp()?.toast?.error(resp.message || 'Failed to generate API key');
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
