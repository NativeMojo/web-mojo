/**
 * ImageFiltersView - Canvas-based image viewer with filter effects
 * Extends ImageCanvasView with brightness, contrast, saturation and other filters
 */

import ImageCanvasView from './ImageCanvasView.js';
import Dialog from '../components/Dialog.js';

export default class ImageFiltersView extends ImageCanvasView {
  constructor(options = {}) {
    super({
      ...options,
      className: `image-filters-view ${options.className || ''}`,
    });

    // Filter state
    this.filters = {
      brightness: 100,
      contrast: 100,
      saturation: 100,
      hue: 0,
      blur: 0,
      grayscale: 0,
      sepia: 0
    };

    // UI Options (default to true for better usability)
    this.showControls = options.showControls ?? true;
    this.allowReset = options.allowReset ?? true;
    this.showPresets = options.showPresets ?? true;
    this.showBasicControls = options.showBasicControls ?? true;
    this.showAdvancedControls = options.showAdvancedControls ?? true;
    this.controlsInDropdowns = options.controlsInDropdowns ?? true;

    // Preset effects using CSS filters only
    this.presetEffects = {
      none: { name: 'Original', filters: {} },
      blackWhite: { name: 'Black & White', filters: { grayscale: 100 } },
      sepia: { name: 'Sepia', filters: { sepia: 100 } },
      vintage: { name: 'Vintage', filters: { sepia: 60, contrast: 110, brightness: 110, saturation: 80 } },
      cool: { name: 'Cool Tones', filters: { hue: 200, saturation: 120, brightness: 95 } },
      warm: { name: 'Warm Tones', filters: { hue: 25, saturation: 110, brightness: 105 } },
      vibrant: { name: 'Vibrant', filters: { brightness: 105, contrast: 115, saturation: 140, hue: 5 } },
      dramatic: { name: 'Dramatic', filters: { brightness: 90, contrast: 150, saturation: 120 } },
      soft: { name: 'Soft', filters: { brightness: 110, contrast: 85, blur: 1 } }
    };

    this.currentPreset = 'none';
  }

