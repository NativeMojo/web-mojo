/**
 * ProductsTablePage - A proper TablePage implementation for managing products
 * Demonstrates TablePage pattern with product inventory management
 */

import TablePage from '../../../src/components/TablePage.js';
import Model from '../../../src/core/Model.js';
import DataList from '../../../src/core/DataList.js';
import Dialog from '../../../src/components/Dialog.js';
import { FormBuilder } from '../../../src/components/FormBuilder.js';

/**
 * Product model for the products collection
 */
class ProductModel extends Model {
    constructor(attributes = {}) {
        super(attributes);
        this.endpoint = '/api/products';
    }
    
    get displayPrice() {
        const price = this.get('price') || 0;
        return window.MOJO.dataFormatter.apply('currency', price);
    }
    
    get stockStatus() {
        const stock = this.get('stock') || 0;
        if (stock === 0) return 'out-of-stock';
        if (stock < 10) return 'low-stock';
        return 'in-stock';
    }
    
    get stockStatusLabel() {
        const status = this.stockStatus;
        return {
            'out-of-stock': 'Out of Stock',
            'low-stock': 'Low Stock',
            'in-stock': 'In Stock'
        }[status];
    }
    
    get stockStatusClass() {
        const status = this.stockStatus;
        return {
            'out-of-stock': 'text-danger',
            'low-stock': 'text-warning',
            'in-stock': 'text-success'
        }[status];
    }
}

/**
 * Products collection
 */
class ProductsCollection extends DataList {
    constructor(options = {}) {
        super(ProductModel, {
            ...options,
            endpoint: '/api/products'
        });
    }
    
    // Custom collection methods
    getTotalValue() {
        return this.models.reduce((total, model) => {
            return total + (model.get('price') * model.get('stock'));
        }, 0);
    }
    
    getLowStockItems() {
        return this.models.filter(model => model.stockStatus === 'low-stock');
    }
    
    getOutOfStockItems() {
        return this.models.filter(model => model.stockStatus === 'out-of-stock');
    }
}

/**
 * ProductsTablePage - Manages the products table with inventory operations
 */
