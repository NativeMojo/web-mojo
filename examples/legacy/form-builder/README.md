# Form Builder - MOJO Framework

**Difficulty: Advanced** | **Focus: Dynamic Form Generation** | **Time: 45 minutes**

Interactive form builder demonstrating MOJO Framework's Phase 3 capabilities with dynamic component generation, validation systems, and Bootstrap 5 integration.

## 🎯 What You'll Learn

This advanced example showcases sophisticated MOJO Framework patterns:

- **Dynamic Component Generation** - Creating forms programmatically
- **Multi-Component Architecture** - Coordinating multiple specialized components
- **Advanced Template Systems** - Complex conditional rendering with Mustache.js
- **Real-time Configuration** - Live updates and form preview
- **Form Validation Patterns** - Client-side validation with Bootstrap 5
- **Component Communication** - Inter-component data flow and events
- **Bootstrap 5 Mastery** - Advanced form styling and layout patterns

## 🚀 Quick Start

### Option 1: Development Server (Recommended)
```bash
# From project root
npm run dev
# Visit: http://localhost:3000/examples/form-builder/
```

### Option 2: Static Server
```bash
# From examples directory
cd web-mojo/examples/form-builder
python3 -m http.server 8080
# Visit: http://localhost:8080
```

## ✨ Interactive Features

### 🎮 Quick Demo Templates
- **Contact Form** - Standard contact form with validation
- **Registration Form** - User account creation with sections
- **Survey Form** - Feedback collection with radio buttons and checkboxes

### 🛠️ Form Configuration
- **Dynamic Titles** - Real-time form title updates
- **Description Text** - Optional form descriptions
- **Submit Button** - Customizable button text
- **Form Styling** - Default, bordered, and floating label styles

### 📚 Field Library
**Input Fields:**
- Text Input, Email, Password, Number, Phone, Textarea

**Selection Fields:**
- Dropdown, Radio Groups, Checkboxes, Toggle Switches

**Layout Elements:**
- Headings, Dividers, Spacers

### 🔍 Live Preview
- **Real-time Updates** - See changes instantly
- **Form Testing** - Functional form submission with validation
- **Bootstrap Validation** - Client-side validation feedback
- **Responsive Design** - Mobile-friendly form layouts

### 📊 Statistics Dashboard
- **Field Count** - Total number of form fields
- **Validation Count** - Required fields tracking
- **Section Count** - Form organization sections
- **Changes Count** - Modification tracking

## 🏗️ Architecture Overview

### Multi-Component System
```javascript
class FormBuilderApp {
    constructor() {
        // Coordinating components
        this.configPanel = new ConfigurationPanel({ formBuilder: this });
        this.fieldLibrary = new FieldLibrary({ formBuilder: this });
        this.formPreview = new FormPreview({ formBuilder: this });
    }
}
```

### Component Communication Pattern
```javascript
// Configuration Panel updates main app
async onActionUpdateFormTitle(event, element) {
    this.updateData({ formTitle: element.value });
    this.formBuilder.updateFormConfig({ title: element.value });
}

// Main app coordinates all components
updateFormConfig(updates) {
    this.config = { ...this.config, ...updates };
    this.formPreview.updateForm(this.config, this.fields);
}
```

### Dynamic Template Generation
```html
{{#fields}}
<div class="mb-3">
    {{#isText}}
    <label class="form-label">{{label}} {{#required}}<span class="text-danger">*</span>{{/required}}</label>
    <input type="{{inputType}}" class="form-control" name="{{name}}" 
           placeholder="{{placeholder}}" {{#required}}required{{/required}}>
    {{/isText}}
    
    {{#isSelect}}
    <label class="form-label">{{label}} {{#required}}<span class="text-danger">*</span>{{/required}}</label>
    <select class="form-select" name="{{name}}" {{#required}}required{{/required}}>
        <option value="">Choose...</option>
        {{#options}}
        <option value="{{value}}">{{label}}</option>
        {{/options}}
    </select>
    {{/isSelect}}
</div>
{{/fields}}
```

## 🎓 Key Concepts Demonstrated

### 1. **Dynamic Component Architecture**
Multiple specialized components working together:

- **ConfigurationPanel** - Form settings and options
- **FieldLibrary** - Available field types and controls
- **FormPreview** - Live form rendering and testing
- **FormBuilderApp** - Coordination and state management

### 2. **Advanced Template Patterns**
Complex conditional rendering based on field types:

```javascript
processFieldType(field) {
    if (['text', 'email', 'password', 'number', 'tel'].includes(field.type)) {
        field.isText = true;
        field.inputType = field.type;
    } else if (field.type === 'textarea') {
        field.isTextarea = true;
    } else if (field.type === 'select') {
        field.isSelect = true;
    }
    // ... more field types
}
```

### 3. **Real-time Data Flow**
Coordinated updates across multiple components:

```javascript
addField(fieldType) {
    const field = this.createField(fieldType);
    this.fields.push(field);
    this.updateStatistics();
    this.generateForm(); // Updates preview automatically
}
```

### 4. **Bootstrap 5 Form Validation**
Native validation with visual feedback:

```javascript
async onActionSubmitForm(event, element) {
    event.preventDefault();
    element.classList.add('was-validated');
    
    if (element.checkValidity()) {
        this.showSuccess('Form submitted successfully!');
    } else {
        this.showError('Please fill in all required fields correctly.');
    }
}
```

### 5. **Configuration-Driven UI**
Forms generated from JSON-like configuration:

```javascript
const contactFormConfig = {
    config: {
        title: 'Contact Us',
        description: 'Get in touch with our team.',
        submitText: 'Send Message'
    },
    fields: [
        { type: 'text', label: 'Full Name', required: true },
        { type: 'email', label: 'Email Address', required: true },
        { type: 'textarea', label: 'Message', required: true }
    ]
};
```

## 🎮 Interactive Demo Modes

### Contact Form Demo
```javascript
// Loads pre-configured contact form
loadDemo('contact');

// Includes: Name, Email, Phone, Subject dropdown, Message
// Features: Required field validation, professional styling
```

### Registration Form Demo
```javascript
// Loads user registration form with sections
loadDemo('registration');

// Includes: Personal info section, password fields, preferences
// Features: Form sections, privacy options, bordered styling
```

### Survey Form Demo
```javascript
// Loads feedback collection form
loadDemo('survey');

// Includes: Radio buttons, checkboxes, textarea
// Features: Rating scales, multiple selections, floating labels
```

## 🛠️ Development Patterns

### Field Type System
```javascript
const fieldDefaults = {
    text: { label: 'Text Field', placeholder: 'Enter text...' },
    email: { label: 'Email Address', placeholder: 'Enter email...' },
    select: { label: 'Dropdown', options: [
        { value: 'option1', label: 'Option 1' },
        { value: 'option2', label: 'Option 2' }
    ]},
    // ... more field types
};
```

### Component Lifecycle Integration
```javascript
async initialize() {
    // Create and coordinate multiple components
    this.configPanel = new ConfigurationPanel({ formBuilder: this });
    this.fieldLibrary = new FieldLibrary({ formBuilder: this });
    this.formPreview = new FormPreview({ formBuilder: this });
    
    // Render all components
    await Promise.all([
        this.configPanel.render('#config-panel'),
        this.fieldLibrary.render('#field-library'),
        this.formPreview.render('#form-preview')
    ]);
}
```

### State Management Pattern
```javascript
class FormBuilderApp {
    constructor() {
        this.config = { /* form configuration */ };
        this.fields = [];
        this.fieldCounter = 0;
        this.changeCounter = 0;
    }
    
    // Centralized state updates
    updateFormConfig(updates) {
        this.config = { ...this.config, ...updates };
        this.changeCounter++;
        this.propagateChanges();
    }
}
```

## 🔍 Behind the Scenes

### Form Generation Process
1. **Configuration Input** - User modifies form settings
2. **Field Addition** - Fields added from library or demos
3. **Template Processing** - Dynamic template generation based on field types
4. **Bootstrap Integration** - Automatic styling and validation setup
5. **Live Preview** - Real-time form rendering and testing

