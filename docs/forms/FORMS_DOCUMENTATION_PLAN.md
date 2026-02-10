# WEB-MOJO Forms Documentation Plan

## Overview
Comprehensive documentation for WEB-MOJO's form system, covering FormBuilder, FormView, field types, validation, and advanced features.

---

## Documentation Structure

```
docs/forms/
├── README.md                           # Overview & Quick Start
├── 01-FormView.md                      # FormView component guide
├── 02-FormBuilder.md                   # FormBuilder HTML generation
├── 03-FieldTypes.md                    # All available field types
├── 04-Validation.md                    # Form validation system
├── 05-FileHandling.md                  # File uploads & image cropping
├── 06-AdvancedInputs.md               # TagInput, DatePicker, etc.
├── 07-Groups-and-Layout.md            # Form groups & responsive layout
├── 08-FormEvents.md                   # Event system & hooks
├── 09-AutoSave.md                     # Auto-save functionality
├── 10-FormPlugins.md                  # Plugin system
└── 11-BestPractices.md                # Patterns & common pitfalls
```

---

## Content Outline

### README.md - Forms Overview
**Purpose:** Entry point with overview and quick start

**Sections:**
1. **What is the Form System?**
   - Two-tier architecture (FormBuilder + FormView)
   - Design philosophy (separation of concerns)
   - When to use forms vs custom views

2. **Quick Start**
   - Simplest form example
   - Form with model binding
   - Form with validation

3. **Core Concepts**
   - FormBuilder (HTML generation)
   - FormView (lifecycle & events)
   - Field types overview
   - Data flow (defaults → model → data)

4. **Navigation Guide**
   - Links to detailed guides
   - Decision tree (which guide to read when)

---

### 01-FormView.md - FormView Component
**Purpose:** Complete guide to FormView lifecycle and usage

**Sections:**
1. **Constructor Options**
   - `formConfig` / `config`
   - `fields` (shorthand)
   - `model` - Model binding
   - `data` - Initial data
   - `defaults` - Default values
   - `errors` - Initial errors
   - `fileHandling` - 'base64' | 'multipart'
   - `autosaveModelField` - Auto-save on change
   - `containerId` - Parent view integration

2. **Data Priority**
   - How data, defaults, and model merge
   - Priority order: data > model > defaults
   - When each is appropriate

3. **Lifecycle Methods**
   - `onInit()` - Setup
   - `onAfterRender()` - Form ready
   - `onBeforeDestroy()` - Cleanup
   - Integration with View lifecycle

4. **Form Methods**
   - `getFormData()` - Get current form data
   - `setFormData(data)` - Set form values
   - `validate()` - Run validation
   - `reset()` - Reset to defaults
   - `handleSubmit()` - Submit with model save
   - `focusFirstError()` - Focus first invalid field
   - `clearAllErrors()` - Clear validation errors

5. **Model Integration**
   - Binding models to forms
   - Auto-save on field change
   - Handling save responses
   - Error handling from API

6. **File Handling Modes**
   - Base64 encoding (default)
   - Multipart form data
   - When to use each

7. **As Child View**
   - Using FormView in parent views
   - Setting containerId
   - Event bubbling

---

### 02-FormBuilder.md - FormBuilder Component
**Purpose:** Understanding HTML generation and field configuration

**Sections:**
1. **What is FormBuilder?**
   - Pure HTML generation (no events)
   - Mustache templates
   - Used internally by FormView
   - Standalone usage (rare)

2. **Configuration Object**
   - `fields` array
   - `options` object
   - `buttons` array
   - `data` object

3. **Field Configuration Common Properties**
   - `type` - Field type (required)
   - `name` - Field name (required)
   - `label` - Field label
   - `value` - Default value
   - `placeholder` - Placeholder text
   - `required` - Validation flag
   - `disabled` - Disable field
   - `readonly` - Read-only field
   - `help` / `helpText` - Help text
   - `columns` / `cols` - Grid columns
   - `class` - Custom CSS class
   - `attributes` - Custom HTML attributes

