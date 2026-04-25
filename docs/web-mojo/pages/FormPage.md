# FormPage

`FormPage` is a `Page` subclass that **automatically manages a `FormView` child**. Declare your `fields` array, point it at a model, and you get a fully working edit form as a routed page — no manual `addChild`, no `containerId` wiring, no `recreateFormView` boilerplate.

It is the fastest way to build a settings or profile edit page in a MOJO portal application.

---

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [How It Works](#how-it-works)
- [Constructor Options](#constructor-options)
- [Model Resolution](#model-resolution)
- [Group-Aware Forms](#group-aware-forms)
- [Overriding `getModel()`](#overriding-getmodel)
- [Lifecycle Hooks](#lifecycle-hooks)
- [Adding Custom Actions](#adding-custom-actions)
- [Full Override Example](#full-override-example)
- [Common Pitfalls](#common-pitfalls)
- [Related Documentation](#related-documentation)

---

## Overview

`FormPage` solves the most common pattern in portal applications: *"I have a model and I want an edit form for it as a routed page."*

Without `FormPage` you would wire this up manually every time:

```js
// ❌ Without FormPage — repetitive boilerplate
class SettingsPage extends Page {
  async onInit() {
    await super.onInit();
    this.formView = new FormView({
      containerId: 'form-container',
      fields: this.options.fields,
      autosaveModelField: true
    });
    this.addChild(this.formView);
  }

  async onEnter() {
    await super.onEnter();
    // Destroy and rebuild so each visit gets a clean form
    if (this.formView) {
      await this.formView.destroy();
      this.removeChild(this.formView);
      this.formView = new FormView({ ... });
      this.addChild(this.formView);
    }
    const model = await this.getModel();
    if (model) this.formView.setModel(model);
  }
}
```

With `FormPage` that collapses to:

```js
// ✅ With FormPage — just declare fields
class SettingsPage extends FormPage {
  static pageName = 'settings';
  static route    = '?page=settings';

  fields = [
    { type: 'text',     name: 'display_name', label: 'Display Name', required: true },
    { type: 'email',    name: 'email',         label: 'Email',        required: true },
    { type: 'textarea', name: 'bio',           label: 'Bio',          rows: 4 },
  ];
}
```

---

## Quick Start

### User profile page (model on the page itself)

```js
import FormPage from 'web-mojo/FormPage';
import { User } from 'web-mojo/models';

export default class ProfilePage extends FormPage {
  static pageName = 'profile';
  static route    = '?page=profile';

  get title()       { return 'My Profile'; }
  get icon()        { return 'bi-person-circle'; }
  sidebarMenu       = 'default';

  fields = [
    { type: 'text',  name: 'display_name', label: 'Display Name', required: true, columns: { md: 6 } },
    { type: 'email', name: 'email',         label: 'Email',        required: true, columns: { md: 6 } },
    { type: 'textarea', name: 'bio',        label: 'Bio',          rows: 3 },
  ];

  // Override getModel to load the current user
  async getModel() {
    const user = this.getApp().activeUser;
    if (user && !user.isFetched) {
      await user.fetch();
    }
    return user;
  }
}
```

### Group settings page (uses `activeGroup` automatically)

```js
import FormPage from 'web-mojo/FormPage';

export default class GroupSettingsPage extends FormPage {
  static pageName = 'group-settings';
  static route    = '?page=group-settings';

  get title() { return 'Group Settings'; }
  sidebarMenu = 'org-menu';

  // No getModel() override needed — FormPage falls back to app.activeGroup
  fields = [
    { type: 'text',   name: 'name',        label: 'Group Name',    required: true },
    { type: 'text',   name: 'description', label: 'Description' },
    { type: 'select', name: 'timezone',    label: 'Timezone',
      options: Intl.supportedValuesOf('timeZone').map(tz => ({ value: tz, label: tz })) },
  ];
}
```

When the user switches to a different group, the form is automatically recreated with the new group's data — no extra code required.

---

## How It Works

### Initialization (`onInit`)

On the first visit `onInit` calls `recreateFormView()`:

1. Creates a `FormView` with `{ containerId: 'form-view-container', fields, autosaveModelField: true }`
2. Calls `addChild(this.formView)` — the framework renders and mounts it
3. Resolves the model via `getModel()` and calls `formView.setModel(model)`

### Per-visit refresh (`onEnter`)

Every time the page is navigated to, `onEnter` calls `recreateFormView()` again:

- **Destroys** the previous `FormView` (prevents stale field state, dirty flags, cached values)
- Builds a fresh `FormView` and binds the current model

This guarantees the form always reflects the latest model data, even if the model was updated elsewhere in the app between visits.

### Group change (`onGroupChange`)

When `app.setActiveGroup(group)` is called anywhere in the app, `FormPage` intercepts the change and calls `recreateFormView()` automatically, so the form immediately reflects the new group's data.

---

## Constructor Options

`FormPage` accepts all standard [`Page` constructor options](./Page.md#constructor-options) plus:

| Option | Type | Default | Description |
|---|---|---|---|
| `fields` | `Array` | `[]` | Field definitions passed to `FormView` / `FormBuilder` |
| `title` | `string` | `'Form Page'` | Page title shown in TopNav |
| `description` | `string` | `'A page for submitting forms'` | Page description |
| `icon` | `string` | `'form'` | Page icon |
| `className` | `string` | `'form-page container-sm'` | CSS classes on the root element |

The `fields` option can be passed either through the constructor or declared as a class property — class properties are preferred because they are evaluated per-instance and benefit from IDE autocompletion:

```js
// ✅ Preferred — class property
class MyPage extends FormPage {
  fields = [ /* ... */ ];
}

// Also valid — constructor option
class MyPage extends FormPage {
  constructor(opts = {}) {
    super({ ...opts, fields: [ /* ... */ ] });
  }
}
```

---

## Model Resolution

`getModel()` is an `async` method that resolves which model the form should bind to. The default implementation:

```js
async getModel() {
  if (this.model) {
    return this.model;        // 1. Model set directly on the page instance
  } else if (this.getApp().activeGroup) {
    return this.getApp().activeGroup;  // 2. Active group (portal group context)
  }
  return null;                // 3. No model — form renders without bound data
}
```

**Resolution order:**

| Priority | Source | When to use |
|---|---|---|
| 1st | `this.model` | Set in constructor options or via `this.setModel(m)` |
| 2nd | `app.activeGroup` | Group settings pages — automatic, requires no override |
| 3rd | `null` | Pure create forms (no pre-fill needed) |

---

## Group-Aware Forms

Group-aware pages require **zero extra code** — the default `getModel()` falls back to `app.activeGroup`, and `onGroupChange` automatically recreates the form on group switch.

```js
export default class CompliancePolicyPage extends FormPage {
  static pageName = 'compliance-policy';
  static route    = '?page=compliance-policy';
  sidebarMenu     = 'org-menu';

  fields = [
    { type: 'switch', name: 'enforce_mfa',      label: 'Require MFA' },
    { type: 'switch', name: 'enforce_sso',      label: 'Require SSO' },
    { type: 'number', name: 'session_timeout',  label: 'Session Timeout (minutes)', min: 5, max: 1440 },
    { type: 'select', name: 'password_policy',  label: 'Password Policy',
      options: [
        { value: 'standard', label: 'Standard' },
        { value: 'strict',   label: 'Strict (NIST 800-63)' },
      ]
    },
  ];
}
```

When the portal user selects a different organization, the form automatically reloads with that organization's policy settings.

---

## Overriding `getModel()`

For any model that isn't `app.activeGroup`, override `getModel()`:

### Load a specific REST model

```js
import FormPage from 'web-mojo/FormPage';
import { BillingSettings } from '../models/BillingSettings.js';

export default class BillingSettingsPage extends FormPage {
  static pageName = 'billing-settings';
  static route    = '?page=billing-settings';

  fields = [
    { type: 'text', name: 'company_name',   label: 'Company Name',   required: true },
    { type: 'text', name: 'billing_email',  label: 'Billing Email',  required: true },
    { type: 'text', name: 'vat_number',     label: 'VAT Number' },
  ];

  async getModel() {
    if (!this._billingSettings) {
      this._billingSettings = new BillingSettings({ id: 'me' });
    }
    await this._billingSettings.fetch();
    return this._billingSettings;
  }
}
```

### Load a sub-resource of the active group

```js
async getModel() {
  const group = this.getApp().activeGroup;
  if (!group) return null;

  if (!this._notificationSettings) {
    this._notificationSettings = new NotificationSettings({ group_id: group.id });
  }
  await this._notificationSettings.fetch();
  return this._notificationSettings;
}
```

### Return a plain object (create form / no pre-fill)

```js
async getModel() {
  return null; // FormView renders with empty defaults — suitable for "create" forms
}
```

---

## Lifecycle Hooks

`FormPage` uses the same lifecycle as `Page`. The important rule is that **`onEnter` triggers a full `recreateFormView()`**, so any setup that depends on the model should go in `getModel()`, not in `onEnter` before the super call.

```js
export default class SettingsPage extends FormPage {
  async onEnter() {
    // ✅ Call super FIRST — it recreates the formView and binds the model
    await super.onEnter();

    // Safe to access this.formView here — it's fully ready
    // e.g. scroll to top, set focus, load secondary data
    window.scrollTo(0, 0);
  }

  async onExit() {
    // Clean up anything created in onEnter
    await super.onExit();
  }
}
```

### ⚠️ Do not call `recreateFormView()` manually in `onEnter`

`super.onEnter()` already calls it. Calling it again will double-mount the form.

```js
// ❌ WRONG — causes double recreation
async onEnter() {
  await super.onEnter();
  await this.recreateFormView(); // Don't do this
}
```

---

## Adding Custom Actions

The default `FormPage` template is:

```html
<div data-container="form-view-container"></div>
```

`FormView` renders a submit button itself when a form config includes one. For pages where you need additional actions (e.g. a "Save" button in a specific position, or a "Cancel" button that navigates back), extend the template:

```js
export default class AccountSettingsPage extends FormPage {
  static pageName = 'account-settings';
  static route    = '?page=account-settings';

  // Override template to add custom action bar
  template = `
    <div class="container-sm py-4">
      <div class="d-flex align-items-center justify-content-between mb-4">
        <h4 class="mb-0"><i class="bi bi-gear me-2"></i>Account Settings</h4>
        <div>
          <button type="button" class="btn btn-outline-secondary me-2"
                  data-action="cancel">Cancel</button>
          <button type="button" class="btn btn-primary"
                  data-action="save">Save Changes</button>
        </div>
      </div>
      <div data-container="form-view-container"></div>
    </div>
  `;

  fields = [
    { type: 'text',  name: 'display_name', label: 'Display Name', required: true },
    { type: 'email', name: 'email',         label: 'Email',        required: true },
  ];

  async onActionSave(event, element) {
    const formData = await this.formView.getFormData();
    const isValid  = this.formView.validate();

    if (!isValid) return;

    const model = await this.getModel();
    model.set(formData);

    try {
      await model.save();
      this.getApp().showSuccess('Settings saved.');
    } catch (err) {
      this.getApp().showError('Could not save settings.');
    }
  }

  async onActionCancel() {
    this.navigate('?page=dashboard');
  }
}
```

> **Note:** When you add a custom save button like this, set `autosaveModelField: false` in your fields or avoid relying on FormView's own submit button — otherwise you may get double-saves.

---

## Full Override Example

A complete production-style page showing all customization points:

```js
import FormPage from 'web-mojo/FormPage';
import { OrganizationProfile } from '../models/OrganizationProfile.js';

export default class OrgProfilePage extends FormPage {
  // ── Routing ────────────────────────────────────────────
  static pageName = 'org-profile';
  static route    = '?page=org-profile';

  get title()  { return this.getApp().activeGroup?.get('name') || 'Organization Profile'; }
  get icon()   { return 'bi-building'; }
  sidebarMenu  = 'org-menu';

  // ── Form fields ────────────────────────────────────────
  fields = [
    {
      type: 'group', title: 'Basic Information',
      fields: [
        { type: 'text',  name: 'name',        label: 'Organization Name', required: true, columns: { md: 6 } },
        { type: 'text',  name: 'website',      label: 'Website',                           columns: { md: 6 } },
        { type: 'textarea', name: 'description', label: 'Description', rows: 3 },
      ]
    },
    {
      type: 'group', title: 'Contact',
      fields: [
        { type: 'email', name: 'billing_email', label: 'Billing Email', required: true, columns: { md: 6 } },
        { type: 'tel',   name: 'phone',          label: 'Phone Number',                   columns: { md: 6 } },
      ]
    },
  ];

  // ── Model resolution ───────────────────────────────────
  async getModel() {
    const group = this.getApp().activeGroup;
    if (!group) return null;

    // Load org profile as a sub-resource of the group
    if (!this._profile || this._profile.group_id !== group.id) {
      this._profile = new OrganizationProfile({ group_id: group.id });
      await this._profile.fetch();
    }
    return this._profile;
  }

  // ── Permissions ────────────────────────────────────────
  canEnter() {
    const user = this.getApp().activeUser;
    return user?.hasPermission('manage_organization') ?? false;
  }

  // ── Lifecycle ──────────────────────────────────────────
  async onEnter() {
    await super.onEnter();   // recreates formView and binds model
    this.setMeta({
      title: `${this.getApp().activeGroup?.get('name')} — Profile`,
    });
  }

  // ── After group switch, invalidate cached model ────────
  async onGroupChange(group) {
    this._profile = null;    // invalidate cache
    await super.onGroupChange(group); // triggers recreateFormView → getModel
  }
}
```

---

## Common Pitfalls

### ⚠️ Accessing `this.formView` before `onEnter` completes

`this.formView` is created in `onInit` and replaced on every `onEnter`. Never cache a reference to it across navigations.

```js
// ❌ WRONG — formView is replaced on next onEnter
this._savedRef = this.formView;

// ✅ CORRECT — always reference this.formView directly
const data = await this.formView.getFormData();
```

### ⚠️ Calling `setModel()` directly after construction

`FormPage` calls `getModel()` inside `recreateFormView()`. If you set `this.model = something` directly you will get the old model on the next visit because `recreateFormView` calls `getModel()` which only checks `this.model` as a fallback. Override `getModel()` instead.

```js
// ❌ WRONG
async onEnter() {
  await super.onEnter();
  this.formView.setModel(someOtherModel); // stomped on next visit
}

// ✅ CORRECT
async getModel() {
  return someOtherModel;
}
```

### ⚠️ Forgetting `await super.onGroupChange(group)`

If you override `onGroupChange` to invalidate a cached model, you **must** call `super.onGroupChange(group)` — that is what triggers the actual form recreation.

```js
// ❌ WRONG — form never refreshes
async onGroupChange(group) {
  this._model = null;
}

// ✅ CORRECT
async onGroupChange(group) {
  this._model = null;
  await super.onGroupChange(group);
}
```

### ⚠️ Heavy data fetching in `getModel()` on every visit

`getModel()` is called on every `onEnter` and every `onGroupChange`. Cache the model instance and only re-fetch when necessary:

```js
// ❌ WRONG — fetches from the server on every page visit
async getModel() {
  const m = new SettingsModel();
  await m.fetch();
  return m;
}

// ✅ CORRECT — cache until group changes
async getModel() {
  const group = this.getApp().activeGroup;
  if (!this._model || this._model.groupId !== group?.id) {
    this._model = new SettingsModel({ group_id: group?.id });
    await this._model.fetch();
  }
  return this._model;
}
```

### ⚠️ Missing `data-container="form-view-container"` in custom templates

If you override `template`, the `FormView` mounts to `data-container="form-view-container"`. If you rename or remove that container the form will silently not appear.

```js
// ❌ WRONG — form-view-container missing
template = `<div class="my-wrapper"><div data-container="content"></div></div>`;

// ✅ CORRECT
template = `<div class="my-wrapper"><div data-container="form-view-container"></div></div>`;
```

---

## API Reference

### Constructor Options

| Option | Type | Default | Description |
|---|---|---|---|
| `fields` | `Array` | `[]` | Field definitions (see [FieldTypes.md](../forms/FieldTypes.md)) |
| `title` | `string` | `'Form Page'` | Page title |
| `description` | `string` | `'A page for submitting forms'` | Page description |
| `icon` | `string` | `'form'` | Page icon class |
| `className` | `string` | `'form-page container-sm'` | Root element CSS classes |

### Instance Properties

| Property | Type | Description |
|---|---|---|
| `this.formView` | `FormView` | The managed `FormView` instance — replaced on every `onEnter` |
| `this.fields` | `Array` | Field definitions (read by `recreateFormView`) |

### Methods

| Method | Returns | Description |
|---|---|---|
| `getModel()` | `Promise<Model\|null>` | Override to supply the model for the form |
| `recreateFormView()` | `Promise<void>` | Destroy and rebuild the FormView — called by `onEnter` and `onGroupChange` |
| `onGroupChange(group)` | `Promise<void>` | Called when `app.activeGroup` changes — triggers `recreateFormView` |

All standard `Page` and `View` methods are also available — see [Page.md](./Page.md) (same directory).

---

## Related Documentation

- **[Page.md](./Page.md)** — base class, routing lifecycle, `onEnter`/`onExit`, permissions
- **[FormView.md](../forms/FormView.md)** — the managed child component: methods, events, validation
- **[FieldTypes.md](../forms/FieldTypes.md)** — all available field types and their options
- **[FormBuilder.md](../forms/FormBuilder.md)** — the HTML generation layer used by FormView
- **[PortalApp.md](../core/PortalApp.md)** — `activeGroup`, `activeUser`, group switching

## Examples

<!-- examples:cross-link begin -->

Runnable, copy-paste reference in the examples portal:

- [`examples/portal/examples/pages/FormPage/FormPageExample.js`](../../../examples/portal/examples/pages/FormPage/FormPageExample.js) — Page wrapped around a FormView with model load/save.

<!-- examples:cross-link end -->
