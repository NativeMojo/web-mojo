# DocIt Frontend Framework Documentation

## Overview

The `docit` submodule provides a complete frontend solution for browsing and managing documentation created with the DocIt REST API. It features a professional, two-panel layout with a dynamic sidebar for navigation and a main content area for viewing and editing documentation pages.

## Core Concepts

The frontend is built around a few key components:

-   **`DocitApp`**: The main application container that orchestrates all the other components and manages the overall state.
-   **`Sidebar` Integration**: The app uses the existing `Sidebar` component to display navigation. It dynamically swaps views within the sidebar to show either a list of books or a list of pages for a selected book.
-   **`BookSearchView`**: A view that appears in the sidebar to let users search for and select a documentation "Book".
-   **`PageListView`**: After a book is selected, this view replaces the `BookSearchView` in the sidebar, showing a hierarchical list of all pages within that book.
-   **`PageView`**: The main content view. It takes a DocIt Page, renders its Markdown content into clean, readable HTML, and displays it. It also provides an "Edit" button.
-   **`EditorView`**: A view containing a full-featured WYSIWYG Markdown editor (Toast UI Editor). This view is typically presented in a modal dialog when the user chooses to edit a page.

## Standard User Flow

1.  The user navigates to the documentation section of the application.
2.  The `DocitApp` loads, showing a `Sidebar` with an option to "Select Book".
3.  The user clicks "Select Book", and the `BookSearchView` appears in the sidebar.
4.  The user selects a book from the list.
5.  The `Sidebar` content is replaced with the `PageListView`, showing all the pages for the selected book.
6.  The user clicks on a page in the list.
7.  The main content area displays the `PageView`, showing the rendered HTML of the selected page's content.
8.  The user clicks the "Edit" button on the `PageView`.
9.  A large modal `Dialog` appears, containing the `EditorView` with the page's content loaded into the WYSIWYG editor.
10. The user makes changes and clicks "Save". The page is saved to the server, the dialog closes, and the `PageView` automatically updates to show the new content.

## Basic Implementation

To use the `docit` framework, you need to integrate the `DocitApp` into your main application router.

### 1. Import `DocitApp`

First, import the main application component.

```javascript
import { DocitApp } from './src/docit/index.js';
```

### 2. Add a Route

In your application's router setup, add a route that will render the `DocitApp`. The `DocitApp` is a subclass of `Page`, so it can be used directly in the router.

```javascript
// In your main App or router configuration
const router = new Router({
    routes: [
        // ... other routes
        {
            route: '/docs',
            page: DocitApp
        },
        {
            route: '/docs/:page_id', // Handles direct links to pages
            page: DocitApp
        }
    ],
    // ... other router options
});
```

### 3. How Routing Works

The `DocitApp` internally handles routes passed to it.

-   When the route is `/docs`, it will show the initial state (prompting the user to select a book).
-   When the route matches `/docs/page/{id}`, the `onRoute` method within `DocitApp` will automatically fetch and display the content for the specified page ID.

This setup provides a fully functional documentation center with minimal configuration.
