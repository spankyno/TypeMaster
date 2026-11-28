import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig } from 'vite';
import { seoPlugin } from './vite-plugins/seo';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      seoPlugin(),
      // Copies src/assets into dist/ so root-relative URLs resolve in production builds
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(__dirname, 'dist');
          const srcAssets = path.resolve(__dirname, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, { recursive: true, force: true });
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    build: {
      chunkSizeWarningLimit: 1000,
      // Sin manualChunks: la forma de objeto arrastraba React al chunk de recharts y anulaba el lazy-loading.
      // Rollup separa solo (recharts queda únicamente en los chunks de Estadísticas / Resultado).
    },
  };
});
