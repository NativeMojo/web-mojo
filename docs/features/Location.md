# Location Extension

**Address autocomplete, place details, and geocoding for web-mojo applications**

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
  - [Installation](#installation)
  - [Basic Setup](#basic-setup)
  - [Form Integration](#form-integration)
- [API Reference](#api-reference)
  - [LocationPlugin](#locationplugin)
  - [LocationClient](#locationclient)
  - [Dialog Helpers](#dialog-helpers)
- [Configuration](#configuration)
  - [Plugin Options](#plugin-options)
  - [Field Mapping](#field-mapping)
  - [Browser Autocomplete Suppression](#browser-autocomplete-suppression)
- [Usage Patterns](#usage-patterns)
  - [Field Type Mode](#field-type-mode)
  - [Attribute Opt-in Mode](#attribute-opt-in-mode)
  - [Direct API Usage](#direct-api-usage)
- [Customization](#customization)
  - [Styling](#styling)
  - [Custom Workflows](#custom-workflows)
- [Troubleshooting](#troubleshooting)
- [Implementation Details](#implementation-details)

---

## Overview

The Location extension provides address autocomplete and place detail functionality for MOJO applications. It integrates seamlessly with FormView and supports both declarative field configuration and attribute-based opt-in.

**Key Features:**
- Real-time address suggestions as users type
- Automatic form field population from place details
- Built-in geocoding and reverse geocoding
- Interactive map dialogs for location selection
- Session token management for cost optimization
- Browser autocomplete suppression for clean UX

**Design Philosophy:**
- **Opt-in**: Nothing is active until you register the plugin
- **Flexible**: Works as a field type, attribute opt-in, or direct API
- **Framework-friendly**: Minimal dependencies, works with MOJO's core patterns

**Import Path:**
```javascript
import { registerLocationPlugin } from 'web-mojo/map';
```

---

## Quick Start

### Installation

The Location extension is part of the `web-mojo/map` module.

```javascript
import { 
  registerLocationPlugin,
  showLocationPickerDialog,
  showLocationDetailsDialog 
} from 'web-mojo/map';
```

### Basic Setup

Register the plugin once at application startup:

```javascript
// Minimal setup with defaults
registerLocationPlugin();
```

This enables:
- `type: "address"` field type in FormView configs
- Address autocomplete on `type: "address"` fields
- Attribute opt-in via `data-location="address"`
- Browser autocomplete suppression on suggestion inputs

### Form Integration

**Simple field configuration:**

```javascript
const formConfig = {
  fields: [
    {
      name: 'address1',
      type: 'address',
      label: 'Street Address',
      placeholder: 'Start typing an address',
      columns: 12
    },
    { name: 'city', type: 'text', label: 'City', columns: 6 },
    { name: 'state', type: 'text', label: 'State', columns: 3 },
    { name: 'postal_code', type: 'text', label: 'ZIP', columns: 3 },
    
    // Hidden fields populated automatically
    { name: 'lat', type: 'hidden' },
    { name: 'lng', type: 'hidden' },
    { name: 'place_id', type: 'hidden' }
  ]
};

const form = new FormView({ fields: formConfig.fields });
await form.render(true, container);
```

**User workflow:**
1. User types "1600 Amph..." in the address field
2. Suggestions appear in a dropdown
3. User selects "1600 Amphitheatre Parkway, Mountain View, CA"
4. Form fields populate automatically:
   - `address1`: "1600 Amphitheatre Parkway"
   - `city`: "Mountain View"
   - `state`: "CA"
   - `postal_code`: "94043"
   - `lat`: 37.4224764
   - `lng`: -122.0842499

---

## API Reference

### LocationPlugin

**Registration:**

```javascript
registerLocationPlugin(options?)
```

Returns an unregister function:

```javascript
const unregister = registerLocationPlugin({ /* options */ });
// Later:
unregister();
```

**Plugin Lifecycle Hooks:**
- `onFormViewInit(formView)`: Called when FormView initializes
- `onAfterRender(formView)`: Called after form renders (binds to attribute opt-ins)
- `onFieldInit(formView, fieldEl, fieldConfig)`: Called for each field (binds to field type)
- `onFieldChange(formView, name, value)`: Called on field changes

### LocationClient

Direct API access for custom workflows.

**Constructor:**

```javascript
import { LocationClient } from 'web-mojo/map';

const client = new LocationClient({
  basePath: '/api',           // API prefix (works with Rest baseURL)
  endpoints: {                // Optional: override endpoint paths
    validate: '/location/address/validate',
    autocomplete: '/location/address/suggestions',
    details: '/location/address/place-details',
    geocode: '/location/address/geocode',
    reverse: '/location/address/reverse-geocode',
    timezone: '/location/timezone'
  }
});
```

**Methods:**

#### `validateAddress(address)`

Validates and standardizes a US address.

```javascript
const result = await client.validateAddress({
  address1: '1600 Amphitheatre Parkway',
  city: 'Mountain View',
  state: 'CA',
  postal_code: '94043',
  provider: 'usps'  // 'usps' or 'google'
});

// Returns: { status: true, data: { valid: true, standardized_address: {...}, ... } }
```

#### `autocomplete(query, opts?)`

Gets address suggestions. Automatically manages session tokens.

```javascript
const result = await client.autocomplete('1600 Amph', {
  country: 'US',    // Optional
  lat: 37.7749,     // Optional: location bias
  lng: -122.4194,
  radius: 5000      // Optional: meters
});

// Returns: { 
//   success: true, 
//   session_token: '...', 
//   data: [{ id, place_id, description, main_text, secondary_text, types }],
//   size: 5,
//   count: 5
// }
```

**Session Token Management:**
- First call generates a session token (stored in `client.sessionToken`)
- Subsequent calls reuse the token automatically
- Token is sent to the server in the `session_token` parameter
- Call `client.resetSessionToken()` to start a new session

#### `placeDetails({ place_id, id, session_token })`

Fetches full address details for a selected suggestion.

```javascript
const details = await client.placeDetails({ 
  place_id: 'ChIJ...',
  session_token: client.sessionToken  // Optional, uses stored token if omitted
});

// Returns: {
//   success: true,
//   address: {
//     street_number: '1600',
//     street_name: 'Amphitheatre Parkway',
//     address1: '1600 Amphitheatre Parkway',
//     city: 'Mountain View',
//     state: 'California',
//     state_code: 'CA',
//     postal_code: '94043',
//     country: 'United States',
//     country_code: 'US',
//     formatted_address: '1600 Amphitheatre Pkwy, Mountain View, CA 94043, USA',
//     latitude: 37.4224764,
//     longitude: -122.0842499
//   }
// }
```

#### `geocode(address)`

Converts an address string or object to coordinates.

```javascript
// String input
const result1 = await client.geocode('1600 Amphitheatre Parkway, Mountain View, CA');

// Object input
const result2 = await client.geocode({
  address1: '1600 Amphitheatre Parkway',
  city: 'Mountain View',
  state: 'CA',
  postal_code: '94043'
});

// Returns: { success: true, latitude: 37.4224764, longitude: -122.0842499, ... }
```

#### `reverseGeocode({ lat, lng })`

Converts coordinates to an address.

```javascript
const result = await client.reverseGeocode({ 
  lat: 37.4224764, 
  lng: -122.0842499 
});

// Returns: { 
//   success: true, 
//   formatted_address: '1600 Amphitheatre Pkwy, Mountain View, CA 94043, USA',
//   place_id: '...',
//   address_components: { ... }
// }
```

#### `timezone({ lat, lng })`

Gets timezone information for coordinates.

```javascript
const result = await client.timezone({ 
  lat: 37.4224764, 
  lng: -122.0842499 
});

// Returns: {
//   success: true,
//   timezone_id: 'America/Los_Angeles',
//   timezone_name: 'Pacific Daylight Time',
//   raw_offset: -28800,
//   dst_offset: 3600,
//   total_offset: -25200
// }
```

#### `resetSessionToken()`

Starts a new autocomplete session.

```javascript
client.resetSessionToken();
// Next autocomplete() call will generate a new session token
```

#### `setAuthHeader(header)`

Sets authorization header for API requests.

```javascript
// Static token
client.setAuthHeader('Bearer abc123');

// Dynamic token (function called on each request)
client.setAuthHeader(() => `Bearer ${getToken()}`);
```

#### `normalizeSuggestion(suggestion)`

Normalizes a suggestion object to a consistent format.

```javascript
const normalized = client.normalizeSuggestion(rawSuggestion);
// Returns: { id, place_id, description, main_text, secondary_text, types }
```

### Dialog Helpers

#### `showLocationPickerDialog(options)`

Opens a dialog with address search and map preview.

```javascript
import { showLocationPickerDialog } from 'web-mojo/map';

const details = await showLocationPickerDialog({
  title: 'Pick a Location',        // Dialog title
  placeholder: 'Search address',   // Input placeholder
  confirmText: 'Select',           // Confirm button text
  minChars: 3,                     // Min chars before suggestions
  debounceMs: 200,                 // Typing debounce
  height: 240,                     // Map preview height (px)
  tileLayer: 'osm',                // Map tile layer
  client: myClient                 // Optional: custom LocationClient
});

if (details) {
  // User selected a location
  console.log(details.formatted_address);
  console.log(details.latitude, details.longitude);
} else {
  // User canceled
}
```

**Available tile layers:**
- `'osm'`: OpenStreetMap (default)
- `'satellite'`: Satellite imagery
- `'terrain'`: Terrain map
- `'dark'`: Dark theme
- `'light'`: Light theme

#### `showLocationDetailsDialog(options)`

Shows a dialog with formatted address and map.

```javascript
import { showLocationDetailsDialog } from 'web-mojo/map';

// With place_id (fetches details)
await showLocationDetailsDialog({
  place_id: 'ChIJ...',
  title: 'Location Details',
  height: 260,
  tileLayer: 'osm',
  client: myClient  // Optional
});

// With pre-fetched details (no API call)
await showLocationDetailsDialog({
  details: {
    formatted_address: '1600 Amphitheatre Pkwy, Mountain View, CA 94043, USA',
    latitude: 37.4224764,
    longitude: -122.0842499
  },
  title: 'Selected Location',
  height: 260,
  tileLayer: 'osm'
});
```

---

## Configuration

### Plugin Options

Full configuration example:

```javascript
registerLocationPlugin({
  // API Configuration
  basePath: '/api',                    // Default: '/api'
  
  // Field Type Registration
  registerFieldType: true,             // Default: true
  fieldTypeName: 'address',            // Default: 'address'
  
  // Attribute Opt-in
  attributeSelector: 'data-location',  // Default: 'data-location'
  
  // Behavior Tuning
  minChars: 3,                         // Default: 3
  debounceMs: 200,                     // Default: 200
  
  // Browser Autocomplete Suppression
  suppressBrowserAutocomplete: true,   // Default: true
  autocompleteValue: 'new-password',   // Default: 'new-password'
  
  // Field Mapping
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

**Option Details:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `basePath` | string | `'/api'` | API endpoint prefix (works with Rest baseURL) |
| `registerFieldType` | boolean | `true` | Register `type: "address"` field type |
| `fieldTypeName` | string | `'address'` | Field type name (change to avoid conflicts) |
| `attributeSelector` | string | `'data-location'` | Attribute for opt-in binding |
| `minChars` | number | `3` | Minimum characters before triggering autocomplete |
| `debounceMs` | number | `200` | Typing debounce delay (milliseconds) |
| `suppressBrowserAutocomplete` | boolean | `true` | Suppress native browser autofill UI |
| `autocompleteValue` | string | `'new-password'` | Value for HTML `autocomplete` attribute |
| `mapping` | object | See below | Map API fields to form field names |

### Field Mapping

The `mapping` option controls how place details populate form fields.

**Format:**
```javascript
{
  '<api_field>': '<form_field_name>'
}
```

**Default mapping:**
```javascript
{
  address1: 'address1',           // Street address
  city: 'city',                   // City name
  state_code: 'state',            // Two-letter state code (CA, NY, etc.)
  postal_code: 'postal_code',     // ZIP code
  country_code: 'country',        // Two-letter country code (US, CA, etc.)
  latitude: 'lat',                // Latitude
  longitude: 'lng',               // Longitude
  formatted_address: 'formatted_address',  // Full formatted address
  place_id: 'place_id'            // Google Place ID
}
```

**Available API fields from place details:**
- `street_number`: Street number
- `street_name`: Street name
- `address1`: Combined street address
- `city`: City name
- `county`: County name
- `state`: Full state name (e.g., "California")
- `state_code`: State abbreviation (e.g., "CA")
- `postal_code`: ZIP code
- `country`: Full country name (e.g., "United States")
- `country_code`: Country code (e.g., "US")
- `formatted_address`: Complete formatted address
- `latitude`: Latitude coordinate
- `longitude`: Longitude coordinate
- `place_id`: Google Place ID

**Custom mapping example:**
```javascript
registerLocationPlugin({
  mapping: {
    address1: 'street',           // Map to 'street' field
    city: 'town',                 // Map to 'town' field
    state_code: 'state_abbr',     // Map to 'state_abbr' field
    postal_code: 'zip',           // Map to 'zip' field
    latitude: 'latitude',         // Keep standard name
    longitude: 'longitude',       // Keep standard name
    place_id: 'google_place_id'   // Map to 'google_place_id' field
  }
});
```

**How mapping works:**
1. User selects an address suggestion
2. Plugin fetches place details via API
3. For each mapping entry:
   - Read value from `details[api_field]`
   - Set form field `form_field_name` to that value
4. Both model and DOM are updated
5. `input` and `change` events are dispatched

### Browser Autocomplete Suppression

Address autocomplete is a **suggestion input** (like search), not a form autofill field. Native browser address autofill UI can overlay MOJO's suggestions dropdown, creating a poor user experience.

**Default behavior:**

The plugin automatically suppresses browser autocomplete by setting:
```html
<input 
  type="text"
  autocomplete="new-password"
  autocapitalize="off"
  autocorrect="off"
  spellcheck="false"
  inputmode="search"
  aria-autocomplete="list"
  role="combobox"
/>
```

**Why `autocomplete="new-password"`?**

Chrome often ignores `autocomplete="off"` for address-like fields. Using `"new-password"` is a reliable workaround that prevents browser autofill overlays without breaking functionality.

**Disable suppression:**

If you want native browser autocomplete:
```javascript
registerLocationPlugin({
  suppressBrowserAutocomplete: false
});
```

**Custom autocomplete value:**

```javascript
registerLocationPlugin({
  autocompleteValue: 'off'  // May be ignored by some browsers
});
```

---

## Usage Patterns

### Field Type Mode

**When to use:**
- Building forms with FormView
- Want consistent address field rendering
- Prefer declarative configuration

**Example:**

```javascript
// 1. Register plugin (once at app startup)
registerLocationPlugin();

// 2. Use in FormView config
const form = new FormView({
  fields: [
    {
      name: 'address1',
      type: 'address',  // Uses registered field type
      label: 'Address',
      placeholder: 'Start typing...',
      columns: 12
    },
    { name: 'city', type: 'text', label: 'City', columns: 6 },
    { name: 'state', type: 'text', label: 'State', columns: 3 },
    { name: 'postal_code', type: 'text', label: 'ZIP', columns: 3 }
  ]
});

await form.render(true, container);
// Address field now has autocomplete behavior
```

### Attribute Opt-in Mode

**When to use:**
- Custom form HTML (not using FormView field configs)
- Existing forms where you can't change field type
- Want autocomplete on specific inputs only

**Example:**

```html
<!-- Your custom form markup -->
<form>
  <label for="street">Address</label>
  <input 
    type="text" 
    id="street" 
    name="address1" 
    data-location="address"
    placeholder="Start typing an address"
  />
  
  <label for="city">City</label>
  <input type="text" id="city" name="city" />
  
  <label for="state">State</label>
  <input type="text" id="state" name="state" />
</form>
```

```javascript
// Plugin automatically binds to data-location="address"
registerLocationPlugin({
  attributeSelector: 'data-location',  // Default
  mapping: {
    address1: 'address1',
    city: 'city',
    state_code: 'state',
    postal_code: 'postal_code'
  }
});
```

**Custom attribute selector:**

```javascript
registerLocationPlugin({
  attributeSelector: 'data-autocomplete'
});
```

```html
<input type="text" name="address1" data-autocomplete="address" />
```

### Direct API Usage

**When to use:**
- Custom workflows beyond form autocomplete
- Need geocoding/reverse geocoding
- Building custom location selection UI
- Integration with non-MOJO forms

**Example: Custom autocomplete logic**

```javascript
import { LocationClient } from 'web-mojo/map';

const client = new LocationClient();

// Custom search handler
async function handleAddressSearch(query) {
  const result = await client.autocomplete(query);
  
  // Custom rendering
  const suggestions = result.data.map(item => ({
    label: item.description,
    value: item.place_id
  }));
  
  renderCustomDropdown(suggestions);
}

// Custom selection handler
async function handleAddressSelect(placeId) {
  const result = await client.placeDetails({ place_id: placeId });
  const address = result.address;
  
  // Custom form population
  document.getElementById('address1').value = address.address1;
  document.getElementById('city').value = address.city;
  document.getElementById('state').value = address.state_code;
  document.getElementById('zip').value = address.postal_code;
}
```

**Example: Geocode user input**

```javascript
const client = new LocationClient();

// User manually enters address
const userInput = document.getElementById('address').value;

// Geocode to get coordinates
const result = await client.geocode(userInput);

if (result.success) {
  console.log('Coordinates:', result.latitude, result.longitude);
  console.log('Standardized:', result.formatted_address);
  
  // Show on map
  showMapMarker(result.latitude, result.longitude);
}
```

**Example: Reverse geocode coordinates**

```javascript
const client = new LocationClient();

// User clicks on map
function handleMapClick(lat, lng) {
  const result = await client.reverseGeocode({ lat, lng });
  
  if (result.success) {
    console.log('Address:', result.formatted_address);
    
    // Populate form
    populateAddressForm(result.address_components);
  }
}
```

---

## Customization

### Styling

The suggestions dropdown uses a simple class name that you can style:

**CSS class:** `.loc-suggest`

**Default inline styles:**
```css
.loc-suggest {
  position: absolute;
  z-index: 10000;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,.08);
  padding: 4px 0;
  max-height: 280px;
  overflow-y: auto;
}
```

**Override with your theme:**

```css
/* Custom suggestion dropdown styling */
.loc-suggest {
  background: var(--dropdown-bg);
  border: 1px solid var(--dropdown-border);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-lg);
}

.loc-suggest > div {
  padding: 12px 16px;
  color: var(--text-color);
}

.loc-suggest > div:hover {
  background: var(--hover-bg);
}
```

### Custom Workflows

**Example: Validate before submit**

```javascript
const client = new LocationClient();

form.on('before:submit', async (data) => {
  // Validate address with USPS
  const validation = await client.validateAddress({
    address1: data.address1,
    city: data.city,
    state: data.state,
    postal_code: data.postal_code,
    provider: 'usps'
  });
  
  if (!validation.data.valid) {
    alert('Please enter a valid address');
    return false;  // Cancel submit
  }
  
  // Use standardized address
  const std = validation.data.standardized_address;
  data.address1 = std.line1;
  data.city = std.city;
  data.state = std.state;
  data.postal_code = std.full_zip;
  
  return true;  // Continue submit
});
```

**Example: Location picker button**

```javascript
import { showLocationPickerDialog } from 'web-mojo/map';

// Add button to form
const pickBtn = document.createElement('button');
pickBtn.type = 'button';
pickBtn.textContent = 'Pick Location';
pickBtn.onclick = async () => {
  const details = await showLocationPickerDialog({
    title: 'Select Address',
    height: 260,
    tileLayer: 'osm'
  });
  
  if (details) {
    // Populate form
    formView.setFieldValue('address1', details.address1);
    formView.setFieldValue('city', details.city);
    formView.setFieldValue('state', details.state_code);
    formView.setFieldValue('postal_code', details.postal_code);
    formView.setFieldValue('lat', details.latitude);
    formView.setFieldValue('lng', details.longitude);
  }
};
```

---

## Troubleshooting

### Suggestions don't appear

**Check:**
1. Plugin is registered before form renders
2. API endpoints are accessible (check network tab)
3. `basePath` matches your API configuration
4. Input has minimum characters (default: 3)
5. No JavaScript errors in console

**Debug:**
```javascript
import { LocationClient } from 'web-mojo/map';

const client = new LocationClient({ basePath: '/api' });
const result = await client.autocomplete('test');
console.log('Autocomplete result:', result);
```

### Fields don't populate after selection

**Check:**
1. `mapping` keys match API response fields
2. `mapping` values match form field names (case-sensitive)
3. Target fields exist in the form
4. No errors in console

**Debug:**
```javascript
registerLocationPlugin({
  mapping: {
    address1: 'address1',
    city: 'city',
    state_code: 'state',
    postal_code: 'postal_code'
  },
  onSelect: (details) => {
    console.log('Selected details:', details);
    console.log('Mapping:', mapping);
  }
});
```

### Browser autocomplete overlays suggestions

**Cause:** Native browser address autofill UI is showing.

**Solution:** Ensure suppression is enabled (it's on by default):

```javascript
registerLocationPlugin({
  suppressBrowserAutocomplete: true,  // Default: true
  autocompleteValue: 'new-password'   // Default: 'new-password'
});
```

If still occurring, try different `autocompleteValue`:
```javascript
registerLocationPlugin({
  autocompleteValue: 'off'  // or 'nope', 'false', etc.
});
```

### Session token errors

**Symptom:** API returns errors about invalid or expired session tokens.

**Cause:** Session token reused after expiration or multiple form instances sharing a client.

**Solution:**
```javascript
// Reset token when starting new address entry
client.resetSessionToken();

// Or: use separate client per form instance
const form1Client = new LocationClient();
const form2Client = new LocationClient();
```

### CORS errors

**Cause:** API endpoints not configured for CORS.

**Solution:** Configure your server to allow requests from your app's origin:
```python
# Django example
CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'https://yourdomain.com'
]
```

---

## Implementation Details

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ LocationPlugin (Form Plugin)                                │
├─────────────────────────────────────────────────────────────┤
│ • Registers with FormPlugins system                         │
│ • Optionally registers "address" field type                 │
│ • Binds autocomplete to fields after render                 │
│ • Manages lifecycle and cleanup                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ uses
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ useLocationAutocomplete (Behavior Hook)                     │
├─────────────────────────────────────────────────────────────┤
│ • Attaches to input element                                 │
│ • Manages dropdown UI                                       │
│ • Handles user interactions                                 │
│ • Populates form fields via mapping                         │
│ • Returns disposer for cleanup                              │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ uses
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ LocationClient (API Client)                                 │
├─────────────────────────────────────────────────────────────┤
│ • Wraps Rest for JSON requests                              │
│ • Manages session tokens                                    │
│ • Provides autocomplete, details, geocoding methods         │
│ • Handles auth headers                                      │
└─────────────────────────────────────────────────────────────┘
```

### Session Token Management

The client automatically manages session tokens for cost optimization:

1. **First autocomplete call:** Client generates a UUID session token
2. **Subsequent autocomplete calls:** Client includes stored token
3. **Server response:** Returns same session token (or new one)
4. **Place details call:** Client includes token to complete session
5. **New address entry:** Call `resetSessionToken()` or create new client

**Cost impact:**
- With session tokens: ~$2.83 per 1000 sessions
- Without session tokens: ~$17 per 1000 requests (83% more expensive)

### Event Flow

**Autocomplete selection:**
```
1. User types → input event
2. Debounce → API call (autocomplete)
3. Render suggestions → open dropdown
4. User clicks suggestion → mousedown event
5. API call (place details)
6. Update form fields → setFieldValue() + dispatch events
7. Close dropdown → blur input
8. Re-bind after debounce window
```

**Field updates:**
```
1. Place details received
2. For each mapping entry:
   a. Read value from details object
   b. Call formView.setFieldValue(name, value) if available
   c. Update DOM element directly
   d. Dispatch input event (for reactive listeners)
   e. Dispatch change event (for form validation)
```

### Cleanup and Disposal

The plugin properly cleans up resources:

- Event listeners removed on form destroy
- Dropdown removed from DOM
- Timers cleared
- Session tokens reset
- Child views destroyed

The `useLocationAutocomplete` hook returns a disposer function that's tracked and called on form lifecycle events.

### Browser Compatibility

**Supported browsers:**
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

**Required features:**
- `fetch` API
- ES6 modules
- CSS Grid (for dialog layouts)
- `crypto.randomUUID()` (with fallback)

**Polyfills:** None required for modern browsers.

---

## Related Documentation

- **[Location API Reference](./Location_API.md)**: Server-side API endpoints and contracts
- **[Map Extension](./Map.md)**: MapView integration and tile layer options
- **[FormView Guide](./Forms.md)**: Form field types and configuration
- **[Dialog System](./Dialogs.md)**: Dialog helpers and customization

---

## Support

**For issues:**
- Check the [Troubleshooting](#troubleshooting) section
- Review server API logs
- Check browser console for errors

**API provider support:**
- USPS: https://emailus.usps.com/s/web-tools-inquiry
- Google Maps: https://developers.google.com/maps/support
