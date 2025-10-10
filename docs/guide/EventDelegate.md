# EventDelegate — Convention-based DOM event delegation for Views

EventDelegate is the small but powerful mixin that powers all user interactions in a View. Every View gets an instance at `this.events` and the View automatically binds/unbinds it around `render()`, `mount()`, `unmount()`, and `destroy()`.

You rarely need to touch EventDelegate directly. Just:
- Add `data-*` attributes in your template/HTML,
- Implement convention-based handler methods on your View subclass.

This guide explains how everything works so you can design predictable, robust interactions in your own Views.

---

## What it does

EventDelegate:
- Delegates DOM events on the View’s root element to your handlers.
- Resolves which handler method to call based on the `data-*` attributes.
- Handles navigation for anchors and page links.
- Debounces “live search” inputs.
- Prevents duplicate handling between parent and child views.
- Plays well with Bootstrap dropdowns.

It binds these DOM events on the View root:
- click
- change
- input
- keydown
- submit

Binding happens in `View.bindEvents()`, which is called after each render. Unbinding happens in `View.unbindEvents()` (also called before re-rendering, unmounting, and destroying) and clears any pending debounce timers.

---

## The attributes you use in templates

- data-action="name"
  - Dispatches a click/submit/keydown action called “name”.
- data-change-action="name"
  - Dispatches a change (and certain input/keydown) action called “name”.
- data-change-keys="Enter, Escape"
  - For elements under a `data-change-action` wrapper, which keys trigger `data-change-action` via keydown. Defaults to Enter.
- data-filter="live-search"
  - On an input inside a `data-change-action` wrapper; enables debounced input handling.
- data-filter-debounce="300"
  - Milliseconds to debounce live search (default 300ms). Set this on the same element that has `data-change-action`.
- data-container="scope"
  - Optional. Used to scope debounce timers when you have multiple live searches with the same action.
- data-page="PageName"
  - Click navigation to a page by name (handled by View).
- data-params='{"id":123}'
  - Optional JSON params used with `data-page`.
- data-external
  - Marks an anchor (<a>) as external so the framework won’t intercept.

---

## Handler method naming

Given an action name like `save`, `toggle-panel`, or `user-login`, EventDelegate converts it to PascalCase and tries these handler methods on your View in this order:

1) handleAction{Name}
- Example: `handleActionSave`, `handleActionTogglePanel`, `handleActionUserLogin`
- If present, it is always called and considered handled (preventDefault + stopPropagation handled upstream).
- Use this for cases where you always want to consume the event.

2) onAction{Name}
- Example: `onActionSave`
- If present, it’s awaited and expected to return:
  - truthy → the event is considered handled; EventDelegate prevents default and stops propagation
  - falsy → not handled; EventDelegate may continue with other behavior (e.g., navigation)
- If the element is inside a `.dropdown-menu`, a handled action auto-hides the parent Bootstrap dropdown.

3) onPassThruAction{Name}
- Example: `onPassThruActionSave`
- If present, it’s awaited and always treated as NOT handled (returns false), allowing default behavior to continue.
- Recommended for logging/analytics or light instrumentation when you want clicks to behave normally.

4) onActionDefault(action, event, element)
- Called if none of the above exist. Return true to consume the event; false to pass through.

If none of the methods exist, EventDelegate emits a View event: `action:{actionName}` and does not consume the event.

PascalCase conversion:
- action: `save` → `Save`
- action: `toggle-panel` → `TogglePanel`
- action: `user-login` → `UserLogin`

---

## What each DOM event does

1) click
- If target or ancestor has `data-action`, EventDelegate dispatches that action.
- Otherwise, if the target or ancestor is:
  - an anchor with href (e.g., `<a href="/path">`), or
  - an element with `data-page="PageName"`
  then EventDelegate handles navigation via the View.
- It respects ctrl/cmd/shift and middle-click to open in new tabs.
- It respects `data-external` or external URLs (http/https/mailto/tel/…).

