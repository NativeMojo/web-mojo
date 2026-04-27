/**
 * UserProfileView - Rich user profile shown in a Dialog
 *
 * Main container with left nav and section switching.
 * 11 sections: Profile, Personal, Security, Connected, Sessions, Devices,
 * Security Events, Notifications, API Keys, Groups, Permissions.
 * Fetches full user data on render.
 * Thin accent bar + compact header with avatar, name, and status badges.
 */
import View from '@core/View.js';
import Modal from '@core/views/feedback/Modal.js';
import { File as FileModel } from '@core/models/Files.js';
import ProfileOverviewSection from './ProfileOverviewSection.js';
import ProfilePersonalSection from './ProfilePersonalSection.js';
import ProfileSecuritySection from './ProfileSecuritySection.js';
import ProfileConnectedSection from './ProfileConnectedSection.js';
import ProfileSessionsSection from './ProfileSessionsSection.js';
import ProfileDevicesSection from './ProfileDevicesSection.js';
import ProfileSecurityEventsSection from './ProfileSecurityEventsSection.js';
import ProfileNotificationsSection from './ProfileNotificationsSection.js';
import ProfileApiKeysSection from './ProfileApiKeysSection.js';
import ProfileGroupsSection from './ProfileGroupsSection.js';
import ProfilePermissionsSection from './ProfilePermissionsSection.js';

const SECTIONS = {
    profile: ProfileOverviewSection,
    personal: ProfilePersonalSection,
    security: ProfileSecuritySection,
    connected: ProfileConnectedSection,
    sessions: ProfileSessionsSection,
    devices: ProfileDevicesSection,
    security_events: ProfileSecurityEventsSection,
    notifications: ProfileNotificationsSection,
    api_keys: ProfileApiKeysSection,
    groups: ProfileGroupsSection,
    permissions: ProfilePermissionsSection
};

