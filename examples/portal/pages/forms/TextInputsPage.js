import { Page, FormView } from 'web-mojo';

/**
 * TextInputsPage - Demonstrates all text input field types
 * 
 * Shows 8 different text input types: text, email, password, tel, url, search, number, hex
 */
class TextInputsPage extends Page {
  static pageName = 'forms/text-inputs';
  static title = 'Text Inputs';
  static icon = 'bi-input-cursor-text';
  async onInit() {
    await super.onInit();
    
    // Create form with all text input types
    this.textInputsForm = new FormView({
      fields: [
        {
          name: 'text',
          label: 'Text',
          type: 'text',
          placeholder: 'Any text input',
          help: 'Standard text input for general purposes',
          value: 'Sample text'
        },
        {
          name: 'email',
          label: 'Email',
          type: 'email',
          placeholder: 'you@example.com',
          help: 'Validates email format on submission',
          required: true
        },
        {
          name: 'password',
          label: 'Password',
          type: 'password',
          placeholder: 'Enter password',
          help: 'Masked input for sensitive data',
          minlength: 8
        },
        {
          name: 'tel',
          label: 'Telephone',
          type: 'tel',
          placeholder: '(555) 123-4567',
          help: 'Phone number input',
          pattern: '\\(?\\d{3}\\)?[-.\\s]?\\d{3}[-.\\s]?\\d{4}'
        },
        {
          name: 'url',
          label: 'URL',
          type: 'url',
          placeholder: 'https://example.com',
          help: 'Validates URL format',
          pattern: 'https?://.+'
        },
        {
          name: 'search',
          label: 'Search',
          type: 'search',
          placeholder: 'Search...',
          help: 'Search input with clear button'
        },
        {
          name: 'number',
          label: 'Number',
          type: 'number',
          placeholder: '42',
          help: 'Numeric input with spinner controls',
          min: 0,
          max: 100,
          step: 1
        },
        {
          name: 'hex',
          label: 'Hexadecimal',
          type: 'hex',
          placeholder: '0x1A2B3C',
          help: 'Input for hexadecimal values',
          value: '0xFF'
        }
      ],
      submitLabel: 'Submit All Fields',
      onSubmit: async (data) => {
        console.log('Text inputs submitted:', data);
        
        // Show the submitted data
        const output = document.getElementById('output-display');
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
        
        return false; // Don't reset form
      }
    });
    
    this.addChild('textInputsForm', this.textInputsForm, '#text-inputs-form');
  }
  