4. **Responsive Columns**
   - Bootstrap grid integration
   - `columns: 6` - Simple syntax
   - `columns: { xs: 12, sm: 6, md: 4 }` - Responsive
   - Auto-sizing with `columns: 'auto'`

5. **Form Buttons**
   - Submit buttons
   - Reset buttons
   - Custom buttons with actions

6. **Custom Templates**
   - Registering custom field types
   - Template syntax
   - Mustache context

---

### 03-FieldTypes.md - Field Types Reference
**Purpose:** Complete reference of all field types with examples

**Sections:**
1. **Basic Text Inputs**
   - `text` - Text input
   - `email` - Email input
   - `password` - Password with show/hide
   - `number` - Number input
   - `tel` - Telephone input
   - `url` - URL input
   - `search` - Search input with live filter
   - `hex` - Hexadecimal input with validation

2. **Text Areas**
   - `textarea` - Multi-line text
   - `htmlpreview` - HTML with preview button
   - `json` - JSON editor

3. **Selection Fields**
   - `select` - Dropdown select
   - `multiselect` - Multiple selection dropdown
   - `checkbox` - Single checkbox
   - `switch` / `toggle` - Toggle switch
   - `radio` - Radio button group
   - `checklistdropdown` - Dropdown with checkboxes
   - `buttongroup` - Button group selector

4. **Date & Time**
   - `date` - Date picker (native)
   - `datetime` - DateTime picker (native)
   - `time` - Time picker (native)
   - `datepicker` - Enhanced date picker
   - `daterange` - Date range picker

5. **File Uploads**
   - `file` - File input
   - `image` - Image upload with cropping

6. **Advanced Inputs**
   - `tag` / `tags` - Tag input
   - `collection` - Collection select
   - `collectionmultiselect` - Collection multi-select
   - `combo` / `combobox` / `autocomplete` - Combo input
   - `color` - Color picker
   - `range` - Range slider

7. **Structural Elements**
   - `header` / `heading` - Section header
   - `html` - Custom HTML
   - `divider` - Horizontal divider
   - `button` - Custom button
   - `hidden` - Hidden field
   - `group` - Field grouping (see Groups-and-Layout.md)
   - `tabset` - Tabbed sections

**Each field type includes:**
- Purpose and use case
- Configuration options
- Code example
- Screenshot/diagram
- Common patterns
- Common pitfalls

---

### 04-Validation.md - Form Validation
**Purpose:** Complete validation system documentation

**Sections:**
1. **Client-Side Validation**
   - HTML5 validation attributes
   - `required` flag
   - Pattern validation
   - Min/max values
   - Custom validation messages

2. **Model Validation**
   - Model `validate()` method
   - Integration with FormView
   - Validation on submit

3. **Server-Side Validation**
   - Handling API error responses
   - Error format expected
   - Displaying field errors
   - Global form errors

4. **Real-Time Validation**
   - Validate on blur
   - Validate on change
   - Debounced validation

5. **Custom Validators**
   - Creating custom validators
   - Async validation
   - Cross-field validation

6. **Error Display**
   - Field-level errors
   - Form-level errors
   - Error styling
   - Focus management

---

### 05-FileHandling.md - File Uploads
**Purpose:** File uploads, image cropping, and file handling modes

**Sections:**
1. **File Handling Modes**
   - `fileHandling: 'base64'`
     - When to use (small files, avatars)
     - Size considerations
     - Database storage
   - `fileHandling: 'multipart'`
     - When to use (large files, documents)
     - Server requirements
     - FormData submission

2. **File Field**
   - Basic file upload
   - Multiple files
   - Accept types
   - File size limits
   - Progress tracking

3. **Image Field**
   - Image upload
   - Image cropping
   - Aspect ratios
   - Size presets
   - Preview display

4. **Image Cropping**
   - Cropper.js integration
   - Crop modes (free, fixed ratio)
   - Crop data
   - Preview generation

5. **File Events**
   - `file:selected`
   - `image:selected`
   - `image:cropped`
   - `image:dropped`
   - `upload:progress`

6. **Drag & Drop**
   - FileDropMixin integration
   - Drop zone styling
   - Multiple file drops
   - File type validation

7. **Server Integration**
   - Multipart POST
   - Base64 in JSON
   - Handling responses
   - Error handling

