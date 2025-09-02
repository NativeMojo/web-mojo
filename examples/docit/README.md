# DocIt Documentation Portal

A clean, modern documentation portal built with the MOJO framework. DocIt provides an intuitive interface for browsing and managing documentation with support for both single-book and multi-book modes.

## Features

- 📚 **Multi-Book Support** - Manage multiple documentation books in one portal
- 📖 **Single-Book Mode** - Lock to a specific book for focused documentation
- 🔍 **Search Integration** - Search across books and pages
- ✏️ **Markdown Editing** - Built-in markdown editor with live preview (TOAST UI Editor coming soon)
- 🎨 **Clean Design** - Modern, responsive interface optimized for readability
- 🔐 **Permission System** - Control who can edit documentation
- 📱 **Mobile Friendly** - Responsive design works on all devices

## Quick Start

### Basic Setup

```javascript
import DocItApp from '../../src/docit/DocItApp.js';

// Simplest setup - auto-detects configuration
const app = new DocItApp({
    container: '#app'
});

await app.start();
```

### Multi-Book Mode (Documentation Portal)

```javascript
const app = new DocItApp({
    container: '#app',
    title: 'Documentation Portal',
    showBookNav: true,  // Show book navigation
    
    api: {
        baseURL: 'http://localhost:8000'
    },
    
    sidebar: {
        showSearch: true,
        defaultCollapsed: false
    }
});

await app.start();
```

### Single-Book Mode (Focused Documentation)

```javascript
const app = new DocItApp({
    container: '#app',
    title: 'User Guide',
    bookSlug: 'user-guide',  // Lock to specific book
    showBookNav: false,      // Hide book navigation
    
    api: {
        baseURL: 'http://localhost:8000'
    }
});

await app.start();
```

### Using Factory Methods

```javascript
// Quick single-book setup
const app = DocItApp.createForBook('api-docs', {
    container: '#app',
    title: 'API Documentation'
});

await app.start();
```

## Configuration Options

### Core Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `container` | string | `'#app'` | DOM selector for app container |
| `title` | string | `'DocIt Portal'` | Application title |
| `theme` | string | `'light'` | Color theme ('light' or 'dark') |
| `bookSlug` | string | `null` | Lock to specific book (enables single-book mode) |
| `showBookNav` | boolean | `true` | Show book navigation (auto-false in single-book mode) |

### API Configuration

```javascript
{
    api: {
        baseURL: 'http://localhost:8000',
        headers: {
            'Authorization': 'Bearer YOUR_TOKEN'
        }
    }
}
```

### Sidebar Configuration

```javascript
{
    sidebar: {
        showSearch: true,        // Show search input
        defaultCollapsed: false  // Start with sidebar collapsed
    }
}
```

### Permissions

```javascript
{
    permissions: {
        edit: ['manage_docit', 'admin']  // Roles that can edit
    }
}
```

## API Requirements

DocIt requires a backend API that implements the following endpoints:

### Books
- `GET /api/docit/book` - List all books
- `GET /api/docit/book/{id}` - Get book details
- `GET /api/docit/book/slug/{slug}` - Get book by slug
- `POST /api/docit/book` - Create book
- `PUT /api/docit/book/{id}` - Update book
- `DELETE /api/docit/book/{id}` - Delete book

### Pages
- `GET /api/docit/page` - List pages (with `?book={id}` filter)
- `GET /api/docit/page/{id}` - Get page details
- `GET /api/docit/page/slug/{slug}` - Get page by slug
- `POST /api/docit/page` - Create page
- `PUT /api/docit/page/{id}` - Update page
- `DELETE /api/docit/page/{id}` - Delete page

### Navigation
The app uses query parameters for navigation:
- Pages are accessed via `/docs?slug=page-slug`
- Books are specified with `&book=book-slug`
- Child pages include `&parent=parent-slug`
- Editing uses `/edit?id=page-id` or `/edit?slug=page-slug`

### Response Graphs
Pages support different response formats via the `graph` parameter:
- `?graph=list` - Minimal list data
- `?graph=detail` - Full details with markdown content
- `?graph=html` - Rendered HTML content

## Page Hierarchy

DocIt supports a single level of page nesting:

```
Book
├── Page 1
│   ├── Child Page 1.1
│   ├── Child Page 1.2
│   └── Child Page 1.3
├── Page 2
│   ├── Child Page 2.1
│   └── Child Page 2.2
└── Page 3
```

## Events

The app emits various events you can listen to:

```javascript
// Book navigation
app.events.on('docit:book-changed', (data) => {
    console.log('Book changed:', data.book);
});

// Page navigation
app.events.on('page:show', (data) => {
    console.log('Page shown:', data.page);
});

// Authentication
app.events.on('auth:unauthorized', () => {
    // Handle unauthorized access
});

// App ready
app.events.on('docit:ready', () => {
    console.log('DocIt is ready!');
});
```

## Keyboard Shortcuts

- `Ctrl/Cmd + K` - Focus search
- `Ctrl/Cmd + E` - Edit current page (if permitted)
- `Esc` - Close modals/cancel edit

## Styling

DocIt uses CSS custom properties for theming:

```css
:root {
    --docit-primary: #2563eb;
    --docit-primary-hover: #1d4ed8;
    --docit-bg-primary: #ffffff;
    --docit-bg-secondary: #f8fafc;
    --docit-text-primary: #1e293b;
    --docit-text-secondary: #64748b;
    --docit-border: #e2e8f0;
    /* ... more variables ... */
}
```

### Dark Theme

The dark theme is automatically applied when `theme: 'dark'` is set:

```javascript
const app = new DocItApp({
    container: '#app',
    theme: 'dark'
});
```

## URL Structure

The DocIt portal uses query parameter-based routing for better compatibility with the MOJO framework:

### Multi-Book Mode
- `/docs` - Books list (or first page if a book is selected)
- `/docs?book=book-slug` - Book's first page
- `/docs?book=book-slug&slug=page-slug` - Specific page
- `/docs?book=book-slug&parent=parent-slug&slug=child-slug` - Child page
- `/edit?id=page-id` - Edit page by ID
- `/edit?slug=page-slug` - Edit page by slug

### Single-Book Mode
- `/docs` - Book's first page
- `/docs?slug=page-slug` - Specific page
- `/docs?parent=parent-slug&slug=child-slug` - Child page
- `/edit?id=page-id` - Edit page by ID
- `/edit?slug=page-slug` - Edit page by slug

## Development

### Running the Example

1. Start your backend API server
2. Open `examples/docit/index.html` in your browser
3. Or serve it with a local web server:

```bash
# Using Python
python -m http.server 8080

# Using Node.js
npx http-server -p 8080
```

### Debug Mode

Access the app instance in the browser console:

```javascript
// App is available globally in the example
window.docitApp

// Check current book
window.docitApp.currentBook

// Check loaded pages
window.docitApp.pages

// Navigate programmatically
window.docitApp.navigateToPage(page)
```

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Dependencies

- MOJO Framework (included)
- Bootstrap 5.3+ (for UI components)
- Bootstrap Icons (for icons)
- Prism.js (optional, for syntax highlighting)

## Future Enhancements

- [ ] TOAST UI Editor integration for rich markdown editing
- [ ] Real-time collaborative editing
- [ ] Version history and diff viewer
- [ ] Page templates
- [ ] Export to PDF
- [ ] Full-text search with highlighting
- [ ] Comments and annotations
- [ ] Custom themes

## License

Part of the MOJO Framework