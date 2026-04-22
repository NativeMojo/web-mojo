# FormBuilder: Declarative `showWhen` Field Visibility

**Type**: request
**Status**: done
**Date**: 2026-04-01
**Priority**: high (dependency for ipset-admin)

## Description

Add a declarative `showWhen` property to form field configs that shows/hides fields based on another field's current value. This eliminates the need for custom FormView subclasses just to toggle field visibility.

## Context

Currently, conditional field visibility requires a custom FormView subclass with manual DOM manipulation (documented in `docs/web-mojo/forms/BestPractices.md` Pattern 4). This is verbose and error-prone. Many forms need this — IPSet creation (kind-driven fields), user signup (account type), notification settings, etc.

The implementation is clean because the infrastructure already exists:
- `FormBuilder.buildFieldHTML()` (line 830) wraps every field in a `<div class="col-{N}">` — we add a data attribute here
- `FormView.handleFieldChange()` (line 747) emits `field:change` events — we hook visibility logic here
- No new dependencies or architectural changes needed

### Relevant files
- `src/core/forms/FormBuilder.js` — field rendering (lines 680-831)
- `src/core/forms/FormView.js` — change event handling (lines 729-751), init (lines 295-310)

## API Design

```javascript
// Single value match
{
    name: 'source_url',
    type: 'text',
    label: 'Source URL',
    showWhen: { field: 'kind', value: 'datacenter' }
}

// Multiple value match (OR)
{
    name: 'country_code',
    type: 'select',
    label: 'Country',
    showWhen: { field: 'kind', value: ['country'] }
}

// Inverse — show when field does NOT equal value
{
    name: 'custom_name',
    type: 'text',
    label: 'Name',
    showWhen: { field: 'kind', value: 'country', negate: true }
}

// Multiple values (show for any of these)
{
    name: 'api_key',
    type: 'text',
    label: 'API Key',
    showWhen: { field: 'source', value: ['abuseipdb', 'virustotal'] }
}
```

## Implementation Shape

### FormBuilder.js changes (~15 lines)

In `buildFieldHTML()` around line 830, when wrapping the field in its column div:
- If `field.showWhen` exists, add `data-show-when-field="{field}"` and `data-show-when-value="{value}"` attributes to the wrapper div
- If `showWhen.negate` is true, add `data-show-when-negate="true"`
- Set `style="display:none"` on fields that don't match the initial form data (so hidden fields don't flash on load)

### FormView.js changes (~25 lines)

1. After form rendering (in `onAfterRender` or init), call a new `_initShowWhen()` method:
   - Query all `[data-show-when-field]` elements
   - Build a map: `{ controllingFieldName: [dependentElements] }`
   - Evaluate initial visibility based on current form data

2. In `handleFieldChange()` (after line 747), call `_updateShowWhen(fieldName, value)`:
   - Look up dependent elements for the changed field
   - Show/hide by toggling `style.display` (none vs empty string)
   - Value comparison: exact match for strings, array `.includes()` for multi-value

### Form data handling

Hidden fields should NOT be included in form submission. In `getFormData()`, skip fields where the wrapper has `display: none` and `data-show-when-field` is set. This prevents stale values from hidden fields polluting the payload.

## Acceptance Criteria

- [ ] Fields with `showWhen` are hidden on initial render when the condition is not met
- [ ] Fields show/hide reactively when the controlling field value changes
- [ ] Hidden fields are excluded from `getFormData()` results
- [ ] Single value, array of values, and `negate` modes all work
- [ ] No visual flash — hidden fields start with `display:none`
- [ ] Works inside tabsets (field visibility within a tab)
- [ ] Existing forms without `showWhen` are completely unaffected
- [ ] Lint clean, no new dependencies

## Constraints

- KISS — no dependency chains (field A shows field B which shows field C). Single-level only.
- No new CSS files. Visibility via inline `display:none` / `display:''`.
- Must work with all field types including custom components (combo, tags, multiselect).
- Do not break existing `field:change` event behavior.

## Notes

- This is a dependency for `planning/requests/ipset-admin.md`
- The BestPractices.md Pattern 4 should be updated to mention `showWhen` as the preferred approach
- Estimated scope: ~40-50 lines of code across 2 files

---
