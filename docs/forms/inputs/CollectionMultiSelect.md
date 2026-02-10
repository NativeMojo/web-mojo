# CollectionMultiSelect Component

Multi-select dropdown that fetches options from a Collection or API. Perfect for many-to-many relationships.

**Field Types:** `collectionmultiselect`, `collection-multiselect`

---

## Quick Start

```javascript
import { RolesCollection } from '@/collections/RolesCollection.js';

{
  type: 'collectionmultiselect',
  name: 'role_ids',
  label: 'Roles',
  Collection: RolesCollection,
  labelField: 'name',
  valueField: 'id',
  value: [1, 3, 5] // Pre-selected IDs
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
| `value` | array | `[]` | Pre-selected values (IDs) |
| `size` | number | `8` | Number of visible rows |
| `maxHeight` | number | `null` | Max height in pixels |
| `showSelectAll` | boolean | `true` | Show "Select All" button |
| `enableSearch` | boolean | `false` | Enable search filter |
| `searchPlaceholder` | string | `'Search...'` | Search input placeholder |
| `collectionParams` | object | `{}` | Additional fetch parameters |

---

## Usage Examples

### Basic Multi-Select

```javascript
{
  type: 'collectionmultiselect',
  name: 'tag_ids',
  label: 'Tags',
  Collection: TagsCollection,
  labelField: 'name',
  valueField: 'id',
  showSelectAll: true
}
```

### With Search

```javascript
{
  type: 'collectionmultiselect',
  name: 'permission_ids',
  label: 'Permissions',
  Collection: PermissionsCollection,
  labelField: 'display_name',
  valueField: 'id',
  enableSearch: true,
  searchPlaceholder: 'Filter permissions...',
  size: 12
}
```

### Pre-selected Values

```javascript
{
  type: 'collectionmultiselect',
  name: 'category_ids',
  label: 'Categories',
  Collection: CategoriesCollection,
  labelField: 'name',
  valueField: 'id',
  value: [1, 3, 7], // These IDs will be pre-selected
  showSelectAll: false
}
```

---

## Value Handling

### Getting Selected IDs

```javascript
const data = await form.getFormData();
console.log(data.role_ids); // [1, 3, 5]
```

### Setting Values

```javascript
form.setFieldValue('role_ids', [2, 4, 6]);
```

### Getting Full Models

```javascript
const multiSelect = form.getChildView('role_ids');
const selectedModels = multiSelect.getSelectedModels();
selectedModels.forEach(model => {
  console.log(model.get('name'));
});
```

---

## Collection Requirements

Collection should support fetching all items:

```javascript
class RolesCollection extends Collection {
  get url() {
    return '/api/roles';
  }
  
  // Optionally support filtering
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
  type: 'collectionmultiselect',
  name: 'skill_ids',
  label: 'Skills',
  Collection: SkillsCollection,
  labelField: 'name',
  valueField: 'id',
  validation: {
    minSelections: 2,
    maxSelections: 10,
    custom: (ids) => {
      if (ids.length < 2) {
        return 'Please select at least 2 skills';
      }
      if (ids.length > 10) {
        return 'Maximum 10 skills allowed';
      }
      return true;
    }
  }
}
```

---

## Common Patterns

### User Roles Assignment

```javascript
{
  type: 'collectionmultiselect',
  name: 'role_ids',
  label: 'Assign Roles',
  Collection: RolesCollection,
  labelField: 'name',
  valueField: 'id',
  enableSearch: true,
  help: 'Select one or more roles for this user'
}
```

### Product Categories

```javascript
{
  type: 'collectionmultiselect',
  name: 'category_ids',
  label: 'Categories',
  Collection: CategoriesCollection,
  labelField: 'name',
  valueField: 'id',
  collectionParams: {
    parent_id: 'null', // Only top-level categories
    active: true
  }
}
```

---

## Related Documentation

- [CollectionSelect.md](./CollectionSelect.md) - Single select from Collection
- [MultiSelectDropdown.md](./MultiSelectDropdown.md) - Multi-select from static list
- [FieldTypes.md](../FieldTypes.md) - All field types
