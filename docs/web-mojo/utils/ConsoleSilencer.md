# ConsoleSilencer

**Filter `console.*` output by level. Installed by default in every `web-mojo` app at boot.**

`web-mojo` patches the global `console` to enforce a log level. `console.error` and `console.warn` always pass; `console.log` / `info` are gated to `info` level or higher; `console.debug` / `trace` / `group` are gated to `debug` level. The default level is **`warn`** in production and **`debug`** in dev.

This page explains the levels, the runtime overrides (URL param + `localStorage`), and how to opt out.

## Table of Contents

- [Overview](#overview)
- [Default Behavior](#default-behavior)
- [Runtime Overrides](#runtime-overrides)
- [API](#api)
- [Levels](#levels)
- [Common Pitfalls](#common-pitfalls)
- [Related Docs](#related-docs)

## Overview

`src/index.js` calls `ConsoleSilencer.install({ level: 'warn' })` at module load. The patched console:

- Lets `console.error` / `warn` through always.
- Lets `console.info` / `log` / `dir` / `table` through at level `info` or above (4 = `debug`, 3 = `info`, 2 = `warn`, …).
- Lets `console.debug` / `trace` / `group` / `time` through at level `debug` or above.
- `console.assert(cond, ...)` — when `cond` is falsy, behaves like `console.error`. Passing assertions are no-ops at every level.

The patch is **idempotent** — calling `install()` twice doesn't double-wrap. `uninstall()` restores the original `console`.

## Default Behavior

```
production: level = 'warn'  (warn + error visible; everything else dropped)
dev:        level = 'debug' (everything except trace visible)
```

"Dev" is detected by (in order):

1. `import.meta.env.DEV` (Vite/ESM bundler signal).
2. `globalThis.__DEV__` (custom bundler `define`).
3. `process.env.NODE_ENV !== 'production'` (Node-style fallback).
4. `false` if none of the above is set.

## Runtime Overrides

You can change the level without rebuilding via URL param or `localStorage`:

### URL param

```
https://app.example.com/?logLevel=debug
https://app.example.com/?loglevel=info
https://app.example.com/?mojoLog=trace
```

All three keys (`logLevel`, `loglevel`, `mojoLog`) are accepted. Use this for one-off debugging without persisting.

### `localStorage`

```js
localStorage.setItem('MOJO_LOG_LEVEL', 'debug');
location.reload();
```

Persists across reloads and tabs on the same origin. Clear with `localStorage.removeItem('MOJO_LOG_LEVEL')`.

### Programmatic

```js
import { ConsoleSilencer } from 'web-mojo';

ConsoleSilencer.setLevel('debug');                 // changes level for the current session
ConsoleSilencer.setLevel('debug', { persist: true }); // also writes to localStorage
```

### Resolution order

When `install()` runs:

1. Explicit `options.level` from `install({ level: 'error' })`.
2. URL param.
3. `localStorage` value.
4. Environment default (`debug` in dev, `warn` in prod).

The first non-null wins.

## API

```js
import { ConsoleSilencer, installConsoleSilencer } from 'web-mojo';
```

`ConsoleSilencer` is a singleton; `installConsoleSilencer(options)` is a convenience function that just calls `ConsoleSilencer.install(options)`.

| Method | Behavior |
|---|---|
| `install(options)` | Patch the global `console`. Idempotent. `options.level` accepts a string (`'warn'`) or number (`2`). |
| `uninstall()` | Restore the original `console`. Idempotent. |
| `setLevel(level, { persist = false })` | Change level at runtime. `persist: true` writes to `localStorage`. Invalid levels are ignored. |
| `getLevel()` | Current numeric level. |
| `getLevelName()` | Current level name (`'warn'`, `'debug'`, …) or `null`. |
| `criticalOnly({ persist })` | Shorthand: `setLevel('warn')`. |
| `errorsOnly({ persist })` | Shorthand: `setLevel('error')`. |
| `silent({ persist })` | Shorthand: `setLevel('silent')`. |
| `verbose({ persist })` | Shorthand: `setLevel(isDev ? 'debug' : 'info')`. |
| `allowAll({ persist })` | Shorthand: `setLevel('trace')`. |
| `withTemporaryLevel(level, fn)` | Run `fn()` with the level temporarily set; restore on return (try/finally). Synchronous body only. |
| `LEVELS` | Map: `{ silent: 0, error: 1, warn: 2, info: 3, log: 3, debug: 4, trace: 5, all: 5 }`. |

When installed, `ConsoleSilencer` also exposes itself as `globalThis.MOJOConsoleSilencer` for quick console-only debugging.

## Levels

| Numeric | Name(s) | Methods that pass |
|---|---|---|
| `0` | `silent` | (nothing) |
| `1` | `error` | `error`, `assert` (on failure) |
| `2` | `warn` | the above + `warn` |
| `3` | `info` / `log` | the above + `info`, `log`, `dir`, `table` |
| `4` | `debug` | the above + `debug`, `group`, `groupCollapsed`, `groupEnd`, `time`, `timeEnd`, `timeLog` |
| `5` | `trace` / `all` | the above + `trace` |

`log` is an alias for `info` (level 3). `all` is an alias for `trace` (level 5).

## Common Pitfalls

- **Default is `warn` in production**, so `console.log` calls disappear. If you see "my logs vanished", set `?logLevel=debug` or `localStorage.MOJO_LOG_LEVEL=debug`.
- **`uninstall()` is rarely what you want.** It restores the original console for the rest of the page lifetime. For a temporary bypass, use `withTemporaryLevel('trace', () => { … })` or call `setLevel('debug')` and switch back manually.
- **`withTemporaryLevel` doesn't await.** If `fn` returns a promise, the level resets *before* the promise resolves. For async blocks, set the level explicitly and reset in a `finally`.
- **Bypass for emergency-only logging.** If you really need to log past a `silent` setting (e.g. uncaught error reporter), grab the original console once before install: `const native = console;` — but better, use `console.error`, which is gated only at `silent`.
- **Per-app isolation isn't supported.** The patch replaces the global `console`. If you run two `web-mojo` apps on the same page, they share the level. Last `install()` wins.
- **The `MOJOConsoleSilencer` global exists for browsers**, not for SSR. In a Node environment without `window`, the install is a no-op but doesn't error.

## Related Docs

- [`core/WebApp.md`](../core/WebApp.md) — `web-mojo` boot installs the silencer at `level: 'warn'` before `WebApp` runs.
- [`utils/MOJOUtils.md`](./MOJOUtils.md) — other utilities exported from the main entry.
