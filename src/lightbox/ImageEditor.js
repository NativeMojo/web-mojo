/**
 * ImageEditor - Modular parent container for image editing functionality
 * Manages child views: ImageTransformView, ImageCropView, ImageFiltersView
 */

import View from '../core/View.js';
import Dialog from '../components/Dialog.js';
import ImageTransformView from './ImageTransformView.js';
import ImageCropView from './ImageCropView.js';
import ImageFiltersView from './ImageFiltersView.js';

export default class ImageEditor extends View {
  constructor(options = {}) {
    super({
      ...options,
      className: `image-editor ${options.className || ''}`,
      tagName: 'div'
    });

    // Image properties
    this.imageUrl = options.imageUrl || options.src || '';
    this.alt = options.alt || 'Image';
    this.title = options.title || '';
    
    // Current edited image data (preserved across mode switches)
    this.currentImageData = null;

    // Current editing mode
    this.currentMode = options.startMode || 'transform'; // 'transform', 'crop', 'filters'

    // History for undo/redo
    this.history = [];
    this.historyIndex = -1;
    this.maxHistory = options.maxHistory || 20;

    // Template properties (set directly on instance for Mustache)
    this.showToolbar = options.showToolbar !== false;
    this.allowTransform = options.allowTransform !== false;
    this.allowCrop = options.allowCrop !== false;
    this.allowFilters = options.allowFilters !== false;
    this.allowExport = options.allowExport !== false;
    this.allowHistory = options.allowHistory !== false;

    // Current active view (created on demand)
    this.currentView = null;

    // State
    this.isInitialized = false;
  }

  async getTemplate() {
    return `
      <div class="image-editor-container d-flex flex-column h-100">
        {{#showToolbar}}
        <!-- Toolbar -->
        <div class="image-editor-toolbar bg-light border-bottom p-3" data-container="toolbar">
          <div class="d-flex justify-content-between align-items-center">
            <!-- Mode Buttons -->
            <div class="btn-group" role="group" aria-label="Editing modes">
              {{#allowTransform}}
              <button type="button" class="btn btn-outline-primary mode-btn"
                      data-action="switch-mode" data-mode="transform"
                      title="Transform: Zoom, Pan, Rotate">
                <i class="bi bi-arrows-move"></i> Transform
              </button>
              {{/allowTransform}}

              {{#allowCrop}}
              <button type="button" class="btn btn-outline-primary mode-btn"
                      data-action="switch-mode" data-mode="crop"
                      title="Crop: Select and crop image">
                <i class="bi bi-crop"></i> Crop
              </button>
              {{/allowCrop}}

              {{#allowFilters}}
              <button type="button" class="btn btn-outline-primary mode-btn"
                      data-action="switch-mode" data-mode="filters"
                      title="Filters: Brightness, Contrast, Effects">
                <i class="bi bi-palette"></i> Filters
              </button>
              {{/allowFilters}}
            </div>

            <!-- Action Buttons -->
            <div class="btn-group" role="group" aria-label="Actions">
              {{#allowHistory}}
              <button type="button" class="btn btn-outline-secondary btn-sm"
                      data-action="undo" title="Undo" disabled>
                <i class="bi bi-arrow-counterclockwise"></i>
              </button>
              <button type="button" class="btn btn-outline-secondary btn-sm"
                      data-action="redo" title="Redo" disabled>
                <i class="bi bi-arrow-clockwise"></i>
              </button>
              {{/allowHistory}}

              <button type="button" class="btn btn-outline-secondary btn-sm"
                      data-action="reset" title="Reset All Changes">
                <i class="bi bi-arrow-repeat"></i>
              </button>

              {{#allowExport}}
              <button type="button" class="btn btn-success btn-sm"
                      data-action="export" title="Export Image">
                <i class="bi bi-download"></i> Export
              </button>
              {{/allowExport}}
            </div>
          </div>


        </div>
        {{/showToolbar}}

        <!-- Main editing area where child views will be mounted -->
        <div class="image-editor-workspace flex-grow-1 position-relative" data-container="image-workspace">
          <!-- Child views will be added here dynamically -->
        </div>

        <!-- Status bar -->
        <div class="image-editor-status bg-light border-top p-2" data-container="status">
          <div class="d-flex justify-content-between align-items-center">
            <small class="text-muted">
              Mode: <span class="current-mode fw-bold">Transform</span>
            </small>
            <small class="text-muted">
              <span class="image-info">Ready</span>
            </small>
          </div>
        </div>
      </div>
    `;
  }

