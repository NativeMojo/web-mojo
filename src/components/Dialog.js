/**
 * Dialog - Complete Bootstrap 5 Modal component for MOJO framework
 * Supports all Bootstrap 5 modal features including sizes, fullscreen, scrollable, etc.
 * Can accept View instances as body content
 */

import View from '../core/View.js';

class Dialog extends View {
  constructor(options = {}) {
    super({
      ...options,
      tagName: 'div',
      className: `modal ${options.fade !== false ? 'fade' : ''} ${options.className || ''}`,
      attributes: {
        tabindex: '-1',
        'aria-hidden': 'true',
        'aria-labelledby': options.labelledBy || `${options.id || 'modal'}-label`,
        'aria-describedby': options.describedBy || null,
        ...options.attributes
      }
    });
    
    // Generate unique ID if not provided
    this.modalId = options.id || `modal-${Date.now()}`;
    this.element.id = this.modalId;
    
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
    
    // Body can be string, HTML, or View instance
    this.body = options.body || options.content || '';
    this.bodyView = null; // Will hold View instance if body is a View
    if (this.body instanceof View) {
      this.bodyView = this.body;
      this.body = ''; // Clear string body
      this.addChild(this.bodyView); // Add as child for proper lifecycle
    }
    
    this.bodyClass = options.bodyClass || '';
    this.footer = options.footer || null;
    this.footerView = null; // Will hold View instance if footer is a View
    if (this.footer instanceof View) {
      this.footerView = this.footer;
      this.footer = null;
      this.addChild(this.footerView);
    }
    this.footerClass = options.footerClass || '';
    
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
      return `<div class="modal-body ${this.bodyClass}" data-view-container="body"></div>`;
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
   * After render - mount View instances in body/footer
   */
  async onAfterRender() {
    await super.onAfterRender();
    
    // Mount body View if exists
    if (this.bodyView && this.element) {
      const bodyContainer = this.element.querySelector('[data-view-container="body"]');
      if (bodyContainer) {
        this.bodyView.setContainer(bodyContainer);
        await this.bodyView.render();
        await this.bodyView.mount();
      }
    }
    
    // Mount footer View if exists
    if (this.footerView && this.element) {
      const footerContainer = this.element.querySelector('[data-view-container="footer"]');
      if (footerContainer) {
        this.footerView.setContainer(footerContainer);
        await this.footerView.render();
        await this.footerView.mount();
      }
    }
  }
  
  /**
   * After mount - initialize Bootstrap modal
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
    if (this.modal) {
      this.modal.show(relatedTarget);
    }
  }
  
  /**
   * Hide the dialog
   */
  hide() {
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
        this.bodyView.setContainer(bodyEl);
        await this.bodyView.render();
        await this.bodyView.mount();
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
    // Escape HTML
    const escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
    
    // If Prism.js is available, use it for syntax highlighting
    const prismClass = window.Prism ? `language-${language}` : '';
    
    return `
      <pre class="${prismClass}" style="max-height: 60vh; overflow-y: auto; background: #f8f9fa; padding: 1rem; border-radius: 0.25rem; margin: 0;">
        <code class="${prismClass}">${escaped}</code>
      </pre>
    `;
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
   * Static alert dialog
   */
  static async alert(message, title = 'Alert', options = {}) {
    const dialog = new Dialog({
      title,
      body: `<p>${message}</p>`,
      size: options.size || 'sm',
      centered: true,
      buttons: [
        { text: 'OK', class: 'btn-primary', dismiss: true }
      ],
      ...options
    });
    
    await dialog.render();
    document.body.appendChild(dialog.element);
    await dialog.mount();
    dialog.show();
    
    return new Promise((resolve) => {
      dialog.on('hidden', () => {
        dialog.destroy();
        dialog.element.remove();
        resolve();
      });
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
}

export default Dialog;