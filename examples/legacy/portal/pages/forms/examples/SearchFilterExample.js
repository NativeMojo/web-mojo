import { Page, FormView } from 'web-mojo';

/**
 * SearchFilterExample - Search and filter form
 * 
 * Demonstrates a search/filter pattern with:
 * - Live filtering as inputs change
 * - Multiple filter types (text, select, range, checkbox)
 * - Real-time result updates
 * - Clear filters functionality
 */
class SearchFilterExample extends Page {
  static pageName = 'forms/examples/filters';
  
  constructor(options = {}) {
    super({
      title: 'Search & Filter Form Example',
      icon: 'bi-funnel',
      pageDescription: 'Live filtering with instant results',
      ...options
    });
    
    // Mock product data
    this.products = this.generateMockProducts();
    this.filteredProducts = [...this.products];
  }
  
  async onActionClearFilters(event, element) {
    event.preventDefault();
    
    // Reset form to defaults
    this.filterForm.setData({
      search: '',
      category: 'all',
      min_price: 0,
      max_price: 500,
      in_stock: false,
      on_sale: false
    });
    
    // Apply filters (will show all products)
    await this.applyFilters();
    this.getApp().toast.success('Filters cleared');
  }
  
  async applyFilters() {
    const filters = await this.filterForm.getFormData();
    
    // Filter products based on criteria
    this.filteredProducts = this.products.filter(product => {
      // Text search
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (!product.name.toLowerCase().includes(searchLower)) {
          return false;
        }
      }
      
      // Category
      if (filters.category && filters.category !== 'all') {
        if (product.category !== filters.category) {
          return false;
        }
      }
      
      // Price range
      if (product.price < filters.min_price || product.price > filters.max_price) {
        return false;
      }
      
      // In stock
      if (filters.in_stock && product.stock <= 0) {
        return false;
      }
      
      // On sale
      if (filters.on_sale && !product.on_sale) {
        return false;
      }
      
      return true;
    });
    
