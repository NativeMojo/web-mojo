# UI Design Guidelines

## Overview

This document outlines the core principles and best practices for designing user interfaces within our web framework. Our goal is to deliver clean, minimal, responsive interfaces using native [Bootstrap](https://getbootstrap.com) components wherever possible. This framework powers business portals and dashboards — performance, clarity, and density of information are key.

We aim for **utility over decoration**, **clarity over cleverness**, and **consistency over customization**.

---

## Design Principles

### 1. Simplicity First

- Favor Bootstrap's built-in components and styles.
- Avoid custom styling unless Bootstrap lacks necessary support.
- Keep interfaces minimal. Eliminate visual noise.

### 2. Information Density

- Prioritize layouts that fit the maximum useful data onscreen, especially on large displays.
- Avoid oversized paddings and excessive white space.
- Use sm and compact variants where applicable (e.g. tables, forms).

### 3. Consistency

- Use a standardized set of UI components across all modules.
- Typography, spacing, icons, and buttons should behave and look the same everywhere.

### 4. Responsiveness

- Use the Bootstrap grid system and utility classes to ensure the layout works on all screen sizes.
- Avoid hardcoded widths or inline styles.

---

## Component Guidelines

### Typography

- Use Bootstrap defaults:
  - font-size-base: ~16px (updated from 14px in Bootstrap 5)
  - font-weight-base: 400
- Avoid custom fonts or sizes unless necessary.
- Headings (h1–h6) should follow semantic use, not just visual size.

### Navigation

**Use href-based navigation as the primary approach** for SEO-friendly, accessible links.

- **Primary**: Use proper `href` attributes for all navigation links
- **Enhanced**: Use `data-page` for complex navigation with parameters
- **External**: Add `data-external` for links that should not be intercepted

```html
<!-- Primary: Clean, SEO-friendly navigation -->
<a href="/">Home</a>
<a href="/users/123">User Profile</a>

<!-- Enhanced: Page navigation with parameters -->
<button data-page="settings" data-params='{"tab": "account"}'>Account Settings</button>

<!-- External: Bypass router interception -->
<a href="https://docs.example.com" data-external>Documentation</a>
<a href="../" data-external>Parent Directory</a>
```

**Benefits of href Navigation:**
- Right-click → copy link provides real URLs
- Ctrl+click, middle-click work as expected
- SEO crawlers see proper navigation structure
- Screen readers understand semantic navigation
- Progressive enhancement (works without JavaScript)

### Buttons

- Prefer `btn btn-sm btn-primary`, `btn-outline-primary`, or `btn-link`.
- Use `btn-sm` by default to keep UI compact.
- Minimize use of icons inside buttons unless it enhances clarity.

```html
<button class="btn btn-sm btn-primary">Save</button>
<button class="btn btn-sm btn-outline-secondary">Cancel</button>
```

### Forms

- Use `form-control form-control-sm` for all inputs.
- Group fields with Bootstrap 5 grid layout or form groups.
- Inline forms are preferred for search/filter bars.

```html
<input type="text" class="form-control form-control-sm" placeholder="Search...">
```

### Tables

- Always use `table-sm table-bordered table-hover`.
- Use striped rows if needed: `table-striped`.
- Headers should be short and clear.
- Align text properly: numeric columns right-aligned.

```html
<table class="table table-sm table-hover table-bordered">
  <thead class="table-light">
    <tr><th>#</th><th>Name</th><th>Status</th></tr>
  </thead>
  <tbody>
    ...
  </tbody>
</table>
```

### Cards & Containers

- Use `card` only when grouping related elements — avoid visual clutter.
- Avoid deep nesting of cards or panels.

```html
<div class="card mb-2">
  <div class="card-body p-2">
    ...
  </div>
</div>
```

### Modals

- Modals should be small and quick.
- Use `modal-sm` unless a larger form is justified.
- Avoid full-screen modals unless absolutely necessary.

### Alerts

- Use Bootstrap's alert classes for feedback.
- Avoid animations or excessive decoration.
- Alerts should auto-dismiss when appropriate.

```html
<div class="alert alert-success">
  Saved successfully.
</div>
```

---

## Layout & Spacing

### Grid

- Use Bootstrap grid system (row / col) for layout, not custom flex or float logic.
- Avoid nesting grids unless needed.

### Spacing

- Use Bootstrap spacing utilities: `mb-1`, `px-2`, `py-1`, etc.
- Default margin-bottom for blocks: `.mb-2`
- Avoid global paddings; keep spacing local and consistent.

---

## Colors & Themes

- Use Bootstrap's default theme and utility classes: `text-muted`, `bg-light`, `text-danger`, etc.
- Avoid inventing new colors or gradients unless product design requires branding.
- `text-muted`, `text-nowrap`, and `text-truncate` should be used where appropriate to control overflow and enhance legibility.

---

## Icons

- Use Bootstrap Icons or FontAwesome (if included) consistently.
- Keep icon usage minimal and purposeful — do not decorate.
- Use `<i class="bi bi-pencil"></i>` or `<i class="fas fa-check"></i>` inline with text, not alone unless clearly understood.

---

## JavaScript Behavior

- Use Bootstrap's JS components: modal, collapse, dropdown, tooltip.
- Keep interactions fast and unobtrusive.
- Don't replace standard behavior unless it improves UX significantly.

---

## Avoid

❌ Custom themes or CSS frameworks layered on top of Bootstrap

❌ Excessive animation

❌ Tooltips everywhere

❌ Redundant icons (e.g., icons next to every button)

❌ Over-nesting of components (cards in cards in cards)

❌ Overuse of shadow, borders, or gradients

❌ Overly large headers or hero sections

❌ Hash-based navigation (`href="#"` with `data-action="navigate"`)

❌ Links without proper `href` attributes (breaks copy-link functionality)

❌ Intercepting external links without `data-external` attribute

---

## Example UI Stack

- **Base CSS:** Bootstrap 5.x
- **Icons:** Bootstrap Icons (or FontAwesome)
- **JS Interactivity:** Bootstrap native + minimal jQuery (if needed)
- **No frontend frameworks (React/Vue/Angular)** unless specifically part of the project scope

---

## Summary

Stick to Bootstrap. Keep it light. Design for utility and clarity. Always ask:

**"Is this the simplest way to show this?"**
