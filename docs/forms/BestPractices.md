# Forms Best Practices

This guide covers patterns, pitfalls, and best practices for building forms with WEB-MOJO. Learn from common mistakes and discover proven approaches.

## Table of Contents
- [Form Design Patterns](#form-design-patterns)
- [Common Pitfalls](#common-pitfalls)
- [Validation Best Practices](#validation-best-practices)
- [Performance Optimization](#performance-optimization)
- [Accessibility](#accessibility)
- [Security Considerations](#security-considerations)

---

## Form Design Patterns

### Pattern 1: Model-Bound Forms

**✅ DO:** Bind forms to models for automatic data sync

```javascript
// User model
const user = new Model({ 
  id: '123',
  urlRoot: '/api/users'
});

// Form bound to model
const profileForm = new FormView({
  containerId: 'profile-form',
  model: user,
  formConfig: {
    fields: [
      { type: 'text', name: 'username', label: 'Username' },
      { type: 'email', name: 'email', label: 'Email' }
    ]
  }
});

// On submit, model is automatically updated
form.on('submit', async (data) => {
  await user.save(); // Model has latest form data
});
```

**❌ DON'T:** Manually sync form and model data

```javascript
// Bad: Manual sync is error-prone
form.on('submit', async (data) => {
  user.set('username', data.username);
  user.set('email', data.email);
  // Easy to forget fields or make typos
});
```

---

### Pattern 2: Form Groups for Organization

**✅ DO:** Use groups for logical sections

```javascript
{
  formConfig: {
    groups: [
      {
        title: 'Personal Information',
        fields: [
          { type: 'text', name: 'first_name', label: 'First Name' },
          { type: 'text', name: 'last_name', label: 'Last Name' }
        ]
      },
      {
        title: 'Contact Details',
        collapsible: true,
        fields: [
          { type: 'email', name: 'email', label: 'Email' },
          { type: 'tel', name: 'phone', label: 'Phone' }
        ]
      }
    ]
  }
}
```

**Benefits:**
- Improves visual hierarchy
- Reduces cognitive load
- Makes long forms manageable
- Collapsible sections save space

---

### Pattern 3: Responsive Grid Layout

**✅ DO:** Use Bootstrap column classes

```javascript
fields: [
  {
    type: 'text',
    name: 'first_name',
    label: 'First Name',
    colClass: 'col-12 col-md-6', // Full width on mobile, half on desktop
    required: true
  },
  {
    type: 'text',
    name: 'last_name',
    label: 'Last Name',
    colClass: 'col-12 col-md-6',
    required: true
  },
  {
    type: 'email',
    name: 'email',
    label: 'Email',
    colClass: 'col-12', // Always full width
    required: true
  }
]
```

**❌ DON'T:** Force desktop layouts on mobile

```javascript
// Bad: Fixed columns don't adapt to mobile
fields: [
  { type: 'text', name: 'city', colClass: 'col-4' }, // Too narrow on mobile
  { type: 'text', name: 'state', colClass: 'col-4' },
  { type: 'text', name: 'zip', colClass: 'col-4' }
]
```

---

### Pattern 4: Progressive Disclosure

**✅ DO:** Show fields conditionally based on user input

```javascript
class SignupForm extends FormView {
  async onInit() {
    await super.onInit();
    
    // Listen for account type change
    this.on('field:change:account_type', (value) => {
      this.toggleBusinessFields(value === 'business');
    });
  }
  
  toggleBusinessFields(show) {
    const businessFields = ['company_name', 'tax_id'];
    businessFields.forEach(fieldName => {
      const field = this.element.querySelector(`[name="${fieldName}"]`);
      if (field) {
        field.closest('.mb-3').style.display = show ? 'block' : 'none';
      }
    });
  }
}
```

**Benefits:**
- Reduces form complexity
- Shows only relevant fields
- Improves completion rates

---

### Pattern 5: Inline Validation

**✅ DO:** Validate as users type (with debouncing)

```javascript
{
  type: 'text',
  name: 'username',
  label: 'Username',
  validation: {
    async custom(value) {
      if (value.length < 3) return 'Username must be at least 3 characters';
      
      // Check availability (debounced by FormView)
      const response = await fetch(`/api/check-username?username=${value}`);
      const { available } = await response.json();
      
      return available ? true : 'Username already taken';
    }
  }
}
```

**❌ DON'T:** Validate on every keystroke without debouncing

```javascript
// Bad: This will spam the API
username.addEventListener('input', async (e) => {
  await fetch(`/api/check-username?username=${e.target.value}`); // Too many requests!
});
```

> **Note:** FormView automatically debounces validation by 300ms to prevent excessive validation calls.

---

## Common Pitfalls

### ⚠️ Pitfall 1: Data Priority Confusion

**Problem:** Not understanding data source priority

```javascript
const form = new FormView({
  model: userModel, // Model has { name: 'John' }
  data: { name: 'Jane' }, // This takes priority!
  formConfig: {
    fields: [
      { type: 'text', name: 'name', value: 'Bob' } // This is lowest priority
    ]
  }
});

// Form will show "Jane" (data overrides model and field defaults)
```

**Priority Order:** `data` > `model` > `field.value`

**Solution:** Choose one data source

```javascript
// Good: Use model only
const form = new FormView({
  model: userModel,
  formConfig: { fields: [...] }
});

// Good: Use explicit data only
const form = new FormView({
  data: { name: 'Jane' },
  formConfig: { fields: [...] }
});
```

---

### ⚠️ Pitfall 2: Forgetting File Mode

**Problem:** Large files embedded as base64

```javascript
// Bad: 10MB PDF becomes 13MB+ base64 string
{
  type: 'file',
  name: 'document',
  accept: '.pdf'
  // Missing fileMode!
}
```

**Solution:** Use `multipart` for large files

```javascript
// Good: Use multipart for files > 1MB
{
  type: 'file',
  name: 'document',
  accept: '.pdf',
  fileMode: 'multipart' // Use FormData instead of base64
}

// Update submit handler
form.on('submit', async (data, event) => {
  // data is already FormData when fileMode: 'multipart'
  await fetch('/api/upload', {
    method: 'POST',
    body: data // Send as multipart/form-data
  });
});
```

**Guidelines:**
- Files < 100KB: `base64` is fine
- Files 100KB - 1MB: Either works
- Files > 1MB: Use `multipart`

---

### ⚠️ Pitfall 3: Not Handling Async Validation

**Problem:** Validation doesn't account for async operations

```javascript
// Bad: Validation returns Promise, not boolean
{
  validation: {
    custom: async (value) => {
      const response = await fetch('/api/validate');
      return response.json(); // Returns Promise!
    }
  }
}
```

**Solution:** Always await async validation

```javascript
// Good: FormView handles async validation
{
  validation: {
    async custom(value) {
      const response = await fetch('/api/validate');
      const result = await response.json();
      return result.valid ? true : result.error;
    }
  }
}

// FormView automatically awaits this
const { isValid, errors } = await form.validate();
```

---

### ⚠️ Pitfall 4: Mutating Form Config

**Problem:** Modifying formConfig after initialization

```javascript
// Bad: Changes won't be reflected
this.formConfig.fields.push({ type: 'text', name: 'new_field' });
// Field won't appear!
```

**Solution:** Create forms dynamically

```javascript
// Good: Generate config before creating form
getFormConfig() {
  const fields = [
    { type: 'text', name: 'name', label: 'Name' }
  ];
  
  if (this.showOptionalFields) {
    fields.push({ type: 'text', name: 'nickname', label: 'Nickname' });
  }
  
  return { fields };
}

async onInit() {
  await super.onInit();
  
  this.myForm = new FormView({
    containerId: 'my-form',
    formConfig: this.getFormConfig() // Build config dynamically
  });
  
  this.addChild(this.myForm);
}
```

---

### ⚠️ Pitfall 5: Wrong Lifecycle Hook

**Problem:** Creating child forms in wrong lifecycle method

```javascript
// Bad: Forms created in onBeforeRender won't render
class MyPage extends View {
  async onBeforeRender() {
    this.myForm = new FormView({
      containerId: 'form-container',
      formConfig: { ... }
    });
    // Missing addChild()!
  }
}
```

**Solution:** Use `onInit()` and `addChild()`

```javascript
// Good: Create child views in onInit
class MyPage extends View {
  async onInit() {
    await super.onInit();
    
    this.myForm = new FormView({
      containerId: 'form-container', // Must match template id
      formConfig: { ... }
    });
    
    this.addChild(this.myForm); // Register as child
  }
  
  getTemplate() {
    return `
      <div>
        <h2>My Page</h2>
        <div id="form-container"></div>
      </div>
    `;
  }
}
```

**Key Points:**
- Use `onInit()` for child view creation
- Call `addChild()` to register children
- Use `containerId` matching template `id` (not `data-container`)

---

### ⚠️ Pitfall 6: Missing Required Validation

**Problem:** Assuming `required` prevents submission

```javascript
{
  type: 'email',
  name: 'email',
  required: true // Only adds HTML5 validation!
}

// User can bypass with browser dev tools or JS submission
```

**Solution:** Always validate server-side

```javascript
// Good: Client + server validation
{
  type: 'email',
  name: 'email',
  required: true, // Client-side
  validation: {
    required: true, // FormView validation
    email: true
  }
}

// Server-side (Express example)
app.post('/api/submit', (req, res) => {
  if (!req.body.email) {
    return res.status(400).json({ error: 'Email required' });
  }
  // Process...
});
```

**Defense in Depth:**
1. HTML5 validation (UX)
2. FormView validation (client logic)
3. Server validation (security)

---

## Validation Best Practices

### Use Built-in Validators

**✅ DO:** Leverage FormView validators

```javascript
{
  validation: {
    required: true,
    email: true,
    minLength: 8,
    maxLength: 100,
    pattern: /^[a-zA-Z0-9_]+$/,
    min: 18,
    max: 120
  }
}
```

### Custom Validation Messages

**✅ DO:** Provide helpful error messages

```javascript
{
  validation: {
    custom: (value) => {
      if (!/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)/.test(value)) {
        return 'Password must contain uppercase, lowercase, and number';
      }
      return true;
    }
  }
}
```

**❌ DON'T:** Return generic errors

```javascript
// Bad: Unhelpful message
{
  validation: {
    custom: (value) => {
      if (!isValid(value)) return 'Invalid'; // Too vague!
      return true;
    }
  }
}
```

### Cross-Field Validation

**✅ DO:** Validate related fields together

```javascript
class PasswordForm extends FormView {
  async validate() {
    const { isValid, errors } = await super.validate();
    
    if (isValid) {
      const data = await this.getFormData();
      
      if (data.password !== data.confirm_password) {
        errors.confirm_password = ['Passwords do not match'];
        return { isValid: false, errors };
      }
    }
    
    return { isValid, errors };
  }
}
```

### Async Validation with Error Handling

**✅ DO:** Handle network failures gracefully

```javascript
{
  validation: {
    async custom(value) {
      try {
        const response = await fetch(`/api/validate?value=${value}`);
        if (!response.ok) throw new Error('Validation failed');
        
        const result = await response.json();
        return result.valid ? true : result.message;
      } catch (error) {
        // Don't block form on network error
        console.error('Validation error:', error);
        return true; // Allow submission, server will validate
      }
    }
  }
}
```

---

## Performance Optimization

### Debounce Expensive Operations

**✅ DO:** Debounce validation and API calls

```javascript
// FormView automatically debounces validation by 300ms
{
  validation: {
    async custom(value) {
      // This will only run 300ms after user stops typing
      return await checkAvailability(value);
    }
  }
}

// For custom debouncing
import { debounce } from '@core/utils/Utils.js';

const searchUsers = debounce(async (query) => {
  const response = await fetch(`/api/search?q=${query}`);
  return response.json();
}, 500);
```

### Lazy Load Advanced Inputs

**✅ DO:** Import advanced components only when needed

```javascript
class DynamicForm extends FormView {
  async onInit() {
    await super.onInit();
    
    // Only load TagInput if field is used
    if (this.needsTagInput) {
      const { TagInput } = await import('@core/forms/inputs/index.js');
      this.tagInput = new TagInput({
        containerId: 'tags-container',
        name: 'tags'
      });
      this.addChild(this.tagInput);
    }
  }
}
```

### Avoid Re-rendering Forms

**✅ DO:** Update field values without re-rendering

```javascript
// Good: Update values directly
form.setFieldValue('username', 'newvalue');
form.setFieldValue('email', 'new@example.com');

// Bad: Re-render entire form
form.render(); // Expensive!
```

---

## Accessibility

### Proper Labels

**✅ DO:** Always provide labels

```javascript
{
  type: 'text',
  name: 'email',
  label: 'Email Address', // Required for screen readers
  placeholder: 'you@example.com'
}
```

**❌ DON'T:** Use placeholders as labels

```javascript
// Bad: Screen readers can't see placeholders consistently
{
  type: 'text',
  name: 'email',
  placeholder: 'Email Address' // Not a label!
}
```

### Help Text

**✅ DO:** Provide helpful instructions

```javascript
{
  type: 'password',
  name: 'password',
  label: 'Password',
  help: 'Must be at least 8 characters with uppercase, lowercase, and number',
  required: true
}
```

### Keyboard Navigation

**✅ DO:** Ensure tab order is logical

```javascript
// Fields render in order defined
fields: [
  { type: 'text', name: 'first_name' },  // Tab 1
  { type: 'text', name: 'last_name' },   // Tab 2
  { type: 'email', name: 'email' },      // Tab 3
  { type: 'submit', name: 'submit' }     // Tab 4
]
```

### Error Announcements

**✅ DO:** Use ARIA attributes for errors

```javascript
// FormView automatically adds aria-invalid and aria-describedby
// when validation fails

// Custom error display
class AccessibleForm extends FormView {
  displayErrors(errors) {
    super.displayErrors(errors);
    
    // Announce errors to screen readers
    const errorCount = Object.keys(errors).length;
    const announcement = `Form has ${errorCount} error${errorCount !== 1 ? 's' : ''}`;
    
    this.announceToScreenReader(announcement);
  }
  
  announceToScreenReader(message) {
    const live = document.createElement('div');
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    live.className = 'sr-only';
    live.textContent = message;
    document.body.appendChild(live);
    
    setTimeout(() => live.remove(), 1000);
  }
}
```

---

## Security Considerations

### CSRF Protection

**✅ DO:** Include CSRF tokens in forms

```javascript
{
  formConfig: {
    fields: [
      { type: 'hidden', name: 'csrf_token', value: window.csrfToken },
      // ... other fields
    ]
  }
}

// Server validation
app.post('/api/submit', (req, res) => {
  if (req.body.csrf_token !== req.session.csrfToken) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  // Process...
});
```

### Sanitize User Input

**✅ DO:** Always sanitize on server

```javascript
// Client: Display user data safely
form.on('submit', async (data) => {
  // Don't trust client-side sanitization!
  await fetch('/api/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
});

// Server: Sanitize all inputs
const sanitizeHtml = require('sanitize-html');

app.post('/api/submit', (req, res) => {
  const clean = {
    name: sanitizeHtml(req.body.name, { allowedTags: [] }),
    bio: sanitizeHtml(req.body.bio, { allowedTags: ['b', 'i', 'em', 'strong'] })
  };
  // Save clean data
});
```

### File Upload Validation

**✅ DO:** Validate file types and sizes

```javascript
{
  type: 'file',
  name: 'document',
  accept: '.pdf,.doc,.docx',
  validation: {
    custom: (files) => {
      if (!files || files.length === 0) return true;
      
      const file = files[0];
      const maxSize = 5 * 1024 * 1024; // 5MB
      
      if (file.size > maxSize) {
        return 'File must be less than 5MB';
      }
      
      const allowedTypes = ['application/pdf', 'application/msword'];
      if (!allowedTypes.includes(file.type)) {
        return 'Only PDF and Word documents allowed';
      }
      
      return true;
    }
  }
}

// Server: ALWAYS validate files
app.post('/api/upload', upload.single('document'), (req, res) => {
  const file = req.file;
  
  // Check file type by content (magic bytes), not extension
  if (!isValidPDF(file.buffer)) {
    return res.status(400).json({ error: 'Invalid file type' });
  }
  
  // Scan for viruses
  // Check file size
  // Sanitize filename
  // Store securely
});
```

### Sensitive Data

**❌ DON'T:** Store sensitive data in localStorage/sessionStorage

```javascript
// Bad: Storing passwords client-side
localStorage.setItem('password', formData.password); // Never!

// Bad: Storing credit cards
sessionStorage.setItem('ccNumber', formData.cc_number); // Never!
```

**✅ DO:** Use proper authentication flow

```javascript
// Good: Submit credentials securely
form.on('submit', async (data) => {
  const response = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: data.username,
      password: data.password // Sent over HTTPS only
    })
  });
  
  const { token } = await response.json();
  localStorage.setItem('authToken', token); // Store token, not password
});
```

---

## Advanced Patterns

### Multi-Step Forms (Wizards)

```javascript
class WizardForm extends View {
  async onInit() {
    await super.onInit();
    
    this.currentStep = 1;
    this.totalSteps = 3;
    
    this.steps = [
      new FormView({
        containerId: 'step-1',
        formConfig: { fields: this.getStep1Fields() }
      }),
      new FormView({
        containerId: 'step-2',
        formConfig: { fields: this.getStep2Fields() }
      }),
      new FormView({
        containerId: 'step-3',
        formConfig: { fields: this.getStep3Fields() }
      })
    ];
    
    this.steps.forEach(step => this.addChild(step));
  }
  
  async nextStep() {
    const currentForm = this.steps[this.currentStep - 1];
    const { isValid, errors } = await currentForm.validate();
    
    if (!isValid) {
      currentForm.displayErrors(errors);
      return;
    }
    
    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
      this.updateStepVisibility();
    } else {
      await this.submitAllSteps();
    }
  }
  
  async submitAllSteps() {
    const allData = {};
    for (const step of this.steps) {
      Object.assign(allData, await step.getFormData());
    }
    
    // Submit combined data
    await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(allData)
    });
  }
}
```

### Auto-Save Forms

```javascript
class AutoSaveForm extends FormView {
  async onInit() {
    await super.onInit();
    
    // Debounced auto-save
    this.autoSave = debounce(async () => {
      const { isValid } = await this.validate();
      if (isValid) {
        const data = await this.getFormData();
        await this.model.save(data, { silent: true });
        this.showToast('Draft saved');
      }
    }, 2000);
    
    // Listen for any field change
    this.element.addEventListener('input', () => this.autoSave());
  }
  
  showToast(message) {
    // Show brief notification
    Toast.show({ message, duration: 2000 });
  }
}
```

---

## Checklist for Production Forms

Before deploying forms to production, verify:

- [ ] All required fields have `required: true`
- [ ] Email fields use `type: 'email'` with validation
- [ ] Passwords have minimum length and complexity rules
- [ ] File uploads specify `accept` types and size limits
- [ ] Large files use `fileMode: 'multipart'`
- [ ] Forms include CSRF tokens
- [ ] Async validation handles network errors
- [ ] Error messages are user-friendly
- [ ] All fields have proper labels (not just placeholders)
- [ ] Help text provides clear instructions
- [ ] Tab order is logical
- [ ] Form works without JavaScript (progressive enhancement)
- [ ] Server validates all inputs
- [ ] Sensitive data never stored client-side
- [ ] Form accessible via keyboard
- [ ] Form tested with screen readers
- [ ] Mobile responsive (proper `colClass` usage)
- [ ] Loading states shown during submission
- [ ] Success/error feedback after submission

---

## Related Documentation

- [README.md](./README.md) - Getting started with forms
- [FormView.md](./FormView.md) - Complete FormView API reference
- [FieldTypes.md](./FieldTypes.md) - All basic field types
- [inputs/README.md](./inputs/README.md) - Advanced input components

---

## Summary

**Key Takeaways:**

1. **Use model binding** for automatic data sync
2. **Understand data priority**: data > model > field.value
3. **Choose correct file mode**: multipart for large files
4. **Create child forms in onInit()** with addChild()
5. **Validate on client AND server** for security
6. **Provide helpful error messages** and instructions
7. **Use responsive grid** with Bootstrap column classes
8. **Debounce expensive operations** like async validation
9. **Always sanitize user input** on the server
10. **Test accessibility** with keyboard and screen readers

Following these patterns will help you build robust, user-friendly, and secure forms with WEB-MOJO.
