/**
 * CollectionMultiSelect - MVC multi-select component
 * 
 * Architecture:
 * - CollectionMultiSelectView (parent) - Coordinates child views
 * - SearchView (child) - Search input with live search
 * - ListItemsView (child) - Checkbox list display
 */

import { View } from '@core/View.js';
import MOJOUtils from '@core/utils/MOJOUtils.js';

/**
 * SearchView - Search input child view
 */
class SearchView extends View {
  constructor(options = {}) {
    super({
      tagName: 'div',
      className: 'collection-multiselect-search',
      template: `
        <input type="text" 
               class="form-control form-control-sm mb-2" 
               placeholder="{{placeholder}}"
               data-change-action="search"
               data-filter="live-search"
               data-filter-debounce="{{debounce}}" />
      `,
      ...options
    });

    this.placeholder = options.placeholder || 'Search...';
    this.debounce = options.debounce || 400;
  }

  async onChangeSearch(event, element) {
    const searchValue = element.value.trim();
    this.emit('search', searchValue);
  }

  getValue() {
    return this.element?.querySelector('input')?.value || '';
  }

  clear() {
    const input = this.element?.querySelector('input');
    if (input) input.value = '';
  }
}

/**
 * ListItemsView - Checkbox list child view
 */
class ListItemsView extends View {
  constructor(options = {}) {
    super({
      tagName: 'div',
      className: 'collection-multiselect-items',
      template: `
        {{#loading}}
          <div class="text-center py-3">
            <div class="spinner-border spinner-border-sm" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
          </div>
        {{/loading}}

        {{^loading}}
          {{#items.length}}
            {{#showSelectAll}}
              <div class="collection-multiselect-actions d-flex justify-content-between align-items-center mb-2 py-1">
                <button type="button" 
                        class="btn btn-link btn-sm text-decoration-none p-0 {{#allSelected}}text-muted{{/allSelected}}" 
                        data-action="select-all"
                        {{#allSelected}}disabled{{/allSelected}}>
                  <i class="bi bi-check-square me-1"></i>
                  SELECT {{#unselectedCount}}({{unselectedCount}}){{/unselectedCount}}
                </button>
                <button type="button" 
                        class="btn btn-link btn-sm text-decoration-none p-0 {{#noneSelected}}text-muted{{/noneSelected}}" 
                        data-action="deselect-all"
                        {{#noneSelected}}disabled{{/noneSelected}}>
                  DESELECT {{#selectedCount}}({{selectedCount}}){{/selectedCount}}
                  <i class="bi bi-square ms-1"></i>
                </button>
              </div>
            {{/showSelectAll}}
            
            <div class="collection-multiselect-list border rounded" 
                 style="max-height: {{maxHeight}}px; overflow-y: auto;">
              {{#items}}
                <div class="collection-multiselect-item d-flex align-items-center py-2 px-3 {{^disabled}}clickable{{/disabled}}" 
                     data-action="{{^disabled}}toggle{{/disabled}}"
                     data-value="{{value}}"
                     data-index="{{index}}">
                  <i class="bi {{#selected}}bi-check-square-fill text-primary{{/selected}}{{^selected}}bi-square{{/selected}} me-2" 
                     style="font-size: 1.1rem;"></i>
                  <span {{#disabled}}class="text-muted"{{/disabled}}>{{label}}</span>
                </div>
              {{/items}}
            </div>
          {{/items.length}}

          {{^items.length}}
            <div class="collection-multiselect-empty text-muted text-center py-4 border rounded">
              <i class="bi bi-inbox fs-3 d-block mb-2 opacity-50"></i>
              <div>No items available</div>
            </div>
          {{/^items.length}}
        {{/loading}}
      `,
      ...options
    });

    this.items = options.items || [];
    this.loading = options.loading || false;
    this.maxHeight = options.maxHeight || 336;
    this.showSelectAll = options.showSelectAll !== false;
    this.selectedCount = options.selectedCount || 0;
    this.totalCount = options.totalCount || 0;
    this.unselectedCount = options.unselectedCount || 0;
    this.allSelected = options.allSelected || false;
    this.noneSelected = options.noneSelected || true;
    this.lastClickedIndex = -1;
  }

  handleActionToggle(event, element) {
    const value = element.getAttribute('data-value');
    const index = parseInt(element.getAttribute('data-index'), 10);
    this.emit('toggle', { value, index, shiftKey: event.shiftKey });
    this.lastClickedIndex = index;
  }

  async handleActionSelectAll(event) {
    event.preventDefault();
    this.emit('select-all');
  }

  async handleActionDeselectAll(event) {
    event.preventDefault();
    this.emit('deselect-all');
  }

