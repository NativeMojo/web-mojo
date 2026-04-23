/**
 * FileView - Unified viewer for fileman File records
 *
 * Canonical viewer for `File` models returned by /api/fileman/file. Mirrors the
 * UserView pattern: a header block with a ContextMenu, plus a SideNavView that
 * switches between Preview / Details / Renditions / Metadata sections.
 *
 * Preview is driven by the backend `category` field (image, video, audio, pdf,
 * document, spreadsheet, presentation, archive, other). Each category has a
 * defined preview experience. Image and PDF previews delegate to the optional
 * lightbox extension (`window.MOJO.plugins.LightboxGallery` / `PDFViewer`);
 * when that extension isn't loaded, actions fall back to `window.open`.
 *
 * Features:
 * - Category-aware Preview section (inline <video>/<audio>, lightbox, pdf viewer)
 * - DataView-powered Details with all file metadata
 * - TableView-powered Renditions (hidden when there are no renditions)
 * - Auto-generated Metadata DataView from `model.metadata` (hidden when empty)
 * - ContextMenu actions: View, Download, Edit Details, Make Public/Private,
 *   Copy URL, Delete
 * - Emits `file:deleted` after successful delete
 */

import View from '@core/View.js';
import SideNavView from '@core/views/navigation/SideNavView.js';
import DataView from '@core/views/data/DataView.js';
import TableView from '@core/views/table/TableView.js';
import ContextMenu from '@core/views/feedback/ContextMenu.js';
import Collection from '@core/Collection.js';
import Dialog from '@core/views/feedback/Dialog.js';
import { File, FileForms } from '@core/models/Files.js';

// ──────────────────────────────────────────────────────────────────────────
// Category → preview config
// ──────────────────────────────────────────────────────────────────────────

const CATEGORY_CONFIG = {
    image:        { icon: 'bi-image',                   previewType: 'image',    badgeClass: 'bg-info' },
    video:        { icon: 'bi-camera-video',            previewType: 'video',    badgeClass: 'bg-primary' },
    audio:        { icon: 'bi-music-note-beamed',       previewType: 'audio',    badgeClass: 'bg-primary' },
    pdf:          { icon: 'bi-file-earmark-pdf',        previewType: 'pdf',      badgeClass: 'bg-danger' },
    document:     { icon: 'bi-file-earmark-text',       previewType: 'document', badgeClass: 'bg-secondary' },
    spreadsheet:  { icon: 'bi-file-earmark-spreadsheet', previewType: 'document', badgeClass: 'bg-success' },
    presentation: { icon: 'bi-file-earmark-slides',     previewType: 'document', badgeClass: 'bg-warning' },
    archive:      { icon: 'bi-file-earmark-zip',        previewType: 'download', badgeClass: 'bg-dark' },
    other:        { icon: 'bi-file-earmark',            previewType: 'download', badgeClass: 'bg-secondary' }
};

function getCategoryConfig(model) {
    const cat = (model && typeof model.getCategory === 'function')
        ? model.getCategory()
        : (model?.get?.('category') || 'other');
    return CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.other;
}

// ──────────────────────────────────────────────────────────────────────────
// FilePreviewSection — category-aware preview (inside SideNavView content)
//
// NOTE: SideNavView assigns `view.parent = this` to its section views
// (SideNavView.js:102), so events bubble to SideNavView, not FileView.
// Action handlers are therefore duplicated here; both touch only
// `this.model` + `window.MOJO.plugins`, so there is no cross-talk risk.
// ──────────────────────────────────────────────────────────────────────────

class FilePreviewSection extends View {
    constructor(options = {}) {
        super({
            className: 'file-preview-section p-3',
            ...options
        });
        this.model = options.model;
        this.categoryConfig = options.categoryConfig || CATEGORY_CONFIG.other;
        this._handleModelChange = this._handleModelChange.bind(this);
    }

    async onInit() {
        // Re-render when renditions populate so video posters / document
        // previews pick up the new thumbnail URL.
        if (this.model && typeof this.model.on === 'function') {
            this.model.on('change', this._handleModelChange, this);
        }
    }

    async onBeforeDestroy() {
        if (this.model && typeof this.model.off === 'function') {
            this.model.off('change', this._handleModelChange, this);
        }
    }

