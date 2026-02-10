import { View } from 'web-mojo';

/**
 * FormsOverview - Landing page for forms documentation
 * 
 * Provides quick overview and navigation to different form topics
 */
class FormsOverview extends View {
  getTemplate() {
    return `
      <div class="forms-overview">
        <!-- Quick Start -->
        <div class="card mb-4">
          <div class="card-header bg-white">
            <h3 class="h5 mb-0">
              <i class="bi bi-rocket-takeoff text-primary me-2"></i>
              Quick Start
            </h3>
          </div>
          <div class="card-body">
            <p class="text-muted">Create your first form in seconds:</p>
            
            <pre class="bg-dark text-white p-3 rounded mb-3"><code class="text-white" style="background: none; padding: 0;">const form = new FormView({
  fields: [
    { type: 'text', name: 'username', label: 'Username', required: true },
    { type: 'email', name: 'email', label: 'Email', required: true },
    { type: 'password', name: 'password', label: 'Password', required: true }
  ]
});

this.addChild(form, { containerId: 'form-container' });</code></pre>

            <a href="?page=forms/formview-basics" class="btn btn-primary">
              <i class="bi bi-arrow-right me-1"></i>
              Learn FormView Basics
            </a>
          </div>
        </div>
        
        <!-- Field Types Quick Reference -->
        <div class="card mb-4">
          <div class="card-header bg-white">
            <h3 class="h5 mb-0">
              <i class="bi bi-list-ul text-primary me-2"></i>
              Field Types Quick Reference
            </h3>
          </div>
          <div class="card-body">
            
            <!-- Basic Input Fields -->
            <h4 class="h6 fw-bold mt-3 mb-2">
              <i class="bi bi-input-cursor text-primary me-2"></i>
              Basic Input Fields
            </h4>
            <div class="table-responsive">
              <table class="table table-sm table-hover">
                <thead class="table-light">
                  <tr>
                    <th>Field Type</th>
                    <th>Use Case</th>
                    <th>Key Options</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>text</code></td>
                    <td>Single-line text</td>
                    <td><code>placeholder</code>, <code>maxlength</code>, <code>pattern</code></td>
                  </tr>
                  <tr>
                    <td><code>email</code></td>
                    <td>Email addresses</td>
                    <td><code>placeholder</code>, validation</td>
                  </tr>
                  <tr>
                    <td><code>password</code></td>
                    <td>Passwords</td>
                    <td><code>minlength</code>, <code>pattern</code>, <code>autocomplete</code></td>
                  </tr>
                  <tr>
                    <td><code>tel</code></td>
                    <td>Phone numbers</td>
                    <td><code>placeholder</code>, <code>pattern</code></td>
                  </tr>
                  <tr>
                    <td><code>url</code></td>
                    <td>URLs</td>
                    <td><code>placeholder</code>, validation</td>
                  </tr>
                  <tr>
                    <td><code>search</code></td>
                    <td>Search with live filtering</td>
                    <td><code>debounce</code>, <code>data-filter</code></td>
                  </tr>
                  <tr>
                    <td><code>number</code></td>
                    <td>Numeric input</td>
                    <td><code>min</code>, <code>max</code>, <code>step</code></td>
                  </tr>
                  <tr>
                    <td><code>hex</code></td>
                    <td>Hexadecimal values</td>
                    <td><code>hexType</code>, <code>allowPrefix</code></td>
                  </tr>
                  <tr>
                    <td><code>textarea</code></td>
                    <td>Multi-line text</td>
                    <td><code>rows</code>, <code>cols</code>, <code>maxlength</code></td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <!-- Selection Fields -->
            <h4 class="h6 fw-bold mt-4 mb-2">
              <i class="bi bi-check2-square text-primary me-2"></i>
              Selection Fields
            </h4>
            <div class="table-responsive">
              <table class="table table-sm table-hover">
                <thead class="table-light">
                  <tr>
                    <th>Field Type</th>
                    <th>Use Case</th>
                    <th>Key Options</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>select</code></td>
                    <td>Dropdown selection</td>
                    <td><code>options</code>, <code>multiple</code></td>
                  </tr>
                  <tr>
                    <td><code>checkbox</code></td>
                    <td>Boolean/multi-choice</td>
                    <td><code>checked</code>, <code>options</code>, <code>inline</code></td>
                  </tr>
                  <tr>
                    <td><code>radio</code></td>
                    <td>Single choice</td>
                    <td><code>options</code>, <code>inline</code></td>
                  </tr>
                  <tr>
                    <td><code>toggle</code></td>
                    <td>Toggle switch</td>
                    <td><code>checked</code>, <code>size</code></td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <!-- Date & Time -->
            <h4 class="h6 fw-bold mt-4 mb-2">
              <i class="bi bi-calendar text-primary me-2"></i>
              Date & Time Fields
            </h4>
            <div class="table-responsive">
              <table class="table table-sm table-hover">
                <thead class="table-light">
                  <tr>
                    <th>Field Type</th>
                    <th>Use Case</th>
                    <th>Key Options</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>date</code></td>
                    <td>Date picker</td>
                    <td><code>min</code>, <code>max</code></td>
                  </tr>
                  <tr>
                    <td><code>datetime-local</code></td>
                    <td>Date & time</td>
                    <td><code>min</code>, <code>max</code></td>
                  </tr>
                  <tr>
                    <td><code>time</code></td>
                    <td>Time picker</td>
                    <td><code>min</code>, <code>max</code>, <code>step</code></td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <!-- Files & Other -->
            <div class="row mt-4">
              <div class="col-md-6">
                <h4 class="h6 fw-bold mb-2">
                  <i class="bi bi-file-earmark text-primary me-2"></i>
                  File Fields
                </h4>
                <div class="table-responsive">
                  <table class="table table-sm table-hover">
                    <thead class="table-light">
                      <tr>
                        <th>Field Type</th>
                        <th>Use Case</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><code>file</code></td>
                        <td>File uploads</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div class="col-md-6">
                <h4 class="h6 fw-bold mb-2">
                  <i class="bi bi-sliders text-primary me-2"></i>
                  Other Inputs
                </h4>
                <div class="table-responsive">
                  <table class="table table-sm table-hover">
                    <thead class="table-light">
                      <tr>
                        <th>Field Type</th>
                        <th>Use Case</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><code>color</code></td>
                        <td>Color picker</td>
                      </tr>
                      <tr>
                        <td><code>range</code></td>
                        <td>Slider</td>
                      </tr>
                      <tr>
                        <td><code>hidden</code></td>
                        <td>Hidden values</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            <!-- Advanced Components Note -->
            <div class="alert alert-info mt-4 mb-0">
              <h5 class="alert-heading">
                <i class="bi bi-stars me-2"></i>
                Advanced Components
              </h5>
              <p class="mb-2">
                MOJO also includes enhanced components with richer functionality:
              </p>
              <ul class="mb-0">
                <li><strong>TagInput</strong> - Tag/chip input with autocomplete</li>
                <li><strong>DatePicker</strong> - Enhanced date picker with calendar UI</li>
                <li><strong>DateRangePicker</strong> - Select date ranges</li>
                <li><strong>MultiSelect</strong> - Multi-select dropdown</li>
                <li><strong>ComboInput</strong> - Autocomplete/editable dropdown</li>
                <li><strong>CollectionSelect</strong> - Select from API/Collection data</li>
                <li><strong>ImageField</strong> - Image upload with preview</li>
              </ul>
            </div>
          </div>
        </div>
        
        <!-- Navigation Cards -->
        <div class="row g-3">
          <div class="col-md-4">
            <div class="card h-100">
              <div class="card-body">
                <h5 class="card-title">
                  <i class="bi bi-input-cursor-text text-primary me-2"></i>
                  Text Inputs
                </h5>
                <p class="card-text text-muted small">
                  Explore all 8 text input types with examples and validation patterns.
                </p>
                <a href="?page=forms/text-inputs" class="btn btn-sm btn-outline-primary">
                  View Examples <i class="bi bi-arrow-right ms-1"></i>
                </a>
              </div>
            </div>
          </div>
          
          <div class="col-md-4">
            <div class="card h-100">
              <div class="card-body">
                <h5 class="card-title">
                  <i class="bi bi-check2-square text-success me-2"></i>
                  Selection Fields
                </h5>
                <p class="card-text text-muted small">
                  Learn about select, checkbox, radio, and toggle components.
                </p>
                <a href="?page=forms/selection-fields" class="btn btn-sm btn-outline-success">
                  View Examples <i class="bi bi-arrow-right ms-1"></i>
                </a>
              </div>
            </div>
          </div>
          
          <div class="col-md-4">
            <div class="card h-100">
              <div class="card-body">
                <h5 class="card-title">
                  <i class="bi bi-shield-check text-info me-2"></i>
                  Validation
                </h5>
                <p class="card-text text-muted small">
                  Built-in validators, custom rules, and async validation examples.
                </p>
                <a href="?page=forms/validation" class="btn btn-sm btn-outline-info">
                  Learn More <i class="bi bi-arrow-right ms-1"></i>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

export default FormsOverview;
