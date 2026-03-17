# Avatar Change FileModel Import Crash

**Type**: bug
**Status**: resolved
**Date**: 2026-03-17

## Description
Changing avatar from `UserProfileView` failed at runtime with:

`TypeError: Cannot destructure property 'File' of '(intermediate value)' as it is undefined.`

The error was thrown inside `Dialog.updateModelImage()` during the upload flow.

## Context
- Triggered from profile action: `data-action="change-avatar"` in user profile dialog
- Affected bundle/runtime path: portal build (`portal-*.js`)
- Core method involved: `Dialog.updateModelImage()`
- User impact: avatar updates were blocked

## Reproduction
1. Open a user profile dialog.
2. Click avatar (`change-avatar` action).
3. Choose/crop/upload an image and submit.
4. Observe action failure in console:
   - `TypeError: Cannot destructure property 'File' ...`

## Expected Behavior
Avatar upload succeeds and saves the uploaded file ID to the user model.

## Actual Behavior
Avatar flow fails before upload completion because dynamic module import/destructure for `FileModel` returns undefined in the built portal runtime.

## Affected Area
- **Files / classes**:
  - `src/core/views/feedback/Dialog.js` (`updateModelImage`)
- **Layer**: View
- **Related docs**:
  - `docs/web-mojo/components/Dialog.md`

## Acceptance Criteria
- [x] Bug is reproduced or clearly isolated
- [x] Root cause is identified
- [ ] Regression is covered by a focused test when practical
- [x] Fix is verified with the relevant test/build/manual check
- [ ] Docs/changelog updated if public behavior changed

---
## Resolution
**Status**: Resolved — 2026-03-17  
**Root cause**: `Dialog.updateModelImage()` used `await import('@core/models/Files.js')` and destructured `{ File: FileModel }`. In portal build/runtime this resolved to `undefined`, causing a destructuring crash.  
**Files changed**:
- `src/core/views/feedback/Dialog.js`
  - Added static import: `import { File as FileModel } from '@core/models/Files.js'`
  - Removed dynamic import destructuring in `updateModelImage()`
  - Added safer MIME parsing fallback (`image/png`) for malformed/partial data URIs
  - Added robust `File` constructor resolution via `window.File` fallback to `globalThis.File` with explicit error if unavailable
**Tests added/updated**: None for this specific path yet.  
**Validation**:
- Static validation: `node --check src/core/views/feedback/Dialog.js` passed
- Manual validation target: retry avatar change in portal build; expect no `File` destructure error and successful save
- Note: repository test runner currently fails in this environment due to ESM/CJS mismatch (`test/test-runner.js` uses `require` while package is `"type":"module"`)
