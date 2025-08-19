/**
 * CollectionSelectView - A searchable dropdown component for selecting items from a Collection
 *
 * This component uses a parent-child architecture to prevent input focus loss:
 * - CollectionSelectView (parent): Manages input and coordination
 * - CollectionDropdownView (child): Handles dropdown rendering only
 */

import { View } from '../core/View.js';

/**
 * CollectionDropdownView - Child component for dropdown results only
 */
class CollectionDropdownView extends View {
  constructor(options = {}) {
    super({
      tagName: 'div',
      className: 'collection-dropdown-view dropdown-menu show w-100 position-absolute',
      style: 'max-height: 250px; overflow-y: auto; z-index: 1000;',
      template: `
        {{#data.loading}}
          <div class="dropdown-item text-center">
            <div class="spinner-border spinner-border-sm" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
          </div>
        {{/data.loading}}

        {{^data.loading}}
          {{#data.items}}
            <button type="button"
                    class="dropdown-item {{#isSelected}}active{{/isSelected}} {{#isFocused}}bg-light{{/isFocused}}"
                    data-action="select-item"
                    data-value="{{valueField}}"
                    data-label="{{labelField}}"
                    data-index="{{index}}">
              {{labelField}}
            </button>
          {{/data.items}}

          {{#data.showNoResults}}
            <div class="dropdown-item text-muted">
              {{#data.hasSearched}}No results found{{/data.hasSearched}}
              {{^data.hasSearched}}Start typing to search...{{/data.hasSearched}}
            </div>
          {{/data.showNoResults}}
        {{/data.loading}}
      `,
      ...options
    });

    this.collection = options.collection;
    this.labelField = options.labelField || 'name';
    this.valueField = options.valueField || 'id';
    this.selectedValue = options.selectedValue || '';
    this.loading = options.loading || false;
    this.hasSearched = options.hasSearched || false;
    this.focusedIndex = options.focusedIndex || -1;
  }

  async getViewData() {
    const items = this.collection ? this.collection.toJSON().map((item, index) => ({
      ...item,
      labelField: item[this.labelField],
      valueField: item[this.valueField],
      isSelected: item[this.valueField] == this.selectedValue,
      isFocused: index === this.focusedIndex,
      index
    })) : [];

    return {
      loading: this.loading,
      hasSearched: this.hasSearched,
      showNoResults: !this.loading && this.hasSearched && items.length === 0,
      items
    };
  }

  async handleActionSelectItem(event, element) {
    event.preventDefault();
    const value = element.getAttribute('data-value');
    const label = element.getAttribute('data-label');
    this.emit('item-selected', { value, label });
  }

  updateState(state) {
    Object.assign(this, state);
  }

  updateFocusedItem(newIndex) {
    this.focusedIndex = newIndex;
    const items = this.element?.querySelectorAll('.dropdown-item[data-action="select-item"]');
    items?.forEach((item, index) => {
      item.classList.toggle('bg-light', index === this.focusedIndex);
    });
  }

  getItemCount() {
    return this.collection ? this.collection.length() : 0;
  }

  getFocusedItem() {
    if (this.focusedIndex >= 0 && this.collection) {
      const items = this.collection.toJSON();
      return items[this.focusedIndex] || null;
    }
    return null;
  }
}

/**
 * CollectionSelectView - Main component with stable input
 */
class CollectionSelectView extends View {
  constructor(options = {}) {
    super({
      className: 'collection-select-view',
      template: `
        <div class="position-relative">
          <input type="text" 
                 class="form-control {{#data.hasError}}is-invalid{{/data.hasError}} {{#data.showClear}}pe-5{{/data.showClear}}" 
                 placeholder="{{data.placeholder}}"
                 value="{{data.displayValue}}"
                 autocomplete="off" />
          
          <input type="hidden" 
                 name="{{data.name}}" 
                 value="{{data.selectedValue}}" />
          
          {{#data.showClear}}
            <button type="button" 
                    class="btn btn-link position-absolute top-50 end-0 translate-middle-y me-2 p-0 border-0" 
                    style="z-index: 10; color: #6c757d;"
                    data-action="clear-selection"
                    title="Clear selection">
              <i class="bi bi-x-circle"></i>
            </button>
          {{/data.showClear}}
          
          <div class="dropdown-container"></div>
          
          {{#data.hasError}}
            <div class="invalid-feedback">{{data.errorMessage}}</div>
          {{/data.hasError}}
        </div>
      `,
      ...options
    });

    // Configuration
    this.collection = options.collection;
    this.labelField = options.labelField || 'name';
    this.valueField = options.valueField || 'id';
    this.maxItems = options.maxItems || 10;
    this.placeholder = options.placeholder || 'Search...';
    this.debounceMs = options.debounceMs || 1000;
    this.name = options.name || 'collection_select';
    this.emptyFetch = options.emptyFetch !== false;

    // State
    this.selectedValue = options.value || '';
    this.selectedLabel = '';
    this.searchValue = '';
    this.showDropdown = false;
    this.loading = false;
    this.hasSearched = false;
    this.focusedIndex = -1;
    this.hasError = false;
    this.errorMessage = '';

    // Internal
    this.searchTimer = null;
    this.dropdownView = null;
    this.defaultParams = {};

    // Bind methods
    this.handleDocumentClick = this.handleDocumentClick.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleInputEvents = this.handleInputEvents.bind(this);

    if (this.collection) {
      this.setupCollection();
    }
  }

