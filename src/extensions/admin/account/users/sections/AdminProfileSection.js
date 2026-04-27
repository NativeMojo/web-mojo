/**
 * AdminProfileSection - Contact, verification overrides, and account overview
 *
 * Admin can view/edit contact info (email, phone), override verification
 * status, and see account metadata (username, status, role, MFA, dates).
 * Uses model.save() against /api/user/<id> (admin endpoint).
 */
import View from '@core/View.js';
import Modal from '@core/views/feedback/Modal.js';

export default class AdminProfileSection extends View {
    constructor(options = {}) {
        super({
            className: 'admin-profile-section',
            template: `
                <style>
                    .ap-section-label { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #adb5bd; margin-bottom: 0.5rem; margin-top: 1.75rem; }
                    .ap-section-label:first-child { margin-top: 0; }
                    .ap-field-row { display: flex; align-items: center; padding: 0.6rem 0; border-bottom: 1px solid #f0f0f0; }
                    .ap-field-row:last-child { border-bottom: none; }
                    .ap-field-label { width: 140px; font-size: 0.8rem; color: #6c757d; flex-shrink: 0; }
                    .ap-field-value { flex: 1; font-size: 0.88rem; color: #212529; display: flex; align-items: center; gap: 0.4rem; }
                    .ap-field-action { color: #6c757d; cursor: pointer; font-size: 0.8rem; margin-left: auto; padding: 0.15rem 0.4rem; border-radius: 4px; background: none; border: none; }
                    .ap-field-action:hover { background: #f0f0f0; color: #0d6efd; }
                    .ap-badge-ok { font-size: 0.65rem; padding: 0.15em 0.45em; background: #d1e7dd; color: #0f5132; border-radius: 3px; }
                    .ap-badge-warn { font-size: 0.65rem; padding: 0.15em 0.45em; background: #fff3cd; color: #856404; border-radius: 3px; }
                    .ap-badge-muted { font-size: 0.65rem; padding: 0.15em 0.45em; background: #f0f0f0; color: #6c757d; border-radius: 3px; }
                    .ap-not-set { color: #adb5bd; font-style: italic; font-size: 0.85rem; }
                </style>

                <!-- Contact & Verification -->
                <div class="ap-section-label">Contact & Verification</div>
                <div class="ap-field-row">
                    <div class="ap-field-label">Email</div>
                    <div class="ap-field-value">
                        {{model.email}}
                        {{#model.is_email_verified|bool}}
                            <span class="ap-badge-ok">Verified</span>
                        {{/model.is_email_verified|bool}}
                        {{^model.is_email_verified|bool}}
                            <span class="ap-badge-warn">Unverified</span>
                        {{/model.is_email_verified|bool}}
                    </div>
                    {{#model.is_email_verified|bool}}
                        <button type="button" class="ap-field-action" data-action="unverify-email" title="Mark as unverified"><i class="bi bi-x-circle"></i></button>
                    {{/model.is_email_verified|bool}}
                    {{^model.is_email_verified|bool}}
                        <button type="button" class="ap-field-action" data-action="force-verify-email" title="Force verify"><i class="bi bi-patch-check"></i></button>
                    {{/model.is_email_verified|bool}}
                    <button type="button" class="ap-field-action" data-action="change-email" title="Change email"><i class="bi bi-pencil"></i></button>
                </div>
                <div class="ap-field-row">
                    <div class="ap-field-label">Phone</div>
                    <div class="ap-field-value">
                        {{#hasPhone|bool}}
                            {{model.phone_number}}
                            {{#model.is_phone_verified|bool}}
                                <span class="ap-badge-ok">Verified</span>
                            {{/model.is_phone_verified|bool}}
                            {{^model.is_phone_verified|bool}}
                                <span class="ap-badge-warn">Unverified</span>
                            {{/model.is_phone_verified|bool}}
                        {{/hasPhone|bool}}
                        {{^hasPhone|bool}}
                            <span class="ap-not-set">Not set</span>
                        {{/hasPhone|bool}}
                    </div>
                    {{#hasPhone|bool}}
                        {{#model.is_phone_verified|bool}}
                            <button type="button" class="ap-field-action" data-action="unverify-phone" title="Mark as unverified"><i class="bi bi-x-circle"></i></button>
                        {{/model.is_phone_verified|bool}}
                        {{^model.is_phone_verified|bool}}
                            <button type="button" class="ap-field-action" data-action="force-verify-phone" title="Force verify"><i class="bi bi-patch-check"></i></button>
                        {{/model.is_phone_verified|bool}}
                        <button type="button" class="ap-field-action" data-action="change-phone" title="Change phone"><i class="bi bi-pencil"></i></button>
                        <button type="button" class="ap-field-action" data-action="remove-phone" title="Remove phone"><i class="bi bi-x-lg"></i></button>
                    {{/hasPhone|bool}}
                    {{^hasPhone|bool}}
                        <button type="button" class="ap-field-action" data-action="set-phone" title="Set phone number"><i class="bi bi-plus"></i></button>
                    {{/hasPhone|bool}}
                </div>

                <!-- Account -->
                <div class="ap-section-label">Account</div>
                <div class="ap-field-row">
                    <div class="ap-field-label">Username</div>
                    <div class="ap-field-value">{{model.username}}</div>
                    <button type="button" class="ap-field-action" data-action="edit-username" title="Edit"><i class="bi bi-pencil"></i></button>
                </div>
                <div class="ap-field-row">
                    <div class="ap-field-label">Status</div>
                    <div class="ap-field-value">
                        {{#model.is_active|bool}}<span class="ap-badge-ok">Active</span>{{/model.is_active|bool}}
                        {{^model.is_active|bool}}<span class="ap-badge-warn">Inactive</span>{{/model.is_active|bool}}
                    </div>
                </div>
                <div class="ap-field-row">
                    <div class="ap-field-label">Role</div>
                    <div class="ap-field-value">
                        {{roleLabel}}
                        {{#model.is_staff|bool}}<span class="ap-badge-muted">Staff</span>{{/model.is_staff|bool}}
                    </div>
                </div>
                <div class="ap-field-row">
                    <div class="ap-field-label">MFA</div>
                    <div class="ap-field-value">
                        {{#model.requires_mfa|bool}}<span class="ap-badge-ok">Required</span>{{/model.requires_mfa|bool}}
                        {{^model.requires_mfa|bool}}<span class="ap-badge-muted">Not required</span>{{/model.requires_mfa|bool}}
                    </div>
                </div>
                <div class="ap-field-row">
                    <div class="ap-field-label">Member Since</div>
                    <div class="ap-field-value">{{model.date_joined|date}}</div>
                </div>
                <div class="ap-field-row">
                    <div class="ap-field-label">Last Login</div>
                    <div class="ap-field-value">{{model.last_login|relative}}</div>
                </div>
            `,
            ...options
        });
    }

