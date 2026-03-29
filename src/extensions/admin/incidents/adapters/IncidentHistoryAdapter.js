import { IncidentHistory, IncidentHistoryList } from '@core/models/Incident.js';

class IncidentHistoryAdapter {
    constructor(incidentId) {
        this.incidentId = incidentId;
        this.collection = new IncidentHistoryList({ params: { incident: this.incidentId, sort: 'created', size: 100 } });
    }

    async fetch() {
        await this.collection.fetch();
        return this.collection.models.map(item => this.transform(item));
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
}

export default IncidentHistoryAdapter;