  setupCollection() {
    this.defaultParams = { ...this.collection.params };
    this.collection.params.size = this.maxItems;
    this.defaultParams.size = this.maxItems;

    this.collection.on('update', () => {
      this.loading = false;
      this.showDropdown = true;
      this.updateDropdown();
    });

    if (this.selectedValue) {
      this.loadSelectedItem();
    }

    if (this.emptyFetch && this.collection.isEmpty()) {
      this.performInitialFetch();
    }
  }

  async performInitialFetch() {
    if (!this.collection) return;

    try {
      const fetchParams = { ...this.defaultParams };
      delete fetchParams.search;
      await this.collection.updateParams(fetchParams, true);
    } catch (error) {
      console.error('Initial fetch error:', error);
    }
  }

  async loadSelectedItem() {
    try {
      const selectedModel = this.collection?.get(this.selectedValue);
      if (selectedModel) {
        this.selectedLabel = selectedModel.get(this.labelField);
        this.render();
        return;
      }

      let model = await this.collection.fetchOne(this.selectedValue);
      if (model) {
        this.selectedLabel = model.get(this.labelField);
      }
    } catch (error) {
      console.error('Error loading selected item:', error);
    }
  }

  async getViewData() {
    let displayValue = '';
    if (this.showDropdown && this.hasSearched) {
      displayValue = this.searchValue;
    } else if (this.selectedValue && this.selectedLabel) {
      displayValue = this.selectedLabel;
    }

    return {
      name: this.name,
      placeholder: this.placeholder,
      displayValue: displayValue,
      selectedValue: this.selectedValue,
      showClear: !!(this.selectedValue && this.selectedLabel),
      hasError: this.hasError,
      errorMessage: this.errorMessage
    };
  }

  async onAfterRender() {
    await super.onAfterRender();

    // Set up stable event listeners on input
    const input = this.getInput();
    if (input) {
      input.addEventListener('input', this.handleInputEvents);
      input.addEventListener('focus', this.handleInputEvents);
      input.addEventListener('keydown', this.handleKeyDown);
    }

    document.addEventListener('click', this.handleDocumentClick);

    // Create dropdown view
    this.createDropdownView();
  }

  async onBeforeDestroy() {
    await super.onBeforeDestroy();

    const input = this.getInput();
    if (input) {
      input.removeEventListener('input', this.handleInputEvents);
      input.removeEventListener('focus', this.handleInputEvents);
      input.removeEventListener('keydown', this.handleKeyDown);
    }

    document.removeEventListener('click', this.handleDocumentClick);

    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }

