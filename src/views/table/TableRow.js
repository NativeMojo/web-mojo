/**
 * TableRow - Individual row view for TableView
 *
 * Extends ListViewItem to render table rows with proper cell formatting
 * and support for all table features like selection, actions, and context menus.
 *
 * @example
 * const row = new TableRow({
 *   model: userModel,
 *   columns: tableColumns,
 *   actions: ['view', 'edit', 'delete']
 * });
 */

import ListViewItem from '../list/ListViewItem.js';
import dataFormatter from '../../utils/DataFormatter.js';

class TableRow extends ListViewItem {
  constructor(options = {}) {
    super({
      tagName: 'tr',
      className: 'table-row',
      ...options
    });

    // Table-specific properties
    this.columns = options.columns || [];
    this.actions = options.actions || null;
    this.contextMenu = options.contextMenu || null;
    this.batchActions = options.batchActions || null;
    this.tableView = options.tableView || options.listView || null;

    // Override template to generate table cells
    this.template = this.buildRowTemplate();
  }

  /**
   * Get responsive CSS classes for column visibility
   * @param {string} visibility - Bootstrap breakpoint (sm, md, lg, xl, xxl)
   * @returns {string} Bootstrap responsive display classes
   */
  getResponsiveClasses(visibility) {
    if (!visibility) return ''; // Always visible if no visibility specified

    const validBreakpoints = ['sm', 'md', 'lg', 'xl', 'xxl'];
    if (!validBreakpoints.includes(visibility)) {
      console.warn(`Invalid visibility breakpoint: ${visibility}. Valid options are: ${validBreakpoints.join(', ')}`);
      return '';
    }

    // Hide on smaller screens, show at breakpoint and up using table-cell display
    return `d-none d-${visibility}-table-cell`;
  }

  /**
   * Build the row template with table cells
   */
  buildRowTemplate() {
    let template = '';

    // Selection checkbox cell
    if (this.tableView && this.tableView.batchActions && this.tableView.batchActions.length > 0) {
      template += `
        <td style="padding: 0;">
          <div class="mojo-select-cell {{#selected}}selected{{/selected}}"
               data-action="select">
            <div class="mojo-checkbox">
              <i class="bi bi-check"></i>
            </div>
          </div>
        </td>
      `;
    }

    // Data cells for each column
    this.columns.forEach(column => {
      const cellClass = column.class || column.className || '';
      const responsiveClasses = this.getResponsiveClasses(column.visibility);
      const combinedClasses = [cellClass, responsiveClasses].filter(c => c).join(' ');
      const cellContent = this.buildCellTemplate(column);
      if (!column.action && this.tableView.rowAction) {
          column.action = this.tableView.rowAction;
      }

      if (column.action) {
        template += `<td class="${combinedClasses}" data-action="${column.action}" data-column="${column.key}">${cellContent}</td>`;
      } else {
        template += `<td class="${combinedClasses}" data-column="${column.key}">${cellContent}</td>`;
      }
    });

    // Actions cell
    if (this.actions) {
      template += this.buildActionsTemplate();
    } else if (this.contextMenu) {
      template += this.buildContextMenuTemplate();
    }

    return template;
  }

  /**
   * Build template for a single cell
   */
   /**
    * Build template for a single cell
    */
   buildCellTemplate(column) {
       // Build path for Mustache to access the value
       const path = column.key.includes('.') ? column.key : `model.${column.key}`;
       if (column.formatter) {
         // For string formatters that are pipe expressions
         if (typeof column.formatter === 'string') {
           return `{{{${path}|${column.formatter}}}}`;
         } else if (typeof column.formatter === 'function') {
           return `<span data-formatter="${column.key}">{{${path}}}</span>`;
         }
       }

       if (column.template) {
         return `<span data-template="${column.key}">{{${path}}}</span>`;
       }
       return `{{{${path}}}}`;
   }

  /**
   * Build actions cell template
   */
  buildActionsTemplate() {
    if (!this.actions || this.actions.length === 0) return '';

    const buttons = this.actions.map(action => {
      if (typeof action === 'string') {
        switch (action) {
          case 'view':
            return `
              <button class="btn btn-sm btn-outline-primary"
                      data-action="view"
                      title="View">
                <i class="bi bi-eye"></i>
              </button>
            `;

          case 'edit':
            return `
              <button class="btn btn-sm btn-outline-secondary"
                      data-action="edit"
                      title="Edit">
                <i class="bi bi-pencil"></i>
              </button>
            `;

          case 'delete':
            return `
              <button class="btn btn-sm btn-outline-danger"
                      data-action="delete"
                      title="Delete">
                <i class="bi bi-trash"></i>
              </button>
            `;

          default:
            return '';
        }
      } else if (typeof action === 'object') {
        return `
          <button class="btn btn-sm ${action.class || 'btn-outline-primary'}"
                  data-action="${action.action}"
                  title="${action.label || ''}">
            ${action.icon ? `<i class="${action.icon}"></i>` : ''}
            ${action.label && !action.icon ? action.label : ''}
          </button>
        `;
      }
      return '';
    }).join('');

    return `<td><div class="btn-group btn-group-sm">${buttons}</div></td>`;
  }

