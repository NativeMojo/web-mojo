import { Page, FormView } from 'web-mojo';

/**
 * ValidationPage - Demonstrates form validation features
 * 
 * Shows HTML5 validation, custom validators, and validation patterns
 */
class ValidationPage extends Page {
  static pageName = 'forms/validation';
  
  constructor(options = {}) {
    super({
      title: 'Form Validation',
      icon: 'bi-shield-check',
      pageDescription: 'Learn about HTML5 validation, custom validators, and validation patterns',
      ...options
    });
  }
  
  async onActionSubmitValidationForm(event, element) {
    const isValid = await this.validationForm.validate();
    if (isValid) {
      const data = await this.validationForm.getFormData();
      console.log('Validation form submitted:', data);
      
      const output = document.getElementById('validation-output');
      output.innerHTML = `
        <div class="alert alert-success">
          <h5 class="alert-heading">
            <i class="bi bi-check-circle me-2"></i>
            Validation Passed!
          </h5>
          <p class="mb-2">All fields are valid. Form submitted successfully.</p>
          <hr>
          <pre class="mb-0"><code>${JSON.stringify(data, null, 2)}</code></pre>
        </div>
      `;
      
      this.getApp().toast.success('Form validation passed!');
    } else {
      const output = document.getElementById('validation-output');
      output.innerHTML = `
        <div class="alert alert-danger">
          <h5 class="alert-heading">
            <i class="bi bi-x-circle me-2"></i>
            Validation Failed
          </h5>
          <p class="mb-0">Please fix the errors above and try again.</p>
        </div>
      `;
      
      this.getApp().toast.error('Please fix validation errors');
    }
  }
  
  async onInit() {
    await super.onInit();
    
    // Create form demonstrating validation features
    this.validationForm = new FormView({
      fields: [
        {
          type: 'header',
          text: 'Required Fields',
          level: 5
        },
        {
          name: 'username',
          label: 'Username',
          type: 'text',
          required: true,
          help: 'This field is required'
        },
        {
          name: 'email',
          label: 'Email Address',
          type: 'email',
          required: true,
          help: 'Valid email required'
        },
        {
          type: 'divider'
        },
        {
          type: 'header',
          text: 'Length Validation',
          level: 5
        },
        {
          name: 'password',
          label: 'Password',
          type: 'password',
          required: true,
          minlength: 8,
          maxlength: 20,
          help: 'Must be 8-20 characters'
        },
        {
          name: 'bio',
          label: 'Bio',
          type: 'textarea',
          maxlength: 200,
          rows: 3,
          help: 'Maximum 200 characters'
        },
        {
          type: 'divider'
        },
        {
          type: 'header',
          text: 'Pattern Validation',
          level: 5
        },
        {
          name: 'phone',
          label: 'Phone Number',
          type: 'tel',
          required: true,
          pattern: '\\d{3}-\\d{3}-\\d{4}',
          placeholder: '555-123-4567',
          help: 'Format: XXX-XXX-XXXX'
        },
        {
          name: 'zip_code',
          label: 'ZIP Code',
          type: 'text',
          pattern: '\\d{5}',
          placeholder: '12345',
          help: '5-digit US ZIP code'
        },
        {
          type: 'divider'
        },
        {
          type: 'header',
          text: 'Numeric Validation',
          level: 5
        },
        {
          name: 'age',
          label: 'Age',
          type: 'number',
          required: true,
          min: 18,
          max: 120,
          help: 'Must be between 18 and 120'
        },
        {
          name: 'quantity',
          label: 'Quantity',
          type: 'number',
          min: 1,
          max: 100,
          step: 1,
          value: 1,
          help: 'Between 1 and 100'
        },
        {
          type: 'divider'
        },
        {
          type: 'header',
          text: 'Date Validation',
          level: 5
        },
        {
          name: 'start_date',
          label: 'Start Date',
          type: 'date',
          required: true,
          min: new Date().toISOString().split('T')[0],
          help: 'Must be today or later'
        },
        {
          type: 'button',
          label: 'Validate & Submit',
          action: 'submit-validation-form',
          buttonClass: 'btn-primary',
          icon: 'bi-shield-check'
        }
      ]
    });
    
    this.addChild(this.validationForm, { containerId: 'validation-form-container' });
  }
  
