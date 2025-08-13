# Changelog

All notable changes to the MOJO Framework (web-mojo) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- TypeScript definitions (planned)
- Advanced chart components (in development)
- Authentication system (in development)
- WebSocket support for real-time updates (planned)

### Changed
- Performance optimizations for large data sets
- Enhanced tree-shaking support

## [2.0.0] - 2024-01-15

### Added
- **Library Distribution Support**
  - NPM package as `web-mojo`
  - ESM, CommonJS, and UMD builds
  - Proper tree-shaking support
  - Development linking workflow
  - Comprehensive library documentation
- **Phase 2: Data Layer (Complete)**
  - RestModel for API integration
  - Collection for data management
  - Validation system with custom rules
  - Search, filtering, and sorting capabilities
  - Model change events and data binding
- **Enhanced Components**
  - FormBuilder with validation
  - FormView for form handling
  - Enhanced Table component with sorting and filtering
  - TablePage for data-driven pages
  - Dialog component for modals
- **Developer Experience**
  - Vite-based build system
  - Hot module replacement (HMR)
  - Comprehensive test suite
  - Development server with live reload
  - Source maps for debugging

### Changed
- **Navigation System Overhaul**
  - Primary href-based navigation for SEO
  - Enhanced data-page attributes with params
  - Removed deprecated hash-based routing
  - Global router access via `window.MOJO.router`
- **Architecture Improvements**
  - Migrated to ES6 modules throughout
  - Consistent camelCase naming convention
  - Improved parent-child view relationships
  - Better lifecycle management
- **Bootstrap 5 Integration**
  - Full native Bootstrap 5 support
  - Removed jQuery dependency
  - Compact UI with `*-sm` classes by default
  - Bootstrap Icons integration

### Fixed
- Memory leaks in view destruction
- Event listener cleanup
- Router navigation edge cases
- Model synchronization issues
- Form validation error handling

### Deprecated
- `data-action="navigate"` pattern (use href or data-page)
- Hash-based routing (use param or history mode)
- Snake_case naming (migrated to camelCase)

## [1.5.0] - 2023-11-01

### Added
- **Phase 1: Core Architecture (Complete)**
  - View hierarchy system with parent-child relationships
  - Page components with routing capabilities
  - Component lifecycle management
  - Event system (EventBus + DOM actions)
- **Core Components**
  - TopNav component for navigation
  - Sidebar component with collapsible menu
  - MainContent wrapper component
  - Basic Table component
- **Utilities**
  - Mustache.js templating integration
  - DataFormatter for data transformation
  - MustacheFormatter for template helpers
  - MOJOUtils for common operations

### Changed
- Restructured project folders for better organization
- Improved documentation structure
- Enhanced example applications

### Fixed
- Router initialization issues
- Template rendering performance
- Memory management in large applications

## [1.0.0] - 2023-09-15

### Added
- Initial framework release
- Basic View and Page classes
- Simple router implementation
- Event handling system
- Bootstrap 4 integration
- Basic documentation
- Example applications

### Changed
- N/A (Initial release)

### Fixed
- N/A (Initial release)

### Security
- N/A (Initial release)

## [0.9.0-beta] - 2023-08-01

### Added
- Beta release for testing
- Core MVC architecture
- Basic routing system
- View rendering engine
- Event management

### Known Issues
- Router doesn't support nested routes
- Limited Bootstrap component integration
- No data layer implementation

---

## Version Guidelines

### Version Format: MAJOR.MINOR.PATCH

- **MAJOR**: Incompatible API changes
- **MINOR**: Backwards-compatible functionality additions
- **PATCH**: Backwards-compatible bug fixes

### Release Cycle

- **Patch releases**: As needed for bug fixes
- **Minor releases**: Monthly for new features
- **Major releases**: Annually or for breaking changes

### Deprecation Policy

- Features marked as deprecated will be supported for at least two minor versions
- Breaking changes will be documented with migration guides
- Security fixes will be backported to the last two major versions

## Links

- [NPM Package](https://www.npmjs.com/package/web-mojo)
- [GitHub Releases](https://github.com/yourusername/web-mojo/releases)
- [Migration Guides](docs/migration/)
- [Security Policy](SECURITY.md)