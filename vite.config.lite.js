import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Vite config for building a "lite" WEB-MOJO bundle that can be used via <script> tag.
 *
 * Output:
 * - dist/web-mojo.lite.iife.js        (unminified)
 * - dist/web-mojo.lite.iife.min.js    (minified)
 *
 * Notes:
 * - We intentionally do NOT bundle Bootstrap. Consumers should include Bootstrap CSS/Icons/JS.
 * - The lite entry attaches exports to window.MOJO by merging (see src/lite/index.js).
 */
export default defineConfig(({ mode }) => {
  // When running `vite build` without an explicit --mode, Vite defaults to "production".
  // For this config we want:
  // - mode === 'development'  -> unminified file (web-mojo.lite.iife.js)
  // - mode === 'production'   -> minified file   (web-mojo.lite.iife.min.js)
  const isMin = mode === 'production';

  return {
    resolve: {
      alias: [
        // Match the main Vite config aliases so lite can import using @core, @ext, etc.
        { find: '@core', replacement: path.resolve(__dirname, 'src/core') },
        { find: '@ext', replacement: path.resolve(__dirname, 'src/extensions') },

        // Legacy aliases (safe to include; helps if lite imports indirectly reference them)
        { find: '@', replacement: path.resolve(__dirname, 'src') },
        { find: '@components', replacement: path.resolve(__dirname, 'src/components') },
        { find: '@models', replacement: path.resolve(__dirname, 'src/models') },
        { find: '@pages', replacement: path.resolve(__dirname, 'src/pages') },
        { find: '@utils', replacement: path.resolve(__dirname, 'src/utils') }
      ]
    },

    build: {
      outDir: 'dist',
      emptyOutDir: false, // keep existing dist artifacts from other builds
      sourcemap: true,
      minify: isMin ? 'esbuild' : false,
      lib: {
        entry: path.resolve(__dirname, 'src/lite/index.js'),
        name: 'MOJO',
        formats: ['iife'],
        fileName: () => (isMin ? 'web-mojo.lite.iife.min.js' : 'web-mojo.lite.iife.js')
      },
      rollupOptions: {
        // Do not bundle bootstrap; treat it as an external global
        external: ['bootstrap'],
        output: {
          globals: {
            bootstrap: 'bootstrap'
          },
          // Ensure a single-file build (no code-splitting) for script-tag usage
          inlineDynamicImports: true,
          // Avoid Rollup default-export warnings for IIFE consumers
          exports: 'named'
        }
      }
    }
  };
});