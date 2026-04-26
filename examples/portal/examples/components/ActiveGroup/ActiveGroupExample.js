import { Page, Group } from 'web-mojo';

/**
 * ActiveGroupExample — demonstrates `app.activeGroup` and group-scoped sidebar menus.
 *
 * Doc:    docs/web-mojo/components/SidebarTopNav.md
 * Route:  components/active-group
 *
 * `PortalApp` carries an `activeGroup` (a `Group` model) that scopes the
 * portal's UI to a single org / team / merchant / etc. The sidebar reads it
 * to decide which menus to show: a menu declared with `groupKind: 'team'`
 * only renders when `app.activeGroup.kind === 'team'`. Switching the group
 * fires `app.events.emit('group:changed', ...)` and triggers the sidebar to
 * pick a matching menu.
 *
 * The page:
 *   1. Registers three demo group-scoped menus on `app.sidebar` (org / team
 *      / merchant). Each is a one-shot for this example — they are removed
 *      again in `onExit()` so the host portal returns to its normal config.
 *   2. Provides Activate-{kind} buttons that call `app.setActiveGroup(...)`
 *      with a mock `Group` model and immediately switch the sidebar to the
 *      matching menu. The activity log records each `group:changed` event.
 *   3. Shows the current active group in a status card and a "Clear group"
 *      button that calls `app.clearActiveGroup()`.
 *
 * Sidebar and TopNav are SEPARATE classes — they don't share a base — but
 * both observe `app.activeGroup`. The TopNav's `displayMode: 'group'` /
 * `'group_page_titles'` shows the group name in the navbar; the sidebar
 * filters menus by `groupKind`. This page exercises the sidebar side; the
 * topnav observation is documented but not toggled (changing topbar mode
 * mid-session would replace the whole topbar config).
 */
class ActiveGroupExample extends Page {
    static pageName = 'components/active-group';
    static route = 'components/active-group';

    constructor(options = {}) {
        super({
            ...options,
            pageName: ActiveGroupExample.pageName,
            route: ActiveGroupExample.route,
            title: 'Sidebar + Active Group',
            template: ActiveGroupExample.TEMPLATE,
        });
        this.log = [];
        this.demoMenus = ['demo-org', 'demo-team', 'demo-merchant'];
    }

    // ── Lifecycle ──────────────────────────────────────────────────────

    async onEnter() {
        await super.onEnter();
        const app = this.getApp();

        // Remember what to restore on exit.
        this._previousMenu = app.sidebar?.activeMenuName || 'hub';
        this._previousGroup = app.activeGroup;

        // Register three group-scoped menus. Sidebar.addMenu() stores the
        // config; once the activeGroup matches, it auto-switches via the
        // `groupKind` matcher.
        app.sidebar?.addMenu('demo-org', this._buildDemoMenu('org'));
        app.sidebar?.addMenu('demo-team', this._buildDemoMenu('team'));
        app.sidebar?.addMenu('demo-merchant', this._buildDemoMenu('merchant'));

        // Subscribe to group lifecycle. Re-render so the status card reflects
        // the new active group; append to the activity log.
        this._onChange = ({ group }) => {
            this._pushLog(`group:changed → ${group?.get('name')} (kind: ${group?.get('kind')})`);
            this.render();
        };
        this._onCleared = () => {
            this._pushLog('group:cleared');
            this.render();
        };
        app.events.on('group:changed', this._onChange);
        app.events.on('group:cleared', this._onCleared);
    }

