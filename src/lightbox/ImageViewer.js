/**
 * ImageViewer - Canvas-based image viewing component with zoom, rotate, pan, and download capabilities
 * Built for the MOJO framework with full Bootstrap 5 integration
 */

import View from '/src/core/View.js';
import Dialog from '../core/Dialog.js';

export default class ImageViewer extends View {
  constructor(options = {}) {
    super({
      ...options,
      className: `image-viewer ${options.className || ''}`,
      tagName: 'div'
    });

    // Image properties
    this.imageUrl = options.imageUrl || options.src || '';
    this.alt = options.alt || 'Image';
    this.title = options.title || '';

    // Canvas properties
    this.canvas = null;
    this.context = null;
    this.image = null;

    // Transform state
    this.scale = 1;
    this.rotation = 0;
    this.translateX = 0;
    this.translateY = 0;
    this.minScale = 0.1;
    this.maxScale = 5;
    this.scaleStep = 0.1;

    // Interaction state
    this.isDragging = false;
    this.lastPointerX = 0;
    this.lastPointerY = 0;
    this.isLoaded = false;

    // Options
    this.showControls = options.showControls !== false;
    this.allowRotate = options.allowRotate !== false;
    this.allowZoom = options.allowZoom !== false;
    this.allowPan = options.allowPan !== false;
    this.allowDownload = options.allowDownload !== false;
    this.autoFit = options.autoFit !== false;

    // Elements
    this.containerElement = null;
    this.controlsElement = null;
  }

  async getTemplate() {
    return `
      <div class="image-viewer-container d-flex flex-column h-100" data-container="imageContainer">
        <div class="image-viewer-content flex-grow-1 position-relative">
          <canvas class="image-viewer-canvas w-100 h-100" data-container="canvas"></canvas>
          <div class="image-viewer-overlay">
            <div class="image-viewer-loading">
              <div class="spinner-border text-light" role="status">
                <span class="visually-hidden">Loading...</span>
              </div>
            </div>
          </div>
        </div>

        {{#showControls}}
        <div class="image-viewer-controls position-absolute top-0 start-50 translate-middle-x mt-3" data-container="controls" style="z-index: 10;">
          <div class="btn-group" role="group">
            {{#allowZoom}}
            <button type="button" class="btn btn-dark btn-sm" data-action="zoom-in" title="Zoom In">
              <i class="bi bi-zoom-in"></i>
            </button>
            <button type="button" class="btn btn-dark btn-sm" data-action="zoom-out" title="Zoom Out">
              <i class="bi bi-zoom-out"></i>
            </button>
            <button type="button" class="btn btn-dark btn-sm" data-action="zoom-fit" title="Fit to Screen">
              <i class="bi bi-arrows-fullscreen"></i>
            </button>
            <button type="button" class="btn btn-dark btn-sm" data-action="zoom-actual" title="Actual Size">
              <i class="bi bi-1-square"></i>
            </button>
            {{/allowZoom}}

            {{#allowRotate}}
            <button type="button" class="btn btn-dark btn-sm" data-action="rotate-left" title="Rotate Left">
              <i class="bi bi-arrow-counterclockwise"></i>
            </button>
            <button type="button" class="btn btn-dark btn-sm" data-action="rotate-right" title="Rotate Right">
              <i class="bi bi-arrow-clockwise"></i>
            </button>
            {{/allowRotate}}

            <button type="button" class="btn btn-dark btn-sm" data-action="reset" title="Reset View">
              <i class="bi bi-arrow-repeat"></i>
            </button>

            {{#allowDownload}}
            <button type="button" class="btn btn-dark btn-sm" data-action="download" title="Download Image">
              <i class="bi bi-download"></i>
            </button>
            {{/allowDownload}}
          </div>

          <div class="image-viewer-info">
            <span class="zoom-level">{{scale}}%</span>
          </div>
        </div>
        {{/showControls}}
      </div>
    `;
  }

  async onAfterRender() {
    // Cache DOM elements
    this.canvas = this.element.querySelector('.image-viewer-canvas');
    this.context = this.canvas.getContext('2d');
    this.containerElement = this.element.querySelector('.image-viewer-content');
    this.controlsElement = this.element.querySelector('.image-viewer-controls');

    // Set up canvas
    this.setupCanvas();

    // Set up event listeners
    this.setupEventListeners();

    // Load image if provided
    if (this.imageUrl) {
      this.loadImage(this.imageUrl);
    }
  }

