# Rest

**Rest** is the HTTP client for WEB-MOJO's API communication layer. It wraps the browser `fetch` API with a consistent request/response structure, interceptor support, timeout handling, device tracking, authentication, file upload/download, and a rich set of error categorization helpers.

A pre-configured singleton is exported as the default export and is shared by all [Model](../core/Model.md) and [Collection](../core/Collection.md) instances. You configure it once (typically via the `api` option on [WebApp](../core/WebApp.md)) and every model automatically uses it.

---

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Making Requests](#making-requests)
- [Response Structure](#response-structure)
- [Error Handling](#error-handling)
- [Authentication](#authentication)
- [File Upload & Download](#file-upload--download)
- [Interceptors](#interceptors)
- [Device Tracking (DUID)](#device-tracking-duid)
- [API Reference](#api-reference)
- [Common Patterns](#common-patterns)
- [Common Pitfalls](#common-pitfalls)
- [Related Documentation](#related-documentation)

---

## Overview

The `Rest` singleton (`rest`) is the low-level HTTP layer for the entire framework. Key features:

- **Consistent response shape** — Every method returns the same `{ success, status, data, errors, message }` object regardless of success or failure
- **Automatic base URL** — Set once; all relative paths are resolved against it
- **Timeout support** — Per-request and global timeouts using `AbortController`
- **Interceptors** — Transform requests and responses globally
- **Authentication** — `setAuthToken()` adds a `Bearer` header to all subsequent requests
- **Device Tracking** — Generates and persists a unique device ID (DUID) sent with every request
- **Upload helpers** — `upload()` with progress callbacks and `uploadMultipart()` for `FormData`
- **Download helpers** — `download()` streams to disk; `downloadBlob()` returns a `Blob`
- **Error categorization** — Classifies network, timeout, auth, and HTTP errors into named reason codes

---

## Quick Start

```js
import rest from 'web-mojo/Rest';

// Configure once at app startup
rest.configure({
  baseURL: 'https://api.example.com',
  timeout: 15000
});

// Make requests
const response = await rest.GET('/api/users');

if (response.success && response.data.status) {
  const users = response.data.data;
} else {
  console.error(response.message || response.data.error);
}
```

When using [WebApp](../core/WebApp.md) or [PortalApp](../core/PortalApp.md), configuration happens automatically via the `api` constructor option — you rarely need to call `configure()` directly.

---

## Configuration

### `configure(config)`

Call once at startup to set global defaults for all requests:

```js
rest.configure({
  baseURL:       'https://api.example.com',  // Base URL prepended to relative paths
  timeout:       30000,                       // Request timeout in ms (default: 30000)
  headers: {                                  // Additional default headers
    'X-App-Version': '2.0',
    'X-Client':      'web'
  },
  trackDevice:   true,            // Send DUID header with every request (default: true)
  duidHeader:    'X-Mojo-UID',   // Header name for the DUID (default: 'X-Mojo-UID')
  duidTransport: 'header'        // How to send DUID: 'header' or 'payload'
});
```

The `configure()` call **merges** headers rather than replacing them, so default headers like `Content-Type` and `Accept` are preserved unless you explicitly override them.

### `baseUrl` alias

Both `baseURL` and `baseUrl` are accepted:

```js
rest.configure({ baseUrl: 'https://api.example.com' });
// Same as:
rest.configure({ baseURL: 'https://api.example.com' });
```

### Via WebApp

The preferred way to configure `rest` in a MOJO app:

```js
const app = new WebApp({
  api: {
    baseURL: 'https://api.example.com',
    timeout: 20000,
    headers: { 'X-Client': 'portal' }
  }
});
// rest is now fully configured before app.start() runs
```

---

## Making Requests

All request methods are `async` and return a [response object](#response-structure).

### GET

```js
// Simple GET
const response = await rest.GET('/api/users');

// GET with query parameters
const response = await rest.GET('/api/users', { page: 2, filter: 'active' });

// GET with additional fetch options
const response = await rest.GET('/api/users', {}, { signal: abortController.signal });
```

### POST

```js
const response = await rest.POST('/api/users', {
  email: 'jane@example.com',
  name:  'Jane Smith'
});
```

### PUT

```js
const response = await rest.PUT('/api/users/42', {
  name: 'Jane Doe'
});
```

### PATCH

```js
const response = await rest.PATCH('/api/users/42', {
  is_active: false
});
```

### DELETE

```js
const response = await rest.DELETE('/api/users/42');
```

### Generic `request(method, endpoint, data, options)`

The lower-level method that `GET`, `POST`, etc. all delegate to:

```js
const response = await rest.request('GET', '/api/endpoint', { q: 'search' });
const response = await rest.request('POST', '/api/endpoint', { name: 'test' }, {
  timeout: 5000
});
```

### Request Options

The final `options` parameter (4th arg for `GET`/`POST`/etc., or part of the options object for `request()`) supports:

| Option | Type | Default | Description |
|---|---|---|---|
| `timeout` | `number` | `30000` | Per-request timeout in milliseconds |
| `signal` | `AbortSignal` | — | `AbortController` signal for manual cancellation |
| `dataOnly` | `boolean` | `false` | Unwrap the server envelope automatically (see below) |

### `dataOnly` Option (Recommended)

MOJO APIs return a double-wrapped response: the HTTP response wraps `{ status, data, message }`, so the actual payload lives at `resp.data.data`. The `dataOnly` option unwraps this for you:

```js
// ❌ Without dataOnly — verbose two-level unwrap
const resp = await rest.GET('/api/account/api_keys');
if (resp.success && resp.data.status) {
  const keys = resp.data.data; // actual payload buried at .data.data
}

// ✅ With dataOnly — clean single-level access
const resp = await rest.GET('/api/account/api_keys', {}, {}, { dataOnly: true });
if (resp.success) {
  const keys = resp.data; // payload is directly on .data
}
```

Works with all HTTP methods. Pass as the **4th argument** (options):

```js
// GET: rest.GET(url, params, fetchOptions, mojoOptions)
const resp = await rest.GET('/api/users', { page: 1 }, {}, { dataOnly: true });

// POST: rest.POST(url, body, fetchOptions, mojoOptions)
const resp = await rest.POST('/api/auth/login', credentials, {}, { dataOnly: true });

// DELETE: rest.DELETE(url, body, fetchOptions, mojoOptions)
const resp = await rest.DELETE(`/api/items/${id}`, {}, {}, { dataOnly: true });
```

> **Note:** When `dataOnly` is enabled, `resp.message` is populated from the server envelope's `message` field before unwrapping, so error messages remain accessible.

---

## Response Structure

Every request method returns the **same object shape**, whether the request succeeded or failed:

```js
{
  success:    boolean,  // true if HTTP status is 2xx
  status:     number,   // HTTP status code (200, 404, 500, …)
  statusText: string,   // HTTP status text ('OK', 'Not Found', …)
  headers:    object,   // Response headers as a plain object
  data:       object,   // Parsed JSON body (your API's response)
  errors:     object,   // HTTP-level error details (present on failure)
  message:    string,   // Human-readable error message (present on failure)
  reason:     string    // Machine-readable reason code (present on failure)
}
```

### Your API's Response (inside `data`)

MOJO follows a convention where your server wraps its payload:

```js
// Typical successful API response body:
{
  status: true,     // Server-level success flag
  data:   { ... }   // The actual payload
}

// Typical error API response body:
{
  status: false,
  error:  'Not found',
  code:   'not_found'
}
```

### Two-Level Check Pattern

Always check both the HTTP level and the server level:

```js
const response = await rest.GET('/api/users/42');

// Level 1 — HTTP check
if (!response.success) {
  console.error('Network/HTTP error:', response.message);
  return;
}

// Level 2 — Server-level check
if (!response.data.status) {
  console.error('Server error:', response.data.error);
  return;
}

// Success
const user = response.data.data;
```

### Shorthand for Models

Models handle both checks for you:

```js
const user = new User({ id: 42 });
const resp = await user.fetch();

if (resp.success) {
  // Model data is already set — resp.success means both levels passed
}
```

---

## Error Handling

### Error Response Shape

When a request fails, the response object contains:

```js
{
  success:    false,
  status:     404,
  statusText: 'Not Found',
  data:       null,
  errors:     { network: 'Request failed' },
  message:    'The requested resource was not found',
  reason:     'not_found'    // Machine-readable reason code
}
```

### Reason Codes

`Rest` categorizes errors into named reason codes for programmatic handling:

| Reason Code | When it occurs |
|---|---|
| `'not_reachable'` | Network failure — server unreachable |
| `'timed_out'` | Request exceeded the timeout duration |
| `'cancelled'` | Request was aborted via `AbortController` |
| `'unauthorized'` | HTTP 401 |
| `'forbidden'` | HTTP 403 |
| `'not_found'` | HTTP 404 |
| `'bad_request'` | HTTP 400 |
| `'validation_error'` | HTTP 422 |
| `'rate_limited'` | HTTP 429 |
| `'server_error'` | HTTP 5xx |
| `'cors_error'` | CORS policy rejection |
| `'dns_error'` | DNS resolution failure |
| `'unknown_error'` | Anything else |

### `categorizeError(error, status)`

```js
const { reason, message } = rest.categorizeError(error, response.status);
console.log(reason);  // 'not_found'
console.log(message); // 'The requested resource was not found'
```

### `getUserMessage(reason)`

Get a user-friendly message string for a reason code:

```js
const msg = rest.getUserMessage('timed_out');
// 'Request timed out - please try again'
```

### Helper Predicates

```js
rest.isRetryableError(reason);  // true for network/timeout errors
rest.isNetworkError(reason);    // true for connectivity failures
rest.requiresAuth(reason);      // true for 'unauthorized'
```

### Handling Specific Errors

```js
const response = await rest.POST('/api/login', credentials);

if (!response.success) {
  switch (response.reason) {
    case 'unauthorized':
      showError('Invalid email or password');
      break;
    case 'rate_limited':
      showError('Too many attempts. Please wait and try again.');
      break;
    case 'timed_out':
    case 'not_reachable':
      showError('Cannot connect to the server. Check your internet connection.');
      break;
    default:
      showError(response.message || 'Login failed');
  }
  return;
}
```

---

## Authentication

### `setAuthToken(token, type)`

Set a Bearer token added automatically to all subsequent requests:

```js
rest.setAuthToken('eyJhbGci...');

// Optionally specify the token type (default: 'Bearer')
rest.setAuthToken('my-api-key', 'Token');
```

The token is stored in `rest.config.headers['Authorization']`.

### `clearAuth()`

Remove the Authorization header:

```js
rest.clearAuth();
```

### Token Refresh Interceptor

For automatic token refresh on 401 responses, use a response interceptor:

```js
rest.addInterceptor('response', async (responseData) => {
  if (responseData.status === 401) {
    const newToken = await tokenManager.refresh();
    if (newToken) {
      rest.setAuthToken(newToken);
      // Re-issue the original request automatically
    }
  }
  return responseData;
});
```

### Automatic JWT refresh (PortalApp)

When the app is a [PortalApp](../core/PortalApp.md) (including `PortalWebApp` and [`DocItApp`](../extensions/DocIt.md)), a **pre-request auth gate** is installed automatically. Every outgoing REST call is blocked on access-token validity:

- If the access token is still valid → the call proceeds as usual.
- If the access token is expired → a refresh (`POST /api/token/refresh`) runs first; once it completes the call goes out using the newly-issued bearer token.
- If the refresh token is also missing / invalid / expired → the call returns a `{ success: false, status: 401, reason: 'unauthorized' }` response **without hitting the network** and `auth:unauthorized` is emitted on the app's event bus.

**Single-flight guarantee.** Concurrent callers share a single refresh attempt — exactly one `POST /api/token/refresh` is ever in flight. Additional callers that arrive during a pending refresh wait on the same promise and then proceed with the refreshed token (or fail together if the refresh fails).

**Bypass rules.** The refresh endpoint itself (`/api/token/refresh`) is exempt from the gate to prevent recursion. Requests made while no access token is stored (login screen, public flows) also bypass the gate.

The gate is complementary to the 60-second `TokenManager.startAutoRefresh()` interval (see [TokenManager](../services/TokenManager.md)) and the `browser:focus` refresh handler — those continue to refresh proactively, and the single-flight guard ensures they cooperate with the per-request gate.

> **Note:** `rest.download()`, `rest.downloadBlob()`, and the raw-XHR `rest.upload()` call `fetch` / `XMLHttpRequest` directly and **do not** go through the interceptor chain — they are not currently covered by the gate.

---

## File Upload & Download

### `upload(endpoint, file, options)`

Upload a file with optional progress callback:

```js
const response = await rest.upload('/api/files', file, {
  onProgress: (percent, loaded, total) => {
    console.log(`${percent}% uploaded (${loaded}/${total} bytes)`);
  },
  field: 'file',         // FormData field name (default: 'file')
  data: {                // Additional form fields
    description: 'Profile photo'
  }
});

if (response.success) {
  const fileUrl = response.data.data.url;
}
```

### `uploadMultipart(endpoint, fields, options)`

Upload multiple files and fields as multipart FormData:

```js
const response = await rest.uploadMultipart('/api/media', {
  title:    'My Document',
  document: documentFile,    // File object
  preview:  previewFile      // Another File object
});
```

### `download(endpoint, filename, options)`

Stream a file directly to the user's disk:

```js
await rest.download('/api/reports/export', 'report.csv', {
  method: 'POST',
  data: { format: 'csv', dateRange: '2024-01' }
});
```

If no filename is provided, the name is extracted from the `Content-Disposition` response header.

### `downloadBlob(endpoint, options)`

Download a file and return it as a `Blob` (for in-memory processing):

```js
const result = await rest.downloadBlob('/api/export');

if (result.success) {
  const blob     = result.blob;
  const filename = result.filename;

  // Process the blob
  const text = await blob.text();
  processData(text);
}
```

---

## Interceptors

Interceptors run on every request or response, allowing global transformation, logging, or auth handling.

### Request Interceptors

```js
rest.addInterceptor('request', (requestConfig) => {
  // Add a timestamp to every request
  requestConfig.headers['X-Request-Time'] = Date.now().toString();
  return requestConfig;
});
```

### Response Interceptors

```js
rest.addInterceptor('response', async (responseData) => {
  // Log all API errors in development
  if (!responseData.success) {
    console.warn('[API Error]', responseData.status, responseData.message);
  }
  return responseData;
});
```

### Multiple Interceptors

Multiple interceptors are chained in the order they are added:

```js
rest.addInterceptor('request', addTimestamp);
rest.addInterceptor('request', addCorrelationId);
// addTimestamp runs first, then addCorrelationId
```

---

## Device Tracking (DUID)

`Rest` automatically generates a **Device Unique ID (DUID)** — a UUID v4 — on first use and persists it in `localStorage`. This ID is sent with every request to help your backend correlate requests from the same device.

```
localStorage key: 'mojo_device_uid'
Default header:   'X-Mojo-UID: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
```

### Configuration

```js
rest.configure({
  trackDevice:   true,           // Enable/disable tracking (default: true)
  duidHeader:    'X-Device-ID', // Custom header name
  duidTransport: 'header'       // 'header' or 'payload'
});
```

### Disabling Tracking

```js
rest.configure({ trackDevice: false });
```

### Accessing the DUID

```js
const deviceId = rest.duid;
```

---

## URL Building

### `buildUrl(url)`

Resolves a URL against the configured `baseURL`:

```js
rest.configure({ baseURL: 'https://api.example.com' });

rest.buildUrl('/api/users');
// → 'https://api.example.com/api/users'

rest.buildUrl('https://other.com/api');
// → 'https://other.com/api' (absolute URLs pass through unchanged)
```

### `buildQueryString(params)`

Serialize an object to a URL query string:

```js
rest.buildQueryString({ page: 2, filter: 'active', tags: ['a', 'b'] });
// → '?page=2&filter=active&tags=a&tags=b'
```

---

## API Reference

### Configuration

| Method | Description |
|---|---|
| `configure(config)` | Merge configuration into the client |
| `addInterceptor(type, fn)` | Add a `'request'` or `'response'` interceptor |

### Request Methods

| Method | Description |
|---|---|
| `GET(endpoint, params, options)` | HTTP GET with optional query parameters |
| `POST(endpoint, data, options)` | HTTP POST with JSON body |
| `PUT(endpoint, data, options)` | HTTP PUT with JSON body |
| `PATCH(endpoint, data, options)` | HTTP PATCH with JSON body |
| `DELETE(endpoint, data, options)` | HTTP DELETE |
| `request(method, endpoint, data, options)` | Generic HTTP request |

### File Methods

| Method | Description |
|---|---|
| `upload(endpoint, file, options)` | Upload a file with progress callback |
| `uploadMultipart(endpoint, fields, options)` | Upload multiple fields as FormData |
| `download(endpoint, filename, options)` | Stream file to user's disk |
| `downloadBlob(endpoint, options)` | Download file and return as Blob |

### Auth Methods

| Method | Description |
|---|---|
| `setAuthToken(token, type)` | Set `Authorization: Bearer <token>` header |
| `clearAuth()` | Remove Authorization header |

### URL Methods

| Method | Description |
|---|---|
| `buildUrl(url)` | Resolve relative URL against baseURL |
| `buildQueryString(params)` | Serialize object to query string |

### Error Methods

| Method | Description |
|---|---|
| `categorizeError(error, status)` | Returns `{ reason, message }` for an error |
| `getUserMessage(reason)` | Get user-friendly string for a reason code |
| `isRetryableError(reason)` | Returns `true` for transient errors |
| `isNetworkError(reason)` | Returns `true` for connectivity errors |
| `requiresAuth(reason)` | Returns `true` for `'unauthorized'` |

### Instance Properties

| Property | Type | Description |
|---|---|---|
| `config` | `object` | Current configuration |
| `config.baseURL` | `string` | Base URL prepended to all relative paths |
| `config.timeout` | `number` | Default request timeout (ms) |
| `config.headers` | `object` | Default headers sent with every request |
| `config.trackDevice` | `boolean` | Whether to send the DUID header |
| `config.duidHeader` | `string` | Header name for the device ID |
| `interceptors.request` | `array` | Registered request interceptors |
| `interceptors.response` | `array` | Registered response interceptors |
| `duid` | `string` | The device unique ID |

---

## Common Patterns

### Standard CRUD helper

```js
class UserService {
  async getAll(params = {}) {
    const resp = await rest.GET('/api/user', params);
    if (!resp.success || !resp.data.status) throw new Error(resp.message || resp.data?.error);
    return resp.data.data;
  }

  async getById(id) {
    const resp = await rest.GET(`/api/user/${id}`);
    if (!resp.success || !resp.data.status) throw new Error(resp.message || resp.data?.error);
    return resp.data.data;
  }

  async create(data) {
    const resp = await rest.POST('/api/user', data);
    if (!resp.success || !resp.data.status) throw new Error(resp.message || resp.data?.error);
    return resp.data.data;
  }

  async update(id, data) {
    const resp = await rest.PATCH(`/api/user/${id}`, data);
    if (!resp.success || !resp.data.status) throw new Error(resp.message || resp.data?.error);
    return resp.data.data;
  }

  async remove(id) {
    const resp = await rest.DELETE(`/api/user/${id}`);
    if (!resp.success || !resp.data.status) throw new Error(resp.message || resp.data?.error);
    return true;
  }
}
```

### File Upload with Progress UI

```js
class FileUploadView extends View {
  async onActionUploadFile(event, element) {
    const input = this.element.querySelector('input[type="file"]');
    const file  = input.files[0];
    if (!file) return;

    this.progress = 0;
    this.uploading = true;
    await this.render();

    const response = await rest.upload('/api/files/upload', file, {
      onProgress: (percent) => {
        this.progress = percent;
        this.render();
      }
    });

    this.uploading = false;

    if (response.success && response.data.status) {
      this.fileUrl = response.data.data.url;
      this.getApp().toast?.success('File uploaded successfully!');
    } else {
      this.getApp().showError(response.message || 'Upload failed');
    }

    await this.render();
  }
}
```

### Abort a Long-Running Request

```js
class SearchView extends View {
  async onChangeSearchFilter(event, element) {
    // Cancel any in-flight search
    this._searchAbort?.abort();
    this._searchAbort = new AbortController();

    const query = element.value;

    const resp = await rest.GET('/api/search', { q: query }, {
      signal: this._searchAbort.signal
    });

    if (resp.reason === 'cancelled') return; // Ignore aborted requests

    this.results = resp.data?.data || [];
    await this.render();
  }
}
```

### Response Interceptor for Global Auth Handling

```js
// In your app startup, before any requests
rest.addInterceptor('response', async (responseData) => {
  if (responseData.status === 401) {
    // Token expired — clear session and redirect to login
    app.events.emit('auth:unauthorized');
  }
  return responseData;
});
```

### Logging All Failed Requests in Development

```js
if (process.env.NODE_ENV === 'development') {
  rest.addInterceptor('response', (responseData) => {
    if (!responseData.success) {
      console.group(`[REST ERROR] ${responseData.status}`);
      console.log('Reason:',  responseData.reason);
      console.log('Message:', responseData.message);
      console.log('Data:',    responseData.data);
      console.groupEnd();
    }
    return responseData;
  });
}
```

---

## Common Pitfalls

### ⚠️ Only checking `response.success` (missing server-level check)

```js
// ❌ WRONG — response.success is true for any 2xx response,
//            even if your API returned { status: false, error: '...' }
const resp = await rest.GET('/api/user/42');
if (resp.success) {
  this.user = resp.data; // This might be { status: false, error: 'Not found' }
}

// ✅ CORRECT — check both levels
const resp = await rest.GET('/api/user/42');
if (resp.success && resp.data.status) {
  this.user = resp.data.data;
}
```

### ⚠️ Calling configure() after requests have already been made

```js
// ❌ WRONG — REST client is used by models before configure() is called
const user = new User({ id: 1 });
await user.fetch(); // baseURL is '' — request goes to relative path

rest.configure({ baseURL: 'https://api.example.com' });

// ✅ CORRECT — configure before any model usage
rest.configure({ baseURL: 'https://api.example.com' });

const user = new User({ id: 1 });
await user.fetch(); // Now uses correct base URL
```

### ⚠️ Not awaiting upload before checking the response

```js
// ❌ WRONG
rest.upload('/api/files', file); // Fire and forget — can't check result
doSomethingAfter();

// ✅ CORRECT
const response = await rest.upload('/api/files', file);
if (response.success) doSomethingAfter();
```

### ⚠️ Forgetting to handle cancelled requests

```js
// ❌ WRONG — treats aborted requests as errors
const resp = await rest.GET('/api/search', { q: query }, { signal });
if (!resp.success) {
  showError(resp.message); // Shows "Request was cancelled" to the user
}

// ✅ CORRECT — bail out silently on cancellation
const resp = await rest.GET('/api/search', { q: query }, { signal });
if (resp.reason === 'cancelled') return;
if (!resp.success) showError(resp.message);
```

### ⚠️ Sending auth token before configure()

```js
// ❌ WRONG — setAuthToken() stores the token in headers,
//            but if configure() replaces headers, the token is lost
rest.setAuthToken('my-token');
rest.configure({ headers: { 'X-Custom': 'value' } }); // Merges but check order

// ✅ CORRECT — configure first, then set auth token
rest.configure({ baseURL: '...', headers: { 'X-Custom': 'value' } });
rest.setAuthToken('my-token');
```

---

## Related Documentation

- **[Model](../core/Model.md)** — Uses `rest` for all CRUD operations
- **[Collection](../core/Collection.md)** — Uses `rest` for list fetching
- **[WebApp](../core/WebApp.md)** — Configures `rest` via the `api` constructor option
- **[PortalApp](../core/PortalApp.md)** — Manages auth tokens and calls `rest.setAuthToken()`
- **[WebSocketClient](./WebSocketClient.md)** — Real-time counterpart to REST communication
- **[ToastService](./ToastService.md)** — For showing upload/error feedback to users

## Examples

<!-- examples:cross-link begin -->

Runnable, copy-paste reference in the examples portal:

- [`examples/portal/examples/services/Rest/RestExample.js`](../../../examples/portal/examples/services/Rest/RestExample.js) — HTTP client: GET/POST/PUT/DELETE, file upload/download, interceptors.

<!-- examples:cross-link end -->
