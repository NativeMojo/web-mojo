import { IncidentHistory, IncidentHistoryList } from '@core/models/Incident.js';

class IncidentHistoryAdapter {
    constructor(incidentId) {
        this.incidentId = incidentId;
        this.collection = new IncidentHistoryList({ params: { incident: this.incidentId } });
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
                name: item.get('by.display_name') || 'System',
                avatarUrl: item.get('by.avatar.url')
            },
            timestamp: item.get('created'),
            content: item.get('note'),
            attachments: [] // Incident history doesn't have attachments in this phase
        };
    }

    async addNote(data) {
        const history = new IncidentHistory({
            incident: this.incidentId,
            note: data.text,
            kind: 'comment'
        });
        const resp = await history.save();
        if (resp.success) {
            await this.collection.fetch();
        }
        return resp;
    }
}

export default IncidentHistoryAdapter;
