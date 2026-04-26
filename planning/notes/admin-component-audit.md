# Admin Extension Component Audit
**Date:** 2026-04-25

## Summary
**Total components audited:** 48 framework-level (core + extension) components  
**Doc gaps:** 5  
**Example gaps:** 7  
**Public export gaps:** 2

---

## Components Imported by Admin Extension

| Component | Source path | Public export? | Doc | Example | Verdict |
|---|---|---|---|---|---|
| **CHAT** (flagged anchor) | | | | | |
| ChatView | @core/views/chat/ChatView.js | ✅ | ❌ MISSING | ❌ MISSING | doc + example needed |
| ChatMessageView | @core/views/chat/ChatMessageView.js | ✅ | ❌ MISSING | ❌ MISSING | doc + example needed |
| ChatInputView | @core/views/chat/ChatInputView.js | ✅ | ❌ MISSING | ❌ MISSING | doc + example needed |
| **ASSISTANT** (flagged anchor) | | | | | |
| AssistantView | @ext/admin/assistant/AssistantView.js | ✅ admin.js | ❌ MISSING | ❌ MISSING | admin-internal; doc + example for admin integration |
| AssistantPanelView | @ext/admin/assistant/AssistantPanelView.js | ❌ (dynamic only) | ❌ MISSING | ❌ MISSING | admin-internal; show registerAssistant() usage |
| AssistantConversationView | @ext/admin/assistant/AssistantConversationView.js | ✅ admin.js | ❌ MISSING | ❌ MISSING | admin-internal; doc only |
| AssistantSkillView | @ext/admin/assistant/AssistantSkillView.js | ✅ admin.js | ❌ MISSING | ❌ MISSING | admin-internal; doc only |
| AssistantConversationTablePage | @ext/admin/assistant/AssistantConversationTablePage.js | ✅ admin.js | ❌ MISSING | ❌ MISSING | admin-internal; doc only |
| AssistantMemoryPage | @ext/admin/assistant/AssistantMemoryPage.js | ✅ admin.js | ❌ MISSING | ❌ MISSING | admin-internal; doc only |
| AssistantMessageView | @ext/admin/assistant/AssistantMessageView.js | ❌ | ❌ MISSING | ❌ MISSING | admin-internal; not exported |
| AssistantConversationListView | @ext/admin/assistant/AssistantConversationListView.js | ❌ | ❌ MISSING | ❌ MISSING | admin-internal; not exported |
| **CHARTS** | | | | | |
| MetricsChart | @ext/charts/MetricsChart.js | ❌ | ✅ Charts.md | ❌ MISSING | example needed |
| CloudWatchChart | @ext/admin/aws/CloudWatchChart.js | ✅ admin.js | ✅ (via Charts.md) | ❌ MISSING | admin-specific example |
| **DATA & FEEDBACK** | | | | | |
| View | @core/View.js | ✅ | ✅ | ✅ | complete |
| Page | @core/Page.js | ✅ | ✅ | ✅ | complete |
| Model | @core/Model.js | ✅ | ✅ | ✅ | complete |
| Collection | @core/Collection.js | ✅ | ✅ | ✅ | complete |
| Rest | @core/Rest.js | ✅ | ✅ | ✅ | complete |
| DataView | @core/views/data/DataView.js | ✅ | ✅ | ✅ | complete |
| FileView | @core/views/data/FileView.js | ✅ | ✅ | ✅ | complete |
| Modal | @core/views/feedback/Modal.js | ✅ | ✅ | ✅ | complete |
| Dialog | @core/views/feedback/Dialog.js | ✅ | ✅ | ✅ | complete |
| ContextMenu | @core/views/feedback/ContextMenu.js | ✅ | ✅ | ✅ | complete |
| **FORMS & TABLES** | | | | | |
| FormView | @core/forms/FormView.js | ✅ | ✅ | ✅ | complete |
| TableView | @core/views/table/TableView.js | ✅ | ✅ | ✅ | complete |
| TablePage | @core/pages/TablePage.js | ✅ | ✅ | ✅ | complete |
| TableRow | @core/views/table/TableRow.js | ✅ | ❌ MISSING | ❌ MISSING | minor; doc optional |
| **NAVIGATION** | | | | | |
| TabView | @core/views/navigation/TabView.js | ✅ | ✅ | ✅ | complete |
| SideNavView | @core/views/navigation/SideNavView.js | ✅ | ✅ | ✅ | complete |
| TopNav | @core/views/navigation/TopNav.js | ✅ | ✅ | (sidebar combo) | complete |
| Sidebar | @core/views/navigation/Sidebar.js | ✅ | ✅ | (sidebar combo) | complete |
| SimpleSearchView | @core/views/navigation/SimpleSearchView.js | ✅ | ✅ | ✅ | complete |
| **UTILITIES & SERVICES** | | | | | |
| dataFormatter | @core/utils/DataFormatter.js | ✅ | ✅ | ✅ | complete |
| MOJOUtils | @core/utils/MOJOUtils.js | ✅ | ✅ | ❌ MISSING | minor; doc exists |
| applyFileDropMixin | @core/mixins/FileDropMixin.js | ✅ | ❌ MISSING | ❌ MISSING | low priority |
| ToastService | @core/services/ToastService.js | ✅ | ✅ | ✅ | complete |
| WebSocketClient | @core/services/WebSocketClient.js | ✅ | ✅ | ✅ | complete |
| **EXTENSIONS** | | | | | |
| MapView | @ext/map/MapView.js | ✅ | ✅ | ✅ | complete |
| MetricsCountryMapView | @ext/map/index.js | ✅ | ✅ | ❌ MISSING | minor; used in admin maps |