export default class UserProfileView extends View {
    constructor(options = {}) {
        super({
            className: 'user-profile-view',
            template: `
                <style>
                    .up-layout { display: flex; height: 100%; }
                    .up-nav { width: 200px; background: #f8f9fc; border-right: 1px solid #e9ecef; padding: 0.75rem 0; flex-shrink: 0; overflow-y: auto; }
                    .up-nav-label { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #adb5bd; padding: 0.75rem 1.25rem 0.25rem; }
                    .up-nav a { color: #495057; padding: 0.45rem 1.25rem; font-size: 0.85rem; display: flex; align-items: center; gap: 0.5rem; text-decoration: none; }
                    .up-nav a:hover { background: #e9ecef; }
                    .up-nav a.active { background: #e7f1ff; color: #0d6efd; font-weight: 600; border-right: 2px solid #0d6efd; }
                    .up-nav a i { width: 18px; text-align: center; font-size: 0.9rem; }
                    .up-content { flex: 1; overflow-y: auto; padding: 1.5rem 2.5rem; }
                    .up-accent { height: 4px; background: linear-gradient(90deg, #1a73e8, #4fc3f7); border-radius: var(--bs-modal-border-radius, 0.5rem) var(--bs-modal-border-radius, 0.5rem) 0 0; }
                    .up-header { display: flex; align-items: center; gap: 1rem; padding: 1rem 1.5rem; border-bottom: 1px solid #e9ecef; }
                    .up-avatar-wrap { position: relative; flex-shrink: 0; cursor: pointer; }
                    .up-avatar-wrap img { width: 56px; height: 56px; border-radius: 50%; object-fit: cover; }
                    .up-avatar-initials { width: 56px; height: 56px; border-radius: 50%; background: #e7f1ff; color: #0d6efd; display: flex; align-items: center; justify-content: center; font-size: 1.3rem; font-weight: 700; }
                    .up-header-info { flex: 1; min-width: 0; }
                    .up-header-name { display: flex; align-items: center; gap: 0.5rem; }
                    .up-header-name h5 { margin: 0; font-weight: 700; font-size: 1.05rem; }
                    .up-header-badge { font-size: 0.65rem; padding: 0.15em 0.5em; border-radius: 3px; font-weight: 600; }
                    .up-header-badge-staff { background: #e7f1ff; color: #0d6efd; }
                    .up-header-badge-su { background: #fff3cd; color: #856404; }
                    .up-header-sub { font-size: 0.78rem; color: #6c757d; display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; }
                    .up-header-sub .up-dot { color: #ced4da; }
                    .up-header-verified { display: inline-flex; align-items: center; gap: 0.2rem; font-size: 0.72rem; color: #198754; }
                    .up-header-verified i { font-size: 0.7rem; }
                    .up-close { flex-shrink: 0; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border: none; background: none; color: #6c757d; font-size: 1.1rem; border-radius: 6px; cursor: pointer; padding: 0; align-self: flex-start; margin-top: -0.15rem; }
                    .up-close:hover { background: #f0f0f0; color: #212529; }
                    @media (max-width: 576px) {
                        .up-nav { display: none; }
                        .up-content { padding: 1.25rem; }
                    }
                </style>
                <div class="up-layout" style="flex-direction: column; min-height: 480px;">
                    <div class="up-accent"></div>
                    <div class="up-header">
                        <div class="up-avatar-wrap" data-action="change-avatar" title="Change avatar">
                            {{{model.avatar|avatar}}}
                        </div>
                        <div class="up-header-info">
                            <div class="up-header-name">
                                <h5>{{model.display_name}}</h5>
                                {{#model.is_superuser|bool}}<span class="up-header-badge up-header-badge-su">Superuser</span>{{/model.is_superuser|bool}}
                                {{^model.is_superuser|bool}}
                                    {{#model.is_staff|bool}}<span class="up-header-badge up-header-badge-staff">Staff</span>{{/model.is_staff|bool}}
                                {{/model.is_superuser|bool}}
                            </div>
                            <div class="up-header-sub">
                                <span>{{model.email}}</span>
                                {{#model.is_email_verified|bool}}
                                    <span class="up-dot">&middot;</span>
                                    <span class="up-header-verified"><i class="bi bi-patch-check-fill"></i> Email</span>
                                {{/model.is_email_verified|bool}}
                                {{#model.requires_mfa|bool}}
                                    <span class="up-dot">&middot;</span>
                                    <span class="up-header-verified"><i class="bi bi-shield-fill-check"></i> MFA</span>
                                {{/model.requires_mfa|bool}}
                            </div>
                        </div>
                        <button type="button" class="up-close" data-action="close-dialog" title="Close"><i class="bi bi-x-lg"></i></button>
                    </div>
                    <div class="up-layout" style="flex: 1; min-height: 0;">
                        <nav class="up-nav">
                            <a href="#" class="nav-link active" data-action="navigate" data-section="profile"><i class="bi bi-person"></i> Profile</a>
                            <a href="#" class="nav-link" data-action="navigate" data-section="personal"><i class="bi bi-person-vcard"></i> Personal</a>
                            <a href="#" class="nav-link" data-action="navigate" data-section="security"><i class="bi bi-shield-lock"></i> Security</a>
                            <a href="#" class="nav-link" data-action="navigate" data-section="connected"><i class="bi bi-plug"></i> Connected</a>
                            <div class="up-nav-label">Activity</div>
                            <a href="#" class="nav-link" data-action="navigate" data-section="sessions"><i class="bi bi-clock-history"></i> Sessions</a>
                            <a href="#" class="nav-link" data-action="navigate" data-section="devices"><i class="bi bi-laptop"></i> Devices</a>
                            <a href="#" class="nav-link" data-action="navigate" data-section="security_events"><i class="bi bi-shield-exclamation"></i> Security Events</a>
                            <div class="up-nav-label">Settings</div>
                            <a href="#" class="nav-link" data-action="navigate" data-section="notifications"><i class="bi bi-bell"></i> Notifications</a>
                            <a href="#" class="nav-link" data-action="navigate" data-section="api_keys"><i class="bi bi-key"></i> API Keys</a>
                            <a href="#" class="nav-link" data-action="navigate" data-section="groups"><i class="bi bi-people"></i> Groups</a>
                            <a href="#" class="nav-link" data-action="navigate" data-section="permissions"><i class="bi bi-shield-check"></i> Permissions</a>
                        </nav>
                        <div class="up-content" id="profile-section"></div>
                    </div>
                </div>
            `,
            ...options
        });
        this.activeSection = 'profile';
        this.sectionView = null;
    }

    get hasAvatar() {
        return !!(this.model && this.model.get('avatar') && this.model.get('avatar').url);
    }

    async onBeforeRender() {
        if (this.model) {
            await this.model.fetch({ params: { graph: 'full' } });
        }
    }

    async onAfterRender() {
        // Sync nav active state after any re-render (e.g., model change auto-rerender)
        this.element?.querySelectorAll('.up-nav a').forEach(link => {
            link.classList.toggle('active', link.dataset.section === this.activeSection);
        });
    }

    async onInit() {
        await super.onInit();

        // Default section
        this.sectionView = new ProfileOverviewSection({
            model: this.model,
            containerId: 'profile-section'
        });
        this.addChild(this.sectionView);
    }