---

### 06-AdvancedInputs.md - Advanced Input Components
**Purpose:** Guide to complex input components

**Sections:**
1. **TagInput**
   - Creating tag fields
   - Separators (comma, enter)
   - Max tags
   - Validation
   - Custom styling
   - Events

2. **DatePicker**
   - Enhanced date picking
   - Format options
   - Display format vs value format
   - Localization
   - Date ranges
   - Min/max dates

3. **DateRangePicker**
   - Start and end dates
   - Field naming
   - Format options
   - Separator
   - Validation
   - Presets

4. **CollectionSelect**
   - Binding to collections
   - Display field
   - Value field
   - Filtering
   - Search
   - Lazy loading

5. **CollectionMultiSelect**
   - Multiple selection from collection
   - Selected items display
   - Remove items
   - Maximum selections

6. **ComboInput / ComboBox**
   - Autocomplete functionality
   - Data sources
   - Filtering
   - Custom templates
   - Keyboard navigation

7. **MultiSelectDropdown**
   - Multiple selection UI
   - Checkbox list
   - Select all/none
   - Filter/search
   - Selected badges

---

### 07-Groups-and-Layout.md - Form Layout
**Purpose:** Form organization and responsive layout

**Sections:**
1. **Field Groups**
   - `type: 'group'`
   - Group columns
   - Group title
   - Nested groups
   - Use cases (side-by-side fields)

2. **Responsive Grid**
   - Bootstrap grid integration
   - Column syntax
   - Responsive breakpoints
   - Auto-sizing columns
   - Common layouts (2-column, 3-column)

3. **Group Examples**
   - Avatar + info sidebar
   - Contact information block
   - Address fields
   - Multi-column forms

4. **Form Sections**
   - Using headers
   - Visual separation
   - Collapsible sections
   - Tabbed forms

5. **SectionedFormView**
   - Multi-section forms
   - Section navigation
   - Section validation
   - Progress indicators

---

### 08-FormEvents.md - Events System
**Purpose:** Complete event reference and patterns

**Sections:**
1. **Form-Level Events**
   - `submit` - Form submitted
   - `change` - Any field changed
   - `reset` - Form reset
   - `error` - Validation error
   - `success` - Successful submit

2. **Field-Level Events**
   - `field:change` - Specific field changed
   - `field:blur` - Field lost focus
   - `field:focus` - Field gained focus
   - `field:error` - Field validation error

3. **Input Component Events**
   - `tag:added` - Tag added (TagInput)
   - `tag:removed` - Tag removed
   - `image:selected` - Image chosen
   - `image:cropped` - Image cropped
   - `file:selected` - File chosen
   - `switch:toggle` - Switch toggled

4. **Action Events**
   - Button actions
   - Custom actions
   - Action delegation
   - Preventing defaults

5. **Event Data**
   - What data each event provides
   - Accessing form data
   - Accessing field values
   - Event context

6. **Event Patterns**
   - Listening to events
   - Event bubbling
   - Preventing submission
   - Async event handlers
   - Cleanup on destroy

---

### 09-AutoSave.md - Auto-Save Functionality
**Purpose:** Automatic saving and field-level persistence

**Sections:**
1. **Auto-Save Model Field**
   - `autosaveModelField: true`
   - When changes are saved
   - Debouncing
   - Batching updates

2. **Configuration**
   - Enable/disable per form
   - Debounce timing
   - Batch saving
   - Error handling

3. **Save Indicators**
   - Showing save status
   - Loading states
   - Success feedback
   - Error feedback

4. **Best Practices**
   - When to use auto-save
   - Performance considerations
   - User experience
   - Conflict resolution

5. **Implementation Examples**
   - Profile settings auto-save
   - Draft saving
   - Per-field save
   - Batch save on blur

---

### 10-FormPlugins.md - Plugin System
**Purpose:** Extending forms with plugins

**Sections:**
1. **What are Form Plugins?**
   - Extension points
   - Use cases
   - Registration

2. **Plugin Hooks**
   - `onFormBuilderInit(formBuilder)`
   - `onFormViewInit(formView)`
   - `getRenderer(fieldType)`
   - Custom field types

