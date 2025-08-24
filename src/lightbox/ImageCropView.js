/**
 * ImageCropView - Canvas-based image cropping with interactive selection
 * Extends ImageCanvasView with crop functionality
 */

import ImageCanvasView from './ImageCanvasView.js';
import Dialog from '../components/Dialog.js';

export default class ImageCropView extends ImageCanvasView {
  constructor(options = {}) {
    super({
      ...options,
      className: `image-crop-view ${options.className || ''}`,
    });

    // Store original image URL for reset functionality
    this.originalImageUrl = options.imageUrl;

    // Crop state
    this.cropMode = false;
    this.cropBox = { x: 0, y: 0, width: 0, height: 0 };
    this.aspectRatio = options.aspectRatio || null; // null for free crop, number for fixed ratio
    this.minCropSize = options.minCropSize || 50;
    this.fixedCropSize = options.fixedCropSize || null; // { width: number, height: number } for fixed size crop
    this.cropAndScale = options.cropAndScale || null; // { width: number, height: number } for aspect ratio + scaling

    // Interaction state
    this.isDragging = false;
    this.isResizing = false;
    this.dragHandle = null;
    this.dragStartImageX = 0; // Drag start in image coordinates
    this.dragStartImageY = 0; // Drag start in image coordinates
    this.initialCropBox = null;
    this.newCropStart = null; // For creating new crop boxes

    // Handle positions for resizing
    this.handles = {
      'nw': { cursor: 'nw-resize', x: 0, y: 0 },
      'ne': { cursor: 'ne-resize', x: 1, y: 0 },
      'sw': { cursor: 'sw-resize', x: 0, y: 1 },
      'se': { cursor: 'se-resize', x: 1, y: 1 },
      'n':  { cursor: 'n-resize', x: 0.5, y: 0 },
      's':  { cursor: 's-resize', x: 0.5, y: 1 },
      'w':  { cursor: 'w-resize', x: 0, y: 0.5 },
      'e':  { cursor: 'e-resize', x: 1, y: 0.5 }
    };

    // Options
    this.handleSize = options.handleSize || 12;
    this.showGrid = options.showGrid !== false;
    this.showToolbar = options.showToolbar !== false; // Default to true - show toolbar
    this.autoFit = options.autoFit !== false; // Default to true - auto-fit large images

    // Image positioning on canvas
    this.imageOffsetX = 0;
    this.imageOffsetY = 0;

    // Bind handlers for cleanup
    this._handleMouseMove = this.handleMouseMove.bind(this);
    this._handleMouseUp = this.handleMouseUp.bind(this);
    if (!options.maxCanvasHeightPercent && this.showToolbar) {
      this.maxCanvasHeightPercent = 0.6;
    }
  }

  // Coordinate conversion helpers
  imageToCanvas(imageCoords) {
    if (!this.image) return imageCoords;

    // Calculate scale and positioning of image on canvas (same as renderImage)
    const scaleX = this.canvasWidth / this.image.naturalWidth;
    const scaleY = this.canvasHeight / this.image.naturalHeight;

    let imageScale;
    if (this.autoFit) {
      imageScale = Math.min(scaleX, scaleY, 1); // Scale down if needed, but don't scale up
    } else {
      imageScale = 1; // Always show at actual size (1:1)
    }

    const scaledImageWidth = this.image.naturalWidth * imageScale;
    const scaledImageHeight = this.image.naturalHeight * imageScale;
    const imageX = (this.canvasWidth - scaledImageWidth) / 2;
    const imageY = (this.canvasHeight - scaledImageHeight) / 2;

    return {
      x: imageCoords.x * imageScale + imageX,
      y: imageCoords.y * imageScale + imageY,
      width: imageCoords.width * imageScale,
      height: imageCoords.height * imageScale
    };
  }

  canvasToImage(canvasCoords) {
    if (!this.image) return canvasCoords;

    // Calculate scale and positioning of image on canvas (same as renderImage)
    const scaleX = this.canvasWidth / this.image.naturalWidth;
    const scaleY = this.canvasHeight / this.image.naturalHeight;

    let imageScale;
    if (this.autoFit) {
      imageScale = Math.min(scaleX, scaleY, 1); // Scale down if needed, but don't scale up
    } else {
      imageScale = 1; // Always show at actual size (1:1)
    }

    const scaledImageWidth = this.image.naturalWidth * imageScale;
    const scaledImageHeight = this.image.naturalHeight * imageScale;
    const imageX = (this.canvasWidth - scaledImageWidth) / 2;
    const imageY = (this.canvasHeight - scaledImageHeight) / 2;

    return {
      x: (canvasCoords.x - imageX) / imageScale,
      y: (canvasCoords.y - imageY) / imageScale,
      width: canvasCoords.width / imageScale,
      height: canvasCoords.height / imageScale
    };
  }

