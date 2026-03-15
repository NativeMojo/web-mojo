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
                    {{/hasPhone|bool}}
                </div>

                <!-- Personal -->
                <div class="po-section-label">Personal</div>
                <div class="po-field-row">
                    <div class="po-field-label">Display Name</div>
                    <div class="po-field-value">{{model.display_name}}</div>
                    <button type="button" class="po-field-action" data-action="edit-name"><i class="bi bi-pencil"></i></button>
                </div>
                {{#hasFullName|bool}}
                <div class="po-field-row">
                    <div class="po-field-label">Full Name</div>
                    <div class="po-field-value">{{fullName}}</div>
                </div>
                {{/hasFullName|bool}}
                <div class="po-field-row">
                    <div class="po-field-label">Timezone</div>
                    <div class="po-field-value">{{model.timezone|default:'Not set'}}</div>
                    <button type="button" class="po-field-action" data-action="edit-timezone"><i class="bi bi-pencil"></i></button>
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

                <!-- Permissions peek -->
                <div class="po-section-label">Permissions</div>
                <div class="po-perms-peek">
                    {{#permissionPeek}}
                        {{#items}}
                            <span class="po-perm-pill">{{.}}</span>
                        {{/items}}
                        {{#remaining|bool}}
                            <span class="po-perm-more" data-action="navigate" data-section="permissions">+{{remaining}} more</span>
                        {{/remaining|bool}}
                    {{/permissionPeek}}
                    {{^permissionPeek|bool}}
                        <span class="po-not-set">No permissions assigned</span>
                    {{/permissionPeek|bool}}
                </div>
            `,
            ...options
        });
    }

    get hasPhone() {
        return !!(this.model && this.model.get('phone_number'));
    }

    get hasFullName() {
        if (!this.model) return false;
        const first = this.model.get('first_name');
        const last = this.model.get('last_name');
        return !!(first || last);
    }

    get fullName() {
        if (!this.model) return '';
        const first = this.model.get('first_name') || '';
        const last = this.model.get('last_name') || '';
        return `${first} ${last}`.trim();
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

    async onActionEditName() {
        const name = await Dialog.prompt(
            'Enter your display name:',
            'Display Name',
            { defaultValue: this.model.get('display_name') || '' }
        );
        if (name !== null && name.trim()) {
            const resp = await this.model.save({ display_name: name.trim() });
            if (resp.status === 200) {
                this.getApp()?.toast?.success('Display name updated');
                await this.render();
            } else {
                this.getApp()?.toast?.error('Failed to update display name');
            }
        }
        return true;
    }

    async onActionEditTimezone() {
        const result = await Dialog.showForm({
            title: 'Change Timezone',
            fields: [{
                name: 'timezone',
                type: 'select',
                label: 'Timezone',
                columns: 12,
                options: [
                    { value: 'America/New_York', text: 'Eastern Time (ET)' },
                    { value: 'America/Chicago', text: 'Central Time (CT)' },
                    { value: 'America/Denver', text: 'Mountain Time (MT)' },
                    { value: 'America/Los_Angeles', text: 'Pacific Time (PT)' },
                    { value: 'America/Anchorage', text: 'Alaska Time (AKT)' },
                    { value: 'Pacific/Honolulu', text: 'Hawaii Time (HT)' },
                    { value: 'UTC', text: 'UTC' },
                    { value: 'Europe/London', text: 'London (GMT/BST)' },
                    { value: 'Europe/Paris', text: 'Paris (CET/CEST)' },
                    { value: 'Europe/Berlin', text: 'Berlin (CET/CEST)' },
                    { value: 'Asia/Tokyo', text: 'Tokyo (JST)' },
                    { value: 'Asia/Shanghai', text: 'Shanghai (CST)' },
                    { value: 'Australia/Sydney', text: 'Sydney (AEST)' }
                ]
            }],
            data: { timezone: this.model.get('timezone') || '' },
            size: 'sm'
        });

        if (result && result.submitted) {
            const resp = await this.model.save({ timezone: result.data.timezone });
            if (resp.status === 200) {
                this.getApp()?.toast?.success('Timezone updated');
                await this.render();
            } else {
                this.getApp()?.toast?.error('Failed to update timezone');
            }
        }
        return true;
    }

    async onActionVerifyEmail() {
        try {
            const resp = await rest.POST('/api/account/email/verify/send');
            if (resp.success) {
                this.getApp()?.toast?.success('Verification email sent');
            } else {
                this.getApp()?.toast?.error(resp.data?.error || 'Failed to send verification email');
            }
        } catch (err) {
            this.getApp()?.toast?.error('Failed to send verification email');
        }
        return true;
    }

    async onActionVerifyPhone() {
        try {
            const resp = await rest.POST('/api/account/phone/verify/send');
            if (resp.success) {
                this.getApp()?.toast?.success('Verification code sent');
            } else {
                this.getApp()?.toast?.error(resp.data?.error || 'Failed to send verification');
            }
        } catch (err) {
            this.getApp()?.toast?.error('Failed to send verification');
        }
        return true;
    }

    async onActionAddPhone() {
        this.getApp()?.toast?.info('Phone management coming soon');
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
