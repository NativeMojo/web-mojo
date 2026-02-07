# Location Extension (Address Suggestions + Place Details)

MOJO’s Location extension provides **address suggestions (autocomplete)** and **place details** that can automatically populate your form fields (city/state/ZIP/country/lat/lng, etc.).

It is designed to be **opt-in**:
- Nothing is active until you register the plugin.
- You can use it as a **custom field type** (`type: "address"`) or opt-in via a **data attribute** on any text input.

This guide explains how to add it to your app using the published framework package, and it explains each plugin option in practical terms.

Key idea: the extension is a **Form plugin** that can do two separate things:
1) **Register a field type** (so your `FormBuilder/FormView` understands `type: "address"`), and
2) **Bind autocomplete behavior** to inputs (either those `type: "address"` fields, or any input that opts-in via an attribute).

It also suppresses the browser’s native address autofill UI for this suggestion input by default (see “Browser autocomplete suppression” below).

---

## What you get

When enabled, the Location extension can provide:

- **Address suggestions** as the user types
- **Place details lookup** on selection
- **Automatic field population** (mapped from details to your form fields)
- Dialog helpers:
  - **Pick Location** (search + select with preview map)
  - **Location Details** (formatted address + map)

---

## Install / Import Paths (Production)

The Location extension is part of the `map` entrypoint.

Use:

```/dev/null/example.js#L1-8
import { registerLocationPlugin } from 'web-mojo/map';
import { showLocationPickerDialog, showLocationDetailsDialog } from 'web-mojo/map';
```

Notes:
- In this repo’s examples you may see imports from `/src/...` for local development. In production apps, use `web-mojo/map`.

---

## Quick Start (Recommended)

### 1) Register the plugin once (at app startup)

In most apps you can use **zero-config defaults**:

```/dev/null/example.js#L1-7
import { registerLocationPlugin } from 'web-mojo/map';

registerLocationPlugin();
```

This enables sensible defaults:
- Registers the `address` field type (so `type: "address"` works in `FormView` configs)
- Auto-binds autocomplete to `type: "address"` fields after the form renders
- Also binds to opt-in inputs using the default attribute selector (`data-location="address"`)
- Suppresses browser autofill/autocomplete overlays on this suggestion input (see below)

If you need to customize API paths, field mapping, or behavior tuning, pass options:

```/dev/null/example.js#L1-36
import { registerLocationPlugin } from 'web-mojo/map';

registerLocationPlugin({
  basePath: '/api',            // optional prefix for endpoints (works with core Rest baseURL)
  registerFieldType: true,     // registers a custom form field type
  fieldTypeName: 'address',    // default

  // Browser autofill/autocomplete suppression (recommended for suggestion inputs)
  suppressBrowserAutocomplete: true,      // default: true
  autocompleteValue: 'new-password',      // default: 'new-password'

  // Map from API details keys -> your form field names
  mapping: {
    address1: 'address1',
    city: 'city',
    state_code: 'state',
    postal_code: 'postal_code',
    country_code: 'country',
    latitude: 'lat',
    longitude: 'lng',
    formatted_address: 'formatted_address',
    place_id: 'place_id'
  },

  // Optional tuning
  minChars: 3,
  debounceMs: 200
});
```

What happens when you call `registerLocationPlugin(...)`:
- The plugin becomes available to `FormView` and is invoked after forms render.
- If `registerFieldType: true`, the plugin also registers a new **field type renderer** so you can use `type: "address"` in your form config.
- Regardless of field type registration, the plugin can still bind to opt-in inputs via attributes (see “Alternate Usage” below).
- If `suppressBrowserAutocomplete: true`, the plugin will set input attributes that discourage native browser address autofill UI from appearing and covering MOJO’s suggestions dropdown.

### 2) Use the `address` field type in your `FormView` config

```/dev/null/example.js#L1-28
const formConfig = {
  fields: [
    { name: 'address1', type: 'address', label: 'Address', placeholder: 'Start typing an address', columns: 12 },

    { name: 'city', type: 'text', label: 'City', columns: 6 },
    { name: 'state', type: 'text', label: 'State', columns: 3 },
    { name: 'postal_code', type: 'text', label: 'ZIP', columns: 3 },

    // Hidden fields populated by place details
    { name: 'place_id', type: 'hidden' },
    { name: 'lat', type: 'hidden' },
    { name: 'lng', type: 'hidden' }
  ]
};
```

