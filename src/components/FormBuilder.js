/**
 * FormBuilder - Dynamic form generation component for MOJO framework
 * Creates forms based on field definitions with validation and data binding
 */

class FormBuilder {
  constructor(options = {}) {
    // Core properties from design doc
    this.fields = options.fields || [];
    
    // Model integration
    this.model = options.model || null;
    
    // Internal state
    this.container = null;
    this.data = {};
    this.errors = {};
    this.validators = {};
    this.loading = false;
    this.rendered = false;
    
    // If a model is provided, populate initial data from it
    if (this.model) {
      this.populateFromModel();
    }
    
    // Configuration
    this.options = {
      formClass: 'mojo-form',
      fieldWrapper: 'form-group mb-3',
      labelClass: 'form-label',
      inputClass: 'form-control',
      errorClass: 'invalid-feedback',
      submitButton: true,
      resetButton: false,
      autoValidate: true,
      validateOnSubmit: true,
      validateOnBlur: true,
      idPrefix: options.id || '',
      useRowLayout: true,  // Enable Bootstrap row/column layout
      rowClass: 'row g-2', // Bootstrap row with gutter
      defaultColSize: 12,  // Default column size (1-12)
      ...options
    };
    
    // Event listeners
    this.listeners = {};
    
    // Built-in field types
    this.fieldTypes = {
      text: this.renderTextField.bind(this),
      email: this.renderEmailField.bind(this),
      password: this.renderPasswordField.bind(this),
      number: this.renderNumberField.bind(this),
      tel: this.renderTelField.bind(this),
      url: this.renderUrlField.bind(this),
      search: this.renderSearchField.bind(this),
      textarea: this.renderTextareaField.bind(this),
      select: this.renderSelectField.bind(this),
      checkbox: this.renderCheckboxField.bind(this),
      radio: this.renderRadioField.bind(this),
      date: this.renderDateField.bind(this),
      datetime: this.renderDateTimeField.bind(this),
      'datetime-local': this.renderDateTimeField.bind(this),
      switch: this.renderSwitchField.bind(this),
      time: this.renderTimeField.bind(this),
      file: this.renderFileField.bind(this),
      image: this.renderImageField.bind(this),
      color: this.renderColorField.bind(this),
      range: this.renderRangeField.bind(this),
      hidden: this.renderHiddenField.bind(this),
      submit: this.renderSubmitButton.bind(this),
      button: this.renderButton.bind(this),
      divider: this.renderDivider.bind(this),
      html: this.renderHtmlField.bind(this),
      group: this.renderFieldGroup.bind(this)
    };
    
    // Built-in validators
    // TODO: Implement these validator methods
    this.validatorTypes = {
      // required: this.validateRequired.bind(this),
      // email: this.validateEmail.bind(this),
      // url: this.validateUrl.bind(this),
      // pattern: this.validatePattern.bind(this),
      // minLength: this.validateMinLength.bind(this),
      // maxLength: this.validateMaxLength.bind(this),
      // min: this.validateMin.bind(this),
      // max: this.validateMax.bind(this),
      // custom: this.validateCustom.bind(this)
    };
  }

  /**
   * Generate unique field ID
   * @param {string} fieldName - Field name
   * @returns {string} Unique field ID
   */
  getFieldId(fieldName) {
    return this.options.idPrefix ? `${this.options.idPrefix}-${fieldName}` : fieldName;
  }
  
  /**
   * Populate form data from Model instance
   */
  populateFromModel() {
    if (!this.model) return;
    
    // Get all model attributes
    const modelData = this.model.toJSON ? this.model.toJSON() : this.model.attributes || this.model;
    
    // Populate data object with model values
    for (const field of this.fields) {
      if (field.name && modelData.hasOwnProperty(field.name)) {
        this.data[field.name] = modelData[field.name];
      } else if (field.name && this.model.get) {
        // Try using model's get method with dot notation support
        const value = this.model.get(field.name);
        if (value !== undefined) {
          this.data[field.name] = value;
        }
      }
    }
    
    // Listen to model changes if model supports events
    if (this.model && this.model.on) {
      this.model.on('change', () => {
        this.populateFromModel();
        if (this.rendered) {
          this.populateForm(this.data);
        }
      });
    }
  }
  
  /**
   * Sync form data back to Model instance
   * @param {object} data - Form data to sync
   */
  syncToModel(data) {
    if (!this.model) return;
    
    // Update model with form data
    if (this.model.set) {
      // Use model's set method if available
      this.model.set(data);
    } else if (this.model.attributes) {
      // Direct assignment to attributes
      Object.assign(this.model.attributes, data);
    } else {
      // Direct assignment to model
      Object.assign(this.model, data);
    }
  }

  /**
   * Render the form
   * @param {HTMLElement} container - Container element
   * @param {object} data - Initial form data
   * @returns {Promise} Promise that resolves when form is rendered
   */
  async render(container, data = {}) {
    this.container = container;
    this.data = { ...this.data, ...data };
    
    if (!this.container) {
      throw new Error('No container specified for form rendering');
    }

    try {
      // Build form HTML
      const formHTML = this.buildFormHTML();
      
      // Insert into container
      this.container.innerHTML = formHTML;
      
      // Bind events
      this.bindEvents();
      
      // Populate form with data
      this.populateForm(this.data);
      
      this.rendered = true;
      
      // Call post-render hook
      this.onRendered();
      
      return this;
      
    } catch (error) {
      console.error('Error rendering form:', error);
      throw error;
    }
  }

