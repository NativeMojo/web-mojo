/**
 * StackTraceView - Display formatted and color-coded stack traces
 */

import View from '@core/View.js';

class StackTraceView extends View {
    constructor(options = {}) {
        super({
            className: 'stack-trace-view',
            ...options
        });

        this.stackTrace = options.stackTrace || '';
        
        this.template = `
            <div class="stack-trace-container p-3">
                <style>
                    .stack-trace-line {
                        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
                        font-size: 13px;
                        line-height: 1.6;
                        padding: 4px 8px;
                        margin: 0;
                        border-left: 3px solid transparent;
                    }
                    .stack-trace-line:hover {
                        background-color: rgba(0, 0, 0, 0.05);
                    }
                    .stack-trace-error {
                        color: #dc3545;
                        font-weight: 600;
                        border-left-color: #dc3545;
                        background-color: rgba(220, 53, 69, 0.05);
                    }
                    .stack-trace-file {
                        color: #0d6efd;
                        font-weight: 500;
                        border-left-color: #0d6efd;
                    }
                    .stack-trace-function {
                        color: #6610f2;
                        font-weight: 500;
                    }
                    .stack-trace-location {
                        color: #6c757d;
                        font-size: 12px;
                    }
                    .stack-trace-line-number {
                        color: #fd7e14;
                        font-weight: 600;
                    }
                    .stack-trace-context {
                        color: #495057;
                        background-color: rgba(0, 0, 0, 0.02);
                    }
                    .stack-trace-container {
                        background-color: #f8f9fa;
                        border: 1px solid #dee2e6;
                        border-radius: 0.375rem;
                        max-height: 600px;
                        overflow-y: auto;
                    }
                </style>
                <div class="stack-trace-content">
                    {{{formattedStackTrace}}}
                </div>
            </div>
        `;
    }

    async onBeforeRender() {
        this.formattedStackTrace = this.formatStackTrace(this.stackTrace);
    }

    formatStackTrace(stackTrace) {
        if (!stackTrace) {
            return '<div class="text-muted p-3">No stack trace available</div>';
        }

        // Convert to string if it's an object
        const traceStr = typeof stackTrace === 'string' ? stackTrace : JSON.stringify(stackTrace, null, 2);
        
        const lines = traceStr.split('\n');
        let html = '';

        lines.forEach((line, index) => {
            if (!line.trim()) {
                html += '<div class="stack-trace-line">&nbsp;</div>';
                return;
            }

            // Detect error message (usually the first line)
            if (index === 0 && (line.includes('Error:') || line.includes('Exception:'))) {
                html += `<div class="stack-trace-line stack-trace-error">${this.escapeHtml(line)}</div>`;
                return;
            }

            // Detect file paths with line numbers
            // Pattern: at functionName (file.js:123:45) or file.js:123:45
            const filePattern = /(.+?)\s*\(([^:]+):(\d+):(\d+)\)/;
            const simpleFilePattern = /^\s*at\s+([^:]+):(\d+):(\d+)/;
            
            let match = line.match(filePattern);
            if (match) {
                const [, funcName, filePath, lineNum, colNum] = match;
                html += `<div class="stack-trace-line stack-trace-file">
                    <span class="stack-trace-function">${this.escapeHtml(funcName.trim())}</span>
                    <span class="stack-trace-location"> (${this.escapeHtml(filePath)}:<span class="stack-trace-line-number">${lineNum}</span>:${colNum})</span>
                </div>`;
                return;
            }

            match = line.match(simpleFilePattern);
            if (match) {
                const [, filePath, lineNum, colNum] = match;
                html += `<div class="stack-trace-line stack-trace-file">
                    <span class="stack-trace-location">at ${this.escapeHtml(filePath)}:<span class="stack-trace-line-number">${lineNum}</span>:${colNum}</span>
                </div>`;
                return;
            }

            // Python-style stack trace: File "...", line X, in function
            const pythonPattern = /File\s+"([^"]+)",\s+line\s+(\d+),\s+in\s+(.+)/;
            match = line.match(pythonPattern);
            if (match) {
                const [, filePath, lineNum, funcName] = match;
                html += `<div class="stack-trace-line stack-trace-file">
                    <span class="stack-trace-location">File "${this.escapeHtml(filePath)}", line <span class="stack-trace-line-number">${lineNum}</span>, in </span>
                    <span class="stack-trace-function">${this.escapeHtml(funcName)}</span>
                </div>`;
                return;
            }

            // Check if line starts with "at " (stack frame indicator)
            if (line.trim().startsWith('at ')) {
                html += `<div class="stack-trace-line stack-trace-file">${this.escapeHtml(line)}</div>`;
                return;
            }

            // Default: context line
            html += `<div class="stack-trace-line stack-trace-context">${this.escapeHtml(line)}</div>`;
        });

        return html;
    }

    updateStackTrace(newStackTrace) {
        this.stackTrace = newStackTrace;
        this.render();
    }
}

export default StackTraceView;
