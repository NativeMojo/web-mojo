# Forms - FormView and FormBuilder

MOJO provides a powerful form system through `FormView` and `FormBuilder` for creating dynamic, validated forms with automatic model binding and autosave capabilities.

## Recommended Usage (For LLM Agents)

**IMPORTANT**: Use `FormView` for all form creation. It handles rendering, validation, submission, and model binding automatically.

### Quick Start

```javascript
import { FormView } from 'web-mojo';

class UserFormView extends FormView {
  constructor(options = {}) {
    super({
      ...options,
      formConfig: {
        fields: [
          { type: 'text', name: 'name', label: 'Name', required: true },
          { type: 'email', name: 'email', label: 'Email', required: true },
          { type: 'select', name: 'role', label: 'Role', options: [
            { value: 'admin', label: 'Administrator' },
            { value: 'user', label: 'User' }
          ]}
        ]
      }
    });
  }
}

// Use in a dialog
const formView = new UserFormView();
const result = await Dialog.showForm({
  title: 'Create User',
  body: formView
});

if (result) {
  console.log(result); // { name: '...', email: '...', role: '...' }
}
```

## FormView with Model Binding and AutoSave

**This is the most powerful feature** - automatic model synchronization and saving on field changes:

```javascript
import { FormView, Model } from 'web-mojo';

class User extends Model {
  static endpoint = '/api/users';
}

class UserFormView extends FormView {
  constructor(options = {}) {
    super({
      ...options,
      model: options.model, // Pass the model instance
      fileHandling: true,   // Enable file uploads
      formConfig: {
        fields: [
          { type: 'text', name: 'name', label: 'Full Name', required: true },
          { type: 'email', name: 'email', label: 'Email', required: true },
          { type: 'tel', name: 'phone', label: 'Phone' },
          { type: 'select', name: 'role', label: 'Role', options: [
            { value: 'admin', label: 'Administrator' },
            { value: 'user', label: 'User' }
          ]},
          { type: 'checkbox', name: 'active', label: 'Active Account', value: true },
          { type: 'image', name: 'avatar', label: 'Profile Picture', size: 'md' }
        ],
        submitButton: { text: 'Save User', class: 'btn-primary' },
        resetButton: { text: 'Cancel', class: 'btn-secondary' }
      }
    });
  }
}

// Usage with existing model
const user = new User({ id: 123 });
await user.fetch();

const formView = new UserFormView({ model: user });
this.addChild(formView);
```

### AutoSave Feature

Enable autosave to save changes to the model automatically on field change:

```javascript
class QuickEditFormView extends FormView {
  constructor(options = {}) {
    super({
      ...options,
      model: options.model,
      autosaveModelField: true,  // Enable autosave (CONSTRUCTOR option, not formConfig)
      fileHandling: true,
      formConfig: {
        fields: [
          { type: 'text', name: 'title', label: 'Title' },
          { type: 'textarea', name: 'description', label: 'Description', rows: 4 },
          { type: 'number', name: 'price', label: 'Price', min: 0 }
        ],
        submitButton: false,   // Hide submit button (autosave handles it)
        resetButton: false     // Hide reset button
      }
    });
  }
}
```

**How AutoSave Works:**
- User edits a field (triggers `change` event)
- Form waits 300ms (hardcoded debounce delay)
- Multiple field changes within 300ms are batched together
- Only changed fields are sent to server via `model.save()`
- Visual indicator shows saving/saved/error status
- Model automatically updates on successful save

## All Field Types

### Text Input Fields

```javascript
// Basic text
{ type: 'text', name: 'username', label: 'Username', required: true, placeholder: 'Enter username' }

// Email with validation
{ type: 'email', name: 'email', label: 'Email', required: true }

// Password with toggle visibility
{ type: 'password', name: 'password', label: 'Password', required: true, showToggle: true, minLength: 8 }

// Phone number
{ type: 'tel', name: 'phone', label: 'Phone', placeholder: '(555) 555-5555' }

// URL
{ type: 'url', name: 'website', label: 'Website', placeholder: 'https://example.com' }

// Search
{ type: 'search', name: 'query', label: 'Search', placeholder: 'Search...' }

// Number with min/max
{ type: 'number', name: 'age', label: 'Age', min: 0, max: 120, step: 1 }

// Hex (for blockchain addresses, hashes, etc.)
{ type: 'hex', name: 'address', label: 'Wallet Address', hexType: 'address', allowPrefix: true }
```

