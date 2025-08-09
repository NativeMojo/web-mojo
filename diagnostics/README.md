# MOJO Framework Diagnostics

Development and diagnostic scripts for the MOJO Framework. These tools help with debugging, testing, and development workflow optimization.

## 🔧 Available Scripts

### Testing & Debugging Scripts

#### `debug-test-runner.js`
**Purpose**: Enhanced test runner with detailed debugging output and error analysis.

```bash
node diagnostics/debug-test-runner.js
```

**Features**:
- Verbose test execution logging
- Detailed error reporting with stack traces
- Test execution statistics and timing
- Failed test isolation and analysis
- Debug-friendly output formatting

**Use When**:
- Tests are failing and you need detailed diagnostics
- Investigating test execution issues
- Analyzing test performance and timing

---

#### `test-diagnostics.js`
**Purpose**: Comprehensive test suite analysis and health checking.

```bash
node diagnostics/test-diagnostics.js
```

**Features**:
- Test coverage analysis
- Test file structure validation
- Missing test detection
- Test dependency analysis
- Framework integration testing

**Use When**:
- Auditing test suite completeness
- Analyzing test coverage gaps
- Validating test infrastructure

---

#### `find-missing-tests.js`
**Purpose**: Automatically identifies components and features lacking test coverage.

```bash
node diagnostics/find-missing-tests.js
```

**Features**:
- Scans source code for untested components
- Identifies methods without corresponding tests
- Generates missing test file templates
- Reports test coverage gaps by module
- Suggests test cases for new features

**Use When**:
- Planning test coverage improvements
- Onboarding new developers (shows what needs testing)
- Preparing for releases (ensuring adequate coverage)

---

#### `test-phase2.js`
**Purpose**: Specialized testing for Phase 2 data layer functionality.

```bash
node diagnostics/test-phase2.js
```

**Features**:
- RestModel CRUD operation testing
- DataList collection management testing
- API integration testing
- Data validation testing
- Real-time update testing

**Use When**:
- Developing or debugging Phase 2 features
- Testing data layer integration
- Validating API connectivity

---

#### `test-runner-backup.js`
**Purpose**: Backup test runner with alternative test execution strategies.

```bash
node diagnostics/test-runner-backup.js
```

**Features**:
- Alternative test execution engine
- Legacy test compatibility
- Fallback testing when main runner fails
- Custom test filtering and execution

**Use When**:
- Main test runner is experiencing issues
- Running tests in different environments
- Debugging test execution problems

---

### Development Servers

#### `serve-dev.js`
**Purpose**: Enhanced development server with debugging features and live reload.

```bash
node diagnostics/serve-dev.js
```

**Features**:
- Live reload functionality
- Detailed request/response logging
- Error page with debugging information
- Custom middleware for development
- Hot module replacement support

**Use When**:
- Developing framework components
- Debugging server-side issues
- Need enhanced development features

---

#### `serve-examples.js`
**Purpose**: Specialized server for running and testing example applications.

```bash
node diagnostics/serve-examples.js
```

**Features**:
- Optimized for example applications
- Cross-example navigation
- Example-specific debugging
- Performance monitoring for examples
- Example catalog and indexing

**Use When**:
- Testing example applications
- Demonstrating framework capabilities
- Debugging example-specific issues

## 🚀 Usage Patterns

### Daily Development Workflow

```bash
# Start enhanced development server
node diagnostics/serve-dev.js

# Run comprehensive test diagnostics
node diagnostics/test-diagnostics.js

# Check for missing test coverage
node diagnostics/find-missing-tests.js
```

### Debugging Workflow

```bash
# When tests are failing
node diagnostics/debug-test-runner.js

# When you need detailed test analysis
node diagnostics/test-diagnostics.js

# If main test runner has issues
node diagnostics/test-runner-backup.js
```

### Example Development

```bash
# Serve examples with enhanced features
node diagnostics/serve-examples.js

# Test Phase 2 specific functionality
node diagnostics/test-phase2.js
```

## 📋 Script Categories

### 🧪 Test Analysis
- `debug-test-runner.js` - Detailed test execution
- `test-diagnostics.js` - Test suite health analysis  
- `find-missing-tests.js` - Coverage gap detection
- `test-runner-backup.js` - Alternative test execution

### 📊 Phase-Specific
- `test-phase2.js` - Phase 2 data layer testing

### 🌐 Development Servers  
- `serve-dev.js` - Enhanced development server
- `serve-examples.js` - Example application server

## 🔍 Troubleshooting

### Common Issues

**Scripts won't run:**
```bash
# Ensure you're in the project root
cd web-mojo

# Check Node.js version (requires Node 14+)
node --version

# Install dependencies
npm install
```

**Port conflicts:**
- Development servers use ports 3000-3003 by default
- Check for conflicting processes: `lsof -i :3000`
- Kill conflicting processes: `kill -9 <PID>`

**Permission errors:**
```bash
# Make scripts executable (Unix/macOS)
chmod +x diagnostics/*.js
```

### Debug Output

All diagnostic scripts support verbose output:

```bash
# Enable verbose logging
DEBUG=mojo:* node diagnostics/debug-test-runner.js

# Show timing information
TIME=1 node diagnostics/test-diagnostics.js
```

## 📚 Related Documentation

- **[Testing Guide](../docs/testing/README.md)** - Complete testing documentation
- **[Development Guide](../docs/development/DEVELOPMENT.md)** - Development setup
- **[Phase 2 Guide](../docs/phase-history/PHASE2-COMPLETE.md)** - Phase 2 specifics

## 🛠️ Extending Diagnostic Scripts

### Adding New Scripts

1. Create script in `diagnostics/` folder
2. Follow existing naming patterns
3. Add comprehensive error handling
4. Include usage documentation
5. Update this README

### Script Template

```javascript
#!/usr/bin/env node

/**
 * Script Name - Brief description
 * Usage: node diagnostics/script-name.js [options]
 */

const path = require('path');
const fs = require('fs');

class DiagnosticScript {
  constructor() {
    this.name = 'Script Name';
    this.version = '1.0.0';
  }

  async run() {
    try {
      console.log(`🔧 ${this.name} v${this.version}`);
      console.log('='.repeat(50));
      
      await this.executeMain();
      
      console.log(`✅ ${this.name} completed successfully`);
    } catch (error) {
      console.error(`❌ ${this.name} failed:`, error.message);
      process.exit(1);
    }
  }

  async executeMain() {
    // Main script logic here
  }
}

// Run if called directly
if (require.main === module) {
  new DiagnosticScript().run();
}

module.exports = DiagnosticScript;
```

---

**MOJO Framework Diagnostics v2.0.0** - Development tools for enhanced productivity