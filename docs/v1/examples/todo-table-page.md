# TodoTablePage Example

## Overview

The TodoTablePage is a comprehensive example demonstrating the full capabilities of the MOJO Framework's TablePage component integrated with a REST API backend. It showcases real-world CRUD operations, advanced table features, and REST model integration.

## Features

### Core Functionality
- **Full CRUD Operations**: Create, Read, Update, and Delete todos via REST API
- **Real-time Data Loading**: Fetches data from the MOJO example API
- **Advanced Filtering**: Filter by type (task, bug, feature, ticket) and priority
- **Sorting**: Sort by any column (ID, type, description, priority, date)
- **Pagination**: Navigate through large datasets with configurable page sizes
- **Search**: Global search across todo descriptions

### Table Features
- **Multi-select**: Select multiple rows for bulk operations
- **Bulk Actions**: Perform actions on multiple todos at once
- **Custom Actions**: Mark complete, set priority for selected items
- **Export**: Export data as CSV, JSON, or Excel format
- **Refresh**: Manual refresh button to reload data
- **Row Actions**: Edit and delete buttons for each row
- **Empty State**: Helpful message when no data is available

### Visual Indicators
- **Type Badges**: Color-coded badges for different todo types
- **Priority Badges**: Visual priority indicators (high, medium, low)
- **Overdue Highlighting**: Red text and icons for overdue items
- **Status Indicators**: Record count and last updated time

## Implementation

### Model Structure

The TodoTablePage uses two model classes:

#### Todo Model
```javascript
class Todo extends RestModel {
    static endpoint = '/api/example/todo';
    static baseURL = 'http://0.0.0.0:8881';
    
    // Methods:
    - getStatusBadge()       // Returns HTML for type badge
    - getPriorityBadge()     // Returns HTML for priority badge
    - getFormattedDate()     // Formats date for display
    - isOverdue()            // Checks if todo is past due
    - validate()             // Validates todo data
    - save()                 // Saves with validation
    - clone()                // Creates a copy of the todo
}
```

#### TodoCollection
```javascript
class TodoCollection extends DataList {
    constructor(models = [], options = {})
    
    // Methods:
    - fetch(options)         // Fetches from REST API
    - getByKind(kind)        // Filter by type
    - getByPriority(priority) // Filter by priority
    - getOverdue()           // Get all overdue todos
    - search(searchTerm)     // Search descriptions
    - sortBy(field, order)   // Sort collection
    - getStats()             // Get collection statistics
}
```

### Column Configuration

The table displays the following columns:

| Column | Description | Features |
|--------|-------------|----------|
| Select | Checkbox for row selection | Multi-select support |
| ID | Todo identifier | Sortable |
| Type | Task/Bug/Feature/Ticket | Sortable, Filterable, Badge display |
| Description | Todo description | Sortable, Truncated display |
| Priority | High/Medium/Low | Sortable, Filterable, Badge display |
| Date | Due date | Sortable, Date range filter |
| Notes | Optional notes | Truncated with tooltip |
| Actions | Edit/Delete buttons | Row-level actions |

### Form Dialog

The add/edit dialog includes:
- **Description** (required, textarea)
- **Type** (required, select dropdown)
- **Priority** (select dropdown, defaults to medium)
- **Due Date** (date picker)
- **Status** (pending/in-progress/completed)
- **Notes** (optional text field)

## Usage

### Basic Setup

```javascript
import TodoTablePage from './pages/todos/TodoTablePage.js';

// Register with router
router.addRoute('todos', TodoTablePage);

// Or create directly
const todoPage = new TodoTablePage();
await todoPage.render('#container');
```

### URL Parameters

The table automatically syncs with URL parameters:

```
?page=todos&p=2&size=25&sort=priority&order=desc&kind=bug
```

- `p` - Current page number
- `size` - Items per page
- `sort` - Sort field
- `order` - Sort order (asc/desc)
- `kind` - Filter by type
- `priority` - Filter by priority
- `search` - Search term

### Event Handling

The TodoTablePage emits and handles these events:

```javascript
// Table events
'table:add'        // Add button clicked
'table:edit'       // Edit action triggered
'table:delete'     // Delete action triggered
'table:refresh'    // Refresh button clicked
'table:export'     // Export action triggered
'table:bulk-action' // Bulk action selected

// Custom actions
'action:mark-complete' // Mark todos as complete
'action:set-priority'  // Set priority for selected items
```

### Customization

#### Adding Custom Bulk Actions