    _handleModelChange() {
        if (this.isMounted && this.isMounted()) {
            this.render();
        }
    }

    getTemplate() {
        const type = this.categoryConfig.previewType;
        const url = this.model.get('url') || '';
        const filename = this.model.get('filename') || '';

        if (type === 'image') {
            const previewUrl = (this.model.getThumbnailUrl && this.model.getThumbnailUrl()) || url;
            return `
                <div class="text-center">
                    <img src="${escapeAttr(previewUrl)}"
                         alt="${escapeAttr(filename)}"
                         class="img-fluid rounded shadow-sm"
                         style="max-height: 70vh; cursor: zoom-in;"
                         data-action="view-file" role="button">
                    <div class="text-muted small mt-2">Click image for full view</div>
                </div>
            `;
        }

        if (type === 'video') {
            const poster = this.model.getThumbnailUrl && this.model.getThumbnailUrl();
            return `
                <div class="text-center">
                    <video controls preload="metadata"
                           src="${escapeAttr(url)}"
                           ${poster ? `poster="${escapeAttr(poster)}"` : ''}
                           style="width: 100%; max-height: 70vh; background:#000;"></video>
                </div>
            `;
        }

        if (type === 'audio') {
            return `
                <div class="p-4 bg-light rounded text-center">
                    <i class="bi ${this.categoryConfig.icon} display-4 text-secondary"></i>
                    <h5 class="mt-3 mb-3 text-break">${escapeHtml(filename)}</h5>
                    <audio controls class="w-100" src="${escapeAttr(url)}"></audio>
                </div>
            `;
        }

        if (type === 'pdf') {
            return `
                <div class="text-center p-5 bg-light rounded">
                    <i class="bi ${this.categoryConfig.icon} text-danger" style="font-size: 5rem;"></i>
                    <h5 class="mt-3 text-break">${escapeHtml(filename)}</h5>
                    <div class="mt-4">
                        <button type="button" class="btn btn-primary me-2" data-action="view-file">
                            <i class="bi bi-eye me-1"></i>Open PDF Viewer
                        </button>
                        <button type="button" class="btn btn-outline-secondary" data-action="download-file">
                            <i class="bi bi-download me-1"></i>Download
                        </button>
                    </div>
                </div>
            `;
        }

        if (type === 'document') {
            const preview = this.model.getBestImageRendition && this.model.getBestImageRendition();
            return `
                <div class="text-center p-4 bg-light rounded">
                    ${preview
                        ? `<img src="${escapeAttr(preview.url)}" alt="${escapeAttr(filename)} preview" class="img-fluid rounded mb-3" style="max-height: 50vh;">`
                        : `<i class="bi ${this.categoryConfig.icon} text-secondary" style="font-size: 5rem;"></i>`}
                    <h5 class="mt-3 text-break">${escapeHtml(filename)}</h5>
                    <div class="mt-3">
                        <button type="button" class="btn btn-primary me-2" data-action="view-file">
                            <i class="bi bi-box-arrow-up-right me-1"></i>Open
                        </button>
                        <button type="button" class="btn btn-outline-secondary" data-action="download-file">
                            <i class="bi bi-download me-1"></i>Download
                        </button>
                    </div>
                </div>
            `;
        }

        // archive / other / download fallback
        return `
            <div class="text-center p-5 bg-light rounded">
                <i class="bi ${this.categoryConfig.icon} text-secondary" style="font-size: 5rem;"></i>
                <h5 class="mt-3 text-break">${escapeHtml(filename)}</h5>
                <p class="text-muted small">No inline preview available for this file type.</p>
                <div class="mt-3">
                    <button type="button" class="btn btn-primary" data-action="download-file">
                        <i class="bi bi-download me-1"></i>Download
                    </button>
                </div>
            </div>
        `;
    }

    async onActionViewFile() {
        openFileInPreview(this.model, this.categoryConfig);
    }

    async onActionDownloadFile() {
        downloadFile(this.model);
    }
}

// ──────────────────────────────────────────────────────────────────────────
// FileRenditionsSection — renders the Renditions SideNav section
//
// Backend produces renditions asynchronously on a background channel. A file
// can have `upload_status === 'completed'` with an empty `renditions` map
// for seconds (images) to minutes (video transcodes). This section renders:
//   - the TableView when renditions are present
//   - a "processing" placeholder with a manual Refresh when still building
//   - a "upload pending" placeholder when upload hasn't finished yet
//
// Listens for model `change` events so it swaps from placeholder to table as
// soon as the poll (in FileView) pulls in the populated renditions.
// ──────────────────────────────────────────────────────────────────────────

