/**
 * Form Input Components Index
 * Exports all available form input components
 */

// Import all input components
import TagInput from './TagInput.js';
import CollectionSelect from './CollectionSelect.js';
import CollectionMultiSelect from './CollectionMultiSelect.js';
import DatePicker from './DatePicker.js';
import DateRangePicker from './DateRangePicker.js';
import ComboInput from './ComboInput.js';

// Named exports
export {
  TagInput,
  CollectionSelect,
  CollectionMultiSelect,
  DatePicker,
  DateRangePicker,
  ComboInput
};

// Legacy aliases for backward compatibility
export { TagInput as TagInputView };
export { CollectionSelect as CollectionSelectView };

// Default export object for convenience
export default {
  TagInput,
  CollectionSelect,
  CollectionMultiSelect,
  DatePicker,
  DateRangePicker,
  ComboInput,
  
  // Legacy aliases
  TagInputView: TagInput,
  CollectionSelectView: CollectionSelect,
  CollectionMultiSelectView: CollectionMultiSelect
};

// Input type registry for FormBuilder integration
export const INPUT_TYPES = {
  tag: TagInput,
  tags: TagInput,
  collection: CollectionSelect,
  collectionmultiselect: CollectionMultiSelect,
  'collection-multiselect': CollectionMultiSelect,
  datepicker: DatePicker,
  daterange: DateRangePicker,
  combo: ComboInput,
  combobox: ComboInput,
  autocomplete: ComboInput
};

// Factory function for creating inputs by type
export function createInput(type, options = {}) {
  const InputClass = INPUT_TYPES[type];
  if (!InputClass) {
    throw new Error(`Unknown input type: ${type}`);
  }
  return new InputClass(options);
}