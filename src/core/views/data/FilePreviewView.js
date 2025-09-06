import View from '@core/View.js';

class FilePreviewView extends View {
    constructor(options = {}) {
        super({
            className: 'file-preview',
            ...options
        });
        this.file = options.file || {};
        this.isImage = this.file.content_type?.startsWith('image/');
        this.isPdf = this.file.content_type === 'application/pdf';
    }

    getTemplate() {
        return `
            <div class="file-preview-item card card-body p-2 mt-2">
                <div class="d-flex align-items-center">
                    <div class="flex-shrink-0">
                        ${this.isImage ? `<img src="${this.file.thumbnailUrl || this.file.url}" class="rounded" style="width: 40px; height: 40px; object-fit: cover;">` : `<i class="bi bi-file-earmark-text fs-2 text-secondary"></i>`}
                    </div>
                    <div class="flex-grow-1 ms-3">
                        <div class="fw-bold text-truncate">{{file.filename}}</div>
                        <div class="small text-muted">{{file.file_size|filesize}}</div>
                    </div>
                    <div class="flex-shrink-0">
                        <button class="btn btn-sm btn-outline-primary" data-action="view-file">View</button>
                    </div>
                </div>
            </div>
        `;
    }

    async onActionViewFile() {
        if (this.isImage) {
            // Check if lightbox extension is available
            const LightboxGallery = window.MOJO?.plugins?.LightboxGallery;
            
            if (LightboxGallery) {
                LightboxGallery.show({ src: this.file.url, alt: this.file.filename });
            } else {
                // Fallback: open in new tab
                window.open(this.file.url, '_blank');
            }
        } else if (this.isPdf) {
            // Check if lightbox extension is available
            const PDFViewer = window.MOJO?.plugins?.PDFViewer;
            
            if (PDFViewer) {
                PDFViewer.showDialog(this.file.url, { title: this.file.filename });
            } else {
                // Fallback: open in new tab
                window.open(this.file.url, '_blank');
            }
        } else {
            window.open(this.file.url, '_blank');
        }
    }
}

export default FilePreviewView;
