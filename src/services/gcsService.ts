// Google Cloud Storage service with multiple upload strategies
// This provides fallbacks when Firebase Storage has CORS issues

import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL, getStorage } from 'firebase/storage';

interface GCSUploadResponse {
  success: boolean;
  fileUrl?: string;
  publicUrl?: string;
  fileName?: string;
  uploadSource?: 'firebase' | 'public' | 'direct' | 'base64';
  error?: string;
}

interface GCSConfig {
  projectId: string;
  bucketName: string;
}

// Get GCS configuration from environment
const getGCSConfig = (): GCSConfig => {
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'gethired-6c623';
  
  return {
    projectId,
    bucketName: 'gethired-resume-uploads' // Default to user uploads bucket
  };
};

// Upload to user uploads bucket for manual uploads
export const uploadToUserUploadsBucket = async (
  file: File,
  userId: string
): Promise<GCSUploadResponse> => {
  try {
    const timestamp = Date.now();
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uploadPath = `resumes/${userId}/${timestamp}_${safeFileName}`;
    
    console.log('🔄 Uploading to user uploads bucket:', uploadPath);
    
    // Create a reference to the user uploads bucket
    const uploadStorage = getStorage(undefined, 'gs://gethired-resume-uploads');
    const storageRef = ref(uploadStorage, uploadPath);
    
    // Set metadata for public access
    const metadata = {
      contentType: file.type,
      cacheControl: 'public, max-age=31536000',
      customMetadata: {
        'publicAccess': 'true',
        'uploadedAt': timestamp.toString(),
        'originalName': file.name,
        'userId': userId
      }
    };
    
    const snapshot = await uploadBytes(storageRef, file, metadata);
    const downloadUrl = await getDownloadURL(snapshot.ref);
    
    // Create a direct public URL that should work with external viewers
    const publicUrl = `https://storage.googleapis.com/gethired-resume-uploads/${uploadPath}`;
    
    console.log('✅ User uploads bucket upload successful');
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
    console.error('❌ Failed to upload to user uploads bucket:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'User uploads bucket failed'
    };
  }
};

// Upload to AI-generated bucket for AI resumes
export const uploadToAIGeneratedBucket = async (
  file: File,
  userId: string
): Promise<GCSUploadResponse> => {
  try {
    const timestamp = Date.now();
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uploadPath = `resumes/${userId}/${timestamp}_${safeFileName}`;
    
    console.log('🔄 Uploading to AI-generated bucket:', uploadPath);
    
    // Create a reference to the AI-generated bucket
    const uploadStorage = getStorage(undefined, 'gs://gethired-resumes');
    const storageRef = ref(uploadStorage, uploadPath);
    
    // Set metadata for public access
    const metadata = {
      contentType: file.type,
      cacheControl: 'public, max-age=31536000',
      customMetadata: {
        'publicAccess': 'true',
        'uploadedAt': timestamp.toString(),
        'originalName': file.name,
        'userId': userId,
        'source': 'ai_generated'
      }
    };
    
    const snapshot = await uploadBytes(storageRef, file, metadata);
    const downloadUrl = await getDownloadURL(snapshot.ref);
    
    // Create a direct public URL that should work with external viewers
    const publicUrl = `https://storage.googleapis.com/gethired-resumes/${uploadPath}`;
    
    console.log('✅ AI-generated bucket upload successful');
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
    console.error('❌ Failed to upload to AI-generated bucket:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'AI-generated bucket failed'
    };
  }
};

// Create Base64 data URL for immediate use (CORS-free)
export const createBase64Upload = async (file: File): Promise<GCSUploadResponse> => {
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
          uploadSource: 'base64'
        });
      };
      reader.onerror = () => {
        resolve({
          success: false,
          error: 'Failed to create base64 data URL'
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

// Multi-strategy upload with comprehensive fallbacks
export const uploadWithMultipleStrategies = async (
  file: File,
  userId: string
): Promise<GCSUploadResponse> => {
  console.log('🔄 Starting multi-strategy upload for:', file.name, 'Size:', file.size);
  
  // Strategy 1: Upload to dedicated upload bucket (should work with CORS configured)
  try {
    console.log('🔄 Strategy 1: Dedicated upload bucket');
    const uploadBucketResult = await uploadToUserUploadsBucket(file, userId);
    if (uploadBucketResult.success) {
      console.log('✅ Strategy 1 (upload bucket) succeeded');
      return uploadBucketResult;
    }
  } catch (error) {
    console.warn('⚠️ Strategy 1 (upload bucket) failed:', error);
  }
  
  // Strategy 2: Try regular Firebase Storage
  try {
    console.log('🔄 Strategy 2: Regular Firebase Storage');
    
    const timestamp = Date.now();
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const regularPath = `resumes/${userId}/${timestamp}_${safeFileName}`;
    
    const storageRef = ref(storage, regularPath);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(snapshot.ref);
    
    // Create direct GCS URL
    const url = new URL(downloadUrl);
    const pathMatch = url.pathname.match(/\/v0\/b\/(.+?)\/o\/(.+)/);
    let publicUrl = downloadUrl;
    
    if (pathMatch) {
      const [, bucket, encodedPath] = pathMatch;
      const decodedPath = decodeURIComponent(encodedPath);
      publicUrl = `https://storage.googleapis.com/${bucket}/${decodedPath}`;
    }
    
    console.log('✅ Strategy 2 (Firebase) succeeded');
    
    return {
      success: true,
      fileUrl: downloadUrl,
      publicUrl: publicUrl,
      fileName: safeFileName,
      uploadSource: 'firebase'
    };
  } catch (error) {
    console.warn('⚠️ Strategy 2 (Firebase) failed:', error);
  }
  
  // Strategy 3: Base64 data URL (works for any size, no CORS issues)
  try {
    console.log('🔄 Strategy 3: Base64 data URL');
    const base64Result = await createBase64Upload(file);
    if (base64Result.success) {
      console.log('✅ Strategy 3 (base64) succeeded');
      return base64Result;
    }
  } catch (error) {
    console.warn('⚠️ Strategy 3 (base64) failed:', error);
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
