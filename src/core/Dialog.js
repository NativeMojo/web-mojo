/**
 * Dialog - Complete Bootstrap 5 Modal component for MOJO framework
 * Supports all Bootstrap 5 modal features including sizes, fullscreen, scrollable, etc.
 * Can accept View instances as body content
 */

import View from '../core/View.js';
import FormView from '../forms/FormView.js';
import DataView from '../views/data/DataView.js';


class Dialog extends View {
  static _openDialogs = [];
  static _baseZIndex = {
    backdrop: 1050,
    modal: 1055
  };

  static _busyIndicator = null;
  static _busyCounter = 0;
  static _busyTimeout = null;

  /**
   * Shows a full-screen busy indicator.
   * Manages a counter for nested calls, only showing one indicator.
   * @param {object} options - Options { timeout, message }
   */
  static showBusy(options = {}) {
      const { timeout = 30000, message = 'Loading...' } = options;

      this._busyCounter++;

      if (this._busyCounter === 1) {
          if (this._busyTimeout) {
              clearTimeout(this._busyTimeout);
          }

          if (!this._busyIndicator) {
              this._busyIndicator = document.createElement('div');
              this._busyIndicator.className = 'mojo-busy-indicator';
              this._busyIndicator.innerHTML = `
                  <div class="mojo-busy-spinner">
                      <div class="spinner-border text-light" role="status">
                          <span class="visually-hidden">Loading...</span>
                      </div>
                      <p class="mojo-busy-message mt-3 text-light">${message}</p>
                  </div>
                  <style>
                      .mojo-busy-indicator {
                          position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                          background-color: rgba(0, 0, 0, 0.5); z-index: 9999;
                          display: flex; align-items: center; justify-content: center;
                          opacity: 0; transition: opacity 0.15s linear;
                      }
                      .mojo-busy-indicator.show { opacity: 1; }
                      .mojo-busy-spinner .spinner-border { width: 3rem; height: 3rem; }
                  </style>
              `;
              document.body.appendChild(this._busyIndicator);
          }

          const msgElement = this._busyIndicator.querySelector('.mojo-busy-message');
          if (msgElement) msgElement.textContent = message;
          
          setTimeout(() => this._busyIndicator.classList.add('show'), 10);

          this._busyTimeout = setTimeout(() => {
              console.error('Busy indicator timed out.');
              this.hideBusy(true); // Force hide
              this.alert({
                  title: 'Operation Timed Out',
                  message: 'The operation took too long. Please check your connection and try again.',
                  type: 'danger'
              });
          }, timeout);
      }
  }

  /**
   * Hides the full-screen busy indicator.
   * Decrements the counter and only hides when the counter reaches zero.
   * @param {boolean} force - If true, forces the indicator to hide immediately.
   */
  static hideBusy(force = false) {
      if (force) {
          this._busyCounter = 0;
      } else {
          this._busyCounter--;
      }

      if (this._busyCounter <= 0) {
          this._busyCounter = 0;
          if (this._busyTimeout) {
              clearTimeout(this._busyTimeout);
              this._busyTimeout = null;
          }

          if (this._busyIndicator) {
              this._busyIndicator.classList.remove('show');
              setTimeout(() => {
                  if (this._busyIndicator && this._busyCounter === 0) {
                       this._busyIndicator.remove();
                       this._busyIndicator = null;
                  }
              }, 150);
          }
      }
  }

  constructor(options = {}) {
    // Generate unique ID if not provided
    const modalId = options.id || `modal-${Date.now()}`;

    super({
      ...options,
      id: modalId,  // Pass the ID to parent constructor
      tagName: 'div',
      className: `modal ${options.fade !== false ? 'fade' : ''} ${options.className || ''}`,
      attributes: {
        tabindex: '-1',
        'aria-hidden': 'true',
        'aria-labelledby': options.labelledBy || `${modalId}-label`,
        'aria-describedby': options.describedBy || null,
        ...options.attributes
      }
    });

    // Store modal ID for internal use
    this.modalId = modalId;

    // Dialog configuration
    this.title = options.title || '';
    this.titleId = `${this.modalId}-label`;

    // Size options: sm, md (default), lg, xl, fullscreen, auto
    // Or responsive fullscreen: fullscreen-sm-down, fullscreen-md-down, etc.
    // 'auto' enables dynamic sizing based on content dimensions
    this.size = options.size || '';

    // Layout options
    this.centered = options.centered !== undefined ? options.centered : false;
    this.scrollable = options.scrollable !== undefined ? options.scrollable : false;
    // Auto-sizing: dynamically size modal based on content dimensions
    // Can be enabled with autoSize: true or size: 'auto'
    // Waits for modal animation to complete before measuring content
    this.autoSize = options.autoSize || options.size === 'auto'; // Auto-size modal based on content dimensions

    // Bootstrap modal options
    this.backdrop = options.backdrop !== undefined ? options.backdrop : true; // true, false, 'static'
    this.keyboard = options.keyboard !== undefined ? options.keyboard : true;
    this.focus = options.focus !== undefined ? options.focus : true;

    // Content
    this.header = options.header !== undefined ? options.header : true;
    this.headerContent = options.headerContent || null;
    this.closeButton = options.closeButton !== undefined ? options.closeButton : true;
    this.contextMenu = options.contextMenu || null;

    // Enhanced body handling - support View, Promise<View>, or function returning View
    this.body = options.body || options.content || '';
    this.bodyView = null; // Will hold View instance if body is a View
    this.bodyClass = options.bodyClass || '';
    this.noBodyPadding = options.noBodyPadding || false; // Remove default modal-body padding

    // Auto-sizing constraints - only used when autoSize is enabled
    this.minWidth = options.minWidth || 300;        // Minimum modal width (px)
    this.minHeight = options.minHeight || 200;      // Minimum modal height (px)
    this.maxWidthPercent = options.maxWidthPercent || 0.9;  // Max width as % of viewport
    this.maxHeightPercent = options.maxHeightPercent || 0.8; // Max height as % of viewport

    // Handle different body types
    this._processBodyContent(this.body);

    this.footer = options.footer || null;
    this.footerView = null; // Will hold View instance if footer is a View
    this.footerClass = options.footerClass || '';

    // Handle different footer types
    this._processFooterContent(this.footer);

    // Buttons configuration
    this.buttons = options.buttons || null;

    // Callbacks for Bootstrap events
    this.onShow = options.onShow || null;        // show.bs.modal
    this.onShown = options.onShown || null;      // shown.bs.modal
    this.onHide = options.onHide || null;        // hide.bs.modal
    this.onHidden = options.onHidden || null;    // hidden.bs.modal
    this.onHidePrevented = options.onHidePrevented || null; // hidePrevented.bs.modal

    // Auto show on creation
    this.autoShow = options.autoShow !== undefined ? options.autoShow : false;

    // Bootstrap modal instance
    this.modal = null;

    // Related target (button that triggered the modal)
    this.relatedTarget = options.relatedTarget || null;
  }

