/**
 * MOJO Framework Examples Server
 * Simple development server to run examples with proper file access
 */

const express = require('express');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3001;

// Request logging middleware
app.use((req, res, next) => {
    console.log(`📡 ${req.method} ${req.url}`);
    next();
});

// Add CORS headers for development
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// Set proper MIME type for JavaScript modules
app.use((req, res, next) => {
    if (req.url.endsWith('.js')) {
        res.type('application/javascript');
    }
    next();
});

// Serve static files from project root with directory browsing
app.use(express.static(__dirname, {
    index: ['index.html']
}));

// Log static file serving
app.use((req, res, next) => {
    console.log(`🔍 Checking for static file: ${path.join(__dirname, req.url)}`);
    next();
});

// Handle SPA routing - if no file found, try to serve index.html from that directory
app.use((req, res, next) => {
    if (req.url.endsWith('/') && req.url !== '/') {
        const indexPath = path.join(__dirname, req.url, 'index.html');
        console.log(`📁 Trying to serve directory index: ${indexPath}`);
        res.sendFile(indexPath, (err) => {
            if (err) {
                console.log(`❌ Directory index not found: ${err.message}`);
                next();
            } else {
                console.log(`✅ Served directory index: ${indexPath}`);
            }
        });
    } else {
        next();
    }
});



// 404 handler
app.use((req, res) => {
    console.log(`❌ 404 - File not found: ${req.url}`);
    console.log(`🔍 Looked in: ${path.join(__dirname, req.url)}`);
    res.status(404).send(`
        <html>
            <head>
                <title>404 - Not Found</title>
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                    h1 { color: #dc3545; }
                    a { color: #007bff; text-decoration: none; }
                    a:hover { text-decoration: underline; }
                </style>
            </head>
            <body>
                <h1>404 - Page Not Found</h1>
                <p>The requested file <code>${req.url}</code> was not found.</p>
                <p><a href="/examples/">← Back to Examples</a></p>
            </body>
        </html>
    `);
});

// Start server
const server = app.listen(PORT, () => {
    console.log(`
🔥 MOJO Framework Examples Server
🌐 Server running at: http://localhost:${PORT}
📚 Examples index: http://localhost:${PORT}/examples/
📁 Project root: ${__dirname}

Available Examples:
• Basic Example: http://localhost:${PORT}/examples/basic/
• Hierarchy Example: http://localhost:${PORT}/examples/hierarchy/
• Events Example: http://localhost:${PORT}/examples/events/
• Complete Demo: http://localhost:${PORT}/examples/complete-demo/

Press Ctrl+C to stop the server
    `);

    // Try to open browser (non-blocking)
    const openUrl = `http://localhost:${PORT}/examples/`;
    const command = process.platform === 'darwin' ? 'open' : 
                   process.platform === 'win32' ? 'start' : 'xdg-open';
    
    setTimeout(() => {
        exec(`${command} ${openUrl}`, (error) => {
            if (error) {
                console.log('💡 Tip: Open your browser and visit:', openUrl);
            } else {
                console.log('🚀 Browser opened');
            }
        });
    }, 1000);
});

// Handle server errors
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.log(`❌ Port ${PORT} is already in use`);
        console.log(`💡 Try a different port: PORT=3002 npm run examples`);
        process.exit(1);
    } else {
        console.error('Server error:', err);
    }
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down MOJO Examples Server...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});