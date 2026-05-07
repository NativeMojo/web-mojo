# Assistant Context Reference Blocks

**Type**: request
**Status**: done
**Date**: 2026-05-06

## Description

The assistant backend now produces `context` blocks on messages. When the LLM references specific records (users, rulesets, incidents, etc.) in its response, it calls the `add_context` tool to attach validated model references. These arrive on the message's `blocks` array as `{"type": "context", ...}`. The frontend needs to render them as clickable model reference cards so admins can click through to the referenced record instead of searching for it.

This is the same concept as context references on ticket action blocks (see `planning/done/ticket-action-blocks-ui.md`), but applied to the assistant chat UI.

## Context

### Backend (django-mojo, already merged to main)

The assistant agent accumulates context references across tool calls during a conversation turn and injects a single `context` block on the final assistant message. The block arrives on `Message.blocks` alongside other block types (table, chart, stat, action, list, alert, progress, file).

Key backend files:
- `mojo/apps/assistant/services/tools/models.py` — `_tool_add_context` handler validates references
- `mojo/apps/assistant/services/agent.py` — accumulates refs, injects block on final message
- `mojo/apps/assistant/models/conversation.py` — `Message.blocks` JSONField

### Frontend (web-mojo)

Block rendering happens in `AssistantMessageView.onAfterRender()` which iterates `message.blocks` and dispatches by `block.type`. Currently handles: table, chart, stat, action, list, alert, progress, file. The `context` type is not yet handled — it silently falls through.

Key frontend files:
- `src/extensions/admin/assistant/AssistantMessageView.js` — block dispatch loop (line 46)
- `src/extensions/admin/incidents/ActionCardView.js` — existing context ref rendering for tickets (reference implementation)
- `src/core/WebApp.js` — `getModelByRef()` / `registerModelRef()` (MODEL_REF registry)
- `src/admin.js` — MODEL_REF registrations for incident and account models

### Existing Pattern

The ticket panel's `ActionCardView` already renders context references on ticket notes. It uses the `MODEL_REF` registry (`app.getModelByRef(ref)`) to resolve backend model strings to frontend model classes, then opens detail views via `Modal.showModel()`. The assistant context block should follow the same rendering pattern but with a different reference format (see schema below).

## Block Schema

The `context` block on an assistant message looks like:

```json
{
  "type": "context",
  "references": [
    {
      "app_name": "incident",
      "model_name": "RuleSet",
      "pk": 42,
      "label": "SSH brute force blocker"
    },
    {
      "app_name": "account",
      "model_name": "User",
      "pk": 7,
      "label": "admin@example.com"
    }
  ]
}
```

**Format difference from ticket context refs**: Ticket action blocks use `{"model": "incident.RuleSet", "pk": 42}` (dot notation). Assistant blocks use `{"app_name": "incident", "model_name": "RuleSet", "pk": 42}` (separate fields). The renderer must construct the dot-notation string `app_name + "." + model_name` to look up via `app.getModelByRef()`.

## Acceptance Criteria

- [ ] `AssistantMessageView` handles `block.type === 'context'` in the block dispatch loop
- [ ] Each reference renders as a compact clickable card/chip showing the label (or fallback `ModelName #pk`)
- [ ] Clicking a reference opens the model's detail view via `Modal.showModel()` using the `MODEL_REF` registry
- [ ] References for unregistered models (no MODEL_REF) render as plain text (no click handler, no error)
- [ ] Multiple references in one block render as a horizontal or wrapped row of chips
- [ ] All user-controlled strings (label, app_name, model_name, pk) are escaped before insertion into the DOM
- [ ] Styling works in both light and dark themes
- [ ] Context block appears below the message text, visually distinct but not overwhelming (subtle card, not a full action card)

## Constraints

- Reuse the `MODEL_REF` registry and `getModelByRef()` pattern already in `WebApp.js` — do not create a separate lookup
- Escape all ref fields before DOM insertion (same `esc()` pattern as `ActionCardView`)
- The `pk` field is always an integer from the backend, but validate with `/^\d+$/` before using in `Modal.showModel()` (same guard as `ActionCardView.onActionOpenRef`)
- No allowlist needed in the assistant context — the backend already validates model access. Any model that passes backend validation and has a MODEL_REF registration should be clickable
- The block can contain up to 20 references (backend cap is `MAX_CONTEXT_REFS = 20`)

