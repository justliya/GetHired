import { useState, useRef } from 'react';
import {
  Search,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { mockJobListings } from '../data/mockData';
import JobCard from '../components/JobCard';
import ChatBot from '../components/ChatBot';
import { v4 as uuidv4 } from 'uuid'; // Install with: npm install uuid @types/uuid

interface ChatMessage {
  id: string | number;
  role: 'user' | 'assistant';
  content: string;
  audio_url?: string;
}

const API_BASE_URL = 'http://localhost:8003';

const JobListings = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showChatBot, setShowChatBot] = useState(false);
  const [sortField, setSortField] = useState<'datePosted' | 'salary'>('datePosted');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [locationFilter, setLocationFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  
  // A2A Session Management
  const [userId] = useState(() => `user-${uuidv4()}`);
  const [sessionId, setSessionId] = useState(() => `conv-${uuidv4()}`);
  const audioRefs = useRef<Map<string | number, HTMLAudioElement>>(new Map());

  // Filter and sort jobs
  const filteredJobs = mockJobListings
    .filter(job => {
      if (searchQuery && !job.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !job.company.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (locationFilter.length && !locationFilter.includes(job.location)) return false;
      if (statusFilter.length && !statusFilter.includes(job.status)) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortField === 'datePosted') {
        return sortOrder === 'desc'
          ? new Date(b.datePosted).getTime() - new Date(a.datePosted).getTime()
          : new Date(a.datePosted).getTime() - new Date(b.datePosted).getTime();
      } else {
        const parseSalary = (s: string|null) => {
          if (!s) return 0;
          const m = s.match(/\$(\d+),?(\d*)/);
          return m ? parseInt(m[1] + (m[2]||'')) : 0;
        };
        return sortOrder === 'desc'
          ? parseSalary(b.salary) - parseSalary(a.salary)
          : parseSalary(a.salary) - parseSalary(b.salary);
      }
    });

  const clearFilters = () => { 
    setLocationFilter([]); 
    setStatusFilter([]); 
    setSortField('datePosted'); 
    setSortOrder('desc'); 
    setSearchQuery(''); 
  };

  // A2A Speaker Agent message handler
  const handleSendMessage = async (message: string) => {
    // Add user message
    const userMsg: ChatMessage = { 
      id: Date.now(), 
      role: 'user', 
      content: message 
    };
    setChatMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    // Construct A2A payload
    const payload = {
      message: message,
      context: {
        user_id: userId
      },
      session_id: sessionId
    };

    try {
      const response = await fetch(`${API_BASE_URL}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();
      
      const assistantMessage = responseData.message || '(No message received)';
      const audioUrl = responseData.data?.audio_url;
      
      // Add assistant response
      const assistantMsg: ChatMessage = { 
        id: Date.now() + 1, 
        role: 'assistant', 
        content: assistantMessage,
        audio_url: audioUrl
      };
      
      setChatMessages(prev => [...prev, assistantMsg]);
      
      // Handle audio playback if URL is provided
      if (audioUrl) {
        // Process the audio URL (handle file:// protocol if needed)
        const processedAudioUrl = audioUrl.startsWith('file://') 
          ? audioUrl.replace('file://', '') 
          : audioUrl;
        
        // Note: For file:// URLs, you might need to serve them through your backend
        // or convert them to blob URLs if they're local files
        console.log('Audio URL received:', processedAudioUrl);
      }
      
    } catch (error) {
      console.error('Error sending message to A2A agent:', error);
      const errorMsg: ChatMessage = { 
        id: Date.now() + 1, 
        role: 'assistant', 
        content: `Error: Could not connect to agent. ${error instanceof Error ? error.message : 'Unknown error'}`
      };
      setChatMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  // Reset conversation
  const handleNewConversation = () => {
    setSessionId(`conv-${uuidv4()}`);
    setChatMessages([]);
    audioRefs.current.clear();
  };

  // Update ChatBot title and description when toggled
  const chatBotTitle = showChatBot ? "🔊 A2A Speaker Agent" : "Job Search Assistant";
  const chatBotDescription = showChatBot 
    ? `Connected to Speaker Agent (Session: ${sessionId.substring(0, 8)}...)`
    : "I can help you find and apply to jobs";

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Job Listings</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">Found {filteredJobs.length} jobs</p>
        </div>
        <div className="mt-4 md:mt-0 flex space-x-2">
          <button
            onClick={() => setShowChatBot(prev => !prev)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-200"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            {showChatBot ? 'Hide Assistant' : 'Job Assistant'}
          </button>
          {showChatBot && (
            <button
              onClick={handleNewConversation}
              className="inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors duration-200"
              title="Start new conversation"
            >
              🧹 New Chat
            </button>
          )}
        </div>
      </div>

      {/* ChatBot */}
      <AnimatePresence>
        {showChatBot && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8"
          >
            <ChatBot
              title={chatBotTitle}
              description={chatBotDescription}
              messages={chatMessages}
              onSendMessage={handleSendMessage}
              isTyping={isTyping}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search jobs by title or company..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Job Listings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredJobs.length > 0 ? filteredJobs.map(job => <JobCard key={job.id} job={job} />)
          : (
            <div className="col-span-3 py-8 text-center">
              <p className="text-lg text-gray-600 dark:text-gray-400">No jobs found with current criteria.</p>
              <button onClick={clearFilters} className="mt-2 text-blue-600 dark:text-blue-400 hover:underline">Clear Filters</button>
            </div>
          )}
      </div>
    </div>
  );
};

export default JobListings;