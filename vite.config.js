import { defineConfig } from 'vite'
import path from 'path'
import mojoTemplatesPlugin from './vite-plugin-templates.js'

export default defineConfig({
  // Root directory - serves from project root
  root: '.',
  
  // Public directory for static assets
  publicDir: 'dist',
  
  // Development server configuration
  server: {
    port: 3000,
    host: 'localhost',
    open: '/examples/',
    cors: true,
    // Serve all directories
    fs: {
      allow: ['.']
    }
  },
  
  // Module resolution
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@models': path.resolve(__dirname, 'src/models'),
      '@pages': path.resolve(__dirname, 'src/pages'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@core': path.resolve(__dirname, 'src/core')
    }
  },
  
  // Build configuration
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        // Main framework entry
        main: path.resolve(__dirname, 'src/index.html'),
        mojo: path.resolve(__dirname, 'src/mojo.js'),
        app: path.resolve(__dirname, 'src/app.js')
      }
    }
  },
  
  // Preview server (for production builds)
  preview: {
    port: 3000,
    open: '/examples/',
    cors: true
  },
  
  // Optimizations
  optimizeDeps: {
    include: [
      'mustache',
      'bootstrap'
    ]
  },
  
  // CSS configuration
  css: {
    devSourcemap: true
  },
  
  // Define global constants
  define: {
    __MOJO_VERSION__: JSON.stringify('2.0.0'),
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production')
  },
  
  // Plugins
  plugins: [
    // Auto-compile templates during development
    mojoTemplatesPlugin({
      watch: true  // Enable watching for template changes
    })
  ]
})