import { db } from '../firebase';
import { auth } from '../firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  query, 
  where,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import type { JobPreferences, SearchSchedule } from '../models/UserData';

const COLLECTION_NAME = 'scheduledSearches';

const getCurrentUserId = () => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User must be authenticated to access scheduled searches');
  }
  return user.uid;
};

const verifyUserAccess = (userId: string) => {
  const currentUserId = getCurrentUserId();
  if (currentUserId !== userId) {
    throw new Error('Unauthorized access to user data');
  }
};

export const isUserAuthenticated = (): boolean => {
  return auth.currentUser !== null;
};

export const getCurrentUserIdSafe = (): string | null => {
  return auth.currentUser?.uid || null;
};

export const testFirebaseConnection = async (): Promise<{
  success: boolean;
  authenticated: boolean;
  userId?: string;
  error?: string;
}> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return {
        success: false,
        authenticated: false,
        error: 'User not authenticated'
      };
    }

    try {
      const testQuery = query(
        collection(db, COLLECTION_NAME),
        where('userId', '==', user.uid)
      );
      
      await getDocs(testQuery);
      
      return {
        success: true,
        authenticated: true,
        userId: user.uid
      };
    } catch (firestoreError) {
      // If it's a permission error, that's expected without rules
      if (firestoreError instanceof Error && firestoreError.message.includes('permission')) {
        return {
          success: false,
          authenticated: true,
          userId: user.uid,
          error: 'Firestore rules not configured yet - add security rules to Firebase Console'
        };
      }
      throw firestoreError;
    }
  } catch (error) {
    return {
      success: false,
      authenticated: auth.currentUser !== null,
      userId: auth.currentUser?.uid,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

export interface ScheduledSearch {
  id?: string;
  userId: string;
  preferences: JobPreferences;
  schedule: SearchSchedule;
  status: 'active' | 'paused' | 'disabled';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastRunAt?: Timestamp;
  nextRunAt?: Timestamp;
  cloudTaskId?: string;
}

export interface ScheduleCreateRequest {
  userId: string;
  preferences: JobPreferences;
  schedule: SearchSchedule;
}

export interface ScheduleUpdateRequest {
  scheduleId: string;
  preferences?: JobPreferences;
  schedule?: SearchSchedule;
  status?: 'active' | 'paused' | 'disabled';
}

const retryFirebaseOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 2,
  delay: number = 1000
): Promise<T> => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      if (error instanceof Error && 
          (error.message.includes('unavailable') || 
           error.message.includes('deadline-exceeded') ||
           error.message.includes('internal'))) {
        console.warn(`Firebase operation failed, retrying... (attempt ${attempt + 1}/${maxRetries + 1})`);
        await new Promise(resolve => setTimeout(resolve, delay * (attempt + 1)));
      } else {
        throw error;
      }
    }
  }
  throw new Error('Max retries exceeded');
};