export default class ProductsTablePage extends TablePage {
    constructor(options = {}) {
        super({
            ...options,
            pageName: 'products',
            title: 'Product Inventory',
            
            // Collection configuration
            Collection: ProductsCollection,
            
            // Column definitions
            columns: [
                {
                    field: 'sku',
                    label: 'SKU',
                    width: '100px',
                    sortable: true,
                    searchable: true,
                    formatter: 'uppercase'  // Simple string formatter
                },
                {
                    field: 'image',
                    label: '',
                    width: '60px',
                    formatter: (value, model) => {
                        const url = value || 'https://via.placeholder.com/50x50/cccccc/666666?text=No+Image';
                        return `<img src="${url}" class="rounded" width="50" height="50" alt="${model.get('name')}">`;
                    }
                },
                {
                    field: 'name',
                    label: 'Product Name',
                    sortable: true,
                    searchable: true,
                    formatter: 'capitalize(true)'  // Capitalize all words
                },
                {
                    field: 'category',
                    label: 'Category',
                    sortable: true,
                    filter: 'select',
                    filterOptions: [
                        { value: '', label: 'All Categories' },
                        { value: 'Electronics', label: 'Electronics' },
                        { value: 'Clothing', label: 'Clothing' },
                        { value: 'Food', label: 'Food' },
                        { value: 'Books', label: 'Books' },
                        { value: 'Toys', label: 'Toys' },
                        { value: 'Home', label: 'Home & Garden' }
                    ],
                    visible: false  // Hidden since shown in name column
                },
                {
                    field: 'price',
                    label: 'Price',
                    sortable: true,
                    align: 'right',
                    formatter: "currency|default('Free')"  // Pipe syntax with default
                },
                {
                    field: 'stock',
                    label: 'Stock',
                    sortable: true,
                    align: 'center',
                    filter: 'custom',
                    filterType: 'stock-status',
                    formatter: 'stockLevel'  // Custom registered formatter
                },
                {
                    field: 'status',
                    label: 'Status',
                    sortable: true,
                    filter: 'select',
                    filterOptions: [
                        { value: '', label: 'All Statuses' },
                        { value: 'active', label: 'Active' },
                        { value: 'inactive', label: 'Inactive' },
                        { value: 'discontinued', label: 'Discontinued' }
                    ],
                    formatter: 'status'  // Use built-in status formatter
                },
                {
                    field: 'value',
                    label: 'Total Value',
                    sortable: false,
                    align: 'right',
                    formatter: (value, context) => {
                        const total = context.row.price * context.row.stock;
                        return window.MOJO.dataFormatter.apply('currency', total);
                    }
                },
                {
                    field: 'actions',
                    label: '',
                    type: 'actions',
                    width: '150px',
                    actions: [
                        {
                            icon: 'bi-eye',
                            label: 'View',
                            class: 'btn-sm btn-outline-primary',
                            action: 'view'
                        },
                        {
                            icon: 'bi-pencil',
                            label: 'Edit',
                            class: 'btn-sm btn-outline-secondary',
                            action: 'edit'
                        },
                        {
                            icon: 'bi-box-seam',
                            label: 'Stock',
                            class: 'btn-sm btn-outline-info',
                            action: 'adjust-stock'
                        },
                        {
                            icon: 'bi-trash',
                            label: 'Delete',
                            class: 'btn-sm btn-outline-danger',
                            action: 'delete'
                        }
                    ]
                }
            ],
            
            // Initial filters - show only active products
            filters: {
                status: 'active'
            },
            
            // Collection params for API
            collectionParams: {
                sort: 'name',
                order: 'asc',
                limit: 20
            },
            
            // Enable group filtering
            groupFiltering: true,
            
            // Table options
            listOptions: {
                selectable: true,
                multiSelect: true,
                showSearch: true,
                showFilters: true,
                showPagination: true,
                showExport: true,
                showBulkActions: true,
                itemsPerPage: 20,
                itemsPerPageOptions: [10, 20, 50, 100],
                showSummary: true  // Show inventory summary
            }
        });
        
        // Initialize dialogs
        this.productDialog = null;
        this.stockDialog = null;
        this.confirmDialog = null;
        this.formBuilder = null;
        
        // Register custom formatters for this page
        this.registerCustomFormatters();
    }
    
    /**
     * Register custom formatters specific to products
     */
    registerCustomFormatters() {
        // Register a custom stock level formatter
        if (!window.MOJO.dataFormatter.has('stockLevel')) {
            window.MOJO.dataFormatter.register('stockLevel', (value) => {
                const stock = value || 0;
                let color, label, icon;
                
                if (stock === 0) {
                    color = 'danger';
                    label = 'Out of Stock';
                    icon = '🔴';
                } else if (stock < 10) {
                    color = 'warning';
                    label = 'Low Stock';
                    icon = '🟡';
                } else {
                    color = 'success';
                    label = 'In Stock';
                    icon = '🟢';
                }
                
                const formatted = window.MOJO.dataFormatter.apply('number', stock, 0);
                return `
                    <div class="text-${color}">
                        <strong>${icon} ${formatted}</strong>
                        <small class="d-block">${label}</small>
                    </div>
                `;
            });
        }
        
        // Register a sale price formatter
        if (!window.MOJO.dataFormatter.has('salePrice')) {
            window.MOJO.dataFormatter.register('salePrice', (value, originalPrice) => {
                if (!originalPrice || value >= originalPrice) {
                    return window.MOJO.dataFormatter.apply('currency', value);
                }
                
                const discount = Math.round(((originalPrice - value) / originalPrice) * 100);
                const originalFormatted = window.MOJO.dataFormatter.apply('currency', originalPrice);
                const saleFormatted = window.MOJO.dataFormatter.apply('currency', value);
                
                return `
                    <div>
                        <s class="text-muted small">${originalFormatted}</s>
                        <strong class="text-danger">${saleFormatted}</strong>
                        <span class="badge bg-danger ms-1">-${discount}%</span>
                    </div>
                `;
            });
        }
    }
    
