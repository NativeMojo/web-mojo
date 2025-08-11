# MOJO Framework Documentation

Welcome to the comprehensive documentation for MOJO Framework - a lightweight, modern ES6 JavaScript UI framework built on Bootstrap 5.

## 🚀 Quick Start

```bash
# Clone and setup
git clone <repository-url>
cd web-mojo
npm install

# Start development server
npm run dev

# Visit examples
open http://localhost:3000/examples/
```

## 📚 Documentation Structure

### 🎯 User Guides
**Perfect for getting started and learning core concepts**

- [**Getting Started**](user-guide/README-Phase1.md) - Complete Phase 1 user guide
- [**Navigation System**](user-guide/NAVIGATION-SYSTEM.md) - Modern href + data-page navigation
- [**Design Guidelines**](user-guide/design.md) - UI/UX principles and component guidelines
- [**Framework Design**](user-guide/mojo_design_doc.md) - Architecture and design patterns

### 🔧 Development
**Documentation for framework development and contribution**

- [**Development Setup**](development/DEVELOPMENT.md) - Development environment and workflow
- [**Debug Tools**](development/DEBUG-COMPLETE.md) - Debugging tools and techniques
- [**Build System**](development/build.md) - Vite build system and processes
- [**Unified Data Access**](improvements/Unified-Data-Access.md) - Consistent data access with pipe formatting
- [**Data Formatter Design**](improvements/DataFormatter-Design.md) - Data formatting system architecture

### 📈 Phase History
**Complete timeline of framework evolution**

- [**Phase 1 Complete**](phase-history/PHASE1-COMPLETE.md) - Core architecture implementation
- [**Phase 2 Complete**](phase-history/PHASE2-COMPLETE.md) - Data layer implementation  
- [**Phase 2.1 Unified Data**](phase-history/PHASE2.1-UNIFIED-DATA.md) - Unified data access with pipes
- [**Phase 2 Summary**](phase-history/PHASE2-SUMMARY.md) - Quick reference for Phase 2
- [**Phase 2 Quick Reference**](phase-history/PHASE2-QUICK-REFERENCE.md) - API reference

### 🧩 Components
**Documentation for framework components**

- [**Navigation Components**](components/navigation.md) - TopNav, Sidebar, MainContent
- [**Table Component**](components/MOJO-TABLE-COMPONENT-DEMO.md) - Advanced table functionality
- [**Form Components**](components/forms.md) - FormBuilder and form controls
- [**Core Components**](components/core.md) - View, Page, Router, EventBus

### 🧪 Testing
**Testing documentation and guides**

- [**Testing Guide**](testing/README.md) - Complete testing documentation
- [**Test Completion**](testing/TEST-COMPLETION-FINAL.md) - Testing milestones
- [**Test Quick Reference**](testing/TESTS-QUICK-REFERENCE.md) - API and patterns

### 📖 Examples
**Example applications and tutorials**

- [**Examples Overview**](examples/README.md) - All example applications
- [**Basic Navigation**](examples/basic-nav.md) - Simple navigation example
- [**Sidebar Navigation**](examples/sidebar-nav.md) - Advanced sidebar example
- [**Examples Cleanup**](examples/EXAMPLES-CLEAN.md) - Example organization

### 🎯 Framework Overview

MOJO is designed around these core principles:

- **🏗️ MVC Architecture** - Clean separation with Models, Views, and Controllers
- **🚀 Modern JavaScript** - ES6+, async/await, modules
- **📱 Bootstrap 5 Native** - Full integration with Bootstrap components
- **🔄 Component Lifecycle** - Predictable init → render → mount → destroy
- **🎨 Template Engine** - Mustache.js for dynamic content
- **🛣️ Modern Routing** - SEO-friendly navigation with copy-link support
- **🔧 Unified Data Access** - Consistent data retrieval with pipe formatting everywhere

## 📋 Current Status

### ✅ Phase 1: Core Architecture (Complete)
- View hierarchy system with parent-child relationships
- Page components with routing capabilities  
- Component lifecycle management
- Event system (EventBus + DOM actions)
- Template rendering with Mustache.js
- Development tools and debugging

