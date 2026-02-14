import { Page, FormView } from 'web-mojo';

/**
 * StructuralFieldsPage - Demonstrates structural/non-input field types
 * 
 * Shows header, divider, html, button, and hidden field types
 */
class StructuralFieldsPage extends Page {
  static pageName = 'forms/structural-fields';
  
  constructor(options = {}) {
    super({
      title: 'Structural & Display Fields',
      icon: 'bi-layout-text-sidebar',
      pageDescription: 'Learn about non-input fields: headers, dividers, HTML, buttons, and hidden fields',
      ...options
    });
  }
  
  async onActionCustomAction(event, element) {
    this.getApp().toast.info('Custom button clicked!');
  }
  
  async onActionSubmitStructuralForm(event, element) {
    const isValid = await this.structuralForm.validate();
    if (isValid) {
      const data = await this.structuralForm.getFormData();
      console.log('Structural form submitted:', data);
      
      const output = document.getElementById('structural-output');
      output.innerHTML = `
        <div class="alert alert-success">
          <h5 class="alert-heading">
            <i class="bi bi-check-circle me-2"></i>
            Form Submitted!
          </h5>
          <p class="mb-2">Note: Hidden field is included in submission</p>
          <hr>
          <pre class="mb-0"><code>${JSON.stringify(data, null, 2)}</code></pre>
        </div>
      `;
      
      this.getApp().toast.success('Form submitted successfully!');
    }
  }
  
  async onInit() {
    await super.onInit();
    
    // Create form demonstrating structural fields
    this.structuralForm = new FormView({
      fields: [
        {
          type: 'header',
          text: 'Section 1: User Information',
          level: 4
        },
        {
          type: 'html',
          html: '<p class="text-muted small">Please provide your basic information below.</p>'
        },
        {
          name: 'username',
          label: 'Username',
          type: 'text',
          required: true
        },
        {
          name: 'email',
          label: 'Email',
          type: 'email',
          required: true
        },
        {
          type: 'divider'
        },
        {
          type: 'header',
          text: 'Section 2: Preferences',
          level: 4
        },
        {
          type: 'html',
          html: '<div class="alert alert-info mb-3"><i class="bi bi-info-circle me-2"></i>These settings can be changed later.</div>'
        },
        {
          name: 'notifications',
          label: 'Enable Email Notifications',
          type: 'toggle',
          checked: true
        },
        {
          name: 'newsletter',
          label: 'Subscribe to Newsletter',
          type: 'checkbox',
          checked: false
        },
        {
          type: 'divider'
        },
        {
          type: 'header',
          text: 'Hidden Fields',
          level: 4
        },
        {
          type: 'html',
          html: '<p class="text-muted small">The form below includes a hidden field (user_id) that will be submitted but not visible.</p>'
        },
        {
          name: 'user_id',
          type: 'hidden',
          value: '12345'
        },
        {
          name: 'timestamp',
          type: 'hidden',
          value: new Date().toISOString()
        },
        {
          type: 'divider'
        },
        {
          type: 'header',
          text: 'Custom Buttons',
          level: 4
        },
        {
          type: 'html',
          html: '<p class="text-muted small">You can add custom buttons with specific actions.</p>'
        },
        {
          type: 'button',
          label: 'Custom Action',
          action: 'custom-action',
          buttonClass: 'btn-info me-2',
          icon: 'bi-lightning'
        },
        {
          type: 'button',
          label: 'Submit Form',
          action: 'submit-structural-form',
          buttonClass: 'btn-primary',
          icon: 'bi-check-circle'
        }
      ]
    });
    
    this.addChild(this.structuralForm, { containerId: 'structural-form-container' });
  }
  
