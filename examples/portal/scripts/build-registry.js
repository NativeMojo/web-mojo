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

// Topic taxonomy — authoritative information architecture for the portal.
//
// Drives both the human-facing sidebar menus AND the LLM-facing `topics` tree
// in examples.registry.json + the H2/H3 structure of docs/web-mojo/examples.md.
// Adding a new example requires adding its route here, otherwise the build
// fails with a clear message.
//
// Each topic lists groups in display order. Each group lists "items" — either
// a single route (a leaf) or `{ route, children: [...] }` where children are
// variant subroutes that should collapse under the parent in the sidebar.
const TOPIC_TAXONOMY = [
    {
        name: 'architecture',
        label: 'Architecture',
        icon: 'bi-diagram-2',
        groups: [
            {
                label: 'Core',
                items: [
                    'core/view',
                    'core/view-child-views',
                    'core/advanced-views',
                    'core/templates',
                    'core/data-formatter',
                    'core/model',
                    'core/collection',
                    'core/events',
                ],
            },
            {
                label: 'App Shells',
                items: ['core/web-app', 'core/portal-app', 'core/portal-web-app'],
            },
            {
                label: 'Pages',
                items: [
                    'pages/page',
                    'pages/form-page',
                    'pages/table-page',
                    'pages/table-page/forms',
                    'pages/table-page/detail-view',
                ],
            },
            {
                label: 'Services',
                items: [
                    'services/rest',
                    'services/toast-service',
                    'services/web-socket-client',
                    'services/file-upload',
                ],
            },
            {
                label: 'Models',
                items: ['models/builtin-models'],
            },
        ],
    },
    {
        name: 'components',
        label: 'Components',
        icon: 'bi-grid-3x3-gap',
        groups: [
            {
                label: 'Modals & Dialogs',
                items: [
                    'components/dialog',
                    'components/dialog/form',
                    'components/dialog/context-menu',
                    'components/dialog/custom-body',
                    'components/modal',
                    'components/modal/show-model',
                    'components/modal/form',
                ],
            },
            {
                label: 'Lists & Tables',
                items: [
                    'components/list-view',
                    'components/list-view/custom-item',
                    'components/list-view/live-filter',
                    'components/table-view',
                    'components/table-view/batch-actions',
                    'components/table-view/custom-row',
                    'components/table-view/server-collection',
                    'components/data-view',
                ],
            },
            {
                label: 'Files',
                items: [
                    'components/file-view',
                    'components/file-view/inline',
                    'components/image-fields',
                ],
            },
            {
                label: 'Navigation',
                items: [
                    'components/sidebar-top-nav',
                    'components/active-group',
                    'components/side-nav-view',
                    'components/tab-view',
                    'components/tab-view/dynamic',
                    'components/context-menu',
                    'components/context-menu/row',
                ],
            },
            {
                label: 'Other',
                items: ['components/chat-view'],
            },
        ],
    },
    {
        name: 'forms',
        label: 'Forms',
        icon: 'bi-ui-checks',
        groups: [
            {
                label: 'FormView',
                items: [
                    'forms/form-view',
                    'forms/form-view/all-field-types',
                    'forms/form-builder',
                ],
            },
            {
                label: 'Field Types',
                items: [
                    'forms/text-inputs',
                    'forms/selection-fields',
                    'forms/date-time-fields',
                    'forms/file-media-fields',
                    'forms/textarea-fields',
                    'forms/structural-fields',
                    'forms/other-fields',
                ],
            },
            {
                label: 'Specialized Inputs',
                items: [
                    'forms/inputs/tag-input',
                    'forms/inputs/date-picker',
                    'forms/inputs/date-range-picker',
                    'forms/inputs/multi-select',
                    'forms/inputs/combo-input',
                    'forms/inputs/collection-select',
                    'forms/inputs/image-field',
                ],
            },
            {
                label: 'Patterns',
                items: [
                    'forms/validation',
                    'forms/validation/advanced',
                    'forms/form-layout',
                    'forms/multi-step-wizard',
                    'forms/search-filter-form',
                ],
            },
        ],
    },
    {
        name: 'extensions',
        label: 'Extensions',
        icon: 'bi-puzzle',
        groups: [
            {
                label: 'Charts',
                items: [
                    'extensions/charts',
                    'extensions/charts/series',
                    'extensions/charts/pie',
                    'extensions/charts/circular-progress',
                    'extensions/charts/metrics-mini-chart',
                ],
            },
            {
                label: 'Maps & Location',
                items: ['extensions/map-view', 'extensions/map-libre-view', 'extensions/location'],
            },
            {
                label: 'Media',
                items: ['extensions/light-box'],
            },
            {
                label: 'UI',
                items: [
                    'extensions/timeline-view',
                ],
            },
        ],
    },
];

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

function resolvePageFile(folder, pageField, manifestPath) {
    if (typeof pageField !== 'string' || !pageField) {
        fail(`${manifestPath}: 'page' must be a non-empty string`);
    }
    if (pageField.includes('..') || pageField.startsWith('/') || pageField.includes('\0')) {
        fail(`${manifestPath}: 'page' must be a simple filename inside the manifest folder, got '${pageField}'`);
    }
    const pageFile = resolve(folder, pageField);
    const folderResolved = resolve(folder);
    if (pageFile !== folderResolved && !pageFile.startsWith(folderResolved + '/')) {
        fail(`${manifestPath}: 'page' resolves outside the manifest folder: '${pageField}'`);
    }
    if (!pageFile.startsWith(EXAMPLES_ROOT + '/')) {
        fail(`${manifestPath}: 'page' resolves outside the examples tree`);
    }
    if (!existsSync(pageFile)) {
        fail(`${manifestPath}: referenced page file not found: ${pageField}`);
    }
    return pageFile;
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
            resolvePageFile(folder, page.page, manifestPath);
        }
    } else {
        for (const field of REQUIRED_FIELDS) {
            if (!manifest[field]) {
                fail(`${manifestPath}: missing required field '${field}'`);
            }
        }
        resolvePageFile(folder, manifest.page, manifestPath);
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
        const taxon = TOPIC_BY_ROUTE.get(page.route);
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
            topic: taxon ? taxon.topic : null,
            group: taxon ? taxon.group : null,
        };
    };

    if (Array.isArray(manifest.pages)) {
        return manifest.pages.map((p, i) => make(p, i));
    }
    return [make(manifest, 0)];
}