3. **Creating Custom Field Types**
   - Registering templates
   - Rendering logic
   - Event handling
   - Lifecycle integration

4. **Example Plugins**
   - Rich text editor field
   - WYSIWYG editor
   - Code editor
   - Custom date picker
   - Signature field

5. **Plugin Best Practices**
   - Naming conventions
   - Dependency management
   - Cleanup
   - Documentation

---

### 11-BestPractices.md - Patterns & Pitfalls
**Purpose:** Recommended patterns and common mistakes

**Sections:**
1. **Form Design Patterns**
   - Single-page forms
   - Multi-step wizards
   - Inline editing
   - Modal forms
   - Tabbed forms

2. **Data Management**
   - Model-first approach
   - When to use `data` vs `defaults`
   - Handling initial values
   - Resetting forms
   - Dirty tracking

3. **Performance Optimization**
   - Large forms
   - Collection fields with many items
   - Debouncing validation
   - Lazy loading options
   - Caching strategies

4. **Common Pitfalls**
   - ❌ Not setting containerId
   - ❌ Initializing forms in wrong lifecycle
   - ❌ Missing required imports
   - ❌ Incorrect field names
   - ❌ File handling mode mismatch
   - ❌ Not handling validation errors
   - ❌ Memory leaks from event listeners
   - ❌ Using FormBuilder directly (usually wrong)
   - ❌ Mixing data sources incorrectly

5. **Testing Forms**
   - Unit testing form validation
   - Integration testing submissions
   - Testing file uploads
   - Mocking API responses

6. **Accessibility**
   - Keyboard navigation
   - Screen reader support
   - ARIA labels
   - Focus management
   - Error announcements

7. **Security Considerations**
   - XSS prevention
   - File upload security
   - Validation on server
   - CSRF protection
   - Sanitizing user input

---

## Documentation Standards

### Each Guide Should Include:

1. **Clear Purpose Statement**
   - What this guide covers
   - Who should read it
   - Prerequisites

2. **Table of Contents**
   - Easy navigation
   - Linkable sections

3. **Code Examples**
   - Complete, runnable code
   - Progressive complexity
   - Comments explaining key points
   - Multiple use cases

4. **Visual Aids**
   - Screenshots of rendered forms
   - Diagrams of data flow
   - Architecture diagrams
   - Before/after comparisons

5. **Common Patterns Section**
   - Real-world examples
   - Copy-paste ready code
   - Explanation of why

6. **Common Pitfalls Section**
   - What NOT to do
   - Why it's wrong
   - How to fix it
   - ⚠️ Warning callouts

7. **API Reference**
   - Method signatures
   - Parameter types
   - Return types
   - Default values

8. **Related Documentation**
   - Links to related guides
   - External resources
   - GitHub examples

---

## Implementation Priority

### Phase 1: Core Documentation (Essential)
1. README.md - Quick start and overview
2. 01-FormView.md - Most commonly used
3. 03-FieldTypes.md - Reference material
4. 11-BestPractices.md - Prevent common mistakes

### Phase 2: Intermediate Topics
5. 04-Validation.md - Important for real apps
6. 05-FileHandling.md - Common need
7. 08-FormEvents.md - Essential for interactivity

### Phase 3: Advanced Topics
8. 06-AdvancedInputs.md - Power users
9. 07-Groups-and-Layout.md - Complex forms
10. 09-AutoSave.md - Advanced feature

### Phase 4: Extension & Polish
11. 02-FormBuilder.md - Advanced/rare usage
12. 10-FormPlugins.md - Extensibility

---

## Success Metrics

A developer should be able to:
1. ✅ Create a basic form in < 5 minutes
2. ✅ Add validation without reading docs deeply
3. ✅ Understand all field types from reference
4. ✅ Implement file uploads correctly first time
5. ✅ Avoid all common pitfalls listed in best practices
6. ✅ Find answers without asking for help

---

## Maintenance Plan

- Update when new field types are added
- Add examples from real-world usage
- Collect FAQ and add to relevant sections
- Keep examples in sync with codebase
- Version documentation with framework versions
