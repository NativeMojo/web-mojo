# Field Types Reference

This guide covers all basic field types available in WEB-MOJO forms. For advanced input components (TagInput, DatePicker, etc.), see the [inputs/ documentation](./inputs/README.md).

## Quick Reference

### Basic Input Fields
| Field Type | Use Case | Key Options |
|------------|----------|-------------|
| `text` | Single-line text | `placeholder`, `maxlength`, `pattern` |
| `email` | Email addresses | `placeholder`, validation |
| `password` | Passwords | `showToggle`, `strengthMeter`, `autocomplete` |
| `tel` | Phone numbers | `placeholder`, `pattern` |
| `url` | URLs | `placeholder`, validation |
| `search` | Search with live filtering | `debounce`, `data-filter` |
| `hex` | Hexadecimal values | `hexType`, `allowPrefix`, `minLength` |
| `number` | Numeric input | `min`, `max`, `step` |
| `textarea` | Multi-line text | `rows`, `cols`, `maxlength` |
| `htmlpreview` | HTML with preview | `rows`, sandboxed iframe |
| `json` | JSON data | `rows`, auto-formatting |

### Selection Fields
| Field Type | Use Case | Key Options |
|------------|----------|-------------|
| `select` | Dropdown selection | `options`, `multiple`, `searchable` |
| `multiselect` | Multi-select dropdown | `options`, `maxHeight`, `placeholder` |
| `checkbox` | Boolean/multi-choice | `checked`, `options`, `inline` |
| `toggle` / `switch` | Toggle switch | `checked`, `size` |
| `radio` | Single choice | `options`, `inline` |
| `buttongroup` | Button-style selection | `options`, `size`, `variant` |
| `checklistdropdown` | Dropdown with checkboxes | `options`, `buttonText` |

### File & Media Fields
| Field Type | Use Case | Key Options |
|------------|----------|-------------|
| `file` | File uploads | `accept`, `multiple`, `fileMode` |
| `image` | Image upload with preview | `size`, `allowDrop`, `placeholder` |

### Date & Time Fields
| Field Type | Use Case | Key Options |
|------------|----------|-------------|
| `date` | Date picker | `min`, `max` |
| `datetime-local` | Date & time | `min`, `max` |
| `time` | Time picker | `min`, `max`, `step` |

### Other Fields
| Field Type | Use Case | Key Options |
|------------|----------|-------------|
| `color` | Color picker | `value` |
| `range` | Slider | `min`, `max`, `step` |
| `hidden` | Hidden values | `value` |
| `combo` / `combobox` | Editable dropdown | `options`, `allowCustom` |
| `tabset` | Tabbed field groups | `tabs` |

---

## Text Inputs

### `text` - Single Line Text

**Basic Usage:**
```javascript
{
  type: 'text',
  name: 'username',
  label: 'Username',
  placeholder: 'Enter your username',
  required: true
}
```

**Options:**
- `placeholder` - Hint text shown when empty
- `maxlength` - Maximum number of characters
- `pattern` - Regex pattern for validation (HTML5)
- `autocomplete` - Browser autocomplete hint (e.g., `'username'`, `'off'`)
- `readonly` - Make field read-only
- `disabled` - Disable the field

**Advanced Example:**
```javascript
{
  type: 'text',
  name: 'account_id',
  label: 'Account ID',
  placeholder: 'ACC-XXXX',
  pattern: 'ACC-[0-9]{4}',
  maxlength: 8,
  help: 'Format: ACC-1234',
  required: true,
  validation: {
    custom: (value) => {
      if (!value.startsWith('ACC-')) {
        return 'Account ID must start with ACC-';
      }
      return true;
    }
  }
}
```

---

### `email` - Email Address

**Basic Usage:**
```javascript
{
  type: 'email',
  name: 'email',
  label: 'Email Address',
  placeholder: 'you@example.com',
  required: true
}
```

**Features:**
- Automatic email validation (HTML5)
- Mobile keyboards show @ symbol
- Supports `multiple` for comma-separated emails

**Multiple Emails:**
```javascript
{
  type: 'email',
  name: 'recipients',
  label: 'Email Recipients',
  placeholder: 'email1@example.com, email2@example.com',
  multiple: true,
  help: 'Separate multiple emails with commas'
}
```

