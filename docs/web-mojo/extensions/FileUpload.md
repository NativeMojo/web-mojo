# FileUpload System Documentation

The FileUpload system provides a complete file upload solution with progress tracking, toast notifications, and cancellation support. It consists of several integrated components that work together to provide a seamless upload experience.

## Overview

The FileUpload system implements a three-stage upload process:

1. **Initiate**: Get signed upload URL from the API
2. **Upload**: Upload file directly to signed URL with progress tracking
3. **Complete**: Mark upload as completed in the API

## Components

### File Model
Enhanced with a simple `upload()` method that returns a FileUpload instance.

### FileUpload Service
Core orchestration class that manages the upload process.

### ProgressView Component
UI component that displays upload progress with file information and cancellation.

### ToastService Enhancement
Extended to support View components in toast bodies.

## Basic Usage

### Simple File Upload
```javascript
import { File } from '../models/Files.js';

const file = new File();
const upload = file.upload({
    file: fileObject,           // HTML File object
    name: 'custom-name.jpg',    // Optional custom filename
    group: 'profile-pics',      // Optional file group
    description: 'User avatar', // Optional description
    showToast: true            // Show progress toast (default: true)
});

// Promise interface
upload.then(result => {
    console.log('Upload successful!', result);
}).catch(error => {
    console.error('Upload failed:', error);
});
```

### With Progress Callbacks
```javascript
const upload = file.upload({
    file: fileObject,
    onProgress: (progressInfo) => {
        console.log(`${progressInfo.percentage}% complete`);
        console.log(`${progressInfo.loaded} / ${progressInfo.total} bytes`);
    },
    onComplete: (result) => {
        console.log('Upload completed!', result);
        // Refresh UI, show success message, etc.
    },
    onError: (error) => {
        console.error('Upload failed:', error);
        // Handle error, show retry option, etc.
    }
});
```

### Manual Progress UI
```javascript
import ProgressView from '../components/ProgressView.js';
import ToastService from '../services/ToastService.js';

const progressView = new ProgressView({
    filename: file.name,
    filesize: file.size,
    showCancel: true,
    onCancel: () => upload.cancel()
});

const toastService = new ToastService();
const progressToast = toastService.showView(progressView, 'info', {
    title: 'File Upload',
    autohide: false,
    dismissible: false
});

const upload = fileModel.upload({
    file: file,
    showToast: false, // We're handling UI manually
    onProgress: (progressInfo) => {
        progressView.updateProgress(progressInfo);
    }
});
```

## API Reference

### File.upload(options)

Creates and starts a new file upload.

**Parameters:**
- `options.file` (File, required) - HTML File object to upload
- `options.name` (string, optional) - Custom filename
- `options.group` (string, optional) - File group/category
- `options.description` (string, optional) - File description
- `options.onProgress` (function, optional) - Progress callback
- `options.onComplete` (function, optional) - Success callback
- `options.onError` (function, optional) - Error callback
- `options.showToast` (boolean, optional, default: true) - Show progress toast

**Returns:** FileUpload instance with promise interface

### FileUpload Class

#### Methods

##### cancel()
Cancels the upload if still in progress.

**Returns:** `boolean` - True if cancelled, false if already completed

##### isCancelled()
Check if upload was cancelled.

**Returns:** `boolean`

##### getStats()
Get upload statistics.

**Returns:** Object with filename, size, type, cancelled status, etc.

#### Promise Interface
FileUpload implements thenable interface:
- `upload.then(onSuccess, onError)`
- `upload.catch(onError)`
- `upload.finally(onFinally)`

### ProgressView Component

#### Constructor Options
```javascript
new ProgressView({
    filename: 'document.pdf',     // File name to display
    filesize: 1024000,           // File size in bytes
    showCancel: true,            // Show cancel button
    onCancel: () => { ... }      // Cancel callback
});
```

#### Methods

##### updateProgress(progressInfo)
Update progress display.

**Parameters:**
- `progressInfo.progress` (number) - Progress as decimal (0-1)
- `progressInfo.loaded` (number) - Bytes uploaded
- `progressInfo.total` (number) - Total bytes
- `progressInfo.percentage` (number) - Progress as percentage (0-100)

##### markCompleted(message)
Mark upload as completed with success message.

##### markFailed(message)
Mark upload as failed with error message.

##### markCancelled()
Mark upload as cancelled.

### ToastService.showView(view, type, options)

Display a View component in a toast.

**Parameters:**
- `view` (View) - View component to display
- `type` (string) - Toast type ('info', 'success', 'error', 'warning', 'plain')
- `options` (object) - Toast configuration options

