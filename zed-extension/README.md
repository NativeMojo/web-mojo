# MOJO Mustache Extension for Zed

A language extension for [Zed](https://zed.dev) that provides syntax highlighting and language support for MOJO Mustache template files (`.mst`).

## Features

- **Syntax Highlighting**: Full syntax highlighting for MOJO Mustache templates
- **File Recognition**: Automatic recognition of `.mst` files
- **Smart Brackets**: Auto-closing and matching for mustache tags and HTML elements
- **Comments**: Support for mustache comments (`{{! comment }}`)
- **Code Folding**: Collapsible sections for mustache blocks and HTML elements

## Supported Mustache Syntax

This extension supports the complete MOJO Mustache syntax, including:

### Variables
```mustache
{{name}}          <!-- Escaped output -->
{{&htmlContent}}  <!-- Unescaped output -->
{{{htmlContent}}} <!-- Triple-brace unescaped -->
```

### Sections
```mustache
{{#items}}
  <li>{{name}}</li>
{{/items}}
```

### Inverted Sections
```mustache
{{^items}}
  <p>No items found</p>
{{/items}}
```

### Comments
```mustache
{{! This is a comment }}
```

### Partials
```mustache
{{> header}}
```

### MOJO-Specific Features

#### Dot-Prefix Syntax
The extension highlights MOJO's special dot-prefix syntax for context isolation:
```mustache
{{#items}}
  <p>Item: {{.name}}</p>         <!-- Current context only -->
  <p>Parent: {{parentName}}</p>   <!-- Walks up context chain -->
{{/items}}
```

#### Iterator Operator
Special highlighting for the `|iter` operator:
```mustache
{{#.items|iter}}
  <li>{{name}}</li>
{{/.items|iter}}
```

## Installation

### Method 1: Local Development
1. Clone or copy this extension to your Zed extensions directory
2. Open Zed and the extension should be automatically loaded

### Method 2: From Source
1. Navigate to your Zed extensions directory:
   - macOS: `~/.config/zed/extensions/`
   - Linux: `~/.config/zed/extensions/`
   - Windows: `%APPDATA%\Zed\extensions\`

2. Create a `mojo-mustache` directory and copy the extension files

3. Restart Zed or reload the window

## Configuration

The extension uses the following default settings:

- **Tab Size**: 2 spaces
- **Soft Tabs**: Enabled
- **Preferred Line Length**: 100 characters
- **Auto-indent**: Uses last non-empty line for indentation

You can override these in your Zed settings:

```json
{
  "languages": {
    "MOJO Mustache": {
      "tab_size": 4,
      "preferred_line_length": 120
    }
  }
}
```

## Language Features

### Bracket Matching
The extension provides intelligent bracket matching for:
- Mustache tags: `{{` and `}}`
- Section tags: `{{#` and `{{/`
- HTML tags: `<` and `>`
- Quotes: `"` and `'`

### Code Folding
You can fold:
- Mustache sections (`{{#section}}...{{/section}}`)
- HTML blocks (div, table, head, etc.)
- Large comment blocks

### Word Selection
Smart word selection includes:
- Letters (a-z, A-Z)
- Numbers (0-9)
- Underscores (_)
- Hyphens (-)
- Dots (.) for property access

## File Association

The extension automatically associates with:
- `.mst` files (MOJO Mustache templates)

## Development

This extension is part of the MOJO Framework ecosystem. For more information about MOJO Mustache templates, see the [MOJO Framework documentation](https://github.com/your-org/web-mojo).

### Grammar Structure

The extension uses a TextMate grammar with the following scopes:
- `text.html.mustache.mojo` - Root scope
- `comment.block.mustache.mojo` - Comments
- `meta.tag.template.section.mustache.mojo` - Section tags
- `variable.other.mustache.mojo` - Variables
- `keyword.operator.accessor.mustache.mojo` - Dot operators
- `keyword.other.iterator.mustache.mojo` - Iterator operators

## Contributing

Contributions are welcome! Please ensure that:
1. New syntax patterns are tested with real MOJO templates
2. The grammar follows TextMate conventions
3. Changes maintain compatibility with existing `.mst` files

## License

This extension is released under the same license as the MOJO Framework.

## Version History

- **1.0.0** - Initial release with full MOJO Mustache syntax support