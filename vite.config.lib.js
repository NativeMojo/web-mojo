import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import mojoTemplatesPlugin from './vite-plugin-templates.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Helper to find all template files
function findTemplateFiles() {
  const templateExtensions = ['.mst', '.html', '.htm'];
  const templates = [];
  
  function walkDir(dir, baseDir = '') {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        walkDir(filePath, path.join(baseDir, file));
      } else if (templateExtensions.some(ext => file.endsWith(ext))) {
        templates.push({
          src: filePath,
          dest: path.join('templates', baseDir)
        });
      }
    });
  }
  
  // Find templates in various locations
  const templateDirs = ['src/templates', 'src/components', 'src/pages', 'src/auth'];
  templateDirs.forEach(dir => {
    const fullPath = path.resolve(__dirname, dir);
    if (fs.existsSync(fullPath)) {
      walkDir(fullPath, path.basename(dir));
    }
  });
  
  return templates;
}

export default defineConfig({
  build: {
    lib: {
      entry: [
        path.resolve(__dirname, 'src/index.js'),
        path.resolve(__dirname, 'src/auth.js'),
        path.resolve(__dirname, 'src/lightbox.js'),
        path.resolve(__dirname, 'src/charts.js'),
        path.resolve(__dirname, 'src/docit.js'),
        path.resolve(__dirname, 'src/admin.js')
      ],
      name: 'MOJO',
      // Generate multiple formats
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => {
        // Use entry name to differentiate files
        return `${entryName}.${format}.js`;
      }
    },
    rollupOptions: {
      // Externalize dependencies that shouldn't be bundled
      external: ['bootstrap'],
      output: {
        // Global variable names for UMD builds
        globals: {
          bootstrap: 'bootstrap'
        },
        // Export everything from index.js
        exports: 'named',
        // Organize shared chunks for clarity during multi-entry builds
        chunkFileNames: 'chunks/[name]-[hash].js',
        // Asset naming for CSS and other assets
        assetFileNames: (assetInfo) => {
          // Handle CSS files
          if (assetInfo.name?.endsWith('.css')) {
            // Main CSS file
            if (assetInfo.name === 'style.css' || assetInfo.name === 'index.css') {
              return 'web-mojo.css';
            }
            // Other CSS files preserve their names
            return 'css/[name][extname]';
          }
          // Handle fonts
          if (/\.(woff|woff2|eot|ttf|otf)$/.test(assetInfo.name || '')) {
            return 'fonts/[name][extname]';
          }
          // Handle images
          if (/\.(png|jpg|jpeg|gif|svg|ico)$/.test(assetInfo.name || '')) {
            return 'images/[name][extname]';
          }
          // Default for other assets
          return 'assets/[name][extname]';
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
    // Copy templates and other static assets
    copyPublicDir: false,
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
      // Legacy aliases (to be cleaned after restructure)
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@pages': path.resolve(__dirname, 'src/pages'),
      '@models': path.resolve(__dirname, 'src/models'),
      '@templates': path.resolve(__dirname, 'src/templates'),
      '@styles': path.resolve(__dirname, 'src/styles'),

      // New aliases for clearer boundaries
      '@core': path.resolve(__dirname, 'src/core'),
      '@ext': path.resolve(__dirname, 'src/extensions')
    }
  },
  // Define global constants
  define: {
    __MOJO_VERSION__: JSON.stringify('2.0.0'),
    __MOJO_BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __MOJO_PACKAGE_NAME__: JSON.stringify('web-mojo')
  },
  plugins: [
    // Custom plugin to copy template files
    {
      name: 'copy-templates',
      writeBundle() {
        const templates = findTemplateFiles();
        templates.forEach(({ src, dest }) => {
          const destDir = path.join(__dirname, 'dist', dest);
          if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
          }
          const destFile = path.join(destDir, path.basename(src));
          fs.copyFileSync(src, destFile);
          console.log(`Copied template: ${path.basename(src)} to ${dest}`);
        });
        
        // Create a templates index file
        const templateIndex = templates.map(t => {
          const relativePath = path.join(t.dest, path.basename(t.src));
          const baseName = path.basename(t.src, path.extname(t.src)).replace(/[^a-zA-Z0-9]/g, '_');
          return `export const ${baseName} = './${relativePath}';`;
        }).join('\n');
        
        if (templateIndex) {
          fs.writeFileSync(
            path.join(__dirname, 'dist', 'templates', 'index.js'),
            `// Auto-generated template exports\n${templateIndex}\n`
          );
        }
      }
    },
    // Custom plugin to copy CSS files if they exist
    {
      name: 'copy-additional-css',
      writeBundle() {
        // Copy any additional CSS files that need to be available separately
        const cssFilesToCopy = [
          { src: 'src/styles/mojo.css', dest: 'css/mojo-source.css' }
        ];
        
        cssFilesToCopy.forEach(({ src, dest }) => {
          const srcPath = path.join(__dirname, src);
          if (fs.existsSync(srcPath)) {
            const destPath = path.join(__dirname, 'dist', dest);
            const destDir = path.dirname(destPath);
            if (!fs.existsSync(destDir)) {
              fs.mkdirSync(destDir, { recursive: true });
            }
            fs.copyFileSync(srcPath, destPath);
            console.log(`Copied CSS: ${src} to dist/${dest}`);
          }
        });
        
        // Create a CSS manifest
        const distDir = path.join(__dirname, 'dist');
        const cssFiles = [];
        
        function findCssFiles(dir, base = '') {
          if (!fs.existsSync(dir)) return;
          const files = fs.readdirSync(dir);
          files.forEach(file => {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            if (stat.isDirectory() && file !== 'node_modules') {
              findCssFiles(filePath, path.join(base, file));
            } else if (file.endsWith('.css')) {
              cssFiles.push(path.join(base, file));
            }
          });
        }
        
        findCssFiles(path.join(distDir, 'css'), 'css');
        
        // Create an index of available CSS files
        const cssIndex = {
          main: './web-mojo.css',
          styles: cssFiles.reduce((acc, file) => {
            const name = path.basename(file, '.css');
            acc[name] = `./${file}`;
            return acc;
          }, {})
        };
        
        fs.writeFileSync(
          path.join(distDir, 'css-manifest.json'),
          JSON.stringify(cssIndex, null, 2)
        );
        console.log('Created CSS manifest');
      }
    },
    // Auto-compile templates before building
    mojoTemplatesPlugin({
      watch: false  // No watching needed for library builds
    })
  ]
});