  /**
   * Build complete form HTML
   * @returns {string} Form HTML
   */
  buildFormHTML() {
    const formClass = this.options.formClass;
    const fieldsHTML = this.buildFieldsHTML();
    const buttonsHTML = this.buildButtonsHTML();
    
    return `
      <form class="${formClass}" novalidate>
        ${fieldsHTML}
        ${buttonsHTML}
      </form>
    `;
  }

  /**
   * Build all fields HTML
   * @returns {string} Fields HTML
   */
  buildFieldsHTML() {
    if (!this.options.useRowLayout) {
      // Simple layout without rows
      return this.fields.map(field => this.buildFieldHTML(field)).join('');
    }
    
    // Group fields into rows based on their layout configuration
    const rows = [];
    let currentRow = [];
    let currentRowSize = 0;
    
    this.fields.forEach(field => {
      if (!this.shouldRenderField(field)) {
        return;
      }
      
      // Check if field forces a new row
      if (field.newRow || field.row === 'new') {
        if (currentRow.length > 0) {
          rows.push(currentRow);
          currentRow = [];
          currentRowSize = 0;
        }
      }
      
      // Get column size (support various property names for flexibility)
      const colSize = field.col || field.colSize || field.columns || 
                     field.cols || field.width || this.options.defaultColSize || 12;
      
      // Check if adding this field would exceed 12 columns
      if (currentRowSize + colSize > 12 && currentRow.length > 0) {
        rows.push(currentRow);
        currentRow = [];
        currentRowSize = 0;
      }
      
      currentRow.push({ ...field, colSize });
      currentRowSize += colSize;
    });
    
    // Add any remaining fields
    if (currentRow.length > 0) {
      rows.push(currentRow);
    }
    
    // Build HTML for each row
    return rows.map(row => {
      const rowFields = row.map(field => this.buildFieldHTML(field)).join('');
      return `<div class="${this.options.rowClass}">${rowFields}</div>`;
    }).join('');
  }

  /**
   * Build individual field HTML
   * @param {object} field - Field configuration
   * @returns {string} Field HTML
   */
  buildFieldHTML(field) {
    // Skip hidden condition fields
    if (!this.shouldRenderField(field)) {
      return '';
    }
    
    const fieldType = field.type || 'text';
    const renderer = this.fieldTypes[fieldType];
    
    if (!renderer) {
      console.warn(`Unknown field type: ${fieldType}`);
      return this.wrapFieldInColumn(this.renderTextField(field), field);
    }
    
    // Render the field and wrap in column if using row layout
    const fieldHTML = renderer(field);
    return this.wrapFieldInColumn(fieldHTML, field);
  }
  
  /**
   * Wrap field HTML in Bootstrap column
   * @param {string} fieldHTML - The field HTML
   * @param {object} field - Field configuration
   * @returns {string} Wrapped field HTML
   */
  wrapFieldInColumn(fieldHTML, field) {
    if (!this.options.useRowLayout) {
      return fieldHTML;
    }
    
    // Skip column wrapper for hidden fields
    if (field.type === 'hidden') {
      return fieldHTML;
    }
    
    // Get column configuration
    const colSize = field.col || field.colSize || field.columns || 
                   field.cols || field.width || this.options.defaultColSize || 12;
    
    // Support responsive column sizes
    let colClass = '';
    if (typeof colSize === 'object') {
      // Object format: { xs: 12, sm: 6, md: 4, lg: 3 }
      colClass = Object.entries(colSize)
        .map(([breakpoint, size]) => {
          return breakpoint === 'xs' ? `col-${size}` : `col-${breakpoint}-${size}`;
        })
        .join(' ');
    } else if (typeof colSize === 'string') {
      // String format: "col-md-6" or "col-12 col-md-6"
      colClass = colSize.startsWith('col') ? colSize : `col-${colSize}`;
    } else {
      // Number format: 6 -> "col-6"
      colClass = `col-${colSize}`;
    }
    
    // Add any additional column classes
    if (field.colClass) {
      colClass += ` ${field.colClass}`;
    }
    
    return `<div class="${colClass}">${fieldHTML}</div>`;
  }

  /**
   * Check if field should be rendered based on conditions
   * @param {object} field - Field configuration
   * @returns {boolean} True if field should be rendered
   */
  shouldRenderField(field) {
    if (!field.condition) {
      return true;
    }
    
    const condition = field.condition;
    
    if (typeof condition === 'function') {
      return condition(this.data, field);
    }
    
    if (typeof condition === 'object') {
      const { field: conditionField, value: conditionValue, operator = 'equals' } = condition;
      const fieldValue = this.data[conditionField];
      
      switch (operator) {
        case 'equals':
          return fieldValue == conditionValue;
        case 'not_equals':
          return fieldValue != conditionValue;
        case 'in':
          return Array.isArray(conditionValue) && conditionValue.includes(fieldValue);
        case 'not_in':
          return Array.isArray(conditionValue) && !conditionValue.includes(fieldValue);
        default:
          return true;
      }
    }
    
    return true;
  }

