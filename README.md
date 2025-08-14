# MOJO Framework

A lightweight, modern ES6 JavaScript UI framework built on Bootstrap 5. MOJO follows MVC architecture patterns with clean folder structures, RESTful API integration, and component-based development.

[![npm version](https://img.shields.io/npm/v/web-mojo.svg)](https://www.npmjs.com/package/web-mojo)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 📦 Installation

MOJO is available as `web-mojo` on npm:

```bash
# Install from npm
npm install web-mojo bootstrap

# Or using yarn
yarn add web-mojo bootstrap

# Or using pnpm
pnpm add web-mojo bootstrap
```

## 🚀 Quick Start

### Using as a Library

```javascript
// Import MOJO in your project
import MOJO, { View, Page, Router } from 'web-mojo';
import 'web-mojo/css';
import 'bootstrap/dist/css/bootstrap.min.css';

// Create your application
const app = new MOJO({
  container: '#app',
  router: {
    mode: 'history', // or 'param' for static hosting
    base: '/'
  }
});

// Create a simple page
class HomePage extends Page {
  constructor() {
    super({
      name: 'home',
      title: 'Welcome to MOJO'
    });
  }

  render() {
    return `
      <div class="container">
        <h1>Hello MOJO!</h1>
      </div>
    `;
  }
}

// Register and start
app.registerPage('home', HomePage);
app.router.add('/', 'home');
app.start();
```

### Using via CDN

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
    const app = new MOJO.default({
      container: '#app'
    });
    app.start();
  </script>
</body>
</html>
```

### Development Setup

For framework development or running examples:

```bash
# Clone the repository
git clone https://github.com/yourusername/web-mojo.git
cd web-mojo

# Install dependencies
npm install

# Start development server with examples
npm run dev

# Visit examples
open http://localhost:3000/examples/
```

## 🔗 Development Linking

When developing both MOJO and a project using it:

```bash
# In MOJO directory
cd web-mojo
npm link
npm run build:lib:watch

# In your project
cd my-project
npm link web-mojo
npm run dev
```

See [Library Usage Guide](docs/LIBRARY_USAGE.md) for detailed instructions.

## ✨ Key Features

- **🏗️ MVC Architecture** - Clean separation with Models, Views, and Controllers
- **🚀 Modern JavaScript** - ES6+, async/await, modules, tree-shakeable
- **📱 Bootstrap 5 Native** - Full integration with Bootstrap components
- **🛣️ Modern Navigation** - SEO-friendly href-based routing with copy-link support
- **🎨 Component System** - Reusable TopNav, Sidebar, Table, and Form components
- **🔄 Data Layer** - RestModel and Collection for API integration
- **🔐 Authentication** - Built-in AuthService with JWT utilities and passkey support
- **📋 Template Engine** - Mustache.js for dynamic content rendering
- **📦 Multiple Formats** - ESM, CommonJS, and UMD builds

## 📚 Documentation

**Complete documentation is organized in the [`docs/`](docs/) folder:**

### 🎯 Getting Started
- **[Library Usage Guide](docs/LIBRARY_USAGE.md)** - Installation, usage, and development linking
- **[User Guide](docs/user-guide/README-Phase1.md)** - Complete framework guide
- **[Navigation System](docs/user-guide/NAVIGATION-SYSTEM.md)** - Modern href + data-page navigation
- **[Design Guidelines](docs/user-guide/design.md)** - UI/UX principles and best practices

### 🧩 Components
- **[Navigation Components](docs/components/navigation.md)** - TopNav, Sidebar, MainContent
- **[Table Component](docs/components/MOJO-TABLE-COMPONENT-DEMO.md)** - Advanced data tables
- **[All Components](docs/components/)** - Complete component library

### 📖 Examples
- **[Examples Overview](docs/examples/README.md)** - All example applications
- **[Live Examples](examples/)** - Interactive demos and tutorials
- **[Portal Demo](examples/portal/)** - Complete application example

### 🔧 Development
- **[Development Guide](docs/development/DEVELOPMENT.md)** - Setup and contribution
- **[Testing Guide](docs/testing/README.md)** - Testing framework and patterns
- **[API Reference](docs/api/)** - Complete API documentation

## 🛠️ Development Commands

```bash
# Development
npm run dev              # Start dev server with examples
npm run build:lib        # Build library for distribution
npm run build:lib:watch  # Build library in watch mode
npm run test             # Run test suite
npm run lint             # Run linter

# Publishing
npm run build:dist       # Build for npm publishing
npm publish              # Publish to npm registry
```

## 📦 Package Structure

```
web-mojo/
├── src/                 # Source code
│   ├── core/           # Core framework classes
│   ├── components/     # Reusable components
│   ├── utils/          # Utilities
│   └── index.js        # Library entry point
├── dist/               # Built library files
│   ├── web-mojo.esm.js    # ES modules
│   ├── web-mojo.cjs.js    # CommonJS
│   ├── web-mojo.umd.js    # UMD (browser)
│   └── web-mojo.css       # Styles
├── examples/           # Example applications
├── docs/              # Documentation
└── test/              # Test suite
```

## 🤝 Contributing

We welcome contributions! Please see our [Development Guide](docs/development/DEVELOPMENT.md) for details on:

- Setting up your development environment
- Code style guidelines
- Testing requirements
- Submitting pull requests

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 Links

- **NPM Package:** [npmjs.com/package/web-mojo](https://www.npmjs.com/package/web-mojo)
- **Documentation:** [GitHub Docs](https://github.com/yourusername/web-mojo/tree/main/docs)
- **Examples:** [Live Examples](https://yourusername.github.io/web-mojo/examples/)
- **Issues:** [GitHub Issues](https://github.com/yourusername/web-mojo/issues)

## 🙏 Acknowledgments

Built with:
- [Bootstrap 5](https://getbootstrap.com/)
- [Mustache.js](https://github.com/janl/mustache.js)
- [Vite](https://vitejs.dev/)

---

**MOJO Framework** - Simple, Modern, Powerful