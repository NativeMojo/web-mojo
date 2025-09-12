/**
 * TagInputView - Advanced tag input component for MOJO framework
 * Allows users to add/remove tags with keyboard and mouse interaction
 * Integrates with FormView and uses EventDelegate patterns
 *
 * Features:
 * - Add tags via Enter, comma, or Tab key
 * - Remove tags with click or keyboard
 * - Duplicate prevention
 * - Bootstrap 5 styling
 * - Accessibility support
 * - Form integration with hidden input
 *
 * Example Usage:
 * ```javascript
 * const tagInput = new TagInputView({
 *   name: 'tags',
 *   value: 'javascript,react,node', // Initial tags
 *   placeholder: 'Add tags...',
 *   maxTags: 10,
 *   allowDuplicates: false
 * });
 * ```
 */

import View from '@core/View.js';

class TagInputView extends View {
  constructor(options = {}) {
    const {
      name,
      value = '',
      placeholder = 'Add tags...',
      maxTags = 50,
      allowDuplicates = false,
      separator = ',',
      trimTags = true,
      minLength = 1,
      maxLength = 50,
      disabled = false,
      readonly = false,
      class: containerClass = '',
      tagClass = 'badge bg-primary',
      inputClass = 'form-control',
      ...viewOptions
    } = options;

    super({
      tagName: 'div',
      className: `tag-input-view ${containerClass}`,
      ...viewOptions
    });

    // Configuration
    this.name = name;
    this.placeholder = placeholder;
    this.maxTags = maxTags;
    this.allowDuplicates = allowDuplicates;
    this.separator = separator;
    this.trimTags = trimTags;
    this.minLength = minLength;
    this.maxLength = maxLength;
    this.disabled = disabled;
    this.readonly = readonly;
    this.tagClass = tagClass;
    this.inputClass = inputClass;

    // State
    this.tags = [];
    this.focusedTagIndex = -1;

    // Parse initial value
    if (value) {
      this.tags = this.parseTagString(value);
    }
  }

  /**
   * Render the tag input component
   */
  async renderTemplate() {
    const tagsHTML = this.renderTags();
    const hiddenInputHTML = this.renderHiddenInput();
    const inputHTML = this.renderInput();

    return `
      <div class="tag-input-container">
        <div class="tag-input-wrapper border rounded p-2"
             data-action="focus-input"
             tabindex="0"
             role="combobox"
             aria-expanded="false"
             aria-label="Tag input">
          <div class="tags-container d-flex flex-wrap gap-1 mb-2">
            ${tagsHTML}
          </div>
          ${inputHTML}
        </div>
        ${hiddenInputHTML}
        <div class="tag-input-feedback small text-muted mt-1">
          <span class="tag-count">${this.tags.length}</span>/${this.maxTags} tags
        </div>
      </div>
    `;
  }

  /**
   * Render individual tags
   */
  renderTags() {
    return this.tags.map((tag, index) => `
      <span class="${this.tagClass} tag-item"
            data-tag-index="${index}"
            tabindex="0"
            role="button"
            aria-label="Tag: ${this.escapeHtml(tag)}. Press Delete or Backspace to remove.">
        <span class="tag-text">${this.escapeHtml(tag)}</span>
        ${!this.readonly && !this.disabled ? `
          <i class="bi bi-x tag-remove ms-1"
             data-action="remove-tag"
             data-tag-index="${index}"
             aria-label="Remove tag"></i>
        ` : ''}
      </span>
    `).join('');
  }

  /**
   * Render the input field
   */
  renderInput() {
    if (this.readonly) {
      return '';
    }

    return `
      <input type="text"
             class="${this.inputClass} tag-input-field border-0 p-0"
             placeholder="${this.escapeHtml(this.placeholder)}"
             ${this.disabled ? 'disabled' : ''}
             data-change-action="input-change"
             style="outline: none; box-shadow: none; min-width: 120px;"
             autocomplete="off">
    `;
  }

  /**
   * Render hidden input for form submission
   */
  renderHiddenInput() {
    if (!this.name) return '';

    return `
      <input type="hidden"
             name="${this.name}"
             value="${this.escapeHtml(this.getTagString())}"
             class="tag-input-hidden">
    `;
  }

  /**
   * Handle component initialization after render
   */
  async onAfterRender() {
    await super.onAfterRender();
    this.updateTagCount();
  }

  // ========================================
  // EventDelegate Action Handlers
  // ========================================

  /**
   * Handle focus on container
   */
  async onActionFocusInput(_event, _element) {
      this.focus();
  }

  focus() {
    const input = this.element.querySelector('.tag-input-field');
    if (input && !this.disabled) {
      input.focus();
    }
    this.focusedTagIndex = -1;
  }