class FileRenditionsSection extends View {
    constructor(options = {}) {
        super({
            className: 'file-renditions-section p-3',
            ...options
        });
        this.model = options.model;
        this.renditionsTable = null;
        this._handleModelChange = this._handleModelChange.bind(this);
    }

    async onInit() {
        if (this.model && typeof this.model.on === 'function') {
            this.model.on('change', this._handleModelChange, this);
        }
    }

    async onBeforeDestroy() {
        if (this.model && typeof this.model.off === 'function') {
            this.model.off('change', this._handleModelChange, this);
        }
        if (this.renditionsTable) {
            this.removeChild(this.renditionsTable);
            this.renditionsTable = null;
        }
    }

    _handleModelChange() {
        if (this.isMounted && this.isMounted()) {
            this.render();
        }
    }

    async onBeforeRender() {
        // Rebuild the table child fresh each render. Cheap — the child is
        // only created when renditions exist, and renditions change rarely.
        if (this.renditionsTable) {
            this.removeChild(this.renditionsTable);
            this.renditionsTable = null;
        }
        if (this.model && this.model.hasRenditions && this.model.hasRenditions()) {
            this.renditionsTable = new TableView({
                containerId: 'renditions-table',
                collection: new Collection(this.model.getRenditions()),
                columns: [
                    { key: 'role', label: 'Role', formatter: 'badge' },
                    { key: 'filename', label: 'Filename', formatter: 'truncate(40)' },
                    { key: 'file_size', label: 'Size', formatter: 'filesize' },
                    { key: 'content_type', label: 'Content Type' },
                    {
                        key: 'actions',
                        label: 'Actions',
                        template: `
                            <a href="{{url}}" target="_blank" class="btn btn-sm btn-outline-primary" title="View">
                                <i class="bi bi-eye"></i>
                            </a>
                            <a href="{{url}}" download="{{filename}}" class="btn btn-sm btn-outline-secondary" title="Download">
                                <i class="bi bi-download"></i>
                            </a>
                        `
                    }
                ]
            });
            this.addChild(this.renditionsTable);
        }
    }

    getTemplate() {
        if (this.model.hasRenditions && this.model.hasRenditions()) {
            return `<div data-container="renditions-table"></div>`;
        }
        if (this.model.isRenditionsProcessing && this.model.isRenditionsProcessing()) {
            return `
                <div class="text-center p-5 bg-light rounded">
                    <div class="spinner-border text-secondary mb-3" role="status">
                        <span class="visually-hidden">Processing…</span>
                    </div>
                    <h6 class="mb-1">Renditions are being generated</h6>
                    <p class="text-muted small mb-3">
                        Thumbnails and previews are built in the background. Image renditions usually
                        appear within seconds; video transcodes can take several minutes.
                    </p>
                    <button type="button" class="btn btn-sm btn-outline-secondary" data-action="refresh-renditions">
                        <i class="bi bi-arrow-clockwise me-1"></i>Refresh
                    </button>
                </div>
            `;
        }
        return `
            <div class="text-center p-5 bg-light rounded">
                <i class="bi bi-hourglass-split display-6 text-muted"></i>
                <h6 class="mt-3 mb-1">Upload still in progress</h6>
                <p class="text-muted small mb-0">Renditions will be generated once the upload completes.</p>
            </div>
        `;
    }

    async onActionRefreshRenditions() {
        try {
            await this.model.fetch();
        } catch (err) {
            console.warn('FileView: refresh-renditions fetch failed:', err);
        }
    }
}

// ──────────────────────────────────────────────────────────────────────────
// Shared action helpers (also used by FileView's ContextMenu-triggered actions)
// ──────────────────────────────────────────────────────────────────────────

