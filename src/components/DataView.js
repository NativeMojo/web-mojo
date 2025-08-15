/**
 * DataView - Key/Value data display component for MOJO framework
 * Extends View to display object data in a responsive grid layout with formatting support
 */

import View from '../core/View.js';
import dataFormatter from '../utils/DataFormatter.js';

class DataView extends View {
  constructor(options = {}) {
    // Extract DataView-specific options
    const {
      data,
      model,
      fields,
      columns,
      responsive,
      showEmptyValues,
      emptyValueText,
      ...viewOptions
    } = options;

    // Set default view options
    super({
      tagName: 'div',
      className: 'data-view',
      ...viewOptions
    });

    // Core properties
    this.data = data || {};
    this.fields = fields || [];

    // Model integration
    this.model = model || null;

    // If a model is provided, use it as data source
    if (this.model) {
      this.data = this.model;
    }

    // DataView-specific configuration
    this.dataViewOptions = {
      columns: columns || 2,
      responsive: responsive !== false,  // Default to true
      showEmptyValues: showEmptyValues || false,
      emptyValueText: emptyValueText || '—',
      rowClass: 'row g-3',
      itemClass: 'data-view-item',
      labelClass: 'data-view-label fw-semibold text-muted small text-uppercase',
      valueClass: 'data-view-value'
    };

    // Auto-generate fields from data if none provided
    if (this.fields.length === 0 && this.data) {
      this.generateFieldsFromData();
    }
  }

  /**
   * Auto-generate field definitions from data object
   */
  generateFieldsFromData() {
    const dataObj = this.getData();

    if (dataObj && typeof dataObj === 'object') {
      this.fields = Object.keys(dataObj).map(key => ({
        name: key,
        label: this.formatLabel(key),
        type: this.inferFieldType(dataObj[key])
      }));
    }
  }

  /**
   * Format field name into a readable label
   * @param {string} name - Field name
   * @returns {string} Formatted label
   */
  formatLabel(name) {
    return name
      .replace(/([A-Z])/g, ' $1')  // Add space before capital letters
      .replace(/[_-]/g, ' ')        // Replace underscores and hyphens with spaces
      .replace(/\b\w/g, l => l.toUpperCase())  // Title case
      .trim();
  }

