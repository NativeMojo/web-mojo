---
globs: ["test/**/*.js", "test/**/*.html"]
---

# Testing Rules

## Test Framework
- This repo uses a custom test runner: `node test/test-runner.js`.
- Do not assume standard Jest CLI flow even though many tests use Jest-style globals.
- Test suites live in `test/unit/`, `test/integration/`, and `test/build/`.
- Tests inside a single file run **sequentially** (one `it()` at a time). It is safe to mutate shared globals (`global.fetch`, `global.localStorage`, `global.AbortSignal`) in `beforeEach` / `afterEach` without per-test isolation tricks.

## Running Tests
- `npm test` — full custom test runner
- `npm run test:unit` — unit suite (fastest feedback loop)
- `npm run test:integration` — integration suite
- `npm run test:build` — build suite
- `npm run lint` — ESLint (runs on `src/**/*.js` only)
- Pick the narrowest command that proves the change.
- To run a single file, temporarily `delete` or move the others in `test/unit/` — there is no `--grep` for individual files.

## Test File Conventions

Two file shapes are supported. Match the area you are editing.

**CommonJS** (preferred for most unit tests):
```js
module.exports = async function(testContext) {
    const { describe, it, expect, beforeEach, afterEach } = testContext;
    const { testHelpers } = require('../utils/test-helpers');
    const { loadModule } = require('../utils/simple-module-loader');

    await testHelpers.setup();
    const View = loadModule('View'); // handles @core/... aliases
    // ...
};
```

**ESM** (use when the file under test already needs top-level `import`):
```js
import View from '../../src/core/View.js';

describe('View', () => {
    // `describe`, `it`, `expect`, `beforeEach`, `afterEach` are installed as globals
    // by the runner while this file executes.
});
```

The runner auto-detects ESM via top-level `import` and loads it with dynamic `import()`. No `package.json` changes needed.

## Loading Source Modules

- **Prefer** `loadModule('Name')` from `test/utils/simple-module-loader.js` — it transforms `@core/...` imports so they resolve without a Vite toolchain.
- **Avoid** `require('../../src/core/Foo.js').default` for files that use `@core/` imports — Node ESM can't resolve the alias and the whole test file fails at load time.
- The loader exposes: `EventBus`, `EventEmitter`, `EventDelegate`, `Router`, `Rest`, `dataFormatter`, `MOJOUtils`, `Model`, `RestModel`, `Collection`, `View`, `Page`.
- `Rest` is exported two ways from `src/core/Rest.js`: `import rest from '...'` (singleton, default) and `import { Rest } from '...'` (class, for `new Rest()` in tests).

## Mocks and Matchers

`jest.fn()` from `test/utils/test-helpers.js` provides:
- `.mock.calls`, `.mock.instances`, `.mock.results`
- `.mockReturnValue(v)` / `.mockReturnValueOnce(v)`
- `.mockResolvedValue(v)` / `.mockResolvedValueOnce(v)`
- `.mockRejectedValue(v)` / `.mockRejectedValueOnce(v)`
- `.mockImplementation(fn)` / `.mockImplementationOnce(fn)`
- `.mockClear()`, `.mockReset()`, `.mockRestore()`
- `jest.spyOn(obj, 'method')`, `jest.clearAllMocks()`, `jest.resetAllMocks()`, `jest.restoreAllMocks()`

`expect(...)` supports:
- `toBe`, `toEqual` (deep, with asymmetric-matcher support), `toBeTruthy`, `toBeFalsy`, `toBeNull`, `toBeDefined`, `toBeUndefined`
- `toContain`, `toMatch`, `toHaveLength`, `toBeInstanceOf`
- `toBeGreaterThan`, `toBeGreaterThanOrEqual`, `toBeLessThan`, `toBeLessThanOrEqual`
- `toThrow(msg?)`
- `toHaveBeenCalled`, `toHaveBeenCalledTimes(n)`, `toHaveBeenCalledWith(...args)`
- `toHaveProperty('path.to.prop', value?)`
- `.not.*` variants for the above
- Asymmetric matchers: `expect.any(Type)`, `expect.objectContaining({...})`, `expect.arrayContaining([...])`, `expect.stringContaining(s)`, `expect.stringMatching(re)`

If a needed matcher is missing, **add it to `test/test-runner.js`** rather than working around it — the runner is the single source of truth.

## Reference Patterns
- `test/unit/EventBus.test.js` — pure-CommonJS, no jest mocks (simplest).
- `test/unit/Rest.test.js` — `jest.fn()` / `beforeEach` / `afterEach` with global swapping.
- `test/unit/TokenManager.test.js` — `jest.spyOn` on singletons, `async` tests.
- `test/unit/TableRow.test.js` — ESM test file.

## Test Conventions
- For bug fixes, add a regression test when practical. The regression must fail before the fix and pass after.
- Never write a test that passes while the bug still exists.
- Never "fix" a test to hide a bug — fix the production code.
- Keep regression tests narrow and easy to understand.
- If the bug is not testable with current harnesses, say so explicitly.

## Chrome UI Testing
- When Chrome MCP tools are available, use `find` + `computer left_click` for real mouse interaction.
- **Never use `.click()` via `javascript_tool`** on `<a>` tags or `data-action` elements — it bypasses the event pipeline and causes spurious 404s.
- Use `javascript_tool` only for DOM assertions (reading state, checking for errors, verifying text content).
- Call `tabs_context_mcp` once at the start to get a valid tab ID.

## When to Add Tests
- Behavior changes in a reusable framework primitive
- A regression is being prevented
- The request explicitly asks for test coverage