  /**
   * Render text input field
   * @param {object} field - Field configuration
   * @returns {string} Field HTML
   */
  renderTextField(field) {
    return this.renderInputField(field, 'text');
  }

  /**
   * Render email input field
   * @param {object} field - Field configuration
   * @returns {string} Field HTML
   */
  renderEmailField(field) {
    return this.renderInputField(field, 'email');
  }

  /**
   * Render password input field
   * @param {object} field - Field configuration
   * @returns {string} Field HTML
   */
  renderPasswordField(field) {
    const passwordField = { ...field };
    // Add autocomplete for password fields
    if (!passwordField.attributes) passwordField.attributes = {};
    passwordField.attributes.autocomplete = field.autocomplete || 'current-password';
    return this.renderInputField(passwordField, 'password');
  }

  /**
   * Render number input field
   * @param {object} field - Field configuration
   * @returns {string} Field HTML
   */
  renderNumberField(field) {
    return this.renderInputField(field, 'number');
  }

  /**
   * Render telephone input field
   * @param {object} field - Field configuration
   * @returns {string} Field HTML
   */
  renderTelField(field) {
    return this.renderInputField(field, 'tel');
  }

  /**
   * Render URL input field
   * @param {object} field - Field configuration
   * @returns {string} Field HTML
   */
  renderUrlField(field) {
    return this.renderInputField(field, 'url');
  }

  /**
   * Render search input field
   * @param {object} field - Field configuration
   * @returns {string} Field HTML
   */
  renderSearchField(field) {
    return this.renderInputField(field, 'search');
  }

  /**
   * Render generic input field
   * @param {object} field - Field configuration
   * @param {string} type - Input type
   * @returns {string} Field HTML
   */
  renderInputField(field, type = 'text') {
    const {
      name,
      label,
      placeholder,
      required = false,
      disabled = false,
      readonly = false,
      class: fieldClass = '',
      attributes = {},
      help = field.helpText || field.help || ''
    } = field;
    
    const inputClass = `${this.options.inputClass} ${fieldClass}`.trim();
    // Check model data first, then form data, then field default
    const value = this.getFieldValue(name, field.value || '');
    const error = this.errors[name];
    
    const attrs = Object.entries(attributes).map(([key, val]) => `${key}="${val}"`).join(' ');
    const fieldId = this.getFieldId(name);
    
    return `
      <div class="${this.options.fieldWrapper}">
        ${label ? `<label for="${fieldId}" class="${this.options.labelClass}">
          ${label}
          ${required ? '<span class="text-danger">*</span>' : ''}
        </label>` : ''}
        <input
          type="${type}"
          id="${fieldId}"
          name="${name}"
          class="${inputClass} ${error ? 'is-invalid' : ''}"
          value="${this.escapeHtml(value)}"
          ${placeholder ? `placeholder="${this.escapeHtml(placeholder)}"` : ''}
          ${required ? 'required' : ''}
          ${disabled ? 'disabled' : ''}
          ${readonly ? 'readonly' : ''}
          ${attrs}
        >
        ${help ? `<div class="form-text">${help}</div>` : ''}
        ${error ? `<div class="${this.options.errorClass}">${error}</div>` : ''}
      </div>
    `;
  }

  /**
   * Render textarea field
   * @param {object} field - Field configuration
   * @returns {string} Field HTML
   */
  renderTextareaField(field) {
    const {
      name,
      label,
      placeholder,
      required = false,
      disabled = false,
      readonly = false,
      rows = 3,
      cols,
      maxLength,
      minLength,
      class: fieldClass = '',
      attributes = {},
      help = field.helpText || field.help || ''
    } = field;
    
    const textareaClass = `${this.options.inputClass} ${fieldClass}`.trim();
    const value = this.getFieldValue(name, field.value || '');
    const error = this.errors[name];
    
    const attrs = Object.entries(attributes).map(([key, val]) => `${key}="${val}"`).join(' ');
    const fieldId = this.getFieldId(name);
    
    return `
      <div class="${this.options.fieldWrapper}">
        ${label ? `<label for="${fieldId}" class="${this.options.labelClass}">
          ${label}
          ${required ? '<span class="text-danger">*</span>' : ''}
        </label>` : ''}
        <textarea
          id="${fieldId}"
          name="${name}"
          class="${textareaClass} ${error ? 'is-invalid' : ''}"
          rows="${rows}"
          ${cols ? `cols="${cols}"` : ''}
          ${maxLength ? `maxlength="${maxLength}"` : ''}
          ${minLength ? `minlength="${minLength}"` : ''}
          ${placeholder ? `placeholder="${this.escapeHtml(placeholder)}"` : ''}
          ${required ? 'required' : ''}
          ${disabled ? 'disabled' : ''}
          ${readonly ? 'readonly' : ''}
          ${attrs}
        >${this.escapeHtml(value)}</textarea>
        ${help ? `<div class="form-text">${help}</div>` : ''}
        ${error ? `<div class="${this.options.errorClass}">${error}</div>` : ''}
      </div>
    `;
  }

