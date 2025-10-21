/**
 * SimpleSearchView - Generic searchable list component
 * Displays a searchable, scrollable list of items from any Collection
 * Emits item:selected event when user selects an item
 */

import { View } from '@core/View.js';

/**
 * ResultsView - Internal child view for rendering search results
 * This is only used within SimpleSearchView and handles the scrollable results area
 */
class ResultsView extends View {
    constructor(options = {}) {
        super({
            className: 'search-results-view flex-grow-1 overflow-auto d-flex flex-column',
            template: `
                <div class="flex-grow-1 overflow-auto">
                {{#data.loading}}
                    <div class="text-center p-4">
                        <div class="spinner-border spinner-border-sm text-muted" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <div class="mt-2 small text-muted">{{data.loadingText}}</div>
                    </div>
                {{/data.loading}}

                {{^data.loading}}
                    {{#data.items}}
                        <div class="simple-search-item position-relative"
                             data-action="select-item"
                             data-item-index="{{index}}">
                            {{{itemContent}}}
                            <i class="bi bi-chevron-right position-absolute end-0 top-50 translate-middle-y me-3 text-muted"></i>
                        </div>
                    {{/data.items}}

                    {{#data.showNoResults}}
                        <div class="text-center p-4">
                            <i class="bi bi-search text-muted mb-2" style="font-size: 1.5rem;"></i>
                            <div class="text-muted small">{{data.noResultsText}}</div>
                            <button type="button"
                                    class="btn btn-link btn-sm mt-2 p-0"
                                    data-action="clear-search">
                                Clear search
                            </button>
                        </div>
                    {{/data.showNoResults}}

                    {{#data.showEmpty}}
                        <div class="text-center p-4">
                            <i class="{{data.emptyIcon}} text-muted mb-2" style="font-size: 2rem;"></i>
                            <div class="text-muted small mb-2">{{data.emptyText}}</div>
                            {{#data.emptySubtext}}
                            <div class="text-muted" style="font-size: 0.75rem;">
                                {{data.emptySubtext}}
                            </div>
                            {{/data.emptySubtext}}
                        </div>
                    {{/data.showEmpty}}
                {{/data.loading}}
                </div>

                {{#data.showResultsCount}}
                <div class="border-top bg-light p-2 text-center">
                    <small class="text-muted">
                        {{data.filteredCount}} of {{data.totalCount}}
                    </small>
                </div>
                {{/data.showResultsCount}}
            `,
            ...options
        });

        this.parentView = options.parentView;
    }

    async handleActionSelectItem(event, element) {
        event.preventDefault();
        const itemIndex = parseInt(element.getAttribute('data-item-index'));
        if (this.parentView) {
            this.parentView.handleItemSelection(itemIndex);
        }
    }

    async handleActionClearSearch(event, _element) {
        event.preventDefault();

        if (this.parentView) {
            this.parentView.clearSearch();
        }
    }
}

class SimpleSearchView extends View {
    constructor(options = {}) {
        super({
            className: 'simple-search-view h-100 d-flex flex-column',
            template: `
                <div class="p-3 border-bottom bg-light">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <h6 class="text-muted fw-semibold mb-0">
                            {{#data.headerIcon}}<i class="{{data.headerIcon}} me-2"></i>{{/data.headerIcon}}
                            {{{data.headerText}}}
                        </h6>
                        {{#data.showExitButton}}
                        <button class="btn btn-link p-0 text-muted simple-search-exit-btn"
                                type="button"
                                data-action="exit-view"
                                title="Exit"
                                aria-label="Exit view">
                            <i class="bi bi-x-lg" aria-hidden="true"></i>
                        </button>
                        {{/data.showExitButton}}
                    </div>
                    <div class="position-relative">
                        <input type="text"
                               class="form-control form-control-sm pe-5"
                               placeholder="{{data.searchPlaceholder}}"
                               value="{{data.searchValue}}"
                               data-filter="live-search"
                               data-filter-debounce="{{data.debounceMs}}"
                               data-change-action="search-items">
                        <button class="btn btn-link p-0 position-absolute top-50 end-0 translate-middle-y me-2 text-muted simple-search-clear-btn"
                                type="button"
                                data-action="clear-search"
                                title="Clear search"
                                aria-label="Clear search">
                            <i class="bi bi-x-circle-fill" aria-hidden="true"></i>
                        </button>
                    </div>
                </div>

                <div data-container="results"></div>

                {{#data.showFooter}}
                <div class="p-3 border-top bg-light">
                    <small class="text-muted">
                        <i class="{{data.footerIcon}} me-1"></i>
                        {{{data.footerContent}}}
                    </small>
                </div>
                {{/data.showFooter}}
            `,
            ...options
        });

        // Configuration options
        this.Collection = options.Collection;
        this.collection = options.collection;
        this.itemTemplate = options.itemTemplate || this.getDefaultItemTemplate();
        this.searchFields = options.searchFields || ['name'];
        this.collectionParams = { size: 25, ...options.collectionParams };

        // UI text configuration
        this.headerText = options.headerText || 'Select Item';
        this.headerIcon = options.headerIcon || 'bi bi-list';
        this.searchPlaceholder = options.searchPlaceholder || 'Search...';
        this.loadingText = options.loadingText || 'Loading items...';
        this.noResultsText = options.noResultsText || 'No items match your search';
        this.emptyText = options.emptyText || 'No items available';
        this.emptySubtext = options.emptySubtext || null;
        this.emptyIcon = options.emptyIcon || 'bi bi-inbox';
        this.footerContent = options.footerContent || null;
        this.footerIcon = options.footerIcon || 'bi bi-info-circle';
        this.showExitButton = options.showExitButton || false;

        // State
        this.searchValue = '';
        this.filteredItems = [];
        this.loading = false;
        this.hasSearched = false;
        this.searchTimer = null;
        this.debounceMs = options.debounceMs || 300;

        // Create results child view
        this.resultsView = new ResultsView({
            parentView: this
        });

        if (!this.collection && this.Collection) {
            this.collection = new this.Collection();
        }

        // Add as child view
        this.addChild(this.resultsView);

    }