### ✅ Phase 2: Data Layer (Complete)  
- RestModel for API integration
- DataList for collection management
- Validation system
- Search, filtering, and sorting
- Real-time data updates

### ✅ Phase 2.1: Unified Data Access (Complete)
- Universal `get()` method for all data access
- Pipe formatting everywhere (templates, JavaScript, nested contexts)
- Automatic data wrapping for plain objects
- Deep namespace access with dot notation
- Seamless Mustache template integration
- DataFormatter enhancements and bug fixes

### 🚧 Phase 3: Advanced UI Components (Planned)
- Advanced Table component
- FormBuilder with validation
- Chart integration
- Authentication system

## 🗂️ File Organization

```
docs/
├── README.md                 # This file - main documentation index
├── user-guide/              # End-user documentation
│   ├── README-Phase1.md      # Complete Phase 1 guide
│   ├── NAVIGATION-SYSTEM.md  # Navigation system guide
│   ├── design.md             # Design guidelines
│   └── mojo_design_doc.md    # Framework architecture
├── development/              # Developer documentation
│   ├── DEVELOPMENT.md        # Development setup
│   ├── DEBUG-COMPLETE.md     # Debug tools
│   └── build.md              # Build system
├── improvements/             # Framework improvements
│   ├── Unified-Data-Access.md  # Unified data access pattern
│   └── DataFormatter-Design.md # Data formatting system
├── phase-history/            # Historical documentation
│   ├── PHASE1-COMPLETE.md    # Phase 1 completion
│   ├── PHASE2-COMPLETE.md    # Phase 2 completion
│   ├── PHASE2.1-UNIFIED-DATA.md # Phase 2.1 unified data access
│   ├── PHASE2-SUMMARY.md     # Phase 2 summary
│   └── PHASE2-QUICK-REFERENCE.md
├── components/               # Component documentation
│   ├── navigation.md         # Navigation components
│   ├── MOJO-TABLE-COMPONENT-DEMO.md
│   └── forms.md              # Form components
├── testing/                  # Testing documentation
│   ├── README.md             # Testing guide
│   ├── TEST-COMPLETION-FINAL.md
│   └── TESTS-QUICK-REFERENCE.md
└── examples/                 # Example documentation
    ├── README.md             # Examples overview
    └── EXAMPLES-CLEAN.md     # Example organization
```

## 🚀 Getting Started Paths

### 👋 New to MOJO?
1. Read [**Getting Started**](user-guide/README-Phase1.md)
2. Explore [**Examples**](examples/README.md)  
3. Try [**Basic Navigation Example**](../examples/basic-nav/)
4. Review [**Design Guidelines**](user-guide/design.md)

### 🔧 Contributing to MOJO?
1. Set up [**Development Environment**](development/DEVELOPMENT.md)
2. Review [**Framework Architecture**](user-guide/mojo_design_doc.md)
3. Check [**Testing Guide**](testing/README.md)
4. Explore [**Phase History**](phase-history/) to understand evolution

### 🧩 Building Components?
1. Study [**Component Documentation**](components/)
2. Review [**Navigation System**](user-guide/NAVIGATION-SYSTEM.md)
3. Check [**Existing Components**](../src/components/)
4. Follow [**Design Guidelines**](user-guide/design.md)

## 🛠️ Development Commands

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production  
npm run watch           # Watch mode development

# Testing
npm test                # Run all tests
npm run test:unit       # Unit tests only
npm run test:integration # Integration tests only

# Examples
npm run serve:examples  # Serve examples directory
```

## 📞 Support & Resources

- **Examples**: Live examples at `/examples/`
- **Source Code**: Framework source in `/src/`
- **Tests**: Test suite in `/test/`  
- **Issues**: Check phase completion documents for known issues
- **Development**: See development documentation for contribution guidelines

---

**MOJO Framework v2.1.0** - Modern JavaScript UI Framework  
Built with ❤️ and modern web standards