---

### `password` - Password Input

**Basic Usage:**
```javascript
{
  type: 'password',
  name: 'password',
  label: 'Password',
  placeholder: 'Enter password',
  required: true
}
```

**Options:**
- `autocomplete` - `'current-password'`, `'new-password'`
- `minlength` - Minimum password length
- `pattern` - Password complexity pattern

**Password with Strength Requirements:**
```javascript
{
  type: 'password',
  name: 'new_password',
  label: 'New Password',
  minlength: 8,
  pattern: '(?=.*\\d)(?=.*[a-z])(?=.*[A-Z]).{8,}',
  help: 'Must contain at least 8 characters, one uppercase, one lowercase, and one number',
  autocomplete: 'new-password',
  required: true
}
```

---

### `tel` - Phone Number

**Basic Usage:**
```javascript
{
  type: 'tel',
  name: 'phone',
  label: 'Phone Number',
  placeholder: '(555) 123-4567'
}
```

**Features:**
- Mobile keyboards show numeric keypad
- No automatic validation (use `pattern`)

**US Phone Format:**
```javascript
{
  type: 'tel',
  name: 'phone',
  label: 'Phone',
  placeholder: '(555) 123-4567',
  pattern: '\\([0-9]{3}\\) [0-9]{3}-[0-9]{4}',
  help: 'Format: (555) 123-4567'
}
```

---

### `url` - URL Input

**Basic Usage:**
```javascript
{
  type: 'url',
  name: 'website',
  label: 'Website',
  placeholder: 'https://example.com'
}
```

**Features:**
- Automatic URL validation (HTML5)
- Mobile keyboards show .com button

**URL with Protocol Check:**
```javascript
{
  type: 'url',
  name: 'profile_url',
  label: 'Profile URL',
  placeholder: 'https://github.com/username',
  validation: {
    custom: (value) => {
      if (value && !value.startsWith('https://')) {
        return 'URL must use HTTPS';
      }
      return true;
    }
  }
}
```

---

### `number` - Numeric Input

**Basic Usage:**
```javascript
{
  type: 'number',
  name: 'age',
  label: 'Age',
  min: 18,
  max: 120
}
```

**Options:**
- `min` - Minimum value
- `max` - Maximum value
- `step` - Increment/decrement step (default: 1)
- `placeholder` - Hint text

**Decimal Numbers:**
```javascript
{
  type: 'number',
  name: 'price',
  label: 'Price',
  min: 0,
  step: 0.01,
  placeholder: '0.00',
  help: 'Enter price in USD'
}
```

**Integer Only:**
```javascript
{
  type: 'number',
  name: 'quantity',
  label: 'Quantity',
  min: 1,
  max: 999,
  step: 1,
  required: true
}
```

---

### `textarea` - Multi-line Text

**Basic Usage:**
```javascript
{
  type: 'textarea',
  name: 'description',
  label: 'Description',
  rows: 5,
  placeholder: 'Enter description'
}
```

**Options:**
- `rows` - Number of visible rows (default: 3)
- `cols` - Number of columns (rarely used, prefer CSS)
- `maxlength` - Maximum characters
- `placeholder` - Hint text

**Large Text Area:**
```javascript
{
  type: 'textarea',
  name: 'notes',
  label: 'Notes',
  rows: 10,
  maxlength: 5000,
  placeholder: 'Enter detailed notes here...',
  help: 'Maximum 5000 characters'
}
```

---

### `search` - Search Input

**Basic Usage:**
```javascript
{
  type: 'search',
  name: 'query',
  label: 'Search',
  placeholder: 'Search...',
  debounce: 300
}
```

**Features:**
- Automatic live search filtering
- Debounced input (default: 300ms)
- Custom data attributes for filtering

**With Live Filtering:**
```javascript
{
  type: 'search',
  name: 'search_users',
  label: 'Search Users',
  placeholder: 'Type to search...',
  debounce: 500,
  attributes: {
    'data-filter': 'live-search',
    'data-change-action': 'filter-search',
    'data-target': 'user-list'
  }
}
```

---

