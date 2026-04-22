# SideNavView not exported from framework entry point

| Field | Value |
|-------|-------|
| Type | bug |
| Status | open |
| Date | 2026-04-15 |
| Severity | medium |

## Description
`SideNavView` exists at `src/core/views/navigation/SideNavView.js` but is not exported from the framework entry point (`src/index.js`). Consumers cannot import it via `import { SideNavView } from 'web-mojo'`.

## Context
All other navigation views in `src/core/views/navigation/` (`TopNav`, `Sidebar`, `TabView`, `SimpleSearchView`) are exported from `src/index.js` (lines 65-68). `SideNavView` was added in commit `3809164` but was never wired into the public exports.

## Acceptance Criteria
- `SideNavView` is exported as a named default export from `src/index.js`, consistent with the other navigation view exports.
- Consumers can `import { SideNavView } from 'web-mojo'`.

## Investigation
- **Likely root cause:** Export was simply never added when the file was created.
- **Confidence:** high
- **Code path:** `src/index.js:65-68` (navigation view exports section), `src/core/views/navigation/SideNavView.js`
- **Regression test:** not feasible — this is a missing export, verifiable by inspection or import check.
- **Related files:** `src/index.js`, `src/core/views/navigation/SideNavView.js`
