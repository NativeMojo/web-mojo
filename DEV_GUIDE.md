# MOJO Framework Developer Guide

This guide covers everything you need to know for developing and extending the MOJO framework itself.

## Table of Contents

- [Project Structure](#project-structure)
- [Development Setup](#development-setup)
- [Import System & Aliases](#import-system--aliases)
- [Adding Models](#adding-models)
- [Creating Extensions](#creating-extensions)
- [Build System](#build-system)
- [Available Scripts](#available-scripts)
- [Testing](#testing)
- [Common Development Tasks](#common-development-tasks)
- [Architecture Guidelines](#architecture-guidelines)
- [Troubleshooting](#troubleshooting)

## Project Structure

```
web-mojo/
├── src/
│   ├── core/                    # Core framework code
│   │   ├── models/              # Data models (auto-exported)
│   │   ├── views/               # UI components
│   │   │   ├── data/           # Data display views
│   │   │   ├── feedback/       # Dialogs, toasts, etc.
│   │   │   ├── forms/          # Form components
│   │   │   ├── list/           # List views
│   │   │   ├── navigation/     # Nav, tabs, menus
│   │   │   └── table/          # Table components
│   │   ├── services/           # Business logic services
│   │   ├── utils/              # Utility functions
│   │   ├── mixins/             # Reusable behaviors
│   │   ├── forms/              # Form builders
│   │   ├── css/                # Core styles
│   │   ├── View.js             # Base view class
│   │   ├── Page.js             # Base page class
│   │   ├── Model.js            # Base model class
│   │   ├── Collection.js       # Base collection class
│   │   ├── WebApp.js           # Main app class
│   │   └── PortalApp.js        # Portal-specific app
│   ├── extensions/             # Framework extensions
│   │   ├── auth/               # Authentication extension
│   │   ├── lightbox/           # Image/PDF viewer extension
│   │   ├── charts/             # Data visualization extension
│   │   ├── admin/              # Admin interface extension
│   │   ├── docit/              # Documentation extension
│   │   └── loader/             # Loading animations extension
│   ├── index.js                # Main package entry point
│   ├── auth.js                 # Auth extension entry
│   ├── lightbox.js             # Lightbox extension entry
│   ├── charts.js               # Charts extension entry
│   ├── admin.js                # Admin extension entry
│   ├── docit.js                # DocIt extension entry
│   └── loader.js               # Loader extension entry
├── examples/                   # Example applications
├── docs/                       # Documentation
├── scripts/                    # Build and utility scripts
├── test/                       # Test files
└── dist/                       # Built distribution files
```

## Development Setup

### Prerequisites
- Node.js 16+ 
- npm 7+

### Initial Setup
```bash
# Clone and install
git clone <repository>
cd web-mojo
npm install

# Start development server
npm run dev

# Run with live reload for examples
npm run dev:live

# Full development mode (templates + version + dev + tests)
npm run dev:full
```

### Development Servers
- `npm run dev` - Basic dev server with template watching
- `npm run dev:live` - Live reload server for examples  
- `npm run examples` - Serve example applications
- `npm run serve` - Production-like server

## Import System & Aliases

### Internal Development (Extensions/Core)
Use aliases for internal development:

```javascript
// ✅ Core imports
import View from '@core/View.js';
import Page from '@core/Page.js';
import { User, Job } from '@core/models/User.js';
import TokenManager from '@core/services/TokenManager.js';
import Dialog from '@core/views/feedback/Dialog.js';

// ✅ Extension imports
import AuthManager from '@ext/auth/AuthManager.js';
import LoginPage from '@ext/auth/pages/LoginPage.js';
import LightboxViewer from '@ext/lightbox/ImageViewer.js';
```

### External Consumption (Examples/Apps)
Use package imports for external consumers:

```javascript
// ✅ Main package
import { View, Page, WebApp, Dialog } from 'web-mojo';

// ✅ Extension packages
import { mountAuth, createAuthClient } from 'web-mojo/auth';
import { LightboxViewer } from 'web-mojo/lightbox';
import { MetricsChart } from 'web-mojo/charts';

// ✅ Models subpackage
import { User, Job, UserList, JobForms } from 'web-mojo/models';
```

### Available Aliases
- `@core` → `src/core/`
- `@ext` → `src/extensions/`

### Import Rules
- **Extensions MUST use `@core`/`@ext` aliases** (not `'web-mojo'`)
- **External apps use package imports** (`'web-mojo'`, `'web-mojo/auth'`)
- **Never import `'web-mojo'` inside extensions** (creates circular deps)

## Adding Models

### Automatic Model System ✨

Models are automatically exported! Just create the file and run one command:

```bash
# 1. Create your model file
echo "export default class Product extends Model {}" > src/core/models/Product.js

# 2. Auto-generate exports
npm run generate:models

# 3. Use immediately!
import { Product } from 'web-mojo/models';
```

### Model File Structure
```javascript
// src/core/models/Product.js
import Model from '@core/Model.js';
import Collection from '@core/Collection.js';
import Rest from '@core/Rest.js';

export default class Product extends Model {
    constructor(attributes = {}) {
        super(attributes, {
            urlRoot: '/api/products',
            idAttribute: 'productId'
        });
    }
}

export class ProductList extends Collection {
    constructor(models = [], options = {}) {
        super(models, {
            model: Product,
            url: '/api/products',
            ...options
        });
    }
}

export class ProductForms extends Rest {
    constructor() {
        super({
            baseUrl: '/api/products/forms'
        });
    }
}
```

### Model Auto-Export Details
- **Scans**: `src/core/models/*.js` (excludes `index.js`)  
- **Generates**: `src/core/models/index.js` with all exports
- **Exports**: Both default class and named exports (`*`)
- **Updates**: `package.json` export for `'web-mojo/models'`
- **Runs automatically** on build (via `npm run build:lib`)

## Creating Extensions

### Extension Structure
```
src/extensions/my-extension/
├── css/
│   └── my-extension.css      # Extension styles
├── pages/                    # Extension pages
├── views/                    # Extension views  
├── models/                   # Extension-specific models
├── services/                 # Extension services
├── index.js                  # Optional convenience exports
└── MyExtensionApp.js         # Main extension class
```

### Extension Entry Point
Create `src/my-extension.js`:

```javascript
/**
 * My Extension - Entry Point
 */

// Bundle extension CSS
import '@ext/my-extension/css/my-extension.css';

// Export main classes
export { default as MyExtensionApp } from '@ext/my-extension/MyExtensionApp.js';
export { default as MyExtensionPage } from '@ext/my-extension/pages/MyExtensionPage.js';

// Convenience re-exports from core
export { default as WebApp } from '@core/WebApp.js';

// Version info passthrough
export {
  VERSION_INFO,
  VERSION,
  BUILD_TIME
} from './version.js';
```

### Register Extension in Build
Add to `vite.config.lib.js`:

```javascript
entry: [
  path.resolve(__dirname, 'src/index.js'),
  path.resolve(__dirname, 'src/auth.js'),
  path.resolve(__dirname, 'src/my-extension.js'), // Add here
  // ... other entries
],
```

Add to `package.json` exports:

```json
"./my-extension": {
  "import": "./dist/my-extension.es.js", 
  "require": "./dist/my-extension.cjs.js"
}
```

### Extension Registration Functions

For extensions with multiple pages/components, create a registration function:

```javascript
// In src/my-extension.js
import PageOneClass from '@ext/my-extension/pages/PageOne.js';
import PageTwoClass from '@ext/my-extension/pages/PageTwo.js';

export function registerMyExtensionPages(app, addToMenu = true) {
    // Register pages
    app.registerPage('my-extension/page-one', PageOneClass, {
        permissions: ["use_extension"]
    });
    app.registerPage('my-extension/page-two', PageTwoClass, {
        permissions: ["use_extension"] 
    });
    
    // Add to sidebar menu if requested
    if (addToMenu && app.sidebar) {
        const menuConfig = app.sidebar.getMenuConfig('admin');
        if (menuConfig?.items) {
            menuConfig.items.push({
                text: 'My Extension',
                route: '?page=my-extension/page-one',
                icon: 'bi-puzzle'
            });
        }
    }
    
    console.log('Registered My Extension pages');
}
```

### Using Extensions in Applications

```javascript
// In your app.js
import { PortalApp } from 'web-mojo';
import { registerAdminPages } from 'web-mojo/admin';
import { registerMyExtensionPages } from 'web-mojo/my-extension';

const app = new PortalApp({
    name: 'My App',
    // ... other config
});

// Register extension pages
try {
    registerAdminPages(app, true);
    registerMyExtensionPages(app, true);
    console.log('Extensions registered successfully');
} catch (error) {
    console.warn('Failed to register extensions:', error);
}

app.start();
```

## Build System

### Build Commands
```bash
# Library build (generates dist/)
npm run build:lib

# Full distribution build  
npm run build:dist

# Watch mode for development
npm run build:lib:watch

# Clean build artifacts
npm run clean

# Build templates only
npm run build:templates
```

### Build Configuration
- **Main config**: `vite.config.lib.js` (library builds)
- **Dev config**: `vite.config.js` (development server)
- **Loader config**: `vite.config.loader.js` (loader component)

### Build Outputs
```
dist/
├── index.es.js              # Main ES module
├── index.cjs.js             # Main CommonJS
├── auth.es.js               # Auth extension ES
├── auth.cjs.js              # Auth extension CJS
├── lightbox.es.js           # Lightbox extension ES
├── lightbox.cjs.js          # Lightbox extension CJS
├── charts.es.js             # Charts extension ES
├── charts.cjs.js            # Charts extension CJS
├── admin.es.js              # Admin extension ES
├── admin.cjs.js             # Admin extension CJS  
├── docit.es.js              # DocIt extension ES
├── docit.cjs.js             # DocIt extension CJS
├── loader.es.js             # Loader ES
├── loader.umd.js            # Loader UMD
├── chunks/                  # Shared code chunks
├── templates/               # Compiled templates
├── css/                     # Individual CSS files
└── web-mojo.css             # Main CSS bundle
```

## Available Scripts

### Development
- `npm run dev` - Development server with templates
- `npm run dev:live` - Live reload for examples
- `npm run dev:full` - Full dev mode (templates + version + tests)
- `npm run examples` - Serve examples
- `npm run serve` - Production server

### Building  
- `npm run build:lib` - Library build
- `npm run build:dist` - Full distribution 
- `npm run build:templates` - Templates only
- `npm run clean` - Clean dist/

### Code Quality
- `npm run lint` - ESLint check
- `npm run lint:fix` - Auto-fix ESLint issues  
- `npm test` - Run test suite
- `npm run test:watch` - Watch mode testing

### Utilities
- `npm run generate:models` - Auto-generate model exports ✨
- `npm run version:increment` - Bump version
- `node scripts/update-imports.js` - Fix import paths
- `node scripts/fix-extension-imports.js` - Fix extension imports

### Migration
- `npm run migrate:camelcase` - Convert to camelCase
- `npm run migrate:camelcase:dry` - Dry run migration

## Testing

### Test Structure
```
test/
├── unit/                    # Unit tests
├── integration/             # Integration tests  
├── build/                   # Build tests
└── utils/                   # Test utilities
```

### Running Tests
```bash
# All tests
npm test

# Specific suites
npm run test:unit
npm run test:integration  
npm run test:build

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

## Common Development Tasks

### Adding a New Core View
1. Create view file: `src/core/views/category/MyView.js`
2. Export from main index: Add to `src/index.js` 
3. Add CSS if needed: `src/core/css/my-view.css`
4. Update imports in build config if needed

### Adding a New Model
```bash
# 1. Create model
vim src/core/models/MyModel.js

# 2. Auto-generate exports
npm run generate:models

# 3. Test import
node -e "import('./src/core/models/index.js').then(m => console.log(m.MyModel))"
```

### Fixing Import Issues
```bash
# Fix extension imports (web-mojo → @core)
node scripts/fix-extension-imports.js --backup

# Fix general import paths  
node scripts/update-imports.js --backup src/extensions/

# Dry run to see changes
node scripts/fix-extension-imports.js --dry-run --verbose
```

### Adding New Extension Features
1. Create feature in `src/extensions/my-ext/`
2. Export from extension entry: `src/my-ext.js`  
3. Update extension documentation
4. Add example usage

### Registering Admin Extension
```javascript
// Import admin extension
import { registerAdminPages } from 'web-mojo/admin';

// Register all admin pages (27+ pages)
registerAdminPages(app, true); // true = add to sidebar menu

// Available admin pages:
// - admin/dashboard, admin/jobs, admin/users
// - admin/incidents, admin/tickets, admin/events  
// - admin/logs, admin/email/domains, etc.
```

### Debugging Build Issues
```bash
# Check for circular dependencies
npm run build:lib 2>&1 | grep -i circular

# Verbose build output
DEBUG=vite:* npm run build:lib

# Check specific file resolution
node -e "console.log(require.resolve('./src/core/MyFile.js'))"
```

## Architecture Guidelines

### Separation of Concerns
- **Core**: Framework essentials, no app-specific logic
- **Extensions**: Optional features, self-contained
- **Examples**: Usage demonstrations, consumer perspective

### Import Boundaries
- Core NEVER imports from extensions
- Extensions import from core via `@core` aliases
- Extensions MAY import from other extensions via `@ext`
- External consumers use package imports only

### CSS Architecture  
- Core CSS: `src/core/css/*.css`
- Extension CSS: `src/extensions/{name}/css/{name}.css`  
- Bundled automatically during build
- Each extension includes its own CSS

### File Naming
- **Classes**: `PascalCase.js` (e.g., `UserView.js`)
- **Utilities**: `camelCase.js` (e.g., `dataFormatter.js`)  
- **Constants**: `UPPER_CASE.js` (e.g., `API_ENDPOINTS.js`)
- **Pages**: `{Name}Page.js` (e.g., `LoginPage.js`)

### Export Patterns
```javascript
// Default export for main class
export default class MyClass extends BaseClass {}

// Named exports for utilities
export class MyUtility {}
export const MY_CONSTANT = 'value';

// Re-exports for convenience
export { SomeClass } from './SomeClass.js';
export * from './utilities.js';
```

## Troubleshooting

### Common Build Errors

**"Could not resolve entry for package 'web-mojo'"**
- Extensions importing from `'web-mojo'` instead of `@core`
- Fix: `node scripts/fix-extension-imports.js --backup`

**"Could not load /path/to/file.js"** 
- Incorrect import path or missing file
- Check file exists and path is correct
- Verify alias resolution in `vite.config.lib.js`

**"Circular dependency detected"**
- Usually caused by incorrect import boundaries
- Core importing from extensions (not allowed)
- Use `@core` aliases in extensions

**CSS build warnings**
- Usually syntax errors in CSS files
- Check CSS files for malformed rules
- Look for unescaped characters

### Development Issues

**Changes not reflected**
- Clear browser cache
- Restart dev server: `npm run dev`
- Check file watchers are working

**Import not found**  
- Check aliases in `vite.config.js`
- Verify file extension (`.js` required)
- Check export/import syntax matches

**Models not available**
- Run `npm run generate:models`
- Check model file exports default class
- Verify model file is in `src/core/models/`

### Performance

**Large bundle sizes**
- Check for duplicate dependencies
- Use dynamic imports for heavy features
- Analyze bundle: `npm run build:lib --analyze`

**Slow development builds**
- Disable sourcemaps temporarily
- Check for circular dependencies
- Use `--no-minify` flag for faster builds

---

## Quick Reference

### Essential Commands
```bash
npm run dev              # Start development
npm run generate:models  # Auto-export models  
npm run build:lib        # Build library
npm test                # Run tests
npm run lint:fix         # Fix code style
```

### File Locations
- **Models**: `src/core/models/*.js` → auto-exported
- **Views**: `src/core/views/{category}/*.js`
- **Extensions**: `src/extensions/{name}/`
- **Scripts**: `scripts/*.js`
- **Config**: `vite.config*.js`, `package.json`

### Import Cheat Sheet
```javascript
// ✅ In extensions/core
import View from '@core/View.js';
import { User } from '@core/models/User.js';
import AuthManager from '@ext/auth/AuthManager.js';

// ✅ In external apps  
import { View, User } from 'web-mojo';
import { mountAuth } from 'web-mojo/auth';
import { User, Job } from 'web-mojo/models';

// ❌ Never in extensions
import { View } from 'web-mojo'; // Creates circular dependency!
```

---

*This guide is maintained alongside the framework. When adding major features, please update this documentation.*