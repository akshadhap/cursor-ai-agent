import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
    build: {
        outDir: 'dist',
        rollupOptions: {
            input: {
                content: 'src/content/index.ts',
                background: 'src/background/index.ts',
                popup: 'src/popup/index.html',
            },
            output: {
                entryFileNames: '[name].js',
                chunkFileNames: '[name].js',
                assetFileNames: '[name].[ext]',
            },
        },
    },
    plugins: [
        viteStaticCopy({
            targets: [
                {
                    src: 'public/manifest.json',
                    dest: '.',
                },
                {
                    src: 'src/content/content.css',
                    dest: '.',
                },
            ],
        }),
    ],
});
