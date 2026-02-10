# TagInput Component

The TagInput component provides a user-friendly interface for entering multiple values as tags (chips). Users can add tags by typing and pressing Enter, and remove them by clicking the × button.

**Field Type:** `tag` or `tags`

---

## Quick Start

```javascript
{
  type: 'tag',
  name: 'skills',
  label: 'Skills',
  placeholder: 'Type a skill and press Enter...',
  maxTags: 10,
  allowDuplicates: false
}
```

---

## Configuration Options

### Basic Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | string | **required** | Field name |
| `label` | string | - | Field label |
| `placeholder` | string | `'Add tags...'` | Placeholder text |
| `value` | array/string | `[]` | Initial tags |
| `separator` | string | `','` | Separator for parsing string values |

### Constraints

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxTags` | number | `50` | Maximum number of tags |
| `allowDuplicates` | boolean | `false` | Allow duplicate tags |
| `required` | boolean | `false` | Require at least one tag |
| `minTags` | number | - | Minimum number of tags (validation) |

### Behavior

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `disabled` | boolean | `false` | Disable input |
| `readonly` | boolean | `false` | Make read-only |
| `autocomplete` | array | `[]` | Autocomplete suggestions |
| `caseSensitive` | boolean | `false` | Case-sensitive duplicate check |

### Styling

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `tagClass` | string | `'badge bg-primary'` | CSS classes for tags |
| `inputClass` | string | `'form-control'` | CSS classes for input |
| `containerClass` | string | - | CSS classes for container |

---

## Usage Examples

### Basic Tag Input

```javascript
{
  type: 'tag',
  name: 'keywords',
  label: 'Keywords',
  placeholder: 'Add keywords...',
  help: 'Press Enter or comma to add tags'
}
```

### With Maximum Tags

```javascript
{
  type: 'tag',
  name: 'skills',
  label: 'Top Skills',
  maxTags: 5,
  placeholder: 'Add up to 5 skills...',
  help: 'Choose your top 5 skills'
}
```

### With Autocomplete

```javascript
{
  type: 'tag',
  name: 'technologies',
  label: 'Technologies',
  placeholder: 'Type to see suggestions...',
  autocomplete: [
    'JavaScript',
    'Python',
    'Java',
    'C++',
    'Go',
    'Rust',
    'TypeScript'
  ]
}
```

### Pre-filled Tags

```javascript
{
  type: 'tag',
  name: 'categories',
  label: 'Categories',
  value: ['Tech', 'Design', 'Business'] // Initial tags
}
```

### Allow Duplicates

```javascript
{
  type: 'tag',
  name: 'items',
  label: 'Shopping List',
  allowDuplicates: true, // Can add "Milk" multiple times
  help: 'Add items (duplicates allowed for quantities)'
}
```

### Custom Styling

```javascript
{
  type: 'tag',
  name: 'labels',
  label: 'Labels',
  tagClass: 'badge bg-success', // Green tags
  placeholder: 'Add labels...'
}
```

### String Value (Comma-Separated)

```javascript
{
  type: 'tag',
  name: 'emails',
  label: 'Email Recipients',
  value: 'john@example.com,jane@example.com', // String will be split
  separator: ',',
  placeholder: 'Add email addresses...'
}
```

---

## Value Format

### Input Value

TagInput accepts two formats:

**Array (recommended):**
```javascript
value: ['tag1', 'tag2', 'tag3']
```

**String (comma-separated):**
```javascript
value: 'tag1,tag2,tag3'
separator: ',' // Default separator
```

### Output Value

`getFormData()` returns an array:
```javascript
const data = await form.getFormData();
console.log(data.skills); // ['JavaScript', 'Python', 'Go']
```

To get as string:
```javascript
const skills = data.skills.join(', ');
// "JavaScript, Python, Go"
```

---

## Validation

### Required Tags

```javascript
{
  type: 'tag',
  name: 'skills',
  label: 'Skills',
  required: true, // At least one tag required
  validation: {
    minTags: 3,
    custom: (tags) => {
      if (tags.length < 3) {
        return 'Please add at least 3 skills';
      }
      return true;
    }
  }
}
```

### Tag Format Validation

```javascript
{
  type: 'tag',
  name: 'emails',
  label: 'Email Addresses',
  validation: {
    custom: (tags) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      for (const tag of tags) {
        if (!emailRegex.test(tag)) {
          return `"${tag}" is not a valid email address`;
        }
      }
      return true;
    }
  }
}
```

### Max Tags Validation

```javascript
{
  type: 'tag',
  name: 'categories',
  label: 'Categories',
  maxTags: 5, // Enforced in UI
  validation: {
    maxTags: 5, // Also validated on submit
    custom: (tags) => {
      if (tags.length > 5) {
        return 'Maximum 5 categories allowed';
      }
      return true;
    }
  }
}
```

---

## Events

TagInput emits events through FormView:

### Tag Added
```javascript
form.on('field:change:skills', (value) => {
  console.log('Tags updated:', value);
  // ['JavaScript', 'Python']
});
```

### Tag Removed
```javascript
form.on('field:change:skills', (value, previousValue) => {
  const removed = previousValue.filter(tag => !value.includes(tag));
  console.log('Tag removed:', removed);
});
```

### Max Tags Reached
```javascript
const tagInput = form.getChildView('skills');
tagInput.on('maxTags:reached', () => {
  Toast.show({
    message: 'Maximum tags reached',
    type: 'warning'
  });
});
```

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Enter` | Add current input as tag |
| `Comma (,)` | Add current input as tag (default) |
| `Backspace` | Remove last tag (when input is empty) |
| `Escape` | Clear current input |
| `Tab` | Add current input and move to next field |

