# TimelineView Component

A clean, flexible timeline component extending ListView for displaying chronological events with modern styling.

## Overview

TimelineView extends ListView to provide timeline-specific rendering with Collection-based data management. Each timeline item is a separate view that updates independently when its model changes.

## Features

- **Collection-based**: Integrates with MOJO Collections for automatic updates
- **Individual item rendering**: Only changed items re-render when models update
- **Dual Layout Modes**: Left-aligned (default) or center-aligned timeline
- **Flexible Markers**: Solid dots, hollow dots, or Bootstrap icons
- **Date Formatting**: Multiple date display options via DataFormatter
- **Responsive**: Automatically adapts to mobile
- **Bootstrap 5**: Full integration with Bootstrap colors and utilities
- **Event system**: Built-in events for item interactions
- **Loading states**: Automatic loading and empty state handling

## Basic Usage

```js
import TimelineView from '@core/views/timeline/TimelineView.js';
import Collection from '@core/Collection.js';
import '@core/views/timeline/timeline.css';

// Create a collection
const eventCollection = new Collection(null, {
    url: '/api/events'
});

// Create timeline
const timeline = new TimelineView({
    collection: eventCollection,
    position: 'left',
    dotStyle: 'icon',
    dateFormat: 'relative',
    containerId: 'timeline-container'
});

// Add to parent view
this.addChild(timeline);
```

## Configuration Options

### Layout Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `collection` | Collection | required | MOJO Collection instance |
| `position` | String | `'left'` | Timeline alignment: `'left'` or `'center'` |
| `dateFormat` | String | `'date'` | Date format: `'date'`, `'datetime'`, `'relative'` |
| `dotStyle` | String | `'solid'` | Marker style: `'solid'`, `'hollow'`, `'icon'` |
| `showDate` | Boolean | `true` | Show/hide date labels |
| `theme` | String | `'primary'` | Default Bootstrap color variant |
| `emptyMessage` | String | `'No timeline events...'` | Message shown when empty |
| `fetchOnMount` | Boolean | `false` | Auto-fetch collection on mount |

### ListView Inherited Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `itemTemplate` | String | `null` | Custom Mustache template for items |
| `itemClass` | Class | `TimelineViewItem` | Custom item view class |
| `selectionMode` | String | `'none'` | Selection mode (disabled for timelines) |

## Model/Collection Data Structure

Your Collection models should have these attributes:

```js
{
    id: 'unique-id',              // Required by Collection
    date: '2024-01-15T10:30:00',  // ISO date string or Date object
    title: 'Event Title',          // Main heading (optional)
    description: 'Description',    // Body text (optional)
    icon: 'bi-rocket',            // Bootstrap icon class (optional)
    color: 'primary',             // Bootstrap color variant (optional)
    meta: 'Additional info'       // Footer metadata (optional)
}
```

## Examples

### Basic Timeline with Collection

```js
import TimelineView from '@core/views/timeline/TimelineView.js';
import Collection from '@core/Collection.js';

class ActivityPage extends Page {
    async onInit() {
        // Create collection
        this.activityCollection = new Collection(null, {
            url: '/api/user/activity'
        });

        // Create timeline
        const timeline = new TimelineView({
            collection: this.activityCollection,
            position: 'left',
            dateFormat: 'relative',
            fetchOnMount: true,
            containerId: 'timeline'
        });

        this.addChild(timeline);
    }

    getTemplate() {
        return `
            <div class="container py-4">
                <h2>Activity Timeline</h2>
                <div data-container="timeline"></div>
            </div>
        `;
    }
}
```

### Timeline with Icons

```js
const timeline = new TimelineView({
    collection: eventCollection,
    dotStyle: 'icon',
    theme: 'primary'
});

// Collection models should include icon property:
// { date: '2024-01-01', title: 'Started', icon: 'bi-rocket', color: 'success' }
```

### Center-Aligned Timeline

```js
const timeline = new TimelineView({
    collection: historyCollection,
    position: 'center',
    dateFormat: 'datetime',
    dotStyle: 'hollow'
});
```

### Custom Item Template

```js
const timeline = new TimelineView({
    collection: orderCollection,
    itemTemplate: `
        <div class="custom-order-item">
            <div class="order-badge bg-{{displayColor}}">
                <i class="bi {{model.icon}}"></i>
            </div>
            <div class="order-details">
                <h6>Order #{{model.orderId}}</h6>
                <p class="text-muted small">{{formattedDate}}</p>
                <p>{{model.status}} - {{model.items}} items</p>
            </div>
        </div>
    `
});
```

### Real-time Updates

```js
// Timeline automatically updates when collection changes
class LiveActivityView extends View {
    async onInit() {
        this.collection = new Collection(null, {
            url: '/api/live-activity'
        });

        const timeline = new TimelineView({
            collection: this.collection,
            dateFormat: 'relative',
            containerId: 'timeline'
        });

        this.addChild(timeline);

        // Poll for updates
        this.intervalId = setInterval(() => {
            this.collection.fetch(); // Timeline auto-updates
        }, 30000);
    }

    async onBeforeDestroy() {
        clearInterval(this.intervalId);
    }

    getTemplate() {
        return `<div data-container="timeline"></div>`;
    }
}
```

## Methods

### Inherited from ListView

#### refresh()
Re-fetch the collection data.

```js
await timeline.refresh();
```

#### forEachItem(callback)
Iterate over each timeline item.

