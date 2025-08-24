/**
 * ToastService - Bootstrap 5 Toast Notification Service
 * Provides methods to display toast notifications with different types and options
 *
 * Features:
 * - Bootstrap 5 toast integration
 * - Multiple toast types (success, error, info, warning)
 * - Auto-dismiss with customizable delays
 * - Toast container management
 * - Event integration
 * - Proper cleanup and memory management
 *
 * @example
 * const toastService = new ToastService();
 * toastService.success('Operation completed successfully!');
 * toastService.error('Something went wrong');
 * toastService.info('FYI: This is informational');
 * toastService.warning('Please be careful');
 */

class ToastService {
  constructor(options = {}) {
    this.options = {
      containerId: 'toast-container',
      position: 'top-end', // top-start, top-center, top-end, middle-start, etc.
      autohide: true,
      defaultDelay: 5000, // 5 seconds
      maxToasts: 5, // Maximum number of toasts to show at once
      ...options
    };

    this.toasts = new Map(); // Track active toasts
    this.toastCounter = 0; // For unique IDs
    
    this.init();
  }

  /**
   * Initialize the toast service
   */
  init() {
    this.createContainer();
  }

  /**
   * Create the toast container if it doesn't exist
   */
  createContainer() {
    let container = document.getElementById(this.options.containerId);
    
    if (!container) {
      container = document.createElement('div');
      container.id = this.options.containerId;
      container.className = `toast-container position-fixed ${this.getPositionClasses()}`;
      container.style.zIndex = '1070'; // Bootstrap toast z-index
      container.setAttribute('aria-live', 'polite');
      container.setAttribute('aria-atomic', 'true');
      
      document.body.appendChild(container);
    }
    
    this.container = container;
  }

  /**
   * Get CSS classes for toast positioning
   */
  getPositionClasses() {
    const positionMap = {
      'top-start': 'top-0 start-0 p-3',
      'top-center': 'top-0 start-50 translate-middle-x p-3',
      'top-end': 'top-0 end-0 p-3',
      'middle-start': 'top-50 start-0 translate-middle-y p-3',
      'middle-center': 'top-50 start-50 translate-middle p-3',
      'middle-end': 'top-50 end-0 translate-middle-y p-3',
      'bottom-start': 'bottom-0 start-0 p-3',
      'bottom-center': 'bottom-0 start-50 translate-middle-x p-3',
      'bottom-end': 'bottom-0 end-0 p-3'
    };
    
    return positionMap[this.options.position] || positionMap['top-end'];
  }



  /**
   * Show a success toast
   * @param {string} message - The message to display
   * @param {object} options - Additional options
   */
  success(message, options = {}) {
    return this.show(message, 'success', {
      icon: 'bi-check-circle-fill',
      ...options
    });
  }

  /**
   * Show an error toast
   * @param {string} message - The message to display
   * @param {object} options - Additional options
   */
  error(message, options = {}) {
    return this.show(message, 'error', {
      icon: 'bi-exclamation-triangle-fill',
      autohide: false, // Keep error toasts visible until manually dismissed
      ...options
    });
  }

  /**
   * Show an info toast
   * @param {string} message - The message to display
   * @param {object} options - Additional options
   */
  info(message, options = {}) {
    return this.show(message, 'info', {
      icon: 'bi-info-circle-fill',
      ...options
    });
  }

  /**
   * Show a warning toast
   * @param {string} message - The message to display
   * @param {object} options - Additional options
   */
  warning(message, options = {}) {
    return this.show(message, 'warning', {
      icon: 'bi-exclamation-triangle-fill',
      ...options
    });
  }

  /**
   * Show a plain toast without specific styling
   * @param {string} message - The message to display
   * @param {object} options - Additional options
   */
  plain(message, options = {}) {
    return this.show(message, 'plain', {
      ...options
    });
  }

