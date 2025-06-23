// src/App.tsx
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeProvider';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import JobListings from './pages/JobListings';
import PageNotFound from "./pages/NotFound"; 
import CompanyResearch from './pages/CompanyResearch';
import ResumeTailoring from './pages/ResumeTailoring';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import Auth from './pages/Auth';
import { auth, onAuthStateChanged } from './firebase';
import { updateUserPreferences, getUserPreferences } from './services/firebaseService';
import UserPreferencesModal from "./components/ui/UserPreferencesModal";
import SuccessModal from "./components/ui/SuccessModal";
import { 
  shouldShowPreferencesModal, 
  markPreferencesModalSeen, 
  handlePreferencesSubmissionSuccess 
} from './utils/onboardingUtils';
import type { ScheduledSearch } from './services/scheduledSearchService';

function App() {
  const [showUserPrefs, setShowUserPrefs] = useState<boolean>(false);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<'auth' | 'dashboard' | 'loading'>('loading');
  const [editingSchedule, setEditingSchedule] = useState<ScheduledSearch | null>(null);
  const [isSubmittingPrefs, setIsSubmittingPrefs] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Check if user has preferences set
          const prefsResult = await getUserPreferences(user.uid);
          
          // Determine if this is a new user by checking if they have customized preferences
          const hasCustomPreferences = prefsResult.success && 
            prefsResult.data && 
            (prefsResult.data.titles?.length > 0 || 
             prefsResult.data.locations?.length > 0 ||
             prefsResult.data.skills?.length > 0);
          
          setCurrentPage('dashboard');
          
          // Use utility function to determine if we should show the modal
          const shouldShow = shouldShowPreferencesModal(user.uid, hasCustomPreferences || false);
          
          if (shouldShow) {
            // Mark that they've seen the modal
            markPreferencesModalSeen(user.uid);
            // Delay showing modal to ensure smooth transition
            setTimeout(() => {
              setShowUserPrefs(true);
            }, 500);
          } else {
            setShowUserPrefs(false);
          }
        } catch (error) {
          console.error('Error checking user preferences:', error);
          setCurrentPage('dashboard');
        }
      } else {
        setCurrentPage('auth');
        setShowUserPrefs(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Show loading state while checking auth
  if (currentPage === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (currentPage === 'auth') {
    return <Auth />;
  }

  return (
    <ThemeProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard onOpenPreferences={(schedule) => {
              setEditingSchedule(schedule || null);
              setShowUserPrefs(true);
            }} />} />
            <Route path="/jobs" element={<JobListings />} />
            <Route path="/company-research/:jobId" element={<CompanyResearch />} />
            <Route path="/resume-tailoring/:jobId" element={<ResumeTailoring />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<PageNotFound />} />
          </Routes>
          
          {showUserPrefs && (
            <UserPreferencesModal 
              show={showUserPrefs}
              existingSchedule={editingSchedule ? {
                preferences: editingSchedule.preferences,
                schedule: editingSchedule.schedule
              } : undefined}
              onHide={() => {
                setShowUserPrefs(false);
                setEditingSchedule(null);
                // If user closes modal without saving, we still consider they've seen it
                if (auth.currentUser) {
                  markPreferencesModalSeen(auth.currentUser.uid);
                }
              }}
              onSubmit={async (formData) => {
                // Prevent double submissions
                if (isSubmittingPrefs) return;
                
                setIsSubmittingPrefs(true);
                try {
                  const userId = auth.currentUser?.uid;
                  if (!userId) {
                    throw new Error('No authenticated user');
                  }
                  
                  // Map the form data to match your JobPreferences structure
                  const preferences = {
                    titles: formData.preferences.roles || [],
                    locations: formData.preferences.locations || [],
                    skills: formData.preferences.skills || [],
                    salaryRange: formData.preferences.salaryRange || { min: 0, max: 200000 },
                    jobType: formData.preferences.jobType || 'Full-time',
                    seniority: formData.preferences.seniority || 'Mid',
                    searchSchedule: formData.preferences.searchSchedule || {
                      enabled: false,
                      frequency: 'Daily',
                      notificationType: 'Email',
                      quietHours: {
                        start: '22:00',
                        end: '08:00'
                      },
                      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
                    },
                    companies: formData.preferences.companies || [],
                    other: formData.preferences.other || '',
                    includeKeywords: formData.preferences.includeKeywords || [],
                    excludeKeywords: formData.preferences.excludeKeywords || []
                  };
                  
                  const result = await updateUserPreferences(userId, preferences);
                  
                  if (!result.success) {
                    throw new Error(result.error || 'Failed to update preferences');
                  }
                  
                  // Handle successful submission with utility function
                  handlePreferencesSubmissionSuccess(userId);
                  
                  // Close modal immediately for better UX
                  setShowUserPrefs(false);
                  setEditingSchedule(null);
                  
                  // Show success modal after a brief delay
                  setTimeout(() => {
                    setShowSuccessModal(true);
                  }, 150);
                  
                  // Handle background operations (scheduling, job search) asynchronously
                  setTimeout(async () => {
                    try {
                      // Only trigger background job search if user has meaningful criteria
                      const hasSearchCriteria = preferences.titles.length > 0 || 
                                               preferences.locations.length > 0 ||
                                               preferences.skills.length > 0;
                      
                      if (hasSearchCriteria && preferences.searchSchedule?.enabled) {
                        // Background job search - don't await this
                        fetch(`${import.meta.env.VITE_GETHIRED_AGENTS_API_URL}/run`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            message: "find me jobs based on my preferences",
                            context: {
                              user_id: userId,
                              firebase_uid: userId,
                              is_anonymous: auth.currentUser?.isAnonymous || false,
                              source: "preferences_onboarding"
                            },
                            session_id: `onboarding-${Date.now()}`,
                          }),
                        }).catch(error => {
                          console.warn('Background job search failed:', error);
                        });
                      }
                    } catch (error) {
                      console.warn('Background operations failed:', error);
                    }
                  }, 1000);
                  
                } catch (error) {
                  console.error('Failed to save preferences:', error);
                  alert('Failed to save preferences. Please try again.');
                } finally {
                  setIsSubmittingPrefs(false);
                }
              }}
            />
          )}
          
          {/* Success Modal */}
          <SuccessModal
            show={showSuccessModal}
            onHide={() => setShowSuccessModal(false)}
            title="Preferences Saved! 🎉"
            message="Your job preferences have been saved successfully. We'll use these to find the best job matches for you!"
          />
        </Layout>
      </Router>
    </ThemeProvider>
  );
}

export default App;
