// -----------------------------------------------
// Imports
// -----------------------------------------------
import Mustache from '../utils/mustache.js';
if (typeof window !== 'undefined') {
  window.Mustache = Mustache;
}
import MOJOUtils from '../utils/MOJOUtils.js';
import EventDelegate from './EventDelegate.js';

// -----------------------------------------------
// View
// -----------------------------------------------
export class View {
  // ---------------------------------------------
  // Construction & defaults
  // ---------------------------------------------
  constructor(opts = {}) {
    this.tagName     = opts.tagName ?? "div";
    this.className   = opts.className ?? "mojo-view";
    this.style       = opts.style ?? null;                  // inline css text
    this.id          = opts.id ?? View._genId();            // element id
    this.containerId = opts.containerId ?? null;            // container to render into
    this.container   = opts.container ?? null;              // container element

    // If container is a string, treat it as containerId and set container to null
    if (typeof this.container === 'string') {
      this.containerId = this.container;
      this.container = null;
    }
    this.parent      = opts.parent ?? null;                 // parent view
    this.children    = opts.children ?? {};                 // dict of id -> child view
    this.template    = opts.template || opts.templateUrl || "";                 // string or function(model) -> string
    this.model       = opts.model ?? {};
    this.data        = opts.data ?? {};                    // data for Mustache or basic templating
    this.isRendering     = false;
    this.lastRenderTime  = 0;
    this.mounted         = false;
    this.debug           = opts.debug ?? false;
    this.app           = opts.app ?? null;
    this.cacheTemplate = opts.cacheTemplate ?? true;

    // keep original options
    this.options = { ...opts };

    // internal DOM element
    this.element = this._ensureElement();

    // in constructor
    this.events = new EventDelegate(this);

    if (this.model) this.setModel(this.model);

  }

  // ---------------------------------------------
  // Lifecycle hooks (overridable)
  // ---------------------------------------------
  async onInit() {

  }
  async onInitView() {
      if (this.initialized) return;
      this.initialized = true;
      await this.onInit();
  }
  async onBeforeRender() {}
  async onAfterRender() {}
  async onBeforeMount() {}
  async onAfterMount() {}
  async onBeforeUnmount() {}
  async onAfterUnmount() {}
  async onBeforeDestroy() {}
  async onAfterDestroy() {}

  // ---------------------------------------------
  // Public API
  // ---------------------------------------------
  setModel(model = {}) {
      let isDiff = model !== this.model;
      if (!isDiff) return this;
      if (this.model && this.model.off) {
          this.model.off("change", this._onModelChange, this);
      }
      this.model = model;
      if (this.model && this.model.on) {
          this.model.on("change", this._onModelChange, this);
      }

      // Set model on all children
      for (const id in this.children) {
          const child = this.children[id];
          if (child && typeof child.setModel === 'function') {
              child.setModel(model);
          }
      }

      if (isDiff ) {
          this._onModelChange();
      }
      return this;
  }

  _onModelChange() {
    if (this.isMounted()) {
        this.render();
    }
  }

  setTemplate(tpl)     { this.template = tpl ?? ""; return this; }

  addChild(childView) {
    try {
      if (!childView || typeof childView !== "object") return this;
      childView.parent = this;
      if (this.getApp()) childView.app = this.app;
      this.children[childView.id] = childView;
    } catch (e) { View._warn("addChild error", e); }
    return childView;
  }

  removeChild(idOrView) {
    try {
      const id = typeof idOrView === "string" ? idOrView : (idOrView && idOrView.id);
      if (!id) return this;
      const child = this.children[id];
      if (child) {
        // allow for async or sync destroy
        Promise.resolve(child.destroy()).catch(err => View._warn("removeChild destroy error", err));
        delete this.children[id];
      }
    } catch (e) { View._warn("removeChild error", e); }
    return this;
  }

  getChild(id) {
    return this.children[id];
  }

  async updateData(newData, rerender = false) {
    Object.assign(this.data, newData);

    if (rerender && this.isMounted()) {
      await this.render();
    }

    return this;
  }

  toggleClass(className, force) {
    if (force === undefined) {
      force = !this.element.classList.contains(className);
    }
    this.element.classList.toggle(className, force);
    return this;
  }

  addClass(className) {
    this.element.classList.add(className);
    return this;
  }

  setClass(className) {
    this.element.className = className;
    return this;
  }

  removeClass(className) {
    this.element.classList.remove(className);
    return this;
  }

