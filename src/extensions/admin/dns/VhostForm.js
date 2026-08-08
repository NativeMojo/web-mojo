import Modal from '@core/views/feedback/Modal.js';
import { Domain, DomainList, CertificateList } from '@ext/admin/models/Dns.js';
import {
    Vhost, UpstreamList, VhostKindOptions,
    buildVhostPayload, classifyActionResponse, isLiteralSuperuser
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

    static async chooseDomain(app) {
        const superuser = isLiteralSuperuser(app);
        const group = activeGroupId(app);
        if (!superuser && !group) {
            Modal.showError('Select an active group before creating a VHost.');
            return null;
        }

        const domains = new DomainList({
            size: 200,
            params: { status: 'active', ...(superuser ? {} : { group }) }
        });
        const response = await domains.fetch();
        if (!classifyActionResponse(response, domains).ok) {
            Modal.showError('Could not load domains for this VHost.');
            return null;
        }
        const choices = domains.models.map(model => option(model, item => item.get('name')));
        if (!choices.length) {
            Modal.showError('No active domains are available in this scope.');
            return null;
        }
        const result = await app.showForm({
            title: 'Choose a domain', size: 'md',
            fields: [{
                name: 'domain', type: 'select', label: 'Domain', required: true,
                columns: 12, options: choices,
                help: 'The domain owns the VHost and cannot be changed later.'
            }]
        });
        return result ? this.resolveDomain(result.domain, app) : null;
    }

    static async open(options = {}) {
        const { app, existing = null, collection = null } = options;
        if (!app) return null;
        const creating = !existing;
        const embeddedDomain = existing?.get?.('domain');
        const domain = creating
            ? await this.chooseDomain(app)
            : await this.resolveDomain(embeddedDomain?.id || embeddedDomain, app);
        if (!domain) {
            if (!creating) Modal.showError('VHost details are unavailable.');
            return null;
        }

        const group = domain.get('group');
        const groupId = group?.id || group || null;
        const certificates = new CertificateList({
            size: 200,
            params: { domain: domain.id }
        });
        const upstreams = new UpstreamList({
            size: 200,
            params: {
                is_enabled: true,
                ...(groupId ? { group: groupId } : { group__isnull: true })
            }
        });
        const [certificateResponse, upstreamResponse] = await Promise.all([
            certificates.fetch(), upstreams.fetch()
        ]);
        if (!classifyActionResponse(certificateResponse, certificates).ok
            || !classifyActionResponse(upstreamResponse, upstreams).ok) {
            Modal.showError('Could not load the safe certificate and upstream choices.');
            return null;
        }

        const certificateOptions = certificates.models.map(model => option(model, item => {
            const name = item.get('common_name') || item.get('sans')?.[0] || `Certificate ${item.id}`;
            return `${name} (${item.get('status') || 'unknown'})`;
        }));
        if (!certificateOptions.length) {
            Modal.showError(`Issue a certificate for ${domain.get('name')} before creating a VHost.`);
            return null;
        }
        const upstreamOptions = upstreams.models.map(model => option(model, item => item.get('name')));
        const fields = [
            {
                name: 'label', type: 'text', label: 'Host label', columns: 12,
                value: existing?.get?.('label') || '', placeholder: 'www (blank for apex)',
                help: `Serves under ${domain.get('name')}. Use one lowercase DNS label or *.`
            },
            {
                name: 'kind', type: 'select', label: 'Serving kind', required: true,
                columns: 12, options: VhostKindOptions, value: existing?.get?.('kind') || 'static'
            },
            {
                name: 'upstream', type: 'select', label: 'Declared upstream', required: true,
                columns: 12, options: upstreamOptions,
                value: existing?.get?.('upstream')?.id || existing?.get?.('upstream') || '',
                showWhen: { field: 'kind', value: 'proxy' },
                help: upstreamOptions.length
                    ? 'Only active destinations declared for this scope are selectable.'
                    : 'No active upstream is declared for this scope.'
            },
            {
                name: 'certificate', type: 'select', label: 'Certificate', required: true,
                columns: 12, options: certificateOptions,
                value: existing?.get?.('certificate')?.id || existing?.get?.('certificate') || ''
            },
            {
                name: 'pool', type: 'text', label: 'Fleet pool', required: true, columns: 6,
                value: existing?.get?.('pool') || 'default',
                attributes: { maxlength: 32, pattern: '[a-z0-9_-]{1,32}' },
                help: '1–32 lowercase letters, digits, underscores, or hyphens. The server must declare it.'
            },
            {
                name: 'is_enabled', type: 'switch', label: 'Enabled', columns: 6,
                value: existing ? existing.get('is_enabled') === true : true
            }
        ];

        const result = await app.showForm({
            title: creating ? `Create VHost on ${domain.get('name')}` : `Edit ${existing.get('server_name')}`,
            size: 'md', fields
        });
        if (!result) return null;

        let payload;
        try {
            payload = buildVhostPayload({ ...result, domain: domain.id }, { create: creating });
        } catch (error) {
            Modal.showError(error.message);
            return { ok: false, error: error.message };
        }

        const model = existing || new Vhost();
        app.showLoading?.();
        let response;
        try {
            response = await model.save(payload);
            const verdict = classifyActionResponse(response, model);
            if (!verdict.ok) {
                Modal.showError(verdict.error || 'The VHost was not saved.');
                return { ...verdict, response, model };
            }

            const refresh = await (collection?.fetch?.() || model.fetch());
            if (!classifyActionResponse(refresh, collection || model).ok) {
                Modal.showError('The VHost was saved, but the authoritative list could not be refreshed.');
                return { ok: false, refreshRequired: true, response, model };
            }
            app.toast?.success(creating ? 'VHost created' : 'VHost updated');
            return { ok: true, response, model };
        } finally {
            app.hideLoading?.();
        }
    }
}

export default VhostForm;
