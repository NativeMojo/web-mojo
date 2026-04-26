# FileView Component

FileView is the canonical viewer for `fileman` File records. It pairs a compact header (thumbnail, filename, size, type, status, public/private indicator, action menu) with a `SideNavView` that switches between category-specific sections: **Preview**, **Details**, **Renditions**, and **Metadata**.

The **Preview** section is driven by the backend `category` field (`image`, `video`, `audio`, `pdf`, `document`, `spreadsheet`, `presentation`, `archive`, `other`). Each category gets a purpose-built preview — inline image, native `<video>`/`<audio>` player, PDF viewer via the optional lightbox extension, or a download-focused card for document/archive/other types.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Sections](#sections)
- [Category-Driven Preview](#category-driven-preview)
- [Actions (ContextMenu)](#actions-contextmenu)
- [Events](#events)
- [Extension Dependencies](#extension-dependencies)
- [Public API](#public-api)
- [Common Pitfalls](#common-pitfalls)
- [Related Docs](#related-docs)

## Overview

- **Model-first** — pass a `File` model (`web-mojo/models`). The component reads everything via `this.model.get(...)` and delegates REST calls to the model.
- **SideNavView layout** — matches UserView / IncidentView / GroupView for consistent admin UX. Collapses to a dropdown at narrow widths.
- **Conditional sections** — Renditions is hidden when the backend returned no renditions. Metadata is hidden when `model.metadata` is empty.
- **Graceful extension fallback** — image and pdf previews light up when `LightboxGallery` / `PDFViewer` are registered (via the lightbox extension). When they're not, actions fall back to opening the file URL in a new tab.

## Quick Start

```javascript
import { File } from 'web-mojo/models';
import { FileView } from 'web-mojo';

// Load and view a file
const file = new File({ id: 42 });
await file.fetch();

const view = new FileView({ model: file });
await view.mount(container);
```

`FileTablePage` already wires this up automatically via `File.VIEW_CLASS = FileView` — clicking a row opens the file in a dialog.

### Constructor options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `model` | `File` | — | The `File` model to display. |
| `data` | `object` | `{}` | Raw file data — used only when `model` is not supplied. The component wraps it in a new `File` model internally. |

> **Breaking from earlier versions:** the old component accepted a `file` option (URL string or plain object), `size: 'xs'..'xl'` variants, and `showActions` / `showMetadata` / `showRenditions` toggles. Those are gone — the new component is opinionated and always reads from a `File` model.

## Sections

| Key | Title | Always visible? | Contents |
|-----|-------|-----------------|----------|
| `preview` | Preview | yes — default active | Category-aware preview (see next section) |
| `details` | Details | yes | `DataView` of the file's core fields (id, filename, sizes, timestamps, storage info, public URL) |
| `renditions` | Renditions | yes | Card gallery of rendition previews (inline image tiles, video posters, or category icons) with per-card **Preview / Copy URL / Download** actions. Section header offers Refresh and Regenerate. Shows a "processing…" placeholder when the backend is still generating, or "upload pending" while the upload is in flight. |
| `metadata` | Metadata | only when `model.metadata` is non-empty | `DataView` auto-generated from the `metadata` object (image EXIF, video duration, renderer-specific fields, etc.) |

### Async renditions

The backend generates renditions asynchronously on the `renditions` worker channel. Immediately after `upload_status` flips to `completed`, the `renditions` map is often empty `{}` — image renditions usually land within seconds; video transcodes can take minutes.

FileView handles this automatically:

1. On mount, if `model.isRenditionsProcessing()` is true, a background poll (`model.fetch()` every 5s, up to 5 minutes) runs until the map populates or the cap is hit. Each successful fetch emits `change` on the model; the Preview and Renditions sections re-render themselves to pick up the new URLs.
2. The Renditions section shows a spinner placeholder with a manual **Refresh** button for users who want to check immediately.
3. A **Regenerate Previews** ContextMenu action POSTs `{ action: 'regenerate_renditions' }` to the file endpoint, then restarts the poll. Uses `File.regenerateRenditions(roles?)` under the hood.

The poll is cancelled in `onBeforeDestroy` so closing the dialog leaves no pending timers.

## Category-Driven Preview

The Preview section branches on `File.getCategory()`, which returns the backend's `category` field and falls back to inferring from `content_type` when the field is missing.

| Category | Icon | Preview |
|----------|------|---------|
| `image` | `bi-image` | `<img>` at the best image rendition; click opens the lightbox gallery (includes original + all image renditions) |
| `video` | `bi-camera-video` | Native `<video controls>` with poster from the thumbnail rendition |
| `audio` | `bi-music-note-beamed` | Native `<audio controls>` with filename label |
| `pdf` | `bi-file-earmark-pdf` | Icon card with "Open PDF Viewer" + "Download" buttons |
| `document` | `bi-file-earmark-text` | Image rendition (when available) + Open + Download buttons |
| `spreadsheet` | `bi-file-earmark-spreadsheet` | Same as document |
| `presentation` | `bi-file-earmark-slides` | Same as document |
| `archive` | `bi-file-earmark-zip` | Archive icon + Download button |
| `other` | `bi-file-earmark` | Generic icon + Download button |

## Actions (ContextMenu)

The three-dots menu in the header exposes:

| Action | Handler | Effect |
|--------|---------|--------|
| `view-file` | `onActionViewFile` | Opens category-specific viewer (Lightbox / PDFViewer / `window.open`) |
| `download-file` | `onActionDownloadFile` | Synthetic `<a download>` click against the file URL |
| `copy-url` | `onActionCopyUrl` | Writes the file URL to the clipboard, toasts success/failure |
| `edit-file` | `onActionEditFile` | Opens `Dialog.showModelForm({ formConfig: FileForms.edit })`; re-renders on save |
| `make-public` / `make-private` | `onActionMakePublic` / `onActionMakePrivate` | `model.save({ is_public: true/false })`; menu item flips on next render |
| `regenerate-renditions` | `onActionRegenerateRenditions` | Confirms, then POSTs `{ action: 'regenerate_renditions' }` and (re)starts the rendition poll |
| `delete-file` | `onActionDeleteFile` | `Dialog.confirm` → `model.destroy()` → emits `file:deleted` on success |

## Events

- `file:deleted` — emitted after a successful delete, payload `{ model }`. `FileTablePage` listens to close the view dialog and refresh the table.

## Extension Dependencies

FileView accesses the optional lightbox extension via the plugin registry rather than importing it statically. This keeps `web-mojo` / `web-mojo.lite` bundles free of `LightboxGallery` and `PDFViewer` when they aren't needed.

- `window.MOJO.plugins.LightboxGallery` — used for image View action (registered by `src/extensions/lightbox/index.js`)
- `window.MOJO.plugins.PDFViewer` — used for pdf View action (same)

When the lightbox extension isn't loaded, the View action falls back to `window.open(url, '_blank')`. Behavior is identical to `FilePreviewView` in this respect.

## Public API

### Methods

```javascript
await view.showSection(key);      // Switch to a section ('preview'|'details'|'renditions'|'metadata')
view.getActiveSection();           // → current section key
```

### Used `File` model helpers

The component relies on these helpers on `File`:

- `getCategory()` — backend `category` with content_type fallback
- `hasRenditions()`
- `isRenditionsProcessing()` — true when `upload_status === 'completed'` but renditions is empty
- `getRenditions()` — returns renditions as an array
- `getBestImageRendition()` — largest-area image rendition
- `getThumbnailUrl()` — prefers `renditions.thumbnail`, falls back to best image rendition
- `regenerateRenditions(roles?)` — POSTs `{ action: 'regenerate_renditions', roles? }`; returns the save promise

## Common Pitfalls

- ⚠️ **Always pass a `File` model.** The component expects `this.model.get(...)` and `this.model.hasRenditions()` to work. Raw data objects go through the `data` option so the component can wrap them in a `File` for you.
- ⚠️ **Renditions and Metadata sections are conditional.** If you expect them and they aren't there, check that the backend actually returned `renditions` / `metadata` in its response (use `?graph=default` or `?graph=detailed`).
- ⚠️ **Lightbox is optional.** If your app doesn't register the lightbox extension, the View action opens the file in a new tab. This is intentional — don't add a static import.
- ⚠️ **Model-change re-renders are opt-out here.** Like UserView, FileView overrides `_onModelChange()` to a no-op. Action handlers call `this.render()` explicitly when they need a refresh. Section views manage their own reactivity.
- ⚠️ **Inline `<video>`/`<audio>` expect range-capable URLs.** Presigned S3 URLs work. Custom proxy endpoints must honor `Range` headers.

## Related Docs

- [Views & View Lifecycle](../core/View.md)
- [Templates & Formatters](../core/Templates.md)
- [DataView](./DataView.md) — used by Details and Metadata sections
- [TableView](./TableView.md) — used by the Renditions section
- [SideNavView](../core/View.md#sidenavview) — the section switcher
- [ContextMenu](./Dialog.md#context-menus) — the header action menu
- [File / FileList models](../models/BuiltinModels.md)
- [LightBox extension](../extensions/LightBox.md)

## Examples

<!-- examples:cross-link begin -->

Runnable, copy-paste references in the examples portal:

- [`examples/portal/examples/components/FileView/FileViewExample.js`](../../../examples/portal/examples/components/FileView/FileViewExample.js) — Modal-hosted file viewer — the canonical pattern for opening a File record.
- [`examples/portal/examples/components/FileView/FileViewInlineExample.js`](../../../examples/portal/examples/components/FileView/FileViewInlineExample.js) — Rare alternative — embed FileView directly in a page instead of a Modal.

<!-- examples:cross-link end -->
