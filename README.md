# MOJO Framework

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Version](https://img.shields.io/badge/version-2.0.344-green.svg)](https://github.com/yourusername/web-mojo)

**MOJO** is a lightweight, component-based JavaScript framework for building modern web applications. It provides a clean architecture with automatic event handling, built-in routing, and seamless Bootstrap integration.

## ✨ Why MOJO?

- 🚀 **Zero Build Step** - Works directly in the browser with ES6 modules
- 🏗️ **Component Architecture** - Pages and Views with automatic lifecycle management
- 🔀 **Built-in Routing** - Clean URL routing with parameters and query strings
- 🎨 **Bootstrap Integration** - Beautiful, responsive UI components out of the box
- 📱 **Event System** - Declarative event handling with automatic delegation
- 🔐 **Authentication Ready** - Complete auth system with JWT tokens
- 📄 **Template Engine** - Mustache templating with data binding
- ⚡ **Performance First** - Minimal overhead, maximum efficiency

## 🚀 Quick Start

Get up and running in under 5 minutes:

### 1. Create Your HTML File

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My MOJO App</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>
    <div id="app"></div>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
    <script type="module" src="app.js"></script>
</body>
</html>
```

### 2. Create Your App Script

```javascript
import WebApp from './web-mojo/src/app/WebApp.js';
import Page from './web-mojo/src/core/Page.js';

// Create a simple page
class HomePage extends Page {
    constructor(options = {}) {
        super({
            pageName: 'home',
            route: '/',
            template: `
                <div class="container py-5">
                    <h1 class="display-4">Welcome to MOJO! 🚀</h1>
                    <p class="lead">You've successfully created your first MOJO application.</p>
                    <button class="btn btn-primary" data-action="say-hello">
                        Say Hello
                    </button>
                    <p class="mt-3">Button clicked: {{clicks}} times</p>
                </div>
            `,
            ...options
        });
        this.clicks = 0;
    }
    
    async getViewData() {
        return { clicks: this.clicks };
    }
    
    async handleActionSayHello(event, element) {
        this.clicks++;
        await this.render();
        this.getApp().showSuccess(`Hello! You've clicked ${this.clicks} times.`);
    }
}

// Create and start the app
const app = WebApp.create({
    container: '#app',
    title: 'My MOJO App',
    routerMode: 'params' // Perfect for static hosting
});

app.registerPage('home', HomePage);
app.start();
```

### 3. Serve and Run

```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx http-server

# Visit http://localhost:8000
```

That's it! You have a working MOJO application.

## 📚 Documentation

| Guide | Description |
|-------|-------------|
| **[Quick Start](docs/QuickStart.md)** | Get started in 5 minutes |
| **[WebApp Guide](docs/guide/WebApp.md)** | Application container and lifecycle |
| **[Page Guide](docs/guide/Page.md)** | Route-level components and navigation |
| **[View Guide](docs/guide/View.md)** | Base UI components and event handling |
| **[Router Guide](docs/guide/Router.md)** | URL routing and navigation |
| **[Authentication](docs/guide/Auth.md)** | User authentication and security |
| **[Forms & UI](docs/guide/Forms.md)** | Forms, dialogs, and UI components |
| **[REST API](docs/guide/Rest.md)** | Data models and API communication |

## 🎯 Core Concepts

### Pages - Route-Level Components

Pages represent different views in your application:

```javascript
class UsersPage extends Page {
    constructor(options = {}) {
        super({
            pageName: 'users',
            route: '/users/:id?',
            template: `
                <div class="container">
                    <h1>Users</h1>
                    {{#users}}
                        <div class="card mb-2">
                            <div class="card-body">
                                <h5>{{name}}</h5>
                                <button data-action="edit" data-id="{{id}}">Edit</button>
                            </div>
                        </div>
                    {{/users}}
                </div>
            `,
            ...options
        });
    }
    
    async onEnter() {
        // Called when page is entered
        this.users = await this.loadUsers();
        await this.render();
    }
    
    async handleActionEdit(event, element) {
        const userId = element.getAttribute('data-id');
        await this.getApp().navigate(`/users/${userId}/edit`);
    }
}
```

### Automatic Event Handling

MOJO automatically wires up events using data attributes:

```html
<!-- Click events -->
<button data-action="save-data">Save</button>
<a data-action="navigate-page" data-page="about">About</a>

<!-- Change events -->
<input data-change-action="filter-list" type="text">
<select data-change-action="sort-items">
```

```javascript
// Corresponding handlers in your Page/View class
async handleActionSaveData(event, element) {
    // Handles data-action="save-data"
}

async handleActionFilterList(event, element) {
    // Handles data-change-action="filter-list"
}
```

### Template System

Uses Mustache templating with data binding:

```javascript
async getViewData() {
    return {
        title: 'My Page',
        users: [
            { id: 1, name: 'John', active: true },
            { id: 2, name: 'Jane', active: false }
        ],
        showEmpty: this.users.length === 0
    };
}
```

```html
<div class="page">
    <h1>{{title}}</h1>
    {{#users}}
        <div class="user {{#active}}active{{/active}}">
            {{name}}
        </div>
    {{/users}}
    {{^users}}
        <p>No users found.</p>
    {{/users}}
</div>
```

## 🛠️ Installation

### Option 1: Direct Download/Clone

```bash
git clone https://github.com/yourusername/web-mojo.git
cd web-mojo
```

### Option 2: NPM Package (when published)

```bash
npm install web-mojo bootstrap
```

```javascript
import MOJO, { Page, View } from 'web-mojo';
import 'web-mojo/css';
```

### Option 3: CDN (when available)

```html
<script src="https://unpkg.com/web-mojo/dist/web-mojo.umd.js"></script>
<link href="https://unpkg.com/web-mojo/dist/web-mojo.css" rel="stylesheet">
```

## 🌟 Examples

Explore working examples:

### Portal Example
A complete application with authentication, navigation, and multiple pages.

```bash
cd examples/portal
python -m http.server 8000
# Visit http://localhost:8000
```

### Auth Demo
Authentication system with login, registration, and password reset.

```bash
cd examples/auth-demo
python -m http.server 8000
# Visit http://localhost:8000
```

### Development Server
Run all examples with hot reload:

```bash
npm install
npm run dev  # Opens http://localhost:3000/examples/
```

## 🏗️ Architecture

MOJO follows a component-based architecture:

```
┌─────────────┐
│   WebApp    │  ← Application container & router
└─────────────┘
       │
   ┌───▼───┐
   │ Pages │  ← Route-level components (/home, /about, /users/:id)
   └───┬───┘
       │
   ┌───▼───┐
   │ Views │  ← Reusable UI components (forms, tables, cards)
   └───┬───┘
       │
   ┌───▼───┐
   │Models │  ← Data models with REST API integration
   └───────┘
```

### Key Classes

- **`WebApp`** - Application container, routing, and global state
- **`Page`** - Route-level components with URL parameters
- **`View`** - Base UI components with event handling
- **`Model`** - Data models with REST API integration
- **`Collection`** - Arrays of models with pagination
- **`Router`** - URL routing and navigation

## 🎨 Routing Modes

### Params Mode (Static Hosting)
Perfect for GitHub Pages, Netlify, or any static hosting:

```javascript
const app = WebApp.create({
    routerMode: 'params'  // URLs: ?page=about&id=123
});
```

### History Mode (Server Hosting)  
Clean URLs with server-side URL rewriting:

```javascript
const app = WebApp.create({
    routerMode: 'history'  // URLs: /about/123
});
```

## 🔐 Authentication

MOJO includes a complete authentication system:

```javascript
import AuthApp from 'web-mojo/src/auth/AuthApp.js';

const authApp = await AuthApp.create(app, {
    baseURL: 'https://api.example.com',
    features: {
        registration: true,
        forgotPassword: true,
        rememberMe: true
    }
});

// Handle login success
app.events.on('auth:login', (user) => {
    console.log('User logged in:', user.email);
    app.navigate('/dashboard');
});
```

## 🧪 Testing

Run the test suite:

```bash
npm install
npm test
```

Run specific test suites:

```bash
npm run test:unit        # Unit tests
npm run test:integration # Integration tests
npm run test:build      # Build tests
```

## 📁 Project Structure

```
web-mojo/
├── src/                    # Source code
│   ├── app/               # Application core
│   ├── core/              # Base components (Page, View, Router)
│   ├── components/        # UI components (Table, Dialog, Forms)
│   ├── auth/              # Authentication system
│   └── styles/            # CSS and styling
├── examples/              # Working examples
│   ├── portal/           # Full-featured app example
│   └── auth-demo/        # Authentication example
├── docs/                  # Documentation
│   ├── guide/            # Component guides
│   └── Library/          # Library usage docs
├── test/                  # Test suites
└── dist/                  # Built distributions
```

## 🚀 Performance

MOJO is designed for performance:

- **Minimal Bundle Size** - Core framework is ~50KB gzipped
- **No Build Required** - Works directly in browsers with ES6 modules
- **Lazy Loading** - Components load on demand
- **Event Delegation** - Efficient event handling
- **Template Caching** - Templates compiled once, reused many times

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b my-new-feature`
3. **Make your changes** and add tests
4. **Run the tests**: `npm test`
5. **Commit your changes**: `git commit -am 'Add some feature'`
6. **Push to the branch**: `git push origin my-new-feature`
7. **Submit a pull request**

### Development Setup

```bash
git clone https://github.com/yourusername/web-mojo.git
cd web-mojo
npm install
npm run dev  # Start development server
```

## 📄 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 🙋‍♂️ Support

- **📖 Documentation**: [Complete guides](docs/)
- **💡 Examples**: [Working demos](examples/)  
- **🐛 Issues**: [GitHub Issues](https://github.com/yourusername/web-mojo/issues)
- **💬 Discussions**: [GitHub Discussions](https://github.com/yourusername/web-mojo/discussions)

## ⭐ Star History

If you find MOJO useful, please consider giving it a star! ⭐

---

**Built with ❤️ for the modern web**

Ready to build something amazing? Check out the [Quick Start Guide](docs/QuickStart.md) and start coding!