# Jobs System REST API Documentation

## Overview

The Django-MOJO Jobs System provides a powerful distributed background job processing platform with REST APIs for publishing, monitoring, and managing asynchronous tasks. The system supports parallel execution, automatic retries, scheduled jobs, and comprehensive health monitoring.

### Key Features

- **Distributed Execution**: Jobs can run on any worker without pre-registration
- **Parallel Processing**: Thread pool execution for high throughput
- **Scheduled Jobs**: Delay execution or schedule for specific times
- **Automatic Retries**: Configurable retry logic with exponential backoff
- **Health Monitoring**: Real-time visibility into queue health and worker status
- **Job Cancellation**: Cooperative cancellation of running jobs
- **Broadcast Jobs**: Execute the same job on all workers
- **Object-Oriented Actions**: Use MojoModel POST_SAVE_ACTIONS for job operations

### Architecture

The jobs system consists of three main components:

1. **Job Publisher**: Web processes that create jobs
2. **Job Engine**: Worker processes that execute jobs
3. **Scheduler**: Moves scheduled jobs to execution queues

Jobs flow through the system:
```
Web Process → Publish → Redis Queue → Job Engine → Execute Function → Complete
                            ↑
                        Scheduler
```

## Authentication & Permissions

All jobs API endpoints require authentication via standard Django-MOJO auth. Different endpoints require different permissions:

- **Basic Operations**: Any authenticated user can publish and monitor their own jobs
- **`view_jobs`**: View all jobs and system health
- **`manage_jobs`**: Full control including job operations and runner management

## Base URL

All jobs endpoints are prefixed with `/api/jobs/`

---

## Job Operations (Object-Oriented Pattern)

The Jobs system follows Django-MOJO's object-oriented REST pattern using POST_SAVE_ACTIONS. This allows you to perform actions directly on Job objects through the standard CRUD interface.

### Job Model Actions

The Job model supports the following POST_SAVE_ACTIONS:
- `cancel_request`: Cancel a pending or running job
- `retry_request`: Retry a failed or cancelled job
- `get_status`: Get detailed job status
- `publish_job`: Create a new job using this job as a template

### Standard CRUD Operations

```http
GET /api/jobs/job
GET /api/jobs/job/<job_id>
POST /api/jobs/job/<job_id>
DELETE /api/jobs/job/<job_id>
```

All operations use the Job model's RestMeta configuration for permissions and graphs.

### Cancel a Job (OO Pattern)

Cancel a job using the object-oriented pattern:

```http
POST /api/jobs/job/<job_id>
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
    "cancel_request": true
}
```

**Response:**
```json
{
    "status": true,
    "message": "Job a1b2c3d4e5f6789012345678901234567 cancellation requested",
    "job_id": "a1b2c3d4e5f6789012345678901234567"
}
```

**Note:** Cancellation is cooperative - the job function must check `job.cancel_requested` and return early.

### Retry a Job (OO Pattern)

Retry a failed or cancelled job:

```http
POST /api/jobs/job/<job_id>
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body (immediate retry):**
```json
{
    "retry_request": true
}
```

**Request Body (delayed retry):**
```json
{
    "retry_request": {
        "retry": true,
        "delay": 60
    }
}
```

**Response:**
```json
{
    "status": true,
    "message": "Job retry scheduled",
    "original_job_id": "a1b2c3d4e5f6789012345678901234567",
    "new_job_id": "b2c3d4e5f67890123456789012345678",
    "delayed": true
}
```

### Get Job Status (OO Pattern)

Get detailed status including events and queue position:

```http
POST /api/jobs/job/<job_id>
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
    "get_status": true
}
```

**Response:**
```json
{
    "status": true,
    "data": {
        "id": "a1b2c3d4e5f6789012345678901234567",
        "status": "running",
        "channel": "emails",
        "func": "myapp.jobs.send_email",
        "created": "2024-01-15T10:45:00Z",
        "started_at": "2024-01-15T10:46:00Z",
        "finished_at": null,
        "attempt": 1,
        "max_retries": 3,
        "last_error": "",
        "metadata": {
            "emails_sent": 42
        },
        "runner_id": "worker-01-1234",
        "cancel_requested": false,
        "duration_ms": 0,
        "is_terminal": false,
        "is_retriable": true,
        "recent_events": [
            {
                "event": "created",
                "at": "2024-01-15T10:45:00Z",
                "runner_id": null,
                "details": {}
            },
            {
                "event": "running",
                "at": "2024-01-15T10:46:00Z",
                "runner_id": "worker-01-1234",
                "details": {}
            }
        ],
        "queue_position": null
    }
}
```

### Publish from Template (OO Pattern)

Create a new job using an existing job as a template:

```http
POST /api/jobs/job/<job_id>
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
    "publish_job": {
        "payload": {
            "recipients": ["new@example.com"],
            "subject": "Updated subject"
        },
        "delay": 300,
        "channel": "high_priority"
    }
}
```

**Response:**
```json
{
    "status": true,
    "message": "Job published successfully",
    "job_id": "c3d4e5f678901234567890123456789a",
    "template_job_id": "a1b2c3d4e5f6789012345678901234567"
}
```

---

## Direct API Endpoints

While the object-oriented pattern is preferred for consistency with Django-MOJO conventions, direct endpoints are also available for specific operations:

### Publish a New Job

```http
POST /api/jobs/publish
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
    "func": "myapp.jobs.send_email",
    "payload": {
        "recipients": ["user@example.com"],
        "subject": "Welcome",
        "template": "welcome_email"
    },
    "channel": "emails",
    "delay": 60,
    "max_retries": 3
}
```

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `func` | string | ✅ | Module path to job function (e.g., "myapp.jobs.process_data") |
| `payload` | object | ✅ | JSON data passed to the job function |
| `channel` | string | ❌ | Queue channel (default: "default") |
| `delay` | integer | ❌ | Delay in seconds before execution |
| `run_at` | string | ❌ | ISO datetime to run the job |
| `max_retries` | integer | ❌ | Maximum retry attempts (default: 3) |
| `expires_in` | integer | ❌ | Seconds until job expires (default: 900) |
| `expires_at` | string | ❌ | ISO datetime when job expires |
| `broadcast` | boolean | ❌ | If true, all workers execute the job |
| `max_exec_seconds` | integer | ❌ | Hard execution time limit |
| `idempotency_key` | string | ❌ | Key for exactly-once semantics |

### List Jobs

```http
GET /api/jobs/list?channel=emails&status=pending&limit=50
Authorization: Bearer <token>
```

**Query Parameters:**
- `channel`: Filter by channel name
- `status`: Filter by status (pending, running, completed, failed, canceled, expired)
- `since`: Jobs created after this ISO datetime
- `limit`: Maximum results (default: 100)

### Get Job Events

```http
GET /api/jobs/job/<job_id>/events
Authorization: Bearer <token>
```

---

## Health Monitoring

### Channel Health

Get comprehensive health metrics for a specific channel:

```http
GET /api/jobs/health/emails
Authorization: Bearer <token>
Permission: view_jobs or manage_jobs
```

**Response:**
```json
{
    "status": true,
    "data": {
        "channel": "emails",
        "status": "healthy",
        "messages": {
            "total": 150,
            "unclaimed": 10,
            "pending": 5,
            "scheduled": 25,
            "stuck": 0
        },
        "runners": {
            "active": 3,
            "total": 3
        },
        "stuck_jobs": [],
        "alerts": [],
        "metrics": {
            "jobs_per_minute": 45.2,
            "success_rate": 98.5,
            "avg_duration_ms": 230
        }
    }
}
```

### System Health Overview

```http
GET /api/jobs/health
Authorization: Bearer <token>
Permission: view_jobs or manage_jobs
```

### System Statistics

```http
GET /api/jobs/stats
Authorization: Bearer <token>
Permission: view_jobs or manage_jobs
```

---

## Runner Management

### List Active Runners

```http
GET /api/jobs/runners?channel=emails
Authorization: Bearer <token>
Permission: view_jobs or manage_jobs
```

### Ping Runner

```http
POST /api/jobs/runners/ping
Authorization: Bearer <token>
Permission: manage_jobs
Content-Type: application/json
```

**Request Body:**
```json
{
    "runner_id": "worker-01-1234",
    "timeout": 2.0
}
```

### Shutdown Runner

```http
POST /api/jobs/runners/shutdown
Authorization: Bearer <token>
Permission: manage_jobs
Content-Type: application/json
```

**Request Body:**
```json
{
    "runner_id": "worker-01-1234",
    "graceful": true
}
```

### Broadcast Command

```http
POST /api/jobs/runners/broadcast
Authorization: Bearer <token>
Permission: manage_jobs
Content-Type: application/json
```

**Request Body:**
```json
{
    "command": "status",
    "data": {},
    "timeout": 2.0
}
```

**Valid Commands:**
- `status`: Request status from all runners
- `shutdown`: Shutdown all runners
- `pause`: Pause job processing
- `resume`: Resume job processing
- `reload`: Reload configuration

---