  /**
   * Process body content to detect and handle View instances
   */
  _processBodyContent(body) {
    if (body && body.render) {
      this.bodyView = body;
      this.body = ''; // Clear string body
      this.addChild(this.bodyView); // Add as child for proper lifecycle
    } else if (typeof body === 'function') {
      // Support lazy View creation
      try {
        const result = body();
        if (result instanceof View) {
          this.bodyView = result;
          this.body = '';
          this.addChild(this.bodyView);
        } else if (result instanceof Promise) {
          // Mark for async processing
          this.bodyPromise = result;
          this.body = '<div class="text-center"><div class="spinner-border spinner-border-sm"></div></div>';
        } else {
          this.body = result;
        }
      } catch (error) {
        console.error('Error processing body function:', error);
        this.body = body;
      }
    } else {
      this.body = body;
    }
  }

  /**
   * Process footer content to detect and handle View instances
   */
  _processFooterContent(footer) {
    if (footer instanceof View) {
      this.footerView = footer;
      this.footer = null;
      this.addChild(this.footerView);
    } else if (typeof footer === 'function') {
      // Support lazy View creation
      try {
        const result = footer();
        if (result instanceof View) {
          this.footerView = result;
          this.footer = null;
          this.addChild(this.footerView);
        } else if (result instanceof Promise) {
          // Mark for async processing
          this.footerPromise = result;
          this.footer = '<div class="text-center"><div class="spinner-border spinner-border-sm"></div></div>';
        } else {
          this.footer = result;
        }
      } catch (error) {
        console.error('Error processing footer function:', error);
        this.footer = footer;
      }
    } else {
      this.footer = footer;
    }
  }

