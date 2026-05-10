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

import View from '@core/View.js';

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
    this.clickable = options.clickable === true;
    if (this.clickable && this.element) {
      this.addClass('clickable');
    }

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
  async onActionSelect(event, _element) {
    event.stopPropagation();

    if (this.selected) {
      this.deselect();
    } else {
      this.select();
    }
  }

  /**
   * Handle the standard View / Edit / Delete actions when the item
   * template includes `data-action="view"` / `"edit"` / `"delete"` buttons.
   * Each emits a `row:view` / `row:edit` / `row:delete` event with the
   * model and event payload — ListView listens for these and runs the
   * standard Modal dialog flow (or a custom override).
   */
  async onActionView(event, _element) {
    event.stopPropagation();
    this._emitRowEvent('row:view', event);
  }

  async onActionEdit(event, _element) {
    event.stopPropagation();
    this._emitRowEvent('row:edit', event);
  }

  async onActionDelete(event, _element) {
    event.stopPropagation();
    this._emitRowEvent('row:delete', event);
  }

  /** @private */
  _emitRowEvent(name, event) {
    const payload = {
      item: this,
      model: this.model,
      index: this.index,
      event,
      data: this.model?.toJSON ? this.model.toJSON() : this.model
    };
    this.emit(name, payload);
    if (this.listView) this.listView.emit(name, payload);
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
   * onAfterRender — wire up the whole-row click handler when `clickable` is
   * set. Inner elements with their own `data-action` are NOT intercepted: the
   * EventDelegate on the parent View runs first and dispatches the inner
   * action, while this listener checks `event.defaultPrevented` and bails
   * out so we don't double-fire. The click only registers as a "row click"
   * when the user clicked the card body, not a button/link inside it.
   */
  async onAfterRender() {
    await super.onAfterRender();
    if (this.clickable && this.element) {
      this.addClass('clickable');
      this._wireClickableHandler();
    }
    // Parent ListView owns the row-stripe mapping; the row just signals
    // "I rendered, refresh me". Piggybacks on View's automatic
    // `model:change → render()` so stripes auto-update on model change.
    if (this.listView?.rowStripe && typeof this.listView._applyRowStripe === 'function') {
      this.listView._applyRowStripe(this);
    }
  }

  _wireClickableHandler() {
    if (this._clickableHandler || !this.element) return;
    this._clickableHandler = (event) => {
      // If the click landed on (or inside) an element with a `data-action`,
      // the inner action handler owns it — don't treat it as a row click.
      if (event.target?.closest?.('[data-action]')) return;
      // Skip native form-control interactions (typing in an input inside the card).
      const tag = event.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      this.emit('item:click', {
        item: this,
        model: this.model,
        index: this.index,
        action: 'row-click',
        event,
        data: this.model?.toJSON ? this.model.toJSON() : this.model
      });
      if (this.listView) {
        this.listView.emit('item:click', {
          item: this,
          model: this.model,
          index: this.index,
          action: 'row-click',
          event,
          data: this.model?.toJSON ? this.model.toJSON() : this.model
        });
      }
    };
    this.element.addEventListener('click', this._clickableHandler);
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
    // Remove the row-click handler we attached imperatively.
    if (this._clickableHandler && this.element) {
      this.element.removeEventListener('click', this._clickableHandler);
      this._clickableHandler = null;
    }
    // Remove reference to parent ListView
    this.listView = null;

    // Call parent destroy
    await super.destroy();
  }
}

export default ListViewItem;
