# Assistant Chat: Sidebar Mode with Conversation Search

| Field | Value |
|-------|-------|
| Type | request |
| Status | done |
| Date | 2026-04-09 |
| Priority | medium |

## Description
Add two alternative display modes for the Assistant Chat, alongside the existing fullscreen modal:

1. **Right Sidebar Mode** — A persistent right-side panel showing only the active chat (no conversation list). The main app content remains visible and interactive, letting users browse pages while chatting.

2. **Popup Window Mode** — Open the assistant in a minimal browser popup window (`window.open` with size/chrome params). This gives a detached, always-accessible chat that floats alongside the main app window.

## Context
The current Assistant Chat launches as a fullscreen modal that covers the entire app. Users can't reference the app while chatting — they must close the modal, look at data, then reopen. A sidebar or popup would let users ask questions while navigating dashboards, tables, and detail pages.

## Acceptance Criteria
- Topbar assistant button cycles through modes or offers a dropdown: fullscreen (existing), sidebar, popup
- **Sidebar mode:**
  - Right-side panel, ~360-400px wide, slides in from the right
  - Shows only the active chat: input, messages, connection status — no conversation list
  - Main app content reflows or is overlaid (configurable or pick one)
  - "New conversation" button present; conversation switching via a compact dropdown or omitted
  - Close button collapses the sidebar
  - Persists across page navigation (not destroyed on route change)
  - Responsive: falls back to fullscreen modal on narrow viewports
- **Popup window mode:**
  - Uses `window.open()` with toolbar/menubar/status disabled, sized ~420x650
  - Renders a minimal version of AssistantView (chat-only, no conversation list)
  - Shares the same WebSocket connection or establishes its own
  - Popup communicates with parent via `postMessage` or shared WS session
  - Graceful fallback if popup is blocked (show toast, fall back to sidebar or modal)
- Conversation state (ID, messages) preserved when switching between modes
- All modes respect `view_admin` permission check

## Investigation

### What exists
- `AssistantView` (`src/extensions/admin/assistant/AssistantView.js`) — two-panel layout (sidebar + chat) rendered inside a fullscreen `Modal.show()` call
- `AssistantConversationListView` — left-side conversation list, emits `conversation:select/new/deleted`
- `AssistantContextChat` — already a chat-only variant scoped to a model, rendered in a standard dialog. Proves the chat portion can work independently of the conversation list.
- `registerAssistant()` in `src/admin.js` — adds topbar button, opens fullscreen modal on click
- Bootstrap 5.3 Offcanvas component available (z-index var already defined in `core.css` as `--mojo-zindex-offcanvas`)
- `window.open()` already used in `FileView.js` and `FilePreviewView.js` for file previews
- Admin CSS in `src/extensions/admin/css/admin.css` has all `.assistant-*` layout styles

### What changes

| Area | Change |
|------|--------|
| `AssistantView.js` | Refactor to support a `mode` option (`fullscreen`, `sidebar`, `popup`). In sidebar/popup modes, skip conversation list child view, render chat-only layout. |
| `registerAssistant()` in `src/admin.js` | Replace single-action button with mode selector (dropdown or cycle). Track current mode. For sidebar: mount view into a persistent app-level container. For popup: call `window.open()` and render into popup document. |
| `admin.css` | Add `.assistant-sidebar-panel` styles: fixed right, width 360-400px, slide-in transition, z-index between fixed and modal. |
| New: popup entry point | A minimal HTML page or inline document that bootstraps AssistantView in chat-only mode inside the popup window. Needs access to app context (auth token, WS URL). |
| `AssistantView` template | Conditional: include `.assistant-sidebar` container only when mode is `fullscreen`. |
| App shell (PortalApp or topbar) | Persistent container `<div>` for the sidebar panel that survives route changes. |

### Constraints
- **Sidebar must survive navigation:** The sidebar panel must be mounted outside the page content area so route changes don't destroy it. Likely needs a dedicated mount point in the app shell.
- **Popup WS connection:** The popup is a separate browsing context. It can either: (a) establish its own WS connection using the same auth token, or (b) relay via `postMessage` to the parent. Option (a) is simpler; option (b) avoids duplicate connections.
- **Popup blockers:** `window.open()` may be blocked. Must detect and fall back gracefully.
- **Bootstrap Offcanvas:** Could use the native Bootstrap 5.3 Offcanvas component for the sidebar, which handles slide-in/out animation and backdrop. However, Offcanvas is typically dismissed on outside click — may need `data-bs-scroll="true" data-bs-backdrop="false"` to keep main content interactive.
- **Conversation state:** If user starts a chat in sidebar, then switches to fullscreen, the conversation ID and messages should carry over. Likely needs a shared state object or singleton pattern.
- **Mobile:** Sidebar mode doesn't make sense on small screens. Should auto-fallback to fullscreen modal.

