# Plan: Advanced Table Filtering with Django-Style Lookups (KISS Version)

## User Requirements (Confirmed)

1. ✅ **No auto-detection** - Explicit control over lookups
2. ✅ **Filter naming**: Use `key: 'status__in'` (combined, easier configuration)
3. ✅ **Smart parameter generation**: Single value uses simple key, multiple uses `__in`
4. ✅ **Display format**: Words (most readable) - "Status in 'new', 'open'"
5. ✅ **No search in dropdown** - Keep it simple, small lists only

## Goals

1. Create reusable `MultiSelectDropdown` component (standalone)
2. Support Django lookups in filter pills (parse `field__operator`)
3. Smart parameter generation (single value = `status=x`, multiple = `status__in=x,y`)
4. Human-readable filter pills

## Architecture (KISS)

### Component 1: MultiSelectDropdown (Standalone)

**File**: `src/core/forms/inputs/MultiSelectDropdown.js`

**Based on**: `CollectionMultiSelect.js` pattern (parent View with child ListItemsView)

**Structure**:
```javascript
// Child view for rendering items
class MultiSelectItemsView extends View {
  // Renders checkbox list
  // Handles select/deselect
  // Updates state without re-rendering parent
}

// Parent dropdown view
class MultiSelectDropdown extends View {
  onInit() {
    // Create child ListItemsView
    this.listView = new MultiSelectItemsView({
      containerId: 'items',
      options: this.options,
      value: this.value
    });
    this.addChild(this.listView);
  }
  
  // Template with dropdown button + container for items
  getTemplate() {
    return `
      <div class="dropdown">
        <button class="btn dropdown-toggle" data-bs-toggle="dropdown">
          <span>{{buttonText}}</span>
        </button>
        <div class="dropdown-menu" data-bs-auto-close="outside">
          <div data-container="items"></div>
        </div>
      </div>
    `;
  }
  
  getValue() { return this.listView.getValue(); }
  setValue(vals) { this.listView.setValue(vals); }
}
```

**Props**:
- `options`: `[{value, label}, ...]`
- `value`: `['val1', 'val2']` (array of selected)
- `placeholder`: "Select..."
- `buttonText`: Computed "3 selected" or placeholder

**NO SEARCH** - Keep it simple, just checkboxes

### Component 2: Django Lookups Utility

**File**: `src/core/utils/DjangoLookups.js`

**KISS Version** - Only support commonly used lookups:

```javascript
export const LOOKUPS = {
  // Comparison
  'exact': { display: 'is' },
  'in': { display: 'in' },
  'not': { display: 'is not' },
  'not_in': { display: 'not in' },
  'gt': { display: '>' },
  'gte': { display: '>=' },
  'lt': { display: '<' },
  'lte': { display: '<=' },
  
  // String
  'contains': { display: 'contains' },
  'icontains': { display: 'contains (case-insensitive)' },
  'startswith': { display: 'starts with' },
  'endswith': { display: 'ends with' },
  
  // Null
  'isnull': { display: (val) => val === 'true' ? 'is null' : 'is not null' }
};

export function parseFilterKey(paramKey) {
  const parts = paramKey.split('__');
  if (parts.length === 1) {
    return { field: paramKey, lookup: null };
  }
  
  const possibleLookup = parts[parts.length - 1];
  if (LOOKUPS[possibleLookup]) {
    return { 
      field: parts.slice(0, -1).join('__'), 
      lookup: possibleLookup 
    };
  }
  
  return { field: paramKey, lookup: null };
}

export function formatFilterDisplay(paramKey, value, label) {
  const { field, lookup } = parseFilterKey(paramKey);
  const lookupDef = LOOKUPS[lookup];
  
  if (!lookup || lookup === 'exact') {
    return `${label} is '${value}'`;
  }
  
  if (lookup === 'in' || lookup === 'not_in') {
    const values = value.split(',').map(v => `'${v}'`).join(', ');
    const verb = lookup === 'in' ? 'in' : 'not in';
    return `${label} ${verb} ${values}`;
  }
  
  if (lookup === 'isnull') {
    const display = lookupDef.display(value);
    return `${label} ${display}`;
  }
  
  if (lookupDef) {
    return `${label} ${lookupDef.display} '${value}'`;
  }
  
  return `${label} is '${value}'`;
}
```

