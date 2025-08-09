/**
 * TablePage Example - Demonstrates URL-synchronized table with pagination, sorting, and filtering
 */

import TablePage from '../../src/components/TablePage.js';
import Router from '../../src/core/Router.js';

// Mock data generator
function generateMockData(count = 100) {
    const statuses = ['Active', 'Pending', 'Inactive', 'Completed'];
    const categories = ['Technology', 'Finance', 'Healthcare', 'Education', 'Retail'];
    const priorities = ['Low', 'Medium', 'High', 'Critical'];
    
    const data = [];
    for (let i = 1; i <= count; i++) {
        data.push({
            id: i,
            name: `Item ${i}`,
            email: `user${i}@example.com`,
            status: statuses[Math.floor(Math.random() * statuses.length)],
            category: categories[Math.floor(Math.random() * categories.length)],
            priority: priorities[Math.floor(Math.random() * priorities.length)],
            amount: Math.floor(Math.random() * 10000) + 100,
            created: new Date(Date.now() - Math.floor(Math.random() * 90) * 24 * 60 * 60 * 1000).toLocaleDateString(),
            progress: Math.floor(Math.random() * 100)
        });
    }
    return data;
}

// Create mock collection
class MockCollection {
    constructor(data) {
        this.models = data;
        this.restEnabled = false; // Using local data
        this.meta = {
            total: data.length
        };
    }
    
    async fetch(options = {}) {
        // Simulate async fetch
        return Promise.resolve(this.models);
    }
}

// Define table columns
const columns = [
    {
        key: 'id',
        label: 'ID',
        sortable: true,
        width: '60px'
    },
    {
        key: 'name',
        label: 'Name',
        sortable: true,
        searchable: true
    },
    {
        key: 'email',
        label: 'Email',
        sortable: true,
        searchable: true
    },
    {
        key: 'status',
        label: 'Status',
        sortable: true,
        filterable: true,
        formatter: (value) => {
            const badges = {
                'Active': 'success',
                'Pending': 'warning',
                'Inactive': 'secondary',
                'Completed': 'info'
            };
            return `<span class="badge bg-${badges[value] || 'secondary'}">${value}</span>`;
        }
    },
    {
        key: 'category',
        label: 'Category',
        sortable: true,
        filterable: true
    },
    {
        key: 'priority',
        label: 'Priority',
        sortable: true,
        filterable: true,
        formatter: (value) => {
            const colors = {
                'Low': 'text-success',
                'Medium': 'text-warning',
                'High': 'text-danger',
                'Critical': 'text-danger fw-bold'
            };
            return `<span class="${colors[value] || ''}">${value}</span>`;
        }
    },
    {
        key: 'amount',
        label: 'Amount',
        sortable: true,
        formatter: (value) => `$${value.toLocaleString()}`
    },
    {
        key: 'progress',
        label: 'Progress',
        sortable: true,
        formatter: (value) => `
            <div class="progress" style="height: 20px;">
                <div class="progress-bar" role="progressbar" 
                     style="width: ${value}%;" 
                     aria-valuenow="${value}" 
                     aria-valuemin="0" 
                     aria-valuemax="100">
                    ${value}%
                </div>
            </div>
        `
    },
    {
        key: 'created',
        label: 'Created',
        sortable: true
    }
];

// Define filters
const filters = {
    status: {
        type: 'select',
        label: 'Status',
        options: [
            { value: '', label: 'All Statuses' },
            { value: 'Active', label: 'Active' },
            { value: 'Pending', label: 'Pending' },
            { value: 'Inactive', label: 'Inactive' },
            { value: 'Completed', label: 'Completed' }
        ]
    },
    category: {
        type: 'select',
        label: 'Category',
        options: [
            { value: '', label: 'All Categories' },
            { value: 'Technology', label: 'Technology' },
            { value: 'Finance', label: 'Finance' },
            { value: 'Healthcare', label: 'Healthcare' },
            { value: 'Education', label: 'Education' },
            { value: 'Retail', label: 'Retail' }
        ]
    },
    priority: {
        type: 'select',
        label: 'Priority',
        options: [
            { value: '', label: 'All Priorities' },
            { value: 'Low', label: 'Low' },
            { value: 'Medium', label: 'Medium' },
            { value: 'High', label: 'High' },
            { value: 'Critical', label: 'Critical' }
        ]
    }
};

