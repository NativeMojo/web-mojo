# MOJO Framework Event Architecture

## Overview

The MOJO framework has been completely refactored to use a modern, consistent event-driven architecture. This overhaul replaces all legacy event systems with a unified approach using local EventEmitter instances and a global EventBus for cross-cutting concerns.

## Architecture

### Two-Tier Event System

The framework now uses a hybrid approach with two complementary event systems:

#### 1. Local Events (EventEmitter Mixin)
- **Purpose**: Instance-level events for component lifecycle and data changes
- **Scope**: Individual Models, Collections, Views, and Pages
- **API**: `emit()`, `on()`, `off()`, `once()`
- **Use Cases**: Model data changes, view lifecycle, collection updates

#### 2. Global Events (EventBus)
- **Purpose**: Application-wide events for cross-cutting concerns
- **Scope**: Available at `app.events` throughout the application
- **API**: Same as local events, plus debugging and advanced features
- **Use Cases**: Navigation, notifications, loading states, analytics

## Key Benefits

✅ **Unified API**: Same event methods (`emit`, `on`, `off`, `once`) everywhere  
✅ **Loose Coupling**: Components can communicate without direct dependencies  
✅ **Extensibility**: New features can hook into existing event flows  
✅ **Observability**: Complete application lifecycle is observable  
✅ **Performance**: Lightweight implementation with error isolation  
✅ **Developer Experience**: Debug utilities and comprehensive documentation

## Usage Guide

### Local Events (Instance-Level)

```javascript
// Model events
const user = new User({ name: 'John' });
user.on('change', (model) => {
  console.log('User data changed');
  view.render();
});
user.set('name', 'Jane'); // Triggers 'change' event

// Collection events  
const users = new UserCollection();
users.on('add', ({ models }) => {
  console.log(`Added ${models.length} users`);
});

// View lifecycle events
const view = new MyView();
view.on('render', () => {
  initializeWidgets();
});
view.on('destroy', () => {
  cleanup();
});
```

### Global Events (Application-Wide)

```javascript
// Subscribe to navigation events
app.events.on('route:change', ({ path, page }) => {
  analytics.trackPageView(path, page.pageName);
  updateBreadcrumbs(page);
});

// Subscribe to notifications
app.events.on('notification', ({ message, type }) => {
  showToast(message, type);
});

// Subscribe to loading states
app.events.on('loading:show', ({ message }) => {
  showSpinner(message);
});

app.events.on('loading:hide', () => {
  hideSpinner();
});

// Framework methods automatically emit events
app.showError('Something went wrong'); // Emits 'notification' event
app.showLoading('Please wait...'); // Emits 'loading:show' event
```

## Standard Events Reference

### Global Events (app.events)

| Event | When Emitted | Payload |
|-------|-------------|---------|
| `route:before` | Before navigation starts | `{ path, match, page }` |
| `route:change` | After successful navigation | `{ path, match, page, params, query }` |
| `route:after` | After navigation completes | `{ path, match, page }` |
| `route:notfound` | Route not found (404) | `{ path }` |
| `route:error` | Routing error | `{ message }` |
| `page:show` | Page is displayed | `{ page, params, query }` |
| `page:hide` | Page is hidden | `{ page }` |
| `notification` | User notification | `{ message, type, duration }` |
| `loading:show` | Show loading indicator | `{ message }` |
| `loading:hide` | Hide loading indicator | `undefined` |
| `app:ready` | Application started | `{ app }` |
| `state:changed` | App state changed | `{ key, value, oldValue }` |

### Local Events (Instance-Level)

| Event | Scope | When Emitted | Payload |
|-------|-------|-------------|---------|
| `change` | Models | Data changes | `model` |
| `change:field` | Models | Specific field changes | `newValue, model` |
| `add` | Collections | Models added | `{ models, collection }` |
| `remove` | Collections | Models removed | `{ models, collection }` |
| `reset` | Collections | Collection reset | `{ collection, previousModels }` |
| `render` | Views/Pages | After rendering | `view` |
| `mount` | Views/Pages | After mounting to DOM | `view` |
| `unmount` | Views/Pages | After unmounting | `view` |
| `destroy` | Views/Pages | Before destruction | `view` |

