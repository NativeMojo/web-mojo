/**
 * ImageTransformView - Canvas-based image viewer with zoom, pan, and rotation
 * Extends ImageCanvasView with transform capabilities
 */

import ImageCanvasView from './ImageCanvasView.js';
import Dialog from '../core/Dialog.js';

export default class ImageTransformView extends ImageCanvasView {
  constructor(options = {}) {
    super({
      ...options,
      className: `image-transform-view ${options.className || ''}`,
    });

    // Transform state
    this.scale = 1;
    this.rotation = 0;
    this.translateX = 0;
    this.translateY = 0;
    this.minScale = 0.1;
    this.maxScale = 5;
    this.scaleStep = 0.02;

    // Interaction state
    this.isDragging = false;
    this.lastPointerX = 0;
    this.lastPointerY = 0;

    // Options
    this.allowPan = options.allowPan !== false;
    this.allowZoom = options.allowZoom !== false;
    this.allowRotate = options.allowRotate !== false;
    this.allowKeyboard = options.allowKeyboard !== false;

    // Bind handlers for cleanup
    this._handleMouseMove = this.handleMouseMove.bind(this);
    this._handleMouseUp = this.handleMouseUp.bind(this);
    this._handleKeyboard = this.handleKeyboard.bind(this);

    if (!options.maxCanvasHeightPercent) {
      this.maxCanvasHeightPercent = 0.6;
    }
  }

