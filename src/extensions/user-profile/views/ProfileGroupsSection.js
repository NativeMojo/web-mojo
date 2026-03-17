/**
 * ProfileGroupsSection - Groups/memberships tab
 *
 * Uses ListView + MemberList to show user's group
 * memberships with role badges.
 */
import View from '@core/View.js';
import ListView from '@core/views/list/ListView.js';
import ListViewItem from '@core/views/list/ListViewItem.js';
import { MemberList } from '@core/models/Member.js';

const AVATAR_COLORS = ['#667eea', '#f5576c', '#38b2ac', '#ed8936', '#9f7aea', '#48bb78', '#4299e1', '#ed64a6'];

class GroupMemberItem extends ListViewItem {
    get groupName() {
        return this.model?.get('group')?.name || 'Unknown Group';
    }

    get groupKind() {
        const kind = this.model?.get('group')?.kind || '';
        return kind.replace(/^\w/, c => c.toUpperCase());
    }

    get initials() {
        return this.groupName.split(/\s+/).map(w => w[0]).join('').substring(0, 2).toUpperCase();
    }

    get avatarColor() {
        const name = this.groupName;
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
    }

    get roleName() {
        let role = this.model?.get('metadata')?.role || '';
        if (!role && this.model?.get('permissions')?.manage_group) {
            role = 'Admin';
        }
        return role;
    }

    get hasRole() {
        return !!this.roleName;
    }

    get roleBadgeClass() {
        const r = (this.roleName || '').toLowerCase();
        if (r === 'owner') return 'bg-primary';
        if (r === 'admin') return 'bg-info';
        return 'bg-secondary';
    }

    get permissionsList() {
        const perms = this.model?.get('permissions');
        if (!perms) return [];
        return Object.keys(perms)
            .filter(k => perms[k] === true)
            .map(k => k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
    }

    get hasPermissions() {
        return this.permissionsList.length > 0;
    }
}

export default class ProfileGroupsSection extends View {
    constructor(options = {}) {
        super({
            className: 'profile-groups-section',
            template: `
                <style>
                    .pg-row { display: flex; align-items: center; gap: 0.75rem; padding: 0.65rem 0; border-bottom: 1px solid #f0f0f0; }
                    .pg-row:last-child { border-bottom: none; }
                    .pg-avatar { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; color: #fff; flex-shrink: 0; }
                    .pg-info { flex: 1; }
                    .pg-name { font-weight: 600; font-size: 0.88rem; }
                    .pg-meta { font-size: 0.73rem; color: #6c757d; }
                    .pg-role { font-size: 0.7rem; }
                    .pg-perms { display: flex; flex-wrap: wrap; gap: 0.25rem; justify-content: flex-end; }
                    .pg-perm-tag { display: inline-flex; align-items: center; font-size: 0.68rem; padding: 0.15em 0.45em; background: #f0f4ff; border: 1px solid #d4deff; border-radius: 3px; color: #4a6cf7; }
                </style>
                <div id="groups-list"></div>
            `,
            ...options
        });
    }

    async onInit() {
        await super.onInit();
        this.listView = new ListView({
            containerId: 'groups-list',
            collection: new MemberList({ size: 50 }),
            defaultQuery: { user: this.model.id },
            itemClass: GroupMemberItem,
            itemTemplate: `
                <div class="pg-row">
                    <div class="pg-avatar" style="background: {{avatarColor}};">{{initials}}</div>
                    <div class="pg-info">
                        <div class="pg-name">{{groupName}}</div>
                        <div class="pg-meta">{{groupKind}}</div>
                    </div>
                    {{#hasPermissions|bool}}
                    <div class="pg-perms">
                        {{#permissionsList}}
                            <span class="pg-perm-tag">{{.}}</span>
                        {{/permissionsList}}
                    </div>
                    {{/hasPermissions|bool}}
                    {{#hasRole|bool}}
                        <span class="pg-role badge {{roleBadgeClass}}">{{roleName}}</span>
                    {{/hasRole|bool}}
                </div>
            `,
            emptyMessage: 'You are not a member of any groups'
        });
        this.addChild(this.listView);
    }
}
