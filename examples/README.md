# MOJO Framework Examples

This directory contains interactive examples demonstrating the features and capabilities of the MOJO Framework Phase 1.

## 🚀 Quick Start

1. **View Examples Index**: Open `index.html` in your browser to see all available examples
2. **Run Individual Examples**: Navigate to any example folder and open its `index.html`
3. **Development Server**: For best experience, serve from a local HTTP server

```bash
# Simple Python server
python3 -m http.server 8080

# Or Node.js serve
npx serve .

# Then visit: http://localhost:8080
```

## 📁 Available Examples

### 1. Basic Example (`basic/`)
**Difficulty: Beginner** | **Focus: Core Concepts**

Perfect starting point for learning MOJO fundamentals.

**Features Demonstrated:**
- ✅ View creation and rendering
- ✅ Page navigation and routing  
- ✅ Template rendering with Mustache.js
- ✅ Event handling and DOM actions
- ✅ Component lifecycle management
- ✅ Data binding and updates

**What You'll Learn:**
- How to create and render Views
- Basic Page routing and navigation
- Template syntax and data binding
- Action handlers and event responses
- Component lifecycle hooks

**Run:** `basic/index.html`

---

### 2. Hierarchy Example (`hierarchy/`)
**Difficulty: Intermediate** | **Focus: Component Relationships**

Explore parent-child View relationships and component communication.

**Features Demonstrated:**
- ✅ Parent-child View relationships
- ✅ Dynamic child creation and removal
- ✅ Inter-component communication
- ✅ Event propagation and broadcasting
- ✅ Lifecycle management in hierarchies
- ✅ Real-time message logging

**What You'll Learn:**
- Building component hierarchies
- Managing parent-child relationships
- Communication patterns between components
- Dynamic component manipulation
- Event broadcasting to siblings

**Run:** `hierarchy/index.html`

---

### 3. Events Example (`events/`)
**Difficulty: Intermediate** | **Focus: EventBus System**

Master the global EventBus for powerful component communication.

**Features Demonstrated:**
- ✅ Global event publishing and subscribing
- ✅ Event namespacing and wildcards
- ✅ Real-time event monitoring and logging
- ✅ Event filtering and statistics
- ✅ Complex event data handling
- ✅ Event burst and batch operations

**What You'll Learn:**
- Global EventBus usage patterns
- Event namespacing strategies
- Wildcard event listeners
- Event monitoring and debugging
- Performance considerations

**Run:** `events/index.html`

---

### 4. Complete Demo (`complete-demo/`)
**Difficulty: Advanced** | **Focus: Full Application**

Comprehensive demonstration showcasing all Phase 1 features.

**Features Demonstrated:**
- ✅ Multi-page navigation system
- ✅ Debug panel and developer tools
- ✅ Advanced view hierarchies
- ✅ Real-time statistics and monitoring
- ✅ Production-ready architecture
- ✅ Comprehensive error handling

**What You'll Learn:**
- Complete application architecture
- Advanced development patterns
- Production deployment considerations
- Performance optimization techniques
- Debugging and monitoring tools

**Run:** `complete-demo/index.html`

---

### 5. Phase 2 Basic (`phase2-basic/`)
**Difficulty: Intermediate** | **Focus: Data Layer Fundamentals**

Master MOJO's Phase 2 data layer with RestModel and DataList components.

**Features Demonstrated:**
- ✅ RestModel CRUD operations with validation
- ✅ DataList collection management and querying
- ✅ Real-time validation with custom rules
- ✅ Event-driven UI updates and collection events
- ✅ Search, filtering, and sorting capabilities
- ✅ Comprehensive error handling and logging

**What You'll Learn:**
- Creating models with validation rules
- Managing collections with add/remove/query operations
- Building reactive UIs with data layer events
- Implementing search and filter functionality
- Handling validation errors gracefully

**Run:** `phase2-basic/index.html`

## 🎯 Learning Path

**Recommended Order for New Users:**

**Phase 1 Foundation:**
1. **Start with Basic** - Learn core concepts and syntax
2. **Explore Hierarchy** - Understand component relationships
3. **Master Events** - Learn the EventBus communication system
4. **Review Complete Demo** - See everything working together

**Phase 2 Data Layer:**
5. **Phase 2 Basic** - Master RestModel and DataList fundamentals

