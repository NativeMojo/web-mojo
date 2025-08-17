# MOJO Authentication System

A simplified, clean authentication system for MOJO Framework applications. Provides email/password authentication, JWT token management, extensible plugin support for advanced features like WebAuthn passkeys, and consolidated CSS styling.

## Overview

The MOJO Auth system is designed with simplicity and developer experience in mind:

- **Simple Setup** - One-line integration with your MOJO WebApp
- **Clean Architecture** - Clear separation of concerns across focused components  
- **Plugin System** - Add advanced features like passkeys as optional plugins
- **JWT Tokens** - Secure token-based authentication with auto-refresh
- **Built-in Pages** - Login, registration, and password reset pages included

## Quick Start

```javascript
import WebApp from './app/WebApp.js';
import AuthApp from './auth/AuthApp.js';

// 1. Create your MOJO app
const app = WebApp.create({
    container: '#app',
    title: 'My App'
});

// 2. Add authentication (one line!)
const authApp = await AuthApp.create(app, {
    baseURL: 'http://localhost:8881'
});

// 3. Start your app
await app.start();
```

That's it! You now have login, registration, and password reset pages automatically registered and working.

## Core Components

### AuthApp
Factory class that sets up authentication with your WebApp. Handles page registration, event wiring, and plugin integration.

```javascript
const authApp = await AuthApp.create(app, {
    baseURL: 'http://localhost:8881',
    routes: {
        login: '/login',
        register: '/register', 
        forgot: '/forgot-password'
    },
    ui: {
        title: 'My App',
        logoUrl: '/assets/logo.png'
    },
    features: {
        registration: true,
        forgotPassword: true,
        rememberMe: true
    }
});
```

### AuthManager  
Core authentication state management. Handles login/logout, token refresh, and coordinates with AuthService.

```javascript
// Access via app.auth after AuthApp.create()
const isLoggedIn = app.auth.isAuthenticated;
const user = app.auth.getUser();

// Perform authentication
await app.auth.login('user@example.com', 'password', true);
await app.auth.logout();
```

### TokenManager
Simplified JWT token handling. Focuses on essential operations:

```javascript
const tokenManager = new TokenManager();

// Store tokens
tokenManager.setTokens(accessToken, refreshToken, persistent);

// Get user info
const userId = tokenManager.getUserId();
const isValid = tokenManager.isValid();
const authHeader = tokenManager.getAuthHeader();
```

### AuthService
Clean API communication layer. Handles HTTP requests to your authentication endpoints:

```javascript
const authService = new AuthService({ baseURL: 'http://localhost:8881' });

const result = await authService.login('username', 'password');
const response = await authService.register(userData);
```

## Authentication Pages

All authentication pages have been refactored to use the new simplified architecture:

### LoginPage
- **Clean Configuration**: Receives config from AuthApp instead of complex props
- **Simplified Events**: Uses standard MOJO action handlers (`data-change-action`, `data-action`)
- **External Templates**: Uses `auth/pages/LoginPage.mst` template file
- **WebApp Integration**: Proper integration with app state and navigation

```javascript
// Configuration passed from AuthApp
authConfig: {
    ui: {
        title: 'My App',
        logoUrl: '/assets/logo.png',
        messages: { loginTitle: 'Welcome Back', ... }
    },
    features: {
        rememberMe: true,
        forgotPassword: true,
        registration: true
    }
}
```

### RegisterPage
- **Password Strength**: Real-time password strength indicator
- **Form Validation**: Client-side validation with clear error messages
- **Consistent Patterns**: Same event handling as LoginPage
- **Simplified Logic**: Removed complex terms/conditions handling

### ForgotPasswordPage
- **Success States**: Clear success/error state management
- **Email Validation**: Built-in email format validation
- **Auto-redirect**: Optional redirect to login after successful reset request
- **Unified Design**: Consistent with other auth pages

All pages now follow these patterns:
- Use `getViewData()` for template data
- Handle auth via `this.getApp().auth` 
- Use `data-change-action="updateField"` for form inputs
- Clear errors automatically on input change
- Proper loading states and error handling
- External CSS-free templates with consolidated styling

## Styling & CSS

The MOJO Auth system includes consolidated, professional CSS styling that's easy to customize and integrate.

### CSS Files

```
src/css/
├── auth.css     # Complete auth system styles
└── index.css    # Main import file for external projects
```

### Basic Usage

Include the auth CSS in your HTML:

