/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { Search, Sparkles, Loader2, RefreshCw} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { mockJobListings } from '../data/mockData';
import JobCard from '../components/JobCard';
import ChatBot from '../components/ChatBot';
import { v4 as uuidv4 } from 'uuid';
import type { JobListing } from '../types/index';

interface ChatMessage {
  id: string | number;
  role: 'user' | 'assistant';
  content: string;
  audio_url?: string;
  jobs?: JobListing[];
  timestamp?: string;
}

const API_BASE_URL = '';
const APP_NAME = 'jobsearch_agents';

export default function JobListings() {
  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [showChatBot, setShowChatBot] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [agentJobs, setAgentJobs] = useState<JobListing[]>([]);
  const [useAgentJobs, setUseAgentJobs] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [availableApps, setAvailableApps] = useState<string[]>([]);


  // Filters & sorting
  const [sortField] = useState<'datePosted' | 'salary'>('datePosted');
  const [sortOrder] = useState<'asc' | 'desc'>('desc');
  const [locationFilter] = useState<string[]>([]);
  const [statusFilter] = useState<string[]>([]);

  // A2A session identifiers
  const [userId] = useState(() => `user-${uuidv4()}`);
  const [sessionId, setSessionId] = useState(() => `conv-${uuidv4()}`);
 

  // ─── Helper: Build headers ────────────────────────────
  const getHeaders = () => {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  };

  // ─── List available apps on mount ────────────────────────────────
  useEffect(() => {
    const fetchApps = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/list-apps`, {
          method: 'GET',
          headers: getHeaders(),
        });
        
        if (response.ok) {
          const apps = await response.json();
          setAvailableApps(apps);
          console.log('Available apps:', apps);
        }
      } catch (error) {
        console.error('Failed to fetch apps:', error);
      }
    };
    
    fetchApps();
  }, []);

  // ─── Enhanced JSON parser for jobs ────────────────────────────────
  function parseJobListings(responseData: any): JobListing[] {
    console.log('Full response data:', responseData);
    
    // Check various possible locations for jobs data
    const possibleJobArrays = [
      responseData?.data?.jobs,
      responseData?.jobs,
      responseData?.results,
      responseData?.listings
    ];

    for (const jobArray of possibleJobArrays) {
      if (Array.isArray(jobArray) && jobArray.length > 0) {
        return jobArray.map((job: any, i: number) => ({
          id: job.id ?? `agent-job-${Date.now()}-${i}`,
          title: job.title || job.position || 'Unknown Position',
          company: job.company || job.employer || 'Unknown Company',
          location: job.location || 'Remote',
          salary: job.salary ?? null,
          datePosted: job.datePosted || new Date().toISOString().split('T')[0],
          status: 'new' as const,
          favorite: false,
          qualifications: Array.isArray(job.qualifications) ? job.qualifications : [],
          description: job.description || '',
          url: job.url || '#'
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
        /$$[\s\S]*$$/
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
              return arr.map((job: any, i: number) => ({
                id: job.id ?? `agent-job-${Date.now()}-${i}`,
                title: job.title || job.position || 'Unknown Position',
                company: job.company || job.employer || 'Unknown Company',
                location: job.location || 'Remote',
                salary: job.salary ?? null,
                datePosted: job.datePosted || new Date().toISOString().split('T')[0],
                status: 'new' as const,
                favorite: false,
                qualifications: Array.isArray(job.qualifications) ? job.qualifications : [],
                description: job.description || '',
                url: job.url || '#'
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

  // ─── Session initialization ─────────────────────────────────────
  useEffect(() => {
    const initSession = async () => {
      if (!sessionId || !userId) return;
      
      setIsInitializing(true);
      setSessionError(null);
      
      try {
        const response = await fetch(
          `${API_BASE_URL}/apps/${APP_NAME}/users/${userId}/sessions/${sessionId}`,
          {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ 
              state: {
                preferred_language: "English",
                initialized_at: new Date().toISOString(),
                user_preferences: {
                  job_type: 'full-time',
                  remote_preference: 'flexible'
                }
              } 
            })
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Session init failed: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log('Session initialized:', data);
      } catch (error) {
        console.error('Error initializing session:', error);
        setSessionError(error instanceof Error ? error.message : 'Failed to initialize session');
      } finally {
        setIsInitializing(false);
      }
    };

    initSession();
  }, [sessionId, userId]);

  // ─── Auto-send welcome message ─────────────────────────────
  useEffect(() => {
    if (showChatBot && chatMessages.length === 0 && !isInitializing) {
      const welcomeMessage = "Hello! I'm your AI job search assistant. Tell me what kind of job you're looking for, and I'll help you find the perfect opportunities.";
      setChatMessages([{
        id: 'welcome',
        role: 'assistant',
        content: welcomeMessage,
        timestamp: new Date().toISOString()
      }]);
    }
  }, [showChatBot, chatMessages.length, isInitializing]);

  // ─── Send message to Google ADK agent ─────────────────────────────
  const handleSendMessage = async (message: string): Promise<void> => {
    const userMessageId = Date.now();
    setChatMessages(prev => [
      ...prev,
      { 
        id: userMessageId, 
        role: 'user', 
        content: message,
        timestamp: new Date().toISOString()
      }
    ]);
    setIsTyping(true);

    const payload = {
      app_name: APP_NAME,
      user_id: userId,
      session_id: sessionId,
      new_message: {
        role: 'user',
        parts: [{ text: message }]
      },
      streaming: false // Set to true for SSE
    };

    try {
      // First, make the POST request
      const response = await fetch(`${API_BASE_URL}/run_sse`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      // For SSE responses, use EventSource or parse the stream
      if (response.headers.get('content-type')?.includes('text/event-stream')) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullMessage = '';
        let responseData: any = {};

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;
                
                try {
                  const parsed = JSON.parse(data);
                  if (parsed.message) fullMessage += parsed.message;
                  if (parsed.data) responseData = { ...responseData, ...parsed.data };
                } catch (e) {
                  console.error('Parse error:', e);
                }
              }
            }
          }
        }

        // Process the complete response
        const jobs = parseJobListings({ message: fullMessage, data: responseData });
        const audioUrl = responseData?.audio_url;

        if (jobs.length > 0) {
          setAgentJobs(prev => [...prev, ...jobs]);
          setUseAgentJobs(true);
        }

        setChatMessages(prev => [
          ...prev,
          {
            id: Date.now() + 1,
            role: 'assistant',
            content: fullMessage || 'I processed your request.',
            audio_url: audioUrl,
            jobs: jobs,
            timestamp: new Date().toISOString()
          }
        ]);

      
      } else {
        // Handle regular JSON response
        const data = await response.json();
        handleRegularResponse(data);
      }

      // Helper to handle regular (non-SSE) responses
      function handleRegularResponse(data: any) {
        const jobs = parseJobListings(data);
        const audioUrl = data?.audio_url;

        if (jobs.length > 0) {
          setAgentJobs(prev => [...prev, ...jobs]);
          setUseAgentJobs(true);
        }

        setChatMessages(prev => [
          ...prev,
          {
            id: Date.now() + 2,
            role: 'assistant',
            content: data?.message || data?.response || 'I processed your request.',
            audio_url: audioUrl,
            jobs: jobs,
            timestamp: new Date().toISOString()
          }
        ]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setChatMessages(prev => [
        ...prev,
        {
          id: Date.now() + 3,
          role: 'assistant',
          content: 'Sorry, there was an error processing your request.',
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };
  
  // ─── Create new conversation ─────────────────────────────────────
  const handleNewConversation = () => {
      
    
    // Reset state
    setSessionId(`conv-${uuidv4()}`);
    setChatMessages([]);
    setAgentJobs([]);
    setUseAgentJobs(false);
    setSessionError(null);
 
  };

  // ─── Filter and sort jobs ─────────────────────────────────────
  const displayJobs = useAgentJobs && agentJobs.length > 0 ? agentJobs : mockJobListings;

  const filteredJobs = displayJobs
    .filter(job => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!job.title.toLowerCase().includes(q) && 
            !job.company.toLowerCase().includes(q) &&
            !job.description.toLowerCase().includes(q)) {
          return false;
        }
      }
      if (locationFilter.length && !locationFilter.includes(job.location)) return false;
      if (statusFilter.length && !statusFilter.includes(job.status)) return false;
      return true;
    })
  .sort((a, b) => {
    if (sortField === 'datePosted') {
      const da = new Date(a.datePosted);
      const db = new Date(b.datePosted);
      return sortOrder === 'desc' ? db.getTime() - da.getTime() : da.getTime() - db.getTime();
    } else {
      const parseSalary = (s: string | null) => {
        if (!s) return 0;
        const match = s.match(/\$([\d,]+)/);
        return match ? parseInt(match[1].replace(/,/g, '')) : 0;
      };
      return sortOrder === 'desc'
        ? parseSalary(b.salary) - parseSalary(a.salary)
        : parseSalary(a.salary) - parseSalary(b.salary);
    }
  });

  // ─── Render ─────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto p-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Job Listings {useAgentJobs ? '(AI Results)' : ''}
          </h1>
          <p className="text-gray-600">
            Found {filteredJobs.length} jobs {useAgentJobs ? 'from AI assistant' : 'in database'}
          </p>
          {availableApps.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              Available apps: {availableApps.join(', ')}
            </p>
          )}
        </div>
        
        <div className="flex space-x-2 mt-4 md:mt-0">
          <button
            onClick={() => setShowChatBot(!showChatBot)}
            disabled={isInitializing}
            className={`
              px-4 py-2 rounded-lg flex items-center space-x-2
              ${isInitializing 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
              }
              transition-colors duration-200
            `}
          >
            {isInitializing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Sparkles className="w-5 h-5" />
            )}
            <span>{showChatBot ? 'Hide' : 'Show'} AI Assistant</span>
          </button>
          
          {showChatBot && (
            <button
              onClick={handleNewConversation}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg flex items-center space-x-2 transition-colors duration-200"
            >
              <RefreshCw className="w-5 h-5" />
              <span>New Chat</span>
            </button>
          )}
        </div>
      </div>

      {/* Error display */}
      {sessionError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <p className="font-semibold">Session Error</p>
          <p className="text-sm">{sessionError}</p>
        </div>
      )}

      {/* ChatBot */}
      <AnimatePresence>
        {showChatBot && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-6"
          >
            <ChatBot
              title="🤖 AI Job Search Assistant"
              description={`Session: ${sessionId.substring(0, 8)}...`}
              messages={chatMessages}
              onSendMessage={handleSendMessage}
  isTyping={isTyping}
/>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by title, company, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Job grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredJobs.length > 0 ? (
          filteredJobs.map((job) => <JobCard key={job.id} job={job} />)
        ) : (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-500 mb-4">No jobs found matching your criteria.</p>
            {!showChatBot && (
              <button
                onClick={() => setShowChatBot(true)}
                className="text-blue-600 hover:text-blue-700 underline font-medium"
              >
                Ask AI Assistant for help
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}