// Flatten the topic taxonomy into a route → { topic, group } lookup.
//
// Items must be plain route strings. Collapsible "parent with children"
// entries are a UX bug: the framework's Sidebar renders a parent's anchor
// as a Bootstrap collapse toggle (data-bs-toggle="collapse"), so clicking
// it never navigates to the parent's route — the basic page becomes
// unreachable from the sidebar. Variants belong as siblings in the same
// group instead. Enforced at build time below.
const TOPIC_BY_ROUTE = (() => {
    const map = new Map();
    for (const topic of TOPIC_TAXONOMY) {
        for (const group of topic.groups) {
            for (const item of group.items) {
                if (typeof item !== 'string') {
                    fail(`TOPIC_TAXONOMY: items must be plain route strings; got an object with route '${item.route}'. Collapsible parents are unreachable from the sidebar — list the parent and its variants as flat siblings in the same group instead.`);
                }
                map.set(item, { topic: topic.name, group: group.label });
            }
        }
    }
    return map;
})();

function buildTopics(pages) {
    const byRoute = new Map(pages.map(p => [p.route, p]));
    const topics = [];

    for (const topic of TOPIC_TAXONOMY) {
        const groups = [];
        for (const group of topic.groups) {
            const items = [];
            for (const route of group.items) {
                const page = byRoute.get(route);
                if (!page) continue;
                items.push(pageEntry(page));
            }
            if (items.length) groups.push({ label: group.label, items });
        }
        if (groups.length) topics.push({ name: topic.name, label: topic.label, icon: topic.icon, groups });
    }

    return topics;
}

function pageEntry(p) {
    return {
        route: p.route,
        title: p.title,
        summary: p.summary,
        icon: p.icon,
        docs: p.docs,
    };
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

function escapeMdCell(text) {
    if (text == null) return '';
    return String(text)
        .replace(/\\/g, '\\\\')
        .replace(/\|/g, '\\|')
        .replace(/\r?\n/g, ' ');
}

function buildDocsIndex(topics, pagesByRoute) {
    const lines = [];
    lines.push('# Examples Index');
    lines.push('');
    lines.push('> **Generated** by `examples/portal/scripts/build-registry.js`. Do not edit by hand.');
    lines.push('');
    lines.push('Single canonical example per documented component. Pages are organized by topic — the same taxonomy that drives the portal sidebars. Each link below points at the runnable, copy-paste reference file.');
    lines.push('');

    const renderRow = (entry) => {
        const page = pagesByRoute.get(entry.route);
        if (!page) return null;
        const docCell = page.docs
            ? `[${escapeMdCell(page.docs.replace(/^docs\/web-mojo\//, ''))}](../../${page.docs})`
            : '—';
        return `| [${escapeMdCell(page.title)}](../../${page.sourcePath}) | ${escapeMdCell(page.summary)} | ${docCell} |`;
    };

    for (const topic of topics) {
        lines.push(`## ${topic.label}`);
        lines.push('');
        for (const group of topic.groups) {
            lines.push(`### ${group.label}`);
            lines.push('');
            lines.push('| Component | Summary | Doc |');
            lines.push('|---|---|---|');
            for (const item of group.items) {
                const row = renderRow(item);
                if (row) lines.push(row);
            }
            lines.push('');
        }
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

    // Verify that every page has a topic assignment. Catches new examples
    // added without a TOPIC_TAXONOMY entry, and stale taxonomy entries
    // pointing at routes that no longer exist.
    const orphans = allPages.filter(p => !p.topic);
    if (orphans.length) {
        for (const o of orphans) {
            console.error(`[build-registry] route '${o.route}' is not in TOPIC_TAXONOMY (build-registry.js)`);
        }
        fail(`${orphans.length} route(s) missing topic assignment — add them to TOPIC_TAXONOMY`);
    }
    const taxonomyRoutes = new Set();
    for (const t of TOPIC_TAXONOMY) {
        for (const g of t.groups) {
            for (const route of g.items) taxonomyRoutes.add(route);
        }
    }
    const knownRoutes = new Set(allPages.map(p => p.route));
    for (const r of taxonomyRoutes) {
        if (!knownRoutes.has(r)) {
            fail(`TOPIC_TAXONOMY references unknown route '${r}'`);
        }
    }

    const menu = buildMenu(allPages);
    const topics = buildTopics(allPages);

    const registry = {
        generatedAt: 'static',
        pageCount: allPages.length,
        pages: allPages,
        topics,
        menu,
    };

    writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2) + '\n');
    const pagesByRoute = new Map(allPages.map(p => [p.route, p]));
    writeFileSync(DOCS_INDEX_PATH, buildDocsIndex(topics, pagesByRoute));

    console.log(`[build-registry] wrote ${allPages.length} examples across ${topics.length} topics (${menu.length} legacy areas)`);
    console.log(`[build-registry] -> ${relative(REPO_ROOT, REGISTRY_PATH)}`);
    console.log(`[build-registry] -> ${relative(REPO_ROOT, DOCS_INDEX_PATH)}`);
}

main();
