import { Page } from 'web-mojo';

/**
 * SidebarTopNavExample — configuration showcase for portal navigation.
 *
 * Doc:    docs/web-mojo/components/SidebarTopNav.md
 * Route:  components/sidebar-top-nav
 *
 * The Sidebar and TopNav are owned by `PortalApp` — you don't construct
 * them yourself, you configure them via `new PortalApp({ sidebar, topbar })`.
 * The portal you're reading right now IS a live PortalApp instance, so the
 * sidebar to your left and the navbar above are the actual components.
 *
 * Rather than mount duplicates, this page:
 *
 *   1. Drives the live components via the runtime API (`app.sidebar.collapse()`, etc.).
 *   2. Documents the canonical config shape — sidebar menus, items, children,
 *      dividers, spacers, badges; topbar brand, rightItems (notifications,
 *      group selector), userMenu, permissions gating.
 *
 * Read-once-and-copy reference for anyone wiring up a new portal.
 */
class SidebarTopNavExample extends Page {
    static pageName = 'components/sidebar-top-nav';
    static route = 'components/sidebar-top-nav';

    constructor(options = {}) {
        super({
            ...options,
            pageName: SidebarTopNavExample.pageName,
            route: SidebarTopNavExample.route,
            title: 'Sidebar & TopNav — portal navigation',
            template: SidebarTopNavExample.TEMPLATE,
        });
        this.status = '(no action yet)';
    }

    log(label) {
        this.status = label;
        this.render();
    }

    onActionCollapse() {
        this.getApp().sidebar?.collapse();
        this.log("app.sidebar.collapse() — collapsed to icon strip");
    }

    onActionExpand() {
        this.getApp().sidebar?.expand();
        this.log("app.sidebar.expand() — restored");
    }

    onActionToggle() {
        this.getApp().sidebar?.toggleSidebar();
        this.log("app.sidebar.toggleSidebar() — toggled");
    }

    onActionPulse() {
        this.getApp().sidebar?.pulseToggle();
        this.log("app.sidebar.pulseToggle() — toggle button pulsed");
    }

