# Ticket Action Blocks UI

**Type**: request
**Status**: planned
**Date**: 2026-05-06

## Description

The backend now supports structured action blocks on TicketNotes. When the LLM agent proposes an action (rule approval, IP block, escalation, rule update), it creates a note with `metadata.action` containing a typed action block. The UI needs to render these as interactive cards with Approve/Deny buttons, and submit the user's response as a new note with `metadata.action_response`.

This replaces the old workflow where admins had to type "approved" as free text in the chat thread.

## Context

Backend changes are in `django-mojo` on the `claude/loving-merkle-ac7e3e` branch. The relevant API docs are at `docs/web_developer/logging/incidents.md` (updated in that branch).

Key files in web-mojo:
- `src/extensions/admin/incidents/TicketView.js` — ticket detail page
- `src/extensions/admin/incidents/adapters/TicketNoteAdapter.js` — transforms notes for ChatView
- `src/extensions/admin/models/Tickets.js` — Ticket/TicketNote models

The ticket conversation is rendered via `ChatView` using the `TicketNoteAdapter`. Notes with `metadata.action` should render as action cards instead of plain messages. Notes with `metadata.action_response` should render as completed action cards (showing what was chosen).

## Acceptance Criteria

- [ ] Notes with `metadata.action` of `type: "approval"` render as an action card showing: label, handler type icon, and Approve/Deny buttons
- [ ] Notes with `metadata.action` of `type: "context"` render as context cards with clickable model reference links (no buttons)
- [ ] Context cards resolve model refs via `MODEL_REF` registry and open the model's detail view on click
- [ ] Action card shows context details when available (ruleset name, IP address, proposed changes)
- [ ] For `incident.rule_update` actions, show a diff view of current vs proposed rules
- [ ] Clicking Approve/Deny submits a new TicketNote with `metadata.action_response` containing: `handler`, `action` ("approve"/"deny"), and `context` (copied from the original action block)
- [ ] After submission, the action card re-renders as "completed" (buttons disabled, shows chosen action)
- [ ] Already-resolved actions (`metadata.action.resolved = true`) render as completed immediately
- [ ] Notes from `[LLM Agent]` render with a distinct system/bot style
- [ ] The "Enable AI" / "Disable AI" toggle uses `POST_SAVE_ACTIONS` (`enable_llm` / `disable_llm`) on the ticket
- [ ] Tickets with `metadata.requires_approval` show a visual indicator in the ticket list
- [ ] Users can attach context references when adding notes (UI for linking models to a note)

## Constraints

- The `action_response` POST must include the full `handler` + `context` from the original action note — the backend validates that a matching action note exists before dispatching
- Model references in context use the format `{"model": "incident.RuleSet", "pk": 123}` — the UI can construct REST URLs from this (`/api/incident/ruleset/123`)
- Only one action per ticket can be pending at a time (the backend enforces this)
- The action card buttons should be disabled if the ticket status is already "closed" or "resolved"

## Notes

### Action Block Schema (on a note's `metadata.action`)

```json
{
  "type": "approval",
  "handler": "incident.rule_approval",
  "label": "Approve rule proposal \"SSH brute force blocker\"?",
  "context": {
    "target": {"model": "incident.RuleSet", "pk": 42}
  },
  "resolved": false
}
```

### Context Block Schema (on a note's `metadata.action` with `type: "context"`)

Context blocks are informational — no approval buttons, just clickable model reference cards. The LLM (or a user) attaches these when referencing specific objects so admins can click through directly.

```json
{
  "type": "context",
  "references": [
    {"model": "incident.RuleSet", "pk": 42, "label": "SSH brute force blocker"},
    {"model": "incident.Incident", "pk": 189, "label": "Credential harvesting from 10.0.0.1"}
  ]
}
```

Each reference should render as a compact linked card. The UI resolves model refs to REST URLs using the `MODEL_REF` registry (e.g., `incident.RuleSet` pk 42 → `/api/incident/ruleset/42`). Clicking opens the model's detail view via `app.getModelByRef(ref)` → `Modal.showModel()`.

Allowed models for context references: `incident.RuleSet`, `incident.Incident`, `incident.Event`, `incident.Ticket`, `account.GeoLocatedIP`.

### Action Response Schema (submitted as new note `metadata.action_response`)

```json
{
  "handler": "incident.rule_approval",
  "action": "approve",
  "context": {"target": {"model": "incident.RuleSet", "pk": 42}}
}
```

### Built-in Handlers

| Handler | Approve | Deny |
|---------|---------|------|
| `incident.rule_approval` | Activates ruleset, closes ticket | Deletes ruleset, closes ticket |
| `incident.rule_update` | Replaces rules on existing ruleset | Closes ticket, no changes |
| `incident.block_confirm` | Blocks IP address | Closes ticket |
| `incident.escalate` | Sends alert to on-call | Closes ticket |

