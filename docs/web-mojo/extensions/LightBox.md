# LightBox Components - Media Viewers

## Overview

The MOJO LightBox package provides three powerful media viewing components for displaying and interacting with images and PDF documents. All components are built on the MOJO framework's View system and integrate seamlessly with EventDelegate and EventBus.

## Installation & Import

```javascript
// Import the lightbox package
import { ImageViewer, ImageEditor, PDFViewer } from 'web-mojo/lightbox';

// Or import individual components
import ImageViewer from 'web-mojo/lightbox/ImageViewer.js';
import ImageEditor from 'web-mojo/lightbox/ImageEditor.js';
import PDFViewer from 'web-mojo/lightbox/PDFViewer.js';
```

## Package Features

- **ImageViewer**: Advanced image viewing with zoom, pan, and rotation
- **ImageEditor**: Full-featured image editor with crop, filters, and transformations
- **PDFViewer**: PDF document viewer with navigation and zoom controls
- **EventBus Integration**: All components emit events via the central EventBus
- **EventDelegate Support**: Uses MOJO's action system with `data-action` attributes
- **Static Dialog Methods**: Easy fullscreen viewing with `showDialog()` methods
- **Responsive Design**: Mobile-friendly with touch support
- **Accessibility**: ARIA labels and keyboard navigation

---

## ImageViewer

Advanced image viewing component with zoom, pan, and rotation capabilities.

### Constructor Options

```javascript
const viewer = new ImageViewer({
  imageUrl: 'path/to/image.jpg',     // Image URL to display
  alt: 'Image description',          // Alt text for accessibility
  title: 'Image title',              // Optional image title
  
  // Display options
  showControls: true,                // Show zoom/rotate controls
  allowRotate: true,                 // Enable rotation controls
  allowZoom: true,                   // Enable zoom controls
  allowPan: true,                    // Enable pan/drag functionality
  autoFit: false,                    // Auto-fit image to container on load
  
  // Zoom limits
  minScale: 0.1,                     // Minimum zoom level
  maxScale: 5.0,                     // Maximum zoom level
  scaleStep: 0.2,                    // Zoom increment step
  
  // View options
  className: 'custom-viewer',        // Additional CSS classes
  containerId: 'image-container'     // Container element ID
});
```

### Methods

#### Image Control
- `setImage(url, alt, title)` - Load new image
- `setScale(scale)` - Set zoom level (0.1 - 5.0)
- `zoomIn()` - Zoom in by scale step
- `zoomOut()` - Zoom out by scale step
- `rotate(degrees)` - Rotate image by degrees
- `center()` - Center image in viewport
- `fitToContainer()` - Fit image to container size
- `reset()` - Reset all transformations

#### State Management
- `getCurrentState()` - Get current transform state
- `setState(state)` - Restore transform state

### Events (EventBus)

All events are emitted via `this.getApp().events`:

```javascript
// Listen to ImageViewer events
app.events.on('imageviewer:loaded', (data) => {
  console.log('Image loaded:', data.imageUrl);
  console.log('Dimensions:', data.naturalWidth, 'x', data.naturalHeight);
});

app.events.on('imageviewer:scale-changed', (data) => {
  console.log('Scale changed from', data.oldScale, 'to', data.newScale);
});

app.events.on('imageviewer:rotated', (data) => {
  console.log('Rotated by', data.degrees, 'degrees');
});

app.events.on('imageviewer:error', (data) => {
  console.error('Failed to load image:', data.error);
});
```

### Action Handlers (EventDelegate)

The ImageViewer responds to these `data-action` attributes:

- `data-action="zoom-in"` - Zoom in
- `data-action="zoom-out"` - Zoom out
- `data-action="zoom-fit"` - Fit to container
- `data-action="zoom-actual"` - Actual size (100%)
- `data-action="rotate-left"` - Rotate 90° left
- `data-action="rotate-right"` - Rotate 90° right
- `data-action="reset"` - Reset all transformations

### Static Dialog Method

```javascript
// Show image in fullscreen dialog
const viewer = await ImageViewer.showDialog('image.jpg', {
  title: 'My Image',
  alt: 'Description',
  showControls: true,
  allowRotate: true,
  size: 'fullscreen'
});
```

