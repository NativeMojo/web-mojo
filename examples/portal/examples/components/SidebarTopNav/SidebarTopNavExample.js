import { Page } from 'web-mojo';

/**
 * SidebarTopNavExample — reference page for portal navigation config.
 *
 * Doc:    docs/web-mojo/components/SidebarTopNav.md
 * Route:  components/sidebar-top-nav
 *
 * The Sidebar and TopNav are owned by `PortalApp` — you don't construct
 * them yourself, you configure them via `new PortalApp({ sidebar, topbar })`.
 * The portal you're running right now is a live PortalApp instance, so the
 * sidebar to your left and the navbar at the top are the actual components.
 *
 * Rather than mount a second copy here, this page documents the shape of
 * the config and demonstrates the runtime API on `app.sidebar` / `app.topnav`
 * with a few buttons that drive the live portal chrome.
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
        this.log('app.sidebar.collapse() — sidebar collapsed to icon strip');
    }

    onActionExpand() {
        this.getApp().sidebar?.expand();
        this.log('app.sidebar.expand() — sidebar restored');
    }

    onActionToggle() {
        this.getApp().sidebar?.toggleSidebar();
        this.log('app.sidebar.toggleSidebar() — toggled');
    }

    onActionPulse() {
        this.getApp().sidebar?.pulseToggle();
        this.log('app.sidebar.pulseToggle() — toggle button pulsed');
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>Sidebar &amp; TopNav</h1>
            <p class="example-summary">
                Portal chrome — configure via <code>PortalApp({ sidebar, topbar })</code>, then drive the live
                instances through <code>app.sidebar</code> and <code>app.topnav</code>.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="https://github.com/NativeMojo/web-mojo/blob/main/docs/web-mojo/components/SidebarTopNav.md" target="_blank">
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
                    </div>
                    <small class="text-muted">{{status}}</small>
                </div>
            </div>

            <div class="card">
                <div class="card-header">Config shape — for reference</div>
                <div class="card-body">
                    <pre class="mb-0 small"><code>new PortalApp({
  sidebar: {
    menus: [{
      name: 'default',
      header: '&lt;div class="p-3 fw-bold"&gt;My App&lt;/div&gt;',
      items: [
        { text: 'Dashboard', route: '?page=dashboard', icon: 'bi-speedometer2' },
        { text: 'Settings',  route: '?page=settings',  icon: 'bi-gear' },
      ]
    }]
  },
  topbar: {
    brand: 'My App',
    brandIcon: 'bi bi-play-circle',
    theme: 'dark',
    showSidebarToggle: true,
    rightItems: [{
      id: 'user',
      label: 'Account',
      icon: 'bi-person-circle',
      items: [
        { label: 'Profile', icon: 'bi-person',         action: 'profile' },
        { label: 'Logout',  icon: 'bi-box-arrow-right', action: 'logout' },
      ]
    }]
  }
});</code></pre>
                </div>
            </div>
        </div>
    `;
}

export default SidebarTopNavExample;
