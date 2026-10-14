import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

// Bygger til webui/static/mapcreator/ med faste filnavne (ingen hashes); Flask sætter ?v=<mtime> på i skabelonen.
// I Docker-bygget peger MAPCREATOR_OUT et andet sted hen (se Dockerfile).
export default defineConfig({
  plugins: [svelte()],
  base: '/static/mapcreator/',
  build: {
    outDir: process.env.MAPCREATOR_OUT ?? '../webui/static/mapcreator',
    emptyOutDir: true,
    cssCodeSplit: false,
    rollupOptions: {
      input: 'src/main.ts',
      output: {
        entryFileNames: 'app.js',
        chunkFileNames: '[name].js',
        assetFileNames: (info) => (info.names?.some((n) => n.endsWith('.css')) ? 'app.css' : '[name][extname]'),
      },
    },
  },
  test: { environment: 'node', include: ['src/tests/**/*.test.ts'] },
});
