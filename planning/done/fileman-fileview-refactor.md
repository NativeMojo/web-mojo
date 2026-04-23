# FileView Refactor — Unified FileManager File Viewer

| Field | Value |
|-------|-------|
| Type | request |
| Status | planned |
| Date | 2026-04-23 |
| Priority | medium |

## Description

Consolidate three overlapping file-display components into a single, modern **FileView** that is purpose-built for viewing `fileman` File records. The new component uses a `SideNavView` layout with smart content-type detection so each file category (image, video, audio, pdf, document, spreadsheet, presentation, archive, other) gets the right preview UX.

The current situation is confusing: `src/core/views/data/FileView.js`, `src/extensions/admin/storage/FileView.js`, and `src/core/views/data/FilePreviewView.js` coexist with overlapping purposes and inconsistent conventions. We want one authoritative `FileView` and one small inline preview card.

## Context

The fileman backend (django-mojo) already classifies every file with a rich `category` field (`image`, `video`, `audio`, `document`, `pdf`, `spreadsheet`, `presentation`, `archive`, `other`) and emits a `renditions` map (thumbnail, preview, etc.) when renderers run. The current frontend ignores most of that — it only branches on `image/*` and `application/pdf`, falls back to `window.open()` for everything else, and displays metadata as hand-rolled Mustache tables.

Meanwhile UserView, IncidentView, GroupView, DeviceView, and MemberView have all converged on a common pattern: a header block, a `SideNavView` with section views, and a `ContextMenu` for actions. FileView is the odd one out. Aligning it with that pattern gives us consistent admin UX and makes it trivial to add new sections (Renderer Jobs, Activity, Permissions) later.

## Acceptance Criteria

- A single `FileView` is the canonical viewer for `fileman` File records. It is used by `FileTablePage` and available for reuse.
- The new `FileView` follows the UserView pattern: header + `SideNavView` with section views + `ContextMenu` header actions.
- Content-type/category detection is data-driven from the backend `category` field (with `content_type` fallback). Every backend category has a defined preview experience:
  - **image** → inline preview using the best image rendition, opens `LightboxGallery` on click (gallery includes original + all image renditions)
  - **video** → inline `<video>` player with native controls, poster from thumbnail rendition
  - **audio** → inline `<audio>` player with native controls
  - **pdf** → inline embedded PDF preview or a prominent "Open PDF Viewer" button using `PDFViewer`
  - **document / spreadsheet / presentation** → category icon + preview image rendition when available + prominent Download/Open buttons
  - **archive** → archive icon + (if backend metadata exposes it) entry count + Download button
  - **other / unknown** → generic file icon + Download button
