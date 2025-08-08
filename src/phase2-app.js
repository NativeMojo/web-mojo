/**
 * MOJO Framework v2.0.0 - Phase 2: Data Layer Example Application
 * Demonstrates RestModel, DataList, and Rest interface functionality
 */

import MOJO, { View, Page, RestModel, DataList } from './mojo.js';

// ============================================================================
// PHASE 2: MODEL DEFINITIONS
// ============================================================================

/**
 * User Model - Demonstrates RestModel usage
 */
class User extends RestModel {
  static endpoint = '/api/users';
  
  // Validation rules
  static validations = {
    name: [
      { required: true, message: 'Name is required' },
      { minLength: 2, message: 'Name must be at least 2 characters' }
    ],
    email: [
      { required: true, message: 'Email is required' },
      { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email format' }
    ],
    age: [
      (value) => {
        if (value !== undefined && (value < 13 || value > 120)) {
          return 'Age must be between 13 and 120';
        }
        return true;
      }
    ]
  };

  constructor(data = {}, options = {}) {
    super(data, options);
    
    // Set default values
    this.set({
      status: 'active',
      created_at: null,
      updated_at: null,
      ...data
    });
  }

  // Custom methods
  getFullName() {
    return `${this.get('first_name') || ''} ${this.get('last_name') || ''}`.trim() || this.get('name');
  }

  isActive() {
    return this.get('status') === 'active';
  }

  async activate() {
    this.set('status', 'active');
    return this.save();
  }

  async deactivate() {
    this.set('status', 'inactive');
    return this.save();
  }
}

/**
 * Post Model - Demonstrates nested data and relationships
 */
class Post extends RestModel {
  static endpoint = '/api/posts';
  
  static validations = {
    title: [
      { required: true, message: 'Title is required' },
      { minLength: 5, message: 'Title must be at least 5 characters' }
    ],
    content: [
      { required: true, message: 'Content is required' },
      { minLength: 10, message: 'Content must be at least 10 characters' }
    ],
    user_id: [
      { required: true, message: 'Author is required' }
    ]
  };

  constructor(data = {}, options = {}) {
    super(data, options);
    
    this.set({
      published: false,
      views: 0,
      likes: 0,
      ...data
    });
  }

  async publish() {
    this.set('published', true);
    this.set('published_at', new Date().toISOString());
    return this.save();
  }

  async unpublish() {
    this.set('published', false);
    this.set('published_at', null);
    return this.save();
  }
}

// ============================================================================
// PHASE 2: COLLECTION DEFINITIONS  
// ============================================================================

/**
 * Users Collection - Demonstrates DataList usage
 */
class Users extends DataList {
  constructor(options = {}) {
    super(User, {
      endpoint: '/api/users',
      ...options
    });
  }

  // Custom collection methods
  getActiveUsers() {
    return this.where(user => user.isActive());
  }

  getUsersByAge(minAge, maxAge) {
    return this.where(user => {
      const age = user.get('age');
      return age >= minAge && age <= maxAge;
    });
  }

  async fetchWithPagination(page = 1, limit = 10) {
    return this.fetch({
      params: {
        page,
        limit,
        sort: 'created_at',
        order: 'desc'
      }
    });
  }
}

/**
 * Posts Collection - Demonstrates filtering and sorting
 */
class Posts extends DataList {
  constructor(options = {}) {
    super(Post, {
      endpoint: '/api/posts',
      ...options
    });
  }

  getPublishedPosts() {
    return this.where({ published: true });
  }

  getPostsByUser(userId) {
    return this.where({ user_id: userId });
  }

