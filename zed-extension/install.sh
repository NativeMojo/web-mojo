#!/bin/bash

# MOJO Mustache Extension for Zed - Installation Script
# This script installs the MOJO Mustache language extension for Zed Editor

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Extension details
EXTENSION_ID="mojo-mustache"
EXTENSION_NAME="MOJO Mustache"

echo -e "${BLUE}MOJO Mustache Extension Installer for Zed${NC}"
echo "=========================================="

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Detect operating system
detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "linux"
    elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
        echo "windows"
    else
        echo "unknown"
    fi
}

# Get Zed extensions directory based on OS
get_zed_extensions_dir() {
    local os=$(detect_os)

    case $os in
        "macos")
            echo "$HOME/Library/Application Support/Zed/extensions"
            ;;
        "linux")
            echo "$HOME/.config/zed/extensions"
            ;;
        "windows")
            echo "$APPDATA/Zed/extensions"
            ;;
        *)
            print_error "Unsupported operating system: $OSTYPE"
            exit 1
            ;;
    esac
}

# Check if Zed is installed
check_zed_installation() {
    if command -v zed &> /dev/null; then
        print_success "Zed editor found in PATH"
        return 0
    fi

    # Check common installation locations
    local zed_paths=(
        "/Applications/Zed.app/Contents/MacOS/zed"
        "/usr/local/bin/zed"
        "/opt/zed/zed"
    )

    for path in "${zed_paths[@]}"; do
        if [[ -f "$path" ]]; then
            print_success "Zed editor found at $path"
            return 0
        fi
    done

    print_warning "Zed editor not found. Please ensure Zed is installed."
    print_info "You can download Zed from: https://zed.dev"
    read -p "Continue with installation anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
}

# Main installation function
install_extension() {
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    local extensions_dir=$(get_zed_extensions_dir)
    local target_dir="$extensions_dir/$EXTENSION_ID"

    print_info "Installing $EXTENSION_NAME extension..."
    print_info "Target directory: $target_dir"

    # Create extensions directory if it doesn't exist
    if [[ ! -d "$extensions_dir" ]]; then
        print_info "Creating Zed extensions directory: $extensions_dir"
        mkdir -p "$extensions_dir"
    fi

    # Remove existing installation if it exists
    if [[ -d "$target_dir" ]]; then
        print_info "Removing existing installation..."
        rm -rf "$target_dir"
    fi

    # Create target directory
    mkdir -p "$target_dir"

    # Copy extension files
    local files_to_copy=(
      "languages/mojo-mustache/config.toml"
      "languages/mojo-mustache/highlights.scm"
      "languages/mojo-mustache/brackets.scm"
      "languages/mojo-mustache/outline.scm"
      "README.md"
    )

    for file in "${files_to_copy[@]}"; do
      local source_file="$script_dir/$file"
      local target_file="$target_dir/$file"

      if [[ -f "$source_file" ]]; then
        # Create directory if needed
        mkdir -p "$(dirname "$target_file")"
        cp "$source_file" "$target_file"
        print_info "Copied: $file"
      else
        print_error "Source file not found: $source_file"
        exit 1
      fi
    done

    # Create corrected extension.toml with relative paths
    cat > "$target_dir/extension.toml" << 'EOF'
id = "mojo-mustache"
name = "MOJO Mustache"
version = "1.0.0"
schema_version = 1
description = "Language support for MOJO Mustache (.mst) templates"
repository = "https://github.com/your-org/web-mojo"
authors = ["MOJO Team"]

languages = ["languages/mojo-mustache"]

[grammars.mustache]
repository = "https://github.com/mustache/tree-sitter-mustache"
rev = "4c940a66e0e19a8b37b2fa1b8cb60c88a0bca69b"
EOF
    print_info "Created: extension.toml with corrected paths"

    # Set proper permissions
    chmod -R 644 "$target_dir"/*
    find "$target_dir" -type d -exec chmod 755 {} \;

    print_success "Extension installed successfully!"
}

# Verification function
verify_installation() {
    local extensions_dir=$(get_zed_extensions_dir)
    local target_dir="$extensions_dir/$EXTENSION_ID"

    if [[ -f "$target_dir/extension.toml" ]]; then
        print_success "Installation verified: extension.toml found"
        return 0
    else
        print_error "Installation verification failed: extension.toml not found"
        return 1
    fi
}

# Uninstall function
uninstall_extension() {
    local extensions_dir=$(get_zed_extensions_dir)
    local target_dir="$extensions_dir/$EXTENSION_ID"

    if [[ -d "$target_dir" ]]; then
        print_info "Uninstalling $EXTENSION_NAME extension..."
        rm -rf "$target_dir"
        print_success "Extension uninstalled successfully!"
    else
        print_warning "Extension not found at: $target_dir"
    fi
}

# Main script logic
main() {
    case "${1:-install}" in
        "install")
            check_zed_installation
            install_extension
            verify_installation
            echo
            print_success "Installation complete!"
            print_info "Please restart Zed or reload the window to activate the extension."
            print_info "The extension will provide syntax highlighting for .mst files."
            ;;
        "uninstall")
            uninstall_extension
            ;;
        "verify")
            if verify_installation; then
                echo "Extension is properly installed."
            else
                echo "Extension is not installed or installation is corrupted."
                exit 1
            fi
            ;;
        "help"|"-h"|"--help")
            echo "Usage: $0 [command]"
            echo
            echo "Commands:"
            echo "  install    Install the MOJO Mustache extension (default)"
            echo "  uninstall  Remove the extension"
            echo "  verify     Check if the extension is installed correctly"
            echo "  help       Show this help message"
            echo
            echo "Examples:"
            echo "  $0              # Install the extension"
            echo "  $0 install      # Install the extension"
            echo "  $0 uninstall    # Remove the extension"
            echo "  $0 verify       # Verify installation"
            ;;
        *)
            print_error "Unknown command: $1"
            print_info "Use '$0 help' to see available commands"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
