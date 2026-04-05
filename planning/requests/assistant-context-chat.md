# AI Assistant Context Chat for Ticket & Incident Views

| Field | Value |
|-------|-------|
| Type | request |
| Status | planned |
| Date | 2026-04-05 |
| Priority | high |

## Description

Add the ability to start or resume an AI Assistant conversation from within TicketView and IncidentView. A new backend endpoint (`POST /api/assistant/context`) creates or retrieves a conversation scoped to a specific model instance. The `conversation_id` is persisted in the model's metadata so subsequent opens resume the same thread. The integration reuses the existing AssistantView infrastructure (WebSocket streaming, structured blocks, markdown rendering) in a pattern that can be extended to any model view.

## Context

The LLM agent already creates tickets and analyzes incidents, but there's no way for a human operator to have a back-and-forth conversation with the AI about a specific ticket or incident. The assistant chat exists as a standalone fullscreen modal (robot icon in topbar), but it has no model context. This feature bridges that gap — the AI gets the full model context (incident events, metadata, ticket description) and the operator can ask follow-up questions, request deeper analysis, or instruct the AI to take actions.

## Acceptance Criteria

- [ ] TicketView has an "Ask AI" button that opens an assistant chat scoped to that ticket
- [ ] IncidentView has an "Ask AI" button/action that opens an assistant chat scoped to that incident
- [ ] First open calls `POST /api/assistant/context` with `{model, pk}` and stores `conversation_id` in metadata
- [ ] Subsequent opens reuse `metadata.assistant_conversation_id` to resume the same conversation
- [ ] Chat supports real-time streaming via WebSocket (same as existing AssistantView)
- [ ] Chat renders structured blocks (tables, charts, stats) via AssistantMessageView
- [ ] Chat renders markdown via `/api/docit/render`
- [ ] Pattern is reusable — any view with a model can add assistant chat with minimal code

## Investigation

### What exists

- **AssistantView** (`src/extensions/admin/assistant/AssistantView.js`) — Full standalone assistant with conversation sidebar, chat area, WebSocket streaming, structured blocks. Launched via `Modal.show()` in fullscreen mode from the topbar robot icon.
- **AssistantMessageView** (`src/extensions/admin/assistant/AssistantMessageView.js`) — Extended ChatMessageView with support for table, chart, and stat blocks. Handles markdown rendering.
- **AssistantConversation model** (`src/core/models/Assistant.js`) — Model with endpoint `/api/assistant/conversation`. Supports `graph=detail` for fetching with full message history.
- **ChatView** (`src/core/views/chat/ChatView.js`) — Generic chat component that works with any adapter implementing `fetch()` and `addNote()`. Has `refresh()` method.
- **Existing adapter pattern** — `TicketNoteAdapter` and `IncidentHistoryAdapter` both implement the ChatView adapter interface (`fetch()` → messages[], `addNote(data)` → response).
- **Backend auto-merges metadata** — Saving `{ metadata: { assistant_conversation_id: 789 } }` will merge into existing metadata without overwriting other keys.

### What changes

1. **New: `AssistantContextAdapter`** — A ChatView adapter that:
   - Takes `{ model, pk, conversationId }` in constructor
   - On first `fetch()`, calls `POST /api/assistant/context` if no `conversationId`, then fetches the conversation
   - `addNote()` sends messages via WebSocket (or REST fallback) to the scoped conversation
   - Transforms assistant messages using the same format as AssistantView's internal adapter

2. **Modified: `TicketView`** — Add "Ask AI" button in the header actions area. On click:
   - Check `metadata.assistant_conversation_id`
   - Open a Dialog with a ChatView using `AssistantContextAdapter`
   - After conversation creation, save `conversation_id` to metadata

3. **Modified: `IncidentView`** — Add "Ask AI" to QuickActionsBar and/or context menu. Same flow as TicketView.

4. **Consider: Reusable mixin or helper** — A `openAssistantChat(model, modelName)` utility function that any view can call, handling the full flow (check metadata → create/resume conversation → open dialog).

