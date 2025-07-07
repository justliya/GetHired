/**
 * Environment configuration for GetHired application
 * Centralizes all environment variables with fallbacks
 */

interface EnvironmentConfig {
  // API URLs
  GETHIRED_AGENTS_API_URL: string;
  GETHIRED_AGENTS_STAGING_API_URL: string;
  CLOUD_TASK_API_URL: string;
  MCP_SERVER_URL: string;
  
  // Environment info
  NODE_ENV: string;
  IS_DEVELOPMENT: boolean;
  IS_PRODUCTION: boolean;
}

const getEnvironmentConfig = (): EnvironmentConfig => {
  const isDevelopment = import.meta.env.MODE === 'development'; 
  const isProduction = import.meta.env.MODE === 'production';

  return {
    // API URLs with fallbacks
    GETHIRED_AGENTS_API_URL: import.meta.env.VITE_GETHIRED_AGENTS_API_URL || 'https://gethired-agents-104139545590.us-central1.run.app',
    GETHIRED_AGENTS_STAGING_API_URL: import.meta.env.VITE_GETHIRED_AGENTS_STAGING_API_URL || 'https://gethired-agents-staging-104139545590.us-central1.run.app',
    CLOUD_TASK_API_URL: import.meta.env.VITE_CLOUD_TASK_API_URL || 'https://gethired-scheduler-104139545590.us-central1.run.app',
    MCP_SERVER_URL: import.meta.env.VITE_MCP_SERVER_URL || 'https://gethired-mcp.onrender.com/jobsearch-mcp/',
    
    // Environment info
    NODE_ENV: import.meta.env.MODE || 'development',
    IS_DEVELOPMENT: isDevelopment,
    IS_PRODUCTION: isProduction,
  };
};

// Export the configuration
export const ENV = getEnvironmentConfig();

// Utility function to get the appropriate API URL based on environment
export const getApiUrl = (preferStaging: boolean = false): string => {
  if (ENV.IS_DEVELOPMENT && preferStaging) {
    return ENV.GETHIRED_AGENTS_STAGING_API_URL;
  }
  return ENV.GETHIRED_AGENTS_API_URL;
};

// Log configuration in development
if (ENV.IS_DEVELOPMENT) {
  console.log('🔧 Environment Configuration:', {
    MODE: import.meta.env.MODE,
    VITE_GETHIRED_AGENTS_API_URL: import.meta.env.VITE_GETHIRED_AGENTS_API_URL,
    GETHIRED_AGENTS_API_URL: ENV.GETHIRED_AGENTS_API_URL,
    VITE_CLOUD_TASK_API_URL: import.meta.env.VITE_CLOUD_TASK_API_URL,
    CLOUD_TASK_API_URL: ENV.CLOUD_TASK_API_URL,
    MCP_SERVER_URL: ENV.MCP_SERVER_URL,
    NODE_ENV: ENV.NODE_ENV,
  });
  
  // Warn about missing environment variables
  if (!import.meta.env.VITE_CLOUD_TASK_API_URL) {
    console.warn('⚠️ VITE_CLOUD_TASK_API_URL not set, using fallback:', ENV.CLOUD_TASK_API_URL);
  }
  if (!import.meta.env.VITE_GETHIRED_AGENTS_API_URL) {
    console.warn('⚠️ VITE_GETHIRED_AGENTS_API_URL not set, using fallback:', ENV.GETHIRED_AGENTS_API_URL);
  }
}
