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
    
    // Reconnection settings
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
    this.reconnectInterval = options.reconnectInterval || 3000;
    this.reconnectBackoff = options.reconnectBackoff || 1.5;
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    
    // Heartbeat/ping settings
    this.pingInterval = options.pingInterval || 30000;
    this.pongTimeout = options.pongTimeout || 5000;
    this.pingTimer = null;
    this.pongTimer = null;
    
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
    
    // Start heartbeat
    this._startHeartbeat();
    
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
    
    // Handle heartbeat pong
    if (data === 'pong' || (data && data.type === 'pong')) {
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
    
    this._clearTimers();
    
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
    
    // Attempt reconnection if enabled and not a clean close
    if (this.shouldReconnect && event.code !== 1000) {
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
    
    this.pingTimer = setInterval(() => {
      if (this.isConnected && this.socket) {
        this.send('ping');
        this._startPongTimeout();
      }
    }, this.pingInterval);
  }

  _startPongTimeout() {
    this.pongTimer = setTimeout(() => {
      console.warn('[WebSocket] Pong timeout - connection may be stale');
      this.socket?.close(1006, 'Pong timeout');
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