  updateState(state) {
    Object.assign(this, state);
  }
}

/**
 * CollectionMultiSelectView - Parent coordinator view
 */
class CollectionMultiSelectView extends View {
  constructor(options = {}) {
    super({
      tagName: 'div',
      className: 'collection-multiselect-view',
      template: `
        <div class="mojo-form-control">
          {{#label}}
          <label class="form-label">
            {{label}}{{#required}}<span class="text-danger">*</span>{{/required}}
          </label>
          {{/label}}
          
          <div class="collection-multiselect-search-container"></div>
          <div class="collection-multiselect-list-container"></div>

          {{#help}}
            <div class="form-text">{{help}}</div>
          {{/help}}
          {{#error}}
            <div class="invalid-feedback d-block">{{error}}</div>
          {{/error}}
        </div>
      `,
      ...options
    });

    // Basic config
    this.name = options.name || 'collection_multiselect';
    this.label = options.label || '';
    this.help = options.help || '';
    this.error = options.error || '';
    this.required = options.required || false;
    this.disabled = options.disabled || false;

    // Collection
    this.collection = options.collection;
    this.labelField = options.labelField || 'name';
    this.valueField = options.valueField || 'id';
    this.excludeIds = options.excludeIds || []; // Server-side filtering (deprecated)
    this.ignoreIds = options.ignoreIds || [];   // Client-side filtering
    
    // Params
    this.collectionParams = options.collectionParams || {};
    this.defaultParamsOption = options.defaultParams || null;
    this.baseParams = {};
    this.requiresActiveGroup = options.requiresActiveGroup || false;

    // UI
    this.size = options.size || 8;
    this.maxHeight = options.maxHeight || (this.size * 42);
    this.showSelectAll = options.showSelectAll !== false;
    this.enableSearch = options.enableSearch || false;
    this.searchPlaceholder = options.searchPlaceholder || 'Search...';
    this.searchDebounce = options.searchDebounce || 400;

    // State
    this.selectedValues = Array.isArray(options.value) ? options.value : [];
    this.loading = false;
    this.items = [];

    // Child views
    this.searchView = null;
    this.listView = null;
  }

  onInit() {
    if (this.collection) {
      this.setupCollection();
    }
  }

  setupCollection() {
    // Store base params
    this.baseParams = { ...this.collection.params };

    // Apply collectionParams
    if (Object.keys(this.collectionParams).length > 0) {
      Object.assign(this.baseParams, this.collectionParams);
      Object.assign(this.collection.params, this.collectionParams);
    }

    // Apply defaultParams (dict or callback)
    if (this.defaultParamsOption) {
      const extraParams = typeof this.defaultParamsOption === 'function' 
        ? this.defaultParamsOption() 
        : this.defaultParamsOption;
      
      if (extraParams) {
        Object.assign(this.baseParams, extraParams);
        Object.assign(this.collection.params, extraParams);
      }
    }

    // Active group filter
    if (this.requiresActiveGroup) {
      const app = this.getApp();
      if (app?.activeGroup?.id) {
        this.baseParams.group = app.activeGroup.id;
        this.collection.params.group = app.activeGroup.id;
      }
    }

    // Collection events
    this.collection.on('fetch:start', () => {
      this.loading = true;
      this.updateListView();
    });

    this.collection.on('fetch:end', () => {
      this.loading = false;
      this.buildItems();
      this.updateListView();
    });

    // Use existing data if available
    if (!this.collection.isEmpty()) {
      this.buildItems();
    }
  }

  async onAfterRender() {
    await super.onAfterRender();

    // Create child views
    if (this.enableSearch) {
      this.createSearchView();
    }
    this.createListView();

    // Fetch if empty
    if (this.collection?.isEmpty()) {
      this.collection.fetch();
    }
  }

  createSearchView() {
    const container = this.element?.querySelector('.collection-multiselect-search-container');
    if (!container) return;

    this.searchView = new SearchView({
      placeholder: this.searchPlaceholder,
      debounce: this.searchDebounce
    });

    this.searchView.on('search', (searchValue) => {
      this.handleSearch(searchValue);
    });

    this.searchView.render(true, container);
  }

  createListView() {
    const container = this.element?.querySelector('.collection-multiselect-list-container');
    if (!container) return;

    const selectedCount = this.selectedValues.length;
    const totalCount = this.items.length;
    const unselectedCount = totalCount - selectedCount;

    this.listView = new ListItemsView({
      items: this.items,
      loading: this.loading,
      maxHeight: this.maxHeight,
      showSelectAll: this.showSelectAll,
      selectedCount,
      totalCount,
      unselectedCount,
      allSelected: selectedCount === totalCount && totalCount > 0,
      noneSelected: selectedCount === 0
    });

    this.listView.on('toggle', (data) => {
      this.handleToggle(data);
    });

    this.listView.on('select-all', () => {
      this.selectAll();
    });

    this.listView.on('deselect-all', () => {
      this.deselectAll();
    });

    this.listView.render(true, container);
  }