```js
timeline.forEachItem((itemView, model, index) => {
    console.log(itemView, model.get('title'));
});
```

### Timeline-Specific Methods

#### setPosition(position)
Change timeline layout.

```js
timeline.setPosition('center'); // or 'left'
```

#### setDateFormat(format)
Update date format for all items.

```js
timeline.setDateFormat('relative'); // 'date', 'datetime', 'relative'
```

#### setDotStyle(style)
Update marker style for all items.

```js
timeline.setDotStyle('icon'); // 'solid', 'hollow', 'icon'
```

#### toggleDates(show)
Show/hide dates on all items.

```js
timeline.toggleDates(false); // Hide all dates
timeline.toggleDates(true);  // Show all dates
timeline.toggleDates();      // Toggle current state
```

## Events

### Inherited from ListView

```js
// Item clicked
timeline.on('item:click', (event) => {
    console.log('Item clicked:', event.model.get('title'));
    console.log('Item data:', event.data);
});

// List loaded
timeline.on('list:loaded', (event) => {
    console.log(`Timeline loaded with ${event.count} items`);
});

// List empty
timeline.on('list:empty', () => {
    console.log('Timeline has no items');
});
```

## Custom Item View

For advanced customization, create a custom TimelineViewItem:

```js
import TimelineViewItem from '@core/views/timeline/TimelineViewItem.js';

class CustomTimelineItem extends TimelineViewItem {
    constructor(options) {
        super(options);
        
        this.template = `
            <div class="my-custom-timeline-item">
                <span class="marker bg-{{displayColor}}"></span>
                <div class="content">
                    <h5>{{model.title}}</h5>
                    <p>{{model.description}}</p>
                    <small>{{formattedDate}}</small>
                </div>
            </div>
        `;
    }

    async onActionSelect(event, element) {
        // Custom click behavior
        this.showInfo('Item clicked: ' + this.model.get('title'));
    }
}

// Use custom item class
const timeline = new TimelineView({
    collection: myCollection,
    itemClass: CustomTimelineItem
});
```

## Integration with Models

```js
import TimelineView from '@core/views/timeline/TimelineView.js';
import Collection from '@core/Collection.js';
import Model from '@core/Model.js';

class OrderHistoryView extends View {
    async onInit() {
        // Create collection with models
        this.orderCollection = new Collection(null, {
            url: '/api/orders/history'
        });

        // Transform data when collection fetches
        this.orderCollection.parse = (response) => {
            return response.data.orders.map(order => ({
                id: order.id,
                date: order.createdAt,
                title: `Order #${order.id}`,
                description: `${order.items.length} items - ${order.status}`,
                color: this.getStatusColor(order.status),
                icon: this.getStatusIcon(order.status),
                meta: `Total: $${order.total.toFixed(2)}`
            }));
        };

        const timeline = new TimelineView({
            collection: this.orderCollection,
            position: 'left',
            dotStyle: 'icon',
            dateFormat: 'datetime',
            fetchOnMount: true,
            containerId: 'timeline'
        });

        // Listen for item clicks
        timeline.on('item:click', (event) => {
            this.showOrderDetails(event.model);
        });

        this.addChild(timeline);
    }

    getStatusColor(status) {
        const colors = {
            pending: 'warning',
            processing: 'info',
            shipped: 'primary',
            delivered: 'success',
            cancelled: 'danger'
        };
        return colors[status] || 'secondary';
    }

    getStatusIcon(status) {
        const icons = {
            pending: 'bi-clock',
            processing: 'bi-gear',
            shipped: 'bi-truck',
            delivered: 'bi-check-circle',
            cancelled: 'bi-x-circle'
        };
        return icons[status] || 'bi-circle';
    }

    showOrderDetails(model) {
        // Navigate or show modal with order details
        this.getApp().navigate(`/orders/${model.id}`);
    }

    getTemplate() {
        return `
            <div class="order-history">
                <h3>Order History</h3>
                <div data-container="timeline"></div>
            </div>
        `;
    }
}
```

## Styling

The component includes complete CSS in `timeline.css`. Import it in your application:

```js
import '@core/views/timeline/timeline.css';
```

### Custom Colors

Use any Bootstrap color variant in model data:
- `primary`, `secondary`, `success`, `danger`, `warning`, `info`, `light`, `dark`

### Responsive Behavior

- **Desktop**: Shows layout as configured (`left` or `center`)
- **Mobile (<768px)**: Center layout automatically switches to left for better readability

## Loading States

TimelineView automatically handles loading states from Collection:

```js
// Shows loading spinner while fetching
const timeline = new TimelineView({
    collection: myCollection,
    fetchOnMount: true
});

// Collection emits fetch:start and fetch:end events
// Timeline updates automatically
```

## Comparison with ListView

| Feature | ListView | TimelineView |
|---------|----------|--------------|
| Data Source | Collection | Collection |
| Item Management | ListViewItem | TimelineViewItem |
| Selection | Yes (configurable) | No (disabled) |
| Layout | Vertical list | Left/Center timeline |
| Markers | None | Dots/Icons |
| Date Formatting | Manual | Built-in |
| Use Case | General lists | Chronological events |

## Browser Support

Works in all modern browsers that support:
- CSS Grid and Flexbox
- ES6 Modules
- Bootstrap 5.3+

## See Also

- [ListView Documentation](./ListView.md)
- [Collection Documentation](../guide/collections.md)
- [Model Documentation](../guide/models.md)
- [View Lifecycle](../guide/view-lifecycle.md)
