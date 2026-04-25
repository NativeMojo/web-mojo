/**
 * web-mojo Examples Portal — bootstrap.
 *
 * - PortalWebApp shell with auth disabled (the canonical examples don't depend
 *   on a logged-in user). Examples that hit `/api/*` require the NativeMojo
 *   backend at localhost:9009 to be running.
 * - Sidebar and routes are generated from `examples.registry.json`. To add a
 *   new example, drop a folder under `examples/<area>/<Component>/` with a
 *   `<Component>Example.js` and an `example.json`, then re-run
 *   `npm run examples:registry`.
 *
 * Imports `/src/...` are allowed in this shell because we're in the framework
 * repo. Per-component example files MUST import from `web-mojo` only.
 */

import { PortalWebApp } from 'web-mojo';
import HomePage from './shell/HomePage.js';
import registry from './examples.registry.json';

const examples = Array.isArray(registry?.pages) ? registry.pages : [];
const menuAreas = Array.isArray(registry?.menu) ? registry.menu : [];

const sidebarItems = [
    { text: 'Home', route: '?page=home', icon: 'bi-house' },
    { divider: true },
];

for (const area of menuAreas) {
    if (!area.pages || !area.pages.length) continue;
    sidebarItems.push({
        text: area.section,
        icon: area.icon || 'bi-folder',
        children: area.pages.map(p => ({
            text: p.title,
            route: `?page=${p.route}`,
            icon: p.icon || 'bi-circle',
        })),
    });
}

const app = new PortalWebApp({
    name: 'web-mojo Examples',
    container: '#app',
    pageContainer: '#page-container',
    defaultRoute: 'home',
    showPageHeader: false,

    api: { baseUrl: 'http://localhost:9009', timeout: 30000 },
    auth: false,
    ws: false,

    brand: 'web-mojo Examples',
    brandIcon: 'bi-lightning-charge',

    sidebar: {
        menus: [{
            name: 'default',
            className: 'sidebar sidebar-dark',
            items: sidebarItems,
        }],
    },

    topbar: {
        brand: 'web-mojo Examples',
        brandIcon: 'bi-lightning-charge',
        brandRoute: '?page=home',
        theme: 'dark',
        showSidebarToggle: true,
    },
});

app.registerPage('home', HomePage, { areas: menuAreas });

for (const ex of examples) {
    try {
        const mod = await import(/* @vite-ignore */ ex.modulePath);
        const PageClass = mod.default;
        if (!PageClass) {
            console.warn(`[examples] ${ex.route}: ${ex.modulePath} has no default export`);
            continue;
        }
        app.registerPage(ex.route, PageClass);
    } catch (err) {
        console.error(`[examples] failed to load ${ex.route} from ${ex.modulePath}`, err);
    }
}

await app.start();

window.app = app;
