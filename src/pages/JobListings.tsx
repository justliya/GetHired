
/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { Search, Loader2, AlertCircle, RefreshCw, Trash2 } from 'lucide-react';
import JobCard from '../components/JobCard';
import Card from '../components/Card';
import Button from '../components/Button';
import { auth, db } from '../firebase';
import { v4 as uuidv4 } from 'uuid';
import { useNavigate } from 'react-router-dom';
import type { JobListing } from '../types';
import { ENV } from "../config/environment";
// Get API URL from environment variable or use default
const API_BASE_URL = ENV.GETHIRED_AGENTS_API_URL;


export default function JobListings() {
  const [user, authLoading, authError] = useAuthState(auth);
  const [sessionId, setSessionId] = useState(() => {
    const existing = sessionStorage.getItem('active-session-id');
    const newId = existing || `session-${uuidv4()}`;
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
  const [clearingData, setClearingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [companyResearchData, setCompanyResearchData] = useState<any>(null);

  const navigate = useNavigate();

  const saveToUserProfile = React.useCallback(async (updatedJobs: JobListing[], researchData?: any) => {
    if (!user?.uid) return;

    try {
      // Save current search session to user profile
      const userSearchRef = doc(db, 'users', user.uid, 'jobSearches', sessionId);
      await setDoc(userSearchRef, {
        sessionId: sessionId,
        jobs: updatedJobs,
        jobCount: updatedJobs.length,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        status: 'active'
      });

      // Save company research if provided
      if (researchData) {
        const researchRef = doc(db, 'users', user.uid, 'companyResearch', sessionId);
        await setDoc(researchRef, {
          sessionId: sessionId,
          researchData: researchData,
          jobListings: updatedJobs,
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        });
      }

      // Update user's current active session
      const userProfileRef = doc(db, 'users', user.uid);
      await setDoc(userProfileRef, {
        currentSessionId: sessionId,
        lastSearchDate: new Date().toISOString(),
        totalJobsViewed: updatedJobs.length
      }, { merge: true });

      // Also save to sessionStorage for quick access
      sessionStorage.setItem(sessionStorageKey, JSON.stringify(updatedJobs));
      if (researchData) {
        localStorage.setItem(`companyResearch-${sessionId}`, JSON.stringify(researchData));
      }

    } catch (error) {
      console.error('Failed to save to user profile:', error);
      throw new Error('Failed to save data to your profile');
    }
  }, [user, sessionId, sessionStorageKey]);

  const loadFromUserProfile = React.useCallback(async () => {
    if (!user?.uid) return;

    try {
      // Load current session from user profile
      const userSearchRef = doc(db, 'users', user.uid, 'jobSearches', sessionId);
      const searchSnap = await getDoc(userSearchRef);

      if (searchSnap.exists()) {
        const data = searchSnap.data();
        const savedJobs = data.jobs || [];
        if (savedJobs.length > 0) {
          setJobs(savedJobs);
          setSessionStarted(true);
          sessionStorage.setItem(`session-started-${sessionId}`, 'true');
        }
      }

      // Load company research for this session
      const researchRef = doc(db, 'users', user.uid, 'companyResearch', sessionId);
      const researchSnap = await getDoc(researchRef);
      if (researchSnap.exists()) {
        const data = researchSnap.data();
        setCompanyResearchData(data.researchData);
        if (data.researchData) {
          localStorage.setItem(`companyResearch-${sessionId}`, JSON.stringify(data.researchData));
        }
      }
    } catch (error) {
      console.error('Failed to load from user profile:', error);
    }
  }, [user, sessionId]);

  useEffect(() => {
    if (!user || authLoading) return;
    loadFromUserProfile();
  }, [user, authLoading, loadFromUserProfile]);

  const clearAllData = async () => {
    if (!user?.uid) return;

    setClearingData(true);
    setError(null);

    try {
      // Delete from Firebase
      const userSearchRef = doc(db, 'users', user.uid, 'jobSearches', sessionId);
      await deleteDoc(userSearchRef);

      const researchRef = doc(db, 'users', user.uid, 'companyResearch', sessionId);
      await deleteDoc(researchRef);

      // Clear local storage
      sessionStorage.removeItem(sessionStorageKey);
      sessionStorage.removeItem(`session-started-${sessionId}`);
      localStorage.removeItem(`companyResearch-${sessionId}`);

      // Generate new session ID
      const newSessionId = `session-${uuidv4()}`;
      setSessionId(newSessionId);
      sessionStorage.setItem('active-session-id', newSessionId);

      // Reset state
      setJobs([]);
      setCompanyResearchData(null);
      setSessionStarted(false);

      // Update user profile to clear current session
      const userProfileRef = doc(db, 'users', user.uid);
      await setDoc(userProfileRef, {
        currentSessionId: null,
        lastClearedDate: new Date().toISOString()
      }, { merge: true });

    } catch (error) {
      console.error('Failed to clear data:', error);
      setError('Failed to clear search data. Please try again.');
    } finally {
      setClearingData(false);
    }
  };

  const startJobSearch = async () => {
    if (!user?.uid) {
      setError('Please log in to search for jobs');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      // Simple payload - backend only needs user_id
      const payload = {
        user_id: user.uid
      };

      console.log('Sending job search request to:', `${API_BASE_URL}/run-job-search`);
      console.log('Payload:', payload);

      // Send POST request using fetch
      const response = await fetch(`${API_BASE_URL}/run-job-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      console.log('Response received. Status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      // Parse JSON response
      const responseData = await response.json();
      console.log('Parsed response data:', responseData);

      // Check for error in response
      if (responseData.error) {
        throw new Error(responseData.error);
      }

      // Extract data
      const jobListings = responseData.job_listings;
      const companyResearch = responseData.company_research;

      if (jobListings && jobListings.jobs && Array.isArray(jobListings.jobs)) {
        // Transform jobs to match frontend format
        const transformedJobs = jobListings.jobs.map((job: any, index: number) => ({
          id: `job-${sessionId}-${index}`,
          listingNumber: job.listingNumber || index + 1,
          title: job.title || 'Not specified',
          company: job.company || 'Not specified',
          location: job.location || 'Not specified',
          salary: job.salary || 'Not specified',
          datePosted: job.datePosted || new Date().toISOString().split('T')[0],
          description: job.description || 'No description available',
          qualifications: Array.isArray(job.qualifications) ? job.qualifications : [],
          benefits: Array.isArray(job.benefits) ? job.benefits : [],
          jobLink: job.jobLink || '#',
          easyApply: Boolean(job.easyApply),
          favorite: false,
          status: 'new' as const
        }));

        console.log(`Successfully transformed ${transformedJobs.length} jobs`);

        // Update state
        setJobs(transformedJobs);
        setSessionStarted(true);
        sessionStorage.setItem(`session-started-${sessionId}`, 'true');

        // Save to profile with company research
        await saveToUserProfile(transformedJobs, companyResearch);

        // Store company research data
        if (companyResearch) {
          setCompanyResearchData(companyResearch);
          console.log('Company research data stored');
        }

        return true; // Indicate success
      } else {
        throw new Error('No job listings found in response');
      }
    } catch (error) {
      console.error('Job search error:', error);
      
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        setError('Cannot connect to server. Make sure the server is running at ' + API_BASE_URL);
      } else if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An unexpected error occurred');
      }
      
      return false; // Indicate failure
    } finally {
      setLoading(false);
    }
  };

  const handleResearch = (listingNumber: number) => {
    console.log('Research clicked for listing:', listingNumber);
    const selectedJob = jobs.find(j => j.listingNumber === listingNumber);
    console.log('Selected job:', selectedJob);
    console.log('Company research data:', companyResearchData);
    
    // Find the company research for this specific job
    let specificCompanyResearch = null;
    if (companyResearchData && Array.isArray(companyResearchData) && selectedJob) {
      specificCompanyResearch = companyResearchData.find((research: any) => 
        research.companyOverview?.name === selectedJob.company
      );
    }
    
    // Navigate to company research page with all the data
    navigate('/company-research', { 
      state: { 
        sessionId,
        listingNumber,
        selectedJob,
        companyResearch: specificCompanyResearch,
        allCompanyResearch: companyResearchData,
        jobs 
      } 
    });
  };

  const handleFavoriteToggle = (job: JobListing) => {
    const updatedJobs = jobs.map(j => 
      j.id === job.id ? { ...j, favorite: !j.favorite } : j
    );
    setJobs(updatedJobs);
    saveToUserProfile(updatedJobs, companyResearchData);
  };

  const handleTailorResume = (job: JobListing) => {
    navigate(`/resume-tailoring/${job.id}`, { state: { job } });
  };

    const handleDeleteJob = (job: JobListing) => {
    const updatedJobs = jobs.filter(j => j.id !== job.id);
    setJobs(updatedJobs);
    saveToUserProfile(updatedJobs, companyResearchData);
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (authError || !user) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Card className="p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Authentication Required
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Please log in to access job listings.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Job Listings</h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              {sessionStarted 
                ? `Found ${jobs.length} job opportunities for you`
                : 'Start your personalized job search'
              }
            </p>
          </div>
          {sessionStarted && (
            <div className="flex gap-2">
              <Button
                onClick={startJobSearch}
                size="sm"
                variant="secondary"
                disabled={loading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                New Search
              </Button>
              <Button
                onClick={clearAllData}
                size="sm"
                variant="error"
                disabled={clearingData}
                className="flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Clear All
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Session Info */}
      {sessionStarted && (
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm text-gray-600 dark:text-gray-400">
          Session ID: {sessionId.slice(-8)}
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        </div>
      )}

      {/* Start session button */}
      {!sessionStarted && !loading && (
        <Card className="p-8 text-center">
          <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Ready to Find Your Next Opportunity?
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            We'll search for jobs based on your preferences and provide company insights
          </p>
          <Button onClick={startJobSearch} size="lg">
            Start Job Search
          </Button>
        </Card>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            Searching for jobs and researching companies...
          </p>
        </div>
      )}

      {/* Clearing state */}
      {clearingData && (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-red-600 mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            Clearing search data...
          </p>
        </div>
      )}

      {/* Job listings */}
      {sessionStarted && !loading && !clearingData && jobs.length > 0 && (
        <>
          {companyResearchData && (
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-blue-800 dark:text-blue-200">
                ✓ Company research completed. Click "Research" on any job to view detailed insights.
              </p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onFavoriteToggle={handleFavoriteToggle}
                onResearch={handleResearch}
                onTailorResume={handleTailorResume}
                onDelete={handleDeleteJob}
              />
            ))}
          </div>
        </>
      )}

      {/* Empty state */}
      {sessionStarted && !loading && !clearingData && jobs.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            No jobs found. Try adjusting your preferences.
          </p>
          <Button onClick={startJobSearch} className="mt-4">
            Search Again
          </Button>
        </Card>
      )}
    </div>
  );
}