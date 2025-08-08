# MOJO Framework - Development Guide 🚀

## Quick Start

```bash
# Install dependencies
npm install

# Start development with live reload
npm run dev:live

# OR use webpack dev server (recommended for framework development)
npm run dev
```

## 🔥 Development Modes

### 1. **Webpack Dev Server** (Recommended for Framework Development)
```bash
npm run dev
```
**Features:**
- ✅ Hot Module Replacement (HMR)
- ✅ Source Maps for debugging
- ✅ Error Overlay in browser
- ✅ Automatic browser opening
- ✅ Bundled file serving

**Access URLs:**
- Main app: http://localhost:3000
- Examples (webpack): http://localhost:3000/examples/webpack-index.html
- Phase 2 Demo: http://localhost:3000/examples/phase2-basic/webpack-dev.html

**Note:** Use webpack-compatible examples that load bundled files instead of ES6 imports.

### 2. **Enhanced Development Server** (Recommended for Examples)
```bash
npm run dev:live
```
**Features:**
- ✅ Live Reload (auto-refresh on file changes)
- ✅ File Watching (`src/`, `examples/`, `dist/`)
- ✅ CORS enabled
- ✅ WebSocket-based reload
- ✅ Detailed logging
- ✅ Custom 404 pages

**Access URLs:**
- Main server: http://localhost:3001
- Examples: http://localhost:3001/examples/
- Phase 2 Demo: http://localhost:3001/examples/phase2-basic/
- Dev Status: http://localhost:3001/dev/status

### 3. **Simple Examples Server** (Direct Source Files)
```bash
npm run examples
# OR
npm run serve
```
**Features:**
- ✅ Direct source file serving
- ✅ ES6 module imports
- ✅ No build required
- ✅ Fastest for simple changes

**Access:** http://localhost:3001/examples/

### 4. **Hybrid Development**
```bash
npm run dev:watch
```
**Features:**
- ✅ Webpack build watching
- ✅ Live reload server
- ✅ Best of both worlds

### 5. **Full Development Suite**
```bash
npm run dev:full
```
**Features:**
- ✅ Webpack dev server
- ✅ Test watching
- ✅ Complete development environment

## 🚨 Webpack Dev Server Issues & Solutions

### **Problem: 404 Errors with ES6 Imports**
When using `npm run dev` and navigating to `/examples/`, you may see:
```
Failed to load resource: vendors.js (404)
Failed to load resource: mojo.js (404)
```

### **Solutions:**

#### **Option A: Use Webpack-Compatible Examples**
```bash
# Start webpack dev server
npm run dev

# Visit webpack-compatible examples
http://localhost:3000/examples/webpack-index.html
http://localhost:3000/examples/phase2-basic/webpack-dev.html
```

#### **Option B: Use Direct Source Examples**
```bash
# Use the enhanced development server instead
npm run dev:live

# Visit direct source examples
http://localhost:3001/examples/
http://localhost:3001/examples/phase2-basic/
```

## 📁 What Gets Watched

The enhanced development server (`dev:live`) watches:

```
src/           # Framework core files
examples/      # Example applications  
dist/          # Built files
*.html         # Root HTML files
*.js           # Root JavaScript files
*.css          # Root CSS files
```

**Ignored:**
- `node_modules/`
- `.git/`
- `*.map` files
- `package-lock.json`

## 🛠️ Build Commands

```bash
# Production build
npm run build

# Development build with watching
npm run build:watch

# Build and serve static
npm run build && npm run serve
```

## 🧪 Testing During Development

```bash
# Run tests once
npm test

# Watch tests (auto-run on changes)
npm run test:watch

# Development with testing
npm run dev:full
```

## 🔧 Development Server Features

### Live Reload Status
Check if live reload is working:
- Visit: http://localhost:3001/dev/status
- Look for console message: "🟢 Live Reload Connected"

### File Change Detection
When you save a file, you should see:
```
📝 [timestamp] File changed: src/core/View.js
🔄 Sent reload signal to 1 client(s)
```

### WebSocket Connection
The live reload uses WebSocket on port `3002` (PORT + 1):
- Main server: `3001`
- WebSocket: `3002`

## 📊 Port Configuration

| Service | Default Port | Environment Variable |
|---------|-------------|---------------------|
| Dev Server | 3001 | `PORT=3001 npm run dev:live` |
| Webpack Dev | 3000 | Configured in webpack.config.js |
| WebSocket | 3002 | Auto-calculated (PORT + 1) |

## 🚨 Troubleshooting

### Port Already in Use
```bash
# Use different port
PORT=3002 npm run dev:live

# Find what's using the port
lsof -i :3001
```

### Live Reload Not Working
1. Check browser console for WebSocket connection
2. Verify port 3002 is available
3. Check firewall settings
4. Refresh browser page

### File Changes Not Detected
1. Check file permissions
2. Verify file is in watched directories
3. Check console for watcher errors
4. Try saving file again

### Build Errors
```bash
# Check syntax
node -c serve-dev.js

# Clear cache and rebuild
rm -rf dist/ && npm run build
```

## 🔥 Development Workflow

### 1. **For Framework Development:**
```bash
npm run dev          # Webpack HMR for core development
```

### 2. **For Examples Development:**
```bash
npm run dev:live     # Live reload for examples
```

### 3. **For Full-Stack Development:**
```bash
npm run dev:watch    # Build watching + live server
```

### 4. **For Testing & Development:**
```bash
npm run dev:full     # Everything running
```

## 📈 Performance Tips

1. **Use `dev:live` for examples** - faster than webpack for simple changes
2. **Use `dev` for core framework** - HMR is better for complex debugging
3. **Use `build:watch`** when you need production-like builds
4. **Close unused browser tabs** - WebSocket connections consume memory

## 🛡️ Security Notes

- Development servers are for local development only
- CORS is enabled (`*`) for development convenience
- WebSocket server has no authentication
- Never expose development ports publicly

## 📚 File Structure

```
web-mojo/
├── serve-dev.js          # Enhanced development server
├── serve-examples.js     # Simple examples server  
├── webpack.config.js     # Webpack configuration
├── dist/                 # Production build output
├── src/                  # Framework source code
└── examples/             # Example applications
    ├── basic/
    ├── phase2-basic/
    └── complete-demo/
```

## 🎯 Best Practices

1. **Start with `npm run dev:live`** for most development
2. **Use `npm run dev`** when debugging framework core
3. **Run tests frequently** with `npm run test:watch`
4. **Build regularly** to catch production issues early
5. **Check dev status** endpoint when debugging connectivity issues

## 🚀 Quick Commands Reference

```bash
# Development
npm run dev:live      # Enhanced server with live reload
npm run dev          # Webpack dev server with HMR
npm run dev:watch    # Hybrid approach
npm run dev:full     # Development + testing

# Building  
npm run build        # Production build
npm run build:watch  # Development build with watching

# Testing
npm test            # Run all tests
npm run test:watch  # Watch and auto-run tests

# Serving
npm run serve       # Simple static server
npm run examples    # Serve examples only
```

---

**Happy Coding! 🎉**

For issues or questions, check the development server logs or visit http://localhost:3001/dev/status for connection diagnostics.