  /**
   * Get dialog template with all Bootstrap 5 features
   */
  async getTemplate() {
    // Build dialog classes
    const dialogClasses = ['modal-dialog'];

    // Add size class (excluding 'auto' which uses default sizing)
    if (this.size && this.size !== 'auto') {
      if (this.size.startsWith('fullscreen')) {
        // Fullscreen or responsive fullscreen
        dialogClasses.push(`modal-${this.size}`);
      } else if (['sm', 'lg', 'xl'].includes(this.size)) {
        // Standard sizes
        dialogClasses.push(`modal-${this.size}`);
      }
    }

    // Add centered class
    if (this.centered) {
      dialogClasses.push('modal-dialog-centered');
    }

    // Add scrollable class
    if (this.scrollable) {
      dialogClasses.push('modal-dialog-scrollable');
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

  /**
   * Build modal header
   */
  async buildHeader() {
    if (!this.header) {
      return '';
    }

    if (this.headerContent) {
      return `<div class="modal-header">${this.headerContent}</div>`;
    }

    // Build context menu or close button
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
      // If no items pass permission checks, show regular close button
      return this.closeButton ? '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>' : '';
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
    if (!this.contextMenu || !this.contextMenu.items) {
      return [];
    }

    const filteredItems = [];

    for (const item of this.contextMenu.items) {
      // Always include dividers
      if (item.type === 'divider') {
        filteredItems.push(item);
        continue;
      }

      // Check permissions if specified
      if (item.permissions) {
        try {
          const app = this.getApp?.();
          let user = null;

          if (app) {
            user = app.activeUser || app.getState?.('activeUser');
          }

          // Also check window.getApp as fallback for mock systems
          if (!user && typeof window !== 'undefined' && window.getApp) {
            try {
              const globalApp = window.getApp();
              user = globalApp?.activeUser;
            } catch (e) {
              // Ignore global app errors
            }
          }

          if (user && user.hasPermission) {
            if (!user.hasPermission(item.permissions)) {
              continue; // Skip this item
            }
          } else {
            // If no permission system available, skip items with permission requirements
            continue;
          }
        } catch (error) {
          console.warn('Error checking permissions for context menu item:', error);
          continue;
        }
      }

      filteredItems.push(item);
    }

    return filteredItems;
  }

  /**
   * Build modal body
   */
  async buildBody() {
    // If we have a View instance as body
    if (this.bodyView) {
      this.bodyView.replaceById = true;
      const bodyClass = this.noBodyPadding ? `modal-body p-0 ${this.bodyClass}` : `modal-body ${this.bodyClass}`;
      return `<div class="${bodyClass}" data-view-container="body">
        <!-- View will be mounted here -->
        <div id="${this.bodyView.id}"></div>
      </div>`;
    }

    // Regular string/HTML body
    if (!this.body && this.body !== '') {
      return '';
    }

    const bodyClass = this.noBodyPadding ? `modal-body p-0 ${this.bodyClass}` : `modal-body ${this.bodyClass}`;
    return `
      <div class="${bodyClass}">
        ${this.body}
      </div>
    `;
  }

  /**
   * Build modal footer
   */
  async buildFooter() {
    // If we have a View instance as footer
    if (this.footerView) {
      return `<div class="modal-footer ${this.footerClass}" data-view-container="footer"></div>`;
    }

    // Custom footer content
    if (this.footer !== null && typeof this.footer === 'string') {
      return `<div class="modal-footer ${this.footerClass}">${this.footer}</div>`;
    }

    // Build footer from buttons
    if (this.buttons && this.buttons.length > 0) {
      const buttonsHtml = this.buttons.map(btn => {
        const dismissAttr = btn.dismiss ? 'data-bs-dismiss="modal"' : '';
        const actionAttr = btn.action ? `data-action="${btn.action}"` : '';
        const idAttr = btn.id ? `id="${btn.id}"` : '';
        const disabledAttr = btn.disabled ? 'disabled' : '';

        return `
          <button type="${btn.type || 'button'}"
                  class="btn ${btn.class || 'btn-secondary'}"
                  ${idAttr}
                  ${dismissAttr}
                  ${actionAttr}
                  ${disabledAttr}>
            ${btn.icon ? `<i class="bi ${btn.icon} me-1"></i>` : ''}
            ${btn.text || 'Button'}
          </button>
        `;
      }).join('');

      return `<div class="modal-footer ${this.footerClass}">${buttonsHtml}</div>`;
    }

    // No footer
    return '';
  }


  /**
   * Override mount to not require a container for dialogs
   * Dialogs are appended to body directly
   */
  async mount(_container = null) {
    if (this.mounted || this.destroyed) {
      return;
    }

    // For dialogs, we only need the element, not a container
    if (!this.element) {
      throw new Error('Cannot mount dialog without element');
    }

    // Call lifecycle hooks
    await this.onBeforeMount();

    // The element should already be appended to document.body by the caller
    document.body.appendChild(this.element);

    // Bind DOM events
    this.bindEvents();

    // Set mounted flag
    this.mounted = true;

    // Call after mount (this initializes Bootstrap modal)
    await this.onAfterMount();

    // Emit mounted event
    this.emit('mounted', { view: this });

    return this;
  }

  /**
   * After render - prepare for View instances and apply syntax highlighting
   */
  async onAfterRender() {
    await super.onAfterRender();

    // Apply Prism syntax highlighting if available and there are code blocks
    if (window.Prism && this.element) {
      const codeBlocks = this.element.querySelectorAll('pre code');
      if (codeBlocks.length > 0) {
        // Use Prism's highlightAllUnder to highlight code within this dialog
        window.Prism.highlightAllUnder(this.element);
      }
    }

    // Child views will be mounted in onAfterMount when element is in DOM

    // Apply auto-sizing after rendering if enabled
    if (this.autoSize) {
      this.setupAutoSizing();
    }
  }

  /**
   * After mount - initialize Bootstrap modal and mount child views
   */
  async onAfterMount() {
    await super.onAfterMount();

    if (typeof window !== 'undefined' && window.bootstrap && window.bootstrap.Modal) {
      // Set data attributes if needed
      if (this.backdrop === 'static') {
        this.element.setAttribute('data-bs-backdrop', 'static');
      }
      if (!this.keyboard) {
        this.element.setAttribute('data-bs-keyboard', 'false');
      }

      // Initialize Bootstrap modal with options
      this.modal = new window.bootstrap.Modal(this.element, {
        backdrop: this.backdrop,
        keyboard: this.keyboard,
        focus: this.focus
      });

      // Bind Bootstrap events
      this.bindBootstrapEvents();

      // Auto show if requested
      if (this.autoShow) {
        this.show(this.relatedTarget);
      }
    }
  }

  /**
   * Setup auto-sizing - wait for modal animation to complete
   */
  setupAutoSizing() {
    if (!this.element) return;

    // Listen for modal shown event to apply sizing after animation
    this.element.addEventListener('shown.bs.modal', () => {
      this.applyAutoSizing();
    }, { once: true });

    // Fallback: apply immediately if modal is already shown or no animation
    setTimeout(() => {
      if (this.isShown()) {
        this.applyAutoSizing();
      }
    }, 100);
  }

  /**
   * Apply auto-sizing based on content dimensions
   */
  applyAutoSizing() {
    if (!this.element) return;

    try {
      const modalDialog = this.element.querySelector('.modal-dialog');
      const modalContent = this.element.querySelector('.modal-content');
      const modalBody = this.element.querySelector('.modal-body');

      if (!modalDialog || !modalContent || !modalBody) {
        console.warn('Dialog auto-sizing: Required elements not found');
        return;
      }

      // Wait for child views to fully render
      if (this.bodyView && !this.bodyView.element) {
        setTimeout(() => this.applyAutoSizing(), 50);
        return;
      }

      // Store original styles for restoration
      const originalStyles = {
        dialogMaxWidth: modalDialog.style.maxWidth,
        dialogWidth: modalDialog.style.width,
        contentWidth: modalContent.style.width,
        contentMaxHeight: modalContent.style.maxHeight,
        bodyOverflow: modalBody.style.overflowY
      };

      // Temporarily remove size constraints to measure natural content size
      modalDialog.style.maxWidth = 'none';
      modalDialog.style.width = 'auto';
      modalContent.style.width = 'auto';
      modalContent.style.maxHeight = 'none';

      // Force layout recalculation
      modalContent.offsetHeight;

      // Measure content dimensions after forced layout
      const contentRect = modalContent.getBoundingClientRect();

      // Calculate viewport constraints with margins
      const viewportMargin = 40;
      const maxWidth = Math.min(
        window.innerWidth * this.maxWidthPercent,
        window.innerWidth - viewportMargin
      );
      const maxHeight = Math.min(
        window.innerHeight * this.maxHeightPercent,
        window.innerHeight - viewportMargin
      );

      // Calculate optimal dimensions with padding for content
      let optimalWidth = Math.max(this.minWidth, Math.ceil(contentRect.width + 20));
      let optimalHeight = Math.max(this.minHeight, Math.ceil(contentRect.height));

      // Apply viewport constraints
      optimalWidth = Math.min(optimalWidth, maxWidth);
      const heightExceedsMax = contentRect.height > maxHeight;

      // Apply the calculated size
      modalDialog.style.maxWidth = `${optimalWidth}px`;
      modalDialog.style.width = `${optimalWidth}px`;

      // Handle height overflow with scrolling
      if (heightExceedsMax) {
        modalContent.style.maxHeight = `${maxHeight}px`;
        modalBody.style.overflowY = 'auto';
        optimalHeight = maxHeight;
      }

      // Store the applied dimensions
      this.autoSizedWidth = optimalWidth;
      this.autoSizedHeight = optimalHeight;
      this._originalStyles = originalStyles;

    } catch (error) {
      console.error('Error in dialog auto-sizing:', error);
      // Fallback: ensure modal is still usable
      this.element.querySelector('.modal-dialog').style.maxWidth = '';
    }
  }

  /**
   * Reset auto-sizing and restore original modal dimensions
   */
  resetAutoSizing() {
    if (!this.autoSize || !this._originalStyles || !this.element) return;

    try {
      const modalDialog = this.element.querySelector('.modal-dialog');
      const modalContent = this.element.querySelector('.modal-content');
      const modalBody = this.element.querySelector('.modal-body');

      if (modalDialog && modalContent && modalBody) {
        // Restore original styles
        modalDialog.style.maxWidth = this._originalStyles.dialogMaxWidth || '';
        modalDialog.style.width = this._originalStyles.dialogWidth || '';
        modalContent.style.width = this._originalStyles.contentWidth || '';
        modalContent.style.maxHeight = this._originalStyles.contentMaxHeight || '';
        modalBody.style.overflowY = this._originalStyles.bodyOverflow || '';

        // Clear stored dimensions
        delete this.autoSizedWidth;
        delete this.autoSizedHeight;
        delete this._originalStyles;
      }
    } catch (error) {
      console.error('Error resetting dialog auto-sizing:', error);
    }
  }

  /**
   * Bind Bootstrap modal events
   */
  bindBootstrapEvents() {
    // show.bs.modal
    this.element.addEventListener('show.bs.modal', (e) => {
      // Manage stacking for multiple dialogs
      const stackIndex = Dialog._openDialogs.length;
      const newZIndex = Dialog._baseZIndex.modal + (stackIndex * 20);
      this.element.style.zIndex = newZIndex;
      Dialog._openDialogs.push(this);

      // Adjust backdrop z-index after a short delay to ensure it exists
      setTimeout(() => {
        const backdrops = document.querySelectorAll('.modal-backdrop');
        const backdrop = backdrops[backdrops.length - 1]; // Get the latest one
        if (backdrop) {
          backdrop.style.zIndex = newZIndex - 5;
        }
      }, 0);

      if (this.onShow) this.onShow(e);
      this.emit('show', {
        dialog: this,
        relatedTarget: e.relatedTarget
      });
    });

    // shown.bs.modal
    this.element.addEventListener('shown.bs.modal', (e) => {
      if (this.onShown) this.onShown(e);
      this.emit('shown', {
        dialog: this,
        relatedTarget: e.relatedTarget
      });

      // Focus first input if exists
      if (this.focus) {
        const firstInput = this.element.querySelector('input:not([type="hidden"]), textarea, select');
        if (firstInput) {
          firstInput.focus();
        }
      }
    });

    // hide.bs.modal
    this.element.addEventListener('hide.bs.modal', (e) => {
      // Blur any focused element inside the modal to prevent accessibility warning
      const focusedElement = this.element.querySelector(':focus');
      if (focusedElement) {
        focusedElement.blur();
      }

      if (this.onHide) {
        const result = this.onHide(e);
        if (result === false) {
          e.preventDefault();
          return;
        }
      }
      this.emit('hide', { dialog: this });
    });

    // hidden.bs.modal
    this.element.addEventListener('hidden.bs.modal', (e) => {
      // Manage stacking
      const index = Dialog._openDialogs.indexOf(this);
      if (index > -1) {
        Dialog._openDialogs.splice(index, 1);
      }

      // If there are still modals open, ensure body has modal-open class
      // and the top backdrop is correctly layered.
      if (Dialog._openDialogs.length > 0) {
        document.body.classList.add('modal-open');

        const topDialog = Dialog._openDialogs[Dialog._openDialogs.length - 1];
        const topZIndex = parseInt(topDialog.element.style.zIndex, 10);

        setTimeout(() => { // Let Bootstrap finish its hide animation
          const backdrops = document.querySelectorAll('.modal-backdrop');
          const backdrop = backdrops[backdrops.length - 1];
          if (backdrop) {
            backdrop.style.zIndex = topZIndex - 5;
          }
        }, 0);
      }

      // Restore focus to the element that had it before modal opened
      if (this.previousFocus && document.body.contains(this.previousFocus)) {
        this.previousFocus.focus();
      }

      if (this.onHidden) this.onHidden(e);
      this.emit('hidden', { dialog: this });
    });

    // hidePrevented.bs.modal
    this.element.addEventListener('hidePrevented.bs.modal', (e) => {
      if (this.onHidePrevented) this.onHidePrevented(e);
      this.emit('hidePrevented', { dialog: this });
    });
  }

  /**
   * Show the dialog
   * @param {HTMLElement} relatedTarget - Optional element that triggered the modal
   */
  show(relatedTarget = null) {
    // Capture the currently focused element for later restoration
    this.previousFocus = document.activeElement;
    window.lastDialog = this;
    if (this.modal) {
      this.modal.show(relatedTarget);
    }
  }

  /**
   * Hide the dialog
   */
  hide() {
    // Blur any focused element inside the modal before hiding
    const focusedElement = this.element?.querySelector(':focus');
    if (focusedElement) {
      focusedElement.blur();
    }

    if (this.modal) {
      this.modal.hide();
    }
  }

  /**
   * Toggle the dialog
   * @param {HTMLElement} relatedTarget - Optional element that triggered the modal
   */
  toggle(relatedTarget = null) {
    if (this.modal) {
      this.modal.toggle(relatedTarget);
    }
  }

  /**
   * Destroy the dialog and clean up resources
   */
  async destroy() {
    // Hide modal if it's showing
    if (this.modal) {
      // Remove focus from any element inside the modal
      const focusedElement = this.element?.querySelector(':focus');
      if (focusedElement) {
        focusedElement.blur();
      }

      // Dispose of Bootstrap modal instance
      this.modal.dispose();
      this.modal = null;
    }

    // Restore previous focus if available
    if (this.previousFocus && document.body.contains(this.previousFocus)) {
      this.previousFocus.focus();
      this.previousFocus = null;
    }

    // Clean up auto-sizing
    if (this.autoSize) {
      this.resetAutoSizing();
    }

    // Call parent destroy
    await super.destroy();
  }

  /**
   * Handle dynamic height changes
   */
  handleUpdate() {
    if (this.modal) {
      this.modal.handleUpdate();
    }
  }

  /**
   * Update dialog content
   * @param {string|View} content - New content (string or View instance)
   */
  async setContent(content) {
    // Handle View instance
    if (content instanceof View) {
      // Clean up old view if exists
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
        // Pass container to render - it will handle mounting internally
        await this.bodyView.render(bodyEl);
      }
    } else {
      // String content
      this.body = content;
      const bodyEl = this.element?.querySelector('.modal-body');
      if (bodyEl) {
        bodyEl.innerHTML = content;
      }
    }

    // Update modal position if needed
    this.handleUpdate();
  }

  /**
   * Update dialog title
   */
  setTitle(title) {
    this.title = title;
    const titleEl = this.element?.querySelector('.modal-title');
    if (titleEl) {
      titleEl.textContent = title;
    }
  }

  /**
   * Set loading state
   */
  setLoading(loading = true, message = 'Loading...') {
    const bodyEl = this.element?.querySelector('.modal-body');
    if (bodyEl) {
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
  }

  /**
   * Clean up
   */
  async onBeforeDestroy() {
    // Clean up child views
    if (this.bodyView) {
      await this.bodyView.destroy();
    }
    if (this.footerView) {
      await this.footerView.destroy();
    }

    await super.onBeforeDestroy();

    if (this.modal) {
      this.modal.dispose();
      this.modal = null;
    }
  }

  /**
   * Static method to show code in a dialog
   */
  static async showCode(options = {}) {
    const dialog = new Dialog({
      title: options.title || 'Source Code',
      size: options.size || 'lg',
      scrollable: true,
      body: Dialog.formatCode(options.code, options.language),
      buttons: [
        {
          text: 'Copy to Clipboard',
          class: 'btn-primary',
          icon: 'bi-clipboard',
          action: 'copy'
        },
        {
          text: 'Close',
          class: 'btn-secondary',
          dismiss: true
        }
      ]
    });

    // Handle copy action
    dialog.on('action:copy', async () => {
      if (navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(options.code);
          dialog.showCopySuccess();
        } catch (err) {
          console.error('Failed to copy:', err);
        }
      }
    });

    // Mount to body
    await dialog.render(true, document.body);

    // Apply syntax highlighting after mounting
    if (window.Prism && dialog.element) {
      window.Prism.highlightAllUnder(dialog.element);
    }

    // Show the dialog
    dialog.show();

    // Clean up when hidden
    dialog.on('hidden', () => {
      dialog.destroy();
      dialog.element.remove();
    });

    return dialog;
  }

  /**
   * Format code for display with syntax highlighting support
   */
  static formatCode(code, language = 'javascript') {
    let highlightedCode;

    // Check if Prism.js is available and has the language
    if (window.Prism && window.Prism.languages[language]) {
      // Use Prism to highlight the code
      highlightedCode = window.Prism.highlight(code, window.Prism.languages[language], language);
    } else {
      // Fallback: just escape HTML
      highlightedCode = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    // Add Prism classes for styling even if highlighting wasn't applied
    const prismClass = window.Prism ? `language-${language}` : '';

    // Modern VS Code-like dark theme styling
    const codeStyles = `
      max-height: 60vh;
      overflow-y: auto;
      background: #1e1e1e;
      color: #d4d4d4;
      padding: 1.25rem;
      border-radius: 0.5rem;
      margin: 0;
      font-family: 'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', 'Monaco', monospace;
      font-size: 0.9rem;
      line-height: 1.6;
      border: 1px solid #2d2d30;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    `.replace(/\s+/g, ' ').trim();

    return `
      <style>
        /* Custom Prism theme overrides for Dialog */
        .dialog-code-block .token.comment { color: #6a9955; }
        .dialog-code-block .token.string { color: #ce9178; }
        .dialog-code-block .token.keyword { color: #569cd6; }
        .dialog-code-block .token.function { color: #dcdcaa; }
        .dialog-code-block .token.number { color: #b5cea8; }
        .dialog-code-block .token.operator { color: #d4d4d4; }
        .dialog-code-block .token.class-name { color: #4ec9b0; }
        .dialog-code-block .token.punctuation { color: #d4d4d4; }
        .dialog-code-block .token.boolean { color: #569cd6; }
        .dialog-code-block .token.property { color: #9cdcfe; }
        .dialog-code-block .token.tag { color: #569cd6; }
        .dialog-code-block .token.attr-name { color: #9cdcfe; }
        .dialog-code-block .token.attr-value { color: #ce9178; }
        .dialog-code-block ::selection { background: #264f78; }
      </style>
      <pre class="${prismClass} dialog-code-block" style="${codeStyles}">
        <code class="${prismClass}" style="color: inherit; background: transparent; text-shadow: none;">${highlightedCode}</code>
      </pre>
    `;
  }

  /**
   * Trigger Prism highlighting on already rendered code blocks
   * Call this after inserting code into the DOM if not using formatCode
   */
  static highlightCodeBlocks(container = document) {
    if (window.Prism && window.Prism.highlightAllUnder) {
      window.Prism.highlightAllUnder(container);
    }
  }

  /**
   * Show copy success feedback
   */
  showCopySuccess() {
    const btn = this.element.querySelector('[data-action="copy"]');
    if (btn) {
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
  }




  /**
   * Show a dialog with promise-based button handling
   * - If a button has a handler, it will be called. Return semantics:
   *   - true or undefined: resolve and close (with button.value || button.action || index)
   *   - null or false: keep dialog open (do not resolve)
   *   - any other value: resolve with that value and close
   * - If no handler, resolve with action/value/index and close
   * @param {Object} options - Dialog options
   * @returns {Promise} Resolves with value/action/index or null on dismiss
   */
  static async showDialog(options = {}) {
    // Handle legacy signature (message, title, options)
    if (typeof options === 'string') {
      const message = arguments[0];
      const title = arguments[1] || 'Alert';
      const opts = arguments[2] || {};
      options = {
        ...opts,
        body: message,
        title: title
      };
    }

    const {
      title = 'Dialog',
      content,
      body = content || '',
      size = 'md',
      centered = true,
      buttons = [
        { text: 'OK', class: 'btn-primary', value: true }
      ],
      rejectOnDismiss = false, // Default to return null on dismissal
      ...dialogOptions
    } = options;

    // Create the dialog (preserve original button action/dismiss attributes)
    const dialog = new Dialog({
      title,
      body: body,
      size,
      centered,
      buttons,
      ...dialogOptions
    });

    // Render and mount
    await dialog.render(true, document.body);

    // Return promise that resolves based on button clicks
    return new Promise((resolve, reject) => {
      let resolved = false;

      // Handle button clicks
      const buttonElements = dialog.element.querySelectorAll('.modal-footer button');
      buttonElements.forEach((btnElement, index) => {
        const buttonConfig = buttons[index];
        if (!buttonConfig) return;

        btnElement.addEventListener('click', async (e) => {
          if (resolved) return;

          const defaultResolveValue = (
            buttonConfig.value !== undefined
              ? buttonConfig.value
              : (buttonConfig.action ?? index)
          );

          // If a handler is provided, call it and respect its return semantics
          if (typeof buttonConfig.handler === 'function') {
            try {
              const result = await buttonConfig.handler({
                dialog,
                button: buttonConfig,
                index,
                event: e
              });

              // null/false -> keep dialog open
              if (result === null || result === false) {
                return;
              }

              // Determine resolve value and close
              const valueToResolve =
                (result === true || result === undefined)
                  ? defaultResolveValue
                  : result;

              resolved = true;
              // Close the dialog (Bootstrap will close if dismiss attribute is present)
              if (!buttonConfig.dismiss) {
                dialog.hide();
              }
              resolve(valueToResolve);
            } catch (err) {
              console.error('Dialog button handler error:', err);
              // Keep dialog open on handler error
              return;
            }
          } else {
            // No handler: resolve with action/value/index and close
            resolved = true;
            if (!buttonConfig.dismiss) {
              dialog.hide();
            }
            resolve(defaultResolveValue);
          }
        });
      });

      // Handle backdrop click or ESC key
      dialog.on('hidden', () => {
        // If not already resolved by a button handler, resolve as dismiss
        if (!resolved) {
          resolved = true;
          if (rejectOnDismiss) {
            reject(new Error('Dialog dismissed'));
          } else {
            resolve(null);
          }
        }
        // Always cleanup after hide
        setTimeout(() => {
          dialog.destroy();
          dialog.element.remove();
        }, 100);
      });

      // Show the dialog
      dialog.show();
    });
  }

  /**
   * Static alert dialog helper
   * @param {Object|string} options - Alert options or message string
   * @returns {Promise} Resolves when OK is clicked
   */
  static async alert(options = {}) {
    // Handle string argument
    if (typeof options === 'string') {
      options = {
        message: options,
        title: 'Alert'
      };
    }

    const {
      message = '',
      title = 'Alert',
      type = 'info', // info, success, warning, danger
      ...dialogOptions
    } = options;

    // Add icon based on type
    let icon = '';
    let titleClass = '';
    switch(type) {
      case 'success':
        icon = '<i class="bi bi-check-circle-fill text-success me-2"></i>';
        titleClass = 'text-success';
        break;
      case 'warning':
        icon = '<i class="bi bi-exclamation-triangle-fill text-warning me-2"></i>';
        titleClass = 'text-warning';
        break;
      case 'danger':
      case 'error':
        icon = '<i class="bi bi-x-circle-fill text-danger me-2"></i>';
        titleClass = 'text-danger';
        break;
      default:
        icon = '<i class="bi bi-info-circle-fill text-info me-2"></i>';
        titleClass = 'text-info';
    }

    return Dialog.showDialog({
      title: `<span class="${titleClass}">${icon}${title}</span>`,
      body: `<p>${message}</p>`,
      size: 'sm',
      centered: true,
      buttons: [
        { text: 'OK', class: 'btn-primary', value: true }
      ],
      ...dialogOptions
    });
  }

  /**
   * Static confirm dialog
   */
  static async confirm(message, title = 'Confirm', options = {}) {
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

    await dialog.render(true, document.body)
    dialog.show();

    return new Promise((resolve) => {
      let result = false;

      dialog.on('action:confirm', () => {
        result = true;
        dialog.hide();
      });

      dialog.on('hidden', () => {
        dialog.destroy();
        dialog.element.remove();
        resolve(result);
      });
    });
  }

  /**
   * Static prompt dialog
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

    await dialog.render(true, document.body);
    dialog.show();

    // Focus the input
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
        dialog.element.remove();
        resolve(result);
      });
    });
  }

  /**
   * Get Bootstrap modal instance
   */
  getModal() {
    return this.modal;
  }

  /**
   * Check if modal is shown
   */
  isShown() {
    return this.element?.classList.contains('show') || false;
  }

  /**
   * Show form in a dialog for simple data collection (no model saving)
   * @param {object} options - Configuration options
   * @returns {Promise} Promise that resolves with form data or null if cancelled
   */
  static async showForm(options = {}) {
    const {
      title = 'Form',
      formConfig = {},
      size = 'md',
      centered = true,
      submitText = 'Submit',
      cancelText = 'Cancel',
      ...dialogOptions
    } = options;

    // Create the FormView (no model for simple form)
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

    // Create the dialog with the FormView as body
    const dialog = new Dialog({
      title,
      body: formView,
      size,
      centered,
      buttons: [
        {
          text: cancelText,
          class: 'btn-secondary',
          action: 'cancel'
        },
        {
          text: submitText,
          class: 'btn-primary',
          action: 'submit'
        }
      ],
      ...dialogOptions
    });

    // Render and mount dialog
    await dialog.render(true, document.body);

    // Show the dialog
    dialog.show();

    return new Promise((resolve) => {
      let resolved = false;

      // Handle dialog actions
      dialog.on('action:submit', async () => {
        if (resolved) return;

        // Validate form
        if (!formView.validate()) {
          formView.focusFirstError();
          return;
        }

        if (options.autoSave && options.model) {
            dialog.setLoading(true);
            const result = await formView.saveModel()
            if (!result.success) {
                dialog.setLoading(false);
                dialog.render();
                dialog.getApp().toast.error(result.message);
                return;
            }
            resolved = true;
            dialog.hide();
            resolve(result);
        }

        // Get form data and resolve
        try {
          const formData = await formView.getFormData();
          resolved = true;
          dialog.hide();
          resolve(formData);
        } catch (error) {
          console.error('Error collecting form data:', error);
          formView.showError('Error collecting form data');
        }
      });

      dialog.on('action:cancel', () => {
        if (resolved) return;
        resolved = true;
        dialog.hide();
        resolve(null);
      });

      // Handle ESC key or backdrop click
      dialog.on('hidden', () => {
        if (!resolved) {
          resolved = true;
          resolve(null);
        }
        // Clean up
        setTimeout(() => {
          formView.destroy();
          dialog.destroy();
        }, 100);
      });
    });
  }

  /**
   * Show form in a dialog with automatic model saving
   * @param {object} options - Configuration options (requires model)
   * @returns {Promise} Promise that resolves with save result or null if cancelled
   */
  static async showModelForm(options = {}) {
    const {
      title = 'Edit',
      formConfig = {},
      size = 'md',
      centered = true,
      submitText = 'Save',
      cancelText = 'Cancel',
      model,
      ...dialogOptions
    } = options;

    if (!model) {
      throw new Error('showModelForm requires a model');
    }

    // Create the FormView with model
    const formView = new FormView({
      fileHandling: options.fileHandling || 'base64',
      model: model,
      data: options.data,
      defaults: options.defaults,
      formConfig: {
        fields: formConfig.fields || options.fields,
        ...formConfig,
        submitButton: false,
        resetButton: false
      }
    });

    // Create the dialog with the FormView as body
    const dialog = new Dialog({
      title,
      body: formView,
      size,
      centered,
      buttons: [
        {
          text: cancelText,
          class: 'btn-secondary',
          action: 'cancel'
        },
        {
          text: submitText,
          class: 'btn-primary',
          action: 'submit'
        }
      ],
      ...dialogOptions
    });

    // Render and mount dialog
    await dialog.render(true, document.body);

    // Show the dialog
    dialog.show();

    return new Promise((resolve) => {
      let resolved = false;

      // Handle dialog actions
      dialog.on('action:submit', async () => {
        if (resolved) return;

        // Show loading state
        dialog.setLoading(true, 'Saving...');

        try {
          const result = await formView.handleSubmit();
          if (result.success) {
            resolved = true;
            dialog.hide();
            resolve(result);
          } else {
            // Restore form and show error
            dialog.setLoading(false);
            dialog.getApp().toast.error(result.error);
            // formView.showError(result.error || 'Save failed. Please try again.');
          }
        } catch (error) {
          console.error('Error saving form:', error);
          // Restore form and show error
          await dialog.setContent(formView);
          formView.showError(error.message || 'An error occurred while saving');
        }
      });

      dialog.on('action:cancel', () => {
        if (resolved) return;
        resolved = true;
        dialog.hide();
        resolve(null);
      });

      // Handle ESC key or backdrop click
      dialog.on('hidden', () => {
        if (!resolved) {
          resolved = true;
          resolve(null);
        }
        // Clean up
        setTimeout(() => {
          formView.destroy();
          dialog.destroy();
        }, 100);
      });
    });
  }

  /**
   * Show data in a dialog using DataView component
   * @param {object} options - Configuration options
   * @returns {Promise} Promise that resolves when dialog is closed
   */
  static async showData(options = {}) {
    const {
      title = 'Data View',
      data = {},
      model = null,
      fields = [],
      columns = 2,
      responsive = true,
      showEmptyValues = false,
      emptyValueText = '—',
      size = 'lg',
      centered = true,
      closeText = 'Close',
      ...dialogOptions
    } = options;


    // Create the DataView
    const dataView = new DataView({
      data,
      model,
      fields,
      columns,
      responsive,
      showEmptyValues,
      emptyValueText
    });

    // Create the dialog with the DataView as body
    const dialog = new Dialog({
      title,
      body: dataView,
      size,
      centered,
      buttons: [
        {
          text: closeText,
          class: 'btn-secondary',
          value: 'close'
        }
      ],
      ...dialogOptions
    });

    // Render and mount dialog
    await dialog.render(true, document.body);

    // Show the dialog and return promise
    dialog.show();

    return new Promise((resolve) => {
      let resolved = false;

      // Get close button
      const closeBtn = dialog.element.querySelector('.modal-footer button');

      // Handle close
      const handleClose = () => {
        if (resolved) return;
        resolved = true;
        dialog.hide();
        resolve(true);
      };

      // Attach event listener
      closeBtn?.addEventListener('click', handleClose);

      // Handle ESC key or backdrop click
      dialog.on('hidden', () => {
        if (!resolved) {
          resolved = true;
          resolve(true);
        }
        // Clean up
        setTimeout(() => {
          dataView.destroy();
          dialog.destroy();
          dialog.element.remove();
        }, 100);
      });

      // Forward DataView events
      dataView.on('field:click', (data) => {
        dialog.emit('dataview:field:click', data);
      });

      dataView.on('error', (data) => {
        dialog.emit('dataview:error', data);
      });
    });
  }
}

export default Dialog;
