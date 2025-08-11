MOJO Framework Context - Version 2.0.0

OVERVIEW:
MOJO is a lightweight ES6 JavaScript UI framework built on Bootstrap 5. Component-based MVC architecture with clean folder structure, RESTful API integration, and SEO-friendly routing. Phase 1 & 2 complete, Phase 3 in development. Default router mode is param (?page=pagename) for static hosting.

CORE PRINCIPLES:
- Simplicity: Minimal boilerplate, clean API
- Modern ES6+: async/await, modules, template literals
- Bootstrap 5 native: No custom CSS framework
- Convention over configuration
- Utility over decoration
- Information density for business applications
- Keep examples simple and focused

PROJECT STRUCTURE:
web-mojo/
├── src/core/ (View.js, Page.js, Router.js)
├── src/components/ (TopNav.js, Sidebar.js, MainContent.js, Table.js, FormBuilder.js)
├── src/utils/ (EventBus.js, mustache.js)
├── docs/ (organized documentation)
├── examples/ (app.js, app.css, index.html)
     |----pages
     |----models
├── test/ (unit and integration tests)
└── dist/ (built files)

NAVIGATION SYSTEM:
1. Primary: href-based (<a href="/dashboard">)
2. Enhanced: data-page with params (<button data-page="settings" data-params='{"tab": "profile"}'>)
3. External: data-external attribute
- Router uses param mode by default (?page=dashboard)
- Router must be globally accessible: window.MOJO.router = router
- View class handles navigation automatically
- Never use: href="#" with data-action="navigate"
- when adding a page to router use the page.name

COMPONENT PATTERNS:
View class: Base component with lifecycle (onInit, onBeforeRender, onAfterRender, onBeforeMount, onAfterMount, onBeforeDestroy)
A View has children.  A children should have access to the parent view.
If a View does not have a parent then it should assume the body in the DOM is its parent.
A view should have a unique id and this id should be used to find the element on the parent to attach itself to.

Parent View:

class ParentView extends View {

}

class ChildView extends View {

}

let parent = new ParentView({id: 'parent_view'});
parent.addChild(new ChildView({id: 'child_view'}));

because parent does not have a parent it will look for "#parent_view" in the document body to attach itself to then render all its children.  The parent will look inside its DOM to find the element with the id "child_view" to attach the child view to, if it is not found it will just append the child view to the parent.

A view can have a model via setModel(model) method.  It will register for any changes to the model and update itself accordingly by calling the render().

Page class: Extends View with routing, implements on_params(params, query)
Action handlers: async onActionActionName(event, element) or async on_action_actionname()
Templates: Use Mustache.js from src/utils/mustache.js
Data updates: updateData() method triggers re-render
code style should follow JS guidelines and use camelCase.

LAYOUT COMPONENTS:
Always use framework components for layouts:
- TopNav: Top navigation bar
- Sidebar: Collapsible side navigation
- MainContent: Content wrapper
IMPORTANT: look for existing components before creating new ones.
Never create custom layout HTML when these exist.

BOOTSTRAP 5 GUIDELINES:
- Compact UI: btn-sm, table-sm, form-control-sm
- Spacing: mb-2 preferred
- Icons: bi bi-icon-name
- Tables: table-sm table-hover table-bordered
- Cards: minimal padding (p-2)

DEVELOPMENT:
- Server: localhost:3000 (npm run dev)
- Build: Vite (npm run build)
- Testing: Jest (npm test)
- Router config needs base path for examples
- Examples must use separate files (html, css, js)

KEY RULES:
1. Check existing patterns before creating new features
2. Keep examples simple - one concept per example
3. Don't duplicate existing functionality
4. Use framework components, don't recreate them
5. Follow established navigation patterns (href + data-page)
6. Enhance existing examples rather than creating new ones
7. Use Bootstrap 5 classes extensively
8. Write tests for new functionality
9. Update documentation when adding features
10. Keep root directory clean, use subfolders

CURRENT FOCUS:
- Modern navigation patterns
- Expanding component library
- Comprehensive documentation
- High test coverage
- Clean example applications

Remember: we always have the dev server running in the background on localhost:3000.  DO NOT RUN dev server yourself.

Remember: MOJO prioritizes developer experience, maintainability, and professional business applications with functional interfaces over decoration.
