# File Handling

Guide to handling file uploads in WEB-MOJO forms, including base64 encoding, multipart uploads, and file validation.

---

## Quick Start

```javascript
{
  type: 'file',
  name: 'document',
  label: 'Upload Document',
  accept: '.pdf,.doc,.docx',
  fileMode: 'multipart' // or 'base64'
}
```

---

## File Modes

### Base64 Mode (Default)

Files are embedded as base64 strings in JSON:

```javascript
{
  type: 'file',
  name: 'avatar',
  fileMode: 'base64' // Default
}

// Result:
{
  avatar: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

**Pros:**
- Simple JSON payload
- Works with any API
- No special server handling needed

**Cons:**
- 33% larger than original file
- Not suitable for large files (>1MB)
- Can hit JSON size limits

**Best for:** Small files, profile pictures, icons

### Multipart Mode

Files sent as FormData:

```javascript
{
  type: 'file',
  name: 'document',
  fileMode: 'multipart'
}

// Result: FormData object with file
```

**Pros:**
- Efficient for large files
- Standard HTTP file upload
- No size increase

**Cons:**
- Requires FormData-compatible server
- Cannot mix with JSON fields easily

**Best for:** Large files, documents, videos

---

## File Input Types

### Basic File Upload

```javascript
{
  type: 'file',
  name: 'attachment',
  label: 'Attachment',
  accept: '*/*',
  multiple: false
}
```

### Image Upload

```javascript
{
  type: 'image',
  name: 'photo',
  label: 'Photo',
  size: 'md',
  accept: 'image/*',
  fileMode: 'base64'
}
```

### Multiple Files

```javascript
{
  type: 'file',
  name: 'documents',
  label: 'Documents',
  multiple: true,
  accept: '.pdf,.doc,.docx'
}
```

---

## Accepted File Types

### By Extension

```javascript
accept: '.pdf,.doc,.docx,.txt'
```

### By MIME Type

```javascript
accept: 'image/png,image/jpeg,image/gif'
```

### By Category

```javascript
accept: 'image/*'      // All images
accept: 'video/*'      // All videos
accept: 'audio/*'      // All audio
accept: 'application/*' // Documents, etc.
```

### Common Combinations

```javascript
// Images only
accept: 'image/jpeg,image/png,image/gif,image/webp'

// Documents
accept: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx'

// Archives
accept: '.zip,.rar,.7z,.tar,.gz'

// Text files
accept: '.txt,.md,.json,.xml,.csv'
```

---

## File Validation

### Size Validation

```javascript
{
  type: 'file',
  name: 'document',
  validation: {
    file: {
      maxSize: 5 * 1024 * 1024, // 5MB in bytes
      maxSizeMessage: 'File must be less than 5MB'
    }
  }
}
```

### Type Validation

```javascript
{
  type: 'file',
  name: 'image',
  validation: {
    file: {
      types: ['image/jpeg', 'image/png'],
      typesMessage: 'Only JPEG and PNG images allowed'
    }
  }
}
```

### Custom Validation

```javascript
{
  type: 'file',
  name: 'upload',
  validation: {
    custom: (file) => {
      if (!file) return 'File is required';
      
      // Size check
      if (file.size > 10 * 1024 * 1024) {
        return 'File must be less than 10MB';
      }
      
      // Type check
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        return 'Only PDF, JPEG, and PNG files allowed';
      }
      
      // Name check
      if (file.name.length > 100) {
        return 'Filename too long';
      }
      
      return true;
    }
  }
}
```

### Image Dimensions

```javascript
{
  type: 'image',
  name: 'banner',
  validation: {
    custom: async (file) => {
      if (!file) return true;
      
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          if (img.width < 1200 || img.height < 400) {
            resolve('Image must be at least 1200x400px');
          } else if (img.width > 4000 || img.height > 4000) {
            resolve('Image too large (max 4000x4000px)');
          } else {
            resolve(true);
          }
        };
        img.src = URL.createObjectURL(file);
      });
    }
  }
}
```

---

## Handling File Data

### Getting Files (Base64)

```javascript
const data = await form.getFormData();
console.log(data.avatar);
// "data:image/png;base64,iVBORw0KG..."

// Send to server
await fetch('/api/profile', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
});
```

### Getting Files (Multipart)

```javascript
const formData = await form.getFormData();
// formData is a FormData object

// Send to server
await fetch('/api/upload', {
  method: 'POST',
  body: formData // Don't set Content-Type, browser handles it
});
```

### Mixed Mode (Some Files, Some JSON)

```javascript
const form = new FormView({
  formConfig: {
    fields: [
      { type: 'text', name: 'title', label: 'Title' },
      { type: 'file', name: 'document', fileMode: 'multipart' },
      { type: 'image', name: 'thumbnail', fileMode: 'base64' }
    ]
  }
});