### Component 3: TableView Enhancements

**File**: `src/core/views/table/TableView.js`

**Changes**:

1. **Import utility**:
```javascript
import { parseFilterKey, formatFilterDisplay } from '@core/utils/DjangoLookups.js';
```

2. **Update `setFilter()`** - Smart parameter generation:
```javascript
setFilter(key, value) {
  if (!this.collection) return;
  
  // Parse key to get field and lookup
  const { field, lookup } = parseFilterKey(key);
  
  // Clear old values
  delete this.collection.params[key];
  delete this.collection.params[field];
  delete this.collection.params[`${field}__in`];
  
  if (!value || (Array.isArray(value) && value.length === 0)) {
    return; // Cleared
  }
  
  // Smart param generation
  if (Array.isArray(value)) {
    if (value.length === 1) {
      // Single value from array - use simple key
      this.collection.params[field] = value[0];
    } else {
      // Multiple values - use __in
      this.collection.params[`${field}__in`] = value.join(',');
    }
  } else {
    // Single value - use key as-is (may include lookup)
    this.collection.params[key] = value;
  }
}
```

3. **Update `buildActivePills()`** - Use new formatter:
```javascript
buildActivePills() {
  const activeFilters = this.getActiveFilters();
  
  const pills = Object.entries(activeFilters).map(([paramKey, value]) => {
    const { field } = parseFilterKey(paramKey);
    const label = this.getFilterLabel(field);
    const displayText = formatFilterDisplay(paramKey, value, label);
    
    return `
      <span class="badge bg-primary">
        <button data-action="edit-filter" data-filter="${paramKey}">
          ${displayText}
        </button>
        <button class="btn-close" data-action="remove-filter" data-filter="${paramKey}"></button>
      </span>
    `;
  }).join('');
  
  return pills;
}
```

4. **Update `buildFilterDialogField()`** - Support multiselect:
```javascript
buildFilterDialogField(filterConfig, currentValue, filterKey) {
  if (filterConfig.type === 'multiselect') {
    // Convert comma-separated to array
    const valueArray = currentValue ? 
      (Array.isArray(currentValue) ? currentValue : currentValue.split(',')) : 
      [];
    
    return {
      type: 'multiselect',
      name: 'filter_value',
      label: filterConfig.label,
      options: filterConfig.options,
      value: valueArray
    };
  }
  
  // Existing logic for other types
  return {...};
}
```

5. **Update `extractFilterValue()`** - Handle multiselect arrays:
```javascript
extractFilterValue(filterConfig, formResult) {
  if (filterConfig.type === 'multiselect') {
    return formResult.filter_value; // Already an array
  }
  
  // Existing logic
  return formResult.filter_value;
}
```

6. **Update `onActionRemoveFilter()`** - Handle lookup keys:
```javascript
async onActionRemoveFilter(event, element) {
  const filterKey = element.getAttribute('data-filter');
  const { field } = parseFilterKey(filterKey);
  
  // Clear the filter using the original key
  this.setFilter(filterKey, null);
  await this.applyFilters();
}
```

## Implementation Steps

### Step 1: Create DjangoLookups Utility
- Create `src/core/utils/DjangoLookups.js`
- Export LOOKUPS object, parseFilterKey, formatFilterDisplay
- ~150 lines

### Step 2: Create MultiSelectDropdown Component  
- Create `src/core/forms/inputs/MultiSelectDropdown.js`
- Use View parent/child pattern (like CollectionMultiSelect)
- ListItemsView for checkbox rendering
- Parent manages dropdown state
- ~250 lines

