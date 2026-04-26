/**
 * mockBackend.js — offline-friendly REST shim for the examples portal.
 *
 * Monkey-patches `window.fetch` BEFORE `app.start()`. Requests whose URL
 * matches one of the route handlers below are answered with synthetic
 * data; everything else passes through to the real fetch — so if a real
 * NativeMojo backend IS running on `localhost:9009`, examples that hit
 * un-mocked endpoints still work.
 *
 * The shape of each response matches what the framework's Rest client
 * expects to find at `response.data`:
 *
 *   - List endpoints  → `{ data: [...], count, size, start, status: true }`
 *   - Object endpoints → `{ data: {...}, status: true }`
 *   - Metrics endpoint → `{ status: true, data: { labels: [...], data: { slug: [...] } } }`
 *
 * To add a new mock: add a `{ method, match, handler }` to ROUTES below.
 * `match` is a regex against the URL pathname; `handler` returns either
 * a plain JS object (becomes the JSON body) or a full `Response` if you
 * need custom status codes.
 */

const SEED_FILES = Array.from({ length: 25 }, (_, i) => ({
    id: 1000 + i,
    filename: ['report.pdf', 'logo.png', 'invoice.pdf', 'demo.mp4', 'avatar.jpg', 'archive.zip', 'notes.txt'][i % 7] + (i > 6 ? `-${i}` : ''),
    category: ['pdf', 'image', 'pdf', 'video', 'image', 'archive', 'document'][i % 7],
    content_type: ['application/pdf', 'image/png', 'application/pdf', 'video/mp4', 'image/jpeg', 'application/zip', 'text/plain'][i % 7],
    file_size: 25_000 + (i * 47_000) % 4_000_000,
    created: new Date(Date.now() - i * 86_400_000).toISOString(),
    modified: new Date(Date.now() - i * 3_600_000).toISOString(),
    upload_status: 'completed',
}));

// Seed groups for the ActiveGroup demo + GroupSearchView dialog.
// Each kind has at least one entry so the activegroup-by-kind demo can
// exercise the full sidebar.menus[].groupKind matching code path.
const SEED_GROUPS = [
    { id: 11, name: 'Acme Corp',          kind: 'org',      description: 'Parent organization' },
    { id: 12, name: 'Globex',             kind: 'org',      description: 'Sister org' },
    { id: 21, name: 'Engineering',        kind: 'team',     description: 'Builds the product' },
    { id: 22, name: 'Design',             kind: 'team',     description: 'UX + brand' },
    { id: 31, name: 'Pizza Palace',       kind: 'merchant', description: 'Sample merchant' },
    { id: 32, name: 'Sushi Spot',         kind: 'merchant', description: 'Another merchant' },
];

const SEED_USERS = Array.from({ length: 30 }, (_, i) => ({
    id: i + 1,
    username: `user${i + 1}`,
    display_name: ['Alice Adams','Ben Bryant','Carla Cruz','Dan Dietrich','Eve Estrada','Frank Fischer','Grace Gomez','Hank Huang','Iris Ito','Jack Jensen','Kira Klein','Liam Lopez','Mia Morales','Noah Nelson','Olivia Ortiz','Paul Park','Quinn Quan','Riya Reddy','Sam Suzuki','Tara Thompson','Uma Underhill','Victor Volkov','Wren Wexler','Xavi Xiang','Yara Yamada','Zoe Zhao','Adam Acosta','Bella Bauer','Carlo Conti','Dora Dahl'][i],
    email: `user${i + 1}@example.com`,
    role: ['admin', 'editor', 'viewer'][i % 3],
    status: ['active', 'invited', 'disabled'][i % 3],
    last_login: new Date(Date.now() - (i * 3_600_000)).toISOString(),
    created: new Date(Date.now() - (i * 86_400_000 * 7)).toISOString(),
}));

// Generate a believable time series for one metric slug + granularity.
function generateMetricSeries(slug, granularity = 'hours', size = 24) {
    const seed = slug.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    let value = 50 + (seed % 80);
    const series = [];
    for (let i = 0; i < size; i++) {
        // Random walk with mild trending
        value = Math.max(0, Math.round(value + (Math.random() - 0.45) * 20));
        series.push(value);
    }
    return series;
}

function buildMetricsLabels(granularity, size) {
    const labels = [];
    const now = new Date();
    const step =
        granularity === 'hours'   ? 3_600_000 :
        granularity === 'days'    ? 86_400_000 :
        granularity === 'weeks'   ? 7 * 86_400_000 :
        granularity === 'months'  ? 30 * 86_400_000 :
                                    3_600_000;
    for (let i = size - 1; i >= 0; i--) {
        const d = new Date(now.getTime() - i * step);
        labels.push(d.toISOString());
    }
    return labels;
}

