/**
 * ListView - Visual list component for Collections
 * 
 * Manages a collection of ListViewItem views, each with its own model.
 * When a model changes, only its corresponding ListViewItem re-renders.
 * 
 * Events:
 *   - 'item:click' - Emitted when any item is clicked
 *   - 'item:select' - Emitted when an item is selected
 *   - 'item:deselect' - Emitted when an item is deselected
 *   - 'selection:change' - Emitted when selection changes
 *   - 'list:empty' - Emitted when list becomes empty
 *   - 'list:loaded' - Emitted when list is populated
 * 
 * @example
 * // Basic usage with custom item template
 * const listView = new ListView({
 *   collection: userCollection,
 *   itemTemplate: '<div class="user-item">{{name}} - {{email}}</div>',
 *   selectionMode: 'single'
 * });
 * 
 * // Custom template with model fields
 * const productList = new ListView({
 *   collection: productCollection,
 *   itemTemplate: `
 *     <div class="product-card" data-action="select">
 *       <h4>{{name}}</h4>
 *       <p class="price">{{price|currency}}</p>
 *       <p>{{description|truncate(100)}}</p>
 *     </div>
 *   `,
 *   selectionMode: 'multiple'
 * });
 * 
 * // Using custom item class with template
 * const customList = new ListView({
 *   collection: myCollection,
 *   itemClass: CustomListItem,     // Your custom ListViewItem subclass
 *   itemTemplate: '<div>{{title}}</div>',  // Passed as 'template' to itemClass constructor
 *   selectionMode: 'none'
 * });
 * 
 * // Dynamic template update
 * listView.setItemTemplate('<div class="compact">{{name}}</div>', true);
 */

import View from '../core/View.js';
import Collection from '../core/Collection.js';
import ListViewItem from './ListViewItem.js';

class ListView extends View {
  constructor(options = {}) {
    super({
      className: 'list-view',
      template: `
        <div class="list-view-container">
          {{#loading}}
            <div class="list-loading">
              <div class="spinner-border spinner-border-sm" role="status">
                <span class="visually-hidden">Loading...</span>
              </div>
              Loading...
            </div>
          {{/loading}}
          {{^loading}}
            {{#isEmpty}}
              <div class="list-empty">
                {{emptyMessage}}
              </div>
            {{/isEmpty}}
            {{^isEmpty}}
              <div class="list-items" data-container="items"></div>
            {{/isEmpty}}
          {{/loading}}
        </div>
      `,
      ...options
    });

    // ListView specific properties
    this.collection = null;
    this.itemViews = new Map(); // Map of model.id -> ListViewItem
    this.selectedItems = new Set(); // Set of selected item IDs
    
    // Configuration
    this.itemTemplate = options.itemTemplate || null; // Template passed to each item's view
    this.itemClass = options.itemClass || ListViewItem; // Class for creating item views
    this.selectionMode = options.selectionMode || 'none'; // none, single, multiple
    this.emptyMessage = options.emptyMessage || 'No items to display';
    this.loading = false;
    this.isEmpty = true;
    
    // Initialize collection
    this._initCollection(options.collection);
  }

  /**
   * Initialize the collection
   */
  _initCollection(collectionOrClass) {
    if (!collectionOrClass) return;
    
    // Check if it's already a Collection instance
    if (collectionOrClass instanceof Collection) {
      this.setCollection(collectionOrClass);
    } 
    // Check if it's a Collection class
    else if (typeof collectionOrClass === 'function') {
      const collection = new collectionOrClass();
      this.setCollection(collection);
    }
    // Check if it's an array of data
    else if (Array.isArray(collectionOrClass)) {
      const collection = new Collection(null, {}, collectionOrClass);
      this.setCollection(collection);
    }
  }

