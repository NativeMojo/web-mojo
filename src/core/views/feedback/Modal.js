/**
 * Modal — canonical static API for showing modal dialogs.
 *
 * All modal interactions in new code should go through `Modal.*` (or
 * `app.modal.*`). The underlying View class is `ModalView` — use
 * `new ModalView({...})` only when you need a long-lived instance handle
 * for streaming updates or external event wiring.
 *
 * @example
 * import Modal from '@core/views/feedback/Modal.js';
 *
 * await Modal.alert('All set!', 'Saved', { type: 'success' });
 * const ok = await Modal.confirm('Delete this?');
 * const name = await Modal.prompt('Name?');
 *
 * await Modal.show(new MyView({ model }));
 * await Modal.showModel(userModel);
 * await Modal.showModelById(User, 42);
 *
 * await Modal.dialog({ title: 'Choose', body: '...', buttons: [...] });
 * await Modal.form({ title: 'Add', fields: [...] });
 * await Modal.modelForm({ model, fields: [...] });
 * await Modal.code({ code: src, language: 'javascript' });
 * await Modal.htmlPreview({ html: '<h1>Hi</h1>' });
 *
 * Modal.loading('Saving...');
 * await someApiCall();
 * Modal.hideLoading();
 */

import ModalView from './ModalView.js';
import BusyIndicator from './BusyIndicator.js';
import CodeViewer from './CodeViewer.js';
import HtmlPreview from './HtmlPreview.js';
import { File as FileModel } from '@core/models/Files.js';

class Modal {

    // ── Internal: shared render → show → resolve helper ────────
    //
    // Most static helpers want the same lifecycle: render the modal into
    // the active fullscreen element (or body), show it, attach button
    // listeners that resolve a Promise on click, and clean up on hide.
    // Wrapping that here kills hundreds of lines of duplication.

    /**
     * Render `modal`, show it, and return a Promise that resolves based
     * on button clicks or dismissal.
     *
     * @param {ModalView} modal - the modal instance
     * @param {object} options
     * @param {Array} [options.buttons] - the button configs (from constructor)
     * @param {boolean} [options.rejectOnDismiss=false] - reject vs resolve(null) on dismiss
     * @param {Function} [options.onAction] - async (action, ctx) => result; called for buttons that have `action`
     * @param {Function} [options.cleanup] - extra teardown to run after `hidden`
     * @returns {Promise<*>}
     */
    static _renderAndAwait(modal, {
        buttons = null,
        rejectOnDismiss = false,
        onAction = null,
        cleanup = null
    } = {}) {
        const target = ModalView.getMountTarget();

        return new Promise((resolve, reject) => {
            let resolved = false;
            const finish = (value) => {
                if (resolved) return;
                resolved = true;
                resolve(value);
            };

            const fail = (err) => {
                if (resolved) return;
                resolved = true;
                reject(err);
            };

            // Render asynchronously, then wire up.
            (async () => {
                try {
                    await modal.render(true, target);
                } catch (err) {
                    fail(err);
                    return;
                }

                // Wire up footer button click handlers if provided.
                if (buttons && buttons.length > 0 && modal.element) {
                    const buttonElements = modal.element.querySelectorAll('.modal-footer button');
                    buttonElements.forEach((btnEl, index) => {
                        const cfg = buttons[index];
                        if (!cfg) return;

                        btnEl.addEventListener('click', async (event) => {
                            if (resolved) return;

                            const defaultValue = cfg.value !== undefined
                                ? cfg.value
                                : (cfg.action ?? index);

                            // 1) Per-button handler (legacy showDialog signature)
                            if (typeof cfg.handler === 'function') {
                                try {
                                    const result = await cfg.handler({
                                        dialog: modal,
                                        button: cfg,
                                        index,
                                        event
                                    });

                                    // null/false → keep open
                                    if (result === null || result === false) return;

                                    const valueToResolve = (result === true || result === undefined)
                                        ? defaultValue
                                        : result;

                                    if (!cfg.dismiss) modal.hide();
                                    finish(valueToResolve);
                                } catch (err) {
                                    console.error('Modal button handler error:', err);
                                    // Keep open on handler error
                                }
                                return;
                            }

                            // 2) Caller-provided onAction (form/modelForm/etc.)
                            if (typeof onAction === 'function' && cfg.action) {
                                try {
                                    const result = await onAction(cfg.action, {
                                        dialog: modal,
                                        button: cfg,
                                        index,
                                        event
                                    });

                                    if (result === null || result === false) return;

                                    const valueToResolve = (result === true || result === undefined)
                                        ? defaultValue
                                        : result;

                                    if (!cfg.dismiss) modal.hide();
                                    finish(valueToResolve);
                                } catch (err) {
                                    console.error('Modal onAction error:', err);
                                }
                                return;
                            }

                            // 3) No handler — resolve with default and close
                            if (!cfg.dismiss) modal.hide();
                            finish(defaultValue);
                        });
                    });
                }

                // Cleanup on hidden — covers backdrop click, ESC, or our own hide().
                modal.on('hidden', () => {
                    if (!resolved) {
                        if (rejectOnDismiss) {
                            fail(new Error('Dialog dismissed'));
                        } else {
                            finish(null);
                        }
                    }
                    setTimeout(async () => {
                        try {
                            if (typeof cleanup === 'function') await cleanup(modal);
                        } catch (err) {
                            console.error('Modal cleanup error:', err);
                        }
                        try {
                            await modal.destroy();
                        } catch (err) {
                            console.error('Modal destroy error:', err);
                        }
                        if (modal.element?.parentNode) {
                            modal.element.parentNode.removeChild(modal.element);
                        }
                    }, 100);
                });

                modal.show();
            })();
        });
    }