**Advanced Learning:**
6. **Build Your Own** - Combine Phase 1 + Phase 2 concepts

## 🛠️ Example Structure

Each example follows a consistent structure:

```
example-name/
├── index.html          # Main HTML file with styling
├── app.js             # Example application code
└── README.md          # Example-specific documentation (optional)
```

### Common Features Across Examples:

- **Modern ES6+ Syntax** - All examples use modern JavaScript
- **Bootstrap 5 Styling** - Responsive, professional UI design
- **Error Handling** - Graceful error display and recovery
- **Developer Console** - Rich debugging information
- **Responsive Design** - Works on desktop and mobile
- **Accessibility** - Semantic HTML and ARIA attributes

## 🔧 Development Guidelines

### Running Examples Locally

**Option 1: Python HTTP Server**
```bash
cd web-mojo/examples
python3 -m http.server 8080
# Visit: http://localhost:8080
```

**Option 2: Node.js Serve**
```bash
npx serve web-mojo/examples
# Visit: http://localhost:3000
```

**Option 3: VS Code Live Server**
- Install Live Server extension
- Right-click on any `index.html` file
- Select "Open with Live Server"

### Browser Requirements

- **Chrome 60+** (recommended)
- **Firefox 55+**
- **Safari 11+** 
- **Edge 79+**

**Required Features:**
- ES6 Modules (`import`/`export`)
- Async/Await
- Modern DOM APIs
- CSS Grid and Flexbox

## 📚 Code Examples

### Basic View Creation
```javascript
import { View } from '../../src/mojo.js';

class MyView extends View {
    constructor(options = {}) {
        super({
            template: '<div>{{message}}</div>',
            data: { message: 'Hello MOJO!' },
            ...options
        });
    }

    async onActionClick() {
        this.showSuccess('Button clicked!');
    }
}
```

### Page with Routing
```javascript
import { Page } from '../../src/mojo.js';

class MyPage extends Page {
    constructor(options = {}) {
        super({
            page_name: 'my-page',
            route: '/my-page/:id',
            template: '<h1>{{title}}</h1>',
            ...options
        });
    }

    on_params(params, query) {
        console.log('Page params:', params, query);
    }
}
```

### Event Communication
```javascript
// Emit global event
window.MOJO.eventBus.emit('user:login', { userId: 123 });

// Listen for events
window.MOJO.eventBus.on('user:*', (data, eventName) => {
    console.log(`User event: ${eventName}`, data);
});
```

## 🐛 Troubleshooting

### Common Issues

**1. Module Import Errors**
- Ensure you're serving from HTTP server (not `file://`)
- Check that `../../src/mojo.js` path is correct

**2. Template Not Rendering**
- Verify data object structure matches template variables
- Check for JavaScript errors in console

**3. Events Not Working**
- Ensure MOJO instance is created and initialized
- Check EventBus is available: `window.MOJO.eventBus`

**4. Routing Issues**
- Verify route patterns match URL structure
- Check browser history API support

### Debug Mode

Enable debug mode for detailed logging:
```javascript
const mojo = MOJO.create({
    debug: true,  // Enable debug logging
    container: '#app'
});
```

### Developer Tools

Access developer utilities in console:
```javascript
// View registered components
MOJODevTools.views()
MOJODevTools.pages()

// View hierarchy
MOJODevTools.hierarchy()

// Framework statistics
MOJODevTools.stats()
```

## 📞 Getting Help

1. **Check Console** - Most issues show helpful error messages
2. **Review Documentation** - See `../README-Phase1.md`
3. **Examine Source** - Examples are heavily commented
4. **Debug Panel** - Available in debug mode
5. **Browser DevTools** - Network, Console, and Elements tabs

## 🚀 Next Steps

After exploring these examples:

1. **Try Phase 2** - Explore data layer with `phase2-basic/`
2. **Build Your Own** - Create a custom application combining Phase 1 + 2
3. **Read Documentation** - Dive deeper with `../README-Phase1.md` and `../PHASE2-COMPLETE.md`
4. **Explore Source Code** - Study `../src/` directory
5. **Await Phase 3** - UI Components coming soon!

---

**MOJO Framework v2.0.0 - Phase 1: Core Architecture & View System + Phase 2: Data Layer**

Built with ❤️ and modern JavaScript