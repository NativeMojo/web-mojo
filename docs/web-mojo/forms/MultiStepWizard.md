# Multi-Step Wizard Pattern

Guide to building multi-step form wizards in WEB-MOJO. Covers step composition, per-step validation, state preservation across navigation, and final submission.

---

## Overview

A wizard splits a long form into a sequence of small steps with **forward/back navigation**, **per-step validation**, and a **review step** before submission. WEB-MOJO does not ship a dedicated `Wizard` class — the pattern is composed from a regular `Page` plus one `FormView` per step, swapped in and out of a single container.

The pattern is roughly 100–150 lines of user code: a `Page` owns the wizard chrome (progress bar, Prev/Next/Submit buttons), a `currentStep` counter, and a `wizardData` object that accumulates field values as the user moves between steps.

### When to use a wizard

✅ **Use a wizard when:**
- The form has 10+ fields and falls into clear, sequential phases (e.g. account → profile → preferences → review).
- Each phase makes sense in isolation and can be validated on its own.
- The user benefits from a clear sense of progress and a final review.
- You want to defer submission until *all* data is collected and confirmed.

❌ **Don't use a wizard when:**
- The form has fewer than ~8 fields — use a single [FormView](./FormView.md) with [groups](./BestPractices.md#pattern-2-form-groups-for-organization).
- All fields are visible at once and the user picks among them — use a single form, optionally with [progressive disclosure](./BestPractices.md#pattern-4-progressive-disclosure).
- The sections are independent and the user may visit them in any order — use a [TabView](../extensions/TabView.md) with one `FormView` per tab.

| Pattern | Best for | Cost |
|---|---|---|
| Single form | Short, linear input | Cheapest |
| Form with groups | Long but visible at once | Cheap |
| TabView + FormViews | Independent sections, any order | Medium |
| **Wizard** | **Long, sequential, must validate per phase** | **Highest** |

---

## Quick Start

```javascript
import { Page, FormView } from 'web-mojo';

class SignupWizard extends Page {
  static pageName = 'signup/wizard';

  constructor(options = {}) {
    super({ title: 'Sign Up', ...options });
    this.currentStep = 1;
    this.totalSteps = 3;
    this.wizardData = {};
  }

  async onInit() {
    await super.onInit();
    this.renderStep();
  }

  async onActionNextStep(event) {
    event.preventDefault();
    if (!this.currentForm.validate()) return;

    Object.assign(this.wizardData, await this.currentForm.getFormData());
    this.currentStep++;
    this.renderStep();
  }

  async onActionPrevStep(event) {
    event.preventDefault();
    Object.assign(this.wizardData, await this.currentForm.getFormData());
    this.currentStep--;
    this.renderStep();
  }

  async onActionSubmitWizard(event) {
    event.preventDefault();
    Object.assign(this.wizardData, await this.currentForm.getFormData());
    await this.app.rest.post('/api/signup', this.wizardData);
    this.app.toast.success('Welcome!');
  }

  renderStep() {
    if (this.currentForm) this.removeChild(this.currentForm);
    this.currentForm = new FormView({ fields: this.getStepFields(this.currentStep) });
    this.addChild(this.currentForm, { containerId: 'wizard-step' });
    this.updateNav();
  }

  getStepFields(step) {
    // Return field array for each step. Read previously-entered values
    // back from this.wizardData so they pre-fill on revisit.
    if (step === 1) return [
      { name: 'email', type: 'email', label: 'Email', required: true,
        value: this.wizardData.email || '' }
    ];
    if (step === 2) return [
      { name: 'name', type: 'text', label: 'Full Name', required: true,
        value: this.wizardData.name || '' }
    ];
    return [];
  }

  updateNav() {
    const prev = this.element.querySelector('[data-action="prev-step"]');
    const next = this.element.querySelector('[data-action="next-step"]');
    const submit = this.element.querySelector('[data-action="submit-wizard"]');
    prev.style.display = this.currentStep > 1 ? '' : 'none';
    next.style.display = this.currentStep < this.totalSteps ? '' : 'none';
    submit.style.display = this.currentStep === this.totalSteps ? '' : 'none';
  }

  getTemplate() {
    return `
      <div class="wizard-page">
        <h1>Sign Up — Step {{currentStep}} of {{totalSteps}}</h1>
        <div id="wizard-step"></div>
        <div class="d-flex justify-content-between mt-4">
          <button type="button" class="btn btn-secondary" data-action="prev-step">Previous</button>
          <button type="button" class="btn btn-primary" data-action="next-step">Next</button>
          <button type="button" class="btn btn-success" data-action="submit-wizard">Submit</button>
        </div>
      </div>
    `;
  }
}
```

This is the entire pattern — everything below explains how each piece works and the pitfalls to avoid.

---

## The Pattern Step-by-Step

### 1. The Page owns the wizard state

Three pieces of state live on the Page (not on any `FormView`):

```javascript
this.currentStep = 1;     // 1-based index of the visible step
this.totalSteps = 4;      // Constant
this.wizardData = {};     // Accumulator for values across all steps
```

`wizardData` is the **single source of truth**. Every time the user navigates (forward, back, or submits), the current `FormView`'s values are merged into `wizardData` *before* the active form is destroyed. Each step re-reads from `wizardData` when it builds its field configs, so values survive both directions of navigation.

### 2. One FormView at a time

The page renders **one `FormView` at a time** into a single container (`<div id="wizard-step"></div>`). When the user moves between steps, the old form is destroyed and a fresh one is constructed:

```javascript
renderStep() {
  if (this.currentForm) this.removeChild(this.currentForm);
  this.currentForm = new FormView({ fields: this.getStepFields(this.currentStep) });
  this.addChild(this.currentForm, { containerId: 'wizard-step' });
  this.updateNav();
}
```

✅ `removeChild()` calls `destroy()` on the form and detaches its element — the framework handles cleanup.
✅ `addChild()` with `containerId` mounts the new form. **Never** call `child.render()` or `child.mount()` yourself.

> If you tried to keep all steps in memory simultaneously (e.g. one `FormView` per step, toggled with `display: none`), you'd save the destroy/recreate cost but pay it back in subtle bugs around hidden-field validation, focus management, and tab order. The destroy/recreate approach is what the legacy example uses and it's the recommended default.

### 3. Per-step validation

Before advancing, validate the current form. `FormView.validate()` returns a `boolean` and applies Bootstrap's `was-validated` class to highlight invalid fields:

```javascript
async onActionNextStep(event, element) {
  event.preventDefault();

  if (!this.currentForm.validate()) {
    this.app.toast.error('Please fill in all required fields');
    return;
  }

  Object.assign(this.wizardData, await this.currentForm.getFormData());
  this.currentStep++;
  this.renderStep();
}
```

For cross-field rules (e.g. password confirmation), check after a successful `validate()` but before advancing:

```javascript
const stepData = await this.currentForm.getFormData();
if (this.currentStep === 1 && stepData.password !== stepData.confirm_password) {
  this.app.toast.error('Passwords do not match');
  return;
}
```

For field-level rules (regex, async lookups), use the `validation` block on the field itself — see [Validation.md](./Validation.md).

### 4. Backward navigation does **not** validate

Going back should always succeed, even if the current step has invalid input. Capture whatever the user typed so it isn't lost, then move:

```javascript
async onActionPrevStep(event, element) {
  event.preventDefault();
  // Capture even partial input — no validation
  Object.assign(this.wizardData, await this.currentForm.getFormData());
  this.currentStep--;
  this.renderStep();
}
```

### 5. Pre-fill from wizardData on every render

Each step reads its starting values **back** from `wizardData`. This is what makes the round-trip seamless:

```javascript
getStepFields(step) {
  if (step === 1) {
    return [
      { name: 'email', type: 'email', label: 'Email', required: true,
        value: this.wizardData.email || '' },
      { name: 'newsletter', type: 'checkbox', label: 'Subscribe',
        checked: this.wizardData.newsletter || false }
    ];
  }
  // ...
}
```

Note the field-type-specific keys: `value` for inputs/selects, `checked` for checkboxes, `value` (string) for textareas. See [BasicTypes.md](./BasicTypes.md).

### 6. The review step

The last step typically shows a read-only summary. Render it as a single `html` field rather than a real form:

```javascript
case 4:
  return [{
    type: 'html',
    content: `
      <h4>Review</h4>
      <p><strong>Email:</strong> ${this.escapeHtml(this.wizardData.email)}</p>
      <p><strong>Name:</strong> ${this.escapeHtml(this.wizardData.name)}</p>
    `
  }];
```

⚠️ Always escape user-provided strings before interpolating them into HTML — `MOJOUtils.escapeHtml()` is available. The review step is the last line of defence against XSS via your own form data.

### 7. Final submit

The submit handler merges any last-step edits, posts the accumulated data, and resets:

```javascript
async onActionSubmitWizard(event, element) {
  event.preventDefault();
  Object.assign(this.wizardData, await this.currentForm.getFormData());

  this.showLoading();
  try {
    await this.app.rest.post('/api/signup', this.wizardData);
    this.app.toast.success('Registration complete!');
    this.currentStep = 1;
    this.wizardData = {};
    this.renderStep();
  } finally {
    this.hideLoading();
  }
}
```

---

## Common Patterns

### Progress indicator

Drive the progress bar from `currentStep` / `totalSteps` in `updateNav()` (or a sibling method called from `renderStep()`):

```javascript
updateProgress() {
  const pct = ((this.currentStep - 1) / (this.totalSteps - 1)) * 100;
  const bar = this.element.querySelector('.progress-bar');
  if (bar) bar.style.width = pct + '%';
}
```

For numbered step circles, toggle classes (`completed`, `active`, default) by comparing each circle index against `currentStep`. See `examples/portal/pages/forms/examples/MultiStepWizardExample.js` for the full DOM pattern.

### Conditional steps

Some wizards branch (e.g. skip step 3 for personal accounts). Adjust `currentStep` *before* rendering, and mirror the skip logic in `onActionPrevStep` so the user can navigate back:

```javascript
this.currentStep++;
if (this.currentStep === 3 && this.wizardData.account_type === 'personal') {
  this.currentStep++;  // skip business-only step
}
this.renderStep();
```

### Per-step server validation

If a step needs a server check (e.g. is this username available?), do it **inside** the action handler before advancing:

```javascript
async onActionNextStep(event) {
  event.preventDefault();
  if (!this.currentForm.validate()) return;

  const stepData = await this.currentForm.getFormData();

  if (this.currentStep === 1) {
    const { available } = await this.app.rest.get('/api/check-username',
      { params: { username: stepData.username }, dataOnly: true });
    if (!available) {
      this.app.toast.error('Username taken');
      return;
    }
  }

  Object.assign(this.wizardData, stepData);
  this.currentStep++;
  this.renderStep();
}
```

### Using a model as the accumulator

If the wizard ultimately produces a single record, replace `wizardData` with a `Model` and let `model.save()` handle submission:

```javascript
import { Page, FormView, Model } from 'web-mojo';

// In constructor:
this.model = new Model({}, { endpoint: '/api/signups' });

// In Next/Prev/Submit handlers, replace Object.assign(this.wizardData, ...) with:
this.model.set(await this.currentForm.getFormData());

// Final submit:
await this.model.save();
```

Pre-fill each step's fields from `this.model.get('field_name')` instead of `this.wizardData.field_name`.

---

## Common Pitfalls

### ⚠️ Pitfall 1: Losing data when going back

**❌ Bad** — only saving on Next:

```javascript
async onActionPrevStep(event) {
  event.preventDefault();
  this.currentStep--;
  this.renderStep();   // user's edits on this step are gone
}
```

**✅ Good** — capture data on **both** directions:

```javascript
async onActionPrevStep(event) {
  event.preventDefault();
  Object.assign(this.wizardData, await this.currentForm.getFormData());
  this.currentStep--;
  this.renderStep();
}
```

### ⚠️ Pitfall 2: Not pre-filling from wizardData

**❌ Bad** — fields built from constants, edits lost on revisit:

```javascript
getStepFields(step) {
  if (step === 1) return [
    { name: 'email', type: 'email', label: 'Email', required: true }
  ];
}
```

**✅ Good** — read each field's starting value from the accumulator:

```javascript
getStepFields(step) {
  if (step === 1) return [
    { name: 'email', type: 'email', label: 'Email', required: true,
      value: this.wizardData.email || '' }
  ];
}
```

### ⚠️ Pitfall 3: Re-using a single FormView across steps

**❌ Bad** — mutating `formConfig.fields` and calling internal render methods:

```javascript
renderStep() {
  this.currentForm.formConfig.fields = this.getStepFields(this.currentStep);
  this.currentForm.render();   // never call render() manually after addChild
}
```

**✅ Good** — destroy the old form, create a new one:

```javascript
renderStep() {
  if (this.currentForm) this.removeChild(this.currentForm);
  this.currentForm = new FormView({ fields: this.getStepFields(this.currentStep) });
  this.addChild(this.currentForm, { containerId: 'wizard-step' });
}
```

`FormView` is not designed for in-place field replacement. Recreating is cheap and avoids stale validation state, orphaned event listeners, and wrong field values.

### ⚠️ Pitfall 4: Submitting partial state

**❌ Bad** — submit handler reads only the last step's form:

```javascript
async onActionSubmitWizard(event) {
  event.preventDefault();
  const data = await this.currentForm.getFormData();   // only review-step data!
  await this.app.rest.post('/api/signup', data);
}
```

**✅ Good** — merge final-step data into the accumulator first:

```javascript
async onActionSubmitWizard(event) {
  event.preventDefault();
  Object.assign(this.wizardData, await this.currentForm.getFormData());
  await this.app.rest.post('/api/signup', this.wizardData);
}
```

### ⚠️ Pitfall 5: `data-action` on the wrong element

The Prev / Next / Submit buttons in a wizard are **not** the form's submit button. They live on the Page template, outside the `FormView`. Put `data-action` on a `<button type="button">`, never on a `<form>`:

```html
<!-- ✅ Good -->
<button type="button" class="btn btn-primary" data-action="next-step">Next</button>

<!-- ❌ Bad — never put data-action on <form> -->
<form data-action="next-step">...</form>
```

### ⚠️ Pitfall 6: Caching the wizard across visits

`Page` instances are cached. If your wizard belongs to a route, **reset state in `onEnter()`**, not the constructor — otherwise a user who completes the wizard, navigates away, then returns will land on the review step with stale data:

```javascript
async onEnter(params) {
  await super.onEnter(params);
  this.currentStep = 1;
  this.wizardData = {};
  this.renderStep();
}
```

### ⚠️ Pitfall 7: Fetching defaults in the wrong hook

If your wizard pre-fills from the server (e.g. resume an in-progress signup), fetch in `onInit()` (one-shot) or `onEnter()` (per-visit) — never in `onAfterRender()` or `onAfterMount()`:

```javascript
async onEnter(params) {
  await super.onEnter(params);
  const draft = await this.app.rest.get('/api/signup/draft', { dataOnly: true });
  this.wizardData = draft || {};
  this.currentStep = draft?.last_step || 1;
  this.renderStep();
}
```

---

## Related Docs

- [FormView.md](./FormView.md) — `FormView` API, options, methods, events
- [Validation.md](./Validation.md) — Field-level validators, async validation, server errors
- [BestPractices.md](./BestPractices.md) — Form patterns, common pitfalls, accessibility
- [FieldTypes.md](./FieldTypes.md) — All available field types and their config keys
- [Page.md](../pages/Page.md) — Page lifecycle (`onInit`, `onEnter`, `onExit`) and caching

### Reference example

A complete working wizard with progress bar, four steps, and review screen:
`examples/portal/pages/forms/examples/MultiStepWizardExample.js`
