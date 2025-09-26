/**
 * WebSocket - Real-time WebSocket client for MOJO framework
 * Provides connection management, auto-reconnect, and event integration
 */

export default class WebSocketClient {
  constructor(options = {}) {
    this.url = options.url || null;
    this.protocols = options.protocols || [];
    
    // Connection state
    this.socket = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.shouldReconnect = options.autoReconnect !== false;
    this._authed = false;
    this._authFailed = false;
    
    // Reconnection settings
    this.maxReconnectAttempts = Number.isFinite(options.maxReconnectAttempts) ? options.maxReconnectAttempts : Infinity;
    this.reconnectInterval = options.reconnectInterval || 3000;
    this.reconnectBackoff = options.reconnectBackoff || 1.5;
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    
    // Heartbeat/ping settings (JSON ping/pong)
    this.pingInterval = options.pingInterval || 30000;
    this.pongTimeout = options.pongTimeout || 5000;
    this.pingTimer = null;
    this.pongTimer = null;
    this.pausePingWhenHidden = options.pausePingWhenHidden !== false; // default true
    this._onVisibilityChange = this._onVisibilityChange?.bind ? this._onVisibilityChange.bind(this) : () => {};
    
    // Auth / token
    this.getToken = options.getToken || null; // () => string
    this.tokenPrefix = options.tokenPrefix || 'bearer';
    this.refreshToken = options.refreshToken || null; // async () => string
    this.autoSubscribeOwnTopic = options.autoSubscribeOwnTopic !== false; // default true
    
    // Subscriptions
    this.subscriptions = new Set(); // always re-subscribe post-auth_success
    
    // Event handling
    this.eventBus = options.eventBus || null;
    this.listeners = {};
    
    // Data transformation
    this.dataTransform = options.dataTransform || null;
    
    // Options
    this.debug = options.debug || false;
    
    // Bind methods
    this._onOpen = this._onOpen.bind(this);
    this._onMessage = this._onMessage.bind(this);
    this._onError = this._onError.bind(this);
    this._onClose = this._onClose.bind(this);
  }

