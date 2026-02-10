# Field Types - Master Quick Reference

Complete reference of all available field types in WEB-MOJO forms. Use this as a quick lookup guide to find the right field type for your needs.

---

## How to Use This Guide

- **Need quick lookup?** Use the tables below to find the field type you need
- **Want detailed docs?** Click the links to detailed documentation:
  - Basic/Native fields → [BasicTypes.md](./BasicTypes.md)
  - Advanced components → [inputs/](./inputs/)

---

## All Field Types at a Glance

### Text Input Fields

| Type | Description | Key Features | Docs |
|------|-------------|--------------|------|
| `text` | Single-line text input | Placeholder, pattern validation | [BasicTypes](./BasicTypes.md#text---single-line-text) |
| `email` | Email address input | Built-in email validation | [BasicTypes](./BasicTypes.md#email---email-address) |
| `password` | Password input | Show/hide toggle, strength meter | [BasicTypes](./BasicTypes.md#password---password-input) |
| `tel` | Phone number input | Mobile numeric keyboard | [BasicTypes](./BasicTypes.md#tel---phone-number) |
| `url` | URL input | Built-in URL validation | [BasicTypes](./BasicTypes.md#url---url-input) |
| `search` | Search input | Live filtering, debouncing | [BasicTypes](./BasicTypes.md#search---search-input) |
| `hex` | Hexadecimal input | Color/string hex validation | [BasicTypes](./BasicTypes.md#hex---hexadecimal-input) |
| `number` | Numeric input | Min/max, step, spinners | [BasicTypes](./BasicTypes.md#number---numeric-input) |
| `textarea` | Multi-line text | Rows, character count | [BasicTypes](./BasicTypes.md#textarea---multi-line-text) |
| `htmlpreview` | HTML editor | Live preview in dialog | [BasicTypes](./BasicTypes.md#htmlpreview---html-with-preview) |
| `json` | JSON editor | Auto-formatting, validation | [BasicTypes](./BasicTypes.md#json---json-editor) |

### Selection Fields

| Type | Description | Key Features | Docs |
|------|-------------|--------------|------|
| `select` | Dropdown select | Single/multiple, searchable | [BasicTypes](./BasicTypes.md#select---dropdown) |
| `checkbox` | Checkbox | Single boolean or multiple | [BasicTypes](./BasicTypes.md#checkbox---checkboxes) |
| `radio` | Radio buttons | Single selection, inline layout | [BasicTypes](./BasicTypes.md#radio---radio-buttons) |
| `toggle` / `switch` | Toggle switch | On/off with sizes | [BasicTypes](./BasicTypes.md#toggle--switch---toggle-switch) |
| `multiselect` | Multi-select dropdown | Checkbox-style dropdown | [inputs/MultiSelectDropdown](./inputs/MultiSelectDropdown.md) |
| `buttongroup` | Button-style selection | Icon buttons, variants | [BasicTypes](./BasicTypes.md#buttongroup---button-group-selection) |
| `checklistdropdown` | Dropdown with checkboxes | Compact multi-select | [BasicTypes](./BasicTypes.md#checklistdropdown---checklist-dropdown) |
| `combo` / `combobox` | Editable dropdown | Type or select, autocomplete | [inputs/ComboInput](./inputs/ComboInput.md) |

### File & Media Fields

| Type | Description | Key Features | Docs |
|------|-------------|--------------|------|
| `file` | Basic file upload | Multiple files, accept types | [BasicTypes](./BasicTypes.md#file---file-upload) |
| `image` | Image upload | Preview, drag-drop, sizes | [BasicTypes](./BasicTypes.md#image---image-upload-with-preview) |

### Date & Time Fields

| Type | Description | Key Features | Docs |
|------|-------------|--------------|------|
| `date` | Date picker (native) | Min/max date constraints | [BasicTypes](./BasicTypes.md#date---date-picker) |
| `datetime-local` | Date & time picker | Native HTML5 picker | [BasicTypes](./BasicTypes.md#datetime-local---date--time) |
| `time` | Time picker | 12/24 hour, step intervals | [BasicTypes](./BasicTypes.md#time---time-picker) |
| `datepicker` | Enhanced date picker | Easepick library, themes | [inputs/DatePicker](./inputs/DatePicker.md) |
| `daterange` | Date range picker | Start/end date selection | [inputs/DateRangePicker](./inputs/DateRangePicker.md) |

### Advanced Input Components

| Type | Description | Key Features | Docs |
|------|-------------|--------------|------|
| `tag` / `tags` | Tag/chip input | Add/remove tags, validation | [inputs/TagInput](./inputs/TagInput.md) |
| `collection` | Collection select | Fetch from API, search | [inputs/CollectionSelect](./inputs/CollectionSelect.md) |
| `collectionmultiselect` | Multi-select collection | Multiple from API | [inputs/CollectionMultiSelect](./inputs/CollectionMultiSelect.md) |

### Structural & Display Fields

| Type | Description | Key Features | Docs |
|------|-------------|--------------|------|
| `hidden` | Hidden input | Store values invisibly | [BasicTypes](./BasicTypes.md#hidden---hidden-field) |
| `header` / `heading` | Section header | H1-H6 headings | [BasicTypes](./BasicTypes.md#header---section-header) |
| `html` | Custom HTML | Inject custom markup | [BasicTypes](./BasicTypes.md#html---custom-html) |
| `divider` | Horizontal divider | Separate form sections | [BasicTypes](./BasicTypes.md#divider---horizontal-divider) |
| `button` | Custom button | Actions, custom styling | [BasicTypes](./BasicTypes.md#button---custom-button) |
| `tabset` | Tabbed field groups | Organize fields in tabs | [BasicTypes](./BasicTypes.md#tabset---tabbed-field-groups) |
| `group` | Field group | Organize related fields | [README](./README.md#form-groups) |

### Other Input Types

| Type | Description | Key Features | Docs |
|------|-------------|--------------|------|
| `color` | Color picker | Hex color selection | [BasicTypes](./BasicTypes.md#color---color-picker) |
| `range` | Slider | Min/max, step, live value | [BasicTypes](./BasicTypes.md#range---slider) |

---

## By Use Case

### User Profile Forms
- Name: `text`
- Email: `email`
- Phone: `tel`
- Avatar: `image` (with preview)
- Bio: `textarea`
- Birthday: `date` or `datepicker`
- Skills: `tag` or `multiselect`
- Notifications: `toggle` switches

### Product/Content Forms
- Title: `text`
- SKU: `text` or `hex`
- Price: `number`
- Description: `textarea`
- Category: `select`
- Tags: `tag`
- Featured Image: `image`
- Documents: `file` (multiple)
- Publish Date: `datepicker`
- Status: `buttongroup` or `radio`

### Search & Filters
- Search: `search`
- Date Range: `daterange`
- Categories: `checklistdropdown`
- Status: `buttongroup`
- Options: `multiselect`

### Settings Forms
- Enable Features: `toggle` switches
- Theme: `radio` or `buttongroup`
- Language: `select`
- Timezone: `select` (searchable)
- Color Scheme: `color`

### Data Entry Forms
- JSON Config: `json`
- HTML Content: `htmlpreview`
- API Key: `hex`
- Metadata: `json`

---

## By Data Type

| Data Type | Recommended Field Type |
|-----------|----------------------|
| **Text** | `text`, `textarea` |
| **Email** | `email` |
| **Phone** | `tel` |
| **URL** | `url` |
| **Password** | `password` |
| **Number** | `number` |
| **Currency** | `number` (with step: 0.01) |
| **Percentage** | `number` or `range` |
| **Boolean** | `checkbox`, `toggle` |
| **Single Choice** | `radio`, `select`, `buttongroup` |
| **Multiple Choice** | `checkbox` (multiple), `multiselect`, `checklistdropdown` |
| **Date** | `date`, `datepicker` |
| **Time** | `time` |
| **DateTime** | `datetime-local`, `datepicker` |
| **Date Range** | `daterange` |
| **Color** | `color`, `hex` |
| **File** | `file`, `image` |
| **Tags/Keywords** | `tag`, `multiselect` |
| **JSON Object** | `json` |
| **HTML** | `htmlpreview`, `textarea` |
| **Hex String** | `hex` |
| **Foreign Key** | `select`, `collection` |
| **Many-to-Many** | `collectionmultiselect`, `multiselect` |

---

## Field Type Decision Tree

```
Need user input?
├─ Yes
│  ├─ Text input?
│  │  ├─ Single line → text, email, tel, url, password
│  │  ├─ Multiple lines → textarea
│  │  ├─ Formatted content → htmlpreview, json
│  │  └─ With suggestions → combo
│  │
│  ├─ Selection?
│  │  ├─ Single choice
│  │  │  ├─ Few options (2-4) → radio, buttongroup
│  │  │  ├─ Many options (5+) → select
│  │  │  └─ From API → collection
│  │  │
│  │  └─ Multiple choice
│  │     ├─ Few options (2-4) → checkbox (multiple)
│  │     ├─ Many options (5+) → multiselect, checklistdropdown
│  │     └─ From API → collectionmultiselect
│  │
│  ├─ Number input?
│  │  ├─ Precise value → number
│  │  └─ Range/relative → range (slider)
│  │
│  ├─ Date/Time?
│  │  ├─ Simple date → date (native)
│  │  ├─ Enhanced date → datepicker
│  │  ├─ Date range → daterange
│  │  ├─ Time only → time
│  │  └─ Date + Time → datetime-local
│  │
│  ├─ File upload?
│  │  ├─ Any file → file
│  │  └─ Image with preview → image
│  │
│  ├─ Boolean (on/off)?
│  │  ├─ Single option → checkbox, toggle
│  │  └─ Multiple options → checkbox (multiple)
│  │
│  └─ Special data?
│     ├─ Tags/keywords → tag
│     ├─ JSON data → json
│     ├─ HTML content → htmlpreview
│     ├─ Hex color → hex (hexType: 'color'), color
│     ├─ Hex string → hex (hexType: 'string')
│     └─ Color picker → color
│
└─ No (display only)
   ├─ Section header → header
   ├─ Custom content → html
   ├─ Separator → divider
   ├─ Hidden value → hidden
   └─ Action button → button
```

---

## Common Patterns

### Two-Column Layout
```javascript
fields: [
  { type: 'text', name: 'first_name', label: 'First Name', columns: 6 },
  { type: 'text', name: 'last_name', label: 'Last Name', columns: 6 }
]
```

### Responsive Layout
```javascript
fields: [
  { 
    type: 'text', 
    name: 'city', 
    label: 'City',
    columns: { xs: 12, md: 4 } // Full width mobile, 1/3 desktop
  }
]
```

### Grouped Fields
```javascript
fields: [
  {
    type: 'group',
    title: 'Contact Information',
    columns: 6,
    fields: [
      { type: 'email', name: 'email', label: 'Email' },
      { type: 'tel', name: 'phone', label: 'Phone' }
    ]
  }
]
```

### Tabbed Organization
```javascript
fields: [
  {
    type: 'tabset',
    tabs: [
      {
        label: 'Basic',
        fields: [/* basic fields */]
      },
      {
        label: 'Advanced',
        fields: [/* advanced fields */]
      }
    ]
  }
]
```

---

## Next Steps

- **Basic Fields** - See [BasicTypes.md](./BasicTypes.md) for detailed docs on native HTML5 fields
- **Advanced Components** - See [inputs/](./inputs/) for component-based inputs
- **FormView API** - See [FormView.md](./FormView.md) for form lifecycle and methods
- **Validation** - See [Validation.md](./Validation.md) for validation patterns
- **Best Practices** - See [BestPractices.md](./BestPractices.md) for common patterns and pitfalls

---

## Field Type Aliases

Some field types have multiple names for convenience:

| Primary Type | Aliases |
|--------------|---------|
| `toggle` | `switch` |
| `combo` | `combobox`, `autocomplete` |
| `tag` | `tags` |
| `header` | `heading` |
| `collection-multiselect` | `collectionmultiselect` |
| `datetime` | `datetime-local` |

---

## Quick Comparison

### Select vs MultiSelect vs ChecklistDropdown

| Feature | select | multiselect | checklistdropdown |
|---------|--------|-------------|-------------------|
| Multiple selection | Optional | Yes | Yes |
| Visual style | Native dropdown | Custom dropdown | Bootstrap dropdown |
| Searchable | Optional | Built-in | No |
| Use case | Simple selection | Elegant multi-select | Compact filters |

### Date vs DatePicker

| Feature | date (native) | datepicker (Easepick) |
|---------|---------------|----------------------|
| Browser support | All modern | All (with polyfill) |
| Customization | Limited | Full themes |
| Visual style | Browser default | Consistent |
| Use case | Simple date input | Enhanced UX |

### File vs Image

| Feature | file | image |
|---------|------|-------|
| Preview | No | Yes (with sizes) |
| Drag & drop | Browser default | Enhanced |
| Remove button | No | Yes |
| Use case | Any file type | Images specifically |

### Checkbox vs Toggle

| Feature | checkbox | toggle |
|---------|----------|--------|
| Visual style | Square checkbox | Switch toggle |
| Use case | Forms, agreements | Settings, features |
| Multiple | Yes | Typically single |

---

## Related Documentation

- [README.md](./README.md) - Forms overview and quick start
- [BasicTypes.md](./BasicTypes.md) - Native HTML5 field types
- [inputs/](./inputs/) - Advanced component inputs
- [FormView.md](./FormView.md) - FormView API reference
- [FormBuilder.md](./FormBuilder.md) - FormBuilder API reference
- [Validation.md](./Validation.md) - Validation system
- [BestPractices.md](./BestPractices.md) - Patterns and pitfalls