## Debug and Development Tools

### Enable Debug Mode

```javascript
// Log all global events
app.events.debug(true);

// Get comprehensive debug info
app.events.debugInfo();
```

### Event Statistics

```javascript
// Get overall statistics
const stats = app.events.getStats();
console.log(stats.totalListeners, stats.emissions);

// Get top events by frequency
const topEvents = app.events.getTopEvents(5);

// Get stats for specific event
const routeStats = app.events.getEventStats('route:change');
```

### Wildcard Listeners

```javascript
// Listen to ALL events (useful for logging)
app.events.on('*', (data, eventName) => {
  console.log(`[EVENT] ${eventName}:`, data);
});
```

## Integration Patterns

### Analytics Service

```javascript
class AnalyticsService {
  constructor(eventBus) {
    eventBus.on('route:change', (data) => {
      this.trackPageView(data.path, data.page.pageName);
    });
    
    eventBus.on('route:notfound', (data) => {
      this.trackError('404', data.path);
    });
  }
}
```

### Notification System

```javascript
class NotificationUI {
  constructor(eventBus) {
    eventBus.on('notification', (data) => {
      this.showToast(data.message, data.type, data.duration);
    });
  }
}
```

### Global Logger

```javascript
class Logger {
  constructor(eventBus) {
    eventBus.on('*', (data, eventName) => {
      this.log(eventName, data);
    });
  }
}
```

## Migration from Legacy Code

### Before (Legacy)

```javascript
// Old trigger-based system
model.trigger('change', model);
collection.trigger('add', models);
view.trigger('render');

// Direct method calls
this.showNotification('Error occurred', 'error');
```

### After (New Event System)

```javascript
// Unified emit-based system
model.emit('change', model);
collection.emit('add', { models, collection });
view.emit('render', view);

// Event-driven notifications
app.events.emit('notification', { message: 'Error occurred', type: 'error' });
// OR use convenience methods that emit events
app.showError('Error occurred');
```

## Testing

The event architecture is thoroughly tested with comprehensive test suites:

- **Phase 1**: Local EventEmitter functionality
- **Phase 2**: Router event integration  
- **Phase 3**: Complete system validation with 50+ test cases

Run tests:
```bash
node test/event-test.js           # Basic event functionality
node test/router-event-test.js    # Router integration
node test/integration-test.js     # Full integration demo
node test/phase3-final-test.js    # Comprehensive validation
```

## Performance

- **Lightweight**: Minimal overhead per event emission
- **Error Isolation**: One failing listener doesn't break others
- **Memory Safe**: Automatic cleanup and max listener warnings
- **Fast**: 1000+ events can be processed in milliseconds

## Best Practices

### ✅ Do

- Use local events for component-specific logic
- Use global events for cross-cutting concerns
- Use event constants from `StandardEvents.js`
- Clean up listeners in component destroy methods
- Use meaningful event names and consistent payload structures

### ❌ Don't

- Mix old `trigger()` calls with new `emit()` calls
- Create circular event dependencies
- Emit too many events in tight loops without throttling
- Forget to handle errors in event listeners
- Use global events for simple parent-child communication

## Advanced Features

### Namespaces

```javascript
const userEvents = app.events.namespace('user');
userEvents.on('login', handler);
userEvents.emit('login', data); // Emits 'user:login'
```

### Middleware

```javascript
app.events.use((event, data) => {
  console.log('Middleware:', event);
  return data; // Can modify data
});
```

### Promise-Based Waiting

```javascript
const data = await app.events.waitFor('route:change', 5000);
```

## Framework Integration

The event system is seamlessly integrated throughout the framework:

- **Models**: Emit `change` events automatically on data modification
- **Collections**: Emit `add`, `remove`, `update` events on modifications
- **Views/Pages**: Emit lifecycle events (`render`, `mount`, `destroy`)
- **Router**: Emits navigation events (`route:change`, `page:show`, etc.)
- **WebApp**: Emits application events (`app:ready`, `notification`, etc.)

## Support

The MOJO event architecture is production-ready and fully tested. All legacy event patterns have been removed and replaced with the unified system described in this document.

For questions or issues, refer to the comprehensive test suites which serve as both validation and usage examples.