# Simple Auth Page (mountAuth)

Status: Replaces the legacy `web-mojo/auth` module. This is a tiny, framework-agnostic authentication UI and client that you can drop into any app. It renders a login + forgot/reset UI and redirects on success. KISS.

- No MOJO integration required.
- No frameworks required.
- Import-and-mount in any vanilla HTML page.
- Easy to extend later (Google OAuth, Passkeys) without changing the core.

---

## Flows provided

- Sign in with username/email + password
- Forgot password (code or magic link)
- Reset with code (email + code + new password)
- Set password via magic link token (uses `login_token` from URL)

---

## Quick start

Base HTML file (one container + one script). No frameworks required; CSS ships with the module import when bundling. If you are not using a bundler, see the CSS section below.

    <!doctype html>
    <meta charset="utf-8" />
    <title>Sign In</title>

    <div id="auth-root"></div>

    <script type="module">
      import { mountAuth } from 'web-mojo/auth';

      // Read config from URL params (or hardcode)
      const params = new URLSearchParams(location.search);
      const redirect = params.get('redirect')
                    || params.get('next')
                    || params.get('returnTo')
                    || '/';
      const apiBase = params.get('apiBase') || '/api';

      mountAuth(document.getElementById('auth-root'), {
        baseURL: apiBase,
        onSuccessRedirect: redirect,
        branding: {
          title: params.get('brand') || 'My App',
          logoUrl: params.get('logo') || null,
          subtitle: 'Sign in to your account'
        },
        theme: params.get('theme') || 'light'
      });
    </script>

On success, the user is redirected to the `onSuccessRedirect` URL (or the `?redirect` param if you didn’t pass one).

---

## CSS

- If you’re bundling: the `web-mojo/auth` module imports its CSS automatically. No extra work needed.
- If you’re NOT bundling: copy the CSS file from the package into your static assets and include it with a <link> tag, or reuse your own styles. The HTML markup is intentionally simple to restyle.

Visually, this module:
- Doesn’t depend on Bootstrap or any other CSS framework.
- Defines minimal utility classes within its own `.auth-container` scope (`.btn`, `.spinner-border`, etc.).
- Allows overriding themes by editing CSS variables (see the file for `--auth-*` variables).

---

## API: mountAuth(container, options)

    mountAuth(
      container: Element,
      options?: {
        baseURL: string,                        // Required. API base (e.g. "/api", "https://api.example.com/api")
        onSuccessRedirect?: string,             // Optional. Final redirect. Falls back to ?redirect|?next|?returnTo or "/"
        allowRedirectOrigins?: string[],        // Optional. Prevent open redirects by allow-listing origins
        branding?: {
          title?: string,
          subtitle?: string,
          logoUrl?: string
        },
        theme?: string,                         // Optional string. Added as a class to the container (e.g., "dark")
        endpoints?: {                           // Optional overrides if your API paths differ
          login?: string,                       // Default: "/login"
          forgot?: string,                      // Default: "/auth/forgot"
          resetCode?: string,                   // Default: "/auth/password/reset/code"
          resetToken?: string                   // Default: "/auth/password/reset/token"
        },
        providers?: {                           // Optional provider hooks for future extensions
          google?: {
            onClick?: (ctx) => void             // ctx: { container, auth, redirect, showMessage }
          },
          passkey?: {
            onClick?: (ctx) => void
          }
        },
        texts?: {                               // Optional UI text overrides
          emailOrUsername?: string,
          password?: string,
          signIn?: string,
          forgotPassword?: string,
          resetYourPassword?: string,
          emailAddress?: string,
          resetMethod?: string,
          emailCode?: string,
          emailLink?: string,
          sendReset?: string,
          back?: string,
          enterResetCode?: string,
          weSentCodeTo?: string,
          resetCode?: string,
          newPassword?: string,
          confirmPassword?: string,
          resetPassword?: string,
          setYourNewPassword?: string,
          setPassword?: string,
          invalidCredentials?: string,
          successRedirecting?: string,
          pleaseFillAllFields?: string,
          passwordsDoNotMatch?: string
        }
      }
    ) => {
      destroy(): void                           // Unmount and cleanup
    }

Behavior
- Renders a compact authentication UI into `container`.
- Reads `login_token` from URL query if present and shows the “set password” screen.
- For “forgot password” with method = “code”, keeps `reset_email` in sessionStorage to drive the next step.
- On success, calls `window.location.href = onSuccessRedirect` (after allowlist check if provided).

Provider hooks
- This module doesn’t embed any provider logic. Add it via `providers` hooks without coupling:

    mountAuth(root, {
      baseURL: '/api',
      onSuccessRedirect: '/',
      providers: {
        google: {
          onClick: async ({ showMessage, redirect }) => {
            showMessage('Starting Google sign-in...', 'info');
            // Start your OAuth flow. On success:
            redirect();
          }
        },
        passkey: {
          onClick: async ({ showMessage }) => {
            showMessage('Passkey flow not yet implemented.', 'info');
          }
        }
      }
    });

---

