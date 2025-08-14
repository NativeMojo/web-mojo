/**
 * Dialog - Complete Bootstrap 5 Modal component for MOJO framework
 * Supports all Bootstrap 5 modal features including sizes, fullscreen, scrollable, etc.
 * Can accept View instances as body content
 */

import View from '../core/View.js';

class Dialog extends View {
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

    // Size options: sm, md (default), lg, xl, fullscreen
    // Or responsive fullscreen: fullscreen-sm-down, fullscreen-md-down, etc.
    this.size = options.size || '';

    // Layout options
    this.centered = options.centered !== undefined ? options.centered : false;
    this.scrollable = options.scrollable !== undefined ? options.scrollable : false;

    // Bootstrap modal options
    this.backdrop = options.backdrop !== undefined ? options.backdrop : true; // true, false, 'static'
    this.keyboard = options.keyboard !== undefined ? options.keyboard : true;
    this.focus = options.focus !== undefined ? options.focus : true;

    // Content
    this.header = options.header !== undefined ? options.header : true;
    this.headerContent = options.headerContent || null;
    this.closeButton = options.closeButton !== undefined ? options.closeButton : true;

    // Enhanced body handling - support View, Promise<View>, or function returning View
    this.body = options.body || options.content || '';
    this.bodyView = null; // Will hold View instance if body is a View
    this.bodyClass = options.bodyClass || '';
    
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
    if (body instanceof View) {
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

    // Add size class
    if (this.size) {
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

    return `
      <div class="modal-header">
        ${this.title ? `<h5 class="modal-title" id="${this.titleId}">${this.title}</h5>` : ''}
        ${this.closeButton ? '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>' : ''}
      </div>
    `;
  }

  /**
   * Build modal body
   */
  async buildBody() {
    // If we have a View instance as body
    if (this.bodyView) {
      return `<div class="modal-body ${this.bodyClass}" data-view-container="body">
        <!-- View will be mounted here -->
      </div>`;
    }

    // Regular string/HTML body
    if (!this.body && this.body !== '') {
      return '';
    }

    return `
      <div class="modal-body ${this.bodyClass}">
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
   * Override render to not require a container for dialogs
   * Dialogs are rendered standalone and then appended to body
   */
  async render(container = null) {
    // Skip container check for dialogs
    if (container) {
      return super.render(container);
    }

    // Create element if it doesn't exist
    if (!this.element) {
      this.createElement();
    }

    // Set rendering flag
    this.isRendering = true;
    this.loading = true;

    try {
      // Call lifecycle hooks
      await this.onBeforeRender();

      // Get template and render
      const html = await this.renderTemplate();

      // Set innerHTML
      this.element.innerHTML = html;

      // Call after render
      await this.onAfterRender();

      this.rendered = true;
      this.loading = false;
    } finally {
      this.isRendering = false;
    }

    return this.element;
  }

  /**
   * Override mount to not require a container for dialogs
   * Dialogs are appended to body directly
   */
  async mount() {
    if (this.mounted || this.destroyed) {
      return;
    }

    // For dialogs, we only need the element, not a container
    if (!this.element) {
      throw new Error('Cannot mount dialog without element');
    }

    // The element should already be appended to document.body by the caller
    if (!document.body.contains(this.element)) {
      console.warn(`Dialog ${this.id}: Element not in document body during mount`);
    }

    // Call lifecycle hooks
    await this.onBeforeMount();

    // Bind DOM events
    this.bindEvents();

    // Mount child views
    await this.mountChildren();

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
  }

  /**
   * After mount - initialize Bootstrap modal and mount child views
   */
  async onAfterMount() {
    await super.onAfterMount();

    // Handle async body if present
    if (this.bodyPromise) {
      try {
        const view = await this.bodyPromise;
        if (view instanceof View) {
          this.bodyView = view;
          this.addChild(this.bodyView);
          const bodyContainer = this.element.querySelector('.modal-body');
          if (bodyContainer) {
            bodyContainer.innerHTML = '';
            bodyContainer.setAttribute('data-view-container', 'body');
          }
        }
      } catch (error) {
        console.error('Error loading async body view:', error);
      }
    }

    // Handle async footer if present
    if (this.footerPromise) {
      try {
        const view = await this.footerPromise;
        if (view instanceof View) {
          this.footerView = view;
          this.addChild(this.footerView);
          const footerElement = this.element.querySelector('.modal-footer');
          if (footerElement) {
            footerElement.innerHTML = '<div data-view-container="footer"></div>';
          }
        }
      } catch (error) {
        console.error('Error loading async footer view:', error);
      }
    }

    // Now that we're mounted and in the DOM, render child views
    // Mount body View if exists
    if (this.bodyView && this.element) {
      const bodyContainer = this.element.querySelector('[data-view-container="body"]');
      if (bodyContainer) {
        // Check if view is already rendered
        if (!this.bodyView.rendered) {
          await this.bodyView.render(bodyContainer);
        } else if (!this.bodyView.mounted) {
          // If rendered but not mounted, just mount it
          this.bodyView.setContainer(bodyContainer);
          await this.bodyView.mount();
        } else {
          // If already mounted elsewhere, move it
          bodyContainer.appendChild(this.bodyView.element);
        }
      }
    }

    // Mount footer View if exists
    if (this.footerView && this.element) {
      const footerContainer = this.element.querySelector('[data-view-container="footer"]');
      if (footerContainer) {
        // Check if view is already rendered
        if (!this.footerView.rendered) {
          await this.footerView.render(footerContainer);
        } else if (!this.footerView.mounted) {
          // If rendered but not mounted, just mount it
          this.footerView.setContainer(footerContainer);
          await this.footerView.mount();
        } else {
          // If already mounted elsewhere, move it
          footerContainer.appendChild(this.footerView.element);
        }
      }
    }

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
   * Bind Bootstrap modal events
   */
  bindBootstrapEvents() {
    // show.bs.modal
    this.element.addEventListener('show.bs.modal', (e) => {
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
    await dialog.render();
    document.body.appendChild(dialog.element);
    await dialog.mount();

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
   * @param {Object} options - Dialog options
   * @returns {Promise} Resolves with button value or rejects on dismiss
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
      ...dialogOptions
    } = options;
    
    // Create the dialog
    const dialog = new Dialog({
      title,
      body: body,
      size,
      centered,
      buttons: buttons.map(btn => ({
        ...btn,
        // We'll handle clicks manually for promise resolution
        dismiss: false,
        action: null
      })),
      ...dialogOptions
    });
    
    // Render and mount
    await dialog.render();
    document.body.appendChild(dialog.element);
    await dialog.mount();
    
    // Return promise that resolves based on button clicks
    return new Promise((resolve, reject) => {
      let resolved = false;
      
      // Handle button clicks
      const buttonElements = dialog.element.querySelectorAll('.modal-footer button');
      buttonElements.forEach((btnElement, index) => {
        const buttonConfig = buttons[index];
        if (buttonConfig) {
          btnElement.addEventListener('click', () => {
            if (!resolved) {
              resolved = true;
              dialog.hide();
              
              // Resolve with button value or index
              const value = buttonConfig.value !== undefined 
                  ? buttonConfig.value 
                  : buttonConfig.action || index;
              resolve(value);
            }
          });
        }
      });
      
      // Handle backdrop click or ESC key (rejection)
      dialog.on('hidden', () => {
        if (!resolved) {
          resolved = true;
          dialog.destroy();
          dialog.element.remove();
          reject(new Error('Dialog dismissed'));
        }
      });
      
      // Clean up after resolution
      dialog.on('hidden', () => {
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

    await dialog.render();
    document.body.appendChild(dialog.element);
    await dialog.mount();
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

    await dialog.render();
    document.body.appendChild(dialog.element);
    await dialog.mount();
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
   * Show a form dialog using FormView
   * @param {Object} options - Form dialog options
   * @returns {Promise<Object>} Resolves with form data or rejects on cancel
   */
  static async showForm(options = {}) {
    const {
      title = 'Form',
      formConfig = {},
      size = 'md',
      centered = true,
      submitText = 'Submit',
      cancelText = 'Cancel',
      validateBeforeSubmit = true,
      ...dialogOptions
    } = options;

    // Import FormView if not already available
    const FormView = (await import('./FormView.js')).default;

    // Create the FormView
    const formView = new FormView({
      formConfig: {
        ...formConfig,
        // Override submit button to prevent default form submission
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
          value: 'cancel'
        },
        {
          text: submitText,
          class: 'btn-primary',
          value: 'submit'
        }
      ],
      ...dialogOptions
    });

    // Render and mount dialog
    await dialog.render();
    document.body.appendChild(dialog.element);
    await dialog.mount();

    // Show the dialog and return promise
    dialog.show();

    return new Promise((resolve, reject) => {
      let resolved = false;

      // Get button elements
      const cancelBtn = dialog.element.querySelector('.modal-footer button:first-child');
      const submitBtn = dialog.element.querySelector('.modal-footer button:last-child');

      // Handle submit
      const handleSubmit = async () => {
        if (resolved) return;

        // Validate if required
        if (validateBeforeSubmit && !formView.validate()) {
          formView.focusFirstError();
          return;
        }

        // Get form values
        const formData = formView.getValues();
        resolved = true;
        dialog.hide();
        resolve(formData);
      };

      // Handle cancel
      const handleCancel = () => {
        if (resolved) return;
        resolved = true;
        dialog.hide();
        reject(new Error('Form cancelled'));
      };

      // Attach event listeners
      submitBtn?.addEventListener('click', handleSubmit);
      cancelBtn?.addEventListener('click', handleCancel);

      // Handle form submit event (if user presses Enter)
      formView.on('submit', (e) => {
        e.preventDefault();
        handleSubmit();
      });

      // Handle ESC key or backdrop click
      dialog.on('hidden', () => {
        if (!resolved) {
          resolved = true;
          reject(new Error('Form dismissed'));
        }
        // Clean up
        setTimeout(() => {
          formView.destroy();
          dialog.destroy();
          dialog.element.remove();
        }, 100);
      });
    });
  }
}

export default Dialog;