export const createScheduledSearch = async (request: ScheduleCreateRequest): Promise<{
  success: boolean;
  data?: ScheduledSearch;
  error?: string;
}> => {
  try {
    verifyUserAccess(request.userId);

    if (!request.schedule.enabled) {
      return { success: false, error: 'Schedule must be enabled to create' };
    }

    const scheduledSearch: Omit<ScheduledSearch, 'id'> = {
      userId: request.userId,
      preferences: request.preferences,
      schedule: request.schedule,
      status: 'active',
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
    };

    try {
      const docRef = await retryFirebaseOperation(() => 
        addDoc(collection(db, COLLECTION_NAME), scheduledSearch)
      );
      
      const cloudTaskResult = await createCloudTask(docRef.id, request.schedule);
      
      const finalResult: ScheduledSearch = {
        id: docRef.id,
        ...scheduledSearch,
      };

      if (cloudTaskResult.success && cloudTaskResult.taskId) {
        try {
          await retryFirebaseOperation(() => 
            updateDoc(docRef, {
              cloudTaskId: cloudTaskResult.taskId,
              nextRunAt: cloudTaskResult.nextRunAt
            })
          );
          
          finalResult.cloudTaskId = cloudTaskResult.taskId;
          finalResult.nextRunAt = cloudTaskResult.nextRunAt;
        } catch (updateError) {
          console.warn('Failed to update document with Cloud Task info:', updateError);
        }
      } else {
        console.warn('Failed to create Cloud Task:', cloudTaskResult.error);
      }

      return { success: true, data: finalResult };
    } catch (firestoreError) {
      if (firestoreError instanceof Error && firestoreError.message.includes('permission')) {
        return { 
          success: false, 
          error: 'Firebase security rules not configured. Please add the rules from firestore-security-rules.txt to your Firebase Console.' 
        };
      }
      throw firestoreError;
    }
  } catch (error) {
    console.error('Error creating scheduled search:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('authenticated') || error.message.includes('Unauthorized')) {
        return { 
          success: false, 
          error: 'Authentication required. Please sign in to create scheduled searches.' 
        };
      }
      if (error.message.includes('permission') || error.message.includes('denied')) {
        return { 
          success: false, 
          error: 'Permission denied. Check your Firestore security rules for the scheduledSearches collection.' 
        };
      }
    }
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

export const updateScheduledSearch = async (request: ScheduleUpdateRequest): Promise<{
  success: boolean;
  data?: ScheduledSearch;
  error?: string;
}> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, request.scheduleId);
    const docSnap = await retryFirebaseOperation(() => getDoc(docRef));

    if (!docSnap.exists()) {
      return { success: false, error: 'Scheduled search not found' };
    }

    const currentData = docSnap.data() as ScheduledSearch;
    
    verifyUserAccess(currentData.userId);
    const updateData: Partial<ScheduledSearch> = {
      updatedAt: serverTimestamp() as Timestamp,
    };

    if (request.preferences) {
      updateData.preferences = request.preferences;
    }
    
    if (request.schedule) {
      updateData.schedule = request.schedule;
      
      if (request.schedule.enabled) {
        const cloudTaskResult = await updateCloudTask(
          currentData.cloudTaskId, 
          request.scheduleId, 
          request.schedule
        );
        
        if (cloudTaskResult.success) {
          updateData.cloudTaskId = cloudTaskResult.taskId;
          updateData.nextRunAt = cloudTaskResult.nextRunAt;
        }
      } else {
        if (currentData.cloudTaskId) {
          await deleteCloudTask(currentData.cloudTaskId);
          updateData.cloudTaskId = undefined;
          updateData.nextRunAt = undefined;
        }
      }
    }
    
    if (request.status) {
      updateData.status = request.status;
      
      if (request.status !== 'active' && currentData.cloudTaskId) {
        await deleteCloudTask(currentData.cloudTaskId);
        updateData.cloudTaskId = undefined;
        updateData.nextRunAt = undefined;
      }
    }

    await retryFirebaseOperation(() => updateDoc(docRef, updateData));

    const updatedData = { ...currentData, ...updateData, id: request.scheduleId };
    return { success: true, data: updatedData };
  } catch (error) {
    console.error('Error updating scheduled search:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('authenticated') || error.message.includes('Unauthorized')) {
        return { 
          success: false, 
          error: 'Authentication required. Please sign in to update scheduled searches.' 
        };
      }
      if (error.message.includes('permission') || error.message.includes('denied')) {
        return { 
          success: false, 
          error: 'Permission denied. Check your Firestore security rules for the scheduledSearches collection.' 
        };
      }
    }
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

export const deleteScheduledSearch = async (scheduleId: string): Promise<{
  success: boolean;
  error?: string;
}> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, scheduleId);
    const docSnap = await retryFirebaseOperation(() => getDoc(docRef));

    if (!docSnap.exists()) {
      return { success: false, error: 'Scheduled search not found' };
    }

    const data = docSnap.data() as ScheduledSearch;
    
    verifyUserAccess(data.userId);
    
    if (data.cloudTaskId) {
      await deleteCloudTask(data.cloudTaskId);
    }

    await retryFirebaseOperation(() => deleteDoc(docRef));
    return { success: true };
  } catch (error) {
    console.error('Error deleting scheduled search:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('authenticated') || error.message.includes('Unauthorized')) {
        return { 
          success: false, 
          error: 'Authentication required. Please sign in to delete scheduled searches.' 
        };
      }
      if (error.message.includes('permission') || error.message.includes('denied')) {
        return { 
          success: false, 
          error: 'Permission denied. Check your Firestore security rules for the scheduledSearches collection.' 
        };
      }
    }
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

