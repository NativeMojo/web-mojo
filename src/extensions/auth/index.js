/**
 * Simple Auth Module (KISS)
 * - Standalone, framework-agnostic
 * - Exposes:
 *    - createAuthClient({ baseURL }): imperative API for auth endpoints
 *    - mountAuth(container, config): renders UI and wires flows; redirects on success
 * - Future extensibility: providers (google/passkey) can be slotted via config without changing core
 */

import './css/auth.css';

/**
 * Create a minimal, framework-agnostic auth client using fetch.
 *
 * Endpoints (overridable via options.endpoints):
 *  - POST /login                        { username, password }
 *  - POST /auth/forgot                  { email, method: 'code' | 'link' }
 *  - POST /auth/password/reset/code     { email, code, new_password }
 *  - POST /auth/password/reset/token    { token, new_password }
 */
export function createAuthClient({
  baseURL,
  fetchImpl = (typeof fetch !== 'undefined' ? fetch.bind(window) : null),
  storage = (typeof localStorage !== 'undefined' ? localStorage : null),
  endpoints = {}
} = {}) {
  if (!baseURL) {
    throw new Error('createAuthClient: baseURL is required');
  }
  if (!fetchImpl) {
    throw new Error('createAuthClient: fetch implementation is not available in this environment');
  }
  if (!storage) {
    throw new Error('createAuthClient: storage (localStorage) is not available in this environment');
  }

  const KEYS = {
    access: 'access_token',
    refresh: 'refresh_token',
    user: 'user'
  };

  const EP = {
    login: '/login',
    forgot: '/auth/forgot',
    resetCode: '/auth/password/reset/code',
    resetToken: '/auth/password/reset/token',
    ...endpoints
  };

  async function post(path, body) {
    const res = await fetchImpl(`${baseURL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
    });
    let json = {};
    try {
      json = await res.json();
    } catch (_) {
      // ignore parse error; json stays {}
    }
    if (!res.ok) {
      // Preserve parsed server error shape
      throw json || { message: `Request failed with status ${res.status}` };
    }
    return json;
  }

  function parseResponse(r) {
    // Normalize common API shapes:
    // - { data: { data: {...}} }
    // - { data: {...} }
    // - {...}
    return (r && r.data && r.data.data) || (r && r.data) || r;
  }

  function saveAuthData(resp) {
    const d = parseResponse(resp);
    if (!d || !d.access_token) {
      throw new Error('No access_token in response.');
    }
    storage.setItem(KEYS.access, d.access_token);
    if (d.refresh_token) storage.setItem(KEYS.refresh, d.refresh_token);
    if (d.user) storage.setItem(KEYS.user, JSON.stringify(d.user));
  }

  function getErrorMessage(err) {
    return err?.message ||
           err?.error ||
           (Array.isArray(err?.errors) && err.errors[0]?.message) ||
           'An error occurred. Please try again.';
  }

  return {
    async login(username, password) {
      const resp = await post(EP.login, { username, password });
      saveAuthData(resp);
      return parseResponse(resp);
    },
    async forgot({ email, method }) {
      return post(EP.forgot, { email, method });
    },
    async resetWithCode({ email, code, newPassword }) {
      const resp = await post(EP.resetCode, { email, code, new_password: newPassword });
      saveAuthData(resp);
      return parseResponse(resp);
    },
    async resetWithToken({ token, newPassword }) {
      const resp = await post(EP.resetToken, { token, new_password: newPassword });
      saveAuthData(resp);
      return parseResponse(resp);
    },
    logout() {
      storage.removeItem(KEYS.access);
      storage.removeItem(KEYS.refresh);
      storage.removeItem(KEYS.user);
    },
    isAuthenticated() {
      return !!storage.getItem(KEYS.access);
    },
    getToken() {
      return storage.getItem(KEYS.access);
    },
    getUser() {
      const raw = storage.getItem(KEYS.user);
      try { return raw ? JSON.parse(raw) : null; } catch { return null; }
    },
    getAuthHeader() {
      const t = storage.getItem(KEYS.access);
      return t ? `Bearer ${t}` : null;
    },
    getErrorMessage,
    parseResponse
  };
}

/**
 * Mount the full auth UI into a container element with flows:
 * - Sign in
 * - Forgot password (code or link)
 * - Reset with code
 * - Set password via magic link token (login_token from URL)
 *
 * Options:
 *  - baseURL: string (required)
 *  - onSuccessRedirect: string (final URL after successful login/reset)
 *  - allowRedirectOrigins: string[] (optional allowlist of origins to prevent open redirects)
 *  - branding: { title?: string, logoUrl?: string, subtitle?: string }
 *  - theme: 'light' | 'dark' | string (added as a class on the root container)
 *  - endpoints: override endpoints { login, forgot, resetCode, resetToken }
 *  - providers: optional object for future extensions (e.g., { google: { onClick } })
 *  - texts: replace labels/copy if needed
 */
export function mountAuth(container, options = {}) {
  if (!container || !(container instanceof Element)) {
    throw new Error('mountAuth: container must be a DOM Element');
  }

  const {
    baseURL,
    onSuccessRedirect,
    allowRedirectOrigins,
    branding = {},
    theme,
    endpoints,
    providers,
    texts = {}
  } = options;

  if (!baseURL) {
    throw new Error('mountAuth: baseURL is required');
  }

  // Resolve redirect target from:
  // 1) options.onSuccessRedirect
  // 2) ?redirect | ?next | ?returnTo
  // Default to '/'
  const urlParams = new URLSearchParams(window.location.search);
  const redirectParam = urlParams.get('redirect') || urlParams.get('next') || urlParams.get('returnTo');
  const redirectTarget = String(onSuccessRedirect || redirectParam || '/');

  function isAllowedRedirect(url) {
    // If no allowlist, allow any same-origin or absolute URLs (caller responsibility).
    if (!allowRedirectOrigins || allowRedirectOrigins.length === 0) {
      return true;
    }
    try {
      const target = new URL(url, window.location.origin);
      return allowRedirectOrigins.includes(target.origin);
    } catch {
      return false;
    }
  }

  function performRedirect() {
    if (!isAllowedRedirect(redirectTarget)) {
      window.location.href = '/';
      return;
    }
    window.location.href = redirectTarget.startsWith('http')
      ? redirectTarget
      : new URL(redirectTarget, window.location.origin).href;
  }

  const auth = createAuthClient({ baseURL, endpoints });

  // Basic UI template (no external framework; styles provided via imported CSS)
  const B = {
    title: branding.title || 'Sign In',
    subtitle: branding.subtitle || 'Sign in to your account',
    logoUrl: branding.logoUrl || ''
  };

  const T = {
    emailOrUsername: texts.emailOrUsername || 'Email or Username',
    password: texts.password || 'Password',
    signIn: texts.signIn || 'Sign In',
    forgotPassword: texts.forgotPassword || 'Forgot password?',
    resetYourPassword: texts.resetYourPassword || 'Reset Your Password',
    emailAddress: texts.emailAddress || 'Email Address',
    resetMethod: texts.resetMethod || 'Reset Method',
    emailCode: texts.emailCode || 'Email me a code',
    emailLink: texts.emailLink || 'Email me a magic link',
    sendReset: texts.sendReset || 'Send Reset',
    back: texts.back || 'Back',
    enterResetCode: texts.enterResetCode || 'Enter Reset Code',
    weSentCodeTo: texts.weSentCodeTo || 'We sent a code to',
    resetCode: texts.resetCode || 'Reset Code',
    newPassword: texts.newPassword || 'New Password',
    confirmPassword: texts.confirmPassword || 'Confirm Password',
    resetPassword: texts.resetPassword || 'Reset Password',
    setYourNewPassword: texts.setYourNewPassword || 'Set Your New Password',
    setPassword: texts.setPassword || 'Set Password',
    invalidCredentials: texts.invalidCredentials || 'Invalid credentials.',
    successRedirecting: texts.successRedirecting || 'Success! Redirecting...',
    pleaseFillAllFields: texts.pleaseFillAllFields || 'Please fill in all fields.',
    passwordsDoNotMatch: texts.passwordsDoNotMatch || 'Passwords do not match.',
  };

  const HTML = `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          ${B.logoUrl ? `<img src="${B.logoUrl}" alt="${B.title}" style="max-height:60px;margin-bottom:10px" />` : ''}
          <h1 class="auth-title">${B.title}</h1>
          <p class="auth-subtitle">${B.subtitle}</p>
        </div>

        <div id="status-message" class="alert" role="status" style="display:none;"></div>

        <!-- Sign In View -->
        <div id="view-signin" class="auth-view">
          <form id="form-signin" novalidate>
            <div class="mb-3">
              <label for="signin-username" class="form-label">${T.emailOrUsername}</label>
              <input type="text" class="form-control" id="signin-username" placeholder="${T.emailOrUsername}" autocomplete="username" required />
            </div>
            <div class="mb-3">
              <label for="signin-password" class="form-label">${T.password}</label>
              <input type="password" class="form-control" id="signin-password" placeholder="${T.password}" autocomplete="current-password" required />
            </div>
            <button type="submit" class="btn btn-primary w-100 mb-3" id="btn-signin">
              <span class="btn-text">${T.signIn}</span>
              <span class="btn-spinner spinner-border spinner-border-sm" style="display:none;"></span>
            </button>
            <div class="text-center">
              <a href="#" id="link-forgot" class="text-decoration-none">${T.forgotPassword}</a>
            </div>

            ${(providers && (providers.google || providers.passkey)) ? `
              <div class="position-relative my-3">
                <hr class="text-muted" />
                <span class="position-absolute top-50 start-50 translate-middle bg-white px-3 text-muted small">OR</span>
              </div>
              <div class="d-grid gap-2">
                ${providers.google ? `<button type="button" class="btn btn-outline-primary" id="btn-google"><i class="bi bi-google me-2"></i>Continue with Google</button>` : ''}
                ${providers.passkey ? `<button type="button" class="btn btn-outline-secondary" id="btn-passkey"><i class="bi bi-fingerprint me-2"></i>Sign in with Passkey</button>` : ''}
              </div>
            ` : ''}
          </form>
        </div>

        <!-- Forgot Password View -->
        <div id="view-forgot" class="auth-view" style="display:none;">
          <button type="button" class="btn btn-link p-0 mb-3" id="btn-back-signin">
            <span aria-hidden="true">←</span> ${T.back}
          </button>
          <h2 class="h5 mb-3">${T.resetYourPassword}</h2>
          <form id="form-forgot" novalidate>
            <div class="mb-3">
              <label for="forgot-email" class="form-label">${T.emailAddress}</label>
              <input type="email" class="form-control" id="forgot-email" placeholder="${T.emailAddress}" autocomplete="email" required />
            </div>
            <div class="mb-3">
              <label class="form-label">${T.resetMethod}</label>
              <div class="form-check">
                <input class="form-check-input" type="radio" name="reset-method" id="method-code" value="code" checked />
                <label class="form-check-label" for="method-code">${T.emailCode}</label>
              </div>
              <div class="form-check">
                <input class="form-check-input" type="radio" name="reset-method" id="method-link" value="link" />
                <label class="form-check-label" for="method-link">${T.emailLink}</label>
              </div>
            </div>
            <button type="submit" class="btn btn-primary w-100" id="btn-forgot">
              <span class="btn-text">${T.sendReset}</span>
              <span class="btn-spinner spinner-border spinner-border-sm" style="display:none;"></span>
            </button>
          </form>
        </div>

        <!-- Reset with Code View -->
        <div id="view-reset-code" class="auth-view" style="display:none;">
          <button type="button" class="btn btn-link p-0 mb-3" id="btn-back-forgot">
            <span aria-hidden="true">←</span> ${T.back}
          </button>
          <h2 class="h5 mb-3">${T.enterResetCode}</h2>
          <p class="text-muted small mb-3">${T.weSentCodeTo} <strong id="reset-email-display"></strong></p>
          <form id="form-reset-code" novalidate>
            <div class="mb-3">
              <label for="reset-code" class="form-label">${T.resetCode}</label>
              <input type="text" class="form-control" id="reset-code" placeholder="${T.resetCode}" required />
            </div>
            <div class="mb-3">
              <label for="reset-password" class="form-label">${T.newPassword}</label>
              <input type="password" class="form-control" id="reset-password" placeholder="${T.newPassword}" autocomplete="new-password" required />
            </div>
            <div class="mb-3">
              <label for="reset-password-confirm" class="form-label">${T.confirmPassword}</label>
              <input type="password" class="form-control" id="reset-password-confirm" placeholder="${T.confirmPassword}" autocomplete="new-password" required />
            </div>
            <button type="submit" class="btn btn-primary w-100" id="btn-reset-code">
              <span class="btn-text">${T.resetPassword}</span>
              <span class="btn-spinner spinner-border spinner-border-sm" style="display:none;"></span>
            </button>
          </form>
        </div>

        <!-- Set Password via Magic Link View -->
        <div id="view-set-password" class="auth-view" style="display:none;">
          <h2 class="h5 mb-3">${T.setYourNewPassword}</h2>
          <form id="form-set-password" novalidate>
            <div class="mb-3">
              <label for="set-password" class="form-label">${T.newPassword}</label>
              <input type="password" class="form-control" id="set-password" placeholder="${T.newPassword}" autocomplete="new-password" required />
            </div>
            <div class="mb-3">
              <label for="set-password-confirm" class="form-label">${T.confirmPassword}</label>
              <input type="password" class="form-control" id="set-password-confirm" placeholder="${T.confirmPassword}" autocomplete="new-password" required />
            </div>
            <button type="submit" class="btn btn-primary w-100" id="btn-set-password">
              <span class="btn-text">${T.setPassword}</span>
              <span class="btn-spinner spinner-border spinner-border-sm" style="display:none;"></span>
            </button>
          </form>
        </div>
      </div>
    </div>
  `;

  // Render
  container.innerHTML = HTML;
  if (theme) {
    container.classList.add(String(theme));
  }

  // DOM refs
  const els = {
    views: {
      signin: container.querySelector('#view-signin'),
      forgot: container.querySelector('#view-forgot'),
      resetCode: container.querySelector('#view-reset-code'),
      setPassword: container.querySelector('#view-set-password')
    },
    forms: {
      signin: container.querySelector('#form-signin'),
      forgot: container.querySelector('#form-forgot'),
      resetCode: container.querySelector('#form-reset-code'),
      setPassword: container.querySelector('#form-set-password')
    },
    buttons: {
      signin: container.querySelector('#btn-signin'),
      forgot: container.querySelector('#btn-forgot'),
      resetCode: container.querySelector('#btn-reset-code'),
      setPassword: container.querySelector('#btn-set-password'),
      backSignin: container.querySelector('#btn-back-signin'),
      backForgot: container.querySelector('#btn-back-forgot'),
      google: container.querySelector('#btn-google'),
      passkey: container.querySelector('#btn-passkey')
    },
    inputs: {
      signinUsername: container.querySelector('#signin-username'),
      signinPassword: container.querySelector('#signin-password'),
      forgotEmail: container.querySelector('#forgot-email'),
      resetCode: container.querySelector('#reset-code'),
      resetPassword: container.querySelector('#reset-password'),
      resetPasswordConfirm: container.querySelector('#reset-password-confirm'),
      setPassword: container.querySelector('#set-password'),
      setPasswordConfirm: container.querySelector('#set-password-confirm')
    },
    radios: {
      resetMethodCode: container.querySelector('#method-code'),
      resetMethodLink: container.querySelector('#method-link')
    },
    labels: {
      resetEmailDisplay: container.querySelector('#reset-email-display')
    },
    links: {
      forgot: container.querySelector('#link-forgot')
    },
    message: container.querySelector('#status-message')
  };

  // Utility helpers
  function showView(name) {
    Object.entries(els.views).forEach(([key, el]) => {
      if (el) el.style.display = key === name ? 'block' : 'none';
    });
    // Focus management
    setTimeout(() => {
      const view = els.views[name];
      const heading = view?.querySelector('h1, h2, .auth-title, .h5');
      if (heading) {
        heading.setAttribute('tabindex', '-1');
        heading.focus?.();
      } else {
        const firstInput = view?.querySelector('input, button');
        firstInput?.focus?.();
      }
    }, 60);
  }

  function showMessage(message, type = 'info') {
    const el = els.message;
    if (!el) return;
    el.textContent = message;
    el.className = `alert alert-${type}`;
    el.style.display = 'block';
    el.setAttribute('role', type === 'danger' ? 'alert' : 'status');
  }

  function hideMessage() {
    const el = els.message;
    if (!el) return;
    el.style.display = 'none';
  }

  function setButtonLoading(button, loading) {
    if (!button) return;
    const textSpan = button.querySelector('.btn-text');
    const spinner = button.querySelector('.btn-spinner');

    button.disabled = !!loading;
    if (textSpan) textSpan.style.display = loading ? 'none' : 'inline';
    if (spinner) spinner.style.display = loading ? 'inline-block' : 'none';
  }

  function getResetMethod() {
    if (els.radios.resetMethodCode?.checked) return 'code';
    if (els.radios.resetMethodLink?.checked) return 'link';
    return 'code';
  }

  // Handlers
  async function handleSignin(e) {
    e?.preventDefault?.();
    hideMessage();

    const username = els.inputs.signinUsername?.value?.trim();
    const password = els.inputs.signinPassword?.value;

    if (!username || !password) {
      showMessage('Please enter both username and password.', 'danger');
      return;
    }

    setButtonLoading(els.buttons.signin, true);
    try {
      await auth.login(username, password);
      showMessage(`${T.successRedirecting}`, 'success');
      setTimeout(performRedirect, 350);
    } catch (err) {
      showMessage(auth.getErrorMessage(err) || T.invalidCredentials, 'danger');
      setButtonLoading(els.buttons.signin, false);
    }
  }

  async function handleForgot(e) {
    e?.preventDefault?.();
    hideMessage();

    const email = els.inputs.forgotEmail?.value?.trim();
    const method = getResetMethod();

    if (!email) {
      showMessage('Please enter your email address.', 'danger');
      return;
    }

    setButtonLoading(els.buttons.forgot, true);
    try {
      await auth.forgot({ email, method });

      if (method === 'code') {
        sessionStorage.setItem('reset_email', email);
        sessionStorage.setItem('reset_method', method);
        if (els.labels.resetEmailDisplay) els.labels.resetEmailDisplay.textContent = email;
        showView('resetCode');
        showMessage('Reset code sent! Check your email.', 'success');
      } else {
        showMessage('Magic link sent! Check your email and click the link.', 'success');
      }
    } catch (err) {
      showMessage(auth.getErrorMessage(err) || 'Something went wrong. Please try again.', 'danger');
    } finally {
      setButtonLoading(els.buttons.forgot, false);
    }
  }

  async function handleResetCode(e) {
    e?.preventDefault?.();
    hideMessage();

    const code = els.inputs.resetCode?.value?.trim();
    const newPassword = els.inputs.resetPassword?.value;
    const confirmPassword = els.inputs.resetPasswordConfirm?.value;
    const email = sessionStorage.getItem('reset_email');

    if (!email) {
      showMessage('Session expired. Please restart the password reset process.', 'danger');
      showView('forgot');
      return;
    }

    if (!code || !newPassword) {
      showMessage(T.pleaseFillAllFields, 'danger');
      return;
    }
    if (newPassword !== confirmPassword) {
      showMessage(T.passwordsDoNotMatch, 'danger');
      return;
    }

    setButtonLoading(els.buttons.resetCode, true);
    try {
      await auth.resetWithCode({ email, code, newPassword });
      sessionStorage.removeItem('reset_email');
      sessionStorage.removeItem('reset_method');
      showMessage(T.successRedirecting, 'success');
      setTimeout(performRedirect, 350);
    } catch (err) {
      showMessage(auth.getErrorMessage(err) || 'Invalid code or code expired.', 'danger');
      setButtonLoading(els.buttons.resetCode, false);
    }
  }

  async function handleSetPassword(e) {
    e?.preventDefault?.();
    hideMessage();

    const newPassword = els.inputs.setPassword?.value;
    const confirmPassword = els.inputs.setPasswordConfirm?.value;
    const token = sessionStorage.getItem('login_token');

    if (!token) {
      showMessage('Invalid or expired link. Please request a new one.', 'danger');
      showView('forgot');
      return;
    }
    if (!newPassword) {
      showMessage('Please enter a new password.', 'danger');
      return;
    }
    if (newPassword !== confirmPassword) {
      showMessage(T.passwordsDoNotMatch, 'danger');
      return;
    }

    setButtonLoading(els.buttons.setPassword, true);
    try {
      await auth.resetWithToken({ token, newPassword });
      sessionStorage.removeItem('login_token');
      showMessage(T.successRedirecting, 'success');
      setTimeout(performRedirect, 350);
    } catch (err) {
      showMessage(auth.getErrorMessage(err) || 'Invalid or expired link.', 'danger');
      setButtonLoading(els.buttons.setPassword, false);
    }
  }

  // Navigation
  function goToForgot(e) {
    e?.preventDefault?.();
    hideMessage();
    showView('forgot');
  }
  function backToSignin() {
    hideMessage();
    showView('signin');
  }
  function backToForgot() {
    hideMessage();
    showView('forgot');
  }

  // Provider buttons (future extensibility)
  function bindProviders() {
    if (providers?.google && els.buttons.google) {
      els.buttons.google.addEventListener('click', (e) => {
        e?.preventDefault?.();
        providers.google.onClick?.({ container, auth, redirect: performRedirect, showMessage });
      });
    }
    if (providers?.passkey && els.buttons.passkey) {
      els.buttons.passkey.addEventListener('click', (e) => {
        e?.preventDefault?.();
        providers.passkey.onClick?.({ container, auth, redirect: performRedirect, showMessage });
      });
    }
  }

  // Wire events
  els.forms.signin?.addEventListener('submit', handleSignin);
  els.forms.forgot?.addEventListener('submit', handleForgot);
  els.forms.resetCode?.addEventListener('submit', handleResetCode);
  els.forms.setPassword?.addEventListener('submit', handleSetPassword);
  els.links.forgot?.addEventListener('click', goToForgot);
  els.buttons.backSignin?.addEventListener('click', backToSignin);
  els.buttons.backForgot?.addEventListener('click', backToForgot);

  bindProviders();

  // Initialize view based on URL token (magic link flow)
  (function init() {
    // Check magic link token
    const params = new URLSearchParams(window.location.search);
    const loginToken = params.get('login_token');

    if (loginToken) {
      sessionStorage.setItem('login_token', loginToken);

      // Clean URL (remove login_token)
      params.delete('login_token');
      const newUrl = params.toString()
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname;
      window.history.replaceState({}, '', newUrl);

      showView('setPassword');
      showMessage('Please set your new password.', 'info');
      return;
    }

    // If forgot flow was started (code method)
    const resetEmail = sessionStorage.getItem('reset_email');
    if (resetEmail) {
      if (els.labels.resetEmailDisplay) els.labels.resetEmailDisplay.textContent = resetEmail;
      showView('resetCode');
      return;
    }

    // Default view
    showView('signin');
  })();

  // Return unmount/destroy function for cleanup
  return {
    destroy() {
      els.forms.signin?.removeEventListener('submit', handleSignin);
      els.forms.forgot?.removeEventListener('submit', handleForgot);
      els.forms.resetCode?.removeEventListener('submit', handleResetCode);
      els.forms.setPassword?.removeEventListener('submit', handleSetPassword);
      els.links.forgot?.removeEventListener('click', goToForgot);
      els.buttons.backSignin?.removeEventListener('click', backToSignin);
      els.buttons.backForgot?.removeEventListener('click', backToForgot);
      if (providers?.google && els.buttons.google) {
        els.buttons.google.replaceWith(els.buttons.google.cloneNode(true));
      }
      if (providers?.passkey && els.buttons.passkey) {
        els.buttons.passkey.replaceWith(els.buttons.passkey.cloneNode(true));
      }
      container.innerHTML = '';
    }
  };
}

export default {
  mountAuth,
  createAuthClient
};