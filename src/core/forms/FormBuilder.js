/**
 * FormBuilder - Pure HTML form generator for MOJO framework
 * Generates form HTML from field definitions with Bootstrap 5 grid layout support
 * NO event handling, lifecycle, or mounting - pure HTML generation only
 */

import Mustache from '@core/utils/mustache.js';
import MOJOUtils from '@core/utils/MOJOUtils.js';

class FormBuilder {
    constructor(config = {}) {
      this.fields = config.fields || [];

      // Convert cols to columns for all fields
      this.fields.forEach(field => {
        if (field.cols && !field.columns) {
          field.columns = field.cols;
          delete field.cols;
        } else if (!field.columns) {
          field.columns = 12;
        }

        // Handle nested fields in groups
        if (field.type === 'group' && field.fields) {
          field.fields.forEach(groupField => {
            if (groupField.cols && !groupField.columns) {
              groupField.columns = groupField.cols;
              delete groupField.cols;
            }
          });
        }
      });

      this.options = {
        formClass: 'needs-validation',
        formMethod: 'POST',
        formAction: '',
        groupClass: 'row mb-3',
        fieldWrapper: '',
        labelClass: 'form-label',
        inputClass: 'form-control',
        errorClass: 'invalid-feedback',
        helpClass: 'form-text',
        submitButton: false,
        resetButton: false,
        ...config.options
      };
      this.buttons = config.buttons || [];
      this.data = config.data || {};
      this.errors = config.errors || {};
      this.initializeTemplates();
    }

  /**
   * Initialize field templates
   */
  initializeTemplates() {
    this.templates = {
      input: `
        <div class="mojo-form-control">
          {{#label}}
          <label for="{{fieldId}}" class="{{labelClass}}">
            {{label}}{{#required}}<span class="text-danger">*</span>{{/required}}
          </label>
          {{/label}}
          <input type="{{type}}" id="{{fieldId}}" name="{{name}}"
                 class="{{inputClass}}{{#error}} is-invalid{{/error}}"
                 value="{{fieldValue}}" {{#placeholder}}placeholder="{{placeholder}}"{{/placeholder}}
                 {{#required}}required{{/required}} {{#disabled}}disabled{{/disabled}}
                 {{#readonly}}readonly{{/readonly}} data-change-action="validate-field" {{{attrs}}}>
          {{#help}}<div class="{{helpClass}}">{{help}}</div>{{/help}}
          {{#error}}<div class="{{errorClass}}">{{error}}</div>{{/error}}
        </div>
      `,

      textarea: `
        <div class="mojo-form-control">
          {{#label}}
          <label for="{{fieldId}}" class="{{labelClass}}">
            {{label}}{{#required}}<span class="text-danger">*</span>{{/required}}
          </label>
          {{/label}}
          <textarea id="{{fieldId}}" name="{{name}}" class="{{inputClass}}{{#error}} is-invalid{{/error}}"
                    rows="{{rows}}" {{#placeholder}}placeholder="{{placeholder}}"{{/placeholder}}
                    {{#required}}required{{/required}} {{#disabled}}disabled{{/disabled}}
                    {{#readonly}}readonly{{/readonly}} data-change-action="validate-field" {{{attrs}}}>{{fieldValue}}</textarea>
          {{#help}}<div class="{{helpClass}}">{{help}}</div>{{/help}}
          {{#error}}<div class="{{errorClass}}">{{error}}</div>{{/error}}
        </div>
      `,

      select: `
        <div class="mojo-form-control">
          {{#label}}
          <label for="{{fieldId}}" class="{{labelClass}}">
            {{label}}{{#required}}<span class="text-danger">*</span>{{/required}}
          </label>
          {{/label}}
          {{#searchInput}}{{{searchInput}}}{{/searchInput}}
          <select id="{{fieldId}}" name="{{name}}" class="{{inputClass}}{{#error}} is-invalid{{/error}}"
                  {{#required}}required{{/required}} {{#disabled}}disabled{{/disabled}}
                  {{#multiple}}multiple{{/multiple}} data-change-action="validate-field" {{{attrs}}}>
            {{{optionsHTML}}}
          </select>
          {{#help}}<div class="{{helpClass}}">{{help}}</div>{{/help}}
          {{#error}}<div class="{{errorClass}}">{{error}}</div>{{/error}}
        </div>
      `,

      checkbox: `
        <div class="mojo-form-control">
          <div class="form-check {{fieldClass}}">
            <input type="checkbox" id="{{fieldId}}" name="{{name}}"
                   class="form-check-input{{#error}} is-invalid{{/error}}" value="{{value}}"
                   {{#checked}}checked{{/checked}} {{#required}}required{{/required}}
                     {{#disabled}}disabled{{/disabled}} data-change-action="validate-field" {{{attrs}}}>
              <label class="form-check-label" for="{{fieldId}}">{{label}}</label>
            </div>
            {{#help}}<div class="{{helpClass}}">{{help}}</div>{{/help}}
            {{#error}}<div class="{{errorClass}}">{{error}}</div>{{/error}}
          </div>
        </div>
      `,

      switch: `
        <div class="mojo-form-control">
          <div class="form-check form-switch {{sizeClass}} {{fieldClass}}">
            <input type="checkbox" id="{{fieldId}}" name="{{name}}" role="switch"
                   class="form-check-input{{#error}} is-invalid{{/error}}" value="{{value}}"
                   {{#checked}}checked{{/checked}} {{#required}}required{{/required}}
                   {{#disabled}}disabled{{/disabled}} data-change-action="toggle-switch"
                   data-field="{{name}}" {{{attrs}}}>
            <label class="form-check-label" for="{{fieldId}}">{{label}}</label>
          </div>
          {{#help}}<div class="{{helpClass}}">{{help}}</div>{{/help}}
          {{#error}}<div class="{{errorClass}}">{{error}}</div>{{/error}}
        </div>
      `,

      image: `
        <div class="mojo-form-control">
          {{#label}}
          <label for="{{fieldId}}" class="{{labelClass}}">
            {{label}}{{#required}}<span class="text-danger">*</span>{{/required}}
          </label>
          {{/label}}
          <div class="image-field-container {{containerClass}}" id="{{dropZoneId}}" style="width: {{width}}px; height: {{height}}px;">
            <input type="file" id="{{fieldId}}" name="{{name}}" class="{{inputClass}} d-none{{#error}} is-invalid{{/error}}"
                   accept="{{accept}}" {{#required}}required{{/required}} {{#disabled}}disabled{{/disabled}}
                   data-change-action="image-selected" data-field="{{name}}" {{{attrs}}}>
            <div class="image-drop-zone{{#allowDrop}} droppable{{/allowDrop}}" data-action="click-image-upload"
                 data-field-id="{{fieldId}}" data-field="{{name}}" style="width: 100%; height: 100%; cursor: {{cursor}};">
              {{#imageUrl}}
              <img id="{{previewId}}" src="{{imageUrl}}" alt="Preview" class="img-thumbnail w-100 h-100" style="object-fit: cover;">
              {{#showRemove}}
              <button type="button" class="btn btn-sm btn-danger position-absolute top-0 end-0 m-1"
                      data-action="remove-image" data-field-id="{{fieldId}}" data-field="{{name}}" style="opacity: 0.8;">
                <i class="bi bi-x"></i>
              </button>
              {{/showRemove}}
              {{/imageUrl}}
              {{^imageUrl}}
              <div class="d-flex flex-column align-items-center justify-content-center h-100 text-muted border border-2 border-dashed">
                <i class="bi bi-image fs-1 mb-2"></i>
                <small class="text-center px-2">{{placeholderText}}</small>
              </div>
              {{/imageUrl}}
            </div>
          </div>
          {{#help}}<div class="{{helpClass}}">{{help}}</div>{{/help}}
          {{#error}}<div class="{{errorClass}}">{{error}}</div>{{/error}}
        </div>
      `,

      range: `
        <div class="mojo-form-control">
          {{#label}}
          <label for="{{fieldId}}" class="{{labelClass}}">
            {{label}}: <span id="{{fieldId}}_value">{{fieldValue}}</span>
          </label>
          {{/label}}
          <input type="range" id="{{fieldId}}" name="{{name}}" class="{{inputClass}}{{#error}} is-invalid{{/error}}"
                 min="{{min}}" max="{{max}}" step="{{step}}" value="{{fieldValue}}" {{#disabled}}disabled{{/disabled}}
                 data-change-action="range-changed" data-target="{{fieldId}}_value" {{{attrs}}}>
          {{#help}}<div class="{{helpClass}}">{{help}}</div>{{/help}}
          {{#error}}<div class="{{errorClass}}">{{error}}</div>{{/error}}
        </div>
      `,

      file: `
        <div class="mojo-form-control">
          {{#label}}
          <label for="{{fieldId}}" class="{{labelClass}}">
            {{label}}{{#required}}<span class="text-danger">*</span>{{/required}}
          </label>
          {{/label}}
          <input type="file" id="{{fieldId}}" name="{{name}}" class="{{inputClass}}{{#error}} is-invalid{{/error}}"
                 accept="{{accept}}" {{#required}}required{{/required}} {{#disabled}}disabled{{/disabled}}
                 {{#multiple}}multiple{{/multiple}} data-change-action="file-selected" {{{attrs}}}>
          {{#help}}<div class="{{helpClass}}">{{help}}</div>{{/help}}
          {{#error}}<div class="{{errorClass}}">{{error}}</div>{{/error}}
        </div>
      `,

      radio: `
        <div class="mojo-form-control">
          {{#label}}<div class="{{labelClass}}">{{label}}{{#required}}<span class="text-danger">*</span>{{/required}}</div>{{/label}}
          {{#options}}
          <div class="form-check">
            <input type="radio" id="{{fieldId}}_{{value}}" name="{{name}}" value="{{value}}"
                   class="form-check-input{{#error}} is-invalid{{/error}}" {{#checked}}checked{{/checked}}
                   {{#required}}required{{/required}} {{#disabled}}disabled{{/disabled}}
                   data-change-action="validate-field" {{{attrs}}}>
            <label class="form-check-label" for="{{fieldId}}_{{value}}">{{text}}</label>
          </div>
          {{/options}}
          {{#help}}<div class="{{helpClass}}">{{help}}</div>{{/help}}
          {{#error}}<div class="{{errorClass}}">{{error}}</div>{{/error}}
        </div>
      `,

      button: `
        <button type="button" {{#name}}name="{{name}}"{{/name}} class="btn {{fieldClass}}"
                {{#action}}data-action="{{action}}"{{/action}} {{#disabled}}disabled{{/disabled}} {{{attrs}}}>
          {{label}}
        </button>
      `,

      divider: `
        <hr class="{{dividerClass}}">
      `,

      html: `
        <div class="form-html {{fieldClass}}">{{{html}}}</div>
      `,

      header: `
        <h{{level}} {{#id}}id="{{id}}"{{/id}} class="text-primary mb-3 {{fieldClass}}">{{text}}</h{{level}}>
      `,

      hidden: `
        <input type="hidden" id="{{fieldId}}" name="{{name}}" value="{{fieldValue}}">
      `,

      checklistdropdown: `
        <div class="dropdown">
          <button class="{{buttonClass}}" type="button" data-bs-toggle="dropdown">
            <i class="{{buttonIcon}} me-1"></i> {{buttonText}}
          </button>
          <div class="{{dropdownClass}}" style="min-width: {{minWidth}};">
            {{#options}}
            <div class="form-check">
              <input class="form-check-input" type="checkbox"
                     value="{{value}}"
                     id="{{id}}"
                     {{#checked}}checked{{/checked}}
                     data-change-action="update-checklist"
                     data-field="{{fieldName}}">
              <label class="form-check-label" for="{{id}}">
                {{label}}
              </label>
            </div>
            {{/options}}
            <hr class="my-2">
            <button class="btn btn-sm btn-primary w-100" data-action="apply-filter">
              Apply
            </button>
          </div>
        </div>
      `,

      buttongroup: `
        <div class="btn-group btn-group-{{size}}" role="group">
          {{#options}}
          <button type="button" class="{{buttonClass}} {{#active}}active{{/active}}"
                  data-action="select-button-option"
                  data-field="{{fieldName}}"
                  data-value="{{value}}">
            {{label}}
          </button>
          {{/options}}
        </div>
      `,

      toolbarform: `
        <div class="mojo-toolbar-form">
          <div class="row g-2 align-items-center">
            {{#fields}}
            <div class="{{containerClass}}">
              {{#label}}<label class="form-label-sm mb-1">{{label}}</label>{{/label}}
              {{{fieldHtml}}}
            </div>
            {{/fields}}
          </div>
        </div>
      `
    };
  }

