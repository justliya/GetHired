import { db, auth, storage } from '../firebase';
import { doc, setDoc, getDoc, collection, addDoc, deleteDoc, getDocs, DocumentReference, type DocumentData } from 'firebase/firestore';
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

const defaultApplications: Application[] = [
  {
    company: 'TechCorp',
    role: 'Frontend Developer',
    status: 'applied',
    resumeRef: 'resume1',
    notes: 'Initial application submitted',
    updatedAt: new Date().toISOString()
  }
];

const defaultResumes: Resume[] = [
  {
    fileUrl: 'https://example.com/default-resume.pdf',
    createdAt: new Date().toISOString(),
    type: 'original',
    metadata: {
      title: 'Initial Resume',
      description: 'General purpose resume',
      keywords: ['JavaScript', 'React', 'TypeScript'],
      uploadSource: 'manual',
      isOriginal: true
    }
  }
];

const defaultJobListings: JobListing[] = [
  {
    title: 'Frontend Developer',
    company: 'TechCorp',
    location: 'Remote',
    postedDate: new Date().toISOString(),
    description: 'Looking for a frontend developer with React experience',
    url: 'https://example.com/job1',
    salary: '$100k-$150k',
    employmentType: 'Full-time'
  }
];

const defaultJobSearches: JobSearch[] = [
  {
    preferences: defaultJobPreferences,
    initiatedAt: new Date().toISOString(),
    resultsCount: 0,
    status: 'completed'
  }
];

const getCurrentUserId = () => {
  const user = auth.currentUser;
  if (!user) throw new Error('User must be authenticated');
  return user.uid;
};

export const updateUserPreferences = async (userId: string, preferences: JobPreferences) => {
  try {
    getCurrentUserId(); // Verify user is authenticated
    const userRef = doc(db, 'users', userId);
    const dataToSave = {
      jobPreferences: {
        ...preferences,
        updatedAt: new Date().toISOString()
      }
    };
    await setDoc(userRef, dataToSave, { merge: true });
    return { success: true, data: preferences };
  } catch (error) {
    console.error('Failed to update user preferences:', error);
    return { success: false, error };
  }
};

export const getUserPreferences = async (userId: string) => {
  try {
    getCurrentUserId(); // Verify user is authenticated
    const preferencesRef = doc(db, 'users', userId, 'preferences', 'jobSearch');
    const docSnap = await getDoc(preferencesRef);
    
    if (docSnap.exists()) {
      return { success: true, data: docSnap.data() as JobPreferences };
    } else {
      // Return default preferences if none exist
      return { 
        success: true,
        data: {
          titles: [],
          locations: [],
          salaryRange: { min: 0, max: 200000 },
          jobType: 'Full-time' as const,
          seniority: 'Mid' as const,
          other: '',
          includeKeywords: [],
          excludeKeywords: [],
          searchSchedule: {
            enabled: false,
            frequency: 'Daily' as const,
            customSchedule: '09:00',
            notificationType: 'Email' as const,
            quietHours: {
              start: '22:00',
              end: '08:00'
            },
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
          }
        }
      };
    }
  } catch (error) {
    console.error('Error getting preferences:', error);
    return { success: false, error };
  }
};

export const initializeUserData = async (user: { uid: string; displayName: string | null; email: string | null; }, userRef: DocumentReference<DocumentData, DocumentData>): Promise<{ success: boolean; error?: Error }> => {
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

    // Initialize empty subcollections for future use
    const collections = ['applications', 'resumes', 'jobListings', 'jobSearches'];
    await Promise.all(collections.map(async (collectionName) => {
      const dummyDoc = doc(collection(db, 'users', user.uid, collectionName), '_dummy');
      await setDoc(dummyDoc, { _dummy: true });
      await deleteDoc(dummyDoc);
    }));

    console.log('Successfully initialized user data structure');
    return { success: true };
  } catch (error) {
    console.error('Failed to initialize user data:', error);
    return { success: false, error: error instanceof Error ? error : new Error('Unknown error') };
  }
};

