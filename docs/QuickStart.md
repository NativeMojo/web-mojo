# MOJO Framework Quick Start Guide

Get up and running with MOJO Framework in minutes. This guide will walk you through creating your first MOJO web application.

## What is MOJO?

MOJO is a lightweight, component-based JavaScript framework for building modern web applications. It provides:

- 🏗️ **Component Architecture** - Pages and Views with automatic lifecycle management
- 🔀 **Built-in Routing** - Clean URL routing with parameters and query strings
- 🎨 **Bootstrap Integration** - Beautiful UI components out of the box
- 📱 **Event System** - Declarative event handling with automatic delegation
- 🔐 **Authentication** - Ready-to-use auth system with JWT tokens
- 📄 **Template Engine** - Mustache templating with data binding

## Prerequisites

- Basic knowledge of HTML, CSS, and JavaScript
- A modern web browser
- A local web server (Python, Node.js, or any static file server)

## 5-Minute Setup

### 1. Download or Clone MOJO

```bash
# Clone the repository
git clone https://github.com/yourusername/web-mojo.git
cd web-mojo

# Or download and extract the ZIP file
```

### 2. Create Your First App

Create a new HTML file for your application:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My MOJO App</title>

    <!-- Bootstrap CSS (required) -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">

    <!-- MOJO CSS (optional, for enhanced styling) -->
    <link href="web-mojo/src/styles/mojo.css" rel="stylesheet">
</head>
<body>
    <div id="app">
        <!-- Your MOJO app will render here -->
    </div>

    <!-- Bootstrap JavaScript (required) -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>

    <!-- Your app script -->
    <script type="module" src="app.js"></script>
</body>
</html>
```

### 3. Create Your App Script

Create `app.js`:

```javascript
import WebApp from './web-mojo/src/app/WebApp.js';
import Page from './web-mojo/src/core/Page.js';

// Create a simple home page
class HomePage extends Page {
    constructor(options = {}) {
        super({
            pageName: 'home',
            route: '/',
            template: `
                <div class="container py-5">
                    <div class="row justify-content-center">
                        <div class="col-lg-8">
                            <div class="text-center mb-5">
                                <h1 class="display-4">Welcome to MOJO!</h1>
                                <p class="lead">You've successfully created your first MOJO application.</p>
                            </div>

                            <div class="card">
                                <div class="card-body">
                                    <h5 class="card-title">Quick Actions</h5>
                                    <p class="card-text">Try these interactive examples:</p>

                                    <div class="d-grid gap-2">
                                        <button class="btn btn-primary" data-action="show-alert">
                                            Show Alert
                                        </button>
                                        <button class="btn btn-success" data-action="increment-counter">
                                            Counter: {{counter}}
                                        </button>
                                        <button class="btn btn-info" data-action="navigate-about">
                                            Go to About Page
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `,
            ...options
        });

        this.counter = 0;
    }

    async handleActionShowAlert(event, element) {
        this.getApp().showSuccess('Hello from MOJO! 👋');
    }

    async handleActionIncrementCounter(event, element) {
        this.counter++;
        await this.render(); // Re-render to show updated counter
    }

    async handleActionNavigateAbout(event, element) {
        await this.getApp().navigate('/about');
    }
}

// Create an about page
class AboutPage extends Page {
    constructor(options = {}) {
        super({
            pageName: 'about',
            route: '/about',
            template: `
                <div class="container py-5">
                    <div class="row justify-content-center">
                        <div class="col-lg-8">
                            <h1>About MOJO Framework</h1>
                            <p>MOJO is a modern web framework that makes building interactive web applications simple and enjoyable.</p>

                            <h3>Key Features:</h3>
                            <ul>
                                <li>Component-based architecture</li>
                                <li>Automatic event handling</li>
                                <li>Built-in routing</li>
                                <li>Bootstrap integration</li>
                                <li>Template system with data binding</li>
                            </ul>

                            <button class="btn btn-primary" data-action="go-home">
                                Back to Home
                            </button>
                        </div>
                    </div>
                </div>
            `,
            ...options
        });
    }

