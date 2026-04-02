import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/election-np/',
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'vendor-react';
            if (id.includes('chart.js') || id.includes('react-chartjs-2')) return 'vendor-charts';
            if (id.includes('leaflet') || id.includes('react-leaflet')) return 'vendor-leaflet';
            return 'vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  server: {
    watch: {
      ignored: ['**/public/data/**'],
    },
  },
});
