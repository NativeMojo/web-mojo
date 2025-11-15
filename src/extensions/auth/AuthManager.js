/**
 * Deprecated: AuthManager
 *
 * The legacy AuthManager has been removed in favor of a simpler, framework-agnostic API.
 *
 * Use the new Simple Auth API:
 *
 *   import { createAuthClient, mountAuth } from 'web-mojo/auth';
 *
 *   // Imperative client (no UI)
 *   const auth = createAuthClient({ baseURL: '/api' });
 *   await auth.login(username, password);
 *
 *   // Or mount the complete UI (sign-in, forgot/reset flows)
 *   mountAuth(document.getElementById('auth-root'), {
 *     baseURL: '/api',
 *     onSuccessRedirect: '/',
 *     branding: { title: 'My App', logoUrl: null, subtitle: 'Sign in' }
 *   });
 *
 * This file remains only to fail fast and guide migrations.
 */

const DEPRECATION_MESSAGE =
  'AuthManager has been removed. Use createAuthClient() or mountAuth() from "web-mojo/auth".';

export default class AuthManager {
  constructor() {
    throw new Error(DEPRECATION_MESSAGE);
  }

  // The following methods are preserved to provide clearer runtime errors if called.
  initialize()            { throw new Error(DEPRECATION_MESSAGE); }
  checkAuthState()        { throw new Error(DEPRECATION_MESSAGE); }
  login()                 { throw new Error(DEPRECATION_MESSAGE); }
  register()              { throw new Error(DEPRECATION_MESSAGE); }
  logout()                { throw new Error(DEPRECATION_MESSAGE); }
  refreshToken()          { throw new Error(DEPRECATION_MESSAGE); }
  setAuthState()          { throw new Error(DEPRECATION_MESSAGE); }
  clearAuthState()        { throw new Error(DEPRECATION_MESSAGE); }
  scheduleTokenRefresh()  { throw new Error(DEPRECATION_MESSAGE); }
  registerPlugin()        { throw new Error(DEPRECATION_MESSAGE); }
  getPlugin()             { throw new Error(DEPRECATION_MESSAGE); }
  forgotPassword()        { throw new Error(DEPRECATION_MESSAGE); }
  resetPasswordWithToken(){ throw new Error(DEPRECATION_MESSAGE); }
  resetPasswordWithCode() { throw new Error(DEPRECATION_MESSAGE); }
  getAuthHeader()         { throw new Error(DEPRECATION_MESSAGE); }
  emit()                  { throw new Error(DEPRECATION_MESSAGE); }
  destroy()               { throw new Error(DEPRECATION_MESSAGE); }
}

// Also export as a named symbol to break loudly if imported by name.
export { AuthManager };