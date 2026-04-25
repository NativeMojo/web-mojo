# ContextMenu

**ContextMenu** is a small, reusable dropdown-menu View that renders a Bootstrap 5 dropdown from a plain configuration object. It is the standard way to attach a "three-dots" action menu to a row, header, or any other view in WEB-MOJO.

It is also the building block used internally by [Dialog](Dialog.md) for its header context menus, and by [TableView](TableView.md) row menus — anywhere you've seen a `bi-three-dots-vertical` button in the framework, this is the component behind it.

---

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Constructor Options](#constructor-options)
- [Menu Item Configuration](#menu-item-configuration)
- [Action Dispatch](#action-dispatch)
- [Instance Methods](#instance-methods)
- [Common Patterns](#common-patterns)
- [Common Pitfalls](#common-pitfalls)
- [Related Documentation](#related-documentation)

---

## Overview

`ContextMenu` extends [View](../core/View.md) and provides:

- **Declarative items** — describe the menu as an array of plain objects; no manual DOM
- **Bootstrap 5 dropdown** — uses the standard `data-bs-toggle="dropdown"` mechanism
- **Two action styles** — items can either dispatch a `data-action` to the parent view, or invoke an inline `handler(context, event, element)` callback
- **Per-item context** — pass any object as `context` and every handler/action receives it
- **Dividers, danger items, disabled items, external links** — the common menu primitives are all supported out of the box
- **Embedded in any view** — added with `addChild()` and a `containerId`, just like any other child view

> **Note.** `ContextMenu` is intentionally minimal. It does **not** itself filter items by user permission. If you need permission-gated items, filter the `items` array yourself before constructing the menu (see [Common Patterns](#permission-filtering)). The `permissions` key supported by [Dialog](Dialog.md)'s `contextMenu` option is a Dialog-level feature, not a ContextMenu one.

---

## Quick Start

```js
import { ContextMenu } from 'web-mojo';

// Inside a parent View's onInit()
async onInit() {
  this.menu = new ContextMenu({
    containerId: 'row-menu',         // matches data-container="row-menu" in parent template
    context: this.model,             // forwarded to handlers and as event payload
    config: {
      items: [
        { label: 'Edit',   action: 'edit-row',   icon: 'bi-pencil' },
        { label: 'Delete', action: 'delete-row', icon: 'bi-trash', danger: true }
      ]
    }
  });
  this.addChild(this.menu);
}

// Action handlers live on the PARENT view
async onActionEditRow(event, element) {
  await this.editModel(this.model);
}

async onActionDeleteRow(event, element) {
  await this.confirmDelete(this.model);
}
```

The parent template just needs a placeholder element where the menu should mount:

```html
<div class="d-flex justify-content-between">
  <h5>{{model.name}}</h5>
  <div data-container="row-menu"></div>
</div>
```

---

## Constructor Options

```js
new ContextMenu(options)
```

| Option | Type | Default | Description |
|---|---|---|---|
| `config` | `object` | `{}` | The menu definition: `{ items, icon?, buttonClass? }` |
| `contextMenu` | `object` | — | Alias for `config` (accepted for consistency with [Dialog](Dialog.md)) |
| `context` | `any` | `{}` | Arbitrary data forwarded to inline handlers and dispatched alongside actions |
| `containerId` | `string` | — | Standard View option — pairs with a `data-container="..."` placeholder in the parent template |
| `className` | `string` | `'context-menu-view dropdown'` | Root element classes; the defaults are required for Bootstrap dropdown layout, so extend rather than replace |

`config` (and its `contextMenu` alias) accepts:

| Key | Type | Default | Description |
|---|---|---|---|
| `items` | `array` | `[]` | Menu item array (see below). If empty, the menu renders nothing |
| `icon` | `string` | `'bi-three-dots-horizontal'` | Bootstrap Icons class for the trigger button |
| `buttonClass` | `string` | `'btn btn-link text-secondary ps-3 pe-0 pt-0 pb-1'` | Trigger button classes — replace fully when overriding |

> **⚠️ The dropdown menu is right-aligned by default** (`dropdown-menu-end`). This is appropriate for a button placed at the right edge of a row or header. There is no option to change the alignment via config — wrap the menu in a positioning container if you need different placement.

---

## Menu Item Configuration

Each entry in `config.items` is a plain object. Two kinds are recognized:

### Action items

```js
{
  label:    'Delete File',          // required — visible text
  action:   'delete-file',          // required for clickable items — dispatched to parent
  icon:     'bi-trash',             // optional — Bootstrap Icons class
  danger:   true,                   // optional — adds .text-danger styling
  disabled: false,                  // optional — adds .disabled and prevents dispatch
  handler:  (ctx, event, el) => {}  // optional — see "Inline handlers" below
}
```

| Key | Type | Description |
|---|---|---|
| `label` | `string` | Menu item text |
| `action` | `string` | Kebab-case action name dispatched to the parent view |
| `icon` | `string` | Bootstrap Icons class (e.g. `'bi-pencil'`) |
| `danger` | `boolean` | Adds `text-danger` class — used for destructive actions |
| `disabled` | `boolean` | Adds `disabled` class and short-circuits clicks |
| `handler` | `function` | Inline callback — when present, action dispatch is **suppressed** in favor of this function |

### Link items

If an item has an `href`, it renders as a plain `<a>` and the framework dispatches nothing — the browser handles the navigation:

```js
{
  label:  'Documentation',
  icon:   'bi-question-circle',
  href:   'https://docs.example.com',
  target: '_blank'                // defaults to '_self'
}
```

### Dividers

Either of these renders a horizontal divider:

```js
{ type: 'divider' }
{ separator: true }
```

---

## Action Dispatch

When an action item is clicked, `ContextMenu` does one of two things:

### 1. Inline handler (preferred for one-off menus)

If the item defines `handler`, that function is invoked and **no event is dispatched to the parent**:

```js
{
  label:  'Refresh',
  action: 'refresh',
  icon:   'bi-arrow-clockwise',
  handler: (context, event, element) => {
    // `context` is whatever you passed as `options.context`
    context.fetch();
  }
}
```

### 2. Parent action dispatch (preferred when the parent already has handlers)

If there is no `handler`, ContextMenu calls:

```js
this.parent.events.dispatch(action, event, element);
```

Which routes through the framework's standard `data-action` machinery. The parent view just defines the matching `onActionXxx` method:

```js
class FileRowView extends View {
  async onInit() {
    this.menu = new ContextMenu({ /* ... */ });
    this.addChild(this.menu);
  }

  async onActionEditFile(event, element) {
    // called when an item with action: 'edit-file' is clicked
  }
}
```

> **⚠️ The dispatch happens on `this.parent`, not on the page or app.** ContextMenu requires a parent view — instantiate it via `addChild()` so `parent` is wired up. A free-floating ContextMenu with no parent will throw on click.

> The class docstring mentions an `'action'` event for parent listeners. That code path is **commented out** in the current implementation — only the `parent.events.dispatch()` path runs. Do not subscribe with `menu.on('action', ...)` and expect anything to fire; use `onActionXxx` on the parent or `handler:` on the item instead.

---

## Instance Methods

`ContextMenu` inherits the full [View](../core/View.md) API. The only menu-specific helper is:

### `closeDropdown()`

Force the dropdown to close. Called automatically after an item is clicked, but available for manual use:

```js
this.menu.closeDropdown();
```

If Bootstrap's JS isn't loaded (`window.bootstrap` is missing), this is a no-op rather than an error.

---

## Common Patterns

### Row menu in a list

```js
import { View, ContextMenu } from 'web-mojo';

class IncidentRowView extends View {
  async getTemplate() {
    return `
      <div class="d-flex align-items-center justify-content-between p-2 border-bottom">
        <div>
          <strong>{{model.title}}</strong>
          <small class="text-muted ms-2">{{model.created_at|datetime}}</small>
        </div>
        <div data-container="row-menu"></div>
      </div>
    `;
  }

  async onInit() {
    this.addChild(new ContextMenu({
      containerId: 'row-menu',
      context: this.model,
      config: {
        items: [
          { label: 'View',    action: 'view-incident',    icon: 'bi-eye' },
          { label: 'Resolve', action: 'resolve-incident', icon: 'bi-check2' },
          { type: 'divider' },
          { label: 'Delete',  action: 'delete-incident',  icon: 'bi-trash', danger: true }
        ]
      }
    }));
  }

  async onActionViewIncident()    { this.navigate(`/incidents/${this.model.id}`); }
  async onActionResolveIncident() { await this.model.save({ status: 'resolved' }); }
  async onActionDeleteIncident()  { /* ... */ }
}
```

### Permission filtering

Build the items array conditionally — `ContextMenu` has no permission system of its own.

```js
async onInit() {
  const user = this.getApp().activeUser;

  const items = [
    { label: 'View', action: 'view-record', icon: 'bi-eye' }
  ];

  if (user.hasPermission('edit_records')) {
    items.push({ label: 'Edit', action: 'edit-record', icon: 'bi-pencil' });
  }

  if (user.hasPermission('delete_records')) {
    items.push({ type: 'divider' });
    items.push({ label: 'Delete', action: 'delete-record', icon: 'bi-trash', danger: true });
  }

  this.addChild(new ContextMenu({
    containerId: 'row-menu',
    context: this.model,
    config: { items }
  }));
}
```

### State-dependent items

Re-build the menu when the underlying state changes — items are evaluated at construction time, so a fresh array is the cleanest approach:

```js
buildMenuItems() {
  return [
    { label: 'Edit Details', action: 'edit-file', icon: 'bi-pencil' },
    this.model.get('is_public')
      ? { label: 'Make Private', action: 'make-private', icon: 'bi-lock' }
      : { label: 'Make Public',  action: 'make-public',  icon: 'bi-unlock' },
    { type: 'divider' },
    { label: 'Delete', action: 'delete-file', icon: 'bi-trash', danger: true }
  ];
}
```

### Inline handlers (no parent action plumbing)

When the menu's behaviour is purely local, skip `onActionXxx` entirely and put the logic on the item:

```js
new ContextMenu({
  containerId: 'export-menu',
  context: this.report,
  config: {
    icon: 'bi-download',
    buttonClass: 'btn btn-outline-secondary',
    items: [
      {
        label: 'Export CSV',
        action: 'export-csv',
        icon: 'bi-filetype-csv',
        handler: (report) => report.exportAs('csv')
      },
      {
        label: 'Export JSON',
        action: 'export-json',
        icon: 'bi-filetype-json',
        handler: (report) => report.exportAs('json')
      }
    ]
  }
});
```

### Custom trigger styling

Replace both the icon and the trigger button class for a header-style menu:

```js
new ContextMenu({
  containerId: 'header-menu',
  config: {
    icon: 'bi-gear-fill',
    buttonClass: 'btn btn-outline-light border-2',
    items: [
      { label: 'Settings', action: 'open-settings', icon: 'bi-sliders' },
      { label: 'Help',     icon: 'bi-question-circle', href: '/docs', target: '_blank' }
    ]
  }
});
```

---

## Common Pitfalls

### ⚠️ Forgetting to add the menu as a child

`ContextMenu` dispatches actions via `this.parent.events`. If you build a ContextMenu but never call `addChild()` on it, `this.parent` is undefined and clicking an item will throw.

```js
// ❌ WRONG — no parent wired up
const menu = new ContextMenu({ config: { items: [...] } });
menu.render();
document.body.appendChild(menu.element);

// ✅ CORRECT — let the parent view manage it
async onInit() {
  this.menu = new ContextMenu({
    containerId: 'menu-slot',
    config: { items: [...] }
  });
  this.addChild(this.menu);
}
```

### ⚠️ Manually rendering after `addChild()`

The framework manages child render and mount automatically. Calling them yourself causes duplicate DOM and broken Bootstrap dropdown wiring.

```js
// ❌ WRONG
this.addChild(this.menu);
await this.menu.render();
await this.menu.mount();

// ✅ CORRECT
this.addChild(this.menu);
// That's it — the parent's render cycle handles the rest
```

### ⚠️ Expecting an `'action'` event on the menu

The header docstring on `ContextMenu.js` mentions emitting an `'action'` event, but that code is commented out — only `parent.events.dispatch(action, ...)` runs. Listeners on `menu.on('action', ...)` will never fire.

```js
// ❌ WRONG — never fires
this.menu.on('action', (data) => { /* ... */ });

// ✅ CORRECT — define onActionXxx on the parent view
async onActionDeleteRow(event, element) { /* ... */ }

// ✅ OR — use an inline handler on the item itself
{ label: 'Delete', action: 'delete-row', handler: (ctx) => { /* ... */ } }
```

### ⚠️ Putting permission checks inside the menu config

`ContextMenu` does not interpret a `permissions` key on items — that key is silently ignored. For permission-gated menus, filter the items array before constructing the menu (see [Permission filtering](#permission-filtering)). If you specifically want a Dialog's header menu with permission checks, use [Dialog](Dialog.md)'s `contextMenu` option instead, which has its own filter step.

### ⚠️ Replacing `className` instead of extending it

The default `className` is `'context-menu-view dropdown'`. The `dropdown` class is required for Bootstrap's dropdown to work. If you override `className`, include both:

```js
// ❌ WRONG — Bootstrap dropdown won't initialize
new ContextMenu({ className: 'my-custom-menu', /* ... */ });

// ✅ CORRECT — keep the dropdown class
new ContextMenu({ className: 'context-menu-view dropdown my-custom-menu', /* ... */ });
```

---

## Related Documentation

- **[Dialog](Dialog.md)** — Dialogs accept their own `contextMenu` option (with permission filtering) for header menus
- **[View](../core/View.md)** — ContextMenu extends View; child-view lifecycle, `addChild()`, and `containerId` are documented there
- **[ListView](ListView.md)** — Common host for ContextMenu instances (one per row)
- **[TableView](TableView.md)** — Row context menus use the same configuration shape
- **[Templates](../core/Templates.md)** — For the `data-container` placeholder used to mount a ContextMenu in a parent template

## Examples

<!-- examples:cross-link begin -->

Runnable, copy-paste reference in the examples portal:

- [`examples/portal/examples/components/ContextMenu/ContextMenuExample.js`](../../../examples/portal/examples/components/ContextMenu/ContextMenuExample.js) — Reusable Bootstrap-dropdown action menu — three-dots row menus, header menus, and inline handlers.

<!-- examples:cross-link end -->
