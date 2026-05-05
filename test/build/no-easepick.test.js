#!/usr/bin/env node

/**
 * Build assertion: Easepick is gone.
 *
 * The picker rebuild removed the runtime CDN dependency. This test fails
 * if any reference to Easepick or its CDN sneaks back into source or the
 * built bundle.
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 No-Easepick Build Test');
console.log('==========================\n');

const projectRoot = process.cwd();
let passed = 0;
let failed = 0;

function check(label, fn) {
    try {
        fn();
        console.log(`✅ ${label}`);
        passed++;
    } catch (err) {
        console.log(`❌ ${label}`);
        console.log(`   ${err.message}`);
        failed++;
    }
}

const FORBIDDEN_PATTERNS = [
    /easepick/i,
    /cdn\.jsdelivr\.net\/npm\/@easepick/i,
];

function scanDir(dir, exts, hits) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
            scanDir(full, exts, hits);
        } else {
            if (!exts.some((e) => entry.name.endsWith(e))) continue;
            const text = fs.readFileSync(full, 'utf8');
            for (const pat of FORBIDDEN_PATTERNS) {
                if (pat.test(text)) {
                    hits.push({ file: path.relative(projectRoot, full), pattern: pat.toString() });
                }
            }
        }
    }
}

check('src/ has no Easepick references', () => {
    const hits = [];
    scanDir(path.join(projectRoot, 'src'), ['.js', '.css', '.html'], hits);
    if (hits.length) {
        throw new Error('Found Easepick references:\n' + hits.map((h) => `  ${h.file} matches ${h.pattern}`).join('\n'));
    }
});

check('docs/ has no Easepick references', () => {
    const hits = [];
    scanDir(path.join(projectRoot, 'docs'), ['.md'], hits);
    if (hits.length) {
        // Allow planning/done historical references — but docs/ is the published API surface.
        const real = hits.filter((h) => !h.file.includes('pending_update'));
        if (real.length) {
            throw new Error('Found Easepick references in published docs:\n' + real.map((h) => `  ${h.file} matches ${h.pattern}`).join('\n'));
        }
    }
});

check('dist/ bundle has no Easepick references (if built)', () => {
    const dist = path.join(projectRoot, 'dist');
    if (!fs.existsSync(dist)) {
        console.log('   (skipped — no dist directory)');
        return;
    }
    const hits = [];
    scanDir(dist, ['.js', '.css'], hits);
    if (hits.length) {
        throw new Error('Found Easepick references in built bundle:\n' + hits.map((h) => `  ${h.file} matches ${h.pattern}`).join('\n'));
    }
});

console.log('');
console.log(`📊 Result: ${passed} passed, ${failed} failed`);

if (failed > 0) process.exit(1);
