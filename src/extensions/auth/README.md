# MOJO Simple Auth (KISS)

Status: Replaces the legacy auth extension. This is a standalone, framework-agnostic authentication UI and client designed to be simple to reuse and simple to customize.

- No MOJO integration required (but can be used from any app).
- Single API: mountAuth(container, config) to render the full UI and redirect on success.
- Optional low-level client: createAuthClient({ baseURL }) if you want to bring your own HTML.

Note about legacy
- The old classes and pages (AuthApp, AuthManager, LoginPage, RegisterPage, Forgot/Reset pages) are removed/deprecated in favor of this simple module.
- Import path remains: import { mountAuth, createAuthClient } from 'web-mojo/auth'.
- If you were importing any legacy classes, replace those with mountAuth or createAuthClient.

Why this exists
- KISS: keep it small, transparent, and copy-free for end users.
- No frameworks. No event busses. No hidden magic.
- Easy to extend later (e.g., Google auth, Passkey) through config hooks.

Quick start (mountAuth)
1) Place a container in your HTML where the auth UI should render:
   - <div id="auth-root"></div>

2) Load and mount:
   - import { mountAuth } from 'web-mojo/auth'
   - const params = new URLSearchParams(location.search)
   - const redirect = params.get('redirect') || '/'
   - const apiBase = params.get('apiBase') || '/api'
   - mountAuth(document.getElementById('auth-root'), {
       baseURL: apiBase,
       onSuccessRedirect: redirect,
       branding: { title: 'My App', logoUrl: null, subtitle: 'Sign in to your account' },
       theme: 'light' // or 'dark' (optional)
     })

3) On success, the user is redirected to onSuccessRedirect.
   - You can pass redirect via URL (e.g. ?redirect=/dashboard) and forward users back to your app.

Note on CSS
- This module includes its own minimal CSS when bundled (via the module import).
- If you are not bundling and need a static stylesheet, use the styles from examples/auth2/auth.css or your own theme. The markup is plain and simple to style.

Configuration (mountAuth)
- baseURL (required): string
  - The API base (e.g., '/api' or 'https://api.example.com/api').

- onSuccessRedirect: string
  - The URL to send users to after successful login/reset.
  - If not provided, the module checks ?redirect, ?next, or ?returnTo query params.
  - Defaults to '/'.

- allowRedirectOrigins: string[] (optional)
  - An allowlist of URL origins for the final redirect to prevent open redirects.
  - If provided and the final redirect origin is not in the list, the user is redirected to '/'.

- branding: { title?: string, logoUrl?: string, subtitle?: string }
  - Display-only metadata for the header.

- theme: string (optional)
  - A class name applied to the root container. Use this to toggle dark/light or custom schemes.

- endpoints: { login?, forgot?, resetCode?, resetToken? } (optional)
  - Override endpoint paths if your API differs:
    - default login:        POST /login
    - default forgot:       POST /auth/forgot
    - default resetCode:    POST /auth/password/reset/code
    - default resetToken:   POST /auth/password/reset/token

- providers: object (optional)
  - Hooks to enable buttons/flows for third-party providers (e.g. google, passkey) without coupling the core:
    - providers.google = { onClick: ({ container, auth, redirect, showMessage }) => { /* ... */ } }
    - providers.passkey = { onClick: ({ container, auth, redirect, showMessage }) => { /* ... */ } }
  - If provided, mountAuth will render corresponding buttons and call your onClick handler.

Built-in views and flows
- Sign in (username/email + password)
- Forgot password (choose code or magic link)
- Reset with code (email + code + new password)
- Set password via magic link token (login_token in URL)

Security notes
- Prefer backend to set an HttpOnly session cookie on successful login. This makes cross-app redirects safer and avoids handling access tokens in the browser where possible.
- If you must store tokens client-side, the module writes to localStorage by default.
- Consider using allowRedirectOrigins to avoid open redirects when accepting redirect from query params.

Low-level client (createAuthClient)
- If you want to use your own HTML and wire only the API, import createAuthClient({ baseURL }).

- Methods:
  - login(username, password)
  - forgot({ email, method })            // method: 'code' | 'link'
  - resetWithCode({ email, code, newPassword })
  - resetWithToken({ token, newPassword })
  - logout()
  - isAuthenticated() -> boolean
  - getToken() -> string | null
  - getUser() -> object | null
  - getAuthHeader() -> "Bearer ..." | null
  - parseResponse(response) -> normalized payload
  - getErrorMessage(error) -> string

- Behavior:
  - Saves access_token (and refresh_token if provided) and user in localStorage.
  - parseResponse handles common API shapes (data.data, data, root).

Sample usage with a base HTML file
- <div id="auth-root"></div>
- <script type="module">
    import { mountAuth } from 'web-mojo/auth'
    const params = new URLSearchParams(location.search)
    const redirect = params.get('redirect') || '/'
    const apiBase = params.get('apiBase') || '/api'
    mountAuth(document.getElementById('auth-root'), {
      baseURL: apiBase,
      onSuccessRedirect: redirect,
      branding: { title: 'Acme Auth', logoUrl: null, subtitle: 'Welcome back' },
      theme: 'light'
    })
  </script>

Extending with providers (example outline)
- Google:
  - Provide providers.google.onClick handler that triggers your Google OAuth flow.
  - On success, set server-side cookie (recommended) or exchange for tokens and call redirect().

- Passkey:
  - Provide providers.passkey.onClick handler that triggers WebAuthn flow.
  - On success, treat similarly to login (i.e., rely on cookie or call auth.login-equivalent, then redirect()).

Deprecation and migration
- Removed/Deprecated:
  - AuthApp, AuthManager, LoginPage, RegisterPage, ForgotPasswordPage, ResetPasswordPage, and plugin scaffolding.
- Replace with:
  - mountAuth(container, { baseURL, onSuccessRedirect, ... })
  - createAuthClient({ baseURL }) if you own the HTML and just want the API.

FAQ
- Can I theme it? Yes. The HTML is very simple and shipped with a lean stylesheet. Replace or extend the CSS to match your brand.
- Can I use it without bundlers? Yes. Include a script that exposes mountAuth and include CSS; or copy the minimal CSS used in examples/auth2/auth.css.
- Can I customize endpoints? Yes. Use the endpoints override in config.
- How do I avoid open redirects? Use allowRedirectOrigins and/or avoid passing redirect from untrusted sources.

License
- MIT (same as MOJO Framework)