    /**
     * Initialize the page
     */
    async onInit() {
        await super.onInit();
        
        // Add page-specific toolbar actions
        this.addToolbarAction('add', {
            label: 'Add Product',
            icon: 'bi-plus-circle',
            class: 'btn-primary',
            position: 'left'
        });
        
        this.addToolbarAction('import', {
            label: 'Import',
            icon: 'bi-upload',
            class: 'btn-outline-secondary',
            position: 'right'
        });
        
        this.addToolbarAction('export', {
            label: 'Export',
            icon: 'bi-download',
            class: 'btn-outline-secondary',
            position: 'right'
        });
        
        this.addToolbarAction('report', {
            label: 'Inventory Report',
            icon: 'bi-file-earmark-bar-graph',
            class: 'btn-outline-info',
            position: 'right'
        });
        
        // Set up bulk actions
        this.setBulkActions([
            {
                label: 'Update Price',
                icon: 'bi-tag',
                action: 'bulk-price',
                class: 'btn-warning'
            },
            {
                label: 'Mark Active',
                icon: 'bi-check-circle',
                action: 'bulk-activate',
                class: 'btn-success'
            },
            {
                label: 'Mark Inactive',
                icon: 'bi-x-circle',
                action: 'bulk-deactivate',
                class: 'btn-secondary'
            },
            {
                label: 'Delete',
                icon: 'bi-trash',
                action: 'bulk-delete',
                class: 'btn-danger',
                confirm: true
            }
        ]);
        
        // Add custom filters for stock status
        // TODO: Implement addCustomFilter method in TablePage
        /* this.addCustomFilter('stock-status', {
            type: 'button-group',
            options: [
                { value: '', label: 'All', class: 'btn-outline-secondary' },
                { value: 'in-stock', label: 'In Stock', class: 'btn-outline-success' },
                { value: 'low-stock', label: 'Low Stock', class: 'btn-outline-warning' },
                { value: 'out-of-stock', label: 'Out of Stock', class: 'btn-outline-danger' }
            ]
        }); */
        
        // Load sample data if no API endpoint
        if (!window.MOJO?.rest?.configured) {
            this.loadSampleData();
        }
        
        // Update summary
        this.updateInventorySummary();
    }
    
    /**
     * Update inventory summary display
     */
    updateInventorySummary() {
        if (!this.collection) return;
        
        const totalValue = this.collection.getTotalValue();
        const lowStock = this.collection.getLowStockItems().length;
        const outOfStock = this.collection.getOutOfStockItems().length;
        
        this.setSummary(`
            <div class="d-flex gap-4">
                <div>
                    <small class="text-muted">Total Value:</small>
                    <strong class="d-block">${new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD'
                    }).format(totalValue)}</strong>
                </div>
                <div>
                    <small class="text-muted">Total Products:</small>
                    <strong class="d-block">${this.collection.length}</strong>
                </div>
                <div>
                    <small class="text-muted">Low Stock:</small>
                    <strong class="d-block text-warning">${lowStock}</strong>
                </div>
                <div>
                    <small class="text-muted">Out of Stock:</small>
                    <strong class="d-block text-danger">${outOfStock}</strong>
                </div>
            </div>
        `);
    }
    
    /**
     * Handle item click - view product details
     */
    async onItemClicked(model, event) {
        await this.showProductDialog(model, 'view');
    }
    
    /**
     * Handle item double-click - edit product
     */
    async onItemDialog(model, event) {
        await this.showProductDialog(model, 'edit');
    }
    
    /**
     * Handle toolbar actions
     */
    async onActionAdd() {
        const newProduct = new ProductModel({
            status: 'active',
            stock: 0,
            price: 0
        });
        await this.showProductDialog(newProduct, 'create');
    }
    
    async onActionImport() {
        this.showInfo('Import functionality would open a CSV/Excel import wizard');
    }
    
    async onActionExport() {
        this.showInfo('Export functionality would download inventory as CSV/Excel');
    }
    