export const uploadResume = async (userId: string, file: File, metadata?: Partial<Resume['metadata']>) => {
  try {
    getCurrentUserId(); 

    // Upload file to storage
    const storageRef = ref(storage, `resumes/${userId}/${file.name}`);
    await uploadBytes(storageRef, file);
    const fileUrl = await getDownloadURL(storageRef);


    const meta = {
      title: metadata?.title || file.name,
      description: metadata?.description,
      lastModified: new Date(file.lastModified).toISOString(),
      uploadSource: metadata?.uploadSource || 'manual',
      isOriginal: metadata?.isOriginal ?? true,
      relatedJobId: metadata?.relatedJobId,
      relatedCompany: metadata?.relatedCompany,
      relatedRole: metadata?.relatedRole,
      originalResumeId: metadata?.originalResumeId,
      customizations: metadata?.customizations || [],
      keywords: metadata?.keywords || []
    };
    const cleanMetadata = Object.fromEntries(
      Object.entries(meta).filter(([, v]) => v !== undefined)
    ) as Resume['metadata'];

    const resumeData: Resume = {
      fileUrl,
      createdAt: new Date().toISOString(),
      type: 'original',
      metadata: cleanMetadata
    };

    const userRef = doc(db, "users", userId);
    const docSnap = await getDoc(userRef);
    
    const data: UserData = (docSnap.data() as UserData)
    data.resumes.push(resumeData)
    const updatedData = data
    await setDoc(userRef,updatedData)

    return { success: true, data: { id: userRef.id, ...resumeData } };
  } catch (error) {
    console.error('Failed to upload resume:', error);
    return { success: false, error };
  }
};

export const getUserResumes = async (userId: string) => {
  try {
    getCurrentUserId(); // Verify user is authenticated
    const resumesRef = collection(db, 'users', userId, 'resumes');
    const snapshot = await getDocs(resumesRef);
    
    const resumes = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data() as Resume
    }));

    return { success: true, data: resumes };
  } catch (error) {
    console.error('Failed to fetch user resumes:', error);
    return { success: false, error };
  }
};

// Applications
export const addApplication = async (userId: string, application: Application) => {
  try {
    getCurrentUserId();
    const applicationsRef = collection(db, 'users', userId, 'applications');
    const docRef = await addDoc(applicationsRef, {
      ...application,
      updatedAt: new Date().toISOString()
    });
    return { success: true, data: { id: docRef.id, ...application } };
  } catch (error) {
    console.error('Failed to add application:', error);
    return { success: false, error };
  }
};

export const updateApplication = async (userId: string, applicationId: string, application: Partial<Application>) => {
  try {
    getCurrentUserId();
    const applicationRef = doc(db, 'users', userId, 'applications', applicationId);
    await setDoc(applicationRef, {
      ...application,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return { success: true };
  } catch (error) {
    console.error('Failed to update application:', error);
    return { success: false, error };
  }
};

// Job Listings
export const addJobListing = async (userId: string, jobListing: JobListing) => {
  try {
    getCurrentUserId();
    const jobListingsRef = collection(db, 'users', userId, 'jobListings');
    const docRef = await addDoc(jobListingsRef, jobListing);
    return { success: true, data: { id: docRef.id, ...jobListing } };
  } catch (error) {
    console.error('Failed to add job listing:', error);
    return { success: false, error };
  }
};

export const getJobListings = async (userId: string) => {
  try {
    getCurrentUserId();
    const jobListingsRef = collection(db, 'users', userId, 'jobListings');
    const snapshot = await getDocs(jobListingsRef);
    const jobListings = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data() as JobListing
    }));
    return { success: true, data: jobListings };
  } catch (error) {
    console.error('Failed to fetch job listings:', error);
    return { success: false, error };
  }
};

// Job Searches
export const addJobSearch = async (userId: string, jobSearch: JobSearch) => {
  try {
    getCurrentUserId();
    const jobSearchesRef = collection(db, 'users', userId, 'jobSearches');
    const docRef = await addDoc(jobSearchesRef, {
      ...jobSearch,
      initiatedAt: new Date().toISOString()
    });
    return { success: true, data: { id: docRef.id, ...jobSearch } };
  } catch (error) {
    console.error('Failed to add job search:', error);
    return { success: false, error };
  }
};

export const getJobSearches = async (userId: string) => {
  try {
    getCurrentUserId();
    const jobSearchesRef = collection(db, 'users', userId, 'jobSearches');
    const snapshot = await getDocs(jobSearchesRef);
    const jobSearches = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data() as JobSearch
    }));
    return { success: true, data: jobSearches };
  } catch (error) {
    console.error('Failed to fetch job searches:', error);
    return { success: false, error };
  }
};

// User Profile Update
export const updateUserProfile = async (userId: string, profile: Partial<Profile>) => {
  try {
    getCurrentUserId();
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, { profile }, { merge: true });
    return { success: true };
  } catch (error) {
    console.error('Failed to update profile:', error);
    return { success: false, error };
  }
};