  canRender() {
      // Optional render throttling
      if (this.options.renderCooldown > 0 && now - this.lastRenderTime < this.options.renderCooldown) {
        View._warn(`View ${this.id}: Render called too quickly, cooldown active`);
        return false;
      }
      if (this.options.noAppend) {
        if (this.parent) {
          if (!this.parent.contains(this.containerId || this.container)) {
              return false;
          } else if (this.containerId && !document.getElementById(this.containerId)) {
              return false;
          } else if (this.container && !document.contains(this.container)) {
              return false;
          }
        }
      }
      return true;
  }

  // ---------------------------------------------
  // Render flow
  // ---------------------------------------------
  async render(allowMount = true, container = null) {
    const now = Date.now();

    if (!this.canRender()) {
        return this;
    }

    this.isRendering = true;
    this.lastRenderTime = now;

    try {
      if (!this.initialized) await this.onInitView();
      this.events.unbind();

      await this.onBeforeRender();
      if (this.getViewData) {
          this.data = await this.getViewData();
      }
      // 1) render own HTML (FIX #5: await the async template render)
      const html = await this.renderTemplate();
      this.element.innerHTML = html;

      if (allowMount && !this.isMounted()) {
          await this.mount(container)
      }

      // 3) render children
      await this._renderChildren();
      await this.onAfterRender();
      this.events.bind(this.element);

    } catch (e) {
      View._warn(`Render error in ${this.id}`, e);
    } finally {
      // FIX #4: always reset isRendering
      this.isRendering = false;
    }

    return this;
  }

  async _renderChildren() {
    for (const id in this.children) {
      const child = this.children[id];
      if (!child) continue;
      child.parent = this;
      await Promise.resolve(child.render()).catch(err => View._warn(`Child render error (${id})`, err));
    }
  }

  async _unmountChildren() {
    for (const id in this.children) {
      const child = this.children[id];
      if (!child) continue;
      child.unbindEvents()
    }
  }


  isMounted() {
    return this.element?.isConnected;
  }

  getChildElementById(id, root = null) {
    const cleanId = id.startsWith('#') ? id.substring(1) : id;
    if (root) {
        return root.querySelector(`#${cleanId}`);
    }
    return this.element.querySelector(`#${cleanId}`);
  }

  getChildElement(id) {
    if (id.startsWith("#")) {
        return this.getChildElementById(id);
    }
    let el = this.element?.querySelector(`[data-container="${id}"]`);
    if (!el) {
        return this.getChildElementById(id);
    }
    return el;
  }

  getContainer() {
      if (this.replaceById) {
          // this means we want to place the element in the dom that matches our id
          if (this.parent) {
              return this.parent.getChildElementById(this.id);
          }
          // return this.getChildElementById(this.id, document.body);
          return null;
      }
      if (!this.containerId) return null;
      if (this.parent) {
          return this.parent.getChildElement(this.containerId);
      }
      return this.getChildElementById(this.containerId, document.body);
  }

  async mount(container =  null) {
      await this.onBeforeMount();
      if (!container) {
          container = this.getContainer();
      }

      if (this.containerId && !container) {
          // throw new Error(`Container not found for ${this.containerId}`);
          console.error(`Container not found for ${this.containerId}`);
          return;
      }

      if (container && this.replaceById) {
          container.replaceWith(this.element);
      } else if (container) {
          // if we have a container just replace its children with our element
          container.replaceChildren(this.element);
      } else if (!this.containerId && this.parent) {
          // append to parent
          this.parent.element.appendChild(this.element);
      } else if (!this.containerId && !this.parent) {
          // append to body
          document.body.appendChild(this.element);
      } else {
          // there is a containerId but no container
          console.error(`Container not found for ${this.containerId}`);
      }

      await this.onAfterMount();
      this.mounted = true;
  }

  async unmount() {
      if (!this.element || !this.element.parentNode) return;
      await this.onBeforeUnmount();
      // unbind all children
      await this._unmountChildren();
      if (this.element.parentNode) this.element.parentNode.removeChild(this.element);
      this.events.unbind();
      await this.onAfterUnmount();
      this.mounted = false;
  }

  // FIX #1: make destroy async (it already awaited hooks)
  async destroy() {
    try {
        this.events.unbind();
      // destroy children first (support async or sync destroy)
      for (const id in this.children) {
        const ch = this.children[id];
        if (ch) {
          await Promise.resolve(ch.destroy()).catch(err => View._warn(`Child destroy error (${id})`, err));
        }
      }
      this.mounted = false;
      if (this.element && this.element.parentNode) {
        await this.onBeforeDestroy();
        if (this.element.parentNode) this.element.parentNode.removeChild(this.element);
        await this.onAfterDestroy();
      }
    } catch (e) {
      View._warn(`Destroy error in ${this.id}`, e);
    }
  }

