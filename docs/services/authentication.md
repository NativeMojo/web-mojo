# Authentication Services Documentation

## Overview

MOJO Framework provides comprehensive authentication services through two main utilities:

- **`AuthService`** - Handles all authentication-related API calls including login, passkey authentication, password reset, and token management
- **`JWTUtils`** - Provides JWT token manipulation utilities including decoding, validation, and storage management

## Installation

### Using MOJO Framework

```javascript
import { AuthService, JWTUtils } from 'web-mojo';

// Or access through MOJO instance
const mojo = new MOJO(config);
const authService = mojo.authService;
const jwtUtils = mojo.jwtUtils;
```

### Direct Import

```javascript
import AuthService from 'web-mojo/src/services/AuthService.js';
import JWTUtils from 'web-mojo/src/utils/JWTUtils.js';
```

## AuthService

### Configuration

AuthService is automatically initialized when creating a MOJO instance. It uses the API configuration from your app config:

```javascript
const app = new MOJO({
  api: {
    baseUrl: 'https://api.yourapp.com',
    timeout: 30000,
    headers: {
      'X-API-Key': 'your-api-key'
    }
  }
});

const authService = app.authService;
```

### Methods

#### `login(email, password)`

Standard email/password authentication.

```javascript
const result = await authService.login('user@example.com', 'password123');

if (result.success) {
  // result.data contains:
  // - user: User object
  // - token: Access token
  // - refreshToken: Refresh token
  console.log('Logged in:', result.data.user);
  
  // Store tokens
  jwtUtils.storeTokens(result.data.token, result.data.refreshToken, true);
} else {
  console.error('Login failed:', result.message);
}
```

#### `loginWithPasskey()`

WebAuthn/Passkey authentication for passwordless login.

```javascript
const result = await authService.loginWithPasskey();

if (result.success) {
  // Handle successful passkey authentication
  console.log('Authenticated with passkey:', result.data.user);
  jwtUtils.storeTokens(result.data.token, result.data.refreshToken, true);
} else {
  console.error('Passkey authentication failed:', result.message);
}
```

#### `setupPasskey()`

Register a new passkey for the current authenticated user.

```javascript
// Ensure user is authenticated first
const token = jwtUtils.getToken();
if (!token) {
  console.error('User must be logged in to setup passkey');
  return;
}

const result = await authService.setupPasskey();

if (result.success) {
  console.log('Passkey registered successfully');
} else {
  console.error('Passkey setup failed:', result.message);
}
```

#### `forgotPassword(email)`

Request a password reset email.

```javascript
const result = await authService.forgotPassword('user@example.com');

if (result.success) {
  console.log('Password reset email sent');
} else {
  console.error('Failed to send reset email:', result.message);
}
```

#### `resetPassword(token, password)`

Reset password using a reset token.

```javascript
const result = await authService.resetPassword('reset-token-here', 'newPassword123');

if (result.success) {
  console.log('Password reset successful');
} else {
  console.error('Password reset failed:', result.message);
}
```

#### `verifyEmail(token)`

Verify email address with verification token.

```javascript
const result = await authService.verifyEmail('verification-token');

if (result.success) {
  console.log('Email verified successfully');
} else {
  console.error('Email verification failed:', result.message);
}
```

#### `refreshToken(refreshToken)`

Refresh an expired access token.

```javascript
const refreshToken = jwtUtils.getRefreshToken();
const result = await authService.refreshToken(refreshToken);

if (result.success) {
  // Update stored tokens
  jwtUtils.storeTokens(result.data.token, result.data.refreshToken, true);
  console.log('Token refreshed successfully');
} else {
  console.error('Token refresh failed:', result.message);
}
```

#### `logout(token)`

Logout the current user.

```javascript
const token = jwtUtils.getToken();
const result = await authService.logout(token);

// Clear local tokens regardless of server response
jwtUtils.clearTokens();

console.log('Logged out successfully');
```

#### `checkEmailExists(email)`

Check if an email is already registered.

```javascript
const result = await authService.checkEmailExists('user@example.com');

if (result.success) {
  if (result.exists) {
    console.log('Email is already registered');
  } else {
    console.log('Email is available');
  }
}
```

## JWTUtils

### Token Storage

JWTUtils provides automatic token storage management with support for both localStorage (persistent) and sessionStorage (session-only).

