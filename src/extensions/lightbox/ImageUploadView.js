/**
 * ImageUploadView - Drag and drop image upload component
 * Provides file selection, preview, and upload functionality
 */

import View from '@core/View.js';

export default class ImageUploadView extends View {
  constructor(options = {}) {
    super({
      ...options,
      className: `image-upload-view ${options.className || ''}`,
      tagName: 'div'
    });

    // Upload options
    this.autoUpload = options.autoUpload || false;
    this.acceptedTypes = options.acceptedTypes || ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB default
    this.uploadUrl = options.uploadUrl || null;
    this.onUpload = options.onUpload || null; // Callback function

    // State
    this.selectedFile = null;
    this.isUploading = false;
    this.previewUrl = null;

    // Bind handlers for cleanup
    this._handleDragOver = this.handleDragOver.bind(this);
    this._handleDragLeave = this.handleDragLeave.bind(this);
    this._handleDrop = this.handleDrop.bind(this);
    this._handleFileSelect = this.handleFileSelect.bind(this);
    this._preventDefaults = this.preventDefaults.bind(this);
  }

  async getTemplate() {
    return `
      <div class="image-upload-container">
        <!-- Drop Zone -->
        <div class="upload-drop-zone border-2 border-dashed rounded p-4 text-center position-relative" 
             style="border-color: #dee2e6; min-height: 200px; transition: all 0.2s ease;">
          
          <!-- Default State -->
          <div class="upload-prompt">
            <i class="bi bi-cloud-upload text-muted" style="font-size: 3rem;"></i>
            <h5 class="mt-3 text-muted">Drop your image here</h5>
            <p class="text-muted mb-3">or</p>
            <button type="button" class="btn btn-outline-primary" data-action="select-file">
              <i class="bi bi-folder2-open"></i> Choose File
            </button>
            <input type="file" class="upload-file-input d-none" accept="image/*" multiple="false">
            <div class="mt-3">
              <small class="text-muted">Supported: JPEG, PNG, GIF, WebP (max ${Math.round(this.maxFileSize / 1024 / 1024)}MB)</small>
            </div>
          </div>
          
          <!-- Preview State -->
          <div class="upload-preview d-none">
            <div class="preview-image-container mb-3">
              <img class="preview-image img-fluid rounded shadow-sm" style="max-height: 300px; max-width: 100%;">
            </div>
            <div class="preview-info">
              <div class="file-name fw-bold mb-2 text-truncate"></div>
              <div class="file-details text-muted small mb-3"></div>
              <div class="upload-actions">
                {{#autoUpload}}
                <button type="button" class="btn btn-outline-secondary" data-action="clear">
                  <i class="bi bi-x"></i> Clear
                </button>
                {{/autoUpload}}
                {{^autoUpload}}
                <button type="button" class="btn btn-success me-2" data-action="upload">
                  <i class="bi bi-cloud-arrow-up"></i> Upload
                </button>
                <button type="button" class="btn btn-outline-secondary" data-action="clear">
                  <i class="bi bi-x"></i> Clear
                </button>
                {{/autoUpload}}
              </div>
            </div>
          </div>
          
          <!-- Loading State -->
          <div class="upload-loading d-none">
            <div class="spinner-border text-primary mb-3" role="status">
              <span class="visually-hidden">Uploading...</span>
            </div>
            <div class="upload-progress">
              <div class="progress mb-2" style="height: 8px;">
                <div class="progress-bar progress-bar-striped progress-bar-animated" 
                     role="progressbar" style="width: 0%"></div>
              </div>
              <small class="text-muted upload-status">Uploading...</small>
            </div>
          </div>
        </div>
        
        <!-- Upload Result -->
        <div class="upload-result mt-3 d-none">
          <div class="alert" role="alert"></div>
        </div>
      </div>
    `;
  }