### Textarea

```javascript
// Basic textarea
{ type: 'textarea', name: 'description', label: 'Description', rows: 4, maxLength: 500 }

// JSON editor
{ type: 'json', name: 'metadata', label: 'Metadata', rows: 10, help: 'Enter valid JSON' }
```

### Select Dropdowns

```javascript
// Basic select
{
  type: 'select',
  name: 'country',
  label: 'Country',
  required: true,
  options: [
    { value: 'us', label: 'United States' },
    { value: 'ca', label: 'Canada' },
    { value: 'uk', label: 'United Kingdom' }
  ]
}

// Multiple select
{
  type: 'select',
  name: 'interests',
  label: 'Interests',
  multiple: true,
  size: 5,
  options: [
    { value: 'tech', label: 'Technology' },
    { value: 'sports', label: 'Sports' },
    { value: 'music', label: 'Music' }
  ]
}

// Auto-generated numeric options
{
  type: 'select',
  name: 'quantity',
  label: 'Quantity',
  start: 1,
  end: 100,
  step: 1
}

// Auto-generated with custom formatting
{
  type: 'select',
  name: 'price',
  label: 'Price',
  start: 0,
  end: 1000,
  step: 50,
  format: (val) => `$${val} USD`  // Custom format function
}
```

### Multi-Select Dropdown

Use `multiselect` for a Bootstrap dropdown with checkboxes (no search, simple and clean):

```javascript
// Basic multiselect
{
  type: 'multiselect',
  name: 'status',
  label: 'Status',
  placeholder: 'Select statuses...',
  options: [
    { value: 'new', label: 'New' },
    { value: 'open', label: 'Open' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'resolved', label: 'Resolved' }
  ]
}

// With default values
{
  type: 'multiselect',
  name: 'tags',
  label: 'Tags',
  value: ['important', 'urgent'],  // Pre-selected values (array)
  options: [
    { value: 'important', label: 'Important' },
    { value: 'urgent', label: 'Urgent' },
    { value: 'bug', label: 'Bug' },
    { value: 'feature', label: 'Feature' }
  ]
}

// With custom height and display options
{
  type: 'multiselect',
  name: 'categories',
  label: 'Categories',
  placeholder: 'Select Categories',
  maxHeight: 400,  // Max height for dropdown list (default: 300)
  showSelectedLabels: true,  // Show item names in button (default: true)
  maxLabelsToShow: 3,  // Show up to 3 labels, then "X selected" (default: 3)
  options: [...]
}
```

**Features:**
- Clean Bootstrap dropdown with checkboxes
- Smart button text display:
  - 0 items: Shows placeholder (muted gray)
  - 1-3 items: Shows comma-separated labels (e.g., "Open, Paused, Resolved")
  - 4+ items: Shows count (e.g., "4 selected")
- "Done" button to close dropdown
- Supports both `placeholder` and `placeHolder` property names
- No search (KISS principle - for short lists only)
- Perfect for table filters and forms
- Works seamlessly with Django-style lookups in TableView filters

**Django-Style Lookup Integration:**

When used in TableView filters, multiselect automatically generates smart filter parameters:
- Single selection: `status=open` (simple key-value)
- Multiple selections: `status__in=open,paused,resolved` (Django `__in` lookup)

```javascript
// In TableView filter configuration
filters: [
  {
    key: 'status',  // Will become status__in for multiple values
    label: 'Status',
    type: 'multiselect',
    placeholder: 'Select Status',
    options: [
      { value: 'open', label: 'Open' },
      { value: 'paused', label: 'Paused' },
      { value: 'resolved', label: 'Resolved' }
    ]
  }
]

// Filter pills show human-readable text:
// "Status in 'open', 'paused', 'resolved'"
// Or for single value: "Status is 'open'"
```

**Supported Options:**
- `name` (string, required): Field name
- `label` (string): Display label
- `placeholder` or `placeHolder` (string): Placeholder text when no items selected
- `value` (array): Pre-selected values (must be array, e.g., `['item1', 'item2']`)
- `options` (array, required): List of `{ value, label }` objects
- `maxHeight` (number): Maximum height of dropdown in pixels (default: 300)
- `showSelectedLabels` (boolean): Show item labels in button (default: true)
- `maxLabelsToShow` (number): Max labels before switching to count (default: 3)
- `required` (boolean): Field is required
- `disabled` (boolean): Field is disabled

