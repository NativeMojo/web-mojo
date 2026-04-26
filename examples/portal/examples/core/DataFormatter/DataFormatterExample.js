import { Page, dataFormatter, MOJOUtils } from 'web-mojo';

/**
 * DataFormatterExample — live formatter playground.
 *
 * Doc:    docs/web-mojo/core/DataFormatter.md
 * Route:  core/data-formatter
 *
 * Three live tools:
 *
 *   1. Single-formatter runner — pick from every registered formatter,
 *      pass an optional argument, see raw vs formatted side-by-side.
 *   2. Pipeline runner — chain formatters with `|` (e.g.
 *      `truncate(50)|capitalize|trim`) and run through dataFormatter.pipe().
 *   3. Preset chips — load common patterns into the pipeline runner.
 *
 * The formatter list is populated dynamically by reading the public
 * `dataFormatter.formatters` Map (singleton registry).
 */
const PRESETS = [
    { label: 'number', value: '1234567', pipe: 'number' },
    { label: 'currency', value: '12999', pipe: 'currency' },
    { label: 'percent', value: '0.42', pipe: 'percent' },
    { label: 'filesize', value: '1572864', pipe: 'filesize' },
    // Note: date/relative formatters expect epoch seconds or ms, not ISO strings.
    { label: 'date', value: Math.floor(Date.now() / 1000), pipe: "date:'MMM D, YYYY'" },
    { label: 'relative', value: Math.floor(Date.now() / 1000) - 3600 * 26, pipe: 'relative' },
    { label: 'capitalize|truncate', value: 'hello world from web-mojo', pipe: 'capitalize|truncate(12)' },
    { label: 'uppercase|truncate', value: 'mojo framework', pipe: 'uppercase|truncate(8)' },
    { label: 'badge', value: 'active', pipe: 'badge' },
    { label: 'initials', value: 'Alice Wonderland', pipe: 'initials' },
    { label: 'slug', value: 'Hello, World! 2026', pipe: 'slug' },
    { label: 'phone', value: '5555551234', pipe: 'phone' },
];

class DataFormatterExample extends Page {
    static pageName = 'core/data-formatter';
    static route = 'core/data-formatter';

    constructor(options = {}) {
        super({
            ...options,
            pageName: DataFormatterExample.pageName,
            route: DataFormatterExample.route,
            title: 'DataFormatter — live playground',
            template: DataFormatterExample.TEMPLATE,
        });

        this.formatterNames = Array.from(dataFormatter.formatters.keys()).sort();
        this.presets = PRESETS.map((p, i) => ({ ...p, idx: i }));

        this.singleValue = '1234567';
        this.singleName = 'number';
        this.singleArg = '';
        this.singleResult = '';

        this.pipeValue = 'hello world';
        this.pipePipe = 'capitalize|truncate(8)';
        this.pipeResult = '';

        this._scheduleSingle = MOJOUtils.debounce(() => this._runSingle(), 150);
        this._schedulePipe = MOJOUtils.debounce(() => this._runPipe(), 150);
    }

    async onInit() {
        await super.onInit();
        this._runSingle();
        this._runPipe();
    }

    async onAfterRender() {
        // Restore textareas/inputs after re-render
        const set = (sel, val) => { const el = this.element?.querySelector(sel); if (el) el.value = val; };
        set('#fmt-single-value', this.singleValue);
        set('#fmt-single-name', this.singleName);
        set('#fmt-single-arg', this.singleArg);
        set('#fmt-pipe-value', this.pipeValue);
        set('#fmt-pipe-string', this.pipePipe);
        this._renderResults();
    }

    onChangeSingleChange() {
        const val = (sel) => this.element?.querySelector(sel)?.value ?? '';
        this.singleValue = val('#fmt-single-value');
        this.singleName = val('#fmt-single-name');
        this.singleArg = val('#fmt-single-arg');
        this._scheduleSingle();
    }

    onChangePipeChange() {
        const val = (sel) => this.element?.querySelector(sel)?.value ?? '';
        this.pipeValue = val('#fmt-pipe-value');
        this.pipePipe = val('#fmt-pipe-string');
        this._schedulePipe();
    }

    onActionLoadPreset(event, element) {
        const idx = parseInt(element.getAttribute('data-idx'), 10);
        const preset = this.presets[idx];
        if (!preset) return;
        this.pipeValue = preset.value;
        this.pipePipe = preset.pipe;
        this._runPipe();
        if (this.isActive) this.render();
    }

    _coerce(raw) {
        if (raw === '' || raw == null) return raw;
        // Try JSON for objects/arrays/numbers/booleans; fall back to raw string.
        try { return JSON.parse(raw); } catch (e) { return raw; }
    }

    _runSingle() {
        const value = this._coerce(this.singleValue);
        try {
            const args = this.singleArg ? [this._coerce(this.singleArg)] : [];
            this.singleResult = dataFormatter.apply(this.singleName, value, ...args);
        } catch (e) {
            this.singleResult = `Error: ${e.message}`;
        }
        this._renderResults();
    }

