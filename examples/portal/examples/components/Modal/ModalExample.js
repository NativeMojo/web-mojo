import { Page, View, Modal } from 'web-mojo';

/**
 * ModalExample — canonical demo of Modal, the simplified API on top of Dialog.
 *
 * Doc:    docs/web-mojo/components/Modal.md
 * Route:  components/modal
 *
 * Modal is a static-only convenience wrapper. Use it when you want to:
 *
 *   1. Show a View instance in a dialog without managing Dialog manually
 *      (`Modal.show(view, options)`).
 *   2. Reach the same alert / confirm / prompt / form helpers without
 *      importing Dialog separately (`Modal.confirm`, `Modal.alert`, etc.).
 *
 * This example demonstrates both: a one-button "show this view" flow that
 * mounts a small custom View inside a modal, and the convenience aliases.
 */
class GreetingView extends View {
    constructor(options = {}) {
        super({
            ...options,
            template: GreetingView.TEMPLATE,
            className: 'p-4 text-center',
        });
    }

    static TEMPLATE = `
        <div>
            <i class="bi bi-emoji-smile fs-1 text-primary"></i>
            <h4 class="mt-3">Hello from a View</h4>
            <p class="text-muted mb-0">
                This whole block is a separate <code>View</code> instance, mounted
                inside the modal by <code>Modal.show()</code>.
            </p>
        </div>
    `;
}

class ModalExample extends Page {
    static pageName = 'components/modal';
    static route = 'components/modal';

    constructor(options = {}) {
        super({
            ...options,
            pageName: ModalExample.pageName,
            route: ModalExample.route,
            title: 'Modal — simpler than Dialog',
            template: ModalExample.TEMPLATE,
        });
        this.lastResult = '(none yet)';
    }

    log(label, value) {
        this.lastResult = `${label}: ${JSON.stringify(value)}`;
        this.render();
    }

    async onActionShowView() {
        const result = await Modal.show(new GreetingView(), {
            title: 'Greeting',
            size: 'md',
            buttons: [
                { text: 'Got it', class: 'btn-primary', value: 'ok' },
                { text: 'Close', class: 'btn-secondary', dismiss: true },
            ],
        });
        this.log('Modal.show', result);
    }

    async onActionConfirm() {
        const ok = await Modal.confirm('Proceed with the operation?', 'Confirm');
        this.log('Modal.confirm', ok);
    }

    async onActionAlert() {
        await Modal.alert('Operation finished.', 'Done');
        this.log('Modal.alert', 'closed');
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>Modal</h1>
            <p class="example-summary">
                Static-only API on top of Dialog. Drop-in helpers for showing Views or
                running quick alert/confirm/prompt/form flows.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="https://github.com/NativeMojo/web-mojo/blob/main/docs/web-mojo/components/Modal.md" target="_blank">
                    docs/web-mojo/components/Modal.md
                </a>
            </p>

            <div class="card">
                <div class="card-body">
                    <div class="d-flex flex-wrap gap-2 mb-3">
                        <button class="btn btn-primary" data-action="show-view">
                            <i class="bi bi-window-plus"></i> Modal.show(view)
                        </button>
                        <button class="btn btn-secondary" data-action="confirm">
                            <i class="bi bi-question-circle"></i> Modal.confirm
                        </button>
                        <button class="btn btn-secondary" data-action="alert">
                            <i class="bi bi-info-circle"></i> Modal.alert
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

export default ModalExample;
