/**
 * AdminSecuritySection - Admin security management for a user
 *
 * Admin powers: force password reset, enable/disable MFA,
 * revoke all sessions, view/delete passkeys, view recovery codes.
 * Uses admin endpoints and model.save() against /api/user/<id>.
 */
import View from '@core/View.js';
import Modal from '@core/views/feedback/Modal.js';
import rest from '@core/Rest.js';
import { PasskeyList, PasskeyForms } from '@core/models/Passkeys.js';

export default class AdminSecuritySection extends View {
    constructor(options = {}) {
        super({
            className: 'admin-security-section',
            template: `
                <style>
                    .as-section-label { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #adb5bd; margin-bottom: 0.5rem; margin-top: 1.75rem; }
                    .as-section-label:first-child { margin-top: 0; }
                    .as-item { display: flex; align-items: center; gap: 0.85rem; padding: 0.85rem 1rem; border: 1px solid #f0f0f0; border-radius: 8px; margin-bottom: 0.5rem; cursor: pointer; transition: border-color 0.15s, background 0.15s; }
                    .as-item:hover { border-color: #dee2e6; background: #fafbfd; }
                    .as-icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1rem; flex-shrink: 0; }
                    .as-info { flex: 1; min-width: 0; }
                    .as-title { font-weight: 600; font-size: 0.88rem; }
                    .as-desc { font-size: 0.78rem; color: #6c757d; }
                    .as-badge { font-size: 0.72rem; padding: 0.15em 0.5em; border-radius: 3px; flex-shrink: 0; }
                    .as-chevron { color: #ced4da; font-size: 0.8rem; flex-shrink: 0; }
                </style>

                <div class="as-section-label">Authentication</div>

                <div class="as-item" data-action="send-password-reset">
                    <div class="as-icon bg-primary bg-opacity-10 text-primary"><i class="bi bi-envelope"></i></div>
                    <div class="as-info">
                        <div class="as-title">Send Password Reset</div>
                        <div class="as-desc">Send a password reset email to {{model.email}}</div>
                    </div>
                    <span class="as-badge bg-light text-muted border">Send</span>
                </div>

                <div class="as-item" data-action="send-magic-link">
                    <div class="as-icon" style="background: rgba(13,110,253,0.1); color: #0d6efd;"><i class="bi bi-link-45deg"></i></div>
                    <div class="as-info">
                        <div class="as-title">Send Magic Login Link</div>
                        <div class="as-desc">Send a one-click login link to {{model.email}}</div>
                    </div>
                    <span class="as-badge bg-light text-muted border">Send</span>
                </div>

                {{^model.is_email_verified|bool}}
                <div class="as-item" data-action="send-email-verification">
                    <div class="as-icon" style="background: rgba(25,135,84,0.1); color: #198754;"><i class="bi bi-envelope-check"></i></div>
                    <div class="as-info">
                        <div class="as-title">Send Email Verification</div>
                        <div class="as-desc">Send a verification email to {{model.email}}</div>
                    </div>
                    <span class="as-badge bg-light text-muted border">Send</span>
                </div>
                {{/model.is_email_verified|bool}}

                <div class="as-item" data-action="set-password">
                    <div class="as-icon bg-warning bg-opacity-10 text-warning"><i class="bi bi-key"></i></div>
                    <div class="as-info">
                        <div class="as-title">Set Password</div>
                        <div class="as-desc">Set a new password directly for this user</div>
                    </div>
                    <span class="as-badge bg-light text-muted border">Set</span>
                </div>

                <div class="as-section-label">Multi-Factor Authentication</div>

                <div class="as-item" data-action="toggle-mfa">
                    <div class="as-icon" style="background: rgba(111,66,193,0.1); color: #6f42c1;"><i class="bi bi-shield-lock"></i></div>
                    <div class="as-info">
                        <div class="as-title">MFA Requirement</div>
                        <div class="as-desc">
                            {{#model.requires_mfa|bool}}User is required to use MFA{{/model.requires_mfa|bool}}
                            {{^model.requires_mfa|bool}}MFA is not required for this user{{/model.requires_mfa|bool}}
                        </div>
                    </div>
                    {{#model.requires_mfa|bool}}
                        <span class="as-badge bg-success bg-opacity-10 text-success border">Enabled</span>
                    {{/model.requires_mfa|bool}}
                    {{^model.requires_mfa|bool}}
                        <span class="as-badge bg-light text-muted border">Disabled</span>
                    {{/model.requires_mfa|bool}}
                </div>

                <div class="as-item" data-action="manage-passkeys">
                    <div class="as-icon bg-success bg-opacity-10 text-success"><i class="bi bi-fingerprint"></i></div>
                    <div class="as-info">
                        <div class="as-title">Passkeys</div>
                        <div class="as-desc">View and manage registered passkeys</div>
                    </div>
                    <i class="bi bi-chevron-right as-chevron"></i>
                </div>

                {{#model.requires_mfa|bool}}
                <div class="as-item" data-action="view-recovery-codes">
                    <div class="as-icon" style="background: rgba(111,66,193,0.1); color: #6f42c1;"><i class="bi bi-file-earmark-lock"></i></div>
                    <div class="as-info">
                        <div class="as-title">Recovery Codes</div>
                        <div class="as-desc">View remaining recovery codes</div>
                    </div>
                    <i class="bi bi-chevron-right as-chevron"></i>
                </div>

                <div class="as-item" data-action="disable-totp">
                    <div class="as-icon" style="background: rgba(220,53,69,0.1); color: #dc3545;"><i class="bi bi-shield-x"></i></div>
                    <div class="as-info">
                        <div class="as-title">Disable Authenticator</div>
                        <div class="as-desc">Remove TOTP requirement for this user</div>
                    </div>
                </div>
                {{/model.requires_mfa|bool}}

                <div class="as-section-label">Sessions</div>

                <div class="as-item" data-action="revoke-all-sessions">
                    <div class="as-icon" style="background: rgba(220,53,69,0.1); color: #dc3545;"><i class="bi bi-box-arrow-right"></i></div>
                    <div class="as-info">
                        <div class="as-title">Revoke All Sessions</div>
                        <div class="as-desc">Force sign-out from all devices</div>
                    </div>
                </div>
            `,
            ...options
        });
    }

