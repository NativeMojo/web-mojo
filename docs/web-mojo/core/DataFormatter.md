# DataFormatter

**Universal data formatting utility with 80+ built-in formatters and pipe syntax**

DataFormatter provides consistent value formatting throughout the MOJO framework. It powers the pipe syntax in templates (`{{value|formatter}}`), is used by Model and View for data display, and can be called directly from JavaScript. It supports date/time, number, string, HTML, and utility formatters with a chainable pipe system.

---

## Table of Contents

### Overview
- [What is DataFormatter?](#what-is-dataformatter)
- [Key Features](#key-features)
- [How It Works](#how-it-works)

### Quick Start
- [In Templates](#in-templates)
- [In JavaScript](#in-javascript)

### Pipe Syntax
- [Basic Pipes](#basic-pipes)
- [Chaining Pipes](#chaining-pipes)
- [Arguments — Colon Syntax](#arguments--colon-syntax)
- [Arguments — Parentheses Syntax](#arguments--parentheses-syntax)
- [Context Variables as Arguments](#context-variables-as-arguments)

### Formatter Reference
- [Date & Time](#date--time)
- [Numbers](#numbers)
- [Math](#math)
- [Strings](#strings)
- [HTML & Web](#html--web)
- [Status & Badges](#status--badges)
- [Images & Avatars](#images--avatars)
- [Encoding](#encoding)
- [Utility](#utility)

### Custom Formatters
- [Registering a Custom Formatter](#registering-a-custom-formatter)
- [Custom Formatter Examples](#custom-formatter-examples)

### API Reference
- [Methods](#methods)
- [Accessing the Singleton](#accessing-the-singleton)

### Best Practices
- [Best Practices](#best-practices)

### Troubleshooting
- [Common Issues](#common-issues)

### Related Documentation
- [Related Documentation](#related-documentation)

---

## What is DataFormatter?

**DataFormatter** is a singleton utility that transforms raw values into formatted display strings. It's the engine behind MOJO's pipe syntax:

```html
{{price|currency}}          → $12.99
{{created|date}}            → 01/15/2024
{{name|uppercase}}          → JOHN DOE
{{{status|badge}}}          → <span class="badge bg-success">Active</span>
```

Every time you use `|` in a MOJO template, DataFormatter processes the value.

---

## Key Features

- **80+ Built-in Formatters** — Dates, numbers, strings, HTML, badges, and more
- **Pipe Syntax** — Chain formatters with `|` in templates or JavaScript
- **Two Argument Styles** — Colon (`:`) and parentheses (`()`) syntax
- **Context Variable Resolution** — Use model/view properties as formatter arguments
- **Custom Formatters** — Register your own with `dataFormatter.register()`
- **Chainable** — Apply multiple formatters in sequence: `{{value|currency|tooltip:'Revenue'}}`
- **Null-Safe** — Gracefully handles null, undefined, and empty values
- **HTML Output** — Formatters that return HTML (badge, status, avatar, etc.) work with triple-brace `{{{...}}}`

---

## How It Works

1. In a template, `{{model.price|currency}}` is parsed by Mustache
2. Mustache calls `view.getContextValue('model.price|currency')`
3. `MOJOUtils.getContextData()` splits on the first `|` → field: `model.price`, pipes: `currency`
4. `dataFormatter.pipe(value, 'currency')` is called
5. The `currency` formatter converts the raw value (e.g., `1299`) to `$12.99`

---

## In Templates

```html
<!-- Simple formatting -->
{{name|uppercase}}
{{price|currency}}
{{created|date:'YYYY-MM-DD'}}

<!-- Chained formatters -->
{{name|capitalize|truncate:20}}

<!-- HTML-producing formatters need triple braces -->
{{{email|email}}}
{{{status|badge}}}
{{{avatar_url|avatar}}}
```

> **Important:** Formatters that produce HTML (badge, status, email, url, avatar, image, etc.) must use triple braces `{{{ }}}` to prevent HTML escaping.

---

## In JavaScript

```javascript
import dataFormatter from '@core/utils/DataFormatter.js';

// Single formatter
dataFormatter.apply('currency', 1299);           // "$12.99"
dataFormatter.apply('date', '2024-01-15');        // "01/15/2024"
dataFormatter.apply('truncate', 'Hello World', 5); // "Hello..."

// Pipe string (multiple formatters)
dataFormatter.pipe(1299, 'currency');              // "$12.99"
dataFormatter.pipe('hello world', 'capitalize|truncate:20'); // "Hello World"

// Direct method call
dataFormatter.badge('Active');                     // '<span class="badge bg-success">Active</span>'
dataFormatter.relative(new Date('2024-01-01'));    // "3 months ago"
```

---

## Basic Pipes

A pipe applies a single formatter to a value:

```html
{{name|uppercase}}        → "JOHN DOE"
{{price|currency}}        → "$12.99"
{{created|relative}}      → "3 days ago"
```

---

## Chaining Pipes

Chain multiple formatters with `|`. They execute left to right:

```html
{{name|lowercase|capitalize}}           → "John doe" → "John Doe"
{{price|currency|tooltip:'Total cost'}} → "$12.99" with tooltip
{{bio|truncate:100|nl2br}}              → Truncated with line breaks
```

---

## Arguments — Colon Syntax

Pass arguments after the formatter name using `:` separators:

```html
{{created|date:'YYYY-MM-DD'}}         → "2024-01-15"
{{name|truncate:20:'…'}}               → "John Doe Smithson…"
{{value|number:2:'en-US'}}             → "1,234.56"
{{amount|currency:'€':2}}              → "€12.99"
```

**Rules:**
- String arguments should be quoted: `'value'` or `"value"`
- Numeric arguments are bare: `20`, `2`
- Boolean arguments: `true`, `false`

---

## Arguments — Parentheses Syntax

Alternatively, use parentheses with comma-separated arguments:

```html
{{created|date('YYYY-MM-DD')}}
{{name|truncate(20, '…')}}
{{amount|currency('€', 2)}}
```

Both syntaxes are equivalent. Use whichever is more readable for your case.

---

## Context Variables as Arguments

You can reference view or model properties as formatter arguments:

```html
{{amount|currency:model.currency_symbol}}
{{text|highlight:searchTerm}}
{{value|equals:model.status:'active':'inactive'}}
```

The formatter argument resolver will look up `model.currency_symbol`, `searchTerm`, etc. from the current template context.

---

## Date & Time

### date

Format a date value. Accepts Date objects, ISO strings, timestamps, and epoch seconds.

**Syntax:** `date` or `date:'format'`

**Format tokens:**

| Token | Output | Example |
|-------|--------|---------|
| `YYYY` | 4-digit year | `2024` |
| `YY` | 2-digit year | `24` |
| `MMMM` | Full month name | `January` |
| `MMM` | Short month name | `Jan` |
| `MM` | Zero-padded month | `01` |
| `M` | Month | `1` |
| `dddd` | Full weekday | `Monday` |
| `ddd` | Short weekday | `Mon` |
| `DD` | Zero-padded day | `05` |
| `D` | Day | `5` |

**Examples:**

```html
{{created|date}}                    → "01/15/2024"
{{created|date:'YYYY-MM-DD'}}      → "2024-01-15"
{{created|date:'MMMM D, YYYY'}}    → "January 15, 2024"
{{created|date:'ddd, MMM D'}}      → "Mon, Jan 15"
```

**Default format:** `MM/DD/YYYY`

---

### time

Format a time value.

**Syntax:** `time` or `time:'format'`

**Format tokens:**

| Token | Output | Example |
|-------|--------|---------|
| `HH` | 24-hour padded | `14` |
| `H` | 24-hour | `14` |
| `hh` | 12-hour padded | `02` |
| `h` | 12-hour | `2` |
| `mm` | Minutes padded | `05` |
| `m` | Minutes | `5` |
| `ss` | Seconds padded | `09` |
| `s` | Seconds | `9` |
| `A` | AM/PM uppercase | `PM` |
| `a` | am/pm lowercase | `pm` |

**Examples:**

```html
{{created|time}}                    → "02:30 PM"
{{created|time:'HH:mm:ss'}}        → "14:30:09"
{{created|time:'h:mm A'}}          → "2:30 PM"
```

**Default format:** `hh:mm A`

---

### datetime

Combines date and time formatting.

**Syntax:** `datetime` or `datetime:'dateFormat':'timeFormat'`

```html
{{created|datetime}}                             → "01/15/2024 02:30 PM"
{{created|datetime:'YYYY-MM-DD':'HH:mm'}}        → "2024-01-15 14:30"
```

---

### datetime_tz

Format date/time with timezone support.

**Syntax:** `datetime_tz` or `datetime_tz:'dateFormat':'timeFormat':'timezone'`

```html
{{created|datetime_tz}}
{{created|datetime_tz:'YYYY-MM-DD':'HH:mm':'America/New_York'}}
```

Appends the timezone abbreviation (e.g., `EST`, `PST`).

**Alias:** `datatime_tz` (common typo alias)

---

### relative

Human-readable relative time (e.g., "3 days ago", "in 2 hours").

**Syntax:** `relative`

```html
{{created|relative}}      → "3 days ago"
{{deadline|relative}}     → "in 2 hours"
{{updated|relative}}      → "just now"
```

**Alias:** `fromNow`

---

### relative_short

Short-form relative time.

**Syntax:** `relative_short`

```html
{{created|relative_short}}  → "3d ago"
```

---

### date_range

Format a date range from a start value to an end value.

**Syntax:** `date_range:endValue` or `date_range:endValue:'format'`

```html
{{start_date|date_range:model.end_date}}                    → "01/15/2024 – 01/20/2024"
{{start_date|date_range:model.end_date:'MMM D, YYYY'}}      → "Jan 15, 2024 – Jan 20, 2024"
```

---

### datetime_range

Format a datetime range.

**Syntax:** `datetime_range:endValue` or `datetime_range:endValue:'dateFormat':'timeFormat'`

```html
{{start|datetime_range:model.end}}
```

---

### iso

Format as ISO 8601 string.

**Syntax:** `iso` or `iso:true` (date only)

```html
{{created|iso}}          → "2024-01-15T14:30:00.000Z"
{{created|iso:true}}     → "2024-01-15"
```

---

### epoch

Convert epoch seconds to milliseconds (for use with other date formatters).

**Syntax:** `epoch`

```html
{{timestamp|epoch|date:'YYYY-MM-DD'}}
```

---

## Numbers

### number

Format a number with locale-aware thousands separators and decimal places.

**Syntax:** `number` or `number:decimals` or `number:decimals:'locale'`

```html
{{value|number}}              → "1,234.00"
{{value|number:0}}            → "1,234"
{{value|number:3}}            → "1,234.000"
{{value|number:2:'de-DE'}}    → "1.234,00"
```

**Default:** 2 decimal places, `en-US` locale.

---

### currency

Format a value in **cents** as a currency string.

**Syntax:** `currency` or `currency:'symbol':decimals`

```html
{{price|currency}}            → "$12.99"     (value: 1299)
{{price|currency:'€'}}        → "€12.99"
{{price|currency:'$':0}}      → "$13"        (rounds)
```

> **Note:** The value is expected in **cents** (integer). `1299` → `$12.99`.

**Default:** `$` symbol, 2 decimal places.

---

### percent

Format as a percentage.

**Syntax:** `percent` or `percent:decimals:multiply`

```html
{{ratio|percent}}             → "75%"        (value: 0.75, multiplied by 100)
{{ratio|percent:1}}           → "75.0%"
{{pct|percent:0:false}}       → "75%"        (value: 75, no multiply)
```

**Default:** 0 decimals, multiply by 100.

---

### filesize

Format bytes as a human-readable file size.

**Syntax:** `filesize` or `filesize:binary:decimals`

```html
{{size|filesize}}             → "1.5 MB"     (value: 1500000)
{{size|filesize:true}}        → "1.4 MiB"    (binary units, 1024-based)
{{size|filesize:false:2}}     → "1.50 MB"
```

**Default:** Decimal (1000-based) units, 1 decimal place.

---

### ordinal

Format as an ordinal number.

**Syntax:** `ordinal` or `ordinal:true` (suffix only)

```html
{{position|ordinal}}          → "1st"
{{position|ordinal}}          → "23rd"
{{position|ordinal:true}}     → "rd"         (suffix only)
```

---

### compact

Format large numbers in compact notation.

**Syntax:** `compact` or `compact:decimals`

```html
{{views|compact}}             → "1.5M"       (value: 1500000)
{{views|compact:0}}           → "2M"
{{revenue|compact}}           → "3.2B"       (value: 3200000000)
{{count|compact}}             → "45.0K"      (value: 45000)
```

**Default:** 1 decimal place.

---

## Math

Arithmetic formatters for simple calculations in templates.

### add

```html
{{count|add:1}}               → 11           (value: 10)
```

### subtract / sub

```html
{{total|subtract:5}}          → 95           (value: 100)
{{total|sub:5}}               → 95           (alias)
```

### multiply / mult

```html
{{price|multiply:1.1}}        → 110          (value: 100)
{{price|mult:1.1}}            → 110          (alias)
```

### divide / div

```html
{{total|divide:100}}          → 5            (value: 500)
{{total|div:100}}             → 5            (alias)
```

Returns the original value if division by zero is attempted.

---

## Strings

### uppercase / upper

```html
{{name|uppercase}}            → "JOHN DOE"
{{name|upper}}                → "JOHN DOE"   (alias)
```

### lowercase / lower

```html
{{name|lowercase}}            → "john doe"
{{name|lower}}                → "john doe"   (alias)
```

### capitalize / caps

Capitalize words. By default capitalizes all words. Pass `false` to capitalize only the first letter.

**Syntax:** `capitalize` or `capitalize:false`

```html
{{name|capitalize}}           → "John Doe"
{{name|caps}}                 → "John Doe"   (alias)
{{text|capitalize:false}}     → "Hello world" (only first letter)
```

---

### replace

Replace occurrences in a string.

**Syntax:** `replace:'search':'replacement'` or `replace:'search':'replacement':'flags'`

```html
{{name|replace:'_':' '}}             → "john doe"    (value: "john_doe")
{{text|replace:'/[_-]+/g':' '}}      → regex replacement
{{code|replace:'old':'new':'g'}}      → replace all occurrences
```

Supports plain strings (replaces all by default with `g` flag) and regex-style strings (`/pattern/flags`).

---

### truncate

Truncate a string at a maximum length.

**Syntax:** `truncate:length:'suffix'`

```html
{{bio|truncate}}              → "Lorem ipsum dolor sit amet, consectetur adipis..."  (default: 50 chars)
{{bio|truncate:20}}           → "Lorem ipsum dolor si..."
{{bio|truncate:20:'…'}}       → "Lorem ipsum dolor si…"
```

**Default:** 50 characters, `...` suffix.

---

### truncate_front

Keep only the end of a string.

**Syntax:** `truncate_front:length:'prefix'`

```html
{{hash|truncate_front:8}}     → "...a1b2c3d4"
```

**Default:** 8 characters, `...` prefix.

---

### truncate_middle

Truncate the middle of a string, keeping start and end.

**Syntax:** `truncate_middle:size:'replace'`

```html
{{token|truncate_middle:8}}          → "abcd***wxyz"
{{token|truncate_middle:6:'...'}}    → "abc...xyz"
```

**Default:** 8 characters kept, `***` replacement.

---

### slug

Convert to a URL-friendly slug.

**Syntax:** `slug` or `slug:'separator'`

```html
{{title|slug}}                → "hello-world"  (value: "Hello World!")
{{title|slug:'_'}}            → "hello_world"
```

---

### initials

Extract initials from a string.

**Syntax:** `initials` or `initials:count`

```html
{{name|initials}}             → "JD"          (value: "John Doe")
{{name|initials:3}}           → "JDS"         (value: "John Doe Smith")
{{name|initials:1}}           → "J"
```

**Default:** 2 initials.

---

### mask

Mask a string, showing only the last N characters.

**Syntax:** `mask` or `mask:'char':showLast`

```html
{{ssn|mask}}                  → "*****6789"
{{ssn|mask:'•':4}}            → "•••••6789"
{{card|mask:'X':4}}           → "XXXXXXXXXXXX1234"
```

**Default:** `*` mask character, show last 4.

---

## HTML & Web

> **Important:** All formatters in this section return HTML. Use triple braces `{{{ }}}` in templates.

### email

Format as a clickable mailto link.

**Syntax:** `email`

```html
{{{email|email}}}             → '<a href="mailto:john@example.com">john@example.com</a>'
```

---

### phone

Format and link a phone number.

**Syntax:** `phone` or `phone:'format':link`

```html
{{{phone|phone}}}             → '<a href="tel:5551234567">(555) 123-4567</a>'
{{{phone|phone:'US':false}}}  → "(555) 123-4567"   (no link)
```

**Default:** US format, with tel: link.

---

### url

Format as a clickable link.

**Syntax:** `url` or `url:'text':newWindow`

```html
{{{website|url}}}                      → '<a href="https://example.com" target="_blank"...>https://example.com</a>'
{{{website|url:'Visit Site'}}}         → '<a href="...">Visit Site</a>'
{{{website|url:'Link':false}}}         → Opens in same window
```

---

### linkify

Auto-detect and link URLs and email addresses in text.

**Syntax:** `linkify`

```html
{{{description|linkify}}}
```

Converts `http://...`, `www.`, and email addresses into clickable links. Input is HTML-escaped first.

---

### clipboard

Wrap a value with a copy-to-clipboard button.

**Syntax:** `clipboard` or `clipboard:'mode'`

```html
{{{api_key|clipboard}}}              → Value text with copy button
{{{token|clipboard:'icon-only'}}}    → Copy button only, no text
```

---

### nl2br

Convert newlines to `<br>` tags.

**Syntax:** `nl2br`

```html
{{{notes|nl2br}}}
```

HTML-escapes the content first, then converts line breaks.

---

### code

Wrap value in a `<pre><code>` block.

**Syntax:** `code` or `code:'language'`

```html
{{{snippet|code}}}
{{{snippet|code:'javascript'}}}
```

---

### pre

Wrap value in a styled `<pre>` block.

**Syntax:** `pre`

```html
{{{log_output|pre}}}
```

---

### tooltip

Wrap a value with a Bootstrap tooltip.

**Syntax:** `tooltip:'text'` or `tooltip:'text':'placement'` or `tooltip:'text':'placement':'html'`

```html
{{{value|tooltip:'Help text'}}}
{{{value|tooltip:'More info':'bottom'}}}
{{{value|tooltip:'<strong>Bold</strong>':'top':'html'}}}
```

**Placements:** `top` (default), `bottom`, `left`, `right`.

Tooltips can be chained after other formatters:

```html
{{{price|currency|tooltip:'Total including tax'}}}
```

---

### highlight

Highlight search terms in text.

**Syntax:** `highlight:'term'` or `highlight:'term':'className'`

```html
{{{name|highlight:'john'}}}           → "**John** Doe" (wrapped in <mark>)
{{{name|highlight:'john':'found'}}}   → Custom class
```

---

### stripHtml

Remove all HTML tags from a string.

**Syntax:** `stripHtml`

```html
{{html_content|stripHtml}}
```

---

## Status & Badges

> **Important:** These return HTML. Use triple braces `{{{ }}}`.

### badge

Format a value as a Bootstrap badge.

**Syntax:** `badge`, `badge:type`, or `badge:value=type,value=type,...`

#### Auto-detect (default)

Automatically assigns a Bootstrap color based on the value:

| Values | Color |
|--------|-------|
| `active`, `pass`, `success`, `complete`, `completed`, `approved`, `done`, `true`, `on`, `yes` | `success` (green) |
| `error`, `failed`, `fail`, `rejected`, `deleted`, `cancelled`, `false`, `off`, `no`, `declined` | `danger` (red) |
| `warning`, `pending`, `review`, `processing`, `uploading` | `warning` (yellow) |
| `info`, `new`, `draft` | `info` (blue) |
| `inactive`, `disabled`, `archived`, `suspended` | `secondary` (gray) |

```html
{{{status|badge}}}                → auto-detected color based on value
```

#### Fixed type

Force a specific Bootstrap color:

```html
{{{label|badge:primary}}}        → always blue
{{{label|badge:danger}}}         → always red
{{{label|badge:success}}}        → always green
```

#### Value mapping

Map specific values to specific badge colors using `=` syntax:

```html
{{{model.action|badge:lock_engaged=danger,lock_released=success}}}
{{{model.priority|badge:low=secondary,medium=warning,high=danger,critical=dark}}}
{{{model.tier|badge:free=secondary,pro=primary,enterprise=success}}}
```

Each pair is `value=color`, separated by commas. If the actual value doesn't match any mapping, it falls back to auto-detection.

#### Array values

If the value is an array, a badge is created for each item:

```html
{{{tags|badge}}}                  → multiple badges, one per tag
```

---

### badgeClass

Returns just the CSS class string (not the full HTML), useful for custom markup.

**Syntax:** `badgeClass` or `badgeClass:type`

```html
<span class="badge {{status|badgeClass}}">{{status}}</span>
```

---

### status

Format a value as a status indicator with icon and text.

**Syntax:** `status`

```html
{{{order_status|status}}}        → '<span class="text-success"><i class="bi bi-check-circle-fill"></i> Active</span>'
```

Auto-detects icon and color based on the value. Recognized values:

| Value | Icon | Color |
|-------|------|-------|
| `active`, `approved`, `success` | ✓ check-circle-fill | green |
| `declined` | ✗ x-circle-fill | red |
| `inactive` | ⏸ pause-circle-fill | gray |
| `pending` | 🕐 clock-fill | yellow |
| `error` | ⚠ exclamation-triangle-fill | red |
| `warning` | ⚠ exclamation-triangle-fill | yellow |

---

### status_icon

Status icon only, no text.

```html
{{{order_status|status_icon}}}
```

---

### status_text

Status text only, no icon.

```html
{{{order_status|status_text}}}
```

---

### boolean

Format a boolean as text.

**Syntax:** `boolean` or `boolean:'trueText':'falseText'`

```html
{{is_active|boolean}}                    → "True" or "False"
{{is_active|boolean:'Active':'Inactive'}} → "Active" or "Inactive"
```

---

### bool

Convert a value to a strict boolean. Essential for Mustache section conditionals.

**Syntax:** `bool`

```html
{{#items|bool}}
  Items exist
{{/items|bool}}
```

Returns `false` for: `null`, `undefined`, `0`, `''`, `false`, `'false'`, empty arrays `[]`, empty plain objects `{}`.

Returns `true` for everything else.

> ⚠️ **This is critical for Mustache.** Without `|bool`, arrays iterate instead of being truthy checks, and objects render as `[object Object]`. See [Templates](./Templates.md) for details.

---

### yesno

Shorthand for `boolean:'Yes':'No'`.

```html
{{is_verified|yesno}}         → "Yes" or "No"
```

---

### yesnoicon

Format a boolean as a colored check/X icon.

**Syntax:** `yesnoicon`

```html
{{{is_active|yesnoicon}}}    → ✓ (green) or ✗ (red)
```

---

### icon

Map a value to a Bootstrap icon class.

**Syntax:** `icon:mapping` (mapping is passed as an object argument)

```html
{{{type|icon}}}
```

Typically used programmatically or with a context variable as the mapping.

---

## Images & Avatars

> **Important:** These return HTML. Use triple braces `{{{ }}}`.

### image

Format a value as an `<img>` tag. Supports URL strings and file objects with renditions.

**Syntax:** `image` or `image:'rendition':'classes':'alt'`

```html
{{{photo|image}}}                              → <img src="..." class="img-fluid" />
{{{photo|image:'thumbnail':'rounded':'Photo'}}}
```

**Default:** `thumbnail` rendition, `img-fluid` class.

For file objects with renditions (e.g., from django-mojo), the formatter extracts the appropriate rendition URL automatically.

---

### avatar

Format as a circular avatar image. Falls back to a generic person icon if no URL.

**Syntax:** `avatar` or `avatar:'size':'classes':'alt'`

**Sizes:** `xs` (1.5rem), `sm` (2rem), `md` (3rem), `lg` (4rem), `xl` (5rem)

```html
{{{profile_photo|avatar}}}                → 3rem circular image
{{{profile_photo|avatar:'sm'}}}           → 2rem circular image
{{{profile_photo|avatar:'lg':'rounded-circle border':'User'}}}
```

**Default:** `md` size, `rounded-circle` class. Uses `square_sm` rendition for file objects.

---

## Encoding

### hex / tohex

Encode a value as a hex string.

**Syntax:** `hex` or `hex:uppercase:withPrefix`

```html
{{value|hex}}                 → "48656c6c6f"  (value: "Hello")
{{value|hex:true}}            → "48656C6C6F"  (uppercase)
{{value|hex:false:true}}      → "0x48656c6c6f" (with prefix)
```

Works with strings (UTF-8 encoded), numbers (base-16), and byte arrays.

---

### unhex / fromhex

Decode a hex string to UTF-8 text.

**Syntax:** `unhex`

```html
{{hex_value|unhex}}           → "Hello"       (value: "48656c6c6f")
```

Handles optional `0x` prefix and whitespace.

---

## Utility

### default

Provide a fallback value for null, undefined, or empty strings.

**Syntax:** `default:'fallback'`

```html
{{nickname|default:'N/A'}}              → "N/A" if nickname is empty
{{email|default:'No email on file'}}
```

---

### equals

Conditional output based on value equality. Useful for CSS classes, labels, etc.

**Syntax:** `equals:compareValue:'trueResult':'falseResult'`

```html
{{status|equals:'active':'text-success':'text-secondary'}}
{{role|equals:'admin':'Administrator':'User'}}
{{count|equals:0:'No items':'Has items'}}
```

Uses loose equality (`==`), so `1 == '1'` is true.

---

### json

Stringify a value as formatted JSON.

**Syntax:** `json` or `json:indent`

```html
{{data|json}}                 → formatted JSON with 2-space indent
{{data|json:4}}               → 4-space indent
```

---

### raw

Pass through the value unchanged. Useful for explicitly opting out of formatting.

```html
{{value|raw}}
```

---

### plural

Format a count with the correct singular/plural word.

**Syntax:** `plural:'singular'` or `plural:'singular':'plural'` or `plural:'singular':'plural':includeCount`

```html
{{count|plural:'item'}}                → "5 items"
{{count|plural:'child':'children'}}    → "1 child" or "3 children"
{{count|plural:'item':'items':false}}  → "items" (no count prefix)
```

---

### list

Format an array as a human-readable list.

**Syntax:** `list`

```html
{{names|list}}                → "Alice, Bob, and Charlie"
```

Supports options for conjunction and limit (typically used programmatically).

---

### duration

Format a duration value as human-readable text.

**Syntax:** `duration` or `duration:'unit':short:precision`

**Input units:** `ms` (default), `s`, `m`, `h`, `d`

```html
{{elapsed|duration}}                  → "2 hours 30 minutes"  (value in ms)
{{elapsed|duration:'s'}}              → "2 hours 30 minutes"  (value in seconds)
{{elapsed|duration:'s':true}}         → "2h30m"               (short format)
{{elapsed|duration:'ms':false:3}}     → "1 day 2 hours 30 minutes" (3 units max)
```

**Default:** milliseconds input, long format, 2 unit precision.

---

### hash

Truncate long strings/IDs with a prefix.

**Syntax:** `hash` or `hash:length:'prefix':'suffix'`

```html
{{commit_sha|hash}}                   → "a1b2c3d4..."
{{commit_sha|hash:12}}               → "a1b2c3d4e5f6..."
{{id|hash:8:'#'}}                     → "#a1b2c3d4..."
```

**Default:** 8 characters, no prefix, `...` suffix.

---

### iter

Convert a value to an iterable array for Mustache iteration.

```html
{{#settings|iter}}
  {{key}}: {{value}}
{{/settings|iter}}
```

- **Arrays** — returned as-is
- **Objects** — converted to `[{ key, value }, ...]` pairs
- **Primitives** — wrapped in `[{ key: '0', value: v }]`
- **null/undefined** — returns `[]`

---

### keys

Get the keys of an object as an array.

```html
{{#config|keys}}
  {{.}}
{{/config|keys}}
```

---

### values

Get the values of an object as an array.

```html
{{#config|values}}
  {{.}}
{{/config|values}}
```

---

### has

Check if a formatter exists by name.

```javascript
dataFormatter.has('currency');   // true
dataFormatter.has('myCustom');   // false
```

(This is a method, not a template formatter.)

---

## Registering a Custom Formatter

```javascript
import dataFormatter from '@core/utils/DataFormatter.js';

// Register a simple formatter
dataFormatter.register('reverse', (value) => {
  return String(value).split('').reverse().join('');
});

// Register a formatter with arguments
dataFormatter.register('wrap', (value, before = '(', after = ')') => {
  return `${before}${value}${after}`;
});

// Use in templates
// {{name|reverse}}         → "eoD nhoJ"
// {{name|wrap:'[':']'}}    → "[John Doe]"
```

**Rules:**
- The first argument is always the value being formatted
- Additional arguments come from the pipe syntax
- The formatter name is case-insensitive
- `register()` returns the DataFormatter instance for chaining

---

## Custom Formatter Examples

### Color-coded priority

```javascript
dataFormatter.register('priority', (value) => {
  const colors = { low: 'info', medium: 'warning', high: 'danger', critical: 'dark' };
  const color = colors[String(value).toLowerCase()] || 'secondary';
  return `<span class="badge bg-${color}">${value}</span>`;
});
```

```html
{{{task.priority|priority}}}
```

### Temperature

```javascript
dataFormatter.register('temp', (value, unit = 'F') => {
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  return `${num.toFixed(1)}°${unit}`;
});
```

```html
{{temperature|temp}}         → "72.5°F"
{{temperature|temp:'C'}}     → "22.5°C"
```

### Ago/from-now with custom thresholds

```javascript
dataFormatter.register('smartDate', (value) => {
  const date = new Date(value);
  const now = new Date();
  const diffDays = Math.floor((now - date) / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
});
```

---

## Methods

### apply(name, value, ...args)

Apply a single formatter by name.

```javascript
dataFormatter.apply('currency', 1299);           // "$12.99"
dataFormatter.apply('truncate', 'Hello', 3);     // "Hel..."
```

---

### pipe(value, pipeString, context)

Process a pipe string (one or more chained formatters).

```javascript
dataFormatter.pipe(1299, 'currency');                       // "$12.99"
dataFormatter.pipe('hello', 'capitalize|truncate:3');        // "Hel..."
dataFormatter.pipe(value, 'currency', modelContext);         // With context for variable resolution
```

---

### register(name, formatter)

Register a custom formatter function.

```javascript
dataFormatter.register('myFormatter', (value, arg1, arg2) => {
  // transform value
  return result;
});
```

**Returns:** DataFormatter instance (for chaining).

---

### unregister(name)

Remove a registered formatter.

```javascript
dataFormatter.unregister('myFormatter');
```

**Returns:** `true` if the formatter was found and removed.

---

### has(name)

Check if a formatter is registered.

```javascript
dataFormatter.has('currency');  // true
```

---

### listFormatters()

Get all registered formatter names, sorted alphabetically.

```javascript
dataFormatter.listFormatters();
// ['add', 'avatar', 'badge', 'badgeclass', 'bool', 'boolean', 'capitalize', ...]
```

---

### parsePipeString(pipeString, context)

Parse a pipe string into an array of `{ name, args }` objects. Useful for debugging.

```javascript
dataFormatter.parsePipeString("date:'YYYY-MM-DD'|uppercase");
// [{ name: 'date', args: ['YYYY-MM-DD'] }, { name: 'uppercase', args: [] }]
```

---

## Accessing the Singleton

DataFormatter is a singleton. The same instance is used throughout MOJO:

```javascript
// Import the singleton
import dataFormatter from '@core/utils/DataFormatter.js';

// Also available globally (for debugging)
window.dataFormatter;

// The class is also exported for testing
import { DataFormatter } from '@core/utils/DataFormatter.js';
```

---

## Best Practices

### 1. Use Triple Braces for HTML Formatters

Formatters that return HTML **must** use `{{{ }}}` to prevent escaping:

```html
<!-- ✅ Correct -->
{{{status|badge}}}
{{{email|email}}}
{{{photo|avatar}}}

<!-- ❌ Wrong — HTML will be escaped and show as text -->
{{status|badge}}
```

### 2. Chain Formatters for Complex Display

```html
{{{amount|currency|tooltip:'Monthly revenue'}}}
{{title|capitalize|truncate:30}}
```

### 3. Use `default` for Missing Values

```html
{{nickname|default:'Anonymous'}}
{{phone|default:'Not provided'|phone}}
```

### 4. Use `bool` for Conditional Sections

```html
{{#items|bool}}
  <p>There are items</p>
{{/items|bool}}
{{^items|bool}}
  <p>No items</p>
{{/items|bool}}
```

### 5. Prefer Built-in Formatters Over View Methods

```html
<!-- ✅ Use formatters -->
{{price|currency}}
{{created|relative}}

<!-- ❌ Don't create view methods for simple formatting -->
{{getFormattedPrice}}
{{getRelativeDate}}
```

### 6. Register Reusable Custom Formatters

If you find yourself writing the same formatting logic in multiple views, register it as a formatter:

```javascript
// In your app's initialization
dataFormatter.register('statusLabel', (value) => {
  const labels = { 1: 'Active', 2: 'Pending', 3: 'Closed' };
  return labels[value] || 'Unknown';
});
```

### 7. Currency Values Are in Cents

The `currency` formatter expects values in cents to avoid floating-point issues:

```html
{{price|currency}}     <!-- value: 1299 → "$12.99" -->
{{price|currency}}     <!-- value: 50 → "$0.50" -->
```

---

## Common Issues

### Formatter not found warning

```
Formatter 'myFormatter' not found
```

- Ensure you registered the formatter before templates render.
- Formatter names are case-insensitive, but check for typos.
- Use `dataFormatter.has('name')` to verify registration.

### HTML showing as text in the page

Your template is using `{{ }}` (double braces) for a formatter that returns HTML. Switch to `{{{ }}}` (triple braces):

```html
<!-- Shows: <span class="badge bg-success">Active</span> as text -->
{{status|badge}}

<!-- Renders as an actual badge -->
{{{status|badge}}}
```

### Date showing "Invalid Date"

- Ensure the value is a valid date string, timestamp, or Date object.
- For epoch timestamps in **seconds**, pipe through `epoch` first: `{{timestamp|epoch|date}}`
- Date-only strings (`2024-01-15`) are parsed as local time to avoid timezone issues.

### Currency shows wrong amount

- The `currency` formatter expects **cents** (integer), not dollars.
- `1299` → `$12.99`, not `$1,299.00`
- If your values are already in dollars, multiply first: `{{dollars|multiply:100|currency}}`

### Badge auto-detect picks wrong color

Use explicit mapping for non-standard values:

```html
{{{action|badge:lock_engaged=danger,lock_released=success}}}
```

Or force a specific color:

```html
{{{label|badge:primary}}}
```

### Pipe arguments not parsed correctly

- String arguments must be quoted: `date:'YYYY-MM-DD'`
- Colons inside arguments can cause issues — use parentheses syntax for complex cases: `date('YYYY-MM-DD')`
- Commas in colon-syntax arguments are treated as literal characters (they're not a separator)

### Chained formatters not working

Formatters are applied left-to-right. Each formatter receives the **output** of the previous one:

```html
<!-- ✅ Works: number → string → tooltip wraps the string -->
{{{price|currency|tooltip:'Price'}}}

<!-- ⚠️ Careful: truncate first, then badge on the truncated text -->
{{{description|truncate:20|badge}}}
```

---

## All Built-in Formatters (Quick Reference)

| Formatter | Category | Description |
|-----------|----------|-------------|
| `date` | Date/Time | Format date (`MM/DD/YYYY` default) |
| `time` | Date/Time | Format time (`hh:mm A` default) |
| `datetime` | Date/Time | Date + time combined |
| `datetime_tz` | Date/Time | Date + time with timezone |
| `relative` / `fromNow` | Date/Time | Relative time ("3 days ago") |
| `relative_short` | Date/Time | Short relative time ("3d ago") |
| `date_range` | Date/Time | Format date range |
| `datetime_range` | Date/Time | Format datetime range |
| `iso` | Date/Time | ISO 8601 format |
| `epoch` | Date/Time | Convert epoch seconds to ms |
| `number` | Number | Locale-formatted number |
| `currency` | Number | Format cents as currency |
| `percent` | Number | Format as percentage |
| `filesize` | Number | Format bytes as file size |
| `ordinal` | Number | Ordinal number (1st, 2nd) |
| `compact` | Number | Compact notation (1.5M) |
| `add` | Math | Add a number |
| `subtract` / `sub` | Math | Subtract a number |
| `multiply` / `mult` | Math | Multiply by a number |
| `divide` / `div` | Math | Divide by a number |
| `uppercase` / `upper` | String | Convert to uppercase |
| `lowercase` / `lower` | String | Convert to lowercase |
| `capitalize` / `caps` | String | Capitalize words |
| `replace` | String | Replace text or regex |
| `truncate` | String | Truncate with suffix |
| `truncate_front` | String | Truncate keeping end |
| `truncate_middle` | String | Truncate keeping start and end |
| `slug` | String | URL-friendly slug |
| `initials` | String | Extract initials |
| `mask` | String | Mask sensitive data |
| `email` | HTML | Mailto link |
| `phone` | HTML | Formatted phone with tel: link |
| `url` | HTML | Clickable link |
| `linkify` | HTML | Auto-detect and link URLs |
| `clipboard` | HTML | Copy-to-clipboard button |
| `nl2br` | HTML | Newlines to `<br>` |
| `code` | HTML | Code block |
| `pre` | HTML | Pre-formatted block |
| `tooltip` | HTML | Bootstrap tooltip wrapper |
| `highlight` | HTML | Highlight search terms |
| `stripHtml` | HTML | Remove HTML tags |
| `badge` | Status | Bootstrap badge |
| `badgeClass` | Status | Badge CSS class only |
| `status` | Status | Status icon + text |
| `status_icon` | Status | Status icon only |
| `status_text` | Status | Status colored text only |
| `boolean` | Status | True/False text |
| `bool` | Status | Strict boolean conversion |
| `yesno` | Status | Yes/No text |
| `yesnoicon` | Status | Yes/No icon |
| `icon` | Status | Mapped icon |
| `image` | Image | Image tag |
| `avatar` | Image | Circular avatar image |
| `hex` / `tohex` | Encoding | Hex encode |
| `unhex` / `fromhex` | Encoding | Hex decode |
| `default` | Utility | Fallback value |
| `equals` | Utility | Conditional output |
| `json` | Utility | JSON stringify |
| `raw` | Utility | Pass-through |
| `plural` | Utility | Singular/plural |
| `list` | Utility | Human-readable list |
| `duration` | Utility | Duration formatting |
| `hash` | Utility | Truncate long IDs |
| `iter` | Utility | Convert to iterable |
| `keys` | Utility | Object keys array |
| `values` | Utility | Object values array |
| `custom` | Utility | Apply a custom function |

---

## Related Documentation

- **[Templates](./Templates.md)** — Mustache template syntax and common pitfalls
- **[View](./View.md)** — View template rendering and `getContextValue()`
- **[Model](./Model.md)** — Model `get()` method with pipe support
- **[Collection](./Collection.md)** — Working with collections of models

## Examples

<!-- examples:cross-link begin -->

Runnable, copy-paste reference in the examples portal:

- [`examples/portal/examples/core/DataFormatter/DataFormatterExample.js`](../../../examples/portal/examples/core/DataFormatter/DataFormatterExample.js) — Pipe formatters in templates plus dataFormatter.register and dataFormatter.apply.

<!-- examples:cross-link end -->
