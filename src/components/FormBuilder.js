/**
 * FormBuilder - Dynamic form generation component for MOJO framework
 * Creates forms based on field definitions with validation and data binding
 */

class FormBuilder {
  constructor(options = {}) {
    // Core properties from design doc
    this.fields = options.fields || [];
    
    // Internal state
    this.container = null;
    this.data = {};
    this.errors = {};
    this.validators = {};
    this.loading = false;
    this.rendered = false;
    
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
    this.validatorTypes = {
      required: this.validateRequired.bind(this),
      email: this.validateEmail.bind(this),
      url: this.validateUrl.bind(this),
      pattern: this.validatePattern.bind(this),
      minLength: this.validateMinLength.bind(this),
      maxLength: this.validateMaxLength.bind(this),
      min: this.validateMin.bind(this),
      max: this.validateMax.bind(this),
      custom: this.validateCustom.bind(this)
    };
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
    return this.fields.map(field => this.buildFieldHTML(field)).join('');
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
      return this.renderTextField(field);
    }
    
    return renderer(field);
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
    return this.renderInputField(field, 'password');
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
      help = ''
    } = field;
    
    const inputClass = `${this.options.inputClass} ${fieldClass}`.trim();
    const value = this.data[name] || '';
    const error = this.errors[name];
    
    const attrs = Object.entries(attributes).map(([key, val]) => `${key}="${val}"`).join(' ');
    
    return `
      <div class="${this.options.fieldWrapper}">
        ${label ? `<label for="${name}" class="${this.options.labelClass}">
          ${label}
          ${required ? '<span class="text-danger">*</span>' : ''}
        </label>` : ''}
        <input
          type="${type}"
          id="${name}"
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
      class: fieldClass = '',
      attributes = {},
      help = ''
    } = field;
    
    const inputClass = `${this.options.inputClass} ${fieldClass}`.trim();
    const value = this.data[name] || '';
    const error = this.errors[name];
    
    const attrs = Object.entries(attributes).map(([key, val]) => `${key}="${val}"`).join(' ');
    
    return `
      <div class="${this.options.fieldWrapper}">
        ${label ? `<label for="${name}" class="${this.options.labelClass}">
          ${label}
          ${required ? '<span class="text-danger">*</span>' : ''}
        </label>` : ''}
        <textarea
          id="${name}"
          name="${name}"
          class="${inputClass} ${error ? 'is-invalid' : ''}"
          rows="${rows}"
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
      required = false,
      disabled = false,
      multiple = false,
      class: fieldClass = '',
      attributes = {},
      help = '',
      placeholder = ''
    } = field;
    
    const inputClass = `${this.options.inputClass} ${fieldClass}`.trim();
    const value = this.data[name];
    const error = this.errors[name];
    
    const attrs = Object.entries(attributes).map(([key, val]) => `${key}="${val}"`).join(' ');
    
    const optionsHTML = options.map(option => {
      const optionValue = typeof option === 'object' ? option.value : option;
      const optionLabel = typeof option === 'object' ? option.label : option;
      const selected = multiple 
        ? (Array.isArray(value) && value.includes(optionValue))
        : (value == optionValue);
      
      return `<option value="${this.escapeHtml(optionValue)}" ${selected ? 'selected' : ''}>
        ${this.escapeHtml(optionLabel)}
      </option>`;
    }).join('');
    
    return `
      <div class="${this.options.fieldWrapper}">
        ${label ? `<label for="${name}" class="${this.options.labelClass}">
          ${label}
          ${required ? '<span class="text-danger">*</span>' : ''}
        </label>` : ''}
        <select
          id="${name}"
          name="${name}"
          class="${inputClass} ${error ? 'is-invalid' : ''}"
          ${multiple ? 'multiple' : ''}
          ${required ? 'required' : ''}
          ${disabled ? 'disabled' : ''}
          ${attrs}
        >
          ${placeholder ? `<option value="">${this.escapeHtml(placeholder)}</option>` : ''}
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
      help = ''
    } = field;
    
    const value = this.data[name];
    const error = this.errors[name];
    const checked = value === true || value === 'true' || value === '1';
    
    const attrs = Object.entries(attributes).map(([key, val]) => `${key}="${val}"`).join(' ');
    
    return `
      <div class="${this.options.fieldWrapper}">
        <div class="form-check">
          <input
            type="checkbox"
            id="${name}"
            name="${name}"
            class="form-check-input ${fieldClass} ${error ? 'is-invalid' : ''}"
            value="1"
            ${checked ? 'checked' : ''}
            ${required ? 'required' : ''}
            ${disabled ? 'disabled' : ''}
            ${attrs}
          >
          ${label ? `<label for="${name}" class="form-check-label">
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
      help = ''
    } = field;
    
    const value = this.data[name];
    const error = this.errors[name];
    
    const attrs = Object.entries(attributes).map(([key, val]) => `${key}="${val}"`).join(' ');
    
    const radiosHTML = options.map((option, index) => {
      const optionValue = typeof option === 'object' ? option.value : option;
      const optionLabel = typeof option === 'object' ? option.label : option;
      const checked = value == optionValue;
      const radioId = `${name}_${index}`;
      
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
      help = ''
    } = field;
    
    const inputClass = `${this.options.inputClass} ${fieldClass}`.trim();
    const error = this.errors[name];
    
    const attrs = Object.entries(attributes).map(([key, val]) => `${key}="${val}"`).join(' ');
    
    return `
      <div class="${this.options.fieldWrapper}">
        ${label ? `<label for="${name}" class="${this.options.labelClass}">
          ${label}
          ${required ? '<span class="text-danger">*</span>' : ''}
        </label>` : ''}
        <input
          type="file"
          id="${name}"
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
      help = ''
    } = field;
    
    const inputClass = `form-range ${fieldClass}`.trim();
    const value = this.data[name] || min;
    const error = this.errors[name];
    
    const attrs = Object.entries(attributes).map(([key, val]) => `${key}="${val}"`).join(' ');
    
    return `
      <div class="${this.options.fieldWrapper}">
        ${label ? `<label for="${name}" class="${this.options.labelClass}">
          ${label}: <span id="${name}_value">${value}</span>
        </label>` : ''}
        <input
          type="range"
          id="${name}"
          name="${name}"
          class="${inputClass} ${error ? 'is-invalid' : ''}"
          min="${min}"
          max="${max}"
          step="${step}"
          value="${value}"
          ${disabled ? 'disabled' : ''}
          ${attrs}
          oninput="document.getElementById('${name}_value').textContent = this.value"
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
    const value = this.data[name] || '';
    
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
    
    // Emit submit event
    this.emit('submit', {
      data: this.data,
      form: this,
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
}

// Export for use in MOJO framework
export { FormBuilder };