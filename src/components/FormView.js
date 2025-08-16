/**
 * FormView - View wrapper for FormBuilder component
 * Extends View to properly integrate FormBuilder with MOJO's view hierarchy
 */

import View from '../core/View.js';
import { FormBuilder } from './FormBuilder.js';

class FormView extends View {
    constructor(options = {}) {
        // Extract form-specific options
        const {
            formConfig,
            ...viewOptions
        } = options;

        // Set default view options
        super({
            tagName: 'div',
            className: 'form-view',
            ...viewOptions
        });

        // Store form configuration
        this.formConfig = formConfig || {};

        // FormBuilder instance will be created after mount
        this.formBuilder = null;
    }

    async render222(allowMount = true) {

        await this.formBuilder.render(this.element);
    }

    /**
     * Override render to skip template rendering entirely
     * FormBuilder will handle all the content
     */
    async renderOld(container = null) {
        if (this.destroyed) {
            throw new Error('Cannot render destroyed view');
        }

        if (container) {
            this.setContainer(container);
        }

        // Create element if it doesn't exist
        if (!this.element) {
            this.createElement();
        }

        // Mount to container
        if (!this.mounted) {
            await this.mount();
        }

        this.rendered = true;
        return this;
    }

    async renderTemplate() {
        if (!this.formBuilder) {
            this.formBuilder = new FormBuilder(this.formConfig);
        }
        return this.formBuilder.buildFormHTML();
    }

    async onAfterRender() {
        this.formBuilder.container = this.element;
        await this.formBuilder.onAfterRender();
    }

    /**
     * Initialize the form after the view is mounted
     */
    async onAfterMount2() {
        await super.onAfterMount();

        // Check if element exists AND is actually in the DOM
        if (this.element && document.body.contains(this.element)) {
            // Now we can safely mount the FormBuilder
            if (this.formConfig) {
                try {
                    this.formBuilder = new FormBuilder(this.formConfig);
                    await this.formBuilder.mount(this.element);

                    // Re-emit form events through the view
                    this.setupEventProxies();

                    // Attach any handlers that were added before FormBuilder was created
                    this.attachPendingHandlers();
                } catch (error) {
                    console.error('Failed to mount FormBuilder:', error);
                    this.showError('Failed to initialize form');
                }
            }
        } else {
            console.warn(`FormView ${this.id}: Element not in DOM yet, skipping FormBuilder creation`);
        }
    }

    /**
     * Setup event proxies to re-emit FormBuilder events through the View
     */
    setupEventProxies() {
        if (!this.formBuilder) return;

        // Proxy common form events
        const events = ['submit', 'reset', 'change', 'validate'];
        events.forEach(eventName => {
            this.formBuilder.on(eventName, (data) => {
                // Emit through View's event system
                this.emit(`form:${eventName}`, data);
            });
        });
    }

    /**
     * Get form values
     * @returns {object} Form data
     */
    getValues() {
        return this.formBuilder ? this.formBuilder.getValues() : {};
    }

    /**
     * Set form values
     * @param {object} values - Values to set
     */
    setValues(values) {
        if (this.formBuilder) {
            this.formBuilder.setValues(values);
        }
    }

    /**
     * Reset the form
     */
    reset() {
        if (this.formBuilder) {
            this.formBuilder.reset();
        }
    }

    /**
     * Validate the form
     * @returns {boolean} True if valid
     */
    validate() {
        if (this.formBuilder) {
            const form = this.formBuilder.getFormElement();
            if (form) {
                return form.checkValidity();
            }
        }
        return false;
    }

    /**
     * Get the form element
     * @returns {HTMLFormElement|null}
     */
    getFormElement() {
        return this.formBuilder ? this.formBuilder.getFormElement() : null;
    }

    /**
     * Add event listener to FormBuilder
     * @param {string} event - Event name
     * @param {Function} handler - Event handler
     */
    on(event, handler) {
        if (this.formBuilder) {
            this.formBuilder.on(event, handler);
        } else {
            // Store handlers to attach after FormBuilder is created
            this._pendingHandlers = this._pendingHandlers || {};
            this._pendingHandlers[event] = this._pendingHandlers[event] || [];
            this._pendingHandlers[event].push(handler);
        }
        return this;
    }