```javascript
tableOptions: {
    customActions: [
        {
            id: 'assign-user',
            label: 'Assign',
            icon: 'bi-person',
            class: 'btn-info',
            bulk: true,
            handler: 'assignUser'
        }
    ]
}
```

#### Custom Column Formatters

```javascript
columns: [
    {
        key: 'status',
        label: 'Status',
        formatter: (value, item) => {
            const color = value === 'completed' ? 'success' : 'warning';
            return `<span class="badge bg-${color}">${value}</span>`;
        }
    }
]
```

#### Export Formats

The table supports three export formats:
1. **CSV** - Comma-separated values for Excel
2. **JSON** - Structured JSON with all data
3. **Excel** - CSV format that opens in Excel

### API Integration

The TodoTablePage connects to the MOJO example API:

```
Base URL: http://0.0.0.0:8881
Endpoint: /api/example/todo
```

#### API Endpoints Used

- `GET /api/example/todo` - List todos with pagination
- `POST /api/example/todo` - Create new todo
- `PUT /api/example/todo/:id` - Update existing todo
- `DELETE /api/example/todo/:id` - Delete todo

#### Request Parameters

```javascript
{
    size: 25,        // Items per page
    start: 0,        // Starting index
    sort: 'date',    // Sort field
    order: 'asc',    // Sort order
    search: 'bug',   // Search term
    kind: 'task',    // Filter by type
    priority: 'high' // Filter by priority
}
```

## Advanced Features

### Bulk Operations

Select multiple rows and perform operations:

```javascript
async markComplete(items) {
    for (const item of items) {
        const todo = new Todo(item);
        todo.set('status', 'completed');
        await todo.save();
    }
    await this.loadData();
}
```

### Custom Validation

The Todo model includes validation:

```javascript
validate() {
    const errors = {};
    
    if (!this.get('description')) {
        errors.description = 'Description is required';
    }
    
    if (!['task', 'bug', 'feature', 'ticket'].includes(this.get('kind'))) {
        errors.kind = 'Invalid type';
    }
    
    return Object.keys(errors).length > 0 ? errors : null;
}
```

### Status Bar

The status bar shows:
- Total record count
- Last updated timestamp
- Error messages (if any)

### Empty State

When no todos exist, displays:
- Friendly empty message
- Icon indicator
- Call-to-action button

## Styling

The TodoTablePage uses Bootstrap 5 classes and includes:
- Responsive table layout
- Mobile-friendly actions
- Color-coded badges
- Loading states
- Error indicators

### Custom CSS Classes

```css
.todo-description {
    max-width: 300px;
    overflow: hidden;
    text-overflow: ellipsis;
}

.table-status-bar {
    border-top: 1px solid #dee2e6;
    padding-top: 0.75rem;
}

.error-indicator {
    animation: pulse 2s ease-in-out infinite;
}
```

## Error Handling

The component includes comprehensive error handling:

```javascript
try {
    await this.collection.fetch();
} catch (error) {
    this.showError('Failed to load todos: ' + error.message);
}
```

Error states are displayed:
- In the status bar
- As toast notifications
- In the console for debugging

## Performance Considerations

- **Pagination**: Loads only visible items
- **Debounced Search**: Prevents excessive API calls
- **Optimistic Updates**: UI updates before API confirmation
- **Batch Operations**: Groups multiple operations

## Testing the Example

1. Start the MOJO example API server
2. Navigate to the Todos page in the examples app
3. Try these operations:
   - Add a new todo
   - Edit an existing todo
   - Delete single or multiple todos
   - Sort by different columns
   - Filter by type or priority
   - Search for specific todos
   - Export the data
   - Use bulk actions

## Best Practices Demonstrated

1. **Model Separation**: Todo logic in model, UI in page
2. **Collection Management**: Using DataList for multiple items
3. **REST Integration**: Proper API endpoint configuration
4. **Event Handling**: Clean event-driven architecture
5. **Error Management**: User-friendly error messages
6. **Loading States**: Visual feedback during operations
7. **Validation**: Client-side validation before API calls
8. **Accessibility**: Proper ARIA labels and keyboard navigation
9. **Responsive Design**: Works on all screen sizes
10. **URL State**: Bookmarkable table states

## Summary

The TodoTablePage example demonstrates a production-ready implementation of a data table with full CRUD operations, REST API integration, and advanced features like filtering, sorting, pagination, and bulk operations. It serves as a comprehensive reference for building data-driven interfaces with the MOJO Framework.