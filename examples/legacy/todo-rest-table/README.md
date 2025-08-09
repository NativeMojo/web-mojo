# TODO REST Table Example with TablePage

This example demonstrates the MOJO framework's `TablePage` component with REST API integration, showcasing advanced table features including URL parameter synchronization, server-side pagination, sorting, and filtering.

## Overview

The TODO REST Table example shows how to:
- Use the `TablePage` component for automatic URL parameter management
- Integrate with a REST API for server-side data operations
- Handle custom API parameter mapping (size/start vs per_page/page)
- Implement custom column renderers for rich data display
- Add filter dropdowns for categorical data
- Maintain table state in URL for bookmarkability and sharing

## Running the Example

1. **Start the REST API server** (required for data):
   ```bash
   # From the web-mojo directory
   npm run api
   ```
   The API server will start on `http://0.0.0.0:8881`

2. **Start the development server**:
   ```bash
   # From the web-mojo directory
   npm run dev
   ```

3. **Open the example**:
   Navigate to: `http://localhost:3000/examples/todo-rest-table/`

## Features

### TablePage Component
- Extends MOJO's `Page` class with built-in table management
- Automatically syncs table state with URL parameters
- Handles pagination, sorting, and filtering events
- Provides lifecycle hooks for customization

### URL Parameter Synchronization
The table state is automatically reflected in the URL:

- **Pagination**: `?page=2&per_page=20`
- **Sorting**: `?sort=name` (ascending) or `?sort=-name` (descending)
- **Search**: `?search=bug`
- **Filters**: `?filter_kind=task`
- **Combined**: `?page=2&sort=-id&search=fix&filter_kind=bug`

### REST API Integration
- Custom `TodoCollection` extends `DataList` with REST support
- Handles API-specific parameter mapping:
  - Standard: `page=2&per_page=10`
  - API expects: `start=10&size=10`
- Automatic data fetching on state changes
- Loading states and error handling

### Custom Renderers
- Status badges with color coding
- Truncated descriptions with ellipsis
- Note previews
- Rich HTML content in cells

## Implementation Structure

### Models and Collections

```javascript
// TODO Model with custom methods
class Todo extends RestModel {
  static endpoint = '/api/example/todo';
  
  getStatusBadge() {
    // Returns HTML badge based on kind
  }
  
  getShortDescription() {
    // Returns truncated description
  }
}

// Collection with API parameter mapping
class TodoCollection extends DataList {
  async fetch(options = {}) {
    // Converts standard pagination to API format
    // Handles size/start parameters
  }
}
```

### TablePage Configuration

```javascript
class TodosTablePage extends TablePage {
  constructor() {
    super({
      // Page configuration
      page_name: 'todos',
      title: 'TODO Items',
      
      // Table configuration
      Collection: TodoCollection,
      columns: [...],
      
      // Features
      searchable: true,
      sortable: true,
      filterable: true,
      paginated: true,
      
      // URL sync
      updateUrl: true,
      debounceDelay: 300
    });
  }
}
```

## URL Parameter Examples

### Basic Navigation
- First page: `/examples/todo-rest-table/`
- Page 2: `/examples/todo-rest-table/?page=2`
- 20 items per page: `/examples/todo-rest-table/?per_page=20`

### Sorting
- Sort by name (ascending): `?sort=name`
- Sort by name (descending): `?sort=-name`
- Sort by ID (descending): `?sort=-id`

### Filtering
- Search all fields: `?search=bug`
- Filter by type: `?filter_kind=task`
- Multiple filters: `?filter_kind=bug&search=fix`

### Combined Operations
- Page 2, sorted by name, filtered by bugs:
  `?page=2&sort=name&filter_kind=bug`
- Search "fix", 20 per page, sorted by ID:
  `?search=fix&per_page=20&sort=-id`

## API Endpoints

The example uses the following REST API endpoints:

- **Base URL**: `http://0.0.0.0:8881/api/example/todo`
- **List TODOs**: `GET /api/example/todo?size=10&start=0`
- **Sort**: `GET /api/example/todo?sort=-name`
- **Search**: `GET /api/example/todo?q=searchterm`
- **Filter**: `GET /api/example/todo?kind=bug`

### API Response Format

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": 1,
        "name": "Fix login bug",
        "kind": "bug",
        "description": "Users cannot login with special characters",
        "note": {
          "name": "Security patch required"
        }
      }
    ],
    "count": 150,
    "start": 0,
    "size": 10
  }
}
```

## Key Components

### TablePage Lifecycle

1. **Initialization**: TablePage creates Table instance
2. **URL Parsing**: Extracts parameters from URL
3. **State Application**: Applies state to table
4. **Data Fetching**: Table fetches data from REST API
5. **Rendering**: Table renders with data
6. **Event Binding**: Listens for user interactions
7. **URL Updates**: Updates URL on state changes

### Event Flow

```
User Action → Table Event → TablePage Handler → URL Update → Table Re-render
```

Example:
1. User clicks column header to sort
2. Table dispatches `sort:change` event
3. TablePage updates URL with sort parameter
4. Table fetches sorted data from API
5. Table re-renders with new data

## Customization Points

### Custom Template
Override `getTemplate()` to customize the page layout:

```javascript
async getTemplate() {
  return `
    <div class="custom-layout">
      <!-- Custom header -->
      <div id="{{tableContainerId}}"></div>
      <!-- Custom footer -->
    </div>
  `;
}
```

### Custom View Data
Override `getViewData()` to add template variables:

```javascript
async getViewData() {
  const baseData = await super.getViewData();
  return {
    ...baseData,
    customValue: 'My Value'
  };
}
```

### Event Handlers
Add custom event handlers in `onAfterRender()`:

```javascript
async onAfterRender() {
  await super.onAfterRender();
  
  // Custom button handler
  this.element.querySelector('#custom-btn')
    ?.addEventListener('click', () => {
      // Custom logic
    });
}
```

## Debugging

Enable debug logging to see data flow:

1. Open browser console
2. Look for messages prefixed with `🔍 [DEBUG]`
3. Monitor:
   - Collection fetch calls
   - API responses
   - State changes
   - Event dispatches

## Browser Compatibility

- Modern browsers with ES6+ support
- Chrome 60+, Firefox 60+, Safari 12+, Edge 79+
- Requires JavaScript enabled
- Bootstrap 5.3+ for styling

## Related Examples

- `/examples/table-basic/` - Basic table without REST
- `/examples/table-page/` - TablePage with local data
- `/examples/todo-rest/` - REST API without TablePage
- `/examples/router-pages/` - Routing with multiple pages

## Notes

- The REST API must be running for data to load
- URL parameters are preserved during navigation
- Table state persists through browser back/forward
- Search is debounced (300ms) to reduce API calls
- Filters trigger immediate API requests