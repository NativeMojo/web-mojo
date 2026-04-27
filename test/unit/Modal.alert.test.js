/**
 * Modal.alert / Dialog.alert pass-through unit tests.
 *
 * Modal owns the canonical implementation for alert / confirm / prompt;
 * Dialog.alert delegates here via the compat shim. These tests cover:
 *   - Modal.alert arg-signature normalization (regression for the
 *     three-arg bug where (message, title, options) silently dropped
 *     args 2 and 3)
 *   - The modal-alert-{type} root className is computed correctly for
 *     every type variant
 *   - Caller-supplied className is preserved alongside the typed class
 *
 * Strategy: spy on `Modal.dialog` (which Modal.alert delegates into)
 * and assert against the captured options. ModalView itself is never
 * instantiated, so we don't need real Bootstrap.
 */

const { testHelpers } = require('../utils/test-helpers');
const { loadModule, moduleLoader } = require('../utils/simple-module-loader');

module.exports = async function (testContext) {
    const { describe, it, expect, beforeEach, afterEach } = testContext;

    await testHelpers.setup();
    const jest = global.jest;

    // Force a fresh Modal load so any prior cached copy is discarded.
    moduleLoader.loadedModules.delete('Modal');
    delete global.Modal;
    const Modal = loadModule('Modal');

    let lastOpts = null;
    const dialogSpy = jest.fn((opts) => {
        lastOpts = opts;
        return Promise.resolve(true);
    });

    // Replace Modal.dialog with the spy. Modal.alert internally calls
    // Modal.dialog, so this lets us capture the forwarded options
    // without instantiating ModalView or touching Bootstrap.
    Modal.dialog = dialogSpy;

    beforeEach(() => {
        dialogSpy.mockClear();
        lastOpts = null;
    });

    afterEach(() => {
        dialogSpy.mockClear();
        lastOpts = null;
    });

    describe('Modal.alert — arg signature normalization', () => {
        it('accepts a single string argument', async () => {
            await Modal.alert('hi');
            expect(dialogSpy).toHaveBeenCalledTimes(1);
            expect(lastOpts.body).toContain('hi');
            expect(lastOpts.className).toContain('modal-alert');
            expect(lastOpts.className).toContain('modal-alert-info');
        });

        it('accepts a single options object', async () => {
            await Modal.alert({ message: 'hi', type: 'success', title: 'Saved' });
            expect(dialogSpy).toHaveBeenCalledTimes(1);
            expect(lastOpts.className).toContain('modal-alert-success');
            expect(lastOpts.title).toContain('Saved');
        });

        it('accepts (message, title) two-arg form', async () => {
            await Modal.alert('hi', 'Custom Title');
            expect(dialogSpy).toHaveBeenCalledTimes(1);
            expect(lastOpts.title).toContain('Custom Title');
            expect(lastOpts.className).toContain('modal-alert-info');
        });

        it('accepts (message, title, options) three-arg form — REGRESSION TEST', async () => {
            // Original bug: Dialog.alert dropped args 2 and 3.
            // Modal.alert MUST honor all three.
            await Modal.alert('hi', 'Custom Title', { type: 'warning' });
            expect(dialogSpy).toHaveBeenCalledTimes(1);
            expect(lastOpts.title).toContain('Custom Title');
            expect(lastOpts.className).toContain('modal-alert-warning');
        });
    });

    describe('Modal.alert — typed root className', () => {
        it('applies modal-alert-info by default', async () => {
            await Modal.alert('hi');
            expect(lastOpts.className).toContain('modal-alert');
            expect(lastOpts.className).toContain('modal-alert-info');
        });

        it('applies modal-alert-success for type: success', async () => {
            await Modal.alert('hi', 'Saved', { type: 'success' });
            expect(lastOpts.className).toContain('modal-alert-success');
        });

        it('applies modal-alert-warning for type: warning', async () => {
            await Modal.alert('hi', 'Heads up', { type: 'warning' });
            expect(lastOpts.className).toContain('modal-alert-warning');
        });

        it('applies modal-alert-error for type: error', async () => {
            await Modal.alert('hi', 'Error', { type: 'error' });
            expect(lastOpts.className).toContain('modal-alert-error');
        });

        it('applies modal-alert-error for type: danger (alias)', async () => {
            await Modal.alert('hi', 'Error', { type: 'danger' });
            expect(lastOpts.className).toContain('modal-alert-error');
        });

        it('preserves caller-supplied className alongside the typed class', async () => {
            await Modal.alert('hi', 'Title', { className: 'my-custom-class' });
            expect(lastOpts.className).toContain('modal-alert-info');
            expect(lastOpts.className).toContain('my-custom-class');
        });
    });

    describe('Modal.alert — title structure', () => {
        it('builds title as just the headline span (eyebrow rendered by CSS in the band)', async () => {
            await Modal.alert('hi', 'Your changes are live', { type: 'success' });
            expect(lastOpts.title).toContain('modal-alert-headline');
            expect(lastOpts.title).toContain('Your changes are live');
            // The eyebrow text is no longer in the JS title HTML — the CSS
            // hero band renders it via .modal.modal-alert-{type} ::before
            expect(lastOpts.title).not.toContain('modal-alert-eyebrow');
            expect(lastOpts.title).not.toContain('SUCCESS');
            // Inline colored icon removed — band + tint communicate the type now
            expect(lastOpts.title).not.toContain('bi-check-circle-fill');
        });

        it('honors a caller-supplied eyebrow override via inline --mojo-eyebrow style', async () => {
            await Modal.alert('hi', 'Saved', { type: 'success', eyebrow: 'ACCOUNT / SAVED' });
            // Eyebrow flows through to the modal root via inline style so CSS
            // can pick it up in the band's `content: var(--mojo-eyebrow, ...)`.
            expect(lastOpts.style).toBeDefined();
            expect(lastOpts.style).toContain('--mojo-eyebrow');
            expect(lastOpts.style).toContain("ACCOUNT / SAVED");
            // Custom eyebrow does NOT leak into the title markup
            expect(lastOpts.title).not.toContain('ACCOUNT');
        });

        it('strips quotes/backslashes from custom eyebrow to keep the CSS string valid', async () => {
            await Modal.alert('hi', 'T', { type: 'info', eyebrow: `it's "great"\\back` });
            expect(lastOpts.style).toContain("--mojo-eyebrow");
            expect(lastOpts.style).not.toContain('"');
            expect(lastOpts.style).not.toContain("'great'");
            expect(lastOpts.style).not.toContain('\\');
        });

        it('clears the band content when caller passes eyebrow: false', async () => {
            await Modal.alert('hi', 'A headline', { type: 'success', eyebrow: false });
            // eyebrow: false sets --mojo-eyebrow to empty string so the band shows nothing
            expect(lastOpts.style).toContain("--mojo-eyebrow: ''");
        });

        it('suppresses the header title when it would just duplicate the eyebrow', async () => {
            // app.showError(msg) calls Modal.alert(msg, 'Error', { type: 'error' })
            // Band shows "ERROR", header title 'Error' is redundant — should be empty.
            await Modal.alert('something went wrong', 'Error', { type: 'error' });
            expect(lastOpts.title).toBe('');
        });

        it('keeps the header title when it differs from the eyebrow', async () => {
            await Modal.alert('hi', 'Your changes are live', { type: 'success' });
            expect(lastOpts.title).toContain('Your changes are live');
            expect(lastOpts.title).toContain('modal-alert-headline');
        });

        it('suppresses on case-insensitive match', async () => {
            await Modal.alert('hi', 'warning', { type: 'warning' });
            expect(lastOpts.title).toBe('');
        });

        it('keeps the title when eyebrow override differs', async () => {
            await Modal.alert('hi', 'Saved', { type: 'success', eyebrow: 'BILLING' });
            expect(lastOpts.title).toContain('Saved');
        });

        it('wraps the message in a modal-alert-message paragraph', async () => {
            await Modal.alert('Body text here.', 'T', { type: 'info' });
            expect(lastOpts.body).toContain('modal-alert-message');
            expect(lastOpts.body).toContain('Body text here.');
        });
    });

    describe('Modal.showError', () => {
        it('forwards to Modal.alert with type: error and suppresses the duplicate title', async () => {
            await Modal.showError('oops');
            expect(dialogSpy).toHaveBeenCalledTimes(1);
            expect(lastOpts.className).toContain('modal-alert-error');
            // Band carries "ERROR"; passed title 'Error' is suppressed so the
            // header doesn't duplicate it.
            expect(lastOpts.title).toBe('');
            expect(lastOpts.style).toContain("--mojo-eyebrow: 'ERROR'");
        });
    });
};
