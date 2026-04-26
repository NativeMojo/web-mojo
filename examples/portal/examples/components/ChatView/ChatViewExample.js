import { Page, ChatView } from 'web-mojo';

/**
 * ChatViewExample — canonical demo of the ChatView component.
 *
 * Doc:    docs/web-mojo/components/ChatView.md
 * Route:  components/chat-view
 *
 * Shows the three pieces that make up a chat surface:
 *
 *   1. ChatView         — the container (messages list + composer slot).
 *   2. ChatMessageView  — one bubble per message (theme: 'compact' or 'bubbles').
 *   3. ChatInputView    — the composer (textarea + Send, Enter-to-send).
 *
 * Wiring is via an `adapter`:
 *
 *     adapter.fetch()             returns the seed thread
 *     adapter.addNote({ text })   handles each user submission
 *
 * This demo uses an in-memory adapter — no backend. After the user sends,
 * we synthesize an assistant reply 600ms later to show the typical
 * request/response round-trip pattern. Replace the adapter with a REST or
 * WebSocket-backed implementation in production.
 *
 * Auto-scroll is built in (`chatView.scrollToBottom()`); ChatView calls it
 * on mount and on every `addMessage()`.
 */
class ChatViewExample extends Page {
    static pageName = 'components/chat-view';
    static route = 'components/chat-view';

    constructor(options = {}) {
        super({
            ...options,
            pageName: ChatViewExample.pageName,
            route: ChatViewExample.route,
            title: 'ChatView — chat thread + composer',
            template: ChatViewExample.TEMPLATE,
        });

        this.currentUserId = 1;
        this._replyCounter = 0;
        this._seed = ChatViewExample._buildSeedThread();
    }

    async onInit() {
        await super.onInit();

        this.chatView = new ChatView({
            containerId: 'chat-slot',
            theme: 'bubbles',
            currentUserId: this.currentUserId,
            inputPlaceholder: 'Type a message and press Enter...',
            inputButtonText: 'Send',
            showFileInput: false,
            adapter: this._createAdapter(),
        });
        this.addChild(this.chatView);
    }

    /**
     * Adapter wires ChatView to a data source. Two methods:
     *  - fetch(): return seed messages on first render.
     *  - addNote({ text }): persist a user message; ChatView re-fetches and
     *    appends any new entries. We schedule a fake assistant reply here.
     */
    _createAdapter() {
        return {
            fetch: async () => this._seed.slice(),
            addNote: async ({ text }) => {
                const userMsg = {
                    id: `local-${Date.now()}`,
                    role: 'user',
                    author: { id: this.currentUserId, name: 'You' },
                    content: text,
                    timestamp: new Date().toISOString(),
                };
                this._seed.push(userMsg);

                // Simulated reply — 600ms round-trip with a thinking indicator.
                this.chatView.showThinking('Thinking...');
                setTimeout(() => {
                    if (!this.isActive) return;
                    this.chatView.hideThinking();
                    const reply = {
                        id: `reply-${++this._replyCounter}`,
                        role: 'assistant',
                        author: { name: 'Assistant' },
                        content: ChatViewExample._fakeReply(text),
                        timestamp: new Date().toISOString(),
                    };
                    this._seed.push(reply);
                    this.chatView.addMessage(reply);
                }, 600);

                return { success: true };
            },
        };
    }

    /**
     * Build a 6-message seed thread, alternating user / assistant.
     */
    static _buildSeedThread() {
        const now = Date.now();
        const at = (minsAgo) => new Date(now - minsAgo * 60_000).toISOString();
        const user = { id: 1, name: 'You' };
        const bot = { name: 'Assistant' };
        return [
            { id: 's1', role: 'user', author: user, content: 'Hey — can you help me draft a release note?', timestamp: at(8) },
            { id: 's2', role: 'assistant', author: bot, content: 'Of course. What shipped in this release?', timestamp: at(7) },
            { id: 's3', role: 'user', author: user, content: 'New ChatView component plus a portal example.', timestamp: at(6) },
            { id: 's4', role: 'assistant', author: bot, content: 'Nice. One-line pitch: "ChatView lands in web-mojo — a drop-in chat surface backed by a swappable adapter."', timestamp: at(5) },
            { id: 's5', role: 'user', author: user, content: 'Perfect. Anything to call out for users?', timestamp: at(4) },
            { id: 's6', role: 'assistant', author: bot, content: 'Two themes (`compact`, `bubbles`), Enter-to-send, and auto-scroll out of the box.', timestamp: at(3) },
        ];
    }

    /**
     * Synthesize a canned assistant reply. Echoes the input so the demo
     * shows the round-trip clearly without needing a real LLM.
     */
    static _fakeReply(text) {
        const trimmed = text.trim();
        if (!trimmed) return 'Got it.';
        if (trimmed.endsWith('?')) {
            return `Good question. In a real app I would call your backend here — for now, this is a canned reply about: "${trimmed}"`;
        }
        return `Thanks — noted: "${trimmed}". Replace this adapter with REST or WebSocket calls to wire it up for real.`;
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>ChatView</h1>
            <p class="example-summary">
                Chat surface with a message list and composer. Bound to a swappable adapter
                (<code>fetch()</code> + <code>addNote()</code>) so the same component works
                against REST, WebSocket, or in-memory data.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="#" data-action="open-doc" data-doc="docs/web-mojo/components/ChatView.md">
                    docs/web-mojo/components/ChatView.md
                </a>
            </p>

            <div class="card">
                <div class="card-body">
                    <p class="text-muted mb-3">
                        Type below and press <kbd>Enter</kbd> (or click <strong>Send</strong>).
                        Your message appears immediately; a synthetic assistant reply lands
                        ~600ms later. Scroll position auto-tracks the latest bubble.
                    </p>
                    <div data-container="chat-slot" style="height: 480px;"></div>
                </div>
            </div>
        </div>
    `;
}

export default ChatViewExample;