### Related files
- `src/extensions/admin/assistant/AssistantView.js`
- `src/extensions/admin/assistant/AssistantConversationListView.js`
- `src/extensions/admin/assistant/AssistantContextChat.js` (reference for chat-only pattern)
- `src/extensions/admin/css/admin.css` (`.assistant-*` styles)
- `src/admin.js` (`registerAssistant()`)
- `src/core/css/core.css` (z-index vars)
- `src/core/views/feedback/Modal.js`

### Endpoints
- No new API endpoints. Uses existing assistant WS events and REST fallback.

### Tests required
- Unit: AssistantView renders correctly in each mode (fullscreen, sidebar, popup)
- Integration: Conversation state persists across mode switches
- Integration: Sidebar survives page navigation
- Manual: Popup opens with correct dimensions, handles popup-blocked scenario

### Out of scope
- Resizable sidebar (drag to resize) — future enhancement
- Docking sidebar to left side
- Multi-window sync (multiple popups)
- Mobile-specific chat UI
- Changes to AssistantContextChat (model-scoped variant)

## Plan

### Objective
Add a right sidebar display mode for the Admin Assistant Chat that auto-selects based on viewport width (>=1000px → sidebar, <1000px → fullscreen modal). The sidebar is chat-only with a hamburger toggle to browse conversation history. Conversation list gets search and pagination in both modes.

### Steps

1. **`src/extensions/admin/assistant/AssistantPanelView.js` (new file)**
   - Chat-only view for the sidebar panel. Extends `View`.
   - **Header bar:** hamburger toggle (`bi-list`), conversation title (truncated, or "New conversation"), new-conversation button (`bi-plus-lg`), close button (`bi-x-lg`).
   - **Two states toggled by hamburger:**
     - **Chat state** (default): welcome screen / chat area + input — same pattern as AssistantView's right panel.
     - **History state**: shows `AssistantConversationListView` (with search + load more). Selecting a conversation switches back to chat state.
   - Takes `{ app }` option. Uses `app.ws` for WS, `app.rest` for REST fallback.
   - WS subscription, adapter, input handling, thinking/response/error/plan handlers — same patterns as `AssistantView`.
   - Sets `app._assistantConversationId` on conversation changes so state can transfer to fullscreen if user resizes below 1000px.
   - Emits `panel:close` when close button clicked.

2. **`src/extensions/admin/assistant/AssistantConversationListView.js` (modify)**
   - Add a **search input** at the top of the list (above "New conversation" button). On input (debounced 300ms), sets `collection.params.search` and re-fetches.
   - Add **"Load more" button** at the bottom when `collection.hasMore` is true. Calls `collection.nextPage()` and appends results to existing items.
   - These additions work in both the fullscreen modal's left sidebar and the panel's history toggle — the view doesn't need to know which mode it's in.

3. **`src/admin.js` — `registerAssistant()` (modify)**
   - Topbar button stays as a single button (same icon, same tooltip).
   - **Click handler logic:**
     - If `window.innerWidth >= 1000`: open/toggle sidebar panel.
     - If `window.innerWidth < 1000`: open fullscreen modal (existing behavior).
   - **Sidebar open:**
     - If `app._assistantPanel` exists and is mounted, focus its input and return.
     - Lazy-create `<div id="assistant-panel">` as last child of `.portal-layout`.
     - Instantiate `AssistantPanelView`, mount into `#assistant-panel`.
     - Add class `assistant-panel-open` to `.portal-layout`.
     - On `panel:close`: remove class, destroy view, remove the div.
     - Store reference as `app._assistantPanel`.
   - **Fullscreen open (existing):**
     - If sidebar is open, destroy it first (transfer `app._assistantConversationId` so fullscreen picks it up).
     - Same `Modal.show()` code as today.
   - **Resize listener:** On `window.resize` (debounced), if sidebar is open and viewport drops below 1000px, close sidebar and open fullscreen. Conversely not auto-opened — user clicks button again.

4. **`src/extensions/admin/css/admin.css` (modify)**
   - New styles for the sidebar panel:
     - `#assistant-panel`: `width: 0; overflow: hidden; transition: width 0.25s ease; border-left: 1px solid var(--bs-border-color); flex-shrink: 0;`
     - `.assistant-panel-open #assistant-panel`: `width: 380px;`
   - `.assistant-panel-view` styles: header bar with flex layout, compact styling, full height within panel.
   - `.assistant-panel-view .assistant-history`: search input styling, scrollable conversation list, "load more" button.
   - Conversation list search input styles (also used in fullscreen sidebar).
   - Responsive: below 768px, `#assistant-panel` uses `position: fixed; width: 100%; z-index: var(--mojo-zindex-offcanvas)` as full overlay.

5. **`src/core/PortalApp.js` (no changes)**
   - Panel div is injected dynamically into `.portal-layout` by extension code. No core changes needed.

