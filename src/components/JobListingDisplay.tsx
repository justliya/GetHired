// components/JobListingDisplay.tsx
import React from 'react';
import JobCard from './JobCard';
import type { JobListing } from '../types/index';

interface JobListingDisplayProps {
  message: string;
}

const JobListingDisplay: React.FC<JobListingDisplayProps> = ({ message }) => {
  // Parse job listings from the message
  const parseJobListings = (text: string): JobListing[] => {
    const jobs: JobListing[] = [];
    
    // Try to parse JSON if the message contains structured data
    try {
      // Check if message contains JSON data
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        if (data.jobs && Array.isArray(data.jobs)) {
          return data.jobs.map((job: Partial<JobListing>, index: number) => ({
            id: job.id || `job-${index}`,
            title: job.title || 'Unknown Position',
            company: job.company || 'Unknown Company',
            location: job.location || 'Remote',
            salary: job.salary || null,
            datePosted: job.datePosted || new Date().toISOString().split('T')[0],
            status: 'new' as const,
            favorite: false,
            qualifications: job.qualifications || [],
            description: job.description || ''
          }));
        }
      }
    } catch (e) {
      console.error('Failed to parse JSON from message:', e);
    }
    
    // Fallback: Parse text format
    // Look for patterns like "Position: ..., Company: ..., Location: ..."
    const jobPattern = /(?:Position|Title|Job):\s*([^\n,]+)[\s\S]*?(?:Company|Organization):\s*([^\n,]+)[\s\S]*?(?:Location|City):\s*([^\n,]+)/gi;
    let match;
    
    while ((match = jobPattern.exec(text)) !== null) {
      jobs.push({
        id: `job-${jobs.length}`,
        title: match[1].trim(),
        company: match[2].trim(),
        location: match[3].trim(),
        salary: null,
        datePosted: new Date().toISOString().split('T')[0],
        status: 'new',
        favorite: false,
        qualifications: [],
        description: '',
        url: '', // Add a default or parsed URL here if available
      });
    }
    
    return jobs;
  };
  
  const jobListings = parseJobListings(message);
  
  if (jobListings.length === 0) {
    return null;
  }
  
  return (
    <div className="mt-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
        Found {jobListings.length} job{jobListings.length !== 1 ? 's' : ''}:
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {jobListings.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </div>
    </div>
  );
};

export default JobListingDisplay;