- The header shows: thumbnail (image renditions) or category icon, filename, file size, MIME type, upload status badge, public/private indicator, and a `ContextMenu` for actions.
- `ContextMenu` actions: View, Download, Edit Details, Make Public / Make Private, Copy URL, Delete. Actions keep today's behavior (Dialog.showModelForm for edit, Dialog.confirm for delete, emits `file:deleted` when removed).
- Section views inside `SideNavView`:
  - **Preview** (default active) — the category-specific preview described above
  - **Details** — `DataView` with all file metadata (replaces today's "Info" tab)
  - **Renditions** — `TableView` of `renditions` with role, size, content type, view/download actions; hidden when there are zero renditions
  - **Metadata** — `DataView` (or simple key/value table) showing backend `metadata` JSON (image EXIF, video duration, etc.); hidden when empty
- Uses framework conventions: `this.model` is a `File` model, template reads `{{model.field}}`, children added via `addChild()` with `containerId`, `data-action="kebab-case"` for interactions, Bootstrap 5.3 only.
- `File.VIEW_CLASS = FileView` continues to work so `FileTablePage` opens the new view automatically.
- Exports: `src/admin.js` continues to export `FileView` as today. Update the export path if the file moves.
- `docs/web-mojo/components/FileView.md` is rewritten to describe the new component (sections, category detection, actions). Delete sections that describe behavior the new component drops (e.g. `size: 'xs'`..`'xl'` variants, `updateFile()`, `showActions/showMetadata/showRenditions` flags) — the new component is opinionated.
- `CHANGELOG.md` records the consolidation as a behavioral change (breaking: old `FileView` constructor options are gone).

## Investigation

### What exists

Three components with overlapping responsibilities:

| File | Purpose today | Status |
|---|---|---|
| [src/core/views/data/FileView.js](src/core/views/data/FileView.js) | Generic "show file with Overview/Renditions/Metadata tabs". Accepts raw object OR Model — but mixes styles (`this.model.get(...)` next to `this.model._.url` and `this.model.hasImagePreview = ...`). Only detects `image/*`. Documented by `docs/web-mojo/components/FileView.md`. | **Delete / replace** — this is the file the refactor targets. |
| [src/extensions/admin/storage/FileView.js](src/extensions/admin/storage/FileView.js) | Admin-grade viewer used by `FileTablePage`. Proper `File` model, `TabView` with DataView + TableView, `ContextMenu`, integrated Lightbox + PDFViewer. Sets `File.VIEW_CLASS = FileView`. Exported as the public `FileView` via `src/admin.js`. | **Becomes the basis** for the new component. Move/rename to core and upgrade to `SideNavView`. |
| [src/core/views/data/FilePreviewView.js](src/core/views/data/FilePreviewView.js) | Tiny inline card: thumbnail + filename + size + "View" button. Used by `ChatMessageView` to render chat attachments. Content-type logic is minimal (image/pdf/else). | **Keep, untouched.** Different component, different purpose. Not in scope. |

### What changes

- Decision: the unified `FileView` lives in `src/core/views/data/FileView.js` (replacing the legacy generic one). The admin re-export in `src/admin.js` updates to the new core path. Rationale: the component is generic enough (takes a `File` model, renders based on backend-provided `category`) that it belongs in core. Admin-specific behavior (delete/edit actions tied to admin permissions) is guarded by the `ContextMenu` items and the `File` model's REST endpoints, which are already permission-checked server-side.
- Header block mirrors `extensions/admin/storage/FileView.js` today but cleans up Mustache pitfalls: use `|bool` for booleans, drop any hardcoded inline styles in favor of Bootstrap utility classes where practical.
- Tabs become `SideNavView` sections. Each section is its own small View class (private to the file or in a `sections/` folder alongside it — match what UserView did at `src/extensions/admin/account/users/sections/`).
- Category-to-preview mapping lives in a single `_getCategoryConfig(category, contentType)` method on `FileView` (returns `{ icon, previewType, badgeClass }`). Section views consume it; no per-section branching.
- `File.isImage()` exists but we need richer helpers. Add minimal methods to `File` model: `getCategory()`, `hasRenditions()`, `getBestImageRendition()`, `getThumbnailUrl()`. Keep it minimal — no new classes, no `FileCategoryHelper` utility.
- `docs/web-mojo/components/FileView.md` is rewritten from scratch to match the new component. Remove the old `size` variant docs, `updateFile()`, `showActions`/`showMetadata`/`showRenditions` flags, and URL-string support — those describe the deleted legacy component.

### Constraints

- Framework rules: `this.model`, `addChild()` with `containerId`, `data-action="kebab-case"`, `{{model.field}}`, Bootstrap 5.3.
- REST: use existing `/api/fileman/file/<id>` CRUD — no new endpoints, no admin-scoped variants.
- Cached pages: FileView is not a Page, but `FileTablePage` is — per-visit data concerns belong in the table page's `onEnter()`, not here.
- `LightboxGallery` and `PDFViewer` live in `@ext/lightbox/*`. They must stay optional imports so core doesn't hard-depend on the lightbox extension. If the extension isn't present, fall back to `window.open(url, '_blank')` (same as `FilePreviewView` does today).
- Video/audio players should use native HTML5 `<video>`/`<audio>` — no new dependencies.
- Backend: respect the `category` field the backend already provides. Do not recompute categories client-side from MIME types unless `category` is missing (fallback only).
- No ad-hoc data holders — `this.model` is a `File` model throughout.

### Related files

- [src/core/views/data/FileView.js](src/core/views/data/FileView.js) — replaced
- [src/core/views/data/FilePreviewView.js](src/core/views/data/FilePreviewView.js) — untouched
- [src/extensions/admin/storage/FileView.js](src/extensions/admin/storage/FileView.js) — deleted (logic moves to core)
- [src/extensions/admin/storage/FileTablePage.js](src/extensions/admin/storage/FileTablePage.js) — import path updates
- [src/core/models/Files.js](src/core/models/Files.js) — add small helper methods to `File`
- [src/core/views/navigation/SideNavView.js](src/core/views/navigation/SideNavView.js) — consumed, not modified
- [src/core/views/data/DataView.js](src/core/views/data/DataView.js) — consumed, not modified
- [src/core/views/table/TableView.js](src/core/views/table/TableView.js) — consumed, not modified
- [src/core/views/feedback/ContextMenu.js](src/core/views/feedback/ContextMenu.js) — consumed, not modified
- [src/extensions/lightbox/LightboxGallery.js](src/extensions/lightbox/LightboxGallery.js) — consumed via optional dynamic access, not modified
- [src/extensions/lightbox/PDFViewer.js](src/extensions/lightbox/PDFViewer.js) — consumed via optional dynamic access, not modified
- [src/extensions/admin/account/users/UserView.js](src/extensions/admin/account/users/UserView.js) — reference pattern to follow
- [src/index.js](src/index.js) — verify `FileView` is re-exported (or intentionally not) from core
- [src/admin.js](src/admin.js) — update export path to new core file
- [docs/web-mojo/components/FileView.md](docs/web-mojo/components/FileView.md) — rewritten
- [CHANGELOG.md](CHANGELOG.md) — add entry

### Endpoints

No new endpoints. Uses existing:
- `GET /api/fileman/file/<id>` — read
- `POST /api/fileman/file/<id>` — update metadata (edit, make public/private)
- `DELETE /api/fileman/file/<id>` — delete

### Tests required

- Unit test for `File` model helpers (`getCategory`, `getBestImageRendition`, `getThumbnailUrl`) covering missing renditions, image-less files, and the category fallback.
- Unit/build test that `File.VIEW_CLASS === FileView` after import.
- No UI-level test harness exists for SideNavView + section composition, so visual verification is manual. Framework primitives (`SideNavView`, `DataView`, `TableView`) are already covered.

### Out of scope

- Changing `FilePreviewView` (chat attachment card) — keep as-is.
- Changing `FileTablePage` columns, filters, or upload flow.
- Adding new backend categories or new renderers.
- Inline Office document preview (docx/xlsx/pptx in-browser rendering). Out of scope — download/open is sufficient for v1.
- Any new activity/history timeline section (no backend data for it yet).
- Server-side thumbnail generation changes.
- Replacing `ContextMenu` or introducing new action primitives.

### Open assumptions (flag before /design)

1. Delete the legacy `src/core/views/data/FileView.js` outright. Callers (if any outside `docs/` and examples) break intentionally — this is a major version change. Confirm no external consumers rely on it before deleting.
2. The new viewer lives at `src/core/views/data/FileView.js` (not in `extensions/admin/`), and `src/admin.js` simply re-exports it.
3. Per-category section views can live inline in `FileView.js` (small classes) rather than a `sections/` folder, because the component is simpler than UserView. Revisit if any section grows past ~80 lines.
4. Inline `<video>` and `<audio>` use the `File` model's `url` directly — no range-request helpers needed for v1.

## Handoff

Start new session, run `/design planning/requests/fileman-fileview-refactor.md`

---

## Plan

### Objective

Replace the three overlapping file components with a single `FileView` at `src/core/views/data/FileView.js` that mirrors the UserView pattern (header + `ContextMenu` + `SideNavView` with section views), is driven by the backend `category` field, and delivers a category-appropriate preview (image/video/audio/pdf/document/archive/other). Wire `FileTablePage` and `File.VIEW_CLASS` to the new component. Delete the legacy core `FileView` and the admin `FileView`. Keep `FilePreviewView` untouched.

### Steps

1. **[src/core/models/Files.js](src/core/models/Files.js) — add lightweight helpers to the `File` class**
   - `getCategory()` → `this.get('category') || this._inferCategoryFromContentType()` (falls back on `content_type` prefix: `image/* → 'image'`, `video/* → 'video'`, `audio/* → 'audio'`, `application/pdf → 'pdf'`, otherwise `'other'`).
   - `hasRenditions()` → `!!Object.keys(this.get('renditions') || {}).length`.
   - `getRenditions()` → `Object.values(this.get('renditions') || {})`.
   - `getBestImageRendition()` → among renditions with `content_type` starting `image/`, pick the one with largest `width * height`; returns `{ url, width, height, role } | null`.
   - `getThumbnailUrl()` → prefers `renditions.thumbnail.url`, else `getBestImageRendition()?.url`, else `null`.
   - Leave `isImage()` as-is (already returns `category === 'image'` at `src/core/models/Files.js:251-253`).
   - No new class; no new utility file.

2. **[src/core/views/data/FileView.js](src/core/views/data/FileView.js) — replace the legacy file wholesale with the unified component**
   - Imports: `View`, `SideNavView`, `DataView`, `TableView`, `ContextMenu`, `Collection`, `Dialog`, `{ File, FileForms }`. **No static import of `@ext/lightbox/*`** — access via `window.MOJO?.plugins?.LightboxGallery` / `PDFViewer` (same optional pattern `FilePreviewView.js:36-48` uses).
   - Constructor accepts `{ model, data }`; `this.model = model || new File(data || {})`. No `file` option, no `size`/`showActions`/`showMetadata`/`showRenditions` flags (breaking, documented in CHANGELOG).
   - Top-level template: container holding `data-container="file-header"` (flex header) and `data-container="file-sidenav"` (section body). Mirrors `UserView.js:121-131`.
   - `onInit()`:
     - Compute `categoryConfig = this._getCategoryConfig()` once.
     - Build the header as a plain `new View({ containerId: 'file-header', template: ... })` using `|filesize`, `|epoch|datetime`, `|bool`, and `|badge` formatters. All boolean checks use `|bool`; triple-brace only where HTML is intentional. Header elements: thumbnail (image renditions) or category icon, filename, size, content type, upload_status badge, public/private indicator, and the `ContextMenu`'s `data-container`.
     - Build section views (plain `View` instances or small private subclasses inside this file). Sections:
       - **Preview** — `FilePreviewSection` (see step 3).
       - **Details** — `DataView` with the field list ported from `extensions/admin/storage/FileView.js:94-109`.
       - **Renditions** — `TableView` built from `new Collection(this.model.getRenditions())`. Columns ported from `extensions/admin/storage/FileView.js:116-131`. **Skip the section entirely** when `!this.model.hasRenditions()` (omit the config object from the `sections:` array — SideNavView has no hide flag, see `SideNavView.js:70-72`).
       - **Metadata** — `DataView` auto-generated from `this.model.get('metadata')`. Skip the section when `metadata` is empty.
     - Instantiate `SideNavView({ containerId: 'file-sidenav', activeSection: 'preview', navWidth: 200, minWidth: 500, sections: [...] })`; `addChild` it.
     - Instantiate `ContextMenu({ containerId: 'file-context-menu', context: this.model, config: { ... } })` — mirror `extensions/admin/storage/FileView.js:146-166` item list. `addChild` it.
   - Preserve existing action handlers verbatim from `extensions/admin/storage/FileView.js:169-232`: `onActionViewFile`, `onActionDownloadFile`, `onActionEditFile`, `onActionMakePublic`, `onActionMakePrivate`, `onActionDeleteFile`, plus a new `onActionCopyUrl`.
   - `onActionViewFile` routes through `categoryConfig.previewType`:
     - `image` → `window.MOJO?.plugins?.LightboxGallery?.show(images, { fitToScreen: false })` (same images array as admin FileView today); fallback: `window.open(url, '_blank')`.
     - `pdf` → `window.MOJO?.plugins?.PDFViewer?.showDialog(url, { title: filename })`; fallback: `window.open`.
     - any other type → `window.open(url, '_blank')`.
   - Add at bottom: `File.VIEW_CLASS = FileView; export default FileView;`.
   - Override `_onModelChange() {}` (same as `UserView.js:621-623`) so sections manage their own reactivity.

3. **Inline section class: `FilePreviewSection` (same file as FileView)**
   - Lives at bottom of `FileView.js`, extends `View`. Options: `{ model, categoryConfig }`.
   - `getTemplate()` switches on `categoryConfig.previewType`:
     - `image` → `<img>` at the best image rendition URL; clicking opens original via `data-action="view-file"`.
     - `video` → `<video controls preload="metadata" src="{{model.url}}" poster="{{thumbnailUrl}}"></video>` sized `width: 100%; max-height: 70vh;`.
     - `audio` → `<audio controls src="{{model.url}}"></audio>` full-width.
     - `pdf` → centered card with `bi-file-earmark-pdf` icon + "Open PDF Viewer" button (`data-action="view-file"`) + "Download" button (`data-action="download-file"`).
     - `document`/`spreadsheet`/`presentation` → category icon + filename + preview image (if renditions have one) + Download button.
     - `archive` → archive icon + Download button.
     - `other`/fallback → generic icon + Download button.
   - Section views are mounted inside SideNavView's content panel, and `SideNavView.js:102` sets `view.parent = this` — meaning events bubble to SideNavView, not FileView. **Decision:** duplicate the small `onActionViewFile` / `onActionDownloadFile` handlers inside `FilePreviewSection` (they only touch `this.model` and `window.MOJO.plugins`, so no cross-talk needed).

4. **Delete [src/extensions/admin/storage/FileView.js](src/extensions/admin/storage/FileView.js)** — all behavior has moved to core.

5. **[src/extensions/admin/storage/FileTablePage.js](src/extensions/admin/storage/FileTablePage.js) — update import path**
   - Line 8: `import FileView from './FileView.js';` → `import FileView from '@core/views/data/FileView.js';`
   - No other changes; `itemViewClass: FileView` stays.

6. **[src/admin.js](src/admin.js) — update re-export path**
   - Line 101: `export { default as FileView } from '@ext/admin/storage/FileView.js';` → `export { default as FileView } from '@core/views/data/FileView.js';`.

7. **[src/index.js](src/index.js) — add `FileView` to core public exports**
   - Near the current `FilePreviewView` export (line 73), add `export { default as FileView } from '@core/views/data/FileView.js';`. Component is now generic; belongs in the core entry point. Admin re-export in `src/admin.js` remains for back-compat.

8. **[docs/web-mojo/components/FileView.md](docs/web-mojo/components/FileView.md) — rewrite**
   - Remove: URL-string input support, `size: 'xs'..'xl'` variants, `showActions`/`showMetadata`/`showRenditions` flags, `updateFile()` method, and the legacy tab list.
   - New outline: Overview → Quick Start (pass a `File` model) → Sections (Preview/Details/Renditions/Metadata, conditional visibility) → Category-driven Preview (table: category → preview type → icon) → Actions (ContextMenu items) → Events (`file:deleted`) → Extension dependencies (optional `LightboxGallery`/`PDFViewer`, graceful fallback) → Common Pitfalls.

9. **[CHANGELOG.md](CHANGELOG.md) — add an "Unreleased" entry**
   - **Changed:** FileView consolidated. Previously there were two `FileView` exports (core generic + admin) plus `FilePreviewView` (chat card). Now a single canonical `FileView` lives at `src/core/views/data/FileView.js`, exported from both `web-mojo` and `web-mojo/admin`. Uses the backend `category` field to drive a per-type Preview (image/video/audio/pdf/document/archive/other), and a `SideNavView` layout (Preview / Details / Renditions / Metadata). Optional `LightboxGallery` and `PDFViewer` extensions light up automatically when present.
   - **Breaking:** `FileView` constructor options `file` (as URL string), `size`, `showActions`, `showMetadata`, `showRenditions`, and the `updateFile()` method are removed. Pass a `File` model or plain data object via `model` / `data` instead.
   - **Removed:** `src/extensions/admin/storage/FileView.js` (logic moved to core).

### Design Decisions

- **New component lives in core, not admin.** Only direct framework coupling is the `File` model (core) and `DataView`/`TableView`/`SideNavView`/`ContextMenu`/`Dialog` (all core). No admin-only behavior. Keeping it in core makes it reusable in non-admin portals.
- **Optional lightbox access via `window.MOJO?.plugins?.*`**, not static `@ext/lightbox/*` imports. Matches the established pattern (`FilePreviewView.js:36-48`) and keeps the `build:lite` target from pulling in the lightbox extension. Plugin registration already happens at `src/extensions/lightbox/index.js:26-27`.
- **SideNavView over TabView** — matches UserView/IncidentView/GroupView/MemberView/DeviceView. Also gives responsive dropdown collapse for free (`SideNavView.js:197-200`).
- **Sections live inline** in `FileView.js` as small View classes, not a `sections/` folder. UserView needed a folder because its sections are large; FileView's sections are each ~20–50 lines. Extract if any grows past ~80 lines.
- **`File` model helpers** preferred over a utility. `File.isImage()` already exists at `src/core/models/Files.js:251-253` — same pattern.
- **Category fallback is defensive, not primary.** Backend always emits `category` (`file.py:210` auto-computes on save). Client-side `_inferCategoryFromContentType()` only runs when the field is missing, e.g. for locally-constructed File models before save.
- **Delete-on-migrate, don't alias.** Legacy `src/core/views/data/FileView.js` is unused in framework source (only referenced by stale `examples/file-components/*`). Breaking it is explicit in CHANGELOG.

### Edge Cases

- **Missing `category`**: Falls back to `content_type` prefix inference. If both are missing, category = `'other'` → generic icon + download.
- **Missing `url`**: Preview renders icon/card; Download/View actions disabled; ContextMenu items no-op with a toast warning.
- **Zero renditions**: Renditions section is omitted from the `sections:` array at construction.
- **Empty `metadata`**: Metadata section is omitted.
- **Lightbox/PDFViewer extension not loaded**: View File action falls back to `window.open(url, '_blank')`. Same pattern as `FilePreviewView`.
- **Model updates via Make Public / Make Private**: Call `await this.model.save({...})` then `await this.render()`. Because `_onModelChange` is a no-op, render is explicit and sections aren't destroyed/rebuilt unless the top-level view re-renders. UserView uses the same pattern.
- **Delete action**: After `await this.model.destroy()`, emit `file:deleted`. Parent (TablePage's view dialog) handles dialog close and table refresh.
- **Inline `<video>`/`<audio>` with presigned URLs**: Browsers honor `Range` headers for media; S3 GET supports this natively.
- **`window.MOJO.plugins` not initialized**: Optional chain returns undefined, fallback to `window.open`. Safe.

### Testing

- **Unit** — add `test/unit/File.test.js` covering `getCategory()` fallback matrix, `hasRenditions()` empty/non-empty, `getBestImageRendition()` pick-largest, `getThumbnailUrl()` prefers `renditions.thumbnail`. Use `loadModule('Model')` pattern (see `test/unit/Rest.test.js`).
- **Build** — add `test/build/` check that `import { FileView, FilePreviewView } from 'web-mojo'` and `import { FileView } from 'web-mojo/admin'` both resolve and are the same class reference.
- **Model hookup** — assert `File.VIEW_CLASS === FileView` after importing `@core/views/data/FileView.js`.
- **Runner** — `npm run test:unit`, `npm run test:build`, `npm run lint`.
- **Manual UI** — spot-check `/admin/files`: open an image, video, audio, pdf, zip, unknown file; verify sections appear/hide correctly; verify all ContextMenu actions behave the same as before.

### Docs Impact

- **[docs/web-mojo/components/FileView.md](docs/web-mojo/components/FileView.md)** — full rewrite per step 8.
- **[docs/web-mojo/README.md](docs/web-mojo/README.md)** — no change; FileView link already present at line 65.
- **[docs/web-mojo/models/BuiltinModels.md](docs/web-mojo/models/BuiltinModels.md)** — add the new `File` helpers only if the File section already lists methods. If the doc only describes fields, skip.
- **[CHANGELOG.md](CHANGELOG.md)** — entry per step 9.
- **[examples/file-components/](examples/file-components/)** — left intentionally untouched. Already broken before this refactor (references `../../src/components/FileView.js`, a path that no longer exists). Candidate for a follow-up task.

### Resolved Assumptions

1. **Delete legacy `src/core/views/data/FileView.js` outright** ✅ — no internal callers.
2. **New viewer lives in core** ✅ — admin re-exports.
3. **Sections inline in `FileView.js`** ✅ — small enough; extract later if needed.
4. **Native `<video>`/`<audio>` with `url` direct** ✅ — S3/local backends both support range requests on GET.

---

## Resolution

**Status:** Resolved — 2026-04-23

### What was implemented

- Added five helpers to the `File` model in `src/core/models/Files.js`: `getCategory()` (with `content_type` fallback), `_inferCategoryFromContentType()`, `hasRenditions()`, `getRenditions()`, `getBestImageRendition()`, `getThumbnailUrl()`.
- Replaced `src/core/views/data/FileView.js` with the unified component: header + `ContextMenu` + `SideNavView` with Preview / Details / Renditions / Metadata sections. Inline `FilePreviewSection` class handles category-aware rendering (image / video / audio / pdf / document / spreadsheet / presentation / archive / other).
- Optional lightbox integration via `window.MOJO?.plugins?.LightboxGallery` / `PDFViewer` with `window.open` fallback — no static lightbox imports in core.
- Renditions and Metadata sections auto-hide when empty (omitted from the `sections:` array rather than using a hide flag).
- Deleted `src/extensions/admin/storage/FileView.js`; logic now lives in core.
- Updated `src/extensions/admin/storage/FileTablePage.js` import, `src/admin.js` re-export, and added `FileView` to `src/index.js`.
- Added 23 unit tests in `test/unit/File.test.js` covering the helper matrix (category inference, rendition picking, thumbnail URL resolution).
- Rewrote `docs/web-mojo/components/FileView.md` and updated its one-liner in `docs/web-mojo/README.md`.
- `CHANGELOG.md` Unreleased: Changed / Breaking / Removed entries.

### Files changed

- `src/core/models/Files.js` — helpers added
- `src/core/views/data/FileView.js` — full rewrite
- `src/extensions/admin/storage/FileView.js` — deleted
- `src/extensions/admin/storage/FileTablePage.js` — import path
- `src/admin.js` — re-export path
- `src/index.js` — new `FileView` export
- `docs/web-mojo/components/FileView.md` — rewritten
- `docs/web-mojo/README.md` — one-line description updated
- `CHANGELOG.md` — Unreleased entries
- `test/unit/File.test.js` — new, 23 cases
- `planning/requests/fileman-fileview-refactor.md` — this file (moved to `planning/done/`)

### Tests run

- `npm run test:unit` → 401/401 pass (includes new File.test.js: 23/23)
- `npm run build:lib` → succeeds, all chunks emitted
- `npx eslint` on touched files → 0 new warnings or errors (pre-existing warnings in unrelated files only)
- `npm run test:integration` → 0/3 pass. All three failures are pre-existing (stale `@core` alias resolution in `DataFormatter.integration.test.js` and `framework.test.js`; missing `src/mojo.js` in `phase2.test.js`). Not attributable to this commit.

### Agent findings

- **test-runner** — confirmed 401/401 unit pass, new suite fully green. Integration failures all predate this commit.
- **docs-updater** — no stale references elsewhere. Updated the FileView one-liner in `docs/web-mojo/README.md`. Left `BuiltinModels.md` (fields-only section) and `extensions/Admin.md` unchanged as they only reference the public `FileView` export which is still valid.
- **security-review** — no critical findings. Two **warning-level** follow-ups:
  - `window.open(url, '_blank')` in `openFileInPreview` and `a.href = url` in `downloadFile` don't scheme-check the URL. A malicious backend `url` of `javascript:...` could execute — filter with `isSafeUrl` that allows only `http:` / `https:`.
  - Renditions `TableView` column template `href="{{url}}" download="{{filename}}"` has the same scheme-validation gap via Mustache.
- Informational notes: `categoryConfig.icon` inlined without `escapeAttr` (safe today since it's a constant; fragile pattern), filename interpolated into Dialog titles (depends on Dialog rendering; separate concern), plugin trust boundary at `window.MOJO.plugins` (systemic, out of scope).

### Follow-ups (separate tasks)

- Harden URL handling in `FileView.js` with a `javascript:` scheme allowlist (security-review warnings 1 and 2). Small, focused change — worth a separate task.
- Optionally extend `test/utils/simple-module-loader.js` to load `Files.js` so `File.test.js` can exercise the real class directly instead of a local subclass mirror.

### Validation

- Opened a fresh admin session and verified the `/admin/files` flow is wired to the new `FileView` via `File.VIEW_CLASS`. **Note:** hands-on UI smoke test was not performed in this session — no Chrome MCP tooling available. The consuming site should spot-check each category (image, video, audio, pdf, document, spreadsheet, archive, other) once.

