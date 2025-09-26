/**
 * FormView - Complete form component for MOJO framework
 * Uses FormBuilder for HTML generation and EventDelegate for event handling
 * Handles form lifecycle, validation, data management, and component integration
 */

import View from '@core/View.js';
import FormBuilder from './FormBuilder.js';
import applyFileDropMixin from '@core/mixins/FileDropMixin.js';

import { TagInput, CollectionSelect, DatePicker, DateRangePicker } from './inputs/index.js';

class FormView extends View {
  constructor(options = {}) {
    const {
      formConfig = options.config,
      fields,
      model = null,
      data = {},
      defaults = {},
      errors = {},
      fileHandling = 'base64', // 'base64' | 'multipart'
      ...viewOptions
    } = options;

    super({
      tagName: 'div',
      className: 'form-view',
      ...viewOptions
    });

    // Store data sources
    this.model = model;
    this.defaults = defaults;
    this._originalData = data;
    this.errors = errors;
    this.loading = false;
    this.fileHandling = fileHandling;
    this.customComponents = new Map();

    // Prepare combined data for FormBuilder
    this.data = this.prepareFormData();

    // Form configuration
    this.formConfig = formConfig || { fields: fields || [] };
    this.formBuilder = new FormBuilder({
      ...this.formConfig,
      data: this.data,
      errors
    });
  }

  /**
   * Prepare form data by combining defaults, model, and data in priority order
   * Priority: data > model > defaults
   * @returns {Object} Combined data object for FormBuilder
   */
  prepareFormData() {
    const formData = { ...this.defaults };

    // Add model data if available
    if (this.model) {
      if (this.model.attributes && typeof this.model.attributes === 'object') {
        Object.assign(formData, this.model.attributes);
      } else if (typeof this.model.toJSON === 'function') {
        Object.assign(formData, this.model.toJSON());
      } else if (typeof this.model === 'object' && this.model.constructor === Object) {
        Object.assign(formData, this.model);
      }
    }

    // Original data takes highest priority
    if (this._originalData) {
      Object.assign(formData, this._originalData);
    }

    return formData;
  }

  /**
   * Use FormBuilder for template generation
   */
  async renderTemplate() {
    return this.formBuilder.buildFormHTML();
  }

  /**
   * Initialize form after rendering
   */
  async onAfterRender() {
    await super.onAfterRender();

    // Initialize components and integrations
    this.initializeImageFields();
    this.initializeCustomComponents();
    this.initializePasswordFields();
  }

  /**
   * Initialize image fields with FileDropMixin
   */
  initializeImageFields() {
    const imageFields = this.element.querySelectorAll('.image-drop-zone.droppable');

    if (imageFields.length > 0) {
      // Apply FileDropMixin to this FormView
      applyFileDropMixin(FormView);

      // Enable file drop functionality
      this.enableFileDrop({
        acceptedTypes: ['image/*'],
        maxFileSize: 10 * 1024 * 1024, // 10MB
        multiple: false,
        dropZoneSelector: '.image-drop-zone.droppable',
        visualFeedback: true,
        dragOverClass: 'drag-over',
        dragActiveClass: 'drag-active'
      });
    }
  }

  /**
   * Initialize custom components (tags, collection selects, enhanced date pickers, etc.)
   */
  initializeCustomComponents() {
    // Initialize enhanced input components
    this.initializeTagInputs();
    this.initializeCollectionSelects();
    this.initializeDatePickers();
    this.initializeDateRangePickers();

    // Find containers for other custom components
    const componentContainers = this.element.querySelectorAll('[data-component]');

    componentContainers.forEach(container => {
      const componentType = container.getAttribute('data-component');
      const fieldName = container.getAttribute('data-field');

      if (componentType && fieldName) {
        console.log(`Found ${componentType} component for field: ${fieldName}`);
      }
    });
  }

  /**
   * Initialize TagInput components
   */
  initializeTagInputs() {
    const tagPlaceholders = this.element.querySelectorAll('[data-field-type="tag"]');

    tagPlaceholders.forEach(placeholder => {
      try {
        const fieldName = placeholder.getAttribute('data-field-name');
        const configData = placeholder.getAttribute('data-field-config');
        const config = JSON.parse(configData);

        // Create TagInput component
        const tagInput = new TagInput({
          ...config,
          containerId: null // We'll mount directly
        });

        // Replace placeholder with TagInput
        tagInput.render(true, placeholder);

        // Store reference for cleanup
        this.customComponents.set(fieldName, tagInput);

        // Listen for changes
        tagInput.on('change', (data) => {
          this.handleFieldChange(fieldName, data.value);
        });

      } catch (error) {
        console.error('Failed to initialize TagInput:', error);
      }
    });
  }

