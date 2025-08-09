# Hello World - MOJO Framework

**Difficulty: Beginner** | **Focus: Core Concepts** | **Time: 15 minutes**

Your very first MOJO Framework application! Learn the fundamentals of component-based development with this interactive introduction.

## 🎯 What You'll Learn

This example introduces you to the core concepts of MOJO Framework:

- **View Components** - Creating your first MOJO component
- **Template Rendering** - Using Mustache.js for dynamic content
- **Data Binding** - Connecting data to your templates
- **Action Handlers** - Responding to user interactions
- **Component Lifecycle** - Understanding initialization and mounting
- **Real-time Updates** - Updating the UI when data changes

## 🚀 Quick Start

### Option 1: Development Server (Recommended)
```bash
# From project root
npm run dev
# Visit: http://localhost:3000/examples/01-hello-world/
```

### Option 2: Static Server
```bash
# From examples directory
cd web-mojo/examples/01-hello-world
python3 -m http.server 8080
# Visit: http://localhost:8080
```

## ✨ Interactive Features

### 🎲 Change Greeting
- Click "Change Greeting" to cycle through different languages
- Watch the template automatically update with new data
- See the greeting counter increment in real-time

### ⏰ Show Time
- Display the current date and time
- Demonstrates conditional template rendering
- Shows how to update data from user actions

### 🎉 Celebrate Success
- Interactive celebration with visual feedback
- Button animation effects
- Success counter tracking

### 📊 Real-time Statistics
- **Button Clicks** - Total interaction count
- **Greetings** - Number of greeting changes
- **Celebrations** - Success celebration count

## 🏗️ Code Structure

### Component Definition
```javascript
class HelloWorldView extends View {
    constructor(options = {}) {
        super({
            template: `<div>{{greeting}}</div>`,  // Mustache template
            data: { greeting: 'Hello, MOJO!' },   // Template data
            className: 'hello-world-container',   // CSS class
            ...options
        });
    }
}
```

### Template with Data Binding
```html
<!-- Mustache.js template syntax -->
<h1>{{greeting}}</h1>
<p>{{message}}</p>
<div class="h5">{{clickCount}}</div>

<!-- Conditional rendering -->
{{#currentTime}}
<div class="alert alert-info">
    Current time: <strong>{{currentTime}}</strong>
</div>
{{/currentTime}}
```

### Action Handlers
```javascript
// Method naming: onAction + ActionName
async onActionChangeGreeting(event, element) {
    // Update component data
    this.updateData({
        greeting: 'New greeting!',
        clickCount: this.getData().clickCount + 1
    });
    
    // Show user feedback
    this.showSuccess('Greeting updated!');
}
```

### Lifecycle Methods
```javascript
// Called after template is rendered
async onAfterRender() {
    console.log('Component rendered!');
}

// Called after component is mounted to DOM
async onAfterMount() {
    console.log('Component mounted!');
    // Perfect place for initialization
}
```

## 🎓 Key Concepts Explained

### 1. **View Component**
MOJO's fundamental building block for UI components:

```javascript
class HelloWorldView extends View {
    constructor(options = {}) {
        super({
            template: '...',    // HTML template with data placeholders
            data: {...},        // Data object for template binding
            className: '...',   // CSS class for the component
            ...options          // Additional options
        });
    }
}
```

**Key Features:**
- Extends the base `View` class
- Automatic template rendering with Mustache.js
- Built-in data binding and updates
- Lifecycle methods for component management

### 2. **Template System**
Uses Mustache.js for clean, logic-less templates:

```html
<!-- Variable interpolation -->
<h1>{{title}}</h1>

<!-- Conditional rendering -->
{{#showMessage}}
<p>{{message}}</p>
{{/showMessage}}

<!-- Lists/arrays -->
{{#items}}
<li>{{name}}</li>
{{/items}}
```

**Benefits:**
- Clean separation of logic and presentation
- Automatic HTML escaping for security
- Familiar syntax similar to other template engines

### 3. **Action System**
Handle user interactions with data-action attributes:

```html
<!-- In template -->
<button data-action="doSomething">Click Me</button>

<!-- In component -->
async onActionDoSomething(event, element) {
    // Handle the click
}
```

**Naming Convention:**
- Template: `data-action="actionName"`
- Method: `onActionActionName(event, element)`

### 4. **Data Updates**
Real-time UI updates when data changes:

```javascript
// Update data - automatically re-renders template
this.updateData({ 
    count: this.getData().count + 1 
});

// Get current data
const currentData = this.getData();
```

