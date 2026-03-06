# Location & Address API

**REST API for address validation, autocomplete, geocoding, and timezone services**

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Configuration](#configuration)
  - [USPS Setup](#usps-setup)
  - [Google Maps Setup](#google-maps-setup)
- [API Endpoints](#api-endpoints)
  - [1. Address Validation](#1-address-validation)
  - [2. Address Autocomplete](#2-address-autocomplete)
  - [3. Place Details](#3-place-details)
  - [4. Geocoding](#4-geocoding)
  - [5. Reverse Geocoding](#5-reverse-geocoding)
  - [6. Timezone Lookup](#6-timezone-lookup)
  - [7. Sample Validation (Public)](#7-sample-validation-public)
- [Workflows](#workflows)
  - [Address Entry Form Flow](#address-entry-form-flow)
  - [Map Click to Address Flow](#map-click-to-address-flow)
  - [Address Validation Flow](#address-validation-flow)
- [Session Token Management](#session-token-management)
- [Response Schemas](#response-schemas)
- [Error Handling](#error-handling)
- [Rate Limits & Costs](#rate-limits--costs)
- [Python Helper Functions](#python-helper-functions)
- [Best Practices](#best-practices)

---

## Overview

The Location & Address API provides comprehensive address and location services for applications. It integrates with USPS (for validation) and Google Maps Platform (for autocomplete, geocoding, and timezone).

**Capabilities:**

| Service | Provider | Description |
|---------|----------|-------------|
| Address Validation | USPS / Google | Validate and standardize US addresses |
| Address Autocomplete | Google Places | Real-time address suggestions |
| Place Details | Google Places | Full address details from place ID |
| Geocoding | Google Maps | Convert addresses to coordinates |
| Reverse Geocoding | Google Maps | Convert coordinates to addresses |
| Timezone Lookup | Google Maps | Get timezone for coordinates |

**Base URL:** `/api/location`

**Related Documentation:**
- [Location Extension Guide](./Location.md) - Frontend integration for web-mojo

---

## Authentication

Most endpoints require authentication via Bearer token:

```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Exception:** The `/api/location/address/validate-sample` endpoint is public for testing.

**Getting a token:**
```bash
# Example: Login to get token
curl -X POST https://api.example.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'

# Response includes access_token
{
  "access_token": "eyJ0eXAi...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

---

## Configuration

### USPS Setup

**Django Settings:**

```python
# settings.py
USPS_CLIENT_ID = "your_consumer_key"
USPS_CLIENT_SECRET = "your_consumer_secret"
USPS_USE_TEST_ENVIRONMENT = False  # True for testing
```

**Getting credentials:**
1. Register at: https://developer.usps.com/
2. Create an application
3. Copy Client ID (Consumer Key) and Client Secret
4. Test in sandbox: Set `USPS_USE_TEST_ENVIRONMENT = True`
5. Production: Set `USPS_USE_TEST_ENVIRONMENT = False`

**USPS API Capabilities:**
- Address validation and standardization
- Delivery point validation (DPV)
- Residential/commercial classification
- ZIP+4 lookup
- Free for commercial use (approved accounts)

### Google Maps Setup

**Django Settings:**

```python
# settings.py
GOOGLE_MAPS_API_KEY = "your_api_key"
```

**Getting API key:**
1. Go to: https://console.cloud.google.com/google/maps-apis/
2. Create a project
3. Enable required APIs:
   - Address Validation API
   - Places API (New)
   - Geocoding API
   - Time Zone API
4. Create credentials → API key
5. Restrict key (recommended):
   - API restrictions: Select enabled APIs
   - Application restrictions: HTTP referrers or IP addresses

**Pricing (as of 2024):**
- Address Validation: $0.50 per 100 requests
- Autocomplete (with session): $2.83 per 1000 sessions
- Autocomplete (without session): $17.00 per 1000 requests
- Geocoding: $5.00 per 1000 requests
- Time Zone: $5.00 per 1000 requests

**Cost optimization:** Always use session tokens for autocomplete (83% savings).

---

## API Endpoints

### 1. Address Validation

Validate and standardize a US address using USPS or Google.

**Endpoint:**
```
POST /api/location/address/validate
```

**Authentication:** Required

**Request Headers:**
```
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json
```

**Request Body:**

```json
{
  "address1": "123 Main St",
  "address2": "Apt 4B",
  "city": "San Francisco",
  "state": "CA",
  "postal_code": "94102",
  "provider": "usps"
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `address1` | string | Yes | Street address |
| `address2` | string | No | Apartment, suite, unit number |
| `city` | string | Conditional* | City name (*required if no postal_code) |
| `state` | string | Yes | Two-letter state code (e.g., "CA", "NY") |
| `postal_code` | string | No | 5-digit ZIP code |
| `provider` | string | No | "usps" (default) or "google" |

**Response (USPS - Valid Address):**

```json
{
  "status": true,
  "data": {
    "valid": true,
    "source": "usps_v3",
    "standardized_address": {
      "line1": "123 MAIN ST",
      "line1_abbreviated": "123 MAIN ST",
      "line2": "APT 4B",
      "city": "SAN FRANCISCO",
      "city_abbreviated": "SF",
      "state": "CA",
      "postal_code": "94102",
      "zip4": "1234",
      "full_zip": "94102-1234",
      "urbanization": null
    },
    "metadata": {
      "residential": true,
      "business": false,
      "deliverable": true,
      "vacant": false,
      "carrier_route": "C001",
      "delivery_point": "23",
      "dpv_confirmation": "Y",
      "cmra": false,
      "central_delivery_point": false,
      "exact_match": true,
      "needs_secondary_info": false,
      "multiple_addresses_found": false
    },
    "corrections": {
      "corrections_applied": false,
      "correction_codes": [],
      "correction_details": []
    },
    "matches": {
      "match_codes": ["31"],
      "match_details": [
        {
          "code": "31",
          "description": "Single Response - exact match"
        }
      ]
    },
    "warnings": [],
    "firm": null,
    "original_address": {
      "address1": "123 Main St",
      "address2": "Apt 4B",
      "city": "San Francisco",
      "state": "CA",
      "postal_code": "94102"
    }
  }
}
```

**Key Response Fields:**

| Field | Description |
|-------|-------------|
| `valid` | Boolean: Is the address valid and deliverable? |
| `standardized_address` | USPS-standardized format (uppercase, abbreviations) |
| `metadata.residential` | Is this a residential address? |
| `metadata.business` | Is this a business address? |
| `metadata.deliverable` | Is mail deliverable to this address? |
| `metadata.dpv_confirmation` | Delivery Point Validation: "Y" (confirmed), "N" (not confirmed), "D" (missing secondary) |
| `metadata.cmra` | Is this a Commercial Mail Receiving Agency (PO Box equivalent)? |
| `metadata.exact_match` | Did the address match exactly without corrections? |
| `metadata.vacant` | Is the address currently vacant? |

**Response (Invalid Address):**

```json
{
  "status": true,
  "data": {
    "valid": false,
    "error": "Address not found in USPS database",
    "original_address": {
      "address1": "123 Fake Street",
      "city": "Nowhere",
      "state": "CA",
      "postal_code": "00000"
    }
  }
}
```

**cURL Example:**

```bash
curl -X POST https://api.example.com/api/location/address/validate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "address1": "1600 Amphitheatre Parkway",
    "city": "Mountain View",
    "state": "CA",
    "postal_code": "94043",
    "provider": "usps"
  }'
```

---

### 2. Address Autocomplete

Get real-time address suggestions as users type. Uses Google Places Autocomplete API.

**Endpoint:**
```
GET /api/location/address/suggestions
```

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `input` | string | Yes | Partial address text (minimum 3 characters) |
| `session_token` | string | No* | Session token for billing optimization (*recommended) |
| `country` | string | No | ISO country code (default: "US") |
| `lat` | float | No | Latitude for location bias |
| `lng` | float | No | Longitude for location bias |
| `radius` | integer | No | Radius in meters for location bias |

**Response:**

```json
{
  "success": true,
  "session_token": "550e8400-e29b-41d4-a716-446655440000",
  "data": [
    {
      "id": "ChIJj61dQgK6j4AR4GeTYWZsKWw",
      "place_id": "ChIJj61dQgK6j4AR4GeTYWZsKWw",
      "description": "1600 Amphitheatre Parkway, Mountain View, CA, USA",
      "main_text": "1600 Amphitheatre Parkway",
      "secondary_text": "Mountain View, CA, USA",
      "types": ["street_address"]
    },
    {
      "id": "ChIJAQBsW0K6j4ARUkKeZqCqMQI",
      "place_id": "ChIJAQBsW0K6j4ARUkKeZqCqMQI",
      "description": "1600 Amphitheatre Circle, Mountain View, CA, USA",
      "main_text": "1600 Amphitheatre Circle",
      "secondary_text": "Mountain View, CA, USA",
      "types": ["street_address"]
    }
  ],
  "size": 2,
  "count": 2
}
```

**Response Fields:**

| Field | Description |
|-------|-------------|
| `success` | Boolean: Request succeeded |
| `session_token` | Session token to reuse for subsequent requests and place details |
| `data` | Array of suggestion objects |
| `data[].id` | Unique identifier (same as place_id, for UI compatibility) |
| `data[].place_id` | Google Place ID (use for place details request) |
| `data[].description` | Full address description (display to user) |
| `data[].main_text` | Primary address text (e.g., street address) |
| `data[].secondary_text` | Secondary text (e.g., city, state, country) |
| `data[].types` | Array of place types (e.g., ["street_address", "geocode"]) |
| `size` | Number of suggestions returned |
| `count` | Total count (same as size) |

**cURL Examples:**

**First request (no session token):**
```bash
curl -X GET "https://api.example.com/api/location/address/suggestions?input=1600+Amph" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Subsequent request (with session token from first response):**
```bash
curl -X GET "https://api.example.com/api/location/address/suggestions?input=1600+Amphitheatre&session_token=550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**With location bias:**
```bash
curl -X GET "https://api.example.com/api/location/address/suggestions?input=Main+St&lat=37.7749&lng=-122.4194&radius=5000" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 3. Place Details

Get full address details for a place selected from autocomplete suggestions.

**Endpoint:**
```
GET /api/location/address/place-details
```

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `place_id` | string | Yes | Place ID from autocomplete suggestion |
| `session_token` | string | No* | Session token (*recommended: use same token from autocomplete) |

**Response:**

```json
{
  "success": true,
  "address": {
    "street_number": "1600",
    "street_name": "Amphitheatre Parkway",
    "address1": "1600 Amphitheatre Parkway",
    "city": "Mountain View",
    "county": "Santa Clara County",
    "state": "California",
    "state_code": "CA",
    "postal_code": "94043",
    "country": "United States",
    "country_code": "US",
    "formatted_address": "1600 Amphitheatre Pkwy, Mountain View, CA 94043, USA",
    "latitude": 37.4224764,
    "longitude": -122.0842499
  }
}
```

**Address Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `street_number` | string | Street number (e.g., "1600") |
| `street_name` | string | Street name (e.g., "Amphitheatre Parkway") |
| `address1` | string | Combined street address (number + name) |
| `city` | string | City name |
| `county` | string | County name |
| `state` | string | Full state name (e.g., "California") |
| `state_code` | string | Two-letter state code (e.g., "CA") |
| `postal_code` | string | ZIP code |
| `country` | string | Full country name |
| `country_code` | string | ISO country code (e.g., "US") |
| `formatted_address` | string | Complete formatted address |
| `latitude` | float | Latitude coordinate |
| `longitude` | float | Longitude coordinate |

**cURL Example:**

```bash
curl -X GET "https://api.example.com/api/location/address/place-details?place_id=ChIJj61dQgK6j4AR4GeTYWZsKWw&session_token=550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 4. Geocoding

Convert an address string or address components to geographic coordinates.

**Endpoint:**
```
POST /api/location/address/geocode
```

**Authentication:** Required

**Request Body (String):**

```json
{
  "address": "1600 Amphitheatre Parkway, Mountain View, CA"
}
```

**Request Body (Object):**

```json
{
  "address": {
    "address1": "1600 Amphitheatre Parkway",
    "city": "Mountain View",
    "state": "CA",
    "postal_code": "94043"
  }
}
```

**Response:**

```json
{
  "success": true,
  "latitude": 37.4224764,
  "longitude": -122.0842499,
  "formatted_address": "1600 Amphitheatre Pkwy, Mountain View, CA 94043, USA",
  "place_id": "ChIJj61dQgK6j4AR4GeTYWZsKWw",
  "address_components": {
    "street_number": "1600",
    "street_name": "Amphitheatre Parkway",
    "address1": "1600 Amphitheatre Parkway",
    "city": "Mountain View",
    "state": "California",
    "state_code": "CA",
    "postal_code": "94043",
    "country": "United States",
    "country_code": "US"
  }
}
```

**Response Fields:**

| Field | Description |
|-------|-------------|
| `success` | Boolean: Request succeeded |
| `latitude` | Latitude coordinate |
| `longitude` | Longitude coordinate |
| `formatted_address` | Standardized address from Google |
| `place_id` | Google Place ID |
| `address_components` | Parsed address components |

**cURL Example:**

```bash
curl -X POST https://api.example.com/api/location/address/geocode \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "address": "1600 Amphitheatre Parkway, Mountain View, CA"
  }'
```

---

### 5. Reverse Geocoding

Convert geographic coordinates to an address.

**Endpoint:**
```
GET /api/location/address/reverse-geocode
```

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `lat` | float | Yes | Latitude |
| `lng` | float | Yes | Longitude |

**Response:**

```json
{
  "success": true,
  "formatted_address": "1600 Amphitheatre Pkwy, Mountain View, CA 94043, USA",
  "place_id": "ChIJj61dQgK6j4AR4GeTYWZsKWw",
  "address_components": {
    "street_number": "1600",
    "street_name": "Amphitheatre Parkway",
    "address1": "1600 Amphitheatre Parkway",
    "city": "Mountain View",
    "state": "California",
    "state_code": "CA",
    "postal_code": "94043",
    "country": "United States",
    "country_code": "US"
  }
}
```

**cURL Example:**

```bash
curl -X GET "https://api.example.com/api/location/address/reverse-geocode?lat=37.4224764&lng=-122.0842499" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 6. Timezone Lookup

Get timezone information for geographic coordinates.

**Endpoint:**
```
GET /api/location/timezone
```

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `lat` | float | Yes | Latitude |
| `lng` | float | Yes | Longitude |
| `timestamp` | integer | No | Unix timestamp (default: current time) |

**Response:**

```json
{
  "success": true,
  "timezone_id": "America/Los_Angeles",
  "timezone_name": "Pacific Daylight Time",
  "raw_offset": -28800,
  "dst_offset": 3600,
  "total_offset": -25200
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `timezone_id` | string | IANA timezone identifier (e.g., "America/Los_Angeles") |
| `timezone_name` | string | Human-readable timezone name |
| `raw_offset` | integer | Raw offset from UTC in seconds (without DST) |
| `dst_offset` | integer | Daylight Saving Time offset in seconds |
| `total_offset` | integer | Total offset from UTC in seconds (raw + dst) |

**Offset Calculation:**

- UTC offset = `total_offset` seconds
- Hours from UTC = `total_offset / 3600`
- Example: `-25200 / 3600 = -7` (UTC-7)

**cURL Example:**

```bash
curl -X GET "https://api.example.com/api/location/timezone?lat=37.4224764&lng=-122.0842499" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**With timestamp:**
```bash
curl -X GET "https://api.example.com/api/location/timezone?lat=37.4224764&lng=-122.0842499&timestamp=1609459200" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 7. Sample Validation (Public)

Test address validation without authentication. Returns a validated sample address (1600 Amphitheatre Parkway).

**Endpoint:**
```
GET /api/location/address/validate-sample
```

**Authentication:** None (public endpoint)

**Response:**

```json
{
  "status": true,
  "data": {
    "valid": true,
    "source": "google",
    "standardized_address": {
      "line1": "1600 AMPHITHEATRE PKWY",
      "city": "MOUNTAIN VIEW",
      "state": "CA",
      "postal_code": "94043",
      "full_zip": "94043"
    }
  },
  "sample": true
}
```

**cURL Example:**

```bash
curl -X GET https://api.example.com/api/location/address/validate-sample
```

---

## Workflows

### Address Entry Form Flow

Complete flow for an address entry form with autocomplete:

**Step 1: First Autocomplete Request**

```javascript
// User types "1600 Amph"
const response = await fetch(
  `/api/location/address/suggestions?input=${encodeURIComponent('1600 Amph')}`,
  { headers: { 'Authorization': `Bearer ${token}` } }
);

const result = await response.json();
// Save session token for subsequent requests
const sessionToken = result.session_token;

// Display suggestions
result.data.forEach(suggestion => {
  console.log(suggestion.description);
  // Render in dropdown UI
});
```

**Step 2: Subsequent Autocomplete Requests**

```javascript
// User continues typing "1600 Amphitheatre"
const response = await fetch(
  `/api/location/address/suggestions?input=${encodeURIComponent('1600 Amphitheatre')}&session_token=${sessionToken}`,
  { headers: { 'Authorization': `Bearer ${token}` } }
);

const result = await response.json();
// Display updated suggestions
```

**Step 3: User Selects Suggestion**

```javascript
// User clicks on suggestion
const placeId = selectedSuggestion.place_id;

const response = await fetch(
  `/api/location/address/place-details?place_id=${placeId}&session_token=${sessionToken}`,
  { headers: { 'Authorization': `Bearer ${token}` } }
);

const { success, address } = await response.json();

// Populate form fields
document.getElementById('address1').value = address.address1;
document.getElementById('city').value = address.city;
document.getElementById('state').value = address.state_code;
document.getElementById('postal_code').value = address.postal_code;
document.getElementById('lat').value = address.latitude;
document.getElementById('lng').value = address.longitude;

// Session is complete - clear token for next address entry
sessionToken = null;
```

**Step 4: Validate on Submit (Optional)**

```javascript
// Before final submission, validate with USPS
const response = await fetch('/api/location/address/validate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    address1: address.address1,
    city: address.city,
    state: address.state_code,
    postal_code: address.postal_code,
    provider: 'usps'
  })
});

const { status, data } = await response.json();

if (!data.valid) {
  alert(`Address validation failed: ${data.error}`);
  return;
}

// Use standardized address from USPS
const standardized = data.standardized_address;
// Submit to backend
```

### Map Click to Address Flow

Convert map coordinates to an address:

```javascript
// User clicks on map at coordinates
const lat = 37.4224764;
const lng = -122.0842499;

// 1. Reverse geocode to get address
const response = await fetch(
  `/api/location/address/reverse-geocode?lat=${lat}&lng=${lng}`,
  { headers: { 'Authorization': `Bearer ${token}` } }
);

const { success, address_components, formatted_address } = await response.json();

// 2. Populate form
document.getElementById('address1').value = address_components.address1;
document.getElementById('city').value = address_components.city;
document.getElementById('state').value = address_components.state_code;
document.getElementById('postal_code').value = address_components.postal_code;

// 3. Get timezone for the location
const tzResponse = await fetch(
  `/api/location/timezone?lat=${lat}&lng=${lng}`,
  { headers: { 'Authorization': `Bearer ${token}` } }
);

const { timezone_id } = await tzResponse.json();
console.log('Timezone:', timezone_id);  // "America/Los_Angeles"
```

### Address Validation Flow

Validate user-entered address:

```javascript
// User manually typed address
const userAddress = {
  address1: document.getElementById('address1').value,
  city: document.getElementById('city').value,
  state: document.getElementById('state').value,
  postal_code: document.getElementById('postal_code').value
};

// Validate with USPS
const response = await fetch('/api/location/address/validate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    ...userAddress,
    provider: 'usps'
  })
});

const { status, data } = await response.json();

if (!data.valid) {
  // Show error
  alert(`Invalid address: ${data.error}`);
  return;
}

// Address is valid
const std = data.standardized_address;

// Check if corrections were made
if (data.corrections.corrections_applied) {
  // Ask user to confirm corrected address
  const confirmed = confirm(
    `Did you mean:\n${std.line1}\n${std.city}, ${std.state} ${std.full_zip}?`
  );
  
  if (confirmed) {
    // Use standardized address
    document.getElementById('address1').value = std.line1;
    document.getElementById('city').value = std.city;
    document.getElementById('state').value = std.state;
    document.getElementById('postal_code').value = std.full_zip;
  }
} else {
  // Exact match - use standardized format
  document.getElementById('address1').value = std.line1;
  document.getElementById('city').value = std.city;
  document.getElementById('state').value = std.state;
  document.getElementById('postal_code').value = std.full_zip;
}

// Check metadata
if (data.metadata.cmra) {
  console.warn('Address is a Commercial Mail Receiving Agency (PO Box equivalent)');
}
if (data.metadata.vacant) {
  console.warn('Address is currently vacant');
}
if (!data.metadata.deliverable) {
  console.warn('Address may not be deliverable');
}
```

---

## Session Token Management

Session tokens optimize Google Places API billing by grouping autocomplete requests and place details into a single "session".

### Why Use Session Tokens?

**Cost comparison:**
- **With session tokens:** $2.83 per 1000 sessions
- **Without session tokens:** $17.00 per 1000 requests
- **Savings:** 83% cost reduction

### How Session Tokens Work

```
┌──────────────────────────────────────────────────────────┐
│ Session Flow                                             │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ 1. First autocomplete request (no token)                │
│    → Server generates UUID session token                │
│    → Returns token in response                          │
│                                                          │
│ 2. Subsequent autocomplete requests                     │
│    → Client includes session_token parameter            │
│    → All requests grouped in same session               │
│                                                          │
│ 3. Place details request                                │
│    → Client includes same session_token                 │
│    → Session completes                                  │
│    → Billed as 1 session                                │
│                                                          │
│ 4. New address entry                                    │
│    → Omit session_token to start new session           │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Best Practices

**DO:**
- ✅ Generate new session token for each address entry
- ✅ Reuse token across autocomplete requests for same address
- ✅ Include token in place details request to complete session
- ✅ Let abandoned sessions expire naturally (no cleanup needed)

**DON'T:**
- ❌ Reuse session token after place details request (already completed)
- ❌ Share session token across multiple form instances
- ❌ Store session tokens long-term (they expire in ~3 minutes)
- ❌ Send place details request without completing autocomplete session

### Session Token Lifecycle

```javascript
// Start new address entry
let sessionToken = null;

// First autocomplete (generates token)
const res1 = await fetch('/api/location/address/suggestions?input=1600');
sessionToken = res1.session_token;  // Save token

// Continue typing (reuse token)
const res2 = await fetch(`/api/location/address/suggestions?input=1600+Amph&session_token=${sessionToken}`);
// Token remains the same

// User selects suggestion (complete session)
const details = await fetch(`/api/location/address/place-details?place_id=${placeId}&session_token=${sessionToken}`);
// Session complete - token now invalid

// Next address entry (start fresh)
sessionToken = null;  // Clear token
const res3 = await fetch('/api/location/address/suggestions?input=Main+St');
sessionToken = res3.session_token;  // New token
```

### Abandoned Sessions

If a user starts typing but never selects an address:
- Token expires after ~3 minutes of inactivity
- No cleanup needed on client side
- Billing: Charged per-request rate (no session discount)

---

## Response Schemas

### Validation Response (USPS)

```typescript
interface ValidationResponse {
  status: boolean;
  data: {
    valid: boolean;
    source: 'usps_v3' | 'google';
    error?: string;  // Present if invalid
    standardized_address?: {
      line1: string;
      line1_abbreviated: string;
      line2?: string;
      city: string;
      city_abbreviated: string;
      state: string;
      postal_code: string;
      zip4?: string;
      full_zip: string;
      urbanization?: string | null;
    };
    metadata?: {
      residential: boolean;
      business: boolean;
      deliverable: boolean;
      vacant: boolean;
      carrier_route: string;
      delivery_point: string;
      dpv_confirmation: 'Y' | 'N' | 'D';
      cmra: boolean;
      central_delivery_point: boolean;
      exact_match: boolean;
      needs_secondary_info: boolean;
      multiple_addresses_found: boolean;
    };
    corrections?: {
      corrections_applied: boolean;
      correction_codes: string[];
      correction_details: string[];
    };
    matches?: {
      match_codes: string[];
      match_details: Array<{
        code: string;
        description: string;
      }>;
    };
    warnings?: string[];
    firm?: string | null;
    original_address: object;
  };
}
```

### Autocomplete Response

```typescript
interface AutocompleteResponse {
  success: boolean;
  session_token: string;
  data: Array<{
    id: string;
    place_id: string;
    description: string;
    main_text: string;
    secondary_text: string;
    types: string[];
  }>;
  size: number;
  count: number;
}
```

### Place Details Response

```typescript
interface PlaceDetailsResponse {
  success: boolean;
  address: {
    street_number?: string;
    street_name?: string;
    address1: string;
    city: string;
    county?: string;
    state: string;
    state_code: string;
    postal_code: string;
    country: string;
    country_code: string;
    formatted_address: string;
    latitude: number;
    longitude: number;
  };
}
```

### Geocoding Response

```typescript
interface GeocodeResponse {
  success: boolean;
  latitude: number;
  longitude: number;
  formatted_address: string;
  place_id: string;
  address_components: {
    street_number?: string;
    street_name?: string;
    address1: string;
    city: string;
    state: string;
    state_code: string;
    postal_code: string;
    country: string;
    country_code: string;
  };
}
```

### Timezone Response

```typescript
interface TimezoneResponse {
  success: boolean;
  timezone_id: string;
  timezone_name: string;
  raw_offset: number;
  dst_offset: number;
  total_offset: number;
}
```

---

## Error Handling

### Error Response Format

```json
{
  "status": false,
  "error": "Error message description"
}
```

Or for autocomplete/geocoding endpoints:

```json
{
  "success": false,
  "error": "Error message description"
}
```

### HTTP Status Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| `200` | Success | Request completed successfully |
| `400` | Bad Request | Missing required parameters, invalid input |
| `401` | Unauthorized | Missing or invalid authentication token |
| `403` | Forbidden | Valid token but insufficient permissions |
| `404` | Not Found | Endpoint doesn't exist |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Server error (check logs) |
| `503` | Service Unavailable | External API (USPS/Google) unavailable |

### Common Errors

**Missing authentication:**
```json
{
  "status": false,
  "error": "Authentication required"
}
```

**Invalid session token:**
```json
{
  "success": false,
  "error": "Invalid or expired session token"
}
```

**USPS API error:**
```json
{
  "status": false,
  "error": "USPS API error: Invalid address format"
}
```

**Google API error:**
```json
{
  "success": false,
  "error": "Google Maps API error: ZERO_RESULTS"
}
```

### Error Handling Example

```javascript
async function validateAddress(address) {
  try {
    const response = await fetch('/api/location/address/validate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(address)
    });

    if (!response.ok) {
      // HTTP error
      if (response.status === 401) {
        throw new Error('Authentication required - please log in');
      }
      if (response.status === 429) {
        throw new Error('Rate limit exceeded - please try again later');
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.status || !result.data.valid) {
      // Invalid address
      throw new Error(result.data.error || 'Address validation failed');
    }

    return result.data;

  } catch (error) {
    console.error('Validation error:', error);
    throw error;
  }
}
```

---

## Rate Limits & Costs

### USPS

**Rate Limits:**
- Access tokens valid for 8 hours
- Rate limits apply per client credentials
- Exact limits not publicly documented

**Costs:**
- Free for commercial use (requires approved account)
- Must register and get approval from USPS

**Best Practices:**
- Cache validation results when possible
- Don't validate on every keystroke
- Validate only on form submission or user blur

### Google Maps Platform

**Pricing (as of 2024):**

| Service | Cost | Optimization |
|---------|------|--------------|
| Address Validation | $0.50 / 100 requests | Cache results |
| Autocomplete (session) | $2.83 / 1000 sessions | **Always use session tokens** |
| Autocomplete (no session) | $17.00 / 1000 requests | 83% more expensive |
| Geocoding | $5.00 / 1000 requests | Cache coordinates |
| Reverse Geocoding | $5.00 / 1000 requests | Cache addresses |
| Timezone | $5.00 / 1000 requests | Cache by location |

**Free Tier:**
- $200 monthly credit (covers ~70,000 autocomplete sessions)
- Resets monthly

**Cost Example:**
```
100 users per day × 30 days = 3,000 address entries
With session tokens: 3,000 × $0.00283 = $8.49/month
Without session tokens: 3,000 × $0.017 = $51/month
Savings: $42.51/month (83%)
```

**Cost Optimization Tips:**

1. **Always use session tokens** for autocomplete (83% savings)
2. **Cache geocoding results** by address hash
3. **Debounce autocomplete** requests (reduce API calls)
4. **Set minimum characters** before triggering autocomplete (e.g., 3 chars)
5. **Cache timezone data** by rounded coordinates
6. **Use USPS for validation** (free) and Google for autocomplete (better UX)
7. **Restrict API key** to prevent unauthorized usage

---

## Python Helper Functions

The REST API wraps Python helper functions that can also be used directly in your Django application:

```python
from mojo.helpers import location

# 1. Validate address
result = location.validate_address({
    "address1": "1600 Amphitheatre Parkway",
    "city": "Mountain View",
    "state": "CA",
    "postal_code": "94043",
    "provider": "usps"
})

if result['valid']:
    std = result['standardized_address']
    print(f"Valid: {std['line1']}, {std['city']}, {std['state']} {std['full_zip']}")
else:
    print(f"Invalid: {result['error']}")

# 2. Get autocomplete suggestions
suggestions = location.get_address_suggestions(
    input_text="1600 Amph",
    session_token="abc-123",
    country="US"
)

for suggestion in suggestions['data']:
    print(suggestion['description'])

# 3. Get place details
details = location.get_place_details(
    place_id="ChIJ...",
    session_token="abc-123"
)

address = details['address']
print(f"Address: {address['formatted_address']}")
print(f"Coords: {address['latitude']}, {address['longitude']}")

# 4. Geocode address
result = location.geocode_address("1600 Amphitheatre Parkway, Mountain View, CA")
print(f"Coordinates: {result['latitude']}, {result['longitude']}")

# 5. Reverse geocode
result = location.reverse_geocode(lat=37.4224764, lng=-122.0842499)
print(f"Address: {result['formatted_address']}")

# 6. Get timezone
result = location.get_timezone(lat=37.4224764, lng=-122.0842499)
print(f"Timezone: {result['timezone_id']}")
```

---

## Best Practices

### Security

1. **Always require authentication** for production endpoints
2. **Restrict API keys** to specific domains/IPs
3. **Don't expose API keys** in client-side code
4. **Rate limit** requests per user/IP
5. **Validate input** server-side (don't trust client)
6. **Log suspicious activity** (unusual patterns, high volume)

### Performance

1. **Cache responses** where appropriate:
   - Geocoding results by address
   - Timezone data by rounded coordinates
   - Validation results by address hash
2. **Use session tokens** for autocomplete (cost + performance)
3. **Debounce autocomplete** on client (reduce server load)
4. **Index database columns** used for address queries
5. **Use CDN** for static assets
6. **Implement request pooling** for high-volume scenarios

### User Experience

1. **Show loading indicators** during API calls
2. **Handle errors gracefully** with user-friendly messages
3. **Debounce autocomplete** (200-300ms recommended)
4. **Set minimum characters** (3 recommended)
5. **Show helpful messages** ("Start typing an address...")
6. **Validate on blur or submit**, not on every keystroke
7. **Confirm corrections** with user before applying
8. **Suppress browser autocomplete** on suggestion inputs

### Data Quality

1. **Always validate** addresses before storing
2. **Use USPS validation** for US addresses (authoritative source)
3. **Store standardized format** from validation
4. **Store coordinates** for geocoded addresses
5. **Flag problematic addresses** (CMRA, vacant, undeliverable)
6. **Update stale addresses** periodically
7. **Log validation failures** for review

### Cost Optimization

1. **Use session tokens** for autocomplete (83% savings)
2. **Cache aggressively** for read-heavy workloads
3. **Batch requests** where possible
4. **Monitor usage** and set budget alerts
5. **Optimize query patterns** (avoid redundant calls)
6. **Use USPS for validation** (free vs $0.50/100 for Google)
7. **Restrict API keys** to prevent abuse

---

## Related Documentation

- **[Location Extension Guide](./Location.md)**: Frontend integration for web-mojo
- **[Map Extension](./Map.md)**: MapView integration and map features
- **[Django Settings](../server/Configuration.md)**: Server configuration guide

---

## Support

**For issues:**
- Check API response format and error messages
- Review server logs for detailed errors
- Verify API keys and credentials are valid
- Check network tab for failed requests

**API Provider Support:**
- **USPS:** https://emailus.usps.com/s/web-tools-inquiry
- **Google Maps:** https://developers.google.com/maps/support

**Documentation:**
- **USPS API:** https://developer.usps.com/
- **Google Places:** https://developers.google.com/maps/documentation/places/web-service/overview
- **Google Geocoding:** https://developers.google.com/maps/documentation/geocoding/overview
- **Google Timezone:** https://developers.google.com/maps/documentation/timezone/overview