  async getTemplate() {
    return `
      <div class="image-filters-container d-flex flex-column h-100">
        {{#showControls}}
        <!-- Filter Toolbar -->
        <div class="image-filters-toolbar bg-light border-bottom p-2">
          <div class="btn-toolbar justify-content-center flex-wrap" role="toolbar">

            {{#showPresets}}
            <!-- Preset Effects -->
            <div class="btn-group me-2 mb-2" role="group" aria-label="Preset effects">
              <div class="dropdown">
                <button type="button" class="btn btn-outline-primary btn-sm dropdown-toggle"
                        data-bs-toggle="dropdown" aria-expanded="false" title="Preset Effects">
                  <i class="bi bi-palette"></i> Effects
                </button>
                <ul class="dropdown-menu">
                  <li><a class="dropdown-item" href="#" data-action="apply-preset" data-preset="none">Original</a></li>
                  <li><hr class="dropdown-divider"></li>
                  <li><a class="dropdown-item" href="#" data-action="apply-preset" data-preset="blackWhite">Black & White</a></li>
                  <li><a class="dropdown-item" href="#" data-action="apply-preset" data-preset="sepia">Sepia</a></li>
                  <li><a class="dropdown-item" href="#" data-action="apply-preset" data-preset="vintage">Vintage</a></li>
                  <li><hr class="dropdown-divider"></li>
                  <li><a class="dropdown-item" href="#" data-action="apply-preset" data-preset="cool">Cool Tones</a></li>
                  <li><a class="dropdown-item" href="#" data-action="apply-preset" data-preset="warm">Warm Tones</a></li>
                  <li><a class="dropdown-item" href="#" data-action="apply-preset" data-preset="vibrant">Vibrant</a></li>
                  <li><a class="dropdown-item" href="#" data-action="apply-preset" data-preset="dramatic">Dramatic</a></li>
                  <li><a class="dropdown-item" href="#" data-action="apply-preset" data-preset="soft">Soft</a></li>
                </ul>
              </div>
            </div>
            {{/showPresets}}

            {{#showBasicControls}}
            {{#controlsInDropdowns}}
            <!-- Basic Controls in Dropdown -->
            <div class="btn-group me-2 mb-2" role="group" aria-label="Basic controls">
              <div class="dropdown">
                <button type="button" class="btn btn-outline-secondary btn-sm dropdown-toggle"
                        data-bs-toggle="dropdown" aria-expanded="false" title="Basic Adjustments">
                  <i class="bi bi-sliders"></i> Basic
                </button>
                <div class="dropdown-menu p-3" style="min-width: 300px;">
                  <div class="mb-3">
                    <label class="form-label small fw-bold">Brightness</label>
                    <input type="range" class="form-range"
                           min="0" max="200" value="{{filters.brightness}}"
                           data-change-action="filter-change" data-filter="brightness">
                    <div class="d-flex justify-content-between">
                      <small class="text-muted">0%</small>
                      <small class="text-muted filter-value" data-filter="brightness">{{filters.brightness}}%</small>
                      <small class="text-muted">200%</small>
                    </div>
                  </div>
                  <div class="mb-3">
                    <label class="form-label small fw-bold">Contrast</label>
                    <input type="range" class="form-range"
                           min="0" max="200" value="{{filters.contrast}}"
                           data-change-action="filter-change" data-filter="contrast">
                    <div class="d-flex justify-content-between">
                      <small class="text-muted">0%</small>
                      <small class="text-muted filter-value" data-filter="contrast">{{filters.contrast}}%</small>
                      <small class="text-muted">200%</small>
                    </div>
                  </div>
                  <div class="mb-0">
                    <label class="form-label small fw-bold">Saturation</label>
                    <input type="range" class="form-range"
                           min="0" max="200" value="{{filters.saturation}}"
                           data-change-action="filter-change" data-filter="saturation">
                    <div class="d-flex justify-content-between">
                      <small class="text-muted">0%</small>
                      <small class="text-muted filter-value" data-filter="saturation">{{filters.saturation}}%</small>
                      <small class="text-muted">200%</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {{/controlsInDropdowns}}
            {{/showBasicControls}}

            {{#showAdvancedControls}}
            {{#controlsInDropdowns}}
            <!-- Advanced Controls in Dropdown -->
            <div class="btn-group me-2 mb-2" role="group" aria-label="Advanced controls">
              <div class="dropdown">
                <button type="button" class="btn btn-outline-warning btn-sm dropdown-toggle"
                        data-bs-toggle="dropdown" aria-expanded="false" title="Advanced Adjustments">
                  <i class="bi bi-gear"></i> Advanced
                </button>
                <div class="dropdown-menu p-3" style="min-width: 300px;">
                  <div class="mb-3">
                    <label class="form-label small fw-bold">Hue</label>
                    <input type="range" class="form-range"
                           min="0" max="360" value="{{filters.hue}}"
                           data-change-action="filter-change" data-filter="hue">
                    <div class="d-flex justify-content-between">
                      <small class="text-muted">0°</small>
                      <small class="text-muted filter-value" data-filter="hue">{{filters.hue}}°</small>
                      <small class="text-muted">360°</small>
                    </div>
                  </div>
                  <div class="mb-3">
                    <label class="form-label small fw-bold">Blur</label>
                    <input type="range" class="form-range"
                           min="0" max="10" value="{{filters.blur}}"
                           data-change-action="filter-change" data-filter="blur">
                    <div class="d-flex justify-content-between">
                      <small class="text-muted">0px</small>
                      <small class="text-muted filter-value" data-filter="blur">{{filters.blur}}px</small>
                      <small class="text-muted">10px</small>
                    </div>
                  </div>
                  <div class="mb-3">
                    <label class="form-label small fw-bold">Grayscale</label>
                    <input type="range" class="form-range"
                           min="0" max="100" value="{{filters.grayscale}}"
                           data-change-action="filter-change" data-filter="grayscale">
                    <div class="d-flex justify-content-between">
                      <small class="text-muted">0%</small>
                      <small class="text-muted filter-value" data-filter="grayscale">{{filters.grayscale}}%</small>
                      <small class="text-muted">100%</small>
                    </div>
                  </div>
                  <div class="mb-0">
                    <label class="form-label small fw-bold">Sepia</label>
                    <input type="range" class="form-range"
                           min="0" max="100" value="{{filters.sepia}}"
                           data-change-action="filter-change" data-filter="sepia">
                    <div class="d-flex justify-content-between">
                      <small class="text-muted">0%</small>
                      <small class="text-muted filter-value" data-filter="sepia">{{filters.sepia}}%</small>
                      <small class="text-muted">100%</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {{/controlsInDropdowns}}
            {{/showAdvancedControls}}

            {{#allowReset}}
            <!-- Reset & Preview Controls -->
            <div class="btn-group me-2 mb-2" role="group" aria-label="Reset controls">
              <button type="button" class="btn btn-outline-secondary btn-sm" data-action="reset-filters" title="Reset All Filters">
                <i class="bi bi-arrow-repeat"></i> Reset
              </button>
              <button type="button" class="btn btn-outline-info btn-sm" data-action="preview-original" title="Preview Original"
                      onmousedown="this.dataset.previewing='true'"
                      onmouseup="this.dataset.previewing='false'"
                      onmouseleave="this.dataset.previewing='false'">
                <i class="bi bi-eye"></i> Original
              </button>
            </div>
            {{/allowReset}}

          </div>
        </div>
        {{/showControls}}

        <!-- Canvas Area -->
        <div class="image-canvas-content flex-grow-1 position-relative d-flex justify-content-center align-items-center">
          <canvas class="image-filters-canvas w-100 h-100" data-container="canvas"></canvas>

          <!-- Loading Overlay -->
          <div class="image-canvas-loading position-absolute top-50 start-50 translate-middle"
               style="display: none; z-index: 10;">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>

        {{#showControls}}
        {{^controlsInDropdowns}}
        <!-- Expanded Controls Panel (when not in dropdowns) -->
        <div class="image-filters-controls bg-light border-top p-3" data-container="controls" style="max-height: 300px; overflow-y: auto;">
          <div class="row g-3">
            {{#showBasicControls}}
            <div class="col-md-6 col-lg-4">
              <label class="form-label small fw-bold">Brightness</label>
              <input type="range" class="form-range"
                     min="0" max="200" value="{{filters.brightness}}"
                     data-change-action="filter-change" data-filter="brightness">
              <div class="d-flex justify-content-between">
                <small class="text-muted">0%</small>
                <small class="text-muted filter-value" data-filter="brightness">{{filters.brightness}}%</small>
                <small class="text-muted">200%</small>
              </div>
            </div>
            <div class="col-md-6 col-lg-4">
              <label class="form-label small fw-bold">Contrast</label>
              <input type="range" class="form-range"
                     min="0" max="200" value="{{filters.contrast}}"
                     data-change-action="filter-change" data-filter="contrast">
              <div class="d-flex justify-content-between">
                <small class="text-muted">0%</small>
                <small class="text-muted filter-value" data-filter="contrast">{{filters.contrast}}%</small>
                <small class="text-muted">200%</small>
              </div>
            </div>
            <div class="col-md-6 col-lg-4">
              <label class="form-label small fw-bold">Saturation</label>
              <input type="range" class="form-range"
                     min="0" max="200" value="{{filters.saturation}}"
                     data-change-action="filter-change" data-filter="saturation">
              <div class="d-flex justify-content-between">
                <small class="text-muted">0%</small>
                <small class="text-muted filter-value" data-filter="saturation">{{filters.saturation}}%</small>
                <small class="text-muted">200%</small>
              </div>
            </div>
            {{/showBasicControls}}

            {{#showAdvancedControls}}
            <div class="col-md-6 col-lg-4">
              <label class="form-label small fw-bold">Hue</label>
              <input type="range" class="form-range"
                     min="0" max="360" value="{{filters.hue}}"
                     data-change-action="filter-change" data-filter="hue">
              <div class="d-flex justify-content-between">
                <small class="text-muted">0°</small>
                <small class="text-muted filter-value" data-filter="hue">{{filters.hue}}°</small>
                <small class="text-muted">360°</small>
              </div>
            </div>
            <div class="col-md-6 col-lg-4">
              <label class="form-label small fw-bold">Blur</label>
              <input type="range" class="form-range"
                     min="0" max="10" value="{{filters.blur}}"
                     data-change-action="filter-change" data-filter="blur">
              <div class="d-flex justify-content-between">
                <small class="text-muted">0px</small>
                <small class="text-muted filter-value" data-filter="blur">{{filters.blur}}px</small>
                <small class="text-muted">10px</small>
              </div>
            </div>
            <div class="col-md-6 col-lg-4">
              <label class="form-label small fw-bold">Grayscale</label>
              <input type="range" class="form-range"
                     min="0" max="100" value="{{filters.grayscale}}"
                     data-change-action="filter-change" data-filter="grayscale">
              <div class="d-flex justify-content-between">
                <small class="text-muted">0%</small>
                <small class="text-muted filter-value" data-filter="grayscale">{{filters.grayscale}}%</small>
                <small class="text-muted">100%</small>
              </div>
            </div>
            <div class="col-md-6 col-lg-4">
              <label class="form-label small fw-bold">Sepia</label>
              <input type="range" class="form-range"
                     min="0" max="100" value="{{filters.sepia}}"
                     data-change-action="filter-change" data-filter="sepia">
              <div class="d-flex justify-content-between">
                <small class="text-muted">0%</small>
                <small class="text-muted filter-value" data-filter="sepia">{{filters.sepia}}%</small>
                <small class="text-muted">100%</small>
              </div>
            </div>
            {{/showAdvancedControls}}
          </div>
        </div>
        {{/controlsInDropdowns}}
        {{/showControls}}
      </div>
    `;
  }





