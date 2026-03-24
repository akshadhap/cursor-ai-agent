import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
    build: {
        outDir: 'dist',
        rollupOptions: {
            input: {
                background: 'background/index.ts',
                content: 'content/index.ts',
                popup: 'popup/popup.ts',
            },
            output: {
                entryFileNames: '[name].js',
                format: 'iife',
            },
        },
        sourcemap: false,
        minify: 'terser',
    },
    plugins: [
        viteStaticCopy({
            targets: [
                { src: 'manifest.json', dest: '.' },
                { src: 'popup/index.html', dest: '.', rename: 'popup.html' },
                { src: 'content/content.css', dest: '.' },
                { src: 'assets/*', dest: '.' },
            ],
        }),
    ],
});
