# Location & Address API

The Location API provides address validation, autocomplete, geocoding, and timezone services for US addresses. It integrates with USPS (for validation) and Google Maps Platform (for autocomplete and geocoding).

**Permissions:** Most endpoints require authentication. A public sample endpoint is provided for testing.

---

## Overview

The Location API supports the following operations:

1. **Address Validation** - Validate and standardize US addresses using USPS or Google
2. **Address Autocomplete** - Get real-time address suggestions as users type
3. **Place Details** - Get full address details after user selects an autocomplete suggestion
4. **Geocoding** - Convert addresses to coordinates (latitude/longitude)
5. **Reverse Geocoding** - Convert coordinates to addresses
6. **Timezone Lookup** - Get timezone information for geographic coordinates

---

## Configuration

### USPS Configuration

Set in your Django settings:

```python
USPS_CLIENT_ID = "your_consumer_key"
USPS_CLIENT_SECRET = "your_consumer_secret"
USPS_USE_TEST_ENVIRONMENT = False  # Set to True for testing
```

Get credentials from: https://developer.usps.com/

### Google Maps Configuration

Set in your Django settings:

```python
GOOGLE_MAPS_API_KEY = "your_api_key"
```

Get API key from: https://console.cloud.google.com/google/maps-apis/

Enable these APIs:
- Address Validation API
- Places API
- Geocoding API
- Time Zone API

---

## 1. Address Validation

Validate and standardize a US address using USPS (default) or Google.

### Endpoint

**POST** `/api/location/address/validate`

### Authentication

Requires authentication.

### Request Body

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

- `address1` (string, required) - Street address
- `address2` (string, optional) - Apartment, suite, unit number
- `city` (string, optional*) - City name (*required if postal_code not provided)
- `state` (string, required) - Two-letter state code (e.g., "CA", "NY")
- `postal_code` (string, optional) - 5-digit ZIP code
- `provider` (string, optional) - "usps" (default) or "google"

### Response (USPS)

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
    "original_address": {...}
  }
}
```

**Key Fields:**

- `valid` (boolean) - Whether address is valid and deliverable
- `standardized_address` - USPS-standardized address format
- `metadata.residential` - Is this a residential address?
- `metadata.business` - Is this a business address?
- `metadata.dpv_confirmation` - Delivery Point Validation status ("Y" = confirmed)
- `metadata.exact_match` - Is this an exact match?
- `metadata.cmra` - Is this a Commercial Mail Receiving Agency (PO Box equivalent)?

### Example: Invalid Address

```json
{
  "status": true,
  "data": {
    "valid": false,
    "error": "Address not found in USPS database",
    "original_address": {...}
  }
}
```

### cURL Example

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

## 2. Address Autocomplete

Get address suggestions in real-time as users type. Uses Google Places Autocomplete API.

### Endpoint

**GET** `/api/location/address/suggestions`

### Authentication

Requires authentication.

### Query Parameters

- `input` (string, required) - Partial address text (minimum 3 characters)
- `session_token` (string, optional) - Session token for billing optimization. If not provided, a new one is generated and returned.
- `country` (string, optional) - ISO country code (default: "US")
- `lat` (float, optional) - Latitude for location bias
- `lng` (float, optional) - Longitude for location bias
- `radius` (int, optional) - Radius in meters for location bias

### Response

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

- `success` (boolean) - Whether request succeeded
- `session_token` (string) - Session token to reuse for subsequent requests
- `data` (array) - List of address suggestions
- `id` / `place_id` (string) - Unique identifier for the place (same value, `id` for UI compatibility)
- `description` (string) - Full address description
- `main_text` (string) - Primary address line
- `secondary_text` (string) - City, state, country
- `size` / `count` (int) - Number of suggestions returned

### Session Tokens (Cost Optimization)

Google charges **$2.83/1000 sessions** with session tokens vs **$17/1000 requests** without them.

**The API automatically handles session tokens for you:**

1. First autocomplete request (no `session_token` parameter) → API generates and returns a `session_token`
2. Subsequent autocomplete requests → Include `session_token` from first response
3. Place details request → Use same `session_token` to complete the session
4. New address entry → Omit `session_token` to get a new one

**Important Notes:**

- Session tokens expire after a few minutes of inactivity (Google doesn't document exact time)
- A session token becomes invalid after use with Place Details
- Always start a fresh session (omit `session_token`) for each new address entry
- If a session is abandoned (user doesn't select), the token expires automatically
- Using an expired or reused token results in per-request billing (83% more expensive!)

### cURL Examples

**First request (no session_token):**
```bash
curl -X GET "https://api.example.com/api/location/address/suggestions?input=1600+Amph" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Subsequent request (reusing session_token from first response):**
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

