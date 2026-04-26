import { IncidentHistory, IncidentHistoryList } from '@ext/admin/models/Incident.js';
import rest from '@core/Rest.js';

class IncidentHistoryAdapter {
    constructor(incidentId) {
        this.incidentId = incidentId;
        this.collection = new IncidentHistoryList({ params: { parent: this.incidentId, sort: 'created', size: 100 } });
    }

    async fetch() {
        await this.collection.fetch();
        const messages = this.collection.models.map(item => this.transform(item));
        // Render markdown for system_event messages (e.g., LLM analysis notes)
        await Promise.all(messages.map(async (msg) => {
            if (msg.type === 'system_event' && msg.content) {
                msg.content = await this._renderMarkdown(msg.content);
            }
        }));
        return messages;
    }

    transform(item) {
        return {
            id: item.get('id'),
            type: item.get('kind') === 'comment' ? 'user_comment' : 'system_event',
            author: {
                name: item.get('user.display_name') || 'System',
                avatarUrl: item.get('user.avatar.url')
            },
            timestamp: item.get('created'),
            content: item.get('note'),
            attachments: item.get('media') ? [item.get('media')] : []
        };
    }

    async addNote(data) {
        const history = new IncidentHistory();
        const resp = await history.save({
            parent: this.incidentId,
            note: data.text,
            kind: 'comment',
            media: data.files && data.files.length > 0 ? data.files[0].id : null
        });
        if (resp.success) {
            await this.collection.fetch();
        }
        return resp;
    }

    async _renderMarkdown(markdown) {
        if (!markdown) return '';
        try {
            const resp = await rest.post('/api/docit/render', { markdown });
            const html = resp?.data?.data?.html || resp?.data?.html;
            if (html) return html;
        } catch (_e) { /* API unavailable */ }
        // Fallback: escape and preserve whitespace
        const div = document.createElement('div');
        div.textContent = markdown;
        return `<pre style="white-space: pre-wrap;">${div.innerHTML}</pre>`;
    }
}

export default IncidentHistoryAdapter;
