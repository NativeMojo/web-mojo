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
import ContextMenu from '@core/views/feedback/ContextMenu.js';
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
        // Pass `model` through — View.setModel wires up the 'change'
        // listener automatically, no need to duplicate it here.
        super({
            className: 'file-preview-section p-3',
            ...options
        });
        this.categoryConfig = options.categoryConfig || CATEGORY_CONFIG.other;
    }

    /**
     * Override the base re-render-on-model-change behavior.
     * - video/audio elements must NOT re-render: the rendition poll fires
     *   model `change` every 5s while transcoding, and re-rendering would
     *   destroy and recreate the media element on every tick (visible
     *   reload cycle, lost playback state).
     * - image/pdf/document/archive previews are idempotent — re-render
     *   safely to pick up new rendition URLs as they arrive.
     */
    _onModelChange() {
        const type = this.categoryConfig?.previewType;
        if (type === 'video' || type === 'audio') return;
        if (this.isMounted()) this.render();
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
// FileRenditionsSection — Renditions gallery
//
// Renders each rendition as a card tile: inline preview (image thumbnail,
// video poster with play overlay, or category icon), role badge, dimensions
// + size, and three actions (Preview, Copy URL, Download).
//
// Three states:
//   - Gallery grid when renditions exist
//   - Processing placeholder when upload_status === 'completed' and the
//     backend worker hasn't populated renditions yet
//   - "Upload in progress" placeholder otherwise
//
// `model:` flows through to View.setModel which wires the built-in
// 'change' → _onModelChange → render() listener (guarded by isMounted).
// That's exactly what we want: swap placeholder for the grid, or add new
// rendition cards, as the rendition poll brings them in.
// ──────────────────────────────────────────────────────────────────────────

class FileRenditionsSection extends View {
    constructor(options = {}) {
        super({
            className: 'file-renditions-section p-3',
            ...options
        });
    }

    getTemplate() {
        if (this.model.hasRenditions && this.model.hasRenditions()) {
            return this._buildGalleryTemplate();
        }
        if (this.model.isRenditionsProcessing && this.model.isRenditionsProcessing()) {
            return this._buildProcessingTemplate();
        }
        return this._buildWaitingTemplate();
    }

    _buildGalleryTemplate() {
        const renditions = this.model.getRenditions();
        const cards = renditions.map(r => this._buildCard(r)).join('');
        const count = renditions.length;
        return `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <div class="text-muted small">
                    ${count} rendition${count === 1 ? '' : 's'}
                </div>
                <div class="btn-group btn-group-sm" role="group">
                    <button type="button" class="btn btn-outline-secondary" data-action="refresh-renditions" title="Refresh list">
                        <i class="bi bi-arrow-clockwise"></i>
                    </button>
                    <button type="button" class="btn btn-outline-secondary" data-action="regenerate-from-section" title="Rebuild all previews">
                        <i class="bi bi-arrow-repeat me-1"></i>Regenerate
                    </button>
                </div>
            </div>
            <div class="row g-3">${cards}</div>
        `;
    }

    _buildCard(r) {
        const url = r && r.url ? r.url : '';
        const ct = r && typeof r.content_type === 'string' ? r.content_type : '';
        const role = r && r.role ? r.role : 'rendition';
        const filename = r && r.filename ? r.filename : role;
        const size = r && r.file_size ? formatBytes(r.file_size) : '';
        const dimensions = (r && r.width && r.height) ? `${r.width} × ${r.height}` : '';

        const viewData = [
            `data-action="view-rendition"`,
            `data-url="${escapeAttr(url)}"`,
            `data-ct="${escapeAttr(ct)}"`,
            `data-filename="${escapeAttr(filename)}"`,
            `data-role="${escapeAttr(role)}"`
        ].join(' ');

        let preview;
        if (ct.startsWith('image/') && url) {
            preview = `<img src="${escapeAttr(url)}" alt="${escapeAttr(role)}"
                            loading="lazy"
                            class="w-100"
                            style="height: 140px; object-fit: cover; background: #f8f9fa; border-top-left-radius: var(--bs-card-inner-border-radius); border-top-right-radius: var(--bs-card-inner-border-radius);">`;
        } else if (ct.startsWith('video/')) {
            preview = `
                <div class="d-flex align-items-center justify-content-center position-relative"
                     style="height: 140px; background: linear-gradient(135deg, #212529 0%, #343a40 100%); color: #fff;
                            border-top-left-radius: var(--bs-card-inner-border-radius);
                            border-top-right-radius: var(--bs-card-inner-border-radius);">
                    <i class="bi bi-play-circle-fill" style="font-size: 2.75rem; opacity: 0.9;"></i>
                    <span class="position-absolute bottom-0 start-0 end-0 text-center small py-1"
                          style="background: rgba(0,0,0,0.35); font-variant-numeric: tabular-nums;">
                        ${escapeHtml(ct)}
                    </span>
                </div>`;
        } else if (ct.startsWith('audio/')) {
            preview = `
                <div class="d-flex align-items-center justify-content-center"
                     style="height: 140px; background: #f8f9fa;
                            border-top-left-radius: var(--bs-card-inner-border-radius);
                            border-top-right-radius: var(--bs-card-inner-border-radius);">
                    <i class="bi bi-music-note-beamed text-secondary" style="font-size: 2.5rem;"></i>
                </div>`;
        } else {
            preview = `
                <div class="d-flex align-items-center justify-content-center"
                     style="height: 140px; background: #f8f9fa;
                            border-top-left-radius: var(--bs-card-inner-border-radius);
                            border-top-right-radius: var(--bs-card-inner-border-radius);">
                    <i class="bi bi-file-earmark text-secondary" style="font-size: 2.5rem;"></i>
                </div>`;
        }

        const footer = url ? `
            <div class="card-footer p-1 d-flex gap-1 bg-white border-top-0">
                <button type="button" class="btn btn-sm btn-outline-primary flex-fill"
                        ${viewData}
                        title="Preview">
                    <i class="bi bi-eye"></i>
                </button>
                <button type="button" class="btn btn-sm btn-outline-secondary flex-fill"
                        data-action="copy-rendition-url" data-url="${escapeAttr(url)}"
                        title="Copy URL">
                    <i class="bi bi-clipboard"></i>
                </button>
                <a href="${escapeAttr(url)}" download="${escapeAttr(filename)}"
                   class="btn btn-sm btn-outline-secondary flex-fill"
                   title="Download"
                   data-stop-propagation>
                    <i class="bi bi-download"></i>
                </a>
            </div>
        ` : '';

        return `
            <div class="col-sm-6 col-md-4 col-lg-3">
                <div class="card h-100 shadow-sm rendition-card">
                    <div ${url ? viewData : ''} ${url ? 'role="button" style="cursor: pointer;"' : ''}>
                        ${preview}
                    </div>
                    <div class="card-body p-2">
                        <div class="d-flex justify-content-between align-items-start gap-2 mb-1">
                            <span class="badge bg-secondary text-truncate" style="max-width: 100%;" title="${escapeAttr(role)}">${escapeHtml(role)}</span>
                            ${size ? `<small class="text-muted flex-shrink-0" style="font-variant-numeric: tabular-nums;">${escapeHtml(size)}</small>` : ''}
                        </div>
                        ${dimensions ? `<div class="small text-muted" style="font-variant-numeric: tabular-nums;">${escapeHtml(dimensions)}</div>` : ''}
                    </div>
                    ${footer}
                </div>
            </div>
        `;
    }

    _buildProcessingTemplate() {
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
                <div class="d-inline-flex gap-2">
                    <button type="button" class="btn btn-sm btn-outline-secondary" data-action="refresh-renditions">
                        <i class="bi bi-arrow-clockwise me-1"></i>Refresh
                    </button>
                    <button type="button" class="btn btn-sm btn-outline-secondary" data-action="regenerate-from-section">
                        <i class="bi bi-arrow-repeat me-1"></i>Regenerate
                    </button>
                </div>
            </div>
        `;
    }

    _buildWaitingTemplate() {
        return `
            <div class="text-center p-5 bg-light rounded">
                <i class="bi bi-hourglass-split display-6 text-muted"></i>
                <h6 class="mt-3 mb-1">Upload still in progress</h6>
                <p class="text-muted small mb-0">Renditions will be generated once the upload completes.</p>
            </div>
        `;
    }

    // ── Actions ─────────────────────────────────────

    async onActionRefreshRenditions() {
        try {
            await this.model.fetch();
        } catch (err) {
            console.warn('FileView: refresh-renditions fetch failed:', err);
        }
    }

    async onActionViewRendition(event, element) {
        if (event) { event.preventDefault(); event.stopPropagation(); }
        const url = element.dataset.url;
        const ct  = element.dataset.ct || '';
        if (!url) return;

        if (ct.startsWith('image/')) {
            const Lightbox = typeof window !== 'undefined' ? window.MOJO?.plugins?.LightboxGallery : null;
            if (Lightbox && typeof Lightbox.show === 'function') {
                const images = this.model.getRenditions()
                    .filter(r => r && r.url && typeof r.content_type === 'string' && r.content_type.startsWith('image/'))
                    .map(r => ({ src: r.url, alt: r.role || '' }));
                const startIndex = Math.max(0, images.findIndex(img => img.src === url));
                Lightbox.show(images, { startIndex, fitToScreen: false });
                return;
            }
        }
        // Non-image renditions (video, audio, anything else) open in a new tab
        // — browsers have native players for these and the lightbox plugin
        // only handles images.
        window.open(url, '_blank', 'noopener');
    }

    async onActionCopyRenditionUrl(event, element) {
        if (event) { event.preventDefault(); event.stopPropagation(); }
        const url = element.dataset.url;
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
            // Short-lived visual confirmation on the clicked button
            const icon = element.querySelector('i');
            if (icon) {
                const orig = icon.className;
                icon.className = 'bi bi-check-lg text-success';
                setTimeout(() => { icon.className = orig; }, 1200);
            }
            this.getApp()?.toast?.success?.('URL copied to clipboard');
        } catch (err) {
            console.error('Failed to copy rendition URL:', err);
            this.getApp()?.toast?.error?.('Failed to copy URL');
        }
    }

    // Delegates up the parent chain to FileView.onActionRegenerateRenditions
    // so the section button behaves identically to the ContextMenu item.
    async onActionRegenerateFromSection() {
        let node = this.parent;
        while (node) {
            if (typeof node.onActionRegenerateRenditions === 'function') {
                return node.onActionRegenerateRenditions();
            }
            node = node.parent;
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

        // The SideNavView uses flex + overflow-y: auto on its content panel,
        // which needs a *bounded* parent height to scroll correctly. Without
        // a max-height the nav content stretches the dialog and overflows
        // past its own bounds. `min-height` keeps short content from looking
        // cramped; `max-height: 70vh` keeps tall content scrollable inside
        // the dialog on any viewport.
        this.template = `
            <div class="file-view-container d-flex flex-column" style="min-height: 0;">
                <!-- Header + Context Menu -->
                <div class="d-flex justify-content-between align-items-start mb-3 flex-shrink-0">
                    <div data-container="file-header" style="flex: 1; min-width: 0;"></div>
                    <div data-container="file-context-menu" class="ms-3 flex-shrink-0"></div>
                </div>
                <!-- Section body -->
                <div data-container="file-sidenav" class="flex-grow-1" style="min-height: 400px; max-height: 70vh;"></div>
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

function formatBytes(bytes) {
    if (bytes == null || isNaN(bytes)) return '';
    const n = Number(bytes);
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
    return `${(n / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

File.VIEW_CLASS = FileView;

export default FileView;
