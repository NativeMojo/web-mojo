import { Page, FormView } from 'web-mojo';

/**
 * ImageFieldPage - Demonstrates image field with preview
 * 
 * Shows the image field for file uploads with image preview functionality
 */
class ImageFieldPage extends Page {
  static pageName = 'forms/image-field';
  
  constructor(options = {}) {
    super({
      title: 'ImageField',
      icon: 'bi-image',
      pageDescription: 'Image upload with preview and validation',
      ...options
    });
  }
  
  async onActionSubmitImageForm(event, element) {
    event.preventDefault();
    
    const isValid = await this.imageForm.validate();
    if (isValid) {
      const data = await this.imageForm.getFormData();
      console.log('Image form submitted:', data);
      
      const output = document.getElementById('image-output');
      output.innerHTML = `
        <div class="alert alert-success">
          <h5 class="alert-heading">
            <i class="bi bi-check-circle me-2"></i>
            Form Submitted!
          </h5>
          <hr>
          <p class="mb-2"><strong>Note:</strong> Image files are shown as File objects in the data.</p>
          <pre class="mb-0"><code>${JSON.stringify({
            ...data,
            profile_photo: data.profile_photo ? `File: ${data.profile_photo.name}` : null,
            product_image: data.product_image ? `File: ${data.product_image.name}` : null
          }, null, 2)}</code></pre>
        </div>
      `;
      
      this.getApp().toast.success('Form submitted successfully!');
    }
  }
  
  async onInit() {
    await super.onInit();
    
    // Create form with image fields
    this.imageForm = new FormView({
      fields: [
        {
          type: 'image',
          name: 'profile_photo',
          label: 'Profile Photo',
          required: true,
          help: 'Upload a profile picture (JPEG, PNG, or GIF)',
          accept: 'image/*'
        },
        {
          type: 'image',
          name: 'product_image',
          label: 'Product Image',
          help: 'Optional product image',
          accept: 'image/jpeg,image/png'
        },
        {
          type: 'image',
          name: 'cover_photo',
          label: 'Cover Photo',
          help: 'Large banner or cover image',
          accept: 'image/*'
        },
        {
          type: 'divider'
        },
        {
          type: 'button',
          label: 'Submit',
          action: 'submit-image-form',
          buttonClass: 'btn-primary',
          icon: 'bi-check2'
        }
      ]
    });
    
    this.addChild(this.imageForm, { containerId: 'image-form-container' });
  }
  
  getTemplate() {
    return `
      <div class="image-field-page">
        <div class="mb-4">
          <h1 class="h2">
            <i class="bi bi-image me-2 text-primary"></i>
            ImageField
          </h1>
          <p class="text-muted">
            Image upload with instant preview and file validation
          </p>
        </div>
        
        <div class="alert alert-info mb-4">
          <h6 class="alert-heading"><i class="bi bi-info-circle me-2"></i>About ImageField</h6>
          <p class="mb-0">The <code>image</code> field provides a specialized file input for images with instant preview, drag-and-drop support, and image-specific validation.</p>
        </div>
        
        <div class="row">
          <div class="col-lg-6">
            <div class="card mb-4">
              <div class="card-header">
                <h3 class="h5 mb-0">
                  <i class="bi bi-pencil-square me-2"></i>
                  Try It Out
                </h3>
              </div>
              <div class="card-body">
                <div id="image-form-container"></div>
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
                <div id="image-output" class="text-muted">
                  <em>Submit the form to see the data output here...</em>
                </div>
              </div>
            </div>
            
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
      type: 'image',
      name: 'profile_photo',
      label: 'Profile Photo',
      required: true,
      accept: 'image/*',
      help: 'Upload a profile picture'
    }
  ]
});</code></pre>
              </div>
            </div>
          </div>
        </div>
        
        <div class="card mb-4">
          <div class="card-header">
            <h3 class="h5 mb-0">
              <i class="bi bi-info-circle me-2"></i>
              Key Features
            </h3>
          </div>
          <div class="card-body">
            <ul>
              <li>Instant image preview after selection</li>
              <li>Drag-and-drop file upload</li>
              <li>Click to browse for files</li>
              <li>File type validation (accepts only images)</li>
              <li>Image-optimized UI with thumbnail preview</li>
              <li>Clear/remove selected image option</li>
              <li>Shows file name and size</li>
            </ul>
            
            <h6 class="mt-3">When to Use</h6>
            <ul>
              <li>Profile photos and avatars</li>
              <li>Product images in e-commerce</li>
              <li>Cover photos and banners</li>
              <li>Gallery uploads</li>
              <li>Any form requiring image uploads</li>
            </ul>
          </div>
        </div>
        
        <div class="card mb-4">
          <div class="card-header">
            <h3 class="h5 mb-0">
              <i class="bi bi-gear me-2"></i>
              Configuration Options
            </h3>
          </div>
          <div class="card-body">
            <h6>Accept Attribute</h6>
            <p>Control which file types are allowed:</p>
            <pre class="bg-light p-2 rounded"><code>accept: 'image/*'                    // All image types
accept: 'image/jpeg,image/png'        // Only JPEG and PNG
accept: 'image/jpeg,image/png,image/gif' // JPEG, PNG, and GIF</code></pre>
            
            <h6 class="mt-3">Common Properties</h6>
            <ul>
              <li><code>required</code> - Make image upload mandatory</li>
              <li><code>accept</code> - Specify allowed file types</li>
              <li><code>help</code> - Instructions or guidelines</li>
              <li><code>label</code> - Field label text</li>
            </ul>
          </div>
        </div>
        
        <div class="card mb-4">
          <div class="card-header">
            <h3 class="h5 mb-0">
              <i class="bi bi-cloud-upload me-2"></i>
              Uploading to Server
            </h3>
          </div>
          <div class="card-body">
            <p>When submitting forms with images, use <code>FormData</code> for proper file upload:</p>
            <pre class="bg-light p-3 rounded"><code>// Get form data
const data = await form.getFormData();

// Create FormData for file upload
const formData = new FormData();
formData.append('profile_photo', data.profile_photo);
formData.append('name', data.name);

// Submit to server
const response = await fetch('/api/profile', {
  method: 'POST',
  body: formData  // Don't set Content-Type header
});

// OR use MOJO Model's save() which handles it automatically
profileModel.set(data);
await profileModel.save(); // Automatically uses FormData</code></pre>
          </div>
        </div>
        
        <div class="card mb-4 border-primary">
          <div class="card-header bg-primary text-white">
            <h3 class="h5 mb-0">
              <i class="bi bi-lightbulb me-2"></i>
              Pro Tips
            </h3>
          </div>
          <div class="card-body">
            <h6>Client-Side Image Validation</h6>
            <ul>
              <li>Add <code>accept</code> attribute to restrict file types in the file picker</li>
              <li>Browser validates file type automatically</li>
              <li>Always validate on server-side as well for security</li>
            </ul>
            
            <h6 class="mt-3">Image vs. File Field</h6>
            <p><strong>Use image field:</strong> When you need image preview and image-specific UI</p>
            <p><strong>Use file field:</strong> For general file uploads (PDFs, documents, etc.)</p>
            
            <h6 class="mt-3">Multiple Images</h6>
            <p>For uploading multiple images at once, you can add <code>multiple: true</code> to allow selecting multiple files, or use separate image fields for different purposes (profile, cover, gallery, etc.).</p>
          </div>
        </div>
      </div>
    `;
  }
}

export default ImageFieldPage;