  /**
   * Generate complete form HTML
   * @returns {string} Complete form HTML
   */
  buildFormHTML() {
    const fieldsHTML = this.buildFieldsHTML();
    const buttonsHTML = this.buildButtonsHTML();

    return `
      <form class="${this.options.formClass}"
            method="${this.options.formMethod}"
            ${this.options.formAction ? `action="${this.options.formAction}"` : ''}
            novalidate>
        ${fieldsHTML}
        ${buttonsHTML}
      </form>
    `;
  }

  /**
   * Generate HTML for all fields
   * @returns {string} Fields HTML
   */
  /**
   * Check if field should use auto-sizing columns (class="col")
   * @param {object} field - Field configuration
   * @returns {boolean}
   */
  isAutoSizingField(field) {
    return !field.columns || field.columns === 'auto' || field.columns === '';
  }

  buildFieldsHTML() {
    const result = [];
    let i = 0;

    while (i < this.fields.length) {
      const field = this.fields[i];
      field.columns = field.columns || field.cols;

      if (field.type === 'group') {
        // Collect consecutive groups that should be in a row
        const groupsInRow = [field];
        let totalColumns = field.columns || 12;

        // Handle responsive columns - use md breakpoint for calculation, fallback to largest available
        if (typeof totalColumns === 'object' && totalColumns !== null) {
          totalColumns = totalColumns.md || totalColumns.sm || totalColumns.xs || 12;
        }

        let j = i + 1;

        // Look ahead for more groups that can fit in the same row
        while (j < this.fields.length &&
               this.fields[j].type === 'group' &&
               totalColumns < 12) {
          const nextGroup = this.fields[j];
          let nextColumns = nextGroup.columns || 12;

          // Handle responsive columns - use md breakpoint for calculation, fallback to largest available
          if (typeof nextColumns === 'object' && nextColumns !== null) {
            nextColumns = nextColumns.md || nextColumns.sm || nextColumns.xs || 12;
          }

          if (totalColumns + nextColumns <= 12) {
            groupsInRow.push(nextGroup);
            totalColumns += nextColumns;
            j++;
          } else {
            break;
          }
        }

        // If we have multiple groups or a single group with specific columns, wrap in row
        let shouldWrap = groupsInRow.length > 1;

        // Check if single group has specific columns (not full width)
        if (groupsInRow.length === 1 && field.columns) {
          let cols = field.columns;
          if (typeof cols === 'object' && cols !== null) {
            cols = cols.md || cols.sm || cols.xs || 12;
          }
          shouldWrap = shouldWrap || cols < 12;
        }

        if (shouldWrap) {
          const groupsHTML = groupsInRow.map(group => this.buildGroupHTML(group)).join('');
          result.push(`<div class="row">${groupsHTML}</div>`);
        } else {
          result.push(this.buildGroupHTML(field));
        }

        i = j;
      } else if (field.columns && field.columns < 12) {
        // Collect consecutive fields with columns that should be in a row
        const fieldsInRow = [field];
        let totalColumns = field.columns || 12;

        // Handle responsive columns - use md breakpoint for calculation, fallback to largest available
        if (typeof totalColumns === 'object' && totalColumns !== null) {
          totalColumns = totalColumns.md || totalColumns.sm || totalColumns.xs || 12;
        }

        let j = i + 1;

        // Look ahead for more fields that can fit in the same row
        while (j < this.fields.length &&
               this.fields[j].columns &&
               totalColumns < 12) {
          const nextField = this.fields[j];
          let nextColumns = nextField.columns || 12;

          // Handle responsive columns - use md breakpoint for calculation, fallback to largest available
          if (typeof nextColumns === 'object' && nextColumns !== null) {
            nextColumns = nextColumns.md || nextColumns.sm || nextColumns.xs || 12;
          }

          if (totalColumns + nextColumns <= 12) {
            fieldsInRow.push(nextField);
            totalColumns += nextColumns;
            j++;
          } else {
            break;
          }
        }

        // Wrap fields in a row
        const fieldsHTML = fieldsInRow.map(f => this.buildFieldHTML(f)).join('');
        result.push(`<div class="row">${fieldsHTML}</div>`);

        i = j;
      } else if (this.isAutoSizingField(field)) {
        // Collect consecutive auto-sizing fields that should be in a row
        const fieldsInRow = [field];
        let j = i + 1;

        // Look ahead for more auto-sizing fields
        while (j < this.fields.length) {
          const nextField = this.fields[j];
          if (this.isAutoSizingField(nextField)) {
            fieldsInRow.push(nextField);
            j++;
          } else {
            break;
          }
        }

        // If we have multiple auto-sizing fields, wrap them in a row
        if (fieldsInRow.length > 1) {
          const fieldsHTML = fieldsInRow.map(f => this.buildFieldHTML(f)).join('');
          result.push(`<div class="row">${fieldsHTML}</div>`);
        } else {
          // Single auto-sizing field, still wrap in row for consistency
          result.push(`<div class="row">${this.buildFieldHTML(field)}</div>`);
        }

        i = j;
      } else {
        result.push(this.buildFieldHTML(field));
        i++;
      }
    }

    return result.join('');
  }

