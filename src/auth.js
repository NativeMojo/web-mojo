/**
 * MOJO Auth Extension - Authentication Entry Point
 * Minimal auth module exports - AuthApp handles everything else
 * Package: web-mojo/auth
 */

// Import auth-specific CSS
import './css/auth.css';

// Import version information
import { VERSION_INFO, VERSION, VERSION_MAJOR, VERSION_MINOR, VERSION_REVISION, BUILD_TIME } from './version.js';

// Core auth functionality - handles all auth features internally
export { default as AuthApp, setupAuth, requireAuth } from './auth/AuthApp.js';

// Optional passkey authentication plugin
export { default as PasskeyPlugin } from './auth/plugins/PasskeyPlugin.js';

// WebApp directly from source (avoid loading entire framework)
export { default as WebApp } from './app/WebApp.js';

export { VERSION_INFO, VERSION, VERSION_MAJOR, VERSION_MINOR, VERSION_REVISION, BUILD_TIME };
