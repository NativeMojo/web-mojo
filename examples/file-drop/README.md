# FileDropMixin - MOJO Framework

A powerful mixin that adds drag-and-drop file functionality to any MOJO View with minimal configuration.

## Overview

The FileDropMixin allows you to enhance any MOJO View with drag-and-drop file capabilities. Unlike purpose-built components like `ImageUploadView`, the mixin provides flexible file handling that you can add to existing Views or create lightweight drop zones.

## Quick Start

```javascript
import View from '../../src/core/View.js';
import applyFileDropMixin from '../../src/components/FileDropMixin.js';

// Apply the mixin to the View class
applyFileDropMixin(View);

class MyView extends View {
    constructor(options) {
        super(options);
        
        // Enable file drop functionality
        this.enableFileDrop({
            acceptedTypes: ['image/*'],
            maxFileSize: 5 * 1024 * 1024, // 5MB
            multiple: false
        });
    }
    
    // Handle successful file drops
    async onFileDrop(files, event, validation) {
        console.log('Files dropped:', files);
        // Process files here
    }
    
    // Handle drop errors
    async onFileDropError(error, event, files) {
        console.log('Drop error:', error.message);
    }
}
```

## Configuration Options

### `enableFileDrop(config)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `acceptedTypes` | Array | `['*/*']` | MIME types to accept (e.g., `['image/*', 'application/pdf']`) |
| `maxFileSize` | Number | `10MB` | Maximum file size in bytes |
| `multiple` | Boolean | `false` | Allow multiple files to be dropped |
| `dropZoneSelector` | String | `null` | CSS selector for specific drop zone (defaults to entire view) |
| `visualFeedback` | Boolean | `true` | Show visual feedback during drag operations |
| `validateOnDrop` | Boolean | `true` | Validate files before calling `onFileDrop` |
| `dragOverClass` | String | `'drag-over'` | CSS class applied during drag over |
| `dragActiveClass` | String | `'drag-active'` | CSS class applied when drag is active |

## Callback Methods

### `onFileDrop(files, event, validation)`

Called when files are successfully dropped and validated.

**Parameters:**
- `files` (Array): Array of File objects
- `event` (DragEvent): The original drop event
- `validation` (Object): Validation result `{ valid: boolean, errors: Array }`

### `onFileDropError(error, event, files)`

Called when file validation fails or other errors occur.

**Parameters:**
- `error` (Error): The error that occurred
- `event` (DragEvent): The original drop event  
- `files` (Array): The files that caused the error (if any)

## CSS Classes

The mixin automatically applies CSS classes for visual feedback:

- `.drag-over` - Applied when dragging over the drop zone
- `.drag-active` - Applied when drag operation is active
- Combined state gets additional styling with transform and shadow effects

## Examples

### 1. Basic Image Drop

```javascript
// Apply mixin first
applyFileDropMixin(View);

class ImageDropView extends View {
    constructor(options) {
        super(options);
        
        this.enableFileDrop({
            acceptedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
            maxFileSize: 5 * 1024 * 1024,
            multiple: false
        });
    }
    
    async onFileDrop(files, event, validation) {
        const file = files[0];
        const imageUrl = URL.createObjectURL(file);
        
        // Display preview
        this.element.innerHTML = `
            <img src="${imageUrl}" class="img-thumbnail" style="max-width: 300px;">
            <p>Dropped: ${file.name}</p>
        `;
    }
}
```

### 2. Multiple File Gallery

```javascript
// Apply mixin first
applyFileDropMixin(View);

class FileGalleryView extends View {
    constructor(options) {
        super(options);
        
        this.files = [];
        
        this.enableFileDrop({
            acceptedTypes: ['image/*', 'application/pdf'],
            maxFileSize: 10 * 1024 * 1024,
            multiple: true
        });
    }
    
    async onFileDrop(files, event, validation) {
        this.files.push(...files);
        this.updateGallery();
    }
    
    updateGallery() {
        // Update UI with all files
        const fileList = this.files.map(file => `
            <div class="file-item">
                <span>${file.name}</span>
                <small>(${this.formatFileSize(file.size)})</small>
            </div>
        `).join('');
        
        this.element.querySelector('.file-list').innerHTML = fileList;
    }
}
```

### 3. Custom Drop Zone

```javascript
async getTemplate() {
    return `
        <div class="view-content">
            <h3>My View</h3>
            <div class="custom-drop-area" style="border: 2px dashed #ccc; padding: 2rem;">
                <p>Drop files here</p>
            </div>
            <div class="results"></div>
        </div>
    `;
}

constructor(options) {
    super(options);
    
    // Apply mixin (typically done once at module level)
    applyFileDropMixin(View);
    
    // Only the custom area accepts drops
    this.enableFileDrop({
        dropZoneSelector: '.custom-drop-area',
        acceptedTypes: ['*/*'],
        multiple: true
    });
}
```

### 4. Disable Visual Feedback

```javascript
// Apply mixin first
applyFileDropMixin(View);

this.enableFileDrop({
    acceptedTypes: ['text/plain'],
    visualFeedback: false, // No drag styling
    validateOnDrop: false  // Custom validation in onFileDrop
});
```

