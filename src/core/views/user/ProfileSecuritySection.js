/**
 * ProfileSecuritySection - Security dashboard tab
 *
 * Compact card rows. Password and Passkeys are actions (dialog/flow).
 * Sessions, Devices, Activity navigate to their own nav sections.
 */
import View from '@core/View.js';
import Dialog from '@core/views/feedback/Dialog.js';
import rest from '@core/Rest.js';
import { Passkey, PasskeyList, PasskeyForms } from '@core/models/Passkeys.js';

export default class ProfileSecuritySection extends View {
    constructor(options = {}) {
        super({
            className: 'profile-security-section',
            template: `
                <style>
                    .ps-section-label { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #adb5bd; margin-bottom: 0.5rem; margin-top: 1.75rem; }
                    .ps-section-label:first-child { margin-top: 0; }
                    .ps-item { display: flex; align-items: center; gap: 0.85rem; padding: 0.85rem 1rem; border: 1px solid #f0f0f0; border-radius: 8px; margin-bottom: 0.5rem; cursor: pointer; transition: border-color 0.15s, background 0.15s; }
                    .ps-item:hover { border-color: #dee2e6; background: #fafbfd; }
                    .ps-icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1rem; flex-shrink: 0; }
                    .ps-info { flex: 1; min-width: 0; }
                    .ps-title { font-weight: 600; font-size: 0.88rem; }
                    .ps-desc { font-size: 0.78rem; color: #6c757d; }
                    .ps-badge { font-size: 0.72rem; padding: 0.15em 0.5em; border-radius: 3px; flex-shrink: 0; }
                    .ps-chevron { color: #ced4da; font-size: 0.8rem; flex-shrink: 0; }
                </style>

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
                    <div class="ps-icon bg-purple bg-opacity-10" style="background: rgba(111,66,193,0.1); color: #6f42c1;"><i class="bi bi-shield-lock"></i></div>
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
                    <div class="ps-icon" style="background: rgba(111,66,193,0.1); color: #6f42c1;"><i class="bi bi-file-earmark-lock"></i></div>
                    <div class="ps-info">
                        <div class="ps-title">Recovery Codes</div>
                        <div class="ps-desc">Backup codes for when you lose your authenticator</div>
                    </div>
                    <i class="bi bi-chevron-right ps-chevron"></i>
                </div>
                {{/model.requires_mfa|bool}}

                <div class="ps-section-label">Sessions</div>

                <div class="ps-item" data-action="revoke-all-sessions">
                    <div class="ps-icon" style="background: rgba(220,53,69,0.1); color: #dc3545;"><i class="bi bi-box-arrow-right"></i></div>
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
                <style>
                    .pk-row { display: flex; align-items: center; gap: 0.75rem; padding: 0.65rem 0.75rem; border: 1px solid #f0f0f0; border-radius: 8px; margin-bottom: 0.4rem; }
                    .pk-icon { width: 32px; height: 32px; background: #e7f1ff; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #0d6efd; font-size: 0.9rem; flex-shrink: 0; }
                    .pk-info { flex: 1; min-width: 0; }
                    .pk-name { font-weight: 600; font-size: 0.85rem; }
                    .pk-meta { font-size: 0.73rem; color: #6c757d; }
                    .pk-actions { display: flex; gap: 0.25rem; }
                    .pk-actions .btn { padding: 0.2rem 0.4rem; font-size: 0.75rem; }
                    .pk-empty { text-align: center; padding: 2rem 1rem; color: #6c757d; }
                    .pk-empty i { font-size: 2rem; color: #ced4da; display: block; margin-bottom: 0.5rem; }
                </style>
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
                await Dialog.showModelForm({
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
            const confirmed = await Dialog.confirm('Delete this passkey? You won\'t be able to use it to sign in anymore.', 'Delete Passkey');
            if (confirmed) {
                const passkey = items.find(p => String(p.id) === String(id));
                if (passkey) {
                    await passkey.destroy();
                    this.getApp()?.toast?.success('Passkey deleted');
                }
            }
            return true;
        };

        const result = await Dialog.showDialog({
            title: 'Passkeys',
            body: view,
            size: 'md',
            buttons: [
                { text: 'Add Passkey', icon: 'bi-plus-lg', class: 'btn-primary', value: 'add' },
                { text: 'Close', class: 'btn-outline-secondary', dismiss: true }
            ]
        });

        if (result === 'add') {
            const added = await this._registerPasskey();
            if (added) {
                this.getApp()?.toast?.success('Passkey registered successfully');
            }
        }
        return true;
    }

    _base64urlToBytes(base64url) {
        const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
        return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
    }

    async _registerPasskey() {
        try {
            const beginResp = await Passkey.registerBegin();
            if (!beginResp.success || !beginResp.data) {
                this.getApp()?.toast?.error('Failed to start passkey registration');
                return;
            }

            const options = beginResp.data.data || beginResp.data;
            const publicKey = options.publicKey;

            // Override rp.id to match current domain (server may return production domain)
            if (publicKey.rp) {
                publicKey.rp.id = window.location.hostname;
            }

            if (publicKey.challenge && typeof publicKey.challenge === 'string') {
                publicKey.challenge = this._base64urlToBytes(publicKey.challenge);
            }
            if (publicKey.user && publicKey.user.id && typeof publicKey.user.id === 'string') {
                publicKey.user.id = this._base64urlToBytes(publicKey.user.id);
            }
            if (publicKey.excludeCredentials) {
                publicKey.excludeCredentials = publicKey.excludeCredentials.map(cred => ({
                    ...cred,
                    id: typeof cred.id === 'string' ? this._base64urlToBytes(cred.id) : cred.id
                }));
            }

            const credential = await navigator.credentials.create({ publicKey });
            if (!credential) {
                this.getApp()?.toast?.error('Passkey creation was cancelled');
                return;
            }

            const friendlyName = await Dialog.prompt('Name this passkey:', 'Passkey Name', {
                defaultValue: '',
                placeholder: 'e.g., My MacBook'
            });

            const credentialData = {
                id: credential.id,
                rawId: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
                type: credential.type,
                response: {
                    clientDataJSON: btoa(String.fromCharCode(...new Uint8Array(credential.response.clientDataJSON))),
                    attestationObject: btoa(String.fromCharCode(...new Uint8Array(credential.response.attestationObject)))
                }
            };

            if (credential.response.getTransports) {
                credentialData.transports = credential.response.getTransports();
            }

            const completeResp = await Passkey.registerComplete({
                challenge_id: options.challenge_id,
                credential: credentialData,
                friendly_name: friendlyName || 'My Passkey'
            });

            if (completeResp.success) {
                return true;
            } else {
                this.getApp()?.toast?.error(completeResp.error || 'Failed to register passkey');
                return false;
            }
        } catch (err) {
            if (err.name === 'NotAllowedError') {
                this.getApp()?.toast?.error('Passkey creation was blocked or cancelled. Check your browser settings if this persists.');
                return false;
            }
            if (err.name === 'SecurityError') {
                this.getApp()?.toast?.error('Passkeys are not supported on this domain');
            } else {
                console.error('Passkey registration error:', err);
                this.getApp()?.toast?.error('Passkey registration failed');
            }
            return false;
        }
    }

    async onActionManageTotp() {
        const app = this.getApp();
        const isMfaEnabled = this.model.get('requires_mfa');

        if (isMfaEnabled) {
            // Already enabled — offer to disable
            const confirmed = await Dialog.confirm(
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
                    <p style="font-size: 0.85rem; color: #6c757d; margin-bottom: 1rem;">
                        Scan this QR code with your authenticator app (Google Authenticator, Authy, 1Password, etc.)
                    </p>
                    <img src="{{{qrCode}}}" alt="TOTP QR Code" style="width: 200px; height: 200px; margin: 0 auto; display: block; border: 1px solid #e9ecef; border-radius: 8px; padding: 8px;" />
                    <div style="margin-top: 1rem;">
                        <p style="font-size: 0.75rem; color: #adb5bd; margin-bottom: 0.25rem;">Or enter this key manually:</p>
                        <code style="font-size: 0.85rem; letter-spacing: 0.1em; user-select: all; padding: 0.35rem 0.75rem; background: #f8f9fa; border-radius: 4px;">{{secret}}</code>
                    </div>
                </div>
            `
        });
        setupView.qrCode = qr_code;
        setupView.secret = secret;

        const result = await Dialog.showDialog({
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
        const code = await Dialog.prompt(
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
                <style>
                    .rc-info { font-size: 0.82rem; color: #6c757d; margin-bottom: 1rem; }
                    .rc-remaining { font-weight: 600; color: #495057; }
                    .rc-list { display: grid; grid-template-columns: 1fr 1fr; gap: 0.3rem; }
                    .rc-code { font-family: monospace; font-size: 0.85rem; padding: 0.35rem 0.6rem; background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 4px; text-align: center; }
                </style>
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

        const result = await Dialog.showDialog({
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
            const code = await Dialog.prompt(
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
                        <style>
                            .rc-warning { padding: 0.65rem 0.85rem; background: #fff3cd; border: 1px solid #ffecb5; border-radius: 6px; margin-bottom: 1rem; font-size: 0.8rem; color: #664d03; }
                            .rc-new-list { display: grid; grid-template-columns: 1fr 1fr; gap: 0.3rem; margin-bottom: 1rem; }
                            .rc-new-code { font-family: monospace; font-size: 0.85rem; padding: 0.35rem 0.6rem; background: #d1e7dd; border: 1px solid #badbcc; border-radius: 4px; text-align: center; }
                        </style>
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

                await Dialog.showDialog({
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

        const confirmed = await Dialog.confirm(
            'This will sign you out of all other devices and sessions. Your current session will remain active. This cannot be undone.',
            'Revoke All Sessions'
        );
        if (!confirmed) return true;

        const password = await Dialog.prompt(
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
