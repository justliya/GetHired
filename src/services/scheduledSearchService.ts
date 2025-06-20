import { db } from '../firebase';
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

const COLLECTION_NAME = 'scheduledSearches';

/**
 * Create a new scheduled search
 */
export const createScheduledSearch = async (request: ScheduleCreateRequest): Promise<{
  success: boolean;
  data?: ScheduledSearch;
  error?: string;
}> => {
  try {
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

    const docRef = await addDoc(collection(db, COLLECTION_NAME), scheduledSearch);
    
    // Create Cloud Task for this schedule
    const cloudTaskResult = await createCloudTask(docRef.id, request.schedule);
    
    if (cloudTaskResult.success && cloudTaskResult.taskId) {
      // Update the document with the Cloud Task ID
      await updateDoc(docRef, {
        cloudTaskId: cloudTaskResult.taskId,
        nextRunAt: cloudTaskResult.nextRunAt
      });
    }

    const result = {
      id: docRef.id,
      ...scheduledSearch,
      cloudTaskId: cloudTaskResult.taskId,
      nextRunAt: cloudTaskResult.nextRunAt
    } as ScheduledSearch;

    return { success: true, data: result };
  } catch (error) {
    console.error('Error creating scheduled search:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

/**
 * Update an existing scheduled search
 */
export const updateScheduledSearch = async (request: ScheduleUpdateRequest): Promise<{
  success: boolean;
  data?: ScheduledSearch;
  error?: string;
}> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, request.scheduleId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return { success: false, error: 'Scheduled search not found' };
    }

    const currentData = docSnap.data() as ScheduledSearch;
    const updateData: Partial<ScheduledSearch> = {
      updatedAt: serverTimestamp() as Timestamp,
    };

    if (request.preferences) {
      updateData.preferences = request.preferences;
    }
    
    if (request.schedule) {
      updateData.schedule = request.schedule;
      
      // If schedule changed and is enabled, update Cloud Task
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
        // If disabled, delete Cloud Task
        if (currentData.cloudTaskId) {
          await deleteCloudTask(currentData.cloudTaskId);
          updateData.cloudTaskId = undefined;
          updateData.nextRunAt = undefined;
        }
      }
    }
    
    if (request.status) {
      updateData.status = request.status;
      
      // If pausing or disabling, delete Cloud Task
      if (request.status !== 'active' && currentData.cloudTaskId) {
        await deleteCloudTask(currentData.cloudTaskId);
        updateData.cloudTaskId = undefined;
        updateData.nextRunAt = undefined;
      }
    }

    await updateDoc(docRef, updateData);

    const updatedData = { ...currentData, ...updateData, id: request.scheduleId };
    return { success: true, data: updatedData };
  } catch (error) {
    console.error('Error updating scheduled search:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

/**
 * Delete a scheduled search
 */
export const deleteScheduledSearch = async (scheduleId: string): Promise<{
  success: boolean;
  error?: string;
}> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, scheduleId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return { success: false, error: 'Scheduled search not found' };
    }

    const data = docSnap.data() as ScheduledSearch;
    
    // Delete Cloud Task if exists
    if (data.cloudTaskId) {
      await deleteCloudTask(data.cloudTaskId);
    }

    await deleteDoc(docRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting scheduled search:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

/**
 * Get all scheduled searches for a user
 */
export const getUserScheduledSearches = async (userId: string): Promise<{
  success: boolean;
  data?: ScheduledSearch[];
  error?: string;
}> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
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
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

/**
 * Get a specific scheduled search
 */
export const getScheduledSearch = async (scheduleId: string): Promise<{
  success: boolean;
  data?: ScheduledSearch;
  error?: string;
}> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, scheduleId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return { success: false, error: 'Scheduled search not found' };
    }

    const data = { id: scheduleId, ...docSnap.data() } as ScheduledSearch;
    return { success: true, data };
  } catch (error) {
    console.error('Error getting scheduled search:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

import { ENV } from '../config/environment';

const CLOUD_TASK_API_URL = ENV.CLOUD_TASK_API_URL;

/**
 * Create a Cloud Task for scheduled job search
 */
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
        targetUrl: `${CLOUD_TASK_API_URL}/scheduled-search/execute`,
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

/**
 * Update an existing Cloud Task
 */
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
    // Delete existing task if it exists
    if (currentTaskId) {
      await deleteCloudTask(currentTaskId);
    }

    // Create new task with updated schedule
    return await createCloudTask(scheduleId, schedule);
  } catch (error) {
    console.error('Error updating Cloud Task:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update Cloud Task',
    };
  }
};

/**
 * Delete a Cloud Task
 */
const deleteCloudTask = async (taskId: string): Promise<{
  success: boolean;
  error?: string;
}> => {
  try {
    const response = await fetch(`${CLOUD_TASK_API_URL}/tasks/${taskId}`, {
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
