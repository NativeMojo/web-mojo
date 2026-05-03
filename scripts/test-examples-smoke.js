#!/usr/bin/env node
/**
 * Headless smoke test for the examples portal.
 *
 * Boots Vite programmatically on an ephemeral port, launches Chromium via
 * Playwright, visits every route in examples/portal/examples.registry.json,
 * and fails on `pageerror` / unhandled rejection / "the example never
 * mounted." Backend network errors (NativeMojo at localhost:9009) are NOT
 * treated as failures — many examples render fine without a backend, and
 * the ones that need it fail in REST-layer code that surfaces as a fetch
 * rejection rather than a JS error.
 *
 * NOT wired into the default test runner. Invoke via `npm run test:examples`.
 * One-time setup: `npx playwright install chromium`.
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const REGISTRY_PATH = path.join(REPO_ROOT, 'examples/portal/examples.registry.json');

// Settle window after navigation — gives async imports + first paint a chance
// to finish before we declare the page mounted.
const SETTLE_MS = 1500;

// Hostnames whose network failures we ignore. The portal uses a mock backend
// for known endpoints, but un-mocked calls fall through to localhost:9009 —
// which is expected to be down on most CI machines.
const IGNORE_NET_HOSTS = ['localhost:9009', '127.0.0.1:9009'];

async function loadPlaywright() {
    try {
        return require('playwright');
    } catch (err) {
        console.error('✗ playwright is not installed.');
        console.error('  Run:  npm install   (and then: npx playwright install chromium)');
        process.exit(1);
    }
}

async function startVite() {
    const vite = await import('vite');
    const server = await vite.createServer({
        configFile: path.join(REPO_ROOT, 'vite.config.js'),
        root: REPO_ROOT,
        server: { port: 0, host: '127.0.0.1', open: false },
        logLevel: 'warn',
    });
    await server.listen();
    const addr = server.httpServer.address();
    const port = typeof addr === 'object' ? addr.port : addr;
    return { server, port };
}

function loadRegistry() {
    if (!fs.existsSync(REGISTRY_PATH)) {
        console.error(`✗ registry not found: ${REGISTRY_PATH}`);
        console.error('  Run:  npm run examples:registry');
        process.exit(1);
    }
    const reg = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
    if (!Array.isArray(reg.pages) || reg.pages.length === 0) {
        console.error('✗ registry has no pages');
        process.exit(1);
    }
    return reg;
}

function isIgnorableNetError(message) {
    return IGNORE_NET_HOSTS.some(h => message.includes(h));
}

/**
 * Visit one route and report pass/fail.
 * The portal mounts at /examples/portal/?page=<route> per app.js (PortalWebApp
 * reads ?page=… from the URL). Asserts that #page-container has rendered
 * something after the settle window.
 */
async function visitRoute(page, baseUrl, route) {
    const errors = [];
    const url = `${baseUrl}/examples/portal/?page=${encodeURIComponent(route)}`;

    const onPageError = (err) => errors.push(`pageerror: ${err.message}`);
    const onConsole = (msg) => {
        if (msg.type() !== 'error') return;
        const text = msg.text();
        if (isIgnorableNetError(text)) return;
        // Filter Chromium's own network failure noise — we only care about JS errors.
        if (/Failed to load resource/i.test(text) && isIgnorableNetError(text)) return;
        errors.push(`console.error: ${text}`);
    };
    page.on('pageerror', onPageError);
    page.on('console', onConsole);

    try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
    } catch (err) {
        // Network-idle can time out on routes that keep sockets open (e.g. WS
        // examples). Fall back to domcontentloaded; we still capture errors.
        try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
        } catch (e2) {
            errors.push(`navigation: ${e2.message}`);
        }
    }
    await page.waitForTimeout(SETTLE_MS);

    let mounted = false;
    try {
        mounted = await page.evaluate(() => {
            const el = document.querySelector('#page-container');
            return !!el && el.children.length > 0;
        });
    } catch (err) {
        errors.push(`evaluate: ${err.message}`);
    }
    if (!mounted) errors.push('page-container did not render any children');

    page.off('pageerror', onPageError);
    page.off('console', onConsole);

    return { route, url, errors };
}

async function main() {
    const playwright = await loadPlaywright();
    const reg = loadRegistry();

    console.log(`📋 ${reg.pages.length} routes to visit`);
    console.log('🚀 starting Vite...');
    const { server, port } = await startVite();
    const baseUrl = `http://127.0.0.1:${port}`;
    console.log(`   Vite listening on ${baseUrl}`);

    let browser;
    const failures = [];
    try {
        browser = await playwright.chromium.launch();
        const context = await browser.newContext();
        const page = await context.newPage();

        // Silence Vite HMR pings so they don't show up in console.error filtering.
        await page.addInitScript(() => {
            window.addEventListener('error', (e) => {
                // Let pageerror handle uncaught — but suppress nothing here.
            });
        });

        let i = 0;
        for (const p of reg.pages) {
            i += 1;
            const result = await visitRoute(page, baseUrl, p.route);
            if (result.errors.length === 0) {
                process.stdout.write(`  ✓ [${i}/${reg.pages.length}] ${p.route}\n`);
            } else {
                process.stdout.write(`  ✗ [${i}/${reg.pages.length}] ${p.route}\n`);
                for (const e of result.errors) process.stdout.write(`      ${e}\n`);
                failures.push(result);
            }
        }
    } finally {
        if (browser) await browser.close().catch(() => {});
        await server.close().catch(() => {});
    }

    console.log('');
    if (failures.length > 0) {
        console.log(`✗ ${failures.length}/${reg.pages.length} routes failed:`);
        for (const f of failures) {
            console.log(`  ${f.route}  ${f.url}`);
            for (const e of f.errors) console.log(`    ${e}`);
        }
        process.exit(1);
    } else {
        console.log(`✓ all ${reg.pages.length} routes passed`);
        process.exit(0);
    }
}

main().catch((err) => {
    console.error('fatal:', err);
    process.exit(1);
});
