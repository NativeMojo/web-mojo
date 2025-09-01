import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        lib: {
            entry: 'src/loader/loader.js',
            name: 'MojoLoader',
            fileName: (format) => `loader.${format}.js`,
            formats: ['umd', 'es']
        },
        outDir: 'dist',
        // We don't want to empty the whole dist dir if other builds are running
        emptyOutDir: false, 
    }
});
