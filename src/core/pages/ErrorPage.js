/**
 * ErrorPage - General Error Page for MOJO Framework
 * Displays error information and recovery options
 */

import Page from '@core/Page.js';

export default class ErrorPage extends Page {
  constructor(options = {}) {
    super({
      ...options,
      pageName: 'error',
      title: 'Error - Something Went Wrong',
      className: 'error-page d-flex align-items-center min-vh-100'
    });
    
    // Store error details
    this.error = options.error || {};
    this.errorCode = this.error.code || '500';
    this.errorMessage = this.error.message || 'An unexpected error occurred';
    this.errorDetails = this.error.details || null;
    this.errorStack = this.error.stack || null;
    this.showDebug = options.debug || (window.MOJO?.config?.debug);
  }

  /**
   * Initialize the page
   */
  onInit() {
    super.onInit();
    this.logError();
  }

  /**
   * Log error to console
   */
  logError() {
    console.error(`[ErrorPage] ${this.errorCode}: ${this.errorMessage}`);
    if (this.errorStack) {
      console.error('Stack trace:', this.errorStack);
    }
    if (this.errorDetails) {
      console.error('Error details:', this.errorDetails);
    }
  }

  /**
   * Get error icon based on error code
   */
  getErrorIcon() {
    const iconMap = {
      '400': 'bi-exclamation-triangle',
      '401': 'bi-lock',
      '403': 'bi-shield-x',
      '404': 'bi-search',
      '500': 'bi-x-octagon',
      '502': 'bi-cloud-slash',
      '503': 'bi-clock-history'
    };
    return iconMap[this.errorCode] || 'bi-exclamation-circle';
  }

  /**
   * Get error title based on error code
   */
  getErrorTitle() {
    const titleMap = {
      '400': 'Bad Request',
      '401': 'Unauthorized',
      '403': 'Access Forbidden',
      '404': 'Not Found',
      '500': 'Internal Server Error',
      '502': 'Bad Gateway',
      '503': 'Service Unavailable'
    };
    return titleMap[this.errorCode] || 'Error';
  }

  /**
   * Get error color based on severity
   */
  getErrorColor() {
    const code = parseInt(this.errorCode);
    if (code >= 500) return 'danger';
    if (code >= 400) return 'warning';
    return 'info';
  }

