import { Page, FormView } from 'web-mojo';

/**
 * OtherInputsPage - Demonstrates specialized input types
 * 
 * Shows color picker and range (slider) input types
 */
class OtherInputsPage extends Page {
  static pageName = 'forms/other-inputs';
  
  constructor(options = {}) {
    super({
      title: 'Other Input Fields',
      icon: 'bi-palette',
      pageDescription: 'Color picker and range slider input types',
      ...options
    });
  }
  
  async onActionSubmitOtherInputs(event, element) {
    event.preventDefault();
    
    const isValid = await this.otherInputsForm.validate();
    if (isValid) {
      const data = await this.otherInputsForm.getFormData();
      console.log('Other inputs submitted:', data);
      
      // Show the submitted data
      const output = document.getElementById('output-display');
      output.innerHTML = `
        <div class="alert alert-success">
          <h5 class="alert-heading">
            <i class="bi bi-check-circle me-2"></i>
            Settings Applied Successfully!
          </h5>
          <hr>
          <pre class="mb-0"><code>${JSON.stringify(data, null, 2)}</code></pre>
        </div>
      `;
      
      this.getApp().toast.success('Settings applied successfully!');
    }
  }
  
  async onInit() {
    await super.onInit();
    
    // Create form with color and range inputs
    this.otherInputsForm = new FormView({
      fields: [
        {
          type: 'header',
          text: 'Color Inputs',
          level: 5
        },
        {
          name: 'theme_color',
          label: 'Primary Theme Color',
          type: 'color',
          value: '#0d6efd',
          help: 'Select your primary theme color'
        },
        {
          name: 'accent_color',
          label: 'Accent Color',
          type: 'color',
          value: '#198754',
          help: 'Choose an accent color for highlights'
        },
        {
          name: 'background_color',
          label: 'Background Color',
          type: 'color',
          value: '#f8f9fa',
          help: 'Set the background color'
        },
        {
          type: 'divider'
        },
        {
          type: 'header',
          text: 'Range/Slider Inputs',
          level: 5
        },
        {
          name: 'brightness',
          label: 'Brightness',
          type: 'range',
          min: 0,
          max: 100,
          step: 1,
          value: 75,
          showValue: true,
          help: 'Adjust brightness level (0-100%)'
        },
        {
          name: 'volume',
          label: 'Volume',
          type: 'range',
          min: 0,
          max: 10,
          step: 0.5,
          value: 5,
          showValue: true,
          help: 'Set volume level (0-10)'
        },
        {
          name: 'quality',
          label: 'Image Quality',
          type: 'range',
          min: 1,
          max: 5,
          step: 1,
          value: 3,
          showValue: true,
          help: 'Choose quality level (1=Low, 5=High)'
        },
        {
          name: 'price_range',
          label: 'Maximum Price ($)',
          type: 'range',
          min: 0,
          max: 1000,
          step: 10,
          value: 500,
          showValue: true,
          help: 'Set your maximum price filter'
        },
        {
          type: 'divider'
        },
        {
          type: 'button',
          label: 'Apply Settings',
          action: 'submit-other-inputs',
          buttonClass: 'btn-primary',
          icon: 'bi-check2'
        }
      ]
    });
    
    this.addChild(this.otherInputsForm, { containerId: 'other-inputs-form-container' });
  }
  
