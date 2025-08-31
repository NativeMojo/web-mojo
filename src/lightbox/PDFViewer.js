/**
 * PDFViewer - PDF document viewer component with zoom and navigation
 * Built for the MOJO framework with PDF.js integration
 */

import View from '../core/View.js';
import Dialog from '../core/Dialog.js';

export default class PDFViewer extends View {
  constructor(options = {}) {
    super({
      ...options,
      className: `pdf-viewer ${options.className || ''}`,
      tagName: 'div'
    });

    // PDF properties
    this.pdfUrl = options.pdfUrl || options.src || '';
    this.title = options.title || 'PDF Document';

    // PDF.js objects
    this.pdfDoc = null;
    this.currentPage = 1;
    this.totalPages = 0;
    this.pageRendering = false;
    this.pageNumPending = null;

    // Zoom and display state
    this.scale = 1.0;
    this.minScale = 0.25;
    this.maxScale = 5.0;
    this.scaleStep = 0.25;
    this.fitMode = 'page'; // 'page', 'width', 'auto'

    // Canvas and context
    this.canvas = null;
    this.ctx = null;

    // Options
    this.showControls = options.showControls !== false;
    this.allowZoom = options.allowZoom !== false;
    this.allowNavigation = options.allowNavigation !== false;
    this.showPageNumbers = options.showPageNumbers !== false;

    // Loading state
    this.isLoaded = false;
    this.isLoading = false;

    // PDF.js worker path - can be customized
    this.pdfjsWorkerPath = options.pdfjsWorkerPath || 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.js';
    this.pdfjsCMapUrl = options.pdfjsCMapUrl || 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/cmaps/';

    // Elements
    this.canvasContainer = null;
    this.controlsElement = null;
    this.statusElement = null;
    this.pageInput = null;
  }

  async getTemplate() {
    return `
      <div class="pdf-viewer-container">
        {{#showControls}}
        <div class="pdf-viewer-toolbar" data-container="toolbar">
          <div class="btn-toolbar" role="toolbar">
            <!-- Navigation Controls -->
            {{#allowNavigation}}
            <div class="btn-group me-2" role="group" aria-label="Navigation">
              <button type="button" class="btn btn-outline-secondary btn-sm" data-action="first-page" title="First Page">
                <i class="bi bi-chevron-double-left"></i>
              </button>
              <button type="button" class="btn btn-outline-secondary btn-sm" data-action="prev-page" title="Previous Page">
                <i class="bi bi-chevron-left"></i>
              </button>
              
              {{#showPageNumbers}}
              <div class="input-group input-group-sm" style="width: 120px;">
                <input type="number" class="form-control text-center page-input" min="1" value="1" data-change-action="page-input">
                <span class="input-group-text page-total">/ 0</span>
              </div>
              {{/showPageNumbers}}
              
              <button type="button" class="btn btn-outline-secondary btn-sm" data-action="next-page" title="Next Page">
                <i class="bi bi-chevron-right"></i>
              </button>
              <button type="button" class="btn btn-outline-secondary btn-sm" data-action="last-page" title="Last Page">
                <i class="bi bi-chevron-double-right"></i>
              </button>
            </div>
            {{/allowNavigation}}

            <!-- Zoom Controls -->
            {{#allowZoom}}
            <div class="btn-group me-2" role="group" aria-label="Zoom">
              <button type="button" class="btn btn-outline-secondary btn-sm" data-action="zoom-out" title="Zoom Out">
                <i class="bi bi-zoom-out"></i>
              </button>
              <button type="button" class="btn btn-outline-secondary btn-sm" data-action="zoom-in" title="Zoom In">
                <i class="bi bi-zoom-in"></i>
              </button>
              
              <div class="btn-group" role="group">
                <button type="button" class="btn btn-outline-secondary btn-sm dropdown-toggle" data-bs-toggle="dropdown" title="Fit">
                  <i class="bi bi-arrows-fullscreen"></i>
                </button>
                <ul class="dropdown-menu">
                  <li><a class="dropdown-item" href="#" data-action="fit-page">Fit Page</a></li>
                  <li><a class="dropdown-item" href="#" data-action="fit-width">Fit Width</a></li>
                  <li><a class="dropdown-item" href="#" data-action="actual-size">Actual Size</a></li>
                </ul>
              </div>
            </div>
            {{/allowZoom}}

            <!-- Utility Controls -->
            <div class="btn-group me-2" role="group" aria-label="Utilities">
              <button type="button" class="btn btn-outline-secondary btn-sm" data-action="download" title="Download">
                <i class="bi bi-download"></i>
              </button>
              <button type="button" class="btn btn-outline-secondary btn-sm" data-action="print" title="Print">
                <i class="bi bi-printer"></i>
              </button>
            </div>
          </div>
        </div>
        {{/showControls}}

        <!-- PDF Content Area -->
        <div class="pdf-viewer-content" data-container="content">
          <div class="pdf-canvas-container" data-container="canvasContainer">
            <canvas class="pdf-canvas" data-container="canvas"></canvas>
          </div>

          <div class="pdf-viewer-overlay">
            <div class="pdf-viewer-loading">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading PDF...</span>
              </div>
              <div class="mt-2">Loading PDF...</div>
            </div>
          </div>

          <div class="pdf-viewer-error" style="display: none;">
            <div class="alert alert-danger" role="alert">
              <i class="bi bi-exclamation-triangle"></i>
              <strong>Error:</strong> <span class="error-message">Failed to load PDF</span>
            </div>
          </div>
        </div>

        <!-- Status Bar -->
        <div class="pdf-viewer-status" data-container="status">
          <small class="text-muted">
            <span class="current-page">0</span> of <span class="total-pages">0</span> pages |
            <span class="zoom-level">100%</span> |
            <span class="document-title">{{title}}</span>
          </small>
        </div>
      </div>
    `;
  }

