import { Page, Dialog } from 'web-mojo';

/**
 * DialogContextMenuExample — Dialog header context menu with permission gating.
 *
 * Doc:    docs/web-mojo/components/Dialog.md#context-menu
 * Route:  components/dialog/context-menu
 *
 * Dialog has its own `contextMenu` option (NOT the same thing as the
 * standalone ContextMenu component on a sibling page). Two things to know:
 *
 *   1. Shape — Dialog expects `contextMenu: { items: [...] }` (an object
 *      with an `items` array), NOT a bare array.
 *   2. Permissions — Dialog's variant DOES filter items by `permissions`,
 *      reading the active user from `getApp().activeUser.hasPermission()`.
 *      The standalone ContextMenu does not.
 *
 * The `getApp().activeUser` shim below is illustrative only — in a real
 * app the framework's active-user state is wired up by your auth flow.
 *
 * Header menu items resolve the dialog's Promise with their `value`.
 */
class DialogContextMenuExample extends Page {
    static pageName = 'components/dialog/context-menu';
    static route = 'components/dialog/context-menu';

    constructor(options = {}) {
        super({
            ...options,
            pageName: DialogContextMenuExample.pageName,
            route: DialogContextMenuExample.route,
            title: 'Dialog — context menu',
            template: DialogContextMenuExample.TEMPLATE,
        });
        this.lastResult = '(none yet)';
        this.role = 'member';   // 'member' | 'admin' — controls permission gating
    }

    /**
     * Local shim — illustrative, not a framework feature. We override
     * getApp().activeUser inside this page so Dialog's permission filter
     * has something to call. Real apps wire this up via auth.
     */
    activeUserShim() {
        const role = this.role;
        return {
            hasPermission: (perm) => {
                const required = Array.isArray(perm) ? perm : [perm];
                if (required.includes('manage_users')) return role === 'admin';
                return true;
            },
        };
    }

    onActionToggleRole() {
        this.role = this.role === 'admin' ? 'member' : 'admin';
        this.render();
    }

    async onActionOpen() {
        const app = this.getApp();
        const realUser = app.activeUser;
        // Swap the active user only for the duration of this dialog.
        app.activeUser = this.activeUserShim();

        try {
            const result = await Dialog.showDialog({
                title: 'User Details',
                size: 'md',
                body: `
                    <p class="mb-2">Open the three-dots menu in the header to choose an action.</p>
                    <p class="text-muted small mb-0">
                        Current role: <strong>${this.role}</strong>.
                        Items with <code>permissions: ['manage_users']</code> are filtered out
                        when the active user lacks that permission.
                    </p>
                `,
                contextMenu: {
                    items: [
                        { icon: 'bi-pencil', label: 'Edit user',      action: 'edit',   value: 'edit' },
                        { icon: 'bi-key',    label: 'Reset password', action: 'reset',  value: 'reset' },
                        { type: 'divider' },
                        {
                            icon: 'bi-trash', label: 'Delete user',    action: 'delete',
                            value: 'delete',  permissions: ['manage_users'],
                        },
                    ],
                },
                buttons: [
                    { text: 'Close', class: 'btn-secondary', dismiss: true },
                ],
            });
            this.lastResult = result == null ? '(dismissed)' : `selected: ${result}`;
        } finally {
            app.activeUser = realUser;
            this.render();
        }
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>Dialog — context menu</h1>
            <p class="example-summary">
                A dropdown menu in the dialog header. Items resolve the dialog Promise with their <code>value</code>.
                Dialog's contextMenu filters items by <code>permissions</code> — the standalone ContextMenu does not.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/components/Dialog.md#context-menu">
                    docs/web-mojo/components/Dialog.md
                </a>
            </p>

            <div class="card mb-3">
                <div class="card-body">
                    <div class="d-flex flex-wrap gap-2 align-items-center mb-3">
                        <button class="btn btn-primary" data-action="open">
                            <i class="bi bi-window-stack"></i> Open dialog with header menu
                        </button>
                        <button class="btn btn-outline-secondary" data-action="toggle-role">
                            <i class="bi bi-person-gear"></i> Toggle role (currently <strong>{{role}}</strong>)
                        </button>
                    </div>
                    <small class="text-muted">
                        As <strong>admin</strong> you'll see the Delete entry; as <strong>member</strong> it's filtered out.
                    </small>
                </div>
            </div>

            <div class="card">
                <div class="card-header">Last result</div>
                <div class="card-body">
                    <pre class="mb-0 small"><code>{{lastResult}}</code></pre>
                </div>
            </div>
        </div>
    `;
}

export default DialogContextMenuExample;
