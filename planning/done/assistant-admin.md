# Admin Assistant Interface

| Field | Value |
|-------|-------|
| Type | request |
| Status | done |
| Date | 2026-04-02 |
| Priority | high |

## Description

Build an admin interface for the LLM-powered assistant API. The interface is a **fullscreen modal** opened from a topbar icon, providing a chat-based UI where admins can send natural-language queries about security incidents, jobs, users, groups, and metrics. The assistant (Claude on the backend) responds using permission-gated tools, with structured data blocks (tables, charts, stat cards) rendered inline.

Chat messages are sent and received via **WebSocket** for real-time feedback (thinking indicator, tool call progress). Conversation CRUD (list, get history, delete) uses **REST**.

## Context

The backend (`django-mojo`) exposes:
- **REST** — conversation CRUD at `/api/assistant/conversation` + a POST `/api/assistant` fallback
- **WebSocket** — `assistant_message` type on the existing realtime connection, with progressive events: `assistant_thinking`, `assistant_tool_call`, `assistant_response`, `assistant_error`
- **Structured data blocks** — responses can include `table`, `chart`, and `stat` blocks for rich rendering

The existing `ChatView` component (`src/core/views/chat/`), `WebSocketClient` (`src/core/WebSocketClient.js`), `Modal` (`src/core/views/feedback/Modal.js`), and `Charts.js` extension provide the building blocks.

## UI Layout

**Trigger:** A topbar icon button (e.g., `bi-robot` or `bi-chat-dots`) in the portal's top navigation bar. Visible only to users with `view_admin` permission.

**Modal:** Opens as a fullscreen (or `xl`-sized) modal via `Modal.show()`. Internal layout is a two-panel split:

```
┌──────────────────────────────────────────────────┐
│  [×]  Admin Assistant                            │
├────────────┬─────────────────────────────────────┤
│            │                                     │
│  Conver-   │   Chat messages area                │
│  sation    │   (scrollable)                      │
│  list      │                                     │
│            │   ┌─────────────────────────┐       │
│  [+ New]   │   │ User: "show failed jobs"│       │
│            │   └─────────────────────────┘       │
│  ─ Today   │   ┌─────────────────────────┐       │
│  > Conv 1  │   │ Assistant: "Found 3..." │       │
│  > Conv 2  │   │ ┌─ table block ───────┐ │       │
│            │   │ │ ID | Func | Error   │ │       │
│  ─ Earlier │   │ └────────────────────-┘ │       │
│  > Conv 3  │   │ ┌─ chart block ───────┐ │       │
│            │   │ │ (SeriesChart)        │ │       │
│            │   │ └─────────────────────┘ │       │
│            │   └─────────────────────────┘       │
│            │                                     │
│            │   [thinking... ⚙️ query_jobs]       │
│            │                                     │
│            ├─────────────────────────────────────┤
│            │  [ Type a message...        ] [Send]│
└────────────┴─────────────────────────────────────┘
```

- **Left panel (~250px):** Conversation list grouped by date, new conversation button, delete action per item.
- **Right panel (flex):** Chat messages with inline block rendering, thinking/tool indicators, input bar at bottom.

## Acceptance Criteria

- **Topbar trigger** — Icon button in portal topbar opens the assistant modal. Only visible with `view_admin` permission.
- **Fullscreen modal** — Opens via `Modal.show()` with `size: 'xl'` or `'fullscreen'`. Contains the two-panel assistant View.
- **WebSocket chat** — Messages sent via WS (`assistant_message` type). View subscribes to `assistant_thinking`, `assistant_tool_call`, `assistant_response`, `assistant_error` events.
- **Thinking indicator** — Shown immediately when `assistant_thinking` fires. Hidden on `assistant_response` or `assistant_error`.
- **Tool call progress** — As `assistant_tool_call` events arrive, show which tool is being called (collapsible, non-intrusive).
- **Structured data blocks** — Render `blocks` from responses using existing components:
  - `table` blocks → `TableView` as a child view (inline `Collection` from rows, `paginated: false`, `sortable: false`)
  - `chart` blocks → `SeriesChart` (line/bar/area) or `PieChart` (pie), fed via `setData()` with block's labels/series
  - `stat` blocks → simple Bootstrap card row (inline Mustache template, no new component)
