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
                <div class="detail-section-eyebrow">Authentication</div>

                <div class="admin-security-item" data-action="send-password-reset">
                    <div class="admin-security-icon bg-primary bg-opacity-10 text-primary"><i class="bi bi-envelope"></i></div>
                    <div class="admin-security-info">
                        <div class="admin-security-title">Send Password Reset</div>
                        <div class="admin-security-desc">Send a password reset email to {{model.email}}</div>
                    </div>
                    <span class="badge text-bg-light border">Send</span>
                </div>

                <div class="admin-security-item" data-action="send-magic-link">
                    <div class="admin-security-icon bg-primary bg-opacity-10 text-primary"><i class="bi bi-link-45deg"></i></div>
                    <div class="admin-security-info">
                        <div class="admin-security-title">Send Magic Login Link</div>
                        <div class="admin-security-desc">Send a one-click login link to {{model.email}}</div>
                    </div>
                    <span class="badge text-bg-light border">Send</span>
                </div>

                {{^model.is_email_verified|bool}}
                <div class="admin-security-item" data-action="send-email-verification">
                    <div class="admin-security-icon bg-success bg-opacity-10 text-success"><i class="bi bi-envelope-check"></i></div>
                    <div class="admin-security-info">
                        <div class="admin-security-title">Send Email Verification</div>
                        <div class="admin-security-desc">Send a verification email to {{model.email}}</div>
                    </div>
                    <span class="badge text-bg-light border">Send</span>
                </div>
                {{/model.is_email_verified|bool}}

                <div class="admin-security-item" data-action="set-password">
                    <div class="admin-security-icon bg-warning bg-opacity-10 text-warning"><i class="bi bi-key"></i></div>
                    <div class="admin-security-info">
                        <div class="admin-security-title">Set Password</div>
                        <div class="admin-security-desc">Set a new password directly for this user</div>
                    </div>
                    <span class="badge text-bg-light border">Set</span>
                </div>

                <div class="detail-section-eyebrow mt-3">Multi-Factor Authentication</div>

                <div class="admin-security-item" data-action="toggle-mfa">
                    <div class="admin-security-icon" style="background: rgba(var(--bs-purple-rgb,111,66,193),0.1); color: var(--bs-purple, #6f42c1);"><i class="bi bi-shield-lock"></i></div>
                    <div class="admin-security-info">
                        <div class="admin-security-title">MFA Requirement</div>
                        <div class="admin-security-desc">
                            {{#model.requires_mfa|bool}}User is required to use MFA{{/model.requires_mfa|bool}}
                            {{^model.requires_mfa|bool}}MFA is not required for this user{{/model.requires_mfa|bool}}
                        </div>
                    </div>
                    {{#model.requires_mfa|bool}}<span class="badge text-bg-success">Enabled</span>{{/model.requires_mfa|bool}}
                    {{^model.requires_mfa|bool}}<span class="badge text-bg-light border">Disabled</span>{{/model.requires_mfa|bool}}
                </div>

                <div class="admin-security-item" data-action="manage-passkeys">
                    <div class="admin-security-icon bg-success bg-opacity-10 text-success"><i class="bi bi-fingerprint"></i></div>
                    <div class="admin-security-info">
                        <div class="admin-security-title">Passkeys</div>
                        <div class="admin-security-desc">View and manage registered passkeys</div>
                    </div>
                    <i class="bi bi-chevron-right admin-security-chevron"></i>
                </div>

                {{#model.requires_mfa|bool}}
                <div class="admin-security-item" data-action="view-recovery-codes">
                    <div class="admin-security-icon" style="background: rgba(var(--bs-purple-rgb,111,66,193),0.1); color: var(--bs-purple, #6f42c1);"><i class="bi bi-file-earmark-lock"></i></div>
                    <div class="admin-security-info">
                        <div class="admin-security-title">Recovery Codes</div>
                        <div class="admin-security-desc">View remaining recovery codes</div>
                    </div>
                    <i class="bi bi-chevron-right admin-security-chevron"></i>
                </div>

                <div class="admin-security-item" data-action="disable-totp">
                    <div class="admin-security-icon bg-danger bg-opacity-10 text-danger"><i class="bi bi-shield-x"></i></div>
                    <div class="admin-security-info">
                        <div class="admin-security-title">Disable Authenticator</div>
                        <div class="admin-security-desc">Remove TOTP requirement for this user</div>
                    </div>
                </div>
                {{/model.requires_mfa|bool}}

                <div class="detail-section-eyebrow mt-3">Sessions</div>

                <div class="admin-security-item" data-action="revoke-all-sessions">
                    <div class="admin-security-icon bg-danger bg-opacity-10 text-danger"><i class="bi bi-box-arrow-right"></i></div>
                    <div class="admin-security-info">
                        <div class="admin-security-title">Revoke All Sessions</div>
                        <div class="admin-security-desc">Force sign-out from all devices</div>
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
                {{#passkeys}}
                    <div class="admin-passkey-row">
                        <div class="admin-passkey-icon"><i class="bi bi-fingerprint"></i></div>
                        <div class="admin-passkey-info">
                            <div class="admin-passkey-name">{{.friendly_name|default:'Unnamed Passkey'}}</div>
                            <div class="admin-passkey-meta text-secondary">Created {{.created|date}} &middot; Last used {{.last_used|relative|default:'never'}} &middot; {{.sign_count}} uses</div>
                        </div>
                        <div class="admin-passkey-actions">
                            <button type="button" class="btn btn-sm btn-outline-secondary" data-action="edit-passkey" data-id="{{.id}}" title="Edit"><i class="bi bi-pencil"></i></button>
                            <button type="button" class="btn btn-sm btn-outline-danger" data-action="delete-passkey" data-id="{{.id}}" title="Delete"><i class="bi bi-trash"></i></button>
                        </div>
                    </div>
                {{/passkeys}}
                {{^passkeys|bool}}
                    <div class="admin-passkey-empty text-secondary">
                        <i class="bi bi-fingerprint"></i>
                        <div>No passkeys registered</div>
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
                <div class="admin-recovery-info text-secondary"><span class="admin-recovery-remaining">{{remaining}}</span> recovery codes remaining</div>
                <div class="admin-recovery-list">
                    {{#codes}}<div class="admin-recovery-code">{{.}}</div>{{/codes}}
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