async onFileDrop(files, event, validation) {
    // Custom validation
    for (const file of files) {
        if (!file.name.endsWith('.txt')) {
            this.onFileDropError(new Error('Only .txt files allowed'), event, [file]);
            return;
        }
    }
    
    // Process valid files
    console.log('Valid files:', files);
}
```

## Integration Patterns

### With Existing Components

You can enhance existing Views without modifying their core functionality:

```javascript
// Apply mixin to View class first
applyFileDropMixin(View);

// Enhance an existing table view with file drop
class EnhancedTableView extends TableView {
    constructor(options) {
        super(options);
        
        // Add file drop for CSV imports
        this.enableFileDrop({
            acceptedTypes: ['text/csv'],
            maxFileSize: 50 * 1024 * 1024
        });
    }
    
    async onFileDrop(files, event, validation) {
        const csvFile = files[0];
        await this.importFromCSV(csvFile);
        await this.refresh(); // Refresh table data
    }
}
```

### Combining with ImageUploadView

Use both for different purposes in the same view:

```javascript
// Apply mixin first
applyFileDropMixin(View);

class MediaManagerView extends View {
    async onInit() {
        // Full-featured upload component
        this.uploader = new ImageUploadView({
            uploadUrl: '/api/upload',
            autoUpload: true
        });
        this.addChild(this.uploader);
        
        // Quick preview area
        this.enableFileDrop({
            dropZoneSelector: '.quick-preview',
            acceptedTypes: ['image/*']
        });
    }
    
    async onFileDrop(files, event, validation) {
        // Show quick preview without uploading
        this.showPreview(files[0]);
    }
}
```

## File Validation

### Built-in Validation

When `validateOnDrop: true`, the mixin validates:
- File type against `acceptedTypes`
- File size against `maxFileSize` 

### Custom Validation

Set `validateOnDrop: false` and handle validation in `onFileDrop`:

```javascript
async onFileDrop(files, event, validation) {
    for (const file of files) {
        // Custom validation logic
        if (file.name.includes('temp')) {
            this.onFileDropError(new Error('Temporary files not allowed'), event, [file]);
            return;
        }
        
        // Additional checks...
    }
    
    // Process valid files
    this.processFiles(files);
}
```

## Best Practices

### 1. Always Handle Errors
```javascript
async onFileDropError(error, event, files) {
    // Show user-friendly error message
    this.showToast(error.message, 'error');
    console.error('File drop error:', error);
}
```

### 2. Clean Up Object URLs
```javascript
async onBeforeDestroy() {
    // Clean up any object URLs you created
    this.createdUrls?.forEach(url => URL.revokeObjectURL(url));
    await super.onBeforeDestroy();
}
```

### 3. Provide Visual Feedback
```javascript
// Use the built-in CSS classes in your styles
.my-drop-zone.drag-over {
    background-color: #e3f2fd;
    border-color: #2196f3;
}

.my-drop-zone.drag-active {
    transform: scale(1.02);
    box-shadow: 0 4px 20px rgba(33, 150, 243, 0.3);
}
```

### 4. Progressive Enhancement
```javascript
// Apply mixin first
applyFileDropMixin(View);

// Add file drop to existing forms as enhancement
class ContactFormView extends FormView {
    constructor(options) {
        super(options);
        
        // Enhance with file attachment capability
        this.enableFileDrop({
            dropZoneSelector: '.attachment-area',
            acceptedTypes: ['image/*', 'application/pdf'],
            multiple: true
        });
    }
}
```

## Browser Support

FileDropMixin uses modern browser APIs:
- Drag and Drop API
- File API
- URL.createObjectURL()

Supported in all modern browsers. For IE11 support, polyfills may be required.

## Troubleshooting

### Files Not Being Accepted
- Check `acceptedTypes` array matches file MIME types
- Verify `maxFileSize` is sufficient
- Check browser console for validation errors

### Drag Styling Not Working
- Ensure `visualFeedback: true` (default)
- Check that CSS classes `.drag-over` and `.drag-active` are defined
- Verify drop zone element exists when using `dropZoneSelector`

### Multiple Files Not Working
- Set `multiple: true` in configuration
- Handle arrays in `onFileDrop` callback

### Drop Zone Not Responsive
- Check that view is properly rendered before enabling file drop
- Verify `dropZoneSelector` matches existing elements
- Ensure event listeners are not blocked by other elements

## Comparison with ImageUploadView

| Feature | FileDropMixin | ImageUploadView |
|---------|---------------|-----------------|
| **Purpose** | Enhance any View | Complete upload solution |
| **UI** | No built-in UI | Complete upload UI |
| **File Types** | Configurable | Images only |
| **Multiple Files** | ✅ Supported | ❌ Single file |
| **Custom Drop Zone** | ✅ Flexible | ❌ Fixed layout |
| **Upload Handling** | Custom callback | Built-in + callback |
| **Progress Display** | Custom implementation | Built-in |
| **Preview** | Custom implementation | Built-in |
| **Size** | Lightweight mixin | Full component |
| **Use Case** | Enhancement/flexibility | Complete solution |

Choose FileDropMixin when you need flexibility and want to enhance existing Views. Choose ImageUploadView when you need a complete, ready-to-use upload solution.