  async getTemplate() {
    return `
      <div class="image-transform-container d-flex flex-column h-100">
        <!-- Transform Toolbar -->
        <div class="image-transform-toolbar bg-light border-bottom p-2">
          <div class="btn-toolbar justify-content-center" role="toolbar">
            <div class="btn-group me-2" role="group" aria-label="Zoom controls">
              <button type="button" class="btn btn-outline-primary btn-sm" data-action="zoom-in" title="Zoom In">
                <i class="bi bi-zoom-in"></i>
              </button>
              <button type="button" class="btn btn-outline-primary btn-sm" data-action="zoom-out" title="Zoom Out">
                <i class="bi bi-zoom-out"></i>
              </button>
              <button type="button" class="btn btn-outline-secondary btn-sm" data-action="fit-to-screen" title="Fit to Screen">
                <i class="bi bi-arrows-fullscreen"></i>
              </button>
              <button type="button" class="btn btn-outline-secondary btn-sm" data-action="actual-size" title="Actual Size">
                <i class="bi bi-1-square"></i>
              </button>
            </div>

            <div class="btn-group me-2" role="group" aria-label="Rotate controls">
              <button type="button" class="btn btn-outline-info btn-sm" data-action="rotate-left" title="Rotate Left">
                <i class="bi bi-arrow-counterclockwise"></i>
              </button>
              <button type="button" class="btn btn-outline-info btn-sm" data-action="rotate-right" title="Rotate Right">
                <i class="bi bi-arrow-clockwise"></i>
              </button>
            </div>

            <div class="btn-group" role="group" aria-label="Position controls">
              <button type="button" class="btn btn-outline-secondary btn-sm" data-action="center-image" title="Center Image">
                <i class="bi bi-bullseye"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- Canvas Area -->
        <div class="image-canvas-content flex-grow-1 position-relative d-flex justify-content-center align-items-center">
          <canvas class="image-canvas" data-container="canvas"></canvas>

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
    await super.onAfterRender();

    // Set up interaction event listeners
    this.setupInteractionListeners();
  }

  setupInteractionListeners() {
    if (!this.canvas) return;

    // Mouse events
    if (this.allowPan) {
      this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
      document.addEventListener('mousemove', this._handleMouseMove);
      document.addEventListener('mouseup', this._handleMouseUp);
    }

    // Wheel events for zooming
    if (this.allowZoom) {
      this.canvas.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });
    }

    // Touch events
    this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
    this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
    this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));

    // Keyboard shortcuts
    if (this.allowKeyboard) {
      document.addEventListener('keydown', this._handleKeyboard);
    }

    // Prevent context menu
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Set cursor
    this.canvas.style.cursor = this.allowPan ? 'grab' : 'default';
  }

  // Override renderImage to apply transforms
  renderImage() {
    if (!this.image) return;

    // Apply transforms
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

  // Keyboard shortcuts
  handleKeyboard(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    switch (e.key) {
      case '+':
      case '=':
        if (this.allowZoom) {
          e.preventDefault();
          this.zoomIn();
        }
        break;
      case '-':
        if (this.allowZoom) {
          e.preventDefault();
          this.zoomOut();
        }
        break;
      case '0':
        e.preventDefault();
        this.fitToContainer();
        break;
      case '1':
        e.preventDefault();
        this.actualSize();
        break;
      case 'r':
      case 'R':
        if (this.allowRotate) {
          e.preventDefault();
          this.rotateRight();
        }
        break;
    }
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

    if (oldScale !== this.scale) {
      this.renderCanvas();
      this.emitTransformEvent('scale-changed', { oldScale, newScale: this.scale });
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
    this.emitTransformEvent('panned', { deltaX, deltaY });
  }

  rotate(degrees) {
    const oldRotation = this.rotation;
    this.rotation = (this.rotation + degrees) % 360;
    if (this.rotation < 0) this.rotation += 360;

    this.renderCanvas();
    this.emitTransformEvent('rotated', { oldRotation, newRotation: this.rotation, degrees });
  }

  rotateLeft() {
    this.rotate(-90);
  }

  rotateRight() {
    this.rotate(90);
  }

  center() {
    this.translateX = 0;
    this.translateY = 0;
    this.renderCanvas();
    this.emitTransformEvent('centered');
  }

  actualSize() {
    this.setScale(1);
    this.center();
  }

  // Override fitToContainer with actual scaling logic
  fitToContainer() {
    if (!this.image || !this.canvasWidth || !this.canvasHeight) return;

    const padding = 40;
    const availableWidth = this.canvasWidth - padding;
    const availableHeight = this.canvasHeight - padding;

    const scaleX = availableWidth / this.image.naturalWidth;
    const scaleY = availableHeight / this.image.naturalHeight;
    const scale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond 100%

    this.setScale(scale);
    this.center();
  }

  smartFit() {
    if (!this.image || !this.canvasWidth || !this.canvasHeight) return;

    // If image is much larger than canvas, scale it down
    const padding = 80;
    const scaleX = (this.canvasWidth - padding) / this.image.naturalWidth;
    const scaleY = (this.canvasHeight - padding) / this.image.naturalHeight;
    const fitScale = Math.min(scaleX, scaleY);

    if (fitScale < 1) {
      this.setScale(fitScale);
    }

    this.center();
  }

  // Override reset with transform-specific logic
  reset() {
    this.scale = 1;
    this.rotation = 0;
    this.translateX = 0;
    this.translateY = 0;
    this.renderCanvas();
    this.emitTransformEvent('reset');
  }

  // Override handleImageLoad to apply initial transforms
  handleImageLoad() {
    super.handleImageLoad();

    if (this.autoFit) {
      this.fitToContainer();
    } else {
      this.smartFit();
    }
  }

  // State management
  getTransformState() {
    return {
      scale: this.scale,
      rotation: this.rotation,
      translateX: this.translateX,
      translateY: this.translateY
    };
  }

  setTransformState(state) {
    if (state.scale !== undefined) this.scale = state.scale;
    if (state.rotation !== undefined) this.rotation = state.rotation;
    if (state.translateX !== undefined) this.translateX = state.translateX;
    if (state.translateY !== undefined) this.translateY = state.translateY;
    this.renderCanvas();
  }

  // Event emission
  emitTransformEvent(type, data = {}) {
    const eventBus = this.getApp()?.events;
    if (eventBus) {
      eventBus.emit(`imagetransform:${type}`, {
        view: this,
        transform: this.getTransformState(),
        ...data
      });
    }
  }

  // Action handlers for toolbar buttons
  async handleActionZoomIn() {
    this.zoomIn();
  }

  async handleActionZoomOut() {
    this.zoomOut();
  }

  async handleActionFitToScreen() {
    this.fitToContainer();
  }

  async handleActionActualSize() {
    this.actualSize();
  }

  async handleActionRotateLeft() {
    this.rotateLeft();
  }

  async handleActionRotateRight() {
    this.rotateRight();
  }

  async handleActionCenterImage() {
    this.center();
  }

  // Cleanup
  async onBeforeDestroy() {
    await super.onBeforeDestroy();

    // Clean up interaction listeners
    if (this.isDragging) {
      this.isDragging = false;
    }

    // Remove document listeners
    document.removeEventListener('mousemove', this._handleMouseMove);
    document.removeEventListener('mouseup', this._handleMouseUp);
    document.removeEventListener('keydown', this._handleKeyboard);

    this.emitTransformEvent('destroyed');
  }

  // Static method to show transform view in a dialog for standalone testing
  static async showDialog(imageUrl, options = {}) {
    const {
      title = 'Transform Image',
      alt = 'Image',
      size = 'xl',
      allowPan = true,
      allowZoom = true,
      allowRotate = true,
      ...dialogOptions
    } = options;

    const transformView = new ImageTransformView({
      imageUrl,
      alt,
      title,
      allowPan,
      allowZoom,
      allowRotate
    });

    const dialog = new Dialog({
      title,
      body: transformView,
      size,
      centered: true,
      backdrop: 'static',
      keyboard: true,
      noBodyPadding: true,
      maxCanvasHeightPercent: 0.5,
      buttons: [
        {
          text: 'Cancel',
          action: 'cancel',
          class: 'btn btn-secondary',
          dismiss: true
        },
        {
          text: 'Apply Transform',
          action: 'apply-transform',
          class: 'btn btn-primary'
        }
      ],
      ...dialogOptions
    });

    // Render and mount
    await dialog.render(true, document.body);

    // Show the dialog
    dialog.show();

    return new Promise((resolve) => {
      dialog.on('hidden', () => {
        dialog.destroy();
        resolve({ action: 'cancel', view: transformView });
      });

      dialog.on('action:cancel', () => {
        dialog.hide();
      });

      dialog.on('action:apply-transform', async () => {
        const imageData = transformView.exportImageData();
        dialog.hide();
        resolve({
          action: 'transform',
          view: transformView,
          data: imageData,
          transformState: transformView.getTransformState()
        });
      });
    });
  }
}

window.ImageTransformView = Image