## 3. Place Details

Get full address details for a place selected from autocomplete suggestions.

### Endpoint

**GET** `/api/location/address/place-details`

### Authentication

Requires authentication.

### Query Parameters

- `place_id` (string, required) - Place ID from autocomplete suggestion
- `session_token` (string, optional but recommended) - Same session token used in autocomplete

### Response

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

### cURL Example

```bash
curl -X GET "https://api.example.com/api/location/address/place-details?place_id=ChIJj61dQgK6j4AR4GeTYWZsKWw&session_token=abc-123" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 4. Geocoding

Convert an address to geographic coordinates (latitude/longitude).

### Endpoint

**POST** `/api/location/address/geocode`

### Authentication

Requires authentication.

### Request Body

```json
{
  "address": "1600 Amphitheatre Parkway, Mountain View, CA"
}
```

Or with address components:

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

### Response

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

### cURL Example

```bash
curl -X POST https://api.example.com/api/location/address/geocode \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "address": "1600 Amphitheatre Parkway, Mountain View, CA"
  }'
```

---

## 5. Reverse Geocoding

Convert geographic coordinates to an address.

### Endpoint

**GET** `/api/location/address/reverse-geocode`

### Authentication

Requires authentication.

### Query Parameters

- `lat` (float, required) - Latitude
- `lng` (float, required) - Longitude

### Response

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

### cURL Example

```bash
curl -X GET "https://api.example.com/api/location/address/reverse-geocode?lat=37.4224764&lng=-122.0842499" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 6. Timezone Lookup

Get timezone information for geographic coordinates.

### Endpoint

**GET** `/api/location/timezone`

### Authentication

Requires authentication.

### Query Parameters

- `lat` (float, required) - Latitude
- `lng` (float, required) - Longitude
- `timestamp` (int, optional) - Unix timestamp (default: current time)

### Response

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

- `timezone_id` (string) - IANA timezone identifier
- `timezone_name` (string) - Human-readable timezone name
- `raw_offset` (int) - Raw offset from UTC in seconds (without DST)
- `dst_offset` (int) - Daylight Saving Time offset in seconds
- `total_offset` (int) - Total offset from UTC in seconds (raw + dst)

### cURL Example

```bash
curl -X GET "https://api.example.com/api/location/timezone?lat=37.4224764&lng=-122.0842499" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 7. Sample Validation (Public)

Test address validation without authentication.

### Endpoint

**GET** `/api/location/address/validate-sample`

### Authentication

None required (public endpoint).

### Response

Returns a validated sample address (1600 Amphitheatre Parkway) for testing purposes.

```json
{
  "status": true,
  "data": {
    "valid": true,
    "source": "google",
    "standardized_address": {...}
  },
  "sample": true
}
```

### cURL Example

```bash
curl -X GET https://api.example.com/api/location/address/validate-sample
```

---

## End-to-End Workflow: Address Entry Form

Here's how to implement a complete address entry form with autocomplete and validation:

### Step 1: First Autocomplete Request (Get Session Token)

```javascript
// User types "1600 Amph"
let sessionToken = null;

const response = await fetch(
  `/api/location/address/suggestions?input=${encodeURIComponent(input)}`,
  {
    headers: { 'Authorization': `Bearer ${token}` }
  }
);

const result = await response.json();
sessionToken = result.session_token;  // Save for subsequent requests

// Display suggestions to user
result.data.forEach(suggestion => {
  console.log(suggestion.description);
  // Show in dropdown UI
});
```

### Step 2: Subsequent Autocomplete Requests (Reuse Session Token)

```javascript
// User continues typing "1600 Amphitheatre"
const response = await fetch(
  `/api/location/address/suggestions?input=${encodeURIComponent(input)}&session_token=${sessionToken}`,
  {
    headers: { 'Authorization': `Bearer ${token}` }
  }
);

const { success, data } = await response.json();

// Display updated suggestions
data.forEach(suggestion => {
  console.log(suggestion.description);
  // Show in dropdown UI
});
```

### Step 3: User Selects a Suggestion

```javascript
// User clicks on suggestion
const placeId = selectedSuggestion.place_id;

