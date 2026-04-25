import { Page } from 'web-mojo';

/**
 * RestExample — canonical demo of the Rest HTTP client.
 *
 * Doc:    docs/web-mojo/services/Rest.md
 * Route:  services/rest
 *
 * Rest wraps fetch and returns a uniform `{ success, status, data, reason,
 * message }` shape. Use `this.getApp().rest` — never construct your own.
 *
 * What this shows: GET/POST/PUT/DELETE with `{ dataOnly: true }` to unwrap
 * the MOJO `resp.data.data` envelope; a request interceptor (installed once
 * in onInit) that injects `X-Demo-Time` on every call; `upload()` with
 * `onProgress`; and `download()` to disk. Without a backend at localhost:9009
 * the log shows `reason: 'not_reachable'` rather than crashing.
 */
class RestExample extends Page {
    static pageName = 'services/rest';
    static route = 'services/rest';

    constructor(options = {}) {
        super({
            ...options,
            pageName: RestExample.pageName,
            route: RestExample.route,
            title: 'Rest — HTTP client',
            template: RestExample.TEMPLATE,
        });
        this.log = [];
        this.uploadProgress = null;
        this._interceptorInstalled = false;
    }

    async onInit() {
        await super.onInit();
        const rest = this.getApp().rest;
        if (rest && !this._interceptorInstalled) {
            rest.addInterceptor('request', (cfg) => {
                cfg.headers = cfg.headers || {};
                cfg.headers['X-Demo-Time'] = String(Date.now());
                return cfg;
            });
            this._interceptorInstalled = true;
        }
    }

    _logEntry(entry) {
        this.log = [{ at: new Date().toLocaleTimeString(), ...entry }, ...this.log].slice(0, 6);
        this.render();
    }

    async _doRequest(method, label) {
        const rest = this.getApp().rest;
        const fns = {
            GET:    () => rest.GET('/api/system/health', {}, {}, { dataOnly: true }),
            POST:   () => rest.POST('/api/echo', { hello: 'world' }, {}, { dataOnly: true }),
            PUT:    () => rest.PUT('/api/echo/1', { updated: true }, {}, { dataOnly: true }),
            DELETE: () => rest.DELETE('/api/echo/1', {}, {}, { dataOnly: true }),
        };
        const resp = await fns[method]();
        this._logEntry({ label, status: resp.status, success: resp.success, reason: resp.reason || null });
    }

    onActionGet()    { this._doRequest('GET',    'GET /api/system/health'); }
    onActionPost()   { this._doRequest('POST',   'POST /api/echo'); }
    onActionPut()    { this._doRequest('PUT',    'PUT /api/echo/1'); }
    onActionDelete() { this._doRequest('DELETE', 'DELETE /api/echo/1'); }

    async onActionUpload() {
        const file = this.element.querySelector('input[type="file"]')?.files?.[0];
        if (!file) {
            this._logEntry({ label: 'upload', status: 0, success: false, reason: 'no_file' });
            return;
        }
        this.uploadProgress = 0;
        await this.render();
        const resp = await this.getApp().rest.upload('/api/files', file, {
            onProgress: (percent) => { this.uploadProgress = percent; this.render(); },
        });
        this.uploadProgress = null;
        this._logEntry({ label: `upload ${file.name}`, status: resp.status, success: resp.success, reason: resp.reason || null });
    }

    async onActionDownload() {
        try {
            await this.getApp().rest.download('/api/system/health', 'health.json');
            this._logEntry({ label: 'download health.json', status: 200, success: true });
        } catch (err) {
            this._logEntry({ label: 'download', status: 0, success: false, reason: err.message });
        }
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>Rest</h1>
            <p class="example-summary">
                HTTP client — GET/POST/PUT/DELETE, upload/download, interceptors.
                Pass <code>{ dataOnly: true }</code> as the 4th arg to unwrap the MOJO envelope.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="https://github.com/NativeMojo/web-mojo/blob/main/docs/web-mojo/services/Rest.md" target="_blank">
                    docs/web-mojo/services/Rest.md
                </a>
            </p>

            <div class="card mb-3"><div class="card-body">
                <h5 class="card-title">CRUD verbs</h5>
                <p class="text-muted small mb-3">
                    Without a backend at <code>localhost:9009</code> the log shows
                    <code>reason: 'not_reachable'</code>.
                </p>
                <div class="d-flex flex-wrap gap-2">
                    <button class="btn btn-outline-primary" data-action="get">GET</button>
                    <button class="btn btn-outline-success" data-action="post">POST</button>
                    <button class="btn btn-outline-warning" data-action="put">PUT</button>
                    <button class="btn btn-outline-danger" data-action="delete">DELETE</button>
                </div>
            </div></div>

            <div class="card mb-3"><div class="card-body">
                <h5 class="card-title">Upload &amp; Download</h5>
                <input type="file" class="form-control mb-2" />
                <button class="btn btn-outline-secondary" data-action="upload"><i class="bi bi-cloud-upload"></i> Upload</button>
                <button class="btn btn-outline-secondary" data-action="download"><i class="bi bi-cloud-download"></i> Download</button>
                {{#uploadProgress}}<div class="progress mt-2"><div class="progress-bar" style="width: {{uploadProgress}}%"></div></div>{{/uploadProgress}}
            </div></div>

            <div class="card"><div class="card-body">
                <h5 class="card-title">Response log</h5>
                <p class="text-muted small">
                    Request interceptor adds <code>X-Demo-Time</code> to every call —
                    inspect the Network panel headers.
                </p>
                {{^log}}<p class="text-muted mb-0">No requests yet.</p>{{/log}}
                <ul class="list-group">
                    {{#log}}
                        <li class="list-group-item small">
                            <code>{{.at}}</code> · <strong>{{.label}}</strong> · status <code>{{.status}}</code> ·
                            {{#.success|bool}}<span class="badge text-bg-success">ok</span>{{/.success|bool}}{{^.success|bool}}<span class="badge text-bg-danger">fail{{#.reason}} · {{.reason}}{{/.reason}}</span>{{/.success|bool}}
                        </li>
                    {{/log}}
                </ul>
            </div></div>
        </div>
    `;
}

export default RestExample;