  async fetchPublished() {
    return this.fetch({
      params: {
        published: true,
        sort: 'published_at',
        order: 'desc'
      }
    });
  }
}

// ============================================================================
// PHASE 2: PAGES WITH DATA LAYER INTEGRATION
// ============================================================================

/**
 * Users Management Page - Demonstrates full CRUD operations
 */
class UsersPage extends Page {
  constructor(options = {}) {
    super({
      page_name: 'users',
      route: '/users/:action?/:id?',
      template: `
        <div class="users-page">
          <div class="page-header">
            <h1>Users Management</h1>
            <button class="btn btn-primary" data-action="showCreateForm">
              <i class="fas fa-plus"></i> Add User
            </button>
          </div>
          
          <div class="users-stats mb-3">
            <div class="row">
              <div class="col-md-3">
                <div class="card bg-primary text-white">
                  <div class="card-body">
                    <h5>{{users.total_users}}</h5>
                    <p class="mb-0">Total Users</p>
                  </div>
                </div>
              </div>
              <div class="col-md-3">
                <div class="card bg-success text-white">
                  <div class="card-body">
                    <h5>{{users.active_users}}</h5>
                    <p class="mb-0">Active Users</p>
                  </div>
                </div>
              </div>
              <div class="col-md-3">
                <div class="card bg-warning text-white">
                  <div class="card-body">
                    <h5>{{users.inactive_users}}</h5>
                    <p class="mb-0">Inactive Users</p>
                  </div>
                </div>
              </div>
              <div class="col-md-3">
                <div class="card bg-info text-white">
                  <div class="card-body">
                    <h5>{{users.new_today}}</h5>
                    <p class="mb-0">New Today</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="users-filters mb-3">
            <div class="row">
              <div class="col-md-4">
                <input type="text" class="form-control" placeholder="Search users..." data-action="search">
              </div>
              <div class="col-md-3">
                <select class="form-control" data-action="filterStatus">
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div class="col-md-3">
                <button class="btn btn-outline-secondary" data-action="refresh">
                  <i class="fas fa-refresh"></i> Refresh
                </button>
              </div>
            </div>
          </div>

          <div class="users-table-container">
            {{#if users.loading}}
              <div class="text-center py-4">
                <div class="spinner-border" role="status">
                  <span class="sr-only">Loading...</span>
                </div>
                <p>Loading users...</p>
              </div>
            {{else}}
              {{#if users.models.length}}
                <div class="table-responsive">
                  <table class="table table-striped">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Age</th>
                        <th>Status</th>
                        <th>Created</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {{#each users.models}}
                        <tr data-user-id="{{id}}">
                          <td>{{id}}</td>
                          <td>{{name}}</td>
                          <td>{{email}}</td>
                          <td>{{age}}</td>
                          <td>
                            <span class="badge badge-{{#if status_active}}success{{else}}warning{{/if}}">
                              {{status}}
                            </span>
                          </td>
                          <td>{{created_at_formatted}}</td>
                          <td>
                            <div class="btn-group btn-group-sm">
                              <button class="btn btn-outline-primary" data-action="editUser" data-id="{{id}}">
                                <i class="fas fa-edit"></i>
                              </button>
                              {{#if status_active}}
                                <button class="btn btn-outline-warning" data-action="deactivateUser" data-id="{{id}}">
                                  <i class="fas fa-pause"></i>
                                </button>
                              {{else}}
                                <button class="btn btn-outline-success" data-action="activateUser" data-id="{{id}}">
                                  <i class="fas fa-play"></i>
                                </button>
                              {{/if}}
                              <button class="btn btn-outline-danger" data-action="deleteUser" data-id="{{id}}">
                                <i class="fas fa-trash"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      {{/each}}
                    </tbody>
                  </table>
                </div>

                {{#if users.meta.total_pages}}
                  <nav>
                    <ul class="pagination justify-content-center">
                      {{#if users.meta.page_gt_1}}
                        <li class="page-item">
                          <button class="page-link" data-action="goToPage" data-page="{{users.meta.prev_page}}">Previous</button>
                        </li>
                      {{/if}}
                      
                      {{#each users.meta.pages}}
                        <li class="page-item {{#if current}}active{{/if}}">
                          <button class="page-link" data-action="goToPage" data-page="{{page}}">{{page}}</button>
                        </li>
                      {{/each}}
                      
                      {{#if users.meta.page_lt_total}}
                        <li class="page-item">
                          <button class="page-link" data-action="goToPage" data-page="{{users.meta.next_page}}">Next</button>
                        </li>
                      {{/if}}
                    </ul>
                  </nav>
                {{/if}}
              {{else}}
                <div class="text-center py-5">
                  <i class="fas fa-users fa-3x text-muted mb-3"></i>
                  <h4>No Users Found</h4>
                  <p class="text-muted">Start by creating your first user.</p>
                  <button class="btn btn-primary" data-action="showCreateForm">
                    <i class="fas fa-plus"></i> Add User
                  </button>
                </div>
              {{/if}}
            {{/if}}
          </div>

          <!-- User Form Modal -->
          <div class="modal fade" id="userModal" tabindex="-1">
            <div class="modal-dialog">
              <div class="modal-content">
                <div class="modal-header">
                  <h5 class="modal-title">{{form.title}}</h5>
                  <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <form data-action="submitUserForm">
                  <div class="modal-body">
                    {{#if form.errors.general}}
                      <div class="alert alert-danger">{{form.errors.general}}</div>
                    {{/if}}
                    
                    <div class="mb-3">
                      <label class="form-label">Name *</label>
                      <input type="text" class="form-control {{#if form.errors.name}}is-invalid{{/if}}" 
                             name="name" value="{{form.data.name}}" required>
                      {{#if form.errors.name}}
                        <div class="invalid-feedback">{{form.errors.name}}</div>
                      {{/if}}
                    </div>

                    <div class="mb-3">
                      <label class="form-label">Email *</label>
                      <input type="email" class="form-control {{#if form.errors.email}}is-invalid{{/if}}" 
                             name="email" value="{{form.data.email}}" required>
                      {{#if form.errors.email}}
                        <div class="invalid-feedback">{{form.errors.email}}</div>
                      {{/if}}
                    </div>

                    <div class="mb-3">
                      <label class="form-label">Age</label>
                      <input type="number" class="form-control {{#if form.errors.age}}is-invalid{{/if}}" 
                             name="age" value="{{form.data.age}}" min="13" max="120">
                      {{#if form.errors.age}}
                        <div class="invalid-feedback">{{form.errors.age}}</div>
                      {{/if}}
                    </div>

                    <div class="mb-3">
                      <label class="form-label">Status</label>
                      <select class="form-control" name="status">
                        <option value="active" {{#if form.data.status_active}}selected{{/if}}>Active</option>
                        <option value="inactive" {{#if form.data.status_inactive}}selected{{/if}}>Inactive</option>
                      </select>
                    </div>
                  </div>
                  <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="submit" class="btn btn-primary" {{#if form.saving}}disabled{{/if}}>
                      {{#if form.saving}}
                        <span class="spinner-border spinner-border-sm me-2"></span>
                      {{/if}}
                      {{form.submitText}}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          <div class="row mt-4">
            <div class="col-12">
              <div class="card">
                <div class="card-header d-flex justify-content-between align-items-center">
                  <h5 class="mb-0">Response</h5>
                  {{#if response}}
                    <button class="btn btn-outline-secondary btn-sm" data-action="clearResponse">Clear</button>
                  {{/if}}
                </div>
                <div class="card-body">
                  {{#if loading}}
                    <div class="text-center py-4">
                      <div class="spinner-border" role="status">
                        <span class="sr-only">Loading...</span>
                      </div>
                      <p class="mt-2">Making request...</p>
                    </div>
                  {{else if response}}
                    <div class="response-info mb-3">
                      <div class="row">
                        <div class="col-md-3">
                          <strong>Status:</strong> 
                          <span class="badge badge-{{#if response.success}}success{{else}}danger{{/if}}">
                            {{response.status}} {{response.statusText}}
                          </span>
                        </div>
                        <div class="col-md-3">
                          <strong>Success:</strong> {{response.success}}
                        </div>
                        <div class="col-md-6">
                          <strong>Took:</strong> {{response.duration}}ms
                        </div>
                      </div>
                    </div>

                    {{#if response.headers}}
                      <div class="mb-3">
                        <h6>Response Headers:</h6>
                        <pre class="bg-light p-2 rounded"><code>{{response.headersText}}</code></pre>
                      </div>
                    {{/if}}

                    <div class="mb-3">
                      <h6>Response Data:</h6>
                      <pre class="bg-light p-3 rounded" style="max-height: 400px; overflow-y: auto;"><code>{{response.dataText}}</code></pre>
                    </div>

                    {{#if response.errors}}
                      <div class="mb-3">
                        <h6>Errors:</h6>
                        <pre class="bg-danger text-white p-2 rounded"><code>{{response.errorsText}}</code></pre>
                      </div>
                    {{/if}}
                  {{else}}
                    <div class="text-center py-4 text-muted">
                      <i class="fas fa-paper-plane fa-2x mb-3"></i>
                      <p>Make a request to see the response here</p>
                    </div>
                  {{/if}}
                </div>
              </div>
            </div>
          </div>
        </div>
      `,
      data: {
        config: {
          baseURL: 'https://jsonplaceholder.typicode.com',
          timeout: 30000,
          authToken: ''
        },
        stats: {
          requestInterceptors: 0,
          responseInterceptors: 0
        },
        loading: false,
        response: null
      },
      ...options
    });

    this.restClient = window.MOJO.rest;
  }

