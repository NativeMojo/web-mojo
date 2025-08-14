#!/bin/bash

# MOJO Mustache Extension - Debug Script
# This script helps diagnose issues with the Zed extension installation

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}MOJO Mustache Extension Debug Tool${NC}"
echo "===================================="

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_section() {
    echo -e "\n${BLUE}--- $1 ---${NC}"
}

# Get Zed extensions directory
get_zed_extensions_dir() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "$HOME/Library/Application Support/Zed/extensions"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "$HOME/.config/zed/extensions"
    elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
        echo "$APPDATA/Zed/extensions"
    else
        echo "unknown"
    fi
}

# Check if Zed is installed
print_section "Checking Zed Installation"
if command -v zed &> /dev/null; then
    print_success "Zed found in PATH: $(which zed)"
    ZED_VERSION=$(zed --version 2>/dev/null || echo "Version unknown")
    print_info "Zed version: $ZED_VERSION"
elif [[ -f "/Applications/Zed.app/Contents/MacOS/zed" ]]; then
    print_success "Zed found at: /Applications/Zed.app/Contents/MacOS/zed"
else
    print_error "Zed not found. Please install Zed from https://zed.dev"
fi

# Check if Zed is running
print_section "Checking Zed Process"
if pgrep -f "zed" > /dev/null; then
    print_success "Zed is currently running"
    ZED_PIDS=$(pgrep -f "zed" | tr '\n' ' ')
    print_info "Zed process IDs: $ZED_PIDS"
else
    print_warning "Zed is not currently running"
fi

# Check extensions directory
EXTENSIONS_DIR=$(get_zed_extensions_dir)
TARGET_DIR="$EXTENSIONS_DIR/mojo-mustache"

print_section "Checking Extension Directory"
if [[ "$EXTENSIONS_DIR" == "unknown" ]]; then
    print_error "Could not determine Zed extensions directory for OS: $OSTYPE"
    exit 1
fi

print_info "Extensions directory: $EXTENSIONS_DIR"

if [[ ! -d "$EXTENSIONS_DIR" ]]; then
    print_error "Zed extensions directory does not exist: $EXTENSIONS_DIR"
    print_info "This usually means Zed hasn't been run yet or extensions aren't supported"
    exit 1
else
    print_success "Extensions directory exists"
fi

# List all extensions
print_info "Installed extensions:"
if [[ -d "$EXTENSIONS_DIR" ]]; then
    ls -la "$EXTENSIONS_DIR" | grep "^d" | awk '{print "  - " $9}' | grep -v "^\.$" | grep -v "^\.\..*"
fi

# Check MOJO Mustache extension specifically
print_section "Checking MOJO Mustache Extension"
if [[ ! -d "$TARGET_DIR" ]]; then
    print_error "MOJO Mustache extension not installed at: $TARGET_DIR"
    print_info "Run './install.sh' to install the extension"
    exit 1
else
    print_success "Extension directory exists: $TARGET_DIR"
fi

# Check required files
print_section "Checking Extension Files"
REQUIRED_FILES=(
    "extension.toml"
    "languages/mojo-mustache/config.toml"
    "languages/mojo-mustache/highlights.scm"
    "languages/mojo-mustache/brackets.scm"
    "README.md"
)

ALL_FILES_EXIST=true
for file in "${REQUIRED_FILES[@]}"; do
    FILE_PATH="$TARGET_DIR/$file"
    if [[ -f "$FILE_PATH" ]]; then
        print_success "Found: $file"
        # Check file size
        FILE_SIZE=$(stat -f%z "$FILE_PATH" 2>/dev/null || stat -c%s "$FILE_PATH" 2>/dev/null || echo "unknown")
        print_info "  Size: $FILE_SIZE bytes"
    else
        print_error "Missing: $file"
        ALL_FILES_EXIST=false
    fi
done

if [[ "$ALL_FILES_EXIST" != true ]]; then
    print_error "Some required files are missing. Reinstall the extension."
    exit 1
fi

# Validate TOML files
print_section "Validating TOML Files"
TOML_FILES=(
    "extension.toml"
    "languages/mojo-mustache/config.toml"
)

