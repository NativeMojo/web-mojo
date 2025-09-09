#!/usr/bin/env node

/**
 * Build Templates Script
 * Compiles all .mst template files into a single JavaScript module
 * This allows templates to be bundled with the framework and imported directly
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { watch } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Configuration
const TEMPLATE_EXTENSIONS = ['.mst', '.html'];
const SOURCE_DIRS = [
  'src/core',
  'src/extensions'
];
const OUTPUT_FILE = 'src/templates.js';

// Check for watch mode
const isWatchMode = process.argv.includes('--watch') || process.argv.includes('-w');

/**
 * Find all template files in the specified directories
 */
function findTemplateFiles() {
  const templates = new Map();
  
  SOURCE_DIRS.forEach(dir => {
    const fullPath = path.join(rootDir, dir);
    if (!fs.existsSync(fullPath)) {
      console.log(`Directory not found: ${dir}, skipping...`);
      return;
    }
    
    walkDirectory(fullPath, (filePath) => {
      const ext = path.extname(filePath);
      if (TEMPLATE_EXTENSIONS.includes(ext)) {
        // Create a logical key for the template
        const relativePath = path.relative(rootDir, filePath);
        const key = relativePath
          .replace(/\\/g, '/')  // Normalize path separators
          .replace(/^src\//, ''); // Remove src/ prefix
        
        // Read the template content
        const content = fs.readFileSync(filePath, 'utf8');
        templates.set(key, content);
        
        console.log(`Found template: ${key}`);
      }
    });
  });
  
  return templates;
}

/**
 * Walk directory recursively
 */
function walkDirectory(dir, callback) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      walkDirectory(filePath, callback);
    } else {
      callback(filePath);
    }
  });
}

/**
 * Escape template content for JavaScript string
 */
function escapeTemplate(content) {
  return content
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$');
}

/**
 * Generate the JavaScript module content
 */
function generateModule(templates) {
  const lines = [
    '/**',
    ' * Auto-generated template module',
    ' * Generated: ' + new Date().toISOString(),
    ' * Contains all framework templates compiled as JavaScript strings',
    ' */',
    '',
    '// Template registry',
    'const templates = {};',
    ''
  ];
  
  // Add each template
  templates.forEach((content, key) => {
    lines.push(`// Template: ${key}`);
    lines.push(`templates['${key}'] = \`${escapeTemplate(content)}\`;`);
    lines.push('');
  });
  
  // Add exports
  lines.push('// Export templates');
  lines.push('export default templates;');
  lines.push('');
  
  // Add convenience exports for common templates
  lines.push('// Convenience exports for common templates');
  templates.forEach((content, key) => {
    // Create a valid JavaScript identifier from the key
    const exportName = key
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/^(\d)/, '_$1')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    
    if (exportName && exportName !== 'default') {
      lines.push(`export const ${exportName} = templates['${key}'];`);
    }
  });
  
  lines.push('');
  
  // Add helper functions
  lines.push('// Helper functions');
  lines.push('');
  lines.push('/**');
  lines.push(' * Get a template by key');
  lines.push(' * @param {string} key - Template key (e.g., "auth/pages/LoginPage.mst")');
  lines.push(' * @returns {string|undefined} Template content or undefined if not found');
  lines.push(' */');
  lines.push('export function getTemplate(key) {');
  lines.push('  // Handle different path formats');
  lines.push('  const normalizedKey = key');
  lines.push('    .replace(/^\\//, "")  // Remove leading slash');
  lines.push('    .replace(/^src\\//, "")  // Remove src/ prefix');
  lines.push('    .replace(/\\\\/g, "/");  // Normalize path separators');
  lines.push('  ');
  lines.push('  return templates[normalizedKey] || templates[key];');
  lines.push('}');
  lines.push('');
  lines.push('/**');
  lines.push(' * Check if a template exists');
  lines.push(' * @param {string} key - Template key');
  lines.push(' * @returns {boolean} True if template exists');
  lines.push(' */');
  lines.push('export function hasTemplate(key) {');
  lines.push('  return getTemplate(key) !== undefined;');
  lines.push('}');
  lines.push('');
  lines.push('/**');
  lines.push(' * Get all template keys');
  lines.push(' * @returns {string[]} Array of template keys');
  lines.push(' */');
  lines.push('export function getTemplateKeys() {');
  lines.push('  return Object.keys(templates);');
  lines.push('}');
  lines.push('');
  lines.push('/**');
  lines.push(' * Get template count');
  lines.push(' * @returns {number} Number of templates');
  lines.push(' */');
  lines.push('export function getTemplateCount() {');
  lines.push('  return Object.keys(templates).length;');
  lines.push('}');
  
  return lines.join('\n');
}

