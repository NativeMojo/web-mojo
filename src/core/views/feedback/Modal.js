/**
 * Modal — AI-friendly static API for showing views in modal dialogs.
 *
 * Thin wrapper around Dialog's static helpers. All methods are static —
 * there is no instance API. Use Modal instead of `new Dialog()`.
 *
 * @example
 * import Modal from '@core/views/feedback/Modal.js';
 *
 * // Show any View in a modal
 * await Modal.show(new MyView({ model }));
 *
 * // Show a model's VIEW_CLASS automatically
 * await Modal.showModel(userModel);
 *
 * // Fetch a model by ID, then show its VIEW_CLASS
 * await Modal.showModelById(User, 42);
 *
 * // Convenience — no need to import Dialog separately
 * const yes = await Modal.confirm('Delete this?', 'Confirm');
 * await Modal.alert('Done!');
 * const data = await Modal.form({ title: 'Add', fields: [...] });
 * await Modal.modelForm({ model, formConfig: MyForms.edit });
 */
import Dialog from './Dialog.js';

class Modal {

    /**
     * Show a View instance in a modal dialog.
     *
     * @param {View} view - The view to display (rendered automatically)
     * @param {object} [options] - Dialog options (size, title, buttons, etc.)
     * @param {string} [options.size='lg'] - Dialog size: sm, md, lg, xl, xxl, fullscreen
     * @param {string|false} [options.title=false] - Dialog title (false = no header)
     * @param {Array} [options.buttons] - Footer buttons
     * @returns {Promise<*>} Resolves with button value or null if dismissed
     *
     * @example
     * await Modal.show(new DeviceView({ model: device }));
     * await Modal.show(new GroupView({ model }), { size: 'xl' });
     */
    static async show(view, options = {}) {
        return Dialog.showDialog({
            header: options.title !== undefined ? !!options.title : false,
            title: options.title || undefined,
            body: view,
            size: 'lg',
            centered: false,
            buttons: [{ text: 'Close', class: 'btn-secondary', dismiss: true }],
            ...options
        });
    }

    /**
     * Show a model's VIEW_CLASS in a modal dialog.
     * Looks up `model.constructor.VIEW_CLASS` and instantiates it.
     *
     * @param {Model} model - Model instance (must have VIEW_CLASS on its constructor)
     * @param {object} [options] - Dialog options passed to Modal.show()
     * @returns {Promise<*>} Resolves with button value or null if dismissed
     * @throws {Error} If no VIEW_CLASS is defined on the model's constructor
     *
     * @example
     * await Modal.showModel(userModel);
     * await Modal.showModel(groupModel, { size: 'xl' });
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
     * Fetch a model by ID, then show its VIEW_CLASS in a modal.
     * Handles the common fetch-then-display pattern.
     *
     * @param {Function} ModelClass - The Model class constructor (e.g., User, Group)
     * @param {string|number} id - The model ID to fetch
     * @param {object} [options] - Dialog options passed to Modal.showModel()
     * @returns {Promise<*>} Resolves with button value, or null if model not found
     *
     * @example
     * await Modal.showModelById(User, 42);
     * await Modal.showModelById(Group, parentId, { size: 'xl' });
     */
    static async showModelById(ModelClass, id, options = {}) {
        const model = new ModelClass({ id });
        await model.fetch();

        if (!model.id) {
            Dialog.alert({
                message: `Could not find ${ModelClass.name || 'record'} with ID: ${id}`,
                type: 'warning'
            });
            return null;
        }

        return Modal.showModel(model, options);
    }

    // ── Canonical typed-alert / confirm / prompt ────────────────
    // Modal owns these implementations. Dialog.alert/confirm/prompt are
    // thin pass-throughs that delegate here.

    /**
     * Show a typed alert dialog (info / success / warning / error).
     *
     * Signatures supported:
     *   Modal.alert(message)
     *   Modal.alert({ message, title?, type?, ...options })
     *   Modal.alert(message, title?)
     *   Modal.alert(message, title?, { type?, ...options })
     *
     * @param {string|object} messageOrOptions - Message string or options object
     * @param {string} [title='Alert'] - Dialog title
     * @param {object} [options] - Additional options. `type`: 'info'|'success'|'warning'|'error'|'danger'
     * @returns {Promise<*>} Resolves when the OK button is clicked or dialog dismissed
     */
    static async alert(messageOrOptions = {}, title, options) {
        // Normalize the call signature
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
            ...rest
        } = opts;

        // Compute typed-alert root class (lands on <div class="modal fade ...">)
        const typeKey = type === 'danger' ? 'error' : type;
        const typeClass = `modal-alert modal-alert-${typeKey}`;
        const className = [typeClass, callerClassName].filter(Boolean).join(' ');