### Usage Example

```javascript
class GalleryView extends View {
  async handleActionViewImage(event, element) {
    const imageUrl = element.getAttribute('data-image-url');
    const imageTitle = element.getAttribute('data-title');
    
    // Show in dialog
    await ImageViewer.showDialog(imageUrl, {
      title: imageTitle,
      showControls: true,
      allowRotate: true
    });
  }
  
  async createImageViewer() {
    // Create embedded viewer
    const viewer = new ImageViewer({
      imageUrl: '/path/to/image.jpg',
      containerId: 'image-container',
      showControls: true,
      autoFit: true
    });
    
    await viewer.render();
    const container = document.getElementById('image-container');
    container.appendChild(viewer.element);
    await viewer.mount();
    
    // Listen for events
    this.getApp().events.on('imageviewer:loaded', (data) => {
      console.log('Image loaded successfully');
    });
    
    return viewer;
  }
}
```

---

## LightboxGallery

Simple, clean fullscreen image gallery for viewing single images or collections with navigation.

### Constructor Options

```javascript
const gallery = new LightboxGallery({
  images: ['image1.jpg', 'image2.jpg'], // Array of image URLs or objects
  startIndex: 0,                        // Starting image index (default: 0)
  showNavigation: true,                  // Show prev/next buttons (default: true for multiple images)
  showCounter: true,                     // Show "1 of 5" counter (default: true for multiple images)
  allowKeyboard: true,                   // Enable keyboard navigation (default: true)
  closeOnBackdrop: true,                 // Close when clicking outside image (default: true)
  fitToScreen: true                      // Start in fit-to-screen mode (default: true)
});
```

### Image Formats

```javascript
// Single image URL
LightboxGallery.show('photo.jpg');

// Array of URLs
LightboxGallery.show(['photo1.jpg', 'photo2.jpg', 'photo3.jpg']);

// Array of objects with alt text
LightboxGallery.show([
  { src: 'photo1.jpg', alt: 'Beautiful sunset' },
  { src: 'photo2.jpg', alt: 'Mountain landscape' },
  { src: 'photo3.jpg', alt: 'Ocean waves' }
]);

// Mixed formats
LightboxGallery.show([
  'photo1.jpg',                              // String URL
  { src: 'photo2.jpg', alt: 'Description' }  // Object with alt
]);
```

### Methods

#### Navigation
- `showNext()` - Navigate to next image
- `showPrevious()` - Navigate to previous image  
- `goToImage(index)` - Jump to specific image by index
- `close()` - Close the lightbox

#### Display Modes
- `toggleImageMode()` - Toggle between fit-to-screen and original size modes
- Click on image to toggle between modes

### Image Display Modes

The lightbox supports two viewing modes:

1. **Fit to Screen Mode** (default): Images scale to fit viewport perfectly
2. **Original Size Mode**: Images display at natural resolution with scroll if needed

Users can toggle modes by clicking directly on the image.

### Events (EventBus)

```javascript
// Image changed during navigation
eventBus.on('lightbox:image-changed', ({ gallery, index, image }) => {
  console.log(`Viewing image ${index + 1}: ${image.src}`);
});

// Display mode toggled
eventBus.on('lightbox:mode-changed', ({ gallery, fitToScreen }) => {
  console.log(`Display mode: ${fitToScreen ? 'Fit to Screen' : 'Original Size'}`);
});

// Lightbox closed
eventBus.on('lightbox:closed', ({ gallery }) => {
  console.log('Lightbox closed');
});
```

### Keyboard Shortcuts

- `←` / `→` - Navigate previous/next
- `Home` / `End` - Jump to first/last image
- `Escape` - Close lightbox

### Action Handlers (EventDelegate)

```javascript
// Action handlers are automatically set up
handleActionClose()         // Close button clicked
handleActionPrev()          // Previous button clicked  
handleActionNext()          // Next button clicked
handleActionImageClick()    // Image clicked (toggles display mode)
handleActionBackdropClick() // Background clicked (closes if enabled)
```

### Static Show Method

