/**
 * ProfileSecuritySection - Security dashboard tab
 *
 * Compact card rows. Password and Passkeys are actions (dialog/flow).
 * Sessions, Devices, Activity navigate to their own nav sections.
 */
import View from '@core/View.js';
import Modal from '@core/views/feedback/Modal.js';
import rest from '@core/Rest.js';
import PasskeySetupView from './PasskeySetupView.js';
import { Passkey, PasskeyList, PasskeyForms } from '@core/models/Passkeys.js';

export default class ProfileSecuritySection extends View {
    constructor(options = {}) {
        super({
            className: 'profile-security-section',
            template: `
                <div class="ps-section-label">Authentication</div>

                <div class="ps-item" data-action="change-password">
                    <div class="ps-icon bg-primary bg-opacity-10 text-primary"><i class="bi bi-lock"></i></div>
                    <div class="ps-info">
                        <div class="ps-title">Password</div>
                        <div class="ps-desc">Change your account password</div>
                    </div>
                    <span class="ps-badge bg-light text-muted border">Change</span>
                </div>

                <div class="ps-item" data-action="manage-passkeys">
                    <div class="ps-icon bg-success bg-opacity-10 text-success"><i class="bi bi-fingerprint"></i></div>
                    <div class="ps-info">
                        <div class="ps-title">Passkeys</div>
                        <div class="ps-desc">Passwordless sign-in with biometrics</div>
                    </div>
                    <i class="bi bi-chevron-right ps-chevron"></i>
                </div>

                <div class="ps-item" data-action="manage-totp">
                    <div class="ps-icon ps-icon-purple"><i class="bi bi-shield-lock"></i></div>
                    <div class="ps-info">
                        <div class="ps-title">Authenticator App</div>
                        <div class="ps-desc">Two-factor authentication with TOTP codes</div>
                    </div>
                    {{#model.requires_mfa|bool}}
                        <span class="ps-badge bg-success bg-opacity-10 text-success border">Enabled</span>
                    {{/model.requires_mfa|bool}}
                    {{^model.requires_mfa|bool}}
                        <span class="ps-badge bg-light text-muted border">Setup</span>
                    {{/model.requires_mfa|bool}}
                </div>

                {{#model.requires_mfa|bool}}
                <div class="ps-item" data-action="manage-recovery-codes">
                    <div class="ps-icon ps-icon-purple"><i class="bi bi-file-earmark-lock"></i></div>
                    <div class="ps-info">
                        <div class="ps-title">Recovery Codes</div>
                        <div class="ps-desc">Backup codes for when you lose your authenticator</div>
                    </div>
                    <i class="bi bi-chevron-right ps-chevron"></i>
                </div>
                {{/model.requires_mfa|bool}}

                <div class="ps-section-label">Sessions</div>

                <div class="ps-item" data-action="revoke-all-sessions">
                    <div class="ps-icon ps-icon-danger"><i class="bi bi-box-arrow-right"></i></div>
                    <div class="ps-info">
                        <div class="ps-title">Revoke All Sessions</div>
                        <div class="ps-desc">Sign out of all devices except this one</div>
                    </div>
                </div>
            `,
            ...options
        });
    }

    // --- Actions ---

    async onActionChangePassword() {
        const app = this.getApp();
        if (app && app.changePassword) {
            await app.changePassword();
        }
        return true;
    }

    async onActionManagePasskeys() {
        const collection = new PasskeyList({ params: { user: this.model.id } });
        try {
            await collection.fetch();
        } catch (e) {
            // ignore fetch errors
        }

        const items = collection.models || [];
        const view = new View({
            template: `
                {{#passkeys}}
                    <div class="pk-row">
                        <div class="pk-icon"><i class="bi bi-fingerprint"></i></div>
                        <div class="pk-info">
                            <div class="pk-name">{{.friendly_name|default:'Unnamed Passkey'}}</div>
                            <div class="pk-meta">Created {{.created|date}} &middot; Last used {{.last_used|relative|default:'never'}} &middot; {{.sign_count}} uses</div>
                        </div>
                        <div class="pk-actions">
                            <button type="button" class="btn btn-outline-secondary" data-action="edit-passkey" data-id="{{.id}}" title="Edit"><i class="bi bi-pencil"></i></button>
                            <button type="button" class="btn btn-outline-danger" data-action="delete-passkey" data-id="{{.id}}" title="Delete"><i class="bi bi-trash"></i></button>
                        </div>
                    </div>
                {{/passkeys}}
                {{^passkeys|bool}}
                    <div class="pk-empty">
                        <i class="bi bi-fingerprint"></i>
                        No passkeys registered yet
                    </div>
                {{/passkeys|bool}}
            `
        });
        view.passkeys = items.map(p => p.toJSON ? p.toJSON() : p);

        view.onActionEditPasskey = async (event, el) => {
            const id = el.dataset.id;
            const passkey = items.find(p => String(p.id) === String(id));
            if (passkey) {
                await Modal.modelForm({
                    title: 'Edit Passkey',
                    model: passkey,
                    fields: PasskeyForms.edit.fields,
                    size: 'sm'
                });
            }
            return true;
        };

        view.onActionDeletePasskey = async (event, el) => {
            const id = el.dataset.id;
            const confirmed = await Modal.confirm('Delete this passkey? You won\'t be able to use it to sign in anymore.', 'Delete Passkey');
            if (confirmed) {
                const passkey = items.find(p => String(p.id) === String(id));
                if (passkey) {
                    await passkey.destroy();
                    this.getApp()?.toast?.success('Passkey deleted');
                }
            }
            return true;
        };

        const result = await Modal.dialog({
            title: 'Passkeys',
            body: view,
            size: 'md',
            buttons: [
                { text: 'Add Passkey', icon: 'bi-plus-lg', class: 'btn-primary', value: 'add' },
                { text: 'Close', class: 'btn-outline-secondary', dismiss: true }
            ]
        });

        if (result === 'add') {
            await this._addPasskey();
        }
        return true;
    }