## Low-level API: createAuthClient({ baseURL, endpoints, ... })

If you already have your own HTML and want to call the API only, use `createAuthClient`:

    import { createAuthClient } from 'web-mojo/auth';

    const auth = createAuthClient({ baseURL: '/api' });

    // Sign in
    await auth.login(username, password);

    // Forgot password
    await auth.forgot({ email, method: 'code' });  // or 'link'

    // Reset via code
    await auth.resetWithCode({ email, code, newPassword });

    // Reset via magic link token
    await auth.resetWithToken({ token, newPassword });

    // Session helpers
    auth.logout();
    auth.isAuthenticated();        // boolean
    auth.getToken();               // string | null
    auth.getUser();                // object | null
    auth.getAuthHeader();          // "Bearer ..." | null

    // Utils
    auth.parseResponse(res);       // Normalizes {data.data} | {data} | root shapes
    auth.getErrorMessage(err);     // best-effort message

Persistence
- Saves `access_token`, (optional) `refresh_token`, and `user` into localStorage.
- If your backend uses HttpOnly session cookies, those will be managed by the browser automatically (recommended).

---

## Security recommendations

- Prefer server-set, HttpOnly cookies after `/login` succeeds.
  - The destination app is then authenticated automatically on the same registered domain.
  - Avoid passing access tokens in URLs.
- If you must pass client-readable tokens across apps:
  - Prefer short-lived, one-time codes that the destination app exchanges server-side.
- Prevent open redirects:
  - Use `allowRedirectOrigins` to allow only trusted redirect origins.
- Rate-limit `/login` and reset endpoints server-side and add brute force protections.

---

## Theming and branding

- The markup is simple and easy to restyle. Primary CSS variables:
  - `--auth-primary`, `--auth-primary-hover`
  - `--auth-surface`, `--auth-text`, `--auth-muted`, `--auth-border`
  - `--auth-gradient-start`, `--auth-gradient-end`
  - `--auth-radius`, `--auth-field-radius`

- Branding options in code:
  - `branding.title` – header title
  - `branding.subtitle` – header subtitle
  - `branding.logoUrl` – header logo image (optional)

- `theme` option:
  - A string passed as a class to the root container. Use this as a hook to toggle your own theme (e.g., “dark”).

---

## Minimal example (single file)

    <!doctype html>
    <meta charset="utf-8" />
    <title>Sign In</title>

    <!-- If you are NOT bundling, include the CSS you copied from the package:
    <link rel="stylesheet" href="/static/simple-auth.css" />
    -->

    <div id="auth-root"></div>

    <script type="module">
      import { mountAuth } from 'web-mojo/auth';

      mountAuth(document.getElementById('auth-root'), {
        baseURL: '/api',
        onSuccessRedirect: '/',
        branding: { title: 'Acme', subtitle: 'Welcome back' },
        theme: 'light'
      });
    </script>

---

## Migration from legacy auth

Remove old imports/usage:

- Old
    import { AuthApp, AuthManager, LoginPage } from 'web-mojo/auth';
    // ... instantiate AuthApp, register pages, event bus wiring, etc.

- New
    import { mountAuth } from 'web-mojo/auth';
    mountAuth(document.getElementById('auth-root'), {
      baseURL: '/api',
      onSuccessRedirect: '/'
    });

Notes
- Legacy symbols (AuthApp/AuthManager/Auth pages) are deprecated and will throw with a clear message.
- Replace any legacy references with `mountAuth` (UI) or `createAuthClient` (API-only).

---

## Troubleshooting

- “Nothing renders” – Ensure you passed a valid DOM element to `mountAuth`.
- “Redirect doesn’t work” – If you pass `onSuccessRedirect`, ensure it’s a valid URL. If you rely on query params, ensure you’re using `?redirect` or `?next` or `?returnTo`.
- “Blocked redirect” – If `allowRedirectOrigins` is set, the final URL’s origin must be in the list.
- “CORS errors” – Configure your API to allow your auth page origin and credentials if needed.
- “Icons not visible” – The UI doesn’t require icon fonts. Provider buttons optionally show icons if you include a font lib. It’s fully optional.

---

## FAQ

- Can I use it without bundlers?
  - Yes. Include the script via an ESM-friendly path and include the CSS file directly (copied from the package). The HTML markup is simple and can be fully restyled.

- Can I keep my own UI?
  - Yes. Use `createAuthClient` and wire up your own forms. You can selectively use one or more flows.

- Can I add Google or Passkeys?
  - Yes. Pass provider handlers via `providers.google` or `providers.passkey`. The core exposes hooks so you can implement flows without forking the module.

- How do I avoid open redirects?
  - Use `allowRedirectOrigins` and/or avoid trusting redirect URLs from untrusted sources.

---

## Summary

Use `mountAuth(container, { baseURL, onSuccessRedirect, ... })` for a plug-and-play standalone auth page that redirects on success. Use `createAuthClient({ baseURL })` if you prefer to own the UI. No heavy frameworks, easy to theme, and ready to extend with providers later.