  async onAfterRender() {
    // Cache DOM elements
    this.toolbarElement = this.element.querySelector('.image-editor-toolbar');
    this.workspaceElement = this.element.querySelector('.image-editor-workspace');
    this.statusElement = this.element.querySelector('.image-editor-status');


    // Set up event listeners for child views
    this.setupChildViewEvents();

    // Set initial mode
    await this.switchMode(this.currentMode, true);

    // Initialize history
    this.saveState();

    this.isInitialized = true;
  }

  createChildView(mode) {
    // Use the edited image data if available, otherwise use original
    const imageToUse = this.currentImageData || this.imageUrl;
    console.log('[ImageEditor] Creating', mode, 'view with:', 
      this.currentImageData ? 'preserved canvas data' : 'original image');
    
    const childOptions = {
      parent: this,
      containerId: "image-workspace",
      imageUrl: imageToUse,
      alt: this.alt,
      title: this.title
    };

    switch (mode) {
      case 'transform':
        if (!this.allowTransform) return null;
        return new ImageTransformView({
          ...childOptions,
          allowPan: true,
          allowZoom: true,
          allowRotate: true
        });
      case 'crop':
        if (!this.allowCrop) return null;
        return new ImageCropView({
          ...childOptions,
          showGrid: true,
          minCropSize: 50
        });
      case 'filters':
        if (!this.allowFilters) return null;
        return new ImageFiltersView({
          ...childOptions,
          showControls: true,
          allowReset: true
        });
      default:
        return null;
    }
  }

  setupChildViewEvents() {
    const eventBus = this.getApp()?.events;
    if (!eventBus) return;

    // Listen to child view events for history tracking
    eventBus.on('imagetransform:scale-changed', () => this.saveState());
    eventBus.on('imagetransform:rotated', () => this.saveState());
    eventBus.on('imagetransform:reset', () => this.saveState());

    // Crop applied permanently changes the image, so capture it
    eventBus.on('imagecrop:crop-applied', (data) => {
      // Store the cropped image as the current edited state
      const imageData = this.getCurrentImageData();
      if (imageData) {
        console.log('[ImageEditor] Crop applied - updating preserved canvas data');
        this.currentImageData = imageData;
      }
      this.saveState();
      
      // Provide user feedback
      this.updateStatus('Crop applied successfully');
      
      // Update the history buttons since we saved state
      this.updateHistoryButtons();
    });

    eventBus.on('imagefilters:filter-changed', () => {
      this.saveState();
      this.updateStatus('Filter applied');
    });
    
    eventBus.on('imagefilters:filters-reset', () => {
      this.saveState();
      this.updateStatus('Filters reset');
    });
  }

  // Action handlers
  async handleActionSwitchMode(e, el) {
    const mode = el.getAttribute('data-mode');
    await this.switchMode(mode);
  }



  async handleActionUndo() {
    this.undo();
  }

  async handleActionRedo() {
    this.redo();
  }

  async handleActionReset() {
    await this.resetAll();
  }

  async handleActionExport() {
    const result = await this.exportImage();
    if (result) {
      this.updateStatus('Image exported successfully');
    }
  }

