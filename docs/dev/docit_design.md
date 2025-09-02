# DocIt Documentation Portal Design

## Overview

The DocIt Documentation Portal is a clean, modern web application for browsing and managing documentation. It provides an intuitive interface for navigating documentation books and pages, with seamless editing capabilities for authorized users.

## Design Principles

- **Simplicity**: Clean, uncluttered interface focused on content
- **Readability**: Optimized typography and spacing for documentation
- **Responsiveness**: Works seamlessly on desktop, tablet, and mobile
- **Performance**: Fast loading with efficient data fetching
- **Accessibility**: WCAG 2.1 AA compliant

## Visual Design

### Color Palette

```css
/* Primary Colors */
--docit-primary: #2563eb;        /* Bright blue for primary actions */
--docit-primary-hover: #1d4ed8;  /* Darker blue for hover states */

/* Background Colors */
--docit-bg-primary: #ffffff;     /* Main content background */
--docit-bg-secondary: #f8fafc;   /* Sidebar background */
--docit-bg-tertiary: #f1f5f9;    /* Selected items */

/* Text Colors */
--docit-text-primary: #1e293b;   /* Main text */
--docit-text-secondary: #64748b; /* Secondary text */
--docit-text-muted: #94a3b8;     /* Muted text */

/* Border Colors */
--docit-border: #e2e8f0;         /* Default borders */
--docit-border-dark: #cbd5e1;    /* Emphasized borders */

/* Status Colors */
--docit-success: #10b981;        /* Success states */
--docit-warning: #f59e0b;        /* Warning states */
--docit-error: #ef4444;          /* Error states */
--docit-info: #3b82f6;           /* Info states */
```

### Typography

```css
/* Font Stack */
--docit-font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 
                   'Helvetica Neue', Arial, sans-serif;
--docit-font-mono: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', monospace;

/* Font Sizes */
--docit-text-xs: 0.75rem;    /* 12px */
--docit-text-sm: 0.875rem;   /* 14px */
--docit-text-base: 1rem;     /* 16px */
--docit-text-lg: 1.125rem;   /* 18px */
--docit-text-xl: 1.25rem;    /* 20px */
--docit-text-2xl: 1.5rem;    /* 24px */
--docit-text-3xl: 1.875rem;  /* 30px */

/* Line Heights */
--docit-leading-tight: 1.25;
--docit-leading-normal: 1.5;
--docit-leading-relaxed: 1.75;
```

## Layout Structure

### Desktop Layout (≥1024px)

```
┌─────────────────────────────────────────────────────────────────┐
│                         Top Navigation Bar                      │
│  [≡] DocIt Portal                              [User] [Settings]│
├─────────────────────────────────────────────────────────────────┤
│         │                                                        │
│  Books  │                    Page Content                       │
│  Nav    │                                                        │
│  250px  │                                                        │
│         │  ┌──────────────────────────────────────────────┐    │
│ ┌─────┐ │  │                Page Header                   │    │
│ │Book1│ │  │  Title                         [Edit] [More] │    │
│ │├Page│ │  └──────────────────────────────────────────────┘    │
│ ││├Sub│ │                                                        │
│ │└Page│ │  ┌──────────────────────────────────────────────┐    │
│ │Book2│ │  │                                              │    │
│ └─────┘ │  │           Rendered HTML Content              │    │
│         │  │                                              │    │
│         │  │                                              │    │
│         │  └──────────────────────────────────────────────┘    │
│         │                                                        │
└─────────┴────────────────────────────────────────────────────────┘
```

### Tablet Layout (768px - 1023px)

```
┌─────────────────────────────────────────────────┐
│              Top Navigation Bar                  │
│  [≡]                           [User] [Settings] │
├─────────────────────────────────────────────────┤
│                                                  │
│              Page Content Area                   │
│                                                  │
│  (Sidebar slides in from left as overlay)       │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Mobile Layout (<768px)

```
┌──────────────────────┐
│   Top Navigation     │
│  [≡]            [⋮]  │
├──────────────────────┤
│                      │
│    Page Content      │
│                      │
│  (Full width with    │
│   mobile-optimized   │
│   typography)        │
│                      │
└──────────────────────┘
```

## Component Architecture

### 1. DocItApp (extends WebApp)

```javascript
// Main application controller
class DocItApp extends WebApp {
  // Core responsibilities:
  // - Initialize navigation components
  // - Handle authentication & permissions
  // - Manage routing
  // - Coordinate between books and pages
}
```

### 2. DocNavSidebar (extends View)

```javascript
// Left navigation sidebar
class DocNavSidebar extends View {
  // States:
  // - Books list view
  // - Pages tree view (when book selected)
  // - Collapsed/expanded state
  
