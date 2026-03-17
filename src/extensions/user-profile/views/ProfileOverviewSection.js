/**
 * ProfileOverviewSection - Profile overview tab
 *
 * Shows avatar, contact, personal info, account status, and permissions peek.
 * Editable: display name, timezone, avatar.
 * Verification actions for email/phone.
 *
 * Full user graph fields used:
 *   id, username, email, phone_number, display_name, first_name, last_name,
 *   avatar, org (int), permissions, is_active, is_superuser, is_staff,
 *   is_email_verified, is_phone_verified, requires_mfa, timezone,
 *   last_login, last_activity, date_joined
 */
import View from '@core/View.js';
import Dialog from '@core/views/feedback/Dialog.js';
import rest from '@core/Rest.js';
import { User } from '@core/models/User.js';

export default class ProfileOverviewSection extends View {
    constructor(options = {}) {
        super({
            className: 'profile-overview-section',
            template: `
                <style>
                    .po-section-label { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #adb5bd; margin-bottom: 0.5rem; margin-top: 1.75rem; }
                    .po-section-label:first-child { margin-top: 0; }
                    .po-field-row { display: flex; align-items: center; padding: 0.6rem 0; border-bottom: 1px solid #f0f0f0; }
                    .po-field-row:last-child { border-bottom: none; }
                    .po-field-label { width: 130px; font-size: 0.8rem; color: #6c757d; flex-shrink: 0; }
                    .po-field-value { flex: 1; font-size: 0.88rem; color: #212529; display: flex; align-items: center; gap: 0.4rem; }
                    .po-field-action { color: #6c757d; cursor: pointer; font-size: 0.8rem; margin-left: auto; padding: 0.15rem 0.4rem; border-radius: 4px; background: none; border: none; }
                    .po-field-action:hover { background: #f0f0f0; color: #0d6efd; }
                    .po-badge-warn { font-size: 0.65rem; padding: 0.15em 0.45em; background: #fff3cd; color: #856404; border-radius: 3px; }
                    .po-badge-ok { font-size: 0.65rem; padding: 0.15em 0.45em; background: #d1e7dd; color: #0f5132; border-radius: 3px; }
                    .po-badge-muted { font-size: 0.65rem; padding: 0.15em 0.45em; background: #f0f0f0; color: #6c757d; border-radius: 3px; }
                    .po-not-set { color: #adb5bd; font-style: italic; font-size: 0.85rem; }
                    .po-perm-pill { display: inline-block; font-size: 0.72rem; padding: 0.2em 0.55em; background: #e7f1ff; color: #0d6efd; border-radius: 3px; margin: 0.1rem; }
                    .po-perm-more { font-size: 0.72rem; color: #6c757d; cursor: pointer; }
                    .po-perm-more:hover { color: #0d6efd; text-decoration: underline; }
                </style>

                <!-- Contact -->
                <div class="po-section-label">Contact</div>
                <div class="po-field-row">
                    <div class="po-field-label">Email</div>
                    <div class="po-field-value">
                        {{model.email}}
                        {{#model.is_email_verified|bool}}
                            <span class="po-badge-ok">Verified</span>
                        {{/model.is_email_verified|bool}}
                        {{^model.is_email_verified|bool}}
                            <span class="po-badge-warn">Unverified</span>
                        {{/model.is_email_verified|bool}}
                    </div>
                    {{^model.is_email_verified|bool}}
                        <button type="button" class="po-field-action" data-action="verify-email" title="Send verification email"><i class="bi bi-envelope-check"></i></button>
                    {{/model.is_email_verified|bool}}
                    <button type="button" class="po-field-action" data-action="update-email" title="Change email"><i class="bi bi-pencil"></i></button>
                </div>
                <div class="po-field-row">
                    <div class="po-field-label">Phone</div>
                    <div class="po-field-value">
                        {{#hasPhone|bool}}
                            {{model.phone_number}}
                            {{#model.is_phone_verified|bool}}
                                <span class="po-badge-ok">Verified</span>
                            {{/model.is_phone_verified|bool}}
                            {{^model.is_phone_verified|bool}}
                                <span class="po-badge-warn">Unverified</span>
                            {{/model.is_phone_verified|bool}}
                        {{/hasPhone|bool}}
                        {{^hasPhone|bool}}
                            <span class="po-not-set">Not set</span>
                        {{/hasPhone|bool}}
                    </div>
                    {{^hasPhone|bool}}
                        <button type="button" class="po-field-action" data-action="add-phone" title="Add phone number"><i class="bi bi-plus"></i></button>
                    {{/hasPhone|bool}}
                    {{#hasPhone|bool}}
                        {{^model.is_phone_verified|bool}}
                            <button type="button" class="po-field-action" data-action="verify-phone" title="Send verification"><i class="bi bi-phone-vibrate"></i></button>
                        {{/model.is_phone_verified|bool}}
                        <button type="button" class="po-field-action" data-action="update-phone" title="Change phone number"><i class="bi bi-pencil"></i></button>
                        <button type="button" class="po-field-action" data-action="remove-phone" title="Remove phone number"><i class="bi bi-x-lg"></i></button>
                    {{/hasPhone|bool}}
                </div>

                <!-- Account -->
                <div class="po-section-label">Account</div>
                <div class="po-field-row">
                    <div class="po-field-label">Username</div>
                    <div class="po-field-value">{{model.username}}</div>
                </div>
                <div class="po-field-row">
                    <div class="po-field-label">Status</div>
                    <div class="po-field-value">
                        {{#model.is_active|bool}}<span class="po-badge-ok">Active</span>{{/model.is_active|bool}}
                        {{^model.is_active|bool}}<span class="po-badge-warn">Inactive</span>{{/model.is_active|bool}}
                    </div>
                </div>
                <div class="po-field-row">
                    <div class="po-field-label">Role</div>
                    <div class="po-field-value">
                        {{roleLabel}}
                        {{#model.is_staff|bool}}<span class="po-badge-muted">Staff</span>{{/model.is_staff|bool}}
                    </div>
                </div>
                <div class="po-field-row">
                    <div class="po-field-label">MFA</div>
                    <div class="po-field-value">
                        {{#model.requires_mfa|bool}}<span class="po-badge-ok">Required</span>{{/model.requires_mfa|bool}}
                        {{^model.requires_mfa|bool}}<span class="po-badge-muted">Not required</span>{{/model.requires_mfa|bool}}
                    </div>
                </div>
                <div class="po-field-row">
                    <div class="po-field-label">Member Since</div>
                    <div class="po-field-value">{{model.date_joined|date}}</div>
                </div>
                <div class="po-field-row">
                    <div class="po-field-label">Last Login</div>
                    <div class="po-field-value">{{model.last_login|relative}}</div>
                </div>


                <!-- Danger zone -->
                <div style="margin-top: 2.5rem; padding-top: 1rem; border-top: 1px solid #f0f0f0;">
                    <button type="button" class="btn btn-link text-danger p-0" style="font-size: 0.8rem; text-decoration: none;" data-action="deactivate-account">
                        <i class="bi bi-exclamation-triangle me-1"></i>Deactivate Account
                    </button>
                </div>
            `,
            ...options
        });
    }

