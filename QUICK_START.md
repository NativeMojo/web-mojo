# MOJO Framework 2.1.0 - Quick Start Guide

Get up and running with MOJO in under 10 minutes! This guide covers everything you need to build your first application with the new **core + extensions** architecture.

## 📦 Installation

### Option 1: NPM (Recommended)

```bash
npm install web-mojo bootstrap
```

### Option 2: Direct Download
Download the latest release from [GitHub Releases](https://github.com/yourusername/web-mojo/releases) and extract to your project.

### Option 3: CDN (Coming Soon)
```html
<script type="module" src="https://unpkg.com/web-mojo@2.1.0/dist/index.es.js"></script>
```

## 🚀 Basic Setup

### 1. Create Your HTML File

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My MOJO App</title>
    
    <!-- Bootstrap CSS (required) -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css" rel="stylesheet">
    
    <!-- MOJO CSS (auto-included with JS imports) -->
</head>
<body>
    <div id="app"></div>
    
    <!-- Bootstrap JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
    
    <!-- Your App -->
    <script type="module" src="app.js"></script>
</body>
</html>
```

### 2. Create Your First App

```javascript
// app.js
import { WebApp, Page } from 'web-mojo';

// Create a simple page
class HomePage extends Page {
    constructor(options = {}) {
        super({
            title: 'Welcome to MOJO',
            template: `
                <div class="container py-5">
                    <div class="row justify-content-center">
                        <div class="col-md-8">
                            <div class="text-center mb-5">
                                <h1 class="display-4">⚡ Welcome to MOJO!</h1>
                                <p class="lead">You've successfully created your first MOJO application.</p>
                            </div>
                            
                            <div class="card">
                                <div class="card-body">
                                    <h5 class="card-title">Interactive Demo</h5>
                                    <p>Button clicked: <strong>{{clickCount}}</strong> times</p>
                                    <button class="btn btn-primary me-2" data-action="increment">
                                        Click Me! 🎉
                                    </button>
                                    <button class="btn btn-outline-secondary" data-action="reset">
                                        Reset
                                    </button>
                                </div>
                            </div>
                            
                            <div class="mt-4">
                                <h6>Next Steps:</h6>
                                <ul class="list-unstyled">
                                    <li>✅ Basic MOJO app running</li>
                                    <li>🔄 Try clicking the button above</li>
                                    <li>📚 Add more pages and features</li>
                                    <li>🔌 Explore extensions</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            `,
            ...options
        });
        
        this.clickCount = 0;
    }
    
    getTemplateData() {
        return {
            clickCount: this.clickCount
        };
    }
    
    async onActionIncrement() {
        this.clickCount++;
        await this.render();
        this.getApp().showSuccess(`Great! You've clicked ${this.clickCount} times! 🎉`);
    }
    
    async onActionReset() {
        this.clickCount = 0;
        await this.render();
        this.getApp().showInfo('Counter reset to zero');
    }
}

// Create and start the app
const app = new WebApp({
    name: 'My First MOJO App',
    container: '#app'
});

app.registerPage('home', HomePage);

// Start the application
app.start().then(() => {
    console.log('🚀 MOJO app started successfully!');
}).catch(error => {
    console.error('❌ Failed to start app:', error);
});
```

### 3. Serve Your App

```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx http-server

# Using PHP
php -S localhost:8000

# Visit http://localhost:8000
```

🎉 **Congratulations!** You now have a working MOJO application!

## 🏗️ Portal Application

For a more complete application with navigation, upgrade to PortalApp:

```javascript
import { PortalApp, Page } from 'web-mojo';

class DashboardPage extends Page {
    constructor(options = {}) {
        super({
            title: 'Dashboard',
            template: `
                <div class="row">
                    <div class="col-md-4">
                        <div class="card bg-primary text-white">
                            <div class="card-body">
                                <h5 class="card-title">Total Users</h5>
                                <h2>1,234</h2>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card bg-success text-white">
                            <div class="card-body">
                                <h5 class="card-title">Revenue</h5>
                                <h2>$56,789</h2>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card bg-info text-white">
                            <div class="card-body">
                                <h5 class="card-title">Orders</h5>
                                <h2>891</h2>
                            </div>
                        </div>
                    </div>
                </div>
            `,
            ...options
        });
    }
}

const app = new PortalApp({
    name: 'Admin Portal',
    brand: 'My Company',
    
    // Sidebar navigation
    sidebar: {
        menus: [{
            name: 'main',
            items: [
                { text: 'Dashboard', route: 'dashboard', icon: 'bi-speedometer2' },
                { text: 'Users', route: 'users', icon: 'bi-people' },
                { text: 'Reports', route: 'reports', icon: 'bi-bar-chart' },
                { 
                    text: 'Settings', 
                    icon: 'bi-gear',
                    children: [
                        { text: 'General', route: 'settings/general' },
                        { text: 'Security', route: 'settings/security' }
                    ]
                }
            ]
        }]
    },
    
    // Top navigation
    topbar: {
        brand: 'Admin Portal',
        brandIcon: 'bi-lightning-charge',
        rightItems: [
            { icon: 'bi-bell', action: 'notifications' },
            { icon: 'bi-person-circle', action: 'profile' }
        ]
    }
});

app.registerPage('dashboard', DashboardPage);
app.start();
```

## 🔌 Adding Extensions

MOJO's power comes from its extensions. Here's how to add them:

### Authentication System

```javascript
import { AuthApp } from 'web-mojo/auth';

const authApp = new AuthApp({
    api: {
        baseURL: 'https://your-api.com'
    },
    ui: {
        title: 'My Company',
        logoUrl: '/assets/logo.png'
    },
    loginRedirect: '/dashboard'
});

// Handle successful login
authApp.events.on('auth:login', (user) => {
    console.log('User logged in:', user.email);
    window.location.href = '/dashboard';
});

authApp.start();
```

### Image & PDF Viewers

```javascript
import { WebApp } from 'web-mojo';
import 'web-mojo/lightbox'; // Auto-enables image features

const app = new WebApp({/* ... */});

// Now Dialog automatically supports image cropping
// and your app has lightbox capabilities
```

### Interactive Charts

```javascript
import { PieChart, SeriesChart } from 'web-mojo/charts';

class AnalyticsPage extends Page {
    async onMount() {
        // Create a pie chart
        this.pieChart = new PieChart({
            container: '#pie-chart',
            data: [
                { label: 'Desktop', value: 60, color: '#007bff' },
                { label: 'Mobile', value: 30, color: '#28a745' },
                { label: 'Tablet', value: 10, color: '#ffc107' }
            ]
        });
        
        // Create a line chart
        this.lineChart = new SeriesChart({
            container: '#line-chart',
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
                datasets: [{
                    label: 'Sales',
                    data: [12, 19, 3, 5, 2],
                    borderColor: '#007bff'
                }]
            }
        });
    }
}
```

### Documentation Portal

```javascript
import { DocItApp } from 'web-mojo/docit';

