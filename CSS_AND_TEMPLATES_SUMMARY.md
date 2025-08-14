# MOJO Framework - CSS and Templates Summary

## Build Output Structure

After running `npm run build:lib`, the MOJO framework (web-mojo) produces the following asset structure:

```
dist/
├── web-mojo.esm.js         # ES Module build
├── web-mojo.cjs.js         # CommonJS build
├── web-mojo.umd.js         # UMD build (browser)
├── css/
│   ├── web-mojo.css        # Main framework styles
│   ├── portal.css          # Portal-specific styles
│   └── mojo-source.css     # Original source styles
├── templates/
│   ├── auth/pages/
│   │   ├── LoginPage.mst
│   │   ├── RegisterPage.mst
│   │   └── ForgotPasswordPage.mst
│   ├── components/
│   │   └── TablePage.mst
│   └── index.js            # Template exports
└── css-manifest.json        # CSS file index
```

## Importing CSS

### Method 1: ES6 Import (Recommended for Bundlers)
```javascript
// Import main framework CSS
import 'web-mojo/css';
// or
import 'web-mojo/styles';

// Import specific CSS files
import 'web-mojo/css/portal.css';

// Always include Bootstrap (peer dependency)
import 'bootstrap/dist/css/bootstrap.min.css';
```

### Method 2: HTML Link Tags
```html
<!-- Bootstrap (required) -->
<link href="node_modules/bootstrap/dist/css/bootstrap.min.css" rel="stylesheet">

<!-- MOJO Framework CSS -->
<link href="node_modules/web-mojo/dist/css/web-mojo.css" rel="stylesheet">

<!-- Optional: Portal styles -->
<link href="node_modules/web-mojo/dist/css/portal.css" rel="stylesheet">
```

### Method 3: CDN
```html
<!-- Bootstrap -->
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5/dist/css/bootstrap.min.css" rel="stylesheet">

<!-- MOJO Framework -->
<link href="https://unpkg.com/web-mojo/dist/css/web-mojo.css" rel="stylesheet">
<link href="https://unpkg.com/web-mojo/dist/css/portal.css" rel="stylesheet">
```

## Using Templates

### Method 1: Build-time Import (Vite/Webpack)
```javascript
// Import template as raw string
import loginTemplate from 'web-mojo/templates/auth/pages/LoginPage.mst?raw';
import tableTemplate from 'web-mojo/templates/components/TablePage.mst?raw';

// Use with Mustache
import { mustache } from 'web-mojo';

class LoginPage extends Page {
  render() {
    return mustache.render(loginTemplate, this.data);
  }
}
```

### Method 2: Runtime Fetch
```javascript
class MyComponent extends View {
  async loadTemplate() {
    const response = await fetch('/node_modules/web-mojo/dist/templates/components/TablePage.mst');
    this.template = await response.text();
  }
  
  render() {
    return mustache.render(this.template, this.data);
  }
}
```

### Method 3: Template Index
```javascript
// Import template paths
import * as templates from 'web-mojo/templates';

console.log(templates.LoginPage);  // './templates/auth/pages/LoginPage.mst'
console.log(templates.TablePage);  // './templates/components/TablePage.mst'
```

## CSS Variables for Customization

```css
/* Override MOJO default styles with CSS variables */
:root {
  /* Primary theme colors */
  --mojo-primary-color: #007bff;
  --mojo-secondary-color: #6c757d;
  
  /* Layout dimensions */
  --mojo-sidebar-width: 250px;
  --mojo-nav-height: 60px;
  
  /* Typography */
  --mojo-font-family: system-ui, -apple-system, sans-serif;
  --mojo-font-size-base: 14px;
  
  /* Component styling */
  --mojo-border-radius: 4px;
  --mojo-box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

/* Dark theme example */
:root[data-theme="dark"] {
  --mojo-bg-color: #1a1a1a;
  --mojo-text-color: #ffffff;
  --mojo-border-color: #333333;
}
```

