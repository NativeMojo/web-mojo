/**
 * FileView - Display file metadata and renditions in organized tabs
 * Shows file information using proper MOJO framework patterns with Mustache templating
 */

import View from '../../core/View.js';
import TabView from '../navigation/TabView.js';
import TableView from '../table/TableView.js';

class FileView extends View {
  constructor(options = {}) {
    const {
      file,
      model,
      ...viewOptions
    } = options;

    super({
      tagName: 'div',
      className: 'file-view',
      ...viewOptions
    });

    // Support both file property and model property (from TablePage)
    this.model = file || model || {};
    this.tabView = null;
  }

  async getTemplate() {
    return '<div data-container="tab-container"></div>';
  }

  async onInit() {
    // Process the file data for template usage
    this.processFileForTemplating();

    // Create TabView
    this.tabView = new TabView({
      containerId: 'tab-container'
    });

    // Add the TabView as a child
    this.addChild(this.tabView);

    // Add tabs after TabView is rendered
    await this.tabView.addTab('Overview', new OverviewTabView({
      model: this.model
    }), true);

    await this.tabView.addTab('Renditions', new RenditionsTabView({
      model: this.model
    }));

    await this.tabView.addTab('Metadata', new MetadataTabView({
      model: this.model
    }));

  }

  processFileForTemplating() {
    // Add computed properties for template use
    this.model.hasImagePreview = this.isImageContentType(this.model.get("content_type")) || this.isImageUrl(this.model._.url);
    this.model.hasRenditions = this.model._.renditions;
    // Process renditions for template use
    if (this.model._.renditions && Array.isArray(this.model._.renditions)) {
      this.model.renditions = this.model._.renditions.map(rendition => ({
        ...rendition,
        isImage: this.isImageContentType(rendition.content_type),
        dimensions: this.extractDimensions(rendition)
      }));
    }

    // Add best image URL for preview
    if (this.model.hasImagePreview) {
      this.model.bestImageUrl = this.getBestImageUrl(this.model);
    }
  }

  isImageContentType(contentType) {
    return contentType && contentType.startsWith('image/');
  }

  isImageUrl(url) {
    return url && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);
  }

  getBestImageUrl(file) {
    if (file.renditions && Array.isArray(file.renditions)) {
      const imageRenditions = file.renditions.filter(r => this.isImageContentType(r.content_type));
      if (imageRenditions.length > 0) {
        return imageRenditions.reduce((best, current) => {
          const bestSize = parseInt(best.width || 0) * parseInt(best.height || 0);
          const currentSize = parseInt(current.width || 0) * parseInt(current.height || 0);
          return currentSize > bestSize ? current : best;
        }).url;
      }
    }
    return file.url;
  }

  extractDimensions(rendition) {
    if (rendition.width && rendition.height) {
      return `${rendition.width} × ${rendition.height}`;
    }
    return null;
  }

  static create(options) {
    return new FileView(options);
  }
}

// Overview Tab View
class OverviewTabView extends View {
  constructor(options) {
    super({
      tagName: 'div',
      className: 'file-overview p-3',
      ...options
    });
  }

  async getTemplate() {
    return `
      <div class="row g-4">
        <div class="col-md-6">
          <div class="card h-100">
            <div class="card-header">
              <h6 class="card-title mb-0">
                <i class="bi bi-file-earmark me-2"></i>File Information
              </h6>
            </div>
            <div class="card-body">
              <div class="row g-2">
                <div class="col-4"><strong>Name:</strong></div>
                <div class="col-8">{{model.filename}}</div>

                {{#model.content_type}}
                <div class="col-4"><strong>Type:</strong></div>
                <div class="col-8">
                  <span class="badge bg-secondary">{{model.content_type}}</span>
                </div>
                {{/model.content_type}}

                {{#model.file_size}}
                <div class="col-4"><strong>Size:</strong></div>
                <div class="col-8">{{model.file_size|filesize}}</div>
                {{/model.file_size}}

                {{#model.created}}
                <div class="col-4"><strong>Created:</strong></div>
                <div class="col-8">{{model.created|epoch|datetime}}</div>
                {{/model.created}}

                {{#model.description}}
                <div class="col-12 mt-3">
                  <strong>Description:</strong><br>
                  <div class="text-muted">{{model.description}}</div>
                </div>
                {{/model.description}}
              </div>

              {{#model.url}}
              <div class="mt-3">
                <a href="{{model.url}}" target="_blank" class="btn btn-sm btn-outline-primary">
                  <i class="bi bi-box-arrow-up-right me-1"></i>Open File
                </a>
                <button class="btn btn-sm btn-outline-secondary ms-2" data-action="copy-url">
                  <i class="bi bi-clipboard me-1"></i>Copy URL
                </button>
              </div>
              {{/model.url}}
            </div>
          </div>
        </div>

        <div class="col-md-6">
          {{#model.isImage}}
          <div class="card h-100">
            <div class="card-header">
              <h6 class="card-title mb-0">
                <i class="bi bi-image me-2"></i>Preview
              </h6>
            </div>
            <div class="card-body text-center">
              {{{model|image}}}
            </div>
          </div>
          {{/model.isImage}}

          {{^model.isImage}}
          <div class="card h-100">
            <div class="card-body d-flex align-items-center justify-content-center text-muted">
              <div class="text-center">
                <i class="bi bi-file-earmark display-1"></i>
                <p class="mt-3">No preview available</p>
              </div>
            </div>
          </div>
          {{/model.isImage}}
        </div>
      </div>
    `;
  }