// Get data
const data = await form.getFormData();
// data = FormData with:
// - title (string)
// - document (File object)
// - thumbnail (base64 string)
```

---

## Server-Side Handling

### Express.js (Multipart)

```javascript
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

app.post('/api/upload', upload.single('document'), (req, res) => {
  const file = req.file;
  console.log(file.originalname);
  console.log(file.mimetype);
  console.log(file.size);
  
  res.json({ success: true, file: file });
});
```

### Express.js (Base64)

```javascript
app.post('/api/profile', (req, res) => {
  const { avatar } = req.body;
  
  // avatar = "data:image/png;base64,..."
  const matches = avatar.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches) {
    return res.status(400).json({ error: 'Invalid base64' });
  }
  
  const mimeType = matches[1];
  const base64Data = matches[2];
  const buffer = Buffer.from(base64Data, 'base64');
  
  // Save file
  fs.writeFileSync('avatar.png', buffer);
  
  res.json({ success: true });
});
```

---

## File Preview

### Image Preview

```javascript
// Automatic with image field type
{
  type: 'image',
  name: 'photo',
  size: 'md' // Shows preview automatically
}
```

### Custom Preview

```javascript
form.on('field:change:document', (file) => {
  if (file && file.type.startsWith('image/')) {
    const preview = document.getElementById('preview');
    preview.src = URL.createObjectURL(file);
    preview.style.display = 'block';
  }
});
```

---

## Progress Tracking

### Upload Progress

```javascript
form.on('submit', async (data) => {
  const xhr = new XMLHttpRequest();
  
  xhr.upload.addEventListener('progress', (e) => {
    if (e.lengthComputable) {
      const percent = (e.loaded / e.total) * 100;
      console.log(`Upload progress: ${percent}%`);
      updateProgressBar(percent);
    }
  });
  
  xhr.open('POST', '/api/upload');
  xhr.send(data);
});
```

---

## Security Best Practices

### ✅ DO

- Validate file types on server (don't trust client)
- Check file size limits
- Scan for viruses
- Sanitize filenames
- Store files outside web root
- Use unique filenames (prevent overwrites)
- Check file content (magic bytes), not just extension

### ❌ DON'T

- Don't trust client-side validation alone
- Don't allow executable file uploads (.exe, .sh, .bat)
- Don't serve uploaded files directly
- Don't use original filenames
- Don't skip virus scanning
- Don't store sensitive files without encryption

---

## Common Patterns

### Profile Photo Upload

```javascript
{
  type: 'image',
  name: 'avatar',
  label: 'Profile Photo',
  size: 'md',
  accept: 'image/jpeg,image/png',
  fileMode: 'base64',
  validation: {
    file: {
      maxSize: 2 * 1024 * 1024, // 2MB
      types: ['image/jpeg', 'image/png']
    }
  },
  help: 'JPEG or PNG, max 2MB, recommended 400x400px'
}
```

### Document Upload

```javascript
{
  type: 'file',
  name: 'resume',
  label: 'Resume',
  accept: '.pdf,.doc,.docx',
  fileMode: 'multipart',
  validation: {
    required: true,
    file: {
      maxSize: 5 * 1024 * 1024,
      types: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    }
  }
}
```

### Multiple File Attachments

```javascript
{
  type: 'file',
  name: 'attachments',
  label: 'Attachments',
  multiple: true,
  fileMode: 'multipart',
  validation: {
    custom: (files) => {
      if (!files || files.length === 0) return true;
      if (files.length > 10) return 'Maximum 10 files allowed';
      
      const totalSize = Array.from(files).reduce((sum, f) => sum + f.size, 0);
      if (totalSize > 20 * 1024 * 1024) {
        return 'Total size must be less than 20MB';
      }
      
      return true;
    }
  }
}
```

---

## Troubleshooting

### File Not Uploading

**Check file mode:**
```javascript
// Ensure server expects FormData
{ type: 'file', fileMode: 'multipart' }

// Or base64 if server expects JSON
{ type: 'file', fileMode: 'base64' }
```

### Request Too Large

**Use multipart for large files:**
```javascript
// ❌ Bad: Large file as base64
{ type: 'file', name: 'video', fileMode: 'base64' }

// ✅ Good: Use multipart
{ type: 'file', name: 'video', fileMode: 'multipart' }
```

### Server Not Receiving Files

**Check Content-Type:**
```javascript
// ❌ Wrong: Setting Content-Type with FormData
await fetch('/api/upload', {
  headers: { 'Content-Type': 'multipart/form-data' }, // Browser sets this automatically!
  body: formData
});

// ✅ Correct: Let browser set Content-Type
await fetch('/api/upload', {
  body: formData // No headers needed
});
```

---

## Related Documentation

- [BasicTypes.md](./BasicTypes.md#file---file-upload) - File field type
- [inputs/ImageField.md](./inputs/ImageField.md) - Image field component
- [FormView.md](./FormView.md) - FormView API
- [Validation.md](./Validation.md) - File validation
