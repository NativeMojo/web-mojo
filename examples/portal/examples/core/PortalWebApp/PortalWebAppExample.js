import { Page } from 'web-mojo';

/**
 * PortalWebAppExample — opinionated portal with auth-gated lifecycle.
 *
 * Doc:    docs/web-mojo/core/PortalWebApp.md
 * Route:  core/portal-web-app
 *
 * PortalWebApp wires up the full portal lifecycle: token check → user
 * load → group load → WebSocket → router → page. Authentication failure
 * flips to a countdown redirect to `auth.loginUrl`. WebSocket events are
 * bridged to the app EventBus as `ws:ready`, `ws:lost`, `ws:reconnecting`.
 *
 * This page renders the canonical config and demonstrates subscribing to
 * the lifecycle events on the host app — the surface code in production
 * uses every day.
 */
class PortalWebAppExample extends Page {
    static pageName = 'core/portal-web-app';
    static route = 'core/portal-web-app';

    constructor(options = {}) {
        super({
            ...options,
            pageName: PortalWebAppExample.pageName,
            route: PortalWebAppExample.route,
            title: 'PortalWebApp — auth-gated portal',
            template: PortalWebAppExample.TEMPLATE,
        });

        this.eventLog = [];
        this.snippet = `import { PortalWebApp } from 'web-mojo';
import HomePage from './pages/HomePage.js';

const app = new PortalWebApp({
    name: 'Acme Portal',
    container: '#app',
    defaultRoute: 'home',
    api: { baseUrl: 'https://api.acme.com' },
    auth: { loginUrl: '/login', redirectDelay: 3000 },
    ws: true,
    sidebar: { menu: [{ label: 'Home', icon: 'bi-house', route: 'home' }] },
    topbar: { brandText: 'Acme Portal' },
});

app.registerPage('home', HomePage);

app.events.on('user:ready', ({ user }) => console.log('Logged in', user.get('email')));
app.events.on('ws:ready', () => console.log('WebSocket connected'));

const result = await app.start();   // { success, user } | { success: false, error }`;
    }

    async onInit() {
        await super.onInit();
        const app = this.getApp();
        if (!app || !app.events) return;

        // Subscribe to the headline lifecycle events. We unsubscribe on exit
        // so re-entering the page doesn't double-bind.
        this._handlers = {
            'user:ready':       () => this._record('user:ready'),
            'ws:ready':         () => this._record('ws:ready'),
            'ws:lost':          () => this._record('ws:lost'),
            'ws:reconnecting':  () => this._record('ws:reconnecting'),
            'app:ready':        () => this._record('app:ready'),
        };
        for (const [name, fn] of Object.entries(this._handlers)) app.events.on(name, fn);
    }

    async onExit() {
        const app = this.getApp();
        if (app && app.events && this._handlers) {
            for (const [name, fn] of Object.entries(this._handlers)) app.events.off(name, fn);
        }
        await super.onExit?.();
    }

    _record(name) {
        this.eventLog.unshift(`${new Date().toLocaleTimeString()} — ${name}`);
        this.eventLog = this.eventLog.slice(0, 8);
        if (this.isActive) this.render();
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>PortalWebApp</h1>
            <p class="example-summary">
                Opinionated portal: auth-gated router, automatic WebSocket, countdown redirect on
                auth failure, and a clean lifecycle event stream.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/core/PortalWebApp.md">
                    docs/web-mojo/core/PortalWebApp.md
                </a>
            </p>

            <div class="card mb-3">
                <div class="card-body">
                    <h5 class="card-title">Canonical setup</h5>
                    {{{snippet|code:'javascript'}}}
                </div>
            </div>

            <div class="card">
                <div class="card-body">
                    <h5 class="card-title">Live lifecycle events</h5>
                    <p class="text-muted small mb-2">
                        Subscribed in <code>onInit()</code>, removed in <code>onExit()</code>. Events
                        already fired before this page mounted will not appear here — open the page
                        before reload to see <code>app:ready</code>.
                    </p>
                    <ul class="list-unstyled small mb-0">
                        {{#eventLog}}<li class="text-muted">{{.}}</li>{{/eventLog}}
                        {{^eventLog|bool}}<li class="text-muted fst-italic">Waiting for events…</li>{{/eventLog|bool}}
                    </ul>
                </div>
            </div>
        </div>
    `;
}

export default PortalWebAppExample;
