# Enhanced Image Fields

FormBuilder's enhanced image fields provide a rich, user-friendly way to handle image uploads with drag-and-drop support, multiple size variants, and automatic preview generation.

## Table of Contents

- [Overview](#overview)
- [Size Variants](#size-variants)
- [Basic Usage](#basic-usage)
- [Drag & Drop Support](#drag--drop-support)
- [Configuration Options](#configuration-options)
- [File Object Support](#file-object-support)
- [Event Handling](#event-handling)
- [Styling & Theming](#styling--theming)
- [Examples](#examples)
- [API Reference](#api-reference)
- [Best Practices](#best-practices)

## Overview

Enhanced image fields extend FormBuilder's capabilities with:

- **Size variants**: Choose from xs, sm, md, lg, xl for different use cases
- **Drag & drop**: Native file drop support with visual feedback
- **Preview system**: Automatic image preview with remove functionality
- **File objects**: Support for both URL strings and complex file objects with renditions
- **Accessibility**: Full keyboard and screen reader support
- **Responsive design**: Adapts to different screen sizes

## Size Variants

Image fields support five size variants, each optimized for different use cases:

| Size | Dimensions | Use Case | Example |
|------|------------|----------|---------|
| `xs` | 48×48px | Avatars, icons, small thumbnails | User profile pictures |
| `sm` | 96×96px | Small previews, list thumbnails | Product thumbnails |
| `md` | 150×150px | Medium previews (default) | Gallery images |
| `lg` | 200×200px | Large previews, featured images | Hero images |
| `xl` | 300×300px | Extra large previews, detailed views | Product showcases |

### Visual Size Comparison

```javascript
// Avatar (xs) - Perfect for user profiles
{
  type: 'image',
  name: 'avatar',
  size: 'xs',
  label: 'Profile Picture'
}

// Product thumbnail (sm) - Great for listings
{
  type: 'image', 
  name: 'thumbnail',
  size: 'sm',
  label: 'Product Thumbnail'
}

// Hero image (lg) - Featured content
{
  type: 'image',
  name: 'hero',
  size: 'lg', 
  label: 'Featured Image'
}
```

## Basic Usage

### Simple Image Field

```javascript
const form = new FormBuilder({
  fields: [{
    type: 'image',
    name: 'profile_image',
    label: 'Profile Image',
    size: 'md',
    required: true
  }]
});
```

### Multiple Image Fields

```javascript
const form = new FormBuilder({
  fields: [
    {
      type: 'image',
      name: 'hero_image',
      label: 'Hero Image',
      size: 'lg',
      required: true,
      help: 'Main image for the post (1200×800px recommended)'
    },
    {
      type: 'image',
      name: 'thumbnail',
      label: 'Thumbnail',
      size: 'sm',
      help: 'Small preview image for listings'
    },
    {
      type: 'image',
      name: 'gallery_image',
      label: 'Gallery Image',
      size: 'md'
    }
  ]
});
```

## Drag & Drop Support

Image fields automatically support drag-and-drop functionality through FileDropMixin integration:

### Features

- **Visual feedback**: Fields highlight when dragging files over them
- **File validation**: Only accepts image files by default
- **Size limits**: Configurable maximum file size (default: 10MB)
- **Error handling**: User-friendly error messages for invalid files

### Behavior

1. **Drag Enter**: Field highlights with primary color border
2. **Drag Over**: Enhanced highlight with success color
3. **Drop**: File is processed and preview is shown
4. **Error**: Invalid files show error message

### Customizing Drop Behavior

```javascript
// Custom file validation happens automatically
// Fields only accept image/* MIME types
// Maximum file size: 10MB (configurable at framework level)
```

## Configuration Options

### Core Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `size` | string | `'md'` | Size variant: xs, sm, md, lg, xl |
| `allowDrop` | boolean | `true` | Enable drag & drop functionality |
| `placeholder` | string | Auto-generated | Custom placeholder text |
| `accept` | string | `'image/*'` | File type restrictions |
| `required` | boolean | `false` | Make field required |
| `disabled` | boolean | `false` | Disable the field |
| `help` | string | - | Help text below field |
| `label` | string | - | Field label |

### Example with All Options

```javascript
{
  type: 'image',
  name: 'banner_image',
  label: 'Website Banner',
  size: 'xl',
  required: true,
  allowDrop: true,
  placeholder: 'Drop your banner image here (PNG/JPG preferred)',
  accept: 'image/png,image/jpeg',
  help: 'Upload a banner image. Recommended size: 1200×400px. Max file size: 10MB.',
  class: 'custom-image-field'
}
```

## File Object Support

Image fields can display both simple URLs and complex file objects:

### Simple URL String

```javascript
// Form field value as URL string
fieldValue = "https://example.com/image.jpg"
```

### Complex File Object

```javascript
// Form field value as file object with renditions
fieldValue = {
  id: 31,
  filename: "landscape.jpg",
  url: "https://example.com/landscape.jpg",
  file_size: 2557500,
  content_type: "image/jpeg",
  renditions: {
    thumbnail: {
      url: "https://example.com/landscape_thumb.jpg",
      file_size: 25484
    },
    thumbnail_lg: {
      url: "https://example.com/landscape_large.jpg", 
      file_size: 89230
    }
  }
}
```

### Rendition Selection

The field automatically selects the best rendition based on size:

- **xs**: `thumbnail_sm`, `thumbnail`, `square_sm`
- **sm**: `thumbnail`, `thumbnail_sm`, `square_sm`  
- **md**: `thumbnail_md`, `thumbnail`, `thumbnail_lg`
- **lg**: `thumbnail_lg`, `thumbnail_md`, `thumbnail`
- **xl**: `original`, `thumbnail_lg`

## Event Handling

### Form Events

Image fields integrate with FormBuilder's event system:

```javascript
const form = new FormBuilder({
  fields: [
    {
      type: 'image',
      name: 'photo',
      size: 'lg'
    }
  ]
});

// Listen for file changes
form.on('change', (data) => {
  if (data.field === 'photo') {
    console.log('Photo changed:', data.value);
  }
});

// Handle form submission
form.on('submit', (data) => {
  console.log('Form submitted with images:', data.values);
});
```

### File Drop Events

```javascript
// Override file drop behavior if needed
form.onFileDrop = async (files, event, validation) => {
  console.log('Files dropped:', files);
  // Custom handling here
};

form.onFileDropError = async (error, event, files) => {
  console.log('Drop error:', error.message);
  // Custom error handling
};
```

## Styling & Theming

### CSS Classes

Image fields use these CSS classes for styling:

```css
/* Container classes */
.image-field-container { /* Main container */ }
.image-field-xs { /* Extra small variant */ }
.image-field-sm { /* Small variant */ }
.image-field-md { /* Medium variant */ }
.image-field-lg { /* Large variant */ }
.image-field-xl { /* Extra large variant */ }

/* Drop zone classes */
.image-drop-zone { /* Drop area */ }
.image-drop-zone.droppable { /* When drop is enabled */ }
.image-drop-zone.drag-over { /* During drag over */ }
.image-drop-zone.drag-active { /* When drag is active */ }
```

### Custom Styling

```css
/* Custom styling example */
.my-custom-image-field .image-field-container {
  border: 2px solid var(--bs-primary);
  border-radius: 1rem;
}

.my-custom-image-field .image-drop-zone:hover {
  background-color: var(--bs-primary-bg-subtle);
}
```

### Dark Theme Support

Image fields automatically adapt to Bootstrap's dark theme:

```html
<html data-bs-theme="dark">
  <!-- Image fields will use dark theme colors -->
</html>
```

## Examples

### User Profile Form

```javascript
const profileForm = new FormBuilder({
  fields: [
    {
      type: 'text',
      name: 'full_name',
      label: 'Full Name',
      required: true
    },
    {
      type: 'image',
      name: 'avatar',
      label: 'Profile Picture',
      size: 'sm',
      placeholder: 'Upload your profile picture',
      help: 'Square images work best. Max 5MB.'
    },
    {
      type: 'image',
      name: 'cover_photo',
      label: 'Cover Photo',
      size: 'lg',
      help: 'Wide landscape images recommended (1200×400px)'
    }
  ]
});
```

### Product Management Form

```javascript
const productForm = new FormBuilder({
  fields: [
    {
      type: 'text',
      name: 'product_name',
      label: 'Product Name',
      required: true
    },
    {
      type: 'image',
      name: 'main_image',
      label: 'Main Product Image',
      size: 'xl',
      required: true,
      help: 'High-quality product photo (1200×1200px recommended)'
    },
    {
      type: 'image',
      name: 'thumbnail',
      label: 'Thumbnail',
      size: 'sm',
      help: 'Small image for product listings'
    },
    {
      type: 'image',
      name: 'gallery_1',
      label: 'Gallery Image 1',
      size: 'lg'
    },
    {
      type: 'image',
      name: 'gallery_2', 
      label: 'Gallery Image 2',
      size: 'lg'
    }
  ]
});
```

### Blog Post Form

```javascript
const blogForm = new FormBuilder({
  fields: [
    {
      type: 'text',
      name: 'title',
      label: 'Post Title',
      required: true
    },
    {
      type: 'image',
      name: 'featured_image',
      label: 'Featured Image',
      size: 'lg',
      required: true,
      placeholder: 'Drop your featured image here',
      help: 'This image will appear at the top of your blog post'
    },
    {
      type: 'textarea',
      name: 'content',
      label: 'Post Content',
      rows: 8,
      required: true
    }
  ]
});
```

## API Reference

### Field Configuration

```javascript
{
  type: 'image',                    // Required: Field type
  name: 'field_name',              // Required: Field name
  label: 'Display Label',          // Optional: Field label
  size: 'md',                      // Optional: Size variant
  required: false,                 // Optional: Required field
  disabled: false,                 // Optional: Disabled state
  allowDrop: true,                 // Optional: Enable drag & drop
  placeholder: 'Custom text',      // Optional: Custom placeholder
  accept: 'image/*',               // Optional: File type filter
  help: 'Help text',               // Optional: Help text
  class: 'custom-class',           // Optional: Additional CSS class
  attributes: {                    // Optional: Additional HTML attributes
    'data-custom': 'value'
  }
}
```

### FormBuilder Methods

```javascript
// Get field value (File object or URL string)
const value = form.getValues().field_name;

// Set field value (URL string or file object)
form.setValues({ field_name: 'https://example.com/image.jpg' });

// Clear field value
form.setValues({ field_name: null });

// Check if field has value
const hasValue = form.getValues().field_name != null;
```

### Access File Input Element

```javascript
// Get the actual file input element
const fileInput = form.element.querySelector('input[name="field_name"]');

// Access selected files
if (fileInput.files.length > 0) {
  const file = fileInput.files[0];
  console.log('Selected file:', file.name, file.size);
}
```

## Best Practices

### 1. Choose Appropriate Sizes

- **xs**: User avatars, small icons
- **sm**: Product thumbnails, list items  
- **md**: General purpose images
- **lg**: Featured images, hero shots
- **xl**: Detailed product views, galleries

### 2. Provide Clear Labels and Help Text

```javascript
{
  type: 'image',
  name: 'product_photo',
  label: 'Product Photo',
  size: 'lg',
  help: 'Upload a high-quality product image. Recommended: 1200×1200px, JPG or PNG format.'
}
```

### 3. Use Validation Appropriately

```javascript
// Make important images required
{
  type: 'image',
  name: 'profile_picture',
  required: true,
  size: 'sm'
}

// Provide helpful placeholder text
{
  type: 'image', 
  name: 'logo',
  placeholder: 'Upload your company logo (PNG with transparent background preferred)'
}
```

### 4. Handle File Objects Properly

```javascript
// When working with server responses
form.on('submit', async (data) => {
  // data.values.image_field might contain:
  // - FileList object (from user selection)
  // - File object (from drag & drop)
  // - URL string (from setValue)
  // - Complex file object (from server)
  
  const imageValue = data.values.image_field;
  
  if (imageValue instanceof FileList || imageValue instanceof File) {
    // Handle file upload
    await uploadFile(imageValue);
  } else if (typeof imageValue === 'string') {
    // Handle URL
    console.log('Image URL:', imageValue);
  } else if (imageValue && imageValue.url) {
    // Handle file object
    console.log('File object:', imageValue);
  }
});
```

### 5. Accessibility Considerations

- Always provide descriptive labels
- Use help text for upload instructions
- Ensure keyboard navigation works
- Test with screen readers

### 6. Performance Tips

- Use appropriate image sizes for your use case
- Implement file size limits
- Consider image optimization before upload
- Use progressive loading for large galleries

### 7. Error Handling

```javascript
form.on('error', (data) => {
  if (data.field && data.field.includes('image')) {
    // Handle image-specific errors
    console.log('Image upload error:', data.message);
    // Show user-friendly error message
  }
});
```
