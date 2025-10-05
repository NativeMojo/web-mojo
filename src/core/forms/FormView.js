/**
 * FormView - Complete form component for MOJO framework
 * Uses FormBuilder for HTML generation and EventDelegate for event handling
 * Handles form lifecycle, validation, data management, and component integration
 */

import View from '@core/View.js';
import FormBuilder from './FormBuilder.js';
import applyFileDropMixin from '@core/mixins/FileDropMixin.js';
import MOJOUtils from '@core/utils/MOJOUtils.js';

import { TagInput, CollectionSelect, CollectionMultiSelect, DatePicker, DateRangePicker } from './inputs/index.js';

class FormView extends View {
  constructor(options = {}) {
    const {
      formConfig = options.config,
      fields,
      model = null,
      data = {},
      defaults = null,
      errors = {},
      fileHandling = 'base64', // 'base64' | 'multipart'
      autosaveModelField = false, // Auto-save model on field changes
      ...viewOptions
    } = options;

    super({
      tagName: 'div',
      className: 'form-view',
      ...viewOptions
    });

    // Store data sources
    this.model = model;
    this.defaults = defaults || data;
    this._originalData = data;
    this.errors = errors;
    this.loading = false;
    this.fileHandling = fileHandling;
    this.autosaveModelField = autosaveModelField;
    this.customComponents = new Map();
    this.fieldStatusManagers = new Map(); // Track field status managers
    this.saveTimeouts = new Map(); // Debouncing timeouts for autosave
    this.isSaving = false; // Prevent save loops

    // Prepare combined data for FormBuilder
    this.data = this.prepareFormData();

    // Form configuration
    this.formConfig = formConfig || { fields: fields || [] };
    this.formBuilder = new FormBuilder({
      ...this.getFormConfig(),
      data: this.data, // Pass data so field.value defaults work
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
        const modelData = this.model.toJSON();
        Object.assign(formData, modelData);
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

  getFormConfig() {
    const config = { ...this.formConfig };
    const app = this.getApp();

    config.fields = this.formConfig.fields.filter(field => {
      if (!field.permissions) return true;
      return app.activeUser?.hasPermission(field.permissions);
    });

    return config;
  }

  /**
   * Use FormBuilder for template generation
   */
  async renderTemplate() {
    return this.formBuilder.buildFormHTML();
  }

  /**
   * Called after form is rendered to populate values and initialize
   */
  async onAfterRender() {
    await super.onAfterRender();

    this.data = this.prepareFormData();
    // Populate form with current data
    this.populateFormValues();

    // Initialize form components
    this.initializeFormComponents();

    // Add generic change handlers for all form inputs
    this.initializeChangeHandlers();

    // Prevent form submission on Enter key
    const form = this.getFormElement();
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        return false;
      });
    }
  }

  /**
   * Populate all form fields with current data values
   */
  populateFormValues() {
    if (!this.element || !this.formConfig?.fields) return;

    // Disable autosave during form population
    this._isPopulating = true;

    try {
      this.formConfig.fields.forEach(field => {
        if (field.type === 'group' && field.fields) {
          // Handle group fields
          field.fields.forEach(groupField => {
            this.populateFieldValue(groupField);
          });
        } else {
          this.populateFieldValue(field);
        }
      });
    } finally {
      // Always re-enable autosave
      this._isPopulating = false;
    }
  }

  /**
   * Populate a single field with its value from data
   */
  populateFieldValue(fieldConfig) {
    if (!fieldConfig.name || !this.element) return;

    const fieldElement = this.element.querySelector(`[name="${fieldConfig.name}"]`);
    if (!fieldElement) return;

    // Use MOJOUtils to handle nested properties like 'permissions.manage_users'
    const value = MOJOUtils.getContextData(this.data, fieldConfig.name);

    // Only set value if we have actual data - don't overwrite field defaults with undefined
    if (value !== undefined && value !== null) {
      this.setFieldValue(fieldElement, fieldConfig, value);
    }
  }

