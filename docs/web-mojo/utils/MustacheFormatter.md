# MustacheFormatter

**Low-level Mustache template renderer. Powers the rendering you see in `View`, exposed for callers who need template rendering outside a `View`.**

The framework's `View` class uses `MustacheFormatter` internally to render templates. Most app code never instantiates one — `View.render()` does it for you. Reach for `MustacheFormatter` directly when you need to:

- Render a Mustache template into a string (no View, no DOM mounting).
- Validate/test template syntax in a unit test or playground.
- Pre-compile and cache a hot template that's rendered many times outside the View pipeline.
- Register a custom pipe formatter for use in templates everywhere.

For the full Mustache syntax reference + the 80+ built-in pipe formatters, see [`core/Templates.md`](../core/Templates.md) and [`core/DataFormatter.md`](../core/DataFormatter.md). This page documents the renderer object itself.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [API](#api)
- [Registering Custom Formatters](#registering-custom-formatters)
- [Common Pitfalls](#common-pitfalls)
- [Related Docs](#related-docs)

## Overview

`MustacheFormatter` is a thin wrapper around the bundled Mustache.js. It adds three things on top of a raw `Mustache.render`:

1. A reference to `dataFormatter` so the `|pipe` syntax works.
2. A small in-memory cache for compiled templates.
3. Convenience methods for cache-aware rendering and custom-formatter registration.

The class is exported as a default class **and** as a singleton — most callers want the singleton:

```js
import { MustacheFormatter } from 'web-mojo';

// Use the class directly:
const fmt = new MustacheFormatter();

// Or grab the framework's already-instantiated formatter via dataFormatter:
import { dataFormatter } from 'web-mojo';
```

## Quick Start

```js
import { MustacheFormatter } from 'web-mojo';

const fmt = new MustacheFormatter();

const html = fmt.render(
    '<p>Hello, {{name|capitalize}}! You have {{count}} messages.</p>',
    { name: 'alice', count: 3 },
);
// → '<p>Hello, Alice! You have 3 messages.</p>'
```

For a hot template rendered many times:

```js
const compiled = fmt.compile('<li>{{model.title}} — {{model.score|round}}</li>');

for (const item of items) {
    listEl.insertAdjacentHTML('beforeend', fmt.renderCompiled(compiled, { model: item }));
}
```

## API

### Constructor

```js
new MustacheFormatter()
```

No options. Holds an internal cache of compiled templates and a reference to the framework's `dataFormatter`.

### Render methods

| Method | Returns |
|---|---|
| `render(template, data, partials = {})` | Render a Mustache string. `data` can be a plain object, a `View`, or a `Model` — anything with a `.get(key)` method has its accessor used automatically. |
| `compile(template)` | Parse a template into Mustache tokens. Caches the result. Returns the tokens. |
| `renderCompiled(compiled, data, partials = {})` | Render previously-compiled tokens. |
| `cache(key, template)` | Compile + cache under `key`. Returns `{ key, template, compiled }`. |
| `getCached(key)` | Return cached `{ key, template, compiled }` for `key`, or `null`. |
| `clearCache()` | Drop the compiled-template cache (both the formatter's and Mustache's internal one). |

### Formatter registration

| Method | Purpose |
|---|---|
| `registerFormatter(name, fn)` | Register a custom `|name` pipe formatter. Forwards to `dataFormatter.register`. Returns `this`. |

## Registering Custom Formatters

Custom formatters work everywhere `|pipe` syntax is parsed — `View` templates, `Model.get('field|pipe')`, this class's `render()`, etc.

```js
import { MustacheFormatter } from 'web-mojo';

const fmt = new MustacheFormatter();

fmt.registerFormatter('exclaim', (value) => `${value}!`);

fmt.render('Hello, {{name|exclaim}}', { name: 'world' });
// → 'Hello, world!'
```

Formatters can take arguments. Quote string args:

```js
fmt.registerFormatter('repeat', (value, n) => String(value).repeat(parseInt(n, 10)));

fmt.render('{{name|repeat:3}}', { name: 'ha' });
// → 'hahaha'

fmt.render(`{{date|date:'YYYY-MM-DD'}}`, { date: new Date() });
```

Once registered, the formatter is global for that `dataFormatter` singleton — every `View` and `Model` gains the new pipe.

## Common Pitfalls

- **Most callers don't need `MustacheFormatter` directly.** If you have a `View`, just use the template string in the constructor — `View.render()` runs the formatter for you. Reach for `MustacheFormatter` only outside the `View` pipeline.
- **Default-escaped output.** `render()` HTML-escapes `{{value}}`. For trusted HTML use `{{{value}}}` (Mustache's standard triple-brace).
- **`|pipe` parsing happens at `Model.get` / `View.get` time, not at template-string time.** When you pass a plain object, the formatter uses Mustache's default lookup — pipes still resolve via `dataFormatter.applyPipes`, but only if the value path actually flows through a `.get()`. For raw objects, prefer pre-formatted values: compute `model.scoreFormatted = dataFormatter.pipe(model.score, 'round')` in JS, then template `{{scoreFormatted}}`.
- **Cache eviction is manual.** `clearCache()` drops everything; there's no LRU. If you compile a million unique templates in a long-running tab, memory grows. Compile a fixed set up front; don't compile dynamically per render.
- **Custom formatters survive `clearCache()`.** Cache holds compiled tokens, not registered formatters. Re-registering on every page load is harmless but wasteful — register once at app boot.
- **`registerFormatter` is global.** Two calls with the same name overwrite. Namespace your formatters (`acme.fancy`) if you ship a library that re-uses `MustacheFormatter`.

## Related Docs

- [`core/Templates.md`](../core/Templates.md) — Mustache syntax + pitfall reference. **Read the pitfalls section.**
- [`core/DataFormatter.md`](../core/DataFormatter.md) — full list of 80+ built-in `|pipe` formatters.
- [`core/View.md`](../core/View.md) — the standard rendering pipeline; uses `MustacheFormatter` internally.
