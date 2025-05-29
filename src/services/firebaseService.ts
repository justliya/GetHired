import { db, auth } from '../firebase';
import { doc, setDoc, getDoc, collection, addDoc } from 'firebase/firestore';
import type { JobPreferences } from '../models/UserData';

const getCurrentUserId = () => {
  const user = auth.currentUser;
  if (!user) throw new Error('User must be authenticated');
  return user.uid;
};

export const updateUserPreferences = async (userId: string, preferences: JobPreferences) => {
  console.log('🚀 firebaseService - updateUserPreferences called with:', { userId, preferences });
  try {
    console.log('🔒 firebaseService - Verifying authentication...');
    getCurrentUserId(); // Verify user is authenticated
    console.log('✅ firebaseService - User authenticated');

    const preferencesRef = doc(db, 'users', userId, 'preferences', 'jobSearch');
    console.log('📝 firebaseService - About to update document at path:', preferencesRef.path);
    
    const dataToSave = {
      ...preferences,
      titles: preferences.titles || [], // Ensure titles exists
      updatedAt: new Date().toISOString()
    };
    console.log('📦 firebaseService - Data to save:', dataToSave);

    await setDoc(preferencesRef, dataToSave, { merge: true });
    console.log('✨ firebaseService - Document successfully updated');
    return { success: true };
  } catch (error) {
    console.error('❌ firebaseService - Error updating preferences:', error);
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
