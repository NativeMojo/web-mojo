/**
 * S3BucketTablePage - S3 Bucket management using TablePage component
 * Clean implementation using TablePage with minimal overrides
 */

import TablePage from '@core/pages/TablePage.js';
import { S3BucketList, S3BucketForms } from '@core/models/AWS.js';

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

            // Toolbar
            showRefresh: true,
            showAdd: true,
            showExport: true,

            // Empty state
            emptyMessage: 'No S3 buckets found. Click "Add S3 Bucket" to create your first bucket.',

            // Batch actions
            batchBarLocation: 'top',
            batchActions: [
                { label: "Delete", icon: "bi bi-trash", action: "batch-delete" },
                { label: "Export", icon: "bi bi-download", action: "batch-export" },
                { label: "Make Public", icon: "bi bi-unlock", action: "batch-public" },
                { label: "Make Private", icon: "bi bi-lock", action: "batch-private" },
                { label: "Empty Bucket", icon: "bi bi-bucket", action: "batch-empty" }
            ],

            // Table display options
            tableOptions: {
                striped: true,
                bordered: false,
                hover: true,
                responsive: false
            }
        });
    }
}

export default S3BucketTablePage;