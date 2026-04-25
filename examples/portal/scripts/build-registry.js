#!/usr/bin/env node
/**
 * build-registry.js
 *
 * Walk examples/portal/examples/<area>/<Component>/example.json files, validate them,
 * and emit two artifacts:
 *
 *   1. examples/portal/examples.registry.json — consumed by the portal at boot
 *      and by the LLM-facing find-example skill.
 *   2. docs/web-mojo/examples.md — human-readable index, grouped by area.
 *
 * The output is sorted deterministically so re-running with no input changes
 * yields a byte-identical file.
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '../../..');
const EXAMPLES_ROOT = resolve(REPO_ROOT, 'examples/portal/examples');
const REGISTRY_PATH = resolve(REPO_ROOT, 'examples/portal/examples.registry.json');
const DOCS_INDEX_PATH = resolve(REPO_ROOT, 'docs/web-mojo/examples.md');

// Section order mirrors docs/web-mojo/README.md.
const AREA_ORDER = [
    'core',
    'pages',
    'services',
    'components',
    'extensions',
    'forms',
    'forms/inputs',
    'models',
];

const AREA_LABEL = {
    'core': 'Core',
    'pages': 'Pages',
    'services': 'Services',
    'components': 'Components',
    'extensions': 'Extensions',
    'forms': 'Forms',
    'forms/inputs': 'Form Inputs',
    'models': 'Models',
};

const REQUIRED_FIELDS = ['name', 'area', 'route', 'title', 'summary', 'page'];
const REQUIRED_PAGE_FIELDS = ['route', 'title', 'summary', 'page'];

function fail(msg) {
    console.error(`[build-registry] ${msg}`);
    process.exit(1);
}

function findManifests(dir) {
    const out = [];
    if (!existsSync(dir)) return out;
    for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);
        const stat = statSync(path);
        if (stat.isDirectory()) {
            out.push(...findManifests(path));
        } else if (entry === 'example.json') {
            out.push(path);
        }
    }
    return out;
}

function validateManifest(manifest, manifestPath) {
    const folder = dirname(manifestPath);

    // Two shapes: single page (top-level fields), or array of pages (`pages: [...]`).
    if (Array.isArray(manifest.pages)) {
        if (!manifest.name || !manifest.area) {
            fail(`${manifestPath}: array form requires top-level 'name' and 'area'`);
        }
        for (const page of manifest.pages) {
            for (const field of REQUIRED_PAGE_FIELDS) {
                if (!page[field]) {
                    fail(`${manifestPath}: page entry missing required field '${field}'`);
                }
            }
            const pageFile = join(folder, page.page);
            if (!existsSync(pageFile)) {
                fail(`${manifestPath}: referenced page file not found: ${page.page}`);
            }
        }
    } else {
        for (const field of REQUIRED_FIELDS) {
            if (!manifest[field]) {
                fail(`${manifestPath}: missing required field '${field}'`);
            }
        }
        const pageFile = join(folder, manifest.page);
        if (!existsSync(pageFile)) {
            fail(`${manifestPath}: referenced page file not found: ${manifest.page}`);
        }
    }
}

function expandManifest(manifest, manifestPath) {
    const folder = dirname(manifestPath);
    const folderRel = relative(REPO_ROOT, folder).replace(/\\/g, '/');

    const baseMenu = manifest.menu || {};
    const baseSection = baseMenu.section || AREA_LABEL[manifest.area] || manifest.area;
    const baseIcon = baseMenu.icon || 'bi-circle';
    const baseOrder = typeof baseMenu.order === 'number' ? baseMenu.order : 100;

    const make = (page, idx) => {
        const pageRel = `./${relative(resolve(REPO_ROOT, 'examples/portal'), join(folder, page.page)).replace(/\\/g, '/')}`;
        return {
            name: page.name || manifest.name,
            area: manifest.area,
            route: page.route,
            title: page.title,
            summary: page.summary,
            docs: page.docs || manifest.docs || null,
            tags: page.tags || manifest.tags || [],
            page: page.page,
            modulePath: pageRel,
            sourcePath: `${folderRel}/${page.page}`,
            section: page.section || baseSection,
            icon: page.icon || baseIcon,
            order: typeof page.order === 'number' ? page.order : baseOrder + idx,
        };
    };

    if (Array.isArray(manifest.pages)) {
        return manifest.pages.map((p, i) => make(p, i));
    }
    return [make(manifest, 0)];
}

function buildMenu(pages) {
    const byArea = new Map();
    for (const p of pages) {
        if (!byArea.has(p.area)) byArea.set(p.area, []);
        byArea.get(p.area).push(p);
    }

    const knownOrder = new Map(AREA_ORDER.map((a, i) => [a, i]));
    const areas = [...byArea.keys()].sort((a, b) => {
        const ai = knownOrder.has(a) ? knownOrder.get(a) : 999;
        const bi = knownOrder.has(b) ? knownOrder.get(b) : 999;
        if (ai !== bi) return ai - bi;
        return a.localeCompare(b);
    });

    return areas.map(area => {
        const sectionLabel = AREA_LABEL[area] || area;
        const sortedPages = byArea.get(area)
            .slice()
            .sort((a, b) => (a.order - b.order) || a.title.localeCompare(b.title))
            .map(p => ({
                route: p.route,
                title: p.title,
                summary: p.summary,
                icon: p.icon,
                docs: p.docs,
            }));
        return {
            area,
            section: sectionLabel,
            icon: byArea.get(area)[0]?.icon || 'bi-folder',
            pages: sortedPages,
        };
    });
}

function buildDocsIndex(menu) {
    const lines = [];
    lines.push('# Examples Index');
    lines.push('');
    lines.push('> **Generated** by `examples/portal/scripts/build-registry.js`. Do not edit by hand.');
    lines.push('');
    lines.push('Single canonical example per documented component. Folder taxonomy mirrors this docs tree. Each link below points at the runnable, copy-paste reference file in the new portal.');
    lines.push('');

    for (const area of menu) {
        lines.push(`## ${area.section}`);
        lines.push('');
        lines.push('| Component | Summary | Doc |');
        lines.push('|---|---|---|');
        for (const p of area.pages) {
            const sourcePath = `examples/portal/examples/${area.area}/${p.title.split(' ')[0]}/${p.title.split(' ')[0]}Example.js`;
            const docCell = p.docs ? `[${p.docs.replace(/^docs\/web-mojo\//, '')}](../../${p.docs})` : '—';
            lines.push(`| [${p.title.split(' ')[0]}](../../${sourcePath}) | ${p.summary} | ${docCell} |`);
        }
        lines.push('');
    }

    return lines.join('\n') + '\n';
}

function main() {
    const manifests = findManifests(EXAMPLES_ROOT).sort();
    const allPages = [];
    const seenRoutes = new Set();

    for (const manifestPath of manifests) {
        let manifest;
        try {
            manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
        } catch (e) {
            fail(`${manifestPath}: invalid JSON — ${e.message}`);
        }
        validateManifest(manifest, manifestPath);
        const pages = expandManifest(manifest, manifestPath);
        for (const p of pages) {
            if (seenRoutes.has(p.route)) {
                fail(`duplicate route '${p.route}' (latest from ${manifestPath})`);
            }
            seenRoutes.add(p.route);
            allPages.push(p);
        }
    }

    allPages.sort((a, b) => a.route.localeCompare(b.route));
    const menu = buildMenu(allPages);

    const registry = {
        generatedAt: 'static',
        pageCount: allPages.length,
        pages: allPages,
        menu,
    };

    writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2) + '\n');
    writeFileSync(DOCS_INDEX_PATH, buildDocsIndex(menu));

    console.log(`[build-registry] wrote ${allPages.length} examples across ${menu.length} areas`);
    console.log(`[build-registry] -> ${relative(REPO_ROOT, REGISTRY_PATH)}`);
    console.log(`[build-registry] -> ${relative(REPO_ROOT, DOCS_INDEX_PATH)}`);
}

main();