### `hex` - Hexadecimal Input

**Basic Usage:**
```javascript
{
  type: 'hex',
  name: 'color_hex',
  label: 'Hex Color',
  hexType: 'color',
  allowPrefix: true
}
```

**Options:**
- `hexType` - Validation type: `'color'`, `'color-short'`, `'string'`, `'any'`
- `allowPrefix` - Allow `#` prefix (default: true)
- `minLength` - Minimum hex length
- `maxLength` - Maximum hex length

**Hex Types:**

**Color (6 digits):**
```javascript
{
  type: 'hex',
  name: 'brand_color',
  label: 'Brand Color',
  hexType: 'color',
  allowPrefix: true,
  placeholder: '#FF0000'
}
// Accepts: #FF0000 or FF0000
```

**Color Short (3 or 6 digits):**
```javascript
{
  type: 'hex',
  name: 'theme_color',
  label: 'Theme Color',
  hexType: 'color-short',
  allowPrefix: true,
  placeholder: '#F00 or #FF0000'
}
// Accepts: #F00, F00, #FF0000, FF0000
```

**General Hex String:**
```javascript
{
  type: 'hex',
  name: 'api_key',
  label: 'API Key',
  hexType: 'string',
  allowPrefix: false,
  minLength: 32,
  maxLength: 32,
  placeholder: 'ABCDEF1234567890...'
}
// Accepts: Any hex string (0-9, A-F) of specified length
```

---

### `json` - JSON Editor

**Basic Usage:**
```javascript
{
  type: 'json',
  name: 'metadata',
  label: 'Metadata',
  rows: 8
}
```

**Features:**
- Automatic JSON formatting (pretty-print)
- Object values automatically stringified
- Validation on submission

**With Default Object:**
```javascript
{
  type: 'json',
  name: 'config',
  label: 'Configuration',
  rows: 10,
  value: {
    api_url: 'https://api.example.com',
    timeout: 5000,
    retries: 3
  },
  help: 'JSON configuration object'
}
// Automatically formatted as:
// {
//   "api_url": "https://api.example.com",
//   "timeout": 5000,
//   "retries": 3
// }
```

---

### `htmlpreview` - HTML with Preview

**Basic Usage:**
```javascript
{
  type: 'htmlpreview',
  name: 'html_content',
  label: 'HTML Content',
  rows: 12,
  help: 'Write HTML and click Preview to see it rendered'
}
```

**Features:**
- Textarea for HTML editing
- Preview button in top-right corner
- Opens sandboxed iframe in dialog
- Useful for email templates, rich content

