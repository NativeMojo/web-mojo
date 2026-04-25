import { Page, WebSocketClient } from 'web-mojo';

/**
 * WebSocketClientExample — canonical demo of WebSocketClient.
 *
 * Doc:    docs/web-mojo/services/WebSocketClient.md
 * Route:  services/web-socket-client
 *
 * WebSocketClient wraps the browser WebSocket with auto-reconnect, heartbeat
 * ping/pong, token auth, and an EventEmitter API (`on/off/once`).
 *
 * What this shows:
 *   1. Construction with `WebSocketClient.deriveURL(restBaseURL)` — converts
 *      http(s) → ws(s) and appends the standard `/ws/realtime/` path.
 *   2. Lifecycle events — connected / disconnected / reconnecting /
 *      reconnect-failed / message:<type> / error.
 *   3. Manual connect/disconnect via Connect/Disconnect buttons.
 *   4. Heartbeat + reconnect tuning via constructor options.
 *
 * No-WS-server safety: this example never calls connect() until the user
 * clicks the button. If no WS endpoint is up, the client emits 'error' and
 * (with autoReconnect) tries to reconnect with exponential backoff — both
 * states are reflected in the status panel without crashing the page.
 */
class WebSocketClientExample extends Page {
    static pageName = 'services/web-socket-client';
    static route = 'services/web-socket-client';

    constructor(options = {}) {
        super({
            ...options,
            pageName: WebSocketClientExample.pageName,
            route: WebSocketClientExample.route,
            title: 'WebSocketClient — realtime client',
            template: WebSocketClientExample.TEMPLATE,
        });
        this.status = 'idle';
        this.eventLog = [];
        this.ws = null;
    }

    async onInit() {
        await super.onInit();
        const baseURL = this.getApp().rest?.config?.baseURL || 'http://localhost:9009';
        this.wsUrl = WebSocketClient.deriveURL(baseURL, '/ws/realtime/');

        // Construct (does NOT connect) — clicking Connect opens the socket.
        this.ws = new WebSocketClient({
            url: this.wsUrl,
            autoReconnect: true,
            maxReconnectAttempts: 3,
            reconnectInterval: 1500,
            reconnectBackoff: 2,
            pingInterval: 20000,
            pongTimeout: 5000,
        });

        this.ws.on('connected',        ()      => this._setStatus('connected', 'connected'));
        this.ws.on('disconnected',     (info)  => this._setStatus('disconnected', `disconnected (code ${info?.code})`));
        this.ws.on('reconnecting',     (info)  => this._setStatus('reconnecting', `reconnecting (attempt ${info.attempt}, ${info.delay}ms)`));
        this.ws.on('reconnect-failed', (info)  => this._setStatus('failed', `gave up after ${info.attempts} attempts`));
        this.ws.on('error',            ()      => this._setStatus('error', 'socket error'));
        this.ws.on('message',          (data)  => this._addEvent('message', JSON.stringify(data).slice(0, 80)));
    }

    _setStatus(state, label) {
        this.status = state;
        this._addEvent(state, label);
    }

    _addEvent(kind, text) {
        this.eventLog = [{ at: new Date().toLocaleTimeString(), kind, text }, ...this.eventLog].slice(0, 8);
        this.render();
    }

    async onActionConnect() {
        // Reset reconnect intent in case disconnect() set it false earlier.
        this.ws.shouldReconnect = true;
        try {
            await this.ws.connect();
        } catch (err) {
            this._setStatus('error', `connect failed: ${err.message || err}`);
        }
    }

    onActionDisconnect() {
        this.ws.disconnect(); // permanent — disables auto-reconnect.
        this._setStatus('idle', 'disconnect() called — auto-reconnect disabled');
    }

    onActionPing() {
        if (!this.ws.isConnected) return this._addEvent('warn', 'not connected');
        this.ws.send({ type: 'subscribe', channel: 'demo' });
        this._addEvent('send', '{ type: "subscribe", channel: "demo" }');
    }

    async onExit() {
        // Always tear the socket down when the page is hidden.
        if (this.ws?.isConnected) this.ws.disconnect();
        await super.onExit();
    }

    static TEMPLATE = `
        <div class="example-page">
            <h1>WebSocketClient</h1>
            <p class="example-summary">
                Realtime client with auto-reconnect, heartbeat ping/pong, and an EventEmitter API.
                Construct once; subscribe with <code>.on(event, fn)</code>.
            </p>
            <p class="example-docs-link">
                <i class="bi bi-book"></i>
                <a href="https://github.com/NativeMojo/web-mojo/blob/main/docs/web-mojo/services/WebSocketClient.md" target="_blank">
                    docs/web-mojo/services/WebSocketClient.md
                </a>
            </p>

            <div class="card mb-3"><div class="card-body">
                <h5 class="card-title">Connection</h5>
                <p class="small text-muted mb-1">Target URL (derived from REST baseURL):</p>
                <pre class="bg-light p-2 small mb-2"><code>{{wsUrl}}</code></pre>
                <p class="mb-2">Status: <span class="badge text-bg-secondary">{{status}}</span></p>
                <div class="d-flex flex-wrap gap-2">
                    <button class="btn btn-primary" data-action="connect"><i class="bi bi-plug"></i> Connect</button>
                    <button class="btn btn-outline-secondary" data-action="disconnect"><i class="bi bi-power"></i> Disconnect</button>
                    <button class="btn btn-outline-primary" data-action="ping"><i class="bi bi-send"></i> send subscribe</button>
                </div>
            </div></div>

            <div class="card"><div class="card-body">
                <h5 class="card-title">Event log</h5>
                <p class="small text-muted">
                    Without a WS endpoint at the URL above, you'll see <code>error</code>
                    and <code>reconnecting</code> entries — exactly how the client behaves
                    in production until the server comes back online.
                </p>
                {{^eventLog}}<p class="text-muted mb-0">No events yet — click Connect.</p>{{/eventLog}}
                <ul class="list-group">
                    {{#eventLog}}
                        <li class="list-group-item small">
                            <code>{{.at}}</code> · <strong>{{.kind}}</strong> · {{.text}}
                        </li>
                    {{/eventLog}}
                </ul>
            </div></div>
        </div>
    `;
}

export default WebSocketClientExample;
