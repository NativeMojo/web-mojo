# MOJOUtils

**MOJOUtils** is a static utility class providing core helper functions used throughout the WEB-MOJO framework. It covers template context resolution, deep object manipulation, debouncing/throttling, HTML escaping, ID generation, query string parsing, password utilities, and the `DataWrapper` proxy used internally by the template engine.

---

## Table of Contents

- [Overview](#overview)
- [Context & Template Helpers](#context--template-helpers)
  - [getContextData()](#getcontextdata)
  - [getNestedValue()](#getnestedvalue)
  - [wrapData()](#wrapdata)
- [Object Utilities](#object-utilities)
  - [deepClone()](#deepclone)
  - [deepMerge()](#deepmerge)
  - [isObject()](#isobject)
  - [isNullOrUndefined()](#isnullOrundefined)
- [Function Utilities](#function-utilities)
  - [debounce()](#debounce)
  - [throttle()](#throttle)
- [ID Generation](#id-generation)
  - [generateId()](#generateid)
- [String Utilities](#string-utilities)
  - [escapeHtml()](#escapehtml)
- [Query String Utilities](#query-string-utilities)
  - [parseQueryString()](#parsequerystring)
  - [toQueryString()](#toquerystring)
- [Password Utilities](#password-utilities)
  - [checkPasswordStrength()](#checkpasswordstrength)
  - [generatePassword()](#generatepassword)
- [DataWrapper](#datawrapper)
- [API Reference](#api-reference)
- [Common Patterns](#common-patterns)
- [Related Documentation](#related-documentation)

---

## Overview

`MOJOUtils` is used internally by the framework's template engine, form system, and view layer. Most developers will interact with it indirectly — through templates, formatters, and the `DataWrapper` proxy — rather than calling it directly.

However, several utilities (debounce, deepClone, generateId, password helpers, query string parsing) are broadly useful in application code and are documented fully here.

All methods are **static** — you never need to instantiate `MOJOUtils`.

```js
import MOJOUtils from 'web-mojo/utils/MOJOUtils';

const id = MOJOUtils.generateId();
const clone = MOJOUtils.deepClone(myObject);
const debouncedSearch = MOJOUtils.debounce(search, 300);
```

---

## Context & Template Helpers

These methods power the Mustache template rendering pipeline. They are called automatically by the framework during `renderTemplate()`.

### `getContextData(context, path)`

Resolves a dot-separated path string against a context object, parsing pipe formatters embedded in the path. This is the core of how `{{model.user.name|capitalize}}` works in templates.

```js
MOJOUtils.getContextData(view, 'model.price|currency');
// → runs the 'currency' formatter on view.model.price

MOJOUtils.getContextData(view, 'items|bool');
// → runs the 'bool' formatter on view.items
```

**How it works:**

1. Splits the path on `|` to separate the property path from formatter pipes
2. Resolves the property path via `getNestedValue()`
3. Applies each pipe formatter in sequence via `DataFormatter.pipe()`
4. Returns the final formatted value

> ⚠️ **Framework-internal** — you do not call this directly. It is invoked automatically by the Mustache rendering layer (`MustacheFormatter`).

---

### `getNestedValue(context, path)`

Resolves a dot-separated path against an object, with special handling for MOJO `Model` instances (calls `model.get(key)` instead of direct property access), `Collection` instances, and arrays.

```js
const user = { profile: { name: 'Jane', address: { city: 'Austin' } } };

MOJOUtils.getNestedValue(user, 'profile.name');
// → 'Jane'

MOJOUtils.getNestedValue(user, 'profile.address.city');
// → 'Austin'

MOJOUtils.getNestedValue(user, 'profile.missing.deep');
// → undefined  (does not throw)
```

**Special handling:**

- **Model instances** — uses `model.get(key)` for each path segment
- **Arrays** — can access array items by index (`items.0.name`)
- **Safe traversal** — returns `undefined` rather than throwing on missing intermediate keys
- **Context recursion** — if a segment resolves to an object with a `getContextValue()` method (a `DataWrapper`), delegates to that method

```js
// With a MOJO Model
const model = new User({ id: 1, name: 'Alice' });
MOJOUtils.getNestedValue({ model }, 'model.name');
// → 'Alice'  (calls model.get('name') internally)
```

---

### `wrapData(data, parentContext)`

Wraps a plain object or array in a `DataWrapper` proxy so that nested property access and formatter pipes work correctly when the object is used as a Mustache template context.

```js
const wrapped = MOJOUtils.wrapData({ price: 49.99, name: 'Widget' }, viewContext);

// Inside a template, when {{.price|currency}} is rendered:
wrapped.getContextValue('price|currency');
// → '$49.99'
```

> ⚠️ **Framework-internal** — called automatically by `View.getContextValue()` when resolving `model.*` and `data.*` paths that return objects. You do not call this directly.

---

## Object Utilities

### `deepClone(obj)`

Creates a deep clone of an object or array. Uses `structuredClone()` when available, with a JSON-based fallback for environments that don't support it.

```js
const original = { user: { name: 'Alice', tags: ['admin', 'user'] } };
const clone = MOJOUtils.deepClone(original);

clone.user.name = 'Bob';
clone.user.tags.push('superuser');

console.log(original.user.name);     // 'Alice'  — not mutated
console.log(original.user.tags);     // ['admin', 'user']  — not mutated
```

**Limitations:**

- Functions, `undefined` values, circular references, and non-serializable types (e.g. `Map`, `Set`, `Date` in the JSON fallback) may not clone correctly in all environments
- Use `structuredClone()` directly for complex types if you need guaranteed fidelity

---

### `deepMerge(target, source)`

Recursively merges `source` into `target`. Plain objects are merged deeply; all other values (arrays, primitives, class instances) are replaced by the source value.

```js
const base = {
  api: { baseURL: 'https://api.example.com', timeout: 30000 },
  debug: false
};

const overrides = {
  api: { timeout: 5000, headers: { 'X-Custom': 'value' } },
  debug: true
};

const config = MOJOUtils.deepMerge({}, base);
MOJOUtils.deepMerge(config, overrides);

// Result:
// {
//   api: { baseURL: 'https://api.example.com', timeout: 5000, headers: { 'X-Custom': 'value' } },
//   debug: true
// }
```

**Notes:**

- Mutates `target` in place and also returns it
- Arrays are **replaced**, not merged (source array replaces target array)
- Use `deepClone` on the target first if you need a non-mutating merge

---

### `isObject(value)`

Returns `true` if the value is a plain object (not `null`, not an array, not a class instance).

```js
MOJOUtils.isObject({});             // true
MOJOUtils.isObject({ a: 1 });       // true
MOJOUtils.isObject(null);           // false
MOJOUtils.isObject([1, 2, 3]);      // false
MOJOUtils.isObject('string');       // false
MOJOUtils.isObject(new Date());     // false
MOJOUtils.isObject(new MyClass());  // false
```

Used internally by `deepMerge()` to determine whether to recurse into a value.

---

### `isNullOrUndefined(value)`

Returns `true` if the value is `null` or `undefined`.

```js
MOJOUtils.isNullOrUndefined(null);      // true
MOJOUtils.isNullOrUndefined(undefined); // true
MOJOUtils.isNullOrUndefined(0);         // false
MOJOUtils.isNullOrUndefined('');        // false
MOJOUtils.isNullOrUndefined(false);     // false
```

---

## Function Utilities

### `debounce(fn, delay)`

Returns a debounced version of `fn` that delays invocation until `delay` milliseconds have elapsed since the last call. Useful for search inputs, resize handlers, and other high-frequency event sources.

```js
const debouncedSearch = MOJOUtils.debounce(async (query) => {
  const results = await rest.GET('/api/search', { q: query });
  this.results = results.data?.data || [];
  await this.render();
}, 300);

// In a template handler:
async onChangeSearchFilter(event, element) {
  debouncedSearch(element.value);
}
```

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `fn` | `function` | The function to debounce |
| `delay` | `number` | Milliseconds to wait after the last call before invoking |

**Returns:** A new function that debounces calls to `fn`.

Each call to the debounced function resets the timer. Only the **last** call within the delay window is actually executed.

---

### `throttle(fn, limit)`

Returns a throttled version of `fn` that can only be called at most once per `limit` milliseconds, regardless of how many times it is invoked.

```js
const throttledScroll = MOJOUtils.throttle(() => {
  this.scrollY = window.scrollY;
  this.render();
}, 100);

window.addEventListener('scroll', throttledScroll);
```

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `fn` | `function` | The function to throttle |
| `limit` | `number` | Minimum milliseconds between invocations |

**Returns:** A new function that throttles calls to `fn`.

Unlike `debounce`, `throttle` executes on the **first** call and then blocks further calls until the limit has passed.

**Debounce vs Throttle:**

| | Debounce | Throttle |
|---|---|---|
| Fires when | After activity *stops* | At a maximum *rate* during activity |
| Best for | Search inputs, resize | Scroll, mouse move, resize |
| Delay means | Waits this long after last call | Minimum time between calls |

---

## ID Generation

### `generateId()`

Generates a unique ID string combining a timestamp and a random suffix. Suitable for generating DOM IDs, temporary record keys, or correlation IDs.

```js
const id = MOJOUtils.generateId();
// → 'mojo_1709123456789_k7x2q'  (format: 'mojo_<timestamp>_<random>')
```

IDs are not guaranteed to be cryptographically unique — for security-sensitive use cases, use `crypto.randomUUID()` directly.

---

## String Utilities

### `escapeHtml(str)`

Escapes HTML special characters to prevent XSS when inserting user-provided text into HTML markup.

```js
MOJOUtils.escapeHtml('<script>alert("xss")</script>');
// → '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'

MOJOUtils.escapeHtml('5 > 3 & 2 < 4');
// → '5 &gt; 3 &amp; 2 &lt; 4'
```

**Characters escaped:**

| Character | Replacement |
|---|---|
| `&` | `&amp;` |
| `<` | `&lt;` |
| `>` | `&gt;` |
| `"` | `&quot;` |
| `'` | `&#x27;` |
| `/` | `&#x2F;` |
| `` ` `` | `&#x60;` |
| `=` | `&#x3D;` |

> **Note:** The Mustache template engine escapes values automatically in `{{double braces}}`. Use `{{{triple braces}}}` only when you are certain the content is safe HTML. Use `escapeHtml` explicitly when building HTML strings in JavaScript code.

---

## Query String Utilities

### `parseQueryString(queryString?)`

Parses a URL query string into a plain object. Defaults to `window.location.search` if no argument is provided.

```js
// Parse a specific query string
MOJOUtils.parseQueryString('?page=2&filter=active&tags=a&tags=b');
// → { page: '2', filter: 'active', tags: ['a', 'b'] }

// Parse the current URL's query string
const params = MOJOUtils.parseQueryString();
const page = params.page || '1';
```

**Notes:**

- Values are always strings (no automatic type coercion)
- Repeated keys are collected into arrays
- The leading `?` is handled automatically

---

### `toQueryString(params)`

Serializes a plain object into a URL query string.

```js
MOJOUtils.toQueryString({ page: 2, filter: 'active', sort: 'name' });
// → '?page=2&filter=active&sort=name'

MOJOUtils.toQueryString({ tags: ['a', 'b'], status: 'open' });
// → '?tags=a&tags=b&status=open'
```

Returns an empty string `''` if `params` is empty or nullish.

---

## Password Utilities

### `checkPasswordStrength(password)`

Analyses a password string and returns a detailed strength report. Used by the password field component and the `changePassword()` dialog.

```js
const result = MOJOUtils.checkPasswordStrength('MyP@ssw0rd!');

// Result shape:
{
  score:    4,         // 0–5 strength score
  strength: 'strong',  // 'very-weak' | 'weak' | 'fair' | 'strong' | 'very-strong'
  feedback: [],        // Array of suggestion strings

  details: {
    length:            true,   // >= 8 characters
    hasLowercase:      true,
    hasUppercase:      true,
    hasNumbers:        true,
    hasSpecialChars:   true,
    hasCommonPatterns: false,  // true = contains patterns like '1234', 'qwerty'
    isCommonPassword:  false   // true = in common password list
  }
}
```

**Strength Levels:**

| Score | Label | Description |
|---|---|---|
| 0–1 | `'very-weak'` | Very short or extremely simple |
| 2 | `'weak'` | Missing most complexity requirements |
| 3 | `'fair'` | Some complexity, room for improvement |
| 4 | `'strong'` | Meets most requirements |
| 5 | `'very-strong'` | Meets all requirements |

**Usage in a View:**

```js
async onChangePassword(event, element) {
  const password = element.value;
  const result = MOJOUtils.checkPasswordStrength(password);

  this.passwordStrength  = result.strength;
  this.passwordScore     = result.score;
  this.passwordFeedback  = result.feedback;
  await this.render();
}
```

---

### `generatePassword(options?)`

Generates a random password string meeting configurable complexity requirements.

```js
// Default — 16-character password with full complexity
const password = MOJOUtils.generatePassword();
// → 'K#9mP2xL!qR7vN0w'

// Custom options
const password = MOJOUtils.generatePassword({
  length:             20,
  includeLowercase:   true,
  includeUppercase:   true,
  includeNumbers:     true,
  includeSpecialChars: true,
  excludeAmbiguous:   true,   // Excludes 0, O, l, I, 1 etc.
  customChars:        ''       // Additional allowed characters
});
```

**Options:**

| Option | Type | Default | Description |
|---|---|---|---|
| `length` | `number` | `16` | Password length |
| `includeLowercase` | `boolean` | `true` | Include `a-z` |
| `includeUppercase` | `boolean` | `true` | Include `A-Z` |
| `includeNumbers` | `boolean` | `true` | Include `0-9` |
| `includeSpecialChars` | `boolean` | `true` | Include `!@#$%^&*` etc. |
| `excludeAmbiguous` | `boolean` | `false` | Exclude visually ambiguous characters (`0`, `O`, `l`, `I`, `1`) |
| `customChars` | `string` | `''` | Additional characters to include in the pool |

**Returns:** A randomly generated password string.

The generator guarantees at least one character from each enabled character class appears in the result.

**Usage:**

```js
class PasswordFieldView extends View {
  async onActionGeneratePassword(event, element) {
    const password = MOJOUtils.generatePassword({
      length:           20,
      excludeAmbiguous: true
    });
    const input = this.element.querySelector('input[name="password"]');
    input.value = password;

    // Show strength indicator
    this.strength = MOJOUtils.checkPasswordStrength(password);
    await this.render();
  }
}
```

---

## DataWrapper

`DataWrapper` is a special proxy class returned by `wrapData()`. It wraps a plain object or value and exposes a `getContextValue(path)` method that integrates with the Mustache formatter pipeline — enabling pipe formatters to work on nested model data in templates.

> ⚠️ **Framework-internal** — `DataWrapper` is instantiated automatically. You will encounter it when debugging template rendering, but you should not need to create or interact with it directly.

### How it works

When the template engine encounters a path like `model.address.city|uppercase`, it:

1. Calls `view.getContextValue('model.address.city|uppercase')`
2. `View.getContextValue` detects the path starts with `model.`
3. Retrieves `view.model` and, if it returns a plain object at `address`, wraps it in a `DataWrapper`
4. The `DataWrapper.getContextValue('city|uppercase')` is then called by Mustache
5. This resolves `city` from the wrapped data and applies the `uppercase` formatter

### Properties

A `DataWrapper` instance exposes all properties of the wrapped object directly (via `Object.defineProperty` for each key), plus:

| Method | Description |
|---|---|
| `getContextValue(path)` | Resolve a path with optional pipe formatters against the wrapped data |
| `has(key)` | Returns `true` if the wrapped data contains the key |
| `toJSON()` | Returns the underlying wrapped data for JSON serialisation |

### Example (debugging)

```js
// If you see a DataWrapper in console output:
const wrapped = MOJOUtils.wrapData({ price: 49.99, name: 'Widget' }, viewContext);

wrapped.getContextValue('price|currency'); // → '$49.99'
wrapped.has('price');                      // → true
wrapped.toJSON();                          // → { price: 49.99, name: 'Widget' }
```

---

## API Reference

### Static Methods

| Method | Parameters | Returns | Description |
|---|---|---|---|
| `getContextData(context, path)` | `context: object`, `path: string` | `any` | Resolve a path + formatters against a context |
| `getNestedValue(context, path)` | `context: object`, `path: string` | `any` | Resolve a dot-separated path against an object |
| `isNullOrUndefined(value)` | `value: any` | `boolean` | Test for null or undefined |
| `deepClone(obj)` | `obj: any` | `any` | Deep-clone an object or array |
| `deepMerge(target, source)` | `target: object`, `source: object` | `object` | Recursively merge source into target |
| `isObject(value)` | `value: any` | `boolean` | Test if value is a plain object |
| `debounce(fn, delay)` | `fn: function`, `delay: number` | `function` | Debounce a function |
| `throttle(fn, limit)` | `fn: function`, `limit: number` | `function` | Throttle a function |
| `generateId()` | — | `string` | Generate a unique ID string |
| `escapeHtml(str)` | `str: string` | `string` | Escape HTML special characters |
| `checkPasswordStrength(password)` | `password: string` | `object` | Analyse password strength |
| `generatePassword(options?)` | `options: object` | `string` | Generate a random password |
| `parseQueryString(qs?)` | `qs: string` (optional) | `object` | Parse a URL query string |
| `toQueryString(params)` | `params: object` | `string` | Serialize object to query string |
| `wrapData(data, context)` | `data: any`, `context: object` | `DataWrapper` | Wrap data for template pipe access |

---

## Common Patterns

### Debounced Live Search

```js
class SearchView extends View {
  async onInit() {
    await super.onInit();
    // Create a debounced version of the search method
    this._debouncedSearch = MOJOUtils.debounce(
      this._doSearch.bind(this),
      300
    );
  }

  async onChangeSearch(event, element) {
    this.searchQuery = element.value;
    this._debouncedSearch(this.searchQuery);
  }

  async _doSearch(query) {
    if (!query.trim()) {
      this.results = [];
    } else {
      const resp = await this.getApp().rest.GET('/api/search', { q: query });
      this.results = resp.data?.data || [];
    }
    await this.render();
  }
}
```

### Throttled Scroll Handler

```js
class InfiniteListView extends View {
  async onAfterMount() {
    await super.onAfterMount();
    this._scrollHandler = MOJOUtils.throttle(() => {
      const el = this.element;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 50) {
        this.loadNextPage();
      }
    }, 200);

    this.element.addEventListener('scroll', this._scrollHandler);
  }

  async onBeforeDestroy() {
    this.element?.removeEventListener('scroll', this._scrollHandler);
    await super.onBeforeDestroy();
  }
}
```

### Deep Clone Before Mutating

```js
async onActionSaveChanges(event, element) {
  // Clone the model data before modification so we can roll back on error
  const originalData = MOJOUtils.deepClone(this.model.toJSON());

  try {
    this.model.set(this.getFormData());
    await this.model.save();
    this.getApp().toast.success('Saved!');
  } catch (err) {
    // Restore original data
    this.model.set(originalData);
    await this.render();
    this.getApp().showError('Save failed: ' + err.message);
  }
}
```

### Merging Configuration

```js
const defaultConfig = {
  chart: { type: 'line', colors: ['#007bff'], legend: { show: true } },
  grid: { strokeDashArray: 4 }
};

const userConfig = {
  chart: { colors: ['#28a745', '#dc3545'] }
};

// Deep merge — user config overrides specific keys, defaults fill the rest
const finalConfig = MOJOUtils.deepMerge(
  MOJOUtils.deepClone(defaultConfig),
  userConfig
);
// → {
//     chart: { type: 'line', colors: ['#28a745', '#dc3545'], legend: { show: true } },
//     grid: { strokeDashArray: 4 }
//   }
```

### Password Strength Meter

```js
class PasswordField extends View {
  template = `
    <div>
      <input type="password" name="password" data-change-action="check-strength">
      {{#strength|bool}}
        <div class="mt-1">
          <div class="progress" style="height: 4px">
            <div class="progress-bar bg-{{strengthColor}}"
                 style="width: {{strengthPercent}}%"></div>
          </div>
          <small class="text-{{strengthColor}}">{{strengthLabel}}</small>
        </div>
      {{/strength|bool}}
    </div>
  `;

  get strengthColor() {
    const colors = {
      'very-weak': 'danger',
      'weak':      'danger',
      'fair':      'warning',
      'strong':    'success',
      'very-strong': 'success'
    };
    return colors[this.strength] || 'secondary';
  }

  get strengthPercent() {
    const map = { 'very-weak': 20, 'weak': 40, 'fair': 60, 'strong': 80, 'very-strong': 100 };
    return map[this.strength] || 0;
  }

  get strengthLabel() {
    const map = {
      'very-weak':   'Very Weak',
      'weak':        'Weak',
      'fair':        'Fair',
      'strong':      'Strong',
      'very-strong': 'Very Strong'
    };
    return map[this.strength] || '';
  }

  async onChangeCheckStrength(event, element) {
    const result = MOJOUtils.checkPasswordStrength(element.value);
    this.strength = result.strength;
    await this.render();
  }
}
```

### Parse URL Parameters on Page Load

```js
class SearchPage extends Page {
  async onParams(params, query) {
    await super.onParams(params, query);

    // The router already parses query params into this.query,
    // but you can also use MOJOUtils directly for manual parsing
    const urlParams = MOJOUtils.parseQueryString(window.location.search);
    this.initialFilter = urlParams.filter || 'all';
    this.initialPage   = parseInt(urlParams.page) || 1;
  }
}
```

### Safe HTML Insertion

```js
class CommentView extends View {
  getCommentHtml() {
    // Always escape user content before inserting into HTML
    const safeText = MOJOUtils.escapeHtml(this.model.get('text'));
    const safeAuthor = MOJOUtils.escapeHtml(this.model.get('author'));

    // Only the outer structure is trusted HTML
    return `<div class="comment">
      <strong>${safeAuthor}</strong>
      <p>${safeText}</p>
    </div>`;
  }
}
```

---

## Related Documentation

- **[DataFormatter](../core/DataFormatter.md)** — The formatter pipeline that `getContextData()` feeds into
- **[Templates](../core/Templates.md)** — How Mustache templates use the pipe syntax powered by `getContextData()`
- **[View](../core/View.md)** — `View.getContextValue()` calls `MOJOUtils.getContextData()` and `MOJOUtils.wrapData()`
- **[Events](../core/Events.md)** — `debounce()` and `throttle()` are useful when working with DOM event handlers