2) change
- Finds the closest ancestor with `data-change-action` and dispatches it as a “change” action.
- If `onChange{Name}` exists on the View, that is used and considered handled.
- Otherwise, it falls back to the standard action handler chain described above.

3) input (debounced live search)
- Only fires if:
  - the target matches `[data-filter="live-search"]`, and
  - there is a closest ancestor with `data-change-action`.
- Debounced using `data-filter-debounce` (default 300ms) on the same element that contains `data-change-action`.
- Debounce scope key is: `{action}-{data-container || 'default'}`.

4) keydown
- Skips inputs that match `[data-filter="search"]`.
- If the target has a closest `[data-change-action]`:
  - Triggers when `event.key` is in `data-change-keys` (comma separated), defaulting to `Enter`.
  - Dispatches the corresponding `data-change-action` through the standard action handler chain (not `onChange`).

5) submit
- If the submitted form has `form[data-action]`, preventDefault and dispatch that action.

---

## Navigation behavior

- Anchors (<a href="...">) are intercepted unless:
  - ctrl/cmd/shift pressed or middle click; or
  - `data-external` present; or
  - The href is considered external (http(s), mailto, tel, protocol beginning, etc.); or
  - The anchor itself has `data-action` (then it’s treated as an action instead of nav).
- Elements with `data-page="SomePage"` trigger page navigation:
  - Optional `data-params` must be valid JSON.
  - If an App is available, `app.showPage(name, params)` is called.
  - Otherwise, the Router is used.

---

## Ownership with child views

EventDelegate ensures a parent View won’t double-handle events that a child View handled:
- Each View’s delegate only “owns” events inside its DOM that are not inside any child View’s DOM.
- When a child handles an event, it marks the event with `event.handledByChild = true`.
- Parents see this flag and won’t re-handle the same event.

This lets you safely nest Views without worrying about duplicate handler execution.

---

## Examples

Basic click actions with onAction{Name}
```/dev/null/ActionButtons.html#L1-24
<div class="toolbar">
  <button data-action="save" class="btn btn-primary">Save</button>
  <button data-action="reset" class="btn btn-outline-secondary">Reset</button>
</div>
```

```/dev/null/ActionButtonsView.js#L1-60
import { View } from '@core/View.js';

export class ActionButtonsView extends View {
  constructor(options = {}) {
    super({
      template: `
        <div class="toolbar">
          <button data-action="save" class="btn btn-primary">Save</button>
          <button data-action="reset" class="btn btn-outline-secondary">Reset</button>
        </div>
      `,
      ...options
    });
  }

  // Return truthy to consume, falsy to pass through
  async onActionSave(event, el) {
    await this.saveData();
    await this.render();
    return true; // consume
  }

  async onActionReset(event, el) {
    this.data = { }; // reset your state
    await this.render();
    return true; // consume
  }

  async saveData() {
    // ... do work
  }
}
```

Force-consume with handleAction{Name}
```/dev/null/HandleActionView.js#L1-40
import { View } from '@core/View.js';

export class HandleActionView extends View {
  constructor(options = {}) {
    super({
      template: `
        <a href="/account" data-action="open-account">Open Account</a>
      `,
      ...options
    });
  }

  // Always considered handled; default link nav will NOT occur
  async handleActionOpenAccount(event, el) {
    await this.openAccountPanel();
  }

  async openAccountPanel() {
    // ...
  }
}
```

Pass-through analytics with onPassThruAction{Name}
```/dev/null/PassThru.html#L1-18
<!-- Note: onPassThruAction is useful when the data-action is on a child element
     inside an anchor that does NOT itself have data-action. -->
<a href="/products/123" class="product-link">
  <span class="hit-area" data-action="track-product-click">Product Name</span>
</a>
```

```/dev/null/PassThruView.js#L1-80
import { View } from '@core/View.js';

export class PassThruView extends View {
  constructor(options = {}) {
    super({
      template: `
        <a href="/products/123" class="product-link">
          <span class="hit-area" data-action="track-product-click">Product Name</span>
        </a>
      `,
      ...options
    });
  }

  // This runs, but the delegate treats it as NOT handled so default nav proceeds.
  async onPassThruActionTrackProductClick(event, el) {
    // Analytics ping
    this.emit('analytics:track', { type: 'product_click', id: 123 });
    // Returning value is ignored for pass-thru. It always passes through on success.
  }
}
```