  pointCanvasToImage(canvasX, canvasY) {
    const result = this.canvasToImage({ x: canvasX, y: canvasY, width: 0, height: 0 });
    return { x: result.x, y: result.y };
  }

  async getTemplate() {
    return `
      <div class="image-crop-container d-flex flex-column h-100">
        {{#showToolbar}}
        <!-- Crop Toolbar -->
        <div class="image-crop-toolbar bg-light border-bottom p-2">
          <div class="btn-toolbar justify-content-center" role="toolbar">
            <div class="btn-group me-2" role="group" aria-label="Aspect ratio">
              <button type="button" class="btn btn-outline-secondary btn-sm dropdown-toggle"
                      data-bs-toggle="dropdown" title="Aspect Ratio">
                <i class="bi bi-aspect-ratio"></i> Ratio
              </button>
              <ul class="dropdown-menu">
                <li><a class="dropdown-item" href="#" data-action="set-aspect-ratio" data-ratio="free">Free</a></li>
                <li><a class="dropdown-item" href="#" data-action="set-aspect-ratio" data-ratio="1">1:1 Square</a></li>
                <li><a class="dropdown-item" href="#" data-action="set-aspect-ratio" data-ratio="1.333">4:3</a></li>
                <li><a class="dropdown-item" href="#" data-action="set-aspect-ratio" data-ratio="1.777">16:9</a></li>
                <li><a class="dropdown-item" href="#" data-action="set-aspect-ratio" data-ratio="0.75">3:4 Portrait</a></li>
              </ul>
            </div>

            <div class="btn-group me-2" role="group" aria-label="Fit mode">
              <button type="button" class="btn btn-outline-info btn-sm" data-action="toggle-auto-fit" title="Toggle Auto-fit">
                <i class="bi bi-arrows-fullscreen"></i> <span class="auto-fit-text">Fit</span>
              </button>
            </div>

            <div class="btn-group me-2" role="group" aria-label="Crop actions">
              <button type="button" class="btn btn-success btn-sm" data-action="apply-crop" title="Apply Crop">
                <i class="bi bi-check"></i> Apply
              </button>
              <button type="button" class="btn btn-outline-secondary btn-sm" data-action="reset-crop" title="Reset Crop">
                <i class="bi bi-arrow-repeat"></i> Reset
              </button>
            </div>
          </div>
        </div>
        {{/showToolbar}}

        <!-- Canvas Area -->
        <div class="image-canvas-content flex-grow-1 position-relative d-flex justify-content-center align-items-center">
          <canvas class="image-crop-canvas" data-container="canvas"></canvas>

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

    // Set up crop interaction listeners
    this.setupCropListeners();

    // Initialize autoFit button state
    this.updateAutoFitButtonState();
  }



  updateAutoFitButtonState() {
    // Skip if toolbar is hidden
    if (!this.showToolbar) return;

    const button = this.element.querySelector('[data-action="toggle-auto-fit"]');
    const textSpan = button?.querySelector('.auto-fit-text');

    if (button && textSpan) {
      if (this.autoFit) {
        button.classList.remove('btn-outline-warning');
        button.classList.add('btn-outline-info');
        button.title = 'Toggle Auto-fit (currently: fit to canvas)';
        textSpan.textContent = 'Fit';
      } else {
        button.classList.remove('btn-outline-info');
        button.classList.add('btn-outline-warning');
        button.title = 'Toggle Auto-fit (currently: actual size)';
        textSpan.textContent = '1:1';
      }
    }
  }

  handleImageLoad() {
    // Call parent method first
    super.handleImageLoad();

    // Calculate image offset for coordinate conversion
    this.updateImageOffset();

    // Start crop mode once image is loaded and canvas is ready
    // Use a small delay to ensure canvas dimensions are properly set
    setTimeout(() => {
      if (this.isLoaded && this.canvasWidth > 0 && this.canvasHeight > 0) {
        this.startCropMode();
      }
    }, 10);
  }

  updateImageOffset() {
    if (!this.image) return;

    // Calculate scale and positioning (same as renderImage)
    const scaleX = this.canvasWidth / this.image.naturalWidth;
    const scaleY = this.canvasHeight / this.image.naturalHeight;

    let scale;
    if (this.autoFit) {
      // Auto-fit: scale down if image is larger than canvas, but don't scale up
      scale = Math.min(scaleX, scaleY, 1);
    } else {
      // No auto-fit: always show at actual size (1:1)
      scale = 1;
    }

    const scaledWidth = this.image.naturalWidth * scale;
    const scaledHeight = this.image.naturalHeight * scale;

    // Store offset and scale for coordinate conversions
    this.imageOffsetX = (this.canvasWidth - scaledWidth) / 2;
    this.imageOffsetY = (this.canvasHeight - scaledHeight) / 2;
    this.imageScale = scale;

    console.log('Updated image offset:', this.imageOffsetX, this.imageOffsetY, 'scale:', this.imageScale, 'autoFit:', this.autoFit);
  }

  // Override setCanvasSize to update image offset when canvas is resized
  setCanvasSize(size) {
    super.setCanvasSize(size);

    // Update image offset after canvas resize
    if (this.image && this.isLoaded) {
      this.updateImageOffset();
    }
  }

  // Override renderImage to scale and center the image (consistent with coordinate conversion)
  renderImage() {
    if (!this.image) return;

    // Calculate scale to fit image in canvas
    const scaleX = this.canvasWidth / this.image.naturalWidth;
    const scaleY = this.canvasHeight / this.image.naturalHeight;

    let scale;
    if (this.autoFit) {
      // Auto-fit: scale down if image is larger than canvas, but don't scale up
      scale = Math.min(scaleX, scaleY, 1);
    } else {
      // No auto-fit: always show at actual size (1:1)
      scale = 1;
    }

    // Calculate centered position
    const scaledWidth = this.image.naturalWidth * scale;
    const scaledHeight = this.image.naturalHeight * scale;
    const x = (this.canvasWidth - scaledWidth) / 2;
    const y = (this.canvasHeight - scaledHeight) / 2;

    // Draw scaled and centered image
    this.context.drawImage(this.image, x, y, scaledWidth, scaledHeight);
  }

  setupCropListeners() {
    if (!this.canvas) return;

    // Mouse events for crop interaction
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    document.addEventListener('mousemove', this._handleMouseMove);
    document.addEventListener('mouseup', this._handleMouseUp);

    // Touch events
    this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
    this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
    this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));

    // Set default cursor
    this.canvas.style.cursor = 'crosshair';
  }

  // Override renderCanvas to include crop overlay
  renderCanvas() {
    super.renderCanvas();

    if (this.cropMode) {
      this.renderCropOverlay();
    }
  }

  renderCropOverlay() {
    if (!this.cropMode || !this.cropBox) return;

    // Convert crop box from image coordinates to canvas coordinates
    const canvasBox = this.imageToCanvas(this.cropBox);

    // Save context state
    this.context.save();

    // Create crop hole - fill entire canvas then clear crop area
    this.context.globalAlpha = 0.5;
    this.context.fillStyle = '#000000';
    this.context.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    // Clear crop area (creates transparent hole)
    this.context.globalCompositeOperation = 'destination-out';
    this.context.fillRect(
      canvasBox.x,
      canvasBox.y,
      canvasBox.width,
      canvasBox.height
    );

    // Reset composite operation
    this.context.globalCompositeOperation = 'source-over';

    // Draw crop box border
    this.context.globalAlpha = 1.0;
    this.context.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    this.context.lineWidth = 2;
    this.context.strokeRect(
      canvasBox.x,
      canvasBox.y,
      canvasBox.width,
      canvasBox.height
    );

    // Draw grid lines if enabled
    if (this.showGrid) {
      this.drawGrid();
    }

    // Draw resize handles
    this.drawHandles();

    // Restore context state
    this.context.restore();
  }

  // Override parent's exportImageBlob to export only the cropped area without overlay
  exportImageBlob(quality = 0.9) {
    if (!this.canvas || !this.image || !this.isLoaded || !this.cropMode) {
      // Fallback to parent implementation if crop mode not active
      return super.exportImageBlob(quality);
    }

    return new Promise((resolve) => {
      try {
        console.log('[ImageCropView] Exporting cropped image without overlay');
        console.log('[ImageCropView] Crop box:', this.cropBox);
        
        // Calculate the actual crop area in image coordinates
        const cropArea = {
          x: Math.max(0, Math.min(this.cropBox.x, this.image.naturalWidth)),
          y: Math.max(0, Math.min(this.cropBox.y, this.image.naturalHeight)),
          width: Math.min(this.cropBox.width, this.image.naturalWidth - this.cropBox.x),
          height: Math.min(this.cropBox.height, this.image.naturalHeight - this.cropBox.y)
        };

        console.log('[ImageCropView] Crop area in image coords:', cropArea);

        // Handle cropAndScale option
        let outputWidth = cropArea.width;
        let outputHeight = cropArea.height;
        
        if (this.cropAndScale) {
          outputWidth = this.cropAndScale.width;
          outputHeight = this.cropAndScale.height;
          console.log('[ImageCropView] Scaling to:', outputWidth, 'x', outputHeight);
        }

        // Create temporary canvas for cropped image
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = outputWidth;
        tempCanvas.height = outputHeight;
        const tempContext = tempCanvas.getContext('2d');

        // Draw the cropped portion of the image
        tempContext.drawImage(
          this.image,
          cropArea.x, cropArea.y, cropArea.width, cropArea.height,  // Source rectangle
          0, 0, outputWidth, outputHeight  // Destination rectangle
        );

        // Export the cropped image
        tempCanvas.toBlob((blob) => {
          console.log('[ImageCropView] Successfully exported cropped image blob:', blob?.size, 'bytes');
          resolve(blob);
        }, 'image/png', quality);
      } catch (error) {
        console.error('Failed to export cropped image blob:', error);
        resolve(null);
      }
    });
  }

  drawGrid() {
    // Convert crop box to canvas coordinates for grid rendering
    const canvasBox = this.imageToCanvas(this.cropBox);

    this.context.globalAlpha = 0.6;
    this.context.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    this.context.lineWidth = 1;

    const thirdW = canvasBox.width / 3;
    const thirdH = canvasBox.height / 3;

    // Vertical lines
    for (let i = 1; i < 3; i++) {
      const x = canvasBox.x + (thirdW * i);
      this.context.beginPath();
      this.context.moveTo(x, canvasBox.y);
      this.context.lineTo(x, canvasBox.y + canvasBox.height);
      this.context.stroke();
    }

    // Horizontal lines
    for (let i = 1; i < 3; i++) {
      const y = canvasBox.y + (thirdH * i);
      this.context.beginPath();
      this.context.moveTo(canvasBox.x, y);
      this.context.lineTo(canvasBox.x + canvasBox.width, y);
      this.context.stroke();
    }
  }

  drawHandles() {
    // Don't draw resize handles for fixed crop size
    if (this.fixedCropSize) return;

    // Convert crop box to canvas coordinates for handle rendering
    const canvasBox = this.imageToCanvas(this.cropBox);

    this.context.globalAlpha = 1.0;
    this.context.fillStyle = '#ffffff';
    this.context.strokeStyle = '#000000';
    this.context.lineWidth = 1;

    Object.keys(this.handles).forEach(handleName => {
      const handle = this.handles[handleName];
      const centerX = canvasBox.x + (canvasBox.width * handle.x);
      const centerY = canvasBox.y + (canvasBox.height * handle.y);
      const x = centerX - this.handleSize / 2;
      const y = centerY - this.handleSize / 2;

      // Draw handle
      this.context.fillRect(x, y, this.handleSize, this.handleSize);
      this.context.strokeRect(x, y, this.handleSize, this.handleSize);
    });
  }

  // Mouse interaction
  handleMouseDown(e) {
    if (!this.cropMode) return;

    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;

    // Convert canvas coordinates to image coordinates for storage
    const imagePoint = this.pointCanvasToImage(canvasX, canvasY);
    this.dragStartImageX = imagePoint.x;
    this.dragStartImageY = imagePoint.y;
    this.initialCropBox = { ...this.cropBox };

    if (this.fixedCropSize) {
      // For fixed crop size, only allow moving the crop box
      if (this.isPointInCropBox(canvasX, canvasY)) {

        this.isDragging = true;
        this.canvas.style.cursor = 'move';
      }
    } else {
      // Check if clicking on a resize handle
      const handle = this.getHandleAt(canvasX, canvasY);

      if (handle) {

        this.isResizing = true;
        this.dragHandle = handle;
        this.canvas.style.cursor = this.handles[handle].cursor;
      } else if (this.isPointInCropBox(canvasX, canvasY)) {
        // Clicking inside crop box - start moving

        this.isDragging = true;
        this.canvas.style.cursor = 'move';
      } else {
        // Clicking outside - start new crop box

        this.startNewCrop(imagePoint.x, imagePoint.y);
      }
    }
  }

  handleMouseMove(e) {
    if (!this.cropMode) return;

    const rect = this.canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;

    if (this.isResizing && this.dragHandle) {
      this.resizeCropBox(canvasX, canvasY);
    } else if (this.isDragging) {
      this.moveCropBox(canvasX, canvasY);
    } else if (!this.isDragging && !this.isResizing) {
      // Update cursor based on what's under mouse
      this.updateCursor(canvasX, canvasY);
    }
  }

  handleMouseUp(e) {
    if (!this.cropMode) return;

    this.isDragging = false;
    this.isResizing = false;
    this.dragHandle = null;
    this.initialCropBox = null;
    this.newCropStart = null; // Clear new crop state

    const rect = this.canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;

    this.updateCursor(canvasX, canvasY);
  }

  // Touch events
  handleTouchStart(e) {
    if (!this.cropMode || e.touches.length !== 1) return;

    e.preventDefault();
    const touch = e.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    const _x = touch.clientX - rect.left;
    const _y = touch.clientY - rect.top;

    // Convert touch to mouse event
    this.handleMouseDown({ clientX: touch.clientX, clientY: touch.clientY, preventDefault: () => {} });
  }

  handleTouchMove(_e) {
    if (!this.cropMode || _e.touches.length !== 1) return;

    _e.preventDefault();
    const touch = _e.touches[0];

    // Convert touch to mouse event
    this.handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
  }

  handleTouchEnd(_e) {
    if (!this.cropMode) return;

    this.handleMouseUp({});
  }

  // Crop utility methods
  getHandleAt(canvasX, canvasY) {
    const hitAreaPadding = 4; // Extra pixels around handle for easier clicking
    const canvasBox = this.imageToCanvas(this.cropBox);

    for (const [handleName, handle] of Object.entries(this.handles)) {
      // Calculate center position the same way as drawing
      const handleCenterX = canvasBox.x + (canvasBox.width * handle.x);
      const handleCenterY = canvasBox.y + (canvasBox.height * handle.y);

      // Create expanded hit area around the center
      const hitAreaSize = this.handleSize + hitAreaPadding;
      const handleX = handleCenterX - hitAreaSize / 2;
      const handleY = handleCenterY - hitAreaSize / 2;

      if (canvasX >= handleX && canvasX <= handleX + hitAreaSize &&
          canvasY >= handleY && canvasY <= handleY + hitAreaSize) {
        return handleName;
      }
    }
    return null;
  }

  isPointInCropBox(canvasX, canvasY) {
    // Convert canvas coordinates to image coordinates and check if point is in crop box
    const imagePoint = this.pointCanvasToImage(canvasX, canvasY);
    return imagePoint.x >= this.cropBox.x && imagePoint.x <= this.cropBox.x + this.cropBox.width &&
           imagePoint.y >= this.cropBox.y && imagePoint.y <= this.cropBox.y + this.cropBox.height;
  }

  updateCursor(canvasX, canvasY) {
    if (!this.cropMode) return;

    // Image is at (0,0) so canvas coordinates = image coordinates
    const imageX = canvasX;
    const imageY = canvasY;

    if (this.fixedCropSize) {
      // For fixed size crops, only show move cursor when over crop box
      if (this.isPointInCropBox(imageX, imageY)) {
        this.canvas.style.cursor = 'move';
      } else {
        this.canvas.style.cursor = 'default';
      }
    } else {
      const handle = this.getHandleAt(canvasX, canvasY);
      if (handle) {
        this.canvas.style.cursor = this.handles[handle].cursor;
      } else if (this.isPointInCropBox(imageX, imageY)) {
        this.canvas.style.cursor = 'move';
      } else {
        this.canvas.style.cursor = 'crosshair';
      }
    }
  }

  startNewCrop(x, y) {
    // Store the initial click point for proper rectangle creation
    this.newCropStart = { x: x, y: y };
    this.cropBox = {
      x: x,
      y: y,
      width: 0,
      height: 0
    };
    this.isResizing = true;
    this.dragHandle = 'se'; // Start with bottom-right handle
  }

  resizeCropBox(canvasX, canvasY) {
    if (!this.dragHandle) return;

    // Convert canvas coordinates to image coordinates
    const imagePoint = this.pointCanvasToImage(canvasX, canvasY);

    // Handle new crop creation differently
    if (this.newCropStart) {
      // Creating new crop box - calculate from start point to current mouse position
      const startX = this.newCropStart.x;
      const startY = this.newCropStart.y;

      this.cropBox = {
        x: Math.min(startX, imagePoint.x),
        y: Math.min(startY, imagePoint.y),
        width: Math.abs(imagePoint.x - startX),
        height: Math.abs(imagePoint.y - startY)
      };

      // Apply aspect ratio constraint if set
      if (this.aspectRatio) {
        this.constrainToAspectRatio(this.cropBox, 'se');
      }

      // Ensure minimum size
      if (this.cropBox.width < this.minCropSize) {
        this.cropBox.width = this.minCropSize;
      }
      if (this.cropBox.height < this.minCropSize) {
        this.cropBox.height = this.minCropSize;
      }

      this.constrainCropBox(this.cropBox);
      return;
    }

    // Normal handle resizing
    if (!this.initialCropBox) return;

    // Calculate deltas in image coordinates
    const deltaX = imagePoint.x - this.dragStartImageX;
    const deltaY = imagePoint.y - this.dragStartImageY;

    let newBox = { ...this.initialCropBox };

    // Apply resize based on handle
    switch (this.dragHandle) {
      case 'nw':
        newBox.x += deltaX;
        newBox.y += deltaY;
        newBox.width -= deltaX;
        newBox.height -= deltaY;
        break;
      case 'ne':
        newBox.y += deltaY;
        newBox.width += deltaX;
        newBox.height -= deltaY;
        break;
      case 'sw':
        newBox.x += deltaX;
        newBox.width -= deltaX;
        newBox.height += deltaY;
        break;
      case 'se':
        newBox.width += deltaX;
        newBox.height += deltaY;
        break;
      case 'n':
        newBox.y += deltaY;
        newBox.height -= deltaY;
        break;
      case 's':
        newBox.height += deltaY;
        break;
      case 'w':
        newBox.x += deltaX;
        newBox.width -= deltaX;
        break;
      case 'e':
        newBox.width += deltaX;
        break;
    }

    // Apply aspect ratio constraint if set
    if (this.aspectRatio) {
      this.constrainToAspectRatio(newBox, this.dragHandle);
    }

    this.constrainCropBox(newBox);

    this.cropBox = newBox;
    this.renderCanvas();
  }

  moveCropBox(canvasX, canvasY) {
    if (!this.initialCropBox) return;

    // Convert to image coordinates and calculate deltas
    const imagePoint = this.pointCanvasToImage(canvasX, canvasY);
    const deltaX = imagePoint.x - this.dragStartImageX;
    const deltaY = imagePoint.y - this.dragStartImageY;

    let newBox = {
      x: this.initialCropBox.x + deltaX,
      y: this.initialCropBox.y + deltaY,
      width: this.initialCropBox.width,
      height: this.initialCropBox.height
    };

    // Keep within image bounds
    if (this.image) {
      newBox.x = Math.max(0, Math.min(this.image.naturalWidth - newBox.width, newBox.x));
      newBox.y = Math.max(0, Math.min(this.image.naturalHeight - newBox.height, newBox.y));
    }

    this.cropBox = newBox;
    this.renderCanvas();
  }

  constrainToAspectRatio(box, handle) {
    // Use cropAndScale aspect ratio if set, otherwise use explicit aspectRatio
    let ratio = this.aspectRatio;
    if (this.cropAndScale) {
      ratio = this.cropAndScale.width / this.cropAndScale.height;
    }

    if (!ratio) return;

    // Store anchor points based on handle
    let anchorX, anchorY;

    if (['nw', 'ne', 'sw', 'se'].includes(handle)) {
      // Corner handles - determine which corner stays fixed
      switch (handle) {
        case 'nw':
          // Bottom-right corner stays fixed
          anchorX = box.x + box.width;
          anchorY = box.y + box.height;
          break;
        case 'ne':
          // Bottom-left corner stays fixed
          anchorX = box.x;
          anchorY = box.y + box.height;
          break;
        case 'sw':
          // Top-right corner stays fixed
          anchorX = box.x + box.width;
          anchorY = box.y;
          break;
        case 'se':
          // Top-left corner stays fixed
          anchorX = box.x;
          anchorY = box.y;
          break;
      }

      // Adjust dimensions to match aspect ratio
      if (box.width / box.height > ratio) {
        box.width = box.height * ratio;
      } else {
        box.height = box.width / ratio;
      }

      // Adjust position to keep anchor point fixed
      switch (handle) {
        case 'nw':
          box.x = anchorX - box.width;
          box.y = anchorY - box.height;
          break;
        case 'ne':
          box.x = anchorX;
          box.y = anchorY - box.height;
          break;
        case 'sw':
          box.x = anchorX - box.width;
          box.y = anchorY;
          break;
        case 'se':
          box.x = anchorX;
          box.y = anchorY;
          break;
      }
    } else if (['n', 's'].includes(handle)) {
      // Vertical handles - adjust width to match height, keep horizontal center
      const centerX = box.x + box.width / 2;
      box.width = box.height * ratio;
      box.x = centerX - box.width / 2;
    } else if (['w', 'e'].includes(handle)) {
      // Horizontal handles - adjust height to match width, keep vertical center
      const centerY = box.y + box.height / 2;
      box.height = box.width / ratio;
      box.y = centerY - box.height / 2;
    }
  }

  constrainCropBox(box) {
    // Ensure minimum size
    box.width = Math.max(this.minCropSize, box.width);
    box.height = Math.max(this.minCropSize, box.height);

    // Keep within image bounds
    if (this.image) {
      if (box.x < 0) {
        box.width += box.x;
        box.x = 0;
      }
      if (box.y < 0) {
        box.height += box.y;
        box.y = 0;
      }
      if (box.x + box.width > this.image.naturalWidth) {
        box.width = this.image.naturalWidth - box.x;
      }
      if (box.y + box.height > this.image.naturalHeight) {
        box.height = this.image.naturalHeight - box.y;
      }
    }

    // Ensure non-negative dimensions
    box.width = Math.max(0, box.width);
    box.height = Math.max(0, box.height);
  }

  // Public API
  startCropMode() {
    // Make this method idempotent - safe to call multiple times
    if (this.cropMode) {
      console.log('Crop mode already active, skipping initialization');
      return;
    }

    this.cropMode = true;
    this.initializeCropBox();

    console.log('Crop mode started - SE handle should be at buffer coords (100, 100)');

    this.renderCanvas();
    this.emitCropEvent('crop-started');
  }

  exitCropMode() {
    this.cropMode = false;
    this.isDragging = false;
    this.isResizing = false;
    this.dragHandle = null;
    this.canvas.style.cursor = 'default';
    this.renderCanvas();
    this.emitCropEvent('crop-exited');
  }

  initializeCropBox() {
    if (!this.canvasWidth || !this.canvasHeight || !this.image) return;

    // Create default crop box - check for fixed size first
    const imageWidth = this.image.naturalWidth;
    const imageHeight = this.image.naturalHeight;

    let cropWidth, cropHeight;

    if (this.fixedCropSize) {
      // Use fixed crop size
      cropWidth = this.fixedCropSize.width;
      cropHeight = this.fixedCropSize.height;
    } else {
      // Use 80% of image size as default
      cropWidth = Math.floor(imageWidth * 0.8);
      cropHeight = Math.floor(imageHeight * 0.8);

      // Apply aspect ratio constraint if set
      let aspectRatio = this.aspectRatio;

      // If cropAndScale is set, calculate aspect ratio from target dimensions
      if (this.cropAndScale) {
        aspectRatio = this.cropAndScale.width / this.cropAndScale.height;
      }
      this.aspectRatio = aspectRatio;

      if (aspectRatio) {
        if (cropWidth / cropHeight > aspectRatio) {
          cropWidth = cropHeight * aspectRatio;
        } else {
          cropHeight = cropWidth / aspectRatio;
        }
      }

      // Ensure minimum size
      cropWidth = Math.max(this.minCropSize || 50, cropWidth);
      cropHeight = Math.max(this.minCropSize || 50, cropHeight);
    }

    // Center the crop box in the image
    const x = Math.floor((imageWidth - cropWidth) / 2);
    const y = Math.floor((imageHeight - cropHeight) / 2);

    this.cropBox = {
      x: x,  // relative to image, not canvas
      y: y,  // relative to image, not canvas
      width: cropWidth,
      height: cropHeight
    };


  }

  setAspectRatio(ratio) {
    this.aspectRatio = ratio;
    if (this.cropMode) {
      this.initializeCropBox();
      this.renderCanvas();
    }
    this.emitCropEvent('aspect-ratio-changed', { aspectRatio: ratio });
  }

  getCropData() {
    if (!this.cropBox || !this.image) return null;

    // Since cropBox is now stored in image coordinates, no conversion needed
    return {
      x: Math.max(0, Math.min(this.cropBox.x, this.image.naturalWidth)),
      y: Math.max(0, Math.min(this.cropBox.y, this.image.naturalHeight)),
      width: Math.min(this.cropBox.width, this.image.naturalWidth - this.cropBox.x),
      height: Math.min(this.cropBox.height, this.image.naturalHeight - this.cropBox.y),
      originalWidth: this.image.naturalWidth,
      originalHeight: this.image.naturalHeight
    };
  }

  async applyCrop() {
    const cropData = this.getCropData();
    if (!cropData || !this.image) {
      return null;
    }

    // Create new canvas for cropped image
    const croppedCanvas = document.createElement('canvas');
    const croppedContext = croppedCanvas.getContext('2d');

    // Set canvas size based on cropAndScale or crop dimensions
    if (this.cropAndScale) {
      // Use cropAndScale target dimensions
      croppedCanvas.width = this.cropAndScale.width;
      croppedCanvas.height = this.cropAndScale.height;

      // Draw cropped portion scaled to fit target dimensions
      croppedContext.drawImage(
        this.image,
        cropData.x,
        cropData.y,
        cropData.width,
        cropData.height,
        0,
        0,
        this.cropAndScale.width,
        this.cropAndScale.height
      );
    } else {
      // Use actual crop dimensions (no scaling)
      croppedCanvas.width = cropData.width;
      croppedCanvas.height = cropData.height;

      // Draw cropped portion at original size
      croppedContext.drawImage(
        this.image,
        cropData.x,
        cropData.y,
        cropData.width,
        cropData.height,
        0,
        0,
        cropData.width,
        cropData.height
      );
    }

    const croppedImageData = croppedCanvas.toDataURL('image/png');

    return {
      canvas: croppedCanvas,
      imageData: croppedImageData,
      cropData: cropData
    };
  }

  // Event emission
  emitCropEvent(type, data = {}) {
    const eventBus = this.getApp()?.events;
    if (eventBus) {
      eventBus.emit(`imagecrop:${type}`, {
        view: this,
        cropBox: this.cropBox,
        aspectRatio: this.aspectRatio,
        ...data
      });
    }
  }

  // Toolbar control methods
  showToolbarElement() {
    if (!this.showToolbar) {
      this.showToolbar = true;
      const toolbar = this.element.querySelector('.image-crop-toolbar');
      if (toolbar) {
        toolbar.style.display = 'block';
      }
      this.updateAutoFitButtonState();
    }
  }

  hideToolbarElement() {
    if (this.showToolbar) {
      this.showToolbar = false;
      const toolbar = this.element.querySelector('.image-crop-toolbar');
      if (toolbar) {
        toolbar.style.display = 'none';
      }
    }
  }

  toggleToolbarElement() {
    if (this.showToolbar) {
      this.hideToolbarElement();
    } else {
      this.showToolbarElement();
    }
  }

  // Cleanup
  // Action handlers for toolbar buttons
  async onPassThruActionSetAspectRatio(e, el) {
    const ratio = el.getAttribute('data-ratio');
    const aspectRatio = ratio === 'free' ? null : parseFloat(ratio);
    this.setAspectRatio(aspectRatio);
  }

  async handleActionApplyCrop() {
    if (this.cropMode) {
      const result = await this.applyCrop();
      if (result && result.imageData) {
        // Load the cropped image as the new image
        this.loadImage(result.imageData);

        // Exit crop mode since we've applied the crop
        this.exitCropMode();

        // Emit the crop applied event
        this.emitCropEvent('crop-applied', { result });
      }
    }
  }

  async handleActionToggleAutoFit() {
    // Skip if toolbar is hidden
    if (!this.showToolbar) return;

    this.autoFit = !this.autoFit;

    // Update button state
    this.updateAutoFitButtonState();

    // Re-render with new scaling
    this.updateImageOffset();
    this.renderCanvas();

    this.emitCropEvent('auto-fit-changed', { autoFit: this.autoFit });
  }

  async handleActionResetCrop() {
    // Exit crop mode first
    if (this.cropMode) {
      this.exitCropMode();
    }

    // Reload the original image
    if (this.originalImageUrl) {
      await this.loadImage(this.originalImageUrl);
    }

    // Enter crop mode and initialize crop box
    this.startCropMode();
    this.emitCropEvent('crop-reset');
  }

  async onBeforeDestroy() {
    await super.onBeforeDestroy();

    // Clean up crop state
    this.cropMode = false;
    this.isDragging = false;
    this.isResizing = false;

    // Remove document listeners
    document.removeEventListener('mousemove', this._handleMouseMove);
    document.removeEventListener('mouseup', this._handleMouseUp);

    this.emitCropEvent('destroyed');
  }

  // Static method to show crop view in a dialog for standalone testing
  static async showDialog(imageUrl, options = {}) {
    const {
      title = 'Crop Image',
      alt = 'Image',
      size = 'xl',
      aspectRatio = null,
      minCropSize = 50,
      showGrid = true,
      showToolbar = false,
      autoFit = true,
      fixedCropSize = null,
      cropAndScale = null,
      canvasSize = size || 'auto',
      ...dialogOptions
    } = options;

    const cropView = new ImageCropView({
      imageUrl,
      alt,
      title,
      aspectRatio,
      minCropSize,
      canvasSize: canvasSize || size || 'md',
      fixedCropSize,
      cropAndScale,
      showGrid,
      showToolbar,
      autoFit
    });

    const dialog = new Dialog({
      title,
      body: cropView,
      size,
      centered: true,
      backdrop: 'static',
      keyboard: true,
      noBodyPadding: true,
      buttons: [
        {
          text: 'Cancel',
          action: 'cancel',
          class: 'btn btn-secondary',
          dismiss: true
        },
        {
          text: 'Apply Crop',
          action: 'apply-crop',
          class: 'btn btn-primary'
        }
      ],
      ...dialogOptions
    });

    // Render and mount
    await dialog.render(true, document.body);

    // Show the dialog
    dialog.show();

    // Wait for dialog to be fully rendered and canvas to be properly sized
    const initializeCrop = () => {
      // Re-setup canvas after dialog is rendered
      if (cropView.setupCanvas) {
        cropView.setupCanvas();
      }

      // Wait for image to load, then start crop mode
      if (cropView.isLoaded && cropView.canvasWidth > 0) {
        cropView.startCropMode();
      } else {
        const checkReady = setInterval(() => {
          if (cropView.isLoaded && cropView.canvasWidth > 0) {
            clearInterval(checkReady);
            cropView.startCropMode();
          }
        }, 100);

        // Clear interval after 5 seconds to prevent infinite loop
        setTimeout(() => clearInterval(checkReady), 5000);
      }
    };

    // Use the dialog's 'shown' event to ensure it's fully rendered
    dialog.on('shown', initializeCrop);

    return new Promise((resolve) => {
      dialog.on('hidden', () => {
        dialog.destroy();
        resolve({ action: 'cancel', view: cropView });
      });

      dialog.on('action:cancel', () => {
        dialog.hide();
      });

      dialog.on('action:apply-crop', async () => {
        let result;

        if (cropView.cropMode && cropView.cropBox) {
          // Crop mode is active - apply the crop
          result = await cropView.applyCrop();
        } else {
          // No active crop box - return current canvas image as-is
          const currentImageData = cropView.canvas.toDataURL('image/png');
          result = {
            canvas: cropView.canvas,
            imageData: currentImageData,
            cropData: null // No crop was applied
          };
        }

        dialog.hide();
        resolve({
          action: 'crop',
          view: cropView,
          data: result?.imageData,
          cropData: result?.cropData
        });
      });
    });
  }
}

// Make it available globally for testing
window.ImageCropView = ImageCropView;