  get() {
    return {
      pdfUrl: this.pdfUrl,
      title: this.title,
      showControls: this.showControls,
      allowZoom: this.allowZoom,
      allowNavigation: this.allowNavigation,
      showPageNumbers: this.showPageNumbers
    };
  }

  async onAfterRender() {
    // Cache DOM elements
    this.canvas = this.element.querySelector('.pdf-canvas');
    this.canvasContainer = this.element.querySelector('.pdf-canvas-container');
    this.controlsElement = this.element.querySelector('.pdf-viewer-toolbar');
    this.statusElement = this.element.querySelector('.pdf-viewer-status');
    this.pageInput = this.element.querySelector('.page-input');
    this.overlayElement = this.element.querySelector('.pdf-viewer-overlay');
    this.errorElement = this.element.querySelector('.pdf-viewer-error');

    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d');
    }
// Set up essential event listeners (keyboard, resize)
this.setupEssentialEventListeners();

// Initialize PDF.js and load PDF
await this.initializePDFJS();
if (this.pdfUrl) {
  await this.loadPDF();
}
}



  setupEssentialEventListeners() {
    // Essential events that can't be handled by EventDelegate
    const keydownHandler = (e) => this.handleKeyDown(e);
    document.addEventListener('keydown', keydownHandler);

    // Canvas resize observer for fit mode
    let resizeObserver = null;
    if (this.canvasContainer) {
      resizeObserver = new ResizeObserver(() => {
        if (this.fitMode !== 'auto') {
          this.applyFitMode();
        }
      });
      resizeObserver.observe(this.canvasContainer);
    }

    // Store listeners for cleanup
    this._essentialListeners = [
      { el: document, type: 'keydown', fn: keydownHandler }
    ];
    this._resizeObserver = resizeObserver;
  }

  async initializePDFJS() {
    try {
      // Load PDF.js if not already loaded
      if (typeof window.pdfjsLib === 'undefined') {
        await this.loadPDFJSLibrary();
      }

      // Configure PDF.js
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = this.pdfjsWorkerPath;
      
      return true;
    } catch (error) {
      console.error('Failed to initialize PDF.js:', error);
      this.showError('Failed to initialize PDF viewer');
      return false;
    }
  }

  async loadPDFJSLibrary() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // Action Handlers
  async handleActionFirstPage() {
    await this.goToPage(1);
  }

  async handleActionPrevPage() {
    await this.goToPage(this.currentPage - 1);
  }

  async handleActionNextPage() {
    await this.goToPage(this.currentPage + 1);
  }

  async handleActionLastPage() {
    await this.goToPage(this.totalPages);
  }

  async onChangePageInput(event, element) {
    const pageNumber = parseInt(element.value, 10);
    if (pageNumber >= 1 && pageNumber <= this.totalPages) {
      await this.goToPage(pageNumber);
    } else {
      element.value = this.currentPage;
    }
  }

  async handleActionZoomIn() {
    this.setScale(this.scale + this.scaleStep);
  }

  async handleActionZoomOut() {
    this.setScale(this.scale - this.scaleStep);
  }

  async handleActionFitPage() {
    this.setFitMode('page');
  }

  async handleActionFitWidth() {
    this.setFitMode('width');
  }

  async handleActionActualSize() {
    this.setScale(1.0);
    this.fitMode = 'auto';
  }

  async handleActionDownload() {
    this.downloadPDF();
  }

  async handleActionPrint() {
    window.print();
  }

  // PDF Loading
  async loadPDF() {
    if (!this.pdfUrl || !window.pdfjsLib) {
      this.showError('PDF URL or PDF.js library not available');
      return false;
    }

    this.isLoading = true;
    this.showLoading();

    try {
      const loadingTask = window.pdfjsLib.getDocument({
        url: this.pdfUrl,
        cMapUrl: this.pdfjsCMapUrl,
        cMapPacked: true
      });

      this.pdfDoc = await loadingTask.promise;
      this.totalPages = this.pdfDoc.numPages;
      this.currentPage = 1;

      // Update UI
      this.updatePageControls();
      this.updateStatus();

      // Render first page
      await this.renderPage(1);

      this.isLoaded = true;
      this.isLoading = false;
      this.element.classList.add('loaded');
      this.hideLoading();

      // Apply initial fit mode
      this.applyFitMode();

      // Emit loaded event via EventBus
      const eventBus = this.getApp()?.events;
      if (eventBus) {
        eventBus.emit('pdfviewer:loaded', { 
          viewer: this, 
          pdfUrl: this.pdfUrl,
          totalPages: this.totalPages
        });
      }

      return true;

    } catch (error) {
      console.error('Error loading PDF:', error);
      this.isLoading = false;
      this.showError('Failed to load PDF document');
      
      // Emit error event via EventBus
      const eventBus = this.getApp()?.events;
      if (eventBus) {
        eventBus.emit('pdfviewer:error', { 
          viewer: this, 
          pdfUrl: this.pdfUrl,
          error: error.message
        });
      }
      
      return false;
    }
  }

  async renderPage(pageNumber) {
    if (this.pageRendering) {
      this.pageNumPending = pageNumber;
      return;
    }

    if (!this.pdfDoc || !this.canvas || !this.ctx) {
      return;
    }

    this.pageRendering = true;
    this.currentPage = pageNumber;

    try {
      const page = await this.pdfDoc.getPage(pageNumber);
      const viewport = page.getViewport({ scale: this.scale });

      // Set canvas dimensions
      this.canvas.height = viewport.height;
      this.canvas.width = viewport.width;

      // Clear canvas
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // Render page
      const renderContext = {
        canvasContext: this.ctx,
        viewport: viewport
      };

      const renderTask = page.render(renderContext);
      await renderTask.promise;

      this.pageRendering = false;

      // If there was a pending page render request
      if (this.pageNumPending !== null) {
        const pendingPage = this.pageNumPending;
        this.pageNumPending = null;
        await this.renderPage(pendingPage);
      }

      this.updatePageControls();
      this.updateStatus();

      // Emit page changed event
      const eventBus = this.getApp()?.events;
      if (eventBus) {
        eventBus.emit('pdfviewer:page-changed', { 
          viewer: this, 
          currentPage: this.currentPage,
          totalPages: this.totalPages
        });
      }

    } catch (error) {
      console.error('Error rendering page:', error);
      this.pageRendering = false;
      this.showError('Failed to render PDF page');
    }
  }

  // Navigation
  async goToPage(pageNumber) {
    if (!this.pdfDoc || pageNumber < 1 || pageNumber > this.totalPages) {
      return;
    }

    await this.renderPage(pageNumber);
  }

  // Zoom and Fit
  setScale(scale) {
    const oldScale = this.scale;
    this.scale = Math.max(this.minScale, Math.min(this.maxScale, scale));
    this.fitMode = 'auto';
    
    if (this.isLoaded) {
      this.renderPage(this.currentPage);
    }

    // Emit scale change event
    const eventBus = this.getApp()?.events;
    if (eventBus && oldScale !== this.scale) {
      eventBus.emit('pdfviewer:scale-changed', { 
        viewer: this, 
        oldScale, 
        newScale: this.scale 
      });
    }
  }

  setFitMode(mode) {
    const oldMode = this.fitMode;
    this.fitMode = mode;
    this.applyFitMode();

    // Emit fit mode change event
    const eventBus = this.getApp()?.events;
    if (eventBus) {
      eventBus.emit('pdfviewer:fit-mode-changed', { 
        viewer: this, 
        oldMode, 
        newMode: mode 
      });
    }
  }

  applyFitMode() {
    if (!this.isLoaded || !this.pdfDoc || !this.canvasContainer) {
      return;
    }

    this.pdfDoc.getPage(this.currentPage).then(page => {
      const containerRect = this.canvasContainer.getBoundingClientRect();
      const viewport = page.getViewport({ scale: 1 });

      let newScale;
      if (this.fitMode === 'page') {
        const scaleX = (containerRect.width - 40) / viewport.width;
        const scaleY = (containerRect.height - 40) / viewport.height;
        newScale = Math.min(scaleX, scaleY);
      } else if (this.fitMode === 'width') {
        newScale = (containerRect.width - 40) / viewport.width;
      } else {
        return; // auto mode, don't change scale
      }

      this.scale = Math.max(this.minScale, Math.min(this.maxScale, newScale));
      this.renderPage(this.currentPage);
    });
  }

  // Event Handlers
  handleKeyDown(e) {
    // Only handle if PDF viewer is focused or no input is focused
    if (e.target.tagName === 'INPUT' && e.target !== this.pageInput) {
      return;
    }

    switch (e.key) {
      case 'ArrowLeft':
      case 'PageUp':
        e.preventDefault();
        this.goToPage(this.currentPage - 1);
        break;
      case 'ArrowRight':
      case 'PageDown':
        e.preventDefault();
        this.goToPage(this.currentPage + 1);
        break;
      case 'Home':
        e.preventDefault();
        this.goToPage(1);
        break;
      case 'End':
        e.preventDefault();
        this.goToPage(this.totalPages);
        break;
      case '+':
      case '=':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          this.setScale(this.scale + this.scaleStep);
        }
        break;
      case '-':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          this.setScale(this.scale - this.scaleStep);
        }
        break;
      case '0':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          this.setFitMode('page');
        }
        break;
    }
  }

  // UI Updates
  updatePageControls() {
    // Update page input
    if (this.pageInput) {
      this.pageInput.value = this.currentPage;
    }

    // Update page total display
    const pageTotalElement = this.element.querySelector('.page-total');
    if (pageTotalElement) {
      pageTotalElement.textContent = `/ ${this.totalPages}`;
    }

    // Update navigation buttons
    const firstBtn = this.element.querySelector('[data-action="first-page"]');
    const prevBtn = this.element.querySelector('[data-action="prev-page"]');
    const nextBtn = this.element.querySelector('[data-action="next-page"]');
    const lastBtn = this.element.querySelector('[data-action="last-page"]');

    if (firstBtn) firstBtn.disabled = this.currentPage <= 1;
    if (prevBtn) prevBtn.disabled = this.currentPage <= 1;
    if (nextBtn) nextBtn.disabled = this.currentPage >= this.totalPages;
    if (lastBtn) lastBtn.disabled = this.currentPage >= this.totalPages;

    // Update zoom buttons
    const zoomInBtn = this.element.querySelector('[data-action="zoom-in"]');
    const zoomOutBtn = this.element.querySelector('[data-action="zoom-out"]');

    if (zoomInBtn) zoomInBtn.disabled = this.scale >= this.maxScale;
    if (zoomOutBtn) zoomOutBtn.disabled = this.scale <= this.minScale;
  }

  updateStatus() {
    if (!this.statusElement) return;

    const currentPageElement = this.statusElement.querySelector('.current-page');
    const totalPagesElement = this.statusElement.querySelector('.total-pages');
    const zoomLevelElement = this.statusElement.querySelector('.zoom-level');

    if (currentPageElement) {
      currentPageElement.textContent = this.currentPage;
    }
    if (totalPagesElement) {
      totalPagesElement.textContent = this.totalPages;
    }
    if (zoomLevelElement) {
      zoomLevelElement.textContent = `${Math.round(this.scale * 100)}%`;
    }
  }

  // Utility Methods
  showLoading() {
    if (this.overlayElement) {
      this.overlayElement.style.display = 'flex';
    }
  }

  hideLoading() {
    if (this.overlayElement) {
      this.overlayElement.style.display = 'none';
    }
  }

  showError(message) {
    this.hideLoading();
    
    if (this.errorElement) {
      const errorMessageElement = this.errorElement.querySelector('.error-message');
      if (errorMessageElement) {
        errorMessageElement.textContent = message;
      }
      this.errorElement.style.display = 'block';
    }

    console.error('PDF Viewer Error:', message);
  }

  downloadPDF() {
    if (!this.pdfUrl) return;

    const link = document.createElement('a');
    link.href = this.pdfUrl;
    link.download = this.title + '.pdf';
    link.target = '_blank';
    link.click();
  }

  // Public API
  setPDF(pdfUrl, title = '') {
    const oldPdfUrl = this.pdfUrl;
    this.pdfUrl = pdfUrl;
    this.title = title || 'PDF Document';
    this.isLoaded = false;
    this.element.classList.remove('loaded');
    
    if (this.pdfDoc) {
      this.pdfDoc.destroy();
      this.pdfDoc = null;
    }
    
    this.currentPage = 1;
    this.totalPages = 0;
    this.scale = 1.0;
    
    if (pdfUrl) {
      this.loadPDF();
    }

    // Emit PDF changed event
    const eventBus = this.getApp()?.events;
    if (eventBus) {
      eventBus.emit('pdfviewer:pdf-changed', { 
        viewer: this, 
        oldPdfUrl, 
        newPdfUrl: pdfUrl 
      });
    }
  }

  getCurrentPage() {
    return this.currentPage;
  }

  getTotalPages() {
    return this.totalPages;
  }

  getCurrentScale() {
    return this.scale;
  }

  async onBeforeDestroy() {
    // Clean up PDF.js resources
    if (this.pdfDoc) {
      this.pdfDoc.destroy();
      this.pdfDoc = null;
    }

    this.pageRendering = false;
    this.pageNumPending = null;

    // Clean up essential event listeners
    if (this._essentialListeners) {
      this._essentialListeners.forEach(({ el, type, fn }) => {
        if (el) el.removeEventListener(type, fn);
      });
      this._essentialListeners = null;
    }

    // Clean up resize observer
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }

    // Emit destroy event
    const eventBus = this.getApp()?.events;
    if (eventBus) {
      eventBus.emit('pdfviewer:destroyed', { viewer: this });
    }
  }

  // Static method to show PDF in a fullscreen dialog
  static async showDialog(pdfUrl, options = {}) {
    const {
      title = 'PDF Viewer',
      size = 'fullscreen',
      showControls = true,
      allowZoom = true,
      allowNavigation = true,
      showPageNumbers = true,
      ...dialogOptions
    } = options;

    const viewer = new PDFViewer({
      pdfUrl,
      title,
      showControls,
      allowZoom,
      allowNavigation,
      showPageNumbers
    });

    const dialog = new Dialog({
      title,
      body: viewer,
      size,
      centered: true,
      backdrop: 'static',
      keyboard: true,
      buttons: [
        { 
          text: 'Download', 
          action: 'download', 
          class: 'btn btn-outline-primary' 
        },
        { 
          text: 'Close', 
          action: 'close', 
          class: 'btn btn-secondary',
          dismiss: true
        }
      ],
      ...dialogOptions
    });

    // Render and mount
    await dialog.render();
    document.body.appendChild(dialog.element);
    await dialog.mount();

    // Show the dialog
    dialog.show();

    return new Promise((resolve) => {
      dialog.on('hidden', () => {
        dialog.destroy();
        resolve(viewer);
      });

      dialog.on('action:download', () => {
        viewer.downloadPDF();
      });

      dialog.on('action:close', () => {
        dialog.hide();
      });
    });
  }
}