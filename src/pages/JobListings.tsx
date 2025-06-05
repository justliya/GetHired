/* eslint-disable @typescript-eslint/no-explicit-any */
// pages/JobListings.tsx
import { useState, useRef, useEffect } from 'react';
import {
  Search,
  Sparkles
} from 'lucide-react';

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
  jobs?: JobListing[]; // Add jobs property to store parsed jobs
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
  const [agentJobs, setAgentJobs] = useState<JobListing[]>([]); // Store jobs from agent
  const [useAgentJobs, setUseAgentJobs] = useState(false); // Toggle between mock and agent jobs
  
  // A2A Session Management
  const [userId] = useState(() => `user-${uuidv4()}`);
  const [sessionId, setSessionId] = useState(() => `conv-${uuidv4()}`);
  const audioRefs = useRef<Map<string | number, HTMLAudioElement>>(new Map());

  // Parse job listings from agent response
  // Update the parseJobListings function with the corrected pattern
const parseJobListings = (text: string): JobListing[] => {
  const jobs: JobListing[] = [];
  
  console.log('Attempting to parse job listings from:', text);
  
  try {
    // Try multiple JSON extraction patterns
    const patterns = [
      /```json\n?([\s\S]*?)\n?```/,  // Code block with json
      /```\n?([\s\S]*?)\n?```/,       // Code block without json label
      /\{[\s\S]*\}/,                  // Raw JSON object
      /$$[\s\S]*$$/                   // Raw JSON array (FIXED)
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const jsonStr = match[1] || match[0];
        try {
          const data = JSON.parse(jsonStr);
          console.log('Successfully parsed JSON:', data);
          
          // Handle different response structures
          let jobsArray = [];
          if (Array.isArray(data)) {
            jobsArray = data;
          } else if (data.jobs && Array.isArray(data.jobs)) {
            jobsArray = data.jobs;
          } else if (data.listings && Array.isArray(data.listings)) {
            jobsArray = data.listings;
          } else if (data.results && Array.isArray(data.results)) {
            jobsArray = data.results;
          }
          
          if (jobsArray.length > 0) {
            return jobsArray.map((job: any, index: number) => ({
              id: job.id || `agent-job-${Date.now()}-${index}`,
              title: job.title || job.position || job.job_title || 'Unknown Position',
              company: job.company || job.employer || job.company_name || 'Unknown Company',
              location: job.location || job.city || job.job_location || 'Remote',
              salary: job.salary || job.compensation || job.salary_range || null,
              datePosted: job.datePosted || job.posted_date || job.date_posted || new Date().toISOString().split('T')[0],
              status: 'new' as const,
              favorite: false,
              qualifications: job.qualifications || job.requirements || job.skills || [],
              description: job.description || job.summary || job.job_description || '',
              url: job.url || job.link || job.apply_link || ''
            }));
          }
        } catch (e) {
          console.error('Failed to parse with pattern:', pattern, e);
        }
      }
    }
  } catch (e) {
    console.error('Error in JSON parsing:', e);
  }
  
  // Enhanced text parsing for more formats
  console.log('Falling back to text parsing');
  
  // Pattern 1: Numbered list format
  const sections = text.split(/\n(?=\d+\.)/);
  
  sections.forEach((section) => {
    // Skip if it doesn't start with a number
    if (!/^\d+\./.test(section)) return;
    
    // Try different field patterns
    const titleMatch = section.match(/(?:Position|Title|Job|Role)[\s:]+([^\n]+)/i) ||
                       section.match(/^\d+\.\s*([^-\n]+?)(?:\s*-|$)/);
    const companyMatch = section.match(/(?:Company|Employer|Organization|At)[\s:]+([^\n]+)/i) ||
                         section.match(/(?:at|@)\s+([^\n,]+)/i);
    const locationMatch = section.match(/(?:Location|City|Where|Based)[\s:]+([^\n]+)/i);
    const salaryMatch = section.match(/(?:Salary|Compensation|Pay|Range)[\s:]+([^\n]+)/i) ||
                        section.match(/\$[\d,]+(?:\s*-\s*\$?[\d,]+)?(?:k)?/i);
    
    if (titleMatch && (companyMatch || section.includes('Company'))) {
      const job: JobListing = {
        id: `parsed-job-${Date.now()}-${jobs.length}`,
        title: titleMatch[1].trim(),
        company: companyMatch ? companyMatch[1].trim() : 'Company name not specified',
        location: locationMatch ? locationMatch[1].trim() : 'Not specified',
        salary: salaryMatch ? salaryMatch[0].trim() : null,
        datePosted: new Date().toISOString().split('T')[0],
        status: 'new',
        favorite: false,
        qualifications: [],
        description: section.trim(),
        url: ''
      };
      jobs.push(job);
      console.log('Parsed job from text:', job);
    }
  });
  
  // Pattern 2: Bullet points or dashes
  if (jobs.length === 0) {
    const bulletPattern = /[•\-*]\s*([^•\-*\n]+(?:\n(?![•\-*])[^\n]+)*)/g;
    const bulletMatches = [...text.matchAll(bulletPattern)];
    
    bulletMatches.forEach((match) => {
      const content = match[1];
      const titleMatch = content.match(/^([^-,]+?)(?:\s*[-,]|$)/);
      const companyMatch = content.match(/(?:at|@|Company:)\s*([^\n,]+)/i);
      
      if (titleMatch) {
        jobs.push({
          id: `parsed-job-${Date.now()}-${jobs.length}`,
          title: titleMatch[1].trim(),
          company: companyMatch ? companyMatch[1].trim() : 'Company not specified',
          location: 'Not specified',
          salary: null,
          datePosted: new Date().toISOString().split('T')[0],
          status: 'new',
          favorite: false,
          qualifications: [],
          description: content,
          url: ''
        });
      }
    });
  }
  
  console.log(`Text parsing found ${jobs.length} jobs`);
  return jobs;
};
  // Determine which jobs to display
  const displayJobs = useAgentJobs && agentJobs.length > 0 ? agentJobs : mockJobListings;

  // Filter and sort jobs
  const filteredJobs = displayJobs
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

