# Form Validation

Complete guide to validating forms in WEB-MOJO. Learn about client-side validation, server-side integration, and custom validators.

---

## Quick Start

```javascript
{
  type: 'email',
  name: 'email',
  label: 'Email',
  required: true,
  validation: {
    email: true,
    custom: (value) => {
      return value.includes('@company.com') || 'Must be a company email';
    }
  }
}
```

---

## Validation Levels

### 1. HTML5 Validation

Native browser validation (instant feedback):

```javascript
{
  type: 'text',
  name: 'username',
  required: true,        // HTML5 required attribute
  minlength: 3,          // HTML5 minlength
  maxlength: 20,         // HTML5 maxlength
  pattern: '[a-zA-Z0-9]+'  // HTML5 pattern
}
```

**Pros:** Instant feedback, no JavaScript  
**Cons:** Can be bypassed, inconsistent browser styling

### 2. FormView Validation

JavaScript validation on submit:

```javascript
{
  type: 'email',
  name: 'email',
  validation: {
    required: true,
    email: true,
    custom: (value) => value.endsWith('@company.com') || 'Invalid domain'
  }
}
```

**Pros:** Consistent, powerful, prevents submission  
**Cons:** Runs on submit only (unless configured otherwise)

### 3. Server-Side Validation

Always validate on the server:

```javascript
// Client
form.on('submit', async (data) => {
  const response = await fetch('/api/users', {
    method: 'POST',
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    const errors = await response.json();
    form.displayErrors(errors.errors); // Show server errors
  }
});
```

---

## Built-in Validators

### Required

```javascript
{
  validation: {
    required: true,
    requiredMessage: 'This field is required'
  }
}
```

### Email

```javascript
{
  validation: {
    email: true,
    emailMessage: 'Invalid email address'
  }
}
```

### String Length

```javascript
{
  validation: {
    minLength: 8,
    maxLength: 100,
    minLengthMessage: 'Must be at least 8 characters',
    maxLengthMessage: 'Must be less than 100 characters'
  }
}
```

### Numeric Range

```javascript
{
  validation: {
    min: 18,
    max: 120,
    minMessage: 'Must be at least 18',
    maxMessage: 'Must be less than 120'
  }
}
```

### Pattern (Regex)

```javascript
{
  validation: {
    pattern: /^[A-Z0-9-]+$/,
    patternMessage: 'Only uppercase letters, numbers, and hyphens allowed'
  }
}
```

---

## Custom Validation

### Synchronous Validator

```javascript
{
  validation: {
    custom: (value) => {
      if (value.length < 8) {
        return 'Password must be at least 8 characters';
      }
      if (!/[A-Z]/.test(value)) {
        return 'Password must contain an uppercase letter';
      }
      if (!/[0-9]/.test(value)) {
        return 'Password must contain a number';
      }
      return true; // Valid
    }
  }
}
```

### Async Validator

```javascript
{
  validation: {
    async custom(value) {
      if (!value) return true; // Skip if empty (use required separately)
      
      const response = await fetch(`/api/check-username?username=${value}`);
      const { available } = await response.json();
      
      return available || 'Username already taken';
    }
  }
}
```

### Multiple Validators

```javascript
{
  validation: {
    required: true,
    minLength: 3,
    maxLength: 20,
    pattern: /^[a-zA-Z0-9_]+$/,
    custom: async (value) => {
      // All built-in validators run first
      // Custom runs only if those pass
      const available = await checkAvailability(value);
      return available || 'Already in use';
    }
  }
}
```

---

## Cross-Field Validation

Validate fields against each other:

```javascript
class MyForm extends FormView {
  async validate() {
    const { isValid, errors } = await super.validate();
    
    if (isValid) {
      const data = await this.getFormData();
      
      // Password confirmation
      if (data.password !== data.confirm_password) {
        errors.confirm_password = ['Passwords do not match'];
        return { isValid: false, errors };
      }
      
      // Date range
      if (new Date(data.end_date) < new Date(data.start_date)) {
        errors.end_date = ['End date must be after start date'];
        return { isValid: false, errors };
      }
    }
    
    return { isValid, errors };
  }
}
```

---

## Validation Timing

### On Submit (Default)

```javascript
form.on('submit', async (data, event) => {
  const { isValid, errors } = await form.validate();
  if (!isValid) {
    form.displayErrors(errors);
    return;
  }
  // Process form
});
```

### On Blur

```javascript
form.on('field:blur', async (fieldName) => {
  const value = form.getFieldValue(fieldName);
  const field = form.fields.find(f => f.name === fieldName);
  
  if (field.validation) {
    const error = await validateField(field, value);
    if (error) {
      form.displayFieldError(fieldName, error);
    }
  }
});
```

### Real-time (On Change)

```javascript
form.on('field:change', async (fieldName, value) => {
  // Debounce expensive validations
  clearTimeout(this.validationTimeout);
  this.validationTimeout = setTimeout(async () => {
    const field = form.fields.find(f => f.name === fieldName);
    if (field.validation) {
      const error = await validateField(field, value);
      form.displayFieldError(fieldName, error);
    }
  }, 500);
});
```

---

## Displaying Errors