  /**
   * Set the collection for this list view
   */
  setCollection(collection) {
    if (this.collection === collection) return this;
    
    // Clean up old collection listeners
    if (this.collection) {
      this.collection.off('add', this._onModelsAdded, this);
      this.collection.off('remove', this._onModelsRemoved, this);
      this.collection.off('reset', this._onCollectionReset, this);
      this.collection.off('fetch:start', this._onFetchStart, this);
      this.collection.off('fetch:end', this._onFetchEnd, this);
    }
    
    this.collection = collection;
    
    // Set up new collection listeners
    if (this.collection) {
      this.collection.on('add', this._onModelsAdded, this);
      this.collection.on('remove', this._onModelsRemoved, this);
      this.collection.on('reset', this._onCollectionReset, this);
      this.collection.on('fetch:start', this._onFetchStart, this);
      this.collection.on('fetch:end', this._onFetchEnd, this);
      
      // Build items for existing models
      this._buildItems();
    }
    
    return this;
  }

  /**
   * Build item views for all models in collection
   */
  _buildItems() {
    // Clear existing items
    this._clearItems();
    
    if (!this.collection || this.collection.isEmpty()) {
      this.isEmpty = true;
      this.emit('list:empty');
      return;
    }
    
    this.isEmpty = false;
    
    // Create item views for each model
    this.collection.forEach((model, index) => {
      this._createItemView(model, index);
    });
    
    this.emit('list:loaded', { count: this.collection.length() });
    
    // Render if already mounted
    if (this.isMounted()) {
      this.render();
    }
  }

  /**
   * Create an item view for a model
   * The itemTemplate is passed as the template option to the itemClass constructor
   */
  _createItemView(model, index) {
    // Don't create duplicate views
    if (this.itemViews.has(model.id)) return;
    
    const itemView = new this.itemClass({
      model: model,
      index: index,
      listView: this,
      template: this.itemTemplate, // Pass the itemTemplate to the item view
      containerId: 'items'
    });
    
    // Store the item view
    this.itemViews.set(model.id, itemView);
    this.addChild(itemView);
    
    // Set up item event listeners
    itemView.on('item:select', this._onItemSelect.bind(this));
    itemView.on('item:deselect', this._onItemDeselect.bind(this));
    
    return itemView;
  }

  /**
   * Clear all item views
   */
  _clearItems() {
    this.forEachItem(itemView => {
      this.removeChild(itemView.id);
    });
    this.itemViews.clear();
    this.selectedItems.clear();
  }

  /**
   * Handle models added to collection
   */
  _onModelsAdded(event) {
    const { models } = event;
    
    models.forEach(model => {
      const index = this.collection.models.indexOf(model);
      this._createItemView(model, index);
    });
    
    this.isEmpty = this.collection.isEmpty();
    
    // Re-render to show new items
    if (this.isMounted()) {
      this.render();
    }
  }

  /**
   * Handle models removed from collection
   */
  _onModelsRemoved(event) {
    const { models } = event;
    
    models.forEach(model => {
      const itemView = this.itemViews.get(model.id);
      if (itemView) {
        this.removeChild(itemView.id);
        this.itemViews.delete(model.id);
        this.selectedItems.delete(model.id);
      }
    });
    
    this.isEmpty = this.collection.isEmpty();
    
    // Re-render to update display
    if (this.isMounted()) {
      this.render();
    }
    
    if (this.isEmpty) {
      this.emit('list:empty');
    }
  }

  /**
   * Handle collection reset
   */
  _onCollectionReset(_event) {
    this._buildItems();
  }

  /**
   * Handle fetch start
   */
  _onFetchStart() {
    this.loading = true;
    if (this.isMounted()) {
      this.render();
    }
  }

  /**
   * Handle fetch end
   */
  _onFetchEnd() {
    this.loading = false;
    if (this.isMounted()) {
      this.render();
    }
  }

