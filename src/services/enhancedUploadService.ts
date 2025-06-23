// Enhanced upload service with proper fallback strategy
// Strategy: Firebase Storage first, then GCS bucket, with proper URL handling

import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface UploadResult {
  success: boolean;
  fileUrl?: string;
  downloadUrl?: string;
  uploadMethod?: 'firebase' | 'gcs' | 'failed';
  error?: string;
}

/**
 * Primary upload strategy: Firebase Storage with access token
 */
export const uploadToFirebaseStorage = async (
  file: File,
  userId: string
): Promise<UploadResult> => {
  try {
    const timestamp = Date.now();
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uploadPath = `resumes/${userId}/${timestamp}_${safeFileName}`;
    
    console.log('🔄 Attempting Firebase Storage upload:', uploadPath);
    
    // Upload to Firebase Storage
    const storageRef = ref(storage, uploadPath);
    const uploadResult = await uploadBytes(storageRef, file);
    
    // Get the download URL with access token (this works in console/new tab)
    const downloadUrl = await getDownloadURL(uploadResult.ref);
    
    console.log('✅ Firebase Storage upload successful:', downloadUrl);
    
    return {
      success: true,
      fileUrl: downloadUrl,
      downloadUrl: downloadUrl,
      uploadMethod: 'firebase'
    };
  } catch (error) {
    console.error('❌ Firebase Storage upload failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Firebase upload failed',
      uploadMethod: 'failed'
    };
  }
};

/**
 * Fallback strategy: Direct upload to gethired-resume-uploads bucket
 */
export const uploadToGCSBucket = async (
  file: File,
  userId: string
): Promise<UploadResult> => {
  try {
    const timestamp = Date.now();
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `resumes/${userId}/${timestamp}_${safeFileName}`;
    
    console.log('🔄 Attempting GCS bucket upload:', fileName);
    
    // Use Firebase SDK with the specific bucket
    // Import getStorage dynamically to get a storage instance for a different bucket
    const { getStorage } = await import('firebase/storage');
    const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
    
    // Get storage instance for the specific bucket
    const gcsStorage = getStorage(undefined, 'gs://gethired-resume-uploads');
    const storageRef = ref(gcsStorage, fileName);
    
    // Upload the file
    const uploadResult = await uploadBytes(storageRef, file, {
      contentType: file.type,
      cacheControl: 'public, max-age=31536000',
      customMetadata: {
        'publicAccess': 'true',
        'uploadedBy': userId,
        'uploadTimestamp': timestamp.toString()
      }
    });
    
    // Get the download URL
    const downloadUrl = await getDownloadURL(uploadResult.ref);
    
    // Also construct the direct public URL
    const publicUrl = `https://storage.googleapis.com/gethired-resume-uploads/${fileName}`;
    
    console.log('✅ GCS bucket upload successful:', downloadUrl);
    console.log('📱 Public URL:', publicUrl);
    
    return {
      success: true,
      fileUrl: downloadUrl, // Firebase download URL with access token
      downloadUrl: downloadUrl, // Same as fileUrl for compatibility
      uploadMethod: 'gcs'
    };
  } catch (error) {
    console.error('❌ GCS bucket upload failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'GCS upload failed',
      uploadMethod: 'failed'
    };
  }
};

/**
 * Main upload function with proper fallback strategy
 * 1. Try Firebase Storage (with access token)
 * 2. If that fails, try GCS bucket upload
 * 3. Ensure download URLs are properly formatted
 */
export const uploadResumeWithProperFallback = async (
  file: File,
  userId: string
): Promise<UploadResult> => {
  console.log('🚀 Starting upload with fallback strategy for:', file.name);
  
  // Step 1: Try Firebase Storage first
  const firebaseResult = await uploadToFirebaseStorage(file, userId);
  if (firebaseResult.success) {
    console.log('✅ Firebase Storage upload successful, returning result');
    return firebaseResult;
  }
  
  console.log('⚠️ Firebase Storage failed, trying GCS bucket fallback...');
  
  // Step 2: Try GCS bucket upload
  const gcsResult = await uploadToGCSBucket(file, userId);
  if (gcsResult.success) {
    console.log('✅ GCS bucket upload successful, returning result');
    return gcsResult;
  }
  
  console.error('❌ All upload methods failed');
  
  // Step 3: All methods failed
  return {
    success: false,
    error: `Both Firebase Storage and GCS bucket uploads failed. Firebase: ${firebaseResult.error}, GCS: ${gcsResult.error}`,
    uploadMethod: 'failed'
  };
};

/**
 * Utility function to convert Firebase Storage URLs to direct GCS URLs
 * This helps with CORS issues when accessing files
 */
export const convertToDirectGCSUrl = (firebaseUrl: string): string => {
  try {
    // If it's already a direct GCS URL, return as-is
    if (firebaseUrl.includes('storage.googleapis.com') && !firebaseUrl.includes('firebasestorage.googleapis.com')) {
      return firebaseUrl;
    }
    
    // Convert Firebase Storage URL to direct GCS URL
    if (firebaseUrl.includes('firebasestorage.googleapis.com')) {
      const urlObj = new URL(firebaseUrl);
      const pathMatch = urlObj.pathname.match(/\/v0\/b\/(.+?)\/o\/(.+)/);
      if (pathMatch) {
        const [, bucket, encodedPath] = pathMatch;
        const decodedPath = decodeURIComponent(encodedPath);
        const directUrl = `https://storage.googleapis.com/${bucket}/${decodedPath}`;
        console.log('🔗 Converted Firebase URL to direct GCS URL:', directUrl);
        return directUrl;
      }
    }
    
    return firebaseUrl;
  } catch (error) {
    console.error('Failed to convert URL:', error);
    return firebaseUrl;
  }
};

/**
 * Get the best URL for viewing/downloading a resume
 * Returns the Firebase URL with access token (works in new tab) or direct GCS URL
 */
export const getBestDownloadUrl = (originalUrl: string): string => {
  // If it's a Firebase Storage URL with access token, it should work in new tab
  if (originalUrl.includes('firebasestorage.googleapis.com') && originalUrl.includes('token=')) {
    return originalUrl;
  }
  
  // Otherwise, try to convert to direct GCS URL for better CORS
  return convertToDirectGCSUrl(originalUrl);
};
