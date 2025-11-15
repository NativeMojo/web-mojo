# Passkey Management - MOJO Framework

MOJO provides a simple, KISS-based implementation for managing WebAuthn/FIDO2 passkeys in your applications.

## Overview

Passkeys enable passwordless authentication using your device's built-in security features (Face ID, Touch ID, Windows Hello, etc.). They're more secure than passwords and can't be phished.

## Model Structure

The Passkeys model (`src/core/models/Passkeys.js`) provides:

- **Passkey** - Model for individual passkey CRUD operations
- **PasskeyList** - Collection for listing user passkeys
- **PasskeyForms** - Form configurations for edit/view dialogs

## Basic Usage

### Import the Model

```javascript
import { Passkey, PasskeyList } from 'web-mojo/models';
```

### List User's Passkeys

```javascript
const passkeys = new PasskeyList();
await passkeys.fetch();

// Display passkeys
passkeys.models.forEach(passkey => {
  console.log(passkey.get('friendly_name'), passkey.get('rp_id'));
});
```

### Register a New Passkey

Registration is a two-step WebAuthn flow:

```javascript
// Step 1: Begin registration (get challenge from server)
const beginResponse = await Passkey.registerBegin();

if (beginResponse.success) {
  const { challenge_id, publicKey } = beginResponse.data;
  
  // Step 2: Create credential using WebAuthn API
  const credential = await navigator.credentials.create({
    publicKey: publicKey
  });
  
  // Step 3: Complete registration (send credential to server)
  const completeResponse = await Passkey.registerComplete({
    challenge_id: challenge_id,
    credential: {
      id: credential.id,
      rawId: arrayBufferToBase64(credential.rawId),
      type: credential.type,
      response: {
        clientDataJSON: arrayBufferToBase64(credential.response.clientDataJSON),
        attestationObject: arrayBufferToBase64(credential.response.attestationObject)
      },
      transports: credential.response.getTransports ? 
        credential.response.getTransports() : []
    },
    friendly_name: 'My MacBook Pro'
  });
  
  if (completeResponse.success) {
    console.log('✅ Passkey registered successfully!');
  }
}

// Helper function
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
```

### Update Passkey

```javascript
const passkey = new Passkey({ id: 123 });
await passkey.fetch();

// Update friendly name
passkey.set('friendly_name', 'My New iPhone');
await passkey.save();

// Disable passkey
passkey.set('is_enabled', false);
await passkey.save();
```

### Delete Passkey

```javascript
const passkey = new Passkey({ id: 123 });
await passkey.destroy();
```

## API Endpoints

The backend provides these endpoints:

### Standard CRUD
- `GET /api/account/passkeys` - List all passkeys for current user
- `GET /api/account/passkeys/<id>` - Get passkey details
- `POST /api/account/passkeys/<id>` - Update passkey (friendly_name, is_enabled)
- `DELETE /api/account/passkeys/<id>` - Delete passkey

### Registration Flow
- `POST /api/account/passkeys/register/begin` - Begin registration (get challenge)
- `POST /api/account/passkeys/register/complete` - Complete registration (submit credential)

## Model Fields

| Field | Type | Editable | Description |
|-------|------|----------|-------------|
| `id` | Integer | ❌ | Primary key |
| `friendly_name` | String | ✅ | Display name (e.g., "My iPhone") |
| `is_enabled` | Boolean | ✅ | Enable/disable passkey |
| `rp_id` | String | ❌ | Portal domain (auto-set from Origin) |
| `credential_id` | String | ❌ | WebAuthn credential ID |
| `aaguid` | String | ❌ | Authenticator GUID |
| `transports` | Array | ❌ | Transport methods (internal, usb, nfc, ble) |
| `sign_count` | Integer | ❌ | Usage counter (for clone detection) |
| `last_used` | DateTime | ❌ | Last authentication timestamp |
| `created` | DateTime | ❌ | Creation timestamp |

## Multi-Portal Support

Passkeys are automatically scoped to the portal (domain) where they're registered:

- User visits `portal1.example.com` and registers → `rp_id: portal1.example.com`
- User visits `portal2.example.com` and registers → `rp_id: portal2.example.com`
- Each portal only uses passkeys with matching `rp_id`

**No configuration needed!** The Origin header handles everything automatically.

## Example Page