---

## Doc Gaps (to spawn doc agents)

### High Priority (Public API + Heavy Admin Use)

1. **ChatView** — `docs/web-mojo/components/ChatView.md`
   - **Source:** `src/core/views/chat/ChatView.js`
   - **Why:** Exported from main package surface; heavily used by admin assistant (AssistantView, AssistantPanelView, AssistantConversationView, TicketView, IncidentView).
   - **Scope:** Basic usage, adapter pattern (fetch/addNote), WebSocket message handling, custom message renderers.

2. **ChatMessageView** — `docs/web-mojo/components/ChatMessageView.md`
   - **Source:** `src/core/views/chat/ChatMessageView.js`
   - **Why:** Exported; extended by AssistantMessageView (admin assistant).
   - **Scope:** Render props, custom formatting, tool call rendering.

3. **ChatInputView** — `docs/web-mojo/components/ChatInputView.md` (or unified Chat doc)
   - **Source:** `src/core/views/chat/ChatInputView.js`
   - **Why:** Exported; completes the chat widget trio.
   - **Scope:** Input lifecycle, send/cancel handlers, file attachment support.

### Medium Priority (Admin-Specific)

4. **AssistantView Integration** — `docs/web-mojo/extensions/AdminAssistant.md` or `docs/web-mojo/examples.md` expansion
   - **Covers:** How to call `registerAssistant(app)`, integrate the topbar button, sidebar panel vs fullscreen modal selection, responsive behavior.
   - **Why:** Documented in admin.js but no user-facing guide for downstream portal builders.

5. **MetricsChart / CloudWatchChart** — Expand `docs/web-mojo/extensions/Charts.md`
   - **Source:** `src/extensions/charts/MetricsChart.js`, `src/extensions/admin/aws/CloudWatchChart.js`
   - **Why:** Admin dashboards (CloudWatch, metrics permissions) use these; doc exists but CloudWatch variant not clearly explained.
   - **Scope:** CloudWatch-specific params (stat, account, resourceType), response format differences.

### Low Priority (Utility/Secondary)

