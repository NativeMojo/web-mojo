# Auto-Save (`autosaveModelField`)

Per-field automatic saving for FormView. Each field change is saved to the
model (and the server) on its own — no Submit button, no full-form save, and
no disruption to the surrounding UI.

---

## Table of Contents

- [When to Use](#when-to-use)
- [Quick Start](#quick-start)
- [How It Works](#how-it-works)
- [Batching](#batching)
- [Field Status Indicators](#field-status-indicators)
- [Error Handling & Revert](#error-handling--revert)
- [Non-Disruptive Saves (`skipRender`)](#non-disruptive-saves-skiprender)
- [Nested / Dot-Notation Fields](#nested--dot-notation-fields)
- [Alternatives](#alternatives)
- [Gotchas](#gotchas)

---

## When to Use

Use `autosaveModelField: true` for **settings-style forms**: permission
toggles, notification preferences, configuration switches — anywhere each
field is independently meaningful and a Submit button would be friction.

Use a normal submit flow (see [FormView.md](./FormView.md)) when fields are
only valid together (e.g. registration forms) or when the user should
review before committing.

---

## Quick Start

```javascript
const form = new FormView({
  model: userModel,              // required — autosave saves via the model
  autosaveModelField: true,
  fields: [
    { type: 'switch', name: 'permissions.admin',  label: 'Admin' },
    { type: 'switch', name: 'permissions.export', label: 'Can Export' }
  ]
});
this.addChild(form);
```

Toggling a switch saves it. The field's label shows a small
saving → saved indicator; nothing else on the page rerenders.

---

## How It Works

```
user edits field
  └─ handleFieldChange(name, value)        (skipped while the form is populating)
       └─ handleFieldSave(name, value)
            ├─ adds the field to a pending-save queue
            ├─ shows the field's "saving" indicator
            └─ (re)starts a 300 ms batch timer
                 └─ executeBatchSave()
                      ├─ model.save(changes, { skipRender: true })   // one request
                      ├─ success → "saved" indicator on each field
                      └─ failure → toast + revertFields + "error" indicator
```

Source: `src/core/forms/FormView.js` — `handleFieldChange`,
`handleFieldSave`, `executeBatchSave`.

If the model has no `save()` method (a plain data model), autosave falls
back to `model.set(name, value, { skipRender: true })` — same UX, no
network request.

---

## Batching

Changes within a **300 ms window are batched into a single
`model.save()`** request. This matters for browser autofill (many fields
"change" at once) and rapid toggling — you get one PUT with all changed
fields instead of racing requests:

```javascript
// User autofills 4 fields → ONE request:
// PUT /api/users/123  { first_name, last_name, email, phone }
```

A save already in flight (`isSaving`) defers further batches until it
completes.

---

## Field Status Indicators

Each autosaved field gets an inline status next to its label
(`FieldStatusManager`):

| Status | Shown | Clears |
|--------|-------|--------|
| `saving` | while the batch save is in flight | replaced by saved/error |
| `saved` | on success | auto-hides after 2.5 s |
| `error` | on failure (message in tooltip) | auto-hides after 6 s |

No extra wiring needed — indicators are created on demand per field.

---

## Error Handling & Revert

When the server rejects a batch (`resp.success` false, or
`resp.data.status` false):

1. An error **toast** shows the server's message.
2. **`revertFields()`** resets every field in the failed batch back to the
   model's current (last-known-good) values, so the UI never displays
   state the server refused.
3. Each field shows the `error` indicator with the message as its tooltip.

The revert runs with the form's `_isPopulating` guard set, so reverting
does not itself trigger another autosave.

---

## Non-Disruptive Saves (`skipRender`)

Autosave passes **`{ skipRender: true }`** to `model.save()` /
`model.set()`. The model still emits `change` (and `change:<field>`)
events, but views listening via the standard `View` model binding **skip
their automatic rerender** for that change. See
[Model.md](../core/Model.md) (`set` / `save` options).

Why: the form already updates its own DOM in place. Without the flag,
every parent/sibling view sharing the model would rebuild on each
autosave — resetting active tabs, scroll position, and focus (this was a
real bug: toggling a permission in the admin UserView snapped the
permissions tabset back to its first tab).

Consequences to design around:

- **Sibling views showing the same field do not auto-refresh** on an
  inline save. If a view must reflect the field live, listen explicitly:

  ```javascript
  this.model.on('change:permissions.admin', (value) => this.updateBadge(value));
  ```

- **Hand-rolled `model.on('change', ...)` rerender listeners must check
  the flag themselves** (listeners receive `(model, options)`):

  ```javascript
  this.model.on('change', (model, options) => {
    if (options && options.skipRender) return;
    if (this.isMounted()) this.render();
  });
  ```

- **Explicit submits are unaffected.** `handleSubmit()` / `saveModel()`
  do not pass the flag, so a full-form save still triggers the normal
  model-change rerender of views sharing the model.

---

## Nested / Dot-Notation Fields

Field names may use dot notation; the change is saved under that exact
key and the model expands it into the nested attribute:

```javascript
{ type: 'switch', name: 'permissions.admin', label: 'Admin' }
// → model.save({ 'permissions.admin': true }, { skipRender: true })
```

`model.get('permissions.admin')` reads it back. See
[Model.md](../core/Model.md) (dot notation).

---

## Alternatives

| Need | Use |
|------|-----|
| Save each field as it changes | `autosaveModelField: true` (this page) |
| Update the model live but save later | `allowModelChange: true` — `model.set()` per change, no request |
| Save everything on submit | default FormView + `handleSubmit()` — see [FormView.md](./FormView.md) |

---

## Gotchas

- **A model is required.** Without `model`, `autosaveModelField` does
  nothing (`handleFieldSave` returns immediately).
- **Programmatic population doesn't autosave.** While the form populates
  (or reverts), `_isPopulating` suppresses `handleFieldChange` — only real
  user edits save.
- **Don't pair it with a Submit button for the same fields** — users end
  up "saving" data that is already saved, and a failed autosave followed
  by a submit can resend reverted values.
- **One request per 300 ms window, not per keystroke** — but for text
  inputs every keystroke still enters the queue. For expensive fields
  prefer switches/selects, or a submit flow.
