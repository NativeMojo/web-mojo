/**
 * Kind-aware edit form for one EXISTING VHost. Creation is VhostCreateWizard —
 * the shape is picked there and never changes here: the form offers exactly
 * the knobs the vhost's kind carries (VHOST_KIND_MATRIX), with no kind
 * dropdown anywhere. Changing shape = delete and recreate.
 */

import Modal from '@core/views/feedback/Modal.js';
import { Domain, DomainList, CertificateList } from '@ext/admin/models/Dns.js';
import {
    UpstreamList, VHOST_KIND_MATRIX, BODY_SIZE_BOUNDS,
    buildVhostPayload, formatQuietPaths, classifyActionResponse, isLiteralSuperuser
} from '@ext/admin/models/Edge.js';

const activeGroupId = (app) => app?.getActiveGroupId?.() || app?.activeGroup?.id || null;
const option = (model, label) => ({ value: model.id, label: label(model) });

class VhostForm {
    static async resolveDomain(domainId, app) {
        if (!domainId) return null;
        const domain = new Domain({ id: domainId });
        const response = await domain.fetch();
        if (!classifyActionResponse(response, domain).ok || !domain.get('name')) return null;
        if (domain.get('group') === null && !isLiteralSuperuser(app)) return null;
        return domain;
    }

    /** Active domains selectable in this scope — the wizard's domain source. */
    static async listDomainChoices(app) {
        const superuser = isLiteralSuperuser(app);
        const group = activeGroupId(app);
        if (!superuser && !group) {
            return { ok: false, error: 'Select an active group before creating a VHost.', domains: [] };
        }
        const domains = new DomainList({
            size: 200,
            params: { status: 'active', ...(superuser ? {} : { group }) }
        });
        const response = await domains.fetch();
        if (!classifyActionResponse(response, domains).ok) {
            return { ok: false, error: 'Could not load domains for this VHost.', domains: [] };
        }
        return {
            ok: true,
            error: null,
            domains: domains.models.map(model => ({ id: model.id, name: model.get('name') }))
        };
    }