  async onAfterRender() {
    await super.onAfterRender();

    // Cache control elements
    this.controlsElement = this.element.querySelector('.image-filters-controls');
  }

  // Override canvas sizing for container-aware dimensions
  setupCanvas() {
    if (!this.canvas || !this.containerElement) return;

    // Use container-aware sizing for dialogs and embedded contexts
    this.setCanvasSize(this.canvasSize);

    // Simple resize listener (only for fullscreen mode or container changes)
    if (this.canvasSize === 'fullscreen' || this.canvasSize === 'auto') {
      this._resizeHandler = () => this.setCanvasSize(this.canvasSize);
      window.addEventListener('resize', this._resizeHandler);
    }

    // Set up canvas context
    this.context.imageSmoothingEnabled = true;
    this.context.imageSmoothingQuality = 'high';
  }

  // Override setCanvasSize to be more container-aware for dialogs
  setCanvasSize(size) {
    if (!this.canvas || !this.containerElement) return;

    // For 'auto' sizing, be more aware of the actual container
    if (size === 'auto') {
      const container = this.containerElement;
      let availableWidth = container.clientWidth - 40;
      let availableHeight = container.clientHeight - 40;

      // If container doesn't have explicit dimensions, walk up DOM
      if (availableWidth <= 40 || availableHeight <= 40) {
        let parent = container.parentElement;
        while (parent && (parent.clientWidth <= 40 || parent.clientHeight <= 40)) {
          parent = parent.parentElement;

          // Stop at common container types
          if (parent && (
            parent.classList.contains('modal-body') ||
            parent.classList.contains('card-body') ||
            parent.classList.contains('dialog-body') ||
            parent.tagName === 'MAIN' ||
            parent.tagName === 'BODY'
          )) {
            break;
          }
        }

        if (parent) {
          availableWidth = parent.clientWidth - 80;
          availableHeight = parent.clientHeight - 80;
        }
      }

      // If we have valid container dimensions, use them
      if (availableWidth > 100 && availableHeight > 100) {
        let canvasWidth, canvasHeight;

        if (this.image) {
          const imageAspect = this.image.naturalWidth / this.image.naturalHeight;
          const availableAspect = availableWidth / availableHeight;

          if (imageAspect > availableAspect) {
            canvasWidth = availableWidth;
            canvasHeight = availableWidth / imageAspect;
          } else {
            canvasHeight = availableHeight;
            canvasWidth = availableHeight * imageAspect;
          }

          // Ensure minimum size
          canvasWidth = Math.max(300, Math.floor(canvasWidth));
          canvasHeight = Math.max(200, Math.floor(canvasHeight));
        } else {
          // No image yet - use available space with reasonable limits
          canvasWidth = Math.min(600, Math.max(300, availableWidth));
          canvasHeight = Math.min(450, Math.max(200, availableHeight));
        }

        // Apply the calculated size
        this.applyCanvasSize(canvasWidth, canvasHeight);
        return;
      }
    }

    // Fallback to parent class sizing for all other cases
    super.setCanvasSize(size);
  }