    onInit() {
        // Initialize collection if provided
        if (this.collection) {
            this.setupCollection();
        }

        // Load items on init if collection is available
        if (this.collection && this.options.autoLoad !== false) {
            this.loadItems();
        }
    }

    setupCollection() {
        // Set collection parameters
        Object.assign(this.collection.params, this.collectionParams);

        // Listen for collection updates
        this.collection.on('fetch:success', () => {
            this.loading = false;
            this.updateFilteredItems();
        });

        this.collection.on('fetch:error', () => {
            this.loading = false;
        });
    }

    async loadItems() {
        if (!this.collection) {
            console.warn('SimpleSearchView: No collection provided');
            return;
        }

        this.loading = true;
        this.updateResultsView();

        try {
            await this.collection.fetch();
            this.updateFilteredItems();
        } catch (error) {
            console.error('Error loading items:', error);
            const app = this.getApp();
            app?.showError?.('Failed to load items. Please try again.');
        } finally {
            this.loading = false;
            this.updateFilteredItems();
        }
    }

    updateFilteredItems() {
        if (!this.collection) {
            this.filteredItems = [];
            return;
        }

        const items = this.collection.toJSON();

        if (!this.searchValue || !this.searchValue.trim()) {
            this.filteredItems = items;
        } else {
            const searchTerm = this.searchValue.toLowerCase().trim();
            this.filteredItems = items.filter(item => {
                return this.searchFields.some(field => {
                    const value = this.getNestedValue(item, field);
                    return value && value.toString().toLowerCase().includes(searchTerm);
                });
            });
        }

        this.updateResultsView();
    }

    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    async getViewData() {
        return {
            searchValue: this.searchValue,
            showFooter: !!this.footerContent,
            showExitButton: this.showExitButton,
            debounceMs: this.debounceMs,

            // UI text
            headerText: this.headerText,
            headerIcon: this.headerIcon,
            searchPlaceholder: this.searchPlaceholder,
            footerContent: this.footerContent,
            footerIcon: this.footerIcon
        };
    }

    updateResultsView() {
        if (!this.resultsView) return;

        const hasItems = this.collection && this.collection.length() > 0;
        const hasFilteredItems = this.filteredItems.length > 0;
        const hasSearchValue = this.searchValue.length > 0;

        // Process items with template
        const processedItems = this.filteredItems.map((item, index) => {
            return {
                ...item,
                index,
                itemContent: this.processItemTemplate(item)
            };
        });

        this.resultsView.data = {
            loading: this.loading,
            items: processedItems,
            showEmpty: !this.loading && !hasItems,
            showNoResults: !this.loading && hasItems && !hasFilteredItems && hasSearchValue,
            showResultsCount: !this.loading && hasItems,
            filteredCount: this.filteredItems.length,
            totalCount: this.collection?.restEnabled
                ? (this.collection?.meta?.count || 0)
                : (this.collection?.length() || 0),

            // UI text
            loadingText: this.loadingText,
            noResultsText: this.noResultsText,
            emptyText: this.emptyText,
            emptySubtext: this.emptySubtext,
            emptyIcon: this.emptyIcon
        };

        this.resultsView.render();
    }

