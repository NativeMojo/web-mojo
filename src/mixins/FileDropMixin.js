/**
 * FileDropMixin - Adds drag and drop file functionality to Views
 * Provides configurable file drop handling with validation and callbacks
 */

const FileDropMixin = {
  /**
   * Enable drag and drop file functionality on this view
   * @param {Object} config - Configuration options
   */
  enableFileDrop(config = {}) {
    // Store configuration
    this._fileDropConfig = {
      acceptedTypes: config.acceptedTypes || ['*/*'],
      maxFileSize: config.maxFileSize || 10 * 1024 * 1024, // 10MB
      dropZoneSelector: config.dropZoneSelector || null, // defaults to view element
      visualFeedback: config.visualFeedback !== false, // default true
      multiple: config.multiple || false,
      validateOnDrop: config.validateOnDrop !== false, // default true
      dragOverClass: config.dragOverClass || 'drag-over',
      dragActiveClass: config.dragActiveClass || 'drag-active'
    };

    // Initialize drag/drop state
    this._fileDropState = {
      isDragActive: false,
      dragCounter: 0
    };

    // Bind event handlers
    this._boundFileDropHandlers = {
      dragEnter: this._onFileDropDragEnter.bind(this),
      dragOver: this._onFileDropDragOver.bind(this),
      dragLeave: this._onFileDropDragLeave.bind(this),
      drop: this._onFileDropDrop.bind(this),
      preventDefault: this._onFileDropPreventDefault.bind(this)
    };

    // Set up event listeners after render
    if (this.element) {
      this._setupFileDropListeners();
    } else {
      // If not rendered yet, set up in onAfterRender
      const originalOnAfterRender = this.onAfterRender.bind(this);
      this.onAfterRender = async () => {
        await originalOnAfterRender();
        this._setupFileDropListeners();
      };
    }

    // Hook into cleanup
    const originalOnBeforeDestroy = this.onBeforeDestroy.bind(this);
    this.onBeforeDestroy = async () => {
      this._cleanupFileDropListeners();
      await originalOnBeforeDestroy();
    };
  },

  /**
   * Set up drag and drop event listeners
   * @private
   */
  _setupFileDropListeners() {
    if (!this._fileDropConfig) return;

    // Get drop zone element
    const dropZone = this._getFileDropZone();
    if (!dropZone) {
      console.warn('FileDropMixin: Drop zone not found');
      return;
    }

    this._fileDropZone = dropZone;

    // Add event listeners to drop zone
    dropZone.addEventListener('dragenter', this._boundFileDropHandlers.dragEnter);
    dropZone.addEventListener('dragover', this._boundFileDropHandlers.dragOver);
    dropZone.addEventListener('dragleave', this._boundFileDropHandlers.dragLeave);
    dropZone.addEventListener('drop', this._boundFileDropHandlers.drop);

    // Prevent default drag behaviors on document to avoid browser's default file handling
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      document.addEventListener(eventName, this._boundFileDropHandlers.preventDefault);
    });
  },

  /**
   * Clean up drag and drop event listeners
   * @private
   */
  _cleanupFileDropListeners() {
    if (!this._boundFileDropHandlers) return;

    // Remove from drop zone
    if (this._fileDropZone) {
      this._fileDropZone.removeEventListener('dragenter', this._boundFileDropHandlers.dragEnter);
      this._fileDropZone.removeEventListener('dragover', this._boundFileDropHandlers.dragOver);
      this._fileDropZone.removeEventListener('dragleave', this._boundFileDropHandlers.dragLeave);
      this._fileDropZone.removeEventListener('drop', this._boundFileDropHandlers.drop);
    }

    // Remove from document
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      document.removeEventListener(eventName, this._boundFileDropHandlers.preventDefault);
    });

    // Clear references
    this._fileDropZone = null;
    this._boundFileDropHandlers = null;
    this._fileDropConfig = null;
    this._fileDropState = null;
  },

  /**
   * Get the drop zone element
   * @returns {Element} The drop zone element
   * @private
   */
  _getFileDropZone() {
    if (this._fileDropConfig.dropZoneSelector) {
      return this.element.querySelector(this._fileDropConfig.dropZoneSelector);
    }
    return this.element;
  },

  /**
   * Prevent default drag behaviors
   * @param {Event} e - Drag event
   * @private
   */
  _onFileDropPreventDefault(e) {
    e.preventDefault();
    e.stopPropagation();
  },

  /**
   * Handle drag enter event
   * @param {DragEvent} e - Drag event
   * @private
   */
  _onFileDropDragEnter(e) {
    this._onFileDropPreventDefault(e);
    
    this._fileDropState.dragCounter++;
    
    if (!this._fileDropState.isDragActive) {
      this._fileDropState.isDragActive = true;
      this._applyFileDropVisualFeedback(true);
    }
  },

  /**
   * Handle drag over event
   * @param {DragEvent} e - Drag event
   * @private
   */
  _onFileDropDragOver(e) {
    this._onFileDropPreventDefault(e);
    e.dataTransfer.dropEffect = 'copy';
  },

  /**
   * Handle drag leave event
   * @param {DragEvent} e - Drag event
   * @private
   */
  _onFileDropDragLeave(e) {
    this._onFileDropPreventDefault(e);
    
    this._fileDropState.dragCounter--;
    
    if (this._fileDropState.dragCounter <= 0) {
      this._fileDropState.isDragActive = false;
      this._fileDropState.dragCounter = 0;
      this._applyFileDropVisualFeedback(false);
    }
  },

  /**
   * Handle drop event
   * @param {DragEvent} e - Drag event
   * @private
   */
  async _onFileDropDrop(e) {
    this._onFileDropPreventDefault(e);
    
    // Reset drag state
    this._fileDropState.isDragActive = false;
    this._fileDropState.dragCounter = 0;
    this._applyFileDropVisualFeedback(false);
    
    // Get files from drop
    const files = Array.from(e.dataTransfer.files);
    
    if (files.length === 0) return;
    
    // Handle single vs multiple files
    const filesToProcess = this._fileDropConfig.multiple ? files : [files[0]];
    
    // Validate files if enabled
    let validation = { valid: true, errors: [] };
    if (this._fileDropConfig.validateOnDrop) {
      validation = this._validateFileDropFiles(filesToProcess);
      
      if (!validation.valid) {
        if (typeof this.onFileDropError === 'function') {
          await this.onFileDropError(new Error(validation.errors.join(', ')), e, filesToProcess);
        }
        return;
      }
    }
    
    // Call the view's onFileDrop method
    if (typeof this.onFileDrop === 'function') {
      try {
        await this.onFileDrop(filesToProcess, e, validation);
      } catch (error) {
        if (typeof this.onFileDropError === 'function') {
          await this.onFileDropError(error, e, filesToProcess);
        } else {
          console.error('FileDropMixin: Error in onFileDrop callback:', error);
        }
      }
    } else {
      console.warn('FileDropMixin: No onFileDrop method found on view');
    }
  },

  /**
   * Apply visual feedback during drag operations
   * @param {boolean} isDragActive - Whether drag is active
   * @private
   */
  _applyFileDropVisualFeedback(isDragActive) {
    if (!this._fileDropConfig.visualFeedback || !this._fileDropZone) return;
    
    const { dragOverClass, dragActiveClass } = this._fileDropConfig;
    
    if (isDragActive) {
      this._fileDropZone.classList.add(dragOverClass, dragActiveClass);
    } else {
      this._fileDropZone.classList.remove(dragOverClass, dragActiveClass);
    }
  },

  /**
   * Validate dropped files
   * @param {File[]} files - Files to validate
   * @returns {Object} Validation result
   * @private
   */
  _validateFileDropFiles(files) {
    const errors = [];
    const config = this._fileDropConfig;
    
    for (const file of files) {
      // Check file type
      if (!this._isFileDropTypeAccepted(file.type)) {
        errors.push(`File type "${file.type}" is not accepted for file "${file.name}"`);
        continue;
      }
      
      // Check file size
      if (file.size > config.maxFileSize) {
        errors.push(`File "${file.name}" (${this._formatFileDropSize(file.size)}) exceeds maximum size (${this._formatFileDropSize(config.maxFileSize)})`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  },

  /**
   * Check if file type is accepted
   * @param {string} fileType - MIME type of the file
   * @returns {boolean} Whether the file type is accepted
   * @private
   */
  _isFileDropTypeAccepted(fileType) {
    const { acceptedTypes } = this._fileDropConfig;
    
    // Allow all types if wildcard
    if (acceptedTypes.includes('*/*')) return true;
    
    return acceptedTypes.some(acceptedType => {
      // Exact match
      if (acceptedType === fileType) return true;
      
      // Wildcard match (e.g., "image/*")
      if (acceptedType.endsWith('/*')) {
        const category = acceptedType.split('/')[0];
        return fileType.startsWith(category + '/');
      }
      
      return false;
    });
  },

  /**
   * Format file size for display
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted file size
   * @private
   */
  _formatFileDropSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
};

// Apply mixin to View prototype
export default function applyFileDropMixin(ViewClass) {
  Object.assign(ViewClass.prototype, FileDropMixin);
}

// Export the mixin for manual application
export { FileDropMixin };