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

                <div class="detail-section-eyebrow">Multi-Factor Authentication</div>

                <div class="admin-security-item" data-action="toggle-mfa">
                    <div class="admin-security-icon" style="background: rgba(var(--bs-purple-rgb,111,66,193),0.1); color: var(--bs-purple, #6f42c1);"><i class="bi bi-shield-lock"></i></div>
                    <div class="admin-security-info">
                        <div class="admin-security-title">MFA Requirement</div>
                        <div class="admin-security-desc">
                            {{#model.requires_mfa|bool}}User is required to use MFA{{/model.requires_mfa|bool}}
                            {{^model.requires_mfa|bool}}MFA is not required for this user{{/model.requires_mfa|bool}}
                        </div>
                    </div>
                    {{#model.requires_mfa|bool}}<span class="badge text-bg-success">Required</span>{{/model.requires_mfa|bool}}
                    {{^model.requires_mfa|bool}}<span class="badge text-bg-light border">Not required</span>{{/model.requires_mfa|bool}}
                </div>

                <div class="admin-security-item{{#totpEnabled|bool}} admin-security-item-clickable{{/totpEnabled|bool}}"{{#totpEnabled|bool}} data-action="disable-totp"{{/totpEnabled|bool}}>
                    <div class="admin-security-icon" style="background: rgba(var(--bs-purple-rgb,111,66,193),0.1); color: var(--bs-purple, #6f42c1);"><i class="bi bi-key"></i></div>
                    <div class="admin-security-info">
                        <div class="admin-security-title">Authenticator (TOTP)</div>
                        <div class="admin-security-desc">
                            {{#totpEnabled|bool}}User has an authenticator app enrolled — click to disable{{/totpEnabled|bool}}
                            {{^totpEnabled|bool}}User has not enrolled an authenticator app{{/totpEnabled|bool}}
                        </div>
                    </div>
                    {{#totpEnabled|bool}}<span class="badge text-bg-success">Enrolled</span>{{/totpEnabled|bool}}
                    {{^totpEnabled|bool}}<span class="badge text-bg-light border">Not enrolled</span>{{/totpEnabled|bool}}
                </div>

                <div class="admin-security-item">
                    <div class="admin-security-icon bg-info bg-opacity-10 text-info"><i class="bi bi-phone"></i></div>
                    <div class="admin-security-info">
                        <div class="admin-security-title">SMS Verification</div>
                        <div class="admin-security-desc">
                            {{#smsEligible|bool}}Verified phone available — SMS-based MFA can be used{{/smsEligible|bool}}
                            {{^smsEligible|bool}}No verified phone on file — SMS-based MFA unavailable{{/smsEligible|bool}}
                        </div>
                    </div>
                    {{#smsEligible|bool}}<span class="badge text-bg-success">Eligible</span>{{/smsEligible|bool}}
                    {{^smsEligible|bool}}<span class="badge text-bg-light border">Unavailable</span>{{/smsEligible|bool}}
                </div>

                <div class="admin-security-item admin-security-item-clickable" data-action="manage-passkeys">
                    <div class="admin-security-icon bg-success bg-opacity-10 text-success"><i class="bi bi-fingerprint"></i></div>
                    <div class="admin-security-info">
                        <div class="admin-security-title">Passkeys</div>
                        <div class="admin-security-desc">View and manage registered passkeys</div>
                    </div>
                    {{#hasPasskey|bool}}<span class="badge text-bg-success me-2">Registered</span>{{/hasPasskey|bool}}
                    <i class="bi bi-chevron-right admin-security-chevron"></i>
                </div>

                {{#totpEnabled|bool}}
                <div class="admin-security-item admin-security-item-clickable" data-action="view-recovery-codes">
                    <div class="admin-security-icon" style="background: rgba(var(--bs-purple-rgb,111,66,193),0.1); color: var(--bs-purple, #6f42c1);"><i class="bi bi-file-earmark-lock"></i></div>
                    <div class="admin-security-info">
                        <div class="admin-security-title">Recovery Codes</div>
                        <div class="admin-security-desc">View remaining recovery codes</div>
                    </div>
                    <i class="bi bi-chevron-right admin-security-chevron"></i>
                </div>
                {{/totpEnabled|bool}}

                <div class="detail-section-eyebrow">Sessions</div>

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

    // ── Computed properties (Mustache reads them off `this`) ────

    /**
     * True if the user has an enrolled authenticator app. Defensive
     * against several possible field shapes — backend may expose this
     * as `has_totp` (User extra in `full` graph), `totp_enabled`, or
     * via a nested `totp.is_enabled` block.
     */
    get totpEnabled() {
        const m = this.model;
        return !!(
            m?.get?.('has_totp') ||
            m?.get?.('totp_enabled') ||
            m?.get?.('totp')?.is_enabled
        );
    }

    /** True if the user has a verified phone number — SMS-MFA prerequisite. */
    get smsEligible() {
        const m = this.model;
        return !!(m?.get?.('phone_number') && m?.get?.('is_phone_verified'));
    }

    /** True if any passkey is registered (`has_passkey` is a User extra in the `full` graph). */
    get hasPasskey() {
        return !!this.model?.get?.('has_passkey');
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
            'Disable the authenticator app for this user? Their existing TOTP enrollment will be removed and they will need to re-enroll if they want to use one again.',
            'Disable Authenticator'
        );
        if (!confirmed) return true;

        const resp = await rest.DELETE(`/api/user/${this.model.id}/totp`);
        if (resp.success) {
            // Clear the local flags the template binds to so the row updates
            // without a full model refetch. Defensive — the field name varies
            // across User-graph variants (see the totpEnabled getter).
            this.model.set('has_totp', false);
            this.model.set('totp_enabled', false);
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
