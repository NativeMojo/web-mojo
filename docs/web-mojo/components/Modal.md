# Modal

**Modal** is the canonical JavaScript surface for modals and dialogs in WEB-MOJO. It owns the implementation of every modal helper — typed alerts, confirm/prompt, generic dialogs, forms, code/HTML viewers, and the loading overlay — and provides a clean static API with no instance creation or manual lifecycle management.

> **When to use Modal vs ModalView vs Dialog:**
> - **`Modal.*`** — canonical static API. Use this for all new code.
> - **[`ModalView`](ModalView.md)** — the underlying View class. Use `new ModalView({...})` only when you need a long-lived instance handle (event listeners, dynamic `setContent`, streaming updates).
> - **[`Dialog`](Dialog.md)** — backwards-compatibility shim. Default-exports `ModalView` and routes every static through `Modal.*`. Existing `new Dialog({...})` and `Dialog.show*()` callers keep working unchanged, but new code should not use it.

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

**Visual treatment:** typed alerts get a 6px colored hero band across the top of the modal card and a subtle tinted card background (5% accent on light, 10% on dark). The accent for info-typed alerts is driven by the `--mojo-dialog-accent` CSS variable, which defaults to `var(--bs-primary)` and can be overridden at `:root` for a custom brand color. Success/warning/error use fixed tokens (`#198754` / `#ffc107` / `#dc3545`) and are not affected by `--mojo-dialog-accent`.

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

### Additional Helpers

`Modal` owns the full canonical surface — every dialog flavour lives here:

```js
await Modal.dialog({ title: 'Choose', body: '...', buttons: [...] });
await Modal.form({ title: 'Add User', fields: [...] });
await Modal.modelForm({ model, formConfig: UserForms.edit });
await Modal.data({ title: 'Details', model, fields: [...] });
await Modal.code({ code: src, language: 'javascript', title: 'Source' });
await Modal.htmlPreview({ html: '<h1>Preview</h1>', title: 'Email' });
await Modal.showModelView(userModel);                   // read-only, no buttons
await Modal.updateModelImage({ model: user, field: 'avatar', upload: true });
```

| Method | Returns | Description |
|--------|---------|-------------|
| `Modal.dialog(opts)` | `Promise<*>` | Generic promise-based dialog with full button-handler protocol |
| `Modal.form(opts)` | `Promise<object\|null>` | Render a `FormView` for ad-hoc data collection |
| `Modal.modelForm(opts)` | `Promise<object\|null>` | Render a `FormView` and auto-save to the model on submit |
| `Modal.data(opts)` | `Promise<*>` | Render a `DataView` for read-only structured data |
| `Modal.code(opts)` | `Promise<*>` | Syntax-highlighted code (`CodeViewer`) with copy-to-clipboard |
| `Modal.htmlPreview(opts)` | `Promise<*>` | Sandboxed HTML preview (`HtmlPreview`) with refresh button |
| `Modal.showModelView(model, opts)` | `Promise<*>` | Read-only model display via the model's `VIEW_CLASS` |
| `Modal.updateModelImage(opts, fieldOpts)` | `Promise<*>` | Image-upload + model-save flow (avatar uploader pattern) |
| `Modal.loading(opts)` | `void` | Show full-screen loading overlay (alias: `showBusy`) |
| `Modal.hideLoading(force?)` | `void` | Hide overlay (alias: `hideBusy`) |

> `Dialog.alert / confirm / prompt / showDialog / showForm / showModelForm / showData / showCode / showHtmlPreview / showBusy / hideBusy` all forward to the matching `Modal.*` method via the [Dialog compat shim](Dialog.md).

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

- [ModalView](ModalView.md) — The underlying View class. Subclass it for custom modal types.
- [Dialog](Dialog.md) — Backwards-compatibility shim for legacy `new Dialog()` and `Dialog.show*()` callers.
- [TableView](TableView.md) — Automatic VIEW_CLASS opening on row click
- [View](../core/View.md) — Base view class

## Examples

<!-- examples:cross-link begin -->

Runnable, copy-paste references in the examples portal:

- [`examples/portal/examples/components/Modal/ModalExample.js`](../../../examples/portal/examples/components/Modal/ModalExample.js) — Modal.show(view) — size matrix (sm/md/lg/xl/xxl/fullscreen), scrollable, static backdrop.
- [`examples/portal/examples/components/Modal/ModalFormExample.js`](../../../examples/portal/examples/components/Modal/ModalFormExample.js) — Modal.form — host a FormView in a modal, resolve with the submitted data.
- [`examples/portal/examples/components/Modal/ModalShowModelExample.js`](../../../examples/portal/examples/components/Modal/ModalShowModelExample.js) — Modal.showModel and showModelById — open a model in its VIEW_CLASS automatically.

<!-- examples:cross-link end -->
