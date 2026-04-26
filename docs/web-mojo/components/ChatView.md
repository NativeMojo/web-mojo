# ChatView

**ChatView** is a turnkey chat interface — a scrolling messages area plus an optional composer with file-drop support. It pairs with two child views, [`ChatMessageView`](#chatmessageview) (a single bubble/row) and [`ChatInputView`](#chatinputview) (the composer), and reads its data through a small **adapter** object you supply. All three classes are exported from `web-mojo`.

> **When to use ChatView vs [ListView](ListView.md):**
> Use `ChatView` for conversational UIs (incident history, comment threads, AI assistants, support chat) where messages have authors, timestamps, attachments, and a "scroll to latest" axis. Use `ListView` for ordered records without conversational semantics.

The canonical real-world subclass pattern lives in `src/extensions/admin/assistant/AssistantMessageView.js` — when you need rich, structured-block messages (table / chart / stat / progress) **subclass `ChatMessageView` and follow that file's shape**.

---

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [The Adapter Contract](#the-adapter-contract)
- [Message Shape](#message-shape)
- [ChatView API](#chatview-api)
- [ChatMessageView API](#chatmessageview-api)
- [ChatInputView API](#chatinputview-api)
- [Common Patterns](#common-patterns)
- [Common Pitfalls](#common-pitfalls)
- [Related Documentation](#related-documentation)

---

## Overview

The trio collaborates like this:

```
┌──────────────────────────────────────────────────────────────┐
│ ChatView                                                     │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ chat-messages  (scroll container)                    │    │
│  │   ChatMessageView · ChatMessageView · …              │    │
│  │   (one per message, kept alive across re-renders)    │    │
│  └──────────────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ ChatInputView  (textarea + send button + drop zone)  │    │
│  │   emits 'message:send' → ChatView.handleSendMessage()│    │
│  └──────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
       ▲                                          │
       │  fetch() returns []                      │  addNote({text, files})
       │                                          ▼
                       Adapter (yours)
            (REST / WebSocket / in-memory / mock)
```

Key facts:

- **You own the data layer.** ChatView never talks to REST directly — it calls `adapter.fetch()` once on init and `adapter.addNote(data)` whenever the user sends. Where those go (a `Collection`, a WebSocket frame, an in-memory array) is your decision.
- **Two themes:** `'compact'` (admin / activity feed style — avatars on the left, timestamps inline) and `'bubbles'` (modern chat with left/right alignment based on `currentUserId`).
- **Auto-scroll** to bottom on initial render, on every new message added through `addMessage()`, and on `showThinking()`.
- **Per-visit work belongs in `onEnter()`** when ChatView is hosted inside a [Page](../pages/Page.md) — pages are cached and `onInit()` only runs once.

---

## Quick Start

```js
import { ChatView } from 'web-mojo';

class MyAdapter {
    async fetch() {
        // Return an array of message objects (see "Message Shape" below)
        return [
            {
                id: 1,
                author: { id: 7, name: 'Alice', avatarUrl: '/img/alice.png' },
                content: 'Hello world',
                timestamp: '2026-04-25T14:30:00Z',
            },
        ];
    }

    async addNote({ text, files }) {
        // Persist the note. Resolve { success: true } on success.
        await fetch('/api/comments', {
            method: 'POST',
            body: JSON.stringify({ text, file_id: files?.[0]?.id }),
        });
        return { success: true };
    }
}

const chat = new ChatView({
    adapter: new MyAdapter(),
    theme: 'bubbles',
    currentUserId: 7,
    inputPlaceholder: 'Add a comment…',
    inputButtonText: 'Send',
});

// Mount via containerId in a parent's template (preferred):
this.addChild(chat);

// …or render directly:
await chat.render(true, document.getElementById('chat-host'));
```

> **Sizing:** ChatView uses `flex` + `overflow-y: auto` on the messages area. Wrap it in a parent with a bounded height (e.g. `max-height: 70vh`) so the messages area scrolls instead of growing the page. See the [bounded-height pitfall](#-no-bounded-height-on-the-chatview-container).

---

## The Adapter Contract

ChatView calls exactly two methods on `options.adapter`:

| Method | Called when | Must return |
|---|---|---|
| `adapter.fetch()` | Once during `onInit()`; again on `chat.refresh()` | `Promise<Message[]>` — array of [message objects](#message-shape) |
| `adapter.addNote({ text, files })` | After the user clicks Send (or presses Enter) in `ChatInputView` | `Promise<{ success: boolean }>` — ChatView throws if `success` is falsy |

A minimal in-memory adapter:

```js
class InMemoryAdapter {
    constructor() { this._messages = []; this._nextId = 1; }
    async fetch() { return this._messages.slice(); }
    async addNote({ text, files }) {
        this._messages.push({
            id: this._nextId++,
            author: { id: 1, name: 'You' },
            content: text,
            timestamp: new Date().toISOString(),
            attachments: files,
        });
        return { success: true };
    }
}
```

> **Send semantics:** if the user types text **and** drops files, ChatView calls `addNote()` once with both, then calls `addNote()` again **per additional file** (each with empty text). If they only attach files, each file is sent as its own note. This is intentional — most servers model attachments per-message.

---

## Message Shape

Each object returned by `adapter.fetch()` (or passed to `chat.addMessage()`) should look like:

```js
{
    id:        'unique-string-or-number',  // ✅ required — used as the dedup key
    role:      'user' | 'assistant',        // optional; drives extra CSS classes
    author: {
        id:        7,                       // compared against currentUserId for left/right alignment
        name:      'Alice',
        avatarUrl: '/img/alice.png',        // optional; falls back to {{name|initials}}
    },
    content:   'Hello world',               // string; rendered with {{{ }}} so HTML is trusted
    timestamp: '2026-04-25T14:30:00Z',      // ISO string; rendered with the |relative formatter
    attachments: [/* File objects */],      // optional; FilePreviewView is rendered per attachment
    tool_calls:  [/* {name, status} */],    // optional; collapsible badge row
    type:        'system_event',            // optional; renders a centered muted line instead
}
```

> **Trusted HTML:** the bubble template uses `{{{message.content}}}`, so whatever you put in `content` is **not** escaped. If `content` originates from user input, sanitize or render it server-side first (see the `IncidentHistoryAdapter` pattern, which calls `/api/docit/render` for markdown → safe HTML).

---

## ChatView API

### Constructor Options

```js
new ChatView({
    adapter,                  // ✅ required — see "Adapter Contract"
    theme,                    // 'compact' (default) or 'bubbles'
    currentUserId,            // optional — used to mark "you" and align bubbles
    inputPlaceholder,         // textarea placeholder (default: 'Type a message...')
    inputButtonText,          // send button text (default: 'Send')
    showInput,                // false → omit the composer entirely (read-only feed)
    showFileInput,            // false → hide the "drag & drop files" footer hint
    messageViewClass,         // class — your subclass of ChatMessageView (default: ChatMessageView)
    // …plus any standard View options (className, containerId, model, …)
})
```

| Option | Type | Default | Description |
|---|---|---|---|
| `adapter` | `object` | — | ✅ Required. Object with `fetch()` and `addNote()` methods. |
| `theme` | `'compact' \| 'bubbles'` | `'compact'` | Visual style of message rows. |
| `currentUserId` | `string \| number` | — | When set, messages with `author.id === currentUserId` are flagged as the current user — drives right-alignment in `'bubbles'` and the "You" badge in `'compact'`. |
| `inputPlaceholder` | `string` | `'Type a message...'` | Forwarded to `ChatInputView`. |
| `inputButtonText` | `string` | `'Send'` | Forwarded to `ChatInputView`. |
| `showInput` | `boolean` | `true` | When `false`, no `ChatInputView` is created and no input container is rendered — useful when you supply your own composer (see [AssistantView](#streaming-via-websocket-assistantview-pattern)). |
| `showFileInput` | `boolean` | `true` | When `false`, hides the drop-zone footer. File drop on the input area still works unless this is also forwarded to `ChatInputView`. |
| `messageViewClass` | `class` | `ChatMessageView` | Constructor used to instantiate each message row. **This is the canonical extension hook** — subclass `ChatMessageView` and pass your class here. |

### Instance Methods

#### `addMessage(message, scroll = true)`

Append a new message to the chat. Idempotent — if a message with the same `id` already has a view, it's a no-op. Used both by `handleSendMessage()` and by external callers receiving WebSocket pushes.

```js
chat.addMessage({
    id: `incoming-${Date.now()}`,
    role: 'assistant',
    author: { name: 'Assistant' },
    content: 'On it!',
    timestamp: new Date().toISOString(),
});
```

#### `clearMessages()`

Destroy every `ChatMessageView`, drop the in-memory message array, and empty the messages container. Use before re-fetching for a different conversation.

#### `refresh()`

`clearMessages()` + re-fetch via `adapter.fetch()` + re-render. Useful after switching the active record or conversation.

#### `showThinking(text = 'Thinking...')` / `hideThinking()`

Show or remove an animated three-dot indicator at the bottom of the messages area. The indicator includes a live elapsed-time counter. Calling `showThinking()` again updates the text in place. Always pair `hideThinking()` after the response arrives.

```js
chat.showThinking('Calling tool: search_users…');
// …response arrives over WS
chat.hideThinking();
```

#### `setInputEnabled(enabled)`

Convenience pass-through to `inputView.setEnabled()`. Disables the textarea and send button when `false`. Use during in-flight requests to prevent duplicate sends.

#### `scrollToBottom()`

Scroll the messages container to its last message. Called automatically on initial render, on `addMessage()`, and on `showThinking()`. Use `requestAnimationFrame` internally so it's safe to call before the DOM has settled.

### Events

`ChatView` does **not** emit events itself. The composer (`ChatInputView`) emits `'message:send'` which ChatView consumes internally — listen there if you need to observe sends.

---

## ChatMessageView API

A single message row. ChatView creates one per message via `messageViewClass` (defaults to this class). You normally **don't** instantiate it directly — you subclass it.

### Constructor Options

| Option | Type | Description |
|---|---|---|
| `message` | `object` | The [message object](#message-shape). |
| `theme` | `'compact' \| 'bubbles'` | Inherited from the parent ChatView. |
| `isCurrentUser` | `boolean` | Pre-computed by ChatView from `author.id === currentUserId`. |

### Templates

Two built-in templates are picked at render time:

- **Compact:** avatar + author + relative time + content + attachments. Avatars use `{{message.author.avatarUrl}}` if present, otherwise `{{message.author.name|initials}}`.
- **Bubbles:** "Author · time" header, then a colored bubble. Right/left position toggled by `isCurrentUser`.

Both templates render content via `{{{message.content}}}` (trusted) and use the `|relative` formatter for the timestamp.

System events (`message.type === 'system_event'`) bypass theme entirely and render as a muted, centered line with an info icon.

### Subclassing — the AssistantMessageView Pattern (Canonical)

To render anything richer than text + attachments — tables, charts, stats, progress trackers, action buttons — **subclass `ChatMessageView` and use `onAfterRender()` to inject child views into the `data-container="blocks-…"` element that the base template already provides**. The reference implementation is `AssistantMessageView`:

```js
import { ChatMessageView } from 'web-mojo';

class StatsMessageView extends ChatMessageView {
    async onAfterRender() {
        await super.onAfterRender();          // ← runs attachment rendering

        if (!this.message.blocks?.length) return;

        const blocks = this.element.querySelector(
            `[data-container="blocks-${this.message.id || this.id}"]`
        );
        if (!blocks) return;

        for (const block of this.message.blocks) {
            if (block.type === 'stat') {
                const card = document.createElement('div');
                card.className = 'card p-2 mb-2';
                card.innerHTML = `<strong>${block.label}</strong>: ${block.value}`;
                blocks.appendChild(card);
            }
            // …handle other block.type values (table, chart, alert, progress, …)
        }
    }
}

const chat = new ChatView({
    adapter,
    messageViewClass: StatsMessageView,   // ← plugs your subclass into the trio
});
```

Every block type the production assistant supports — `table`, `chart`, `stat`, `action`, `list`, `alert`, `progress`, `file` — uses this same hook. Read `src/extensions/admin/assistant/AssistantMessageView.js` end to end before adding your own block types.

---

## ChatInputView API

The composer. ChatView creates one when `showInput` is `true` (the default). Standalone use is rare — most apps either let ChatView manage it, or replace it with a custom composer (set `showInput: false` and build your own — see the [AssistantView pattern](#streaming-via-websocket-assistantview-pattern)).

### Constructor Options

| Option | Type | Default | Description |
|---|---|---|---|
| `placeholder` | `string` | `'Type a message...'` | Textarea placeholder. |
| `buttonText` | `string` | `'Send'` | Currently unused by the template (button is icon-only) — reserved for theme variants. |
| `showFileInput` | `boolean` | `true` | When `false`, hides the "Drag & drop files" footer hint and disables the file-drop zone. |

### Behavior

- **Send-on-Enter:** `Enter` sends, `Shift+Enter` inserts a newline. Empty messages with no attachments are silently dropped.
- **Auto-resize textarea:** grows up to 150px tall as the user types.
- **File drop:** the entire input container is a drop zone (when `showFileInput` is true). Each dropped file is uploaded immediately via the framework `File` model — a progress bar shows while uploading, then the attachment chip stays in the composer until send.
- **Busy state:** while a send is in flight, the button shows a spinner and is disabled. ChatView clears this automatically by calling `clearInput()` after a successful send (or `setBusy(false)` on error).
- **Pending uploads block sending:** if an upload is in progress when the user presses Send, the send is silently ignored (the user just waits for the upload to finish).

### Events

| Event | Payload | When |
|---|---|---|
| `message:send` | `{ text: string, files: Array<{id, name, uploadId}> }` | User presses Enter or clicks Send. |

ChatView listens for this internally and calls `adapter.addNote()`.

### Methods

- `setBusy(busy)` — toggle the spinner. Called by ChatView during sends.
- `setEnabled(enabled)` — disable/enable both textarea and button. Called by `ChatView.setInputEnabled()`.
- `clearInput()` — empty the textarea, clear attachments, reset busy state.

---

## Common Patterns

### Read-only history feed (IncidentView pattern)

Pass `showInput: false` to drop the composer entirely. `IncidentView` does this for the History section, then mounts the ChatView inside a [SideNavView](SideNavView.md) section.

```js
import { ChatView, SideNavView } from 'web-mojo';

const historySection = new ChatView({
    adapter: new IncidentHistoryAdapter(this.model.get('id')),
    theme: 'compact',
    showInput: false,            // ← read-only timeline
});

new SideNavView({
    sections: [
        { key: 'history', label: 'History', icon: 'bi-chat-left-text', view: historySection },
    ],
});
```

Inside the adapter, `addNote()` can simply throw or return `{ success: false }` — it'll never be called.

### Streaming via WebSocket (AssistantView pattern)

For LLM-style streaming where the server pushes thinking → tool_call → response events, **use your own composer** (`showInput: false`) and feed the chat by calling `addMessage()` from your WebSocket handlers. This is the shape `AssistantView` uses verbatim.

```js
import { ChatView } from 'web-mojo';

class StreamingChatHost extends View {
    async onInit() {
        this.chatView = new ChatView({
            containerId: 'chat-area',
            adapter: this._buildAdapter(),
            messageViewClass: AssistantMessageView,
            showInput: false,                  // ← we own the input
        });
        this.addChild(this.chatView);

        // Wire WS streams
        this.app.ws.on('message:assistant_thinking', () => {
            this.chatView.showThinking('Thinking…');
        });
        this.app.ws.on('message:assistant_tool_call', (d) => {
            this.chatView.showThinking(`Using ${d.tool}…`);
        });
        this.app.ws.on('message:assistant_response', (d) => {
            this.chatView.hideThinking();
            this.chatView.addMessage({
                id:        d.message_id,
                role:      'assistant',
                author:    { name: 'Assistant' },
                content:   d.response,
                blocks:    d.blocks || [],
                timestamp: new Date().toISOString(),
            });
        });
    }
}
```

Read `src/extensions/admin/assistant/AssistantView.js` for the full pattern, including disconnected/reconnecting state, abort, and timeout handling.

### Confirming send via Dialog

Wrap your adapter's `addNote()` so it confirms before posting destructive messages. Because the adapter is just an object you pass in, no ChatView change is needed.

```js
import { ChatView, Modal } from 'web-mojo';

const adapter = {
    fetch: () => api.list(),
    addNote: async (data) => {
        const ok = await Modal.confirm('Post this comment publicly?');
        if (!ok) return { success: false };  // ChatView treats this as failure
        return api.post(data);
    },
};

new ChatView({ adapter });
```

### Per-visit refresh on a [Page](../pages/Page.md)

Pages are cached, so `onInit()` only runs the first time. Refresh on every visit by calling `chat.refresh()` from `onEnter()` — never from `onInit()` if you want it to re-fetch.

```js
class IncidentHistoryPage extends Page {
    async onInit() {
        this.chat = new ChatView({ containerId: 'chat-host', adapter: this.adapter });
        this.addChild(this.chat);
    }

    async onEnter() {
        await this.chat.refresh();          // re-fetch each time the page is visited
    }
}
```

---

## Common Pitfalls

### ⚠️ No bounded height on the ChatView container

`chat-messages` uses `overflow-y: auto`. Without a height ceiling on a parent, content grows the page instead of scrolling, and `scrollToBottom()` becomes a no-op.

```html
<!-- ❌ WRONG — chat grows the page indefinitely -->
<div data-container="chat-host"></div>

<!-- ✅ CORRECT — bounded so the messages area scrolls -->
<div data-container="chat-host" class="d-flex flex-column"
     style="min-height: 400px; max-height: 70vh;"></div>
```

### ⚠️ Forgetting `id` on messages

ChatView keys every `ChatMessageView` by `message.id`. Messages without a unique `id` collide, get deduped, or never re-render after edits.

```js
// ❌ WRONG — no id, every message after the first is dropped silently
chat.addMessage({ author, content: 'hi', timestamp });

// ✅ CORRECT
chat.addMessage({ id: `msg-${Date.now()}`, author, content: 'hi', timestamp });
```

### ⚠️ Putting `data-action` on the textarea / form

The composer is a textarea, not a form, but the same standard MOJO rule applies: `data-action` belongs on a `<button type="button">`. The send button already has `data-action="send-message"` — don't duplicate it on the textarea or wrap the composer in a `<form data-action="…">`.

```html
<!-- ❌ WRONG -->
<form data-action="send-message">
    <textarea data-action="send-message"></textarea>
</form>

<!-- ✅ CORRECT — let ChatInputView handle send via Enter + button -->
<!-- (this is what the built-in template already does) -->
```

### ⚠️ Calling `render()` / `mount()` on child message views

ChatView creates and mounts each `ChatMessageView` itself in `_renderChildren()`. Calling `render()` or `mount()` yourself on a message view causes duplicate DOM and orphaned children.

```js
// ❌ WRONG
const msgView = new ChatMessageView({ message });
await msgView.render(true, container);
chat.addMessage(message);                // ChatView re-creates and remounts

// ✅ CORRECT — just let ChatView do it
chat.addMessage(message);
```

### ⚠️ Trusting unsanitized `content`

Both built-in templates render `{{{message.content}}}` — triple braces, no escaping. If your adapter returns user-typed text directly, it becomes an XSS vector.

```js
// ❌ WRONG — user input goes straight to {{{ }}} (HTML injection)
async addNote({ text }) {
    return { success: true, content: text };
}

// ✅ CORRECT — escape, or render markdown server-side
async _renderMarkdown(markdown) {
    const resp = await rest.post('/api/docit/render', { markdown });
    return resp?.data?.data?.html;     // server-rendered, sanitized HTML
}
```

### ⚠️ Fetching in `onAfterRender()` of a `ChatMessageView` subclass

`onAfterRender()` runs on every re-render. Use `onInit()` for one-time setup and the existing `data-container="blocks-…"` hook for per-message rendering — same pattern `AssistantMessageView` follows.

### ⚠️ Reusing one `ChatView` across multiple conversations without `clearMessages()` / `refresh()`

ChatView caches `messageViews` by id. Switching the active conversation without calling `clearMessages()` first leaves stale rows from the previous conversation visible.

```js
// ❌ WRONG — messages from conversation A still appear under B
this.chatView.adapter = adapterB;

// ✅ CORRECT — clear, swap adapter, refresh
this.chatView.adapter = adapterB;
await this.chatView.refresh();
```

### ⚠️ Using `theme: 'bubbles'` without setting `currentUserId`

Bubbles theme alignment depends on `currentUserId` matching `message.author.id`. Without it, every message is treated as "not me" and renders left-aligned.

```js
// ❌ WRONG — no left/right separation
new ChatView({ adapter, theme: 'bubbles' });

// ✅ CORRECT
new ChatView({ adapter, theme: 'bubbles', currentUserId: app.activeUser.id });
```

---

## Related Documentation

- **[View](../core/View.md)** — base class for `ChatView`, `ChatMessageView`, and `ChatInputView`
- **[Page](../pages/Page.md)** — host pattern: per-visit `onEnter()` for `chat.refresh()`
- **[SideNavView](SideNavView.md)** — common host (incident History tab, ticket conversation tab)
- **[Modal](Modal.md)** — show ChatView in a fullscreen modal (assistant pattern)
- **[Templates](../core/Templates.md)** — `|relative`, `|initials`, `{{{ }}}`, the rules behind the message templates
- **[WebSocketClient](../services/WebSocketClient.md)** — streaming responses via `chat.addMessage()` from WS events
- **[Built-in Models](../models/BuiltinModels.md)** — `IncidentHistory`, `File` — common adapter backers

## Examples

<!-- examples:cross-link begin -->

Runnable, copy-paste reference in the examples portal:

- [`examples/portal/examples/components/ChatView/ChatViewExample.js`](../../../examples/portal/examples/components/ChatView/ChatViewExample.js) — Chat thread with composer — ChatView + ChatMessageView + ChatInputView.

<!-- examples:cross-link end -->
