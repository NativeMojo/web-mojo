# MOJO Framework

A lightweight, modern ES6 JavaScript UI framework built on Bootstrap 5. MOJO follows MVC architecture patterns with clean folder structures, RESTful API integration, and component-based development.

## 🚀 Quick Start

```bash
# Clone and setup
git clone <repository-url>
cd web-mojo
npm install

# Start development server
npm run dev

# Visit examples
open http://localhost:3000/examples/
```

## ✨ Key Features

- **🏗️ MVC Architecture** - Clean separation with Models, Views, and Controllers
- **🚀 Modern JavaScript** - ES6+, async/await, modules
- **📱 Bootstrap 5 Native** - Full integration with Bootstrap components
- **🛣️ Modern Navigation** - SEO-friendly href-based routing with copy-link support
- **🎨 Component System** - Reusable TopNav, Sidebar, Table, and Form components
- **🔄 Data Layer** - RestModel and DataList for API integration
- **📋 Template Engine** - Mustache.js for dynamic content rendering

## 📚 Documentation

**Complete documentation is organized in the [`docs/`](docs/) folder:**

### 🎯 Getting Started
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

### 🔧 Development
- **[Development Guide](docs/development/DEVELOPMENT.md)** - Setup and contribution
- **[Testing Guide](docs/testing/README.md)** - Testing framework and patterns
- **[Phase History](docs/phase-history/)** - Complete development timeline

## 🎯 Framework Status

### ✅ Phase 1: Core Architecture (Complete)
- View hierarchy system with parent-child relationships
- Page components with routing capabilities
- Component lifecycle management
- Event system (EventBus + DOM actions)
- Modern href-based navigation system

### ✅ Phase 2: Data Layer (Complete)
- RestModel for API integration
- DataList for collection management
- Validation system with custom rules
- Search, filtering, and sorting capabilities

### 🚧 Phase 3: Advanced Components (In Development)
- Enhanced Table component
- FormBuilder with validation
- Chart integration
- Authentication system

## 🛠️ Development Commands

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run watch           # Watch mode development

# Testing
npm test                # Run all tests
npm run test:unit       # Unit tests only
npm run test:integration # Integration tests only

# Examples
npm run serve:examples  # Serve examples directory
```

## 📁 Project Structure

```
web-mojo/
├── docs/                     # 📚 Complete documentation
│   ├── user-guide/          # Getting started and user docs
│   ├── components/          # Component documentation
│   ├── development/         # Development and contribution
│   ├── testing/            # Testing guides and references
│   └── examples/           # Example documentation
├── src/                     # 🔧 Framework source code
│   ├── core/               # Core classes (View, Page, Router)
│   ├── components/         # UI components (TopNav, Sidebar, Table)
│   └── utils/              # Utilities and helpers
├── examples/               # 📖 Interactive examples and demos
├── test/                   # 🧪 Testing suite
├── diagnostics/            # 🔍 Development and diagnostic scripts
└── dist/                   # 📦 Built files
```

## 🌟 Navigation System

MOJO features a modern dual-navigation approach:

### href Navigation (Primary)
```html
<!-- SEO-friendly, copy-link support -->
<a href="/">Home</a>
<a href="/users/123">User Profile</a>
```

### data-page Navigation (Enhanced)
```html
<!-- Page name routing with parameters -->
<button data-page="user" data-params='{"id": 123, "tab": "profile"}'>
  User Settings
</button>
```

## 🎨 Component Example

```javascript
import { TopNav, Sidebar, Page, Router } from './src/mojo.js';

// Create navigation
const nav = new TopNav({
  data: {
    brandText: 'My App',
    navItems: [
      { route: '/', text: 'Home', icon: 'bi bi-house' },
      { route: '/about', text: 'About', icon: 'bi bi-info-circle' }
    ]
  }
});

// Create page
class HomePage extends Page {
  constructor() {
    super({
      page_name: 'Home',
      route: '/',
      template: '<h1>{{title}}</h1>'
    });
  }
}

// Setup router
const router = new Router({ container: '#app' });
router.addRoute('/', HomePage);
router.start();
```

## 🚀 Learn More

- **[📚 Complete Documentation](docs/)** - Comprehensive guides and references
- **[🎮 Live Examples](examples/)** - Interactive demos you can try now
- **[🛣️ Navigation Guide](docs/user-guide/NAVIGATION-SYSTEM.md)** - Modern routing system
- **[🧩 Component Library](docs/components/)** - Reusable UI components

---

**MOJO Framework v2.0.0** - Modern JavaScript UI Framework  
Built with ❤️ and modern web standards