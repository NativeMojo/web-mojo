import { Page, Dialog } from 'web-mojo';

/**
 * DialogExample — canonical demo of the Dialog component.
 *
 * Doc:    docs/web-mojo/components/Dialog.md
 * Route:  components/dialog
 *
 * Shows the four Promise-based static helpers users reach for first:
 *
 *   1. `Dialog.alert()`  — typed alert (info/success/warning/error)
 *   2. `Dialog.confirm()` — yes/no, resolves true/false
 *   3. `Dialog.prompt()`  — text input, resolves entered string or null
 *   4. `Dialog.showBusy()` / `hideBusy()` — full-page loading overlay
 *
 * Each button calls one helper, awaits the Promise, and writes the result
 * into a small log so you can see exactly what each flavor returns.
 */
class DialogExample extends Page {
    static pageName = 'components/dialog';
    static route = 'components/dialog';

    constructor(options = {}) {
        super({
            ...options,
            pageName: DialogExample.pageName,
            route: DialogExample.route,
            title: 'Dialog — modal dialogs',
            template: DialogExample.TEMPLATE,
        });
        this.lastResult = '(none yet)';
    }

    log(label, value) {
        this.lastResult = `${label}: ${JSON.stringify(value)}`;
        this.render();
    }

    async onActionAlertInfo() {
        await Dialog.alert('Your changes have been saved.', 'Saved', { type: 'success' });
        this.log('alert', 'closed');
    }

    async onActionAlertError() {
        await Dialog.alert('Something went wrong.', 'Error', { type: 'error' });
        this.log('alert(error)', 'closed');
    }

    async onActionConfirm() {
        const ok = await Dialog.confirm('Delete this record? This cannot be undone.', 'Confirm Delete');
        this.log('confirm', ok);
    }

    async onActionPrompt() {
        const name = await Dialog.prompt('Enter a name:', 'Rename', { defaultValue: 'untitled', placeholder: 'e.g. report-q4' });
        this.log('prompt', name);
    }

    async onActionBusy() {
        Dialog.showBusy({ message: 'Working on it…' });
        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
        } finally {
            Dialog.hideBusy();
        }
        this.log('busy', 'finished after 1.5s');
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
        this.log('showDialog', choice);
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>Dialog</h1>
            <p class="example-summary">
                Promise-based modal helpers — alert, confirm, prompt, busy, and multi-button dialogs.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="https://github.com/NativeMojo/web-mojo/blob/main/docs/web-mojo/components/Dialog.md" target="_blank">
                    docs/web-mojo/components/Dialog.md
                </a>
            </p>

            <div class="card">
                <div class="card-body">
                    <div class="d-flex flex-wrap gap-2 mb-3">
                        <button class="btn btn-success" data-action="alert-info">
                            <i class="bi bi-info-circle"></i> alert (success)
                        </button>
                        <button class="btn btn-danger" data-action="alert-error">
                            <i class="bi bi-exclamation-octagon"></i> alert (error)
                        </button>
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
                    <div class="border rounded p-3 bg-light">
                        <strong class="small text-muted">Last result</strong>
                        <pre class="mb-0 small"><code>{{lastResult}}</code></pre>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export default DialogExample;
