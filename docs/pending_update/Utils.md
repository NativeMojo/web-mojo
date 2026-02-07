# MOJOUtils - Core Utility Functions Guide

MOJOUtils is the central utility library for the MOJO framework, providing essential data access, formatting, validation, and helper functions used throughout MOJO applications.

## Table of Contents

- [Overview](#overview)
- [Data Access Utilities](#data-access-utilities)
- [Object Utilities](#object-utilities)
- [Function Utilities](#function-utilities)
- [String Utilities](#string-utilities)
- [Password Utilities](#password-utilities)
- [URL Utilities](#url-utilities)
- [Data Wrapper System](#data-wrapper-system)
- [Usage Examples](#usage-examples)

## Overview

MOJOUtils provides a comprehensive set of utility functions that handle common tasks in web applications. All utilities are static methods that can be called directly on the MOJOUtils class.

```javascript
import { MOJOUtils } from 'web-mojo';

// Example usage
const value = MOJOUtils.getContextData(data, 'user.name|uppercase');
const cloned = MOJOUtils.deepClone(originalObject);
const strength = MOJOUtils.checkPasswordStrength(password);
```

## Data Access Utilities

### getContextData(context, key)

Advanced data access with support for dot notation and pipe formatting.

**Parameters:**
- `context` (object) - The data context to search in
- `key` (string) - Key path with optional pipes (e.g., "user.name|uppercase")

**Returns:** The value, possibly formatted through pipes

```javascript
const user = {
  name: 'john doe',
  profile: {
    email: 'john@example.com',
    age: 30
  }
};

// Basic access
const name = MOJOUtils.getContextData(user, 'name');
// Result: 'john doe'

// Dot notation
const email = MOJOUtils.getContextData(user, 'profile.email');
// Result: 'john@example.com'

// With formatting pipes
const formattedName = MOJOUtils.getContextData(user, 'name|uppercase');
// Result: 'JOHN DOE'

// Complex formatting
const truncated = MOJOUtils.getContextData(user, 'profile.email|truncate(10)');
// Result: 'john@ex...'
```

### getNestedValue(context, path)

Get nested values from objects using dot notation without pipe formatting.

**Parameters:**
- `context` (object) - The object to search in
- `path` (string) - Dot notation path

**Returns:** The value at the specified path

```javascript
const data = {
  user: {
    settings: {
      theme: 'dark',
      notifications: true
    }
  }
};

const theme = MOJOUtils.getNestedValue(data, 'user.settings.theme');
// Result: 'dark'

// Method calls are automatically invoked
const obj = {
  getStatus() {
    return 'active';
  }
};

const status = MOJOUtils.getNestedValue(obj, 'getStatus');
// Result: 'active' (method was called)
```

## Object Utilities

### deepClone(obj)

Create a deep copy of an object, handling nested objects, arrays, and Date objects.

```javascript
const original = {
  name: 'John',
  tags: ['admin', 'user'],
  created: new Date(),
  profile: {
    email: 'john@example.com'
  }
};

const cloned = MOJOUtils.deepClone(original);
cloned.profile.email = 'jane@example.com';

console.log(original.profile.email); // Still 'john@example.com'
console.log(cloned.profile.email);   // 'jane@example.com'
```

### deepMerge(target, ...sources)

Merge multiple objects deeply, combining nested properties.

```javascript
const defaults = {
  api: {
    timeout: 5000,
    retries: 3
  },
  ui: {
    theme: 'light'
  }
};

const config = {
  api: {
    timeout: 10000
  },
  ui: {
    language: 'en'
  }
};

const merged = MOJOUtils.deepMerge({}, defaults, config);
// Result: {
//   api: { timeout: 10000, retries: 3 },
//   ui: { theme: 'light', language: 'en' }
// }
```

### isObject(item)

Check if a value is a plain object (not array, Date, etc.).

```javascript
MOJOUtils.isObject({});           // true
MOJOUtils.isObject([]);           // false
MOJOUtils.isObject(new Date());   // false
MOJOUtils.isObject(null);         // false
```

### isNullOrUndefined(value)

Check if a value is null or undefined.

```javascript
MOJOUtils.isNullOrUndefined(null);      // true
MOJOUtils.isNullOrUndefined(undefined); // true
MOJOUtils.isNullOrUndefined(0);         // false
MOJOUtils.isNullOrUndefined('');        // false
```

## Function Utilities

### debounce(func, wait)

Create a debounced function that delays execution until after the specified wait time.

```javascript
const searchHandler = MOJOUtils.debounce((query) => {
  console.log('Searching for:', query);
  // Perform search API call
}, 300);

// Multiple rapid calls will only execute once after 300ms
searchHandler('apple');
searchHandler('apples');
searchHandler('apple pie'); // Only this will execute
```

### throttle(func, limit)

Create a throttled function that limits execution to once per specified time period.

```javascript
const scrollHandler = MOJOUtils.throttle(() => {
  console.log('Scroll position:', window.scrollY);
  // Update scroll position indicator
}, 100);

window.addEventListener('scroll', scrollHandler);
// Handler will execute at most once every 100ms during scrolling
```

## String Utilities

### generateId(prefix)

Generate a unique ID with optional prefix.

```javascript
const id1 = MOJOUtils.generateId();
// Result: "1704067200000_abc123def"

const id2 = MOJOUtils.generateId('user');
// Result: "user_1704067200000_xyz789ghi"
```

### escapeHtml(str)

Escape HTML special characters to prevent XSS attacks.

```javascript
const userInput = '<script>alert("xss")</script>';
const safe = MOJOUtils.escapeHtml(userInput);
// Result: "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"
```

## Password Utilities

### checkPasswordStrength(password)

Comprehensive password strength analysis with detailed feedback.

**Returns:** Object with score, strength level, feedback, and detailed analysis

```javascript
const analysis = MOJOUtils.checkPasswordStrength('MyPassword123!');

console.log(analysis);
// Result: {
//   score: 7,
//   strength: 'good',
//   feedback: ['Good password strength. Consider adding more variety.'],
//   details: {
//     length: 13,
//     hasLowercase: true,
//     hasUppercase: true,
//     hasNumbers: true,
//     hasSpecialChars: true,
//     hasCommonPatterns: false,
//     isCommonPassword: false
//   }
// }
```

**Strength Levels:**
- `very-weak` (score < 2) - Needs significant improvement
- `weak` (score < 4) - Poor security, easily guessed
- `fair` (score < 6) - Moderate security with room for improvement
- `good` (score < 8) - Good security with minor improvements possible
- `strong` (score >= 8) - Excellent security

**Scoring Factors:**
- **Length**: 1-3 points based on character count
- **Character Types**: 1 point each for lowercase, uppercase, numbers; 2 points for special characters
- **Common Patterns**: -1 point for sequential patterns, repeated characters
- **Common Passwords**: -3 points for well-known weak passwords

```javascript
// Examples of different strength levels
MOJOUtils.checkPasswordStrength('123');
// { score: 0, strength: 'very-weak', feedback: ['Password should be at least 6 characters long', ...] }

MOJOUtils.checkPasswordStrength('password');
// { score: 1, strength: 'very-weak', feedback: ['This password is too common and easily guessed', ...] }

MOJOUtils.checkPasswordStrength('MySecure123!');
// { score: 8, strength: 'strong', feedback: ['Strong password! Consider using a password manager.'] }
```

### generatePassword(options)

Generate secure passwords with customizable options.

**Options:**
- `length` (number, default: 12) - Password length
- `includeLowercase` (boolean, default: true) - Include lowercase letters
- `includeUppercase` (boolean, default: true) - Include uppercase letters
- `includeNumbers` (boolean, default: true) - Include numbers
- `includeSpecialChars` (boolean, default: true) - Include special characters
- `excludeAmbiguous` (boolean, default: false) - Exclude ambiguous characters (0, O, l, I, |)
- `customChars` (string, default: '') - Use custom character set

```javascript
// Default strong password
const password1 = MOJOUtils.generatePassword();
// Result: "Kp3$mN9@vXq2" (random, 12 chars)

// Custom length
const password2 = MOJOUtils.generatePassword({ length: 16 });
// Result: "Rt8&nM4$pLq9Zx7!" (random, 16 chars)

// Numbers and letters only
const password3 = MOJOUtils.generatePassword({
  length: 10,
  includeSpecialChars: false
});
// Result: "Mk3nP8qR2x" (random, 10 chars)

// Exclude ambiguous characters
const password4 = MOJOUtils.generatePassword({
  length: 12,
  excludeAmbiguous: true
});
// Result: "Fp4&nQ9@vXr2" (no 0, O, l, I, |)

// Custom character set
const pinCode = MOJOUtils.generatePassword({
  length: 4,
  customChars: '0123456789'
});
// Result: "7392" (random 4-digit PIN)
```

## URL Utilities

### parseQueryString(queryString)

Parse a URL query string into an object.

```javascript
const query = '?name=John&age=30&active=true';
const params = MOJOUtils.parseQueryString(query);
// Result: { name: 'John', age: '30', active: 'true' }
```

### toQueryString(params)

Convert an object to a URL query string.

```javascript
const params = {
  search: 'javascript',
  page: 2,
  sort: 'date'
};

const queryString = MOJOUtils.toQueryString(params);
// Result: "search=javascript&page=2&sort=date"
```

## Data Wrapper System

The Data Wrapper system ensures consistent data access with pipe support throughout MOJO applications.

### wrapData(data, rootContext, depth)

Wrap plain objects to provide `get()` method support for pipe formatting.

```javascript
const plainData = {
  user: {
    firstName: 'john',
    lastName: 'doe'
  }
};

const wrappedData = MOJOUtils.wrapData(plainData);

// Now supports pipe formatting
const name = wrappedData.get('user.firstName|uppercase');
// Result: 'JOHN'
```

### DataWrapper Class

The DataWrapper class is used internally to wrap plain objects:

```javascript
const wrapper = new MOJOUtils.DataWrapper({
  title: 'hello world',
  count: 42
});

// Supports pipe formatting
console.log(wrapper.get('title|title-case'));  // "Hello World"
console.log(wrapper.get('count|currency'));    // "$42.00"

// Direct property access still works
console.log(wrapper.title);  // "hello world"
console.log(wrapper.count);  // 42

// Check property existence
console.log(wrapper.has('title'));   // true
console.log(wrapper.has('missing')); // false

// Get raw data
console.log(wrapper.toJSON()); // { title: 'hello world', count: 42 }
```

## Usage Examples

### Password Validation Form

```javascript
class PasswordValidator {
  constructor(inputElement, feedbackElement) {
    this.input = inputElement;
    this.feedback = feedbackElement;
    
    // Debounced validation to avoid excessive calls
    this.validatePassword = MOJOUtils.debounce(
      this.checkStrength.bind(this), 
      300
    );
    
    this.input.addEventListener('input', this.validatePassword);
  }
  
  checkStrength() {
    const password = this.input.value;
    const analysis = MOJOUtils.checkPasswordStrength(password);
    
    // Update UI based on strength
    this.feedback.className = `password-feedback ${analysis.strength}`;
    this.feedback.innerHTML = `
      <div class="strength-meter">
        <div class="strength-bar" style="width: ${(analysis.score / 8) * 100}%"></div>
      </div>
      <ul class="feedback-list">
        ${analysis.feedback.map(msg => `<li>${msg}</li>`).join('')}
      </ul>
    `;
  }
  
  generateSecurePassword() {
    const password = MOJOUtils.generatePassword({
      length: 16,
      excludeAmbiguous: true
    });
    
    this.input.value = password;
    this.checkStrength();
    
    return password;
  }
}
```

### Data Processing Pipeline

```javascript
class DataProcessor {
  constructor(apiData) {
    // Wrap API data for consistent access
    this.data = MOJOUtils.wrapData(apiData);
  }
  
  processUserData() {
    return this.data.users.map(user => {
      // Create wrapped user data with pipe support
      const wrappedUser = MOJOUtils.wrapData(user);
      
      return {
        id: user.id,
        displayName: wrappedUser.get('name|title-case'),
        email: wrappedUser.get('email|lowercase'),
        joinDate: wrappedUser.get('created_at|date(MM/dd/yyyy)'),
        status: wrappedUser.get('status|uppercase')
      };
    });
  }
  
  searchUsers(query) {
    // Debounced search to avoid excessive API calls
    return MOJOUtils.debounce(() => {
      const escaped = MOJOUtils.escapeHtml(query);
      return this.data.users.filter(user => 
        user.name.toLowerCase().includes(escaped.toLowerCase())
      );
    }, 250);
  }
}
```

### Configuration Manager

```javascript
class ConfigManager {
  constructor() {
    this.defaults = {
      api: {
        baseUrl: 'https://api.example.com',
        timeout: 5000,
        retries: 3
      },
      ui: {
        theme: 'light',
        language: 'en',
        notifications: true
      },
      security: {
        sessionTimeout: 3600,
        requireStrongPasswords: true
      }
    };
  }
  
  loadConfig(userConfig = {}) {
    // Deep merge user config with defaults
    this.config = MOJOUtils.deepMerge(
      {},
      this.defaults,
      userConfig
    );
    
    // Generate unique session ID
    this.sessionId = MOJOUtils.generateId('session');
    
    return this.config;
  }
  
  getConfig(path) {
    return MOJOUtils.getNestedValue(this.config, path);
  }
  
  validatePasswordPolicy(password) {
    if (!this.getConfig('security.requireStrongPasswords')) {
      return { valid: true };
    }
    
    const analysis = MOJOUtils.checkPasswordStrength(password);
    return {
      valid: analysis.score >= 6,
      feedback: analysis.feedback,
      strength: analysis.strength
    };
  }
  
  exportConfig() {
    // Create clean copy for export
    return MOJOUtils.deepClone(this.config);
  }
}
```

### URL Builder Utility

```javascript
class UrlBuilder {
  constructor(baseUrl) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
  }
  
  build(path, params = {}) {
    const cleanPath = path.replace(/^\//, ''); // Remove leading slash
    let url = `${this.baseUrl}/${cleanPath}`;
    
    // Add query parameters if provided
    if (Object.keys(params).length > 0) {
      const queryString = MOJOUtils.toQueryString(params);
      url += `?${queryString}`;
    }
    
    return url;
  }
  
  parseCurrentUrl() {
    const url = new URL(window.location.href);
    return {
      path: url.pathname,
      params: MOJOUtils.parseQueryString(url.search),
      hash: url.hash
    };
  }
}

// Usage
const urlBuilder = new UrlBuilder('https://api.example.com');
const apiUrl = urlBuilder.build('users', { page: 2, limit: 20 });
// Result: "https://api.example.com/users?page=2&limit=20"
```

## Best Practices

### 1. Data Access Patterns

```javascript
// Good: Use getContextData for template-like access with pipes
const displayName = MOJOUtils.getContextData(user, 'name|title-case');

// Good: Use getNestedValue for simple nested access
const email = MOJOUtils.getNestedValue(user, 'profile.email');

// Avoid: Direct nested access without null checking
// const email = user.profile.email; // Could throw if profile is null
```

### 2. Performance Considerations

```javascript
// Good: Debounce expensive operations
const debouncedSearch = MOJOUtils.debounce(performSearch, 300);

// Good: Throttle frequent events
const throttledScroll = MOJOUtils.throttle(updateScrollIndicator, 100);

// Good: Clone objects when you need to modify them
const userCopy = MOJOUtils.deepClone(originalUser);
userCopy.name = 'Modified';
```

### 3. Security Best Practices

```javascript
// Good: Always escape user input for HTML
const safeContent = MOJOUtils.escapeHtml(userInput);
element.innerHTML = safeContent;

// Good: Use strong password generation
const password = MOJOUtils.generatePassword({
  length: 16,
  excludeAmbiguous: true
});

// Good: Validate password strength
const validation = MOJOUtils.checkPasswordStrength(userPassword);
if (validation.score < 6) {
  showPasswordFeedback(validation.feedback);
}
```

### 4. Configuration Management

```javascript
// Good: Use deep merge for configuration
const config = MOJOUtils.deepMerge({}, defaults, userConfig, environmentConfig);

// Good: Generate unique IDs for tracking
const requestId = MOJOUtils.generateId('req');
console.log(`Processing request ${requestId}`);
```

This comprehensive utility library provides the foundation for robust, secure, and maintainable MOJO applications. All utilities are designed to work seamlessly with the MOJO framework's data binding and templating systems.