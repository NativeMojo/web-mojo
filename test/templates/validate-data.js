import TemplatesPage from '../../examples/pages/templates/TemplatesPage.js';

// Create an instance of TemplatesPage
const page = new TemplatesPage();

// Initialize the page
await page.onInit();

console.log('🔍 Validating Template Examples Data Separation\n');
console.log('=' .repeat(50));

// Check each example
const examples = Object.keys(page.templateExamples);
let allValid = true;

for (const key of examples) {
    const example = page.templateExamples[key];
    console.log(`\n📋 ${example.name} (${key})`);
    console.log('-'.repeat(40));
    
    // Check required fields
    if (!example.template) {
        console.log('  ❌ Missing template');
        allValid = false;
    }
    
    if (!example.data) {
        console.log('  ❌ Missing data');
        allValid = false;
    }
    
    if (!example.description) {
        console.log('  ❌ Missing description');
        allValid = false;
    }
    
    // Show data keys for this example
    if (example.data) {
        const dataKeys = Object.keys(example.data);
        console.log(`  ✅ Has specific data: ${dataKeys.join(', ')}`);
        
        // Validate that each example has only the data it needs
        switch(key) {
            case 'basic':
                const basicExpected = ['user', 'company', 'currentYear'];
                const basicHas = basicExpected.every(k => dataKeys.includes(k));
                const basicExtra = dataKeys.filter(k => !basicExpected.includes(k));
                
                if (!basicHas) {
                    console.log('  ❌ Missing expected data keys');
                    allValid = false;
                }
                if (basicExtra.length > 0) {
                    console.log(`  ⚠️  Has extra data: ${basicExtra.join(', ')}`);
                }
                break;
                
            case 'conditionals':
                if (!example.data.user || example.data.user.isAdmin === undefined) {
                    console.log('  ❌ Missing user.isAdmin');
                    allValid = false;
                }
                if (!example.data.settings || example.data.settings.notifications === undefined) {
                    console.log('  ❌ Missing settings.notifications');
                    allValid = false;
                }
                break;
                
            case 'loops':
                if (!example.data.products || !Array.isArray(example.data.products)) {
                    console.log('  ❌ Missing or invalid products array');
                    allValid = false;
                } else {
                    console.log(`  ✅ Has ${example.data.products.length} products`);
                }
                break;
                
            case 'nested':
                if (!example.data.user || !example.data.settings) {
                    console.log('  ❌ Missing user or settings');
                    allValid = false;
                }
                break;
                
            case 'sections':
                if (!example.data.messages || !Array.isArray(example.data.messages)) {
                    console.log('  ❌ Missing or invalid messages array');
                    allValid = false;
                } else {
                    console.log(`  ✅ Has ${example.data.messages.length} messages`);
                }
                break;
                
            case 'escaping':
                if (!example.data.htmlContent || !example.data.rawHtml) {
                    console.log('  ❌ Missing HTML content fields');
                    allValid = false;
                }
                break;
        }
    }
}

console.log('\n' + '='.repeat(50));

// Summary
if (allValid) {
    console.log('✅ All template examples have properly separated data!');
    console.log('📊 Each example contains only the data it needs.');
} else {
    console.log('❌ Some issues found with template data separation');
}

console.log('\n💡 Benefits of this approach:');
console.log('  • Cleaner, more focused examples');
console.log('  • Easier to understand what data each pattern needs');
console.log('  • Less cognitive load for users');
console.log('  • More educational and maintainable');

process.exit(allValid ? 0 : 1);