See the complete working example at: `examples/auth/passkeys.html`

This example demonstrates:
- ✅ Listing user's passkeys
- ✅ Registering new passkeys with WebAuthn
- ✅ Editing friendly names and enabled status
- ✅ Deleting passkeys
- ✅ Responsive UI with Bootstrap
- ✅ Error handling and user feedback

To run the example:
```bash
npm run examples
# Visit http://localhost:5000/examples/auth/passkeys.html
```

## Browser Compatibility

WebAuthn requires:
- **HTTPS** (or localhost for development)
- Modern browser with WebAuthn support:
  - Chrome 67+
  - Firefox 60+
  - Safari 13+
  - Edge 18+

Check for support before attempting registration:

```javascript
if (!window.PublicKeyCredential) {
  console.error('WebAuthn is not supported in this browser');
}
```

## Security Features

✅ **Counter verification** - Detects cloned authenticators  
✅ **Single-use challenges** - Prevents replay attacks  
✅ **Origin validation** - Ensures requests match expected portal  
✅ **Auto-expiring challenges** - Redis TTL (5 minutes)  
✅ **RP isolation** - Passkeys bound to specific portals  

## Common Issues

### "WebAuthn is not supported"
- Ensure you're using HTTPS (or localhost)
- Update to a modern browser
- Check browser compatibility

### "Origin header is required"
- The backend derives RP ID from the Origin header
- Ensure your HTTP client sends proper Origin headers

### "Invalid or expired challenge"
- Challenges expire after 5 minutes
- Restart the registration flow
- Check that Redis is running on the backend

### "No passkeys registered for this portal"
- Passkeys are portal-specific
- User needs to register a new passkey for each portal/domain

## Architecture

The implementation follows KISS principles:

- ✅ **Single file** - Everything in `Passkeys.js`
- ✅ **Standard patterns** - Follows MOJO model conventions
- ✅ **Minimal forms** - Only edit form (most fields read-only)
- ✅ **Static methods** - `registerBegin()` and `registerComplete()` 
- ✅ **No login flow** - Login handled separately in auth module

## Integration with Auth Module

**Note:** The passkey **management** UI (this module) is separate from the passkey **login** flow. 

- Management UI: User manages their registered passkeys
- Login flow: User authenticates using a passkey (handled in auth module)

The management endpoints require the user to be already authenticated (JWT Bearer token).

## Form Configuration

The `PasskeyForms` object provides pre-configured forms:

### Edit Form
```javascript
import { PasskeyForms } from 'web-mojo/models';

// Use with FormView or Dialog
const editFields = PasskeyForms.edit.fields;
// Fields: friendly_name (text), is_enabled (switch)
```

### View Form
```javascript
// Read-only view of all passkey details
const viewFields = PasskeyForms.view.fields;
// Shows: friendly_name, is_enabled, rp_id, aaguid, transports, 
//        sign_count, last_used, created
```

## Best Practices

1. **Always check WebAuthn support** before showing UI
2. **Provide clear instructions** for first-time users
3. **Allow multiple passkeys** per user (backup devices)
4. **Show last_used timestamps** so users know which devices are active
5. **Confirm before deletion** - passkeys can't be recovered
6. **Use friendly names** - help users identify devices
7. **Handle errors gracefully** - show user-friendly messages

## Development Tips

```javascript
// Get default device name based on user agent
function getDefaultDeviceName() {
  const ua = navigator.userAgent;
  if (ua.includes('Mac')) return 'My Mac';
  if (ua.includes('iPhone')) return 'My iPhone';
  if (ua.includes('iPad')) return 'My iPad';
  if (ua.includes('Android')) return 'My Android';
  if (ua.includes('Windows')) return 'My Windows PC';
  return 'My Device';
}

// Display device icon based on transport
function getDeviceIcon(transports) {
  if (!transports || transports.length === 0) return '🔑';
  if (transports.includes('internal')) return '📱';
  if (transports.includes('usb')) return '🔌';
  if (transports.includes('nfc')) return '📡';
  if (transports.includes('ble')) return '📶';
  return '🔑';
}
```

## Related Documentation

- Backend API: `docs/guide/Passkeys.md` (API specification)
- Auth Module: `src/extensions/auth/README.md`
- Example: `examples/auth/passkeys.html`