```javascript
// Simple usage
const gallery = LightboxGallery.show(images);

// With options
const gallery = LightboxGallery.show(images, {
  startIndex: 2,
  showCounter: true,
  fitToScreen: false  // Start in original size mode
});
```

### Usage Examples

#### Basic Image Gallery

```javascript
class PhotoGallery extends View {
  async handleActionViewPhoto(e) {
    const images = [
      'photo1.jpg',
      'photo2.jpg', 
      'photo3.jpg'
    ];
    
    // Get clicked image index
    const index = parseInt(e.target.dataset.index);
    
    LightboxGallery.show(images, {
      startIndex: index
    });
  }
}
```

#### With Image Data

```javascript
class ProductGallery extends View {
  constructor(options = {}) {
    super(options);
    this.product = options.product;
  }

  async handleActionViewGallery() {
    const images = this.product.images.map(img => ({
      src: img.url,
      alt: img.description
    }));

    const gallery = LightboxGallery.show(images);

    // Listen for image changes
    const eventBus = this.getApp()?.events;
    if (eventBus) {
      eventBus.on('lightbox:image-changed', ({ index, image }) => {
        this.trackImageView(image.src, index);
      });
    }
  }
}
```

#### Integration with Thumbnails

```javascript
// HTML with thumbnail grid
<div class="thumbnail-grid">
  <img src="thumb1.jpg" data-action="view-image" data-index="0" data-full="photo1.jpg">
  <img src="thumb2.jpg" data-action="view-image" data-index="1" data-full="photo2.jpg">
  <img src="thumb3.jpg" data-action="view-image" data-index="2" data-full="photo3.jpg">
</div>

// View handler
async handleActionViewImage(e) {
  const thumbnails = this.element.querySelectorAll('[data-full]');
  const images = Array.from(thumbnails).map(thumb => ({
    src: thumb.dataset.full,
    alt: thumb.alt
  }));
  
  const startIndex = parseInt(e.target.dataset.index);
  LightboxGallery.show(images, { startIndex });
}
```

---

## ImageEditor

Full-featured image editing component with crop, filters, transformations, and export capabilities.

### Constructor Options

```javascript
const editor = new ImageEditor({
  imageUrl: 'path/to/image.jpg',     // Image URL to edit
  alt: 'Image description',          // Alt text
  title: 'Image title',              // Optional title
  
  // Feature toggles
  showToolbar: true,                 // Show editing toolbar
  allowCrop: true,                   // Enable crop functionality
  allowFilters: true,                // Enable filter controls
  allowTransform: true,              // Enable zoom/rotate
  autoFit: false,                    // Auto-fit on load
  
  // Transform limits
  minScale: 0.1,
  maxScale: 5.0,
  scaleStep: 0.2,
  
  // History
  maxHistory: 50                     // Maximum undo steps
});
```

### Methods

#### Transform Operations
- `setScale(scale)` - Set zoom level
- `rotate(degrees)` - Rotate image
- `center()` - Center image
- `fitToContainer()` - Fit to container

#### Crop Operations
- `toggleCropMode()` - Enter/exit crop mode
- `setCropAspectRatio(ratio)` - Set crop ratio (1, 1.333, 1.777, etc.)
- `applyCrop()` - Apply current crop selection

#### Filter Operations
- `applyFilters()` - Apply current filter settings
- `resetFilters()` - Reset all filters to defaults

#### History Management
- `undo()` - Undo last operation
- `redo()` - Redo undone operation
- `saveState()` - Save current state to history

#### Export
- `exportImage()` - Export edited image as download
- `getEditedImageData()` - Get edited image as data URL

### Filter Properties

The editor supports these filters accessible via `editor.filters`:

- `brightness` (0-200, default: 100)
- `contrast` (0-200, default: 100)
- `saturation` (0-200, default: 100)
- `hue` (0-360, default: 0)
- `blur` (0-10, default: 0)
- `grayscale` (0-100, default: 0)
- `sepia` (0-100, default: 0)

### Events (EventBus)

