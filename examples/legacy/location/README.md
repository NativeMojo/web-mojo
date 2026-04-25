# Location Example

This example demonstrates how to enable pluggable “Location & Address” features for forms:

- Address autocomplete as the user types
- Auto-fill of city/state/ZIP/country and coordinates on selection
- A “Pick Location” dialog with suggestions and a live map preview
- A “Location Details” dialog to show a formatted address and a map

Nothing becomes active unless you explicitly register the Location plugin. This keeps core lightweight and makes location features opt-in.

## Prerequisites

- A running dev server for this repo (Vite or your usual workflow)
- Location API endpoints available (see docs/dev/location.md for full contract):
  - POST /location/validate
  - GET  /location/autocomplete
  - GET  /location/place/details
  - POST /location/geocode
  - GET  /location/reverse
  - GET  /location/timezone

You can use `/api` as the base in development, or set a fully-qualified URL like `https://api.example.com/api`.

## How to run

1) Start the dev server:
   - If you use the existing dev scripts (e.g., `npm run dev`), start it as usual.

2) Open this example in your browser:
   - http://localhost:5173/examples/location/ (the port may vary depending on your setup)

You should see a form with an “Address” field and two buttons:
- Pick Location (Dialog)
- Show Details + Map

## What this example shows

- A plugin-based extension that registers an `address` field type with FormBuilder/FormView
- Automatic registration of autocomplete behavior when the plugin is loaded
- Dialog helpers for picking a location or reviewing location details with a map

## How it works

In the example’s script, we register the plugin once, at the top:

```js
import { registerLocationPlugin } from '/src/extensions/map/location/LocationPlugin.js';

registerLocationPlugin({
  baseURL: '/api',            // Change to your API base if needed
  registerFieldType: true,    // Provide the 'address' field type
  fieldTypeName: 'address',

  // Optional: customize mapping from API details -> your form field names
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
  }
});
```

Then we define a form that uses the `address` field type:

```js
const formConfig = {
  fields: [
    { name: 'address1', type: 'address', label: 'Address', placeholder: 'Start typing an address', columns: 12 },

    { name: 'city',  type: 'text', label: 'City', columns: 6 },
    { name: 'state', type: 'text', label: 'State', columns: 3 },
    { name: 'postal_code', type: 'text', label: 'ZIP', columns: 3 },

    { name: 'country', type: 'text', label: 'Country', columns: 6 },
    { name: 'formatted_address', type: 'text', label: 'Formatted', columns: 6 },

    // Hidden fields auto-populated from details:
    { name: 'place_id', type: 'hidden' },
    { name: 'lat', type: 'hidden' },
    { name: 'lng', type: 'hidden' }
  ]
};
```

When the user types at least 3 characters in the address field:
- The plugin calls the Autocomplete endpoint and displays suggestions.
- Selecting a suggestion fetches Place Details and auto-fills the mapped fields.

## Dialogs

Two helper functions are available:

- Pick a location (search + select with preview map):
```js
import { showLocationPickerDialog } from '/src/extensions/map/location/LocationDialogs.js';

const details = await showLocationPickerDialog({
  title: 'Pick a Location',
  height: 260,
  tileLayer: 'osm' // 'osm', 'satellite', 'terrain', 'dark', 'light', etc.
});

if (details) {
  // Example: update your form fields after selection
  setField('formatted_address', details.formatted_address);
  setField('address1', details.address1);
  setField('city', details.city);
  setField('state', details.state || details.state_code);
  setField('postal_code', details.postal_code);
  setField('country', details.country || details.country_code);
  setField('place_id', details.place_id);
  setField('lat', String(details.latitude ?? ''));
  setField('lng', String(details.longitude ?? ''));
}
```

- Show a details dialog (formatted address + map), either from Place ID or from a details object:
```js
import { showLocationDetailsDialog } from '/src/extensions/map/location/LocationDialogs.js';

// Using a known place_id (the dialog will fetch details)
await showLocationDetailsDialog({ place_id: 'ChIJ2eUgeAK6j4ARbn5u_wAGqWA' });

// Or show pre-existing details (no fetch)
await showLocationDetailsDialog({
  details: {
    formatted_address: '1600 Amphitheatre Pkwy, Mountain View, CA 94043, USA',
    latitude: 37.422, longitude: -122.084
  },
  title: 'Location Details'
});
```

## Alternate usage (opt-in via attribute)

Instead of using `type: 'address'`, you can keep a normal text field and opt-in using an attribute:

```html
<input type="text" name="address1" data-location="address" placeholder="Start typing an address" />
```

If the plugin is registered, it automatically binds autocomplete to inputs with `data-location="address"`.

## Configuration

- `registerLocationPlugin({...})`
  - `baseURL`: API base (default `/api`)
  - `registerFieldType`: boolean (default true) – Register custom `address` field type
  - `fieldTypeName`: string (default `'address'`)
  - `attributeSelector`: string (default `'data-location'`) – Inputs with `data-location="address"` are auto-bound
  - `minChars`: number (default 3) – Min characters before suggestions
  - `debounceMs`: number (default 200) – Debounce between keystrokes
  - `mapping`: object – Map from API details keys -> your form field names

- API client (LocationClient)
  - You can create and use a client directly if you prefer:
    ```js
    import LocationClient from '/src/extensions/map/location/LocationClient.js';
    const client = new LocationClient({ baseURL: '/api' });
    const res = await client.autocomplete('1600 Amphitheatre');
    const details = await client.placeDetails({ place_id: res.data[0].place_id });
    ```

## Styling

- The autocomplete dropdown uses a basic `.loc-suggest` class. The example includes minimal styling. You can theme it as you like.

- Dialog map uses `MapView` internally and loads Leaflet from a CDN at runtime.

## Troubleshooting

- “No suggestions show up”
  - Confirm your API is running and reachable (network tab).
  - Validate the baseURL passed to `registerLocationPlugin` matches your dev server/Proxy settings.
  - Check CORS/headers for your API responses.

- “Map not rendering”
  - Ensure the container is visible and has height (the plugin sets height for map preview).
  - Leaflet is loaded at runtime from CDN; if blocked by CSP, adjust CSP to allow the CDN.

- “Fields didn’t auto-fill”
  - Confirm your `mapping` keys match the API details keys (see docs/dev/location.md Place Details response).
  - Confirm your form field names match the mapping target names.

## Security and production notes

- If your API requires auth for place/validate endpoints, pass an auth header function to `LocationClient`.
- Rate limits and cost management: use autocomplete session tokens (client already does this by default).
- Always validate addresses server-side if they are critical to downstream workflows.

## Import paths

This example uses source imports from `/src/...` to avoid requiring a pre-built dist. When consuming from an installed package, switch imports to:

```js
// Package import examples (after you publish a new version)
import { registerLocationPlugin, showLocationPickerDialog, showLocationDetailsDialog } from 'web-mojo/map';
import { MapView } from 'web-mojo/map';
```

## Next steps

- Add custom per-project themes for the suggestion dropdown.
- Provide a combined “Address” compound field type (line1, city, state, postal) rendered as a single group if you want.
- Extend the plugin with optional USPS validation on submit, using `/location/validate`.