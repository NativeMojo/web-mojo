import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        lib: {
            entry: 'src/extensions/mojo-auth/mojo-auth.js',
            name: 'MojoAuth',
            fileName: (format) => `mojo-auth.${format}.js`,
            formats: ['umd', 'es']
        },
        outDir: 'dist',
        emptyOutDir: false,
    }
});