  /**
   * Handle item selection
   */
  _onItemSelect(event) {
    const { model, item } = event;
    
    if (this.selectionMode === 'none') {
      item.deselect();
      return;
    }
    
    if (this.selectionMode === 'single') {
      // Deselect all other items
      this.itemViews.forEach((view, id) => {
        if (id !== model.id && view.selected) {
          view.deselect();
        }
      });
      this.selectedItems.clear();
    }
    
    this.selectedItems.add(model.id);
    
    this.emit('selection:change', {
      selected: Array.from(this.selectedItems),
      item: item,
      model: model
    });
  }

  /**
   * Handle item deselection
   */
  _onItemDeselect(event) {
    const { model } = event;
    
    this.selectedItems.delete(model.id);
    
    this.emit('selection:change', {
      selected: Array.from(this.selectedItems),
      item: event.item,
      model: model
    });
  }

  /**
   * Get selected items
   */
  getSelectedItems() {
    const selected = [];
    this.selectedItems.forEach(id => {
      const itemView = this.itemViews.get(id);
      if (itemView) {
        selected.push({
          view: itemView,
          model: itemView.model,
          data: itemView.model?.toJSON ? itemView.model.toJSON() : itemView.model
        });
      }
    });
    return selected;
  }

  /**
   * Iterate over each item view in the list
   * @param {function} callback - Function to execute for each item (itemView, model, index)
   * @param {object} thisArg - Optional value to use as this when executing callback
   * @returns {ListView} Returns the ListView for chaining
   */
  forEachItem(callback, thisArg) {
    if (typeof callback !== 'function') {
      throw new TypeError('Callback must be a function');
    }
    
    let index = 0;
    this.itemViews.forEach((itemView, modelId) => {
      callback.call(thisArg, itemView, itemView.model, index++);
    });
    
    return this;
  }

  /**
   * Clear selection
   */
  clearSelection() {
    this.forEachItem(itemView => {
      if (itemView.selected) {
        itemView.deselect();
      }
    });
    this.selectedItems.clear();
    
    this.emit('selection:change', {
      selected: []
    });
  }

  /**
   * Select item by model ID
   */
  selectItem(modelId) {
    const itemView = this.itemViews.get(modelId);
    if (itemView) {
      itemView.select();
    }
    return this;
  }

  /**
   * Deselect item by model ID
   */
  deselectItem(modelId) {
    const itemView = this.itemViews.get(modelId);
    if (itemView) {
      itemView.deselect();
    }
    return this;
  }

  /**
   * Set or update the item template
   * @param {string} template - New template string for items
   * @param {boolean} rerender - Whether to re-render existing items with new template
   * @returns {ListView} Returns the ListView for chaining
   */
  setItemTemplate(template, rerender = false) {
    this.itemTemplate = template;
    
    if (rerender && this.itemViews.size > 0) {
      // Update template for all existing item views
      this.forEachItem((itemView) => {
        itemView.setTemplate(template);
        if (itemView.isMounted()) {
          itemView.render();
        }
      });
    }
    
    return this;
  }

  /**
   * Refresh the list (re-fetch if collection supports it)
   */
  async refresh() {
    if (this.collection && this.collection.restEnabled) {
      return await this.collection.fetch();
    }
    this._buildItems();
  }

  /**
   * Override onInit to set up initial state
   */
  async onInit() {
    // Initial render will happen automatically
    if (this.collection && this.collection.isEmpty() && this.collection.restEnabled) {
      await this.collection.fetch();
    }
  }

  /**
   * Override destroy to clean up
   */
  async destroy() {
    // Clean up collection listeners
    if (this.collection) {
      this.collection.off('add', this._onModelsAdded, this);
      this.collection.off('remove', this._onModelsRemoved, this);
      this.collection.off('reset', this._onCollectionReset, this);
      this.collection.off('fetch:start', this._onFetchStart, this);
      this.collection.off('fetch:end', this._onFetchEnd, this);
    }
    
    // Clear items
    this._clearItems();
    
    // Call parent destroy
    await super.destroy();
  }
}

export default ListView;