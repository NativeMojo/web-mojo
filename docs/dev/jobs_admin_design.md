# Jobs Admin UI/UX Design & Implementation Plan

## Overview

This document outlines the design and implementation plan for comprehensive admin pages to manage the Async Job Engine. The design follows MOJO framework patterns, leverages Bootstrap 5.3, and provides a clean, intuitive interface for job monitoring and management.

## Design Philosophy

- **Clean & Simple**: Following the existing MOJO admin patterns with minimal complexity
- **Component-Based**: Leveraging Table.js, Collection.js, and other MOJO components
- **Bootstrap 5.3**: Consistent styling with existing admin pages
- **Real-time Updates**: Live monitoring of job status and system health
- **Object-Oriented**: Using POST_SAVE_ACTIONS pattern from the Jobs API

## Architecture Overview

```
JobsAdminPage (Main Dashboard)
├── JobStatsView (Real-time metrics)
├── JobHealthView (System health monitoring from /api/jobs/health)
├── TabView
│   ├── JobsTable (All jobs with channel filtering)
│   ├── RunnersTable (Worker management)
│   └── ScheduledJobsTable (Future jobs - jobs with run_at set)
└── JobDetailsView (Dialog for individual jobs)
```

## Core Models

### Job Model
```javascript
class Job extends Model {
    constructor(data = {}) {
        super(data, {
            endpoint: '/api/jobs/job'
        });
    }

    // Object-oriented actions from API
    async cancel() {
        return await this.save({ cancel_request: true });
    }

    async retry(delay = null) {
        const data = delay ? { retry_request: { retry: true, delay } } : { retry_request: true };
        return await this.save(data);
    }

    async getDetailedStatus() {
        return await this.save({ get_status: true });
    }

    async cloneJob(newPayload = {}) {
        return await this.save({ publish_job: newPayload });
    }

    // Status helpers
    isActive() {
        return ['pending', 'running'].includes(this.get('status'));
    }

    isTerminal() {
        return ['completed', 'failed', 'canceled', 'expired'].includes(this.get('status'));
    }

    canRetry() {
        return ['failed', 'canceled', 'expired'].includes(this.get('status'));
    }

    canCancel() {
        return ['pending', 'running'].includes(this.get('status'));
    }

    getEvents() {
        return this.get('recent_events') || [];
    }
}
```

### JobRunner Model
```javascript
class JobRunner extends Model {
    constructor(data = {}) {
        super(data, {
            endpoint: '/api/jobs/runners'
        });
    }

    async ping(timeout = 2.0) {
        return await this.getApp().rest.POST('/api/jobs/runners/ping', {
            runner_id: this.get('id'),
            timeout
        });
    }

    async shutdown(graceful = true) {
        return await this.getApp().rest.POST('/api/jobs/runners/shutdown', {
            runner_id: this.get('id'),
            graceful
        });
    }

    getChannels() {
        return this.get('channels') || [];
    }
}
```

## Main Dashboard (JobsAdminPage)

### Layout Structure
```
┌─────────────────────────────────────────────────┐
│ Jobs Management                      [Actions]  │
├─────────────────────────────────────────────────┤
│ [Pending] [Running] [Completed] [Failed] Stats  │
├─────────────────────────────────────────────────┤
│ System Health: [●] Healthy | Workers: 3/3       │
├─────────────────────────────────────────────────┤
│ ┌──Jobs───┐ ┌─Runners─┐ ┌─Scheduled─┐           │
│ │         │ │         │ │           │           │
│ │ All     │ │ Worker  │ │ Future    │           │
│ │ Jobs    │ │ Status  │ │ Jobs      │           │
│ │ Table   │ │ & Mgmt  │ │ (run_at)  │           │
│ │ w/Chan  │ │         │ │           │           │
│ │ Filter  │ │         │ │           │           │
│ └─────────┘ └─────────┘ └───────────┘           │
└─────────────────────────────────────────────────┘
```

### Features
- **Real-time Stats Cards**: Pending, Running, Completed, Failed job counts from `/api/jobs/stats`
- **System Health Indicator**: Overall system status from `/api/jobs/health`
- **Action Buttons**: Refresh, Publish Job, Export
- **Tabbed Interface**: Jobs (with channel filtering), Runners, Scheduled Jobs
- **Channel Filtering**: Filter jobs by channel, channels discovered from runner data
- **Auto-refresh**: Configurable refresh intervals (5s, 10s, 30s, off)

## Jobs Table

