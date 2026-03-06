# Events (EventDelegate)

The EventDelegate system powers all user interactions in MOJO Views. It provides convention-based DOM event delegation that automatically routes clicks, changes, keyboard input, and form submissions to your View handlers. Every View gets an EventDelegate instance at `this.events`, and the View automatically manages its lifecycle.

---

## Table of Contents

### Overview
- [What is EventDelegate?](#what-is-eventdelegate)
- [Key Features](#key-features)
- [Convention Over Configuration](#convention-over-configuration)

### Quick Start
- [Basic Click Action](#basic-click-action)
- [Change Actions](#change-actions)
- [Form Submit Actions](#form-submit-actions)

### Core Concepts
- [Data Attributes](#data-attributes)
- [Handler Method Naming](#handler-method-naming)
- [Event Priority](#event-priority)
- [Handler Return Values](#handler-return-values)

### API Reference
- [Data Attributes Reference](#data-attributes-reference)
- [Handler Methods](#handler-methods)
- [Event Types](#event-types)
- [Lifecycle Methods](#lifecycle-methods)

### Click Events
- [Basic Click Actions](#basic-click-actions)
- [Navigation](#navigation)
- [External Links](#external-links)
- [Modifier Keys](#modifier-keys)

### Change Events
- [Select and Checkbox Changes](#select-and-checkbox-changes)
- [Change Action Wrappers](#change-action-wrappers)
- [onChange vs onAction](#onchange-vs-onaction)

### Input Events
- [Live Search](#live-search)
- [Debouncing](#debouncing)
- [Debounce Scope](#debounce-scope)

### Keyboard Events
- [Keydown Actions](#keydown-actions)
- [Change Keys](#change-keys)
- [Key Filtering](#key-filtering)

### Form Events
- [Form Submission](#form-submission)
- [Preventing Default Submission](#preventing-default-submission)
- [Form Data Handling](#form-data-handling)

### Handler Methods
- [handleAction{Name} - Force Consume](#handleactionname---force-consume)
- [onAction{Name} - Conditional Consume](#onactionname---conditional-consume)
- [onPassThruAction{Name} - Never Consume](#onpasstthruactionname---never-consume)
- [onChange{Name} - Change Events](#onchangename---change-events)
- [onActionDefault - Fallback](#onactiondefault---fallback)

### Navigation
- [Internal Links](#internal-links)
- [Page Navigation](#page-navigation)
- [Navigation Parameters](#navigation-parameters)
- [Router Integration](#router-integration)

### Advanced Features
- [Parent-Child Isolation](#parent-child-isolation)
- [Bootstrap Dropdown Integration](#bootstrap-dropdown-integration)
- [Error Handling](#error-handling)
- [Action Event Emission](#action-event-emission)

### Best Practices
- [When to Use Each Handler Type](#when-to-use-each-handler-type)
- [Naming Conventions](#naming-conventions)
- [Performance Tips](#performance-tips)
- [Accessibility](#accessibility)

### Integration
- [View Integration](#view-integration)
- [Template Integration](#template-integration)
- [Form Integration](#form-integration)

### Troubleshooting
- [Common Issues](#common-issues)
- [Debugging Events](#debugging-events)

---

## What is EventDelegate?

EventDelegate is a mixin that provides declarative DOM event handling for Views. Instead of manually attaching event listeners, you:

1. Add `data-action` (or similar) attributes to your HTML elements
2. Implement conventionally-named handler methods in your View
3. EventDelegate automatically routes events to the correct handlers

This approach is:
- **Declarative**: Event handling is visible in templates
- **Automatic**: No manual listener attachment/removal
- **Safe**: Automatic cleanup prevents memory leaks
- **Efficient**: Uses event delegation on the View root

---

## Key Features

- **Convention-Based**: Handler naming follows predictable patterns
- **Event Delegation**: All events delegated to View root (efficient)
- **Automatic Lifecycle**: View handles binding/unbinding automatically
- **Navigation Support**: Built-in handling for links and page navigation
- **Debounced Input**: Live search with configurable debouncing
- **Parent-Child Isolation**: Child views don't leak events to parents
- **Bootstrap Integration**: Auto-hide dropdowns on handled actions
- **Flexible Handlers**: Force-consume, conditional, or pass-through behaviors

---

## Convention Over Configuration

EventDelegate uses conventions to minimize boilerplate:

```html
<!-- Template: Add data-action -->
<button data-action="save">Save</button>

<!-- View: Implement handler -->
<script>
class MyView extends View {
  async onActionSave(event, element) {
    await this.save();
    return true; // Consume event
  }
}
</script>
```

No manual `addEventListener`, no cleanup code, no event handler registration. Just declare your intent in HTML and implement the handler.

---

## Basic Click Action

The simplest EventDelegate usage:

```html
<button data-action="save" class="btn btn-primary">Save</button>
```

```javascript
import { View } from '@core/View.js';

class SaveView extends View {
  constructor(options = {}) {
    super({
      template: '<button data-action="save" class="btn btn-primary">Save</button>',
      ...options
    });
  }
  
  async onActionSave(event, element) {
    console.log('Save button clicked');
    await this.saveData();
    return true; // Prevent default and stop propagation
  }
  
  async saveData() {
    // Your save logic
  }
}
```

---

## Change Actions

Handle select, checkbox, and radio changes:

```html
<div data-change-action="update-role">
  <label>Role:</label>
  <select name="role">
    <option value="user">User</option>
    <option value="admin">Admin</option>
  </select>
</div>
```

```javascript
class UserView extends View {
  async onChangeUpdateRole(event, wrapper) {
    const select = wrapper.querySelector('select');
    const newRole = select.value;
    
    console.log('Role changed to:', newRole);
    this.model.set('role', newRole);
    
    return true;
  }
}
```

---

## Form Submit Actions

Handle form submissions:

```html
<form data-action="submit-login">
  <input type="email" name="email" required />
  <input type="password" name="password" required />
  <button type="submit">Login</button>
</form>
```

```javascript
class LoginView extends View {
  async onActionSubmitLogin(event, form) {
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    await this.login(data);
    return true;
  }
  
  async login(credentials) {
    // Your login logic
  }
}
```

---

## Data Attributes

EventDelegate recognizes these data attributes:

### data-action="name"
Primary action attribute for clicks, submits, and keydown events.

```html
<button data-action="save">Save</button>
<button data-action="delete-item">Delete</button>
<form data-action="submit-form">...</form>
```

### data-change-action="name"
Action triggered by change, input, or keydown events.

```html
<div data-change-action="filter">
  <select>...</select>
</div>
```

### data-change-keys="Enter, Escape"
Comma-separated list of keys that trigger `data-change-action` via keydown. Defaults to "Enter".

```html
<div data-change-action="search" data-change-keys="Enter, Escape">
  <input type="text" />
</div>
```

### data-filter="live-search"
Marks an input for debounced live search behavior. Must be inside a `data-change-action` wrapper.

```html
<div data-change-action="search">
  <input type="text" data-filter="live-search" />
</div>
```

### data-filter-debounce="300"
Debounce delay in milliseconds for live search (default: 300ms). Set on the `data-change-action` wrapper.

```html
<div data-change-action="search" data-filter-debounce="500">
  <input type="text" data-filter="live-search" />
</div>
```

### data-container="scope"
Scope identifier for debounce timers. Allows multiple independent live searches with the same action name.

```html
<div data-change-action="search" data-container="users">
  <input type="text" data-filter="live-search" />
</div>

<div data-change-action="search" data-container="products">
  <input type="text" data-filter="live-search" />
</div>
```

### data-page="PageName"
Navigate to a page by name.

```html
<button data-page="UserProfile" data-params='{"id":123}'>View Profile</button>
```

### data-params='{"key":"value"}'
JSON object with parameters for page navigation.

```html
<button data-page="EditUser" data-params='{"userId":42,"tab":"settings"}'>Edit</button>
```

### data-external
Marks an anchor as external so the framework won't intercept navigation.

```html
<a href="https://example.com" data-external>External Site</a>
```

---

## Handler Method Naming

EventDelegate converts action names to PascalCase and looks for handler methods in this order:

1. **`handleAction{Name}`** - Always consumes event
2. **`onAction{Name}`** - Conditionally consumes based on return value
3. **`onPassThruAction{Name}`** - Never consumes, always passes through
4. **`onActionDefault`** - Fallback for undefined actions

### PascalCase Conversion

| Action Name | Handler Method |
|-------------|----------------|
| `save` | `handleActionSave` or `onActionSave` |
| `delete-item` | `handleActionDeleteItem` or `onActionDeleteItem` |
| `user-login` | `handleActionUserLogin` or `onActionUserLogin` |
| `toggle-panel` | `handleActionTogglePanel` or `onActionTogglePanel` |

### Change Actions

For `data-change-action`, EventDelegate first tries:
- **`onChange{Name}`**

If not found, falls back to standard action chain:
- `handleAction{Name}` → `onAction{Name}` → `onPassThruAction{Name}` → `onActionDefault`

---

## Event Priority

EventDelegate handles DOM events in this priority:

1. **Click**
   - If `data-action` present → dispatch action
   - Else if anchor with href → navigation
   - Else if `data-page` → navigation

2. **Change**
   - Find closest `data-change-action` wrapper
   - Try `onChange{Name}` first
   - Else fall back to standard action chain

3. **Input** (debounced)
   - Only for `data-filter="live-search"`
   - Must be inside `data-change-action` wrapper
   - Debounced by `data-filter-debounce` (default 300ms)

4. **Keydown**
   - Find closest `data-change-action` wrapper
   - Check if key is in `data-change-keys`
   - Dispatch through standard action chain (NOT onChange)

5. **Submit**
   - If form has `data-action` → dispatch action

---

## Handler Return Values

Handler methods can return values to control event consumption:

### handleAction{Name}
**Always consumes** - Return value ignored. Event is always prevented and stopped.

```javascript
async handleActionSave(event, element) {
  await this.save();
  // Event automatically consumed
}
```

### onAction{Name}
**Conditionally consumes** based on return value:
- `true` or truthy → Event consumed (preventDefault + stopPropagation)
- `false` or falsy → Event passes through (default behavior continues)

```javascript
async onActionSave(event, element) {
  const saved = await this.save();
  return saved; // Consume only if save succeeded
}
```

### onPassThruAction{Name}
**Never consumes** - Always treated as pass-through regardless of return value.

```javascript
async onPassThruActionTrack(event, element) {
  await this.analytics.track('click');
  // Event always passes through
}
```

---

## Data Attributes Reference

| Attribute | Used On | Purpose | Example |
|-----------|---------|---------|---------|
| `data-action` | Any element | Primary action for click/submit/keydown | `<button data-action="save">` |
| `data-change-action` | Wrapper element | Action for change/input/keydown events | `<div data-change-action="filter">` |
| `data-change-keys` | Same as data-change-action | Keys that trigger action (default: Enter) | `data-change-keys="Enter, Escape"` |
| `data-filter` | Input element | Enable live search behavior | `<input data-filter="live-search">` |
| `data-filter-debounce` | Same as data-change-action | Debounce delay in ms (default: 300) | `data-filter-debounce="500"` |
| `data-container` | Same as data-change-action | Scope for debounce timers | `data-container="users"` |
| `data-page` | Any element | Navigate to page by name | `<button data-page="UserProfile">` |
| `data-params` | Same as data-page | JSON params for navigation | `data-params='{"id":123}'` |
| `data-external` | Anchor element | Mark link as external (no intercept) | `<a href="..." data-external>` |

---

## Handler Methods

### handleAction{Name}
Force-consume handler that always prevents default and stops propagation.

**Signature:** `handleAction{Name}(event, element)`

**Use when:** You always want to consume the event.

```javascript
async handleActionSave(event, button) {
  // Always consumes event
  await this.model.save();
}
```

---

### onAction{Name}
Conditional handler that consumes based on return value.

**Signature:** `async onAction{Name}(event, element) => boolean`

**Use when:** You may conditionally want default behavior to continue.

```javascript
async onActionSave(event, button) {
  const success = await this.model.save();
  return success; // Consume only if saved
}
```

---

### onPassThruAction{Name}
Pass-through handler that never consumes the event.

**Signature:** `async onPassThruAction{Name}(event, element)`

**Use when:** You want to run code but allow default behavior (e.g., analytics).

```javascript
async onPassThruActionTrackClick(event, link) {
  // Analytics tracking
  await this.analytics.track('link_click', {
    href: link.href
  });
  // Event passes through, navigation continues
}
```

---

### onChange{Name}
Change-specific handler for `data-change-action`.

**Signature:** `async onChange{Name}(event, wrapper)`

**Use when:** Handling select, checkbox, or radio changes.

```javascript
async onChangeFilter(event, wrapper) {
  const select = wrapper.querySelector('select');
  await this.applyFilter(select.value);
  return true;
}
```

---

### onActionDefault
Fallback handler for undefined actions.

**Signature:** `onActionDefault(action, event, element) => boolean`

**Use when:** You want to handle all unknown actions generically.

```javascript
onActionDefault(action, event, element) {
  console.log('Unhandled action:', action);
  return false; // Pass through
}
```

---

## Event Types

EventDelegate binds these DOM events on the View root:

### click
- Dispatches `data-action` if present
- Otherwise handles navigation for anchors or `data-page`
- Respects modifier keys (ctrl/cmd/shift) and middle-click

### change
- Finds closest `data-change-action` wrapper
- Tries `onChange{Name}` first, then standard action chain
- Triggered by select, checkbox, radio changes

### input
- Only for `[data-filter="live-search"]` inside `data-change-action` wrapper
- Debounced by `data-filter-debounce` (default 300ms)
- Uses `data-container` for debounce scope

### keydown
- Finds closest `data-change-action` wrapper
- Checks if key is in `data-change-keys` (default: Enter)
- Dispatches through standard action chain (NOT onChange)
- Skips inputs with `[data-filter="search"]`

### submit
- If form has `data-action`, preventDefault and dispatch action
- Otherwise allows default form submission

---

## Lifecycle Methods

EventDelegate lifecycle is managed by View:

### View.bindEvents()
Called automatically after `render()` and before `mount()`. Attaches event listeners to View root.

### View.unbindEvents()
Called automatically before `render()`, `unmount()`, and `destroy()`. Removes event listeners and clears debounce timers.

You typically don't call these methods directly—View manages them for you.

---

## Basic Click Actions

Handle button clicks and link clicks:

```html
<div class="toolbar">
  <button data-action="save" class="btn btn-primary">Save</button>
  <button data-action="cancel" class="btn btn-secondary">Cancel</button>
  <button data-action="delete-item" class="btn btn-danger">Delete</button>
</div>
```

```javascript
class ToolbarView extends View {
  async onActionSave(event, button) {
    await this.save();
    return true;
  }
  
  async onActionCancel(event, button) {
    this.reset();
    return true;
  }
  
  async onActionDeleteItem(event, button) {
    const confirmed = await this.confirmDelete();
    if (confirmed) {
      await this.delete();
      return true;
    }
    return false; // Don't consume if cancelled
  }
}
```

---

## Navigation

EventDelegate handles internal link navigation automatically:

```html
<!-- Internal link - intercepted by EventDelegate -->
<a href="/users/123">View User</a>

<!-- External link - passed through -->
<a href="https://example.com">External Site</a>

<!-- External link with data-external -->
<a href="/external-handler" data-external>External</a>
```

Navigation is intercepted unless:
- Ctrl/Cmd/Shift is pressed, or middle-click
- `data-external` is present
- URL is external (http(s), mailto, tel, etc.)
- Element has `data-action` (action takes precedence)

---

## External Links

Mark links as external to prevent interception:

```html
<!-- External by protocol -->
<a href="https://example.com">External Site</a>
<a href="mailto:user@example.com">Email</a>
<a href="tel:+1234567890">Call</a>

<!-- External by attribute -->
<a href="/download" data-external>Download File</a>
<a href="/legacy-page" data-external>Legacy Page</a>
```

---

## Modifier Keys

EventDelegate respects modifier keys for navigation:

```javascript
// User clicks link with ctrl/cmd → Open in new tab
// User clicks link with shift → Open in new window
// User middle-clicks link → Open in new tab
// All of these bypass EventDelegate interception

// Normal click → EventDelegate intercepts and routes
```

---

## Select and Checkbox Changes

Handle form control changes:

```html
<div class="filters">
  <div data-change-action="filter-status">
    <label>Status:</label>
    <select name="status">
      <option value="">All</option>
      <option value="active">Active</option>
      <option value="inactive">Inactive</option>
    </select>
  </div>
  
  <div data-change-action="toggle-featured">
    <label>
      <input type="checkbox" name="featured" />
      Featured Only
    </label>
  </div>
</div>
```

```javascript
class FilterView extends View {
  async onChangeFilterStatus(event, wrapper) {
    const select = wrapper.querySelector('select');
    await this.applyFilter({ status: select.value });
    return true;
  }
  
  async onChangeToggleFeatured(event, wrapper) {
    const checkbox = wrapper.querySelector('input[type="checkbox"]');
    await this.applyFilter({ featured: checkbox.checked });
    return true;
  }
}
```

---

## Change Action Wrappers

Use wrapper elements with `data-change-action`:

```html
<!-- Wrapper pattern -->
<div data-change-action="update-settings">
  <label>Theme:</label>
  <select name="theme">
    <option value="light">Light</option>
    <option value="dark">Dark</option>
  </select>
  
  <label>Language:</label>
  <select name="language">
    <option value="en">English</option>
    <option value="es">Spanish</option>
  </select>
</div>
```

```javascript
async onChangeUpdateSettings(event, wrapper) {
  // Any change within wrapper triggers this handler
  const formData = new FormData(wrapper);
  const settings = Object.fromEntries(formData.entries());
  
  await this.updateSettings(settings);
  return true;
}
```

---

## onChange vs onAction

**onChange{Name}**
- Only for `data-change-action`
- Triggered by `change` event (and debounced `input`)
- First priority for change actions

**onAction{Name}**
- For `data-action` and `data-change-action` (fallback)
- Triggered by `click`, `submit`, `keydown`
- Second priority for change actions

```javascript
// Change event → tries onChange first
async onChangeFilter(event, wrapper) {
  // Handles change event
  return true;
}

// Keydown event → uses onAction (NOT onChange)
async onActionFilter(event, wrapper) {
  // Handles keydown event when Enter pressed
  return true;
}
```

---

## Live Search

Implement debounced search-as-you-type:

```html
<div class="search" data-change-action="search" data-filter-debounce="300">
  <input 
    type="text" 
    placeholder="Search users..." 
    data-filter="live-search"
  />
</div>
```

```javascript
class SearchView extends View {
  async onChangeSearch(event, wrapper) {
    const input = wrapper.querySelector('input');
    const query = input.value;
    
    console.log('Searching for:', query);
    await this.performSearch(query);
    
    return true;
  }
  
  async performSearch(query) {
    await this.collection.setParams({ search: query }, true);
  }
}
```

**Behavior:**
- User types "a" → Debounce timer starts (300ms)
- User types "l" → Timer resets (300ms)
- User types "i" → Timer resets (300ms)
- User types "c" → Timer resets (300ms)
- User types "e" → Timer resets (300ms)
- [300ms of inactivity]
- `onChangeSearch` fires with "alice"

---

## Debouncing

Configure debounce delay:

```html
<!-- Default debounce: 300ms -->
<div data-change-action="search">
  <input type="text" data-filter="live-search" />
</div>

<!-- Custom debounce: 500ms -->
<div data-change-action="search" data-filter-debounce="500">
  <input type="text" data-filter="live-search" />
</div>

<!-- Immediate (no debounce): 0ms -->
<div data-change-action="search" data-filter-debounce="0">
  <input type="text" data-filter="live-search" />
</div>
```

---

## Debounce Scope

Use `data-container` to scope multiple live searches:

```html
<!-- Independent debounce scopes -->
<div data-change-action="search" data-container="users">
  <input type="text" data-filter="live-search" placeholder="Search users..." />
</div>

<div data-change-action="search" data-container="products">
  <input type="text" data-filter="live-search" placeholder="Search products..." />
</div>
```

Without `data-container`, both would share the same debounce timer and interfere with each other.

---

## Keydown Actions

Trigger actions with keyboard:

```html
<!-- Press Enter in input to trigger search -->
<div data-change-action="search" data-change-keys="Enter">
  <input type="text" placeholder="Type and press Enter" />
</div>

<!-- Press Enter or Escape to trigger action -->
<div data-change-action="apply-filter" data-change-keys="Enter, Escape">
  <select name="filter">
    <option value="all">All</option>
    <option value="active">Active</option>
  </select>
</div>
```

```javascript
async onActionSearch(event, wrapper) {
  // Note: Uses onAction, NOT onChange
  const input = wrapper.querySelector('input');
  await this.search(input.value);
  return true;
}

async onActionApplyFilter(event, wrapper) {
  if (event.key === 'Escape') {
    this.clearFilter();
  } else {
    const select = wrapper.querySelector('select');
    await this.applyFilter(select.value);
  }
  return true;
}
```

---

## Change Keys

Configure which keys trigger `data-change-action`:

```html
<!-- Default: Enter only -->
<div data-change-action="search">
  <input type="text" />
</div>

<!-- Multiple keys: Enter or Escape -->
<div data-change-action="search" data-change-keys="Enter, Escape">
  <input type="text" />
</div>

<!-- Single custom key: Tab -->
<div data-change-action="next-field" data-change-keys="Tab">
  <input type="text" />
</div>
```

Key names match `event.key` values (case-sensitive):
- `Enter`
- `Escape`
- `Tab`
- `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`
- `Space`
- Letter keys: `a`, `A`, etc.

---

## Key Filtering

EventDelegate skips keydown handling for `[data-filter="search"]`:

```html
<!-- Keydown events skipped (search-specific input) -->
<input type="text" data-filter="search" />

<!-- Keydown events processed normally -->
<input type="text" />
```

This prevents conflicts with search-specific keyboard shortcuts.

---

## Form Submission

Handle form submissions with `data-action`:

```html
<form data-action="submit-registration">
  <input type="text" name="username" required />
  <input type="email" name="email" required />
  <input type="password" name="password" required />
  <button type="submit">Register</button>
</form>
```

```javascript
class RegistrationView extends View {
  async onActionSubmitRegistration(event, form) {
    // Automatically preventDefault called
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    // Validate
    if (!this.validate(data)) {
      this.showErrors();
      return true;
    }
    
    // Submit
    const response = await this.register(data);
    
    if (response.success) {
      this.showSuccess();
    } else {
      this.showErrors(response.errors);
    }
    
    return true;
  }
  
  validate(data) {
    // Validation logic
    return true;
  }
  
  async register(data) {
    // API call
  }
}
```

---

## Preventing Default Submission

EventDelegate automatically prevents default for forms with `data-action`:

```html
<!-- Default submission prevented -->
<form data-action="submit-form" action="/fallback" method="POST">
  <input type="text" name="field" />
  <button type="submit">Submit</button>
</form>

<!-- Default submission allowed (no data-action) -->
<form action="/submit" method="POST">
  <input type="text" name="field" />
  <button type="submit">Submit</button>
</form>
```

---

## Form Data Handling

Extract form data in handlers:

```javascript
async onActionSubmitForm(event, form) {
  // FormData API
  const formData = new FormData(form);
  
  // Convert to object
  const data = Object.fromEntries(formData.entries());
  console.log(data); // { username: '...', email: '...' }
  
  // Access specific fields
  const username = formData.get('username');
  
  // Handle multiple values (e.g., checkboxes)
  const roles = formData.getAll('roles[]');
  
  await this.submit(data);
  return true;
}
```

---

## handleAction{Name} - Force Consume

Always prevents default and stops propagation:

```javascript
// Use when you ALWAYS want to consume the event
async handleActionSave(event, button) {
  await this.model.save();
  // Event automatically consumed
}

async handleActionDeleteItem(event, button) {
  await this.confirmAndDelete();
  // Event automatically consumed, even if user cancels
}
```

**When to use:**
- You always want to prevent default behavior
- There's no conditional logic for consumption
- The handler always performs the action

---

## onAction{Name} - Conditional Consume

Conditionally prevents default based on return value:

```javascript
// Use when consumption depends on conditions
async onActionSave(event, button) {
  const isValid = this.validate();
  if (!isValid) {
    this.showValidationErrors();
    return true; // Consume event, don't continue
  }
  
  const success = await this.model.save();
  return success; // Consume only if save succeeded
}

async onActionNavigate(event, link) {
  if (this.hasUnsavedChanges()) {
    const confirmed = await this.confirmLeave();
    return confirmed; // Consume if user cancels
  }
  return false; // Allow navigation
}
```

**When to use:**
- Consumption depends on validation or user confirmation
- You may want default behavior in some cases
- You need fine-grained control

---

## onPassThruAction{Name} - Never Consume

Never prevents default, always passes through:

```javascript
// Use for analytics, logging, instrumentation
async onPassThruActionTrackClick(event, element) {
  await this.analytics.track('click', {
    element: element.dataset.action,
    href: element.href
  });
  // Event passes through, navigation continues
}

async onPassThruActionLog(event, element) {
  console.log('User clicked:', element.textContent);
  // Event passes through
}
```

**When to use:**
- Analytics tracking
- Logging
- Instrumentation
- You want to observe but not interfere

**Important:** Put `data-action` on a child element inside an anchor (not on the anchor itself) for pass-through + navigation:

```html
<!-- Pass-through action + navigation -->
<a href="/products/123" class="product-link">
  <span data-action="track-product-click">Product Name</span>
</a>
```

---

## onChange{Name} - Change Events

Specific handler for `data-change-action` change events:

```javascript
// Use for select, checkbox, radio changes
async onChangeFilterStatus(event, wrapper) {
  const select = wrapper.querySelector('select');
  await this.applyFilter({ status: select.value });
  return true;
}

async onChangeToggleOption(event, wrapper) {
  const checkbox = wrapper.querySelector('input[type="checkbox"]');
  this.updateOption(checkbox.checked);
  return true;
}
```

**When to use:**
- Handling select, checkbox, or radio changes
- Distinct logic from keydown handling
- You want change-specific behavior

**Note:** Keydown events use `onAction{Name}`, NOT `onChange{Name}`.

---

## onActionDefault - Fallback

Fallback for undefined actions:

```javascript
onActionDefault(action, event, element) {
  console.warn('Unhandled action:', action);
  
  // You can handle generically
  if (action.startsWith('open-')) {
    const target = action.replace('open-', '');
    this.openPanel(target);
    return true;
  }
  
  // Or emit custom event
  this.emit(`action:${action}`, { event, element });
  
  return false; // Pass through if not handled
}
```

**When to use:**
- Generic action handling
- Debugging missing handlers
- Plugin-style architecture where actions are dynamic

---

## Internal Links

Internal links are automatically intercepted:

```html
<!-- Intercepted by EventDelegate -->
<a href="/users">Users</a>
<a href="/settings">Settings</a>
<a href="/users/123/edit">Edit User</a>

<!-- Not intercepted (external) -->
<a href="https://example.com">External</a>
<a href="mailto:user@example.com">Email</a>
```

EventDelegate uses the Router to navigate:

```javascript
// Equivalent to:
router.navigateTo('/users');
```

---

## Page Navigation

Navigate by page name:

```html
<button data-page="UserProfile">View Profile</button>
<button data-page="EditUser" data-params='{"id":123}'>Edit User</button>
<a href="#" data-page="Dashboard">Dashboard</a>
```

EventDelegate calls `app.showPage()` if available, otherwise uses Router:

```javascript
// Equivalent to:
app.showPage('UserProfile');
app.showPage('EditUser', { id: 123 });
```

---

## Navigation Parameters

Pass parameters to pages with `data-params`:

```html
<button 
  data-page="UserProfile" 
  data-params='{"userId":123,"tab":"settings"}'
>
  View Profile Settings
</button>
```

**Important:** `data-params` must be valid JSON:

```html
<!-- Good: Valid JSON -->
data-params='{"id":123,"name":"Alice"}'

<!-- Bad: Invalid JSON (single quotes) -->
data-params="{'id':123,'name':'Alice'}"

<!-- Bad: Invalid JSON (unquoted keys) -->
data-params="{id:123,name:'Alice'}"
```

---

## Router Integration

EventDelegate integrates with the Router for navigation:

```javascript
// Router is used for internal link navigation
<a href="/users/123">View User</a>
// → router.navigateTo('/users/123')

// App is used for page navigation (if available)
<button data-page="UserProfile" data-params='{"id":123}'>Profile</button>
// → app.showPage('UserProfile', { id: 123 })
// → Falls back to router if app not available
```

---

## Parent-Child Isolation

EventDelegate prevents parent views from double-handling child view events:

```javascript
class ParentView extends View {
  constructor(options = {}) {
    super({
      template: `
        <div class="parent">
          <button data-action="save">Parent Save</button>
          <div id="child-container"></div>
        </div>
      `,
      ...options
    });
    
    const child = new ChildView();
    this.addChild(child);
    child.containerId = 'child-container';
  }
  
  async onActionSave(event, button) {
    console.log('Parent save');
    // Only handles parent button clicks
    return true;
  }
}

class ChildView extends View {
  constructor(options = {}) {
    super({
      template: '<button data-action="save">Child Save</button>',
      ...options
    });
  }
  
  async onActionSave(event, button) {
    console.log('Child save');
    // Only handles child button clicks
    // Parent won't see this event
    return true;
  }
}
```

**How it works:**
- Each View's EventDelegate only "owns" events within its DOM (not in child Views)
- When a child handles an event, it marks `event.handledByChild = true`
- Parents see this flag and skip handling

---

## Bootstrap Dropdown Integration

EventDelegate auto-hides Bootstrap dropdowns when actions are handled:

```html
<div class="dropdown">
  <button class="btn dropdown-toggle" data-bs-toggle="dropdown">
    Actions
  </button>
  <ul class="dropdown-menu">
    <li><a class="dropdown-item" href="#" data-action="edit">Edit</a></li>
    <li><a class="dropdown-item" href="#" data-action="delete">Delete</a></li>
    <li><a class="dropdown-item" href="#" data-action="archive">Archive</a></li>
  </ul>
</div>
```

```javascript
async onActionEdit(event, link) {
  await this.edit();
  return true; // Dropdown automatically hides
}

async onActionDelete(event, link) {
  await this.delete();
  return true; // Dropdown automatically hides
}
```

**How it works:**
- EventDelegate detects if element is inside `.dropdown-menu`
- If action is handled (returns true), finds Bootstrap Dropdown instance and hides it

---

## Error Handling

EventDelegate catches errors in handlers and calls `view.handleActionError()`:

```javascript
class MyView extends View {
  async onActionSave(event, button) {
    // If this throws, handleActionError is called
    throw new Error('Save failed');
  }
  
  // Override to customize error handling
  async handleActionError(action, error, event, element) {
    console.error('Action error:', action, error);
    
    // Show user-friendly message
    await Dialog.alert(
      `Failed to ${action}: ${error.message}`,
      'Error',
      { class: 'text-danger' }
    );
  }
}
```

Default `handleActionError` shows an error dialog (if Dialog is available).

---

## Action Event Emission

If no handler method exists, EventDelegate emits a custom event:

```html
<button data-action="custom-action">Custom</button>
```

```javascript
class MyView extends View {
  async onAfterMount() {
    // No onActionCustomAction defined
    // So EventDelegate emits 'action:custom-action'
    
    this.on('action:custom-action', ({ event, element }) => {
      console.log('Custom action fired');
    });
  }
}
```

This allows plugin-style architectures where actions are handled dynamically.

---

## When to Use Each Handler Type

### handleAction{Name}
**Use when:**
- You always want to prevent default behavior
- No conditional logic needed
- Example: Save buttons, delete confirmations

```javascript
async handleActionSave(event, button) {
  await this.save();
}
```

### onAction{Name}
**Use when:**
- Consumption depends on conditions
- You may want default behavior sometimes
- Example: Navigation with unsaved changes check

```javascript
async onActionNavigate(event, link) {
  if (this.isDirty()) {
    const confirmed = await this.confirmLeave();
    return confirmed;
  }
  return false; // Allow navigation
}
```

### onPassThruAction{Name}
**Use when:**
- Analytics or logging
- You never want to interfere with default behavior
- Example: Click tracking

```javascript
async onPassThruActionTrack(event, element) {
  await this.analytics.track('click');
}
```

### onChange{Name}
**Use when:**
- Handling select, checkbox, radio changes
- Distinct from keydown behavior
- Example: Filter controls

```javascript
async onChangeFilter(event, wrapper) {
  const value = wrapper.querySelector('select').value;
  await this.applyFilter(value);
  return true;
}
```

---

## Naming Conventions

Follow these conventions for clarity:

### Action Names (in HTML)
- Use kebab-case: `save-item`, `delete-user`, `toggle-panel`
- Be specific: `submit-login` not just `submit`
- Use verbs: `create`, `update`, `delete`, `toggle`, `open`, `close`

```html
<!-- Good -->
<button data-action="save-draft">Save Draft</button>
<button data-action="publish-post">Publish</button>
<button data-action="delete-comment">Delete</button>

<!-- Avoid -->
<button data-action="click">Save</button>
<button data-action="button1">Publish</button>
<button data-action="action">Delete</button>
```

### Handler Names (in JavaScript)
- Automatically converted to PascalCase
- Use `handleAction` for force-consume
- Use `onAction` for conditional
- Use `onPassThruAction` for pass-through
- Use `onChange` for change events

```javascript
// save-draft → SaveDraft
handleActionSaveDraft() { }
onActionSaveDraft() { }

// publish-post → PublishPost
onActionPublishPost() { }

// delete-comment → DeleteComment
handleActionDeleteComment() { }
```

---

## Performance Tips

1. **Use Event Delegation**: EventDelegate already does this—one listener per View, not per element

2. **Debounce Input**: Use `data-filter="live-search"` with `data-filter-debounce` for search inputs

3. **Minimize Handler Work**: Keep handlers fast, defer expensive work

```javascript
// Bad: Expensive work in handler
async onActionSearch(event, wrapper) {
  await this.expensiveOperation();
  await this.render();
}

// Good: Debounce + offload work
async onChangeSearch(event, wrapper) {
  // Already debounced by data-filter-debounce
  await this.performSearch(input.value);
}
```

4. **Use Silent Operations**: For bulk updates, use `{ silent: true }` to prevent excessive re-renders

5. **Cancel Requests**: If user navigates away, cancel in-flight requests in `onBeforeDestroy`

---

## Accessibility

EventDelegate is accessibility-friendly:

1. **Keyboard Support**: Use `data-change-keys` for keyboard actions

```html
<div data-change-action="search" data-change-keys="Enter">
  <input type="text" aria-label="Search" />
</div>
```

2. **Semantic HTML**: Use proper elements (`<button>`, `<form>`, `<a>`)

```html
<!-- Good: Button for actions -->
<button data-action="save">Save</button>

<!-- Bad: Div for actions (not keyboard accessible) -->
<div data-action="save">Save</div>
```

3. **Focus Management**: Return focus after actions

```javascript
async onActionDelete(event, button) {
  await this.delete();
  // Return focus to appropriate element
  this.element.querySelector('.next-focusable').focus();
  return true;
}
```

4. **ARIA Attributes**: Use ARIA for dynamic updates

```html
<button data-action="toggle-panel" aria-expanded="false">
  Toggle Panel
</button>

<div role="region" aria-live="polite">
  <!-- Dynamic content -->
</div>
```

---

## View Integration

EventDelegate is automatically integrated with Views:

```javascript
import { View } from '@core/View.js';

class MyView extends View {
  constructor(options = {}) {
    super({
      template: '<button data-action="save">Save</button>',
      ...options
    });
    
    // this.events is automatically created (EventDelegate instance)
  }
  
  async onAfterRender() {
    await super.onAfterRender();
    // View.bindEvents() automatically called
    // EventDelegate is now listening
  }
  
  async onBeforeDestroy() {
    // View.unbindEvents() automatically called
    // EventDelegate cleanup happens here
    await super.onBeforeDestroy();
  }
  
  // Implement handlers
  async onActionSave(event, button) {
    await this.save();
    return true;
  }
}
```

You never create EventDelegate instances directly—View handles it.

---

## Template Integration

Use data attributes in templates:

```javascript
class UserListView extends View {
  getTemplateData() {
    return {
      users: this.collection.toJSON()
    };
  }
  
  template = `
    <div class="user-list">
      {{#each users}}
        <div class="user-item">
          <span>{{name}}</span>
          <button data-action="edit-user" data-user-id="{{id}}">Edit</button>
          <button data-action="delete-user" data-user-id="{{id}}">Delete</button>
        </div>
      {{/each}}
    </div>
  `;
  
  async onActionEditUser(event, button) {
    const userId = button.dataset.userId;
    await this.editUser(userId);
    return true;
  }
  
  async onActionDeleteUser(event, button) {
    const userId = button.dataset.userId;
    await this.deleteUser(userId);
    return true;
  }
}
```

---

## Form Integration

EventDelegate works seamlessly with forms:

```javascript
class RegistrationFormView extends View {
  template = `
    <form data-action="submit-registration">
      <div class="form-group">
        <label>Username:</label>
        <input type="text" name="username" required />
      </div>
      
      <div class="form-group">
        <label>Email:</label>
        <input type="email" name="email" required />
      </div>
      
      <div class="form-group">
        <label>Password:</label>
        <input type="password" name="password" required />
      </div>
      
      <button type="submit">Register</button>
    </form>
  `;
  
  async onActionSubmitRegistration(event, form) {
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    if (!this.validate(data)) {
      this.showValidationErrors();
      return true;
    }
    
    const response = await this.register(data);
    
    if (response.success) {
      router.navigateTo('/dashboard');
    } else {
      this.showErrors(response.errors);
    }
    
    return true;
  }
  
  validate(data) {
    // Validation logic
    return true;
  }
  
  async register(data) {
    return await this.rest.POST('/api/register', data);
  }
}
```

---

## Common Issues

### Handler not firing

**Problem:** Click/change doesn't trigger handler

**Solutions:**
- Check `data-action` or `data-change-action` attribute is present
- Verify handler method name matches action name (PascalCase conversion)
- Ensure View is mounted and EventDelegate is bound
- Check browser console for errors

```javascript
// Debug
console.log('Action:', button.dataset.action); // "save-item"
console.log('Expected handler:', 'onActionSaveItem'); // Check naming
console.log('Handler exists:', typeof this.onActionSaveItem); // "function"
```

---

### Events firing multiple times

**Problem:** Handler called multiple times per click

**Solutions:**
- Ensure not manually attaching listeners elsewhere
- Check for event bubbling (multiple `data-action` in hierarchy)
- Verify not calling `bindEvents()` multiple times

```javascript
// Debug
console.log('Click count:', this.clickCount++);
```

---

### Navigation not working

**Problem:** Internal links not intercepted

**Solutions:**
- Check link is not marked `data-external`
- Verify href is internal (starts with `/`)
- Ensure no `data-action` on the link (takes precedence)
- Check modifier keys (ctrl/cmd/shift bypass interception)

```javascript
// Debug
console.log('Href:', link.href);
console.log('External:', link.dataset.external);
console.log('Has data-action:', link.dataset.action);
```

---

### Debounce not working

**Problem:** Live search firing immediately

**Solutions:**
- Verify `data-filter="live-search"` on input
- Check `data-change-action` and `data-filter-debounce` on wrapper
- Ensure wrapper is ancestor of input

```html
<!-- Correct structure -->
<div data-change-action="search" data-filter-debounce="300">
  <input type="text" data-filter="live-search" />
</div>

<!-- Wrong: data-filter-debounce on wrong element -->
<div data-change-action="search">
  <input type="text" data-filter="live-search" data-filter-debounce="300" />
</div>
```

---

### Dropdown not hiding

**Problem:** Bootstrap dropdown stays open after action

**Solutions:**
- Ensure handler returns `true` (consumes event)
- Verify element is inside `.dropdown-menu`
- Check Bootstrap is loaded and initialized

```javascript
async onActionEdit(event, link) {
  await this.edit();
  return true; // Must return true to trigger dropdown hide
}
```

---

## Debugging Events

Enable debug logging for EventDelegate:

```javascript
class MyView extends View {
  constructor(options = {}) {
    super(options);
    
    // Override handleActionError for debugging
    this.handleActionError = (action, error, event, element) => {
      console.error('Action error:', {
        action,
        error,
        element,
        event
      });
    };
  }
  
  // Log all actions
  onActionDefault(action, event, element) {
    console.log('Unhandled action:', {
      action,
      element: element.outerHTML,
      event: event.type
    });
    return false;
  }
}

// Monkey-patch EventDelegate for global debugging
const originalDispatch = EventDelegate.prototype.dispatchAction;
EventDelegate.prototype.dispatchAction = function(action, event, element) {
  console.log('Dispatching action:', action, element);
  return originalDispatch.call(this, action, event, element);
};
```

---

## Summary

The EventDelegate system provides a powerful, convention-based approach to DOM event handling in MOJO. Key takeaways:

- Use `data-action` and `data-change-action` attributes in templates
- Implement conventionally-named handlers in Views (`onActionSave`, `handleActionDelete`, etc.)
- EventDelegate automatically manages event binding/unbinding lifecycle
- Built-in support for navigation, debouncing, parent-child isolation, and Bootstrap dropdowns
- Choose handler types based on consumption needs:
  - `handleAction{Name}` - Always consume
  - `onAction{Name}` - Conditionally consume
  - `onPassThruAction{Name}` - Never consume
  - `onChange{Name}` - Change-specific
- Views automatically integrate EventDelegate—no manual setup required

For view development, see [View.md](View.md).  
For template syntax, see [Templates.md](Templates.md).  
For form handling, see [Form.md](Form.md).