  updateListView() {
    if (this.listView) {
      const selectedCount = this.selectedValues.length;
      const totalCount = this.items.length;
      const unselectedCount = totalCount - selectedCount;

      this.listView.updateState({
        items: this.items,
        loading: this.loading,
        selectedCount,
        totalCount,
        unselectedCount,
        allSelected: selectedCount === totalCount && totalCount > 0,
        noneSelected: selectedCount === 0
      });
      this.listView.render(false);
    }
  }

  // Build items array from collection
  buildItems() {
    const models = this.collection.models.filter(model => {
      const id = this.getFieldValue(model, this.valueField);
      if (id == null) return false;
      
      // Filter out excludeIds (legacy support)
      if (this.excludeIds.includes(id)) return false;
      
      // Filter out ignoreIds (client-side filtering)
      if (this.ignoreIds.some(ignoreId => ignoreId == id)) return false;
      
      return true;
    });

    this.items = models.map((model, index) => ({
      label: this.getFieldValue(model, this.labelField),
      value: this.getFieldValue(model, this.valueField),
      index,
      selected: this.selectedValues.some(v => v == this.getFieldValue(model, this.valueField)),
      disabled: this.disabled
    }));
  }

  // Get field value (supports dot notation)
  getFieldValue(item, field) {
    if (!item || !field) return undefined;
    
    if (typeof item.get === 'function') {
      return item.get(field) ?? MOJOUtils.getNestedValue(item, field);
    }
    
    return MOJOUtils.getNestedValue(item, field);
  }

  // Handle search
  handleSearch(searchValue) {
    const params = { ...this.baseParams };
    if (searchValue) {
      params.search = searchValue;
    }
    this.collection.updateParams(params, true);
  }

  // Handle item toggle
  handleToggle({ value, index, shiftKey }) {
    // Shift-click range selection
    if (shiftKey && this.listView.lastClickedIndex >= 0) {
      const start = Math.min(this.listView.lastClickedIndex, index);
      const end = Math.max(this.listView.lastClickedIndex, index);
      const shouldSelect = !this.items[index].selected;
      
      for (let i = start; i <= end; i++) {
        const item = this.items[i];
        if (!item.disabled) {
          if (shouldSelect) {
            if (!this.selectedValues.includes(item.value)) {
              this.selectedValues.push(item.value);
            }
          } else {
            this.selectedValues = this.selectedValues.filter(v => v != item.value);
          }
          item.selected = shouldSelect;
        }
      }
    } else {
      // Normal toggle
      const item = this.items[index];
      if (item.selected) {
        this.selectedValues = this.selectedValues.filter(v => v != value);
        item.selected = false;
      } else {
        this.selectedValues.push(value);
        item.selected = true;
      }
    }

    this.updateListView();
    this.emit('change', { value: this.selectedValues, name: this.name });
  }

  // Select all
  selectAll() {
    this.selectedValues = this.items.filter(i => !i.disabled).map(i => i.value);
    this.items.forEach(i => { if (!i.disabled) i.selected = true; });
    this.updateListView();
    this.emit('change', { value: this.selectedValues, name: this.name });
  }

  // Deselect all
  deselectAll() {
    this.selectedValues = [];
    this.items.forEach(i => i.selected = false);
    this.updateListView();
    this.emit('change', { value: this.selectedValues, name: this.name });
  }

  async onBeforeDestroy() {
    await super.onBeforeDestroy();
    
    if (this.searchView) {
      this.searchView.destroy();
    }
    if (this.listView) {
      this.listView.destroy();
    }
  }

  // Public API
  getValue() { return this.selectedValues; }
  
  setValue(values) {
    this.selectedValues = Array.isArray(values) ? values : [];
    this.buildItems();
    this.updateListView();
  }

  setExcludeIds(ids) {
    this.excludeIds = Array.isArray(ids) ? ids : [];
    this.buildItems();
    this.updateListView();
  }

  setIgnoreIds(ids) {
    this.ignoreIds = Array.isArray(ids) ? ids : [];
    this.buildItems();
    this.updateListView();
  }

  async refresh() {
    await this.collection.fetch();
  }

  getFormValue() { return this.selectedValues; }
  setFormValue(value) { this.setValue(value); }
}

export default CollectionMultiSelectView;
