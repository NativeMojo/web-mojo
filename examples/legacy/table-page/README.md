# TablePage Example

This example demonstrates the MOJO TablePage component, which provides a complete table solution with automatic URL parameter synchronization for pagination, sorting, and filtering.

## Features

### Core Functionality
- **URL Synchronization**: All table state (page, sort, filters) is automatically synced with URL parameters
- **Pagination**: Navigate through pages with URL persistence
- **Sorting**: Click column headers to sort data
- **Filtering**: Apply filters that update the URL
- **Search**: Global search with debounced URL updates
- **Selection**: Select rows with checkbox support
- **Responsive**: Mobile-friendly table design

### URL Parameters

The TablePage automatically manages these URL parameters:

- `page` - Current page number (e.g., `?page=2`)
- `sort` - Sort field with optional `-` prefix for descending (e.g., `?sort=name` for ascending, `?sort=-name` for descending)
- `search` - Search query (e.g., `?search=john`)
- `per_page` - Items per page (e.g., `?per_page=25`)
- `filter_*` - Filter values (e.g., `?filter_status=active&filter_category=tech`)

### Example URLs

```
# Default view
http://localhost:3000/examples/table-page/

# Page 2 with 25 items per page
http://localhost:3000/examples/table-page/?page=2&per_page=25

# Sorted by name descending
http://localhost:3000/examples/table-page/?sort=-name

# Filtered by status and category
http://localhost:3000/examples/table-page/?filter_status=Active&filter_category=Technology

# Combined: page 3, sorted by amount descending, filtered by priority
http://localhost:3000/examples/table-page/?page=3&sort=-amount&filter_priority=High

# With search
http://localhost:3000/examples/table-page/?search=user&page=1
```

## Usage

### Basic TablePage Setup

```javascript
import TablePage from '../../src/components/TablePage.js';

class MyTablePage extends TablePage {
    constructor(options = {}) {
        super({
            page_name: 'MyTable',
            route: '/my-table',
            title: 'My Data Table',
            
            // Data source (collection or mock data)
            collection: myDataCollection,
            
            // Column definitions
            columns: [
                {
                    key: 'id',
                    label: 'ID',
                    sortable: true
                },
                {
                    key: 'name',
                    label: 'Name',
                    sortable: true,
                    searchable: true
                },
                {
                    key: 'status',
                    label: 'Status',
                    sortable: true,
                    filterable: true,
                    formatter: (value) => `<span class="badge">${value}</span>`
                }
            ],
            
            // Filter definitions
            filters: {
                status: {
                    type: 'select',
                    label: 'Status',
                    options: [
                        { value: '', label: 'All' },
                        { value: 'active', label: 'Active' },
                        { value: 'inactive', label: 'Inactive' }
                    ]
                }
            },
            
            // Table options
            tableOptions: {
                selectable: true,
                searchable: true,
                sortable: true,
                filterable: true,
                paginated: true
            },
            
            // URL options
            urlOptions: {
                updateUrl: true,        // Enable URL updates
                replaceState: false,    // Use pushState vs replaceState
                debounceDelay: 300      // Debounce delay for search
            },
            
            ...options
        });
    }
}
```

### Column Configuration

```javascript
const columns = [
    {
        key: 'field_name',           // Data field key
        label: 'Display Name',        // Column header text
        sortable: true,               // Enable sorting
        searchable: true,             // Include in search
        filterable: true,             // Enable filtering
        width: '100px',               // Optional width
        className: 'text-center',     // Optional CSS class
        formatter: (value, row) => {  // Optional formatter
            return `<strong>${value}</strong>`;
        }
    }
];
```

### Filter Configuration

```javascript
const filters = {
    status: {
        type: 'select',              // Filter type: 'select', 'text', 'date', etc.
        label: 'Status',             // Display label
        options: [                   // Options for select type
            { value: '', label: 'All' },
            { value: 'active', label: 'Active' }
        ]
    },
    date_range: {
        type: 'daterange',
        label: 'Date Range',
        format: 'YYYY-MM-DD'
    }
};
```

### Customizing the Template

```javascript
class CustomTablePage extends TablePage {
    get template() {
        return `
            <div class="container">
                <h1>{{title}}</h1>
                <p>{{description}}</p>
                
                <!-- Custom content above table -->
                <div class="my-custom-controls">
                    <button class="btn btn-primary">Custom Action</button>
                </div>
                
                <!-- Table container (required) -->
                <div id="{{tableContainerId}}"></div>
                
                <!-- Custom content below table -->
                <div class="my-custom-footer">
                    Custom footer content
                </div>
            </div>
        `;
    }
}
```