// ── Route table ─────────────────────────────────────────────────────────
const ROUTES = [
    {
        // Metrics — matches /api/metrics/fetch (GET or POST).
        match: /\/api\/metrics\/fetch\b/,
        handler: (url, init) => {
            const params = parseParams(url, init);
            const slugs = (params.slugs || params.slug || '').split(',').filter(Boolean);
            const granularity = params.granularity || 'hours';
            const size = Number(params.size) || 24;
            const labels = buildMetricsLabels(granularity, size);
            const data = {};
            for (const slug of slugs.length ? slugs : ['default']) {
                data[slug] = generateMetricSeries(slug, granularity, size);
            }
            return jsonOk({ status: true, data: { labels, data } });
        },
    },
    {
        // User detail (must come before the list match below).
        match: /\/api\/(?:account\/)?user\/(\d+)(?:\/?)$/,
        handler: (url) => {
            const id = Number(url.match(/\/user\/(\d+)/)[1]);
            const user = SEED_USERS.find(u => u.id === id);
            return user ? jsonOk({ status: true, data: user }) : jsonStatus(404, { status: false, error: 'not found' });
        },
    },
    {
        // User list — `/api/user` (UserList default), `/api/users`, `/api/account/user`.
        match: /\/api\/(?:account\/)?users?(?:\/?)$/,
        handler: (url, init) => paginatedList(SEED_USERS, parseParams(url, init)),
    },
    {
        // File detail.
        match: /\/api\/fileman\/(?:file|manager)\/(\d+)(?:\/?)$/,
        handler: (url) => {
            const id = Number(url.match(/\/(\d+)(?:\/?)$/)[1]);
            const f = SEED_FILES.find(x => x.id === id);
            return f ? jsonOk({ status: true, data: f }) : jsonStatus(404, { status: false, error: 'not found' });
        },
    },
    {
        // File list — `/api/fileman/file` and `/api/fileman/manager`.
        match: /\/api\/fileman\/(?:file|manager)s?(?:\/?)$/,
        handler: (url, init) => paginatedList(SEED_FILES, parseParams(url, init)),
    },
    {
        // Group membership — fired when an example calls app.setActiveGroup(...)
        // and app.activeUser is set. Returns a member with wildcard permissions
        // so demos that gate on permissions don't get blocked.
        match: /\/api\/group\/(\d+)\/member(?:\/?)$/,
        handler: (url) => {
            const groupId = Number(url.match(/\/group\/(\d+)\/member/)[1]);
            return jsonOk({ status: true, data: {
                id: groupId * 1000,
                group_id: groupId,
                user_id: SEED_USERS[0].id,
                permissions: { '*': true },
            }});
        },
    },
    {
        // Group list — used by GroupSearchView when opening the group selector.
        match: /\/api\/group(?:\/?)$/,
        handler: (url, init) => paginatedList(SEED_GROUPS, parseParams(url, init)),
    },
    {
        // Single group fetch — used by clearActiveGroup recovery + URL hydration.
        match: /\/api\/group\/(\d+)(?:\/?)$/,
        handler: (url) => {
            const id = Number(url.match(/\/group\/(\d+)/)[1]);
            const g = SEED_GROUPS.find(x => x.id === id);
            return g ? jsonOk({ status: true, data: g }) : jsonStatus(404, { status: false, error: 'not found' });
        },
    },
    {
        // Catch-all login endpoint for the auth example demo.
        method: 'POST',
        match: /\/login\b/,
        handler: () => jsonOk({ status: true, data: { token: 'mock-token', user: SEED_USERS[0] } }),
    },
];

// ── Helpers ─────────────────────────────────────────────────────────────
function jsonOk(body) {
    return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
}

function jsonStatus(status, body) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

function parseParams(url, init) {
    const u = new URL(url, window.location.origin);
    const out = {};
    for (const [k, v] of u.searchParams) out[k] = v;
    if (init?.body) {
        try {
            const body = typeof init.body === 'string' ? JSON.parse(init.body) : init.body;
            if (body && typeof body === 'object') Object.assign(out, body);
        } catch { /* ignore */ }
    }
    return out;
}

function paginatedList(allRows, params) {
    const start = Number(params.start) || 0;
    const size = Number(params.size) || 10;
    const search = (params.search || '').toLowerCase();
    let rows = allRows;
    if (search) {
        rows = rows.filter(r =>
            JSON.stringify(r).toLowerCase().includes(search)
        );
    }
    if (params.sort) {
        const [field, dir] = params.sort.startsWith('-')
            ? [params.sort.slice(1), -1]
            : [params.sort, 1];
        rows = rows.slice().sort((a, b) => (a[field] > b[field] ? dir : a[field] < b[field] ? -dir : 0));
    }
    const slice = rows.slice(start, start + size);
    return jsonOk({
        status: true,
        data: slice,
        count: rows.length,
        start,
        size,
    });
}

function findRoute(method, urlString) {
    const path = (() => {
        try { return new URL(urlString, window.location.origin).pathname; }
        catch { return urlString; }
    })();
    for (const route of ROUTES) {
        if (route.method && route.method !== method) continue;
        if (route.match.test(path)) return route;
    }
    return null;
}

// ── Install ─────────────────────────────────────────────────────────────
let originalFetch = null;

export function installMockBackend({ verbose = false } = {}) {
    if (originalFetch) return; // idempotent
    originalFetch = window.fetch.bind(window);

    window.fetch = async function mockFetch(input, init = {}) {
        const url = typeof input === 'string' ? input : input.url;
        const method = (init.method || (typeof input === 'object' && input.method) || 'GET').toUpperCase();
        const route = findRoute(method, url);

        if (!route) {
            return originalFetch(input, init);
        }

        if (verbose) console.log('[mockBackend]', method, url);

        try {
            const result = await route.handler(url, init);
            return result instanceof Response ? result : jsonOk(result);
        } catch (err) {
            console.error('[mockBackend] handler error for', method, url, err);
            return jsonStatus(500, { status: false, error: err.message });
        }
    };
}

export function uninstallMockBackend() {
    if (originalFetch) {
        window.fetch = originalFetch;
        originalFetch = null;
    }
}

export const SEED = { files: SEED_FILES, users: SEED_USERS };