  /**
   * Build context menu cell template
   */
  buildContextMenuTemplate() {
    if (!this.contextMenu || this.contextMenu.length === 0) return '';

    return `
      <td class="text-end" style="width: 1px;">
        <div class="dropdown">
          <button class="btn btn-sm btn-link border-0"
                  type="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                  style="color: #6c757d;">
            <i class="bi bi-three-dots-vertical"></i>
          </button>
          <ul class="dropdown-menu dropdown-menu-end shadow-sm">
            ${this.buildContextMenuItems()}
          </ul>
        </div>
      </td>
    `;
  }

  /**
   * Build context menu items
   */
  buildContextMenuItems() {
    return this.contextMenu.map(menuItem => {
      if (menuItem.separator) {
        return '<li><hr class="dropdown-divider"></li>';
      }

      let itemClass = 'dropdown-item';
      if (menuItem.action === 'delete' || menuItem.danger) {
        itemClass += ' text-danger';
      }
      if (menuItem.disabled) {
        itemClass += ' disabled';
      }

      return `
        <li>
          <a class="${itemClass}" href="#"
             data-action="${menuItem.action}"
             ${menuItem.disabled ? 'aria-disabled="true" tabindex="-1"' : ''}>
            ${menuItem.icon ? `<i class="${menuItem.icon} me-2"></i>` : ''}
            ${menuItem.label}
          </a>
        </li>
      `;
    }).join('');
  }

  /**
   * Override onAfterRender to apply function formatters and templates
   */
  async onAfterRender() {
    await super.onAfterRender();

    // Apply function formatters
    this.columns.forEach(column => {
      if (column.formatter && typeof column.formatter === 'function') {
        const cell = this.element.querySelector(`[data-formatter="${column.key}"]`);
        if (cell) {
          const value = this.model.get ? this.model.get(column.key) : this.model[column.key];
          const context = {
            value,
            row: this.model,
            column,
            table: this.tableView,
            index: this.index
          };
          cell.innerHTML = column.formatter(value, context);
        }
      }

      // Apply function templates
      if (column.template && typeof column.template === 'function') {
        const cell = this.element.querySelector(`[data-template="${column.key}"]`);
        if (cell) {
          const value = this.model.get ? this.model.get(column.key) : this.model[column.key];
          cell.innerHTML = column.template(value, this.model);
        }
      }
    });

    // Update selection state
    if (this.selected) {
      this.element.classList.add('selected');
    }

    // Set data-id attribute for easy identification
    const id = this.model.get ? this.model.get('id') : this.model.id;
    if (id) {
      this.element.setAttribute('data-id', id);
    }
  }

  /**
   * Handle row click action
   */
  async onActionRowClick(event, element) {
    // Don't trigger row click if clicking on action buttons
    if (event.target.closest('.btn-group') || event.target.closest('.dropdown')) {
      return;
    }

    // Emit row click event
    this.emit('row:click', {
      row: this,
      model: this.model,
      column: element.getAttribute('data-column'),
      event: event
    });

    // Notify parent TableView
    if (this.tableView) {
      this.tableView.emit('row:click', {
        row: this,
        model: this.model,
        column: element.getAttribute('data-column'),
        event: event
      });
    }
  }

  /**
   * Handle view action
   */
  async onActionView(event, element) {
    event.stopPropagation();

    this.emit('row:view', {
      row: this,
      model: this.model,
      event: event
    });

    if (this.tableView) {
      this.tableView.emit('row:view', {
        row: this,
        model: this.model,
        event: event
      });
    }
  }

  /**
   * Handle edit action
   */
  async onActionEdit(event, element) {
    event.stopPropagation();

    this.emit('row:edit', {
      row: this,
      model: this.model,
      event: event
    });

    if (this.tableView) {
      this.tableView.emit('row:edit', {
        row: this,
        model: this.model,
        event: event
      });
    }
      return true;
  }

  /**
   * Handle delete action
   */
  async onActionDelete(event, element) {
    event.stopPropagation();

    this.emit('row:delete', {
      row: this,
      model: this.model,
      event: event
    });

    if (this.tableView) {
      this.tableView.emit('row:delete', {
        row: this,
        model: this.model,
        event: event
      });
    }
  }

  /**
   * Override select to handle table-specific selection UI
   */
  select() {
    super.select();
    this.addClass('selected');

    // Update checkbox visual state
    const selectCell = this.element?.querySelector('.mojo-select-cell');
    if (selectCell) {
      selectCell.classList.add('selected');
    }
  }

  /**
   * Override deselect to handle table-specific selection UI
   */
  deselect() {
    super.deselect();
    this.removeClass('selected');

    // Update checkbox visual state
    const selectCell = this.element?.querySelector('.mojo-select-cell');
    if (selectCell) {
      selectCell.classList.remove('selected');
    }
  }
}

export default TableRow;