### ComboBox (Autocomplete Input)

Use `combobox` (or `combo`, `autocomplete`) for a text input with dropdown suggestions. Perfect for fields where you want to provide suggestions but also allow free-form input.

```javascript
// Basic combobox - allows custom values
{
  type: 'combobox',
  name: 'country',
  label: 'Country',
  placeholder: 'Type or select...',
  options: [
    { value: 'USA', label: 'United States' },
    { value: 'CAN', label: 'Canada' },
    { value: 'MEX', label: 'Mexico' },
    { value: 'GBR', label: 'United Kingdom' },
    { value: 'DEU', label: 'Germany' },
    { value: 'FRA', label: 'France' },
    { value: 'JPN', label: 'Japan' }
  ]
}

// Strict selection - no custom values allowed
{
  type: 'combobox',
  name: 'status',
  label: 'Status',
  placeholder: 'Select status...',
  allowCustom: false,  // Restricts to dropdown options only
  options: [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'pending', label: 'Pending' }
  ]
}

// With custom dropdown height
{
  type: 'combobox',
  name: 'city',
  label: 'City',
  placeholder: 'Type city name...',
  maxHeight: 250,  // Max height for dropdown list (default: 300)
  options: [
    { value: 'NYC', label: 'New York' },
    { value: 'LA', label: 'Los Angeles' },
    { value: 'CHI', label: 'Chicago' }
  ]
}
```

**Features:**
- Text input with dropdown suggestions
- Click/focus shows all suggestions
- Type to filter suggestions in real-time (case-insensitive)
- Click suggestion or press Enter to select
- Keyboard navigation:
  - Arrow Up/Down to navigate suggestions
  - Enter to select highlighted suggestion
  - Escape to close dropdown
  - Tab to close and move to next field
- Chevron icon rotates when dropdown is open
- Bootstrap dropdown for consistency
- Supports both `placeholder` and `placeHolder` property names
- Optional: `allowCustom: false` to restrict to suggestions only

**Supported Options:**
- `name` (string, required): Field name
- `label` (string): Display label
- `placeholder` or `placeHolder` (string): Placeholder text (default: "Type or select...")
- `value` (string): Initial value
- `options` (array, required): List of `{ value, label }` objects
- `allowCustom` (boolean): Allow typing custom values (default: true)
- `maxHeight` (number): Maximum height of dropdown in pixels (default: 300)
- `required` (boolean): Field is required
- `disabled` (boolean): Field is disabled

**When to Use:**
- Country/state/city selectors where custom input might be needed
- Product search with suggestions
- User mentions or tagging
- Any field with common values but custom input allowed
- When you need autocomplete but don't want the complexity of server-side search

**ComboBox vs Multi-Select:**
- **ComboBox**: Single value, text input with autocomplete, allows custom values
- **Multi-Select**: Multiple values, checkbox list, no custom values, no typing

### Checkboxes and Radios

```javascript
// Single checkbox
{ type: 'checkbox', name: 'terms_accepted', label: 'I accept the terms', value: true }

// Switch (styled checkbox)
{ type: 'switch', name: 'notifications', label: 'Enable Notifications', value: true, size: 'lg' }

// Radio buttons
{
  type: 'radio',
  name: 'plan',
  label: 'Subscription Plan',
  required: true,
  inline: true,
  options: [
    { value: 'free', label: 'Free' },
    { value: 'pro', label: 'Pro ($9/mo)' },
    { value: 'enterprise', label: 'Enterprise' }
  ]
}
```

### Date and Time

```javascript
// Date picker
{ type: 'date', name: 'birthdate', label: 'Birth Date', required: true }

// DateTime local
{ type: 'datetime-local', name: 'appointment', label: 'Appointment Time' }

// Time picker
{ type: 'time', name: 'reminder_time', label: 'Reminder Time' }

// Date range picker (custom component)
{
  type: 'daterange',
  name: 'report_period',
  label: 'Report Period',
  startName: 'start_date',
  endName: 'end_date',
  required: true
}
```

### File Uploads