### Component Communication Flow
```
ConfigurationPanel
       ↓ (form config updates)
FormBuilderApp (central coordinator)
       ↓ (field additions)
FieldLibrary → FormBuilderApp → FormPreview
                    ↓ (form generation)
              Live Form Preview
```

## 💡 Try These Experiments

### 1. **Add Custom Field Types**
```javascript
// Extend the field library with new types
const customFields = {
    date: { label: 'Date Picker', inputType: 'date' },
    time: { label: 'Time Picker', inputType: 'time' },
    range: { label: 'Range Slider', inputType: 'range' }
};
```

### 2. **Advanced Validation Rules**
```javascript
// Add custom validation patterns
field.pattern = '^[A-Za-z0-9]{6,}$';
field.validationMessage = 'Must be at least 6 alphanumeric characters';
```

### 3. **Custom Form Styles**
```javascript
// Add new styling options
formStyles: {
    card: 'card p-4',
    compact: 'form-compact',
    inline: 'form-inline'
}
```

## 🎯 Learning Objectives

After completing this example, you should understand:

### **Advanced Component Architecture**
- Multi-component coordination patterns
- Component communication via shared state
- Specialized component responsibilities

### **Dynamic UI Generation**
- Configuration-driven interface creation
- Template-based form generation
- Real-time preview systems

### **Form Development Mastery**
- Bootstrap 5 form validation patterns
- Dynamic field type handling
- Professional form styling techniques

### **State Management Patterns**
- Centralized application state
- Component data synchronization
- Change tracking and statistics

## 🔧 Debug Tools

### Browser Console Access
```javascript
// Access the form builder instance
window.formBuilder

// Inspect current configuration
window.formBuilder.config

// View all form fields
window.formBuilder.fields

// Test field addition
window.formBuilder.addField('email')

// Load demo programmatically
window.formBuilder.loadDemo('contact')
```

### Development Inspection
- **Form Configuration** - Real-time config object inspection
- **Field Array** - Dynamic field collection monitoring
- **Component State** - Individual component data tracking
- **Generated HTML** - Inspect rendered form output

## 🐛 Troubleshooting

### **Form Not Rendering**
- Check browser console for template errors
- Verify field configuration structure
- Ensure all required field properties are set

### **Validation Not Working**
- Confirm Bootstrap 5 JavaScript is loaded
- Check for `required` attribute on form fields
- Verify form has `needs-validation` class

### **Component Communication Issues**
- Ensure all components have `formBuilder` reference
- Check that state updates call `generateForm()`
- Verify component initialization order

### **Demo Loading Problems**
```javascript
// Debug demo loading
console.log('Demo config:', demos[demoType]);
console.log('Fields after demo:', this.fields);
```

## 🔗 Next Steps

Ready for more advanced patterns?

### **Related Examples:**
- **[Table Advanced](../table-advanced/)** - Complex data table components
- **[Phase 2 Basic](../phase2-basic/)** - Data layer integration
- **[Complete Demo](../complete-demo/)** - Full application patterns

### **Extension Ideas:**
- **Form Persistence** - Save/load form configurations
- **Export Functionality** - Generate HTML/JSON output
- **Advanced Validation** - Custom validation rules
- **Theme System** - Multiple styling themes
- **Field Grouping** - Form sections and tabs

## 🎊 Success Criteria

You've mastered MOJO Form Builder when you can:

- ✅ Create multi-component applications with coordinated state
- ✅ Generate dynamic UIs from configuration objects
- ✅ Implement complex template systems with conditional rendering
- ✅ Integrate Bootstrap 5 form validation seamlessly
- ✅ Build professional form interfaces with real-time preview
- ✅ Debug complex component interactions effectively

## 📚 Related Documentation

- **[Component Architecture](../../docs/user-guide/components.md)** - Multi-component patterns
- **[Template Systems](../../docs/user-guide/templates.md)** - Advanced Mustache.js usage
- **[Bootstrap Integration](../../docs/user-guide/bootstrap.md)** - Form styling and validation
- **[State Management](../../docs/user-guide/state.md)** - Application state patterns

---

**MOJO Framework v2.0.0** - *Form Builder Example* 🏗️

*Build anything with dynamic forms - the sky's the limit!*