  /**
   * Initialize form components after rendering
   */
  initializeFormComponents() {
    this.initializeImageFields();
    this.initializeCustomComponents();
    this.initializeTagInputs();
    this.initializeCollectionSelects();
    this.initializeCollectionMultiSelects();
    this.initializeDatePickers();
    this.initializeDateRangePickers();
    this.initializePasswordFields();
  }



  /**
   * Initialize image fields with FileDropMixin
   */
  initializeImageFields() {
    const imageFields = this.element.querySelectorAll('.image-drop-zone.droppable');

    if (imageFields.length > 0) {
      // Enable file drop functionality (mixin already applied at module level)
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
    this.initializeCollectionMultiSelects();
    this.initializeDatePickers();
    this.initializeDateRangePickers();

    // Find containers for other custom components
    const componentContainers = this.element.querySelectorAll('[data-component]');

    componentContainers.forEach(container => {
      const componentType = container.getAttribute('data-component');
      const fieldName = container.getAttribute('data-field');

      if (componentType && fieldName) {

      }
    });
  }

  /**
   * Initialize generic change handlers for all form inputs
   */
  initializeChangeHandlers() {
    if (!this.element) return;

    // Add change listeners to all form inputs that don't already have specific handlers
    const inputs = this.element.querySelectorAll('input:not([data-action]), select:not([data-action]), textarea:not([data-action])');

    console.log('FormView: initializeChangeHandlers - found', inputs.length, 'inputs');

    inputs.forEach(input => {
      console.log('FormView: Processing input:', input.type, input.name, input.getAttribute('data-change-action'));
      // Skip inputs that already have specific handlers or are handled by custom components
      if (input.hasAttribute('data-component') || input.classList.contains('form-check-input')) {
        return;
      }

      // Add change event listener
      input.addEventListener('change', (event) => {
        // Skip autosave during form population
        if (this._isPopulating) return;

        const fieldName = input.name;
        if (fieldName) {
          let value = input.value;

          // Handle different input types
          if (input.type === 'checkbox') {
            value = input.checked;
          } else if (input.type === 'radio') {
            // Only process if this radio is checked
            if (!input.checked) return;
          } else if (input.multiple && input.selectedOptions) {
            // Handle multi-select
            value = Array.from(input.selectedOptions).map(opt => opt.value);
          } else if (input.type === 'file') {
            // Handle file inputs (including images)
            const changeAction = input.getAttribute('data-change-action');
            if (changeAction === 'image-selected') {
              this.onChangeImageSelected(event, input);
              return; // Don't call handleFieldChange for images
            } else if (changeAction === 'file-selected') {
              this.onChangeFileSelected(event, input);
              return; // Don't call handleFieldChange for files
            }
          }

          this.handleFieldChange(fieldName, value);
        }
      });

      // Also add input event for text inputs for more responsive autosave
      if (input.type === 'text' || input.type === 'email' || input.type === 'url' || input.tagName === 'TEXTAREA') {
        input.addEventListener('input', (event) => {
          // Skip autosave during form population
          if (this._isPopulating) return;

          const fieldName = input.name;
          if (fieldName) {
            this.handleFieldChange(fieldName, input.value);
          }
        });
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
        // TagInput initialization failed
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

        let value = MOJOUtils.getContextData(this.data, fieldName);
        if (value) {
            collectionSelect.setFormValue(value);
        }

        // Replace placeholder with CollectionSelect
        collectionSelect.render(true, placeholder);

        // Store reference for cleanup
        this.customComponents.set(fieldName, collectionSelect);

        // Listen for changes
        collectionSelect.on('change', (data) => {
          this.handleFieldChange(fieldName, data.value);
        });

      } catch (error) {
        // CollectionSelect initialization failed
      }
    });
  }

  /**
   * Initialize CollectionMultiSelect components
   */
  initializeCollectionMultiSelects() {
    const collectionMultiSelectPlaceholders = this.element.querySelectorAll('[data-field-type="collectionmultiselect"]');

    collectionMultiSelectPlaceholders.forEach(placeholder => {
      try {
        const fieldName = placeholder.getAttribute('data-field-name');
        const configData = placeholder.getAttribute('data-field-config');
        const config = JSON.parse(configData);

        // Get Collection class from field config
        const fieldConfig = this.getFormFieldConfig(fieldName);
        if (!fieldConfig || !fieldConfig.Collection) {
          return;
        }

        // Create collection instance
        const collection = new fieldConfig.Collection();
        if (fieldConfig.collectionParams) {
          collection.params = {...collection.params, ...fieldConfig.collectionParams};
        }

        // Create CollectionMultiSelect component
        const collectionMultiSelect = new CollectionMultiSelect({
          ...config,
          collection,
          containerId: null // We'll mount directly
        });

        let value = MOJOUtils.getContextData(this.data, fieldName);
        if (value) {
          collectionMultiSelect.setFormValue(value);
        }

        // Replace placeholder with CollectionMultiSelect
        collectionMultiSelect.render(true, placeholder);

        // Store reference for cleanup
        this.customComponents.set(fieldName, collectionMultiSelect);

        // Listen for changes
        collectionMultiSelect.on('change', (data) => {
          this.handleFieldChange(fieldName, data.value);
        });

      } catch (error) {
        console.error('CollectionMultiSelect initialization failed:', error);
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
        // DatePicker initialization failed
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
        // DateRangePicker initialization failed
      }
    });
  }

  /**
   * Handle field changes from custom components
   */
  handleFieldChange(fieldName, value) {
    // Update internal data
    this.data[fieldName] = value;

    // Handle autosave or regular model update
    if (this.autosaveModelField && this.model) {
      // Auto-save individual field to model
      this.handleFieldSave(fieldName, value);
    } else if (this.model && this.options.allowModelChange) {
      // Regular model update without save
      this._isFormDrivenChange = true;
      this.model.set(fieldName, value);
    }

    // Emit change event
    this.emit('field:change', { field: fieldName, value });
  }

  /**
   * Handle saving individual field changes to the model with debouncing
   * @param {string} fieldName - Name of the field being saved
   * @param {*} value - New value to save
   */
  async handleFieldSave(fieldName, value) {
    if (!this.model || this.isSaving) return;

    // Clear any existing timeout for this field
    if (this.saveTimeouts.has(fieldName)) {
      clearTimeout(this.saveTimeouts.get(fieldName));
    }

    const statusManager = this.getFieldStatusManager(fieldName);
    statusManager.showStatus('saving');

    // Debounce the save - wait 300ms before actually saving
    const timeoutId = setTimeout(async () => {
      try {
        this.isSaving = true;
        this.saveTimeouts.delete(fieldName);

        // Mark as form-driven change to prevent sync back
        this._isFormDrivenChange = true;

        // Save to model (this will trigger API call if model has save method)
        if (typeof this.model.save === 'function') {
          await this.model.save({ [fieldName]: value });
        } else {
          // Just set on model if no save method
          this.model.set(fieldName, value);
        }

        // Show success (auto-hides after 2.5s)
        statusManager.showStatus('saved');

      } catch (error) {
        // Field save error
        // Show error (auto-hides after 6s)
        statusManager.showStatus('error', { message: error.message });
      } finally {
        this.isSaving = false;
      }
    }, 300);

    this.saveTimeouts.set(fieldName, timeoutId);
  }

  /**
   * Get or create a field status manager for a specific field
   * @param {string} fieldName - Name of the field
   * @returns {FieldStatusManager} Status manager instance
   */
  getFieldStatusManager(fieldName) {
    if (!this.fieldStatusManagers.has(fieldName)) {
      const fieldElement = this.element.querySelector(`[name="${fieldName}"]`);
      if (fieldElement) {
        const statusManager = new FieldStatusManager(fieldElement);
        this.fieldStatusManagers.set(fieldName, statusManager);
      }
    }
    return this.fieldStatusManagers.get(fieldName);
  }

  /**
   * Refresh form data and repopulate values
   * Call this when model or data changes externally
   */
  refreshForm() {
    this.data = this.prepareFormData();

    // If mounted, repopulate form values
    if (this.element) {
      this.populateFormValues();
    }
  }

  /**
   * Get reason why a field is considered changed
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
    console.log('FormView: onActionClickImageUpload called');
    console.log('FormView: element:', element);

    const fieldId = element.getAttribute('data-field-id');
    console.log('FormView: fieldId:', fieldId);

    if (!fieldId) {
      console.error('FormView: No fieldId attribute found');
      return;
    }

    const fileInput = this.element.querySelector(`#${fieldId}`);
    console.log('FormView: fileInput:', fileInput);

    if (fileInput && !fileInput.disabled) {
      fileInput.click();
      console.log('FormView: fileInput.click() called');
    } else if (!fileInput) {
      console.error('FormView: fileInput not found for fieldId:', fieldId);
    } else {
      console.log('FormView: fileInput is disabled');
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
   * Handle clear color action
   */
  async onActionClearColor(event, element) {
    const fieldName = element.getAttribute('data-field');
    if (!fieldName) return;

    // Clear the color input value
    const colorInput = this.element.querySelector(`input[name="${fieldName}"]`);
    if (colorInput) {
      colorInput.value = '';

      // Trigger field change handling (for autosave if enabled)
      this.handleFieldChange(fieldName, '');

      // Update the field to hide the clear button
      await this.updateField(fieldName);
    }
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
      const value = element.value;

      // Use handleFieldChange for consistent processing
      this.handleFieldChange(fieldName, value);

      // Validate the field
      this.validateField(fieldName);
    }
  }