### Constraints

- Must use existing `data-action="kebab-case"` → `onActionKebabCase()` pattern
- Must use `addChild()` with `containerId` for child views
- WebSocket integration requires `app` reference (available via `this.getApp()`)
- AssistantView currently assumes fullscreen modal with conversation sidebar — the context chat should be a simpler single-conversation view (no sidebar)
- The Dialog should be `size: 'xl'` or `size: 'lg'` (not fullscreen — user needs to see the ticket/incident behind it)
- REST API uses `app.rest.post()` (lowercase aliases now available on Rest class)

### Related files

| File | Role |
|------|------|
| `src/extensions/admin/assistant/AssistantView.js` | Existing assistant — reference for WebSocket flow, message handling |
| `src/extensions/admin/assistant/AssistantMessageView.js` | Structured block rendering — reuse for context chat |
| `src/core/models/Assistant.js` | AssistantConversation model |
| `src/extensions/admin/incidents/TicketView.js` | Add "Ask AI" button + handler |
| `src/extensions/admin/incidents/IncidentView.js` | Add "Ask AI" to QuickActionsBar + context menu |
| `src/extensions/admin/incidents/adapters/TicketNoteAdapter.js` | Reference adapter pattern |
| `src/core/views/chat/ChatView.js` | Chat component — used with adapter |
| `src/core/Rest.js` | REST client (lowercase aliases: `rest.post()`) |
| `src/admin.js` | Existing `registerAssistant()` — reference for modal launch pattern |

### Endpoints

| Method | URL | Body | Response | Notes |
|--------|-----|------|----------|-------|
| POST | `/api/assistant/context` | `{ model: "incident.Ticket", pk: 123 }` | `{ status: true, data: { conversation_id: 789 } }` | Creates or retrieves context conversation |
| GET | `/api/assistant/conversation/{id}?graph=detail` | — | Conversation with messages | Existing endpoint |
| POST | `/api/assistant` | `{ message, conversation_id }` | Triggers assistant response | REST fallback for WebSocket |

### Tests required

- Unit: `AssistantContextAdapter` — fetch creates conversation on first call, reuses on subsequent
- Unit: metadata persistence of `assistant_conversation_id`
- Integration: Full flow — open ticket → click Ask AI → conversation created → message sent → response received

### Out of scope

