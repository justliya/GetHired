import { db, auth, storage } from '../firebase';
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  addDoc, 
  getDocs, 
  DocumentReference, 
  type DocumentData 
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  getBlob,
  getStorage 
} from 'firebase/storage';
import type { 
  JobPreferences, 
  Resume,
  ResumeUploadSource, 
  Application, 
  JobListing, 
  JobSearch,
  Profile, 
  UserData 
} from '../models/UserData';

interface UploadResult {
  success: boolean;
  fileUrl?: string;
  downloadUrl?: string;
  uploadMethod?: 'gcs' | 'firebase' | 'dataurl' | 'failed';
  error?: string;
}

interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const GCS_PRIMARY_BUCKET = 'gethired-resume-uploads';

const defaultJobPreferences: JobPreferences = {
  titles: [],
  locations: [],
  skills: [],
  salaryRange: { min: 0, max: 100000 },
  jobType: 'Full-time',
  seniority: 'Junior',
  searchSchedule: {
    enabled: false,
    frequency: 'Daily',
    notificationType: 'Email',
    quietHours: {
      start: '22:00',
      end: '08:00'
    },
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  },
  companies: [],
  other: '',
  includeKeywords: [],
  excludeKeywords: []
};

const getCurrentUserId = () => {
  const user = auth.currentUser;
  if (!user) throw new Error('User must be authenticated');
  return user.uid;
};

const generateSafeFileName = (fileName: string, userId: string): string => {
  const timestamp = Date.now();
  const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `resumes/${userId}/${timestamp}_${safeFileName}`;
};

const convertToDirectGCSUrl = (firebaseUrl: string): string => {
  try {
    if (firebaseUrl.includes('storage.googleapis.com') && !firebaseUrl.includes('firebasestorage.googleapis.com')) {
      return firebaseUrl;
    }
    
    if (firebaseUrl.includes('firebasestorage.googleapis.com')) {
      const urlObj = new URL(firebaseUrl);
      const pathMatch = urlObj.pathname.match(/\/v0\/b\/(.+?)\/o\/(.+)/);
      if (pathMatch) {
        const [, bucket, encodedPath] = pathMatch;
        const decodedPath = decodeURIComponent(encodedPath);
        return `https://storage.googleapis.com/${bucket}/${decodedPath}`;
      }
    }

    return firebaseUrl;
  } catch (error) {
    console.error('Failed to convert URL:', error);
    return firebaseUrl;
  }
};

const uploadToGCSBucket = async (file: File, userId: string): Promise<UploadResult> => {
  try {
    const uploadPath = generateSafeFileName(file.name, userId);
    const gcsStorage = getStorage(undefined, `gs://${GCS_PRIMARY_BUCKET}`);
    const storageRef = ref(gcsStorage, uploadPath);
    
    const uploadResult = await uploadBytes(storageRef, file, {
      contentType: file.type,
      cacheControl: 'public, max-age=31536000',
      customMetadata: {
        'publicAccess': 'true',
        'uploadedBy': userId,
        'uploadTimestamp': Date.now().toString()
      }
    });
    
    const downloadUrl = await getDownloadURL(uploadResult.ref);
    const publicUrl = `https://storage.googleapis.com/${GCS_PRIMARY_BUCKET}/${uploadPath}`;
    
    return {
      success: true,
      fileUrl: downloadUrl,
      downloadUrl: publicUrl,
      uploadMethod: 'gcs'
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'GCS upload failed',
      uploadMethod: 'failed'
    };
  }
};

const uploadToFirebaseStorage = async (file: File, userId: string): Promise<UploadResult> => {
  try {
    const uploadPath = generateSafeFileName(file.name, userId);
    const storageRef = ref(storage, uploadPath);
    const uploadResult = await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(uploadResult.ref);
    
    return {
      success: true,
      fileUrl: downloadUrl,
      downloadUrl: downloadUrl,
      uploadMethod: 'firebase'
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Firebase upload failed',
      uploadMethod: 'failed'
    };
  }
};

