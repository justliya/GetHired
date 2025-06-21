import { db, auth, storage } from '../firebase';
import { doc, setDoc, getDoc, collection, addDoc, getDocs, DocumentReference, type DocumentData } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { 
  JobPreferences, 
  Resume, 
  Application, 
  JobListing, 
  JobSearch,
  Profile, 
  UserData 
} from '../models/UserData';

// Default data structures
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

export const updateUserPreferences = async (userId: string, preferences: JobPreferences) => {
  try {
    const currentUserId = getCurrentUserId();
    if (currentUserId !== userId) {
      throw new Error('Unauthorized access to user data');
    }
    
    const userRef = doc(db, 'users', userId);
    
    // Get existing user data
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      throw new Error('User document not found');
    }
    
    // Update only the jobPreferences field
    await setDoc(userRef, {
      jobPreferences: preferences
    }, { merge: true });

    // Handle scheduled search if enabled
    if (preferences.searchSchedule?.enabled) {
      try {
        const { createScheduledSearch, getUserScheduledSearches, updateScheduledSearch } = await import('./scheduledSearchService');
        
        // Check if user already has a scheduled search
        const existingSearches = await getUserScheduledSearches(userId);
        
        if (existingSearches.success && existingSearches.data && existingSearches.data.length > 0) {
          // Update existing scheduled search
          const existing = existingSearches.data[0];
          await updateScheduledSearch({
            scheduleId: existing.id!,
            preferences,
            schedule: preferences.searchSchedule
          });
        } else {
          // Create new scheduled search
          await createScheduledSearch({
            userId,
            preferences,
            schedule: preferences.searchSchedule
          });
        }
      } catch (scheduleError) {
        console.error('Failed to update scheduled search:', scheduleError);
        // Don't fail the entire preference update if scheduled search fails
      }
    }
    
    return { success: true, data: preferences };
  } catch (error) {
    console.error('Failed to update user preferences:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const getUserPreferences = async (userId: string) => {
  try {
    const currentUserId = getCurrentUserId();
    if (currentUserId !== userId) {
      throw new Error('Unauthorized access to user data');
    }
    
    // Get from main user document
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data() as UserData;
      return { 
        success: true, 
        data: userData.jobPreferences || defaultJobPreferences 
      };
    }
    
    // Return default if user doesn't exist
    return { 
      success: true,
      data: defaultJobPreferences
    };
  } catch (error) {
    console.error('Error getting preferences:', error);
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

    // Create main user document
    await setDoc(userRef, userData);

    console.log('Successfully initialized user data structure');
    return { success: true };
  } catch (error) {
    console.error('Failed to initialize user data:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

export const uploadResume = async (userId: string, file: File, metadata?: Partial<Resume['metadata']>) => {
  try {
    const currentUserId = getCurrentUserId();
    if (currentUserId !== userId) {
      throw new Error('Unauthorized access to user data');
    }

    // Upload file to storage with timestamp
    const timestamp = Date.now();
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storageRef = ref(storage, `resumes/${userId}/${timestamp}_${safeFileName}`);
    
    const uploadResult = await uploadBytes(storageRef, file);
    const fileUrl = await getDownloadURL(uploadResult.ref);

    // Prepare metadata
    const meta: Resume['metadata'] = {
      title: metadata?.title || file.name,
      uploadSource: metadata?.uploadSource || 'manual',
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
      fileUrl,
      publicUrl: getPublicUrlFromDownloadUrl(fileUrl), // Store both URLs
      createdAt: new Date().toISOString(),
      type: meta.isOriginal ? 'original' : 'tailored',
      metadata: meta
    };

    // Save to resumes subcollection
    const resumesRef = collection(db, 'users', userId, 'resumes');
    const docRef = await addDoc(resumesRef, resumeData);

    // Also update the resumes array in main document
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data() as UserData;
      const updatedResumes = [...(userData.resumes || []), { ...resumeData, id: docRef.id }];
      
      await setDoc(userRef, { 
        resumes: updatedResumes 
      }, { merge: true });
    }

    return { success: true, data: { id: docRef.id, ...resumeData } };
  } catch (error) {
    console.error('Failed to upload resume:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

export const getUserResumes = async (userId: string) => {
  try {
    const currentUserId = getCurrentUserId();
    if (currentUserId !== userId) {
      throw new Error('Unauthorized access to user data');
    }
    
    // Get from subcollection
    const resumesRef = collection(db, 'users', userId, 'resumes');
    const snapshot = await getDocs(resumesRef);
    
    const resumes = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data() as Resume
    }));

    return { success: true, data: resumes };
  } catch (error) {
    console.error('Failed to fetch user resumes:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      data: [] 
    };
  }
};

// Applications
export const addApplication = async (userId: string, application: Application) => {
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
    console.error('Failed to add application:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

export const updateApplication = async (userId: string, applicationId: string, application: Partial<Application>) => {
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
    console.error('Failed to update application:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

export const getApplications = async (userId: string) => {
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
    console.error('Failed to fetch applications:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      data: [] 
    };
  }
};

// Job Listings
export const addJobListing = async (userId: string, jobListing: JobListing) => {
  try {
    const currentUserId = getCurrentUserId();
    if (currentUserId !== userId) {
      throw new Error('Unauthorized access to user data');
    }
    
    const jobListingsRef = collection(db, 'users', userId, 'jobListings');
    const docRef = await addDoc(jobListingsRef, jobListing);
    
    return { success: true, data: { id: docRef.id, ...jobListing } };
  } catch (error) {
    console.error('Failed to add job listing:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

export const getJobListings = async (userId: string) => {
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
    console.error('Failed to fetch job listings:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      data: [] 
    };
  }
};

// Job Searches
export const addJobSearch = async (userId: string, jobSearch: JobSearch) => {
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
    console.error('Failed to add job search:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

export const getJobSearches = async (userId: string) => {
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
    console.error('Failed to fetch job searches:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      data: [] 
    };
  }
};

// User Profile Update
export const updateUserProfile = async (userId: string, profile: Partial<Profile>) => {
  try {
    const currentUserId = getCurrentUserId();
    if (currentUserId !== userId) {
      throw new Error('Unauthorized access to user data');
    }
    
    const userRef = doc(db, 'users', userId);
    
    // Get existing data to merge properly
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
    console.error('Failed to update profile:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

// Get complete user data
export const getUserData = async (userId: string) => {
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
    console.error('Failed to get user data:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

// Utility function to convert Firebase download URL to public URL for agent processing
export const getPublicUrlFromDownloadUrl = (downloadUrl: string): string => {
  try {
    // Firebase Storage download URLs have the format:
    // https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?alt=media&token={token}
    // Public URLs have the format:
    // https://storage.googleapis.com/{bucket}/{path}
    
    const url = new URL(downloadUrl);
    
    // Check if it's a Firebase Storage download URL
    if (url.hostname === 'firebasestorage.googleapis.com') {
      // Extract bucket and path from the URL
      const pathParts = url.pathname.split('/');
      if (pathParts.length >= 4 && pathParts[1] === 'v0' && pathParts[2] === 'b') {
        const bucket = pathParts[3];
        const encodedPath = pathParts.slice(5).join('/'); // Skip 'v0', 'b', bucket, 'o'
        const decodedPath = decodeURIComponent(encodedPath);
        
        // Return public URL format
        return `https://storage.googleapis.com/${bucket}/${decodedPath}`;
      }
    }
    
    // If it's already a public URL or not a Firebase Storage URL, return as is
    return downloadUrl;
  } catch (error) {
    console.warn('Failed to convert download URL to public URL:', error);
    return downloadUrl; // Return original URL as fallback
  }
};

// Enhanced function to get user resumes with public URL option
export const getUserResumesWithPublicUrls = async (userId: string, usePublicUrls: boolean = false) => {
  try {
    const result = await getUserResumes(userId);
    
    if (!result.success || !result.data) {
      return result;
    }
    
    // If public URLs are requested, convert download URLs to public URLs
    if (usePublicUrls) {
      const resumesWithPublicUrls = result.data.map(resume => ({
        ...resume,
        fileUrl: getPublicUrlFromDownloadUrl(resume.fileUrl),
        // Add a separate field for the public URL to maintain both
        publicUrl: getPublicUrlFromDownloadUrl(resume.fileUrl)
      }));
      
      return { success: true, data: resumesWithPublicUrls };
    }
    
    return result;
  } catch (error) {
    console.error('Failed to fetch user resumes with public URLs:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      data: [] 
    };
  }
};