  async on_init() {
    console.log('API Demo page initializing...');
    this.updateStats();
  }

  updateStats() {
    this.updateData({
      'stats.requestInterceptors': this.restClient.interceptors.request.length,
      'stats.responseInterceptors': this.restClient.interceptors.response.length
    }, true);
  }

  async on_action_updateConfig(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const config = {
      baseURL: formData.get('baseURL') || '',
      timeout: parseInt(formData.get('timeout')) || 30000,
      authToken: formData.get('authToken') || ''
    };

    // Update REST client configuration
    this.restClient.configure({
      baseURL: config.baseURL,
      timeout: config.timeout
    });

    // Set auth token if provided
    if (config.authToken) {
      this.restClient.setAuthToken(config.authToken);
    } else {
      this.restClient.clearAuth();
    }

    // Update local state
    this.updateData({ config }, true);
    
    this.showSuccess('API configuration updated successfully');
  }

  async on_action_addRequestInterceptor() {
    this.restClient.addInterceptor('request', (request) => {
      console.log('Request interceptor:', request);
      
      // Add timestamp to request
      request.timestamp = Date.now();
      
      // Add custom header
      request.headers['X-Request-ID'] = 'req-' + Math.random().toString(36).substr(2, 9);
      
      return request;
    });

    this.updateStats();
    this.showSuccess('Request interceptor added (check console for logs)');
  }

