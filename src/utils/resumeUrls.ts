// utils/resumeUrls.ts
export const getPreferredResumeUrl = (urls: {
  authenticatedUrl?: string;
  signedUrl?: string;
  publicUrl?: string;
  firebaseUrl?: string;
  gcsUrl?: string;
  tailoredResumeUrl?: string;
}): string => {
  // Priority order for URLs
  return urls.authenticatedUrl || 
         urls.signedUrl || 
         urls.publicUrl || 
         urls.firebaseUrl || 
         urls.gcsUrl || 
         urls.tailoredResumeUrl || 
         '';
};

export const validateResumeUrl = (url: string): boolean => {
  if (!url) return false;
  
  // Check for placeholder values
  if (url.includes('user_id') || 
      url.includes('ACTUAL_USER_ID') || 
      url.includes('USER_ID')) {
    console.warn('URL contains placeholder:', url);
    return false;
  }
  
  // Check for valid URL format
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

export const categorizeUrl = (url: string): 'public' | 'signed' | 'firebase' | 'unknown' => {
  if (!url) return 'unknown';
  
  if (url.includes('X-Goog-Signature') || url.includes('X-Goog-Algorithm')) {
    return 'signed';
  } else if (url.includes('firebasestorage.googleapis.com')) {
    return 'firebase';
  } else if (url.includes('storage.googleapis.com')) {
    return 'public';
  }
  
  return 'unknown';
};