Behavior:
- When the user types in the address field (after `minChars`), suggestions appear.
- Selecting a suggestion fetches place details and fills the mapped fields.

---

## Alternate Usage: Opt-in via Attribute (Any Text Input)

If you don’t want to use `type: "address"`, you can opt-in with a data attribute on any text input.

Your plugin registration controls the attribute name via `attributeSelector` (default `data-location`).

Example:

```/dev/null/example.html#L1-3
<input type="text" name="address1" data-location="address" placeholder="Start typing an address" />
```

If the plugin is registered, it will auto-bind autocomplete to:
- `input[data-location="address"]`

---

## API Requirements

The client expects server endpoints for:
- Autocomplete suggestions
- Place details
- Optional geocoding / reverse / timezone (used by dialogs and helper flows)

You can see the full contract in:
- `docs/guide/Location_API.md`

At minimum, autocomplete + details must be implemented for the suggestion input.

---

## Dialog Helpers

The Location extension provides two helpers that are convenient for “search + select” flows.

### Pick Location dialog (search + map preview)

```/dev/null/example.js#L1-16
import { showLocationPickerDialog } from 'web-mojo/map';

const details = await showLocationPickerDialog({
  title: 'Pick a Location',
  height: 260,
  tileLayer: 'osm' // 'osm', 'satellite', 'terrain', 'dark', 'light', etc.
});

if (details) {
  // details contains formatted_address + latitude/longitude + address parts (depending on your API)
}
```

### Location Details dialog (formatted address + map)

```/dev/null/example.js#L1-18
import { showLocationDetailsDialog } from 'web-mojo/map';

// Using a known place_id (the dialog will fetch details)
await showLocationDetailsDialog({ place_id: 'ChIJ2eUgeAK6j4ARbn5u_wAGqWA' });

// Or show pre-existing details (no fetch)
await showLocationDetailsDialog({
  details: {
    formatted_address: '1600 Amphitheatre Pkwy, Mountain View, CA 94043, USA',
    latitude: 37.422,
    longitude: -122.084
  },
  title: 'Location Details'
});
```

---

## Configuration Options

### `registerLocationPlugin(options)`

This registers the Location extension with MOJO’s form plugin system. You typically call it once at app startup.

#### `basePath` (string, default: `''`)
A URL prefix used by the Location client when calling endpoints.

How to think about it:
- If your API endpoints are served under `/api/location/...`, use `basePath: '/api'`.
- This is intended to work with MOJO’s core `Rest` base URL configuration (you set the host/base URL in `Rest`, and `basePath` is the path prefix).

#### `registerFieldType` (boolean, default: `true`)
Controls whether the plugin registers a custom **FormBuilder field type** (default name `"address"`).

- If `true`:
  - You can use `type: 'address'` in your `FormView` field config.
  - The plugin provides the HTML renderer for that field type (it renders a normal text input and marks it for binding).
  - The plugin will also bind autocomplete behavior to those fields after render.
- If `false`:
  - MOJO will NOT recognize `type: 'address'` automatically.
  - You should instead opt-in using the attribute approach (see below) OR provide your own custom field renderer that emits an input with the attribute.

Use `registerFieldType: false` when:
- You already have your own `address`-like field rendering (custom templates/forms), and
- You only want the binding/autocomplete behavior.

#### `fieldTypeName` (string, default: `'address'`)
The field type name to register when `registerFieldType` is enabled.

- If you keep the default: you’ll use `type: 'address'`
- If you change it (e.g. `'location'`): you’ll use `type: 'location'`

This is useful if:
- Your app already has a field type called `"address"`, and you want to avoid naming collisions.

#### `attributeSelector` (string, default: `'data-location'`)
Which attribute the plugin uses to discover opt-in inputs after a form is rendered.

- Default behavior: binds to `input[data-location="address"]`
- If you change it, update your markup accordingly.

Example:
- `attributeSelector: 'data-my-location'` → binds to `input[data-my-location="address"]`

