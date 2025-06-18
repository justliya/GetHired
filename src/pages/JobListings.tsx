
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { Heart, Building2, MapPin, DollarSign, Calendar, Trash2, Search, CheckCircle, Clock, Loader2, AlertCircle } from 'lucide-react';
import { auth, db } from '../firebase';
import { v4 as uuidv4 } from 'uuid';

// Types
interface JobListing {
  id: string;
  listingNumber?: number;
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
  const [sessionId] = useState(() => {
    const existing = sessionStorage.getItem('active-session-id');
    const newId = existing || `conv-${uuidv4()}`;
    sessionStorage.setItem('active-session-id', newId);
    return newId;
  });
  const sessionStorageKey = `session-${sessionId}`;
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [sessionStarted, setSessionStarted] = useState(() => {
    const stored = sessionStorage.getItem(`session-started-${sessionId}`);
    return stored === 'true';
  });
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

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
        // Try to rehydrate jobs from sessionStorage first (even if already mounted)
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
          // Only update if jobs from sessionStorage weren't already set
          if (savedJobs.length > 0 && (!stored || jobs.length === 0)) {
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

  useEffect(() => {
    if (jobs.length > 0) {
      saveToStorageAndFirebase(jobs);
    }
  }, [jobs]);

  function parseJobListings(responseData: any): JobListing[] {
    console.log('Full response data:', responseData);
    
    // Try to find job arrays in various response structures
    const possibleJobArrays = [
      responseData?.jobs,
      responseData?.data?.jobs,
      responseData?.listings,
      Array.isArray(responseData) ? responseData : null,
      responseData?.response
    ].filter(arr => Array.isArray(arr) && arr.length > 0);
    
    for (const jobArray of possibleJobArrays) {
      if (Array.isArray(jobArray) && jobArray.length > 0) {
        return jobArray.map((job: any, index: number) => ({
          id: `${sessionId}-${index}-${Date.now()}`,
          listingNumber: job.listingNumber || job.listing_number || index + 1,
          title: job.title || job.job_title || 'Job Title Not Available',
          company: job.company || job.company_name || 'Company Not Specified',
          location: job.location || job.job_location || 'Location Not Specified',
          salary: job.salary || job.salary_range || job.compensation || 'Salary Not Specified',
          datePosted: job.datePosted || job.date_posted || job.posted_date || 'Recently Posted',
          description: job.description || job.job_description || job.summary || 'No description available.',
          qualifications: Array.isArray(job.qualifications) ? job.qualifications : 
                         Array.isArray(job.requirements) ? job.requirements :
                         Array.isArray(job.skills) ? job.skills :
                         (job.qualifications || job.requirements || job.skills) ? 
                         [job.qualifications || job.requirements || job.skills] : [],
          benefits: Array.isArray(job.benefits) ? job.benefits : 
                   (job.benefits) ? [job.benefits] : [],
          url: job.jobLink || job.job_link || job.url || job.link || job.apply_url || '#',
          easyApply: Boolean(job.easyApply || job.easy_apply || job.quick_apply),
          favorite: false,
          status: 'new' as const,
        }));
      }
    }
    
    // Try to parse from message text if no direct jobs array found
    const messageText = responseData?.message || responseData?.response || '';
    if (messageText) {
      const patterns = [
        /```json\s*([\s\S]+?)```/,
        /```([\s\S]+?)```/,
        /\{[\s\S]*\}/,
        /\[[\s\S]*\]/
      ];
      
      for (const pattern of patterns) {
        const match = messageText.match(pattern);
        if (match) {
          const raw = match[pattern.source.includes('```') ? 1 : 0];
          try {
            const parsedData = JSON.parse(raw);
            const arr = Array.isArray(parsedData)
              ? parsedData
              : parsedData.jobs ?? parsedData.listings ?? parsedData.results ?? [];
            
            if (arr.length > 0) {
              return arr.map((job: any, index: number) => ({
                id: `${sessionId}-${index}-${Date.now()}`,
                listingNumber: job.listingNumber || job.listing_number || index + 1,
                title: job.title || job.job_title || 'Job Title Not Available',
                company: job.company || job.company_name || 'Company Not Specified',
                location: job.location || job.job_location || 'Location Not Specified',
                salary: job.salary || job.salary_range || job.compensation || 'Salary Not Specified',
                datePosted: job.datePosted || job.date_posted || job.posted_date || 'Recently Posted',
                description: job.description || job.job_description || job.summary || 'No description available.',
                qualifications: Array.isArray(job.qualifications) ? job.qualifications : 
                               Array.isArray(job.requirements) ? job.requirements :
                               Array.isArray(job.skills) ? job.skills :
                               (job.qualifications || job.requirements || job.skills) ? 
                               [job.qualifications || job.requirements || job.skills] : [],
                benefits: Array.isArray(job.benefits) ? job.benefits : 
                         (job.benefits) ? [job.benefits] : [],
                url: job.jobLink || job.job_link || job.url || job.link || job.apply_url || '#',
                easyApply: Boolean(job.easyApply || job.easy_apply || job.quick_apply),
                favorite: false,
                status: 'new' as const,
              }));
            }
          } catch (e) {
            console.error('JSON parse error:', e);
          }
        }
      }
    }
    
    return [];
  }

  // Fixed API call function - only sends the data, not method/headers in body
  const makeApiCall = async (endpoint: string, requestData: any) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000); 
    
