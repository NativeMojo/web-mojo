import { Page, FormView } from 'web-mojo';

/**
 * FileMediaFieldsPage - Demonstrates file and image upload fields
 * 
 * Shows file and image field types with upload capabilities
 */
class FileMediaFieldsPage extends Page {
  static pageName = 'forms/file-media-fields';
  
  constructor(options = {}) {
    super({
      title: 'File & Media Fields',
      icon: 'bi-file-earmark',
      pageDescription: 'Explore file upload and image fields with preview capabilities',
      ...options
    });
  }
  
  async onActionSubmitFileForm(event, element) {
    const isValid = await this.fileForm.validate();
    if (isValid) {
      const data = await this.fileForm.getFormData();
      console.log('File form submitted:', data);
      
      // Show the submitted data (note: file data will be base64 encoded)
      const output = document.getElementById('file-output');
      const displayData = { ...data };
      
      // Truncate base64 data for display
      Object.keys(displayData).forEach(key => {
        if (typeof displayData[key] === 'string' && displayData[key].startsWith('data:')) {
          displayData[key] = displayData[key].substring(0, 50) + '... [base64 data truncated]';
        }
      });
      
      output.innerHTML = `
        <div class="alert alert-success">
          <h5 class="alert-heading">
            <i class="bi bi-check-circle me-2"></i>
            Form Submitted Successfully!
          </h5>
          <hr>
          <pre class="mb-0"><code>${JSON.stringify(displayData, null, 2)}</code></pre>
          <hr>
          <p class="mb-0 small text-muted">
            <i class="bi bi-info-circle me-1"></i>
            File data is base64 encoded in the actual submission
          </p>
        </div>
      `;
      
      this.getApp().toast.success('Files uploaded successfully!');
    }
  }
  
  async onInit() {
    await super.onInit();
    
    // Create form with file and image fields
    this.fileForm = new FormView({
      fields: [
        {
          type: 'header',
          text: 'File Upload Fields',
          level: 5
        },
        {
          name: 'document',
          label: 'Upload Document',
          type: 'file',
          help: 'Select a file to upload (PDF, DOC, TXT)',
          accept: '.pdf,.doc,.docx,.txt'
        },
        {
          name: 'documents',
          label: 'Upload Multiple Documents',
          type: 'file',
          help: 'Select multiple files',
          multiple: true,
          accept: '.pdf,.doc,.docx,.txt,.xlsx'
        },
        {
          type: 'divider'
        },
        {
          type: 'header',
          text: 'Image Upload Fields',
          level: 5
        },
        {
          name: 'avatar',
          label: 'Profile Picture (Small)',
          type: 'image',
          help: 'Upload a profile picture (drag & drop or click)',
          accept: 'image/*',
          size: 'sm',
          preview: true
        },
        {
          name: 'cover_photo',
          label: 'Cover Photo (Large)',
          type: 'image',
          help: 'Upload a cover photo',
          accept: 'image/jpeg,image/png,image/gif',
          size: 'lg',
          preview: true
        },
        {
          type: 'button',
          label: 'Upload Files',
          action: 'submit-file-form',
          buttonClass: 'btn-primary',
          icon: 'bi-upload'
        }
      ]
    });
    
    this.addChild(this.fileForm, { containerId: 'file-form-container' });
  }
  
