import Page from '../../../src/core/Page.js';

export default class NavigationPage extends Page {
    constructor(options = {}) {
        super({
            ...options,
            pageName: 'navigation',
            title: 'Navigation'
        });
        this.navigationHistory = [];
    }

    async onInit() {
        // Track navigation events
        this.navigationHistory = [];
    }

    getTemplate() {
        return `
            <div class="container-fluid p-3">
                <h2 class="mb-4">Navigation Examples</h2>
                
                <!-- Basic Navigation -->
                <div class="card mb-3">
                    <div class="card-header">
                        <h5 class="mb-0">Basic Navigation Methods</h5>
                    </div>
                    <div class="card-body">
                        <p class="text-muted mb-3">MOJO supports multiple navigation patterns:</p>
                        
                        <div class="row">
                            <div class="col-md-6">
                                <h6>1. Href-based Navigation</h6>
                                <p class="small text-muted">Standard links using href attributes</p>
                                <div class="btn-group-vertical w-100 mb-3">
                                    <a href="?page=home" class="btn btn-sm btn-outline-primary text-start">
                                        <i class="bi bi-house"></i> Home Page
                                    </a>
                                    <a href="?page=components" class="btn btn-sm btn-outline-primary text-start">
                                        <i class="bi bi-puzzle"></i> Components
                                    </a>
                                    <a href="?page=tables" class="btn btn-sm btn-outline-primary text-start">
                                        <i class="bi bi-table"></i> Tables
                                    </a>
                                </div>
                            </div>
                            
                            <div class="col-md-6">
                                <h6>2. Data-page Navigation</h6>
                                <p class="small text-muted">Enhanced navigation with parameters</p>
                                <div class="btn-group-vertical w-100 mb-3">
                                    <button class="btn btn-sm btn-outline-success text-start" 
                                            data-page="home" 
                                            data-params='{"section": "intro"}'>
                                        <i class="bi bi-house"></i> Home (Intro Section)
                                    </button>
                                    <button class="btn btn-sm btn-outline-success text-start" 
                                            data-page="tables" 
                                            data-params='{"filter": "active", "sort": "name"}'>
                                        <i class="bi bi-table"></i> Tables (Filtered)
                                    </button>
                                    <button class="btn btn-sm btn-outline-success text-start" 
                                            data-page="forms" 
                                            data-params='{"mode": "edit", "id": 123}'>
                                        <i class="bi bi-pencil-square"></i> Forms (Edit Mode)
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Programmatic Navigation -->
                <div class="card mb-3">
                    <div class="card-header">
                        <h5 class="mb-0">Programmatic Navigation</h5>
                    </div>
                    <div class="card-body">
                        <p class="text-muted mb-3">Navigate using JavaScript code:</p>
                        
                        <div class="row">
                            <div class="col-md-4">
                                <label class="form-label">Page Name</label>
                                <select id="nav-page" class="form-select form-select-sm mb-2">
                                    <option value="home">Home</option>
                                    <option value="components">Components</option>
                                    <option value="tables">Tables</option>
                                    <option value="forms">Forms</option>
                                    <option value="dialogs">Dialogs</option>
                                </select>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">Parameter (optional)</label>
                                <input type="text" id="nav-param-key" class="form-control form-control-sm mb-2" placeholder="param name">
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">Value (optional)</label>
                                <input type="text" id="nav-param-value" class="form-control form-control-sm mb-2" placeholder="param value">
                            </div>
                        </div>
                        
                        <button class="btn btn-sm btn-primary" data-action="navigateProgrammatic">
                            <i class="bi bi-arrow-right-circle"></i> Navigate
                        </button>
                        <button class="btn btn-sm btn-secondary ms-2" data-action="navigateBack">
                            <i class="bi bi-arrow-left-circle"></i> Go Back
                        </button>
                        <button class="btn btn-sm btn-info ms-2" data-action="refreshPage">
                            <i class="bi bi-arrow-clockwise"></i> Refresh Page
                        </button>
                    </div>
                </div>

                <!-- External Links -->
                <div class="card mb-3">
                    <div class="card-header">
                        <h5 class="mb-0">External Links</h5>
                    </div>
                    <div class="card-body">
                        <p class="text-muted mb-3">Navigate to external URLs using data-external attribute:</p>
                        
                        <div class="btn-group">
                            <a href="https://getbootstrap.com" 
                               data-external="true" 
                               class="btn btn-sm btn-outline-info">
                                <i class="bi bi-box-arrow-up-right"></i> Bootstrap Docs
                            </a>
                            <a href="https://github.com" 
                               data-external="true" 
                               target="_blank"
                               class="btn btn-sm btn-outline-dark">
                                <i class="bi bi-github"></i> GitHub (New Tab)
                            </a>
                            <button class="btn btn-sm btn-outline-warning" data-action="openExternal">
                                <i class="bi bi-window"></i> Open MDN (Programmatic)
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Navigation with Query Strings -->
                <div class="card mb-3">
                    <div class="card-header">
                        <h5 class="mb-0">Query String Navigation</h5>
                    </div>
                    <div class="card-body">
                        <p class="text-muted mb-3">Navigate with query parameters:</p>
                        
                        <div class="row mb-3">
                            <div class="col-md-6">
                                <div class="input-group input-group-sm">
                                    <span class="input-group-text">Search</span>
                                    <input type="text" id="search-query" class="form-control" placeholder="Enter search term">
                                    <button class="btn btn-outline-secondary" data-action="searchNavigate">
                                        <i class="bi bi-search"></i> Search
                                    </button>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="input-group input-group-sm">
                                    <span class="input-group-text">Filter</span>
                                    <select id="filter-type" class="form-select">
                                        <option value="">All</option>
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                        <option value="pending">Pending</option>
                                    </select>
                                    <button class="btn btn-outline-secondary" data-action="filterNavigate">
                                        <i class="bi bi-funnel"></i> Apply
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <div class="alert alert-info alert-sm">
                            <strong>Current URL:</strong> <code id="current-url">${window.location.href}</code>
                        </div>
                    </div>
                </div>

                <!-- Navigation History -->
                <div class="card mb-3">
                    <div class="card-header">
                        <h5 class="mb-0">Navigation History</h5>
                    </div>
                    <div class="card-body">
                        <p class="text-muted mb-3">Track navigation events in this session:</p>
                        <div id="navigation-history" class="list-group list-group-flush">
                            ${this.renderNavigationHistory()}
                        </div>
                        <button class="btn btn-sm btn-outline-danger mt-2" data-action="clearHistory">
                            <i class="bi bi-trash"></i> Clear History
                        </button>
                    </div>
                </div>

                <!-- Router Information -->
                <div class="card">
                    <div class="card-header">
                        <h5 class="mb-0">Router Configuration</h5>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-6">
                                <h6>Current Router Mode</h6>
                                <p class="mb-2">
                                    <span class="badge bg-primary">param</span>
                                </p>
                                <small class="text-muted">
                                    The router mode determines how URLs are constructed.
                                </small>
                            </div>
                            <div class="col-md-6">
                                <h6>Available Modes</h6>
                                <ul class="small mb-0">
                                    <li><strong>param:</strong> Uses query parameters (?page=name) - Default for MOJO</li>
                                    <li><strong>hash:</strong> Uses hash routing (#/page/name)</li>
                                    <li><strong>history:</strong> Uses HTML5 History API (/page/name)</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderNavigationHistory() {
        if (this.navigationHistory.length === 0) {
            return '<div class="text-muted small">No navigation events yet</div>';
        }
        
        return this.navigationHistory.slice(-10).reverse().map((item, index) => `
            <div class="list-group-item list-group-item-action small py-1">
                <div class="d-flex w-100 justify-content-between">
                    <span>
                        <span class="badge bg-secondary me-2">${this.navigationHistory.length - index}</span>
                        <strong>${item.page}</strong>
                        ${item.params ? `<span class="text-muted ms-2">${JSON.stringify(item.params)}</span>` : ''}
                    </span>
                    <small class="text-muted">${item.time}</small>
                </div>
            </div>
        `).join('');
    }

    async onActionNavigateProgrammatic() {
        const page = document.getElementById('nav-page').value;
        const paramKey = document.getElementById('nav-param-key').value;
        const paramValue = document.getElementById('nav-param-value').value;
        
        const params = {};
        if (paramKey && paramValue) {
            params[paramKey] = paramValue;
        }
        
        // Log the navigation
        this.logNavigation(page, params);
        
        // Navigate using the router
        if (window.MOJO?.router) {
            window.MOJO.router.navigate(page, params);
        }
    }

    async onActionNavigateBack() {
        window.history.back();
    }

    async onActionRefreshPage() {
        window.location.reload();
    }

    async onActionOpenExternal() {
        window.open('https://developer.mozilla.org', '_blank');
    }

    async onActionSearchNavigate() {
        const searchTerm = document.getElementById('search-query').value;
        if (searchTerm) {
            const params = { search: searchTerm };
            this.logNavigation('tables', params);
            
            if (window.MOJO?.router) {
                window.MOJO.router.navigate('tables', params);
            }
        }
    }

    async onActionFilterNavigate() {
        const filterType = document.getElementById('filter-type').value;
        const params = filterType ? { filter: filterType } : {};
        this.logNavigation('tables', params);
        
        if (window.MOJO?.router) {
            window.MOJO.router.navigate('tables', params);
        }
    }

    async onActionClearHistory() {
        this.navigationHistory = [];
        this.updateNavigationHistory();
    }

    logNavigation(page, params = {}) {
        this.navigationHistory.push({
            page,
            params: Object.keys(params).length > 0 ? params : null,
            time: new Date().toLocaleTimeString()
        });
        this.updateNavigationHistory();
    }

    updateNavigationHistory() {
        const historyElement = document.getElementById('navigation-history');
        if (historyElement) {
            historyElement.innerHTML = this.renderNavigationHistory();
        }
    }

    async onAfterMount() {
        // Update current URL display
        this.updateCurrentUrl();
        
        // Listen for navigation events
        window.addEventListener('popstate', () => this.updateCurrentUrl());
    }

    updateCurrentUrl() {
        const urlElement = document.getElementById('current-url');
        if (urlElement) {
            urlElement.textContent = window.location.href;
        }
    }

    onParams(params, query) {
        // Handle incoming parameters
        console.log('NavigationPage received params:', params);
        console.log('NavigationPage received query:', query);
        
        // You could display these parameters in the UI
        if (params && Object.keys(params).length > 0) {
            this.logNavigation('navigation', params);
        }
    }
}