```javascript
const jwtUtils = new JWTUtils();

// Store tokens (remember = true uses localStorage)
jwtUtils.storeTokens(accessToken, refreshToken, true);

// Get stored tokens
const token = jwtUtils.getToken();
const refreshToken = jwtUtils.getRefreshToken();

// Clear all tokens
jwtUtils.clearTokens();
```

### Token Decoding and Validation

#### `decode(token)`

Decode a JWT token without cryptographic verification (client-side only).

```javascript
const payload = jwtUtils.decode(token);

if (payload) {
  console.log('Token payload:', payload);
  console.log('User ID:', payload.sub);
  console.log('Email:', payload.email);
  console.log('Expires:', new Date(payload.exp * 1000));
}
```

#### `isExpired(token)`

Check if a token has expired.

```javascript
if (jwtUtils.isExpired(token)) {
  console.log('Token has expired, need to refresh');
  // Trigger token refresh
}
```

#### `isExpiringSoon(token, threshold)`

Check if token will expire soon (default: 5 minutes).

```javascript
// Check if expiring within 10 minutes
if (jwtUtils.isExpiringSoon(token, 10 * 60 * 1000)) {
  console.log('Token expiring soon, refreshing...');
  // Proactively refresh token
}
```

#### `getTimeUntilExpiry(token)`

Get milliseconds until token expires.

```javascript
const msUntilExpiry = jwtUtils.getTimeUntilExpiry(token);

if (msUntilExpiry > 0) {
  console.log(`Token expires in ${Math.floor(msUntilExpiry / 1000)} seconds`);
} else {
  console.log('Token has already expired');
}
```

### User Information

#### `getUserInfo(token)`

Extract user information from token.

```javascript
const userInfo = jwtUtils.getUserInfo(token);

if (userInfo) {
  console.log('User:', userInfo);
  // userInfo contains:
  // - id: User ID
  // - email: User email
  // - name: User name
  // - roles: User roles array
  // - permissions: User permissions array
  // - issued: Token issue date
  // - expires: Token expiry date
}
```

### Authorization

#### `hasRole(token, role)`

Check if user has a specific role.

```javascript
if (jwtUtils.hasRole(token, 'admin')) {
  // Show admin features
  console.log('User is an admin');
}
```

#### `hasPermission(token, permission)`

Check if user has a specific permission.

```javascript
if (jwtUtils.hasPermission(token, 'users.write')) {
  // Allow user management
  console.log('User can manage users');
}
```

### Utility Methods

#### `getAuthHeader(token)`

Create Authorization header value.

```javascript
const authHeader = jwtUtils.getAuthHeader();
// Returns: "Bearer eyJhbGciOiJIUzI1NiIs..."

// Use in API calls
fetch('/api/protected', {
  headers: {
    'Authorization': authHeader
  }
});
```

#### `formatExpiry(token)`

Format token expiry for display.

```javascript
const expiryText = jwtUtils.formatExpiry(token);
console.log(`Token expires: ${expiryText}`);
// Output: "Token expires: 2 hours" or "Token expires: Expired"
```

#### `isValidStructure(token)`

Validate JWT structure (not cryptographic validation).

```javascript
if (jwtUtils.isValidStructure(token)) {
  console.log('Token has valid JWT structure');
} else {
  console.log('Invalid token format');
}
```

## Complete Authentication Flow Example

