# Working Memory

## Current Focus

- `RunnerDetailsView.js` refactored: all `this.runner` → `this.model` (proper Model+View pattern). See Key Decisions below.

---

## Gotchas (Things That Will Bite You)

- **ALWAYS read the docs before building** — Before using ANY web-mojo component (TableView, ListView, Dialog, FormPage, etc.), read the corresponding doc from `docs/web-mojo/` first. The trusted root index is `docs/web-mojo/README.md` — use it to find the correct doc path for any component. Never guess how a component works — the docs have critical config details, available options, and usage patterns that are easy to get wrong.

- **`this.runner` / `this.device` / `this.anything` for data objects is WRONG** — the framework pattern is always `this.model`. Views accept `options.model` (a Model instance) and expose it to Mustache as `{{model.field}}`. Never invent a custom property name for the primary data object.

- **`onAfterRender` / `onAfterMount` data fetching** — causes infinite re-render loops. Always fetch in `onInit()` or action handlers.
- **`data-action` on `<form>`** — silently does nothing. Must go on `<button type="button">` inside the form.
- **Boolean checks without `|bool`** — `{{#flag}}` iterates if flag is an array/object. Always use `{{#flag|bool}}`.
- **`addChild()` + manual render/mount** — calling `child.render()` or `child.mount()` after `addChild()` causes double-mount bugs. The framework handles it.
- **Pages are cached** — constructor and `onInit()` only run once. Per-visit logic (data refresh, param reads) belongs in `onEnter()`.
- **Chart.js + formatters** — template pipe formatters are Mustache-only. Inside Chart.js config objects, use plain JS callbacks.
- **TableView `defaultQuery` params leak into filter pills** — when using `defaultQuery` to scope a TableView (e.g. `{ uid: model.id }`), add those keys to `hideActivePillNames` so they don't show up as removable filter pills. Example: `hideActivePillNames: ['uid', 'sort']`.
- **Collection has no `toArray()`** — use `collection.models` for Model instances or `collection.toJSON()` for plain objects. `toArray()` does not exist.
- **`docs/pending_update/`** — these are drafts awaiting review. Do NOT treat them as authoritative. Use `docs/web-mojo/` instead.

---

## Key Decisions

- **Model+View pattern** — every view that displays a data record must follow:
  1. `constructor`: `this.model = options.model instanceof MyModel ? options.model : new MyModel(options.data || {});`
  2. Access data via `this.model.get('field')` in JS logic.
  3. Access data via `{{model.field}}` in Mustache templates.
  4. Pass to child views as `model: this.model`.
  5. Static `show()` factory: wrap plain objects with `new MyModel(runner)` before constructing the view.
  - Reference implementation: `DeviceView.js` (`src/extensions/admin/account/devices/DeviceView.js`)
  - `RunnerDetailsView.js` was refactored from `this.runner` → `this.model` / `this.model.get(...)` to comply with this pattern.

- **Split AGENT.md into three files**: entry point (`AGENT.md` ~105 lines), architecture (`docs/agent/architecture.md`), working memory (`memory.md`). Old monolith was 664 lines — too costly to load every session.
- **`docs/web-mojo/AGENT.md`** is a consumer drop-in — copy it into other projects as their `AGENT.md` to give those agents web-mojo knowledge. Remote URL: `https://raw.githubusercontent.com/NativeMojo/web-mojo/main/docs/web-mojo/AGENT.md`. Intentionally separate from the internal `AGENT.md`.
- **Doc links point to remote GitHub raw URLs** in AGENT.md so they work for agents operating outside the repo. Local `docs/web-mojo/` is the more current copy when working inside the repo.
- **`Claude.md` left empty** — already blank; no action needed.
- **`DEV_GUIDE.md`** is contributor-facing (build system, extension authoring). Not in agent boot path — leave as-is.

---

## Handoff Notes

- Check `QUICK_START.md` no longer exists — confirmed deleted.
- `TODO.md` reset to blank slate — add new items as they come up.

---

## Completed (Archive)

- Agent context restructure: new `AGENT.md`, `docs/agent/architecture.md`, `memory.md`, `prompts/building.md`, `prompts/planning.md`, `docs/ext_Agent.md`.
- MultiSelectDropdown component + Django lookups filter system implemented.
- Auth, Wiki, Cloud Push Notifications, Metrics permissions, Firebase support all shipped.
- Chart rendering flow and Series Chart refresh button fixed.