**Email Template Example:**
```javascript
{
  type: 'htmlpreview',
  name: 'email_template',
  label: 'Email Template',
  rows: 15,
  required: true,
  help: 'Use HTML with inline styles for best email compatibility',
  value: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; }
    .header { background: #007bff; color: white; padding: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Welcome!</h1>
  </div>
</body>
</html>
  `.trim()
}
```

---

## Selection Inputs

### `select` - Dropdown

**Basic Usage:**
```javascript
{
  type: 'select',
  name: 'country',
  label: 'Country',
  options: [
    { value: 'us', label: 'United States' },
    { value: 'ca', label: 'Canada' },
    { value: 'mx', label: 'Mexico' }
  ],
  required: true
}
```

**Options Formats:**

**Array of Objects:**
```javascript
options: [
  { value: 'admin', label: 'Administrator' },
  { value: 'user', label: 'Regular User' },
  { value: 'guest', label: 'Guest' }
]
```

**Array of Strings (value = label):**
```javascript
options: ['Small', 'Medium', 'Large', 'X-Large']
```

**Object (key = value, value = label):**
```javascript
options: {
  'draft': 'Draft',
  'pending': 'Pending Review',
  'published': 'Published',
  'archived': 'Archived'
}
```

**Multi-Select:**
```javascript
{
  type: 'select',
  name: 'interests',
  label: 'Interests',
  multiple: true,
  size: 5,
  options: [
    'Programming',
    'Design',
    'Marketing',
    'Sales',
    'Support'
  ],
  help: 'Hold Ctrl/Cmd to select multiple'
}
```

**With Placeholder:**
```javascript
{
  type: 'select',
  name: 'department',
  label: 'Department',
  options: [
    { value: '', label: '-- Select Department --' },
    { value: 'eng', label: 'Engineering' },
    { value: 'sales', label: 'Sales' },
    { value: 'hr', label: 'Human Resources' }
  ]
}
```

**Searchable Select:**
```javascript
{
  type: 'select',
  name: 'country',
  label: 'Country',
  searchable: true, // Adds search input above select
  options: [
    { value: 'us', label: 'United States' },
    { value: 'ca', label: 'Canada' },
    { value: 'mx', label: 'Mexico' },
    { value: 'uk', label: 'United Kingdom' },
    // ... many more options
  ]
}
```

**Auto-Generate Numeric Options:**
```javascript
{
  type: 'select',
  name: 'birth_year',
  label: 'Birth Year',
  start: 1950,
  end: 2010,
  step: 1,
  prefix: 'Year '
}
// Automatically generates options: Year 1950, Year 1951, ..., Year 2010
```

**With Formatting:**
```javascript
{
  type: 'select',
  name: 'day',
  label: 'Day',
  start: 1,
  end: 31,
  format: 'ordinal' // Formats as: 1st, 2nd, 3rd, 4th, ...
}
```

---

### `checkbox` - Checkboxes

**Single Checkbox (Boolean):**
```javascript
{
  type: 'checkbox',
  name: 'agree_terms',
  label: 'I agree to the Terms of Service',
  required: true
}
```

**Multiple Checkboxes:**
```javascript
{
  type: 'checkbox',
  name: 'features',
  label: 'Enabled Features',
  options: [
    { value: 'email', label: 'Email Notifications' },
    { value: 'sms', label: 'SMS Notifications' },
    { value: 'push', label: 'Push Notifications' }
  ]
}
```

**Pre-checked Values:**
```javascript
{
  type: 'checkbox',
  name: 'permissions',
  label: 'Permissions',
  options: ['read', 'write', 'delete'],
  value: ['read', 'write'] // Pre-check read and write
}
```

**Inline Layout:**
```javascript
{
  type: 'checkbox',
  name: 'hobbies',
  label: 'Hobbies',
  options: ['Reading', 'Sports', 'Music', 'Gaming'],
  inline: true // Display horizontally
}
```

---

### `radio` - Radio Buttons

**Basic Usage:**
```javascript
{
  type: 'radio',
  name: 'subscription',
  label: 'Subscription Plan',
  options: [
    { value: 'free', label: 'Free' },
    { value: 'pro', label: 'Pro - $9/month' },
    { value: 'enterprise', label: 'Enterprise - $49/month' }
  ],
  required: true
}
```

**Pre-selected Value:**
```javascript
{
  type: 'radio',
  name: 'theme',
  label: 'Theme',
  options: ['Light', 'Dark', 'Auto'],
  value: 'Auto' // Default selection
}
```

**Inline Layout:**
```javascript
{
  type: 'radio',
  name: 'gender',
  label: 'Gender',
  options: ['Male', 'Female', 'Other', 'Prefer not to say'],
  inline: true
}
```

---

### `toggle` / `switch` - Toggle Switch

**Basic Usage:**
```javascript
{
  type: 'toggle',
  name: 'email_notifications',
  label: 'Enable Email Notifications',
  value: true
}
```

**Options:**
- `size` - Switch size: `'sm'`, `'md'` (default), `'lg'`
- `checked` / `value` - Initial state (boolean)

**Different Sizes:**
```javascript
{
  type: 'toggle',
  name: 'dark_mode',
  label: 'Dark Mode',
  size: 'lg',
  value: false
}
```

**Multiple Toggles:**
```javascript
[
  {
    type: 'toggle',
    name: 'notifications_email',
    label: 'Email Notifications',
    value: true,
    colClass: 'col-12'
  },
  {
    type: 'toggle',
    name: 'notifications_sms',
    label: 'SMS Notifications',
    value: false,
    colClass: 'col-12'
  },
  {
    type: 'toggle',
    name: 'notifications_push',
    label: 'Push Notifications',
    value: true,
    colClass: 'col-12'
  }
]
```

---

### `multiselect` - Multi-Select Dropdown

**Basic Usage:**
```javascript
{
  type: 'multiselect',
  name: 'skills',
  label: 'Skills',
  options: [
    { value: 'js', label: 'JavaScript' },
    { value: 'py', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'go', label: 'Go' }
  ],
  placeholder: 'Select skills...'
}
```

**Options:**
- `options` - Array of options (objects or strings)
- `placeholder` - Placeholder text
- `maxHeight` - Maximum dropdown height in pixels (default: 300)
- `value` - Pre-selected values (array)

**With Pre-selected Values:**
```javascript
{
  type: 'multiselect',
  name: 'permissions',
  label: 'Permissions',
  options: ['read', 'write', 'delete', 'admin'],
  value: ['read', 'write'],
  maxHeight: 200
}
```

---

### `buttongroup` - Button Group Selection

**Basic Usage:**
```javascript
{
  type: 'buttongroup',
  name: 'view_mode',
  label: 'View Mode',
  options: [
    { value: 'grid', label: 'Grid', icon: 'bi-grid' },
    { value: 'list', label: 'List', icon: 'bi-list' },
    { value: 'table', label: 'Table', icon: 'bi-table' }
  ],
  value: 'grid'
}
```

**Options:**
- `options` - Array of button options
- `size` - Button size: `'sm'`, `'md'`, `'lg'`
- `variant` - Button style: `'outline-primary'`, `'outline-secondary'`, etc.
- `value` - Selected button value

**Styled Button Group:**
```javascript
{
  type: 'buttongroup',
  name: 'alignment',
  label: 'Text Alignment',
  size: 'sm',
  variant: 'outline-secondary',
  options: [
    { value: 'left', label: 'Left', icon: 'bi-text-left' },
    { value: 'center', label: 'Center', icon: 'bi-text-center' },
    { value: 'right', label: 'Right', icon: 'bi-text-right' }
  ]
}
```

---

### `checklistdropdown` - Checklist Dropdown

**Basic Usage:**
```javascript
{
  type: 'checklistdropdown',
  name: 'filters',
  label: 'Filters',
  buttonText: 'Select Filters',
  buttonIcon: 'bi-filter',
  options: [
    { value: 'active', label: 'Active' },
    { value: 'pending', label: 'Pending' },
    { value: 'archived', label: 'Archived' }
  ]
}
```

**Options:**
- `buttonText` - Dropdown button text
- `buttonIcon` - Bootstrap icon class
- `buttonClass` - Button CSS classes
- `dropdownClass` - Dropdown menu CSS classes
- `minWidth` - Minimum dropdown width

**Custom Styling:**
```javascript
{
  type: 'checklistdropdown',
  name: 'status_filter',
  buttonText: 'Filter by Status',
  buttonIcon: 'bi-funnel',
  buttonClass: 'btn btn-primary btn-sm dropdown-toggle',
  minWidth: '250px',
  options: [
    { value: 'draft', label: 'Draft' },
    { value: 'review', label: 'In Review' },
    { value: 'published', label: 'Published' }
  ]
}
```

---

### `combo` / `combobox` / `autocomplete` - Editable Dropdown

**Basic Usage:**
```javascript
{
  type: 'combo',
  name: 'country',
  label: 'Country',
  options: ['United States', 'Canada', 'Mexico', 'United Kingdom'],
  placeholder: 'Type or select...',
  allowCustom: true
}
```

**Options:**
- `options` - Array of options (strings or objects)
- `placeholder` - Placeholder text
- `allowCustom` - Allow user to enter custom values (default: true)
- `maxHeight` - Maximum dropdown height

**With Custom Values Disabled:**
```javascript
{
  type: 'combobox',
  name: 'state',
  label: 'State',
  options: [
    { value: 'CA', label: 'California' },
    { value: 'NY', label: 'New York' },
    { value: 'TX', label: 'Texas' }
  ],
  allowCustom: false, // Only allow selection from list
  placeholder: 'Select state...'
}
```

---

## File Inputs

### `file` - File Upload

**Basic Usage:**
```javascript
{
  type: 'file',
  name: 'avatar',
  label: 'Profile Picture',
  accept: 'image/*'
}
```

**Options:**
- `accept` - File type filter (e.g., `'image/*'`, `'.pdf,.doc'`)
- `multiple` - Allow multiple file selection
- `fileMode` - `'base64'` (default) or `'multipart'`

**Multiple Files:**
```javascript
{
  type: 'file',
  name: 'attachments',
  label: 'Attachments',
  multiple: true,
  accept: '.pdf,.doc,.docx',
  help: 'Upload PDF or Word documents'
}
```

**Image Upload with Preview:**
```javascript
{
  type: 'file',
  name: 'photo',
  label: 'Photo',
  accept: 'image/jpeg,image/png',
  fileMode: 'base64', // Embed as base64 in form data
  help: 'JPEG or PNG only, max 5MB'
}
```

**File Mode Comparison:**

| Mode | Data Format | Use Case |
|------|-------------|----------|
| `base64` | Embedded in JSON | Small files, simple APIs |
| `multipart` | FormData | Large files, standard uploads |

**Multipart Example:**
```javascript
{
  type: 'file',
  name: 'document',
  label: 'Document',
  fileMode: 'multipart', // Use FormData for submission
  accept: '.pdf'
}
```

**Handling File Data:**
```javascript
// With base64 mode
const formData = await form.getFormData();
console.log(formData.avatar); // "data:image/png;base64,iVBORw0KG..."

