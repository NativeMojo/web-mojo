/**
 * Structured browser contracts for django-mojo's Edge vhost plane.
 *
 * Browser code may manage VHosts as structured records and may read declared
 * Upstreams. It must never receive nginx text, arbitrary proxy destinations,
 * node inventory, desired state, or certificate material.
 */

import Collection from '@core/Collection.js';
import Model from '@core/Model.js';
import rest from '@core/Rest.js';

const BASE = '/api/edge';
const UPSTREAM_KINDS = new Set(['http', 'unix']);
const RELEASE_STATUSES = new Set(['pending', 'uploaded', 'live', 'superseded']);

export const VhostKindOptions = [
    { value: 'api', label: 'API host' },
    { value: 'site', label: 'Static site / SPA' },
    { value: 'site_api', label: 'Site + API paths' },
    { value: 'redirect', label: 'Host redirect' }
];

/**
 * Which knobs each template kind carries — the client mirror of the server's
 * kind matrix (django-mojo mojo/apps/edge/validators.py::validate_vhost).
 * `upstream`/`redirect_to` true means REQUIRED for that kind; the boolean
 * knobs true mean allowed. Off-matrix knobs are always sent as neutral values
 * so a stale value clears on update.
 */
export const VHOST_KIND_MATRIX = Object.freeze({
    api: Object.freeze({ upstream: true, redirect_to: false, spa: false, serve_static: true, quiet_paths: true, body_size: true, routes: false }),
    site: Object.freeze({ upstream: false, redirect_to: false, spa: true, serve_static: false, quiet_paths: false, body_size: false, routes: false }),
    site_api: Object.freeze({ upstream: false, redirect_to: false, spa: true, serve_static: true, quiet_paths: true, body_size: true, routes: true }),
    redirect: Object.freeze({ upstream: false, redirect_to: true, spa: false, serve_static: false, quiet_paths: false, body_size: false, routes: false })
});

export const BODY_SIZE_BOUNDS = Object.freeze({ min: 1, max: 4096, default: 50 });

export const BlocklistKindOptions = [
    { value: 'ip', label: 'IP / CIDR' },
    { value: 'ua', label: 'User agent' }
];

// `log` first: the blocklist's whole posture is observe-then-enforce.
export const BlocklistModeOptions = [
    { value: 'log', label: 'Log — watch only' },
    { value: 'enforce', label: 'Enforce — block with 444' },
    { value: 'allow', label: 'Allow — exempt from both' },
    { value: 'off', label: 'Off — parked' }
];
const BLOCKLIST_KINDS = new Set(BlocklistKindOptions.map(option => option.value));
const BLOCKLIST_MODES = new Set(BlocklistModeOptions.map(option => option.value));

export const UpstreamKindOptions = [
    { value: 'http', label: 'HTTP host and port' },
    { value: 'unix', label: 'Unix domain socket' }
];

// `$` accepts a position before a final newline in JavaScript. The explicit
// CR/LF rejection below is therefore part of the validation contract.
export const VHOST_POOL_PATTERN = /^[a-z0-9_-]{1,32}$/;

// Mirrors the server's QUIET_PATH_RE / ROUTE_PREFIX_RE and LABEL_RE
// (mojo/apps/edge/validators.py). The server stays authoritative; these catch
// the obvious mistakes before a request is made.
export const QUIET_PATH_PATTERN = /^\/[A-Za-z0-9._/-]{0,127}$/;
const HOST_LABEL_PATTERN = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;
const UA_PATTERN_ALLOWED = /^[A-Za-z0-9()[\]|?^.*+\-/_\\]{1,256}$/;

const idOf = (value) => value && typeof value === 'object' ? value.id : value;
const hasErrors = (model) => !!(model?.errors
    && typeof model.errors === 'object'
    && Object.keys(model.errors).length);
