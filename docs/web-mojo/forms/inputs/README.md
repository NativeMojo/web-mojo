# Advanced Input Components

This directory contains documentation for advanced, component-based input fields in WEB-MOJO forms. These are custom components that provide enhanced functionality beyond native HTML5 inputs.

For basic/native HTML5 fields, see [BasicTypes.md](../BasicTypes.md).  
For a master quick reference of ALL field types, see [FieldTypes.md](../FieldTypes.md).

---

## Available Components

### Selection & Multi-Select

| Component | Type | Description | Best For |
|-----------|------|-------------|----------|
| [MultiSelectDropdown](./MultiSelectDropdown.md) | `multiselect` | Multi-select with checkboxes | Selecting multiple from list |
| [ComboInput](./ComboInput.md) | `combo`, `combobox` | Editable dropdown | Type or select with custom values |
| [CollectionSelect](./CollectionSelect.md) | `collection` | Single select from API | Dropdown from dynamic data source |
| [CollectionMultiSelect](./CollectionMultiSelect.md) | `collectionmultiselect` | Multi-select from API | Multiple from dynamic data source |

### Tag & Chip Inputs

| Component | Type | Description | Best For |
|-----------|------|-------------|----------|
| [TagInput](./TagInput.md) | `tag`, `tags` | Add/remove tags (chips) | Keywords, labels, categories |

### Date & Time

| Component | Type | Description | Best For |
|-----------|------|-------------|----------|
| [DatePicker](./DatePicker.md) | `datepicker` | Enhanced date selection | Better UX than native date picker |
| [DateRangePicker](./DateRangePicker.md) | `daterange` | Select date range | Start/end date selection |

### File & Media

| Component | Type | Description | Best For |
|-----------|------|-------------|----------|
| [ImageField](./ImageField.md) | `image` | Image upload with preview | Profile photos, featured images |

### Specialized Components

| Component | Type | Description | Best For |
|-----------|------|-------------|----------|
| ButtonGroup | `buttongroup` | Button-style selection | View modes, alignments |
| ChecklistDropdown | `checklistdropdown` | Dropdown with checkboxes | Compact filters |
| TabSet | `tabset` | Tabbed field groups | Organizing complex forms |

---

## When to Use Advanced Components

### Use Native Fields When:
- ✅ Simple data entry (text, numbers, dates)
- ✅ Standard browser behavior is sufficient
- ✅ No special UX requirements
- ✅ Performance is critical (fewer dependencies)

### Use Advanced Components When:
- ✅ Enhanced UX needed (better date pickers, tag input)
- ✅ Complex interactions (multi-select, autocomplete)
- ✅ Data from APIs (collection selects)
- ✅ Rich visual feedback (image upload with preview)
- ✅ Custom validation or formatting

---

## Component Comparison

### Single Selection

| Need | Use | Features |
|------|-----|----------|
| Simple dropdown | `select` (native) | Native browser control |
| Searchable dropdown | `select` with `searchable: true` | Built-in search |
| Type or select | `combo` / `combobox` | Autocomplete, custom values |
| From API | `collection` | Fetch from backend |

### Multiple Selection

| Need | Use | Features |
|------|-----|----------|
| Few options | `checkbox` (multiple) | Simple checkboxes |
| Many options | `multiselect` | Dropdown with checkboxes |
| Compact filter | `checklistdropdown` | Bootstrap dropdown |
| From API | `collectionmultiselect` | Fetch from backend |
| Tags/keywords | `tag` | Add/remove chips |

### Date Selection

| Need | Use | Features |
|------|-----|----------|
| Simple date | `date` (native) | Browser default |
| Enhanced UX | `datepicker` | Easepick library, themes |
| Date range | `daterange` | Start + end dates |
| Date + time | `datetime-local` (native) | Browser default |

### File Upload

| Need | Use | Features |
|------|-----|----------|
| Any file | `file` (native) | Basic upload |
| Image with preview | `image` | Drag-drop, preview, sizes |

---

## Quick Start Examples

### TagInput
```javascript
{
  type: 'tag',
  name: 'skills',
  label: 'Skills',
  placeholder: 'Type and press Enter...',
  maxTags: 10
}
```

### DatePicker
```javascript
{
  type: 'datepicker',
  name: 'start_date',
  label: 'Start Date',
  format: 'YYYY-MM-DD',
  min: '2024-01-01'
}
```

### MultiSelectDropdown
```javascript
{
  type: 'multiselect',
  name: 'categories',
  label: 'Categories',
  options: ['Tech', 'Design', 'Marketing', 'Sales'],
  placeholder: 'Select categories...'
}
```

### CollectionSelect
```javascript
{
  type: 'collection',
  name: 'user_id',
  label: 'Assign To',
  Collection: UsersCollection,
  labelField: 'name',
  valueField: 'id',
  placeholder: 'Search users...'
}
```

### ImageField
```javascript
{
  type: 'image',
  name: 'avatar',
  label: 'Profile Photo',
  size: 'md',
  allowDrop: true
}
```

---

## Common Patterns

### Using with FormView

All advanced components work seamlessly with FormView:

```javascript
const form = new FormView({
  containerId: 'my-form',
  formConfig: {
    fields: [
      { type: 'text', name: 'name', label: 'Name' },
      { type: 'tag', name: 'skills', label: 'Skills' },
      { type: 'datepicker', name: 'start_date', label: 'Start Date' },
      { type: 'image', name: 'photo', label: 'Photo', size: 'md' }
    ]
  }
});

this.addChild(form);
```

### Standalone Usage

Some components can be used standalone:

```javascript
import { TagInput } from '@core/forms/inputs/TagInput.js';

const tagInput = new TagInput({
  containerId: 'tags-container',
  name: 'tags',
  placeholder: 'Add tags...',
  maxTags: 5
});

this.addChild(tagInput);
```

### Event Handling

Components emit events through FormView:

```javascript
form.on('field:change:skills', (value) => {
  console.log('Skills updated:', value);
});

form.on('field:change:start_date', (value) => {
  console.log('Date selected:', value);
});
```

---

## Installation & Dependencies

Most advanced components have minimal dependencies:

- **TagInput**: No external dependencies
- **DatePicker/DateRangePicker**: Easepick library (included)
- **CollectionSelect**: Requires Collection class
- **MultiSelectDropdown**: No external dependencies
- **ImageField**: No external dependencies

All components use Bootstrap 5 for styling (already included in WEB-MOJO).

---

## Performance Considerations

### Lazy Loading

Advanced components are loaded on-demand:

```javascript
// Components are imported only when field type is used
{
  type: 'tag',  // TagInput imported automatically
  name: 'keywords'
}
```

### Component Lifecycle

All components follow the View lifecycle:
- `onInit()` - Component setup
- `onAfterRender()` - DOM ready, attach events
- `onBeforeDestroy()` - Cleanup, remove listeners

### Memory Management

Components automatically clean up when destroyed:
```javascript
// FormView handles cleanup automatically
form.destroy(); // All child components cleaned up
```

---

## Validation

All components support standard validation:

```javascript
{
  type: 'tag',
  name: 'skills',
  label: 'Skills',
  required: true,
  validation: {
    minTags: 3,
    maxTags: 10,
    custom: (tags) => {
      if (tags.length < 3) return 'Please add at least 3 skills';
      return true;
    }
  }
}
```

See [Validation.md](../Validation.md) for complete validation documentation.

---

## Styling & Theming

All components use Bootstrap 5 classes and CSS variables:

```css
/* Customize component styling */
.tag-input .tag {
  background-color: var(--bs-primary);
  color: white;
}

.date-picker .calendar {
  border-color: var(--bs-border-color);
}
```

---

## Browser Support

All components support:
- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

Polyfills included for:
- Date picker (Easepick works in all browsers)
- File API (modern browsers only)

---

## Migration Guide

### From Native to Advanced Components

**Native Select → CollectionSelect:**
```javascript
// Before (native)
{ type: 'select', name: 'user_id', options: userOptions }

// After (advanced)
{ type: 'collection', name: 'user_id', Collection: UsersCollection }
```

**Native Date → DatePicker:**
```javascript
// Before (native)
{ type: 'date', name: 'start_date' }

// After (advanced)
{ type: 'datepicker', name: 'start_date', format: 'YYYY-MM-DD' }
```

**Textarea → TagInput:**
```javascript
// Before (native)
{ type: 'textarea', name: 'tags', help: 'Comma-separated' }

// After (advanced)
{ type: 'tag', name: 'tags', separator: ',' }
```

---

## Troubleshooting

### Component Not Rendering
```javascript
// ❌ Wrong: Missing containerId
const tag = new TagInput({ name: 'tags' });

// ✅ Correct: Provide containerId
const tag = new TagInput({
  containerId: 'tags-container',
  name: 'tags'
});
```

### Events Not Firing
```javascript
// ❌ Wrong: Listening before component ready
form.on('field:change:tags', handler);
form.render();

// ✅ Correct: Listen after render
form.render();
await form.onAfterRender();
form.on('field:change:tags', handler);
```

### Value Not Updating
```javascript
// ❌ Wrong: Direct DOM manipulation
document.querySelector('[name="tags"]').value = 'new value';

// ✅ Correct: Use component API
form.setFieldValue('tags', ['tag1', 'tag2']);
```

---

## Component Documentation

Click on any component below for detailed documentation:

- [TagInput](./TagInput.md) - Tag/chip input for keywords and labels
- [DatePicker](./DatePicker.md) - Enhanced date selection with Easepick
- [DateRangePicker](./DateRangePicker.md) - Date range selection
- [MultiSelectDropdown](./MultiSelectDropdown.md) - Multi-select with checkboxes
- [ComboInput](./ComboInput.md) - Editable dropdown with autocomplete
- [CollectionSelect](./CollectionSelect.md) - Single select from Collection/API
- [CollectionMultiSelect](./CollectionMultiSelect.md) - Multi-select from Collection/API
- [ImageField](./ImageField.md) - Image upload with preview and drag-drop

---

## Related Documentation

- [FieldTypes.md](../FieldTypes.md) - Master quick reference
- [BasicTypes.md](../BasicTypes.md) - Native HTML5 field types
- [FormView.md](../FormView.md) - FormView API reference
- [Validation.md](../Validation.md) - Validation system
- [BestPractices.md](../BestPractices.md) - Patterns and pitfalls