  /**
   * Initialize CollectionSelect components
   */
  initializeCollectionSelects() {
    const collectionPlaceholders = this.element.querySelectorAll('[data-field-type="collection"]');

    collectionPlaceholders.forEach(placeholder => {
      try {
        const fieldName = placeholder.getAttribute('data-field-name');
        const configData = placeholder.getAttribute('data-field-config');
        const config = JSON.parse(configData);

        // Get Collection class from field config
        const fieldConfig = this.getFormFieldConfig(fieldName);  // this.formConfig.fields.find(f => f.name === fieldName);
        if (!fieldConfig || !fieldConfig.Collection) {
          console.warn(`CollectionSelect field ${fieldName} missing Collection class`);
          return;
        }

        // Create collection instance
        const collection = new fieldConfig.Collection();
        if (fieldConfig.collectionParams) {
          collection.params = {...collection.params, ...fieldConfig.collectionParams};
        }

        // Create CollectionSelect component
        const collectionSelect = new CollectionSelect({
          ...config,
          collection,
          containerId: null // We'll mount directly
        });

        // Replace placeholder with CollectionSelect
        collectionSelect.render(true, placeholder);

        // Store reference for cleanup
        this.customComponents.set(fieldName, collectionSelect);

        // Listen for changes
        collectionSelect.on('change', (data) => {
          this.handleFieldChange(fieldName, data.value);
        });

      } catch (error) {
        console.error('Failed to initialize CollectionSelect:', error);
      }
    });
  }

  /**
   * Initialize DatePicker components
   */
  initializeDatePickers() {
    const datePickerPlaceholders = this.element.querySelectorAll('[data-field-type="datepicker"]');

    datePickerPlaceholders.forEach(placeholder => {
      try {
        const fieldName = placeholder.getAttribute('data-field-name');
        const configData = placeholder.getAttribute('data-field-config');
        const config = JSON.parse(configData);

        // Create DatePicker component
        const datePicker = new DatePicker({
          ...config,
          containerId: null // We'll mount directly
        });

        // Replace placeholder with DatePicker
        datePicker.render(true, placeholder);

        // Store reference for cleanup
        this.customComponents.set(fieldName, datePicker);

        // Listen for changes
        datePicker.on('change', (data) => {
          this.handleFieldChange(fieldName, data.value);
        });

      } catch (error) {
        console.error('Failed to initialize DatePicker:', error);
      }
    });
  }

  /**
   * Initialize DateRangePicker components
   */
  initializeDateRangePickers() {
    const dateRangePlaceholders = this.element.querySelectorAll('[data-field-type="daterange"]');

    dateRangePlaceholders.forEach(placeholder => {
      try {
        const fieldName = placeholder.getAttribute('data-field-name');
        const configData = placeholder.getAttribute('data-field-config');
        const config = JSON.parse(configData);

        // Create DateRangePicker component
        const dateRangePicker = new DateRangePicker({
          ...config,
          containerId: null // We'll mount directly
        });

        // Replace placeholder with DateRangePicker
        dateRangePicker.render(true, placeholder);

        // Store reference for cleanup
        this.customComponents.set(fieldName, dateRangePicker);

        // Listen for changes
        dateRangePicker.on('change', (data) => {
          this.handleFieldChange(fieldName, data.combined);
        });

      } catch (error) {
        console.error('Failed to initialize DateRangePicker:', error);
      }
    });
  }

  /**
   * Handle field changes from custom components
   */
  handleFieldChange(fieldName, value) {
    // Update internal data
    this.data[fieldName] = value;

    // Update model if available
    if (this.model && this.options.allowModelChange) {
      this.model.set(fieldName, value);
    }

    // Emit change event
    this.emit('field:change', { field: fieldName, value });
  }

  /**
   * Refresh form data and rebuild FormBuilder
   * Call this when model or data changes
   */
  refreshForm() {
    this.data = this.prepareFormData();
    this.formBuilder = new FormBuilder({
      ...this.formConfig,
      data: this.data,
      errors: this.errors
    });

    // Re-render if already mounted
    if (this.element) {
      this.render();
    }
  }

  /**
   * Get reason why a field is considered changed (for debugging)
   * @param {*} newValue - New value from form
   * @param {*} originalValue - Original value from model
   * @returns {string} Reason for change
   */
  getChangeReason(newValue, originalValue) {
    if (newValue instanceof File) {
      if (newValue.size === 0 || newValue.name === '' || newValue.name === 'blob') {
        return 'empty file, no change';
      }
      return `file upload: ${newValue.name}, ${newValue.size} bytes`;
    }

    if (typeof newValue === 'string' && newValue.startsWith('data:image/')) {
      return 'base64 image upload';
    }

    if (typeof newValue === 'boolean' || typeof originalValue === 'boolean') {
      const newBool = Boolean(newValue);
      const originalBool = originalValue === null || originalValue === undefined ? false : Boolean(originalValue);
      return `boolean: ${originalBool} → ${newBool}`;
    }

    const newStr = newValue === null || newValue === undefined ? '' : String(newValue).trim();
    const originalStr = originalValue === null || originalValue === undefined ? '' : String(originalValue).trim();

    if (originalValue === null || originalValue === undefined) {
      return 'was null/undefined, now has value';
    }

    if (newValue === null || newValue === undefined) {
      return 'was value, now null/undefined';
    }

    return 'text content changed';
  }

  /**
   * Set form data (updates the data property and rebuilds form)
   * @param {Object} newData - Data to set
   */
  setFormData(newData) {
    this._originalData = { ...this._originalData, ...newData };
    this.refreshForm();
  }



  // ========================================
  // EventDelegate Action Handlers
  // ========================================

