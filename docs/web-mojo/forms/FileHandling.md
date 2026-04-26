# File Handling

How to upload files and associate them with models in WEB-MOJO.

> **Key principle:** Files are uploaded separately via the `File` model, then the returned file ID is saved to the target model field. This keeps uploads off the main API server and gives you progress tracking for free.

---

## Quick Start — Image Upload (Avatar)

The simplest path for image fields on a model. `Dialog.updateModelImage()` handles the entire flow: pick image → upload via `FileUpload` service → save file ID to model.

```javascript
import Dialog from '@core/views/feedback/Dialog.js';

// model = a User (or any model with an image FK field)
const resp = await Dialog.updateModelImage({
    model: this.model,
    field: 'avatar',          // FK field on the model
    title: 'Change Avatar',
    upload: true,             // use FileUpload (not inline base64)
}, {
    name: 'avatar',
    size: 'lg',
    imageSize: { width: 200, height: 200 },
    placeholder: 'Upload your avatar',
});

if (resp && resp.status === 200) {
    await this.render();      // re-render to show new image
}
```

**What happens internally:**
1. Dialog opens with an `image` field (drag-drop or click to pick).
2. The selected image is converted to a `File` object.
3. `File.upload()` runs the 3-stage initiated upload (initiate → upload to signed URL → confirm).
4. A progress toast appears automatically during upload.
5. The returned file ID is saved to `model.avatar`.

---

## Quick Start — General File Upload

For uploading any file type (documents, videos, archives, etc.) outside of a form context.

```javascript
import { File } from '@core/models/Files.js';

// Get a file from an <input>, drag-drop, or any other source
const file = inputElement.files[0];

const fileModel = new File();
const upload = fileModel.upload({
    file: file,                   // required — HTML File object
    name: file.name,              // optional — custom filename
    group: app.activeGroup?.id,   // optional — associate with a group
    description: 'Quarterly report',  // optional
    showToast: true,              // default true — shows progress toast
});

try {
    await upload;
    // fileModel.id is now the uploaded file's ID
    console.log('Uploaded file ID:', fileModel.id);
} catch (error) {
    console.error('Upload failed:', error.message);
}
```

### Then Associate with a Model

After upload, save the file ID to the model field that holds the FK:

```javascript
// Example: attach a document to a project
await projectModel.save({ document: fileModel.id });
```

That's it — two steps: upload the file, save the ID.

---

## How It Works — The 3-Stage Upload

All file uploads in WEB-MOJO use the **Initiated Upload** flow. The file never passes through the main API server.

```
┌──────────┐       POST /api/fileman/upload/initiate       ┌───────────┐
│  Browser  │ ─────────────────────────────────────────────▶│ API Server│
│           │ ◀───────── { id, upload_url }  ──────────────│           │
│           │                                               └───────────┘
│           │       PUT (raw bytes) to upload_url           ┌───────────┐
│           │ ─────────────────────────────────────────────▶│  Storage  │
│           │ ◀───────── 200 OK ───────────────────────────│ (S3/local)│
│           │                                               └───────────┘
│           │       PATCH /api/fileman/file/{id}            ┌───────────┐
│           │       { action: "mark_as_completed" }         │ API Server│
│           │ ─────────────────────────────────────────────▶│           │
└──────────┘                                                └───────────┘
```

**Stage 1 — Initiate:** POST file metadata (name, size, content type) to the API. The server creates a `File` record and returns `{ id, upload_url }`.

**Stage 2 — Upload:** Upload the raw file bytes directly to `upload_url`. For S3 backends this is a presigned URL — the file goes straight to cloud storage. For local backends it's a token-secured endpoint.

**Stage 3 — Confirm:** PATCH the file record with `{ action: "mark_as_completed" }`. This tells the backend the upload finished successfully.

The `File.upload()` method handles all three stages automatically, including progress tracking and error handling.

---

## Progress Toast

When `showToast: true` (the default), a non-dismissible toast appears showing:
- Filename and file size
- Progress bar with percentage
- Bytes uploaded / total
- Cancel button

The toast auto-hides 2 seconds after success. On failure, an error toast appears instead.

```javascript
// Toast is shown automatically — no extra code needed
const upload = fileModel.upload({
    file: file,
    showToast: true   // default
});

// Or disable it and handle progress yourself
const upload = fileModel.upload({
    file: file,
    showToast: false,
    onProgress: ({ percentage, loaded, total }) => {
        myProgressBar.style.width = `${percentage}%`;
    }
});
```