  // ---------------------------------------------
  // DOM helpers
  // ---------------------------------------------
  _ensureElement() {
    try {
      if (this.element && this.element.tagName?.toLowerCase() === this.tagName) {
        this._syncAttrs();
        return this.element;
      }
      const el = document.createElement(this.tagName);
      this.element = el;
      this.el = el;
      this._syncAttrs();
      return el;
    } catch (e) {
      View._warn("ensureElement error", e);
      // last resort: create a DIV to avoid throwing
      const el = document.createElement("div");
      // FIX #2: use View._genId() (not SimpleView)
      el.id = this.id || View._genId();
      return el;
    }
  }

  _syncAttrs() {
    try {
      if (!this.element) return;
      if (this.id) this.element.id = this.id;
      this.element.className = this.className || "";
      if (this.style == null) {
        this.element.removeAttribute("style");
      } else {
        this.element.style.cssText = String(this.style);
      }
    } catch (e) { View._warn("_syncAttrs error", e); }
  }

  bindEvents() {
      this.events.bind(this.element);
  }

  unbindEvents() {
      this.events.unbind();
  }

  // ---------------------------------------------
  // Template helpers
  // ---------------------------------------------
  async renderTemplate() {
    const templateContent = await this.getTemplate();
    if (!templateContent) return '';
    const partials = this.getPartials();
    return Mustache.render(templateContent, this, partials);
  }

  renderTemplateString(template, context, partials) {
    return Mustache.render(template, context, partials);
  }

  getPartials() { return {}; }

  async getTemplate() {
    if (this._templateCache && this.cacheTemplate) {
      return this._templateCache;
    }
    const template = this.template || this.templateUrl;
    if (!template) {
      throw new Error('Template not found');
    }

    let templateContent = '';

    if (typeof template === 'string') {
      if (template.includes('<') || template.includes('{')) {
          templateContent = template;
      } else {
        try {
          let templatePath = template;
          if (!this.app) this.app = this.getApp();
          if (this.app && this.app.basePath) {
            if (!templatePath.startsWith('/') &&
                !templatePath.startsWith('http://') &&
                !templatePath.startsWith('https://')) {
              const base = this.app.basePath.endsWith('/')
                  ? this.app.basePath.slice(0, -1)
                  : this.app.basePath;
              templatePath = `${base}/${templatePath}`;
            }
          }

          const response = await fetch(templatePath);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          templateContent = await response.text();
        } catch (error) {
          View._warn(`Failed to load template from ${template}: ${error}`);
          // NOTE: showError may be provided by host app
          this.showError?.(`Failed to load template from ${template}: ${error.message}`);
        }
      }
    } else if (typeof template === 'function') {
      templateContent = await this.template(this.data, this.state);
    }

    if (this.cacheTemplate && templateContent) {
      this._templateCache = templateContent;
    }

    return templateContent;
  }

  getContextValue(path) {
    const value = MOJOUtils.getContextData(this, path);

    if (path && path.startsWith('data.') && value && typeof value === 'object') {
      return MOJOUtils.wrapData(value, this);
    }

    if (path && path.startsWith('model.') &&
        path !== 'model' &&
        value && typeof value === 'object' &&
        typeof value.getContextValue !== 'function') {
      return MOJOUtils.wrapData(value, null);
    }

    return value;
  }

  // 9) Navigation Helpers ------------------------------------------------------
  async handlePageNavigation(element) {
    const pageName = element.getAttribute('data-page');
    const paramsAttr = element.getAttribute('data-params');
    let params = {};
    if (paramsAttr) {
      try { params = JSON.parse(paramsAttr); }
      catch (error) { console.warn('Invalid JSON in data-params:', paramsAttr); }
    }

    const app = this.getApp();
    if (app) { app.showPage(pageName, params); return; }

    const router = this.findRouter();
    if (router && typeof router.navigateToPage === 'function') {
      await router.navigateToPage(pageName, params);
    } else {
      console.error(`No router found for page navigation to '${pageName}'`);
    }
  }

  async handleHrefNavigation(element) {
    const href = element.getAttribute('href');
    if (this.isExternalLink(href) || element.hasAttribute('data-external')) return;

    const router = this.findRouter();
    if (router) {
      if (router.options && router.options.mode === 'param' && href.startsWith('?')) {
        const fullPath = '/' + href;
        await router.navigate(fullPath);
        return;
      }
      if (router.options && router.options.mode === 'hash' && href.startsWith('#')) {
        await router.navigate(href);
        return;
      }
      const routePath = this.hrefToRoutePath(href);
      await router.navigate(routePath);
    } else {
      console.warn('No router found for navigation, using default behavior');
      window.location.href = href;
    }
  }

