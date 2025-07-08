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
  getBlob
} from 'firebase/storage';
import type { 
  JobPreferences, 
  Resume,
  Application, 
  JobListing, 
  JobSearch,
  Profile, 
  UserData 
} from '../types';

interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

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

    // Upload to Firebase Storage
    const uploadPath = generateSafeFileName(file.name, userId);
    const storageRef = ref(storage, uploadPath);
    const uploadResult = await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(uploadResult.ref);

    // Create resume metadata
    const meta: Resume['metadata'] = {
      title: metadata?.title || file.name,
      uploadSource: 'manual',
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
      fileUrl: downloadUrl,
      publicUrl: downloadUrl, // Same URL for simplicity
      createdAt: new Date().toISOString(),
      type: meta.isOriginal ? 'original' : 'tailored',
      metadata: meta
    };

    // Save to Firestore
    const resumesRef = collection(db, 'users', userId, 'resumes');
    const docRef = await addDoc(resumesRef, resumeData);

    return { 
      success: true, 
      data: { id: docRef.id, ...resumeData } 
    };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to upload resume' 
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
      error: error instanceof Error ? error.message : 'Failed to get resumes',
      data: [] 
    };
  }
};

export const saveTailoredResume = async (
  userId: string,
  resumeData: {
    resumeText: string;
    documentUrl?: string;
    authenticatedUrl?: string;
    signedUrl?: string;
    publicUrl?: string;
    firebaseUrl?: string;
    gcsUrl?: string;
    filename?: string;
    jobTitle?: string;
    jobCompany?: string;
    originalResumeId?: string;
    status?: string;
  }
): Promise<ServiceResponse<Resume & { id: string }>> => {
  try {
    const currentUserId = getCurrentUserId();
    if (currentUserId !== userId) {
      throw new Error('Unauthorized access to user data');
    }

    // Use the best available URL (prefer signed/authenticated URLs for downloads)
    const publicUrl = resumeData.publicUrl || 
                     resumeData.documentUrl || 
                     resumeData.gcsUrl || 
                     resumeData.firebaseUrl || 
                     '';
                     
    const downloadUrl = resumeData.authenticatedUrl || 
                       resumeData.signedUrl || 
                       publicUrl;

    // Create resume metadata
    const metadata: Resume['metadata'] = {
      title: resumeData.jobTitle && resumeData.jobCompany 
        ? `Resume for ${resumeData.jobTitle} at ${resumeData.jobCompany}`
        : resumeData.filename || 'Tailored Resume',
      uploadSource: 'ai_generated',
      isOriginal: false,
      keywords: [resumeData.jobTitle, resumeData.jobCompany].filter(Boolean) as string[],
      relatedCompany: resumeData.jobCompany,
      relatedRole: resumeData.jobTitle,
      originalResumeId: resumeData.originalResumeId,
      customizations: ['AI-tailored resume']
    };

    // Create the resume document
    const newResume: Resume = {
      fileUrl: downloadUrl || publicUrl || `data:text/plain;charset=utf-8,${encodeURIComponent(resumeData.resumeText)}`,
      publicUrl: publicUrl,
      createdAt: new Date().toISOString(),
      type: 'tailored',
      metadata
    };

    // Save to Firestore
    const resumesRef = collection(db, 'users', userId, 'resumes');
    const docRef = await addDoc(resumesRef, newResume);

    return {
      success: true,
      data: { id: docRef.id, ...newResume }
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save tailored resume'
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
    
    await setDoc(userRef, {
      jobPreferences: preferences
    }, { merge: true });

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
    
    return { success: true, data: { ...jobListing, id: docRef.id } };
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
      ...(doc.data() as Omit<JobListing, 'id'>),
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


// Simple helper to get the resume URL for the agent
export const getResumeUrlForContext = (resume: Resume): string => {
  // Return the public URL which should work for the agent
  return resume.publicUrl || resume.fileUrl;
};

// Alias for compatibility
export const uploadResumeWithFallback = uploadResume;