```javascript
// Basic file upload
{
  type: 'file',
  name: 'document',
  label: 'Upload Document',
  accept: '.pdf,.doc,.docx'
}

// Image upload with preview and cropping
{
  type: 'image',
  name: 'profile_pic',
  label: 'Profile Picture',
  size: 'md',              // xs, sm, md, lg, xl (display size)
  imageSize: 'md',         // Enable cropping by setting imageSize
  accept: 'image/*',
  help: 'Click to upload or drag & drop'
}

// Multiple file upload
{
  type: 'file',
  name: 'attachments',
  label: 'Attachments',
  multiple: true,
  accept: '*'
}
```

### Advanced Field Types

```javascript
// Color picker
{ type: 'color', name: 'theme_color', label: 'Theme Color', value: '#0d6efd' }

// Range slider
{
  type: 'range',
  name: 'volume',
  label: 'Volume',
  min: 0,
  max: 100,
  step: 5,
  value: 50,
  showValue: true
}

// Hidden field
{ type: 'hidden', name: 'user_id', value: '123' }

// Tag input (multiple tags)
{
  type: 'tag',
  name: 'tags',
  label: 'Tags',
  placeholder: 'Add tags...',
  maxItems: 10,
  value: ['javascript', 'web']
}

// ComboBox (autocomplete input with suggestions)
{
  type: 'combobox',
  name: 'country',
  label: 'Country',
  placeholder: 'Type or select...',
  allowCustom: true,  // Allow typing custom values (default: true)
  options: [
    { value: 'USA', label: 'United States' },
    { value: 'CAN', label: 'Canada' },
    { value: 'MEX', label: 'Mexico' },
    { value: 'GBR', label: 'United Kingdom' },
    { value: 'DEU', label: 'Germany' }
  ]
}

// ComboBox with restricted values only
{
  type: 'combobox',
  name: 'status',
  label: 'Status',
  placeholder: 'Select status...',
  allowCustom: false,  // Must select from dropdown
  options: [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'pending', label: 'Pending' }
  ]
}

// Collection select (auto-fetches from API)
{
  type: 'collection',
  name: 'category_id',
  label: 'Category',
  Collection: CategoryCollection,
  labelField: 'name',
  valueField: 'id',
  defaultParams: { status: 'active' }
}

// Collection multi-select
{
  type: 'collectionmultiselect',
  name: 'tags',
  label: 'Tags',
  Collection: TagCollection,
  labelField: 'name',
  valueField: 'id',
  maxItems: 5
}

// Combo input (text + select)
{
  type: 'combo',
  name: 'custom_status',
  label: 'Status',
  options: ['Active', 'Pending', 'Inactive'],
  allowCustom: true
}
```

## Input Groups (Icons and Addons)

Add icons, text, or buttons before/after inputs:

```javascript
// Prepend icon
{
  type: 'text',
  name: 'username',
  label: 'Username',
  inputGroup: { prepend: '<i class="bi bi-person"></i>' }
}

// Append text
{
  type: 'number',
  name: 'weight',
  label: 'Weight',
  inputGroup: { append: 'lbs' }
}

// Both prepend and append
{
  type: 'number',
  name: 'price',
  label: 'Price',
  inputGroup: { prepend: '$', append: 'USD' }
}

// Shorthand for common cases
{
  type: 'email',
  name: 'email',
  label: 'Email',
  inputGroup: '@'  // Automatically prepends @
}
```

## Form Sections and Organization

### Section Headers

```javascript
formConfig: {
  fields: [
    { type: 'header', text: 'Personal Information', level: 3 },
    { type: 'text', name: 'name', label: 'Name' },
    { type: 'email', name: 'email', label: 'Email' },
    
    { type: 'header', text: 'Account Settings', level: 3, className: 'mt-4' },
    { type: 'password', name: 'password', label: 'Password' },
    { type: 'checkbox', name: 'active', label: 'Active' }
  ]
}
```

### Dividers

```javascript
{ type: 'divider', class: 'my-4' }
```

### Field Groups

```javascript
{
  type: 'group',
  label: 'Billing Address',
  class: 'border rounded p-3',
  fields: [
    { type: 'text', name: 'street', label: 'Street', columns: 12 },
    { type: 'text', name: 'city', label: 'City', columns: 6 },
    { type: 'text', name: 'state', label: 'State', columns: 3 },
    { type: 'text', name: 'zip', label: 'ZIP', columns: 3 }
  ]
}
```