const hasControlCharacter = (value) => {
    for (let index = 0; index < value.length; index++) {
        const code = value.charCodeAt(index);
        if (code <= 0x1f || code === 0x7f) return true;
    }
    return false;
};

export const WEBAPP_CREATE_FIELDS = Object.freeze(['group', 'slug', 'bucket', 'vhost', 'auto_promote']);
export const WEBAPP_UPDATE_FIELDS = Object.freeze(['slug', 'vhost', 'auto_promote']);
export const WEBAPP_BUCKET_MAX_LENGTH = 255;
export const DEPLOY_SHA_PATTERN = /^[0-9a-f]{7,40}$/;

/** Named AND gate for destructive WebApp actions; permission arrays are OR gates. */
export function canManageWebApp(appOrUser) {
    const user = appOrUser?.activeUser || appOrUser;
    if (!user || typeof user.hasPermission !== 'function') return false;
    return user.hasPermission('manage_webapp')
        && (user.hasPermission('manage_dns') || user.hasPermission('security'));
}

export function normalizeDeploySha(value) {
    const sha = typeof value === 'string' ? value.trim().toLowerCase() : '';
    if (!DEPLOY_SHA_PATTERN.test(sha)) {
        throw new Error('Enter a commit SHA containing 7–40 hexadecimal characters.');
    }
    return sha;
}

/** Positive projection for release rows; manifest/material never cross this boundary. */
export function projectWebAppRelease(input = {}) {
    const status = RELEASE_STATUSES.has(input.status) ? input.status : 'pending';
    return {
        id: input.id,
        version: input.version || '',
        status,
        created: input.created || null,
        modified: input.modified || null,
        file_count: Number.isInteger(input.file_count) ? input.file_count : null,
        created_by: input.created_by || null
    };
}

/** Positive projection for operator-visible site metadata. */
export function projectWebApp(input = {}) {
    return {
        id: input.id,
        created: input.created || null,
        modified: input.modified || null,
        group: input.group || null,
        slug: input.slug || '',
        bucket: input.bucket || '',
        prefix: input.prefix || '',
        vhost: input.vhost || null,
        auto_promote: input.auto_promote === true,
        current_release: input.current_release
            ? projectWebAppRelease(input.current_release) : null
    };
}

export function buildWebAppPayload(input = {}, options = {}) {
    const create = options.create === true;
    const slug = typeof input.slug === 'string' ? input.slug.trim() : '';
    if (!slug) throw new Error('Enter a site slug.');

    const payload = {
        slug,
        vhost: idOf(input.vhost) || null,
        auto_promote: input.auto_promote === true
    };
    if (!create) return payload;

    const group = idOf(input.group);
    if (!group) throw new Error('Select an active group before creating a WebApp.');
    const bucket = typeof input.bucket === 'string' ? input.bucket.trim() : '';
    if (!bucket) throw new Error('Enter a release bucket.');
    if (bucket.length > WEBAPP_BUCKET_MAX_LENGTH) {
        throw new Error(`Release bucket must be ${WEBAPP_BUCKET_MAX_LENGTH} characters or fewer.`);
    }
    if (hasControlCharacter(bucket)) {
        throw new Error('Release bucket cannot contain control characters.');
    }
    return { group, slug, bucket, vhost: payload.vhost, auto_promote: payload.auto_promote };
}

export function releaseActionFor(status) {
    if (status === 'uploaded') return 'promote';
    if (status === 'superseded') return 'rollback';
    return null;
}

/** Classify the deliberately flat /api/edge/deploy contract without envelope assumptions. */
export function classifyDeployResponse(response) {
    const body = response?.data || {};
    if (response?.status === 202 && response.success !== false
        && body.status === true && typeof body.queued === 'boolean') {
        return { accepted: true, queued: body.queued, sha: body.sha || null, error: null };
    }
    const unavailable = response?.status === 503 && body.error === 'deploy coordination unavailable';
    return {
        accepted: false,
        queued: null,
        sha: null,
        error: unavailable ? 'deploy coordination unavailable'
            : (body.error || response?.error || response?.message || 'Fleet deploy was not accepted.')
    };
}

