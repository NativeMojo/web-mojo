/**
 * TimelineViewItem - Individual timeline item view
 * 
 * Extends ListViewItem to provide timeline-specific rendering.
 * Each item is its own View with its own model, allowing for
 * independent re-rendering when the model changes.
 * 
 * Expected model attributes:
 *   - date: Date string or Date object
 *   - title: Main heading (optional)
 *   - description: Body text (optional)
 *   - icon: Bootstrap icon class (optional)
 *   - color: Bootstrap color variant (optional)
 *   - meta: Additional metadata (optional)
 * 
 * @example
 * const item = new TimelineViewItem({
 *   model: eventModel,
 *   dateFormat: 'relative',
 *   dotStyle: 'icon'
 * });
 */

import ListViewItem from '@core/views/list/ListViewItem.js';
import dataFormatter from '@utils/DataFormatter.js';

class TimelineViewItem extends ListViewItem {
    constructor(options = {}) {
        super({
            className: 'timeline-item',
            ...options
        });

        // Timeline-specific options
        this.dateFormat = options.dateFormat || 'date';
        this.dotStyle = options.dotStyle || 'solid';
        this.showDate = options.showDate !== false;
        this.theme = options.theme || 'primary';

        // Default timeline item template
        if (!this.template) {
            this.template = `
                <div class="timeline-marker timeline-marker-{{markerType}}">
                    {{#hasIcon}}
                    <i class="bi {{model.icon}} text-{{displayColor}}"></i>
                    {{/hasIcon}}
                    {{^hasIcon}}
                    <div class="timeline-dot bg-{{displayColor}}"></div>
                    {{/hasIcon}}
                </div>
                
                <div class="timeline-content">
                    {{#showDate}}
                    <div class="timeline-date text-muted small">
                        {{formattedDate}}
                    </div>
                    {{/showDate}}
                    
                    <div class="timeline-card">
                        {{#model.title}}
                        <h6 class="timeline-title mb-1">{{model.title}}</h6>
                        {{/model.title}}
                        
                        {{#model.description}}
                        <p class="timeline-description mb-0">{{model.description}}</p>
                        {{/model.description}}
                        
                        {{#model.meta}}
                        <div class="timeline-meta mt-2 text-muted small">
                            {{model.meta}}
                        </div>
                        {{/model.meta}}
                    </div>
                </div>
            `;
        }
    }

    async onInit() {
        await super.onInit();
        this.processItemData();
    }

    processItemData() {
        // Get color from model or use theme default
        this.displayColor = this.model?.get?.('color') || this.model?.color || this.theme;
        
        // Determine marker type
        const hasIcon = !!(this.model?.get?.('icon') || this.model?.icon) && this.dotStyle === 'icon';
        this.hasIcon = hasIcon;
        this.markerType = hasIcon ? 'icon' : this.dotStyle;
        
        // Format date
        const dateValue = this.model?.get?.('date') || this.model?.date;
        this.formattedDate = this.formatDate(dateValue);
    }

    formatDate(date) {
        if (!date) return '';
        
        switch (this.dateFormat) {
            case 'datetime':
                return dataFormatter.pipe(date, 'datetime');
            case 'relative':
                return dataFormatter.pipe(date, 'timeago');
            default:
                return dataFormatter.pipe(date, 'date');
        }
    }

    // Override to disable selection behavior in timeline
    async onActionSelect(event, _element) {
        event.stopPropagation();
        
        // Emit click event instead of selection
        this.emit('item:click', {
            item: this,
            model: this.model,
            index: this.index,
            data: this.model?.toJSON ? this.model.toJSON() : this.model
        });

        if (this.listView) {
            this.listView.emit('item:click', {
                item: this,
                model: this.model,
                index: this.index,
                data: this.model?.toJSON ? this.model.toJSON() : this.model
            });
        }
    }
}

export default TimelineViewItem;
