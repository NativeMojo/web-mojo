# View Options Cleanup - Future Enhancement Request

## Problem Statement

The current options handling across the View hierarchy (View.js, Page.js, TableView.js) is inconsistent and not very clean. We have several patterns that make the code harder to maintain:

### Current Issues

1. **Inconsistent Access Patterns**
   - Some code uses `opts.property` in constructor
   - Some uses `this.options.property` 
   - Some stores properties directly on `this.property`

2. **Manual Default Handling**
   - Repetitive `??` operators everywhere: `opts.tagName ?? "div"`
   - Each class manually handles its own defaults
   - No centralized way to see what options are available

3. **Mixed Storage Strategies**
   - Some options stored as instance properties (`this.tagName`)
   - Others remain in `this.options` object
   - No clear pattern for when to use which approach

4. **Redundant Code**
   - Similar default-setting patterns repeated across classes
   - Each subclass reinvents option handling

### Example of Current Inconsistency

```javascript
// In View.js constructor:
this.tagName     = opts.tagName ?? "div";
this.className   = opts.className ?? "mojo-view";
this.debug       = opts.debug ?? false;
this.options = { ...opts }; // Keep original options too

// In TableView.js:
this.searchable = options.searchable !== false; // Different default pattern
this.sortable = options.sortable !== false;
this.clickAction = options.clickAction || "view"; // Another pattern
```

## Proposed Solution (For Future Consideration)

Create a centralized options system that provides:

1. **Static Default Definitions**
   ```javascript
   static get defaultOptions() {
     return {
       tagName: "div",
       className: "mojo-view",
       debug: false
       // etc...
     };
   }
   ```

2. **Automatic Option Merging**
   - Merge defaults from class hierarchy (base → specific)
   - Handle inheritance properly
   - Single source of truth for option values

3. **Consistent Helper Methods**
   ```javascript
   this.getOption('debug', false)     // Get with fallback
   this.isEnabled('searchable')       // Boolean check
   this.setOption('debug', true)      // Update option
   ```

4. **Clear Property Strategy**
   - Decide which options become direct properties
   - Keep everything in `this.options` for consistency
   - Provide helpers for common access patterns

## Benefits (Theoretical)

- **Consistency**: Same pattern across all view classes
- **Maintainability**: Clear default definitions
- **Discoverability**: Easy to see available options
- **Inheritance**: Proper option merging in subclasses
- **Flexibility**: Easy to add/modify options

## Concerns & Drawbacks

- **Migration Effort**: Would require touching many files
- **Performance**: Additional abstraction layer
- **Complexity**: Might be overengineering for current needs
- **Learning Curve**: Team would need to learn new patterns
- **Breaking Changes**: Could break existing code

## Current Status

**DEFERRED** - While this would provide cleaner code organization, the current system works and the benefits may not justify the refactoring effort at this time.

The existing inconsistencies, while not ideal, don't currently cause major problems. The manual `??` operators and mixed patterns are readable and functional.

## Future Triggers for Implementation

Consider implementing this if:
- Adding many new view classes with complex options
- Frequent bugs related to option handling
- Need for better tooling/IDE support for options
- Major refactoring effort is already underway
- Team grows and consistency becomes more important

## Files Affected

If implemented, would need changes to:
- `src/core/View.js` - Base implementation
- `src/core/Page.js` - Page-specific options
- `src/core/views/table/TableView.js` - Table options
- `src/core/views/list/ListView.js` - List options  
- Various other view subclasses
- Documentation and examples

## Alternative Approaches

Instead of a full options system, could consider:
1. **Documentation Only** - Document current patterns better
2. **Linting Rules** - Enforce consistent patterns via tooling
3. **Helper Functions** - Add utility functions without changing core architecture
4. **Gradual Migration** - Fix inconsistencies as encountered, no big rewrite

---

*Created: 2025-01-17*  
*Status: Future Enhancement Request*  
*Priority: Low*