function openFileInPreview(model, categoryConfig) {
    const url = model.get('url');
    if (!url) return;
    const type = categoryConfig.previewType;

    if (type === 'image') {
        const Lightbox = typeof window !== 'undefined' ? window.MOJO?.plugins?.LightboxGallery : null;
        const renditions = model.get('renditions') || {};
        const images = [
            { src: url, alt: 'Original' },
            ...Object.values(renditions)
                .filter(r => r && r.url && typeof r.content_type === 'string' && r.content_type.startsWith('image/'))
                .map(r => ({ src: r.url, alt: r.role || '' }))
        ];
        if (Lightbox && typeof Lightbox.show === 'function') {
            Lightbox.show(images, { fitToScreen: false });
        } else {
            window.open(url, '_blank');
        }
        return;
    }

    if (type === 'pdf') {
        const PDFViewer = typeof window !== 'undefined' ? window.MOJO?.plugins?.PDFViewer : null;
        if (PDFViewer && typeof PDFViewer.showDialog === 'function') {
            PDFViewer.showDialog(url, { title: model.get('filename') });
        } else {
            window.open(url, '_blank');
        }
        return;
    }

    window.open(url, '_blank');
}

function downloadFile(model) {
    const url = model.get('url');
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = model.get('filename') || '';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// ──────────────────────────────────────────────────────────────────────────
// FileView (main component)
// ──────────────────────────────────────────────────────────────────────────

class FileView extends View {
    constructor(options = {}) {
        super({
            className: 'file-view',
            ...options
        });

        this.model = options.model || new File(options.data || {});
        this.sideNavView = null;
        this.contextMenu = null;

        this.template = `
            <div class="file-view-container">
                <!-- Header + Context Menu -->
                <div class="d-flex justify-content-between align-items-start mb-4">
                    <div data-container="file-header" style="flex: 1;"></div>
                    <div data-container="file-context-menu" class="ms-3 flex-shrink-0"></div>
                </div>
                <!-- Section body -->
                <div data-container="file-sidenav" style="min-height: 400px;"></div>
            </div>
        `;
    }

    _getCategoryConfig() {
        return getCategoryConfig(this.model);
    }

    async onInit() {
        const categoryConfig = this._getCategoryConfig();

        // ── Header ──────────────────────────────────
        this.header = new View({
            containerId: 'file-header',
            template: this._buildHeaderTemplate(categoryConfig)
        });
        this.header.setModel(this.model);
        this.addChild(this.header);

        // ── Section views ───────────────────────────
        const sections = [];

        // Preview — always shown, default active
        const previewView = new FilePreviewSection({
            model: this.model,
            categoryConfig
        });
        sections.push({ key: 'preview', label: 'Preview', icon: categoryConfig.icon, view: previewView });

        // Details — always shown
        const detailsView = new DataView({
            model: this.model,
            className: 'p-3',
            showEmptyValues: true,
            emptyValueText: '—',
            columns: 2,
            fields: [
                { name: 'id', label: 'ID' },
                { name: 'filename', label: 'Filename' },
                { name: 'storage_filename', label: 'Storage Filename' },
                { name: 'content_type', label: 'Content Type' },
                { name: 'file_size', label: 'File Size', format: 'filesize' },
                { name: 'category', label: 'Category' },
                { name: 'upload_status', label: 'Status', format: 'badge' },
                { name: 'created', label: 'Created', format: 'datetime' },
                { name: 'modified', label: 'Modified', format: 'datetime' },
                { name: 'user.display_name', label: 'Uploaded By' },
                { name: 'file_manager.name', label: 'Storage Backend' },
                { name: 'storage_file_path', label: 'Storage Path' },
                { name: 'url', label: 'Public URL', format: 'url' },
                { name: 'is_public', label: 'Is Public', format: 'boolean' }
            ]
        });
        sections.push({ key: 'details', label: 'Details', icon: 'bi-info-circle', view: detailsView });

        // Renditions — always shown; the section itself decides whether to
        // render the table, a "processing" placeholder, or a "upload pending"
        // placeholder based on current model state. Backend renditions are
        // async, so even completed files may start with an empty map.
        const renditionsView = new FileRenditionsSection({ model: this.model });
        sections.push({ key: 'renditions', label: 'Renditions', icon: 'bi-layers', view: renditionsView });

        // Metadata — only when backend returned a non-empty metadata object
        const metadata = this.model.get('metadata');
        if (metadata && typeof metadata === 'object' && Object.keys(metadata).length) {
            const metadataView = new DataView({
                data: metadata,
                className: 'p-3',
                columns: 2,
                showEmptyValues: false
            });
            sections.push({ key: 'metadata', label: 'Metadata', icon: 'bi-braces', view: metadataView });
        }

        // ── SideNavView ─────────────────────────────
        this.sideNavView = new SideNavView({
            containerId: 'file-sidenav',
            activeSection: 'preview',
            navWidth: 200,
            contentPadding: '1.25rem 1.5rem',
            enableResponsive: true,
            minWidth: 500,
            sections
        });
        this.addChild(this.sideNavView);

        // ── Context Menu ────────────────────────────
        this.contextMenu = new ContextMenu({
            containerId: 'file-context-menu',
            className: 'context-menu-view header-menu-absolute',
            context: this.model,
            config: {
                icon: 'bi-three-dots-vertical',
                items: [
                    { label: 'View', action: 'view-file', icon: 'bi-eye' },
                    { label: 'Download', action: 'download-file', icon: 'bi-download' },
                    { label: 'Copy URL', action: 'copy-url', icon: 'bi-clipboard' },
                    { type: 'divider' },
                    { label: 'Edit Details', action: 'edit-file', icon: 'bi-pencil' },
                    this.model.get('is_public')
                        ? { label: 'Make Private', action: 'make-private', icon: 'bi-lock' }
                        : { label: 'Make Public', action: 'make-public', icon: 'bi-unlock' },
                    { label: 'Regenerate Previews', action: 'regenerate-renditions', icon: 'bi-arrow-repeat' },
                    { type: 'divider' },
                    { label: 'Delete File', action: 'delete-file', icon: 'bi-trash', danger: true }
                ]
            }
        });
        this.addChild(this.contextMenu);

        // If the backend is still producing renditions, poll until they
        // appear (or give up after ~5 minutes). Each successful fetch emits
        // a model 'change' event, which the preview/renditions sections
        // listen to and re-render themselves.
        this._maybeStartRenditionsPoll();
    }

    async onBeforeDestroy() {
        this._stopRenditionsPoll();
    }

    _buildHeaderTemplate(categoryConfig) {
        const thumbnailUrl = this.model.getThumbnailUrl && this.model.getThumbnailUrl();
        const thumbHtml = thumbnailUrl
            ? `<img src="${escapeAttr(thumbnailUrl)}" alt="thumbnail" class="rounded" style="width: 80px; height: 80px; object-fit: cover;">`
            : `<div class="rounded bg-light d-flex align-items-center justify-content-center" style="width: 80px; height: 80px;">
                   <i class="bi ${categoryConfig.icon} text-secondary" style="font-size: 2.25rem;"></i>
               </div>`;

        return `
            <div class="d-flex align-items-center gap-3">
                <div class="file-view-thumb flex-shrink-0">
                    ${thumbHtml}
                </div>
                <div class="flex-grow-1" style="min-width:0;">
                    <h3 class="mb-1 text-break">{{model.filename|default('Unnamed file')}}</h3>
                    <div class="text-muted small d-flex flex-wrap align-items-center gap-2">
                        <span><i class="bi bi-hdd me-1"></i>{{model.file_size|filesize}}</span>
                        <span class="text-muted">·</span>
                        <span>{{model.content_type|default('unknown')}}</span>
                        <span class="text-muted">·</span>
                        <span class="badge ${categoryConfig.badgeClass}">{{model.category|default('other')|capitalize}}</span>
                        {{#model.upload_status|bool}}
                            <span class="text-muted">·</span>
                            <span class="badge {{model.upload_status|badge}}">{{model.upload_status|capitalize}}</span>
                        {{/model.upload_status|bool}}
                        {{#model.is_public|bool}}
                            <span class="text-muted">·</span>
                            <span class="badge bg-success"><i class="bi bi-unlock me-1"></i>Public</span>
                        {{/model.is_public|bool}}
                        {{^model.is_public|bool}}
                            <span class="text-muted">·</span>
                            <span class="badge bg-secondary"><i class="bi bi-lock me-1"></i>Private</span>
                        {{/model.is_public|bool}}
                    </div>
                    {{#model.created|bool}}
                        <div class="text-muted small mt-1">
                            Uploaded {{model.created|epoch|datetime}}
                        </div>
                    {{/model.created|bool}}
                </div>
            </div>
        `;
    }

    // ── Action handlers ─────────────────────────────

    async onActionViewFile() {
        openFileInPreview(this.model, this._getCategoryConfig());
    }

    async onActionDownloadFile() {
        downloadFile(this.model);
    }

    async onActionCopyUrl() {
        const url = this.model.get('url');
        if (!url) return;
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(url);
            } else {
                const textarea = document.createElement('textarea');
                textarea.value = url;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
            }
            this.getApp()?.toast?.success?.('URL copied to clipboard');
        } catch (error) {
            console.error('Failed to copy URL:', error);
            this.getApp()?.toast?.error?.('Failed to copy URL');
        }
    }

    async onActionEditFile() {
        const resp = await Dialog.showModelForm({
            title: `Edit File - ${this.model.get('filename')}`,
            model: this.model,
            formConfig: FileForms.edit
        });
        if (resp) {
            this.render();
        }
    }

    async onActionMakePublic() {
        await this.model.save({ is_public: true });
        this.render();
    }

    async onActionMakePrivate() {
        await this.model.save({ is_public: false });
        this.render();
    }

    async onActionRegenerateRenditions() {
        const confirmed = await Dialog.confirm(
            'Rebuild all previews and thumbnails for this file? Existing renditions will be replaced. Generation runs in the background and may take several minutes for video.',
            'Regenerate Previews',
            { confirmText: 'Regenerate' }
        );
        if (!confirmed) return;

        try {
            await this.model.regenerateRenditions();
            this.getApp()?.toast?.success?.('Regenerating previews in the background…');
        } catch (err) {
            console.error('Failed to trigger regenerate_renditions:', err);
            this.getApp()?.toast?.error?.('Failed to start preview regeneration');
            return;
        }
        // Start polling so the new renditions appear automatically as the
        // worker finishes.
        this._maybeStartRenditionsPoll({ force: true });
    }

    // ── Renditions polling ──────────────────────────
    // Mirrors the IncidentView analysis-progress polling shape: recursive
    // setTimeout, attempt counter, no overlap with a previous fetch.

    _maybeStartRenditionsPoll(options = {}) {
        if (this._renditionsPollTimer) return; // already polling
        if (!options.force && !(this.model && this.model.isRenditionsProcessing && this.model.isRenditionsProcessing())) {
            return;
        }
        const maxAttempts = 60;       // 5 minutes at 5s
        const intervalMs = 5000;
        let attempts = 0;

        const tick = () => {
            this._renditionsPollTimer = null;
            if (!this.model) return;
            if (this.model.hasRenditions && this.model.hasRenditions()) return;
            if (++attempts > maxAttempts) return;

            this._renditionsPollTimer = setTimeout(async () => {
                try {
                    await this.model.fetch();
                } catch (err) {
                    console.warn('FileView: renditions poll fetch failed:', err);
                }
                tick();
            }, intervalMs);
        };

        tick();
    }

    _stopRenditionsPoll() {
        if (this._renditionsPollTimer) {
            clearTimeout(this._renditionsPollTimer);
            this._renditionsPollTimer = null;
        }
    }

    async onActionDeleteFile() {
        const confirmed = await Dialog.confirm(
            `Are you sure you want to delete the file "${this.model.get('filename')}"? This action cannot be undone.`,
            'Confirm Deletion',
            { confirmClass: 'btn-danger', confirmText: 'Delete' }
        );
        if (!confirmed) return;

        const resp = await this.model.destroy();
        if (resp && resp.success) {
            this.emit('file:deleted', { model: this.model });
        }
    }

    // Prevent model changes from triggering a full re-render.
    // Section views manage their own reactivity. Same pattern as UserView.
    _onModelChange() {
        // no-op
    }

    async showSection(name) {
        if (this.sideNavView) {
            await this.sideNavView.showSection(name);
        }
    }

    getActiveSection() {
        return this.sideNavView ? this.sideNavView.getActiveSection() : null;
    }

    static create(options = {}) {
        return new FileView(options);
    }
}

// ──────────────────────────────────────────────────────────────────────────
// Small HTML helpers — kept private to this file
// ──────────────────────────────────────────────────────────────────────────

function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeAttr(str) {
    return escapeHtml(str);
}

File.VIEW_CLASS = FileView;

export default FileView;