  /**
   * Handle tag removal
   */
  async onActionRemoveTag(event, element) {
    event.stopPropagation();

    const tagIndex = parseInt(element.getAttribute('data-tag-index'));
    if (tagIndex >= 0 && tagIndex < this.tags.length) {
      await this.removeTag(tagIndex);
    }
  }

  /**
   * Handle input changes (for adding tags)
   */
  async onChangeInputChange(event, element) {
    const value = element.value;
    const lastChar = value.slice(-1);

    // Check for separator keys
    if (lastChar === this.separator || lastChar === '\n') {
      event.preventDefault();
      const tagText = value.slice(0, -1);
      if (tagText.trim()) {
        await this.addTag(tagText);
        element.value = '';
      }
      return;
    }

    // Handle other trigger keys via keydown

  }

  bindEvents() {
      if (!this.__bnd_keydown) this.__bnd_keydown = this.handleInputKeydown.bind(this);
      this.element.addEventListener('keydown', this.__bnd_keydown);
      this.events.bind(this.element);
  }

  unbindEvents() {
      if (this.__bnd_keydown)this.element.removeEventListener('keydown', this.__bnd_keydown);
      this.events.unbind();
  }

  /**
   * Handle keyboard interactions
   */
  handleInputKeydown(event) {
    const input = event.target;
    const value = input.value || '';
    switch (event.key) {
      case 'Enter':
      case 'Tab':
      case ',':
        if (value.trim()) {
          event.preventDefault();
          this.addTag(value);
          input.value = '';
        }
        break;

      case 'Backspace':
        if (value === '' && this.tags.length > 0) {
          event.preventDefault();
          if (this.focusedTagIndex >= 0) {
              this.removeTag(this.focusedTagIndex);
              if (this.focusedTagIndex == 0) {
                  this.focus();
              } else {
                  this.focusTag(this.focusedTagIndex - 1);
              }
          } else {
              this.removeTag(this.tags.length - 1);
          }
        }
        break;

    case 'ArrowLeft':
          if (value === '' && this.tags.length > 0) {
            event.preventDefault();
            if (this.focusedTagIndex >= 0) {
                const newIndex = this.focusedTagIndex - 1;
                if (newIndex >= 0) {
                    this.focusTag(newIndex);
                } else {
                    this.focus();
                }
            } else {
                this.focusTag(this.tags.length - 1);
            }
          }
          break;

      case 'ArrowRight':
          if (value === '' && this.tags.length > 0) {
              event.preventDefault();
              if (this.focusedTagIndex >= 0) {
                  const newIndex = this.focusedTagIndex + 1;
                  if (newIndex < this.tags.length) {
                      this.focusTag(newIndex);
                  } else {
                      this.focus();
                  }
              } else {
                  this.focusTag(0);
              }
          }
          break;

      case 'Escape':
        input.value = '';
        input.blur();
        break;
    }
  }

  // ========================================
  // Tag Management Methods
  // ========================================

  /**
   * Add a new tag
   */
  async addTag(tagText) {
    if (this.readonly || this.disabled) return false;

    const cleanTag = this.trimTags ? tagText.trim() : tagText;

    // Validation
    if (!this.isValidTag(cleanTag)) {
      return false;
    }

    // Check for duplicates
    if (!this.allowDuplicates && this.tags.includes(cleanTag)) {
      this.showTagError(`Tag "${cleanTag}" already exists`);
      return false;
    }

    // Check max tags limit
    if (this.tags.length >= this.maxTags) {
      this.showTagError(`Maximum ${this.maxTags} tags allowed`);
      return false;
    }

    // Add the tag
    this.tags.push(cleanTag);
    await this.updateDisplay();

    // Emit events
    this.emit('tag:added', { tag: cleanTag, tags: this.tags });
    this.emit('change', { value: this.getTagString(), tags: this.tags });

    return true;
  }

  /**
   * Remove a tag by index
   */
  async removeTag(index) {
    if (this.readonly || this.disabled) return false;

    if (index >= 0 && index < this.tags.length) {
      const removedTag = this.tags[index];
      this.tags.splice(index, 1);
      await this.updateDisplay();

      // Emit events
      this.emit('tag:removed', { tag: removedTag, tags: this.tags });
      this.emit('change', { value: this.getTagString(), tags: this.tags });

      return true;
    }

    return false;
  }

  /**
   * Remove a tag by value
   */
  async removeTagByValue(tagValue) {
    const index = this.tags.indexOf(tagValue);
    if (index >= 0) {
      return await this.removeTag(index);
    }
    return false;
  }

