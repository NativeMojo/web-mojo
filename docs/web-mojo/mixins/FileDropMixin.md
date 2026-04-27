# FileDropMixin / `applyFileDropMixin`

**Drag-and-drop file handling for any `View`. MIME-type allowlist, size cap, visual feedback, and a single drop callback.**

`applyFileDropMixin(ViewClass)` patches a `View` (or any subclass) so its instances gain `enableFileDrop()`. Once enabled, drops on the view's element fire your `onFileDrop(files, event, validation)` method. The mixin is what `FormView` uses for inline file fields, what `ChatInputView` uses for attaching files to chat messages, and what the admin file-manager page uses for upload zones.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Applying the Mixin](#applying-the-mixin)
- [`enableFileDrop` Options](#enablefiledrop-options)
- [Methods Your View Implements](#methods-your-view-implements)
- [Visual Feedback](#visual-feedback)
- [Common Pitfalls](#common-pitfalls)
- [Related Docs](#related-docs)

## Overview

The mixin attaches `dragenter` / `dragover` / `dragleave` / `drop` listeners to the view's element (or a child selector). It also installs a `preventDefault` listener on `document` so a stray drop outside the zone doesn't navigate the browser to the file. Cleanup runs in `onBeforeDestroy`.

Two ways to use it:

1. **Apply to your custom `View` class once at module load**: `applyFileDropMixin(MyView)`. Every `MyView` instance can then call `enableFileDrop()` and implement `onFileDrop`.
2. **Use the named `FileDropMixin` and merge manually**: `Object.assign(MyView.prototype, FileDropMixin)`. Same effect; useful when you don't want the side effect of calling `applyFileDropMixin`.

The mixin does NOT upload anything — it hands you `File[]` after a drop. Use [`services/FileUpload.md`](../services/FileUpload.md) or your own `Rest` calls to actually move bytes.

## Quick Start

```js
import { View, applyFileDropMixin } from 'web-mojo';

class FileDropZone extends View {
    constructor(options = {}) {
        super({
            template: '<div class="drop-zone p-5 border border-dashed text-center">Drop files here</div>',
            ...options,
        });
    }

    async onInit() {
        await super.onInit();
        this.enableFileDrop({
            acceptedTypes: ['image/*', 'application/pdf'],
            maxFileSize: 5 * 1024 * 1024, // 5 MB
            multiple: true,
        });
    }

    async onFileDrop(files /* File[] */, _event, _validation) {
        for (const file of files) {
            console.log('dropped', file.name, file.size);
            // upload, preview, whatever
        }
    }

    async onFileDropError(err /* Error */, _event, files) {
        console.warn('drop rejected:', err.message, files.map(f => f.name));
    }
}

applyFileDropMixin(FileDropZone);
```

## Applying the Mixin

```js
import { applyFileDropMixin, FileDropMixin } from 'web-mojo';

// Default — patches the prototype:
applyFileDropMixin(MyView);

// Manual — equivalent:
Object.assign(MyView.prototype, FileDropMixin);
```

Idempotent — safe to call twice on the same class. Patches happen at the prototype level, so all instances (existing and future) get `enableFileDrop`.

## `enableFileDrop` Options

```js
this.enableFileDrop({
    acceptedTypes,       // string[]. MIME types or wildcards. Default ['*/*'] (any).
                         //  e.g. ['image/png', 'image/jpeg'] or ['image/*']
    maxFileSize,         // number (bytes). Default 10 MB (10 * 1024 * 1024).
    multiple,            // boolean. Allow multiple files. Default false (only first dropped file is processed).
    dropZoneSelector,    // string. CSS selector for a child element to use as the drop zone.
                         //  Default null = use the view's root element.
    validateOnDrop,      // boolean. Run type/size validation before calling onFileDrop. Default true.
    visualFeedback,      // boolean. Toggle classes on drag over. Default true.
    dragOverClass,       // string. Class added to drop zone while dragging over. Default 'drag-over'.
    dragActiveClass,     // string. Class added to drop zone for the entire drag operation. Default 'drag-active'.
});
```

Call `enableFileDrop` in `onInit()`. If the view hasn't rendered yet, the mixin queues setup until `onAfterRender`. After render it attaches listeners immediately.

## Methods Your View Implements

The mixin calls these on your view if they exist:

| Method | Signature | Purpose |
|---|---|---|
| `onFileDrop(files, event, validation)` | `(File[], DragEvent, { valid, errors })` | **Required.** Called once per drop with the validated files. `validation.valid` is always `true` here when `validateOnDrop: true` (rejected drops route to `onFileDropError` instead). |
| `onFileDropError(error, event, files)` | `(Error, DragEvent, File[])` | **Optional.** Called when validation fails (type or size) OR when `onFileDrop` throws. If absent, validation errors are silently dropped and `onFileDrop` errors are `console.error`'d. |

Both methods may be `async` — the mixin awaits them.

## Visual Feedback

When `visualFeedback: true` (default), the mixin toggles two classes on the drop-zone element:

- `drag-over` (configurable via `dragOverClass`) — added while a drag is hovering. Use this for the highlight color.
- `drag-active` (configurable via `dragActiveClass`) — added for the entire drag operation. Useful for "this is a drop target" pulsing.

Style them yourself in your view's CSS or in your app shell:

```css
.drop-zone.drag-over {
    background: #e7f1ff;
    border-color: #0d6efd;
}
.drop-zone.drag-active {
    box-shadow: 0 0 0 4px rgba(13, 110, 253, 0.15);
}
```

Set `visualFeedback: false` to disable the class toggles entirely (useful when you want full manual control).

## Common Pitfalls

- **`enableFileDrop` must be called from your view.** Applying the mixin alone doesn't enable drops — it adds the method. Call `this.enableFileDrop({…})` in `onInit()`.
- **`onFileDrop` must exist on the view.** If absent, the mixin logs a warning on each drop and discards the files. The mixin doesn't auto-add a default handler.
- **`document`-level `preventDefault` is intentional.** Without it, a missed drop somewhere else on the page navigates the browser to the file. The mixin removes the document listener on `onBeforeDestroy` — don't disable cleanup or you'll leak global listeners.
- **`multiple: false` (default) keeps only the first file.** Dropping ten files calls `onFileDrop` with one. Set `multiple: true` for multi-file zones.
- **Type matching is loose.** `'image/*'` matches every `image/...` MIME. Exact matches require the full type string (`'image/png'`). The browser sets the type from the OS file association — text files often arrive as `text/plain`, sometimes as `''`.
- **No client-side enforcement of the `accept` HTML attribute.** The mixin validates types after drop; the OS picker doesn't know about `acceptedTypes`. For a click-to-pick fallback, set `<input type="file" accept="image/*">` separately.
- **Disabling `validateOnDrop` skips ALL checks.** Including size. Your `onFileDrop` becomes responsible for both.

## Related Docs

- [`core/View.md`](../core/View.md) — base class. The mixin patches its prototype.
- [`services/FileUpload.md`](../services/FileUpload.md) — what to do with the files after a drop (upload + progress).
- [`forms/FileHandling.md`](../forms/FileHandling.md) — how `FormView` integrates with this mixin for file fields.
- [`components/ProgressView.md`](../components/ProgressView.md) — render upload progress for the dropped files.
