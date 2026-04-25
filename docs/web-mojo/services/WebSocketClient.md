# WebSocketClient

**WebSocketClient** is a lightweight, robust WebSocket client for WEB-MOJO applications. It wraps the browser `WebSocket` API with automatic reconnection, heartbeat ping/pong, token-based authentication, and an event-driven interface via `EventEmitter`.

---

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Constructor Options](#constructor-options)
- [Connecting & Disconnecting](#connecting--disconnecting)
- [Sending & Receiving Messages](#sending--receiving-messages)
- [Authentication](#authentication)
- [Reconnection](#reconnection)
- [Heartbeat](#heartbeat)
- [Events](#events)
- [Static Helpers](#static-helpers)
- [API Reference](#api-reference)
- [Common Patterns](#common-patterns)
- [Common Pitfalls](#common-pitfalls)
- [Related Documentation](#related-documentation)

---

## Overview

`WebSocketClient` provides:

- **Auto-reconnect** with configurable exponential backoff
- **Heartbeat ping/pong** — sends a `ping` action on an interval and closes the connection if no `pong` is received within a timeout window
- **Token authentication** — sends an `authenticate` message immediately after connecting
- **Event-driven API** — uses the `EventEmitter` mixin; subscribe with `.on()`, `.once()`, `.off()`
- **Smart message routing** — typed messages are emitted as `message:<type>` in addition to the generic `message` event
- **`deriveURL` helper** — converts an HTTP/HTTPS base URL to a `ws://`/`wss://` URL

---

## Quick Start

```js
import WebSocketClient from 'web-mojo/services/WebSocketClient';

const ws = new WebSocketClient({
  url:         'wss://api.example.com/ws/realtime/',
  getToken:    () => app.tokenManager.getToken(),
  tokenPrefix: 'bearer',
  debug:       true
});

ws.on('connected',    ()       => console.log('Connected!'));
ws.on('disconnected', (info)   => console.log('Disconnected:', info.code));
ws.on('message',      (data)   => console.log('Message:', data));
ws.on('error',        (event)  => console.error('Error:', event));

await ws.connect();
```

---

## Constructor Options

| Option | Type | Default | Description |
|---|---|---|---|
| `url` | `string` | `null` | WebSocket server URL (`wss://` or `ws://`). Can also be passed to `connect()` |
| `getToken` | `function` | `null` | Function that returns the current auth token string |
| `tokenPrefix` | `string` | `'bearer'` | Token type prefix sent in the auth message |
| `autoReconnect` | `boolean` | `true` | Whether to automatically reconnect on unexpected disconnection |
| `maxReconnectAttempts` | `number` | `Infinity` | Maximum number of reconnection attempts before giving up |
| `reconnectInterval` | `number` | `3000` | Initial reconnect delay in milliseconds |
| `reconnectBackoff` | `number` | `1.5` | Multiplier applied to the delay on each retry (exponential backoff) |
| `pingInterval` | `number` | `30000` | Interval between heartbeat pings in milliseconds (0 = disabled) |
| `pongTimeout` | `number` | `5000` | Time to wait for a pong response before closing the connection |
| `debug` | `boolean` | `false` | Log all send/receive/connect activity to the console |

```js
const ws = new WebSocketClient({
  url:                 'wss://api.example.com/ws/realtime/',
  getToken:            () => localStorage.getItem('token'),
  tokenPrefix:         'bearer',
  autoReconnect:       true,
  maxReconnectAttempts: 10,
  reconnectInterval:   2000,
  reconnectBackoff:    2,
  pingInterval:        20000,
  pongTimeout:         5000,
  debug:               false
});
```

---

## Connecting & Disconnecting

### `connect(url?)`

Opens the WebSocket connection. Returns a `Promise` that resolves when the connection is established, or rejects if the initial connection fails.

```js
// Using the URL from the constructor
await ws.connect();

// Override URL at connect time
await ws.connect('wss://api.example.com/ws/realtime/');
```

After `connect()` resolves:
1. The `'connected'` event is emitted
2. An `authenticate` message is sent (if `getToken` was provided)
3. The heartbeat timer is started

### `disconnect()`

Closes the connection cleanly and disables auto-reconnect:

```js
ws.disconnect();
// Sends close code 1000 ('Client disconnect')
// Auto-reconnect is permanently disabled after this call
```

> **Note:** `disconnect()` is permanent — it sets `shouldReconnect = false`. To temporarily pause, you can check `isConnected` instead.

---

## Sending & Receiving Messages

### `send(data)`

Send data over the WebSocket. Objects are automatically JSON-serialised; strings are sent as-is.

```js
// Send a plain object (serialised to JSON)
ws.send({ type: 'subscribe', channel: 'notifications' });

// Send a raw string
ws.send('ping');
```

Throws if the socket is not connected:

```js
if (ws.isConnected) {
  ws.send({ type: 'update', data: payload });
}
```

### Receiving Messages

Listen for the `'message'` event for all incoming messages:

```js
ws.on('message', (data) => {
  // data is the parsed JSON object, or the raw string if parsing fails
  console.log('Received:', data);
});
```

### Typed Message Routing

If the incoming message has a `type` field, `WebSocketClient` also emits `message:<type>` in addition to the generic `message` event:

```js
// Incoming: { "type": "notification", "text": "You have a new message" }

ws.on('message:notification', (data) => {
  showNotification(data.text);
});

ws.on('message:user_update', (data) => {
  updateUserDisplay(data.user);
});
```

This allows different parts of your application to subscribe only to the message types they care about without filtering in every handler.

### Pong Handling

Messages with `type: 'pong'` are consumed internally by the heartbeat system and are **not** emitted to `'message'` listeners.

---

## Authentication

When the connection opens, `WebSocketClient` immediately sends an authentication message if `getToken` is configured:

```js
// Sent automatically after connect:
{
  "type":   "authenticate",
  "token":  "<token returned by getToken()>",
  "prefix": "bearer"
}
```

Your server should handle this message and validate the token before processing subsequent messages from the client.

```js
const ws = new WebSocketClient({
  url:         'wss://api.example.com/ws/realtime/',
  getToken:    () => app.tokenManager.getToken(),
  tokenPrefix: 'bearer'
});

await ws.connect();
// ↳ Automatically sends: { type: 'authenticate', token: '...', prefix: 'bearer' }
```

If `getToken` returns `null` or is not set, a warning is logged and no auth message is sent.

---

## Reconnection

`WebSocketClient` automatically reconnects when the connection drops unexpectedly (i.e., closes with any code other than `1000`).

### Backoff Calculation

```
delay = reconnectInterval × (reconnectBackoff ^ attemptNumber)

Example (interval=3000, backoff=1.5):
  Attempt 1: 3000ms
  Attempt 2: 4500ms
  Attempt 3: 6750ms
  Attempt 4: 10125ms
  ...
```

### Reconnection Events

```js
ws.on('reconnecting', ({ attempt, delay }) => {
  console.log(`Reconnect attempt ${attempt} in ${delay}ms`);
});

ws.on('reconnect-failed', ({ attempts }) => {
  console.error(`Gave up after ${attempts} reconnection attempts`);
  // Show a "Connection lost" UI to the user
});
```

### Disabling Auto-Reconnect

```js
// Disable at construction
const ws = new WebSocketClient({
  url:          'wss://...',
  autoReconnect: false
});

// Or limit attempts
const ws = new WebSocketClient({
  url:                  'wss://...',
  maxReconnectAttempts: 5
});
```

### Manual Reconnect

After `disconnect()` has been called, you can manually reconnect by creating a new instance or calling `connect()` again after resetting `shouldReconnect`:

```js
ws.shouldReconnect = true;
await ws.connect();
```

---

## Heartbeat

`WebSocketClient` sends a `{ action: 'ping' }` message on `pingInterval` and expects a `{ type: 'pong' }` response within `pongTimeout` milliseconds.

If no pong arrives in time, the socket is forcibly closed (code `1006`) and auto-reconnect triggers.

```js
// Disable heartbeat entirely
const ws = new WebSocketClient({
  url:          'wss://...',
  pingInterval: 0   // 0 = disabled
});
```

### Server-Side Handler

Your server should respond to ping messages:

```python
# Django Channels example
if event['type'] == 'ping':
    await self.send(json.dumps({ 'type': 'pong' }))
```

---

## Events

`WebSocketClient` mixes in `EventEmitter` — use `.on()`, `.off()`, `.once()` to subscribe.

| Event | Payload | When emitted |
|---|---|---|
| `'connected'` | *(none)* | Connection opened successfully |
| `'disconnected'` | `{ code, reason, wasClean }` | Connection closed for any reason |
| `'reconnecting'` | `{ attempt, delay }` | About to attempt a reconnection |
| `'reconnect-failed'` | `{ attempts }` | `maxReconnectAttempts` reached |
| `'message'` | `data` | Any message received (parsed JSON or raw string) |
| `'message:<type>'` | `data` | Message with a specific `type` field (e.g. `'message:notification'`) |
| `'error'` | `event` | WebSocket error event |

### Subscribing

```js
ws.on('connected',    ()      => updateStatusIndicator('online'));
ws.on('disconnected', (info)  => updateStatusIndicator('offline'));

// One-time handler
ws.once('connected', () => console.log('First connect!'));
```

### Unsubscribing

```js
const handler = (data) => console.log(data);
ws.on('message', handler);

// Later, to remove:
ws.off('message', handler);

// Remove all listeners for an event:
ws.off('connected');
```

---

## Static Helpers

### `WebSocketClient.deriveURL(baseURL, path?)`

Convert a REST API base URL to a WebSocket URL by swapping `http` → `ws` and `https` → `wss`:

```js
WebSocketClient.deriveURL('https://api.example.com');
// → 'wss://api.example.com/ws/realtime/'

WebSocketClient.deriveURL('https://api.example.com', '/ws/events/');
// → 'wss://api.example.com/ws/events/'

WebSocketClient.deriveURL('http://localhost:8000', '/ws/test/');
// → 'ws://localhost:8000/ws/test/'
```

| Parameter | Type | Default | Description |
|---|---|---|---|
| `baseURL` | `string` | *(required)* | The HTTP/HTTPS base URL |
| `path` | `string` | `'/ws/realtime/'` | The WebSocket path |

---

## API Reference

### Constructor

```js
const ws = new WebSocketClient(options);
```

### Connection Methods

| Method | Returns | Description |
|---|---|---|
| `connect(url?)` | `Promise<void>` | Open the WebSocket connection |
| `disconnect()` | `void` | Close cleanly and disable auto-reconnect |

### Messaging Methods

| Method | Returns | Description |
|---|---|---|
| `send(data)` | `void` | Send data (objects are JSON-serialised) |

### EventEmitter Methods (inherited)

| Method | Returns | Description |
|---|---|---|
| `on(event, callback, context?)` | `this` | Subscribe to an event |
| `off(event, callback?, context?)` | `this` | Unsubscribe from an event |
| `once(event, callback, context?)` | `this` | Subscribe for a single emission |
| `emit(event, ...args)` | `this` | Emit an event manually |

### Instance Properties

| Property | Type | Description |
|---|---|---|
| `url` | `string` | The WebSocket server URL |
| `socket` | `WebSocket\|null` | The underlying `WebSocket` instance |
| `isConnected` | `boolean` | Whether the socket is currently open |
| `isConnecting` | `boolean` | Whether a connection is in progress |
| `isReconnecting` | `boolean` | Whether the client is between reconnect attempts (waiting to retry after a drop) |
| `shouldReconnect` | `boolean` | Whether auto-reconnect is enabled |
| `reconnectAttempts` | `number` | Number of reconnection attempts made so far |
| `debug` | `boolean` | Whether verbose logging is enabled |

### Static Methods

| Method | Returns | Description |
|---|---|---|
| `WebSocketClient.deriveURL(baseURL, path?)` | `string` | Convert HTTP(S) URL to WebSocket URL |

---

## Common Patterns

### Connecting with a REST Base URL

```js
import WebSocketClient from 'web-mojo/services/WebSocketClient';

const ws = new WebSocketClient({
  url:      WebSocketClient.deriveURL(app.rest.config.baseURL, '/ws/realtime/'),
  getToken: () => app.tokenManager.getToken()
});

await ws.connect();
```

### Subscribing to Specific Event Types

```js
// Subscribe to 'live_update' messages only
ws.on('message:live_update', (data) => {
  this.updateRecord(data.id, data.fields);
  this.render();
});

// Subscribe to 'alert' messages only
ws.on('message:alert', (data) => {
  this.getApp().toast.warning(data.text);
});
```

### Integrating with a Page

```js
class DashboardPage extends Page {
  async onInit() {
    await super.onInit();

    this.ws = new WebSocketClient({
      url:      WebSocketClient.deriveURL(this.getApp().rest.config.baseURL),
      getToken: () => this.getApp().tokenManager.getToken()
    });

    this.ws.on('message:metric_update', (data) => {
      if (this.isActive) {
        this.metrics = data.metrics;
        this.render();
      }
    });

    this.ws.on('disconnected', () => {
      this.connectionStatus = 'offline';
      this.render();
    });

    this.ws.on('connected', () => {
      this.connectionStatus = 'online';
      this.render();
    });
  }

  async onEnter() {
    await super.onEnter();
    await this.ws.connect();
  }

  async onExit() {
    this.ws.disconnect();
    await super.onExit();
  }
}
```

### Reconnection UI

```js
class RealtimeView extends View {
  async onInit() {
    await super.onInit();
    this.connectionStatus = 'disconnected';

    this.ws = new WebSocketClient({ url: 'wss://...', getToken: () => app.getToken() });

    this.ws.on('connected',        ()      => { this.connectionStatus = 'connected';     this.render(); });
    this.ws.on('disconnected',     ()      => { this.connectionStatus = 'disconnected';  this.render(); });
    this.ws.on('reconnecting',     (info)  => {
      this.connectionStatus = `reconnecting (attempt ${info.attempt})`;
      this.render();
    });
    this.ws.on('reconnect-failed', ()      => { this.connectionStatus = 'failed';        this.render(); });
  }
}
```

### Sending a Subscription Message After Connect

```js
ws.once('connected', () => {
  ws.send({
    type:     'subscribe',
    channels: ['notifications', 'updates'],
    groupId:  app.getActiveGroup()?.get('id')
  });
});

await ws.connect();
```

### Group-Scoped Subscription

When the active group changes, re-subscribe with the new group context:

```js
app.events.on('group:changed', ({ group }) => {
  if (ws.isConnected) {
    ws.send({ type: 'unsubscribe', channels: ['all'] });
    ws.send({ type: 'subscribe', channels: ['all'], groupId: group.get('id') });
  }
});
```

### Integrating with the Global EventBus

Bridge WebSocket messages to the app-wide EventBus so any component can react:

```js
ws.on('message', (data) => {
  if (data?.type) {
    app.events.emit(`ws:${data.type}`, data);
  }
});

// Any view can now subscribe:
app.events.on('ws:notification', (data) => {
  app.toast.info(data.text);
});
```

---

## Common Pitfalls

### ⚠️ Calling connect() multiple times

```js
// ❌ WRONG — calling connect() while already connected/connecting is a no-op
await ws.connect();
await ws.connect(); // Silently ignored

// ✅ CORRECT — check state first if you need to reconnect
if (!ws.isConnected && !ws.isConnecting) {
  await ws.connect();
}
```

### ⚠️ Calling send() before the connection is open

```js
// ❌ WRONG — throws 'WebSocket not connected'
const ws = new WebSocketClient({ url: 'wss://...' });
ws.send({ type: 'subscribe' }); // Throws!

// ✅ CORRECT — send after 'connected' fires
ws.once('connected', () => {
  ws.send({ type: 'subscribe', channel: 'updates' });
});
await ws.connect();
```

### ⚠️ Not disconnecting on page exit

```js
// ❌ WRONG — socket keeps running in the background after the page is gone
class MyPage extends Page {
  async onInit() {
    await super.onInit();
    this.ws = new WebSocketClient({ ... });
    await this.ws.connect();
  }
  // No cleanup!
}

// ✅ CORRECT — disconnect on exit
class MyPage extends Page {
  async onExit() {
    this.ws.disconnect();
    await super.onExit();
  }
}
```

### ⚠️ Forgetting that disconnect() prevents auto-reconnect

```js
// ❌ WRONG — expecting auto-reconnect after explicit disconnect
ws.disconnect(); // Sets shouldReconnect = false permanently
// ... later, the connection won't auto-reconnect even on network errors

// ✅ CORRECT — if you want temporary teardown, create a new instance
// OR reset shouldReconnect manually before reconnecting
ws.shouldReconnect = true;
await ws.connect();
```

### ⚠️ Listening on 'message' for pong responses

```js
// ❌ WRONG — pong is consumed internally, this handler never fires for pong
ws.on('message', (data) => {
  if (data.type === 'pong') {
    console.log('Got pong!'); // Never reached
  }
});

// ✅ pong is handled transparently by WebSocketClient — no action needed
```

### ⚠️ Using the wrong URL scheme

```js
// ❌ WRONG — WebSocket requires ws:// or wss://, not http://
const ws = new WebSocketClient({ url: 'https://api.example.com/ws/' }); // Will fail

// ✅ CORRECT — use deriveURL() to convert from HTTP base URL
const ws = new WebSocketClient({
  url: WebSocketClient.deriveURL('https://api.example.com', '/ws/realtime/')
  // → 'wss://api.example.com/ws/realtime/'
});
```

---

## Related Documentation

- **[Rest](./Rest.md)** — HTTP client; use alongside WebSocketClient for combined REST + realtime
- **[PortalApp](../core/PortalApp.md)** — Manages auth tokens that WebSocketClient uses for `getToken`
- **[Events](../core/Events.md)** — EventEmitter mixin used by WebSocketClient
- **[ToastService](./ToastService.md)** — Show real-time notifications triggered by WebSocket messages
- **[Page](../pages/Page.md)** — Connect/disconnect in `onEnter()` / `onExit()` lifecycle hooks

## Examples

<!-- examples:cross-link begin -->

Runnable, copy-paste reference in the examples portal:

- [`examples/portal/examples/services/WebSocketClient/WebSocketClientExample.js`](../../../examples/portal/examples/services/WebSocketClient/WebSocketClientExample.js) — WebSocket client with auto-reconnect and heartbeat.

<!-- examples:cross-link end -->
