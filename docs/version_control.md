# Version Control

The MOJO Framework includes an automatic version management system that tracks changes and makes version information globally accessible.

## Overview

- **Format**: `MAJOR.MINOR.REVISION` (e.g., `2.0.1`)
- **Auto-increment**: Revision number increases on file changes in `src/`
- **Global access**: Available as `window.MOJO.version` in browsers
- **Synchronized**: Updates across `package.json`, `src/version.js`, and `src/index.js`

## Quick Start

### Development with Auto-Versioning
```bash
# Start development server with version watching
npm run dev:version

# Full development stack (includes tests and templates)
npm run dev:full
```

### Manual Version Control
```bash
# Increment version once
npm run version:increment

# Initialize version system
npm run version:init

# Watch for changes (standalone)
npm run version:watch
```

## Accessing Version Information

### In Browser (Global)
```javascript
// Simple version string
console.log(window.MOJO.version);  // "2.0.1"

// Full version object
console.log(window.MOJO.VERSION_INFO);
// {
//   full: "2.0.1",
//   major: 2,
//   minor: 0, 
//   revision: 1,
//   buildTime: "2024-01-15T10:30:00.000Z"
// }
```

### In Modules (Import)
```javascript
import { VERSION, VERSION_INFO } from 'web-mojo';

console.log(VERSION);           // "2.0.1"
console.log(VERSION_INFO.major); // 2

// Version comparison
const result = VERSION_INFO.compare('2.0.0');
// Returns: 1 (current is newer), 0 (equal), -1 (current is older)
```

## How It Works

1. **File Watching**: Monitors `.js` files in `src/` subdirectories (excludes root-level files)
2. **Debounced Updates**: Waits 2 seconds after last change before incrementing
3. **Multi-file Sync**: Updates version in:
   - `package.json`
   - `src/version.js` 
   - `src/index.js`
4. **Build Timestamp**: Records when version was last updated

## Version Components

| Component | Description | Example |
|-----------|-------------|---------|
| Major | Breaking changes | `2.x.x` |
| Minor | New features | `x.1.x` |
| Revision | Bug fixes, small changes | `x.x.15` |

## Configuration

The version system automatically:
- ✅ Watches only `src/` subdirectories (ignores root-level `src/*.js` files)
- ✅ Ignores `src/version.js` changes (prevents loops)
- ✅ Excludes `node_modules`, `dist`, `.git` directories  
- ✅ Handles graceful shutdown on `Ctrl+C`
- ✅ Provides console feedback on all operations

## Files Managed

- `package.json` - NPM package version
- `src/version.js` - Generated version exports
- `src/index.js` - Framework version exports

> **Note**: Never manually edit `src/version.js` - it's auto-generated and will be overwritten.

## Troubleshooting

**Version not updating?**
- Check that files are being saved in `src/` subdirectories (not root-level `src/*.js`)
- Ensure version watcher is running (`npm run version:watch`)
- Look for console output indicating file changes detected

**Global version not available?**
- Verify MOJO framework is loaded before checking `window.MOJO`
- Check browser console for import errors
- Ensure you're accessing after DOM ready