  // Features:
  // - Collapsible book/page hierarchy
  // - Search functionality
  // - Active item highlighting
  // - Smooth transitions
}
```

### 3. DocPage (extends Page)

```javascript
// Main documentation page viewer
class DocPage extends Page {
  // Responsibilities:
  // - Fetch and display page content
  // - Handle permissions
  // - Show edit toolbar when authorized
  // - Sync URL with current page
}
```

### 4. DocEditPage (extends Page)

```javascript
// Markdown editor page
class DocEditPage extends Page {
  // Features:
  // - TOAST UI Editor integration
  // - Live preview
  // - Save/cancel actions
  // - Auto-save functionality
}
```

## Navigation Flow

### Book & Page Navigation Structure

```
DocIt Portal/
├── Books List (default view)
│   ├── Book 1
│   │   ├── Introduction
│   │   ├── Getting Started
│   │   │   ├── Installation
│   │   │   └── Configuration
│   │   └── Advanced Topics
│   │       ├── Performance
│   │       └── Security
│   └── Book 2
│       └── [Pages...]
```

### URL Structure

```
/                           # Home - shows books list
/book/{book-slug}          # Book landing page
/book/{book-slug}/{page-slug}  # Specific page
/edit/{page-id}            # Edit page (authorized users)
```

## User Interface Components

### 1. Books Navigation

```html
<!-- When no book is selected -->
<div class="doc-nav-books">
  <div class="doc-nav-header">
    <h3>Documentation</h3>
    <button class="btn-icon" data-action="refresh-books">
      <i class="bi bi-arrow-clockwise"></i>
    </button>
  </div>
  
  <div class="doc-nav-search">
    <input type="search" placeholder="Search books..." />
  </div>
  
  <ul class="doc-books-list">
    <li class="doc-book-item" data-book-id="1">
      <i class="bi bi-book"></i>
      <span>API Documentation</span>
      <span class="badge">12 pages</span>
    </li>
    <li class="doc-book-item" data-book-id="2">
      <i class="bi bi-book"></i>
      <span>User Guide</span>
      <span class="badge">8 pages</span>
    </li>
  </ul>
</div>
```

### 2. Pages Navigation

```html
<!-- When a book is selected -->
<div class="doc-nav-pages">
  <div class="doc-nav-header">
    <button class="btn-back" data-action="back-to-books">
      <i class="bi bi-arrow-left"></i>
    </button>
    <h3>API Documentation</h3>
  </div>
  
  <div class="doc-nav-search">
    <input type="search" placeholder="Search pages..." />
  </div>
  
  <ul class="doc-pages-tree">
    <li class="doc-page-item">
      <a href="/book/api-docs/introduction">Introduction</a>
    </li>
    <li class="doc-page-item has-children expanded">
      <button class="toggle-children">
        <i class="bi bi-chevron-down"></i>
      </button>
      <a href="/book/api-docs/getting-started">Getting Started</a>
      <ul class="doc-pages-children">
        <li class="doc-page-item active">
          <a href="/book/api-docs/installation">Installation</a>
        </li>
        <li class="doc-page-item">
          <a href="/book/api-docs/configuration">Configuration</a>
        </li>
      </ul>
    </li>
  </ul>
</div>
```

### 3. Page Content View

```html
<div class="doc-page-view">
  <!-- Page Header -->
  <header class="doc-page-header">
    <div class="doc-page-title">
      <h1>Installation Guide</h1>
      <div class="doc-page-meta">
        <span class="text-muted">Last updated: 2 days ago</span>
      </div>
    </div>
    
    <!-- Edit Toolbar (shown for authorized users) -->
    <div class="doc-page-toolbar">
      <button class="btn btn-primary" data-action="edit-markdown">
        <i class="bi bi-pencil"></i> Edit
      </button>
      <div class="dropdown">
        <button class="btn btn-outline-secondary" data-bs-toggle="dropdown">
          <i class="bi bi-three-dots"></i>
        </button>
        <ul class="dropdown-menu">
          <li><a class="dropdown-item" data-action="view-history">View History</a></li>
          <li><a class="dropdown-item" data-action="edit-order">Edit Page Order</a></li>
          <li><hr class="dropdown-divider"></li>
          <li><a class="dropdown-item text-danger" data-action="delete-page">Delete Page</a></li>
        </ul>
      </div>
    </div>
  </header>
  
  <!-- Rendered Content -->
  <article class="doc-page-content">
    <!-- Server-rendered HTML from markdown -->
    <div class="doc-content">
      <!-- Content injected here -->
    </div>
  </article>
  
  <!-- Page Navigation -->
  <nav class="doc-page-nav">
    <a href="/previous" class="nav-prev">
      <i class="bi bi-arrow-left"></i>
      <div>
        <small>Previous</small>
        <span>Getting Started</span>
      </div>
    </a>
    <a href="/next" class="nav-next">
      <div>
        <small>Next</small>
        <span>Configuration</span>
      </div>
      <i class="bi bi-arrow-right"></i>
    </a>
  </nav>
