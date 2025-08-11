/**
 * NotFoundPage - 404 Error Page for MOJO Framework
 * A user-friendly 404 page with navigation options
 */

import Page from '../core/Page.js';

export default class NotFoundPage extends Page {
  constructor(options = {}) {
    super({
      ...options,
      pageName: 'notFound',
      title: '404 - Page Not Found',
      className: 'not-found-page d-flex align-items-center min-vh-100'
    });
    
    // Store the attempted path
    this.attemptedPath = options.path || window.location.pathname;
    this.suggestions = [];
  }

  /**
   * Initialize the page
   */
  onInit() {
    super.onInit();
    this.generateSuggestions();
  }

  /**
   * Generate suggestions based on available routes
   */
  generateSuggestions() {
    // Get common pages that might exist
    this.suggestions = [
      { label: 'Home', path: '/', icon: 'bi-house-door' },
      { label: 'Dashboard', path: '/dashboard', icon: 'bi-speedometer2' },
      { label: 'Users', path: '/users', icon: 'bi-people' },
      { label: 'Settings', path: '/settings', icon: 'bi-gear' }
    ];

    // If we have access to the router, get actual routes
    if (window.MOJO?.router?.routes) {
      const routes = Array.from(window.MOJO.router.routes.keys())
        .filter(route => route && !route.startsWith('@') && route !== '/')
        .slice(0, 4)
        .map(route => ({
          label: this.routeToLabel(route),
          path: route,
          icon: this.getIconForRoute(route)
        }));
      
      if (routes.length > 0) {
        this.suggestions = routes;
      }
    }
  }

