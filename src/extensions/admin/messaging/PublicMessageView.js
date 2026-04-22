/**
 * PublicMessageView - Detail view for a PublicMessage record.
 *
 * Read + status-toggle only. Metadata is rendered generically so new
 * kinds and client-supplied tracking keys appear without code changes.
 */

import View from '@core/View.js';
import DataView from '@core/views/data/DataView.js';
import {
    PublicMessage,
    PublicMessageKindOptions,
    PublicMessageMetadataLabels,
} from '@core/models/PublicMessage.js';

const STATUS_BADGE = {
    open: 'bg-warning text-dark',
    closed: 'bg-secondary',
};

function humanizeKey(key) {
    return String(key || '')
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, c => c.toUpperCase());
}

class PublicMessageView extends View {
    constructor(options = {}) {
        super({
            className: 'public-message-view',
            ...options,
        });

        this.model = options.model || new PublicMessage(options.data || {});

        this.template = `
            <div class="public-message-view-container">
                <!-- Header -->
                <div class="d-flex justify-content-between align-items-start mb-3">
                    <div class="flex-grow-1" style="min-width: 0;">
                        <div class="d-flex align-items-center gap-2 mb-1">
                            <span class="badge bg-primary">{{kindLabel}}</span>
                            <span class="badge {{statusBadgeClass}}">{{statusLabel}}</span>
                            {{#model.created}}
                                <span class="text-muted small"><i class="bi bi-clock me-1"></i>{{model.created|relative}}</span>
                            {{/model.created}}
                        </div>
                        <h5 class="mb-1">{{#model.subject}}{{model.subject}}{{/model.subject}}{{^model.subject}}<span class="text-muted fst-italic">No subject</span>{{/model.subject}}</h5>
                        <div class="text-muted small d-flex align-items-center gap-3 flex-wrap">
                            <span><i class="bi bi-person-fill me-1"></i>{{model.name}}</span>
                            <span><i class="bi bi-envelope me-1"></i><a href="mailto:{{model.email}}">{{model.email}}</a></span>
                            {{#model.group.name}}
                                <span><i class="bi bi-diagram-3 me-1"></i>{{model.group.name}}</span>
                            {{/model.group.name}}
                        </div>
                    </div>
                </div>

                <!-- Submitter -->
                <div class="card mb-3">
                    <div class="card-header py-2"><h6 class="mb-0"><i class="bi bi-person-lines-fill me-1"></i>Submitter</h6></div>
                    <div data-container="submitter"></div>
                </div>

                <!-- Details (metadata) -->
                {{#hasMetadata|bool}}
                <div class="card mb-3">
                    <div class="card-header py-2"><h6 class="mb-0"><i class="bi bi-tags me-1"></i>Details</h6></div>
                    <div data-container="details"></div>
                </div>
                {{/hasMetadata|bool}}

                <!-- Message body -->
                <div class="card mb-3">
                    <div class="card-header py-2"><h6 class="mb-0"><i class="bi bi-chat-left-text me-1"></i>Message</h6></div>
                    <div class="card-body">
                        <pre class="mb-0" style="white-space: pre-wrap; word-wrap: break-word; font-family: inherit;">{{model.message}}</pre>
                    </div>
                </div>

                <!-- Actions -->
                <div class="d-flex align-items-center gap-2">
                    <button class="btn {{toggleBtnClass}} btn-sm" data-action="toggle-status">
                        <i class="bi {{toggleBtnIcon}} me-1"></i>{{toggleBtnLabel}}
                    </button>
                    <a class="btn btn-outline-secondary btn-sm" href="mailto:{{model.email}}?subject={{replySubject}}">
                        <i class="bi bi-reply me-1"></i>Reply via Email
                    </a>
                </div>
            </div>
        `;
    }

    async onBeforeRender() {
        const kindVal = this.model.get('kind') || '';
        const kindOpt = PublicMessageKindOptions.find(o => o.value === kindVal);
        this.kindLabel = kindOpt ? kindOpt.label : kindVal;

        const status = this.model.get('status') || 'open';
        this.statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
        this.statusBadgeClass = STATUS_BADGE[status] || 'bg-secondary';

        const metadata = this.model.get('metadata') || {};
        this.hasMetadata = Object.keys(metadata).length > 0;

        if (status === 'open') {
            this.toggleBtnClass = 'btn-success';
            this.toggleBtnIcon = 'bi-check-circle';
            this.toggleBtnLabel = 'Mark Closed';
        } else {
            this.toggleBtnClass = 'btn-outline-warning';
            this.toggleBtnIcon = 'bi-arrow-counterclockwise';
            this.toggleBtnLabel = 'Mark Open';
        }

        const subject = this.model.get('subject') || '';
        this.replySubject = encodeURIComponent(subject ? `Re: ${subject}` : 'Re: your message');
    }

    async onInit() {
        this.submitterView = new DataView({
            containerId: 'submitter',
            model: this.model,
            className: 'p-3',
            columns: 2,
            showEmptyValues: false,
            fields: [
                { name: 'name', label: 'Name', colSize: 6 },
                { name: 'email', label: 'Email', type: 'email', colSize: 6 },
                { name: 'ip_address', label: 'IP', colSize: 6 },
                { name: 'user_agent', label: 'User Agent', colSize: 12 },
                { name: 'group.name', label: 'Group', colSize: 6 },
            ],
        });
        this.addChild(this.submitterView);

        const metadata = this.model.get('metadata') || {};
        const metadataKeys = Object.keys(metadata);
        if (metadataKeys.length) {
            const detailFields = metadataKeys.map(key => ({
                name: key,
                label: PublicMessageMetadataLabels[key] || humanizeKey(key),
                colSize: 6,
            }));
            this.detailsView = new DataView({
                containerId: 'details',
                data: metadata,
                className: 'p-3',
                columns: 2,
                showEmptyValues: false,
                fields: detailFields,
            });
            this.addChild(this.detailsView);
        }
    }

    async onActionToggleStatus() {
        const next = this.model.get('status') === 'open' ? 'closed' : 'open';
        try {
            await this.model.save({ status: next });
            this.getApp()?.toast?.success(`Message marked ${next}`);
            await this.render();
        } catch (_e) {
            this.getApp()?.toast?.error('Failed to update status');
        }
    }
}

PublicMessage.VIEW_CLASS = PublicMessageView;

export default PublicMessageView;