        // Eyebrow micro-label — typed alerts get one by default (it's what
        // makes them feel labeled beyond just the band color). Other modal
        // surfaces (confirm/prompt/show/form) don't go through this code path
        // and never get an eyebrow.
        //
        // Smart suppression: skip the default eyebrow when the headline would
        // just duplicate it case-insensitively (e.g. title="Error" + type=error
        // would otherwise render "ERROR / Error"). Callers can always force
        // suppression with `eyebrow: false` or override with a custom string.
        const defaultEyebrow = {
            info: 'INFORMATION',
            success: 'SUCCESS',
            warning: 'WARNING',
            error: 'ERROR'
        };
        let eyebrowText;
        if (callerEyebrow === false || callerEyebrow === '') {
            eyebrowText = null;
        } else if (callerEyebrow) {
            eyebrowText = callerEyebrow;
        } else {
            const auto = defaultEyebrow[typeKey] ?? defaultEyebrow.info;
            // Skip default if the headline would just repeat it
            eyebrowText = (resolvedTitle.trim().toUpperCase() === auto)
                ? null
                : auto;
        }

        const eyebrowHtml = eyebrowText
            ? `<span class="modal-alert-eyebrow">${eyebrowText}</span>`
            : '';

        // Title is the headline (with optional eyebrow). The hero band and
        // tinted card bg communicate the type — no inline icon needed
        // (per the 05-merged-refined mockup direction).
        const titleHtml =
            eyebrowHtml +
            `<span class="modal-alert-headline">${resolvedTitle}</span>`;

