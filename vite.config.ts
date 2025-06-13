import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    port: 5173, // default Vite port
    proxy: {
      // Proxy all API endpoints
      '/list-apps': {
        target: 'https://gethired-fxgt.onrender.com',
        changeOrigin: true,
        secure: false,
      },
      '/apps': {
        target: 'https://gethired-fxgt.onrender.com',
        changeOrigin: true,
        secure: false,
      },
      '/run_sse': {
        target: 'https://gethired-fxgt.onrender.com',
        changeOrigin: true,
        secure: false,
      }
    }
  }
});