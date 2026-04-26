import { Page, View } from 'web-mojo';

/**
 * ToastServiceExample — canonical demo of ToastService.
 *
 * Doc:    docs/web-mojo/services/ToastService.md
 * Route:  services/toast-service
 *
 * Bootstrap 5 toast manager. PortalApp exposes a configured instance at
 * `app.toast` — never construct your own when the app already has one.
 *
 * What this shows:
 *   1. The four typed helpers — success / info / warning / error.
 *   2. Per-call options — autohide, dismissible, custom delay.
 *   3. showView() — render a full View instance inside a toast and update it
 *      live via the returned handle.
 *   4. The handle API — every show*() returns `{ id, hide, dispose,
 *      updateProgress }`.
 */

// View embedded inside a toast for showView() — exposes updateProgress so
// the toast handle can drive it from the page.
class UploadProgressView extends View {
    constructor(options = {}) {
        super({ ...options, template: UploadProgressView.TEMPLATE });
        this.label = options.label || 'Working…';
        this.percent = 0;
    }
    updateProgress({ percent, label }) {
        if (typeof percent === 'number') this.percent = percent;
        if (label) this.label = label;
        this.render();
    }
    static TEMPLATE = `
        <div class="p-1">
            <div class="small mb-1">{{label}} — <strong>{{percent}}%</strong></div>
            <div class="progress" style="height: 6px;">
                <div class="progress-bar" style="width: {{percent}}%"></div>
            </div>
        </div>
    `;
}

class ToastServiceExample extends Page {
    static pageName = 'services/toast-service';
    static route = 'services/toast-service';

    constructor(options = {}) {
        super({
            ...options,
            pageName: ToastServiceExample.pageName,
            route: ToastServiceExample.route,
            title: 'ToastService — Bootstrap toasts',
            template: ToastServiceExample.TEMPLATE,
        });
    }

    _toast() { return this.getApp().toast; }

    onActionSuccess() { this._toast().success('Record saved successfully.'); }
    onActionInfo()    { this._toast().info('A new version is available.'); }
    onActionWarning() { this._toast().warning('Session expires in 5 minutes.'); }
    onActionError()   { this._toast().error('Something went wrong.'); }

    onActionPersistent() {
        this._toast().info('Stays until you dismiss it.', { autohide: false, title: 'Pinned' });
    }

    onActionFastDelay() {
        this._toast().success('Gone in 1.5 seconds.', { delay: 1500 });
    }

    async onActionViewToast() {
        const view = new UploadProgressView({ label: 'Uploading photo.jpg' });
        const handle = this._toast().showView(view, 'info', {
            title: 'File upload',
            autohide: false,
            dismissible: false,
        });
        // Drive the embedded view via the handle — same contract as a real upload.
        for (let p = 10; p <= 100; p += 10) {
            await new Promise(r => setTimeout(r, 200));
            handle.updateProgress({ percent: p, label: p < 100 ? 'Uploading photo.jpg' : 'Done!' });
        }
        await new Promise(r => setTimeout(r, 400));
        handle.hide();
        this._toast().success('photo.jpg uploaded.');
    }

    onActionHideAll() { this._toast().hideAll(); }

    static TEMPLATE = `
        <div class="example-page">
            <h1>ToastService</h1>
            <p class="example-summary">
                Bootstrap 5 toast manager — typed variants, auto-dismiss, view-as-toast.
                Reach it via <code>this.getApp().toast</code>.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/services/ToastService.md">
                    docs/web-mojo/services/ToastService.md
                </a>
            </p>

            <div class="card mb-3"><div class="card-body">
                <h5 class="card-title">Variants</h5>
                <div class="d-flex flex-wrap gap-2">
                    <button class="btn btn-success" data-action="success"><i class="bi bi-check-circle"></i> success()</button>
                    <button class="btn btn-info text-white" data-action="info"><i class="bi bi-info-circle"></i> info()</button>
                    <button class="btn btn-warning" data-action="warning"><i class="bi bi-exclamation-triangle"></i> warning()</button>
                    <button class="btn btn-danger" data-action="error"><i class="bi bi-x-octagon"></i> error()</button>
                </div>
            </div></div>

            <div class="card mb-3"><div class="card-body">
                <h5 class="card-title">Per-call options</h5>
                <div class="d-flex flex-wrap gap-2">
                    <button class="btn btn-outline-secondary" data-action="persistent">
                        <i class="bi bi-pin-angle"></i> autohide: false
                    </button>
                    <button class="btn btn-outline-secondary" data-action="fast-delay">
                        <i class="bi bi-stopwatch"></i> delay: 1500
                    </button>
                    <button class="btn btn-outline-secondary" data-action="hide-all">
                        <i class="bi bi-trash"></i> hideAll()
                    </button>
                </div>
            </div></div>

            <div class="card"><div class="card-body">
                <h5 class="card-title">View-as-toast</h5>
                <p class="text-muted small mb-3">
                    <code>showView(view, type, opts)</code> mounts a full View inside the toast.
                    The returned handle's <code>updateProgress()</code> calls
                    <code>view.updateProgress()</code> — perfect for live upload progress.
                </p>
                <button class="btn btn-primary" data-action="view-toast">
                    <i class="bi bi-cloud-upload"></i> Run fake upload (showView)
                </button>
            </div></div>
        </div>
    `;
}

export default ToastServiceExample;
