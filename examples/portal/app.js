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

import { PortalWebApp, User } from 'web-mojo';
import HomePage from './shell/HomePage.js';
import DocsModal from './shell/DocsModal.js';
import { installMockBackend } from './shell/mockBackend.js';
import registry from './examples.registry.json';

// Mock REST layer — short-circuits known endpoints with synthetic data so
// every example renders without a live backend. Falls through to real
// fetch for un-mocked URLs, so a running NativeMojo server still wins
// on those routes. MUST install before app.start() so the very first
// boot-time fetches are intercepted.
installMockBackend();

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
        shadow: 'dark',
        showSidebarToggle: true,
        // Right-side topbar items: docs index, GitHub link, login slot.
        // The framework swaps `id: 'login'` for `userMenu` the moment
        // `app.setActiveUser(user)` is called.
        rightItems: [
            {
                id: 'docs-index',
                icon: 'bi-book',
                action: 'open-examples-index',
                tooltip: 'Browse docs index',
                buttonClass: 'btn btn-link',
            },
            {
                id: 'github',
                icon: 'bi-github',
                href: 'https://github.com/NativeMojo/web-mojo',
                tooltip: 'web-mojo on GitHub',
            },
            // Login placeholder — replaced by userMenu after setActiveUser.
            {
                id: 'login',
                icon: 'bi-box-arrow-in-right',
                label: 'Login',
                href: '/examples/auth/',
            },
        ],
        // The user menu — even with auth disabled the framework still renders
        // it. Useful as a copy-paste reference for downstream apps.
        userMenu: {
            label: 'Demo User',
            icon: 'bi-person-circle',
            items: [
                { label: 'Profile',         icon: 'bi-person',      action: 'profile' },
                { label: 'Settings',        icon: 'bi-sliders',     action: 'open-settings' },
                { divider: true },
                { label: 'Theme: Light',    icon: 'bi-sun',         action: 'theme-light' },
                { label: 'Theme: Dark',     icon: 'bi-moon-stars',  action: 'theme-dark' },
                { divider: true },
                { label: 'Sign out',        icon: 'bi-box-arrow-right', action: 'logout' },
            ],
        },
    },
});

// Wire the topbar actions. `portal:action` is the canonical event for
// rightItems / userMenu actions in PortalApp.
app.events.on('portal:action', ({ action }) => {
    switch (action) {
        case 'open-examples-index':
            DocsModal.open('docs/web-mojo/examples.md');
            break;
        case 'profile':
            app.toast?.info?.('No real user — auth is disabled in this portal.');
            break;
        case 'open-settings':
            app.toast?.info?.('Settings menu would live here in a real app.');
            break;
        case 'theme-light':
            document.documentElement.setAttribute('data-bs-theme', 'light');
            app.toast?.success?.('Switched to light theme.');
            break;
        case 'theme-dark':
            document.documentElement.setAttribute('data-bs-theme', 'dark');
            app.toast?.success?.('Switched to dark theme.');
            break;
        case 'logout':
            app.toast?.warn?.('Auth is disabled — nothing to log out of here.');
            break;
    }
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

// Global doc-link interceptor: anywhere in the portal, an element marked
// `<a data-action="open-doc" data-doc="docs/web-mojo/<area>/<File>.md">…</a>`
// opens the markdown in a Modal instead of navigating the browser.
document.addEventListener('click', (event) => {
    const el = event.target.closest('[data-action="open-doc"]');
    if (!el) return;
    const docPath = el.getAttribute('data-doc');
    if (!docPath) return;
    event.preventDefault();
    DocsModal.open(docPath);
});

await app.start();

// Auth is disabled in this portal, but the topbar's userMenu only renders
// when an active user is set (the framework swaps a `loginMenu` placeholder
// for the userMenu the moment `setActiveUser` is called). Faking a demo
// user gives downstream readers a concrete reference for what userMenu
// looks like in production.
const demoUser = new User({
    id: 1,
    username: 'demo',
    display_name: 'Demo User',
    email: 'demo@example.com',
});
// Defer one tick so any pending render in start() finishes first.
setTimeout(() => app.setActiveUser(demoUser), 0);

window.app = app;
window.DocsModal = DocsModal;
