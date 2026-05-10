/**
 * ListGroupHeaderView - Synthetic header row inserted between groups of items
 * in a ListView when `groupBy` is configured.
 *
 * Extends `View` directly (NOT `ListViewItem`) so it does not inherit the
 * row-click / `onActionDefault` / `_wireClickableHandler` machinery — header
 * rows must NEVER fire `item:click`, `row:click`, or `clickAction: 'view'`.
 *
 * The view's Mustache context exposes:
 *   - `{{key}}`     — the resolved + label-formatted display key
 *   - `{{model.*}}` — the trigger model (first model of the group)
 *   - `{{colspan}}` — set by TableView's override so a `<th colspan="N">`
 *                    header spans the full row.
 */

import View from '@core/View.js';

class ListGroupHeaderView extends View {
  constructor(options = {}) {
    super({
      tagName: options.tagName || 'div',
      className: options.className || 'list-group-header',
      ...options
    });

    this.key = options.key ?? '';
    this.index = options.index ?? 0;
    this.colspan = options.colspan ?? 1;

    if (!this.template) {
      this.template = '{{key}}';
    }
  }
}

export default ListGroupHeaderView;
