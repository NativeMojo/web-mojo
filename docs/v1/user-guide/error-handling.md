# Error Handling in MOJO Framework

## Overview

MOJO provides built-in error pages for handling routing errors and application failures gracefully. The framework includes two specialized error page components that provide user-friendly error messages and recovery options.

## Error Pages

### NotFoundPage (404 Errors)

The `NotFoundPage` component displays when a user navigates to a route that doesn't exist.

**Features:**
- Animated 404 display
- Shows attempted path
- Search functionality
- Suggested navigation links
- Go back and home buttons
- Automatic route suggestions based on available routes

### ErrorPage (General Errors)

The `ErrorPage` component handles general application errors and routing failures.

**Features:**
- Dynamic error code display
- Error message and details
- Stack trace in debug mode
- Recovery actions
- Support contact information
- Unique error ID for tracking

## Basic Configuration

### Router Configuration

Configure error pages when creating your router:

```javascript
import { Router, NotFoundPage, ErrorPage } from 'mojo';

const router = new Router({
  container: '#app',
  mode: 'history',
  notFoundHandler: NotFoundPage,  // 404 handler
  errorHandler: ErrorPage         // General error handler
});
```

### Custom Error Pages

You can create custom error pages by extending the base error pages:

```javascript
import { NotFoundPage } from 'mojo';

class CustomNotFoundPage extends NotFoundPage {
  constructor(options = {}) {
    super({
      ...options,
      pageName: 'customNotFound',
      title: 'Oops! Lost in Space'
    });
  }

  // Override to add custom suggestions
  generateSuggestions() {
    this.suggestions = [
      { label: 'Dashboard', path: '/dashboard', icon: 'bi-speedometer2' },
      { label: 'Products', path: '/products', icon: 'bi-box' },
      { label: 'Support', path: '/support', icon: 'bi-headset' }
    ];
  }

  // Add custom template sections
  async getTemplate() {
    const baseTemplate = await super.getTemplate();
    // Modify or replace template as needed
    return baseTemplate;
  }
}
```

## Error Handling Patterns

### Programmatic Navigation Errors

Handle navigation failures gracefully:

```javascript
try {
  await router.navigate('/protected-route');
} catch (error) {
  // Router will automatically show ErrorPage
  console.error('Navigation failed:', error);
}
```

### Manual Error Triggering

Trigger error pages manually when needed:

```javascript
// Show 404 page
router.handleNotFound('/requested-path');

// Show error page with details
router.handleError(new Error('Something went wrong'), {
  code: 500,
  details: 'Database connection failed'
});
```

### Custom Error Handling

Implement custom error handling logic:

```javascript
class MyApp {
  constructor() {
    this.router = new Router({
      container: '#app',
      notFoundHandler: this.handleNotFound.bind(this),
      errorHandler: this.handleError.bind(this)
    });
  }

  async handleNotFound(path) {
    // Log to analytics
    this.analytics.track('404_error', { path });
    
    // Show custom 404 page
    const notFoundPage = new NotFoundPage({ path });
    await notFoundPage.render(this.router.container);
  }

  async handleError(error, route) {
    // Log to error tracking service
    this.errorTracker.log(error);
    
    // Show error page with context
    const errorPage = new ErrorPage({
      error: {
        code: error.code || 500,
        message: error.message,
        stack: error.stack,
        details: error.details
      }
    });
    await errorPage.render(this.router.container);
  }
}
```

## Error Page Customization

### Styling

Both error pages support custom styling through CSS:

```css
/* Custom 404 page styling */
.not-found-page {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.not-found-page .container {
  max-width: 600px;
  padding: 3rem;
  background: white;
  border-radius: 1rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

/* Custom error page styling */
.error-page {
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.error-page .error-code {
  animation: pulse 2s infinite;
}
```

### Content Customization

Override methods to customize content:

```javascript
class CustomErrorPage extends ErrorPage {
  // Custom error messages
  getErrorTitle() {
    const titles = {
      '401': 'Please Log In',
      '403': 'Access Denied',
      '500': 'Server Error - We\'re on it!'
    };
    return titles[this.errorCode] || super.getErrorTitle();
  }

  // Custom recovery actions
  async getTemplate() {
    // Add custom recovery options
    return `
      <div class="error-page">
        <!-- Your custom template -->
        <button data-action="contact-support">Contact Support</button>
        <button data-action="view-status">System Status</button>
      </div>
    `;
  }

  // Handle custom actions
  async onActionContactSupport() {
    window.open('/support', '_blank');
  }

  async onActionViewStatus() {
    await this.router.navigate('/system-status');
  }
}
```

## Debug Mode

Enable debug mode to show additional error information:

