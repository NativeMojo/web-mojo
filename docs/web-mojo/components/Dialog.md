# Dialog

> **⚠️ Deprecated — use [Modal](Modal.md) instead.**
> Dialog still works and is not being removed, but new code should use `Modal` (or `app.modal`) for a simpler API. Modal wraps Dialog's static helpers — no need to learn a new system.
>
> ```js
> // ❌ Old — don't do this
> import Dialog from '@core/views/feedback/Dialog.js';
> const dialog = new Dialog({ body: view, size: 'lg' });
> await dialog.render(true, document.body);
> dialog.show();
>
> // ✅ New — use Modal
> import Modal from '@core/views/feedback/Modal.js';
> await Modal.show(view);
>
> // ✅ Or via app instance
> await app.modal.show(view);
> await app.modal.showModel(userModel);
> await app.modal.confirm('Delete?');
> ```

**Dialog** is WEB-MOJO's full-featured modal dialog system. It wraps Bootstrap 5 modals with a rich, declarative API for alerts, confirms, prompts, forms, data views, code display, and fully custom content — all driven by static helper methods that return Promises.

---

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Static Helper Methods](#static-helper-methods)
  - [alert()](#alert)
  - [confirm()](#confirm)
  - [prompt()](#prompt)
  - [showDialog()](#showdialog)
  - [showForm()](#showform)
  - [showModelForm()](#showmodelform)
  - [showModelView()](#showmodelview)
  - [showData()](#showdata)
  - [showCode()](#showcode)
  - [showHtmlPreview()](#showhtmlpreview)
- [Loading Indicator](#loading-indicator)
- [Constructor Options](#constructor-options)
- [Instance Methods](#instance-methods)
- [Context Menu](#context-menu)
- [Z-Index & Stacking](#z-index--stacking)
- [API Reference](#api-reference)
- [Common Patterns](#common-patterns)
- [Common Pitfalls](#common-pitfalls)
- [Related Documentation](#related-documentation)

---

## Overview

`Dialog` extends [View](../core/View.md) and provides:

- **Promise-based static helpers** — `await Dialog.confirm(...)`, `await Dialog.showForm(...)`, etc.
- **Multiple content types** — string messages, HTML, View instances, or form configurations
- **Button system** — fully configurable button labels, styles, actions, and dismiss behaviour
- **Auto-sizing** — intelligently sizes the modal to its content, up to configurable maximums
- **Fullscreen awareness** — mounts inside the fullscreen element when one is active
- **Context menus** — optional dropdown menu in the dialog header with permission-filtered items
- **Code display** — syntax-highlighted code blocks with copy-to-clipboard
- **HTML preview** — renders HTML in a sandboxed `<iframe>`
- **Stacking support** — multiple dialogs can be open simultaneously with correct z-index management
- **Global busy indicator** — `Dialog.showBusy()` / `Dialog.hideBusy()` for full-page loading states

---

## Quick Start

```js
import Dialog from 'web-mojo/views/feedback/Dialog';

// Simple alert
await Dialog.alert('Operation completed successfully!', 'Success');

// Confirm dialog — returns true/false
const confirmed = await Dialog.confirm('Are you sure you want to delete this record?');
if (confirmed) {
  await record.destroy();
}

// Prompt dialog — returns the entered string, or null if cancelled
const name = await Dialog.prompt('Enter your name:', 'Name', { defaultValue: 'Jane' });
if (name !== null) {
  console.log('Hello,', name);
}
```

Or from any view or page via the app helper methods:

```js
// Via app (preferred in pages/views)
await app.showError('Something went wrong!');
await app.showSuccess('Saved!');
const ok = await app.confirm('Delete this?', 'Confirm');
```

---

## Static Helper Methods

### `alert()`

```js
Dialog.alert(message, title?, options?)
// Returns: Promise<void>
```

Shows a modal alert with a single dismiss button. The dialog style is determined by the `type` option.

```js
// Basic
await Dialog.alert('Your changes have been saved.');

// Typed alerts
await Dialog.alert('File not found', 'Error',   { type: 'error' });
await Dialog.alert('Record saved',   'Success', { type: 'success' });
await Dialog.alert('Session expiring', 'Warning', { type: 'warning' });
await Dialog.alert('Server restarting in 5 minutes', 'Info', { type: 'info' });
```

**Options:**

| Option | Type | Default | Description |
|---|---|---|---|
| `type` | `string` | `'info'` | Alert style: `'info'`, `'success'`, `'warning'`, `'error'` |
| `size` | `string` | `'md'` | Modal size: `'sm'`, `'md'`, `'lg'`, `'xl'` |
| `centered` | `boolean` | `true` | Vertically center the modal |
| `buttonText` | `string` | `'OK'` | Close button label |
| `buttonClass` | `string` | `'btn-primary'` | Close button Bootstrap class |

---

### `confirm()`

```js
Dialog.confirm(message, title?, options?)
// Returns: Promise<boolean>
```

Shows a two-button confirmation dialog. Resolves `true` if the user clicks the confirm button, `false` if they click cancel or dismiss.

```js
const confirmed = await Dialog.confirm(
  'This will permanently delete the record. Continue?',
  'Confirm Delete'
);

if (confirmed) {
  await record.destroy();
  app.toast.success('Record deleted.');
}
```

**Options:**

| Option | Type | Default | Description |
|---|---|---|---|
| `size` | `string` | `'sm'` | Modal size |
| `centered` | `boolean` | `true` | Vertically center |
| `backdrop` | `string\|boolean` | `'static'` | `'static'` prevents closing by clicking the backdrop |
| `confirmText` | `string` | `'OK'` | Confirm button label |
| `confirmClass` | `string` | `'btn-primary'` | Confirm button Bootstrap class |
| `cancelText` | `string` | `'Cancel'` | Cancel button label |

---

### `prompt()`

```js
Dialog.prompt(message, title?, options?)
// Returns: Promise<string|null>
```

Shows a dialog with a text input. Resolves to the entered string on OK, or `null` if cancelled.

```js
const groupName = await Dialog.prompt(
  'Enter a name for the new group:',
  'Create Group',
  {
    placeholder: 'e.g. Marketing Team',
    defaultValue: '',
    inputType: 'text'
  }
);

if (groupName !== null && groupName.trim()) {
  await createGroup(groupName.trim());
}
```

**Options:**

| Option | Type | Default | Description |
|---|---|---|---|
| `defaultValue` | `string` | `''` | Pre-filled input value |
| `inputType` | `string` | `'text'` | HTML input type: `'text'`, `'email'`, `'password'`, etc. |
| `placeholder` | `string` | `''` | Input placeholder text |
| `size` | `string` | `'sm'` | Modal size |
| `centered` | `boolean` | `true` | Vertically center |
| `backdrop` | `string\|boolean` | `'static'` | Backdrop behaviour |

---

### `showDialog()`

```js
Dialog.showDialog(options)
// Returns: Promise<{ button, event } | any>
```

The general-purpose dialog method. Supports any content type, fully configurable buttons, and resolves with the clicked button's `value` (or the full `{ button, event }` result object).

```js
const result = await Dialog.showDialog({
  title:    'Choose Export Format',
  body:     'Select the format for your data export.',
  size:     'md',
  centered: true,
  buttons: [
    { text: 'CSV',     class: 'btn-primary',   value: 'csv' },
    { text: 'JSON',    class: 'btn-secondary',  value: 'json' },
    { text: 'Cancel',  class: 'btn-outline-secondary', dismiss: true }
  ]
});

if (result === 'csv')  exportAsCsv();
if (result === 'json') exportAsJson();
```

**Options:**

| Option | Type | Description |
|---|---|---|
| `title` | `string\|View` | Dialog header title. Supports HTML strings or a View instance |
| `body` | `string\|View` | Dialog body content. Supports HTML strings or a View instance |
| `header` | `string\|View` | Override the entire header |
| `footer` | `string\|View` | Override the entire footer |
| `size` | `string` | `'sm'`, `'md'`, `'lg'`, `'xl'`, `'fullscreen'` |
| `centered` | `boolean` | Vertically center the dialog |
| `scrollable` | `boolean` | Make the body scrollable with a fixed height |
| `backdrop` | `string\|boolean` | `true`, `false`, or `'static'` |
| `keyboard` | `boolean` | Close on Escape key (default: `true`) |
| `autoSize` | `boolean` | Auto-size to content (default: `true`) |
| `class` | `string` | Additional CSS class on the modal dialog element |
| `buttons` | `array` | Button configuration array (see below) |
| `contextMenu` | `array` | Context menu items shown in the header |

**Button Configuration:**

Each button object can have:

| Key | Type | Description |
|---|---|---|
| `text` | `string` | Button label text |
| `class` | `string` | Bootstrap button class (e.g. `'btn-primary'`) |
| `icon` | `string` | Bootstrap Icons class shown before label |
| `value` | `any` | Value that the Promise resolves with when this button is clicked |
| `action` | `string` | Named action (resolves the dialog and emits the action) |
| `dismiss` | `boolean` | If `true`, clicking this button closes the dialog without resolving a value |
| `disabled` | `boolean` | Render the button as disabled |
| `id` | `string` | DOM `id` for the button element |

---

### `showForm()`

```js
Dialog.showForm(options)
// Returns: Promise<{ submitted: boolean, data: object } | false>
```

Opens a dialog containing a dynamic form built from a field configuration array. Resolves with `{ submitted: true, data: {...} }` on submit, or `false` on cancel.

```js
const result = await Dialog.showForm({
  title:  'Create User',
  fields: [
    { name: 'email',        type: 'text',  label: 'Email',       required: true },
    { name: 'display_name', type: 'text',  label: 'Display Name' },
    { name: 'is_active',    type: 'switch', label: 'Active' }
  ],
  submitLabel: 'Create',
  cancelLabel: 'Cancel',
  size: 'md'
});

if (result && result.submitted) {
  await createUser(result.data);
}
```

**Options:**

| Option | Type | Description |
|---|---|---|
| `title` | `string` | Dialog title |
| `fields` | `array` | Field configuration array (same format as form views) |
| `model` | `Model` | Pre-populate form fields from a model's current data |
| `data` | `object` | Pre-populate form fields from a plain object |
| `defaults` | `object` | Default values for fields not in `data` |
| `submitLabel` | `string` | Submit button label (default: `'Save'`) |
| `cancelLabel` | `string` | Cancel button label (default: `'Cancel'`) |
| `size` | `string` | Modal size |
| `fileHandling` | `boolean` | Enable multipart file upload on submit |

---

### `showModelForm()`

```js
Dialog.showModelForm(options)
// Returns: Promise<{ submitted: boolean, model: Model } | false>
```

Like `showForm()`, but tied to a Model instance. On successful submit, the form data is applied to the model and `model.save()` is called automatically.

```js
const result = await Dialog.showModelForm({
  title:  'Edit User',
  model:  userModel,
  fields: UserForms.edit.fields,
  size:   'lg'
});

if (result && result.submitted) {
  app.toast.success('User saved!');
  await this.collection.fetch();
  await this.render();
}
```

**Options:**

Accepts the same options as `showForm()` plus:

| Option | Type | Description |
|---|---|---|
| `model` | `Model` | *(required)* The model instance to edit |
| `onSuccess` | `function` | Called with `(model)` after successful save |
| `onError` | `function` | Called with `(error, model)` on save failure |

---

### `showModelView()`

```js
Dialog.showModelView(modelClass, options)
// Returns: Promise<void>
```

Shows a model's data in a read-only dialog using the model's `DATA_VIEW` configuration (or a custom view class):

```js
// Using the model's built-in DATA_VIEW
await Dialog.showModelView(User, {
  header: 'User Details',
  size:   'lg'
});

// With a custom view
const viewInstance = new UserDetailView({ model: userModel });
await Dialog.showModelView(null, {
  header: 'User Details',
  body:   viewInstance,
  size:   'lg'
});
```

---

### `showData()`

```js
Dialog.showData(options)
// Returns: Promise<void>
```

Shows arbitrary data in a structured dialog with a configurable DataView:

```js
await Dialog.showData({
  title:   'Request Details',
  data:    apiResponse,
  fields: [
    { name: 'status',     label: 'Status',      type: 'text' },
    { name: 'created_at', label: 'Created',      type: 'datetime' },
    { name: 'payload',    label: 'Payload',      type: 'dataview' }
  ],
  size: 'lg'
});
```

---

### `showCode()`

```js
Dialog.showCode(code, language?, options?)
// Returns: Promise<void>
```

Displays formatted, syntax-highlighted code in a scrollable dialog with a copy-to-clipboard button:

```js
// Show a JSON response
await Dialog.showCode(
  JSON.stringify(apiResponse, null, 2),
  'json',
  { title: 'API Response' }
);

// Show Python code
await Dialog.showCode(pythonScript, 'python', { title: 'Generated Script' });
```

**Options:**

| Option | Type | Description |
|---|---|---|
| `title` | `string` | Dialog header title (default: `'Code'`) |
| `size` | `string` | Modal size (default: `'lg'`) |
| `scrollable` | `boolean` | Enable scrollable body (default: `true`) |

Syntax highlighting uses Prism.js if it is available on the page, with graceful fallback to plain `<pre><code>` output.

---

### `showHtmlPreview()`

```js
Dialog.showHtmlPreview(html, title?, options?)
// Returns: Promise<void>
```

Renders an HTML string in a sandboxed `<iframe>` dialog:

```js
await Dialog.showHtmlPreview(
  emailTemplate,
  'Email Preview',
  { size: 'xl', height: '600px' }
);
```

**Options:**

| Option | Type | Default | Description |
|---|---|---|---|
| `size` | `string` | `'xl'` | Modal size |
| `height` | `string` | `'500px'` | iframe height |

---

## Loading Indicator

`Dialog` provides a static global busy/loading indicator — a full-page spinner overlay — independent of any dialog instance.

### `Dialog.showBusy(options?)`

```js
Dialog.showBusy();
Dialog.showBusy({ message: 'Saving changes…' });
Dialog.showBusy({ title: 'Processing', message: 'This may take a moment.' });
```

**Options:**

| Option | Type | Description |
|---|---|---|
| `message` | `string` | Body text shown under the spinner |
| `title` | `string` | Header title (default: `'Please Wait'`) |
| `type` | `string` | Spinner style variant |

The busy indicator uses a reference counter — multiple calls to `showBusy()` stack, and `hideBusy()` must be called the same number of times to dismiss it.

### `Dialog.hideBusy(force?)`

```js
Dialog.hideBusy();        // Decrements counter; hides when it reaches 0
Dialog.hideBusy(true);    // Force-hide regardless of counter
```

### Usage Pattern

```js
Dialog.showBusy({ message: 'Loading dashboard…' });
try {
  await loadDashboardData();
} finally {
  Dialog.hideBusy();
}
```

---

## Constructor Options

When instantiating `Dialog` directly (rather than using static helpers):

| Option | Type | Default | Description |
|---|---|---|---|
| `title` | `string\|View` | `''` | Dialog header title |
| `body` | `string\|View` | `''` | Dialog body content |
| `header` | `string\|View` | — | Full custom header content |
| `footer` | `string\|View` | — | Full custom footer content |
| `size` | `string` | `'md'` | `'sm'`, `'md'`, `'lg'`, `'xl'`, `'fullscreen'` |
| `centered` | `boolean` | `false` | Vertically center |
| `scrollable` | `boolean` | `false` | Make body scrollable |
| `backdrop` | `string\|boolean` | `true` | Backdrop behaviour |
| `keyboard` | `boolean` | `true` | Close on Escape |
| `autoSize` | `boolean` | `true` | Auto-size to content |
| `class` | `string` | `''` | Additional CSS classes on the dialog element |
| `buttons` | `array` | `[]` | Button configuration array |
| `contextMenu` | `array` | `[]` | Context menu item array |
| `tagName` | `string` | `'div'` | Root element tag |
| `id` | `string` | *(generated)* | Modal ID attribute |

---

## Instance Methods

After creating a `Dialog` instance directly, these methods are available:

### `show(options?)`

Show the Bootstrap modal:

```js
const dialog = new Dialog({ title: 'Hello', body: 'World!' });
await dialog.mount(document.body);
dialog.show();
```

### `hide()`

Hide the modal (with Bootstrap animation):

```js
dialog.hide();
```

### `toggle(options?)`

Toggle the modal visible/hidden state:

```js
dialog.toggle();
```

### `isShown()`

Returns `true` if the modal is currently visible:

```js
if (dialog.isShown()) {
  dialog.hide();
}
```

### `getModal()`

Returns the underlying `bootstrap.Modal` instance:

```js
const bsModal = dialog.getModal();
bsModal.handleUpdate(); // Force Bootstrap to recalculate position
```

### `setContent(content, target?)`

Replace the dialog body content dynamically:

```js
await dialog.setContent('<p>New content loaded!</p>');
await dialog.setContent(myView); // Also accepts a View instance
```

### `setTitle(title)`

Update the dialog title:

```js
dialog.setTitle('New Title');
```

### `setLoading(isLoading, message?)`

Show/hide a loading spinner inside the dialog body:

```js
dialog.setLoading(true, 'Saving…');
await doWork();
dialog.setLoading(false);
```

### `handleUpdate()`

Signal Bootstrap to recalculate the modal position (useful after dynamic content changes):

```js
dialog.handleUpdate();
```

### `destroy()`

Close and fully remove the dialog from the DOM:

```js
await dialog.destroy();
```

---

## Context Menu

Dialogs can have a context menu (dropdown) in the header with optional permission checks:

```js
const result = await Dialog.showDialog({
  title: 'User Details',
  body:  userView,
  contextMenu: [
    {
      icon:   'bi-pencil',
      label:  'Edit User',
      action: 'edit',
      value:  'edit'
    },
    {
      icon:        'bi-trash',
      label:       'Delete User',
      action:      'delete',
      value:       'delete',
      permissions: ['manage_users']  // Only shown if user has this permission
    }
  ]
});

if (result === 'edit')   openEditDialog();
if (result === 'delete') confirmDelete();
```

**Context Menu Item Properties:**

| Key | Type | Description |
|---|---|---|
| `icon` | `string` | Bootstrap Icons class |
| `label` | `string` | Menu item text |
| `action` | `string` | Action identifier resolved when clicked |
| `value` | `any` | Value the dialog Promise resolves with |
| `permissions` | `string[]` | Required permissions — item hidden if user lacks them |
| `class` | `string` | Additional CSS class for the menu item |

---

## Z-Index & Stacking

`Dialog` automatically manages z-index when multiple dialogs are open simultaneously:

- Each new dialog gets a higher z-index than existing dialogs
- Backdrop z-index is coordinated to sit between dialogs
- Fullscreen-aware: when a fullscreen element is active, dialogs are mounted inside it

### Static Helpers

```js
// Get a z-index object appropriate for the current stacking depth
const zIndexes = Dialog.getFullscreenAwareZIndex();
// → { backdrop: 1050, modal: 1055 }

// Fix all open dialogs' backdrop stacking
Dialog.fixAllBackdropStacking();

// Update all open dialogs' stacking
Dialog.updateAllBackdropStacking();
```

---

## API Reference

### Static Methods

| Method | Returns | Description |
|---|---|---|
| `Dialog.alert(msg, title?, opts?)` | `Promise<void>` | Show a typed alert dialog |
| `Dialog.confirm(msg, title?, opts?)` | `Promise<boolean>` | Confirm dialog — resolves `true`/`false` |
| `Dialog.prompt(msg, title?, opts?)` | `Promise<string\|null>` | Prompt dialog — resolves entered text or `null` |
| `Dialog.showDialog(opts)` | `Promise<any>` | Generic dialog — resolves button value |
| `Dialog.showForm(opts)` | `Promise<object\|false>` | Dynamic form dialog |
| `Dialog.showModelForm(opts)` | `Promise<object\|false>` | Model-bound form dialog |
| `Dialog.showModelView(modelClass, opts)` | `Promise<void>` | Read-only model view dialog |
| `Dialog.showData(opts)` | `Promise<void>` | Data display dialog |
| `Dialog.showCode(code, lang?, opts?)` | `Promise<void>` | Syntax-highlighted code dialog |
| `Dialog.showHtmlPreview(html, title?, opts?)` | `Promise<void>` | HTML preview in iframe dialog |
| `Dialog.showBusy(opts?)` | `void` | Show full-page loading indicator |
| `Dialog.hideBusy(force?)` | `void` | Hide full-page loading indicator |
| `Dialog.getFullscreenAwareZIndex()` | `{ backdrop, modal }` | Get correct z-index for current stack depth |
| `Dialog.fixAllBackdropStacking()` | `void` | Restack all open dialog backdrops |
| `Dialog.updateAllBackdropStacking()` | `void` | Trigger a restack update |
| `Dialog.formatCode(code, lang?)` | `string` | Format code as highlighted HTML |
| `Dialog.highlightCodeBlocks(container)` | `void` | Highlight `<code>` blocks in a container |

### Instance Methods

| Method | Returns | Description |
|---|---|---|
| `show(opts?)` | `void` | Show the modal |
| `hide()` | `void` | Hide the modal |
| `toggle(opts?)` | `void` | Toggle modal visibility |
| `isShown()` | `boolean` | Whether the modal is currently visible |
| `getModal()` | `bootstrap.Modal` | The underlying Bootstrap Modal instance |
| `setContent(content, target?)` | `Promise<void>` | Replace dialog body content |
| `setTitle(title)` | `void` | Update the dialog title text |
| `setLoading(loading, message?)` | `void` | Show/hide loading state in the body |
| `handleUpdate()` | `void` | Signal Bootstrap to recalculate position |
| `destroy()` | `Promise<void>` | Close and remove from DOM |
| `mount(container?)` | `Promise<void>` | Mount into DOM container |
| `setupAutoSizing()` | `void` | Enable auto-sizing behaviour |
| `applyAutoSizing()` | `void` | Apply auto-size calculations immediately |
| `resetAutoSizing()` | `void` | Remove auto-sizing styles |

---

## Common Patterns

### Deleting a Record Safely

```js
class UsersPage extends Page {
  async onActionDeleteUser(event, element) {
    const id   = element.dataset.id;
    const name = element.dataset.name;

    const confirmed = await Dialog.confirm(
      `Delete "${name}"? This action cannot be undone.`,
      'Delete User',
      { backdrop: 'static' }
    );

    if (!confirmed) return;

    Dialog.showBusy({ message: 'Deleting user…' });
    try {
      const resp = await this.getApp().rest.DELETE(`/api/user/${id}`);
      if (resp.success && resp.data.status) {
        this.getApp().toast.success('User deleted.');
        await this.collection.fetch();
        await this.render();
      } else {
        await Dialog.alert(resp.data.error || 'Delete failed', 'Error', { type: 'error' });
      }
    } finally {
      Dialog.hideBusy();
    }
  }
}
```

### Editing a Record in a Form Dialog

```js
class UsersPage extends Page {
  async onActionEditUser(event, element) {
    const user = this.collection.get(element.dataset.id);

    const result = await Dialog.showModelForm({
      title:  `Edit ${user.get('display_name')}`,
      model:  user,
      fields: UserForms.edit.fields,
      size:   'lg'
    });

    if (result && result.submitted) {
      // Model was already saved by showModelForm
      this.getApp().toast.success('User updated successfully.');
      await this.render();
    }
  }
}
```

### Displaying an API Response

```js
class ApiExplorerView extends View {
  async onActionShowResponse(event, element) {
    const response = await this.getApp().rest.GET('/api/system/status');
    await Dialog.showCode(
      JSON.stringify(response.data, null, 2),
      'json',
      { title: 'API Response', size: 'lg' }
    );
  }
}
```

### Custom Multi-Button Dialog

```js
async chooseAction(item) {
  const choice = await Dialog.showDialog({
    title: `Actions for "${item.name}"`,
    body:  `Choose an action to perform on this item.`,
    size:  'sm',
    buttons: [
      { text: 'View',     icon: 'bi-eye',    class: 'btn-outline-primary', value: 'view' },
      { text: 'Edit',     icon: 'bi-pencil', class: 'btn-outline-secondary', value: 'edit' },
      { text: 'Delete',   icon: 'bi-trash',  class: 'btn-outline-danger', value: 'delete' },
      { text: 'Cancel',                      class: 'btn-link text-muted', dismiss: true }
    ]
  });

  switch (choice) {
    case 'view':   await this.viewItem(item);   break;
    case 'edit':   await this.editItem(item);   break;
    case 'delete': await this.deleteItem(item); break;
  }
}
```

### Dialog with a View as Body

```js
// Embed a full MOJO View in the dialog
const statsView = new StatsView({ model: reportModel });

await Dialog.showDialog({
  title:    'Report Summary',
  body:     statsView,    // View instance rendered inside the dialog
  size:     'xl',
  buttons: [
    { text: 'Export', icon: 'bi-download', class: 'btn-primary', value: 'export' },
    { text: 'Close',  class: 'btn-secondary', dismiss: true }
  ]
});
```

### Chained Dialogs

```js
async onActionImportData(event, element) {
  // Step 1: Choose format
  const format = await Dialog.showDialog({
    title: 'Import Data',
    body:  'Choose the data format to import:',
    buttons: [
      { text: 'CSV',  value: 'csv',  class: 'btn-primary' },
      { text: 'JSON', value: 'json', class: 'btn-secondary' },
      { text: 'Cancel', dismiss: true }
    ]
  });

  if (!format) return;

  // Step 2: Confirm overwrite
  const confirmed = await Dialog.confirm(
    `Importing ${format.toUpperCase()} will overwrite existing data. Continue?`,
    'Confirm Import',
    { backdrop: 'static' }
  );

  if (!confirmed) return;

  // Step 3: Process
  Dialog.showBusy({ message: `Importing ${format.toUpperCase()}…` });
  try {
    await this.importData(format);
    Dialog.hideBusy();
    await Dialog.alert('Import complete!', 'Success', { type: 'success' });
  } catch (err) {
    Dialog.hideBusy();
    await Dialog.alert(err.message, 'Import Failed', { type: 'error' });
  }
}
```

---

## Common Pitfalls

### ⚠️ Not awaiting dialog calls

Dialogs are async and return Promises. If you don't await them, you can't use the result and the dialog may be garbage-collected prematurely.

```js
// ❌ WRONG — result is a Promise, not a boolean
const ok = Dialog.confirm('Sure?');
if (ok) { ... } // Always truthy!

// ✅ CORRECT
const ok = await Dialog.confirm('Sure?');
if (ok) { ... }
```

### ⚠️ Using data-action="submit" on form tags inside Dialog

`Dialog` manages buttons outside the `<form>` element. Using `type="submit"` or `data-action` on a form tag will cause duplicate/conflicting behaviour.

```html
<!-- ❌ WRONG -->
<form data-action="save">
  <input name="email">
  <button type="submit">Save</button>
</form>

<!-- ✅ CORRECT — use buttons config in showForm() or type="button" -->
<form>
  <input name="email">
  <!-- button comes from the Dialog buttons config, not inside the form -->
</form>
```

### ⚠️ showBusy() without hideBusy() in a finally block

If an error is thrown between `showBusy()` and `hideBusy()`, the spinner gets stuck.

```js
// ❌ WRONG
Dialog.showBusy();
await doWork(); // If this throws, hideBusy never runs
Dialog.hideBusy();

// ✅ CORRECT
Dialog.showBusy();
try {
  await doWork();
} finally {
  Dialog.hideBusy(); // Always runs
}
```

### ⚠️ Mismatched showBusy / hideBusy counts

`showBusy` and `hideBusy` use a reference counter. Calling `showBusy()` twice requires calling `hideBusy()` twice.

```js
// ❌ WRONG — spinner never hides (counter = 2, only decremented once)
Dialog.showBusy();
Dialog.showBusy();
Dialog.hideBusy(); // Counter goes 2 → 1, still showing!

// ✅ CORRECT — use force:true if counts get out of sync
Dialog.hideBusy(true); // Force-hide regardless of counter

// OR — track carefully
Dialog.showBusy();
Dialog.hideBusy();
Dialog.showBusy();
Dialog.hideBusy();
```

### ⚠️ Passing an unrendered View as body

When you pass a `View` instance as the `body`, Dialog calls `view.render()` internally. The view must not be already mounted elsewhere.

```js
// ❌ WRONG — view is already mounted in the page
const existingView = this.headerView;
await Dialog.showDialog({ body: existingView }); // DOM conflict

// ✅ CORRECT — create a new instance specifically for the dialog
const dialogView = new UserDetailView({ model: user });
await Dialog.showDialog({ body: dialogView });
```

### ⚠️ Expecting dismiss buttons to resolve the Promise

Buttons with `dismiss: true` **close** the dialog but do **not** resolve the Promise with a value — the Promise resolves with `undefined`/`null` when a dismiss button is clicked.

```js
const result = await Dialog.showDialog({
  buttons: [
    { text: 'Save',   value: 'save' },
    { text: 'Cancel', dismiss: true }
  ]
});

// result is 'save' when Save is clicked
// result is undefined/null when Cancel (dismiss) is clicked
if (result === 'save') { ... }
```

---

## Related Documentation

- **[WebApp](../core/WebApp.md)** — Provides `app.showError()`, `app.confirm()`, `app.showLoading()` etc. which delegate to Dialog
- **[PortalApp](../core/PortalApp.md)** — Uses Dialog for `showProfile()` and `changePassword()` built-in dialogs
- **[View](../core/View.md)** — Dialog extends View; View instances can be embedded as dialog bodies
- **[ToastService](../services/ToastService.md)** — Non-blocking alternative for lightweight notifications
- **[Forms](../forms/)** — The form configuration system used by `showForm()` and `showModelForm()`
- **[DataView](./DataView.md)** — The data display component used by `showModelView()` and `showData()`

## Examples

<!-- examples:cross-link begin -->

Runnable, copy-paste references in the examples portal:

- [`examples/portal/examples/components/Dialog/DialogExample.js`](../../../examples/portal/examples/components/Dialog/DialogExample.js) — Modal dialogs — alert, confirm, prompt, busy, and custom buttons.
- [`examples/portal/examples/components/Dialog/DialogContextMenuExample.js`](../../../examples/portal/examples/components/Dialog/DialogContextMenuExample.js) — Header dropdown menu inside a Dialog. Resolves Promise with selected value.

<!-- examples:cross-link end -->
