# Error Handling with Rest API

This guide demonstrates how to handle REST API errors using the enhanced error categorization system.

## Error Reason Codes

The Rest class now returns a `reason` field to categorize errors into common patterns:

### Network/Connection Errors
- `not_reachable` - Service is not available (CORS, network down)
- `timed_out` - Request timeout
- `cancelled` - Request was cancelled
- `cors_error` - Cross-origin request blocked
- `dns_error` - Unable to resolve server address

### HTTP Status-Based Errors
- `bad_request` (400) - Invalid request data
- `unauthorized` (401) - Authentication required
- `forbidden` (403) - Access denied
- `not_found` (404) - Resource not found
- `conflict` (409) - Resource conflict
- `validation_error` (422) - Validation failed
- `rate_limited` (429) - Too many requests
- `client_error` (4xx) - Generic client error
- `server_error` (5xx) - Server error

### Generic
- `unknown_error` - Fallback for unrecognized errors

## Basic Error Handling Pattern

```js
class MyView extends View {
    async onActionSaveData(action, event, element) {
        try {
            const response = await rest.POST('/api/data', this.formData);
            
            // Check HTTP level first
            if (!response.success) {
                return this.handleRestError(response);
            }
            
            // Check server application response
            if (!response.data.status) {
                throw new Error(response.data.error || 'Server error');
            }
            
            // Success
            await this.showSuccess('Data saved successfully!');
            
        } catch (error) {
            await this.showError(error.message);
        }
    }
    
    async handleRestError(response) {
        switch (response.reason) {
            case 'not_reachable':
                await this.showError('Unable to connect to server. Please check your internet connection.');
                break;
                
            case 'timed_out':
                await this.showError('Request timed out. Please try again.');
                break;
                
            case 'unauthorized':
                await this.showError('Please log in to continue.');
                // Redirect to login
                this.getApp().router.navigate('/login');
                break;
                
            case 'forbidden':
                await this.showError('You don\'t have permission to perform this action.');
                break;
                
            case 'validation_error':
                // Handle validation errors specifically
                this.displayValidationErrors(response.data);
                break;
                
            case 'server_error':
                await this.showError('Server error. Please try again later.');
                break;
                
            default:
                await this.showError(response.message || 'An error occurred');
        }
    }
}
```

## Advanced Error Handling

### Centralized Error Handler

```js
class BaseView extends View {
    async handleApiCall(apiCall, options = {}) {
        const { 
            successMessage = null,
            showLoading = true,
            retryable = true 
        } = options;
        
        if (showLoading) {
            this.showLoadingState();
        }
        
        try {
            const response = await apiCall();
            
            if (!response.success) {
                return await this.handleRestError(response, { retryable });
            }
            
            if (!response.data.status) {
                throw new Error(response.data.error || 'Server error');
            }
            
            if (successMessage) {
                await this.showSuccess(successMessage);
            }
            
            return response.data.data;
            
        } catch (error) {
            await this.showError(error.message);
            throw error;
        } finally {
            if (showLoading) {
                this.hideLoadingState();
            }
        }
    }
    
    async handleRestError(response, options = {}) {
        const { retryable = false } = options;
        
        switch (response.reason) {
            case 'not_reachable':
            case 'timed_out':
                if (retryable) {
                    return await this.showRetryDialog(response);
                }
                await this.showError(response.message);
                break;
                
            case 'unauthorized':
                await this.handleUnauthorized();
                break;
                
            case 'rate_limited':
                await this.showWarning('You\'re making requests too quickly. Please wait a moment.');
                break;
                
            case 'validation_error':
                return this.handleValidationError(response);
                
            default:
                await this.showError(response.message);
        }
        
        return false;
    }
    
    async handleUnauthorized() {
        await this.showWarning('Your session has expired. Please log in again.');
        // Clear auth and redirect
        this.getApp().clearAuth();
        this.getApp().router.navigate('/login');
    }
    
    async handleValidationError(response) {
        // Extract validation errors from server response
        const errors = response.data?.errors || {};
        
        // Show field-specific errors
        Object.entries(errors).forEach(([field, messages]) => {
            const fieldElement = this.element.querySelector(`[name="${field}"]`);
            if (fieldElement) {
                this.showFieldError(fieldElement, messages.join(', '));
            }
        });
        
        await this.showError('Please correct the errors below.');
        return false;
    }
    
    async showRetryDialog(response) {
        const shouldRetry = await this.showConfirmDialog({
            title: 'Connection Error',
            message: `${response.message}\n\nWould you like to try again?`,
            confirmText: 'Retry',
            cancelText: 'Cancel'
        });
        
        return shouldRetry;
    }
}
```

