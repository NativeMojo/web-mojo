/**
 * ModalView — Bootstrap 5 modal as a focused View class.
 *
 * Owns only the modal-class mechanics: lifecycle, sizing, stacking,
 * header/body/footer composition, button rendering, and the optional
 * header context menu. All static convenience helpers (alert, confirm,
 * prompt, dialog, form, modelForm, code, htmlPreview, ...) live on
 * `Modal.js` — the canonical static API.
 *
 * Direct instantiation is supported for callers that need the instance
 * handle (event listeners, dynamic setContent, etc.). Most code should
 * use `Modal.dialog()` / `Modal.show()` / `app.modal.*` instead.
 *
 * @example
 * import ModalView from '@core/views/feedback/ModalView.js';
 *
 * const modal = new ModalView({
 *   title: 'Hello',
 *   body: '<p>World</p>',
 *   buttons: [{ text: 'OK', class: 'btn-primary', dismiss: true }]
 * });
 * await modal.render(true, document.body);
 * modal.show();
 */

import View from '@core/View.js';

class ModalView extends View {
    // Stack of currently-open modals, used for z-index management.
    static _openDialogs = [];

    static _baseZIndex = {
        backdrop: 1050,
        modal: 1055
    };

    /**
     * Return a z-index pair appropriate for the current page state.
     * When a `.table-fullscreen` element is active (TableView fullscreen
     * mode), modals must stack above it; otherwise the Bootstrap defaults
     * are fine.
     */
    static getFullscreenAwareZIndex() {
        const fullscreenTable = document.querySelector('.table-fullscreen');
        if (fullscreenTable) {
            return { backdrop: 10040, modal: 10050 };
        }
        return ModalView._baseZIndex;
    }

    /**
     * Re-stack all open modal backdrops so each backdrop sits below its
     * own modal but above all earlier modals in the stack.
     */
    static fixAllBackdropStacking() {
        const backdrops = document.querySelectorAll('.modal-backdrop');
        const openDialogs = ModalView._openDialogs;
        if (backdrops.length === 0 || openDialogs.length === 0) return;

        const sorted = [...openDialogs].sort(
            (a, b) => (a._dialogZIndex || 0) - (b._dialogZIndex || 0)
        );

        const fullscreen = document.querySelector('.table-fullscreen');
        const targetContainer = fullscreen || document.body;

        backdrops.forEach((backdrop, index) => {
            if (index >= sorted.length) return;
            const dialog = sorted[index];
            backdrop.style.zIndex = dialog._dialogZIndex - 5;
            if (backdrop.parentNode !== targetContainer) {
                targetContainer.appendChild(backdrop);
            }
        });
    }

    static updateAllBackdropStacking() {
        ModalView.fixAllBackdropStacking();
    }

    /**
     * Resolve where a modal should be appended — inside the active
     * fullscreen element (so its z-index is contained) or otherwise on
     * `document.body`. Static so callers can match the mount target
     * before rendering (e.g. `await modal.render(true, getMountTarget())`).
     */
    static getMountTarget() {
        return document.querySelector('.table-fullscreen') || document.body;
    }