  /**
   * Render select field
   * @param {object} field - Field configuration
   * @returns {string} Field HTML
   */
  renderSelectField(field) {
    const {
      name,
      label,
      options = [],
      placeholder,
      required = false,
      disabled = false,
      multiple = false,
      size,
      class: fieldClass = '',
      attributes = {},
      help = field.helpText || field.help || ''
    } = field;
    
    const selectClass = `${this.options.inputClass} ${fieldClass}`.trim();
    const selectedValue = this.getFieldValue(name, field.value || '');
    const error = this.errors[name];
    
    const attrs = Object.entries(attributes).map(([key, val]) => `${key}="${val}"`).join(' ');
    const fieldId = this.getFieldId(name);
    
    const optionsHTML = options.map(option => {
      const optionValue = typeof option === 'object' ? option.value : option;
      const optionLabel = typeof option === 'object' ? (option.label || option.text) : option;
      const selected = multiple
        ? (Array.isArray(selectedValue) && selectedValue.includes(optionValue))
        : (selectedValue == optionValue);
      
      return `<option value="${this.escapeHtml(optionValue)}" ${selected ? 'selected' : ''}>
        ${this.escapeHtml(optionLabel)}
      </option>`;
    }).join('');
    
    return `
      <div class="${this.options.fieldWrapper}">
        ${label ? `<label for="${fieldId}" class="${this.options.labelClass}">
          ${label}
          ${required ? '<span class="text-danger">*</span>' : ''}
        </label>` : ''}
        <select
          id="${fieldId}"
          name="${name}"
          class="${selectClass} ${error ? 'is-invalid' : ''}"
          ${required ? 'required' : ''}
          ${disabled ? 'disabled' : ''}
          ${multiple ? 'multiple' : ''}
          ${size ? `size="${size}"` : ''}
          ${attrs}
        >
          ${optionsHTML}
        </select>
        ${help ? `<div class="form-text">${help}</div>` : ''}
        ${error ? `<div class="${this.options.errorClass}">${error}</div>` : ''}
      </div>
    `;
  }

  /**
   * Render checkbox field
   * @param {object} field - Field configuration
   * @returns {string} Field HTML
   */
  renderCheckboxField(field) {
    const {
      name,
      label,
      required = false,
      disabled = false,
      class: fieldClass = '',
      attributes = {},
      help = field.helpText || field.help || ''
    } = field;
    
    const value = this.getFieldValue(name, field.value);
    const error = this.errors[name];
    const checked = value === true || value === 'true' || value === '1';
    
    const attrs = Object.entries(attributes).map(([key, val]) => `${key}="${val}"`).join(' ');
    const fieldId = this.getFieldId(name);
    
    return `
      <div class="${this.options.fieldWrapper}">
        <div class="form-check">
          <input
            type="checkbox"
            id="${fieldId}"
            name="${name}"
            class="form-check-input ${fieldClass} ${error ? 'is-invalid' : ''}"
            value="1"
            ${checked ? 'checked' : ''}
            ${required ? 'required' : ''}
            ${disabled ? 'disabled' : ''}
            ${attrs}
          >
          ${label ? `<label for="${fieldId}" class="form-check-label">
            ${label}
            ${required ? '<span class="text-danger">*</span>' : ''}
          </label>` : ''}
        </div>
        ${help ? `<div class="form-text">${help}</div>` : ''}
        ${error ? `<div class="${this.options.errorClass}">${error}</div>` : ''}
      </div>
    `;
  }

  /**
   * Render switch field (Bootstrap custom switch)
   * @param {object} field - Field configuration
   * @returns {string} Field HTML
   */
  renderSwitchField(field) {
    const {
      name,
      label,
      disabled = false,
      class: fieldClass = '',
      attributes = {},
      help = field.helpText || field.help || ''
    } = field;
    
    const value = this.getFieldValue(name, field.value);
    const error = this.errors[name];
    const checked = value === true || value === 'true' || value === '1';
    
    const attrs = Object.entries(attributes).map(([key, val]) => `${key}="${val}"`).join(' ');
    const fieldId = this.getFieldId(name);
    
    return `
      <div class="${this.options.fieldWrapper}">
        <div class="form-check form-switch">
          <input
            type="checkbox"
            id="${fieldId}"
            name="${name}"
            class="form-check-input ${fieldClass} ${error ? 'is-invalid' : ''}"
            role="switch"
            value="1"
            ${checked ? 'checked' : ''}
            ${disabled ? 'disabled' : ''}
            ${attrs}
          >
          ${label ? `<label for="${fieldId}" class="form-check-label">
            ${label}
          </label>` : ''}
        </div>
        ${help ? `<div class="form-text">${help}</div>` : ''}
        ${error ? `<div class="${this.options.errorClass}">${error}</div>` : ''}
      </div>
    `;
  }

