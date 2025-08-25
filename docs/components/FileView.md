# FileView Component

FileView is a comprehensive file display component that presents file information in an organized, user-friendly format using a tabbed interface. It supports both simple URLs and complex file objects with metadata and renditions.

## Table of Contents

- [Overview](#overview)
- [Basic Usage](#basic-usage)
- [File Data Support](#file-data-support)
- [Tab Structure](#tab-structure)
- [Configuration Options](#configuration-options)
- [Size Variants](#size-variants)
- [Integration Examples](#integration-examples)
- [API Reference](#api-reference)
- [Styling & Theming](#styling--theming)
- [Best Practices](#best-practices)

## Overview

FileView provides a rich interface for displaying file information with:

- **Tabbed organization**: Overview, Renditions, and Metadata tabs
- **Dual format support**: Simple URLs and complex file objects
- **Automatic rendition selection**: Best image size based on configuration
- **Rich metadata display**: Formatted using DataFormatter
- **Interactive features**: Copy URL, download links, responsive galleries
- **Responsive design**: Adapts to different screen sizes and themes

### Key Features

- **Overview Tab**: Primary image/file preview, basic info, and actions
- **Renditions Tab**: All available file sizes with thumbnails and download links
- **Metadata Tab**: Technical details, upload information, and custom data
- **Smart previews**: Automatic selection of best rendition based on size
- **Accessibility**: Full keyboard navigation and screen reader support

## Basic Usage

### Simple URL Display

```javascript
import FileView from '../components/FileView.js';

// Display a simple image URL
const fileView = new FileView({
  file: 'https://example.com/image.jpg'
});

await fileView.mount(container);
```

### Complex File Object Display

```javascript
// Display a rich file object with metadata and renditions
const fileView = new FileView({
  file: {
    id: 31,
    filename: "landscape.jpg",
    url: "https://example.com/landscape.jpg",
    file_size: 2557500,
    content_type: "image/jpeg",
    category: "image",
    metadata: {
      width: 1920,
      height: 1080,
      camera: "Canon EOS R5"
    },
    renditions: {
      thumbnail: { url: "...", file_size: 25484 },
      thumbnail_lg: { url: "...", file_size: 89230 }
    }
  },
  size: 'lg'
});

await fileView.mount(container);
```

## File Data Support

FileView handles multiple file data formats automatically:

### URL String Format

```javascript
// Simple string URL
const fileData = "https://example.com/photo.jpg";

const view = new FileView({ file: fileData });
```

### Basic File Object

```javascript
// Minimal file object
const fileData = {
  filename: "document.pdf",
  url: "https://example.com/document.pdf",
  file_size: 1847650,
  content_type: "application/pdf"
};

const view = new FileView({ file: fileData });
```

### Complete File Object

```javascript
// Full file object with all metadata
const fileData = {
  id: 42,
  created: 1756006943,
  modified: 1756006946,
  group: null,
  user: 2,
  filename: "nature_photo.jpg",
  storage_filename: "nature_photo_bf35da8e.jpg",
  file_size: 3245670,
  content_type: "image/jpeg",
  category: "image",
  checksum: "sha256:a1b2c3d4...",
  upload_status: "completed",
  metadata: {
    width: 2048,
    height: 1365,
    camera: "Canon EOS R6",
    iso: 200,
    aperture: "f/8",
    location: "Rocky Mountain National Park"
  },
  is_active: true,
  is_public: false,
  url: "https://example.com/nature_photo.jpg",
  renditions: {
    thumbnail: {
      id: 23,
      url: "https://example.com/thumb.jpg",
      file_size: 15240,
      role: "thumbnail"
    },
    thumbnail_lg: {
      id: 24,
      url: "https://example.com/thumb_lg.jpg", 
      file_size: 89230,
      role: "thumbnail_lg"
    }
  }
};

const view = new FileView({ file: fileData });
```

## Tab Structure

FileView organizes information into three main tabs:

### Overview Tab

The primary tab displaying:
- **Image preview** (for image files) or file icon
- **Basic file information**: name, type, size, category
- **Upload status** and visibility settings  
- **Action buttons**: Download, Copy URL
- **Responsive layout**: Image and info side-by-side on larger screens

### Renditions Tab

Available when file has multiple sizes:
- **Grid layout** of all available renditions
- **Preview thumbnails** for each rendition
- **Size information**: File size and dimensions
- **Individual download links** for each rendition
- **Organized by role**: thumbnail, thumbnail_sm, thumbnail_md, etc.

### Metadata Tab

Technical and custom information:
- **File details**: ID, timestamps, storage info
- **Technical metadata**: Dimensions, camera settings, etc.
- **Custom data**: Any additional metadata from the file object
- **Formatted display**: Using DataFormatter for dates, sizes, etc.

## Configuration Options

### Core Options

```javascript
const fileView = new FileView({
  file: fileObject,           // Required: File data
  size: 'md',                 // Optional: Preview size (xs, sm, md, lg, xl)
  showActions: true,          // Optional: Show action buttons
  showMetadata: true,         // Optional: Show metadata tab
  showRenditions: true        // Optional: Show renditions tab
});
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `file` | string\|Object | - | File URL or file object (required) |
| `size` | string | `'md'` | Preview size: xs, sm, md, lg, xl |
| `showActions` | boolean | `true` | Show download/copy buttons |
| `showMetadata` | boolean | `true` | Show metadata tab |
| `showRenditions` | boolean | `true` | Show renditions tab |

### Customized Examples

```javascript
// Minimal view - overview only
const minimalView = new FileView({
  file: fileObject,
  showRenditions: false,
  showMetadata: false,
  showActions: false
});

// Large preview without actions
const previewView = new FileView({
  file: fileObject,
  size: 'xl',
  showActions: false
});

// Metadata-focused view
const metadataView = new FileView({
  file: fileObject,
  size: 'sm',
  showRenditions: false
});
```

## Size Variants

FileView supports five size variants for image previews:

| Size | Dimensions | Best For | Tab Behavior |
|------|------------|----------|--------------|
| `xs` | 48×48px | Small thumbnails | Compact layout |
| `sm` | 96×96px | List items | Sidebar display |
| `md` | 150×150px | Standard preview | Default layout |
| `lg` | 200×200px | Featured display | Emphasized preview |
| `xl` | 300×300px | Detailed view | Large showcase |

### Rendition Selection Logic

FileView automatically selects the best rendition:

```javascript
// Size mapping for rendition selection
const sizeMap = {
  xs: ['thumbnail_sm', 'thumbnail', 'square_sm'],
  sm: ['thumbnail', 'thumbnail_sm', 'square_sm'],
  md: ['thumbnail_md', 'thumbnail', 'thumbnail_lg'],
  lg: ['thumbnail_lg', 'thumbnail_md', 'thumbnail'],
  xl: ['original', 'thumbnail_lg']
};
```

## Integration Examples

### With FormBuilder

```javascript
import FormBuilder from '../components/FormBuilder.js';
import FileView from '../components/FileView.js';

const form = new FormBuilder({
  fields: [{
    type: 'image',
    name: 'upload',
    size: 'md'
  }]
});

form.on('change', async (data) => {
  if (data.field === 'upload' && data.value) {
    // Create mock file object for preview
    const fileObject = {
      filename: data.value.name,
      url: URL.createObjectURL(data.value),
      file_size: data.value.size,
      content_type: data.value.type,
      category: data.value.type.startsWith('image/') ? 'image' : 'file'
    };

    const fileView = new FileView({
      file: fileObject,
      size: 'lg'
    });

    await fileView.mount(previewContainer);
  }
});
```

### File Gallery

```javascript
class FileGallery extends View {
  constructor(options) {
    super(options);
    this.files = options.files || [];
  }

  async renderFiles() {
    for (const file of this.files) {
      const fileView = new FileView({
        file: file,
        size: 'md',
        showActions: true
      });

      const container = document.createElement('div');
      container.className = 'col-md-6 col-lg-4 mb-4';
      
      this.element.appendChild(container);
      await fileView.mount(container);
    }
  }
}
```

### Modal Preview

```javascript
import Dialog from '../components/Dialog.js';

async function showFilePreview(file) {
  const fileView = new FileView({
    file: file,
    size: 'xl',
    showActions: true
  });

  const dialog = new Dialog({
    title: file.filename || 'File Preview',
    size: 'lg',
    body: fileView
  });

  await dialog.show();
}
```

## API Reference

### Constructor Options

```javascript
new FileView({
  file: fileData,              // string|Object - Required
  size: 'md',                  // string - Optional
  showActions: true,           // boolean - Optional  
  showMetadata: true,          // boolean - Optional
  showRenditions: true,        // boolean - Optional
  ...viewOptions               // View base options
})
```

### Methods

#### `updateFile(newFile)`

Update the displayed file data:

```javascript
const fileView = new FileView({ file: oldFile });

// Update with new file data
await fileView.updateFile(newFile);
```

#### `getBestImageUrl(size)`

Get the optimal image URL for a specific size:

```javascript
const imageUrl = fileView.getBestImageUrl('lg');
// Returns best rendition URL for large size
```

#### `getFileInfo()`

Access processed file information:

```javascript
const info = fileView.getFileInfo();
console.log(info.displayName, info.fileSize, info.contentType);
```

### Events

FileView inherits from View and supports standard View events:

```javascript
fileView.on('mounted', () => {
  console.log('FileView mounted');
});

fileView.on('destroyed', () => {
  console.log('FileView destroyed');
});
```

### Actions

Built-in action handlers:

```javascript
// Copy URL action (automatically handled)
// Triggered by clicking "Copy URL" button
await fileView.handleActionCopyUrl(action, event, element);
```

## Styling & Theming

### CSS Classes

```css
/* Main container */
.file-view { }

/* Tab-specific content */
.file-overview { }
.file-renditions { }
.file-metadata { }

/* Content layout */
.file-overview .row { }
.file-renditions .row { }
.file-metadata .row { }
```

### Custom Styling

```css
/* Customize file preview */
.file-view .file-overview img {
  border-radius: 0.5rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

/* Style rendition grid */
.file-view .file-renditions .card {
  transition: transform 0.2s;
}

.file-view .file-renditions .card:hover {
  transform: translateY(-2px);
}

/* Metadata formatting */
.file-view .file-metadata dt {
  font-weight: 600;
  color: var(--bs-primary);
}
```

### Dark Theme

FileView automatically supports Bootstrap's dark theme:

```html
<html data-bs-theme="dark">
  <!-- FileView will use dark theme styling -->
</html>
```

## Best Practices

### 1. Choose Appropriate Sizes

```javascript
// For thumbnails and lists
const listView = new FileView({
  file: file,
  size: 'sm',
  showMetadata: false,
  showRenditions: false
});

// For detailed file inspection
const detailView = new FileView({
  file: file,
  size: 'lg',
  showActions: true,
  showMetadata: true
});
```

### 2. Handle Missing Data Gracefully

```javascript
// FileView automatically handles incomplete data
const view = new FileView({
  file: {
    filename: "document.pdf",  // Minimal required data
    url: "https://example.com/doc.pdf"
    // Missing metadata, renditions, etc. - handled gracefully
  }
});
```

### 3. Optimize for Use Case

```javascript
// Gallery view - focus on visuals
const galleryView = new FileView({
  file: file,
  size: 'md',
  showActions: false,        // Reduce clutter
  showMetadata: false        // Keep it simple
});

// Admin view - show everything  
const adminView = new FileView({
  file: file,
  size: 'lg',
  showActions: true,         // Full functionality
  showMetadata: true,        // Technical details
  showRenditions: true       // All variants
});
```

### 4. Error Handling

```javascript
try {
  const fileView = new FileView({
    file: potentiallyInvalidFile
  });
  await fileView.mount(container);
} catch (error) {
  // FileView handles invalid data internally
  // but you can catch mount errors
  console.error('Failed to display file:', error);
}
```

### 5. Performance Considerations

```javascript
// For large file lists, consider lazy loading
class FileList extends View {
  async renderFileViews() {
    // Only render visible FileViews
    const visibleFiles = this.getVisibleFiles();
    
    for (const file of visibleFiles) {
      const view = new FileView({
        file: file,
        size: 'sm',           // Smaller size for lists
        showMetadata: false,  // Reduce complexity
        showRenditions: false
      });
      
      await view.mount(container);
    }
  }
}
```

### 6. Integration with File Management

```javascript
class FileManager extends View {
  async showFileDetails(fileId) {
    // Fetch full file data from server
    const response = await rest.GET(`/api/files/${fileId}`);
    
    if (response.success && response.data.status) {
      const fileView = new FileView({
        file: response.data.data,
        size: 'xl',
        showActions: true
      });
      
      await fileView.mount(this.detailContainer);
    }
  }
  
  async handleFileUpdate(fileId, newData) {
    // Update existing FileView with new data
    const existingView = this.getFileView(fileId);
    if (existingView) {
      await existingView.updateFile(newData);
    }
  }
}
```

### 7. Accessibility

- FileView automatically provides proper ARIA labels
- Tab navigation works out of the box
- Image alt text is generated from filename
- Action buttons have descriptive labels

### 8. Memory Management

```javascript
// Clean up FileViews when no longer needed
class FileGallery extends View {
  async onBeforeDestroy() {
    // FileViews are automatically destroyed when parent is destroyed
    // But you can manually clean up if needed
    for (const view of this.fileViews) {
      await view.destroy();
    }
    
    await super.onBeforeDestroy();
  }
}
```
