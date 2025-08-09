# Legacy Examples

This folder contains the original examples from the early development phases of the MOJO framework. These examples have been preserved for reference and historical context.

## Why Legacy?

These examples were moved here to make room for the new, more structured examples in the main `/examples` directory. The new examples follow better practices:
- Clean folder structure with models, pages, and components separated
- Consistent use of param-based routing (`?page=pagename`)
- Shared models in a dedicated `/models` folder
- Better documentation and code organization

## What's Here?

### Basic Examples
- **01-hello-world** - The simplest MOJO application
- **basic** - Basic View and component usage
- **basic-nav** - Navigation fundamentals
- **basic-nav-sidebar** - Layout with navigation and sidebar

### Advanced Examples
- **complete-demo** - Comprehensive demo application
- **events** - Event-driven architecture demonstration
- **filter-system-test** - Table filtering system
- **form-builder** - Dynamic form generation
- **hierarchy** - Component hierarchy and nesting
- **page-events-demo** - Page lifecycle events
- **phase2-basic** - Phase 2 features demonstration

### Table Examples
- **table-advanced** - Advanced table features
- **table-page** - TablePage component usage
- **todo-rest-table** - REST API integration with tables

## Using Legacy Examples

These examples still work and can be accessed directly:
1. Navigate to the specific example folder
2. Open `index.html` in your browser
3. Or serve via the dev server: `http://localhost:3000/examples/legacy/[example-name]/`

## Note

While these examples are functional, they may use older patterns or APIs. For learning MOJO framework best practices, refer to the main examples at `/examples/`.

### Key Differences from New Examples:
- May use hash-based routing (`#/page`) instead of param-based (`?page=name`)
- Models might be defined inline rather than in separate files
- Less consistent folder structure
- Some may use older API patterns

## Migration Guide

If you're updating code from these legacy examples:
1. Use param-based routing: `?page=pagename`
2. Move models to `/models` folder
3. Use the new Page class structure with proper options
4. Follow the patterns shown in the main examples

---

These examples remain valuable for understanding the evolution of the MOJO framework and for maintaining backward compatibility with existing applications.