  /**
   * Connect to WebSocket server
   * @param {string} url - WebSocket URL (optional if set in constructor)
   * @returns {Promise} Promise that resolves when connected
   */
  connect(url = null) {
    if (url) {
      this.url = url;
    }
    
    if (!this.url) {
      throw new Error('WebSocket URL is required');
    }
    
    if (this.isConnected || this.isConnecting) {
      return Promise.resolve();
    }
    
    this.isConnecting = true;
    
    return new Promise((resolve, reject) => {
      try {
        this.debug && console.log('[WebSocket] Connecting to:', this.url);
        
        this.socket = new WebSocket(this.url, this.protocols);
        
        this.socket.addEventListener('open', this._onOpen);
        this.socket.addEventListener('message', this._onMessage);
        this.socket.addEventListener('error', this._onError);
        this.socket.addEventListener('close', this._onClose);
        
        // Store promise resolvers for connection result
        this._connectResolve = resolve;
        this._connectReject = reject;
        
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    this.shouldReconnect = false;
    this._clearTimers();
    
    if (this.socket) {
      this.debug && console.log('[WebSocket] Disconnecting');
      this.socket.close(1000, 'Client disconnecting');
    }
  }

  /**
   * Send data to WebSocket server
   * @param {*} data - Data to send
   */
  send(data) {
    if (!this.isConnected || !this.socket) {
      throw new Error('WebSocket is not connected');
    }
    
    const message = typeof data === 'string' ? data : JSON.stringify(data);
    this.socket.send(message);
    
    this.debug && console.log('[WebSocket] Sent:', message);
  }

  /**
   * Subscribe to a topic (queued until authenticated)
   * @param {string} topic
   */
  subscribe(topic) {
    if (!topic) return;
    this.subscriptions.add(topic);
    if (this._authed && this.isConnected) {
      this.send({ action: 'subscribe', topic });
    }
  }

  /**
   * Unsubscribe from a topic
   * @param {string} topic
   */
  unsubscribe(topic) {
    if (!topic) return;
    this.subscriptions.delete(topic);
    if (this.isConnected) {
      this.send({ action: 'unsubscribe', topic });
    }
  }

  /**
   * Send ping (application-level heartbeat)
   */
  ping() {
    if (this.isConnected) {
      this.send({ action: 'ping' });
    }
  }

  /**
   * Add event listener
   * @param {string} event - Event name
   * @param {function} callback - Event callback
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {function} callback - Event callback to remove
   */
  off(event, callback) {
    if (!this.listeners[event]) return;
    
    if (!callback) {
      delete this.listeners[event];
      return;
    }
    
    const index = this.listeners[event].indexOf(callback);
    if (index !== -1) {
      this.listeners[event].splice(index, 1);
    }
  }

  /**
   * Emit event to listeners
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    // Emit to local listeners
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[WebSocket] Error in ${event} listener:`, error);
        }
      });
    }
    
    // Emit to external EventBus if available
    if (this.eventBus && typeof this.eventBus.emit === 'function') {
      this.eventBus.emit(`websocket:${event}`, {
        websocket: this,
        data
      });
    }
  }

  /**
   * Get current connection status
   * @returns {string} Connection status
   */
  getStatus() {
    if (this.isConnected) return 'connected';
    if (this.isConnecting) return 'connecting';
    return 'disconnected';
  }

  /**
   * Get connection statistics
   * @returns {object} Connection stats
   */
  getStats() {
    return {
      url: this.url,
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      shouldReconnect: this.shouldReconnect
    };
  }

  // Private methods

  _onOpen(event) {
    this.debug && console.log('[WebSocket] Connected');
    
    this.isConnected = true;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this._authed = false;
    
    // Start heartbeat
    this._startHeartbeat();
    // Visibility handling for heartbeat
    if (typeof document !== 'undefined' && document.addEventListener) {
      document.removeEventListener('visibilitychange', this._onVisibilityChange);
      document.addEventListener('visibilitychange', this._onVisibilityChange);
    }
    
    // Authenticate immediately
    const token = this.getToken ? this.getToken() : null;
    if (!token) {
      console.warn('[WebSocket] No token provided at open; waiting for auth_required or external authenticate');
    } else {
      this.send({ type: 'authenticate', token, prefix: this.tokenPrefix || undefined });
    }
    
    // Resolve connection promise
    if (this._connectResolve) {
      this._connectResolve();
      this._connectResolve = null;
      this._connectReject = null;
    }
    
    this.emit('connected', { url: this.url });
  }

  _onMessage(event) {
    this.debug && console.log('[WebSocket] Received:', event.data);
    
    let data;
    try {
      data = JSON.parse(event.data);
    } catch (error) {
      data = event.data;
    }
    
    // Handle heartbeat pong (JSON only)
    if (data && data.type === 'pong') {
      this._clearPongTimeout();
      return;
    }
    
    // Transform data if transformer provided
    if (this.dataTransform && typeof this.dataTransform === 'function') {
      try {
        data = this.dataTransform(data);
      } catch (error) {
        console.error('[WebSocket] Error transforming data:', error);
        this.emit('error', { error, originalData: data });
        return;
      }
    }

    // Protocol handling
    if (data && typeof data === 'object') {
      switch (data.type) {
        case 'auth_required':
          this.emit('auth-required', data);
          break;
        case 'auth_timeout': {
          this._authFailed = true;
          this.emit('auth-timeout', data);
          this.disconnect();
          return;
        }
        case 'auth_success': {
          this._authed = true;
          this.emit('auth-success', data);
          // Auto-subscribe to own topic if enabled
          if (this.autoSubscribeOwnTopic) {
            const { instance_kind, instance_id } = data;
            if (instance_kind && instance_id !== undefined) {
              this.subscribe(`${instance_kind}:${instance_id}`);
            }
          }
          // Flush desired subscriptions
          for (const topic of this.subscriptions) {
            this.send({ action: 'subscribe', topic });
          }
          break;
        }
        case 'subscribed':
          this.emit('subscribed', data);
          break;
        case 'unsubscribed':
          this.emit('unsubscribed', data);
          break;
        case 'notification':
          this.emit('notification', data);
          break;
        case 'error': {
          this.emit('server-error', data);
          const msg = (data.message || '').toString();
          if (/token|auth/i.test(msg)) {
            if (this.refreshToken) {
              (async () => {
                try {
                  await this.refreshToken();
                  this.disconnect();
                  // allow a short delay before reconnect to use refreshed token
                  setTimeout(() => this.connect().catch(() => {}), 250);
                } catch (e) {
                  console.warn('[WebSocket] Token refresh failed:', e);
                  this._authFailed = true;
                  this.disconnect();
                }
              })();
            } else {
              this._authFailed = true;
              this.disconnect();
            }
            break;
          }
          break;
        }
        default:
          break;
      }
    }
    
    this.emit('message', data);
    this.emit('data', data); // Alias for convenience
  }

  _onError(event) {
    console.error('[WebSocket] Error:', event);
    
    this.emit('error', { 
      error: event.error || new Error('WebSocket error'),
      event 
    });
    
    // Reject connection promise if still connecting
    if (this._connectReject) {
      this._connectReject(event.error || new Error('WebSocket connection failed'));
      this._connectResolve = null;
      this._connectReject = null;
    }
  }

  _onClose(event) {
    this.debug && console.log('[WebSocket] Closed:', event.code, event.reason);
    
    this.isConnected = false;
    this.isConnecting = false;
    this._authed = false;
    
    this._clearTimers();
    if (typeof document !== 'undefined' && document.removeEventListener) {
      document.removeEventListener('visibilitychange', this._onVisibilityChange);
    }
    
    // Clean up socket
    if (this.socket) {
      this.socket.removeEventListener('open', this._onOpen);
      this.socket.removeEventListener('message', this._onMessage);
      this.socket.removeEventListener('error', this._onError);
      this.socket.removeEventListener('close', this._onClose);
      this.socket = null;
    }
    
    this.emit('disconnected', { 
      code: event.code, 
      reason: event.reason,
      wasClean: event.wasClean
    });
    
    // Attempt reconnection if enabled and not a clean close and not due to auth failure
    if (this.shouldReconnect && !this._authFailed && event.code !== 1000) {
      this._attemptReconnect();
    }
  }

  _attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.debug && console.log('[WebSocket] Max reconnect attempts reached');
      this.emit('reconnect-failed', { 
        attempts: this.reconnectAttempts,
        maxAttempts: this.maxReconnectAttempts
      });
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.reconnectInterval * Math.pow(this.reconnectBackoff, this.reconnectAttempts - 1);
    
    this.debug && console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    this.emit('reconnecting', { 
      attempt: this.reconnectAttempts,
      delay,
      maxAttempts: this.maxReconnectAttempts
    });
    
    this.reconnectTimer = setTimeout(() => {
      if (this.shouldReconnect) {
        this.connect().catch(error => {
          console.error('[WebSocket] Reconnection failed:', error);
        });
      }
    }, delay);
  }

  _startHeartbeat() {
    if (!this.pingInterval) return;
    if (this.pingTimer) return; // avoid duplicates
    
    this.pingTimer = setInterval(() => {
      if (this.isConnected && this.socket) {
        // pause pings when hidden (optional)
        if (this.pausePingWhenHidden && typeof document !== 'undefined' && document.hidden) {
          return;
        }
        this.ping();
        this._startPongTimeout();
      }
    }, this.pingInterval);
  }

  _startPongTimeout() {
    this._clearPongTimeout();
    this.pongTimer = setTimeout(() => {
      console.warn('[WebSocket] Pong timeout - connection may be stale');
      if (this.socket && typeof this.socket.close === 'function') {
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

  /**
   * Handle visibility change for heartbeat
   */
  _onVisibilityChange() {
    if (!this.pausePingWhenHidden) return;
    if (typeof document === 'undefined') return;
    if (document.hidden) {
      // Pause heartbeat to save power
      if (this.pingTimer) {
        clearInterval(this.pingTimer);
        this.pingTimer = null;
      }
    } else {
      // Resume heartbeat and send a ping
      this._startHeartbeat();
      this.ping();
    }
  }

  /**
   * Static method to create and connect WebSocket
   * @param {string} url - WebSocket URL
   * @param {object} options - Connection options
   * @returns {Promise<WebSocketClient>} Connected WebSocket client
   */
  static async connect(url, options = {}) {
    const client = new WebSocketClient({ ...options, url });
    await client.connect();
    return client;
  }
}