**Returns:** Toast control object with `hide()`, `dispose()`, and `updateProgress()` methods

## Configuration

### Default Upload Behavior

The system automatically:
- Shows progress toast during upload
- Hides progress toast on completion (after 2 second delay)
- Shows error toast on failure
- Supports upload cancellation
- Formats file sizes and progress information

### Customizing Toast Display

```javascript
// Disable automatic toast
const upload = file.upload({
    file: fileObject,
    showToast: false
});

// Create custom progress UI
const customProgress = new MyCustomProgressView();
// Handle progress updates manually
```

### Error Handling

The system handles various error conditions:
- Network errors during initiation
- Upload failures (HTTP errors)
- Timeout errors
- Cancellation by user
- Invalid file validation

## Integration Examples

### TablePage File Drop Integration

```javascript
// In your TablePage class
import { File } from '../models/Files.js';

async onFileDrop(files, event, validation) {
    const file = files[0];
    
    try {
        const fileModel = new File();
        const upload = fileModel.upload({
            file: file,
            group: 'uploads',
            description: `Dropped on ${new Date().toLocaleDateString()}`,
            onComplete: () => {
                this.refresh(); // Refresh table to show new file
            }
        });
        
    } catch (error) {
        this.showError('Failed to start upload: ' + error.message);
    }
}
```

### Form Integration

```javascript
// In a form submission handler
async handleFormSubmit(formData) {
    const fileInput = this.element.querySelector('input[type="file"]');
    const file = fileInput.files[0];
    
    if (file) {
        const fileModel = new File();
        const upload = fileModel.upload({
            file: file,
            name: formData.get('filename') || file.name,
            group: formData.get('file_group'),
            description: formData.get('description')
        });
        
        await upload; // Wait for completion
        // Continue with form submission
    }
}
```

## Testing

### Test Button (Portal Example)

The portal example includes a test button in the topbar that simulates file upload progress:

1. Start the dev server: `npm run dev`
2. Navigate to the portal example
3. Click the upload icon in the topbar
4. Watch the simulated progress toast

### File Drop Testing (Admin Files)

1. Navigate to Admin > Manage Files
2. Drag and drop a file onto the table
3. Watch the real upload progress
4. Verify the file appears in the table after completion

### Manual Testing

```javascript
// In browser console
import { File } from '/src/models/Files.js';

// Create test file blob
const testBlob = new Blob(['test content'], { type: 'text/plain' });
const testFile = new File([testBlob], 'test.txt', { type: 'text/plain' });

// Test upload
const fileModel = new (await import('/src/models/Files.js')).File();
const upload = fileModel.upload({
    file: testFile,
    name: 'console-test.txt',
    onProgress: (p) => console.log(`Progress: ${p.percentage}%`),
    onComplete: (r) => console.log('Done:', r),
    onError: (e) => console.error('Error:', e)
});
```

## Implementation Details

### Upload Flow

1. **FileUpload Constructor**: Validates options and auto-starts upload
2. **_initiateUpload()**: POST to `/api/fileman/upload/initiate` with metadata
3. **_performUpload()**: Direct XHR PUT to signed URL with progress tracking
4. **_completeUpload()**: PATCH to mark upload as completed
5. **Success/Error Handling**: Update UI and call callbacks

### Progress Tracking

- Uses XHR `upload.onprogress` for real-time progress
- Calculates percentage, formats bytes using DataFormatter
- Updates ProgressView in real-time
- Supports cancellation via `xhr.abort()`

### Toast Integration

- ToastService extended with `showView()` method
- Automatic progress toast shows ProgressView component
- Toast transforms from progress → success/error
- Proper cleanup of View components when toast is disposed

### Error Recovery

The system is designed to be resilient:
- Network failures are caught and reported
- Partial uploads can be retried (implementation dependent)
- User cancellation is handled gracefully
- Invalid files are rejected early

## Dependencies

- **Bootstrap 5**: Required for toast functionality
- **MOJO Framework**: Core View, Model, EventEmitter classes
- **DataFormatter**: For file size formatting
- **Rest Service**: For HTTP requests

## Browser Support

- Modern browsers with File API support
- XHR Level 2 for progress tracking
- ES6+ features (async/await, classes, etc.)

## Security Considerations

- Upload URLs are signed and time-limited
- File validation should be performed server-side
- Consider file size limits and type restrictions
- Implement rate limiting for upload initiation

## Performance Notes

- Large files use direct-to-storage upload (bypasses server)
- Progress tracking has minimal overhead
- Toast UI is lightweight and efficient
- Memory usage scales with file size during upload only