// Send message to agent and handle response
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
    
    // Add logging to see what we're getting
    console.log('A2A Response:', responseData);
    
    const assistantMessage = responseData.message || '(No message received)';
    const audioUrl = responseData.data?.audio_url;
    
    // Check if jobs are in the data object
    let parsedJobs: JobListing[] = [];
    
    // First check if jobs are directly in the response data
    if (responseData.data?.jobs) {
      console.log('Found jobs in data.jobs:', responseData.data.jobs);
      parsedJobs = responseData.data.jobs.map((job: any, index: number) => ({
        id: job.id || `agent-job-${Date.now()}-${index}`,
        title: job.title || job.position || 'Unknown Position',
        company: job.company || job.employer || 'Unknown Company',
        location: job.location || job.city || 'Remote',
        salary: job.salary || job.compensation || null,
        datePosted: job.datePosted || job.posted_date || new Date().toISOString().split('T')[0],
        status: 'new' as const,
        favorite: false,
        qualifications: job.qualifications || job.requirements || [],
        description: job.description || job.summary || '',
        url: job.url || job.link || ''
      }));
    } else {
      // Otherwise, try to parse from the message content
      console.log('Parsing jobs from message content');
      parsedJobs = parseJobListings(assistantMessage);
    }
    
    console.log('Parsed jobs:', parsedJobs);
    
    // If jobs were found, update agent jobs and switch to using them
    if (parsedJobs.length > 0) {
      console.log(`Adding ${parsedJobs.length} jobs to agentJobs`);
      setAgentJobs(prev => {
        const newJobs = [...prev, ...parsedJobs];
        console.log('Total agent jobs:', newJobs.length);
        return newJobs;
      });
      setUseAgentJobs(true);
    }
    
    // Add assistant response with parsed jobs
    const assistantMsg: ChatMessage = { 
      id: Date.now() + 1, 
      role: 'assistant', 
      content: assistantMessage,
      audio_url: audioUrl,
      jobs: parsedJobs
    };
    
    setChatMessages(prev => [...prev, assistantMsg]);
    
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

useEffect(() => {
  if (showChatBot && chatMessages.length === 0) {
    const initialMessage = `Hello! I'm looking for job opportunities. When you find jobs, please return them in this JSON format:
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
}`;
    
    handleSendMessage(initialMessage);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [showChatBot]);
  // Reset conversation
  const handleNewConversation = () => {
    setSessionId(`conv-${uuidv4()}`);
    setChatMessages([]);
    audioRefs.current.clear();
    setAgentJobs([]);
    setUseAgentJobs(false);
  };

  // Update ChatBot title and description
  const chatBotTitle = "🔊 A2A Speaker Agent";
  const chatBotDescription = `Connected to Speaker Agent (Session: ${sessionId.substring(0, 8)}...)`;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Job Listings {useAgentJobs && agentJobs.length > 0 && '(AI Results)'}
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Found {filteredJobs.length} jobs {useAgentJobs && agentJobs.length > 0 ? 'from AI search' : 'in database'}
          </p>
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
          {agentJobs.length > 0 && (
            <button
              onClick={() => setUseAgentJobs(!useAgentJobs)}
              className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors duration-200"
              title="Toggle job source"
            >
              {useAgentJobs ? 'Show Sample Jobs' : `Show AI Jobs (${agentJobs.length})`}
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

    {/* Job Source Indicator */}
    {useAgentJobs && agentJobs.length > 0 && (
      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          Showing {agentJobs.length} jobs found by the AI assistant. Ask the assistant to find more specific jobs based on your preferences!
        </p>
      </div>
    )}

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
          <p className="text-lg text-gray-600 dark:text-gray-400">
            {useAgentJobs 
              ? "No AI-found jobs match your filters. Try adjusting filters or ask for different criteria."
              : "No jobs found with current criteria."}
          </p>
          <button onClick={clearFilters} className="mt-2 text-blue-600 dark:text-blue-400 hover:underline">
            Clear Filters
          </button>
          {!showChatBot && (
            <button 
              onClick={() => setShowChatBot(true)} 
              className="mt-2 ml-4 text-purple-600 dark:text-purple-400 hover:underline"
            >
              Ask AI Assistant
            </button>
          )}
        </div>
      )}
  </div>

  {/* Helper Tips */}
  {showChatBot && chatMessages.length === 0 && (
    <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        💡 Getting Started
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
        Try asking the assistant:
      </p>
      <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
        <li>• "Find me React developer jobs in San Francisco"</li>
        <li>• "Show me remote TypeScript positions"</li>
        <li>• "Search for senior frontend roles with good salary"</li>
        <li>• "Find startup jobs in New York"</li>
      </ul>
    </div>
  )}
</div>
  );
};

export default JobListings;