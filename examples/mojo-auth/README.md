# mojo-auth — Reference Login Page

A ready-to-use, copy-and-customise login page for MOJO backends.
Vanilla HTML + CSS + JS — no framework, no build step required at runtime.

---

## Files

| File | Purpose |
|------|---------|
| `login.html` | Complete login page — copy this into your project |
| `login.css` | All styles — copy alongside `login.html` |
| `mojo-auth.umd.js` | The standalone auth library (built from source) |

---

## Quick Start

### 1. Build the library

Run once from the repo root to produce `dist/mojo-auth.umd.js`:

```bash
npm run build:mojo-auth
```

### 2. Copy the files into your project

```
your-project/
  static/
    mojo-auth.umd.js   ← built library
    login/
      login.html
      login.css
```

### 3. Edit the two config lines at the top of the `<script>` block

```js
var API_BASE   = 'https://api.yourapp.com';  // your MOJO backend
var ON_SUCCESS = '/dashboard/';              // where to send users after login
```

### 4. Serve and go

No bundler needed. Works directly from any static host, Django `staticfiles`, S3, Nginx, etc.

---

## URL Parameters

The login page reads several URL parameters so you can customise it dynamically — useful when embedding in multi-tenant apps, linking from email, or testing themes.

### Branding

| Parameter | Effect | Example |
|-----------|--------|---------|
| `title` | Card heading text | `?title=Acme+Corp` |
| `subtitle` | Card subheading text | `?subtitle=Welcome+back` |
| `logo` | URL of a logo image (shown above the title) | `?logo=/static/logo.png` |
| `theme` | Visual theme (see Themes below) | `?theme=dark` |

### Redirect

After a successful login the page redirects to `ON_SUCCESS` (hardcoded in the script).
You can override this per-request with any of these parameters — the value must start with `/` to prevent open redirects:

| Parameter | Example |
|-----------|---------|
| `redirect` | `?redirect=/dashboard/` |
| `next` | `?next=/settings/` |
| `returnTo` | `?returnTo=/checkout/` |

Example — send a user to the login page and return them to a specific page:

```
/login/?next=/orders/42/
```

### Token Handling (Email Links)

The page automatically handles tokens passed in the URL — used by magic login links and password reset links that the backend emails to users.

#### Magic Login Token (`ml:`)

When a user requests a magic login link, the backend emails them a URL like:

```
https://yourapp.com/login/?token=ml:abc123...
```

On page load the page detects the `ml:` prefix, calls the complete-login API, cleans the token from the URL, and redirects on success. No user interaction needed.

#### Password Reset Token (`pr:`)

When a user requests a **reset link** (not a code), the backend emails:

```
https://yourapp.com/login/?token=pr:xyz789...
```

On page load the page detects the `pr:` prefix, stores the token in `sessionStorage`, and shows the **Set New Password** form. The user enters and confirms their new password and submits.

> **Note:** The code-based reset flow (`pr:` via email code) does not use a URL token — the user is shown a 6-digit code input instead.

---

## Themes

Apply via the `?theme=` URL parameter or by adding a class directly to `<body>`.

| Value | Class | Description |
|-------|-------|-------------|
| *(default)* | — | Light blue, clean |
| `dark` | `theme-dark` | Dark slate background |
| `modern` | `theme-modern` | Deep purple gradient background, white card |
| `corporate` | `theme-corporate` | Conservative blue, sharp corners, no hover lift |

**URL example:**
```
/login/?theme=dark&title=Acme
```

**HTML example** (hardcode a theme):
```html
<body class="theme-modern">
```

**CSS variable override** — all colours are CSS custom properties on `:root`. Override any of them to create your own theme:

```css
:root {
    --ma-primary:      #e11d48;   /* rose red */
    --ma-primary-dark: #be123c;
    --ma-bg:           #fafafa;
    --ma-radius:       4px;       /* squarer corners */
}
```

---

## Auth Flows Supported

| Flow | How it works |
|------|-------------|
| **Password login** | Username/email + password form |
| **Forgot password — code** | Email → 6-digit code → new password form |
| **Forgot password — link** | Email → click link → set-password form (`pr:` token in URL) |
| **Magic login** | Email → click link → instant login (`ml:` token in URL) |
| **Passkey (WebAuthn)** | Enter email/username → browser biometric prompt |
| **Google OAuth** | Redirect to Google → callback handled on return |

The passkey button is hidden automatically if the browser doesn't support WebAuthn.

---

## Session Behaviour

On every page load (when no URL token or OAuth callback is present) the page:

