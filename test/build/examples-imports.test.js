/**
 * Static import-symbol check for the examples portal.
 *
 * For every *Example.js under examples/portal/examples/, parse the import
 * statements and verify that every named symbol imported from 'web-mojo' (or
 * 'web-mojo/<sub>') is actually exported by the corresponding source-tree
 * entry point. Catches "this example imports a symbol that no longer exists"
 * without booting a browser.
 *
 * Pure regex parsing — the framework's export style is uniform enough
 * (`export { default as X } from '...'`, `export * from '...'`, named/default
 * imports). If/when the parsing ever stops being reliable, swap in
 * @babel/parser. Adds zero dependencies today.
 */

module.exports = async function(testContext) {
    const { describe, it, expect } = testContext;
    const fs = require('fs');
    const path = require('path');

    const REPO_ROOT = path.resolve(__dirname, '../..');
    const EXAMPLES_ROOT = path.join(REPO_ROOT, 'examples/portal/examples');
    const SRC_ROOT = path.join(REPO_ROOT, 'src');

    // Mirror of vite.config.js package-style aliases. If a new
    // 'web-mojo/<sub>' alias is added to vite.config.js, add it here too.
    // Verified against vite.config.js at the time of writing.
    const WEB_MOJO_ALIASES = {
        'web-mojo':           path.join(SRC_ROOT, 'index.js'),
        'web-mojo/charts':    path.join(SRC_ROOT, 'extensions/charts/index.js'),
        'web-mojo/lightbox':  path.join(SRC_ROOT, 'extensions/lightbox/index.js'),
        'web-mojo/map':       path.join(SRC_ROOT, 'extensions/map/index.js'),
        'web-mojo/admin':     path.join(SRC_ROOT, 'extensions/admin/index.js'),
        'web-mojo/auth':      path.join(SRC_ROOT, 'extensions/auth/index.js'),
        'web-mojo/user-profile': path.join(SRC_ROOT, 'extensions/user-profile/index.js'),
        'web-mojo/timeline':  path.join(SRC_ROOT, 'timeline.js'),
        'web-mojo/models':    path.join(SRC_ROOT, 'core/models/index.js'),
    };

    /**
     * Replace the contents of comments, single/double-quoted strings, and
     * template literals with whitespace of the same length. Preserves source
     * length and line layout so regex offsets remain meaningful, while making
     * `import`/`export` keywords inside string content invisible to scanners.
     */
    function stripCodeForImportScan(src) {
        let out = '';
        let i = 0;
        const n = src.length;
        while (i < n) {
            const c = src[i];
            const c2 = src[i + 1];

            // Block comment
            if (c === '/' && c2 === '*') {
                const end = src.indexOf('*/', i + 2);
                const stop = end === -1 ? n : end + 2;
                out += blank(src.slice(i, stop));
                i = stop;
                continue;
            }
            // Line comment
            if (c === '/' && c2 === '/') {
                let j = i;
                while (j < n && src[j] !== '\n') j++;
                out += blank(src.slice(i, j));
                i = j;
                continue;
            }
            // String literal (single or double)
            if (c === '"' || c === "'") {
                const quote = c;
                let j = i + 1;
                while (j < n) {
                    if (src[j] === '\\') { j += 2; continue; }
                    if (src[j] === quote) { j++; break; }
                    if (src[j] === '\n') { j++; break; } // unterminated — give up
                    j++;
                }
                out += blank(src.slice(i, j));
                i = j;
                continue;
            }
            // Template literal — keep ${...} expressions live, blank the rest.
            if (c === '`') {
                let j = i + 1;
                out += '`';
                while (j < n) {
                    if (src[j] === '\\') {
                        out += '  ';
                        j += 2;
                        continue;
                    }
                    if (src[j] === '$' && src[j + 1] === '{') {
                        // Find matching '}', tracking nested braces.
                        let depth = 1;
                        let k = j + 2;
                        while (k < n && depth > 0) {
                            if (src[k] === '{') depth++;
                            else if (src[k] === '}') depth--;
                            if (depth > 0) k++;
                        }
                        // Recurse into the expression so nested template
                        // literals / strings are also stripped.
                        out += '${' + stripCodeForImportScan(src.slice(j + 2, k)) + '}';
                        j = k + 1;
                        continue;
                    }
                    if (src[j] === '`') {
                        out += '`';
                        j++;
                        break;
                    }
                    out += src[j] === '\n' ? '\n' : ' ';
                    j++;
                }
                i = j;
                continue;
            }
            out += c;
            i++;
        }
        return out;
    }

    function blank(s) {
        // Replace every char with a space (preserve newlines so regex line
        // anchors keep working).
        let r = '';
        for (const ch of s) r += ch === '\n' ? '\n' : ' ';
        return r;
    }

    /** Recursively list *Example.js files under root. */
    function findExamples(root) {
        const out = [];
        if (!fs.existsSync(root)) return out;
        for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
            const full = path.join(root, entry.name);
            if (entry.isDirectory()) {
                out.push(...findExamples(full));
            } else if (entry.isFile() && /Example\.js$/.test(entry.name)) {
                out.push(full);
            }
        }
        return out;
    }

    /**
     * Parse `import` statements out of source. Returns an array of
     *   { source, defaultName, namespaceName, named: [{name, alias}] }
     * Side-effect imports (`import 'foo'`) are skipped — nothing to verify.
     *
     * Strips comments + string/template-literal content first so that
     * `import` keywords appearing inside snippet text (e.g. embedded code
     * samples in template literals) are not falsely matched as real imports.
     */
    function parseImports(source) {
        const imports = [];
        const code = stripCodeForImportScan(source);
        // Match: import <clause> from '<source>';
        // Clause forms: Default, Default,{Named}, {Named}, * as NS, Default,* as NS
        const re = /import\s+([^'"]*?)\s+from\s+['"]([^'"]+)['"]/g;
        let m;
        while ((m = re.exec(code)) !== null) {
            const clause = m[1].trim();
            const src = m[2];
            const entry = { source: src, defaultName: null, namespaceName: null, named: [] };

            // Split on top-level comma — but the named block { ... } may itself
            // contain commas. Handle by extracting the brace block first.
            let rest = clause;
            const braceMatch = rest.match(/\{([\s\S]*?)\}/);
            if (braceMatch) {
                const inside = braceMatch[1];
                inside.split(',').map(s => s.trim()).filter(Boolean).forEach(spec => {
                    // `name` or `name as alias` or `default as Local`
                    const asMatch = spec.match(/^([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)$/);
                    if (asMatch) {
                        entry.named.push({ name: asMatch[1], alias: asMatch[2] });
                    } else {
                        entry.named.push({ name: spec, alias: spec });
                    }
                });
                rest = rest.replace(braceMatch[0], '').trim();
            }

            // What's left is default and/or namespace, comma-separated.
            rest.split(',').map(s => s.trim()).filter(Boolean).forEach(part => {
                const nsMatch = part.match(/^\*\s+as\s+([A-Za-z_$][\w$]*)$/);
                if (nsMatch) {
                    entry.namespaceName = nsMatch[1];
                } else if (/^[A-Za-z_$][\w$]*$/.test(part)) {
                    entry.defaultName = part;
                }
            });

            imports.push(entry);
        }
        return imports;
    }

    /**
     * Collect the set of named symbols exported by an entry-point file.
     * Resolves `export * from './rel.js'` one level deep (i.e. a file
     * referenced via `export *` may itself contain named exports, but we
     * do NOT recurse further than that). The framework's actual export
     * graph is shallow enough that depth=2 is sufficient.
     *
     * Returns: Set<string> of exported names. `default` is included if
     * the file has any `export default`.
     */
    function collectExports(filePath, depth = 0, seen = new Set()) {
        const names = new Set();
        if (!fs.existsSync(filePath)) return names;
        if (seen.has(filePath)) return names;
        seen.add(filePath);
        const src = fs.readFileSync(filePath, 'utf8');

        // Strip block and line comments to avoid false positives. Cheap regex —
        // doesn't honor strings, but framework source doesn't contain `export`
        // inside string literals.
        const code = src
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/(^|[^:])\/\/[^\n]*/g, '$1');

        // export default … → expose as 'default'
        if (/(^|\n)\s*export\s+default\b/.test(code)) {
            names.add('default');
        }

        // export const|let|var|function|class FOO …
        const declRe = /(^|\n)\s*export\s+(?:const|let|var|function|class|async\s+function)\s+([A-Za-z_$][\w$]*)/g;
        let m;
        while ((m = declRe.exec(code)) !== null) {
            names.add(m[2]);
        }

        // export { A, B as C } [from '...']
        const namedRe = /export\s*\{([\s\S]*?)\}\s*(?:from\s*['"]([^'"]+)['"])?\s*;?/g;
        while ((m = namedRe.exec(code)) !== null) {
            const inside = m[1];
            inside.split(',').map(s => s.trim()).filter(Boolean).forEach(spec => {
                const asMatch = spec.match(/^([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)$/);
                names.add(asMatch ? asMatch[2] : spec);
            });
        }

        // export * from '<rel>'  — recurse one level
        if (depth < 1) {
            const starRe = /export\s*\*\s*from\s*['"]([^'"]+)['"]/g;
            while ((m = starRe.exec(code)) !== null) {
                const resolved = resolveRelative(filePath, m[1]);
                if (resolved) {
                    for (const sub of collectExports(resolved, depth + 1, seen)) {
                        if (sub !== 'default') names.add(sub); // export * does NOT re-export default
                    }
                }
            }
        }

        return names;
    }

    /**
     * Resolve a relative or aliased import to a file path. Supports the same
     * @core / @ext aliases vite uses, plus relative paths. Tries the literal
     * path, then .js, then /index.js.
     */
    function resolveRelative(fromFile, spec) {
        let candidate;
        if (spec.startsWith('@core/')) {
            candidate = path.join(SRC_ROOT, 'core', spec.slice('@core/'.length));
        } else if (spec.startsWith('@ext/')) {
            candidate = path.join(SRC_ROOT, 'extensions', spec.slice('@ext/'.length));
        } else if (spec.startsWith('.')) {
            candidate = path.resolve(path.dirname(fromFile), spec);
        } else {
            return null; // bare specifier — not handled (web-mojo aliases are top-level only here)
        }
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
        if (fs.existsSync(candidate + '.js')) return candidate + '.js';
        const idx = path.join(candidate, 'index.js');
        if (fs.existsSync(idx)) return idx;
        return null;
    }

    // ---- Discover examples and pre-compute per-entry exports ----
    const exampleFiles = findExamples(EXAMPLES_ROOT);
    const exportsByAlias = {};
    for (const [alias, entryFile] of Object.entries(WEB_MOJO_ALIASES)) {
        exportsByAlias[alias] = collectExports(entryFile);
    }

    describe('examples portal: every imported symbol is exported by web-mojo', () => {
        it('discovered at least one example file', () => {
            expect(exampleFiles.length).toBeGreaterThan(0);
        });

        for (const file of exampleFiles) {
            const rel = path.relative(REPO_ROOT, file);
            const source = fs.readFileSync(file, 'utf8');
            const imports = parseImports(source);

            for (const imp of imports) {
                if (!imp.source.startsWith('web-mojo')) {
                    // Defensive: example files are supposed to import only
                    // from 'web-mojo' (per examples/portal/README.md).
                    it(`${rel} imports only from web-mojo (saw '${imp.source}')`, () => {
                        expect(imp.source.startsWith('web-mojo')).toBe(true);
                    });
                    continue;
                }

                const aliasExports = exportsByAlias[imp.source];

                it(`${rel}: '${imp.source}' resolves to a known entry point`, () => {
                    expect(aliasExports).toBeDefined();
                });
                if (!aliasExports) continue;

                if (imp.defaultName) {
                    it(`${rel}: '${imp.source}' provides a default export (for ${imp.defaultName})`, () => {
                        expect(aliasExports.has('default')).toBe(true);
                    });
                }

                for (const { name } of imp.named) {
                    it(`${rel}: '${imp.source}' exports {${name}}`, () => {
                        if (!aliasExports.has(name)) {
                            throw new Error(
                                `${rel} imports {${name}} from '${imp.source}' ` +
                                `but ${path.relative(REPO_ROOT, WEB_MOJO_ALIASES[imp.source])} ` +
                                `does not export ${name}.`
                            );
                        }
                        expect(aliasExports.has(name)).toBe(true);
                    });
                }
            }
        }
    });
};