</div>
```

### 4. Edit Page View

```html
<div class="doc-edit-view">
  <!-- Edit Header -->
  <header class="doc-edit-header">
    <div class="doc-edit-title">
      <h2>Editing: Installation Guide</h2>
    </div>
    <div class="doc-edit-actions">
      <button class="btn btn-outline-secondary" data-action="cancel-edit">
        Cancel
      </button>
      <button class="btn btn-success" data-action="save-page">
        <i class="bi bi-check-lg"></i> Save Changes
      </button>
    </div>
  </header>
  
  <!-- TOAST UI Editor Container -->
  <div class="doc-editor-container">
    <div id="toast-ui-editor"></div>
  </div>
  
  <!-- Auto-save indicator -->
  <div class="doc-edit-status">
    <span class="auto-save-status">
      <i class="bi bi-cloud-check"></i> Auto-saved
    </span>
  </div>
</div>
```

## API Integration

### Book Operations

```javascript
// Fetch all books
GET /api/docit/book?graph=list
// Returns: [{id, title, slug, page_count}, ...]

// Fetch book details with pages
GET /api/docit/book/{id}?graph=detail
// Returns: {id, title, slug, pages: [...]}
```

### Page Operations

```javascript
// Fetch page content (HTML)
GET /api/docit/page/{id}?graph=html
// Returns: {id, title, content_html, ...}

// Fetch page for editing (Markdown)
GET /api/docit/page/{id}?graph=detail
// Returns: {id, title, content, metadata, ...}

// Update page content
PUT /api/docit/page/{id}
// Body: {content: "# Updated markdown..."}
```

## Responsive Behaviors

### Mobile Optimizations

1. **Touch-friendly Navigation**
   - Larger tap targets (min 44x44px)
   - Swipe gestures for sidebar
   - Pull-to-refresh for content

2. **Typography Adjustments**
   - Larger base font size (17px)
   - Increased line height
   - Optimized paragraph width

3. **Content Prioritization**
   - Hide secondary elements
   - Collapsible sections
   - Simplified toolbar

### Tablet Optimizations

1. **Hybrid Layout**
   - Overlay sidebar
   - Floating action buttons
   - Adaptive content width

2. **Enhanced Touch**
   - Hover alternatives
   - Long-press context menus
   - Gesture navigation

## Performance Optimizations

### 1. Data Loading Strategy

```javascript
// Progressive loading
// 1. Load books list (lightweight)
// 2. Load active book's page tree
// 3. Load page content on demand
// 4. Prefetch adjacent pages
```

### 2. Caching Strategy

```javascript
// Cache hierarchy:
// - Books list: 5 minutes
// - Page tree: 2 minutes  
// - Page content: 1 minute
// - User edits: localStorage until saved
```

### 3. Rendering Optimizations

- Virtual scrolling for long page lists
- Lazy loading for images in content
- Code syntax highlighting on demand
- Debounced search input

## Accessibility Features

### 1. Keyboard Navigation

- `Tab` - Navigate through interactive elements
- `Enter/Space` - Activate buttons/links
- `Arrow keys` - Navigate tree structure
- `Esc` - Close modals/cancel edit
- `/` - Focus search
- `Ctrl+S` - Save in edit mode

### 2. Screen Reader Support

- Semantic HTML structure
- ARIA labels and landmarks
- Live regions for updates
- Skip navigation links
- Focus management

### 3. Visual Accessibility

- High contrast mode support
- Focus indicators
- Color-blind friendly palette
- Scalable interface (zoom to 200%)

## Edit Mode Features

### 1. TOAST UI Editor Configuration

```javascript
const editorConfig = {
  height: 'calc(100vh - 200px)',
  initialEditType: 'markdown',
  previewStyle: 'vertical',
  usageStatistics: false,
  toolbarItems: [
    ['heading', 'bold', 'italic', 'strike'],
    ['hr', 'quote'],
    ['ul', 'ol', 'task', 'indent', 'outdent'],
    ['table', 'image', 'link'],
    ['code', 'codeblock'],
    ['scrollSync']
  ],
  plugins: [
    ['chart'],
    ['codeSyntaxHighlight', { highlighter: Prism }],
    ['tableMergedCell']
  ]
};
```

### 2. Auto-save Implementation

```javascript
// Auto-save every 30 seconds if changes detected
// Show status indicator
// Store draft in localStorage
// Warn before leaving with unsaved changes
```

### 3. Revision Management

```javascript
// Show revision history
// Compare versions
// Restore previous version
// Track change authors
```

## Error States

### 1. Empty States

- No books available
- No pages in book
- Search returned no results

### 2. Error Messages

- Network errors
- Permission denied
- Page not found
- Save failed

### 3. Loading States

- Books loading
- Pages loading
- Content loading
- Saving progress

## Future Enhancements

1. **Search & Discovery**
   - Full-text search across all books
   - Search filters and facets
   - Search history
   - Popular/trending pages

2. **Collaboration**
   - Real-time collaborative editing
   - Comments and discussions
   - Change notifications
   - Review workflows

3. **Personalization**
   - Reading progress tracking
   - Bookmarks and favorites
   - Personal notes
   - Custom themes

4. **Export & Sharing**
   - Export to PDF
   - Print-friendly view
   - Share links with anchors
   - Embed documentation

5. **Analytics**
   - Page view tracking
   - Search analytics
   - User journey mapping
   - Content effectiveness metrics