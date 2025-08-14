# MOJO Mustache Extension Verification Guide

This guide helps you verify that the MOJO Mustache extension is properly installed and working in Zed.

## 📋 Quick Verification Checklist

- [ ] Extension files are in the correct directory
- [ ] Zed has been restarted after installation
- [ ] `.mst` files are recognized as "MOJO Mustache" language
- [ ] Syntax highlighting is working
- [ ] Auto-completion brackets are functional

## 🔍 Step-by-Step Verification

### Step 1: Check Extension Installation

1. **Verify extension directory exists:**
   ```bash
   ls -la ~/.config/zed/extensions/mojo-mustache/
   ```
   You should see:
   - `extension.json`
   - `languages/mustache.json`
   - `grammars/mustache.json`
   - `README.md`

2. **Verify extension.json has correct paths:**
   ```bash
   cat ~/.config/zed/extensions/mojo-mustache/extension.json
   ```
   Should contain:
   ```json
   {
     "languages": ["languages/mustache.json"],
     "grammars": {
       "mustache": "grammars/mustache.json"
     }
   }
   ```

### Step 2: Restart Zed

**Important:** Extensions are only loaded when Zed starts. You MUST restart Zed completely:

1. **On macOS:** `Cmd+Q` to quit, then reopen Zed
2. **On Linux:** Close all Zed windows and reopen
3. **On Windows:** Exit Zed completely and reopen

### Step 3: Test File Recognition

1. **Open a `.mst` file in Zed:**
   ```bash
   zed test-debug.mst
   ```

2. **Check the language indicator:**
   - Look at the **bottom-right corner** of Zed
   - You should see **"MOJO Mustache"** as the language
   - If you see "Plain Text" or something else, the extension isn't working

3. **If the language is wrong:**
   - Right-click in the editor
   - Select "Change Language Mode"
   - Look for "MOJO Mustache" in the list
   - If it's not there, the extension isn't loaded

### Step 4: Verify Syntax Highlighting

Open or create a `.mst` file with this content:

```mustache
<!DOCTYPE html>
<html>
<head>
    <title>{{pageTitle}} - Test</title>
</head>
<body>
    {{! This comment should be highlighted differently }}
    
    <h1>Welcome {{userName}}!</h1>
    
    {{#hasItems}}
    <ul>
        {{#items}}
        <li>{{name}} - {{price}}</li>
        {{/items}}
    </ul>
    {{/hasItems}}
    
    {{^hasItems}}
    <p>No items found</p>
    {{/hasItems}}
    
    {{! MOJO-specific syntax }}
    {{#products}}
    <div class="product">
        <h3>{{.name}}</h3>
        <p>Category: {{categoryName}}</p>
    </div>
    {{/products}}
    
    {{#.categories|iter}}
    <span class="category">{{title}}</span>
    {{/.categories|iter}}
    
    {{> footer}}
</body>
</html>
```

**What you should see:**
- **Mustache tags** (`{{`, `}}`) should be colored differently from HTML
- **Comments** (`{{! ... }}`) should have a muted/comment color
- **Section tags** (`{{#`, `{{/`) should be highlighted as keywords
- **Variables** (`{{name}}`) should have variable coloring
- **HTML tags** should have standard HTML syntax highlighting
- **MOJO-specific syntax** (`.name`, `|iter`) should be highlighted

### Step 5: Test Auto-Completion Features

1. **Type `{{`** - it should automatically add `}}`
2. **Type `{{#`** - it should automatically add `}}`
3. **Test bracket matching** - clicking on `{{` should highlight the matching `}}`

## 🎨 Expected Visual Appearance

When working correctly, you should see distinct colors for:

| Syntax Element | Expected Appearance |
|----------------|-------------------|
| `{{variable}}` | Variable color (usually blue/green) |
| `{{! comment }}` | Comment color (usually gray/muted) |
| `{{#section}}` | Keyword color (usually purple/red) |
| `{{^inverted}}` | Keyword color (usually purple/red) |
| `{{> partial}}` | Special keyword color |
| `{{.property}}` | Variable with special dot highlighting |
| `{{#.array\|iter}}` | Variable with iterator keyword |
| HTML tags | Standard HTML colors |

## 🔧 Troubleshooting

### Problem: Language shows as "Plain Text"

**Solutions:**
1. Restart Zed completely (not just reload window)
2. Check that the file has `.mst` extension (not `.mustache`)
3. Run the debug script: `./debug.sh`
4. Reinstall the extension: `./install.sh`

### Problem: No Syntax Highlighting

**Solutions:**
1. Verify the language is set to "MOJO Mustache" in bottom-right corner
2. Check if your Zed theme supports the syntax scopes
3. Try switching to a different theme temporarily
4. Restart Zed completely

### Problem: Extension Not in Language List

**Solutions:**
1. Check extension.json has correct relative paths
2. Verify all JSON files are valid:
   ```bash
   python3 -m json.tool ~/.config/zed/extensions/mojo-mustache/extension.json
   ```
3. Check Zed's extension directory permissions
4. Reinstall the extension

### Problem: Auto-Completion Not Working

**Solutions:**
1. Check the `languages/mustache.json` file exists
2. Verify the bracket configuration in language file
3. Try creating a new `.mst` file to test

## 📝 Manual Verification Commands

Run these commands to verify your installation:

```bash
# Check if extension directory exists
test -d ~/.config/zed/extensions/mojo-mustache && echo "✅ Extension directory exists" || echo "❌ Extension not found"

# Check all required files
for file in extension.json languages/mustache.json grammars/mustache.json; do
  test -f ~/.config/zed/extensions/mojo-mustache/$file && echo "✅ $file exists" || echo "❌ $file missing"
done

# Validate JSON files
cd ~/.config/zed/extensions/mojo-mustache
for file in extension.json languages/mustache.json grammars/mustache.json; do
  python3 -m json.tool "$file" > /dev/null 2>&1 && echo "✅ $file is valid JSON" || echo "❌ $file has invalid JSON"
done
```

## 🆘 Getting Help

If the extension still isn't working:

1. **Run the debug script:**
   ```bash
   cd web-mojo/zed-extension
   ./debug.sh
   ```

2. **Check Zed's logs:**
   - macOS: `~/Library/Logs/Zed/`
   - Linux: `~/.local/share/zed/logs/`
   - Windows: `%APPDATA%\Zed\logs\`

3. **Try the built-in mustache extension:**
   - Open Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
   - Search for "Extensions"
   - Look for official mustache extensions

4. **Create a minimal test case:**
   ```bash
   echo '{{test}}' > minimal.mst
   zed minimal.mst
   ```

## ✅ Success Indicators

You'll know the extension is working correctly when:

- ✅ `.mst` files show "MOJO Mustache" in the language indicator
- ✅ Mustache syntax has distinct colors from HTML
- ✅ Comments (`{{! ... }}`) are visually muted
- ✅ Section tags (`{{#`, `{{/`) are highlighted as keywords
- ✅ MOJO-specific syntax (`.property`, `|iter`) is highlighted
- ✅ Auto-closing brackets work for `{{` and `}}`
- ✅ Bracket matching highlights corresponding `{{` and `}}`

## 🎯 Final Test

Create this file and open it in Zed:

```mustache
{{! MOJO Mustache Extension Test File }}
<div>
    {{title}}
    {{#.items|iter}}
        <span>{{.name}}</span>
    {{/.items|iter}}
</div>
```

If you see proper syntax highlighting with distinct colors for each element type, your extension is working perfectly! 🎉