  getTemplate() {
    return `
      <div class="structural-fields-page">
        <!-- Page Header -->
        <div class="mb-4">
          <h1 class="h2">
            <i class="bi bi-layout-text-sidebar me-2 text-primary"></i>
            Structural & Display Fields
          </h1>
          <p class="text-muted">
            Learn about non-input fields: headers, dividers, HTML, buttons, and hidden fields
          </p>
        </div>
        
        <!-- Quick Reference -->
        <div class="card mb-4">
          <div class="card-header">
            <h3 class="h5 mb-0">
              <i class="bi bi-table me-2"></i>
              Structural Field Types
            </h3>
          </div>
          <div class="card-body">
            <div class="table-responsive">
              <table class="table table-sm">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Purpose</th>
                    <th>Key Options</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>header</code> / <code>heading</code></td>
                    <td>Section headers (H1-H6)</td>
                    <td><code>text</code>, <code>level</code> (1-6)</td>
                  </tr>
                  <tr>
                    <td><code>divider</code></td>
                    <td>Horizontal separator line</td>
                    <td><code>class</code> for styling</td>
                  </tr>
                  <tr>
                    <td><code>html</code></td>
                    <td>Custom HTML content</td>
                    <td><code>html</code> (raw HTML string)</td>
                  </tr>
                  <tr>
                    <td><code>button</code></td>
                    <td>Custom action button</td>
                    <td><code>label</code>, <code>action</code>, <code>buttonClass</code>, <code>icon</code></td>
                  </tr>
                  <tr>
                    <td><code>hidden</code></td>
                    <td>Hidden value (submitted but not visible)</td>
                    <td><code>name</code>, <code>value</code></td>
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
                  <i class="bi bi-ui-checks me-2"></i>
                  Try Structural Fields
                </h3>
              </div>
              <div class="card-body">
                <p class="text-muted mb-3">
                  This form demonstrates all structural field types in action.
                </p>
                <div id="structural-form-container"></div>
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
                <div id="structural-output" class="text-muted">
                  <em>Submit the form to see the data output (including hidden fields)...</em>
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
      type: 'header',
      text: 'User Information',
      level: 4
    },
    {
      type: 'html',
      html: '&lt;p class="text-muted"&gt;Instructions...&lt;/p&gt;'
    },
    {
      name: 'username',
      type: 'text',
      required: true
    },
    {
      type: 'divider'
    },
    {
      name: 'user_id',
      type: 'hidden',
      value: '12345'
    },
    {
      type: 'button',
      label: 'Save',
      action: 'save-form',
      buttonClass: 'btn-primary',
      icon: 'bi-check'
    }
  ]
});</code></pre>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Field Details -->
        <div class="row">
          <div class="col-md-6 mb-4">
            <div class="card h-100">
              <div class="card-header">
                <h4 class="h6 mb-0">
                  <i class="bi bi-type-h1 text-primary me-2"></i>
                  Header Field
                </h4>
              </div>
              <div class="card-body">
                <p class="small">Organize forms into sections with headers.</p>
                <ul class="small mb-0">
                  <li><code>text</code> - Header text</li>
                  <li><code>level</code> - 1-6 for H1-H6 (default: 3)</li>
                  <li><code>class</code> - Additional CSS classes</li>
                  <li>Use for visual organization</li>
                  <li>No data submission</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div class="col-md-6 mb-4">
            <div class="card h-100">
              <div class="card-header">
                <h4 class="h6 mb-0">
                  <i class="bi bi-dash-lg text-primary me-2"></i>
                  Divider Field
                </h4>
              </div>
              <div class="card-body">
                <p class="small">Add horizontal separators between sections.</p>
                <ul class="small mb-0">
                  <li><code>class</code> - Custom styling (optional)</li>
                  <li>Renders as <code>&lt;hr&gt;</code> element</li>
                  <li>No configuration needed</li>
                  <li>Visual separator only</li>
                  <li>No data submission</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div class="col-md-6 mb-4">
            <div class="card h-100">
              <div class="card-header">
                <h4 class="h6 mb-0">
                  <i class="bi bi-code-square text-primary me-2"></i>
                  HTML Field
                </h4>
              </div>
              <div class="card-body">
                <p class="small">Inject custom HTML for instructions, alerts, or formatting.</p>
                <ul class="small mb-0">
                  <li><code>html</code> - Raw HTML string</li>
                  <li>Full Bootstrap styling available</li>
                  <li>Use for alerts, instructions, images</li>
                  <li><strong>Warning:</strong> No sanitization!</li>
                  <li>No data submission</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div class="col-md-6 mb-4">
            <div class="card h-100">
              <div class="card-header">
                <h4 class="h6 mb-0">
                  <i class="bi bi-square text-primary me-2"></i>
                  Button Field
                </h4>
              </div>
              <div class="card-body">
                <p class="small">Add custom action buttons with specific behaviors.</p>
                <ul class="small mb-0">
                  <li><code>label</code> - Button text</li>
                  <li><code>action</code> - Action name (kebab-case)</li>
                  <li><code>buttonClass</code> - Bootstrap button classes</li>
                  <li><code>icon</code> - Bootstrap icon class</li>
                  <li>Triggers <code>onAction[CamelCase]</code> handler</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div class="col-md-6 mb-4">
            <div class="card h-100">
              <div class="card-header">
                <h4 class="h6 mb-0">
                  <i class="bi bi-eye-slash text-primary me-2"></i>
                  Hidden Field
                </h4>
              </div>
              <div class="card-body">
                <p class="small">Store values that should be submitted but not visible.</p>
                <ul class="small mb-0">
                  <li><code>name</code> - Field name (required)</li>
                  <li><code>value</code> - Field value</li>
                  <li>Not visible to user</li>
                  <li>Included in form submission</li>
                  <li>Perfect for IDs, timestamps, tokens</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Use Cases -->
        <div class="card">
          <div class="card-header">
            <h3 class="h5 mb-0">
              <i class="bi bi-lightbulb me-2"></i>
              Common Use Cases
            </h3>
          </div>
          <div class="card-body">
            <div class="row">
              <div class="col-md-6">
                <h5 class="h6">Multi-Section Forms</h5>
                <p class="small text-muted">Use headers and dividers to organize long forms:</p>
                <ul class="small">
                  <li>Personal Information (header)</li>
                  <li>Name, Email fields</li>
                  <li>Divider</li>
                  <li>Account Settings (header)</li>
                  <li>Password, Preferences fields</li>
                </ul>
              </div>
              
              <div class="col-md-6">
                <h5 class="h6">Instructions & Help</h5>
                <p class="small text-muted">Use HTML fields for rich instructions:</p>
                <ul class="small">
                  <li>Bootstrap alerts for warnings</li>
                  <li>Lists of requirements</li>
                  <li>Formatting examples</li>
                  <li>Help text with links</li>
                </ul>
              </div>
              
              <div class="col-md-6">
                <h5 class="h6">Hidden Metadata</h5>
                <p class="small text-muted">Use hidden fields for:</p>
                <ul class="small">
                  <li>User IDs</li>
                  <li>CSRF tokens</li>
                  <li>Timestamps</li>
                  <li>Version numbers</li>
                  <li>Original values (for comparison)</li>
                </ul>
              </div>
              
              <div class="col-md-6">
                <h5 class="h6">Custom Actions</h5>
                <p class="small text-muted">Use button fields for:</p>
                <ul class="small">
                  <li>Preview before submit</li>
                  <li>Save draft</li>
                  <li>Add dynamic fields</li>
                  <li>Clear form</li>
                  <li>Secondary actions</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

export default StructuralFieldsPage;
