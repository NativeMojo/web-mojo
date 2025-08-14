# MOJO Framework - Simple Template Solution

## The Problem We Solved

Previously, loading templates was complex:
- Different paths for development vs production
- Path resolution issues when installed via npm
- Network requests required to fetch templates
- CORS issues when loading from CDN
- 404 errors when templates couldn't be found

## The Solution: Compiled Templates

All templates are now **compiled into a single JavaScript module** during the build process. This means:
- ✅ No more fetch requests
- ✅ No more path resolution issues  
- ✅ Templates work everywhere (dev, production, npm, CDN)
- ✅ Zero network overhead
- ✅ Type-safe template access

## How It Works

### 1. Build Time

When you run `npm run build:templates` or `npm run build:lib`, the build script:
1. Scans for all `.mst` template files
2. Reads their content
3. Generates `src/templates.js` with all templates as JavaScript strings
4. This module is then bundled with the framework

### 2. Runtime

Templates are now just JavaScript strings that can be imported:

```javascript
import { getTemplate } from 'web-mojo/templates';

// Get a template - it's already in memory!
const loginTemplate = getTemplate('auth/pages/LoginPage.mst');
```

## Usage

### In Framework Components

```javascript
import Page from '../../core/Page.js';
import { getTemplate } from '../../templates.js';

export default class LoginPage extends Page {
    constructor(options = {}) {
        super({
            ...options,
            // Template is loaded from the compiled module
            template: getTemplate('auth/pages/LoginPage.mst')
        });
    }
}
```

### In External Projects

When using `web-mojo` as an npm package:

```javascript
import MOJO, { Page } from 'web-mojo';
import { getTemplate } from 'web-mojo/templates';

class MyLoginPage extends Page {
    constructor() {
        super({
            // Templates are included in the package!
            template: getTemplate('auth/pages/LoginPage.mst')
        });
    }
}
```

### Available Functions

```javascript
import templates, { 
    getTemplate, 
    hasTemplate, 
    getTemplateKeys, 
    getTemplateCount 
} from 'web-mojo/templates';

// Get a template by key
const template = getTemplate('auth/pages/LoginPage.mst');

// Check if a template exists
if (hasTemplate('auth/pages/LoginPage.mst')) {
    // Use template
}

// Get all available template keys
const keys = getTemplateKeys();
// ['auth/pages/LoginPage.mst', 'auth/pages/RegisterPage.mst', ...]

// Get template count
const count = getTemplateCount(); // 4

// Direct access to all templates
const loginTemplate = templates['auth/pages/LoginPage.mst'];
```

## Template Keys

Templates are referenced by their path relative to `src/`, without the `src/` prefix:

| Template File | Template Key |
|--------------|--------------|
| `src/auth/pages/LoginPage.mst` | `auth/pages/LoginPage.mst` |
| `src/auth/pages/RegisterPage.mst` | `auth/pages/RegisterPage.mst` |
| `src/components/TablePage.mst` | `components/TablePage.mst` |

## Migration Guide

### Old Way (Don't Do This)
```javascript
class LoginPage extends Page {
    constructor() {
        super({
            // ❌ Path varies by environment
            template: '/src/auth/pages/LoginPage.mst'
        });
    }
    
    async loadTemplate() {
        // ❌ Requires network request
        const response = await fetch(this.template);
        if (!response.ok) {
            throw new Error('Template not found');
        }
        return await response.text();
    }
}
```

### New Way (Do This)
```javascript
import { getTemplate } from '../../templates.js';

class LoginPage extends Page {
    constructor() {
        super({
            // ✅ Template already in memory
            template: getTemplate('auth/pages/LoginPage.mst')
        });
    }
    // No loadTemplate method needed!
}
```

## Benefits

### 1. Performance
- **Zero network requests** - Templates are already in memory
- **Instant loading** - No async/await needed for templates
- **Smaller overall size** - Gzip compression works better on bundled content

### 2. Reliability
- **No 404 errors** - Templates are guaranteed to exist
- **No CORS issues** - No cross-origin requests
- **Works offline** - Templates are in the JavaScript bundle

### 3. Developer Experience
- **Simple API** - Just call `getTemplate()`
- **IntelliSense support** - IDEs can autocomplete template names
- **Build-time validation** - Missing templates caught during build

### 4. Universal Compatibility
Works identically in all environments:
- ✅ Development server
- ✅ Production builds
- ✅ NPM packages
- ✅ CDN delivery
- ✅ Offline apps

## File Size Impact

The template compilation adds minimal size to the bundle:

| Template | Raw Size | Gzipped |
|----------|----------|---------|
| All Templates | ~35 KB | ~8 KB |

This is negligible compared to the benefits and actually saves bandwidth by eliminating multiple HTTP requests.

## Build Commands

```bash
# Build templates only
npm run build:templates

# Build library (includes templates)
npm run build:lib

# Full distribution build
npm run build:dist
```

## Adding New Templates

1. Create your template file in the appropriate directory:
   ```
   src/
   ├── auth/pages/
   │   └── MyNewPage.mst
   ├── components/
   │   └── MyComponent.mst
   └── templates/
       └── MyTemplate.mst
   ```

2. Run the build:
   ```bash
   npm run build:templates
   ```

3. Use it in your code:
   ```javascript
   const template = getTemplate('auth/pages/MyNewPage.mst');
   ```

## FAQ

### Q: What if I need to load templates dynamically at runtime?

A: You can still fetch templates if needed, but consider if your use case really requires it. The compiled templates cover 99% of use cases.

### Q: Can I exclude templates from the bundle?

A: Yes, you can modify `scripts/build-templates.js` to exclude specific directories or files.

### Q: What about template hot-reloading during development?

A: Run `npm run build:templates` in watch mode, or use the development server which can handle template changes.

### Q: Can I use custom template formats?

A: Yes, modify the `TEMPLATE_EXTENSIONS` array in `scripts/build-templates.js` to include your format.

## Summary

The compiled template approach is:
- **Simple** - Just import and use
- **Fast** - No network requests
- **Reliable** - Always works
- **Universal** - Same code everywhere

No more path resolution headaches. No more 404 errors. Just templates that work.