### Step 3: Add CSS Styling
- Create `src/core/css/components/multiselect.css`
- Bootstrap dropdown styling
- Checkbox list styles
- ~80 lines

### Step 4: FormBuilder Integration
- Modify `src/core/forms/FormBuilder.js`
- Add 'multiselect' template
- Add renderMultiSelectField()
- ~50 lines

### Step 5: FormView Integration
- Modify `src/core/forms/FormView.js`
- Initialize MultiSelectDropdown components in `initializeCustomComponents()`
- Handle array values in `getFormData()`
- ~30 lines

### Step 6: TableView Filter Enhancement
- Modify `src/core/views/table/TableView.js`
- Update 5 methods (setFilter, buildActivePills, buildFilterDialogField, extractFilterValue, onActionRemoveFilter)
- ~100 lines of changes

### Step 7: Export and Documentation
- Add to `src/index.js` exports
- Update Forms.md with multiselect field type
- Update Table docs with filter examples

## Example Configurations

### Example 1: Status Multiselect Filter
```javascript
filters: [
  {
    key: 'status__in',  // Combined key with lookup
    label: 'Status',
    type: 'multiselect',
    options: [
      { value: 'new', label: 'New' },
      { value: 'open', label: 'Open' },
      { value: 'qa', label: 'QA' },
      { value: 'resolved', label: 'Resolved' },
      { value: 'ignored', label: 'Ignored' }
    ]
  }
]

// User selects ['new', 'open']
// Params: ?status__in=new,open
// Pill: "Status in 'new', 'open'"

// User selects only ['new']
// Params: ?status=new
// Pill: "Status is 'new'"
```

### Example 2: Date with GTE Lookup
```javascript
filters: [
  {
    key: 'created__gte',
    label: 'Created After',
    type: 'date'
  }
]

// User sets date: 2025-05-02
// Params: ?created__gte=2025-05-02
// Pill: "Created After >= May 2, 2025"
```

### Example 3: Text Contains Filter
```javascript
filters: [
  {
    key: 'name__icontains',
    label: 'Name',
    type: 'text'
  }
]

// User types: john
// Params: ?name__icontains=john
// Pill: "Name contains 'john' (case-insensitive)"
```

## Simplified Flow

### Adding Multiselect Filter
1. User clicks "Add Filter" → "Status"
2. Dialog shows multiselect dropdown
3. User clicks dropdown → checkboxes appear
4. User checks "New" and "Open"
5. User clicks Apply
6. TableView.setFilter('status__in', ['new', 'open'])
7. Params become: `?status__in=new,open`
8. Pill renders: **"Status in 'new', 'open'"**

### Editing Filter
1. User clicks pill
2. Dialog shows with checkboxes pre-selected
3. User changes selection
4. Apply → params update → pill updates

### Removing Filter
1. User clicks X on pill
2. `onActionRemoveFilter` gets `data-filter="status__in"`
3. Parses to field "status"
4. Clears all status variants
5. Pill disappears

## Benefits of This Approach

1. **KISS**: No search, no complex logic, just checkboxes
2. **Reusable**: MultiSelectDropdown works in forms AND filters
3. **Standard**: Based on CollectionMultiSelect pattern
4. **Smart**: Optimizes single value to simple param
5. **Explicit**: Developers control lookups via key naming
6. **Readable**: Pills show human-friendly text

## Files to Create/Modify

### Create:
- `src/core/forms/inputs/MultiSelectDropdown.js` (~250 lines)
- `src/core/utils/DjangoLookups.js` (~150 lines)
- `src/core/css/components/multiselect.css` (~80 lines)

### Modify:
- `src/core/forms/FormBuilder.js` (~50 lines added)
- `src/core/forms/FormView.js` (~30 lines added)
- `src/core/views/table/TableView.js` (~100 lines changed)
- `src/index.js` (add exports)

**Total**: ~660 lines

## Next: Implementation

Ready to implement if approved!
