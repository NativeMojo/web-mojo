# web-mojo Examples Portal

Single canonical demo for every component documented in [`docs/web-mojo/`](../../docs/web-mojo/). One file per component. Folder taxonomy mirrors the docs.

## Run

```bash
npm run examples:registry   # generate examples.registry.json
npm run dev                  # vite dev server
```

Visit `http://localhost:3000/examples/portal/` and pick a component from the sidebar.

The portal expects the NativeMojo backend at `localhost:9009`. Examples that don't make REST calls render fine without it; ones that do (Collection, TableView, file-upload, etc.) need the backend up.

## Add a new example

1. Create the folder: `examples/<area>/<Component>/` (where `<area>` is one of `core/`, `pages/`, `services/`, `components/`, `extensions/`, `forms/`, `forms/inputs/`, `models/`).
2. Write `<Component>Example.js` — a single `Page` subclass with an inline `template:` string. Import only from `web-mojo` (or `web-mojo/<extension>` for extension-only symbols).
3. Write `example.json` — manifest for the registry.
4. Run `npm run examples:registry` to rebuild the registry. The sidebar updates automatically.

The single-file rule is non-negotiable: the canonical reference and the runnable demo are the same file. Do not split into separate `<Component>.js` + `<Component>Demo.js`.

## `example.json` schema

```jsonc
{
  "name": "TableView",                                    // required — class name
  "area": "components",                                   // required — taxonomy folder
  "route": "components/table-view",                       // required — unique URL route
  "title": "TableView — basic data table",                // required — sidebar label
  "summary": "Sortable, filterable table bound to a Collection.",  // required
  "page": "TableViewExample.js",                          // required — page file in this folder
  "docs": "docs/web-mojo/components/TableView.md",        // optional — doc cross-link
  "tags": ["table", "list", "collection"],                // optional — search tags
  "menu": {
    "section": "Components",                              // sidebar group label (defaults to area)
    "icon": "bi-table",                                   // bootstrap-icons class
    "order": 30                                           // sort order within section
  }
}
```

For sibling variants in the same folder (e.g. `TableViewExample.js` + `TableViewBatchActionsExample.js`), use the `pages: [...]` array form:

```jsonc
{
  "name": "TableView",
  "area": "components",
  "docs": "docs/web-mojo/components/TableView.md",
  "menu": { "section": "Components", "icon": "bi-table" },
  "pages": [
    {
      "page": "TableViewExample.js",
      "route": "components/table-view",
      "title": "TableView — basic",
      "summary": "Sortable, filterable, paginated."
    },
    {
      "page": "TableViewBatchActionsExample.js",
      "route": "components/table-view/batch-actions",
      "title": "TableView — batch actions",
      "summary": "Multi-select rows + bulk actions toolbar."
    }
  ]
}
```

## Conventions inside example files

The example files are public-facing reference code. They have to be the cleanest code in the repo.

- Single `Page` subclass. Inline `template:` string. ≤150 LOC unless the component genuinely needs more.
- JSDoc header lists: component name, link to its doc page, what the example shows, the route.
- Imports from `web-mojo` only. If you need a symbol that isn't exported, that's an export bug, not an excuse to import from `/src/...`.
- `data-action="kebab-case"` → `onActionKebabCase(event, element)`. Never on `<form>` elements.
- `addChild(child, { containerId: 'foo' })` for child views — never call `child.render()`/`child.mount()` after.
- Fetch in `onInit()` or action handlers. Never in `onAfterRender()` / `onAfterMount()`.
- Per-visit state in `onEnter()` (Pages are cached).
- Mustache rules: `|bool` for booleans, `{{{ }}}` for HTML, quoted formatter args, `{{.property}}` in iterations.

## What's not here

The portal is a showcase, not an admin app. It does not register `web-mojo/admin` views — those are production code, not examples. To see admin views in action, look at the production usage of `web-mojo/admin` directly.

The legacy portal lives at [`examples/legacy/portal/`](../legacy/portal/) — it's frozen. Do not port code from it without verifying APIs against current source; the audit found cases where legacy code called methods that no longer exist.

## Registry contract

`examples.registry.json` is the LLM-facing contract. The `find-example` skill (installed by the [bootstrap-web-mojo-claude.sh](https://gist.githubusercontent.com/iamojo/1096cba9bbb345a92dc0182c2ec2dc14/raw/606444ef630a4f028ffeea800d393294003a8ce5/bootstrap-web-mojo-claude.sh) gist) reads it. Keep its path stable.
