# MOJO Framework - Phase 2 Basic Example

**Difficulty: Intermediate** | **Focus: Data Layer Fundamentals**

Interactive demonstration of MOJO Framework v2.0.0 Phase 2 data layer components including RestModel, DataList, and the Rest HTTP client.

## 🎯 What You'll Learn

This example provides hands-on experience with MOJO's Phase 2 data layer:

- **RestModel Usage** - Complete CRUD operations with validation
- **DataList Collections** - Managing collections with events and querying
- **Data Validation** - Client-side validation with custom rules
- **Event-Driven Updates** - Real-time UI updates via collection events
- **Change Tracking** - Monitoring model state and modifications
- **Error Handling** - Comprehensive error management and user feedback

## 🚀 Quick Start

### Option 1: Direct Browser
```bash
# Navigate to the example directory
cd web-mojo/examples/phase2-basic

# Open in browser (requires HTTP server)
python3 -m http.server 8080
# Visit: http://localhost:8080
```

### Option 2: From Examples Root
```bash
# From web-mojo/examples/
python3 -m http.server 8080
# Visit: http://localhost:8080/phase2-basic/
```

### Option 3: Development Server
```bash
# From web-mojo root
npm run dev
# Visit: http://localhost:3000/examples/phase2-basic/
```

## ✨ Features Demonstrated

### 1. RestModel CRUD Operations
- **Model Creation** - Create new User models with validation
- **Data Validation** - Real-time validation with custom rules
- **Change Tracking** - Monitor dirty state and modifications
- **Error Handling** - Display validation errors and API failures
- **JSON Serialization** - Export models to plain objects

### 2. DataList Collection Management
- **Collection Operations** - Add, remove, and reset operations
- **Advanced Querying** - Filter by attributes and custom functions
- **Search Functionality** - Search users by name or email
- **Sorting** - Sort by name, age, or custom comparators
- **Event System** - Listen to collection changes (add, remove, update)

### 3. Real-time UI Updates
- **Live Statistics** - Real-time counters for users, operations, events
- **Dynamic Table** - Auto-updating user table with collection changes
- **Activity Logging** - Comprehensive operation logging with timestamps
- **Interactive Controls** - Search, filter, and sort controls

### 4. Validation System
- **Required Fields** - Name and email validation
- **Format Validation** - Email pattern matching
- **Range Validation** - Age limits (13-120)
- **Custom Rules** - Function-based validation logic
- **Error Display** - Bootstrap form validation styling

## 🔧 Code Highlights

### RestModel Definition
```javascript
class User extends RestModel {
    static endpoint = '/api/users';
    
    static validations = {
        name: [
            { required: true, message: 'Name is required' },
            { minLength: 2, message: 'Name must be at least 2 characters' }
        ],
        email: [
            { required: true, message: 'Email is required' },
            { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email format' }
        ],
        age: [
            (value) => {
                if (value !== undefined && (value < 13 || value > 120)) {
                    return 'Age must be between 13 and 120';
                }
                return true;
            }
        ]
    };

    // Custom methods
    isActive() {
        return this.get('status') === 'active';
    }

    getDisplayName() {
        return `${this.get('name')} (${this.get('email')})`;
    }
}
```

### DataList Collection
```javascript
class Users extends DataList {
    constructor(options = {}) {
        super(User, {
            endpoint: '/api/users',
            ...options
        });
    }

    // Custom collection methods
    getActiveUsers() {
        return this.where(user => user.isActive());
    }

    searchByNameOrEmail(searchTerm) {
        const term = searchTerm.toLowerCase();
        return this.where(user => {
            const name = (user.get('name') || '').toLowerCase();
            const email = (user.get('email') || '').toLowerCase();
            return name.includes(term) || email.includes(term);
        });
    }
}
```

### Event-Driven Updates
```javascript
// Listen to collection events
this.users.on('add', (data) => {
    this.logActivity(`Added ${data.models.length} user(s) to collection`, 'success');
    this.updateDisplay();
    this.updateStats();
});

this.users.on('remove', (data) => {
    this.logActivity(`Removed ${data.models.length} user(s) from collection`, 'warning');
    this.updateDisplay();
    this.updateStats();
});

this.users.on('sort', () => {
    this.logActivity('Collection sorted', 'info');
    this.updateDisplay();
});
```