### Columns Configuration
```javascript
const jobTableColumns = [
    { 
        key: 'id', 
        label: 'Job ID', 
        formatter: 'truncate_middle(12)',
        sortable: true,
        filter: { type: 'text', placeholder: 'Job ID...' }
    },
    { 
        key: 'status', 
        label: 'Status', 
        formatter: 'badge',
        sortable: true,
        filter: { 
            type: 'select', 
            options: [
                { value: 'pending', label: 'Pending' },
                { value: 'running', label: 'Running' },
                { value: 'completed', label: 'Completed' },
                { value: 'failed', label: 'Failed' },
                { value: 'canceled', label: 'Canceled' },
                { value: 'expired', label: 'Expired' }
            ]
        }
    },
    { 
        key: 'func', 
        label: 'Function', 
        sortable: true,
        filter: { type: 'text', placeholder: 'Function name...' }
    },
    { 
        key: 'channel', 
        label: 'Channel', 
        formatter: 'badge',
        sortable: true,
        filter: { type: 'text', placeholder: 'Channel...' }
    },
    { 
        key: 'created', 
        label: 'Created', 
        formatter: 'datetime',
        sortable: true,
        filter: { 
            type: 'daterange',
            label: 'Created Date Range'
        }
    },
    { 
        key: 'started_at', 
        label: 'Started', 
        formatter: 'datetime',
        sortable: true 
    },
    { 
        key: 'finished_at', 
        label: 'Finished', 
        formatter: 'datetime',
        sortable: true 
    },
    { 
        key: 'attempt', 
        label: 'Attempt', 
        formatter: (value, context) => `${value}/${context.row.max_retries}`,
        sortable: true 
    },
    { 
        key: 'duration_ms', 
        label: 'Duration', 
        formatter: 'duration',
        sortable: true 
    }
];
```

### Context Menu Actions
```javascript
const jobContextMenu = [
    { 
        label: 'View Details', 
        action: 'view-job-details', 
        icon: 'bi-info-circle' 
    },
    { 
        label: 'View Logs', 
        action: 'view-job-logs', 
        icon: 'bi-journal-text' 
    },
    { separator: true },
    { 
        label: 'Cancel Job', 
        action: 'cancel-job', 
        icon: 'bi-x-circle',
        danger: true,
        condition: (job) => job.canCancel()
    },
    { 
        label: 'Retry Job', 
        action: 'retry-job', 
        icon: 'bi-arrow-clockwise',
        condition: (job) => job.canRetry()
    },
    { 
        label: 'Clone Job', 
        action: 'clone-job', 
        icon: 'bi-copy' 
    },
    { separator: true },
    { 
        label: 'Export Job Data', 
        action: 'export-job', 
        icon: 'bi-download' 
    }
];
```

### Batch Actions
```javascript
const jobBatchActions = [
    {
        label: 'Cancel Selected',
        action: 'batch-cancel',
        icon: 'bi-x-circle',
        class: 'btn-outline-danger'
    },
    {
        label: 'Retry Selected',
        action: 'batch-retry', 
        icon: 'bi-arrow-clockwise',
        class: 'btn-outline-primary'
    },
    {
        label: 'Export Selected',
        action: 'batch-export',
        icon: 'bi-download',
        class: 'btn-outline-secondary'
    }
];
```

## Job Details Dialog

### Layout
```
┌─────────────────────────────────────────────┐
│ Job Details - abc123...                  [×]│
├─────────────────────────────────────────────┤
│ ┌─Overview─┐ ┌─Payload─┐ ┌─Events─┐ ┌─Logs─┐│
│ │          │ │         │ │        │ │      ││
│ │ Status:  │ │ JSON    │ │Timeline│ │ Log  ││
│ │ Running  │ │ Data    │ │ Events │ │Lines ││
│ │          │ │         │ │        │ │      ││
│ │ Created: │ │ Pretty  │ │ State  │ │Error ││
│ │ 2 min ago│ │ Print   │ │ Change │ │ Msgs ││
│ │          │ │         │ │ History│ │      ││
│ └──────────┘ └─────────┘ └────────┘ └──────┘│
├─────────────────────────────────────────────┤
│ [Cancel] [Retry] [Clone] [Export]    [Close]│
└─────────────────────────────────────────────┘
```

### Features
- **Tabbed Interface**: Overview, Payload, Events Timeline, Logs
- **Real-time Updates**: Auto-refresh job status while dialog is open
- **Action Buttons**: Context-sensitive based on job status
- **Export Options**: JSON, formatted report, logs only

## System Health Monitoring

### Health Data from API
Using `/api/jobs/health` and `/api/jobs/health/{channel}` endpoints:

```javascript
// System-wide health from /api/jobs/health
const systemHealth = {
    overall_status: "healthy",
    total_jobs: 1250,
    active_runners: 3,
    channels: [
        { name: "emails", status: "healthy", pending: 5, running: 2 },
        { name: "reports", status: "healthy", pending: 0, running: 1 },
        { name: "cleanup", status: "warning", pending: 25, running: 0 }
    ]
};
```

