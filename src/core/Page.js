/**
 * Page - Extends View with routing capabilities for MOJO framework
 * Handles URL routing, parameters, and page-specific actions
 *
 * Event Emitter notes:
 *   - Uses EventEmitter via View base class.
 *   - Use .emit/.on/.off/.once for all custom events.
 */

import View from './View.js';

class Page extends View {
  constructor(options = {}) {
    // Set default tag name for pages
    options.tagName = options.tagName || 'main';
    options.className = options.className || 'mojo-page';

    // Set page ID based on page name
    const pageName = options.pageName || '';
    if (pageName && !options.id) {
      options.id = 'page_' + pageName.toLowerCase().replace(/\s+/g, '_');
    }

    super(options);

    // Core page properties from design doc
    this.pageName = options.pageName || this.constructor.pageName || '';
    this.route = options.route || this.constructor.route || '';
    this.title = options.title || this.pageName || '';

    // Set page ID if not already set and we have a page_name from constructor
    if (!this.id && this.constructor.pageName && !options.pageName) {
      this.id = 'page_' + this.constructor.pageName.toLowerCase().replace(/\s+/g, '_');
    }

    // Page metadata for event system
    this.pageIcon = options.icon || options.pageIcon || this.constructor.pageIcon || 'bi bi-file-text';
    this.displayName = options.displayName || this.constructor.displayName || this.pageName || '';
    this.pageDescription = options.pageDescription || this.constructor.pageDescription || '';

    // Routing state
    this.params = {};
    this.query = {};
    this.matched = false;
    this.isActive = false;

    // Page-specific options
    this.pageOptions = {
      title: options.title || this.pageName || 'Untitled Page',
      description: options.description || '',
      requiresAuth: options.requiresAuth || false,
      ...options.pageOptions
    };

    // State preservation
    this.savedState = null;

    console.log(`Page ${this.pageName} constructed with route: ${this.route}`);
  }

  /**
   * Handle route parameters - from design doc
   * @param {object} params - Route parameters
   * @param {object} query - Query string parameters
   */
  async onParams(params = {}, query = {}) {
    // const paramsChanged = JSON.stringify(params) !== JSON.stringify(this.params);
    // const queryChanged = JSON.stringify(query) !== JSON.stringify(this.query);

    this.params = params;
    this.query = query;

    // Only re-render if params actually changed and page is active
    // if (this.isActive && (paramsChanged || queryChanged)) {
    //   console.log(`Page ${this.pageName} params changed, re-rendering`);
    //   await this.render();
    // }
  }

  canEnter() {
    if (this.options.permissions) {
      const user = this.getApp().activeUser;
      if (!user || !user.hasPermission(this.options.permissions)) {
        return false;
      }
    }
    if (this.options.requiresGroup && !this.getApp().activeGroup) {
      return false;
    }
    return true;
  }

  /**
   * Called when entering this page (before render)
   * Override this method for initialization logic
   */
  async onEnter() {
    this.isActive = true;
    await this.onInitView();

    // Restore saved state if exists
    if (this.savedState) {
      this.restoreState(this.savedState);
      this.savedState = null;
    }

    // Set page title if provided
    if (this.pageOptions && this.pageOptions.title && typeof document !== 'undefined') {
      document.title = this.pageOptions.title;
    }

    // Emit activation event
    this.emit('activated', {
      page: this.getMetadata()
    });

    console.log(`Page ${this.pageName} entered`);
  }

  /**
   * Called when leaving this page (before cleanup)
   * Override this method for cleanup logic like removing listeners, clearing timers, etc.
   */
  async onExit() {
    // Save state before exit
    this.savedState = this.captureState();
    this.isActive = false;

    // Emit deactivation event
    this.emit('deactivated', {
      page: this.getMetadata()
    });
    console.log(`Page ${this.pageName} exiting`);
  }

  /**
   * Get page metadata for display and events
   * @returns {object} Page metadata
   */
  getMetadata() {
    return {
      name: this.pageName,
      displayName: this.displayName || this.pageName,
      icon: this.pageIcon,
      description: this.pageDescription,
      route: this.route,
      isActive: this.isActive
    };
  }

  /**
   * Handle default action - fallback from design doc
   */
  async onActionDefault() {
    console.log(`Default action triggered on page: ${this.pageName}`);
  }

  async makeActive() {
      this.getApp().showPage(this);
  }

  async onActionNavigate(event, element) {
      event.preventDefault();
      const page = element.dataset.page;
      this.getApp().showPage(page);
  }

  /**
   * Capture current page state for preservation
   * @returns {object|null} Captured state
   */
  captureState() {
    if (!this.element) return null;

    return {
      scrollTop: this.element.scrollTop,
      formData: this.captureFormData(),
      custom: this.captureCustomState()
    };
  }

  /**
   * Restore saved state
   * @param {object} state - State to restore
   */
  restoreState(state) {
    if (!state || !this.element) return;

    this.element.scrollTop = state.scrollTop || 0;
    this.restoreFormData(state.formData);
    if (state.custom) {
      this.restoreCustomState(state.custom);
    }
  }

  /**
   * Capture form data from page
   * @returns {object} Form data
   */
  captureFormData() {
    const data = {};
    if (!this.element) return data;

    this.element.querySelectorAll('input, select, textarea').forEach(field => {
      if (field.name) {
        if (field.type === 'checkbox') {
          data[field.name] = field.checked;
        } else if (field.type === 'radio') {
          if (field.checked) {
            data[field.name] = field.value;
          }
        } else {
          data[field.name] = field.value;
        }
      }
    });

    return data;
  }

