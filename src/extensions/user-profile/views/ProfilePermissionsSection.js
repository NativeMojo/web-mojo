/**
 * ProfilePermissionsSection - Read-only permissions tab
 *
 * Shows system permissions and active group permissions side by side.
 * Pure template view — no fetching needed.
 */
import View from '@core/View.js';
import { User } from '@core/models/User.js';

export default class ProfilePermissionsSection extends View {
    constructor(options = {}) {
        super({
            className: 'profile-permissions-section',
            template: `
                <style>
                    .pp-role-bar { display: flex; align-items: center; gap: 0.75rem; padding: 0.65rem 1rem; background: #f0f0ff; border-radius: 8px; margin-bottom: 1.25rem; font-size: 0.85rem; }
                    .pp-role-bar i { color: #6f42c1; font-size: 1rem; }
                    .pp-role-bar strong { color: #6f42c1; }
                    .pp-section-label { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #adb5bd; margin-bottom: 0.5rem; margin-top: 1.75rem; }
                    .pp-section-label:first-child { margin-top: 0; }
                    .pp-grid { display: flex; flex-wrap: wrap; gap: 0.3rem; margin-bottom: 1.25rem; }
                    .pp-tag { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.78rem; padding: 0.25em 0.6em; background: #f8f9fc; border: 1px solid #e9ecef; border-radius: 4px; color: #495057; }
                    .pp-tag i { font-size: 0.65rem; color: #198754; }
                    .pp-tag-group { background: #e7f1ff; border-color: #b6d4fe; }
                    .pp-tag-group i { color: #0d6efd; }
                    .pp-note { font-size: 0.78rem; color: #adb5bd; margin-top: 1rem; }
                    .pp-empty { color: #6c757d; font-style: italic; font-size: 0.85rem; padding: 0.5rem 0; }
                    .pp-group-header { display: flex; align-items: center; gap: 0.5rem; }
                    .pp-group-name { font-size: 0.78rem; font-weight: 400; color: #6c757d; }
                </style>

                {{#model.is_superuser|bool}}
                    <div class="pp-role-bar">
                        <i class="bi bi-star-fill"></i>
                        <span><strong>Superuser</strong> &mdash; full system access</span>
                    </div>
                {{/model.is_superuser|bool}}

                <div class="pp-section-label">System Permissions</div>

                {{#systemPermissions|bool}}
                    <div class="pp-grid">
                        {{#systemPermissions}}
                            <span class="pp-tag"><i class="bi bi-check-circle-fill"></i> {{.}}</span>
                        {{/systemPermissions}}
                    </div>
                {{/systemPermissions|bool}}

                {{^systemPermissions|bool}}
                    <div class="pp-empty">No system permissions assigned</div>
                {{/systemPermissions|bool}}

                {{#hasActiveGroup|bool}}
                    <div class="pp-section-label">
                        <div class="pp-group-header">
                            <span>Group Permissions</span>
                            <span class="pp-group-name">&mdash; {{activeGroupName}}</span>
                        </div>
                    </div>

                    {{#groupPermissions|bool}}
                        <div class="pp-grid">
                            {{#groupPermissions}}
                                <span class="pp-tag pp-tag-group"><i class="bi bi-check-circle-fill"></i> {{.}}</span>
                            {{/groupPermissions}}
                        </div>
                    {{/groupPermissions|bool}}

                    {{^groupPermissions|bool}}
                        <div class="pp-empty">No group permissions assigned</div>
                    {{/groupPermissions|bool}}
                {{/hasActiveGroup|bool}}

                <div class="pp-note">
                    <i class="bi bi-info-circle me-1"></i>
                    Permissions are managed by your administrator.
                </div>
            `,
            ...options
        });
    }

    get systemPermissions() {
        if (!this.model) return [];
        const perms = this.model.get('permissions');
        if (!perms) return [];

        const permMap = {};
        User.PERMISSIONS.forEach(p => { permMap[p.name] = p.label; });

        return Object.keys(perms)
            .filter(k => perms[k] === true)
            .map(k => permMap[k] || k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
    }

    get hasActiveGroup() {
        const app = this.getApp();
        return !!(app?.activeGroup && this.model?.member);
    }

    get activeGroupName() {
        const app = this.getApp();
        return app?.activeGroup?.get('name') || app?.activeGroup?.get('display_name') || 'Current Group';
    }

    get groupPermissions() {
        if (!this.model?.member) return [];
        const perms = this.model.member.get('permissions');
        if (!perms) return [];

        return Object.keys(perms)
            .filter(k => perms[k] === true)
            .map(k => k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
    }
}
