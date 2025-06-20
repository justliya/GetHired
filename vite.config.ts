import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  // Debug: Log environment variables in development
  if (mode === 'development') {
    console.log('🔧 Vite Environment Variables:', {
      VITE_GETHIRED_AGENTS_API_URL: env.VITE_GETHIRED_AGENTS_API_URL,
      VITE_CLOUD_TASK_API_URL: env.VITE_CLOUD_TASK_API_URL,
      VITE_MCP_SERVER_URL: env.VITE_MCP_SERVER_URL,
    });
  }
  
  return {
    plugins: [react()],
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    // Server configuration for development
    server: {
      host: true,
      port: 5173,
    },
  };
});