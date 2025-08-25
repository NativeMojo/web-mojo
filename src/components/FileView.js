/**
 * FileView - Display file metadata and renditions in organized tabs
 * Shows file information in a user-friendly format with support for both
 * simple URLs and complex file objects with renditions
 * 
 * Features:
 * - Three-tab layout: Overview, Renditions, Metadata
 * - Support for both URL strings and file objects
 * - Responsive image previews with multiple sizes
 * - Clean metadata display with formatted values
 * - Bootstrap 5 styling with proper responsive behavior
 * 
 * Example Usage:
 * ```javascript
 * // With file object
 * const fileView = new FileView({
 *   file: fileObject, // Complex file object with renditions
 *   size: 'lg'
 * });
 * 
 * // With simple URL
 * const fileView = new FileView({
 *   file: 'https://example.com/image.jpg'
 * });
 * ```
 */

import View from '../core/View.js';
import TabView from './TabView.js';
import dataFormatter from '../utils/DataFormatter.js';

class FileView extends View {
  constructor(options = {}) {
    const {
      file,
      size = 'md',
      showActions = true,
      showMetadata = true,
      showRenditions = true,
      ...viewOptions
    } = options;

    super({
      tagName: 'div',
      className: 'file-view',
      ...viewOptions
    });

    // File data and configuration
    this.file = file;
    this.size = size;
    this.showActions = showActions;
    this.showMetadata = showMetadata;
    this.showRenditions = showRenditions;

    // Processed file information
    this.fileInfo = this.processFileData(file);
    this.tabs = {};
    this.tabView = null;
  }

  /**
   * Process file data into standardized format
   * @param {string|Object} file - File URL or file object
   * @returns {Object} Processed file information
   */
  processFileData(file) {
    if (!file) {
      return {
        isValid: false,
        type: 'empty',
        displayName: 'No file',
        url: null,
        fileSize: 0,
        contentType: 'unknown'
      };
    }

    // Handle simple URL string
    if (typeof file === 'string') {
      return {
        isValid: true,
        type: 'url',
        displayName: this.extractFilenameFromUrl(file),
        url: file,
        originalUrl: file,
        fileSize: 0,
        contentType: this.guessContentTypeFromUrl(file),
        isImage: this.isImageUrl(file)
      };
    }

    // Handle complex file object
    if (typeof file === 'object' && file.url) {
      return {
        isValid: true,
        type: 'object',
        id: file.id,
        displayName: file.filename || 'Unknown file',
        url: file.url,
        originalUrl: file.url,
        fileSize: file.file_size || 0,
        contentType: file.content_type || 'unknown',
        category: file.category || 'unknown',
        isImage: file.category === 'image' || this.isImageContentType(file.content_type),
        created: file.created,
        modified: file.modified,
        metadata: file.metadata || {},
        renditions: file.renditions || {},
        uploadStatus: file.upload_status,
        isPublic: file.is_public,
        isActive: file.is_active,
        checksum: file.checksum,
        storageFilename: file.storage_filename,
        storageFilePath: file.storage_file_path
      };
    }

    return {
      isValid: false,
      type: 'invalid',
      displayName: 'Invalid file',
      url: null
    };
  }

