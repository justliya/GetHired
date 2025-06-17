/* eslint-disable @typescript-eslint/no-explicit-any */
import{ useState, useEffect, useRef } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { Heart, Building2, MapPin, DollarSign, Calendar, Trash2, Search, CheckCircle, Clock, Loader2 } from 'lucide-react';
import { auth, db } from '../firebase';
import { v4 as uuidv4 } from 'uuid';

// Types
interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  datePosted: string;
  description: string;
  qualifications: string[];
  benefits: string[];
  url: string;
  easyApply: boolean;
  favorite: boolean;
  status: 'new' | 'viewed' | 'applied' | 'rejected';
}

const API_BASE_URL = 'https://gethired-agents-104139545590.us-central1.run.app';

export default function JobListings() {
  const [user, authLoading, authError] = useAuthState(auth);
  const sessionId = useRef(`session-${uuidv4()}`).current;
  const sessionStorageKey = `session-${sessionId}`;
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const saveToStorageAndFirebase = async (updatedJobs: JobListing[]) => {
    try {
      // Save to sessionStorage
      sessionStorage.setItem(sessionStorageKey, JSON.stringify(updatedJobs));
      
      // Save to Firebase if user is authenticated
      if (user?.uid) {
        const userRef = doc(db, 'users', user.uid, 'sessions', sessionId);
        await setDoc(userRef, { 
          jobs: updatedJobs,
          lastUpdated: new Date().toISOString(),
          sessionId: sessionId
        }, { merge: true });
      }
    } catch (error) {
      console.error('Failed to save jobs:', error);
      setError('Failed to save jobs. Please try again.');
    }
  };

  useEffect(() => {
    if (!user || authLoading) return;
    
    const loadJobs = async () => {
      try {
        // First try to load from sessionStorage
        const stored = sessionStorage.getItem(sessionStorageKey);
        if (stored) {
          const parsedJobs = JSON.parse(stored);
          setJobs(parsedJobs);
        }
        
        // Then try to load from Firebase
        const userDocRef = doc(db, 'users', user.uid, 'sessions', sessionId);
        const snap = await getDoc(userDocRef);
        
        if (snap.exists()) {
          const data = snap.data();
          const savedJobs = data.jobs || [];
          if (savedJobs.length > 0) {
            setJobs(savedJobs);
          }
        }
      } catch (error) {
        console.error('Failed to load jobs from storage:', error);
        setError('Failed to load saved jobs.');
      }
    };
    
    loadJobs();
  }, [user, authLoading, sessionId, sessionStorageKey]);

  const startSession = async () => {
    if (!user?.uid) {
      setError('Please log in to start a session.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/run`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          message: user.uid,
          context: { user_id: user.uid },
          session_id: sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Session started:', result);
      setSessionStarted(true);
    } catch (error) {
      console.error('Failed to start session:', error);
      setError('Failed to start session. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const searchJobs = async () => {
    if (!sessionStarted || !user?.uid) {
      setError('Please start a session first.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/run`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          message: 'find me jobs',
          context: { user_id: user.uid },
          session_id: sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Jobs search result:', result);
      
      // Parse jobs from API response
      if (result.data && result.data.jobs && Array.isArray(result.data.jobs)) {
        const newJobs: JobListing[] = result.data.jobs.map((job: any, index: number) => ({
          id: `${sessionId}-${index}`,
          listingNumber: job.listingNumber,
          title: job.title || 'Job Title Not Available',
          company: job.company || 'Company Not Specified',
          location: job.location || 'Location Not Specified',
          salary: job.salary || 'Salary Not Specified',
          datePosted: job.datePosted || 'Recently Posted',
          description: job.description || 'No description available.',
          qualifications: Array.isArray(job.qualifications) ? job.qualifications : [],
          benefits: Array.isArray(job.benefits) ? job.benefits : [],
          jobLink: job.jobLink || job.url || '#',
          easyApply: Boolean(job.easyApply),
        }));
        
        setJobs(newJobs);
        await saveToStorageAndFirebase(newJobs);
      } else {
        throw new Error('Invalid response format from API');
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
      setError('Failed to fetch jobs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFavorite = async (jobId: string) => {
    try {
      const updatedJobs = jobs.map(job => 
        job.id === jobId ? { ...job, favorite: !job.favorite } : job
      );
      setJobs(updatedJobs);
      await saveToStorageAndFirebase(updatedJobs);
    } catch (error) {
      console.error('Failed to update favorite:', error);
      setError('Failed to update favorite status.');
    }
  };

  const handleResearch = async (jobId: string) => {
    if (!user?.uid) {
      setError('Please log in to research jobs.');
      return;
    }
    
    const jobIndex = jobs.findIndex(job => job.id === jobId);
    if (jobIndex === -1) {
      setError('Job not found.');
      return;
    }
    
    setActionLoading(jobId);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/run`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          message: `${jobIndex + 1}`,
          context: { user_id: user.uid },
          session_id: sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Research result:', result);
      
      // Update job status to viewed after research
      const updatedJobs = jobs.map(job => 
        job.id === jobId ? { ...job, status: 'viewed' as const } : job
      );
      setJobs(updatedJobs);
      await saveToStorageAndFirebase(updatedJobs);
      
    } catch (error) {
      console.error('Failed to research job:', error);
      setError('Failed to research job. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (jobId: string) => {
    try {
      const updatedJobs = jobs.filter(job => job.id !== jobId);
      setJobs(updatedJobs);
      await saveToStorageAndFirebase(updatedJobs);
    } catch (error) {
      console.error('Failed to delete job:', error);
      setError('Failed to delete job.');
    }
  };

  const completeSession = async () => {
    if (!user?.uid) {
      setError('Please log in to complete session.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/run`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          message: 'COMPLETE',
          context: { user_id: user.uid },
          session_id: sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Session completed:', result);
      
      // Optionally reset session state
      setSessionStarted(false);
      
    } catch (error) {
      console.error('Failed to complete session:', error);
      setError('Failed to complete session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'viewed': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'applied': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  // Show error state if authentication failed
  if (authError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">Authentication Error</div>
          <p className="text-gray-600 dark:text-gray-300">Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  // Show login required state
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Please log in to access job listings
          </div>
          <p className="text-gray-600 dark:text-gray-300">
            You need to be authenticated to use this feature.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Job Search Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Find your next career opportunity with AI-powered job matching
          </p>
          {user && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Welcome, {user.email} | Session: {sessionId.slice(-8)}
            </p>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <div className="text-red-800 dark:text-red-200 text-sm">{error}</div>
            <button 
              onClick={() => setError(null)}
              className="text-red-600 dark:text-red-400 text-xs underline mt-1"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Control Panel */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={startSession}
              disabled={loading || sessionStarted}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                sessionStarted
                  ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200'
                  : 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50'
              }`}
            >
              {loading && !sessionStarted ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : sessionStarted ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <Clock className="w-4 h-4" />
              )}
              {sessionStarted ? 'Session Active' : 'Start Session'}
            </button>

            <button
              onClick={searchJobs}
              disabled={!sessionStarted || loading}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50"
            >
              {loading && sessionStarted ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              Search Jobs
            </button>

            <button
              onClick={completeSession}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              Complete Session
            </button>
          </div>
        </div>

        {/* Job Stats */}
        {jobs.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{jobs.length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Total Jobs</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {jobs.filter(j => j.favorite).length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Saved Jobs</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {jobs.filter(j => j.easyApply).length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Easy Apply</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {jobs.filter(j => j.status === 'new').length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">New Jobs</div>
            </div>
          </div>
        )}

        {/* Job Listings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group"
            >
              {/* Card Header */}
              <div className="p-6 pb-4">
                <div className="flex justify-between items-start mb-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(job.status)}`}>
                    {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                  </span>
                  <button
                    onClick={() => handleFavorite(job.id)}
                    className={`p-2 rounded-full transition-all ${
                      job.favorite
                        ? 'text-red-500 bg-red-50 dark:bg-red-900/20'
                        : 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${job.favorite ? 'fill-current' : ''}`} />
                  </button>
                </div>

                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-2">
                  {job.title}
                </h3>

                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 mb-2">
                  <Building2 className="w-4 h-4" />
                  <span className="text-sm font-medium">{job.company}</span>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>{job.location}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{job.datePosted}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  <span className="text-green-600 font-semibold">{job.salary}</span>
                  {job.easyApply && (
                    <span className="ml-auto bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-1 rounded text-xs font-medium">
                      Easy Apply
                    </span>
                  )}
                </div>

                <p className="text-gray-700 dark:text-gray-300 text-sm line-clamp-3 mb-4">
                  {job.description}
                </p>

                {/* Qualifications */}
                {job.qualifications.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                      Key Requirements
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {job.qualifications.slice(0, 3).map((qual, idx) => (
                        <span
                          key={idx}
                          className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded text-xs"
                        >
                          {qual}
                        </span>
                      ))}
                      {job.qualifications.length > 3 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          +{job.qualifications.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Card Actions */}
              <div className="px-6 pb-6">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleResearch(job.id)}
                    disabled={actionLoading === job.id}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all disabled:opacity-50"
                  >
                    {actionLoading === job.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    Research
                  </button>
                  
                  <button
                    onClick={() => handleDelete(job.id)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {jobs.length === 0 && !loading && (
          <div className="text-center py-16">
            <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No Jobs Found
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Start a session and search for jobs to see opportunities here.
            </p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-16">
            <Loader2 className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-spin" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {sessionStarted ? 'Searching for Jobs...' : 'Starting Session...'}
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Please wait while we process your request.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}