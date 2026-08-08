import Modal from '@core/views/feedback/Modal.js';
import {
    DnsCredential,
    DnsCredentialForms,
    DnsGroupChoiceList
} from '@ext/admin/models/Dns.js';

/** Shared link/rotation flow used by both credential surfaces. */
class DnsCredentialLinkForm {
    static async open(options = {}) {
        const { app, existing = null, collection = null } = options;
        if (!app) return null;
        const groups = new DnsGroupChoiceList({ params: { start: 0, size: 50 } });
        const activeGroup = app.activeGroup || null;
        const isGlobal = !activeGroup;
        const form = JSON.parse(JSON.stringify(DnsCredentialForms.link));
        let immutableGroup = existing?.get?.('group') || null;
        let groupId = immutableGroup?.id || activeGroup?.id || null;

        if (existing) {
            form.title = `Rotate the key for ${existing.get('name')}`;
            form.fields = form.fields.filter(field => field.name !== 'provider');
            form.fields.find(field => field.name === 'name').value = existing.get('name');
            if (groupId && isGlobal) {
                const exact = await groups.fetchChoice(groupId);
                if (!exact) {
                    Modal.showError('The credential group is no longer available. Refresh before rotating.');
                    return null;
                }
                immutableGroup = exact.attributes;
                groupId = exact.id;
            }
            if (!isGlobal && immutableGroup?.id && String(immutableGroup.id) !== String(activeGroup?.id)) {
                Modal.showError('Switch to the credential group before rotating its key.');
                return null;
            }
        } else if (isGlobal) {
            const response = await groups.fetch();
            if (!response || response.success === false) {
                Modal.showError('Could not load the groups available for credential linking.');
                return null;
            }
            const choices = groups.models.map(group => ({ value: group.id, label: group.get('name') }));
            if (!choices.length) {
                Modal.showError('No active groups are available for credential linking.');
                return null;
            }
            form.fields.unshift({
                name: 'group', type: 'select', label: 'Group', required: true,
                columns: 12, options: choices
            });
        }

        if (!existing && !isGlobal && !groupId) {
            Modal.showError('Select an active group before linking a credential.');
            return null;
        }

        const result = await app.showForm(form);
        if (!result) return null;
        if (!existing && isGlobal) groupId = result.group;

        const payload = {
            group: groupId,
            provider: existing ? existing.get('provider') : result.provider,
            name: result.name,
            api_key: result.api_key,
            api_secret: result.api_secret,
            ...(existing ? { credential: existing.id } : {})
        };
        const baseline = existing ? {
            modified: existing.get('modified'),
            verified_at: existing.get('verified_at')
        } : null;
        app.showLoading?.();
        let mutation;
        try {
            mutation = await DnsCredential.link(payload, {
                reconcile: async () => {
                    if (existing) {
                        const response = await existing.fetch({ params: { graph: 'default' } });
                        return response && response.success !== false ? existing.attributes : null;
                    }
                    const response = await collection?.fetch?.();
                    return response && response.success !== false
                        ? (collection.models || []).map(model => model.attributes)
                        : null;
                },
                classify: (observed) => {
                    if (existing) {
                        const changed = observed.modified !== baseline.modified
                            || observed.verified_at !== baseline.verified_at;
                        return changed && observed.verified === true ? 'applied' : 'not-applied';
                    }
                    return observed.some(row => row.name === payload.name
                        && row.provider === payload.provider && row.verified === true)
                        ? 'applied' : 'not-applied';
                }
            });
        } finally {
            // Do not retain secrets in a form result or payload after the one
            // permitted request attempt.
            result.api_key = '';
            result.api_secret = '';
            payload.api_key = '';
            payload.api_secret = '';
            app.hideLoading?.();
        }

        if (mutation?.state === 'applied') {
            app.toast?.success(existing ? 'Key rotated and verified' : 'Credential linked and verified');
        } else if (mutation?.refreshRequired) {
            Modal.showError('The credential result could not be confirmed. Refresh before trying again.');
        } else {
            const response = mutation?.response;
            Modal.showError((response?.data && response.data.error)
                || 'The provider rejected that key. Nothing was stored.');
        }
        return mutation;
    }
}

export default DnsCredentialLinkForm;