### Handling Table Events

```javascript
class MyTablePage extends TablePage {
    async onAfterRender() {
        await super.onAfterRender();
        
        // Listen to table events
        this.table.on('selection:change', () => {
            const selected = this.getSelectedItems();
            console.log('Selected items:', selected);
        });
        
        this.table.on('row:click', (event) => {
            console.log('Row clicked:', event.detail);
        });
    }
}
```

### Working with REST APIs

```javascript
// Create a REST-enabled collection
const collection = new DataList({
    url: '/api/users',
    restEnabled: true
});

// Use it in TablePage
const tablePage = new TablePage({
    collection: collection,
    columns: [...],
    // The table will automatically fetch data with proper parameters
});
```

### URL Parameter Options

```javascript
const tablePage = new TablePage({
    // Customize URL parameter names
    urlOptions: {
        pageParam: 'p',           // Use ?p=2 instead of ?page=2
        sortParam: 's',           // Use ?s=name instead of ?sort=name (use ?s=-name for descending)
        searchParam: 'q',         // Use ?q=search instead of ?search=search
        perPageParam: 'limit',    // Use ?limit=10 instead of ?per_page=10
        filterPrefix: 'f_',       // Use ?f_status=active instead of ?filter_status=active
        updateUrl: true,          // Enable/disable URL updates
        replaceState: false,      // Use replaceState instead of pushState
        debounceDelay: 500        // Debounce delay for search (ms)
    }
});
```

## Public Methods

```javascript
// Get the table page instance
const tablePage = new MyTablePage();

// Refresh table data
await tablePage.refreshTable();

// Get selected items
const selected = tablePage.getSelectedItems();

// Clear selection
tablePage.clearSelection();

// Access the underlying table instance
const table = tablePage.table;

// Manually update URL (usually automatic)
tablePage.updateUrl({ 
    page: 2, 
    sort: 'name', 
    dir: 'desc'  // Will be converted to sort: '-name' in the URL
});
```

## Browser Back/Forward Support

The TablePage fully supports browser navigation:
- Use browser back/forward buttons to navigate through table states
- Bookmarkable URLs preserve complete table state
- Share URLs with specific filters, sorting, and pagination

## Performance Features

- **Debounced Search**: Search input is debounced to prevent excessive URL updates
- **Smart Rendering**: Only visible data is rendered
- **Event Delegation**: Efficient event handling for large datasets
- **URL State Management**: Minimal history entries with smart state merging

## Styling

The example includes comprehensive CSS styling that covers:
- Responsive table layout
- Sort indicators
- Filter pills
- Loading states
- Selection highlights
- Mobile optimizations
- Print styles

## Running the Example

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to:
   ```
   http://localhost:3000/examples/table-page/
   ```

3. Try these interactions:
   - Change pages using pagination
   - Click column headers to sort
   - Use the search box
   - Apply filters
   - Select rows
   - Change items per page
   - Use browser back/forward buttons

## Integration with Router

The TablePage works seamlessly with MOJO's router:

```javascript
// Register with router
const router = new Router({
    mode: 'param',
    container: '#app'
});

const tablePage = new DataTablePage();
router.addRoute('/users', tablePage);

// Navigate to table with preset filters
router.navigate('/users', {
    params: {
        page: 2,
        filter_status: 'active'
    }
});
```

## Best Practices

1. **Keep columns lean**: Only include necessary columns for performance
2. **Use formatters wisely**: Complex formatters can impact rendering speed
3. **Implement server-side operations**: For large datasets, use REST-enabled collections
4. **Customize URL parameters**: Use shorter param names for cleaner URLs
5. **Handle errors gracefully**: Implement error handlers for data fetching
6. **Optimize for mobile**: Test responsive behavior on various devices

## Troubleshooting

### Table not updating with URL changes
- Ensure `updateUrl: true` is set in urlOptions
- Check that the router is properly initialized
- Verify query parameters are correctly formatted

### Filters not working
- Confirm filter keys match data field names
- Check filter configuration in columns definition
- Ensure filterable: true is set for filtered columns

### Performance issues with large datasets
- Enable REST mode for server-side pagination
- Reduce the number of visible columns
- Implement virtual scrolling for very large lists
- Use simpler formatters or defer formatting

## License

This example is part of the MOJO Framework and is released under the MIT License.