## Notes

### Reference implementation in ActionCardView

`ActionCardView._buildContextTemplate()` (line 61) shows the exact pattern for rendering context refs. The assistant version is simpler because:
1. No approval/deny buttons — context blocks are informational only
2. No handler colors/dots — just reference chips
3. Different ref format (separate `app_name`/`model_name` fields instead of `"model"` dot string)

### Suggested approach

Add a `_renderContextBlock(block, wrapper)` method to `AssistantMessageView`, following the pattern of `_renderStatBlock` or `_renderAlertBlock` (lightweight, no child View needed). For each reference:

1. Build the model ref string: `ref.app_name + "." + ref.model_name`
2. Look up via `app.getModelByRef(refStr)` to check if the model is registered
3. Render as a clickable chip if registered, plain text chip if not
4. On click: `Modal.showModel(new ModelClass({ id: ref.pk }))`

### CSS

Add styles under the existing `.assistant-block` section in `admin.css`. A subtle bordered chip row (similar to Bootstrap badges) with hover state for clickable refs. Dark mode override needed.

### MODEL_REF registrations

The following models are already registered via MODEL_REF (from the ticket action blocks work):
- `incident.RuleSet`, `incident.Incident`, `incident.Event`, `incident.Ticket`
- `account.GeoLocatedIP`

The assistant may reference additional models (User, Job, Group, etc.). Any model the assistant references that has a MODEL_REF will be clickable; others will render as plain text. Additional MODEL_REF registrations can be added incrementally as needed — out of scope for this request.

## Plan

### Objective

Render `context` blocks on assistant messages as a row of clickable reference chips. Each chip shows the reference label, and clicking opens the model's detail view via `Modal.showModel()` using the `MODEL_REF` registry. Unregistered models render as plain-text chips (no click handler). The implementation follows the lightweight inline pattern used by `_renderStatBlock` — no child View needed.

### Steps

1. **`src/extensions/admin/assistant/AssistantMessageView.js`** — Add context block handling
   - Add `import Modal from '@core/views/feedback/Modal.js'` at top (static import, same as ActionCardView)
   - Add `} else if (block.type === 'context') {` branch in the block dispatch loop (after the `file` case, line 61)
   - Add `_renderContextBlock(block, wrapper)` method:
     - Guard: `if (!refs?.length) return` and remove wrapper to avoid empty margin
     - Create a flex-wrap container div with class `assistant-context-refs`
     - For each reference in `block.references`:
       1. Build model ref string: `` `${ref.app_name}.${ref.model_name}` ``
       2. Escape all fields (`label`, `app_name`, `model_name`, `pk`) via `this._escapeHtml()`
       3. Compute display label: `ref.label || `${ModelName} #${pk}``
       4. Look up `app.getModelByRef(refStr)` — if found and `ModelClass.VIEW_CLASS` exists, render as a clickable chip with class `assistant-context-chip clickable`, `data-action="open-context-ref"`, `data-ref` and `data-pk` attributes, and a `bi-box-arrow-up-right` icon
       5. If not found or no `VIEW_CLASS`, render as plain text chip (class `assistant-context-chip` only, no icon, no action)
   - Add `onActionOpenContextRef(event, el)` handler:
     1. Read `el.dataset.ref` and `el.dataset.pk`
     2. Validate pk with `/^\d+$/` (same guard as `ActionCardView.onActionOpenRef`)
     3. Look up `ModelClass = app.getModelByRef(ref)`
     4. If `ModelClass?.VIEW_CLASS`, call `Modal.showModel(new ModelClass({ id: pk }))`

