/**
 * TimelineView - Timeline component extending ListView
 * 
 * Displays chronological events from a Collection with clean, modern styling.
 * Each timeline item is managed as a separate view that updates independently
 * when its model changes.
 * 
 * Features:
 * - Collection-based data management
 * - Left-aligned or center-aligned layout
 * - Customizable markers (dots, icons)
 * - Date formatting and grouping
 * - Individual item re-rendering
 * - Responsive Bootstrap 5 styling
 * 
 * @example
 * const timeline = new TimelineView({
 *   collection: eventCollection,
 *   position: 'left',
 *   dotStyle: 'icon',
 *   dateFormat: 'relative'
 * });
 * 
 * @example
 * // Custom item template
 * const timeline = new TimelineView({
 *   collection: historyCollection,
 *   itemTemplate: `
 *     <div class="custom-timeline-item">
 *       <strong>{{model.title}}</strong>
 *       <p>{{model.description}}</p>
 *     </div>
 *   `
 * });
 */

import ListView from '@core/views/list/ListView.js';
import TimelineViewItem from './TimelineViewItem.js';

class TimelineView extends ListView {
    constructor(options = {}) {
        // Override ListView defaults with timeline-specific settings
        super({
            className: 'timeline-view',
            itemClass: options.itemClass || TimelineViewItem,
            selectionMode: 'none', // Timelines typically don't use selection
            emptyMessage: options.emptyMessage || 'No timeline events to display',
            template: `
                <div class="timeline-container timeline-{{position}}">
                    {{#loading}}
                        <div class="timeline-loading text-center py-4">
                            <div class="spinner-border spinner-border-sm" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                            <span class="ms-2 text-muted">Loading timeline...</span>
                        </div>
                    {{/loading}}
                    {{^loading}}
                        {{#isEmpty}}
                            <div class="timeline-empty text-center text-muted py-4">
                                <i class="bi bi-clock-history fs-1 d-block mb-2"></i>
                                <p>{{emptyMessage}}</p>
                            </div>
                        {{/isEmpty}}
                        {{^isEmpty}}
                            <div class="timeline" data-container="items"></div>
                        {{/isEmpty}}
                    {{/loading}}
                </div>
            `,
            ...options
        });

        // Timeline-specific options
        this.position = options.position || 'left'; // 'left' or 'center'
        this.dateFormat = options.dateFormat || 'date'; // 'date', 'datetime', 'relative'
        this.dotStyle = options.dotStyle || 'solid'; // 'solid', 'hollow', 'icon'
        this.showDate = options.showDate !== false;
        this.theme = options.theme || 'primary';
        this.groupBy = options.groupBy || 'none'; // Future: 'none', 'day', 'month', 'year'
    }

    /**
     * Override _createItemView to pass timeline-specific options
     */
    _createItemView(model, index) {
        // Don't create duplicate views
        if (this.itemViews.has(model.id)) return;

        const itemView = new this.itemClass({
            model: model,
            index: index,
            listView: this,
            template: this.itemTemplate,
            // Pass timeline-specific options to items
            dateFormat: this.dateFormat,
            dotStyle: this.dotStyle,
            showDate: this.showDate,
            theme: this.theme
        });

        // Store the item view
        this.itemViews.set(model.id, itemView);

        // Set up item event listeners
        itemView.on('item:click', this._onItemClick.bind(this));

        return itemView;
    }

    /**
     * Handle item clicks (replaces selection behavior)
     */
    _onItemClick(event) {
        this.emit('item:click', event);
    }

    /**
     * Update timeline position
     */
    setPosition(position) {
        if (position !== 'left' && position !== 'center') {
            console.warn('Invalid position. Use "left" or "center"');
            return this;
        }
        
        this.position = position;
        if (this.isMounted()) {
            this.render();
        }
        return this;
    }

    /**
     * Update date format for all items
     */
    setDateFormat(format) {
        this.dateFormat = format;
        
        // Update all items
        this.forEachItem(itemView => {
            itemView.dateFormat = format;
            itemView.processItemData();
            if (itemView.isMounted()) {
                itemView.render();
            }
        });
        
        return this;
    }

    /**
     * Update dot style for all items
     */
    setDotStyle(style) {
        this.dotStyle = style;
        
        // Update all items
        this.forEachItem(itemView => {
            itemView.dotStyle = style;
            itemView.processItemData();
            if (itemView.isMounted()) {
                itemView.render();
            }
        });
        
        return this;
    }

    /**
     * Toggle date display
     */
    toggleDates(show = null) {
        this.showDate = show !== null ? show : !this.showDate;
        
        // Update all items
        this.forEachItem(itemView => {
            itemView.showDate = this.showDate;
            if (itemView.isMounted()) {
                itemView.render();
            }
        });
        
        return this;
    }
}

export default TimelineView;