    _runPipe() {
        const value = this._coerce(this.pipeValue);
        try {
            this.pipeResult = dataFormatter.pipe(value, this.pipePipe);
        } catch (e) {
            this.pipeResult = `Error: ${e.message}`;
        }
        this._renderResults();
    }

    _renderResults() {
        const sOut = this.element?.querySelector('#fmt-single-out');
        const pOut = this.element?.querySelector('#fmt-pipe-out');
        if (sOut) sOut.innerHTML = this._formatResult(this.singleResult);
        if (pOut) pOut.innerHTML = this._formatResult(this.pipeResult);
    }

    _formatResult(v) {
        if (v == null) return '<em class="text-muted">null</em>';
        if (typeof v === 'string' && v.startsWith('<')) return v; // formatter returned HTML (e.g. badge)
        const safe = String(v)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return `<code>${safe}</code>`;
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>DataFormatter — Live Playground</h1>
            <p class="example-summary">
                Apply a single formatter or chain a pipeline. Every registered formatter
                from the singleton <code>dataFormatter</code> registry is available below.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/core/DataFormatter.md">
                    docs/web-mojo/core/DataFormatter.md
                </a>
            </p>

            <div class="card mb-3">
                <div class="card-body">
                    <h5 class="card-title">1. Single formatter</h5>
                    <p class="text-muted small mb-2">
                        <code>dataFormatter.apply(name, value, arg)</code>. Numbers / JSON
                        in the value box are auto-parsed.
                    </p>
                    <div class="row g-2 align-items-end">
                        <div class="col-md-4">
                            <label class="form-label small text-muted mb-1">Value</label>
                            <input id="fmt-single-value" class="form-control font-monospace small"
                                   data-change-action="single-change" data-filter="live-search" data-filter-debounce="150" />
                        </div>
                        <div class="col-md-3">
                            <label class="form-label small text-muted mb-1">Formatter ({{formatterNames.length}})</label>
                            <select id="fmt-single-name" class="form-select form-select-sm"
                                    data-change-action="single-change" data-filter="live-search" data-filter-debounce="150">
                                {{#formatterNames}}
                                    <option value="{{.}}">{{.}}</option>
                                {{/formatterNames}}
                            </select>
                        </div>
                        <div class="col-md-2">
                            <label class="form-label small text-muted mb-1">Arg (optional)</label>
                            <input id="fmt-single-arg" class="form-control form-control-sm font-monospace"
                                   placeholder="e.g. 30" data-change-action="single-change" data-filter="live-search" data-filter-debounce="150" />
                        </div>
                        <div class="col-md-3">
                            <label class="form-label small text-muted mb-1">Result</label>
                            <div id="fmt-single-out" class="border rounded p-2 bg-light small"></div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card mb-3">
                <div class="card-body">
                    <h5 class="card-title">2. Pipeline</h5>
                    <p class="text-muted small mb-2">
                        <code>dataFormatter.pipe(value, 'truncate(50)|capitalize|trim')</code> —
                        each formatter consumes the previous output.
                    </p>
                    <div class="row g-2 align-items-end">
                        <div class="col-md-4">
                            <label class="form-label small text-muted mb-1">Value</label>
                            <input id="fmt-pipe-value" class="form-control font-monospace small"
                                   data-change-action="pipe-change" data-filter="live-search" data-filter-debounce="150" />
                        </div>
                        <div class="col-md-4">
                            <label class="form-label small text-muted mb-1">Pipeline</label>
                            <input id="fmt-pipe-string" class="form-control font-monospace small"
                                   data-change-action="pipe-change" data-filter="live-search" data-filter-debounce="150" />
                        </div>
                        <div class="col-md-4">
                            <label class="form-label small text-muted mb-1">Result</label>
                            <div id="fmt-pipe-out" class="border rounded p-2 bg-light small"></div>
                        </div>
                    </div>

                    <div class="mt-3">
                        <div class="small text-muted mb-1">Presets:</div>
                        <div class="d-flex flex-wrap gap-2">
                            {{#presets}}
                                <button class="btn btn-sm btn-outline-secondary"
                                        data-action="load-preset"
                                        data-idx="{{.idx}}">{{.label}}</button>
                            {{/presets}}
                        </div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-body small text-muted">
                    <strong>Notes:</strong>
                    formatter names are case-insensitive;
                    in templates, string args must be quoted (<code>|date:'YYYY-MM-DD'</code>);
                    use <code>&#123;&#123;&#123; &#125;&#125;&#125;</code> for HTML-producing formatters
                    like <code>badge</code> or <code>status</code>;
                    register custom formatters via <code>dataFormatter.register(name, fn)</code>.
                </div>
            </div>
        </div>
    `;
}

export default DataFormatterExample;