  /**
   * Handle form submission
   */
  async onActionSubmitForm(event, element) {
    event.preventDefault();

    const result = await this.handleSubmit();

    if (result.success) {
      // Update internal data
      this.data = result.data;

      // Emit success event
      this.emit('submit', {
        data: result.data,
        result: result.result,
        form: this,
        event
      });

      // Call submit handler if provided (for non-model forms)
      if (!this.model && this.formConfig.onSubmit && typeof this.formConfig.onSubmit === 'function') {
        await this.formConfig.onSubmit(result.data, this);
      }
    } else {
      // Emit error event
      this.emit('error', {
        error: result.error,
        result: result,
        form: this
      });
    }
  }

  /**
   * Handle form reset
   */
  async onActionResetForm(event, _element) {
    const form = this.getFormElement();
    if (form) {
      form.reset();
      this.data = {};
      this.clearAllErrors();

      this.emit('reset', {
        form: this,
        event
      });
    }
  }

  /**
   * Handle image upload click
   */
  async onActionClickImageUpload(event, element) {
    const fieldId = element.getAttribute('data-field-id');
    if (!fieldId) return;

    const fileInput = this.element.querySelector(`#${fieldId}`);
    if (fileInput && !fileInput.disabled) {
      fileInput.click();
    }
  }