export async function requestFleetDeploy(value) {
    const sha = normalizeDeploySha(value);
    const response = await rest.POST(`${BASE}/deploy`, { sha });
    return { ...classifyDeployResponse(response), response };
}

export function isLiteralSuperuser(appOrUser) {
    const user = appOrUser?.activeUser || appOrUser;
    return user?.get?.('is_superuser') === true;
}

export function isValidVhostPool(value) {
    return typeof value === 'string'
        && !/[\r\n]/.test(value)
        && VHOST_POOL_PATTERN.test(value);
}

/**
 * One quiet path / route prefix, validated like the server validates it:
 * leading '/', safe charset, no '//', no '..' segment.
 */
function validateRequestPath(path, what) {
    if (typeof path !== 'string' || !QUIET_PATH_PATTERN.test(path)) {
        throw new Error(`${what} must start with '/' and use only letters, digits, `
            + `'.', '_', '-' and '/' (max 128 characters).`);
    }
    if (path.includes('//')) throw new Error(`${what} may not contain '//'.`);
    if (path.split('/').includes('..')) throw new Error(`${what} may not contain a '..' segment.`);
    return path;
}

/** Textarea text (one per line) or an array → a validated, de-duplicated list. */
export function parseQuietPaths(value) {
    const lines = Array.isArray(value) ? value : String(value ?? '').split('\n');
    const paths = lines.map(line => (typeof line === 'string' ? line.trim() : '')).filter(Boolean);
    paths.forEach(path => validateRequestPath(path, 'A quiet path'));
    if (new Set(paths).size !== paths.length) throw new Error('Quiet paths contain a duplicate.');
    return paths;
}

export function formatQuietPaths(list) {
    return (Array.isArray(list) ? list : []).join('\n');
}

/** A redirect destination is a bare host — never a URL. */
export function validateRedirectTarget(value) {
    const target = typeof value === 'string' ? value.trim().toLowerCase() : '';
    if (!target) throw new Error('A redirect VHost requires a target host.');
    if (/[:/\s]/.test(target)) {
        throw new Error('Target must be a bare host — drop the scheme, path, or port.');
    }
    if (target.startsWith('*')) throw new Error('A redirect target cannot be a wildcard.');
    if (target.length > 253) throw new Error('Target host is too long (max 253 characters).');
    const labels = target.split('.');
    if (!labels.every(label => HOST_LABEL_PATTERN.test(label))) {
        throw new Error('Enter a valid hostname, like example.com.');
    }
    return target;
}

/** Return a new allowlisted VHost body; never pass form/model objects through. */
export function buildVhostPayload(input = {}, { create = false } = {}) {
    const kind = input.kind || 'site';
    const rules = VHOST_KIND_MATRIX[kind];
    if (!rules) throw new Error('Choose a valid VHost kind.');

    const pool = input.pool === undefined || input.pool === null || input.pool === ''
        ? 'default' : input.pool;
    if (!isValidVhostPool(pool)) {
        throw new Error('Pool must be 1–32 lowercase letters, digits, underscores, or hyphens.');
    }
    const certificate = idOf(input.certificate);
    if (!certificate) throw new Error('Choose a certificate.');
    const upstream = idOf(input.upstream);
    if (rules.upstream && !upstream) throw new Error('An API host requires a declared upstream.');

    const rawBody = input.body_size_mb;
    const body = rawBody === undefined || rawBody === null || rawBody === ''
        ? BODY_SIZE_BOUNDS.default : Number(rawBody);
    if (!Number.isInteger(body) || body < BODY_SIZE_BOUNDS.min || body > BODY_SIZE_BOUNDS.max) {
        throw new Error(`Upload cap must be a whole number from ${BODY_SIZE_BOUNDS.min} `
            + `to ${BODY_SIZE_BOUNDS.max} MB.`);
    }

    // Off-matrix knobs are sent as neutral values on purpose: an update after
    // any state drift clears them instead of tripping the server's kind matrix.
    const payload = {
        label: input.label || '',
        kind,
        upstream: rules.upstream ? upstream : null,
        certificate,
        pool,
        spa: rules.spa ? input.spa === true : false,
        serve_static: rules.serve_static ? input.serve_static === true : false,
        quiet_paths: rules.quiet_paths ? parseQuietPaths(input.quiet_paths ?? []) : [],
        body_size_mb: body,
        redirect_to: rules.redirect_to ? validateRedirectTarget(input.redirect_to) : null,
        is_enabled: input.is_enabled === undefined ? true : input.is_enabled === true
    };

    if (create) {
        const domain = idOf(input.domain);
        if (!domain) throw new Error('Choose a domain.');
        payload.domain = domain;
    }
    return payload;
}