  // Helper method to apply calculated canvas size
  applyCanvasSize(canvasWidth, canvasHeight) {
    // Don't resize if dimensions haven't changed significantly
    if (Math.abs(canvasWidth - this.canvasWidth) < 10 &&
        Math.abs(canvasHeight - this.canvasHeight) < 10) {
      return;
    }

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

  // Override image loading to re-render with current filters
  async loadImage(imageUrl) {
    await super.loadImage(imageUrl);

    // Re-render with current filters
    this.renderCanvas();
  }

  // Override renderImage to apply filters consistently
  renderImage() {
    if (!this.image) return;

    // Apply CSS filters to context (includes both slider values and preset effects)
    this.context.filter = this.getFilterString();

    // Calculate scale to fit image in canvas (consistent with new sizing system)
    const imageScale = Math.min(
      this.canvasWidth / this.image.naturalWidth,
      this.canvasHeight / this.image.naturalHeight
    );

    const scaledWidth = this.image.naturalWidth * imageScale;
    const scaledHeight = this.image.naturalHeight * imageScale;
    const x = (this.canvasWidth - scaledWidth) / 2;
    const y = (this.canvasHeight - scaledHeight) / 2;

    // Draw scaled and centered image
    this.context.drawImage(this.image, x, y, scaledWidth, scaledHeight);

    // Reset filter
    this.context.filter = 'none';
  }

  // Get combined filter values from both sliders and current preset
  getCombinedFilters() {
    const combined = { ...this.filters };

    // Apply preset filters on top of slider values
    if (this.currentPreset !== 'none' && this.presetEffects[this.currentPreset]) {
      const presetFilters = this.presetEffects[this.currentPreset].filters;
      if (presetFilters) {
        Object.assign(combined, presetFilters);
      }
    }

    return combined;
  }

  getFilterString() {
    const filters = this.getCombinedFilters();

    if (!this.hasFilters() && this.currentPreset === 'none') return 'none';

    return [
      `brightness(${filters.brightness}%)`,
      `contrast(${filters.contrast}%)`,
      `saturate(${filters.saturation}%)`,
      `hue-rotate(${filters.hue}deg)`,
      `blur(${filters.blur}px)`,
      `grayscale(${filters.grayscale}%)`,
      `sepia(${filters.sepia}%)`
    ].join(' ');
  }

  hasFilters() {
    return this.filters.brightness !== 100 ||
           this.filters.contrast !== 100 ||
           this.filters.saturation !== 100 ||
           this.filters.hue !== 0 ||
           this.filters.blur !== 0 ||
           this.filters.grayscale !== 0 ||
           this.filters.sepia !== 0;
  }

  // Action Handlers
  async onPassThruActionResetFilters() {
    this.resetFilters();
  }

  async onPassThruActionApplyPreset(e, el) {
      e.preventDefault();
    const presetName = el.getAttribute('data-preset');
    if (presetName && this.presetEffects[presetName]) {
      this.applyPreset(presetName);
    }
  }

  async onPassThruActionPreviewOriginal(e, el) {
    const isPreviewing = el.dataset.previewing === 'true';

    if (isPreviewing) {
      // Show original (no filters)
      this.context.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
      this.context.filter = 'none';
      const x = (this.canvasWidth - this.image.naturalWidth) / 2;
      const y = (this.canvasHeight - this.image.naturalHeight) / 2;
      this.context.drawImage(this.image, x, y);
    } else {
      // Show with filters
      this.renderCanvas();
    }
  }

  // Change Handler for filter sliders
  async onChangeFilterChange(e, el) {
    const filterName = el.getAttribute('data-filter');
    const value = parseFloat(el.value);

    this.updateFilter(filterName, value);
  }

  // Filter methods
  updateFilter(name, value) {
    if (!(name in this.filters)) return;

    const oldValue = this.filters[name];
    this.filters[name] = value;

    // Update the display value
    this.updateFilterDisplay(name, value);

    // Re-render with new filters
    this.renderCanvas();

    // Emit filter change event
    this.emitFilterEvent('filter-changed', {
      filter: name,
      oldValue,
      newValue: value,
      allFilters: { ...this.filters }
    });
  }

  updateFilterDisplay(name, value) {
    const valueElement = this.element.querySelector(`[data-filter="${name}"].filter-value`);
    if (valueElement) {
      const unit = name === 'hue' ? '°' : name === 'blur' ? 'px' : '%';
      valueElement.textContent = `${value}${unit}`;
    }
  }

  resetFilters() {
    const oldFilters = { ...this.filters };
    const oldPreset = this.currentPreset;

    this.filters = {
      brightness: 100,
      contrast: 100,
      saturation: 100,
      hue: 0,
      blur: 0,
      grayscale: 0,
      sepia: 0
    };

    // Reset preset
    this.currentPreset = 'none';

    // Update all input values and displays
    this.updateAllFilterInputs();

    // Re-render
    this.renderCanvas();

    // Emit reset event
    this.emitFilterEvent('filters-reset', {
      oldFilters,
      newFilters: { ...this.filters },
      oldPreset,
      newPreset: this.currentPreset
    });
  }

  updateAllFilterInputs() {
    Object.keys(this.filters).forEach(filterName => {
      const input = this.element.querySelector(`[data-filter="${filterName}"][type="range"]`);
      if (input) {
        input.value = this.filters[filterName];
        this.updateFilterDisplay(filterName, this.filters[filterName]);
      }
    });
  }

  // Enhanced preset system
  applyPreset(presetName) {
    if (!this.presetEffects[presetName]) return;

    const preset = this.presetEffects[presetName];

    // Set current preset
    this.currentPreset = presetName;

    // Set current preset (CSS filters will handle the effect)
    this.currentPreset = presetName;

    // Re-render
    this.renderCanvas();

    this.emitFilterEvent('preset-applied', { preset: presetName, filters: { ...this.filters } });
  }



  // State management
  getFilterState() {
    return { ...this.filters };
  }

  setFilterState(filters) {
    this.filters = { ...this.filters, ...filters };
    this.updateAllFilterInputs();
    this.renderCanvas();
    this.emitFilterEvent('filters-set', { filters: { ...this.filters } });
  }

  // Export with filters applied
  exportFilteredImageData() {
    if (!this.canvas) return null;

    // The canvas already has filters applied from renderImage
    return this.exportImageData();
  }

  async exportFilteredImageBlob(quality = 0.9) {
    if (!this.canvas) return null;

    // The canvas already has filters applied from renderImage
    return this.exportImageBlob(quality);
  }

  // Create a new canvas with original image + filters applied
  createFilteredCanvas() {
    if (!this.image) return null;

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    canvas.width = this.image.naturalWidth;
    canvas.height = this.image.naturalHeight;

    // Apply filters and draw original image
    context.filter = this.getFilterString();
    context.drawImage(this.image, 0, 0);
    context.filter = 'none';

    return canvas;
  }

  // Event emission
  emitFilterEvent(type, data = {}) {
    const eventBus = this.getApp()?.events;
    if (eventBus) {
      eventBus.emit(`imagefilters:${type}`, {
        view: this,
        hasFilters: this.hasFilters(),
        filterString: this.getFilterString(),
        ...data
      });
    }
  }

  // Override handleImageLoad to emit filter-ready event
  handleImageLoad() {
    super.handleImageLoad();
    this.emitFilterEvent('ready', { filters: { ...this.filters } });
  }

  // Cleanup
  async onBeforeDestroy() {
    await super.onBeforeDestroy();

    // Remove resize listener
    if (this._resizeHandler) {
      window.removeEventListener('resize', this._resizeHandler);
    }

    this.emitFilterEvent('destroyed');
  }

  // Static method to show filters view in a dialog for standalone testing
  static async showDialog(imageUrl, options = {}) {
    const {
      title = 'Apply Filters',
      alt = 'Image',
      size = 'xl',
      showControls = true,
      allowReset = true,
      showPresets = true,
      showBasicControls = true,
      showAdvancedControls = true,
      controlsInDropdowns = true,
      canvasSize = 'auto',
      autoFit = true,
      crossOrigin = 'anonymous',
      ...dialogOptions
    } = options;

    const filtersView = new ImageFiltersView({
      imageUrl,
      alt,
      title,
      canvasSize,
      autoFit,
      crossOrigin,
      showControls,
      allowReset,
      showPresets,
      showBasicControls,
      showAdvancedControls,
      controlsInDropdowns
    });

    const dialog = new Dialog({
      title,
      body: filtersView,
      size,
      centered: true,
      backdrop: 'static',
      keyboard: true,
      buttons: [
        {
          text: 'Cancel',
          action: 'cancel',
          class: 'btn btn-secondary',
          dismiss: true
        },
        {
          text: 'Apply Filters',
          action: 'apply-filters',
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
        resolve({ action: 'cancel', view: filtersView });
      });

      dialog.on('action:cancel', () => {
        dialog.hide();
      });

      dialog.on('action:apply-filters', async () => {
        const imageData = filtersView.exportFilteredImageData();
        dialog.hide();
        resolve({
          action: 'filters',
          view: filtersView,
          data: imageData,
          filterState: filtersView.getFilterState()
        });
      });
    });
  }
}

window.ImageFiltersView = ImageFiltersView;