  /**
   * Handle switch toggle
   */
  async onChangeToggleSwitch(event, element) {
    const fieldName = element.getAttribute('data-field');
    if (fieldName) {
      const value = element.checked;

      // Use handleFieldChange for consistent processing
      this.handleFieldChange(fieldName, value);

      // Emit specific switch events for backward compatibility
      this.emit('switch:toggle', {
        field: fieldName,
        checked: value,
        form: this
      });
    }
  }

  /**
   * Handle image selection
   */
  async onChangeImageSelected(event, element) {
    console.log('FormView: onChangeImageSelected called');
    console.log('FormView: element:', element);
    console.log('FormView: element.files:', element.files);

    const fieldName = element.getAttribute('data-field');
    const file = element.files[0];

    console.log('FormView: fieldName:', fieldName);
    console.log('FormView: file:', file);

    if (fieldName && file) {
      console.log('FormView: fieldName and file exist, processing...');

      // Find the field configuration to check for imageSize
      const fieldConfig = this.findFieldConfig(fieldName);
      console.log('FormView: fieldConfig:', fieldConfig);

      // Create temporary preview URL
      const previewUrl = URL.createObjectURL(file);
      console.log('FormView: previewUrl created:', previewUrl);

      // Check if image cropping is required
      if (fieldConfig && fieldConfig.imageSize) {
        console.log('FormView: Image cropping is required, imageSize:', fieldConfig.imageSize);
        try {
          // Check if lightbox extension is available for image cropping
          const ImageCropView = window.MOJO?.plugins?.ImageCropView;
          console.log('FormView: ImageCropView available?', !!ImageCropView);

          if (!ImageCropView) {
            // ImageCropView not available - fall back to normal handling without cropping
            console.log('FormView: ImageCropView not available, falling back to normal handling');
            this.data[fieldName] = file;
            await this.updateImagePreview(fieldName, previewUrl);
            this.emit('image:selected', { field: fieldName, file: file, form: this });
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
          // Error during image cropping
          console.error('FormView: Error during image cropping:', error);
          // Fall back to normal image handling
          console.log('FormView: Falling back to normal image handling after error');
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
        console.log('FormView: Normal image handling (no cropping)');
        this.data[fieldName] = file;
        console.log('FormView: File stored in this.data[' + fieldName + ']');

        await this.updateImagePreview(fieldName, previewUrl);
        console.log('FormView: updateImagePreview completed');

        this.emit('image:selected', {
          field: fieldName,
          file: file,
          form: this
        });
        console.log('FormView: image:selected event emitted');
      }
    } else {
      console.log('FormView: Missing fieldName or file - not processing');
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
    const fieldName = element.name;
    const value = element.value;

    // Update display target if specified
    const targetId = element.getAttribute('data-target');
    if (targetId) {
      const valueDisplay = this.element.querySelector(`#${targetId}`);
      if (valueDisplay) {
        valueDisplay.textContent = value;
      }
    }

    // Use handleFieldChange for consistent processing
    if (fieldName) {
      this.handleFieldChange(fieldName, value);
    }

    // Emit specific range event for backward compatibility
    this.emit('range:changed', {
      field: fieldName,
      value: value,
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
    // File drop error
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

      // Convert number fields to actual numbers
      const numberInputs = form.querySelectorAll('input[type="number"]');
      numberInputs.forEach(input => {
        if (input.name && data[input.name] !== undefined && data[input.name] !== '') {
          const num = Number(data[input.name]);
          if (!isNaN(num)) {
            data[input.name] = num;
          }
        }
      });

      // Convert select fields with numeric values based on field config
      this.formConfig.fields?.forEach(field => {
        if (field.type === 'select' && field.name && data[field.name] !== undefined) {
          const fieldConfig = this.getFormFieldConfig(field.name);
          // Check if all option values are numeric
          if (fieldConfig?.options && Array.isArray(fieldConfig.options)) {
            const allNumeric = fieldConfig.options.every(opt => {
              const val = typeof opt === 'object' ? opt.value : opt;
              return val === '' || !isNaN(Number(val));
            });

            if (allNumeric && data[field.name] !== '') {
              const num = Number(data[field.name]);
              if (!isNaN(num)) {
                data[field.name] = num;
              }
            }
          }
        }
      });

      // Handle JSON fields
      const jsonFields = form.querySelectorAll('[data-field-type="json"]');
      jsonFields.forEach(textarea => {
          try {
              data[textarea.name] = JSON.parse(textarea.value);
          } catch (e) {
              // Invalid JSON in field
              data[textarea.name] = textarea.value; // Keep as string if invalid
          }
      });

      // Handle custom components (TagInput, CollectionSelect, DatePicker, etc.)
      this.customComponents.forEach((component, fieldName) => {
        if (component.getFormValue) {
          data[fieldName] = component.getFormValue();
        } else if (component.getValue) {
          data[fieldName] = component.getValue();
        }
      });

      // Convert files to base64 and add to data
      for (const [key, value] of Object.entries(this.data)) {
        if (value instanceof File) {
          try {
            data[key] = await this.fileToBase64(value);
          } catch (error) {
            // Failed to convert file to base64
            data[key] = null;
          }
        } else if (value instanceof FileList) {
          const base64Files = [];
          for (let i = 0; i < value.length; i++) {
            try {
              base64Files.push(await this.fileToBase64(value[i]));
            } catch (error) {
              // Failed to convert file to base64
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
    // Don't sync during save operations to prevent loops
    if (this.isSaving) return;

    // Always update internal data
    this.data = this.prepareFormData();

    if (this.isMounted()) {
        // Only sync if the change wasn't initiated by this form
        if (!this._isFormDrivenChange) {
          this.syncFormWithModel();
        }
        // Reset the flag
        this._isFormDrivenChange = false;
    }
  }

  /**
   * Sync form field values with current model data without full rebuild
   */
  syncFormWithModel() {
    if (!this.model || !this.element) return;

    // Check if form data actually differs from current displayed values
    if (this.formDataMatchesModelData(this.data)) {
      return; // No sync needed - data is already in sync
    }

    // Re-populate form values with updated data
    this.populateFormValues();
  }

  /**
   * Compare current form values with new model data
   * @param {Object} newModelData - New data from model
   * @returns {boolean} True if form and model data match
   */
  formDataMatchesModelData(newModelData) {
    if (!this.formConfig?.fields || !this.element) return true;

    for (const field of this.formConfig.fields) {
      if (field.type === 'group' && field.fields) {
        // Check group fields
        for (const groupField of field.fields) {
          if (!this.fieldValueMatchesModel(groupField, newModelData)) {
            return false;
          }
        }
      } else {
        if (!this.fieldValueMatchesModel(field, newModelData)) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Check if a single field's current value matches the model data
   * @param {Object} fieldConfig - Field configuration
   * @param {Object} modelData - Model data to compare against
   * @returns {boolean} True if field value matches model
   */
  fieldValueMatchesModel(fieldConfig, modelData) {
    if (!fieldConfig.name) return true;

    const fieldElement = this.element.querySelector(`[name="${fieldConfig.name}"]`);
    if (!fieldElement) return true;

    const currentValue = this.getFieldCurrentValue(fieldElement, fieldConfig);
    // Use MOJOUtils to handle nested properties like 'permissions.manage_users'
    const modelValue = MOJOUtils.getContextData(modelData, fieldConfig.name);

    return this.valuesAreDifferent(currentValue, modelValue) === false;
  }



  /**
   * Get current value from a form field element
   */
  getFieldCurrentValue(fieldElement, fieldConfig) {
    switch (fieldConfig.type) {
      case 'checkbox':
      case 'toggle':
      case 'switch':
        return fieldElement.checked;
      case 'radio':
        const checkedRadio = this.element.querySelector(`[name="${fieldConfig.name}"]:checked`);
        return checkedRadio ? checkedRadio.value : '';
      case 'select':
        return fieldElement.multiple ?
          Array.from(fieldElement.selectedOptions).map(opt => opt.value) :
          fieldElement.value;
      case 'file':
      case 'image':
        return null; // Don't sync file fields
      default:
        return fieldElement.value;
    }
  }

  /**
   * Set value on a form field element
   */
  setFieldValue(fieldElement, fieldConfig, newValue) {
    switch (fieldConfig.type) {
      case 'checkbox':
      case 'toggle':
      case 'switch':
        fieldElement.checked = Boolean(newValue);
        break;
      case 'radio':
        const radioOption = this.element.querySelector(`[name="${fieldConfig.name}"][value="${newValue}"]`);
        if (radioOption) {
          radioOption.checked = true;
        }
        break;
      case 'select':
        if (fieldElement.multiple && Array.isArray(newValue)) {
          Array.from(fieldElement.options).forEach(option => {
            option.selected = newValue.includes(option.value);
          });
        } else {
          fieldElement.value = newValue || '';
        }
        break;
      case 'file':
      case 'image':
        // Don't programmatically set file fields
        break;
      default:
        fieldElement.value = newValue || '';
        break;
    }

    // Trigger change event for any field listeners
    fieldElement.dispatchEvent(new Event('change', { bubbles: true }));
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
      // Form submission error

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
      // No changes detected
      return {
        success: true,
        message: 'No changes to save',
        data: formData
      };
    }



    try {
      // Mark this as a form-driven change to prevent sync back
      this._isFormDrivenChange = true;

      // Model.save with only changed data
      const result = await this.model.save(changes);


      return result;
    } catch (error) {
      // Model save error
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


    let changes;
    if (currentData instanceof FormData) {
      // Handle FormData comparison

      changes = this.getChangedFormData(currentData, originalData);
    } else {
      // Handle Object comparison

      changes = this.getChangedObjectData(currentData, originalData);
    }


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

        } else {

          changedData.set(key, value);
          hasChanges = true;
        }
      } else {
        // Compare text values
        const originalValue = originalData[key];
        if (value !== originalValue && value !== String(originalValue)) {

          changedData.set(key, value);
          hasChanges = true;
        } else {

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
    if (fieldType === 'switch' || fieldType === 'checkbox' || fieldType === 'toggle') {
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
    // Form error

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
      ...this.getFormConfig(),
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
      // Drop zone not found for field
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
      ...this.getFormConfig(),
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
/**
 * FieldStatusManager - Manages save status indicators for form fields
 */
class FieldStatusManager {
  constructor(fieldElement) {
    this.fieldElement = fieldElement;
    this.statusContainer = this.findOrCreateStatusContainer();
    this.timeouts = new Map(); // Track active timeouts
  }

  /**
   * Find existing status container or create one based on field type
   */
  findOrCreateStatusContainer() {
    // Look for existing status container (check parent and labels)
    let container = this.fieldElement.parentElement.querySelector('.field-status-label-inline');

    // Also check within the field's label
    if (!container) {
      const label = this.findFieldLabel();
      if (label) {
        container = label.querySelector('.field-status-label-inline');
      }
    }

    if (!container) {
      container = this.createStatusContainer();
    }

    return container;
  }

  /**
   * Create appropriate status container based on field type
   */
  createStatusContainer() {
    const fieldType = this.getFieldType();
    const placement = this.getPlacementStrategy(fieldType);

    const container = document.createElement('div');

    // Since we only use label-inline now, simplify
    return this.createLabelInlineContainer(container);
  }

  /**
   * Determine field type from element
   */
  getFieldType() {
    const tagName = this.fieldElement.tagName.toLowerCase();
    const type = this.fieldElement.type?.toLowerCase();
    const classes = this.fieldElement.className;

    if (type === 'checkbox' || classes.includes('form-check-input') || classes.includes('form-switch')) {
      return 'toggle';
    } else if (tagName === 'select') {
      return 'select';
    } else if (tagName === 'textarea') {
      return 'textarea';
    } else if (tagName === 'input') {
      return 'input';
    }

    return 'input'; // default
  }

  /**
   * Determine placement strategy for field type
   */
  getPlacementStrategy(fieldType) {
    // Use label-inline for all field types - cleanest approach
    return 'label-inline';
  }

  /**
   * Create inline label status container (for all input types)
   */
  createLabelInlineContainer(container) {
    container.className = 'field-status-label-inline';
    container.innerHTML = this.getStatusHTML();

    // Find the associated label
    const label = this.findFieldLabel();
    if (label) {
      // Insert status container at the end of the label
      label.appendChild(container);
    } else {
      // Fallback to parent element if no label found
      this.fieldElement.parentElement.appendChild(container);
    }

    return container;
  }

  /**
   * Find the label associated with any field type
   */
  findFieldLabel() {
    // Try to find label by 'for' attribute matching field id
    if (this.fieldElement.id) {
      const label = document.querySelector(`label[for="${this.fieldElement.id}"]`);
      if (label) return label;
    }

    // Look for label as sibling (common in Bootstrap form-check)
    const label = this.fieldElement.parentElement.querySelector('label');
    if (label) return label;

    // Look for label as parent (less common)
    const parentLabel = this.fieldElement.closest('label');
    if (parentLabel) return parentLabel;

    return null;
  }

  /**
   * Create input overlay container (for text inputs/selects)
   */
  createInputOverlayContainer(container) {
    container.className = 'field-status-overlay';
    container.innerHTML = this.getStatusHTML();

    // Make parent position relative if not already
    const parent = this.fieldElement.parentElement;
    if (getComputedStyle(parent).position === 'static') {
      parent.style.position = 'relative';
    }

    parent.appendChild(container);
    return container;
  }

  /**
   * Create full overlay container (for textareas/large inputs)
   */
  createFullOverlayContainer(container) {
    container.className = 'field-status-full-overlay d-none';
    container.innerHTML = `
      <div class="saving-indicator">
        <div class="spinner-border spinner-border-sm text-primary" role="status">
          <span class="visually-hidden">Saving...</span>
        </div>
        <span class="ms-2">Saving...</span>
      </div>
      <div class="success-indicator d-none">
        <i class="bi bi-check-circle text-success"></i>
        <span class="ms-2">Saved</span>
      </div>
      <div class="error-indicator d-none">
        <i class="bi bi-exclamation-circle text-danger"></i>
        <span class="ms-2">Error saving</span>
      </div>
    `;

    // Make parent position relative if not already
    const parent = this.fieldElement.parentElement;
    if (getComputedStyle(parent).position === 'static') {
      parent.style.position = 'relative';
    }

    parent.appendChild(container);
    return container;
  }

  /**
   * Get standard status HTML for simple containers
   */
  getStatusHTML() {
    return `
      <div class="spinner-border spinner-border-sm text-primary d-none" data-status="saving" role="status">
        <span class="visually-hidden">Saving...</span>
      </div>
      <i class="bi bi-check-circle text-success d-none" data-status="saved"></i>
      <i class="bi bi-exclamation-circle text-danger d-none" data-status="error"></i>
    `;
  }

  /**
   * Show a status indicator
   * @param {string} type - Status type: 'saving', 'saved', 'error'
   * @param {object} options - Additional options
   */
  showStatus(type, options = {}) {
    // Clear any existing timeouts for this field
    this.clearTimeout(type);

    // Since we only use label-inline now, always use standard status
    this.showStandardStatus(type, options);
  }

  /**
   * Show status for standard containers (right-side, input-overlay)
   */
  showStandardStatus(type, options = {}) {
    // Hide all status indicators
    this.hideAllStatuses();

    // Show the requested status
    const indicator = this.statusContainer.querySelector(`[data-status="${type}"]`);
    if (indicator) {
      indicator.classList.remove('d-none');
      indicator.classList.add('d-inline-block', 'show');

      // Set auto-hide timeout for temporary states
      if (type === 'saved') {
        this.setTimeout(type, () => this.hideStatus(type), 2500);
      } else if (type === 'error') {
        // Show error message in title if provided
        if (options.message) {
          indicator.title = options.message;
        }
        this.setTimeout(type, () => this.hideStatus(type), 6000);
      }
    }
  }

  /**
   * Show status for full overlay containers (textareas)
   */
  showFullOverlayStatus(type, options = {}) {
    // Hide all indicators first
    const indicators = this.statusContainer.querySelectorAll('.saving-indicator, .success-indicator, .error-indicator');
    indicators.forEach(ind => ind.classList.add('d-none'));

    // Show the container
    this.statusContainer.classList.remove('d-none');

    // Show specific indicator
    let indicatorClass;
    switch (type) {
      case 'saving':
        indicatorClass = '.saving-indicator';
        break;
      case 'saved':
        indicatorClass = '.success-indicator';
        this.setTimeout(type, () => this.hideStatus(type), 2500);
        break;
      case 'error':
        indicatorClass = '.error-indicator';
        if (options.message) {
          const errorSpan = this.statusContainer.querySelector('.error-indicator span');
          if (errorSpan) errorSpan.textContent = options.message;
        }
        this.setTimeout(type, () => this.hideStatus(type), 6000);
        break;
    }

    if (indicatorClass) {
      const indicator = this.statusContainer.querySelector(indicatorClass);
      if (indicator) {
        indicator.classList.remove('d-none');
      }
    }
  }

  /**
   * Hide a specific status indicator
   * @param {string} type - Status type to hide
   */
  hideStatus(type) {
    const indicator = this.statusContainer.querySelector(`[data-status="${type}"]`);
    if (indicator) {
      indicator.classList.remove('show');
      indicator.classList.add('hide');

      // Actually hide after animation
      setTimeout(() => {
        indicator.classList.add('d-none');
        indicator.classList.remove('d-inline-block', 'hide');
        indicator.title = ''; // Clear any error message
      }, 300);
    }
  }

  /**
   * Hide all status indicators
   */
  hideAllStatuses() {
    const indicators = this.statusContainer.querySelectorAll('[data-status]');
    indicators.forEach(indicator => {
      indicator.classList.add('d-none');
      indicator.classList.remove('d-inline-block', 'show', 'hide');
      indicator.title = '';
    });
  }

  /**
   * Set a timeout for auto-hiding status
   * @param {string} type - Status type
   * @param {function} callback - Callback to execute
   * @param {number} delay - Delay in milliseconds
   */
  setTimeout(type, callback, delay) {
    const timeoutId = setTimeout(callback, delay);
    this.timeouts.set(type, timeoutId);
  }

  /**
   * Clear a specific timeout
   * @param {string} type - Status type
   */
  clearTimeout(type) {
    if (this.timeouts.has(type)) {
      clearTimeout(this.timeouts.get(type));
      this.timeouts.delete(type);
    }
  }

  /**
   * Clean up all timeouts
   */
  destroy() {
    this.timeouts.forEach(timeoutId => clearTimeout(timeoutId));
    this.timeouts.clear();
  }
}

// Apply FileDropMixin to FormView class
applyFileDropMixin(FormView);

export default FormView;
export { FormView };
