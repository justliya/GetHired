// File proxy service to handle CORS issues with external viewers and file operations
import { getApiUrl } from '../config/environment';

export interface ProxyResponse {
  success: boolean;
  proxyUrl?: string;
  directUrl?: string;
  error?: string;
}

export interface UploadResponse {
  success: boolean;
  fileUrl?: string;
  publicUrl?: string;
  fileName?: string;
  error?: string;
}

// Upload file via backend proxy to avoid CORS issues
export const uploadFileViaProxy = async (
  file: File, 
  userId: string, 
  metadata?: Record<string, unknown>
): Promise<UploadResponse> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId);
    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }

    const response = await fetch(`${getApiUrl(true)}/upload-resume`, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header - let browser set it with boundary for FormData
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    return {
      success: true,
      fileUrl: result.fileUrl,
      publicUrl: result.publicUrl,
      fileName: result.fileName
    };
  } catch (error) {
    console.error('Failed to upload file via proxy:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Create a proxied URL for file access
export const createProxyUrl = async (originalUrl: string): Promise<ProxyResponse> => {
  try {
    // Encode the original URL to pass to our backend proxy
    const encodedUrl = encodeURIComponent(originalUrl);
    const proxyUrl = `${getApiUrl(true)}/proxy-file?url=${encodedUrl}`;
    
    return {
      success: true,
      proxyUrl: proxyUrl,
      directUrl: originalUrl
    };
  } catch (error) {
    console.error('Failed to create proxy URL:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Get file content via backend proxy
export const getFileContentViaProxy = async (fileUrl: string): Promise<{
  success: boolean;
  blob?: Blob;
  proxyUrl?: string;
  error?: string;
}> => {
  try {
    const proxyResult = await createProxyUrl(fileUrl);
    if (!proxyResult.success || !proxyResult.proxyUrl) {
      throw new Error(proxyResult.error || 'Failed to create proxy URL');
    }

    const response = await fetch(proxyResult.proxyUrl);
    if (!response.ok) {
      throw new Error(`Proxy request failed: ${response.status}`);
    }

    const blob = await response.blob();
    return {
      success: true,
      blob: blob,
      proxyUrl: proxyResult.proxyUrl
    };
  } catch (error) {
    console.error('Failed to get file content via proxy:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Test if a URL is accessible without CORS issues
export const testUrlAccess = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      mode: 'cors',
      credentials: 'omit'
    });
    return response.ok;
  } catch (error) {
    console.warn('URL not accessible from client:', error);
    return false;
  }
};

// Get the best URL for a given context (viewer, download, etc.)
export const getBestUrlForContext = async (
  originalUrl: string, 
  context: 'office-viewer' | 'google-viewer' | 'direct-download' | 'browser-view'
): Promise<string> => {
  switch (context) {
    case 'office-viewer':
    case 'google-viewer': {
      // External viewers need publicly accessible URLs
      // Try proxy first, fallback to direct URL
      const proxyResult = await createProxyUrl(originalUrl);
      return proxyResult.proxyUrl || originalUrl;
    }
    
    case 'direct-download':
    case 'browser-view':
      // Direct access can use the original Firebase authenticated URL
      return originalUrl;
    
    default:
      return originalUrl;
  }
};
