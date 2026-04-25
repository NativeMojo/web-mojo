import { Page, dataFormatter } from 'web-mojo';

/**
 * DataFormatterExample — pipe formatters in templates and JS.
 *
 * Doc:    docs/web-mojo/core/DataFormatter.md
 * Route:  core/data-formatter
 *
 * Reference for the four ways to use formatters:
 *
 *   1. Built-in pipes (date, currency, truncate, badge, relative…).
 *   2. Chained pipes — output flows left-to-right.
 *   3. Custom formatter registered with `dataFormatter.register(name, fn)`.
 *   4. Calling `dataFormatter.apply()` from JavaScript directly.
 *
 * Currency expects integer cents; date/time accept ISO strings or Date.
 */
class DataFormatterExample extends Page {
    static pageName = 'core/data-formatter';
    static route = 'core/data-formatter';

    constructor(options = {}) {
        super({
            ...options,
            pageName: DataFormatterExample.pageName,
            route: DataFormatterExample.route,
            title: 'DataFormatter — pipe formatters',
            template: DataFormatterExample.TEMPLATE,
        });

        // Register a custom formatter once. Idempotent — register() replaces.
        dataFormatter.register('shout', (value) => `${String(value).toUpperCase()}!`);

        this.created = new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(); // ~26h ago
        this.priceCents = 1299;
        this.bytes = 1_572_864;
        this.bio = 'A long biography that will be politely truncated for display purposes in the demo.';
        this.status = 'active';
        this.greeting = 'hello';
        this.jsApplyResult = dataFormatter.apply('currency', 4995);
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>DataFormatter</h1>
            <p class="example-summary">
                100+ built-in pipes plus a register-your-own escape hatch. Chain with
                <code>|</code>; quote string args; use <code>{{{ }}}</code> for HTML output.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="https://github.com/NativeMojo/web-mojo/blob/main/docs/web-mojo/core/DataFormatter.md" target="_blank">
                    docs/web-mojo/core/DataFormatter.md
                </a>
            </p>

            <div class="card mb-3">
                <div class="card-body">
                    <h5 class="card-title">1. Built-in pipes</h5>
                    <ul class="list-unstyled mb-0 small">
                        <li><code>{{created|date}}</code> &rarr; <strong>{{created|date}}</strong></li>
                        <li><code>{{created|relative}}</code> &rarr; <strong>{{created|relative}}</strong></li>
                        <li><code>{{priceCents|currency}}</code> &rarr; <strong>{{priceCents|currency}}</strong></li>
                        <li><code>{{bytes|filesize}}</code> &rarr; <strong>{{bytes|filesize}}</strong></li>
                        <li><code>{{bio|truncate:40}}</code> &rarr; <strong>{{bio|truncate:40}}</strong></li>
                        <li><code>{{{status|badge}}}</code> &rarr; {{{status|badge}}}</li>
                    </ul>
                </div>
            </div>

            <div class="card mb-3">
                <div class="card-body">
                    <h5 class="card-title">2. Chained pipes</h5>
                    <p class="text-muted small mb-2">
                        Each pipe consumes the previous output: <code>{{greeting|capitalize|shout}}</code>.
                    </p>
                    <div>Result: <strong>{{greeting|capitalize|shout}}</strong></div>
                </div>
            </div>

            <div class="card mb-3">
                <div class="card-body">
                    <h5 class="card-title">3. Custom formatter</h5>
                    <p class="text-muted small mb-2">
                        Registered in the constructor with
                        <code>dataFormatter.register('shout', value =&gt; ...)</code>.
                    </p>
                    <div><code>{{greeting|shout}}</code> &rarr; <strong>{{greeting|shout}}</strong></div>
                </div>
            </div>

            <div class="card">
                <div class="card-body">
                    <h5 class="card-title">4. Apply formatters from JS</h5>
                    <p class="text-muted small mb-2">
                        <code>dataFormatter.apply('currency', 4995)</code> in the constructor.
                    </p>
                    <div>Result: <strong>{{jsApplyResult}}</strong></div>
                </div>
            </div>
        </div>
    `;
}

export default DataFormatterExample;