### Tabsets

```javascript
{
  type: 'tabset',
  name: 'user_settings',
  navClass: 'nav-pills',
  tabs: [
    {
      label: 'Profile',
      fields: [
        { type: 'text', name: 'name', label: 'Name' },
        { type: 'email', name: 'email', label: 'Email' }
      ]
    },
    {
      label: 'Preferences',
      fields: [
        { type: 'checkbox', name: 'notifications', label: 'Email Notifications' },
        { type: 'select', name: 'theme', label: 'Theme', options: [
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' }
        ]}
      ]
    }
  ]
}
```

## Responsive Layout

Use Bootstrap's grid system for responsive forms:

```javascript
formConfig: {
  useRowLayout: true,        // Enable row-based layout
  rowClass: 'g-3',          // Bootstrap gutter class
  defaultColSize: 12,       // Default column width
  fields: [
    { type: 'text', name: 'first_name', label: 'First Name', columns: 6 },
    { type: 'text', name: 'last_name', label: 'Last Name', columns: 6 },
    { type: 'email', name: 'email', label: 'Email', columns: 12 },
    
    // Responsive columns
    {
      type: 'text',
      name: 'city',
      label: 'City',
      columns: { xs: 12, md: 6, lg: 4 }  // Full width on mobile, half on tablet, third on desktop
    }
  ]
}
```

## Complete Example: User Profile Form with AutoSave

```javascript
import { FormView, Model } from 'web-mojo';

class User extends Model {
  static endpoint = '/api/users';
}

class UserProfileFormView extends FormView {
  constructor(options = {}) {
    super({
      ...options,
      model: options.model,
      autosaveModelField: true,  // Enable autosave (constructor option)
      fileHandling: true,
      formConfig: {
        fields: [
          // Section: Personal Info
          { type: 'header', text: 'Personal Information', level: 4 },
          
          { 
            type: 'text', 
            name: 'first_name', 
            label: 'First Name', 
            required: true,
            columns: 6
          },
          { 
            type: 'text', 
            name: 'last_name', 
            label: 'Last Name', 
            required: true,
            columns: 6
          },
          {
            type: 'email',
            name: 'email',
            label: 'Email Address',
            required: true,
            inputGroup: { prepend: '<i class="bi bi-envelope"></i>' }
          },
          {
            type: 'tel',
            name: 'phone',
            label: 'Phone',
            inputGroup: { prepend: '<i class="bi bi-telephone"></i>' }
          },
          
          // Section: Profile
          { type: 'header', text: 'Profile', level: 4, className: 'mt-4' },
          
          {
            type: 'image',
            name: 'avatar',
            label: 'Profile Picture',
            size: 'lg',
            imageSize: 'lg'
          },
          {
            type: 'textarea',
            name: 'bio',
            label: 'Bio',
            rows: 4,
            maxLength: 500,
            help: 'Tell us about yourself'
          },
          
          // Section: Settings
          { type: 'header', text: 'Settings', level: 4, className: 'mt-4' },
          
          {
            type: 'select',
            name: 'timezone',
            label: 'Timezone',
            options: [
              { value: 'America/New_York', label: 'Eastern Time' },
              { value: 'America/Chicago', label: 'Central Time' },
              { value: 'America/Denver', label: 'Mountain Time' },
              { value: 'America/Los_Angeles', label: 'Pacific Time' }
            ]
          },
          {
            type: 'switch',
            name: 'email_notifications',
            label: 'Email Notifications',
            value: true
          },
          {
            type: 'switch',
            name: 'is_public',
            label: 'Public Profile',
            value: false
          }
        ],
        submitButton: false,  // AutoSave handles saving
        resetButton: false
      }
    });
  }
}

// Usage in a View
class ProfilePage extends Page {
  async onInit() {
    const user = new User({ id: this.currentUserId });
    await user.fetch();
    
    this.profileForm = new UserProfileFormView({
      containerId: 'profile-form',
      model: user
    });
    
    this.addChild(this.profileForm);
  }
}
```

## Form Submission and Validation

### Standard Form Submission

