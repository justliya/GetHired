/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { Search, CheckCircle, Clock, Loader2, AlertCircle, Play, ArrowRight } from 'lucide-react';
import JobCard from '../components/JobCard';
import Card from '../components/Card';
import Button from '../components/Button';
import { auth, db } from '../firebase';
import { v4 as uuidv4 } from 'uuid';
import { useNavigate } from 'react-router-dom';


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
  jobLink?: string;
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
  const [, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // const [debugInfo, setDebugInfo] = useState<any>(null); // Commented out debug info

  const navigate = useNavigate();

  const saveToStorageAndFirebase = React.useCallback(async (updatedJobs: JobListing[]) => {
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
  }, [user, sessionId, sessionStorageKey]);

  useEffect(() => {
    if (!user || authLoading) return;

    const loadJobs = async () => {
      try {
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
  }, [jobs.length, saveToStorageAndFirebase]);

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
      // setDebugInfo((prev: any) => ({ ...prev, lastRequest: { endpoint, requestData, timestamp: new Date().toISOString() } })); // Commented out debug

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

      // setDebugInfo((prev: any) => ({
      //   ...prev,
      //   lastResponse: {
      //     status: response.status,
      //     statusText: response.statusText,
      //     headers: Object.fromEntries(response.headers.entries()),
      //     timestamp: new Date().toISOString()
      //   }
      // })); // Commented out debug

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorText = await response.text();
          console.log('Error response body:', errorText);
          // setDebugInfo((prev: any) => ({ ...prev, lastErrorBody: errorText })); // Commented out debug

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
      // setDebugInfo((prev: any) => ({ ...prev, lastResult: result })); // Commented out debug

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

      const result = await makeApiCall(`${API_BASE_URL}/run`, {
        message: 'find me jobs',
        context: { user_id: user.uid },
        session_id: sessionId,
      });

      console.log('Jobs search result:', result);


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
        `Failed to fetch jobs: ${error instanceof Error ? error.message : String(error)
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

      if (user?.uid) {
        const favoritedJob = updatedJobs.find(job => job.id === jobId);
        const favoriteRef = doc(db, 'users', user.uid, 'favorites', jobId);

        if (favoritedJob?.favorite) {
          await setDoc(favoriteRef, favoritedJob);
        } else {
          await deleteDoc(favoriteRef);

          const jobListingRef = doc(db, 'users', user.uid, 'jobListings', jobId);
          await deleteDoc(jobListingRef);
        }
      }
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

  const currentJob = jobs[jobIndex];
  setActionLoading(jobId);
  setError(null);

  try {
    const result = await makeApiCall(`${API_BASE_URL}/run`, {
      message: `${jobIndex + 1}`,
      context: { user_id: user.uid },
      session_id: sessionId,
    });

    console.log('Research API result:', result);

    // Save the job listing to dedicated subcollection
    const jobListingRef = doc(db, 'users', user.uid, 'jobListings', jobId);
    await setDoc(jobListingRef, currentJob);

    // Parse and save company research data
    let parsedResearchData = null;
    
    // Try to parse the research data from the API response
    const parseResearchData = (rawData: any) => {
      if (!rawData) return null;

      // Check if it's already in the right format
      if (rawData.companyOverview && rawData.ratings) {
        return rawData;
      }

      // Try different nested structures
      const possibleStructures = [
        rawData?.companyResearch,
        rawData?.data?.companyResearch,
        rawData?.researchData,
        rawData?.research,
        rawData?.response?.companyResearch,
        Array.isArray(rawData) ? rawData[0] : null,
      ].filter(obj => obj && typeof obj === 'object');

      for (const obj of possibleStructures) {
        if (obj.companyOverview && obj.ratings) {
          return obj;
        }
      }

      // Try to parse from message text
      const messageText = rawData?.message || rawData?.data?.raw_events?.[0]?.parts?.[0]?.text || rawData?.text || "";
      if (messageText) {
        const patterns = [
          /```json\s*([\s\S]+?)```/,
          /```([\s\S]+?)```/,
          /\{[\s\S]*"companyOverview"[\s\S]*\}/,
          /\{[\s\S]*\}/,
        ];

        for (const pattern of patterns) {
          const match = messageText.match(pattern);
          if (match) {
            const jsonStr = match[pattern.source.includes('```') ? 1 : 0];
            try {
              const parsed = JSON.parse(jsonStr);
              const dataObj = parsed.companyResearch ?? parsed;
              if (dataObj.companyOverview && dataObj.ratings) {
                return dataObj;
              }
            } catch (e) {
              console.warn('JSON parse error:', e);
            }
          }
        }
      }

      return null;
    };

    parsedResearchData = parseResearchData(result);

    // Save to both Firebase and localStorage
    const researchDocData = {
      jobId: jobId,
      jobTitle: currentJob.title,
      company: currentJob.company,
      researchData: parsedResearchData || result, // Save raw data if parsing fails
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };

    // Save company research to its own subcollection
    const companyResearchRef = doc(db, 'users', user.uid, 'companyResearch', jobId);
    await setDoc(companyResearchRef, researchDocData);

    // Also save to localStorage for immediate access
    const localStorageKey = `company-research-${jobId}`;
    if (parsedResearchData) {
      localStorage.setItem(localStorageKey, JSON.stringify(parsedResearchData));
    } else {
      // Save the raw result if we couldn't parse it properly
      localStorage.setItem(localStorageKey, JSON.stringify(result));
    }

    // Update job status to viewed in the current session
    const updatedJobs = jobs.map(job =>
      job.id === jobId ? { ...job, status: 'viewed' as const } : job
    );
    setJobs(updatedJobs);
    await saveToStorageAndFirebase(updatedJobs);

    console.log('Job and research data saved to subcollections and localStorage:', {
      jobId,
      jobTitle: currentJob.title,
      company: currentJob.company,
      researchDataParsed: !!parsedResearchData
    });

    // Navigate to company research page
    navigate(`/company-research/${jobId}`);
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

  // Commented out test connection function
  // const testConnection = async () => {
  //   setLoading(true);
  //   setError(null);

  //   try {
  //     const response = await fetch(`${API_BASE_URL}/health`, {
  //       method: 'GET',
  //       headers: { 'Accept': 'application/json' },
  //     });

  //     if (response.ok) {
  //       setError('✅ Connection test successful!');
  //     } else {
  //       setError(`❌ Connection test failed: ${response.status} ${response.statusText}`);
  //     }
  //   } catch (error) {
  //     setError(
  //       `❌ Connection test failed: ${error instanceof Error ? error.message : String(error)
  //       }`
  //     );
  //   } finally {
  //     setLoading(false);
  //   }
  // };

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
            Job Search Agent
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Find your next career opportunity with AI-powered job matching
          </p>
          {user && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Welcome {user.email}, after jobs appear select your favorites and the ones you would like to research
              then click 'Complete Session' when you are done and researched listing will appear in the 'Resume Tailoring' tab!
            </p>
          )}
        </div>

        {/* Getting Started Instructions */}
        {!sessionStarted && jobs.length === 0 && (
          <Card className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
            <div className="text-center">
              <Play className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                Let's Find Your Dream Job!
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-2xl mx-auto">
                Follow these simple steps to get personalized job recommendations tailored to your skills and preferences.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="flex flex-col items-center text-center">
                  <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold mb-3">1</div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Start Session</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Initialize your job search session with our AI agent</p>
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center font-bold mb-3">2</div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Search Jobs</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Let our AI find relevant job opportunities for you</p>
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="w-10 h-10 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold mb-3">3</div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Research & Apply</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Get company insights and apply to your favorite positions</p>
                </div>
              </div>

              <div className="flex justify-center">
                <ArrowRight className="w-6 h-6 text-blue-600 animate-bounce" />
              </div>
            </div>
          </Card>
        )}

        {/* Session Active Instructions */}
        {sessionStarted && jobs.length === 0 && !loading && (
          <Card className="mb-8 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
            <div className="text-center">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                Session Active! 🎉
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Great! Your job search session is now active. Click "Search Jobs" below to find opportunities that match your profile.
              </p>
            </div>
          </Card>
        )}

        {/* Commented out Debug Info section */}
        {/* {debugInfo && (
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
        )} */}

        {/* Error Display */}
        {error && (
          <div className={`border rounded-lg p-4 mb-6 ${error.startsWith('✅')
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
        <Card className="mb-8 bg-gradient-to-r from-blue-100 via-white to-indigo-100 dark:from-blue-900/40 dark:via-slate-800/60 dark:to-indigo-900/40 border border-blue-200 dark:border-slate-700 rounded-2xl shadow-md">
          <div className="flex flex-wrap gap-4 justify-center">
          {/* <Button
              onClick={testConnection}
              disabled={loading}
              variant="secondary"
              size="md"
              icon={loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertCircle className="w-4 h-4" />}
            >
              Test Connection
            </Button>*/}

            <Button
              onClick={startSession}
              disabled={loading || sessionStarted}
              variant={sessionStarted ? 'success' : 'primary'}
              size="md"
              icon={
                loading && !sessionStarted ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : sessionStarted ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <Clock className="w-4 h-4" />
                )
              }
            >
              {sessionStarted ? 'Session Active' : 'Start Session'}
            </Button>

            <Button
              onClick={searchJobs}
              disabled={!sessionStarted || loading}
              variant="success"
              size="md"
              icon={
                loading && sessionStarted ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )
              }
            >
              Search Jobs
            </Button>

            <Button
              onClick={completeSession}
              disabled={loading}
              variant="secondary"
              size="md"
              icon={loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            >
              Complete Session
            </Button>
          </div>
        </Card>

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
            <JobCard
              key={job.id}
              job={job}
              onFavoriteToggle={(jobObj) => handleFavorite(jobObj.id)}
              onResearch={(jobObj) => handleResearch(jobObj.id)}
              onTailorResume={(jobObj) => console.log('Tailor resume clicked for', jobObj.id)}
              onDelete={(jobObj) => handleDelete(jobObj.id)}
            />
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