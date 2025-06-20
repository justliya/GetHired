import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  // Ensure environment variables are available
  define: {
    // These will be replaced at build time
    __VITE_GETHIRED_AGENTS_API_URL__: JSON.stringify(process.env.VITE_GETHIRED_AGENTS_API_URL),
    __VITE_CLOUD_TASK_API_URL__: JSON.stringify(process.env.VITE_CLOUD_TASK_API_URL),
  },
  // Server configuration for development
  server: {
    host: true,
    port: 5173,
  },
});