```javascript
class ContactFormView extends FormView {
  constructor(options = {}) {
    super({
      ...options,
      formConfig: {
        fields: [
          { type: 'text', name: 'name', label: 'Name', required: true },
          { type: 'email', name: 'email', label: 'Email', required: true },
          { type: 'textarea', name: 'message', label: 'Message', required: true, rows: 5 }
        ],
        submitButton: { text: 'Send Message', class: 'btn-primary' }
      }
    });
  }
  
  async handleFormSubmit(event) {
    event.preventDefault();
    
    const formData = await this.getFormData();
    
    // Validate
    if (!this.validate()) {
      return { success: false, error: 'Please fix validation errors' };
    }
    
    // Submit to API
    try {
      const rest = this.getApp().rest;
      const response = await rest.POST('/api/contact', formData);
      
      if (response.success) {
        await this.getApp().showSuccess('Message sent successfully!');
        this.reset(); // Clear form
        return { success: true };
      } else {
        return { success: false, error: response.message };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
```

### Validation

HTML5 validation is automatic. Add these attributes:

```javascript
{
  type: 'text',
  name: 'username',
  label: 'Username',
  required: true,          // Field is required
  minLength: 3,            // Minimum length
  maxLength: 20,           // Maximum length
  pattern: '^[a-zA-Z0-9]+$', // Regex pattern
  help: 'Alphanumeric characters only'
}

{
  type: 'number',
  name: 'age',
  label: 'Age',
  min: 18,                 // Minimum value
  max: 100,                // Maximum value
  step: 1                  // Increment step
}

{
  type: 'email',
  name: 'email',
  label: 'Email',
  required: true           // Validates email format
}
```

## Common FormView Patterns

### Pattern 1: Create New Record

```javascript
class CreateUserView extends FormView {
  constructor(options = {}) {
    super({
      ...options,
      formConfig: {
        fields: [
          { type: 'text', name: 'name', label: 'Name', required: true },
          { type: 'email', name: 'email', label: 'Email', required: true }
        ]
      }
    });
  }
  
  async handleFormSubmit(event) {
    event.preventDefault();
    
    const data = await this.getFormData();
    if (!this.validate()) return { success: false };
    
    const user = new User();
    const result = await user.save(data);
    
    if (result.success) {
      await this.getApp().showSuccess('User created!');
      return { success: true, data: result.data };
    } else {
      return { success: false, error: result.message };
    }
  }
}
```

### Pattern 2: Edit Existing Record with AutoSave

```javascript
class EditUserView extends FormView {
  constructor(options = {}) {
    super({
      ...options,
      model: options.model,       // Pass existing model
      autosaveModelField: true,   // Enable autosave (constructor option)
      formConfig: {
        fields: [
          { type: 'text', name: 'name', label: 'Name', required: true },
          { type: 'email', name: 'email', label: 'Email', required: true },
          { type: 'checkbox', name: 'active', label: 'Active' }
        ],
        submitButton: false  // Not needed with autosave
      }
    });
  }
}

// Usage
const user = new User({ id: 123 });
await user.fetch();
const editForm = new EditUserView({ model: user });
```

### Pattern 3: Multi-Step Form with Tabs

```javascript
class RegistrationFormView extends FormView {
  constructor(options = {}) {
    super({
      ...options,
      formConfig: {
        fields: [
          {
            type: 'tabset',
            name: 'registration',
            tabs: [
              {
                label: 'Account',
                fields: [
                  { type: 'text', name: 'username', label: 'Username', required: true },
                  { type: 'email', name: 'email', label: 'Email', required: true },
                  { type: 'password', name: 'password', label: 'Password', required: true, showToggle: true }
                ]
              },
              {
                label: 'Profile',
                fields: [
                  { type: 'text', name: 'first_name', label: 'First Name', required: true },
                  { type: 'text', name: 'last_name', label: 'Last Name', required: true },
                  { type: 'image', name: 'avatar', label: 'Profile Picture', size: 'md' }
                ]
              },
              {
                label: 'Preferences',
                fields: [
                  { type: 'switch', name: 'notifications', label: 'Email Notifications', value: true },
                  { type: 'select', name: 'theme', label: 'Theme', options: [
                    { value: 'light', label: 'Light' },
                    { value: 'dark', label: 'Dark' }
                  ]}
                ]
              }
            ]
          }
        ],
        submitButton: { text: 'Create Account', class: 'btn-primary' }
      }
    });
  }
}
```

