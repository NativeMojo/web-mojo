# Rename AI Assistant to "Mojo"

| Field | Value |
|-------|-------|
| Type | request |
| Status | open |
| Date | 2026-05-06 |
| Priority | high |

## Description

Rebrand the AI Assistant feature as **"Mojo"** throughout the framework. Replace the generic `bi-robot` / `bi-stars` icons with the Mojo logo SVG, and update all user-facing strings from "AI Assistant" / "Assistant" to "Mojo".

Logo URL (permanent): `https://mojo-verify.s3.amazonaws.com/signatures/14e7aab75c2749cb846f7d57298691ac/mojo_logo_ai_bb896864.svg`

## Context

The AI Assistant is a core admin feature. Giving it its own brand identity ("Mojo") with a custom logo makes the product feel intentional rather than generic.

## Acceptance Criteria

- Every user-facing occurrence of "AI Assistant", "Admin Assistant", and standalone "Assistant" (when referring to the AI) reads **"Mojo"** instead.
- The `bi-robot` icon in the sidebar menu and topbar button is replaced with the Mojo logo SVG.
- The `bi-stars` welcome-screen icon in AssistantView and AssistantPanelView is replaced with the Mojo logo SVG.
- The `bi-robot` icon next to "Assistant" in chat message bubbles (ChatMessageView) is replaced with the Mojo logo.
- Input placeholder reads "Message Mojo..." instead of "Message the assistant...".
- The popup window `<title>` reads "Mojo".
- Permission label in User.js reads "Mojo" with appropriate tooltip.
- Admin sidebar menu section header reads "Mojo".
- Both light and dark themes render the logo correctly.
- No CSS class names or JS identifiers are renamed (`.assistant-*`, `AssistantView`, etc.) — internal names stay stable.

## Investigation

### What exists

The assistant feature spans these files, all containing hardcoded branding strings:

| File | Line(s) | Current string | Change to |
|------|---------|----------------|-----------|
| `src/admin.js` | 398 | `// ── AI Assistant ──` | `// ── Mojo ──` |
| `src/admin.js` | 400 | `text: 'AI Assistant'` (sidebar menu) | `'Mojo'` |
| `src/admin.js` | 402 | `icon: 'bi-robot'` (sidebar menu) | Mojo logo element |
| `src/admin.js` | 535 | `<title>AI Assistant</title>` (popup) | `<title>Mojo</title>` |
| `src/admin.js` | 607 | `icon: 'bi-robot'` (topbar button) | Mojo logo element |
| `src/admin.js` | 611 | `tooltip: 'Admin Assistant'` (topbar) | `'Mojo'` |
| `src/core/models/User.js` | 76 | `label: "AI Assistant", tooltip: "Access to the AI Assistant"` | `label: "Mojo", tooltip: "Access to Mojo"` |
| `src/core/views/chat/ChatMessageView.js` | 66 | `<i class="bi bi-robot"></i>` (avatar) | Mojo logo `<img>` |
| `src/core/views/chat/ChatMessageView.js` | 78 | `'Assistant'` (author label) | `'Mojo'` |
| `src/core/views/chat/ChatMessageView.js` | 103 | `'<i class="bi bi-robot me-1"></i>Assistant'` (bubbles) | Mojo logo + `'Mojo'` |
| `src/extensions/admin/assistant/AssistantView.js` | 45 | `<i class="bi bi-stars"></i>` (welcome) | Mojo logo `<img>` |
| `src/extensions/admin/assistant/AssistantView.js` | 69 | `placeholder="Message the assistant..."` | `"Message Mojo..."` |
| `src/extensions/admin/assistant/AssistantView.js` | 603, 701 | `{ name: 'Assistant' }` (author) | `{ name: 'Mojo' }` |
| `src/extensions/admin/assistant/AssistantPanelView.js` | 70 | `<i class="bi bi-stars"></i>` (welcome) | Mojo logo `<img>` |
| `src/extensions/admin/assistant/AssistantPanelView.js` | 90 | `placeholder="Message the assistant..."` | `"Message Mojo..."` |
| `src/extensions/admin/assistant/AssistantPanelView.js` | 393 | `'Assistant'` (panel title fallback) | `'Mojo'` |
| `src/extensions/admin/assistant/AssistantPanelView.js` | 647, 743 | `{ name: 'Assistant' }` (author) | `{ name: 'Mojo' }` |
| `src/extensions/admin/assistant/AssistantContextChat.js` | 123 | `{ name: 'Assistant' }` (author) | `{ name: 'Mojo' }` |
| `src/extensions/admin/assistant/AssistantContextChat.js` | 533 | `author: { name: 'Assistant' }` | `{ name: 'Mojo' }` |
| `src/extensions/admin/assistant/AssistantContextChat.js` | 639 | `title: 'AI Assistant'` (modal) | `'Mojo'` |
| `src/extensions/admin/assistant/AssistantMemoryPage.js` | 13 | `'Visible to all assistant users'` | `'Visible to all Mojo users'` |
| `src/extensions/admin/assistant/AssistantMemoryPage.js` | 21 | `pageName: 'Assistant Memory'` | `'Mojo Memory'` |
| `src/extensions/admin/assistant/AssistantMemoryPage.js` | 34 | `Assistant Memory` (heading) | `Mojo Memory` |
| `src/core/models/User.js` | 68 | `tooltip: "...assistant..."` (view_admin) | `"...Mojo..."` |

