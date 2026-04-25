import { Page, FormView } from 'web-mojo';

/**
 * TextareaFieldsPage - Demonstrates multi-line text field types
 * 
 * Shows textarea, json, and htmlpreview field types
 */
class TextareaFieldsPage extends Page {
  static pageName = 'forms/textarea-fields';
  
  constructor(options = {}) {
    super({
      title: 'Multi-line Text Fields',
      icon: 'bi-textarea-t',
      pageDescription: 'Explore multi-line text fields: textarea, JSON editor, and HTML preview',
      ...options
    });
  }
  
  async onActionSubmitTextareaForm(event, element) {
    const isValid = await this.textareaForm.validate();
    if (isValid) {
      const data = await this.textareaForm.getFormData();
      console.log('Textarea form submitted:', data);
      
      // Show the submitted data
      const output = document.getElementById('textarea-output');
      output.innerHTML = `
        <div class="alert alert-success">
          <h5 class="alert-heading">
            <i class="bi bi-check-circle me-2"></i>
            Form Submitted Successfully!
          </h5>
          <hr>
          <pre class="mb-0"><code>${JSON.stringify(data, null, 2)}</code></pre>
        </div>
      `;
      
      this.getApp().toast.success('Form submitted successfully!');
    }
  }
  
  async onInit() {
    await super.onInit();
    
    // Create form with all textarea-based field types
    this.textareaForm = new FormView({
      fields: [
        {
          type: 'header',
          text: 'Basic Textarea',
          level: 5
        },
        {
          name: 'bio',
          label: 'Bio',
          type: 'textarea',
          required: true,
          rows: 4,
          placeholder: 'Tell us about yourself...',
          help: 'Basic multi-line text input',
          maxlength: 500
        },
        {
          name: 'comments',
          label: 'Comments',
          type: 'textarea',
          rows: 6,
          placeholder: 'Enter your comments here...',
          help: 'Larger textarea with more rows'
        },
        {
          type: 'divider'
        },
        {
          type: 'header',
          text: 'JSON Editor',
          level: 5
        },
        {
          name: 'config',
          label: 'Configuration (JSON)',
          type: 'json',
          help: 'Auto-formatting JSON editor with validation',
          value: JSON.stringify({
            apiKey: 'your-api-key',
            timeout: 5000,
            retries: 3,
            endpoints: {
              api: 'https://api.example.com',
              cdn: 'https://cdn.example.com'
            }
          }, null, 2),
          rows: 8
        },
        {
          type: 'divider'
        },
        {
          type: 'header',
          text: 'HTML Preview',
          level: 5
        },
        {
          name: 'html_content',
          label: 'HTML Content (with Copy & Preview)',
          type: 'htmlpreview',
          help: 'HTML editor with live preview dialog and copy button',
          value: '<h2>Welcome</h2>\n<p>This is a <strong>sample</strong> HTML content.</p>\n<ul>\n  <li>Item 1</li>\n  <li>Item 2</li>\n</ul>',
          rows: 8,
          showCopy: true
        },
        {
          type: 'divider'
        },
        {
          type: 'header',
          text: 'Copy Button Example',
          level: 5
        },
        {
          name: 'code_snippet',
          label: 'Code Snippet (with Copy Button)',
          type: 'textarea',
          rows: 6,
          readonly: true,
          showCopy: true,
          value: 'const form = new FormView({\n  fields: [\n    { name: \'username\', type: \'text\', required: true },\n    { name: \'email\', type: \'email\', required: true }\n  ]\n});',
          help: 'Click the copy button in the top-right to copy this code'
        },
        {
          type: 'button',
          label: 'Submit Form',
          action: 'submit-textarea-form',
          buttonClass: 'btn-primary',
          icon: 'bi-check-circle'
        }
      ]
    });
    
    this.addChild(this.textareaForm, { containerId: 'textarea-form-container' });
  }
  