const response = await fetch(
  `/api/location/address/place-details?place_id=${placeId}&session_token=${sessionToken}`,
  {
    headers: { 'Authorization': `Bearer ${token}` }
  }
);

const { success, address } = await response.json();

// Populate form fields
document.getElementById('address1').value = address.address1;
document.getElementById('city').value = address.city;
document.getElementById('state').value = address.state_code;
document.getElementById('postal_code').value = address.postal_code;

// Clear session token for next address entry
sessionToken = null;
```

### Step 4: Validate on Submit (Optional)

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
// Submit to your backend
```

---

## Python Helper Functions

The REST API wraps Python helper functions that can also be used directly in your Django application:

```python
from mojo.helpers import location

# Validate address
result = location.validate_address({
    "address1": "1600 Amphitheatre Parkway",
    "city": "Mountain View",
    "state": "CA",
    "postal_code": "94043",
    "provider": "usps"
})

# Get autocomplete suggestions
suggestions = location.get_address_suggestions(
    input_text="1600 Amph",
    session_token="abc-123",
    country="US"
)

# Get place details
details = location.get_place_details(
    place_id="ChIJ...",
    session_token="abc-123"
)
```

---

## Error Handling

All endpoints return standard error responses:

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

**Common Errors:**

- `400 Bad Request` - Missing required parameters or invalid input
- `401 Unauthorized` - Missing or invalid authentication token
- `429 Too Many Requests` - Rate limit exceeded
- `503 Service Unavailable` - External API (USPS/Google) unavailable

---

## Rate Limits and Costs

### USPS

- Access tokens valid for 8 hours
- Rate limits apply per client credentials
- Free for commercial use (requires approved account)

### Google Maps Platform

**Pricing (as of 2024):**
- Address Validation: $0.50 per 100 requests
- Autocomplete (with session tokens): $2.83 per 1000 sessions
- Autocomplete (without session tokens): $17.00 per 1000 requests
- Geocoding: $5.00 per 1000 requests
- Time Zone: $5.00 per 1000 requests

**Best Practices:**
- Always use session tokens for autocomplete to save 83% on costs
- Cache geocoding results when possible
- Use USPS for validation (free) and Google for autocomplete (better UX)

---

## Support

For issues or questions:
- USPS API Support: https://emailus.usps.com/s/web-tools-inquiry
- Google Maps Support: https://developers.google.com/maps/support

        return google.validate_address(address_data)
    return usps.validate_address(address_data)


def get_address_suggestions(input_text, session_token=None, country="US", location=None, radius=None):
    """
    Get address suggestions as user types (autocomplete)

    Uses Google Places Autocomplete API

    Args:
        input_text (str): Partial address text (e.g., "1600 Amph")
        session_token (str, optional): Session token for per-session billing
        country (str): ISO country code to restrict results (default: "US")
        location (dict, optional): Dict with 'lat' and 'lng' to bias results
        radius (int, optional): Radius in meters to bias results around location

    Returns:
        dict: {
            "success": bool,
            "data": [
                {
                    "id": "ChIJ...",  # Same as place_id, for UI frameworks
                    "place_id": "ChIJ...",
                    "description": "1600 Amphitheatre Parkway, Mountain View, CA, USA",
                    "main_text": "1600 Amphitheatre Parkway",
                    "secondary_text": "Mountain View, CA, USA",
                    "types": ["street_address"]
                },
                ...
            ],
            "size": int,
            "count": int
        }

    Example:
        >>> suggestions = get_address_suggestions("1600 Amph")
        >>> for s in suggestions["data"]:
        ...     print(s["description"])
    """
    from . import google
    service = google.get_google_api()
    return service.get_address_suggestions(
        input_text=input_text,
        session_token=session_token,
        country=country,
        location=location,
        radius=radius
    )