    if (this.dropdownView) {
      this.dropdownView.destroy();
    }
  }

  createDropdownView() {
    if (this.dropdownView) {
      this.dropdownView.destroy();
    }

    this.dropdownView = new CollectionDropdownView({
      collection: this.collection,
      labelField: this.labelField,
      valueField: this.valueField,
      selectedValue: this.selectedValue,
      loading: this.loading,
      hasSearched: this.hasSearched,
      focusedIndex: this.focusedIndex
    });

    this.dropdownView.on('item-selected', (data) => {
      this.selectItem(data.value, data.label);
    });
  }

  async handleInputEvents(event) {
    const input = event.target;

    if (event.type === 'focus') {
      this.showDropdown = true;
      if (!this.hasSearched && this.emptyFetch && this.collection?.isEmpty()) {
        this.performInitialFetch();
      }
      this.updateDropdown();
    } else if (event.type === 'input') {
      this.searchValue = input.value;
      this.showDropdown = true;
      this.hasSearched = true;
      this.focusedIndex = -1;

      if (this.searchValue !== this.selectedLabel) {
        this.selectedValue = '';
        this.selectedLabel = '';
        this.emit('change', { value: '', label: '' });
      }

      if (this.searchTimer) {
        clearTimeout(this.searchTimer);
      }

      this.searchTimer = setTimeout(() => {
        this.performSearch();
      }, this.debounceMs);

      this.updateDropdown();
    }
  }

  async handleActionClearSelection(event, _element) {
    event.preventDefault();
    event.stopPropagation();
    
    this.clearSelection();
  }

  clearSelection() {
    this.selectedValue = '';
    this.selectedLabel = '';
    this.searchValue = '';
    this.showDropdown = false;
    this.hasError = false;
    this.focusedIndex = -1;
    this.hasSearched = false;
    
    // Update input display
    const input = this.getInput();
    if (input) {
      input.value = '';
      input.focus(); // Focus back on input after clearing
    }
    
    // Update hidden input
    const hiddenInput = this.getHiddenInput();
    if (hiddenInput) {
      hiddenInput.value = '';
    }
    
    this.updateDropdown();
    this.render(); // Re-render to hide clear button
    this.emit('change', { value: '', label: '' });
  }

  async performSearch() {
    if (!this.collection) return;

    this.loading = true;
    this.updateDropdown();

    try {
      const searchParams = { ...this.defaultParams };
      if (this.searchValue && this.searchValue.trim()) {
        searchParams.search = this.searchValue.trim();
      }
      await this.collection.updateParams(searchParams, true);
    } catch (error) {
      console.error('Search error:', error);
      this.loading = false;
      this.updateDropdown();
    }
  }

  updateDropdown() {
    if (!this.dropdownView) return;

    this.dropdownView.updateState({
      selectedValue: this.selectedValue,
      loading: this.loading,
      hasSearched: this.hasSearched,
      focusedIndex: this.focusedIndex
    });

    if (this.showDropdown) {
      if (!this.dropdownView.isMounted()) {
        const container = this.element?.querySelector('.dropdown-container');
        if (container) {
          this.dropdownView.render(true, container);
        }
      } else {
        this.dropdownView.render();
      }
    } else if (this.dropdownView.isMounted()) {
      this.dropdownView.destroy();
      this.createDropdownView();
    }
  }

  selectItem(value, label) {
    this.selectedValue = value;
    this.selectedLabel = label;
    this.searchValue = '';
    this.showDropdown = false;
    this.hasError = false;
    this.focusedIndex = -1;
    this.hasSearched = false;

    // Update input display
    const input = this.getInput();
    if (input) {
      input.value = label;
    }

    // Update hidden input
    const hiddenInput = this.getHiddenInput();
    if (hiddenInput) {
      hiddenInput.value = value;
    }

    this.updateDropdown();
    this.emit('change', { value, label });
  }

  handleDocumentClick(event) {
    if (!this.element?.contains(event.target)) {
      this.showDropdown = false;
      this.focusedIndex = -1;
      this.updateDropdown();
    }
  }

  handleKeyDown(event) {
    if (!this.showDropdown || !this.collection) return;

    const itemCount = this.dropdownView?.getItemCount() || 0;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.focusedIndex = Math.min(this.focusedIndex + 1, itemCount - 1);
        this.dropdownView?.updateFocusedItem(this.focusedIndex);
        break;

      case 'ArrowUp':
        event.preventDefault();
        this.focusedIndex = Math.max(this.focusedIndex - 1, 0);
        this.dropdownView?.updateFocusedItem(this.focusedIndex);
        break;

      case 'Enter': {
        event.preventDefault();
        const focusedItem = this.dropdownView?.getFocusedItem();
        if (focusedItem) {
          this.selectItem(focusedItem[this.valueField], focusedItem[this.labelField]);
        }
        break;
      }

      case 'Escape':
        event.preventDefault();
        this.showDropdown = false;
        this.focusedIndex = -1;
        this.updateDropdown();
        break;
    }
  }

  // Helper methods
  getInput() {
    return this.element?.querySelector('input[type="text"]');
  }

  getHiddenInput() {
    return this.element?.querySelector('input[type="hidden"]');
  }

  // Public API
  setValue(value, label = '') {
    this.selectedValue = value;
    this.selectedLabel = label;
    this.searchValue = '';
    this.hasError = false;
    this.hasSearched = false;

    const input = this.getInput();
    if (input) {
      input.value = label;
    }

    const hiddenInput = this.getHiddenInput();
    if (hiddenInput) {
      hiddenInput.value = value;
    }
  }

  getValue() {
    return this.selectedValue;
  }

  getLabel() {
    return this.selectedLabel;
  }

  setError(message) {
    this.hasError = true;
    this.errorMessage = message;
    this.render();
  }

  clearError() {
    this.hasError = false;
    this.errorMessage = '';
    this.render();
  }

  focus() {
    const input = this.getInput();
    if (input) {
      input.focus();
    }
  }

  // FormBuilder integration
  getFormValue() {
    return this.selectedValue;
  }

  setFormValue(value) {
    if (value && value[this.valueField]) {
        if (value[this.valueField] == this.selectedValue) return;
        this.selectedValue = value[this.valueField];
        this.selectedLabel = value[this.labelField];
        this.searchValue = value[this.labelField];
        this.hasSearched = false;
        this.showDropdown = false;
        this.hasError = false;
        this.loadSelectedItem();
        this.setValue(this.selectedValue, this.selectedLabel);
    } else if (value !== this.selectedValue) {
        this.selectedValue = value;
        this.selectedLabel = `${this.collection.getModelName()} #${value}`;
        this.searchValue = `${this.collection.getModelName()} #${value}`;
        this.hasSearched = false;
        this.showDropdown = false;
        this.hasError = false;
        if (this.selectedValue) this.loadSelectedItem();
        this.setValue(this.selectedValue, this.selectedLabel);
    }
  }

}

export default CollectionSelectView;
