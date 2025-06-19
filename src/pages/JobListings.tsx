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

interface SessionData {
  agentJobs: JobListing[];
  searchQuery: string;
  filters: {
    locationFilter: string[];
    statusFilter: string[];
  };
  lastUpdated: string;
}

const API_BASE_URL = "https://gethired-agents-104139545590.us-central1.run.app";

const JobListings = () => {
  const navigate = useNavigate();
  const [user, loading, error] = useAuthState(auth);
  const sessionId = useRef(`conv-${uuidv4()}`).current;
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

  // Reset session
  const handleNewSession = () => {
    setAgentJobs([]);
    setUseAgentJobs(false);
    setSessionStarted(false);
    sessionStorage.removeItem(sessionStorageKey);
    setConfirmation("New session started!");
    setTimeout(() => setConfirmation(""), 2000);
  };

  if (loading) return <div className="py-12 text-center text-gray-600">Initializing auth…</div>;
  if (error) return <div className="py-12 text-center text-red-600">Auth Error: {error.message}</div>;

  // Display and filter jobs
  const displayJobs = useAgentJobs ? agentJobs : profileJobs;
  const filteredJobs = displayJobs.filter((job) => {
    if (searchQuery && ![job.title, job.company].some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))) return false;
    if (locationFilter.length && !locationFilter.includes(job.location)) return false;
    if (statusFilter.length && !statusFilter.includes(job.status)) return false;
    return true;
  });

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
                onClick={handleSearchJobs}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white px-6 py-2 rounded-md font-medium transition-colors"
              >
                {isLoading ? "Searching Jobs..." : "Search Jobs"}
              </button>
              <button
                onClick={handleNewSession}
                disabled={isLoading}
                className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 text-white px-6 py-2 rounded-md font-medium transition-colors"
              >
                New Session
              </button>
            </>
          )}
        </div>
        {sessionStarted && (
          <p className="text-sm text-green-600 mt-2">
            ✓ Session active - Jobs will be automatically saved to session storage
          </p>
        )}
      </div>

      {confirmation && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="bg-green-100 text-green-800 p-2 rounded mb-4 text-center"
        >
          {confirmation}
        </motion.div>
      )}

      <JobFilters
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onClear={handleClearFilters}
      />

      <AnimatePresence>
        <JobResults
          jobs={filteredJobs}
          onResearch={job => navigate(`/company-research/${job.id}`)}
          onFavoriteToggle={handleFavoriteToggle}
        />
      </AnimatePresence>
    </div>
  );
};

export default JobListings;