  /**
   * Get the template for the page
   */
  async getTemplate() {
    const errorColor = this.getErrorColor();
    const errorIcon = this.getErrorIcon();
    const errorTitle = this.getErrorTitle();

    return `
      <div class="container">
        <div class="row justify-content-center">
          <div class="col-md-8 col-lg-6">
            <div class="text-center">
              <!-- Error Animation -->
              <div class="error-code mb-4">
                <h1 class="display-1 fw-bold text-${errorColor} animate-error">
                  {{errorCode}}
                </h1>
                <div class="error-icon">
                  <i class="${errorIcon} text-${errorColor}" style="font-size: 4rem;"></i>
                </div>
              </div>

              <!-- Error Message -->
              <div class="error-message mb-4">
                <h2 class="h3 mb-3">${errorTitle}</h2>
                <p class="text-muted mb-4">
                  {{errorMessage}}
                </p>
                
                {{#errorDetails}}
                <div class="alert alert-light border text-start">
                  <h6 class="alert-heading">
                    <i class="bi bi-info-circle me-1"></i>
                    Details
                  </h6>
                  <p class="mb-0 small">{{errorDetails}}</p>
                </div>
                {{/errorDetails}}
              </div>

              <!-- Debug Information (Development Only) -->
              {{#showDebug}}
              {{#errorStack}}
              <div class="debug-section mb-4">
                <details class="text-start">
                  <summary class="btn btn-sm btn-outline-secondary mb-2">
                    <i class="bi bi-bug me-1"></i>
                    Show Debug Information
                  </summary>
                  <div class="card">
                    <div class="card-body">
                      <h6 class="card-title">Stack Trace</h6>
                      <pre class="small text-muted" style="max-height: 300px; overflow-y: auto;">{{errorStack}}</pre>
                    </div>
                  </div>
                </details>
              </div>
              {{/errorStack}}
              {{/showDebug}}

              <!-- Recovery Actions -->
              <div class="recovery-actions mb-4">
                <h5 class="text-muted mb-3">What can you do?</h5>
                <div class="list-group text-start mb-4">
                  <a href="javascript:void(0)" 
                     class="list-group-item list-group-item-action"
                     data-action="reload">
                    <i class="bi bi-arrow-clockwise me-2 text-primary"></i>
                    <strong>Refresh the page</strong>
                    <small class="d-block text-muted">Try reloading to see if the issue resolves</small>
                  </a>
                  <a href="javascript:void(0)" 
                     class="list-group-item list-group-item-action"
                     data-action="go-back">
                    <i class="bi bi-arrow-left me-2 text-primary"></i>
                    <strong>Go back</strong>
                    <small class="d-block text-muted">Return to the previous page</small>
                  </a>
                  <a href="/" 
                     class="list-group-item list-group-item-action">
                    <i class="bi bi-house-door me-2 text-primary"></i>
                    <strong>Go to homepage</strong>
                    <small class="d-block text-muted">Start fresh from the home page</small>
                  </a>
                  <a href="javascript:void(0)" 
                     class="list-group-item list-group-item-action"
                     data-action="clear-cache">
                    <i class="bi bi-trash me-2 text-primary"></i>
                    <strong>Clear cache</strong>
                    <small class="d-block text-muted">Clear browser cache and try again</small>
                  </a>
                </div>
              </div>

              <!-- Quick Navigation -->
              <div class="quick-nav pt-4 border-top">
                <p class="text-muted mb-3">Quick Navigation</p>
                <div class="btn-group" role="group">
                  <a href="/" class="btn btn-outline-primary">
                    <i class="bi bi-house-door"></i>
                    Home
                  </a>
                  <a href="/dashboard" class="btn btn-outline-primary">
                    <i class="bi bi-speedometer2"></i>
                    Dashboard
                  </a>
                  <a href="/help" class="btn btn-outline-primary">
                    <i class="bi bi-question-circle"></i>
                    Help
                  </a>
                </div>
              </div>

              <!-- Support Information -->
              <div class="support-info mt-5">
                <div class="card bg-light border-0">
                  <div class="card-body">
                    <h6 class="card-title">
                      <i class="bi bi-headset me-2"></i>
                      Need Help?
                    </h6>
                    <p class="card-text small text-muted mb-2">
                      If this problem persists, please contact our support team.
                    </p>
                    <div class="d-flex gap-2 justify-content-center">
                      <button class="btn btn-sm btn-outline-primary" data-action="contact-support">
                        <i class="bi bi-envelope me-1"></i>
                        Contact Support
                      </button>
                      <button class="btn btn-sm btn-outline-secondary" data-action="report-bug">
                        <i class="bi bi-bug me-1"></i>
                        Report Bug
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Error ID for Support -->
              <div class="error-id mt-4">
                <p class="text-muted small mb-0">
                  Error ID: <code>{{errorId}}</code>
                </p>
                <p class="text-muted small">
                  Timestamp: <code>{{timestamp}}</code>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>
        .error-page {
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          background-attachment: fixed;
        }

        .error-page .container {
          background: white;
          border-radius: 1rem;
          padding: 3rem 2rem;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
        }

        .animate-error {
          animation: errorPulse 3s infinite;
        }

        @keyframes errorPulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(0.98);
          }
        }

        .error-icon {
          animation: errorShake 5s infinite;
        }

        @keyframes errorShake {
          0%, 100% {
            transform: rotate(0deg);
          }
          25% {
            transform: rotate(-5deg);
          }
          75% {
            transform: rotate(5deg);
          }
        }

        .list-group-item {
          transition: all 0.3s ease;
          border: 1px solid #dee2e6;
          margin-bottom: 0.5rem;
          border-radius: 0.5rem !important;
        }

        .list-group-item:hover {
          transform: translateX(5px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .error-page code {
          background: #f8f9fa;
          padding: 0.2rem 0.4rem;
          border-radius: 0.25rem;
          color: #d63384;
          font-size: 0.875rem;
        }

        .error-page pre {
          background: #f8f9fa;
          padding: 1rem;
          border-radius: 0.5rem;
          font-size: 0.75rem;
          line-height: 1.5;
        }

        .debug-section details summary {
          cursor: pointer;
          user-select: none;
        }

        .debug-section details[open] summary {
          margin-bottom: 1rem;
        }

        .support-info .card {
          transition: all 0.3s ease;
        }

        .support-info:hover .card {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
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
      errorCode: this.errorCode,
      errorMessage: this.errorMessage,
      errorDetails: this.errorDetails,
      errorStack: this.errorStack,
      showDebug: this.showDebug,
      errorId: this.generateErrorId(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generate unique error ID for support
   */
  generateErrorId() {
    return 'ERR-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substr(2, 5).toUpperCase();
  }

  /**
   * Handle reload action
   */
  async onActionReload() {
    window.location.reload();
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
   * Handle clear cache action
   */
  async onActionClearCache() {
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        this.showSuccess('Cache cleared successfully. Reloading page...');
        setTimeout(() => window.location.reload(), 1500);
      } catch (error) {
        this.showError('Failed to clear cache: ' + error.message);
      }
    } else {
      this.showInfo('Please clear your browser cache manually through browser settings.');
    }
  }

  /**
   * Handle contact support action
   */
  async onActionContactSupport() {
    const errorId = this.generateErrorId();
    const subject = encodeURIComponent(`Error Report: ${errorId}`);
    const body = encodeURIComponent(`Error Code: ${this.errorCode}\nError Message: ${this.errorMessage}\nError ID: ${errorId}\nTimestamp: ${new Date().toISOString()}\n\nPlease describe what you were doing when this error occurred:\n`);
    window.location.href = `mailto:support@example.com?subject=${subject}&body=${body}`;
  }

  /**
   * Handle report bug action
   */
  async onActionReportBug() {
    // Could open a bug report form or redirect to issue tracker
    this.showInfo('Bug report feature will open your issue tracker.');
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

  /**
   * Show notification helpers
   */
  showSuccess(message) {
    console.log('[Success]', message);
    // Implement toast notification if available
  }

  showError(message) {
    console.error('[Error]', message);
    // Implement toast notification if available
  }

  showInfo(message) {
    console.info('[Info]', message);
    // Implement toast notification if available
  }
}