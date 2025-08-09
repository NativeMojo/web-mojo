/**
 * TablesPage - Table component examples
 */

import Page from '../../../src/core/Page.js';
import Table from '../../../src/components/Table.js';
import Dialog from '../../../src/components/Dialog.js';

class TablesPage extends Page {
  constructor(options = {}) {
    super({
      ...options,
      page_name: 'tables',
      title: 'Tables - MOJO Examples'
    });
  }
  
  async getTemplate() {
    return `
      <div class="example-page">
        <h1 class="mb-4">Table Component</h1>
        <p class="lead">Create powerful data tables with sorting, filtering, pagination, and more.</p>
        
        <!-- Basic Table Section -->
        <div class="example-section">
          <div class="example-header">
            <h2>Basic Table</h2>
            <div class="source-buttons">
              <button class="btn btn-sm btn-outline-primary" data-action="show-basic-source">
                <i class="bi bi-code-slash me-1"></i>View Source
              </button>
            </div>
          </div>
          <p>A simple table with static data and basic features.</p>
          
          <div class="example-demo">
            <div id="basic-table"></div>
          </div>
        </div>
        
        <!-- Sortable Table Section -->
        <div class="example-section">
          <div class="example-header">
            <h2>Sortable Table</h2>
            <div class="source-buttons">
              <button class="btn btn-sm btn-outline-primary" data-action="show-sortable-source">
                <i class="bi bi-code-slash me-1"></i>View Source
              </button>
            </div>
          </div>
          <p>Click column headers to sort data.</p>
          
          <div class="example-demo">
            <div id="sortable-table"></div>
          </div>
        </div>
        
        <!-- Searchable & Filterable Section -->
        <div class="example-section">
          <div class="example-header">
            <h2>Search & Filters</h2>
            <div class="source-buttons">
              <button class="btn btn-sm btn-outline-primary" data-action="show-filter-source">
                <i class="bi bi-code-slash me-1"></i>View Source
              </button>
            </div>
          </div>
          <p>Table with search and filter capabilities.</p>
          
          <div class="example-demo">
            <div id="filter-table"></div>
          </div>
        </div>
        
        <!-- Paginated Table Section -->
        <div class="example-section">
          <div class="example-header">
            <h2>Pagination</h2>
            <div class="source-buttons">
              <button class="btn btn-sm btn-outline-primary" data-action="show-pagination-source">
                <i class="bi bi-code-slash me-1"></i>View Source
              </button>
            </div>
          </div>
          <p>Table with pagination controls.</p>
          
          <div class="example-demo">
            <div id="paginated-table"></div>
          </div>
        </div>
        
        <!-- Custom Rendering Section -->
        <div class="example-section">
          <div class="example-header">
            <h2>Custom Rendering</h2>
            <div class="source-buttons">
              <button class="btn btn-sm btn-outline-primary" data-action="show-custom-source">
                <i class="bi bi-code-slash me-1"></i>View Source
              </button>
            </div>
          </div>
          <p>Tables with custom cell rendering and formatting.</p>
          
          <div class="example-demo">
            <div id="custom-table"></div>
          </div>
        </div>
      </div>
    `;
  }
  
  async onAfterMount() {
    await super.onAfterMount();
    
    // Create all table demos
    this.createBasicTable();
    this.createSortableTable();
    this.createFilterTable();
    this.createPaginatedTable();
    this.createCustomTable();
  }
  
  createBasicTable() {
    const container = this.element.querySelector('#basic-table');
    
    const table = new Table({
      container: container,
      columns: [
        { key: 'id', title: 'ID' },
        { key: 'name', title: 'Name' },
        { key: 'email', title: 'Email' },
        { key: 'role', title: 'Role' }
      ],
      data: [
        { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'User' },
        { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'Manager' },
        { id: 4, name: 'Alice Brown', email: 'alice@example.com', role: 'User' }
      ]
    });
    
    table.init();
    table.render();
  }
  
  createSortableTable() {
    const container = this.element.querySelector('#sortable-table');
    
    const table = new Table({
      container: container,
      sortable: true,
      columns: [
        { key: 'name', title: 'Product', sortable: true },
        { key: 'price', title: 'Price', sortable: true },
        { key: 'stock', title: 'Stock', sortable: true },
        { key: 'category', title: 'Category', sortable: true }
      ],
      data: [
        { name: 'Laptop', price: 999, stock: 15, category: 'Electronics' },
        { name: 'Mouse', price: 25, stock: 50, category: 'Accessories' },
        { name: 'Keyboard', price: 75, stock: 30, category: 'Accessories' },
        { name: 'Monitor', price: 299, stock: 10, category: 'Electronics' },
        { name: 'Headphones', price: 89, stock: 25, category: 'Audio' }
      ]
    });
    
    table.init();
    table.render();
  }
  