  getTemplate() {
    return `
      <div class="other-inputs-page">
        <!-- Page Header -->
        <div class="mb-4">
          <h1 class="h2">
            <i class="bi bi-palette me-2 text-primary"></i>
            Other Input Fields
          </h1>
          <p class="text-muted">
            Specialized input types: <strong>color picker</strong> and <strong>range sliders</strong>
          </p>
        </div>
        
        <!-- Quick Reference -->
        <div class="card mb-4">
          <div class="card-header">
            <h3 class="h5 mb-0">
              <i class="bi bi-table me-2"></i>
              Quick Reference
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
                    <th>Common Use Cases</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>color</code></td>
                    <td>Color picker with native browser UI</td>
                    <td><code>value</code> (hex format)</td>
                    <td>Theme customization, brand colors, UI styling</td>
                  </tr>
                  <tr>
                    <td><code>range</code></td>
                    <td>Slider for numeric range selection</td>
                    <td><code>min</code>, <code>max</code>, <code>step</code>, <code>showValue</code></td>
                    <td>Volume controls, price filters, ratings, zoom levels</td>
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
                  Try It Out
                </h3>
              </div>
              <div class="card-body">
                <p class="text-muted mb-3">
                  Interact with color and range inputs to see their behavior.
                </p>
                <div id="other-inputs-form-container"></div>
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
              <div class="card-body bg-dark">
                <pre class="mb-0 bg-dark text-light"><code class="text-light" style="background: none; padding: 0;">const form = new FormView({
  fields: [
    {
      name: 'theme_color',
      label: 'Theme Color',
      type: 'color',
      value: '#0d6efd',
      help: 'Select theme color'
    },
    {
      name: 'brightness',
      label: 'Brightness',
      type: 'range',
      min: 0,
      max: 100,
      step: 1,
      value: 75,
      showValue: true
    }
  ]
});</code></pre>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Color Field Details -->
        <div class="card mb-4">
          <div class="card-header">
            <h3 class="h5 mb-0">
              <i class="bi bi-palette-fill me-2"></i>
              Color Field Details
            </h3>
          </div>
          <div class="card-body">
            <div class="row">
              <div class="col-md-6">
                <h6>Features</h6>
                <ul>
                  <li>Native browser color picker UI</li>
                  <li>Returns hex color format (<code>#RRGGBB</code>)</li>
                  <li>Default value must be in hex format</li>
                  <li>Cross-browser support with fallback</li>
                </ul>
                
                <h6 class="mt-3">Common Use Cases</h6>
                <ul>
                  <li>Theme customization</li>
                  <li>Brand color selection</li>
                  <li>UI element styling</li>
                  <li>Chart/graph color configuration</li>
                </ul>
              </div>
              <div class="col-md-6">
                <h6>Best Practices</h6>
                <ul>
                  <li>Always provide a default value in hex format</li>
                  <li>Consider adding a "Reset to Default" option</li>
                  <li>Show color preview alongside the picker</li>
                  <li>Validate hex format if accepting manual input</li>
                  <li>Consider accessibility - ensure sufficient contrast</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Range Field Details -->
        <div class="card mb-4">
          <div class="card-header">
            <h3 class="h5 mb-0">
              <i class="bi bi-sliders me-2"></i>
              Range Field (Slider) Details
            </h3>
          </div>
          <div class="card-body">
            <div class="row">
              <div class="col-md-6">
                <h6>Options</h6>
                <ul>
                  <li><code>min</code> - Minimum value (default: 0)</li>
                  <li><code>max</code> - Maximum value (default: 100)</li>
                  <li><code>step</code> - Increment step (default: 1)</li>
                  <li><code>value</code> - Initial value</li>
                  <li><code>showValue</code> - Display current value next to slider</li>
                </ul>
                
                <h6 class="mt-3">Features</h6>
                <ul>
                  <li>Visual slider for numeric input</li>
                  <li>Optional live value display</li>
                  <li>Supports decimal values with <code>step</code></li>
                  <li>Keyboard accessible (arrow keys)</li>
                  <li>Touch-friendly on mobile devices</li>
                </ul>
              </div>
              <div class="col-md-6">
                <h6>Common Use Cases</h6>
                <ul>
                  <li>Volume/brightness controls</li>
                  <li>Price range filters</li>
                  <li>Percentage selection</li>
                  <li>Rating scales</li>
                  <li>Zoom/scale adjustments</li>
                </ul>
                
                <h6 class="mt-3">Best Practices</h6>
                <ul>
                  <li>Use <code>showValue: true</code> for precise control</li>
                  <li>Choose appropriate <code>step</code> values for precision</li>
                  <li>Consider min/max labels for context</li>
                  <li>Use descriptive help text to explain the scale</li>
                  <li>For decimals, ensure <code>step</code> matches precision</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

export default OtherInputsPage;
