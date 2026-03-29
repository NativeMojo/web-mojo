# SideNavView — No Loading Indicator on Section Switch

**Type**: bug
**Status**: open
**Date**: 2026-03-28

## Description
When clicking a nav item in SideNavView, there is no loading indicator while the new section renders. Many section views make API calls in `onBeforeRender()`, so there can be a noticeable delay with zero visual feedback — the user clicks and nothing happens until the API responds.

This affects every SideNavView usage (UserView, GroupView, etc.) and every section that fetches data.

## Root Cause
`SideNavView.showSection()` (line 317) calls `_mountSection()` which calls `view.render()` — but never wraps it with `showLoading()` / `hideLoading()`. The content panel just sits empty or shows the old section until the new one finishes its async work.

## Fix
In `SideNavView._mountSection()` or `showSection()`, wrap the render call with loading feedback. The framework provides `showLoading()` / `hideLoading()` for this — show it on the content panel while the section renders.

## Affected Area
- **Files / classes**: `src/core/views/navigation/SideNavView.js` — `showSection()` (line 317), `_mountSection()` (line 358)
- **Layer**: Core (view)

## Acceptance Criteria
- [ ] Clicking a nav item shows a loading indicator in the content panel immediately
- [ ] Loading indicator clears when the section finishes rendering
- [ ] Fast sections (no API calls) don't flash the loader unnecessarily
- [ ] Works in both sidebar and dropdown modes
