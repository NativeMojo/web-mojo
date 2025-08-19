/**
 * NotFoundPage - 404 Not Found page for MOJO Framework
 * Displays when a user attempts to access a non-existent page or route
 */

import Page from '../core/Page.js';

class NotFoundPage extends Page {
  constructor(options = {}) {
    super({
      pageName: '404',
      route: '/404',
      title: '404 - Page Not Found',
      pageIcon: 'bi bi-search',
      template: `
        <div class="container mt-5">
          <div class="row justify-content-center">
            <div class="col-md-8 col-lg-6">
              <div class="text-center mb-4">
                <i class="bi bi-search text-muted" style="font-size: 3rem;"></i>
                <h2 class="mt-3 mb-2">Page Not Found</h2>
                <p class="text-muted">The page you're looking for doesn't exist.</p>
              </div>

              {{#path}}
              <div class="card border-0 shadow-sm mb-4">
                <div class="card-body text-center">
                  <h6 class="card-subtitle mb-2 text-muted">Requested Path</h6>
                  <code class="text-primary">{{path}}</code>
                </div>
              </div>
              {{/path}}

              <div class="d-grid gap-2 d-md-flex justify-content-md-center">
                <button type="button" class="btn btn-primary" data-action="go-back">
                  <i class="bi bi-arrow-left me-1"></i>
                  Go Back
                </button>
                <button type="button" class="btn btn-outline-secondary" data-action="go-home">
                  <i class="bi bi-house me-1"></i>
                  Home
                </button>
              </div>
            </div>
          </div>
        </div>
      `,
      ...options
    });
    
    // Store the not found path
    this.path = null;
  }

  /**
   * Handle route parameters
   */
  async onParams(params = {}, query = {}) {
    await super.onParams(params, query);
    
    // Store path from params or query
    if (params.path) {
      this.path = params.path;
    }
    if (query.path) {
      this.path = query.path;
    }
  }

  /**
   * Set not found path
   */
  setInfo(path) {
    this.path = path || null;
    return this;
  }

  /**
   * Get view data for template rendering
   */
  async getViewData() {
    const baseData = await super.getViewData();
    
    return {
      ...baseData,
      path: this.path
    };
  }

  /**
   * Handle going back to previous page
   */
  async handleActionGoBack(event, _element) {
    event.preventDefault();
    
    // Try to go back in browser history
    if (window.history.length > 1) {
      window.history.back();
    } else {
      // Fallback to home page
      await this.handleActionGoHome(event, _element);
    }
  }

  /**
   * Handle navigation to home page
   */
  async handleActionGoHome(event, _element) {
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
   * Called when entering this page
   */
  async onEnter() {
    await super.onEnter();
    
    // Set appropriate page title
    if (this.path) {
      this.setMeta({
        title: `404 - ${this.path} Not Found`
      });
    }
    
    // Log 404 for analytics
    console.warn('404 Not Found:', {
      path: this.path,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Static helper to show 404 for a specific path
   */
  static showForPath(app, path) {
    const notFoundPage = new NotFoundPage();
    notFoundPage.setInfo(path);
    return notFoundPage.render(); // Just render, don't navigate
  }
}

export default NotFoundPage;