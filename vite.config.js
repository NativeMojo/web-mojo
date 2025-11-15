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
    alias: [
      // Package-style import aliases for examples and dev (put subpaths first)
      { find: 'web-mojo/charts', replacement: path.resolve(__dirname, 'src/extensions/charts/index.js') },
      { find: 'web-mojo/lightbox', replacement: path.resolve(__dirname, 'src/extensions/lightbox/index.js') },
      { find: 'web-mojo/map', replacement: path.resolve(__dirname, 'src/extensions/map/index.js') },
      { find: 'web-mojo/admin', replacement: path.resolve(__dirname, 'src/extensions/admin/index.js') },
      { find: 'web-mojo/auth', replacement: path.resolve(__dirname, 'src/extensions/auth/index.js') },
      { find: 'web-mojo', replacement: path.resolve(__dirname, 'src/index.js') },

      // New aliases for clearer boundaries
      { find: '@core', replacement: path.resolve(__dirname, 'src/core') },
      { find: '@ext', replacement: path.resolve(__dirname, 'src/extensions') },

      // Legacy aliases (will be removed after restructure)
      { find: '@', replacement: path.resolve(__dirname, 'src') },
      { find: '@components', replacement: path.resolve(__dirname, 'src/components') },
      { find: '@models', replacement: path.resolve(__dirname, 'src/models') },
      { find: '@pages', replacement: path.resolve(__dirname, 'src/pages') },
      { find: '@utils', replacement: path.resolve(__dirname, 'src/utils') }
    ]
  },

  // Build configuration
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Use Terser to strip non-critical console calls in production builds
    minify: 'terser',
    terserOptions: {
      compress: {
        // Remove noisy console calls but keep warn/error/assert
        pure_funcs: [
          'console.log',
          'console.info',
          'console.debug',
          'console.trace',
          'console.dir',
          'console.dirxml',
          'console.group',
          'console.groupCollapsed',
          'console.groupEnd',
          'console.time',
          'console.timeEnd',
          'console.timeLog',
          'console.table'
        ],
        drop_debugger: true
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