  getTemplate() {
    return `
      <div class="text-inputs-page">
        <div class="mb-4">
          <h2 class="h3 mb-2">
            <i class="bi bi-input-cursor-text me-2 text-primary"></i>
            Text Input Types
          </h2>
          <p class="text-muted">
            MOJO supports 8 different text-based input types, each with specific validation and behavior
          </p>
        </div>
        
        <!-- Quick Reference Table -->
        <div class="card mb-4">
          <div class="card-header">
            <h3 class="h5 mb-0">
              <i class="bi bi-table me-2"></i>
              Input Types Quick Reference
            </h3>
          </div>
          <div class="card-body">
            <div class="table-responsive">
              <table class="table table-sm">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Purpose</th>
                    <th>Validation</th>
                    <th>Common Attributes</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>text</code></td>
                    <td>General text input</td>
                    <td>None (unless pattern specified)</td>
                    <td>minlength, maxlength, pattern</td>
                  </tr>
                  <tr>
                    <td><code>email</code></td>
                    <td>Email addresses</td>
                    <td>Valid email format</td>
                    <td>required, multiple</td>
                  </tr>
                  <tr>
                    <td><code>password</code></td>
                    <td>Passwords (masked)</td>
                    <td>None (unless pattern specified)</td>
                    <td>minlength, maxlength, required</td>
                  </tr>
                  <tr>
                    <td><code>tel</code></td>
                    <td>Phone numbers</td>
                    <td>Pattern-based</td>
                    <td>pattern, placeholder</td>
                  </tr>
                  <tr>
                    <td><code>url</code></td>
                    <td>Web URLs</td>
                    <td>Valid URL format</td>
                    <td>pattern, placeholder</td>
                  </tr>
                  <tr>
                    <td><code>search</code></td>
                    <td>Search queries</td>
                    <td>None</td>
                    <td>placeholder, autocomplete</td>
                  </tr>
                  <tr>
                    <td><code>number</code></td>
                    <td>Numeric values</td>
                    <td>Numeric only</td>
                    <td>min, max, step</td>
                  </tr>
                  <tr>
                    <td><code>hex</code></td>
                    <td>Hexadecimal values</td>
                    <td>Hex format (0x...)</td>
                    <td>placeholder</td>
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
                  Try All Input Types
                </h3>
              </div>
              <div class="card-body">
                <p class="text-muted mb-3">
                  Interact with each field type to see their behavior and validation in action.
                </p>
                <div id="text-inputs-form"></div>
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
                <div id="output-display" class="text-muted">
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
              <div class="card-body">
                <pre class="mb-0"><code class="language-javascript">const form = new FormView({
  fields: [
    {
      name: 'email',
      label: 'Email',
      type: 'email',
      required: true,
      placeholder: 'you@example.com'
    },
    {
      name: 'password',
      label: 'Password',
      type: 'password',
      minlength: 8,
      help: 'At least 8 characters'
    },
    {
      name: 'phone',
      label: 'Phone',
      type: 'tel',
      pattern: '\\d{3}-\\d{3}-\\d{4}',
      placeholder: '555-123-4567'
    },
    {
      name: 'website',
      label: 'Website',
      type: 'url',
      placeholder: 'https://example.com'
    },
    {
      name: 'age',
      label: 'Age',
      type: 'number',
      min: 18,
      max: 120
    }
  ],
  onSubmit: async (data) => {
    console.log(data);
    return true;
  }
});</code></pre>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Field-Specific Tips -->
        <div class="row">
          <div class="col-md-6 mb-3">
            <div class="card h-100">
              <div class="card-body">
                <h4 class="h6">
                  <i class="bi bi-lightbulb text-warning me-2"></i>
                  Email Field Tips
                </h4>
                <ul class="small mb-0">
                  <li>Automatically validates email format</li>
                  <li>Use <code>multiple</code> attribute for multiple emails</li>
                  <li>Mobile devices show @ key on keyboard</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div class="col-md-6 mb-3">
            <div class="card h-100">
              <div class="card-body">
                <h4 class="h6">
                  <i class="bi bi-lightbulb text-warning me-2"></i>
                  Number Field Tips
                </h4>
                <ul class="small mb-0">
                  <li>Use <code>step</code> for decimals (e.g., 0.01)</li>
                  <li>Set <code>min</code> and <code>max</code> for range</li>
                  <li>Mobile devices show numeric keyboard</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div class="col-md-6 mb-3">
            <div class="card h-100">
              <div class="card-body">
                <h4 class="h6">
                  <i class="bi bi-lightbulb text-warning me-2"></i>
                  Tel Field Tips
                </h4>
                <ul class="small mb-0">
                  <li>No built-in validation (use <code>pattern</code>)</li>
                  <li>Mobile devices show phone keyboard</li>
                  <li>Format example: <code>(\\d{3})\\s\\d{3}-\\d{4}</code></li>
                </ul>
              </div>
            </div>
          </div>
          
          <div class="col-md-6 mb-3">
            <div class="card h-100">
              <div class="card-body">
                <h4 class="h6">
                  <i class="bi bi-lightbulb text-warning me-2"></i>
                  Hex Field Tips
                </h4>
                <ul class="small mb-0">
                  <li>MOJO-specific field type</li>
                  <li>Automatically validates 0x prefix</li>
                  <li>Useful for color codes, memory addresses</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Common Attributes -->
        <div class="card">
          <div class="card-header">
            <h3 class="h5 mb-0">
              <i class="bi bi-gear me-2"></i>
              Common Attributes for All Text Inputs
            </h3>
          </div>
          <div class="card-body">
            <div class="table-responsive">
              <table class="table table-sm">
                <thead>
                  <tr>
                    <th>Attribute</th>
                    <th>Type</th>
                    <th>Description</th>
                    <th>Example</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>placeholder</code></td>
                    <td>string</td>
                    <td>Hint text shown when field is empty</td>
                    <td><code>placeholder: "Enter your name"</code></td>
                  </tr>
                  <tr>
                    <td><code>required</code></td>
                    <td>boolean</td>
                    <td>Makes the field mandatory</td>
                    <td><code>required: true</code></td>
                  </tr>
                  <tr>
                    <td><code>minlength</code></td>
                    <td>number</td>
                    <td>Minimum character length</td>
                    <td><code>minlength: 3</code></td>
                  </tr>
                  <tr>
                    <td><code>maxlength</code></td>
                    <td>number</td>
                    <td>Maximum character length</td>
                    <td><code>maxlength: 50</code></td>
                  </tr>
                  <tr>
                    <td><code>pattern</code></td>
                    <td>regex string</td>
                    <td>Custom validation pattern</td>
                    <td><code>pattern: "^[A-Za-z]+$"</code></td>
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
                    <td><code>autocomplete</code></td>
                    <td>string</td>
                    <td>Browser autocomplete hint</td>
                    <td><code>autocomplete: "email"</code></td>
                  </tr>
                  <tr>
                    <td><code>help</code></td>
                    <td>string</td>
                    <td>Help text below the field</td>
                    <td><code>help: "Must be unique"</code></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

export default TextInputsPage;
