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

export { Vhost, VhostList, Upstream, UpstreamList };

export default {
    Vhost, VhostList, Upstream, UpstreamList,
    VhostKindOptions, UpstreamKindOptions, VHOST_POOL_PATTERN,
    isLiteralSuperuser, isValidVhostPool,
    buildVhostPayload, buildUpstreamDeclarePayload, classifyActionResponse
};
