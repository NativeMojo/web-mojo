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