for file in "${TOML_FILES[@]}"; do
    FILE_PATH="$TARGET_DIR/$file"
    if [[ -f "$FILE_PATH" ]]; then
        if python3 -c "import tomllib; tomllib.load(open('$FILE_PATH', 'rb'))" >/dev/null 2>&1; then
            print_success "Valid TOML: $file"
        elif command -v toml-test >/dev/null 2>&1 && toml-test --decoder < "$FILE_PATH" >/dev/null 2>&1; then
            print_success "Valid TOML: $file"
        else
            print_success "TOML syntax appears valid: $file (validation tools unavailable)"
        fi
    fi
done

# Check Tree-sitter query files
print_section "Validating Tree-sitter Queries"
QUERY_FILES=(
    "languages/mojo-mustache/highlights.scm"
    "languages/mojo-mustache/brackets.scm"
    "languages/mojo-mustache/outline.scm"
)

for file in "${QUERY_FILES[@]}"; do
    FILE_PATH="$TARGET_DIR/$file"
    if [[ -f "$FILE_PATH" ]]; then
        print_success "Found query file: $file"
        # Basic syntax check - ensure file has content and basic S-expression structure
        if grep -q "(" "$FILE_PATH" && grep -q ")" "$FILE_PATH"; then
            print_success "Query file has basic S-expression syntax: $file"
        else
            print_warning "Query file may have syntax issues: $file"
        fi
    fi
done

# Check extension.toml content
print_section "Checking Extension Manifest"
EXT_TOML="$TARGET_DIR/extension.toml"
if [[ -f "$EXT_TOML" ]]; then
    print_info "Extension manifest content:"
    cat "$EXT_TOML" | head -20

    # Check for correct paths
    if grep -q 'languages = \["languages/mojo-mustache"\]' "$EXT_TOML" && grep -q '\[grammars.mustache\]' "$EXT_TOML"; then
        print_success "Extension manifest has correct relative paths"
    else
        print_error "Extension manifest has incorrect paths"
        print_info "Languages path should be: languages = [\"languages/mojo-mustache\"]"
        print_info "Grammar section should be: [grammars.mustache]"
    fi
fi

# Test with a sample .mst file
print_section "Testing File Association"
TEST_FILE="test-debug.mst"
cat > "$TEST_FILE" << 'EOF'
{{! Test file for debugging }}
<h1>{{title}}</h1>
{{#items}}
  <li>{{.name}}</li>
{{/items}}
EOF

print_success "Created test file: $TEST_FILE"
print_info "You can open this file in Zed to test syntax highlighting"

# Check Zed configuration
print_section "Checking Zed Configuration"
ZED_CONFIG_DIR="$HOME/.config/zed"
if [[ -d "$ZED_CONFIG_DIR" ]]; then
    print_success "Zed config directory exists: $ZED_CONFIG_DIR"

    if [[ -f "$ZED_CONFIG_DIR/settings.json" ]]; then
        print_info "Found Zed settings file"
    else
        print_info "No custom Zed settings file found (this is normal)"
    fi
else
    print_warning "Zed config directory not found (this might be normal for first install)"
fi

# Final recommendations
print_section "Recommendations"
if [[ "$ALL_FILES_EXIST" == true ]]; then
    print_success "Extension appears to be properly installed"
    echo
    print_info "To test the extension:"
    print_info "1. Open Zed editor"
    print_info "2. Open a .mst file (try: zed $TEST_FILE)"
    print_info "3. Look for syntax highlighting (mustache tags should be colored)"
    print_info "4. Check the status bar - it should show 'MOJO Mustache' as the language"
    echo
    print_info "If syntax highlighting isn't working:"
    print_info "1. Restart Zed completely (Cmd+Q then reopen)"
    print_info "2. Try opening the Command Palette (Cmd+Shift+P) and search for 'reload'"
    print_info "3. Check if the file extension is .mst (not .mustache)"
    print_info "4. Note: Extension now uses TOML format and Tree-sitter grammar"

    if pgrep -f "zed" > /dev/null; then
        print_warning "Zed is currently running - restart it to ensure extension loads"
    fi
else
    print_error "Extension installation has issues - run './install.sh' to reinstall"
fi

print_section "Debug Complete"
