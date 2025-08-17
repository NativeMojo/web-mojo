# MOJO Auth Module

Complete authentication system for MOJO Framework applications with modern features like passkey support, JWT token management, and beautiful UI components.

## 🚀 Features

- **🔐 Multiple Auth Methods**: Email/password, Passkeys (WebAuthn), OAuth (extensible)
- **📱 Responsive UI**: Beautiful, accessible auth pages with dark mode support
- **🔄 Token Management**: Automatic JWT token refresh and secure storage
- **🛡️ Security First**: CSRF protection, secure defaults, password strength indicators
- **⚡ Easy Integration**: Drop-in authentication for existing MOJO apps
- **🎨 Customizable**: Themes, branding, and extensive customization options
- **📧 Password Reset**: Complete forgot password flow with email verification
- **♿ Accessible**: WCAG compliant with keyboard navigation and screen reader support

## 📦 Installation

The auth module is included with `web-mojo` - no additional installation required.

```bash
npm install web-mojo
```

## 🎯 Quick Start

### Basic Setup

```javascript
// Import core framework and auth
import { WebApp } from 'web-mojo';
import { setupAuth } from 'web-mojo/auth';

// Create your app
const app = WebApp.create({
  container: '#app',
  title: 'My App'
});

// Add authentication with one line
await setupAuth(app, {
  baseURL: 'http://localhost:8881' // Your API endpoint
});

// Start the app
await app.start();
```

### Import Patterns

```javascript
// Option 1: Specific imports (recommended)
import { WebApp } from 'web-mojo';
import { AuthApp, LoginPage, RegisterPage } from 'web-mojo/auth';

// Option 2: All auth exports
import { WebApp } from 'web-mojo';
import * as Auth from 'web-mojo/auth';

// Option 3: Quick setup function
import { WebApp } from 'web-mojo';
import { quickAuthSetup } from 'web-mojo/auth';

const app = WebApp.create({ container: '#app' });
const authManager = quickAuthSetup(app);
```

### CSS Integration

```javascript
// Import auth CSS
import 'web-mojo/auth'; // Includes CSS automatically

// Or import CSS separately
import { AuthApp } from 'web-mojo/auth';
import 'web-mojo/css/auth.css';
```

## 🔧 Configuration

### Complete Auth Setup

```javascript
import { WebApp } from 'web-mojo';
import { AuthApp, PasskeyPlugin } from 'web-mojo/auth';

const app = WebApp.create({ container: '#app' });

const authApp = await AuthApp.create(app, {
  // API Configuration
  baseURL: 'https://api.yourapp.com',

  // Routes
  routes: {
    login: '/login',
    register: '/register',
    forgot: '/forgot-password',
    reset: '/reset-password'
  },

  // Navigation
  loginRedirect: '/dashboard',
  logoutRedirect: '/login',

  // Features
  features: {
    registration: true,
    forgotPassword: true,
    rememberMe: true
  },

  // UI Customization
  ui: {
    title: 'My Company',
    logoUrl: '/assets/logo.png',
    messages: {
      loginTitle: 'Welcome Back',
      loginSubtitle: 'Sign in to your account',
      registerTitle: 'Create Account',
      registerSubtitle: 'Join us today'
    }
  }
});

// Add passkey support
const passkeyPlugin = new PasskeyPlugin({
  rpName: 'My Company',
  rpId: 'mycompany.com'
});
authApp.addPlugin(passkeyPlugin);
```

## 📄 Auth Pages

### Using Individual Page Components

```javascript
import { WebApp, Page } from 'web-mojo';
import { LoginPage, RegisterPage } from 'web-mojo/auth';

const app = WebApp.create({ container: '#app' });

// Register auth pages manually
app.registerPage('login', LoginPage, { 
  route: '/login',
  title: 'Sign In' 
});

app.registerPage('register', RegisterPage, { 
  route: '/register',
  title: 'Create Account' 
});
```

### Custom Auth Pages