/** One site_api proxied prefix. The server refuses '/' — that is what api is for. */
export function buildRoutePayload(input = {}) {
    const vhost = idOf(input.vhost);
    if (!vhost) throw new Error('A route requires a VHost.');
    const prefix = typeof input.path_prefix === 'string' ? input.path_prefix.trim() : '';
    validateRequestPath(prefix, 'A route prefix');
    if (prefix === '/') {
        throw new Error("A route prefix cannot be '/' — use the API host shape for a whole-host proxy.");
    }
    const upstream = idOf(input.upstream);
    if (!upstream) throw new Error('Choose an upstream for this route.');
    return { vhost, path_prefix: prefix, upstream };
}

/** Allowlisted blocklist body. ip values are normalized server-side. */
export function buildBlocklistPayload(input = {}) {
    const kind = input.kind || 'ip';
    if (!BLOCKLIST_KINDS.has(kind)) throw new Error('Choose a valid rule kind.');
    const mode = input.mode || 'log';
    if (!BLOCKLIST_MODES.has(mode)) throw new Error('Choose a valid rule mode.');
    const value = typeof input.value === 'string' ? input.value.trim() : '';
    if (!value) throw new Error('Enter a value for the rule.');
    if (kind === 'ua') {
        if (!UA_PATTERN_ALLOWED.test(value)) {
            throw new Error('A user-agent pattern may use letters, digits and the regex '
                + 'characters ()[]|?^.*+-/_\\ only (max 256 characters — no spaces, '
                + 'quotes, or braces).');
        }
        const trailing = value.length - value.replace(/\\+$/, '').length;
        if (trailing % 2 === 1) {
            throw new Error('A user-agent pattern cannot end with an unescaped backslash.');
        }
    }
    const note = typeof input.note === 'string' ? input.note.trim().slice(0, 255) : '';
    return { kind, value, mode, note };
}

/** Discriminated declare body. Hidden values from the inactive branch vanish. */
export function buildUpstreamDeclarePayload(input = {}) {
    const kind = input.kind;
    const name = typeof input.name === 'string' ? input.name.trim() : '';
    if (!name) throw new Error('Enter an upstream name.');
    if (!UPSTREAM_KINDS.has(kind)) throw new Error('Choose a valid upstream kind.');

    const payload = { name, kind };
    const group = idOf(input.group);
    if (group) payload.group = group;

    if (kind === 'http') {
        const host = typeof input.host === 'string' ? input.host.trim() : '';
        const port = Number(input.port);
        if (!host) throw new Error('Enter an upstream host.');
        if (!Number.isInteger(port) || port < 1 || port > 65535) {
            throw new Error('Port must be an integer from 1 to 65535.');
        }
        payload.host = host;
        payload.port = port;
    } else {
        const socketPath = typeof input.socket_path === 'string' ? input.socket_path.trim() : '';
        if (!socketPath) throw new Error('Enter a Unix socket path.');
        payload.socket_path = socketPath;
    }
    return payload;
}

