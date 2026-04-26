import { Page, Modal, Dialog } from 'web-mojo';

/**
 * DialogExample — canonical demo of Modal's static promise-based helpers.
 *
 * Doc:    docs/web-mojo/components/Modal.md
 * Route:  components/dialog (route preserved for bookmarks)
 *
 * Modal is the canonical JavaScript surface for modals and dialogs.
 * This page demonstrates the four helpers users reach for first plus the
 * typed alert variants. Each button calls one helper, awaits the Promise,
 * and writes the resolved value into a "last result" panel so you can
 * see exactly what each flavor returns.
 *
 *   - Modal.alert(message, title, { type })   — info/success/warning/error
 *   - Modal.confirm(message, title)           — resolves true / false
 *   - Modal.prompt(message, title, opts)      — resolves entered string or null
 *   - Modal.showBusy({ message }) / hideBusy() — full-page blocking spinner
 *   - Modal.dialog(opts)                      — generic multi-button dialog
 *
 * The bottom card shows that the legacy `Dialog.alert(...)` API still works —
 * it's a thin pass-through to Modal — but new code should prefer Modal.
 */
class DialogExample extends Page {
    static pageName = 'components/dialog';
    static route = 'components/dialog';

    constructor(options = {}) {
        super({
            ...options,
            pageName: DialogExample.pageName,
            route: DialogExample.route,
            title: 'Modal — canonical helpers',
            template: DialogExample.TEMPLATE,
        });
        this.lastResult = '(none yet)';
    }

    log(label, value) {
        this.lastResult = `${label} → ${JSON.stringify(value)}`;
        this.render();
    }

    async onActionAlertInfo() {
        await Modal.alert('Just an FYI.', 'Heads up', { type: 'info' });
        this.log('Modal.alert (info)', 'closed');
    }

    async onActionAlertSuccess() {
        await Modal.alert('Your changes have been saved.', 'Saved', { type: 'success' });
        this.log('Modal.alert (success)', 'closed');
    }

    async onActionAlertWarning() {
        await Modal.alert('This action will affect 24 records.', 'Heads up', { type: 'warning' });
        this.log('Modal.alert (warning)', 'closed');
    }

    async onActionAlertError() {
        await Modal.alert('The operation failed. Please try again.', 'Error', { type: 'error' });
        this.log('Modal.alert (error)', 'closed');
    }

    async onActionConfirm() {
        const ok = await Modal.confirm(
            'Delete this record? This cannot be undone.',
            'Confirm Delete'
        );
        this.log('Modal.confirm', ok);
    }

    async onActionPrompt() {
        const name = await Modal.prompt('Enter a name:', 'Rename', {
            defaultValue: 'untitled',
            placeholder: 'e.g. report-q4',
        });
        this.log('Modal.prompt', name);
    }

    async onActionBusy() {
        Modal.showBusy({ message: 'Working on it…' });
        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
        } finally {
            Modal.hideBusy();
        }
        this.log('Modal.showBusy / hideBusy', 'finished after 1.5s');
    }

    async onActionMultiButton() {
        const choice = await Modal.dialog({
            title: 'Choose Export Format',
            body: 'Select the format for your data export.',
            size: 'sm',
            buttons: [
                { text: 'CSV', icon: 'bi-filetype-csv', class: 'btn-primary', value: 'csv' },
                { text: 'JSON', icon: 'bi-filetype-json', class: 'btn-secondary', value: 'json' },
                { text: 'Cancel', class: 'btn-link text-muted', dismiss: true },
            ],
        });
        this.log('Modal.dialog (custom buttons)', choice);
    }

    async onActionLegacyDialog() {
        // Demonstrates that the deprecated Dialog.* surface still works —
        // it's a thin pass-through to Modal. New code should prefer Modal.
        await Dialog.alert('Dialog.alert still works.', 'Legacy', { type: 'info' });
        this.log('Dialog.alert (legacy pass-through)', 'closed');
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>Modal</h1>
            <p class="example-summary">
                Promise-based modal helpers — alert, confirm, prompt, busy, and multi-button dialogs.
                <strong>Modal</strong> is the canonical JavaScript surface for modals and dialogs.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/components/Modal.md">
                    docs/web-mojo/components/Modal.md
                </a>
            </p>

            <div class="card mb-3">
                <div class="card-header">Typed alerts</div>
                <div class="card-body">
                    <div class="d-flex flex-wrap gap-2">
                        <button class="btn btn-info text-white" data-action="alert-info">
                            <i class="bi bi-info-circle"></i> alert (info)
                        </button>
                        <button class="btn btn-success" data-action="alert-success">
                            <i class="bi bi-check-circle"></i> alert (success)
                        </button>
                        <button class="btn btn-warning" data-action="alert-warning">
                            <i class="bi bi-exclamation-triangle"></i> alert (warning)
                        </button>
                        <button class="btn btn-danger" data-action="alert-error">
                            <i class="bi bi-exclamation-octagon"></i> alert (error)
                        </button>
                    </div>
                </div>
            </div>

            <div class="card mb-3">
                <div class="card-header">Interactive helpers</div>
                <div class="card-body">
                    <div class="d-flex flex-wrap gap-2">
                        <button class="btn btn-primary" data-action="confirm">
                            <i class="bi bi-question-circle"></i> confirm
                        </button>
                        <button class="btn btn-primary" data-action="prompt">
                            <i class="bi bi-input-cursor-text"></i> prompt
                        </button>
                        <button class="btn btn-secondary" data-action="busy">
                            <i class="bi bi-hourglass-split"></i> showBusy / hideBusy
                        </button>
                        <button class="btn btn-outline-primary" data-action="multi-button">
                            <i class="bi bi-ui-checks"></i> dialog (multi-button)
                        </button>
                    </div>
                </div>
            </div>

            <div class="card mb-3">
                <div class="card-header">Last result</div>
                <div class="card-body">
                    <pre class="mb-0 small"><code>{{lastResult}}</code></pre>
                </div>
            </div>

            <div class="card">
                <div class="card-header text-muted">
                    <i class="bi bi-clock-history me-1"></i>
                    Legacy Dialog.* surface (deprecated)
                </div>
                <div class="card-body">
                    <p class="small text-muted mb-2">
                        <code>Dialog.alert / Dialog.confirm / Dialog.prompt</code> remain available
                        as thin pass-throughs to Modal for backwards compatibility. New code should
                        import and call <code>Modal</code> directly.
                    </p>
                    <button class="btn btn-sm btn-outline-secondary" data-action="legacy-dialog">
                        <i class="bi bi-clock-history"></i> Dialog.alert (legacy)
                    </button>
                </div>
            </div>
        </div>
    `;
}

export default DialogExample;