```javascript
import { LoginPage } from 'web-mojo/auth';

class CustomLoginPage extends LoginPage {
  constructor(options = {}) {
    super({
      ...options,
      template: 'my-custom-login-template.mst',
      authConfig: {
        ui: {
          title: 'My Brand',
          logoUrl: '/my-logo.png',
          messages: {
            loginTitle: 'Welcome to My App',
            loginSubtitle: 'Please sign in to continue'
          }
        }
      }
    });
  }

  // Override methods to customize behavior
  async onActionLogin(event) {
    // Add custom login logic
    console.log('Custom login handling');
    return super.onActionLogin(event);
  }
}
```

## 🔐 Authentication Manager

### Direct Usage

```javascript
import { AuthManager, AuthService } from 'web-mojo/auth';

// Create auth manager directly
const authManager = new AuthManager(app, {
  baseURL: 'https://api.yourapp.com',
  autoRefresh: true,
  refreshThreshold: 5 // minutes
});

// Login
try {
  const result = await authManager.login('user@example.com', 'password123');
  console.log('Login successful:', result.user);
} catch (error) {
  console.error('Login failed:', error.message);
}

// Check authentication status
if (authManager.isAuthenticated) {
  console.log('Current user:', authManager.user);
}

// Logout
await authManager.logout();
```

### Token Management

```javascript
import { TokenManager } from 'web-mojo/auth';

const tokenManager = new TokenManager();

// Check token validity
if (tokenManager.isValid()) {
  console.log('User is authenticated');
  
  // Get user info from token
  const userInfo = tokenManager.getUserInfo();
  console.log('User ID:', userInfo.uid);
  console.log('Email:', userInfo.email);
}

// Get auth header for API calls
const authHeader = tokenManager.getAuthHeader();
// Returns: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## 🔌 Plugins

### Passkey Authentication

```javascript
import { AuthApp, PasskeyPlugin } from 'web-mojo/auth';

const passkeyPlugin = new PasskeyPlugin({
  rpName: 'My App',
  rpId: 'myapp.com',
  userVerification: 'preferred',
  authenticatorAttachment: 'platform' // or 'cross-platform'
});

// Add to auth app
authApp.addPlugin(passkeyPlugin);

// Use in your code
if (authManager.isPasskeySupported()) {
  await authManager.loginWithPasskey();
  await authManager.setupPasskey();
}
```

### Custom Plugins

```javascript
class CustomAuthPlugin {
  constructor(config = {}) {
    this.name = 'custom-plugin';
    this.config = config;
  }

  async initialize(authManager, app) {
    // Add custom methods to auth manager
    authManager.customLogin = this.customLogin.bind(this);
    
    // Listen to auth events
    app.events.on('auth:login', this.onLogin.bind(this));
  }

  async customLogin() {
    // Custom authentication logic
  }

  onLogin(user) {
    console.log('Custom plugin: user logged in', user);
  }
}

authApp.addPlugin(new CustomAuthPlugin());
```

## 🛡️ Route Guards

### Protecting Pages

```javascript
import { requireAuth } from 'web-mojo/auth';

// Method 1: Decorator
@requireAuth
class DashboardPage extends Page {
  // This page now requires authentication
}

// Method 2: Manual setup
class ProfilePage extends Page {
  static requiresAuth = true;
}

// Method 3: Route-level guards
import { createAuthGuards } from 'web-mojo/auth';

createAuthGuards(app, [
  'dashboard',
  'profile', 
  'settings'
]);
```

## 🎨 CSS Customization

### Theme Variables

```css
:root {
  /* Brand colors */
  --mojo-auth-primary: #your-primary-color;
  --mojo-auth-secondary: #your-secondary-color;
  
  /* Layout */
  --mojo-auth-border-radius: 0.5rem;
  --mojo-auth-card-padding: 2rem;
}
```

### Theme Classes

```html
<!-- Light theme (default) -->
<div class="auth-page">...</div>

<!-- Dark theme -->
<div class="mojo-auth-dark">
  <div class="auth-page">...</div>
</div>

<!-- Compact theme -->
<div class="mojo-auth-compact">
  <div class="auth-page">...</div>
</div>

<!-- Auto theme (follows system preference) -->
<div class="mojo-auth-auto">
  <div class="auth-page">...</div>
