#!/usr/bin/env node

/**
 * Fix Extension Imports - Convert web-mojo imports back to @core/@ext aliases
 * 
 * This script specifically targets the issue where extensions are importing from 'web-mojo'
 * during build time, which creates circular dependencies. Extensions should use @core/@ext
 * aliases during build, and only external consumers should import from 'web-mojo'.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const config = {
    dryRun: process.argv.includes('--dry-run'),
    backup: process.argv.includes('--backup'),
    verbose: process.argv.includes('--verbose') || process.argv.includes('-v'),
    targetDir: 'src/extensions',
    extensions: ['.js']
};

// Mapping of common web-mojo imports to their @core equivalents
const importMappings = {
    'WebApp': '@core/WebApp.js',
    'PortalApp': '@core/PortalApp.js',
    'View': '@core/View.js',
    'Page': '@core/Page.js',
    'Model': '@core/Model.js',
    'Collection': '@core/Collection.js',
    'Router': '@core/Router.js',
    'Rest': '@core/Rest.js',
    'Dialog': '@core/views/feedback/Dialog.js',
    'TableView': '@core/views/table/TableView.js',
    'TableRow': '@core/views/table/TableRow.js',
    'ListView': '@core/views/list/ListView.js',
    'ListViewItem': '@core/views/list/ListViewItem.js',
    'TopNav': '@core/views/navigation/TopNav.js',
    'Sidebar': '@core/views/navigation/Sidebar.js',
    'TabView': '@core/views/navigation/TabView.js',
    'SimpleSearchView': '@core/views/navigation/SimpleSearchView.js',
    'DataView': '@core/views/data/DataView.js',
    'FormView': '@core/forms/FormView.js',
    'FilePreviewView': '@core/views/data/FilePreviewView.js',
    'FileUpload': '@core/services/FileUpload.js',
    'TokenManager': '@core/services/TokenManager.js',
    'ToastService': '@core/services/ToastService.js',
    'WebSocketClient': '@core/services/WebSocketClient.js',
    'EventDelegate': '@core/mixins/EventDelegate.js',
    'EventBus': '@core/utils/EventBus.js',
    'DataFormatter': '@core/utils/DataFormatter.js',
    'dataFormatter': '@core/utils/DataFormatter.js',
    'MustacheFormatter': '@core/utils/MustacheFormatter.js',
    'MOJOUtils': '@core/utils/MOJOUtils.js',
    'DataWrapper': '@core/utils/MOJOUtils.js',
    'ProgressView': '@core/views/feedback/ProgressView.js',
    'ContextMenu': '@core/views/feedback/ContextMenu.js',
    'applyFileDropMixin': '@core/mixins/FileDropMixin.js',
    
    // Additional commonly misplaced imports
    'User': '@core/models/User.js',
    'Job': '@core/models/Job.js',
    'Group': '@core/models/Group.js',
    'Email': '@core/models/Email.js',
    'Files': '@core/models/Files.js',
    'Log': '@core/models/Log.js',
    'Member': '@core/models/Member.js',
    'Incident': '@core/models/Incident.js',
    'Push': '@core/models/Push.js',
    'Metrics': '@core/models/Metrics.js',
    'System': '@core/models/System.js',
    'Tickets': '@core/models/Tickets.js',
    'AWS': '@core/models/AWS.js',
    'JobRunner': '@core/models/JobRunner.js',
    
    // Extension-specific imports that might be confused
    'DocNavSidebar': '@ext/docit/views/DocNavSidebar.js',
    'DocitBook': '@ext/docit/models/Book.js',
    'DocitPage': '@ext/docit/models/Page.js',
    'DocitBookList': '@ext/docit/models/Book.js',
    'DocitPageList': '@ext/docit/models/Page.js',
    'AuthManager': '@ext/auth/AuthManager.js',
    'LoginPage': '@ext/auth/pages/LoginPage.js',
    'RegisterPage': '@ext/auth/pages/RegisterPage.js',
    'ForgotPasswordPage': '@ext/auth/pages/ForgotPasswordPage.js',
    'ResetPasswordPage': '@ext/auth/pages/ResetPasswordPage.js'
};

let stats = {
    filesProcessed: 0,
    filesChanged: 0,
    totalReplacements: 0,
    unmappedImports: new Set()
};

function log(message, level = 'info') {
    const prefix = {
        info: '📝',
        success: '✅',
        warning: '⚠️',
        error: '❌',
        verbose: '🔍'
    };
    
    if (level === 'verbose' && !config.verbose) return;
    
    console.log(`${prefix[level]} ${message}`);
}

function findFiles(dir, files = []) {
    if (!fs.existsSync(dir)) return files;
    
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            findFiles(fullPath, files);
        } else if (stat.isFile()) {
            const ext = path.extname(fullPath);
            if (config.extensions.includes(ext)) {
                files.push(fullPath);
            }
        }
    }
    
    return files;
}

function processFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    let newContent = content;
    let fileChanged = false;
    let fileReplacements = 0;
    
    stats.filesProcessed++;
    
    // Pattern 1: Named imports from web-mojo
    // import { WebApp, View } from 'web-mojo';
    const namedImportPattern = /import\s*{\s*([^}]+)\s*}\s*from\s*['"]web-mojo['"];?/g;
    let match;
    
    while ((match = namedImportPattern.exec(content)) !== null) {
        const importsString = match[1];
        const imports = importsString.split(',').map(imp => imp.trim());
        
        let replacements = [];
        for (const importName of imports) {
            if (importMappings[importName]) {
                replacements.push(`import ${importName} from '${importMappings[importName]}';`);
                log(`${importName} -> ${importMappings[importName]}`, 'verbose');
            } else {
                stats.unmappedImports.add(importName);
                log(`Unmapped import: ${importName}`, 'warning');
                // Fallback to generic @core mapping
                replacements.push(`import ${importName} from '@core/${importName}.js';`);
            }
        }
        
        const replacement = replacements.join('\n');
        newContent = newContent.replace(match[0], replacement);
        fileChanged = true;
        fileReplacements += imports.length;
    }
    
    // Pattern 2: Default imports from web-mojo  
    // import WebApp from 'web-mojo';
    const defaultImportPattern = /import\s+(\w+)\s+from\s*['"]web-mojo['"];?/g;
    newContent = newContent.replace(defaultImportPattern, (match, importName) => {
        if (importMappings[importName]) {
            log(`${importName} -> ${importMappings[importName]}`, 'verbose');
            fileReplacements++;
            fileChanged = true;
            return `import ${importName} from '${importMappings[importName]}';`;
        } else {
            stats.unmappedImports.add(importName);
            log(`Unmapped import: ${importName}`, 'warning');
            fileReplacements++;
            fileChanged = true;
            return `import ${importName} from '@core/${importName}.js';`;
        }
    });
    
    // Pattern 3: Fix incorrect @core imports missing subdirectories
    // import TokenManager from '@core/TokenManager.js'; -> import TokenManager from '@core/services/TokenManager.js';
    const incorrectCorePattern = /import\s+(\w+)\s+from\s*['"]@core\/(\w+)\.js['"];?/g;
    newContent = newContent.replace(incorrectCorePattern, (match, importName, filename) => {
        // Only fix if the import name matches the filename (direct @core import)
        if (importName === filename && importMappings[importName]) {
            log(`Fixing @core path: ${importName} -> ${importMappings[importName]}`, 'verbose');
            fileReplacements++;
            fileChanged = true;
            return `import ${importName} from '${importMappings[importName]}';`;
        }
        return match; // Leave unchanged if not a direct mapping
    });
    
    if (fileChanged) {
        stats.filesChanged++;
        stats.totalReplacements += fileReplacements;
        
        if (config.dryRun) {
            log(`Would update: ${path.relative(process.cwd(), filePath)} (${fileReplacements} changes)`);
        } else {
            // Create backup if requested
            if (config.backup) {
                const backupPath = filePath + '.backup';
                fs.writeFileSync(backupPath, content);
                log(`Backup created: ${backupPath}`, 'verbose');
            }
            
            // Write updated file
            fs.writeFileSync(filePath, newContent);
            log(`Updated: ${path.relative(process.cwd(), filePath)} (${fileReplacements} changes)`, 'success');
        }
    }
    
    return { changed: fileChanged, replacements: fileReplacements };
}

function printSummary() {
    console.log('\n📊 Extension Import Fix Summary');
    console.log('===============================');
    console.log(`Files processed: ${stats.filesProcessed}`);
    console.log(`Files ${config.dryRun ? 'would be ' : ''}changed: ${stats.filesChanged}`);
    console.log(`Total replacements: ${stats.totalReplacements}`);
    
    if (stats.unmappedImports.size > 0) {
        console.log('\n⚠️  Unmapped imports (using fallback @core mapping):');
        for (const importName of stats.unmappedImports) {
            console.log(`  • ${importName}`);
        }
    }
    
    if (config.dryRun) {
        console.log('\n💡 This was a dry run. Use without --dry-run to apply changes.');
    } else if (stats.filesChanged > 0) {
        console.log('\n✅ Import fixes completed successfully!');
        if (config.backup) {
            console.log('📁 Backup files created with .backup extension');
        }
    } else {
        console.log('\n🎉 All extension imports are already clean!');
    }
}

function main() {
    const targetPath = path.resolve(config.targetDir);
    
    console.log('🔧 MOJO Extension Import Fixer');
    console.log('===============================');
    console.log(`Target directory: ${targetPath}`);
    console.log(`Mode: ${config.dryRun ? 'DRY RUN' : 'UPDATE'}`);
    console.log(`Backup: ${config.backup ? 'ENABLED' : 'DISABLED'}`);
    console.log('');
    
    if (!fs.existsSync(targetPath)) {
        log(`Directory not found: ${targetPath}`, 'error');
        process.exit(1);
    }
    
    try {
        const files = findFiles(targetPath);
        log(`Found ${files.length} files to process`);
        
        if (files.length === 0) {
            log('No files found to process', 'warning');
            return;
        }
        
        for (const filePath of files) {
            processFile(filePath);
        }
        
        printSummary();
        
    } catch (error) {
        log(`Error processing files: ${error.message}`, 'error');
        process.exit(1);
    }
}

// Handle command line help
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
MOJO Extension Import Fixer - Convert web-mojo imports to @core/@ext aliases

Usage: node scripts/fix-extension-imports.js [options]

Options:
  --dry-run     Show what would be changed without making changes
  --backup      Create .backup files before making changes  
  --verbose, -v Show detailed output for each replacement
  --help, -h    Show this help message

Examples:
  node scripts/fix-extension-imports.js --dry-run
  node scripts/fix-extension-imports.js --backup --verbose
  node scripts/fix-extension-imports.js

This script converts problematic imports like:
  import { WebApp, View } from 'web-mojo';
  
To proper @core aliases:
  import WebApp from '@core/WebApp.js';
  import View from '@core/View.js';

Target directory: src/extensions/
    `);
    process.exit(0);
}

main();