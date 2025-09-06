
import Collection from '@core/Collection.js';
import Model from '@core/Model.js';
import FileUpload from '@core/services/FileUpload.js';
import {UserList} from './User.js';
import {GroupList} from './Group.js';
/* =========================
 * FileManager
 * ========================= */
class FileManager extends Model {
    constructor(data = {}) {
        super(data, {
            endpoint: '/api/fileman/manager',
        });
    }
}

class FileManagerList extends Collection {
    constructor(options = {}) {
        super({
            ModelClass: FileManager,
            endpoint: '/api/fileman/manager',
            size: 10,
            ...options,
        });
    }
}

const FileManagerForms = {
    create: {
        title: 'Add Storage Backend',
        fields: [
            {
                name: 'name',
                type: 'text',
                label: 'Display Name',
                placeholder: 'Enter Display Name',
                cols: 12,
            },
            {
                name: 'backend_url',
                type: 'text',
                label: 'Backend URL',
                required: true,
                value: "s3://BUCKET_NAME/OPTION_FOLDER",
                placeholder: 's3://bucket_name/optional folder',
                help: 'Format: service://path. Valid services: s3',
                cols: 12,
            },
            {
                name: 'aws_region',
                type: 'select',
                label: 'AWS Region (optional)',
                value: 'us-east-1',
                options: [
                    { value: '', text: 'System Default' },
                    { value: 'us-east-1', text: 'US East (N. Virginia)' },
                    { value: 'us-east-2', text: 'US East (Ohio)' },
                    { value: 'us-west-1', text: 'US West (N. California)' },
                    { value: 'us-west-2', text: 'US West (Oregon)' },
                    { value: 'ca-central-1', text: 'Canada (Central)' },
                    { value: 'eu-west-1', text: 'Europe (Ireland)' },
                    { value: 'eu-west-2', text: 'Europe (London)' },
                    { value: 'eu-west-3', text: 'Europe (Paris)' },
                    { value: 'eu-central-1', text: 'Europe (Frankfurt)' },
                    { value: 'eu-north-1', text: 'Europe (Stockholm)' },
                    { value: 'eu-south-1', text: 'Europe (Milan)' },
                    { value: 'ap-southeast-2', text: 'Asia Pacific (Sydney)' }
                ],
                columns: 12,
                help: 'Optional. Defaults to project AWS_REGION if omitted.'
            },
            {
                name: 'aws_key',
                type: 'text',
                label: 'AWS Key (optional)',
                placeholder: 'enter your AWS Key with S3 permissions',
                columns: 12,
                help: 'Optional, AWS Key with S3 permissions'
            },
            {
                name: 'aws_secret',
                type: 'text',
                label: 'AWS Secret (optional)',
                placeholder: 'enter your AWS Secret with S3 permissions',
                columns: 12,
                help: 'Optional, AWS Secret with S3 permissions'
            },
            {
                name: 'is_default',
                type: 'switch',
                label: 'Is Default',
                cols: 6,
            },
            {
                name: 'is_active',
                type: 'switch',
                label: 'Is Active',
                default: true,
                cols: 6,
            },
        ],
    },

    edit: {
        title: 'Edit Storage Backend',
        fields: [
            {
                name: 'name',
                type: 'text',
                label: 'Display Name',
                placeholder: 'Enter Display Name',
                cols: 12,
            },
            {
                name: 'backend_url',
                type: 'text',
                label: 'Backend URL',
                required: true,
                placeholder: 's3://bucket_name/optional folder',
                help: 'Format: service://path. Valid services: s3',
                cols: 12,
            },
            {
                name: 'allowed_origins',
                type: 'text',
                label: 'Domains Who Can Upload',
                cols: 12,
            },
            {
                name: 'is_default',
                type: 'switch',
                label: 'Is Default',
                cols: 6,
            },
            {
                name: 'is_active',
                type: 'switch',
                label: 'Is Active',
                default: true,
                cols: 6,
            }
        ],
    },

    owners: {
        fields: [
            {
                name: 'owner_id',
                type: 'text',
                label: 'Owner ID',
                required: true,
                placeholder: 'Enter owner ID',
                help: 'Enter the owner ID',
                cols: 12,
            },
            {
                name: 'owner_name',
                type: 'text',
                label: 'Owner Name',
                required: true,
                placeholder: 'Enter owner name',
                help: 'Enter the owner name',
                cols: 12,
            }
        ],
    },

    credentials: {
        fields: [
            {
                name: 'aws_region',
                type: 'select',
                label: 'AWS Region (optional)',
                value: 'us-east-1',
                options: [
                    { value: '', text: 'System Default' },
                    { value: 'us-east-1', text: 'US East (N. Virginia)' },
                    { value: 'us-east-2', text: 'US East (Ohio)' },
                    { value: 'us-west-1', text: 'US West (N. California)' },
                    { value: 'us-west-2', text: 'US West (Oregon)' },
                    { value: 'ca-central-1', text: 'Canada (Central)' },
                    { value: 'eu-west-1', text: 'Europe (Ireland)' },
                    { value: 'eu-west-2', text: 'Europe (London)' },
                    { value: 'eu-west-3', text: 'Europe (Paris)' },
                    { value: 'eu-central-1', text: 'Europe (Frankfurt)' },
                    { value: 'eu-north-1', text: 'Europe (Stockholm)' },
                    { value: 'eu-south-1', text: 'Europe (Milan)' },
                    { value: 'ap-southeast-2', text: 'Asia Pacific (Sydney)' }
                ],
                columns: 12,
                help: 'Optional. Defaults to project AWS_REGION if omitted.'
            },
            {
                name: 'aws_key',
                type: 'text',
                label: 'AWS Key (optional)',
                placeholder: 'enter your AWS Key with S3 permissions',
                columns: 12,
                help: 'Optional, AWS Key with S3 permissions'
            },
            {
                name: 'aws_secret',
                type: 'text',
                label: 'AWS Secret (optional)',
                placeholder: 'enter your AWS Secret with S3 permissions',
                columns: 12,
                help: 'Optional, AWS Secret with S3 permissions'
            },
        ]
    }
};

