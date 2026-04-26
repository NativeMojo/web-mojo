import { Page, View, MOJOUtils, MustacheFormatter } from 'web-mojo';

/**
 * TemplatesExample — live Mustache playground.
 *
 * Doc:    docs/web-mojo/core/Templates.md
 * Route:  core/templates
 *
 * Two-pane editor: edit the template + JSON context on the left, see the
 * rendered output on the right. Render goes through the framework's normal
 * path — a tiny inner `PreviewView` is constructed with the live template
 * and instance properties from the parsed context, then mounted via
 * addChild() into the preview slot. Each input change replaces the child.
 *
 * Presets load famous patterns (booleans, iteration, formatters, triple
 * braces, dot-prefix). Errors render in-place rather than throwing.
 */
class PreviewView extends View {
    constructor(options = {}) {
        super({ ...options, template: options.tpl || '' });
        const ctx = options.ctx || {};
        for (const key of Object.keys(ctx)) this[key] = ctx[key];
    }
}

const PRESETS = [
    {
        id: 'variables',
        label: 'Variables',
        template: '<p>Hello, <strong>{{name}}</strong> ({{email}})</p>\n<p>Age: {{age}}</p>',
        data: { name: 'Alice', email: 'alice@example.com', age: 32 },
    },
    {
        id: 'sections',
        label: 'Sections',
        template: '{{#user}}\n  <p>Logged in as <strong>{{name}}</strong></p>\n{{/user}}',
        data: { user: { name: 'Bob' } },
    },
    {
        id: 'inverted',
        label: 'Inverted',
        template: '{{^items|bool}}\n  <em>No items yet.</em>\n{{/items|bool}}\n{{#items|bool}}\n  <strong>{{items.length}} item(s)</strong>\n{{/items|bool}}',
        data: { items: [] },
    },
    {
        id: 'iter',
        label: 'Lists / iter',
        template: '<ul>\n  {{#users}}\n    <li>{{.name}} — {{.role|capitalize}}</li>\n  {{/users}}\n</ul>',
        data: { users: [{ name: 'Alice', role: 'admin' }, { name: 'Bob', role: 'editor' }] },
    },
    {
        id: 'bool',
        label: 'Booleans (|bool)',
        template: '{{#admin|bool}}<span class="badge text-bg-success">admin</span>{{/admin|bool}}\n{{^admin|bool}}<span class="badge text-bg-secondary">guest</span>{{/admin|bool}}',
        data: { admin: true },
    },
    {
        id: 'formatters',
        label: 'Formatters',
        template: '<ul>\n  <li>Number: <strong>{{count|number}}</strong></li>\n  <li>Price: <strong>{{price|currency}}</strong></li>\n  <li>Bio: <strong>{{bio|truncate:30}}</strong></li>\n  <li>Status: {{{status|badge}}}</li>\n</ul>',
        data: { count: 1234567, price: 1299, bio: 'A long biography that will be truncated', status: 'active' },
    },
    {
        id: 'triple',
        label: 'Triple braces',
        template: '<p>Escaped: {{html}}</p>\n<p>Rendered: {{{html}}}</p>',
        data: { html: '<strong class="text-success">Trusted HTML</strong>' },
    },
    {
        id: 'dot',
        label: 'Dot prefix',
        template: 'Outer name: {{name}}\n{{#items}}\n  - inner only: {{.name}}\n{{/items}}',
        data: { name: 'Outer', items: [{ name: 'A' }, { name: 'B' }, {}] },
    },
];

class TemplatesExample extends Page {
    static pageName = 'core/templates';
    static route = 'core/templates';

    constructor(options = {}) {
        super({
            ...options,
            pageName: TemplatesExample.pageName,
            route: TemplatesExample.route,
            title: 'Templates — live playground',
            template: TemplatesExample.TEMPLATE,
        });

        this.presets = PRESETS.map(p => ({ id: p.id, label: p.label }));
        this.errorMsg = '';
        this.currentTemplate = PRESETS[0].template;
        this.currentDataJson = JSON.stringify(PRESETS[0].data, null, 2);
        // Framework debounces input events; this debounce keeps a single source of truth.
        this._scheduleUpdate = MOJOUtils.debounce(() => this._updatePreview(), 50);
    }

    async onInit() {
        await super.onInit();
        this._mountPreview();
    }

