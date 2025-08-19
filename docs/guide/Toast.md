# Toast Service Guide

The MOJO Toast Service provides elegant, non-intrusive notifications using Bootstrap 5 toasts. It's integrated into the WebApp as `app.toast` for easy access throughout your application.

## Table of Contents

- [Overview](#overview)
- [Basic Usage](#basic-usage)
- [Toast Methods](#toast-methods)
- [Configuration Options](#configuration-options)
- [Advanced Usage](#advanced-usage)
- [Styling](#styling)
- [Best Practices](#best-practices)
- [Integration Examples](#integration-examples)

## Overview

The Toast Service provides a clean, consistent way to display notifications to users. All toasts feature:

- **Subtle Design**: Clean appearance with colored left borders
- **Auto-dismiss**: Configurable timing with manual dismiss options
- **Responsive**: Works on all screen sizes
- **Accessible**: Proper ARIA attributes and semantic HTML
- **Bootstrap 5**: Full integration with Bootstrap's toast component

## Basic Usage

The toast service is available as `app.toast` throughout your MOJO application:

```javascript
// Basic toast notifications
app.toast.success('Operation completed successfully!');
app.toast.error('Something went wrong');
app.toast.info('Here\'s some useful information');
app.toast.warning('Please be careful with this action');
app.toast.plain('Simple notification without styling');
```

## Toast Methods

### `app.toast.success(message, options)`

Display a success notification with green accent.

```javascript
app.toast.success('User saved successfully!');
app.toast.success('File uploaded', { delay: 3000 });
```

### `app.toast.error(message, options)`

Display an error notification with red accent. Errors don't auto-hide by default.

```javascript
app.toast.error('Failed to save user');
app.toast.error('Network error occurred', { autohide: true, delay: 5000 });
```

### `app.toast.info(message, options)`

Display an informational notification with blue accent.

```javascript
app.toast.info('New version available');
app.toast.info('Sync completed', { showTime: true });
```

### `app.toast.warning(message, options)`

Display a warning notification with yellow accent.

```javascript
app.toast.warning('Unsaved changes will be lost');
app.toast.warning('Storage space running low');
```

### `app.toast.plain(message, options)`

Display a plain notification without colored styling.

```javascript
app.toast.plain('Generic notification');
app.toast.plain('Custom message', { title: 'System' });
```

### `app.toast.show(message, type, options)`

Generic method for displaying any toast type.

```javascript
app.toast.show('Custom message', 'success', {
  title: 'Custom Title',
  icon: 'bi-star-fill'
});
```

## Configuration Options

All toast methods accept an options object to customize behavior:

### Common Options

```javascript
app.toast.success('Message', {
  title: 'Custom Title',           // Header title (optional)
  icon: 'bi-custom-icon',          // Custom Bootstrap icon
  autohide: true,                  // Auto-dismiss (default: true)
  delay: 5000,                     // Delay in ms (default: 5000)
  dismissible: true,               // Show close button (default: true)
  showTime: false                  // Show timestamp (default: false)
});
```

### Global Configuration

Configure default settings when creating the service:

```javascript
const toastService = new ToastService({
  position: 'top-end',             // Toast position
  defaultDelay: 5000,              // Default delay in ms
  maxToasts: 5,                    // Maximum simultaneous toasts
  autohide: true                   // Default auto-hide behavior
});
```

### Position Options

- `top-start` - Top left corner
- `top-center` - Top center
- `top-end` - Top right corner (default)
- `middle-start` - Middle left
- `middle-center` - Center of screen
- `middle-end` - Middle right
- `bottom-start` - Bottom left
- `bottom-center` - Bottom center
- `bottom-end` - Bottom right

## Advanced Usage

### Custom Toast with Actions

```javascript
// Create a custom toast with additional content
const toast = app.toast.show('File processing...', 'info', {
  autohide: false,
  title: 'Upload Progress'
});

// Hide programmatically when done
setTimeout(() => {
  toast.hide();
  app.toast.success('File processed successfully!');
}, 3000);
```

### Toast Management

```javascript
// Hide all active toasts
app.toast.hideAll();

// Clear all toasts immediately
app.toast.clearAll();

// Get statistics
const stats = app.toast.getStats();
console.log(`Active toasts: ${stats.total}`);
```

### Error Handling Integration

```javascript
class MyService {
  async saveData(data) {
    try {
      const response = await api.save(data);
      if (response.success) {
        app.toast.success('Data saved successfully!');
        return response;
      } else {
        app.toast.error(`Save failed: ${response.error}`);
        return null;
      }
    } catch (error) {
      app.toast.error('Network error occurred');
      throw error;
    }
  }
}
```

## Styling

The toast service includes clean, subtle styling with the following features:

### Color Scheme
- **Success**: Green left border (#198754)
- **Error**: Red left border (#dc3545)
- **Warning**: Yellow left border (#ffc107)
- **Info**: Blue left border (#0d6efd)
- **Plain**: Gray border with no accent

### Design Features
- Subtle white/light background
- Colored left border for type identification
- Consistent typography using Bootstrap's body text
- Responsive design for mobile devices
- Dark mode support

### Custom Styling

To customize toast appearance, modify `src/css/toast.css`:

```css
/* Custom success toast styling */
.toast-service-success {
  --bs-toast-bg: rgba(240, 255, 240, 0.98);
  border-left-color: #28a745;
}

/* Custom positioning */
.toast-container {
  max-width: 500px;
}
```

## Best Practices

### 1. Use Appropriate Toast Types

```javascript
// Good: Use specific types for context
app.toast.success('User created successfully');
app.toast.error('Validation failed');
app.toast.warning('Session expiring soon');
app.toast.info('New features available');

// Avoid: Generic messages without context
app.toast.plain('Something happened');
```

### 2. Keep Messages Concise

```javascript
// Good: Clear, actionable messages
app.toast.error('Email already exists');
app.toast.success('Password updated');

// Avoid: Long, verbose messages
app.toast.error('The email address you provided already exists in our system. Please try a different email address or use the forgot password feature.');
```

### 3. Handle Errors Appropriately

```javascript
// Good: Errors stay visible until dismissed
app.toast.error('Payment failed', { autohide: false });

// Good: Success messages auto-dismiss
app.toast.success('Payment processed', { delay: 3000 });
```

### 4. Provide Context When Needed

```javascript
// Good: Include relevant details
app.toast.success(`User "${user.name}" created successfully`);
app.toast.warning(`${remainingSpace}MB storage remaining`);
```

## Integration Examples

### Form Validation

```javascript
class UserForm extends View {
  async handleActionSave(event, element) {
    event.preventDefault();
    
    const formData = this.getFormData();
    const response = await this.model.save(formData);
    
    if (response.success) {
      app.toast.success('User saved successfully!');
      app.navigate('users');
    } else if (response.status === 422) {
      // Show validation errors
      const errors = Object.values(response.errors);
      app.toast.error(`Validation failed: ${errors.join(', ')}`);
    } else {
      app.toast.error('Failed to save user');
    }
  }
}
```

### API Integration

```javascript
class ApiService {
  async request(url, options = {}) {
    try {
      const response = await fetch(url, options);
      const data = await response.json();
      
      if (!response.ok) {
        app.toast.error(`API Error: ${data.message || 'Unknown error'}`);
        throw new Error(data.message);
      }
      
      return data;
    } catch (error) {
      if (error.name === 'TypeError') {
        app.toast.error('Network error - please check your connection');
      }
      throw error;
    }
  }
}
```

### File Upload Progress

```javascript
class FileUploader {
  async uploadFile(file) {
    // Show progress toast
    const progressToast = app.toast.info('Uploading file...', {
      autohide: false,
      title: 'Upload Progress'
    });
    
    try {
      const result = await this.performUpload(file);
      
      // Hide progress and show success
      progressToast.hide();
      app.toast.success(`File "${file.name}" uploaded successfully!`);
      
      return result;
    } catch (error) {
      progressToast.hide();
      app.toast.error(`Upload failed: ${error.message}`);
      throw error;
    }
  }
}
```

### WebApp Integration

```javascript
class MyApp extends WebApp {
  constructor(options = {}) {
    super(options);
    
    // Initialize toast service
    this.toast = new ToastService({
      position: 'top-end',
      maxToasts: 3
    });
  }
  
  // Override notification methods to use toasts
  showSuccess(message) {
    this.toast.success(message);
    super.showSuccess(message); // Still emit events
  }
  
  showError(message) {
    this.toast.error(message);
    super.showError(message);
  }
  
  showInfo(message) {
    this.toast.info(message);
    super.showInfo(message);
  }
  
  showWarning(message) {
    this.toast.warning(message);
    super.showWarning(message);
  }
}
```

### Bulk Operations

```javascript
class BulkProcessor {
  async processItems(items) {
    let successCount = 0;
    let errorCount = 0;
    
    for (const item of items) {
      try {
        await this.processItem(item);
        successCount++;
      } catch (error) {
        errorCount++;
        console.error('Process error:', error);
      }
    }
    
    // Show summary
    if (successCount > 0 && errorCount === 0) {
      app.toast.success(`All ${successCount} items processed successfully`);
    } else if (successCount > 0 && errorCount > 0) {
      app.toast.warning(`${successCount} successful, ${errorCount} failed`);
    } else {
      app.toast.error('All items failed to process');
    }
  }
}
```

The Toast Service provides a powerful, flexible notification system that enhances user experience while maintaining a clean, professional appearance. Use it consistently throughout your MOJO application to keep users informed of important events and system status.