### Pattern 4: Form in Dialog

```javascript
// In a View
async onActionCreateUser() {
  const formView = new CreateUserFormView();
  
  const result = await this.getApp().showForm({
    title: 'Create New User',
    size: 'lg',
    body: formView
  });
  
  if (result) {
    // User clicked submit and form was valid
    await this.usersTable.refresh();
  }
}
```

### Pattern 5: Inline Editing with AutoSave

```javascript
class ProductCardView extends View {
  async onInit() {
    this.quickEditForm = new FormView({
      containerId: 'quick-edit',
      model: this.model,
      autosaveModelField: true,  // Enable autosave
      fileHandling: true,
      formConfig: {
        fields: [
          { type: 'text', name: 'name', label: 'Product Name' },
          { type: 'number', name: 'price', label: 'Price', inputGroup: { prepend: '$' } },
          { type: 'checkbox', name: 'featured', label: 'Featured' }
        ],
        submitButton: false,
        resetButton: false
      }
    });
    
    this.addChild(this.quickEditForm);
  }
}
```

## Form Configuration Options

### Complete FormConfig

```javascript
formConfig: {
  // Fields array (required)
  fields: [...],
  
  // Buttons (optional)
  submitButton: {
    text: 'Submit',
    class: 'btn-primary',
    icon: '<i class="bi bi-check"></i>'
  },
  resetButton: {
    text: 'Reset',
    class: 'btn-secondary'
  },
  cancelButton: {
    text: 'Cancel',
    class: 'btn-outline-secondary'
  },
  
  // Set to false to hide buttons
  submitButton: false,
  resetButton: false
}
```

**Note**: Layout and styling options (formClass, fieldWrapper, labelClass, etc.) are handled by FormBuilder internally and not directly configurable through FormView's formConfig.

## Field Configuration Options

Every field type supports:

```javascript
{
  type: 'text',              // Field type (required)
  name: 'field_name',        // Field name (required)
  label: 'Field Label',      // Display label
  value: 'default',          // Default value
  placeholder: 'Enter...',   // Placeholder text
  required: true,            // HTML5 required validation
  disabled: false,           // Disable field
  readonly: false,           // Read-only field
  help: 'Help text',         // Help text below field
  class: 'custom-class',     // Custom CSS classes
  columns: 6,                // Column width (1-12) or object { xs: 12, md: 6 }
  inputGroup: {...},         // Input group addon
  attributes: {              // Custom HTML attributes
    'data-custom': 'value',
    'autocomplete': 'off'
  }
}
```

## Working with Models

### Binding Form to Model

```javascript
const user = new User({ id: 123 });
await user.fetch();

const formView = new FormView({
  model: user,              // Bind to model
  formConfig: {
    fields: [
      { type: 'text', name: 'name', label: 'Name' },
      { type: 'email', name: 'email', label: 'Email' }
    ]
  }
});

// Form automatically populates with model data
```

### AutoSave with Model

```javascript
const formView = new FormView({
  model: user,
  autosaveModelField: true,  // Automatically saves changes to model
  formConfig: {
    fields: [...]
  }
});

// When user edits field:
// 1. Form detects change event
// 2. Waits 300ms (hardcoded debounce)
// 3. Batches multiple changes if within 300ms window
// 4. Calls model.save({ field: newValue })
// 5. Shows saving indicator
// 6. Shows success/error status
```

### Manual Model Save

```javascript
class UserFormView extends FormView {
  async handleSubmit(event) {
    event.preventDefault();
    
    const formData = await this.getFormData();
    
    if (!this.validate()) {
      return { success: false };
    }
    
    // Save to model
    const result = await this.model.save(formData);
    
    if (result.success) {
      await this.getApp().showSuccess('User updated!');
      return { success: true, data: result.data };
    } else {
      return { success: false, error: result.message };
    }
  }
}
```

## Common Field Examples

### Login Form

```javascript
fields: [
  {
    type: 'email',
    name: 'email',
    label: 'Email',
    required: true,
    inputGroup: { prepend: '<i class="bi bi-person"></i>' }
  },
  {
    type: 'password',
    name: 'password',
    label: 'Password',
    required: true,
    showToggle: true,
    inputGroup: { prepend: '<i class="bi bi-lock"></i>' }
  },
  {
    type: 'checkbox',
    name: 'remember_me',
    label: 'Remember me',
    value: false
  }
]
```

