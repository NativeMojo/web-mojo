/**
 * DeniedPage - Access Denied page for MOJO Framework
 * Displays when a user attempts to access a page without proper permissions
 */

import Page from '@core/Page.js';

class DeniedPage extends Page {
  constructor(options = {}) {
    super({
      pageName: 'Access Denied',
      route: '/denied',
      title: 'Access Denied',
      pageIcon: 'bi bi-shield-x',
      template: `
        <div class="container mt-5">
          <div class="row justify-content-center">
            <div class="col-md-8 col-lg-6">
              <div class="text-center mb-4">
                <i class="bi bi-shield-x text-muted" style="font-size: 3rem;"></i>
                <h2 class="mt-3 mb-2">Access Denied</h2>
                <p class="text-muted">You don't have permission to access this page.</p>
              </div>

              {{#deniedPage}}
              <div class="card border-0 shadow-sm mb-4">
                <div class="card-body">
                  <h6 class="card-subtitle mb-2 text-muted">Requested Page</h6>
                  <h5 class="card-title">
                    <i class="{{pageIcon}} me-2"></i>
                    {{displayName}}
                  </h5>
                  {{#route}}
                  <p class="card-text text-muted small">{{route}}</p>
                  {{/route}}
                  {{#description}}
                  <p class="card-text">{{description}}</p>
                  {{/description}}

                  {{#requiredPermissions}}
                  <div class="mt-3">
                    <h6 class="mb-2">Required Permissions:</h6>
                    {{#permissions}}
                    <span class="badge bg-light text-dark me-1 mb-1">{{.}}</span>
                    {{/permissions}}
                    {{^permissions}}
                    <span class="text-muted small">Authentication required</span>
                    {{/permissions}}
                  </div>
                  {{/requiredPermissions}}
                </div>
              </div>
              {{/deniedPage}}

              <div class="d-grid gap-2 d-md-flex justify-content-md-center">
                <button type="button" class="btn btn-primary" data-action="go-back">
                  <i class="bi bi-arrow-left me-1"></i>
                  Go Back
                </button>
                <button type="button" class="btn btn-outline-secondary" data-action="go-home">
                  <i class="bi bi-house me-1"></i>
                  Home
                </button>
                {{#showLogin}}
                <button type="button" class="btn btn-outline-primary" data-action="login">
                  <i class="bi bi-box-arrow-in-right me-1"></i>
                  Login
                </button>
                {{/showLogin}}
              </div>

              {{#currentUser}}
              <div class="text-center mt-4">
                <small class="text-muted">
                  Logged in as <strong>{{username}}</strong>
                </small>
              </div>
              {{/currentUser}}
            </div>
          </div>
        </div>
      `,
      ...options
    });

    // Store the denied page instance
    this.deniedPage = null;
    this.deniedPageOptions = null;
  }

  /**
   * Handle route parameters - expect denied page info
   */
  async onParams(params = {}, query = {}) {
    await super.onParams(params, query);

    // If page info is passed in params
    if (params.page) {
      this.deniedPage = params.page;
      this.deniedPageOptions = params.page.options || params.page.pageOptions || {};
    } else if (query.page) {
      // Handle page name from query string
      this.deniedPageName = query.page;
    }
  }

  /**
   * Set the denied page instance
   */
  setDeniedPage(pageInstance) {
    this.deniedPage = pageInstance;
    this.deniedPageOptions = pageInstance?.options || pageInstance?.pageOptions || {};
    return this;
  }

  /**
   * Get view data for template rendering
   */
  async getViewData() {
    const app = this.getApp();

    // Get current user info
    const currentUser = app?.activeUser || app?.getCurrentUser?.() || null;

    // Process denied page info
    let deniedPageInfo = null;
    if (this.deniedPage) {
      const permissions = this.deniedPageOptions?.permissions ||
                         this.deniedPage.options?.permissions ||
                         this.deniedPage.pageOptions?.permissions;

      deniedPageInfo = {
        displayName: this.deniedPage.displayName || this.deniedPage.pageName || this.deniedPage.title || 'Unknown Page',
        pageName: this.deniedPage.pageName,
        route: this.deniedPage.route,
        description: this.deniedPage.pageDescription || this.deniedPage.description,
        pageIcon: this.deniedPage.pageIcon || 'bi bi-file-text',
        requiredPermissions: permissions ? {
          permissions: Array.isArray(permissions) ? permissions : [permissions]
        } : null
      };
    } else if (this.deniedPageName) {
      deniedPageInfo = {
        displayName: this.deniedPageName,
        pageName: this.deniedPageName,
        pageIcon: 'bi bi-file-text'
      };
    }

    return {
      deniedPage: deniedPageInfo,
      currentUser: currentUser ? {
        username: currentUser.username || currentUser.name || currentUser.email || 'Unknown User',
        name: currentUser.name,
        email: currentUser.email
      } : null,
      showLogin: !currentUser // Show login button if not authenticated
    };
  }

  /**
   * Handle going back to previous page
   */
  async handleActionGoBack(event, element) {
    event.preventDefault();

    // Try to go back in browser history
    if (window.history.length > 1) {
      window.history.back();
    } else {
      // Fallback to home page
      await this.handleActionGoHome(event, element);
    }
  }

  /**
   * Handle navigation to home page
   */
  async handleActionGoHome(event, element) {
    event.preventDefault();

    const app = this.getApp();
    if (app) {
      await app.navigateToDefault();
    } else {
      // Fallback navigation
      window.location.href = '/';
    }
  }

  /**
   * Handle login action
   */
  async handleActionLogin(event, element) {
    event.preventDefault();

    const app = this.getApp();

    // Try to navigate to login page
    if (app) {
      try {
        await app.showPage('login');
      } catch (error) {
        // If login page doesn't exist, try auth route
        try {
          await app.navigate('/login');
        } catch (navError) {
          // Fallback - emit login required event
          this.emit('login-required', {
            returnUrl: this.deniedPage?.route || window.location.pathname
          });

          // Show message if no handlers
          setTimeout(() => {
            app?.showInfo?.('Please contact your administrator for access.');
          }, 100);
        }
      }
    }
  }

  /**
   * Called when entering this page
   */
  async onEnter() {
    await super.onEnter();

    // Set appropriate page title
    const pageName = this.deniedPage?.pageName || this.deniedPageName;
    if (pageName) {
      this.setMeta({
        title: `Access Denied - ${pageName}`
      });
    }

    // Log access denial for security monitoring
    console.warn('Access denied to page:', {
      page: this.deniedPage?.pageName || this.deniedPageName,
      route: this.deniedPage?.route,
      permissions: this.deniedPageOptions?.permissions,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Static helper to show access denied for a specific page
   */
  static showForPage(app, pageInstance) {
    const deniedPage = new DeniedPage();
    deniedPage.setDeniedPage(pageInstance);
    return app.showPage(deniedPage);
  }
}

export default DeniedPage;