  /**
   * Show a toast with specified type and options
   * @param {string} message - The message to display
   * @param {string} type - Toast type (success, error, info, warning)
   * @param {object} options - Additional options
   */
  show(message, type = 'info', options = {}) {
    // Enforce max toasts limit
    this.enforceMaxToasts();
    
    const toastId = `toast-${++this.toastCounter}`;
    const config = {
      title: this.getDefaultTitle(type),
      icon: this.getDefaultIcon(type),
      autohide: this.options.autohide,
      delay: this.options.defaultDelay,
      dismissible: true,
      ...options
    };

    const toastElement = this.createToastElement(toastId, message, type, config);
    this.container.appendChild(toastElement);

    // Initialize Bootstrap toast
    if (typeof bootstrap === 'undefined') {
      throw new Error('Bootstrap is required for ToastService. Make sure Bootstrap 5 is loaded.');
    }
    const bsToast = new bootstrap.Toast(toastElement, {
      autohide: config.autohide,
      delay: config.delay
    });

    // Store toast reference
    this.toasts.set(toastId, {
      element: toastElement,
      bootstrap: bsToast,
      type: type,
      message: message
    });

    // Setup cleanup on hide
    toastElement.addEventListener('hidden.bs.toast', () => {
      this.cleanup(toastId);
    });

    // Show the toast
    bsToast.show();

    return {
      id: toastId,
      hide: () => {
        try {
          bsToast.hide();
        } catch (error) {
          console.warn('Error hiding toast:', error);
        }
      },
      dispose: () => this.cleanup(toastId),
      updateProgress: options.updateProgress || null
    };
  }

  /**
   * Show a toast with a View component in the body
   * @param {View} view - The View component to display
   * @param {string} type - Toast type (success, error, info, warning, plain)
   * @param {object} options - Additional options
   */
  showView(view, type = 'info', options = {}) {
    // Enforce max toasts limit
    this.enforceMaxToasts();
    
    const toastId = `toast-${++this.toastCounter}`;
    const config = {
      title: options.title || this.getDefaultTitle(type),
      icon: options.icon || this.getDefaultIcon(type),
      autohide: this.options.autohide,
      delay: this.options.defaultDelay,
      dismissible: true,
      ...options
    };

    const toastElement = this.createViewToastElement(toastId, view, type, config);
    this.container.appendChild(toastElement);

    // Initialize Bootstrap toast
    if (typeof bootstrap === 'undefined') {
      throw new Error('Bootstrap is required for ToastService. Make sure Bootstrap 5 is loaded.');
    }
    const bsToast = new bootstrap.Toast(toastElement, {
      autohide: config.autohide,
      delay: config.delay
    });

    // Store toast reference with view
    this.toasts.set(toastId, {
      element: toastElement,
      bootstrap: bsToast,
      type: type,
      view: view,
      message: 'View toast'
    });

    // Setup cleanup on hide - dispose view properly
    toastElement.addEventListener('hidden.bs.toast', () => {
      this.cleanupView(toastId);
    });

    // Mount and render the view
    const bodyContainer = toastElement.querySelector('.toast-view-body');
    if (bodyContainer && view) {
      view.render(true, bodyContainer);
    }

    // Show the toast
    bsToast.show();

    return {
      id: toastId,
      view: view,
      hide: () => {
        try {
          bsToast.hide();
        } catch (error) {
          console.warn('Error hiding view toast:', error);
        }
      },
      dispose: () => this.cleanupView(toastId),
      updateProgress: (progressInfo) => {
        if (view && typeof view.updateProgress === 'function') {
          view.updateProgress(progressInfo);
        }
      }
    };
  }

  /**
   * Create toast DOM element
   */
  createToastElement(id, message, type, config) {
    const toast = document.createElement('div');
    toast.id = id;
    toast.className = `toast toast-service-${type}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');

    const header = config.title || config.icon ? this.createToastHeader(config, type) : '';
    const body = this.createToastBody(message, config.icon && !config.title);

    toast.innerHTML = `
      ${header}
      ${body}
    `;

    return toast;
  }

  /**
   * Create toast DOM element for View component
   */
  createViewToastElement(id, view, type, config) {
    const toast = document.createElement('div');
    toast.id = id;
    toast.className = `toast toast-service-${type}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');

    const header = config.title || config.icon ? this.createToastHeader(config, type) : '';
    const body = this.createViewToastBody();

    toast.innerHTML = `
      ${header}
      ${body}
    `;

    return toast;
  }

  /**
   * Create toast body for View component
   */
  createViewToastBody() {
    return `
      <div class="toast-body p-0">
        <div class="toast-view-body p-3"></div>
      </div>
    `;
  }

