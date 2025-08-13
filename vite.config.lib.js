import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    lib: {
      // Entry point for library
      entry: path.resolve(__dirname, 'src/index.js'),
      name: 'MOJO',
      // Generate multiple formats
      formats: ['es', 'umd', 'cjs'],
      fileName: (format) => {
        if (format === 'es') return 'web-mojo.esm.js';
        if (format === 'cjs') return 'web-mojo.cjs.js';
        return 'web-mojo.umd.js';
      }
    },
    rollupOptions: {
      // Externalize dependencies that shouldn't be bundled
      external: ['bootstrap'],
      output: {
        // Global variable name for UMD build
        globals: {
          bootstrap: 'bootstrap'
        },
        // Preserve the module structure for better tree-shaking
        preserveModules: false,
        // Export everything from index.js
        exports: 'named',
        // Asset naming
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') return 'web-mojo.css';
          return assetInfo.name;
        },
        // Add banner with version and license info
        banner: `/**
 * MOJO Framework v2.0.0
 * A lightweight JavaScript framework for building data-driven web applications
 * Package: web-mojo
 * (c) ${new Date().getFullYear()} MOJO Framework Team
 * License: MIT
 */`
      }
    },
    // Output directory
    outDir: 'dist',
    // Empty the output directory before building
    emptyOutDir: true,
    // Generate sourcemaps for debugging
    sourcemap: true,
    // Minification settings
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,  // Keep console logs for debugging
        drop_debugger: true,  // Remove debugger statements
        pure_funcs: ['console.debug'],  // Remove console.debug calls
        passes: 2  // Run compression twice for better optimization
      },
      format: {
        comments: 'some',  // Preserve important comments (licenses, etc.)
        preserve_annotations: true
      },
      mangle: {
        // Don't mangle class names for better debugging
        keep_classnames: true,
        keep_fnames: false
      }
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Report compressed size
    reportCompressedSize: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@core': path.resolve(__dirname, 'src/core'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@pages': path.resolve(__dirname, 'src/pages'),
      '@models': path.resolve(__dirname, 'src/models'),
      '@templates': path.resolve(__dirname, 'src/templates'),
      '@styles': path.resolve(__dirname, 'src/styles')
    }
  },
  // Define global constants
  define: {
    __MOJO_VERSION__: JSON.stringify('2.0.0'),
    __MOJO_BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __MOJO_PACKAGE_NAME__: JSON.stringify('web-mojo')
  },
  // CSS handling
  css: {
    // Extract CSS to separate file
    extract: true,
    // Generate source maps for CSS
    devSourcemap: true
  }
});