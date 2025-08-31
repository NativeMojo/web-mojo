/**
 * S3BucketTablePage - S3 Bucket management using TablePage component
 * Manages AWS S3 buckets and their configurations
 */

import TablePage from '../pages/TablePage.js';
import { S3Bucket, S3BucketList, S3BucketForms } from '../models/AWS.js';

class S3BucketTablePage extends TablePage {
    constructor(options = {}) {
        super({
            ...options,
            name: 'admin_s3_buckets',
            pageName: 'Manage S3 Buckets',
            router: "admin/s3-buckets",
            Collection: S3BucketList,
            formCreate: S3BucketForms.create,
            formEdit: S3BucketForms.edit,

            // Column definitions
            columns: [
                {
                    key: 'id',
                    label: 'ID',
                    width: '60px',
                    sortable: true,
                    class: 'text-muted'
                },
                {
                    key: 'name',
                    label: 'Bucket Name',
                    sortable: true
                },
                {
                    key: 'created',
                    label: 'Created',
                    formatter: "epoch|datetime"
                }
            ],

            // Table features
            selectable: true,
            searchable: true,
            sortable: true,
            filterable: true,
            paginated: true,

            // TablePage toolbar
            showRefresh: true,
            showAdd: true,
            showExport: true,

            // Table options
            tableOptions: {
                pageSizes: [5, 10, 25, 50],
                defaultPageSize: 10,
                emptyMessage: 'No S3 buckets found. Click "Add S3 Bucket" to create your first bucket.',
                emptyIcon: 'bi-bucket',
                actions: ["edit", "view", "delete"],
                batchActions: [
                    { label: "Delete", icon: "bi bi-trash", action: "batch_delete" },
                    { label: "Export", icon: "bi bi-download", action: "batch_export" },
                    { label: "Make Public", icon: "bi bi-unlock", action: "batch_public" },
                    { label: "Make Private", icon: "bi bi-lock", action: "batch_private" },
                    { label: "Empty Bucket", icon: "bi bi-bucket", action: "batch_empty" }
                ],
            }
        });
    }
}

export default S3BucketTablePage;