  /**
   * Infer field type from value
   * @param {*} value - Field value
   * @returns {string} Field type
   */
  inferFieldType(value) {
    if (value === null || value === undefined) return 'text';

    const type = typeof value;

    if (type === 'boolean') return 'boolean';
    if (type === 'number') return 'number';
    if (type === 'object') return 'json';
    if (type === 'string') {
      // Check for common patterns
      if (value.includes('@')) return 'email';
      if (value.match(/^\d{4}-\d{2}-\d{2}/)) return 'date';
      if (value.match(/^https?:\/\//)) return 'url';
    }

    return 'text';
  }

  /**
   * Get data object (handles both raw objects and Models)
   * @returns {object} Data object
   */
  getData() {
    if (this.model && typeof this.model.toJSON === 'function') {
      return this.model.toJSON();
    }
    return this.data || {};
  }

  /**
   * Get field value with formatting support
   * @param {object} field - Field definition
   * @returns {*} Field value (formatted if specified)
   */
  getFieldValue(field) {
    let value;

    // Get value from data source
    if (this.model && typeof this.model.get === 'function') {
      // Use pipe formatting if specified
      const key = field.format ? `${field.name}|${field.format}` : field.name;
      value = this.model.get(key);
    } else {
      // Plain object access
      value = this.getData()[field.name];

      // Apply formatting if specified
      if (field.format && value != null) {
        value = dataFormatter.pipe(value, field.format);
      }
    }

    // Handle empty values
    if (value === null || value === undefined || value === '') {
      return this.dataViewOptions.showEmptyValues ? this.dataViewOptions.emptyValueText : null;
    }

    return value;
  }

  /**
   * Generate column classes based on configuration
   * @param {object} field - Field definition
   * @returns {string} CSS classes
   */
  getColumnClasses(field) {
    const colSize = field.colSize || Math.floor(12 / this.dataViewOptions.columns);

    if (this.dataViewOptions.responsive) {
      // Responsive breakpoints: 1 column on small, configured on larger screens
      return `col-12 col-md-${colSize}`;
    }

    return `col-${colSize}`;
  }

  /**
   * Override getTemplate to provide inline template
   * @returns {Promise<string>} Template string
   */
  async getTemplate() {
    return this.buildDataViewHTML();
  }

  /**
   * Build the complete DataView HTML template
   * @returns {string} Complete HTML string
   */
  buildDataViewHTML() {
    const items = this.buildItemsHTML();

    return `
      <div class="${this.dataViewOptions.rowClass}">
        ${items}
      </div>
    `;
  }

  /**
   * Build HTML for all data items
   * @returns {string} Items HTML
   */
  buildItemsHTML() {
    return this.fields
      .map(field => this.buildItemHTML(field))
      .filter(Boolean)  // Remove empty items
      .join('');
  }

  /**
   * Build HTML for a single data item
   * @param {object} field - Field definition
   * @returns {string} Item HTML
   */
  buildItemHTML(field) {
    const value = this.getFieldValue(field);

    // Skip fields with no value if showEmptyValues is false
    if (value === null && !this.dataViewOptions.showEmptyValues) {
      return '';
    }

    const label = field.label || this.formatLabel(field.name);
    const colClasses = this.getColumnClasses(field);

    return `
      <div class="${colClasses}">
        <div class="${this.dataViewOptions.itemClass}" data-field="${field.name}">
          ${this.buildLabelHTML(label, field)}
          ${this.buildValueHTML(value, field)}
        </div>
      </div>
    `;
  }

  /**
   * Build label HTML
   * @param {string} label - Label text
   * @param {object} field - Field definition
   * @returns {string} Label HTML
   */
  buildLabelHTML(label, field) {
    const labelClass = field.labelClass || this.dataViewOptions.labelClass;

    return `<div class="${labelClass}">${this.escapeHtml(label)}:</div>`;
  }

  /**
   * Build value HTML with type-specific formatting
   * @param {*} value - Field value
   * @param {object} field - Field definition
   * @returns {string} Value HTML
   */
  buildValueHTML(value, field) {
    const valueClass = field.valueClass || this.dataViewOptions.valueClass;
    const displayValue = this.formatDisplayValue(value, field);

    return `<div class="${valueClass}">${displayValue}</div>`;
  }

  /**
   * Format value for display with type-specific handling
   * @param {*} value - Raw value
   * @param {object} field - Field definition
   * @returns {string} Formatted display value
   */
  formatDisplayValue(value, field) {
    if (value === null || value === undefined) {
      return this.dataViewOptions.emptyValueText;
    }

    // Handle different field types
    switch (field.type) {
      case 'boolean':
        return value ?
          '<span class="badge bg-success">Yes</span>' :
          '<span class="badge bg-secondary">No</span>';

      case 'email':
        return `<a href="mailto:${this.escapeHtml(value)}" class="text-decoration-none">${this.escapeHtml(value)}</a>`;

      case 'url':
        return `<a href="${this.escapeHtml(value)}" target="_blank" rel="noopener" class="text-decoration-none">${this.escapeHtml(value)} <i class="fas fa-external-link-alt fa-sm"></i></a>`;

      case 'number':
        return typeof value === 'number' ? value.toLocaleString() : this.escapeHtml(value);

      case 'json':
      case 'object':
        return this.formatAsJson(value);

      default:
        // Auto-detect objects and arrays for JSON display
        if (typeof value === 'object' && value !== null) {
          return this.formatAsJson(value);
        }
        return this.escapeHtml(value);
    }
  }

  /**
   * Format object/array values as styled JSON
   * @param {*} value - Object or array value
   * @returns {string} Formatted JSON HTML
   */
  formatAsJson(value) {
    try {
      const jsonString = JSON.stringify(value, null, 2);
      const escapedJson = this.escapeHtml(jsonString);
      const lines = jsonString.split('\n').length;
      const isLarge = lines > 10 || jsonString.length > 500;
      const uniqueId = `json-${Math.random().toString(36).substr(2, 9)}`;

      // Create collapsible JSON display for large objects
      if (isLarge) {
        const preview = JSON.stringify(value).substring(0, 100) + (JSON.stringify(value).length > 100 ? '...' : '');
        const escapedPreview = this.escapeHtml(preview);

        return `
          <div class="json-container">
            <div class="d-flex align-items-center justify-content-between mb-1">
              <small class="text-muted">${Array.isArray(value) ? 'Array' : 'Object'} (${lines} lines)</small>
              <div class="btn-group btn-group-sm" role="group">
                <button type="button" class="btn btn-outline-secondary btn-sm json-toggle" data-bs-toggle="collapse" data-bs-target="#${uniqueId}" aria-expanded="false">
                  <i class="fas fa-eye"></i> Show
                </button>
                <button type="button" class="btn btn-outline-secondary btn-sm json-copy" data-json='${this.escapeHtml(jsonString)}' title="Copy JSON">
                  <i class="fas fa-copy"></i>
                </button>
              </div>
            </div>
            <div class="json-preview bg-light p-2 rounded small border" style="font-family: 'Courier New', monospace;">
              <code class="text-muted">${escapedPreview}</code>
            </div>
            <div class="collapse mt-2" id="${uniqueId}">
              <pre class="json-display bg-dark text-light p-3 rounded small mb-0" style="max-height: 400px; overflow-y: auto; white-space: pre-wrap; font-family: 'Courier New', monospace;"><code>${this.syntaxHighlightJson(escapedJson)}</code></pre>
            </div>
          </div>
        `;
      } else {
        // Small objects - show directly with copy button
        return `
          <div class="json-container">
            <div class="d-flex align-items-center justify-content-between mb-1">
              <small class="text-muted">${Array.isArray(value) ? 'Array' : 'Object'}</small>
              <button type="button" class="btn btn-outline-secondary btn-sm json-copy" data-json='${this.escapeHtml(jsonString)}' title="Copy JSON">
                <i class="fas fa-copy"></i>
              </button>
            </div>
            <pre class="json-display bg-light p-2 rounded small mb-0 border" style="white-space: pre-wrap; font-family: 'Courier New', monospace;"><code>${this.syntaxHighlightJson(escapedJson)}</code></pre>
          </div>
        `;
      }
    } catch (error) {
      // Fallback for objects that can't be stringified
      return `<span class="text-muted fst-italic">[Object: ${typeof value}] - Cannot display as JSON</span>`;
    }
  }

  /**
   * Apply basic syntax highlighting to JSON
   * @param {string} json - Escaped JSON string
   * @returns {string} JSON with basic syntax highlighting
   */
  syntaxHighlightJson(json) {
    return json
      .replace(/("([^"\\]|\\.)*")\s*:/g, '<span style="color: #0969da;">$1</span>:') // Keys (blue)
      .replace(/:\s*("([^"\\]|\\.)*")/g, ': <span style="color: #0a3069;">$1</span>') // String values (dark blue)
      .replace(/:\s*(true|false)/g, ': <span style="color: #8250df;">$1</span>') // Booleans (purple)
      .replace(/:\s*(null)/g, ': <span style="color: #656d76;">$1</span>') // Null (gray)
      .replace(/:\s*(-?\d+\.?\d*)/g, ': <span style="color: #0550ae;">$1</span>'); // Numbers (blue)
  }

  /**
   * Override bindEvents to add DataView-specific event handling
   */
  bindEvents() {
    super.bindEvents();

    if (!this.element) return;

    // Add click handler for field interactions
    this.element.addEventListener('click', (e) => {
      const fieldElement = e.target.closest('[data-field]');
      if (fieldElement) {
        const fieldName = fieldElement.dataset.field;
        const field = this.fields.find(f => f.name === fieldName);
        this.emit('field:click', { field, fieldName, element: fieldElement, event: e });
      }

      // Handle JSON copy button clicks
      if (e.target.closest('.json-copy')) {
        e.preventDefault();
        e.stopPropagation();
        this.handleJsonCopy(e.target.closest('.json-copy'));
      }

      // Handle JSON toggle button clicks
      if (e.target.closest('.json-toggle')) {
        this.handleJsonToggle(e.target.closest('.json-toggle'));
      }
    });
  }

  /**
   * Handle copying JSON to clipboard
   * @param {HTMLElement} button - Copy button element
   */
  handleJsonCopy(button) {
    const jsonData = button.getAttribute('data-json');
    if (!jsonData) return;

    try {
      // Use modern clipboard API if available
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(jsonData).then(() => {
          this.showCopyFeedback(button);
        });
      } else {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = jsonData;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        this.showCopyFeedback(button);
      }
    } catch (error) {
      console.warn('Failed to copy JSON:', error);
    }
  }

  /**
   * Handle JSON toggle button state
   * @param {HTMLElement} button - Toggle button element
   */
  handleJsonToggle(button) {
    const icon = button.querySelector('i');
    const isExpanded = button.getAttribute('aria-expanded') === 'true';

    // Update button text and icon
    setTimeout(() => {
      if (isExpanded) {
        icon.className = 'fas fa-eye-slash';
        button.innerHTML = '<i class="fas fa-eye-slash"></i> Hide';
      } else {
        icon.className = 'fas fa-eye';
        button.innerHTML = '<i class="fas fa-eye"></i> Show';
      }
    }, 10);
  }

  /**
   * Show visual feedback for successful copy
   * @param {HTMLElement} button - Copy button element
   */
  showCopyFeedback(button) {
    const originalIcon = button.querySelector('i').className;
    const icon = button.querySelector('i');

    // Show success state
    icon.className = 'fas fa-check text-success';
    button.classList.add('btn-success');
    button.classList.remove('btn-outline-secondary');

    // Reset after 1 second
    setTimeout(() => {
      icon.className = originalIcon;
      button.classList.remove('btn-success');
      button.classList.add('btn-outline-secondary');
    }, 1000);
  }

  /**
   * Update the data and re-render
   * @param {object} newData - New data object
   * @returns {Promise<DataView>} Promise resolving to this instance
   */
  async updateData(newData) {
    this.data = newData;

    // If model is provided, update it instead
    if (this.model && typeof this.model.set === 'function') {
      this.model.set(newData);
    }

    // Re-render if already rendered
    if (this.rendered) {
      await this.render();
    }

    this.emit('data:updated', { data: newData });
    return this;
  }

  /**
   * Update field configuration and re-render
   * @param {array} newFields - New field configuration
   * @returns {Promise<DataView>} Promise resolving to this instance
   */
  async updateFields(newFields) {
    this.fields = newFields;

    // Re-render if already rendered
    if (this.rendered) {
      await this.render();
    }

    this.emit('fields:updated', { fields: newFields });
    return this;
  }

  /**
   * Update configuration and re-render
   * @param {object} newOptions - New configuration options
   * @returns {Promise<DataView>} Promise resolving to this instance
   */
  async updateConfig(newOptions) {
    this.dataViewOptions = { ...this.dataViewOptions, ...newOptions };

    // Re-render if already rendered
    if (this.rendered) {
      await this.render();
    }

    this.emit('config:updated', { options: this.dataViewOptions });
    return this;
  }

  /**
   * Refresh data from model if available
   * @returns {Promise<DataView>} Promise resolving to this instance
   */
  async refresh() {
    if (this.model && typeof this.model.fetch === 'function') {
      try {
        await this.model.fetch();
        // Model change events should trigger re-render automatically
        this.emit('data:refreshed', { model: this.model });
      } catch (error) {
        this.emit('error', { error, message: 'Failed to refresh data' });
        throw error;
      }
    }
    return this;
  }

  /**
   * Get current data
   * @returns {object} Current data object
   */
  getCurrentData() {
    return this.getData();
  }

  /**
   * Get field definition by name
   * @param {string} name - Field name
   * @returns {object|null} Field definition
   */
  getField(name) {
    return this.fields.find(field => field.name === name) || null;
  }

  /**
   * Set up model event listeners if model is provided
   */
  onInit() {
    super.onInit();

    // Listen for model changes
    if (this.model && typeof this.model.on === 'function') {
      this.model.on('change', () => {
        if (this.rendered) {
          this.render();
        }
      });
    }
  }

  /**
   * Static factory method
   * @param {object} options - DataView options
   * @returns {DataView} New DataView instance
   */
  static create(options = {}) {
    return new DataView(options);
  }
}

// Export for use in MOJO framework
export default DataView;
export { DataView };
