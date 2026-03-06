/**
 * WebSocketClient - Robust, infinitely-resilient WebSocket client
 *
 * Features:
 * - Infinite auto-reconnect with capped exponential backoff + jitter (never gives up)
 * - Separate "intentional disconnect" flag so clean closes still reconnect
 * - Heartbeat ping/pong with timeout-driven force-reconnect
 * - Immediate reconnect nudge on browser visibility / window focus restore
 * - Optional integration with WebApp's browser:focus event bus
 * - Event-driven architecture using EventEmitter
 * - Token-based authentication
 *
 * Usage:
 *   const ws = new WebSocketClient({
 *     url: "wss://api.example.com/ws/realtime",
 *     tokenPrefix: "bearer",
 *     getToken: () => app.tokenManager.getToken(),
 *     app,  // optional – hooks into app.events 'browser:focus'
 *   });
 *
 *   ws.on('connected',    ()     => console.log('Connected!'));
 *   ws.on('message',      (data) => console.log('Received:', data));
 *   ws.on('reconnecting', ({attempt, delay}) => console.log(`Retry #${attempt} in ${delay}ms`));
 *   ws.connect();
 */

import EventEmitter from '@core/mixins/EventEmitter.js';

class WebSocketClient {
  constructor(options = {}) {
    // ── Connection ──────────────────────────────────────────────────────────
    this.url          = options.url;
    this.socket       = null;
    this.isConnected  = false;
    this.isConnecting = false;

    // ── Auth ────────────────────────────────────────────────────────────────
    this.getToken    = options.getToken   || null;
    this.tokenPrefix = options.tokenPrefix || 'bearer';

    // ── Reconnection ────────────────────────────────────────────────────────
    // `autoReconnect`          – master switch (default true)
    // `_intentionalDisconnect` – set only when the caller explicitly calls
    //                            disconnect(), so that clean server closes
    //                            (code 1000) are still retried automatically.
    this.autoReconnect         = options.autoReconnect !== false;
    this._intentionalDisconnect = false;

    this.reconnectInterval  = options.reconnectInterval  || 2000;   // base delay ms
    this.reconnectBackoff   = options.reconnectBackoff   || 1.5;    // multiplier
    this.maxReconnectDelay  = options.maxReconnectDelay  || 30000;  // hard cap ms
    this.reconnectJitter    = options.reconnectJitter    !== false; // ±20 % jitter
    this.reconnectAttempts  = 0;
    this.reconnectTimer     = null;

    // ── Heartbeat ────────────────────────────────────────────────────────────
    this.pingInterval = options.pingInterval || 30000;
    this.pongTimeout  = options.pongTimeout  || 10000;
    this.pingTimer    = null;
    this.pongTimer    = null;

    // ── Optional WebApp integration ──────────────────────────────────────────
    // Pass `app` to also hook into app.events 'browser:focus' in addition to
    // the native visibility / window focus events we listen to below.
    this._app = options.app || null;

    // ── Debug ────────────────────────────────────────────────────────────────
    this.debug = options.debug || false;

    // Bind handlers so they can be cleanly removed later
    this._onVisibilityChange = this._handleVisibilityChange.bind(this);
    this._onWindowFocus      = this._handleWindowFocus.bind(this);

    this._setupVisibilityHandlers();
    this._setupAppFocusHandler();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Public API
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Connect to the WebSocket server.
   * Safe to call multiple times – extra calls are no-ops when already
   * connected or connecting.
   */
  async connect(url = null) {
    if (url) this.url = url;
    if (!this.url) throw new Error('WebSocket URL is required');

    // Any explicit call to connect() resets the intentional-disconnect flag.
    this._intentionalDisconnect = false;

    if (this.isConnected || this.isConnecting) return;

    return this._doConnect();
  }

  /**
   * Permanently stop the client.  No further reconnect attempts are made
   * until connect() is called again.
   */
  disconnect() {
    this._intentionalDisconnect = true;
    this._clearTimers();

    if (this.socket) {
      this._log('Disconnecting (intentional)');
      this.socket.close(1000, 'Client disconnect');
      this.socket = null;
    }

    this.isConnected  = false;
    this.isConnecting = false;
  }

  /**
   * Send data.  Objects are auto-serialised to JSON.
   */
  send(data) {
    if (!this.isConnected || !this.socket) {
      throw new Error('WebSocket not connected');
    }

    const message = typeof data === 'string' ? data : JSON.stringify(data);
    this.socket.send(message);
    this._log('Sent:', message);
  }

  /**
   * Fully tear down the client, removing all DOM/app listeners.
   * Call this when the owning view/page is destroyed.
   */
  destroy() {
    this.disconnect();
    this._teardownVisibilityHandlers();
    this._teardownAppFocusHandler();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Connection internals
  // ═══════════════════════════════════════════════════════════════════════════

  _doConnect() {
    if (this.isConnected || this.isConnecting) return Promise.resolve();

    this.isConnecting = true;
    this._log('Connecting to:', this.url);

    return new Promise((resolve, reject) => {
      // `settled` ensures the promise is only resolved/rejected once even
      // though onerror and onclose can both fire on a failed connection.
      let settled = false;
      const settle = (fn, value) => {
        if (settled) return;
        settled = true;
        fn(value);
      };

      try {
        const socket = new WebSocket(this.url);
        this.socket  = socket;

        socket.onopen = () => {
          this._log('Connected');
          this.isConnected   = true;
          this.isConnecting  = false;
          this.reconnectAttempts = 0;

          this._authenticate();
          this._startHeartbeat();

          this.emit('connected');
          settle(resolve, undefined);
        };

        socket.onmessage = (event) => this._handleMessage(event);

        // onerror in browsers is always followed by onclose, so we let
        // _handleClose drive the reconnect to avoid double-scheduling.
        // We only use the error event to emit and to reject the initial
        // connect() promise if we haven't successfully opened yet.
        socket.onerror = (event) => {
          this._log('Socket error:', event);
          this.emit('error', event);

          if (!this.isConnected) {
            settle(reject, new Error('WebSocket connection failed'));
          }
        };

        // Pass the settle-reject so _handleClose can reject the promise when
        // the socket closes before we ever reached onopen.
        socket.onclose = (event) => this._handleClose(event, settle.bind(null, reject));

      } catch (error) {
        // Synchronous WebSocket constructor failure (bad URL, etc.)
        this.isConnecting = false;
        this.socket = null;
        settle(reject, error);
        this._scheduleReconnect();
      }
    });
  }

  _authenticate() {
    const token = this.getToken ? this.getToken() : null;
    if (!token) {
      console.warn('[WebSocket] No token available — skipping authentication');
      return;
    }

    this.send({ type: 'authenticate', token, prefix: this.tokenPrefix });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Event handlers
  // ═══════════════════════════════════════════════════════════════════════════

  _handleMessage(event) {
    this._log('Received:', event.data);

    let data;
    try {
      data = JSON.parse(event.data);
    } catch {
      data = event.data;
    }

    // Absorb pong heartbeat response
    if (data?.type === 'pong') {
      this._clearPongTimeout();
      return;
    }

    if (data?.type) {
      this.emit(`message:${data.type}`, data);
    }
    this.emit('message', data);
  }

  _handleClose(event, initialRejectFn) {
    this._log('Closed:', event.code, event.reason);

    const wasConnecting = this.isConnecting;

    this.isConnected  = false;
    this.isConnecting = false;
    this._clearTimers();
    this.socket = null;

    this.emit('disconnected', {
      code:     event.code,
      reason:   event.reason,
      wasClean: event.wasClean
    });

    // Reject the caller's connect() promise if we closed before onopen fired
    if (wasConnecting && typeof initialRejectFn === 'function') {
      initialRejectFn(new Error(`WebSocket closed before connecting (code ${event.code})`));
    }

    // Always reconnect unless the user explicitly called disconnect()
    if (!this._intentionalDisconnect && this.autoReconnect) {
      this._scheduleReconnect();
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Reconnect
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Schedule the next reconnect with capped exponential backoff + optional
   * jitter.  This is the single code path through which all retries are queued.
   */
  _scheduleReconnect() {
    if (this._intentionalDisconnect || !this.autoReconnect) return;

    // Guard against queuing a second timer while one is already pending
    if (this.reconnectTimer !== null) return;

    this.reconnectAttempts++;

    // Exponential backoff, hard-capped
    let delay = Math.min(
      this.reconnectInterval * Math.pow(this.reconnectBackoff, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    );

    // ±20 % jitter to avoid thundering-herd problems after server restarts
    if (this.reconnectJitter) {
      delay = delay * (0.8 + Math.random() * 0.4);
    }

    delay = Math.round(delay);

    this._log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    this.emit('reconnecting', { attempt: this.reconnectAttempts, delay });

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;

      if (this._intentionalDisconnect || !this.autoReconnect) return;

      this._doConnect().catch((err) => {
        this._log('Reconnect attempt failed:', err.message);
        // _handleClose already called _scheduleReconnect for us; if somehow it
        // didn't (e.g. synchronous throw path), make sure we still retry.
        if (this.reconnectTimer === null && !this._intentionalDisconnect) {
          this._scheduleReconnect();
        }
      });
    }, delay);
  }

  /**
   * Skip the remaining backoff wait and attempt a reconnect right away.
   * Called when the browser regains visibility or focus so we don't leave
   * the user sitting at the max-delay cap after waking a laptop or switching
   * back to the tab.
   */
  _nudgeReconnect() {
    if (this._intentionalDisconnect || !this.autoReconnect) return;
    if (this.isConnected || this.isConnecting) return;

    this._log('Focus/visibility restored — nudging reconnect immediately');

    // Cancel the pending backoff timer; we're going now
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Small grace period (200 ms) to let the network stack wake up before
    // we try to open the socket.
    setTimeout(() => {
      if (this._intentionalDisconnect || this.isConnected || this.isConnecting) return;

      // Don't inflate the attempts counter for a nudge — treat it as
      // retrying the current attempt rather than starting a new one.
      const savedAttempts = this.reconnectAttempts;
      this._doConnect().catch((err) => {
        this._log('Nudge reconnect failed:', err.message);
        // Restore attempt count so backoff calculation stays consistent
        this.reconnectAttempts = savedAttempts;
      });
    }, 200);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Heartbeat
  // ═══════════════════════════════════════════════════════════════════════════

  _startHeartbeat() {
    if (!this.pingInterval) return;

    this.pingTimer = setInterval(() => {
      if (!this.isConnected) return;
      try {
        this.send({ action: 'ping' });
        this._startPongTimeout();
      } catch (err) {
        this._log('Ping send failed:', err.message);
      }
    }, this.pingInterval);
  }

  _startPongTimeout() {
    this._clearPongTimeout();

    this.pongTimer = setTimeout(() => {
      console.warn('[WebSocket] Pong timeout — forcing reconnect');
      this.emit('pong-timeout');
      if (this.socket) {
        // Non-1000 code so _handleClose knows this was not an intentional close
        this.socket.close(4001, 'Pong timeout');
      }
    }, this.pongTimeout);
  }

  _clearPongTimeout() {
    if (this.pongTimer !== null) {
      clearTimeout(this.pongTimer);
      this.pongTimer = null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Timer cleanup
  // ═══════════════════════════════════════════════════════════════════════════

  _clearTimers() {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.pingTimer !== null) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    this._clearPongTimeout();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Visibility / focus integration
  // ═══════════════════════════════════════════════════════════════════════════

  _setupVisibilityHandlers() {
    if (typeof document === 'undefined') return;
    document.addEventListener('visibilitychange', this._onVisibilityChange);
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', this._onWindowFocus);
    }
  }

  _teardownVisibilityHandlers() {
    if (typeof document === 'undefined') return;
    document.removeEventListener('visibilitychange', this._onVisibilityChange);
    if (typeof window !== 'undefined') {
      window.removeEventListener('focus', this._onWindowFocus);
    }
  }

  _handleVisibilityChange() {
    if (!document.hidden) {
      this._nudgeReconnect();
    }
  }

  _handleWindowFocus() {
    this._nudgeReconnect();
  }

  /**
   * Hook into a WebApp instance's unified event bus so that PortalApp's
   * existing browser:focus handling also triggers a reconnect nudge.
   * This is intentionally additive — the native DOM listeners above already
   * cover the common cases; the app bus is a belt-and-suspenders extra.
   */
  _setupAppFocusHandler() {
    if (!this._app?.events) return;
    this._appFocusHandler = () => this._nudgeReconnect();
    this._app.events.on('browser:focus', this._appFocusHandler);
  }

  _teardownAppFocusHandler() {
    if (!this._app?.events || !this._appFocusHandler) return;
    this._app.events.off('browser:focus', this._appFocusHandler);
    this._appFocusHandler = null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Logging
  // ═══════════════════════════════════════════════════════════════════════════

  _log(...args) {
    if (this.debug) {
      console.log('[WebSocket]', ...args);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Static helpers
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Convert a REST API base URL to a WebSocket URL.
   *
   * @param {string} baseURL - REST base URL (http / https)
   * @param {string} path    - WebSocket path  (default: '/ws/realtime/')
   * @returns {string}         WebSocket URL   (ws / wss)
   *
   * @example
   * WebSocketClient.deriveURL('https://api.example.com', '/ws/realtime')
   * // → 'wss://api.example.com/ws/realtime'
   *
   * WebSocketClient.deriveURL('http://localhost:3000')
   * // → 'ws://localhost:3000/ws/realtime/'
   */
  static deriveURL(baseURL, path = '/ws/realtime/') {
    if (!baseURL) throw new Error('baseURL is required');
    const url      = new URL(baseURL);
    url.protocol   = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.pathname   = path.startsWith('/') ? path : `/${path}`;
    return url.toString();
  }
}

// Mix in EventEmitter (adds on / off / emit / once)
Object.assign(WebSocketClient.prototype, EventEmitter);

export default WebSocketClient;