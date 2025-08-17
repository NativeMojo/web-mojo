# MOJO Framework Library Usage & Development Guide

## Package Name: `web-mojo`

MOJO Framework is distributed as `web-mojo` on npm to avoid naming conflicts while maintaining the MOJO brand identity.

## Table of Contents

1. [Installation](#installation)
2. [Basic Usage](#basic-usage)
3. [CSS and Styles](#css-and-styles)
4. [Templates](#templates)
5. [Development Linking](#development-linking)
6. [Import Methods](#import-methods)
7. [Development Workflow](#development-workflow)
8. [API Reference](#api-reference)
9. [Troubleshooting](#troubleshooting)

## Installation

### From NPM (Once Published)

```bash
npm install web-mojo bootstrap
# or
yarn add web-mojo bootstrap
# or
pnpm add web-mojo bootstrap
```

### From GitHub

```bash
npm install github:yourusername/web-mojo bootstrap
```

### From Local Development (See Development Linking)

```bash
npm link web-mojo
```

## Basic Usage

### ES6 Modules (Recommended)

```javascript
// Import the main MOJO class
import MOJO from 'web-mojo';

// Import specific components
import { View, Page, Router } from 'web-mojo';

// Import CSS
import 'web-mojo/css';
import 'bootstrap/dist/css/bootstrap.min.css';

// Initialize your application
const app = new MOJO({
  container: '#app',
  router: {
    mode: 'history', // or 'param' for static hosting
    base: '/'
  }
});

// Start the application
app.start();
```

### CommonJS (Node.js)

```javascript
const MOJO = require('web-mojo');
const { View, Page, Router } = require('web-mojo');

const app = new MOJO({
  container: '#app'
});

app.start();
```

### UMD (Browser Script Tag)

```html
<!DOCTYPE html>
<html>
<head>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5/dist/css/bootstrap.min.css" rel="stylesheet">
  <link href="https://unpkg.com/web-mojo/dist/web-mojo.css" rel="stylesheet">
</head>
<body>
  <div id="app"></div>
  
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5/dist/js/bootstrap.bundle.min.js"></script>
  <script src="https://unpkg.com/web-mojo/dist/web-mojo.umd.js"></script>
  <script>
    // MOJO is available as a global variable
    const app = new MOJO.default({
      container: '#app'
    });
    
    // Access components
    const { View, Page, Router } = MOJO;
    
    app.start();
  </script>
</body>
</html>
```

## CSS and Styles

### Importing Framework Styles

MOJO provides multiple ways to import CSS:

```javascript
// Import all framework styles (recommended)
import 'web-mojo/css';
// or
import 'web-mojo/styles';

// Import specific style modules
import 'web-mojo/css/portal.css';
import 'web-mojo/css/components.css';

// Always include Bootstrap (peer dependency)
import 'bootstrap/dist/css/bootstrap.min.css';
```

### Using CDN

```html
<!-- Bootstrap (required) -->
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5/dist/css/bootstrap.min.css" rel="stylesheet">

<!-- MOJO Framework styles -->
<link href="https://unpkg.com/web-mojo/dist/web-mojo.css" rel="stylesheet">
```

### CSS Variables

Customize the framework appearance with CSS variables:

```css
:root {
  --mojo-primary-color: #007bff;
  --mojo-sidebar-width: 250px;
  --mojo-nav-height: 60px;
  --mojo-font-family: system-ui, sans-serif;
}
```

## Templates

### Using Framework Templates

MOJO includes pre-built templates for common components:

```javascript
// Import templates at build time (with Vite/Webpack)
import loginTemplate from 'web-mojo/templates/auth/LoginPage.mst?raw';
import tableTemplate from 'web-mojo/templates/components/TablePage.mst?raw';

// Use in your components
import mustache from 'web-mojo/utils/mustache';

class LoginPage extends Page {
  render() {
    return mustache.render(loginTemplate, this.data);
  }
}
```

### Runtime Template Loading

```javascript
class MyPage extends Page {
  async loadTemplate() {
    const response = await fetch('/node_modules/web-mojo/dist/templates/components/TablePage.mst');
    this.template = await response.text();
  }
  
  render() {
    return mustache.render(this.template, this.data);
  }
}
```

### Available Templates

- `auth/LoginPage.mst` - Login form template
- `auth/RegisterPage.mst` - Registration form template
- `auth/ForgotPasswordPage.mst` - Password reset template
- `components/TablePage.mst` - Data table template

For detailed information about CSS and templates, see the [Assets and Styles Guide](ASSETS_AND_STYLES.md).

## Development Linking

When developing both the MOJO framework and a project that uses it simultaneously, use npm linking for real-time updates.

### Step 1: Prepare MOJO for Linking

```bash
# Navigate to your MOJO framework directory
cd /path/to/web-mojo

# Create a global link
npm link

# Start the build watcher (keeps building on changes)
npm run build:lib:watch
```

### Step 2: Link in Your Project

```bash
# Navigate to your project
cd /path/to/my-project

# Link to the local MOJO development version
npm link web-mojo

# Install other dependencies
npm install bootstrap
```

### Step 3: Verify the Link

```bash
# Check if the link is active
ls -la node_modules/web-mojo

# Should show a symlink pointing to your local web-mojo directory
# Example: web-mojo -> ../../../web-mojo
```

### Step 4: Development Workflow

Open two terminal windows:

**Terminal 1 - MOJO Framework:**
```bash
cd /path/to/web-mojo
npm run dev:framework  # Runs both build:watch and dev server
```

**Terminal 2 - Your Project:**
```bash
cd /path/to/my-project
npm run dev  # Your project's dev server
```

Now any changes to MOJO source files will automatically rebuild and be available in your project!

### Step 5: Unlinking (When Done)

```bash
# In your project
npm unlink web-mojo
npm install web-mojo  # Install from npm registry

# In MOJO framework (optional)
npm unlink
```

## Import Methods

### Direct Imports from Source (Development)

During development, you can import directly from source for immediate updates:

```javascript
// Import from source during development
import MOJO from 'web-mojo/src/mojo.js';
import View from 'web-mojo/src/core/View.js';
import Page from 'web-mojo/src/core/Page.js';
```

### Production Imports

```javascript
// Import from built distribution
import MOJO from 'web-mojo';
import { View, Page, Router, Model, Collection } from 'web-mojo';
```

### Component Imports

```javascript
// Import specific components
import { 
  Table, 
  TablePage, 
  Dialog,
  TopNav,
  Sidebar,
  MainContent,
  FormBuilder 
} from 'web-mojo';
```

### Utility Imports

```javascript
// Import utilities
import { 
  EventBus, 
  mustache, 
  DataFormatter,
  MustacheFormatter,
  MOJOUtils 
} from 'web-mojo';
```

## Development Workflow

### Project Structure Example

```
my-workspace/
├── web-mojo/              # MOJO framework development
│   ├── src/
│   ├── dist/
│   ├── examples/
│   └── package.json
│
└── my-app/                # Your application
    ├── src/
    ├── public/
    └── package.json
```

### Vite Configuration for Your Project

Create a `vite.config.js` in your project:

```javascript
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      // During development, point directly to source
      'web-mojo': path.resolve(__dirname, '../web-mojo/src'),
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    port: 3001,  // Different from MOJO's dev server
    fs: {
      // Allow serving files from parent directory
      allow: ['..']
    }
  },
  optimizeDeps: {
    // Exclude during development for immediate updates
    exclude: ['web-mojo']
  }
});
```

### Package.json Scripts for Your Project

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "link:mojo": "npm link web-mojo",
    "unlink:mojo": "npm unlink web-mojo && npm install web-mojo"
  }
}
```

### VS Code Multi-Root Workspace

Create a `.code-workspace` file for better development experience:

```json
{
  "folders": [
    {
      "name": "MOJO Framework",
      "path": "web-mojo"
    },
    {
      "name": "My App",
      "path": "my-app"
    }
  ],
  "settings": {
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
      "source.fixAll.eslint": true
    },
    "files.autoSave": "afterDelay",
    "search.exclude": {
      "**/node_modules": true,
      "**/dist": true
    }
  },
  "launch": {
    "configurations": [
      {
        "type": "chrome",
        "request": "launch",
        "name": "Launch MOJO Examples",
        "url": "http://localhost:3000"
      },
      {
        "type": "chrome",
        "request": "launch",
        "name": "Launch My App",
        "url": "http://localhost:3001"
      }
    ]
  }
}
```

## API Reference

### Main Class

```javascript
import MOJO from 'web-mojo';

const app = new MOJO({
  container: '#app',     // DOM selector or element
  router: {
    mode: 'history',     // 'history' | 'param'
    base: '/'           // Base path for routing
  },
  debug: true,          // Enable debug mode
  theme: 'light'        // 'light' | 'dark'
});
```

### Core Components

```javascript
import { View, Page, Router, Model, Collection } from 'web-mojo';

// Create a custom View
class MyView extends View {
  constructor(options) {
    super(options);
  }
  
  render() {
    return `<div>My Custom View</div>`;
  }
}

// Create a custom Page
class MyPage extends Page {
  constructor(options) {
    super({
      ...options,
      name: 'my-page',
      title: 'My Page'
    });
  }
  
  onParams(params, query) {
    // Handle route parameters
  }
}

// Create a Model
class UserModel extends Model {
  constructor(data) {
    super(data);
    this.urlRoot = '/api/users';
  }
}
```

### Creating a Complete Application

```javascript
import MOJO, { Page, Router } from 'web-mojo';
import 'web-mojo/css';

// Create pages
class HomePage extends Page {
  constructor() {
    super({ name: 'home', title: 'Home' });
  }
  
  render() {
    return `
      <div class="container">
        <h1>Welcome to My App</h1>
        <a href="?page=about" data-page="about">About</a>
      </div>
    `;
  }
}

class AboutPage extends Page {
  constructor() {
    super({ name: 'about', title: 'About' });
  }
  
  render() {
    return `
      <div class="container">
        <h1>About Us</h1>
        <a href="?page=home" data-page="home">Home</a>
      </div>
    `;
  }
}

// Initialize app
const app = new MOJO({
  container: '#app',
  router: { mode: 'param' }
});

// Register pages
app.registerPage('home', HomePage);
app.registerPage('about', AboutPage);

// Setup routes
app.router.add('/', 'home');
app.router.add('/about', 'about');

// Start the application
app.start();
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Changes to MOJO not reflecting in project

**Solution:** Ensure the build watcher is running:
```bash
cd /path/to/web-mojo
npm run build:lib:watch
```

#### 2. Module not found errors

**Solution:** Verify the link is active:
```bash
npm ls web-mojo  # Should show link symbol
```

#### 3. Bootstrap styles not working

**Solution:** Ensure Bootstrap is imported:
```javascript
import 'bootstrap/dist/css/bootstrap.min.css';
```

#### 4. Build errors with Vite

**Solution:** Clear cache and rebuild:
```bash
rm -rf node_modules/.vite
npm run build:lib
```

#### 5. Global MOJO not available

**Solution:** Explicitly set in window:
```javascript
import MOJO from 'web-mojo';
window.MOJO = MOJO;
```

### Debug Mode

Enable debug mode for detailed logging:

```javascript
const app = new MOJO({
  container: '#app',
  debug: true  // Enables verbose logging
});

// Or enable globally
window.MOJO_DEBUG = true;
```

### Performance Tips

1. **Import only what you need:**
   ```javascript
   import { View, Page } from 'web-mojo';
   // Instead of: import MOJO from 'web-mojo';
   ```

2. **Use production builds:**
   ```bash
   npm run build:lib  # Minified and optimized
   ```

3. **Enable tree-shaking in your bundler:**
   ```javascript
   // vite.config.js
   export default {
     build: {
       rollupOptions: {
         treeshake: true
       }
     }
   }
   ```

## Support and Resources

- **Documentation:** [https://github.com/yourusername/web-mojo/docs](https://github.com/yourusername/web-mojo/docs)
- **Assets & Styles Guide:** [Assets and Styles Documentation](ASSETS_AND_STYLES.md)
- **Examples:** [https://github.com/yourusername/web-mojo/examples](https://github.com/yourusername/web-mojo/examples)
- **Issues:** [https://github.com/yourusername/web-mojo/issues](https://github.com/yourusername/web-mojo/issues)
- **NPM Package:** [https://www.npmjs.com/package/web-mojo](https://www.npmjs.com/package/web-mojo)

## License

MIT License - See [LICENSE](../LICENSE) file for details.