  // Mode management
  async switchMode(mode, force=false) {
    if (mode === this.currentMode && !force) return;

    // Capture current canvas state before destroying view
    if (this.currentView && !force) {
      // Get the current edited image data using the consistent method
      const imageData = this.getCurrentImageData();
      
      // Store it for the next view
      if (imageData) {
        console.log('[ImageEditor] Preserving canvas state from', this.currentMode, 'mode');
        this.currentImageData = imageData;
      } else {
        console.log('[ImageEditor] No canvas data to preserve from', this.currentMode, 'mode');
      }
    } else if (force) {
      console.log('[ImageEditor] Force mode switch - not preserving canvas state');
    }

    // Destroy current view if it exists
    if (this.currentView) {
      await this.currentView.destroy();
      this.currentView = null;
    }



    // Update button states
    const modeButtons = this.element.querySelectorAll('.mode-btn');
    modeButtons.forEach(btn => {
      btn.classList.remove('active');
      if (btn.getAttribute('data-mode') === mode) {
        btn.classList.add('active');
      }
    });

    // Create and render new view
    this.currentMode = mode;
    this.currentView = this.createChildView(mode);

    if (this.currentView) {
      await this.currentView.render();

      // Mode-specific initialization
      if (mode === 'crop' && this.currentView.startCropMode) {
        this.currentView.startCropMode();
        this.updateStatus('Click and drag to select crop area');
      } else if (mode === 'transform') {
        this.updateStatus('Use controls to transform the image');
      } else if (mode === 'filters') {
        this.updateStatus('Adjust filters to enhance the image');
      }
    }

    // Update status
    this.updateCurrentModeDisplay();

    // Emit mode change event
    const eventBus = this.getApp()?.events;
    if (eventBus) {
      eventBus.emit('imageeditor:mode-changed', {
        editor: this,
        mode: mode,
        currentView: this.currentView
      });
    }
  }

  updateCurrentModeDisplay() {
    const modeDisplay = this.element.querySelector('.current-mode');
    if (modeDisplay) {
      modeDisplay.textContent = this.currentMode.charAt(0).toUpperCase() + this.currentMode.slice(1);
    }
  }

  updateStatus(message) {
    const infoDisplay = this.element.querySelector('.image-info');
    if (infoDisplay) {
      infoDisplay.textContent = message;
    }
  }

