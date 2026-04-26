# WEB-MOJO Forms Documentation Plan

## Overview
Comprehensive documentation for WEB-MOJO's form system, covering FormBuilder, FormView, field types, validation, and advanced features.

---

## Documentation Structure

```
docs/forms/
├── README.md                           # Overview & Quick Start
├── FormView.md                         # FormView component guide
├── FormBuilder.md                      # FormBuilder HTML generation
├── FieldTypes.md                       # Basic field types reference
├── Validation.md                       # Form validation system
├── FileHandling.md                     # File uploads & base64 vs multipart
├── Groups-and-Layout.md                # Form groups & responsive layout
├── FormEvents.md                       # Event system & hooks
├── AutoSave.md                         # Auto-save functionality
├── FormPlugins.md                      # Plugin system
├── BestPractices.md                    # Patterns & common pitfalls
└── inputs/                             # Advanced input components
    ├── README.md                       # Inputs overview & comparison
    ├── TagInput.md                     # Tag/chip input component
    ├── DatePicker.md                   # Enhanced date picker
    ├── DateRangePicker.md              # Date range selection
    ├── CollectionSelect.md             # Collection dropdown
    ├── CollectionMultiSelect.md        # Multi-select from collection
    ├── ComboInput.md                   # Autocomplete/combo input
    ├── MultiSelectDropdown.md          # Multi-select with checkboxes
    └── ImageField.md                   # Image upload with cropping
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

### FieldTypes.md - Basic Field Types Reference
**Purpose:** Complete reference of basic/native field types

**Sections:**
1. **Basic Text Inputs**
   - `text` - Text input
   - `email` - Email input with validation
   - `password` - Password with show/hide toggle
   - `number` - Number input with min/max
   - `tel` - Telephone input
   - `url` - URL input with validation
   - `search` - Search input with live filter
   - `hex` - Hexadecimal input with validation

2. **Text Areas**
   - `textarea` - Multi-line text
   - `htmlpreview` - HTML with preview button
   - `json` - JSON editor with formatting

3. **Selection Fields**
   - `select` - Dropdown select
   - `checkbox` - Single checkbox
   - `switch` / `toggle` - Toggle switch
   - `radio` - Radio button group

4. **Date & Time (Native)**
   - `date` - Date picker (native HTML5)
   - `datetime` - DateTime picker (native HTML5)
   - `time` - Time picker (native HTML5)

5. **Basic File Uploads**
   - `file` - Basic file input

6. **Other Inputs**
   - `color` - Color picker
   - `range` - Range slider

7. **Structural Elements**
   - `header` / `heading` - Section header
   - `html` - Custom HTML block
   - `divider` - Horizontal divider
   - `button` - Custom button
   - `hidden` - Hidden field

8. **Advanced Inputs**
   - Note: For advanced components like TagInput, DatePicker, CollectionSelect, etc., see [inputs/](./inputs/README.md)

**Each field type includes:**
- Purpose and use case
- All configuration options
- Code example
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

### inputs/README.md - Advanced Inputs Overview
**Purpose:** Overview and comparison of all advanced input components

**Sections:**
1. **What are Advanced Inputs?**
   - Component-based inputs vs basic fields
   - When to use advanced inputs
   - Common features

2. **Available Components**
   - Quick reference table
   - Feature comparison
   - Use case guide

3. **Component List**
   - **[TagInput](./TagInput.md)** - Tag/chip input for multi-value fields
   - **[DatePicker](./DatePicker.md)** - Enhanced date selection
   - **[DateRangePicker](./DateRangePicker.md)** - Select date ranges
   - **[CollectionSelect](./CollectionSelect.md)** - Dropdown from collection/API
   - **[CollectionMultiSelect](./CollectionMultiSelect.md)** - Multi-select from collection
   - **[ComboInput](./ComboInput.md)** - Autocomplete/combo input
   - **[MultiSelectDropdown](./MultiSelectDropdown.md)** - Multi-select with checkboxes
   - **[ImageField](./ImageField.md)** - Image upload with cropping

4. **Common Patterns**
   - Using with FormView
   - Standalone usage
   - Event handling
   - Validation

5. **Performance Considerations**
   - Large datasets
   - Lazy loading
   - Debouncing

---

### Individual Input Component Docs

Each component in `inputs/` follows this structure:

#### Template: inputs/[ComponentName].md

**Sections:**
1. **Overview**
   - What it does
   - When to use it
   - Visual example/screenshot

2. **Quick Start**
   - Simplest usage
   - Installation/imports

3. **In FormView**
   - Using as field type
   - Configuration in formConfig
   - Example

4. **Standalone Usage**
   - Direct instantiation
   - Without FormView
   - Example

5. **Configuration Options**
   - Complete API reference
   - All properties with types
   - Default values
   - Required vs optional

6. **Methods**
   - Public API methods
   - Method signatures
   - Use cases

7. **Events**
   - All events emitted
   - Event data structure
   - Event examples

8. **Examples**
   - Basic usage
   - With validation
   - With model binding
   - Custom styling
   - Advanced patterns
   - Real-world scenarios

9. **Styling & Customization**
   - CSS classes
   - Custom templates
   - Theming
   - Bootstrap integration

10. **Common Patterns**
    - Real-world examples
    - Best practices
    - Copy-paste ready code

11. **Common Pitfalls**
    - ❌ What NOT to do
    - Why it's wrong
    - ✅ How to fix it
    - ⚠️ Warning callouts

12. **Performance**
    - Optimization tips
    - Large dataset handling
    - Memory considerations

13. **Accessibility**
    - Keyboard navigation
    - Screen reader support
    - ARIA attributes

14. **API Reference**
    - Constructor options
    - Properties
    - Methods
    - Events
    - Type definitions

15. **Related Documentation**
    - Links to related inputs
    - FormView integration
    - External resources

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
1. **README.md** - Quick start and overview
2. **FormView.md** - Most commonly used component
3. **FieldTypes.md** - Basic field types reference
4. **BestPractices.md** - Prevent common mistakes

### Phase 2: Intermediate Topics
5. **Validation.md** - Important for real apps
6. **FileHandling.md** - Common need
7. **FormEvents.md** - Essential for interactivity
8. **Groups-and-Layout.md** - Form organization

### Phase 3: Advanced Input Components
9. **inputs/README.md** - Overview of all advanced inputs
10. **inputs/TagInput.md** - Most common advanced input
11. **inputs/DatePicker.md** - Very common need
12. **inputs/DateRangePicker.md** - Builds on DatePicker
13. **inputs/ImageField.md** - File handling showcase
14. **inputs/CollectionSelect.md** - Common pattern
15. **inputs/CollectionMultiSelect.md** - Builds on CollectionSelect
16. **inputs/ComboInput.md** - Autocomplete needs
17. **inputs/MultiSelectDropdown.md** - Alternative multi-select

### Phase 4: Advanced Features & Extensions
18. **AutoSave.md** - Advanced feature
19. **FormBuilder.md** - Internal implementation (rare usage)
20. **FormPlugins.md** - Extensibility for power users

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
