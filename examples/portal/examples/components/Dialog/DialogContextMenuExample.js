import { Page, Dialog } from 'web-mojo';

/**
 * DialogContextMenuExample — Dialog header context menu.
 *
 * Doc:    docs/web-mojo/components/Dialog.md#context-menu
 * Route:  components/dialog/context-menu
 *
 * Dialog has its own `contextMenu` option that renders a dropdown in the
 * dialog header. Unlike the standalone `ContextMenu` component, Dialog's
 * variant does interpret a `permissions` key — items with permissions the
 * user lacks are filtered out before render. The menu's clicked `value`
 * resolves the dialog's Promise.
 *
 * This example opens a dialog with three header menu items, then logs the
 * resolved value when one is selected (or the dialog is dismissed).
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
    }

    async onActionOpen() {
        const result = await Dialog.showDialog({
            title: 'User Details',
            body: `
                <p class="mb-2">Open the three-dots menu in the header to choose an action.</p>
                <p class="text-muted small mb-0">
                    Header menu items resolve the dialog with their <code>value</code>.
                </p>
            `,
            size: 'md',
            contextMenu: [
                { icon: 'bi-pencil', label: 'Edit user', action: 'edit', value: 'edit' },
                { icon: 'bi-key', label: 'Reset password', action: 'reset', value: 'reset' },
                { icon: 'bi-trash', label: 'Delete user', action: 'delete', value: 'delete' },
            ],
            buttons: [
                { text: 'Close', class: 'btn-secondary', dismiss: true },
            ],
        });
        this.lastResult = result == null ? '(dismissed)' : `selected: ${result}`;
        this.render();
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>Dialog — context menu</h1>
            <p class="example-summary">
                A dropdown menu in the dialog header. Items resolve the dialog Promise with their <code>value</code>.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="https://github.com/NativeMojo/web-mojo/blob/main/docs/web-mojo/components/Dialog.md#context-menu" target="_blank">
                    docs/web-mojo/components/Dialog.md
                </a>
            </p>

            <div class="card">
                <div class="card-body">
                    <button class="btn btn-primary mb-3" data-action="open">
                        <i class="bi bi-window-stack"></i> Open dialog with header menu
                    </button>
                    <div class="border rounded p-3 bg-light">
                        <strong class="small text-muted">Last result</strong>
                        <div class="small">{{lastResult}}</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export default DialogContextMenuExample;
