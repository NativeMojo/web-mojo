
import Collection from '../core/Collection.js';
import Model from '../core/Model.js';

/* =========================
 * Model
 * ========================= */
class S3Bucket extends Model {
    constructor(data = {}) {
        super(data, {
            endpoint: '/api/aws/s3/bucket',
        });
    }
}

/* =========================
 * Collection
 * ========================= */
class S3BucketList extends Collection {
    constructor(options = {}) {
        super(S3Bucket, {
            endpoint: '/api/aws/s3/bucket',
            size: 10,
            ...options,
        });
    }
}

/* =========================
 * Forms
 * ========================= */
const S3BucketForms = {
    create: {
        title: 'Add S3 Bucket',
        fields: [
            {
                name: 'bucket_name',
                type: 'text',
                label: 'Name',
                placeholder: 'bucket name',
                help: 'Enter a universally unique name for the bucket',
                required: true,
                cols: 12,
            },
            {
                name: 'is_public',
                type: 'switch',
                label: 'Is Public',
                cols: 12,
            },
        ],
    },

    // Provide an edit form even though legacy only had ADD_FORM
    edit: {
        title: 'Edit S3 Bucket',
        fields: [
            {
                name: 'bucket_name',
                type: 'text',
                label: 'Name',
                placeholder: 'bucket name',
                help: 'Enter a universally unique name for the bucket',
                required: true,
                cols: 12,
            },
            {
                name: 'is_public',
                type: 'switch',
                label: 'Is Public',
                cols: 12,
            },
        ],
    },
};

export { S3Bucket, S3BucketList, S3BucketForms };
