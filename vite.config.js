import { defineConfig } from 'vite';

export default defineConfig({
    base: './', // Use relative paths so it works on any repo name
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
    }
});