  /**
   * Render radio field group
   * @param {object} field - Field configuration
   * @returns {string} Field HTML
   */
  renderRadioField(field) {
    const {
      name,
      label,
      options = [],
      required = false,
      disabled = false,
      class: fieldClass = '',
      attributes = {},
      help = field.helpText || field.help || ''
    } = field;
    
    const value = this.getFieldValue(name, field.value || '');
    const error = this.errors[name];
    
    const attrs = Object.entries(attributes).map(([key, val]) => `${key}="${val}"`).join(' ');
    
    const radiosHTML = options.map((option, index) => {
      const optionValue = typeof option === 'object' ? option.value : option;
      const optionLabel = typeof option === 'object' ? (option.label || option.text) : option;
      const checked = value == optionValue;
      const radioId = this.getFieldId(`${name}_${index}`);
      
      return `
        <div class="form-check">
          <input
            type="radio"
            id="${radioId}"
            name="${name}"
            class="form-check-input ${fieldClass} ${error ? 'is-invalid' : ''}"
            value="${this.escapeHtml(optionValue)}"
            ${checked ? 'checked' : ''}
            ${required ? 'required' : ''}
            ${disabled ? 'disabled' : ''}
            ${attrs}
          >
          <label for="${radioId}" class="form-check-label">
            ${this.escapeHtml(optionLabel)}
          </label>
        </div>
      `;
    }).join('');
    
    return `
      <div class="${this.options.fieldWrapper}">
        ${label ? `<fieldset>
          <legend class="${this.options.labelClass}">
            ${label}
            ${required ? '<span class="text-danger">*</span>' : ''}
          </legend>
          ${radiosHTML}
        </fieldset>` : radiosHTML}
        ${help ? `<div class="form-text">${help}</div>` : ''}
        ${error ? `<div class="${this.options.errorClass}">${error}</div>` : ''}
      </div>
    `;
  }

  /**
   * Render date input field
   * @param {object} field - Field configuration
   * @returns {string} Field HTML
   */
  renderDateField(field) {
    return this.renderInputField(field, 'date');
  }

  /**
   * Render datetime-local input field
   * @param {object} field - Field configuration
   * @returns {string} Field HTML
   */
  renderDateTimeField(field) {
    return this.renderInputField(field, 'datetime-local');
  }

  /**
   * Render time input field
   * @param {object} field - Field configuration
   * @returns {string} Field HTML
   */
  renderTimeField(field) {
    return this.renderInputField(field, 'time');
  }

  /**
   * Render file input field
   * @param {object} field - Field configuration
   * @returns {string} Field HTML
   */
  renderFileField(field) {
    const {
      name,
      label,
      required = false,
      disabled = false,
      multiple = false,
      accept = '',
      class: fieldClass = '',
      attributes = {},
      help = field.helpText || field.help || ''
    } = field;
    
    const inputClass = `${this.options.inputClass} ${fieldClass}`.trim();
    const error = this.errors[name];
    
    const attrs = Object.entries(attributes).map(([key, val]) => `${key}="${val}"`).join(' ');
    const fieldId = this.getFieldId(name);
    
    return `
      <div class="${this.options.fieldWrapper}">
        ${label ? `<label for="${fieldId}" class="${this.options.labelClass}">
          ${label}
          ${required ? '<span class="text-danger">*</span>' : ''}
        </label>` : ''}
        <input
          type="file"
          id="${fieldId}"
          name="${name}"
          class="${inputClass} ${error ? 'is-invalid' : ''}"
          ${multiple ? 'multiple' : ''}
          ${accept ? `accept="${accept}"` : ''}
          ${required ? 'required' : ''}
          ${disabled ? 'disabled' : ''}
          ${attrs}
        >
        ${help ? `<div class="form-text">${help}</div>` : ''}
        ${error ? `<div class="${this.options.errorClass}">${error}</div>` : ''}
      </div>
    `;
  }

  /**
   * Render image upload field with preview
   * @param {object} field - Field configuration
   * @returns {string} Field HTML
   */
  renderImageField(field) {
    const fileField = this.renderFileField({
      ...field,
      accept: field.accept || 'image/*'
    });
    
    const previewId = `${field.name}_preview`;
    
    return `
      ${fileField}
      <div class="mt-2">
        <img id="${previewId}" src="" alt="Preview" class="img-thumbnail" style="max-width: 200px; max-height: 200px; display: none;">
      </div>
    `;
  }

  /**
   * Render color input field
   * @param {object} field - Field configuration
   * @returns {string} Field HTML
   */
  renderColorField(field) {
    return this.renderInputField(field, 'color');
  }

  /**
   * Render range input field
   * @param {object} field - Field configuration
   * @returns {string} Field HTML
   */
  renderRangeField(field) {
    const {
      name,
      label,
      min = 0,
      max = 100,
      step = 1,
      disabled = false,
      class: fieldClass = '',
      attributes = {},
      help = field.helpText || field.help || ''
    } = field;
    
    const inputClass = `form-range ${fieldClass}`.trim();
    const value = this.getFieldValue(name, field.value || min);
    const error = this.errors[name];
    
    const attrs = Object.entries(attributes).map(([key, val]) => `${key}="${val}"`).join(' ');
    const fieldId = this.getFieldId(name);
    
    return `
      <div class="${this.options.fieldWrapper}">
        ${label ? `<label for="${fieldId}" class="${this.options.labelClass}">
          ${label}: <span id="${fieldId}_value">${value}</span>
        </label>` : ''}
        <input
          type="range"
          id="${fieldId}"
          name="${name}"
          class="${inputClass} ${error ? 'is-invalid' : ''}"
          min="${min}"
          max="${max}"
          step="${step}"
          value="${value}"
          ${disabled ? 'disabled' : ''}
          ${attrs}
          oninput="document.getElementById('${fieldId}_value').textContent = this.value"
        >
        ${help ? `<div class="form-text">${help}</div>` : ''}
        ${error ? `<div class="${this.options.errorClass}">${error}</div>` : ''}
      </div>
    `;
  }