  setupCanvas() {
    if (!this.canvas || !this.containerElement) return;

    // Set up canvas properties first
    if (this.context) {
      this.context.imageSmoothingEnabled = true;
      this.context.imageSmoothingQuality = 'high';
    }

    // Delay canvas sizing to allow dialog to fully render
    setTimeout(() => {
      this.resizeCanvas();

      // If image was already loaded while we were waiting, render it
      if (this.isLoaded && this.image) {
        this.renderCanvas();
      }
    }, 2000); // 100ms should be enough for dialog animation
  }

  resizeCanvas() {
    if (!this.canvas) return;

    // Use reasonable viewport-based dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Set canvas to reasonable size (80% of viewport with some padding)
    const canvasWidth = Math.floor(viewportWidth * 0.8);
    const canvasHeight = Math.floor(viewportHeight * 0.8);

    // Don't resize if dimensions haven't changed
    if (canvasWidth === this.canvasWidth && canvasHeight === this.canvasHeight) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;

    // Store display dimensions
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;

    // Set actual canvas buffer size (considering device pixel ratio)
    this.canvas.width = canvasWidth * dpr;
    this.canvas.height = canvasHeight * dpr;

    // Set display size via style
    this.canvas.style.width = canvasWidth + 'px';
    this.canvas.style.height = canvasHeight + 'px';

    // Reset transform and scale context for high DPI displays
    this.context.setTransform(dpr, 0, 0, dpr, 0, 0);

    // If image is loaded, re-render it
    if (this.isLoaded && this.image) {
      this.renderCanvas();
    }
  }