### Usage in Views

```js
class UserProfileView extends BaseView {
    async onActionSaveProfile(action, event, element) {
        const userData = this.getFormData();
        
        const result = await this.handleApiCall(
            () => rest.PUT(`/api/users/${this.userId}`, userData),
            {
                successMessage: 'Profile updated successfully!',
                retryable: true
            }
        );
        
        if (result) {
            this.user = result;
            await this.render();
        }
    }
    
    async onActionUploadAvatar(action, event, element) {
        const fileInput = element.querySelector('input[type="file"]');
        const file = fileInput.files[0];
        
        if (!file) return;
        
        try {
            const result = await this.handleApiCall(
                () => rest.upload(`/api/users/${this.userId}/avatar`, file, {
                    onProgress: (event) => {
                        if (event.lengthComputable) {
                            const progress = (event.loaded / event.total) * 100;
                            this.updateProgressBar(progress);
                        }
                    }
                }),
                { successMessage: 'Avatar updated successfully!' }
            );
            
            this.user.avatar = result.avatar_url;
            await this.render();
            
        } catch (error) {
            // Error already handled by handleApiCall
        }
    }
}
```

### Form Validation Integration

```js
class FormView extends BaseView {
    async onActionSubmitForm(action, event, element) {
        // Clear previous errors
        this.clearFormErrors();
        
        const formData = this.getFormData();
        
        try {
            const response = await rest.POST('/api/forms', formData);
            
            if (!response.success) {
                if (response.reason === 'validation_error') {
                    this.displayValidationErrors(response.data);
                    return;
                }
                return this.handleRestError(response);
            }
            
            if (!response.data.status) {
                throw new Error(response.data.error);
            }
            
            await this.showSuccess('Form submitted successfully!');
            this.resetForm();
            
        } catch (error) {
            await this.showError(error.message);
        }
    }
    
    displayValidationErrors(data) {
        const errors = data.errors || {};
        
        Object.entries(errors).forEach(([field, messages]) => {
            const input = this.element.querySelector(`[name="${field}"]`);
            if (input) {
                this.showFieldError(input, messages.join(', '));
            }
        });
    }
    
    showFieldError(input, message) {
        input.classList.add('is-invalid');
        
        // Find or create error display
        let errorDiv = input.parentNode.querySelector('.invalid-feedback');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'invalid-feedback';
            input.parentNode.appendChild(errorDiv);
        }
        
        errorDiv.textContent = message;
    }
    
    clearFormErrors() {
        this.element.querySelectorAll('.is-invalid').forEach(el => {
            el.classList.remove('is-invalid');
        });
        
        this.element.querySelectorAll('.invalid-feedback').forEach(el => {
            el.remove();
        });
    }
}
```

## Best Practices

### 1. Always Check Both Levels
```js
// ✅ Check HTTP level first, then server response
if (!response.success) {
    return this.handleRestError(response);
}

if (!response.data.status) {
    throw new Error(response.data.error);
}
```

### 2. Provide User-Friendly Messages
```js
// ✅ Give users actionable feedback
switch (response.reason) {
    case 'not_reachable':
        await this.showError('Please check your internet connection and try again.');
        break;
    case 'unauthorized':
        await this.showError('Please log in to continue.');
        break;
}
```

### 3. Handle Retryable Errors
```js
// ✅ Offer retry for network issues
if (['not_reachable', 'timed_out'].includes(response.reason)) {
    const shouldRetry = await this.showRetryDialog();
    if (shouldRetry) {
        return this.onActionSaveData(action, event, element);
    }
}
```

### 4. Log Errors for Debugging
```js
// ✅ Log technical details while showing user-friendly messages
console.error('API Error:', {
    reason: response.reason,
    status: response.status,
    message: response.message,
    url: request.url
});

await this.showError('Something went wrong. Please try again.');
```

This error handling system provides a consistent, user-friendly way to handle all types of REST API errors in your MOJO applications.