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
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../firebase';
import type { JobListing } from '../types/index';

interface ChatMessage {
  id: string | number;
  role: 'user' | 'assistant';
  content: string;
  audio_url?: string;
  jobs?: JobListing[]; // Add jobs property to store parsed jobs
}

// Use proxy in development, direct URL in production
const API_BASE_URL =  'https://gethired-agents.onrender.com';

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
  const [serviceStatus, setServiceStatus] = useState<'unknown' | 'online' | 'offline'>('unknown');
  

  // Session management
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionId] = useState<string>(
    `conv-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );

  // Get Firebase user ID
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
      if (user) setUserId(user.uid);
    });
    return () => unsubscribe();
  }, []);

  const parseJobListings = (text: string): JobListing[] => {
    const jobs: JobListing[] = [];
    
    console.log('Attempting to parse job listings from:', text);
    
    try {
      // Try multiple JSON extraction patterns
      const patterns = [
        /```json\n?([\s\S]*?)\n?```/,  // Code block with json
        /```\n?([\s\S]*?)\n?```/,       // Code block without json label
        /\{[\s\S]*\}/,                  // Raw JSON object
        /\[[\s\S]*\]/                   // Raw JSON array (FIXED)
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
      if (!/^\d+\./.test(section.trim())) return;
      
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
      
      bulletMatches.forEach((match, index) => {
        const content = match[1];
        const titleMatch = content.match(/^([^-,]+?)(?:\s*[-,]|$)/);
        const companyMatch = content.match(/(?:at|@|Company:)\s*([^\n,]+)/i);
        
        if (titleMatch) {
          jobs.push({
            id: `parsed-job-${Date.now()}-${index}`,
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout for agent processing

      const response = await fetch(`${API_BASE_URL}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Origin': window.location.origin
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
        mode: 'cors'
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('API Response Error:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseData = await response.json();
      
      // Add logging to see what we're getting
      console.log('A2A Response:', responseData);
      
      const assistantMessage = responseData.message || responseData.text || '(No message received)';
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
          // Avoid duplicates by checking IDs
          const existingIds = new Set(prev.map(job => job.id));
          const newUniqueJobs = parsedJobs.filter(job => !existingIds.has(job.id));
          const newJobs = [...prev, ...newUniqueJobs];
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
      
      // Mark service as online after successful response
      setServiceStatus('online');
      
    } catch (error) {
      console.error('Error sending message to A2A agent:', error);
      
      let errorMessage = 'The AI job search service is currently experiencing issues.';
      let suggestions = '';
      
      if (error instanceof Error) {
        if (error.message.includes('CORS')) {
          errorMessage = 'Connection blocked by browser security policy.';
          suggestions = ' Please try refreshing the page or contact support.';
        } else if (error.message.includes('Failed to fetch') || error.message.includes('AbortError')) {
          errorMessage = 'Unable to connect to the job search service.';
          suggestions = ' This might be due to network issues or the service being temporarily unavailable. Please try again in a few minutes.';
        } else if (error.message.includes('503') || error.message.includes('Service Unavailable')) {
          errorMessage = 'The job search service is temporarily unavailable.';
          suggestions = ' Our servers may be experiencing high traffic. Please try again in a few minutes.';
        } else if (error.message.includes('500')) {
          errorMessage = 'The job search service encountered an internal error.';
          suggestions = ' Our team has been notified. Please try again later.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'The request timed out while searching for jobs.';
          suggestions = ' The service may be processing your request. Please try with a more specific search query.';
        } else {
          errorMessage = `Service error: ${error.message}`;
        }
      }
      
      const fullErrorMessage = `${errorMessage}${suggestions}

In the meantime, you can:
• Browse the available mock job listings
• Try a different search query
• Check back in a few minutes

Would you like me to help you with anything else?`;
      
      const errorMsg: ChatMessage = { 
        id: Date.now() + 1, 
        role: 'assistant', 
        content: fullErrorMessage
      };
      setChatMessages(prev => [...prev, errorMsg]);
      
      // Mark service as offline after error
      setServiceStatus('offline');
    } finally {
      setIsTyping(false);
    }
  };

  // FIXED: Add dependency and prevent infinite loop
  const hasInitialized = useRef(false);
  
  useEffect(() => {
    if (showChatBot && chatMessages.length === 0 && !hasInitialized.current) {
      hasInitialized.current = true;
      const initialMessage = `Hello! I'm looking for job opportunities. When you find jobs, please return them in this JSON format:
{
  "jobs": [
    {
      "title": "Job Title",
      "company": "Company Name", 
      "location": "City, State",
      "salary": "$XX,XXX - $XX,XXX",
      "datePosted": "YYYY-MM-DD",
      "qualifications": ["skill1", "skill2"],
      "description": "Job description here",
      "url": "application_link"
    }
  ]
}

Please help me find relevant positions.`;
      
      handleSendMessage(initialMessage);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showChatBot, chatMessages.length]);

  // Reset initialization flag when chatbot is closed
  useEffect(() => {
    if (!showChatBot) {
      hasInitialized.current = false;
    }
  }, [showChatBot]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-800 mb-2">
              Job Listings
            </h1>
            <p className="text-slate-600">
              {useAgentJobs ? `${agentJobs.length} AI-sourced opportunities` : `${mockJobListings.length} available positions`}
            </p>
          </div>
          
          <div className="flex items-center gap-4 mt-4 lg:mt-0">
            {/* Toggle between mock and agent jobs */}
            {agentJobs.length > 0 && (
              <button
                onClick={() => setUseAgentJobs(!useAgentJobs)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  useAgentJobs 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-slate-600 border border-slate-300'
                }`}
              >
                {useAgentJobs ? 'AI Jobs' : 'Mock Jobs'}
              </button>
            )}
            
            <button
              onClick={() => setShowChatBot(!showChatBot)}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all duration-200 shadow-lg ${
                serviceStatus === 'offline' 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
              } text-white`}
              disabled={serviceStatus === 'offline'}
            >
              <Sparkles className="w-5 h-5" />
              AI Job Hunter
              {serviceStatus === 'offline' && (
                <span className="text-xs bg-red-500 px-2 py-1 rounded-full ml-2">
                  Offline
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search jobs or companies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as 'datePosted' | 'salary')}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="datePosted">Sort by Date</option>
                <option value="salary">Sort by Salary</option>
              </select>
              
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
              
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Job Cards Grid */}
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence>
            {filteredJobs.map((job) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <JobCard job={job} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filteredJobs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-500 text-lg">
              No jobs found matching your criteria.
            </p>
            <button
              onClick={clearFilters}
              className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear filters to see all jobs
            </button>
          </div>
        )}
      </div>

      {/* ChatBot */}
      <AnimatePresence>
        {showChatBot && (
          <ChatBot
            messages={chatMessages}
            onSendMessage={handleSendMessage}
            isTyping={isTyping} title={''} description={''}           
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default JobListings;