- Modifying the standalone AssistantView (topbar robot icon)
- Conversation sidebar/history within the context chat (it's always single-conversation)
- Auto-triggering assistant analysis on ticket/incident creation
- Mobile/responsive layout for the context chat dialog
- Permission checks beyond existing `view_admin`

## Plan

### Objective

Add an "Ask AI" button to TicketView and IncidentView that opens a single-conversation assistant chat in a dialog. The conversation is scoped to the model instance via `POST /api/assistant/context`. The `conversation_id` is persisted in `metadata.assistant_conversation_id` for session resumption. The pattern is reusable for any model view.

### Steps

1. **New file: `src/extensions/admin/assistant/AssistantContextChat.js`**

   A self-contained view + adapter that any view can launch. Contains:

   - **`AssistantContextAdapter`** — ChatView adapter:
     - Constructor takes `{ app, modelName, pk, conversationId }`
     - `fetch()`: If no `conversationId`, calls `POST /api/assistant/context` with `{ model: modelName, pk }` to get one. Then fetches `AssistantConversation` with `graph=detail`, transforms messages using the same format as AssistantView (role, author, content, blocks, tool_calls)
     - `addNote(data)`: Sends via WebSocket (`assistant_message` event with `conversation_id`) or falls back to `POST /api/assistant`. Immediately adds user message to chat. Returns `{ success: true }`
     - Emits `conversation-created` event with `conversationId` so the parent can persist it

   - **`AssistantContextChat`** — View wrapping ChatView + WebSocket:
     - Template: chat container + custom textarea input (matching AssistantView's input pattern — Enter to send, Shift+Enter for newline)
     - `onInit()`: Creates ChatView with `AssistantContextAdapter` and `messageViewClass: AssistantMessageView`
     - Subscribes to WebSocket events (`assistant_thinking`, `assistant_response`, `assistant_tool_call`, `assistant_error`) scoped to its `conversationId`
     - Manages thinking indicator, input enable/disable, streaming responses
     - `onBeforeDestroy()`: Unsubscribes WebSocket listeners

   - **`openAssistantChat(view, modelName)`** — Exported helper function:
     - Takes any view instance + model name string (e.g., `'incident.Ticket'`)
     - Reads `metadata.assistant_conversation_id` from the view's model
     - Opens a Dialog (`size: 'xl'`, `header: true`, title: "AI Assistant") with `AssistantContextChat` as body
     - On `conversation-created` event, saves `{ metadata: { assistant_conversation_id: id } }` to the model

2. **Modified: `src/extensions/admin/incidents/TicketView.js`**

   - Import `openAssistantChat` from `AssistantContextChat.js`
   - Add "Ask AI" button in the header actions div (before context menu container)
   - Add handler: `async onActionAskAi() { await openAssistantChat(this, 'incident.Ticket'); }`

3. **Modified: `src/extensions/admin/incidents/IncidentView.js`**

   - Import `openAssistantChat` from `AssistantContextChat.js`
   - Add "Ask AI" button in QuickActionsBar template (right-side group, next to "LLM Analyze")
   - Add handler in QuickActionsBar: `async onActionQuickAskAi() { this.emit('ask-ai'); }`
   - Wire event in IncidentOverviewSection and IncidentView
   - Add to context menu items: `{ label: 'Ask AI', action: 'ask-ai', icon: 'bi-robot' }`
   - Add handler in IncidentView: `async onActionAskAi() { await openAssistantChat(this, 'incident.Incident'); }`

### Design Decisions

- **Single new file** (`AssistantContextChat.js`) keeps all context-chat logic in one place. No modifications to the existing AssistantView, ChatView, or AssistantMessageView.
- **`openAssistantChat()` as a utility function** rather than a mixin — any view calls it with `(this, 'app.ModelName')`. Minimal integration surface: one import, one line in the action handler.
- **Adapter + WebSocket in the same view** — The `AssistantContextChat` view owns both the adapter and the WebSocket subscription lifecycle. This matches how AssistantView works but is self-contained (no conversation sidebar, no welcome screen).
- **`metadata.assistant_conversation_id`** persisted via backend auto-merge — no client-side spread needed. Saved once on first conversation creation.
- **`messageViewClass: AssistantMessageView`** — ChatView already supports custom message views. This gives us structured blocks (tables, charts, stats) and markdown rendering for free.
- **Dialog size `xl`** — Large enough for a meaningful chat, but not fullscreen so the user can see the ticket/incident behind it.

### Edge Cases

- **No WebSocket connection** — REST fallback via `POST /api/assistant`. Response is synchronous (no streaming), but still functional.
- **`/api/assistant/context` fails** — Show toast error, don't open dialog. Don't persist a bad `conversation_id`.
- **Existing `conversation_id` in metadata is stale/deleted** — `fetch()` on the conversation will fail. Catch the error, clear the stored ID, and call `/api/assistant/context` again to create a fresh conversation.
- **Multiple "Ask AI" clicks** — Guard against opening multiple dialogs. Disable button or check if dialog is already open.
- **WebSocket events from other conversations** — Filter by `conversationId` in the event handlers (the data payload should include `conversation_id`).
- **Component cleanup** — `onBeforeDestroy()` must unsubscribe all WebSocket listeners to prevent memory leaks and ghost handlers.

### Testing

- Lint: `npm run lint`
- Verify manually: Open ticket → Ask AI → conversation created → message sent → streaming response received → close → reopen → same conversation resumes

### Docs Impact

- `CHANGELOG.md` — New feature entry: "AI Assistant context chat for Ticket and Incident views"
- No framework docs changes needed (this is an extension feature, not a core API change)
