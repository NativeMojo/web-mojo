/**
 * MOJO Framework Enhanced Development Server
 * Features: Live Reload, File Watching, CORS, Static Serving
 */

const express = require('express');
const path = require('path');
const chokidar = require('chokidar');
const { exec } = require('child_process');
const WebSocket = require('ws');

const app = express();
const PORT = process.env.PORT || 3001;
const WS_PORT = PORT + 1;

// Store WebSocket connections for live reload
let wsClients = [];

// Request logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`📡 [${timestamp}] ${req.method} ${req.url}`);
    next();
});

// CORS headers for development
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// Set proper MIME types
app.use((req, res, next) => {
    if (req.url.endsWith('.js')) {
        res.type('application/javascript');
    } else if (req.url.endsWith('.css')) {
        res.type('text/css');
    } else if (req.url.endsWith('.json')) {
        res.type('application/json');
    }
    next();
});

// Inject live reload script into HTML files
app.use((req, res, next) => {
    if (req.url.endsWith('.html') || req.url.endsWith('/')) {
        const originalSend = res.send;
        res.send = function(body) {
            if (typeof body === 'string' && (body.includes('</body>') || body.includes('</html>'))) {
                const liveReloadScript = `
                    <script>
                        (function() {
                            console.log('🔥 MOJO Live Reload - Connecting...');
                            const ws = new WebSocket('ws://localhost:${WS_PORT}');
                            
                            ws.onopen = function() {
                                console.log('🟢 Live Reload Connected');
                            };
                            
                            ws.onmessage = function(event) {
                                console.log('🔄 File changed - Reloading...');
                                setTimeout(() => {
                                    location.reload();
                                }, 100);
                            };
                            
                            ws.onclose = function() {
                                console.log('🔴 Live Reload Disconnected');
                            };
                            
                            ws.onerror = function(error) {
                                console.log('❌ Live Reload Error:', error);
                            };
                        })();
                    </script>
                `;
                
                if (body.includes('</body>')) {
                    body = body.replace('</body>', liveReloadScript + '</body>');
                } else if (body.includes('</html>')) {
                    body = body.replace('</html>', liveReloadScript + '</html>');
                }
            }
            originalSend.call(this, body);
        };
    }
    next();
});

// Serve static files from multiple locations
app.use(express.static(__dirname, {
    index: ['index.html'],
    dotfiles: 'ignore'
}));

// Handle SPA routing - serve index.html for directories
app.use((req, res, next) => {
    if (req.url.endsWith('/') && req.url !== '/') {
        const indexPath = path.join(__dirname, req.url, 'index.html');
        res.sendFile(indexPath, (err) => {
            if (err) {
                next();
            }
        });
    } else {
        next();
    }
});

// API endpoint for development status
app.get('/dev/status', (req, res) => {
    res.json({
        status: 'running',
        mode: 'development',
        timestamp: new Date().toISOString(),
        port: PORT,
        wsPort: WS_PORT,
        connectedClients: wsClients.length,
        watchedFiles: watcher ? watcher.getWatched() : {}
    });
});

// 404 handler with helpful information
app.use((req, res) => {
    console.log(`❌ 404 - File not found: ${req.url}`);
    res.status(404).send(`
        <!DOCTYPE html>
        <html>
            <head>
                <title>404 - Not Found | MOJO Dev Server</title>
                <style>
                    body { 
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                        text-align: center; 
                        padding: 50px; 
                        background: #f8f9fa;
                        color: #333;
                    }
                    .container { max-width: 600px; margin: 0 auto; }
                    h1 { color: #dc3545; margin-bottom: 20px; }
                    .path { 
                        background: #e9ecef; 
                        padding: 10px; 
                        border-radius: 5px; 
                        font-family: monospace; 
                        margin: 20px 0;
                    }
                    .links { margin: 30px 0; }
                    .links a { 
                        display: inline-block;
                        margin: 10px 15px;
                        padding: 10px 20px;
                        background: #007bff; 
                        color: white; 
                        text-decoration: none; 
                        border-radius: 5px;
                        transition: background-color 0.3s;
                    }
                    .links a:hover { background: #0056b3; }
                    .status { 
                        background: #d4edda; 
                        border: 1px solid #c3e6cb; 
                        color: #155724; 
                        padding: 15px; 
                        border-radius: 5px; 
                        margin: 20px 0;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>🔍 Page Not Found</h1>
                    <p>The requested file was not found:</p>
                    <div class="path">${req.url}</div>
                    
                    <div class="status">
                        🔥 <strong>MOJO Development Server</strong> is running<br>
                        Live Reload: <span style="color: #28a745;">Active</span>
                    </div>
                    
                    <div class="links">
                        <a href="/examples/">📚 View Examples</a>
                        <a href="/examples/phase2-basic/">🚀 Phase 2 Demo</a>
                        <a href="/dist/">📦 Built Files</a>
                        <a href="/dev/status">🔧 Dev Status</a>
                    </div>
                    
                    <p style="color: #666; font-size: 14px;">
                        Server running on port ${PORT} | Live reload on port ${WS_PORT}
                    </p>
                </div>
            </body>
        </html>
    `);
});