const createDataUrlFallback = async (file: File): Promise<UploadResult> => {
  try {
    const reader = new FileReader();
    const dataUrlPromise = new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    
    const dataUrl = await dataUrlPromise;
    
    return {
      success: true,
      fileUrl: dataUrl,
      downloadUrl: dataUrl,
      uploadMethod: 'dataurl'
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Data URL creation failed',
      uploadMethod: 'failed'
    };
  }
};

const uploadFileWithFallback = async (file: File, userId: string): Promise<UploadResult> => {
  // GCS-first strategy
  const gcsResult = await uploadToGCSBucket(file, userId);
  if (gcsResult.success) {
    return gcsResult;
  }
  
  // Firebase fallback
  const firebaseResult = await uploadToFirebaseStorage(file, userId);
  if (firebaseResult.success) {
    return firebaseResult;
  }
  
  // Data URL fallback
  const dataUrlResult = await createDataUrlFallback(file);
  if (dataUrlResult.success) {
    return dataUrlResult;
  }
  
  return {
    success: false,
    error: `All upload strategies failed. GCS: ${gcsResult.error}, Firebase: ${firebaseResult.error}, DataURL: ${dataUrlResult.error}`,
    uploadMethod: 'failed'
  };
};

export const uploadResume = async (
  userId: string, 
  file: File, 
  metadata?: Partial<Resume['metadata']>
): Promise<ServiceResponse<Resume & { id: string }>> => {
  try {
    const currentUserId = getCurrentUserId();
    if (currentUserId !== userId) {
      throw new Error('Unauthorized access to user data');
    }

    const uploadResult = await uploadFileWithFallback(file, userId);
    
    if (!uploadResult.success) {
      return {
        success: false,
        error: uploadResult.error || 'Upload failed'
      };
    }

    const meta: Resume['metadata'] = {
      title: metadata?.title || file.name,
      uploadSource: (uploadResult.uploadMethod === 'firebase' ? 'firebase' : 
                    uploadResult.uploadMethod === 'gcs' ? 'public' : 
                    uploadResult.uploadMethod === 'dataurl' ? 'base64' : 'manual') as ResumeUploadSource,
      isOriginal: metadata?.isOriginal ?? true,
      keywords: metadata?.keywords || [],
      ...(metadata?.description && { description: metadata.description }),
      ...(metadata?.relatedJobId && { relatedJobId: metadata.relatedJobId }),
      ...(metadata?.relatedCompany && { relatedCompany: metadata.relatedCompany }),
      ...(metadata?.relatedRole && { relatedRole: metadata.relatedRole }),
      ...(metadata?.originalResumeId && { originalResumeId: metadata.originalResumeId }),
      ...(metadata?.customizations && { customizations: metadata.customizations })
    };

    const resumeData: Resume = {
      fileUrl: uploadResult.fileUrl!,
      publicUrl: uploadResult.downloadUrl || uploadResult.fileUrl!,
      createdAt: new Date().toISOString(),
      type: meta.isOriginal ? 'original' : 'tailored',
      metadata: meta
    };

    try {
      const resumesRef = collection(db, 'users', userId, 'resumes');
      const docRef = await addDoc(resumesRef, resumeData);

      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserData;
        const updatedResumes = [...(userData.resumes || []), { ...resumeData, id: docRef.id }];
        
        await setDoc(userRef, { 
          resumes: updatedResumes 
        }, { merge: true });
      }
      
      return { 
        success: true, 
        data: { id: docRef.id, ...resumeData } 
      };
    } catch {
      return { 
        success: true, 
        data: { id: `temp_${Date.now()}`, ...resumeData } 
      };
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

export const getUserResumes = async (userId: string): Promise<ServiceResponse<(Resume & { id: string })[]>> => {
  try {
    const currentUserId = getCurrentUserId();
    if (currentUserId !== userId) {
      throw new Error('Unauthorized access to user data');
    }
    
    const resumesRef = collection(db, 'users', userId, 'resumes');
    const snapshot = await getDocs(resumesRef);
    
    const resumes = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data() as Resume
    }));

    return { success: true, data: resumes };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      data: [] 
    };
  }
};