    async _addPasskey() {
        // Ask for name via rich dialog
        const suggested = Passkey.suggestName();
        const friendlyName = await Modal.dialog({
            title: '<i class="bi bi-fingerprint me-2"></i>Register a Passkey',
            size: 'sm',
            centered: true,
            body: `
                <div style="text-align:center; padding: 0.5rem 0 1rem;">
                    <div class="up-hero-circle-primary">
                        <i class="bi bi-fingerprint"></i>
                    </div>
                    <p class="up-help-text">
                        Passkeys replace passwords with biometrics — fingerprint, face, or device PIN.
                        The private key never leaves your device.
                    </p>
                    <div class="text-start" style="margin-bottom:0.25rem;">
                        <label class="form-label fw-semibold" style="font-size:0.82rem;">Name this passkey</label>
                        <input type="text" class="form-control" id="pss-name-input" value="${suggested}" placeholder="e.g., My MacBook" style="border-radius:8px;">
                        <div class="form-text">A label so you can identify this passkey later.</div>
                    </div>
                </div>`,
            buttons: [
                { text: 'Cancel', class: 'btn-secondary', dismiss: true },
                {
                    text: '<i class="bi bi-fingerprint me-1"></i>Continue',
                    class: 'btn-primary',
                    handler: ({ dialog }) => {
                        const input = dialog.element?.querySelector('#pss-name-input');
                        return input?.value?.trim() || suggested;
                    }
                }
            ]
        });
        if (!friendlyName) return;

        try {
            const result = await Passkey.register(friendlyName);
            if (result.success) {
                await PasskeySetupView.showSuccess(friendlyName);
            } else {
                PasskeySetupView.showError(result.error);
            }
        } catch (err) {
            if (err.name === 'NotAllowedError') return;
            if (err.name === 'SecurityError') {
                PasskeySetupView.showError('Passkeys are not supported on this domain. Ensure you are using HTTPS.');
            } else {
                console.error('Passkey registration error:', err);
                PasskeySetupView.showError(err.message || 'An unexpected error occurred.');
            }
        }
    }

    async onActionManageTotp() {
        const app = this.getApp();
        const isMfaEnabled = this.model.get('requires_mfa');

        if (isMfaEnabled) {
            // Already enabled — offer to disable
            const confirmed = await Modal.confirm(
                'Disable authenticator app? You will no longer need a TOTP code to sign in.',
                'Disable Authenticator'
            );
            if (!confirmed) return true;

            const resp = await rest.DELETE('/api/account/totp');
            if (resp.success) {
                app?.toast?.success('Authenticator app disabled');
                this.model.set('requires_mfa', false);
                await this.render();
            } else {
                app?.toast?.error(resp.message || 'Failed to disable authenticator');
            }
            return true;
        }

        // Step 1: Call setup to get QR code + secret
        const setupResp = await rest.POST('/api/account/totp/setup', {}, {}, { dataOnly: true });
        if (!setupResp.success || !setupResp.data) {
            app?.toast?.error(setupResp.message || 'Failed to start authenticator setup');
            return true;
        }

        const { secret, qr_code } = setupResp.data;

        // Step 2: Show QR code dialog
        const setupView = new View({
            template: `
                <div style="text-align: center; padding: 0.5rem 0;">
                    <p class="up-help-text" style="margin-bottom: 1rem;">
                        Scan this QR code with your authenticator app (Google Authenticator, Authy, 1Password, etc.)
                    </p>
                    <img src="{{{qrCode}}}" alt="TOTP QR Code" class="up-qr-image" />
                    <div style="margin-top: 1rem;">
                        <p class="up-qr-hint">Or enter this key manually:</p>
                        <code class="up-secret-code">{{secret}}</code>
                    </div>
                </div>
            `
        });
        setupView.qrCode = qr_code;
        setupView.secret = secret;

        const result = await Modal.dialog({
            title: 'Set Up Authenticator',
            body: setupView,
            size: 'sm',
            buttons: [
                { text: 'Cancel', class: 'btn-secondary', dismiss: true },
                { text: 'Next', class: 'btn-primary', value: 'next' }
            ]
        });

        if (result !== 'next') return true;

        // Step 3: Prompt for the first TOTP code to confirm
        const code = await Modal.prompt(
            'Enter the 6-digit code from your authenticator app to verify setup:',
            'Verify Authenticator',
            { placeholder: '000000' }
        );
        if (!code) return true;

        // Step 4: Confirm
        const confirmResp = await rest.POST('/api/account/totp/confirm', { code: code.trim() });
        if (confirmResp.success) {
            app?.toast?.success('Authenticator app enabled');
            this.model.set('requires_mfa', true);
            await this.render();
        } else {
            app?.toast?.error(confirmResp.message || 'Invalid code. Please try setup again.');
        }
        return true;
    }

