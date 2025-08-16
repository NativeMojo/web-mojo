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
    this.parent      = opts.parent ?? null;                 // parent view
    this.children    = opts.children ?? {};                 // dict of id -> child view
    this.template    = opts.template ?? "";                 // string or function(model) -> string
    this.model       = opts.model ?? {};
    this.data        = opts.data ?? {};                    // data for Mustache or basic templating
    this.isRendering     = false;
    this.lastRenderTime  = 0;
    this.mounted         = false;
    this.debug           = opts.debug ?? false;

    // keep original options
    this.options = { ...opts };

    // internal DOM element
    this.element = this._ensureElement();

    // in constructor
    this.events = new EventDelegate(this);

  }

  // ---------------------------------------------
  // Lifecycle hooks (overridable)
  // ---------------------------------------------
  onInit() {}
  async onBeforeRender() {}
  async onAfterRender() {}
  async onBeforeMount() {}
  async onAfterMount() {}
  async onBeforeDestroy() {}
  async onAfterDestroy() {}

  // ---------------------------------------------
  // Public API
  // ---------------------------------------------
  setModel(model = {}) { this.model = model; return this; }
  setTemplate(tpl)     { this.template = tpl ?? ""; return this; }

  addChild(childView) {
    try {
      if (!childView || typeof childView !== "object") return this;
      childView.parent = this;
      this.children[childView.id] = childView;
    } catch (e) { View._warn("addChild error", e); }
    return this;
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

    if (rerender && this.rendered) {
      await this.render();
    }

    return this;
  }

  // ---------------------------------------------
  // Render flow
  // ---------------------------------------------
  async render(allowMount = true) {
    const now = Date.now();

    // Optional render throttling
    if (this.options.renderCooldown > 0 && now - this.lastRenderTime < this.options.renderCooldown) {
      View._warn(`View ${this.id}: Render called too quickly, cooldown active`);
      return this;
    }

    this.isRendering = true;
    this.lastRenderTime = now;

    try {
      if (!this._initialized) {
        this._initialized = true;
        await this.onInit();
      }
      this.events.unbind();
      await this.onBeforeRender();
      // 1) render own HTML (FIX #5: await the async template render)
      const html = await this.renderTemplate();
      this.element.innerHTML = html;

      if (allowMount && !this.isMounted()) {
          await this.mount()
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

  _resolvePlacementPlan() {
    // Determines how/where to insert this.element without throwing
    const byId = (root, id) => {
      try { return root?.querySelector?.(`#${CSS.escape(id)}`) || null; }
      catch { return null; }
    };

    const inBody = (id) => {
      try {
        const cleanId = id.startsWith('#') ? id.substring(1) : id;
        return document.getElementById(cleanId) || byId(document.body, cleanId);
      }
      catch { return null; }
    };

    try {
      const parentEl = this.parent?.element || null;

      if (this.containerId) {
        if (parentEl) {
          const container = byId(parentEl, this.containerId);
          return { mode: "into-container-under-parent", container, parentEl };
        } else {
          const container = inBody(this.containerId);
          return { mode: "into-container-body", container };
        }
      } else {
        const placeholder = this.parent
          ? byId(this.parent.element, this.id)
          : inBody(this.id);

        if (placeholder) {
          return { mode: "replace-placeholder", placeholder, parentEl: placeholder.parentNode };
        }

        if (parentEl) {
          return { mode: "append-to-parent", parentEl };
        }

        return { mode: "append-to-body" };
      }
    } catch (e) {
      View._warn("_resolvePlacementPlan error", e);
      return { mode: "append-to-body" };
    }
  }

  _applyPlacement(plan) {
    try {
      switch (plan.mode) {
        case "into-container-under-parent":
        case "into-container-body": {
          const container = plan.container;
          if (!container) {
            View._warn(`Container #${this.containerId} not found for ${this.id}`);
            if (this.parent?.element) {
              this.parent.element.appendChild(this.element);
            } else {
              document.body.appendChild(this.element);
            }
            return;
          }
          if (!this.element.isConnected || this.element.parentNode !== container) {
            container.replaceChildren(this.element);
          }
          return;
        }

        case "replace-placeholder": {
          const ph = plan.placeholder;
          const parent = ph?.parentNode;
          if (!parent) {
            View._warn(`Placeholder for ${this.id} has no parent, appending to body`);
            document.body.appendChild(this.element);
            return;
          }
          if (this.element !== ph) {
            parent.replaceChild(this.element, ph);
          }
          return;
        }

        case "append-to-parent": {
          if (plan.parentEl) {
            if (!this.element.isConnected || this.element.parentNode !== plan.parentEl) {
              plan.parentEl.appendChild(this.element);
            }
            return;
          }
          document.body.appendChild(this.element);
          return;
        }

        case "append-to-body":
        default:
          if (!this.element.isConnected || this.element.parentNode !== document.body) {
            document.body.appendChild(this.element);
          }
          return;
      }
    } catch (e) {
      View._warn("_applyPlacement error", e);
      try { document.body.appendChild(this.element); } catch (_) {}
    }
  }

  isMounted() {
    return this.element?.isConnected;
  }

  async mount(container =  null) {
      // 2) place into DOM according to the rules
      await this.onBeforeMount();
      if (container == null) {
          const plan = this._resolvePlacementPlan();
          this._applyPlacement(plan);
      } else {
          if (!this.element.isConnected || this.element.parentNode !== container) {
              container.appendChild(this.element);
          }
      }
      await this.onAfterMount();
      this.mounted = true;
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

  getPartials() { return {}; }

  async getTemplate() {
    if (this._templateCache && this.options.cacheTemplate) {
      return this._templateCache;
    }

    if (!this.template) {
      throw new Error('Template not found');
    }

    let templateContent = '';

    if (typeof this.template === 'string') {
      if (this.template.includes('<') || this.template.includes('{')) {
        templateContent = this.template;
      } else {
        try {
          let templatePath = this.template;

          if (window.APP && window.APP.basePath) {
            if (!templatePath.startsWith('/') &&
                !templatePath.startsWith('http://') &&
                !templatePath.startsWith('https://')) {
              const base = window.APP.basePath.endsWith('/')
                ? window.APP.basePath.slice(0, -1)
                : window.APP.basePath;
              templatePath = `${base}/${templatePath}`;
            }
          }

          const response = await fetch(templatePath);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          templateContent = await response.text();
        } catch (error) {
          View._warn(`Failed to load template from ${this.template}: ${error}`);
          // NOTE: showError may be provided by host app
          this.showError?.(`Failed to load template from ${this.template}: ${error.message}`);
        }
      }
    } else if (typeof this.template === 'function') {
      templateContent = await this.template(this.data, this.state);
    }

    if (this.options.cacheTemplate && templateContent) {
      this._templateCache = templateContent;
    }

    return templateContent;
  }

  get(path) {
    const value = MOJOUtils.getContextData(this, path);

    if (path && path.startsWith('data.') && value && typeof value === 'object') {
      return MOJOUtils.wrapData(value, this);
    }

    if (path && path.startsWith('model.') &&
        path !== 'model' &&
        value && typeof value === 'object' &&
        typeof value.get !== 'function') {
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
    const routers = [
      window.MOJO?.router,
      window.APP?.router,
      window.app?.router,
      window.navigationApp?.router,
      window.sidebarApp?.router
    ];
    return routers.find(r => r && typeof r.navigate === 'function') || null;
  }

  getApp() {
    const apps = [
      window.APP,
      window.app,
      window.WebApp,
      window.MOJO?.app,
    ];
    return apps.find(app => app && typeof app.showPage === 'function') || null;
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


  /**
   * Show error message
   * @param {string} message - Error message
   */
  async showError(message) {
    console.error(`View ${this.id} error:`, message);

    // Use Dialog component for better UX
    try {
      const Dialog = await import('../components/Dialog.js').then(m => m.default);
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
      const Dialog = await import('../components/Dialog.js').then(m => m.default);
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
      const Dialog = await import('../components/Dialog.js').then(m => m.default);
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
      const Dialog = await import('../components/Dialog.js').then(m => m.default);
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