  /**
   * Extract filename from URL
   * @param {string} url - File URL
   * @returns {string} Extracted filename
   */
  extractFilenameFromUrl(url) {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = pathname.split('/').pop() || 'file';
      return decodeURIComponent(filename);
    } catch (error) {
      return 'file';
    }
  }

  /**
   * Guess content type from URL
   * @param {string} url - File URL
   * @returns {string} Guessed content type
   */
  guessContentTypeFromUrl(url) {
    const extension = url.split('.').pop()?.toLowerCase();
    const typeMap = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      pdf: 'application/pdf',
      txt: 'text/plain',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };
    return typeMap[extension] || 'application/octet-stream';
  }

  /**
   * Check if URL points to an image
   * @param {string} url - File URL
   * @returns {boolean} True if likely an image
   */
  isImageUrl(url) {
    return this.isImageContentType(this.guessContentTypeFromUrl(url));
  }

  /**
   * Check if content type is an image
   * @param {string} contentType - MIME type
   * @returns {boolean} True if image content type
   */
  isImageContentType(contentType) {
    return contentType?.startsWith('image/') || false;
  }

  /**
   * Get best image URL for display
   * @param {string} size - Requested size (xs, sm, md, lg, xl)
   * @returns {string|null} Best image URL or null
   */
  getBestImageUrl(size = 'md') {
    if (!this.fileInfo.isValid || !this.fileInfo.isImage) {
      return null;
    }

    // For simple URLs, return as-is
    if (this.fileInfo.type === 'url') {
      return this.fileInfo.url;
    }

    // For file objects with renditions
    if (this.fileInfo.renditions && Object.keys(this.fileInfo.renditions).length > 0) {
      const sizeMap = {
        xs: ['thumbnail_sm', 'thumbnail', 'square_sm'],
        sm: ['thumbnail', 'thumbnail_sm', 'square_sm'],
        md: ['thumbnail_md', 'thumbnail', 'thumbnail_lg'],
        lg: ['thumbnail_lg', 'thumbnail_md', 'thumbnail'],
        xl: ['original', 'thumbnail_lg']
      };

      const preferredSizes = sizeMap[size] || sizeMap.md;
      
      for (const renditionName of preferredSizes) {
        const rendition = this.fileInfo.renditions[renditionName];
        if (rendition && rendition.url) {
          return rendition.url;
        }
      }
    }

    // Fall back to original
    return this.fileInfo.originalUrl;
  }

  /**
   * Create overview tab content
   * @returns {View} Overview tab view
   */
  createOverviewTab() {
    return new View({
      tagName: 'div',
      className: 'file-overview p-3',
      data: {
        fileInfo: this.fileInfo,
        imageUrl: this.getBestImageUrl(this.size),
        showActions: this.showActions
      }
    });
  }

  /**
   * Create renditions tab content
   * @returns {View} Renditions tab view
   */
  createRenditionsTab() {
    const renditions = this.fileInfo.renditions || {};
    const renditionsList = Object.entries(renditions).map(([name, rendition]) => ({
      name,
      ...rendition,
      formattedSize: dataFormatter.pipe(rendition.file_size, 'filesize'),
      dimensions: this.extractDimensions(rendition.metadata)
    }));

    return new View({
      tagName: 'div',
      className: 'file-renditions p-3',
      data: {
        fileInfo: this.fileInfo,
        renditions: renditionsList,
        hasRenditions: renditionsList.length > 0
      }
    });
  }

  /**
   * Create metadata tab content  
   * @returns {View} Metadata tab view
   */
  createMetadataTab() {
    const metadata = [];

    if (this.fileInfo.type === 'object') {
      // Basic file information
      if (this.fileInfo.id) metadata.push({ label: 'ID', value: this.fileInfo.id });
      if (this.fileInfo.fileSize) {
        metadata.push({ 
          label: 'File Size', 
          value: dataFormatter.pipe(this.fileInfo.fileSize, 'filesize') 
        });
      }
      if (this.fileInfo.contentType) {
        metadata.push({ label: 'Content Type', value: this.fileInfo.contentType });
      }
      if (this.fileInfo.category) {
        metadata.push({ label: 'Category', value: this.fileInfo.category });
      }

      // Timestamps
      if (this.fileInfo.created) {
        metadata.push({ 
          label: 'Created', 
          value: dataFormatter.pipe(this.fileInfo.created, 'datetime') 
        });
      }
      if (this.fileInfo.modified) {
        metadata.push({ 
          label: 'Modified', 
          value: dataFormatter.pipe(this.fileInfo.modified, 'datetime') 
        });
      }

      // Status information
      if (this.fileInfo.uploadStatus) {
        metadata.push({ 
          label: 'Upload Status', 
          value: dataFormatter.pipe(this.fileInfo.uploadStatus, 'badge') 
        });
      }
      metadata.push({ 
        label: 'Public', 
        value: this.fileInfo.isPublic ? 'Yes' : 'No' 
      });
      metadata.push({ 
        label: 'Active', 
        value: this.fileInfo.isActive ? 'Yes' : 'No' 
      });

      // Storage information
      if (this.fileInfo.storageFilename) {
        metadata.push({ label: 'Storage Filename', value: this.fileInfo.storageFilename });
      }
      if (this.fileInfo.checksum) {
        metadata.push({ label: 'Checksum', value: this.fileInfo.checksum });
      }

      // Custom metadata
      if (this.fileInfo.metadata && Object.keys(this.fileInfo.metadata).length > 0) {
        Object.entries(this.fileInfo.metadata).forEach(([key, value]) => {
          metadata.push({ 
            label: key.charAt(0).toUpperCase() + key.slice(1),
            value: typeof value === 'object' ? JSON.stringify(value, null, 2) : value
          });
        });
      }
    }

    return new View({
      tagName: 'div', 
      className: 'file-metadata p-3',
      data: {
        fileInfo: this.fileInfo,
        metadata: metadata,
        hasMetadata: metadata.length > 0
      }
    });
  }

  /**
   * Extract dimensions from metadata
   * @param {Object} metadata - File metadata
   * @returns {string|null} Formatted dimensions or null
   */
  extractDimensions(metadata) {
    if (!metadata) return null;
    
    const width = metadata.width || metadata.image_width;
    const height = metadata.height || metadata.image_height;
    
    if (width && height) {
      return `${width} × ${height}`;
    }
    
    return null;
  }

  /**
   * Get template for overview tab
   * @returns {string} Overview template
   */
  getOverviewTemplate() {
    return `
      <div class="row">
        {{#fileInfo.isImage}}
        <div class="col-md-6">
          <div class="text-center mb-3">
            {{#imageUrl}}
            <img src="{{imageUrl}}" 
                 alt="{{fileInfo.displayName}}" 
                 class="img-fluid rounded shadow-sm"
                 style="max-height: 300px; width: auto;">
            {{/imageUrl}}
            {{^imageUrl}}
            <div class="bg-light rounded d-flex align-items-center justify-content-center" style="height: 200px;">
              <i class="bi bi-file-earmark fs-1 text-muted"></i>
            </div>
            {{/imageUrl}}
          </div>
        </div>
        {{/fileInfo.isImage}}
        
        <div class="{{#fileInfo.isImage}}col-md-6{{/fileInfo.isImage}}{{^fileInfo.isImage}}col-12{{/fileInfo.isImage}}">
          <h5 class="mb-3">{{fileInfo.displayName}}</h5>
          
          <dl class="row">
            {{#fileInfo.contentType}}
            <dt class="col-sm-4">Type:</dt>
            <dd class="col-sm-8">{{fileInfo.contentType}}</dd>
            {{/fileInfo.contentType}}
            
            {{#fileInfo.fileSize}}
            <dt class="col-sm-4">Size:</dt>
            <dd class="col-sm-8">{{fileInfo.fileSize|filesize}}</dd>
            {{/fileInfo.fileSize}}
            
            {{#fileInfo.category}}
            <dt class="col-sm-4">Category:</dt>
            <dd class="col-sm-8">{{fileInfo.category}}</dd>
            {{/fileInfo.category}}
            
            {{#fileInfo.uploadStatus}}
            <dt class="col-sm-4">Status:</dt>
            <dd class="col-sm-8">{{fileInfo.uploadStatus|badge}}</dd>
            {{/fileInfo.uploadStatus}}
          </dl>
          
          {{#showActions}}
          <div class="mt-3">
            {{#fileInfo.url}}
            <a href="{{fileInfo.url}}" 
               target="_blank" 
               class="btn btn-primary btn-sm me-2">
              <i class="bi bi-download me-1"></i> Download
            </a>
            {{/fileInfo.url}}
            <button type="button" 
                    class="btn btn-outline-secondary btn-sm"
                    data-action="copy-url">
              <i class="bi bi-clipboard me-1"></i> Copy URL
            </button>
          </div>
          {{/showActions}}
        </div>
      </div>
    `;
  }

  /**
   * Get template for renditions tab
   * @returns {string} Renditions template
   */
  getRenditionsTemplate() {
    return `
      {{#hasRenditions}}
      <div class="row g-3">
        {{#renditions}}
        <div class="col-sm-6 col-lg-4">
          <div class="card">
            <div class="text-center p-3">
              {{#url}}
              <img src="{{url}}" 
                   alt="{{name}}" 
                   class="img-fluid rounded"
                   style="max-height: 150px; width: auto;">
              {{/url}}
              {{^url}}
              <div class="bg-light rounded d-flex align-items-center justify-content-center" style="height: 100px;">
                <i class="bi bi-file-earmark text-muted"></i>
              </div>
              {{/url}}
            </div>
            <div class="card-body pt-0">
              <h6 class="card-title">{{name}}</h6>
              <small class="text-muted">
                {{#formattedSize}}{{formattedSize}}{{/formattedSize}}
                {{#dimensions}} • {{dimensions}}{{/dimensions}}
              </small>
              {{#url}}
              <div class="mt-2">
                <a href="{{url}}" 
                   target="_blank" 
                   class="btn btn-outline-primary btn-sm">
                  <i class="bi bi-download"></i>
                </a>
              </div>
              {{/url}}
            </div>
          </div>
        </div>
        {{/renditions}}
      </div>
      {{/hasRenditions}}
      
      {{^hasRenditions}}
      <div class="text-center text-muted py-5">
        <i class="bi bi-images fs-1 mb-3 d-block"></i>
        <p>No renditions available for this file.</p>
      </div>
      {{/hasRenditions}}
    `;
  }

  /**
   * Get template for metadata tab
   * @returns {string} Metadata template
   */
  getMetadataTemplate() {
    return `
      {{#hasMetadata}}
      <dl class="row">
        {{#metadata}}
        <dt class="col-sm-4">{{label}}:</dt>
        <dd class="col-sm-8">
          {{#value}}
          <code class="small">{{value}}</code>
          {{/value}}
          {{^value}}
          <span class="text-muted">-</span>
          {{/value}}
        </dd>
        {{/metadata}}
      </dl>
      {{/hasMetadata}}
      
      {{^hasMetadata}}
      <div class="text-center text-muted py-5">
        <i class="bi bi-info-circle fs-1 mb-3 d-block"></i>
        <p>No metadata available for this file.</p>
      </div>
      {{/hasMetadata}}
    `;
  }

  /**
   * Initialize the component after rendering
   */
  async onAfterRender() {
    await super.onAfterRender();

    if (!this.fileInfo.isValid) {
      this.element.innerHTML = `
        <div class="alert alert-warning">
          <i class="bi bi-exclamation-triangle me-2"></i>
          Invalid or missing file data.
        </div>
      `;
      return;
    }

    // Create tab views with their templates
    const overviewTab = this.createOverviewTab();
    overviewTab.renderTemplateString = () => this.getOverviewTemplate();

    const tabs = { 'Overview': overviewTab };

    // Add renditions tab if renditions exist or should be shown
    if (this.showRenditions && (this.fileInfo.renditions || this.fileInfo.type === 'object')) {
      const renditionsTab = this.createRenditionsTab();
      renditionsTab.renderTemplateString = () => this.getRenditionsTemplate();
      tabs['Renditions'] = renditionsTab;
    }

    // Add metadata tab if metadata exists or should be shown
    if (this.showMetadata && this.fileInfo.type === 'object') {
      const metadataTab = this.createMetadataTab();
      metadataTab.renderTemplateString = () => this.getMetadataTemplate();
      tabs['Metadata'] = metadataTab;
    }

    // Create and mount TabView
    this.tabView = new TabView({
      tabs: tabs,
      activeTab: 'Overview'
    });

    await this.tabView.mount(this.element);
  }

  /**
   * Handle copy URL action
   * @param {string} action - Action name
   * @param {Event} event - Click event
   * @param {Element} element - Clicked element
   */
  async handleActionCopyUrl(action, event, element) {
    if (!this.fileInfo.url) return;

    try {
      await navigator.clipboard.writeText(this.fileInfo.url);
      
      // Visual feedback
      const originalText = element.innerHTML;
      element.innerHTML = '<i class="bi bi-check me-1"></i> Copied!';
      element.classList.add('btn-success');
      element.classList.remove('btn-outline-secondary');
      
      setTimeout(() => {
        element.innerHTML = originalText;
        element.classList.remove('btn-success');
        element.classList.add('btn-outline-secondary');
      }, 2000);
      
    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
  }

  /**
   * Clean up when destroying
   */
  async onBeforeDestroy() {
    if (this.tabView) {
      await this.tabView.destroy();
    }
    await super.onBeforeDestroy();
  }

  /**
   * Update file data
   * @param {string|Object} newFile - New file data
   */
  async updateFile(newFile) {
    this.file = newFile;
    this.fileInfo = this.processFileData(newFile);
    
    if (this.isMounted()) {
      await this.render();
    }
  }

  /**
   * Static factory method
   * @param {Object} options - FileView options
   * @returns {FileView} New FileView instance
   */
  static create(options = {}) {
    return new FileView(options);
  }
}

export default FileView;