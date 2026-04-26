import { Page, View, ContextMenu } from 'web-mojo';

/**
 * ContextMenuRowExample — right-click variant.
 *
 * Doc:    docs/web-mojo/components/ContextMenu.md
 * Route:  components/context-menu/row
 *
 * The standard ContextMenu mounts a "three-dots" trigger button; this
 * example shows the alternative: attach the menu to the row itself, so
 * a right-click anywhere on the row pops it open.
 *
 * Implementation:
 *   - The row uses `ContextMenu.attachToRightClick(...)` to wire a
 *     right-click handler that opens the menu at the cursor.
 *   - No hidden trigger button, no manual Bootstrap.Dropdown plumbing.
 *
 * Action dispatch is identical to the canonical example — items declare
 * `action: 'kebab-case'`, the row View defines `onActionKebabCase`.
 */
class RowWithContextMenu extends View {
    constructor(options = {}) {
        super({
            ...options,
            template: RowWithContextMenu.TEMPLATE,
            className: 'border rounded p-3 user-select-none',
            attributes: { style: 'cursor: context-menu;' },
        });
        this.row = options.row;
        this.onLog = options.onLog || (() => {});
        this.onRightClick = options.onRightClick || (() => {});
    }

    async onInit() {
        await super.onInit();

        // ContextMenu lives as a child so action dispatch routes through
        // this View's `events` (onActionXxx handlers below).
        this.menu = new ContextMenu({
            containerId: 'row-menu',
            context: this.row,
            config: {
                items: [
                    { label: 'View',      action: 'view',      icon: 'bi-eye' },
                    { label: 'Edit',      action: 'edit',      icon: 'bi-pencil' },
                    { label: 'Duplicate', action: 'duplicate', icon: 'bi-copy' },
                    { type: 'divider' },
                    { label: 'Delete',    action: 'delete',    icon: 'bi-trash', danger: true },
                ],
            },
        });
        this.addChild(this.menu);
    }

    onAfterMount() {
        // One-call right-click wiring — replaces the old hand-rolled
        // contextmenu listener + bootstrap.Dropdown.getOrCreateInstance call.
        ContextMenu.attachToRightClick(this.element, (event) => {
            // Debug ping so the user can confirm the contextmenu event is
            // being captured even if the dropdown fails to render.
            this.onRightClick(this.row, event);
            // After Bootstrap has had a tick to position the dropdown,
            // report what actually rendered. If the dropdown is missing or
            // off-screen we can see that here without DevTools.
            setTimeout(() => {
                // openAt() reparents the dropdown to <body> to escape any
                // ancestor clip/overflow, so look there — not inside
                // `this.menu.element`.
                const dm = document.querySelector('.dropdown-menu.show');
                const el = this.parent?.element?.querySelector('[data-debug="right-click"]');
                if (!el) return;
                if (!dm) { el.textContent += ' | not opened'; return; }
                const r = dm.getBoundingClientRect();
                el.textContent += ` | open @ ${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}`;
            }, 50);
            return this.row;
        }, { menu: this.menu });
    }

    onActionView()      { this.onLog('view',      this.row); }
    onActionEdit()      { this.onLog('edit',      this.row); }
    onActionDuplicate() { this.onLog('duplicate', this.row); }
    onActionDelete()    { this.onLog('delete',    this.row); }

    static TEMPLATE = `
        <div class="d-flex align-items-center justify-content-between position-relative">
            <div>
                <strong>{{row.name}}</strong>
                <div class="text-muted small">
                    <i class="bi bi-mouse2"></i> Right-click anywhere on this row
                </div>
            </div>
            <span class="badge text-bg-light">{{row.id}}</span>
            <!-- Off-screen wrapper for the ContextMenu's invisible trigger
                 button. We avoid d-none (display:none would suppress the
                 dropdown menu render) and visually-hidden (clip:rect(0,0,0,0)
                 + overflow:hidden clips the popped-out menu paint even though
                 Popper places it at the cursor). Off-screen positioning
                 hides the trigger without clipping descendants; openAt then
                 repositions the trigger to fixed-at-cursor when shown. -->
            <div data-container="row-menu" style="position:absolute; left:-9999px; top:0;"></div>
        </div>
    `;
}

class ContextMenuRowExample extends Page {
    static pageName = 'components/context-menu/row';
    static route = 'components/context-menu/row';

    constructor(options = {}) {
        super({
            ...options,
            pageName: ContextMenuRowExample.pageName,
            route: ContextMenuRowExample.route,
            title: 'ContextMenu — right-click row',
            template: ContextMenuRowExample.TEMPLATE,
        });
        this.lastAction = '(no action yet)';
        this.lastRightClick = '(none yet)';
        this.rows = [
            { id: 'apollo',   name: 'Project Apollo' },
            { id: 'borealis', name: 'Project Borealis' },
            { id: 'cyclone',  name: 'Project Cyclone' },
            { id: 'delta',    name: 'Project Delta' },
            { id: 'eclipse',  name: 'Project Eclipse' },
            { id: 'fusion',   name: 'Project Fusion' },
        ];
    }

    async onInit() {
        await super.onInit();
        // Light a console flag too so menu-item dispatch is traceable when
        // the user opens DevTools.
        ContextMenu.DEBUG = true;

        const log = (action, row) => {
            this.lastAction = `${action} → ${row.name} (${row.id})`;
            this.render();
        };
        const logRightClick = (row, event) => {
            // Update the DOM directly — calling this.render() here would
            // tear down the row whose contextmenu just fired, killing the
            // dropdown before Bootstrap can show it.
            this.lastRightClick = `${row.name} @ (${event.clientX}, ${event.clientY})`;
            const el = this.element?.querySelector('[data-debug="right-click"]');
            if (el) el.textContent = this.lastRightClick;
        };
        for (const row of this.rows) {
            this.addChild(new RowWithContextMenu({
                containerId: `row-${row.id}`,
                row,
                onLog: log,
                onRightClick: logRightClick,
            }));
        }
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>ContextMenu — right-click row</h1>
            <p class="example-summary">
                Variant where the menu is attached to the row itself — right-click anywhere on a row to open it.
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
                    <div><small class="text-muted">Last right-click: <strong data-debug="right-click">{{lastRightClick}}</strong></small></div>
                    <div><small class="text-muted">Last action: <strong>{{lastAction}}</strong></small></div>
                </div>
            </div>
        </div>
    `;
}

export default ContextMenuRowExample;