/**
 * Build templates once
 */
function buildTemplates() {
  console.log(`[${new Date().toLocaleTimeString()}] Building templates...`);
  
  // Find all templates
  const templates = findTemplateFiles();
  
  if (templates.size === 0) {
    console.warn('No templates found!');
    return false;
  }
  
  console.log(`Found ${templates.size} templates`);
  
  // Generate the module
  const moduleContent = generateModule(templates);
  
  // Write the output file
  const outputPath = path.join(rootDir, OUTPUT_FILE);
  fs.writeFileSync(outputPath, moduleContent, 'utf8');
  
  console.log(`Generated: ${OUTPUT_FILE}`);
  console.log('Templates compiled successfully!');
  
  return true;
}

/**
 * Watch for template changes
 */
function watchTemplates() {
  console.log('');
  console.log('👀 Watching for template changes...');
  console.log('Press Ctrl+C to stop');
  console.log('');
  
  // Debounce timer
  let debounceTimer = null;
  
  // Watch each source directory
  SOURCE_DIRS.forEach(dir => {
    const fullPath = path.join(rootDir, dir);
    if (!fs.existsSync(fullPath)) {
      return;
    }
    
    // Watch directory recursively
    watchDirectory(fullPath, (eventType, filename) => {
      // Check if it's a template file
      if (filename && TEMPLATE_EXTENSIONS.some(ext => filename.endsWith(ext))) {
        console.log(`[${new Date().toLocaleTimeString()}] Template ${eventType}: ${filename}`);
        
        // Clear existing timer
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }
        
        // Debounce rebuilds to avoid multiple rapid rebuilds
        debounceTimer = setTimeout(() => {
          buildTemplates();
          console.log('');
          console.log('👀 Watching for template changes...');
        }, 300);
      }
    });
  });
}

/**
 * Watch a directory recursively
 */
function watchDirectory(dir, callback) {
  // Watch the directory
  fs.watch(dir, { recursive: true }, (eventType, filename) => {
    callback(eventType, filename);
  });
  
  // Also watch subdirectories for better compatibility
  fs.readdirSync(dir).forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      // Recursively watch subdirectories
      fs.watch(filePath, (eventType, filename) => {
        callback(eventType, filename);
      });
    }
  });
}

/**
 * Main function
 */
function main() {
  console.log('MOJO Template Compiler');
  console.log('======================');
  console.log('');
  
  // Initial build
  const success = buildTemplates();
  
  if (success) {
    // Show usage example (only on first run)
    if (!isWatchMode) {
      console.log('');
      console.log('Usage in your code:');
      console.log('');
      console.log('  import templates, { getTemplate } from "./templates.js";');
      console.log('  ');
      console.log('  // Get a template');
      console.log('  const loginTemplate = getTemplate("auth/pages/LoginPage.mst");');
      console.log('  ');
      console.log('  // Or access directly');
      console.log('  const tableTemplate = templates["components/TablePage.mst"];');
    }
    
    // Start watch mode if requested
    if (isWatchMode) {
      watchTemplates();
    }
  }
}

// Run the script
main();