---

## Complete Examples

### Example 1: Avatar / Profile Image

Using `Dialog.updateModelImage()` — the easiest path for image fields.

```javascript
async onActionChangeAvatar() {
    const resp = await Dialog.updateModelImage({
        model: this.model,
        field: 'avatar',
        title: 'Change Avatar',
        upload: true,
    }, {
        name: 'avatar',
        size: 'lg',
        imageSize: { width: 200, height: 200 },
        placeholder: 'Upload your avatar',
    });

    if (resp && resp.status === 200) {
        await this.render();
    }
}
```

### Example 2: Document Upload via File Picker

A button that opens the native file picker, uploads the selected file, and associates it with a model.

```javascript
import { File } from '@core/models/Files.js';

async onActionUploadDocument() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx,.xls,.xlsx';

    input.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const fileModel = new File();
            await fileModel.upload({
                file: file,
                name: file.name,
                showToast: true,
            });

            // Save the file ID to the parent model
            await this.model.save({ document: fileModel.id });
            app.toast.success('Document uploaded');
            await this.render();
        } catch (error) {
            app.toast.error('Upload failed: ' + error.message);
        } finally {
            input.remove();
        }
    });

    document.body.appendChild(input);
    input.click();
}
```

### Example 3: Drag-and-Drop File Upload

Using `FileDropMixin` to add drop-zone support to any view or page.

```javascript
import TablePage from '@core/pages/TablePage.js';
import { File, FileList } from '@core/models/Files.js';
import applyFileDropMixin from '@core/mixins/FileDropMixin.js';

class DocumentsPage extends TablePage {
    constructor(options = {}) {
        super({
            Collection: FileList,
            // ... columns, etc.
            ...options,
        });

        // Enable drag-and-drop on this page
        this.enableFileDrop({
            acceptedTypes: ['application/pdf', 'image/*'],
            maxFileSize: 50 * 1024 * 1024,  // 50 MB
            multiple: false,
            validateOnDrop: true,
        });
    }

    async onFileDrop(files, event, validation) {
        const file = files[0];

        try {
            const fileModel = new File();
            const upload = fileModel.upload({
                file: file,
                name: file.name,
                group: this.getApp().activeGroup?.id,
                showToast: true,
                onComplete: () => this.refresh(),
            });

            await upload;
        } catch (error) {
            this.showError('Upload failed: ' + error.message);
        }
    }
}

applyFileDropMixin(DocumentsPage);
```

### Example 4: Upload with Custom Progress Callbacks

When you need fine-grained control over the upload lifecycle.

```javascript
import { File } from '@core/models/Files.js';

const fileModel = new File();
const upload = fileModel.upload({
    file: selectedFile,
    name: 'report.pdf',
    group: 7,
    description: 'Monthly report',
    showToast: true,

    onProgress: ({ percentage, loaded, total }) => {
        console.log(`${percentage}% — ${loaded} / ${total} bytes`);
    },
    onComplete: (result) => {
        console.log('Upload done, file ID:', result.id);
    },
    onError: (error) => {
        console.error('Upload failed:', error.message);
    },
});

// upload is thenable — you can also await it
try {
    const result = await upload;
} catch (error) {
    // error handling
}

// Cancel if needed
upload.cancel();
```

### Example 5: Upload Then Associate with Model (Full Pattern)

The complete two-step pattern used in most real features.

```javascript
import { File } from '@core/models/Files.js';

async onActionAttachFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '*/*';

    input.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            // Step 1: Upload the file
            const fileModel = new File();
            await fileModel.upload({
                file: file,
                name: file.name,
                group: this.getApp().activeGroup?.id,
                showToast: true,
            });

            // Step 2: Save the file ID to the parent model
            const resp = await this.model.save({
                attachment: fileModel.id    // FK field on the model
            });

            if (resp.data?.status) {
                this.getApp().toast.success('File attached');
                await this.render();
            }
        } catch (error) {
            this.getApp().toast.error('Failed: ' + error.message);
        } finally {
            input.remove();
        }
    });

    document.body.appendChild(input);
    input.click();
}
```

---

