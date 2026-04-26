import { Page, FormView, MOJOUtils } from 'web-mojo';

/**
 * SearchFilterFormExample — live search/filter form driving a result list.
 *
 * Doc:    docs/web-mojo/forms/SearchFilterForms.md
 * Route:  forms/search-filter-form
 *
 * Three moving parts:
 *   1. A FormView with the search box + filter fields (no submit button).
 *   2. A debounced `form:changed` handler that reads the values and applies
 *      them. We use `MOJOUtils.debounce` so keystroke bursts collapse into
 *      one filter pass.
 *   3. A result list — here a small client-side array we filter and re-render.
 *
 * Reset uses `setFormData(defaults)` — `reset()` would clear sliders to 0/0
 * instead of full range.
 */
class SearchFilterFormExample extends Page {
    static pageName = 'forms/search-filter-form';
    static route = 'forms/search-filter-form';

    static PRODUCTS = [
        { name: 'Laptop Pro 15',       category: 'electronics', price: 1299, stock: 8 },
        { name: 'Wireless Earbuds',    category: 'electronics', price: 149,  stock: 23 },
        { name: 'Mechanical Keyboard', category: 'electronics', price: 219,  stock: 0 },
        { name: 'Cotton T-Shirt',      category: 'clothing',    price: 24,   stock: 130 },
        { name: 'Denim Jacket',        category: 'clothing',    price: 89,   stock: 12 },
        { name: 'Running Shoes',       category: 'clothing',    price: 119,  stock: 0 },
        { name: 'Hardback Notebook',   category: 'office',      price: 14,   stock: 60 },
        { name: 'Standing Desk',       category: 'office',      price: 449,  stock: 4 },
        { name: 'Mug — 16oz',          category: 'kitchen',     price: 12,   stock: 200 },
        { name: 'French Press',        category: 'kitchen',     price: 38,   stock: 0 },
    ];

    static DEFAULTS = {
        search: '', category: 'all', min_price: 0, max_price: 1500, in_stock: false,
    };

    constructor(options = {}) {
        super({
            ...options,
            pageName: SearchFilterFormExample.pageName,
            route: SearchFilterFormExample.route,
            title: 'Search & filter form',
            template: SearchFilterFormExample.TEMPLATE,
        });
        this.results = SearchFilterFormExample.PRODUCTS.slice();
    }

    async onInit() {
        await super.onInit();

        this.filterForm = new FormView({
            containerId: 'filter-form',
            defaults: SearchFilterFormExample.DEFAULTS,
            fields: [
                { type: 'text', name: 'search', label: 'Search', placeholder: 'Search products...' },
                { type: 'select', name: 'category', label: 'Category', options: [
                    { value: 'all', label: 'All categories' },
                    { value: 'electronics', label: 'Electronics' },
                    { value: 'clothing', label: 'Clothing' },
                    { value: 'office', label: 'Office' },
                    { value: 'kitchen', label: 'Kitchen' },
                ]},
                { type: 'range', name: 'min_price', label: 'Min price', min: 0, max: 1500, step: 10 },
                { type: 'range', name: 'max_price', label: 'Max price', min: 0, max: 1500, step: 10 },
                { type: 'switch', name: 'in_stock', label: 'In stock only' },
                { type: 'button', label: 'Clear filters', action: 'clear-filters',
                    buttonClass: 'btn-outline-secondary w-100' },
            ],
        });
        this.addChild(this.filterForm);

        // FormView does not debounce its events — user code is responsible.
        this.applyFiltersDebounced = MOJOUtils.debounce(() => this.applyFilters(), 200);
        this.filterForm.on('form:changed', () => this.applyFiltersDebounced());
    }

    async applyFilters() {
        const f = await this.filterForm.getFormData();
        const search = (f.search || '').toLowerCase();
        const min = Number(f.min_price ?? 0);
        const max = Number(f.max_price ?? Infinity);
        this.results = SearchFilterFormExample.PRODUCTS.filter((p) => {
            if (search && !p.name.toLowerCase().includes(search)) return false;
            if (f.category && f.category !== 'all' && p.category !== f.category) return false;
            if (p.price < min || p.price > max) return false;
            if (f.in_stock && p.stock <= 0) return false;
            return true;
        });
        this.render();
    }

    async onActionClearFilters(event) {
        event.preventDefault();
        // setFormData() — `reset()` would clear sliders to 0/0 not 0/1500.
        this.filterForm.setFormData(SearchFilterFormExample.DEFAULTS);
        await this.applyFilters();
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>Search &amp; filter form</h1>
            <p class="example-summary">
                A FormView whose only job is to drive a result list. No submit — every
                <code>form:changed</code> event runs a debounced filter pass.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/forms/SearchFilterForms.md">
                    docs/web-mojo/forms/SearchFilterForms.md
                </a>
            </p>

            <div class="row g-4">
                <div class="col-lg-4">
                    <div class="card">
                        <div class="card-header">Filters</div>
                        <div class="card-body"><div data-container="filter-form"></div></div>
                    </div>
                </div>
                <div class="col-lg-8">
                    <div class="card">
                        <div class="card-header d-flex justify-content-between">
                            <span>Products</span>
                            <span class="badge bg-primary">{{results.length}} result{{#results.length}}{{/results.length}}</span>
                        </div>
                        <div class="list-group list-group-flush">
                            {{#results}}<div class="list-group-item d-flex justify-content-between align-items-center">
                                <div>
                                    <strong>{{.name}}</strong>
                                    <div class="text-muted small">{{.category}} · stock: {{.stock}}</div>
                                </div>
                                <span class="badge text-bg-light">\${{.price}}</span>
                            </div>{{/results}}
                            {{^results.length}}<div class="list-group-item text-muted text-center py-4">
                                <i class="bi bi-search"></i> No products match the current filters.
                            </div>{{/results.length}}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export default SearchFilterFormExample;
