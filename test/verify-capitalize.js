/**
 * Simple verification script for capitalize method with kebab-case support
 */

import View from '../src/core/View.js';

console.log('🧪 Testing View.capitalize() method with kebab-case support\n');
console.log('='.repeat(50));

const view = new View();

// Test cases
const testCases = [
  // Simple words
  { input: 'click', expected: 'Click' },
  { input: 'save', expected: 'Save' },
  { input: 'delete', expected: 'Delete' },
  
  // Kebab-case (DialogsPage actions)
  { input: 'show-small', expected: 'ShowSmall' },
  { input: 'show-default', expected: 'ShowDefault' },
  { input: 'show-large', expected: 'ShowLarge' },
  { input: 'show-xl', expected: 'ShowXl' },
  { input: 'show-fullscreen', expected: 'ShowFullscreen' },
  { input: 'show-centered', expected: 'ShowCentered' },
  { input: 'show-scrollable', expected: 'ShowScrollable' },
  { input: 'show-static', expected: 'ShowStatic' },
  { input: 'show-no-fade', expected: 'ShowNoFade' },
  { input: 'show-view-dialog', expected: 'ShowViewDialog' },
  { input: 'show-form-view', expected: 'ShowFormView' },
  { input: 'show-alert', expected: 'ShowAlert' },
  { input: 'show-confirm', expected: 'ShowConfirm' },
  { input: 'show-prompt', expected: 'ShowPrompt' },
  { input: 'show-wizard', expected: 'ShowWizard' },
  { input: 'show-loading', expected: 'ShowLoading' },
  { input: 'show-nested', expected: 'ShowNested' },
  { input: 'show-sizes-source', expected: 'ShowSizesSource' },
  { input: 'show-options-source', expected: 'ShowOptionsSource' },
  
  // Complex kebab-case
  { input: 'save-and-close', expected: 'SaveAndClose' },
  { input: 'open-file-browser', expected: 'OpenFileBrowser' },
  { input: 'toggle-dark-mode', expected: 'ToggleDarkMode' },
  
  // Edge cases
  { input: '', expected: '' },
  { input: 'a', expected: 'A' },
  { input: 'a-b', expected: 'AB' },
  { input: 'test-', expected: 'Test' },
  { input: '-test', expected: 'Test' },
  { input: 'test--double', expected: 'TestDouble' }
];

let passed = 0;
let failed = 0;

console.log('\n📋 Running tests:\n');

testCases.forEach(({ input, expected }) => {
  const result = view.capitalize(input);
  const isCorrect = result === expected;
  
  if (isCorrect) {
    passed++;
    console.log(`  ✅ "${input}" → "${result}"`);
  } else {
    failed++;
    console.log(`  ❌ "${input}" → "${result}" (expected: "${expected}")`);
  }
});

console.log('\n' + '='.repeat(50));
console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

// Test action method resolution
console.log('🔍 Testing action method resolution:\n');

const actionTests = [
  { action: 'show-small', method: 'onActionShowSmall' },
  { action: 'show-default', method: 'onActionShowDefault' },
  { action: 'show-large', method: 'onActionShowLarge' },
  { action: 'save-and-close', method: 'onActionSaveAndClose' },
  { action: 'click', method: 'onActionClick' }
];

actionTests.forEach(({ action, method }) => {
  const generatedMethod = `onAction${view.capitalize(action)}`;
  const isCorrect = generatedMethod === method;
  
  if (isCorrect) {
    console.log(`  ✅ data-action="${action}" → ${generatedMethod}`);
  } else {
    console.log(`  ❌ data-action="${action}" → ${generatedMethod} (expected: ${method})`);
  }
});

console.log('\n' + '='.repeat(50));

if (failed === 0) {
  console.log('\n✅ All tests passed! The capitalize method correctly handles kebab-case.');
  console.log('📝 The DialogsPage buttons should now work correctly.\n');
  process.exit(0);
} else {
  console.log(`\n❌ ${failed} test(s) failed. Please check the capitalize implementation.\n`);
  process.exit(1);
}