    async onActionReport() {
        // Show inventory report
        const totalValue = this.collection.getTotalValue();
        const lowStock = this.collection.getLowStockItems();
        const outOfStock = this.collection.getOutOfStockItems();
        
        const reportHtml = `
            <div class="inventory-report">
                <h5>Inventory Summary</h5>
                <table class="table table-sm">
                    <tr>
                        <td>Total Products:</td>
                        <td><strong>${this.collection.length}</strong></td>
                    </tr>
                    <tr>
                        <td>Total Inventory Value:</td>
                        <td><strong>${new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD'
                        }).format(totalValue)}</strong></td>
                    </tr>
                    <tr>
                        <td>Low Stock Items:</td>
                        <td><strong class="text-warning">${lowStock.length}</strong></td>
                    </tr>
                    <tr>
                        <td>Out of Stock Items:</td>
                        <td><strong class="text-danger">${outOfStock.length}</strong></td>
                    </tr>
                </table>
                
                ${lowStock.length > 0 ? `
                    <h6 class="mt-3">Low Stock Items</h6>
                    <ul class="list-unstyled">
                        ${lowStock.map(item => `
                            <li><small>${item.get('sku')} - ${item.get('name')} (${item.get('stock')} left)</small></li>
                        `).join('')}
                    </ul>
                ` : ''}
                
                ${outOfStock.length > 0 ? `
                    <h6 class="mt-3">Out of Stock Items</h6>
                    <ul class="list-unstyled">
                        ${outOfStock.map(item => `
                            <li><small>${item.get('sku')} - ${item.get('name')}</small></li>
                        `).join('')}
                    </ul>
                ` : ''}
            </div>
        `;
        
        const dialog = new Dialog({
            title: 'Inventory Report',
            content: reportHtml,
            size: 'lg',
            buttons: [
                {
                    label: 'Print',
                    icon: 'bi-printer',
                    class: 'btn-primary',
                    action: 'print'
                },
                {
                    label: 'Close',
                    class: 'btn-secondary',
                    action: 'close'
                }
            ]
        });
        
        dialog.on('action:print', () => {
            window.print();
        });
        
        await dialog.show();
    }
    
    /**
     * Handle row actions
     */
    async onActionView(model) {
        await this.showProductDialog(model, 'view');
    }
    
    async onActionEdit(model) {
        await this.showProductDialog(model, 'edit');
    }
    
    async onActionAdjustStock(model) {
        await this.showStockDialog(model);
    }
    
    async onActionDelete(model) {
        const confirmed = await this.showConfirm(
            `Are you sure you want to delete "${model.get('name')}"?`,
            'Delete Product',
            'Delete',
            'Cancel'
        );
        
        if (confirmed) {
            try {
                await model.destroy();
                this.collection.remove(model);
                this.refresh();
                this.updateInventorySummary();
                this.showSuccess(`Product "${model.get('name')}" deleted successfully`);
            } catch (error) {
                this.showError(`Failed to delete product: ${error.message}`);
            }
        }
    }
    
    /**
     * Handle bulk actions
     */
    async onActionBulkPrice() {
        const selected = this.getSelectedItems();
        if (selected.length === 0) {
            this.showWarning('No products selected');
            return;
        }
        
        // Show price adjustment dialog
        this.showInfo(`Price adjustment for ${selected.length} products - feature coming soon`);
    }
    
    async onActionBulkActivate() {
        const selected = this.getSelectedItems();
        if (selected.length === 0) {
            this.showWarning('No products selected');
            return;
        }
        
        for (const model of selected) {
            model.set('status', 'active');
        }
        
        this.refresh();
        this.showSuccess(`${selected.length} product(s) activated`);
    }
    
    async onActionBulkDeactivate() {
        const selected = this.getSelectedItems();
        if (selected.length === 0) {
            this.showWarning('No products selected');
            return;
        }
        
        for (const model of selected) {
            model.set('status', 'inactive');
        }
        
        this.refresh();
        this.showSuccess(`${selected.length} product(s) deactivated`);
    }
    
    async onActionBulkDelete() {
        const selected = this.getSelectedItems();
        if (selected.length === 0) {
            this.showWarning('No products selected');
            return;
        }
        
        const confirmed = await this.showConfirm(
            `Are you sure you want to delete ${selected.length} product(s)?`,
            'Delete Products',
            'Delete',
            'Cancel'
        );
        
        if (confirmed) {
            for (const model of selected) {
                this.collection.remove(model);
            }
            
            this.refresh();
            this.updateInventorySummary();
            this.showSuccess(`${selected.length} product(s) deleted`);
        }
    }
    