### Product Form

```javascript
fields: [
  { type: 'text', name: 'name', label: 'Product Name', required: true, col: 12 },
  { type: 'textarea', name: 'description', label: 'Description', rows: 4, col: 12 },
  { 
    type: 'number', 
    name: 'price', 
    label: 'Price', 
    min: 0, 
    step: 0.01,
    inputGroup: { prepend: '$', append: 'USD' },
    col: 6
  },
  { 
    type: 'number', 
    name: 'stock', 
    label: 'Stock Quantity', 
    min: 0,
    col: 6
  },
  {
    type: 'select',
    name: 'category',
    label: 'Category',
    required: true,
    options: [
      { value: 'electronics', label: 'Electronics' },
      { value: 'clothing', label: 'Clothing' },
      { value: 'food', label: 'Food' }
    ],
    col: 6
  },
  {
    type: 'checkbox',
    name: 'featured',
    label: 'Featured Product',
    col: 6
  },
  {
    type: 'image',
    name: 'image',
    label: 'Product Image',
    size: 'lg',
    col: 12
  }
]
```

### Settings Form with Sections

```javascript
fields: [
  { type: 'header', text: 'General Settings', level: 3 },
  { type: 'text', name: 'site_name', label: 'Site Name', required: true },
  { type: 'email', name: 'admin_email', label: 'Admin Email', required: true },
  
  { type: 'divider', class: 'my-4' },
  
  { type: 'header', text: 'Display Options', level: 3 },
  { type: 'switch', name: 'dark_mode', label: 'Dark Mode', value: false },
  { type: 'select', name: 'items_per_page', label: 'Items Per Page', options: [
    { value: '10', label: '10' },
    { value: '25', label: '25' },
    { value: '50', label: '50' },
    { value: '100', label: '100' }
  ]},
  
  { type: 'divider', class: 'my-4' },
  
  { type: 'header', text: 'Advanced', level: 3 },
  { type: 'json', name: 'custom_config', label: 'Custom Configuration', rows: 8 }
]
```

## Tips for LLM Agents

1. **Always use FormView** - Don't build forms manually with HTML
2. **Use autosave for inline editing** - Set `autoSave: true` in formConfig
3. **Bind to models when editing** - Pass `model: myModel` to FormView
4. **Use field types correctly** - email for emails, number for numbers, etc.
5. **Add validation** - Use required, min, max, pattern, minLength, maxLength
6. **Use input groups for icons** - Makes forms more professional
7. **Organize with headers and dividers** - Improves UX
8. **Use responsive columns** - `col: { xs: 12, md: 6 }` for mobile-first
9. **Hide buttons with autosave** - Set `submitButton: false` when using autoSave
10. **Handle errors properly** - Return `{ success: false, error: '...' }` from handleFormSubmit

## Quick Reference

| Need | Use This |
|------|----------|
| Create form | `new FormView({ formConfig: {...} })` |
| Bind to model | `new FormView({ model: myModel, formConfig: {...} })` |
| Auto-save changes | `new FormView({ model: myModel, autosaveModelField: true, ... })` |
| Text input | `{ type: 'text', name: '...', label: '...' }` |
| Email | `{ type: 'email', ... }` |
| Password | `{ type: 'password', showToggle: true, ... }` |
| Dropdown | `{ type: 'select', options: [...], ... }` |
| Multi-select | `{ type: 'multiselect', options: [...], ... }` |
| Checkbox | `{ type: 'checkbox', ... }` |
| File upload | `{ type: 'file', accept: '...', ... }` |
| Image upload | `{ type: 'image', size: 'md', cropAndScale: true, ... }` |
| Date picker | `{ type: 'date', ... }` |
| Add section | `{ type: 'header', text: '...', level: 3 }` |
| Add divider | `{ type: 'divider' }` |
| Responsive layout | `formConfig: { useRowLayout: true }` |
| Column width | `{ columns: 6 }` or `{ columns: { xs: 12, md: 6 } }` |

## Import

```javascript
import { FormView } from 'web-mojo';
```

Always use `FormView` from the framework package, not internal paths!