  /**
   * Clear all tags
   */
  async clearTags() {
    if (this.readonly || this.disabled) return false;

    const oldTags = [...this.tags];
    this.tags = [];
    await this.updateDisplay();

    this.emit('tags:cleared', { oldTags });
    this.emit('change', { value: '', tags: [] });

    return true;
  }

  /**
   * Set tags from array or string
   */
  async setTags(tagsInput) {
    let newTags = [];

    if (Array.isArray(tagsInput)) {
      newTags = tagsInput;
    } else if (typeof tagsInput === 'string') {
      newTags = this.parseTagString(tagsInput);
    }

    // Validate and filter tags
    newTags = newTags
      .filter(tag => this.isValidTag(tag))
      .slice(0, this.maxTags);

    // Remove duplicates if not allowed
    if (!this.allowDuplicates) {
      newTags = [...new Set(newTags)];
    }

    this.tags = newTags;
    await this.updateDisplay();

    this.emit('tags:set', { tags: this.tags });
    this.emit('change', { value: this.getTagString(), tags: this.tags });
  }

  // ========================================
  // Utility Methods
  // ========================================

  /**
   * Validate a tag
   */
  isValidTag(tag) {
    if (typeof tag !== 'string') return false;
    if (tag.length < this.minLength) return false;
    if (tag.length > this.maxLength) return false;
    if (tag.trim() === '') return false;
    return true;
  }

  /**
   * Parse tag string into array
   */
  parseTagString(tagString) {
    if (!tagString) return [];

    return tagString
      .split(this.separator)
      .map(tag => this.trimTags ? tag.trim() : tag)
      .filter(tag => tag.length > 0);
  }

  /**
   * Get tags as a string
   */
  getTagString() {
    return this.tags.join(this.separator);
  }

  /**
   * Get tags as array
   */
  getTags() {
    return [...this.tags];
  }

  /**
   * Focus a specific tag
   */
  focusTag(index) {
    const tagElements = this.element.querySelectorAll('.tag-item');
    if (tagElements[index]) {
      this.focusedTagIndex = index;
      console.log(`Focused tag index: ${index}`);
      tagElements[index].focus();
    }
  }

  /**
   * Update the display after changes
   */
  async updateDisplay() {
    // Re-render tags container
    const tagsContainer = this.element.querySelector('.tags-container');
    if (tagsContainer) {
      tagsContainer.innerHTML = this.renderTags();
    }

    // Update hidden input
    const hiddenInput = this.element.querySelector('.tag-input-hidden');
    if (hiddenInput) {
      hiddenInput.value = this.getTagString();
    }

    // Update tag count
    this.updateTagCount();
  }

  /**
   * Update tag count display
   */
  updateTagCount() {
    const tagCountElement = this.element.querySelector('.tag-count');
    if (tagCountElement) {
      tagCountElement.textContent = this.tags.length;
    }
  }

  /**
   * Show tag error message
   */
  showTagError(message) {
    // Create or update error message
    let errorElement = this.element.querySelector('.tag-error');

    if (!errorElement) {
      errorElement = document.createElement('div');
      errorElement.className = 'tag-error small text-danger mt-1';

      const feedback = this.element.querySelector('.tag-input-feedback');
      if (feedback) {
        feedback.parentNode.insertBefore(errorElement, feedback.nextSibling);
      }
    }

    errorElement.textContent = message;

    // Auto-hide after 3 seconds
    setTimeout(() => {
      if (errorElement.parentNode) {
        errorElement.remove();
      }
    }, 3000);
  }

  /**
   * Enable/disable the component
   */
  setEnabled(enabled) {
    this.disabled = !enabled;

    const input = this.element.querySelector('.tag-input-field');
    if (input) {
      input.disabled = this.disabled;
    }

    const container = this.element.querySelector('.tag-input-wrapper');
    if (container) {
      container.classList.toggle('disabled', this.disabled);
    }
  }

  /**
   * Set readonly state
   */
  setReadonly(readonly) {
    this.readonly = readonly;

    const input = this.element.querySelector('.tag-input-field');
    if (input) {
      input.style.display = readonly ? 'none' : '';
    }

    // Hide remove buttons
    const removeButtons = this.element.querySelectorAll('.tag-remove');
    removeButtons.forEach(btn => {
      btn.style.display = readonly ? 'none' : '';
    });
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(str) {
    if (str == null) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }

  /**
   * Get form value (for integration with forms)
   */
  getFormValue() {
    return this.getTagString();
  }

  /**
   * Set form value (for integration with forms)
   */
  async setFormValue(value) {
    await this.setTags(value);
  }

  /**
   * Static factory method
   */
  static create(options = {}) {
    return new TagInputView(options);
  }
}

export default TagInputView;