    processItemTemplate(item) {
        let template = this.itemTemplate;

        // Simple template replacement for item properties
        template = template.replace(/\{\{(\w+)\}\}/g, (match, prop) => {
            return this.getNestedValue(item, prop) || '';
        });

        return template;
    }

    getDefaultItemTemplate() {
        return `
            <div class="p-3 border-bottom">
                <div class="fw-semibold text-dark">{{name}}</div>
                <small class="text-muted">{{id}}</small>
            </div>
        `;
    }

    async onPassThruActionSearchItems(event, element) {
        const searchValue = element.value || '';

        console.log("search change...");
        this.searchValue = searchValue;
        this.hasSearched = true;

        // Clear existing timer
        if (this.searchTimer) {
            clearTimeout(this.searchTimer);
        }

        // Debounce the search
        this.performSearch();
    }

    async performSearch() {
        const searchParams = { ...this.collectionParams };
        if (this.searchValue && this.searchValue.length > 1) {
            searchParams.search = this.searchValue.trim();
        }
        this.collection.setParams(searchParams, true);
    }

    handleItemSelection(itemIndex) {
        if (isNaN(itemIndex) || itemIndex < 0 || itemIndex >= this.filteredItems.length) {
            console.error('Invalid item index:', itemIndex);
            return;
        }

        const item = this.filteredItems[itemIndex];
        const model = this.collection ? this.collection.get(item.id) : null;

        // Emit selection event
        this.emit('item:selected', {
            item: item,
            model: model,
            index: itemIndex
        });
    }

    /**
     * Set the collection for this search view
     */
    setCollection(collection) {
        this.collection = collection;
        this.setupCollection();
        return this;
    }

    /**
     * Set the item template
     */
    setItemTemplate(template) {
        this.itemTemplate = template;
        this.updateResultsView();
        return this;
    }

    /**
     * Set search fields
     */
    setSearchFields(fields) {
        this.searchFields = Array.isArray(fields) ? fields : [fields];
        return this;
    }

    /**
     * Refresh items list
     */
    async refresh() {
        await this.loadItems();
    }

    /**
     * Focus the search input
     */
    focusSearch() {
        const searchInput = this.element?.querySelector('input[data-action="search-items"]');
        if (searchInput) {
            searchInput.focus();
        }
    }

    /**
     * Handle exit button click - emits event instead of closing
     */
    async handleActionExitView(event, element) {
        this.emit('exit', { view: this });
    }

    /**
     * Clear search and reset
     */
    async handleActionClearSearch(event, element) {
        this.clearSearch();
    }

    clearSearch() {
        this.searchValue = '';
        this.hasSearched = false;
        const searchInput = this.element?.querySelector('input[data-change-action="search-items"]');
        if (searchInput) {
            searchInput.value = '';
            searchInput.focus();
        }
        this.performSearch();
    }

    /**
     * Get the number of available items
     */
    getItemCount() {
        return this.collection ? this.collection.length() : 0;
    }

    /**
     * Get the number of filtered items
     */
    getFilteredItemCount() {
        return this.filteredItems.length;
    }

    /**
     * Check if items are loaded
     */
    hasItems() {
        return this.getItemCount() > 0;
    }

    /**
     * Get current search value
     */
    getSearchValue() {
        return this.searchValue;
    }

    /**
     * Set search value programmatically
     */
    setSearchValue(value) {
        this.searchValue = value || '';
        this.hasSearched = !!this.searchValue;

        const searchInput = this.element?.querySelector('input[data-action="search-items"]');
        if (searchInput) {
            searchInput.value = this.searchValue;
        }

        this.performSearch();
        return this;
    }

    async onAfterRender() {
        await super.onAfterRender();

        // Mount results view to container if not already mounted
        if (this.resultsView && !this.resultsView.isMounted()) {
            const container = this.element?.querySelector('[data-container="results"]');
            if (container) {
                await this.resultsView.render(true, container);
            }
        }

        // Update results view after main render
        this.updateResultsView();
    }

    /**
     * Cleanup on destroy
     */
    async onBeforeDestroy() {
        if (this.searchTimer) {
            clearTimeout(this.searchTimer);
        }

        if (this.collection) {
            this.collection.off('update');
        }

        await super.onBeforeDestroy();
    }
}

export default SimpleSearchView;