    // ── Computed properties ─────────────────────────

    get hasPhone() {
        return !!(this.model && this.model.get('phone_number'));
    }

    get roleLabel() {
        if (!this.model) return 'User';
        if (this.model.get('is_superuser')) return 'Superuser';
        return 'User';
    }

    // ── Verification overrides ──────────────────────

    async onActionForceVerifyEmail() {
        const confirmed = await Modal.confirm(
            `Mark <strong>${this.model.get('email')}</strong> as verified? This bypasses the normal verification flow.`,
            'Force Verify Email'
        );
        if (!confirmed) return true;
        await this._saveField({ is_email_verified: true }, 'Email marked as verified');
        return true;
    }

    async onActionUnverifyEmail() {
        const confirmed = await Modal.confirm(
            'Mark email as unverified? The user will need to re-verify their email.',
            'Unverify Email'
        );
        if (!confirmed) return true;
        await this._saveField({ is_email_verified: false }, 'Email marked as unverified');
        return true;
    }

    async onActionForceVerifyPhone() {
        const confirmed = await Modal.confirm(
            `Mark <strong>${this.model.get('phone_number')}</strong> as verified? This bypasses the normal verification flow.`,
            'Force Verify Phone'
        );
        if (!confirmed) return true;
        await this._saveField({ is_phone_verified: true }, 'Phone marked as verified');
        return true;
    }

    async onActionUnverifyPhone() {
        const confirmed = await Modal.confirm(
            'Mark phone as unverified? The user will need to re-verify their phone number.',
            'Unverify Phone'
        );
        if (!confirmed) return true;
        await this._saveField({ is_phone_verified: false }, 'Phone marked as unverified');
        return true;
    }

    // ── Contact editing ─────────────────────────────

    async onActionChangeEmail() {
        const email = await Modal.prompt(
            'Enter the new email address for this user:',
            'Change Email',
            { defaultValue: this.model.get('email') || '' }
        );
        if (email === null || !email.trim()) return true;
        await this._saveField({ email: email.trim() }, 'Email updated');
        return true;
    }

    async onActionChangePhone() {
        const phone = await Modal.prompt(
            'Enter the new phone number for this user:',
            'Change Phone',
            { defaultValue: this.model.get('phone_number') || '' }
        );
        if (phone === null || !phone.trim()) return true;
        await this._saveField({ phone_number: phone.trim() }, 'Phone number updated');
        return true;
    }

    async onActionSetPhone() {
        const phone = await Modal.prompt(
            'Enter a phone number for this user:',
            'Set Phone Number',
            { placeholder: '(415) 555-0123' }
        );
        if (!phone || !phone.trim()) return true;
        await this._saveField({ phone_number: phone.trim() }, 'Phone number added');
        return true;
    }

    async onActionRemovePhone() {
        const confirmed = await Modal.confirm(
            'Remove this user\'s phone number?',
            'Remove Phone'
        );
        if (!confirmed) return true;

        const resp = await this.model.save({ phone_number: null });
        if (resp.status === 200) {
            this.model.set('is_phone_verified', false);
            this.getApp()?.toast?.success('Phone number removed');
            await this.render();
        } else {
            this.getApp()?.toast?.error(resp.message || 'Failed to remove phone number');
        }
        return true;
    }

    async onActionEditUsername() {
        const username = await Modal.prompt(
            'Username:',
            'Edit Username',
            { defaultValue: this.model.get('username') || '' }
        );
        if (username !== null && username.trim()) {
            await this._saveField({ username: username.trim() }, 'Username updated');
        }
        return true;
    }

    // ── Helpers ─────────────────────────────────────

    async _saveField(fields, successMsg) {
        const resp = await this.model.save(fields);
        if (resp.status === 200) {
            this.getApp()?.toast?.success(successMsg);
            await this.render();
        } else {
            this.getApp()?.toast?.error(resp.message || 'Failed to save');
        }
    }
}