  async on_action_addResponseInterceptor() {
    this.restClient.addInterceptor('response', (response, request) => {
      console.log('Response interceptor:', response, request);
      
      // Calculate request duration
      if (request.timestamp) {
        response.duration = Date.now() - request.timestamp;
      }
      
      return response;
    });

    this.updateStats();
    this.showSuccess('Response interceptor added (check console for logs)');
  }

  async on_action_makeRequest(event) {
    event.preventDefault();
    
    try {
      this.updateData({ loading: true, response: null }, true);
      
      const formData = new FormData(event.target);
      const method = formData.get('method');
      const url = formData.get('url');
      const bodyText = formData.get('body').trim();
      const paramsText = formData.get('params').trim();
      
      // Parse request body
      let body = null;
      if (bodyText && ['POST', 'PUT', 'PATCH'].includes(method)) {
        try {
          body = JSON.parse(bodyText);
        } catch (error) {
          throw new Error('Invalid JSON in request body');
        }
      }
      
      // Parse query parameters
      let params = {};
      if (paramsText) {
        try {
          params = JSON.parse(paramsText);
        } catch (error) {
          throw new Error('Invalid JSON in query parameters');
        }
      }
      
      const startTime = Date.now();
      const response = await this.restClient.request(method, url, body, params);
      const duration = Date.now() - startTime;
      
      // Format response for display
      const formattedResponse = {
        ...response,
        duration,
        headersText: JSON.stringify(response.headers, null, 2),
        dataText: JSON.stringify(response.data, null, 2),
        errorsText: response.errors ? JSON.stringify(response.errors, null, 2) : null
      };
      
      this.updateData({ response: formattedResponse }, true);
      
    } catch (error) {
      this.showError('Request failed: ' + error.message);
      console.error('Request error:', error);
      
      // Show error in response
      this.updateData({
        response: {
          success: false,
          status: 0,
          statusText: 'Error',
          message: error.message,
          dataText: error.message,
          duration: 0,
          errors: { request: error.message },
          errorsText: JSON.stringify({ request: error.message }, null, 2)
        }
      }, true);
    } finally {
      this.updateData({ loading: false }, true);
    }
  }

