/**
 * HomePage - Landing page for MOJO Examples
 */

import Page from '../../../src/core/Page.js';

class HomePage extends Page {
  constructor(options = {}) {
    super({
      ...options,
      page_name: 'home',
      title: 'MOJO Framework Examples'
    });
  }
  
  async getTemplate() {
    return `
      <div class="example-page">
        <div class="p-5 mb-4 bg-light rounded-3">
          <div class="container-fluid py-5">
            <h1 class="display-4 fw-bold">
              <i class="bi bi-lightning-charge text-primary"></i>
              MOJO Framework Examples
            </h1>
            <p class="col-md-8 fs-4">
              Explore comprehensive examples demonstrating the power and simplicity of the MOJO framework.
            </p>
            <hr class="my-4">
            <p class="lead">
              Navigate through the examples using the sidebar to learn about components, routing, data management, and more.
            </p>
            <div class="btn-group" role="group">
              <a href="#/components" class="btn btn-primary btn-lg">
                <i class="bi bi-puzzle me-2"></i>
                Get Started
              </a>
              <a href="../docs/" target="_blank" class="btn btn-outline-primary btn-lg">
                <i class="bi bi-book me-2"></i>
                Documentation
              </a>
            </div>
          </div>
        </div>
        
        <div class="row g-4 mb-4">
          <div class="col-md-4">
            <div class="card feature-card h-100">
              <div class="card-body text-center">
                <div class="card-icon">
                  <i class="bi bi-puzzle"></i>
                </div>
                <h5 class="card-title">Components</h5>
                <p class="card-text">
                  Learn about View components, lifecycle hooks, data binding, and event handling.
                </p>
                <a href="#/components" class="btn btn-sm btn-outline-primary">
                  View Examples
                </a>
              </div>
            </div>
          </div>
          
          <div class="col-md-4">
            <div class="card feature-card h-100">
              <div class="card-body text-center">
                <div class="card-icon">
                  <i class="bi bi-window-stack"></i>
                </div>
                <h5 class="card-title">Dialogs</h5>
                <p class="card-text">
                  Full Bootstrap 5 modal support with sizes, scrollable content, and custom views.
                </p>
                <a href="#/dialogs" class="btn btn-sm btn-outline-primary">
                  View Examples
                </a>
              </div>
            </div>
          </div>
          
          <div class="col-md-4">
            <div class="card feature-card h-100">
              <div class="card-body text-center">
                <div class="card-icon">
                  <i class="bi bi-table"></i>
                </div>
                <h5 class="card-title">Tables</h5>
                <p class="card-text">
                  Create powerful data tables with sorting, filtering, pagination, and REST API integration.
                </p>
                <a href="#/tables" class="btn btn-sm btn-outline-primary">
                  View Examples
                </a>
              </div>
            </div>
          </div>
        </div>
        
        <div class="row g-4 mb-4">
          <div class="col-md-4">
            <div class="card feature-card h-100">
              <div class="card-body text-center">
                <div class="card-icon">
                  <i class="bi bi-input-cursor-text"></i>
                </div>
                <h5 class="card-title">Forms</h5>
                <p class="card-text">
                  Build dynamic forms with validation, custom controls, and FormBuilder.
                </p>
                <a href="#/forms" class="btn btn-sm btn-outline-primary">
                  View Examples
                </a>
              </div>
            </div>
          </div>
          
          <div class="col-md-4">
            <div class="card feature-card h-100">
              <div class="card-body text-center">
                <div class="card-icon">
                  <i class="bi bi-signpost-2"></i>
                </div>
                <h5 class="card-title">Navigation</h5>
                <p class="card-text">
                  Router configuration, page transitions, and navigation patterns.
                </p>
                <a href="#/navigation" class="btn btn-sm btn-outline-primary">
                  View Examples
                </a>
              </div>
            </div>
          </div>
          
          <div class="col-md-4">
            <div class="card feature-card h-100">
              <div class="card-body text-center">
                <div class="card-icon">
                  <i class="bi bi-database"></i>
                </div>
                <h5 class="card-title">Models & Data</h5>
                <p class="card-text">
                  RestModel, DataList, collections, and API integration patterns.
                </p>
                <a href="#/models" class="btn btn-sm btn-outline-primary">
                  View Examples
                </a>
              </div>
            </div>
          </div>
        </div>
        
        <div class="alert alert-info alert-example">
          <h5 class="alert-heading">
            <i class="bi bi-info-circle me-2"></i>
            Getting Started
          </h5>
          <p>
            Each example includes live demos, source code viewing, and detailed explanations. 
            Use the sidebar navigation to explore different topics.
          </p>
          <hr>
          <p class="mb-0">
            <strong>Tip:</strong> Click the "View Source" buttons in each example to see the implementation code in a dialog.
          </p>
        </div>
        
        <div class="card">
          <div class="card-header">
            <h5 class="mb-0">Quick Stats</h5>
          </div>
          <div class="card-body">
            <div class="row text-center">
              <div class="col-md-3">
                <h3 class="text-primary">15+</h3>
                <p class="text-muted">Components</p>
              </div>
              <div class="col-md-3">
                <h3 class="text-success">25+</h3>
                <p class="text-muted">Examples</p>
              </div>
              <div class="col-md-3">
                <h3 class="text-info">100%</h3>
                <p class="text-muted">ES6 Modules</p>
              </div>
              <div class="col-md-3">
                <h3 class="text-warning">0</h3>
                <p class="text-muted">Dependencies</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  async onAfterMount() {
    await super.onAfterMount();
    
    // Add fade-in animation
    if (this.element) {
      this.element.classList.add('page-enter');
      setTimeout(() => {
        this.element.classList.add('page-enter-active');
      }, 10);
    }
  }
}

export default HomePage;