### Enable/Disable AI Toggle

POST to `/api/incident/ticket/<pk>` with body `{"enable_llm": true}` or `{"disable_llm": true}`. When enabled, the LLM immediately reads the full thread and responds. Show the toggle in the ticket header when category is `llm_review`.

### TicketNoteAdapter Changes

The `transform()` method needs to detect `metadata.action` and `metadata.action_response` on notes and pass them through so the ChatView (or a custom card component) can render them appropriately. The `addNote()` method needs an overload that accepts metadata for action responses.

## Design Changes (from mockup iteration)

The original request assumed the existing TicketView modal. After design review, the plan replaces the modal with a **right-side slide-over panel** (like AssistantPanelView) so users can cross-reference the ticket table and other portal pages while working a ticket.

Additional UX refinements from mockup v5:
- **Editable header fields**: Status, priority, assignee, category, and group are inline-editable via dropdown menus (no modal forms)
- **Collapsed resolved actions**: Past resolved action cards are hidden behind a "N resolved actions" summary bar with colored handler-type dots. Clicking expands; "Hide resolved actions" collapses.
- **Clickable description → modal**: Ticket description (rich markdown) is not in the header. The title is clickable (subtle expand icon on hover) and opens a description modal.
- **AI toggle**: Plain Bootstrap `form-check form-switch` in the panel header (no badge wrapping)
- **Model.MODEL_REF**: New static property on Model classes (like VIEW_CLASS) for resolving backend model references in action card contexts to frontend model classes
- **Activity column**: Ticket table gets a "last activity" column
- **Note truncation**: Long notes clamped to 4 lines with Show more / Show less toggle
- **Model ref links on action cards**: Action cards with `context.target` show a clickable model reference (e.g. "RuleSet #42 — SSH brute force blocker") that opens `Modal.showModelById()` via MODEL_REF resolution
- **Compact header**: Single top bar (ID + status + time + buttons), title below, meta fields (priority, assignee, category, group) as a single compact row

Mockup: `planning/mockups/tickets/ticket-panel.html` (v6 — final)

## Plan

### Objective

Replace the modal-based TicketView with a slide-over TicketPanelView. Render action blocks as interactive cards with Approve/Deny. Collapse resolved actions. Add MODEL_REF pattern for context model resolution.

### Steps

#### 1. `src/core/WebApp.js` — Add MODEL_REF registry

Add `registerModelRef(ref, ModelClass)` and `getModelByRef(ref)` methods alongside the existing `registerModel`/`getModel` (lines 862–871). Storage: new `Map` at `this.modelRefClasses` (next to `this.modelClasses` at line 120).

```
registerModelRef(ref, ModelClass) → this.modelRefClasses.set(ref, ModelClass)
getModelByRef(ref) → this.modelRefClasses.get(ref)
```

#### 2. `src/extensions/admin/models/*.js` — Add MODEL_REF to model classes

After each `VIEW_CLASS` assignment, add a `MODEL_REF` static property. Pattern: `ModelClass.MODEL_REF = 'app_name.ModelName'` matching the backend's `model` field format.

Files to update (grep for `VIEW_CLASS` assignments):
- `Incidents.js`: `Incident.MODEL_REF = 'incident.Incident'`
- `Tickets.js`: `Ticket.MODEL_REF = 'incident.Ticket'`
- `RuleSets.js`: `RuleSet.MODEL_REF = 'incident.RuleSet'`
- `Jobs.js`: `Job.MODEL_REF = 'incident.Job'`
- `Users.js`: `User.MODEL_REF = 'account.User'`
- Other models as needed per handler context types

#### 3. `src/extensions/admin/models/index.js` — Register MODEL_REFs

In the admin extension's model registration block, call `app.registerModelRef(ModelClass.MODEL_REF, ModelClass)` for each model that has a MODEL_REF. This mirrors the existing `app.registerModel()` calls.

#### 4. `src/extensions/admin/incidents/adapters/TicketNoteAdapter.js` — Pass through action metadata

**`transform()` (line 22)**: Add `action` and `actionResponse` fields to the returned message object:
- If `note.metadata?.action` exists → `action: note.metadata.action`
- If `note.metadata?.action_response` exists → `actionResponse: note.metadata.action_response`

**`addNote()` (line 37)**: Add optional `metadata` parameter. When metadata is provided (for action responses), include it in the save payload alongside `note` and `media`.

New method: **`addActionResponse(actionNote, action)`** — convenience wrapper:
- Builds `metadata.action_response` from `actionNote.action` (handler, context) + the user's action ("approve"/"deny")
- Calls `addNote()` with the metadata
- Returns the response

#### 5. `src/extensions/admin/incidents/TicketPanelView.js` — New file (replaces TicketView for panel use)