    /**
     * Show product dialog for view/edit/create
     */
    async showProductDialog(model, mode = 'view') {
        const isReadOnly = mode === 'view';
        const isNew = mode === 'create';
        
        // Create form fields
        const fields = [
            {
                name: 'sku',
                label: 'SKU',
                type: 'text',
                required: true,
                readonly: isReadOnly,
                value: model.get('sku'),
                placeholder: 'PRD-001'
            },
            {
                name: 'name',
                label: 'Product Name',
                type: 'text',
                required: true,
                readonly: isReadOnly,
                value: model.get('name')
            },
            {
                name: 'category',
                label: 'Category',
                type: 'select',
                required: true,
                readonly: isReadOnly,
                value: model.get('category') || 'Electronics',
                options: [
                    { value: 'Electronics', label: 'Electronics' },
                    { value: 'Clothing', label: 'Clothing' },
                    { value: 'Food', label: 'Food' },
                    { value: 'Books', label: 'Books' },
                    { value: 'Toys', label: 'Toys' },
                    { value: 'Home', label: 'Home & Garden' }
                ]
            },
            {
                name: 'description',
                label: 'Description',
                type: 'textarea',
                rows: 3,
                readonly: isReadOnly,
                value: model.get('description')
            },
            {
                name: 'price',
                label: 'Price ($)',
                type: 'number',
                step: 0.01,
                min: 0,
                required: true,
                readonly: isReadOnly,
                value: model.get('price')
            },
            {
                name: 'stock',
                label: 'Stock Quantity',
                type: 'number',
                min: 0,
                required: true,
                readonly: isReadOnly,
                value: model.get('stock')
            },
            {
                name: 'status',
                label: 'Status',
                type: 'select',
                required: true,
                readonly: isReadOnly,
                value: model.get('status') || 'active',
                options: [
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' },
                    { value: 'discontinued', label: 'Discontinued' }
                ]
            }
        ];
        
        // Create form
        this.formBuilder = new FormBuilder({
            fields: fields,
            submitButton: !isReadOnly,
            resetButton: !isReadOnly && !isNew
        });
        
        // Create dialog
        const title = isNew ? 'Add Product' : (isReadOnly ? 'View Product' : 'Edit Product');
        
        this.productDialog = new Dialog({
            title: title,
            size: 'lg',
            content: this.formBuilder.render(),
            buttons: isReadOnly ? [
                {
                    label: 'Close',
                    class: 'btn-secondary',
                    action: 'close'
                }
            ] : [
                {
                    label: 'Cancel',
                    class: 'btn-secondary',
                    action: 'cancel'
                },
                {
                    label: isNew ? 'Create' : 'Save',
                    class: 'btn-primary',
                    action: 'save'
                }
            ]
        });
        
        // Handle save action
        this.productDialog.on('action:save', async () => {
            if (this.formBuilder.validate()) {
                const data = this.formBuilder.getData();
                
                // Update model
                for (const [key, value] of Object.entries(data)) {
                    model.set(key, value);
                }
                
                try {
                    // In real app, would save to server
                    // await model.save();
                    
                    if (isNew) {
                        model.set('id', Date.now()); // Fake ID
                        this.collection.add(model);
                    }
                    
                    this.refresh();
                    this.updateInventorySummary();
                    this.productDialog.close();
                    this.showSuccess(isNew ? 'Product created successfully' : 'Product updated successfully');
                } catch (error) {
                    this.showError(`Failed to save product: ${error.message}`);
                }
            }
        });
        
        await this.productDialog.show();
    }
    