**Features:**
- Automatic template re-rendering
- Efficient DOM updates
- Maintains component state

### 5. **Component Lifecycle**
Hooks for different stages of component life:

```javascript
async onInit() {}           // After construction
async onBeforeRender() {}   // Before template render
async onAfterRender() {}    // After template render
async onBeforeMount() {}    // Before DOM insertion
async onAfterMount() {}     // After DOM insertion
async onBeforeDestroy() {}  // Before cleanup
```

**Common Usage:**
- `onAfterMount()` - DOM manipulation, event listeners
- `onBeforeDestroy()` - Cleanup, remove listeners

## 🔍 Behind the Scenes

### Application Structure
```javascript
class HelloWorldApp {
    async initialize() {
        // 1. Create the component
        this.view = new HelloWorldView();
        
        // 2. Render into container
        await this.view.render('#app');
    }
}
```

### Rendering Process
1. **Component Creation** - Constructor runs, template prepared
2. **Template Rendering** - Mustache processes template with data
3. **DOM Insertion** - Rendered HTML inserted into container
4. **Event Binding** - Action handlers automatically attached
5. **Lifecycle Completion** - `onAfterMount()` called

## 🛠️ Development Tools

### Browser Console Access
```javascript
// Access the component instance
window.helloWorldApp

// Inspect component data
window.helloWorldApp.getData()

// Update data programmatically
window.helloWorldApp.updateData({ greeting: 'Console Hello!' })
```

### Debug Information
- Open browser dev tools to see console output
- Watch DOM changes as you interact with buttons
- Inspect component properties and methods
- Monitor data updates in real-time

## 💡 Try These Experiments

### 1. **Modify Greetings**
Add your own greetings to the array:

```javascript
this.greetings = [
    { greeting: 'Your Custom Greeting!', message: 'Your custom message.' },
    // ... existing greetings
];
```

### 2. **Add New Actions**
Create a new button and action handler:

```html
<!-- In template -->
<button data-action="myCustomAction">My Button</button>
```

```javascript
// In component
async onActionMyCustomAction(event, element) {
    this.showSuccess('My custom action worked!');
}
```

### 3. **Customize Styling**
Add CSS classes and Bootstrap utilities:

```html
<div class="my-custom-class bg-primary text-white p-3 rounded">
    Custom styled content
</div>
```

## 🎯 Success Criteria

You understand MOJO basics when you can:

- ✅ Create a View component with template and data
- ✅ Use Mustache.js template syntax for data binding
- ✅ Handle user interactions with action methods
- ✅ Update component data and see UI changes
- ✅ Use lifecycle methods for initialization
- ✅ Debug components using browser dev tools

## 🔗 Next Steps

Ready for more? Try these examples:

### **Continue Learning Path:**
1. **[Basic Navigation](../basic-nav/)** - Learn routing and page navigation
2. **[Basic Components](../basic/)** - Explore more component features
3. **[Component Hierarchy](../hierarchy/)** - Parent-child relationships

### **Jump to Advanced:**
- **[Phase 2 Basic](../phase2-basic/)** - Data layer with RestModel
- **[Complete Demo](../complete-demo/)** - Full application example

## 🐛 Troubleshooting

### **Component Not Rendering**
- Check browser console for JavaScript errors
- Ensure all imports are correct
- Verify template syntax is valid Mustache.js

### **Actions Not Working**
- Confirm action method names match: `data-action="test"` → `onActionTest()`
- Check for typos in data-action attributes
- Ensure methods are async: `async onActionTest()`

### **Template Not Updating**
- Use `updateData()` method, not direct data modification
- Check template syntax for typos
- Verify data property names match template variables

### **Dev Server Issues**
```bash
# Kill any running processes
pkill -f vite

# Restart development server
npm run dev
```

## 📚 Related Documentation

- **[View Component API](../../docs/components/View.md)** - Complete View class reference
- **[Template System](../../docs/user-guide/templates.md)** - Mustache.js guide
- **[Action System](../../docs/user-guide/actions.md)** - User interaction patterns
- **[Bootstrap Integration](../../docs/user-guide/bootstrap.md)** - UI framework usage

## 🎊 Congratulations!

You've completed your first MOJO Framework application! You now understand:

- **Component-based architecture** with View classes
- **Template rendering** with data binding
- **User interaction** handling with actions
- **Real-time updates** with data changes
- **Component lifecycle** management

**Keep going!** The next examples will build on these concepts to create more sophisticated applications.

---

**MOJO Framework v2.0.0** - *Hello World Example* 👋

*Ready to build something amazing? Let's keep learning!*