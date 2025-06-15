/* eslint-disable @typescript-eslint/no-explicit-any */
// pages/JobListings.tsx

import { useState, useRef, useEffect, useCallback } from "react";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
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
import ChatBot from "../components/ChatBot";

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

interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  jobs?: JobListing[];
}

const API_BASE_URL =
  "https://gethired-agents-104139545590.us-central1.run.app";

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
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showChatBot, setShowChatBot] = useState(false);
  const [confirmation, setConfirmation] = useState("");

  // 1) Sign in anonymously if needed
  useEffect(() => {
    if (!loading && !user && !error) {
      signInAnonymously(auth).catch(console.error);
    }
  }, [user, loading, error]);

  // 2) Load profile jobs
  const loadProfile = useCallback(async () => {
    if (!user?.uid) return;
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data() as any;
      if (Array.isArray(data.jobListings)) {
        setProfileJobs(data.jobListings);
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

  // Save session + profile
  const handleSave = async () => {
    const payload: SessionData = {
      agentJobs,
      searchQuery,
      filters: { locationFilter, statusFilter },
      lastUpdated: new Date().toISOString(),
    };

    // a) sessionStorage
    sessionStorage.setItem(sessionStorageKey, JSON.stringify(payload));

    // b) Firestore sessions
    if (user?.uid) {
      const sessRef = doc(db, "users", user.uid, "sessions", sessionId);
      await setDoc(sessRef, payload, { merge: true });

      // c) Profile jobListings
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
      const block =
        /```json([\s\S]*?)```/.exec(text)?.[1] || /{[\s\S]*}/.exec(text)?.[0];
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

  // ChatBot send/receive
  const handleSendMessage = async (message: string) => {
    setChatMessages((m) => [...m, { id: Date.now(), role: "user", content: message }]);
    setIsTyping(true);

    try {
      const res = await fetch(`${API_BASE_URL}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, context: { user_id: userId, firebase_uid: user?.uid, is_anonymous: user?.isAnonymous }, session_id: sessionId }),
      });
      if (!res.ok) throw new Error(res.statusText);
      const { message: reply, data } = await res.json();

      const newJobs = Array.isArray(data?.jobs) ? data.jobs : parseJobListings(reply);
      if (newJobs.length) {
        setAgentJobs((prev) => [...prev, ...newJobs]);
        setUseAgentJobs(true);
      }

      setChatMessages((m) => [...m, { id: Date.now() + 1, role: "assistant", content: reply, jobs: newJobs }]);
    } catch (err: any) {
      setChatMessages((m) => [...m, { id: Date.now() + 1, role: "assistant", content: `Error: ${err.message}` }]);
    } finally {
      setIsTyping(false);
    }
  };

  // Initial ChatBot prompt
  useEffect(() => {
    if (showChatBot && chatMessages.length === 0 && !loading) {
      const init = ` Hello! Please return ONLY a JSON object with job listings in this format:
{
  "jobs": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "location": "City, State",
      "salary": "$XX,XXX - $XX,XXX",
      "description": "Job description",
      "qualifications": ["skill1", "skill2"],
      "datePosted": "YYYY-MM-DD"
    }
  ]
};`;
      void handleSendMessage(init);
    }
  }, [showChatBot, loading]);

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
        user={user ? { isAnonymous: user.isAnonymous, email: user.email || undefined, uid: user.uid } : null}
        onToggleAgentJobs={() => setUseAgentJobs(v => !v)}
        showChatBot={showChatBot}
        onToggleChat={() => setShowChatBot(v => !v)}
        onNewChat={() => { setChatMessages([]); setAgentJobs([]); setUseAgentJobs(false); }}
        onSave={handleSave}
      />

      {confirmation && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="bg-green-100 text-green-800 p-2 rounded mb-4 text-center">
          {confirmation}
        </motion.div>
      )}

      <JobFilters searchQuery={searchQuery} onSearchChange={handleSearchChange} onClear={handleClearFilters} />

      <AnimatePresence>
        <JobResults jobs={filteredJobs} onResearch={job => navigate(`/company-research/${job.id}`)} onFavoriteToggle={handleFavoriteToggle} />
      </AnimatePresence>

      {showChatBot && (
        <div className="mt-6">
          <ChatBot title="JobBot" description="Your AI-powered job assistant" messages={chatMessages} isTyping={isTyping} onSendMessage={handleSendMessage} />
        </div>
      )}
    </div>
  );
};

export default JobListings;