  createFilterTable() {
    const container = this.element.querySelector('#filter-table');
    
    const table = new Table({
      container: container,
      searchable: true,
      filterable: true,
      columns: [
        { key: 'name', title: 'Name', searchable: true },
        { key: 'department', title: 'Department', searchable: true },
        { 
          key: 'status', 
          title: 'Status',
          filter: {
            type: 'select',
            options: [
              { value: '', label: 'All' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
              { value: 'pending', label: 'Pending' }
            ]
          }
        },
        { key: 'salary', title: 'Salary' }
      ],
      data: [
        { name: 'John Doe', department: 'Engineering', status: 'active', salary: 75000 },
        { name: 'Jane Smith', department: 'Marketing', status: 'active', salary: 65000 },
        { name: 'Bob Johnson', department: 'Sales', status: 'inactive', salary: 55000 },
        { name: 'Alice Brown', department: 'Engineering', status: 'active', salary: 80000 },
        { name: 'Charlie Wilson', department: 'HR', status: 'pending', salary: 50000 },
        { name: 'Diana Prince', department: 'Marketing', status: 'active', salary: 70000 }
      ]
    });
    
    table.init();
    table.render();
  }
  
  createPaginatedTable() {
    const container = this.element.querySelector('#paginated-table');
    
    // Generate more data for pagination
    const data = [];
    for (let i = 1; i <= 50; i++) {
      data.push({
        id: i,
        name: `User ${i}`,
        email: `user${i}@example.com`,
        created: new Date(Date.now() - Math.random() * 10000000000).toLocaleDateString()
      });
    }
    
    const table = new Table({
      container: container,
      paginated: true,
      itemsPerPage: 10,
      columns: [
        { key: 'id', title: 'ID' },
        { key: 'name', title: 'Name' },
        { key: 'email', title: 'Email' },
        { key: 'created', title: 'Created Date' }
      ],
      data: data
    });
    
    table.init();
    table.render();
  }
  
  createCustomTable() {
    const container = this.element.querySelector('#custom-table');
    
    const table = new Table({
      container: container,
      columns: [
        { 
          key: 'name', 
          title: 'Product',
          render: (item) => `<strong>${item.name}</strong>`
        },
        { 
          key: 'price', 
          title: 'Price',
          render: (item) => `<span class="text-success">$${item.price.toFixed(2)}</span>`
        },
        { 
          key: 'inStock', 
          title: 'Availability',
          render: (item) => item.inStock ? 
            '<span class="badge bg-success">In Stock</span>' : 
            '<span class="badge bg-danger">Out of Stock</span>'
        },
        { 
          key: 'rating', 
          title: 'Rating',
          render: (item) => {
            const stars = '★'.repeat(Math.floor(item.rating)) + 
                         '☆'.repeat(5 - Math.floor(item.rating));
            return `<span style="color: gold;">${stars}</span> (${item.rating})`;
          }
        }
      ],
      data: [
        { name: 'Premium Laptop', price: 1299, inStock: true, rating: 4.5 },
        { name: 'Wireless Mouse', price: 39.99, inStock: false, rating: 4.0 },
        { name: 'USB-C Hub', price: 49.99, inStock: true, rating: 4.8 },
        { name: 'Mechanical Keyboard', price: 149, inStock: true, rating: 4.7 },
        { name: 'Webcam HD', price: 79.99, inStock: false, rating: 3.5 }
      ]
    });
    
    table.init();
    table.render();
  }
  
  // Source code viewing actions
  async onActionShowBasicSource() {
    const code = `const table = new Table({
  container: container,
  columns: [
    { key: 'id', title: 'ID' },
    { key: 'name', title: 'Name' },
    { key: 'email', title: 'Email' },
    { key: 'role', title: 'Role' }
  ],
  data: [
    { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'User' }
  ]
});

table.init();
table.render();`;
    
    await Dialog.showCode({
      title: 'Basic Table Source',
      code: code,
      language: 'javascript'
    });
  }
  
  async onActionShowSortableSource() {
    const code = `const table = new Table({
  container: container,
  sortable: true,
  columns: [
    { key: 'name', title: 'Product', sortable: true },
    { key: 'price', title: 'Price', sortable: true },
    { key: 'stock', title: 'Stock', sortable: true }
  ],
  data: data
});

// Sorting happens automatically when clicking column headers`;
    
    await Dialog.showCode({
      title: 'Sortable Table Source',
      code: code,
      language: 'javascript'
    });
  }
  
  async onActionShowFilterSource() {
    const code = `const table = new Table({
  container: container,
  searchable: true,
  filterable: true,
  columns: [
    { key: 'name', title: 'Name', searchable: true },
    { 
      key: 'status', 
      title: 'Status',
      filter: {
        type: 'select',
        options: [
          { value: '', label: 'All' },
          { value: 'active', label: 'Active' },
          { value: 'inactive', label: 'Inactive' }
        ]
      }
    }
  ],
  data: data
});`;
    
    await Dialog.showCode({
      title: 'Searchable & Filterable Table Source',
      code: code,
      language: 'javascript'
    });
  }
  
  async onActionShowPaginationSource() {
    const code = `const table = new Table({
  container: container,
  paginated: true,
  itemsPerPage: 10,
  columns: columns,
  data: data // Large dataset
});

// Pagination controls are automatically added`;
    
    await Dialog.showCode({
      title: 'Paginated Table Source',
      code: code,
      language: 'javascript'
    });
  }
  
  async onActionShowCustomSource() {
    const code = `const table = new Table({
  container: container,
  columns: [
    { 
      key: 'name', 
      title: 'Product',
      render: (item) => \`<strong>\${item.name}</strong>\`
    },
    { 
      key: 'price', 
      title: 'Price',
      render: (item) => \`<span class="text-success">$\${item.price.toFixed(2)}</span>\`
    },
    { 
      key: 'inStock', 
      title: 'Availability',
      render: (item) => item.inStock ? 
        '<span class="badge bg-success">In Stock</span>' : 
        '<span class="badge bg-danger">Out of Stock</span>'
    }
  ],
  data: data
});`;
    
    await Dialog.showCode({
      title: 'Custom Rendering Source',
      code: code,
      language: 'javascript'
    });
  }
}

export default TablesPage;