  async onActionCopyUrl(action, event, element) {
    const url = this.model.url;
    if (!url) return;

    try {
      await navigator.clipboard.writeText(url);

      // Show temporary success state
      const originalText = element.innerHTML;
      element.innerHTML = '<i class="bi bi-check me-1"></i>Copied!';
      element.classList.remove('btn-outline-secondary');
      element.classList.add('btn-success');

      setTimeout(() => {
        element.innerHTML = originalText;
        element.classList.remove('btn-success');
        element.classList.add('btn-outline-secondary');
      }, 2000);

    } catch (error) {
      console.error('Failed to copy URL:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  }
}

// Renditions Tab View - Using Table.js for better functionality
class RenditionsTabView extends View {
  constructor(options) {
    super({
      tagName: 'div',
      className: 'file-renditions',
      ...options
    });

    this.renditionsTable = null;
  }

  async onInit() {
    await super.onInit();

    // Initialize the renditions table
    this.renditionsTable = new TableView({
      container: "renditions-table",
      columns: [
        { title: 'Role', key: 'role' },
        { title: 'Size', key: 'file_size|filesize' },
        { title: 'Type', key: 'content_type' },
        { title: 'URL', key: 'url|url("view image", true)' }
      ],
      data: Object.values(this.model._.renditions)
    });

    this.addChild(this.renditionsTable);
  }

  async getTemplate() {
    return '<div data-container="renditions-table"></div>';
  }

}

// Metadata Tab View
class MetadataTabView extends View {
  constructor(options) {
    super({
      tagName: 'div',
      className: 'file-metadata p-3',
      ...options
    });
  }

  async getTemplate() {
    return `
      <div class="table-responsive">
        <table class="table table-striped">
          <tbody>
            {{#model.id}}
            <tr>
              <th class="text-nowrap" style="width: 200px;">ID</th>
              <td>{{model.id}}</td>
            </tr>
            {{/model.id}}

            {{#model.filename}}
            <tr>
              <th class="text-nowrap">Filename</th>
              <td>{{model.filename}}</td>
            </tr>
            {{/model.filename}}

            {{#model.content_type}}
            <tr>
              <th class="text-nowrap">Content Type</th>
              <td><code>{{model.content_type}}</code></td>
            </tr>
            {{/model.content_type}}

            {{#model.file_size}}
            <tr>
              <th class="text-nowrap">File Size</th>
              <td>{{model.file_size|filesize}} <small class="text-muted">({{model.file_size}} bytes)</small></td>
            </tr>
            {{/model.file_size}}

            {{#model.created}}
            <tr>
              <th class="text-nowrap">Created</th>
              <td>{{model.created|epoch|datetime}}</td>
            </tr>
            {{/model.created}}

            {{#model.modified}}
            <tr>
              <th class="text-nowrap">Modified</th>
              <td>{{model.modified|epoch|datetime}}</td>
            </tr>
            {{/model.modified}}

            {{#model.upload_status}}
            <tr>
              <th class="text-nowrap">Upload Status</th>
              <td><span class="badge bg-info">{{model.upload_status}}</span></td>
            </tr>
            {{/model.upload_status}}

            {{#model.group}}
            <tr>
              <th class="text-nowrap">Group</th>
              <td>{{model.group}}</td>
            </tr>
            {{/model.group}}

            <tr>
              <th class="text-nowrap">Public</th>
              <td>
                {{#model.is_public}}
                <span class="badge bg-success">Yes</span>
                {{/model.is_public}}
                {{^model.is_public}}
                <span class="badge bg-secondary">No</span>
                {{/model.is_public}}
              </td>
            </tr>

            <tr>
              <th class="text-nowrap">Active</th>
              <td>
                {{#model.is_active}}
                <span class="badge bg-success">Yes</span>
                {{/model.is_active}}
                {{^model.is_active}}
                <span class="badge bg-secondary">No</span>
                {{/model.is_active}}
              </td>
            </tr>

            {{#model.storage_filename}}
            <tr>
              <th class="text-nowrap">Storage Filename</th>
              <td><code class="small">{{model.storage_filename}}</code></td>
            </tr>
            {{/model.storage_filename}}

            {{#model.storage_file_path}}
            <tr>
              <th class="text-nowrap">Storage Path</th>
              <td><code class="small">{{model.storage_file_path}}</code></td>
            </tr>
            {{/model.storage_file_path}}

            {{#model.checksum}}
            <tr>
              <th class="text-nowrap">Checksum</th>
              <td><code class="small">{{model.checksum}}</code></td>
            </tr>
            {{/model.checksum}}

            {{#model.url}}
            <tr>
              <th class="text-nowrap">URL</th>
              <td><code class="small">{{model.url}}</code></td>
            </tr>
            {{/model.url}}
          </tbody>
        </table>
      </div>
    `;
  }
}

export default FileView;