New view class `TicketPanelView extends View`. Modeled on AssistantPanelView's panel architecture but simpler (no resize handle, no WebSocket, no history).

**Template structure** (from mockup v5):
- **Top bar**: `#id` + status pill + created time (pushed right: AI toggle + kebab menu + close button)
- **Title**: Clickable → opens description modal
- **Meta row**: Priority + Assignee + Category + Group — all inline-editable dropdowns, single compact line
- **Linked incident bar**: If ticket has incident, show link with status badge + event count
- **Conversation area** (`overflow-y: auto`): Notes rendered via ChatView + action cards
- **Input bar**: Textarea + send button + attachment/mention buttons

**Key properties:**
- `model`: Ticket
- `adapter`: TicketNoteAdapter
- `chatView`: ChatView (compact theme)

**Key methods:**
- `onInit()`: Create adapter, ChatView, fetch notes, wire events
- `onBeforeRender()`: Compute statusBadge, assigneeName, priorityLabel
- `onActionClose()`: Close panel (set width to 0, emit event)
- `onActionToggleAi()`: POST_SAVE_ACTIONS enable_llm/disable_llm
- `onActionChangeStatus()`: Inline dropdown, save model
- `onActionChangePriority()`: Inline dropdown, save model
- `onActionChangeAssignee()`: Inline dropdown, save model
- `onActionChangeCategory()`: Inline dropdown (TicketCategories options), save model
- `onActionChangeGroup()`: Inline dropdown (fetch GroupList), save model
- `onActionShowDescription()`: Open Modal.dialog with rendered markdown description
- `onActionApprove(event, el)`: Get action note data from element, call adapter.addActionResponse(note, 'approve')
- `onActionDeny(event, el)`: Same with 'deny'

**Panel open/close pattern:**
- Parent (TicketTablePage) adds TicketPanelView as a child with `containerId: 'ticket-panel'`
- Opening: set model on panel, render, animate `width: 0 → 460px` via CSS class toggle
- Closing: animate width back, emit `panel:close` event
- Table content area uses `flex: 1` so it shrinks when panel opens

#### 6. `src/extensions/admin/incidents/ActionCardView.js` — New file

Small View for rendering a single action card within the conversation flow.

**Properties:**
- `action`: The action block object from note metadata
- `noteId`: The note ID this action belongs to
- `resolved`: Boolean
- `ticketStatus`: Parent ticket's status (to disable buttons on closed tickets)

**Template:**
- Colored dot (by handler type: rule=blue, block=red, escalate=amber, update=green)
- Label text
- Context detail line (resolve target model name via `app.getModelByRef()` if available)
- If resolved: single-line with Approved/Denied badge
- If pending: detail section + Approve/Deny buttons

**Actions:**
- `data-action="approve"` → emits `action:respond` with {noteId, action: 'approve', handler, context}
- `data-action="deny"` → emits `action:respond` with {noteId, action: 'deny', handler, context}

#### 7. `src/extensions/admin/incidents/ResolvedActionsSummaryView.js` — New file

Small View for the collapsed resolved actions summary bar.

**Properties:**
- `actions`: Array of resolved action objects
- `expanded`: Boolean state

**Template:**
- Collapsed: checkmark icon + "N resolved actions" + colored dots for each handler type
- Expanded: List of ActionCardView children (all resolved) + "Hide resolved actions" link

**Actions:**
- `data-action="toggle"` → toggles expanded state, re-renders

#### 8. `src/extensions/admin/incidents/TicketTablePage.js` — Add panel container + activity column

**Column changes (lines 32–73):**
- Add `activity` column after `created`: `{ name: 'last_activity', label: 'Activity', sortable: true, formatter: 'timeAgo' }`
- Add `requires_approval` indicator: in the `title` column formatter, check `model.get('metadata')?.requires_approval` and append a small pending badge if true

**Panel integration:**
- Add `<div data-container="ticket-panel"></div>` to the page template (flex sibling of the table area)
- Override `onActionViewItem(model)` to open TicketPanelView instead of Modal.showModel
- On `panel:close` event, clear the panel child

**Layout:**
- Wrap existing table content and panel container in a flex row
- Table area: `flex: 1; min-width: 0; overflow: hidden`
- Panel container: `width: 0` by default, `width: 460px` when active, with CSS transition

#### 9. `src/extensions/admin/css/admin.css` — Panel CSS

Add ticket panel styles after the existing assistant panel section. Follow the same pattern:

**Light-mode base rules:**
- `.ticket-panel-view`: fixed width, border-left, flex column, background, transition on width
- `.ticket-panel-header`: flex row, padding, border-bottom
- `.ticket-panel-meta`: editable dropdowns with hover underline
- `.ticket-panel-conversation`: flex 1, overflow-y auto
- `.ticket-panel-input`: border-top, padding, textarea + button layout
- Action card styles: `.action-card`, `.action-card-resolved`, `.action-card-pending`
- Resolved summary bar: `.resolved-actions-summary`