  async onAfterRender() {
    // Cache DOM elements
    this.dropZone = this.element.querySelector('.upload-drop-zone');
    this.fileInput = this.element.querySelector('.upload-file-input');
    this.promptElement = this.element.querySelector('.upload-prompt');
    this.previewElement = this.element.querySelector('.upload-preview');
    this.loadingElement = this.element.querySelector('.upload-loading');
    this.resultElement = this.element.querySelector('.upload-result');
    this.previewImage = this.element.querySelector('.preview-image');
    this.fileName = this.element.querySelector('.file-name');
    this.fileDetails = this.element.querySelector('.file-details');
    this.progressBar = this.element.querySelector('.progress-bar');
    this.uploadStatus = this.element.querySelector('.upload-status');

    // Set up event listeners
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Drag and drop events
    this.dropZone.addEventListener('dragenter', this._preventDefaults);
    this.dropZone.addEventListener('dragover', this._handleDragOver);
    this.dropZone.addEventListener('dragleave', this._handleDragLeave);
    this.dropZone.addEventListener('drop', this._handleDrop);

    // File input change
    this.fileInput.addEventListener('change', this._handleFileSelect);

    // Prevent default drag behaviors on document
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      document.addEventListener(eventName, this._preventDefaults);
    });
  }

  preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  handleDragOver(e) {
    this.preventDefaults(e);
    this.dropZone.classList.add('border-primary', 'bg-light');
    this.dropZone.style.borderColor = '#0d6efd';
  }

  handleDragLeave(e) {
    this.preventDefaults(e);
    
    // Only remove styles if we're actually leaving the drop zone
    if (!this.dropZone.contains(e.relatedTarget)) {
      this.dropZone.classList.remove('border-primary', 'bg-light');
      this.dropZone.style.borderColor = '#dee2e6';
    }
  }

  async handleDrop(e) {
    this.preventDefaults(e);
    
    this.dropZone.classList.remove('border-primary', 'bg-light');
    this.dropZone.style.borderColor = '#dee2e6';
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await this.processFile(files[0]);
    }
  }

  async handleFileSelect(e) {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      await this.processFile(files[0]);
    }
  }

  async processFile(file) {
    // Validate file
    const validation = this.validateFile(file);
    if (!validation.valid) {
      this.showError(validation.error);
      return;
    }

    this.selectedFile = file;
    
    // Show preview
    await this.showPreview(file);
    
    // Auto upload if enabled
    if (this.autoUpload) {
      setTimeout(() => this.uploadFile(), 100); // Small delay to show preview
    }
  }

  validateFile(file) {
    // Check file type
    if (!this.acceptedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `File type "${file.type}" is not supported. Please use: ${this.acceptedTypes.map(t => t.split('/')[1].toUpperCase()).join(', ')}`
      };
    }

    // Check file size
    if (file.size > this.maxFileSize) {
      return {
        valid: false,
        error: `File size (${this.formatFileSize(file.size)}) exceeds maximum allowed size (${this.formatFileSize(this.maxFileSize)})`
      };
    }

    return { valid: true };
  }

  async showPreview(file) {
    // Create preview URL
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
    }
    this.previewUrl = URL.createObjectURL(file);

    // Update preview elements
    this.previewImage.src = this.previewUrl;
    this.fileName.textContent = file.name;
    this.fileDetails.textContent = `${this.formatFileSize(file.size)} • ${file.type.split('/')[1].toUpperCase()}`;

    // Show preview, hide prompt
    this.promptElement.classList.add('d-none');
    this.previewElement.classList.remove('d-none');

    // Clear any previous results
    this.hideResult();

    // Emit preview event
    this.emitUploadEvent('preview', { file, previewUrl: this.previewUrl });
  }

  async uploadFile() {
    if (!this.selectedFile || this.isUploading) return;

    this.isUploading = true;
    this.showLoading();

    try {
      let result;

      if (this.onUpload && typeof this.onUpload === 'function') {
        // Use callback function
        result = await this.onUpload(this.selectedFile, this.updateProgress.bind(this));
      } else if (this.uploadUrl) {
        // Use built-in upload to URL
        result = await this.uploadToUrl(this.selectedFile);
      } else {
        throw new Error('No upload method configured. Provide either uploadUrl or onUpload callback.');
      }

      this.showSuccess('File uploaded successfully!');
      this.emitUploadEvent('upload-success', { file: this.selectedFile, result });

    } catch (error) {
      console.error('Upload failed:', error);
      this.showError(`Upload failed: ${error.message}`);
      this.emitUploadEvent('upload-error', { file: this.selectedFile, error });
    } finally {
      this.isUploading = false;
      this.hideLoading();
    }
  }

  async uploadToUrl(file) {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('image', file);

      const xhr = new XMLHttpRequest();

      // Progress handler
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          this.updateProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (e) {
            resolve({ success: true, response: xhr.responseText });
          }
        } else {
          reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error occurred'));
      });

      xhr.addEventListener('timeout', () => {
        reject(new Error('Upload timeout'));
      });

      xhr.open('POST', this.uploadUrl);
      xhr.timeout = 30000; // 30 second timeout
      xhr.send(formData);
    });
  }

  updateProgress(percent) {
    if (this.progressBar) {
      this.progressBar.style.width = `${percent}%`;
      this.progressBar.setAttribute('aria-valuenow', percent);
    }
    if (this.uploadStatus) {
      this.uploadStatus.textContent = `Uploading... ${percent}%`;
    }
  }

  showLoading() {
    this.previewElement.classList.add('d-none');
    this.loadingElement.classList.remove('d-none');
    this.updateProgress(0);
  }

  hideLoading() {
    this.loadingElement.classList.add('d-none');
    if (!this.autoUpload || this.selectedFile) {
      this.previewElement.classList.remove('d-none');
    }
  }

  showSuccess(message) {
    this.showResult('success', message);
  }

  showError(message) {
    this.showResult('danger', message);
  }

  showResult(type, message) {
    const alertElement = this.resultElement.querySelector('.alert');
    const icon = type === 'success' ? 'check-circle-fill' : 'exclamation-triangle-fill';
    
    alertElement.className = `alert alert-${type}`;
    alertElement.innerHTML = `
      <i class="bi bi-${icon} me-2"></i>
      ${message}
    `;

    this.resultElement.classList.remove('d-none');

    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
      setTimeout(() => this.hideResult(), 5000);
    }
  }

  hideResult() {
    this.resultElement.classList.add('d-none');
  }

  clearFile() {
    // Clean up
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
      this.previewUrl = null;
    }

    this.selectedFile = null;
    this.isUploading = false;
    this.fileInput.value = '';

    // Reset UI
    this.previewElement.classList.add('d-none');
    this.loadingElement.classList.add('d-none');
    this.promptElement.classList.remove('d-none');
    this.hideResult();

    this.emitUploadEvent('cleared');
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  emitUploadEvent(type, data = {}) {
    const eventBus = this.getApp()?.events;
    if (eventBus) {
      eventBus.emit(`imageupload:${type}`, {
        view: this,
        ...data
      });
    }
  }

  // Action handlers
  async handleActionSelectFile() {
    this.fileInput.click();
  }

  async handleActionUpload() {
    await this.uploadFile();
  }

  async handleActionClear() {
    this.clearFile();
  }

  // Cleanup
  async onBeforeDestroy() {
    // Clean up preview URL
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
      this.previewUrl = null;
    }

    // Remove event listeners
    if (this.dropZone) {
      this.dropZone.removeEventListener('dragenter', this._preventDefaults);
      this.dropZone.removeEventListener('dragover', this._handleDragOver);
      this.dropZone.removeEventListener('dragleave', this._handleDragLeave);
      this.dropZone.removeEventListener('drop', this._handleDrop);
    }

    if (this.fileInput) {
      this.fileInput.removeEventListener('change', this._handleFileSelect);
    }

    // Remove document listeners
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      document.removeEventListener(eventName, this._preventDefaults);
    });

    this.emitUploadEvent('destroyed');
  }
}

window.ImageUploadView = ImageUploadView;