  /**
   * Generate HTML for a field group with column layout
   * @param {Object} group - Group configuration
   * @returns {string} Group HTML
   */
  buildGroupHTML(group) {
    const {
      columns = 12,
      title,
      fields = [],
      class: groupClass = '',
      titleClass = 'h6 mb-3',
      responsive = {}
    } = group;

    // Build responsive column classes
    let colClasses = [];

    // Handle columns as object (responsive) or number (legacy)
    if (typeof columns === 'object' && columns !== null) {
      // New responsive syntax: columns: { xs: 12, sm: 6, md: 4, lg: 3 }
      if (columns.xs) colClasses.push(`col-${columns.xs}`);
      if (columns.sm) colClasses.push(`col-sm-${columns.sm}`);
      if (columns.md) colClasses.push(`col-md-${columns.md}`);
      if (columns.lg) colClasses.push(`col-lg-${columns.lg}`);
      if (columns.xl) colClasses.push(`col-xl-${columns.xl}`);
      if (columns.xxl) colClasses.push(`col-xxl-${columns.xxl}`);

      // If no md is specified but xs/sm are, use xs or sm as fallback for md
      if (!columns.md && (columns.xs || columns.sm)) {
        const fallback = columns.sm || columns.xs;
        colClasses.push(`col-md-${fallback}`);
      }

      // If no breakpoints specified at all, default to col-md-12
      if (colClasses.length === 0) {
        colClasses.push('col-md-12');
      }
    } else {
      // Legacy syntax: columns: 6
      colClasses.push(`col-md-${columns}`);
    }

    // Support legacy responsive property (for backward compatibility)
    if (responsive.xs) colClasses.push(`col-${responsive.xs}`);
    if (responsive.sm) colClasses.push(`col-sm-${responsive.sm}`);
    if (responsive.lg) colClasses.push(`col-lg-${responsive.lg}`);
    if (responsive.xl) colClasses.push(`col-xl-${responsive.xl}`);

    const colClass = colClasses.join(' ');
    const fieldsHTML = fields.map(field => {
      if (field.type === 'group') {
        // Nested groups (limited depth)
        return this.buildGroupHTML(field);
      }
      return this.buildFieldHTML(field);
    }).join('');

    return `
      <div class="mojo-form-group ${colClass} ${groupClass}">
        ${title ? `<div class="${titleClass}">${this.escapeHtml(title)}</div>` : ''}
        <div class="row">
          ${fieldsHTML}
        </div>
      </div>
    `;
  }

  /**
   * Generate HTML for a single field
   * @param {Object} field - Field configuration
   * @returns {string} Field HTML
   */
  buildFieldHTML(field) {
    const { type, columns, class: fieldClass = '' } = field;

    let fieldHTML = '';
    switch (type) {
      case 'text':
        fieldHTML = this.renderTextField(field);
        break;
      case 'email':
        fieldHTML = this.renderEmailField(field);
        break;
      case 'password':
        fieldHTML = this.renderPasswordField(field);
        break;
      case 'number':
        fieldHTML = this.renderNumberField(field);
        break;
      case 'tel':
        fieldHTML = this.renderTelField(field);
        break;
      case 'url':
        fieldHTML = this.renderUrlField(field);
        break;
      case 'search':
        fieldHTML = this.renderSearchField(field);
        break;
      case 'textarea':
        fieldHTML = this.renderTextareaField(field);
        break;
      case 'json':
        fieldHTML = this.renderJsonField(field);
        break;
      case 'select':
        fieldHTML = this.renderSelectField(field);
        break;
      case 'checkbox':
        fieldHTML = this.renderCheckboxField(field);
        break;
      case 'switch':
        fieldHTML = this.renderSwitchField(field);
        break;
      case 'radio':
        fieldHTML = this.renderRadioField(field);
        break;
      case 'date':
        fieldHTML = this.renderDateField(field);
        break;
      case 'datetime':
        fieldHTML = this.renderDateTimeField(field);
        break;
      case 'time':
        fieldHTML = this.renderTimeField(field);
        break;
      case 'file':
        fieldHTML = this.renderFileField(field);
        break;
      case 'image':
        fieldHTML = this.renderImageField(field);
        break;
      case 'color':
        fieldHTML = this.renderColorField(field);
        break;
      case 'range':
        fieldHTML = this.renderRangeField(field);
        break;
      case 'hidden':
        fieldHTML = this.renderHiddenField(field);
        break;
      case 'button':
        fieldHTML = this.renderButton(field);
        break;
      case 'divider':
        fieldHTML = this.renderDivider(field);
        break;
      case 'html':
        fieldHTML = this.renderHtmlField(field);
        break;
      case 'header':
        fieldHTML = this.renderHeaderField(field);
        break;
      case 'tag':
      case 'tags':
        fieldHTML = this.renderTagField(field);
        break;
      case 'collection':
        fieldHTML = this.renderCollectionField(field);
        break;
      case 'datepicker':
        fieldHTML = this.renderDatePickerField(field);
        break;
      case 'daterange':
        fieldHTML = this.renderDateRangeField(field);
        break;
      case 'checklistdropdown':
        fieldHTML = this.renderChecklistDropdownField(field);
        break;
      case 'buttongroup':
        fieldHTML = this.renderButtonGroupField(field);
        break;
      default:
        console.warn(`Unknown field type: ${type}`);
        fieldHTML = this.renderTextField(field);
    }

    // Wrap field in column - handle auto-sizing columns
    let colClass;
    if (this.isAutoSizingField(field)) {
      colClass = `col ${fieldClass}`.trim();
    } else {
      colClass = `col-${columns} ${fieldClass}`.trim();
    }
    return `<div class="${colClass}">${fieldHTML}</div>`;
  }