    /**
     * Show stock adjustment dialog
     */
    async showStockDialog(model) {
        const currentStock = model.get('stock');
        
        const fields = [
            {
                name: 'adjustment_type',
                label: 'Adjustment Type',
                type: 'radio',
                required: true,
                value: 'add',
                options: [
                    { value: 'add', label: 'Add Stock' },
                    { value: 'remove', label: 'Remove Stock' },
                    { value: 'set', label: 'Set Stock Level' }
                ]
            },
            {
                name: 'quantity',
                label: 'Quantity',
                type: 'number',
                min: 0,
                required: true,
                placeholder: '0'
            },
            {
                name: 'reason',
                label: 'Reason',
                type: 'textarea',
                rows: 2,
                placeholder: 'Optional reason for adjustment'
            }
        ];
        
        const formBuilder = new FormBuilder({
            fields: fields,
            submitButton: false
        });
        
        this.stockDialog = new Dialog({
            title: `Adjust Stock: ${model.get('name')}`,
            size: 'md',
            content: `
                <div class="mb-3">
                    <p class="mb-1">Current Stock: <strong>${currentStock}</strong></p>
                </div>
                ${formBuilder.render()}
            `,
            buttons: [
                {
                    label: 'Cancel',
                    class: 'btn-secondary',
                    action: 'cancel'
                },
                {
                    label: 'Apply',
                    class: 'btn-primary',
                    action: 'apply'
                }
            ]
        });
        
        this.stockDialog.on('action:apply', async () => {
            if (formBuilder.validate()) {
                const data = formBuilder.getData();
                let newStock = currentStock;
                
                switch (data.adjustment_type) {
                    case 'add':
                        newStock = currentStock + parseInt(data.quantity);
                        break;
                    case 'remove':
                        newStock = Math.max(0, currentStock - parseInt(data.quantity));
                        break;
                    case 'set':
                        newStock = parseInt(data.quantity);
                        break;
                }
                
                model.set('stock', newStock);
                this.refresh();
                this.updateInventorySummary();
                this.stockDialog.close();
                this.showSuccess(`Stock updated for ${model.get('name')}`);
            }
        });
        
        await this.stockDialog.show();
    }
    
    /**
     * Load sample data for demo
     */
    loadSampleData() {
        const sampleProducts = [
            {
                id: 1,
                sku: 'ELEC-001',
                name: 'Wireless Mouse',
                category: 'Electronics',
                description: 'Ergonomic wireless mouse with USB receiver',
                price: 29.99,
                stock: 45,
                status: 'active'
            },
            {
                id: 2,
                sku: 'ELEC-002',
                name: 'Mechanical Keyboard',
                category: 'Electronics',
                description: 'RGB backlit mechanical keyboard',
                price: 89.99,
                stock: 8,
                status: 'active'
            },
            {
                id: 3,
                sku: 'CLO-001',
                name: 'Cotton T-Shirt',
                category: 'Clothing',
                description: '100% cotton comfortable t-shirt',
                price: 19.99,
                stock: 120,
                status: 'active'
            },
            {
                id: 4,
                sku: 'BOOK-001',
                name: 'JavaScript Guide',
                category: 'Books',
                description: 'Complete guide to modern JavaScript',
                price: 39.99,
                stock: 0,
                status: 'active'
            },
            {
                id: 5,
                sku: 'ELEC-003',
                name: 'USB-C Cable',
                category: 'Electronics',
                description: '2m USB-C to USB-C cable',
                price: 12.99,
                stock: 200,
                status: 'active'
            },
            {
                id: 6,
                sku: 'TOY-001',
                name: 'Building Blocks Set',
                category: 'Toys',
                description: '500-piece creative building set',
                price: 49.99,
                stock: 3,
                status: 'active'
            },
            {
                id: 7,
                sku: 'HOME-001',
                name: 'LED Desk Lamp',
                category: 'Home',
                description: 'Adjustable LED desk lamp with touch control',
                price: 34.99,
                stock: 25,
                status: 'inactive'
            },
            {
                id: 8,
                sku: 'FOOD-001',
                name: 'Organic Coffee Beans',
                category: 'Food',
                description: 'Premium organic coffee beans 1kg',
                price: 24.99,
                stock: 60,
                status: 'active'
            },
            {
                id: 9,
                sku: 'ELEC-004',
                name: 'Laptop Stand',
                category: 'Electronics',
                description: 'Adjustable aluminum laptop stand',
                price: 45.99,
                stock: 0,
                status: 'discontinued'
            },
            {
                id: 10,
                sku: 'CLO-002',
                name: 'Denim Jeans',
                category: 'Clothing',
                description: 'Classic fit denim jeans',
                price: 59.99,
                stock: 85,
                status: 'active'
            }
        ];
        
        // Create collection with sample data
        this.collection = new ProductsCollection();
        for (const productData of sampleProducts) {
            this.collection.add(new ProductModel(productData));
        }
        
        // Mark as preloaded to skip fetch
        this.options.preloaded = true;
    }
}