/**
 * Model promises resolve for Mojo-envelope failures. Treat transport success,
 * envelope status, and model errors as three independent verdicts.
 */
export function classifyActionResponse(response, model = null) {
    const envelope = response?.data;
    const ok = !!response
        && response.success !== false
        && (!envelope || envelope.status !== false)
        && !hasErrors(model);
    const error = response?.error
        || response?.errors?.error
        || envelope?.error
        || model?.errors?.error
        || model?.errors?.message
        || null;
    return { ok, error };
}

/** Shared structured-delete path: never throw, classify, stash errors on the model. */
async function requestModelDelete(model, what) {
    if (!model.id) return { success: false, error: `${what} id is required`, status: 400 };
    model.errors = {};
    let response;
    try {
        response = await model.rest.DELETE(model.buildUrl(model.id));
    } catch (error) {
        response = { success: false, error: error.message, status: error.status || 500 };
    }
    const verdict = classifyActionResponse(response);
    if (!verdict.ok) model.errors = response?.data || response?.errors || { error: verdict.error };
    return response;
}

class Vhost extends Model {
    constructor(data = {}, options = {}) {
        super(data, { endpoint: `${BASE}/vhost`, ...options });
    }

    remove() {
        return requestModelDelete(this, 'VHost');
    }

    /**
     * The reserved-name house override — the only writer of `claims_reserved`.
     * Platform superusers only, house-domain vhosts only; the server enforces
     * both and refuses API-key sessions outright.
     */
    claimReserved(release = false) {
        if (!this.id) {
            return Promise.resolve({ success: false, error: 'VHost id is required', status: 400 });
        }
        return rest.POST(`${BASE}/vhost/claim_reserved`, {
            vhost: this.id, ...(release ? { release: true } : {})
        });
    }
}

class VhostList extends Collection {
    constructor(options = {}) {
        super({ ModelClass: Vhost, endpoint: `${BASE}/vhost`, ...options });
    }
}

class VhostRoute extends Model {
    constructor(data = {}, options = {}) {
        super(data, { endpoint: `${BASE}/route`, ...options });
    }

    remove() {
        return requestModelDelete(this, 'Route');
    }
}

class VhostRouteList extends Collection {
    constructor(options = {}) {
        super({ ModelClass: VhostRoute, endpoint: `${BASE}/route`, ...options });
    }
}

class BlocklistEntry extends Model {
    constructor(data = {}, options = {}) {
        super(data, { endpoint: `${BASE}/blocklist`, ...options });
    }

    remove() {
        return requestModelDelete(this, 'Blocklist entry');
    }
}

class BlocklistEntryList extends Collection {
    constructor(options = {}) {
        super({ ModelClass: BlocklistEntry, endpoint: `${BASE}/blocklist`, ...options });
    }
}

class Upstream extends Model {
    constructor(data = {}, options = {}) {
        super(data, { endpoint: `${BASE}/upstream`, ...options });
    }

    static declare(input = {}) {
        return rest.POST(`${BASE}/upstream/declare`, buildUpstreamDeclarePayload(input));
    }

    retire() {
        return rest.POST(`${BASE}/upstream/retire`, { upstream: this.id });
    }
}

class UpstreamList extends Collection {
    constructor(options = {}) {
        super({ ModelClass: Upstream, endpoint: `${BASE}/upstream`, ...options });
    }
}

class WebApp extends Model {
    constructor(data = {}, options = {}) {
        super(projectWebApp(data), { endpoint: `${BASE}/webapp`, ...options });
        this._linkKeyFlight = null;
        this._promoteFlight = null;
    }

    set(key, value, options = {}) {
        if (key && typeof key === 'object') {
            return super.set(projectWebApp(key), value, options);
        }
        if (WEBAPP_CREATE_FIELDS.includes(key) || ['id', 'created', 'modified', 'prefix', 'current_release'].includes(key)) {
            return super.set(key, value, options);
        }
    }