- **Conversation list** — Left panel showing past conversations (via REST `GET /api/assistant/conversation`), sorted by most recent, grouped by date. Clicking one loads its full history into the chat area.
- **New conversation** — Button at top of conversation list. Clears chat, drops `conversation_id`.
- **Delete conversation** — Per-item action with confirmation (REST `DELETE`).
- **Multi-turn** — `conversation_id` passed on each WS message to maintain context.
- **Input disable** — Chat input disabled while waiting for response (between `thinking` and `response`/`error`).
- **Error handling** — Graceful display for: feature disabled (404), API key missing (503), conversation not found (404), WS `assistant_error`.
- **Connection status** — Show WS connection state in the modal (connected/reconnecting/offline) since chat depends on it.
- **Permissions** — Topbar button and modal require `view_admin` permission.
- **Registered in `src/admin.js`** — Assistant View exported. Topbar integration may live in `PortalApp` or be registered via app config.

## Investigation

- **What exists:**
  - `ChatView` / `ChatMessageView` / `ChatInputView` in `src/core/views/chat/` — full chat UI with compact and bubbles themes, adapter pattern, input with file support.
  - `Modal` in `src/core/views/feedback/Modal.js` — static `Modal.show(view, options)` with sizes: sm, md, lg, xl, fullscreen. Handles z-index stacking, backdrop, responsive sizing.
  - `WebSocketClient` in `src/core/WebSocketClient.js` — auto-reconnect, heartbeat, auth, typed message routing (`on('message:type')`). The assistant WS events use `assistant_thinking` naming — need to verify how `WebSocketClient` routes colon-separated types (as `message:assistant_thinking` or via notification topic).
  - `SeriesChart` / `PieChart` in `src/extensions/Charts.js` — Chart.js wrappers for rendering chart blocks.
  - `IncidentView` uses `ChatView` with `IncidentHistoryAdapter` — pattern reference for chat adapter.
  - `PortalApp` topbar supports right-side items — the assistant icon button can be added here.
  - No existing assistant models, pages, or views.

- **What changes:**
  - **New model file:** `src/core/models/Assistant.js`
    - `AssistantConversation` model — endpoint `/api/assistant/conversation`, standard CRUD (for get/delete).
    - `AssistantConversationList` collection — endpoint `/api/assistant/conversation` (list, uses `limit` param, max 50).
    - No forms needed (conversations are created implicitly when first message is sent).
  - **New admin directory:** `src/extensions/admin/assistant/`
    - `AssistantView.js` — The main View shown inside the modal. Two-panel layout: conversation list (left) + chat area (right). Manages WS event subscriptions. Uses the app's existing `WebSocketClient` instance (if available) or creates one.
    - `AssistantMessageView.js` — Extended message view that renders structured data blocks (tables, charts, stat cards) inline within chat messages. Extends or wraps `ChatMessageView`.
    - `AssistantConversationListView.js` — Left panel: fetches conversation list via REST, renders grouped by date, handles selection and deletion.
  - **Modified files:**
    - `src/core/models/index.js` — regenerated via `npm run generate:models` after adding `Assistant.js`.
    - `src/admin.js` — add View export and a helper function (or registration hook) for adding the topbar button.
    - `src/templates.js` — regenerated if any `.mustache` templates are added.

