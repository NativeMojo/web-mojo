# WEB-MOJO Framework Documentation

**Welcome to the WEB-MOJO documentation!** This guide covers the complete framework for building modern web applications.

## 📖 Browse Documentation

- **[Interactive Portal](./index.html)** - Browse docs with search and syntax highlighting (open in browser)
- **Documentation by Category** - See sections below

---

## Core Concepts

Essential framework components:

- **[View](./core/View.md)** - Base view component and lifecycle
- **[Child Views](./core/ViewChildViews.md)** - Composing views with children
- **[Advanced Views](./core/AdvancedViews.md)** - Custom rendering, Canvas, WebGL patterns
- **[Templates](./core/Templates.md)** - Mustache templating with formatters and common pitfalls
- **[Model](./core/Model.md)** - Data models with REST API integration
- **[Collection](./core/Collection.md)** - Collections of models with querying
- **[Events](./core/Events.md)** - Event system and delegation patterns

## Features

Framework features and modules:

- **[Location](./features/Location.md)** - Geolocation services and tracking
- **[Location API](./features/Location_API.md)** - Location API reference
- **[Map](./features/Map.md)** - Map integration and controls
- **[TabView](./features/TabView.md)** - Tab navigation component
- **[Admin](./features/Admin.md)** - Admin interface utilities

## Components

UI Components:

- **[ListView](./components/ListView.md)** - Visual list component for collections
- **[TableView](./components/TableView.md)** - Advanced data table with sorting, filtering, pagination
- **[TablePage](./components/TablePage.md)** - Page wrapper for TableView with URL sync
- **[Charts](./components/Charts.md)** - Chart.js integration
- **[DataView](./components/DataView.md)** - Data display component
- **[FileView](./components/FileView.md)** - File upload and management
- **[FileUpload](./components/FileUpload.md)** - File upload utilities
- **[ImageFields](./components/ImageFields.md)** - Image field components
- **[LightBox](./components/LightBox.md)** - Image lightbox viewer
- **[MapLibreView](./components/MapLibreView.md)** - MapLibre GL integration
- **[MapView](./components/MapView.md)** - Map view component
- **[TimelineView](./components/TimelineView.md)** - Timeline visualization

---

## 🚀 Getting Started

New to MOJO? Start here:

1. **Installation** - `npm install web-mojo`
2. **[View Basics](./core/View.md)** - Learn the View component system
3. **[Templates](./core/Templates.md)** - Build dynamic UIs with Mustache
4. **[Model](./core/Model.md)** - Connect to your REST API

**Recommended learning path:**
1. Core → View.md (understand components)
2. Core → Templates.md (learn templating)
3. Core → Model.md (connect data)
4. Core → Events.md (handle interactions)
5. Core → Collection.md (work with lists)

---

## 📚 Documentation Status

- ✅ **Up-to-date** - Core, Features, Components folders (recently updated Feb 2025)
- 🔄 **Pending Updates** - See [pending_update/](./pending_update/) folder for docs awaiting review

---

## 🤖 For AI Agents

This documentation is structured for easy navigation and understanding:

### Structure
- **`core/`** - Framework fundamentals (View, Model, Collection, Templates, Events)
- **`features/`** - Modules and integrations (Location, Map, Admin, TabView)
- **`components/`** - UI components (Charts, FileView, DataView, etc.)
- **`pending_update/`** - Documentation awaiting updates

### Key Patterns
- **KISS Principle** - Keep It Simple, Stupid (emphasized throughout)
- **Model-First Approach** - Use models directly, avoid custom data structures
- **Common Pitfalls** - Each major doc has a "Common Pitfalls" section with warnings
- **Cross-References** - All docs link to related documentation

### Essential Reading for Understanding WEB-MOJO

**Start here:**
1. **`core/View.md`** - Base component architecture, lifecycle, rendering
2. **`core/Templates.md`** - Template system, Mustache syntax, 70+ formatters, CRITICAL pitfalls
3. **`core/Model.md`** - Data layer, REST API, validation, events

**Then explore:**
4. **`core/ViewChildViews.md`** - Component composition patterns
5. **`core/Collection.md`** - Working with lists of models
6. **`core/Events.md`** - Event handling and delegation

**Advanced topics:**
7. **`core/AdvancedViews.md`** - Custom rendering, Canvas/WebGL, performance optimization

### Philosophy
- **Logic-less templates** - Business logic in views, not templates
- **View instance as context** - Templates access view properties/methods
- **Formatters for display** - Use pipe syntax `{{value|formatter}}` for presentation
- **View methods for computation** - Complex logic in view methods
- **Events over callbacks** - Use event delegation pattern

### Common Gotchas (Read Templates.md for details)
- ⚠️ Boolean checks need `|bool` formatter (arrays/objects will iterate otherwise)
- ⚠️ HTML output needs triple braces `{{{html}}}` (double braces escape)
- ⚠️ String arguments need quotes: `{{date|date:'YYYY-MM-DD'}}`
- ⚠️ Use `{{.property}}` in iterations (not `{{property}}`)
- ⚠️ Object iteration needs `|iter` formatter

---

## 📂 Folder Structure

```
docs/
├── README.md              # This file - Documentation index
├── index.html             # Interactive documentation portal
├── core/                  # Core framework (7 docs)
│   ├── View.md
│   ├── ViewChildViews.md
│   ├── AdvancedViews.md
│   ├── Templates.md
│   ├── Model.md
│   ├── Collection.md
│   └── Events.md
├── features/              # Framework features (5 docs)
│   ├── Location.md
│   ├── Location_API.md
│   ├── Map.md
│   ├── TabView.md
│   └── Admin.md
├── components/            # UI components (10+ docs)
│   └── *.md
└── pending_update/        # Docs awaiting review/updates
    └── *.md
```

---

## 📝 Contributing

Documentation improvements welcome! Please ensure:
- ✅ Examples are tested and working
- ✅ Common pitfalls are documented with ⚠️ warnings
- ✅ Cross-references are updated
- ✅ KISS principles are followed
- ✅ Code examples use real-world patterns
- ✅ Before/after examples for corrections

### Documentation Standards
- Use `⚠️` for critical warnings
- Use `✅` for best practices
- Use `❌` for anti-patterns
- Include "Common Pitfalls" sections
- Link to related documentation
- Show complete, working examples

---

## 🔗 External Resources

- **[MOJO on NPM](https://www.npmjs.com/package/web-mojo)** - Package registry
- **[GitHub Repository](https://github.com/username/web-mojo)** - Source code
- **[Examples](../examples/)** - Working example projects

---

## 📄 License

Apache 2.0 - See LICENSE file

---

**Last Updated:** February 2025  
**Documentation Version:** 2.1.0