  /**
   * Convert route path to readable label
   */
  routeToLabel(route) {
    return route
      .replace(/^\//, '')
      .replace(/-/g, ' ')
      .replace(/\//g, ' → ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Get appropriate icon for route
   */
  getIconForRoute(route) {
    const iconMap = {
      'home': 'bi-house-door',
      'dashboard': 'bi-speedometer2',
      'users': 'bi-people',
      'user': 'bi-person',
      'products': 'bi-box',
      'settings': 'bi-gear',
      'profile': 'bi-person-circle',
      'admin': 'bi-shield-lock',
      'reports': 'bi-graph-up',
      'messages': 'bi-envelope',
      'notifications': 'bi-bell',
      'help': 'bi-question-circle',
      'search': 'bi-search',
      'tables': 'bi-table',
      'forms': 'bi-input-cursor-text',
      'components': 'bi-puzzle'
    };

    const routeLower = route.toLowerCase();
    for (const [key, icon] of Object.entries(iconMap)) {
      if (routeLower.includes(key)) {
        return icon;
      }
    }
    return 'bi-link-45deg';
  }

  /**
   * Get the template for the page
   */
  async getTemplate() {
    return `
      <div class="container">
        <div class="row justify-content-center">
          <div class="col-md-8 col-lg-6">
            <div class="text-center">
              <!-- 404 Animation -->
              <div class="error-code mb-4">
                <h1 class="display-1 fw-bold text-primary animate-404">
                  4<span class="text-danger">0</span>4
                </h1>
                <div class="error-icon">
                  <i class="bi bi-emoji-frown text-muted" style="font-size: 4rem;"></i>
                </div>
              </div>

              <!-- Error Message -->
              <div class="error-message mb-4">
                <h2 class="h3 mb-3">Oops! Page Not Found</h2>
                <p class="text-muted mb-4">
                  The page you're looking for doesn't exist or has been moved.
                </p>
                <div class="alert alert-light border">
                  <small class="text-muted">
                    <i class="bi bi-geo-alt me-1"></i>
                    Attempted path: <code>{{attemptedPath}}</code>
                  </small>
                </div>
              </div>

              <!-- Search Box -->
              <div class="search-section mb-5">
                <div class="input-group">
                  <input type="text" 
                         class="form-control form-control-lg" 
                         placeholder="Search for a page..."
                         data-action="search-input"
                         id="searchInput">
                  <button class="btn btn-primary btn-lg" 
                          type="button"
                          data-action="search">
                    <i class="bi bi-search"></i>
                  </button>
                </div>
              </div>

              <!-- Suggestions -->
              <div class="suggestions mb-4">
                <h5 class="text-muted mb-3">Here are some helpful links:</h5>
                <div class="d-grid gap-2 d-sm-block">
                  {{#suggestions}}
                  <a href="{{path}}" 
                     class="btn btn-outline-primary m-1">
                    <i class="{{icon}} me-2"></i>{{label}}
                  </a>
                  {{/suggestions}}
                </div>
              </div>

              <!-- Additional Actions -->
              <div class="additional-actions pt-4 border-top">
                <div class="row g-3">
                  <div class="col-sm-6">
                    <button class="btn btn-light w-100" 
                            data-action="go-back">
                      <i class="bi bi-arrow-left me-2"></i>
                      Go Back
                    </button>
                  </div>
                  <div class="col-sm-6">
                    <a href="/" class="btn btn-primary w-100">
                      <i class="bi bi-house-door me-2"></i>
                      Go Home
                    </a>
                  </div>
                </div>
              </div>

              <!-- Help Text -->
              <div class="help-text mt-5">
                <p class="text-muted small">
                  <i class="bi bi-info-circle me-1"></i>
                  If you believe this is an error, please contact support or try refreshing the page.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>
        .not-found-page {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          background-attachment: fixed;
        }

        .not-found-page .container {
          background: white;
          border-radius: 1rem;
          padding: 3rem 2rem;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .animate-404 {
          animation: pulse 2s infinite;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
        }

        @keyframes pulse {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
          100% {
            transform: scale(1);
          }
        }

        .error-icon {
          animation: shake 2s infinite;
        }

        @keyframes shake {
          0%, 100% {
            transform: translateX(0);
          }
          10%, 30%, 50%, 70%, 90% {
            transform: translateX(-5px);
          }
          20%, 40%, 60%, 80% {
            transform: translateX(5px);
          }
        }

        .suggestions .btn {
          transition: all 0.3s ease;
        }

        .suggestions .btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .search-section .form-control:focus {
          box-shadow: 0 0 0 0.25rem rgba(102, 126, 234, 0.25);
          border-color: #667eea;
        }

        .not-found-page code {
          background: #f8f9fa;
          padding: 0.2rem 0.4rem;
          border-radius: 0.25rem;
          color: #d63384;
        }
      </style>
    `;
  }

  /**
   * Get view data for template
   */
  async getViewData() {
    const baseData = await super.getViewData();
    return {
      ...baseData,
      attemptedPath: this.attemptedPath,
      suggestions: this.suggestions
    };
  }

  /**
   * After render setup
   */
  async onAfterRender() {
    await super.onAfterRender();
    
    // Focus search input
    const searchInput = this.element.querySelector('#searchInput');
    if (searchInput) {
      searchInput.focus();
    }
  }

  /**
   * Handle go back action
   */
  async onActionGoBack() {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      this.navigate('/');
    }
  }

  /**
   * Handle search action
   */
  async onActionSearch() {
    const searchInput = this.element.querySelector('#searchInput');
    const query = searchInput?.value?.trim();
    
    if (query) {
      // Try to navigate to the search query as a path
      const searchPath = query.startsWith('/') ? query : `/${query}`;
      this.navigate(searchPath);
    }
  }

  /**
   * Handle search input enter key
   */
  async onActionSearchInput(event) {
    if (event.key === 'Enter') {
      await this.onActionSearch();
    }
  }

  /**
   * Navigate helper
   */
  navigate(path) {
    if (window.MOJO?.router) {
      window.MOJO.router.navigate(path);
    } else {
      window.location.href = path;
    }
  }
}