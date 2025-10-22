/**
 * WebSocketClient - Simple, robust WebSocket client with auto-reconnect
 *
 * Features:
 * - Auto-reconnect with exponential backoff
 * - Heartbeat ping/pong with timeout disconnect
 * - Event-driven architecture using EventEmitter
 * - Token-based authentication
 *
 * Usage:
 *   const ws = new WebSocketClient({
 *     url: "wss://api.example.com/ws/realtime",
 *     tokenPrefix: "bearer",
 *     getToken: () => app.tokenManager.getToken()
 *   });
 *
 *   ws.on('connected', () => console.log('Connected!'));
 *   ws.on('message', (data) => console.log('Received:', data));
 *   ws.connect();
 */

import EventEmitter from '@core/mixins/EventEmitter.js';

class WebSocketClient {
  constructor(options = {}) {
    // Connection
    this.url = options.url;
    this.socket = null;
    this.isConnected = false;
    this.isConnecting = false;

    // Auth
    this.getToken = options.getToken || null;
    this.tokenPrefix = options.tokenPrefix || 'bearer';

    // Reconnection
    this.shouldReconnect = options.autoReconnect !== false;
    this.maxReconnectAttempts = options.maxReconnectAttempts || Infinity;
    this.reconnectInterval = options.reconnectInterval || 3000;
    this.reconnectBackoff = options.reconnectBackoff || 1.5;
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;

    // Heartbeat
    this.pingInterval = options.pingInterval || 30000;
    this.pongTimeout = options.pongTimeout || 5000;
    this.pingTimer = null;
    this.pongTimer = null;

    // Debug
    this.debug = options.debug || false;
  }

  /**
   * Connect to WebSocket server
   */
  async connect(url = null) {
    if (url) this.url = url;
    if (!this.url) throw new Error('WebSocket URL is required');
    if (this.isConnected || this.isConnecting) return;

    this.isConnecting = true;
    this._log('Connecting to:', this.url);

    return new Promise((resolve, reject) => {
      try {
        this.socket = new WebSocket(this.url);

        this.socket.onopen = () => {
          this._log('Connected');
          this.isConnected = true;
          this.isConnecting = false;
          this.reconnectAttempts = 0;

          this._authenticate();
          this._startHeartbeat();

          this.emit('connected');
          resolve();
        };

        this.socket.onmessage = (event) => this._handleMessage(event);
        this.socket.onerror = (event) => this._handleError(event, reject);
        this.socket.onclose = (event) => this._handleClose(event);

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    this.shouldReconnect = false;
    this._clearTimers();

    if (this.socket) {
      this._log('Disconnecting');
      this.socket.close(1000, 'Client disconnect');
    }
  }

  /**
   * Send data (auto-stringifies objects)
   */
  send(data) {
    if (!this.isConnected) {
      throw new Error('WebSocket not connected');
    }

    const message = typeof data === 'string' ? data : JSON.stringify(data);
    this.socket.send(message);
    this._log('Sent:', message);
  }

  // Private methods

  _authenticate() {
    const token = this.getToken ? this.getToken() : null;
    if (!token) {
      console.warn('[WebSocket] No token available');
      return;
    }

    this.send({
      type: 'authenticate',
      token,
      prefix: this.tokenPrefix
    });
  }

  _handleMessage(event) {
    this._log('Received:', event.data);

    let data;
    try {
      data = JSON.parse(event.data);
    } catch (error) {
      data = event.data;
    }

    // Handle pong response
    if (data?.type === 'pong') {
      this._clearPongTimeout();
      return;
    }

    // Emit specific event types
    if (data?.type) {
      this.emit(data.type, data);
    }

    // Always emit generic message event
    this.emit('message', data);
  }

  _handleError(event, rejectFn) {
    console.error('[WebSocket] Error:', event);
    this.emit('error', event);

    if (rejectFn) {
      rejectFn(new Error('WebSocket connection failed'));
    }
  }

  _handleClose(event) {
    this._log('Closed:', event.code, event.reason);

    this.isConnected = false;
    this.isConnecting = false;
    this._clearTimers();
    this.socket = null;

    this.emit('disconnected', {
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean
    });

    // Auto-reconnect (except for clean closes)
    if (this.shouldReconnect && event.code !== 1000) {
      this._reconnect();
    }
  }

  _reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this._log('Max reconnect attempts reached');
      this.emit('reconnect-failed', { attempts: this.reconnectAttempts });
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectInterval * Math.pow(this.reconnectBackoff, this.reconnectAttempts - 1);

    this._log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    this.emit('reconnecting', { attempt: this.reconnectAttempts, delay });

    this.reconnectTimer = setTimeout(() => {
      if (this.shouldReconnect) {
        this.connect().catch(err => console.error('[WebSocket] Reconnect failed:', err));
      }
    }, delay);
  }

  _startHeartbeat() {
    if (!this.pingInterval) return;

    this.pingTimer = setInterval(() => {
      if (this.isConnected) {
        this.send({ action: 'ping' });
        this._startPongTimeout();
      }
    }, this.pingInterval);
  }

  _startPongTimeout() {
    this._clearPongTimeout();

    this.pongTimer = setTimeout(() => {
      console.warn('[WebSocket] Pong timeout - closing connection');
      if (this.socket) {
        this.socket.close(1006, 'Pong timeout');
      }
    }, this.pongTimeout);
  }

  _clearPongTimeout() {
    if (this.pongTimer) {
      clearTimeout(this.pongTimer);
      this.pongTimer = null;
    }
  }

  _clearTimers() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    this._clearPongTimeout();
  }

  _log(...args) {
    if (this.debug) {
      console.log('[WebSocket]', ...args);
    }
  }

  // Static methods

  /**
   * Convert REST API base URL to WebSocket URL
   * @param {string} baseURL - REST API base URL (http/https)
   * @param {string} path - WebSocket path (default: '/ws')
   * @returns {string} WebSocket URL (ws/wss)
   *
   * @example
   * WebSocketClient.deriveURL('https://api.example.com', '/ws/realtime')
   * // Returns: 'wss://api.example.com/ws/realtime'
   *
   * WebSocketClient.deriveURL('http://localhost:3000')
   * // Returns: 'ws://localhost:3000/ws'
   */
  static deriveURL(baseURL, path = '/ws/realtime/') {
    if (!baseURL) throw new Error('baseURL is required');

    // Parse the base URL
    const url = new URL(baseURL);

    // Convert http(s) to ws(s)
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';

    // Set the path (ensure it starts with /)
    url.pathname = path.startsWith('/') ? path : `/${path}`;

    return url.toString();
  }
}

// Add EventEmitter mixin
Object.assign(WebSocketClient.prototype, EventEmitter);

export default WebSocketClient;