```html
<!-- Option 1: Direct import -->
<link rel="stylesheet" href="path/to/mojo/src/css/auth.css">

<!-- Option 2: Full framework CSS (includes auth) -->
<link rel="stylesheet" href="path/to/mojo/src/css/index.css">
```

Or import in your CSS:

```css
@import url('path/to/mojo/src/css/auth.css');
```

### Custom Theming

Override CSS custom properties to match your brand:

```css
:root {
    --mojo-auth-primary: #your-brand-color;
    --mojo-auth-secondary: #your-secondary-color;
    --mojo-auth-border-radius: 0.5rem;
}
```

### Layout Helpers

```html
<!-- Full-screen auth experience -->
<div class="mojo-auth-container">
    <div class="mojo-auth-wrapper">
        <!-- Your auth page content -->
    </div>
</div>

<!-- Compact embedded auth -->
<div class="mojo-auth-compact">
    <!-- Auth content -->
</div>

<!-- Dark theme -->
<div class="mojo-auth-dark">
    <!-- Auth content -->
</div>
```

### Framework Integration

The CSS is designed to work with:
- ✅ **Bootstrap 5** - Full compatibility
- ✅ **Vanilla CSS** - No dependencies
- ✅ **Tailwind CSS** - Helper classes included
- ✅ **Custom themes** - CSS variables for easy customization

### Features Included

- 🎨 **Professional Design** - Modern gradient backgrounds and glass-morphism cards
- 📱 **Responsive Layout** - Mobile-first responsive design
- ♿ **Accessibility** - High contrast, focus states, and screen reader support
- 🌗 **Dark Mode** - Automatic dark mode detection and manual override
- 🖨️ **Print Friendly** - Optimized for printing
- ⚡ **Performance** - Optimized CSS with minimal size
- 🔧 **Customizable** - CSS custom properties for easy theming

## Plugin System

Add advanced features via plugins. Plugins initialize with the AuthManager and extend functionality.

### PasskeyPlugin

WebAuthn passkey authentication:

```javascript
import PasskeyPlugin from './auth/plugins/PasskeyPlugin.js';

const passkeyPlugin = new PasskeyPlugin({
    rpName: 'My App',
    rpId: window.location.hostname
});

authApp.addPlugin(passkeyPlugin);

// Now available on auth manager
if (app.auth.isPasskeySupported()) {
    await app.auth.loginWithPasskey();
    await app.auth.setupPasskey();
}
```

## API Endpoints

Your backend should implement these endpoints:

### Authentication
- `POST /api/login` - Username/password login
- `POST /api/register` - User registration  
- `POST /api/auth/logout` - Logout (optional)
- `POST /api/auth/refresh` - Token refresh

### Password Reset
- `POST /api/auth/forgot-password` - Request reset
- `POST /api/auth/reset-password` - Reset with token

### Passkey (if using PasskeyPlugin)
- `POST /api/auth/passkey/challenge` - Get auth challenge
- `POST /api/auth/passkey/verify` - Verify credential  
- `POST /api/auth/passkey/register-options` - Get registration options
- `POST /api/auth/passkey/register` - Register credential

## Expected Request/Response Format

### Login Request
```json
{
    "username": "user@example.com",
    "password": "password123"
}
```

### Login Response
```json
{
    "success": true,
    "data": {
        "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
        "refreshToken": "refresh_token_here",
        "user": {
            "uid": "user123",
            "email": "user@example.com", 
            "name": "John Doe"
        }
    }
}
```

The JWT token should include a `uid` field identifying the user.

## Route Protection

Protect pages that require authentication:

```javascript
import { requireAuth } from './auth/AuthApp.js';

// Protect a page class
const ProtectedPage = requireAuth(MyPage);

app.registerPage('dashboard', ProtectedPage, {
    route: '/dashboard',
    title: 'Dashboard'  
});
```

Or set `requiresAuth` on the page class:

```javascript
class DashboardPage extends Page {
    static requiresAuth = true;
    // ...
}
```

## Events

The auth system emits events you can listen to:

```javascript
app.events.on('auth:login', (user) => {
    console.log('User logged in:', user);
});

app.events.on('auth:logout', () => {
    console.log('User logged out');  
});

app.events.on('auth:tokenExpired', () => {
    console.log('Session expired');
});
```

## Configuration Options

