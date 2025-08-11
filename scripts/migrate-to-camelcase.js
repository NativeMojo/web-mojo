#!/usr/bin/env node

/**
 * MOJO Framework - Snake Case to Camel Case Migration Script
 * 
 * This script helps migrate the codebase from snake_case to camelCase naming conventions
 * to align with JavaScript best practices.
 * 
 * Usage:
 *   node scripts/migrate-to-camelcase.js [options]
 * 
 * Options:
 *   --dry-run    Preview changes without modifying files
 *   --backup     Create backup files before migration
 *   --verbose    Show detailed migration log
 *   --path       Specific path to migrate (default: src and examples)
 *   --help       Show this help message
 */

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  dryRun: args.includes('--dry-run'),
  backup: args.includes('--backup'),
  verbose: args.includes('--verbose'),
  help: args.includes('--help'),
  paths: []
};

// Extract paths from arguments
let pathIndex = args.indexOf('--path');
if (pathIndex !== -1 && args[pathIndex + 1]) {
  options.paths.push(args[pathIndex + 1]);
} else {
  // Default paths to migrate
  options.paths = ['src', 'examples', 'test'];
}

// Show help if requested
if (options.help) {
  console.log(`
MOJO Framework - Snake Case to Camel Case Migration Script

Usage:
  node scripts/migrate-to-camelcase.js [options]

Options:
  --dry-run    Preview changes without modifying files
  --backup     Create backup files before migration
  --verbose    Show detailed migration log
  --path       Specific path to migrate (default: src, examples, test)
  --help       Show this help message

Examples:
  # Preview changes without modifying files
  node scripts/migrate-to-camelcase.js --dry-run

  # Migrate with backups
  node scripts/migrate-to-camelcase.js --backup

  # Migrate specific directory
  node scripts/migrate-to-camelcase.js --path examples/pages --verbose
`);
  process.exit(0);
}

// Migration mappings
const methodMappings = {
  // Lifecycle methods
  'on_init': 'onInit',
  'on_params': 'onParams',
  'on_before_render': 'onBeforeRender',
  'on_after_render': 'onAfterRender',
  'on_before_mount': 'onBeforeMount',
  'on_after_mount': 'onAfterMount',
  'on_before_destroy': 'onBeforeDestroy',
  'on_after_destroy': 'onAfterDestroy',
  
  // TablePage methods
  'on_item_clicked': 'onItemClicked',
  'on_item_dlg': 'onItemDialog',
  
  // Authentication methods
  'on_jwt_login': 'onJwtLogin',
  'on_passkey_login': 'onPasskeyLogin',
  'on_passkey_register': 'onPasskeyRegister',
  'on_google_login': 'onGoogleLogin',
  'on_mfa_verify': 'onMfaVerify'
};

const propertyMappings = {
  // Page properties
  'page_name': 'pageName',
  
  // Table properties
  'collection_params': 'collectionParams',
  'group_filtering': 'groupFiltering',
  'list_options': 'listOptions',
  
  // Navigation properties
  'user_menu': 'userMenu',
  'menu_items': 'menuItems',
  
  // Chart properties
  'chart_type': 'chartType',
  'chart_data': 'chartData',
  'chart_options': 'chartOptions',
  
  // Authentication properties
  'auth_methods': 'authMethods',
  
  // Form properties
  'search_field': 'searchField',
  'display_field': 'displayField',
  'value_field': 'valueField',
  'min_chars': 'minChars',
  
  // Portal properties
  'user_dropdown': 'userDropdown',
  'sidebar_width': 'sidebarWidth',
  'topnav_height': 'topnavHeight',
  
  // API properties
  'base_url': 'baseUrl',
  'api_key': 'apiKey',
  'auth_token': 'authToken'
};

// Statistics
const stats = {
  filesProcessed: 0,
  filesModified: 0,
  methodsConverted: 0,
  propertiesConverted: 0,
  actionHandlersConverted: 0,
  errors: []
};

/**
 * Convert snake_case to camelCase
 */
function toCamelCase(str) {
  return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
}

/**
 * Convert action handler names (on_action_* to onAction*)
 */
function convertActionHandler(methodName) {
  if (methodName.startsWith('on_action_')) {
    const actionName = methodName.substring(10); // Remove 'on_action_'
    const camelAction = actionName.split('_').map((word, index) => 
      index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
    ).join('');
    return 'onAction' + camelAction.charAt(0).toUpperCase() + camelAction.slice(1);
  }
  return null;
}

/**
 * Process a JavaScript file
 */