2. **`src/extensions/admin/css/admin.css`** — Add context block styles
   - Add a new section after the `.assistant-file-*` rules (around line 1800):
     - `.assistant-context-refs` — `display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px;`
     - `.assistant-context-chip` — compact chip: `display: inline-flex; align-items: center; gap: 4px; font-size: 0.74rem; padding: 3px 10px; border-radius: 6px; border: 1px solid var(--bs-border-color); background: var(--bs-body-bg); color: var(--bs-secondary-color);`
     - `.assistant-context-chip.clickable` — `cursor: pointer; color: var(--bs-primary);`
     - `.assistant-context-chip.clickable:hover` — `background: rgba(var(--bs-primary-rgb), 0.06); text-decoration: underline;`
     - `.assistant-context-chip i` — `font-size: 0.65rem;`
   - Dark-theme overrides in the existing dark-theme section (around line 2270):
     - `.assistant-context-chip` background → `var(--bs-tertiary-bg)` (minimal since base styles already use tokens)

### Design Decisions

- **No child View** — Context blocks are informational chips, not interactive forms. The `_renderStatBlock` pattern (pure DOM manipulation, `_escapeHtml` for XSS) is the right weight. No buttons, no emit/listen cycles, no lifecycle needs.
- **`data-action` on chips** — Uses the framework's event delegation so the handler lives on the parent `AssistantMessageView`. Avoids `addEventListener` boilerplate and matches project convention.
- **Static import for Modal** — Matches `ActionCardView`'s static `import Modal from '...'`. Small module, no need for lazy loading.
- **`showModel` not `showModelById`** — `showModel(new ModelClass({ id: pk }))` is the established pattern from `ActionCardView.onActionOpenRef`. The detail view handles its own fetch.
- **No ALLOWED_REFS allowlist** — The request spec says the backend validates model access. Any model with a registered `MODEL_REF` + `VIEW_CLASS` should be clickable, unlike `ActionCardView`'s hardcoded set which is ticket-panel-specific.
- **Own CSS classes, not reusing `.ac-ref`** — The ticket panel's `.ac-ref` chips live inside `.ac` cards with specific padding/context. Own `.assistant-context-*` classes avoid coupling the two UIs.

### Edge Cases

- **Empty references array** — `block.references` could be `[]` or missing. Guard and remove wrapper.
- **Unregistered model ref** — No `MODEL_REF` or no `VIEW_CLASS` → plain text chip, no error, no console warning.
- **Invalid pk** — `/^\d+$/` guard prevents non-integer pks from reaching `Modal.showModel()`. Click silently ignored.
- **XSS** — All four user-controlled fields escaped via `_escapeHtml()`. `data-ref` and `data-pk` read from DOM go through Map lookup and regex validation.
- **20 references (backend cap)** — Flex-wrap row handles naturally. Verify visually with 15+ chips in narrow viewport.

### Testing

- `npm run lint` — verify no lint errors in changed files
- Manual: open assistant panel, trigger context block, verify chips render, verify click opens modal, verify plain-text for unregistered models, verify light and dark themes

### Docs Impact

- `CHANGELOG.md` — Add entry: "Assistant: render context reference blocks as clickable chips in chat messages"
- No framework docs changes (extension-internal feature, not a public API change)

---

## Resolution
**Status**: Resolved -- 2026-05-07

**Files changed**:
- `src/extensions/admin/assistant/AssistantMessageView.js` — Modal import, `context` branch in block dispatch, `_renderContextBlock()`, `onActionOpenContextRef()` handler
- `src/extensions/admin/css/admin.css` — `.assistant-context-refs`, `.assistant-context-chip` styles + dark-theme override
- `CHANGELOG.md` — entry for context reference blocks (docs agent)
- `docs/web-mojo/extensions/Admin.md` — `context` row in structured response blocks table (docs agent)

**Tests run**:
- `npm run lint` — no new issues in changed files
- `npm test` — 667/667 unit tests pass; integration/build failures are pre-existing infrastructure issues

**Security review**:
- All user-controlled fields escaped via `_escapeHtml()` for innerHTML, `textContent` for plain text
- `pk` validated with `/^\d+$/` before `Modal.showModel()`
- Removed redundant `esc()` on `dataset` property assignments (DOM setters don't interpret HTML)
- No allowlist needed — backend validates model access; `getModelByRef` is `Map.get()` (immune to prototype pollution)

**Validation**:
Lint clean, unit tests green. Visual verification requires a backend producing context blocks — manual smoke test recommended after deploy.
