# CollectionSelect Component

Dropdown that fetches options from a Collection or API endpoint. Perfect for foreign key relationships and dynamic data sources.

**Field Type:** `collection`

---

## Quick Start

```javascript
import { UsersCollection } from '@/collections/UsersCollection.js';

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

---

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `Collection` | Collection | **required** | Collection class to fetch from |
| `name` | string | **required** | Field name |
| `label` | string | - | Field label |
| `labelField` | string | `'name'` | Model field for display |
| `valueField` | string | `'id'` | Model field for value |
| `placeholder` | string | `'Search...'` | Placeholder text |
| `value` | string/number | - | Initial value (ID) |
| `maxItems` | number | `10` | Max results to show |
| `emptyFetch` | boolean | `false` | Fetch options on init (empty query) |
| `debounceMs` | number | `300` | Search debounce delay |
| `collectionParams` | object | `{}` | Additional fetch parameters |

---

## Usage Examples

### User Selection

```javascript
{
  type: 'collection',
  name: 'assigned_to',
  label: 'Assigned To',
  Collection: UsersCollection,
  labelField: 'name',
  valueField: 'id',
  placeholder: 'Select user...'
}
```

### With Collection Parameters

```javascript
{
  type: 'collection',
  name: 'project_id',
  label: 'Project',
  Collection: ProjectsCollection,
  labelField: 'title',
  valueField: 'id',
  collectionParams: {
    status: 'active',
    sort: 'title'
  }
}
```

### Custom Label Format

```javascript
{
  type: 'collection',
  name: 'customer_id',
  label: 'Customer',
  Collection: CustomersCollection,
  labelField: 'full_name', // Use computed property
  valueField: 'id',
  placeholder: 'Search customers...'
}

// In Customer model:
get full_name() {
  return `${this.get('first_name')} ${this.get('last_name')}`;
}
```

### Pre-load Options

```javascript
{
  type: 'collection',
  name: 'category_id',
  label: 'Category',
  Collection: CategoriesCollection,
  labelField: 'name',
  valueField: 'id',
  emptyFetch: true, // Load all categories on init
  maxItems: 20
}
```

---

## Value Handling

### Getting Selected Value

```javascript
const data = await form.getFormData();
console.log(data.user_id); // "42" (the ID)
```

### Setting Value

```javascript
form.setFieldValue('user_id', 42);
```

### Getting Full Model

```javascript
const collectionSelect = form.getChildView('user_id');
const selectedModel = collectionSelect.getSelectedModel();
console.log(selectedModel.get('name')); // Full user data
```

---

## Collection Requirements

Your Collection must support search/filter:

```javascript
class UsersCollection extends Collection {
  get url() {
    return '/api/users';
  }
  
  // Handle search query
  fetch(options = {}) {
    if (options.search) {
      this.params.q = options.search;
    }
    return super.fetch(options);
  }
}
```

---

## Validation

```javascript
{
  type: 'collection',
  name: 'manager_id',
  label: 'Manager',
  Collection: UsersCollection,
  labelField: 'name',
  valueField: 'id',
  required: true,
  validation: {
    required: true,
    custom: async (value) => {
      // Verify user exists and is active
      const user = await fetch(`/api/users/${value}`);
      if (!user.active) {
        return 'Selected user is not active';
      }
      return true;
    }
  }
}
```

---

## Related Documentation

- [CollectionMultiSelect.md](./CollectionMultiSelect.md) - Multi-select from Collection
- [ComboInput.md](./ComboInput.md) - Editable dropdown
- [FieldTypes.md](../FieldTypes.md) - All field types
- Collection documentation - Learn about Collection class
