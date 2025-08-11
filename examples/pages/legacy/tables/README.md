# Table Components Guide

This directory contains both **TablePage implementations** (following the framework's design patterns) and **demo pages** (showcasing table features). It's important to understand the difference.

## 📁 Directory Structure

```
tables/
├── README.md                    # This file
├── TableExamplesPage.js        # ❌ Demo page (NOT a TablePage)
├── UsersTablePage.js           # ✅ Proper TablePage implementation
└── ProductsTablePage.js        # ✅ Proper TablePage implementation
```

## 🎯 Understanding the Difference

### TablePage Pattern (Correct)
A **TablePage** is a specialized page component that manages **ONE** table/collection with complete CRUD operations. It follows the framework's design pattern and extends the `TablePage` class.

**Characteristics:**
- Manages a **single** collection/table
- Has a defined model and collection
- Includes CRUD operations (Create, Read, Update, Delete)
- Handles specific business logic for that data type
- Uses proper event handlers (`on_item_clicked`, `on_action_*`)

### Demo/Showcase Pages (Different Purpose)
Demo pages like `TableExamplesPage` are for **showcasing features** with multiple examples. They don't follow the TablePage pattern.

**Characteristics:**
- Shows multiple tables on one page
- Demonstrates various table features
- Used for documentation/examples
- Not for production use

## ✅ Proper TablePage Implementation

Here's the correct pattern for implementing a TablePage:

```javascript
import TablePage from '../../../src/components/TablePage.js';
import RestModel from '../../../src/core/RestModel.js';
import DataList from '../../../src/core/DataList.js';

// 1. Define your Model
class UserModel extends RestModel {
    constructor(attributes = {}) {
        super(attributes);
        this.endpoint = '/api/users';
    }
    
    // Add computed properties
    get fullName() {
        return `${this.get('firstName')} ${this.get('lastName')}`;
    }
}

// 2. Define your Collection
class UsersCollection extends DataList {
    constructor(options = {}) {
        super({
            ...options,
            ModelClass: UserModel,
            endpoint: '/api/users'
        });
    }
}

// 3. Create the TablePage
export default class UsersTablePage extends TablePage {
    constructor(options = {}) {
        super({
            ...options,
            page_name: 'users',
            title: 'User Management',
            
            // ONE Collection
            Collection: UsersCollection,
            
            // Column definitions for THIS table
            columns: [
                { field: 'id', label: 'ID', sortable: true },
                { field: 'firstName', label: 'First Name', sortable: true },
                { field: 'lastName', label: 'Last Name', sortable: true },
                { field: 'email', label: 'Email', sortable: true },
                // ... more columns
            ],
            
            // Filters for THIS collection
            filters: {
                status: 'active'
            },
            
            // Table-specific options
            list_options: {
                selectable: true,
                showSearch: true,
                showPagination: true
            }
        });
    }
    
    // Handle item interactions
    async on_item_clicked(model, event) {
        // View details
    }
    
    async on_item_dlg(model, event) {
        // Edit item
    }
    
    // Handle actions
    async on_action_edit(model) {
        // Edit logic
    }
    
    async on_action_delete(model) {
        // Delete logic
    }
}
```

## ❌ What NOT to Do

Don't create a TablePage with multiple tables:

```javascript
// ❌ WRONG - This is not a TablePage pattern
class TablesPage extends Page {
    async onAfterRender() {
        // Creating multiple tables in one page
        this.basicTable = new Table({...});
        this.sortableTable = new Table({...});
        this.filterTable = new Table({...});
        
        // This is a demo/showcase page, not a TablePage
    }
}
```

## 📋 Key Principles

1. **One Table, One Page**: Each TablePage manages exactly ONE collection/table
2. **Complete CRUD**: Implement all CRUD operations for that specific data type
3. **Business Logic**: Include business logic specific to that data (e.g., user validation, inventory calculations)
4. **Proper Naming**: Use descriptive names like `UsersTablePage`, `ProductsTablePage`, `OrdersTablePage`
5. **Model & Collection**: Always define proper Model and Collection classes

## 🎯 When to Use What

### Use TablePage When:
- Managing a specific data type (users, products, orders)
- Need CRUD operations
- Building production pages
- Implementing business logic

### Use Demo Pages When:
- Showcasing table features
- Creating documentation examples
- Building component galleries
- Teaching/demonstrating capabilities

## 📚 Examples in This Directory

### Proper TablePage Implementations

#### UsersTablePage.js
- Manages user data
- Full CRUD operations
- User-specific features (roles, status, last login)
- Bulk operations (activate, deactivate, delete)

#### ProductsTablePage.js
- Manages product inventory
- Stock management features
- Inventory reporting
- Product-specific operations (adjust stock, price updates)

### Demo/Showcase Pages

#### TableExamplesPage.js
- Shows multiple table examples
- Demonstrates sorting, filtering, pagination
- Not for production use
- Educational/documentation purpose

## 🚀 Creating Your Own TablePage

1. **Copy a template**: Start with `UsersTablePage.js` or `ProductsTablePage.js`
2. **Define your model**: Create a RestModel for your data
3. **Define your collection**: Create a DataList for your collection
4. **Configure columns**: Set up columns specific to your data
5. **Implement actions**: Add CRUD operations and business logic
6. **Add to router**: Register your page in the application router

## 📖 Further Reading

- [TablePage API Documentation](../../../docs/api/TablePage.md)
- [RestModel Guide](../../../docs/guides/RestModel.md)
- [DataList Guide](../../../docs/guides/DataList.md)
- [Table Component Reference](../../../docs/components/Table.md)

## 💡 Tips

1. **Always extend TablePage** for data management pages
2. **Keep it focused**: One table = one data type = one purpose
3. **Use sample data**: Load sample data when no API is available
4. **Handle errors**: Always include error handling in CRUD operations
5. **Provide feedback**: Use toast notifications for user actions

---

Remember: **TablePage** is for managing data, **Demo pages** are for showing capabilities. Don't mix the patterns!