Change vs key-driven actions
```/dev/null/ChangeAndKey.html#L1-30
<div class="search-wrap" data-change-action="search">
  <input type="text" placeholder="Type and press Enter" />
</div>

<div class="filter-wrap" data-change-action="apply-filter" data-change-keys="Enter, Escape">
  <select>
    <option value="">All</option>
    <option value="open">Open</option>
    <option value="closed">Closed</option>
  </select>
</div>
```

```/dev/null/ChangeAndKeyView.js#L1-120
import { View } from '@core/View.js';

export class ChangeAndKeyView extends View {
  constructor(options = {}) {
    super({
      template: `
        <div class="search-wrap" data-change-action="search">
          <input type="text" placeholder="Type and press Enter" />
        </div>

        <div class="filter-wrap" data-change-action="apply-filter" data-change-keys="Enter, Escape">
          <select>
            <option value="">All</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      `,
      ...options
    });
  }

  // change on <select> → onChangeApplyFilter is preferred if present
  async onChangeApplyFilter(event, el) {
    const select = el.querySelector('select');
    this.data.filter = select.value;
    await this.render();
  }

  // keydown on <input> with Enter → dispatches "search" through standard action chain
  async onActionSearch(event, el) {
    const input = el.querySelector('input');
    this.data.query = input.value;
    await this.render();
    return true;
  }
}
```

Debounced live search
```/dev/null/LiveSearch.html#L1-40
<!-- data-change-action is on the wrapper; data-filter/live-search is on the input -->
<div class="live-search" data-change-action="search" data-filter-debounce="500" data-container="users">
  <input type="text" placeholder="Search users..." data-filter="live-search" />
</div>
```

```/dev/null/LiveSearchView.js#L1-100
import { View } from '@core/View.js';

export class LiveSearchView extends View {
  constructor(options = {}) {
    super({
      template: `
        <div class="live-search" data-change-action="search" data-filter-debounce="500" data-container="users">
          <input type="text" placeholder="Search users..." data-filter="live-search" />
        </div>
      `,
      ...options
    });
  }

  async onChangeSearch(event, el) {
    // Debounced by EventDelegate; only called after 500ms of inactivity
    const input = el.querySelector('input[data-filter="live-search"]');
    this.data.query = input.value;
    await this.render();
  }
}
```

Page and href navigation
```/dev/null/Navigation.html#L1-40
<!-- Page navigation (uses app.showPage or router) -->
<button data-page="UserProfile" data-params='{"id":42}'>Open Profile</button>

<!-- Internal anchor navigation (intercepted by EventDelegate and routed) -->
<a href="/settings">Settings</a>

<!-- External link (not intercepted) -->
<a href="https://example.com" data-external>External</a>
```

```/dev/null/NavigationView.js#L1-80
import { View } from '@core/View.js';

export class NavigationView extends View {
  constructor(options = {}) {
    super({
      template: `
        <button data-page="UserProfile" data-params='{"id":42}'>Open Profile</button>
        <a href="/settings">Settings</a>
        <a href="https://example.com" data-external>External</a>
      `,
      ...options
    });
  }

  // No handlers required. EventDelegate handles navigation for you.
}
```

Submit handling with form[data-action]
```/dev/null/FormAction.html#L1-40
<form data-action="submit-login">
  <input type="email" name="email" required />
  <input type="password" name="password" required />
  <button type="submit">Login</button>
</form>
```

```/dev/null/FormActionView.js#L1-80
import { View } from '@core/View.js';

export class FormActionView extends View {
  constructor(options = {}) {
    super({
      template: `
        <form data-action="submit-login">
          <input type="email" name="email" required />
          <input type="password" name="password" required />
          <button type="submit">Login</button>
        </form>
      `,
      ...options
    });
  }

  async onActionSubmitLogin(event, form) {
    const data = Object.fromEntries(new FormData(form).entries());
    await this.login(data);
    return true;
  }

  async login(credentials) {
    // ...
  }
}
```