    async onExit() {
        const app = this.getApp();
        app.events.off?.('group:changed', this._onChange);
        app.events.off?.('group:cleared', this._onCleared);

        // Drop the demo menus and clear active group so the host portal
        // is exactly as we found it.
        for (const name of this.demoMenus) {
            app.sidebar?.menus?.delete(name);
        }
        if (app.activeGroup && !this._previousGroup) {
            await app.clearActiveGroup();
        }
        if (this._previousMenu && this._previousMenu !== app.sidebar?.activeMenuName) {
            await app.sidebar?.setActiveMenu(this._previousMenu);
        }

        // Close any open group-search UI BEFORE we restore mode — Sidebar's
        // hideGroupSearch() branches on the current `groupSelectorMode`,
        // and we want to hit whichever branch matches what we opened.
        if (app.sidebar?.groupSelectorDialog) app.sidebar.groupSelectorDialog.hide();
        if (app.sidebar?.showSearch) app.sidebar.hideGroupSearch();

        // Restore the host's groupSelectorMode if we changed it.
        if (this._previousSelectorMode !== undefined && app.sidebar) {
            app.sidebar.groupSelectorMode = this._previousSelectorMode;
            this._previousSelectorMode = undefined;
        }

        await super.onExit();
    }

    // ── Actions ────────────────────────────────────────────────────────

    onActionActivateOrg()      { return this._activate(11); }
    onActionActivateTeam()     { return this._activate(21); }
    onActionActivateMerchant() { return this._activate(31); }

    async onActionClearGroup() {
        const app = this.getApp();
        await app.clearActiveGroup();
        // Sidebar doesn't auto-revert to the hub menu when group clears —
        // the active menu stays. Push it back to the hub for clarity.
        await app.sidebar?.setActiveMenu(this._previousMenu || 'hub');
    }

    onActionClearLog() {
        this.log = [];
        this.render();
    }

    /**
     * Open the Sidebar's group-search dialog. The dialog mounts a
     * `GroupSearchView` that fetches `/api/group` (GroupList), renders the
     * tree with `kind` badges, and emits `item:selected` when the user
     * picks one — Sidebar listens and calls `app.setActiveGroup(model)`,
     * which triggers our existing `group:changed` log + status update.
     */
    async onActionOpenGroupDialog() {
        const sidebar = this.getApp().sidebar;
        if (!sidebar) return;
        // groupSelectorMode is read on every showGroupSearch() call, so we
        // can flip it at runtime. Save the previous value to restore in
        // onExit, in case the host portal had configured 'inline'.
        if (this._previousSelectorMode === undefined) {
            this._previousSelectorMode = sidebar.groupSelectorMode;
        }
        sidebar.groupSelectorMode = 'dialog';
        sidebar.showGroupSearch();
    }

    /**
     * Inline mode replaces the sidebar's menu with the GroupSearchView
     * in-place — same component, different mount target. Useful when the
     * sidebar is the natural home for group switching.
     */
    onActionOpenGroupInline() {
        const sidebar = this.getApp().sidebar;
        if (!sidebar) return;
        if (this._previousSelectorMode === undefined) {
            this._previousSelectorMode = sidebar.groupSelectorMode;
        }
        sidebar.groupSelectorMode = 'inline';
        sidebar.showGroupSearch();
    }

    /**
     * Try to open a group-scoped menu *without* a current group — Sidebar
     * automatically pops the group selector (in whichever mode is
     * configured) and queues the menu for after selection. This is the
     * canonical flow when the user clicks a sidebar item that requires
     * group scope.
     */
    async onActionTryGroupMenu() {
        const app = this.getApp();
        if (app.activeGroup) await app.clearActiveGroup();
        await app.sidebar?.setActiveMenu('demo-team');
    }

    async _activate(id) {
        const app = this.getApp();
        const fixture = MOCK_GROUPS.find(g => g.id === id);
        const group = new Group(fixture);
        await app.setActiveGroup(group);
        // Auto-switch the sidebar to the matching demo menu.
        await app.sidebar?.setActiveMenu(`demo-${fixture.kind}`);
    }

    // ── Helpers ────────────────────────────────────────────────────────