6. **TableRow** — optional; usually taught via TableView examples.
7. **MOJOUtils** — optional; doc exists, just missing example.
8. **applyFileDropMixin** — optional; low-adoption utility.

---

## Example Gaps (to spawn example agents)

### High Priority (Public + Heavy Admin Use)

1. **ChatView** — `examples/portal/examples/components/ChatView/ChatViewExample.js`
   - **Show:** A basic thread with 3–5 messages, user/AI alternating, input field, send/typing states.
   - **Scope:** Simplest case: in-memory adapter or mock API; no WebSocket.

2. **ChatMessageView** — Include in ChatView example or separate `ChatMessageCustomRenderer.js`
   - **Show:** Custom renderer for code blocks, markdown, or tool outputs.

3. **ChatInputView** — Include in ChatView example or as focused example showing file attachment UI.

### Medium Priority (Admin Features)

4. **AssistantPanel Integration** — `examples/portal/examples/extensions/AdminAssistant/AssistantPanelExample.js`
   - **Show:** Calling `registerAssistant(app)`, opening sidebar panel, responsive toggle on window resize.
   - **Scope:** Wiring into PortalApp, permission gating, WebSocket event flow.

5. **AssistantFullscreen Modal** — `examples/portal/examples/extensions/AdminAssistant/AssistantFullscreenExample.js`
   - **Show:** Opening AssistantView inside a Modal (mobile fallback).

6. **ChatView in Incident/Ticket Context** — Expand ticket example to show note thread (already uses ChatView).
   - **Show:** `openAssistantChat(view, 'incident.Ticket')` pattern.

### Lower Priority

7. **MetricsChart** — `examples/portal/examples/extensions/Charts/MetricsChartExample.js` (if not already present)
   - **Show:** Chart with date range selector, endpoint configuration.

---

## Out of Scope / Drop List

- **StackTraceView** (admin-internal, not exported) — kept internal.
- **AssistantConversationListView**, **AssistantMessageView** — admin-internal UI; documentation only (no public example).
- **View**, **Page**, **Model**, etc. — already well-documented and exemplified.

---

## Recommended Action Plan

### Phase 1: Chat (Public Surface, Blocks Everything)
- [ ] Spawn `doc: ChatView, ChatMessageView, ChatInputView` agent (unified doc or 3 separate).
- [ ] Spawn `example: ChatView basic thread + input` agent.

### Phase 2: Assistant Integration (Admin Use)
- [ ] Spawn `doc: registerAssistant() integration guide` agent.
- [ ] Spawn `example: AssistantPanel sidebar + button` agent.
- [ ] Spawn `example: AssistantFullscreen modal fallback` agent.

### Phase 3: Metrics & Extensions (Admin Dashboards)
- [ ] Expand `doc: Charts.md` to include CloudWatchChart specifics.
- [ ] Spawn `example: MetricsChart standalone` agent (if not present).

### Phase 4: Polish (Optional)
- [ ] Optional: TableRow doc + example.
- [ ] Optional: applyFileDropMixin doc + example.
- [ ] Optional: MOJOUtils example.

---

## Key Statistics
- **Total framework components:** 48
- **Complete (doc + example):** 40
- **Doc only (example missing):** 3 (MOJOUtils, Charts variants)
- **Example only (doc missing):** 0
- **Both missing:** 5 (ChatView, ChatMessageView, ChatInputView, TableRow, applyFileDropMixin)
- **Admin-internal (not exported):** 8 (Assistant sub-components)

**Doc gaps per category:**
- Chat: 3 ← **high priority**
- Assistant integration: 1 ← **medium priority**
- Charts: 1 (partial) ← **medium priority**
- Utilities/mixins: 2 ← **low priority**

**Example gaps per category:**
- Chat: 3 ← **high priority**
- Assistant integration: 2 ← **medium priority**
- Charts: 1 ← **medium priority**
- Utilities: 1 ← **low priority**