```javascript
// Enable debug mode globally
const router = new Router({
  container: '#app',
  debug: true,  // Shows stack traces in error pages
  notFoundHandler: NotFoundPage,
  errorHandler: ErrorPage
});

// Or per error page
const errorPage = new ErrorPage({
  error: error,
  debug: true  // Show debug info for this error only
});
```

## Error Recovery Actions

Both error pages provide built-in recovery actions:

### NotFoundPage Actions
- **Search**: Search for pages by name
- **Go Back**: Return to previous page
- **Go Home**: Navigate to homepage
- **Suggested Links**: Quick navigation to common pages

### ErrorPage Actions
- **Refresh**: Reload the current page
- **Go Back**: Return to previous page
- **Clear Cache**: Clear browser cache
- **Contact Support**: Open support contact
- **Report Bug**: Submit bug report

## Integration with Error Tracking

Integrate with error tracking services:

```javascript
class AppErrorHandler {
  constructor(router) {
    // Configure error tracking
    this.setupErrorTracking();
    
    // Override router error handling
    router.errorHandler = this.handleError.bind(this);
    router.notFoundHandler = this.handleNotFound.bind(this);
  }

  setupErrorTracking() {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.logError(event.error, {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.logError(event.reason, {
        type: 'unhandledRejection'
      });
    });
  }

  async logError(error, context = {}) {
    // Send to error tracking service
    await fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        context: context,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      })
    });
  }

  async handleError(error, route) {
    // Log error
    await this.logError(error, { route });
    
    // Show error page
    const errorPage = new ErrorPage({
      error: {
        code: error.code || 500,
        message: error.message,
        stack: error.stack
      }
    });
    await errorPage.render('#app');
  }

  async handleNotFound(path) {
    // Track 404
    await this.logError(new Error('Page not found'), {
      path,
      type: '404'
    });
    
    // Show 404 page
    const notFoundPage = new NotFoundPage({ path });
    await notFoundPage.render('#app');
  }
}
```

## Best Practices

1. **Always Configure Error Handlers**: Set up both 404 and error handlers in your router configuration.

2. **Provide Helpful Error Messages**: Give users clear information about what went wrong and how to proceed.

3. **Include Recovery Options**: Always provide ways for users to recover from errors.

4. **Log Errors**: Track errors for monitoring and debugging purposes.

5. **Test Error Scenarios**: Test your error pages with various error conditions.

6. **Maintain Consistency**: Keep error page design consistent with your application's look and feel.

7. **Consider Offline States**: Handle network errors gracefully.

8. **Provide Support Information**: Include ways for users to get help when errors occur.

## Example: Complete Setup

```javascript
import { 
  Router, 
  NotFoundPage, 
  ErrorPage 
} from 'mojo';

// Create app with error handling
class Application {
  constructor() {
    this.setupRouter();
    this.setupErrorHandling();
  }

  setupRouter() {
    this.router = new Router({
      container: '#app',
      mode: 'history',
      base: '/app',
      notFoundHandler: NotFoundPage,
      errorHandler: ErrorPage,
      debug: process.env.NODE_ENV === 'development'
    });

    // Add navigation guards
    this.router.addGuard('beforeEach', async (to, from, next) => {
      try {
        // Check authentication, permissions, etc.
        await this.checkAccess(to);
        next();
      } catch (error) {
        // Router will handle the error
        next(error);
      }
    });
  }

  setupErrorHandling() {
    // Global error boundary
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
      this.router.handleError(event.error);
      event.preventDefault();
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled rejection:', event.reason);
      this.router.handleError(new Error(event.reason));
      event.preventDefault();
    });
  }

  async checkAccess(route) {
    if (route.meta?.requiresAuth && !this.isAuthenticated()) {
      throw new Error('Authentication required');
    }
  }

  isAuthenticated() {
    return !!localStorage.getItem('authToken');
  }
}

// Initialize application
const app = new Application();
app.router.start();
```

## Troubleshooting

### Error Page Not Showing

If error pages aren't displaying:

1. Verify router configuration includes error handlers
2. Check that the container element exists
3. Ensure error pages are imported correctly
4. Check browser console for JavaScript errors

### Custom Actions Not Working

If custom actions aren't triggering:

1. Verify action methods use correct naming convention (`onActionName`)
2. Check that `data-action` attributes are correct
3. Ensure event listeners are properly attached
4. Check for JavaScript errors in action handlers

### Debug Information Not Showing

If debug information isn't visible:

1. Verify debug mode is enabled
2. Check that error has stack trace available
3. Ensure browser console shows any errors
4. Verify error object structure is correct

## Summary

MOJO's error handling system provides a robust foundation for managing application errors gracefully. By using the built-in `NotFoundPage` and `ErrorPage` components, you can ensure users always have a helpful experience, even when things go wrong. Customize these pages to match your application's design and provide appropriate recovery options for your specific use cases.