    onActionSetActiveDefault() {
        this.getApp().sidebar?.setActiveMenu('default');
        this.log("app.sidebar.setActiveMenu('default') — switched to default menu");
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>Sidebar &amp; TopNav</h1>
            <p class="example-summary">
                Portal chrome — configure via <code>new PortalApp({ sidebar, topbar })</code>, then drive the
                live instances through <code>app.sidebar</code> and <code>app.topnav</code>.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/components/SidebarTopNav.md">
                    docs/web-mojo/components/SidebarTopNav.md
                </a>
            </p>

            <div class="card mb-3">
                <div class="card-header">Drive the live sidebar</div>
                <div class="card-body">
                    <div class="d-flex flex-wrap gap-2 mb-3">
                        <button class="btn btn-outline-primary" data-action="collapse">
                            <i class="bi bi-layout-sidebar-inset"></i> collapse()
                        </button>
                        <button class="btn btn-outline-primary" data-action="expand">
                            <i class="bi bi-layout-sidebar"></i> expand()
                        </button>
                        <button class="btn btn-outline-primary" data-action="toggle">
                            <i class="bi bi-arrow-left-right"></i> toggleSidebar()
                        </button>
                        <button class="btn btn-outline-primary" data-action="pulse">
                            <i class="bi bi-broadcast"></i> pulseToggle()
                        </button>
                        <button class="btn btn-outline-primary" data-action="set-active-default">
                            <i class="bi bi-bookmark-star"></i> setActiveMenu('default')
                        </button>
                    </div>
                    <small class="text-muted">{{status}}</small>
                </div>
            </div>

            <div class="card mb-3">
                <div class="card-header">Sidebar config — full shape</div>
                <div class="card-body">
                    <p class="text-muted small mb-2">
                        Multiple named menus, switched at runtime via <code>app.sidebar.setActiveMenu(name)</code>.
                        Items support <code>route</code>, <code>action</code>, <code>handler</code>, nested
                        <code>children</code>, <code>badge</code>, <code>permissions</code>, plus
                        <code>{ divider: true }</code>, <code>{ spacer: true }</code> and
                        <code>{ kind: 'label', text }</code> entries.
                    </p>
                    <pre class="mb-0 small"><code>sidebar: {
  defaultMenu: 'default',
  groupSelectorMode: 'dialog',         // 'inline' | 'dialog'
  menus: [
    {
      name: 'default',
      className: 'sidebar sidebar-dark',
      header: '&lt;div class="fs-5 fw-bold p-3 collapsed-hidden"&gt;Main&lt;/div&gt;',
      items: [
        { text: 'Home',      route: '?page=home',      icon: 'bi-house' },
        { text: 'Dashboard', route: '?page=dashboard', icon: 'bi-speedometer2' },

        // Nested children render as a collapsible section
        { text: 'Reports', icon: 'bi-graph-up', children: [
            { text: 'Sales',    route: '?page=reports/sales',    icon: 'bi-cash' },
            { text: 'Activity', route: '?page=reports/activity', icon: 'bi-activity',
              badge: { text: '3', class: 'bg-danger' } },
        ]},

        { divider: true },
        { kind: 'label', text: 'Tools', className: 'mt-3' },

        // permissions: hide the item when user lacks the permission
        { text: 'Admin', route: '?page=admin', icon: 'bi-shield',
          permissions: 'view_admin' },

        { spacer: true },     // pushes following items to the bottom

        // action + handler — runs JS instead of routing
        { text: 'Sign out', icon: 'bi-box-arrow-right', action: 'logout',
          handler: async () =&gt; { await app.logout(); } },
      ],
      footer: '&lt;div class="text-center small p-2"&gt;v1.0.0&lt;/div&gt;',
    },
    {
      // A second menu — switch with app.sidebar.setActiveMenu('group_default')
      name: 'group_default',
      groupKind: 'any',
      items: [ /* group-scoped items */ ],
    },
  ],
}</code></pre>
                </div>
            </div>

            <div class="card mb-3">
                <div class="card-header">Topbar config — brand + rightItems + userMenu</div>
                <div class="card-body">
                    <p class="text-muted small mb-2">
                        <code>rightItems</code> render in the navbar — each can be a link, a button (with
                        <code>buttonClass</code>), a dropdown (when <code>items</code> is present), or the
                        special <code>type: 'group-selector'</code>. <code>userMenu</code> is rendered as a
                        dropdown on the far right with the user's avatar and account actions.
                    </p>
                    <pre class="mb-0 small"><code>topbar: {
  brand: 'My Portal',
  brandIcon: 'bi-lightning-charge',
  brandRoute: '?page=home',
  theme: 'dark',                  // 'light' | 'dark' | 'clean' | 'gradient'
  shadow: 'dark',                 // optional drop shadow
  showSidebarToggle: true,        // exposes the toggle in the navbar
  displayMode: 'group',           // 'menu' | 'page' | 'both' | 'group' | 'group_page_titles'

  // Right-side icons / dropdowns / group selector
  rightItems: [
    { type: 'group-selector', id: 'group-selector' },

    { id: 'notifications', icon: 'bi-bell', action: 'notifications',
      tooltip: 'Notifications', buttonClass: 'btn btn-link' },

    { id: 'admin', icon: 'bi-wrench', action: 'open-admin',
      buttonClass: 'btn btn-link', permissions: 'view_admin',
      handler: () =&gt; app.sidebar.setActiveMenu('system') },
  ],

  // The user menu — the framework auto-fills 'label' and 'avatarUrl' from
  // 'app.activeUser'. Items support divider/header/action like rightItems.
  userMenu: {
    label: 'Account',
    icon: 'bi-person-circle',
    items: [
      { header: 'Account' },
      { label: 'Profile',  icon: 'bi-person',       action: 'profile' },
      { label: 'Settings', icon: 'bi-sliders',      action: 'open-settings' },
      { divider: true },
      { label: 'Change password', icon: 'bi-shield-lock', action: 'change-password' },
      { divider: true },
      { label: 'Sign out', icon: 'bi-box-arrow-right',    action: 'logout' },
    ],
  },

  // Optional separate "Login" item shown when there is no active user.
  loginMenu: { id: 'login', icon: 'bi-box-arrow-in-right', href: '/login', label: 'Login' },
}</code></pre>
                </div>
            </div>

            <div class="card">
                <div class="card-header">Patterns to know</div>
                <div class="card-body">
                    <ul class="mb-0">
                        <li><strong>Switching menus.</strong> <code>app.sidebar.setActiveMenu(name)</code>
                            swaps the rendered menu. Pair with <code>handler:</code> on a sidebar item for
                            drill-in/out flows.</li>
                        <li><strong>Permissions.</strong> Both sidebar items and topbar <code>rightItems</code>
                            respect <code>permissions: 'name' | ['a', 'b']</code> — the framework calls
                            <code>app.activeUser.hasPermission(perm)</code> and hides items that fail.</li>
                        <li><strong>Badges.</strong> <code>badge: { text, class }</code> on a sidebar item
                            renders an inline count; the badge hides when the sidebar is collapsed.</li>
                        <li><strong>Dividers / spacers / labels.</strong> <code>{ divider: true }</code> draws
                            a line; <code>{ spacer: true }</code> pushes following items to the bottom;
                            <code>{ kind: 'label', text }</code> adds a non-clickable heading.</li>
                        <li><strong>Group selector.</strong> Drop <code>{ type: 'group-selector' }</code> into
                            <code>topbar.rightItems</code> for a navbar group switcher, or set
                            <code>sidebar.groupSelectorMode: 'dialog'</code> for the sidebar variant.</li>
                    </ul>
                </div>
            </div>
        </div>
    `;
}

export default SidebarTopNavExample;
