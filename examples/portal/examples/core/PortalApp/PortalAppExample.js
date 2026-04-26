import { Page } from 'web-mojo';

/**
 * PortalAppExample — PortalApp with sidebar/topbar (reference page).
 *
 * Doc:    docs/web-mojo/core/PortalApp.md
 * Route:  core/portal-app
 *
 * PortalApp adds a sidebar, topbar, and authentication/group plumbing on
 * top of WebApp. The portal hosting these examples is already a portal
 * app, so this page documents the canonical constructor and surfaces a
 * few of the helpers (`app.toast`, portal actions, group helpers) you
 * would actually use from a page.
 */
class PortalAppExample extends Page {
    static pageName = 'core/portal-app';
    static route = 'core/portal-app';

    constructor(options = {}) {
        super({
            ...options,
            pageName: PortalAppExample.pageName,
            route: PortalAppExample.route,
            title: 'PortalApp — portal shell',
            template: PortalAppExample.TEMPLATE,
        });

        this.snippet = `import { PortalApp } from 'web-mojo';
import HomePage from './pages/HomePage.js';
import UsersPage from './pages/UsersPage.js';

const app = new PortalApp({
    name: 'Acme Portal',
    container: '#app',
    defaultRoute: 'home',
    api: { baseURL: 'https://api.acme.com' },
    sidebar: {
        menu: [
            { label: 'Home',  icon: 'bi-house',  route: 'home' },
            { label: 'Users', icon: 'bi-people', route: 'users' },
        ],
    },
    topbar: { brandText: 'Acme Portal', brandIcon: 'bi-lightning' },
});

app
    .registerPage('home',  HomePage)
    .registerPage('users', UsersPage, { route: '/users' });

app.events.on('auth:unauthorized', () => {
    window.location.href = '/login';
});

await app.start();`;
    }

    onActionToast() {
        const app = this.getApp();
        if (app && app.toast) app.toast.success('Hello from app.toast');
    }

    onActionToggleSidebar() {
        const app = this.getApp();
        if (app && app.toggleSidebar) app.toggleSidebar();
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>PortalApp</h1>
            <p class="example-summary">
                Adds sidebar, topbar, authentication via TokenManager, multi-tenant active group,
                and toast notifications on top of WebApp.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/core/PortalApp.md">
                    docs/web-mojo/core/PortalApp.md
                </a>
            </p>

            <div class="card mb-3">
                <div class="card-body">
                    <h5 class="card-title">Canonical setup</h5>
                    <p class="text-muted small mb-2">
                        Pass <code>sidebar</code> and <code>topbar</code> config; register pages; call
                        <code>start()</code>. Listen for <code>auth:unauthorized</code> to redirect to
                        a login page.
                    </p>
                    {{{snippet|code:'javascript'}}}
                </div>
            </div>

            <div class="card">
                <div class="card-body">
                    <h5 class="card-title">Portal helpers in this app</h5>
                    <p class="text-muted small mb-3">
                        The hosting portal exposes these to any view via <code>this.getApp()</code>.
                    </p>
                    <div class="d-flex gap-2 flex-wrap">
                        <button class="btn btn-sm btn-outline-primary" data-action="toast">
                            <i class="bi bi-bell"></i> app.toast.success(...)
                        </button>
                        <button class="btn btn-sm btn-outline-secondary" data-action="toggle-sidebar">
                            <i class="bi bi-layout-sidebar"></i> app.toggleSidebar()
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export default PortalAppExample;