  /**
   * Generate field ID
   * @param {string} name - Field name
   * @returns {string} Unique field ID
   */
  getFieldId(name) {
    return `field_${name}_${Date.now()}`;
  }

  /**
   * Render text input field
   * @param {Object} field - Field configuration
   * @returns {string} Field HTML
   */
  renderTextField(field) {
    return this.renderInputField(field, 'text');
  }

  /**
   * Render email input field
   * @param {Object} field - Field configuration
   * @returns {string} Field HTML
   */
  renderEmailField(field) {
    return this.renderInputField(field, 'email');
  }

  /**
   * Render password input field
   * @param {Object} field - Field configuration
   * @returns {string} Field HTML
   */
  renderPasswordField(field) {
    return this.renderInputField(field, 'password');
  }

  /**
   * Render number input field
   * @param {Object} field - Field configuration
   * @returns {string} Field HTML
   */
  renderNumberField(field) {
    const {
      min,
      max,
      step = 1,
      ...baseField
    } = field;

    const attrs = [];
    if (min !== undefined) attrs.push(`min="${min}"`);
    if (max !== undefined) attrs.push(`max="${max}"`);
    if (step !== undefined) attrs.push(`step="${step}"`);

    return this.renderInputField({
      ...baseField,
      attributes: { ...baseField.attributes, ...attrs.reduce((obj, attr) => {
        const [key, value] = attr.split('=');
        obj[key] = value.replace(/"/g, '');
        return obj;
      }, {}) }
    }, 'number');
  }

  /**
   * Render tel input field
   * @param {Object} field - Field configuration
   * @returns {string} Field HTML
   */
  renderTelField(field) {
    return this.renderInputField(field, 'tel');
  }

  /**
   * Render URL input field
   * @param {Object} field - Field configuration
   * @returns {string} Field HTML
   */
  renderUrlField(field) {
    return this.renderInputField(field, 'url');
  }

  /**
   * Render search input field
   * @param {Object} field - Field configuration
   * @returns {string} Field HTML
   */
  renderSearchField(field) {
    const searchField = {
      ...field,
      attributes: {
        'data-filter': 'live-search',
        'data-change-action': 'filter-search',
        'data-filter-debounce': field.debounce || '300',
        ...field.attributes
      }
    };
    return this.renderInputField(searchField, 'search');
  }

  /**
   * Render generic input field
   * @param {Object} field - Field configuration
   * @param {string} type - Input type
   * @returns {string} Field HTML
   */
  renderInputField(field, type = 'text') {
    const {
      name,
      label,
      value = '',
      placeholder = '',
      required = false,
      disabled = false,
      readonly = false,
      class: fieldClass = '',
      attributes = {},
      help = field.helpText || field.help || ''
    } = field;

    const inputClass = `${this.options.inputClass} ${fieldClass}`.trim();
    const error = this.errors[name];
    const fieldValue = (this.getFieldValue(name) ?? value);

    const attrs = Object.entries(attributes).map(([key, val]) => `${key}="${this.escapeHtml(val)}"`).join(' ');
    const fieldId = this.getFieldId(name);

    const context = {
      labelClass: this.options.labelClass,
      inputClass: inputClass,
      helpClass: this.options.helpClass,
      errorClass: this.options.errorClass,
      fieldId,
      name,
      type,
      fieldValue: this.escapeHtml(fieldValue),
      label: label ? this.escapeHtml(label) : null,
      placeholder: placeholder ? this.escapeHtml(placeholder) : null,
      help: help ? this.escapeHtml(help) : null,
      error: error ? this.escapeHtml(error) : null,
      required,
      disabled,
      readonly,
      attrs
    };

    return Mustache.render(this.templates.input, context);
  }

  /**
   * Render textarea field
   * @param {Object} field - Field configuration
   * @returns {string} Field HTML
   */
  renderTextareaField(field) {
    const {
      name,
      label,
      value = '',
      placeholder = '',
      required = false,
      disabled = false,
      readonly = false,
      rows = 3,
      cols: _cols,
      class: fieldClass = '',
      attributes = {},
      help = field.helpText || field.help || ''
    } = field;

    const inputClass = `${this.options.inputClass} ${fieldClass}`.trim();
    const error = this.errors[name];
    const fieldValue = (this.getFieldValue(name) ?? value);

    const attrs = Object.entries(attributes).map(([key, val]) => `${key}="${this.escapeHtml(val)}"`).join(' ');
    const fieldId = this.getFieldId(name);

    const context = {
      labelClass: this.options.labelClass,
      inputClass: inputClass,
      helpClass: this.options.helpClass,
      errorClass: this.options.errorClass,
      fieldId,
      name,
      fieldValue: fieldValue, // Pass raw value to template for correct rendering
      label: label ? this.escapeHtml(label) : null,
      placeholder: placeholder ? this.escapeHtml(placeholder) : null,
      help: help ? this.escapeHtml(help) : null,
      error: error ? this.escapeHtml(error) : null,
      rows: rows || 3,
      required,
      disabled,
      readonly,
      attrs
    };

    return Mustache.render(this.templates.textarea, context);
  }

  /**
   * Render JSON field as a textarea
   * @param {Object} field - Field configuration
   * @returns {string} Field HTML
   */
  renderJsonField(field) {
    const {
      name,
      label,
      placeholder = '',
      required = false,
      disabled = false,
      readonly = false,
      rows = 3,
      class: fieldClass = '',
      attributes = {},
      help = field.helpText || field.help || ''
    } = field;

    const rawValue = this.getFieldValue(field.name) ?? field.value ?? {};
    let formattedValue = rawValue;

    if (typeof rawValue === 'object' && rawValue !== null) {
        try {
            formattedValue = JSON.stringify(rawValue, null, 2);
        } catch (e) {
            formattedValue = "{}";
        }
    } else if (typeof rawValue !== 'string') {
        formattedValue = String(rawValue);
    }

    const inputClass = `${this.options.inputClass} ${fieldClass}`.trim();
    const error = this.errors[name];
    const fieldId = this.getFieldId(name);

    const attrs = Object.entries({
      ...attributes,
      'data-field-type': 'json'
    }).map(([key, val]) => `${key}="${this.escapeHtml(val)}"`).join(' ');

    const context = {
      labelClass: this.options.labelClass,
      inputClass: inputClass,
      helpClass: this.options.helpClass,
      errorClass: this.options.errorClass,
      fieldId,
      name,
      fieldValue: formattedValue, // Use the formatted JSON string directly
      label: label ? this.escapeHtml(label) : null,
      placeholder: placeholder ? this.escapeHtml(placeholder) : null,
      help: help ? this.escapeHtml(help) : null,
      error: error ? this.escapeHtml(error) : null,
      rows: rows || 3,
      required,
      disabled,
      readonly,
      attrs
    };

    return Mustache.render(this.templates.textarea, context);
  }



  /**
   * Render select field
   * @param {Object} field - Field configuration
   * @returns {string} Field HTML
   */
  renderSelectField(field) {
    const {
      name,
      label,
      options = [],
      value = '',
      required = false,
      disabled = false,
      multiple = false,
      searchable = false,
      class: fieldClass = '',
      attributes = {},
      help = field.helpText || field.help || ''
    } = field;

    const inputClass = `form-select ${fieldClass}`.trim();
    const error = this.errors[name];
    const fieldValue = (this.getFieldValue(name) ?? value);

    const attrs = Object.entries(attributes).map(([key, val]) => `${key}="${this.escapeHtml(val)}"`).join(' ');
    const fieldId = this.getFieldId(name);

    let optionsHTML = '';
    if (Array.isArray(options)) {
      optionsHTML = options.map(option => {
        if (typeof option === 'string') {
          const selected = option === fieldValue ? 'selected' : '';
          return `<option value="${this.escapeHtml(option)}" ${selected}>${this.escapeHtml(option)}</option>`;
        } else if (option && typeof option === 'object') {
          const selected = option.value === fieldValue ? 'selected' : '';
          return `<option value="${this.escapeHtml(option.value)}" ${selected}>${this.escapeHtml(option.label || option.text || option.value)}</option>`;
        }
        return '';
      }).join('');
    }

    const searchInput = searchable ? `
      <input type="text"
             class="form-control form-control-sm mb-2"
             placeholder="Search options..."
             data-filter="live-search"
             data-change-action="filter-select-options"
             data-target="${fieldId}">
    ` : '';

    const context = {
      labelClass: this.options.labelClass,
      inputClass: inputClass,
      helpClass: this.options.helpClass,
      errorClass: this.options.errorClass,
      fieldId,
      name,
      label: label ? this.escapeHtml(label) : null,
      help: help ? this.escapeHtml(help) : null,
      error: error ? this.escapeHtml(error) : null,
      searchInput: searchable ? searchInput : null,
      optionsHTML,
      required,
      disabled,
      multiple,
      attrs
    };

    return Mustache.render(this.templates.select, context);
  }

  /**
   * Render checkbox field
   * @param {Object} field - Field configuration
   * @returns {string} Field HTML
   */
  renderCheckboxField(field) {
    const {
      name,
      label,
      value = false,
      required = false,
      disabled = false,
      class: fieldClass = '',
      attributes = {},
      help = field.helpText || field.help || ''
    } = field;

    const error = this.errors[name];
    const fieldValue = (this.getFieldValue(name) ?? value);
    const checked = fieldValue === true || fieldValue === 'true' || fieldValue === '1';

    const attrs = Object.entries(attributes).map(([key, val]) => `${key}="${this.escapeHtml(val)}"`).join(' ');
    const fieldId = this.getFieldId(name);

    const context = {
      helpClass: this.options.helpClass,
      errorClass: this.options.errorClass,
      fieldId,
      name,
      label: this.escapeHtml(label),
      help: help ? this.escapeHtml(help) : null,
      error: error ? this.escapeHtml(error) : null,
      value: this.escapeHtml(value),
      fieldClass,
      checked,
      required,
      disabled,
      attrs
    };

    return Mustache.render(this.templates.checkbox, context);
  }

  /**
   * Render switch field (enhanced checkbox)
   * @param {Object} field - Field configuration
   * @returns {string} Field HTML
   */
  renderSwitchField(field) {
    const {
      name,
      label,
      value = false,
      required = false,
      disabled = false,
      size = 'md',
      class: fieldClass = '',
      attributes = {},
      help = field.helpText || field.help || ''
    } = field;

    const error = this.errors[name];
    const fieldValue = (this.getFieldValue(name) ?? value);
    const checked = fieldValue === true || fieldValue === 'true' || fieldValue === '1';

    const attrs = Object.entries(attributes).map(([key, val]) => `${key}="${this.escapeHtml(val)}"`).join(' ');
    const fieldId = this.getFieldId(name);
    const sizeClass = size !== 'md' ? `form-switch-${size}` : '';

    const context = {
      helpClass: this.options.helpClass,
      errorClass: this.options.errorClass,
      fieldId,
      name,
      label: this.escapeHtml(label),
      help: help ? this.escapeHtml(help) : null,
      error: error ? this.escapeHtml(error) : null,
      value: this.escapeHtml(value),
      sizeClass,
      fieldClass,
      checked,
      required,
      disabled,
      attrs
    };

    return Mustache.render(this.templates.switch, context);
  }

  /**
   * Render radio field group
   * @param {Object} field - Field configuration
   * @returns {string} Field HTML
   */
  renderRadioField(field) {
    const {
      name,
      label,
      options = [],
      value = '',
      disabled = false,
      inline = false,
      class: fieldClass = '',
      attributes = {},
      help = field.helpText || field.help || ''
    } = field;

    const error = this.errors[name];
    const fieldValue = (this.getFieldValue(name) ?? value);

    const attrs = Object.entries(attributes).map(([key, val]) => `${key}="${this.escapeHtml(val)}"`).join(' ');

    let optionsHTML = '';
    if (Array.isArray(options)) {
      optionsHTML = options.map((option, index) => {
        const radioId = `${name}_${index}`;
        const radioValue = typeof option === 'string' ? option : option.value;
        const radioLabel = typeof option === 'string' ? option : option.label || option.text || option.value;
        const checked = radioValue === fieldValue ? 'checked' : '';
        const inlineClass = inline ? 'form-check-inline' : '';

        return `
          <div class="form-check ${inlineClass}">
            <input
              type="radio"
              id="${radioId}"
              name="${name}"
              class="form-check-input ${error ? 'is-invalid' : ''}"
              value="${this.escapeHtml(radioValue)}"
              ${checked}
              ${disabled ? 'disabled' : ''}
              data-change-action="validate-field"
              ${attrs}
            >
            <label class="form-check-label" for="${radioId}">
              ${this.escapeHtml(radioLabel)}
            </label>
          </div>
        `;
      }).join('');
    }

    return `
      <div class="mojo-form-control">
        ${label ? `<fieldset>
          <legend class="${this.options.labelClass}">${this.escapeHtml(label)}</legend>
          <div class="${fieldClass}">
            ${optionsHTML}
          </div>
        </fieldset>` : `<div class="${fieldClass}">${optionsHTML}</div>`}
        ${help ? `<div class="${this.options.helpClass}">${this.escapeHtml(help)}</div>` : ''}
        ${error ? `<div class="${this.options.errorClass}">${this.escapeHtml(error)}</div>` : ''}
      </div>
    `;
  }

  /**
   * Render date field
   * @param {Object} field - Field configuration
   * @returns {string} Field HTML
   */
  renderDateField(field) {
    return this.renderInputField(field, 'date');
  }

  /**
   * Render datetime field
   * @param {Object} field - Field configuration
   * @returns {string} Field HTML
   */
  renderDateTimeField(field) {
    return this.renderInputField(field, 'datetime-local');
  }

  /**
   * Render time field
   * @param {Object} field - Field configuration
   * @returns {string} Field HTML
   */
  renderTimeField(field) {
    return this.renderInputField(field, 'time');
  }

  /**
   * Render file field
   * @param {Object} field - Field configuration
   * @returns {string} Field HTML
   */
  renderFileField(field) {
    const {
      name,
      label,
      required = false,
      disabled = false,
      multiple = false,
      accept = '*/*',
      class: fieldClass = '',
      attributes = {},
      help = field.helpText || field.help || ''
    } = field;

    const inputClass = `${this.options.inputClass} ${fieldClass}`.trim();
    const error = this.errors[name];

    const attrs = Object.entries(attributes).map(([key, val]) => `${key}="${this.escapeHtml(val)}"`).join(' ');
    const fieldId = this.getFieldId(name);

    const context = {
      labelClass: this.options.labelClass,
      inputClass: inputClass,
      helpClass: this.options.helpClass,
      errorClass: this.options.errorClass,
      fieldId,
      name,
      label: label ? this.escapeHtml(label) : null,
      help: help ? this.escapeHtml(help) : null,
      error: error ? this.escapeHtml(error) : null,
      accept,
      required,
      disabled,
      multiple,
      attrs
    };

    return Mustache.render(this.templates.file, context);
  }

  /**
   * Render enhanced image field with drag & drop support
   * @param {Object} field - Field configuration
   * @returns {string} Field HTML
   */
  renderImageField(field) {
    const {
      name,
      label,
      required = false,
      disabled = false,
      accept = 'image/*',
      class: fieldClass = '',
      attributes = {},
      help = field.helpText || field.help || '',
      size = 'md',
      allowDrop = true,
      placeholder = 'Drop image here or click to upload'
    } = field;

    const inputClass = `${this.options.inputClass} ${fieldClass}`.trim();
    const error = this.errors[name];
    const fieldId = this.getFieldId(name);
    const dropZoneId = `${fieldId}_dropzone`;
    const previewId = `${fieldId}_preview`;

    // Size configurations
    const sizeMap = {
      xs: { width: 48, height: 48, containerClass: 'image-field-xs' },
      sm: { width: 96, height: 96, containerClass: 'image-field-sm' },
      md: { width: 150, height: 150, containerClass: 'image-field-md' },
      lg: { width: 200, height: 200, containerClass: 'image-field-lg' },
      xl: { width: 300, height: 300, containerClass: 'image-field-xl' }
    };

    const sizeConfig = sizeMap[size] || sizeMap.md;
    const attrs = Object.entries(attributes).map(([key, val]) => `${key}="${this.escapeHtml(val)}"`).join(' ');

    // Get current value (could be URL string or file object)
    const currentValue = this.getFieldValue(name);
    const imageUrl = this.extractImageUrl(currentValue, size);

    const context = {
      labelClass: this.options.labelClass,
      inputClass: inputClass,
      helpClass: this.options.helpClass,
      errorClass: this.options.errorClass,
      fieldId,
      name,
      label: label ? this.escapeHtml(label) : null,
      help: help ? this.escapeHtml(help) : null,
      error: error ? this.escapeHtml(error) : null,
      dropZoneId,
      previewId,
      containerClass: sizeConfig.containerClass,
      width: sizeConfig.width,
      height: sizeConfig.height,
      accept,
      imageUrl,
      placeholderText: disabled ? 'No image' : this.escapeHtml(placeholder),
      cursor: disabled ? 'default' : 'pointer',
      allowDrop,
      showRemove: !disabled,
      required,
      disabled,
      attrs
    };

    return Mustache.render(this.templates.image, context);
  }

  /**
   * Extract image URL from field value (handles both URL strings and file objects)
   * @param {string|Object} value - Field value
   * @param {string} size - Requested size (xs, sm, md, lg, xl)
   * @returns {string|null} Image URL or null
   */
  extractImageUrl(value, size = 'md') {
    if (!value) return null;

    // If it's already a URL string
    if (typeof value === 'string') {
      return value;
    }

    // If it's a file object with renditions
    if (typeof value === 'object' && value.url) {
      // Try to get appropriate rendition based on size
      if (value.renditions) {
        const sizeMap = {
          xs: ['thumbnail_sm', 'thumbnail', 'square_sm'],
          sm: ['thumbnail', 'thumbnail_sm', 'square_sm'],
          md: ['thumbnail_md', 'thumbnail', 'thumbnail_lg'],
          lg: ['thumbnail_lg', 'thumbnail_md', 'thumbnail'],
          xl: ['original', 'thumbnail_lg']
        };

        const preferredSizes = sizeMap[size] || sizeMap.md;

        for (const renditionName of preferredSizes) {
          if (value.renditions[renditionName] && value.renditions[renditionName].url) {
            return value.renditions[renditionName].url;
          }
        }
      }

      // Fall back to original URL
      return value.url;
    }

    return null;
  }

  /**
   * Render color field
   * @param {Object} field - Field configuration
   * @returns {string} Field HTML
   */
  renderColorField(field) {
    return this.renderInputField(field, 'color');
  }

  /**
   * Render range field
   * @param {Object} field - Field configuration
   * @returns {string} Field HTML
   */
  renderRangeField(field) {
    const {
      name,
      label,
      min = 0,
      max = 100,
      step = 1,
      value = min,
      disabled = false,
      class: fieldClass = '',
      attributes = {},
      help = field.helpText || field.help || ''
    } = field;

    const inputClass = `${this.options.inputClass} ${fieldClass}`.trim();
    const error = this.errors[name];
    const fieldValue = (this.getFieldValue(name) ?? value);

    const attrs = Object.entries(attributes).map(([key, val]) => `${key}="${this.escapeHtml(val)}"`).join(' ');
    const fieldId = this.getFieldId(name);

    const context = {
      labelClass: this.options.labelClass,
      inputClass: inputClass,
      helpClass: this.options.helpClass,
      errorClass: this.options.errorClass,
      fieldId,
      name,
      label: label ? this.escapeHtml(label) : null,
      help: help ? this.escapeHtml(help) : null,
      error: error ? this.escapeHtml(error) : null,
      min,
      max,
      step,
      fieldValue,
      disabled,
      attrs
    };

    return Mustache.render(this.templates.range, context);
  }

  /**
   * Render hidden field
   * @param {Object} field - Field configuration
   * @returns {string} Field HTML
   */
  renderHiddenField(field) {
    const { name, value = '' } = field;
    const fieldValue = (this.getFieldValue(name) ?? value);

    return `<input type="hidden" name="${name}" value="${this.escapeHtml(fieldValue)}">`;
  }

  /**
   * Render button field
   * @param {Object} field - Field configuration
   * @returns {string} Button HTML
   */
  renderButton(field) {
    const {
      name = '',
      label = 'Button',
      type = 'button',
      action = '',
      class: fieldClass = 'btn-secondary',
      disabled = false,
      attributes = {}
    } = field;

    // Auto-assign actions for submit/reset types
    let buttonAction = action;
    if (!buttonAction) {
      if (type === 'submit') {
        buttonAction = 'submit-form';
      } else if (type === 'reset') {
        buttonAction = 'reset-form';
      }
    }

    const attrs = Object.entries(attributes).map(([key, val]) => `${key}="${this.escapeHtml(val)}"`).join(' ');

    return `
      <button
        type="button"
        ${name ? `name="${name}"` : ''}
        class="btn ${fieldClass}"
        ${buttonAction ? `data-action="${buttonAction}"` : ''}
        ${disabled ? 'disabled' : ''}
        ${attrs}
      >
        ${this.escapeHtml(label)}
      </button>
    `;
  }

  /**
   * Render divider field
   * @param {Object} field - Field configuration
   * @returns {string} Divider HTML
   */
  renderDivider(field) {
    const { label = '', class: fieldClass = '' } = field;

    return `
      <div class="form-divider ${fieldClass}">
        <hr>
        ${label ? `<div class="form-divider-label">${this.escapeHtml(label)}</div>` : ''}
      </div>
    `;
  }

  /**
   * Render HTML field
   * @param {Object} field - Field configuration
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
   * Render header field
   * @param {Object} field - Field configuration
   * @returns {string} Header HTML
   */
  renderHeaderField(field) {
    const {
      text = '',
      level = 3,
      class: fieldClass = '',
      id = ''
    } = field;

    const headerLevel = Math.max(1, Math.min(6, parseInt(level)));
    const headerId = id ? ` id="${this.escapeHtml(id)}"` : '';
    const headerClass = fieldClass ? ` class="${this.escapeHtml(fieldClass)}"` : '';

    return `<h${headerLevel}${headerId}${headerClass}>${this.escapeHtml(text)}</h${headerLevel}>`;
  }

  /**
   * Generate buttons HTML
   * @returns {string} Buttons HTML
   */
  buildButtonsHTML() {
    if (!this.options.submitButton && !this.options.resetButton && !this.buttons.length) {
      return '';
    }

    let buttonsHTML = '';

    // Custom buttons
    this.buttons.forEach(button => {
      buttonsHTML += this.renderButton(button) + ' ';
    });

    // Default submit button
    if (this.options.submitButton) {
      let submitLabel = 'Submit';
      if (typeof this.options.submitButton === 'string') {
        submitLabel = this.options.submitButton;
      } else if (this.options.submitButton === true) {
        submitLabel = 'Submit';
      }
      buttonsHTML += `<button type="submit" class="btn btn-primary me-2" data-action="submit-form">${submitLabel}</button>`;
    }

    // Default reset button
    if (this.options.resetButton) {
      let resetLabel = 'Reset';
      if (typeof this.options.resetButton === 'string') {
        resetLabel = this.options.resetButton;
      } else if (this.options.resetButton === true) {
        resetLabel = 'Reset';
      }
      buttonsHTML += `<button type="button" class="btn btn-secondary" data-action="reset-form">${resetLabel}</button>`;
    }

    return buttonsHTML ? `
      <div class="form-actions mt-3">
        ${buttonsHTML}
      </div>
    ` : '';
  }

  /**
   * Get field value from data
   * @param {string} name - Field name
   * @returns {*} Field value
   */
  getFieldValue(name) {
    return MOJOUtils.getContextData(this.data, name);
  }

  /**
   * Render tag input field
   * @param {Object} field - Field configuration
   * @returns {string} Field HTML
   */
  renderTagField(field) {
    const {
      name,
      label,
      value = '',
      placeholder = 'Add tags...',
      required = false,
      disabled = false,
      readonly = false,
      maxTags = 50,
      allowDuplicates = false,
      separator = ',',
      help = field.helpText || field.help || ''
    } = field;

    const fieldId = this.getFieldId(name);
    const error = this.errors[name];
    const fieldValue = (this.getFieldValue(name) ?? value);

    return `
      <div class="mojo-form-control">
        ${label ? `<label for="${fieldId}" class="${this.options.labelClass}">${this.escapeHtml(label)}${required ? '<span class="text-danger">*</span>' : ''}</label>` : ''}
        <div class="tag-input-placeholder"
             data-field-name="${name}"
             data-field-type="tag"
             data-field-config='${JSON.stringify({
               name,
               value: fieldValue,
               placeholder,
               maxTags,
               allowDuplicates,
               separator,
               disabled,
               readonly,
               required
             })}'>
          <input type="text"
                 id="${fieldId}"
                 name="${name}_display"
                 class="${this.options.inputClass}${error ? ' is-invalid' : ''}"
                 placeholder="${this.escapeHtml(placeholder)}"
                 ${disabled ? 'disabled' : ''}
                 ${readonly ? 'readonly' : ''}
                 data-change-action="validate-field">
          <input type="hidden" name="${name}" value="${this.escapeHtml(fieldValue)}">
          <small class="form-text text-muted">This will be enhanced with TagInput component</small>
        </div>
        ${help ? `<div class="${this.options.helpClass}">${this.escapeHtml(help)}</div>` : ''}
        ${error ? `<div class="${this.options.errorClass}">${this.escapeHtml(error)}</div>` : ''}
      </div>
    `;
  }

  /**
   * Render collection select field
   * @param {Object} field - Field configuration
   * @returns {string} Field HTML
   */
  renderCollectionField(field) {
    const {
      name,
      label,
      value = '',
      placeholder = 'Search...',
      required = false,
      disabled = false,
      readonly = false,
      Collection: _Collection,
      labelField = 'name',
      valueField = 'id',
      maxItems = 10,
      emptyFetch = false,
      debounceMs = 300,
      help = field.helpText || field.help || ''
    } = field;

    const fieldId = this.getFieldId(name);
    const error = this.errors[name];
    const fieldValue = (this.getFieldValue(name) ?? value);

    return `
      <div class="mojo-form-control">
        ${label ? `<label for="${fieldId}" class="${this.options.labelClass}">${this.escapeHtml(label)}${required ? '<span class="text-danger">*</span>' : ''}</label>` : ''}
        <div class="collection-select-placeholder"
             data-field-name="${name}"
             data-field-type="collection"
             data-field-config='${JSON.stringify({
               name,
               value: fieldValue,
               placeholder,
               labelField,
               valueField,
               maxItems,
               emptyFetch,
               debounceMs,
               disabled,
               readonly,
               required
             })}'>
          <input type="text"
                 id="${fieldId}"
                 name="${name}_display"
                 class="${this.options.inputClass}${error ? ' is-invalid' : ''}"
                 placeholder="${this.escapeHtml(placeholder)}"
                 ${disabled ? 'disabled' : ''}
                 ${readonly ? 'readonly' : ''}
                 data-change-action="validate-field">
          <input type="hidden" name="${name}" value="${this.escapeHtml(fieldValue)}">
          <small class="form-text text-muted">This will be enhanced with CollectionSelect component</small>
        </div>
        ${help ? `<div class="${this.options.helpClass}">${this.escapeHtml(help)}</div>` : ''}
        ${error ? `<div class="${this.options.errorClass}">${this.escapeHtml(error)}</div>` : ''}
      </div>
    `;
  }

  /**
   * Render enhanced date picker field
   * @param {Object} field - Field configuration
   * @returns {string} Field HTML
   */
  renderDatePickerField(field) {
    const {
      name,
      label,
      value = '',
      placeholder = 'Select date...',
      required = false,
      disabled = false,
      readonly = false,
      min = null,
      max = null,
      format = 'YYYY-MM-DD',
      displayFormat = 'MMM DD, YYYY',
      help = field.helpText || field.help || ''
    } = field;

    const fieldId = this.getFieldId(name);
    const error = this.errors[name];
    const fieldValue = (this.getFieldValue(name) ?? value);

    return `
      <div class="mojo-form-control">
        ${label ? `<label for="${fieldId}" class="${this.options.labelClass}">${this.escapeHtml(label)}${required ? '<span class="text-danger">*</span>' : ''}</label>` : ''}
        <div class="date-picker-placeholder"
             data-field-name="${name}"
             data-field-type="datepicker"
             data-field-config='${JSON.stringify({
               name,
               value: fieldValue,
               placeholder,
               min,
               max,
               format,
               displayFormat,
               disabled,
               readonly,
               required
             })}'>
          <input type="date"
                 id="${fieldId}"
                 name="${name}"
                 class="${this.options.inputClass}${error ? ' is-invalid' : ''}"
                 value="${this.escapeHtml(fieldValue)}"
                 placeholder="${this.escapeHtml(placeholder)}"
                 ${min ? `min="${min}"` : ''}
                 ${max ? `max="${max}"` : ''}
                 ${disabled ? 'disabled' : ''}
                 ${readonly ? 'readonly' : ''}
                 ${required ? 'required' : ''}
                 data-change-action="validate-field">
          <small class="form-text text-muted">This will be enhanced with Easepick DatePicker</small>
        </div>
        ${help ? `<div class="${this.options.helpClass}">${this.escapeHtml(help)}</div>` : ''}
        ${error ? `<div class="${this.options.errorClass}">${this.escapeHtml(error)}</div>` : ''}
      </div>
    `;
  }

  /**
   * Render date range picker field
   * @param {Object} field - Field configuration
   * @returns {string} Field HTML
   */
  renderDateRangeField(field) {
    const {
      name,
      startName,
      endName,
      fieldName,
      label,
      startDate = '',
      endDate = '',
      placeholder = 'Select date range...',
      required = false,
      disabled = false,
      readonly = false,
      min = null,
      max = null,
      format = 'YYYY-MM-DD',
      displayFormat = 'MMM DD, YYYY',
      outputFormat = 'date',
      separator = ' - ',
      help = field.helpText || field.help || ''
    } = field;

    const fieldId = this.getFieldId(name || startName || 'daterange');
    const error = this.errors[name];
    const startFieldName = startName || (name ? name + '_start' : '');
    const endFieldName = endName || (name ? name + '_end' : '');
    const startValue = this.getFieldValue(startFieldName) || startDate;
    const endValue = this.getFieldValue(endFieldName) || endDate;

    return `
      <div class="mojo-form-control">
        ${label ? `<label for="${fieldId}" class="${this.options.labelClass}">${this.escapeHtml(label)}${required ? '<span class="text-danger">*</span>' : ''}</label>` : ''}
        <div class="date-range-picker-placeholder"
             data-field-name="${name || startName || 'daterange'}"
             data-field-type="daterange"
             data-field-config='${JSON.stringify({
               name,
               startName,
               endName,
               fieldName,
               startDate: startValue,
               endDate: endValue,
               placeholder,
               min,
               max,
               format,
               displayFormat,
               outputFormat,
               separator,
               disabled,
               readonly,
               required
             })}'>
          <div class="row g-2">
            <div class="col">
              <input type="date"
                     id="${fieldId}_start"
                     name="${name}_start"
                     class="${this.options.inputClass}${error ? ' is-invalid' : ''}"
                     value="${this.escapeHtml(startValue)}"
                     placeholder="Start date..."
                     ${min ? `min="${min}"` : ''}
                     ${max ? `max="${max}"` : ''}
                     ${disabled ? 'disabled' : ''}
                     ${readonly ? 'readonly' : ''}
                     ${required ? 'required' : ''}
                     data-change-action="validate-field">
            </div>
            <div class="col-auto d-flex align-items-center">
              <span class="text-muted">${this.escapeHtml(separator.trim())}</span>
            </div>
            <div class="col">
              <input type="date"
                     id="${fieldId}_end"
                     name="${name}_end"
                     class="${this.options.inputClass}${error ? ' is-invalid' : ''}"
                     value="${this.escapeHtml(endValue)}"
                     placeholder="End date..."
                     ${min ? `min="${min}"` : ''}
                     ${max ? `max="${max}"` : ''}
                     ${disabled ? 'disabled' : ''}
                     ${readonly ? 'readonly' : ''}
                     ${required ? 'required' : ''}
                     data-change-action="validate-field">
            </div>
          </div>
          <small class="form-text text-muted">This will be enhanced with Easepick DateRangePicker</small>
        </div>
        ${help ? `<div class="${this.options.helpClass}">${this.escapeHtml(help)}</div>` : ''}
        ${error ? `<div class="${this.options.errorClass}">${this.escapeHtml(error)}</div>` : ''}
      </div>
    `;
  }

  /**
   * Render checklistdropdown field
   * @param {Object} field - Field configuration
   * @returns {string} Rendered HTML
   */
  renderChecklistDropdownField(field) {
    const fieldId = this.getFieldId(field.name);
    const selectedValues = (this.getFieldValue(field.name) ?? []);

    // Prepare data for Mustache template
    const templateData = {
      fieldId,
      fieldName: field.name,
      buttonText: field.buttonText || 'Select Options',
      buttonIcon: field.buttonIcon || 'bi-chevron-down',
      buttonClass: field.buttonClass || 'btn btn-outline-secondary btn-sm dropdown-toggle',
      dropdownClass: field.dropdownClass || 'dropdown-menu p-2',
      minWidth: field.minWidth || '200px',
      options: field.options.map(option => ({
        value: option.value,
        label: option.label,
        id: `${field.name}-${option.value}`,
        checked: selectedValues.includes(option.value)
      }))
    };

    return Mustache.render(this.templates.checklistdropdown, templateData);
  }

  /**
   * Render buttongroup field
   * @param {Object} field - Field configuration
   * @returns {string} Rendered HTML
   */
  renderButtonGroupField(field) {
    const fieldId = this.getFieldId(field.name);
    const selectedValue = (this.getFieldValue(field.name) ?? field.value);

    // Prepare data for Mustache template
    const templateData = {
      fieldId,
      fieldName: field.name,
      size: field.size || 'sm',
      variant: field.variant || 'outline-primary',
      options: field.options.map(option => ({
        value: option.value,
        label: option.label,
        active: option.value === selectedValue,
        buttonClass: this.getButtonClass(option.value === selectedValue, field.variant)
      }))
    };

    return Mustache.render(this.templates.buttongroup, templateData);
  }

  /**
   * Get button class based on active state and variant
   * @param {boolean} isActive - Whether button is active
   * @param {string} variant - Button variant
   * @returns {string} Button class
   */
  getButtonClass(isActive, variant = 'outline-primary') {
    if (isActive) {
      // Remove 'outline-' prefix for active buttons
      const activeVariant = variant.replace('outline-', '');
      return `btn btn-${activeVariant}`;
    }
    return `btn btn-${variant}`;
  }

  /**
   * Escape HTML characters to prevent XSS
   * @param {string} str - String to escape
   * @returns {string} Escaped string
   */
  escapeHtml(str) {
    if (str == null) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }
}

// Export for use in MOJO framework
export { FormBuilder };
export default FormBuilder;
