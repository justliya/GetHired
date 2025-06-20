// src/App.tsx
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeProvider';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import JobListings from './pages/JobListings';
import CompanyResearch from './pages/CompanyResearch';
import ResumeTailoring from './pages/ResumeTailoring';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import Auth from './pages/Auth';
import { auth, onAuthStateChanged } from './firebase';
import { updateUserPreferences, getUserPreferences } from './services/firebaseService';
import UserPreferencesModal from "./components/ui/UserPreferencesModal";
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
  const [isNewUser, setIsNewUser] = useState<boolean>(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduledSearch | null>(null);

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
            setIsNewUser(true);
            // Mark that they've seen the modal
            markPreferencesModalSeen(user.uid);
            // Delay showing modal to ensure smooth transition
            setTimeout(() => {
              setShowUserPrefs(true);
            }, 500);
          } else {
            setIsNewUser(false);
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
                setIsNewUser(false);
                setEditingSchedule(null);
                // If user closes modal without saving, we still consider they've seen it
                if (auth.currentUser) {
                  markPreferencesModalSeen(auth.currentUser.uid);
                }
              }}
              onSubmit={async (formData) => {
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
                  
                  setShowUserPrefs(false);
                  setIsNewUser(false);
                  setEditingSchedule(null);
                  
                  // Success message will be handled by the SuccessModal in UserPreferencesModal
                } catch (error) {
                  console.error('Failed to save preferences:', error);
                  // You might want to show an error toast here
                  alert('Failed to save preferences. Please try again.');
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
