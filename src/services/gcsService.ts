// Google Cloud Storage service with multiple upload strategies
// This provides fallbacks when Firebase Storage has CORS issues

import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface GCSUploadResponse {
  success: boolean;
  fileUrl?: string;
  publicUrl?: string;
  fileName?: string;
  uploadSource?: 'firebase' | 'public' | 'direct';
  error?: string;
}

interface GCSConfig {
  projectId: string;
  bucketName: string;
}

// Get GCS configuration from environment
const getGCSConfig = (): GCSConfig => {
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'gethired-prod';
  
  return {
    projectId,
    bucketName: 'gethired-upload-resumes'}
};

export const uploadToPublicFirebaseStorage = async (
  file: File,
  userId: string
): Promise<GCSUploadResponse> => {
  try {
    const timestamp = Date.now();
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const publicPath = `public-resumes/${userId}/${timestamp}_${safeFileName}`;
    
    console.log('🔄 Uploading to public Firebase Storage path:', publicPath);
    
    const storageRef = ref(storage, publicPath);
    
    // Set custom metadata for public access
    const metadata = {
      contentType: file.type,
      customMetadata: {
        'publicAccess': 'true',
        'uploadedAt': timestamp.toString(),
        'originalName': file.name
      }
    };
    
    const snapshot = await uploadBytes(storageRef, file, metadata);
    const downloadUrl = await getDownloadURL(snapshot.ref);
    
    // Create a public URL that should work with external viewers
    const config = getGCSConfig();
    const publicUrl = `https://storage.googleapis.com/${config.bucketName}/${publicPath}`;
    
    console.log('✅ Public Firebase upload successful');
    console.log('📥 Download URL:', downloadUrl);
    console.log('🌐 Public URL:', publicUrl);
    
    return {
      success: true,
      fileUrl: downloadUrl,
      publicUrl: publicUrl,
      fileName: safeFileName,
      uploadSource: 'public'
    };
  } catch (error) {
    console.error('❌ Failed to upload to public Firebase Storage:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'GCS upload failed'
    };
  }
};

export const createPublicGCSUrl = (downloadUrl: string): string => {
  try {
    const url = new URL(downloadUrl);
    
    // If it's a Firebase Storage URL, convert to direct GCS URL
    if (url.hostname === 'firebasestorage.googleapis.com') {
      const pathMatch = url.pathname.match(/\/v0\/b\/(.+?)\/o\/(.+)/);
      if (pathMatch) {
        const [, bucket, encodedPath] = pathMatch;
        const decodedPath = decodeURIComponent(encodedPath);
        return `https://storage.googleapis.com/${bucket}/${decodedPath}`;
      }
    }
    
    // Remove auth tokens for public access
    url.searchParams.delete('token');
    url.searchParams.delete('alt');
    return url.toString();
  } catch (error) {
    console.error('Failed to create public GCS URL:', error);
    return downloadUrl;
  }
};

export const uploadWithMultipleStrategies = async (
  file: File,
  userId: string
): Promise<GCSUploadResponse> => {
  console.log('🔄 Starting multi-strategy GCS upload for:', file.name);
  
  // Strategy 1: Upload to public folder in Firebase Storage
  try {
    const publicResult = await uploadToPublicFirebaseStorage(file, userId);
    if (publicResult.success) {
      console.log('✅ Strategy 1 (public Firebase) succeeded');
      return publicResult;
    }
  } catch (error) {
    console.warn('⚠️ Strategy 1 (public Firebase) failed:', error);
  }
  
  // Strategy 2: Try regular Firebase Storage with public URL conversion
  try {
    console.log('🔄 Trying Strategy 2: Regular Firebase with public URL conversion');
    
    const timestamp = Date.now();
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const regularPath = `resumes/${userId}/${timestamp}_${safeFileName}`;
    
    const storageRef = ref(storage, regularPath);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(snapshot.ref);
    const publicUrl = createPublicGCSUrl(downloadUrl);
    
    console.log('✅ Strategy 2 succeeded');
    
    return {
      success: true,
      fileUrl: downloadUrl,
      publicUrl: publicUrl,
      fileName: safeFileName,
      uploadSource: 'firebase'
    };
  } catch (error) {
    console.warn('⚠️ Strategy 2 (regular Firebase) failed:', error);
  }
  
  // Strategy 3: Create data URL as last resort (for very small files)
  if (file.size < 1024 * 1024) { // Only for files under 1MB
    try {
      console.log('🔄 Trying Strategy 3: Data URL fallback');
      const dataUrlResult = await createDataUrlFallback(file);
      if (dataUrlResult.success) {
        console.log('✅ Strategy 3 (data URL) succeeded');
        return dataUrlResult;
      }
    } catch (error) {
      console.warn('⚠️ Strategy 3 (data URL) failed:', error);
    }
  }
  
  // All strategies failed
  return {
    success: false,
    error: 'All upload strategies failed. Please try again or contact support.'
  };
};

export const testGCSAccess = async (): Promise<{
  success: boolean;
  canUpload: boolean;
  canRead: boolean;
  error?: string;
}> => {
  try {
    const config = getGCSConfig();
    
    // Test if we can access the bucket
    const response = await fetch(
      `https://storage.googleapis.com/storage/v1/b/${config.bucketName}`,
      { method: 'HEAD' }
    );
    
    return {
      success: true,
      canUpload: response.ok,
      canRead: response.ok
    };
  } catch (error) {
    return {
      success: false,
      canUpload: false,
      canRead: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

export const createDataUrlFallback = (file: File): Promise<GCSUploadResponse> => {
  return new Promise((resolve) => {
    try {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        resolve({
          success: true,
          fileUrl: dataUrl,
          publicUrl: dataUrl,
          fileName: file.name,
          uploadSource: 'direct'
        });
      };
      reader.onerror = () => {
        resolve({
          success: false,
          error: 'Failed to create data URL'
        });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      resolve({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
};

export type { GCSUploadResponse };
