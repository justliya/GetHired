/**
 * Utility functions for managing user onboarding state
 */

import type { JobPreferences } from '../types';

const ONBOARDING_KEYS = {
  SEEN_PREFERENCES_MODAL: 'hasSeenPrefsModal',
  COMPLETED_ONBOARDING: 'completedOnboarding',
  FIRST_LOGIN: 'firstLogin'
} as const;

/**
 * Check if user has seen the preferences modal
 */
export const hasSeenPreferencesModal = (userId: string): boolean => {
  return localStorage.getItem(`${ONBOARDING_KEYS.SEEN_PREFERENCES_MODAL}_${userId}`) === 'true';
};

/**
 * Mark that user has seen the preferences modal
 */
export const markPreferencesModalSeen = (userId: string): void => {
  localStorage.setItem(`${ONBOARDING_KEYS.SEEN_PREFERENCES_MODAL}_${userId}`, 'true');
};

/**
 * Check if user has completed onboarding
 */
export const hasCompletedOnboarding = (userId: string): boolean => {
  return localStorage.getItem(`${ONBOARDING_KEYS.COMPLETED_ONBOARDING}_${userId}`) === 'true';
};

/**
 * Mark that user has completed onboarding
 */
export const markOnboardingCompleted = (userId: string): void => {
  localStorage.setItem(`${ONBOARDING_KEYS.COMPLETED_ONBOARDING}_${userId}`, 'true');
};

/**
 * Check if this is user's first login session
 */
export const isFirstLoginSession = (userId: string): boolean => {
  const sessionKey = `${ONBOARDING_KEYS.FIRST_LOGIN}_${userId}_${Date.now()}`;
  const hasLoggedInThisSession = sessionStorage.getItem(sessionKey);
  
  if (!hasLoggedInThisSession) {
    sessionStorage.setItem(sessionKey, 'true');
    return !localStorage.getItem(`${ONBOARDING_KEYS.FIRST_LOGIN}_${userId}`);
  }
  
  return false;
};

/**
 * Mark that user has logged in before
 */
export const markFirstLoginCompleted = (userId: string): void => {
  localStorage.setItem(`${ONBOARDING_KEYS.FIRST_LOGIN}_${userId}`, 'true');
};

/**
 * Determine if user should see preferences modal
 * Based on: not seen modal + not completed onboarding + is truly new user
 */
export const shouldShowPreferencesModal = (
  userId: string, 
  hasCustomPreferences: boolean
): boolean => {
  // If user already has custom preferences, they don't need the modal
  if (hasCustomPreferences) {
    markOnboardingCompleted(userId);
    markPreferencesModalSeen(userId);
    return false;
  }
  
  // If user has already seen the modal, don't show it again
  if (hasSeenPreferencesModal(userId)) {
    return false;
  }
  
  // If user has completed onboarding, don't show modal
  if (hasCompletedOnboarding(userId)) {
    return false;
  }
  
  // Only show for truly new users
  return true;
};

/**
 * Clear all onboarding data for a user (useful for testing or user reset)
 */
export const clearOnboardingData = (userId: string): void => {
  Object.values(ONBOARDING_KEYS).forEach(key => {
    localStorage.removeItem(`${key}_${userId}`);
  });
};

/**
 * Handle successful preferences submission
 */
export const handlePreferencesSubmissionSuccess = (userId: string): void => {
  markPreferencesModalSeen(userId);
  markOnboardingCompleted(userId);
  markFirstLoginCompleted(userId);
};

/**
 * Handle scheduling job search asynchronously with retry logic
 */
export const handleSchedulingAsync = async (
  userId: string, 
  preferences: JobPreferences
): Promise<void> => {
  try {
    if (!preferences.searchSchedule?.enabled) {
      return;
    }

    // Import scheduling service dynamically to avoid circular dependencies
    const { createScheduledSearch, getUserScheduledSearches, updateScheduledSearch } = 
      await import('../services/scheduledSearchService');

    // Check if user already has a scheduled search
    const existingSearches = await getUserScheduledSearches(userId);
    
    if (existingSearches.success && existingSearches.data && existingSearches.data.length > 0) {
      // Update existing scheduled search
      const existing = existingSearches.data[0];
      const result = await updateScheduledSearch({
        scheduleId: existing.id!,
        preferences,
        schedule: preferences.searchSchedule
      });
      
      if (!result.success) {
        console.warn('Failed to update scheduled search:', result.error);
      }
    } else {
      // Create new scheduled search
      const result = await createScheduledSearch({
        userId,
        preferences,
        schedule: preferences.searchSchedule
      });
      
      if (!result.success) {
        console.warn('Failed to create scheduled search:', result.error);
      } else if (result.cloudTaskError) {
        console.warn('Scheduled search created but cloud task failed:', result.cloudTaskError);
        // The schedule is saved, but automation will need to be retried
      }
    }
  } catch (error) {
    console.error('Error in async scheduling:', error);
    // Don't throw - we don't want to fail the entire preference saving process
  }
};