const docsApp = new DocItApp({
    name: 'Documentation Portal',
    books: [
        { id: 'user-guide', title: 'User Guide' },
        { id: 'api-docs', title: 'API Documentation' }
    ]
});

docsApp.start();
```

## 📊 Working with Data

### Models and Collections

```javascript
import { Model, Collection } from 'web-mojo';

// Define a model
class User extends Model {
    static endpoint = '/api/users';
    
    get fullName() {
        return `${this.get('firstName')} ${this.get('lastName')}`;
    }
}

// Define a collection
class UserList extends Collection {
    model = User;
    endpoint = '/api/users';
}

// Usage in a page
class UsersPage extends Page {
    constructor(options = {}) {
        super({
            title: 'Users',
            template: `
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h1>Users</h1>
                    <button class="btn btn-primary" data-action="add-user">
                        <i class="bi bi-plus"></i> Add User
                    </button>
                </div>
                
                <div class="table-responsive">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {{#users}}
                            <tr>
                                <td>{{fullName}}</td>
                                <td>{{email}}</td>
                                <td>
                                    <button class="btn btn-sm btn-outline-primary" 
                                            data-action="edit-user" 
                                            data-user-id="{{id}}">
                                        Edit
                                    </button>
                                </td>
                            </tr>
                            {{/users}}
                        </tbody>
                    </table>
                </div>
            `,
            ...options
        });
        
        this.users = new UserList();
    }
    