### Custom Separators

```javascript
{
  type: 'tag',
  name: 'items',
  label: 'Items',
  separator: ';', // Use semicolon instead of comma
  help: 'Press Enter or semicolon to add'
}
```

---

## Autocomplete

### Static Suggestions

```javascript
{
  type: 'tag',
  name: 'languages',
  label: 'Programming Languages',
  autocomplete: [
    'JavaScript', 'TypeScript', 'Python', 'Java',
    'C++', 'Go', 'Rust', 'PHP', 'Ruby', 'Swift'
  ],
  placeholder: 'Start typing to see suggestions...'
}
```

### Dynamic Suggestions (Async)

```javascript
{
  type: 'tag',
  name: 'users',
  label: 'Mention Users',
  autocomplete: async (query) => {
    const response = await fetch(`/api/users/search?q=${query}`);
    const users = await response.json();
    return users.map(u => u.username);
  },
  placeholder: 'Type @ to mention users...'
}
```

---

## Integration with Model

### Model Binding

```javascript
const article = new Model({
  title: 'My Article',
  tags: ['Tech', 'Programming', 'JavaScript']
});

const form = new FormView({
  model: article,
  formConfig: {
    fields: [
      { type: 'text', name: 'title', label: 'Title' },
      { type: 'tag', name: 'tags', label: 'Tags' }
    ]
  }
});

// Tags automatically populated from model
// On submit, model.tags updated with new tags
```

### Saving Tags

```javascript
form.on('submit', async (data) => {
  // data.tags is an array
  await fetch('/api/articles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: data.title,
      tags: data.tags // ['JavaScript', 'Web Dev']
    })
  });
});
```

---

## Styling Customization

### Custom Tag Colors

```javascript
{
  type: 'tag',
  name: 'status_tags',
  label: 'Status',
  tagClass: 'badge bg-info',
  value: ['Active', 'In Progress']
}
```

### Tag Size Variants

```css
/* Small tags */
.tag-input .tag-sm {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
}

/* Large tags */
.tag-input .tag-lg {
  font-size: 1rem;
  padding: 0.5rem 0.75rem;
}
```

```javascript
{
  type: 'tag',
  name: 'keywords',
  label: 'Keywords',
  tagClass: 'badge bg-primary tag-sm'
}
```

### Custom Remove Button

```css
.tag-input .tag .remove-btn {
  cursor: pointer;
  margin-left: 0.5rem;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.tag-input .tag .remove-btn:hover {
  opacity: 1;
}
```

---

## Accessibility

TagInput is fully accessible:

- ✅ Keyboard navigation (Tab, Enter, Backspace)
- ✅ ARIA labels for screen readers
- ✅ Focus management
- ✅ Announced tag additions/removals

### ARIA Attributes

```html
<input type="text" 
       role="combobox"
       aria-label="Add tags"
       aria-autocomplete="list"
       aria-expanded="false">
       
<span class="tag" role="option">
  JavaScript
  <button aria-label="Remove JavaScript tag">×</button>
</span>
```

---

## Common Patterns

### Email Recipients

```javascript
{
  type: 'tag',
  name: 'recipients',
  label: 'To',
  placeholder: 'Add email addresses...',
  validation: {
    custom: (tags) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const invalid = tags.filter(tag => !emailRegex.test(tag));
      if (invalid.length > 0) {
        return `Invalid email(s): ${invalid.join(', ')}`;
      }
      return true;
    }
  }
}
```

### Hashtags

```javascript
{
  type: 'tag',
  name: 'hashtags',
  label: 'Hashtags',
  placeholder: 'Add hashtags...',
  tagClass: 'badge bg-info',
  validation: {
    custom: (tags) => {
      // Ensure all tags start with #
      return tags.every(tag => tag.startsWith('#')) || 
             'All hashtags must start with #';
    }
  }
}
```

### Skills with Categories

```javascript
{
  type: 'tag',
  name: 'skills',
  label: 'Skills',
  autocomplete: {
    'Frontend': ['React', 'Vue', 'Angular', 'HTML', 'CSS'],
    'Backend': ['Node.js', 'Python', 'Java', 'Go'],
    'Database': ['MongoDB', 'PostgreSQL', 'MySQL']
  },
  placeholder: 'Add your skills...',
  maxTags: 10
}
```

---

## Troubleshooting

### Tags Not Appearing
```javascript
// ❌ Wrong: Missing containerId
{ type: 'tag', name: 'skills' }

// ✅ Correct: Used in FormView (containerId handled automatically)
const form = new FormView({
  formConfig: {
    fields: [{ type: 'tag', name: 'skills' }]
  }
});
```

### Duplicates Not Prevented
```javascript
// ❌ Wrong: Default allows duplicates
{ type: 'tag', name: 'items' }

// ✅ Correct: Explicitly disable duplicates
{ type: 'tag', name: 'items', allowDuplicates: false }
```

### Value Not Updating
```javascript
// ❌ Wrong: Direct DOM manipulation
document.querySelector('[name="skills"]').value = 'new,tags';

// ✅ Correct: Use FormView API
form.setFieldValue('skills', ['new', 'tags']);
```

---

## Related Documentation

- [inputs/README.md](./README.md) - Advanced inputs overview
- [FieldTypes.md](../FieldTypes.md) - Master quick reference
- [FormView.md](../FormView.md) - FormView API
- [Validation.md](../Validation.md) - Validation system