#### `minChars` (number, default: `3`)
Minimum number of typed characters before triggering the autocomplete request.

- Lower values show suggestions sooner but increase API traffic.
- Higher values reduce API traffic and noise.

#### `debounceMs` (number, default: `200`)
Debounce delay (in milliseconds) between keystrokes before calling autocomplete.

- Increase to reduce API traffic.
- Decrease for a more responsive feel.

#### Browser autocomplete suppression (recommended)

Address autocomplete fields are **suggestion inputs**. In most apps you do not want the browser’s native autofill UI showing its own address dropdown (it can cover MOJO’s suggestion dropdown).

These options control that behavior:

#### `suppressBrowserAutocomplete` (boolean, default: `true`)
When enabled, the plugin will set input attributes that discourage native browser autofill/autocomplete UI from appearing.

This is applied in two places:
- When the plugin renders the `address` field type (if `registerFieldType` is enabled), and
- When the plugin binds to opt-in inputs found after render (attribute mode), so your custom markup also benefits.

#### `autocompleteValue` (string, default: `'new-password'`)
The value used for the input’s `autocomplete` attribute when suppression is enabled.

Why the default is `'new-password'`:
- Chrome often ignores `autocomplete="off"` for address-like fields.
- For suggestion inputs, `'new-password'` is commonly effective at preventing the browser’s own overlay from appearing.

If you prefer, you can set:
- `autocompleteValue: 'off'` (may be ignored by some browsers)
- or disable suppression entirely with `suppressBrowserAutocomplete: false`

#### `mapping` (object)
Maps keys returned by your **Place Details** response to your **form field names**.

Format:
- `mapping: { <detailsKey>: <formFieldName> }`

Example:
- `latitude: 'lat'` means: set the form field named `lat` using `details.latitude`.

Important notes:
- Only mapped fields are populated.
- The mapping is applied after a suggestion is selected and details are fetched.
- This is how you wire “selection → fill city/state/zip/lat/lng/place_id”.

Common mappings:
- `address1`, `city`, `state_code`, `postal_code`, `country_code`
- `latitude`, `longitude`
- `formatted_address`
- `place_id`

---

## When to use Field Type vs Attribute Opt-in

### Use `type: "address"` (field type) when:
- You want the simplest integration with `FormView` configs.
- You want the plugin to render the input consistently for you.

### Use attribute opt-in when:
- You already render your own input markup (custom forms/templates).
- You want to enable suggestions on an existing text input without changing your form field type.

Attribute opt-in example (default selector):
```/dev/null/example.html#L1-3
<input type="text" name="address1" data-location="address" placeholder="Start typing an address" />
```

---

## Styling

The suggestions dropdown uses a simple class name:
- `.loc-suggest`

You can style it via your app CSS/theme.

---

## Troubleshooting

### Suggestions don’t show up
- Confirm the plugin registration runs before the form is rendered.
- Check your API base path + core Rest configuration.
- Verify the autocomplete endpoint returns results and the network request succeeds.

### Suggestions show, but fields don’t fill
- Confirm your `mapping` keys match the API’s details response keys.
- Confirm the mapped form field names exist in your form (and are spelled correctly).

### Chrome autocomplete overlays the suggestions dropdown
The address input is a suggestion/search field; you generally do **not** want browser autocomplete here.
If your browser still overlays suggestions, ensure the input has browser autocomplete suppressed (for example `autocomplete="new-password"`). The extension attempts to set appropriate input attributes, and MOJO may also set defaults for suggestion inputs at the form builder level.

---

## Developer Notes

- The plugin uses a small helper that attaches suggestions behavior to a field and returns a disposer.
- The binding is designed to avoid double-binding the same field.
- Selection flow typically:
  1) Autocomplete query
  2) User selects a suggestion
  3) Place Details fetch
  4) Mapped fields populated via `FormView.setFieldValue(...)` when available (and DOM events dispatched)

---

## Example Project

A complete working example exists in this repo:
- `examples/location/`

That example demonstrates:
- registering the plugin
- building a `FormView` with `type: "address"`
- using the picker/details dialogs
- mapping details into your form fields