// With multipart mode
const formData = await form.getFormData();
formData.append('document', fileInput.files[0]);
```

---

### `image` - Image Upload with Preview

**Basic Usage:**
```javascript
{
  type: 'image',
  name: 'profile_photo',
  label: 'Profile Photo',
  size: 'md'
}
```

**Options:**
- `size` - Preview size: `'xs'` (48px), `'sm'` (96px), `'md'` (150px), `'lg'` (200px), `'xl'` (300px)
- `accept` - File types (default: `'image/*'`)
- `allowDrop` - Enable drag & drop (default: true)
- `placeholder` - Placeholder text

**Size Options:**

| Size | Dimensions | Use Case |
|------|------------|----------|
| `xs` | 48×48px | Thumbnails, icons |
| `sm` | 96×96px | Small avatars |
| `md` | 150×150px | Profile pictures |
| `lg` | 200×200px | Featured images |
| `xl` | 300×300px | Hero images |

**Different Sizes:**
```javascript
{
  type: 'image',
  name: 'avatar',
  label: 'Avatar',
  size: 'sm',
  accept: 'image/jpeg,image/png',
  placeholder: 'Drop your avatar here'
}
```

**Large Image Upload:**
```javascript
{
  type: 'image',
  name: 'banner',
  label: 'Banner Image',
  size: 'xl',
  allowDrop: true,
  help: 'Recommended: 1200x400px, max 5MB'
}
```

**Features:**
- Drag & drop support
- Instant image preview
- Remove button overlay
- Responsive sizing
- Supports renditions (automatic size selection)

**Handling Renditions:**
```javascript
// The image field automatically selects appropriate rendition based on size
{
  type: 'image',
  name: 'photo',
  size: 'md'
}