function processFile(filePath) {
  if (!filePath.endsWith('.js')) return;
  
  stats.filesProcessed++;
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    let changes = [];
    
    // Convert lifecycle and special methods
    for (const [oldName, newName] of Object.entries(methodMappings)) {
      const methodRegex = new RegExp(`\\b${oldName}\\(`, 'g');
      const matches = content.match(methodRegex);
      if (matches) {
        content = content.replace(methodRegex, `${newName}(`);
        changes.push(`  Method: ${oldName}() → ${newName}() (${matches.length} occurrences)`);
        stats.methodsConverted += matches.length;
      }
    }
    
    // Convert action handlers (on_action_* pattern)
    const actionHandlerRegex = /\bon_action_[a-z_]+\(/g;
    const actionMatches = content.match(actionHandlerRegex);
    if (actionMatches) {
      actionMatches.forEach(match => {
        const methodName = match.slice(0, -1); // Remove the '('
        const newName = convertActionHandler(methodName);
        if (newName) {
          content = content.replace(new RegExp(`\\b${methodName}\\(`, 'g'), `${newName}(`);
          changes.push(`  Action: ${methodName}() → ${newName}()`);
          stats.actionHandlersConverted++;
        }
      });
    }
    
    // Convert property names in object literals
    for (const [oldName, newName] of Object.entries(propertyMappings)) {
      // Match property definitions in objects
      const propRegex = new RegExp(`(['"]?)${oldName}\\1\\s*:`, 'g');
      const matches = content.match(propRegex);
      if (matches) {
        content = content.replace(propRegex, `$1${newName}$1:`);
        changes.push(`  Property: ${oldName} → ${newName} (${matches.length} occurrences)`);
        stats.propertiesConverted += matches.length;
      }
      
      // Match property access (this.old_name)
      const accessRegex = new RegExp(`\\.${oldName}\\b`, 'g');
      const accessMatches = content.match(accessRegex);
      if (accessMatches) {
        content = content.replace(accessRegex, `.${newName}`);
        changes.push(`  Access: this.${oldName} → this.${newName} (${accessMatches.length} occurrences)`);
        stats.propertiesConverted += accessMatches.length;
      }
    }
    
    // Check if file was modified
    if (content !== originalContent) {
      stats.filesModified++;
      
      console.log(`\n📝 ${path.relative(process.cwd(), filePath)}`);
      changes.forEach(change => console.log(change));
      
      if (!options.dryRun) {
        // Create backup if requested
        if (options.backup) {
          const backupPath = filePath + '.backup';
          fs.writeFileSync(backupPath, originalContent);
          console.log(`  ✅ Backup created: ${path.basename(backupPath)}`);
        }
        
        // Write modified content
        fs.writeFileSync(filePath, content);
        console.log(`  ✅ File updated`);
      } else {
        console.log(`  ⚠️  DRY RUN - File not modified`);
      }
    } else if (options.verbose) {
      console.log(`✓ ${path.relative(process.cwd(), filePath)} - No changes needed`);
    }
    
  } catch (error) {
    stats.errors.push({ file: filePath, error: error.message });
    console.error(`❌ Error processing ${filePath}: ${error.message}`);
  }
}

/**
 * Recursively process directory
 */
function processDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    console.error(`❌ Path does not exist: ${dirPath}`);
    return;
  }
  
  const items = fs.readdirSync(dirPath);
  
  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);
    
    // Skip node_modules, dist, and other build directories
    if (item === 'node_modules' || item === 'dist' || item === 'build' || item === '.git') {
      continue;
    }
    
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (stat.isFile() && item.endsWith('.js')) {
      processFile(fullPath);
    }
  }
}

// Main execution
console.log('🚀 MOJO Framework - Snake Case to Camel Case Migration\n');
console.log('Options:');
console.log(`  Dry Run: ${options.dryRun ? 'Yes (preview only)' : 'No (will modify files)'}`);
console.log(`  Backup: ${options.backup ? 'Yes' : 'No'}`);
console.log(`  Verbose: ${options.verbose ? 'Yes' : 'No'}`);
console.log(`  Paths: ${options.paths.join(', ')}`);
console.log('\n' + '='.repeat(60));

// Process each path
for (const targetPath of options.paths) {
  const fullPath = path.join(process.cwd(), targetPath);
  console.log(`\n📂 Processing: ${targetPath}`);
  processDirectory(fullPath);
}

// Display summary
console.log('\n' + '='.repeat(60));
console.log('\n📊 Migration Summary:\n');
console.log(`  Files processed: ${stats.filesProcessed}`);
console.log(`  Files modified: ${stats.filesModified}`);
console.log(`  Methods converted: ${stats.methodsConverted}`);
console.log(`  Properties converted: ${stats.propertiesConverted}`);
console.log(`  Action handlers converted: ${stats.actionHandlersConverted}`);

if (stats.errors.length > 0) {
  console.log(`\n❌ Errors (${stats.errors.length}):`);
  stats.errors.forEach(err => {
    console.log(`  - ${err.file}: ${err.error}`);
  });
}

if (options.dryRun) {
  console.log('\n⚠️  This was a DRY RUN. No files were modified.');
  console.log('Remove --dry-run flag to apply changes.');
} else if (stats.filesModified > 0) {
  console.log('\n✅ Migration completed successfully!');
  if (options.backup) {
    console.log('Backup files created with .backup extension.');
  }
  console.log('\nNext steps:');
  console.log('1. Run "npm run lint" to check for any issues');
  console.log('2. Run "npm test" to ensure tests pass');
  console.log('3. Test your application thoroughly');
}

process.exit(stats.errors.length > 0 ? 1 : 0);