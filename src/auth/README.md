# MOJO Authentication System

A simplified, clean authentication system for MOJO Framework applications. Provides email/password authentication, JWT token management, and extensible plugin support for advanced features like WebAuthn passkeys.

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
src/auth/
├── AuthApp.js           # Main factory & setup
├── AuthManager.js       # Core auth state management  
├── TokenManager.js      # JWT token handling
├── pages/              # Auth UI pages
│   ├── LoginPage.js
│   ├── RegisterPage.js  
│   └── ForgotPasswordPage.js
├── plugins/            # Optional feature plugins
│   └── PasskeyPlugin.js
└── README.md           # This file
```

## Comparison to Previous System

The new simplified auth system:

- ✅ **80% less code** for basic authentication needs
- ✅ **One-line setup** instead of complex configuration  
- ✅ **Clear separation** of concerns across focused components
- ✅ **Plugin architecture** for advanced features
- ✅ **Framework integration** with MOJO WebApp patterns
- ✅ **Developer friendly** with sensible defaults

Advanced features like passkeys, social login, and complex role systems are available as **optional plugins** rather than built into the core.

## License

MIT License - see LICENSE file for details.