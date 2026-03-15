/**
 * ProfilePermissionsSection - Read-only permissions tab
 *
 * Shows role indicator and flat permission tag cloud.
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
                    .pp-section-label { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #adb5bd; margin-bottom: 0.5rem; }
                    .pp-grid { display: flex; flex-wrap: wrap; gap: 0.3rem; margin-bottom: 1.25rem; }
                    .pp-tag { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.78rem; padding: 0.25em 0.6em; background: #f8f9fc; border: 1px solid #e9ecef; border-radius: 4px; color: #495057; }
                    .pp-tag i { font-size: 0.65rem; color: #198754; }
                    .pp-note { font-size: 0.78rem; color: #adb5bd; margin-top: 1rem; }
                    .pp-empty { color: #6c757d; font-style: italic; font-size: 0.85rem; padding: 1rem 0; }
                </style>

                {{#model.is_superuser|bool}}
                    <div class="pp-role-bar">
                        <i class="bi bi-star-fill"></i>
                        <span><strong>Superuser</strong> &mdash; full system access</span>
                    </div>
                {{/model.is_superuser|bool}}

                <div class="pp-section-label">Granted Permissions</div>

                {{#permissionTags|bool}}
                    <div class="pp-grid">
                        {{#permissionTags}}
                            <span class="pp-tag"><i class="bi bi-check-circle-fill"></i> {{.}}</span>
                        {{/permissionTags}}
                    </div>
                {{/permissionTags|bool}}

                {{^permissionTags|bool}}
                    <div class="pp-empty">No permissions assigned</div>
                {{/permissionTags|bool}}

                <div class="pp-note">
                    <i class="bi bi-info-circle me-1"></i>
                    Permissions are managed by your administrator.
                </div>
            `,
            ...options
        });
    }

    get permissionTags() {
        if (!this.model) return [];
        const perms = this.model.get('permissions');
        if (!perms) return [];

        const permMap = {};
        User.PERMISSIONS.forEach(p => { permMap[p.name] = p.label; });

        return Object.keys(perms)
            .filter(k => perms[k] === true)
            .map(k => permMap[k] || k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
    }
}
