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
        <!-- Page Header -->
        <div class="mb-4">
          <h1 class="h2">
            <i class="bi bi-book me-2 text-primary"></i>
            Forms Documentation
          </h1>
          <p class="text-muted">
            Build powerful, flexible forms with minimal code. Declarative configuration, 
            built-in validation, and seamless model integration.
          </p>
        </div>
        
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
            
            <pre class="bg-dark text-light p-3 rounded mb-3"><code class="text-light" style="background: none; padding: 0;">const form = new FormView({
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
              All Field Types at a Glance
            </h3>
          </div>
          <div class="card-body">
            
            <!-- Text Input Fields -->
            <h4 class="h6 fw-bold mt-3 mb-2">
              <i class="bi bi-input-cursor text-primary me-2"></i>
              Text Input Fields
            </h4>
            <div class="table-responsive">
              <table class="table table-sm table-hover">
                <thead class="table-light">
                  <tr>
                    <th>Type</th>
                    <th>Description</th>
                    <th>Key Features</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>text</code></td>
                    <td>Single-line text input</td>
                    <td>Placeholder, pattern validation</td>
                  </tr>
                  <tr>
                    <td><code>email</code></td>
                    <td>Email address input</td>
                    <td>Built-in email validation</td>
                  </tr>
                  <tr>
                    <td><code>password</code></td>
                    <td>Password input</td>
                    <td>Show/hide toggle, strength meter</td>
                  </tr>
                  <tr>
                    <td><code>tel</code></td>
                    <td>Phone number input</td>
                    <td>Mobile numeric keyboard</td>
                  </tr>
                  <tr>
                    <td><code>url</code></td>
                    <td>URL input</td>
                    <td>Built-in URL validation</td>
                  </tr>
                  <tr>
                    <td><code>search</code></td>
                    <td>Search input</td>
                    <td>Live filtering, debouncing</td>
                  </tr>
                  <tr>
                    <td><code>hex</code></td>
                    <td>Hexadecimal input</td>
                    <td>Color/string hex validation</td>
                  </tr>
                  <tr>
                    <td><code>number</code></td>
                    <td>Numeric input</td>
                    <td>Min/max, step, spinners</td>
                  </tr>
                  <tr>
                    <td><code>textarea</code></td>
                    <td>Multi-line text</td>
                    <td>Rows, character count</td>
                  </tr>
                  <tr>
                    <td><code>htmlpreview</code></td>
                    <td>HTML editor</td>
                    <td>Live preview in dialog</td>
                  </tr>
                  <tr>
                    <td><code>json</code></td>
                    <td>JSON editor</td>
                    <td>Auto-formatting, validation</td>
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
                    <th>Type</th>
                    <th>Description</th>
                    <th>Key Features</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>select</code></td>
                    <td>Dropdown select</td>
                    <td>Single/multiple, searchable</td>
                  </tr>
                  <tr>
                    <td><code>checkbox</code></td>
                    <td>Checkbox</td>
                    <td>Single boolean or multiple</td>
                  </tr>
                  <tr>
                    <td><code>radio</code></td>
                    <td>Radio buttons</td>
                    <td>Single selection, inline layout</td>
                  </tr>
                  <tr>
                    <td><code>toggle</code> / <code>switch</code></td>
                    <td>Toggle switch</td>
                    <td>On/off with sizes</td>
                  </tr>
                  <tr>
                    <td><code>multiselect</code></td>
                    <td>Multi-select dropdown</td>
                    <td>Checkbox-style dropdown</td>
                  </tr>
                  <tr>
                    <td><code>buttongroup</code></td>
                    <td>Button-style selection</td>
                    <td>Icon buttons, variants</td>
                  </tr>
                  <tr>
                    <td><code>checklistdropdown</code></td>
                    <td>Dropdown with checkboxes</td>
                    <td>Compact multi-select</td>
                  </tr>
                  <tr>
                    <td><code>combo</code> / <code>combobox</code></td>
                    <td>Editable dropdown</td>
                    <td>Type or select, autocomplete</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <!-- File & Media Fields -->
            <h4 class="h6 fw-bold mt-4 mb-2">
              <i class="bi bi-file-earmark text-primary me-2"></i>
              File & Media Fields
            </h4>
            <div class="table-responsive">
              <table class="table table-sm table-hover">
                <thead class="table-light">
                  <tr>
                    <th>Type</th>
                    <th>Description</th>
                    <th>Key Features</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>file</code></td>
                    <td>Basic file upload</td>
                    <td>Multiple files, accept types</td>
                  </tr>
                  <tr>
                    <td><code>image</code></td>
                    <td>Image upload</td>
                    <td>Preview, drag-drop, sizes</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <!-- Date & Time Fields -->
            <h4 class="h6 fw-bold mt-4 mb-2">
              <i class="bi bi-calendar text-primary me-2"></i>
              Date & Time Fields
            </h4>
            <div class="table-responsive">
              <table class="table table-sm table-hover">
                <thead class="table-light">
                  <tr>
                    <th>Type</th>
                    <th>Description</th>
                    <th>Key Features</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>date</code></td>
                    <td>Date picker (native)</td>
                    <td>Min/max date constraints</td>
                  </tr>
                  <tr>
                    <td><code>datetime-local</code></td>
                    <td>Date & time picker</td>
                    <td>Native HTML5 picker</td>
                  </tr>
                  <tr>
                    <td><code>time</code></td>
                    <td>Time picker</td>
                    <td>12/24 hour, step intervals</td>
                  </tr>
                  <tr>
                    <td><code>datepicker</code></td>
                    <td>Enhanced date picker</td>
                    <td>Easepick library, themes</td>
                  </tr>
                  <tr>
                    <td><code>daterange</code></td>
                    <td>Date range picker</td>
                    <td>Start/end date selection</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <!-- Advanced Input Components -->
            <h4 class="h6 fw-bold mt-4 mb-2">
              <i class="bi bi-stars text-primary me-2"></i>
              Advanced Input Components
            </h4>
            <div class="table-responsive">
              <table class="table table-sm table-hover">
                <thead class="table-light">
                  <tr>
                    <th>Type</th>
                    <th>Description</th>
                    <th>Key Features</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>tag</code> / <code>tags</code></td>
                    <td>Tag/chip input</td>
                    <td>Add/remove tags, validation</td>
                  </tr>
                  <tr>
                    <td><code>collection</code></td>
                    <td>Collection select</td>
                    <td>Fetch from API, search</td>
                  </tr>
                  <tr>
                    <td><code>collectionmultiselect</code></td>
                    <td>Multi-select collection</td>
                    <td>Multiple from API</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <!-- Structural & Display Fields -->
            <h4 class="h6 fw-bold mt-4 mb-2">
              <i class="bi bi-layout-text-sidebar text-primary me-2"></i>
              Structural & Display Fields
            </h4>
            <div class="table-responsive">
              <table class="table table-sm table-hover">
                <thead class="table-light">
                  <tr>
                    <th>Type</th>
                    <th>Description</th>
                    <th>Key Features</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>hidden</code></td>
                    <td>Hidden input</td>
                    <td>Store values invisibly</td>
                  </tr>
                  <tr>
                    <td><code>header</code> / <code>heading</code></td>
                    <td>Section header</td>
                    <td>H1-H6 headings</td>
                  </tr>
                  <tr>
                    <td><code>html</code></td>
                    <td>Custom HTML</td>
                    <td>Inject custom markup</td>
                  </tr>
                  <tr>
                    <td><code>divider</code></td>
                    <td>Horizontal divider</td>
                    <td>Separate form sections</td>
                  </tr>
                  <tr>
                    <td><code>button</code></td>
                    <td>Custom button</td>
                    <td>Actions, custom styling</td>
                  </tr>
                  <tr>
                    <td><code>tabset</code></td>
                    <td>Tabbed field groups</td>
                    <td>Organize fields in tabs</td>
                  </tr>
                  <tr>
                    <td><code>group</code></td>
                    <td>Field group</td>
                    <td>Organize related fields</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <!-- Other Input Types -->
            <h4 class="h6 fw-bold mt-4 mb-2">
              <i class="bi bi-sliders text-primary me-2"></i>
              Other Input Types
            </h4>
            <div class="table-responsive">
              <table class="table table-sm table-hover mb-0">
                <thead class="table-light">
                  <tr>
                    <th>Type</th>
                    <th>Description</th>
                    <th>Key Features</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>color</code></td>
                    <td>Color picker</td>
                    <td>Hex color selection</td>
                  </tr>
                  <tr>
                    <td><code>range</code></td>
                    <td>Slider</td>
                    <td>Min/max, step, live value</td>
                  </tr>
                </tbody>
              </table>
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