    constructor(options = {}) {
        const modalId = options.id || `modal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

        // Suppress the colored hero band when the caller owns the top of the
        // card — i.e. they passed their own header content/view or disabled
        // the header entirely. The band's `::before` overlays the top 28px of
        // .modal-content and would otherwise paint over a custom header.
        const headerDisabled = options.header === false || options.header === null;
        const headerCustomized = options.headerContent !== undefined && options.headerContent !== null;
        const bandlessClass = '';// (headerDisabled || headerCustomized) ? 'modal-bandless' : '';

        super({
            ...options,
            id: modalId,
            tagName: 'div',
            className: `modal ${options.fade !== false ? 'fade' : ''} ${bandlessClass} ${options.className || ''}`.trim().replace(/\s+/g, ' '),
            attributes: {
                tabindex: '-1',
                'aria-hidden': 'true',
                'aria-labelledby': options.labelledBy || `${modalId}-label`,
                'aria-describedby': options.describedBy || null,
                ...options.attributes
            }
        });

        this.modalId = modalId;
        this.title = options.title || '';
        this.titleId = `${this.modalId}-label`;

        // Sizing
        this.size = options.size || '';
        this.centered = options.centered !== undefined ? options.centered : false;
        this.scrollable = options.scrollable !== undefined ? options.scrollable : false;
        this.autoSize = options.autoSize || options.size === 'auto';

        // Bootstrap modal options
        this.backdrop = options.backdrop !== undefined ? options.backdrop : true;
        this.keyboard = options.keyboard !== undefined ? options.keyboard : true;
        this.focus = options.focus !== undefined ? options.focus : true;

        // Header
        this.header = options.header !== undefined ? options.header : true;
        this.headerContent = options.headerContent || null;
        this.headerView = null;
        this.closeButton = options.closeButton !== undefined ? options.closeButton : true;
        this.contextMenu = options.contextMenu || null;
        this._processHeaderContent(this.headerContent);

        // Body — accepts string, View, function, or Promise<View>.
        // Aliases: `view`, `message`, `content`. Priority: body > view > message > content.
        this.body = options.body ?? options.view ?? options.message ?? options.content ?? '';
        this.bodyView = null;
        this.bodyClass = options.bodyClass || '';
        this.noBodyPadding = options.noBodyPadding || false;

        // Auto-size constraints
        this.minWidth = options.minWidth || 300;
        this.minHeight = options.minHeight || 200;
        if (options.maxHeight) this.maxHeight = options.maxHeight;
        this.maxWidthPercent = options.maxWidthPercent || 0.9;
        this.maxHeightPercent = options.maxHeightPercent || 0.8;

        this._processBodyContent(this.body);

        // Footer
        this.footer = options.footer || null;
        this.footerView = null;
        this.footerClass = options.footerClass || '';
        this._processFooterContent(this.footer);

        // Buttons (rendered into the footer when no custom footer is given)
        this.buttons = options.buttons || null;

        // Bootstrap-event callbacks (pass-through to native modal events)
        this.onShow = options.onShow || null;
        this.onShown = options.onShown || null;
        this.onHide = options.onHide || null;
        this.onHidden = options.onHidden || null;
        this.onHidePrevented = options.onHidePrevented || null;

        this.autoShow = options.autoShow !== undefined ? options.autoShow : false;
        this.modal = null;
        this.relatedTarget = options.relatedTarget || null;
    }

    // ── Body / header / footer normalization ─────────────────

    _processBodyContent(body) {
        if (body instanceof View || (body && typeof body === 'object' && typeof body.render === 'function')) {
            this.bodyView = body;
            this.body = '';
            this.addChild(this.bodyView);
        } else if (typeof body === 'function') {
            try {
                const result = body();
                if (result instanceof View) {
                    this.bodyView = result;
                    this.body = '';
                    this.addChild(this.bodyView);
                } else if (result instanceof Promise) {
                    this.bodyPromise = result;
                    this.body = '<div class="text-center"><div class="spinner-border spinner-border-sm"></div></div>';
                } else {
                    this.body = result;
                }
            } catch (error) {
                console.error('ModalView: error processing body function:', error);
                this.body = body;
            }
        } else {
            this.body = body;
        }
    }

    _processHeaderContent(headerContent) {
        if (headerContent instanceof View) {
            this.headerView = headerContent;
            this.headerContent = null;
            this.addChild(this.headerView);
        } else if (typeof headerContent === 'function') {
            try {
                const result = headerContent();
                if (result instanceof View) {
                    this.headerView = result;
                    this.headerContent = null;
                    this.addChild(this.headerView);
                } else if (result instanceof Promise) {
                    this.headerPromise = result;
                    this.headerContent = '<div class="text-center"><div class="spinner-border spinner-border-sm"></div></div>';
                } else {
                    this.headerContent = result;
                }
            } catch (error) {
                console.error('ModalView: error processing headerContent function:', error);
                this.headerContent = headerContent;
            }
        } else {
            this.headerContent = headerContent;
        }
    }

    _processFooterContent(footer) {
        if (footer instanceof View) {
            this.footerView = footer;
            this.footer = null;
            this.addChild(this.footerView);
        } else if (typeof footer === 'function') {
            try {
                const result = footer();
                if (result instanceof View) {
                    this.footerView = result;
                    this.footer = null;
                    this.addChild(this.footerView);
                } else if (result instanceof Promise) {
                    this.footerPromise = result;
                    this.footer = '<div class="text-center"><div class="spinner-border spinner-border-sm"></div></div>';
                } else {
                    this.footer = result;
                }
            } catch (error) {
                console.error('ModalView: error processing footer function:', error);
                this.footer = footer;
            }
        } else {
            this.footer = footer;
        }
    }

    // ── Template ──────────────────────────────────────────────

    async getTemplate() {
        const dialogClasses = ['modal-dialog'];

        if (this.size && this.size !== 'auto') {
            if (this.size.startsWith('fullscreen')) {
                dialogClasses.push(`modal-${this.size}`);
            } else if (['sm', 'lg', 'xl', 'xxl'].includes(this.size)) {
                dialogClasses.push(`modal-${this.size}`);
                if (['lg', 'xl', 'xxl'].includes(this.size)) {
                    dialogClasses.push('modal-fullscreen-sm-down');
                }
            }
        }

        if (this.centered) dialogClasses.push('modal-dialog-centered');

        if (this.scrollable) {
            if (!this.maxHeight) {
                dialogClasses.push('modal-dialog-scrollable');
            } else {
                dialogClasses.push('overflow-hidden');
            }
        }

        return `
      <div class="${dialogClasses.join(' ')}">
        <div class="modal-content">
          ${await this.buildHeader()}
          ${await this.buildBody()}
          ${await this.buildFooter()}
        </div>
      </div>
    `;
    }

    async buildHeader() {
        if (!this.header) return '';

        if (this.headerView) {
            this.headerView.replaceById = true;
            return `<div class="modal-header" data-view-container="header">
        <div id="${this.headerView.id}"></div>
      </div>`;
        }

        if (this.headerContent) {
            return `<div class="modal-header">${this.headerContent}</div>`;
        }

        let headerActions = '';
        if (this.contextMenu && this.contextMenu.items && this.contextMenu.items.length > 0) {
            headerActions = await this.buildContextMenu();
        } else if (this.closeButton) {
            headerActions = '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>';
        }

        return `
      <div class="modal-header">
        ${this.title ? `<h5 class="modal-title" id="${this.titleId}">${this.title}</h5>` : ''}
        ${headerActions}
      </div>
    `;
    }

    async buildContextMenu() {
        const menuItems = await this.filterContextMenuItems();
        if (menuItems.length === 0) {
            return this.closeButton
                ? '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>'
                : '';
        }

        const triggerIcon = this.contextMenu.icon || 'bi-three-dots-vertical';
        const buttonClass = this.contextMenu.buttonClass || 'btn btn-link p-1 mojo-modal-context-menu-btn';

        const menuItemsHtml = menuItems.map(item => {
            if (item.type === 'divider') {
                return '<li><hr class="dropdown-divider"></li>';
            }
            const icon = item.icon ? `<i class="${item.icon} me-2"></i>` : '';
            const label = item.label || '';

            if (item.href) {
                return `<li><a class="dropdown-item" href="${item.href}"${item.target ? ` target="${item.target}"` : ''}>${icon}${label}</a></li>`;
            } else if (item.action) {
                const dataAttrs = Object.keys(item)
                    .filter(key => key.startsWith('data-'))
                    .map(key => `${key}="${item[key]}"`)
                    .join(' ');
                return `<li><a class="dropdown-item" data-action="${item.action}" ${dataAttrs}>${icon}${label}</a></li>`;
            }
            return '';
        }).join('');

        return `
      <div class="dropdown">
        <button class="${buttonClass}" type="button" data-bs-toggle="dropdown" aria-expanded="false">
          <i class="${triggerIcon}"></i>
        </button>
        <ul class="dropdown-menu dropdown-menu-end">
          ${menuItemsHtml}
        </ul>
      </div>
    `;
    }

    async filterContextMenuItems() {
        if (!this.contextMenu || !this.contextMenu.items) return [];

        const filtered = [];
        for (const item of this.contextMenu.items) {
            if (item.type === 'divider') {
                filtered.push(item);
                continue;
            }

            if (item.permissions) {
                try {
                    const app = this.getApp?.();
                    let user = app?.activeUser || app?.getState?.('activeUser') || null;

                    if (!user && typeof window !== 'undefined' && window.getApp) {
                        try {
                            user = window.getApp()?.activeUser;
                        } catch {
                            // Ignore — fallback is permission denied for this item
                        }
                    }

                    if (user?.hasPermission) {
                        if (!user.hasPermission(item.permissions)) continue;
                    } else {
                        // No permission system — items with permission requirements stay hidden
                        continue;
                    }
                } catch (error) {
                    console.warn('ModalView: error checking permissions for context menu item:', error);
                    continue;
                }
            }

            filtered.push(item);
        }

        return filtered;
    }

    async buildBody() {
        if (this.bodyView) {
            this.bodyView.replaceById = true;
            const bodyClass = this.noBodyPadding ? `modal-body p-0 py-4 ${this.bodyClass}` : `modal-body ${this.bodyClass}`;
            return `<div class="${bodyClass}" data-view-container="body">
        <div id="${this.bodyView.id}"></div>
      </div>`;
        }

        if (!this.body && this.body !== '') return '';

        const bodyClass = this.noBodyPadding ? `modal-body p-0 ${this.bodyClass}` : `modal-body ${this.bodyClass}`;
        return `<div class="${bodyClass}">${this.body}</div>`;
    }

    async buildFooter() {
        if (this.footerView) {
            return `<div class="modal-footer ${this.footerClass}" data-view-container="footer"></div>`;
        }

        if (this.footer !== null && typeof this.footer === 'string') {
            return `<div class="modal-footer ${this.footerClass}">${this.footer}</div>`;
        }

        if (this.buttons && this.buttons.length > 0) {
            const buttonsHtml = this.buttons.map(btn => {
                const dismissAttr = btn.dismiss ? 'data-bs-dismiss="modal"' : '';
                const actionAttr = btn.action ? `data-action="${btn.action}"` : '';
                const idAttr = btn.id ? `id="${btn.id}"` : '';
                const disabledAttr = btn.disabled ? 'disabled' : '';

                return `
          <button type="${btn.type || 'button'}"
                  class="btn ${btn.class || 'btn-secondary'}"
                  ${idAttr} ${dismissAttr} ${actionAttr} ${disabledAttr}>
            ${btn.icon ? `<i class="bi ${btn.icon} me-1"></i>` : ''}
            ${btn.text || 'Button'}
          </button>
        `;
            }).join('');

            return `<div class="modal-footer ${this.footerClass}">${buttonsHtml}</div>`;
        }

        return '';
    }

    // ── Lifecycle ──────────────────────────────────────────────

    /**
     * Override mount: modals don't need a container — they attach
     * themselves to the active fullscreen element or document.body.
     */
    async mount(_container = null) {
        if (this.mounted || this.destroyed) return;
        if (!this.element) {
            throw new Error('Cannot mount modal without element');
        }

        await this.onBeforeMount();

        const targetContainer = ModalView.getMountTarget();
        targetContainer.appendChild(this.element);

        this.bindEvents();
        this.mounted = true;

        await this.onAfterMount();
        this.emit('mounted', { view: this });

        return this;
    }

    async onAfterRender() {
        await super.onAfterRender();

        // Apply Prism syntax highlighting if any code blocks are present.
        if (window.Prism && this.element) {
            const codeBlocks = this.element.querySelectorAll('pre code');
            if (codeBlocks.length > 0) {
                window.Prism.highlightAllUnder(this.element);
            }
        }

        if (this.autoSize) {
            this.setupAutoSizing();
        } else if (this.maxHeight) {
            const modalBody = this.element.querySelector('.modal-body');
            if (modalBody) modalBody.style.maxHeight = `${this.maxHeight}px`;
        }
    }

    async onAfterMount() {
        await super.onAfterMount();

        if (typeof window === 'undefined' || !window.bootstrap?.Modal) return;

        if (this.backdrop === 'static') {
            this.element.setAttribute('data-bs-backdrop', 'static');
        }
        if (!this.keyboard) {
            this.element.setAttribute('data-bs-keyboard', 'false');
        }

        this.modal = new window.bootstrap.Modal(this.element, {
            backdrop: this.backdrop,
            keyboard: this.keyboard,
            focus: this.focus
        });

        this.bindBootstrapEvents();

        if (this.autoShow) this.show(this.relatedTarget);
    }

    // ── Auto-sizing ────────────────────────────────────────────

    setupAutoSizing() {
        if (!this.element) return;

        this.element.addEventListener('shown.bs.modal', () => {
            this.applyAutoSizing();
        }, { once: true });

        // Fallback for cases where the modal renders without animation.
        setTimeout(() => {
            if (this.isShown()) this.applyAutoSizing();
        }, 100);
    }

    applyAutoSizing() {
        if (!this.element) return;

        try {
            const modalDialog = this.element.querySelector('.modal-dialog');
            const modalContent = this.element.querySelector('.modal-content');
            const modalBody = this.element.querySelector('.modal-body');

            if (!modalDialog || !modalContent || !modalBody) {
                console.warn('ModalView auto-sizing: required elements not found');
                return;
            }

            // Body view may not be rendered yet — retry shortly.
            if (this.bodyView && !this.bodyView.element) {
                setTimeout(() => this.applyAutoSizing(), 50);
                return;
            }

            const originalStyles = {
                dialogMaxWidth: modalDialog.style.maxWidth,
                dialogWidth: modalDialog.style.width,
                contentWidth: modalContent.style.width,
                contentMaxHeight: modalContent.style.maxHeight,
                hadScrollableClass: modalDialog.classList.contains('modal-dialog-scrollable')
            };

            // Strip constraints, force layout, measure natural content size.
            modalDialog.style.maxWidth = 'none';
            modalDialog.style.width = 'auto';
            modalContent.style.width = 'auto';
            modalContent.style.maxHeight = 'none';
            // eslint-disable-next-line no-unused-expressions
            modalContent.offsetHeight;

            const contentRect = modalContent.getBoundingClientRect();

            const viewportMargin = 40;
            const maxWidth = Math.min(
                window.innerWidth * this.maxWidthPercent,
                window.innerWidth - viewportMargin
            );
            let maxHeight = Math.min(
                window.innerHeight * this.maxHeightPercent,
                window.innerHeight - viewportMargin
            );

            let optimalWidth = Math.max(this.minWidth, Math.ceil(contentRect.width + 20));
            let optimalHeight = Math.max(this.minHeight, Math.ceil(contentRect.height));
            if (this.maxHeight) {
                maxHeight = Math.min(this.maxHeight, maxHeight);
                modalDialog.style.maxHeight = `${maxHeight}px`;
            }

            optimalWidth = Math.min(optimalWidth, maxWidth);
            const heightExceedsMax = contentRect.height > maxHeight;

            modalDialog.style.maxWidth = `${optimalWidth}px`;
            modalDialog.style.width = `${optimalWidth}px`;

            if (heightExceedsMax) {
                if (!modalDialog.classList.contains('modal-dialog-scrollable')) {
                    modalDialog.classList.add('modal-dialog-scrollable');
                }
                modalContent.style.maxHeight = `${maxHeight}px`;
                optimalHeight = maxHeight;
            }

            this.autoSizedWidth = optimalWidth;
            this.autoSizedHeight = optimalHeight;
            this._originalStyles = originalStyles;
        } catch (error) {
            console.error('ModalView: error in auto-sizing:', error);
            const dialog = this.element?.querySelector('.modal-dialog');
            if (dialog) dialog.style.maxWidth = '';
        }
    }

    resetAutoSizing() {
        if (!this.autoSize || !this._originalStyles || !this.element) return;

        try {
            const modalDialog = this.element.querySelector('.modal-dialog');
            const modalContent = this.element.querySelector('.modal-content');
            const modalBody = this.element.querySelector('.modal-body');

            if (modalDialog && modalContent && modalBody) {
                modalDialog.style.maxWidth = this._originalStyles.dialogMaxWidth || '';
                modalDialog.style.width = this._originalStyles.dialogWidth || '';
                modalContent.style.width = this._originalStyles.contentWidth || '';
                modalContent.style.maxHeight = this._originalStyles.contentMaxHeight || '';

                if (!this._originalStyles.hadScrollableClass &&
                    modalDialog.classList.contains('modal-dialog-scrollable')) {
                    modalDialog.classList.remove('modal-dialog-scrollable');
                }

                delete this.autoSizedWidth;
                delete this.autoSizedHeight;
                delete this._originalStyles;
            }
        } catch (error) {
            console.error('ModalView: error resetting auto-sizing:', error);
        }
    }

    // ── Bootstrap event wiring ─────────────────────────────────

    bindBootstrapEvents() {
        // show.bs.modal — assign z-index and push onto the open stack.
        this.element.addEventListener('show.bs.modal', (e) => {
            const stackIndex = ModalView._openDialogs.length;
            const zIndexBase = ModalView.getFullscreenAwareZIndex();
            const newZIndex = zIndexBase.modal + (stackIndex * 20);
            this.element.style.zIndex = newZIndex;

            this._dialogZIndex = newZIndex;
            this._backdropZIndex = newZIndex - 10;

            ModalView._openDialogs.push(this);

            if (this.onShow) this.onShow(e);
            this.emit('show', { dialog: this, relatedTarget: e.relatedTarget });
        });

        // shown.bs.modal — fix backdrop stacking and focus first input.
        this.element.addEventListener('shown.bs.modal', (e) => {
            setTimeout(() => ModalView.fixAllBackdropStacking(), 50);

            if (this.onShown) this.onShown(e);
            this.emit('shown', { dialog: this, relatedTarget: e.relatedTarget });

            if (this.focus) {
                const firstInput = this.element.querySelector('input:not([type="hidden"]), textarea, select');
                if (firstInput) firstInput.focus();
            }
        });

        // hide.bs.modal — blur focused element to silence accessibility warning.
        this.element.addEventListener('hide.bs.modal', (e) => {
            const focused = this.element.querySelector(':focus');
            if (focused) focused.blur();

            if (this.onHide) {
                const result = this.onHide(e);
                if (result === false) {
                    e.preventDefault();
                    return;
                }
            }
            this.emit('hide', { dialog: this });
        });

        // hidden.bs.modal — pop from stack, restore focus, restack remaining.
        this.element.addEventListener('hidden.bs.modal', (e) => {
            const index = ModalView._openDialogs.indexOf(this);
            if (index > -1) ModalView._openDialogs.splice(index, 1);

            // Bootstrap removes `modal-open` when its own count reaches zero,
            // but stacked modals share that flag — restore it if any remain.
            if (ModalView._openDialogs.length > 0) {
                document.body.classList.add('modal-open');
                setTimeout(() => ModalView.fixAllBackdropStacking(), 50);
            }

            if (this.previousFocus && document.body.contains(this.previousFocus)) {
                this.previousFocus.focus();
            }

            if (this.onHidden) this.onHidden(e);
            this.emit('hidden', { dialog: this });
        });

        this.element.addEventListener('hidePrevented.bs.modal', (e) => {
            if (this.onHidePrevented) this.onHidePrevented(e);
            this.emit('hidePrevented', { dialog: this });
        });
    }

    // ── Instance methods ───────────────────────────────────────

    show(relatedTarget = null) {
        this.previousFocus = document.activeElement;
        window.lastDialog = this;
        if (this.modal) this.modal.show(relatedTarget);
    }

    hide() {
        const focused = this.element?.querySelector(':focus');
        if (focused) focused.blur();
        if (this.modal) this.modal.hide();
    }

    toggle(relatedTarget = null) {
        if (this.modal) this.modal.toggle(relatedTarget);
    }

    isShown() {
        return this.element?.classList.contains('show') || false;
    }

    getModal() {
        return this.modal;
    }

    handleUpdate() {
        if (this.modal) this.modal.handleUpdate();
    }

    /**
     * Replace the modal body. Accepts a string/HTML or a View instance.
     * Runs after the modal is mounted, so child views must be rendered
     * manually into the body element.
     */
    async setContent(content) {
        if (content instanceof View) {
            if (this.bodyView) {
                await this.bodyView.destroy();
                this.removeChild(this.bodyView);
            }

            this.bodyView = content;
            this.body = '';
            this.addChild(this.bodyView);

            const bodyEl = this.element?.querySelector('.modal-body');
            if (bodyEl) {
                bodyEl.innerHTML = '';
                await this.bodyView.render(bodyEl);
            }
        } else {
            this.body = content;
            const bodyEl = this.element?.querySelector('.modal-body');
            if (bodyEl) bodyEl.innerHTML = content;
        }

        this.handleUpdate();
    }

    setTitle(title) {
        this.title = title;
        const titleEl = this.element?.querySelector('.modal-title');
        if (titleEl) titleEl.textContent = title;
    }

    setLoading(loading = true, message = 'Loading...') {
        const bodyEl = this.element?.querySelector('.modal-body');
        if (!bodyEl) return;

        if (loading) {
            bodyEl.innerHTML = `
        <div class="text-center py-4">
          <div class="spinner-border text-primary mb-3" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          <p>${message}</p>
        </div>
      `;
        } else if (this.bodyView) {
            bodyEl.replaceChildren(this.bodyView.element);
        }
    }

    async destroy() {
        if (this.modal) {
            const focused = this.element?.querySelector(':focus');
            if (focused) focused.blur();

            this.modal.dispose();
            this.modal = null;
        }

        if (this.previousFocus && document.body.contains(this.previousFocus)) {
            this.previousFocus.focus();
            this.previousFocus = null;
        }

        if (this.autoSize) this.resetAutoSizing();

        await super.destroy();
    }

    async onBeforeDestroy() {
        if (this.headerView) await this.headerView.destroy();
        if (this.bodyView) await this.bodyView.destroy();
        if (this.footerView) await this.footerView.destroy();

        await super.onBeforeDestroy();

        // Defensive — destroy() also disposes, but onBeforeDestroy can be
        // reached via a parent's lifecycle path.
        if (this.modal) {
            this.modal.dispose();
            this.modal = null;
        }
    }
}

export default ModalView;