// Create the TablePage
class DataTablePage extends TablePage {
    constructor(options = {}) {
        super({
            page_name: 'DataTable',
            route: '/',
            title: 'Data Management',
            description: 'Browse and manage your data with URL-synchronized pagination, sorting, and filtering',
            
            // Table configuration
            collection: new MockCollection(generateMockData(150)),
            columns: columns,
            filters: filters,
            
            // Table options
            tableOptions: {
                selectable: true,
                searchable: true,
                sortable: true,
                filterable: true,
                paginated: true,
                striped: true,
                hover: true,
                searchPlacement: 'toolbar'
            },
            
            // URL parameter options
            urlOptions: {
                updateUrl: true,
                replaceState: false,
                debounceDelay: 300
            },
            
            // Items per page
            itemsPerPage: 10,
            
            ...options
        });
    }
    
    /**
     * Override getTemplate to provide custom header
     */
    async getTemplate() {
        // If a custom template was provided, use it
        if (this.template) {
            return this.template;
        }
        
        // Otherwise return our custom template
        return `
            <div class="container-fluid">
                <div class="row mb-4">
                    <div class="col-12">
                        <div class="card border-0 shadow-sm">
                            <div class="card-body">
                                <h3 class="card-title mb-2">
                                    <i class="bi bi-database"></i> {{title}}
                                </h3>
                                <p class="card-text text-muted">{{description}}</p>
                                
                                <div class="alert alert-info alert-dismissible fade show" role="alert">
                                    <i class="bi bi-info-circle"></i>
                                    <strong>Try these features:</strong>
                                    <ul class="mb-0 mt-2">
                                        <li>Change pages using the pagination controls</li>
                                        <li>Click column headers to sort</li>
                                        <li>Use the search box to filter data</li>
                                        <li>Apply filters using the filter dropdown</li>
                                        <li>Change items per page</li>
                                        <li>Select rows using checkboxes</li>
                                    </ul>
                                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="row">
                    <div class="col-12">
                        <div class="card border-0 shadow-sm">
                            <div class="card-body p-0">
                                <div id="{{tableContainerId}}" class="table-container"></div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="row mt-3">
                    <div class="col-12">
                        <div class="selected-items-info text-muted small"></div>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * After render hook
     */
    async onAfterRender() {
        await super.onAfterRender();
        
        // Update selected items display when selection changes
        if (this.table) {
            this.table.on('selection:change', () => {
                this.updateSelectedItemsDisplay();
            });
        }
    }
    
    /**
     * Update selected items display
     */
    updateSelectedItemsDisplay() {
        const selectedItems = this.getSelectedItems();
        const display = this.element.querySelector('.selected-items-info');
        
        if (display) {
            if (selectedItems.length > 0) {
                display.innerHTML = `
                    <i class="bi bi-check2-square"></i>
                    ${selectedItems.length} item(s) selected
                `;
            } else {
                display.innerHTML = '';
            }
        }
    }
}

// Initialize the application
async function initApp() {
    console.log('🚀 Initializing TablePage Example App');
    
    // Create router instance
    const router = new Router({
        mode: 'param',
        container: '#app'
    });
    
    // Make router globally available
    window.MOJO = window.MOJO || {};
    window.MOJO.router = router;
    
    // Create and register the table page
    const tablePage = new DataTablePage();
    router.addRoute('/', tablePage);
    router.addRoute('/table', tablePage);
    
    // Register page name for data-page navigation
    router.registerPageName('table', '/');
    
    // Start the router
    router.start();
    
    console.log('✅ TablePage Example App ready');
    console.log('📊 Table will sync with URL parameters automatically');
    console.log('🔗 Current URL params:', window.location.search);
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Export for debugging
window.TablePageExample = {
    DataTablePage,
    generateMockData,
    columns,
    filters
};