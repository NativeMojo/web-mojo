import { Page } from 'web-mojo';

/**
 * TemplatesExample — canonical reference for Mustache template syntax.
 *
 * Doc:    docs/web-mojo/core/Templates.md
 * Route:  core/templates
 *
 * Compact tour of the things you have to get right when writing templates:
 *
 *   1. View instance is the context — `this.title` → `{{title}}`.
 *   2. Boolean checks need `|bool` (otherwise arrays iterate).
 *   3. HTML output needs `{{{ triple braces }}}`.
 *   4. String formatter args need quotes.
 *   5. In array iterations, use `{{.property}}` to access the current item.
 *   6. Object iteration needs `|iter`.
 *
 * Each numbered card shows the syntax and the rendered result side by side.
 */
class TemplatesExample extends Page {
    static pageName = 'core/templates';
    static route = 'core/templates';

    constructor(options = {}) {
        super({
            ...options,
            pageName: TemplatesExample.pageName,
            route: TemplatesExample.route,
            title: 'Templates — Mustache reference',
            template: TemplatesExample.TEMPLATE,
        });

        this.title = 'Templates';
        this.now = new Date().toISOString();
        this.htmlSnippet = '<strong class="text-success">Trusted HTML</strong>';
        this.hasItems = true;
        this.users = [
            { name: 'Alice', role: 'admin' },
            { name: 'Bob',   role: 'editor' },
        ];
        this.settings = { theme: 'dark', locale: 'en-US' };
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>Templates</h1>
            <p class="example-summary">
                Mustache rules you have to get right: <code>|bool</code>, <code>{{{ }}}</code>,
                quoted args, <code>{{.property}}</code> in iterations, <code>|iter</code> for objects.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="https://github.com/NativeMojo/web-mojo/blob/main/docs/web-mojo/core/Templates.md" target="_blank">
                    docs/web-mojo/core/Templates.md
                </a>
            </p>

            <div class="card mb-3">
                <div class="card-body">
                    <h5 class="card-title">1. View instance is the context</h5>
                    <p class="text-muted small mb-2"><code>{{title}}</code> reads <code>this.title</code> from the view.</p>
                    <div class="alert alert-light mb-0">{{title}}</div>
                </div>
            </div>

            <div class="card mb-3">
                <div class="card-body">
                    <h5 class="card-title">2. Boolean check needs <code>|bool</code></h5>
                    <p class="text-muted small mb-2">Without <code>|bool</code>, arrays iterate instead of being a truthy check.</p>
                    {{#hasItems|bool}}
                        <span class="badge text-bg-success">hasItems is true</span>
                    {{/hasItems|bool}}
                    {{^hasItems|bool}}
                        <span class="badge text-bg-secondary">hasItems is false</span>
                    {{/hasItems|bool}}
                </div>
            </div>

            <div class="card mb-3">
                <div class="card-body">
                    <h5 class="card-title">3. HTML output needs <code>{{{ }}}</code></h5>
                    <p class="text-muted small mb-2"><code>{{htmlSnippet}}</code> escapes; <code>{{{htmlSnippet}}}</code> renders.</p>
                    <div>Escaped: <code>{{htmlSnippet}}</code></div>
                    <div class="mt-2">Rendered: {{{htmlSnippet}}}</div>
                </div>
            </div>

            <div class="card mb-3">
                <div class="card-body">
                    <h5 class="card-title">4. Quoted formatter args</h5>
                    <p class="text-muted small mb-2"><code>{{now|date:'YYYY-MM-DD'}}</code> — string args must be quoted.</p>
                    <div>Today: <strong>{{now|date:'YYYY-MM-DD'}}</strong></div>
                </div>
            </div>

            <div class="card mb-3">
                <div class="card-body">
                    <h5 class="card-title">5. Array iteration with <code>{{.property}}</code></h5>
                    <p class="text-muted small mb-2">Inside <code>{{#users}}</code>, the dot accesses the current item.</p>
                    <ul class="mb-0">
                        {{#users}}
                            <li><strong>{{.name}}</strong> &mdash; {{.role|capitalize}}</li>
                        {{/users}}
                    </ul>
                </div>
            </div>

            <div class="card">
                <div class="card-body">
                    <h5 class="card-title">6. Object iteration with <code>|iter</code></h5>
                    <p class="text-muted small mb-2">Plain objects need <code>|iter</code> to expose <code>.key</code> and <code>.value</code>.</p>
                    <dl class="row mb-0">
                        {{#settings|iter}}
                            <dt class="col-sm-3">{{.key|capitalize}}</dt>
                            <dd class="col-sm-9"><code>{{.value}}</code></dd>
                        {{/settings|iter}}
                    </dl>
                </div>
            </div>
        </div>
    `;
}

export default TemplatesExample;