  /**
   * Restore form data to page
   * @param {object} formData - Form data to restore
   */
  restoreFormData(formData) {
    if (!formData || !this.element) return;

    Object.entries(formData).forEach(([name, value]) => {
      const field = this.element.querySelector(`[name="${name}"]`);
      if (field) {
        if (field.type === 'checkbox') {
          field.checked = value;
        } else if (field.type === 'radio') {
          const radio = this.element.querySelector(`[name="${name}"][value="${value}"]`);
          if (radio) radio.checked = true;
        } else {
          field.value = value;
        }
      }
    });
  }

  /**
   * Capture custom state - override in subclasses
   * @returns {object} Custom state
   */
  captureCustomState() {
    return {};
  }

  /**
   * Restore custom state - override in subclasses
   * @param {object} state - Custom state to restore
   */
  restoreCustomState(state) {
    // Override in subclasses
  }



  /**
   * Set page metadata
   * @param {object} meta - Metadata object
   */
  setMeta(meta = {}) {
    if (typeof document === 'undefined') {
      return;
    }

    // Set title
    if (meta.title) {
      document.title = meta.title;
      this.pageOptions.title = meta.title;
    }

    // Set description
    if (meta.description) {
      let descMeta = document.querySelector('meta[name="description"]');
      if (!descMeta) {
        descMeta = document.createElement('meta');
        descMeta.name = 'description';
        document.head.appendChild(descMeta);
      }
      descMeta.content = meta.description;
      this.pageOptions.description = meta.description;
    }

    // Set other meta tags
    Object.entries(meta).forEach(([key, value]) => {
      if (key !== 'title' && key !== 'description') {
        let metaEl = document.querySelector(`meta[name="${key}"]`);
        if (!metaEl) {
          metaEl = document.createElement('meta');
          metaEl.name = key;
          document.head.appendChild(metaEl);
        }
        metaEl.content = value;
      }
    });
  }


  /**
   * Show error message with page context
   * @param {string} message - Error message
   */
  showError(message) {
    super.showError(message);

    // Page-specific error display can be implemented here
    if (this.element) {
      // Example: Add error to page
      const errorDiv = document.createElement('div');
      errorDiv.className = 'alert alert-danger alert-dismissible fade show';
      errorDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      `;

      // Insert at top of page
      this.element.insertBefore(errorDiv, this.element.firstChild);

      // Auto-remove after 5 seconds
      setTimeout(() => {
        if (errorDiv.parentNode) {
          errorDiv.parentNode.removeChild(errorDiv);
        }
      }, 5000);
    }
  }

  /**
   * Show success message with page context
   * @param {string} message - Success message
   */
  showSuccess(message) {
    super.showSuccess(message);

    // Page-specific success display
    if (this.element) {
      const successDiv = document.createElement('div');
      successDiv.className = 'alert alert-success alert-dismissible fade show';
      successDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      `;

      // Insert at top of page
      this.element.insertBefore(successDiv, this.element.firstChild);

      // Auto-remove after 3 seconds
      setTimeout(() => {
        if (successDiv.parentNode) {
          successDiv.parentNode.removeChild(successDiv);
        }
      }, 3000);
    }
  }

  /**
   * Page-specific before render hook
   */
  async onBeforeRender() {
    await super.onBeforeRender();

    // Set page metadata before rendering
    this.setMeta({
      title: this.pageOptions.title,
      description: this.pageOptions.description
    });
  }

  /**
   * Page-specific after mount hook
   */
  async onAfterMount() {
    await super.onAfterMount();

    // Add page-specific class to body
    if (typeof document !== 'undefined' && this.pageName) {
      document.body.classList.add(`page-${this.pageName.toLowerCase().replace(/\s+/g, '-')}`);
    }
  }

  /**
   * Page-specific before destroy hook
   */
  async onBeforeDestroy() {
    await super.onBeforeDestroy();

    // Remove page-specific class from body
    if (typeof document !== 'undefined' && this.pageName) {
      document.body.classList.remove(`page-${this.pageName.toLowerCase().replace(/\s+/g, '-')}`);
    }
  }

  /**
   * Navigate to another page using the app's router
   * @param {string} route - Route to navigate to
   * @param {object} params - Route parameters
   * @param {object} options - Navigation options
   */
  navigate(route, params = {}, options = {}) {
    // Delegate to app's router
    if (this.app && this.app.router) {
      return this.app.router.navigate(route, options);
    }

    // Fallback to MOJO global router
    if (typeof window !== 'undefined' && window.MOJO?.router) {
      return window.MOJO.router.navigate(route, options);
    }

    console.error('No router available for navigation');
  }

  getRoute() {
      if (this.route) {
          let route = this.route;
          if (typeof route === 'string' && route.startsWith('/')) {
              route = route.substring(1);
          }
          return route;
      }
      return this.pageName;
  }

  syncUrl(force = true) {
      this.updateBrowserUrl(this.query, false, false);
  }

  updateBrowserUrl(query = null, replace = false, trigger = false) {
    this.getApp();
    // we need to do this to normalize the URL
    // const targetPath = this.app.buildPagePath(this, this.params, query);
    // const { pageName, queryParams } = this.app.router.parseInput(targetPath);
    this.app.router.updateBrowserUrl(this.getRoute(), query, replace, trigger);
  }

  /**
   * Static method to define a page class with metadata
   * @param {object} definition - Page class definition
   * @returns {class} Page class
   */
  static define(definition) {
    class DefinedPage extends Page {
      constructor(options = {}) {
        super({
          ...definition,
          ...options
        });
      }
    }

    // Copy static properties
    DefinedPage.template = definition.template;
    DefinedPage.pageName = definition.pageName;
    DefinedPage.route = definition.route;

    return DefinedPage;
  }
}

export default Page;