### Single Field Error

```javascript
form.displayFieldError('email', 'Invalid email address');
```

### Multiple Errors

```javascript
form.displayErrors({
  email: ['Invalid email address'],
  username: ['Username already taken'],
  password: ['Password too weak']
});
```

### Clear Errors

```javascript
// Clear all errors
form.clearAllErrors();

// Clear specific field
form.clearFieldError('email');
```

---

## Server-Side Integration

### Error Response Format

Server should return errors in this format:

```json
{
  "status": "error",
  "errors": {
    "email": ["Email already registered"],
    "username": ["Username contains invalid characters", "Username too short"]
  }
}
```

### Handling Server Errors

```javascript
form.on('submit', async (data) => {
  try {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const result = await response.json();
      
      if (result.errors) {
        // Display field errors
        form.displayErrors(result.errors);
      } else {
        // Show general error
        Toast.show({ message: result.message || 'Error occurred', type: 'error' });
      }
      return;
    }
    
    // Success
    Toast.show({ message: 'Saved successfully', type: 'success' });
    
  } catch (error) {
    console.error('Submit error:', error);
    Toast.show({ message: 'Network error', type: 'error' });
  }
});
```

---

## Common Validation Patterns

### Email Format

```javascript
{
  validation: {
    email: true,
    custom: (value) => {
      return value.endsWith('@company.com') || 'Must use company email';
    }
  }
}
```

### Password Strength

```javascript
{
  validation: {
    minLength: 8,
    custom: (value) => {
      const checks = {
        length: value.length >= 8,
        uppercase: /[A-Z]/.test(value),
        lowercase: /[a-z]/.test(value),
        number: /[0-9]/.test(value),
        special: /[!@#$%^&*]/.test(value)
      };
      
      const passed = Object.values(checks).filter(Boolean).length;
      if (passed < 4) {
        return 'Password must include uppercase, lowercase, number, and special character';
      }
      return true;
    }
  }
}
```

### Phone Number

```javascript
{
  validation: {
    pattern: /^\(\d{3}\) \d{3}-\d{4}$/,
    patternMessage: 'Format: (555) 123-4567'
  }
}
```

### URL Format

```javascript
{
  validation: {
    custom: (value) => {
      try {
        new URL(value);
        return value.startsWith('https://') || 'URL must use HTTPS';
      } catch {
        return 'Invalid URL format';
      }
    }
  }
}
```

### Credit Card (Luhn Algorithm)

```javascript
{
  validation: {
    custom: (value) => {
      const cleaned = value.replace(/\s/g, '');
      if (!/^\d{13,19}$/.test(cleaned)) {
        return 'Invalid card number format';
      }
      
      // Luhn algorithm
      let sum = 0;
      let isEven = false;
      for (let i = cleaned.length - 1; i >= 0; i--) {
        let digit = parseInt(cleaned[i]);
        if (isEven) {
          digit *= 2;
          if (digit > 9) digit -= 9;
        }
        sum += digit;
        isEven = !isEven;
      }
      
      return sum % 10 === 0 || 'Invalid card number';
    }
  }
}
```

---

## Validation with Models

FormView automatically uses model validation:

```javascript
class User extends Model {
  validate(attributes) {
    const errors = {};
    
    if (!attributes.email || !attributes.email.includes('@')) {
      errors.email = 'Invalid email';
    }
    
    if (!attributes.username || attributes.username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    }
    
    return Object.keys(errors).length > 0 ? errors : null;
  }
}

// FormView calls model.validate() automatically
const form = new FormView({
  model: user,
  formConfig: { fields: [...] }
});

form.on('submit', async () => {
  // model.validate() runs automatically
  await form.handleSubmit();
});
```

---

## Best Practices

### ✅ DO

- Always validate on the server
- Provide clear, actionable error messages
- Use HTML5 validation for instant feedback
- Debounce expensive async validations
- Show errors near the relevant field
- Allow users to correct and resubmit easily

### ❌ DON'T

- Don't rely only on client-side validation (security)
- Don't show generic errors like "Invalid input"
- Don't validate on every keystroke (performance)
- Don't block form submission during validation
- Don't forget to clear errors on correction

---

## Troubleshooting

### Validation Not Running

```javascript
// ❌ Wrong: Not calling validate()
form.on('submit', async (data) => {
  await saveData(data); // No validation!
});

// ✅ Correct: Validate before processing
form.on('submit', async (data) => {
  const { isValid, errors } = await form.validate();
  if (!isValid) {
    form.displayErrors(errors);
    return;
  }
  await saveData(data);
});
```

### Async Validation Not Working

```javascript
// ❌ Wrong: Not awaiting async validator
form.on('submit', (data) => {
  form.validate(); // Returns Promise, not waited!
  saveData(data);
});

// ✅ Correct: Await validation
form.on('submit', async (data) => {
  const { isValid } = await form.validate();
  if (isValid) {
    await saveData(data);
  }
});
```

---

## Related Documentation

- [FormView.md](./FormView.md) - FormView API reference
- [BestPractices.md](./BestPractices.md) - Form best practices
- [FieldTypes.md](./FieldTypes.md) - Field type reference
- Model documentation - Model validation methods
