# `web-mojo/admin` package alias doesn't export `registerAdminPages` / `registerAssistant`

**Type**: bug
**Status**: resolved
**Date**: 2026-04-26

## Description

The `web-mojo/admin` import subpath alias (declared in `vite.config.js` as `web-mojo/admin → src/extensions/admin/index.js`) only re-exports the admin page CLASSES (UserTablePage, GroupTablePage, IncidentTablePage, etc.). It does NOT export the registration helpers `registerAdminPages` and `registerAssistant`, which live in `src/admin.js`.

A downstream consumer using only the package surface (`from 'web-mojo/admin'`) has no way to wire admin pages into their portal — they have to reach into `/src/admin.js` directly, breaking the package contract.

## Reproduction

```js
// What a consumer wants:
import { registerAdminPages, registerAssistant } from 'web-mojo/admin';
// → SyntaxError: 'registerAdminPages' is not exported

// What they're forced to do:
import { registerAdminPages, registerAssistant } from '/src/admin.js';
// or
import { registerAdminPages, registerAssistant } from 'web-mojo/dist/admin.es.js';
```

## Expected Behavior

Either:
- `src/extensions/admin/index.js` re-exports `registerAdminPages` (and the alias `registerSystemPages`) and `registerAssistant`, OR
- `src/admin.js` is what the `web-mojo/admin` alias points at instead of `src/extensions/admin/index.js`.

## Affected Area
- `src/extensions/admin/index.js` — currently lacks the register-helper re-exports.
- `src/admin.js` — where the helpers actually live.
- `vite.config.js` and `package.json` `exports` — confirm the build config aliases match.

## Surfaced By

Wave 2.5 examples portal needed `registerAdminPages` and `registerAssistant`. The portal shell uses `from '/src/admin.js'` as a workaround (allowed for shells, not for canonical examples) but flagged for cleanup.

---
## Resolution
**Status**: resolved
**Date**: 2026-04-25

Added a single re-export line at the bottom of `src/extensions/admin/index.js`:

```js
export { registerSystemPages, registerAdminPages, registerAssistant } from '../../admin.js';
```

No circular import — `src/admin.js` imports individual page-class files directly (e.g. `@ext/admin/account/AdminDashboardPage.js`), never the barrel.

### Files changed
- `src/extensions/admin/index.js` — added re-export of `registerSystemPages`, `registerAdminPages`, `registerAssistant` from `../../admin.js`.
- `examples/portal/app.js` — switched workaround `import … from '/src/admin.js'` back to `from 'web-mojo/admin'`. Removed the now-stale comment block explaining the workaround.

### Verification
- `npm run build:lib` — succeeded. `dist/admin.es.js` now exports `registerAdminPages`, `registerAssistant`, and `registerSystemPages` (confirmed by grep on the bundle).
- `node test/test-runner.js --suite unit` — 432/432 passed.
- The package surface contract is restored: downstream consumers can now `import { registerAdminPages, registerAssistant } from 'web-mojo/admin'` without reaching into `/src/admin.js`.