export const getUserScheduledSearches = async (userId: string): Promise<{
  success: boolean;
  data?: ScheduledSearch[];
  error?: string;
}> => {
  try {
    verifyUserAccess(userId);

    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await retryFirebaseOperation(() => getDocs(q));
    const scheduledSearches: ScheduledSearch[] = [];

    querySnapshot.forEach((doc) => {
      scheduledSearches.push({
        id: doc.id,
        ...doc.data()
      } as ScheduledSearch);
    });

    return { success: true, data: scheduledSearches };
  } catch (error) {
    console.error('Error getting user scheduled searches:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('authenticated') || error.message.includes('Unauthorized')) {
        return { 
          success: false, 
          error: 'Authentication required. Please sign in to view scheduled searches.' 
        };
      }
      if (error.message.includes('permission') || error.message.includes('denied')) {
        return { 
          success: false, 
          error: 'Permission denied. Check your Firestore security rules for the scheduledSearches collection.' 
        };
      }
    }
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

export const getScheduledSearch = async (scheduleId: string): Promise<{
  success: boolean;
  data?: ScheduledSearch;
  error?: string;
}> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, scheduleId);
    const docSnap = await retryFirebaseOperation(() => getDoc(docRef));

    if (!docSnap.exists()) {
      return { success: false, error: 'Scheduled search not found' };
    }

    const data = { id: scheduleId, ...docSnap.data() } as ScheduledSearch;
    
    verifyUserAccess(data.userId);

    return { success: true, data };
  } catch (error) {
    console.error('Error getting scheduled search:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('authenticated') || error.message.includes('Unauthorized')) {
        return { 
          success: false, 
          error: 'Authentication required. Please sign in to view scheduled searches.' 
        };
      }
      if (error.message.includes('permission') || error.message.includes('denied')) {
        return { 
          success: false, 
          error: 'Permission denied. Check your Firestore security rules for the scheduledSearches collection.' 
        };
      }
    }
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

const CLOUD_TASK_API_URL = import.meta.env.VITE_CLOUD_TASK_API_URL || 'https://gethired-scheduler-104139545590.us-central1.run.app';

const createCloudTask = async (scheduleId: string, schedule: SearchSchedule): Promise<{
  success: boolean;
  taskId?: string;
  nextRunAt?: Timestamp;
  error?: string;
}> => {
  try {
    if (!CLOUD_TASK_API_URL) {
      console.warn('Cloud Task API not configured or not available locally');
      return {
        success: false,
        error: 'Cloud Task API not available - schedule saved without automation'
      };
    }

    // Fix endpoint path to match api.py structure
    const response = await fetch(`${CLOUD_TASK_API_URL}/api/v1/tasks/schedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        scheduleId,
        schedule,
        targetUrl: `${CLOUD_TASK_API_URL}/api/v1/scheduled-search/execute`,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return {
      success: true,
      taskId: result.taskId,
      nextRunAt: result.nextRunAt ? Timestamp.fromDate(new Date(result.nextRunAt)) : undefined,
    };
  } catch (error) {
    console.error('Error creating Cloud Task:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create Cloud Task',
    };
  }
};

const updateCloudTask = async (
  currentTaskId: string | undefined,
  scheduleId: string,
  schedule: SearchSchedule
): Promise<{
  success: boolean;
  taskId?: string;
  nextRunAt?: Timestamp;
  error?: string;
}> => {
  try {
    if (currentTaskId) {
      await deleteCloudTask(currentTaskId);
    }

    return await createCloudTask(scheduleId, schedule);
  } catch (error) {
    console.error('Error updating Cloud Task:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update Cloud Task',
    };
  }
};

const deleteCloudTask = async (taskId: string): Promise<{
  success: boolean;
  error?: string;
}> => {
  try {
    // Fix endpoint path to match api.py structure  
    const response = await fetch(`${CLOUD_TASK_API_URL}/api/v1/tasks/${taskId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting Cloud Task:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete Cloud Task',
    };
  }
};