  getTemplate() {
    return `
      <div class="textarea-fields-page">
        <!-- Page Header -->
        <div class="mb-4">
          <h1 class="h2">
            <i class="bi bi-textarea-t me-2 text-primary"></i>
            Multi-line Text Fields
          </h1>
          <p class="text-muted">
            Explore multi-line text fields: textarea, JSON editor, and HTML preview
          </p>
        </div>
        
        <!-- Quick Reference -->
        <div class="card mb-4">
          <div class="card-header">
            <h3 class="h5 mb-0">
              <i class="bi bi-table me-2"></i>
              Multi-line Field Types
            </h3>
          </div>
          <div class="card-body">
            <div class="table-responsive">
              <table class="table table-sm">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Purpose</th>
                    <th>Key Features</th>
                    <th>Common Use Cases</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>textarea</code></td>
                    <td>Basic multi-line text</td>
                    <td>Rows, cols, maxlength, character count</td>
                    <td>Comments, descriptions, bio, messages</td>
                  </tr>
                  <tr>
                    <td><code>json</code></td>
                    <td>JSON editor with validation</td>
                    <td>Auto-formatting, syntax validation, parse errors</td>
                    <td>Configuration, API payloads, metadata</td>
                  </tr>
                  <tr>
                    <td><code>htmlpreview</code></td>
                    <td>HTML editor with preview</td>
                    <td>Live preview dialog, syntax highlighting</td>
                    <td>Email templates, rich content, HTML snippets</td>
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
                  <i class="bi bi-pencil-square me-2"></i>
                  Try Multi-line Fields
                </h3>
              </div>
              <div class="card-body">
                <p class="text-muted mb-3">
                  Interact with each multi-line field type to see their behavior.
                </p>
                <div id="textarea-form-container"></div>
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
                <div id="textarea-output" class="text-muted">
                  <em>Submit the form to see the data output here...</em>
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
      name: 'bio',
      label: 'Bio',
      type: 'textarea',
      rows: 4,
      maxlength: 500,
      placeholder: 'Tell us about yourself...'
    },
    {
      name: 'config',
      label: 'Configuration',
      type: 'json',
      rows: 8,
      value: JSON.stringify({
        apiKey: 'your-key',
        timeout: 5000
      }, null, 2)
    },
    {
      name: 'email_template',
      label: 'Email Template',
      type: 'htmlpreview',
      rows: 10,
      value: '&lt;h1&gt;Welcome&lt;/h1&gt;&lt;p&gt;...&lt;/p&gt;'
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
                  Textarea Tips
                </h4>
                <ul class="small mb-0">
                  <li>Use <code>rows</code> to set visible height (default: 3)</li>
                  <li>Set <code>maxlength</code> to limit character count</li>
                  <li><code>cols</code> is rarely needed (use CSS width)</li>
                  <li>Supports all text validation (pattern, required, etc.)</li>
                  <li>Auto-resizes on mobile devices</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div class="col-md-6 mb-3">
            <div class="card h-100">
              <div class="card-body">
                <h4 class="h6">
                  <i class="bi bi-lightbulb text-warning me-2"></i>
                  JSON Field Tips
                </h4>
                <ul class="small mb-0">
                  <li>Automatically validates JSON syntax</li>
                  <li>Shows parse errors inline</li>
                  <li>Auto-formats on blur (prettifies JSON)</li>
                  <li>Value is parsed object, not string</li>
                  <li>Great for API configuration</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div class="col-md-6 mb-3">
            <div class="card h-100">
              <div class="card-body">
                <h4 class="h6">
                  <i class="bi bi-lightbulb text-warning me-2"></i>
                  HTML Preview Tips
                </h4>
                <ul class="small mb-0">
                  <li>Click preview icon to see rendered HTML</li>
                  <li>Opens modal dialog with live preview</li>
                  <li>Useful for email templates</li>
                  <li>Stores raw HTML string</li>
                  <li>No HTML sanitization (be careful!)</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div class="col-md-6 mb-3">
            <div class="card h-100">
              <div class="card-body">
                <h4 class="h6">
                  <i class="bi bi-lightbulb text-warning me-2"></i>
                  When to Use Each
                </h4>
                <ul class="small mb-0">
                  <li><strong>textarea</strong> - Comments, notes, descriptions</li>
                  <li><strong>json</strong> - API configs, structured data, metadata</li>
                  <li><strong>htmlpreview</strong> - Email templates, rich content</li>
                  <li>All support <code>required</code> validation</li>
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
              Common Options for Multi-line Fields
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
                    <td><code>rows</code></td>
                    <td>number</td>
                    <td>Number of visible text rows</td>
                    <td><code>rows: 4</code></td>
                  </tr>
                  <tr>
                    <td><code>cols</code></td>
                    <td>number</td>
                    <td>Number of visible columns (width)</td>
                    <td><code>cols: 50</code></td>
                  </tr>
                  <tr>
                    <td><code>maxlength</code></td>
                    <td>number</td>
                    <td>Maximum character length</td>
                    <td><code>maxlength: 500</code></td>
                  </tr>
                  <tr>
                    <td><code>placeholder</code></td>
                    <td>string</td>
                    <td>Hint text when empty</td>
                    <td><code>placeholder: "Enter text..."</code></td>
                  </tr>
                  <tr>
                    <td><code>value</code></td>
                    <td>string</td>
                    <td>Initial/default value</td>
                    <td><code>value: "Default text"</code></td>
                  </tr>
                  <tr>
                    <td><code>required</code></td>
                    <td>boolean</td>
                    <td>Makes field mandatory</td>
                    <td><code>required: true</code></td>
                  </tr>
                  <tr>
                    <td><code>readonly</code></td>
                    <td>boolean</td>
                    <td>Makes field read-only</td>
                    <td><code>readonly: true</code></td>
                  </tr>
                  <tr>
                    <td><code>disabled</code></td>
                    <td>boolean</td>
                    <td>Disables the field</td>
                    <td><code>disabled: true</code></td>
                  </tr>
                  <tr>
                    <td><code>help</code></td>
                    <td>string</td>
                    <td>Help text below field</td>
                    <td><code>help: "Max 500 characters"</code></td>
                  </tr>
                  <tr>
                    <td><code>showCopy</code></td>
                    <td>boolean</td>
                    <td>Show copy-to-clipboard button</td>
                    <td><code>showCopy: true</code></td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div class="alert alert-info mt-3 mb-0">
              <h5 class="alert-heading">
                <i class="bi bi-info-circle me-2"></i>
                Data Format Notes
              </h5>
              <ul class="mb-0">
                <li><strong>textarea</strong> - Returns plain string</li>
                <li><strong>json</strong> - Returns parsed JavaScript object (not string!)</li>
                <li><strong>htmlpreview</strong> - Returns HTML string</li>
                <li>All fields support newlines and preserve formatting</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

export default TextareaFieldsPage;