  // History management
  saveState() {
    if (!this.isInitialized) return;

    const state = {
      mode: this.currentMode,
      transform: this.currentView?.getTransformState?.(),
      filters: this.currentView?.getFilterState?.(),
      imageData: this.currentImageData,
      timestamp: Date.now()
    };

    // Remove any states after current index (when undoing then making new changes)
    this.history = this.history.slice(0, this.historyIndex + 1);

    // Add new state
    this.history.push(state);
    this.historyIndex = this.history.length - 1;

    // Keep within max history limit
    if (this.history.length > this.maxHistory) {
      this.history.shift();
      this.historyIndex--;
    }

    this.updateHistoryButtons();
  }

  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.restoreState(this.history[this.historyIndex]);
    }
  }

  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.restoreState(this.history[this.historyIndex]);
    }
  }

  async restoreState(state) {
    // Restore the image data if it exists
    if (state.imageData) {
      console.log('[ImageEditor] Restoring preserved canvas data from history');
      this.currentImageData = state.imageData;
    }
    
    // Switch to the mode from the state  
    await this.switchMode(state.mode, true); // Force to use the restored image data

    // Restore state for current view
    if (this.currentView) {
      if (state.transform && this.currentView.setTransformState) {
        this.currentView.setTransformState(state.transform);
      }
      if (state.filters && this.currentView.setFilterState) {
        this.currentView.setFilterState(state.filters);
      }
    }

    this.updateHistoryButtons();
    this.updateStatus(`Restored to ${state.mode} mode`);
  }

  updateHistoryButtons() {
    const undoBtn = this.element.querySelector('[data-action="undo"]');
    const redoBtn = this.element.querySelector('[data-action="redo"]');

    if (undoBtn) undoBtn.disabled = this.historyIndex <= 0;
    if (redoBtn) redoBtn.disabled = this.historyIndex >= this.history.length - 1;
  }

  async resetAll() {
    // Clear the edited image data to reset to original
    console.log('[ImageEditor] Resetting - clearing preserved canvas data');
    this.currentImageData = null;
    
    // Reset current view
    if (this.currentView && this.currentView.reset) {
      this.currentView.reset();
    }

    // Switch back to transform mode with force flag to use original image
    await this.switchMode('transform', true);

    // Clear history and save new state
    this.history = [];
    this.historyIndex = -1;
    this.saveState();

    this.updateStatus('All changes reset');
  }

  // Export functionality
  async exportImage() {
    if (!this.currentView) return null;

    try {
      let imageData = null;

      // Get the processed image from the current view
      imageData = this.getCurrentImageData();

      if (imageData) {
        // Trigger download
        const link = document.createElement('a');
        link.download = this.getExportFilename();
        link.href = imageData;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Emit export event
        const eventBus = this.getApp()?.events;
        if (eventBus) {
          eventBus.emit('imageeditor:exported', {
            editor: this,
            imageData: imageData,
            filename: link.download
          });
        }

        return { imageData, filename: link.download };
      }
    } catch (error) {
      console.error('Export failed:', error);
      this.updateStatus('Export failed');
    }

    return null;
  }

  getExportFilename() {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:\-]/g, '');
    return `edited-image-${timestamp}.png`;
  }

  // Public API
  async setImage(imageUrl, alt = '', title = '') {
    console.log('[ImageEditor] Setting new image - clearing preserved canvas data');
    this.imageUrl = imageUrl;
    this.alt = alt;
    this.title = title;
    
    // Clear any edited data
    this.currentImageData = null;

    // Update current view
    if (this.currentView && this.currentView.setImage) {
      this.currentView.setImage(imageUrl, alt, title);
    }

    // Reset state
    await this.resetAll();
  }

  getCurrentImageData() {
    if (!this.currentView) return null;
    
    // Get the current edited image data based on view type
    let imageData = null;
    if (this.currentView.exportImageData) {
      imageData = this.currentView.exportImageData();
    } else if (this.currentView.exportFilteredImageData) {
      imageData = this.currentView.exportFilteredImageData();
    }
    
    return imageData || null;
  }

  // Cleanup
  async onBeforeDestroy() {
    // Clean up current view
    if (this.currentView) {
      await this.currentView.destroy();
      this.currentView = null;
    }

    // Emit destroy event
    const eventBus = this.getApp()?.events;
    if (eventBus) {
      eventBus.emit('imageeditor:destroyed', { editor: this });
    }
  }

  // Static method to show editor in a fullscreen dialog
  static async showDialog(imageUrl, options = {}) {
    const {
      title = 'Image Editor',
      alt = 'Image',
      size = 'fullscreen',
      showToolbar = true,
      allowTransform = true,
      allowCrop = true,
      allowFilters = true,
      allowExport = true,
      ...dialogOptions
    } = options;

    const editor = new ImageEditor({
      imageUrl,
      alt,
      title,
      showToolbar,
      allowTransform,
      allowCrop,
      allowFilters,
      allowExport
    });

    const dialog = new Dialog({
      title,
      body: editor,
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
          text: 'Export & Close',
          action: 'export-close',
          class: 'btn btn-primary'
        }
      ],
      ...dialogOptions
    });

    // Render and mount
    await dialog.render(true, document.body);

    // Show the dialog
    window.lastDialog = dialog;
    dialog.show();

    return new Promise((resolve) => {
      dialog.on('hidden', () => {
        dialog.destroy();
        resolve({ action: 'cancel', editor });
      });

      dialog.on('action:cancel', () => {
        dialog.hide();
      });

      dialog.on('action:export-close', async () => {
        const result = await editor.exportImage();
        dialog.hide();
        resolve({
          action: 'export',
          editor,
          data: result?.imageData,
          filename: result?.filename
        });
      });
    });
  }
}

window.ImageEditor = ImageEditor;