  /**
   * Render hidden input field
   * @param {object} field - Field configuration
   * @returns {string} Field HTML
   */
  renderHiddenField(field) {
    const { name } = field;
    const value = this.getFieldValue(name, field.value || '');
    
    return `<input type="hidden" name="${name}" value="${this.escapeHtml(value)}">`;
  }

  /**
   * Render submit button
   * @param {object} field - Field configuration
   * @returns {string} Button HTML
   */
  renderSubmitButton(field) {
    const {
      label = 'Submit',
      class: fieldClass = 'btn-primary',
      disabled = false,
      attributes = {}
    } = field;
    
    const attrs = Object.entries(attributes).map(([key, val]) => `${key}="${val}"`).join(' ');
    
    return `
      <button
        type="submit"
        class="btn ${fieldClass}"
        ${disabled ? 'disabled' : ''}
        ${attrs}
      >
        ${label}
      </button>
    `;
  }

  /**
   * Render generic button
   * @param {object} field - Field configuration
   * @returns {string} Button HTML
   */
  renderButton(field) {
    const {
      name,
      label = 'Button',
      action = '',
      class: fieldClass = 'btn-secondary',
      disabled = false,
      attributes = {}
    } = field;
    
    const attrs = Object.entries(attributes).map(([key, val]) => `${key}="${val}"`).join(' ');
    
    return `
      <button
        type="button"
        name="${name || ''}"
        class="btn ${fieldClass}"
        ${action ? `data-action="${action}"` : ''}
        ${disabled ? 'disabled' : ''}
        ${attrs}
      >
        ${label}
      </button>
    `;
  }

  /**
   * Render field divider
   * @param {object} field - Field configuration
   * @returns {string} Divider HTML
   */
  renderDivider(field) {
    const { label = '', class: fieldClass = '' } = field;
    
    return `
      <div class="form-divider ${fieldClass}">
        <hr>
        ${label ? `<div class="form-divider-label">${label}</div>` : ''}
      </div>
    `;
  }

  /**
   * Render raw HTML field
   * @param {object} field - Field configuration
   * @returns {string} HTML content
   */
  renderHtmlField(field) {
    const { html = '', class: fieldClass = '' } = field;
    
    return `
      <div class="form-html ${fieldClass}">
        ${html}
      </div>
    `;
  }

  /**
   * Render field group
   * @param {object} field - Field configuration
   * @returns {string} Group HTML
   */
  renderFieldGroup(field) {
    const { label = '', fields = [], class: fieldClass = '' } = field;
    
    const groupFieldsHTML = fields.map(groupField => this.buildFieldHTML(groupField)).join('');
    
    return `
      <fieldset class="form-group ${fieldClass}">
        ${label ? `<legend>${label}</legend>` : ''}
        ${groupFieldsHTML}
      </fieldset>
    `;
  }

  /**
   * Build form buttons HTML
   * @returns {string} Buttons HTML
   */
  buildButtonsHTML() {
    if (!this.options.submitButton && !this.options.resetButton) {
      return '';
    }
    
    let buttonsHTML = '';
    
    if (this.options.submitButton) {
      const submitLabel = typeof this.options.submitButton === 'string' 
        ? this.options.submitButton 
        : 'Submit';
      buttonsHTML += `<button type="submit" class="btn btn-primary me-2">${submitLabel}</button>`;
    }
    
    if (this.options.resetButton) {
      const resetLabel = typeof this.options.resetButton === 'string' 
        ? this.options.resetButton 
        : 'Reset';
      buttonsHTML += `<button type="reset" class="btn btn-secondary">${resetLabel}</button>`;
    }
    
    return `
      <div class="form-actions mt-3">
        ${buttonsHTML}
      </div>
    `;
  }

