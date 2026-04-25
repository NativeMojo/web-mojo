import { Page } from 'web-mojo';

/**
 * WebAppExample — minimal WebApp setup (reference, not a live mount).
 *
 * Doc:    docs/web-mojo/core/WebApp.md
 * Route:  core/web-app
 *
 * The parent portal you are looking at is already a PortalWebApp, so this
 * page can't construct another live app on top of it. Instead it shows
 * the canonical setup as a copy-pasteable code block, then drives a few
 * action handlers against the running app via `this.getApp()` to prove
 * the real surface — `app.events`, `app.rest`, `app.showInfo`, page
 * navigation — is what the snippet describes.
 */
class WebAppExample extends Page {
    static pageName = 'core/web-app';
    static route = 'core/web-app';

    constructor(options = {}) {
        super({
            ...options,
            pageName: WebAppExample.pageName,
            route: WebAppExample.route,
            title: 'WebApp — minimal setup',
            template: WebAppExample.TEMPLATE,
        });

        this.snippet = `import { WebApp } from 'web-mojo';
import HomePage from './pages/HomePage.js';
import UsersPage from './pages/UsersPage.js';

const app = new WebApp({
    name: 'My App',
    container: '#app',
    defaultRoute: 'home',
    api: { baseURL: 'https://api.example.com' },
});

app
    .registerPage('home',  HomePage)
    .registerPage('users', UsersPage, { route: '/users' });

await app.start();`;
    }

    onActionPing() {
        const app = this.getApp();
        if (!app) return;
        app.events.emit('demo:ping', { from: 'WebAppExample' });
        app.showInfo?.('Emitted demo:ping on app.events. Open devtools to subscribe.');
    }

    onActionGoHome() {
        const app = this.getApp();
        if (app && app.navigateToDefault) app.navigateToDefault();
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>WebApp</h1>
            <p class="example-summary">
                Minimal application shell: routing, page registry, REST client, and a global event bus.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="https://github.com/NativeMojo/web-mojo/blob/main/docs/web-mojo/core/WebApp.md" target="_blank">
                    docs/web-mojo/core/WebApp.md
                </a>
            </p>

            <div class="card mb-3">
                <div class="card-body">
                    <h5 class="card-title">Canonical setup</h5>
                    <p class="text-muted small mb-2">
                        Construct, register pages, then <code>start()</code>. Pages must be registered
                        before <code>start()</code> so the router can resolve the initial URL.
                    </p>
                    {{{snippet|code:'javascript'}}}
                </div>
            </div>

            <div class="card">
                <div class="card-body">
                    <h5 class="card-title">Talk to the running app</h5>
                    <p class="text-muted small mb-3">
                        This page is hosted in a real <code>PortalWebApp</code>. Use
                        <code>this.getApp()</code> from any view to reach the same surface.
                    </p>
                    <div class="d-flex gap-2 flex-wrap">
                        <button class="btn btn-sm btn-outline-primary" data-action="ping">
                            <i class="bi bi-broadcast"></i> Emit on app.events
                        </button>
                        <button class="btn btn-sm btn-outline-secondary" data-action="go-home">
                            <i class="bi bi-house"></i> navigateToDefault()
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export default WebAppExample;