```javascript
import { MOJO } from 'web-mojo';

// Initialize MOJO with API configuration
const app = new MOJO({
  api: {
    baseUrl: 'https://api.yourapp.com',
    timeout: 30000
  }
});

const { authService, jwtUtils } = app;

// Login flow
async function login(email, password, rememberMe = false) {
  try {
    // Attempt login
    const result = await authService.login(email, password);
    
    if (!result.success) {
      throw new Error(result.message);
    }
    
    // Store tokens
    jwtUtils.storeTokens(
      result.data.token,
      result.data.refreshToken,
      rememberMe
    );
    
    // Get user info from token
    const userInfo = jwtUtils.getUserInfo(result.data.token);
    
    // Update UI
    updateUserInterface(userInfo);
    
    // Set up token refresh
    setupTokenRefresh();
    
    return userInfo;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}

// Automatic token refresh
function setupTokenRefresh() {
  const checkInterval = 60000; // Check every minute
  
  setInterval(async () => {
    const token = jwtUtils.getToken();
    
    if (!token) return;
    
    // Refresh if expiring within 5 minutes
    if (jwtUtils.isExpiringSoon(token, 5 * 60 * 1000)) {
      const refreshToken = jwtUtils.getRefreshToken();
      
      if (refreshToken) {
        const result = await authService.refreshToken(refreshToken);
        
        if (result.success) {
          jwtUtils.storeTokens(
            result.data.token,
            result.data.refreshToken,
            true
          );
          console.log('Token refreshed automatically');
        } else {
          // Refresh failed, redirect to login
          logout();
        }
      }
    }
  }, checkInterval);
}

// Logout flow
async function logout() {
  const token = jwtUtils.getToken();
  
  if (token) {
    await authService.logout(token);
  }
  
  jwtUtils.clearTokens();
  
  // Redirect to login page
  window.location.href = '/login';
}

// Protected API call
async function fetchProtectedData() {
  const token = jwtUtils.getToken();
  
  if (!token || jwtUtils.isExpired(token)) {
    throw new Error('Authentication required');
  }
  
  const response = await fetch('/api/protected-endpoint', {
    headers: {
      'Authorization': jwtUtils.getAuthHeader()
    }
  });
  
  if (!response.ok) {
    throw new Error('API request failed');
  }
  
  return response.json();
}
```

## Passkey Authentication Example

```javascript
// Check if WebAuthn is supported
function isPasskeySupported() {
  return window.PublicKeyCredential !== undefined;
}

// Setup passkey for logged-in user
async function setupPasskey() {
  if (!isPasskeySupported()) {
    alert('Passkeys are not supported on this device');
    return;
  }
  
  const token = jwtUtils.getToken();
  if (!token) {
    alert('Please login first');
    return;
  }
  
  try {
    const result = await authService.setupPasskey();
    
    if (result.success) {
      alert('Passkey registered successfully!');
    } else {
      alert(`Failed to setup passkey: ${result.message}`);
    }
  } catch (error) {
    console.error('Passkey setup error:', error);
    alert('An error occurred during passkey setup');
  }
}

// Login with passkey
async function loginWithPasskey() {
  if (!isPasskeySupported()) {
    alert('Passkeys are not supported on this device');
    return;
  }
  
  try {
    const result = await authService.loginWithPasskey();
    
    if (result.success) {
      // Store tokens
      jwtUtils.storeTokens(
        result.data.token,
        result.data.refreshToken,
        true
      );
      
      // Get user info
      const userInfo = jwtUtils.getUserInfo(result.data.token);
      
      // Update UI
      updateUserInterface(userInfo);
      
      console.log('Logged in with passkey:', userInfo);
    } else {
      alert(`Passkey authentication failed: ${result.message}`);
    }
  } catch (error) {
    console.error('Passkey login error:', error);
    alert('An error occurred during passkey authentication');
  }
}
```

## Security Best Practices

1. **Never store sensitive data in JWT**: JWTs are readable on the client side
2. **Always use HTTPS**: Tokens should only be transmitted over secure connections
3. **Implement token refresh**: Use refresh tokens to maintain sessions securely
4. **Set appropriate expiry times**: Balance security with user experience
5. **Clear tokens on logout**: Always clear stored tokens when users log out
6. **Validate tokens server-side**: Client-side validation is for UX only
7. **Use secure storage**: Consider the security implications of localStorage vs sessionStorage
8. **Implement CSRF protection**: When using cookie-based authentication
9. **Monitor token expiry**: Proactively refresh tokens before they expire
10. **Handle errors gracefully**: Provide clear feedback for authentication failures

## Error Handling

Both services return consistent error responses:

```javascript
{
  success: false,
  message: 'Human-readable error message'
}
```

Always handle both network errors and authentication failures:

```javascript
try {
  const result = await authService.login(email, password);
  
  if (result.success) {
    // Handle success
  } else {
    // Handle authentication failure
    console.error('Auth failed:', result.message);
  }
} catch (error) {
  // Handle network or other errors
  console.error('Request failed:', error);
}
```

## API Configuration

The AuthService respects your MOJO app configuration:

```javascript
const app = new MOJO({
  api: {
    baseUrl: 'https://api.yourapp.com',
    timeout: 30000,
    headers: {
      'X-API-Key': 'your-api-key',
      'X-Client-Version': '1.0.0'
    }
  }
});
```

All AuthService requests will automatically include these configured headers and respect the timeout setting.