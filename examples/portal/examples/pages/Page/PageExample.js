import { Page } from 'web-mojo';

/**
 * PageExample — canonical demo of the Page base class.
 *
 * Doc:    docs/web-mojo/pages/Page.md
 * Route:  pages/page
 *
 * Page adds routing + per-visit lifecycle on top of View:
 *   1. onInit() runs ONCE per cached instance — wire up child views here.
 *   2. onEnter() / onExit() fire on every visit — fetch data, set timers.
 *   3. onParams(params, query) populates this.params / this.query before onEnter.
 *   4. canEnter() returns false to block navigation (redirects to 'denied').
 *
 * Leave the page and come back — onInit stays at 1, onEnter grows.
 * Try `?page=pages/page&demo=hello` to see the query panel update.
 */
class PageExample extends Page {
    static pageName = 'pages/page';
    static route = 'pages/page';

    constructor(options = {}) {
        super({
            ...options,
            pageName: PageExample.pageName,
            route: PageExample.route,
            title: 'Page — lifecycle, params, permissions',
            template: PageExample.TEMPLATE,
        });
        this.initCount = 0;
        this.enterCount = 0;
        this.exitCount = 0;
        this.permissionLocked = false;
    }

    async onInit() {
        await super.onInit();
        this.initCount = 1; // never increments — onInit runs once per instance.
    }

    async onEnter() {
        await super.onEnter();
        this.enterCount++;
        await this.render();
    }

    async onExit() {
        this.exitCount++;
        await super.onExit(); // super captures form/scroll state — call it last.
    }

    async onParams(params, query) {
        await super.onParams(params, query);
        this.paramsJson = JSON.stringify(params || {}, null, 2);
        this.queryJson = JSON.stringify(query || {}, null, 2);
    }

    // Toggleable permission — in a real app, returning false bounces the user
    // to the configured 'denied' page. Here we just surface the flag in the UI.
    canEnter() { return !this.permissionLocked; }

    onActionTogglePermission() {
        this.permissionLocked = !this.permissionLocked;
        this.render();
    }

    onActionPokeUrl() {
        // updateBrowserUrl writes the address bar without triggering a nav.
        const next = (parseInt(this.query?.poked, 10) || 0) + 1;
        this.updateBrowserUrl({ poked: String(next) }, /* replace= */ true);
        this.queryJson = JSON.stringify({ ...this.query, poked: String(next) }, null, 2);
        this.render();
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>Page</h1>
            <p class="example-summary">
                Routed screen base — onEnter/onExit/onParams, URL params, permission guard,
                automatic state preservation across visits.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/pages/Page.md">
                    docs/web-mojo/pages/Page.md
                </a>
            </p>

            <div class="card mb-3"><div class="card-body">
                <h5 class="card-title">Lifecycle counters</h5>
                <p class="text-muted small mb-2">
                    Navigate away and back. onInit stays at 1; onEnter/onExit grow.
                </p>
                <ul class="list-unstyled mb-0">
                    <li>onInit: <strong>{{initCount}}</strong></li>
                    <li>onEnter: <strong>{{enterCount}}</strong></li>
                    <li>onExit: <strong>{{exitCount}}</strong></li>
                </ul>
            </div></div>

            <div class="card mb-3"><div class="card-body">
                <h5 class="card-title">Route params &amp; query</h5>
                <pre class="bg-light p-2 mb-2 small"><code>params: {{paramsJson}}
query:  {{queryJson}}</code></pre>
                <button class="btn btn-sm btn-outline-primary" data-action="poke-url">
                    <i class="bi bi-link-45deg"></i> Add ?poked=N (no navigation)
                </button>
            </div></div>

            <div class="card"><div class="card-body">
                <h5 class="card-title">canEnter() — permission guard</h5>
                <p class="mb-2">Status:
                    {{#permissionLocked|bool}}<span class="badge text-bg-danger">locked</span>{{/permissionLocked|bool}}
                    {{^permissionLocked|bool}}<span class="badge text-bg-success">allowed</span>{{/permissionLocked|bool}}
                </p>
                <button class="btn btn-outline-secondary" data-action="toggle-permission">
                    <i class="bi bi-shield-lock"></i> Toggle permission
                </button>
            </div></div>
        </div>
    `;
}

export default PageExample;