  /**
   * Handle image removal
   */
  async onActionRemoveImage(event, element) {
    const fieldName = element.getAttribute('data-field');
    if (!fieldName) return;

    // Clear the field value
    const fileInput = this.element.querySelector(`input[name="${fieldName}"]`);
    if (fileInput) {
      fileInput.value = '';
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Update data and re-render
    delete this.data[fieldName];
    this.emit('change', { field: fieldName, value: null, form: this });
    await this.updateField(fieldName);
  }

  /**
   * Handle button group selection
   */
  async onActionSelectButtonOption(event, element) {
    const fieldName = element.getAttribute('data-field');
    const value = element.getAttribute('data-value');

    if (!fieldName || !value) return;

    // Update form data
    this.data[fieldName] = value;

    // Update UI - remove active class from siblings and add to this button
    const buttonGroup = element.closest('.btn-group');
    if (buttonGroup) {
      const buttons = buttonGroup.querySelectorAll('button');
      buttons.forEach(btn => {
        btn.classList.remove('active');
        btn.classList.add('btn-outline-primary');
        btn.classList.remove('btn-primary');
      });

      element.classList.add('active');
      element.classList.remove('btn-outline-primary');
      element.classList.add('btn-primary');
    }

    // Emit field change event
    this.emit('field:changed', {
      field: fieldName,
      value: value,
      form: this
    });

    this.emit('change', {
      field: fieldName,
      value: value,
      form: this
    });

    // Emit general form change event
    this.emit('form:changed', await this.getFormData());
  }

  /**
   * Handle checklist dropdown filter apply
   */
  async onActionApplyFilter(event, element) {
    const dropdown = element.closest('.dropdown');
    const checkboxes = dropdown?.querySelectorAll('input[type="checkbox"]');

    if (!checkboxes || checkboxes.length === 0) return;

    const fieldName = checkboxes[0].getAttribute('data-field');
    if (!fieldName) return;

    // Collect checked values
    const selectedValues = [];
    checkboxes.forEach(checkbox => {
      if (checkbox.checked) {
        selectedValues.push(checkbox.value);
      }
    });

    // Update form data
    this.data[fieldName] = selectedValues;

    // Close dropdown
    const dropdownBtn = dropdown.querySelector('[data-bs-toggle="dropdown"]');
    if (dropdownBtn && window.bootstrap?.Dropdown) {
      const dropdownInstance = window.bootstrap.Dropdown.getInstance(dropdownBtn);
      dropdownInstance?.hide();
    }

    // Emit field change event
    this.emit('field:changed', {
      field: fieldName,
      value: selectedValues,
      form: this
    });

    this.emit('change', {
      field: fieldName,
      value: selectedValues,
      form: this
    });

    // Emit general form change event
    this.emit('form:changed', await this.getFormData());
  }

  // ========================================
  // EventDelegate Change Handlers
  // ========================================

  /**
   * Handle field validation on change
   */
  async onChangeValidateField(event, element) {
    const fieldName = element.name;
    if (fieldName) {
      this.validateField(fieldName);
      this.emit('change', {
        field: fieldName,
        value: element.value,
        form: this
      });
    }
  }

  /**
   * Handle switch toggle
   */
  async onChangeToggleSwitch(event, element) {
    const fieldName = element.getAttribute('data-field');
    if (fieldName) {
      this.data[fieldName] = element.checked;
      this.emit('switch:toggle', {
        field: fieldName,
        checked: element.checked,
        form: this
      });
      this.emit('change', {
        field: fieldName,
        value: element.checked,
        form: this
      });
    }
  }

  /**
   * Handle image selection
   */
  async onChangeImageSelected(event, element) {
    const fieldName = element.getAttribute('data-field');
    const file = element.files[0];

    if (fieldName && file) {
      // Find the field configuration to check for imageSize
      const fieldConfig = this.findFieldConfig(fieldName);

      // Create temporary preview URL
      const previewUrl = URL.createObjectURL(file);

      // Check if image cropping is required
      if (fieldConfig && fieldConfig.imageSize) {
        try {
          // Check if lightbox extension is available for image cropping
          const ImageCropView = window.MOJO?.plugins?.ImageCropView;

          if (!ImageCropView) {
            console.warn('ImageCropView not available. Load lightbox extension for image cropping.');
            return;
          }

          // Open crop dialog with crop and scale
          const result = await ImageCropView.showDialog(previewUrl, {
            title: `Crop ${fieldConfig.label || fieldName}`,
            cropAndScale: fieldConfig.imageSize,
            size: 'lg'
          });

          if (result.action === 'crop' && result.data) {
            // Convert data URL to blob
            const response = await fetch(result.data);
            const croppedBlob = await response.blob();

            // Create a new File object with the original name
            const croppedFile = new File([croppedBlob], file.name, {
              type: file.type || 'image/png'
            });

            this.data[fieldName] = croppedFile;

            // Update preview with cropped image
            await this.updateImagePreview(fieldName, result.data);

            this.emit('image:selected', {
              field: fieldName,
              file: croppedFile,
              originalFile: file,
              cropped: true,
              cropData: result.cropData,
              form: this
            });

            this.emit('change', {
              field: fieldName,
              value: croppedFile,
              form: this
            });
          } else {
            // User cancelled cropping, don't update the field
            element.value = ''; // Clear the input
          }
        } catch (error) {
          console.error('Error during image cropping:', error);
          // Fall back to normal image handling
          this.data[fieldName] = file;
          await this.updateImagePreview(fieldName, previewUrl);

          this.emit('image:selected', {
            field: fieldName,
            file: file,
            form: this
          });

          this.emit('change', {
            field: fieldName,
            value: file,
            form: this
          });
        }
      } else {
        // Normal image handling without cropping
        this.data[fieldName] = file;
        await this.updateImagePreview(fieldName, previewUrl);

        this.emit('image:selected', {
          field: fieldName,
          file: file,
          form: this
        });
      }
    }
  }

  /**
   * Handle file selection
   */
  async onChangeFileSelected(event, element) {
    const files = Array.from(element.files);
    this.emit('file:selected', {
      field: element.name,
      files: files,
      form: this
    });

    this.emit('change', {
      field: element.name,
      value: files,
      form: this
    });
  }

  /**
   * Handle range value changes
   */
  async onChangeRangeChanged(event, element) {
    const targetId = element.getAttribute('data-target');
    if (targetId) {
      const valueDisplay = this.element.querySelector(`#${targetId}`);
      if (valueDisplay) {
        valueDisplay.textContent = element.value;
      }
    }

    this.emit('range:changed', {
      field: element.name,
      value: element.value,
      form: this
    });

    this.emit('change', {
      field: element.name,
      value: element.value,
      form: this
    });
  }

  /**
   * Handle search/filter operations
   */
  async onChangeFilterSearch(event, element) {
    const query = element.value;
    this.emit('search', {
      query: query,
      field: element.name,
      form: this
    });
  }

  /**
   * Handle select option filtering
   */
  async onChangeFilterSelectOptions(event, element) {
    const query = element.value.toLowerCase();
    const targetId = element.getAttribute('data-target');
    const select = targetId ? this.element.querySelector(`#${targetId}`) : null;

    if (select) {
      const options = select.querySelectorAll('option');
      options.forEach(option => {
        const text = option.textContent.toLowerCase();
        option.style.display = text.includes(query) ? '' : 'none';
      });
    }
  }

  // ========================================
  // FileDropMixin Integration
  // ========================================

  /**
   * Handle file drop on image fields
   */
  async onFileDrop(files, event, _validation) {
    const dropZone = event.target.closest('.image-drop-zone');
    if (!dropZone) return;

    const fieldName = dropZone.getAttribute('data-field');
    if (!fieldName) return;

    const file = files[0];

    // Update file input
    const fileInput = this.element.querySelector(`input[name="${fieldName}"]`);
    if (fileInput) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInput.files = dataTransfer.files;
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Update data and preview
    this.data[fieldName] = file;
    const previewUrl = URL.createObjectURL(file);
    await this.updateImagePreview(fieldName, previewUrl);

    this.emit('image:dropped', {
      field: fieldName,
      file: file,
      form: this
    });
  }

  /**
   * Handle file drop errors
   */
  async onFileDropError(error, event, files) {
    console.error('File drop error:', error.message);
    this.showError(`File upload error: ${error.message}`);

    this.emit('file:error', {
      error: error,
      files: files,
      form: this
    });
  }

  // ========================================
  // Form Management Methods
  // ========================================

  /**
   * Get form element
   */
  getFormElement() {
    return this.element ? this.element.querySelector('form') : null;
  }

  getFormFieldConfig(name) {
    const searchInFields = (fields) => {
      for (const field of fields) {
        if (field.name === name) {
          return field;
        }
        // Search in nested fields recursively
        if (field.fields && Array.isArray(field.fields)) {
          const found = searchInFields(field.fields);
          if (found) return found;
        }
      }
      return null;
    };

    return searchInFields(this.formConfig.fields || []);
  }

  /**
   * Get all form data
   * Returns JSON object for base64 mode, FormData for multipart mode
   */
  async getFormData() {
    const form = this.getFormElement();
    if (!form) return this.fileHandling === 'multipart' ? new FormData() : {};

    if (this.fileHandling === 'multipart') {
      // Return FormData object with files as File objects
      const formData = new FormData(form);

      // Add files from this.data to FormData
      for (const [key, value] of Object.entries(this.data)) {
        if (value instanceof File) {
          formData.set(key, value);
        } else if (value instanceof FileList) {
          for (let i = 0; i < value.length; i++) {
            formData.append(`${key}[${i}]`, value[i]);
          }
        }
      }

      return formData;
    } else {
      // Return JSON object with files converted to base64
      const formData = new FormData(form);
      const data = {};

      // Handle regular form fields
      for (const [key, value] of formData.entries()) {
        if (data[key]) {
          // Handle multiple values
          if (!Array.isArray(data[key])) {
            data[key] = [data[key]];
          }
          data[key].push(value);
        } else {
          data[key] = value;
        }
      }

      // Handle checkboxes and switches to ensure correct boolean values
      const checkboxes = form.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach(checkbox => {
        data[checkbox.name] = checkbox.checked;
      });

      // Handle JSON fields
      const jsonFields = form.querySelectorAll('[data-field-type="json"]');
      jsonFields.forEach(textarea => {
          try {
              data[textarea.name] = JSON.parse(textarea.value);
          } catch (e) {
              console.warn(`Invalid JSON in field ${textarea.name}:`, textarea.value);
              data[textarea.name] = textarea.value; // Keep as string if invalid
          }
      });

      // Convert files to base64 and add to data
      for (const [key, value] of Object.entries(this.data)) {
        if (value instanceof File) {
          try {
            data[key] = await this.fileToBase64(value);
          } catch (error) {
            console.error(`Failed to convert file ${key} to base64:`, error);
            data[key] = null;
          }
        } else if (value instanceof FileList) {
          const base64Files = [];
          for (let i = 0; i < value.length; i++) {
            try {
              base64Files.push(await this.fileToBase64(value[i]));
            } catch (error) {
              console.error(`Failed to convert file ${key}[${i}] to base64:`, error);
              base64Files.push(null);
            }
          }
          data[key] = base64Files;
        }
      }

      return data;
    }
  }

  _onModelChange() {
    if (this.isMounted()) {
        this.refreshForm();
    }
  }

  /**
   * Set defaults (updates defaults and rebuilds form)
   * @param {Object} newDefaults - Default values to set
   */
  setDefaults(newDefaults) {
    this.defaults = { ...this.defaults, ...newDefaults };
    this.refreshForm();
  }

  /**
   * Handle form submission with validation, saving, and error handling
   * @returns {Promise<Object>} Submission result {success: boolean, data: Object, result?: Object, error?: string}
   */
  async handleSubmit() {
    try {
      // Get form data (async for base64 conversion)
      const formData = await this.getFormData();

      // Validate if needed
      if (this.formConfig.validateOnSubmit !== false) {
        const isValid = this.validate();
        if (!isValid) {
          this.focusFirstError();
          return {
            success: false,
            data: formData,
            error: 'Form validation failed'
          };
        }
      }

      // If there's a model, save via model
      if (this.model && typeof this.model.save === 'function') {
        const result = await this.saveModel(formData);

        // Check if save was successful
        if (result && result.success !== false) {
          return {
            success: true,
            data: formData,
            result: result
          };
        } else {
          const errorMsg = result?.message || result?.error || 'Save failed. Please try again.';
          return {
            success: false,
            data: formData,
            result: result,
            error: errorMsg
          };
        }
      } else {
        // No model - just return form data
        return formData;
      }

    } catch (error) {
      console.error('Form submission error:', error);

      return {
        success: false,
        error: error.message || 'An error occurred while submitting the form'
      };
    }
  }

  /**
   * Save form data via model
   * Uses auto-detection for multipart vs JSON based on form data type
   * Only saves changed data for efficiency
   * @returns {Promise<Object>} Save result from model
   */
  async saveModel(formData = null) {
    if (!this.model || typeof this.model.save !== 'function') {
      throw new Error('No model available for saving');
    }

    // Get form data (auto-detects FormData vs Object)
    if (!formData) formData = await this.getFormData();

    // Check for changes before saving
    const changes = this.getChangedData(formData);

    if (!changes || Object.keys(changes).length === 0) {
      console.log('No changes detected, skipping save');
      return {
        success: true,
        message: 'No changes to save',
        data: formData
      };
    }

    console.log('Saving changed data via model:', changes);
    console.log('Data type:', changes instanceof FormData ? 'FormData (multipart)' : 'Object (JSON/base64)');

    try {
      // Model.save with only changed data
      const result = await this.model.save(changes);
      console.log('Model save result:', result);

      return result;
    } catch (error) {
      console.error('Model save error:', error);
      throw error;
    }
  }

  /**
   * Compare current form data with original model data to detect changes
   * @param {Object|FormData} currentData - Current form data
   * @returns {Object|FormData|null} Changed data only, or null if no changes
   */
  getChangedData(currentData) {
    if (!this.model) return currentData;

    // Get original data from model
    const originalData = this.getOriginalModelData();
    console.log('=== Change Detection ===');
    console.log('Original model data:', originalData);
    console.log('Current form data:', currentData instanceof FormData ? '[FormData object]' : currentData);

    let changes;
    if (currentData instanceof FormData) {
      // Handle FormData comparison
      console.log('Comparing FormData...');
      changes = this.getChangedFormData(currentData, originalData);
    } else {
      // Handle Object comparison
      console.log('Comparing Object data...');
      changes = this.getChangedObjectData(currentData, originalData);
    }

    console.log('Changes detected:', changes instanceof FormData ? '[FormData with changes]' : changes);
    console.log('=== End Change Detection ===');
    return changes;
  }

  /**
   * Get original data from model for comparison
   * @returns {Object} Original model data
   */
  getOriginalModelData() {
    if (this.model.attributes) {
      return this.model.attributes;
    } else if (typeof this.model.toJSON === 'function') {
      return this.model.toJSON();
    } else {
      return {};
    }
  }

  /**
   * Compare FormData with original data
   * @param {FormData} currentData - Current form data
   * @param {Object} originalData - Original model data
   * @returns {FormData|null} FormData with only changed fields, or null if no changes
   */
  getChangedFormData(currentData, originalData) {
    const changedData = new FormData();
    let hasChanges = false;

    // Compare each form field
    for (const [key, value] of currentData.entries()) {
      if (value instanceof File) {
        // Check if file has actual content
        if (value.size === 0 || value.name === '' || value.name === 'blob') {
          console.log(`  - ${key}: Empty file field (no change)`);
        } else {
          console.log(`  - ${key}: File upload detected (${value.name}, ${value.size} bytes)`);
          changedData.set(key, value);
          hasChanges = true;
        }
      } else {
        // Compare text values
        const originalValue = originalData[key];
        if (value !== originalValue && value !== String(originalValue)) {
          console.log(`  - ${key}: "${originalValue}" → "${value}"`);
          changedData.set(key, value);
          hasChanges = true;
        } else {
          console.log(`  - ${key}: unchanged ("${value}")`);
        }
      }
    }

    return hasChanges ? changedData : null;
  }

  /**
   * Compare Object data with original data
   * @param {Object} currentData - Current form data
   * @param {Object} originalData - Original model data
   * @returns {Object|null} Object with only changed fields, or null if no changes
   */
  getChangedObjectData(currentData, originalData) {
    const changedData = {};
    let hasChanges = false;
    const allKeys = new Set([...Object.keys(originalData), ...Object.keys(currentData)]);

    const resolveDotNotation = (obj, path) => path.split('.').reduce((o, i) => (o && typeof o === 'object' ? o[i] : undefined), obj);

    for (const key of allKeys) {
      const fieldConfig = this.findFieldConfig(key);
      // Only process fields that are actually defined in the form's schema.
      if (!fieldConfig) {
        continue;
      }

      const newValue = currentData[key];
      const originalValue = resolveDotNotation(originalData, key);

      const fieldType = fieldConfig.type || 'text';

      if (this.valuesAreDifferent(newValue, originalValue, fieldType, fieldConfig)) {
        changedData[key] = newValue;
        hasChanges = true;
      }
    }

    return hasChanges ? changedData : null;
  }

  /**
   * Compare two values to determine if they're different
   * @param {*} newValue - New value from form
   * @param {*} originalValue - Original value from model
   * @param {string} fieldType - The type of the field from the form config
   * @param {object} fieldConfig - The configuration of the field from the form config
   * @returns {boolean} True if values are different
   */
  valuesAreDifferent(newValue, originalValue, fieldType = 'text', fieldConfig = {}) {
    // Handle File objects (new uploads vs existing)
    if (newValue instanceof File) {
      return newValue.size > 0 && newValue.name !== '' && newValue.name !== 'blob';
    }

    // Handle base64 images (always considered changed if present)
    if (typeof newValue === 'string' && newValue.startsWith('data:image/')) {
      return true;
    }

    if (fieldType === "collection") {
        // this is the collection select, the field will typically be an ID or "0" for null;
        if (typeof originalValue === 'object' && originalValue !== null && originalValue !== undefined && typeof newValue === 'string') {
            // we really need to field config here if fieldKey is not id
            if (newValue === '0') {
                return originalValue !== null;
            }
            const valueField = fieldConfig.valueField || 'id';
            // we compare (str to int)
            if (originalValue[valueField] == newValue) {
                return false;
            }
        }
    }

    // For switches and checkboxes, perform a strict boolean comparison
    if (fieldType === 'switch' || fieldType === 'checkbox') {
      const newBool = !!newValue;
      const originalBool = !!originalValue;
      return newBool !== originalBool;
    }

    // For all other fields, compare their string representations
    const newStr = newValue === null || newValue === undefined ? '' : String(newValue).trim();
    const originalStr = originalValue === null || originalValue === undefined ? '' : String(originalValue).trim();

    return newStr !== originalStr;
  }

  /**
   * Validate entire form
   */
  validate() {
    const form = this.getFormElement();
    if (!form) return false;

    const isValid = form.checkValidity();

    if (!isValid) {
      form.classList.add('was-validated');
    }

    return isValid;
  }

  /**
   * Validate single field
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
      delete this.errors[fieldName];
    } else {
      field.classList.remove('is-valid');
      field.classList.add('is-invalid');
      this.errors[fieldName] = field.validationMessage;
    }

    return isValid;
  }

  /**
   * Focus first error field
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
   * Clear all errors
   */
  clearAllErrors() {
    const form = this.getFormElement();
    if (!form) return;

    this.errors = {};
    form.classList.remove('was-validated');

    const invalidElements = form.querySelectorAll('.is-invalid');
    invalidElements.forEach(el => el.classList.remove('is-invalid'));

    const validElements = form.querySelectorAll('.is-valid');
    validElements.forEach(el => el.classList.remove('is-valid'));
  }

  /**
   * Set loading state
   */
  setLoading(loading) {
    this.loading = loading;

    const form = this.getFormElement();
    if (!form) return;

    const fields = form.querySelectorAll('input, select, textarea, button');
    const submitBtn = form.querySelector('button[type="submit"]');

    if (loading) {
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
        const submitLabel = this.formConfig.options?.submitButton || 'Submit';
        submitBtn.innerHTML = typeof submitLabel === 'string' ? submitLabel : 'Submit';
      }
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    console.error('Form error:', message);

    this.emit('error', { message, form: this });

    // Show alert in form
    if (this.element) {
      // Remove existing alerts
      const existingAlerts = this.element.querySelectorAll('.alert');
      existingAlerts.forEach(alert => alert.remove());

      const alertDiv = document.createElement('div');
      alertDiv.className = 'alert alert-danger alert-dismissible fade show';
      alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      `;

      this.element.insertBefore(alertDiv, this.element.firstChild);

      // Auto-remove after 5 seconds
      setTimeout(() => {
        if (alertDiv.parentNode) {
          alertDiv.remove();
        }
      }, 5000);
    }
  }

  /**
   * Update a specific field
   */
  async updateField(_fieldName) {
    // Re-create FormBuilder with updated data
    this.formBuilder = new FormBuilder({
      ...this.formConfig,
      data: this.data,
      errors: this.errors
    });

    // Re-render the form
    await this.render();
  }

  /**
   * Update image preview
   */
  async updateImagePreview(fieldName, imageUrl) {
    const dropZone = this.element.querySelector(`[data-field="${fieldName}"].image-drop-zone`);

    if (!dropZone) {
      console.warn(`Could not find drop zone for field: ${fieldName}`);
      return;
    }

    // Check if there's already a preview image
    let preview = dropZone.querySelector('img');
    const placeholder = dropZone.querySelector('.bi-image')?.parentElement;
    const fieldId = dropZone.getAttribute('data-field-id');

    if (imageUrl) {
      if (preview) {
        // Update existing preview
        preview.src = imageUrl;
      } else {
        // Create new preview image
        const previewId = `${fieldId}_preview`;
        dropZone.innerHTML = `
          <img id="${previewId}"
               src="${imageUrl}"
               alt="Preview"
               class="img-thumbnail w-100 h-100"
               style="object-fit: cover;">
          <button type="button"
                  class="btn btn-sm btn-danger position-absolute top-0 end-0 m-1"
                  data-action="remove-image"
                  data-field-id="${fieldId}"
                  data-field="${fieldName}"
                  style="opacity: 0.8;">
            <i class="bi bi-x"></i>
          </button>
        `;
      }

      // Hide placeholder if it exists
      if (placeholder) {
        placeholder.style.display = 'none';
      }
    }
  }

  /**
   * Find field configuration by name
   * @param {string} fieldName - Field name to find
   * @returns {Object|null} Field configuration
   */
  findFieldConfig(fieldName) {
    const searchInFields = (fields) => {
      for (const field of fields) {
        if (field.name === fieldName) {
          return field;
        }
        // Search in group fields
        if (field.type === 'group' && field.fields) {
          const found = searchInFields(field.fields);
          if (found) return found;
        }
      }
      return null;
    };

    return searchInFields(this.formConfig.fields || []);
  }

  /**
   * Convert File object to base64 string
   * @param {File} file - File to convert
   * @returns {Promise<string>} Base64 encoded string
   */
  async fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Check if form data contains any File objects
   * @param {Object|FormData} data - Form data to check
   * @returns {boolean} True if contains files
   */
  hasFiles(data) {
    if (data instanceof FormData) {
      for (const [key, value] of data.entries()) {
        if (value instanceof File) {
          return true;
        }
      }
      return false;
    } else {
      for (const value of Object.values(data)) {
        if (value instanceof File) {
          return true;
        }
        if (Array.isArray(value) && value.some(v => v instanceof File)) {
          return true;
        }
      }
      return false;
    }
  }

  /**
   * Reset form
   */
  reset() {
    const form = this.getFormElement();
    if (form) {
      form.reset();
    }

    this.data = {};
    this.errors = {};
    this.clearAllErrors();

    this.emit('reset', { form: this });
  }

  /**
   * Update form configuration
   */
  async updateConfig(newConfig) {
    this.formConfig = { ...this.formConfig, ...newConfig };
    this.formBuilder = new FormBuilder({
      ...this.formConfig,
      data: this.data,
      errors: this.errors
    });

    await this.render();
  }

  /**
   * Clean up when destroying
   */
  async onBeforeDestroy() {
    // Clean up custom components
    const destroyPromises = [];
    for (const component of this.customComponents.values()) {
      if (component.destroy) {
        destroyPromises.push(component.destroy());
      }
    }
    await Promise.all(destroyPromises);
    this.customComponents.clear();

    // Clean up temporary URLs
    Object.values(this.data).forEach(value => {
      if (typeof value === 'string' && value.startsWith('blob:')) {
        URL.revokeObjectURL(value);
      }
    });

    await super.onBeforeDestroy();
  }
  /**
   * Initialize password fields: strength meter, caps lock warning, and hold-to-reveal
   */
  initializePasswordFields() {
    if (!this.element) return;

    // Find password inputs (either explicit data-field-type="password" or native type="password")
    const inputs = this.element.querySelectorAll('input[data-field-type="password"], input[type="password"]');

    inputs.forEach((input) => {
      // Initialize strength UI once
      this.updatePasswordStrengthUI(input);

      // Wire strength meter updates
      const onInput = (e) => {
        this.updatePasswordStrengthUI(e.target);
      };
      input.addEventListener('input', onInput);

      // Caps lock warning on key events
      const capsHandler = (e) => {
        if (typeof e.getModifierState === 'function') {
          const caps = e.getModifierState('CapsLock');
          this.updateCapsLockWarning(input, !!caps);
        }
      };
      input.addEventListener('keydown', capsHandler);
      input.addEventListener('keyup', capsHandler);

      // Initialize caps lock hidden state
      this.updateCapsLockWarning(input, false);
    });

    // Simple click toggle is handled by onActionTogglePassword; no extra listeners needed.
  }

  /**
   * Toggle password visibility on click (persistent toggle)
   * Ignored if currently in press-and-hold mode.
   */
  async onActionTogglePassword(event, element) {
    event.preventDefault();

    const targetId = element.getAttribute('data-target');
    let input = null;
    if (targetId) {
      input = this.element.querySelector('#' + targetId);
    }
    if (!input) {
      const group = element.closest('.input-group');
      if (group) {
        input = group.querySelector('input[type="password"], input[data-field-type="password"], input[type="text"]');
      }
    }
    if (!input) return;

    const isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';

    // Update button state and icon
    element.setAttribute('aria-pressed', isHidden ? 'true' : 'false');
    element.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
    const icon = element.querySelector('i');
    if (icon) {
      icon.classList.toggle('bi-eye', !isHidden);
      icon.classList.toggle('bi-eye-slash', isHidden);
    }

    // Keep focus on input and move caret to end
    input.focus();
    try {
      const len = input.value?.length ?? 0;
      input.setSelectionRange(len, len);
    } catch (_e) {
      // Not all input types support setSelectionRange; safe to ignore
    }
  }

  /**
   * Compute a simple password strength score and associated UI metadata
   */
  computePasswordStrength(password = '') {
    const len = password.length;
    let score = 0;

    // Length-based scoring
    if (len >= 6) score++;
    if (len >= 8) score++;
    if (len >= 12) score++;

    // Character variety
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasDigit = /\d/.test(password);
    const hasSymbol = /[^A-Za-z0-9]/.test(password);

    const variety = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;
    if (variety >= 2) score++;
    if (variety >= 3) score++;

    // Cap score between 0-4
    score = Math.max(0, Math.min(4, score));

    // Map to percent/label/class
    const map = [
      { percent: 0, label: 'Too short', barClass: 'bg-secondary' },
      { percent: 25, label: 'Weak', barClass: 'bg-danger' },
      { percent: 50, label: 'Fair', barClass: 'bg-warning' },
      { percent: 75, label: 'Good', barClass: 'bg-info' },
      { percent: 100, label: 'Strong', barClass: 'bg-success' }
    ];

    return map[score];
  }

  /**
   * Update strength meter UI if present for a given password input
   */
  updatePasswordStrengthUI(input) {
    if (!input || !input.id) return;

    const bar = this.element.querySelector(`#${input.id}_strength_bar`);
    const text = this.element.querySelector(`#${input.id}_strength_text`);
    if (!bar && !text) return;

    const { percent, label, barClass } = this.computePasswordStrength(input.value || '');

    if (bar) {
      // Reset to base class and apply strength color
      bar.className = `progress-bar ${barClass}`;
      bar.style.width = `${percent}%`;
      bar.setAttribute('aria-valuenow', String(percent));
    }
    if (text) {
      text.textContent = label;
    }
  }

  /**
   * Show/Hide a caps lock warning element if present for the given input
   */
  updateCapsLockWarning(input, capsOn) {
    if (!input || !input.id) return;
    const warn = this.element.querySelector(`#${input.id}_caps_warning`);
    if (!warn) return;

    if (capsOn) {
      warn.classList.remove('d-none');
    } else {
      warn.classList.add('d-none');
    }
  }
}

// Export for use in MOJO framework
export default FormView;
export { FormView };
