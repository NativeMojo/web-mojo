#!/usr/bin/env node

/**
 * MOJO Examples Updater - Convert examples to use package imports
 * 
 * This script specifically updates example files to use the new package import format:
 * - /src/core/* -> web-mojo
 * - /src/auth/* -> web-mojo/auth
 * - /src/lightbox/* -> web-mojo/lightbox
 * - /src/charts/* -> web-mojo/charts
 * - /src/docit/* -> web-mojo/docit
 * 
 * Usage:
 *   node scripts/update-examples.js [options] [directory]
 * 
 * Options:
 *   --dry-run    Show what would be changed without making changes
 *   --backup     Create backup files before making changes
 *   --verbose    Show detailed output
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const config = {
    dryRun: process.argv.includes('--dry-run'),
    backup: process.argv.includes('--backup'),
    verbose: process.argv.includes('--verbose'),
    targetDir: process.argv.slice(2).find(arg => !arg.startsWith('--')) || 'examples/',
};

// Package mapping for imports
const packageMap = {
    // Core package exports
    'web-mojo': [
        'WebApp', 'PortalApp', 'View', 'Page', 'Model', 'Collection', 'Router',
        'Dialog', 'FileUpload', 'TokenManager', 'ToastService', 'EventBus',
        'DataFormatter', 'MustacheFormatter', 'MOJOUtils', 'DataWrapper',
        'EventDelegate', 'ProgressView', 'TableView', 'TableRow', 'ListView',
        'ListViewItem', 'TopNav', 'Sidebar', 'TabView', 'SimpleSearchView',
        'DataView', 'FilePreviewView', 'VERSION_INFO', 'VERSION'
    ],
    // Extension packages
    'web-mojo/auth': ['AuthApp', 'AuthManager', 'LoginPage', 'RegisterPage', 'ForgotPasswordPage', 'ResetPasswordPage', 'PasskeyPlugin'],
    'web-mojo/lightbox': ['ImageViewer', 'ImageEditor', 'ImageCropView', 'ImageCanvasView', 'ImageFiltersView', 'ImageTransformView', 'ImageUploadView', 'LightboxGallery', 'PDFViewer'],
    'web-mojo/charts': ['BaseChart', 'SeriesChart', 'PieChart', 'MetricsChart'],
    'web-mojo/docit': ['DocItApp', 'DocHomePage', 'DocPage', 'DocEditPage', 'DocNavSidebar', 'DocitBook', 'DocitBookList', 'DocitPage', 'DocitPageList']
};

let stats = {
    filesProcessed: 0,
    filesChanged: 0,
    totalReplacements: 0,
    packageStats: {}
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
            // Skip node_modules, dist, etc.
            if (['node_modules', 'dist', '.git'].includes(item)) continue;
            findFiles(fullPath, files);
        } else if (stat.isFile()) {
            const ext = path.extname(fullPath);
            if (['.js', '.mjs', '.html'].includes(ext)) {
                files.push(fullPath);
            }
        }
    }
    
    return files;
}

function detectImportPackage(importPath, componentName) {
    // Check which package this component belongs to
    for (const [packageName, components] of Object.entries(packageMap)) {
        if (components.includes(componentName)) {
            return packageName;
        }
    }
    
    // Default mappings based on path
    if (importPath.includes('/core/') || importPath.includes('/src/core/')) {
        return 'web-mojo';
    } else if (importPath.includes('/auth/')) {
        return 'web-mojo/auth';
    } else if (importPath.includes('/lightbox/')) {
        return 'web-mojo/lightbox';
    } else if (importPath.includes('/charts/')) {
        return 'web-mojo/charts';
    } else if (importPath.includes('/docit/')) {
        return 'web-mojo/docit';
    }
    
    return 'web-mojo'; // Default to core
}

function processJavaScriptFile(content) {
    let newContent = content;
    let changed = false;
    const importGroups = {};
    
    // Pattern 1: Default imports from /src paths
    // import Component from '/src/core/Component.js'
    const defaultImportPattern = /import\s+(\w+)\s+from\s+['"]\/src\/(core|auth|lightbox|charts|docit|loader)\/(.+?)\.js['"];?\s*$/gm;
    newContent = newContent.replace(defaultImportPattern, (match, componentName, folder, filePath) => {
        const packageName = detectImportPackage(`/${folder}/`, componentName);
        
        if (!importGroups[packageName]) {
            importGroups[packageName] = [];
        }
        
        if (!importGroups[packageName].includes(componentName)) {
            importGroups[packageName].push(componentName);
        }
        
        changed = true;
        return ''; // Remove the original import, will be replaced with grouped imports
    });
    
    // Pattern 2: Named imports from /src paths  
    // import { Component } from '/src/core/file.js'
    const namedImportPattern = /import\s*{\s*([^}]+)\s*}\s*from\s+['"]\/src\/(core|auth|lightbox|charts|docit|loader)\/(.+?)\.js['"];?\s*$/gm;
    newContent = newContent.replace(namedImportPattern, (match, imports, folder) => {
        const components = imports.split(',').map(c => c.trim());
        
        components.forEach(componentName => {
            const packageName = detectImportPackage(`/${folder}/`, componentName);
            
            if (!importGroups[packageName]) {
                importGroups[packageName] = [];
            }
            
            if (!importGroups[packageName].includes(componentName)) {
                importGroups[packageName].push(componentName);
            }
        });
        
        changed = true;
        return ''; // Remove the original import
    });
    
    // Pattern 3: Relative imports that should become package imports
    // import Component from '../core/Component.js' or '../../core/Component.js'
    const relativeImportPattern = /import\s+(\w+)\s+from\s+['"]\.\.?\/?\.\.?\/(core|auth|lightbox|charts|docit|loader)\/(.+?)\.js['"];?\s*$/gm;
    newContent = newContent.replace(relativeImportPattern, (match, componentName, folder) => {
        const packageName = detectImportPackage(`/${folder}/`, componentName);
        
        if (!importGroups[packageName]) {
            importGroups[packageName] = [];
        }
        
        if (!importGroups[packageName].includes(componentName)) {
            importGroups[packageName].push(componentName);
        }
        
        changed = true;
        return ''; // Remove the original import
    });
    
    // Pattern 4: @core/@ext imports (from previous script run)
    const aliasImportPattern = /import\s+(\w+)\s+from\s+['"]@(core|ext)\/(auth|lightbox|charts|docit|loader\/)?(.+?)\.js['"];?\s*$/gm;
    newContent = newContent.replace(aliasImportPattern, (match, componentName, coreOrExt, extName) => {
        let packageName = 'web-mojo';
        if (coreOrExt === 'ext' && extName) {
            packageName = `web-mojo/${extName.replace('/', '')}`;
        }
        
        if (!importGroups[packageName]) {
            importGroups[packageName] = [];
        }
        
        if (!importGroups[packageName].includes(componentName)) {
            importGroups[packageName].push(componentName);
        }
        
        changed = true;
        return ''; // Remove the original import
    });
    
    // Add the grouped imports at the top of the file
    if (changed && Object.keys(importGroups).length > 0) {
        const importStatements = [];
        
        // Sort packages: web-mojo first, then extensions
        const sortedPackages = Object.keys(importGroups).sort((a, b) => {
            if (a === 'web-mojo' && b !== 'web-mojo') return -1;
            if (b === 'web-mojo' && a !== 'web-mojo') return 1;
            return a.localeCompare(b);
        });
        
        for (const packageName of sortedPackages) {
            const components = importGroups[packageName].sort();
            if (components.length === 1) {
                // Single import can be default or named
                importStatements.push(`import { ${components[0]} } from '${packageName}';`);
            } else {
                // Multiple imports as named imports
                importStatements.push(`import { ${components.join(', ')} } from '${packageName}';`);
            }
            
            // Track stats
            if (!stats.packageStats[packageName]) {
                stats.packageStats[packageName] = 0;
            }
            stats.packageStats[packageName] += components.length;
            stats.totalReplacements += components.length;
        }
        
        // Find where to insert imports (after any existing imports or at the top)
        const lines = newContent.split('\n');
        let insertIndex = 0;
        
        // Find the last import or the first non-comment line
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('import ') && !line.includes('web-mojo')) {
                insertIndex = i + 1;
            } else if (line && !line.startsWith('/*') && !line.startsWith('//') && !line.startsWith('*') && insertIndex === 0) {
                insertIndex = i;
                break;
            }
        }
        
        lines.splice(insertIndex, 0, ...importStatements, '');
        newContent = lines.join('\n');
        
        // Clean up extra empty lines
        newContent = newContent.replace(/\n\n\n+/g, '\n\n');
    }
    
    return { content: newContent, changed };
}

function processHTMLFile(content) {
    let newContent = content;
    let changed = false;
    
    // Update CSS links to use dist files
    const cssPattern = /href\s*=\s*['"]\.\.?\/?\.\.?\/src\/css\/(.+?)\.css['"]/g;
    const cssMatches = newContent.match(cssPattern);
    if (cssMatches) {
        newContent = newContent.replace(cssPattern, 'href="../../dist/$1.css"');
        changed = true;
        stats.totalReplacements += cssMatches.length;
    }
    
    // Update script src to use dist files
    const scriptPattern = /src\s*=\s*['"]\.\.?\/?\.\.?\/src\/loader\/loader\.js['"]/g;
    const scriptMatches = newContent.match(scriptPattern);
    if (scriptMatches) {
        newContent = newContent.replace(scriptPattern, 'src="../../dist/loader.es.js"');
        changed = true;
        stats.totalReplacements += scriptMatches.length;
    }
    
    return { content: newContent, changed };
}

function processFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    let result;
    
    stats.filesProcessed++;
    
    if (filePath.endsWith('.html')) {
        result = processHTMLFile(content);
    } else {
        result = processJavaScriptFile(content);
    }
    
    if (result.changed) {
        stats.filesChanged++;
        
        if (config.dryRun) {
            log(`Would update: ${path.relative(process.cwd(), filePath)}`);
        } else {
            // Create backup if requested
            if (config.backup) {
                const backupPath = filePath + '.backup';
                fs.writeFileSync(backupPath, content);
                log(`Backup created: ${backupPath}`, 'verbose');
            }
            
            // Write updated file
            fs.writeFileSync(filePath, result.content);
            log(`Updated: ${path.relative(process.cwd(), filePath)}`, 'success');
        }
    }
    
    return result.changed;
}

function printSummary() {
    console.log('\n📊 Examples Update Summary');
    console.log('==========================');
    console.log(`Files processed: ${stats.filesProcessed}`);
    console.log(`Files ${config.dryRun ? 'would be ' : ''}changed: ${stats.filesChanged}`);
    console.log(`Total replacements: ${stats.totalReplacements}`);
    
    if (Object.keys(stats.packageStats).length > 0) {
        console.log('\nPackage imports:');
        for (const [packageName, count] of Object.entries(stats.packageStats)) {
            console.log(`  • ${packageName}: ${count} imports`);
        }
    }
    
    if (config.dryRun) {
        console.log('\n💡 This was a dry run. Use without --dry-run to apply changes.');
    } else if (stats.filesChanged > 0) {
        console.log('\n✅ Examples updated successfully!');
        if (config.backup) {
            console.log('📁 Backup files created with .backup extension');
        }
        console.log('\nNext steps:');
        console.log('• Test your examples to ensure they work correctly');
        console.log('• Remove .backup files when satisfied with results');
    } else {
        console.log('\n🎉 All examples are already up to date!');
    }
}

function main() {
    const targetPath = path.resolve(config.targetDir);
    
    console.log('🚀 MOJO Examples Updater');
    console.log('========================');
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
MOJO Examples Updater - Convert examples to use package imports

Usage: node scripts/update-examples.js [options] [directory]

Options:
  --dry-run     Show what would be changed without making changes
  --backup      Create .backup files before making changes
  --verbose     Show detailed output for each change
  --help, -h    Show this help message

Examples:
  node scripts/update-examples.js --dry-run examples/
  node scripts/update-examples.js --backup examples/portal/
  node scripts/update-examples.js examples/auth/

The script will automatically:
  • Convert /src/core/* imports to 'web-mojo' package imports
  • Convert /src/auth/* imports to 'web-mojo/auth' package imports  
  • Convert /src/lightbox/* imports to 'web-mojo/lightbox' package imports
  • Convert /src/charts/* imports to 'web-mojo/charts' package imports
  • Group multiple imports from the same package
  • Update HTML CSS and script references to use dist files
  • Clean up old @core/@ext alias imports

Supported file types: .js, .mjs, .html
    `);
    process.exit(0);
}

main();