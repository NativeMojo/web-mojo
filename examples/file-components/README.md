# File Components Examples

This directory contains comprehensive examples demonstrating MOJO Framework's enhanced file handling components: **Enhanced FormBuilder Image Fields** and **FileView Component**.

## Overview

The file components provide a complete solution for handling image uploads and file display in web applications:

- **Enhanced Image Fields**: FormBuilder fields with drag & drop, size variants, and preview functionality
- **FileView Component**: Rich file information display with tabbed interface and metadata support

## Examples

### 1. Complete Demo (`index.html`)

**Comprehensive showcase of all file component features**

- FormBuilder image fields with all size variants (xs, sm, md, lg, xl)
- FileView component displaying both simple URLs and complex file objects
- Integration demo showing workflow from upload to display
- Theme switching and responsive design
- Real-world use cases and configurations

**Features Demonstrated:**
- Size variants comparison
- Drag & drop functionality
- File preview and removal
- Complex file object handling
- Tab-based file information display
- Renditions gallery
- Metadata presentation

### 2. Image Field Focus (`image-field-example.html`)

**Deep dive into FormBuilder image fields**

- All five size variants with visual comparison
- Practical form examples (product management, blog posts)
- Field configuration options (required, disabled, custom placeholders)
- Form data monitoring and display
- Best practices implementation

**Features Demonstrated:**
- Size variant selection guide
- Real-world form scenarios
- Configuration options showcase
- File validation and error handling
- Form integration patterns

### 3. FileView Focus (`fileview-example.html`)

**Detailed FileView component exploration**

- Simple URL file display
- Complex file object presentation
- Size variant effects on preview
- Configuration options (minimal view, no actions)
- Sample data structure examples
- API usage patterns

**Features Demonstrated:**
- Tab organization (Overview, Renditions, Metadata)
- Rendition selection logic
- Metadata formatting with DataFormatter
- Copy URL and download functionality
- Responsive image galleries

## Getting Started

### Prerequisites

- Modern web browser with ES6 module support
- Local web server (for file:// protocol limitations)

### Running the Examples

1. **Development Server** (recommended):
   ```bash
   # From project root
   npm start
   # Navigate to /examples/file-components/
   ```

2. **Simple HTTP Server**:
   ```bash
   # From this directory
   python -m http.server 8080
   # Open http://localhost:8080
   ```

3. **Live Server Extension** (VS Code):
   - Install Live Server extension
   - Right-click on `index.html` → "Open with Live Server"

### Quick Start

1. Open `index.html` for the complete overview
2. Try uploading images using drag & drop or click
3. Explore the FileView tabs to see metadata and renditions
4. Switch themes using the toggle button
5. Check browser console for debugging information

## Key Features Demonstrated

### Enhanced Image Fields

- **Size Variants**: xs (48×48) to xl (300×300) for different use cases
- **Drag & Drop**: Native file drop with visual feedback
- **Preview System**: Automatic image preview with remove buttons
- **File Support**: Both URL strings and complex file objects
- **Validation**: Automatic image type validation and size limits
- **Integration**: Seamless FormBuilder integration with events

### FileView Component

- **Tab Organization**: Overview, Renditions, and Metadata tabs
- **Smart Renditions**: Automatic selection of best image size
- **Rich Metadata**: Formatted display of file information
- **Actions**: Copy URL, download links, responsive galleries
- **Flexible Data**: Supports both simple URLs and complex objects
- **Responsive**: Adapts to different screen sizes and themes

## Usage Patterns

### Basic Image Field
```javascript
{
  type: 'image',
  name: 'photo',
  label: 'Profile Photo',
  size: 'md',
  required: true,
  placeholder: 'Drop your photo here'
}
```

### FileView Display
```javascript
const fileView = new FileView({
  file: fileObject,
  size: 'lg',
  showActions: true,
  showMetadata: true
});

await fileView.mount(container);
```

## File Object Structure

The components work with this file object format:

```javascript
{
  "id": 31,
  "filename": "landscape.jpg",
  "url": "https://example.com/landscape.jpg",
  "file_size": 2557500,
  "content_type": "image/jpeg",
  "category": "image",
  "metadata": {
    "width": 1920,
    "height": 1080,
    "camera": "Canon EOS R5"
  },
  "renditions": {
    "thumbnail": {
      "url": "https://example.com/thumb.jpg",
      "file_size": 25484
    },
    "thumbnail_lg": {
      "url": "https://example.com/thumb_lg.jpg", 
      "file_size": 89230
    }
  }
}
```

## Browser Compatibility

- **Modern browsers** with ES6 module support
- **Chrome 61+**, **Firefox 60+**, **Safari 11+**, **Edge 16+**
- **Mobile browsers** with drag & drop support
- **Bootstrap 5.3** compatible themes

## Development Notes

### Debugging

Open browser DevTools console to see:
- File drop events and validation
- Form value changes
- Component lifecycle events
- Error messages and warnings

### Global Objects

Examples expose debugging objects:
```javascript
// Available in browser console
window.MOJO = {
  FormBuilder,
  FileView,
  dataFormatter,
  sampleFileObject
};
```

### Customization

- Modify CSS custom properties for theming
- Override component templates for custom layouts
- Extend classes for additional functionality
- Add custom validation rules

## Related Documentation

- [Enhanced Image Fields Documentation](../../docs/components/ImageFields.md)
- [FileView Component Documentation](../../docs/components/FileView.md) 
- [FormBuilder Guide](../../docs/guide/Forms.md)
- [TabView Documentation](../../docs/components/TabView.md)

## Troubleshooting

### Common Issues

1. **Files not loading**: Ensure you're using an HTTP server, not file:// protocol
2. **Drag & drop not working**: Check browser compatibility and HTTPS requirements
3. **Images not displaying**: Verify CORS headers for external image URLs
4. **Console errors**: Check for missing dependencies or typos in file paths

### Performance Tips

- Use appropriate image sizes for your use case
- Implement file size limits for uploads
- Consider lazy loading for large file galleries
- Optimize images before upload when possible

## Contributing

To improve these examples:

1. Fork the repository
2. Make your changes in the `examples/file-components/` directory
3. Test across different browsers and screen sizes
4. Submit a pull request with clear descriptions

## License

These examples are part of the MOJO Framework and follow the same license terms.