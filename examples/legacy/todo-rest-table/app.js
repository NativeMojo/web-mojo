/**
 * TODO REST Table Example using TablePage
 * Demonstrates TablePage with REST API integration and URL parameter synchronization
 */

import MOJO, { 
  RestModel, 
  DataList, 
  Router, 
  TablePage,
  Rest 
} from '../../src/mojo.js';

// Configuration
const API_BASE = 'http://0.0.0.0:8881';
const API_ENDPOINT = '/api/example/todo';

/**
 * TODO Model - represents a single TODO item from the REST API
 */
class Todo extends RestModel {
  static endpoint = API_ENDPOINT;
  
  constructor(data) {
    super(data);
  }
  
  /**
   * Get status badge HTML
   */
  getStatusBadge() {
    const classes = {
      'ticket': 'badge bg-info text-white',
      'task': 'badge bg-success text-white',
      'bug': 'badge bg-danger text-white',
      'feature': 'badge bg-primary text-white'
    };
    const kind = this.get('kind');
    return `<span class="${classes[kind] || 'badge bg-secondary text-white'}">${kind}</span>`;
  }
  
  /**
   * Get truncated description
   */
  getShortDescription() {
    const description = this.get('description');
    if (!description) return '';
    return description.length > 100 
      ? description.substring(0, 100) + '...' 
      : description;
  }
  
  /**
   * Get note preview
   */
  getNotePreview() {
    const note = this.get('note');
    if (!note || !note.name) return '-';
    return note.name.length > 50 
      ? note.name.substring(0, 50) + '...' 
      : note.name;
  }
  
  /**
   * Get priority badge
   */
  getPriorityBadge() {
    const priority = this.get('priority');
    if (!priority) return '';
    
    const classes = {
      'high': 'badge bg-danger',
      'medium': 'badge bg-warning text-dark',
      'low': 'badge bg-secondary'
    };
    
    return `<span class="${classes[priority] || 'badge bg-secondary'}">${priority}</span>`;
  }
}

/**
 * TODO Collection - manages multiple TODO items with REST API
 */
class TodoCollection extends DataList {
  static Rest = Rest;  // Set Rest class for API calls
  
  constructor() {
    super(Todo, {
      endpoint: `${API_BASE}${API_ENDPOINT}`
      // restEnabled automatically set to true due to endpoint
    });
  }
  
  /**
   * Override fetch to use correct API parameters (size/start instead of per_page/page)
   * Our TODO API expects: size/start parameters instead of page/per_page
   */
  async fetch(options = {}) {
    console.log('🔍 [DEBUG] TodoCollection.fetch called with options:', options);
    
    // Check if REST is enabled
    if (!this.restEnabled) {
      console.info('TodoCollection: REST disabled, skipping fetch');
      return this;
    }
    
    if (this.options.preloaded && this.models.length > 0) {
      console.info('TodoCollection: Using preloaded data, skipping fetch');
      return this;
    }
    
    // Build URL with API-specific parameters (size/start)
    let url = this.endpoint;
    const params = new URLSearchParams();
    
    // Convert standard pagination to API format
    if (options.page || options.per_page || options.size || options.start) {
      const page = options.page || 1;
      const pageSize = options.per_page || options.size || 10;
      const start = options.start || ((page - 1) * pageSize);
      
      params.append('size', pageSize.toString());
      params.append('start', start.toString());
    }
    
    // Add sorting parameters
    if (options.sort) {
      // Handle REST API sort convention (- prefix for descending)
      params.append('sort', options.sort);
    }
    
    // Add search parameter
    if (options.search) {
      params.append('q', options.search);
    }
    
    // Add filter parameters
    if (options.filters) {
      Object.keys(options.filters).forEach(key => {
        if (key !== 'search' && options.filters[key]) {
          params.append(key, options.filters[key]);
        }
      });
    }
    
    // Add other parameters
    if (options.params) {
      Object.keys(options.params).forEach(key => {
        if (key !== 'page' && key !== 'per_page') {
          params.append(key, options.params[key]);
        }
      });
    }
    
    if (params.toString()) {
      url += '?' + params.toString();
    }
    
    this.loading = true;
    this.errors = {};
    
    try {
      const response = await this.constructor.Rest.GET(url);
      console.log('🔍 [DEBUG] API Response received:', response);
      
      if (response.success !== false) {
        // Parse API response format
        const data = response.data.data || [];
        
        // Store metadata for server-side pagination
        this.meta = {
          total: response.data.count || data.length,
          page: Math.floor((response.data.start || 0) / (response.data.size || 10)) + 1,
          per_page: response.data.size || 10,
          start: response.data.start || 0,
          size: response.data.size || 10,
          count: response.data.count || data.length
        };
        
        // Reset and add models to collection
        this.reset();
        this.add(data, { silent: options.silent });
        
        return this;
      } else {
        this.errors = response.errors || {};
        throw new Error(response.message || 'Failed to fetch todos');
      }
    } catch (error) {
      console.error('TodoCollection fetch error:', error);
      this.errors = { fetch: error.message };
      throw error;
    } finally {
      this.loading = false;
    }
  }
  