    // ── Password actions ────────────────────────────

    async onActionSendPasswordReset() {
        const app = this.getApp();
        const email = this.model.get('email');

        const confirmed = await Modal.confirm(
            `Send a password reset email to <strong>${email}</strong>?`,
            'Send Password Reset'
        );
        if (!confirmed) return true;

        const resp = await rest.POST('/api/auth/password/reset', { email });
        if (resp.success) {
            app?.toast?.success('Password reset email sent');
        } else {
            app?.toast?.error(resp.message || 'Failed to send password reset');
        }
        return true;
    }

    async onActionSendEmailVerification() {
        const app = this.getApp();
        const email = this.model.get('email');

        const confirmed = await Modal.confirm(
            `Send a verification email to <strong>${email}</strong>?`,
            'Send Email Verification'
        );
        if (!confirmed) return true;

        const resp = await rest.POST('/api/auth/email/verify', { email });
        if (resp.success) {
            app?.toast?.success('Verification email sent');
        } else {
            app?.toast?.error(resp.message || 'Failed to send verification email');
        }
        return true;
    }

    async onActionSendMagicLink() {
        const app = this.getApp();
        const email = this.model.get('email');

        const confirmed = await Modal.confirm(
            `Send a magic login link to <strong>${email}</strong>? They will be able to sign in with one click.`,
            'Send Magic Login Link'
        );
        if (!confirmed) return true;

        const resp = await rest.POST('/api/auth/magic-link', { email });
        if (resp.success) {
            app?.toast?.success('Magic login link sent');
        } else {
            app?.toast?.error(resp.message || 'Failed to send magic link');
        }
        return true;
    }

    async onActionSetPassword() {
        const app = this.getApp();
        const data = await Modal.form({
            title: 'Set Password',
            size: 'sm',
            fields: [
                { name: 'password', type: 'password', label: 'New Password', required: true, cols: 12, help: 'Set a new password for this user.' },
                { name: 'confirm', type: 'password', label: 'Confirm Password', required: true, cols: 12 }
            ]
        });
        if (!data) return true;

        if (data.password !== data.confirm) {
            app?.toast?.error('Passwords do not match');
            return true;
        }

        const resp = await this.model.save({ password: data.password });
        if (resp.status === 200) {
            app?.toast?.success('Password updated');
        } else {
            app?.toast?.error(resp.message || 'Failed to set password');
        }
        return true;
    }