    async onActionNavigate(event, el) {
        event.preventDefault();
        const section = el.dataset.section;
        if (!section || section === this.activeSection) return true;

        const SectionClass = SECTIONS[section];
        if (!SectionClass) return true;

        // Remove current section
        if (this.sectionView) {
            this.removeChild(this.sectionView);
        }

        // Create and add new section
        this.sectionView = new SectionClass({
            model: this.model,
            containerId: 'profile-section'
        });
        this.addChild(this.sectionView);
        await this.sectionView.render();

        this.activeSection = section;

        // Update nav active state
        this.element.querySelectorAll('.up-nav a').forEach(link => {
            link.classList.toggle('active', link.dataset.section === section);
        });

        return true;
    }

    async onActionChangeAvatar() {
        const resp = await Modal.updateModelImage({
            model: this.model,
            field: 'avatar',
            title: 'Change Avatar',
            upload: true,
        }, {
            name: 'avatar',
            size: 'lg',
            imageSize: { width: 200, height: 200 },
            placeholder: 'Upload your avatar',
        });
        if (resp && resp.status === 200) {
            await this.render();
        }
    }

    async onActionCloseDialog() {
        // Find and dismiss the parent dialog
        const modal = this.element?.closest('.modal');
        if (modal) {
            const bsModal = bootstrap?.Modal?.getInstance(modal);
            if (bsModal) bsModal.hide();
        }
        return true;
    }

    async onActionUpdateEmail() {
        const app = this.getApp();
        const rest = app.rest;

        // Step 1: Collect new email
        const data = await Modal.form({
            title: 'Change Email Address',
            size: 'sm',
            submitText: 'Send Code',
            fields: [
                {
                    name: 'new_email_address',
                    type: 'text',
                    label: 'New Email Address',
                    required: true,
                    placeholder: 'Enter new email address',
                    attributes: { autocomplete: 'off', inputmode: 'email' },
                    cols: 12
                }
            ]
        });
        if (!data) return true;

        // Step 2: Request the change (sends code to new email)
        const sendResp = await rest.POST('/api/auth/email/change/request', {
            email: data.new_email_address,
            method: 'code'
        });
        if (!sendResp.success) {
            app.toast.error(sendResp.message || 'Failed to request email change');
            return true;
        }

        // Step 3: Prompt for the 6-digit code
        const code = await Modal.prompt(
            `Enter the 6-digit code sent to <strong>${data.new_email_address}</strong>`,
            'Confirm Email Change',
            { placeholder: '000000' }
        );
        if (!code) return true;

        // Step 4: Confirm the code — returns new JWT
        const confirmResp = await rest.POST('/api/auth/email/change/confirm', { code: code.trim() }, {}, { dataOnly: true });
        if (confirmResp.success && confirmResp.data) {
            // Store new tokens (old sessions are invalidated)
            if (confirmResp.data.access_token) {
                app.auth?.setTokens?.(confirmResp.data);
            }
            app.toast.success('Email address updated');
            await this.model.fetch({ params: { graph: 'full' } });
            await this.render();
        } else {
            app.toast.error(confirmResp.message || 'Invalid or expired code');
        }
        return true;
    }

    async onActionUpdatePhone() {
        const app = this.getApp();
        const rest = app.rest;
        const currentPhone = this.model.get('phone_number');

        if (!currentPhone) {
            // No phone — redirect to add phone flow in overview section
            app.toast.info('Use the profile section to add a phone number');
            return true;
        }

        // Step 1: Collect new phone + password
        const data = await Modal.form({
            title: 'Change Phone Number',
            size: 'sm',
            submitText: 'Send Code',
            fields: [
                {
                    name: 'new_phone',
                    type: 'tel',
                    label: 'New Phone Number',
                    required: true,
                    placeholder: '(415) 555-0123',
                    attributes: { autocomplete: 'off' },
                    cols: 12
                }
            ]
        });
        if (!data) return true;

        // Step 2: Request the change (sends code to new phone)
        const sendResp = await rest.POST('/api/auth/phone/change/request', {
            phone_number: data.new_phone
        }, {}, { dataOnly: true });
        if (!sendResp.success) {
            app.toast.error(sendResp.message || 'Failed to request phone change');
            return true;
        }

        // Hold the session_token for confirm step
        const sessionToken = sendResp.data?.session_token;

        // Step 3: Prompt for the 6-digit code
        const code = await Modal.prompt(
            `Enter the 6-digit code sent to <strong>${data.new_phone}</strong>`,
            'Confirm Phone Change',
            { placeholder: '000000' }
        );
        if (!code) return true;

        // Step 4: Confirm the code
        const confirmResp = await rest.POST('/api/auth/phone/change/confirm', {
            session_token: sessionToken,
            code: code.trim()
        });
        if (confirmResp.success) {
            app.toast.success('Phone number updated');
            await this.model.fetch({ params: { graph: 'full' } });
            await this.render();
        } else {
            app.toast.error(confirmResp.message || 'Invalid or expired code');
        }
        return true;
    }
}