  getTemplate() {
    return `
      <div class="file-media-fields-page">
        <!-- Page Header -->
        <div class="mb-4">
          <h1 class="h2">
            <i class="bi bi-file-earmark me-2 text-primary"></i>
            File & Media Fields
          </h1>
          <p class="text-muted">
            Explore file upload and image fields with preview capabilities
          </p>
        </div>
        
        <!-- Quick Reference -->
        <div class="card mb-4">
          <div class="card-header">
            <h3 class="h5 mb-0">
              <i class="bi bi-table me-2"></i>
              File Types Quick Reference
            </h3>
          </div>
          <div class="card-body">
            <div class="table-responsive">
              <table class="table table-sm">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Use Case</th>
                    <th>Key Features</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>file</code></td>
                    <td>Any file upload</td>
                    <td>Multiple files, accept types, max size</td>
                  </tr>
                  <tr>
                    <td><code>image</code></td>
                    <td>Image upload with preview</td>
                    <td>Drag & drop, preview, remove button, size variants</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        <!-- Interactive Demo -->
        <div class="row">
          <div class="col-lg-6">
            <div class="card mb-4">
              <div class="card-header">
                <h3 class="h5 mb-0">
                  <i class="bi bi-cloud-upload me-2"></i>
                  Try File & Image Fields
                </h3>
              </div>
              <div class="card-body">
                <p class="text-muted mb-3">
                  Upload files and images to see the upload behavior and preview features.
                </p>
                <div id="file-form-container"></div>
              </div>
            </div>
          </div>
          
          <div class="col-lg-6">
            <div class="card mb-4">
              <div class="card-header">
                <h3 class="h5 mb-0">
                  <i class="bi bi-terminal me-2"></i>
                  Submitted Data
                </h3>
              </div>
              <div class="card-body">
                <div id="file-output" class="text-muted">
                  <em>Upload and submit files to see the data output here...</em>
                </div>
              </div>
            </div>
            
            <!-- Code Example -->
            <div class="card bg-dark text-light">
              <div class="card-header bg-dark border-secondary">
                <h5 class="h6 mb-0">
                  <i class="bi bi-code-slash me-2"></i>
                  Example Code
                </h5>
              </div>
              <div class="card-body bg-dark">
                <pre class="mb-0 bg-dark text-light"><code class="text-light" style="background: none; padding: 0;">const form = new FormView({
  fields: [
    {
      name: 'document',
      label: 'Upload Document',
      type: 'file',
      accept: '.pdf,.doc,.docx',
      help: 'PDF or Word document'
    },
    {
      name: 'documents',
      label: 'Multiple Files',
      type: 'file',
      multiple: true,
      accept: '.pdf,.xlsx,.txt'
    },
    {
      name: 'avatar',
      label: 'Profile Picture',
      type: 'image',
      accept: 'image/*',
      size: 'sm',
      preview: true
    },
    {
      name: 'cover',
      label: 'Cover Photo',
      type: 'image',
      accept: 'image/jpeg,image/png',
      size: 'lg',
      preview: true
    }
  ]
});</code></pre>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Field Tips -->
        <div class="row">
          <div class="col-md-6 mb-3">
            <div class="card h-100">
              <div class="card-body">
                <h4 class="h6">
                  <i class="bi bi-lightbulb text-warning me-2"></i>
                  File Field Tips
                </h4>
                <ul class="small mb-0">
                  <li>Use <code>accept</code> to limit file types</li>
                  <li>Set <code>multiple: true</code> for multiple files</li>
                  <li>Files are encoded as base64 by default</li>
                  <li>Use <code>maxSize</code> to limit file size</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div class="col-md-6 mb-3">
            <div class="card h-100">
              <div class="card-body">
                <h4 class="h6">
                  <i class="bi bi-lightbulb text-warning me-2"></i>
                  Image Field Tips
                </h4>
                <ul class="small mb-0">
                  <li>Supports drag & drop upload</li>
                  <li>Shows preview after upload</li>
                  <li>Use <code>size</code>: xs, sm, md, lg, xl</li>
                  <li>Remove button included by default</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div class="col-md-6 mb-3">
            <div class="card h-100">
              <div class="card-body">
                <h4 class="h6">
                  <i class="bi bi-lightbulb text-warning me-2"></i>
                  Accept Attribute Examples
                </h4>
                <ul class="small mb-0">
                  <li><code>image/*</code> - Any image</li>
                  <li><code>image/jpeg,image/png</code> - JPEG & PNG only</li>
                  <li><code>.pdf,.doc,.docx</code> - PDF and Word</li>
                  <li><code>video/*</code> - Any video</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div class="col-md-6 mb-3">
            <div class="card h-100">
              <div class="card-body">
                <h4 class="h6">
                  <i class="bi bi-lightbulb text-warning me-2"></i>
                  Image Size Options
                </h4>
                <ul class="small mb-0">
                  <li><code>xs</code> - 50x50 (icon size)</li>
                  <li><code>sm</code> - 100x100 (thumbnail)</li>
                  <li><code>md</code> - 200x200 (default)</li>
                  <li><code>lg</code> - 300x200 (large)</li>
                  <li><code>xl</code> - 400x300 (extra large)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Common Options -->
        <div class="card">
          <div class="card-header">
            <h3 class="h5 mb-0">
              <i class="bi bi-gear me-2"></i>
              Common Options for File & Image Fields
            </h3>
          </div>
          <div class="card-body">
            <div class="table-responsive">
              <table class="table table-sm">
                <thead>
                  <tr>
                    <th>Option</th>
                    <th>Type</th>
                    <th>Description</th>
                    <th>Example</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>accept</code></td>
                    <td>string</td>
                    <td>Allowed file types (MIME types or extensions)</td>
                    <td><code>accept: 'image/*'</code></td>
                  </tr>
                  <tr>
                    <td><code>multiple</code></td>
                    <td>boolean</td>
                    <td>Allow multiple file selection</td>
                    <td><code>multiple: true</code></td>
                  </tr>
                  <tr>
                    <td><code>maxSize</code></td>
                    <td>number</td>
                    <td>Maximum file size in bytes</td>
                    <td><code>maxSize: 5242880</code> (5MB)</td>
                  </tr>
                  <tr>
                    <td><code>size</code></td>
                    <td>string</td>
                    <td>Preview size (image only)</td>
                    <td><code>size: 'sm' | 'md' | 'lg'</code></td>
                  </tr>
                  <tr>
                    <td><code>preview</code></td>
                    <td>boolean</td>
                    <td>Show image preview (image only)</td>
                    <td><code>preview: true</code></td>
                  </tr>
                  <tr>
                    <td><code>required</code></td>
                    <td>boolean</td>
                    <td>Makes field mandatory</td>
                    <td><code>required: true</code></td>
                  </tr>
                  <tr>
                    <td><code>help</code></td>
                    <td>string</td>
                    <td>Help text below field</td>
                    <td><code>help: 'Max 5MB'</code></td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div class="alert alert-info mt-3 mb-0">
              <h5 class="alert-heading">
                <i class="bi bi-info-circle me-2"></i>
                File Upload Behavior
              </h5>
              <p class="mb-2">
                By default, MOJO forms encode uploaded files as base64 strings for submission:
              </p>
              <ul class="mb-2">
                <li><strong>Single file</strong> - Returns base64 string</li>
                <li><strong>Multiple files</strong> - Returns array of base64 strings</li>
                <li><strong>Image field</strong> - Returns base64 data URL (with MIME type)</li>
              </ul>
              <p class="mb-0">
                For multipart/form-data uploads, you can customize the form submission behavior
                using the FormView API.
              </p>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

export default FileMediaFieldsPage;