## 🎮 Interactive Features

### User Management
- **Create Users** - Fill out form and create new user models
- **Validate Data** - Test validation without saving
- **Real-time Feedback** - See validation errors as you type
- **Model Operations** - Edit and delete existing users

### Collection Operations
- **Search** - Find users by name or email
- **Filter** - Show only active or inactive users
- **Sort** - Sort by name (alphabetical) or age (numerical)
- **Clear All** - Reset the entire collection

### Monitoring & Debugging
- **Live Statistics** - Track total users, active users, operations, events
- **Activity Log** - Real-time logging of all operations
- **Event Tracking** - Monitor collection events as they fire
- **Console Integration** - Access demo instance via `window.demo`

## 📊 Technical Implementation

### Architecture Pattern
- **Model-View-Controller** - RestModel (Model), HTML/DOM (View), Demo class (Controller)
- **Observer Pattern** - Collection events drive UI updates
- **Validation Pattern** - Centralized validation rules with custom messages

### Performance Features
- **Event Batching** - Silent operations for bulk updates
- **DOM Optimization** - Efficient table updates and log management
- **Memory Management** - Proper cleanup and event listener management

### Error Handling
- **Validation Errors** - User-friendly form validation
- **Operation Errors** - Graceful error logging and recovery
- **Console Debugging** - Rich console output for development

## 🛠️ Development Tools

### Browser Console Access
```javascript
// Access the demo instance
window.demo

// Inspect the users collection
window.demo.users

// Get collection statistics
window.demo.users.length()
window.demo.users.getActiveUsers()

// Test model operations
const user = new User({ name: 'Test', email: 'test@example.com' });
user.validate()
window.demo.users.add(user)
```

### Debug Information
- **Model Inspection** - Examine model attributes and state
- **Collection Queries** - Test collection filtering and sorting
- **Event Monitoring** - Watch events fire in real-time
- **Validation Testing** - Test validation rules interactively

## 🎓 Learning Objectives

After completing this example, you should understand:

1. **RestModel Fundamentals**
   - Creating models with validation rules
   - CRUD operations and change tracking
   - Custom model methods and computed properties

2. **DataList Collections**
   - Adding, removing, and querying models
   - Event-driven programming with collections
   - Custom collection methods and filtering

3. **Data Validation**
   - Setting up validation rules
   - Handling validation errors
   - Custom validation functions

4. **Event-Driven Architecture**
   - Listening to collection events
   - Updating UI based on data changes
   - Building reactive applications

5. **Phase 2 Best Practices**
   - Model organization and structure
   - Collection management patterns
   - Error handling strategies

## 📚 Related Examples

- **Phase 1 Basic** - Foundation concepts and view system
- **Phase 1 Hierarchy** - Component relationships and communication
- **Phase 1 Events** - EventBus system and global communication
- **Phase 2 Advanced** - Coming soon with REST API integration

## 🔗 Next Steps

1. **Explore the Code** - Open browser dev tools and examine the implementation
2. **Try Modifications** - Add new validation rules or collection methods
3. **Test Edge Cases** - Try invalid data and see how errors are handled
4. **Review Console** - Use `window.demo` to interact with the data layer
5. **Build Your Own** - Create a similar application with different models

## 💡 Tips & Tricks

- **Validation Testing** - Use the "Validate" button to test rules without saving
- **Batch Operations** - Try adding multiple users to see event batching
- **Error Scenarios** - Enter invalid data to see comprehensive error handling
- **Console Debugging** - Use browser console to inspect models and collections
- **Event Monitoring** - Watch the activity log to understand event flow

## 🎯 Success Criteria

You'll know you understand Phase 2 when you can:

- ✅ Create models with custom validation rules
- ✅ Manage collections with add, remove, and query operations
- ✅ Implement event-driven UI updates
- ✅ Handle validation errors gracefully
- ✅ Build reactive applications with data layer components

---

**MOJO Framework v2.0.0 - Phase 2: Data Layer**  
*Building the foundation for data-driven applications* 🚀