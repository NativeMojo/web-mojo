# MOJO Framework: Snake Case to Camel Case Migration Guide

## Overview

This guide outlines the migration from snake_case to camelCase naming conventions in the MOJO framework to align with JavaScript best practices and community standards.

## Why This Change?

JavaScript convention strongly favors camelCase for:
- Method names
- Property names
- Variable names
- Function names

Using snake_case violates ESLint rules and makes the codebase inconsistent with JavaScript ecosystem standards.

## Migration Mappings

### Core Method Names

| Old (snake_case) | New (camelCase) | Context |
|------------------|-----------------|---------|
| `on_init()` | `onInit()` | Page/View lifecycle |
| `on_params()` | `onParams()` | Page parameters |
| `on_action_*()` | `onAction*()` | Action handlers |
| `on_item_clicked()` | `onItemClicked()` | TablePage events |
| `on_item_dlg()` | `onItemDialog()` | TablePage events |
| `on_before_render()` | `onBeforeRender()` | View lifecycle |
| `on_after_render()` | `onAfterRender()` | View lifecycle |
| `on_before_mount()` | `onBeforeMount()` | View lifecycle |
| `on_after_mount()` | `onAfterMount()` | View lifecycle |
| `on_before_destroy()` | `onBeforeDestroy()` | View lifecycle |
| `on_after_destroy()` | `onAfterDestroy()` | View lifecycle |

### Property Names

| Old (snake_case) | New (camelCase) | Context |
|------------------|-----------------|---------|
| `page_name` | `pageName` | Page property |
| `collection_params` | `collectionParams` | Table configuration |
| `group_filtering` | `groupFiltering` | Table configuration |
| `list_options` | `listOptions` | Table configuration |
| `user_menu` | `userMenu` | Navigation |
| `menu_items` | `menuItems` | Navigation |
| `chart_type` | `chartType` | Chart configuration |
| `chart_data` | `chartData` | Chart configuration |
| `chart_options` | `chartOptions` | Chart configuration |
| `auth_methods` | `authMethods` | Authentication |
| `search_field` | `searchField` | Form fields |
| `display_field` | `displayField` | Form fields |
| `value_field` | `valueField` | Form fields |
| `min_chars` | `minChars` | Form validation |

### Data Attributes (HTML)

| Old | New | Usage |
|-----|-----|-------|
| `data-action="on_action_save"` | `data-action="save"` | Action triggers |
| `data-action="on_action_delete"` | `data-action="delete"` | Action triggers |

## Migration Examples

### Before (snake_case)

```javascript
class UsersTablePage extends TablePage {
  constructor(options = {}) {
    super({
      ...options,
      page_name: 'users',
      collection_params: {
        sort: 'name',
        order: 'asc'
      },
      group_filtering: true,
      list_options: {
        selectable: true
      }
    });
  }
  
  on_init() {
    console.log('Page initialized');
  }
  
  on_params(params, query) {
    console.log('Params received:', params);
  }
  
  async on_action_save() {
    // Save logic
  }
  
  async on_item_clicked(model, event) {
    // Handle item click
  }
}
```

### After (camelCase)

```javascript
class UsersTablePage extends TablePage {
  constructor(options = {}) {
    super({
      ...options,
      pageName: 'users',
      collectionParams: {
        sort: 'name',
        order: 'asc'
      },
      groupFiltering: true,
      listOptions: {
        selectable: true
      }
    });
  }
  
  onInit() {
    console.log('Page initialized');
  }
  
  onParams(params, query) {
    console.log('Params received:', params);
  }
  
  async onActionSave() {
    // Save logic
  }
  
  async onItemClicked(model, event) {
    // Handle item click
  }
}
```

## Action Handler Pattern Change

### Old Pattern
```javascript
// HTML
<button data-action="save">Save</button>

// JavaScript
async on_action_save() {
  // Handler code
}
```

### New Pattern
```javascript
// HTML (unchanged)
<button data-action="save">Save</button>

// JavaScript
async onActionSave() {
  // Handler code
}
```

The framework now automatically converts `data-action="save"` to call `onActionSave()`.

## Backward Compatibility Strategy

To ensure smooth migration, the framework provides a compatibility layer:

### Phase 1: Dual Support (Current)
Both naming conventions work:
```javascript
class MyPage extends Page {
  // Both work during migration
  on_init() { } // Deprecated but works
  onInit() { }  // Preferred
}
```

### Phase 2: Deprecation Warnings
Console warnings for snake_case usage:
```javascript
console.warn('Deprecated: on_init() is deprecated, use onInit() instead');
```

### Phase 3: Snake Case Removal
Complete removal of snake_case support in next major version.

## Migration Checklist

### For Each Component:

- [ ] Update constructor properties
  - [ ] `page_name` → `pageName`
  - [ ] `collection_params` → `collectionParams`
  - [ ] `group_filtering` → `groupFiltering`
  - [ ] `list_options` → `listOptions`

- [ ] Update lifecycle methods
  - [ ] `on_init()` → `onInit()`
  - [ ] `on_params()` → `onParams()`

- [ ] Update action handlers
  - [ ] `on_action_*()` → `onAction*()`
  - [ ] Update method names to PascalCase after onAction

- [ ] Update event handlers
  - [ ] `on_item_clicked()` → `onItemClicked()`
  - [ ] `on_item_dlg()` → `onItemDialog()`

- [ ] Update property access
  - [ ] `this.page_name` → `this.pageName`
  - [ ] All other snake_case properties

## Automated Migration Script

```bash
# Run the migration script (coming soon)
npm run migrate:camelcase

# Options:
# --dry-run    Preview changes without modifying files
# --backup     Create backup before migration
# --verbose    Show detailed migration log
```

## Common Pitfalls

### 1. Action Handler Naming
```javascript
// ❌ Wrong
async onActionsave() { }  // Missing capital S
async on_action_save() { } // Still using snake_case

// ✅ Correct
async onActionSave() { }
```

### 2. Property Access
```javascript
// ❌ Wrong
this.page_name = 'users';

// ✅ Correct
this.pageName = 'users';
```

### 3. HTML Data Attributes
```javascript
// ✅ HTML stays the same
<button data-action="save">Save</button>
<div data-page="user-profile">Profile</div>

// These use kebab-case which is HTML convention
```

## Framework Internal Changes

### View.js
- Action handler resolution updated to support camelCase
- Maintains backward compatibility during migration

### Page.js
- All lifecycle methods converted to camelCase
- Property names updated

### TablePage.js
- Event handlers converted to camelCase
- Configuration properties updated

## Testing Your Migration

### 1. Run ESLint
```bash
npm run lint
```

### 2. Run Tests
```bash
npm test
```

### 3. Check Console
Look for deprecation warnings in browser console.

## Resources

- [JavaScript Naming Conventions](https://developer.mozilla.org/en-US/docs/MDN/Guidelines/Code_guidelines/JavaScript#naming_conventions)
- [ESLint Camelcase Rule](https://eslint.org/docs/rules/camelcase)
- [MOJO Framework Documentation](../README.md)

## Timeline

- **Phase 1** (Current): Dual support, no warnings
- **Phase 2** (v2.1.0): Deprecation warnings added
- **Phase 3** (v3.0.0): Snake case support removed

## Need Help?

If you encounter issues during migration:
1. Check this guide for the correct mapping
2. Review the examples in `/examples/` directory
3. File an issue with the migration tag

---

**Note**: This migration improves code quality and aligns MOJO with JavaScript standards. While it requires some effort, the result is cleaner, more maintainable code that integrates better with modern JavaScript tooling.