  /**
   * Bind form event listeners
   */
  bindEvents() {
    if (!this.container) return;
    
    const form = this.container.querySelector('form');
    if (!form) return;
    
    // Form submission
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit(e);
    });
    
    // Form reset
    form.addEventListener('reset', (e) => {
      this.handleReset(e);
    });
    
    // Field validation on blur
    if (this.options.validateOnBlur) {
      const inputs = form.querySelectorAll('input, select, textarea');
      inputs.forEach(input => {
        input.addEventListener('blur', (e) => {
          this.validateField(e.target.name);
        });
      });
    }
    
    // Auto-validation on input
    if (this.options.autoValidate) {
      const inputs = form.querySelectorAll('input, select, textarea');
      inputs.forEach(input => {
        input.addEventListener('input', (e) => {
          this.clearFieldError(e.target.name);
        });
      });
    }
    
    // File input preview
    const fileInputs = form.querySelectorAll('input[type="file"]');
    fileInputs.forEach(input => {
      input.addEventListener('change', (e) => {
        this.handleFileChange(e);
      });
    });
    
    // Custom button actions
    const actionButtons = form.querySelectorAll('button[data-action]');
    actionButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const action = e.target.getAttribute('data-action');
        this.handleAction(action, e);
      });
    });
  }

  /**
   * Handle form submission
   * @param {Event} event - Submit event
   */
  async handleSubmit(event) {
    event.preventDefault();
    
    // Collect form data
    this.collectFormData();
    
    // Validate if enabled
    if (this.options.validateOnSubmit) {
      const isValid = this.validate();
      if (!isValid) {
        this.focusFirstError();
        return;
      }
    }
    
    // Sync data to model if available
    if (this.model) {
      this.syncToModel(this.data);
    }
    
    // Emit submit event
    this.emit('submit', {
      data: this.data,
      form: this,
      model: this.model,
      event
    });
    
    // Call submit handler if provided
    if (typeof this.options.onSubmit === 'function') {
      try {
        this.loading = true;
        this.updateLoadingState();
        
        await this.options.onSubmit(this.data, this);
        
      } catch (error) {
        console.error('Form submission error:', error);
        this.showError(error.message);
      } finally {
        this.loading = false;
        this.updateLoadingState();
      }
    }
  }

  /**
   * Handle form reset
   * @param {Event} event - Reset event
   */
  handleReset(event) {
    this.data = {};
    this.errors = {};
    this.clearAllErrors();
    
    this.emit('reset', {
      form: this,
      event
    });
  }

  /**
   * Handle file input change with preview
   * @param {Event} event - Change event
   */
  handleFileChange(event) {
    const input = event.target;
    const file = input.files[0];
    
    if (file && input.accept && input.accept.includes('image/')) {
      const previewId = `${input.name}_preview`;
      const preview = document.getElementById(previewId);
      
      if (preview) {
        const reader = new FileReader();
        reader.onload = function(e) {
          preview.src = e.target.result;
          preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
      }
    }
  }

  /**
   * Mount the form builder to a container
   * @param {HTMLElement|string} container - Container element or selector
   * @returns {Promise}
   */
  async mount(container) {
    if (typeof container === 'string') {
      container = document.querySelector(container);
    }
    return this.render(container);
  }

  /**
   * Destroy the form builder
   */
  destroy() {
    if (this.container) {
      this.container.innerHTML = '';
      this.container = null;
    }
    this.data = {};
    this.errors = {};
    this.listeners = {};
    this.rendered = false;
  }

  /**
   * Get form element
   * @returns {HTMLFormElement}
   */
  getFormElement() {
    return this.container ? this.container.querySelector('form') : null;
  }

  /**
   * Trigger custom event
   * @param {string} event - Event name
   * @param {object} data - Event data
   */
  trigger(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  /**
   * Listen for custom events
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  /**
   * Get form values
   * @returns {object} Form data
   */
  getValues() {
    const form = this.getFormElement();
    if (!form) return {};
    
    const formData = new FormData(form);
    const values = {};
    
    for (let [key, value] of formData.entries()) {
      if (values[key]) {
        // Handle multiple values (like checkboxes or multi-select)
        if (!Array.isArray(values[key])) {
          values[key] = [values[key]];
        }
        values[key].push(value);
      } else {
        values[key] = value;
      }
    }
    
    // Handle checkboxes that are unchecked
    const checkboxes = form.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      if (!checkbox.checked && !values[checkbox.name]) {
        values[checkbox.name] = false;
      } else if (checkbox.checked && !Array.isArray(values[checkbox.name])) {
        values[checkbox.name] = true;
      }
    });
    
    return values;
  }

  /**
   * Set form values
   * @param {object} values - Values to set
   */
  setValues(values) {
    const form = this.getFormElement();
    if (!form) return;
    
    Object.keys(values).forEach(key => {
      const field = form.elements[key];
      if (field) {
        if (field.type === 'checkbox') {
          field.checked = !!values[key];
        } else if (field.type === 'radio') {
          const radios = form.querySelectorAll(`input[name="${key}"]`);
          radios.forEach(radio => {
            radio.checked = radio.value === values[key];
          });
        } else if (field.tagName === 'SELECT' && field.multiple) {
          const options = field.options;
          for (let option of options) {
            option.selected = values[key].includes(option.value);
          }
        } else {
          field.value = values[key];
        }
      }
    });
    
    this.data = { ...this.data, ...values };
  }

  /**
   * Reset form to initial state
   */
  reset() {
    const form = this.getFormElement();
    if (form) {
      form.reset();
      
      // If model is available, reset to model data
      if (this.model) {
        this.populateFromModel();
        this.populateForm(this.data);
      } else {
        this.data = {};
      }
      
      this.clearAllErrors();
    }
  }

  /**
   * Clear all validation errors
   */
  clearAllErrors() {
    const form = this.getFormElement();
    if (!form) return;
    
    // Remove was-validated class
    form.classList.remove('was-validated');
    
    // Clear all invalid feedback
    const invalidElements = form.querySelectorAll('.is-invalid');
    invalidElements.forEach(el => {
      el.classList.remove('is-invalid');
    });
    
    const validElements = form.querySelectorAll('.is-valid');
    validElements.forEach(el => {
      el.classList.remove('is-valid');
    });
  }

  /**
   * Emit custom event
   * @param {string} event - Event name
   * @param {object} data - Event data
   */
  emit(event, data) {
    this.trigger(event, data);
  }

  /**
   * Escape HTML to prevent XSS
   * @param {string} str - String to escape
   * @returns {string} Escaped string
   */
  escapeHtml(str) {
    if (str == null) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }
  
  /**
   * Get field value with model support
   * @param {string} name - Field name
   * @param {*} defaultValue - Default value if not found
   * @returns {*} Field value
   */
  getFieldValue(name, defaultValue = '') {
    // First check if data has the value
    if (this.data.hasOwnProperty(name)) {
      return this.data[name];
    }
    
    // Then check model if available
    if (this.model) {
      if (this.model.get) {
        const modelValue = this.model.get(name);
        if (modelValue !== undefined) {
          return modelValue;
        }
      } else if (this.model.attributes && this.model.attributes.hasOwnProperty(name)) {
        return this.model.attributes[name];
      } else if (this.model.hasOwnProperty(name)) {
        return this.model[name];
      }
    }
    
    // Return default value
    return defaultValue;
  }

  /**
   * Populate form with data
   * @param {object} data - Data to populate
   */
  populateForm(data) {
    if (!data || !this.container) return;
    
    const form = this.getFormElement();
    if (!form) return;
    
    // Use setValues if it exists, otherwise manually set
    if (this.setValues) {
      this.setValues(data);
    }
  }

  /**
   * Called after form is rendered
   */
  onRendered() {
    // Hook for subclasses or extensions
    this.emit('rendered', { form: this });
  }

  /**
   * Collect form data from DOM
   */
  collectFormData() {
    const form = this.getFormElement();
    if (!form) return;
    
    const formData = new FormData(form);
    this.data = {};
    
    for (let [key, value] of formData.entries()) {
      if (this.data[key]) {
        // Handle multiple values
        if (!Array.isArray(this.data[key])) {
          this.data[key] = [this.data[key]];
        }
        this.data[key].push(value);
      } else {
        this.data[key] = value;
      }
    }
    
    // Handle unchecked checkboxes
    const checkboxes = form.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      if (!checkbox.checked && !this.data[checkbox.name]) {
        this.data[checkbox.name] = false;
      }
    });
  }

  /**
   * Validate the entire form
   * @returns {boolean} True if valid
   */
  validate() {
    const form = this.getFormElement();
    if (!form) return false;
    
    // Use HTML5 validation
    const isValid = form.checkValidity();
    
    if (!isValid) {
      // Add Bootstrap validation classes
      form.classList.add('was-validated');
    }
    
    return isValid;
  }

  /**
   * Validate a single field
   * @param {string} fieldName - Field name to validate
   * @returns {boolean} True if valid
   */
  validateField(fieldName) {
    const form = this.getFormElement();
    if (!form) return false;
    
    const field = form.elements[fieldName];
    if (!field) return false;
    
    const isValid = field.checkValidity();
    
    if (isValid) {
      field.classList.remove('is-invalid');
      field.classList.add('is-valid');
    } else {
      field.classList.remove('is-valid');
      field.classList.add('is-invalid');
    }
    
    return isValid;
  }

  /**
   * Focus on first error field
   */
  focusFirstError() {
    const form = this.getFormElement();
    if (!form) return;
    
    const firstInvalid = form.querySelector(':invalid');
    if (firstInvalid) {
      firstInvalid.focus();
      firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  /**
   * Clear error for a specific field
   * @param {string} fieldName - Field name
   */
  clearFieldError(fieldName) {
    if (!fieldName) return;
    
    delete this.errors[fieldName];
    
    const form = this.getFormElement();
    if (!form) return;
    
    const field = form.elements[fieldName];
    if (field) {
      field.classList.remove('is-invalid');
      const errorDiv = field.parentElement.querySelector('.invalid-feedback');
      if (errorDiv) {
        errorDiv.textContent = '';
      }
    }
  }

  /**
   * Show error message
   * @param {string} message - Error message
   */
  showError(message) {
    console.error('Form error:', message);
    
    // Emit error event
    this.emit('error', { message, form: this });
    
    // If container exists, show alert
    if (this.container) {
      const alertDiv = document.createElement('div');
      alertDiv.className = 'alert alert-danger alert-dismissible fade show';
      alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      `;
      this.container.insertBefore(alertDiv, this.container.firstChild);
      
      // Auto-remove after 5 seconds
      setTimeout(() => {
        if (alertDiv.parentNode) {
          alertDiv.remove();
        }
      }, 5000);
    }
  }

  /**
   * Update loading state of the form
   */
  updateLoadingState() {
    const form = this.getFormElement();
    if (!form) return;
    
    const submitBtn = form.querySelector('button[type="submit"]');
    const fields = form.querySelectorAll('input, select, textarea, button');
    
    if (this.loading) {
      // Disable all fields
      fields.forEach(field => field.disabled = true);
      
      // Update submit button
      if (submitBtn) {
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Loading...';
      }
    } else {
      // Enable all fields
      fields.forEach(field => field.disabled = false);
      
      // Restore submit button
      if (submitBtn) {
        const submitLabel = typeof this.options.submitButton === 'string' 
          ? this.options.submitButton 
          : 'Submit';
        submitBtn.innerHTML = submitLabel;
      }
    }
  }

  /**
   * Handle custom button actions
   * @param {string} action - Action name
   * @param {Event} event - Click event
   */
  handleAction(action, event) {
    // Emit action event
    this.emit('action', { action, event, form: this });
    
    // Call custom handler if provided
    if (this.options.onAction && typeof this.options.onAction === 'function') {
      this.options.onAction(action, event, this);
    }
  }
}

// Export for use in MOJO framework
export { FormBuilder };