### Health Display Components
- **System Status Badge**: Overall health indicator
- **Channel Status Cards**: Per-channel health from runners
- **Runner Status**: Active/inactive runner count
- **Queue Depth**: Warning if channels have high pending counts

## Runner Management

### Runners Table
```javascript
const runnerTableColumns = [
    { key: 'id', label: 'Runner ID', sortable: true },
    { key: 'hostname', label: 'Hostname', sortable: true },
    { key: 'status', label: 'Status', formatter: 'badge', sortable: true },
    { 
        key: 'channels', 
        label: 'Channels', 
        formatter: (channels) => channels.map(c => `<span class="badge bg-secondary me-1">${c}</span>`).join(''),
        sortable: false 
    },
    { key: 'max_workers', label: 'Max Workers', sortable: true },
    { key: 'current_jobs', label: 'Current Jobs', sortable: true },
    { 
        key: 'last_ping', 
        label: 'Last Ping', 
        formatter: 'relative',
        sortable: true 
    },
    { 
        key: 'uptime', 
        label: 'Uptime', 
        formatter: 'duration',
        sortable: true 
    }
];
```

### Runner Actions
- **Ping Runner**: Test connectivity
- **Pause/Resume**: Control job processing
- **Restart**: Graceful restart
- **View Logs**: Runner-specific logs
- **Remove**: Remove from system

## Scheduled Jobs Management

### Scheduled Jobs Table
```javascript
const scheduledJobTableColumns = [
    { key: 'id', label: 'Job ID', formatter: 'truncate_middle(12)', sortable: true },
    { key: 'func', label: 'Function', sortable: true },
    { key: 'channel', label: 'Channel', formatter: 'badge', sortable: true },
    { 
        key: 'run_at', 
        label: 'Scheduled For', 
        formatter: 'datetime',
        sortable: true 
    },
    { 
        key: 'delay', 
        label: 'Delay', 
        formatter: 'duration',
        sortable: true 
    },
    { 
        key: 'expires_at', 
        label: 'Expires', 
        formatter: 'datetime',
        sortable: true 
    },
    { key: 'created', label: 'Created', formatter: 'datetime', sortable: true }
];
```

## Job Publishing Interface

### Quick Publish Form
```
┌─────────────────────────────────────────────┐
│ Publish New Job                          [×]│
├─────────────────────────────────────────────┤
│ Function: [myapp.jobs.send_email        ▼] │
│ Channel:  [emails                       ▼] │
│                                             │
│ Payload (JSON):                             │
│ ┌─────────────────────────────────────────┐ │
│ │ {                                       │ │
│ │   "recipients": ["user@example.com"],   │ │
│ │   "subject": "Test Email",              │ │
│ │   "template": "welcome"                 │ │
│ │ }                                       │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ☐ Schedule for later                        │
│ Run At: [____________________] (optional)   │
│                                             │
│ Advanced Options:                           │
│ Max Retries: [3] Expires In: [900] seconds  │
│                                             │
├─────────────────────────────────────────────┤
│ [Validate JSON] [Save as Template] [Publish]│
└─────────────────────────────────────────────┘
```

### Features
- **Function Autocomplete**: Dropdown with available job functions
- **Channel Selection**: Active channels only
- **JSON Validation**: Real-time payload validation
- **Template System**: Save/load common job patterns
- **Scheduling Options**: Delay or specific time execution

## System Health Dashboard

### Health Indicators
```
System Status: ● Healthy
├─ Job Throughput: 45.2 jobs/min
├─ Success Rate: 98.5%
├─ Average Duration: 230ms
├─ Active Runners: 3/3
├─ Total Channels: 5
└─ Queue Health: All channels healthy

Recent Alerts: None
```

### Metrics Charts
- **Job Flow**: Published vs Completed over time
- **Error Rate**: Failed jobs percentage
- **Channel Performance**: Per-channel metrics
- **Runner Health**: Individual runner status

## Implementation Plan

### Phase 1: Core Models and Collections
```javascript
// src/models/Jobs.js
export { Job, JobList, JobForms } from './models/Job.js';
export { JobRunner, JobRunnerList, JobRunnerForms } from './models/JobRunner.js';
```

### Phase 2: Main Admin Page
```javascript
// src/admin/JobsAdminPage.js
class JobsAdminPage extends Page {
    async onInit() {
        // Initialize stats view
        this.jobStatsView = new JobStatsView();
        
        // Initialize health view  
        this.jobHealthView = new JobHealthView();
        
        // Initialize tabbed tables
        this.jobTablesView = new TabView({
            tabs: {
                'Jobs': new JobsTable(),
                'Runners': new RunnersTable(),
                'Scheduled': new ScheduledJobsTable()
            }
        });
    }
}
```

