/**
 * Test file to verify the built MOJO library works correctly
 * Run with: node test-library-usage.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('Testing MOJO Library (web-mojo) Usage...\n');

// Test 1: Import from built library
console.log('1. Testing ES Module imports from dist/web-mojo.esm.js');
try {
  const MOJO = await import('./dist/web-mojo.esm.js');
  console.log('   ✅ Successfully imported MOJO library');
  console.log('   Available exports:', Object.keys(MOJO).slice(0, 8).join(', '), '...');
  console.log('   MOJO Version:', MOJO.VERSION);
  console.log('   Package Name:', MOJO.PACKAGE_NAME);
} catch (error) {
  console.error('   ❌ Failed to import:', error.message);
}

// Test 2: Check CSS files
console.log('\n2. Testing CSS file availability');
const cssFiles = [
  'dist/web-mojo.css',
  'dist/css/portal.css',
  'dist/css/mojo-source.css'
];

cssFiles.forEach(file => {
  const path = join(__dirname, file);
  if (existsSync(path)) {
    const size = readFileSync(path).length;
    console.log(`   ✅ ${file} (${size} bytes)`);
  } else {
    console.log(`   ❌ ${file} not found`);
  }
});

// Test 3: Check CSS manifest
console.log('\n3. Testing CSS manifest');
try {
  const manifestPath = join(__dirname, 'dist/css-manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  console.log('   ✅ CSS manifest loaded');
  console.log('   Main CSS:', manifest.main);
  console.log('   Available styles:', Object.keys(manifest.styles).join(', '));
} catch (error) {
  console.error('   ❌ Failed to load CSS manifest:', error.message);
}

// Test 4: Check template files
console.log('\n4. Testing template availability');
const templateFiles = [
  'dist/templates/auth/pages/LoginPage.mst',
  'dist/templates/auth/pages/RegisterPage.mst',
  'dist/templates/auth/pages/ForgotPasswordPage.mst',
  'dist/templates/components/TablePage.mst'
];

templateFiles.forEach(file => {
  const path = join(__dirname, file);
  if (existsSync(path)) {
    const content = readFileSync(path, 'utf8');
    console.log(`   ✅ ${file.split('/').pop()} (${content.length} chars)`);
  } else {
    console.log(`   ❌ ${file} not found`);
  }
});

// Test 5: Check template index
console.log('\n5. Testing template index');
try {
  const templateIndex = await import('./dist/templates/index.js');
  console.log('   ✅ Template index loaded');
  console.log('   Available templates:', Object.keys(templateIndex).join(', '));
} catch (error) {
  console.error('   ❌ Failed to load template index:', error.message);
}

// Test 6: Test importing specific components
console.log('\n6. Testing component imports');
try {
  const { View, Page, Router, Table, TopNav, Sidebar } = await import('./dist/web-mojo.esm.js');
  console.log('   ✅ Core components imported:', 
    [View, Page, Router].map(c => c.name || 'Component').join(', '));
  console.log('   ✅ UI components imported:', 
    [Table, TopNav, Sidebar].map(c => c.name || 'Component').join(', '));
} catch (error) {
  console.error('   ❌ Failed to import components:', error.message);
}

// Test 7: Test utility imports
console.log('\n7. Testing utility imports');
try {
  const { EventBus, mustache, DataFormatter } = await import('./dist/web-mojo.esm.js');
  console.log('   ✅ Utilities imported');
  console.log('   EventBus available:', typeof EventBus === 'function');
  console.log('   Mustache available:', typeof mustache === 'object');
  console.log('   DataFormatter available:', typeof DataFormatter === 'function');
} catch (error) {
  console.error('   ❌ Failed to import utilities:', error.message);
}

// Test 8: Show example usage
console.log('\n8. Example usage patterns:');
console.log(`
// In a Vite/Webpack project:
import MOJO, { View, Page, Router } from 'web-mojo';
import 'web-mojo/css';
import loginTemplate from 'web-mojo/templates/auth/LoginPage.mst?raw';

// In a Node.js project:
import MOJO from 'web-mojo';
const cssPath = 'node_modules/web-mojo/dist/web-mojo.css';

// Via CDN in HTML:
<link href="https://unpkg.com/web-mojo/dist/web-mojo.css" rel="stylesheet">
<script src="https://unpkg.com/web-mojo/dist/web-mojo.umd.js"></script>

// Loading templates at runtime:
const response = await fetch('node_modules/web-mojo/dist/templates/components/TablePage.mst');
const template = await response.text();
`);

// Test 9: Verify build formats
console.log('\n9. Testing different build formats');
const formats = [
  { file: 'dist/web-mojo.esm.js', name: 'ES Module' },
  { file: 'dist/web-mojo.cjs.js', name: 'CommonJS' },
  { file: 'dist/web-mojo.umd.js', name: 'UMD' }
];

formats.forEach(({ file, name }) => {
  const path = join(__dirname, file);
  if (existsSync(path)) {
    const size = Math.round(readFileSync(path).length / 1024);
    console.log(`   ✅ ${name}: ${file} (${size} KB)`);
  } else {
    console.log(`   ❌ ${name}: ${file} not found`);
  }
});

// Test 10: Summary
console.log('\n10. Build Summary:');
console.log('   Package name: web-mojo');
console.log('   Main entry: dist/web-mojo.esm.js (ES Module)');
console.log('   CSS entry: dist/web-mojo.css');
console.log('   Templates: dist/templates/');
console.log('   Formats: ESM, CommonJS, UMD');

console.log('\n✨ Library testing complete!\n');
console.log('To use in your project:');
console.log('1. npm install web-mojo bootstrap');
console.log('2. import MOJO from "web-mojo"');
console.log('3. import "web-mojo/css"');
console.log('\nOr during development:');
console.log('1. npm link (in this directory)');
console.log('2. npm link web-mojo (in your project)');