    try {
      console.log('Making API call:', { endpoint, requestData });
      setDebugInfo((prev: any) => ({ ...prev, lastRequest: { endpoint, requestData, timestamp: new Date().toISOString() } }));
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestData), // Only send the actual data
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      setDebugInfo((prev: any) => ({ 
        ...prev, 
        lastResponse: { 
          status: response.status, 
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          timestamp: new Date().toISOString()
        }
      }));

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorText = await response.text();
          console.log('Error response body:', errorText);
          setDebugInfo((prev: any) => ({ ...prev, lastErrorBody: errorText }));
          
          // Try to parse as JSON for more details
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.message || errorJson.error || errorMessage;
          } catch {
            // If not JSON, use the text
            if (errorText) errorMessage = errorText;
          }
        } catch (e) {
          console.log('Could not read error response body:', e);
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('API Response:', result);
      setDebugInfo((prev: any) => ({ ...prev, lastResult: result }));
      
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('API call failed:', error);
      
      if (typeof error === 'object' && error !== null && 'name' in error && (error as any).name === 'AbortError') {
        throw new Error('Request timed out after 5 minutes');
      }
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to server. Check your internet connection and CORS settings.');
      }
      
      throw error;
    }
  };

  const startSession = async () => {
    if (!user?.uid) {
      setError('Please log in to start a session.');
      return;
    }
  
    setLoading(true);
    setError(null);
  
    try {
      // Fixed: Send only the data that backend expects
      const result = await makeApiCall(`${API_BASE_URL}/run`, {
        message: `Initialize session for user ${user.uid}`,
        context: { user_id: user.uid },
        session_id: sessionId,
      });

      console.log('Session started:', result);
      setSessionStarted(true);
      sessionStorage.setItem(`session-started-${sessionId}`, 'true');
    } catch (error) {
      console.error('Failed to start session:', error);
      setError(`Failed to start session: ${error instanceof Error ? error.message : String(error)}`);
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
      // Fixed: Send only the data that backend expects
      const result = await makeApiCall(`${API_BASE_URL}/run`, {
        message: 'find me jobs',
        context: { user_id: user.uid },
        session_id: sessionId,
      });
      
      console.log('Jobs search result:', result);
      
      // Parse jobs using the helper function
      const newJobs = parseJobListings(result);
      
      if (newJobs.length > 0) {
        console.log(`Successfully parsed ${newJobs.length} jobs:`, newJobs);
        setJobs(newJobs);
        await saveToStorageAndFirebase(newJobs);
        setError(null);
      } else {
        console.warn('No jobs found in response:', result);
        
        let errorMsg = 'No jobs found in the response.';
        if (result.message) {
          const preview = result.message.substring(0, 300);
          errorMsg += ` Response preview: "${preview}${result.message.length > 300 ? '...' : ''}"`;
        }
        
        setError(errorMsg);
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
      setError(
        `Failed to fetch jobs: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
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
      // Fixed: Send only the data that backend expects
      const result = await makeApiCall(`${API_BASE_URL}/run`, {
        message: `${jobIndex + 1}`,
        context: { user_id: user.uid },
        session_id: sessionId,
      });

      console.log('Research result:', result);
      
      // Update job status to viewed after research
      const updatedJobs = jobs.map(job => 
        job.id === jobId ? { ...job, status: 'viewed' as const } : job
      );
      setJobs(updatedJobs);
      await saveToStorageAndFirebase(updatedJobs);
      
    } catch (error) {
      console.error('Failed to research job:', error);
      setError(`Failed to research job: ${error instanceof Error ? error.message : String(error)}`);
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
      // Fixed: Send only the data that backend expects - consistent format
      const result = await makeApiCall(`${API_BASE_URL}/run`, {
        message: 'COMPLETE',
        context: { user_id: user.uid },
        session_id: sessionId,
      });

      console.log('Session completed:', result);
      setSessionStarted(false);
      sessionStorage.removeItem(`session-started-${sessionId}`);
    } catch (error) {
      console.error('Failed to complete session:', error);
      setError(`Failed to complete session: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
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

  // Test connection function
  const testConnection = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      
      if (response.ok) {
        setError('✅ Connection test successful!');
      } else {
        setError(`❌ Connection test failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      setError(
        `❌ Connection test failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setLoading(false);
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

        {/* Debug Info */}
        {debugInfo && (
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mb-6 text-xs">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold">Debug Information:</h3>
              <button 
                onClick={() => setDebugInfo(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>
            <pre className="overflow-auto max-h-40 text-gray-700 dark:text-gray-300">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className={`border rounded-lg p-4 mb-6 ${
            error.startsWith('✅') 
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
          }`}>
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm">{error}</div>
                <button 
                  onClick={() => setError(null)}
                  className="text-xs underline mt-1 opacity-75 hover:opacity-100"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Control Panel */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={testConnection}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertCircle className="w-4 h-4" />}
              Test Connection
            </button>

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

                {(() => {
                  const desc = job.description;
                  const isExpanded = expanded[job.id];
                  const limit = 150;
                  const shouldTruncate = desc.length > limit;
                  return (
                    <div className="mb-4">
                      <p className="text-gray-700 dark:text-gray-300 text-sm">
                        {shouldTruncate && !isExpanded ? `${desc.slice(0, limit)}...` : desc}
                      </p>
                      {shouldTruncate && (
                        <button
                          onClick={() => toggleExpand(job.id)}
                          className="mt-1 text-blue-600 hover:underline text-xs"
                        >
                          {isExpanded ? 'Show Less' : 'Read More'}
                        </button>
                      )}
                    </div>
                  );
                })()}

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