import { Page, ListView, ListViewItem, Collection } from 'web-mojo';

/**
 * ListViewCustomItemExample — a ListView with a custom `itemClass`.
 *
 * Doc:    docs/web-mojo/components/ListView.md#custom-items
 * Route:  components/list-view/custom-item
 *
 * For non-trivial item rendering, an `itemTemplate` string starts to fight
 * back. Subclass `ListViewItem` instead — you get a real View per row, with
 * lifecycle hooks, action handlers, and template-side helpers (any getter
 * on the instance is template context).
 *
 * Here, `UserListItem` renders a richer card with:
 *   - colored avatar built from initials
 *   - name + role + last-active relative time
 *   - status badge whose Bootstrap class is computed in JS (`statusClass`)
 *
 * Pass it to ListView via `itemClass: UserListItem` — no `itemTemplate`
 * needed because the item class declares its own template.
 */
const SEED_USERS = [
    { id: 1, name: 'Alice Adams', role: 'Admin', status: 'active', last_active: '2026-04-25T10:14:00Z' },
    { id: 2, name: 'Ben Bryant', role: 'Editor', status: 'active', last_active: '2026-04-24T18:02:00Z' },
    { id: 3, name: 'Carla Cruz', role: 'Viewer', status: 'invited', last_active: '2026-04-23T09:21:00Z' },
    { id: 4, name: 'Dan Dietrich', role: 'Editor', status: 'active', last_active: '2026-04-22T15:44:00Z' },
    { id: 5, name: 'Eve Estrada', role: 'Admin', status: 'active', last_active: '2026-04-25T08:00:00Z' },
    { id: 6, name: 'Frank Fischer', role: 'Viewer', status: 'disabled', last_active: '2026-02-11T11:33:00Z' },
    { id: 7, name: 'Grace Gomez', role: 'Editor', status: 'active', last_active: '2026-04-24T12:01:00Z' },
    { id: 8, name: 'Hank Huang', role: 'Viewer', status: 'active', last_active: '2026-04-20T17:18:00Z' },
];

const STATUS_CLASS = {
    active: 'success',
    invited: 'warning',
    disabled: 'secondary',
};

const AVATAR_PALETTE = ['primary', 'success', 'warning', 'danger', 'info', 'secondary'];

class UserListItem extends ListViewItem {
    constructor(options = {}) {
        super({
            ...options,
            template: UserListItem.TEMPLATE,
            className: 'list-view-item user-list-item',
        });
    }

    // Computed view-side helpers — accessible from the Mustache template as
    // `{{statusClass}}`, `{{avatarColor}}`, etc.
    get statusClass() { return STATUS_CLASS[this.model?.get('status')] || 'secondary'; }
    get avatarColor() { return AVATAR_PALETTE[this.model?.id % AVATAR_PALETTE.length]; }

    static TEMPLATE = `
        <div class="d-flex align-items-center gap-3 p-3 border-bottom"
             data-action="select" style="cursor:pointer;">
            <div class="rounded-circle bg-{{avatarColor}} text-white d-flex align-items-center justify-content-center"
                 style="width:48px;height:48px;font-weight:600;">
                {{model.name|initials}}
            </div>
            <div class="flex-grow-1 min-w-0">
                <div class="d-flex align-items-center gap-2">
                    <strong class="text-truncate">{{model.name}}</strong>
                    <span class="badge text-bg-light">{{model.role}}</span>
                </div>
                <div class="small text-muted">
                    Last active <span class="fw-medium">{{model.last_active|relative}}</span>
                </div>
            </div>
            <span class="badge text-bg-{{statusClass}}">{{model.status}}</span>
        </div>
    `;
}

class ListViewCustomItemExample extends Page {
    static pageName = 'components/list-view/custom-item';
    static route = 'components/list-view/custom-item';

    constructor(options = {}) {
        super({
            ...options,
            pageName: ListViewCustomItemExample.pageName,
            route: ListViewCustomItemExample.route,
            title: 'ListView — custom item class',
            template: ListViewCustomItemExample.TEMPLATE,
        });
        this.selectedName = '(nothing selected)';
    }

    async onInit() {
        await super.onInit();

        const users = new Collection(SEED_USERS);

        this.list = new ListView({
            containerId: 'list-slot',
            collection: users,
            itemClass: UserListItem,
            selectionMode: 'single',
            emptyMessage: 'No users to display.',
        });

        this.list.on('selection:change', ({ model }) => {
            this.selectedName = model ? model.get('name') : '(nothing selected)';
            if (this.isActive) this.render();
        });

        this.addChild(this.list);
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>ListView — custom item class</h1>
            <p class="example-summary">
                A ListView with <code>itemClass: UserListItem</code>. The item subclass owns its template
                <strong>and</strong> any computed display fields (avatar color, status badge class).
                This is the right move once an itemTemplate string would have to inline JavaScript.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/components/ListView.md">
                    docs/web-mojo/components/ListView.md
                </a>
            </p>

            <div class="card">
                <div class="card-body p-0">
                    <div data-container="list-slot"></div>
                </div>
                <div class="card-footer bg-light">
                    <small class="text-muted">Selected: <strong>{{selectedName}}</strong></small>
                </div>
            </div>
        </div>
    `;
}

export default ListViewCustomItemExample;
