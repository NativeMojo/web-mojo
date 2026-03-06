# EventEmitter & EventDelegate

WEB-MOJO provides two complementary event systems:

- **EventEmitter** — instance-level pub/sub events mixed into View, Model, Collection, and WebSocketClient
- **EventDelegate** — convention-based DOM event handling that maps `data-action` attributes to view methods

---

## Table of Contents

- [EventEmitter](#eventemitter)
  - [Overview](#overview)
  - [API](#api)
  - [Using as a Mixin](#using-as-a-mixin)
  - [Common Patterns](#common-patterns)
- [EventDelegate](#eventdelegate)
  - [Overview-delegate](#overview-delegate)
  - [Action Dispatch](#action-dispatch)
  - [Change Events](#change-events)
  - [Keyboard Events](#keyboard-events)
  - [Navigation Handling](#navigation-handling)
  - [Dispatch Priority](#dispatch-priority)
  - [API Reference](#api-reference)
- [EventBus (Global)](#eventbus-global)
- [Common Pitfalls](#common-pitfalls)
- [Related Documentation](#related-documentation)

---

## EventEmitter

### Overview

`EventEmitter` is a lightweight pub/sub mixin that provides instance-level events. It is mixed into:

- **View** — for lifecycle and custom view events
- **Model** — for `change`, `sync`, and `destroy` events
- **Collection** — for `add`, `remove`, `reset`, and `fetch` events
- **WebSocketClient** — for `connected`, `disconnected`, `message`, and `error` events

Every instance gets its own independent listener registry — events fired on one model do not reach listeners on another model, even if they are the same class.

For **cross-component** application-wide events, use the global [EventBus](#eventbus-global) at `app.events`.

---

### API

#### `on(event, callback, context?)`

Add an event listener. The optional `context` argument binds `this` inside the callback and is used to match the listener for removal — making cleanup with `off()` trivial.

```js
// Without context
model.on('change', (data) => {
  console.log('Changed:', data);
});

// With context binding (preferred — easy to remove later)
model.on('change', this.handleChange, this);
```

**Returns:** `this` (chainable)

---

#### `off(event, callback?, context?)`

Remove a specific listener, or all listeners for an event.

```js
// Remove a specific listener (matched by callback reference)
model.off('change', this.handleChange);

// Remove a specific listener with context (most precise)
model.off('change', this.handleChange, this);

// Remove ALL listeners for an event
model.off('change');
```

**Returns:** `this` (chainable)

---

#### `once(event, callback, context?)`

Add a listener that automatically removes itself after being called once.

```js
// Wait for a one-time 'ready' event
model.once('ready', this.onModelReady, this);

// Useful for setup that should only happen once
collection.once('fetch', () => {
  this.initialLoadComplete = true;
});
```

**Returns:** `this` (chainable)

---

#### `emit(event, ...args)`

Emit an event to all registered listeners. Arguments after the event name are passed directly to each listener.

```js
// Emit with a payload object
this.emit('data-loaded', { count: 42, source: 'api' });

// Emit with multiple arguments
this.emit('progress', loaded, total);

// Emit with no arguments
this.emit('ready');
```

**Returns:** `this` (chainable)

> **Error isolation:** If one listener throws, the error is logged to the console but the remaining listeners still execute. A bad handler never blocks other listeners.

---

### Using as a Mixin

`EventEmitter` is a plain object — mix it into any class prototype:

```js
import EventEmitter from 'web-mojo/mixins/EventEmitter';

class MyService {
  constructor() {
    this.data = null;
  }

  async load() {
    this.data = await fetchData();
    this.emit('loaded', this.data);
  }
}

// Mix in EventEmitter methods
Object.assign(MyService.prototype, EventEmitter);

// Usage
const service = new MyService();
service.on('loaded', (data) => console.log('Got data:', data));
await service.load();
```

---

### Common Patterns

#### Reacting to Model Changes in a View

```js
class UserCard extends View {
  async onInit() {
    await super.onInit();

    // Listen to the model — re-render when it changes
    this.model.on('change', this._onModelChange, this);
  }

  _onModelChange() {
    this.render();
  }

  async onBeforeDestroy() {
    // Clean up the listener when the view is destroyed
    this.model.off('change', this._onModelChange, this);
    await super.onBeforeDestroy();
  }
}
```

> **Note:** When a model is bound via `setModel()` or the `model` constructor option, the View automatically re-renders on model `change` events. You only need to add manual listeners for custom events or multi-model scenarios.

#### One-Time Initialization

```js
class DataPage extends Page {
  async onEnter() {
    await super.onEnter();

    // Run only the first time this collection emits 'fetch'
    this.collection.once('fetch', () => {
      this.firstLoadComplete = true;
    });

    await this.collection.fetch();
  }
}
```

#### Chaining Listeners

```js
model
  .on('change', this.handleChange, this)
  .on('sync',   this.handleSync,   this)
  .on('destroy', this.handleDestroy, this);
```

#### Custom Events from a View

```js
class FileUploadView extends View {
  async uploadFile(file) {
    const resp = await rest.upload('/api/files', file, {
      onProgress: (percent) => {
        this.emit('upload:progress', percent);
      }
    });

    if (resp.success) {
      this.emit('upload:complete', resp.data.data);
    } else {
      this.emit('upload:error', resp.message);
    }
  }
}

// Parent can listen to the child's custom events
const uploader = new FileUploadView({ containerId: 'uploader' });
uploader.on('upload:complete', (file) => {
  this.files.push(file);
  this.render();
});
```

#### Cleaning Up All Listeners

```js
async onBeforeDestroy() {
  // Remove all listeners this view added to external objects
  this.model.off('change',  this._onChange,  this);
  this.model.off('sync',    this._onSync,    this);
  this.model.off('destroy', this._onDestroy, this);

  await super.onBeforeDestroy();
}
```

---

## EventDelegate

### Overview (delegate)

`EventDelegate` is the framework's DOM event delegation engine. It is instantiated automatically by every `View` and binds a single set of listeners to the view's root element instead of individual elements.

It handles:

- **Click events** → dispatched to `onAction*` methods based on `data-action` attributes
- **Change events** → dispatched to `onChange*` methods based on `data-change-action` attributes
- **Input events** → debounced live-search via `data-filter="live-search"` elements
- **Keydown events** → dispatched on Enter (or custom keys) via `data-keydown-action` attributes
- **Submit events** → dispatched to `onAction*` methods when `<form data-action="...">` is submitted
- **Navigation** → `<a href>` and `data-page` links are intercepted and routed

You do not instantiate or interact with `EventDelegate` directly — it runs automatically when a view renders.

---

### Action Dispatch

When the user clicks an element with a `data-action` attribute:

```html
<button data-action="save-draft">Save Draft</button>
<button data-action="delete-item" data-id="{{model.id}}">Delete</button>
```

`EventDelegate` converts the kebab-case action name to PascalCase and looks for a handler method on the view:

| `data-action` value | Method looked up (in order) |
|---|---|
| `'save-draft'` | `handleActionSaveDraft` → `onActionSaveDraft` → `onPassThruActionSaveDraft` → `onActionDefault` |
| `'delete-item'` | `handleActionDeleteItem` → `onActionDeleteItem` → `onPassThruActionDeleteItem` → `onActionDefault` |

```js
class MyView extends View {
  // Pattern 1: handleAction* (highest priority, always prevents default)
  async handleActionSaveDraft(event, element) {
    await this.model.save({ draft: true });
  }

  // Pattern 2: onAction* (standard pattern — return true to stop propagation)
  async onActionDeleteItem(event, element) {
    const id = element.dataset.id;
    await this.deleteItem(id);
    return true; // Stops event propagation
  }

  // Pattern 3: Catch-all for unhandled actions
  async onActionDefault(action, event, element) {
    console.log('Unhandled action:', action);
  }
}
```

### Handler Return Value

- **`handleAction*`** methods: return value is ignored; `preventDefault()` and `stopPropagation()` are always called
- **`onAction*`** methods: return `true` to stop event propagation; return `false` or `undefined` to allow it to continue
- **`onPassThruAction*`** methods: return value is ignored; event is **not** stopped (useful for analytics / logging)

### Data Attributes on Action Elements

Any `data-*` attribute on the action element is accessible via `element.dataset`:

```html
<tr data-action="select-row"
    data-id="{{model.id}}"
    data-name="{{model.name}}"
    data-status="{{model.status}}">
</tr>
```

```js
async onActionSelectRow(event, element) {
  const { id, name, status } = element.dataset;
  this.selectedId = id;
  this.selectedName = name;
  await this.render();
}
```

---

### Change Events

Elements with `data-change-action` emit a change dispatch when the user changes their value (select, checkbox, etc.):

```html
<select data-change-action="filter-status">
  <option value="all">All</option>
  <option value="active">Active</option>
  <option value="inactive">Inactive</option>
</select>
```

```js
async onChangeFilterStatus(event, element) {
  this.filter = element.value;
  await this.collection.fetch({ status: this.filter });
  await this.render();
}
```

If no `onChange*` method exists, the change event falls through to the normal `onAction*` dispatch chain.

### Live Search (Debounced Input)

Add `data-filter="live-search"` to an input with `data-change-action` to get automatic debouncing on `input` events:

```html
<input type="text"
       data-change-action="search"
       data-filter="live-search"
       data-filter-debounce="300"
       placeholder="Search…">
```

```js
async onChangeSearch(event, element) {
  const query = element.value.trim();
  this.results = await this.search(query);
  await this.render();
}
```

The `data-filter-debounce` attribute controls the delay in milliseconds (default: 300ms).

---

### Keyboard Events

Trigger an action on a specific keypress using `data-keydown-action`:

```html
<!-- Trigger on Enter key -->
<input type="text"
       data-keydown-action="submit-search"
       placeholder="Search…">

<!-- Trigger on Enter OR Escape -->
<input type="text"
       data-keydown-action="handle-input"
       data-change-keys="Enter,Escape">

<!-- Trigger on ANY key -->
<input type="text"
       data-keydown-action="key-pressed"
       data-change-keys="*">
```

```js
async onActionSubmitSearch(event, element) {
  const query = element.value;
  await this.search(query);
}

async onActionHandleInput(event, element) {
  if (event.key === 'Escape') {
    element.value = '';
    this.results = [];
  } else {
    await this.search(element.value);
  }
  await this.render();
}
```

---

### Navigation Handling

`EventDelegate` automatically intercepts:

- **`<a href="...">` clicks** — routed through the app's router (unless external or `data-external`)
- **`data-page="pageName"` clicks** — calls `app.showPage(pageName)` or the router

```html
<!-- Routed internally -->
<a href="/users/42">View User</a>

<!-- Explicitly external — bypasses router -->
<a href="https://docs.example.com" data-external>Documentation</a>

<!-- Navigate to a named page -->
<button data-page="settings">Settings</button>
<button data-page="home">← Back to Home</button>
```

Middle-click, Ctrl+click, and Cmd+click pass through to the browser's default behaviour (open in new tab).

---

### Dispatch Priority

When a `data-action` is clicked, `EventDelegate` checks methods in this order:

```
1. handleActionXxx(event, element)    — always prevents default, always handled
   ↓ (if not found)
2. onActionXxx(event, element)        — return true to stop propagation
   ↓ (if not found)
3. onPassThruActionXxx(event, element) — runs but does NOT stop event
   ↓ (if not found)
4. onActionDefault(action, event, element) — catch-all
   ↓ (if not found)
5. emit('action:<name>', { action, event, element }) — fallback event emission
```

**When to use each pattern:**

| Pattern | Use when |
|---|---|
| `handleAction*` | You always want to prevent default browser behaviour |
| `onAction*` | Normal action handling — most common pattern |
| `onPassThruAction*` | Logging, analytics — run code without consuming the event |
| `onActionDefault` | Catch-all for dynamic or generated action names |

---

### API Reference

`EventDelegate` is a class with the following methods, available internally on `view._delegate`:

| Method | Description |
|---|---|
| `bind(rootEl)` | Attach all DOM event listeners to `rootEl` |
| `unbind()` | Detach all DOM event listeners and clear debounce timers |
| `dispatch(action, event, el)` | Manually dispatch an action through the handler chain |
| `dispatchChange(action, event, el)` | Manually dispatch a change action |
| `shouldHandle(el, event)` | Returns `true` if this delegate should handle the event for `el` |
| `owns(el)` | Returns `true` if `el` is inside this view but NOT inside a child view |
| `contains(el)` | Returns `true` if `el` is anywhere inside this view |
| `hideTooltip(el)` | Dispose the Bootstrap tooltip on `el` (called before dispatching) |
| `hideDropdown(el)` | Close the Bootstrap dropdown containing `el` (called after dropdown actions) |

---

## EventBus (Global)

`app.events` is a global `EventBus` — distinct from `EventEmitter`. While `EventEmitter` is per-instance, `EventBus` is a singleton channel for the entire application.

```js
// Subscribe from any component
app.events.on('user:logged-in', ({ user }) => {
  updateNavbar(user);
});

// Publish from any component
app.events.emit('user:logged-in', { user: activeUser });

// One-time subscription
app.events.once('app:ready', () => {
  console.log('App is fully started');
});
```

See **[WebApp.md](../core/WebApp.md#global-event-bus)** for the full list of built-in application events.

---

## Common Pitfalls

### ⚠️ Forgetting to remove EventEmitter listeners

```js
// ❌ WRONG — listener fires even after view is destroyed
async onInit() {
  await super.onInit();
  this.model.on('change', this.render.bind(this));
}

// ✅ CORRECT — store the bound reference and remove it on destroy
async onInit() {
  await super.onInit();
  this._onModelChange = this.render.bind(this);
  this.model.on('change', this._onModelChange);
}

async onBeforeDestroy() {
  this.model.off('change', this._onModelChange);
  await super.onBeforeDestroy();
}

// ✅ EVEN BETTER — use context argument for easy cleanup
async onInit() {
  await super.onInit();
  this.model.on('change', this.render, this);
}

async onBeforeDestroy() {
  this.model.off('change', this.render, this);
  await super.onBeforeDestroy();
}
```

### ⚠️ data-action on `<form>` elements

```html
<!-- ❌ WRONG — EventDelegate submits forms via the 'submit' event,
     but data-action on a button inside a form is the correct pattern -->
<form data-action="submit-form">
  <button type="submit">Submit</button>
</form>

<!-- ✅ CORRECT — use type="button" with data-action -->
<form>
  <input type="email" name="email" required>
  <button type="button" data-action="submit-form">Submit</button>
</form>
```

### ⚠️ onAction* method not firing

Checklist:
1. Is the `data-action` attribute spelled correctly?
2. Is the method name exactly `onAction` + PascalCase version of the action name?
3. Is the method `async`?
4. Is the element inside the view's root element (not outside it)?
5. Is the element inside a **child view**? (Child views have their own delegate — the parent won't handle it)

```js
// data-action="my-action"   →  onActionMyAction
// data-action="save"        →  onActionSave
// data-action="delete-item" →  onActionDeleteItem
// data-action="openModal"   →  onActionOpenmodal  ← camelCase in HTML is discouraged
```

> Use kebab-case in `data-action` values for clarity: `data-action="open-modal"` → `onActionOpenModal`.

### ⚠️ Emitting on app.events when you mean view.emit

```js
// ❌ WRONG — broadcasts to the entire application
this.getApp().events.emit('change', this.model);

// ✅ CORRECT — emits only to this view's local listeners
this.emit('change', this.model);

// ✅ CORRECT — use app.events for truly cross-component events
this.getApp().events.emit('cart:updated', { count: this.cart.size });
```

### ⚠️ Not returning true from onAction* when needed

```js
// ❌ WRONG — event bubbles to the parent view's delegate and may be double-handled
async onActionSelect(event, element) {
  this.selected = element.dataset.id;
  // Missing return true
}

// ✅ CORRECT — return true to stop propagation
async onActionSelect(event, element) {
  this.selected = element.dataset.id;
  await this.render();
  return true;
}
```

---

## Related Documentation

- **[Events.md](../core/Events.md)** — Practical event patterns and the full EventBus API
- **[View.md](../core/View.md)** — How EventDelegate integrates with the View lifecycle
- **[WebApp.md](../core/WebApp.md#global-event-bus)** — Built-in application events on `app.events`
- **[WebSocketClient.md](../services/WebSocketClient.md)** — Uses EventEmitter for connection events
- **[Templates.md](../core/Templates.md)** — How `data-action` is used in Mustache templates