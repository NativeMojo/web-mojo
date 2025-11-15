/**
 * Deprecated: Legacy LoginPage has been removed.
 *
 * The old auth pages (LoginPage, RegisterPage, Forgot/Reset) are no longer used.
 * Use the new Simple Auth (KISS) module instead:
 *
 *   import { mountAuth, createAuthClient } from 'web-mojo/auth';
 *
 *   // Mount full UI (sign in + forgot/reset flows) and redirect on success:
 *   mountAuth(document.getElementById('auth-root'), {
 *     baseURL: '/api',
 *     onSuccessRedirect: '/',
 *     branding: { title: 'My App', logoUrl: null, subtitle: 'Sign in to your account' },
 *     theme: 'light'
 *   });
 *
 *   // Or use the low-level client if you have your own HTML:
 *   const auth = createAuthClient({ baseURL: '/api' });
 *   await auth.login(username, password);
 *
 * This module intentionally throws on use to prevent accidental reliance on legacy APIs.
 */

const DEPRECATION_MESSAGE =
  'LoginPage is removed. Use mountAuth() or createAuthClient() from "web-mojo/auth".';

export default class LoginPage {
  static pageName = 'login';
  static title = 'Login';
  static route = '/login';

  constructor() {
    throw new Error(DEPRECATION_MESSAGE);
  }
}

export { LoginPage };