1. Checks `localStorage` for a stored refresh token
2. If found, calls the refresh endpoint to validate the session server-side (catches revoked/disabled accounts even if the JWT hasn't expired)
3. On success → redirects immediately (user never sees the form)
4. On failure → clears stale tokens, shows the login form

The full-screen overlay ("Checking session…") is shown during this check so users see clean feedback rather than a flash of the login form.

---

## MojoAuth Library API

The library is available as `window.MojoAuth` after loading `mojo-auth.umd.js`.
It is also importable as an ES module: `import MojoAuth from './mojo-auth.es.js'`.

### Initialisation

```js
MojoAuth.init({ baseURL: 'https://api.yourapp.com' });
```

Must be called before any other method. Optionally override individual endpoint paths:

```js
MojoAuth.init({
    baseURL: 'https://api.yourapp.com',
    endpoints: {
        login: '/api/v2/login',   // override just this one
    }
});
```

### Auth Methods

```js
// Password login
MojoAuth.login(username, password)
// → Promise<{ access_token, refresh_token, user }>
// → If MFA enabled: Promise<{ mfa_required: true, mfa_token, mfa_methods }>

// Forgot password — sends a 6-digit code
MojoAuth.forgotPasswordCode(email)

// Complete reset with code
MojoAuth.resetWithCode(email, code, newPassword)

// Forgot password — sends a reset link (pr: token)
MojoAuth.forgotPasswordLink(email)

// Complete reset with token from link
MojoAuth.resetWithToken(token, newPassword)

// Request magic login link
MojoAuth.sendMagicLink(email)

// Complete magic login with token from URL
MojoAuth.loginWithMagicToken(token)

// Passkey login (WebAuthn) — full begin→prompt→complete flow
MojoAuth.loginWithPasskey(username)

// Start Google OAuth — redirects browser to Google
MojoAuth.startGoogleLogin()

// Complete Google OAuth — reads ?code and ?state from current URL
MojoAuth.completeGoogleLogin()

// Refresh access token using stored refresh token
MojoAuth.refreshToken()
```

### Session Helpers

```js
MojoAuth.isAuthenticated()   // → boolean (has access token in localStorage)
MojoAuth.isTokenExpired()    // → boolean (checks JWT exp claim client-side)
MojoAuth.getToken()          // → string|null  (raw access token)
MojoAuth.getRefreshToken()   // → string|null
MojoAuth.getAuthHeader()     // → "Bearer eyJ..." (for use in fetch headers)
MojoAuth.getTokenPayload()   // → decoded JWT payload object|null
MojoAuth.logout()            // clears both tokens from localStorage
MojoAuth.isPasskeySupported() // → boolean
MojoAuth.getError(err)       // → human-readable string from any caught error
```

### localStorage Keys

Aligned with `web-mojo` `TokenManager` so both libraries share the same session:

| Key | Value |
|-----|-------|
| `access_token` | JWT access token |
| `refresh_token` | JWT refresh token |

---

## Customising the HTML

The login page is intentionally plain HTML — copy it and edit freely.

- **Remove a flow you don't need** — delete the view `<div>` and its corresponding JS block (they are clearly labelled with comments)
- **Add your own fields** — add inputs inside any form; read their values in the submit handler
- **Change button labels** — edit the `<span class="ma-btn-text">` inside each button
- **Hardcode branding** — edit `#ma-title`, `#ma-subtitle`, or add an `<img class="ma-logo">` directly in the HTML instead of using URL params

---

## Django Integration

### Serving the files

Add to `settings.py`:

```python
STATICFILES_DIRS = [BASE_DIR / 'static']
```

Place `login.html`, `login.css`, and `mojo-auth.umd.js` in `static/login/`.

### Serving the login page from a view

```python
# views.py
from django.views.generic import TemplateView

class LoginView(TemplateView):
    template_name = 'login/login.html'
```

Update the script tag in `login.html` to use Django's static tag:

```html
{% load static %}
<link rel="stylesheet" href="{% static 'login/login.css' %}">
...
<script src="{% static 'login/mojo-auth.umd.js' %}"></script>
```

### Sending the redirect param from Django

```python
from urllib.parse import urlencode
from django.shortcuts import redirect

def some_protected_view(request):
    if not request.user.is_authenticated:
        params = urlencode({'next': request.path})
        return redirect(f'/login/?{params}')
    ...
```

### Sending magic login / reset links from Django

The backend handles generating and emailing these links. The only requirement is that your email template points to the login page:

```
Magic login:  https://yourapp.com/login/?token=ml:{{ token }}
Reset link:   https://yourapp.com/login/?token=pr:{{ token }}
```

The login page handles the rest automatically on page load.
