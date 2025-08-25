/**
 * Forms Module Index
 * Main entry point for all form-related components and utilities
 */

// Import main form components
import FormBuilder from './FormBuilder.js';
import FormView from './FormView.js';

// Import all input components
import * as Inputs from './inputs/index.js';
import {
  TagInput,
  CollectionSelect,
  DatePicker,
  DateRangePicker,
  INPUT_TYPES,
  createInput
} from './inputs/index.js';

// Main form components
export {
  FormBuilder,
  FormView
};

// Input components
export {
  TagInput,
  CollectionSelect,
  DatePicker,
  DateRangePicker,
  createInput
};

// Legacy aliases for backward compatibility
export { TagInput as TagInputView };
export { CollectionSelect as CollectionSelectView };

// Export all inputs as a namespace
export { Inputs };

// Export input type registry
export { INPUT_TYPES };

// Default export for convenience
export default {
  FormBuilder,
  FormView,
  
  // Input components
  TagInput,
  CollectionSelect,
  DatePicker,
  DateRangePicker,
  
  // Legacy aliases
  TagInputView: TagInput,
  CollectionSelectView: CollectionSelect,
  
  // Utilities
  createInput,
  INPUT_TYPES,
  
  // All inputs namespace
  Inputs
};

// Utility functions
export function createFormBuilder(config = {}) {
  return new FormBuilder(config);
}

export function createFormView(config = {}) {
  return new FormView(config);
}