  isExternalLink(href) {
    if (!href) return true;
    if (href.startsWith("/") && this.getApp()) {
        if (href.startsWith(this.findRouter().basePath)) return false;
        return true;
    }
    return href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//');
  }

  hrefToRoutePath(href) {
    if (href.startsWith('/')) {
      const router = this.findRouter();
      if (router && router.options && router.options.base) {
        const base = router.options.base;
        if (href.startsWith(base)) return href.substring(base.length) || '/';
      }
      return href;
    }
    return href.startsWith('./') ? href.substring(2) : href;
  }

  findRouter() {
    this.getApp();
    return this.app?.router || null;
  }

  getApp() {
    if (this.app) return this.app;
    const apps = [
      window.__app__,
      window.matchUUID ? window[window.matchUUID]() : window[window.matchUUID],
      window.MOJO?.app,
      window.APP,
      window.app,
      window.WebApp
    ];
    this.app = apps.find(app => app && typeof app.showPage === 'function') || null;
    return this.app;
  }

  handleActionError(action, err, evt, el) {
      this.showError(`Action '${action}' failed: ${err}`, evt, el);
  }

  // ---------------------------------------------
  // Utilities
  // ---------------------------------------------
  /**
   * Escape HTML characters
   * @param {string} str - String to escape
   * @returns {string} Escaped string
   */
  escapeHtml(str) {
    if (typeof str !== 'string') return str;

    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  contains(el) {
      if (typeof el === 'string') {
        if (!this.element) return false; // no parent element yet
        el = document.getElementById(el);
      }
      if (!el) return false; // no element with that id
      return this.element.contains(el);
  }

  /**
   * Show error message
   * @param {string} message - Error message
   */
  async showError(message) {
    console.error(`View ${this.id} error:`, message);

    // Use Dialog component for better UX
    try {
      const Dialog = await import('./Dialog.js').then(m => m.default);
      await Dialog.alert(message, 'Error', {
        size: 'md',
        class: 'text-danger'
      });
    } catch (importError) {
      // Fallback to MOJO framework dialog if Dialog import fails
      alert(`Error: ${message}`);
    }
  }

  /**
   * Show success message
   * @param {string} message - Success message
   */
  async showSuccess(message) {
    if (this.debug) {
      console.log(`View ${this.id} success:`, message);
    }

    // Use Dialog component for better UX
    try {
      const Dialog = await import('./Dialog.js').then(m => m.default);
      await Dialog.alert(message, 'Success', {
        size: 'md',
        class: 'text-success'
      });
    } catch (importError) {
      // Fallback to MOJO framework dialog if Dialog import fails
      if (typeof window !== 'undefined' && window.MOJO && window.MOJO.showSuccess) {
        window.MOJO.showSuccess(message);
      } else {
        // Ultimate fallback to browser alert
        alert(`Success: ${message}`);
      }
    }
  }

  /**
   * Show info message
   * @param {string} message - Info message
   */
  async showInfo(message) {
    console.info(`View ${this.id} info:`, message);

    // Use Dialog component for better UX
    try {
      const Dialog = await import('./Dialog.js').then(m => m.default);
      await Dialog.alert(message, 'Information', {
        size: 'md',
        class: 'text-info'
      });
    } catch (importError) {
      // Fallback to MOJO framework dialog if Dialog import fails
      if (typeof window !== 'undefined' && window.MOJO && window.MOJO.showInfo) {
        window.MOJO.showInfo(message);
      } else {
        // Ultimate fallback to browser alert
        alert(`Info: ${message}`);
      }
    }
  }

  /**
   * Show warning message
   * @param {string} message - Warning message
   */
  async showWarning(message) {
    console.warn(`View ${this.id} warning:`, message);

    // Use Dialog component for better UX
    try {
      const Dialog = await import('./Dialog.js').then(m => m.default);
      await Dialog.alert(message, 'Warning', {
        size: 'md',
        class: 'text-warning'
      });
    } catch (importError) {
      // Fallback to MOJO framework dialog if Dialog import fails
      if (typeof window !== 'undefined' && window.MOJO && window.MOJO.showWarning) {
        window.MOJO.showWarning(message);
      } else {
        // Ultimate fallback to browser alert
        alert(`Warning: ${message}`);
      }
    }
  }

  static _genId() { return `view_${Math.random().toString(36).substr(2, 9)}`; }

  static _warn(msg, err) {
    try {
      if (err) console.warn(`[View] ${msg}:`, err);
      else console.warn(`[View] ${msg}`);
    } catch { /* never throw on logging */ }
  }
}

import EventEmitter from '../utils/EventEmitter.js';
Object.assign(View.prototype, EventEmitter);

export default View;
