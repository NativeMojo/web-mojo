# ImageField Component

Enhanced image upload with drag-and-drop, instant preview, and multiple size options. Perfect for profile photos, featured images, and galleries.

**Field Type:** `image`

---

## Quick Start

```javascript
{
  type: 'image',
  name: 'avatar',
  label: 'Profile Photo',
  size: 'md',
  allowDrop: true
}
```

---

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | string | **required** | Field name |
| `label` | string | - | Field label |
| `size` | string | `'md'` | Preview size: `'xs'`, `'sm'`, `'md'`, `'lg'`, `'xl'` |
| `accept` | string | `'image/*'` | Accepted file types |
| `allowDrop` | boolean | `true` | Enable drag & drop |
| `placeholder` | string | `'Drop image...'` | Placeholder text |
| `value` | string/object | - | Initial image URL or file object |
| `required` | boolean | `false` | Require image upload |

---

## Size Options

| Size | Dimensions | Best For |
|------|------------|----------|
| `xs` | 48×48px | Thumbnails, small icons |
| `sm` | 96×96px | Small avatars, list items |
| `md` | 150×150px | Profile pictures (default) |
| `lg` | 200×200px | Featured images |
| `xl` | 300×300px | Hero images, banners |

---

## Usage Examples

### Profile Photo

```javascript
{
  type: 'image',
  name: 'avatar',
  label: 'Profile Photo',
  size: 'md',
  accept: 'image/jpeg,image/png',
  placeholder: 'Click or drop your photo here',
  help: 'JPEG or PNG, recommended 400x400px'
}
```

### Featured Image

```javascript
{
  type: 'image',
  name: 'featured_image',
  label: 'Featured Image',
  size: 'lg',
  required: true,
  help: 'Main image for this article'
}
```

### Multiple Sizes

```javascript
fields: [
  {
    type: 'image',
    name: 'thumbnail',
    label: 'Thumbnail',
    size: 'sm',
    colClass: 'col-md-4'
  },
  {
    type: 'image',
    name: 'preview',
    label: 'Preview',
    size: 'md',
    colClass: 'col-md-4'
  },
  {
    type: 'image',
    name: 'hero',
    label: 'Hero Image',
    size: 'lg',
    colClass: 'col-md-4'
  }
]
```

---

## Value Handling

### String URL

```javascript
{
  type: 'image',
  name: 'photo',
  value: 'https://example.com/photo.jpg'
}
```

### File Object with Renditions

```javascript
{
  type: 'image',
  name: 'photo',
  value: {
    url: 'https://example.com/photo.jpg',
    renditions: {
      thumbnail: { url: 'https://example.com/photo_thumb.jpg' },
      medium: { url: 'https://example.com/photo_med.jpg' },
      large: { url: 'https://example.com/photo_large.jpg' }
    }
  }
}
// Automatically uses appropriate rendition based on size
```

### Getting Uploaded File

```javascript
const data = await form.getFormData();
console.log(data.avatar); // File object or base64 string
```

---

## File Mode

Like the `file` field type, image fields support `fileMode`:

```javascript
{
  type: 'image',
  name: 'banner',
  label: 'Banner Image',
  size: 'xl',
  fileMode: 'base64' // or 'multipart'
}
```

**Base64 (default):** Image embedded as base64 string  
**Multipart:** Use FormData for upload (better for large files)

---

## Features

### Drag & Drop

Users can drag images directly onto the preview area:
- Hover feedback shows drop zone
- Instant preview after drop
- Works with file manager drag

### Remove Button

Uploaded images show an overlay remove button:
- Click × to remove image
- Resets to placeholder state
- Can upload new image

### Preview

Instant visual feedback:
- Image shown immediately after selection
- Maintains aspect ratio
- Object-fit cover for consistent sizing

### Renditions

Automatic size selection:
- `xs`: Uses `thumbnail_sm` or `square_sm`
- `sm`: Uses `thumbnail` or `thumbnail_sm`
- `md`: Uses `thumbnail_md` or `thumbnail`
- `lg`: Uses `thumbnail_lg` or `thumbnail_md`
- `xl`: Uses `original` or `thumbnail_lg`

---

## Validation

```javascript
{
  type: 'image',
  name: 'profile_photo',
  label: 'Profile Photo',
  required: true,
  validation: {
    required: true,
    file: {
      maxSize: 5 * 1024 * 1024, // 5MB
      types: ['image/jpeg', 'image/png'],
      dimensions: {
        minWidth: 200,
        minHeight: 200,
        maxWidth: 4000,
        maxHeight: 4000
      }
    },
    custom: (file) => {
      if (!file) return 'Photo is required';
      
      if (file.size > 5 * 1024 * 1024) {
        return 'Image must be less than 5MB';
      }
      
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        return 'Only JPEG, PNG, and WebP images allowed';
      }
      
      return true;
    }
  }
}
```

---

## Styling

```css
/* Custom image field styling */
.image-field-container {
  border: 2px dashed var(--bs-border-color);
  border-radius: 0.5rem;
  transition: border-color 0.2s;
}

.image-field-container.droppable:hover {
  border-color: var(--bs-primary);
  background-color: var(--bs-primary-bg-subtle);
}

.image-field-container img {
  object-fit: cover;
  width: 100%;
  height: 100%;
}
```

---

## Events

```javascript
// Image selected
form.on('field:change:avatar', (file) => {
  console.log('Image selected:', file.name);
});

// Image removed
form.on('field:clear:avatar', () => {
  console.log('Image removed');
});
```

---

## Integration with Model

```javascript
const user = new Model({
  name: 'John Doe',
  avatar: {
    url: 'https://example.com/avatar.jpg',
    renditions: {
      thumbnail: { url: 'https://example.com/avatar_thumb.jpg' }
    }
  }
});

const form = new FormView({
  model: user,
  formConfig: {
    fields: [
      { type: 'text', name: 'name', label: 'Name' },
      { type: 'image', name: 'avatar', label: 'Avatar', size: 'md' }
    ]
  }
});

// Avatar automatically displayed from model
// On submit, new avatar included in save data
```

---

## Common Patterns

### Gallery Upload

```javascript
fields: [
  { type: 'image', name: 'image1', label: 'Image 1', size: 'lg' },
  { type: 'image', name: 'image2', label: 'Image 2', size: 'lg' },
  { type: 'image', name: 'image3', label: 'Image 3', size: 'lg' }
]
```

### Profile with Thumbnail

```javascript
{
  type: 'group',
  title: 'Profile Photo',
  columns: 12,
  fields: [
    {
      type: 'image',
      name: 'avatar',
      size: 'sm',
      colClass: 'col-auto'
    },
    {
      type: 'html',
      html: '<p class="text-muted mb-0">Upload a square photo for best results. Minimum 200x200px.</p>',
      colClass: 'col'
    }
  ]
}
```

---

## Related Documentation

- [BasicTypes.md](../BasicTypes.md#file---file-upload) - Basic file upload
- [FileHandling.md](../FileHandling.md) - File upload details
- [FieldTypes.md](../FieldTypes.md) - All field types