/* =========================
 * File
 * ========================= */
class File extends Model {
    constructor(data = {}) {
        super(data, {
            endpoint: '/api/fileman/file',
        });
    }

    isImage() {
        return this.get("category") === 'image';
    }

    /**
     * Upload file with progress tracking and UI integration
     * Returns a FileUpload instance with promise interface and cancellation support
     *
     * @param {object} options - Upload configuration
     * @param {File} options.file - File object to upload
     * @param {string} options.name - Custom filename (optional)
     * @param {string} options.group - File group/category (optional)
     * @param {string} options.description - File description (optional)
     * @param {function} options.onProgress - Progress callback ({ progress, loaded, total, percentage })
     * @param {function} options.onComplete - Success callback
     * @param {function} options.onError - Error callback
     * @param {boolean} options.showToast - Show progress toast (default: true)
     * @returns {FileUpload} Upload instance with promise interface
     */
    upload(options = {}) {
        return new FileUpload(this, options);
    }
}

class FileList extends Collection {
    constructor(options = {}) {
        super({
            ModelClass: File,
            endpoint: '/api/fileman/file',
            size: 10,
            ...options,
        });
    }
}

const FileForms = {
    create: {
        title: 'Add File Backend',
        fields: [
            {
                name: 'backend_url',
                type: 'text',
                label: 'Backend URL',
                required: true,
                placeholder: 's3://<bucket_name>/<optional folder>',
                help: 'Format: <service>://<path>. Valid services: s3, gcs, azure, local',
                cols: 12,
            },
            {
                name: 'settings',
                type: 'textarea',
                label: 'Settings (JSON)',
                default: '{\n\t"aws_key": "value",\n\t"aws_secret": "value2",\n\t"aws_region": "value3"\n}',
                rows: 10,
                cols: 12,
            },
        ],
    },

    edit: {
        title: 'Edit File Backend',
        fields: [
            {
                name: 'name',
                type: 'text',
                label: 'Display Name',
                placeholder: 'Enter Display Name',
                cols: 12,
            },
            {
                name: 'backend_url',
                type: 'text',
                label: 'Backend URL',
                placeholder: 'Enter Backend URL (s3://<bucket_name>/<optional folder>)',
                help: 'Format: <service>://<path>. Valid services: s3, gcs, azure, local',
                cols: 12,
            },
            {
                name: 'settings',
                type: 'textarea',
                label: 'Settings (JSON)',
                rows: 10,
                cols: 12,
            },
        ],
    },
};

export {
    FileManager,
    FileManagerList,
    FileManagerForms,
    File,
    FileList,
    FileForms,
};
