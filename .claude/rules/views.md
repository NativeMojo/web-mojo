---
globs: ["src/core/views/**/*.js", "src/core/forms/**/*.js", "src/core/pages/**/*.js", "src/extensions/**/*.js"]
---

# View, Page & Template Rules

## Views and Pages
- Views extend `View`; routed screens extend `Page`.
- Keep file names PascalCase and match the class name.
- Compose UI with child views and containers instead of hand-managed DOM trees.
- For pages, use `onEnter()` / `onExit()` for visit lifecycle — pages are cached, so per-visit logic belongs in `onEnter()`, not constructor or `onInit()`.

## Data Binding
- The primary data object is `this.model`. JS reads via `this.model.get('field')`; templates read via `{{model.field}}`.
- Child views receive `model: this.model`.
- Do not invent ad-hoc data holder names like `this.runner` or `this.device`.

## Actions and Containers
- `data-action="kebab-case"` maps to `onActionKebabCase(event, element)`.
- `data-container="name"` maps to child views created with `containerId: 'name'`.
- `data-action` belongs on clickable or interactive elements, not `<form>`.
- On a form control (`<input>`, `<textarea>`, `<select>`), `data-action` also fires the handler on `input` and `change` events — so `<input data-action="filter">` calls `onActionFilter` on every keystroke. Use `data-action-debounce="<ms>"` to debounce. If both `data-action` and `data-change-action` are set, `data-change-action` wins for input/change events.

## Child View Lifecycle
- Use `addChild()` with `containerId`. For children added **before the parent's first render** (in `onInit()` or constructor), the parent renders them automatically — do not call `child.render()` or `child.mount()` yourself.
- Children added **after the parent has already rendered** (in action handlers, event callbacks, or any post-mount code path) DO need `await child.render()` — otherwise they never appear. See `docs/web-mojo/core/ViewChildViews.md` (Manual Rendering note) and the `appendChild` / Dynamic Children patterns.
- One `containerId` holds exactly one child. Adding a second child to the same `containerId` replaces the first. To render N items, give each its own container (e.g. `containerId: `row-${item.id}`` with a template loop) or use `ListView` / `TableView`.

## Template Rules
- The view instance is the Mustache context. Use `this.someProperty` in JS and `{{someProperty}}` in templates.
- For model data, prefer `{{model.field}}` and compute extra display fields on the view instance.
- Use `{{#flag|bool}}` for boolean checks. Plain `{{#flag}}` can iterate arrays/objects.
- Use `{{{triple braces}}}` for trusted HTML or data URIs that must not be escaped.
- Quote string formatter arguments: `{{date|date:'YYYY-MM-DD'}}`.
- In iterations, use `{{.}}` or `{{.property}}` as appropriate.
- Do not use Mustache formatters inside Chart.js config objects; use plain JavaScript callbacks there.
- Read `docs/web-mojo/core/Templates.md` whenever writing or changing Mustache templates.

## Styling
- Use Bootstrap 5.3 classes and Bootstrap Icons.
- For user-visible async waits, use `showLoading()` / `hideLoading()` around the async work.
