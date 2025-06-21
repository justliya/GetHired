/* eslint-disable @typescript-eslint/no-explicit-any */
// pages/JobListings.tsx

import { useState, useRef, useEffect, useCallback } from "react";
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { signInAnonymously } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { v4 as uuidv4 } from "uuid";

import { auth, db } from "../firebase";
import { saveListingsToUserProfile } from "../hooks/JobSave";
import JobHeader from "../components/JobHeader";
import JobFilters from "../components/JobFilters";
import JobResults from "../components/JobResults";

import type { JobListing } from "../types";
import { ENV } from "../config/environment";


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
  const anonId = useRef(`anon-${uuidv4()}`).current;
  const userId = user?.uid || anonId;

  // Local state
  const [profileJobs, setProfileJobs] = useState<JobListing[]>([]);
  const [agentJobs, setAgentJobs] = useState<JobListing[]>([]);
  const [useAgentJobs, setUseAgentJobs] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [sessionStarted, setSessionStarted] = useState(false);

  // 1) Sign in anonymously if needed
  useEffect(() => {
    if (!loading && !user && !error) {
      signInAnonymously(auth).catch(console.error);
    }
  }, [user, loading, error]);

  // 2) Load profile jobs
  const loadProfile = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data() as any;
        if (Array.isArray(data.jobListings)) {
          setProfileJobs(data.jobListings);
        }
      }
    } catch (e) {
      console.error("Error in JSON parsing:", e);
    }
  }, [user]);

  // 3) Load session data
  const loadSessionData = useCallback(async () => {
    // Attempt sessionStorage first
    const raw = sessionStorage.getItem(sessionStorageKey);
    if (raw) {
      const data: SessionData = JSON.parse(raw);
      setAgentJobs(data.agentJobs);
      setSearchQuery(data.searchQuery);
      setLocationFilter(data.filters.locationFilter);
      setStatusFilter(data.filters.statusFilter);
      setUseAgentJobs(data.agentJobs.length > 0);
      setSessionStarted(data.agentJobs.length > 0);
    }

    // Override with Firestore if available
    if (user?.uid) {
      const sessRef = doc(db, "users", user.uid, "sessions", sessionId);
      const snap = await getDoc(sessRef);
      if (snap.exists()) {
        const data = snap.data() as SessionData;
        setAgentJobs(data.agentJobs);
        setSearchQuery(data.searchQuery);
        setLocationFilter(data.filters.locationFilter);
        setStatusFilter(data.filters.statusFilter);
        setUseAgentJobs(data.agentJobs.length > 0);
        setSessionStarted(data.agentJobs.length > 0);
      }
    }

    // Load profile separately
    await loadProfile();
  }, [user, sessionId, sessionStorageKey, loadProfile]);

  useEffect(() => {
    if (!loading) {
      loadSessionData();
    }
  }, [loading, loadSessionData]);

  // Auto-save session data whenever agentJobs changes
  const autoSaveSession = useCallback(async (jobs: JobListing[]) => {
    const payload: SessionData = {
      agentJobs: jobs,
      searchQuery,
      filters: { locationFilter, statusFilter },
      lastUpdated: new Date().toISOString(),
    };

    // Save to sessionStorage
    sessionStorage.setItem(sessionStorageKey, JSON.stringify(payload));

    // Save to Firestore if user is authenticated
    if (user?.uid) {
      const sessRef = doc(db, "users", user.uid, "sessions", sessionId);
      await setDoc(sessRef, payload, { merge: true });
    }
  }, [sessionStorageKey, user, sessionId, searchQuery, locationFilter, statusFilter]);

  // Manual save function
  const handleSave = async () => {
    await autoSaveSession(agentJobs);
    
    // Also save to profile
    if (user?.uid) {
      await saveListingsToUserProfile(
        user.uid,
        useAgentJobs ? agentJobs : profileJobs
      );
    }

    setConfirmation("Saved!");
    setTimeout(() => setConfirmation(""), 2000);
  };

  // Favorite toggle
  const handleFavoriteToggle = async (job: JobListing) => {
    const arr = useAgentJobs ? agentJobs : profileJobs;
    const updated = arr.map((j) =>
      j.id === job.id ? { ...j, favorite: !j.favorite } : j
    );
    
    if (useAgentJobs) {
      setAgentJobs(updated);
      await autoSaveSession(updated);
    } else {
      setProfileJobs(updated);
    }

    if (user?.uid) {
      const userRef = doc(db, "users", user.uid);
      try {
        if (!job.favorite) {
          await updateDoc(userRef, { applications: arrayUnion(job) });
        } else {
          await updateDoc(userRef, { applications: arrayRemove(job) });
        }
      } catch (e) {
        console.error("Error updating applications:", e);
      }
    }
  };

  const handleSearchChange = (q: string) => setSearchQuery(q);
  const handleClearFilters = () => {
    setSearchQuery("");
    setLocationFilter([]);
    setStatusFilter([]);
  };

  // Parse job listings from assistant reply
  const parseJobListings = (text: string): JobListing[] => {
    try {
      const block = /```json([\s\S]*?)```/.exec(text)?.[1] || /{[\s\S]*}/.exec(text)?.[0];
      if (!block) return [];
      const data = JSON.parse(block);
      const arr = Array.isArray(data) ? data : data.jobs ?? [];
      return arr.map((j: any, i: number) => ({
        id: j.id || `parsed-${Date.now()}-${i}`,
        title: j.title,
        company: j.company,
        location: j.location,
        salary: j.salary,
        datePosted: j.datePosted,
        status: "new",
        favorite: false,
        qualifications: j.qualifications || [],
        description: j.description,
        url: j.url,
      }));
    } catch {
      return [];
    }
  };

  // Start autonomous session
  const handleStartSession = async () => {
    setIsLoading(true);
    setSessionStarted(true);
    
    try {
      const res = await fetch(`${API_BASE_URL}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "${userId}",
          context: {
            user_id: userId,
            firebase_uid: user?.uid,
            is_anonymous: user?.isAnonymous,
          },
          session_id: sessionId,
        }),
      });
      
      if (!res.ok) throw new Error(res.statusText);
      
      setConfirmation("Session started successfully!");
      setTimeout(() => setConfirmation(""), 2000);
    } catch (err: any) {
      console.error("Error starting session:", err);
      setConfirmation(`Error starting session: ${err.message}`);
      setTimeout(() => setConfirmation(""), 3000);
      setSessionStarted(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Search for jobs autonomously
  const handleSearchJobs = async () => {
    if (!sessionStarted) {
      setConfirmation("Please start a session first!");
      setTimeout(() => setConfirmation(""), 2000);
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "find me jobs",
          context: {
            user_id: userId,
            firebase_uid: user?.uid,
            is_anonymous: user?.isAnonymous,
          },
          session_id: sessionId,
        }),
      });

      if (!res.ok) throw new Error(res.statusText);
      
      const { message: reply, data } = await res.json();
      const newJobs = Array.isArray(data?.jobs) ? data.jobs : parseJobListings(reply);
      
      if (newJobs.length) {
        const updatedJobs = [...agentJobs, ...newJobs];
        setAgentJobs(updatedJobs);
        setUseAgentJobs(true);
        
        // Auto-save to session storage
        await autoSaveSession(updatedJobs);
        
        setConfirmation(`Found ${newJobs.length} new jobs and saved automatically!`);
        setTimeout(() => setConfirmation(""), 3000);
      } else {
        setConfirmation("No new jobs found.");
        setTimeout(() => setConfirmation(""), 2000);
      }
    } catch (err: any) {
      console.error("Error searching jobs:", err);
      setConfirmation(`Error searching jobs: ${err.message}`);
      setTimeout(() => setConfirmation(""), 3000);
    } finally {
      setIsLoading(false);
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
    <div className="max-w-7xl mx-auto px-4">
      <JobHeader
        useAgentJobs={useAgentJobs}
        agentJobsCount={agentJobs.length}
        user={user ? {
          isAnonymous: user.isAnonymous,
          email: user.email || undefined,
          uid: user.uid
        } : null}
        onToggleAgentJobs={() => setUseAgentJobs(v => !v)}
        showChatBot={false}
        onToggleChat={() => {}}
        onNewChat={handleNewSession}
        onSave={handleSave}
      />

      {/* Autonomous Agent Controls */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Autonomous Job Agent</h2>
        <div className="flex flex-wrap gap-3">
          {!sessionStarted ? (
            <button
              onClick={handleStartSession}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-6 py-2 rounded-md font-medium transition-colors"
            >
              {isLoading ? "Starting Session..." : "Start Session"}
            </button>
          ) : (
            <>
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