    saveSafe(input = {}) {
        return this.save(buildWebAppPayload(input, {
            create: !this.id
        }));
    }

    async reconcile(releases = null) {
        const tasks = [this.fetch({ graph: 'default' })];
        if (releases?.fetch) tasks.push(releases.fetch());
        await Promise.allSettled(tasks);
    }

    linkKey(releases = null) {
        if (!this.id) return Promise.resolve({ success: false, error: 'WebApp id is required', status: 400 });
        if (this._linkKeyFlight) return this._linkKeyFlight;
        this._linkKeyFlight = (async () => {
            try {
                return await rest.POST(`${BASE}/webapp/link_key`, { webapp: this.id });
            } finally {
                await this.reconcile(releases);
                this._linkKeyFlight = null;
            }
        })();
        return this._linkKeyFlight;
    }

    promote(release, releases = null) {
        if (!this.id || !idOf(release)) {
            return Promise.resolve({ success: false, error: 'WebApp and release ids are required', status: 400 });
        }
        if (this._promoteFlight) return this._promoteFlight;
        this._promoteFlight = (async () => {
            try {
                return await rest.POST(`${BASE}/webapp/promote`, {
                    webapp: this.id,
                    release: idOf(release)
                });
            } finally {
                await this.reconcile(releases);
                this._promoteFlight = null;
            }
        })();
        return this._promoteFlight;
    }
}

class WebAppList extends Collection {
    constructor(options = {}) {
        super({
            ModelClass: WebApp,
            endpoint: `${BASE}/webapp`,
            ...options,
            params: { graph: 'default', ...options.params }
        });
    }
}

class WebAppRelease extends Model {
    constructor(data = {}, options = {}) {
        super(projectWebAppRelease(data), { endpoint: `${BASE}/release`, ...options });
    }

    set(key, value, options = {}) {
        if (key && typeof key === 'object') {
            return super.set(projectWebAppRelease(key), value, options);
        }
        if (['id', 'version', 'status', 'created', 'modified', 'file_count', 'created_by'].includes(key)) {
            return super.set(key, value, options);
        }
    }

    save() {
        throw new Error('WebApp releases are immutable.');
    }

    destroy() {
        throw new Error('WebApp releases are immutable.');
    }
}

class WebAppReleaseList extends Collection {
    constructor(options = {}) {
        const webapp = idOf(options.webapp || options.params?.webapp);
        super({
            ModelClass: WebAppRelease,
            endpoint: `${BASE}/release`,
            ...options,
            params: {
                graph: 'default',
                ...(webapp ? { webapp } : { id: '__no_webapp__' }),
                ...options.params
            }
        });
    }
}

export {
    Vhost, VhostList, VhostRoute, VhostRouteList, BlocklistEntry, BlocklistEntryList,
    Upstream, UpstreamList, WebApp, WebAppList, WebAppRelease, WebAppReleaseList
};

export default {
    Vhost, VhostList, VhostRoute, VhostRouteList, BlocklistEntry, BlocklistEntryList,
    Upstream, UpstreamList, WebApp, WebAppList, WebAppRelease, WebAppReleaseList,
    VhostKindOptions, VHOST_KIND_MATRIX, BODY_SIZE_BOUNDS,
    BlocklistKindOptions, BlocklistModeOptions,
    UpstreamKindOptions, VHOST_POOL_PATTERN, QUIET_PATH_PATTERN, WEBAPP_BUCKET_MAX_LENGTH,
    isLiteralSuperuser, isValidVhostPool,
    parseQuietPaths, formatQuietPaths, validateRedirectTarget,
    buildVhostPayload, buildRoutePayload, buildBlocklistPayload,
    buildUpstreamDeclarePayload, buildWebAppPayload,
    projectWebApp, projectWebAppRelease, releaseActionFor, canManageWebApp,
    normalizeDeploySha, classifyDeployResponse, requestFleetDeploy, classifyActionResponse
};