// Start HTTP server
const server = app.listen(PORT, () => {
    console.log(`
🔥 MOJO Enhanced Development Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 Server URL:     http://localhost:${PORT}
📚 Examples:       http://localhost:${PORT}/examples/
🚀 Phase 2 Demo:   http://localhost:${PORT}/examples/phase2-basic/
📦 Built Files:    http://localhost:${PORT}/dist/
🔧 Dev Status:     http://localhost:${PORT}/dev/status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ Features: Live Reload, File Watching, CORS
👀 Watching: src/, examples/, dist/
🔌 WebSocket: Port ${WS_PORT}

Press Ctrl+C to stop
    `);
});

// WebSocket server for live reload
const wss = new WebSocket.Server({ 
    port: WS_PORT,
    perMessageDeflate: false
});

wss.on('connection', (ws) => {
    wsClients.push(ws);
    console.log(`🔌 Live Reload client connected (${wsClients.length} total)`);
    
    ws.on('close', () => {
        wsClients = wsClients.filter(client => client !== ws);
        console.log(`🔌 Live Reload client disconnected (${wsClients.length} total)`);
    });
    
    ws.on('error', (error) => {
        console.log('⚠️  WebSocket error:', error.message);
    });
});

// File watcher setup
const watcher = chokidar.watch([
    'src/**/*',
    'examples/**/*',
    'dist/**/*',
    '*.html',
    '*.js',
    '*.css'
], {
    ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/*.map',
        '**/package-lock.json'
    ],
    persistent: true,
    ignoreInitial: true
});

let reloadTimeout;

watcher.on('change', (filepath) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`📝 [${timestamp}] File changed: ${path.relative(__dirname, filepath)}`);
    
    // Debounce rapid changes
    clearTimeout(reloadTimeout);
    reloadTimeout = setTimeout(() => {
        // Notify all connected clients
        const activeClients = wsClients.filter(ws => ws.readyState === WebSocket.OPEN);
        activeClients.forEach(ws => {
            try {
                ws.send(JSON.stringify({
                    type: 'reload',
                    file: filepath,
                    timestamp: Date.now()
                }));
            } catch (err) {
                console.log('⚠️  Error sending reload signal:', err.message);
            }
        });
        
        if (activeClients.length > 0) {
            console.log(`🔄 Sent reload signal to ${activeClients.length} client(s)`);
        }
    }, 200);
});

watcher.on('add', (filepath) => {
    console.log(`➕ File added: ${path.relative(__dirname, filepath)}`);
});

watcher.on('unlink', (filepath) => {
    console.log(`➖ File removed: ${path.relative(__dirname, filepath)}`);
});

watcher.on('error', error => {
    console.log('⚠️  Watcher error:', error);
});

console.log('👀 File watcher started...');

// Handle server errors
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.log(`❌ Port ${PORT} is already in use`);
        console.log(`💡 Try: PORT=3002 node serve-dev.js`);
        process.exit(1);
    } else {
        console.error('❌ Server error:', err);
    }
});

// Handle WebSocket server errors
wss.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.log(`❌ WebSocket port ${WS_PORT} is already in use`);
        console.log(`💡 WebSocket server failed to start - live reload disabled`);
    } else {
        console.error('❌ WebSocket error:', err);
    }
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down MOJO Development Server...');
    
    // Close WebSocket connections
    wsClients.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.close();
        }
    });
    
    // Close servers
    wss.close();
    server.close(() => {
        console.log('✅ Development server stopped');
        process.exit(0);
    });
    
    // Force exit after 5 seconds
    setTimeout(() => {
        console.log('⚠️  Forcing exit...');
        process.exit(1);
    }, 5000);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('💥 Uncaught Exception:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});