  /**
   * Create toast header with title and icon
   */
  createToastHeader(config, _type) {
    const iconHtml = config.icon ? 
      `<i class="${config.icon} toast-service-icon me-2"></i>` : '';
    
    const titleHtml = config.title ? 
      `<strong class="me-auto">${iconHtml}${this.escapeHtml(config.title)}</strong>` : '';

    const timeHtml = config.showTime ? 
      `<small class="text-muted">${this.getTimeString()}</small>` : '';

    const closeButton = config.dismissible ? 
      `<button type="button" class="btn-close toast-service-close" data-bs-dismiss="toast" aria-label="Close"></button>` : '';

    if (!titleHtml && !timeHtml && !closeButton) {
      return '';
    }

    return `
      <div class="toast-header">
        ${titleHtml}
        ${timeHtml}
        ${closeButton}
      </div>
    `;
  }

  /**
   * Create toast body with message
   */
  createToastBody(message, showIcon = false) {
    const iconHtml = showIcon ? 
      `<i class="${this.getDefaultIcon('info')} toast-service-icon me-2"></i>` : '';
    
    return `
      <div class="toast-body d-flex align-items-center">
        ${iconHtml}
        <span>${this.escapeHtml(message)}</span>
      </div>
    `;
  }

  /**
   * Get default title for toast type
   */
  getDefaultTitle(type) {
    const titles = {
      success: 'Success',
      error: 'Error',
      warning: 'Warning',
      info: 'Information',
      plain: ''
    };
    return titles[type] || 'Notification';
  }

  /**
   * Get default icon for toast type
   */
  getDefaultIcon(type) {
    const icons = {
      success: 'bi-check-circle-fill',
      error: 'bi-exclamation-triangle-fill',
      warning: 'bi-exclamation-triangle-fill',
      info: 'bi-info-circle-fill',
      plain: ''
    };
    return icons[type] || 'bi-info-circle-fill';
  }

  /**
   * Enforce maximum number of toasts
   */
  enforceMaxToasts() {
    const activeToasts = Array.from(this.toasts.values());
    
    if (activeToasts.length >= this.options.maxToasts) {
      // Remove oldest toast
      const oldestId = this.toasts.keys().next().value;
      const oldest = this.toasts.get(oldestId);
      
      if (oldest) {
        oldest.bootstrap.hide();
      }
    }
  }

  /**
   * Clean up toast resources
   */
  cleanup(toastId) {
    const toast = this.toasts.get(toastId);
    
    if (toast) {
      // Dispose Bootstrap toast
      try {
        toast.bootstrap.dispose();
      } catch (e) {
        console.warn('Error disposing toast:', e);
      }
      
      // Remove from DOM
      if (toast.element && toast.element.parentNode) {
        toast.element.parentNode.removeChild(toast.element);
      }
      
      // Remove from tracking
      this.toasts.delete(toastId);
    }
  }

  /**
   * Clean up view toast resources with proper view disposal
   */
  cleanupView(toastId) {
    const toast = this.toasts.get(toastId);
    
    if (toast) {
      // Dispose view first if it exists
      if (toast.view && typeof toast.view.dispose === 'function') {
        try {
          toast.view.dispose();
        } catch (e) {
          console.warn('Error disposing view in toast:', e);
        }
      }
      
      // Dispose Bootstrap toast
      try {
        toast.bootstrap.dispose();
      } catch (e) {
        console.warn('Error disposing toast:', e);
      }
      
      // Remove from DOM
      if (toast.element && toast.element.parentNode) {
        toast.element.parentNode.removeChild(toast.element);
      }
      
      // Remove from tracking
      this.toasts.delete(toastId);
    }
  }

  /**
   * Hide all active toasts
   */
  hideAll() {
    this.toasts.forEach((toast, _id) => {
      toast.bootstrap.hide();
    });
  }

  /**
   * Clear all toasts immediately
   */
  clearAll() {
    this.toasts.forEach((toast, id) => {
      this.cleanup(id);
    });
  }

  /**
   * Get current time string
   */
  getTimeString() {
    return new Date().toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Dispose of the entire toast service
   */
  dispose() {
    this.clearAll();
    
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }

  /**
   * Get statistics about active toasts
   */
  getStats() {
    const stats = {
      total: this.toasts.size,
      byType: {}
    };
    
    this.toasts.forEach(toast => {
      stats.byType[toast.type] = (stats.byType[toast.type] || 0) + 1;
    });
    
    return stats;
  }

  /**
   * Set global options
   */
  setOptions(newOptions) {
    this.options = { ...this.options, ...newOptions };
    
    // Recreate container if position changed
    if (newOptions.position) {
      if (this.container) {
        this.container.className = `toast-container position-fixed ${this.getPositionClasses()}`;
      }
    }
  }
}

export default ToastService;