```javascript
app.events.on('imageeditor:loaded', (data) => {
  console.log('Editor ready');
});

app.events.on('imageeditor:crop-applied', (data) => {
  console.log('Crop applied:', data.cropBox);
});

app.events.on('imageeditor:filter-changed', (data) => {
  console.log(`${data.filter} changed from ${data.oldValue} to ${data.newValue}`);
});

app.events.on('imageeditor:scale-changed', (data) => {
  console.log('Zoom changed');
});
```

### Action Handlers (EventDelegate)

Transform actions:
- `data-action="zoom-in/out/fit"` - Zoom controls
- `data-action="rotate-left/right"` - Rotation

Crop actions:
- `data-action="toggle-crop"` - Enter/exit crop mode
- `data-action="crop-ratio"` with `data-ratio="1"` - Set aspect ratio
- `data-action="apply-crop"` - Apply crop

Filter actions:
- `data-change-action="filter-change"` with `data-filter="brightness"` - Filter sliders
- `data-action="toggle-filters"` - Show/hide filter panel
- `data-action="reset-filters"` - Reset all filters

History actions:
- `data-action="undo/redo"` - History navigation
- `data-action="reset"` - Reset all edits
- `data-action="export"` - Export image

### Static Dialog Method

```javascript
const result = await ImageEditor.showDialog('image.jpg', {
  title: 'Edit Image',
  allowCrop: true,
  allowFilters: true,
  size: 'fullscreen'
});

if (result) {
  console.log('User action:', result.action); // 'save' or 'export'
  console.log('Edited image:', result.data);   // Data URL
}
```

### Usage Example

```javascript
class PhotoEditPage extends View {
  async handleActionEditPhoto(event, element) {
    const imageUrl = element.getAttribute('data-image');
    
    const result = await ImageEditor.showDialog(imageUrl, {
      title: 'Edit Photo',
      allowCrop: true,
      allowFilters: true
    });
    
    if (result && result.action === 'save') {
      // Save the edited image
      await this.saveEditedImage(result.data);
    }
  }
  
  async createInlineEditor() {
    const editor = new ImageEditor({
      imageUrl: this.model.get('imageUrl'),
      containerId: 'editor-container',
      allowCrop: true,
      allowFilters: true
    });
    
    await editor.render();
    await editor.mount();
    
    // Listen for changes
    this.getApp().events.on('imageeditor:filter-changed', () => {
      this.markAsModified();
    });
    
    return editor;
  }
}
```

---

## PDFViewer

PDF document viewer with navigation, zoom controls, and PDF.js integration.

### Constructor Options

```javascript
const viewer = new PDFViewer({
  pdfUrl: 'path/to/document.pdf',    // PDF URL to display
  title: 'Document Title',           // Display title
  
  // Feature toggles
  showControls: true,                // Show navigation/zoom controls
  allowZoom: true,                   // Enable zoom controls
  allowNavigation: true,             // Enable page navigation
  showPageNumbers: true,             // Show page input/total
  
  // Zoom settings
  minScale: 0.25,                    // Minimum zoom
  maxScale: 5.0,                     // Maximum zoom
  scaleStep: 0.25,                   // Zoom step
  
  // PDF.js configuration
  pdfjsWorkerPath: 'path/to/pdf.worker.js',  // Custom worker path
  pdfjsCMapUrl: 'path/to/cmaps/'              // Custom character maps
});
```

### Methods

#### Navigation
- `goToPage(pageNumber)` - Navigate to specific page
- `getCurrentPage()` - Get current page number
- `getTotalPages()` - Get total page count

#### Zoom & Display
- `setScale(scale)` - Set zoom level
- `setFitMode(mode)` - Set fit mode ('page', 'width', 'auto')
- `applyFitMode()` - Apply current fit mode

#### Document Management
- `setPDF(pdfUrl, title)` - Load new PDF document
- `downloadPDF()` - Download PDF file

### Events (EventBus)

```javascript
app.events.on('pdfviewer:loaded', (data) => {
  console.log('PDF loaded:', data.totalPages, 'pages');
});

app.events.on('pdfviewer:page-changed', (data) => {
  console.log('Page', data.currentPage, 'of', data.totalPages);
});

app.events.on('pdfviewer:scale-changed', (data) => {
  console.log('Zoom changed to', data.newScale);
});

app.events.on('pdfviewer:error', (data) => {
  console.error('PDF error:', data.error);
});
```

