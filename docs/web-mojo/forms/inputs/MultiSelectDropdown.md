# MultiSelectDropdown Component

Elegant multi-select dropdown with checkboxes, perfect for selecting multiple options from a list without cluttering the UI.

**Field Type:** `multiselect`

---

## Quick Start

```javascript
{
  type: 'multiselect',
  name: 'categories',
  label: 'Categories',
  options: ['Technology', 'Design', 'Marketing', 'Sales'],
  placeholder: 'Select categories...'
}
```

---

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | string | **required** | Field name |
| `label` | string | - | Field label |
| `options` | array | **required** | Options to select from |
| `placeholder` | string | `'Select...'` | Placeholder text |
| `value` | array | `[]` | Pre-selected values |
| `maxHeight` | number | `300` | Max dropdown height (px) |
| `searchable` | boolean | `false` | Enable search |
| `selectAll` | boolean | `false` | Show "Select All" button |
| `clearAll` | boolean | `false` | Show "Clear All" button |

---

## Usage Examples

### Basic Multi-Select

```javascript
{
  type: 'multiselect',
  name: 'skills',
  label: 'Skills',
  options: [
    { value: 'js', label: 'JavaScript' },
    { value: 'py', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'go', label: 'Go' }
  ],
  placeholder: 'Select your skills...'
}
```

### With Pre-selected Values

```javascript
{
  type: 'multiselect',
  name: 'permissions',
  label: 'Permissions',
  options: ['read', 'write', 'delete', 'admin'],
  value: ['read', 'write'], // Pre-selected
  placeholder: 'Select permissions...'
}
```

### With Search

```javascript
{
  type: 'multiselect',
  name: 'countries',
  label: 'Countries',
  options: countryList, // Large list of countries
  searchable: true,
  placeholder: 'Search countries...',
  maxHeight: 400
}
```

### With Select/Clear All

```javascript
{
  type: 'multiselect',
  name: 'features',
  label: 'Features',
  options: [
    'Email Notifications',
    'SMS Alerts',
    'Push Notifications',
    'Weekly Reports',
    'Monthly Reports'
  ],
  selectAll: true,
  clearAll: true,
  placeholder: 'Select features...'
}
```

---

## Options Format

### Array of Strings

```javascript
options: ['Option 1', 'Option 2', 'Option 3']
// Value and label are the same
```

### Array of Objects

```javascript
options: [
  { value: 'opt1', label: 'Option 1' },
  { value: 'opt2', label: 'Option 2' },
  { value: 'opt3', label: 'Option 3' }
]
```

### Object (key-value)

```javascript
options: {
  'opt1': 'Option 1',
  'opt2': 'Option 2',
  'opt3': 'Option 3'
}
```

---

## Value Handling

### Getting Selected Values

```javascript
const data = await form.getFormData();
console.log(data.categories); // ['tech', 'design', 'marketing']
```

### Setting Values

```javascript
form.setFieldValue('categories', ['tech', 'design']);
```

---

## Validation

```javascript
{
  type: 'multiselect',
  name: 'interests',
  label: 'Interests',
  options: interestList,
  required: true,
  validation: {
    minSelections: 2,
    maxSelections: 5,
    custom: (values) => {
      if (values.length < 2) {
        return 'Please select at least 2 interests';
      }
      if (values.length > 5) {
        return 'Maximum 5 interests allowed';
      }
      return true;
    }
  }
}
```

---

## Styling

```css
/* Custom dropdown styling */
.multiselect-dropdown {
  border: 1px solid var(--bs-border-color);
  border-radius: 0.375rem;
}

.multiselect-dropdown .option:hover {
  background-color: var(--bs-light);
}

.multiselect-dropdown .option.selected {
  background-color: var(--bs-primary-bg-subtle);
}
```

---

## Related Documentation

- [BasicTypes.md](../BasicTypes.md#select---dropdown) - Native select
- [CollectionMultiSelect.md](./CollectionMultiSelect.md) - Multi-select from API
- [FieldTypes.md](../FieldTypes.md) - All field types
