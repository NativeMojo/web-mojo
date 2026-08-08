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
const VHOST_KINDS = new Set(['static', 'spa', 'proxy']);
const UPSTREAM_KINDS = new Set(['http', 'unix']);
const RELEASE_STATUSES = new Set(['pending', 'uploaded', 'live', 'superseded']);

export const VhostKindOptions = [
    { value: 'static', label: 'Static files' },
    { value: 'spa', label: 'Single-page app' },
    { value: 'proxy', label: 'Reverse proxy' }
];

export const UpstreamKindOptions = [
    { value: 'http', label: 'HTTP host and port' },
    { value: 'unix', label: 'Unix domain socket' }
];

// `$` accepts a position before a final newline in JavaScript. The explicit
// CR/LF rejection below is therefore part of the validation contract.
export const VHOST_POOL_PATTERN = /^[a-z0-9_-]{1,32}$/;

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

/** Return a new allowlisted VHost body; never pass form/model objects through. */
export function buildVhostPayload(input = {}, { create = false } = {}) {
    const kind = input.kind || 'static';
    const pool = input.pool === undefined || input.pool === null || input.pool === ''
        ? 'default' : input.pool;
    const upstream = idOf(input.upstream);
    const certificate = idOf(input.certificate);

    if (!VHOST_KINDS.has(kind)) throw new Error('Choose a valid VHost kind.');
    if (!isValidVhostPool(pool)) {
        throw new Error('Pool must be 1–32 lowercase letters, digits, underscores, or hyphens.');
    }
    if (kind === 'proxy' && !upstream) throw new Error('A proxy VHost requires a declared upstream.');
    if (!certificate) throw new Error('Choose a certificate.');

    const payload = {
        label: input.label || '',
        kind,
        upstream: kind === 'proxy' ? upstream : null,
        certificate,
        pool,
        is_enabled: input.is_enabled === undefined ? true : input.is_enabled === true
    };

    if (create) {
        const domain = idOf(input.domain);
        if (!domain) throw new Error('Choose a domain.');
        payload.domain = domain;
    }
    return payload;
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

class Vhost extends Model {
    constructor(data = {}, options = {}) {
        super(data, { endpoint: `${BASE}/vhost`, ...options });
    }

    async remove() {
        if (!this.id) return { success: false, error: 'VHost id is required', status: 400 };
        this.errors = {};
        let response;
        try {
            response = await this.rest.DELETE(this.buildUrl(this.id));
        } catch (error) {
            response = { success: false, error: error.message, status: error.status || 500 };
        }
        const verdict = classifyActionResponse(response);
        if (!verdict.ok) this.errors = response?.data || response?.errors || { error: verdict.error };
        return response;
    }
}

class VhostList extends Collection {
    constructor(options = {}) {
        super({ ModelClass: Vhost, endpoint: `${BASE}/vhost`, ...options });
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

export { Vhost, VhostList, Upstream, UpstreamList, WebApp, WebAppList, WebAppRelease, WebAppReleaseList };

export default {
    Vhost, VhostList, Upstream, UpstreamList, WebApp, WebAppList, WebAppRelease, WebAppReleaseList,
    VhostKindOptions, UpstreamKindOptions, VHOST_POOL_PATTERN, WEBAPP_BUCKET_MAX_LENGTH,
    isLiteralSuperuser, isValidVhostPool,
    buildVhostPayload, buildUpstreamDeclarePayload, buildWebAppPayload,
    projectWebApp, projectWebAppRelease, releaseActionFor, canManageWebApp,
    normalizeDeploySha, classifyDeployResponse, requestFleetDeploy, classifyActionResponse
};