export const updateUserPreferences = async (
  userId: string, 
  preferences: JobPreferences
): Promise<ServiceResponse<JobPreferences>> => {
  try {
    const currentUserId = getCurrentUserId();
    if (currentUserId !== userId) {
      throw new Error('Unauthorized access to user data');
    }
    
    const userRef = doc(db, 'users', userId);
    
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      throw new Error('User document not found');
    }
    
    await setDoc(userRef, {
      jobPreferences: preferences
    }, { merge: true });

    if (preferences.searchSchedule?.enabled) {
      try {
        const { createScheduledSearch, getUserScheduledSearches, updateScheduledSearch } = await import('./scheduledSearchService');
        
        const existingSearches = await getUserScheduledSearches(userId);
        
        if (existingSearches.success && existingSearches.data && existingSearches.data.length > 0) {
          const existing = existingSearches.data[0];
          await updateScheduledSearch({
            scheduleId: existing.id!,
            preferences,
            schedule: preferences.searchSchedule
          });
        } else {
          await createScheduledSearch({
            userId,
            preferences,
            schedule: preferences.searchSchedule
          });
        }
      } catch (scheduleError) {
        console.error('Failed to update scheduled search:', scheduleError);
      }
    }
    
    return { success: true, data: preferences };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const getUserPreferences = async (userId: string): Promise<ServiceResponse<JobPreferences>> => {
  try {
    const currentUserId = getCurrentUserId();
    if (currentUserId !== userId) {
      throw new Error('Unauthorized access to user data');
    }
    
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data() as UserData;
      return { 
        success: true, 
        data: userData.jobPreferences || defaultJobPreferences 
      };
    }
    
    return { 
      success: true,
      data: defaultJobPreferences
    };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

export const initializeUserData = async (
  user: { uid: string; displayName: string | null; email: string | null; }, 
  userRef: DocumentReference<DocumentData>
): Promise<{ success: boolean; error?: string }> => {
  try {
    const userData: UserData = {
      profile: {
        name: user.displayName || "",
        email: user.email || "",
        phone: "",
        createdAt: new Date().toISOString(),
      },
      jobPreferences: defaultJobPreferences,
      applications: [],
      resumes: [],
      jobListings: [],
      jobSearches: []
    };

    await setDoc(userRef, userData);
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

export const getUserData = async (userId: string): Promise<ServiceResponse<UserData>> => {
  try {
    const currentUserId = getCurrentUserId();
    if (currentUserId !== userId) {
      throw new Error('Unauthorized access to user data');
    }
    
    const userRef = doc(db, 'users', userId);
    const docSnap = await getDoc(userRef);
    
    if (docSnap.exists()) {
      return { success: true, data: docSnap.data() as UserData };
    } else {
      return { 
        success: false, 
        error: 'User data not found' 
      };
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

export const updateUserProfile = async (
  userId: string, 
  profile: Partial<Profile>
): Promise<ServiceResponse<Profile>> => {
  try {
    const currentUserId = getCurrentUserId();
    if (currentUserId !== userId) {
      throw new Error('Unauthorized access to user data');
    }
    
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error('User document not found');
    }
    
    const existingData = userDoc.data() as UserData;
    const updatedProfile = {
      ...existingData.profile,
      ...profile
    };
    
    await setDoc(userRef, { profile: updatedProfile }, { merge: true });
    
    return { success: true, data: updatedProfile };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

export const addApplication = async (
  userId: string, 
  application: Application
): Promise<ServiceResponse<Application & { id: string }>> => {
  try {
    const currentUserId = getCurrentUserId();
    if (currentUserId !== userId) {
      throw new Error('Unauthorized access to user data');
    }
    
    const applicationsRef = collection(db, 'users', userId, 'applications');
    const docRef = await addDoc(applicationsRef, {
      ...application,
      updatedAt: new Date().toISOString()
    });
    
    return { success: true, data: { id: docRef.id, ...application } };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

export const updateApplication = async (
  userId: string, 
  applicationId: string, 
  application: Partial<Application>
): Promise<ServiceResponse<void>> => {
  try {
    const currentUserId = getCurrentUserId();
    if (currentUserId !== userId) {
      throw new Error('Unauthorized access to user data');
    }
    
    const applicationRef = doc(db, 'users', userId, 'applications', applicationId);
    await setDoc(applicationRef, {
      ...application,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

export const getApplications = async (userId: string): Promise<ServiceResponse<(Application & { id: string })[]>> => {
  try {
    const currentUserId = getCurrentUserId();
    if (currentUserId !== userId) {
      throw new Error('Unauthorized access to user data');
    }
    
    const applicationsRef = collection(db, 'users', userId, 'applications');
    const snapshot = await getDocs(applicationsRef);
    const applications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data() as Application
    }));
    
    return { success: true, data: applications };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      data: [] 
    };
  }
};

export const addJobListing = async (
  userId: string, 
  jobListing: JobListing
): Promise<ServiceResponse<JobListing & { id: string }>> => {
  try {
    const currentUserId = getCurrentUserId();
    if (currentUserId !== userId) {
      throw new Error('Unauthorized access to user data');
    }
    
    const jobListingsRef = collection(db, 'users', userId, 'jobListings');
    const docRef = await addDoc(jobListingsRef, jobListing);
    
    return { success: true, data: { id: docRef.id, ...jobListing } };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

export const getJobListings = async (userId: string): Promise<ServiceResponse<(JobListing & { id: string })[]>> => {
  try {
    const currentUserId = getCurrentUserId();
    if (currentUserId !== userId) {
      throw new Error('Unauthorized access to user data');
    }
    
    const jobListingsRef = collection(db, 'users', userId, 'jobListings');
    const snapshot = await getDocs(jobListingsRef);
    const jobListings = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data() as JobListing
    }));
    
    return { success: true, data: jobListings };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      data: [] 
    };
  }
};

export const addJobSearch = async (
  userId: string, 
  jobSearch: JobSearch
): Promise<ServiceResponse<JobSearch & { id: string }>> => {
  try {
    const currentUserId = getCurrentUserId();
    if (currentUserId !== userId) {
      throw new Error('Unauthorized access to user data');
    }
    
    const jobSearchesRef = collection(db, 'users', userId, 'jobSearches');
    const docRef = await addDoc(jobSearchesRef, {
      ...jobSearch,
      initiatedAt: new Date().toISOString()
    });
    
    return { success: true, data: { id: docRef.id, ...jobSearch } };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

export const getJobSearches = async (userId: string): Promise<ServiceResponse<(JobSearch & { id: string })[]>> => {
  try {
    const currentUserId = getCurrentUserId();
    if (currentUserId !== userId) {
      throw new Error('Unauthorized access to user data');
    }
    
    const jobSearchesRef = collection(db, 'users', userId, 'jobSearches');
    const snapshot = await getDocs(jobSearchesRef);
    const jobSearches = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data() as JobSearch
    }));
    
    return { success: true, data: jobSearches };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      data: [] 
    };
  }
};

export const getPublicUrlFromDownloadUrl = (downloadUrl: string): string => {
  return convertToDirectGCSUrl(downloadUrl);
};

export const getBestDownloadUrl = (originalUrl: string): string => {
  if (originalUrl.includes('firebasestorage.googleapis.com') && originalUrl.includes('token=')) {
    return originalUrl;
  }
  return convertToDirectGCSUrl(originalUrl);
};

export const getResumeContent = async (resumeUrl: string): Promise<{
  success: boolean;
  data?: Blob;
  downloadUrl?: string;
  error?: string;
}> => {
  try {
    if (resumeUrl.includes('firebasestorage.googleapis.com')) {
      try {
        const url = new URL(resumeUrl);
        const pathParts = url.pathname.split('/');
        
        if (pathParts.length >= 4 && pathParts[1] === 'v0' && pathParts[2] === 'b') {
          const encodedPath = pathParts.slice(5).join('/');
          const decodedPath = decodeURIComponent(encodedPath);
          
          const storageRef = ref(storage, decodedPath);
          const blob = await getBlob(storageRef);
          
          return {
            success: true,
            data: blob,
            downloadUrl: resumeUrl
          };
        }
      } catch {
        return {
          success: true,
          downloadUrl: resumeUrl,
          error: 'File content not accessible from browser, but download URL available for server-side processing'
        };
      }
    }
    
    return {
      success: true,
      downloadUrl: resumeUrl,
      error: 'File accessible via server-side processing only'
    };
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

export const getResumeUrlForContext = (resume: Resume): string => {
  return resume.fileUrl;
};

export const uploadResumeWithFallback = uploadResume;
