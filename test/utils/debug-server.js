#!/usr/bin/env node

/**
 * MOJO Framework Debug Server
 * A Node.js server for debugging the built MOJO framework
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const chokidar = require('chokidar');

const app = express();
const PORT = process.env.PORT || 3001;
const DIST_DIR = path.join(__dirname, 'dist');
const SRC_DIR = path.join(__dirname, 'src');

// Middleware for logging all requests
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} - ${req.method} ${req.url}`);
    
    // Log request headers for debugging
    if (req.url.endsWith('.js') || req.url.endsWith('.css')) {
        console.log(`  Headers:`, {
            'user-agent': req.get('user-agent'),
            'accept': req.get('accept'),
            'cache-control': req.get('cache-control')
        });
    }
    
    next();
});

// Add CORS headers for development
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
    }
    
    next();
});

// Serve static files from dist directory
app.use(express.static(DIST_DIR, {
    setHeaders: (res, filePath) => {
        // Set appropriate headers for JavaScript files
        if (filePath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        }
        
        // Disable caching for development
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
}));

// Debug API endpoints
app.get('/debug/info', (req, res) => {
    const info = {
        server: {
            port: PORT,
            distDir: DIST_DIR,
            srcDir: SRC_DIR,
            uptime: process.uptime(),
            nodeVersion: process.version,
            platform: process.platform
        },
        files: {
            dist: getDirectoryContents(DIST_DIR),
            src: getDirectoryContents(SRC_DIR)
        },
        build: getBuildInfo()
    };
    
    res.json(info);
});

app.get('/debug/logs', (req, res) => {
    res.json({
        message: 'Check server console for detailed logs',
        timestamp: new Date().toISOString()
    });
});

app.get('/debug/rebuild', (req, res) => {
    console.log('🔄 Rebuilding project...');
    
    exec('npm run build', { cwd: __dirname }, (error, stdout, stderr) => {
        if (error) {
            console.error('❌ Build failed:', error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                stderr: stderr
            });
            return;
        }
        
        console.log('✅ Build successful');
        console.log('Build output:', stdout);
        
        res.json({
            success: true,
            output: stdout,
            timestamp: new Date().toISOString()
        });
    });
});

app.get('/debug/file/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(DIST_DIR, filename);
    
    if (!fs.existsSync(filePath)) {
        res.status(404).json({
            error: 'File not found',
            path: filePath
        });
        return;
    }
    
    const stats = fs.statSync(filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    
    res.json({
        filename,
        path: filePath,
        size: stats.size,
        modified: stats.mtime,
        content: filename.endsWith('.js') ? content.substring(0, 1000) + '...' : content
    });
});

// Catch-all handler to serve index.html for SPA routes
app.get('*', (req, res) => {
    const indexPath = path.join(DIST_DIR, 'index.html');
    
    if (fs.existsSync(indexPath)) {
        console.log(`📄 Serving index.html for route: ${req.url}`);
        res.sendFile(indexPath);
    } else {
        console.error(`❌ index.html not found at: ${indexPath}`);
        res.status(404).send(`
            <html>
                <head><title>MOJO Debug Server - File Not Found</title></head>
                <body>
                    <h1>File Not Found</h1>
                    <p>Could not find index.html at: <code>${indexPath}</code></p>
                    <p>Try running <code>npm run build</code> first.</p>
                    <h2>Debug Info:</h2>
                    <ul>
                        <li>Requested URL: ${req.url}</li>
                        <li>Dist Directory: ${DIST_DIR}</li>
                        <li>Dist Exists: ${fs.existsSync(DIST_DIR)}</li>
                    </ul>
                </body>
            </html>
        `);
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('❌ Server Error:', error);
    res.status(500).json({
        error: 'Internal Server Error',
        message: error.message,
        stack: error.stack
    });
});

// Utility functions
function getDirectoryContents(dir) {
    if (!fs.existsSync(dir)) {
        return { error: 'Directory does not exist', path: dir };
    }
    
    try {
        const files = fs.readdirSync(dir, { withFileTypes: true });
        return files.map(file => ({
            name: file.name,
            type: file.isDirectory() ? 'directory' : 'file',
            size: file.isFile() ? fs.statSync(path.join(dir, file.name)).size : null
        }));
    } catch (error) {
        return { error: error.message };
    }
}

function getBuildInfo() {
    const packageJsonPath = path.join(__dirname, 'package.json');
    
    if (!fs.existsSync(packageJsonPath)) {
        return { error: 'package.json not found' };
    }
    
    try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        return {
            name: packageJson.name,
            version: packageJson.version,
            scripts: packageJson.scripts,
            dependencies: Object.keys(packageJson.dependencies || {}),
            devDependencies: Object.keys(packageJson.devDependencies || {})
        };
    } catch (error) {
        return { error: error.message };
    }
}

// File watcher for automatic rebuilds
if (process.argv.includes('--watch')) {
    console.log('👁️  Watching for file changes...');
    
    const watcher = chokidar.watch([
        path.join(SRC_DIR, '**/*.js'),
        path.join(SRC_DIR, '**/*.html'),
        path.join(__dirname, 'webpack.config.js')
    ], {
        ignoreInitial: true
    });
    
    let rebuildTimeout;
    watcher.on('change', (filePath) => {
        console.log(`📝 File changed: ${path.relative(__dirname, filePath)}`);
        
        // Debounce rebuilds
        clearTimeout(rebuildTimeout);
        rebuildTimeout = setTimeout(() => {
            console.log('🔄 Auto-rebuilding...');
            exec('npm run build', { cwd: __dirname }, (error, stdout, stderr) => {
                if (error) {
                    console.error('❌ Auto-rebuild failed:', error.message);
                } else {
                    console.log('✅ Auto-rebuild successful');
                }
            });
        }, 1000);
    });
}

// Start server
app.listen(PORT, () => {
    console.log('\n🚀 MOJO Framework Debug Server Started');
    console.log('==========================================');
    console.log(`🌐 Server URL: http://localhost:${PORT}`);
    console.log(`📁 Serving files from: ${DIST_DIR}`);
    console.log('');
    console.log('Debug Endpoints:');
    console.log(`  📊 Server Info: http://localhost:${PORT}/debug/info`);
    console.log(`  🔄 Rebuild: http://localhost:${PORT}/debug/rebuild`);
    console.log(`  📋 Logs: http://localhost:${PORT}/debug/logs`);
    console.log(`  📄 File Info: http://localhost:${PORT}/debug/file/<filename>`);
    console.log('');
    console.log('Usage:');
    console.log('  node debug-server.js          # Start server');
    console.log('  node debug-server.js --watch  # Start with file watching');
    console.log('');
    
    // Check if dist directory exists
    if (!fs.existsSync(DIST_DIR)) {
        console.log('⚠️  Warning: dist directory not found');
        console.log('   Run "npm run build" first to generate files');
    } else {
        const files = fs.readdirSync(DIST_DIR);
        console.log(`📦 Found ${files.length} files in dist directory`);
        files.forEach(file => {
            const stats = fs.statSync(path.join(DIST_DIR, file));
            console.log(`   ${file} (${(stats.size / 1024).toFixed(1)}KB)`);
        });
    }
    
    console.log('==========================================\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down debug server...');
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('🚫 Unhandled Promise Rejection:', reason);
    process.exit(1);
});