## Available Templates

| Template | Path | Description |
|----------|------|-------------|
| LoginPage.mst | `templates/auth/pages/LoginPage.mst` | Complete login form with validation |
| RegisterPage.mst | `templates/auth/pages/RegisterPage.mst` | User registration form |
| ForgotPasswordPage.mst | `templates/auth/pages/ForgotPasswordPage.mst` | Password reset form |
| TablePage.mst | `templates/components/TablePage.mst` | Data table with sorting and filtering |

## CSS Manifest

The framework generates a `css-manifest.json` file that lists all available CSS files:

```json
{
  "main": "./web-mojo.css",
  "styles": {
    "mojo-source": "./css/mojo-source.css",
    "portal": "./css/portal.css",
    "web-mojo": "./css/web-mojo.css"
  }
}
```

Use this for dynamic CSS loading:
```javascript
import cssManifest from 'web-mojo/css-manifest.json';

// Load specific styles dynamically
Object.entries(cssManifest.styles).forEach(([name, path]) => {
  if (shouldLoadStyle(name)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `/node_modules/web-mojo/dist${path.substring(1)}`;
    document.head.appendChild(link);
  }
});
```

## Quick Start Examples

### Basic Setup
```javascript
// main.js
import MOJO, { View, Page, Router } from 'web-mojo';
import 'web-mojo/css';
import 'bootstrap/dist/css/bootstrap.min.css';

const app = new MOJO({
  container: '#app'
});

app.start();
```

### Using with Templates
```javascript
import { Page, mustache } from 'web-mojo';
import loginTemplate from 'web-mojo/templates/auth/pages/LoginPage.mst?raw';

class LoginPage extends Page {
  constructor() {
    super({
      name: 'login',
      title: 'Login'
    });
  }
  
  render() {
    return mustache.render(loginTemplate, {
      title: 'Welcome Back',
      submitText: 'Sign In',
      forgotPasswordLink: '/forgot-password'
    });
  }
}
```

### Custom Styling
```css
/* my-app.css - Load after web-mojo/css */
:root {
  --mojo-primary-color: #2196f3;
  --mojo-nav-height: 70px;
}

/* Override specific components */
.mojo-nav {
  background: linear-gradient(135deg, var(--mojo-primary-color), #64b5f6);
}

.mojo-sidebar {
  background-color: #f5f5f5;
}
```

## Build Commands

```bash
# Build the library with CSS and templates
npm run build:lib

# Build and watch for changes
npm run build:lib:watch

# Build CSS separately
npm run build:css

# Full distribution build
npm run build:dist
```

## File Size Information

| File | Size (KB) | Gzipped (KB) |
|------|-----------|--------------|
| web-mojo.esm.js | ~393 | ~82 |
| web-mojo.cjs.js | ~215 | ~55 |
| web-mojo.umd.js | ~215 | ~55 |
| web-mojo.css | ~9 | ~2 |
| portal.css | ~5 | ~1.5 |

## Troubleshooting

### CSS Not Loading
- Ensure Bootstrap is loaded before MOJO CSS
- Check the import path: `web-mojo/css` not `web-mojo/dist/css`
- Verify the build was successful: `npm run build:lib`

### Templates Not Found
- Templates are in `dist/templates/` after build
- Use `?raw` suffix for Vite imports
- Check CORS if loading from different domain

### Style Conflicts
- Load custom styles after MOJO styles
- Use CSS variables for theming
- Use more specific selectors for overrides

## Summary

The MOJO framework exposes CSS and templates through:

1. **Multiple import methods**: ES6, CommonJS, UMD, CDN
2. **Organized structure**: Separate folders for CSS and templates
3. **Flexible usage**: Build-time or runtime loading
4. **Easy customization**: CSS variables and override patterns
5. **Complete assets**: All styles and templates included in distribution

For development, use `npm link web-mojo` to test the framework in your projects with live updates.