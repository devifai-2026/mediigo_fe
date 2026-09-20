import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Each role-portal runs on its own port in dev (see src/lib/portals.js), so
// four windows can stay logged in side by side — sessions are per-origin.
const PORTAL_PORTS = { clinic: 5173, district: 5174, super: 5175 };

export default defineConfig(({ mode }) => {
  const portal = process.env.VITE_PORTAL;
  const port = Number(process.env.PORT) || PORTAL_PORTS[portal] || 5173;

  return {
  plugins: [react()],
  resolve: { alias: { '@': '/src' } },
  define: { 'import.meta.env.VITE_PORTAL': JSON.stringify(portal ?? '') },
  server: {
    port,
    strictPort: true,
    // Proxying keeps everything same-origin in dev, so the httpOnly refresh
    // cookie is first-party and needs no CORS exemption.
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:4000', ws: true, changeOrigin: true },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          socket: ['socket.io-client'],
        },
      },
    },
  },
  };
});
