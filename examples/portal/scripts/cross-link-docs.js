#!/usr/bin/env node
/**
 * cross-link-docs.js
 *
 * For each doc under `docs/web-mojo/` referenced by an entry in
 * `examples/portal/examples.registry.json`, append (or replace) a single
 * `## Examples` section listing all the example files that demonstrate it.
 *
 * Idempotent: re-running with no new examples produces no diff.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '../../..');
const REGISTRY_PATH = resolve(REPO_ROOT, 'examples/portal/examples.registry.json');

const SECTION_HEADING = '## Examples';
const MARKER_BEGIN = '<!-- examples:cross-link begin -->';
const MARKER_END = '<!-- examples:cross-link end -->';

function loadRegistry() {
    return JSON.parse(readFileSync(REGISTRY_PATH, 'utf8'));
}

function groupByDoc(pages) {
    const map = new Map();
    for (const p of pages) {
        if (!p.docs || !p.docs.startsWith('docs/web-mojo/')) continue;
        if (!map.has(p.docs)) map.set(p.docs, []);
        map.get(p.docs).push(p);
    }
    for (const list of map.values()) {
        list.sort((a, b) => a.route.localeCompare(b.route));
    }
    return map;
}

function buildSection(docPath, examples) {
    const docFullPath = resolve(REPO_ROOT, docPath);
    const docDir = dirname(docFullPath);
    const lines = [SECTION_HEADING, '', MARKER_BEGIN];
    if (examples.length === 1) {
        const ex = examples[0];
        const examplePath = resolve(REPO_ROOT, ex.sourcePath);
        const rel = relative(docDir, examplePath).replace(/\\/g, '/');
        lines.push('');
        lines.push(`Runnable, copy-paste reference in the examples portal:`);
        lines.push('');
        lines.push(`- [\`${ex.sourcePath}\`](${rel}) — ${ex.summary}`);
    } else {
        lines.push('');
        lines.push(`Runnable, copy-paste references in the examples portal:`);
        lines.push('');
        for (const ex of examples) {
            const examplePath = resolve(REPO_ROOT, ex.sourcePath);
            const rel = relative(docDir, examplePath).replace(/\\/g, '/');
            lines.push(`- [\`${ex.sourcePath}\`](${rel}) — ${ex.summary}`);
        }
    }
    lines.push('');
    lines.push(MARKER_END);
    return lines.join('\n');
}

function applySection(docPath, section) {
    const fullPath = resolve(REPO_ROOT, docPath);
    if (!existsSync(fullPath)) {
        console.warn(`[cross-link] doc not found: ${docPath} — skipping`);
        return { path: docPath, action: 'skipped-missing' };
    }
    let content = readFileSync(fullPath, 'utf8');

    // Strategy: find an existing managed block and replace it; otherwise append.
    const beginIdx = content.indexOf(MARKER_BEGIN);
    const endIdx = content.indexOf(MARKER_END);

    if (beginIdx !== -1 && endIdx !== -1 && endIdx > beginIdx) {
        // Find the heading line above the begin marker. Replace from heading -> end marker.
        const before = content.slice(0, beginIdx);
        const lastHeadingIdx = before.lastIndexOf(SECTION_HEADING);
        const blockStart = lastHeadingIdx === -1 ? beginIdx : lastHeadingIdx;
        const after = content.slice(endIdx + MARKER_END.length);
        const updated = content.slice(0, blockStart) + section + after;
        if (updated === content) return { path: docPath, action: 'unchanged' };
        writeFileSync(fullPath, updated);
        return { path: docPath, action: 'replaced' };
    }

    // No managed block. Append a new section, preserving trailing newline.
    const trimmed = content.replace(/\s+$/, '');
    const updated = trimmed + '\n\n' + section + '\n';
    if (updated === content) return { path: docPath, action: 'unchanged' };
    writeFileSync(fullPath, updated);
    return { path: docPath, action: 'appended' };
}

function main() {
    const registry = loadRegistry();
    const docs = groupByDoc(registry.pages);
    const results = [];
    const sortedDocs = [...docs.keys()].sort();
    for (const docPath of sortedDocs) {
        const examples = docs.get(docPath);
        const section = buildSection(docPath, examples);
        results.push(applySection(docPath, section));
    }
    const summary = results.reduce((acc, r) => {
        acc[r.action] = (acc[r.action] || 0) + 1;
        return acc;
    }, {});
    console.log(`[cross-link] processed ${results.length} docs:`, summary);
    const skipped = results.filter(r => r.action === 'skipped-missing');
    if (skipped.length) {
        console.warn('[cross-link] missing docs:');
        for (const s of skipped) console.warn(`  - ${s.path}`);
    }
}

main();