    // ── Generic dialog ────────────────────────────────────────

    /**
     * Generic promise-based dialog. Returns the clicked button's
     * `value` (or its `action` / index when `value` is omitted), or
     * `null` on dismiss.
     */
    /**
     * Build a CSS `style` string with the `--mojo-eyebrow` custom property
     * set so the hero band's `content` picks it up. View applies the
     * returned string to `element.style.cssText` on the modal root.
     *
     * Caller's `eyebrow` option (string | null | '' | false | undefined)
     * always wins over the helper's default. `null`, `''`, and `false`
     * all clear the band content. `undefined` falls back to the default.
     *
     * @param {string} defaultEyebrow - the helper's default eyebrow text
     * @param {string|null|false|undefined} callerEyebrow - user override
     * @param {string} [callerStyle] - any other style string from the caller
     * @returns {string} merged style string suitable for opts.style
     */
    /**
     * Resolve the eyebrow text a helper will end up showing.
     * Pure function — no formatting, just the value.
     */
    static _resolveEyebrow(defaultEyebrow, callerEyebrow) {
        if (callerEyebrow === null || callerEyebrow === false || callerEyebrow === '') return '';
        if (typeof callerEyebrow === 'string') return callerEyebrow;
        return defaultEyebrow || '';
    }

    /**
     * If the modal-header title would just duplicate the band's eyebrow
     * (case-insensitive), suppress the header title — the band already
     * carries it and is the always-on system anchor.
     */
    static _suppressDuplicateTitle(title, eyebrowText) {
        if (!eyebrowText || !title) return title;
        const t = String(title).trim().toUpperCase();
        const e = String(eyebrowText).trim().toUpperCase();
        return t === e ? '' : title;
    }