    async handleActionGoHome(event, element) {
        await this.getApp().navigate('/');
    }
}

// Create and configure the application
const app = WebApp.create({
    container: '#app',
    title: 'My MOJO App',

    // Use params mode for static hosting (GitHub Pages, etc.)
    // Use history mode for server hosting with URL rewriting
    routerMode: 'params'  // or 'history'
});

// Register your pages
app.registerPage('home', HomePage);
app.registerPage('about', AboutPage);

// Start the application
app.start().then(() => {
    console.log('🚀 MOJO app started successfully!');
}).catch(error => {
    console.error('❌ Failed to start app:', error);
});

// Make app available globally for debugging
window.app = app;
```

### 4. Serve Your App

Start a local web server:

```bash
# Using Python 3
python -m http.server 8000

# Using Python 2
python -m SimpleHTTPServer 8000

# Using Node.js (if you have http-server installed)
npx http-server

# Using PHP
php -S localhost:8000
```

### 5. Open Your App

Visit `http://localhost:8000` in your browser. You should see your MOJO app running!

## Understanding the Code

### WebApp - Application Container

The `WebApp` is your application's main controller:

```javascript
const app = WebApp.create({
    container: '#app',          // Where to render the app
    title: 'My App',           // Application title
    routerMode: 'params',      // Routing mode
    basePath: '/'              // Base URL path
});
```

### Pages - Route-Level Components

Pages represent different views in your application:

```javascript
class MyPage extends Page {
    constructor(options = {}) {
        super({
            pageName: 'my-page',    // Unique identifier
            route: '/my-page',      // URL route
            template: '...',        // HTML template
            ...options
        });
    }

    // Lifecycle hooks
    async onEnter() {
        console.log('Page entered');
    }

    async onExit() {
        console.log('Page exited');
    }
}
```

### Event Handling

MOJO automatically handles events using data attributes:

```html
<!-- Click events -->
<button data-action="my-action">Click Me</button>

<!-- Change events -->
<input data-change-action="handle-input" type="text">

<!-- Custom data -->
<button data-action="edit-item" data-id="123">Edit</button>
```

```javascript
// Event handlers in your Page or View class
async handleActionMyAction(event, element) {
    console.log('Button clicked!');
}

async handleActionHandleInput(event, element) {
    console.log('Input value:', element.value);
}

async handleActionEditItem(event, element) {
    const id = element.getAttribute('data-id');
    console.log('Editing item:', id);
}
```

## Next Steps

### Add More Pages

Create additional pages for your application:

```javascript
class ContactPage extends Page {
    constructor(options = {}) {
        super({
            pageName: 'contact',
            route: '/contact',
            template: `
                <div class="container">
                    <h1>Contact Us</h1>
                    <form>
                        <div class="mb-3">
                            <label class="form-label">Name</label>
                            <input type="text" class="form-control" data-change-action="update-name">
                        </div>
                        <button type="button" class="btn btn-primary" data-action="submit-form">
                            Submit
                        </button>
                    </form>
                </div>
            `,
            ...options
        });

        this.formData = {};
    }

    async handleActionUpdateName(event, element) {
        this.formData.name = element.value;
    }

    async handleActionSubmitForm(event, element) {
        this.getApp().showSuccess('Form submitted!');
        console.log('Form data:', this.formData);
    }
}

// Register the new page
app.registerPage('contact', ContactPage);
```

### Add Navigation

Create a navigation menu:

```javascript
class AppPage extends Page {
    constructor(options = {}) {
        super({
            template: `
                <nav class="navbar navbar-expand-lg navbar-dark bg-primary">
                    <div class="container">
                        <a class="navbar-brand" href="#">My MOJO App</a>
                        <div class="navbar-nav">
                            <a class="nav-link" data-action="navigate" data-page="home">Home</a>
                            <a class="nav-link" data-action="navigate" data-page="about">About</a>
                            <a class="nav-link" data-action="navigate" data-page="contact">Contact</a>
                        </div>
                    </div>
                </nav>
                <main>
                    <!-- Page content will be rendered here -->
                </main>
            `,
            ...options
        });
    }

    async handleActionNavigate(event, element) {
        event.preventDefault();
        const page = element.getAttribute('data-page');
        await this.getApp().navigate(`/${page === 'home' ? '' : page}`);
    }
}
```

### Use Dynamic Data

Connect your pages to data sources:

```javascript
class UsersPage extends Page {
    constructor(options = {}) {
        super({
            pageName: 'users',
            route: '/users',
            template: `
                <div class="container">
                    <h1>Users</h1>
                    <div class="row">
                        {{#users}}
                        <div class="col-md-4 mb-3">
                            <div class="card">
                                <div class="card-body">
                                    <h5 class="card-title">{{name}}</h5>
                                    <p class="card-text">{{email}}</p>
                                    <button class="btn btn-primary" data-action="view-user" data-id="{{id}}">
                                        View Profile
                                    </button>
                                </div>
                            </div>
                        </div>
                        {{/users}}
                    </div>
                </div>
            `,
            ...options
        });
    }

    async onEnter() {
        await super.onEnter();
        // Load user data when page is entered
        await this.loadUsers();
    }

    async loadUsers() {
        // Simulate API call
        this.users = [
            { id: 1, name: 'John Doe', email: 'john@example.com' },
            { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
            { id: 3, name: 'Bob Johnson', email: 'bob@example.com' }
        ];

        await this.render();
    }

    async handleActionViewUser(event, element) {
        const userId = element.getAttribute('data-id');
        await this.getApp().navigate(`/users/${userId}`);
    }
}
```

## Routing Modes

MOJO supports two routing modes:

### Params Mode (Recommended for Static Hosting)

Perfect for GitHub Pages, Netlify, or any static hosting:

```javascript
const app = WebApp.create({
    routerMode: 'params'  // URLs like: ?page=about
});
```

### History Mode (Recommended for Server Hosting)

Clean URLs with server-side URL rewriting:

```javascript
const app = WebApp.create({
    routerMode: 'history'  // URLs like: /about
});
```

## Examples and Demos

MOJO includes comprehensive examples:

1. **Portal Example** (`examples/portal/`) - Full-featured app with authentication, sidebar navigation, and multiple pages
2. **Auth Demo** (`examples/auth-demo/`) - Authentication system demonstration

To run the examples:

```bash
cd web-mojo
npm install
npm run dev  # Opens examples at http://localhost:3000
```

## What's Next?

- 📖 **[Read the Full Documentation](./docs/guide/)** - Detailed guides for all components
- 🔐 **[Add Authentication](./docs/guide/Auth.md)** - User login and registration
- 🎨 **[Customize Styling](./docs/guide/Forms.md)** - Forms, dialogs, and UI components
- 🚀 **[Deploy Your App](./docs/Library/LibraryUsage.md)** - Production deployment guide

## Getting Help

- **Documentation**: Complete guides in the `docs/` folder
- **Examples**: Working examples in the `examples/` folder
- **Issues**: [GitHub Issues](https://github.com/yourusername/web-mojo/issues)

## Summary

You now have a working MOJO application! The framework provides:

- ✅ **Simple Setup** - Just HTML, CSS, and JavaScript
- ✅ **Component Architecture** - Pages and Views with lifecycle management
- ✅ **Automatic Events** - Declarative event handling
- ✅ **Clean Routing** - URL-based navigation
- ✅ **Template System** - Data binding with Mustache
- ✅ **Bootstrap Integration** - Beautiful, responsive UI

Ready to build something amazing? Dive into the [complete documentation](./docs/guide/) to explore all of MOJO's features!