    async onMount() {
        await this.users.fetch();
        await this.render();
    }
    
    getTemplateData() {
        return {
            users: this.users.map(user => ({
                ...user.toJSON(),
                fullName: user.fullName
            }))
        };
    }
    
    async onActionAddUser() {
        const { Dialog } = await import('web-mojo');
        
        const result = await Dialog.showForm({
            title: 'Add User',
            fields: [
                { name: 'firstName', type: 'text', label: 'First Name', required: true },
                { name: 'lastName', type: 'text', label: 'Last Name', required: true },
                { name: 'email', type: 'email', label: 'Email', required: true }
            ]
        });
        
        if (result.action === 'submit') {
            const user = new User(result.data);
            await user.save();
            await this.users.fetch(); // Refresh list
            await this.render();
            this.getApp().showSuccess('User added successfully!');
        }
    }
    
    async onActionEditUser(action, event, element) {
        const userId = element.dataset.userId;
        const user = this.users.get(userId);
        
        const { Dialog } = await import('web-mojo');
        
        const result = await Dialog.showModelForm(user, {
            title: 'Edit User',
            fields: ['firstName', 'lastName', 'email']
        });
        
        if (result.success) {
            await this.render();
            this.getApp().showSuccess('User updated successfully!');
        }
    }
}
```

## 🎯 Common Patterns

### Loading States

```javascript
class DataPage extends Page {
    async onMount() {
        this.showLoading();
        
        try {
            this.data = await this.loadData();
            await this.render();
        } catch (error) {
            this.showError('Failed to load data');
        } finally {
            this.hideLoading();
        }
    }
    
    showLoading() {
        this.el.innerHTML = '<div class="text-center p-5">Loading...</div>';
    }
    
    showError(message) {
        this.el.innerHTML = `<div class="alert alert-danger">${message}</div>`;
    }
}
```

### Form Validation

```javascript
class ContactPage extends Page {
    async onActionSubmitForm() {
        const formData = this.getFormData();
        
        // Validate
        const errors = this.validateForm(formData);
        if (errors.length > 0) {
            this.showErrors(errors);
            return;
        }
        
        // Submit
        try {
            await this.submitForm(formData);
            this.getApp().showSuccess('Form submitted successfully!');
        } catch (error) {
            this.getApp().showError('Submission failed: ' + error.message);
        }
    }
    
    validateForm(data) {
        const errors = [];
        
        if (!data.name?.trim()) {
            errors.push('Name is required');
        }
        
        if (!data.email?.includes('@')) {
            errors.push('Valid email is required');
        }
        
        return errors;
    }
}
```

### Real-time Updates

```javascript
import { EventBus } from 'web-mojo';

class LiveDataPage extends Page {
    async onMount() {
        // Subscribe to real-time updates
        EventBus.on('data:updated', this.handleDataUpdate.bind(this));
        
        // Set up polling
        this.pollInterval = setInterval(() => {
            this.refreshData();
        }, 30000); // Every 30 seconds
    }
    
    async onUnmount() {
        EventBus.off('data:updated', this.handleDataUpdate);
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
        }
    }
    
    async handleDataUpdate(newData) {
        this.data = newData;
        await this.render();
    }
}
```

## 🛠️ Development Tools

### Debug Mode

```javascript
const app = new WebApp({
    debug: true, // Enables debug logging
    // ...
});

