/**
 * Deprecated: Legacy ForgotPasswordPage has been removed.
 *
 * The old auth pages (ForgotPasswordPage, LoginPage, RegisterPage, ResetPasswordPage) are no longer used.
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
 *   await auth.forgot({ email, method: 'code' }); // or 'link'
 *
 * This module intentionally throws on use to prevent accidental reliance on legacy APIs.
 */
const DEPRECATION_MESSAGE =
  'ForgotPasswordPage is removed. Use mountAuth() or createAuthClient() from "web-mojo/auth".';

export default class ForgotPasswordPage {
  static pageName = 'forgot-password';
  static title = 'Forgot Password';
  static route = '/forgot-password';

  constructor() {
    throw new Error(DEPRECATION_MESSAGE);
  }
}

export { ForgotPasswordPage };