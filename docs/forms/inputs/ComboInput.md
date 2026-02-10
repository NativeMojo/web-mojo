# ComboInput Component

Editable dropdown that combines the flexibility of a text input with the convenience of a select dropdown. Users can type custom values or select from suggestions.

**Field Types:** `combo`, `combobox`, `autocomplete`

---

## Quick Start

```javascript
{
  type: 'combo',
  name: 'country',
  label: 'Country',
  options: ['United States', 'Canada', 'Mexico', 'United Kingdom'],
  placeholder: 'Type or select...',
  allowCustom: true
}
```

---

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | string | **required** | Field name |
| `label` | string | - | Field label |
| `options` | array | **required** | Available options |
| `placeholder` | string | `'Type or select...'` | Placeholder text |
| `value` | string | - | Initial value |
| `allowCustom` | boolean | `true` | Allow custom (non-list) values |
| `maxHeight` | number | `300` | Max dropdown height (px) |
| `minChars` | number | `1` | Min characters before showing suggestions |
| `caseSensitive` | boolean | `false` | Case-sensitive filtering |

---

## Usage Examples

### Basic Combo Input

```javascript
{
  type: 'combo',
  name: 'city',
  label: 'City',
  options: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'],
  allowCustom: true,
  placeholder: 'Type city name...'
}
```

### Strict Selection (No Custom Values)

```javascript
{
  type: 'combobox',
  name: 'state',
  label: 'State',
  options: [
    { value: 'CA', label: 'California' },
    { value: 'NY', label: 'New York' },
    { value: 'TX', label: 'Texas' }
  ],
  allowCustom: false, // Must select from list
  placeholder: 'Select state...'
}
```

### Autocomplete with API

```javascript
{
  type: 'autocomplete',
  name: 'username',
  label: 'Username',
  options: async (query) => {
    const response = await fetch(`/api/users/search?q=${query}`);
    const users = await response.json();
    return users.map(u => ({ value: u.id, label: u.name }));
  },
  minChars: 2,
  placeholder: 'Search users...'
}
```

---

## Options Format

### Static Options

```javascript
// Array of strings
options: ['Option 1', 'Option 2', 'Option 3']

// Array of objects
options: [
  { value: 'opt1', label: 'Option 1' },
  { value: 'opt2', label: 'Option 2' }
]
```

### Dynamic Options (Async)

```javascript
{
  type: 'combo',
  name: 'product',
  label: 'Product',
  options: async (query) => {
    // Fetch based on user input
    const response = await fetch(`/api/products/search?q=${query}`);
    return response.json();
  },
  minChars: 3
}
```

---

## Validation

```javascript
{
  type: 'combo',
  name: 'email',
  label: 'Email',
  options: recentEmails, // Suggest recent emails
  allowCustom: true,
  validation: {
    email: true,
    custom: (value) => {
      if (!value) return 'Email is required';
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value) || 'Invalid email format';
    }
  }
}
```

---

## Common Patterns

### Country/State Selector

```javascript
fields: [
  {
    type: 'combo',
    name: 'country',
    label: 'Country',
    options: ['United States', 'Canada', 'Mexico'],
    allowCustom: false,
    colClass: 'col-md-6'
  },
  {
    type: 'combo',
    name: 'state',
    label: 'State/Province',
    options: [], // Populated based on country
    colClass: 'col-md-6'
  }
]

// Update state options when country changes
form.on('field:change:country', (country) => {
  const states = getStatesForCountry(country);
  form.setFieldOptions('state', states);
});
```

### Tag-like Input with Suggestions

```javascript
{
  type: 'combo',
  name: 'category',
  label: 'Category',
  options: popularCategories,
  allowCustom: true,
  placeholder: 'Select or create category...'
}
```

---

## Related Documentation

- [BasicTypes.md](../BasicTypes.md#select---dropdown) - Native select
- [TagInput.md](./TagInput.md) - Tag input component
- [CollectionSelect.md](./CollectionSelect.md) - Select from API
- [FieldTypes.md](../FieldTypes.md) - All field types
