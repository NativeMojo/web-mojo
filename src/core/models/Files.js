
import Collection from '@core/Collection.js';
import Model from '@core/Model.js';
import FileUpload from '@core/services/FileUpload.js';
import {UserList} from '@core/models/User.js';
import {GroupList} from '@core/models/Group.js';
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
                name: 'use',
                type: 'text',
                label: 'Use',
                placeholder: 'Enter User or Leave Blank',
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
                name: 'use',
                type: 'text',
                label: 'Use',
                placeholder: 'Enter User or Leave Blank',
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
            },
            {
                name: 'is_public',
                type: 'switch',
                label: 'Is Public',
                default: true,
                cols: 6,
            }
        ],
    },

    owners: {
        fields: [
            {
                type: 'collection',
                name: 'group',
                label: 'Group (Owner)',
                Collection: GroupList,  // Collection class
                labelField: 'name',          // Field to display in dropdown
                valueField: 'id',            // Field to use as value
                maxItems: 10,                // Max items to show in dropdown
                placeholder: 'Search groups...',
                emptyFetch: false,
                debounceMs: 300,             // Search debounce delay
            },
            {
                type: 'collection',
                name: 'user',
                label: 'User (Owner)',
                Collection: UserList,  // Collection class
                labelField: 'display_name',          // Field to display in dropdown
                valueField: 'id',            // Field to use as value
                maxItems: 10,                // Max items to show in dropdown
                placeholder: 'Search users...',
                emptyFetch: false,
                debounceMs: 300,             // Search debounce delay
            },
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
     * Get the file's category. Prefers the backend-provided `category` field.
     * Falls back to inferring from `content_type` for locally constructed
     * models that haven't been saved yet. Returns 'other' if both are missing.
     * @returns {string} One of: image, video, audio, pdf, document, spreadsheet,
     *                  presentation, archive, other.
     */
    getCategory() {
        return this.get('category') || this._inferCategoryFromContentType();
    }

    /**
     * Infer category from content_type when the backend `category` field is
     * missing. Mirrors the backend mapping in
     * django-mojo/mojo/apps/fileman/renderer/utils.py CATEGORY_MAP.
     * @returns {string}
     * @private
     */
    _inferCategoryFromContentType() {
        const ct = (this.get('content_type') || '').toLowerCase();
        if (!ct) return 'other';
        if (ct.startsWith('image/')) return 'image';
        if (ct.startsWith('video/')) return 'video';
        if (ct.startsWith('audio/')) return 'audio';
        if (ct === 'application/pdf') return 'pdf';
        if (ct.startsWith('text/') ||
            ct === 'application/msword' ||
            ct.startsWith('application/vnd.openxmlformats-officedocument.wordprocessingml') ||
            ct === 'application/vnd.oasis.opendocument.text') return 'document';
        if (ct === 'application/vnd.ms-excel' ||
            ct.startsWith('application/vnd.openxmlformats-officedocument.spreadsheetml') ||
            ct === 'application/vnd.oasis.opendocument.spreadsheet') return 'spreadsheet';
        if (ct === 'application/vnd.ms-powerpoint' ||
            ct.startsWith('application/vnd.openxmlformats-officedocument.presentationml') ||
            ct === 'application/vnd.oasis.opendocument.presentation') return 'presentation';
        if (ct === 'application/zip' ||
            ct === 'application/x-rar-compressed' ||
            ct === 'application/x-7z-compressed' ||
            ct === 'application/x-tar' ||
            ct === 'application/gzip') return 'archive';
        return 'other';
    }

    /**
     * True if the file has at least one rendition.
     * @returns {boolean}
     */
    hasRenditions() {
        const r = this.get('renditions');
        return !!(r && Object.keys(r).length);
    }

    /**
     * True when the file upload is complete but the backend has not yet
     * produced any renditions. Renditions are generated asynchronously on the
     * `renditions` background channel, so an empty `renditions` map paired
     * with `upload_status === 'completed'` means "still processing".
     * @returns {boolean}
     */
    isRenditionsProcessing() {
        return this.get('upload_status') === 'completed' && !this.hasRenditions();
    }

    /**
     * Trigger a background rebuild of renditions.
     * See django-mojo fileman docs — POST to the file with
     * `{ action: 'regenerate_renditions' }` and optional `roles` (<=20).
     * Returns immediately; the map repopulates as the worker finishes.
     * @param {string[]} [roles] - Optional rendition roles to rebuild
     * @returns {Promise}
     */
    regenerateRenditions(roles) {
        const body = { action: 'regenerate_renditions' };
        if (Array.isArray(roles) && roles.length) body.roles = roles;
        return this.save(body);
    }

    /**
     * Get all renditions as an array. Backend returns renditions as a
     * role-keyed object; this normalizes to an array for easy iteration.
     * @returns {Array<object>}
     */
    getRenditions() {
        const r = this.get('renditions');
        return r ? Object.values(r) : [];
    }

    /**
     * Pick the best image rendition by pixel area (width * height).
     * Only considers renditions with an `image/*` content_type. Returns null
     * when no image rendition is available.
     * @returns {object|null}
     */
    getBestImageRendition() {
        const images = this.getRenditions().filter(
            r => r && typeof r.content_type === 'string' && r.content_type.startsWith('image/')
        );
        if (!images.length) return null;
        return images.reduce((best, current) => {
            const bestArea = (parseInt(best.width) || 0) * (parseInt(best.height) || 0);
            const currentArea = (parseInt(current.width) || 0) * (parseInt(current.height) || 0);
            return currentArea > bestArea ? current : best;
        });
    }

    /**
     * Get a URL suitable for a small preview/thumbnail. Prefers the explicit
     * `thumbnail` rendition, then falls back to the best available image
     * rendition. Returns null when no thumbnail-ish URL is available.
     * @returns {string|null}
     */
    getThumbnailUrl() {
        const renditions = this.get('renditions') || {};
        if (renditions.thumbnail && renditions.thumbnail.url) {
            return renditions.thumbnail.url;
        }
        const best = this.getBestImageRendition();
        return best ? best.url : null;
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
        title: 'Add File',
        fields: [

        ],
    },

    edit: {
        title: 'Edit File Backend',
        fields: [

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