    _buildDemoMenu(kind) {
        const items = DEMO_MENU_ITEMS[kind] || [];
        return {
            name: `demo-${kind}`,
            groupKind: kind,
            className: 'sidebar sidebar-dark',
            header: `<div class="pt-3 text-center fs-5 fw-bold sidebar-collapse-hide">`
                  + `<i class="bi ${KIND_META[kind].icon} pe-2"></i>${KIND_META[kind].label}</div>`,
            items: [
                ...items,
                { spacer: true },
                {
                    text: 'Back to Examples',
                    icon: 'bi-arrow-bar-left',
                    action: 'back-to-hub',
                    handler: async () => {
                        await this.getApp().clearActiveGroup();
                        await this.getApp().sidebar?.setActiveMenu(this._previousMenu || 'hub');
                    },
                },
            ],
        };
    }

    _pushLog(line) {
        const ts = new Date().toLocaleTimeString();
        this.log.unshift(`${ts}  ${line}`);
        if (this.log.length > 8) this.log.length = 8;
    }

    // ── Template-facing computed properties ────────────────────────────

    get currentGroup() {
        const g = this.getApp().activeGroup;
        if (!g) return null;
        return {
            id: g.get('id'),
            name: g.get('name'),
            kind: g.get('kind'),
            kindLabel: KIND_META[g.get('kind')]?.label || g.get('kind'),
        };
    }

