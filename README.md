# WEB-MOJO Framework 2.1.0

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Version](https://img.shields.io/badge/version-2.1.0-green.svg)](https://www.npmjs.com/package/web-mojo)
[![npm](https://img.shields.io/npm/dm/web-mojo.svg)](https://www.npmjs.com/package/web-mojo)

**WEB-MOJO** is a modern, lightweight JavaScript framework for building data-driven web applications. Built with a **core + extensions** architecture, WEB-MOJO provides maximum flexibility while maintaining clean boundaries and optimal performance.

> **Part of the MOJO Framework Family** - WEB-MOJO is the browser-based framework. See our other MOJO frameworks for native mobile and desktop applications.

## 📚 Documentation

**📖 [View Full Documentation](https://nativemojo.com/web-mojo/)**

Complete guides covering:
- **Core Concepts** - View, Model, Collection, Templates, Events
- **Features** - Location, Maps, Admin tools, Tab navigation
- **Components** - Charts, File upload, DataView, and more
- **Best Practices** - KISS principles, common pitfalls, optimization

---

## ✨ Key Features

🏗️ **Core + Extensions Architecture** - Clean separation with plugin system  
📦 **Subpath Exports** - Import exactly what you need  
⚡ **Lazy Loading** - Reduced bundle sizes with dynamic imports  
🔌 **Plugin System** - Extensions enhance core without dependencies  
🎯 **Tree Shaking** - Optimized builds with modern bundlers  
🎨 **Mustache Templates** - Logic-less templates with 70+ formatters  
📊 **Data-Driven** - Model and Collection classes with REST API integration  
🎭 **Event Delegation** - Convention-based event handling  

---

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
  constructor(options = {}) {
    super({
      template: `
        <div class="home">
          <h1>Welcome to WEB-MOJO!</h1>
          <p>Building modern web apps made simple.</p>
        </div>
      `,
      ...options
    });
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

### With Data Models

```javascript
import { View, Model } from 'web-mojo';

class User extends Model {
  urlRoot = '/api/users';
}

class UserProfileView extends View {
  template = `
    <div class="profile">
      <h2>{{model.name}}</h2>
      <p>{{model.email}}</p>
      <p>Member since: {{model.created_at|date}}</p>
    </div>
  `;
}

// Usage
const user = new User({ id: 123 });
await user.fetch();

const view = new UserProfileView({ model: user });
await view.render();
await view.mount(document.body);
```

---

## 📦 Architecture

WEB-MOJO uses a **core + extensions** architecture:

### Core Package (`web-mojo`)

The stable runtime and building blocks:

- **WebApp** & **PortalApp** - Application containers with routing
- **View** & **Page** - Component system with lifecycle hooks
- **Model** & **Collection** - Data layer with REST API integration
- **Router** - URL routing and navigation
- **Dialog** - Modal system
- **Templates** - Mustache templating with 70+ data formatters
- **Events** - Convention-based event delegation
- **Essential utilities** - File upload, geolocation, utilities

### Extensions

Feature-rich packages that extend core functionality:

#### 🔐 Authentication (`web-mojo/auth`)
Complete authentication system with JWT tokens, login/register forms, and session management.

#### 🖼️ Lightbox (`web-mojo/lightbox`)
Image and PDF viewers with editing capabilities including cropping and annotation.

#### 📊 Charts (`web-mojo/charts`)
Interactive charts built on Chart.js with PieChart, SeriesChart, and more.

#### 📚 Documentation (`web-mojo/docit`)
Full-featured documentation portal system with markdown editing and syntax highlighting.

#### 🗺️ Maps (`web-mojo/map`)
MapLibre GL integration with geolocation tracking and custom controls.

#### ⚡ Loader (`web-mojo/loader`)
Beautiful loading animations and progress indicators.

---

## 🎯 Core Concepts

### Views - Component System

Views are the building blocks of your UI with a complete lifecycle:

```javascript
import { View } from 'web-mojo';

class TodoView extends View {
  template = `
    <div class="todo {{#completed}}completed{{/completed}}">
      <input type="checkbox" {{#completed}}checked{{/completed}} data-action="change:toggle">
      <span>{{title}}</span>
      <button data-action="click:remove">×</button>
    </div>
  `;
  
  toggle() {
    this.model.set('completed', !this.model.get('completed'));
    this.model.save();
  }
  
  remove() {
    this.model.destroy();
  }
}
```

**[→ View Documentation](https://nativemojo.com/web-mojo/#core/View.md)**

### Models - Data Layer

Models manage your data with built-in REST API integration:

```javascript
import { Model } from 'web-mojo';

class Todo extends Model {
  urlRoot = '/api/todos';
  
  defaults() {
    return {
      title: '',
      completed: false,
      created_at: new Date()
    };
  }
  
  validate(attrs) {
    if (!attrs.title || attrs.title.trim() === '') {
      return 'Title is required';
    }
  }
}

// Usage
const todo = new Todo({ title: 'Learn WEB-MOJO' });
await todo.save(); // POST /api/todos

todo.set('completed', true);
await todo.save(); // PUT /api/todos/123
```

**[→ Model Documentation](https://nativemojo.com/web-mojo/#core/Model.md)**

### Templates - Mustache with Formatters

Logic-less templates with powerful data formatting:

```javascript
template = `
  <div class="user-card">
    <h3>{{model.name|uppercase}}</h3>
    <p>{{model.email|lowercase}}</p>
    <p>Joined: {{model.created_at|date:'MMM dd, YYYY'}}</p>
    <p>Revenue: {{model.total_revenue|currency}}</p>
    
    {{#model.is_active|bool}}
      <span class="badge-success">Active</span>
    {{/model.is_active|bool}}
  </div>
`;
```

**70+ built-in formatters** for dates, numbers, text, HTML, and more!

**[→ Templates Documentation](https://nativemojo.com/web-mojo/#core/Templates.md)**

### Events - Convention-Based

Clean event handling with data attributes:

```javascript
class ButtonView extends View {
  template = `
    <button data-action="click:handleClick">Click Me</button>
    <input data-action="input:handleInput" placeholder="Type here">
  `;
  
  handleClick(e) {
    console.log('Button clicked!');
  }
  
  handleInput(e) {
    console.log('Input value:', e.target.value);
  }
}
```

**[→ Events Documentation](https://nativemojo.com/web-mojo/#core/Events.md)**

---

## 🏗️ Portal Applications

Build admin portals and dashboards with PortalApp:

```javascript
import { PortalApp, Page } from 'web-mojo';

const app = new PortalApp({
  name: 'Admin Portal',
  sidebar: {
    menus: [{
      title: 'Main',
      items: [
        { text: 'Dashboard', route: 'dashboard', icon: 'bi-speedometer2' },
        { text: 'Users', route: 'users', icon: 'bi-people' },
        { text: 'Settings', route: 'settings', icon: 'bi-gear' }
      ]
    }]
  }
});

app.registerPage('dashboard', DashboardPage);
app.registerPage('users', UsersPage);
app.start();
```

---

## 📖 Documentation Structure

Our documentation is organized for easy navigation:

- **[Core Concepts](https://nativemojo.com/web-mojo/#core/View.md)** - View, Model, Collection, Templates, Events
- **[Features](https://nativemojo.com/web-mojo/#features/Location.md)** - Location, Maps, Admin, Tabs
- **[Components](https://nativemojo.com/web-mojo/#components/Charts.md)** - UI components and widgets
- **[API Reference](https://nativemojo.com/web-mojo/)** - Complete API documentation

### Essential Reading

**Start here:**
1. [View Basics](https://nativemojo.com/web-mojo/#core/View.md) - Component system
2. [Templates](https://nativemojo.com/web-mojo/#core/Templates.md) - Templating with common pitfalls
3. [Model](https://nativemojo.com/web-mojo/#core/Model.md) - Data layer

**Then explore:**
4. [Child Views](https://nativemojo.com/web-mojo/#core/ViewChildViews.md) - Component composition
5. [Collection](https://nativemojo.com/web-mojo/#core/Collection.md) - Working with lists
6. [Events](https://nativemojo.com/web-mojo/#core/Events.md) - Event handling

**Advanced:**
7. [Advanced Views](https://nativemojo.com/web-mojo/#core/AdvancedViews.md) - Canvas, WebGL, optimization

---

## 🎨 Philosophy

WEB-MOJO follows these core principles:

### KISS - Keep It Simple, Stupid
- Simple patterns over complex abstractions
- Readable code over clever code
- Convention over configuration

### Model-First Approach
- Use models directly in templates
- Avoid custom data structures
- Let formatters handle presentation

### Logic-Less Templates
- Business logic in views, not templates
- Formatters for display formatting
- View methods for computed values

**[→ Read More About Our Philosophy](https://nativemojo.com/web-mojo/#core/Templates.md)**

---

## 🛠️ Development

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Setup

```bash
# Clone repository
git clone https://github.com/NativeMojo/web-mojo.git
cd web-mojo

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

### Project Structure

```
web-mojo/
├── src/
│   ├── core/           # Core framework
│   ├── extensions/     # Extensions (auth, charts, etc.)
│   └── styles/         # CSS styles
├── docs/               # Documentation
│   ├── core/          # Core concept docs
│   ├── features/      # Feature docs
│   └── components/    # Component docs
├── examples/          # Example projects
└── tests/             # Test suites
```

---

## 🤝 Contributing

We welcome contributions! Please:

1. Read our [Contributing Guide](CONTRIBUTING.md)
2. Check [existing issues](https://github.com/NativeMojo/web-mojo/issues)
3. Follow our coding standards
4. Write tests for new features
5. Update documentation

### Documentation Contributions

Documentation improvements are especially welcome! Ensure:
- ✅ Examples are tested and working
- ✅ Common pitfalls are documented
- ✅ Cross-references are updated
- ✅ KISS principles are followed

---

## 📝 License

Apache 2.0 - See [LICENSE](LICENSE) file

---

## 🔗 Links

- **[Documentation](https://nativemojo.com/web-mojo/)** - Complete framework documentation
- **[NPM Package](https://www.npmjs.com/package/web-mojo)** - Install from npm
- **[GitHub Repository](https://github.com/NativeMojo/web-mojo)** - Source code
- **[Issues](https://github.com/NativeMojo/web-mojo/issues)** - Report bugs
- **[Examples](./examples/)** - Working example projects

---

## 🌟 Community

- **Website:** [nativemojo.com](https://nativemojo.com)
- **Discussions:** [GitHub Discussions](https://github.com/NativeMojo/web-mojo/discussions)
- **Issues:** [GitHub Issues](https://github.com/NativeMojo/web-mojo/issues)

---

**Built with ❤️ by the NativeMojo team**
