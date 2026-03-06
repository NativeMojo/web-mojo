# ToastService

**ToastService** provides Bootstrap 5 toast notifications for WEB-MOJO applications. It manages the full lifecycle of toast elements — creation, display, auto-dismiss, stacking limits, and cleanup — so you never have to touch the DOM directly.

In [PortalApp](../core/PortalApp.md), a pre-configured instance is available at `app.toast`. For other setups, you can create your own instance.

---

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Constructor Options](#constructor-options)
- [Toast Types](#toast-types)
- [Showing a Toast](#showing-a-toast)
- [View Toasts](#view-toasts)
- [Position Options](#position-options)
- [Managing Toasts](#managing-toasts)
- [API Reference](#api-reference)
- [Common Patterns](#common-patterns)
- [Common Pitfalls](#common-pitfalls)
- [Related Documentation](#related-documentation)

---

## Overview

`ToastService` wraps Bootstrap 5's `Toast` component with:

- **Typed convenience methods** — `success()`, `error()`, `info()`, `warning()`, `plain()`
- **Auto-dismiss** — configurable delay per toast, disabled for error toasts by default
- **Stacking limit** — oldest toast is removed when the max is reached
- **View support** — embed a MOJO View component inside a toast via `showView()`
- **Progress integration** — `updateProgress()` callback for file upload / long-running task toasts
- **Proper cleanup** — Bootstrap toast instances and DOM elements are disposed on hide

---

## Quick Start

### Via PortalApp (recommended)

```js
// In any page or view with access to the app
const app = this.getApp();

app.toast.success('Record saved successfully!');
app.toast.error('Something went wrong.');
app.toast.info('A new version is available.');
app.toast.warning('Your session expires in 5 minutes.');
```

### Standalone

```js
import ToastService from 'web-mojo/services/ToastService';

const toast = new ToastService({
  position: 'bottom-end',
  defaultDelay: 4000
});

toast.success('Hello from ToastService!');
```

---

## Constructor Options

| Option | Type | Default | Description |
|---|---|---|---|
| `containerId` | `string` | `'toast-container'` | ID of the container element (created automatically if missing) |
| `position` | `string` | `'top-end'` | Toast stack position (see [Position Options](#position-options)) |
| `autohide` | `boolean` | `true` | Whether toasts auto-dismiss after `defaultDelay` ms |
| `defaultDelay` | `number` | `5000` | Auto-dismiss delay in milliseconds |
| `maxToasts` | `number` | `5` | Maximum number of toasts visible at once; oldest is removed when exceeded |

```js
const toast = new ToastService({
  position:     'bottom-end',
  autohide:     true,
  defaultDelay: 6000,
  maxToasts:    3
});
```

---

## Toast Types

| Method | Icon | Default Title |
|---|---|---|
| `success(message, options)` | `bi-check-circle-fill` | Success |
| `error(message, options)` | `bi-exclamation-triangle-fill` | Error |
| `info(message, options)` | `bi-info-circle-fill` | Information |
| `warning(message, options)` | `bi-exclamation-triangle-fill` | Warning |
| `plain(message, options)` | *(none)* | *(none)* |

All types call the underlying `show()` method with the appropriate defaults pre-filled.

> **Note:** `error()` toasts use `autohide: true` with the global `defaultDelay`, so they auto-dismiss just like other types. Override this per-call via the options argument if you want error toasts to stay until manually dismissed.

---

## Showing a Toast

### `show(message, type, options)`

The core method all typed helpers delegate to:

```js
toast.show('Upload complete', 'success', {
  title:       'File Upload',
  delay:       8000,
  dismissible: true
});
```

### Per-Toast Options

All typed methods (`success`, `error`, etc.) accept an optional second argument with these keys:

| Option | Type | Default | Description |
|---|---|---|---|
| `title` | `string` | Type default | Header title text |
| `icon` | `string` | Type default | Bootstrap Icons class for the header icon |
| `autohide` | `boolean` | `service.options.autohide` | Override auto-dismiss for this toast |
| `delay` | `number` | `service.options.defaultDelay` | Override auto-dismiss delay (ms) for this toast |
| `dismissible` | `boolean` | `true` | Show the close (×) button |
| `showTime` | `boolean` | `false` | Show the current time in the header |

### Return Value

Every show call returns a **toast handle**:

```js
const handle = toast.info('Loading data...');

// Later — hide it programmatically
handle.hide();

// Or dispose immediately (remove from DOM without animation)
handle.dispose();
```

---

## View Toasts

You can render a full MOJO [View](../core/View.md) component inside a toast using `showView()`. This is useful for rich progress indicators, interactive toasts, or complex notification layouts.

### `showView(view, type, options)`

```js
import ProgressView from './ProgressView.js';

const progressView = new ProgressView({ label: 'Uploading...' });

const handle = toast.showView(progressView, 'info', {
  title: 'File Upload',
  autohide: false   // Keep it visible until upload finishes
});

// Update progress from outside
handle.updateProgress({ percent: 42, label: 'Uploading part 2…' });

// Dismiss when done
handle.hide();
```

The view's `render()` is called automatically when the toast element is ready. The view's `dispose()` method is called automatically when the toast hides.

### `ProgressView` Contract

If your view has an `updateProgress(info)` method, the toast handle's `updateProgress()` will call it:

```js
class ProgressView extends View {
  template = `
    <div class="p-2">
      <div class="mb-1">{{label}}</div>
      <div class="progress">
        <div class="progress-bar" style="width: {{percent}}%"></div>
      </div>
    </div>
  `;

  updateProgress({ percent, label }) {
    this.percent = percent;
    this.label   = label;
    this.render();
  }
}
```

---

## Position Options

The `position` option controls where the toast stack appears on screen:

| Value | Position |
|---|---|
| `'top-start'` | Top-left corner |
| `'top-center'` | Top center |
| `'top-end'` | Top-right corner *(default)* |
| `'middle-start'` | Middle-left |
| `'middle-center'` | Center of screen |
| `'middle-end'` | Middle-right |
| `'bottom-start'` | Bottom-left corner |
| `'bottom-center'` | Bottom center |
| `'bottom-end'` | Bottom-right corner |

```js
const toast = new ToastService({ position: 'bottom-end' });
```

### Changing Position at Runtime

```js
toast.setOptions({ position: 'bottom-start' });
// The container's CSS classes are updated immediately
```

---

## Managing Toasts

### Hiding All Toasts

```js
// Hides all active toasts with animation
toast.hideAll();
```

### Clearing All Toasts

```js
// Immediately removes all toasts from the DOM
toast.clearAll();
```

### Getting Statistics

```js
const stats = toast.getStats();
// {
//   total: 3,
//   byType: { success: 1, error: 1, info: 1 }
// }
```

### Disposing the Service

Clean up the entire `ToastService` instance (removes the container from the DOM):

```js
toast.dispose();
```

---

## API Reference

### Constructor

```js
const toast = new ToastService(options);
```

### Typed Show Methods

| Method | Returns | Description |
|---|---|---|
| `success(message, options)` | `handle` | Show a success toast |
| `error(message, options)` | `handle` | Show an error toast |
| `info(message, options)` | `handle` | Show an info toast |
| `warning(message, options)` | `handle` | Show a warning toast |
| `plain(message, options)` | `handle` | Show a plain (unstyled) toast |

### Core Methods

| Method | Returns | Description |
|---|---|---|
| `show(message, type, options)` | `handle` | Show a toast with the specified type |
| `showView(view, type, options)` | `handle` | Show a MOJO View inside a toast |

### Management Methods

| Method | Returns | Description |
|---|---|---|
| `hideAll()` | `void` | Animate-hide all active toasts |
| `clearAll()` | `void` | Immediately remove all toasts from DOM |
| `getStats()` | `object` | `{ total, byType }` — active toast counts |
| `setOptions(newOptions)` | `void` | Update service options at runtime |
| `dispose()` | `void` | Destroy the service and remove its container |

### Internal Methods (for reference)

| Method | Description |
|---|---|
| `init()` | Initialize and create the container |
| `createContainer()` | Create and append the toast container to `document.body` |
| `getPositionClasses()` | Get Bootstrap CSS classes for the configured position |
| `enforceMaxToasts()` | Remove the oldest toast if `maxToasts` is exceeded |
| `cleanup(toastId)` | Dispose and remove a toast by ID |
| `cleanupView(toastId)` | Dispose view + toast by ID |

### Toast Handle

The object returned by all show methods:

| Property / Method | Description |
|---|---|
| `id` | Unique toast ID string |
| `hide()` | Hide the toast with Bootstrap animation |
| `dispose()` | Immediately remove from DOM |
| `updateProgress(info)` | Call `view.updateProgress(info)` (view toasts only) |
| `view` | The View instance (view toasts only) |

---

## Common Patterns

### Wrapping a Long-Running Operation

```js
class ReportPage extends Page {
  async onActionExportReport(event, element) {
    const handle = this.getApp().toast.info('Generating report…', {
      autohide: false
    });

    try {
      await rest.download('/api/reports/export', 'report.csv');
      handle.hide();
      this.getApp().toast.success('Report downloaded!');
    } catch (err) {
      handle.hide();
      this.getApp().toast.error('Export failed: ' + err.message);
    }
  }
}
```

### File Upload with Progress Toast

```js
class UploadView extends View {
  async onActionUpload(event, element) {
    const file     = this.element.querySelector('input[type="file"]').files[0];
    const app      = this.getApp();

    // Create a simple progress view
    const progressView = new UploadProgressView({ filename: file.name, percent: 0 });
    const handle = app.toast.showView(progressView, 'info', {
      autohide: false,
      dismissible: false
    });

    const response = await app.rest.upload('/api/files', file, {
      onProgress: (percent) => {
        handle.updateProgress({ percent });
      }
    });

    handle.hide();

    if (response.success && response.data.status) {
      app.toast.success(`"${file.name}" uploaded successfully.`);
    } else {
      app.toast.error('Upload failed: ' + (response.message || 'Unknown error'));
    }
  }
}
```

### Queuing Notifications from the EventBus

```js
// In your app setup — bridge the global notification event to toasts
const toast = app.toast;

app.events.on('notification', ({ message, type }) => {
  switch (type) {
    case 'success': toast.success(message); break;
    case 'error':   toast.error(message);   break;
    case 'warning': toast.warning(message); break;
    default:        toast.info(message);    break;
  }
});
```

Now any component that calls `app.showNotification('msg', 'success')` will automatically show a toast.

### Custom Toast Without a Header

Use `plain` type and omit the title:

```js
toast.show('Auto-saved', 'plain', {
  title:       '',            // No header
  dismissible: false,
  delay:       2000
});
```

### Persistent Error Toast Until Acknowledged

```js
toast.error('Connection lost. Retrying…', {
  autohide:    false,   // Stay visible until manually dismissed
  dismissible: true
});
```

### Showing a Toast from Inside a View

```js
class SettingsView extends View {
  async onActionSave(event, element) {
    try {
      await this.model.save();
      // Access toast via the app
      this.getApp().toast?.success('Settings saved.');
    } catch (err) {
      this.getApp().toast?.error('Failed to save settings.');
    }
  }
}
```

> **Tip:** Use optional chaining (`?.`) when accessing `app.toast` from views that may run outside a `PortalApp` context.

---

## Common Pitfalls

### ⚠️ Bootstrap not loaded

`ToastService` requires Bootstrap 5 to be available as the global `window.bootstrap` object. It will throw if `bootstrap` is undefined at the time a toast is shown.

```js
// ❌ WRONG — Bootstrap not included in the page
const toast = new ToastService();
toast.success('Hello'); // Error: Bootstrap is required for ToastService

// ✅ CORRECT — ensure Bootstrap 5 is loaded before using ToastService
// In your HTML:
// <script src="https://cdn.jsdelivr.net/npm/bootstrap@5/dist/js/bootstrap.bundle.min.js"></script>
```

### ⚠️ Using showView() without a render-ready view

When you call `showView()`, the service immediately calls `view.render()` into the toast body container. The container must exist in the DOM at that point.

```js
// ❌ WRONG — view not constructed yet
const handle = toast.showView(null, 'info');

// ✅ CORRECT — construct the view first
const myView = new ProgressView({ label: 'Working…' });
const handle = toast.showView(myView, 'info');
```

### ⚠️ Not calling handle.hide() after a persistent toast completes

If you show a toast with `autohide: false`, it stays open forever unless you explicitly call `handle.hide()` or `handle.dispose()`.

```js
// ❌ WRONG — toast stays forever
const handle = toast.info('Processing…', { autohide: false });
await doWork();
// Forgot to hide!

// ✅ CORRECT
const handle = toast.info('Processing…', { autohide: false });
try {
  await doWork();
} finally {
  handle.hide(); // Always clean up
}
```

### ⚠️ Creating multiple ToastService instances with the same containerId

Two instances will both try to manage the same DOM container, causing duplicate toasts and cleanup conflicts.

```js
// ❌ WRONG — both instances share 'toast-container'
const toastA = new ToastService();
const toastB = new ToastService();

// ✅ CORRECT — use different container IDs
const toastA = new ToastService({ containerId: 'main-toasts' });
const toastB = new ToastService({ containerId: 'sidebar-toasts' });

// OR — just use the one on app.toast in PortalApp
app.toast.success('Use the shared instance!');
```

### ⚠️ Calling dispose() on the shared instance

`dispose()` removes the toast container from the DOM. If you call it on `app.toast`, all future toasts will fail.

```js
// ❌ WRONG — destroys the shared PortalApp toast service
app.toast.dispose();

// ✅ CORRECT — only call dispose() on instances you own
const myToast = new ToastService({ containerId: 'my-toasts' });
myToast.dispose(); // OK — you created it
```

---

## Related Documentation

- **[PortalApp](../core/PortalApp.md)** — Provides `app.toast` as a pre-configured `ToastService` instance
- **[WebApp](../core/WebApp.md)** — `showNotification()` emits events that can be wired to `ToastService`
- **[Dialog](../components/Dialog.md)** — For blocking modal dialogs; use `ToastService` for non-blocking notifications
- **[View](../core/View.md)** — Views can be embedded in toasts via `showView()`
