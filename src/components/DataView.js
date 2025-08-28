/**
 * DataView - Key/Value data display component for MOJO framework
 * Extends View to display object data in a responsive grid layout with intelligent formatting support
 *
 * Features:
 * - Automatic field generation from data with intelligent type inference
 * - Smart DataFormatter pipe chains (e.g., "date('MMM D, YYYY')|capitalize")
 * - Contextual formatting based on field names and values
 * - Support for complex pipe chains like "truncate(100)|capitalize|badge"
 * - Nested DataView support with type="dataview" for complex objects
 * - Custom format overrides with fluent API
 * - No format collision: custom field.format completely overrides DataView formatting
 *
 * Format Behavior:
 * - No field.format: DataView applies type-based HTML formatting (badges, links, etc.)
 * - With field.format: DataFormatter handles ALL formatting, DataView only escapes HTML
 *
 * Example Usage:
 * ```javascript
 * const dataView = new DataView({
 *   data: {
 *     name: 'john doe',
 *     email: 'john@example.com',
 *     createdAt: '2024-01-15T10:30:00Z',
 *     price: 99.99,
 *     description: 'A very long description that should be truncated...',
 *     isActive: true
 *   }
 * });
 *
 * // Auto-inferred formats (DataView adds HTML styling):
 * // name: "truncate(50)|capitalize"
 * // email: no format → DataView creates mailto: link
 * // createdAt: "date('MMM D, YYYY')"
 * // price: "currency"
 * // description: "truncate(200)"
 * // isActive: no format → DataView creates badge styling
 *
 * // Custom format overrides (DataFormatter handles ALL formatting):
 * dataView
 *   .setFieldFormat('name', 'uppercase|truncate(20)')      // No DataView HTML styling
 *   .setFieldFormat('email', 'email|uppercase')           // No mailto: link
 *   .setFieldFormat('isActive', 'boolean|uppercase')      // No badge styling
 *   .setFieldFormats({
 *     description: 'truncate(50)|capitalize',
 *     createdAt: 'relative'
 *   });
 *
 * // Nested DataView for complex objects:
 * dataView.setFieldFormat('permissions', null); // Clear auto-format
 * // Then configure field: { name: 'permissions', type: 'dataview', label: 'User Permissions' }
 * ```
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
  }

  /**
   * Lifecycle hook - prepare data and fields before rendering
   */
  async onBeforeRender() {

    // Auto-generate fields from data if none provided
    if (this.fields.length === 0 && this.getData()) {
      this.generateFieldsFromData();
    }
  }

  /**
   * Override renderTemplate to generate HTML directly
   * @returns {string} Complete HTML string
   */
  async renderTemplate() {
    const items = this.buildItemsHTML();

    return `
      <div class="${this.dataViewOptions.rowClass}">
        ${items}
      </div>
    `;
  }

  /**
   * Auto-generate field definitions from data object with intelligent type inference
   */
  generateFieldsFromData() {
    const dataObj = this.getData();

    if (dataObj && typeof dataObj === 'object') {
      this.fields = Object.keys(dataObj).map(key => {
        const value = dataObj[key];
        const fieldType = this.inferFieldType(value, key);
        const formatter = this.inferFormatter(value, key, fieldType);

        return {
          name: key,
          label: this.formatLabel(key),
          type: fieldType,
          format: formatter
        };
      });
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
   * Infer field type from value and key with improved intelligence
   * @param {*} value - Field value
   * @param {string} key - Field key
   * @returns {string} Field type
   */
  inferFieldType(value, key = '') {
    if (value === null || value === undefined) return 'text';

    const keyLower = key.toLowerCase();
    const type = typeof value;

    // Date/time patterns
    if (keyLower.includes('date') || keyLower.includes('time') ||
        keyLower.includes('created') || keyLower.includes('updated') ||
        keyLower.includes('modified') || keyLower.includes('last_login') ||
        keyLower.includes('expires') || keyLower.includes('last_activity')) {
      return 'datetime';
    }

    // Email patterns
    if (keyLower.includes('email') || keyLower.includes('mail')) {
      return 'email';
    }

    // URL patterns
    if (keyLower.includes('url') || keyLower.includes('link') ||
        keyLower.includes('website') || keyLower.includes('homepage')) {
      return 'url';
    }

    // Phone patterns
    if (keyLower.includes('phone') || keyLower.includes('tel') ||
        keyLower.includes('mobile') || keyLower.includes('cell')) {
      return 'phone';
    }

    // Currency/price patterns
    if (keyLower.includes('price') || keyLower.includes('cost') ||
        keyLower.includes('amount') || keyLower.includes('fee') ||
        keyLower.includes('salary') || keyLower.includes('revenue')) {
      return 'currency';
    }

    // File size patterns
    if (keyLower.includes('size') || keyLower.includes('bytes')) {
      return 'filesize';
    }

    // Percentage patterns
    if (keyLower.includes('percent') || keyLower.includes('rate') ||
        keyLower.includes('ratio') && type === 'number') {
      return 'percent';
    }

    // Type-based inference
    if (type === 'boolean') return 'boolean';
    if (type === 'number') return 'number';

    if (type === 'object') {
      if (Array.isArray(value)) return 'array';
      if (value && value.renditions) return 'file';

      // Check if object should be displayed as nested DataView
      if (this.shouldUseDataView(value, keyLower)) {
        return 'dataview';
      }

      return 'object';
    }

    if (type === 'string') {
      // Pattern matching for strings
      if (value.includes('@') && value.includes('.')) return 'email';
      if (value.match(/^\d{4}-\d{2}-\d{2}/)) return 'date';
      if (value.match(/^https?:\/\//)) return 'url';
      if (value.match(/^\+?[\d\s\-\(\)]+$/)) return 'phone';
    }

    return 'text';
  }

  /**
   * Infer appropriate formatter based on type and context
   * @param {*} value - Field value
   * @param {string} key - Field key
   * @param {string} fieldType - Inferred field type
   * @returns {string|null} Formatter pipe string
   */
  inferFormatter(value, key, fieldType) {
    const keyLower = key.toLowerCase();
    const formatters = [];

    switch (fieldType) {
      case 'datetime':
        if (keyLower.includes('time') && !keyLower.includes('date')) {
          formatters.push('time');
        } else if (keyLower.includes('relative') || keyLower.includes('ago') || keyLower.includes('last_')) {
          formatters.push('relative');
        } else if (keyLower.includes('created') || keyLower.includes('updated') || keyLower.includes('modified')) {
          formatters.push('date("MMM D, YYYY")');
        } else {
          formatters.push('date("MMMM D, YYYY")');
        }
        break;

      case 'date':
        if (keyLower.includes('birth') || keyLower.includes('dob')) {
          formatters.push('date("MMMM D, YYYY")');
        } else {
          formatters.push('date("MMM D, YYYY")');
        }
        break;

      case 'email':
        // Don't apply email formatter - DataView handles mailto: links automatically
        break;

      case 'url':
        // Don't apply url formatter - DataView handles clickable links automatically
        break;

      case 'phone':
        formatters.push('phone');
        break;

      case 'currency':
        formatters.push('currency');
        // Add currency symbol detection if needed
        if (keyLower.includes('eur') || keyLower.includes('euro')) {
          formatters[formatters.length - 1] = 'currency("EUR")';
        } else if (keyLower.includes('gbp') || keyLower.includes('pound')) {
          formatters[formatters.length - 1] = 'currency("GBP")';
        }
        break;

      case 'filesize':
        formatters.push('filesize');
        break;

      case 'percent':
        formatters.push('percent');
        break;

      case 'number':
        // Smart number formatting with pipe chains
        if (typeof value === 'number') {
          if (keyLower.includes('count') || keyLower.includes('total') || keyLower.includes('followers') || keyLower.includes('views')) {
            if (value >= 1000) {
              formatters.push('compact');
            } else {
              formatters.push('number');
            }
          } else if (keyLower.includes('score') || keyLower.includes('rating')) {
            formatters.push('number');
            // Add decimal places for scores
            if (value % 1 !== 0) {
              formatters[formatters.length - 1] = 'number(1)';
            }
          } else if (keyLower.includes('version') || keyLower.includes('id')) {
            // Don't format IDs and versions
            return null;
          } else {
            formatters.push('number');
          }
        }
        break;

      case 'boolean':
        // Don't apply boolean formatter - DataView handles badge styling automatically
        break;

      case 'text':
        // Smart text formatting with contextual pipe chains
        if (typeof value === 'string') {
          // Handle different text contexts
          if (keyLower.includes('description') || keyLower.includes('content') || keyLower.includes('body')) {
            if (value.length > 200) {
              formatters.push('truncate(200)');
            } else if (value.length > 100) {
              formatters.push('truncate(100)');
            }
          } else if (keyLower.includes('summary') || keyLower.includes('excerpt')) {
            if (value.length > 150) {
              formatters.push('truncate(150)');
            }
          } else if (keyLower.includes('name') || keyLower.includes('title') || keyLower.includes('label')) {
            formatters.push('capitalize');
            if (value.length > 50) {
              formatters.unshift('truncate(50)'); // Truncate first, then capitalize
            }
          } else if (keyLower.includes('slug') || keyLower.includes('handle') || keyLower.includes('username')) {
            formatters.push('slug');
          } else if (keyLower.includes('code') || keyLower.includes('token') || keyLower.includes('key')) {
            // Show codes/tokens with masking if long
            if (value.length > 20) {
              formatters.push('mask');
            }
          } else {
            // Generic text handling
            if (value.length > 100) {
              formatters.push('truncate(100)');
            }
          }
        }
        break;

      case 'array':
      case 'object':
        // Don't apply json formatter - DataView handles JSON display automatically
        break;

      case 'dataview':
        // Don't apply any formatter - nested DataView handles its own formatting
        break;

      default:
        // Handle any missed cases with basic text formatting
        if (typeof value === 'string' && value.length > 100) {
          formatters.push('truncate(100)');
        }
        break;
    }

    return formatters.length > 0 ? formatters.join('|') : null;
  }

  /**
   * Determine if an object should be displayed as nested DataView vs JSON
   * @param {object} value - Object value to check
   * @param {string} keyLower - Lowercase field key
   * @returns {boolean} True if should use DataView
   */
  shouldUseDataView(value, keyLower) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return false;
    }

    // Check for common patterns that benefit from DataView display
    const dataViewPatterns = [
      'permissions', 'perms', 'access', 'rights',
      'settings', 'config', 'configuration', 'options',
      'profile', 'info', 'details', 'data',
      'metadata', 'meta', 'attributes', 'props',
      'preferences', 'prefs', 'user_data',
      'contact', 'address', 'location',
      'stats', 'statistics', 'metrics', 'counts'
    ];

    if (window.utils && window.utils.isObject(value) && value.id) {
        return true;
    }

    // Check if key matches common patterns
    const matchesPattern = dataViewPatterns.some(pattern => keyLower.includes(pattern));

    if (matchesPattern) {
      // Additional checks to ensure it's suitable for DataView
      const keys = Object.keys(value);

      // Good candidates: objects with multiple simple key-value pairs
      if (keys.length >= 2 && keys.length <= 20) {
        const hasComplexNesting = keys.some(k =>
          typeof value[k] === 'object' &&
          value[k] !== null &&
          !Array.isArray(value[k]) &&
          Object.keys(value[k]).length > 3
        );

        // Use DataView if not too deeply nested
        if (!hasComplexNesting) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Get data object (handles both raw objects and Models)
   * @returns {object} Data object
   */
  getData() {
    if (this.model && this.model.attributes) {
      return { ...this.model.attributes };
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

    // Get raw value from data source
    if (this.model && typeof this.model.get === 'function') {
      // For models, get raw value first, then apply formatting separately
      // This ensures we don't break pipe chains by concatenating strings
      value = this.model.get(field.name);
    } else {
      // Plain object access
      value = this.getData()[field.name];
    }

    // Apply formatting using DataFormatter pipe system if specified
    if (field.format) {
      value = dataFormatter.pipe(value, field.format);
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
    // JSON objects and nested DataViews always use full width for better display
    if (field.type === 'array' || field.type === 'object' || field.type === 'dataview') {
      return 'col-12';
    }

    const colSize = field.columns || field.colSize || field.cols || Math.floor(12 / this.dataViewOptions.columns);

    if (this.dataViewOptions.responsive) {
      // Responsive breakpoints: 1 column on small, configured on larger screens
      return `col-12 col-md-${colSize}`;
    }

    return `col-${colSize}`;
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
   * Format value for display with enhanced type handling
   * @param {*} value - Formatted value from DataFormatter (or raw if no format)
   * @param {object} field - Field definition
   * @returns {string} Formatted display value with HTML markup
   */
  formatDisplayValue(value, field) {
    if (value === null || value === undefined) {
      return this.dataViewOptions.emptyValueText;
    }

    // If a custom format is specified, we trust the DataFormatter.
    // However, we must determine if the output is intended to be HTML or plain text.
    if (field.format) {
      // A list of formatters known to produce safe HTML output.
      const htmlSafeFormatters = [
        'badge', 'email', 'url', 'icon', 'status',
        'image', 'avatar', 'phone', 'highlight'
      ];

      // Parse the pipe string to find the last formatter applied.
      const pipes = dataFormatter.parsePipeString(field.format);
      const lastFormatter = pipes.length > 0 ? pipes[pipes.length - 1].name.toLowerCase() : null;

      // If the last formatter is in our safe list, render the HTML directly.
      if (lastFormatter && htmlSafeFormatters.includes(lastFormatter)) {
        return String(value);
      }

      // Otherwise, escape the output for security.
      return this.escapeHtml(String(value));
    }

    // No custom format - apply DataView's default type-specific HTML formatting
    // Get original raw value for special cases
    const rawValue = this.getData()[field.name];

    // Handle types that need special HTML presentation (only when no custom format)
    switch (field.type) {
      case 'boolean':
        // Use standard boolean badges (no custom format was applied)
        return rawValue ?
          '<span class="badge bg-success">Yes</span>' :
          '<span class="badge bg-secondary">No</span>';

      case 'email':
        // Create clickable email links (no custom format was applied)
        const emailStr = String(value);
        return `<a href="mailto:${this.escapeHtml(emailStr)}" class="text-decoration-none">${this.escapeHtml(emailStr)}</a>`;

      case 'url':
        // Create clickable URL links (no custom format was applied)
        const urlStr = String(value);
        return `<a href="${this.escapeHtml(urlStr)}" target="_blank" rel="noopener" class="text-decoration-none">${this.escapeHtml(urlStr)} <i class="bi bi-box-arrow-up-right"></i></a>`;

      case 'array':
      case 'object':
        // Display as JSON with special HTML formatting (no custom format was applied)
        return this.formatAsJson(rawValue);

      case 'dataview':
        // Create nested DataView for complex objects
        return this.formatAsDataView(rawValue, field);

      case 'phone':
        // Create tel: links for phone numbers (no custom format was applied)
        const phoneStr = String(value);
        const telHref = phoneStr.replace(/[^\d\+]/g, ''); // Clean for tel: link
        return `<a href="tel:${telHref}" class="text-decoration-none">${this.escapeHtml(phoneStr)}</a>`;

      default:
        // For all other types with no custom format, just escape and return
        return this.escapeHtml(String(value));
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
                  <i class="bi bi-eye"></i> Show
                </button>
                <button type="button" class="btn btn-outline-secondary btn-sm json-copy" data-json='${this.escapeHtml(jsonString)}' title="Copy JSON">
                  <i class="bi bi-clipboard"></i>
                </button>
              </div>
            </div>
            <div class="json-preview bg-light p-2 rounded small border" style="font-family: 'Courier New', monospace;">
              <code class="text-muted">${escapedPreview}</code>
            </div>
            <div class="collapse mt-2" id="${uniqueId}">
              <pre class="json-display p-3 rounded small mb-0" style="max-height: 400px; overflow-y: auto; white-space: pre-wrap; font-family: 'Courier New', monospace;"><code>${this.syntaxHighlightJson(escapedJson)}</code></pre>
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
                <i class="bi bi-clipboard"></i>
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
   * Bind events including JSON interaction handlers
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
        icon.className = 'bi bi-eye-slash';
        button.innerHTML = '<i class="bi bi-eye-slash"></i> Hide';
      } else {
        icon.className = 'bi bi-eye';
        button.innerHTML = '<i class="bi bi-eye"></i> Show';
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
    icon.className = 'bi bi-check text-success';
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
   * Format complex objects as nested DataView
   * @param {object} value - Object value to display as DataView
   * @param {object} field - Field definition
   * @returns {string} Formatted DataView HTML
   */
  formatAsDataView(value, field) {
    if (!value || typeof value !== 'object') {
      return `<span class="text-muted fst-italic">No data available</span>`;
    }

    try {
      // Create nested DataView instance
      const nestedView = new (this.constructor)({
        data: value,
        columns: field.dataViewColumns || 2,
        showEmptyValues: field.showEmptyValues ?? true,
        emptyValueText: field.emptyValueText || 'Not set',
        // Pass any other dataView-specific options from field config
        ...(field.dataViewOptions || {})
      });

        nestedView.onInit();
        nestedView.generateFieldsFromData();
      // Generate the nested DataView HTML
      const nestedHtml = nestedView.buildItemsHTML();

      // Wrap in a styled container with optional label
      // const labelHtml = field.label ?
      //   `<h6 class="fw-semibold text-muted mb-3 border-bottom pb-2">${this.escapeHtml(field.label)}</h6>` :
      //   '';

      return `
        <div class="nested-dataview border rounded p-3 bg-light">
          <div class="${nestedView.dataViewOptions.rowClass}">
            ${nestedHtml}
          </div>
        </div>
      `;
    } catch (error) {
      console.error('Error creating nested DataView:', error);
      return `<span class="text-danger">Error displaying nested data</span>`;
    }
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

    // Clear fields to trigger regeneration on next render
    if (this.fields.length > 0 && !this.options.fields) {
      this.fields = [];
    }

    await this.render();
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
    await this.render();
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
    await this.render();
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
   * Set custom format for a specific field
   * @param {string} fieldName - Name of the field
   * @param {string} format - Pipe format string (e.g., "currency|uppercase")
   * @returns {DataView} This instance for chaining
   */
  setFieldFormat(fieldName, format) {
    const field = this.getField(fieldName);
    if (field) {
      field.format = format;
    } else {
      // Create new field if it doesn't exist
      this.fields.push({
        name: fieldName,
        label: this.formatLabel(fieldName),
        type: this.inferFieldType(this.getData()[fieldName], fieldName),
        format: format
      });
    }
    return this;
  }

  /**
   * Add additional formatter to existing field format pipe chain
   * @param {string} fieldName - Name of the field
   * @param {string} formatter - Formatter to add (e.g., "uppercase", "truncate(50)")
   * @returns {DataView} This instance for chaining
   */
  addFormatPipe(fieldName, formatter) {
    const field = this.getField(fieldName);
    if (field) {
      if (field.format) {
        field.format += `|${formatter}`;
      } else {
        field.format = formatter;
      }
    }
    return this;
  }

  /**
   * Clear custom format for a field (revert to auto-inferred format)
   * @param {string} fieldName - Name of the field
   * @returns {DataView} This instance for chaining
   */
  clearFieldFormat(fieldName) {
    const field = this.getField(fieldName);
    if (field) {
      const data = this.getData();
      field.format = this.inferFormatter(data[fieldName], fieldName, field.type);
    }
    return this;
  }

  /**
   * Get formatted value for a specific field without rendering
   * @param {string} fieldName - Name of the field
   * @param {*} value - Optional value to format (uses current data if not provided)
   * @returns {*} Formatted value
   */
  getFormattedValue(fieldName, value = null) {
    const field = this.getField(fieldName);
    if (!field) return null;

    const targetValue = value !== null ? value : this.getData()[fieldName];

    if (field.format && targetValue != null) {
      return dataFormatter.pipe(targetValue, field.format);
    }

    return targetValue;
  }

  /**
   * Set multiple field formats at once
   * @param {object} formats - Object mapping field names to format strings
   * @returns {DataView} This instance for chaining
   */
  setFieldFormats(formats) {
    Object.entries(formats).forEach(([fieldName, format]) => {
      this.setFieldFormat(fieldName, format);
    });
    return this;
  }

  /**
   * Get all current field formats as an object
   * @returns {object} Object mapping field names to their current formats
   */
  getFieldFormats() {
    const formats = {};
    this.fields.forEach(field => {
      if (field.format) {
        formats[field.name] = field.format;
      }
    });
    return formats;
  }

  /**
   * Set up model event listeners if model is provided
   */
  onInit() {
    super.onInit();

    // Listen for model changes
    if (this.model && typeof this.model.on === 'function') {
      this.model.on('change', () => {
        this.render();
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

export default DataView;
