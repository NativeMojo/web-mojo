# MOJO Framework Quick Start

This guide will get you up and running with MOJO (web-mojo) in minutes.

## Installation

### As a Library in Your Project

```bash
# Install web-mojo and Bootstrap
npm install web-mojo bootstrap

# Or with yarn
yarn add web-mojo bootstrap
```

### For Framework Development

```bash
# Clone the repository
git clone https://github.com/yourusername/web-mojo.git
cd web-mojo

# Install dependencies
npm install

# Start development server
npm run dev
```

## Basic Usage

### 1. Simple HTML Setup

```html
<!DOCTYPE html>
<html>
<head>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5/dist/css/bootstrap.min.css" rel="stylesheet">
  <link href="https://unpkg.com/web-mojo/dist/web-mojo.css" rel="stylesheet">
</head>
<body>
  <div id="app"></div>
  
  <script src="https://unpkg.com/web-mojo/dist/web-mojo.umd.js"></script>
  <script>
    const app = new MOJO.default({
      container: '#app'
    });
    
    class HomePage extends MOJO.Page {
      constructor() {
        super({ name: 'home', title: 'Home' });
      }
      render() {
        return '<h1>Welcome to MOJO!</h1>';
      }
    }
    
    app.registerPage('home', HomePage);
    app.router.add('/', 'home');
    app.start();
  </script>
</body>
</html>
```

### 2. ES6 Module Setup (Vite/Webpack)

```javascript
// main.js
import MOJO, { View, Page, Router } from 'web-mojo';
import 'web-mojo/css';
import 'bootstrap/dist/css/bootstrap.min.css';

// Create app
const app = new MOJO({
  container: '#app',
  router: {
    mode: 'history'  // or 'param' for static hosting
  }
});

// Create a page
class HomePage extends Page {
  constructor() {
    super({
      name: 'home',
      title: 'Welcome'
    });
  }

  render() {
    return `
      <div class="container mt-5">
        <h1>Hello MOJO!</h1>
        <p>Framework loaded successfully.</p>
      </div>
    `;
  }
}

// Register and start
app.registerPage('home', HomePage);
app.router.add('/', 'home');
app.start();
```

## Development Linking

Work on MOJO and your project simultaneously:

### Step 1: Link MOJO Globally

```bash
# In the web-mojo directory
cd /path/to/web-mojo
npm link

# Start build watcher
npm run build:lib:watch
```

### Step 2: Link in Your Project

```bash
# In your project directory
cd /path/to/my-project
npm link web-mojo

# Now changes to MOJO will reflect immediately
npm run dev
```

### Step 3: Unlink When Done

```bash
# In your project
npm unlink web-mojo
npm install web-mojo  # Install from registry
```

## Common Commands

### Framework Development

```bash
# Development server with examples
npm run dev

# Build library for distribution
npm run build:lib

# Build and watch for changes
npm run build:lib:watch

# Run tests
npm test

# Build for publishing
npm run build:dist
```

### In Your Project

```javascript
// Import what you need
import { View, Page, Router } from 'web-mojo';

// Or import everything
import * as MOJO from 'web-mojo';

// Create components
class MyView extends View {
  render() {
    return '<div>My Custom View</div>';
  }
}

// Use Bootstrap classes
class MyPage extends Page {
  render() {
    return `
      <div class="container">
        <div class="row">
          <div class="col-md-12">
            <button class="btn btn-primary">Bootstrap Button</button>
          </div>
        </div>
      </div>
    `;
  }
}
```

## Project Structure

### Using MOJO in Your Project

```
my-app/
├── src/
│   ├── pages/          # Your page components
│   ├── components/     # Your custom components
│   ├── models/         # Data models
│   └── main.js         # Entry point
├── public/
│   └── index.html
├── package.json
└── vite.config.js      # Or webpack.config.js
```

### Example vite.config.js

```javascript
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    port: 3001
  }
});
```

## Quick Examples

### Navigation

```javascript
// Use href-based navigation (SEO-friendly)
<a href="/about">About</a>
<a href="/users/123">User Profile</a>

// Or data-page navigation with params
<button data-page="user" data-params='{"id": 123}'>
  View User
</button>
```

### Using Components

```javascript
import { TopNav, Sidebar, MainContent } from 'web-mojo';

// Create navigation
const nav = new TopNav({
  brand: { name: 'My App', icon: 'bi-lightning' },
  items: [
    { label: 'Home', icon: 'bi-house', page: 'home' },
    { label: 'About', icon: 'bi-info', page: 'about' }
  ]
});

// Create sidebar
const sidebar = new Sidebar({
  items: [
    { text: 'Dashboard', icon: 'bi-speedometer2', route: '/' },
    { text: 'Users', icon: 'bi-people', route: '/users' }
  ]
});
```

### Data Models

```javascript
import { Model, Collection } from 'web-mojo';

// Create a model
class User extends Model {
  constructor(data) {
    super(data);
    this.urlRoot = '/api/users';
  }
}

// Use the model
const user = new User({ id: 1, name: 'John' });
await user.fetch();  // GET /api/users/1
await user.save();   // POST/PUT /api/users/1
```

## Next Steps

1. **Read the Documentation**
   - [Library Usage Guide](docs/LIBRARY_USAGE.md) - Detailed usage instructions
   - [User Guide](docs/user-guide/README-Phase1.md) - Complete framework guide
   - [Components](docs/components/) - Component documentation

2. **Explore Examples**
   - Run `npm run dev` in web-mojo directory
   - Visit http://localhost:3000/examples/
   - Check the [examples/](examples/) directory

3. **Join the Community**
   - [GitHub Issues](https://github.com/yourusername/web-mojo/issues)
   - [Discussions](https://github.com/yourusername/web-mojo/discussions)

## Tips

- Use Bootstrap 5 classes for styling
- Keep components small and focused
- Use the built-in navigation system
- Leverage the EventBus for component communication
- Check examples for best practices

## Need Help?

- 📚 [Full Documentation](docs/)
- 💬 [GitHub Issues](https://github.com/yourusername/web-mojo/issues)
- 📧 Email: support@example.com

---

**Happy coding with MOJO!** 🚀