    // Navigate to sections in the parent UserProfileView
    async onActionManageRecoveryCodes() {
        const app = this.getApp();

        // Fetch masked recovery codes
        const resp = await rest.GET('/api/account/totp/recovery-codes', {}, { dataOnly: true });
        if (!resp.success || !resp.data) {
            app?.toast?.error(resp.message || 'Failed to load recovery codes');
            return true;
        }

        const { remaining, codes } = resp.data;

        const view = new View({
            template: `
                <div class="rc-info">
                    <span class="rc-remaining">{{remaining}}</span> recovery codes remaining
                </div>
                <div class="rc-list">
                    {{#codes}}
                        <div class="rc-code">{{.}}</div>
                    {{/codes}}
                </div>
            `
        });
        view.remaining = remaining;
        view.codes = codes || [];

        const result = await Modal.dialog({
            title: 'Recovery Codes',
            body: view,
            size: 'sm',
            buttons: [
                { text: 'Regenerate', icon: 'bi-arrow-repeat', class: 'btn-warning', value: 'regenerate' },
                { text: 'Close', class: 'btn-outline-secondary', dismiss: true }
            ]
        });

        if (result === 'regenerate') {
            // Require current TOTP code to regenerate
            const code = await Modal.prompt(
                'Enter your current authenticator code to regenerate recovery codes:',
                'Regenerate Recovery Codes',
                { placeholder: '000000' }
            );
            if (!code) return true;

            const regenResp = await rest.POST('/api/account/totp/recovery-codes/regenerate', {
                code: code.trim()
            }, {}, { dataOnly: true });

            if (regenResp.success && regenResp.data?.recovery_codes) {
                const newCodes = regenResp.data.recovery_codes;
                const codesText = newCodes.join('\n');

                const newView = new View({
                    template: `
                        <div class="rc-warning">
                            <i class="bi bi-exclamation-triangle me-1"></i>
                            <strong>Save these codes now.</strong> They will not be shown again. Old codes are invalidated.
                        </div>
                        <div class="rc-new-list">
                            {{#newCodes}}
                                <div class="rc-new-code">{{.}}</div>
                            {{/newCodes}}
                        </div>
                    `
                });
                newView.newCodes = newCodes;

                await Modal.dialog({
                    title: 'New Recovery Codes',
                    body: newView,
                    size: 'sm',
                    buttons: [
                        { text: 'Copy All', icon: 'bi-clipboard', class: 'btn-primary', handler: async () => {
                            try {
                                await navigator.clipboard.writeText(codesText);
                                app?.toast?.success('Recovery codes copied');
                            } catch {
                                app?.toast?.error('Failed to copy codes');
                            }
                            return false; // keep dialog open
                        }},
                        { text: 'Done', class: 'btn-outline-secondary', dismiss: true }
                    ]
                });
            } else {
                app?.toast?.error(regenResp.message || 'Failed to regenerate recovery codes');
            }
        }
        return true;
    }

    async onActionRevokeAllSessions() {
        const app = this.getApp();

        const confirmed = await Modal.confirm(
            'This will sign you out of all other devices and sessions. Your current session will remain active. This cannot be undone.',
            'Revoke All Sessions'
        );
        if (!confirmed) return true;

        const password = await Modal.prompt(
            'Enter your current password to confirm:',
            'Confirm Password',
            { placeholder: 'Current password' }
        );
        if (!password) return true;

        const resp = await rest.POST('/api/auth/sessions/revoke', {
            current_password: password.trim()
        }, {}, { dataOnly: true });

        if (resp.success && resp.data) {
            // Store new tokens — old ones are now invalid
            if (resp.data.access_token) {
                app?.auth?.setTokens?.(resp.data);
            }
            app?.toast?.success('All other sessions have been revoked');
        } else {
            app?.toast?.error(resp.message || 'Failed to revoke sessions');
        }
        return true;
    }

    // Navigate to sections in the parent UserProfileView
    async onActionNavigate(event, el) {
        if (this.parent && this.parent.onActionNavigate) {
            return this.parent.onActionNavigate(event, el);
        }
        return true;
    }
}
