# Modal

**Modal** is the canonical JavaScript surface for modals and dialogs in WEB-MOJO. It owns the implementation of the typed-alert / confirm / prompt helpers and provides a clean static API for showing views in modal dialogs — no instance creation, no manual lifecycle management.

> **When to use Modal vs Dialog:**
> **Use `Modal` for all new code.** `Modal.alert / confirm / prompt / show / showModel / form / modelForm / dialog / showBusy` are the canonical entrypoints.
>
> [`Dialog`](Dialog.md) remains exported as the underlying View class — you can still construct one directly with `new Dialog({...})` for fine-grained control — but `Dialog.alert / confirm / prompt` are now thin pass-throughs that delegate here. Don't call them in new code; call `Modal.*` instead.

---

## Quick Start

```js
import Modal from '@core/views/feedback/Modal.js';

// Typed alerts — info / success / warning / error
await Modal.alert('All set!', 'Saved', { type: 'success' });
await Modal.alert('That action will affect 24 records.', 'Heads up', { type: 'warning' });

// Confirm — resolves true / false
const ok = await Modal.confirm('Delete this record?', 'Confirm Delete');

// Prompt — resolves entered text or null
const name = await Modal.prompt('Enter a name:', 'Rename', { defaultValue: 'untitled' });

// Show any View in a modal
await Modal.show(new DeviceView({ model: device }));

// Show a model's VIEW_CLASS automatically
await Modal.showModel(userModel);

// Fetch by ID, then show
await Modal.showModelById(User, 42);
```

**Live example:** [`examples/portal/examples/components/Dialog/DialogExample.js`](../../../examples/portal/examples/components/Dialog/DialogExample.js) (route `/components/dialog`) — runnable demo of the four canonical helpers plus the typed-alert variants.

### Via App Instance

Modal is available on the app instance as `app.modal`, similar to `app.rest` and `app.toast`:

```js
const app = this.getApp();

await app.modal.show(new GroupView({ model }));
await app.modal.showModel(userModel);
await app.modal.showModelById(User, 42);
await app.modal.confirm('Delete this?', 'Confirm');
await app.modal.alert('Done!');
await app.modal.form({ title: 'Add', fields: [...] });
```

---

## API Reference

### Modal.alert(message, title?, options?)

Show a typed alert dialog with a single OK button. The dialog style is determined by the `type` option, and the modal root receives a `modal-alert modal-alert-{type}` class for CSS targeting.

```js
// All four call signatures supported
await Modal.alert('Just an FYI.');
await Modal.alert({ message: 'Saved!', type: 'success', title: 'Done' });
await Modal.alert('Heads up', 'Warning');
await Modal.alert('That action will affect 24 records.', 'Heads up', { type: 'warning' });
```

**Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `message` | `string \| object` | required | Message string, or an options object with `{ message, title, type, ... }` |
| `title` | `string` | `'Alert'` | Dialog title |
| `options.type` | `string` | `'info'` | `'info' \| 'success' \| 'warning' \| 'error' \| 'danger'`. `'danger'` aliases `'error'`. |
| `options.size` | `string` | `'sm'` | Modal size: `sm`, `md`, `lg`, `xl`, `xxl`, `fullscreen` |
| `options.className` | `string` | — | Additional class on the modal root. Concatenated with the typed-alert class. |
| `options.*` | `any` | — | Any other [Dialog options](Dialog.md#constructor-options) |

**Returns:** `Promise<*>` — resolves when the OK button is clicked or the dialog is dismissed.

**Visual treatment:** typed alerts get a 4px solid colored left border (info=accent, success=green, warning=yellow, error=red) and a colored circle around the title icon — mirrors the toast notification styling. The accent for info-typed alerts is driven by the `--mojo-dialog-accent` CSS variable, which defaults to `var(--bs-primary)` and can be overridden at `:root` for a custom brand color.

---

### Modal.confirm(message, title?, options?)

Show a confirmation dialog with Cancel / Confirm buttons.

```js
const ok = await Modal.confirm('Delete this record? This cannot be undone.', 'Confirm Delete');
if (ok) await record.destroy();
```

**Parameters:** `message`, `title` (default `'Confirm'`), `options` (`cancelText`, `confirmText`, `confirmClass`, `size`, plus any [Dialog options](Dialog.md#constructor-options)).

**Returns:** `Promise<boolean>` — `true` on Confirm, `false` on Cancel/dismiss.

---

### Modal.prompt(message, title?, options?)

Show a dialog with a text input.

```js
const name = await Modal.prompt('Enter a name:', 'Rename', {
    defaultValue: 'untitled',
    placeholder: 'e.g. report-q4'
});
if (name !== null) await rename(name);
```

**Parameters:** `message`, `title` (default `'Input'`), `options` (`defaultValue`, `inputType`, `placeholder`, `size`, plus any [Dialog options](Dialog.md#constructor-options)).

**Returns:** `Promise<string|null>` — entered text on OK, `null` on Cancel/dismiss.

---

### Modal.showError(message)

Convenience wrapper. Equivalent to `Modal.alert(message, 'Error', { type: 'error' })`.

---

### Modal.show(view, options?)

Show a View instance in a modal dialog. Header is hidden by default (views have their own headers). Size defaults to `lg`.

```js
// Basic — just pass a view
await Modal.show(new GroupView({ model }));

// With options
await Modal.show(new GeoIPView({ model: geo }), {
    size: 'xl',
    title: 'IP Details',   // setting title enables the header
    buttons: [
        { text: 'Block IP', action: 'block', class: 'btn-danger' },
        { text: 'Close', class: 'btn-secondary', dismiss: true }
    ]
});
```

**Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `view` | `View` | required | View instance to display |
| `options.size` | `string` | `'lg'` | Dialog size: `sm`, `md`, `lg`, `xl`, `xxl`, `fullscreen` |
| `options.title` | `string\|false` | `false` | Dialog title. `false` hides the header. |
| `options.buttons` | `Array` | Close button | Footer buttons |
| `options.*` | `any` | — | Any other [Dialog options](Dialog.md#constructor-options) |

**Returns:** `Promise<*>` — resolves with button value or `null` if dismissed.

---

### Modal.showModel(model, options?)

Look up `model.constructor.VIEW_CLASS`, instantiate it, and show in a modal. Throws if no `VIEW_CLASS` is defined.

```js
// The model's class must have VIEW_CLASS set:
// User.VIEW_CLASS = UserView;
// Group.VIEW_CLASS = GroupView;

await Modal.showModel(userModel);
await Modal.showModel(groupModel, { size: 'xl' });
```

**Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `model` | `Model` | Model instance (constructor must have `VIEW_CLASS`) |
| `options` | `object` | Same options as `Modal.show()` |

**Throws:** `Error` if `VIEW_CLASS` is not defined on the model's constructor.

---

### Modal.showModelById(ModelClass, id, options?)

Fetch a model by ID, then show its `VIEW_CLASS`. Handles the common fetch-then-display pattern. Shows a warning alert if the model is not found.

```js
import { User } from '@core/models/User.js';
import { Group } from '@core/models/Group.js';

await Modal.showModelById(User, 42);
await Modal.showModelById(Group, parentId, { size: 'xl' });
```

**Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `ModelClass` | `Function` | Model class constructor (e.g., `User`, `Group`) |
| `id` | `string\|number` | Model ID to fetch |
| `options` | `object` | Same options as `Modal.show()` |

**Returns:** `Promise<*>` — resolves with button value, or `null` if model not found.

---

### Convenience Aliases

These re-export Dialog's static helpers so you never need a separate Dialog import:

```js
// All of these work without importing Dialog
await Modal.confirm('Delete this record?', 'Confirm');
await Modal.alert('Success!');
await Modal.prompt('Enter a name:', 'Rename');
await Modal.form({ title: 'Add User', fields: [...] });
await Modal.modelForm({ model, formConfig: UserForms.edit });
await Modal.data({ title: 'Details', model, fields: [...] });
```

| Method | Delegates to | Description |
|--------|-------------|-------------|
| `Modal.confirm(msg, title, opts)` | `Dialog.confirm` | Yes/No confirmation |
| `Modal.alert(msg, title, opts)` | `Dialog.alert` | Alert with icon |
| `Modal.prompt(msg, title, opts)` | `Dialog.prompt` | Text input |
| `Modal.form(opts)` | `Dialog.showForm` | Form without model saving |
| `Modal.modelForm(opts)` | `Dialog.showModelForm` | Form with auto model.save() |
| `Modal.data(opts)` | `Dialog.showData` | DataView display |

---

## VIEW_CLASS Pattern

For `Modal.showModel()` and `Modal.showModelById()` to work, the model's class must have a static `VIEW_CLASS` property pointing to the View class:

```js
// In your View file:
import { User } from '@core/models/User.js';

class UserView extends View {
    // ... view implementation
}

// This assignment enables Modal.showModel() and TableView click-to-view
User.VIEW_CLASS = UserView;

export default UserView;
```

Models with `VIEW_CLASS` defined:
- `User` → `UserView`
- `Group` → `GroupView`
- `UserDevice` → `DeviceView`
- `UserDeviceLocation` → `UserDeviceLocationView`
- `GeoLocatedIP` → `GeoIPView`
- `Setting` → `SettingView`

---

## Common Patterns

### Opening a parent/related model
```js
async onActionViewParent(event, element) {
    const parentId = element?.dataset?.id;
    if (parentId) {
        await Modal.showModelById(Group, parentId);
    }
}
```

### Showing a view with custom buttons
```js
const result = await Modal.show(new ReportView({ data }), {
    size: 'xl',
    title: 'Monthly Report',
    buttons: [
        { text: 'Export PDF', action: 'export', class: 'btn-primary', value: 'pdf' },
        { text: 'Close', class: 'btn-secondary', dismiss: true }
    ]
});
if (result === 'pdf') {
    // handle export
}
```

---

## Related Documentation

- [Dialog](Dialog.md) — Full dialog system with all options
- [TableView](TableView.md) — Automatic VIEW_CLASS opening on row click
- [View](../core/View.md) — Base view class

## Examples

<!-- examples:cross-link begin -->

Runnable, copy-paste references in the examples portal:

- [`examples/portal/examples/components/Modal/ModalExample.js`](../../../examples/portal/examples/components/Modal/ModalExample.js) — Modal.show(view) — size matrix (sm/md/lg/xl/xxl/fullscreen), scrollable, static backdrop.
- [`examples/portal/examples/components/Modal/ModalFormExample.js`](../../../examples/portal/examples/components/Modal/ModalFormExample.js) — Modal.form — host a FormView in a modal, resolve with the submitted data.
- [`examples/portal/examples/components/Modal/ModalShowModelExample.js`](../../../examples/portal/examples/components/Modal/ModalShowModelExample.js) — Modal.showModel and showModelById — open a model in its VIEW_CLASS automatically.

<!-- examples:cross-link end -->