    async onAfterRender() {
        const ta = this.element?.querySelector('#tpl-template');
        const da = this.element?.querySelector('#tpl-data');
        if (ta) ta.value = this.currentTemplate;
        if (da) da.value = this.currentDataJson;
        const err = this.element?.querySelector('#tpl-error');
        if (err) {
            err.textContent = this.errorMsg || '';
            err.classList.toggle('d-none', !this.errorMsg);
        }
    }

    onActionLoadPreset(event, element) {
        const id = element.getAttribute('data-preset');
        const preset = PRESETS.find(p => p.id === id);
        if (!preset) return;
        this.currentTemplate = preset.template;
        this.currentDataJson = JSON.stringify(preset.data, null, 2);
        this.errorMsg = '';
        this._rebuildPreview();
        if (this.isActive) this.render();
    }

    onChangeInputChange() {
        const ta = this.element?.querySelector('#tpl-template');
        const da = this.element?.querySelector('#tpl-data');
        if (ta) this.currentTemplate = ta.value;
        if (da) this.currentDataJson = da.value;
        this._scheduleUpdate();
    }

    _mountPreview() {
        this._rebuildPreview();
    }

    _rebuildPreview() {
        // Validate JSON + Mustache parse first — show error inline rather than crashing.
        let ctx;
        try { ctx = JSON.parse(this.currentDataJson); this.errorMsg = ''; }
        catch (e) { this.errorMsg = `Invalid JSON: ${e.message}`; ctx = {}; }
        if (!this.errorMsg) {
            try { MustacheFormatter.render(this.currentTemplate, ctx); }
            catch (e) { this.errorMsg = `Template error: ${e.message}`; }
        }
        this.removeChild('preview-slot');
        this.preview = new PreviewView({
            id: 'preview-slot', containerId: 'preview-slot',
            tpl: this.errorMsg ? '' : this.currentTemplate,
            ctx,
        });
        this.addChild(this.preview);
    }

    async _updatePreview() {
        // Live edits — rebuild preview child in place and render the *child*
        // directly so the parent's textareas (and cursor position) don't redraw.
        this._rebuildPreview();
        const err = this.element?.querySelector('#tpl-error');
        if (err) {
            err.textContent = this.errorMsg || '';
            err.classList.toggle('d-none', !this.errorMsg);
        }
        if (this.preview) await this.preview.render();
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>Templates — Live Playground</h1>
            <p class="example-summary">
                Edit a Mustache template and JSON context, see the framework render it
                live through a real <code>View</code>. Try a preset, then break it.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/core/Templates.md">
                    docs/web-mojo/core/Templates.md
                </a>
            </p>

            <div class="card mb-3">
                <div class="card-body">
                    <div class="d-flex flex-wrap gap-2 mb-3">
                        {{#presets}}
                            <button class="btn btn-sm btn-outline-primary"
                                    data-action="load-preset"
                                    data-preset="{{.id}}">{{.label}}</button>
                        {{/presets}}
                    </div>

                    <div class="row g-3">
                        <div class="col-md-6">
                            <label class="form-label small text-muted mb-1">Template</label>
                            <textarea id="tpl-template"
                                      class="form-control font-monospace small"
                                      rows="10"
                                      spellcheck="false"
                                      data-change-action="input-change" data-filter="live-search" data-filter-debounce="200"></textarea>
                            <label class="form-label small text-muted mb-1 mt-3">Context (JSON)</label>
                            <textarea id="tpl-data"
                                      class="form-control font-monospace small"
                                      rows="8"
                                      spellcheck="false"
                                      data-change-action="input-change" data-filter="live-search" data-filter-debounce="200"></textarea>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label small text-muted mb-1">Rendered output</label>
                            <div class="border rounded p-3 bg-light" data-container="preview-slot"></div>
                            <div id="tpl-error" class="alert alert-danger mt-2 d-none small"></div>
                        </div>
                    </div>

                    <div class="mt-3 small text-muted">
                        <strong>Gotchas:</strong>
                        booleans need <code>|bool</code> (otherwise arrays iterate);
                        HTML output needs <code>&#123;&#123;&#123; &#125;&#125;&#125;</code>;
                        formatter string args must be quoted (<code>|date:'YYYY-MM-DD'</code>);
                        in iterations use <code>&#123;&#123;.property&#125;&#125;</code>.
                    </div>
                </div>
            </div>
        </div>
    `;
}

export default TemplatesExample;