</div>
```

## 🔗 API Integration

### Backend Requirements

Your API should implement these endpoints:

```
POST /api/auth/login
POST /api/auth/register  
POST /api/auth/logout
POST /api/auth/refresh
POST /api/auth/forgot-password
POST /api/auth/reset-password

# For passkey support
POST /api/auth/passkey/challenge
POST /api/auth/passkey/verify
POST /api/auth/passkey/register-options
POST /api/auth/passkey/register
```

### Custom API Service

```javascript
import { AuthService } from 'web-mojo/auth';

class CustomAuthService extends AuthService {
  // Override API endpoints
  async login(username, password) {
    return this.makeRequest('/v1/authenticate', 'POST', {
      email: username,
      password: password
    });
  }

  // Add custom endpoints
  async validateInvitation(token) {
    return this.makeRequest('/api/invitations/validate', 'POST', { token });
  }
}

// Use custom service
const authManager = new AuthManager(app, {
  authService: new CustomAuthService({ baseURL: 'https://api.myapp.com' })
});
```

## 📚 Event System

### Auth Events

```javascript
// Listen to auth events
app.events.on('auth:login', (user) => {
  console.log('User logged in:', user);
});

app.events.on('auth:logout', () => {
  console.log('User logged out');
});

app.events.on('auth:register', (user) => {
  console.log('User registered:', user);
});

app.events.on('auth:tokenRefreshed', () => {
  console.log('Token refreshed successfully');
});

app.events.on('auth:tokenExpired', () => {
  console.log('Token expired - redirecting to login');
});

app.events.on('auth:loginError', (error) => {
  console.error('Login failed:', error);
});

// Passkey events
app.events.on('auth:passkeySetupSuccess', () => {
  console.log('Passkey set up successfully');
});
```

## 🧪 Testing

### Mock Auth Manager

```javascript
import { AuthManager } from 'web-mojo/auth';

class MockAuthManager extends AuthManager {
  constructor(app) {
    super(app, { baseURL: 'http://localhost:8881' });
    this.mockUsers = new Map();
  }

  async login(username, password) {
    // Mock login logic
    if (username === 'test@example.com' && password === 'password') {
      this.setAuthState({ 
        uid: '123',
        email: username,
        name: 'Test User' 
      });
      return { success: true, user: this.user };
    }
    throw new Error('Invalid credentials');
  }
}

// Use in tests
const app = WebApp.create({ container: '#test-container' });
const authManager = new MockAuthManager(app);
```

## 📖 API Reference

### AuthApp Methods

- `AuthApp.create(app, config)` - Create and initialize auth app
- `authApp.addPlugin(plugin)` - Add authentication plugin
- `authApp.getPlugin(name)` - Get plugin by name
- `authApp.isAuthenticated()` - Check if user is authenticated
- `authApp.getUser()` - Get current user data

### AuthManager Methods

- `login(username, password, rememberMe)` - Authenticate user
- `register(userData)` - Register new user
- `logout()` - Sign out current user
- `refreshToken()` - Refresh authentication token
- `forgotPassword(email)` - Request password reset
- `resetPassword(token, newPassword)` - Complete password reset

### TokenManager Methods

- `setTokens(token, refreshToken, persistent)` - Store tokens
- `getToken()` - Get access token
- `getRefreshToken()` - Get refresh token
- `clearTokens()` - Remove all tokens
- `isValid()` - Check if token is valid
- `getUserInfo()` - Extract user data from token
- `getAuthHeader()` - Get Authorization header value

## 🔄 Migration Guide

### From Custom Auth to MOJO Auth

```javascript
// Before (custom auth)
class LoginPage extends Page {
  async handleLogin() {
    const response = await fetch('/api/login', { /* ... */ });
    // Manual token handling...
  }
}

// After (MOJO Auth)
import { setupAuth } from 'web-mojo/auth';

// One line setup with automatic token management
await setupAuth(app, { baseURL: '/api' });
```

## 🤝 Contributing

Auth module follows the same contribution guidelines as the main MOJO Framework. See the main [CONTRIBUTING.md](../../CONTRIBUTING.md) for details.

## 📄 License

MIT License - same as MOJO Framework