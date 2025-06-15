/* eslint-disable @typescript-eslint/no-explicit-any */
// pages/JobListings.tsx

import { useState, useRef, useEffect, useCallback } from "react";
import { doc, getDoc} from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { signInAnonymously } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { v4 as uuidv4 } from "uuid";

import { auth } from "../firebase";
import { getFirestore } from "firebase/firestore";
import { saveListingsToUserProfile } from "../hooks/JobSave";

import JobHeader from "../components/JobHeader";
import JobFilters from "../components/JobFilters";
import JobResults from "../components/JobResults";
import ChatBot from "../components/ChatBot";

import type { JobListing } from "../types";

interface ChatMessage {
  id: string | number;
  role: "user" | "assistant";
  content: string;
  jobs?: JobListing[];
}

const API_BASE_URL = "https://gethired-agents-104139545590.us-central1.run.app";

const JobListings = () => {
  const db = getFirestore();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [agentJobs, setAgentJobs] = useState<JobListing[]>([]);
  const [useAgentJobs, setUseAgentJobs] = useState(false);

  // ChatBot state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  // Auth & session
  const [user, loading, error] = useAuthState(auth);
  const sessionId = useRef(`conv-${uuidv4()}`).current;
  const userId = user?.uid || `anon-${uuidv4()}`;

  // UI
  const [showChatBot, setShowChatBot] = useState(false);
  const [confirmation, setConfirmation] = useState("");

  // Anonymous sign-in
  useEffect(() => {
    if (!loading && !user && !error) {
      signInAnonymously(auth).catch(console.error);
    }
  }, [user, loading, error]);

  // Load saved jobs & filters
  const loadSessionData = useCallback(async () => {
    if (!user?.uid) return;
    const sessionRef = doc(db, "users", user.uid, "sessions", sessionId);
    const docSnap = await getDoc(sessionRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as any;
      setAgentJobs(data.agentJobs || []);
      setSearchQuery(data.searchQuery || "");
      setLocationFilter(data.filters?.locationFilter || []);
      setStatusFilter(data.filters?.statusFilter || []);
      setUseAgentJobs((data.agentJobs || []).length > 0);
    }
  }, [db, sessionId, user]);

  useEffect(() => {
    if (user && !loading) loadSessionData();
  }, [user, loading, loadSessionData]);

  // Persist favorites locally + Firestore
  const handleFavoriteToggle = async (job: JobListing) => {
    const updated = agentJobs.map((j) =>
      j.id === job.id ? { ...j, favorite: !j.favorite } : j
    );
    setAgentJobs(updated);
    if (user?.uid) {
      await saveListingsToUserProfile(user.uid, updated);
      setConfirmation("Saved to your profile!");
      setTimeout(() => setConfirmation(""), 2000);
    }
  };

  // Basic filters
  const handleSearchChange = (q: string) => setSearchQuery(q);
  const handleClearFilters = () => {
    setSearchQuery("");
    setLocationFilter([]);
    setStatusFilter([]);
  };

  // Filtered list
  const filteredJobs = agentJobs.filter((job) => {
    if (
      searchQuery &&
      !job.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !job.company.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    if (locationFilter.length && !locationFilter.includes(job.location)) return false;
    if (statusFilter.length && !statusFilter.includes(job.status)) return false;
    return true;
  });

  // ChatBot → A2A
  const handleSendMessage = async (message: string) => {
    // add user bubble
    setChatMessages((prev) => [
      ...prev,
      { id: Date.now(), role: "user", content: message },
    ]);
    setIsTyping(true);

    try {
      const res = await fetch(`${API_BASE_URL}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          context: { user_id: userId, firebase_uid: user?.uid, is_anonymous: user?.isAnonymous },
          session_id: sessionId,
        }),
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const { message: reply, data } = await res.json();

      // detect jobs array
      const jobsFromAgent: JobListing[] = Array.isArray(data?.jobs)
        ? data.jobs.map((j: any, i: number) => ({
            id: j.id || `agent-${Date.now()}-${i}`,
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
          }))
        : [];

      if (jobsFromAgent.length) {
        setAgentJobs((prev) => [...prev, ...jobsFromAgent]);
        setUseAgentJobs(true);
      }

      // add assistant bubble
      setChatMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: "assistant", content: reply, jobs: jobsFromAgent },
      ]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: `Error: ${(err as Error).message}`,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-12 text-center">
        <p className="text-gray-600">Initializing auth…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="max-w-7xl mx-auto py-12 text-center">
        <p className="text-red-600">Auth Error: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4">
      <JobHeader
        useAgentJobs={useAgentJobs}
        agentJobsCount={agentJobs.length}
        user={
          user
            ? { isAnonymous: user.isAnonymous, email: user.email || undefined, uid: user.uid }
            : null
        }
        onToggleAgentJobs={() => setUseAgentJobs((v) => !v)}
        showChatBot={showChatBot}
        onToggleChat={() => setShowChatBot((v) => !v)}
        onNewChat={() => {
          setChatMessages([]);
          setAgentJobs([]);
          setUseAgentJobs(false);
        }}
        onSave={async () => {
          if (user?.uid) {
            await saveListingsToUserProfile(user.uid, agentJobs);
            setConfirmation("Saved!");
            setTimeout(() => setConfirmation(""), 2000);
          }
        }}
      />

      {confirmation && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="bg-green-100 text-green-800 p-2 rounded mb-4 text-sm"
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
          onFavoriteToggle={handleFavoriteToggle}
          onResearch={(job) => navigate(`/company-research/${job.id}`)}
        />
      </AnimatePresence>

      {showChatBot && (
        <div className="mt-6">
          <ChatBot
            title="JobBot"
            description="Your AI-powered job assistant"
            messages={chatMessages}
            isTyping={isTyping}
            onSendMessage={handleSendMessage}
          />
        </div>
      )}
    </div>
  );
};

export default JobListings;