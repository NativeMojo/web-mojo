#!/usr/bin/env node

/**
 * MOJO Import Updater - Utility script to convert legacy imports to new @core/@ext aliases
 * 
 * Usage:
 *   node scripts/update-imports.js [options] [directory]
 * 
 * Options:
 *   --dry-run    Show what would be changed without making changes
 *   --backup     Create backup files before making changes
 *   --verbose    Show detailed output
 * 
 * Examples:
 *   node scripts/update-imports.js --dry-run examples/
 *   node scripts/update-imports.js --backup src/extensions/
 *   node scripts/update-imports.js examples/portal/pages/
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
    targetDir: process.argv.slice(2).find(arg => !arg.startsWith('--')) || 'src/',
    extensions: ['.js', '.mjs'],
    excludePatterns: [
        /node_modules/,
        /dist/,
        /\.git/,
        /scripts/,
        /test/
    ]
};

// Import patterns to replace
const importPatterns = [
    // Convert web-mojo imports back to @core for extensions (MUST BE FIRST to prevent conflicts)
    {
        pattern: /import\s*{\s*(\w+)\s*}\s*from\s*['"]web-mojo['"];?/g,
        replacement: "import $1 from '@core/$1.js';",
        description: 'Convert single web-mojo named import back to @core'
    },
    {
        pattern: /import\s+(\w+)\s+from\s*['"]web-mojo['"];?/g,
        replacement: "import $1 from '@core/$1.js';",
        description: 'Convert web-mojo default imports back to @core'
    },
    
    // Core imports
    {
        pattern: /from\s+['"]\/src\/core\/(.+?)\.js['"]/g,
        replacement: "from '@core/$1.js'",
        description: 'Convert /src/core/ to @core'
    },
    {
        pattern: /from\s+['"]\.\.?\/+core\/(.+?)\.js['"]/g,
        replacement: "from '@core/$1.js'",
        description: 'Convert ../core/ to @core'
    },
    {
        pattern: /from\s+['"](?:\.\.\/)+core\/(.+?)\.js['"]/g,
        replacement: "from '@core/$1.js'",
        description: 'Convert ../../core/ to @core'
    },
    
    // Views/Pages/Models in core
    {
        pattern: /from\s+['"]\.\.?\/+(views|pages|models|services|utils|mixins|forms)\/(.+?)\.js['"]/g,
        replacement: "from '@core/$1/$2.js'",
        description: 'Convert relative core paths to @core'
    },
    {
        pattern: /from\s+['"](?:\.\.\/)+(views|pages|models|services|utils|mixins|forms)\/(.+?)\.js['"]/g,
        replacement: "from '@core/$1/$2.js'",
        description: 'Convert deep relative core paths to @core'
    },
    
    // Extension imports
    {
        pattern: /from\s+['"]\/src\/(auth|lightbox|charts|admin|docit|loader)\/(.+?)\.js['"]/g,
        replacement: "from '@ext/$1/$2.js'",
        description: 'Convert /src/extension/ to @ext/extension'
    },
    {
        pattern: /from\s+['"]\.\.?\/+(auth|lightbox|charts|admin|docit|loader)\/(.+?)\.js['"]/g,
        replacement: "from '@ext/$1/$2.js'",
        description: 'Convert ../extension/ to @ext/extension'
    },
    
    // CSS imports
    {
        pattern: /from\s+['"]\/src\/css\/(.+?)\.css['"]/g,
        replacement: "from '@core/css/$1.css'",
        description: 'Convert /src/css/ to @core/css'
    },
    {
        pattern: /href\s*=\s*['"]\.\.?\/+src\/css\/(.+?)\.css['"]/g,
        replacement: "href=\"../../dist/$1.css\"",
        description: 'Convert CSS hrefs to dist files'
    },
    
    // Template imports
    {
        pattern: /from\s+['"]\.\.?\/+templates\.js['"]/g,
        replacement: "from '../../templates.js'",
        description: 'Fix template imports'
    },
    
    // Named imports from core (DISABLED for extension builds)
    // {
    //     pattern: /import\s*{\s*([^}]+)\s*}\s*from\s*['"]\/src\/core\/index\.js['"]/g,
    //     replacement: "import { $1 } from 'web-mojo'",
    //     description: 'Convert core index imports to web-mojo'
    // },
    
    // Default imports from core (DISABLED for extension builds) 
    // {
    //     pattern: /import\s+(\w+)\s+from\s+['"]\/src\/core\/(\w+)\.js['"]/g,
    //     replacement: "import { $1 } from 'web-mojo'",
    //     description: 'Convert core default imports to named imports'
    // },
    
    // Extension package imports
    {
        pattern: /import\s+(\w+)\s+from\s+['"]\/src\/auth\/(\w+)\.js['"]/g,
        replacement: "import { $1 } from 'web-mojo/auth'",
        description: 'Convert auth imports to package imports'
    }
];

// Script loader patterns
const scriptPatterns = [
    {
        pattern: /src\s*=\s*['"]\.\.?\/+src\/loader\/loader\.js['"]/g,
        replacement: 'src="../../dist/loader.es.js"',
        description: 'Convert loader script to dist file'
    }
];

let stats = {
    filesProcessed: 0,
    filesChanged: 0,
    totalReplacements: 0,
    patternStats: {}
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
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            // Skip excluded directories
            if (config.excludePatterns.some(pattern => pattern.test(fullPath))) {
                continue;
            }
            findFiles(fullPath, files);
        } else if (stat.isFile()) {
            // Include files with target extensions
            const ext = path.extname(fullPath);
            if (config.extensions.includes(ext) || fullPath.endsWith('.html')) {
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
    
    // Process JavaScript/CSS imports
    if (filePath.endsWith('.js') || filePath.endsWith('.mjs')) {
        for (const pattern of importPatterns) {
            const matches = newContent.match(pattern.pattern);
            if (matches) {
                const beforeReplace = newContent;
                newContent = newContent.replace(pattern.pattern, pattern.replacement);
                
                if (newContent !== beforeReplace) {
                    const count = matches.length;
                    fileReplacements += count;
                    stats.totalReplacements += count;
                    
                    if (!stats.patternStats[pattern.description]) {
                        stats.patternStats[pattern.description] = 0;
                    }
                    stats.patternStats[pattern.description] += count;
                    
                    fileChanged = true;
                    log(`${pattern.description}: ${count} replacements`, 'verbose');
                }
            }
        }
    }
    
    // Process HTML script tags
    if (filePath.endsWith('.html')) {
        for (const pattern of scriptPatterns) {
            const matches = newContent.match(pattern.pattern);
            if (matches) {
                const beforeReplace = newContent;
                newContent = newContent.replace(pattern.pattern, pattern.replacement);
                
                if (newContent !== beforeReplace) {
                    const count = matches.length;
                    fileReplacements += count;
                    stats.totalReplacements += count;
                    
                    if (!stats.patternStats[pattern.description]) {
                        stats.patternStats[pattern.description] = 0;
                    }
                    stats.patternStats[pattern.description] += count;
                    
                    fileChanged = true;
                    log(`${pattern.description}: ${count} replacements`, 'verbose');
                }
            }
        }
    }
    
    if (fileChanged) {
        stats.filesChanged++;
        
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
    console.log('\n📊 Import Update Summary');
    console.log('========================');
    console.log(`Files processed: ${stats.filesProcessed}`);
    console.log(`Files ${config.dryRun ? 'would be ' : ''}changed: ${stats.filesChanged}`);
    console.log(`Total replacements: ${stats.totalReplacements}`);
    
    if (Object.keys(stats.patternStats).length > 0) {
        console.log('\nReplacement breakdown:');
        for (const [pattern, count] of Object.entries(stats.patternStats)) {
            console.log(`  • ${pattern}: ${count}`);
        }
    }
    
    if (config.dryRun) {
        console.log('\n💡 This was a dry run. Use without --dry-run to apply changes.');
    } else if (stats.filesChanged > 0) {
        console.log('\n✅ Import updates completed successfully!');
        if (config.backup) {
            console.log('📁 Backup files created with .backup extension');
        }
    } else {
        console.log('\n🎉 All imports are already up to date!');
    }
}

function main() {
    const targetPath = path.resolve(config.targetDir);
    
    console.log('🚀 MOJO Import Updater');
    console.log('======================');
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
MOJO Import Updater - Convert legacy imports to @core/@ext aliases

Usage: node scripts/update-imports.js [options] [directory]

Options:
  --dry-run     Show what would be changed without making changes
  --backup      Create .backup files before making changes
  --verbose     Show detailed output for each replacement
  --help, -h    Show this help message

Examples:
  node scripts/update-imports.js --dry-run examples/
  node scripts/update-imports.js --backup src/extensions/admin/
  node scripts/update-imports.js examples/portal/pages/

The script will automatically:
  • Convert /src/core/ imports to @core/
  • Convert /src/auth/ imports to @ext/auth/
  • Convert relative imports (../core/) to aliases
  • Update HTML script src attributes
  • Update CSS href attributes to use dist files
  • Convert package imports to new format

Supported file types: .js, .mjs, .html
    `);
    process.exit(0);
}

main();