### AuthApp Config
```javascript
{
    // Required
    baseURL: 'http://localhost:8881',
    
    // Page routes
    routes: {
        login: '/login',
        register: '/register',
        forgot: '/forgot-password'  
    },
    
    // Navigation
    loginRedirect: '/',
    logoutRedirect: '/login',
    
    // UI customization
    ui: {
        title: 'My App',
        logoUrl: '/assets/logo.png',
        messages: {
            loginTitle: 'Welcome Back',
            loginSubtitle: 'Sign in to your account'
            // ... other messages
        }
    },
    
    // Feature flags  
    features: {
        registration: true,
        forgotPassword: true,
        rememberMe: true
    },
    
    // Plugins
    plugins: [passkeyPlugin, ...]
}
```

## Development

### Demo Application

Run the included demo to see the auth system in action:

```bash
cd examples/auth-demo
# Serve with any static server
python -m http.server 3000
# Visit http://localhost:3000
```

Make sure your API server is running on `http://localhost:8881`.

### File Structure

```
src/
├── auth/                        # Authentication system
│   ├── AuthApp.js               # Main factory & setup
│   ├── AuthManager.js           # Core auth state management  
│   ├── TokenManager.js          # JWT token handling
│   ├── pages/                   # Auth UI pages
│   │   ├── LoginPage.js         # ✅ Refactored & simplified
│   │   ├── LoginPage.mst        # External CSS-free template
│   │   ├── RegisterPage.js      # ✅ Refactored & simplified
│   │   ├── RegisterPage.mst     # External CSS-free template
│   │   ├── ForgotPasswordPage.js # ✅ Refactored & simplified
│   │   └── ForgotPasswordPage.mst # External CSS-free template
│   └── plugins/                 # Optional feature plugins
│       └── PasskeyPlugin.js
├── css/                         # Consolidated styling
│   ├── auth.css                 # Complete auth system styles
│   └── index.css                # Main CSS import for external projects
└── services/
    └── AuthService.js           # API communication layer

docs/guide/
└── Auth.md                      # This documentation file

examples/auth-demo/              # Complete working demo
├── index.html                   # Demo page with CSS integration
└── main.js                      # Demo app setup
```

## Comparison to Previous System

The new simplified auth system:

- ✅ **80% less code** for basic authentication needs
- ✅ **One-line setup** instead of complex configuration  
- ✅ **Clear separation** of concerns across focused components
- ✅ **Plugin architecture** for advanced features
- ✅ **Framework integration** with MOJO WebApp patterns
- ✅ **Developer friendly** with sensible defaults
- ✅ **Refactored pages** with consistent patterns and external templates
- ✅ **Simplified configuration** passed cleanly from AuthApp to pages
- ✅ **Consolidated CSS** - All styles in one organized file
- ✅ **External project ready** - Easy CSS import and customization

### What Was Removed:
- Over-complex JWTUtils (300+ lines) → Simple TokenManager (171 lines)
- Complex page configuration objects → Clean config passed from AuthApp
- Duplicate validation logic across pages → Unified patterns
- Mixed concerns throughout components → Clear separation
- Feature bloat in core system → Plugin architecture
- Inline CSS in templates → Consolidated external CSS file

### What Was Added:
- Professional, responsive CSS design system
- CSS custom properties for easy theming
- Framework integration helpers (Bootstrap, Tailwind)
- Accessibility and dark mode support
- External project integration utilities

Advanced features like passkeys, social login, and complex role systems are available as **optional plugins** rather than built into the core.

## External Project Integration

### NPM Package (Future)

```bash
npm install mojo-auth-system
```

```html
<!-- In your HTML -->
<link rel="stylesheet" href="node_modules/mojo-auth-system/src/css/index.css">
```

```javascript
// In your JavaScript
import { AuthApp } from 'mojo-auth-system';

const authApp = await AuthApp.create(app, {
    baseURL: 'https://your-api.com'
});
```

### CDN Usage (Future)

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/mojo-auth-system/css/auth.css">
<script type="module" src="https://cdn.jsdelivr.net/npm/mojo-auth-system/auth.js"></script>
```

### Custom Branding Example

```css
/* Override in your stylesheet */
:root {
    --mojo-auth-primary: #ff6b35;        /* Your brand orange */
    --mojo-auth-secondary: #004e7c;      /* Your brand blue */
    --mojo-auth-border-radius: 0.25rem;  /* Square corners */
}
```

```html
<!-- Add branding class -->
<div class="mojo-auth-branded">
    <!-- Your auth pages will use your brand colors -->
</div>
```

## License

MIT License - see LICENSE file for details.