// If value is an object with renditions, it will use:
// xs: thumbnail_sm or square_sm
// sm: thumbnail or thumbnail_sm
// md: thumbnail_md or thumbnail
// lg: thumbnail_lg or thumbnail_md
// xl: original or thumbnail_lg
```

---

## Hidden & Special

### `hidden` - Hidden Field

**Basic Usage:**
```javascript
{
  type: 'hidden',
  name: 'user_id',
  value: '12345'
}
```

**Common Use Cases:**
- IDs and foreign keys
- CSRF tokens
- Form state tracking

**Example with Dynamic Value:**
```javascript
{
  type: 'hidden',
  name: 'csrf_token',
  value: window.csrfToken || ''
}
```

---

## Date & Time Inputs

### `date` - Date Picker

**Basic Usage:**
```javascript
{
  type: 'date',
  name: 'start_date',
  label: 'Start Date',
  required: true
}
```

**With Min/Max:**
```javascript
{
  type: 'date',
  name: 'birth_date',
  label: 'Birth Date',
  min: '1900-01-01',
  max: new Date().toISOString().split('T')[0], // Today
  required: true
}
```

---

### `datetime-local` - Date & Time

**Basic Usage:**
```javascript
{
  type: 'datetime-local',
  name: 'meeting_time',
  label: 'Meeting Time',
  required: true
}
```

**With Min (Now):**
```javascript
{
  type: 'datetime-local',
  name: 'appointment',
  label: 'Appointment',
  min: new Date().toISOString().slice(0, 16), // Current datetime
  required: true
}
```

---

### `time` - Time Picker

**Basic Usage:**
```javascript
{
  type: 'time',
  name: 'alarm_time',
  label: 'Alarm Time'
}
```

**With Step (15-minute intervals):**
```javascript
{
  type: 'time',
  name: 'meeting_start',
  label: 'Meeting Start',
  step: 900, // 15 minutes in seconds
  min: '09:00',
  max: '17:00'
}
```

---

## Other Input Types

### `color` - Color Picker

**Basic Usage:**
```javascript
{
  type: 'color',
  name: 'brand_color',
  label: 'Brand Color',
  value: '#007bff'
}
```

---

### `range` - Slider

**Basic Usage:**
```javascript
{
  type: 'range',
  name: 'volume',
  label: 'Volume',
  min: 0,
  max: 100,
  step: 1,
  value: 50
}
```

**With Live Display:**
```javascript
{
  type: 'range',
  name: 'brightness',
  label: 'Brightness: <span id="brightness-value">50</span>%',
  min: 0,
  max: 100,
  value: 50,
  attributes: {
    'oninput': "document.getElementById('brightness-value').textContent = this.value"
  }
}
```

---

### `tabset` - Tabbed Field Groups

**Basic Usage:**
```javascript
{
  type: 'tabset',
  name: 'user_settings',
  tabs: [
    {
      label: 'Profile',
      fields: [
        { type: 'text', name: 'username', label: 'Username', required: true },
        { type: 'email', name: 'email', label: 'Email', required: true }
      ]
    },
    {
      label: 'Security',
      fields: [
        { type: 'password', name: 'current_password', label: 'Current Password' },
        { type: 'password', name: 'new_password', label: 'New Password' }
      ]
    },
    {
      label: 'Preferences',
      fields: [
        { type: 'toggle', name: 'dark_mode', label: 'Dark Mode' },
        { type: 'select', name: 'language', label: 'Language', options: ['English', 'Spanish', 'French'] }
      ]
    }
  ]
}
```

**Options:**
- `tabs` - Array of tab objects with `label` and `fields`
- `name` - Optional name for generating stable IDs
- `navClass` - CSS classes for tabs navigation (default: `'nav nav-tabs mb-3'`)
- `contentClass` - CSS classes for tab content container (default: `'tab-content'`)

**With Groups Inside Tabs:**
```javascript
{
  type: 'tabset',
  name: 'product_config',
  navClass: 'nav nav-pills mb-3',
  tabs: [
    {
      label: 'Basic Info',
      fields: [
        { type: 'text', name: 'name', label: 'Product Name', columns: 12 },
        {
          type: 'group',
          columns: 6,
          fields: [
            { type: 'text', name: 'sku', label: 'SKU' },
            { type: 'number', name: 'price', label: 'Price', min: 0 }
          ]
        }
      ]
    },
    {
      label: 'Media',
      fields: [
        { type: 'image', name: 'featured_image', label: 'Featured Image', size: 'lg' },
        { type: 'file', name: 'documents', label: 'Documents', multiple: true }
      ]
    },
    {
      label: 'Advanced',
      fields: [
        { type: 'json', name: 'metadata', label: 'Metadata', rows: 10 },
        { type: 'textarea', name: 'notes', label: 'Internal Notes', rows: 5 }
      ]
    }
  ]
}
```

**Features:**
- Bootstrap tab navigation
- First tab active by default
- Proper ARIA attributes for accessibility
- Fields in tabs support all column layouts
- Groups work inside tabs

---

## Common Field Options

All field types support these common options:

### Layout Options
- `label` - Field label text
- `placeholder` - Hint text (text inputs)
- `help` - Help text shown below field
- `colClass` - Bootstrap column class (default: `'col-12'`)
- `labelClass` - CSS class for label
- `inputClass` - CSS class for input element

### Validation Options
- `required` - Make field required
- `validation` - Custom validation (see [BestPractices.md](./BestPractices.md))
- `pattern` - HTML5 pattern validation
- `min` / `max` - Numeric/date constraints
- `minlength` / `maxlength` - String length constraints

### State Options
- `value` - Initial/default value
- `disabled` - Disable the field
- `readonly` - Make field read-only

### Accessibility Options
- `id` - Custom field ID (auto-generated if omitted)
- `attributes` - Additional HTML attributes

---

## Grid Layout Examples

### Two-Column Layout
```javascript
fields: [
  {
    type: 'text',
    name: 'first_name',
    label: 'First Name',
    colClass: 'col-md-6',
    required: true
  },
  {
    type: 'text',
    name: 'last_name',
    label: 'Last Name',
    colClass: 'col-md-6',
    required: true
  }
]
```

### Three-Column Layout
```javascript
fields: [
  {
    type: 'text',
    name: 'city',
    label: 'City',
    colClass: 'col-md-4'
  },
  {
    type: 'select',
    name: 'state',
    label: 'State',
    colClass: 'col-md-4',
    options: stateOptions
  },
  {
    type: 'text',
    name: 'zip',
    label: 'ZIP Code',
    colClass: 'col-md-4',
    maxlength: 5
  }
]
```

### Responsive Layout
```javascript
{
  type: 'textarea',
  name: 'bio',
  label: 'Biography',
  colClass: 'col-12 col-lg-8', // Full width on mobile, 2/3 on large screens
  rows: 6
}
```

---

## Next Steps

- **Advanced Inputs**: See [inputs/README.md](./inputs/README.md) for TagInput, DatePicker, etc.
- **Best Practices**: See [BestPractices.md](./BestPractices.md) for patterns and tips
- **FormView API**: See [FormView.md](./FormView.md) for complete component reference
- **Getting Started**: See [README.md](./README.md) for quick start guide

---

## Complete Example

Here's a comprehensive form using many field types:

```javascript
const formConfig = {
  title: 'User Profile',
  fields: [
    // Hidden
    { type: 'hidden', name: 'user_id', value: '12345' },
    
    // Personal Info
    { type: 'text', name: 'username', label: 'Username', required: true, colClass: 'col-md-6' },
    { type: 'email', name: 'email', label: 'Email', required: true, colClass: 'col-md-6' },
    { type: 'password', name: 'password', label: 'Password', minlength: 8, colClass: 'col-md-6' },
    { type: 'password', name: 'confirm_password', label: 'Confirm Password', colClass: 'col-md-6' },
    
    // Contact
    { type: 'tel', name: 'phone', label: 'Phone', placeholder: '(555) 123-4567' },
    { type: 'url', name: 'website', label: 'Website', placeholder: 'https://example.com' },
    
    // Profile
    { type: 'file', name: 'avatar', label: 'Avatar', accept: 'image/*' },
    { type: 'textarea', name: 'bio', label: 'Bio', rows: 4, maxlength: 500 },
    
    // Preferences
    { type: 'select', name: 'country', label: 'Country', options: countryOptions, colClass: 'col-md-6' },
    { type: 'select', name: 'timezone', label: 'Timezone', options: timezoneOptions, colClass: 'col-md-6' },
    { type: 'radio', name: 'theme', label: 'Theme', options: ['Light', 'Dark', 'Auto'], value: 'Auto' },
    
    // Settings
    { type: 'checkbox', name: 'notifications', label: 'Email Notifications', options: [
      { value: 'marketing', label: 'Marketing emails' },
      { value: 'updates', label: 'Product updates' }
    ]},
    { type: 'range', name: 'volume', label: 'Notification Volume', min: 0, max: 100, value: 50 },
    
    // Date
    { type: 'date', name: 'birth_date', label: 'Birth Date', max: new Date().toISOString().split('T')[0] },
    
    // Agreement
    { type: 'checkbox', name: 'terms', label: 'I agree to the Terms of Service', required: true }
  ]
};
```