    get hasPhone() {
        return !!(this.model && this.model.get('phone_number'));
    }

    get roleLabel() {
        if (!this.model) return 'User';
        if (this.model.get('is_superuser')) return 'Superuser';
        return 'User';
    }

    get permissionPeek() {
        if (!this.model) return null;
        const perms = this.model.get('permissions');
        if (!perms) return null;

        const permMap = {};
        User.PERMISSIONS.forEach(p => { permMap[p.name] = p.label; });

        const active = Object.keys(perms)
            .filter(k => perms[k] === true)
            .map(k => permMap[k] || k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));

        if (active.length === 0) return null;

        const PEEK_COUNT = 5;
        return {
            items: active.slice(0, PEEK_COUNT),
            remaining: Math.max(0, active.length - PEEK_COUNT)
        };
    }

    get hasActiveGroup() {
        const app = this.getApp();
        return !!(app?.activeGroup && this.model?.member);
    }

    get activeGroupName() {
        const app = this.getApp();
        return app?.activeGroup?.get('name') || app?.activeGroup?.get('display_name') || 'Current Group';
    }

    get groupPermissionPeek() {
        if (!this.model?.member) return null;
        const perms = this.model.member.get('permissions');
        if (!perms) return null;

        const active = Object.keys(perms)
            .filter(k => perms[k] === true)
            .map(k => k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));

        if (active.length === 0) return null;

        const PEEK_COUNT = 5;
        return {
            items: active.slice(0, PEEK_COUNT),
            remaining: Math.max(0, active.length - PEEK_COUNT)
        };
    }

    async onActionDeactivateAccount() {
        const app = this.getApp();
        const confirmed = await Dialog.confirm(
            'Are you sure you want to deactivate your account? A confirmation email will be sent to complete the process. This action cannot be undone.',
            'Deactivate Account'
        );
        if (!confirmed) return true;

        const resp = await rest.POST('/api/account/deactivate');
        if (resp.success) {
            app?.toast?.success('A confirmation email has been sent. Follow the link to complete deactivation.');
        } else {
            app?.toast?.error(resp.message || 'Failed to request deactivation');
        }
        return true;
    }

    async onActionVerifyEmail() {
        const app = this.getApp();
        const email = this.model.get('email');

        // Step 1: Send verification code
        const sendResp = await rest.POST('/api/auth/verify/email/send', { method: 'code' });
        if (!sendResp.success) {
            app?.toast?.error(sendResp.message || 'Failed to send verification code');
            return true;
        }

        // Step 2: Prompt for code
        const code = await Dialog.prompt(
            `Enter the 6-digit code sent to <strong>${email}</strong>`,
            'Verify Email',
            { placeholder: '000000' }
        );
        if (!code) return true;

        // Step 3: Confirm
        const confirmResp = await rest.POST('/api/auth/verify/email/confirm', { code: code.trim() });
        if (confirmResp.success) {
            app?.toast?.success('Email verified');
            this.model.set('is_email_verified', true);
            await this.render();
        } else {
            app?.toast?.error(confirmResp.message || 'Invalid or expired code');
        }
        return true;
    }

    async onActionVerifyPhone() {
        const app = this.getApp();
        const phone = this.model.get('phone_number');

        // Step 1: Send verification code
        const sendResp = await rest.POST('/api/auth/verify/phone/send');
        if (!sendResp.success) {
            app?.toast?.error(sendResp.message || 'Failed to send verification code');
            return true;
        }

        // Step 2: Prompt for code
        const code = await Dialog.prompt(
            `Enter the 6-digit code sent to <strong>${phone}</strong>`,
            'Verify Phone',
            { placeholder: '000000' }
        );
        if (!code) return true;

        // Step 3: Confirm
        const confirmResp = await rest.POST('/api/auth/verify/phone/confirm', { code: code.trim() });
        if (confirmResp.success) {
            app?.toast?.success('Phone verified');
            this.model.set('is_phone_verified', true);
            await this.render();
        } else {
            app?.toast?.error(confirmResp.message || 'Invalid or expired code');
        }
        return true;
    }

    async onActionAddPhone() {
        const app = this.getApp();

        // Step 1: Collect phone number
        const phone = await Dialog.prompt(
            'Enter your phone number:',
            'Add Phone Number',
            { placeholder: '(415) 555-0123' }
        );
        if (!phone || !phone.trim()) return true;

        // Step 2: Save to profile
        const saveResp = await this.model.save({ phone_number: phone.trim() });
        if (saveResp.status !== 200) {
            app?.toast?.error(saveResp.message || 'Failed to save phone number');
            return true;
        }

        // Step 3: Send verification code
        const sendResp = await rest.POST('/api/auth/verify/phone/send');
        if (!sendResp.success) {
            app?.toast?.error(sendResp.message || 'Failed to send verification code');
            await this.render();
            return true;
        }

        // Step 4: Prompt for code
        const code = await Dialog.prompt(
            `Enter the 6-digit code sent to <strong>${phone.trim()}</strong>`,
            'Verify Phone',
            { placeholder: '000000' }
        );
        if (!code) {
            await this.render();
            return true;
        }

        // Step 5: Confirm
        const confirmResp = await rest.POST('/api/auth/verify/phone/confirm', { code: code.trim() });
        if (confirmResp.success) {
            app?.toast?.success('Phone number added and verified');
            this.model.set('is_phone_verified', true);
            await this.render();
        } else {
            app?.toast?.error(confirmResp.message || 'Invalid or expired code');
            await this.render();
        }
        return true;
    }

    async onActionRemovePhone() {
        const app = this.getApp();
        const confirmed = await Dialog.confirm(
            'Remove your phone number? You will need to add it again to use phone-based verification.',
            'Remove Phone'
        );
        if (!confirmed) return true;

        const resp = await this.model.save({ phone_number: null });
        if (resp.status === 200) {
            app?.toast?.success('Phone number removed');
            this.model.set('is_phone_verified', false);
            await this.render();
        } else {
            app?.toast?.error(resp.message || 'Failed to remove phone number');
        }
        return true;
    }

    async onActionNavigate(event, el) {
        // Bubble up to parent UserProfileView
        if (this.parent && this.parent.onActionNavigate) {
            return this.parent.onActionNavigate(event, el);
        }
        return true;
    }
}
