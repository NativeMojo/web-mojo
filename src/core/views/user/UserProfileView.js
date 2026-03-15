/**
 * UserProfileView - Rich user profile shown in a Dialog
 *
 * Main container with left nav and section switching.
 * 7 sections: Profile, Security, Sessions, Devices, Activity, Groups, Permissions.
 * Fetches full user data on render.
 * Includes its own context menu (3-dot) for quick actions.
 */
import View from '@core/View.js';
import ContextMenu from '@core/views/feedback/ContextMenu.js';
import Dialog from '@core/views/feedback/Dialog.js';
import { File as FileModel } from '@core/models/Files.js';
import ProfileOverviewSection from './ProfileOverviewSection.js';
import ProfileSecuritySection from './ProfileSecuritySection.js';
import ProfileSessionsSection from './ProfileSessionsSection.js';
import ProfileDevicesSection from './ProfileDevicesSection.js';
import ProfileActivitySection from './ProfileActivitySection.js';
import ProfileGroupsSection from './ProfileGroupsSection.js';
import ProfilePermissionsSection from './ProfilePermissionsSection.js';

const SECTIONS = {
    profile: ProfileOverviewSection,
    security: ProfileSecuritySection,
    sessions: ProfileSessionsSection,
    devices: ProfileDevicesSection,
    activity: ProfileActivitySection,
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
                    .up-header { display: flex; align-items: center; gap: 1rem; padding: 0.85rem 1.25rem; border-bottom: 1px solid #e9ecef; background: #fff; }
                    .up-avatar-wrap { position: relative; flex-shrink: 0; cursor: pointer; }
                    .up-avatar-wrap img { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; border: 2px solid #e9ecef; }
                    .up-avatar-initials { width: 44px; height: 44px; border-radius: 50%; background: #e7f1ff; color: #0d6efd; display: flex; align-items: center; justify-content: center; font-size: 1rem; font-weight: 700; border: 2px solid #e9ecef; }
                    .up-header-info { flex: 1; min-width: 0; }
                    .up-header-info h5 { margin: 0; font-weight: 700; font-size: 1rem; }
                    .up-header-info .up-sub { font-size: 0.78rem; color: #6c757d; }
                    @media (max-width: 576px) {
                        .up-nav { display: none; }
                        .up-content { padding: 1.25rem; }
                    }
                </style>
                <div class="up-layout" style="flex-direction: column; min-height: 480px;">
                    <div class="up-header">
                        <div class="up-avatar-wrap" data-action="change-avatar" title="Change avatar">
                            {{{model.avatar|avatar}}}
                        </div>
                        <div class="up-header-info">
                            <h5>{{model.display_name}}</h5>
                            <div class="up-sub">@{{model.username}} &middot; {{model.last_activity|relative}}</div>
                        </div>
                        <div id="up-context-menu"></div>
                    </div>
                    <div class="up-layout" style="flex: 1; min-height: 0;">
                        <nav class="up-nav">
                            <a href="#" class="nav-link active" data-action="navigate" data-section="profile"><i class="bi bi-person"></i> Profile</a>
                            <a href="#" class="nav-link" data-action="navigate" data-section="security"><i class="bi bi-shield-lock"></i> Security</a>
                            <a href="#" class="nav-link" data-action="navigate" data-section="groups"><i class="bi bi-people"></i> Groups</a>
                            <a href="#" class="nav-link" data-action="navigate" data-section="permissions"><i class="bi bi-shield-check"></i> Permissions</a>
                            <div class="up-nav-label">Activity</div>
                            <a href="#" class="nav-link" data-action="navigate" data-section="sessions"><i class="bi bi-clock-history"></i> Sessions</a>
                            <a href="#" class="nav-link" data-action="navigate" data-section="devices"><i class="bi bi-laptop"></i> Devices</a>
                            <a href="#" class="nav-link" data-action="navigate" data-section="activity"><i class="bi bi-activity"></i> Activity Log</a>
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

    async onInit() {
        await super.onInit();

        // Context menu (3-dot)
        this.contextMenu = new ContextMenu({
            containerId: 'up-context-menu',
            config: {
                icon: 'bi-three-dots-vertical',
                items: [
                    { icon: 'bi-lock', label: 'Change Password', action: 'change-password' },
                    { icon: 'bi-envelope', label: 'Update Email', action: 'update-email' },
                    { icon: 'bi-phone', label: 'Update Phone', action: 'update-phone' }
                ]
            }
        });
        this.addChild(this.contextMenu);

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
        const resp = await Dialog.updateModelImage({
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

    // Context menu action handlers (dispatched by ContextMenu to parent)
    async onActionChangePassword() {
        const app = this.getApp();
        if (app && app.changePassword) {
            await app.changePassword();
        }
        return true;
    }

    async onActionUpdateEmail() {
        this.getApp()?.toast?.info('Email management coming soon');
        return true;
    }

    async onActionUpdatePhone() {
        this.getApp()?.toast?.info('Phone management coming soon');
        return true;
    }
}