## File.upload() Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `file` | `File` | *required* | HTML `File` object to upload |
| `name` | `string` | `file.name` | Custom filename |
| `group` | `number` | — | Group ID to scope the file to |
| `description` | `string` | — | File description |
| `showToast` | `boolean` | `true` | Show progress toast during upload |
| `onProgress` | `function` | — | Callback: `({ progress, loaded, total, percentage })` |
| `onComplete` | `function` | — | Callback on success: `(fileModel)` |
| `onError` | `function` | — | Callback on failure: `(error)` |

**Returns:** A `FileUpload` instance that is thenable (`await`-able) and supports `.cancel()`.

---

## FileUpload Instance

The object returned by `file.upload()`:

| Method | Description |
|--------|-------------|
| `then(onSuccess, onError)` | Promise interface |
| `catch(onError)` | Promise interface |
| `finally(onFinally)` | Promise interface |
| `cancel()` | Abort the upload. Returns `true` if cancelled, `false` if already done. |
| `isCancelled()` | Check if cancelled |
| `getStats()` | Returns `{ filename, size, type, cancelled, group, description }` |

---

## Inline Base64 (Rare Fallback)

For tiny files (under ~100 KB) where a separate upload round-trip is overkill, you can embed the file as a base64 data URI directly in a JSON save. This is a **fallback** — prefer the initiated upload for everything else.

```javascript
// In a FormView with an image field
const form = new FormView({
    model: this.model,
    fileHandling: 'base64',       // files encoded as data URIs
    formConfig: {
        fields: [
            { type: 'image', name: 'icon', size: 'sm' }
        ]
    }
});

// On submit, icon = "data:image/png;base64,iVBOR..." and is saved
// directly to the model as a string. The backend auto-converts
// base64 data URIs on ForeignKey(File) fields into file records.
```

**When to use base64:**
- Tiny icons or thumbnails under 100 KB
- Fields where a two-step upload would be awkward

**When NOT to use base64:**
- Files over 100 KB (33% size inflation)
- Documents, videos, or any large media
- High-traffic upload flows

---

## Accepted File Types

Control which files users can select with the `accept` attribute on file inputs:

```javascript
// By extension
accept: '.pdf,.doc,.docx,.txt'

// By MIME type
accept: 'image/png,image/jpeg'

// By category
accept: 'image/*'      // All images
accept: 'video/*'      // All videos

// Common combinations
accept: '.pdf,.doc,.docx,.xls,.xlsx'          // Documents
accept: 'image/jpeg,image/png,image/webp'     // Web images
```

---

## File Validation (FileDropMixin)

When using `FileDropMixin`, configure validation in `enableFileDrop()`:

```javascript
this.enableFileDrop({
    acceptedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    maxFileSize: 10 * 1024 * 1024,   // 10 MB
    multiple: false,
    validateOnDrop: true,
});
```

For programmatic validation before upload:

```javascript
const file = inputElement.files[0];

if (file.size > 50 * 1024 * 1024) {
    app.toast.error('File must be under 50 MB');
    return;
}

const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
if (!allowed.includes(file.type)) {
    app.toast.error('Only PDF, JPEG, and PNG files allowed');
    return;
}

// Proceed with upload...
```

---

## Security

- **Always validate on the server.** Client-side `accept` and size checks are UX, not security.
- Upload URLs are signed and time-limited.
- Files upload directly to storage (S3/local) — they never pass through the API server as request body.
- Do not hardcode secrets or storage credentials in client code.

---

## Related Documentation

- [FileUpload System](../services/FileUpload.md) — Full API reference for `FileUpload`, `ProgressView`, and `ToastService.showView()`
- [ImageField](./inputs/ImageField.md) — Image field component with drag-drop and preview
- [FileDropMixin](../mixins/FileDropMixin.md) — Add drag-and-drop to any view
- [Dialog.updateModelImage()](../components/Dialog.md) — One-call image upload + model save
- [File Model](../models/Files.md) — `File` and `FileList` model reference
- [Rest Service](../services/Rest.md) — Low-level `rest.upload()` and `rest.uploadMultipart()` (rarely needed directly)

## Examples

<!-- examples:cross-link begin -->

Runnable, copy-paste reference in the examples portal:

- [`examples/portal/examples/forms/FileMediaFields/FileMediaFieldsExample.js`](../../../examples/portal/examples/forms/FileMediaFields/FileMediaFieldsExample.js) — File upload, image preview, audio/video file inputs.

<!-- examples:cross-link end -->
