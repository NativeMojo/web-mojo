
import Collection from '../core/Collection.js';
import Model from '../core/Model.js';

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
        super(FileManager, {
            endpoint: '/api/fileman/manager',
            size: 20,
            ...options,
        });
    }
}

const FileManagerForms = {
    create: {
        title: 'Add Storage Backend',
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
                name: 'settings',
                type: 'textarea',
                label: 'Settings (JSON)',
                default: '{\n\t"aws_key": "xxx",\n\t"aws_secret": "xxx",\n\t"aws_region": "xxx"\n}',
                rows: 10,
                cols: 12,
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
                placeholder: 'Enter Backend URL (s3://<bucket_name>/<optional folder>)',
                help: 'Format: <service>://<path>. Valid services: s3, gcs, azure, local',
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
                name: 'settings',
                type: 'textarea',
                label: 'Settings (JSON)',
                rows: 10,
                cols: 12,
            },
        ],
    },
};

/* =========================
 * File
 * ========================= */
class File extends Model {
    static LARGE_UPLOAD_BYTES = 2_000_000_000; // 2GB, same as legacy

    constructor(data = {}) {
        super(data, {
            endpoint: '/api/fileman/file',
        });
    }

    /**
     * Initiate direct upload and return { id, upload_url }
     * Mirrors legacy /api/fileman/upload/initiate
     */
    async requestUploadInit({ name, file, group, description }) {
        const payload = {
            filename: name || file?.name,
            file_size: file?.size,
            content_type: file?.type,
        };
        if (group) payload.group = group;
        if (description) payload.description = description;

        const res = await fetch('/api/fileman/upload/initiate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok || json?.error) {
            throw new Error(json?.error || 'Upload initiation failed');
        }
        // set model id so later PATCH/complete hits the correct resource
        if (json?.data?.id) this.set('id', json.data.id);
        return json.data; // { id, upload_url }
    }

    /**
     * PUT the file to the signed URL with progress callback
     * Note: using XHR for progress, same spirit as legacy
     */
    async putToSignedUrl(uploadUrl, file, onProgress) {
        await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('PUT', uploadUrl);
            xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`)));
            xhr.onerror = () => reject(new Error('Network error during upload'));
            if (xhr.upload && typeof onProgress === 'function') {
                xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable) onProgress(event.loaded / event.total);
                };
            }
            xhr.send(file);
        });
    }

    /**
     * Override save to support large direct-upload flow like legacy:
     * - If __mpf present and file bigger than LARGE_UPLOAD_BYTES:
     *   1) initiate upload -> get signed URL
     *   2) PUT file to signed URL
     *   3) PATCH model with { action: "mark_as_completed" }
     * - else fall back to normal save (this.post/patch in Model)
     */
    async save(data = {}, opts = {}) {
        const maybeFile = data?.__mpf?.get?.('media');
        if (maybeFile && maybeFile.size > File.LARGE_UPLOAD_BYTES) {
            // Step 1: initiate
            const meta = {
                name: data.name,
                file: maybeFile,
                group: data.group,
                description: data.description,
            };
            const { upload_url } = await this.requestUploadInit(meta);

            // Step 2: upload to signed URL
            await this.putToSignedUrl(upload_url, maybeFile, opts.onProgress);

            // Step 3: mark complete
            return super.save({ action: 'mark_as_completed' }, opts);
        }

        // Regular model save path (metadata and/or small files stored via API)
        return super.save(data, opts);
    }
}

class FileList extends Collection {
    constructor(options = {}) {
        super(File, {
            endpoint: '/api/fileman/file',
            size: 20,
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