    // ── MFA actions ─────────────────────────────────

    async onActionToggleMfa() {
        const app = this.getApp();
        const currentMfa = this.model.get('requires_mfa');
        const action = currentMfa ? 'disable' : 'enable';

        const confirmed = await Modal.confirm(
            `${currentMfa ? 'Disable' : 'Enable'} MFA requirement for this user?`,
            `${currentMfa ? 'Disable' : 'Enable'} MFA`
        );
        if (!confirmed) return true;

        const resp = await this.model.save({ requires_mfa: !currentMfa });
        if (resp.status === 200) {
            app?.toast?.success(`MFA ${action}d`);
            await this.render();
        } else {
            app?.toast?.error(resp.message || `Failed to ${action} MFA`);
        }
        return true;
    }

    async onActionDisableTotp() {
        const app = this.getApp();
        const confirmed = await Modal.confirm(
            'Disable the authenticator app for this user? They will no longer need a TOTP code to sign in.',
            'Disable Authenticator'
        );
        if (!confirmed) return true;

        const resp = await rest.DELETE(`/api/user/${this.model.id}/totp`);
        if (resp.success) {
            this.model.set('requires_mfa', false);
            app?.toast?.success('Authenticator disabled');
            await this.render();
        } else {
            app?.toast?.error(resp.message || 'Failed to disable authenticator');
        }
        return true;
    }

    async onActionManagePasskeys() {
        const collection = new PasskeyList({ params: { user: this.model.id } });
        try {
            await collection.fetch();
        } catch (e) {
            // ignore
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
                        No passkeys registered
                    </div>
                {{/passkeys|bool}}
            `
        });
        view.passkeys = items.map(p => p.toJSON ? p.toJSON() : p);

        view.onActionEditPasskey = async (event, el) => {
            const id = el.dataset.id;
            const passkey = items.find(p => String(p.id) === String(id));
            if (passkey) {
                await Modal.modelForm({ title: 'Edit Passkey', model: passkey, fields: PasskeyForms.edit.fields, size: 'sm' });
            }
            return true;
        };

        view.onActionDeletePasskey = async (event, el) => {
            const id = el.dataset.id;
            const confirmed = await Modal.confirm('Delete this passkey?', 'Delete Passkey');
            if (confirmed) {
                const passkey = items.find(p => String(p.id) === String(id));
                if (passkey) {
                    await passkey.destroy();
                    this.getApp()?.toast?.success('Passkey deleted');
                }
            }
            return true;
        };

        await Modal.dialog({
            title: 'Passkeys',
            body: view,
            size: 'md',
            buttons: [{ text: 'Close', class: 'btn-outline-secondary', dismiss: true }]
        });
        return true;
    }

    async onActionViewRecoveryCodes() {
        const app = this.getApp();
        const resp = await rest.GET(`/api/user/${this.model.id}/totp/recovery-codes`, {}, { dataOnly: true });
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
                <div class="rc-info"><span class="rc-remaining">{{remaining}}</span> recovery codes remaining</div>
                <div class="rc-list">
                    {{#codes}}<div class="rc-code">{{.}}</div>{{/codes}}
                </div>
            `
        });
        view.remaining = remaining;
        view.codes = codes || [];

        await Modal.dialog({
            title: 'Recovery Codes',
            body: view,
            size: 'sm',
            buttons: [{ text: 'Close', class: 'btn-outline-secondary', dismiss: true }]
        });
        return true;
    }

    // ── Session actions ─────────────────────────────

    async onActionRevokeAllSessions() {
        const app = this.getApp();
        const confirmed = await Modal.confirm(
            'Revoke all sessions for this user? They will be signed out of all devices immediately.',
            'Revoke All Sessions'
        );
        if (!confirmed) return true;

        const resp = await rest.POST(`/api/user/${this.model.id}/sessions/revoke`);
        if (resp.success) {
            app?.toast?.success('All sessions revoked');
        } else {
            app?.toast?.error(resp.message || 'Failed to revoke sessions');
        }
        return true;
    }
}
