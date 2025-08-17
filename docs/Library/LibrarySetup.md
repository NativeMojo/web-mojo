# MOJO Framework Library Setup - Complete

## ✅ Setup Complete

The MOJO Framework has been successfully configured as a reusable npm library with the package name **`web-mojo`**.

## 📦 Package Name

- **Framework Name:** MOJO
- **NPM Package:** `web-mojo`
- **Version:** 2.0.0

## 🎯 What Was Accomplished

### 1. Library Configuration
- ✅ Created library entry point (`src/index.js`)
- ✅ Created library-specific Vite config (`vite.config.lib.js`)
- ✅ Updated `package.json` with proper exports and metadata
- ✅ Added multiple build formats (ESM, CommonJS, UMD)
- ✅ Configured tree-shaking support
- ✅ Set up development linking workflow

### 2. Files Created/Modified

#### New Files Created:
- `src/index.js` - Library entry point with all exports
- `vite.config.lib.js` - Vite configuration for library builds
- `.npmignore` - Excludes unnecessary files from npm package
- `docs/LIBRARY_USAGE.md` - Comprehensive usage documentation
- `QUICK_START.md` - Quick start guide
- `LICENSE` - MIT license
- `CHANGELOG.md` - Version history and changes

#### Modified Files:
- `package.json` - Updated with library configuration
- `README.md` - Updated with installation and usage instructions

### 3. Build Outputs

The library builds to multiple formats in the `dist/` directory:

```
dist/
├── web-mojo.esm.js     # ES Modules (modern bundlers)
├── web-mojo.cjs.js     # CommonJS (Node.js)
├── web-mojo.umd.js     # UMD (browser script tags)
├── web-mojo.css        # Styles (when built)
└── *.map files         # Source maps for debugging
```

## 🚀 Quick Start for Users

### Installation

```bash
# When published to npm
npm install web-mojo bootstrap

# From GitHub
npm install github:yourusername/web-mojo bootstrap

# From local development (linked)
npm link web-mojo
```

### Basic Usage

```javascript
// ES6 Modules
import MOJO, { View, Page, Router } from 'web-mojo';
import 'web-mojo/css';
import 'bootstrap/dist/css/bootstrap.min.css';

// Create app
const app = new MOJO({
  container: '#app'
});

// Create a page
class HomePage extends Page {
  constructor() {
    super({ name: 'home', title: 'Home' });
  }
  render() {
    return '<h1>Hello MOJO!</h1>';
  }
}

// Register and start
app.registerPage('home', HomePage);
app.router.add('/', 'home');
app.start();
```

### CDN Usage

```html
<script src="https://unpkg.com/web-mojo/dist/web-mojo.umd.js"></script>
<link href="https://unpkg.com/web-mojo/dist/web-mojo.css" rel="stylesheet">
```

## 👨‍💻 Development Workflow

### Framework Development

Your existing development workflow **remains unchanged**:

```bash
# Start development server (examples)
npm run dev              # Opens http://localhost:3000/examples/

# Run tests
npm test

# Build examples
npm run build
```

### Library Building

New commands for library distribution:

```bash
# Build library for distribution
npm run build:lib

# Build library in watch mode
npm run build:lib:watch

# Build everything (library + CSS)
npm run build:dist

# Clean dist directory
npm run clean
```

### Development Linking

To work on MOJO and a project using it simultaneously:

#### Step 1: Link MOJO (one time)
```bash
cd /Users/ians/Projects/mojo/web-mojo
npm link                    # Creates global link
npm run build:lib:watch     # Auto-rebuild on changes
```

#### Step 2: Use in Your Project
```bash
cd ~/Projects/my-new-app
npm link web-mojo          # Links to local MOJO
npm run dev                # Start your app
```

#### Step 3: Unlink When Done
```bash
cd ~/Projects/my-new-app
npm unlink web-mojo        # Remove link
npm install web-mojo       # Install from registry
```

## 📤 Publishing to NPM

### First Time Setup
```bash
# Login to npm
npm login

# Verify package name availability
npm view web-mojo
```

### Publishing
```bash
# Ensure everything is built and tested
npm run build:dist
npm test

# Publish to npm
npm publish --access public

# Or use npm version to bump version and publish
npm version patch  # or minor, or major
npm publish
```

### Post-Publishing
The package will be available at:
- NPM: https://www.npmjs.com/package/web-mojo
- CDN: https://unpkg.com/web-mojo/
- CDN: https://cdn.jsdelivr.net/npm/web-mojo/

## 📋 Command Reference

### Development Commands
| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with examples |
| `npm run test` | Run test suite |
| `npm run lint` | Run ESLint |
| `npm run examples` | Serve examples |

### Build Commands
| Command | Description |
|---------|-------------|
| `npm run build` | Build examples (original) |
| `npm run build:lib` | Build library for distribution |
| `npm run build:lib:watch` | Build library in watch mode |
| `npm run build:css` | Build CSS separately |
| `npm run build:dist` | Build everything for publishing |

### Publishing Commands
| Command | Description |
|---------|-------------|
| `npm link` | Create global symlink for development |
| `npm publish` | Publish to npm registry |
| `npm version <type>` | Bump version (patch/minor/major) |

## 🔍 Verification

### Check Link Status
```bash
# See if web-mojo is linked globally
npm ls -g web-mojo

# Output should show:
# └── web-mojo@2.0.0 -> /path/to/web-mojo
```

### Test Build
```bash
# Build the library
npm run build:lib

# Check dist directory
ls -la dist/

# Should contain:
# - web-mojo.esm.js
# - web-mojo.cjs.js
# - web-mojo.umd.js
# - *.map files
```

### Test Import
Create a test file to verify imports work:

```javascript
// test-import.mjs
import MOJO, { View, Page } from './dist/web-mojo.esm.js';
console.log('MOJO Version:', MOJO.version);
console.log('View:', View);
console.log('Page:', Page);
```

Run with: `node test-import.mjs`

## 📚 Documentation

- **[Library Usage Guide](docs/LIBRARY_USAGE.md)** - Detailed library usage
- **[Quick Start](QUICK_START.md)** - Get started quickly
- **[API Reference](docs/api/)** - Complete API documentation
- **[Examples](examples/)** - Live examples and demos

## ⚠️ Important Notes

1. **Package Name:** Always use `web-mojo` when installing or importing
2. **Bootstrap:** Bootstrap is a peer dependency, users must install it separately
3. **Development:** Your existing examples continue to work unchanged
4. **Linking:** Use npm link for development, publish for production
5. **Versioning:** Follow semantic versioning (MAJOR.MINOR.PATCH)

## 🎉 Next Steps

1. **Test the Library**
   - Create a new test project
   - Link web-mojo and test imports
   - Verify all components work

2. **Publish to NPM**
   - Create npm account if needed
   - Run `npm publish --access public`
   - Verify package on npmjs.com

3. **Update Documentation**
   - Add your GitHub username to URLs
   - Update examples with real package usage
   - Create API documentation

4. **Share with Community**
   - Announce the release
   - Create usage examples
   - Gather feedback

## 🚀 Ready to Use!

Your MOJO Framework is now ready to be:
- Used as a library via `npm install web-mojo`
- Developed with live linking
- Published to npm
- Imported via CDN

The framework maintains its identity as **MOJO** while being distributed as **web-mojo** to avoid npm naming conflicts.

---

**Setup completed successfully!** 🎉