    static _eyebrowStyle(defaultEyebrow, callerEyebrow, callerStyle) {
        // If a higher-level helper already resolved the eyebrow into
        // callerStyle (e.g. Modal.alert → Modal.dialog), don't clobber it
        // by appending the current helper's default. Caller's explicit
        // eyebrow option (when defined) still wins below.
        if (callerEyebrow === undefined &&
            typeof callerStyle === 'string' &&
            callerStyle.includes('--mojo-eyebrow')) {
            return callerStyle;
        }

        const finalText = Modal._resolveEyebrow(defaultEyebrow, callerEyebrow);

        // Strip quotes/backslashes to keep the CSS string syntactically valid
        const safe = String(finalText).replace(/['"\\]/g, '');
        const styleVar = `--mojo-eyebrow: '${safe}'`;
        return [callerStyle, styleVar].filter(Boolean).join('; ');
    }

    static async dialog(options = {}) {
        // Legacy signature: (message, title, options)
        if (typeof options === 'string') {
            const message = arguments[0];
            const title = arguments[1] || 'Alert';
            const opts = arguments[2] || {};
            options = { ...opts, body: message, title };
        }

        const {
            title = 'Dialog',
            content,
            body,
            view,
            message,
            size = 'md',
            centered = true,
            buttons = [{ text: 'OK', class: 'btn-primary', value: true }],
            rejectOnDismiss = false,
            eyebrow,
            style: callerStyle,
            ...rest
        } = options;

        const resolvedBody = body ?? view ?? message ?? content ?? '';

        // Modal.dialog is the generic surface — band is empty unless the
        // caller passes an explicit eyebrow.
        const eyebrowText = Modal._resolveEyebrow('', eyebrow);
        const finalTitle = Modal._suppressDuplicateTitle(title, eyebrowText);
        const style = Modal._eyebrowStyle('', eyebrow, callerStyle);

        const modal = new ModalView({
            title: finalTitle,
            body: resolvedBody,
            size,
            centered,
            buttons,
            style,
            ...rest
        });

        return Modal._renderAndAwait(modal, { buttons, rejectOnDismiss });
    }

    // ── show / showModel / showModelById ──────────────────────

    /**
     * Show a View instance in a modal. Header is hidden by default
     * (views typically have their own headers). Size defaults to `lg`.
     */
    static async show(view, options = {}) {
        const { eyebrow, style: callerStyle, ...rest } = options;
        return Modal.dialog({
            header: options.title !== undefined ? !!options.title : false,
            title: options.title || undefined,
            body: view,
            size: 'lg',
            centered: false,
            buttons: [{ text: 'Close', class: 'btn-secondary', dismiss: true }],
            style: Modal._eyebrowStyle('DETAILS', eyebrow, callerStyle),
            ...rest
        });
    }

    /**
     * Look up `model.constructor.VIEW_CLASS` and show it in a modal.
     */
    static async showModel(model, options = {}) {
        const ModelClass = model.constructor;
        const ViewClass = ModelClass?.VIEW_CLASS;

        if (!ViewClass) {
            throw new Error(
                `Modal.showModel: No VIEW_CLASS defined on ${ModelClass?.name || 'model'}. ` +
                `Set ${ModelClass?.name || 'Model'}.VIEW_CLASS = YourView to use this method.`
            );
        }

        const view = new ViewClass({ model });
        return Modal.show(view, options);
    }

    /**
     * Fetch a model by ID, then show its VIEW_CLASS. Resolves to `null`
     * if the model is not found (with a warning alert).
     */
    static async showModelById(ModelClass, id, options = {}) {
        const model = new ModelClass({ id });
        await model.fetch();

        if (!model.id) {
            Modal.alert({
                message: `Could not find ${ModelClass.name || 'record'} with ID: ${id}`,
                type: 'warning'
            });
            return null;
        }

        return Modal.showModel(model, options);
    }

    /**
     * Read-only display of a model in a modal — uses the model's
     * registered VIEW_CLASS without buttons.
     */
    static async showModelView(model, options = {}) {
        const ModelClass = model.constructor;
        const ViewClass = ModelClass?.VIEW_CLASS;
        if (!ViewClass) {
            throw new Error(
                `Modal.showModelView: No VIEW_CLASS defined on ${ModelClass?.name || 'model'}.`
            );
        }
        const viewInstance = new ViewClass({ model });
        const { eyebrow, style: callerStyle, ...rest } = options;
        return Modal.dialog({
            header: false,
            body: viewInstance,
            size: 'lg',
            centered: false,
            style: Modal._eyebrowStyle('DETAILS', eyebrow, callerStyle),
            ...rest
        });
    }

    // ── alert / confirm / prompt / showError ──────────────────

    /**
     * Typed alert with a single OK button. Dialog style follows `type`
     * ('info' | 'success' | 'warning' | 'error' | 'danger'); the modal
     * root receives a `modal-alert modal-alert-{type}` className.
     */
    static async alert(messageOrOptions = {}, title, options) {
        let opts;
        if (typeof messageOrOptions === 'string') {
            opts = {
                message: messageOrOptions,
                ...(title !== undefined ? { title } : {}),
                ...(options || {})
            };
        } else {
            opts = { ...messageOrOptions };
        }

        const {
            message = '',
            title: resolvedTitle = 'Alert',
            type = 'info',
            eyebrow: callerEyebrow,
            className: callerClassName,
            style: callerStyle,
            ...rest
        } = opts;

        const typeKey = type === 'danger' ? 'error' : type;
        const typeClass = `modal-alert modal-alert-${typeKey}`;
        const className = [typeClass, callerClassName].filter(Boolean).join(' ');

        // Hero band carries the type label. Default per type, override via
        // `eyebrow: 'CUSTOM'`, suppress with `eyebrow: null|false|''`.
        const defaultEyebrowMap = {
            info: 'INFORMATION',
            success: 'SUCCESS',
            warning: 'WARNING',
            error: 'ERROR'
        };
        const defaultEyebrow = defaultEyebrowMap[typeKey] ?? defaultEyebrowMap.info;
        const eyebrowText = Modal._resolveEyebrow(defaultEyebrow, callerEyebrow);
        const finalTitle = Modal._suppressDuplicateTitle(resolvedTitle, eyebrowText);
        const style = Modal._eyebrowStyle(defaultEyebrow, callerEyebrow, callerStyle);

        // Title is just the headline. The band (CSS) carries the type label;
        // headline is the user-supplied title — UNLESS it would just repeat
        // the eyebrow, in which case suppress it (the band already shows it).
        const titleHtml = finalTitle
            ? `<span class="modal-alert-headline">${finalTitle}</span>`
            : '';

        return Modal.dialog({
            title: titleHtml,
            body: `<p class="modal-alert-message">${message}</p>`,
            size: 'sm',
            centered: true,
            className,
            style,
            buttons: [{ text: 'OK', class: 'btn-primary', value: true }],
            ...rest
        });
    }

    /**
     * Confirmation dialog. Resolves `true` on Confirm, `false` on
     * Cancel/dismiss.
     */
    static async confirm(messageOrOptions, title = 'Confirm', options = {}) {
        let message;
        if (typeof messageOrOptions === 'object' && messageOrOptions !== null) {
            options = messageOrOptions;
            message = options.message;
            title = options.title || title;
        } else {
            message = messageOrOptions;
        }

        const buttons = [
            { text: options.cancelText || 'Cancel', class: 'btn-secondary', dismiss: true, action: 'cancel' },
            { text: options.confirmText || 'Confirm', class: options.confirmClass || 'btn-primary', action: 'confirm' }
        ];

        const { eyebrow, style: callerStyle, ...rest } = options;
        const eyebrowText = Modal._resolveEyebrow('CONFIRM', eyebrow);
        const finalTitle = Modal._suppressDuplicateTitle(title, eyebrowText);
        const style = Modal._eyebrowStyle('CONFIRM', eyebrow, callerStyle);

        const modal = new ModalView({
            title: finalTitle,
            body: `<p>${message}</p>`,
            size: options.size || 'sm',
            centered: true,
            backdrop: 'static',
            buttons,
            style,
            ...rest
        });

        const result = await Modal._renderAndAwait(modal, {
            buttons,
            onAction: async (action) => (action === 'confirm' ? true : false)
        });

        return result === true;
    }

    /**
     * Prompt dialog with a text input. Resolves to the entered string
     * on OK, `null` on Cancel/dismiss.
     */
    static async prompt(message, title = 'Input', options = {}) {
        const inputId = `prompt-input-${Date.now()}`;
        const defaultValue = options.defaultValue || '';
        const inputType = options.inputType || 'text';
        const placeholder = options.placeholder || '';

        const buttons = [
            { text: 'Cancel', class: 'btn-secondary', dismiss: true },
            { text: 'OK', class: 'btn-primary', action: 'ok' }
        ];

        const { eyebrow, style: callerStyle, ...rest } = options;
        const eyebrowText = Modal._resolveEyebrow('INPUT', eyebrow);
        const finalTitle = Modal._suppressDuplicateTitle(title, eyebrowText);
        const style = Modal._eyebrowStyle('INPUT', eyebrow, callerStyle);

        const modal = new ModalView({
            title: finalTitle,
            body: `
                <p>${message}</p>
                <input type="${inputType}"
                       class="form-control"
                       id="${inputId}"
                       value="${defaultValue}"
                       placeholder="${placeholder}">
            `,
            size: options.size || 'sm',
            centered: true,
            backdrop: 'static',
            buttons,
            style,
            ...rest
        });

        modal.on('shown', () => {
            const input = modal.element.querySelector(`#${inputId}`);
            if (input) {
                input.focus();
                input.select();
            }
        });

        return Modal._renderAndAwait(modal, {
            buttons,
            onAction: async (action) => {
                if (action !== 'ok') return null;
                const input = modal.element.querySelector(`#${inputId}`);
                return input ? input.value : null;
            }
        });
    }

    /** Convenience: equivalent to `Modal.alert(msg, 'Error', { type: 'error' })`. */
    static showError(message) {
        return Modal.alert(message, 'Error', { type: 'error' });
    }

    // ── form / modelForm / data ───────────────────────────────

    /**
     * Show a `FormView` in a modal for ad-hoc data collection
     * (no automatic model save). Resolves with the collected data,
     * or `null` on cancel/dismiss.
     */
    static async form(options = {}) {
        const {
            title = 'Form',
            formConfig = {},
            size = 'md',
            centered = true,
            submitText = 'Submit',
            cancelText = 'Cancel',
            eyebrow,
            style: callerStyle,
            ...rest
        } = options;

        const FormView = (await import('@core/forms/FormView.js')).default;
        const formView = new FormView({
            fileHandling: options.fileHandling || 'base64',
            data: options.data,
            defaults: options.defaults,
            model: options.model,
            formConfig: {
                fields: formConfig.fields || options.fields,
                ...formConfig,
                submitButton: false,
                resetButton: false
            }
        });

        const buttons = [
            { text: cancelText, class: 'btn-secondary', action: 'cancel' },
            { text: submitText, class: 'btn-primary', action: 'submit' }
        ];

        // Form's title becomes the eyebrow (uppercased) by default;
        // header title is suppressed when it would just duplicate the band.
        const defaultEyebrow = String(title || 'FORM').toUpperCase();
        const eyebrowText = Modal._resolveEyebrow(defaultEyebrow, eyebrow);
        const finalTitle = Modal._suppressDuplicateTitle(title, eyebrowText);
        const style = Modal._eyebrowStyle(defaultEyebrow, eyebrow, callerStyle);

        const modal = new ModalView({
            title: finalTitle, body: formView, size, centered, buttons, style, ...rest
        });

        return Modal._renderAndAwait(modal, {
            buttons,
            onAction: async (action) => {
                if (action === 'cancel') return null;
                if (action !== 'submit') return null;

                if (!formView.validate()) {
                    formView.focusFirstError();
                    return false;  // keep open
                }

                if (options.autoSave && options.model) {
                    modal.setLoading(true);
                    const result = await formView.saveModel();
                    if (!result.success) {
                        modal.setLoading(false);
                        await modal.render();
                        modal.getApp()?.toast?.error(result.message);
                        return false;
                    }
                    return result;
                }

                try {
                    return await formView.getFormData();
                } catch (error) {
                    console.error('Modal.form: error collecting form data:', error);
                    formView.showError('Error collecting form data');
                    return false;
                }
            },
            cleanup: async () => {
                try { await formView.destroy(); } catch { /* best-effort */ }
            }
        });
    }

    /**
     * Show a `FormView` bound to a model. On submit, validates and
     * saves the model automatically. Resolves with the save result,
     * or `null` on cancel/dismiss.
     */
    static async modelForm(options = {}) {
        const {
            title = 'Edit',
            formConfig = {},
            size = 'md',
            centered = true,
            submitText = 'Save',
            cancelText = 'Cancel',
            model,
            fields,
            eyebrow,
            style: callerStyle,
            ...rest
        } = options;

        if (!model) {
            throw new Error('Modal.modelForm requires a model');
        }

        const FormView = (await import('@core/forms/FormView.js')).default;
        const formView = new FormView({
            fileHandling: options.fileHandling || 'base64',
            model,
            data: options.data,
            defaults: options.defaults,
            formConfig: {
                fields: fields || formConfig.fields || [],
                ...formConfig,
                submitButton: false,
                resetButton: false
            }
        });

        const buttons = [
            { text: cancelText, class: 'btn-secondary', action: 'cancel' },
            { text: submitText, class: 'btn-primary', action: 'submit' }
        ];

        // Form's title becomes the eyebrow (uppercased) by default;
        // header title is suppressed when it would just duplicate the band.
        const defaultEyebrow = String(title || 'EDIT').toUpperCase();
        const eyebrowText = Modal._resolveEyebrow(defaultEyebrow, eyebrow);
        const finalTitle = Modal._suppressDuplicateTitle(title, eyebrowText);
        const style = Modal._eyebrowStyle(defaultEyebrow, eyebrow, callerStyle);

        const modal = new ModalView({
            title: finalTitle, body: formView, size, centered, buttons, style, ...rest
        });

        return Modal._renderAndAwait(modal, {
            buttons,
            onAction: async (action) => {
                if (action === 'cancel') return null;
                if (action !== 'submit') return null;

                modal.setLoading(true, 'Saving...');

                try {
                    const result = await formView.handleSubmit();
                    if (result.success) return result;

                    modal.setLoading(false);
                    let errmsg = result.error;
                    if (result.data?.error) errmsg = result.data.error;
                    modal.getApp()?.toast?.error(errmsg);
                    return false;
                } catch (error) {
                    console.error('Modal.modelForm: error saving:', error);
                    await modal.setContent(formView);
                    formView.showError(error.message || 'An error occurred while saving');
                    return false;
                }
            },
            cleanup: async () => {
                try { await formView.destroy(); } catch { /* best-effort */ }
            }
        });
    }

    /**
     * Show structured data in a modal using the `DataView` component.
     * Resolves when the user closes the dialog.
     */
    static async data(options = {}) {
        const {
            title = 'Data View',
            data: payload = {},
            model = null,
            fields = [],
            columns = 2,
            responsive = true,
            showEmptyValues = false,
            emptyValueText = '—',
            size = 'lg',
            centered = true,
            closeText = 'Close',
            ...rest
        } = options;

        const DataView = (await import('@core/views/data/DataView.js')).default;
        const dataView = new DataView({
            data: payload, model, fields, columns, responsive, showEmptyValues, emptyValueText
        });

        const buttons = [{ text: closeText, class: 'btn-secondary', value: 'close' }];

        const modal = new ModalView({
            title, body: dataView, size, centered, buttons, ...rest
        });

        // Forward DataView events for callers that wired listeners on the dialog.
        dataView.on('field:click', (d) => modal.emit('dataview:field:click', d));
        dataView.on('error', (d) => modal.emit('dataview:error', d));

        return Modal._renderAndAwait(modal, {
            buttons,
            cleanup: async () => {
                try { await dataView.destroy(); } catch { /* best-effort */ }
            }
        });
    }

    // ── code / htmlPreview ────────────────────────────────────

    /**
     * Show source code with syntax highlighting and copy-to-clipboard.
     * Accepts an options object: `{ code, language, title, size }`.
     */
    static async code(options = {}) {
        const {
            code = '',
            language = 'javascript',
            title = 'Source Code',
            size = 'lg',
            ...rest
        } = options;

        const codeView = new CodeViewer({ code, language });

        const buttons = [
            { text: 'Copy to Clipboard', class: 'btn-primary', icon: 'bi-clipboard', action: 'copy' },
            { text: 'Close', class: 'btn-secondary', dismiss: true }
        ];

        const modal = new ModalView({
            title, body: codeView, size, scrollable: true, buttons, ...rest
        });

        return Modal._renderAndAwait(modal, {
            buttons,
            onAction: async (action) => {
                if (action !== 'copy') return null;

                if (!navigator.clipboard) return false;
                try {
                    await navigator.clipboard.writeText(code);
                    Modal._showCopySuccess(modal);
                } catch (err) {
                    console.error('Modal.code: clipboard write failed:', err);
                }
                return false;  // keep open after copy
            }
        });
    }

    static _showCopySuccess(modal) {
        const btn = modal.element?.querySelector('[data-action="copy"]');
        if (!btn) return;
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="bi bi-check me-1"></i>Copied!';
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-success');
        btn.disabled = true;
        setTimeout(() => {
            btn.innerHTML = originalHtml;
            btn.classList.remove('btn-success');
            btn.classList.add('btn-primary');
            btn.disabled = false;
        }, 2000);
    }

    /**
     * Render an HTML string in a sandboxed iframe.
     */
    static async htmlPreview(options = {}) {
        const {
            html = options.content || '',
            title = 'HTML Preview',
            size = 'lg',
            height = 500,
            ...rest
        } = options;

        const previewView = new HtmlPreview({ html, height });

        const buttons = [{ text: 'Close', class: 'btn-secondary', dismiss: true }];

        const modal = new ModalView({
            title, body: previewView, size, scrollable: false, buttons, ...rest
        });

        return Modal._renderAndAwait(modal, { buttons });
    }

    // ── updateModelImage (avatar uploader) ────────────────────

    /**
     * Convenience for "upload an image and save it to a model field".
     * Shows an image-upload form, optionally uploads via the FileUpload
     * service, and saves the resulting file ID to the model.
     */
    static async updateModelImage(options = {}, fieldOptions = {}) {
        const upload = options.upload || false;
        const fieldName = fieldOptions.name || options.field || 'image';

        const formOptions = {
            title: 'Upload Your Avatar',
            model: null,
            autoSave: !upload,
            size: 'sm',
            fields: [{
                type: 'image',
                name: fieldName,
                size: 'lg',
                imageSize: { width: 200, height: 200 },
                placeholder: 'Upload your image',
                ...fieldOptions
            }],
            ...options
        };

        const result = await Modal.form(formOptions);

        if (!upload || !result || !options.model) return result;

        const base64Data = result[fieldName];
        if (!base64Data || !base64Data.startsWith('data:')) return result;

        // Decode base64 → File. Defensive about missing File constructor
        // (server-side rendering, locked-down WebView contexts).
        const arr = base64Data.split(',');
        const mimeMatch = arr[0]?.match(/:(.*?);/);
        const mime = mimeMatch?.[1] || 'image/png';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) { u8arr[n] = bstr.charCodeAt(n); }
        const ext = mime.split('/')[1] || 'png';
        const FileCtor = (typeof window !== 'undefined' && window.File) || globalThis.File;
        if (!FileCtor) {
            throw new Error('File API is not available in this environment');
        }
        const file = new FileCtor([u8arr], `${fieldName}.${ext}`, { type: mime });

        const fileModel = new FileModel();
        await fileModel.upload({
            file,
            name: `${fieldName}.${ext}`,
            description: options.uploadDescription || `${fieldName} upload`,
            showToast: true
        });

        return options.model.save({ [fieldName]: fileModel.id });
    }

    // ── Loading indicator (delegates to BusyIndicator) ────────

    /**
     * Show full-screen loading overlay. Reference-counted — pair every
     * `loading()` with a `hideLoading()`.
     */
    static loading(options) {
        BusyIndicator.show(options);
    }

    /**
     * Hide the loading overlay. Pass `true` to force-hide regardless
     * of the reference counter.
     */
    static hideLoading(force) {
        BusyIndicator.hide(force);
    }

    /** @alias loading — backward compat with `Dialog.showBusy`. */
    static showBusy(options) { return Modal.loading(options); }
    /** @alias hideLoading — backward compat with `Dialog.hideBusy`. */
    static hideBusy(force) { return Modal.hideLoading(force); }
}

export default Modal;