### Phase 3: Detail Views and Dialogs
```javascript
// src/admin/JobDetailsView.js
class JobDetailsView extends View {
    // Comprehensive job details with tabs
    // Real-time updates
    // Action buttons
}

// src/admin/JobPublishDialog.js  
class JobPublishDialog extends View {
    // Job publishing form
    // JSON validation
    // Template system
}
```

### Phase 4: Advanced Features
- Real-time WebSocket updates
- Advanced filtering and search
- Custom job templates
- Bulk operations
- Export/import functionality

## File Structure

```
src/
├── models/
│   ├── Job.js                  # Job model with OO actions
│   └── JobRunner.js            # Runner management model
├── admin/
│   ├── JobsAdminPage.js        # Main dashboard page
│   ├── JobDetailsView.js       # Job details dialog
│   ├── JobPublishDialog.js     # Job publishing interface
│   ├── views/
│   │   ├── JobStatsView.js     # Real-time stats cards
│   │   ├── JobHealthView.js    # System health monitoring
│   │   ├── JobsTable.js        # Main jobs table with channel filtering
│   │   ├── RunnersTable.js     # Runner management table
│   │   └── ScheduledJobsTable.js # Scheduled jobs table (jobs with run_at)
│   └── dialogs/
│       ├── JobCloneDialog.js   # Clone job with modifications
│       ├── JobRetryDialog.js   # Retry with delay options
│       └── JobTemplateDialog.js # Manage job templates
```

## UI/UX Design Principles

### Color Coding
- **Green**: Completed jobs, healthy systems
- **Blue**: Pending/queued jobs  
- **Yellow**: Running jobs, warnings
- **Red**: Failed jobs, errors
- **Gray**: Canceled/expired jobs

### Typography
- **Monospace**: Job IDs, function names, JSON data
- **Bold**: Status indicators, important metrics
- **Small**: Timestamps, metadata

### Spacing
- **Cards**: Consistent padding and margins
- **Tables**: Adequate row height and column spacing  
- **Dialogs**: Clear visual hierarchy

### Responsive Design
- **Mobile**: Simplified table views, stacked cards
- **Tablet**: Condensed layouts, priority columns
- **Desktop**: Full feature set, multi-column layouts

## Integration Points

### Permissions
- `view_jobs`: View jobs and basic operations
- `manage_jobs`: Full control including runner management
- `publish_jobs`: Create new jobs
- `cancel_jobs`: Cancel running jobs

### WebSocket Events (Future)
```javascript
// Real-time updates
ws.on('job:status_changed', (data) => {
    // Update job status in table
});

ws.on('system:health_changed', (data) => {
    // Update health indicators
});

ws.on('runner:status_changed', (data) => {
    // Update runner status
});
```

### Export Formats
- **CSV**: Table data export
- **JSON**: Full job data with metadata
- **PDF**: Formatted reports with charts
- **Excel**: Multi-sheet workbooks

## Testing Strategy

### Unit Tests
- Model methods and validations
- Data formatting and transformations
- API integration points

### Integration Tests  
- End-to-end job lifecycle
- Multi-user scenarios
- Permission enforcement

### Performance Tests
- Large dataset handling (10k+ jobs)
- Real-time update performance
- Memory usage monitoring

## Accessibility

### Keyboard Navigation
- Tab order through all interactive elements
- Arrow key navigation in tables
- Enter/Space for actions

### Screen Reader Support
- Semantic HTML structure
- ARIA labels and descriptions
- Status announcements

### Visual Accessibility
- High contrast colors
- Scalable fonts
- Clear visual hierarchy

## Security Considerations

### Data Protection
- Sensitive payload data masking
- Audit logging for all actions
- Rate limiting for API calls

### Access Control
- Role-based permissions
- Action-level authorization
- Secure job payload handling

## Performance Optimizations

### Data Loading
- Pagination for large datasets
- Lazy loading of job details
- Efficient filtering and sorting

### UI Responsiveness
- Virtual scrolling for large tables
- Debounced search inputs
- Optimized re-rendering

### Caching Strategy
- Client-side caching of job data
- Smart cache invalidation
- Offline capability for viewing

## Future Enhancements

### Phase 2 Features
- Job dependency visualization
- Custom dashboards and widgets
- Advanced analytics and reporting
- Job template marketplace

### Phase 3 Features
- Workflow designer (visual job chains)
- A/B testing for job configurations
- Machine learning job optimization
- Mobile application

This comprehensive design provides a solid foundation for building a powerful, user-friendly Jobs Admin interface that follows MOJO framework patterns while providing advanced job management capabilities.