### Action Handlers (EventDelegate)

Navigation actions:
- `data-action="first-page"` - Go to first page
- `data-action="prev-page"` - Previous page
- `data-action="next-page"` - Next page
- `data-action="last-page"` - Go to last page
- `data-change-action="page-input"` - Page number input

Zoom actions:
- `data-action="zoom-in/out"` - Zoom controls
- `data-action="fit-page"` - Fit page to view
- `data-action="fit-width"` - Fit width to view
- `data-action="actual-size"` - 100% zoom

Utility actions:
- `data-action="download"` - Download PDF
- `data-action="print"` - Print document

### Keyboard Shortcuts

The PDFViewer supports these keyboard shortcuts:
- `←` / `Page Up` - Previous page
- `→` / `Page Down` - Next page  
- `Home` - First page
- `End` - Last page
- `Ctrl/Cmd + +` - Zoom in
- `Ctrl/Cmd + -` - Zoom out
- `Ctrl/Cmd + 0` - Fit page

### Static Dialog Method

```javascript
const viewer = await PDFViewer.showDialog('document.pdf', {
  title: 'My Document',
  showControls: true,
  allowZoom: true,
  size: 'fullscreen'
});
```

### Usage Example

```javascript
class DocumentView extends View {
  async handleActionViewPdf(event, element) {
    const pdfUrl = element.getAttribute('data-pdf-url');
    const title = element.getAttribute('data-title');
    
    await PDFViewer.showDialog(pdfUrl, {
      title: title,
      showControls: true
    });
  }
  
  async createPdfViewer() {
    const viewer = new PDFViewer({
      pdfUrl: this.model.get('pdfUrl'),
      title: this.model.get('title'),
      containerId: 'pdf-container'
    });
    
    await viewer.render();
    await viewer.mount();
    
    // Track page views
    this.getApp().events.on('pdfviewer:page-changed', (data) => {
      this.trackPageView(data.currentPage);
    });
    
    return viewer;
  }
}
```

---

## EventBus Integration

All lightbox components integrate with MOJO's EventBus system for loose coupling and event-driven architecture.

### Event Naming Convention

Events follow the pattern: `{component}:{event-type}`

- **ImageViewer**: `imageviewer:loaded`, `imageviewer:scale-changed`, etc.
- **ImageEditor**: `imageeditor:crop-applied`, `imageeditor:filter-changed`, etc.
- **PDFViewer**: `pdfviewer:page-changed`, `pdfviewer:loaded`, etc.

### Global Event Listeners

```javascript
class MediaGalleryPage extends View {
  async onInit() {
    const events = this.getApp().events;
    
    // Listen to all image viewer events
    events.on('imageviewer:loaded', this.onImageLoaded.bind(this));
    events.on('imageviewer:error', this.onImageError.bind(this));
    
    // Listen to editor events
    events.on('imageeditor:filter-changed', this.onFilterChanged.bind(this));
    events.on('imageeditor:crop-applied', this.onCropApplied.bind(this));
    
    // Listen to PDF viewer events
    events.on('pdfviewer:page-changed', this.onPdfPageChanged.bind(this));
  }
  
  onImageLoaded(data) {
    console.log('Image loaded:', data.imageUrl);
    this.updateStats('images_viewed');
  }
  
  onFilterChanged(data) {
    console.log('Filter applied:', data.filter);
    this.updateStats('filters_applied');
  }
  
  onPdfPageChanged(data) {
    console.log('PDF page changed:', data.currentPage);
    this.updateReadingProgress(data);
  }
}
```

---

## CSS Customization

The lightbox components use CSS classes for styling. Import the CSS:

```javascript
import 'web-mojo/lightbox.js'; // Includes CSS automatically
```

### CSS Classes

#### ImageViewer
- `.image-viewer` - Main container
- `.image-viewer-content` - Image content area
- `.image-viewer-controls` - Control buttons
- `.image-viewer-image` - Image element

#### ImageEditor  
- `.image-editor` - Main container
- `.image-editor-toolbar` - Tool buttons
- `.image-editor-filters` - Filter panel
- `.crop-overlay` - Crop selection overlay

