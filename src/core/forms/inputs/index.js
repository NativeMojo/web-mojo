/**
 * Form Input Components Index
 * Exports all available form input components
 */

// Import all input components
import TagInput from './TagInput.js';
import CollectionSelect from './CollectionSelect.js';
import CollectionMultiSelect from './CollectionMultiSelect.js';
import MultiSelectDropdown from './MultiSelectDropdown.js';
import DatePicker from './DatePicker.js';
import DateRangePicker from './DateRangePicker.js';
import ComboInput from './ComboInput.js';
import ComboBox from './ComboBox.js';

// Named exports
export {
  TagInput,
  CollectionSelect,
  CollectionMultiSelect,
  MultiSelectDropdown,
  DatePicker,
  DateRangePicker,
  ComboInput,
  ComboBox
};

// Legacy aliases for backward compatibility
export { TagInput as TagInputView };
export { CollectionSelect as CollectionSelectView };

// Default export object for convenience
export default {
  TagInput,
  CollectionSelect,
  CollectionMultiSelect,
  MultiSelectDropdown,
  DatePicker,
  DateRangePicker,
  ComboInput,
  ComboBox,
  
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
  multiselect: MultiSelectDropdown,
  datepicker: DatePicker,
  daterange: DateRangePicker,
  combo: ComboBox,
  combobox: ComboBox,
  autocomplete: ComboBox
};

// Factory function for creating inputs by type
export function createInput(type, options = {}) {
  const InputClass = INPUT_TYPES[type];
  if (!InputClass) {
    throw new Error(`Unknown input type: ${type}`);
  }
  return new InputClass(options);
}