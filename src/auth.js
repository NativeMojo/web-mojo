/**
 * MOJO Auth Extension - Entry (2.1.0)
 */

// Bundle auth CSS
import '@ext/auth/css/auth.css';



export { default as AuthApp } from '@ext/auth/AuthApp.js';
export { default as AuthManager } from '@ext/auth/AuthManager.js';

// Auth Pages
export { default as LoginPage } from '@ext/auth/pages/LoginPage.js';
export { default as RegisterPage } from '@ext/auth/pages/RegisterPage.js';
export { default as ForgotPasswordPage } from '@ext/auth/pages/ForgotPasswordPage.js';
export { default as ResetPasswordPage } from '@ext/auth/pages/ResetPasswordPage.js';

// Auth Plugins
export { default as PasskeyPlugin } from '@ext/auth/plugins/PasskeyPlugin.js';

// Convenience
export { default as WebApp } from '@core/WebApp.js';

// Version info passthrough
export {
  VERSION_INFO,
  VERSION,
  VERSION_MAJOR,
  VERSION_MINOR,
  VERSION_REVISION,
  BUILD_TIME
} from './version.js';