#### PDFViewer
- `.pdf-viewer` - Main container
- `.pdf-viewer-toolbar` - Navigation/zoom controls
- `.pdf-canvas` - PDF canvas element

### Custom Styling

```css
/* Custom image viewer theme */
.my-custom-viewer .image-viewer-controls {
  background: rgba(0, 0, 0, 0.9);
  border-radius: 12px;
}

.my-custom-viewer .image-viewer-controls .btn {
  border-color: rgba(255, 255, 255, 0.3);
}

/* Custom editor theme */
.my-custom-editor .image-editor-toolbar {
  background: #2c3e50;
  border-color: #34495e;
}

/* Custom PDF viewer */
.my-custom-pdf .pdf-viewer-content {
  background: #ecf0f1;
}
```

---

## Best Practices

### Performance

1. **Lazy Loading**: Only create viewers when needed
2. **Memory Management**: Always call `destroy()` when done
3. **Image Optimization**: Use appropriate image sizes and formats
4. **PDF.js CDN**: Use CDN for PDF.js to reduce bundle size

### Accessibility

1. **Alt Text**: Always provide meaningful alt text for images
2. **Keyboard Navigation**: Test all functionality with keyboard
3. **Screen Readers**: Use semantic HTML and ARIA labels
4. **Focus Management**: Ensure proper focus flow

### Event Management

1. **EventBus**: Use EventBus for loose coupling between components
2. **Event Cleanup**: Remove event listeners in `onBeforeDestroy()`
3. **Error Handling**: Listen for error events and provide user feedback
4. **State Synchronization**: Use events to keep UI in sync

### Security

1. **URL Validation**: Validate image and PDF URLs
2. **Content-Type**: Check file types on server
3. **File Size**: Limit file sizes to prevent memory issues
4. **CORS**: Configure proper CORS headers for external resources

### Example: Complete Gallery Implementation

```javascript
class MediaGalleryView extends View {
  constructor(options) {
    super(options);
    this.activeViewer = null;
  }
  
  async handleActionViewImage(event, element) {
    const imageUrl = element.getAttribute('data-image-url');
    const imageTitle = element.getAttribute('data-title') || 'Image';
    
    // Close any existing viewer
    if (this.activeViewer) {
      await this.activeViewer.destroy();
    }
    
    // Show new viewer
    this.activeViewer = await ImageViewer.showDialog(imageUrl, {
      title: imageTitle,
      showControls: true,
      allowRotate: true,
      allowZoom: true
    });
  }
  
  async handleActionEditImage(event, element) {
    const imageUrl = element.getAttribute('data-image-url');
    
    const result = await ImageEditor.showDialog(imageUrl, {
      title: 'Edit Image',
      allowCrop: true,
      allowFilters: true
    });
    
    if (result && result.action === 'save') {
      // Handle saved image
      await this.handleImageSave(result.data);
    }
  }
  
  async handleActionViewPdf(event, element) {
    const pdfUrl = element.getAttribute('data-pdf-url');
    const title = element.getAttribute('data-title') || 'Document';
    
    await PDFViewer.showDialog(pdfUrl, {
      title: title,
      showControls: true
    });
  }
  
  async onInit() {
    // Listen for global events
    const events = this.getApp().events;
    
    events.on('imageviewer:loaded', (data) => {
      this.trackMediaView('image', data.imageUrl);
    });
    
    events.on('pdfviewer:loaded', (data) => {
      this.trackMediaView('pdf', data.pdfUrl);
    });
  }
  
  async onBeforeDestroy() {
    // Clean up active viewer
    if (this.activeViewer) {
      await this.activeViewer.destroy();
      this.activeViewer = null;
    }
  }
  
  trackMediaView(type, url) {
    // Analytics tracking
    console.log(`${type} viewed:`, url);
  }
  
  async handleImageSave(imageData) {
    // Handle saving edited image
    // Could upload to server, save locally, etc.
    console.log('Saving edited image:', imageData);
  }
}
```

This comprehensive implementation shows how to use all three lightbox components together in a real application with proper event handling, cleanup, and best practices.