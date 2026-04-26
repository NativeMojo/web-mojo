import { Page, Dialog } from 'web-mojo';

/**
 * DialogExample — canonical demo of Dialog's static promise-based helpers.
 *
 * Doc:    docs/web-mojo/components/Dialog.md
 * Route:  components/dialog
 *
 * Shows the four helpers users reach for first, plus the typed alert
 * variants. Each button calls one helper, awaits the Promise, and writes
 * the resolved value into a "last result" panel so you can see exactly
 * what each flavor returns.
 *
 *   - Dialog.alert(message, title, { type })   — info/success/warning/error
 *   - Dialog.confirm(message, title)           — resolves true / false
 *   - Dialog.prompt(message, title, opts)      — resolves entered string or null
 *   - Dialog.showBusy({ message }) / hideBusy() — full-page blocking spinner
 */
class DialogExample extends Page {
    static pageName = 'components/dialog';
    static route = 'components/dialog';

    constructor(options = {}) {
        super({
            ...options,
            pageName: DialogExample.pageName,
            route: DialogExample.route,
            title: 'Dialog — canonical helpers',
            template: DialogExample.TEMPLATE,
        });
        this.lastResult = '(none yet)';
    }

    log(label, value) {
        this.lastResult = `${label} → ${JSON.stringify(value)}`;
        this.render();
    }

    async onActionAlertInfo() {
        await Dialog.alert('Just an FYI.', 'Heads up', { type: 'info' });
        this.log('Dialog.alert (info)', 'closed');
    }

    async onActionAlertSuccess() {
        await Dialog.alert('Your changes have been saved.', 'Saved', { type: 'success' });
        this.log('Dialog.alert (success)', 'closed');
    }

    async onActionAlertWarning() {
        await Dialog.alert('This action will affect 24 records.', 'Heads up', { type: 'warning' });
        this.log('Dialog.alert (warning)', 'closed');
    }

    async onActionAlertError() {
        await Dialog.alert('The operation failed. Please try again.', 'Error', { type: 'error' });
        this.log('Dialog.alert (error)', 'closed');
    }

    async onActionConfirm() {
        const ok = await Dialog.confirm(
            'Delete this record? This cannot be undone.',
            'Confirm Delete'
        );
        this.log('Dialog.confirm', ok);
    }

    async onActionPrompt() {
        const name = await Dialog.prompt('Enter a name:', 'Rename', {
            defaultValue: 'untitled',
            placeholder: 'e.g. report-q4',
        });
        this.log('Dialog.prompt', name);
    }

    async onActionBusy() {
        Dialog.showBusy({ message: 'Working on it…' });
        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
        } finally {
            Dialog.hideBusy();
        }
        this.log('Dialog.showBusy / hideBusy', 'finished after 1.5s');
    }

    async onActionMultiButton() {
        const choice = await Dialog.showDialog({
            title: 'Choose Export Format',
            body: 'Select the format for your data export.',
            size: 'sm',
            buttons: [
                { text: 'CSV', icon: 'bi-filetype-csv', class: 'btn-primary', value: 'csv' },
                { text: 'JSON', icon: 'bi-filetype-json', class: 'btn-secondary', value: 'json' },
                { text: 'Cancel', class: 'btn-link text-muted', dismiss: true },
            ],
        });
        this.log('Dialog.showDialog (custom buttons)', choice);
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>Dialog</h1>
            <p class="example-summary">
                Promise-based modal helpers — alert, confirm, prompt, busy, and multi-button dialogs.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/components/Dialog.md">
                    docs/web-mojo/components/Dialog.md
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
                            <i class="bi bi-ui-checks"></i> showDialog (multi-button)
                        </button>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">Last result</div>
                <div class="card-body">
                    <pre class="mb-0 small"><code>{{lastResult}}</code></pre>
                </div>
            </div>
        </div>
    `;
}

export default DialogExample;
