# MOJO Framework 2.1.0

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Version](https://img.shields.io/badge/version-2.1.0-green.svg)](https://github.com/yourusername/web-mojo)

**MOJO** is a modern, lightweight JavaScript framework for building data-driven web applications. Built with a **core + extensions** architecture, MOJO provides maximum flexibility while maintaining clean boundaries and optimal performance.

## ✨ What's New in 2.1.0

🏗️ **Core + Extensions Architecture** - Clean separation with plugin system
📦 **Subpath Exports** - Import exactly what you need
⚡ **Lazy Loading** - Reduced bundle sizes with dynamic imports
🔌 **Plugin System** - Extensions enhance core without dependencies
🎯 **Tree Shaking** - Optimized builds with modern bundlers

## 🚀 Quick Start

### Installation

```bash
npm install web-mojo
```

### Basic Usage

```javascript
// Core framework
import { WebApp, Page, View } from 'web-mojo';

// Create a simple page
class HomePage extends Page {
  getTemplate() {
    return '<h1>Welcome to MOJO!</h1>';
  }
}

// Initialize app
const app = new WebApp({
  name: 'My App',
  container: '#app'
});

app.registerPage('home', HomePage);
app.start();
```

## 📦 Architecture Overview

MOJO 2.1.0 uses a **core + extensions** architecture:

### Core Package (`web-mojo`)
The stable runtime and building blocks:
- **WebApp** & **PortalApp** - Application containers
- **View** & **Page** - Component system
- **Model** & **Collection** - Data layer
- **Router** - URL routing
- **Dialog** - Modal system
- **Essential services** - File upload, events, utilities

### Extensions
Feature-rich packages that extend core functionality:

#### 🔐 Authentication (`web-mojo/auth`)
Complete authentication system with JWT tokens:

```javascript
import { mountAuth } from 'web-mojo/auth';

// See docs/AuthPage.md for details.
mountAuth(document.getElementById('auth-root'), {
  baseURL: 'https://api.example.com',
  onSuccessRedirect: '/dashboard',
});
```

#### 🖼️ Lightbox (`web-mojo/lightbox`)
Image and PDF viewers with editing capabilities:

```javascript
import 'web-mojo/lightbox'; // Auto-registers plugins

// Core can now use lightbox features
import { Dialog } from 'web-mojo';
// Dialog automatically gets image cropping when lightbox is loaded
```

#### 📊 Charts (`web-mojo/charts`)
Interactive charts built on Chart.js:

```javascript
import { PieChart, SeriesChart } from 'web-mojo/charts';

const chart = new PieChart({
  data: salesData,
  container: '#chart'
});
```

#### 📚 Documentation (`web-mojo/docit`)
Documentation portal system:

```javascript
import { DocItApp } from 'web-mojo/docit';

const docs = new DocItApp({
  books: ['user-guide', 'api-docs']
});
```

#### ⚡ Loader (`web-mojo/loader`)
Beautiful loading animations:

```html
<script src="web-mojo/loader"></script>
<script>
  // Your app initialization
  // Call hideInitialLoader() when ready
</script>
```

## 🎯 Usage Examples

### Portal Application

```javascript
import { PortalApp, Page } from 'web-mojo';
import 'web-mojo/lightbox'; // Enable image features

const app = new PortalApp({
  name: 'Admin Portal',
  sidebar: {
    menus: [{
      items: [
        { text: 'Dashboard', route: 'dashboard', icon: 'bi-speedometer2' },
        { text: 'Users', route: 'users', icon: 'bi-people' }
      ]
    }]
  }
});

class DashboardPage extends Page {
  constructor(options = {}) {
    super({
      title: 'Dashboard',
      template: `
        <div class="row">
          <div class="col-md-6">
            <div class="card">
              <div class="card-body">
                <h5>Welcome to MOJO</h5>
                <p>{{message}}</p>
                <button class="btn btn-primary" data-action="show-dialog">
                  Open Dialog
                </button>
              </div>
            </div>
          </div>
        </div>
      `,
      ...options
    });
  }


  async onActionShowDialog() {
    const { Dialog } = await import('web-mojo');
    Dialog.showInfo('Hello from MOJO!');
  }
}

app.registerPage('dashboard', DashboardPage);
app.start();
```

### Authentication Flow

```javascript
import { mountAuth } from 'web-mojo/auth';

// Auth portal (standalone). See docs/AuthPage.md for details.
mountAuth(document.getElementById('auth-root'), {
  baseURL: 'https://api.example.com',
  onSuccessRedirect: '/portal/',
  branding: {
    title: 'Acme Corp',
    logoUrl: '/assets/logo.png',
    subtitle: 'Sign in to your account',
  },
});

// Main app (after authentication)
const mainApp = new WebApp({
  name: 'Acme Portal',
  api: {
    baseURL: 'https://api.example.com',
    token: localStorage.getItem('auth_token')
  }
});

// Handle successful login
authApp.events.on('auth:login', (user) => {
  window.location.href = '/dashboard';
});
```

### Data Management

```javascript
import { Model, Collection, View } from 'web-mojo';

// Define models
class User extends Model {
  static endpoint = '/api/users';
}

class UserList extends Collection {
  model = User;
  endpoint = '/api/users';
}

// Create views
class UserTableView extends View {
  constructor(options = {}) {
    super({
      template: `
        <table class="table">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {{#users}}
            <tr>
              <td>{{name}}</td>
              <td>{{email}}</td>
              <td>
                <button class="btn btn-sm btn-primary"
                        data-action="edit-user"
                        data-user-id="{{id}}">Edit</button>
              </td>
            </tr>
            {{/users}}
          </tbody>
        </table>
      `,
      ...options
    });

    this.collection = new UserList();
  }

  async onMount() {
    await this.collection.fetch();
    this.render();
  }

  async onActionEditUser(action, event, element) {
    const userId = element.dataset.userId;
    const user = this.collection.get(userId);

    const { Dialog } = await import('web-mojo');
    Dialog.showModelForm(user, {
      title: 'Edit User',
      fields: ['name', 'email']
    });
  }
}
```

## 🛠️ Development

### Project Structure
```
web-mojo/
├── src/
│   ├── index.js              # Core entry point
│   ├── auth.js               # Auth extension entry
│   ├── lightbox.js           # Lightbox extension entry
│   ├── charts.js             # Charts extension entry
│   ├── docit.js              # DocIt extension entry
│   ├── loader.js             # Loader entry
│   ├── core/                 # Core framework
│   │   ├── View.js
│   │   ├── Page.js
│   │   ├── WebApp.js
│   │   ├── PortalApp.js
│   │   ├── models/
│   │   ├── views/
│   │   ├── services/
│   │   └── utils/
│   └── extensions/           # Extension packages
│       ├── auth/
│       ├── lightbox/
│       ├── charts/
│       └── docit/
├── examples/                 # Live examples
└── dist/                     # Built packages
```

### Building from Source

```bash
# Install dependencies
npm install

# Build all packages
npm run build:lib

# Development server
npm run dev

# Watch mode
npm run dev:watch
```

### Import Aliases (Development)
When developing the framework itself:

```javascript
// Use aliases for clean imports
import View from '@core/View.js';
import AuthApp from '@ext/auth/AuthApp.js';
import { PieChart } from '@ext/charts/PieChart.js';
```

## 📋 API Reference

### WebApp
Main application container with routing and page management.

```javascript
const app = new WebApp({
  name: 'My App',           // App name
  container: '#app',        // DOM container
  debug: true,              // Debug mode
  api: {                    // API configuration
    baseURL: 'https://api.example.com',
    token: 'jwt-token'
  }
});

// Register pages
app.registerPage('home', HomePage);
app.registerPage('users', UserListPage);

// Navigation
await app.navigate('users');
await app.navigate('user/123');

// Start app
await app.start();
```

### PortalApp
Extended WebApp with built-in sidebar and top navigation.

```javascript
const app = new PortalApp({
  // All WebApp options plus:
  sidebar: {
    menus: [{
      name: 'main',
      items: [
        { text: 'Home', route: 'home', icon: 'bi-house' },
        {
          text: 'Admin',
          icon: 'bi-gear',
          children: [
            { text: 'Users', route: 'users' },
            { text: 'Settings', route: 'settings' }
          ]
        }
      ]
    }]
  },
  topbar: {
    brand: 'My Portal',
    rightItems: [
      { icon: 'bi-bell', action: 'notifications' }
    ]
  }
});
```

### View Component System

```javascript
class MyView extends View {
  constructor(options = {}) {
    super({
      className: 'my-view',
      template: `
        <div>
          <h3>{{title}}</h3>
          <button data-action="click-me">Click Me</button>
          <div data-region="content"></div>
        </div>
      `,
      ...options
    });
  }

  // Lifecycle hooks
  async onMount() { /* Called when mounted to DOM */ }
  async onUnmount() { /* Called when removed */ }

  // Event handlers
  async onActionClickMe(action, event, element) {
    this.showRegion('content', new AnotherView());
  }

  // Custom events
  onCustomEvent(data) { /* Handle custom events */ }
}
```

## 🔧 Configuration

### Vite Integration
For modern build tools:

```javascript
// vite.config.js
export default {
  optimizeDeps: {
    exclude: ['web-mojo']
  },
  ssr: {
    noExternal: ['web-mojo']
  }
}
```

### CSS Imports
```javascript
// Bundle all CSS automatically
import 'web-mojo'; // Includes core CSS

// Simple Auth CSS is included by the module (no extra import required).
// For theming details, see docs/AuthPage.md.
// If you need manual CSS, you can use: /src/extensions/auth/css/auth.css
import 'web-mojo/css/core';
import 'web-mojo/css/portal';
```

## 🔄 Migration from 2.0.x

### Import Changes
```javascript
// Old (2.0.x)
import WebApp from '/src/core/WebApp.js';
import AuthApp from '/src/auth/AuthApp.js';

// New (2.1.0+)
import { WebApp } from 'web-mojo';
import { mountAuth } from 'web-mojo/auth'; // See docs/AuthPage.md
```

### CSS Updates
```html
<!-- Old -->
<link href="/src/css/core.css" rel="stylesheet" />

<!-- New -->
<link href="/dist/core.css" rel="stylesheet" />
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes following our coding standards
4. Add tests for new functionality
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Development Setup
```bash
git clone https://github.com/yourusername/web-mojo.git
cd web-mojo
npm install
npm run dev
```

## 📄 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 🙋 Support

- 📖 **Documentation**: [Full docs and examples](./docs/)
- 🐛 **Issues**: [GitHub Issues](https://github.com/yourusername/web-mojo/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/yourusername/web-mojo/discussions)

---

Built with ❤️ by the MOJO Framework Team