    static async open(options = {}) {
        const { app, existing = null, collection = null } = options;
        if (!app || !existing) return null;

        const embeddedDomain = existing.get?.('domain');
        const domain = await this.resolveDomain(embeddedDomain?.id || embeddedDomain, app);
        if (!domain) {
            Modal.showError('VHost details are unavailable.');
            return null;
        }

        const kind = existing.get('kind');
        const rules = VHOST_KIND_MATRIX[kind];
        if (!rules) {
            Modal.showError(`This VHost has an unknown kind (${kind}). Update the admin to edit it.`);
            return null;
        }

        const group = domain.get('group');
        const groupId = group?.id || group || null;
        const certificates = new CertificateList({
            size: 200,
            params: { domain: domain.id }
        });
        const fetches = [certificates.fetch()];
        const upstreams = rules.upstream ? new UpstreamList({
            size: 200,
            params: {
                is_enabled: true,
                ...(groupId ? { group: groupId } : { group__isnull: true })
            }
        }) : null;
        if (upstreams) fetches.push(upstreams.fetch());
        const [certificateResponse, upstreamResponse] = await Promise.all(fetches);
        if (!classifyActionResponse(certificateResponse, certificates).ok
            || (upstreams && !classifyActionResponse(upstreamResponse, upstreams).ok)) {
            Modal.showError('Could not load the safe certificate and upstream choices.');
            return null;
        }

        const certificateOptions = certificates.models.map(model => option(model, item => {
            const name = item.get('common_name') || item.get('sans')?.[0] || `Certificate ${item.id}`;
            return `${name} (${item.get('status') || 'unknown'})`;
        }));
        if (!certificateOptions.length) {
            Modal.showError(`Issue a certificate for ${domain.get('name')} before editing this VHost.`);
            return null;
        }

        const fields = [
            {
                name: 'label', type: 'text', label: 'Host label', columns: 12,
                value: existing.get('label') || '', placeholder: 'www (blank for apex)',
                help: `Serves under ${domain.get('name')}. Use one lowercase DNS label or *.`
            },
            {
                name: 'certificate', type: 'select', label: 'Certificate', required: true,
                columns: 12, options: certificateOptions,
                value: existing.get('certificate')?.id || existing.get('certificate') || ''
            }
        ];
        if (rules.upstream) {
            const upstreamOptions = upstreams.models.map(model => option(model, item => item.get('name')));
            fields.push({
                name: 'upstream', type: 'select', label: 'Declared upstream', required: true,
                columns: 12, options: upstreamOptions,
                value: existing.get('upstream')?.id || existing.get('upstream') || '',
                help: upstreamOptions.length
                    ? 'Only active destinations declared for this scope are selectable.'
                    : 'No active upstream is declared for this scope.'
            });
        }
        if (rules.redirect_to) {
            fields.push({
                name: 'redirect_to', type: 'text', label: 'Redirect target', required: true,
                columns: 12, value: existing.get('redirect_to') || '', placeholder: 'example.com',
                help: 'A bare hostname — no scheme, path, or port. A 301 preserving the request path is rendered.'
            });
        }
        if (rules.spa) {
            fields.push({
                name: 'spa', type: 'switch', label: 'SPA history fallback', columns: 6,
                value: existing.get('spa') === true,
                help: 'Unknown paths serve index.html instead of a 404.'
            });
        }
        if (rules.serve_static) {
            fields.push({
                name: 'serve_static', type: 'switch', label: 'Serve platform static', columns: 6,
                value: existing.get('serve_static') === true,
                help: 'Serve Django static at /static/ instead of proxying it.'
            });
        }
        if (rules.body_size) {
            fields.push({
                name: 'body_size_mb', type: 'number', label: 'Max upload size (MB)', columns: 6,
                value: existing.get('body_size_mb') ?? BODY_SIZE_BOUNDS.default,
                attributes: { min: BODY_SIZE_BOUNDS.min, max: BODY_SIZE_BOUNDS.max },
                help: `${BODY_SIZE_BOUNDS.min}–${BODY_SIZE_BOUNDS.max}.`
            });
        }
        if (rules.quiet_paths) {
            fields.push({
                name: 'quiet_paths', type: 'textarea', label: 'Quiet paths', columns: 12,
                value: formatQuietPaths(existing.get('quiet_paths')), rows: 3,
                placeholder: '/healthz',
                help: kind === 'site_api'
                    ? 'One per line; kept out of the main access log. Each must sit under a declared route prefix.'
                    : 'One per line; exact request paths kept out of the main access log (health checks).'
            });
        }
        fields.push(
            {
                name: 'pool', type: 'text', label: 'Fleet pool', required: true, columns: 6,
                value: existing.get('pool') || 'default',
                attributes: { maxlength: 32, pattern: '[a-z0-9_-]{1,32}' },
                help: '1–32 lowercase letters, digits, underscores, or hyphens. The server must declare it.'
            },
            {
                name: 'is_enabled', type: 'switch', label: 'Enabled', columns: 6,
                value: existing.get('is_enabled') === true
            }
        );

        const result = await app.showForm({
            title: `Edit ${kind} VHost · ${existing.get('server_name')}`,
            size: 'md', fields
        });
        if (!result) return null;

        let payload;
        try {
            payload = buildVhostPayload({ ...result, kind, domain: domain.id }, { create: false });
        } catch (error) {
            Modal.showError(error.message);
            return { ok: false, error: error.message };
        }

        app.showLoading?.();
        let response;
        try {
            response = await existing.save(payload);
            const verdict = classifyActionResponse(response, existing);
            if (!verdict.ok) {
                Modal.showError(verdict.error || 'The VHost was not saved.');
                return { ...verdict, response, model: existing };
            }

            const refresh = await (collection?.fetch?.() || existing.fetch());
            if (!classifyActionResponse(refresh, collection || existing).ok) {
                Modal.showError('The VHost was saved, but the authoritative list could not be refreshed.');
                return { ok: false, refreshRequired: true, response, model: existing };
            }
            app.toast?.success('VHost updated');
            return { ok: true, response, model: existing };
        } finally {
            app.hideLoading?.();
        }
    }
}

export default VhostForm;
