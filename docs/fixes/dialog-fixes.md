# Dialog Component Fixes

## Date: January 2025

## Issues Fixed

### 1. Kebab-Case Action Handlers
**Problem:** Dialog buttons using `data-action="show-small"` weren't triggering `onActionShowSmall` methods.

**Root Cause:** The View's `capitalize()` method only capitalized the first letter and didn't handle kebab-case conversion.

**Solution:** Updated `View.capitalize()` to convert kebab-case to PascalCase:
```javascript
// Before (View.js line 1044)
capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// After
capitalize(str) {
  // Handle kebab-case: 'show-modal' becomes 'ShowModal'
  if (str.includes('-')) {
    return str.split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  }
  return str.charAt(0).toUpperCase() + str.slice(1);
}
```

### 2. Dialog Element ID Assignment
**Problem:** Dialog constructor tried to set `this.element.id` before element was created, causing:
```
TypeError: Cannot set properties of null (setting 'id')
```

**Root Cause:** View's `element` is only created during `render()`, not in constructor.

**Solution:** Pass the modal ID to parent constructor instead of setting it afterward:
```javascript
// Before (Dialog.js)
constructor(options = {}) {
  super({ ...options });
  this.modalId = options.id || `modal-${Date.now()}`;
  this.element.id = this.modalId; // ERROR: element is null
}

// After
constructor(options = {}) {
  const modalId = options.id || `modal-${Date.now()}`;
  super({
    ...options,
    id: modalId,  // Pass ID to parent constructor
    // ... other options
  });
  this.modalId = modalId;
}
```

## How Dialog Works with Bootstrap

### Bootstrap Modal Integration
The Dialog component uses Bootstrap's JavaScript Modal class for proper modal behavior:

1. **Initialization** (in `onAfterMount`):
   ```javascript
   if (window.bootstrap && window.bootstrap.Modal) {
     this.modal = new window.bootstrap.Modal(this.element, {
       backdrop: this.backdrop,
       keyboard: this.keyboard,
       focus: this.focus
     });
   }
   ```

2. **Show/Hide Methods**:
   ```javascript
   show(relatedTarget = null) {
     if (this.modal) {
       this.modal.show(relatedTarget);
     }
   }
   
   hide() {
     if (this.modal) {
       this.modal.hide();
     }
   }
   ```

3. **Bootstrap Events**: Dialog listens to Bootstrap modal events and re-emits them:
   - `show.bs.modal` → `show`
   - `shown.bs.modal` → `shown`
   - `hide.bs.modal` → `hide`
   - `hidden.bs.modal` → `hidden`
   - `hidePrevented.bs.modal` → `hidePrevented`

### Requirements
- Bootstrap CSS (for styles)
- Bootstrap JavaScript Bundle (for modal functionality)
- Both are included in examples/index.html:
  ```html
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
  ```

## Usage Pattern in DialogsPage

```javascript
// Create dialog
const dialog = new Dialog({
  title: 'Example Dialog',
  size: 'lg',
  body: '<p>Content here</p>',
  buttons: [
    { text: 'Close', class: 'btn-secondary', dismiss: true }
  ]
});

// Show dialog
await dialog.render();
document.body.appendChild(dialog.element);
await dialog.mount();  // This triggers onAfterMount, initializing Bootstrap Modal
dialog.show();

// Clean up when hidden
dialog.on('hidden', () => {
  dialog.destroy();
  dialog.element.remove();
});
```

## Action Name Examples
With the fixed `capitalize()` method, these action names now work correctly:

| HTML data-action | Method Called |
|-----------------|---------------|
| `show-small` | `onActionShowSmall` |
| `show-default` | `onActionShowDefault` |
| `show-large` | `onActionShowLarge` |
| `show-xl` | `onActionShowXl` |
| `show-fullscreen` | `onActionShowFullscreen` |
| `show-view-dialog` | `onActionShowViewDialog` |
| `save-and-close` | `onActionSaveAndClose` |

## Testing
- Run examples server: `npm run dev`
- Navigate to: http://localhost:3000/examples
- Click on "Dialogs" in the sidebar
- All dialog buttons should now work correctly

## Files Modified
1. `/src/core/View.js` - Updated `capitalize()` method
2. `/src/components/Dialog.js` - Fixed element ID assignment in constructor

## Verification Tests
- `/test/verify-capitalize.js` - Tests kebab-case to PascalCase conversion
- `/test/verify-dialog.js` - Tests Dialog creation and Bootstrap integration
- `/test/unit/View-actions.test.js` - Unit tests for action handling