  getTemplate() {
    return `
      <div class="validation-page">
        <!-- Page Header -->
        <div class="mb-4">
          <h1 class="h2">
            <i class="bi bi-shield-check me-2 text-primary"></i>
            Form Validation
          </h1>
          <p class="text-muted">
            Learn about HTML5 validation, custom validators, and validation patterns
          </p>
        </div>
        
        <!-- Validation Types Overview -->
        <div class="card mb-4">
          <div class="card-header">
            <h3 class="h5 mb-0">
              <i class="bi bi-list-check me-2"></i>
              Validation Types
            </h3>
          </div>
          <div class="card-body">
            <div class="table-responsive">
              <table class="table table-sm">
                <thead>
                  <tr>
                    <th>Validation Type</th>
                    <th>Attribute</th>
                    <th>Example</th>
                    <th>Error Message</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Required</td>
                    <td><code>required: true</code></td>
                    <td>Any field</td>
                    <td>"This field is required"</td>
                  </tr>
                  <tr>
                    <td>Email Format</td>
                    <td><code>type: 'email'</code></td>
                    <td>Email addresses</td>
                    <td>"Please enter a valid email"</td>
                  </tr>
                  <tr>
                    <td>URL Format</td>
                    <td><code>type: 'url'</code></td>
                    <td>Website URLs</td>
                    <td>"Please enter a valid URL"</td>
                  </tr>
                  <tr>
                    <td>Min Length</td>
                    <td><code>minlength: 8</code></td>
                    <td>Passwords, text</td>
                    <td>"Must be at least 8 characters"</td>
                  </tr>
                  <tr>
                    <td>Max Length</td>
                    <td><code>maxlength: 100</code></td>
                    <td>Text, textarea</td>
                    <td>"Must be 100 characters or less"</td>
                  </tr>
                  <tr>
                    <td>Pattern</td>
                    <td><code>pattern: '\\d{3}-\\d{4}'</code></td>
                    <td>Phone, ZIP, custom</td>
                    <td>"Please match the requested format"</td>
                  </tr>
                  <tr>
                    <td>Min Value</td>
                    <td><code>min: 18</code></td>
                    <td>Numbers, dates</td>
                    <td>"Must be at least 18"</td>
                  </tr>
                  <tr>
                    <td>Max Value</td>
                    <td><code>max: 100</code></td>
                    <td>Numbers, dates</td>
                    <td>"Must be 100 or less"</td>
                  </tr>
                  <tr>
                    <td>Step</td>
                    <td><code>step: 0.01</code></td>
                    <td>Numbers (decimals)</td>
                    <td>"Please enter a valid value"</td>
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
                  Try Form Validation
                </h3>
              </div>
              <div class="card-body">
                <p class="text-muted mb-3">
                  Try submitting with invalid data to see validation in action.
                </p>
                <div id="validation-form-container"></div>
              </div>
            </div>
          </div>
          
          <div class="col-lg-6">
            <div class="card mb-4">
              <div class="card-header">
                <h3 class="h5 mb-0">
                  <i class="bi bi-terminal me-2"></i>
                  Validation Result
                </h3>
              </div>
              <div class="card-body">
                <div id="validation-output" class="text-muted">
                  <em>Submit the form to see validation results here...</em>
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
      name: 'username',
      type: 'text',
      required: true,
      minlength: 3,
      maxlength: 20
    },
    {
      name: 'email',
      type: 'email',
      required: true
    },
    {
      name: 'password',
      type: 'password',
      required: true,
      minlength: 8,
      pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)'
    },
    {
      name: 'phone',
      type: 'tel',
      pattern: '\\d{3}-\\d{3}-\\d{4}',
      placeholder: '555-123-4567'
    },
    {
      name: 'age',
      type: 'number',
      min: 18,
      max: 120
    }
  ]
});

// Validate programmatically
const isValid = await form.validate();
if (isValid) {
  const data = await form.getFormData();
  // Submit data
}</code></pre>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Common Patterns -->
        <div class="card mb-4">
          <div class="card-header">
            <h3 class="h5 mb-0">
              <i class="bi bi-regex me-2"></i>
              Common Validation Patterns
            </h3>
          </div>
          <div class="card-body">
            <div class="table-responsive">
              <table class="table table-sm">
                <thead>
                  <tr>
                    <th>Use Case</th>
                    <th>Pattern</th>
                    <th>Example Match</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>US Phone</td>
                    <td><code>\\d{3}-\\d{3}-\\d{4}</code></td>
                    <td>555-123-4567</td>
                  </tr>
                  <tr>
                    <td>US ZIP</td>
                    <td><code>\\d{5}</code></td>
                    <td>12345</td>
                  </tr>
                  <tr>
                    <td>ZIP+4</td>
                    <td><code>\\d{5}(-\\d{4})?</code></td>
                    <td>12345 or 12345-6789</td>
                  </tr>
                  <tr>
                    <td>Alphanumeric</td>
                    <td><code>^[a-zA-Z0-9]+$</code></td>
                    <td>user123</td>
                  </tr>
                  <tr>
                    <td>Username</td>
                    <td><code>^[a-zA-Z0-9_]{3,20}$</code></td>
                    <td>john_doe</td>
                  </tr>
                  <tr>
                    <td>Strong Password</td>
                    <td><code>^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$</code></td>
                    <td>Abc123xyz</td>
                  </tr>
                  <tr>
                    <td>URL Slug</td>
                    <td><code>^[a-z0-9-]+$</code></td>
                    <td>my-blog-post</td>
                  </tr>
                  <tr>
                    <td>Hex Color</td>
                    <td><code>^#?[0-9A-Fa-f]{6}$</code></td>
                    <td>#FF5733</td>
                  </tr>
                  <tr>
                    <td>Credit Card</td>
                    <td><code>\\d{4}-\\d{4}-\\d{4}-\\d{4}</code></td>
                    <td>1234-5678-9012-3456</td>
                  </tr>
                  <tr>
                    <td>SSN</td>
                    <td><code>\\d{3}-\\d{2}-\\d{4}</code></td>
                    <td>123-45-6789</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        <!-- Validation Tips -->
        <div class="row">
          <div class="col-md-6 mb-3">
            <div class="card h-100">
              <div class="card-body">
                <h4 class="h6">
                  <i class="bi bi-lightbulb text-warning me-2"></i>
                  Validation Best Practices
                </h4>
                <ul class="small mb-0">
                  <li>Always validate on server-side too</li>
                  <li>Provide clear, helpful error messages</li>
                  <li>Use <code>help</code> text to explain format</li>
                  <li>Show examples in placeholders</li>
                  <li>Validate as user types (debounced)</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div class="col-md-6 mb-3">
            <div class="card h-100">
              <div class="card-body">
                <h4 class="h6">
                  <i class="bi bi-lightbulb text-warning me-2"></i>
                  Pattern Tips
                </h4>
                <ul class="small mb-0">
                  <li>Escape special regex characters: <code>\\d</code>, <code>\\.</code></li>
                  <li>Use <code>^</code> and <code>$</code> for exact match</li>
                  <li>Test patterns with online regex tools</li>
                  <li>Keep patterns simple when possible</li>
                  <li>Document complex patterns</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div class="col-md-6 mb-3">
            <div class="card h-100">
              <div class="card-body">
                <h4 class="h6">
                  <i class="bi bi-lightbulb text-warning me-2"></i>
                  Error Message Customization
                </h4>
                <ul class="small mb-0">
                  <li>Use <code>help</code> for format guidance</li>
                  <li>Browser shows default validation messages</li>
                  <li>Custom validators for complex rules</li>
                  <li>Use <code>setCustomValidity()</code> for custom messages</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div class="col-md-6 mb-3">
            <div class="card h-100">
              <div class="card-body">
                <h4 class="h6">
                  <i class="bi bi-lightbulb text-warning me-2"></i>
                  Programmatic Validation
                </h4>
                <ul class="small mb-0">
                  <li><code>await form.validate()</code> - Validate all fields</li>
                  <li><code>form.getFormData()</code> - Get validated data</li>
                  <li><code>form.reset()</code> - Reset form and clear errors</li>
                  <li><code>form.setFieldValue()</code> - Set field value</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Validation Flow -->
        <div class="card">
          <div class="card-header">
            <h3 class="h5 mb-0">
              <i class="bi bi-diagram-3 me-2"></i>
              Validation Flow
            </h3>
          </div>
          <div class="card-body">
            <div class="alert alert-light mb-0">
              <h5 class="fw-bold">How Validation Works</h5>
              <ol class="mb-2">
                <li><strong>User submits form</strong> - Click submit button or press Enter</li>
                <li><strong>HTML5 validation</strong> - Browser checks required, pattern, min/max, etc.</li>
                <li><strong>Custom validators</strong> - Run any custom validation logic (if defined)</li>
                <li><strong>Display errors</strong> - Show validation errors near invalid fields</li>
                <li><strong>Focus first error</strong> - Browser focuses first invalid field</li>
                <li><strong>Prevent submission</strong> - Form won't submit until all errors fixed</li>
                <li><strong>Success callback</strong> - If valid, <code>onSubmit</code> handler runs</li>
              </ol>
              <p class="mb-0 text-muted small">
                <i class="bi bi-info-circle me-1"></i>
                Validation happens automatically when user submits. You can also validate
                programmatically using <code>await form.validate()</code>.
              </p>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

export default ValidationPage;