        return Dialog.showDialog({
            title: titleHtml,
            body: `<p class="modal-alert-message">${message}</p>`,
            size: 'sm',
            centered: true,
            className,
            buttons: [
                { text: 'OK', class: 'btn-primary', value: true }
            ],
            ...rest
        });
    }

    /**
     * Show a confirmation dialog with Cancel / Confirm buttons.
     *
     * @param {string|object} messageOrOptions - Message string or options object
     * @param {string} [title='Confirm'] - Dialog title
     * @param {object} [options] - Additional options
     * @returns {Promise<boolean>} Resolves true on Confirm, false on Cancel/dismiss
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

        const dialog = new Dialog({
            title,
            body: `<p>${message}</p>`,
            size: options.size || 'sm',
            centered: true,
            backdrop: 'static',
            buttons: [
                { text: options.cancelText || 'Cancel', class: 'btn-secondary', dismiss: true, action: 'cancel' },
                { text: options.confirmText || 'Confirm', class: options.confirmClass || 'btn-primary', action: 'confirm' }
            ],
            ...options
        });

        const fullscreenElement = document.querySelector('.table-fullscreen');
        const targetContainer = fullscreenElement || document.body;
        await dialog.render(true, targetContainer);
        dialog.show();

        return new Promise((resolve) => {
            let result = false;

            dialog.on('action:confirm', () => {
                result = true;
                dialog.hide();
            });

            dialog.on('hidden', () => {
                dialog.destroy();
                if (dialog.element) dialog.element.remove();
                resolve(result);
            });
        });
    }

    /**
     * Show a prompt dialog with a text input.
     *
     * @param {string} message - Prompt message
     * @param {string} [title='Input'] - Dialog title
     * @param {object} [options] - Additional options (defaultValue, inputType, placeholder, ...)
     * @returns {Promise<string|null>} Resolves to entered text on OK, null on Cancel/dismiss
     */
    static async prompt(message, title = 'Input', options = {}) {
        const inputId = `prompt-input-${Date.now()}`;
        const defaultValue = options.defaultValue || '';
        const inputType = options.inputType || 'text';
        const placeholder = options.placeholder || '';

        const dialog = new Dialog({
            title,
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
            buttons: [
                { text: 'Cancel', class: 'btn-secondary', dismiss: true },
                { text: 'OK', class: 'btn-primary', action: 'ok' }
            ],
            ...options
        });

        const fullscreenElement = document.querySelector('.table-fullscreen');
        const targetContainer = fullscreenElement || document.body;
        await dialog.render(true, targetContainer);
        dialog.show();

        dialog.on('shown', () => {
            const input = dialog.element.querySelector(`#${inputId}`);
            if (input) {
                input.focus();
                input.select();
            }
        });

        return new Promise((resolve) => {
            let result = null;

            dialog.on('action:ok', () => {
                const input = dialog.element.querySelector(`#${inputId}`);
                result = input ? input.value : null;
                dialog.hide();
            });

            dialog.on('hidden', () => {
                dialog.destroy();
                if (dialog.element) dialog.element.remove();
                resolve(result);
            });
        });
    }

    // ── Convenience aliases ─────────────────────────
    // Re-exported so you never need to import Dialog separately.

    /** @see Dialog.showForm */
    static form(options) {
        return Dialog.showForm(options);
    }

    /** @see Dialog.showModelForm */
    static modelForm(options) {
        return Dialog.showModelForm(options);
    }

    /** @see Dialog.showData */
    static data(options) {
        return Dialog.showData(options);
    }

    /** @see Dialog.showDialog — generic dialog with full options control */
    static dialog(options) {
        return Dialog.showDialog(options);
    }

    /** Show an error-typed alert. Equivalent to Modal.alert(msg, 'Error', { type: 'error' }). */
    static showError(message) {
        return Modal.alert(message, 'Error', { type: 'error' });
    }

    // ── Loading indicator ───────────────────────
    // Full-screen overlay with spinner for blocking operations.
    // Supports nested calls (counter-based) — call hide for each show.
    // Modern frosted-glass card design with configurable message.

    static _loadingEl = null;
    static _loadingCounter = 0;
    static _loadingTimeout = null;

    /**
     * Show full-screen loading overlay.
     * @param {string|object} [options] - Message string or { message, timeout }
     * @param {string} [options.message='Loading...'] - Message to display
     * @param {number} [options.timeout=30000] - Auto-hide timeout in ms (0 = no timeout)
     * @example
     * Modal.loading('Saving...');
     * await someApiCall();
     * Modal.hideLoading();
     *
     * // With timeout
     * Modal.loading({ message: 'Processing...', timeout: 60000 });
     */
    static loading(options) {
        if (typeof options === 'string') options = { message: options };
        const { message = 'Loading...', timeout = 30000 } = options || {};

        Modal._loadingCounter++;

        if (Modal._loadingCounter === 1) {
            if (Modal._loadingTimeout) {
                clearTimeout(Modal._loadingTimeout);
            }

            if (!Modal._loadingEl) {
                Modal._loadingEl = document.createElement('div');
                Modal._loadingEl.className = 'mojo-loading-overlay';
                Modal._loadingEl.innerHTML = `
                    <div class="mojo-loading-card">
                        <div class="mojo-loading-spinner"></div>
                        <div class="mojo-loading-message">${message}</div>
                    </div>
                    <style>
                        .mojo-loading-overlay {
                            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                            background: rgba(255, 255, 255, 0.4);
                            backdrop-filter: blur(2px);
                            -webkit-backdrop-filter: blur(2px);
                            z-index: 99999;
                            display: flex; align-items: center; justify-content: center;
                            opacity: 0; transition: opacity 0.2s ease;
                        }
                        .mojo-loading-overlay.show { opacity: 1; }
                        .mojo-loading-card {
                            display: flex; align-items: center; gap: 0.85rem;
                            background: #fff;
                            border: 1px solid #e9ecef;
                            border-radius: 12px;
                            padding: 1rem 1.5rem;
                            box-shadow: 0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04);
                        }
                        .mojo-loading-spinner {
                            width: 22px; height: 22px;
                            border: 2.5px solid #e9ecef;
                            border-top-color: #0d6efd;
                            border-radius: 50%;
                            animation: mojo-spin 0.7s linear infinite;
                            flex-shrink: 0;
                        }
                        .mojo-loading-message {
                            font-size: 0.88rem;
                            font-weight: 500;
                            color: #495057;
                            white-space: nowrap;
                        }
                        @keyframes mojo-spin {
                            to { transform: rotate(360deg); }
                        }
                    </style>
                `;
                document.body.appendChild(Modal._loadingEl);
            }

            // Update message
            const msgEl = Modal._loadingEl.querySelector('.mojo-loading-message');
            if (msgEl) msgEl.textContent = message;

            // Trigger fade-in
            requestAnimationFrame(() => {
                if (Modal._loadingEl) Modal._loadingEl.classList.add('show');
            });

            // Auto-timeout
            if (timeout > 0) {
                Modal._loadingTimeout = setTimeout(() => {
                    console.error('Modal.loading timed out.');
                    Modal.hideLoading(true);
                }, timeout);
            }
        } else {
            // Counter > 1: just update the message
            if (Modal._loadingEl) {
                const msgEl = Modal._loadingEl.querySelector('.mojo-loading-message');
                if (msgEl) msgEl.textContent = message;
            }
        }
    }

    /**
     * Hide the loading overlay.
     * @param {boolean} [force=false] - Force-hide regardless of counter
     * @example
     * Modal.hideLoading();       // decrement counter
     * Modal.hideLoading(true);   // force-hide immediately
     */
    static hideLoading(force) {
        if (force) {
            Modal._loadingCounter = 0;
        } else {
            Modal._loadingCounter--;
        }

        if (Modal._loadingCounter <= 0) {
            Modal._loadingCounter = 0;

            if (Modal._loadingTimeout) {
                clearTimeout(Modal._loadingTimeout);
                Modal._loadingTimeout = null;
            }

            if (Modal._loadingEl) {
                Modal._loadingEl.classList.remove('show');
                setTimeout(() => {
                    if (Modal._loadingEl && Modal._loadingCounter === 0) {
                        Modal._loadingEl.remove();
                        Modal._loadingEl = null;
                    }
                }, 200);
            }
        }
    }

    /** @alias loading — backward compat with Dialog.showBusy */
    static showBusy(options) { return Modal.loading(options); }
    /** @alias hideLoading — backward compat with Dialog.hideBusy */
    static hideBusy(force) { return Modal.hideLoading(force); }
}

export default Modal;
