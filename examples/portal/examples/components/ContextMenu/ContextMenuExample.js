import { Page, View, ContextMenu } from 'web-mojo';

/**
 * ContextMenuExample — canonical demo of the ContextMenu component.
 *
 * Doc:    docs/web-mojo/components/ContextMenu.md
 * Route:  components/context-menu
 *
 * ContextMenu is the standard "three-dots" dropdown for rows, headers, and
 * any other view. It declares items as an array of plain objects and
 * supports two action styles:
 *
 *   1. `action: 'kebab-case'` — dispatches via `parent.events.dispatch()`,
 *      so define `onActionKebabCase()` on the parent View.
 *   2. `handler: (context, event, el) => { … }` — inline callback. When a
 *      handler is present, the action dispatch is suppressed.
 *
 * Notes (from the doc):
 *   - ContextMenu does NOT interpret `permissions` on items — that key
 *     belongs to Dialog's header context menu. Filter the items array
 *     yourself if you need permission gating here.
 *   - The `'action'` event mentioned in the source docstring is dead code;
 *     don't subscribe with `menu.on('action', …)` and expect anything.
 */
class RowView extends View {
    constructor(options = {}) {
        super({
            ...options,
            template: RowView.TEMPLATE,
            className: 'd-flex align-items-center justify-content-between p-3 border-bottom',
        });
        this.title = options.title || 'Untitled';
        this.onLog = options.onLog || (() => {});
    }

    async onInit() {
        await super.onInit();

        this.menu = new ContextMenu({
            containerId: 'row-menu',
            context: this,
            config: {
                items: [
                    { label: 'View', action: 'view-row', icon: 'bi-eye' },
                    { label: 'Edit', action: 'edit-row', icon: 'bi-pencil' },
                    {
                        label: 'Refresh (inline handler)',
                        icon: 'bi-arrow-clockwise',
                        handler: (ctx) => ctx.onLog(`refresh: ${ctx.title}`),
                    },
                    { type: 'divider' },
                    { label: 'Help', icon: 'bi-question-circle', href: 'https://example.com/help', target: '_blank' },
                    { label: 'Delete', action: 'delete-row', icon: 'bi-trash', danger: true },
                ],
            },
        });
        this.addChild(this.menu);
    }

    onActionViewRow() { this.onLog(`view-row: ${this.title}`); }
    onActionEditRow() { this.onLog(`edit-row: ${this.title}`); }
    onActionDeleteRow() { this.onLog(`delete-row: ${this.title}`); }

    static TEMPLATE = `
        <div>
            <div>
                <strong>{{title}}</strong>
                <div class="text-muted small">Click the three-dots menu on the right →</div>
            </div>
            <div data-container="row-menu"></div>
        </div>
    `;
}

class ContextMenuExample extends Page {
    static pageName = 'components/context-menu';
    static route = 'components/context-menu';

    constructor(options = {}) {
        super({
            ...options,
            pageName: ContextMenuExample.pageName,
            route: ContextMenuExample.route,
            title: 'ContextMenu — dropdown action menu',
            template: ContextMenuExample.TEMPLATE,
        });
        this.lastAction = '(no action yet)';
    }

    async onInit() {
        await super.onInit();
        const log = (label) => { this.lastAction = label; this.render(); };

        for (const title of ['Project Apollo', 'Project Borealis', 'Project Cyclone']) {
            this.addChild(new RowView({ containerId: 'rows', title, onLog: log }));
        }
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>ContextMenu</h1>
            <p class="example-summary">
                Reusable Bootstrap-dropdown action menu. Mount one per row via <code>addChild()</code>.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="https://github.com/NativeMojo/web-mojo/blob/main/docs/web-mojo/components/ContextMenu.md" target="_blank">
                    docs/web-mojo/components/ContextMenu.md
                </a>
            </p>

            <div class="card">
                <div class="card-body p-0">
                    <div data-container="rows"></div>
                </div>
                <div class="card-footer bg-light">
                    <small class="text-muted">Last action: <strong>{{lastAction}}</strong></small>
                </div>
            </div>
        </div>
    `;
}

export default ContextMenuExample;
