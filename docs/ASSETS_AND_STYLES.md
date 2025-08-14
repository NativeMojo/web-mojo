# MOJO Framework - CSS, Templates, and Assets Guide

This guide explains how to use CSS styles, templates, and other assets from the MOJO Framework (`web-mojo` package).

## Table of Contents

1. [CSS and Styles](#css-and-styles)
2. [Templates](#templates)
3. [Component-Specific Assets](#component-specific-assets)
4. [Custom Styling](#custom-styling)
5. [Build Configuration](#build-configuration)
6. [Best Practices](#best-practices)

## CSS and Styles

### Importing Main Framework Styles

The MOJO framework provides CSS in multiple ways:

#### Method 1: Import All Styles (Recommended)
```javascript
// Import main MOJO styles
import 'web-mojo/css';
// or
import 'web-mojo/styles';

// Also import Bootstrap (required)
import 'bootstrap/dist/css/bootstrap.min.css';
```

#### Method 2: Import Specific Style Files
```javascript
// Import specific style modules
import 'web-mojo/css/components.css';
import 'web-mojo/css/portal.css';
import 'web-mojo/css/forms.css';
```

#### Method 3: HTML Link Tags
```html
<!-- In your HTML head -->
<link rel="stylesheet" href="node_modules/web-mojo/dist/web-mojo.css">
<link rel="stylesheet" href="node_modules/web-mojo/dist/css/portal.css">
```

#### Method 4: CDN
```html
<!-- Using unpkg CDN -->
<link rel="stylesheet" href="https://unpkg.com/web-mojo/dist/web-mojo.css">

<!-- Using jsDelivr CDN -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/web-mojo/dist/web-mojo.css">
```

### Available CSS Files

After building, the framework provides these CSS files:

```
dist/
├── web-mojo.css           # Main framework styles
├── css/
│   ├── portal.css        # Portal-specific styles
│   ├── components.css    # Component styles
│   └── forms.css         # Form-specific styles
└── css-manifest.json     # Index of all available CSS files
```

### Using CSS Manifest

The framework generates a `css-manifest.json` file listing all available styles:

```javascript
// Load and use the CSS manifest
import cssManifest from 'web-mojo/css-manifest.json';

// Dynamically load styles
Object.entries(cssManifest.styles).forEach(([name, path]) => {
  if (shouldLoadStyle(name)) {
    import(`web-mojo${path}`);
  }
});
```

## Templates

### Template Formats

MOJO supports multiple template formats:
- `.mst` - Mustache templates (primary)
- `.html` - HTML templates
- `.htm` - HTML templates (alternative)

### Accessing Templates

#### Method 1: Import as Strings (Build-time)
```javascript
// If your bundler supports it (Vite, Webpack with raw-loader)
import loginTemplate from 'web-mojo/templates/auth/LoginPage.mst?raw';
import tableTemplate from 'web-mojo/templates/components/TablePage.mst?raw';

// Use in your component
class LoginPage extends Page {
  render() {
    return Mustache.render(loginTemplate, this.data);
  }
}
```

#### Method 2: Fetch at Runtime
```javascript
class MyPage extends Page {
  async loadTemplate() {
    const response = await fetch('/node_modules/web-mojo/dist/templates/components/TablePage.mst');
    this.template = await response.text();
  }
  
  render() {
    return Mustache.render(this.template, this.data);
  }
}
```

#### Method 3: Use Template Registry
```javascript
import { TemplateRegistry } from 'web-mojo/utils';

// Register templates at startup
TemplateRegistry.register('login', '/templates/auth/LoginPage.mst');
TemplateRegistry.register('table', '/templates/components/TablePage.mst');

// Use in components
class LoginPage extends Page {
  async render() {
    const template = await TemplateRegistry.get('login');
    return Mustache.render(template, this.data);
  }
}
```

### Available Templates

The framework provides these templates:

```
dist/templates/
├── auth/
│   ├── LoginPage.mst
│   ├── RegisterPage.mst
│   └── ForgotPasswordPage.mst
├── components/
│   └── TablePage.mst
└── index.js              # Auto-generated template exports
```

### Using Template Index

```javascript
// Import all templates (if your bundler supports it)
import * as templates from 'web-mojo/templates';

// Use a specific template
const loginTemplate = templates.LoginPage;
```

## Component-Specific Assets

### Component Styles

Each component may have its own styles that can be imported separately:

```javascript
// Import only Table component with its styles
import Table from 'web-mojo/components/Table';
import 'web-mojo/css/components/table.css';

// Import only Form components with styles
import { FormBuilder, FormView } from 'web-mojo/components';
import 'web-mojo/css/components/forms.css';
```

### Component Templates

Components can have embedded templates or external template files:

```javascript
// Component with embedded template
class MyTable extends Table {
  getTemplate() {
    return `
      <table class="table">
        {{#rows}}
        <tr>{{.}}</tr>
        {{/rows}}
      </table>
    `;
  }
}

// Component with external template
class MyTable extends Table {
  constructor(options) {
    super(options);
    this.templatePath = 'web-mojo/templates/components/TablePage.mst';
  }
}
```

## Custom Styling

### Overriding Framework Styles

#### Method 1: CSS Cascade
```css
/* Your custom styles - load after MOJO styles */
.mojo-nav {
  background-color: #custom-color;
}

.mojo-sidebar {
  width: 300px; /* Override default width */
}
```

#### Method 2: CSS Variables
```css
:root {
  /* Override MOJO CSS variables */
  --mojo-primary-color: #007bff;
  --mojo-sidebar-width: 250px;
  --mojo-nav-height: 60px;
  --mojo-font-family: 'Custom Font', sans-serif;
}
```

#### Method 3: Component Styling Props
```javascript
const nav = new TopNav({
  className: 'my-custom-nav',
  style: {
    backgroundColor: '#custom',
    height: '70px'
  }
});
```

### Creating Theme Files

```javascript
// themes/dark-theme.css
:root[data-theme="dark"] {
  --mojo-bg-color: #1a1a1a;
  --mojo-text-color: #ffffff;
  --mojo-border-color: #333333;
}

// themes/light-theme.css
:root[data-theme="light"] {
  --mojo-bg-color: #ffffff;
  --mojo-text-color: #333333;
  --mojo-border-color: #dddddd;
}
```

```javascript
// Apply theme
import 'web-mojo/css';
import './themes/dark-theme.css';

document.documentElement.setAttribute('data-theme', 'dark');
```

## Build Configuration

### Vite Configuration

To properly handle MOJO assets in your Vite project:

```javascript
// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  css: {
    // Include MOJO styles in CSS processing
    include: ['web-mojo/css/**/*.css']
  },
  assetsInclude: [
    // Include templates as assets
    '**/*.mst',
    '**/*.html'
  ],
  optimizeDeps: {
    include: [
      'web-mojo',
      'web-mojo/css'
    ]
  }
});
```

### Webpack Configuration

For Webpack projects:

```javascript
// webpack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.(mst|html)$/,
        type: 'asset/source' // Load as string
      }
    ]
  }
};
```

### Rollup Configuration

For Rollup projects:

```javascript
// rollup.config.js
import css from 'rollup-plugin-css-only';
import { string } from 'rollup-plugin-string';

export default {
  plugins: [
    css({ output: 'bundle.css' }),
    string({
      include: '**/*.mst'
    })
  ]
};
```

## Best Practices

### 1. Load Order

Always load styles in this order:
1. Bootstrap CSS (required)
2. MOJO Framework CSS
3. Your custom styles

```javascript
import 'bootstrap/dist/css/bootstrap.min.css';
import 'web-mojo/css';
import './my-custom-styles.css';
```

### 2. Template Management

Create a template manager for your application:

```javascript
// utils/templateManager.js
class TemplateManager {
  constructor() {
    this.cache = new Map();
  }
  
  async load(path) {
    if (this.cache.has(path)) {
      return this.cache.get(path);
    }
    
    const response = await fetch(path);
    const template = await response.text();
    this.cache.set(path, template);
    return template;
  }
  
  preload(paths) {
    return Promise.all(paths.map(path => this.load(path)));
  }
}

export default new TemplateManager();
```

### 3. CSS Optimization

For production, only import the CSS you need:

```javascript
// Instead of importing all styles
import 'web-mojo/css';

// Import only what you use
import 'web-mojo/css/core.css';
import 'web-mojo/css/components/table.css';
import 'web-mojo/css/components/forms.css';
```

### 4. Asset Bundling

Configure your bundler to optimize MOJO assets:

```javascript
// vite.config.js for production
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name.includes('web-mojo')) {
            return 'vendor/mojo/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        }
      }
    }
  }
});
```

### 5. Lazy Loading

Load component styles on demand:

```javascript
// Lazy load component and its styles
async function loadTableComponent() {
  const [{ default: Table }] = await Promise.all([
    import('web-mojo/components/Table'),
    import('web-mojo/css/components/table.css')
  ]);
  
  return Table;
}

// Use when needed
const Table = await loadTableComponent();
const table = new Table({ /* options */ });
```

## Examples

### Complete Setup Example

```javascript
// main.js - Application entry point
import MOJO from 'web-mojo';
import { TopNav, Sidebar, MainContent } from 'web-mojo/components';

// Import all styles
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'web-mojo/css';
import './custom-styles.css';

// Import templates you'll use
import loginTemplate from 'web-mojo/templates/auth/LoginPage.mst?raw';
import dashboardTemplate from './templates/dashboard.mst?raw';

// Initialize application
const app = new MOJO({
  container: '#app',
  templates: {
    login: loginTemplate,
    dashboard: dashboardTemplate
  }
});

// Start application
app.start();
```

### Custom Component with Styles

```javascript
// components/MyCustomTable.js
import { Table } from 'web-mojo/components';
import './MyCustomTable.css';

export class MyCustomTable extends Table {
  constructor(options) {
    super({
      ...options,
      className: 'my-custom-table ' + (options.className || '')
    });
  }
  
  getStyles() {
    // Return component-specific styles
    return `
      .my-custom-table {
        border: 2px solid var(--mojo-primary-color);
      }
      .my-custom-table th {
        background-color: var(--mojo-primary-color);
        color: white;
      }
    `;
  }
}
```

```css
/* MyCustomTable.css */
.my-custom-table {
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.my-custom-table tbody tr:hover {
  background-color: rgba(0,123,255,0.1);
}
```

## Troubleshooting

### CSS Not Loading

1. Check import order - Bootstrap should be first
2. Verify the path to web-mojo CSS files
3. Check bundler configuration for CSS handling
4. Ensure `npm install` or `npm link` completed successfully

### Templates Not Found

1. Verify template files exist in `node_modules/web-mojo/dist/templates/`
2. Check the path in your import/fetch statements
3. Ensure your bundler is configured to handle `.mst` files
4. Check CORS if loading templates from a different domain

### Style Conflicts

1. Use more specific selectors for overrides
2. Load custom styles after MOJO styles
3. Use CSS variables for theming instead of direct overrides
4. Consider using CSS modules or scoped styles

### Build Issues

1. Clear bundler cache (`rm -rf node_modules/.vite`)
2. Rebuild the framework (`npm run build:lib`)
3. Verify all peer dependencies are installed
4. Check for version conflicts in package.json

## Summary

The MOJO framework provides flexible ways to use CSS and templates:

- **CSS**: Import all or specific styles, use CDN, or load dynamically
- **Templates**: Import at build time, fetch at runtime, or use registry
- **Customization**: Override with CSS cascade, variables, or component props
- **Optimization**: Lazy load, tree-shake, and bundle efficiently

Choose the method that best fits your project's architecture and build system.