// Test script for Firebase permissions - scheduledSearchService.ts
// Run this in your browser console to test the service

import { 
  isUserAuthenticated, 
  getCurrentUserIdSafe, 
  getUserScheduledSearches,
  createScheduledSearch 
} from '../services/scheduledSearchService';

// Test authentication check
console.log('🔍 Testing Firebase Authentication...');
console.log('User authenticated:', isUserAuthenticated());
console.log('Current user ID:', getCurrentUserIdSafe());

// Test getting user scheduled searches (should fail gracefully if not authenticated)
async function testGetScheduledSearches() {
  const userId = getCurrentUserIdSafe();
  if (!userId) {
    console.log('❌ Not authenticated - skipping tests');
    return;
  }
  
  console.log('🔍 Testing getUserScheduledSearches...');
  const result = await getUserScheduledSearches(userId);
  
  if (result.success) {
    console.log('✅ Successfully retrieved scheduled searches:', result.data);
  } else {
    console.log('❌ Error retrieving scheduled searches:', result.error);
    
    // Check if it's a permission error
    if (result.error?.includes('permission') || result.error?.includes('denied')) {
      console.log('📋 Next steps: Add these Firestore security rules in Firebase Console:');
      console.log(`
match /scheduledSearches/{scheduleId} {
  allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
  allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
}
      `);
    }
  }
}

// Test creating a scheduled search (with minimal data)
async function testCreateScheduledSearch() {
  const userId = getCurrentUserIdSafe();
  if (!userId) {
    console.log('❌ Not authenticated - skipping create test');
    return;
  }
  
  console.log('🔍 Testing createScheduledSearch...');
  
  const testRequest = {
    userId: userId,
    preferences: {
      titles: ['Test Job'],
      locations: ['Test Location'],
      skills: [],
      salaryRange: { min: 50000, max: 100000 },
      jobType: 'Full-time' as const,
      seniority: 'Junior' as const,
      searchSchedule: {
        enabled: true,
        frequency: 'Daily' as const,
        notificationType: 'Email' as const,
        quietHours: { start: '22:00', end: '08:00' },
        timezone: 'America/Los_Angeles'
      },
      companies: [],
      other: '',
      includeKeywords: [],
      excludeKeywords: []
    },
    schedule: {
      enabled: true,
      frequency: 'Daily' as const,
      customSchedule: '09:00',
      notificationType: 'Email' as const,
      quietHours: { start: '22:00', end: '08:00' },
      timezone: 'America/Los_Angeles'
    }
  };
  
  const result = await createScheduledSearch(testRequest);
  
  if (result.success) {
    console.log('✅ Successfully created test scheduled search:', result.data);
  } else {
    console.log('❌ Error creating scheduled search:', result.error);
  }
}

// Run the tests
testGetScheduledSearches();
// Uncomment the line below to test creation (will create a real record!)
// testCreateScheduledSearch();
