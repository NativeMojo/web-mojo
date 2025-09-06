/**
 * ImageCanvasView - Base canvas view for image editing components
 * Provides shared canvas functionality for transform, crop, and filter views
 */

import View from '@core/View.js';

export default class ImageCanvasView extends View {
  constructor(options = {}) {
    super({
      ...options,
      className: `image-canvas-view ${options.className || ''}`,
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
    this.canvasWidth = 0;
    this.canvasHeight = 0;
    this.maxCanvasHeightPercent = options.maxCanvasHeightPercent || 0.7;
    this.maxCanvasWidthPercent = options.maxCanvasWidthPercent || 0.8;
    // Canvas size presets with viewport awareness
    this.canvasSizes = {
      sm: { width: 400, height: 300 },      // Small - thumbnails, previews
      md: { width: 600, height: 450 },      // Medium - dialogs, cards
      lg: { width: 800, height: 600 },      // Large - main editing
      xl: { width: 1000, height: 750 },     // Extra Large - detailed work
      fullscreen: { width: 0, height: 0 },  // Special case - use viewport
      auto: { width: 0, height: 0 }         // Auto-size based on image + viewport
    };

    // Default to auto-sizing with viewport constraints
    this.canvasSize = options.canvasSize || 'auto';

    // State
    this.isLoaded = false;
    this.isRendering = false;

    // Options
    this.autoFit = options.autoFit !== false;
    this.crossOrigin = options.crossOrigin || 'anonymous';
  }

  async getTemplate() {
    return `
      <div class="image-canvas-container d-flex flex-column h-100">
        <div class="image-canvas-content flex-grow-1 position-relative d-flex justify-content-center align-items-center">
          <canvas class="image-canvas w-100 h-100" data-container="canvas"></canvas>

          <!-- Loading Overlay -->
          <div class="image-canvas-loading position-absolute top-50 start-50 translate-middle"
               style="display: none; z-index: 10;">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async onAfterRender() {
    // Cache DOM elements
    this.canvas = this.element.querySelector('canvas');
    this.context = this.canvas.getContext('2d');
    this.containerElement = this.element.querySelector('.image-canvas-content');
    this.loadingElement = this.element.querySelector('.image-canvas-loading');

    // Set up canvas
    this.setupCanvas();

    // Load image if provided
    if (this.imageUrl) {
      this.loadImage(this.imageUrl);
    }
  }

  setupCanvas() {
    if (!this.canvas || !this.containerElement) return;

    // Set canvas dimensions based on size preset
    this.setCanvasSize(this.canvasSize);

    // Simple resize listener (only for fullscreen mode)
    if (this.canvasSize === 'fullscreen') {
      this._resizeHandler = () => this.setCanvasSize('fullscreen');
      window.addEventListener('resize', this._resizeHandler);
    }

    // Set up canvas context
    this.context.imageSmoothingEnabled = true;
    this.context.imageSmoothingQuality = 'high';
  }

  setCanvasSize(size) {
    const preset = this.canvasSizes[size];
    if (!preset && size !== 'auto') return;

    let canvasWidth, canvasHeight;

    if (size === 'fullscreen') {
      // Use viewport dimensions for fullscreen
      canvasWidth = Math.min(1200, window.innerWidth * 0.9);
      canvasHeight = Math.min(900, window.innerHeight * 0.8);
    } else if (size === 'auto' || !preset) {
      // Auto-size based on image with viewport constraints
      if (this.image) {
        // Scale image to fit within viewport constraints
        const maxWidth = window.innerWidth * this.maxCanvasWidthPercent;
        const maxHeight = window.innerHeight * this.maxCanvasHeightPercent;

        const scaleX = maxWidth / this.image.naturalWidth;
        const scaleY = maxHeight / this.image.naturalHeight;
        const scale = Math.min(scaleX, scaleY, 1); // Don't scale up

        canvasWidth = Math.floor(this.image.naturalWidth * scale);
        canvasHeight = Math.floor(this.image.naturalHeight * scale);

        // Ensure minimum usable size
        canvasWidth = Math.max(300, canvasWidth);
        canvasHeight = Math.max(200, canvasHeight);
      } else {
        // No image yet - use medium preset with viewport constraints
        canvasWidth = Math.min(600, window.innerWidth * this.maxCanvasWidthPercent);
        canvasHeight = Math.min(450, window.innerHeight * this.maxCanvasHeightPercent);
      }
    } else {
      // Check if preset fits within 80% viewport - if not, fall back to auto
      const maxWidth = window.innerWidth * this.maxCanvasWidthPercent;
      const maxHeight = window.innerHeight * this.maxCanvasHeightPercent;

      if (preset.width > maxWidth || preset.height > maxHeight) {
        // Preset is too big - fall back to auto sizing
        if (this.image) {
          const scaleX = maxWidth / this.image.naturalWidth;
          const scaleY = maxHeight / this.image.naturalHeight;
          const scale = Math.min(scaleX, scaleY, 1); // Don't scale up

          canvasWidth = Math.floor(this.image.naturalWidth * scale);
          canvasHeight = Math.floor(this.image.naturalHeight * scale);

          // Ensure minimum usable size
          canvasWidth = Math.max(300, canvasWidth);
          canvasHeight = Math.max(200, canvasHeight);
        } else {
          // No image yet - use medium preset with viewport constraints
          canvasWidth = Math.min(600, maxWidth);
          canvasHeight = Math.min(450, maxHeight);
        }
      } else {
        // Preset fits - use it as-is
        canvasWidth = preset.width;
        canvasHeight = preset.height;
      }
    }

    // Final safety check (should not be needed now, but kept for robustness)
    canvasWidth = Math.min(canvasWidth, window.innerWidth * this.maxCanvasWidthPercent);
    canvasHeight = Math.min(canvasHeight, window.innerHeight * this.maxCanvasHeightPercent);

    // Don't resize if dimensions haven't changed significantly
    if (Math.abs(canvasWidth - this.canvasWidth) < 10 &&
        Math.abs(canvasHeight - this.canvasHeight) < 10) {
      return;
    }

    // Set dimensions and DPR handling
    const dpr = window.devicePixelRatio || 1;

    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;

    this.canvas.width = canvasWidth * dpr;
    this.canvas.height = canvasHeight * dpr;

    this.canvas.style.width = canvasWidth + 'px';
    this.canvas.style.height = canvasHeight + 'px';

    this.context.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (this.isLoaded) {
      this.renderCanvas();
    }
  }

  // Image loading
  loadImage(imageUrl) {
    if (!imageUrl) return;

    this.imageUrl = imageUrl;
    this.isLoaded = false;
    this.element.classList.remove('loaded');
    this.showLoading();

    const img = new Image();
    if (this.crossOrigin) {
      img.crossOrigin = this.crossOrigin;
    }

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
    this.hideLoading();

    // Initial setup
    // Resize canvas based on loaded image (especially for auto-sizing)
    if (this.canvasSize === 'auto') {
      this.setCanvasSize('auto');
    } else if (this.autoFit) {
      this.fitToContainer();
    }

    this.renderCanvas();

    // Emit load event
    const eventBus = this.getApp()?.events;
    if (eventBus) {
      eventBus.emit('imagecanvas:loaded', {
        view: this,
        imageUrl: this.imageUrl,
        naturalWidth: this.image.naturalWidth,
        naturalHeight: this.image.naturalHeight
      });
    }
  }

  handleImageError() {
    console.error('Failed to load image:', this.imageUrl);
    this.hideLoading();

    // Emit error event
    const eventBus = this.getApp()?.events;
    if (eventBus) {
      eventBus.emit('imagecanvas:error', {
        view: this,
        imageUrl: this.imageUrl,
        error: 'Failed to load image'
      });
    }
  }

  showLoading() {
    if (this.loadingElement) {
      this.loadingElement.style.display = 'block';
    }
  }

  hideLoading() {
    if (this.loadingElement) {
      this.loadingElement.style.display = 'none';
    }
  }

  // Base canvas rendering - to be extended by child classes
  renderCanvas() {
    if (!this.context || !this.canvasWidth || !this.canvasHeight || this.isRendering) return;

    this.isRendering = true;

    // Clear canvas
    this.context.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

    if (!this.image || !this.isLoaded) {
      this.isRendering = false;
      return;
    }

    // Save context state
    this.context.save();

    // Basic centered rendering - child classes can override this
    this.renderImage();

    // Restore context state
    this.context.restore();

    this.isRendering = false;
  }

  // Basic image rendering with smart scaling - can be overridden
  renderImage() {
    if (!this.image) return;

    // Calculate scale to fit image in canvas
    const scaleX = this.canvasWidth / this.image.naturalWidth;
    const scaleY = this.canvasHeight / this.image.naturalHeight;
    const scale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond 100%

    // Calculate centered position
    const scaledWidth = this.image.naturalWidth * scale;
    const scaledHeight = this.image.naturalHeight * scale;
    const x = (this.canvasWidth - scaledWidth) / 2;
    const y = (this.canvasHeight - scaledHeight) / 2;

    // Draw scaled and centered image
    this.context.drawImage(this.image, x, y, scaledWidth, scaledHeight);
  }

  // Utility methods
  fitToContainer() {
    // Base implementation - child classes should override
    if (!this.image || !this.canvasWidth || !this.canvasHeight) return;

    const padding = 40;
    const availableWidth = this.canvasWidth - padding;
    const availableHeight = this.canvasHeight - padding;

    const scaleX = availableWidth / this.image.naturalWidth;
    const scaleY = availableHeight / this.image.naturalHeight;
    const scale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond 100%

    // Resize canvas to accommodate image
    if (this.canvasSize === 'auto') {
      this.setCanvasSize('auto');
    }

    // Child classes will implement actual scaling
    this.renderCanvas();
  }

  center() {
    // Base implementation - child classes should override
    this.renderCanvas();
  }

  reset() {
    // Base implementation - child classes should override
    this.renderCanvas();
  }

  // Export functionality
  exportImageData() {
    if (!this.canvas) return null;

    try {
      return this.canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Failed to export image data:', error);
      return null;
    }
  }

  exportImageBlob(quality = 0.9) {
    if (!this.canvas) return Promise.resolve(null);

    return new Promise((resolve) => {
      try {
        this.canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/png', quality);
      } catch (error) {
        console.error('Failed to export image blob:', error);
        resolve(null);
      }
    });
  }

  // Public API
  setImage(imageUrl, alt = '', title = '') {
    const oldImageUrl = this.imageUrl;
    this.alt = alt;
    this.title = title;

    this.loadImage(imageUrl);

    // Emit image changed event
    const eventBus = this.getApp()?.events;
    if (eventBus) {
      eventBus.emit('imagecanvas:image-changed', {
        view: this,
        oldImageUrl,
        newImageUrl: imageUrl
      });
    }
  }

  getImageData() {
    return {
      imageUrl: this.imageUrl,
      alt: this.alt,
      title: this.title,
      naturalWidth: this.image?.naturalWidth || 0,
      naturalHeight: this.image?.naturalHeight || 0,
      isLoaded: this.isLoaded
    };
  }

  async onBeforeDestroy() {
    // Clean up
    this.isLoaded = false;
    this.isRendering = false;
    this.image = null;

    // Remove resize listener
    if (this._resizeHandler) {
      window.removeEventListener('resize', this._resizeHandler);
    }

    // Emit destroy event
    const eventBus = this.getApp()?.events;
    if (eventBus) {
      eventBus.emit('imagecanvas:destroyed', { view: this });
    }
  }
}

window.ImageCanvasView = ImageCanvasView;