### What changes

**Strings only** — 13 files touched, ~25 string replacements. No structural, API, CSS class, or file-rename changes.

**Logo integration** — The SVG logo URL is external (S3-hosted). Use `<img>` tags with appropriate sizing:
- Welcome icon: `<img src="..." class="assistant-welcome-icon" style="width:48px; height:48px;">` (fullscreen), smaller for panel
- Topbar button and sidebar menu: need a small inline `<img>` or a custom icon pattern — the current icon system uses Bootstrap Icon classes, so the logo needs either an `<img>` element or an inline SVG approach
- Chat message avatar: `<img>` inside the `.message-avatar` circle
- Chat message bubbles: small inline `<img>` next to "Mojo" text

**CSS adjustments** — The `.assistant-welcome-icon` rule currently sets `font-size: 2.5rem` for a font icon. When switching to an `<img>`, adjust to use `width`/`height` instead. May need small tweaks for the message avatar and topbar icon sizing.

### Constraints

- CSS class names (`.assistant-*`) stay as-is — renaming them would be a breaking change for any downstream customization.
- JS class names (`AssistantView`, `AssistantPanelView`, etc.) stay as-is — renaming would break imports.
- API endpoints (`/api/assistant/*`) stay as-is — backend contract unchanged.
- Permission key `"assistant"` stays as-is — only the user-facing label changes.
- The logo is an external SVG on S3 — no need to bundle it.

### Related files

- `src/admin.js` — sidebar menu, topbar button, popup window
- `src/core/models/User.js` — permission label
- `src/core/views/chat/ChatMessageView.js` — message display name and avatar
- `src/extensions/admin/assistant/AssistantView.js` — fullscreen modal
- `src/extensions/admin/assistant/AssistantPanelView.js` — sidebar panel
- `src/extensions/admin/assistant/AssistantContextChat.js` — context chat dialog
- `src/extensions/admin/assistant/AssistantMemoryPage.js` — memory admin page
- `src/extensions/admin/css/admin.css` — welcome icon sizing adjustment

### Endpoints

None — no API changes.

### Tests required

- Visual verification in both light and dark themes
- Logo renders in welcome screen (fullscreen modal and sidebar panel)
- Logo renders in topbar button and sidebar menu
- Logo renders in chat message avatars and bubble headers
- Context chat modal title reads "Mojo"
- Popup window title reads "Mojo"
- Permission label reads "Mojo" in user management

### Out of scope

- Renaming CSS classes (`.assistant-*`)
- Renaming JS classes/files (`AssistantView.js`, etc.)
- Renaming API endpoints (`/api/assistant/*`)
- Renaming the `"assistant"` permission key
- Renaming WebSocket event names (`assistant_thinking`, etc.)
- Any backend changes