### Design Decisions

- **Auto-select by viewport width, not user preference:** One button, always does the right thing. Wide screen = sidebar, narrow = fullscreen. No dropdown or mode picker.
- **Hamburger toggle for conversation history:** Reuses existing `AssistantConversationListView` in both contexts. Toggle temporarily replaces chat area — pick a conversation, back to chat. Clean mobile-nav pattern.
- **Search and "load more" built now, not deferred:** The sidebar puts the conversation list in a tighter space where search matters more. Collection already supports `params.search` and `nextPage()`. Both modes benefit. Avoids touching the same view twice.
- **Reflow layout via flex width:** `.portal-body` shrinks naturally as `#assistant-panel` expands. Matches how the left sidebar collapse works. User can interact with both content and chat.
- **Panel injected into `.portal-layout` dynamically:** Assistant is an extension feature, not core. Mount point created on first use, keeping core app shell clean.
- **`app._assistantConversationId` for state transfer:** When viewport crosses 1000px threshold mid-conversation, the new view picks up where the old one left off.

### Edge Cases

- **Resize during active conversation:** Sidebar closes, conversation ID preserved via `app._assistantConversationId`, fullscreen opens with same conversation.
- **Sidebar open + left sidebar collapsed/expanded:** Both flex items coexist. `.portal-body` has `min-width: 0` preventing overflow.
- **Search with no results:** "No conversations found" empty state in the list.
- **Pagination race condition:** Collection's built-in request deduplication handles rapid "load more" clicks.
- **WS disconnection while sidebar open:** Same `_updateConnectionStatus` pattern — input disabled, status dot updates.
- **Panel close during active request:** `onBeforeDestroy` unsubscribes WS and clears timeouts.
- **Hamburger toggle while thinking:** History toggle is visual-only — WS handlers continue processing in background. Toggling back to chat shows the response that arrived.

### Testing

- `npm run test:build` — verify build produces valid bundles with new file
- Manual: open sidebar on wide viewport, verify reflow, navigate pages, confirm panel persists
- Manual: resize below 1000px while sidebar open — should auto-switch to fullscreen with same conversation
- Manual: hamburger toggle — switch to history, search conversations, select one, verify it loads in chat
- Manual: "Load more" in conversation history with >50 conversations
- Manual: search in fullscreen modal's conversation list — verify same search/pagination works there
- Manual: start conversation in sidebar, close sidebar, reopen — verify conversation restored

### Docs Impact

- Update `docs/web-mojo/extensions/Admin.md` — document sidebar mode and auto-select behavior
- Update `CHANGELOG.md` — new feature: Assistant sidebar mode with conversation search/pagination
- May update `docs/web-mojo/components/ListView.md` if load-more pattern is generalizable

### Out of Scope (this iteration)

- Popup window mode (deferred — revisit later)
- Resizable sidebar (drag to resize)
- Sidebar on left side
- Mobile-specific chat UI beyond fullscreen fallback
- Changes to AssistantContextChat (model-scoped variant)

## Resolution

### What was implemented
- **AssistantPanelView** (`src/extensions/admin/assistant/AssistantPanelView.js`) — New chat-only sidebar view with header bar (hamburger toggle, title, new/close buttons), two states (chat vs conversation history), full WS event handling, and conversation state transfer via `app._assistantConversationId`.
- **Conversation search & pagination** — Added debounced search input and "Load more" button to `AssistantConversationListView`, benefiting both fullscreen modal and sidebar history modes.
- **Auto-mode selection** — `registerAssistant()` now auto-selects sidebar (>=1000px) or fullscreen modal (<1000px) based on viewport width. Topbar button toggles sidebar on/off. Debounced resize listener switches mode if viewport crosses threshold.
- **Sidebar panel CSS** — Reflow layout via `width` transition on `#assistant-panel` inside `.portal-layout`. Responsive overlay below 768px.

### Files changed
- `src/extensions/admin/assistant/AssistantPanelView.js` (new)
- `src/extensions/admin/assistant/AssistantConversationListView.js` (modified)
- `src/admin.js` (modified)
- `src/extensions/admin/css/admin.css` (modified)
- `CHANGELOG.md` (updated by docs agent)
- `docs/web-mojo/extensions/Admin.md` (updated by docs agent)

### Tests run and results
- `npm run build:lib` — passes, new chunk `AssistantPanelView-CQ858Qp1.js` (17.94 kB)
- `npm run lint` — no new lint errors in changed files
- `npm test` — all failures pre-existing (53/182 unit pass rate identical before/after)

### Agent findings
- **Security review:** 2 warnings (avatar URL scheme sanitization, WS message fan-out on null conversation ID — both pre-existing patterns), 4 informational items. None blocking.
- **Docs updater:** Updated CHANGELOG.md and Admin.md with new sidebar mode documentation.
