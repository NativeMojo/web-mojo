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
        <!-- Hero Section -->
        <div class="card border-0 shadow-sm mb-4 bg-gradient" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
          <div class="card-body p-4 text-white">
            <div class="row align-items-center">
              <div class="col-md-8">
                <h2 class="mb-3">
                  <i class="bi bi-ui-checks-grid me-2"></i>
                  WEB-MOJO Forms
                </h2>
                <p class="lead mb-3">
                  Build powerful, flexible forms with minimal code. Declarative configuration, 
                  built-in validation, and seamless model integration.
                </p>
                <div class="d-flex gap-2 flex-wrap">
                  <span class="badge bg-white bg-opacity-25 px-3 py-2">30+ Field Types</span>
                  <span class="badge bg-white bg-opacity-25 px-3 py-2">8 Advanced Components</span>
                  <span class="badge bg-white bg-opacity-25 px-3 py-2">Bootstrap 5</span>
                  <span class="badge bg-white bg-opacity-25 px-3 py-2">Model Integration</span>
                </div>
              </div>
              <div class="col-md-4 text-center d-none d-md-block">
                <i class="bi bi-file-earmark-code display-1 opacity-50"></i>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Quick Start -->
        <div class="row mb-4">
          <div class="col-12">
            <div class="card">
              <div class="card-body">
                <h3 class="card-title">
                  <i class="bi bi-rocket-takeoff text-primary me-2"></i>
                  Quick Start
                </h3>
                <p class="text-muted">Create your first form in seconds:</p>
                
                <pre class="bg-dark text-light p-3 rounded"><code class="text-light d-block" style="background: none; padding: 0;">import FormView from '@core/forms/FormView.js';

const form = new FormView({
  containerId: 'form-container',
  formConfig: {
    fields: [
      { type: 'text', name: 'username', label: 'Username', required: true },
      { type: 'email', name: 'email', label: 'Email', required: true },
      { type: 'password', name: 'password', label: 'Password', required: true }
    ]
  }
});