    get logLines() {
        return this.log.length ? this.log : ['(no events yet)'];
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>Sidebar + Active Group</h1>
            <p class="example-summary">
                <code>app.activeGroup</code> scopes the portal to one org / team / merchant.
                The sidebar's <code>groupKind</code> menu filter swaps the visible menu when
                the group changes; both Sidebar and TopNav observe <code>app.activeGroup</code>.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/components/SidebarTopNav.md">
                    docs/web-mojo/components/SidebarTopNav.md
                </a>
            </p>

            <div class="card mb-3">
                <div class="card-header">Switch active group</div>
                <div class="card-body">
                    <p class="text-muted small mb-2">
                        Each button calls <code>app.setActiveGroup(group)</code> and switches
                        the sidebar to a demo menu declared with <code>groupKind: 'org' | 'team' | 'merchant'</code>.
                        Watch the sidebar swap on the left.
                    </p>
                    <div class="d-flex flex-wrap gap-2 mb-3">
                        <button class="btn btn-outline-primary" data-action="activate-org">
                            <i class="bi bi-building"></i> Activate Acme Corp <span class="badge text-bg-secondary ms-1">org</span>
                        </button>
                        <button class="btn btn-outline-primary" data-action="activate-team">
                            <i class="bi bi-people"></i> Activate Engineering <span class="badge text-bg-secondary ms-1">team</span>
                        </button>
                        <button class="btn btn-outline-primary" data-action="activate-merchant">
                            <i class="bi bi-shop"></i> Activate Pizza Palace <span class="badge text-bg-secondary ms-1">merchant</span>
                        </button>
                        <button class="btn btn-outline-secondary" data-action="clear-group">
                            <i class="bi bi-x-circle"></i> Clear group
                        </button>
                    </div>
                </div>
            </div>

            <div class="row g-3 mb-3">
                <div class="col-md-6">
                    <div class="card h-100">
                        <div class="card-header">Current <code>app.activeGroup</code></div>
                        <div class="card-body">
                            {{#currentGroup}}
                            <dl class="row mb-0 small">
                                <dt class="col-sm-4">Name</dt>
                                <dd class="col-sm-8"><strong>{{name}}</strong></dd>
                                <dt class="col-sm-4">Kind</dt>
                                <dd class="col-sm-8"><code>{{kind}}</code> &mdash; {{kindLabel}}</dd>
                                <dt class="col-sm-4">ID</dt>
                                <dd class="col-sm-8"><code>{{id}}</code></dd>
                                <dt class="col-sm-4">Sidebar menu</dt>
                                <dd class="col-sm-8"><code>demo-{{kind}}</code></dd>
                            </dl>
                            {{/currentGroup}}
                            {{^currentGroup}}
                            <p class="text-muted mb-0">No active group. Click an Activate button above.</p>
                            {{/currentGroup}}
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card h-100">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <span>Activity log <small class="text-muted">(latest 8)</small></span>
                            <button class="btn btn-sm btn-outline-secondary" data-action="clear-log">Clear</button>
                        </div>
                        <div class="card-body">
                            <ul class="list-unstyled small font-monospace mb-0">
                                {{#logLines}}
                                <li>{{.}}</li>
                                {{/logLines}}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card mb-3">
                <div class="card-header">Group selector &mdash; let the user pick</div>
                <div class="card-body">
                    <p class="text-muted small mb-2">
                        The Sidebar ships with a <code>GroupSearchView</code> for group selection.
                        Mode is configured via <code>sidebar.groupSelectorMode: 'dialog' | 'inline'</code>.
                        Either mode emits <code>'item:selected'</code> &rarr; Sidebar calls
                        <code>app.setActiveGroup(model)</code> &rarr; same <code>group:changed</code>
                        flow as the buttons above.
                    </p>
                    <div class="d-flex flex-wrap gap-2 mb-3">
                        <button class="btn btn-outline-primary" data-action="open-group-dialog">
                            <i class="bi bi-search"></i> Open dialog selector
                        </button>
                        <button class="btn btn-outline-primary" data-action="open-group-inline">
                            <i class="bi bi-layout-sidebar-inset"></i> Open inline selector (in sidebar)
                        </button>
                        <button class="btn btn-outline-warning" data-action="try-group-menu">
                            <i class="bi bi-shield-exclamation"></i> Try a group menu w/ no group
                        </button>
                    </div>
                    <p class="small text-muted mb-2">
                        Last button calls <code>setActiveMenu('demo-team')</code> with no
                        active group &mdash; Sidebar auto-pops the selector and queues the menu for
                        after selection. This is the canonical user flow when clicking a sidebar
                        item that requires group scope.
                    </p>
                    <pre class="mb-0 small"><code>// Topbar option &mdash; drop into rightItems for a navbar group switcher.
topbar: {
  rightItems: [
    { type: 'group-selector', id: 'group-selector' },
    // ... other items
  ],
}

// Sidebar option &mdash; controls which UI the sidebar uses.
sidebar: {
  groupSelectorMode: 'dialog',  // 'inline' (default) | 'dialog'
  // ...
}

// Programmatic &mdash; open the selector from anywhere.
app.sidebar.showGroupSearch();   // uses the configured mode
app.sidebar.hideGroupSearch();   // close it</code></pre>
                </div>
            </div>

            <div class="card mb-3">
                <div class="card-header">Sidebar config &mdash; menus by group kind</div>
                <div class="card-body">
                    <p class="text-muted small mb-2">
                        Three patterns for the <code>groupKind</code> filter:
                    </p>
                    <pre class="mb-0 small"><code>sidebar: {
  defaultMenu: 'hub',
  menus: [
    { name: 'hub', items: [ /* always-visible items */ ] },

    // Single-kind menu &mdash; only renders when activeGroup.kind === 'team'.
    { name: 'team-menu',     groupKind: 'team',     items: [ /* ... */ ] },

    // Multi-kind menu &mdash; renders for any of these kinds.
    { name: 'business-menu', groupKind: ['org', 'merchant'], items: [ /* ... */ ] },

    // 'any' &mdash; renders whenever an activeGroup exists, regardless of kind.
    { name: 'group-default', groupKind: 'any',      items: [ /* ... */ ] },
  ],
}</code></pre>
                </div>
            </div>

            <div class="card mb-3">
                <div class="card-header">Lifecycle &mdash; activate / change / clear</div>
                <div class="card-body">
                    <pre class="mb-0 small"><code>// Set the active group. PortalApp:
//   1. saves the id to localStorage,
//   2. updates the URL (?group=...),
//   3. fetches the active user's Member record for the group (permissions),
//   4. emits 'group:changed' on app.events,
//   5. calls onGroupChange() on the current page.
await app.setActiveGroup(group);

// Subscribe anywhere &mdash; sidebar already does, so does TopNav (group displayMode).
app.events.on('group:changed', ({ group, previousGroup }) =&gt; {
    console.log('switched from', previousGroup?.get('name'), 'to', group.get('name'));
});

// Clear it &mdash; emits 'group:cleared'.
await app.clearActiveGroup();</code></pre>
                </div>
            </div>

            <div class="card">
                <div class="card-header">TopNav &mdash; how it sees the group</div>
                <div class="card-body">
                    <p class="mb-2">
                        TopNav and Sidebar are separate classes &mdash; both extend <code>View</code>
                        directly &mdash; but both read <code>app.activeGroup</code>.
                    </p>
                    <ul class="mb-2">
                        <li><strong>Sidebar.</strong> Filters <code>menus[].groupKind</code> against
                            <code>activeGroup.kind</code>. Mounts a <code>GroupSearchView</code> when a
                            group-scoped menu is activated without a current group.</li>
                        <li><strong>TopNav.</strong> Configure <code>topbar.displayMode: 'group'</code>
                            (or <code>'group_page_titles'</code>) to show the active group's name in the
                            navbar. Drop <code>{ type: 'group-selector' }</code> into
                            <code>topbar.rightItems</code> for a navbar group switcher.</li>
                    </ul>
                    <p class="small text-muted mb-0">
                        This portal is configured with the default <code>displayMode</code>, so the
                        navbar title doesn't change &mdash; but the sidebar swap above is real.
                    </p>
                </div>
            </div>
        </div>
    `;
}

// ── Demo data ──────────────────────────────────────────────────────────

const KIND_META = {
    org:      { label: 'Organization', icon: 'bi-building' },
    team:     { label: 'Team',         icon: 'bi-people' },
    merchant: { label: 'Merchant',     icon: 'bi-shop' },
};

const MOCK_GROUPS = [
    { id: 11, name: 'Acme Corp',    kind: 'org' },
    { id: 21, name: 'Engineering',  kind: 'team' },
    { id: 31, name: 'Pizza Palace', kind: 'merchant' },
];

const DEMO_MENU_ITEMS = {
    org: [
        { kind: 'label', text: 'Org', className: 'sidebar-section-label' },
        { text: 'Overview',     route: '?page=components/active-group', icon: 'bi-house' },
        { text: 'Members',      icon: 'bi-people',      action: 'noop' },
        { text: 'Billing',      icon: 'bi-credit-card', action: 'noop' },
        { text: 'Settings',     icon: 'bi-sliders',     action: 'noop' },
    ],
    team: [
        { kind: 'label', text: 'Team', className: 'sidebar-section-label' },
        { text: 'Overview',     route: '?page=components/active-group', icon: 'bi-house' },
        { text: 'Roster',       icon: 'bi-person-lines-fill', action: 'noop' },
        { text: 'Sprints',      icon: 'bi-kanban',            action: 'noop',
          badge: { text: '3', class: 'bg-primary' } },
        { text: 'Standups',     icon: 'bi-mic',               action: 'noop' },
    ],
    merchant: [
        { kind: 'label', text: 'Merchant', className: 'sidebar-section-label' },
        { text: 'Overview',     route: '?page=components/active-group', icon: 'bi-house' },
        { text: 'Storefront',   icon: 'bi-shop-window',  action: 'noop' },
        { text: 'Inventory',    icon: 'bi-boxes',        action: 'noop' },
        { text: 'Orders',       icon: 'bi-bag-check',    action: 'noop',
          badge: { text: '12', class: 'bg-warning' } },
        { text: 'Payouts',      icon: 'bi-bank',         action: 'noop' },
    ],
};

export default ActiveGroupExample;