def get_place_details(place_id, session_token=None):
    """
    Get full address details for a selected place from autocomplete

    Use this after user selects a suggestion from get_address_suggestions()

    Args:
        place_id (str): Place ID from autocomplete suggestion
        session_token (str, optional): Same session token used in autocomplete

    Returns:
        dict: {
            "success": bool,
            "address": {
                "address1": "1600 Amphitheatre Parkway",
                "city": "Mountain View",
                "state": "California",
                "state_code": "CA",
                "postal_code": "94043",
                "country": "United States",
                "country_code": "US",
                "formatted_address": "...",
                "latitude": 37.4224764,
                "longitude": -122.0842499
            }
        }

    Example:
        >>> # User types "1600 Amph"
        >>> suggestions = get_address_suggestions("1600 Amph", session_token="abc123")
        >>>
        >>> # User selects first suggestion
        >>> details = get_place_details(suggestions["data"][0]["place_id"], session_token="abc123")
        >>> print(details["address"]["address1"])
        "1600 Amphitheatre Parkway"
    """
    from . import google
    service = google.get_google_api()
    return service.get_place_details(place_id=place_id, session_token=session_token)

                "success": False,
                "error": "Input too short (minimum 3 characters)",
                "suggestions": []
                "data": [],
                "size": 0,
                "count": 0
            }

        params = {
                    "success": False,
                    "error": f"API returned status {response.status_code}",
                    "suggestions": []
                    "data": [],
                    "size": 0,
                    "count": 0
                }

            data = response.json()
                return {
                    "success": True,
                    "suggestions": [],
                    "data": [],
                    "size": 0,
                    "count": 0,
                    "message": "No addresses found"
                }

                    "success": False,
                    "error": error_message,
                    "suggestions": []
                    "data": [],
                    "size": 0,
                    "count": 0
                }

            # Parse predictions

            for prediction in predictions:
                place_id = prediction.get("place_id")
                suggestions.append({
                    "place_id": prediction.get("place_id"),
                    "id": place_id,  # Required by UI framework
                    "place_id": place_id,
                    "description": prediction.get("description"),
                    "main_text": prediction.get("structured_formatting", {}).get("main_text"),
                    "secondary_text": prediction.get("structured_formatting", {}).get("secondary_text"),
            return {
                "success": True,
                "suggestions": suggestions,
                "data": suggestions,
                "size": len(suggestions),
                "count": len(suggestions)
            }

        google_api = GoogleAddressService(use_service_account=False)
    return google_api


def validate_address(address_data):
    """
    Validate address using Google Address Validation API

    Convenience function that uses singleton instance.

    Args:
        address_data: Dict with address components

    Returns:
        Dict with validation result
    """
    service = get_google_api()
    return service.validate_address(address_data)

    """

    def __init__(self):
    def __init__(self, use_test_environment=False):
        """
        Initialize USPS API client

        Args:
            use_test_environment: If True, use test/sandbox environment instead of production
        """
        self.client_id = settings.USPS_CLIENT_ID
        self.client_secret = settings.USPS_CLIENT_SECRET
        self.token_url = "https://apis.usps.com/oauth2/v3/token"
        self.api_base_url = "https://apis.usps.com"

        # Validate credentials
        if not self.client_id or not self.client_secret:
            raise USPSAuthenticationError(
                "USPS_CLIENT_ID and USPS_CLIENT_SECRET must be set in settings"
            )

        # Check if using test environment (from settings or parameter)
        use_test = use_test_environment or getattr(settings, 'USPS_USE_TEST_ENVIRONMENT', False)

        # Set URLs based on environment
        if use_test:
            self.token_url = "https://apis-tem.usps.com/oauth2/v3/token"
            self.api_base_url = "https://apis-tem.usps.com"
            logit.info("Using USPS TEST environment")
        else:
            self.token_url = "https://apis.usps.com/oauth2/v3/token"
            self.api_base_url = "https://apis.usps.com"
            logit.info("Using USPS PRODUCTION environment")

        # Token storage (instance variables)
        self._access_token = None
        logit.info("Authenticating with USPS API")

        # The OpenAPI spec example shows credentials in body:
        # grant_type=client_credentials &client_id=123 &client_secret=ABC &scope=addresses
        # Try this approach first (credentials in body, no Basic Auth)
        payload = {
            "grant_type": "client_credentials",
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "scope": "addresses"
        }

        try:
            # Send as form-encoded (application/x-www-form-urlencoded)
            # Send credentials in body as form data (per OpenAPI spec example)
            response = requests.post(
                self.token_url,
                data=payload,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                timeout=10
            )

            logit.info(f"USPS auth response status: {response.status_code}")

            if response.status_code == 401:
                # Log more details for debugging
                logit.error(f"USPS 401 response body: {response.text}")
                logit.error(f"Using client_id: {self.client_id[:10]}...")
            if response.status_code != 200:
                # Log error details
                error_body = response.text
                logit.error(f"USPS auth error ({response.status_code}): {error_body}")

                # Try to parse error JSON
                try:
                    error_json = response.json()
                    error_msg = error_json.get("error_description", error_json.get("error", error_body))
                except:
                    error_msg = error_body

                raise USPSAuthenticationError(
                    f"USPS authentication failed ({response.status_code}): {error_msg}"
                )

            response.raise_for_status()

            return self._store_tokens(token_data)

        except USPSAuthenticationError:
            raise
        except requests.exceptions.RequestException as e:
            logit.exception(f"USPS authentication failed: {e}")
            logit.exception(f"USPS authentication request failed: {e}")
            raise USPSAuthenticationError(f"Failed to authenticate with USPS: {e}")

    def _store_tokens(self, token_data):
"""
Location REST API Endpoints

Provides address validation, autocomplete, and geocoding services.
"""

import uuid
from mojo import decorators as md
from mojo.helpers.response import JsonResponse
from mojo.helpers import location


@md.POST('location/address/validate')
@md.requires_authentication()
@md.requires_params("address1", "state")
def rest_validate_address(request):
    """
    Validate and standardize a US address

    POST /api/location/address/validate

    Body:
        address1 (str): Street address (required)
        address2 (str): Apartment, suite, etc. (optional)
        city (str): City name (optional if postal_code provided)
        state (str): Two-letter state code (required)
        postal_code (str): 5-digit ZIP code (optional)
        provider (str): "usps" or "google" (default: "usps")

    Returns:
        {
            "status": true,
            "data": {
                "valid": true,
                "source": "usps_v3",
                "standardized_address": {...},
                "metadata": {...}
            }
        }
    """
    address_data = {
        "address1": request.DATA.get("address1"),
        "address2": request.DATA.get("address2"),
        "city": request.DATA.get("city"),
        "state": request.DATA.get("state"),
        "postal_code": request.DATA.get("postal_code"),
        "provider": request.DATA.get("provider", "usps")
    }

    # Remove None values
    address_data = {k: v for k, v in address_data.items() if v is not None}

    try:
        result = location.validate_address(address_data)
        return JsonResponse(dict(status=True, data=result))
    except Exception as e:
        return JsonResponse(dict(status=False, error=str(e)), status=400)





@md.GET('location/address/suggestions')
@md.requires_authentication()
@md.requires_params("input")
def rest_address_suggestions(request):
    """
    Get address suggestions for autocomplete

    GET /api/location/address/suggestions?input=1600+Amph
    GET /api/location/address/suggestions?input=1600+Amph&session_token=abc123

    Params:
        input (str): Partial address text (required, min 3 characters)
        session_token (str): Optional - if not provided, a new one will be generated and returned
        country (str): ISO country code (default: "US")
        lat (float): Latitude for location bias (optional)
        lng (float): Longitude for location bias (optional)
        radius (int): Radius in meters for location bias (optional)

    Returns:
        {
            "success": true,
            "session_token": "550e8400-e29b-41d4-a716-446655440000",
            "data": [
                {
                    "id": "ChIJ...",
                    "place_id": "ChIJ...",
                    "description": "1600 Amphitheatre Parkway, Mountain View, CA, USA",
                    "main_text": "1600 Amphitheatre Parkway",
                    "secondary_text": "Mountain View, CA, USA"
                }
            ],
            "size": 5,
            "count": 5
        }

    Workflow:
        1. First request (no session_token) -> returns session_token in response
        2. Subsequent requests -> reuse session_token from first response
        3. When user selects -> use same session_token for place-details
        4. New address entry -> omit session_token to get a new one
    """
    input_text = request.DATA.get("input")
    session_token = request.DATA.get("session_token")

    # Generate session token if not provided
    if not session_token:
        session_token = str(uuid.uuid4())

    country = request.DATA.get("country", "US")

    # Optional location bias
    location_bias = None
    lat = request.DATA.get_typed("lat", None, float)
    lng = request.DATA.get_typed("lng", None, float)
    if lat is not None and lng is not None:
        location_bias = {"lat": lat, "lng": lng}

    radius = request.DATA.get_typed("radius", None, int)

    try:
        result = location.get_address_suggestions(
            input_text=input_text,
            session_token=session_token,
            country=country,
            location=location_bias,
            radius=radius
        )
        # Add session_token to response for client to reuse
        result["session_token"] = session_token
        return JsonResponse(result)
    except Exception as e:
        return JsonResponse(dict(success=False, error=str(e), data=[], size=0, count=0), status=400)


@md.GET('location/address/place-details')
@md.requires_authentication()
@md.requires_params("place_id")
def rest_place_details(request):
    """
    Get full address details for a selected place

    GET /api/location/address/place-details?place_id=ChIJ...&session_token=abc123

    Params:
        place_id (str): Place ID from autocomplete suggestion (required)
        session_token (str): Same session token used in autocomplete (optional but recommended)

    Returns:
        {
            "success": true,
            "address": {
                "address1": "1600 Amphitheatre Parkway",
                "city": "Mountain View",
                "state": "California",
                "state_code": "CA",
                "postal_code": "94043",
                "latitude": 37.4224764,
                "longitude": -122.0842499,
                "formatted_address": "..."
            }
        }
    """
    place_id = request.DATA.get("place_id")
    session_token = request.DATA.get("session_token")

    try:
        result = location.get_place_details(
            place_id=place_id,
            session_token=session_token
        )
        return JsonResponse(result)
    except Exception as e:
        return JsonResponse(dict(success=False, error=str(e)), status=400)


@md.POST('location/address/geocode')
@md.requires_authentication()
@md.requires_params("address")
def rest_geocode_address(request):
    """
    Convert address to coordinates (geocoding)

    POST /api/location/address/geocode

    Body:
        address (str or dict): Full address string or address components

    Returns:
        {
            "success": true,
            "latitude": 37.4224764,
            "longitude": -122.0842499,
            "formatted_address": "...",
            "place_id": "...",
            "address_components": {...}
        }
    """
    from mojo.helpers.location import google

    address = request.DATA.get("address")

    try:
        service = google.get_google_api()
        result = service.geocode_address(address)
        return JsonResponse(result)
    except Exception as e:
        return JsonResponse(dict(success=False, error=str(e)), status=400)


@md.GET('location/address/reverse-geocode')
@md.requires_authentication()
@md.requires_params("lat", "lng")
def rest_reverse_geocode(request):
    """
    Convert coordinates to address (reverse geocoding)

    GET /api/location/address/reverse-geocode?lat=37.4224764&lng=-122.0842499

    Params:
        lat (float): Latitude (required)
        lng (float): Longitude (required)

    Returns:
        {
            "success": true,
            "formatted_address": "...",
            "place_id": "...",
            "address_components": {...}
        }
    """
    from mojo.helpers.location import google

    lat = request.DATA.get_typed("lat", None, float)
    lng = request.DATA.get_typed("lng", None, float)

    if lat is None or lng is None:
        return JsonResponse(dict(success=False, error="Invalid lat/lng coordinates"), status=400)

    try:
        service = google.get_google_api()
        result = service.reverse_geocode(lat, lng)
        return JsonResponse(result)
    except Exception as e:
        return JsonResponse(dict(success=False, error=str(e)), status=400)


@md.GET('location/timezone')
@md.requires_authentication()
@md.requires_params("lat", "lng")
def rest_get_timezone(request):
    """
    Get timezone information for coordinates

    GET /api/location/timezone?lat=37.4224764&lng=-122.0842499

    Params:
        lat (float): Latitude (required)
        lng (float): Longitude (required)
        timestamp (int): Unix timestamp (optional, default: current time)

    Returns:
        {
            "success": true,
            "timezone_id": "America/Los_Angeles",
            "timezone_name": "Pacific Daylight Time",
            "raw_offset": -28800,
            "dst_offset": 3600,
            "total_offset": -25200
        }
    """
    from mojo.helpers.location import google

    lat = request.DATA.get_typed("lat", None, float)
    lng = request.DATA.get_typed("lng", None, float)
    timestamp = request.DATA.get_typed("timestamp", None, int)

    if lat is None or lng is None:
        return JsonResponse(dict(success=False, error="Invalid lat/lng coordinates"), status=400)

    try:
        service = google.get_google_api()
        result = service.get_timezone(lat, lng, timestamp)
        return JsonResponse(result)
    except Exception as e:
        return JsonResponse(dict(success=False, error=str(e)), status=400)


# Public endpoint for testing (no auth required)
@md.GET('location/address/validate-sample')
@md.public_endpoint()
def rest_validate_address_sample(request):
    """
    Sample address validation endpoint (public, for testing)

    GET /api/location/address/validate-sample

    Returns a validated sample address for testing purposes.
    """
    sample_address = {
        "address1": "1600 Amphitheatre Parkway",
        "city": "Mountain View",
        "state": "CA",
        "postal_code": "94043",
        "provider": "google"
    }

    try:
        result = location.validate_address(sample_address)
        return JsonResponse(dict(status=True, data=result, sample=True))
    except Exception as e:
        return JsonResponse(dict(status=False, error=str(e)), status=400)
