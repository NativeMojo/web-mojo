# Assistant Context Reference Blocks

**Type**: request
**Status**: open
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

---

<!-- Fill in when the request is resolved, then move the file to planning/done/ -->
## Resolution
**Status**: Resolved -- YYYY-MM-DD

**Files changed**:
- `src/...`

**Tests run**:
- `npm run ...`

**Docs updated**:
- `docs/...`
- `CHANGELOG.md` (if applicable)

**Validation**:
[How the final behavior was verified]