  /**
   * Get todos by kind
   */
  getByKind(kind) {
    return this.filter(todo => todo.get('kind') === kind);
  }
}

/**
 * TodosTablePage - TablePage implementation for TODO items
 */
class TodosTablePage extends TablePage {
  constructor(options = {}) {
    super({
      ...options,
      page_name: 'todos',
      title: 'TODO Items - REST API Example',
      description: 'Live data from REST API with automatic refresh, export, and URL synchronization',
      
      // Model configuration
      modelName: 'TODO',
      modelNamePlural: 'TODOs',
      
      // Table configuration
      Collection: TodoCollection,
      columns: [
        {
          key: 'id',
          title: 'ID',
          sortable: true,
          searchable: false,
          width: '80px'
        },
        {
          key: 'name',
          title: 'TODO Name',
          sortable: true,
          searchable: true
        },
        {
          key: 'kind',
          title: 'Type',
          sortable: true,
          searchable: true,
          render: (item) => item.getStatusBadge(),
          filter: {
            type: 'select',
            options: [
              { value: '', label: 'All Types' },
              { value: 'task', label: 'Task' },
              { value: 'bug', label: 'Bug' },
              { value: 'ticket', label: 'Ticket' },
              { value: 'feature', label: 'Feature' }
            ]
          }
        },
        {
          key: 'description',
          title: 'Description',
          searchable: true,
          render: (item) => `<span class="text-muted">${item.getShortDescription()}</span>`
        },
        {
          key: 'note.name',
          title: 'Related Note',
          searchable: true,
          render: (item) => `<small class="text-muted">${item.getNotePreview()}</small>`
        }
      ],
      
      // Table features
      searchable: true,
      sortable: true,
      filterable: true,
      paginated: true,
      bordered: true,
      hover: true,
      striped: false,
      responsive: true,
      
      // Action buttons - clean toolbar design
      showRefresh: true,      // Icon-only refresh button
      showAdd: true,          // Compact add button
      showExport: true,       // Compact export button
      
      // Custom add handler
      onAdd: async function() {
        alert('Add TODO modal would open here - integrate with your form component');
        // Example: this.router.navigate('todos/new');
      },
      
      // URL parameter configuration
      updateUrl: true,
      replaceState: false,
      debounceDelay: 300,
      
      // Items per page
      itemsPerPage: 10,
      
      // Status display - simple bottom status bar
      showStatus: true,
      showLastUpdated: true,
      showRecordCount: true
    });
  }
  
  /**
   * Optional: Override onAfterRender to add example-specific info
   */
  async onAfterRender() {
    await super.onAfterRender();
    
    // Add API info card after the table
    if (this.element) {
      const tableContainer = this.element.querySelector('.table-page-container');
      if (tableContainer) {
        const infoCard = document.createElement('div');
        infoCard.className = 'mt-4';
        infoCard.innerHTML = `
          <div class="card">
            <div class="card-header">
              <h6 class="mb-0">
                <i class="bi bi-info-circle me-1"></i>
                REST API Information
              </h6>
            </div>
            <div class="card-body">
              <div class="row">
                <div class="col-md-6">
                  <p class="mb-2"><strong>API Endpoint:</strong></p>
                  <code class="d-block mb-3">${API_BASE}${API_ENDPOINT}</code>
                  <p class="mb-2"><strong>Features Demonstrated:</strong></p>
                  <ul class="small mb-0">
                    <li>Built-in refresh with loading states</li>
                    <li>Automatic CSV export functionality</li>
                    <li>URL parameter synchronization</li>
                    <li>Custom API parameter mapping (size/start)</li>
                  </ul>
                </div>
                <div class="col-md-6">
                  <p class="mb-2"><strong>TablePage Configuration:</strong></p>
                  <ul class="small mb-0">
                    <li>✅ Refresh button (built-in logic)</li>
                    <li>✅ Add button (custom handler)</li>
                    <li>✅ Export to CSV (built-in)</li>
                    <li>✅ Status display (auto-updated)</li>
                    <li>✅ Loading states (automatic)</li>
                    <li>✅ Custom action buttons</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        `;
        tableContainer.appendChild(infoCard);
      }
    }
  }
}

/**
 * Initialize the application
 */
async function initApp() {
  console.log('Initializing TODO REST Table Example with TablePage...');
  
  // Get the app container
  const appContainer = document.getElementById('app');
  if (!appContainer) {
    console.error('App container not found');
    return;
  }
  
  // Clear loading message
  appContainer.innerHTML = '';
  
  // Create router with proper container
  const router = new Router({
    container: '#app'
  });
  
  // Register the todos page
  router.addRoute('todos', TodosTablePage);
  
  // Start the router (initializes container and handles initial route)
  router.start();
  
  // Check if we need to navigate to default page (for param mode)
  const urlParams = new URLSearchParams(window.location.search);
  if (!urlParams.has('page')) {
    // No page specified, navigate to todos
    router.navigate('todos');
  }
  
  console.log('Application initialized');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// Export for debugging
window.MOJO_APP = {
  Todo,
  TodoCollection,
  TodosTablePage
};