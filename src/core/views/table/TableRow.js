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
import dataFormatter from '@core/utils/DataFormatter.js';

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
    
    // Inline editing state
    this.editingCells = new Set(); // Track which cells are being edited

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
    if (this.tableView && this.tableView.isSelectable()) {
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
      const editableClass = column.editable ? 'editable-cell' : '';
      const combinedClasses = [cellClass, responsiveClasses, editableClass].filter(c => c).join(' ');
      const cellContent = this.buildCellTemplate(column);
      
      // Determine cell action
      let cellAction = column.action;
      if (!cellAction && column.editable) {
        cellAction = 'edit-cell';
      } else if (!cellAction && this.tableView.rowAction) {
        cellAction = this.tableView.rowAction;
      }

      if (cellAction) {
        template += `<td class="${combinedClasses}" data-action="${cellAction}" data-column="${column.key}">${cellContent}</td>`;
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
       const path = `model.${column.key}`;
       if (column.formatter) {
         // For string formatters that are pipe expressions
         if (typeof column.formatter === 'string') {
           return `{{{${path}|${column.formatter}}}}`;
         } else if (typeof column.formatter === 'function') {
           return `<span data-formatter="${column.key}">{{${path}}}</span>`;
         }
       }

       if (column.template) {
         return column.template;
       }
       
       // For editable cells, wrap content in a span for easy replacement
       if (column.editable) {
         return `<span class="cell-content" data-field="${column.key}">{{{${path}}}}</span>`;
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
      if (menuItem.separator||menuItem.divider) {
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
             data-id="{{model.id}}"
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
      // if (column.template && typeof column.template === 'function') {
      //   const cell = this.element.querySelector(`[data-template="${column.key}"]`);
      //   if (cell) {
      //     const value = this.model.get ? this.model.get(column.key) : this.model[column.key];
      //     cell.innerHTML = column.template(value, this.model);
      //   }
      // }
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
   * Handle edit cell action
   */
  async onActionEditCell(event, element) {
    event.stopPropagation();
    
    const columnKey = element.getAttribute('data-column');
    const column = this.columns.find(col => col.key === columnKey);
    
    if (!column || !column.editable) return;
    
    // Don't enter edit mode if already editing this cell
    if (this.editingCells.has(columnKey)) return;
    
    await this.enterEditMode(columnKey, column, element);
  }

  /**
   * Handle row click action
   */
  async onActionRowClick(event, element) {
    // Don't trigger row click if clicking on action buttons or editing
    if (event.target.closest('.btn-group') || event.target.closest('.dropdown') || event.target.closest('.cell-editor')) {
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
   * Enter edit mode for a cell
   */
  async enterEditMode(columnKey, column, cellElement) {
    const contentSpan = cellElement.querySelector('.cell-content');
    if (!contentSpan) return;
    
    this.editingCells.add(columnKey);
    const currentValue = this.model.get ? this.model.get(columnKey) : this.model[columnKey];
    
    // Create editor based on column configuration
    const editor = this.createCellEditor(column, currentValue);
    
    // Replace content with editor
    const originalContent = contentSpan.innerHTML;
    contentSpan.style.display = 'none';
    
    const editorContainer = document.createElement('div');
    editorContainer.className = 'cell-editor';
    editorContainer.innerHTML = editor;
    cellElement.appendChild(editorContainer);
    
    // Focus the input
    const input = editorContainer.querySelector('input, select, .form-check-input');
    if (input) {
      input.focus();
      if (input.type === 'text' || input.type === 'textarea') {
        input.select();
      }
    }
    
    // Store original content for cancel
    editorContainer.dataset.originalContent = originalContent;
    editorContainer.dataset.columnKey = columnKey;
    
    // Set up event listeners
    this.setupEditorEvents(editorContainer, columnKey, column);
    
    this.emit('cell:edit', {
      row: this,
      model: this.model,
      column: columnKey,
      originalValue: currentValue
    });
  }

  /**
   * Create cell editor HTML based on column configuration
   */
  createCellEditor(column, currentValue) {
    const options = column.editableOptions || {};
    
    switch (options.type) {
      case 'select':
        return this.createSelectEditor(options, currentValue);
      case 'switch':
      case 'checkbox':
        return this.createSwitchEditor(options, currentValue);
      case 'textarea':
        return this.createTextareaEditor(options, currentValue);
      default:
        return this.createTextEditor(options, currentValue);
    }
  }

  /**
   * Create text input editor
   */
  createTextEditor(options, currentValue) {
    const placeholder = options.placeholder || '';
    const inputType = options.inputType || 'text';
    
    return `
      <div class="d-flex gap-1 align-items-center">
        <input type="${inputType}" 
               class="form-control form-control-sm cell-input" 
               value="${this.escapeHtml(currentValue || '')}"
               placeholder="${placeholder}">
        <button type="button" class="btn btn-sm btn-success cell-save" title="Save">
          <i class="bi bi-check"></i>
        </button>
        <button type="button" class="btn btn-sm btn-outline-secondary cell-cancel" title="Cancel">
          <i class="bi bi-x"></i>
        </button>
      </div>
    `;
  }

  /**
   * Create textarea editor
   */
  createTextareaEditor(options, currentValue) {
    const placeholder = options.placeholder || '';
    const rows = options.rows || 2;
    
    return `
      <div class="d-flex gap-1">
        <textarea class="form-control form-control-sm cell-input" 
                  rows="${rows}"
                  placeholder="${placeholder}">${this.escapeHtml(currentValue || '')}</textarea>
        <div class="d-flex flex-column gap-1">
          <button type="button" class="btn btn-sm btn-success cell-save" title="Save">
            <i class="bi bi-check"></i>
          </button>
          <button type="button" class="btn btn-sm btn-outline-secondary cell-cancel" title="Cancel">
            <i class="bi bi-x"></i>
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Create select dropdown editor
   */
  createSelectEditor(options, currentValue) {
    const optionsArray = options.options || [];
    let optionsHtml = '';
    
    optionsArray.forEach(option => {
      if (typeof option === 'string') {
        const selected = option === currentValue ? 'selected' : '';
        optionsHtml += `<option value="${option}" ${selected}>${option}</option>`;
      } else if (typeof option === 'object' && option.value !== undefined) {
        const selected = option.value === currentValue ? 'selected' : '';
        optionsHtml += `<option value="${option.value}" ${selected}>${option.label || option.value}</option>`;
      }
    });
    
    return `
      <div class="d-flex gap-1 align-items-center">
        <select class="form-select form-select-sm cell-input">
          ${optionsHtml}
        </select>
        <button type="button" class="btn btn-sm btn-success cell-save" title="Save">
          <i class="bi bi-check"></i>
        </button>
        <button type="button" class="btn btn-sm btn-outline-secondary cell-cancel" title="Cancel">
          <i class="bi bi-x"></i>
        </button>
      </div>
    `;
  }

  /**
   * Create switch/checkbox editor
   */
  createSwitchEditor(options, currentValue) {
    const checked = currentValue ? 'checked' : '';
    const switchType = options.type === 'switch' ? 'form-switch' : '';
    
    return `
      <div class="d-flex gap-2 align-items-center">
        <div class="form-check ${switchType}">
          <input class="form-check-input cell-input" type="checkbox" ${checked}>
        </div>
        <div class="d-flex gap-1">
          <button type="button" class="btn btn-sm btn-success cell-save" title="Save">
            <i class="bi bi-check"></i>
          </button>
          <button type="button" class="btn btn-sm btn-outline-secondary cell-cancel" title="Cancel">
            <i class="bi bi-x"></i>
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Setup event listeners for cell editor
   */
  setupEditorEvents(editorContainer, columnKey, column) {
    const input = editorContainer.querySelector('.cell-input');
    const saveBtn = editorContainer.querySelector('.cell-save');
    const cancelBtn = editorContainer.querySelector('.cell-cancel');
    
    // Save on Enter (for text inputs)
    if (input && (input.type === 'text' || input.type === 'email' || input.type === 'number')) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.saveCellEdit(editorContainer, columnKey, column);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          this.cancelCellEdit(editorContainer, columnKey);
        }
      });
    }
    
    // Save on change for selects and checkboxes (if auto-save enabled)
    if (input && (input.type === 'checkbox' || input.tagName === 'SELECT') && column.autoSave !== false) {
      input.addEventListener('change', () => {
        this.saveCellEdit(editorContainer, columnKey, column);
      });
    }
    
    // Button events
    saveBtn?.addEventListener('click', () => {
      this.saveCellEdit(editorContainer, columnKey, column);
    });
    
    cancelBtn?.addEventListener('click', () => {
      this.cancelCellEdit(editorContainer, columnKey);
    });
  }

  /**
   * Save cell edit
   */
  async saveCellEdit(editorContainer, columnKey, column) {
    const input = editorContainer.querySelector('.cell-input');
    if (!input) return;
    
    let newValue;
    
    // Extract value based on input type
    if (input.type === 'checkbox') {
      newValue = input.checked;
    } else if (input.tagName === 'SELECT') {
      newValue = input.value;
    } else {
      newValue = input.value;
    }
    
    const oldValue = this.model.get ? this.model.get(columnKey) : this.model[columnKey];
    
    // Save to model and backend
    try {
      if (this.model.save) {
        await this.model.save({ [columnKey]: newValue });
      } else {
        // Fallback for models without save method
        this.model[columnKey] = newValue;
      }
      
      // Exit edit mode
      this.exitEditMode(editorContainer, columnKey, newValue);
      
      // Emit save event
      this.emit('cell:save', {
        row: this,
        model: this.model,
        column: columnKey,
        oldValue: oldValue,
        newValue: newValue
      });
      
    } catch (error) {
      // Show error and keep in edit mode
      console.error('Failed to save cell edit:', error);
      this.emit('cell:save:error', {
        row: this,
        model: this.model,
        column: columnKey,
        oldValue: oldValue,
        newValue: newValue,
        error: error
      });
      
      // Could show an error message in the UI
      editorContainer.classList.add('saving-error');
      setTimeout(() => editorContainer.classList.remove('saving-error'), 3000);
    }
  }

  /**
   * Cancel cell edit
   */
  cancelCellEdit(editorContainer, columnKey) {
    const originalContent = editorContainer.dataset.originalContent;
    this.exitEditMode(editorContainer, columnKey, null, originalContent);
    
    this.emit('cell:cancel', {
      row: this,
      model: this.model,
      column: columnKey
    });
  }

  /**
   * Exit edit mode and restore content
   */
  exitEditMode(editorContainer, columnKey, newValue = null, originalContent = null) {
    const cellElement = editorContainer.closest('td');
    const contentSpan = cellElement.querySelector('.cell-content');
    
    if (contentSpan) {
      if (newValue !== null) {
        // Update display with new value (with proper formatting if needed)
        const column = this.columns.find(col => col.key === columnKey);
        let displayValue = newValue;
        
        if (column && column.formatter && typeof column.formatter === 'string') {
          displayValue = dataFormatter.pipe(newValue, column.formatter);
        }
        
        contentSpan.innerHTML = this.escapeHtml(displayValue);
      } else if (originalContent) {
        // Restore original content on cancel
        contentSpan.innerHTML = originalContent;
      }
      
      contentSpan.style.display = '';
    }
    
    // Remove editor
    editorContainer.remove();
    this.editingCells.delete(columnKey);
  }

  /**
   * Escape HTML for safe display
   */
  escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