Parent/child isolation
```/dev/null/ParentChild.html#L1-80
<!-- Parent template -->
<div class="parent">
  <div id="child-container"></div>
  <button data-action="save">Parent Save</button>
</div>
```

```/dev/null/ParentChildViews.js#L1-200
import { View } from '@core/View.js';

class ChildView extends View {
  constructor(options = {}) {
    super({
      template: `<button data-action="save">Child Save</button>`,
      ...options
    });
  }

  async onActionSave() {
    // Only the child handles this when you click the child's button
    console.log('Child save handled');
    return true;
  }
}

export class ParentView extends View {
  constructor(options = {}) {
    super({
      template: `
        <div class="parent">
          <div id="child-container"></div>
          <button data-action="save">Parent Save</button>
        </div>
      `,
      ...options
    });

    this.child = this.addChild(new ChildView());
    this.child.containerId = 'child-container';
  }

  async onAfterRender() {
    await super.onAfterRender();
    await this.child.render();
    await this.child.mount(this.getChildElementById('child-container'));
  }

  async onActionSave() {
    // Only the parent handles this when you click the parent's button
    console.log('Parent save handled');
    return true;
  }
}
```

Bootstrap dropdown auto-hide
```/dev/null/Dropdown.html#L1-60
<div class="dropdown">
  <button class="btn btn-secondary dropdown-toggle" data-bs-toggle="dropdown">Actions</button>
  <ul class="dropdown-menu">
    <li><a class="dropdown-item" href="#" data-action="do-thing">Do Thing</a></li>
  </ul>
</div>
```

```/dev/null/DropdownView.js#L1-80
import { View } from '@core/View.js';

export class DropdownView extends View {
  constructor(options = {}) {
    super({
      template: `
        <div class="dropdown">
          <button class="btn btn-secondary dropdown-toggle" data-bs-toggle="dropdown">Actions</button>
          <ul class="dropdown-menu">
            <li><a class="dropdown-item" href="#" data-action="do-thing">Do Thing</a></li>
          </ul>
        </div>
      `,
      enableTooltips: false,
      ...options
    });
  }

  async onActionDoThing() {
    // Returning true will auto-hide the dropdown
    // (EventDelegate detects dropdown context and hides it)
    return true;
  }
}
```

---

## Error handling

If your handler throws, EventDelegate calls `view.handleActionError(action, error, event, element)`.
- The base View implementation shows an error (if available in your host app).
- You can override `handleActionError` in your View to customize this behavior.

---

## Best practices and gotchas

- Use `handleAction{Name}` when you always want to consume an event.
- Use `onAction{Name}` when you may conditionally handle the event (return true/false).
- Use `onPassThruAction{Name}` for analytics/instrumentation when you want default behavior to continue.
- For `input` debouncing, put `data-change-action`, `data-filter-debounce`, and `data-container` on the wrapper element, and use `data-filter="live-search"` on the input inside.
- `keydown` + `data-change-keys` triggers an action (not `onChange`). If you want change semantics, use the `change` event instead.
- To allow link navigation and still run an action, put `data-action` on a child element inside an anchor that does NOT itself have `data-action`, and implement `onPassThruAction{Name}`.
- When nesting Views, expect the child to handle its own events without the parent duplicating work (thanks to ownership checks and `handledByChild`).

---

## Quick reference

- Click priority: data-action → (if not handled) navigation: [a[href]] or [data-page]
- Change: closest [data-change-action] → onChange{Name} if exists, else normal action chain
- Input: [data-filter="live-search"] under [data-change-action] → debounced onChange{Name}
- Keydown: closest [data-change-action], keys from data-change-keys (default Enter) → normal action chain
- Submit: form[data-action] → normal action chain

With this, you can build Views that are declarative in templates and concise in code, while remaining fully testable and predictable.