- **Constraints:**
  - **Not a Page** — This is a View shown in a Modal, not a routed Page. No `registerPage()` needed. The trigger is a topbar icon, not a sidebar menu item.
  - **WS event routing** — The server sends events wrapped as `{ type: "message", data: { type: "assistant_thinking", ... } }`. `WebSocketClient` routes these as `message:assistant_thinking`, `message:assistant_tool_call`, `message:assistant_response`, `message:assistant_error`. Subscribe with `ws.on('message:assistant_thinking', handler)` etc.
  - **WS lifecycle** — The modal is not a Page, so no `onEnter()`/`onExit()`. The View must subscribe to WS events on init/mount and unsubscribe on destroy/unmount to avoid leaks.
  - **Chat adapter pattern** — The existing `ChatView` uses an adapter with `fetch()` and `addNote()`. For WS-based chat, the adapter needs to: (a) `fetch()` via REST to load conversation history, (b) send messages via WS instead of REST POST, (c) receive responses asynchronously via WS events rather than returning from `addNote()`. This is a different flow from the existing sync adapter — may need to bypass the adapter pattern or extend `ChatView`.
  - **Conversation list** — Uses `limit` param (max 50), not standard offset pagination.
  - **Conversations are user-scoped** — API only returns the authenticated user's conversations.
  - **Rate limit** — 60/ip, 30/device on message send. Disable input while waiting for response.
  - **Block rendering** — Uses existing `TableView`, `SeriesChart`, `PieChart` as child views. Chart blocks need the Charts extension loaded (it's already bundled in the admin build). `stat` blocks are just Bootstrap cards via inline template.
  - **Mutating operations** — Block IP, cancel job, etc. happen via conversational confirmation turns, not separate UI actions.

- **Related files:**
  - `src/core/views/chat/ChatView.js` — base chat component
  - `src/core/views/chat/ChatInputView.js` — input component
  - `src/core/views/chat/ChatMessageView.js` — message rendering
  - `src/core/views/feedback/Modal.js` — modal system for showing the assistant
  - `src/core/WebSocketClient.js` — WS client with typed message routing
  - `src/core/PortalApp.js` — topbar integration point
  - `src/extensions/Charts.js` — SeriesChart, PieChart for chart blocks
  - `src/extensions/admin/incidents/adapters/IncidentHistoryAdapter.js` — chat adapter pattern
  - `src/extensions/admin/incidents/IncidentView.js` — ChatView usage example
  - `src/core/models/IPSet.js` — model pattern reference
  - `src/admin.js` — export/registration target

- **Endpoints (REST):**
  - `GET /api/assistant/conversation` — list user's conversations
  - `GET /api/assistant/conversation/<id>` — get conversation with full message history
  - `DELETE /api/assistant/conversation/<id>` — delete conversation

- **WebSocket messages:**
  - **Client → Server:** `{ type: "assistant_message", message: "...", conversation_id: N }`
  - **Server → Client:** `assistant_thinking`, `assistant_tool_call`, `assistant_response`, `assistant_error`

- **Structured data blocks (in `assistant_response`):**
  - `table` — `{ type, title, columns: string[], rows: any[][] }`
  - `chart` — `{ type, chart_type: "line"|"bar"|"pie"|"area", title, labels: string[], series: [{name, values}] }`
  - `stat` — `{ type, items: [{label, value}] }`

- **Tests required:**
  - Model unit tests: `AssistantConversation` constructor, endpoint config
  - Build test: exports resolve from `src/admin.js`
  - Block renderer: table, chart, stat blocks render correctly given sample data

- **Out of scope:**
  - File attachments in chat input (assistant API doesn't support them)
  - Admin-to-admin conversation sharing
  - Markdown rendering of assistant responses (can be added later)
  - REST-only fallback mode (WS is required for chat)
  - Conversation title editing
  - Right-side persistent panel (future enhancement — extract the View from the modal into a docked panel)

## Plan

### Objective

Deliver a polished, modern admin assistant chat UI as a fullscreen modal triggered from a topbar icon. Chat uses WebSocket for real-time thinking indicators, tool call progress, and response delivery. Conversation history is managed via REST. Structured data blocks (tables, charts, stat cards) render inline using existing `TableView`, `SeriesChart`, and `PieChart` components. The core `ChatView` components are upgraded to support thinking indicators, rich message content, and input control — making them reusable for any future AI chat feature.

### Steps

#### Step 1 — Upgrade core chat components

**`src/core/views/chat/ChatView.js`** — Add thinking indicator and input control:
- `showThinking(text?)` — appends an animated thinking indicator element to the messages container (bouncing dots + optional text like "Thinking..." or "Calling query_jobs..."). Auto-scrolls to bottom. Only one indicator at a time.
- `hideThinking()` — removes the thinking indicator element.
- `setInputEnabled(enabled)` — proxies to `this.inputView.setEnabled(enabled)`. Disables textarea + send button during processing.
- Add `messageViewClass` constructor option (default `ChatMessageView`) so subclasses/consumers can provide a custom message view class (e.g., `AssistantMessageView`).
- Add `showFileInput` constructor option (default `true`) — passed through to `ChatInputView` to hide the file drop UI when not needed.

**`src/core/views/chat/ChatMessageView.js`** — Support rich content and role-based styling:
- Add `role` support: if `message.role === 'assistant'`, apply `message-assistant` CSS class; if `'user'`, apply `message-user`. Falls back to existing `isCurrentUser` logic when `role` is absent.
- Add `blocks` rendering: if `message.blocks` is a non-empty array, render a `data-container="blocks-{message.id}"` div after the text content. The parent view (or a subclass like `AssistantMessageView`) attaches block child views there.
- Add `toolCalls` rendering: if `message.tool_calls` is a non-empty array, render a collapsible section (Bootstrap collapse) showing tool names + inputs as small badges/pills. Collapsed by default.
- Assistant messages use a bot icon/avatar instead of user initials.

**`src/core/views/chat/ChatInputView.js`** — Add enable/disable and optional file input:
- `setEnabled(enabled)` — disables/enables textarea and send button. Different from `setBusy()` which shows a spinner — `setEnabled(false)` grays out the input with a visual "waiting" state.
- Accept `showFileInput` option (default `true`). When `false`, hide the file drop zone, attachment container, and "Drag & drop files" footer. Don't apply the `FileDropMixin` when disabled.

**`src/extensions/admin/css/admin.css`** — Add assistant-specific styles:
- `.assistant-view` — two-panel flexbox layout (conversation list + chat area)
- `.assistant-conversation-list` — left panel styling, date group headers, active item highlight
- `.assistant-thinking` — animated bouncing dots indicator
- `.assistant-tool-call` — inline tool call badge/pill styling
- `.assistant-message-blocks` — spacing for inline table/chart/stat blocks
- `.assistant-stat-card` — stat block card styling
- `.message-assistant` / `.message-user` — role-based message styling (assistant gets a distinct background, subtle left border, etc.)

#### Step 2 — Create Assistant model

**`src/core/models/Assistant.js`** (new) — Model + Collection for conversation CRUD:
- `AssistantConversation` extends `Model` — endpoint `/api/assistant/conversation`. Used for GET (with messages) and DELETE.
- `AssistantConversationList` extends `Collection` — endpoint `/api/assistant/conversation`, `ModelClass: AssistantConversation`. Default query: `{ limit: 50 }`.
- Export both + a `sendMessage(app, message, conversationId)` helper that does `app.rest.post('/api/assistant', { message, conversation_id: conversationId })` for the REST fallback.

Then run `npm run generate:models` to regenerate `src/core/models/index.js`.

#### Step 3 — Create AssistantMessageView

**`src/extensions/admin/assistant/AssistantMessageView.js`** (new) — Extends `ChatMessageView`:
- Overrides `getTemplate()` / `getBubblesTemplate()` to add a `data-container="blocks-{id}"` div after message text.
- In `onAfterRender()`, if `this.message.blocks` exists, iterate and create child views:
  - `table` block → Create an inline `Collection` from `block.rows` (each row as a model with column keys), then `new TableView({ collection, columns, paginated: false, sortable: false, searchable: false, filterable: false, showRefresh: false, showAdd: false, containerId: 'block-{n}' })` + `addChild()`.
  - `chart` block → `block.chart_type === 'pie'` → `new PieChart(...)`, else `new SeriesChart({ chartType: block.chart_type, ... })`. Convert `block.labels` + `block.series` to Chart.js format: `{ labels: block.labels, datasets: block.series.map(s => ({ label: s.name, data: s.values })) }`. Use `setData()` after mount. Add via `addChild()` with `containerId`.
  - `stat` block → Create a simple `View` with inline Mustache template rendering Bootstrap cards in a flex row.
- If `this.message.tool_calls` exists, render collapsible tool call section.
- Assistant messages show a `bi-robot` icon instead of user avatar/initials.

#### Step 4 — Create AssistantConversationListView

**`src/extensions/admin/assistant/AssistantConversationListView.js`** (new) — Left panel view:
- Constructor takes `{ collection }` (an `AssistantConversationList`).
- Template: "New Conversation" button at top, then conversation items grouped by date (Today / Yesterday / Earlier).
- Each item shows: title (truncated), relative timestamp, delete icon button.
- `data-action="new-conversation"` → emits `conversation:new` event.
- `data-action="select-conversation"` → emits `conversation:select` event with conversation id.
- `data-action="delete-conversation"` → confirm dialog, then `model.destroy()`, re-fetch list, emit `conversation:deleted`.
- Active conversation highlighted with `.active` class.
- `refresh()` method — re-fetches collection and re-renders.
- `setActive(id)` — highlights the given conversation.
- Date grouping logic: compare `created` date to today/yesterday for headers.

#### Step 5 — Create AssistantView (main modal content)

**`src/extensions/admin/assistant/AssistantView.js`** (new) — The main View shown inside `Modal.show()`:
- Two-panel layout: conversation list (left, ~280px) + chat area (right, flex).
- **Constructor:** Accepts `{ app }`. Gets `app.ws` (the app's `WebSocketClient` instance). Stores reference to app for REST calls.
- **`onInit()`:**
  - Create `AssistantConversationList` and fetch conversations.
  - Create `AssistantConversationListView` with `containerId: 'conversation-list'` + `addChild()`.
  - Create `ChatView` with `containerId: 'chat-area'`, `theme: 'bubbles'`, `messageViewClass: AssistantMessageView`, `showFileInput: false`, custom adapter.
  - Wire conversation list events (`conversation:new`, `conversation:select`, `conversation:deleted`).
  - Subscribe to WS events on `app.ws`:
    - `message:assistant_thinking` → `chatView.showThinking('Thinking...')`, `chatView.setInputEnabled(false)`
    - `message:assistant_tool_call` → `chatView.showThinking('Calling ' + data.tool + '...')`
    - `message:assistant_response` → `chatView.hideThinking()`, `chatView.addMessage(...)` with response + blocks, `chatView.setInputEnabled(true)`, update `conversationId` from response
    - `message:assistant_error` → `chatView.hideThinking()`, show error message in chat, `chatView.setInputEnabled(true)`
  - Store bound handler references for cleanup.
- **Chat adapter:**
  - `fetch()` — If `conversationId` is set, fetch conversation via REST (`GET /api/assistant/conversation/{id}`), transform messages to ChatView format. Otherwise return `[]`.
  - `addNote({ text })` — Send WS message: `app.ws.send({ type: 'assistant_message', message: text, conversation_id: conversationId })`. Immediately add user message to chat via `chatView.addMessage()`. Return `{ success: true }`. The assistant response arrives async via WS events.
- **Conversation switching:**
  - `conversation:select` → set `conversationId`, call `chatView.refresh()` to reload history via adapter.
  - `conversation:new` → clear `conversationId`, call `chatView.clearMessages()`, enable input.
  - `conversation:deleted` → if deleted was active, treat as new conversation.
- **Connection status:** Template includes a small status indicator (green dot / yellow dot / red dot) based on `app.ws.isConnected`. Listen to `app.ws` `connected`/`disconnected`/`reconnecting` events to update.
- **`onBeforeDestroy()`:** Unsubscribe all WS event handlers from `app.ws` to prevent leaks.

#### Step 6 — Register in admin.js + provide topbar helper

**`src/admin.js`** — Add exports and registration helper:
- Add `export { default as AssistantView } from '@ext/admin/assistant/AssistantView.js'`.
- Add `export { registerAssistant }` — a function that:
  - Takes `(app)` as argument.
  - Checks `app.activeUser?.hasPermission('view_admin')`.
  - Adds a `rightItems` entry to `app.topbar.config.rightItems` with `{ icon: 'bi-robot', action: 'open-assistant', isButton: true, buttonClass: 'btn btn-link nav-link', tooltip: 'Admin Assistant', permissions: ['view_admin'], handler: () => openAssistantModal(app) }`.
  - The `openAssistantModal()` function creates an `AssistantView({ app })` and calls `Modal.show(view, { size: 'fullscreen', title: 'Admin Assistant', noBodyPadding: true })`.
  - Re-renders topbar to show the new button.

#### Step 7 — Regenerate templates (if needed)

Run `npm run build:templates` if any `.mustache` template files were added. Since all templates are inline in this plan, this step is likely a no-op — verify during build.

### Design Decisions

- **Core chat upgrades vs. assistant-only subclasses** — The thinking indicator, input enable/disable, and role-based message styling are generic patterns that belong in the core chat components. Any AI chat, support chat, or bot interface benefits. The assistant-specific parts (block rendering, WS event wiring, conversation management) stay in the extension layer.
- **TopNav integration via `registerAssistant()` helper** — Avoids modifying `PortalApp.js` core. The consuming app calls `registerAssistant(app)` after startup. Uses the existing `rightItems` config + `handler` callback + `filterItemsByPermissions()` flow that TopNav already supports.
- **ChatView adapter pattern preserved** — The adapter's `addNote()` sends the WS message and returns immediately. The response arrives asynchronously via WS events, which the `AssistantView` handles by calling `chatView.addMessage()`. This keeps the adapter interface intact while supporting the async WS flow.
- **WS from app instance, not created per-modal** — The assistant subscribes to events on `app.ws` (the app's shared WebSocketClient). No new WS connections. The assistant events are scoped by `conversation_id` in the payload, so multiple modal opens (unlikely but possible) won't conflict.
- **Block rendering via child views** — Each block becomes a child view (`TableView`, `SeriesChart`, `PieChart`, or simple `View` for stats) added to the message view's DOM. Framework manages lifecycle — when the message view is destroyed, blocks are destroyed too.
- **Inline thinking indicator (not a message)** — The thinking indicator is a DOM element appended to the messages container, not a message in the `messages` array. This avoids polluting the message list with transient state and makes show/hide trivial.

### Edge Cases

- **WS not connected when modal opens** — Show "Connecting..." status. Disable input. On `connected` event, enable input. If WS fails entirely, show persistent "Connection lost — assistant unavailable" banner.
- **WS disconnects mid-conversation** — Thinking indicator stays visible. On reconnect, re-subscribe to events. If response was lost, user can re-send the message (new conversation turn).
- **Feature disabled (404 from REST)** — If first `addNote()` falls back to REST POST and gets 404, show "Assistant is not enabled on this server" as a system message in chat.
- **API key missing (503)** — Show "LLM API key not configured" as a system message.
- **Conversation not found (404)** — Remove from sidebar list, switch to new conversation state with toast notification.
- **Modal closed during thinking** — `onBeforeDestroy()` unsubscribes WS handlers. Orphaned `assistant_response` events are received by no one — harmless.
- **Empty conversation list** — Show centered "No conversations yet. Start by typing a message below." placeholder text.
- **Large table blocks** — `TableView` with `paginated: false` renders all rows. For very large datasets, this could be slow. Accept this for v1; add client-side pagination later if needed.
- **Chart extension not available** — Try/catch the `SeriesChart`/`PieChart` import. If it fails, fall back to rendering chart data as a `TableView` (columns = `['Label', ...seriesNames]`, rows = zipped data).
- **Rate limit hit** — Input is disabled during thinking state, preventing rapid re-sends. If the WS message itself is rate-limited, the `assistant_error` event surfaces it.
- **Concurrent WS events for wrong conversation** — Filter incoming events by `data.conversation_id === this.conversationId`. Ignore events for other conversations.

### Testing

- `npm run build:lib` — verify the build succeeds with all new/modified files
- `npm run lint` — lint validation
- Chrome UI smoke test — open the modal, verify layout, send a test message (requires running backend)

### Docs Impact

- `CHANGELOG.md` — Add entry for Admin Assistant feature + ChatView upgrades
- `docs/web-mojo/extensions/Admin.md` — Add section on assistant integration and `registerAssistant()` API
- `docs/web-mojo/core/View.md` or chat-specific docs — Document new ChatView methods (`showThinking`, `hideThinking`, `setInputEnabled`, `messageViewClass`, `showFileInput`)
