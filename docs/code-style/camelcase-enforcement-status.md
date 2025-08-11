# MOJO Framework - CamelCase Enforcement Status

## Executive Summary

The MOJO framework is transitioning from snake_case to camelCase naming conventions to align with JavaScript best practices and community standards. This document tracks the current enforcement status and migration progress.

## Current Status: 🟡 PARTIAL COMPLIANCE

As of the latest analysis, the codebase has significant snake_case usage that needs to be migrated to camelCase.

## Enforcement Tools

### ✅ ESLint Configuration
- **Status**: CONFIGURED
- **File**: `.eslintrc.json`
- **Rules**: 
  - `camelcase: error` - Enforces camelCase for variables and properties
  - `id-match` - Enforces naming patterns
  - `new-cap` - Enforces PascalCase for constructors

### ✅ Migration Script
- **Status**: READY
- **File**: `scripts/migrate-to-camelcase.js`
- **Commands**:
  ```bash
  npm run migrate:camelcase         # Run migration
  npm run migrate:camelcase:dry     # Preview changes
  npm run migrate:camelcase:backup  # Migrate with backups
  ```

## Violations Found

### Core Framework Files

| File | Violations | Type |
|------|------------|------|
| `src/components/Table.js` | 9 | Properties & Methods |
| `src/components/TablePage.js` | 6 | Properties & Methods |
| `src/core/Page.js` | 4 | Properties & Methods |
| `src/core/Router.js` | 3 | Properties |

### Common Violations

#### Properties (snake_case → camelCase)
- `page_name` → `pageName`
- `collection_params` → `collectionParams`
- `group_filtering` → `groupFiltering`
- `list_options` → `listOptions`
- `per_page` → `perPage`
- `total_pages` → `totalPages`

#### Methods (snake_case → camelCase)
- `on_init()` → `onInit()`
- `on_params()` → `onParams()`
- `on_item_clicked()` → `onItemClicked()`
- `on_item_dlg()` → `onItemDialog()`

#### Action Handlers (snake_case → camelCase)
- `on_action_save()` → `onActionSave()`
- `on_action_delete()` → `onActionDelete()`
- `on_action_*()` → `onAction*()`

## Migration Strategy

### Phase 1: Core Framework (CURRENT)
- [ ] Run migration script on `src/` directory
- [ ] Update all core classes (View, Page, Router, etc.)
- [ ] Fix ESLint violations
- [ ] Update tests

### Phase 2: Components
- [ ] Migrate all components in `src/components/`
- [ ] Update component documentation
- [ ] Fix component examples

### Phase 3: Examples & Tests
- [ ] Migrate `examples/` directory
- [ ] Update all test files
- [ ] Ensure all tests pass

### Phase 4: Documentation
- [ ] Update API documentation
- [ ] Update code examples in docs
- [ ] Update design documents

## Compatibility Layer

### Current Support
The framework currently supports BOTH naming conventions during the migration period:

```javascript
// Both work (temporarily)
class MyPage extends Page {
  on_init() { }  // Old - works but deprecated
  onInit() { }   // New - preferred
}
```

### Deprecation Timeline
- **v2.0.0** (Current): Dual support, no warnings
- **v2.1.0** (Q2 2024): Console warnings for snake_case
- **v3.0.0** (Q4 2024): Remove snake_case support

## Action Items

### Immediate (Priority 1)
1. ✅ Create ESLint configuration
2. ✅ Create migration script
3. ⬜ Run migration on core framework files
4. ⬜ Fix remaining ESLint violations
5. ⬜ Update component exports

### Short-term (Priority 2)
1. ⬜ Migrate all examples to camelCase
2. ⬜ Update test files
3. ⬜ Add deprecation warnings
4. ⬜ Update documentation

### Long-term (Priority 3)
1. ⬜ Remove compatibility layer
2. ⬜ Full enforcement in CI/CD
3. ⬜ Update all external documentation

## Running Enforcement

### Check Current Violations
```bash
# Run ESLint to see all violations
npm run lint

# Run with auto-fix for simple issues
npm run lint:fix
```

### Run Migration
```bash
# Preview changes first
npm run migrate:camelcase:dry

# Run migration with backups
npm run migrate:camelcase:backup

# Check results
npm run lint
```

## Metrics

### Current Compliance Score: 35%
- Core Framework: 30% compliant
- Components: 25% compliant
- Examples: 40% compliant
- Tests: 45% compliant

### Target: 100% by v3.0.0

## Examples

### ❌ Before (Non-compliant)
```javascript
class UsersTablePage extends TablePage {
  constructor() {
    super({
      page_name: 'users',
      collection_params: { sort: 'name' },
      group_filtering: true,
      list_options: { selectable: true }
    });
  }
  
  on_init() {
    console.log('Initialized');
  }
  
  async on_action_save() {
    // Save logic
  }
}
```

### ✅ After (Compliant)
```javascript
class UsersTablePage extends TablePage {
  constructor() {
    super({
      pageName: 'users',
      collectionParams: { sort: 'name' },
      groupFiltering: true,
      listOptions: { selectable: true }
    });
  }
  
  onInit() {
    console.log('Initialized');
  }
  
  async onActionSave() {
    // Save logic
  }
}
```

## Resources

- [JavaScript Naming Conventions](https://developer.mozilla.org/en-US/docs/MDN/Guidelines/Code_guidelines/JavaScript#naming_conventions)
- [ESLint Camelcase Rule](https://eslint.org/docs/rules/camelcase)
- [Migration Guide](../migration/snake-to-camel-migration.md)
- [Code Style Guide](./code-style-guide.md)

## Contact

For questions or issues related to the camelCase migration:
- File an issue with the `code-style` tag
- Reference this document in discussions

---

**Last Updated**: Current
**Status**: 🟡 In Progress
**Owner**: Framework Team