    this.renderResults();
  }
  
  renderResults() {
    const resultsContainer = this.element.querySelector('#results-container');
    const resultsCount = this.element.querySelector('#results-count');
    
    if (!resultsContainer || !resultsCount) return;
    
    // Update count
    resultsCount.textContent = `${this.filteredProducts.length} result${this.filteredProducts.length !== 1 ? 's' : ''}`;
    
    // Render products
    if (this.filteredProducts.length === 0) {
      resultsContainer.innerHTML = `
        <div class="text-center py-5 text-muted">
          <i class="bi bi-inbox fs-1"></i>
          <p class="mt-3">No products found</p>
          <p class="small">Try adjusting your filters</p>
        </div>
      `;
      return;
    }
    
    const productsHtml = this.filteredProducts.map(product => `
      <div class="card mb-3">
        <div class="card-body">
          <div class="row align-items-center">
            <div class="col-md-2 text-center">
              <i class="bi bi-box-seam fs-1 text-primary"></i>
            </div>
            <div class="col-md-7">
              <h6 class="mb-1">${product.name}</h6>
              <div class="small text-muted">${product.category}</div>
              <div class="mt-1">
                ${product.on_sale ? '<span class="badge bg-danger me-1">Sale</span>' : ''}
                ${product.stock > 0 ? '<span class="badge bg-success">In Stock</span>' : '<span class="badge bg-secondary">Out of Stock</span>'}
              </div>
            </div>
            <div class="col-md-3 text-end">
              <div class="fs-4 fw-bold text-primary">$${product.price.toFixed(2)}</div>
              ${product.stock > 0 ? `<div class="small text-muted">${product.stock} available</div>` : ''}
            </div>
          </div>
        </div>
      </div>
    `).join('');
    
    resultsContainer.innerHTML = productsHtml;
  }
  
  setupFormListeners() {
    const formElement = this.filterForm.element;
    
    // Listen for any input or change
    formElement.addEventListener('input', () => {
      this.applyFilters();
    });
    
    formElement.addEventListener('change', () => {
      this.applyFilters();
    });
  }
  
  generateMockProducts() {
    const categories = ['electronics', 'clothing', 'home', 'sports'];
    const products = [];
    
    const names = {
      electronics: ['Wireless Headphones', 'Smart Watch', 'Bluetooth Speaker', 'USB-C Hub', 'Mechanical Keyboard'],
      clothing: ['Cotton T-Shirt', 'Denim Jeans', 'Running Shoes', 'Winter Jacket', 'Baseball Cap'],
      home: ['Coffee Maker', 'Desk Lamp', 'Throw Pillow', 'Storage Bins', 'Wall Clock'],
      sports: ['Yoga Mat', 'Dumbbell Set', 'Bicycle Helmet', 'Tennis Racket', 'Water Bottle']
    };
    
    categories.forEach(category => {
      names[category].forEach(name => {
        products.push({
          id: products.length + 1,
          name: name,
          category: category,
          price: Math.floor(Math.random() * 450) + 50,
          stock: Math.floor(Math.random() * 100),
          on_sale: Math.random() > 0.6
        });
      });
    });
    
    return products;
  }
  
  async onInit() {
    await super.onInit();
    
    // Create filter form
    this.filterForm = new FormView({
      fields: [
        {
          name: 'search',
          label: 'Search',
          type: 'text',
          placeholder: 'Search products...',
          help: 'Search by name'
        },
        {
          type: 'divider'
        },
        {
          name: 'category',
          label: 'Category',
          type: 'select',
          options: [
            { value: 'all', text: 'All Categories' },
            { value: 'electronics', text: 'Electronics' },
            { value: 'clothing', text: 'Clothing' },
            { value: 'home', text: 'Home & Garden' },
            { value: 'sports', text: 'Sports' }
          ],
          value: 'all'
        },
        {
          type: 'divider'
        },
        {
          type: 'header',
          text: 'Price Range',
          level: 6
        },
        {
          name: 'min_price',
          label: 'Min Price ($)',
          type: 'range',
          min: 0,
          max: 500,
          step: 10,
          value: 0,
          showValue: true
        },
        {
          name: 'max_price',
          label: 'Max Price ($)',
          type: 'range',
          min: 0,
          max: 500,
          step: 10,
          value: 500,
          showValue: true
        },
        {
          type: 'divider'
        },
        {
          type: 'header',
          text: 'Options',
          level: 6
        },
        {
          name: 'in_stock',
          label: 'In Stock Only',
          type: 'switch'
        },
        {
          name: 'on_sale',
          label: 'On Sale',
          type: 'switch'
        },
        {
          type: 'divider'
        },
        {
          type: 'button',
          label: 'Clear Filters',
          action: 'clear-filters',
          buttonClass: 'btn-outline-secondary w-100',
          icon: 'bi-x-circle'
        }
      ]
    });
    
    this.addChild(this.filterForm, { containerId: 'filter-form-container' });
    
    // Setup event listeners for live filtering
    this.setupFormListeners();
    
    // Initial render
    this.renderResults();
  }
  
  getTemplate() {
    return `
      <div class="search-filter-example-page">
        <!-- Page Header -->
        <div class="mb-4">
          <h1 class="h2">
            <i class="bi bi-funnel me-2 text-primary"></i>
            Search & Filter Form Example
          </h1>
          <p class="text-muted">
            Real-time product filtering with instant results
          </p>
        </div>
        
        <!-- Info Alert -->
        <div class="alert alert-info mb-4">
          <h6 class="alert-heading"><i class="bi bi-info-circle me-2"></i>Features Demonstrated</h6>
          <ul class="mb-0">
            <li><strong>Live Filtering:</strong> Results update immediately as filters change</li>
            <li><strong>Multiple Filter Types:</strong> Text search, select, range sliders, switches</li>
            <li><strong>Result Count:</strong> Shows number of matching results</li>
            <li><strong>Clear Filters:</strong> Reset all filters with one button</li>
            <li><strong>No Page Reload:</strong> Client-side filtering for instant feedback</li>
          </ul>
        </div>
        
        <div class="row">
          <!-- Filter Sidebar -->
          <div class="col-md-3">
            <div class="card mb-4">
              <div class="card-header bg-primary text-white">
                <h5 class="mb-0"><i class="bi bi-sliders me-2"></i>Filters</h5>
              </div>
              <div class="card-body">
                <div id="filter-form-container"></div>
              </div>
            </div>
          </div>
          
          <!-- Results Area -->
          <div class="col-md-9">
            <div class="card mb-4">
              <div class="card-header">
                <div class="d-flex justify-content-between align-items-center">
                  <h5 class="mb-0"><i class="bi bi-grid me-2"></i>Products</h5>
                  <span id="results-count" class="badge bg-primary">0 results</span>
                </div>
              </div>
              <div class="card-body">
                <div id="results-container"></div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Implementation Code -->
        <div class="card bg-dark text-light mb-4">
          <div class="card-header bg-dark border-secondary">
            <h5 class="h6 mb-0">
              <i class="bi bi-code-slash me-2"></i>
              Live Filtering Pattern
            </h5>
          </div>
          <div class="card-body bg-dark">
            <pre class="mb-0 bg-dark text-light"><code class="text-light" style="background: none; padding: 0;">class SearchFilter extends Page {
  async onInit() {
    // Create filter form
    this.filterForm = new FormView({
      fields: [
        { name: 'search', type: 'text', ... },
        { name: 'category', type: 'select', ... },
        { name: 'min_price', type: 'range', ... }
      ]
    });
    
    // Setup live filtering
    this.setupFormListeners();
  }
  
  setupFormListeners() {
    const form = this.filterForm.element;
    
    // Listen for changes
    form.addEventListener('input', () =&gt; {
      this.applyFilters();
    });
    
    form.addEventListener('change', () =&gt; {
      this.applyFilters();
    });
  }
  
  async applyFilters() {
    const filters = await this.filterForm.getFormData();
    
    // Filter data
    this.filteredProducts = this.products.filter(p =&gt; {
      if (filters.search && 
          !p.name.toLowerCase().includes(filters.search)) {
        return false;
      }
      if (p.price &lt; filters.min_price) return false;
      return true;
    });
    
    // Re-render results
    this.renderResults();
  }
}</code></pre>
          </div>
        </div>
        
        <!-- Best Practices -->
        <div class="card mb-4">
          <div class="card-header">
            <h3 class="h5 mb-0">
              <i class="bi bi-stars me-2"></i>
              Search & Filter Best Practices
            </h3>
          </div>
          <div class="card-body">
            <h6>User Experience</h6>
            <ul>
              <li>Show filter results immediately (no "Apply" button needed)</li>
              <li>Display result count prominently</li>
              <li>Provide "Clear Filters" button for easy reset</li>
              <li>Show empty state message when no results found</li>
              <li>Use appropriate input types for each filter</li>
            </ul>
            
            <h6 class="mt-3">Performance</h6>
            <ul>
              <li>For large datasets (1000+), consider debouncing text search</li>
              <li>Use server-side filtering with Collections for very large datasets</li>
              <li>Consider pagination for many results</li>
            </ul>
            
            <h6 class="mt-3">Accessibility</h6>
            <ul>
              <li>Announce result count changes to screen readers</li>
              <li>Ensure keyboard navigation works smoothly</li>
              <li>Provide clear labels and help text</li>
            </ul>
          </div>
        </div>
      </div>
    `;
  }
}

export default SearchFilterExample;
