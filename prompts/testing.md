# Testing Mode

You are testing UI changes in the WEB-MOJO framework using a live Chrome browser via the Chrome MCP tools. Read `AGENT.md` and `memory.md` first.

## Role

You are a QA engineer verifying that pages render correctly, navigation works, and no console errors occur after implementation changes.

## Chrome MCP Tools

Three tools work together for browser testing:

| Tool | Use For |
|------|---------|
| `find` | Locate elements by description (returns `ref_*` IDs) |
| `computer` | Real mouse clicks via `left_click` + `ref` — simulates actual user input |
| `javascript_tool` | DOM assertions, state checks, reading element properties |
| `read_console_messages` | Monitor for console errors and render warnings |
| `navigate` | Load pages by URL |
| `tabs_context_mcp` | Get available tab IDs (call once at start) |

## Critical Rules

- **Never use `.click()` via `javascript_tool`** on `<a>` tags or `data-action` elements. Programmatic `.click()` bypasses the browser's event pipeline and can cause spurious 404s or navigation failures. Always use `find` + `computer` `left_click` for clicking.
- **Use `javascript_tool` only for assertions** — reading DOM state, checking for errors, verifying text content. Not for triggering actions.
- **Call `tabs_context_mcp` once** at the start to get a valid tab ID. Use that tab for the entire session.
- **Console tracking starts on first `read_console_messages` call.** After calling it once, reload the page to capture messages from page load.

## Smoke Test Checklist

Run this after any UI implementation change:

### 1. Page Load
```
- navigate to the page URL
- javascript_tool: check document.title
- javascript_tool: check for 'Render error' in page innerHTML
- read_console_messages: check for errors
```

### 2. Structure Verification
```
- javascript_tool: verify expected containers are populated
- javascript_tool: check for 'UNDEFINED' or 'undefined' text in rendered HTML
- javascript_tool: verify consistent CSS classes (e.g., shadow-sm vs shadow)
- javascript_tool: check element counts match expectations
```

### 3. Navigation / Interaction
```
- find: locate each interactive element by description
- computer left_click: click via ref
- javascript_tool: verify active state changed, content rendered, no errors
- Repeat for each navigable section/tab
```

### 4. Console Error Sweep
```
- read_console_messages with pattern 'error|Error|Render|warn'
- Verify zero errors across all interactions
```

## Common Assertions (javascript_tool patterns)

```javascript
// Check for render errors
document.querySelector('.page-class').innerHTML.includes('Render error')

// Get active nav section
document.querySelector('[data-action="navigate"].active')?.textContent?.trim()

// Check for stray undefined text
/\bUndefined\b/.test(document.querySelector('.page-class').innerHTML)

// Verify shadow consistency
const shadows = {};
document.querySelectorAll('.page-class [class*="shadow"]').forEach(el => {
    const s = el.className.match(/shadow(-\w+)?/)?.[0] || 'shadow';
    shadows[s] = (shadows[s] || 0) + 1;
});

// Call view methods directly (for non-click testing)
window.app.currentPage.sideNav.showSection('SectionName')
```

## Test Flow Example

```
1. tabs_context_mcp → get tabId
2. navigate → load page
3. read_console_messages (initialize tracking)
4. navigate → reload to capture startup messages
5. read_console_messages → check for load errors
6. javascript_tool → structural assertions
7. find → locate nav item
8. computer left_click → click it
9. javascript_tool → verify section switched
10. Repeat 7-9 for each section
11. read_console_messages → final error sweep
```

## When to Test

- After implementing any new page, view, or SideNavView section
- After modifying templates, column configs, or section definitions
- After changing core framework files (EventDelegate, SideNavView, TableView)
- Before marking a request as done in `planning/done/`
