/**
 * Modal.alert / Dialog.alert pass-through Unit Tests
 *
 * Modal is the canonical implementation for alert / confirm / prompt;
 * Dialog.alert delegates to it. These tests exercise:
 *   - Modal.alert arg-signature normalization (the regression for the
 *     three-arg-bug where (message, title, options) silently dropped
 *     args 2 and 3)
 *   - The modal-alert-{type} root className is computed correctly for
 *     every type variant
 *   - Caller-supplied className is preserved alongside the typed class
 *   - Dialog.alert routes through Modal end-to-end
 *
 * Strategy: mock `global.Dialog.showDialog` as a spy before loading Modal,
 * so we capture the options Modal forwards without needing real Bootstrap.
 */

const { testHelpers } = require('../utils/test-helpers');
const { loadModule, moduleLoader } = require('../utils/simple-module-loader');

module.exports = async function (testContext) {
    const { describe, it, expect, beforeEach, afterEach } = testContext;

    // testHelpers.setup() installs `global.jest` (with .fn, .spyOn, etc.)
    await testHelpers.setup();
    const jest = global.jest;

    // Capture the most recent showDialog call so each test can assert on it.
    let lastShowDialogOpts = null;
    const showDialogSpy = jest.fn((opts) => {
        lastShowDialogOpts = opts;
        return Promise.resolve(true);
    });

    // Mock Dialog with the surface Modal needs:
    //   - Dialog.showDialog (used by Modal.alert)
    //   - new Dialog(opts) (used by Modal.confirm / Modal.prompt)
    function MockDialog(opts) {
        this._opts = opts;
        this.element = { remove: () => {} };
    }
    MockDialog.showDialog = showDialogSpy;
    MockDialog.prototype.render = function () { return Promise.resolve(); };
    MockDialog.prototype.show = function () {};
    MockDialog.prototype.hide = function () {};
    MockDialog.prototype.destroy = function () {};
    MockDialog.prototype.on = function () {};

    global.Dialog = MockDialog;

    // Force a fresh Modal load that picks up the mocked Dialog.
    moduleLoader.loadedModules.delete('Modal');
    delete global.Modal;
    const Modal = loadModule('Modal');

    beforeEach(() => {
        showDialogSpy.mockClear();
        lastShowDialogOpts = null;
    });

    afterEach(() => {
        showDialogSpy.mockClear();
        lastShowDialogOpts = null;
    });

    describe('Modal.alert — arg signature normalization', () => {
        it('accepts a single string argument', async () => {
            await Modal.alert('hi');
            expect(showDialogSpy).toHaveBeenCalledTimes(1);
            expect(lastShowDialogOpts.body).toContain('hi');
            expect(lastShowDialogOpts.className).toContain('modal-alert');
            expect(lastShowDialogOpts.className).toContain('modal-alert-info');
        });

        it('accepts a single options object', async () => {
            await Modal.alert({ message: 'hi', type: 'success', title: 'Saved' });
            expect(showDialogSpy).toHaveBeenCalledTimes(1);
            expect(lastShowDialogOpts.className).toContain('modal-alert-success');
            expect(lastShowDialogOpts.title).toContain('Saved');
        });

        it('accepts (message, title) two-arg form', async () => {
            await Modal.alert('hi', 'Custom Title');
            expect(showDialogSpy).toHaveBeenCalledTimes(1);
            expect(lastShowDialogOpts.title).toContain('Custom Title');
            expect(lastShowDialogOpts.className).toContain('modal-alert-info');
        });

        it('accepts (message, title, options) three-arg form — REGRESSION TEST', async () => {
            // This is the original bug: Dialog.alert dropped args 2 and 3.
            // Modal.alert MUST honor all three.
            await Modal.alert('hi', 'Custom Title', { type: 'warning' });
            expect(showDialogSpy).toHaveBeenCalledTimes(1);
            expect(lastShowDialogOpts.title).toContain('Custom Title');
            expect(lastShowDialogOpts.className).toContain('modal-alert-warning');
        });
    });

    describe('Modal.alert — typed root className', () => {
        it('applies modal-alert-info by default', async () => {
            await Modal.alert('hi');
            expect(lastShowDialogOpts.className).toContain('modal-alert');
            expect(lastShowDialogOpts.className).toContain('modal-alert-info');
        });

        it('applies modal-alert-success for type: success', async () => {
            await Modal.alert('hi', 'Saved', { type: 'success' });
            expect(lastShowDialogOpts.className).toContain('modal-alert-success');
        });

        it('applies modal-alert-warning for type: warning', async () => {
            await Modal.alert('hi', 'Heads up', { type: 'warning' });
            expect(lastShowDialogOpts.className).toContain('modal-alert-warning');
        });

        it('applies modal-alert-error for type: error', async () => {
            await Modal.alert('hi', 'Error', { type: 'error' });
            expect(lastShowDialogOpts.className).toContain('modal-alert-error');
        });

        it('applies modal-alert-error for type: danger (alias)', async () => {
            await Modal.alert('hi', 'Error', { type: 'danger' });
            expect(lastShowDialogOpts.className).toContain('modal-alert-error');
        });

        it('preserves caller-supplied className alongside the typed class', async () => {
            await Modal.alert('hi', 'Title', { className: 'my-custom-class' });
            expect(lastShowDialogOpts.className).toContain('modal-alert-info');
            expect(lastShowDialogOpts.className).toContain('my-custom-class');
        });
    });

    describe('Modal.alert — eyebrow + headline structure', () => {
        it('builds title as eyebrow + headline spans (no inline icon)', async () => {
            await Modal.alert('hi', 'Custom Title', { type: 'success' });
            expect(lastShowDialogOpts.title).toContain('modal-alert-eyebrow');
            expect(lastShowDialogOpts.title).toContain('modal-alert-headline');
            expect(lastShowDialogOpts.title).toContain('Custom Title');
            // Inline colored icon removed — band + tint communicate the type now
            expect(lastShowDialogOpts.title).not.toContain('bi-check-circle-fill');
        });

        it('uses default eyebrow text per type', async () => {
            await Modal.alert('hi', 'T', { type: 'info' });
            expect(lastShowDialogOpts.title).toContain('INFORMATION');
            showDialogSpy.mockClear();

            await Modal.alert('hi', 'T', { type: 'success' });
            expect(lastShowDialogOpts.title).toContain('SUCCESS');
            showDialogSpy.mockClear();

            await Modal.alert('hi', 'T', { type: 'warning' });
            expect(lastShowDialogOpts.title).toContain('WARNING');
            showDialogSpy.mockClear();

            await Modal.alert('hi', 'T', { type: 'error' });
            expect(lastShowDialogOpts.title).toContain('ERROR');
            showDialogSpy.mockClear();

            await Modal.alert('hi', 'T', { type: 'danger' });
            expect(lastShowDialogOpts.title).toContain('ERROR'); // danger aliases error
        });

        it('honors a caller-supplied eyebrow override', async () => {
            await Modal.alert('hi', 'Saved', { type: 'success', eyebrow: 'ACCOUNT / SAVED' });
            expect(lastShowDialogOpts.title).toContain('ACCOUNT / SAVED');
            expect(lastShowDialogOpts.title).not.toContain('SUCCESS<');
        });

        it('wraps the message in a modal-alert-message paragraph', async () => {
            await Modal.alert('Body text here.', 'T', { type: 'info' });
            expect(lastShowDialogOpts.body).toContain('modal-alert-message');
            expect(lastShowDialogOpts.body).toContain('Body text here.');
        });
    });

    describe('Modal.showError', () => {
        it('forwards to Modal.alert with type: error', async () => {
            await Modal.showError('oops');
            expect(showDialogSpy).toHaveBeenCalledTimes(1);
            expect(lastShowDialogOpts.className).toContain('modal-alert-error');
            expect(lastShowDialogOpts.title).toContain('Error');
        });
    });
};
