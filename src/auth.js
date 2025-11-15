/**
 * Simple Auth package entry (KISS)
 * Exposes:
 *  - mountAuth(container, options)
 *  - createAuthClient({ baseURL, ... })
 *
 * This replaces the legacy AuthApp/AuthManager API.
 */

export { mountAuth, createAuthClient } from '@ext/auth/index.js';

// Optional default export for convenience: import Auth from 'web-mojo/auth';
import * as SimpleAuth from '@ext/auth/index.js';
export default SimpleAuth;

// Version info passthrough (kept for tooling and diagnostics)
export {
  VERSION_INFO,
  VERSION,
  VERSION_MAJOR,
  VERSION_MINOR,
  VERSION_REVISION,
  BUILD_TIME
} from './version.js';