// Access app in browser console
window.myApp = app;
```

### Hot Reload (Development)

```javascript
// Enable hot module replacement in development
if (import.meta.hot) {
    import.meta.hot.accept('./HomePage.js', ({ HomePage }) => {
        app.registerPage('home', HomePage);
        if (app.currentPage?.pageName === 'home') {
            app.navigate('home', { replace: true });
        }
    });
}
```

### Environment Configuration

```javascript
const config = {
    development: {
        api: { baseURL: 'http://localhost:8080' },
        debug: true
    },
    production: {
        api: { baseURL: 'https://api.myapp.com' },
        debug: false
    }
};

const app = new WebApp({
    ...config[process.env.NODE_ENV || 'development']
});
```

## 📱 Mobile Optimization

```javascript
const app = new PortalApp({
    // Mobile-friendly sidebar
    sidebar: {
        collapsible: true,
        collapseOnMobile: true,
        menus: [/* ... */]
    },
    
    // Responsive topbar
    topbar: {
        showSidebarToggle: true,
        mobileBreakpoint: 'lg'
    }
});

// Add touch gestures
class SwipeablePage extends Page {
    onMount() {
        this.addTouchSupport();
    }
    
    addTouchSupport() {
        let startX = 0;
        
        this.el.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
        });
        
        this.el.addEventListener('touchend', (e) => {
            const endX = e.changedTouches[0].clientX;
            const diff = startX - endX;
            
            if (Math.abs(diff) > 50) {
                if (diff > 0) {
                    this.handleSwipeLeft();
                } else {
                    this.handleSwipeRight();
                }
            }
        });
    }
}
```

## 🚀 Deployment

### Build for Production

```javascript
// Use tree shaking with modern bundlers
import { WebApp, Page } from 'web-mojo';
import { AuthApp } from 'web-mojo/auth'; // Only if needed

// Your app code...
```

### Static Hosting

```html
<!-- For GitHub Pages, Netlify, etc. -->
<script type="module">
    // Use parameter-based routing for static hosting
    const app = new WebApp({
        routerMode: 'params' // URLs: ?page=about&id=123
    });
</script>
```

### Server Hosting

```javascript
// For Express.js, Apache, etc.
const app = new WebApp({
    routerMode: 'history', // URLs: /about/123
    basePath: '/app/'      // If app is in subdirectory
});
```

## 🔍 Troubleshooting

### Common Issues

**Import Errors**
```javascript
// ❌ Wrong
import WebApp from 'web-mojo/src/WebApp.js';

// ✅ Correct
import { WebApp } from 'web-mojo';
```

**CSS Not Loading**
```javascript
// CSS is automatically included when you import the JS
import 'web-mojo'; // Includes all core CSS

// Or import specific CSS only
import 'web-mojo/css/core';
```

**Extension Not Working**
```javascript
// Make sure to import extensions BEFORE using features
import 'web-mojo/lightbox'; // Registers plugins
import { Dialog } from 'web-mojo';

// Now Dialog has image cropping support
```

### Performance Tips

1. **Lazy Load Extensions**: Only import what you need
2. **Use Tree Shaking**: Modern bundlers eliminate unused code
3. **Cache Assets**: Configure proper HTTP caching headers
4. **Optimize Images**: Use responsive images and modern formats

## 📚 Next Steps

Now that you have MOJO up and running:

1. 📖 **Explore Examples**: Check out `examples/portal` and `examples/auth`
2. 🏗️ **Build Real Apps**: Start with a simple CRUD application
3. 🔌 **Try Extensions**: Add authentication, charts, or image processing
4. 🎨 **Customize Styling**: Override Bootstrap variables for your brand
5. 📱 **Add Mobile Support**: Make your app responsive
6. 🚀 **Deploy**: Push your app to production

## 🤝 Getting Help

- 📖 **Full Documentation**: [README.md](./README.md)
- 💡 **Examples**: [examples/](./examples/)
- 🐛 **Issues**: [GitHub Issues](https://github.com/yourusername/web-mojo/issues)
- 💬 **Community**: [GitHub Discussions](https://github.com/yourusername/web-mojo/discussions)

---

🎉 **Welcome to MOJO!** You're now ready to build amazing web applications with a modern, flexible framework. Happy coding! ⚡