this.addChild(form);</code></pre>

                <a href="#/forms/formview-basics" class="btn btn-primary">
                  <i class="bi bi-arrow-right me-1"></i>
                  Learn FormView Basics
                </a>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Main Categories -->
        <div class="row mb-4 g-3">
          <!-- Basic Fields -->
          <div class="col-md-4">
            <div class="card h-100 hover-shadow">
              <div class="card-body">
                <div class="d-flex align-items-center mb-3">
                  <div class="bg-primary bg-opacity-10 rounded p-3 me-3">
                    <i class="bi bi-input-cursor-text text-primary fs-3"></i>
                  </div>
                  <div>
                    <h5 class="card-title mb-0">Basic Fields</h5>
                    <small class="text-muted">20+ field types</small>
                  </div>
                </div>
                <p class="card-text text-muted small">
                  Native HTML5 inputs including text, email, password, select, checkbox, 
                  radio, date, file, and more.
                </p>
                <a href="#/forms/text-inputs" class="btn btn-sm btn-outline-primary">
                  Explore Fields <i class="bi bi-arrow-right ms-1"></i>
                </a>
              </div>
            </div>
          </div>
          
          <!-- Advanced Components -->
          <div class="col-md-4">
            <div class="card h-100 hover-shadow">
              <div class="card-body">
                <div class="d-flex align-items-center mb-3">
                  <div class="bg-success bg-opacity-10 rounded p-3 me-3">
                    <i class="bi bi-stars text-success fs-3"></i>
                  </div>
                  <div>
                    <h5 class="card-title mb-0">Advanced Components</h5>
                    <small class="text-muted">8 rich inputs</small>
                  </div>
                </div>
                <p class="card-text text-muted small">
                  Enhanced inputs like TagInput, DatePicker, CollectionSelect, and ImageField 
                  with advanced functionality.
                </p>
                <a href="#/forms/tag-input" class="btn btn-sm btn-outline-success">
                  See Components <i class="bi bi-arrow-right ms-1"></i>
                </a>
              </div>
            </div>
          </div>
          
          <!-- Form Features -->
          <div class="col-md-4">
            <div class="card h-100 hover-shadow">
              <div class="card-body">
                <div class="d-flex align-items-center mb-3">
                  <div class="bg-info bg-opacity-10 rounded p-3 me-3">
                    <i class="bi bi-gear-wide-connected text-info fs-3"></i>
                  </div>
                  <div>
                    <h5 class="card-title mb-0">Features & Patterns</h5>
                    <small class="text-muted">Validation, layouts, etc.</small>
                  </div>
                </div>
                <p class="card-text text-muted small">
                  Form validation, file handling, responsive layouts, model integration, 
                  and best practices.
                </p>
                <a href="#/forms/validation" class="btn btn-sm btn-outline-info">
                  Learn Features <i class="bi bi-arrow-right ms-1"></i>
                </a>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Field Type Quick Reference -->
        <div class="row mb-4">
          <div class="col-12">
            <div class="card">
              <div class="card-header bg-white">
                <h4 class="mb-0">
                  <i class="bi bi-list-ul text-primary me-2"></i>
                  Field Types Quick Reference
                </h4>
              </div>
              <div class="card-body">
                <div class="row g-3">
                  <!-- Text Inputs -->
                  <div class="col-md-6 col-lg-4">
                    <h6 class="fw-bold"><i class="bi bi-input-cursor text-primary me-2"></i>Text Inputs</h6>
                    <div class="d-flex flex-wrap gap-1">
                      <span class="badge bg-light text-dark border">text</span>
                      <span class="badge bg-light text-dark border">email</span>
                      <span class="badge bg-light text-dark border">password</span>
                      <span class="badge bg-light text-dark border">tel</span>
                      <span class="badge bg-light text-dark border">url</span>
                      <span class="badge bg-light text-dark border">search</span>
                      <span class="badge bg-light text-dark border">number</span>
                      <span class="badge bg-light text-dark border">hex</span>
                    </div>
                  </div>
                  
                  <!-- Selection -->
                  <div class="col-md-6 col-lg-4">
                    <h6 class="fw-bold"><i class="bi bi-check2-square text-primary me-2"></i>Selection</h6>
                    <div class="d-flex flex-wrap gap-1">
                      <span class="badge bg-light text-dark border">select</span>
                      <span class="badge bg-light text-dark border">checkbox</span>
                      <span class="badge bg-light text-dark border">radio</span>
                      <span class="badge bg-light text-dark border">toggle</span>
                      <span class="badge bg-success text-white">multiselect</span>
                      <span class="badge bg-success text-white">combo</span>
                    </div>
                  </div>
                  
                  <!-- Date/Time -->
                  <div class="col-md-6 col-lg-4">
                    <h6 class="fw-bold"><i class="bi bi-calendar text-primary me-2"></i>Date & Time</h6>
                    <div class="d-flex flex-wrap gap-1">
                      <span class="badge bg-light text-dark border">date</span>
                      <span class="badge bg-light text-dark border">datetime</span>
                      <span class="badge bg-light text-dark border">time</span>
                      <span class="badge bg-success text-white">datepicker</span>
                      <span class="badge bg-success text-white">daterange</span>
                    </div>
                  </div>
                  
                  <!-- Files -->
                  <div class="col-md-6 col-lg-4">
                    <h6 class="fw-bold"><i class="bi bi-file-earmark text-primary me-2"></i>Files & Media</h6>
                    <div class="d-flex flex-wrap gap-1">
                      <span class="badge bg-light text-dark border">file</span>
                      <span class="badge bg-success text-white">image</span>
                    </div>
                  </div>
                  
                  <!-- Advanced -->
                  <div class="col-md-6 col-lg-4">
                    <h6 class="fw-bold"><i class="bi bi-tags text-primary me-2"></i>Advanced</h6>
                    <div class="d-flex flex-wrap gap-1">
                      <span class="badge bg-success text-white">tag</span>
                      <span class="badge bg-success text-white">collection</span>
                      <span class="badge bg-success text-white">collectionmultiselect</span>
                    </div>
                  </div>
                  
                  <!-- Other -->
                  <div class="col-md-6 col-lg-4">
                    <h6 class="fw-bold"><i class="bi bi-sliders text-primary me-2"></i>Other</h6>
                    <div class="d-flex flex-wrap gap-1">
                      <span class="badge bg-light text-dark border">textarea</span>
                      <span class="badge bg-light text-dark border">color</span>
                      <span class="badge bg-light text-dark border">range</span>
                      <span class="badge bg-light text-dark border">hidden</span>
                      <span class="badge bg-success text-white">htmlpreview</span>
                      <span class="badge bg-success text-white">json</span>
                    </div>
                  </div>
                </div>
                
                <div class="mt-3">
                  <small class="text-muted">
                    <i class="bi bi-info-circle me-1"></i>
                    <span class="badge bg-light text-dark border">Native</span> = Basic HTML5 fields
                    <span class="ms-2"><span class="badge bg-success text-white">Enhanced</span> = Advanced components</span>
                  </small>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Real-World Examples -->
        <div class="row mb-4">
          <div class="col-12">
            <h4 class="mb-3">
              <i class="bi bi-code-square text-primary me-2"></i>
              Real-World Examples
            </h4>
          </div>
          
          <div class="col-md-6 col-lg-4 mb-3">
            <div class="card h-100">
              <div class="card-body">
                <h6 class="card-title">
                  <i class="bi bi-person-circle text-primary me-2"></i>
                  User Profile Form
                </h6>
                <p class="card-text text-muted small">
                  Complete profile form with image upload, validation, and model binding.
                </p>
                <a href="#/forms/examples/profile" class="btn btn-sm btn-outline-primary w-100">
                  View Example
                </a>
              </div>
            </div>
          </div>
          
          <div class="col-md-6 col-lg-4 mb-3">
            <div class="card h-100">
              <div class="card-body">
                <h6 class="card-title">
                  <i class="bi bi-arrow-right-circle text-success me-2"></i>
                  Multi-Step Wizard
                </h6>
                <p class="card-text text-muted small">
                  Multi-page form wizard with progress indicator and validation per step.
                </p>
                <a href="#/forms/examples/wizard" class="btn btn-sm btn-outline-success w-100">
                  View Example
                </a>
              </div>
            </div>
          </div>
          
          <div class="col-md-6 col-lg-4 mb-3">
            <div class="card h-100">
              <div class="card-body">
                <h6 class="card-title">
                  <i class="bi bi-funnel text-info me-2"></i>
                  Search & Filter Form
                </h6>
                <p class="card-text text-muted small">
                  Advanced search form with date ranges, multi-select, and live filtering.
                </p>
                <a href="#/forms/examples/filters" class="btn btn-sm btn-outline-info w-100">
                  View Example
                </a>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Interactive Tools -->
        <div class="row">
          <div class="col-12">
            <div class="card border-warning">
              <div class="card-body">
                <div class="d-flex align-items-center mb-3">
                  <i class="bi bi-box text-warning fs-2 me-3"></i>
                  <div>
                    <h5 class="card-title mb-1">Form Playground</h5>
                    <p class="card-text text-muted mb-0">
                      Interactive tool to build and test forms with live code generation
                    </p>
                  </div>
                  <a href="#/forms/playground" class="btn btn-warning ms-auto">
                    Open Playground <i class="bi bi-box-arrow-up-right ms-1"></i>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <style>
        .hover-shadow {
          transition: box-shadow 0.2s;
        }
        .hover-shadow:hover {
          box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15) !important;
        }
      </style>
    `;
  }
}

export default FormsOverview;
