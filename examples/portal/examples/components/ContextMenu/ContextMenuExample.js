import { Page, View, ContextMenu } from 'web-mojo';

/**
 * ContextMenuExample — canonical "three-dots" row menu.
 *
 * Doc:    docs/web-mojo/components/ContextMenu.md
 * Route:  components/context-menu
 *
 * The standard pattern for a ContextMenu attached to a list/table row:
 *
 *   1. The row View renders the row HTML and a `<div data-container="row-menu">`
 *      placeholder where the menu mounts.
 *   2. The row's `onInit()` builds a ContextMenu with `containerId: 'row-menu'`
 *      and `context: this.model` (or the row data) so handlers know which row.
 *   3. ContextMenu items declare `action: 'kebab-case'` — when clicked, the
 *      menu calls `this.parent.events.dispatch(action, event, element)`,
 *      which lands on `onActionKebabCase()` on the row View itself.
 *
 * ContextMenu does NOT bubble actions up to grandparents. The parent of the
 * menu is whichever View called `addChild()` on it — here, the row. Action
 * handlers therefore live on the row class.
 */
class CardRowView extends View {
    constructor(options = {}) {
        super({
            ...options,
            template: CardRowView.TEMPLATE,
            className: 'border rounded p-3',
        });
        this.row = options.row;        // plain { id, name, ... } object
        this.onLog = options.onLog || (() => {});
    }

    async onInit() {
        await super.onInit();

        this.menu = new ContextMenu({
            containerId: 'row-menu',
            context: this.row,                  // forwarded to inline handlers
            config: {
                items: [
                    { label: 'Edit',      action: 'edit',      icon: 'bi-pencil' },
                    { label: 'Duplicate', action: 'duplicate', icon: 'bi-copy' },
                    { type: 'divider' },
                    { label: 'Delete',    action: 'delete',    icon: 'bi-trash', danger: true },
                ],
            },
        });
        this.addChild(this.menu);
    }

    // ── action handlers fire when ContextMenu items are clicked ───────────
    onActionEdit()      { this.onLog('edit',      this.row); }
    onActionDuplicate() { this.onLog('duplicate', this.row); }
    onActionDelete()    { this.onLog('delete',    this.row); }

    static TEMPLATE = `
        <div class="d-flex align-items-center justify-content-between">
            <div>
                <strong>{{row.name}}</strong>
                <div class="text-muted small">id: {{row.id}} — {{row.meta}}</div>
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
            title: 'ContextMenu — row dropdown',
            template: ContextMenuExample.TEMPLATE,
        });
        this.lastAction = '(no action yet)';

        this.rows = [
            { id: 'apollo',   name: 'Project Apollo',   meta: 'Lunar landing' },
            { id: 'borealis', name: 'Project Borealis', meta: 'Northern lights' },
            { id: 'cyclone',  name: 'Project Cyclone',  meta: 'Storm tracking' },
            { id: 'delta',    name: 'Project Delta',    meta: 'River study' },
            { id: 'eclipse',  name: 'Project Eclipse',  meta: 'Solar imaging' },
            { id: 'fusion',   name: 'Project Fusion',   meta: 'Reactor R&D' },
        ];
    }

    async onInit() {
        await super.onInit();

        const log = (action, row) => {
            this.lastAction = `${action} → ${row.name} (${row.id})`;
            this.render();
        };

        // Each row mounts into its own container slot so children don't
        // overwrite each other (View.mount uses replaceChildren).
        for (const row of this.rows) {
            this.addChild(new CardRowView({
                containerId: `row-${row.id}`,
                row,
                onLog: log,
            }));
        }
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>ContextMenu</h1>
            <p class="example-summary">
                Reusable Bootstrap-dropdown action menu. One per row; actions are dispatched to the row View.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/components/ContextMenu.md">
                    docs/web-mojo/components/ContextMenu.md
                </a>
            </p>

            <div class="card mb-3">
                <div class="card-body d-flex flex-column gap-2">
                    {{#rows}}
                    <div data-container="row-{{id}}"></div>
                    {{/rows}}
                </div>
                <div class="card-footer bg-light">
                    <small class="text-muted">Last action: <strong>{{lastAction}}</strong></small>
                </div>
            </div>
        </div>
    `;
}

export default ContextMenuExample;