**Dark-mode overrides** (grouped at bottom per theming.md):
- `[data-bs-theme="dark"] .ticket-panel-view { ... }`
- All surfaces use Bootstrap tokens (`--bs-body-bg`, `--bs-tertiary-bg`, `--bs-border-color`)
- Action card borders, backgrounds, badge colors adapted

#### 10. `src/extensions/admin/incidents/TicketView.js` — Keep as modal fallback

Keep existing TicketView (369 lines) intact. It still serves as `Ticket.VIEW_CLASS` for `Modal.showModel()` calls from other pages (e.g., EventView's "View Related Model"). The panel replaces TicketView only in TicketTablePage's row-click flow.

Update `Ticket.VIEW_CLASS` assignment (line 367) to remain `TicketView` (no change needed).

### Design Decisions

- **Panel over modal**: Tickets require cross-referencing the ticket table, incidents, and rules pages. A slide-over panel keeps the table visible and lets users click between tickets without re-opening modals. Matches the AssistantPanelView pattern already in the app.
- **Separate TicketPanelView vs. modifying TicketView**: TicketView is used by Modal.showModel from EventView and elsewhere. Modifying it to work as both modal content and panel would add complexity. Cleaner to have a dedicated panel view that shares the adapter.
- **ActionCardView as standalone View**: Action cards have their own state (pending vs. resolved), buttons, and events. Rendering them as Views (not template partials) allows proper lifecycle management and re-rendering after approve/deny without refreshing the entire conversation.
- **ResolvedActionsSummaryView**: Keeps the conversation focused on the current pending action. Old resolved actions are still accessible but don't add visual noise.
- **MODEL_REF on WebApp**: Replaces EventView's ad-hoc MODEL_REGISTRY (lines 20–37) with a declarative, app-wide pattern. Action cards use `app.getModelByRef('incident.RuleSet')` to resolve context targets for inline previews and click-to-view-model links.
- **Inline editable header fields**: Status, priority, assignee, category, and group changes don't need modal forms. Dropdown menus in the header provide one-click editing. The existing TicketView uses `Modal.form()` for these (lines 293, 311, 336) — the panel uses direct `model.save()` calls. Category options come from `TicketCategories` (Tickets.js lines 28–38). Group uses a collection dropdown fetching the user's available groups.
- **No resize handle**: Unlike AssistantPanelView, the ticket panel has a fixed 460px width. Tickets are a focused workflow, not an ambient chat. Resize adds complexity without clear value.

### Edge Cases

- **Stale action data**: After approve/deny, the backend may close the ticket. Re-fetch the ticket model after action response to update header status.
- **Concurrent approval**: Another user approves while the panel is open. On re-fetch, the action card should show as resolved. The adapter re-fetch handles this.
- **Empty description**: If ticket has no description, the title should not show the expand icon and not be clickable.
- **Closed ticket + pending action**: Buttons disabled per constraint. Show muted "Ticket is closed" text on the action card.
- **Long action labels**: Truncate with ellipsis in the summary bar dots view; show full text in expanded view.
- **No incident linked**: Hide the incident bar entirely (not an error state).
- **AI toggle visibility**: Only show when ticket category supports LLM (check `metadata` or category field).
- **Panel + responsive**: On narrow viewports (< 992px), panel could overlay instead of pushing. Follow AssistantPanelView's `@media` pattern for mobile overlay.

### Testing

- `npm run test:unit` after Model/WebApp changes
- Manual: Open ticket table → click row → panel slides in → verify header fields, notes, action cards
- Manual: Click resolved actions summary → expands → collapse → verify toggle
- Manual: Click title → description modal → close → verify
- Manual: Approve/Deny → verify card updates, note appears in conversation, ticket status refreshes
- Manual: Toggle AI switch → verify POST_SAVE_ACTIONS call
- Manual: Dark mode → verify all surfaces, action card colors, description modal
- Manual: Click different ticket rows while panel is open → verify panel updates

### Docs Impact

- `CHANGELOG.md`: Add entry for ticket panel, action blocks, MODEL_REF pattern
- `docs/web-mojo/core/Model.md`: Document MODEL_REF static property convention
- `docs/web-mojo/core/WebApp.md`: Document registerModelRef/getModelByRef methods

### Out of Scope

- Rule diff view for `incident.rule_update` handler (listed in acceptance criteria but deferred — requires RuleSet diff endpoint not yet available)
- Refactoring EventView's MODEL_REGISTRY to use the new MODEL_REF pattern (separate cleanup task)
- WebSocket live-update of ticket notes (future enhancement)
- Panel resize handle (intentionally omitted — fixed width)
