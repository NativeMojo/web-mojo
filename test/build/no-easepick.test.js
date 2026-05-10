/**
 * Build assertion: Easepick is gone.
 *
 * The picker rebuild removed the runtime CDN dependency. This test fails
 * if any reference to Easepick or its CDN sneaks back into source or the
 * built bundle.
 */

module.exports = async function(testContext) {
    const { describe, it, expect } = testContext;
    const fs = require('fs');
    const path = require('path');

    const REPO_ROOT = path.resolve(__dirname, '../..');

    const FORBIDDEN_PATTERNS = [
        /easepick/i,
        /cdn\.jsdelivr\.net\/npm\/@easepick/i,
    ];

    function scanDir(dir, exts) {
        const hits = [];
        if (!fs.existsSync(dir)) return hits;
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
                hits.push(...scanDir(full, exts));
            } else {
                if (!exts.some((e) => entry.name.endsWith(e))) continue;
                const text = fs.readFileSync(full, 'utf8');
                for (const pat of FORBIDDEN_PATTERNS) {
                    if (pat.test(text)) {
                        hits.push({ file: path.relative(REPO_ROOT, full), pattern: pat.toString() });
                    }
                }
            }
        }
        return hits;
    }

    describe('No-Easepick build assertion', () => {
        it('src/ has no Easepick references', () => {
            const hits = scanDir(path.join(REPO_ROOT, 'src'), ['.js', '.css', '.html']);
            expect(hits).toEqual([]);
        });

        it('docs/ has no Easepick references in published docs', () => {
            const hits = scanDir(path.join(REPO_ROOT, 'docs'), ['.md'])
                .filter((h) => !h.file.includes('pending_update'));
            expect(hits).toEqual([]);
        });

        it('dist/ bundle has no Easepick references (if built)', () => {
            const dist = path.join(REPO_ROOT, 'dist');
            if (!fs.existsSync(dist)) return;
            const hits = scanDir(dist, ['.js', '.css']);
            expect(hits).toEqual([]);
        });
    });
};