    /**
     * Remove event listener from FormBuilder
     * @param {string} event - Event name
     * @param {Function} handler - Event handler
     */
    off(event, handler) {
        if (this.formBuilder) {
            this.formBuilder.off(event, handler);
        }
        return this;
    }

    /**
     * Handle pending event handlers after FormBuilder is created
     */
    attachPendingHandlers() {
        if (this._pendingHandlers && this.formBuilder) {
            Object.entries(this._pendingHandlers).forEach(([event, handlers]) => {
                handlers.forEach(handler => {
                    this.formBuilder.on(event, handler);
                });
            });
            this._pendingHandlers = null;
        }
    }

    /**
     * Update form configuration and re-render
     * @param {object} config - New configuration
     */
    async updateConfig(config) {
        this.formConfig = { ...this.formConfig, ...config };

        if (this.formBuilder && this.element) {
            // Save current values
            const currentValues = this.getValues();

            // Destroy and recreate
            this.formBuilder.destroy();
            this.formBuilder = new FormBuilder(this.formConfig);
            await this.formBuilder.mount(this.element);

            // Restore values
            this.setValues(currentValues);

            // Re-setup event proxies
            this.setupEventProxies();
            this.attachPendingHandlers();
        }
    }

    /**
     * Enable/disable the form
     * @param {boolean} enabled - True to enable, false to disable
     */
    setEnabled(enabled) {
        const form = this.getFormElement();
        if (form) {
            const fields = form.querySelectorAll('input, select, textarea, button');
            fields.forEach(field => {
                field.disabled = !enabled;
            });
        }
    }

    /**
     * Show loading state
     * @param {boolean} loading - True to show loading, false to hide
     */
    setLoading(loading) {
        if (this.formBuilder) {
            this.formBuilder.loading = loading;
            this.setEnabled(!loading);

            // Update submit button if exists
            const form = this.getFormElement();
            if (form) {
                const submitBtn = form.querySelector('button[type="submit"]');
                if (submitBtn) {
                    if (loading) {
                        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Loading...';
                    } else {
                        // Restore original text
                        const originalText = this.formConfig.submitButton || 'Submit';
                        submitBtn.innerHTML = typeof originalText === 'string' ? originalText : 'Submit';
                    }
                }
            }
        }
    }

    /**
     * Set field error
     * @param {string} fieldName - Field name
     * @param {string} error - Error message
     */
    setFieldError(fieldName, error) {
        if (this.formBuilder) {
            this.formBuilder.errors[fieldName] = error;
            const form = this.getFormElement();
            if (form) {
                const field = form.elements[fieldName];
                if (field) {
                    field.classList.add('is-invalid');
                    const feedback = field.parentElement.querySelector('.invalid-feedback');
                    if (feedback) {
                        feedback.textContent = error;
                    }
                }
            }
        }
    }

    /**
     * Clear field error
     * @param {string} fieldName - Field name
     */
    clearFieldError(fieldName) {
        if (this.formBuilder) {
            delete this.formBuilder.errors[fieldName];
            const form = this.getFormElement();
            if (form) {
                const field = form.elements[fieldName];
                if (field) {
                    field.classList.remove('is-invalid');
                }
            }
        }
    }

    /**
     * Clear all errors
     */
    clearAllErrors() {
        if (this.formBuilder) {
            this.formBuilder.clearAllErrors();
        }
    }

    /**
     * Focus on first field
     */
    focusFirstField() {
        const form = this.getFormElement();
        if (form) {
            const firstField = form.querySelector('input:not([type="hidden"]), select, textarea');
            if (firstField) {
                firstField.focus();
            }
        }
    }

    /**
     * Focus on first error field
     */
    focusFirstError() {
        const form = this.getFormElement();
        if (form) {
            const firstError = form.querySelector('.is-invalid');
            if (firstError) {
                firstError.focus();
            }
        }
    }

    /**
     * Clean up before destroying the view
     */
    async onBeforeDestroy() {
        if (this.formBuilder) {
            this.formBuilder.destroy();
            this.formBuilder = null;
        }
        this._pendingHandlers = null;

        await super.onBeforeDestroy();
    }
}

// Export for use in MOJO framework
export default FormView;
export { FormView };