  setupEventListeners() {
    if (!this.canvas) return;

    // Mouse events
    if (this.allowPan) {
      this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
      document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
      document.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    }

    // Wheel events for zooming
    if (this.allowZoom) {
      this.canvas.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });
    }

    // Touch events
    this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
    this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
    this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));

    // Prevent context menu
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // Action handlers
  async handleActionZoomIn() {
    this.zoomIn();
  }

  async handleActionZoomOut() {
    this.zoomOut();
  }

  async handleActionZoomFit() {
    this.fitToContainer();
  }

  async handleActionZoomActual() {
    this.setScale(1);
    this.renderCanvas();
  }

  async handleActionRotateLeft() {
    this.rotate(-90);
  }

  async handleActionRotateRight() {
    this.rotate(90);
  }

  async handleActionReset() {
    this.reset();
  }

  async handleActionDownload() {
    this.downloadImage();
  }

  // Image loading
  loadImage(imageUrl) {
    this.isLoaded = false;
    this.element.classList.remove('loaded');

    const img = new Image();
    img.crossOrigin = 'anonymous'; // For downloading images from other domains

    img.onload = () => {
      this.image = img;
      this.handleImageLoad();
    };

    img.onerror = () => {
      this.handleImageError();
    };

    img.src = imageUrl;
  }

  handleImageLoad() {
    this.isLoaded = true;
    this.element.classList.add('loaded');

    // Ensure canvas is properly sized (with delay if needed)
    const ensureCanvasReady = () => {
      // Check if canvas has dimensions
      if (!this.canvasWidth || !this.canvasHeight) {
        this.resizeCanvas();
      }

      // Initial setup
      if (this.autoFit) {
        this.fitToContainer();
      } else {
        this.smartFit();
      }

      this.renderCanvas();
      this.updateControls();
    };

    // If canvas dimensions are not set yet, wait for dialog to render
    if (!this.canvasWidth || !this.canvasHeight) {
      setTimeout(ensureCanvasReady, 2000); // Wait for dialog
    } else {
      requestAnimationFrame(ensureCanvasReady);
    }

    // Emit event
    const eventBus = this.getApp()?.events;
    if (eventBus) {
      eventBus.emit('imageviewer:loaded', {
        viewer: this,
        imageUrl: this.imageUrl,
        naturalWidth: this.image.naturalWidth,
        naturalHeight: this.image.naturalHeight
      });
    }
  }

  handleImageError() {
    console.error('Failed to load image:', this.imageUrl);

    // Emit error event
    const eventBus = this.getApp()?.events;
    if (eventBus) {
      eventBus.emit('imageviewer:error', {
        viewer: this,
        imageUrl: this.imageUrl,
        error: 'Failed to load image'
      });
    }
  }

  // Mouse interaction
  handleMouseDown(e) {
    if (!this.allowPan || e.button !== 0) return;

    e.preventDefault();
    this.isDragging = true;

    const rect = this.canvas.getBoundingClientRect();
    this.lastPointerX = e.clientX - rect.left;
    this.lastPointerY = e.clientY - rect.top;

    this.canvas.style.cursor = 'grabbing';
  }

  handleMouseMove(e) {
    if (!this.isDragging || !this.allowPan) return;

    e.preventDefault();

    const rect = this.canvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    const deltaX = currentX - this.lastPointerX;
    const deltaY = currentY - this.lastPointerY;

    this.pan(deltaX, deltaY);

    this.lastPointerX = currentX;
    this.lastPointerY = currentY;
  }

  handleMouseUp(e) {
    if (!this.isDragging) return;

    this.isDragging = false;
    this.canvas.style.cursor = this.allowPan ? 'grab' : 'default';
  }

  handleWheel(e) {
    if (!this.allowZoom) return;

    e.preventDefault();

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const delta = e.deltaY > 0 ? -this.scaleStep * 0.5 : this.scaleStep * 0.5;
    this.zoomAtPoint(this.scale + delta, x, y);
  }

  // Touch events
  handleTouchStart(e) {
    if (e.touches.length === 1 && this.allowPan) {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();

      this.isDragging = true;
      this.lastPointerX = touch.clientX - rect.left;
      this.lastPointerY = touch.clientY - rect.top;
    }
  }

  handleTouchMove(e) {
    if (e.touches.length === 1 && this.isDragging && this.allowPan) {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();

      const currentX = touch.clientX - rect.left;
      const currentY = touch.clientY - rect.top;

      const deltaX = currentX - this.lastPointerX;
      const deltaY = currentY - this.lastPointerY;

      this.pan(deltaX, deltaY);

      this.lastPointerX = currentX;
      this.lastPointerY = currentY;
    }
  }

  handleTouchEnd(e) {
    this.isDragging = false;
  }

  // Transform methods
  zoomIn() {
    this.setScale(this.scale + this.scaleStep);
  }

  zoomOut() {
    this.setScale(this.scale - this.scaleStep);
  }

  setScale(scale) {
    const oldScale = this.scale;
    this.scale = Math.max(this.minScale, Math.min(this.maxScale, scale));
    this.renderCanvas();
    this.updateControls();

    // Emit scale change event
    const eventBus = this.getApp()?.events;
    if (eventBus && oldScale !== this.scale) {
      eventBus.emit('imageviewer:scale-changed', {
        viewer: this,
        oldScale,
        newScale: this.scale
      });
    }
  }

  zoomAtPoint(scale, x, y) {
    if (!this.image) return;

    const oldScale = this.scale;
    this.setScale(scale);

    if (oldScale !== this.scale) {
      const scaleDiff = this.scale / oldScale;
      const centerX = this.canvasWidth / 2;
      const centerY = this.canvasHeight / 2;

      // Adjust translation to zoom towards the point
      this.translateX = (this.translateX - (x - centerX)) * scaleDiff + (x - centerX);
      this.translateY = (this.translateY - (y - centerY)) * scaleDiff + (y - centerY);

      this.renderCanvas();
    }
  }

  pan(deltaX, deltaY) {
    this.translateX += deltaX;
    this.translateY += deltaY;
    this.renderCanvas();
  }

  rotate(degrees) {
    const oldRotation = this.rotation;
    this.rotation = (this.rotation + degrees) % 360;
    if (this.rotation < 0) this.rotation += 360;
    this.renderCanvas();

    // Emit rotation event
    const eventBus = this.getApp()?.events;
    if (eventBus) {
      eventBus.emit('imageviewer:rotated', {
        viewer: this,
        oldRotation,
        newRotation: this.rotation,
        degrees
      });
    }
  }

  center() {
    this.translateX = 0;
    this.translateY = 0;
    this.renderCanvas();
  }

  fitToContainer() {
    if (!this.image || !this.canvasWidth || !this.canvasHeight) return;

    const padding = 40;
    const availableWidth = this.canvasWidth - padding;
    const availableHeight = this.canvasHeight - padding;

    const scaleX = availableWidth / this.image.naturalWidth;
    const scaleY = availableHeight / this.image.naturalHeight;
    const scale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond 100%

    this.setScale(scale);
    this.renderCanvas();
  }

  smartFit() {
    if (!this.image || !this.canvasWidth || !this.canvasHeight) return;

    // If image is much larger than container, scale it down
    const padding = 80;
    const scaleX = (this.canvasWidth - padding) / this.image.naturalWidth;
    const scaleY = (this.canvasHeight - padding) / this.image.naturalHeight;
    const fitScale = Math.min(scaleX, scaleY);

    if (fitScale < 1) {
      this.setScale(fitScale);
    }

    this.renderCanvas();
  }

  reset() {
    this.scale = 1;
    this.rotation = 0;
    this.translateX = 0;
    this.translateY = 0;
    this.renderCanvas();
    this.updateControls();
  }

  // Canvas rendering
  renderCanvas() {
    if (!this.context || !this.canvasWidth || !this.canvasHeight) return;

    // Clear canvas
    this.context.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

    if (!this.image || !this.isLoaded) return;

    // Save context state
    this.context.save();

    // Move to center and apply transforms
    this.context.translate(
      this.canvasWidth / 2 + this.translateX,
      this.canvasHeight / 2 + this.translateY
    );
    this.context.scale(this.scale, this.scale);
    this.context.rotate(this.rotation * Math.PI / 180);

    // Draw image centered on the transform point
    this.context.drawImage(
      this.image,
      -this.image.naturalWidth / 2,
      -this.image.naturalHeight / 2
    );

    // Restore context state
    this.context.restore();
  }

  // Download functionality
  downloadImage() {
    if (!this.canvas) return;

    try {
      // Create download link
      const link = document.createElement('a');
      link.download = this.getDownloadFilename();
      link.href = this.canvas.toDataURL('image/png');

      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Emit download event
      const eventBus = this.getApp()?.events;
      if (eventBus) {
        eventBus.emit('imageviewer:downloaded', {
          viewer: this,
          filename: link.download
        });
      }
    } catch (error) {
      console.error('Failed to download image:', error);

      // Emit error event
      const eventBus = this.getApp()?.events;
      if (eventBus) {
        eventBus.emit('imageviewer:download-error', {
          viewer: this,
          error: error.message
        });
      }
    }
  }

  getDownloadFilename() {
    if (this.title) {
      return `${this.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;
    }

    // Try to extract filename from URL
    try {
      const url = new URL(this.imageUrl);
      const pathname = url.pathname;
      const filename = pathname.split('/').pop();
      if (filename && filename.includes('.')) {
        return filename.replace(/\.[^.]+$/, '.png'); // Replace extension with .png
      }
    } catch (e) {
      // Invalid URL, continue with fallback
    }

    return 'image.png';
  }

  updateControls() {
    if (!this.controlsElement) return;

    const zoomLevel = this.controlsElement.querySelector('.zoom-level');
    if (zoomLevel) {
      zoomLevel.textContent = `${Math.round(this.scale * 100)}%`;
    }

    // Update button states
    const zoomInBtn = this.controlsElement.querySelector('[data-action="zoom-in"]');
    const zoomOutBtn = this.controlsElement.querySelector('[data-action="zoom-out"]');

    if (zoomInBtn) {
      zoomInBtn.disabled = this.scale >= this.maxScale;
    }
    if (zoomOutBtn) {
      zoomOutBtn.disabled = this.scale <= this.minScale;
    }
  }

  // Public API methods
  setImage(imageUrl, alt = '', title = '') {
    const oldImageUrl = this.imageUrl;
    this.imageUrl = imageUrl;
    this.alt = alt;
    this.title = title;

    this.reset();
    this.loadImage(imageUrl);

    // Emit image changed event
    const eventBus = this.getApp()?.events;
    if (eventBus) {
      eventBus.emit('imageviewer:image-changed', {
        viewer: this,
        oldImageUrl,
        newImageUrl: imageUrl
      });
    }
  }

  getCurrentState() {
    return {
      scale: this.scale,
      rotation: this.rotation,
      translateX: this.translateX,
      translateY: this.translateY
    };
  }

  setState(state) {
    if (state.scale !== undefined) this.scale = state.scale;
    if (state.rotation !== undefined) this.rotation = state.rotation;
    if (state.translateX !== undefined) this.translateX = state.translateX;
    if (state.translateY !== undefined) this.translateY = state.translateY;
    this.renderCanvas();
    this.updateControls();
  }

  async onBeforeDestroy() {
    // Clean up
    if (this.isDragging) {
      this.isDragging = false;
    }



    // Emit destroy event
    const eventBus = this.getApp()?.events;
    if (eventBus) {
      eventBus.emit('imageviewer:destroyed', { viewer: this });
    }
  }

  // Static method to show image in a fullscreen dialog
  static async showDialog(imageUrl, options = {}) {
    const {
      title = 'Image Viewer',
      alt = 'Image',
      size = 'fullscreen',
      showControls = true,
      allowRotate = true,
      allowZoom = true,
      allowPan = true,
      allowDownload = true,
      ...dialogOptions
    } = options;

    const viewer = new ImageViewer({
      imageUrl,
      alt,
      title,
      showControls,
      allowRotate,
      allowZoom,
      allowPan,
      allowDownload,
      autoFit: true
    });

    return Dialog.showDialog({
        title,
        body: viewer,
        size,
        centered: true,
        backdrop: 'static',
        keyboard: true,
        buttons: [
          {
            text: 'Close',
            action: 'close',
            class: 'btn btn-secondary',
            dismiss: true
          }
        ],
        ...dialogOptions
    });
  }
}

window.ImageViewer = ImageViewer;
