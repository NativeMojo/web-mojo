/**
 * ListViewItem - Individual item view for ListView
 * 
 * Each item is its own View with its own model, allowing for
 * independent re-rendering when the model changes.
 * 
 * Events:
 *   - 'item:click' - Emitted when item is clicked
 *   - 'item:select' - Emitted when item is selected
 *   - 'item:deselect' - Emitted when item is deselected
 * 
 * @example
 * const item = new ListViewItem({
 *   model: userModel,
 *   template: '<div class="user-item">{{name}} - {{email}}</div>'
 * });
 */

import View from '../core/View.js';

class ListViewItem extends View {
  constructor(options = {}) {
    super({
      className: 'list-view-item',
      ...options
    });

    // Item-specific properties
    this.selected = false;
    this.index = options.index ?? 0;
    this.listView = options.listView ?? null;
    
    // Default template if none provided
    if (!this.template) {
      this.template = `
        <div class="list-item-content" data-action="select">
          {{#model}}
            {{#id}}<span class="item-id">{{id}}</span>{{/id}}
            {{#name}}<span class="item-name">{{name}}</span>{{/name}}
            {{#title}}<span class="item-title">{{title}}</span>{{/title}}
            {{#label}}<span class="item-label">{{label}}</span>{{/label}}
            {{#description}}<p class="item-description">{{description}}</p>{{/description}}
          {{/model}}
          {{^model}}
            <span class="item-empty">No data</span>
          {{/model}}
        </div>
      `;
    }
  }

  /**
   * Handle item selection action
   */
  async onActionSelect(action, event, _element) {
    event.stopPropagation();
    
    if (this.selected) {
      this.deselect();
    } else {
      this.select();
    }
  }

  /**
   * Select this item
   */
  select() {
    if (this.selected) return;
    
    this.selected = true;
    this.addClass('selected');
    
    // Emit selection event with item data
    this.emit('item:select', {
      item: this,
      model: this.model,
      index: this.index,
      data: this.model?.toJSON ? this.model.toJSON() : this.model
    });
    
    // Notify parent ListView if available
    if (this.listView) {
      this.listView.emit('item:select', {
        item: this,
        model: this.model,
        index: this.index,
        data: this.model?.toJSON ? this.model.toJSON() : this.model
      });
    }
  }

  /**
   * Deselect this item
   */
  deselect() {
    if (!this.selected) return;
    
    this.selected = false;
    this.removeClass('selected');
    
    // Emit deselection event
    this.emit('item:deselect', {
      item: this,
      model: this.model,
      index: this.index,
      data: this.model?.toJSON ? this.model.toJSON() : this.model
    });
    
    // Notify parent ListView if available
    if (this.listView) {
      this.listView.emit('item:deselect', {
        item: this,
        model: this.model,
        index: this.index,
        data: this.model?.toJSON ? this.model.toJSON() : this.model
      });
    }
  }

  /**
   * Handle click events on the item
   */
  async onActionDefault(action, _event, _element) {
    // Emit click event for any action not specifically handled
    this.emit('item:click', {
      item: this,
      model: this.model,
      index: this.index,
      action: action,
      data: this.model?.toJSON ? this.model.toJSON() : this.model
    });
    
    // Notify parent ListView if available
    if (this.listView) {
      this.listView.emit('item:click', {
        item: this,
        model: this.model,
        index: this.index,
        action: action,
        data: this.model?.toJSON ? this.model.toJSON() : this.model
      });
    }
  }

  /**
   * Set the item's index in the list
   */
  setIndex(index) {
    this.index = index;
    this.element.setAttribute('data-index', index);
    return this;
  }

  /**
   * Update the item's selection state
   */
  setSelected(selected) {
    if (selected) {
      this.select();
    } else {
      this.deselect();
    }
    return this;
  }

  /**
   * Override destroy to clean up references
   */
  async destroy() {
    // Remove reference to parent ListView
    this.listView = null;
    
    // Call parent destroy
    await super.destroy();
  }
}

export default ListViewItem;