  async on_action_clearResponse() {
    this.updateData({ response: null }, true);
  }
}

// ============================================================================
// PHASE 2: APPLICATION INITIALIZATION
// ============================================================================

/**
 * Initialize Phase 2 Example Application
 */
async function initPhase2App() {
  console.log('Initializing MOJO Phase 2 Example Application...');
  
  try {
    // Create MOJO instance with Phase 2 configuration
    const app = MOJO.create({
      container: '#app',
      debug: true,
      api: {
        baseURL: 'https://jsonplaceholder.typicode.com',
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    });

    // Register Phase 2 models
    app.registerModel('User', User);
    app.registerModel('Post', Post);
    
    // Register Phase 2 collections
    app.registerCollection('Users', Users);
    app.registerCollection('Posts', Posts);
    
    // Register Phase 2 pages
    app.registerPage('users', UsersPage);
    app.registerPage('api-demo', ApiDemoPage);
    
    // Create navigation
    const navView = new View({
      template: `
        <nav class="navbar navbar-expand-lg navbar-dark bg-primary mb-4">
          <div class="container">
            <a class="navbar-brand" href="#">
              <strong>MOJO v2.0.0</strong> - Phase 2 Demo
            </a>
            
            <div class="navbar-nav ms-auto">
              <button class="nav-link btn btn-link text-white" data-action="showUsers">
                <i class="fas fa-users"></i> Users
              </button>
              <button class="nav-link btn btn-link text-white" data-action="showApiDemo">
                <i class="fas fa-code"></i> API Demo
              </button>
              <button class="nav-link btn btn-link text-white" data-action="showStats">
                <i class="fas fa-chart-bar"></i> Stats
              </button>
            </div>
          </div>
        </nav>
      `
    });

    // Navigation actions
    navView.onActionShowUsers = async () => {
      const usersPage = app.createPage('users');
      await usersPage.render('#content');
    };
    
    navView.onActionShowApiDemo = async () => {
      const apiDemoPage = app.createPage('api-demo');
      await apiDemoPage.render('#content');
    };
    
    navView.onActionShowStats = () => {
      const stats = app.getStats();
      const statsModal = app.showDialog('Framework Statistics', `
        <div class="row">
          <div class="col-md-6">
            <h6>Core Framework</h6>
            <ul class="list-unstyled">
              <li><strong>Version:</strong> ${stats.version}</li>
              <li><strong>Initialized:</strong> ${stats.initialized}</li>
              <li><strong>Started:</strong> ${stats.started}</li>
            </ul>
            
            <h6>Registered Components</h6>
            <ul class="list-unstyled">
              <li><strong>Views:</strong> ${stats.registeredViews}</li>
              <li><strong>Pages:</strong> ${stats.registeredPages}</li>
              <li><strong>Models:</strong> ${stats.registeredModels}</li>
              <li><strong>Collections:</strong> ${stats.registeredCollections}</li>
            </ul>
          </div>
          <div class="col-md-6">
            <h6>Event Bus</h6>
            <ul class="list-unstyled">
              <li><strong>Events:</strong> ${stats.eventBus.eventCount}</li>
              <li><strong>Listeners:</strong> ${stats.eventBus.listenerCount}</li>
            </ul>
            
            <h6>REST Client</h6>
            <ul class="list-unstyled">
              <li><strong>Base URL:</strong> ${stats.restClient.baseURL || 'None'}</li>
              <li><strong>Timeout:</strong> ${stats.restClient.timeout}ms</li>
              <li><strong>Request Interceptors:</strong> ${stats.restClient.requestInterceptors}</li>
              <li><strong>Response Interceptors:</strong> ${stats.restClient.responseInterceptors}</li>
              <li><strong>Has Auth:</strong> ${stats.restClient.hasAuth ? 'Yes' : 'No'}</li>
            </ul>
          </div>
        </div>
      `, {
        size: 'lg',
        type: 'info'
      });
    };

    // Set up main layout
    const mainView = new View({
      template: `
        <div class="phase2-app">
          {{navigation}}
          <div class="container">
            <div id="content">
              <div class="text-center py-5">
                <i class="fas fa-database fa-4x text-primary mb-4"></i>
                <h2>MOJO Framework v2.0.0 - Phase 2</h2>
                <p class="lead">Data Layer Implementation</p>
                <p class="text-muted">Choose an option from the navigation above to explore Phase 2 features</p>
                
                <div class="row mt-5">
                  <div class="col-md-4">
                    <div class="card h-100">
                      <div class="card-body text-center">
                        <i class="fas fa-users fa-2x text-primary mb-3"></i>
                        <h5>User Management</h5>
                        <p>Full CRUD operations with RestModel and DataList</p>
                        <button class="btn btn-primary" data-action="showUsers">Explore</button>
                      </div>
                    </div>
                  </div>
                  <div class="col-md-4">
                    <div class="card h-100">
                      <div class="card-body text-center">
                        <i class="fas fa-code fa-2x text-success mb-3"></i>
                        <h5>API Testing</h5>
                        <p>Test REST interface with interceptors and configuration</p>
                        <button class="btn btn-success" data-action="showApiDemo">Test API</button>
                      </div>
                    </div>
                  </div>
                  <div class="col-md-4">
                    <div class="card h-100">
                      <div class="card-body text-center">
                        <i class="fas fa-chart-bar fa-2x text-info mb-3"></i>
                        <h5>Framework Stats</h5>
                        <p>View framework statistics and component registry</p>
                        <button class="btn btn-info" data-action="showStats">View Stats</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `,
      data: {
        navigation: navView
      }
    });

    // Copy navigation actions to main view
    mainView.onActionShowUsers = navView.onActionShowUsers;
    mainView.onActionShowApiDemo = navView.onActionShowApiDemo;
    mainView.onActionShowStats = navView.onActionShowStats;

    // Render the main application
    await navView.render('#app');
    await mainView.render('#app', { append: true });

    // Start the application
    await app.start();

    console.log('MOJO Phase 2 Example Application initialized successfully!');
    console.log('Framework Stats:', app.getStats());

    // Add some demo data for testing
    await addDemoData(app);

    return app;

  } catch (error) {
    console.error('Failed to initialize Phase 2 app:', error);
    document.body.innerHTML = `
      <div class="container mt-5">
        <div class="alert alert-danger">
          <h4>Application Initialization Failed</h4>
          <p><strong>Error:</strong> ${error.message}</p>
          <p>Please check the console for more details.</p>
        </div>
      </div>
    `;
    throw error;
  }
}

/**
 * Add demo data for testing Phase 2 functionality
 */
async function addDemoData(app) {
  try {
    // Create some demo users for testing
    const demoUsers = [
      { id: 1, name: 'John Doe', email: 'john@example.com', age: 30, status: 'active', created_at: '2024-01-15T10:00:00Z' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com', age: 28, status: 'active', created_at: '2024-01-16T11:00:00Z' },
      { id: 3, name: 'Bob Johnson', email: 'bob@example.com', age: 35, status: 'inactive', created_at: '2024-01-17T12:00:00Z' },
      { id: 4, name: 'Alice Wilson', email: 'alice@example.com', age: 26, status: 'active', created_at: new Date().toISOString() }
    ];

    // Create demo models
    const users = demoUsers.map(userData => {
      const user = new User(userData);
      user.originalAttributes = { ...userData }; // Set as "saved" state
      return user;
    });

    console.log('Demo data created:', users.length + ' users');

    // Add global demo data access for testing
    window.MOJODemo = {
      users,
      User,
      Post,
      Users,
      Posts,
      app
    };

    console.log('Demo data available at window.MOJODemo');

  } catch (error) {
    console.warn('Failed to create demo data:', error);
  }
}

// ============================================================================
// AUTO-INITIALIZE ON DOM READY
// ============================================================================

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPhase2App);
} else {
  // DOM is already ready
  initPhase2App();
}

// Export for manual initialization if needed
export { 
  initPhase2App, 
  User, 
  Post, 
  Users, 
  Posts, 
  UsersPage, 
  ApiDemoPage 
};